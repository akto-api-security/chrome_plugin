chrome.devtools.panels.create("Akto", "assets/16x16.png", "devtools_index.html", function(panel) {
    let pageUrl = ""
    chrome.tabs.query({active:true}, function(tabs) {
        pageUrl = tabs[0].url
    })    
    chrome.devtools.network.onRequestFinished.addListener( (request) => {
        request.getContent((responseContent) => {
            if (request._resourceType === "xhr" || request._resourceType === "fetch") {
                chrome.runtime.sendMessage({action: 'devtools_request', request, pageUrl, responseContent})
            }
        })
    });  
});