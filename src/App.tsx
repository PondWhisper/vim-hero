import React, { useState, useCallback, useRef } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { cpp } from '@codemirror/lang-cpp';
import { vim } from '@replit/codemirror-vim';
import './App.css';

// 50行真实的 C++ Quick Sort 算法代码 - 所有关卡共用这个"持久化训练场"
const INITIAL_CODE = `#include <iostream>
#include <algorithm>
#include <vector>
using namespace std;

// Quick Sort Implementation
// A highly efficient sorting algorithm
// Designed for educational purposes
// This is a classic algorithm
// Used in many real-world applications
// O(n log n) average time complexity

int partition(int arr[], int low, int high) {
    int i = low - 1;
    int pivot = arr[high];
    for (int j = low; j < high; j++) {
        if (arr[j] < pivot) {
            i++;
            swap(arr[i], arr[j]);
        }
    }
    swap(arr[i + 1], arr[high]);
    return i + 1;
}

void quickSort(int arr[], int low, int high) {
    if (low < high) {
        int pi = partition(arr, low, high);
        quickSort(arr, low, pi - 1);
        quickSort(arr, pi + 1, high);
    }
}

void printArray(int arr[], int size) {
    for (int i = 0; i < size; i++) {
        cout << arr[i] << " ";
    }
    cout << endl;
}

int main() {
    int arr[] = {64, 34, 25, 12, 22, 11, 90, 88};
    int n = sizeof(arr) / sizeof(arr[0]);
    
    cout << "Unsorted array: ";
    printArray(arr, n);
    
    quickSort(arr, 0, n - 1);
    
    cout << "Sorted array: ";
    printArray(arr, n);
    
    return 0;
}`;

interface EditorState {
  line: number;      // 0-indexed
  col: number;       // 0-indexed
  mode: 'normal' | 'insert';
  code: string;
  lineCount: number;
}

interface Level {
  id: number;
  title: string;
  description: string;
  hint: string;
  validate: (state: EditorState, prevCode: string) => boolean;
}

// 5个实质性的连贯关卡定义
const LEVELS: Level[] = [
  {
    id: 1,
    title: 'Level 1: 精准空降',
    description: '将光标移动到第 15 行。',
    hint: '你可以狂按 j（向下），或者使用高级命令 15G（快速跳到第15行）。',
    validate: (state) => {
      // 第15行 = 0-indexed的第14行
      return state.line === 14;
    },
  },
  {
    id: 2,
    title: 'Level 2: 单词跳跃',
    description: '把光标移动到第 15 行的 "pivot" 单词的首字母 p 上。',
    hint: '使用 w 跳到下一个单词，或者 e 到单词末尾，或手动用 h/l 移动。',
    validate: (state) => {
      // 第15行，且光标在 pivot 的 p 位置
      // "    int pivot" 中，p 在第8个字符位置（0-indexed）
      return state.line === 14 && state.col === 8;
    },
  },
  {
    id: 3,
    title: 'Level 3: 进入插入模式并修改',
    description: '把 "pivot" 变成 "pivotValue"。进入 Insert 模式，键入 Value，然后按下 Esc 回到 Normal 模式。',
    hint: '按 i 进入 Insert 模式，输入 Value，再按 Esc 回到 Normal 模式。必须两个条件同时满足！',
    validate: (state) => {
      // 1. 代码包含 pivotValue
      // 2. 当前模式是 normal（已经退出插入模式）
      return state.code.includes('pivotValue') && state.mode === 'normal';
    },
  },
  {
    id: 4,
    title: 'Level 4: 暴力拆除',
    description: '删除掉第 16 行（即 "for (int j = low; j < high; j++) {"）。',
    hint: '将光标移到第 16 行，连按两下 d 键（dd）删除整行。',
    validate: (state, prevCode) => {
      // 检查：
      // 1. 行数比前一个关卡（Level 3）少 1
      // 2. 原第16行的内容消失了
      const prevLineCount = prevCode.split('\n').length;
      const hasForLoop = state.code.includes('for (int j = low; j < high; j++) {');
      return state.lineCount === prevLineCount - 1 && !hasForLoop;
    },
  },
  {
    id: 5,
    title: 'Level 5: 时空回溯',
    description: '哎呀，删错了！撤销刚才的删除操作，把代码恢复原状。',
    hint: '在 Normal 模式下按下 u 键（undo），彻底撤销上一步的删除。',
    validate: (state) => {
      // 检查：
      // 1. 代码包含 pivotValue（来自 Level 3 的修改）
      // 2. for 循环被恢复了（来自 Level 4 的删除已撤销）
      return state.code.includes('pivotValue') && state.code.includes('for (int j = low; j < high; j++) {');
    },
  },
];


