# Vim Hero - CodeMirror 6 + Vim Mode 集成指南

## 📦 安装依赖

执行以下命令安装所有必要的 CodeMirror 6 和 Vim 模式依赖：

```bash
npm install --legacy-peer-deps codemirror @replit/codemirror-vim @uiw/react-codemirror
```

### 安装的包说明

- **codemirror** - CodeMirror 6 核心编辑器
- **@replit/codemirror-vim** - Vim 模式插件（支持 hjkl、commands 等）
- **@uiw/react-codemirror** - React 绑定（可选，我们直接使用原生 API）

## 🎯 核心架构

### 1. 关卡数据结构 (LessonConfig)

```typescript
interface LessonConfig {
  id: string;                              // 关卡唯一标识
  title: string;                           // 关卡标题
  description: string;                     // 任务引导说明
  code: string;                            // 初始代码片段
  targetCursor: { line: number; ch: number }; // 目标光标位置（0-indexed）
  allowedCommands?: string[];              // 可选：允许的 Vim 命令白名单
  disableDirectInput?: boolean;            // 禁用直接文本输入
}
```

**注意**：CodeMirror 使用 `line` 和 `ch` (character) 来表示光标位置，而不是 `row` 和 `col`。

### 2. 状态机 (State Management)

```typescript
const [currentLessonIndex, setCurrentLessonIndex] = useState(0);    // 当前关卡索引
const [cursorPos, setCursorPos] = useState({ line: 0, ch: 0 });    // 光标位置
const [isCompleted, setIsCompleted] = useState(false);              // 完成状态
```

**验证逻辑**：
```typescript
useEffect(() => {
  const target = currentLesson.targetCursor;
  if (cursorPos.line === target.line && cursorPos.ch === target.ch) {
    setIsCompleted(true);
    console.log('✅ Task Completed!');
  }
}, [cursorPos, currentLesson.targetCursor]);
```

### 3. CodeMirror 编辑器组件

```typescript
const CodeEditor: React.FC<CodeEditorProps> = ({ initialCode, onCursorMove, disableDirectInput }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (!editorRef.current) return;

    // 创建编辑器状态和扩展
    const state = EditorState.create({
      doc: initialCode,
      extensions: [
        vim(),  // 启用 Vim 模式
        EditorView.updateListener.of((update) => {
          if (update.selectionSet) {
            // 光标位置变化时回调
            const pos = update.state.selection.main.head;
            const line = update.state.doc.lineAt(pos);
            const ch = pos - line.from;
            onCursorMove({ line: line.number - 1, ch });
          }
        }),
        // 可选：禁用直接文本输入
        disableDirectInput
          ? EditorView.inputHandler.of((_view, _from, _to, _text) => true)
          : [],
      ],
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });

    return () => view.destroy();
  }, [initialCode, onCursorMove, disableDirectInput]);

  return <div ref={editorRef} className="codemirror-editor" />;
};
```

## 🎮 功能特性

### 1. Vim 模式启用

- ✅ 完整的 Vim 按键绑定（hjkl、w、b、x、d、c、v 等）
- ✅ Mode 模式（Normal/Insert/Visual）
- ✅ 按 `Esc` 进入 Normal 模式，按 `i` 进入 Insert 模式
- ✅ 支持 Vim 命令（`:w`、`:q` 等需手动实现）

### 2. 输入拦截（屏蔽特定输入）

在基础移动练习中，可以禁用直接字符输入，只允许 Vim 导航：

```typescript
// 在 CodeEditor 中启用
disableDirectInput={currentLesson.disableDirectInput}

// 实现在 extensions 中：
disableDirectInput
  ? EditorView.inputHandler.of((_view, _from, _to, _text) => true)
  : []
```

### 3. 光标位置监听

每当用户用 Vim 命令移动光标时，自动触发 `onCursorMove` 回调：

```typescript
EditorView.updateListener.of((update) => {
  if (update.selectionSet) {
    const pos = update.state.selection.main.head;
    const line = update.state.doc.lineAt(pos);
    const ch = pos - line.from;
    onCursorMove({ line: line.number - 1, ch });
  }
})
```

### 4. 任务完成验证

当光标到达目标位置时自动触发成功状态：

