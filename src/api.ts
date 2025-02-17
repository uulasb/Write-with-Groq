import axios from 'axios';
import { Message, AIResponse } from './types';
export { getSuggestions } from './api/suggestions';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

export const generateCompletion = async (
  messages: Message[],
  model: string
): Promise<AIResponse> => {
  try {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY;
    
    if (!apiKey) {
      throw new Error('GROQ API key is not configured');
    }

    const response = await axios.post(
      GROQ_API_URL,
      {
        model,
        messages,
        temperature: 0.7,
        max_tokens: 1000
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );

    return {
      content: response.data.choices[0].message.content
    };
  } catch (error) {
    console.error('AI Generation Error:', error);
    return {
      content: '',
      error: error instanceof Error ? error.message : 'Failed to generate AI response'
    };
  }
};