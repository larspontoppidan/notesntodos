/*
  app.ts - Notes'n'Todos frontend main application implementation
    
  MIT license - see LICENSE file in Notes'n'Todos project root

  CodeMirror v6 is used for the note edit box.
  No 3rd party platform is utilized in this front end.

  Copyright 2021 - Lars Ole Pontoppidan <contact@larsee.com>
*/

import Layout, { Button, OnePaneSection, TwoPaneSection, OnePaneGroup, TwoPaneGroup, fadeOutIn } from "./layout";
import HttpClient from "./util/httpclient";
import ModalSplash from "./components/modalsplash";
import CheckBox from "./components/checkbox";
import * as util from "./util/misc";

// --- CodeMirror imports

import { EditorState } from "@codemirror/basic-setup"
import { EditorView, ViewUpdate } from "@codemirror/view"
import { cursorLineDown } from "@codemirror/commands"
import { CodeMirrorSetup, codeMirrorToggleCheckbox } from "./codemirrorsetup";
import { stateLoadOrDefault, stateSave } from "./util/statemgmt";


// --- Note interface, as received from backend

interface INote {
  fullname: string;
  date: string;
  src: string | undefined;
  check_offsets: [number] | undefined;
  name: string;
  tags: [string];
  todos: [[string,number]];
  html: string;
}

// --- Saving notes

class SaveManager {
  private pending: Set<() => [number, any]>;
  private button: Button;
  private saveCallback;
  private button_visible: boolean = false;

  constructor(save_callback: (save_obj: object) => void) {
    this.saveCallback = save_callback;
    this.pending = new Set<() => [number, any]>();
    this.button = new Button("Save Changes", this.handleSaveClick);
    this.button.setVisible(false);
  }

  public getSaveButtonElement(): HTMLElement {
    return this.button.element;
  }

  private updateButton() {
    this.button.SetText("Save Changes (" + this.pending.size + ")");
    let visible = this.pending.size > 0;
    if (visible != this.button_visible) {
      this.button.setVisible(visible);
      if (visible) {
        // Make a fade out/in transition when the button is first shown, to highlight it:
        fadeOutIn(this.button.element, 500);
      }
      this.button_visible = visible;
    }
  }

  private handleSaveClick = () => {
    let to_save: [number, any][] = [];

    // Call all save callbacks and populate to_save array
    this.pending.forEach(function (fn: () => [number, any]) {
      to_save.push(fn());
    });

    // Sort the notes to save according to index
    to_save.sort(function (a: [number, any], b: [number, any]): number {
      return a[0] - b[0];
    });

    // Build json array with notes to save
    let notes = [];
    for (let i = 0; i < to_save.length; i++) {
      notes.push(to_save[i][1]);
    }

    this.saveCallback(notes);
  }

  public getPendingCount(): number {
    return this.pending.size;
  }

  public addPending(save_func: () => any) {
    if (!this.pending.has(save_func)) {
      this.pending.add(save_func);
      this.updateButton();
    }
  }

  public removePending(save_func: () => any) {
    if (this.pending.has(save_func)) {
      this.pending.delete(save_func);
      this.updateButton();
    }
  }

  public clear() {
    this.pending = new Set<() => any>();
    this.updateButton();
  }
}



// ---- New notes

class NewSection {
  public edit: EditWidget;
  public section: OnePaneSection;
  private index: number;
  private static allIndex: number = 0;

  constructor(section: OnePaneSection, tags_checked: string[]) {
    NewSection.allIndex += 1;
    this.index = NewSection.allIndex;

    let date_str = (new Date()).toISOString().substring(0, 10);
    let tags = util.joinStringArray(", ", tags_checked);
    let text = "date: " + date_str + "\ntags: " + tags + "\nname:\n\n";

    this.edit = new EditWidget(text, this.handleChange);
    this.edit.moveCursorDown(4);
    this.edit.element.classList.add("topmargin");

    this.section = section;
    
    section.center.appendChild(this.edit.element);
    section.buttons.appendChild(new Button("Toggle Todo", this.handleTodoClick).element);
    section.buttons.appendChild(new Button("Preview", this.handlePreviewClick).element);
    section.buttons.appendChild(new Button("Undo New", this.handleRemoveClick).element);
  }

