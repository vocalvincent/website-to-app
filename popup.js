document.addEventListener('DOMContentLoaded', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.tabs.sendMessage(tab.id, { action: "checkPWAStatus" }, (response) => {
    const messageDiv = document.getElementById("message");
    const installBtn = document.getElementById("installBtn");

    if (chrome.runtime.lastError || !response) {
      messageDiv.innerText = "⚠️ This website can’t be used as an app.";
      installBtn.style.display = "none";
      return;
    }

    if (response.status === "installed") {
      messageDiv.innerText = "✅ Already installed as an app.";
      installBtn.style.display = "none";
    } else if (response.status === "can_install") {
      messageDiv.innerText = "✅ You can install this website as an app!";
      installBtn.textContent = "Install as App";
      installBtn.style.display = "block";
    } else if (response.status === "fallback") {
      messageDiv.innerText = "ℹ️ You can open this website as an app, but you can't install it.";
      installBtn.textContent = "Open as App";
      installBtn.style.display = "block";
    }
  });
});

document.getElementById('installBtn').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.tabs.sendMessage(tab.id, { action: "triggerInstall" }, (response) => {
    const msg = response?.message || "No response from content script";
    document.getElementById("message").innerText = msg;
  });
});