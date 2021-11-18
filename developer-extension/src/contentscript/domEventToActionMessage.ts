document.querySelector('html').addEventListener('extension', (event: any) => {
  chrome.runtime.sendMessage({ action: event.detail.action, payload: event.detail.payload })
})
