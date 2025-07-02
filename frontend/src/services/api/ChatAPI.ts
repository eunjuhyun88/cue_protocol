// ============================================================================
// 📁 src/services/api/ChatAPI.ts
// 💬 채팅 API 클라이언트 (변수명 충돌 해결)
// ============================================================================

import { PersistentDataAPIClient } from './PersistentDataAPIClient';

export interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: string;
  model?: string;
  cueReward?: number;
  trustScore?: number;
  contextLearned?: boolean;
  qualityScore?: number;
  attachments?: File[];
  metadata?: any;
}

export interface ChatResponse {
  response: string;
  model: string;
  timestamp: string;
  cueReward?: number;
  trustScore?: number;
  contextLearned?: boolean;
  qualityScore?: number;
  processingTime?: number;
  tokensUsed?: number;
}

export class ChatAPI {
  private persistentClient: PersistentDataAPIClient;

  constructor() {
    this.persistentClient = new PersistentDataAPIClient();
  }

  // 기본 채팅 메시지 전송
  async sendMessage(message: string, model: string = 'gpt-4o', userDid?: string): Promise<ChatResponse> {
    return this.persistentClient.sendChatMessage(message, model, userDid);
  }

  // 고급 채팅 (파일 첨부 지원)
  async sendAdvancedMessage(
    message: string,
    options: {
      model?: string;
      userDid?: string;
      attachments?: File[];
      context?: any;
      personalizations?: string[];
    } = {}
  ): Promise<ChatResponse> {
    try {
      const {
        model = 'gpt-4o',
        userDid,
        attachments = [],
        context,
        personalizations = []
      } = options;

      // 파일 첨부가 있는 경우 먼저 업로드
      let uploadedFiles = [];
      if (attachments.length > 0) {
        uploadedFiles = await this.uploadAttachments(attachments, userDid);
      }

      const requestData = {
        message,
        model,
        userDid,
        attachments: uploadedFiles,
        context,
        personalizations,
        timestamp: new Date().toISOString()
      };

      return await this.persistentClient.request('/api/ai/chat/advanced', {
        method: 'POST',
        body: JSON.stringify(requestData)
      });

    } catch (error) {
      console.warn('고급 채팅 실패, 기본 채팅으로 fallback');
      return this.sendMessage(message, options.model, options.userDid);
    }
  }

  // 스트리밍 채팅 (실시간 응답)
  async sendStreamingMessage(
    message: string,
    options: {
      model?: string;
      userDid?: string;
      onChunk?: (chunk: string) => void;
      onComplete?: (response: ChatResponse) => void;
    } = {}
  ): Promise<ChatResponse> {
    try {
      const { model = 'gpt-4o', userDid, onChunk, onComplete } = options;

      // WebSocket 스트리밍 시도
      if (this.persistentClient.websocket?.readyState === WebSocket.OPEN) {
        return this.handleWebSocketStreaming(message, { model, userDid, onChunk, onComplete });
      }

      // HTTP 스트리밍 fallback
      return this.handleHttpStreaming(message, { model, userDid, onChunk, onComplete });

    } catch (error) {
      console.warn('스트리밍 실패, 기본 채팅으로 fallback');
      return this.sendMessage(message, options.model, options.userDid);
    }
  }

  // WebSocket 스트리밍 처리
  private async handleWebSocketStreaming(
    message: string,
    options: any
  ): Promise<ChatResponse> {
    return new Promise((resolve, reject) => {
      const { model, userDid, onChunk, onComplete } = options;
      let fullResponse = '';
      let startTime = Date.now();

      const messageId = `stream_${Date.now()}`;
      
      // 메시지 전송
      this.persistentClient.websocket?.send(JSON.stringify({
        type: 'chat_stream',
        messageId,
        message,
        model,
        userDid
      }));

      // 응답 리스너
      const listener = (data: any) => {
        if (data.messageId === messageId) {
          if (data.type === 'chunk') {
            fullResponse += data.content;
            onChunk?.(data.content);
          } else if (data.type === 'complete') {
            const chatResponse: ChatResponse = {
              response: fullResponse,
              model: data.model || model,
              timestamp: new Date().toISOString(),
              cueReward: data.cueReward,
              trustScore: data.trustScore,
              processingTime: Date.now() - startTime
            };
            
            onComplete?.(chatResponse);
            resolve(chatResponse);
          } else if (data.type === 'error') {
            reject(new Error(data.error));
          }
        }
      };

      // 리스너 등록
      const unsubscribe = this.persistentClient.onRealtimeUpdate(listener);

      // 타임아웃 처리
      setTimeout(() => {
        unsubscribe();
        if (fullResponse) {
          resolve({
            response: fullResponse,
            model,
            timestamp: new Date().toISOString(),
            processingTime: Date.now() - startTime
          });
        } else {
          reject(new Error('WebSocket streaming timeout'));
        }
      }, 30000);
    });
  }

  // HTTP 스트리밍 처리 (변수명 충돌 해결)
  private async handleHttpStreaming(
    message: string,
    options: any
  ): Promise<ChatResponse> {
    const { model, userDid, onChunk, onComplete } = options;
    
    try {
      const httpResponse = await fetch(`${this.persistentClient.baseURL}/api/ai/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('cue_session_token')}`
        },
        body: JSON.stringify({ message, model, userDid })
      });

      if (!httpResponse.body) {
        throw new Error('스트리밍 응답 없음');
      }

