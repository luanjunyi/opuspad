chrome.tabs.create({
  active: true,
  url: chrome.runtime.getURL('index.html'),
});

window.close();
