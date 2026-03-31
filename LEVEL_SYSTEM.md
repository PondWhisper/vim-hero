# Vim Hero - Interactive Multi-Step Level System

## 🚀 快速开始

### 安装依赖

应用已预先安装所有必要的依赖。如果需要重新安装：

```bash
npm install --legacy-peer-deps codemirror @replit/codemirror-vim @uiw/react-codemirror
```

### 运行应用

```bash
# 开发模式
npm run dev

# 生产构建
npm run build

# 预览构建
npm run preview
```

访问 `http://localhost:5174`

---

## 📋 核心架构

### 1. 数据结构设计

#### ValidationTypes 枚举

```typescript
const ValidationTypes = {
  CURSOR_MATCH: 'CURSOR_MATCH',  // 光标位置匹配
  MODE_MATCH: 'MODE_MATCH',      // Vim 模式切换
  CODE_MATCH: 'CODE_MATCH',      // 代码文本匹配
} as const;
```

#### Step 接口

```typescript
interface Step {
  instruction: string;           // 显示给用户的指令
  validationType: ValidationType; // 验证类型
  targetValue: any;              // 目标值（光标、模式或代码）
}
```

例如：

```typescript
{
  instruction: 'Press "i" to enter Insert mode',
  validationType: ValidationTypes.MODE_MATCH,
  targetValue: 'insert',
}
```

#### Level 接口

```typescript
interface Level {
  id: string;           // 关卡 ID
  title: string;        // 关卡标题
  description?: string; // 关卡描述
  initialCode: string;  // 初始代码
  steps: Step[];        // 步骤数组
}
```

### 2. 状态机逻辑

```
┌─────────────────┐
│  Load Level 1   │
│  Step 1 / 3     │
└────────┬────────┘
         │
         ▼
┌──────────────────────────────┐
│  Wait for User Interaction   │
│  - Listen to cursor changes  │
│  - Listen to mode changes    │
│  - Listen to code changes    │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│  Validate Current Step       │
│  Apply validationType logic  │
└────────┬─────────────────────┘
         │
    ┌────┴─────────────────────────────┐
    │                                  │
    ▼ (Failed)                    (Pass) ▼
┌─────────────┐                ┌────────────────────┐
│ Keep Waiting│                │ Step Completed ✅  │
└─────────────┘                └────────┬───────────┘
                                        │
                          ┌─────────────┴──────────────┐
                          │                            │
                     (More Steps)                 (Last Step)
                          │                            │
                          ▼                            ▼
                   ┌──────────────┐          ┌──────────────────┐
                   │ Step N+1/M   │          │ Level Completed  │
                   │ (Loop back)  │          │ Show UI ✅       │
                   └──────────────┘          └──────────────────┘
```

### 3. 验证逻辑

```typescript
const validateStep = (currentState: EditorStateSnapshot, step: Step): boolean => {
  switch (step.validationType) {
    case ValidationTypes.CURSOR_MATCH:
      // 检查光标是否在目标位置
      return cursorPos.line === target.line && cursorPos.ch === target.ch;

    case ValidationTypes.MODE_MATCH:
      // 检查是否在目标 Vim 模式 (insert/normal)
      return vimMode === targetMode;

    case ValidationTypes.CODE_MATCH:
      // 检查代码文本是否与目标匹配
      return code.trim() === targetCode.trim();
  }
};
```

---

## 🎮 MVP 关卡数据

### Level 1: Basic Movement

**目标**：学习基础的光标导航

```typescript
{
  id: 'level-1',
  title: 'Level 1: Basic Movement',
  description: 'Learn to navigate with j and k keys',
  initialCode: `int sum(int a, int b) {
    return a + b;
}`,
  steps: [
    {
      instruction: 'Press "j" to move to the second line, then "l" to move to the end',
      validationType: ValidationTypes.CURSOR_MATCH,
      targetValue: { line: 1, ch: 18 }, // 第 2 行末尾的分号
    },
  ],
}
```

**操作步骤**：
1. 按 `j` 从第 1 行移动到第 2 行
2. 按 `l` 多次移动到行末（分号位置）
3. 系统自动检测：✅ Step completed!

### Level 2: Intro to Modes

**目标**：练习 Insert/Normal 模式切换

```typescript
{
  id: 'level-2',
  title: 'Level 2: Intro to Modes',
  description: 'Practice switching between Insert and Normal modes',
  initialCode: 'int a = 1;',
  steps: [
    // Step 1: 进入 Insert 模式
    {
      instruction: 'Press "i" to enter Insert mode',
      validationType: ValidationTypes.MODE_MATCH,
      targetValue: 'insert',
    },
    // Step 2: 在代码中插入 "0"
    {
      instruction: 'Type "0" to insert a zero before the 1',
      validationType: ValidationTypes.CODE_MATCH,
      targetValue: 'int a = 01;',
    },
    // Step 3: 返回 Normal 模式
    {
      instruction: 'Press "Esc" to return to Normal mode',
      validationType: ValidationTypes.MODE_MATCH,
      targetValue: 'normal',
    },
  ],
}
```

**操作流程**：

```
Initial: [int a = 1;]
           ↑ (cursor at beginning)

Step 1: Press "i"
→ Enter Insert mode ✅

Step 2: Type "0"
Code becomes: [int a = 01;] ✅

Step 3: Press "Esc"
→ Return to Normal mode ✅

Level 2 Completed! 🎉
```

---

## 🛠️ 核心组件

### CodeEditor 组件

