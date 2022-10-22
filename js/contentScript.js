
function injectScript(file_path, tag) {
    // var node = document.getElementsByTagName(tag)[0];
    var script = document.createElement('script');
    script.setAttribute('type', 'text/javascript');
    script.setAttribute('src', file_path);
    (document.head||document.documentElement).appendChild(script);
}

injectScript(chrome.extension.getURL('js/injected.js'), 'body');

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.new_message_akto) {
        window.localStorage.setItem("shouldAktoRecord", "true")
    }
});

window.addEventListener("message", function (event) {
    // only accept messages from the current tab
    if (event.source != window)
        return;

    if (event.data && event.data.url) {
        function shouldRecord(response) {
            window.localStorage.setItem("shouldAktoRecord", (response && response.shouldRecord))
        }
        chrome.runtime.sendMessage({ data: event.data }, shouldRecord.bind(this));
    }
}, false);