  private handleTodoClick = (evt: Event) => {
    this.edit.toggleCheckBox();
  }

  private handleRemoveClick = (evt: Event) => {
    app.saveManager.removePending(this.saveCallback);
    this.section.remove();
  }

  private handlePreviewClick = (evt: Event) => {
    app.showPreviewSplash(this.edit.getValue());
  }

  private handleChange = (changes:boolean) => {
    if (changes) {
      app.saveManager.addPending(this.saveCallback);
    }
    else {
      app.saveManager.removePending(this.saveCallback);
    }
  }

  private saveCallback = (): [number, any] => {
    return [-this.index, { "src": this.edit.getValue() }];
  }
}

// --- Notes

enum MainNoteMode {
  Uninitialized = 0,
  Note,
  Todo,
  Edit
}

class MainNote {
  private section: TwoPaneSection;
  private editButton: Button;
  private todoButton: Button;
  private previewButton: Button;
  private revertButton: Button;
  private note: INote;
  private edit: EditWidget | undefined;
  
  private index: number;
  private static allIndex: number = 0;
  
  private section_todo: TwoPaneSection | undefined;


  constructor(section: TwoPaneSection, note: INote) {
    MainNote.allIndex += 1;
    this.index = MainNote.allIndex;
    this.section = section;
    this.note = note;
    this.editButton = new Button("Edit", this.handleEditClick);
    this.todoButton = new Button("Toggle Todo", this.handleTodoClick);
    this.revertButton = new Button("Undo Edit", this.handleRevertClick);
    this.previewButton = new Button("Preview", this.handlePreviewClick);

    // Initialize note section, but be invisible to begin with
    app.sectionSetupTitle(this.section, this.note.date, this.note.name);
    this.initNote();
    this.section.setVisible(true);
    section.setVisible(false);
  }

  public registerTodoSection(section_todo: TwoPaneSection) {
    this.section_todo = section_todo;

    // Initialize todo section, but be invisible to begin with
    app.sectionSetupTitle(this.section_todo, this.note.date, this.note.name, (evt: Event) => {
        this.scrollAndFlash();
    });
    app.sectionSetupBody(this.section_todo, this.note.tags, 
      this.makeTodosBody(this.note.todos));
    this.section_todo.setVisible(false);
  }

  public getTags(): string[] {
    return this.note.tags;
  }

  public getTodoCount() {
    return this.note.todos.length;
  }

  public setVisible(show_note: boolean, show_todo: boolean) {
    this.section.setVisible(show_note);
    if (this.section_todo) {
      this.section_todo.setVisible(show_todo);
    }
  }

  public handleNodeCheckedChange(index : number, value: boolean) {
    // Replace the character at the given index
    app.loadNoteSrc(this.note, () => {
      let s = this.note.src!;
      let offset = this.note.check_offsets![index]
      this.note.src = s.substring(0, offset) + (value ? "x" : " ") + s.substring(offset + 1);
      app.saveManager.addPending(this.saveCallback);
      this.revertButton.setVisible(true);
    });
  }

  private setNoteCheckValue(index: number, value: boolean):boolean {
    if (this.edit) {
      // In edit mode, this is not going to work
      return false
    }
    else {
      // Not in edit mode. Find the check widget and set new value
      let all = this.section.center.getElementsByTagName('input');
      all[index].checked = value;
    }

    return true
  }

  public setTodoCheckValue(index : number, value: boolean) {
    if (this.section_todo) {
      let inputs = this.section_todo.center.getElementsByTagName('input');
      for (let i = 0; i < inputs.length; i++) {
        if (Number(inputs[i].getAttribute('idx')) == index) {
          inputs[i].checked = value;
          break;
        }
      }
    }
  }

  private makeTodosBody(todos: [[string,number]]): HTMLElement {
    let div = util.createDiv("todolist");
    for (let i = 0; i < todos.length; i++) {
      let elem = document.createElement("p");
      let index = todos[i][1];
      let chk = new CheckBox(todos[i][0], false, (evt: Event) => {
        let checked = (<HTMLInputElement>evt.target).checked;
        if (!this.setNoteCheckValue(index, checked)) {
          // Couldn't update the check status, undo the toggling
          (<HTMLInputElement>evt.target).checked = !checked;
        } else {
          // It worked, handle new status of the check
          this.handleNodeCheckedChange(index, checked);
        }
      });
      chk.input.setAttribute("idx", index.toString());
      elem.appendChild(chk.element);
      div.appendChild(elem);
    };

    return div;
  }

