chrome.runtime.onMessage.addListener(function(message) {
  if(message == 'close') {
    setTimeout(function() {
      window.close();
    }, 200);
  }
});