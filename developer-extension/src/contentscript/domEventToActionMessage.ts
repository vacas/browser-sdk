document.querySelector('html').addEventListener('send-to-background', (event: any) => {
  chrome.runtime.sendMessage({ action: event.detail.action, payload: event.detail.payload })
})
