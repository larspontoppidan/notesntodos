/*
  misc.ts - Utility functions for Notes'n'Todos
  
  MIT license - see LICENSE file in Notes'n'Todos project root

  Copyright 2021 - Lars Ole Pontoppidan <contact@larsee.com>
*/


export function arraySetIntersects(arr: string[], set: Set<string>): boolean {
    for (let i = 0; i < arr.length; i++) {
        if (set.has(arr[i])) {
            return true;
        }
    }
    return false;
}

export function stripUrlFragment(url: string): string {
    if (url.indexOf("#") > 0) {
        return url.slice(0, url.indexOf("#"));
    }
    return url;
}

export function joinStringArray(seperator: string, arr: string[]) {
    let s = "";
    for (let i = 0; i < arr.length; i++) {
        if (s.length > 0) s += seperator;
        s += arr[i];
    }
    return s;
}

export function createElementText(element: string, text: string, cls?: string) {
    let elem: HTMLElement = document.createElement(element);
    elem.innerHTML = text;
    if (cls !== undefined) {
        elem.classList.add(cls);
    }
    return elem;
}

export function createDiv(cls?: string): HTMLElement {
    let elem: HTMLElement = document.createElement("div");
    if (cls) {
        elem.classList.add(cls);
    }
    return elem
}

export function createAppendDiv(parent:HTMLElement, cls?: string) : HTMLElement {
    let elem: HTMLElement = document.createElement("div");
    if (cls) {
        elem.classList.add(cls);
    }
    parent.appendChild(elem);
    return elem
}

export function createAppendElement(parent:HTMLElement, element:string, cls?: string) : HTMLElement {
    let elem: HTMLElement = document.createElement(element);
    if (cls) {
        elem.classList.add(cls);
    }
    parent.appendChild(elem);
    return elem
}

export function createElementCls(element: string, cls: string) : HTMLElement {
    let elem: HTMLElement = document.createElement(element);
    elem.classList.add(cls);
    return elem
}

export function createAppendText(parent:HTMLElement, element: string, text?: string, cls?: string) {
    let elem: HTMLElement = document.createElement(element);
    if (text) {
        elem.innerHTML = text;
    }
    if (cls) {
          elem.classList.add(cls);
    }
    parent.appendChild(elem);
    return elem;
}

export function insertAfter(ref_element:HTMLElement, new_element:HTMLElement) {
    ref_element.parentNode!.insertBefore(new_element, ref_element.nextSibling);
}

export function insertBefore(ref_element:HTMLElement, new_element:HTMLElement) {
    ref_element.parentNode!.insertBefore(new_element, ref_element);
}
