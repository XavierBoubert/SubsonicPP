var tabs = {
  prev: 0,
  pause: 0,
  next: 0
},
lastOpenedTab = 0;;


function createTabs() {
  chrome.tabs.create({
    index: 0,
    pinned: true,
    url: 'prev.html',
    active: false
  }, function(tab) {
    tabs.prev = tab.id;
  });
}

createTabs();

chrome.tabs.onActivated.addListener(function(activeInfo) {
  if(activeInfo.tabId == tabs.prev) {

    console.log('PREV !');
    chrome.tabs.sendMessage(activeInfo.tabId, 'close');
    setTimeout(function() {
      createTabs();
    }, 300);
    /*chrome.tabs.executeScript(activeInfo.tabId, {
      code: 'window.close()'
    }, function() {
      createTabs();
    });*/

  }
  else {
    lastOpenedTab = activeInfo.tabId;
  }
});