```typescript
if (cursorPos.line === target.line && cursorPos.ch === target.ch) {
  setIsCompleted(true);
  console.log('✅ Task Completed! Cursor reached the target position.');
}
```

## 📝 MVP 示例关卡

### Lesson 1: Navigate to Semicolon

```cpp
#include <iostream>
using namespace std;

int main() {
    std::cout << "Hello, Vim!";  // ← 目标：这一行末尾的分号 ;
    return 0;
}
```

- **目标位置**：Line 4, Character 29（第 5 行的分号）
- **Vim 操作**：按 `j` 向下移动 4 次到第 5 行，然后按 `l` 向右移动到分号位置
- **控制台输出**：`✅ Task Completed! Cursor reached the target position.`

### Lesson 2: Find the Return Statement

```cpp
#include <iostream>
using namespace std;

int main() {
    std::cout << "Welcome!";
    return 0;  // ← 目标：这一行末尾的分号 ;
}
```

- **目标位置**：Line 5, Character 12
- 类似的 Vim 导航练习

## 🔧 如何扩展新关卡

在 `LESSONS` 数组中添加新对象：

```typescript
const LESSONS: LessonConfig[] = [
  // ... 现有关卡
  {
    id: 'lesson-3',
    title: 'Lesson 3: Delete a Word',
    description: 'Navigate to the word "TODO" and delete it using Vim commands (dw)',
    code: `const message = "TODO: Fix this";
console.log(message);`,
    targetCursor: { line: 0, ch: 19 }, // Position after deletion
    disableDirectInput: false, // Allow editing for this lesson
  },
];
```

## 📊 按键拦截的高级用法

### 场景 1：只允许 hjkl 导航

```typescript
const allowedCommands = ['h', 'j', 'k', 'l'];

EditorView.inputHandler.of((view, from, to, text) => {
  if (!allowedCommands.includes(text)) {
    return true; // 阻止输入
  }
  return false; // 允许输入
})
```

### 场景 2：只允许 Normal 模式操作

```typescript
// 可以检查 Vim 插件的状态（需要访问 Vim 状态 API）
// 这需要进一步的 @replit/codemirror-vim 文档
```

## 🚀 运行应用

```bash
# 开发模式
npm run dev

# 生产构建
npm run build

# 预览生产构建
npm run preview
```

访问 `http://localhost:5174` 开始学习 Vim！

## 📚 关键 API 参考

### EditorState.create()

创建编辑器初始状态：
```typescript
EditorState.create({
  doc: string,              // 初始文档内容
  extensions: Extension[]   // 编辑器扩展（插件）
})
```

### EditorView

创建和挂载编辑器视图：
```typescript
new EditorView({
  state: EditorState,           // 编辑器状态
  parent: HTMLElement,          // 挂载节点
})
```

### vim()

启用 Vim 模式：
```typescript
import { vim } from '@replit/codemirror-vim';

extensions: [
  vim(),  // 添加到扩展数组
]
```

### EditorView.updateListener

监听编辑器更新事件：
```typescript
EditorView.updateListener.of((update: ViewUpdate) => {
  update.selectionSet     // 光标或选区改变
  update.docChanged       // 文档内容改变
  update.state            // 当前编辑器状态
})
```

### EditorView.inputHandler

拦截用户输入：
```typescript
EditorView.inputHandler.of((view, from, to, text) => {
  // 返回 true 阻止默认输入
  // 返回 false 允许输入
})
```

## 💡 性能使用提示

- ✅ 使用 `key={`lesson-${currentLessonIndex}`}` 强制重新创建编辑器，避免状态污染
- ✅ 在 `useEffect` 中销毁编辑器：`view.destroy()`
- ✅ 监听 `update.selectionSet` 而不是每次输入都回调
- ✅ CodeMirror 6 包体积较大（~180KB gzip），考虑代码分割

## 🎓 下一步扩展

1. **高级 Vim 命令**：d2w、ci"、yy 等（需要自定义 Vim keybinding）
2. **代码高亮**：集成 `@codemirror/lang-cpp`、`@codemirror/lang-javascript` 等
3. **错误检测**：集成 `@codemirror/lint` 检测代码错误
4. **自动完成**：集成 `@codemirror/autocomplete`
5. **多个编辑器**：并排展示期望结果和用户编辑结果

---

✨ Vim Hero 已准备好升级为生产级别的 Vim 学习平台！
