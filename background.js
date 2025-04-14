chrome.runtime.onInstalled.addListener(() => {
  console.log("Website to App is ready.");
});

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.action === "openStandalone" && msg.url) {
    chrome.windows.create({
      url: msg.url,
      type: "popup",
      width: 1200,
      height: 800
    });
  }

  if (msg.action === "setBadge") {
    const { text, color } = msg;
    chrome.action.setBadgeText({ text, tabId: sender.tab.id });
    chrome.action.setBadgeBackgroundColor({ color, tabId: sender.tab.id });
  }
});