import { mergeObservables, Observable } from '../../tools/observable'
import { DOM_EVENT, includes, addEventListener } from '../../tools/utils'
import { monitor } from '../internalMonitoring'

export interface BrowserWindow {
  ReportingObserver?: ReportingObserver
}

export interface ReportingObserverOption {
  types: BrowserReportType[]
  buffered: boolean
}

interface ReportingObserverCallback {
  (reports: BrowserReport[], observer: ReportingObserver): void
}

export declare class ReportingObserver {
  static readonly supportedEntryTypes: readonly string[]
  constructor(callback: ReportingObserverCallback, option: ReportingObserverOption)
  disconnect(): void
  observe(): void
  takeRecords(): PerformanceEntryList
}

export interface BrowserReport {
  type: BrowserReportType
  url: string
  body: DeprecationReportBody | InterventionReportBody
}

interface DeprecationReportBody {
  id: string
  message: string
  lineNumber: number
  columnNumber: number
  sourceFile: string
  anticipatedRemoval?: Date
}

interface InterventionReportBody {
  id: string
  message: string
  lineNumber: number
  columnNumber: number
  sourceFile: string
}

export const ReportType = {
  intervention: 'intervention',
  deprecation: 'deprecation',
  csp_violation: 'csp_violation',
} as const

export type ReportType = typeof ReportType[keyof typeof ReportType]

export interface Report {
  type: ReportType
  message: string
  stack?: string
}

export type BrowserReportType = 'intervention' | 'deprecation'

export function initReportObservable(apis: ReportType[]) {
  const observables: Array<Observable<Report>> = []

  if (includes(apis, 'csp_violation')) {
    observables.push(createCspViolationReportObservable())
  }

  const reportTypes = apis.filter((api: ReportType): api is BrowserReportType => api !== 'csp_violation')
  if (reportTypes.length) {
    observables.push(createReportObservable(reportTypes))
  }

  return mergeObservables<Report>(...observables)
}

function createReportObservable(reportTypes: BrowserReportType[]) {
  const observable = new Observable<Report>(() => {
    if (!(window as BrowserWindow).ReportingObserver) {
      return
    }
    const handleReports = monitor((reports: BrowserReport[]) =>
      reports.forEach((report) => {
        observable.notify(buildReportLogFromReport(report))
      })
    )

    const observer = new ReportingObserver(handleReports, {
      types: reportTypes,
      buffered: true,
    })

    observer.observe()
    return () => {
      observer.disconnect()
    }
  })

  return observable
}

function createCspViolationReportObservable() {
  const observable = new Observable<Report>(() => {
    const handleCspViolation = monitor((event: SecurityPolicyViolationEvent) => {
      observable.notify(buildReportLogFromCspViolation(event))
    })

    const { stop } = addEventListener(document, DOM_EVENT.SECURITY_POLICY_VIOLATION, handleCspViolation)

    return stop
  })
  return observable
}

function buildReportLogFromReport({
  type,
  body: { id, message, sourceFile, lineNumber, columnNumber },
}: BrowserReport): Report {
  const report: Report = { type, message: `${type}: ${message}` }
  if (type === ReportType.intervention) {
    report.stack = buildStack(id, message, sourceFile, lineNumber, columnNumber)
  }
  return report
}

function buildReportLogFromCspViolation(event: SecurityPolicyViolationEvent): Report {
  const type = 'csp_violation'
  const message = `'${event.blockedURI}' blocked by '${event.effectiveDirective}' directive`

  return {
    type,
    message: `${type}: ${message}`,
    stack: buildStack(type, message, event.sourceFile, event.lineNumber, event.columnNumber),
  }
}

function buildStack(
  type: string,
  message: string,
  sourceFile: string | null,
  lineNumber: number | null,
  columnNumber: number | null
): string | undefined {
  if (!sourceFile) {
    return undefined
  }

  return `${type}: ${message}
at <anonymous> @ ${[sourceFile, lineNumber, columnNumber].filter((e) => e).join(':')}`
}
