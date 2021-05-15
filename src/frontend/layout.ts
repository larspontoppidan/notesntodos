/*
  layout.ts - Frontend layout implementation for Notes'n'Todos
  
  MIT license - see LICENSE file in Notes'n'Todos project root

  Copyright 2021 - Lars Ole Pontoppidan <contact@larsee.com>
*/


import * as util from "./util/misc";

export function fadeIn(element: HTMLElement, duration_ms: number) {
    element.style.display = '';
    element.style.opacity = '0';
    // The update happens every 20 ms, 50 times / second, 
    // so to achieve a 1000 ms duration would require a step of 0.02, 
    let step: number = 20.0 / duration_ms;
    let opacity: number = 0.0;
    let tick = function () {
        opacity += step;
        if (opacity < 1) {
            element.style.opacity = String(opacity);
            setTimeout(tick, 20);
        }
        else {
            element.style.opacity = '1';
        }
    };
    tick();
}

export function fadeOutIn(element: HTMLElement, duration_ms: number) {
    element.style.display = '';
    element.style.opacity = '0';
    // The update happens every 20 ms, 50 times / second, 
    // so to achieve a 1000 ms duration would require a step of 0.02, 
    let step: number = 20.0 / duration_ms;
    let opacity: number = 0.0;
    let tick = function () {
        opacity += step;
        if (opacity < 1) {
            element.style.opacity = String(1 - opacity);
        }
        else if (opacity < 2) {
            element.style.opacity = String(opacity - 1);
        }
        if (opacity < 2) {
            setTimeout(tick, 20);
        }
        else {
            element.style.opacity = '1';
        }
    };
    tick();
}

// --- Button

export class Button {
    public element: HTMLElement;

    constructor(text: string, func: (this: HTMLElement, ev: MouseEvent) => any) {
        this.element = util.createElementCls('button', 'btn');
        this.element.addEventListener('click', func, false);
        this.element.innerHTML = text;
    }

    public SetText(text: string) {
        this.element.innerHTML = text;
    }

    public setVisible(visible: boolean) {
        this.element.style.display = visible ? "" : "none";
    }
}

// --- Transition animations

export class Animator {
    private div: HTMLElement;
    private oldX: number = 0;
    private oldY: number = 0;
    private oldHeight: number = 0;

    constructor(div: HTMLElement) {
        this.div = div;
    }

    public scrollIntoView() {
        this.div.scrollIntoView({
            behavior: 'auto',
            block: 'center',
            inline: 'center'
        });
    }

    public flash() {
        fadeIn(this.div, 1000);
    }

    public transitionSave() {
        this.oldX = window.scrollX;
        this.oldY = window.scrollY;
        this.oldHeight = this.div.getBoundingClientRect().height;
    }

    public transitionDo() {
        let new_height = this.div.getBoundingClientRect().height;
        window.scroll(this.oldX, this.oldY + (new_height - this.oldHeight));

        if (this.div.getBoundingClientRect().top < 0) {
            this.div.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
                inline: 'center'
            });
        }
    }
}

/*
The layout consists of:
  __________________________________________
 |__Sticky header___________________________|

  
     Group
   ________________________________________

     Group
   ________________________________________

     Group
   ________________________________________


Each group can be either OnePane or TwoPane:

OnePane:
--------

[ header ]            [ section ]
<s12de               ><  s3d           >
                      [ section ]
<s12de               ><  s3d           >
                      [ section ]
                     
                      [ bottom section ]

 ___________________________________________________
<----  section                                   ----->

    
TwoPane:
--------

sub sections:
-s1-- -----s2------   --s3---------

[ header ]
<----  sfull                                   ----->
      [ date ]        [ title ]
<s1d-><  s2          ><  s3a           >
                      [ center ]
<s12de               ><  s3d           >
                             [ buttons ]
<---   s123de                        -->                    
 ___________________________________________________


      [ date ]        [ center  ]
<s1d-><  s2e         ><  s3d           >

                             [ buttons ]
<---   s123de                        -->                    
 ___________________________________________________

section  display:flex
s1d
s12de
s123de
s2
s2e
s3d



*/

export default class Layout {

