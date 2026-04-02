import type {
  VimMode,
  EditorSnapshot,
  VimCommand,
  TargetAction,
  SemanticWaypoint,
  CommandKeys,
  InitialCursor,
} from '../types/level';

// ─── LevelConfig ─────────────────────────────────────────────────────────────
// Single source of truth for all level data.  The engine (App.tsx) reads from
// VIM_LEVELS[currentIndex] and NEVER has hard-coded level content.
//
// Win-condition resolution order (first truthy wins):
//   1. validate(snap, mode, ctx) — if provided, always takes priority
//   2. targetCode !== undefined  — engine auto-checks snap.code === targetCode
//
// At least one of the two MUST be present or the level is unwinnable.
export interface LevelConfig {
  // ── Identity ─────────────────────────────────────────────────────────────
  id:              number;
  title:           string;        // human-readable level name
  keys:            string;        // badge text shown in sidebar (e.g. "w  e  b")

  // ── Content ──────────────────────────────────────────────────────────────
  initialCode:     string;        // editor content when this level starts (required)
  taskDescription: string;        // player-facing instructions
  targetCode?:     string;        // if set, used for automatic win detection

  // ── Cursor placement ──────────────────────────────────────────────────────
  /** Where the real (vim) cursor lands when this level loads. 0-indexed. */
  initialCursor?:  InitialCursor;

  // ── Ghost cursor / waypoints ──────────────────────────────────────────────
  target?:          { row: number; col: number };
  targets?:         { row: number; col: number }[];
  targetAction?:    TargetAction;
  semanticTarget?:  SemanticWaypoint;
  semanticTargets?: SemanticWaypoint[];

  // ── Metadata ──────────────────────────────────────────────────────────────
  optimalSteps?:   number;        // theoretical minimum keystrokes (used for entropy HUD)
  videoUrl?:       string;        // path/URL to optimal-solution demo video
  arrowGuard?:     boolean;       // if true, physical arrow keys flash red border and are blocked
  /**
   * Registry-based command list (keys from COMMAND_REGISTRY in engine/commands.ts).
   * CommandSidebar resolves these via resolveCommands() and merges with inline
   * `commands`. commandKeys entries are listed first.
   */
  commandKeys?:    CommandKeys;
  commands?:       VimCommand[];  // inline cheatsheet entries (fallback / supplement)

  // ── Logic hooks (optional) ────────────────────────────────────────────────
  validate?: (
    snap: EditorSnapshot,
    mode: VimMode,
    ctx:  { current: Record<string, any> }
  ) => boolean;
  onKeyDown?: (
    e:         KeyboardEvent,
    ctx:       { current: Record<string, any> },
    showToast: (msg: string) => void
  ) => void;
}

// ─── Placeholder Levels ───────────────────────────────────────────────────────
// These are minimal scaffold levels to verify engine wiring.
// Replace with real level designs when ready.

const SCAFFOLD_CODE = `// Vim Hero — 关卡占位代码
// 请在 src/config/levels.ts 中替换为真实关卡内容

int main() {
    int x = 0;
    return x;
}`;