export default function App() {
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
  const [editorState, setEditorState] = useState<EditorState>({
    line: 0,
    col: 0,
    mode: 'normal',
    code: INITIAL_CODE,
    lineCount: INITIAL_CODE.split('\n').length,
  });

  // 追踪前一个关卡的代码状态
  const prevCodeRef = useRef<string>(INITIAL_CODE);
  // 追踪关卡完成状态，避免重复打印完成消息
  const prevLevelCompleteRef = useRef<boolean>(false);

  const handleUpdate = useCallback(
    (update: any) => {
      try {
        // 获取光标位置信息
        const main = update.state.selection.main;
        const doc = update.state.doc;
        const lineObj = doc.lineAt(main.head);
        const line = lineObj.number - 1; // 转换为 0-indexed
        const col = main.head - lineObj.from; // 相对于行首的位置

        // 获取当前代码内容
        const code = doc.toString();
        const lineCount = doc.lines;

        // 尝试获取 Vim 模式状态
        let mode: 'normal' | 'insert' = 'normal';
        try {
          const vimState = update.state.field(vim.state, false);
          if (vimState && vimState.mode === 'insert') {
            mode = 'insert';
          }
        } catch (e) {
          // vim.state 不可用时，默认为 normal
        }

        // 构建新的编辑器状态
        const newState: EditorState = {
          line,
          col,
          mode,
          code,
          lineCount,
        };

        // 更新编辑器状态
        setEditorState(newState);

        // 检查当前关卡是否完成
        const currentLevel = LEVELS[currentLevelIndex];
        const levelComplete = currentLevel.validate(newState, prevCodeRef.current);

        if (levelComplete && !prevLevelCompleteRef.current) {
          console.log(`✅ Level ${currentLevelIndex + 1} completed!`);
          prevLevelCompleteRef.current = true;
        } else if (!levelComplete) {
          prevLevelCompleteRef.current = false;
        }
      } catch (error) {
        console.error('❌ Error in handleUpdate:', error);
      }
    },
    [currentLevelIndex]
  );

  const handleNextLevel = useCallback(() => {
    if (currentLevelIndex < LEVELS.length - 1) {
      // 保存当前代码作为下一关的参考
      prevCodeRef.current = editorState.code;
      prevLevelCompleteRef.current = false;
      setCurrentLevelIndex(currentLevelIndex + 1);
    }
  }, [currentLevelIndex, editorState.code]);

  const currentLevel = LEVELS[currentLevelIndex];
  const isLevelComplete = currentLevel.validate(editorState, prevCodeRef.current);

  return (
    <div className="app">
      {/* 主编辑器区域 - 占据屏幕大部分 */}
      <div className="editor-container">
        <CodeMirror
          value={editorState.code}
          height="100%"
          extensions={[cpp(), vim()]}
          onUpdate={handleUpdate}
          basicSetup={{
            lineNumbers: true,
            highlightActiveLineGutter: true,
            foldGutter: true,
            dropCursor: true,
            allowMultipleSelections: true,
            indentOnInput: true,
            bracketMatching: true,
            closeBrackets: true,
            autocompletion: true,
            rectangularSelection: true,
            highlightSelectionMatches: true,
            searchKeymap: true,
          }}
          className="code-mirror"
          theme="dark"
        />
      </div>

      {/* 底部任务控制台 - 固定高度的任务面板 */}
      <div className="dashboard">
        <div className="dashboard-content">
          <div className="level-header">
            <div className="level-title">{currentLevel.title}</div>
            <div className="level-progress">
              {currentLevelIndex + 1} / {LEVELS.length}
            </div>
          </div>

          <div className="level-description">{currentLevel.description}</div>
          <div className="level-hint">💡 {currentLevel.hint}</div>

          <div className="status-bar">
            <div className="status-item">
              <span className="status-label">光标位置:</span>
              <span className="status-value">
                Line {editorState.line + 1}, Col {editorState.col}
              </span>
            </div>
            <div className="status-item">
              <span className="status-label">Vim 模式:</span>
              <span className={`status-value mode-${editorState.mode}`}>
                {editorState.mode === 'insert' ? '📝 INSERT' : '⚡ NORMAL'}
              </span>
            </div>
            <div className="status-item">
              <span className="status-label">总行数:</span>
              <span className="status-value">{editorState.lineCount}</span>
            </div>
          </div>

          {isLevelComplete && (
            <div className="completion-section">
              <div className="completion-message">🎉 关卡完成！</div>
              {currentLevelIndex < LEVELS.length - 1 && (
                <button className="next-button" onClick={handleNextLevel}>
                  下一关 →
                </button>
              )}
              {currentLevelIndex === LEVELS.length - 1 && (
                <div className="all-complete">
                  🏆 所有关卡完成！恭喜你掌握了 Vim 的核心操作！
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}