    private style: HTMLElement;
    private header: HTMLElement;
    private header2: HTMLElement;
    private main: HTMLElement;

    constructor() {
        this.header = util.createDiv("header");
        this.header2 = util.createDiv("header2");

        this.main = util.createDiv("main");
        this.style = document.createElement('style');

        this.style.innerHTML = `

  .header {
    overflow: hidden;
    position: fixed; /* Set the navbar to fixed position */
    top: 0; /* Position the navbar at the top of the page */
    width: 100%; /* Full width */
    left: 0;    
    background-color: #fff;
    border-bottom: 1px solid #888;
    z-index: 5000;
    min-height: 40px;
    /* display: flex; */
    /* flex-wrap: wrap; */ 
    /* align-items: center; */
    box-shadow: 0 2px 4px -1px rgba(0,0,0,0.25);
  }

  .header2 {
    max-width: 1131px;
    display: flex;
    flex-wrap: wrap;
  }
  
  .headerblock {
    margin: 6px;
  }

  .headerblock a {
    color: #4f00f0;
  }

  .headerblock:last-of-type {
    text-align:right;
    flex-grow: 1;
  }
  
  .headerblock p {
      margin: 5px 8px;
  }
  
  .group {
    border-bottom: 1px solid;
    padding-bottom: 15px;
    margin-bottom: 15px;
  }

  /* this really belongs in app.ts */

  .notename {
    margin: 6px 0 3px -2px;
    font-size: 18pt;
    color: #888;
  }
  
  .datep {
    font-size: 15pt;
    font-weight: bold;
    margin: 9px 0 0 0;    
  }

  .tagsdiv p {
    margin: 5px 0 0 0;
  }
  
  .tagcard {
    padding: 3px 5px;
    white-space: nowrap;
    color: #4f00f0;
    background-color: #f7f7f9;
    border: 1px solid #ccc;
    border-radius: 5px;
    margin: 4px;
    line-height: 32px;
    cursor: pointer;
  }

  .note {
    display: inline-block;
    width: 100%;
    min-height: 80px;
    margin: 10px 0 0 0;
    background-color:rgb(244, 244, 244);
    padding: 0 12px;
    box-sizing: border-box;
    border: 1px solid #ccc;
    overflow: auto;
  }

  .topmargin {
    margin: 10px 0 0 0;
  }

  button {
    margin: 0;
    padding: 6px 22px;
    border: 1px solid #c0c0c0;
    border-radius: 4px;
    background: linear-gradient(#fdfdfd, #e0e0e0);
    color: #000;
    font-size: 11pt;
    cursor: pointer;
    min-width: 100px;
  }

  button + button {
      margin-left: 12px;
  }

  button:hover {
    filter: brightness(90%);
  }

  button:focus {
    outline: none;
    box-shadow: none;
  }

   .main {
        margin: 0 25px;
    }

    .wrap {
        flex-wrap: wrap;
    }

    .section {
        display:flex;
    }

    .s1d {
        height: min-content;
        max-width: 80px;
        flex-grow: 1;
    }

    .s2 {
        width: 120px;
        height: min-content;
        flex: 0 0 auto;
    }

    .s2e {
        width: 120px;
        height: min-content;
    }

    .s12de {
        height: min-content;
        max-width: 200px;
        flex-grow: 1;
    }

    .s3a {
        width: 900px;
    }

    .s3d {
        width: 900px;
    }

    .s123de {
        max-width: 1100px;
        flex-grow: 1;
    }

      @media only screen and (max-width: 1080px) {
        .s1d {
            width: 0px;
            flex-grow: 0;
        }
        .s3a {
            flex: 1;
            width: unset;
        }
        .s3d {
            flex: 1;
            width: unset;
            min-width: 200px;
            max-width: 900px;
        }
        .s12de {
            max-width: unset;
            width: 120px;
            flex-grow: 0;
        }
      }

      @media only screen and (max-width: 850px) {
        .s2e {
            flex-basis: 100%;
        }
        .s12de {
            flex-basis: 100%;
        }
        .main {
            margin: 0 15px;
        }
    }

    .sbuttons {
        text-align:right;
    }

    .sbuttons * {
        margin-top: 10px;
    }
        `;
    }

