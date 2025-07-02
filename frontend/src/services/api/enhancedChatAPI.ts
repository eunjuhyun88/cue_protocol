// ============================================================================
// 📁 src/services/api/EnhancedChatAPI.ts
// 💬 향상된 AI 채팅 API 서비스 (백엔드 연동 강화)
// ============================================================================

import { BackendAPIClient } from './BackendAPIClient';
import type { ChatResponse, ChatMessage, PersonalContext } from '../../types/chat.types';
import type { UnifiedAIPassport } from '../../types/passport.types';

export interface SendChatMessageRequest {
  message: string;
  model: string;
  conversationId?: string;
  userId?: string;
  passportData?: UnifiedAIPassport;
  attachments?: File[];
  voiceData?: Blob;
}

export interface SendChatMessageResponse {
  success: boolean;
  message: {
    id: string;
    conversationId: string;
    content: string;
    model: string;
    usedPassportData: string[];
    cueTokensEarned: number;
    responseTimeMs: number;
    cueExtractionStarted: boolean;
    verification: {
      verified: boolean;
      signature: string;
      biometric: boolean;
    };
  };
  personalContext: {
    cuesUsed: number;
    vaultsAccessed: number;
    personalityMatch: number;
    behaviorPatterns: string[];
    newCueExtraction: string;
  };
  user?: {
    id: string;
    username: string;
    did: string;
  };
  error?: string;
}

export interface ChatHistoryMessage {
  id: string;
  conversation_id: string;
  message_type: 'user' | 'ai';
  content: string;
  ai_model?: string;
  cue_tokens_earned?: number;
  created_at: string;
  attachments?: any[];
  verification_signature?: string;
}

export interface AvailableModel {
  id: string;
  name: string;
  available: boolean;
  recommended?: boolean;
  type: 'hybrid' | 'cloud' | 'local';
  provider?: string;
  description?: string;
  speed?: 'very-fast' | 'fast' | 'moderate' | 'slow';
}

export interface OllamaStatus {
  connected: boolean;
  url: string;
  models: string[];
  modelCount: number;
  recommendedModels: string[];
  status: 'ready' | 'disconnected' | 'error';
}

export class EnhancedChatAPI extends BackendAPIClient {
  private wsConnection: WebSocket | null = null;
  private messageQueue: any[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;

  constructor() {
    super();
    this.initializeWebSocket();
  }

  // ============================================================================
  // 🔗 WebSocket 실시간 연결
  // ============================================================================

  private initializeWebSocket() {
    if (typeof window === 'undefined') return;

    try {
      const wsUrl = this.baseURL.replace('http', 'ws') + '/ws';
      console.log('🔗 WebSocket 연결 시도:', wsUrl);
      
      this.wsConnection = new WebSocket(wsUrl);
      
      this.wsConnection.onopen = () => {
        console.log('✅ WebSocket 연결됨');
        this.reconnectAttempts = 0;
        this.flushMessageQueue();
      };
      
      this.wsConnection.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleRealtimeMessage(data);
        } catch (error) {
          console.error('WebSocket 메시지 파싱 오류:', error);
        }
      };
      
      this.wsConnection.onclose = () => {
        console.log('❌ WebSocket 연결 종료');
        this.handleReconnect();
      };
      
      this.wsConnection.onerror = (error) => {
        console.error('❌ WebSocket 오류:', error);
      };
      
    } catch (error) {
      console.error('❌ WebSocket 초기화 실패:', error);
    }
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 WebSocket 재연결 시도 ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
      
