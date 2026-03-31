import { useState, useRef, useEffect, useMemo } from 'react';
import CodeMirror, { EditorView } from '@uiw/react-codemirror';
import type { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { vim } from '@replit/codemirror-vim';
import { highlightActiveLine, Decoration } from '@codemirror/view';
import type { DecorationSet } from '@codemirror/view';
import { StateField, StateEffect } from '@codemirror/state';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import './App.css';

// ─── Ghost Cursor (Decoration.mark highlights the target character) ─────────
const setGhostTarget = StateEffect.define<{ row: number; col: number } | null>();

const ghostCursorField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(deco, tr) {
    deco = deco.map(tr.changes); // track target char through edits
    for (const effect of tr.effects) {
      if (effect.is(setGhostTarget)) {
        if (!effect.value) return Decoration.none;
        const { row, col } = effect.value;
        const lineNo = row + 1; // doc.line() is 1-indexed
        if (lineNo > tr.state.doc.lines) return Decoration.none;
        const line = tr.state.doc.line(lineNo);
        const from = Math.min(line.from + col, line.to);
        const to   = Math.min(from + 1, line.to);
        if (from >= to) return Decoration.none;
        return Decoration.set([
          Decoration.mark({ class: 'cm-ghost-target' }).range(from, to),
        ]);
      }
    }
    return deco;
  },
  provide: (f) => EditorView.decorations.from(f),
});

// ─── Types ───────────────────────────────────────────────────────────────────
type VimMode = 'normal' | 'insert' | 'visual' | 'replace';

interface EditorSnapshot {
  line: number;      // 0-indexed
  col: number;       // 0-indexed
  code: string;
  lineCount: number;
}

interface LevelSchema {
  id: number;
  keys: string;                   // Keys badge shown in dashboard
  instruction: string;
  initialCode: string;
  target?: { row: number; col: number }; // Ghost cursor target
  validate: (
    snap: EditorSnapshot,
    vimMode: VimMode,
    ctx: { current: Record<string, any> }
  ) => boolean;
  onKeyDown?: (
    e: KeyboardEvent,
    ctx: { current: Record<string, any> },
    showToast: (msg: string) => void
  ) => void;
}

// ─── Level Definitions ───────────────────────────────────────────────────────
const LEVELS: LevelSchema[] = [
  // ── Level 1: Intro to Modes ──────────────────────────────────────────────
  {
    id: 1,
    keys: 'i  →  Esc',
    instruction:
      'The core of Vim is modes. Normal mode for navigation, Insert mode for typing. ' +
      'Press i to enter Insert mode, then press Esc to return to Normal.',
    initialCode: 'function welcome() {\n  console.log("Welcome to Vim Hero!");\n}',
    // Validation: the user must complete the Insert → Normal round-trip.
    // ctx.current.hasBeenInInsert is set by the global mode-change listener
    // when mode becomes 'insert'. We check it here alongside the final mode.
    validate: (_snap, vimMode, ctx) =>
      ctx.current.hasBeenInInsert === true && vimMode === 'normal',
  },

  // ── Level 2: Basic Movement ──────────────────────────────────────────────
  {
    id: 2,
    keys: 'h  j  k  l',
    instruction:
      'Forget the mouse. Use h (left), j (down), k (up), l (right) to navigate. ' +
      'Move the cursor to the "K" of "Keyboard".',
    initialCode:
      'const player = {\n  name: "Vim Knight",\n  level: 1,\n  weapon: "Keyboard"\n};',
    // "Keyboard" is on line index 3 (4th line), 'K' is at col index 11
    // Line: `  weapon: "Keyboard"`  → cols: 0=' ', 1=' ', ...10='"', 11='K'
    target: { row: 3, col: 11 },
    validate: (snap) => snap.line === 3 && snap.col === 11,
  },

  // ── Level 3: Moving by Words ─────────────────────────────────────────────
  {
    id: 3,
    keys: 'w  e  b',
    instruction:
      'Moving character-by-character is too slow. Use w (next word start), ' +
      'e (word end), b (previous word) to jump. Land on the first "err" parameter.',
    initialCode:
      'function handleError(req, res, err, status) {\n  if (err) throw err;\n}',
    // First 'err' parameter: line 0, col 31
    // `function handleError(req, res, ` is 31 chars → 'e' of 'err' is at col 31
    target: { row: 0, col: 31 },
    validate: (snap) => snap.line === 0 && snap.col === 31,
    onKeyDown(e, ctx, showToast) {
      if (e.key === 'l') {
        ctx.current.consecutiveL = (ctx.current.consecutiveL ?? 0) + 1;
        if (ctx.current.consecutiveL > 5) {
          showToast(
            "Try the 'w' key — think in word boundaries. That's the first principle of efficiency."
          );
          ctx.current.consecutiveL = 0;
        }
      } else {
        ctx.current.consecutiveL = 0;
      }
    },
  },

  // ── Level 4: Insert Mode in Action ──────────────────────────────────────
  {
    id: 4,
    keys: 'i / a  →  Esc',
    instruction:
      'Navigate to the "W" of "Wrld", press i (or a on \'r\') to enter Insert mode, ' +
      'type \'o\', then Esc. Fix "Hello Wrld" → "Hello World".',
    initialCode: 'let greeting = "Hello Wrld";',
    // 'W' of "Wrld": row=0, col=22  →  `let greeting = "Hello W`  (22 chars before 'W')
    target: { row: 0, col: 22 },
    // Multi-step final-state check:
    //   1. code must strictly equal the corrected string (whitespace-trimmed)
    //   2. must be back in Normal mode (user pressed Esc after typing)
    validate: (snap, vimMode) =>
      snap.code.trim() === 'let greeting = "Hello World";' && vimMode === 'normal',
  },
];

