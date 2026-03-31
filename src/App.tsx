import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { initVimMode } from 'monaco-vim';

/** * 1. 所有的接口定义直接放在这 
 */
interface Task {
  id: string;
  instruction: string;
  expectedCode: string;
  hint: string;
}

interface LevelSchema {
  id: string;
  title: string;
  description: string;
  language: string;
  initialCode: string;
  tasks: Task[];
}

/** * 2. 所有的逻辑状态管理直接放在这 
 */
const LevelContext = createContext<any>(undefined);

const LevelProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentLevel, setCurrentLevel] = useState<LevelSchema | null>(null);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [currentCode, setCurrentCode] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);

  const loadLevel = useCallback((level: LevelSchema) => {
    setCurrentLevel(level);
    setCurrentTaskIndex(0);
    setCurrentCode(level.initialCode);
    setIsCompleted(false);
  }, []);

  const handleCodeChange = useCallback((newCode: string) => {
    setCurrentCode(newCode);
    const task = currentLevel?.tasks[currentTaskIndex];
    if (!task || isCompleted) return;
    if (newCode.trim() === task.expectedCode.trim()) {
      if (currentLevel && currentTaskIndex < currentLevel.tasks.length - 1) {
        setCurrentTaskIndex(prev => prev + 1);
      } else {
        setIsCompleted(true);
      }
    }
  }, [currentLevel, currentTaskIndex, isCompleted]);

  return (
    <LevelContext.Provider value={{ currentLevel, currentTaskIndex, currentCode, isCompleted, loadLevel, handleCodeChange }}>
      {children}
    </LevelContext.Provider>
  );
};

/** * 3. 编辑器组件直接写在这里 
 */
const VimEditorInternal = () => {
  const { currentLevel, currentCode, handleCodeChange } = useContext(LevelContext);
  const editorRef = useRef<any>(null);
  const vimModeRef = useRef<any>(null);
  const statusBarRef = useRef<HTMLDivElement>(null);

  const handleEditorDidMount: OnMount = (editor) => {
    editorRef.current = editor;
    if (statusBarRef.current) {
      vimModeRef.current = initVimMode(editor, statusBarRef.current);
    }
    editor.updateOptions({ cursorStyle: 'block', cursorBlinking: 'solid', lineNumbers: 'relative' });
  };

  useEffect(() => {
    return () => { if (vimModeRef.current) vimModeRef.current.dispose(); };
  }, []);

  if (!currentLevel) return <div>加载中...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flexGrow: 1 }}>
        <Editor
          height="100%"
          language={currentLevel.language}
          value={currentCode}
          theme="vs-dark"
          onChange={(value) => handleCodeChange(value || '')}
          onMount={handleEditorDidMount}
        />
      </div>
      <div ref={statusBarRef} style={{ height: '30px', backgroundColor: '#007acc', color: 'white', display: 'flex', alignItems: 'center', padding: '0 10px', fontFamily: 'monospace' }} />
    </div>
  );
};

/** * 4. 组装成最终的 App 
 */
export default function App() {
  const testLevel: LevelSchema = {
    id: "test-01",
    title: "Vim 实战：清理调试代码",
    description: "我们需要使用 Vim 快速删除冗余的 print 语句。",
    language: "python",
    initialCode: "def calculate(a, b):\n    print('debug: start')\n    return a + b",
    tasks: [
      {
        id: "t1",
        instruction: "请使用 dd 删除第 2 行的 print 语句",
        expectedCode: "def calculate(a, b):\n    return a + b",
        hint: "将光标移动到第 2 行，在 Normal 模式下连按两下 d"
      }
    ]
  };

  return (
    <LevelProvider>
      <div style={{ display: 'flex', height: '100vh', backgroundColor: '#1e1e1e', color: 'white' }}>
        {/* 左侧任务栏 */}
        <div style={{ width: '300px', padding: '20px', borderRight: '1px solid #444' }}>
          <MainContent testLevel={testLevel} />
        </div>
        {/* 右侧编辑器 */}
        <div style={{ flexGrow: 1 }}>
          <VimEditorInternal />
        </div>
      </div>
    </LevelProvider>
  );
}

// 辅助组件，处理初始化
const MainContent = ({ testLevel }: { testLevel: any }) => {
  const { currentLevel, currentTaskIndex, isCompleted, loadLevel } = useContext(LevelContext);
  useEffect(() => { loadLevel(testLevel); }, [loadLevel, testLevel]);

  if (!currentLevel) return null;
  const currentTask = currentLevel.tasks[currentTaskIndex];

  return (
    <div>
      <h2 style={{ color: '#4ade80' }}>{currentLevel.title}</h2>
      {isCompleted ? (
        <div style={{ padding: '20px', background: '#064e3b', borderRadius: '8px' }}>
          <h3>🎉 闯关成功！</h3>
          <p>你已经掌握了 dd 指令！</p>
        </div>
      ) : (
        <>
          <p style={{ color: '#aaa' }}>{currentLevel.description}</p>
          <div style={{ marginTop: '20px', padding: '15px', background: '#334155', borderRadius: '8px' }}>
            <p><strong>当前任务：</strong></p>
            <p style={{ color: '#60a5fa', fontSize: '18px' }}>{currentTask.instruction}</p>
            <p style={{ fontSize: '12px', color: '#94a3b8' }}>💡 提示：{currentTask.hint}</p>
          </div>
        </>
      )}
    </div>
  );
};