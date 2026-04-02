// ─── Ghost Cursor Widget ──────────────────────────────────────────────────────
// Extracted from App.tsx — CodeMirror decorations for the ghost target cursor.

import { WidgetType, Decoration, EditorView } from '@codemirror/view';
import type { DecorationSet } from '@codemirror/view';
import { StateEffect, StateField } from '@codemirror/state';

export class GhostCursorWidget extends WidgetType {
  toDOM() {
    const el = document.createElement('span');
    el.className = 'cm-ghost-cursor-widget';
    return el;
  }
  ignoreEvent() { return true; }
}

export const setGhostTarget = StateEffect.define<{ row: number; col: number } | null>();

export const ghostCursorField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(deco, tr) {
    deco = deco.map(tr.changes);
    for (const effect of tr.effects) {
      if (!effect.is(setGhostTarget)) continue;
      if (!effect.value) return Decoration.none;
      const { row, col } = effect.value;
      const lineNo = row + 1;
      if (lineNo > tr.state.doc.lines) return Decoration.none;
      const line = tr.state.doc.line(lineNo);
      const pos  = Math.min(line.from + col, line.to);
      return Decoration.set([
        Decoration.widget({
          widget: new GhostCursorWidget(),
          side: 0,
        }).range(pos),
      ]);
    }
    return deco;
  },
  provide: (f) => EditorView.decorations.from(f),
});
