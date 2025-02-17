import { AIModel } from '../config/models';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

export async function sendChatMessage(
  message: string,
  model: AIModel,
  previousMessages: Message[] = []
): Promise<string> {
  try {
    const apiKey = model.apiKey || import.meta.env.VITE_GROQ_API_KEY;
    const endpoint = model.endpoint || GROQ_API_URL;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model.apiId,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful AI assistant.'
          },
          ...previousMessages,
          {
            role: 'user',
            content: message
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to send message');
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Chat error:', error);
    throw error;
  }
}
