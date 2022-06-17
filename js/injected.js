(function(xhr) {

    var XHR = XMLHttpRequest.prototype;

    var open = XHR.open;
    var send = XHR.send;
    var setRequestHeader = XHR.setRequestHeader;

    XHR.open = function(method, url) {
        this._method = method;
        this._url = url;
        this._requestHeaders = {};
        this._startTime = +(new Date());

        return open.apply(this, arguments);
    };

    XHR.setRequestHeader = function(header, value) {
        this._requestHeaders[header] = value;
        return setRequestHeader.apply(this, arguments);
    };

    XHR.send = function(postData) {

        var f = function(_this) {

            var endTime = +(new Date());
            var myUrl = _this._url;

            if(myUrl) {
                // here you get the RESPONSE HEADERS
                var responseHeaders = _this.getAllResponseHeaders();

                if ( _this.responseType != 'blob' && _this.responseText) {
                    // responseText is string or null
                    try {
                        let obj = {
                            url: myUrl,
                            page: window.location.href,
                            startTime: _this._startTime,
                            endTime: endTime,
                            method: _this._method,
                            status: _this.status,
                            requestHeaders: _this._requestHeaders,
                            requestBody: postData,
                            responseHeaders: responseHeaders,
                            responseBody: _this.responseText
                        }
                        obj = JSON.stringify(obj);
                        window.postMessage(JSON.parse(obj));  

                    } catch(err) {
                        console.log(err);
                    }
                }

            }
        }

        var events = ["abort", "error", "loadend", "load", "progress", "timeout"]

        for (var i = 0; i < events.length; i++) {
            let x = events[i]
            let _this = this
            this.addEventListener(x, function(e) {
                f(_this)
            })
        }
        this.addEventListener('load', f);

        return send.apply(this, arguments);
    };

})(XMLHttpRequest);
