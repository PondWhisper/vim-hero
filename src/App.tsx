import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import CodeMirror, { EditorView } from '@uiw/react-codemirror';
import type { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { cpp } from '@codemirror/lang-cpp';
import { vim } from '@replit/codemirror-vim';
import { highlightActiveLine, highlightActiveLineGutter, Decoration, WidgetType, drawSelection } from '@codemirror/view';
import type { DecorationSet } from '@codemirror/view';
import { StateField, StateEffect } from '@codemirror/state';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import confetti from 'canvas-confetti';
import './App.css';

// ─── C++ QuickSort code (single source of truth) ─────────────────────────────
// Lines are 0-indexed below for validate() / target coordinates.
//
// idx 0:  #include <iostream>
// idx 1:  using namespace std;
// idx 2:  (empty)
// idx 3:  // 快速排序核心：分区函数
// idx 4:  // 将数组分为两部分，左边<=pivot，右边>pivot
// idx 5:  int partition(int arr[], int low, int high) {
// idx 6:      int pivot = arr[high];  // 选最右元素作为基准   pivot@col8
// idx 7:      int i = low - 1;
// idx 8:      for (int j = low; j < high; j++) {             for@col4
// idx 9:          if (arr[j] <= pivot) {
// idx 10:             i++;
// idx 11:             swap(arr[i], arr[j]);
// idx 12:         }
// idx 13:     }
// idx 14:     swap(arr[i + 1], arr[high]);                   swap@col4
// idx 15:     return i + 1;
// idx 16: }
// idx 17: (empty)
// idx 18: // 递归快速排序函数
// idx 19: void quickSort(int arr[], int low, int high) {
// idx 20:     if (low < high) {
// idx 21:         int pi = partition(arr, low, high);
// idx 22:         quickSort(arr, low, pi - 1);
// idx 23:         quickSort(arr, pi + 1, high);
// idx 24:     }
// idx 25: }
// idx 26: (empty)
// idx 27: // 打印数组
// idx 28: void printArray(int arr[], int size) {
// idx 29:     for (int i = 0; i < size; i++)
// idx 30:         cout << arr[i] << " ";
// idx 31:     cout << endl;
// idx 32: }
// idx 33: (empty)
// idx 34: int main() {
// idx 35:     int arr[] = {64, 34, 25, 12, 22, 11, 90};
// idx 36:     int n = sizeof(arr) / sizeof(arr[0]);
// idx 37:     cout << "原始数组: ";
// idx 38:     printArray(arr, n);
// idx 39:     quickSort(arr, 0, n - 1);
// idx 40:     cout << "排序结果: ";
// idx 41:     printArray(arr, n);
// idx 42:     return 0;
// idx 43: }
const INITIAL_CODE = `#include <iostream>
using namespace std;

// 快速排序核心：分区函数
// 将数组分为两部分，左边<=pivot，右边>pivot
int partition(int arr[], int low, int high) {
    int pivot = arr[high];  // 选最右元素作为基准
    int i = low - 1;
    for (int j = low; j < high; j++) {
        if (arr[j] <= pivot) {
            i++;
            swap(arr[i], arr[j]);
        }
    }
    swap(arr[i + 1], arr[high]);
    return i + 1;
}

// 递归快速排序函数
void quickSort(int arr[], int low, int high) {
    if (low < high) {
        int pi = partition(arr, low, high);
        quickSort(arr, low, pi - 1);
        quickSort(arr, pi + 1, high);
    }
}

// 打印数组
void printArray(int arr[], int size) {
    for (int i = 0; i < size; i++)
        cout << arr[i] << " ";
    cout << endl;
}

int main() {
    int arr[] = {64, 34, 25, 12, 22, 11, 90};
    int n = sizeof(arr) / sizeof(arr[0]);
    cout << "原始数组: ";
    printArray(arr, n);
    quickSort(arr, 0, n - 1);
    cout << "排序结果: ";
    printArray(arr, n);
    return 0;
}`;

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
  keys: string;
  instruction: string;
  minSteps?: number;      // theoretical optimal keystrokes (entropy threshold)
  initialCode?: string;  // per-level code, falls back to INITIAL_CODE
  target?: { row: number; col: number };
  validate: (
    snap: EditorSnapshot,
    mode: VimMode,
    ctx: { current: Record<string, any> }
  ) => boolean;
  onKeyDown?: (
    e: KeyboardEvent,
    ctx: { current: Record<string, any> },
    showToast: (msg: string) => void
  ) => void;
}