  private initNote() {
    let notediv = app.makeBodyNote(this.note.html);
    let id = "note" + this.index.toString();
    notediv.id = id;
    app.noteIds.set(id, this);
    app.sectionSetupBody(this.section, this.note.tags, notediv, 
      [this.revertButton.element, this.editButton.element]);

    this.revertButton.setVisible(false);
    this.revertButton.SetText("Undo");
  }

  private initEdit() {
    this.edit = new EditWidget(this.note.src!, this.handleInputChange);
    this.edit.element.classList.add("topmargin");
    app.sectionSetupBody(this.section, this.note.tags, this.edit.element,
      [this.todoButton.element, this.previewButton.element, this.revertButton.element]);
    this.revertButton.SetText("Undo Edit");
    this.revertButton.setVisible(true);
    this.edit.moveCursorDown(4);
  }

  private handleTodoClick = (evt: Event) => {
    if (this.edit) {
      this.edit.toggleCheckBox();
    }
  }

  private handleEditClick = (evt: Event) => {
    app.loadNoteSrc(this.note, () => {
      this.section.animator.transitionSave();
      app.sectionEmptyBody(this.section);
      this.initEdit();
      this.section.animator.transitionDo();
    });
  }
  
  private handleRevertClick = (evt: Event) => {
    app.saveManager.removePending(this.saveCallback);
    this.note.src = undefined
    if (this.edit) {
      this.section.animator.transitionSave();
      app.sectionEmptyBody(this.section);
      this.initNote();
      this.edit = undefined;
      this.section.animator.transitionDo();
    }
    else {
      app.sectionEmptyBody(this.section);
      this.initNote();
    }

    if (this.section_todo) {
      // Reverting means all todos go back to unchecked
      let inputs = this.section_todo.center.getElementsByTagName('input');
      for (let i = 0; i < inputs.length; i++) {
        inputs[i].checked = false;        
      }
    }
  }
  
  private handlePreviewClick = (evt: Event) => {
    if (this.edit) {
      app.showPreviewSplash(this.edit.getValue());
    }
  }

  private handleInputChange = (changes:boolean) => {
    if (changes) {
      app.saveManager.addPending(this.saveCallback);
    }
  }

  public scrollAndFlash() {
    this.section.animator.scrollIntoView();
    this.section.animator.flash();
  }

  private saveCallback = (): [number, any] => {
    if (this.edit) {
      //console.log("save edit");
      return [this.index, { "src": this.edit.getValue(), "replace": this.note.fullname }];
    }
    else if (this.note.src) {
      //console.log("save src");
      // This happens if the note had checks clicked or unclicked 
      return [this.index, { "src": this.note.src, "replace": this.note.fullname }];
    }
    else {
      return [this.index, {}];
    }
  }
}

// ---- Todo check clicking  and transferring event to correct main note object

export function checkClick(obj:HTMLInputElement, index:number) {
  // Iterate up parents until the first div
  let p:HTMLElement | null = obj.parentElement;
  while (p) {
    if (p.localName == "div") {
      // The div's id should lookup to be the MainNote object:
      let note = app.noteIds.get(p.id);
      if (note) {
        note.handleNodeCheckedChange(index, obj.checked);
        note.setTodoCheckValue(index, obj.checked);
      }
      return;
    }
    p = p.parentElement;
  }
}

// ---- Tags system

class Tags {
  private allTags: Set<string> = new Set<string>();
  private checks: CheckBox[] = [];
  private btnNone: Button;
  private btnAll: Button;
  private changeCallback: () => void;

  constructor(change_callback: () => void) {
    this.btnNone = new Button("None", this.handleClickNone);
    this.btnAll = new Button("All", this.handleClickAll);    
    this.changeCallback = change_callback;
  }

  public getAllTagsCheck(): HTMLElement {
    return this.btnAll.element;
  }

  public getNoneTagsCheck(): HTMLElement {
    return this.btnNone.element;
  }

