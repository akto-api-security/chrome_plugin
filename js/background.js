window.perfWatch = {};
portConnected = null

// maintain connection state for each tab
// if never connected, don't record data
// always maintain data per tab. When origin changes, discard old data. 

const CLIENT_ID = encodeURIComponent('779574722609-j4scecjhuiiu8u8g9hegjs27ihhpa3c2.apps.googleusercontent.com');
const RESPONSE_TYPE = encodeURIComponent('code');
const REDIRECT_URI = encodeURIComponent('https://mooaboaffjhdnjgokejegdbifojdmpea.chromiumapp.org/')
const SCOPE = "https%3A//www.googleapis.com/auth/userinfo.email%20https%3A//www.googleapis.com/auth/userinfo.profile"
const STATE = encodeURIComponent('meet' + Math.random().toString(36).substring(2, 15));
const PROMPT = encodeURIComponent('consent');

let user_signed_in = false;

function is_user_signed_in() {
    return user_signed_in;
}

function create_auth_endpoint() {
    let nonce = encodeURIComponent(Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15));

    let openId_endpoint_url =
        `https://accounts.google.com/o/oauth2/v2/auth
?client_id=${CLIENT_ID}
&response_type=${RESPONSE_TYPE}
&redirect_uri=${REDIRECT_URI}
&scope=${SCOPE}
&state=${STATE}
&nonce=${nonce}
&prompt=${PROMPT}`;

    return openId_endpoint_url;
}


let SubType = {
  NULL: "NULL",
  INTEGER: "INTEGER",
  FLOAT: "FLOAT",
  BOOL: "BOOL",
  STRING: "STRING",
  OTHER: "OTHER"
}

function isInt(n){
  return Number(n) === n && n % 1 === 0;
}

function isFloat(n){
  return Number(n) === n && n % 1 !== 0;
}

function patterns() {
  let ret = {}
  ret["EMAIL"] = new RegExp ("^[a-zA-Z0-9_+&*-]+(?:\\.[a-zA-Z0-9_+&*-]+)*@(?:[a-zA-Z0-9-]+\\.)+[a-zA-Z]{2,7}$");
  ret["URL"] = new RegExp ("^((((https?|ftps?|gopher|telnet|nntp)://)|(mailto:|news:))(%[0-9A-Fa-f]{2}|[-()_.!~*';/?:@&=+$,A-Za-z0-9])+)([).!';/?:,][[:blank:|:blank:]])?$");
  ret["CREDIT_CARD"] = new RegExp ("^((4\\d{3})|(5[1-5]\\d{2})|(6011)|(7\\d{3}))-?\\d{4}-?\\d{4}-?\\d{4}|3[4,7]\\d{13}$");
  ret["SSN"] = new RegExp ("^\\d{3}-\\d{2}-\\d{4}$");
  ret["UUID"] = new RegExp ("^[A-Z0-9]{8}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{12}$");
  ret["PAN_CARD"] = new RegExp ("^[A-Z]{5}[0-9]{4}[A-Z]{1}$");
  ret["PHONE_NUMBER_US"] = new RegExp ("^\D?(\d{3})\D?\D?(\d{3})\D?(\d{4})$");
  ret["PHONE_NUMBER_INDIA"] = /^(?:\s+|)((0|(?:(\+|)91))(?:\s|-)*(?:(?:\d(?:\s|-)*\d{9})|(?:\d{2}(?:\s|-)*\d{8})|(?:\d{3}(?:\s|-)*\d{7})|\d{10}))(?:\s+|)$/
  return ret
}

function isSensitive(str) {
  return patterns[str] !== null
}

function findSubType(o) {

  let patternMap = patterns()
  for(var key in patternMap) {
      let value = patternMap[key]
      let res = value.exec(o+"")
      if (res) {
          return key
      }
  }

  if (+o) {
      o = +o
  }

  if (o === null) {
      return SubType.NULL;
  } 

  if (isInt(o)) {
      return SubType.INTEGER
  }

  if (isFloat(o)) {
      return SubType.FLOAT
  }

  if (typeof o == "boolean") {
      return SubType.BOOL
  }

  if (typeof o === "string") {
      return SubType.STRING;
  }

  return SubType.OTHER;    
}

