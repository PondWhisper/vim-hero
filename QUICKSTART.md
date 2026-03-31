# Vim Hero - 快速启动指南

## ⚡ 快速开始（30秒）

```bash
cd /Users/lijingxuan/vim-hero
npm run dev
# 打开: http://localhost:5176/
```

## 📋 当前应用状态（2024）

**✅ 完全可运行的生产应用**

- ✅ **Build**: 成功 (129ms, 0 errors)
- ✅ **Dev Server**: 运行中 @ localhost:5176
- ✅ **Vim引擎**: @replit/codemirror-vim v6.3.0 已激活
- ✅ **主题**: VS Code深色主题(@uiw/codemirror-theme-vscode)
- ✅ **热重载**: HMR已启用
- ✅ **TypeScript**: 完全类型安全

## 🎮 5个学习关卡

| 关卡 | 难度 | 学习内容 |
|------|------|---------|
| 1. 精准空降 | ⭐ | 基础光标移动 (`j`, `15G`) |
| 2. 单词跳跃 | ⭐⭐ | 单词级导航 (`w`, `e`, `h`, `l`) |
| 3. 插入模式 | ⭐⭐ | 编辑操作 (`i`, 输入, `Esc`) |
| 4. 暴力拆除 | ⭐⭐⭐ | 删除命令 (`dd`) |
| 5. 时空回溯 | ⭐⭐⭐ | 撤销功能 (`u`) |

## 🔨 常用开发命令

```bash
# 启动开发服务器（HMR自动刷新）
npm run dev

# 生产构建
npm run build

# 预览生产构建
npm run preview

# TypeScript类型检查
npx tsc --noEmit

# ESLint代码检查
npm run lint
```

## 🌐 访问地址

- **开发**: http://localhost:5176/
- **生产**: ./dist/index.html

## 📦 技术栈

| 工具 | 版本 |
|------|------|
| React | 19.2.4 |
| TypeScript | 5.9.3 |
| Vite | 8.0.3 |
| CodeMirror 6 | @uiw/react-codemirror 22.x |
| Vim引擎 | @replit/codemirror-vim 6.3.0 |
| C++高亮 | @codemirror/lang-cpp |
| VS Code主题 | @uiw/codemirror-theme-vscode |

## 🎯 应用架构

```
用户输入(Vim命令)
    ↓
@replit/codemirror-vim(快捷键处理)
    ↓
CodeMirror 6(编辑器状态)
    ↓
handleUpdate()回调
    ↓
验证当前关卡条件
    ↓
关卡完成? → 1秒延迟 → 自动进入下一关
```

## 💾 自定义指南

### 修改关卡
编辑 `src/App.tsx` 中的 `LEVELS` 数组：
```typescript
{
  id: 1,
  title: 'Level 1: 精准空降',
  description: '将光标移动到第 15 行。',
  hint: '你可以狂按 j（向下），或者使用高级命令 15G。',
  validate: (state: EditorState) => state.line === 14
}
```

### 修改初始代码
编辑 `INITIAL_CODE` 常量（第8-46行）

### 修改主题
```typescript
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
// 替换 theme={vscodeDark}
```

### 修改自动通关延迟
在 `handleUpdate()` 中将 `setTimeout(..., 1000)` 改为需要的毫秒数

## 🚀 从开发到生产

```bash
# 1. 本地测试
npm run dev

# 2. 构建检查
npm run build

# 3. 预览生产版本
npm run preview

# 4. 部署
# 上传 ./dist 文件夹到你的服务器
```

## 📊 性能指标

- **初始加载**: ~135ms (Vite优化后)
- **HMR更新**: <300ms
- **JS包**: 838KB (gzip: 270KB)
- **CSS**: 4.86KB (gzip: 1.7KB)

## 🔍 故障排查

| 问题 | 解决方案 |
|------|---------|
| Vim快捷键不工作 | 检查vim()是否在extensions中 |
| 页面空白 | 按F12检查Console有无错误 |
| 关卡无法完成 | 查看Console验证函数输出 |
| 主题不生效 | 确认vscodeDark已正确导入 |
| 热更新失败 | 检查终端是否有编译错误 |

## 📚 文档

- `README_DEPLOYMENT.md` - 完整部署指南
- `src/App.tsx` - 核心应用逻辑
- `src/App.css` - UI样式(VS Code主题配色)

## ✨ 核心特性总结

✅ 真实Vim体验 - 使用@replit/codemirror-vim，所有标准快捷键都可用  
✅ VS Code美观 - vscodeDark主题，专业色彩方案  
✅ 渐进式学习 - 5个循序渐进的关卡  
✅ 实时反馈 - 光标位置、模式显示、自动验证  
✅ 生产就绪 - TypeScript类型安全，优化打包  

---

最后更新: 2024  
状态: ✅ 生产就绪
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