  public makeTagCheckbox(tag: string, checked: boolean, override_name?: string): HTMLElement {
    let name = override_name ? override_name : tag;
    let chk = CheckBox.makeTagVariant(name, checked, this.handleClickTag);
    chk.tag = tag;
    this.allTags.add(tag);
    this.checks.push(chk);
    return chk.element;
  }

  public getChecked(checked:boolean): string[] {
    let ret: string[] = [];
    for (let i = 0; i < this.checks.length; i++) {
      if (this.checks[i].getChecked() == checked) {
        ret.push(<string>this.checks[i].tag);
      }
    }
    return ret;
  }

  public getAll(): Set<string> {
    return this.allTags;
  }

  private handleClickAll = (evt: Event) => {
    for (let i = 0; i < this.checks.length; i++) {
      this.checks[i].setChecked(true);
    }
    this.changeCallback();
  }

  private handleClickNone = (evt: Event) => {
    for (let i = 0; i < this.checks.length; i++) {
      this.checks[i].setChecked(false);
    }
    this.changeCallback();
  }

  private handleClickTag = (evt: Event) => {
    this.changeCallback();
  }

  public selectOnlyOneTag(name:string) {
    for (let i = 0; i < this.checks.length; i++) {
      this.checks[i].setChecked(this.checks[i].tag == name);
    }
    this.changeCallback();
  }
}
// --- Editor

class EditWidget {
  private callback: (changes:boolean) => void;
  private editor:EditorView;
  public element:HTMLElement;

  constructor (initial_text: string, changes_callback: (changes:boolean) => void) {
    this.callback = changes_callback;
    this.element = document.createElement('div');

    this.editor = new EditorView({
      state: EditorState.create({
        doc: initial_text,
        extensions: [ 
          CodeMirrorSetup, 
          EditorView.updateListener.of((v:ViewUpdate) => {
            if (v.docChanged) {
              this.callback(true);
            }
          })
        ]
      }),
      parent: this.element
    });
  }

  public getValue():string {
    return this.editor.state.doc.toString();
  }

  public moveCursorDown(count:number) {
    setTimeout(() => {
      for (let i = 0; i < count; i++) {
        cursorLineDown(this.editor);
      }
    }, 50);
  }

  public toggleCheckBox() {
    codeMirrorToggleCheckbox( { state:this.editor.state , dispatch:this.editor.dispatch } );
  }
}

// --- Main app

declare var HEADER_LINKS: string[];

export function toggleShowTodos() {
  app.showTodos(!app.todosShown);
}


class App {
  private httpClient: HttpClient;

  private allNotes: MainNote[] = [];

  private ScrollTop = 0;
  private groupTags: OnePaneGroup;
  private groupNew: OnePaneGroup;
  private groupTodos: TwoPaneGroup;
  private groupNotes: TwoPaneGroup;
  private myTags: Tags;
  private splash: ModalSplash;

  public saveManager: SaveManager;
  private todoCount:number = 0;

  // public notesShown : boolean = false;
  public todosShown : boolean = false;
  private noteCount: number = 0;

  public noteIds = new Map<string, MainNote>();

  constructor(layout: Layout, splash: ModalSplash, http_client: HttpClient) {

    this.httpClient = http_client;
    this.splash = splash;
    this.saveManager = new SaveManager(this.handleSave);
    this.todoCount = 0;

    let blocks = [`Notes'n'Todos`];

    if (HEADER_LINKS && (HEADER_LINKS.length > 0)) {
      let links = [];
      let doc_url = window.location.href;
      for (let i = 0; i < HEADER_LINKS.length; i++) {
        let url = HEADER_LINKS[i][0];
        let name = HEADER_LINKS[i][1];
        if (doc_url.endsWith(url)) {
          links.push(`<strong>${name}</strong>`);
        }
        else {
          links.push(`<a href="${url}">${name}</a>`);
        }
      }
      let s = util.joinStringArray(" &ensp; ", links);
      blocks.push(`Notebooks:&ensp;
      <span style="font-size:90%">${s}
      </span>`);
    }

    layout.setHeader(blocks, [this.saveManager.getSaveButtonElement()]);

    this.groupTags = layout.makeOnePaneGroup(`Tags`);
    this.groupNew = layout.makeOnePaneGroup(`New`);
    this.groupTodos = layout.makeTwoPaneGroup(`Todos`, "");
    this.groupNotes = layout.makeTwoPaneGroup(`Notes`, "");
    this.groupNew.setStickyBottom(new Button("New Note", this.handleNewClick).element);

    this.myTags = new Tags(this.tagsChangeHandler);
  }

