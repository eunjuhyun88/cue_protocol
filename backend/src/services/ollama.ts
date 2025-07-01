
// ============================================================================
// 🦙 로컬 라마(Ollama) API 서비스
// 경로: src/services/ollama.ts
// 용도: 로컬 Ollama 서버와의 연동
// ============================================================================

import axios from 'axios';

interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OllamaResponse {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
}

class OllamaService {

  private baseURL: string;
  private timeout: number;

  constructor() {
    this.baseURL = process.env.OLLAMA_URL || 'http://localhost:11434';
    this.timeout = 60000;
    console.log(`🦙 Ollama 서비스 초기화: ${this.baseURL}`);
  }

  async checkConnection(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseURL}/api/tags`, {
        timeout: 5000
      });
      console.log('✅ Ollama 서버 연결 성공');
      return true;
    } catch (error) {
      console.log('⚠️ Ollama 서버 연결 실패');
      return false;
    }
  }

  async chat(
    model: string = 'llama3.2',
    messages: OllamaMessage[],
    stream: boolean = false
  ): Promise<string> {
    try {
      console.log(`🦙 Ollama 채팅 요청: ${model}`);
      
      const response = await axios.post(`${this.baseURL}/api/chat`, {
        model,
        messages,
        stream
      }, {
        timeout: this.timeout,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result: OllamaResponse = response.data;
      console.log('✅ Ollama 응답 받음');
      
      return result.message.content;
    } catch (error: any) {
      console.error('❌ Ollama 채팅 에러:', error.message);
      
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Ollama 서버가 실행되지 않았습니다');
      }
      
      throw new Error(`Ollama API 에러: ${error.message}`);
    }
  }

  async getModels(): Promise<string[]> {
    try {
      const response = await axios.get(`${this.baseURL}/api/tags`);
      return response.data.models?.map((model: any) => model.name) || [];
    } catch (error) {
      console.error('❌ Ollama 모델 목록 가져오기 실패:', error);
      return [];
    }
  }   
  async pullModel(model: string): Promise<void> {
    // Implement the logic to pull/download the model from Ollama
    // Example (adjust as needed for your actual Ollama API):
    const response = await fetch(`${process.env.OLLAMA_URL || 'http://localhost:11434'}/api/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: model })
    });
    if (!response.ok) {
      throw new Error(`Failed to pull model: ${model}`);
    }
  }
}

const ollamaService = new OllamaService();

export { ollamaService, OllamaService };
export default ollamaService;
