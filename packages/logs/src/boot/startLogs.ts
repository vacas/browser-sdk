import type { ConsoleLog, Context, InternalMonitoring, RawError, RelativeTime } from '@datadog/browser-core'
import {
  areCookiesAuthorized,
  combine,
  createEventRateLimiter,
  Observable,
  trackRuntimeError,
  canUseEventBridge,
  getEventBridge,
  getRelativeTime,
  startInternalMonitoring,
  initConsoleObservable,
  ConsoleApiName,
  ErrorSource,
} from '@datadog/browser-core'
import { trackNetworkError } from '../domain/trackNetworkError'
import type { Logger, LogsMessage } from '../domain/logger'
import { StatusType } from '../domain/logger'
import type { LogsSessionManager } from '../domain/logsSessionManager'
import { startLogsSessionManager, startLogsSessionManagerStub } from '../domain/logsSessionManager'
import { startLoggerBatch } from '../transport/startLoggerBatch'
import type { LogsConfiguration } from '../domain/configuration'
import type { LogsEvent } from '../logsEvent.types'

const LogStatusForApi = {
  [ConsoleApiName.log]: StatusType.info,
  [ConsoleApiName.debug]: StatusType.debug,
  [ConsoleApiName.info]: StatusType.info,
  [ConsoleApiName.warn]: StatusType.warn,
  [ConsoleApiName.error]: StatusType.error,
}

export function startLogs(configuration: LogsConfiguration, logger: Logger) {
  const internalMonitoring = startInternalMonitoring(configuration)

  const rawErrorObservable = new Observable<RawError>()

  if (configuration.forwardErrorsToLogs) {
    trackRuntimeError(rawErrorObservable)
    trackNetworkError(configuration, rawErrorObservable)
  }
  const consoleObservable = initConsoleObservable(configuration.forwardConsoleLogs)

  const session =
    areCookiesAuthorized(configuration.cookieOptions) && !canUseEventBridge()
      ? startLogsSessionManager(configuration)
      : startLogsSessionManagerStub(configuration)

  return doStartLogs(configuration, rawErrorObservable, consoleObservable, internalMonitoring, session, logger)
}

export function doStartLogs(
  configuration: LogsConfiguration,
  rawErrorObservable: Observable<RawError>,
  consoleObservable: Observable<ConsoleLog>,
  internalMonitoring: InternalMonitoring,
  sessionManager: LogsSessionManager,
  logger: Logger
) {
  internalMonitoring.setExternalContextProvider(() =>
    combine({ session_id: sessionManager.findTrackedSession()?.id }, getRUMInternalContext(), {
      view: { name: null, url: null, referrer: null },
    })
  )

  const assemble = buildAssemble(sessionManager, configuration, reportRawError)

  let onLogEventCollected: (message: Context) => void
  if (canUseEventBridge()) {
    const bridge = getEventBridge<'log', Context>()!
    onLogEventCollected = (message) => bridge.send('log', message)
  } else {
    const batch = startLoggerBatch(configuration)
    onLogEventCollected = (message) => batch.add(message)
  }

  function reportRawError(error: RawError) {
    const messageContext: Partial<LogsEvent> = {
      date: error.startClocks.timeStamp,
      error: {
        kind: error.type,
        origin: error.source,
        stack: error.stack,
      },
    }
    if (error.resource) {
      messageContext.http = {
        method: error.resource.method as any, // Cast resource method because of case mismatch cf issue RUMF-1152
        status_code: error.resource.statusCode,
        url: error.resource.url,
      }
    }
    logger.error(error.message, messageContext)
  }

  function reportConsoleLog(log: ConsoleLog) {
    let messageContext: Partial<LogsEvent> | undefined
    if (log.api === ConsoleApiName.error) {
      messageContext = {
        error: {
          origin: ErrorSource.CONSOLE,
          stack: log.stack,
        },
      }
    }
    logger.log(log.message, messageContext, LogStatusForApi[log.api])
  }

  rawErrorObservable.subscribe(reportRawError)
  consoleObservable.subscribe(reportConsoleLog)

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
  reportRawError: (error: RawError) => void
) {
  const logRateLimiters = {
    [StatusType.error]: createEventRateLimiter(
      StatusType.error,
      configuration.eventRateLimiterThreshold,
      reportRawError
    ),
    [StatusType.warn]: createEventRateLimiter(StatusType.warn, configuration.eventRateLimiterThreshold, reportRawError),
    [StatusType.info]: createEventRateLimiter(StatusType.info, configuration.eventRateLimiterThreshold, reportRawError),
    [StatusType.debug]: createEventRateLimiter(
      StatusType.debug,
      configuration.eventRateLimiterThreshold,
      reportRawError
    ),
    ['custom']: createEventRateLimiter('custom', configuration.eventRateLimiterThreshold, reportRawError),
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
