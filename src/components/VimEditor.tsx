import React, { useRef, useEffect } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { initVimMode } from 'monaco-vim';
import { useLevel } from '../context/LevelContext';

export const VimEditor: React.FC = () => {
  const { currentLevel, currentCode, handleCodeChange } = useLevel();
  const editorRef = useRef<any>(null);
  const vimModeRef = useRef<any>(null);
  const statusBarRef = useRef<HTMLDivElement>(null);

  const handleEditorDidMount: OnMount = (editor) => {
    editorRef.current = editor;
    if (statusBarRef.current) {
      vimModeRef.current = initVimMode(editor, statusBarRef.current);
    }
    editor.updateOptions({ cursorStyle: 'block', cursorBlinking: 'solid' });
  };

  useEffect(() => {
    return () => {
      if (vimModeRef.current) vimModeRef.current.dispose();
    };
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
          onChange={(value) => value !== undefined && handleCodeChange(value)}
          onMount={handleEditorDidMount}
          options={{ minimap: { enabled: false }, lineNumbers: 'relative', fontSize: 16 }}
        />
      </div>
      <div ref={statusBarRef} style={{ height: '30px', backgroundColor: '#007acc', color: 'white', display: 'flex', alignItems: 'center', padding: '0 10px', fontFamily: 'monospace' }}>
      </div>
    </div>
  );
};