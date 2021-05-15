/*
  statemgmt.ts - Cookie based state management for Notes'n'Todos
  
  MIT license - see LICENSE file in Notes'n'Todos project root

  Copyright 2021 - Lars Ole Pontoppidan <contact@larsee.com>
*/


// Utility

function utf8_to_b64(str:string):string {
	return window.btoa(unescape(encodeURIComponent(str)));
}
 
function b64_to_utf8(str:string):string {
	return decodeURIComponent(escape(window.atob(str)));
}


// The cookiePrefix is intended for versioning.
// Change to 'v2-', 'v3-', etc. when making incompatible changes to the state payload.

const cookiePrefix = "v1-";

export function stateLoadOrDefault(defaults: any) {
	let ret = defaults;
	let result = document.cookie.match(new RegExp('State=' + cookiePrefix + '([^;]+)'));
	if (result) {
		try {
			ret = JSON.parse(b64_to_utf8(result[1]));
			//console.log(ret);
		}
		catch(err) { 
		}
	}
	return ret;
}

export function stateSave(state: any) {
	//console.log(state);
    let date = new Date();
    date.setFullYear(date.getFullYear() + 1);
    let s = utf8_to_b64(JSON.stringify(state));
    document.cookie = "State=" + cookiePrefix + s + "; SameSite=Strict; expires=" + date.toUTCString();
}

export function stateErase() {
	document.cookie = "State=; expires=Thu, 01 Jan 1970 00:00:00 GMT";
}