    private onResize = () => {
        this.main.style.marginTop = (this.header.getBoundingClientRect().height + 10).toString() + "px";
    }

    public install(body: HTMLElement, head: HTMLHeadElement) {
        head.appendChild(this.style);
        body.appendChild(this.header);
        this.header.appendChild(this.header2);
        body.appendChild(this.main);
        window.onresize = this.onResize;
        this.onResize();
    }

    public setHeader(blocks: string[], buttons: HTMLElement[]) {
        this.header2.innerHTML = "";
        for (let i = 0; i < blocks.length; i++) {
            let div = util.createAppendDiv(this.header2, "headerblock");
            div.innerHTML = "<p>" + blocks[i] + "</p>";
        }

        let buttonsdiv = util.createAppendDiv(this.header2, "headerblock");
        for (let i = 0; i < buttons.length; i++) {
            buttonsdiv.appendChild(buttons[i]);
        }
    }

    public makeTwoPaneGroup(heading_left: string, heading_right: string): TwoPaneGroup {
        let elem = util.createAppendDiv(this.main, "group");

        //elem.classList.add("bordertop");
        return new TwoPaneGroup(elem, heading_left, heading_right);
    }

    public makeOnePaneGroup(heading_html: string): OnePaneGroup {
        let elem = util.createAppendDiv(this.main, "group");

        return new OnePaneGroup(elem, heading_html);
    }
};

export class TwoPaneGroup {
    private div: HTMLElement;
    private heading: HTMLElement;
    private heading_left: HTMLElement;
    private heading_right: HTMLElement;
    private sectionsVisible: Set<TwoPaneSection>;

    constructor(div: HTMLElement, heading_left: string, heading_right: string) {
        this.div = div;
        this.heading = util.createAppendDiv(this.div, "section");
        this.heading_left = util.createAppendDiv(this.heading, "s12de");
        this.heading_right = util.createAppendDiv(this.heading, "s3d");
        //this.heading_right.style.textAlign = "right";
        this.heading_right.style.paddingTop = "16px";
        this.heading_left.innerHTML = `<h1>${heading_left}</h1>`;
        this.heading_right.innerHTML = heading_right;
        this.sectionsVisible = new Set<TwoPaneSection>();
        // this.heading.classList.add("border");
    }

    private updateVisible = (section: TwoPaneSection, visible: boolean) => {
        // The heading should only have a border if there are no other sections:
        if (visible) {
            this.sectionsVisible.add(section);
        }
        else {
            this.sectionsVisible.delete(section);
        }
        //if (this.sectionsVisible.size > 0) {
        //    this.heading.classList.remove("border");
        //} else {
        //    this.heading.classList.add("border");
        //}
    }

    public changeHeading(heading_left: string, heading_right: string) {
        this.heading_left.innerHTML = `<h1>${heading_left}</h1>`;
        this.heading_right.innerHTML = heading_right;
    }

    public clear() {
        this.div.innerHTML = "";
        this.div.appendChild(this.heading);
        this.sectionsVisible = new Set<TwoPaneSection>();
        // this.heading.classList.add("border");
    }

    public addSection(): TwoPaneSection {
        let div: HTMLElement = util.createAppendDiv(this.div, "section");
        //this.heading.classList.remove("border");
        let section = new TwoPaneSection(div, this.updateVisible);
        //section.addBorder();
        return section;
    }
}

export class TwoPaneSection {
    private updateVisible;
    private div1: HTMLElement;
    private div2?: HTMLElement;
    private div3: HTMLElement;

    public date: HTMLElement;
    public title: HTMLElement;
    public center: HTMLElement;
    public buttons: HTMLElement;

    public animator: Animator;

    private rendered = false;
    private simple = false;

    public static makeSimpleStandalone(div: HTMLElement): TwoPaneSection {
        let div_: HTMLElement = util.createAppendDiv(div, "section");
        div.style.maxWidth = "900px";
        let ret = new TwoPaneSection(div_);
        ret.simple = true;
        return ret
    }

