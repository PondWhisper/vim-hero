# Vim Hero - 快速开始指南

## 🚀 安装和运行

```bash
# 1. 安装依赖
npm install --legacy-peer-deps codemirror @replit/codemirror-vim @uiw/react-codemirror

# 2. 启动开发服务器
npm run dev

# 3. 在浏览器中打开
# http://localhost:5174
```

## 📋 核心改变

### 从原生 React State 升级到 CodeMirror 6

**之前**（手动管理光标和渲染）：
- 逐字符渲染，处理中英文混合等宽问题困难
- 无法支持复杂 Vim 命令（d2w, ci" 等）
- 边界处理繁琐

**现在**（CodeMirror 6 + Vim 模式）：
- ✅ 原生编辑器渲染，完美支持等宽字体
- ✅ 完整的 Vim 快捷键支持（hjkl, w, b, x, d, c 等）
- ✅ 自动处理所有边界和特殊字符
- ✅ 可扩展的插件系统

## 💻 核心代码一览

### 1. 关卡定义

```typescript
const LESSONS: LessonConfig[] = [
  {
    id: 'lesson-1',
    title: 'Lesson 1: Navigate to Semicolon',
    description: 'Use Vim commands (hjkl) to navigate to the semicolon at the end of line 5.',
    code: `#include <iostream>
using namespace std;

int main() {
    std::cout << "Hello, Vim!";
    return 0;
}`,
    targetCursor: { line: 4, ch: 29 },  // 第 5 行，第 30 个字符
    disableDirectInput: true,           // 只允许 Vim 导航，禁用文本输入
  },
];
```

### 2. CodeMirror 编辑器组件

```typescript
const CodeEditor: React.FC<CodeEditorProps> = ({ initialCode, onCursorMove, disableDirectInput }) => {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editorRef.current) return;

    const state = EditorState.create({
      doc: initialCode,
      extensions: [
        vim(),  // 启用 Vim 模式
        EditorView.updateListener.of((update) => {
          if (update.selectionSet) {
            const pos = update.state.selection.main.head;
            const line = update.state.doc.lineAt(pos);
            const ch = pos - line.from;
            onCursorMove({ line: line.number - 1, ch });  // 回调光标位置
          }
        }),
        disableDirectInput ? EditorView.inputHandler.of(() => true) : [],  // 拦截输入
      ],
    });

    const view = new EditorView({ state, parent: editorRef.current });

    return () => view.destroy();
  }, [initialCode, onCursorMove, disableDirectInput]);

  return <div ref={editorRef} className="codemirror-editor" />;
};
```

### 3. 任务验证

```typescript
useEffect(() => {
  const target = currentLesson.targetCursor;
  if (cursorPos.line === target.line && cursorPos.ch === target.ch) {
    setIsCompleted(true);
    console.log('✅ Task Completed!');  // 控制台会打印这条消息
  }
}, [cursorPos, currentLesson.targetCursor]);
```

## 🎮 Vim 快捷键支持

| 快捷键 | 功能 |
|--------|------|
| `h` | 向左移动 |
| `j` | 向下移动 |
| `k` | 向上移动 |
| `l` | 向右移动 |
| `w` | 跳到下一个单词开头 |
| `b` | 跳到上一个单词开头 |
| `$` | 移到行末 |
| `0` | 移到行首 |
| `gg` | 移到文件开头 |
| `G` | 移到文件末尾 |
| `i` | 进入 Insert 模式 |
| `Esc` | 进入 Normal 模式 |
| `d` | 删除 |
| `c` | 修改 |
| `v` | 可视模式 |

## 📊 项目结构

```
vim-hero/
├── src/
│   ├── App.tsx              # 主应用（~180 行，包含 CodeMirror 集成）
│   ├── App.css              # 样式表
│   ├── index.css            # 全局样式
│   ├── main.tsx
│   └── index.html
├── CODEMIRROR_SETUP.md      # 完整的 API 文档
├── package.json
└── ...
```

## 🔌 输入拦截示例

在基础移动练习中，禁用直接输入：

```typescript
{
  id: 'lesson-1',
  title: 'Basic Movement',
  description: 'Practice hjkl navigation',
  code: '...',
  targetCursor: { line: 4, ch: 29 },
  disableDirectInput: true,  // ← 拦截所有输入
}
```

## ✅ 验证应用

打开浏览器开发者工具（F12）的控制台，当光标到达目标位置时，你会看到：

```
✅ Task Completed! Cursor reached the target position.
```

## 📝 添加新关卡

1. 在 `LESSONS` 数组中添加新对象
2. 指定 `id`、`title`、`description`、`code` 和 `targetCursor`
3. 可选：设置 `disableDirectInput` 控制输入权限
4. 保存文件，热模块重载会自动更新

```typescript
{
  id: 'lesson-3',
  title: 'Lesson 3: Delete Word',
  description: 'Use "dw" to delete the word "TODO"',
  code: 'const x = TODO; // fix this',
  targetCursor: { line: 0, ch: 12 },  // 删除后的位置
  disableDirectInput: false,          // 允许编辑
}
```

## 🐛 常见问题

**Q: 为什么光标到不了某些位置？**
A: 检查 `targetCursor` 是否超出了该行的实际字符数。使用 `line: 0-indexed`。

**Q: 如何在关卡中添加代码高亮？**
A: 安装 `@codemirror/lang-cpp` 或 `@codemirror/lang-javascript`，然后在 extensions 中添加。

**Q: 如何禁用某些特定的 Vim 命令？**
A: @replit/codemirror-vim 目前没有内置的命令禁用功能，需要自定义处理（参考 `EditorView.inputHandler`）。

## 📚 相关文档

- [CodeMirror 6 官方文档](https://codemirror.net/docs/)
- [@replit/codemirror-vim GitHub](https://github.com/replit/codemirror-vim)
- [Vim 快捷键备忘单](https://vim.rtorr.com/)

---

现在开始你的 Vim 学习之旅吧！🚀
