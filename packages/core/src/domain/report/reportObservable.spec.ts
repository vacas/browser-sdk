import { isChromium } from '../../tools/browserDetection'
import type { Subscription } from '../../tools/observable'
import { stubReportingObserver, stubCspEventListener } from '../../../test/specHelper'
import { initReportObservable, ReportType } from './reportObservable'

describe(`report observable`, () => {
  let reportingObserverStub: { reset(): void; raiseReport(type: string): void }
  let cspEventListenerStub: { dispatchEvent(): void }
  let consoleSubscription: Subscription
  let notifyReport: jasmine.Spy

  beforeEach(() => {
    if (!isChromium()) {
      pending('no ReportingObserver support')
    }

    reportingObserverStub = stubReportingObserver()
    cspEventListenerStub = stubCspEventListener()
    notifyReport = jasmine.createSpy('notifyReport')
  })

  afterEach(() => {
    reportingObserverStub.reset()
    consoleSubscription.unsubscribe()
  })
  ;[ReportType.deprecation, ReportType.deprecation].forEach((type) => {
    it(`should notify ${type} reports`, () => {
      consoleSubscription = initReportObservable([type]).subscribe(notifyReport)
      reportingObserverStub.raiseReport(type)

      const [report] = notifyReport.calls.mostRecent().args

      expect(report).toEqual(
        jasmine.objectContaining({
          message: `${type}: foo bar`,
          type,
        })
      )
    })
  })

  it(`should compute stack for ${ReportType.intervention}`, () => {
    consoleSubscription = initReportObservable([ReportType.intervention]).subscribe(notifyReport)
    reportingObserverStub.raiseReport(ReportType.intervention)

    const [report] = notifyReport.calls.mostRecent().args

    expect(report.stack).toEqual(`NavigatorVibrate: foo bar
at <anonymous> @ http://foo.bar/index.js:20:10`)
  })

  it(`should notify ${ReportType.csp_violation}`, () => {
    consoleSubscription = initReportObservable([ReportType.csp_violation]).subscribe(notifyReport)
    cspEventListenerStub.dispatchEvent()

    expect(notifyReport).toHaveBeenCalledOnceWith({
      message: `csp_violation: 'blob' blocked by 'worker-src' directive`,
      type: 'csp_violation',
      stack: `csp_violation: 'blob' blocked by 'worker-src' directive
at <anonymous> @ http://foo.bar/index.js:17:8`,
    })
  })
})
