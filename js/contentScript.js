
function injectScript(file_path, tag) {
    // var node = document.getElementsByTagName(tag)[0];
    var script = document.createElement('script');
    script.setAttribute('type', 'text/javascript');
    script.setAttribute('src', file_path);
    (document.head||document.documentElement).appendChild(script);
}

injectScript(chrome.extension.getURL('js/injected.js'), 'body');

window.addEventListener("message", function (event) {
    // only accept messages from the current tab
    if (event.source != window)
        return;

    if (event.data && event.data.url) {
        chrome.runtime.sendMessage({ data: event.data });
    }
}, false);