function createSingleTypeInfo(subType) {
  return {
      type: subType,
      values: []
  }
}

function flattenHelper(obj, result, prefix) {
  if (!obj || prefix.length > 100) {
      return 
  }

  if (Array.isArray(obj)) {
      for(var index in obj) {
          flattenHelper(obj[index], result, prefix)
      }
  } else if (typeof obj === 'object') {
      Object.keys(obj).forEach(key => {
          flattenHelper(obj[key], result, prefix+"."+key)
      })
  } else {
      let info = result[prefix]
      if (!info) {
          info = {}
          result[prefix] = info
      }
      
      let subType = findSubType(obj)

      if(!subType) {
          subType = SubType.OTHER
      } 
      
      let subTypeInfo = info[subType]

      if (!subTypeInfo) {
          subTypeInfo = createSingleTypeInfo(subType)
          info[subType] = subTypeInfo
      }

      subTypeInfo.values.push(obj)
  }
}

function flatten(details, prefix) {
  let ret = {}
  if (!details) {
      return ret
  }
  flattenHelper(details, ret, prefix)
  return ret
}

function tryJson(str) {
  try {
      return JSON.parse(str);
  } catch (e) {
      return null;
  }
}

function getQueryParams(qs) {
  qs = qs.split('+').join(' ');

  var params = {},
      tokens,
      re = /[?&]?([^=]+)=([^&]*)/g;

  while (tokens = re.exec(qs)) {
      params[decodeURIComponent(tokens[1])] = decodeURIComponent(tokens[2]);
  }

  return params;
}

var catalog = {
  tryParamsOrJson: obj => {
      try {
          if (obj == null) {
              return {}
          }

          if (typeof obj=== "object") {
              return flatten(obj, "")
          }

          if (typeof obj === "string") {
              let json = tryJson(obj, "")

              if (json) {
                  return flatten(json, "")
              } else {
                  return flatten(getQueryParams(obj), "")
              }
          }
      } catch (e) {
          return null;
      }

      return {}
  },
  
  toSuperType: subType => {
      return (patterns()[subType]) ? "STRING" : subType
  },

  isSensitive: str => {
      return !!(patterns()[str])
  }
}

function aggregateInfo(method, url, reqHeaders, reqBody, respHeaders, respBody, endpoints) {
  try { 
    let endpointObj = endpoints[method + " " + url]
    if (!endpointObj) {
        if (Object.entries(endpoints).length > 1000) {
          console.log("1000 endpoints reached!")
          return;
        }
        endpointObj = {
            color: "#f44336",
            method: method,
            endpoint: url,
            type: [],
            authType: "Bearer"
        }
        endpoints[method + " " + url] = endpointObj
    }
    let allTypes = Object.values({...reqHeaders, ...respHeaders, ...respBody, ...reqBody})
    let sensitive = allTypes.map(Object.keys).flat().filter(y => catalog.isSensitive(y))
    
    if (sensitive && sensitive.length > 0) {
        endpointObj.type = Array.from(new Set([...endpointObj.type, ...sensitive]))
    }

  } catch (e) {
      console.error(e)
  }
};

function parseHeaderString(str) {

  if(typeof str === "object") return str

  var arr = str.split('\r\n');
  var headers = arr.reduce(function (acc, current, i){
      var parts = current.split(': ');
      acc[parts[0]] = parts[1];
      return acc;
  }, {});
  return headers
};


