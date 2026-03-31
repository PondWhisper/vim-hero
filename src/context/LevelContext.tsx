import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { LevelSchema, Task } from '../types/level';

interface LevelContextType {
  currentLevel: LevelSchema | null;
  currentTaskIndex: number;
  currentTask: Task | null;
  currentCode: string;
  isCompleted: boolean;
  loadLevel: (level: LevelSchema) => void;
  handleCodeChange: (code: string) => void;
  resetTask: () => void;
}

const LevelContext = createContext<LevelContextType | undefined>(undefined);

export const LevelProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentLevel, setCurrentLevel] = useState<LevelSchema | null>(null);
  const [currentTaskIndex, setCurrentTaskIndex] = useState<number>(0);
  const [currentCode, setCurrentCode] = useState<string>('');
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  const loadLevel = useCallback((level: LevelSchema) => {
    setCurrentLevel(level);
    setCurrentTaskIndex(0);
    setCurrentCode(level.initialCode);
    setIsCompleted(false);
  }, []);

  const currentTask = currentLevel ? currentLevel.tasks[currentTaskIndex] : null;

  const handleCodeChange = useCallback((newCode: string) => {
    setCurrentCode(newCode);
    if (!currentTask || isCompleted) return;
    if (newCode === currentTask.expectedCode) {
      if (currentLevel && currentTaskIndex < currentLevel.tasks.length - 1) {
        setCurrentTaskIndex(prev => prev + 1);
      } else {
        setIsCompleted(true);
      }
    }
  }, [currentTask, currentLevel, currentTaskIndex, isCompleted]);

  const resetTask = useCallback(() => {
    if (!currentLevel) return;
    const codeToRestore = currentTaskIndex === 0 
      ? currentLevel.initialCode 
      : currentLevel.tasks[currentTaskIndex - 1].expectedCode;
    setCurrentCode(codeToRestore);
  }, [currentLevel, currentTaskIndex]);

  return (
    <LevelContext.Provider value={{ currentLevel, currentTaskIndex, currentTask, currentCode, isCompleted, loadLevel, handleCodeChange, resetTask }}>
      {children}
    </LevelContext.Provider>
  );
};

export const useLevel = () => {
  const context = useContext(LevelContext);
  if (context === undefined) throw new Error('useLevel must be used within a LevelProvider');
  return context;
};