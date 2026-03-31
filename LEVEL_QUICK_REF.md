# Vim Hero - Quick Reference Card

## 🎯 Multi-Step Level System

### Installation Command

```bash
npm install --legacy-peer-deps codemirror @replit/codemirror-vim @uiw/react-codemirror
```

(Already installed - just run `npm run dev`)

---

## 📊 Data Structure

### Level Schema

```typescript
interface Level {
  id: string;
  title: string;
  description?: string;
  initialCode: string;
  steps: Step[];
}
```

### Step Schema

```typescript
interface Step {
  instruction: string;         // User-facing text
  validationType: ValidationType; // CURSOR_MATCH | MODE_MATCH | CODE_MATCH
  targetValue: any;             // Target position, mode, or code
}
```

---

## ✅ Validation Types

| Type | Use Case | Example |
|------|----------|---------|
| `CURSOR_MATCH` | User cursor position | `{ line: 1, ch: 18 }` |
| `MODE_MATCH` | Vim mode switch | `'insert'` or `'normal'` |
| `CODE_MATCH` | Code text change | `'int a = 01;'` |

---

## 🎮 MVP Levels

### Level 1: Basic Movement (1 Step)

```
Initial Code:
  int sum(int a, int b) {
      return a + b;
  }

Step 1: Move to line 2's end
  Type: CURSOR_MATCH
  Target: { line: 1, ch: 18 }
```

### Level 2: Intro to Modes (3 Steps)

```
Initial Code: int a = 1;

Step 1: Enter Insert mode
  Type: MODE_MATCH
  Target: 'insert'

Step 2: Type '0' to make it "int a = 01;"
  Type: CODE_MATCH
  Target: 'int a = 01;'

Step 3: Exit to Normal mode
  Type: MODE_MATCH
  Target: 'normal'
```

---

## 🛠️ Adding a New Level

### Template

```typescript
{
  id: 'level-N',
  title: 'Level N: Title',
  description: 'Brief description',
  initialCode: 'your code here',
  steps: [
    {
      instruction: 'User instruction text',
      validationType: ValidationTypes.CURSOR_MATCH, // or MODE_MATCH, CODE_MATCH
      targetValue: { line: 0, ch: 5 },  // Adjust based on type
    },
    // More steps...
  ],
}
```

### Location

Edit `src/App.tsx` → `LEVELS` array (around line 50)

---

## 📋 CodeEditor Props

```typescript
<CodeEditor
  initialCode="string"           // Initial code content
  onStateChange={(state) => {}}  // Called when editor state changes
/>
```

### State Callback

```typescript
{
  cursorPos: { line: number, ch: number },
  code: string,
  vimMode: 'insert' | 'normal'
}
```

---

## 🔍 Validation Engine

```typescript
validateStep(currentState, step) → boolean
```

Returns `true` when:
- `CURSOR_MATCH`: Cursor at target position
- `MODE_MATCH`: Vim mode matches target
- `CODE_MATCH`: Code text matches target (trim compared)

---

## 🎨 UI Components

### Step Indicator

Visual dots showing progress:
- ● = Active step
- ○ = Pending step  
- ✓ = Completed step

### Status Bar

Real-time state display:
- Cursor position (Line X, Char Y)
- Current mode (NORMAL / INSERT)
- Code character count

### Instruction Box

Highlighted box with current step instruction

---

## 🚀 Running the App

```bash
# Development
npm run dev

# Build
npm run build

# Preview build
npm run preview
```

Access: `http://localhost:5174`

---

## 🧪 Debug Console

When each step completes:

```
✅ Step 1 completed!
✅ Step 2 completed!
🎉 Level 1 completed!
```

---

## 💡 Common Patterns

### Cursor Navigation Goal

```typescript
{
  instruction: 'Move to the semicolon at line end',
  validationType: ValidationTypes.CURSOR_MATCH,
  targetValue: { line: 4, ch: 29 },  // End of specific line
}
```

### Mode Switching Goal

```typescript
{
  instruction: 'Press i to enter Insert mode',
  validationType: ValidationTypes.MODE_MATCH,
  targetValue: 'insert',
}
```

### Code Editing Goal

```typescript
{
  instruction: 'Type something to change the code',
  validationType: ValidationTypes.CODE_MATCH,
  targetValue: 'expected code here',
}
```

---

## ⚡ Performance

- CodeMirror 6: ~180KB gzip
- Each level loads fresh editor instance
- State updates debounced and optimized

---

## 🔗 Dependencies

- `codemirror`: Editor engine
- `@replit/codemirror-vim`: Vim mode plugin
- React 19, TypeScript 5.9

---

**For full documentation, see `LEVEL_SYSTEM.md`**