      const reader = httpResponse.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';
      let startTime = Date.now();

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              const finalResponse: ChatResponse = {
                response: fullResponse,
                model,
                timestamp: new Date().toISOString(),
                processingTime: Date.now() - startTime
              };
              onComplete?.(finalResponse);
              return finalResponse;
            }
            
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                fullResponse += parsed.content;
                onChunk?.(parsed.content);
              }
            } catch (e) {
              console.warn('스트리밍 파싱 오류:', e);
            }
          }
        }
      }

      const streamResponse: ChatResponse = {
        response: fullResponse,
        model,
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime
      };
      
      return streamResponse;

    } catch (error) {
      throw new Error(`HTTP 스트리밍 실패: ${error}`);
    }
  }

  // 파일 첨부 업로드
  private async uploadAttachments(files: File[], userDid?: string): Promise<any[]> {
    try {
      const uploads = files.map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        if (userDid) formData.append('userDid', userDid);

        const uploadResponse = await this.persistentClient.request('/api/files/upload', {
          method: 'POST',
          body: formData,
          headers: {} // FormData는 Content-Type 자동 설정
        });

        return {
          name: file.name,
          type: file.type,
          size: file.size,
          url: uploadResponse.url,
          id: uploadResponse.id
        };
      });

      return await Promise.all(uploads);
    } catch (error) {
      console.warn('파일 업로드 실패:', error);
      return files.map(file => ({
        name: file.name,
        type: file.type,
        size: file.size,
        error: 'Upload failed'
      }));
    }
  }

  // 채팅 기록 조회
  async getHistory(userDid: string, limit: number = 50, offset: number = 0): Promise<ChatMessage[]> {
    try {
      const historyResponse = await this.persistentClient.request(
        `/api/chat/history/${userDid}?limit=${limit}&offset=${offset}`
      );
      return historyResponse.messages || [];
    } catch (error) {
      // Mock 채팅 기록
      return this.generateMockHistory(limit);
    }
  }

  // 채팅 저장
  async saveMessage(userDid: string, message: ChatMessage): Promise<boolean> {
    try {
      const saveResponse = await this.persistentClient.request('/api/chat/save', {
        method: 'POST',
        body: JSON.stringify({
          userDid,
          ...message
        })
      });
      return saveResponse.success;
    } catch (error) {
      console.warn('메시지 저장 실패:', error);
      return false;
    }
  }

  // 채팅 컨텍스트 분석
  async analyzeContext(userDid: string, recentMessages: ChatMessage[]): Promise<any> {
    try {
      return await this.persistentClient.request('/api/chat/analyze', {
        method: 'POST',
        body: JSON.stringify({
          userDid,
          messages: recentMessages
        })
      });
    } catch (error) {
      return {
        topics: ['AI', 'Protocol', 'Web3'],
        sentiment: 'positive',
        complexity: 'medium',
        personalizations: ['기술적 관심', '혁신적 사고'],
        fallback: true
      };
    }
  }

  // 모델 목록 조회
  async getAvailableModels(): Promise<any[]> {
    try {
      const modelsResponse = await this.persistentClient.request('/api/ai/models');
      return modelsResponse.models || [];
    } catch (error) {
      return [
        { id: 'personalized-agent', name: 'Personal Agent', description: 'AI Passport 기반' },
        { id: 'llama3.2:3b', name: '🦙 Llama 3.2 (3B)', description: '로컬 고속' },
        { id: 'llama3.2:1b', name: '🦙 Llama 3.2 (1B)', description: '로컬 초고속' },
        { id: 'qwen2.5:3b', name: '🇰🇷 Qwen 2.5 (3B)', description: '한국어 우수' },
        { id: 'gemma2:2b', name: '🤖 Gemma 2 (2B)', description: 'Google 로컬' },
        { id: 'gpt-4o', name: '☁️ GPT-4o', description: 'OpenAI 클라우드' },
        { id: 'claude-3.5-sonnet', name: '☁️ Claude 3.5', description: 'Anthropic 클라우드' },
        { id: 'gemini-pro', name: '☁️ Gemini Pro', description: 'Google 클라우드' }
      ];
    }
  }

  // Mock 채팅 기록 생성
  private generateMockHistory(limit: number): ChatMessage[] {
    const messages: ChatMessage[] = [];
    const sampleMessages = [
      { type: 'user', content: 'CUE Protocol에 대해 설명해줘' },
      { type: 'ai', content: 'CUE Protocol은 AI 개인화를 위한 혁신적인 블록체인 플랫폼입니다...', cueReward: 5 },
      { type: 'user', content: 'RAG-DAG가 뭐야?' },
      { type: 'ai', content: 'RAG-DAG는 Retrieval-Augmented Generation with Directed Acyclic Graph의 줄임말로...', cueReward: 8 }
    ];

    for (let i = 0; i < Math.min(limit, sampleMessages.length * 2); i++) {
      const sample = sampleMessages[i % sampleMessages.length];
      messages.push({
        id: `mock_${i}`,
        type: sample.type as 'user' | 'ai',
        content: sample.content,
        timestamp: new Date(Date.now() - (limit - i) * 60000).toISOString(),
        cueReward: sample.cueReward,
        trustScore: sample.type === 'ai' ? 0.85 + Math.random() * 0.15 : undefined
      });
    }

    return messages;
  }
}

export default ChatAPI;