// ─── Level 1 Buffer: realistic tailwind.config.js (200 lines) ────────────────
// Row 100 (0-indexed) is the "module.exports = {" closing brace area —
// dropping the player into the middle of a real-world config file demonstrates
// that Normal mode is a "tactical view" over large codebases.
const TAILWIND_CONFIG_L1 = `// tailwind.config.js
// Auto-generated design-system config for a production SaaS dashboard.
// 200 lines — scroll freely in Normal mode before completing the task.

/** @type {import('tailwindcss').Config} */

// ─── Helpers ────────────────────────────────────────────────────────────────

function rem(px) {
  return \`\${px / 16}rem\`;
}

function withOpacity(variable) {
  return ({ opacityValue }) =>
    opacityValue !== undefined
      ? \`rgba(var(\${variable}), \${opacityValue})\`
      : \`rgb(var(\${variable}))\`;
}

const BRAND = {
  50:  '#f0f4ff',
  100: '#dce6ff',
  200: '#baccff',
  300: '#90aaff',
  400: '#6382fb',
  500: '#4361ee',
  600: '#3244d4',
  700: '#2535ab',
  800: '#1d2b89',
  900: '#17246e',
  950: '#0f1647',
};

const NEUTRAL = {
  0:   '#ffffff',
  50:  '#f8f9fa',
  100: '#f1f3f5',
  200: '#e9ecef',
  300: '#dee2e6',
  400: '#ced4da',
  500: '#adb5bd',
  600: '#868e96',
  700: '#495057',
  800: '#343a40',
  900: '#212529',
  950: '#0d0f12',
};

const SEMANTIC = {
  success: { DEFAULT: '#2dce89', light: '#b8f5d8', dark: '#1aae6f' },
  warning: { DEFAULT: '#fb8c00', light: '#ffe3b3', dark: '#c96a00' },
  danger:  { DEFAULT: '#f5365c', light: '#ffc0cc', dark: '#c0183a' },
  info:    { DEFAULT: '#11cdef', light: '#b3f5ff', dark: '#0da5c6' },
};

// ─── Spacing scale ───────────────────────────────────────────────────────────

const SPACING = {
  px:   '1px',
  0:    '0px',
  0.5:  rem(2),
  1:    rem(4),
  1.5:  rem(6),
  2:    rem(8),
  2.5:  rem(10),
  3:    rem(12),
  3.5:  rem(14),
  4:    rem(16),
  5:    rem(20),
  6:    rem(24),
  7:    rem(28),
  8:    rem(32),
  9:    rem(36),
  10:   rem(40),
  11:   rem(44),
  12:   rem(48),
  14:   rem(56),
  16:   rem(64),
  20:   rem(80),
  24:   rem(96),
  28:   rem(112),
  32:   rem(128),
  36:   rem(144),
  40:   rem(160),
  44:   rem(176),
  48:   rem(192),
  52:   rem(208),
  56:   rem(224),
  60:   rem(240),
  64:   rem(256),
  72:   rem(288),
  80:   rem(320),
  96:   rem(384),
};

// ─── Typography ──────────────────────────────────────────────────────────────

const FONT_SANS = [
  'Inter',
  'ui-sans-serif',
  'system-ui',
  '-apple-system',
  'BlinkMacSystemFont',
  '"Segoe UI"',
  'Roboto',
  '"Helvetica Neue"',
  'Arial',
  'sans-serif',
];

const FONT_MONO = [
  '"JetBrains Mono"',
  '"Fira Code"',
  '"Cascadia Code"',
  'ui-monospace',
  'SFMono-Regular',
  'Menlo',
  'Monaco',
  '"Courier New"',
  'monospace',
];

// ─── Main config export ──────────────────────────────────────────────────────

module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './stories/**/*.{js,ts,jsx,tsx}',
    './packages/*/src/**/*.{js,ts,jsx,tsx}',
  ],

  darkMode: 'class',

  theme: {
    screens: {
      xs:  '475px',
      sm:  '640px',
      md:  '768px',
      lg:  '1024px',
      xl:  '1280px',
      '2xl': '1536px',
    },

    spacing: SPACING,

    colors: {
      transparent: 'transparent',
      current:     'currentColor',
      white:       '#ffffff',
      black:       '#000000',
      brand:       BRAND,
      neutral:     NEUTRAL,
      ...SEMANTIC,
    },

    fontFamily: {
      sans: FONT_SANS,
      mono: FONT_MONO,
    },

    fontSize: {
      xs:   [rem(11), { lineHeight: rem(16) }],
      sm:   [rem(12), { lineHeight: rem(18) }],
      base: [rem(14), { lineHeight: rem(20) }],
      md:   [rem(15), { lineHeight: rem(22) }],
      lg:   [rem(16), { lineHeight: rem(24) }],
      xl:   [rem(18), { lineHeight: rem(28) }],
      '2xl':[rem(20), { lineHeight: rem(30) }],
      '3xl':[rem(24), { lineHeight: rem(36) }],
      '4xl':[rem(30), { lineHeight: rem(40) }],
      '5xl':[rem(36), { lineHeight: '1' }],
      '6xl':[rem(48), { lineHeight: '1' }],
    },

    borderRadius: {
      none: '0',
      sm:   rem(2),
      DEFAULT: rem(4),
      md:   rem(6),
      lg:   rem(8),
      xl:   rem(12),
      '2xl':rem(16),
      '3xl':rem(24),
      full: '9999px',
    },

    boxShadow: {
      sm:   '0 1px 2px 0 rgba(0,0,0,0.05)',
      DEFAULT: '0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)',
      md:   '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)',
      lg:   '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)',
      xl:   '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
      '2xl':'0 25px 50px -12px rgba(0,0,0,0.25)',
      inner:'inset 0 2px 4px 0 rgba(0,0,0,0.05)',
      none: 'none',
    },

    extend: {
      colors: {
        // CSS-variable powered tokens — used with Tailwind's opacity modifier.
        primary:   withOpacity('--color-primary'),
        secondary: withOpacity('--color-secondary'),
        surface:   withOpacity('--color-surface'),
        overlay:   withOpacity('--color-overlay'),
      },

      animation: {
        'fade-in':      'fadeIn 0.2s ease-out',
        'fade-out':     'fadeOut 0.2s ease-in',
        'slide-up':     'slideUp 0.3s cubic-bezier(0.16,1,0.3,1)',
        'slide-down':   'slideDown 0.3s cubic-bezier(0.16,1,0.3,1)',
        'scale-in':     'scaleIn 0.2s ease-out',
        'spin-slow':    'spin 3s linear infinite',
        'ping-once':    'ping 0.6s ease-out 1',
        'bounce-light': 'bounceLt 0.8s ease infinite',
      },

      keyframes: {
        fadeIn:    { from: { opacity: '0' },              to: { opacity: '1' } },
        fadeOut:   { from: { opacity: '1' },              to: { opacity: '0' } },
        slideUp:   { from: { transform: 'translateY(8px)', opacity: '0' },
                     to:   { transform: 'translateY(0)',   opacity: '1' } },
        slideDown: { from: { transform: 'translateY(-8px)', opacity: '0' },
                     to:   { transform: 'translateY(0)',    opacity: '1' } },
        scaleIn:   { from: { transform: 'scale(0.95)', opacity: '0' },
                     to:   { transform: 'scale(1)',    opacity: '1' } },
        bounceLt:  { '0%,100%': { transform: 'translateY(-3px)' },
                     '50%':     { transform: 'translateY(0)' } },
      },

      transitionTimingFunction: {
        'spring':      'cubic-bezier(0.16, 1, 0.3, 1)',
        'ease-in-expo':'cubic-bezier(0.7, 0, 0.84, 0)',
        'ease-out-expo':'cubic-bezier(0.16, 1, 0.3, 1)',
      },

      zIndex: {
        1:   '1',
        2:   '2',
        60:  '60',
        70:  '70',
        80:  '80',
        90:  '90',
        100: '100',
      },
    },
  },

  plugins: [
    require('@tailwindcss/forms')({
      strategy: 'class',
    }),
    require('@tailwindcss/typography'),
    require('@tailwindcss/container-queries'),
    require('@tailwindcss/aspect-ratio'),
    // Custom plugin: fluid typography via clamp()
    function ({ addUtilities }) {
      addUtilities({
        '.text-fluid-sm': {
          fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)',
        },
        '.text-fluid-base': {
          fontSize: 'clamp(0.875rem, 2vw, 1rem)',
        },
        '.text-fluid-lg': {
          fontSize: 'clamp(1rem, 2.5vw, 1.25rem)',
        },
        '.text-fluid-xl': {
          fontSize: 'clamp(1.25rem, 3vw, 1.75rem)',
        },
        '.text-fluid-2xl': {
          fontSize: 'clamp(1.5rem, 4vw, 2.25rem)',
        },
      });
    },
  ],
};
`;

