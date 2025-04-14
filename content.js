let deferredPrompt = null;

function isPWAInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function setBadge(text, color) {
  chrome.runtime.sendMessage({ action: "setBadge", text, color });
}

function checkAndSetBadge() {
  if (isPWAInstalled()) {
    setBadge("", "#cccccc"); // No badge if already installed
  } else if (deferredPrompt) {
    setBadge("app", "#00d26a");
  } else {
    setBadge("web", "#00a6ed");
  }
}

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  checkAndSetBadge();
});

window.addEventListener("load", () => {
  setTimeout(() => {
    checkAndSetBadge();
  }, 500); // allow beforeinstallprompt to fire
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "checkPWAStatus") {
    if (isPWAInstalled()) {
      sendResponse({ status: "installed" });
    } else if (deferredPrompt) {
      sendResponse({ status: "can_install" });
    } else {
      sendResponse({ status: "fallback" });
    }
  }

  if (msg.action === "triggerInstall") {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choice) => {
        if (choice.outcome === "accepted") {
          sendResponse({ message: "✅ Web app installation started." });
        } else {
          sendResponse({ message: "⚠️ Web app installation dismissed." });
        }
      });
    } else if (isPWAInstalled()) {
      sendResponse({ message: "✅ Web app is already installed." });
    } else {
      chrome.runtime.sendMessage({ action: "openStandalone", url: window.location.href });
      sendResponse({ message: "🆗 Opened in standalone window." });
    }
    return true;
  }
});