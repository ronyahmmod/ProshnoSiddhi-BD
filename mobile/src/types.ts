export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
  subject: string;
  topic: string;
  difficulty: Difficulty;
  tags?: string[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  createdAt: string;
  targetExam: string;
  streakDays: number;
  xp: number;
}

export interface QuizAttempt {
  id: string;
  userId: string;
  quizTitle: string;
  subject: string;
  mode: 'practice' | 'exam';
  startedAt: string;
  completedAt: string;
  durationSeconds: number;
  totalScore: number;
  maxScore: number;
  correctCount: number;
  incorrectCount: number;
  skippedCount: number;
  accuracyPercentage: number;
}

export interface AnalyticsOverview {
  totalQuizzesTaken: number;
  totalQuestionsAttempted: number;
  overallAccuracy: number;
  averageSpeedSeconds: number;
  currentStreakDays: number;
  strongSubjects: string[];
  weakSubjects: string[];
}
