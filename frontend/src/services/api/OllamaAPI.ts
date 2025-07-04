// ============================================================================
// 🦙 Enhanced Ollama API Client - 프론트엔드 전용
// 경로: frontend/src/services/api/OllamaAPI.ts
// ============================================================================
// 백엔드의 Ollama API와 통신하는 클라이언트
// 스트리밍, 에러 처리, 로깅, 재시도 로직 포함

export interface OllamaModel {
  id: string;
  name: string;
  displayName: string;
  size: string;
  specialty: string;
  available: boolean;
  color: string;
}

export interface OllamaChatRequest {
  model: string;
  message: string;
  passportData?: {
    did: string;
    personalityProfile?: any;
    preferences?: any;
    context?: string;
  };
  options?: {
    temperature?: number;
    maxTokens?: number;
    stream?: boolean;
  };
}

export interface OllamaChatResponse {
  success: boolean;
  response?: string;
  model: string;
  processingTime: number;
  tokensUsed?: number;
  conversationId?: string;
  cueEarned?: number;
  error?: string;
}

export interface OllamaHealthResponse {
  success: boolean;
  connected: boolean;
  modelCount: number;
  models: string[];
  timestamp: string;
  processingTime: number;
  error?: string;
}

export interface OllamaStreamChunk {
  content: string;
  done: boolean;
  model: string;
  tokensUsed?: number;
  processingTime?: number;
  cueEarned?: number;
  error?: string;
}

// ============================================================================
// 🎯 Ollama API 클라이언트 클래스
// ============================================================================
export class OllamaAPIClient {
  private baseURL: string;
  private timeout: number;
  private maxRetries: number;

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    this.timeout = 60000; // 60초
    this.maxRetries = 3;
    
