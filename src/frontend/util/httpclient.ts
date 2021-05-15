/*
  httpclient.ts - HTTP client get and post implementation for Notes'n'Todos
  
  MIT license - see LICENSE file in Notes'n'Todos project root

  Copyright 2021 - Lars Ole Pontoppidan <contact@larsee.com>
*/

export default class HttpClient {
    private baseUrl:string;
  
    constructor(base_url:string) {
      this.baseUrl = base_url;
    }
  
    public get(url: string, params: object, callback: (success: boolean, response: string) => void) {
      url = this.baseUrl + url;
  
      let paramcount = 0;
      for (const [key, value] of Object.entries(params)) {
        url += (paramcount == 0) ? "?" : "&";
        url += encodeURIComponent(key) + "=" + encodeURIComponent(value);
        paramcount += 1;
      }
      
      let xmlhttp = new XMLHttpRequest();
      xmlhttp.onreadystatechange = function() { 
        if (xmlhttp.readyState == 4)
            callback(xmlhttp.status == 200, xmlhttp.responseText);
      }
      xmlhttp.open("GET", url);
      xmlhttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
      xmlhttp.send();
    }
  
    public postJson(url: string, obj: object, callback: (success: boolean, response: string) => void) {
      url = this.baseUrl + url;
      let xmlhttp = new XMLHttpRequest();
      xmlhttp.open("POST", url);
      xmlhttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8");  
      xmlhttp.onreadystatechange = function() { 
        if (xmlhttp.readyState == 4)
        callback(xmlhttp.status == 200, xmlhttp.responseText);
      }
      xmlhttp.send(JSON.stringify(obj));
    }
  }