// ─── App Component ───────────────────────────────────────────────────────────
export default function App() {
  const [levelIdx, setLevelIdx] = useState(0);
  const [snap, setSnap]         = useState<EditorSnapshot>({
    line: 0, col: 0,
    code: LEVELS[0].initialCode,
    lineCount: LEVELS[0].initialCode.split('\n').length,
  });
  const [vimMode, setVimMode]   = useState<VimMode>('normal');
  const [toast, setToast]       = useState<string | null>(null);
  const [success, setSuccess]   = useState(false);

  // ── Refs for stale-closure-free event handlers ────────────────────────────
  const levelIdxRef  = useRef(0);
  levelIdxRef.current = levelIdx;

  const snapRef      = useRef(snap);
  snapRef.current    = snap;

  const vimModeRef   = useRef<VimMode>('normal');
  vimModeRef.current = vimMode;

  const alreadyPassedRef = useRef(false);
  const customCtxRef     = useRef<Record<string, any>>({});
  const advanceTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editorRef        = useRef<ReactCodeMirrorRef>(null);
  const wrapperRef       = useRef<HTMLDivElement>(null);

  // ── Toast helper (stable across renders) ─────────────────────────────────
  const toastRef = useRef<(msg: string) => void>(() => {});
  toastRef.current = (msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 3500);
  };
  const showToast = (msg: string) => toastRef.current(msg);

  // ── Advance to next level (triggered by validation) ───────────────────────
  // Stored in a ref so the Vim listener (attached once) can always call the
  // latest version without stale closures.
  const triggerAdvanceRef = useRef<() => void>(() => {});
  triggerAdvanceRef.current = () => {
    setSuccess(true);
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    advanceTimerRef.current = setTimeout(() => {
      setSuccess(false);
      customCtxRef.current    = {};
      // Update ref synchronously so any validation calls before re-render
      // use the correct new level index.
      const next = Math.min(levelIdxRef.current + 1, LEVELS.length - 1);
      levelIdxRef.current     = next;
      alreadyPassedRef.current = false;
      setLevelIdx(next);
    }, 500);
  };

  // ── Core validator (always reads latest state via refs) ───────────────────
  const validateRef = useRef<(s: EditorSnapshot, m: VimMode) => void>(() => {});
  validateRef.current = (s: EditorSnapshot, m: VimMode) => {
    if (alreadyPassedRef.current) return;
    if (LEVELS[levelIdxRef.current].validate(s, m, customCtxRef)) {
      alreadyPassedRef.current = true;
      triggerAdvanceRef.current();
    }
  };

  // ── CodeMirror onUpdate ────────────────────────────────────────────────────
  // Mode is detected by inspecting the `cm-fat-cursor` class that
  // @replit/codemirror-vim adds to `.cm-editor` in Normal/Visual modes.
  // This is more reliable than any event-listener approach because it
  // reads actual rendered state every time CodeMirror commits a transaction.
  const handleUpdate = (update: any) => {
    // ── Mode detection (runs on every transaction, including mode-only ones) ──
    const editorDom = update.view.dom as HTMLElement;
    const detectedMode: VimMode = editorDom.classList.contains('cm-fat-cursor')
      ? 'normal'
      : 'insert';
    if (detectedMode !== vimModeRef.current) {
      vimModeRef.current = detectedMode;
      setVimMode(detectedMode);
      if (detectedMode === 'insert') customCtxRef.current.hasBeenInInsert = true;
      validateRef.current(snapRef.current, detectedMode);
    }

    // ── Snap update (only when doc or cursor actually moved) ─────────────────
    if (!update.docChanged && !update.selectionSet) return;
    const sel     = update.state.selection.main;
    const doc     = update.state.doc;
    const lineObj = doc.lineAt(sel.head);
    const newSnap: EditorSnapshot = {
      line:      lineObj.number - 1,
      col:       sel.head - lineObj.from,
      code:      doc.toString(),
      lineCount: doc.lines,
    };
    setSnap(newSnap);
    snapRef.current = newSnap;
    validateRef.current(newSnap, vimModeRef.current);
  };

  // ── Set ghost cursor + initialise snap from actual doc on editor mount ─────
  const handleCreateEditor = (view: EditorView) => {
    // Populate snap immediately so Level 1 ctx isn't stale on first keystroke
    const doc = view.state.doc;
    const initSnap: EditorSnapshot = {
      line: 0, col: 0,
      code: doc.toString(),
      lineCount: doc.lines,
    };
    setSnap(initSnap);
    snapRef.current = initSnap;

    // Set ghost cursor (deferred so CM6 finishes its own mount cycle first)
    const target = LEVELS[levelIdxRef.current].target ?? null;
    Promise.resolve().then(() =>
      view.dispatch({ effects: setGhostTarget.of(target) })
    );
  };

  // ── Per-level state reset on level change ─────────────────────────────────
  // (key={levelIdx} on CodeMirror forces a fresh Vim instance; this resets
  //  React state to match the new level's initial conditions.)
  useEffect(() => {
    alreadyPassedRef.current = false;
    setVimMode('normal');
    vimModeRef.current = 'normal';
    const level = LEVELS[levelIdx];
    const initSnap: EditorSnapshot = {
      line: 0, col: 0,
      code: level.initialCode,
      lineCount: level.initialCode.split('\n').length,
    };
    setSnap(initSnap);
    snapRef.current = initSnap;
  }, [levelIdx]);

  // ── Anti-pattern keystroke interceptor (capture phase) ───────────────────
  useEffect(() => {
    const el    = wrapperRef.current;
    const level = LEVELS[levelIdx];
    if (!el || !level.onKeyDown) return;
    const handler = (e: KeyboardEvent) =>
      level.onKeyDown!(e, customCtxRef, showToast);
    el.addEventListener('keydown', handler, true);
    return () => el.removeEventListener('keydown', handler, true);
  }, [levelIdx]); // re-bind when level changes

  // ── Stable extensions (never recreated) ──────────────────────────────────
  // forceEditorHeight: fixes the "black screen" height-collapse bug where
  // .cm-editor collapses to 0 even when the React height prop is "100%".
  const forceEditorHeight = useMemo(
    () =>
      EditorView.theme({
        '&':            { height: '100%' },
        '.cm-scroller': { overflow: 'auto' },
      }),
    []
  );

  const extensions = useMemo(() => [
    javascript({ jsx: false }),
    vim(),
    highlightActiveLine(),
    ghostCursorField,
    forceEditorHeight,
  ], [forceEditorHeight]);

  // ── Cleanup timers on unmount ─────────────────────────────────────────────
  useEffect(() => () => {
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    if (toastTimerRef.current)   clearTimeout(toastTimerRef.current);
  }, []);

  const currentLevel = LEVELS[levelIdx];
  const isLastLevel  = levelIdx === LEVELS.length - 1;

  return (
    <div className={`app vim-${vimMode}`}>

      {/* Toast: anti-pattern warning */}
      {toast && (
        <div className="toast" role="alert" aria-live="assertive">
          💡 {toast}
        </div>
      )}

      {/* Success flash overlay */}
      {success && (
        <div className="success-flash" aria-live="polite">
          {isLastLevel ? '🏆 All Levels Complete!' : `✅ Level ${levelIdx + 1} Complete!`}
        </div>
      )}

      {/* Editor — key forces full remount (fresh Vim state) on level change */}
      <div className="editor-container" ref={wrapperRef}>
        <CodeMirror
          key={levelIdx}
          ref={editorRef}
          defaultValue={currentLevel.initialCode}
          height="100%"
          theme={vscodeDark}
          extensions={extensions}
          onUpdate={handleUpdate}
          onCreateEditor={handleCreateEditor}
          basicSetup={{
            lineNumbers:              true,
            highlightActiveLineGutter: true,
            foldGutter:               false,
            dropCursor:               false,
            allowMultipleSelections:  false,
            indentOnInput:            true,
            bracketMatching:          true,
            closeBrackets:            false,
            autocompletion:           false,
            rectangularSelection:     false,
            highlightSelectionMatches: false,
            // Disable built-in search so '/' goes to Vim first
            searchKeymap:             false,
          }}
        />
      </div>

      {/* Bottom Dashboard */}
      <div className="dashboard">
        <div className="dashboard-inner">

          {/* Level header row */}
          <div className="level-header">
            <span className="level-id">Level {levelIdx + 1} / {LEVELS.length}</span>
            <span className="level-keys">{currentLevel.keys}</span>
          </div>

          {/* Instruction */}
          <p className="level-instruction">{currentLevel.instruction}</p>

          {/* Status bar */}
          <div className="status-bar">
            <span className="status-pos">
              Ln <strong>{snap.line + 1}</strong>, Col <strong>{snap.col + 1}</strong>
            </span>
            <span className={`status-mode mode-${vimMode}`}>
              {vimMode.toUpperCase()}
            </span>
            {currentLevel.target && (
              <span className="status-target">
                🎯 Target Ln {currentLevel.target.row + 1}, Col {currentLevel.target.col + 1}
              </span>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}


