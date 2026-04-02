// ─── Coordinate Mapping Utilities ────────────────────────────────────────────
// Pure, side-effect-free helpers that translate logical (row, col) positions
// into pixel coordinates and report the current editor viewport.  Used for
// debugging and any future overlay features (e.g. animated cursor trail).
//
// All functions silently return null / empty ranges instead of throwing when
// the view or position is out-of-bounds — callers treat null as "not visible".

import type { EditorView } from '@codemirror/view';

export interface PixelOffset {
  x: number;  // left edge of the character in viewport coordinates
  y: number;  // top  edge of the character in viewport coordinates
}

export interface ViewportInfo {
  startLine: number;  // 0-indexed first visible line
  endLine:   number;  // 0-indexed last  visible line
}

/**
 * Returns the pixel position of the character at (row, col) within the
 * CodeMirror EditorView's coordinate space.
 *
 * - `row` and `col` are 0-indexed logical positions.
 * - Returns `null` if the position is outside the document or not currently
 *   rendered (scrolled out of the virtual viewport).
 */
export function getPixelOffset(
  view:  EditorView,
  row:   number,
  col:   number,
): PixelOffset | null {
  const lineNo = row + 1;                        // CM6 uses 1-indexed lines
  if (lineNo < 1 || lineNo > view.state.doc.lines) return null;

  const line = view.state.doc.line(lineNo);
  const pos  = Math.min(line.from + col, line.to);

  // coordsAtPos returns null when the position is scrolled off-screen
  const coords = view.coordsAtPos(pos);
  if (!coords) return null;

  return { x: coords.left, y: coords.top };
}

/**
 * Returns the range of lines currently visible in the editor's scroll
 * viewport (0-indexed, inclusive on both ends).
 *
 * Falls back to {startLine: 0, endLine: 0} when `view.visibleRanges` is
 * empty (e.g. during initialisation before the first layout pass).
 */
export function getViewport(view: EditorView): ViewportInfo {
  const ranges = view.visibleRanges;
  if (!ranges.length) return { startLine: 0, endLine: 0 };

  const doc       = view.state.doc;
  const startLine = doc.lineAt(ranges[0].from).number - 1;      // → 0-indexed
  const endLine   = doc.lineAt(ranges[ranges.length - 1].to).number - 1;

  return { startLine, endLine };
}
