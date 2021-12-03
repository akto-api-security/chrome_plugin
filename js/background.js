chrome.browserAction.onClicked.addListener(function() {
    chrome.tabs.query({
      active: true,
      currentWindow: true
    }, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, "toggle");
    });
  });
  
  chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
      if(request == "captureSelector") {
        console.log(sender);
        console.log("'Capture DOM selector' event detected");
  
        chrome.debugger.attach({tabId: sender.tab.id}, "1.0");
      }
    }
  );
  