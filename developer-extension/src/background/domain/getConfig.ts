import { evaluateCodeInActiveTab } from '../utils'
import { listenAction } from '../actions'
import { setStore } from '../store'

listenAction('getConfig', () => {
  evaluateCodeInActiveTab(() => {
    sendActionAsDomEvent('configReceived', (window as any).DD_RUM.getInitConfiguration())

    function sendActionAsDomEvent(action: string, payload: any) {
      document.querySelector('html').dispatchEvent(
        new CustomEvent('extension', {
          detail: { action, payload },
        } as any)
      )
    }
  })
})

listenAction('configReceived', (config) => {
  setStore({ config })
})
