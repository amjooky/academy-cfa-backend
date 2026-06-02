import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

// Retrieve Qwen API key from environment variables or local configs
export function getQwenApiKey(): string | null {
  const envKey = process.env.GROQ_API_KEY || process.env.DASHSCOPE_API_KEY || process.env.apikey || process.env.QWEN_API_KEY;
  if (envKey && envKey.trim()) {
    return envKey.trim();
  }

  // Fallback to reading the physical apiQwen.txt file provided by the user
  try {
    const keyPath = process.env.QWEN_API_KEY_PATH || 'c:\\Users\\Sam\\Desktop\\projects FF\\Academy\\apiQwen.txt';
    if (fs.existsSync(keyPath)) {
      const content = fs.readFileSync(keyPath, 'utf8');
      
      // Match the apikey value (e.g., apikey=gsk_...) or direct gsk_ value
      const match = content.match(/apikey\s*=\s*([^\s\r\n]+)/i) || content.match(/(gsk_[a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
  } catch (error) {
    console.error('[QWEN CLIENT] Error reading Qwen API key file:', error);
  }
  return null;
}

// Retrieve Qwen model name from environment or apiQwen.txt
export function getQwenModel(): string {
  if (process.env.QWEN_MODEL) {
    return process.env.QWEN_MODEL;
  }
  try {
    const keyPath = process.env.QWEN_API_KEY_PATH || 'c:\\Users\\Sam\\Desktop\\projects FF\\Academy\\apiQwen.txt';
    if (fs.existsSync(keyPath)) {
      const content = fs.readFileSync(keyPath, 'utf8');
      const match = content.match(/model\s*=\s*["']([^"']+)["']/i);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
  } catch (error) {
    // Ignore and fallback to default
  }
  return 'qwen/qwen3-32b';
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function callQwen(messages: ChatMessage[], jsonMode = false): Promise<string> {
  const apiKey = getQwenApiKey();
  if (!apiKey) {
    throw new Error('Qwen API Key is missing. Please ensure your Groq key is defined in apiQwen.txt as apikey=gsk_...');
  }

  // Use Groq's API Base URL
  const baseUrl = process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1';
  const url = `${baseUrl}/chat/completions`;

  const model = getQwenModel();
  console.log(`[QWEN CLIENT] Invoking Groq Qwen API with model: ${model}`);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.6,
      ...(jsonMode ? { response_format: { type: 'json_object' } } : {})
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Groq API error (${response.status}): ${errText}`);
  }

  const data = await response.json() as any;
  return data.choices[0].message.content;
}
