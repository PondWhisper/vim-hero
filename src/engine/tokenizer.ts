// ─── Vim Word Motion Tokenizer ────────────────────────────────────────────────
// Pure, side-effect-free tokenizer for vim-style w/e/b navigation analysis.
// Strategy Pattern: each motion is an independent exported function that can
// be tested and reasoned about in isolation.
//
// Token taxonomy (mirrors Vim's small-word behaviour):
//   'word'   — [a-zA-Z0-9_]+        alphanumeric + underscore runs
//   'symbol' — [^\w\s]+             non-word, non-whitespace runs
//   'ws'     — \s+                  space / tab runs

// ─── Types ────────────────────────────────────────────────────────────────────

export type CharKind = 'word' | 'symbol' | 'ws';

export interface Token {
  kind:  CharKind;
  start: number;   // 0-indexed column within the line (inclusive)
  end:   number;   // exclusive end column
  text:  string;
}

// ─── charKind ─────────────────────────────────────────────────────────────────
// Classifies a single character into one of the three vim word-motion categories.

export function charKind(ch: string): CharKind {
  if (/\s/.test(ch))            return 'ws';
  if (/[a-zA-Z0-9_]/.test(ch)) return 'word';
  return 'symbol';
}

// ─── tokenizeLine ─────────────────────────────────────────────────────────────
// Splits a single line into an ordered array of Tokens.
// Adjacent characters of the same kind are merged into one Token.

export function tokenizeLine(line: string): Token[] {
  if (!line) return [];
  const tokens: Token[] = [];
  let i = 0;
  while (i < line.length) {
    const kind  = charKind(line[i]);
    const start = i;
    while (i < line.length && charKind(line[i]) === kind) i++;
    tokens.push({ kind, start, end: i, text: line.slice(start, i) });
  }
  return tokens;
}

// ─── Strategy: w — forward to start of next word or symbol ───────────────────
// Mirrors Vim's `w` (small-w) motion:
//   1. Skip the current token (whatever kind sits under the cursor).
//   2. Skip any following whitespace on the same line.
//   3. Land on the first character of the next non-ws token.
// Cross-line: when the current line is exhausted, advance to the next line.
// A completely blank line is itself a word boundary — return { row, col: 0 }.

export function nextWPosition(
  buffer: string[],
  row:    number,
  col:    number,
): { row: number; col: number } | null {
  let r = row;
  let c = col;

  // ── Step 1: skip the current token on the starting line ──────────────────
  const startLine = buffer[r] ?? '';
  if (c < startLine.length) {
    const startKind = charKind(startLine[c]);
    while (c < startLine.length && charKind(startLine[c]) === startKind) c++;
  }

  // ── Step 2: walk forward until we land on a non-ws character ─────────────
  while (r < buffer.length) {
    const line = buffer[r] ?? '';

    // Skip whitespace on the current search line
    while (c < line.length && charKind(line[c]) === 'ws') c++;

    // Found the start of the next token on this line
    if (c < line.length) return { row: r, col: c };

    // End of line — advance to the next
    r++;
    c = 0;
    if (r >= buffer.length) return null;

    // A blank line is itself a word boundary in Vim
    if ((buffer[r] ?? '').length === 0) return { row: r, col: 0 };
  }

  return null;
}

// ─── Strategy: e — forward to end of current or next word/symbol ─────────────
// Mirrors Vim's `e` (small-e) motion:
//   Start from col+1; skip whitespace; land on the LAST character of the next
//   non-ws token.

export function nextEPosition(
  buffer: string[],
  row:    number,
  col:    number,
): { row: number; col: number } | null {
  let r = row;
  let c = col + 1; // search begins one position ahead of the cursor

  while (r < buffer.length) {
    const line = buffer[r] ?? '';

    // Skip whitespace
    while (c < line.length && charKind(line[c]) === 'ws') c++;

    // Found start of a non-ws token — slide to its last character
    if (c < line.length) {
      const kind = charKind(line[c]);
      while (c + 1 < line.length && charKind(line[c + 1]) === kind) c++;
      return { row: r, col: c };
    }

    // Advance to next line
    r++;
    c = 0;
  }

  return null;
}

// ─── Strategy: b — backward to start of current or previous word/symbol ───────
// Mirrors Vim's `b` (small-b) motion:
//   Start from col-1; skip whitespace (backwards); land on the FIRST character
//   of the previous non-ws token.

export function prevBPosition(
  buffer: string[],
  row:    number,
  col:    number,
): { row: number; col: number } | null {
  let r = row;
  let c = col - 1; // search begins one position behind the cursor

  while (r >= 0) {
    const line = buffer[r] ?? '';

    // Skip whitespace scanning right-to-left
    while (c >= 0 && (c >= line.length || charKind(line[c]) === 'ws')) c--;

    // Found the end of a non-ws token — slide to its first character
    if (c >= 0 && c < line.length) {
      const kind = charKind(line[c]);
      while (c - 1 >= 0 && charKind(line[c - 1]) === kind) c--;
      return { row: r, col: c };
    }

    // Advance to the previous line
    r--;
    if (r < 0) return null;
    c = (buffer[r] ?? '').length - 1;
  }

  return null;
}

// ─── Utility: countWPresses ───────────────────────────────────────────────────
// Returns the minimum number of `w` presses to advance from (fromRow, fromCol)
// to a position that reaches or passes (toRow, toCol).
// Used for pre-calculating LevelConfig.optimalSteps values at build time.

export function countWPresses(
  buffer:  string[],
  fromRow: number,
  fromCol: number,
  toRow:   number,
  toCol:   number,
): number {
  let row     = fromRow;
  let col     = fromCol;
  let presses = 0;
  const LIMIT = 1000; // safety ceiling — prevents infinite loops on malformed input

  while (presses < LIMIT) {
    // Already at or past the target — stop counting
    if (row > toRow || (row === toRow && col >= toCol)) return presses;

    const next = nextWPosition(buffer, row, col);
    if (!next) return presses; // no more forward positions in buffer

    row = next.row;
    col = next.col;
    presses++;
  }

  return presses;
}