// ─── Ghost Cursor Widget ──────────────────────────────────────────────────────
class GhostCursorWidget extends WidgetType {
  toDOM() {
    const el = document.createElement('span');
    el.className = 'cm-ghost-cursor-widget';
    return el;
  }
  ignoreEvent() { return true; }
}

const setGhostTarget = StateEffect.define<{ row: number; col: number } | null>();

const ghostCursorField = StateField.define<DecorationSet>({
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

// ─── L6 initial code: phivot typo on idx=6 ─────────────────────────────────
const L6_CODE = INITIAL_CODE.replace(
  '    int pivot = arr[high];  // 选最右元素作为基准',
  '    int phivot = arr[high];  // 选最右元素作为基准'
);

// ─── Level Definitions (7 levels, coordinates verified against INITIAL_CODE) ─
const LEVELS: LevelSchema[] = [
  // ── L1 Gateway ───────────────────────────────────────────────────────────
  {
    id: 1, minSteps: 20,
    keys: 'i → Esc',
    instruction:
      'Vim 的灵魂是"模式"。按 i 进入 Insert 模式（光标变细线），' +
      '再按 Esc 回 Normal 模式（光标变方块）。完成一次切换即可通关。',
    // Passes when modeHistory records the full insert→normal sequence.
    validate: (_snap, _mode, ctx) =>
      ctx.current.seenInsertToNormal === true,
  },

  // ── L2 Axis ──────────────────────────────────────────────────────────────
  // Target: 'p' of 'pivot' — row=6, col=8
  // Line idx=6: "    int pivot = arr[high];"  → "    int " = 8 chars, 'p' at col 8
  {
    id: 2, minSteps: 10,
    keys: 'h  j  k  l',
    instruction:
      '忘掉鼠标！只用 h/j/k/l 四键导航。' +
      '目标：移动到第 7 行 int pivot 中 "pivot" 的首字母 p 上。',
    target: { row: 6, col: 8 },
    validate: (snap) => snap.line === 6 && snap.col === 8,
  },

  // ── L3 Leap ───────────────────────────────────────────────────────────────
  // Target: 'j' in "for (int j" — row=8, col=13
  // Line idx=8: "    for (int j = low; ...)"  → col 13 is 'j'
  {
    id: 3, minSteps: 6,
    keys: 'w  e  b',
    instruction:
      '逐字符移动太慢！用 w（词首）e（词尾）b（前词）高速跳跃。' +
      '目标：跳到第 9 行 for 循环中的变量 j。',
    target: { row: 8, col: 13 },
    validate: (snap) => snap.line === 8 && snap.col === 13,
    onKeyDown(e, ctx, showToast) {
      if (e.key === 'l') {
        ctx.current.consL = (ctx.current.consL ?? 0) + 1;
        if (ctx.current.consL > 4) {
          showToast('别用 l 一直按！试试 w——按词跳跃才是效率的第一原则！');
          ctx.current.consL = 0;
        }
      } else {
        ctx.current.consL = 0;
      }
    },
  },

  // ── L4 Boundary ──────────────────────────────────────────────────────────
  // Use 0 (col 0) and $ (line end) on the long Chinese comment at row=4.
  {
    id: 4, minSteps: 4,
    keys: '0  $',
    instruction:
      '用 0 跳到行首，$ 跳到行尾。移到第 5 行长注释上，依次按 0 和 $，通关！',
    target: { row: 4, col: 0 },
    validate: (snap, _, ctx) =>
      snap.line === 4 &&
      ctx.current.used0      === true &&
      ctx.current.usedDollar === true,
    onKeyDown(e, ctx) {
      if (e.key === '0') ctx.current.used0      = true;
      if (e.key === '$') ctx.current.usedDollar = true;
    },
  },

  // ── L5 Rift ───────────────────────────────────────────────────────────────
  // Use o (open below) AND O (open above). Need 2+ extra lines + Normal mode.
  {
    id: 5, minSteps: 4,
    keys: 'o  O',
    instruction:
      '用 o 在当前行下方开辟新行，O 在上方开辟新行，再按 Esc 回 Normal。' +
      '两种都必须用过才算通关。',
    validate: (snap, mode, ctx) =>
      mode === 'normal' &&
      snap.lineCount > INITIAL_CODE.split('\n').length + 1 &&
      ctx.current.usedO    === true &&
      ctx.current.usedBigO === true,
    onKeyDown(e, ctx) {
      if (e.key === 'o') ctx.current.usedO    = true;
      if (e.key === 'O') ctx.current.usedBigO = true;
    },
  },

  // ── L6 Precision ─────────────────────────────────────────────────────────
  // L6_CODE has "phivot" typo on row=6 col=8. Fix to "pivot" efficiently.
  {
    id: 6, minSteps: 6,
    keys: 'ciw  cw  x',
    instruction:
      '第 7 行藏了个 Bug：phivot → 应为 pivot！' +
      '用最少步数修正，熵值超标代码将变模糊。',
    initialCode: L6_CODE,
    target: { row: 6, col: 8 },
    validate: (snap, mode) =>
      mode === 'normal' &&
      snap.code.includes('int pivot = arr[high]') &&
      !snap.code.includes('phivot'),
  },

  // ── L7 Alchemist ─────────────────────────────────────────────────────────
  // Target: 's' of swap(arr[i], arr[j]) inside for-loop — row=11, col=12
  // Line idx=11: "            swap(arr[i], arr[j]);"  → 12 spaces, 's' at col 12
  // Arrow-key penalty: +20 entropy → instant blur.
  {
    id: 7, minSteps: 8,
    keys: 'w  b  f  /n',
    instruction:
      '终极效率！用语义跳跃（w/b/f/n）冲向第 12 行的 swap(arr[i], arr[j])。' +
      '方向键触发 +20 熵值处罚，代码立即模糊！',
    target: { row: 11, col: 12 },
    validate: (snap) => snap.line === 11 && snap.col === 12,
    onKeyDown(e, _ctx, showToast) {
      if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)) {
        showToast('⚡ 方向键处罚！+20 熵值，代码进入深度模糊！');
      }
    },
  },
];

