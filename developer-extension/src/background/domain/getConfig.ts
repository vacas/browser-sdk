import { evaluateCodeInActiveTab } from '../utils'
import { listenAction } from '../actions'
import { setLocalStore } from '../store'

listenAction('getConfig', (type) => {
  evaluateCodeInActiveTab((type) => {
    sendActionAsDomEvent('configReceived', {
      type,
      config:
        type === 'rum' ? (window as any).DD_RUM.getInitConfiguration() : (window as any).DD_LOGS.getInitConfiguration(),
    })

    function sendActionAsDomEvent(action: string, payload: any) {
      document.querySelector('html').dispatchEvent(
        new CustomEvent('extension', {
          detail: { action, payload },
        } as any)
      )
    }
  }, type)
})

listenAction('configReceived', ({ type, config }, tabId) => {
  setLocalStore(type === 'rum' ? { rumConfig: config } : { logsConfig: config }, tabId)
})
