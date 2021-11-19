import { listenAction } from '../actions'
import { evaluateCodeInActiveTab } from '../utils'

listenAction('toggleActionName', () =>
  evaluateCodeInActiveTab(() => {
    document.querySelector('html').dispatchEvent(new CustomEvent('toggleActionName'))
  })
)
