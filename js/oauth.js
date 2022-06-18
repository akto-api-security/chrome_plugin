document.getElementById('sign_in').addEventListener('click', function () {
    chrome.runtime.sendMessage({ action: 'login' }, 
    function (response) {
        console.log(response);
    });
});        
