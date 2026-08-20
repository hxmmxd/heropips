import { GoogleGenAI } from '@google/genai';
import { LlmClient, GenerationOptions, PipelineConfig } from '../types.js';
import { MockLlmClient } from './mockClient.js';

export interface GeminiClientConfig {
  apiKey?: string;
  model?: string;
}

export interface RestGeminiClientConfig {
  apiKey?: string;
  model?: string;
  apiEndpoint?: string;
}

/**
 * Gemini SDK-backed LLM Client using @google/genai
 */
export class GeminiLlmClient implements LlmClient {
  private ai: GoogleGenAI;
  private model: string;

  constructor(config: GeminiClientConfig = {}) {
    const apiKey = config.apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error(
        'GeminiLlmClient initialization failed: GEMINI_API_KEY or GOOGLE_API_KEY must be provided.'
      );
    }

    this.ai = new GoogleGenAI({ apiKey });
    this.model = config.model || 'gemini-2.5-flash';
  }

  public async generateContent(prompt: string, options?: GenerationOptions): Promise<string> {
    try {
      const generateConfig: Record<string, any> = {};

      if (options?.temperature !== undefined) {
        generateConfig.temperature = options.temperature;
      }
      if (options?.maxTokens !== undefined) {
        generateConfig.maxOutputTokens = options.maxTokens;
      }
      if (options?.jsonMode) {
        generateConfig.responseMimeType = 'application/json';
      }

      const response = await this.ai.models.generateContent({
        model: this.model,
        contents: prompt,
        config: Object.keys(generateConfig).length > 0 ? generateConfig : undefined
      });

      return response.text ?? '';
    } catch (error: any) {
      throw new Error(`Gemini API call failed (${this.model}): ${error?.message || error}`);
    }
  }
}

/**
 * Native REST fetch fallback client for direct Google Generative Language API calls
 */
export class RestGeminiLlmClient implements LlmClient {
  private apiKey: string;
  private model: string;
  private endpoint: string;

  constructor(config: RestGeminiClientConfig = {}) {
    const apiKey = config.apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error(
        'RestGeminiLlmClient initialization failed: GEMINI_API_KEY or GOOGLE_API_KEY must be provided.'
      );
    }

    this.apiKey = apiKey;
    this.model = config.model || 'gemini-2.5-flash';
    this.endpoint =
      config.apiEndpoint ||
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`;
  }

  public async generateContent(prompt: string, options?: GenerationOptions): Promise<string> {
    const url = `${this.endpoint}?key=${this.apiKey}`;
    const generationConfig: Record<string, any> = {};

    if (options?.temperature !== undefined) {
      generationConfig.temperature = options.temperature;
    }
    if (options?.maxTokens !== undefined) {
      generationConfig.maxOutputTokens = options.maxTokens;
    }
    if (options?.jsonMode) {
      generationConfig.responseMimeType = 'application/json';
    }

    const payload = {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: Object.keys(generationConfig).length > 0 ? generationConfig : undefined
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`REST Gemini API request failed (HTTP ${res.status}): ${errText}`);
    }

    const data: any = await res.json();
    const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof candidateText !== 'string') {
      throw new Error('REST Gemini API returned an empty or invalid response format.');
    }

    return candidateText;
  }
}

/**
 * Client factory creating the appropriate LlmClient instance based on configuration
 */
export function createLlmClient(
  config: Partial<PipelineConfig> & { useRest?: boolean; defaultResponse?: string } = {}
): LlmClient {
  if (config.mockLlm) {
    return new MockLlmClient(config.defaultResponse);
  }

  const apiKey = config.geminiApiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    // If no API key is set in environment or config, default to MockLlmClient with warning
    return new MockLlmClient(config.defaultResponse);
  }

  if (config.useRest) {
    return new RestGeminiLlmClient({
      apiKey,
      model: config.geminiModel || 'gemini-2.5-flash'
    });
  }

  return new GeminiLlmClient({
    apiKey,
    model: config.geminiModel || 'gemini-2.5-flash'
  });
}