// ─── Level 2 Buffer: realistic Express REST API server (~200 lines) ──────────
// Row 44 (0-indexed) = `    router.get('/users', async (req, res, next) => {`
// Col 11 = 'g' (first char of "get") — the hjkl navigation target.
const L2_COMPASS_BUFFER = `/**
 * server.js — Express REST API server
 * Vim Hero — Level 2: The Compass
 * Navigate to the target using only h/j/k/l — Arrow keys are disabled!
 */

'use strict';

const express      = require('express');
const router       = express.Router();
const path         = require('path');
const cors         = require('cors');
const helmet       = require('helmet');
const morgan       = require('morgan');
const rateLimit    = require('express-rate-limit');
const compression  = require('compression');
const cookieParser = require('cookie-parser');

// ─── App & Config ─────────────────────────────────────────────────────────────

const app  = express();
const PORT = process.env.PORT || 3000;
const ENV  = process.env.NODE_ENV || 'development';

// ─── Middleware ──────────────────────────────────────────────────────────────

app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') ?? ['*'] }));
app.use(morgan(ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(compression());
app.use(cookieParser(process.env.COOKIE_SECRET));

// ─── Rate Limiter ────────────────────────────────────────────────────────────

const apiLimiter = rateLimit({
  windowMs:  15 * 60 * 1000,
  max:       100,
  message:   { error: 'Too many requests — please slow down.' },
  standardHeaders: true,
  legacyHeaders:   false,
});

function registerRoutes() {
    router.get('/users', async (req, res, next) => {
      try {
        const page   = parseInt(req.query.page,  10) || 1;
        const limit  = parseInt(req.query.limit, 10) || 20;
        const offset = (page - 1) * limit;
        const [users] = await db.execute(
          'SELECT id, name, email, created_at FROM users LIMIT ? OFFSET ?',
          [limit, offset]
        );
        const [[{ total }]] = await db.execute('SELECT COUNT(*) AS total FROM users');
        res.json({ data: users, total, page, limit });
      } catch (err) { next(err); }
    });

    router.get('/users/:id', async (req, res, next) => {
      try {
        const { id } = req.params;
        const [[user]] = await db.execute('SELECT * FROM users WHERE id = ?', [id]);
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
      } catch (err) { next(err); }
    });

    router.post('/users', async (req, res, next) => {
      try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
          return res.status(400).json({ error: 'name, email and password are required' });
        }
        const hash = await bcrypt.hash(password, 12);
        const [result] = await db.execute(
          'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
          [name, email, hash]
        );
        res.status(201).json({ id: result.insertId, name, email });
      } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(409).json({ error: 'Email already registered' });
        }
        next(err);
      }
    });

    router.put('/users/:id', async (req, res, next) => {
      try {
        const { id } = req.params;
        const { name, email } = req.body;
        await db.execute('UPDATE users SET name=?, email=? WHERE id=?', [name, email, id]);
        res.json({ id, name, email });
      } catch (err) { next(err); }
    });

    router.delete('/users/:id', async (req, res, next) => {
      try {
        const { id } = req.params;
        const [[user]] = await db.execute('SELECT id FROM users WHERE id = ?', [id]);
        if (!user) return res.status(404).json({ error: 'User not found' });
        await db.execute('DELETE FROM users WHERE id = ?', [id]);
        res.status(204).end();
      } catch (err) { next(err); }
    });

    // ── Auth ──────────────────────────────────────────────────────────────────

    router.post('/auth/login', async (req, res, next) => {
      try {
        const { email, password } = req.body;
        if (!email || !password) {
          return res.status(400).json({ error: 'email and password required' });
        }
        const [[user]] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
        const token = jwt.sign(
          { id: user.id, email: user.email },
          process.env.JWT_SECRET,
          { expiresIn: '7d' }
        );
        res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
      } catch (err) { next(err); }
    });

    router.post('/auth/logout', (req, res) => {
      res.clearCookie('token').json({ message: 'Logged out' });
    });

    router.post('/auth/refresh', async (req, res, next) => {
      try {
        const tkn = req.cookies?.token || req.headers.authorization?.split(' ')[1];
        if (!tkn) return res.status(401).json({ error: 'No token provided' });
        const payload = jwt.verify(tkn, process.env.JWT_SECRET);
        const fresh   = jwt.sign(
          { id: payload.id, email: payload.email },
          process.env.JWT_SECRET,
          { expiresIn: '7d' }
        );
        res.json({ token: fresh });
      } catch (err) { next(err); }
    });
}

// ─── Mount ──────────────────────────────────────────────────────────────────

registerRoutes();
app.use('/api', apiLimiter, router);

// ─── Health Check ──────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({
    status:  'ok',
    env:     ENV,
    uptime:  process.uptime(),
    memory:  process.memoryUsage(),
  });
});

// ─── Error Handler ─────────────────────────────────────────────────────────

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  const status  = err.statusCode || err.status || 500;
  const message = err.message    || 'Internal server error';
  if (ENV !== 'production') console.error(err.stack);
  res.status(status).json({ error: message });
});

// ─── Start Server ───────────────────────────────────────────────────────────

function startServer() {
  const server = app.listen(PORT, () => {
    console.log(\`[server] Running on port \${PORT} (\${ENV})\`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(\`[server] Port \${PORT} is already in use\`);
      process.exit(1);
    } else {
      throw err;
    }
  });

  return server;
}

// ─── Graceful Shutdown ──────────────────────────────────────────────────────

let httpServer;

process.on('SIGTERM', () => {
  console.log('[server] SIGTERM received — shutting down gracefully');
  httpServer.close(() => {
    console.log('[server] HTTP server closed');
    process.exit(0);
  });
});

httpServer = startServer();

module.exports = { app, startServer };`;