  public load() {
    let state:any = stateLoadOrDefault({});
    let not_checked = new Set<string>();
    try {
      not_checked = new Set<string>(state.ntags);
    }
    catch(err) { 
		}
    
    this.loadContents(not_checked, true);
  }

  private reload = () => {
    this.ScrollTop = document.documentElement.scrollTop;

    // Store previous state of tags checked, then reinstatiate Tags obj
    let tags_not_checked = new Set(this.myTags.getChecked(false));

    this.myTags = new Tags(this.tagsChangeHandler);

    this.saveManager.clear();
    this.groupNew.clear();
    this.loadContents(tags_not_checked, false);
  }

  private loadContents(tags_not_checked: Set<string>, first_load:boolean) {
    this.httpClient.get("api/gettags", {}, (success, response) => {
      if (success) {
        let elemp = document.createElement("p");
        elemp.appendChild(this.myTags.getAllTagsCheck());
        elemp.appendChild(this.myTags.getNoneTagsCheck());

        this.groupTags.clear();
        this.groupTags.addSection().center.appendChild(elemp);

        elemp = document.createElement("p");
        let chk = this.myTags.makeTagCheckbox("", !tags_not_checked.has(""), "(No tags)");
        elemp.appendChild(chk);

        let obj = JSON.parse(response);
        for (let i = 0; i < obj.tags.length; i++) {
          let checked = !tags_not_checked.has(obj.tags[i]);
          let chk = this.myTags.makeTagCheckbox(obj.tags[i], checked);          
          elemp.appendChild(chk);
          elemp.appendChild(document.createTextNode(" "));
        }

        this.groupTags.addSection().center.appendChild(elemp);

        this.groupNotes.clear();
        this.groupTodos.clear();
        
        this.allNotes = [];

        this.httpClient.get("api/getnotes", { 'html': 1, 'todos': 1 }, (success, response) => {
          if (success) {
            let todo_count = 0;
            let obj = JSON.parse(response);
            for (let i = 0; i < obj.notes.length; i++) {
              let note = obj.notes[i];
              let mainnote: MainNote = new MainNote(this.groupNotes.addSection(), note);
              if (mainnote.getTodoCount() > 0) {
                todo_count += mainnote.getTodoCount();
                mainnote.registerTodoSection(this.groupTodos.addSection());
              }
              this.allNotes.push(mainnote);
            }

            this.refilter();

            document.documentElement.scrollTop = this.ScrollTop;
          }
          else {
            this.splash.showMessage("Network error: Couldn't load notes", response);
          }
        });
      }
      else {
        this.splash.showMessage("Network error: Couldn't load tags", response);
      }
    });
  }

  private handleSave = (obj: object) => {
    this.splash.forceHide();
    // Handle the save function
    this.httpClient.postJson("api/savenotes", obj, (success, response) => {
      if (success) {
        this.reload();
      }
      else {
        this.splash.showMessage("Couldn't save note(s)", response);
      }
    });
  }

  private handleNewClick = (evt: Event) => {
    let section = this.groupNew.addSection();
    new NewSection(section, this.myTags.getChecked(true));
  }

  private handleTagCardClick = (evt: Event) => {
    let tag = (<HTMLElement>evt.target).innerText;
    this.myTags.selectOnlyOneTag(tag);
    window.scroll(0, 0);
  }

  public loadNoteSrc(note: INote, done_callback: () => void) {
    // Fetch src for a note
    if (note.src) {
      //console.log("Already fetched source");
      done_callback();
    }
    else {
      //console.log("Fetching source");
      this.httpClient.get("api/getnote", { "fullname": note.fullname, "src": 1 }, (success, response) => {
        if (success) {
          let obj = JSON.parse(response);
          note.src = obj.note.src;
          note.check_offsets = obj.note.check_offsets
          done_callback();
        }
        else {
          this.splash.showMessage("Network error: Couldn't load note for editing", response);
        }
      });
    }
      
  }

