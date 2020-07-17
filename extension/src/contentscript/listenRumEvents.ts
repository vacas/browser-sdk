import { HTML_TAG, EVENTS } from './constants'

interface CustomEventDetail {
  content: string
  date: number
  type: string
}

HTML_TAG.addEventListener(EVENTS.RUM_EVENT_NAME, (customEvent: CustomEvent<CustomEventDetail>) => {
  if (customEvent.detail) {
    chrome.runtime.sendMessage({
      event: JSON.parse(customEvent.detail.content),
      type: 'eventReceived',
    })
  }
})
