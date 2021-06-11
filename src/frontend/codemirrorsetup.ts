/*
  codemirrorsetup.ts - Configuration of CodeMirror v6 edit box for Notes'n'Todos
  
  MIT license - see LICENSE file in Notes'n'Todos project root

  Copyright 2021 - Lars Ole Pontoppidan <contact@larsee.com>
*/

import { drawSelection, highlightActiveLine, keymap } from '@codemirror/view';
import { EditorState, Prec, StateCommand } from '@codemirror/state';
import { history, historyKeymap } from '@codemirror/history';
import { indentOnInput, indentUnit } from '@codemirror/language';
import { lineNumbers } from '@codemirror/gutter';
import { defaultKeymap, indentMore, indentLess } from '@codemirror/commands';
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search';
import { rectangularSelection } from '@codemirror/rectangular-selection';
import { defaultHighlightStyle } from '@codemirror/highlight';
import { EditorView } from "@codemirror/view";
import { Line } from "@codemirror/text";
import { EditorSelection } from '@codemirror/state';

// Simple CodeMirror 6 setup for markdown editing and a modest js bundle size.
// lang-markdown was not added as a bundle size cost/benefit consideration.

// Four spaces indentation, line wrapping, theme with min and max widget height.
// Special function for toggling markdown checkboxes: "- [x]" bound to Ctrl-d.
// Tab and shift-tab indents or indets-less.

const Theme = EditorView.theme({
  "&": {
    fontSize: "10.5pt",
    border: "1px solid #c0c0c0"
  },
  ".cm-content": {
    fontFamily: "Menlo, Monaco, Lucida Console, monospace",
    minHeight: "200px"
  },
  ".cm-gutters": {
    minHeight: "200px"
  },
  ".cm-scroller": {
    overflow: "auto",
    maxHeight: "600px"
  }
});

function changeBySelectedLine(state:EditorState, f:(line:Line, change:any[], range:any) => void ) {
  let atLine = -1;
  return state.changeByRange(range => {
      let changes:any[] = [];
      for (let pos = range.from; pos <= range.to;) {
          let line = state.doc.lineAt(pos);
          if (line.number > atLine && (range.empty || range.to > line.from)) {
              f(line, changes, range);
              atLine = line.number;
          }
          pos = line.to + 1;
      }
      let changeSet = state.changes(changes);
      return { changes,
          range: EditorSelection.range(changeSet.mapPos(range.anchor, 1), changeSet.mapPos(range.head, 1)) };
  });
}

const codeMirrorToggleCheckbox:StateCommand = ({ state, dispatch }) => {
  // Create or toggle markdown style check boxes: "- [ ]" and "- [x]", respecting indentation,
  // for all selected lines:
  let changes = changeBySelectedLine(state, (line, changes, range) => {
    let indent = line.text.search(/\S|$/);
    // Detect markdown bullet
    if ((line.text.substring(indent, indent + 2) == "- ") || 
        (line.text.substring(indent, indent + 2) == "* ")) {
      // Toggle an existing checkbox
      if (line.text.substring(indent + 2, indent + 5) == "[ ]") {
        changes.push({from: line.from + indent + 3, to: line.from + indent + 4, insert: "x"});
      }
      else if (line.text.substring(indent + 2, indent + 5) == "[x]") {
        changes.push({from: line.from + indent + 3, to: line.from + indent + 4, insert: " "});
      }
      else {
        // Add new checkbox
        changes.push({from: line.from + indent + 2, to: line.from + indent + 2, insert: "[ ] "});
      }
    }
    else {
      // No bullet, add one with checkbox
      changes.push({from: line.from + indent, to: line.from + indent, insert: "- [ ] "});
    }
  });
  if (!changes.changes.empty) {
    dispatch(state.update(changes));
  }
  return true;
}

const CodeMirrorSetup = [
    lineNumbers(),
    history(),
    drawSelection(),
    EditorState.allowMultipleSelections.of(true),
    indentOnInput(),
    Prec.fallback(defaultHighlightStyle),
    rectangularSelection(),
    highlightActiveLine(),
    highlightSelectionMatches(),
    indentUnit.of("    "),
    EditorView.lineWrapping,
    Theme,
    keymap.of([
        ...defaultKeymap,
        ...searchKeymap,
        ...historyKeymap,
        { key: "Tab", run: indentMore, shift: indentLess },
        { key: "c-d", run: codeMirrorToggleCheckbox }
    ])
];

export { CodeMirrorSetup, codeMirrorToggleCheckbox };
