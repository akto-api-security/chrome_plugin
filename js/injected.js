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
                let responseBody = ''
                if ( _this.responseType != 'blob') {
                    if (_this.responseType === 'arraybuffer') {
                        if (_this.response) {
                            var dec = new TextDecoder("utf-8");
                            responseBody = dec.decode(_this.response)
                        }
                    } else {
                        responseBody = _this.responseText
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
                                responseBody: responseBody
                            }
                            obj = JSON.stringify(obj);
                            window.postMessage(JSON.parse(obj));  

                        } catch(err) {
                            console.log(err);
                        }
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

const { fetch: originalFetch } = window;

window.fetch = async (...args) => {
    let [resource, options] = args;

    let startTime = +(new Date());
    let url = typeof resource === "string" ? resource : resource.url
    let method = typeof resource === "string" && options? options.method : resource.method
    let headers = typeof resource === "string" && options? options.headers : resource.headers
    let body = options? options.body : "{}"
    method = method || "GET"
    const response = await originalFetch(resource, options);

    let endTime = +(new Date());

    let responseBody = ''
    
    if (response.responseType != 'blob') {
        if (response.responseType === 'arraybuffer') {
            if (response.response) {
                var dec = new TextDecoder("utf-8");
                responseBody = dec.decode(response.response)
            }
        } else {
            responseBody = await response.clone().text()
        }
    }

    

    let responseHeaders = {}
    for (var pair of response.headers.entries()) {
        responseHeaders[pair[0]] = pair[1]
     }
     
    let obj = {
        url,
        page: window.location.href,
        startTime,
        endTime,
        method,
        status: response.status,
        requestHeaders: headers,
        requestBody: body,
        responseHeaders: responseHeaders,
        responseBody
    }
    obj = JSON.stringify(obj);
    window.postMessage(JSON.parse(obj));  
    return response;
};