    console.log(`🦙 OllamaAPI 클라이언트 초기화: ${this.baseURL}`);
  }

  // ============================================================================
  // 🔧 유틸리티 메서드
  // ============================================================================

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {},
    retryCount = 0
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const startTime = Date.now();

    try {
      console.log(`🌐 Ollama API 요청: ${options.method || 'GET'} ${endpoint}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        credentials: 'include',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      console.log(`⚡ Ollama API 응답: ${response.status} (${processingTime}ms)`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error: any) {
      const endTime = Date.now();
      const processingTime = endTime - startTime;

      console.error(`❌ Ollama API 에러: ${endpoint} (${processingTime}ms)`, error.message);

      // 재시도 로직
      if (retryCount < this.maxRetries && this.shouldRetry(error)) {
        console.log(`🔄 재시도 ${retryCount + 1}/${this.maxRetries}: ${endpoint}`);
        await this.delay(Math.pow(2, retryCount) * 1000); // 지수 백오프
        return this.request<T>(endpoint, options, retryCount + 1);
      }

      throw error;
    }
  }

  private shouldRetry(error: any): boolean {
    // 네트워크 에러, 타임아웃, 서버 에러 시 재시도
    return (
      error.name === 'AbortError' ||
      error.code === 'ECONNREFUSED' ||
      error.message.includes('fetch')
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ============================================================================
  // 📊 Ollama 상태 및 모델 관리
  // ============================================================================

  /**
   * Ollama 서버 연결 상태 확인
   */
  async checkHealth(): Promise<OllamaHealthResponse> {
    try {
      const response = await this.request<OllamaHealthResponse>('/api/ollama/health');
      console.log(`🔍 Ollama 상태: ${response.connected ? 'Connected' : 'Disconnected'}`);
      return response;
    } catch (error: any) {
      console.error('❌ Ollama 상태 확인 실패:', error.message);
      return {
        success: false,
        connected: false,
        modelCount: 0,
        models: [],
        timestamp: new Date().toISOString(),
        processingTime: 0,
        error: error.message
      };
    }
  }

  /**
   * 사용 가능한 Ollama 모델 목록 조회
   */
  async getAvailableModels(): Promise<OllamaModel[]> {
    try {
      console.log('📋 Ollama 모델 목록 조회');
      
      const response = await this.request<{
        success: boolean;
        models: string[];
        connected: boolean;
        modelCount: number;
      }>('/api/ollama/models');

      if (!response.success || !response.connected) {
        console.warn('⚠️ Ollama 연결되지 않음 - 빈 모델 목록 반환');
        return [];
      }

      // 모델 정보 매핑
      const modelMap: Record<string, Omit<OllamaModel, 'id' | 'name' | 'available'>> = {
        'deepseek-coder:33b': { displayName: 'DeepSeek Coder 33B', size: '33B', specialty: '고급 코딩', color: 'bg-purple-500' },
        'deepseek-coder:6.7b': { displayName: 'DeepSeek Coder 6.7B', size: '6.7B', specialty: '빠른 코딩', color: 'bg-purple-400' },
        'codellama:13b': { displayName: 'Code Llama 13B', size: '13B', specialty: '코드 생성', color: 'bg-blue-500' },
        'codellama:7b': { displayName: 'Code Llama 7B', size: '7B', specialty: '코딩 지원', color: 'bg-blue-400' },
        'llama3.2:3b': { displayName: 'Llama 3.2 (3B)', size: '3B', specialty: '빠른 응답', color: 'bg-green-500' },
        'llama3.2:1b': { displayName: 'Llama 3.2 (1B)', size: '1B', specialty: '초고속', color: 'bg-green-400' },
        'llama3.1:70b': { displayName: 'Llama 3.1 (70B)', size: '70B', specialty: '최고 성능', color: 'bg-green-600' },
        'llama3.1:8b': { displayName: 'Llama 3.1 (8B)', size: '8B', specialty: '균형 잡힌', color: 'bg-green-500' },
        'mixtral:8x7b': { displayName: 'Mixtral 8x7B', size: '8x7B', specialty: '복잡한 추론', color: 'bg-orange-500' },
        'mistral:7b': { displayName: 'Mistral 7B', size: '7B', specialty: '정확성', color: 'bg-orange-400' },
        'phi3:mini': { displayName: 'Phi-3 Mini', size: '3B', specialty: '효율성', color: 'bg-cyan-500' },
      };

      const models: OllamaModel[] = response.models.map(modelName => ({
        id: modelName,
        name: modelName,
        available: true,
        ...modelMap[modelName] || {
          displayName: modelName,
          size: '?',
          specialty: '일반',
          color: 'bg-gray-500'
        }
      }));

      console.log(`✅ ${models.length}개 Ollama 모델 사용 가능:`, models.map(m => m.displayName));
      return models;

    } catch (error: any) {
      console.error('❌ Ollama 모델 목록 조회 실패:', error.message);
      return [];
    }
  }

  // ============================================================================
  // 💬 채팅 기능
  // ============================================================================

  /**
   * 일반 채팅 (동기식)
   */
  async sendChatMessage(request: OllamaChatRequest): Promise<OllamaChatResponse> {
    try {
      console.log(`💬 Ollama 채팅 전송: ${request.model}`);
      console.log(`📝 메시지: ${request.message.slice(0, 100)}...`);

      const response = await this.request<OllamaChatResponse>('/api/ollama/chat', {
        method: 'POST',
        body: JSON.stringify(request),
      });

      if (response.success) {
        console.log(`✅ Ollama 응답 받음: ${response.model} (${response.processingTime}ms)`);
        if (response.cueEarned) {
          console.log(`🪙 CUE 토큰 획득: +${response.cueEarned}`);
        }
      }

      return response;
    } catch (error: any) {
      console.error('❌ Ollama 채팅 실패:', error.message);
      return {
        success: false,
        model: request.model,
        processingTime: 0,
        error: error.message
      };
    }
  }

  /**
   * 스트리밍 채팅 (실시간)
   */
  async sendStreamingMessage(
    request: OllamaChatRequest,
    onChunk: (chunk: OllamaStreamChunk) => void,
    onComplete?: (finalResponse: OllamaChatResponse) => void,
    onError?: (error: Error) => void
  ): Promise<void> {
    try {
      console.log(`📡 Ollama 스트리밍 시작: ${request.model}`);

      const response = await fetch(`${this.baseURL}/api/ollama/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...request,
          options: {
            ...request.options,
            stream: true
          }
        }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Ollama 스트리밍 실패: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('스트림 리더 생성 실패');
      }

      let fullResponse = '';
      let totalTokens = 0;

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const data: OllamaStreamChunk = JSON.parse(line);
            
            if (data.content) {
              fullResponse += data.content;
              totalTokens += 1;
              onChunk(data);
            }

            if (data.done) {
              console.log(`✅ Ollama 스트리밍 완료: ${request.model}`);
              
              const finalResponse: OllamaChatResponse = {
                success: true,
                response: fullResponse,
                model: data.model,
                processingTime: data.processingTime || 0,
                tokensUsed: data.tokensUsed || totalTokens,
                cueEarned: data.cueEarned
              };

              onComplete?.(finalResponse);
              return;
            }
          } catch (parseError) {
            console.warn('⚠️ 스트림 데이터 파싱 실패:', line);
          }
        }
      }

    } catch (error: any) {
      console.error('❌ Ollama 스트리밍 에러:', error.message);
      onError?.(error);
    }
  }

  // ============================================================================
  // 🎯 특화 기능
  // ============================================================================

  /**
   * 코딩 전용 채팅
   */
  async sendCodeRequest(
    language: string,
    problem: string,
    context?: string
  ): Promise<OllamaChatResponse> {
    try {
      console.log(`💻 코딩 요청: ${language}`);

      const response = await this.request<OllamaChatResponse>('/api/ollama/code', {
        method: 'POST',
        body: JSON.stringify({
          language,
          problem,
          context
        }),
      });

      console.log(`✅ 코딩 응답 완료: ${response.model}`);
      return response;
    } catch (error: any) {
      console.error('❌ 코딩 요청 실패:', error.message);
      return {
        success: false,
        model: 'coding-model',
        processingTime: 0,
        error: error.message
      };
    }
  }

  /**
   * 빠른 응답 채팅 (작은 모델 사용)
   */
  async sendQuickMessage(message: string): Promise<OllamaChatResponse> {
    try {
      console.log(`⚡ 빠른 응답 요청`);

      const response = await this.request<OllamaChatResponse>('/api/ollama/quick', {
        method: 'POST',
        body: JSON.stringify({ message }),
      });

      console.log(`✅ 빠른 응답 완료: ${response.model}`);
      return response;
    } catch (error: any) {
      console.error('❌ 빠른 응답 실패:', error.message);
      return {
        success: false,
        model: 'quick-model',
        processingTime: 0,
        error: error.message
      };
    }
  }

  // ============================================================================
  // 🔧 유틸리티 기능
  // ============================================================================

  /**
   * 추천 모델 선택
   */
  getRecommendedModel(
    models: OllamaModel[],
    purpose: 'coding' | 'conversation' | 'quick' | 'complex'
  ): OllamaModel | null {
    const availableModels = models.filter(m => m.available);
    
    if (availableModels.length === 0) {
      console.warn('⚠️ 사용 가능한 모델이 없습니다');
      return null;
    }

    switch (purpose) {
      case 'coding':
        return availableModels.find(m => 
          m.name.includes('deepseek') || 
          m.name.includes('codellama') || 
          m.name.includes('magicoder')
        ) || availableModels[0];

      case 'quick':
        return availableModels.find(m => 
          m.name.includes('phi') || 
          m.name.includes('1b') ||
          m.size.includes('1B') ||
          m.size.includes('3B')
        ) || availableModels[0];

      case 'complex':
        return availableModels.find(m => 
          m.name.includes('70b') || 
          m.name.includes('mixtral') ||
          m.size.includes('70B')
        ) || availableModels[0];

      case 'conversation':
      default:
        return availableModels.find(m => 
          m.name.includes('llama3.2') || 
          m.name.includes('llama3.1')
        ) || availableModels[0];
    }
  }

  /**
   * 모델 카테고리별 분류
   */
  categorizeModels(models: OllamaModel[]) {
    return {
      coding: models.filter(m => 
        m.name.includes('deepseek') || 
        m.name.includes('codellama') || 
        m.name.includes('starcoder') || 
        m.name.includes('magicoder')
      ),
      conversation: models.filter(m => 
        m.name.includes('llama') && !m.name.includes('codellama')
      ),
      specialized: models.filter(m => 
        m.name.includes('mixtral') || 
        m.name.includes('mistral') || 
        m.name.includes('qwen') || 
        m.name.includes('vicuna')
      ),
      fast: models.filter(m => 
        m.name.includes('phi') ||
        m.size.includes('1B') ||
        m.size.includes('2.7B')
      )
    };
  }
}

// ============================================================================
// 🎯 싱글톤 인스턴스 export
// ============================================================================
export const ollamaAPI = new OllamaAPIClient();
export default ollamaAPI;