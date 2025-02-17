export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIModel {
  id: string;
  name: string;
  description: string;
  performance: number;
  apiId: string;
}

export interface WritingStats {
  words: number;
  characters: number;
  readingTime: string;
  aiAssists: number;
}

export interface AIResponse {
  content: string;
  error?: string;
}