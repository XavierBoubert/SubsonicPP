chrome.commands.onCommand.addListener(function(command) {
  console.log(command);
});

/*chrome.browserAction.onClicked.addListener(function(tab) {
  var action_url = "javascript:window.print();";
  chrome.tabs.update(tab.id, {url: action_url});
});*/