**功能**：集成 CodeMirror 6 + Vim 模式，监听编辑器状态

```typescript
<CodeEditor
  key={`level-${currentLevelIndex}`}
  initialCode={currentLevel.initialCode}
  onStateChange={handleStateChange}
/>
```

**状态回调**：

```typescript
interface EditorStateSnapshot {
  cursorPos: { line: number; ch: number };  // 光标位置
  code: string;                             // 当前代码
  vimMode: 'insert' | 'normal';             // Vim 模式
}
```

每当编辑器状态变化时，`onStateChange` 会被调用，触发验证逻辑。

### 验证引擎

在 `handleStateChange` 回调中：

```typescript
const handleStateChange = useCallback(
  (newState: EditorStateSnapshot) => {
    setEditorState(newState);

    // 如果当前 Step 未完成，进行验证
    if (!isStepCompleted && currentStep) {
      if (validateStep(newState, currentStep)) {
        setIsStepCompleted(true);
        console.log(`✅ Step ${currentStepIndex + 1} completed!`);
      }
    }
  },
  [currentStep, isStepCompleted, currentStepIndex]
);
```

---

## 📊 UI 流程

### 关卡进行中

```
┌─────────────────────────────────────┐
│ Level 1: Basic Movement             │ ← 关卡标题
├─────────────────────────────────────┤
│ ● ○ ○                               │ ← Step 指示器 (1/3)
├─────────────────────────────────────┤
│ Press "j" to move to second line... │ ← 当前 Step 指令
├─────────────────────────────────────┤
│  int sum(int a, int b) {            │
│      return a + b;                  │
│  }                                  │ ← CodeMirror 编辑器
├─────────────────────────────────────┤
│ 📍 Cursor: Line 0, Char 0           │ ← 实时状态显示
│ 🎯 Mode: NORMAL                     │
│ 📝 Code: 30 chars                   │
└─────────────────────────────────────┘
```

### Step 完成时

```
┌─────────────────────────────────────┐
│ ...                                 │
├─────────────────────────────────────┤
│ ✅ Step completed!  [Next Step →]   │ ← 显示成功和按钮
└─────────────────────────────────────┘
```

### 关卡完成时

```
┌─────────────────────────────────────┐
│ ...                                 │
├─────────────────────────────────────┤
│ 🎉 Level completed!  [Next Level →] │ ← 显示关卡完成
└─────────────────────────────────────┘
```

---

## 🔧 扩展新关卡

### 步骤 1：定义新关卡数据

```typescript
const LEVELS: Level[] = [
  // ... 现有关卡
  {
    id: 'level-3',
    title: 'Level 3: Delete with d',
    description: 'Practice deletion commands',
    initialCode: 'const message = "TODO: Fix this";',
    steps: [
      {
        instruction: 'Position cursor on the "T" of TODO',
        validationType: ValidationTypes.CURSOR_MATCH,
        targetValue: { line: 0, ch: 20 },
      },
      {
        instruction: 'Delete the word "TODO" using "dw"',
        validationType: ValidationTypes.CODE_MATCH,
        targetValue: 'const message = ": Fix this";',
      },
    ],
  },
];
```

### 步骤 2：应用会自动加载新关卡

完成！应用会在关卡完成后自动显示 "Next Level →" 按钮。

---

## 🎯 验证类型详解

### 1. CURSOR_MATCH

验证光标是否在指定的行列位置。

```typescript
{
  instruction: 'Move cursor to the end of line 2',
  validationType: ValidationTypes.CURSOR_MATCH,
  targetValue: { line: 1, ch: 18 },  // Line 2, Character 18
}
```

**注意**：
- `line` 是 0-indexed（第 1 行 = line 0）
- `ch` 是列位置（第 1 个字符 = ch 0）

### 2. MODE_MATCH

验证 Vim 模式是否切换正确。

```typescript
{
  instruction: 'Press "i" to enter Insert mode',
  validationType: ValidationTypes.MODE_MATCH,
  targetValue: 'insert',  // or 'normal'
}
```

### 3. CODE_MATCH

验证代码文本是否与目标匹配（忽略前后空格）。

```typescript
{
  instruction: 'Delete the line',
  validationType: ValidationTypes.CODE_MATCH,
  targetValue: 'const x = 5;',  // 期望的代码
}
```

---

## 📝 调试技巧

### 浏览器控制台输出

每当 Step 完成时，你会看到：

```
✅ Step 1 completed!
✅ Step 2 completed!
✅ Step 3 completed!
🎉 Level 1 completed!
```

### 实时状态检查

在 Status Bar 中可以看到：

- **Cursor Position**: `Line 0, Char 15`
- **Vim Mode**: `INSERT` 或 `NORMAL`
- **Code Length**: `45 chars`

### 快速测试

编辑 LEVELS 数组中的 `targetValue` 来测试验证逻辑是否正确工作。

---

## 🚀 部署建议

1. **代码分割**：CodeMirror 较大，可考虑动态导入
2. **缓存**：缓存关卡进度到 localStorage
3. **分析**：追踪用户完成每个 Step 的时间
4. **成就系统**：添加徽章或积分

---

## 📚 相关资源

- [CodeMirror 6 文档](https://codemirror.net/docs/)
- [@replit/codemirror-vim GitHub](https://github.com/replit/codemirror-vim)
- [Vim 快捷键备忘单](https://vim.rtorr.com/)

---

🎉 **Vim Hero 现已拥有生产级别的多步骤交互式学习系统！**
