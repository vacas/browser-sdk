export interface BrowserWindow {
  ReportingObserver?: ReportingObserver
}

export type ReportType = 'intervention' | 'deprecation'

export interface Report {
  type: ReportType
  url: string
  body: DeprecationReportBody | InterventionReportBody
}

interface ReportingObserverCallback {
  (reports: Report[], observer: ReportingObserver): void
}

export interface ReportingObserverOption {
  types: ReportType[]
  buffered: boolean
}

declare global {
  class ReportingObserver {
    static readonly supportedEntryTypes: readonly string[]
    constructor(callback: ReportingObserverCallback, option: ReportingObserverOption)
    disconnect(): void
    observe(): void
    takeRecords(): PerformanceEntryList
  }
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
