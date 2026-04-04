import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import CodeMirror, { EditorView } from '@uiw/react-codemirror';
import type { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { cpp } from '@codemirror/lang-cpp';
import { vim, getCM } from '@replit/codemirror-vim';
import { highlightActiveLine, highlightActiveLineGutter, drawSelection } from '@codemirror/view';
import type { VimMode, EditorSnapshot, VimCommand, LevelSchema } from './engine/reducer';
import { setGhostTarget, ghostCursorField } from './components/GhostCursorWidget';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import confetti from 'canvas-confetti';
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';
import { nextWPosition } from './engine/tokenizer';
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

// ─── L6 initial code: phivot typo on idx=6 ─────────────────────────────────
const L6_CODE = INITIAL_CODE.replace(
  '    int pivot = arr[high];  // 选最右元素作为基准',
  '    int phivot = arr[high];  // 选最右元素作为基准'
);

// ─── L4 end column (for $ waypoint ghost cursor) ───────────────────────────────
// Line idx=4: "// 将数组分为两部分，左边<=pivot，右边>pivot"
// Computed from INITIAL_CODE so it stays accurate if the string ever changes.
const L4_END_COL = INITIAL_CODE.split('\n')[4].length - 1; // 29

// ─── Level Definitions (7 levels, coordinates verified against INITIAL_CODE) ─
const LEVELS: LevelSchema[] = [
  // ── L1 Gateway ───────────────────────────────────────────────────────────
  {
    id: 1, minSteps: 20,
    videoUrl: undefined,
    keys: 'i → Esc',
    commands: [
      { key: 'i',   desc: '进入 Insert 模式（光标变细线）', category: '模式切换' },
      { key: 'Esc', desc: '返回 Normal 模式（光标变方块）', category: '模式切换' },
    ],
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
    videoUrl: undefined,
    keys: 'h  j  k  l',
    commands: [
      { key: 'h', desc: '向左移动一个字符', category: '移动' },
      { key: 'j', desc: '向下移动一行',     category: '移动' },
      { key: 'k', desc: '向上移动一行',     category: '移动' },
      { key: 'l', desc: '向右移动一个字符', category: '移动' },
    ],
    instruction:
      '忘掉鼠标！只用 h/j/k/l 四键导航。' +
      '目标：移动到第 7 行 int pivot 中 "pivot" 的首字母 p 上。',
    target: { row: 6, col: 8 },
    validate: (snap) => snap.line === 6 && snap.col === 8,
  },

  // ── L3 Leap ───────────────────────────────────────────────────────────────
  // dynamicTarget: 根据玩家当前光标动态算出下一个 w 的落点
  {
    id: 3, minSteps: 6,
    videoUrl: undefined,
    keys: 'w  e  b',
    commands: [
      { key: 'w', desc: '跳到下一词首',       category: '词跳跃' },
      { key: 'e', desc: '跳到当前/下一词尾', category: '词跳跃' },
      { key: 'b', desc: '跳到上一词首',       category: '词跳跃' },
    ],
    instruction:
      '逐字符移动太慢！用 w（词首）e（词尾）b（前词）高速跳跃。' +
      '目标：跳到第 9 行 for 循环中的变量 j。',
    dynamicTarget: (cursor, buffer) =>
      nextWPosition(buffer, cursor.row, cursor.col),
    validate: (snap, mode, ctx) => {
      if (mode !== 'normal') return false;
      const start = ctx.current.startCursor;
      if (!start) return snap.line === 8 && snap.col === 13; // fallback
      const expected = nextWPosition(snap.code.split('\n'), start.row, start.col);
      return !!expected && snap.line === expected.row && snap.col === expected.col;
    },
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
    videoUrl: undefined,
    keys: '0  $',
    commands: [
      { key: '0', desc: '跳到行首（第 0 列）', category: '行跳跃' },
      { key: '$', desc: '跳到行尾',             category: '行跳跃' },
      { key: '^', desc: '跳到行首非空字符',     category: '行跳跃' },
    ],
    instruction:
      '用 0 跳到行首，$ 跳到行尾。移到第 5 行长注释上，依次按 0 和 $，通关！',
    targets: [{ row: 4, col: 0 }, { row: 4, col: L4_END_COL }],
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
    videoUrl: undefined,
    keys: 'o  O',
    commands: [
      { key: 'o',   desc: '下方开辟新行并进入 Insert', category: '新建行' },
      { key: 'O',   desc: '上方开辟新行并进入 Insert', category: '新建行' },
      { key: 'Esc', desc: '返回 Normal 模式',           category: '模式切换' },
    ],
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
    videoUrl: undefined,
    keys: 'ciw  cw  x',
    commands: [
      { key: 'x',   desc: '删除光标下的单个字符',     category: '删改' },
      { key: 'cw',  desc: '删除到词尾并进入 Insert',   category: '删改' },
      { key: 'ciw', desc: '删除整个单词并进入 Insert', category: '删改' },
      { key: 'Esc', desc: '返回 Normal 模式',           category: '模式切换' },
    ],
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
    videoUrl: undefined,
    keys: 'w  b  f  /n',
    commands: [
      { key: 'w',      desc: '跳到下一词首',         category: '语义跳跃' },
      { key: 'b',      desc: '跳到上一词首',         category: '语义跳跃' },
      { key: 'f{c}',  desc: '跳到行内下一个字符 c', category: '语义跳跃' },
      { key: '/{pat}', desc: '向下搜索模式',         category: '搜索' },
      { key: 'n',      desc: '跳到下一个搜索匹配',   category: '搜索' },
    ],
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

// ─── Command Sidebar ─────────────────────────────────────────────────────────
interface CommandSidebarProps {
  commands?: VimCommand[];
  levelKeys: string;
  levelId: number;
  instruction?: string; // + 新增
}

function CommandSidebar({ commands, levelKeys, levelId, instruction }: CommandSidebarProps) {
  const groups = commands
    ? commands.reduce<Record<string, VimCommand[]>>((acc, cmd) => {
        const cat = cmd.category ?? '指令';
        (acc[cat] ??= []).push(cmd);
        return acc;
      }, {})
    : null;

  return (
    <aside className="command-sidebar" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="sidebar-header">Level {levelId} 任务目标</div>
      
      {/* + 任务说明区域：常驻显示，方便玩家随时查看 */}
      {instruction && (
        <div style={{ padding: '14px', borderBottom: '1px solid #1e1e1e', fontSize: '13px', color: '#F0F6FC', lineHeight: 1.6, whiteSpace: 'pre-wrap', fontWeight: 500 }}>
          {instruction}
        </div>
      )}

      <div className="sidebar-header" style={{ borderTop: instruction ? 'none' : '1px solid #1e1e1e' }}>指令速查</div>
      
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {groups ? (
          Object.entries(groups).map(([cat, cmds]) => (
            <div key={cat} className="cmd-group">
              <div className="cmd-group-label">{cat}</div>
              {cmds.map(cmd => (
                <div key={cmd.key} className="cmd-row">
                  <kbd className="vim-key">{cmd.key}</kbd>
                  <span className="cmd-desc">{cmd.desc}</span>
                </div>
              ))}
            </div>
          ))
        ) : (
          <div className="cmd-fallback">{levelKeys}</div>
        )}
      </div>
    </aside>
  );
}

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
  const [showIntro, setShowIntro] = useState(true);
  const showIntroRef = useRef(true);
  showIntroRef.current = showIntro;

  // + 修复：全局拦截任意键以关闭弹窗，避免焦点丢失导致死锁
  useEffect(() => {
    if (!showIntro) return;
    const handleModalKey = (e: KeyboardEvent) => {
      if (['Control','Alt','Shift','Meta','CapsLock','Tab'].includes(e.key)) return;
      e.preventDefault();
      e.stopPropagation();
      setShowIntro(false);
      // 弹窗消失后，强制将光标焦点还给编辑器
      requestAnimationFrame(() => editorViewRef.current?.focus());
    };
    // 使用 capture: true 在事件捕获阶段最先拦截全局按键
    window.addEventListener('keydown', handleModalKey, { capture: true });
    return () => window.removeEventListener('keydown', handleModalKey, { capture: true });
  }, [showIntro]);

  const [isChallengeMode, setIsChallengeMode] = useState(false); // false=Zen, true=Challenge
  const [showMetrics, setShowMetrics]         = useState(false); // toggle step-count display
  const [showVideo, setShowVideo]             = useState(false); // video demo modal
  const [levelStepsLog, setLevelStepsLog]     = useState<number[]>([]); // player steps per completed level
  // editorView: set in onCreateEditor, triggers the vim-mode-change useEffect
  const [editorView, setEditorView] = useState<EditorView | null>(null);
  // Ref mirror of editorView — allows stable callbacks to read the latest view
  // without triggering re-renders or closing over a stale value.
  const editorViewRef = useRef<EditorView | null>(null);

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
  // Waypoint index: tracks which ghost cursor target is currently active (multi-step levels)
  const waypointIdxRef   = useRef(0);
  const [waypointIdx, setWaypointIdx] = useState(0);
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
      // Record this level's player step count before advancing
      setLevelStepsLog(prev => {
        const updated = [...prev];
        updated[levelIdxRef.current] = entropyRef.current;
        return updated;
      });
      const next = Math.min(levelIdxRef.current + 1, LEVELS.length - 1);
      levelIdxRef.current  = next;
      alreadyDoneRef.current = false;
      setShowVideo(false); // close video modal on level change
      setLevelIdx(next);
    }, 1200);
  };

  // ── Validator ─────────────────────────────────────────────────────────────
  const validateRef = useRef<(s: EditorSnapshot, m: VimMode) => void>(() => {});
  validateRef.current = (s, m) => {
    if (alreadyDoneRef.current) return;
    customCtxRef.current._entropy = entropyRef.current; // expose for level validate fns
    // ── Waypoint advancement (multi-step levels, e.g. L4 0→$) ────────────────
    const lvl = LEVELS[levelIdxRef.current];
    if (lvl.targets && lvl.targets.length > 1) {
      const wpIdx = waypointIdxRef.current;
      const wp    = lvl.targets[wpIdx];
      if (s.line === wp.row && s.col === wp.col && wpIdx < lvl.targets.length - 1) {
        const nextIdx = wpIdx + 1;
        waypointIdxRef.current = nextIdx;
        setWaypointIdx(nextIdx);
        const view = editorViewRef.current;
        if (view) {
          // Defer: must not synchronously dispatch inside a CM update cycle
          Promise.resolve().then(() =>
            view.dispatch({ effects: setGhostTarget.of(lvl.targets![nextIdx]) })
          );
        }
      }
    }
    if (lvl.validate(s, m, customCtxRef)) {
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

  // Stable ref to commitModeChange — allows the stable handleCreateEditor
  // callback (useCallback []) to always invoke the latest version without
  // stale-closure issues.
  const commitModeChangeRef = useRef(commitModeChange);
  commitModeChangeRef.current = commitModeChange;

  // ── onUpdate: tracks cursor position + triggers validation ───────────────
  // Mode detection is now handled via cm.on("vim-mode-change") in
  // handleCreateEditor — no DOM class heuristics needed here.
  const handleUpdate = useCallback((update: any) => {
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

  // ── onCreateEditor: ghost cursor + initial snap + store view for useEffect ─
  const handleCreateEditor = useCallback((view: EditorView) => {
    const doc = view.state.doc;
    const ns: EditorSnapshot = {
      line: 0, col: 0,
      code: doc.toString(),
      lineCount: doc.lines,
    };
    setSnap(ns);
    snapRef.current = ns;

    const lvlCreate   = LEVELS[levelIdxRef.current];
    const firstTarget = lvlCreate.targets?.[0] ?? lvlCreate.target ?? null;
    Promise.resolve().then(() =>
      view.dispatch({ effects: setGhostTarget.of(firstTarget) })
    );

    // Trigger the vim-mode-change useEffect by storing the fresh view.
    // We must NOT call getCM(view).on(...) here because this runs inside
    // @uiw/react-codemirror's useLayoutEffect, and React StrictMode's
    // double-invoke can silently drop the listener.  The dedicated
    // useEffect([editorView, levelIdx]) below is the single reliable place
    // to bind and clean up the CM5 event listener.
    editorViewRef.current = view;
    setEditorView(view);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // all state via refs — intentionally stable

  // ── 1. 关卡状态预备 (触发于关卡序号切换时) ────────────────────────────────
  useEffect(() => {
    alreadyDoneRef.current = false;
    entropyRef.current = 0;
    setEntropy(0);
    modeHistoryRef.current = []; // clear sequence tracker for the new level
    waypointIdxRef.current = 0;  // reset waypoint to first target
    setWaypointIdx(0);

    // 核心：只弹出教学弹窗，绝对不触碰底层的 CodeMirror！保留上一关的胜利现场。
    setShowIntro(true);
  }, [levelIdx]);

  // ── 2. 战场真实切换 (触发于玩家按下任意键关闭弹窗时) ──────────────────────
  useEffect(() => {
    // 只要弹窗还在，就冻结上一关的战场画面
    if (showIntro) return;

    const view = editorViewRef.current;
    if (!view) return;

    // 玩家关闭弹窗，此时才真正重置模式、替换代码、设置新目标
    setVimMode('normal');
    vimModeRef.current = 'normal';

    const lvlReset = LEVELS[levelIdx];
    const buffer   = view.state.doc.toString().split('\n');

    // 获取当前真实的物理光标位置
    const head      = view.state.selection.main.head;
    const lineObj   = view.state.doc.lineAt(head);
    const currentCursor = { row: lineObj.number - 1, col: head - lineObj.from };

    // 将起始光标存入 customCtxRef，供动态 validate 比对用
    customCtxRef.current.startCursor = currentCursor;

    // 优先计算动态靶点，如果没有则降级使用静态 target
    let computedTarget: { row: number; col: number } | null = null;
    if (typeof lvlReset.dynamicTarget === 'function') {
      computedTarget = lvlReset.dynamicTarget(currentCursor, buffer);
    }
    const firstTarget = computedTarget ?? lvlReset.targets?.[0] ?? lvlReset.target ?? null;
    view.dispatch({ effects: setGhostTarget.of(firstTarget) });

    // Replace doc only when the code content actually changes
    const nextCode = lvlReset.initialCode ?? INITIAL_CODE;
    const curCode  = view.state.doc.toString();
    if (nextCode !== curCode) {
      view.dispatch({
        changes: { from: 0, to: curCode.length, insert: nextCode },
      });
    }

    // 引擎级支持：如果关卡配置了初始光标位置，则自动将光标传送过去
    if (lvlReset.initialCursor) {
      try {
        const pos = view.state.doc.line(lvlReset.initialCursor.row + 1).from + lvlReset.initialCursor.col;
        view.dispatch({ selection: { anchor: pos } });
      } catch { /* 忽略越界错误 */ }
    }

    requestAnimationFrame(() => { view.focus(); });
  }, [showIntro, levelIdx]);

  // ── Bullet-proof vim-mode-change listener ─────────────────────────────────
  // Runs AFTER paint (useEffect, not useLayoutEffect) so the CM5 adapter is
  // fully initialised.  React guarantees cleanup fires before the next run,
  // which is what correctly removes the stale listener when the editor is
  // remounted on level change (key={levelIdx}).
  //
  // Why not in onCreateEditor?  @uiw/react-codemirror calls onCreateEditor
  // inside its own useLayoutEffect([container, state]).  React StrictMode
  // double-invokes layout effects; the cleanup resets `state` to undefined
  // but does NOT immediately destroy the view — the result is a silently
  // orphaned listener that never fires.  Moving the binding here is the fix.
  useEffect(() => {
    if (!editorView) return;
    const cm = getCM(editorView);
    if (!cm) return;

    const VALID_MODES: VimMode[] = ['normal', 'insert', 'visual', 'replace'];
    const handler = (e: { mode: string; subMode?: string }) => {
      const next: VimMode = VALID_MODES.includes(e.mode as VimMode)
        ? (e.mode as VimMode)
        : 'normal';
      commitModeChangeRef.current(next);
    };

    cm.on('vim-mode-change', handler);
    return () => { cm.off('vim-mode-change', handler); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorView, levelIdx]); // re-bind whenever editor is recreated or level changes

  // ── Unified keydown: entropy counting + level-specific handler ────────────
  // All non-modifier keypresses increment entropy. Arrow keys carry a +20 penalty
  // (relevant for L7) to discourage directional navigation.
  // Mode detection is now handled by the vim-mode-change event listener set up
  // in handleCreateEditor — no rAF heuristics needed here.
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelIdx]);

  // ── Stable extensions ─────────────────────────────────────────────────────
  // forceHeight injects:
  //   1. OLED-black background overrides (beat vscodeDark's #1e1e1e)
  //   2. Line-number: normal=mid-gray #666666, active=pure #FFFFFF block + clean blue bar
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
      // Normal line numbers — mid gray; contrast with pure-white active creates
      // maximum visual pop without any glow trickery
      '.cm-lineNumbers .cm-gutterElement': {
        color:      '#666666',
        fontWeight: 'normal',
        padding:    '0 8px 0 4px',
        background: 'transparent',
        borderLeft: 'none',
      },
      // Active-line gutter: solid translucent block + clean blue left bar.
      // Pure #FFFFFF 700-weight + WebkitTextStroke concentrates all photons
      // on the stroke itself — sharper and subjectively brighter than any glow.
      // No textShadow, no box-shadow: zero blur, zero energy dissipation.
      '.cm-activeLineGutter': {
        background:       'rgba(255, 255, 255, 0.12)',
        color:            '#FFFFFF !important',
        fontWeight:       '700',
        WebkitTextStroke: '0.5px #FFFFFF',
        borderLeft:       '3px solid #528bff',
        padding:          '0 8px 0 1px',
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

  const level         = LEVELS[levelIdx];
  const isLastLevel   = levelIdx === LEVELS.length - 1;
  const currentCode   = level.initialCode ?? INITIAL_CODE;
  // Active ghost cursor target: follows waypoint progression for multi-step levels
  const currentTarget = level.targets?.[waypointIdx] ?? level.target ?? null;

  // ── Cumulative step metrics ───────────────────────────────────────────────
  // Sum of minSteps from L1 through current level (best-possible cumulative score)
  const cumulativeBestSteps = useMemo(() =>
    LEVELS.slice(0, levelIdx + 1).reduce((sum, l) => sum + (l.minSteps ?? 0), 0),
  [levelIdx]);
  // Sum of player steps in completed levels + current level's running count
  const cumulativePlayerSteps = useMemo(() =>
    levelStepsLog.slice(0, levelIdx).reduce((sum, s) => sum + (s ?? 0), 0) + entropy,
  [levelStepsLog, levelIdx, entropy]);

  // ── Entropy blur (Bug 2 fix) ──────────────────────────────────────────────
  // Rules:
  //  • Levels 0-3 (L1-L4, tutorial): ZERO blur — always crystal-clear.
  //  • Levels 4+ : blur starts ONLY when entropy ≥ minSteps × 3 (3× optimal).
  //    Formula starts at 1 px, ramps up gradually (+0.3 px per extra key), max 4 px.
  //  • Blur is scoped to .cm-content only (passed via CSS variable --contentBlur).
  //    The gutter / line-numbers are NEVER blurred.
  const minSteps       = level.minSteps ?? Infinity;
  const isTutorialLevel = levelIdx < 4;          // L1-L4: no penalty
  const blurPxContent  = (isChallengeMode && !isTutorialLevel && isFinite(minSteps))
    ? Math.max(0, Math.min(4, 1 + (entropy - minSteps * 3) * 0.3))
    : 0;
  // Mode filter (saturate / grayscale) stays on the full container — it never
  // causes blur, only a subtle colour-saturation shift on mode change.
  const modeFilter  = vimMode === 'insert' ? 'saturate(115%)' : 'grayscale(12%)';

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

      {/* + 重构后的新技能解锁弹窗 UI：透明、不挡代码 */}
      {showIntro && (
        <div style={{ position: 'fixed', inset: 0, background: 'transparent', zIndex: 150, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '15vh' }} onClick={() => { setShowIntro(false); requestAnimationFrame(() => editorViewRef.current?.focus()); }}>
          <div style={{ background: 'rgba(13, 13, 13, 0.95)', border: '1px solid rgba(88, 166, 255, 0.5)', borderRadius: '8px', padding: '25px 40px', display: 'flex', alignItems: 'center', gap: '30px', boxShadow: '0 20px 40px rgba(0,0,0,0.5), 0 0 20px rgba(88, 166, 255, 0.15)', animation: 'slide-down 0.2s ease-out' }} onClick={e => e.stopPropagation()}>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 600 }}>Level {levelIdx + 1}</div>
              <div style={{ fontSize: '20px', color: '#FFFFFF', fontWeight: 700 }}>解锁新操作</div>
              {/* 简化了弹窗内的文字，因为右侧已经有了详细说明 */}
              <div style={{ marginTop: '12px', fontSize: '12px', color: '#58A6FF', fontWeight: 600, animation: 'ghost-pulse 2s infinite' }}>
                [ 按任意键开始 ]
              </div>
            </div>

            <div style={{ flexShrink: 0 }}>
              <span style={{ color: '#58A6FF', fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: '32px', padding: '8px 16px', background: 'rgba(88,166,255,0.1)', borderRadius: '8px', display: 'inline-block', border: '1px solid rgba(88,166,255,0.3)' }}>{level.keys}</span>
            </div>

          </div>
        </div>
      )}

      <PanelGroup direction="horizontal" id="root-h" style={{ flex: '1 1 0%', minHeight: 0 }}>

        {/* ── Left: Editor + Dashboard ── */}
        <Panel defaultSize={75} minSize={40} id="left-panel">
          <PanelGroup direction="vertical" id="root-v" style={{ height: '100%' }}>

            {/* Editor */}
            <Panel defaultSize={70} minSize={30} id="editor-panel">
              <div
                className={`editor-container${vimMode === 'insert' ? ' mode-insert-active' : ''}`}
                ref={wrapperRef}
                style={{
                  filter: modeFilter,
                  ['--contentBlur' as string]: `${blurPxContent.toFixed(1)}px`,
                }}
              >
                <CodeMirror
                  ref={editorRef}
                  value={currentCode}
                  height="100%"
                  theme={vscodeDark}
                  extensions={extensions}
                  onUpdate={handleUpdate}
                  onCreateEditor={handleCreateEditor}
                  basicSetup={{
                    lineNumbers:               true,
                    highlightActiveLineGutter: false,
                    highlightActiveLine:       false,
                    drawSelection:             false,
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
            </Panel>

            <PanelResizeHandle className="resize-handle-h" />

            {/* Dashboard */}
            <Panel defaultSize={30} minSize={15} maxSize={55} id="dashboard-panel">
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
                    {level.videoUrl && (
                      <button className="video-btn" onClick={() => setShowVideo(true)}>
                        ▶ 大神操作
                      </button>
                    )}
                  </div>

                  <p className="level-instruction">{level.instruction}</p>

                  <div className="status-bar">
                    <span className="status-pos">
                      Ln <strong>{snap.line + 1}</strong>, Col <strong>{snap.col + 1}</strong>
                    </span>
                    <span className={`status-mode mode-${vimMode}`}>
                      {vimMode.toUpperCase()}
                    </span>
                    {showMetrics && (
                      <span className={`status-entropy${blurPxContent > 0.05 ? ' penalty' : ''}`}>
                        ⚡ {cumulativePlayerSteps}
                        <span className="entropy-limit"> / {cumulativeBestSteps} 最优</span>
                      </span>
                    )}
                    <div className="status-bar-right">
                      {currentTarget && (
                        <span className="status-target">
                          🎯 目标 Ln {currentTarget.row + 1}, Col {currentTarget.col + 1}
                        </span>
                      )}
                      <button
                        className="mode-toggle"
                        onClick={() => setShowMetrics(v => !v)}
                        title={showMetrics ? '隐藏步数统计' : '显示步数统计'}
                      >
                        {showMetrics ? '📊 统计' : '📊'}
                      </button>
                      <button
                        className={`mode-toggle${isChallengeMode ? ' active' : ''}`}
                        onClick={() => setIsChallengeMode(v => !v)}
                        title={isChallengeMode ? '挑战模式 — 点击切换为禅定' : '禅定模式 — 点击开启挑战'}
                      >
                        {isChallengeMode ? '⚔ 挑战' : '☯ 禅定'}
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            </Panel>

          </PanelGroup>
        </Panel>

        <PanelResizeHandle className="resize-handle-v" />

        {/* ── Right: Command Sidebar ── */}
        <Panel defaultSize={25} minSize={15} maxSize={45} id="sidebar-panel" collapsible>
          <CommandSidebar
            commands={level.commands}
            levelKeys={level.keys}
            levelId={levelIdx + 1}
            instruction={level.instruction || (level as any).taskDescription} // + 传入文字
          />
        </Panel>

      </PanelGroup>

      {/* Video modal */}
      {showVideo && level.videoUrl && (
        <div className="video-overlay" onClick={() => setShowVideo(false)}>
          <div className="video-modal" onClick={e => e.stopPropagation()}>
            <button className="video-close" onClick={() => setShowVideo(false)}>✕</button>
            <video src={level.videoUrl} autoPlay controls loop style={{ width: '100%', borderRadius: '4px' }} />
          </div>
        </div>
      )}
    </div>
  );
}

