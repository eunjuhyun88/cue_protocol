// src/services/ai/AIService.ts
// ============================================================================
// 🤖 AIService 모듈 - OpenAI 및 Anthropic API를 통한 AI 채팅 및 응답 생성
// ============================================================================

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

export class AIService {
  private openai: OpenAI | null = null;
  private anthropic: Anthropic | null = null;

  constructor() {
    // OpenAI 초기화
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    }

    // Anthropic 초기화
    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY
      });
    }
  }

  async chatWithGPT(message: string, context?: any): Promise<string> {
    if (!this.openai) {
      return this.getMockResponse(message, 'GPT-4');
    }

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are a helpful AI assistant.' },
          { role: 'user', content: message }
        ],
        max_tokens: 1000
      });

      return completion.choices[0]?.message?.content || 'No response generated.';
    } catch (error) {
      console.error('OpenAI API Error:', error);
      return this.getMockResponse(message, 'GPT-4 (Error)');
    }
  }

  async chatWithClaude(message: string, context?: any): Promise<string> {
    if (!this.anthropic) {
      return this.getMockResponse(message, 'Claude');
    }

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 1000,
        messages: [{ role: 'user', content: message }]
      });

      const content = response.content?.[0];
      if (content && content.type === 'text' && 'text' in content) {
        return content.text;
      }
      return 'No response generated.';
    } catch (error) {
      console.error('Anthropic API Error:', error);
      return this.getMockResponse(message, 'Claude (Error)');
    }
  }

  private getMockResponse(message: string, model: string): string {
    return `**${model} Mock Response**

Your message: "${message}"

This is a mock response because the API key is not configured or there was an error. 

To enable real AI responses:
1. Set OPENAI_API_KEY in .env file
2. Set ANTHROPIC_API_KEY in .env file
3. Restart the server

Mock response generated at: ${new Date().toISOString()}`;
  }
}

export default new AIService();