// ─── App ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [levelIdx, setLevelIdx]   = useState(0);
  const [snap, setSnap]           = useState<EditorSnapshot>({
    line: 0, col: 0,
    code: INITIAL_CODE,
    lineCount: INITIAL_CODE.split('\n').length,
  });
  const [vimMode, setVimMode]     = useState<VimMode>('normal');
  const [toast, setToast]         = useState<string | null>(null);
  const [success, setSuccess]     = useState(false);
  const [entropy, setEntropy]     = useState(0); // keystroke counter → blur penalty

  // ── Refs (avoid stale closures in stable callbacks) ───────────────────────
  const levelIdxRef      = useRef(0);
  levelIdxRef.current    = levelIdx;
  const snapRef          = useRef(snap);
  snapRef.current        = snap;
  const vimModeRef       = useRef<VimMode>('normal');
  vimModeRef.current     = vimMode;
  const alreadyDoneRef   = useRef(false);
  const customCtxRef     = useRef<Record<string, any>>({});
  const advTimerRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editorRef        = useRef<ReactCodeMirrorRef>(null);
  const wrapperRef       = useRef<HTMLDivElement>(null);
  const entropyRef       = useRef(0); // ref mirror of entropy — no stale closure in handlers
  // Mode sequence history — used by Level 1 to detect insert→normal transition
  const modeHistoryRef   = useRef<VimMode[]>([]);
  // Confetti canvas + instance (scoped to dashboard, never leaks into editor)
  const confettiCanvasRef    = useRef<HTMLCanvasElement | null>(null);
  const confettiInstanceRef  = useRef<confetti.CreateTypes | null>(null);

  // ── Confetti: initialize local instance bound to dashboard canvas ────────
  // useWorker offloads physics to a web worker — zero main-thread jank.
  useEffect(() => {
    const canvas = confettiCanvasRef.current;
    if (!canvas) return;
    const instance = confetti.create(canvas, { resize: true, useWorker: true });
    confettiInstanceRef.current = instance;
    return () => { instance.reset(); };
  }, []);

  // ── Toast ─────────────────────────────────────────────────────────────────
  const toastFnRef = useRef<(msg: string) => void>(() => {});
  toastFnRef.current = (msg) => {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 3500);
  };

  // ── Advance ───────────────────────────────────────────────────────────────
  const triggerAdvanceRef = useRef<() => void>(() => {});
  triggerAdvanceRef.current = () => {
    setSuccess(true);
    // Fire confetti burst inside the dashboard canvas
    confettiInstanceRef.current?.({
      particleCount: 80,
      spread:        50,
      origin:        { y: 0.6 },
      ticks:         200,
      colors:        ['#528bff', '#ffffff', '#ffd700'],
    });
    if (advTimerRef.current) clearTimeout(advTimerRef.current);
    // 1200 ms: 750 ms hold + 250 ms fade-out in CSS, plus 200 ms buffer
    advTimerRef.current = setTimeout(() => {
      setSuccess(false);
      customCtxRef.current = {};
      const next = Math.min(levelIdxRef.current + 1, LEVELS.length - 1);
      levelIdxRef.current  = next;
      alreadyDoneRef.current = false;
      setLevelIdx(next);
    }, 1200);
  };

  // ── Validator ─────────────────────────────────────────────────────────────
  const validateRef = useRef<(s: EditorSnapshot, m: VimMode) => void>(() => {});
  validateRef.current = (s, m) => {
    if (alreadyDoneRef.current) return;
    customCtxRef.current._entropy = entropyRef.current; // expose for level validate fns
    if (LEVELS[levelIdxRef.current].validate(s, m, customCtxRef)) {
      alreadyDoneRef.current = true;
      triggerAdvanceRef.current();
    }
  };

  // ── Mode transition helper ────────────────────────────────────────────────
  // Single source of truth for committing a vim mode change.
  // Called from both handleUpdate (primary) and the rAF fallback in keydown.
  const commitModeChange = useCallback((next: VimMode) => {
    const prev = vimModeRef.current;
    vimModeRef.current = next;
    setVimMode(next);
    modeHistoryRef.current.push(next);
    if (next === 'insert') customCtxRef.current.hasBeenInInsert = true;
    // Key sequence flag for Level 1: set the instant we see insert→normal
    if (prev === 'insert' && next === 'normal') {
      customCtxRef.current.seenInsertToNormal = true;
    }
    validateRef.current(snapRef.current, next);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // all state via refs — intentionally stable

  // ── onUpdate: mode detection via cm-fat-cursor DOM class ─────────────────
  // Wrapped in useCallback with empty deps: all state is read through refs,
  // so the function reference is stable across React re-renders. This prevents
  // uiw/react-codemirror from re-registering the listener on every render
  // which can cause cursor position jitter via spurious update cycles.
  const handleUpdate = useCallback((update: any) => {
    const editorEl = update.view.dom as HTMLElement;
    const detected: VimMode = editorEl.classList.contains('cm-fat-cursor')
      ? 'normal'
      : 'insert';

    if (detected !== vimModeRef.current) {
      commitModeChange(detected);
    }

    if (!update.docChanged && !update.selectionSet) return;
    const sel  = update.state.selection.main;
    const doc  = update.state.doc;
    const lo   = doc.lineAt(sel.head);
    const ns: EditorSnapshot = {
      line:      lo.number - 1,
      col:       sel.head - lo.from,
      code:      doc.toString(),
      lineCount: doc.lines,
    };
    setSnap(ns);
    snapRef.current = ns;
    validateRef.current(ns, vimModeRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // all state accessed through refs — empty dep array is intentional

  // ── onCreateEditor: set ghost cursor + sync initial snap ─────────────
  const handleCreateEditor = useCallback((view: EditorView) => {
    const doc = view.state.doc;
    const ns: EditorSnapshot = {
      line: 0, col: 0,
      code: doc.toString(),
      lineCount: doc.lines,
    };
    setSnap(ns);
    snapRef.current = ns;

    const target = LEVELS[levelIdxRef.current].target ?? null;
    Promise.resolve().then(() =>
      view.dispatch({ effects: setGhostTarget.of(target) })
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // all state accessed through refs — empty dep array is intentional

  // ── Level change reset ────────────────────────────────────────────────────
  useEffect(() => {
    alreadyDoneRef.current = false;
    setVimMode('normal');
    vimModeRef.current = 'normal';
    entropyRef.current = 0;
    setEntropy(0);
    modeHistoryRef.current = []; // clear sequence tracker for the new level
  }, [levelIdx]);

  // ── Unified keydown: entropy counting + level-specific handler ────────────
  // All non-modifier keypresses increment entropy. Arrow keys carry a +20 penalty
  // (relevant for L7) to discourage directional navigation. After counting,
  // the current level's onKeyDown is called (if defined) for level-specific logic.
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const handler = (e: KeyboardEvent) => {
      if (['Control','Alt','Shift','Meta','CapsLock','Tab'].includes(e.key)) return;
      const isArrow = ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key);
      entropyRef.current += isArrow ? 20 : 1;
      setEntropy(entropyRef.current);
      LEVELS[levelIdxRef.current].onKeyDown?.(
        e,
        customCtxRef,
        (msg) => toastFnRef.current(msg)
      );
    };
    el.addEventListener('keydown', handler, true);
    return () => el.removeEventListener('keydown', handler, true);
  }, [levelIdx]);

  // ── Stable extensions ─────────────────────────────────────────────────────
  // forceHeight injects:
  //   1. OLED-black background overrides (beat vscodeDark's #1e1e1e)
  //   2. Line-number: normal=dim #606060, active=clean white block + blue left bar
  const forceHeight = useMemo(() =>
    EditorView.theme({
      // ── Layout / background ──────────────────────────────────────────────
      '&':            { height: '100%', background: '#0d0d0d' },
      '.cm-scroller': { overflow: 'auto', background: '#0d0d0d' },
      '.cm-content':  { background: '#0d0d0d' },
      // ── Gutter (line-number column) ──────────────────────────────────────
      '.cm-gutters': {
        background:  '#0d0d0d',
        borderRight: '1px solid #333',
      },
      // Normal line numbers — dim gray, no background, no left border
      '.cm-lineNumbers .cm-gutterElement': {
        color:      '#606060',
        fontWeight: 'normal',
        padding:    '0 8px 0 4px',
        background: 'transparent',
        borderLeft: 'none',
      },
      // Active-line gutter: sharp gray block + 3px blue left indicator, zero glow
      '.cm-activeLineGutter': {
        background:  'rgba(255, 255, 255, 0.15)',
        color:       '#ffffff',
        fontWeight:  'normal',
        textShadow:  'none',
        borderLeft:  '3px solid #528bff',
        padding:     '0 8px 0 1px',
      },
    }), []);

  // Cursor theme: injected as a CodeMirror extension so it has the same
  // specificity as the vim plugin's own theme — no !important wars.
  const vimCursorTheme = useMemo(() => EditorView.theme({
    // ── Normal mode: static VS Code blue block ──────────────────────
    // Override the vim plugin's default (often yellowish) fat cursor color.
    '&.cm-fat-cursor .cm-cursor.cm-fat-cursor': {
      background:   '#528bff',
      borderLeft:   'none',
      borderBottom: 'none',
      outline:      'none',
      width:        '0.65ch',
    },
    // ── Insert mode: 2 px #528bff thin line ─────────────────────────
    '&:not(.cm-fat-cursor) .cm-cursor': {
      borderLeft:  '2px solid #528bff',
      background:  'transparent',
      marginLeft:  '-1px',
    },
  }), []);

  const extensions = useMemo(() => [
    cpp(),
    vim(),
    drawSelection(),            // explicit selection rendering
    highlightActiveLine(),      // active-line code-area highlight
    highlightActiveLineGutter(), // active-line gutter highlight (styled above)
    ghostCursorField,
    forceHeight,
    vimCursorTheme,
  ], [forceHeight, vimCursorTheme]);

  // ── Cleanup ───────────────────────────────────────────────────────────────
  useEffect(() => () => {
    if (advTimerRef.current)   clearTimeout(advTimerRef.current);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    confettiInstanceRef.current?.reset();
  }, []);

  const level       = LEVELS[levelIdx];
  const isLastLevel = levelIdx === LEVELS.length - 1;
  const currentCode = level.initialCode ?? INITIAL_CODE;

  // Entropy blur: ramps up once past minSteps * 1.5 keystrokes, max 4 px
  const minSteps    = level.minSteps ?? Infinity;
  const blurPx      = isFinite(minSteps)
    ? Math.max(0, Math.min(4, (entropy - minSteps * 1.5) * 0.5))
    : 0;
  // Mode filter: slight grayscale in Normal → saturate in Insert
  const modeFilter  = vimMode === 'insert' ? 'saturate(115%)' : 'grayscale(12%)';
  const filterStr   = blurPx > 0.05
    ? `${modeFilter} blur(${blurPx.toFixed(1)}px)`
    : modeFilter;

  return (
    <div className={`app vim-${vimMode}`}>

      {/* Toast */}
      {toast && (
        <div className="toast" role="alert" aria-live="assertive">
          💡 {toast}
        </div>
      )}

      {/* Success overlay */}
      {success && (
        <div className="success-flash" aria-live="polite">
          {isLastLevel ? '🏆 全部通关！恭喜掌握 Vim 核心！' : `✅ Level ${levelIdx + 1} 完成！`}
        </div>
      )}

      {/* Editor */}
      <div
        className={`editor-container${vimMode === 'insert' ? ' mode-insert-active' : ''}`}
        ref={wrapperRef}
        style={{ filter: filterStr }}
      >
        <CodeMirror
          key={levelIdx}
          ref={editorRef}
          value={currentCode}
          height="100%"
          theme={vscodeDark}
          extensions={extensions}
          onUpdate={handleUpdate}
          onCreateEditor={handleCreateEditor}
          basicSetup={{
            lineNumbers:               true,
            highlightActiveLineGutter: false, // handled by explicit highlightActiveLineGutter() in extensions
            highlightActiveLine:       false, // handled by explicit highlightActiveLine() in extensions
            drawSelection:             false, // handled by explicit drawSelection() in extensions
            foldGutter:                false,
            dropCursor:                false,
            allowMultipleSelections:   false,
            indentOnInput:             false,
            bracketMatching:           true,
            closeBrackets:             false,
            autocompletion:            false,
            rectangularSelection:      false,
            highlightSelectionMatches: false,
            searchKeymap:              false,
          }}
        />
      </div>

      {/* Dashboard — position:relative so canvas can fill it absolutely */}
      <div className="dashboard">
        {/* Confetti canvas: pointer-events:none so it never blocks clicks */}
        <canvas
          ref={confettiCanvasRef}
          style={{
            position:      'absolute',
            top:           0,
            left:          0,
            width:         '100%',
            height:        '100%',
            pointerEvents: 'none',
            zIndex:        10,
          }}
        />
        <div className="dashboard-inner">

          <div className="level-header">
            <span className="level-id">Level {levelIdx + 1} / {LEVELS.length}</span>
            <span className="level-keys">{level.keys}</span>
          </div>

          <p className="level-instruction">{level.instruction}</p>

          <div className="status-bar">
            <span className="status-pos">
              Ln <strong>{snap.line + 1}</strong>, Col <strong>{snap.col + 1}</strong>
            </span>
            <span className={`status-mode mode-${vimMode}`}>
              {vimMode.toUpperCase()}
            </span>
            {isFinite(minSteps) && (
              <span className={`status-entropy${blurPx > 0.05 ? ' penalty' : ''}`}>
                ⚡ {entropy}<span className="entropy-limit">/{Math.round(minSteps * 1.5)}</span>
              </span>
            )}
            {level.target && (
              <span className="status-target">
                🎯 目标 Ln {level.target.row + 1}, Col {level.target.col + 1}
              </span>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