// ─── Level 3 Buffer: useVimEngine.ts (200 lines) ─────────────────────────────
// Row 60 (0-indexed) = `export const useVimEngine = (config: Config, initial: State) => {`
// initialCursor: { row: 28, col: 2 } — player opens on the `done` field of State.
// semanticTarget anchorOffset 13 → col 13 = 'u' of `useVimEngine`.
const L3_LEAP_BUFFER = `// useVimEngine.ts — Custom React Hook for the Vim Engine FSM
// Vim Hero — Level 3: Leap of Faith
// Your cursor opens inside the State interface on line 29.
// Use  w  e  b  to leap to the function signature on line 61.

import { useCallback, useEffect, useReducer, useRef } from 'react';

// ─── Type Definitions ─────────────────────────────────────────────────────────

export type VimMode = 'normal' | 'insert' | 'visual' | 'replace';

export interface CursorPos {
  row: number;
  col: number;
}

export interface Config {
  arrowGuard:    boolean;
  entropyBudget: number;
  optimalSteps:  number;
  levelId:       number;
  debugMode?:    boolean;
}

export interface State {
  mode:    VimMode;
  cursor:  CursorPos;
  entropy: number;
  done:    boolean;
}

// ─── Action Types ─────────────────────────────────────────────────────────────

type MoveCursor = { type: 'MOVE_CURSOR'; payload: CursorPos };
type SetMode    = { type: 'SET_MODE';    payload: VimMode };
type AddEntropy = { type: 'ADD_ENTROPY'; payload: number  };
type MarkDone   = { type: 'MARK_DONE' };

type Action = MoveCursor | SetMode | AddEntropy | MarkDone;

// ─── Reducer ──────────────────────────────────────────────────────────────────

function vimReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'MOVE_CURSOR':
      return { ...state, cursor: action.payload };
    case 'SET_MODE':
      return { ...state, mode: action.payload };
    case 'ADD_ENTROPY':
      return { ...state, entropy: state.entropy + action.payload };
    case 'MARK_DONE':
      return { ...state, done: true };
    default:
      return state;
  }
}

// ─── useVimEngine Hook ────────────────────────────────────────────────────────
// Core hook that drives the vim-hero engine FSM.
// Returns: dispatch, derived selectors, and entropy tracking utilities.
export const useVimEngine = (config: Config, initial: State) => {
  const [state, dispatch] = useReducer(vimReducer, initial);
  const configRef          = useRef(config);
  const stateRef           = useRef(state);
  stateRef.current         = state;

  // ── Sync config ref ────────────────────────────────────────────────────────
  useEffect(() => { configRef.current = config; }, [config]);

  // ── Move cursor ────────────────────────────────────────────────────────────
  const moveCursor = useCallback((pos: CursorPos): void => {
    if (pos.row < 0 || pos.col < 0) return;
    dispatch({ type: 'MOVE_CURSOR', payload: pos });
  }, []);

  // ── Set mode ───────────────────────────────────────────────────────────────
  const setMode = useCallback((mode: VimMode): void => {
    dispatch({ type: 'SET_MODE', payload: mode });
  }, []);

  // ── Add entropy ────────────────────────────────────────────────────────────
  const addEntropy = useCallback((cost: number): void => {
    if (stateRef.current.entropy + cost > config.entropyBudget) {
      console.warn('[useVimEngine] Entropy budget exceeded');
    }
    dispatch({ type: 'ADD_ENTROPY', payload: cost });
  }, [config.entropyBudget]);

  // ── Mark done ─────────────────────────────────────────────────────────────
  const markDone = useCallback((): void => {
    dispatch({ type: 'MARK_DONE' });
  }, []);

  // ── Derived selectors ──────────────────────────────────────────────────────
  const isNormal  = state.mode === 'normal';
  const isInsert  = state.mode === 'insert';
  const isVisual  = state.mode === 'visual';
  const isReplace = state.mode === 'replace';

  const entropyPct = config.entropyBudget > 0
    ? Math.min(1, state.entropy / config.entropyBudget)
    : 0;

  const efficiency = config.optimalSteps > 0
    ? Math.max(0, 1 - (state.entropy - config.optimalSteps) / config.optimalSteps)
    : 1;

  // ── Keyboard handler ───────────────────────────────────────────────────────
  const handleKey = useCallback((e: KeyboardEvent): void => {
    if (state.done) return;
    if (configRef.current.arrowGuard) {
      const arrows = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
      if (arrows.includes(e.key)) {
        e.preventDefault();
        return;
      }
    }
    addEntropy(1);
  }, [state.done, addEntropy]);

  // ── Mount / unmount ────────────────────────────────────────────────────────
  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  // ── Return API ────────────────────────────────────────────────────────────
  return {
    state,
    dispatch,
    moveCursor,
    setMode,
    addEntropy,
    markDone,
    isNormal,
    isInsert,
    isVisual,
    isReplace,
    entropyPct,
    efficiency,
  };
};

// ─── Serialization ────────────────────────────────────────────────────────────

export function serializeState(s: State): string {
  return JSON.stringify(s);
}

export function deserializeState(raw: string): State {
  try {
    const parsed = JSON.parse(raw) as State;
    if (!parsed.mode || !parsed.cursor) throw new Error('Invalid state');
    return parsed;
  } catch {
    return { mode: 'normal', cursor: { row: 0, col: 0 }, entropy: 0, done: false };
  }
}

// ─── Presets ──────────────────────────────────────────────────────────────────

export const DEFAULT_CONFIG: Config = {
  arrowGuard:    true,
  entropyBudget: 200,
  optimalSteps:  15,
  levelId:       3,
  debugMode:     false,
};

export const DEFAULT_STATE: State = {
  mode:    'normal',
  cursor:  { row: 0, col: 0 },
  entropy: 0,
  done:    false,
};

// ─── Action Creators ──────────────────────────────────────────────────────────

export const moveCursorAction = (pos: CursorPos) => ({
  type:    'MOVE_CURSOR' as const,
  payload: pos,
});

export const setModeAction = (mode: VimMode) => ({
  type:    'SET_MODE' as const,
  payload: mode,
});

export const addEntropyAction = (cost: number) => ({
  type:    'ADD_ENTROPY' as const,
  payload: cost,
});

export const markDoneAction = () => ({
  type: 'MARK_DONE' as const,
});

// ─── Type Exports ─────────────────────────────────────────────────────────────

export type { Action };`;

