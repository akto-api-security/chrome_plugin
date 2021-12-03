(function(xhr) {

    var XHR = XMLHttpRequest.prototype;

    var open = XHR.open;
    var send = XHR.send;
    var setRequestHeader = XHR.setRequestHeader;

    XHR.open = function(method, url) {
        this._method = method;
        this._url = url;
        console.log("open", url);
        this._requestHeaders = {};
        this._startTime = +(new Date());

        return open.apply(this, arguments);
    };

    XHR.setRequestHeader = function(header, value) {
        this._requestHeaders[header] = value;
        return setRequestHeader.apply(this, arguments);
    };

    XHR.send = function(postData) {

        this.addEventListener('load', function() {
            var endTime = +(new Date());
            var myUrl = this._url ? this._url.toLowerCase() : this._url;
            console.log("send", this._url);

            if(myUrl) {
                // here you get the RESPONSE HEADERS
                var responseHeaders = this.getAllResponseHeaders();

                if ( this.responseType != 'blob' && this.responseText) {
                    // responseText is string or null
                    try {
                        let obj = {
                            url: myUrl,
                            page: window.location.href,
                            startTime: this._startTime,
                            endTime: endTime,
                            method: this._method,
                            status: this.status,
                            requestHeaders: this._requestHeaders,
                            requestBody: postData,
                            responseHeaders: responseHeaders,
                            responseBody: this.responseText
                        }
                        obj = JSON.parse(JSON.stringify(obj));
                        window.postMessage(obj);  
                    } catch(err) {
                        console.log("Error in responseType try catch");
                        console.log(err);
                    }
                }

            }
        });

        return send.apply(this, arguments);
    };

})(XMLHttpRequest);

