let deferredPrompt = null;

function isAppModeActive() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function setBadge(text, color) {
  chrome.runtime.sendMessage({ action: 'setBadge', text, color });
}

function refreshBadge() {
  if (isAppModeActive()) {
    setBadge('', '#cccccc');
  } else if (deferredPrompt) {
    setBadge('app', '#00d26a');
  } else {
    setBadge('web', '#00a6ed');
  }
}

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredPrompt = event;
  refreshBadge();
});

window.addEventListener('load', () => {
  setTimeout(refreshBadge, 500);
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'checkAppMode') {
    if (isAppModeActive()) {
      sendResponse({ status: 'installed' });
    } else if (deferredPrompt) {
      sendResponse({ status: 'can_install' });
    } else {
      sendResponse({ status: 'fallback' });
    }
    return;
  }

  if (msg.action === 'triggerAppAction') {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choice) => {
        if (choice.outcome === 'accepted') {
          sendResponse({ success: true, message: 'Install prompt opened. Follow Chrome’s steps to finish setup.' });
        } else {
          sendResponse({ success: false, message: 'Install canceled. You can still open it in Standard App Mode.' });
        }
      });
      return true;
    }

    if (isAppModeActive()) {
      chrome.runtime.sendMessage({ action: 'openStandalone', url: window.location.href });
      sendResponse({ success: true, message: 'Opened in its own app window.' });
      return;
    }

    chrome.runtime.sendMessage({ action: 'openStandalone', url: window.location.href });
    sendResponse({ success: true, message: 'Opened in Standard App Mode.' });
  }
});
