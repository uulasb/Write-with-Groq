export interface AIModel {
  id: string;
  name: string;
  description: string;
  performance: number;
  apiId: string;
  type: 'chat' | 'audio' | 'versatile' | 'custom';
  endpoint?: string;
  apiKey?: string;
  isCustom?: boolean;
}

export const AI_MODELS: AIModel[] = [
  {
    id: 'llama-70b',
    name: 'LLaMA 3.3 70B',
    description: 'Most powerful model for complex tasks',
    performance: 98,
    apiId: 'llama-3.3-70b-versatile',
    type: 'versatile'
  },
  {
    id: 'llama3-70b',
    name: 'LLaMA 3 70B',
    description: 'High performance for general tasks',
    performance: 97,
    apiId: 'llama3-70b-8192',
    type: 'versatile'
  },
  {
    id: 'deepseek-llama',
    name: 'DeepSeek LLaMA 70B',
    description: 'Optimized for code and technical content',
    performance: 96,
    apiId: 'deepseek-r1-distill-llama-70b',
    type: 'versatile'
  },
  {
    id: 'qwen-32b',
    name: 'Qwen 2.5 32B',
    description: 'Fast and accurate for general tasks',
    performance: 94,
    apiId: 'qwen-2.5-32b',
    type: 'versatile'
  },
  {
    id: 'deepseek-qwen',
    name: 'DeepSeek Qwen 32B',
    description: 'Efficient for long-form content',
    performance: 93,
    apiId: 'deepseek-r1-distill-qwen-32b',
    type: 'versatile'
  },
  {
    id: 'gemma-9b',
    name: 'Gemma 2 9B',
    description: 'Fast responses with good accuracy',
    performance: 90,
    apiId: 'gemma2-9b-it',
    type: 'chat'
  },
  {
    id: 'llama3-8b',
    name: 'LLaMA 3 8B',
    description: 'Lightweight and fast responses',
    performance: 88,
    apiId: 'llama3-8b-8192',
    type: 'chat'
  },
  {
    id: 'whisper-large',
    name: 'Whisper Large V3',
    description: 'Specialized for audio transcription',
    performance: 96,
    apiId: 'distil-whisper-large-v3-en',
    type: 'audio'
  }
];
