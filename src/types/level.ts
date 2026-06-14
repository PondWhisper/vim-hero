export type VimMode = 'normal' | 'insert' | 'visual' | 'replace';

export interface EditorSnapshot {
  line: number;
  col: number;
  code: string;
  lineCount: number;
}

export interface VimCommand {
  key: string;
  desc: string;
  category?: string;
}

export interface InitialCursor {
  row: number;
  col: number;
}

export interface SemanticWaypoint {
  anchorText: string;
  anchorOffset?: number;
}

export interface TargetAction {
  type: string;
  label?: string;
}

export type CommandKeys = string[];

export interface Task {
  id: string;
  instruction: string;
  expectedCode: string;
  hint: string;
}

export interface LevelSchema {
  id: string;
  title: string;
  description: string;
  language: string;
  initialCode: string;
  tasks: Task[];
}
