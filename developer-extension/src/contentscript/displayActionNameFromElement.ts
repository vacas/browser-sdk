// eslint-disable-next-line max-len
import { getActionNameFromElement } from '@datadog/browser-rum-core/src/domain/rumEventsCollection/action/getActionNameFromElement'

const SPAN_ID = 'display-action-name'
let display = false

document.querySelector('html').addEventListener('toggleActionName', () => {
  display = !display
  if (display) {
    const spanElement = document.createElement('span')
    spanElement.id = SPAN_ID
    spanElement.setAttribute(
      'style',
      'position: fixed; display: block; top: 0; left: 0; background-color: red; z-index: 1000000; padding: 5px;'
    )

    spanElement.innerText = 'hover elements on the page...'
    document.body.append(spanElement)
  } else {
    const spanElement = document.getElementById(SPAN_ID)
    document.body.removeChild(spanElement)
  }
})

document.addEventListener('mouseover', (event) => {
  const spanElement = document.getElementById(SPAN_ID)
  if (!spanElement || !display || !(event.target instanceof Element)) {
    return
  }
  spanElement.innerText = getActionNameFromElement(event.target)
})