function onNewApiCall(apiCall, endpoints) {
  let _aggregateInfo = aggregateInfo                
  if (apiCall.status >= 200 && apiCall.status < 300) {
      if (apiCall.url && apiCall.method) {
          try {
              let requestBodyObj = {}
              let requestHeadersObj = {}
              let responseBodyObj = {}
              let responseHeadersObj = {}

              
              requestHeadersObj = catalog.tryParamsOrJson(apiCall.requestHeaders) || {}
              let requestBody = apiCall.requestBody

              if (requestBody) {
                  requestBodyObj = catalog.tryParamsOrJson(requestBody) || {}
              }

              let queryString = apiCall.url.indexOf("?") != -1 ? apiCall.url.split("?")[1] : ""

              if (queryString && queryString.length > 0) {
                  let queryStringObj = catalog.tryParamsOrJson(queryString) || {}
                  requestBodyObj = {...requestBodyObj, ...queryStringObj}
              }  


              if (apiCall.responseHeaders) {
                  let parsedHeaders = parseHeaderString(apiCall.responseHeaders)
                  responseHeadersObj = catalog.tryParamsOrJson(parsedHeaders) || {}
              }

              if (apiCall.responseBody) {
                  responseBodyObj = catalog.tryParamsOrJson(apiCall.responseBody) || {}
              }

              let endpoint = null

              try {
                  endpoint = new URL(apiCall.url)
              } catch (e) {
                  endpoint = new URL (new URL(apiCall.page).pathname + apiCall.url)
              }

              if (endpoint) {
                  _aggregateInfo(
                      apiCall.method, 
                      endpoint.pathname, 
                      requestHeadersObj, 
                      requestBodyObj, 
                      responseHeadersObj, 
                      responseBodyObj,
                      endpoints
                  )
              }
          } catch(e) {

          }
      }
  }                
};

chrome.extension.onConnect.addListener(function(port) {
  portConnected = port  
  chrome.tabs.query({ active: true }, function (tabs) {
    let currHostname = new URL(tabs[0].url).hostname
    if (Object.keys(window.perfWatch).length == 0) {
      window.perfWatch[currHostname] = {
        connected: true,
        startTime: parseInt(Date.now()/1000),
        origin: currHostname,
        endpoints: {}
      }  
    } else if (!window.perfWatch[currHostname]) {
      port.postMessage({storedWebsiteHostNames: Object.keys(window.perfWatch), currHostname})
    } else {
      port.postMessage(window.perfWatch[currHostname])
    }
  });    

  port.onMessage.addListener((s) => {
    if (s.emptyState) {
      delete(window.perfWatch[s.emptyState])

      if (s.startListeningToNew) {
        window.perfWatch = {}
        chrome.tabs.query({ active: true }, function (tabs) {
          let currHostname = new URL(tabs[0].url).hostname
          window.perfWatch[currHostname] = {
            connected: true,
            startTime: parseInt(Date.now()/1000),
            origin: currHostname,
            endpoints: {}
          }  

          if (allCollectionsList == null) {
            return
          }
          
          let collectionFound = allCollectionsList.find(x => x.displayName === currHostname)
      
          if (collectionFound) {
            window.perfWatch[currHostname].apiCollectionId = collectionFound.id 
          } else {
            if (createCollectionInAktoFunc) {
              createCollectionInAktoFunc(currHostname)
            }
          }
        })        
      }
    }
  })

  // port.onDisconnect.addListener(function() {
  //   if (window.perfWatch[currHostname]) {
  //     window.perfWatch[currHostname].connected = false
  //   }
  // })
})

let allCollectionsList = null

async function populateAllCollectionsList(token) {
  return await fetch("https://us-east1.app.akto.io/api/getAllCollections", {
    "headers": {
      "accept": "application/json, text/plain, */*",
      "accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
      "access-control-allow-origin": "*",
      "access-token": token,
      "account": "1655709762",
      "content-type": "application/json",
      "sec-ch-ua": "\" Not A;Brand\";v=\"99\", \"Chromium\";v=\"102\", \"Google Chrome\";v=\"102\"",
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": "\"macOS\"",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin"
    },
    "body": "{}",
    "method": "POST",
    "mode": "cors",
    "credentials": "include"
  }).then(response => {
    return response.json()
  }).then(data => {
    allCollectionsList = data.apiCollections
    return allCollectionsList
  });
}

function generateCreateCollectionInAktoFunc(token) {

  if (allCollectionsList == null) {
    populateAllCollectionsList(token)
  }

  var createCollectionInAkto = async function(collectionName) {

    await fetch("https://us-east1.app.akto.io/api/createCollection", {
      "headers": {
        "accept": "application/json, text/plain, */*",
        "accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
        "access-control-allow-origin": "*",
        "access-token": token,
        "account": "1655709762",
        "content-type": "application/json",
        "sec-ch-ua": "\" Not A;Brand\";v=\"99\", \"Chromium\";v=\"102\", \"Google Chrome\";v=\"102\"",
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": "\"macOS\"",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin"
      },
      "body": "{\"collectionName\":\""+collectionName+"\"}",
      "method": "POST",
      "mode": "cors",
      "credentials": "include"
    });
    
    await populateAllCollectionsList(token)
  }

  return createCollectionInAkto
}

