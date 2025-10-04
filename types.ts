// Types for the educational game app

// User profile type
export type UserProfile = {
  id: string;
  name: string;
  age: string;
  level: number;
  avatar: string;
};

// Learning card type
export type LearningCard = {
  id: string;
  title: string;
  image: string;
  description: string;
  difficulty: 'basic' | 'intermediate' | 'advanced';
  category: 'logic' | 'patterns' | 'focus' | 'numbers' | 'stories';
};

// Navigation item type
export type NavItem = {
  id: string;
  icon: string;
  label: string;
  route: string;
};

// Game level type
export type GameLevel = 'Basic' | 'Intermediate' | 'Advanced';

// Game progress type
export type GameProgress = {
  userId: string;
  completedLessons: string[];
  currentLesson: string;
  score: number;
  achievements: string[];
};

// Theme type for styling
export type ThemeColors = {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  textLight: string;
};

// African theme colors
export const africanThemeColors: ThemeColors = {
  primary: '#5A3CBE',
  secondary: '#7B5AF0',
  accent: '#FFD700',
  background: '#F5F5F5',
  text: '#333333',
  textLight: '#FFFFFF',
};