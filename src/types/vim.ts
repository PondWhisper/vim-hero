// ─── VimState: FSM State Shape ────────────────────────────────────────────────
// Canonical type for the Vim editor's Finite State Machine state.
// Consumed by debuggers, metrics overlays, and future replay systems.
// The live state is stored in refs inside App.tsx for performance;
// this interface documents the logical shape regardless of storage strategy.

import type { VimMode } from './level';

export interface CursorPos {
  row: number;  // 0-indexed line
  col: number;  // 0-indexed column
}

export interface ViewportRange {
  startLine: number;  // 0-indexed first rendered line
  endLine:   number;  // 0-indexed last  rendered line
}

/**
 * Complete snapshot of the Vim editor's FSM at a single point in time.
 *
 * Fields:
 *  - `mode`      — Current editing mode (normal / insert / visual / replace)
 *  - `cursor`    — Logical caret position (0-indexed row + col)
 *  - `buffer`    — Document lines (mutable reference — snapshot if needed)
 *  - `viewport`  — Currently visible line range (for scroll-aware logic)
 *  - `taskQueue` — Ordered list of target positions for the active level
 */
export interface VimState {
  mode:       VimMode;
  cursor:     CursorPos;
  buffer:     string[];
  viewport:   ViewportRange;
  taskQueue:  CursorPos[];
}
