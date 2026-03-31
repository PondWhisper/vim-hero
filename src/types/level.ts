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