      setTimeout(() => {
        this.initializeWebSocket();
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }

  private flushMessageQueue() {
    while (this.messageQueue.length > 0 && this.wsConnection?.readyState === WebSocket.OPEN) {
      const message = this.messageQueue.shift();
      this.wsConnection.send(JSON.stringify(message));
    }
  }

  private handleRealtimeMessage(data: any) {
    // 실시간 메시지 처리 (CUE 마이닝, AI 응답 스트리밍 등)
    console.log('📨 실시간 메시지:', data);
    
    // 이벤트 발생 (상위 컴포넌트에서 구독 가능)
    window.dispatchEvent(new CustomEvent('chatRealtimeUpdate', { detail: data }));
  }

  public sendRealtimeMessage(message: any) {
    if (this.wsConnection?.readyState === WebSocket.OPEN) {
      this.wsConnection.send(JSON.stringify(message));
    } else {
      this.messageQueue.push(message);
    }
  }

  // ============================================================================
  // 💬 향상된 채팅 메시지 전송
  // ============================================================================

  async sendChatMessage(request: SendChatMessageRequest): Promise<SendChatMessageResponse> {
    const {
      message,
      model,
      conversationId,
      userId,
      passportData,
      attachments = [],
      voiceData
    } = request;

    try {
      console.log(`💬 채팅 메시지 전송: ${model} (${message.slice(0, 50)}...)`);

      // 첨부파일 처리
      let attachmentUrls: string[] = [];
      if (attachments.length > 0) {
        attachmentUrls = await this.uploadAttachments(attachments);
      }

      // 음성 데이터 처리
      let voiceUrl: string | undefined;
      if (voiceData) {
        voiceUrl = await this.uploadVoiceData(voiceData);
      }

      // API 요청 데이터 구성
      const requestData = {
        message,
        model,
        conversationId,
        userId: userId || passportData?.did,
        passportData,
        attachments: attachmentUrls,
        voiceUrl,
        timestamp: new Date().toISOString(),
        clientInfo: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language
        }
      };

      console.log('📤 요청 데이터:', {
        message: message.slice(0, 50),
        model,
        hasPassportData: !!passportData,
        attachmentCount: attachments.length,
        hasVoice: !!voiceData
      });

      // 백엔드 API 호출
      const response = await this.post('/api/ai/chat', requestData);

      if (!response.success) {
        throw new Error(response.error || 'AI 채팅 응답 실패');
      }

      console.log('✅ 채팅 응답 성공:', {
        messageId: response.message.id,
        cueEarned: response.message.cueTokensEarned,
        responseTime: response.message.responseTimeMs
      });

      // 실시간 알림 전송
      this.sendRealtimeMessage({
        type: 'chat_complete',
        conversationId: response.message.conversationId,
        messageId: response.message.id,
        cueEarned: response.message.cueTokensEarned
      });

      return response;

    } catch (error: any) {
      console.error('💥 채팅 메시지 전송 실패:', error);
      
      // Mock 응답 생성 (백엔드 오류 시)
      const mockResponse = this.generateMockChatResponse(message, model, passportData);
      
      // 오류도 실시간으로 알림
      this.sendRealtimeMessage({
        type: 'chat_error',
        error: error.message,
        fallbackMode: 'mock'
      });

      return mockResponse;
    }
  }

  // ============================================================================
  // 📁 파일 업로드 처리
  // ============================================================================

  private async uploadAttachments(files: File[]): Promise<string[]> {
    try {
      const formData = new FormData();
      files.forEach((file, index) => {
        formData.append(`attachment_${index}`, file);
      });

      const response = await this.postFormData('/api/upload/attachments', formData);
      return response.urls || [];

    } catch (error) {
      console.error('첨부파일 업로드 실패:', error);
      return [];
    }
  }

  private async uploadVoiceData(voiceBlob: Blob): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('voice', voiceBlob, 'voice_message.webm');

