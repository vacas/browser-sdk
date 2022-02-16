import type { Context, InternalMonitoring, RawError, RelativeTime, CustomReport } from '@datadog/browser-core'
import {
  areCookiesAuthorized,
  combine,
  createEventRateLimiter,
  Observable,
  trackRuntimeError,
  trackConsoleError,
  canUseEventBridge,
  getEventBridge,
  getRelativeTime,
  startInternalMonitoring,
  CustomReportType,
  ErrorSource,
  initReportObservable,
} from '@datadog/browser-core'
import { trackNetworkError } from '../domain/trackNetworkError'
import type { Logger, LogsMessage } from '../domain/logger'
import { StatusType } from '../domain/logger'
import type { LogsSessionManager } from '../domain/logsSessionManager'
import { startLogsSessionManager, startLogsSessionManagerStub } from '../domain/logsSessionManager'
import { startLoggerBatch } from '../transport/startLoggerBatch'
import type { LogsConfiguration } from '../domain/configuration'
import type { LogsEvent } from '../logsEvent.types'

const LogStatusForReport = {
  [CustomReportType.csp_violation]: StatusType.error,
  [CustomReportType.intervention]: StatusType.error,
  [CustomReportType.deprecation]: StatusType.warn,
}

export function startLogs(configuration: LogsConfiguration, errorLogger: Logger) {
  const internalMonitoring = startInternalMonitoring(configuration)

  const errorObservable = new Observable<RawError>()

  if (configuration.forwardErrorsToLogs) {
    trackConsoleError(errorObservable)
    trackRuntimeError(errorObservable)
    trackNetworkError(configuration, errorObservable)
  }

  const reportObservable = initReportObservable(['intervention', 'deprecation', 'csp_violation'])

  const session =
    areCookiesAuthorized(configuration.cookieOptions) && !canUseEventBridge()
      ? startLogsSessionManager(configuration)
      : startLogsSessionManagerStub(configuration)

  return doStartLogs(configuration, errorObservable, reportObservable, internalMonitoring, session, errorLogger)
}

export function doStartLogs(
  configuration: LogsConfiguration,
  errorObservable: Observable<RawError>,
  reportObservable: Observable<CustomReport>,
  internalMonitoring: InternalMonitoring,
  sessionManager: LogsSessionManager,
  errorLogger: Logger
) {
  internalMonitoring.setExternalContextProvider(() =>
    combine({ session_id: sessionManager.findTrackedSession()?.id }, getRUMInternalContext(), {
      view: { name: null, url: null, referrer: null },
    })
  )

  const assemble = buildAssemble(sessionManager, configuration, logError)

  let onLogEventCollected: (message: Context) => void
  if (canUseEventBridge()) {
    const bridge = getEventBridge<'log', Context>()!
    onLogEventCollected = (message) => bridge.send('log', message)
  } else {
    const batch = startLoggerBatch(configuration)
    onLogEventCollected = (message) => batch.add(message)
  }

  function logError(error: RawError) {
    errorLogger.error(
      error.message,
      combine(
        {
          date: error.startClocks.timeStamp,
          error: {
            kind: error.type,
            origin: error.source,
            stack: error.stack,
          },
        },
        error.resource
          ? {
              http: {
                method: error.resource.method,
                status_code: error.resource.statusCode,
                url: error.resource.url,
              },
            }
          : undefined
      )
    )
  }

  function logReport(report: CustomReport) {
    let messageContext: Partial<LogsEvent> | undefined
    const logStatus = LogStatusForReport[report.type]
    if (logStatus === StatusType.error) {
      messageContext = {
        error: {
          origin: ErrorSource.REPORT,
          stack: report.stack,
        },
      }
    }
    errorLogger.log(report.message, messageContext, logStatus)
  }

  reportObservable.subscribe(logReport)
  errorObservable.subscribe(logError)

  return (message: LogsMessage, currentContext: Context) => {
    const contextualizedMessage = assemble(message, currentContext)
    if (contextualizedMessage) {
      onLogEventCollected(contextualizedMessage)
    }
  }
}

export function buildAssemble(
  sessionManager: LogsSessionManager,
  configuration: LogsConfiguration,
  reportError: (error: RawError) => void
) {
  const logRateLimiters = {
    [StatusType.error]: createEventRateLimiter(StatusType.error, configuration.eventRateLimiterThreshold, reportError),
    [StatusType.warn]: createEventRateLimiter(StatusType.warn, configuration.eventRateLimiterThreshold, reportError),
    [StatusType.info]: createEventRateLimiter(StatusType.info, configuration.eventRateLimiterThreshold, reportError),
    [StatusType.debug]: createEventRateLimiter(StatusType.debug, configuration.eventRateLimiterThreshold, reportError),
    ['custom']: createEventRateLimiter('custom', configuration.eventRateLimiterThreshold, reportError),
  }

  return (message: LogsMessage, currentContext: Context) => {
    const startTime = message.date ? getRelativeTime(message.date) : undefined
    const session = sessionManager.findTrackedSession(startTime)

    if (!session) {
      return undefined
    }

    const contextualizedMessage = combine(
      { service: configuration.service, session_id: session.id },
      currentContext,
      getRUMInternalContext(startTime),
      message
    )

    if (
      configuration.beforeSend?.(contextualizedMessage) === false ||
      (logRateLimiters[contextualizedMessage.status] ?? logRateLimiters['custom']).isLimitReached()
    ) {
      return undefined
    }

    return contextualizedMessage as Context
  }
}

interface Rum {
  getInternalContext: (startTime?: RelativeTime) => Context
}

function getRUMInternalContext(startTime?: RelativeTime): Context | undefined {
  const rum = (window as any).DD_RUM as Rum
  return rum && rum.getInternalContext ? rum.getInternalContext(startTime) : undefined
}
