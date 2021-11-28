/**
 * code in inject.js
 * added "web_accessible_resources": ["injected.js"] to manifest.json
 */
 var s = document.createElement('script');
 s.src = chrome.extension.getURL('js/injected.js');
 s.onload = function() {
     this.remove();
 };
 (document.head || document.documentElement).appendChild(s);
 
 window.addEventListener("message", (event) => {
    chrome.runtime.sendMessage(event.data);
 }, false);