export const VIM_LEVELS: LevelConfig[] = [
  // ── L1: The Pulse — mode FSM intro ───────────────────────────────────────
  // Player lands in the middle of a 200-line real-world config file.
  // Task: experience the Normal → Insert → Normal state machine by pressing
  //       i then Esc exactly once.  Level clears the instant the round-trip
  //       is detected via the seenInsertToNormal flag.
  {
    id:    1,
    title: 'The Pulse',
    keys:  'i → hello vim! → Esc',
    optimalSteps: 13,
    commandKeys: ['i', 'Esc'],
    initialCode:   TAILWIND_CONFIG_L1,
    initialCursor: { row: 9, col: 5 },
    // Ghost cursor marks the insertion point inside the rem() function body.
    target: { row: 9, col: 5 },
    taskDescription:
      '在大型代码库中，Normal 模式是你的战术视图。\n' +
      '① 按 i 进入 Insert 模式（光标变细线）\n' +
      '② 在光标处输入 hello vim!\n' +
      '③ 按 Esc 返回 Normal 模式（光标变方块）\n' +
      '缓冲区中出现 "hello vim!" 并回到 Normal 模式即可通关。',
    validate: (snap, mode, ctx) => {
      if (!ctx.current.seenInsertToNormal) return false;
      if (mode !== 'normal') return false;
      return snap.code.includes('hello vim!');
    },
  },

  // ── L2: The Compass — hjkl navigation with arrow guard ──────────────────
  // 200-line Express server. Row 44 col 11 = 'g' of router.get('/users').
  // Arrow keys are blocked; pressing one triggers a red-border flash.
  {
    id:    2,
    title: 'The Compass',
    keys:  'h  j  k  l',
    optimalSteps: 55,
    commandKeys: ['h', 'j', 'k', 'l'],
    arrowGuard: true,
    initialCode:   L2_COMPASS_BUFFER,
    initialCursor: { row: 0, col: 0 },
    target: { row: 44, col: 11 },
    taskDescription:
      '禁止使用方向键！按方向键会触发红色警报。\n' +
      '只用 h / j / k / l 将光标导航到第 45 行第 12 列：\n' +
      'router.get 中 "get" 的 "g"（高亮青色光标处）。\n' +
      '到达目标并处于 Normal 模式即可通关。',
    validate: (snap, mode) => snap.line === 44 && snap.col === 11 && mode === 'normal',
  },

  // ── L3: Leap of Faith — w/e/b word motions ───────────────────────────────
  // 200-line useVimEngine.ts hook. Player opens at row 28 col 2 (the `done`
  // field of the State interface).  Target: `useVimEngine` identifier at
  // row 60 col 13.  Efficiency guard: l > 3 presses → toast warning.
  {
    id:    3,
    title: 'Leap of Faith',
    keys:  'w  e  b',
    optimalSteps: 20,
    commandKeys: ['w', 'e', 'b', 'h', 'j', 'k', 'l'],
    arrowGuard: true,
    initialCode:   L3_LEAP_BUFFER,
    initialCursor: { row: 28, col: 2 },
    // Ghost cursor: 'u' of `useVimEngine` on row 60, col 13
    semanticTarget: {
      anchorText:   'export const useVimEngine',
      anchorOffset: 13,
    },
    taskDescription:
      '单词跳跃时代！\n' +
      '光标位于第 29 行 State 接口的 done 字段。\n' +
      '目标：用 w / e / b 跳跃到第 61 行 useVimEngine 函数名处（高亮青色 u）。\n' +
      '⚡ 少用 l——慢慢挪只浪费时间。用 w 大步向前，用 b 精细回退。\n' +
      '到达 useVimEngine 的 "u"（col 14）并处于 Normal 模式即可通关。',
    onKeyDown: (e, ctx, showToast) => {
      if (e.key === 'l') {
        ctx.current.lCount = (ctx.current.lCount ?? 0) + 1;
        if (ctx.current.lCount === 4) {
          showToast("⚡ 你移动太慢！用 'w' 向前跳跃！");
        }
      }
    },
    validate: (snap, mode) => {
      if (mode !== 'normal') return false;
      // col 13 = 'u' of useVimEngine; robust: checks line text, not absolute row
      const line = snap.code.split('\n')[snap.line] ?? '';
      return snap.col === 13 && line.startsWith('export const useVimEngine');
    },
  },
];
