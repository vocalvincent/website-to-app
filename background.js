chrome.runtime.onInstalled.addListener(() => {
  console.log('Website to App is ready.');
});

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.action === 'openStandalone' && msg.url) {
    chrome.windows.create({
      url: msg.url,
      type: 'popup',
      width: 1200,
      height: 800
    });
  }

  if (msg.action === 'setBadge') {
    const tabId = sender?.tab?.id;
    if (typeof tabId !== 'number') {
      return;
    }

    chrome.action.setBadgeText({ text: msg.text, tabId });
    chrome.action.setBadgeBackgroundColor({ color: msg.color, tabId });
  }
});
