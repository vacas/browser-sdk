document.querySelector('html').addEventListener('extension', (event: any) => {
  try {
    chrome.runtime.sendMessage({ action: event.detail.action, payload: event.detail.payload })
  } catch (e) {}
})