  private refilter() {
    let checked = new Set(this.myTags.getChecked(true));
    let include_empty = checked.has("");
    this.todoCount = 0;
    this.noteCount = 0;

    for (let i = 0; i < this.allNotes.length; i++) {
      let tags = this.allNotes[i].getTags();
      let show = (tags.length == 0) ? include_empty : util.arraySetIntersects(tags, checked);
      this.allNotes[i].setVisible(show, this.todosShown && show);
      if (show) {
        this.noteCount += 1;
        this.todoCount += this.allNotes[i].getTodoCount();
      }
    }

    this.updateTodoHeading();   
  }

  private tagsChangeHandler = () => {
    stateSave({"ntags" : this.myTags.getChecked(false)});
    this.refilter();
  }

  private updateTodoHeading() {
    let show_hide = this.todosShown ? "Hide" : "Show";
    this.groupTodos.changeHeading(`Todos (${this.todoCount})`, 
      `<a href="javascript:void(0)" onclick="nnt.toggleShowTodos();" style="font-size:13pt;color: #4f00f0;">${show_hide}</a>`);
  }

  public showTodos(show:boolean) {
    this.todosShown = show;
    this.refilter();
  }

  public showPreviewSplash(src: string) {
    let dict = { "src": src };
    this.httpClient.postJson("api/previewnote", dict, (success, response) => {
      if (success) {
        let obj = JSON.parse(response);
        let note = obj.note;
        this.splash.showDiv((div: HTMLElement) => {
          let section = TwoPaneSection.makeSimpleStandalone(div);
          this.sectionSetupTitle(section, note.date, note.name);
          this.sectionSetupBody(section, note.tags, this.makeBodyNote(note.html), []);
        });
      }
      else {
        this.splash.showMessage("Couldn't show preview", response);
      }
    });
  }

  // --- Html helper functions

  public sectionSetupTitle(section: TwoPaneSection, date: string, name: string, 
                           click_handler? : (this: HTMLElement, ev: MouseEvent) => any) {

    section.date.appendChild(util.createElementText('p', date, 'datep'));
    if (click_handler) {
      section.date.addEventListener("click", click_handler);
      section.date.style.cursor = "pointer";
    }
    if (name.length > 0) {
      section.title.appendChild(util.createElementText('h2', name, 'notename'));
      if (click_handler) {
        section.title.addEventListener("click", click_handler);
        section.title.style.cursor = "pointer";
      }
    }
  }

  public sectionEmptyBody(section: TwoPaneSection)
  {
    section.center.innerHTML = "";
    section.buttons.innerHTML = "";    
  }

  public sectionSetupBody(section: TwoPaneSection, tags: string[], body: HTMLElement, buttons?: HTMLElement[]) {
    if (tags.length > 0) {
      let tagsdiv = util.createDiv("tagsdiv");
      let tagsp = util.createElementText('p', "Tags: ");
      for (let i = 0; i < tags.length; i++) {
        let card = util.createElementText('span', tags[i], 'tagcard');
        card.addEventListener("click", this.handleTagCardClick);
        tagsp.appendChild(card);
        tagsp.appendChild(document.createTextNode(" "));
      }
      tagsdiv.appendChild(tagsp);
      section.center.appendChild(tagsdiv);
    }
    section.center.appendChild(body);
    if (buttons !== undefined) {
      for (let i = 0; i < buttons.length; i++) {
        section.buttons.appendChild(buttons[i]);
      }
    }
    section.render();
  }


  public makeBodyNote(html: string) {
    let div = util.createDiv("note");
    div.innerHTML = html;
    if (div.childNodes.length > 0) {
      (<HTMLElement>div.childNodes[0]).style.marginTop = "8px";
    }
    return div;
  }


}


// --- Global vars and main init

var app: App;

function init() {
  let layout = new Layout();
  let splash = new ModalSplash();

  // Setup checkbox to use css names matching those generated in the note markdown:
  CheckBox.install(document.head, "task-list-control", "task-list-indicator");

  app = new App(layout, splash, new HttpClient(util.stripUrlFragment(document.URL)));

  splash.install(document.body, document.head);

  app.load();

  layout.install(document.body, document.head);

  window.onbeforeunload = function () {
    if (app.saveManager.getPendingCount() > 0) {
      return 'There are saves pending';
    }
    else {
      return null;
    }
  };
}

init();
