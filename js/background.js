window.perfWatch = {};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!window.perfWatch[sender.tab.id]) {
        window.perfWatch[sender.tab.id] = []
    }
    window.perfWatch[sender.tab.id].push(message);

    
});