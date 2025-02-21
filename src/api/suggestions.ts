import { AIModel } from '../config/models';
import axios from 'axios';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

export async function getSuggestions(prompt: string, model?: AIModel): Promise<string[]> {
  try {
    if (!model) {
      throw new Error('No AI model selected');
    }

    const apiKey = model.apiKey || import.meta.env.VITE_GROQ_API_KEY;
    const endpoint = model.endpoint || GROQ_API_URL;

    if (!apiKey) throw new Error('API key is not configured');

    const response = await axios.post(
      endpoint,
      {
        model: model.apiId,
        messages: [
          {
            role: "system",
            content: "Provide exactly 3 concise continuation suggestions formatted as: 1. Suggestion 1 | 2. Suggestion 2 | 3. Suggestion 3"
          },
          {
            role: 'user',
            content: `Suggest continuations for: "${prompt}"`
          }
        ],
        temperature: 0.75,
        max_tokens: 150,
        top_p: 0.9
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );

    const completion = response.data.choices[0].message.content;
    const suggestions = completion
      .split(/[0-9]+\.|\|/)
      .map(s => s.trim().replace(/["']/g, ''))
      .filter(s => s.length > 0 && !s.toLowerCase().includes("suggestion"))
      .slice(0, 3);

    return suggestions.length >= 3 ? suggestions : [
      'Continue this thought...',
      'Expand on this idea...',
      'Add more details...'
    ];
  } catch (error) {
    console.error('API Error:', error.response?.data || error.message);
    return ['Suggestions unavailable', 'Check API connection', 'Try again later'];
  }
}