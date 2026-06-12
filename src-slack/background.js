// Alert scripts on Slack tabs and update extension icon
function updateSlackTabs(state) {
  console.log("updateSlackTabs");
  chrome.tabs.query({ url: "*://*.slack.com/*" }, (tabs) => {
    tabs.forEach((tab) => updateSlackTab(state, tab.id));
  });
}

function updateSlackTab(state, tabId) {
  console.log("updateSlackTab");
  chrome.tabs.sendMessage(tabId, state);
  if (state.active) {
    chrome.action.setIcon({ tabId, path: "icons/icon128-active.png" });
  } else {
    chrome.action.setIcon({ tabId, path: "icons/icon128-inactive.png" });
  }
}

// Initialize extension status on client when requested
chrome.runtime.onMessage.addListener(async function (request, sender, sendResponse) {
  if (request.action === "update") {
    chrome.storage.local.set(request.state);
    updateSlackTabs(request.state);
    sendResponse({ success: true });
  }
  else if (request.action === "silent-update") {
    chrome.storage.local.set(request.state);
    sendResponse({ success: true });
  }
  return true;
});

// Initialize extension on install
chrome.runtime.onInstalled.addListener(async function (details) {
  let state = await getState({
    active: true
  });
  await setState(state);
  console.table(state);

  if (details.reason == "install") {
    console.log("[Hide Slack Sidebar] First install");
    chrome.tabs.query({ url: "*://*.slack.com/*" }, function (tabs) {
      tabs.forEach((tab) => {
        chrome.tabs.reload(tab.id);
      });
    });
  } else if (details.reason == "update") {
    const thisVersion = chrome.runtime.getManifest().version;
    console.log("[Hide Slack Sidebar] Updated from " + details.previousVersion + " to " + thisVersion + "!");
    chrome.tabs.query({ url: "*://*.slack.com/*" }, (tabs) => {
      tabs.forEach((tab) => {
        if (state.active) {
          chrome.action.setIcon({ tabId: tab.id, path: "icons/icon128-active.png" });
        } else {
          chrome.action.setIcon({ tabId: tab.id, path: "icons/icon128-inactive.png" });
        }
        chrome.action.enable(tab.id);
      });
    });
  }
});

// This listener is required to update Slack tab when a person goes from a non-app page to the Slack webapp itself
const tabIdToPreviousUrl = {};
chrome.tabs.onUpdated.addListener(async function (tabId, changeInfo, tab) {
  if (changeInfo.status === 'complete' && tab.url && tab.url.match(/slack\.com/)) {
    let previousUrl = tabIdToPreviousUrl[tabId] || "";

    if (previousUrl === tab.url || !previousUrl.match(/(client\/)/)) {
      let state = await getState(null);
      updateSlackTab(state, tabId);
      chrome.action.enable(tabId);
    }
    tabIdToPreviousUrl[tabId] = tab.url;
  } else if (changeInfo.status === 'complete') {
    chrome.action.disable(tabId);
  }
});

chrome.tabs.onCreated.addListener(async function (tab) {
  if (tab.url && tab.url.match(/slack\.com/)) {
    let state = await getState(null);
    updateSlackTab(state, tab.id);
    chrome.action.enable(tab.id);
  } else if (tab.url) {
    chrome.action.disable(tab.id);
  }
});

chrome.tabs.onRemoved.addListener(function (tabId) {
  delete tabIdToPreviousUrl[tabId];
});

// Promisify Chrome functions
function getState(query) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(query, function (result) {
      resolve(result);
    });
  });
}

function setState(data) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(data, function () {
      resolve(data);
    });
  });
}
