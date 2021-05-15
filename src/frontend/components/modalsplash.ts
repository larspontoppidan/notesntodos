/*
  modalsplash.ts - Modal splash widget for Notes'n'Todos
  
  MIT license - see LICENSE file in Notes'n'Todos project root

  Copyright 2021 - Lars Ole Pontoppidan <contact@larsee.com>
*/

const Prefix: string = "modalsplash-";

export default class ModalSplash {
    private mainElement: HTMLElement;
    private styleElement: HTMLElement;
    private contentDiv: HTMLElement;

    constructor() {
        this.styleElement = document.createElement('style');
        this.styleElement.innerHTML = `
  /* The Modal (background) */
  .${Prefix}main {
    display: none; /* Hidden by default */
    position: fixed; /* Stay in place */
    z-index: 1; /* Sit on top */
    left: 0;
    top: 0;
    width: 100%; /* Full width */
    height: 100%; /* Full height */
    overflow: auto; /* Enable scroll if needed */
    background-color: rgb(0,0,0); /* Fallback color */
    background-color: rgba(0,0,0,0.4); /* Black w/ opacity */
  }
  
  /* Modal Content/Box */
  .${Prefix}content {
    background-color: #fefefe;
    margin: 120px auto 50px auto;
    padding: 8px 16px 16px 16px;
    border: 1px solid #888;
    max-width: 900px;
  }
  
  /* The Close Button */
  .${Prefix}close {
    color: #aaa;
    float: right;
    font-size: 28px;
    font-weight: bold;
    line-height: 1;
  }
  
  .${Prefix}close:hover,
  .${Prefix}close:focus {
    color: black;
    text-decoration: none;
    cursor: pointer;
  }`;

        this.mainElement = document.createElement('div');
        this.mainElement.classList.add(`${Prefix}main`);
        this.mainElement.innerHTML = `
  <div class="${Prefix}content">
    <span class="${Prefix}close">&times;</span>
    <div></div>
  </div>
  `;
        this.contentDiv = this.mainElement.getElementsByTagName('div')[1];
    }

    public install(parent: HTMLElement, head: HTMLHeadElement) {
        head.appendChild(this.styleElement);
        parent.appendChild(this.mainElement);

        // When the user clicks anywhere outside of the modal, close it
        window.onclick = (event: MouseEvent) => {
            if (event.target == this.mainElement) {
                this.mainElement.style.display = "none";
            }
        };

        // Get the <span> element that closes the modal
        let span = <HTMLSpanElement>this.mainElement.getElementsByClassName(`${Prefix}close`)[0];

        // When the user clicks on <span> (x), close the modal
        span.onclick = () => {
            this.mainElement.style.display = "none";
        };
    }

    public showMessage(title: string, msg: string) {
        this.contentDiv.innerHTML = `<p><strong>${title}</strong></p><p>${msg}</p>`;
        this.mainElement.style.display = "block";
    }

    public showDiv(fn: (div: HTMLElement) => void) {
        this.contentDiv.innerHTML = "";
        fn(this.contentDiv);
        this.mainElement.style.display = "block";
    }

    public forceHide() {
        this.mainElement.style.display = "none";
    }
}

