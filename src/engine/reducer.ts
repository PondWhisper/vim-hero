// ─── Shared Types ─────────────────────────────────────────────────────────────
// Extracted from App.tsx — single source of truth for game-level type shapes.

export type VimMode = 'normal' | 'insert' | 'visual' | 'replace';

export interface EditorSnapshot {
  line: number;      // 0-indexed
  col: number;       // 0-indexed
  code: string;
  lineCount: number;
}

export interface VimCommand {
  key: string;        // displayed in <kbd>
  desc: string;       // short Chinese description
  category?: string;  // grouping label
}

export interface LevelSchema {
  id: number;
  keys: string;
  instruction: string;
  minSteps?: number;      // theoretical optimal keystrokes (entropy threshold)
  initialCode?: string;  // per-level code, falls back to INITIAL_CODE
  target?: { row: number; col: number };
  targets?: { row: number; col: number }[];  // ordered waypoints for multi-step levels
  videoUrl?: string;                          // optimal-solution demo video (local path or URL)
  commands?: VimCommand[];                    // sidebar quick-reference
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