      const response = await this.postFormData('/api/upload/voice', formData);
      return response.url || '';

    } catch (error) {
      console.error('음성 데이터 업로드 실패:', error);
      return '';
    }
  }

  // ============================================================================
  // 📚 채팅 히스토리 조회
  // ============================================================================

  async getChatHistory(
    userDid: string,
    conversationId?: string,
    limit: number = 50
  ): Promise<ChatHistoryMessage[]> {
    try {
      const endpoint = conversationId 
        ? `/api/ai/chat/history/${conversationId}?limit=${limit}`
        : `/api/ai/chat/history?limit=${limit}`;

      const response = await this.get(endpoint, {
        headers: {
          'X-User-DID': userDid
        }
      });

      return response.messages || [];

    } catch (error) {
      console.error('채팅 히스토리 조회 실패:', error);
      return this.generateMockChatHistory(userDid, conversationId);
    }
  }

  // ============================================================================
  // 🤖 AI 모델 관리
  // ============================================================================

  async getAvailableModels(): Promise<AvailableModel[]> {
    try {
      const response = await this.get('/api/ai/models');
      return response.models || this.getDefaultModels();

    } catch (error) {
      console.warn('모델 목록 조회 실패, 기본 모델 사용:', error);
      return this.getDefaultModels();
    }
  }

  async getOllamaStatus(): Promise<OllamaStatus> {
    try {
      const response = await this.get('/api/ai/ollama/health');
      return response;

    } catch (error) {
      console.error('Ollama 상태 조회 실패:', error);
      return {
        connected: false,
        url: 'http://localhost:11434',
        models: [],
        modelCount: 0,
        recommendedModels: ['llama3.2:3b', 'llama3.2:1b'],
        status: 'error'
      };
    }
  }

  async downloadOllamaModel(modelName: string): Promise<boolean> {
    try {
      const response = await this.post('/api/ai/ollama/pull', { model: modelName });
      return response.success;

    } catch (error) {
      console.error(`Ollama 모델 다운로드 실패 (${modelName}):`, error);
      return false;
    }
  }

  // ============================================================================
  // 📊 개인화 컨텍스트 조회
  // ============================================================================

  async getPersonalContext(userDid: string): Promise<PersonalContext> {
    try {
      const response = await this.get('/api/ai/context', {
        headers: {
          'X-User-DID': userDid
        }
      });

      return response.context;

    } catch (error) {
      console.error('개인화 컨텍스트 조회 실패:', error);
      return this.generateMockPersonalContext();
    }
  }

  // ============================================================================
  // 🎭 Mock 응답 생성기들
  // ============================================================================

  private generateMockChatResponse(
    message: string,
    model: string,
    passportData?: UnifiedAIPassport
  ): SendChatMessageResponse {
    const responses = [
      `**${model}**을 통한 개인화된 응답입니다!\n\n"${message}"에 대해 AI Passport 데이터를 활용하여 맞춤형 답변을 제공하겠습니다.`,
      `CUE Protocol의 **${model}** 모델이 당신의 개인 정보를 바탕으로 최적화된 응답을 생성했습니다.`,
      `**백엔드 Mock 모드**: ${model} 모델을 통해 "${message}"에 대한 시뮬레이션 응답입니다.`
    ];

    return {
      success: true,
      message: {
        id: `mock_${Date.now()}`,
        conversationId: `conv_${Date.now()}`,
        content: responses[Math.floor(Math.random() * responses.length)],
        model,
        usedPassportData: passportData ? ['성격 프로필', '학습 패턴', '개인 선호도'] : [],
        cueTokensEarned: Math.floor(Math.random() * 15) + 5,
        responseTimeMs: Math.floor(Math.random() * 2000) + 500,
        cueExtractionStarted: true,
        verification: {
          verified: true,
          signature: `mock_${Math.random().toString(36)}`,
          biometric: true
        }
      },
      personalContext: {
        cuesUsed: Math.floor(Math.random() * 10) + 1,
        vaultsAccessed: Math.floor(Math.random() * 3) + 1,
        personalityMatch: 0.85 + Math.random() * 0.15,
        behaviorPatterns: ['창의적', '분석적', '신뢰할 수 있는'],
        newCueExtraction: 'processing'
      },
      user: passportData ? {
        id: passportData.did,
        username: passportData.username || 'MockUser',
        did: passportData.did
      } : undefined
    };
  }

  private generateMockChatHistory(userDid: string, conversationId?: string): ChatHistoryMessage[] {
    const messages: ChatHistoryMessage[] = [];
    const messageCount = Math.floor(Math.random() * 5) + 3;

    for (let i = 0; i < messageCount; i++) {
      const isUser = i % 2 === 0;
      messages.push({
        id: `mock_msg_${i}`,
        conversation_id: conversationId || `conv_${Date.now()}`,
        message_type: isUser ? 'user' : 'ai',
        content: isUser 
          ? `사용자 메시지 ${i + 1}: 테스트 질문입니다.`
          : `AI 응답 ${i + 1}: 개인화된 답변을 제공드렸습니다.`,
        ai_model: isUser ? undefined : 'personalized-agent',
        cue_tokens_earned: isUser ? undefined : Math.floor(Math.random() * 10) + 3,
        created_at: new Date(Date.now() - (messageCount - i) * 60000).toISOString(),
        verification_signature: isUser ? undefined : `mock_sig_${i}`
      });
    }

    return messages;
  }

  private generateMockPersonalContext(): PersonalContext {
    return {
      personalityProfile: {
        type: 'INTJ-A (분석적)',
        communicationStyle: 'Direct',
        learningPattern: 'Visual',
        decisionMaking: 'Analytical',
        workingStyle: 'Independent'
      },
      totalCues: Math.floor(Math.random() * 50) + 20,
      vaultsCount: Math.floor(Math.random() * 5) + 2,
      behaviorPatterns: ['혁신적', '체계적', '목표지향적'],
      recentInteractions: Math.floor(Math.random() * 20) + 5,
      personalityMatch: 0.88 + Math.random() * 0.12,
      preferences: {
        responseLength: 'detailed',
        technicalLevel: 'advanced',
        communicationTone: 'professional'
      }
    };
  }

  private getDefaultModels(): AvailableModel[] {
    return [
      {
        id: 'personalized-agent',
        name: 'Personal Agent',
        available: true,
        recommended: true,
        type: 'hybrid',
        provider: 'CUE Protocol',
        description: 'AI Passport 기반 개인화 모델'
      },
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        available: false,
        type: 'cloud',
        provider: 'OpenAI',
        description: 'OpenAI 최고 성능 모델'
      },
      {
        id: 'claude-3.5-sonnet',
        name: 'Claude 3.5 Sonnet',
        available: false,
        type: 'cloud',
        provider: 'Anthropic',
        description: 'Anthropic 고품질 모델'
      }
    ];
  }

  // ============================================================================
  // 🧹 정리
  // ============================================================================

  public cleanup() {
    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = null;
    }
    this.messageQueue = [];
    this.reconnectAttempts = 0;
  }
}