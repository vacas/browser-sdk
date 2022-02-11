import type { Observable, RawError } from '@datadog/browser-core'
import { clocksNow, ErrorHandling, ErrorSource, initReportObservable, ReportType } from '@datadog/browser-core'

export function trackReportError(errorObservable: Observable<RawError>) {
  const subscription = initReportObservable([ReportType.csp_violation, ReportType.intervention]).subscribe(
    (reportError) =>
      errorObservable.notify({
        startClocks: clocksNow(),
        message: reportError.message,
        stack: reportError.stack,
        source: ErrorSource.REPORT,
        handling: ErrorHandling.HANDLED,
      })
  )

  return {
    stop: () => {
      subscription.unsubscribe()
    },
  }
}