    constructor(div: HTMLElement, update_visible?: (section: TwoPaneSection, visible: boolean) => void) {
        this.updateVisible = update_visible;
        this.div1 = div;

        util.createAppendDiv(this.div1, "s1d");
        this.date = util.createAppendDiv(this.div1);

        this.center = util.createDiv("s3d");
        this.title = util.createDiv("s3a");

        this.div3 = util.createDiv("section");
        this.buttons = util.createAppendDiv(this.div3, "s123de");
        this.buttons.classList.add("sbuttons");

        util.insertAfter(this.div1, this.div3);

        this.animator = new Animator(this.center);
    }

    public addBorder() {
        //this.div3.classList.add("border");
    }

    public render() {
        if (this.rendered) {
            return;
        }
        if (this.simple) {
            // Title goes on first section
            this.div1.appendChild(this.title);
            // Date is fixed size
            this.date.classList.add("s2");
            // We'll need another section for body, but skip the indentation div
            this.div2 = util.createDiv("section");
            this.div2.appendChild(this.center);
            util.insertAfter(this.div1, this.div2);
        }
        else if (this.title.hasChildNodes()) {
            // Title goes on first section
            this.div1.appendChild(this.title);
            // Date is fixed size
            this.date.classList.add("s2");

            // We'll need another section for body
            this.div2 = util.createDiv("section");
            this.div2.classList.add("wrap");
            util.createAppendDiv(this.div2, "s12de");
            this.div2.appendChild(this.center);
            util.insertAfter(this.div1, this.div2);
        }
        else {
            // No title, put center in first section
            this.div1.appendChild(this.center);
            this.div1.classList.add("wrap");
            this.date.classList.add("s2e");
        }
        this.rendered = true;
    }

    public setVisible(value: boolean) {
        this.div1.style.display = value ? "" : "none";
        if (this.div2) this.div2.style.display = value ? "" : "none";
        this.div3.style.display = value ? "" : "none";
        if (this.updateVisible) {
            this.updateVisible(this, value);
        }
    }
}

export class OnePaneGroup {

    private div: HTMLElement;
    private section: HTMLElement;
    private center: HTMLElement;
    private bottom: HTMLElement | undefined;

    constructor(div: HTMLElement, heading_html: string) {
        this.div = div;
        this.section = util.createAppendDiv(this.div, "section");
        this.section.classList.add("wrap");
        let left = util.createAppendDiv(this.section, "s12de");
        util.createAppendText(left, "h1", heading_html);
        this.center = util.createAppendDiv(this.section, "s3d");
        //this.center.classList.add("columnflex");
        //this.section.classList.add("bordertop");

        //if (bottom_div) {
        // let section = util.createAppendDiv(this.div, "section");
        // section.classList.add("wrap");
        // util.createAppendDiv(section, "s12de");
        // this.bottom = util.createAppendDiv(section, "s3d");
        //section.classList.add("border");
        //}
        //else {
        //this.section.classList.add("border");
        //}
    }

    public setStickyBottom(bottom_div: HTMLElement) {
        bottom_div.style.marginTop = "11px";
        this.bottom = bottom_div;
        this.center.appendChild(bottom_div);
    }

    public clear() {
        this.center.innerHTML = "";
        if (this.bottom) {
            this.center.appendChild(this.bottom);
        }
    }

    public addSection(): OnePaneSection {
        let div: HTMLElement = document.createElement("div");
        if (this.bottom) {
            this.center.insertBefore(div, this.bottom);
        }
        else {
            this.center.appendChild(div);
        }
        let section = new OnePaneSection(div, this);
        return section;
    }

    public removeSection(section: OnePaneSection) {
        this.center.removeChild(section.div);
    }
}


export class OnePaneSection {
    public div: HTMLElement;

    public center: HTMLElement;
    public buttons: HTMLElement;

    private parent: OnePaneGroup;

    constructor(div: HTMLElement, parent: OnePaneGroup) {
        this.parent = parent;
        this.div = div;
        this.center = util.createAppendDiv(this.div);
        this.buttons = util.createAppendDiv(this.div);
        this.buttons.classList.add("sbuttons");
    }

    public remove() {
        this.parent.removeSection(this);
    }

}