function generateSendToAktoFunc(token) {
  var sendToAkto = function(messages, apiCollectionId) {
    fetch("https://us-east1.app.akto.io/api/uploadTraffic", {
      "headers": {
        "accept": "application/json, text/plain, */*",
        "accept-language": "en-US,en;q=0.9,mr;q=0.8",
        "access-control-allow-origin": "*",
        "access-token": token,
        "content-type": "application/json",
        "sec-ch-ua": "\" Not A;Brand\";v=\"99\", \"Chromium\";v=\"102\", \"Google Chrome\";v=\"102\"",
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": "\"macOS\"",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "x-akto-ignore": "true"
      },
      "referrerPolicy": "strict-origin-when-cross-origin",
      "body": JSON.stringify({apiCollectionId: apiCollectionId + 0, skipKafka: false, content: {log: JSON.parse(JSON.stringify(messages))}}),
      "method": "POST",
      "mode": "cors",
      "credentials": "include"
    }).then(response => {
      if (response.status == 302 || response.status >= 400) {
        logout()
      } else {
        return response.json()
      }
    })
  }

  return sendToAkto
} 

let sendToAktoFunc = null
let createCollectionInAktoFunc = null

function logout() {
  user_signed_in = false
  sendToAktoFunc = null
  createCollectionInAktoFunc = null
}

function transformDevtoolRequest(devtoolsRequest, responseContent) {
  let request = devtoolsRequest.request
  let response = devtoolsRequest.response

  return {
    url: request.url,
    method: request.method,
    status: response.status,
    requestHeaders: request.headers.reduce((z, e) => {
      z[e.name] = e.value
      return z
    }, {}),
    requestBody: request.postData ? request.postData.text : "{}",
    responseHeaders: response.headers.reduce((z, e) => {
      z[e.name] = e.value
      return z
    }, {}),
    responseBody: responseContent
  }

}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'logout') {
    logout()
    sendResponse({user_signed_in})
  } else if (message.action === 'user_signed_in') {
    sendResponse({user_signed_in})
  } else if (message.action === 'login') {
    if (user_signed_in) {
      return;
    } else {
      chrome.identity.launchWebAuthFlow({
        url: create_auth_endpoint(),
        interactive: true
      }, function (redirect_uri) {
        let urlObj = new URL(redirect_uri)
        let urlParams = getQueryParams(urlObj.search)
        async function startRequest(code, state) {
          let aktoUrl = "https://us-east1.app.akto.io/signup-google?code="+code+"&state="+state+"&shouldLogin=true"
          const response = await fetch(aktoUrl);
          let token = response.headers.get("access-token")

          if (token) {
            sendToAktoFunc = generateSendToAktoFunc(token)

            createCollectionInAktoFunc = generateCreateCollectionInAktoFunc(token)
            chrome.tabs.query({ active: true }, function (tabs) {
              let currHostname = new URL(tabs[0].url).hostname
              createCollectionInAktoFunc(currHostname)
            })
          }
        }      
        user_signed_in = true
        startRequest(urlParams.code, urlParams.state) 
      })
    }
  } else {  
    let currHostname = new URL(message.pageUrl || message.data.page).hostname
    let currData = window.perfWatch[currHostname]

    if (!currData) return

    if (message.action === 'devtools_request') {
      message.data = transformDevtoolRequest(message.request, message.responseContent)
    }

    if (!message.data.requestHeaders["x-akto-ignore"]) {
      onNewApiCall(message.data, currData.endpoints)

      if (sendToAktoFunc) {
        message.data.responseHeaders = parseHeaderString(message.data.responseHeaders)
        let collectionFound = allCollectionsList.find(x => x.displayName === currHostname)

        sendToAktoFunc(message.data, collectionFound.id || currData.apiCollectionId)
      }

      if (currData.connected) {
        portConnected.postMessage(currData)
      }
    }
  }
});


