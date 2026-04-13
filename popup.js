const RECENT_LIMIT = 5;
let currentTab = null;
let currentMode = null;

const statusTitle = document.getElementById('statusTitle');
const statusHint = document.getElementById('statusHint');
const message = document.getElementById('message');
const primaryBtn = document.getElementById('primaryActionBtn');
const secondaryBtn = document.getElementById('secondaryActionBtn');
const recentSection = document.getElementById('recentSection');
const recentList = document.getElementById('recentList');

document.addEventListener('DOMContentLoaded', initializePopup);
primaryBtn.addEventListener('click', onPrimaryAction);
secondaryBtn.addEventListener('click', openLastApp);

async function initializePopup() {
  [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!currentTab || !currentTab.url || !currentTab.id) {
    showUnavailableState('This page cannot be opened as an app.', 'Try a regular website tab.');
    return;
  }

  const state = await requestTabState(currentTab.id);
  renderState(state);
  await renderRecentApps();
}

function requestTabState(tabId) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, { action: 'checkAppMode' }, (response) => {
      if (chrome.runtime.lastError || !response) {
        resolve({ status: 'unavailable' });
        return;
      }
      resolve(response);
    });
  });
}

function renderState(state) {
  primaryBtn.disabled = false;

  if (state.status === 'installed') {
    currentMode = 'already';
    primaryBtn.textContent = 'Open as App';
    statusTitle.textContent = 'Already ready as an app';
    statusHint.textContent = 'This site supports full app behavior. We can open it in a desktop-style window.';
    return;
  }

  if (state.status === 'can_install') {
    currentMode = 'best';
    primaryBtn.textContent = 'Install as App (Best Experience)';
    statusTitle.textContent = 'Full App Experience Available';
    statusHint.textContent = 'We will show the install prompt so this site behaves most like a desktop app.';
    return;
  }

  if (state.status === 'fallback') {
    currentMode = 'standard';
    primaryBtn.textContent = 'Open in Standard App Mode';
    statusTitle.textContent = 'Standard App Mode';
    statusHint.textContent = 'This site can still open in its own app-like window.';
    return;
  }

  showUnavailableState('This page cannot be opened as an app.', 'Try a different site that allows app-style windows.');
}

function showUnavailableState(title, hint) {
  currentMode = 'unavailable';
  statusTitle.textContent = title;
  statusHint.textContent = hint;
  primaryBtn.textContent = 'Not Available Here';
  primaryBtn.disabled = true;
}

async function onPrimaryAction() {
  if (!currentTab?.id || currentMode === 'unavailable') {
    return;
  }

  setMessage('Working…');

  chrome.tabs.sendMessage(currentTab.id, { action: 'triggerAppAction' }, async (response) => {
    if (chrome.runtime.lastError || !response) {
      setMessage('Could not complete that action on this page.');
      return;
    }

    if (response.success) {
      setMessage(response.message, true);
      await saveRecentApp(currentTab);
      await renderRecentApps();
    } else {
      setMessage(response.message || 'Something went wrong.');
    }
  });
}

function setMessage(text, isSuccess = false) {
  message.textContent = text;
  message.classList.toggle('success', isSuccess);
}

function saveRecentApp(tab) {
  return new Promise((resolve) => {
    chrome.storage.local.get(['recentApps', 'lastApp'], (result) => {
      const existing = Array.isArray(result.recentApps) ? result.recentApps : [];
      const next = [{
        title: tab.title || new URL(tab.url).hostname,
        url: tab.url,
        host: new URL(tab.url).hostname,
        at: Date.now()
      }, ...existing.filter((item) => item.url !== tab.url)].slice(0, RECENT_LIMIT);

      chrome.storage.local.set({ recentApps: next, lastApp: next[0] }, () => resolve());
    });
  });
}

function renderRecentApps() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['recentApps', 'lastApp'], (result) => {
      const recentApps = Array.isArray(result.recentApps) ? result.recentApps : [];
      const lastApp = result.lastApp;

      recentList.innerHTML = '';
      if (!recentApps.length) {
        recentSection.classList.add('hidden');
      } else {
        recentSection.classList.remove('hidden');
        recentApps.slice(0, RECENT_LIMIT).forEach((app) => {
          const item = document.createElement('li');
          const button = document.createElement('button');
          button.className = 'recent-item';
          button.textContent = `${app.title} • ${app.host}`;
          button.addEventListener('click', () => {
            chrome.runtime.sendMessage({ action: 'openStandalone', url: app.url });
            setMessage(`Opened ${app.host}.`, true);
          });
          item.appendChild(button);
          recentList.appendChild(item);
        });
      }

      if (lastApp?.url) {
        secondaryBtn.classList.remove('hidden');
      } else {
        secondaryBtn.classList.add('hidden');
      }

      resolve();
    });
  });
}

function openLastApp() {
  chrome.storage.local.get(['lastApp'], (result) => {
    const lastApp = result.lastApp;
    if (!lastApp?.url) {
      return;
    }

    chrome.runtime.sendMessage({ action: 'openStandalone', url: lastApp.url });
    setMessage(`Opened ${lastApp.host || 'last app'}.`, true);
  });
}
