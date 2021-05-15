/*
  checkbox.ts - Check box widget for Notes'n'Todos
  
  MIT license - see LICENSE file in Notes'n'Todos project root

  Copyright 2021 - Lars Ole Pontoppidan <contact@larsee.com>
*/

function createElementCls(element: string, cls: string) : HTMLElement {
    let elem: HTMLElement = document.createElement(element);
    elem.classList.add(cls);
    return elem
}


export default class CheckBox {
    private static CssControl:string;
    private static CssIndicator:string;
	
	public element:HTMLElement;
	public tag:any;
	public input:HTMLInputElement;

    public static install(head: HTMLHeadElement, css_control:string, css_indicator:string) {
		CheckBox.CssControl = css_control;
		CheckBox.CssIndicator = css_indicator;
		
        let style = document.createElement('style');
        style.innerHTML = `
.${CheckBox.CssControl} {
	display: inline;
	position: relative;
	padding: 2px 0 2px 31px;
	margin-left: 30px;
	line-height: 32px;
	cursor: pointer;
	text-align: left;
	-webkit-user-select: none;
	-moz-user-select: none;
	-ms-user-select: none;
	user-select: none;
}

.${CheckBox.CssControl} input {
	position: fixed;
	margin: 5px 0;
	opacity: 0;
	cursor: pointer;
}

.${CheckBox.CssIndicator} {
	position: absolute;
	top: 50%;
	transform: translateY(-50%);
	left: 0;
	height: 18px;
	width: 18px;
	background-color: #eee;
	border: 2px solid #555;
}

.${CheckBox.CssControl}:hover input ~ .${CheckBox.CssIndicator} {
	box-shadow: 0 0 8px rgba(0, 0, 0, 0.6);
	transition-duration: 0.1s;
}

.${CheckBox.CssIndicator}:after {
	content: "";
	position: absolute;
	display: none;
}

.${CheckBox.CssControl} input:checked ~ .${CheckBox.CssIndicator}:after {
	display: block;
}

.${CheckBox.CssControl} .${CheckBox.CssIndicator}:after {
	left: 6px;
	top: 2px;
	width: 4px;
	height: 9px;
	border: solid black;
	border-width: 0 3px 3px 0;
	-webkit-transform: rotate(45deg);
	-ms-transform: rotate(45deg);
	transform: rotate(45deg);
}
`;
        head.appendChild(style);
	}
	

    constructor(text: string, value: boolean, click_callback?: (this: any, ev: Event) => any) {
        this.input = document.createElement('input')
        this.input.type = 'checkbox';
        this.input.checked = value;
        if (click_callback !== undefined) this.input.addEventListener('input', click_callback);
        this.element = createElementCls("label", CheckBox.CssControl);
        this.element.innerHTML = text;
        this.element.appendChild(this.input);
        this.element.appendChild(createElementCls("span", CheckBox.CssIndicator));
	}

	public static makeTagVariant(text: string, value: boolean, click_callback?: (this: any, ev: Event) => any) {
		let chkbox = new CheckBox(text, value, click_callback);
		chkbox.element.style.whiteSpace = "nowrap";
		chkbox.element.style.margin = "0 30px 0 0";
		return chkbox
	}
	
	public getChecked():boolean {
		return this.input.checked;
	}

	public setChecked(value:boolean) {
		this.input.checked = value;
	}

}

