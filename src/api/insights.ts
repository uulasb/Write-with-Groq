import { AIModel } from '../config/models';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

interface InsightResponse {
  suggestions: string[];
  stats: {
    tone: string;
    clarity: number;
    engagement: number;
    readability: string;
  };
}

export async function getInsights(content: string, model: AIModel): Promise<InsightResponse> {
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
            content: `You are an expert writing assistant. Analyze the given text and provide:
            1. Three specific, actionable suggestions for improvement
            2. Stats about the writing including:
              - Overall tone (formal, casual, technical, etc.)
              - Clarity score (0-100)
              - Engagement score (0-100)
              - Readability level (elementary, intermediate, advanced)
            
            Respond in this exact JSON format:
            {
              "suggestions": ["suggestion1", "suggestion2", "suggestion3"],
              "stats": {
                "tone": "tone_here",
                "clarity": number,
                "engagement": number,
                "readability": "level_here"
              }
            }`
          },
          {
            role: 'user',
            content
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to get insights');
    }

    const data = await response.json();
    let result;
    try {
      // Try to parse as JSON first
      result = JSON.parse(data.choices[0].message.content);
    } catch (e) {
      // If JSON parsing fails, extract content and format it
      const content = data.choices[0].message.content;
      
      // Extract content between second </think> and next tag
      const thinkMatches = content.match(/<think>.*?<\/think>/gs);
      if (thinkMatches && thinkMatches.length >= 2) {
        const actualContent = content.split(thinkMatches[1])[1]?.split('<')[0].trim();
        if (actualContent) {
          try {
            result = JSON.parse(actualContent);
            return result;
          } catch (e) {
            console.log('Failed to parse JSON after think tags');
          }
        }
      }

      // Fallback: extract content manually
      const cleanContent = content.replace(/<[^>]*>/g, '').trim();
      const lines = cleanContent.split('\n').filter(line => line.trim());
      
      // Extract suggestions (first 3 lines after cleaning)
      const suggestions = lines.slice(0, 3).map(line => 
        line.replace(/^\d+\.\s*/, '').trim()
      );

      // Get stats from remaining lines
      const toneMatch = content.match(/tone:?\s*([^,\n]+)/i);
      const clarityMatch = content.match(/clarity:?\s*(\d+)/i);
      const engagementMatch = content.match(/engagement:?\s*(\d+)/i);
      const readabilityMatch = content.match(/readability:?\s*([^,\n]+)/i);

      result = {
        suggestions,
        stats: {
          tone: toneMatch?.[1]?.trim() || 'Neutral',
          clarity: parseInt(clarityMatch?.[1] || '70'),
          engagement: parseInt(engagementMatch?.[1] || '70'),
          readability: readabilityMatch?.[1]?.trim() || 'Intermediate'
        }
      };
    }
    return result;
  } catch (error) {
    console.error('Failed to get insights:', error);
    throw error;
  }
}
