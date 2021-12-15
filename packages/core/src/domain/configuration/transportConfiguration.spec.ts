import { BuildEnv, BuildMode } from '@datadog/browser-core'
import { computeTransportConfiguration } from './transportConfiguration'

describe('transportConfiguration', () => {
  const clientToken = 'some_client_token'
  const otherClientToken = 'some_other_client_token'
  const buildEnv: BuildEnv = {
    buildMode: BuildMode.RELEASE,
    sdkVersion: 'some_version',
  }

  describe('internal monitoring endpoint', () => {
    it('should only be defined when api key is provided', () => {
      let configuration = computeTransportConfiguration({ clientToken }, buildEnv)
      expect(configuration.internalMonitoringEndpointBuilder).toBeUndefined()

      configuration = computeTransportConfiguration(
        { clientToken, internalMonitoringApiKey: otherClientToken },
        buildEnv
      )
      expect(configuration.internalMonitoringEndpointBuilder?.build()).toContain(otherClientToken)
    })
  })

  describe('endpoint overload', () => {
    it('should be available for e2e-test build mode', () => {
      const e2eEnv = {
        buildMode: BuildMode.E2E_TEST,
        sdkVersion: 'some_version',
      }
      const configuration = computeTransportConfiguration({ clientToken }, e2eEnv)
      expect(configuration.rumEndpointBuilder.build()).toEqual('<<< E2E RUM ENDPOINT >>>')
      expect(configuration.logsEndpointBuilder.build()).toEqual('<<< E2E LOGS ENDPOINT >>>')
      expect(configuration.internalMonitoringEndpointBuilder?.build()).toEqual(
        '<<< E2E INTERNAL MONITORING ENDPOINT >>>'
      )
      expect(configuration.sessionReplayEndpointBuilder.build()).toEqual('<<< E2E SESSION REPLAY ENDPOINT >>>')

      expect(configuration.isIntakeUrl('<<< E2E RUM ENDPOINT >>>')).toBe(true)
      expect(configuration.isIntakeUrl('<<< E2E LOGS ENDPOINT >>>')).toBe(true)
      expect(configuration.isIntakeUrl('<<< E2E SESSION REPLAY ENDPOINT >>>')).toBe(true)
      expect(configuration.isIntakeUrl('<<< E2E INTERNAL MONITORING ENDPOINT >>>')).toBe(true)
    })
  })

  describe('site', () => {
    it('should use US site by default', () => {
      const configuration = computeTransportConfiguration({ clientToken }, buildEnv)
      expect(configuration.rumEndpointBuilder.build()).toContain('datadoghq.com')
    })

    it('should use site value when set', () => {
      const configuration = computeTransportConfiguration({ clientToken, site: 'foo.com' }, buildEnv)
      expect(configuration.rumEndpointBuilder.build()).toContain('foo.com')
    })
  })

  describe('query parameters', () => {
    it('should add intake query parameters', () => {
      const configuration = computeTransportConfiguration({ clientToken }, buildEnv)
      expect(configuration.rumEndpointBuilder.build()).toMatch(
        `&dd-api-key=${clientToken}&dd-evp-origin-version=(.*)&dd-evp-origin=browser&dd-request-id=(.*)`
      )
    })

    it('should add batch_time for rum endpoint', () => {
      const configuration = computeTransportConfiguration({ clientToken }, buildEnv)
      expect(configuration.rumEndpointBuilder.build()).toContain(`&batch_time=`)
    })

    it('should not add batch_time for logs and replay endpoints', () => {
      const configuration = computeTransportConfiguration({ clientToken }, buildEnv)
      expect(configuration.logsEndpointBuilder.build()).not.toContain(`&batch_time=`)
      expect(configuration.sessionReplayEndpointBuilder.build()).not.toContain(`&batch_time=`)
    })
  })

  describe('proxyHost', () => {
    it('should replace endpoint host and add set it as a query parameter', () => {
      const configuration = computeTransportConfiguration(
        { clientToken, site: 'datadoghq.eu', proxyHost: 'proxy.io' },
        buildEnv
      )
      expect(configuration.rumEndpointBuilder.build()).toMatch(
        `https://proxy.io/api/v2/rum\\?ddhost=rum.browser-intake-datadoghq.eu&ddsource=(.*)&ddtags=(.*)&dd-api-key=${clientToken}` +
          `&dd-evp-origin-version=(.*)&dd-evp-origin=browser&dd-request-id=(.*)&batch_time=(.*)`
      )
    })
  })

  describe('proxyUrl', () => {
    it('should replace the full intake endpoint by the proxyUrl and set it in the attribute ddforward', () => {
      const configuration = computeTransportConfiguration({ clientToken, proxyUrl: 'https://proxy.io/path' }, buildEnv)
      expect(configuration.rumEndpointBuilder.build()).toMatch(
        `https://proxy.io/path\\?ddforward=${encodeURIComponent(
          `https://rum.browser-intake-datadoghq.com/api/v2/rum?ddsource=(.*)&ddtags=(.*)&dd-api-key=${clientToken}` +
            `&dd-evp-origin-version=(.*)&dd-evp-origin=browser&dd-request-id=(.*)&batch_time=(.*)`
        )}`
      )
    })
  })

  describe('sdk_version, env, version and service', () => {
    it('should not modify the logs and rum endpoints tags when not defined', () => {
      const configuration = computeTransportConfiguration({ clientToken }, buildEnv)
      expect(decodeURIComponent(configuration.rumEndpointBuilder.build())).toContain(
        `&ddtags=sdk_version:${buildEnv.sdkVersion}`
      )

      expect(decodeURIComponent(configuration.rumEndpointBuilder.build())).not.toContain(',env:')
      expect(decodeURIComponent(configuration.rumEndpointBuilder.build())).not.toContain(',service:')
      expect(decodeURIComponent(configuration.rumEndpointBuilder.build())).not.toContain(',version:')
      expect(decodeURIComponent(configuration.logsEndpointBuilder.build())).not.toContain(',env:')
      expect(decodeURIComponent(configuration.logsEndpointBuilder.build())).not.toContain(',service:')
      expect(decodeURIComponent(configuration.logsEndpointBuilder.build())).not.toContain(',version:')
    })

    it('should be set as tags in the logs and rum endpoints', () => {
      const configuration = computeTransportConfiguration(
        { clientToken, env: 'foo', service: 'bar', version: 'baz' },
        buildEnv
      )
      expect(decodeURIComponent(configuration.rumEndpointBuilder.build())).toContain(
        `&ddtags=sdk_version:${buildEnv.sdkVersion},env:foo,service:bar,version:baz`
      )
      expect(decodeURIComponent(configuration.logsEndpointBuilder.build())).toContain(
        `&ddtags=sdk_version:${buildEnv.sdkVersion},env:foo,service:bar,version:baz`
      )
    })
  })

  describe('tags', () => {
    it('should be encoded', () => {
      const configuration = computeTransportConfiguration({ clientToken, service: 'bar+foo' }, buildEnv)
      expect(configuration.rumEndpointBuilder.build()).toContain(
        `ddtags=sdk_version%3Asome_version%2Cservice%3Abar%2Bfoo`
      )
    })
  })

  describe('isIntakeUrl', () => {
    ;[
      { site: 'datadoghq.eu', intakeDomain: 'browser-intake-datadoghq.eu' },
      { site: 'datadoghq.com', intakeDomain: 'browser-intake-datadoghq.com' },
      { site: 'us3.datadoghq.com', intakeDomain: 'browser-intake-us3-datadoghq.com' },
      { site: 'us5.datadoghq.com', intakeDomain: 'browser-intake-us5-datadoghq.com' },
      { site: 'ddog-gov.com', intakeDomain: 'browser-intake-ddog-gov.com' },
    ].forEach(({ site, intakeDomain }) => {
      it(`should detect intake request for ${site} site`, () => {
        const configuration = computeTransportConfiguration({ clientToken, site }, buildEnv)
        expect(configuration.isIntakeUrl(`https://rum.${intakeDomain}/api/v2/rum?xxx`)).toBe(true)
        expect(configuration.isIntakeUrl(`https://logs.${intakeDomain}/api/v2/logs?xxx`)).toBe(true)
        expect(configuration.isIntakeUrl(`https://session-replay.${intakeDomain}/api/v2/replay?xxx`)).toBe(true)
      })
    })

    it('should not detect non intake request', () => {
      const configuration = computeTransportConfiguration({ clientToken }, buildEnv)
      expect(configuration.isIntakeUrl('https://www.foo.com')).toBe(false)
    })

    it('should handle sites with subdomains', () => {
      const configuration = computeTransportConfiguration({ clientToken, site: 'foo.datadoghq.com' }, buildEnv)
      expect(configuration.isIntakeUrl(`https://rum.browser-intake-foo-datadoghq.com/api/v2/rum?xxx`)).toBe(true)
      expect(configuration.isIntakeUrl(`https://logs.browser-intake-foo-datadoghq.com/api/v2/logs?xxx`)).toBe(true)
      expect(
        configuration.isIntakeUrl(`https://session-replay.browser-intake-foo-datadoghq.com/api/v2/replay?xxx`)
      ).toBe(true)
    })

    it('should detect proxy intake request', () => {
      let configuration = computeTransportConfiguration({ clientToken, proxyHost: 'www.proxy.com' }, buildEnv)
      expect(configuration.isIntakeUrl(`https://www.proxy.com/api/v2/rum?xxx`)).toBe(true)

      configuration = computeTransportConfiguration({ clientToken, proxyHost: 'www.proxy.com/custom/path' }, buildEnv)
      expect(configuration.isIntakeUrl(`https://www.proxy.com/custom/path/api/v2/rum?xxx`)).toBe(true)
    })

    it('should not detect request done on the same host as the proxy', () => {
      const configuration = computeTransportConfiguration({ clientToken, proxyHost: 'www.proxy.com' }, buildEnv)
      expect(configuration.isIntakeUrl('https://www.proxy.com/foo')).toBe(false)
    })

    it('should detect replica intake request', () => {
      const configuration = computeTransportConfiguration(
        { clientToken, site: 'datadoghq.eu', replica: { clientToken } },
        { ...buildEnv, buildMode: BuildMode.STAGING }
      )
      expect(configuration.isIntakeUrl(`https://rum.browser-intake-datadoghq.eu/api/v2/rum?xxx`)).toBe(true)
      expect(configuration.isIntakeUrl(`https://logs.browser-intake-datadoghq.eu/api/v2/logs?xxx`)).toBe(true)
      expect(configuration.isIntakeUrl(`https://session-replay.browser-intake-datadoghq.eu/api/v2/replay?xxx`)).toBe(
        true
      )

      expect(configuration.isIntakeUrl(`https://rum.browser-intake-datadoghq.com/api/v2/rum?xxx`)).toBe(true)
      expect(configuration.isIntakeUrl(`https://logs.browser-intake-datadoghq.com/api/v2/logs?xxx`)).toBe(true)
      expect(configuration.isIntakeUrl(`https://session-replay.browser-intake-datadoghq.com/api/v2/replay?xxx`)).toBe(
        false
      )
    })
  })
})
