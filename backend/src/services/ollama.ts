// ============================================================================
// 🤖 backend/src/services/ollama.ts
// 🔧 Ollama 연결 문제 해결 및 안정성 개선
// ============================================================================

interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

interface OllamaError {
  error: string;
  code?: string;
}

export class OllamaService {
  private static instance: OllamaService;
  private baseUrl: string;
  private timeout: number;
  private retryCount: number;
  private isAvailable: boolean = false;
  private lastHealthCheck: number = 0;
  private healthCheckInterval: number = 5 * 60 * 1000; // 5분

  private constructor() {
    this.baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    this.timeout = parseInt(process.env.OLLAMA_TIMEOUT || '60000');
    this.retryCount = parseInt(process.env.OLLAMA_RETRY_COUNT || '3');
    
    console.log('🤖 Ollama Service 초기화:', {
      baseUrl: this.baseUrl,
      timeout: this.timeout,
      retryCount: this.retryCount
    });

    // 초기 헬스체크
    this.checkHealth().catch(error => {
      console.warn('⚠️ Ollama 초기 연결 실패 - 필요시 재시도합니다:', error.message);
    });
  }

  public static getInstance(): OllamaService {
    if (!OllamaService.instance) {
      OllamaService.instance = new OllamaService();
    }
    return OllamaService.instance;
  }

  // ============================================================================
  // 🔍 헬스체크 및 연결 관리
  // ============================================================================

  /**
   * ✅ Ollama 서비스 헬스체크 (향상된 로직)
   */
  async checkHealth(): Promise<boolean> {
    const now = Date.now();
    
    // 최근에 체크했으면 캐시된 결과 사용
    if (now - this.lastHealthCheck < this.healthCheckInterval && this.isAvailable) {
      return this.isAvailable;
    }

    try {
      console.log('🔍 Ollama 헬스체크 시작...');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5초 타임아웃

      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      this.isAvailable = true;
      this.lastHealthCheck = now;
      
      console.log('✅ Ollama 연결 성공:', {
        modelCount: data.models?.length || 0,
        availableModels: data.models?.slice(0, 3).map((m: any) => m.name) || []
      });
      
      return true;

    } catch (error: any) {
      this.isAvailable = false;
      this.lastHealthCheck = now;
      
      if (error.name === 'AbortError') {
        console.error('❌ Ollama 연결 타임아웃 (5초)');
      } else if (error.code === 'ECONNREFUSED') {
        console.error('❌ Ollama 서버 연결 거부 - 서버가 실행 중인지 확인하세요');
      } else {
        console.error('❌ Ollama 헬스체크 실패:', error.message);
      }
      
      return false;
    }
  }

  /**
   * ✅ 사용 가능한 모델 목록 조회
   */
  async getAvailableModels(): Promise<string[]> {
    try {
      if (!await this.checkHealth()) {
        console.warn('⚠️ Ollama 서비스 이용 불가 - 빈 모델 목록 반환');
        return [];
      }

      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const models = data.models?.map((model: any) => model.name) || [];
      
      console.log('📋 사용 가능한 Ollama 모델:', models);
      return models;

    } catch (error: any) {
      console.error('❌ 모델 목록 조회 실패:', error.message);
      return [];
    }
  }

  // ============================================================================
  // 💬 채팅 완료 기능
  // ============================================================================

  /**
   * ✅ 채팅 완료 (재시도 로직 포함)
   */
  async chatCompletion(
    model: string,
    messages: Array<{ role: string; content: string }>,
    options: {
      temperature?: number;
      stream?: boolean;
      personalizedContext?: any;
    } = {}
  ): Promise<string> {
    console.log('💬 Ollama 채팅 완료 요청:', {
      model,
      messageCount: messages.length,
      lastMessageLength: messages[messages.length - 1]?.content?.length || 0
    });

    // 헬스체크 먼저 수행
    if (!await this.checkHealth()) {
      return this.getFallbackResponse(messages[messages.length - 1]?.content || '');
    }

    let lastError: any = null;

    // 재시도 로직
    for (let attempt = 1; attempt <= this.retryCount; attempt++) {
      try {
        console.log(`🔄 채팅 완료 시도 ${attempt}/${this.retryCount}`);
        
        const result = await this.makeRequest(model, messages, options);
        console.log('✅ Ollama 응답 성공:', {
          responseLength: result.length,
          model: model
        });
        
        return result;

      } catch (error: any) {
        lastError = error;
        console.warn(`⚠️ 시도 ${attempt} 실패:`, error.message);
        
        if (attempt < this.retryCount) {
          const delay = Math.pow(2, attempt) * 1000; // 지수 백오프
          console.log(`⏳ ${delay}ms 후 재시도...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // 모든 재시도 실패 시 폴백 응답
    console.error('❌ 모든 Ollama 재시도 실패:', lastError?.message);
    return this.getFallbackResponse(messages[messages.length - 1]?.content || '');
  }

  /**
   * ✅ 실제 요청 수행
   */
  private async makeRequest(
    model: string,
    messages: Array<{ role: string; content: string }>,
    options: any
  ): Promise<string> {
    // Ollama 형식에 맞게 프롬프트 구성
    const prompt = this.formatPrompt(messages, options.personalizedContext);
    
    const requestBody = {
      model: model,
      prompt: prompt,
      stream: false,
      options: {
        temperature: options.temperature || 0.7,
        num_predict: 2000,
        top_p: 0.9,
        top_k: 40
      }
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data: OllamaResponse = await response.json();
      
      if (!data.response) {
        throw new Error('Empty response from Ollama');
      }

      return data.response.trim();

    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.timeout}ms`);
      }
      
      throw error;
    }
  }

  /**
   * ✅ 메시지를 Ollama 프롬프트 형식으로 변환
   */
  private formatPrompt(
    messages: Array<{ role: string; content: string }>,
    personalizedContext?: any
  ): string {
    let prompt = '';

    // 개인화 컨텍스트가 있으면 추가
    if (personalizedContext) {
      prompt += this.formatPersonalizedContext(personalizedContext);
    }

    // 메시지 히스토리 추가
    messages.forEach((message, index) => {
      if (message.role === 'system') {
        prompt += `System: ${message.content}\n\n`;
      } else if (message.role === 'user') {
        prompt += `Human: ${message.content}\n\n`;
      } else if (message.role === 'assistant') {
        prompt += `Assistant: ${message.content}\n\n`;
      }
    });

    prompt += 'Assistant: ';
    return prompt;
  }

  /**
   * ✅ 개인화 컨텍스트를 프롬프트에 포함
   */
  private formatPersonalizedContext(context: any): string {
    if (!context || Object.keys(context).length === 0) {
      return '';
    }

    let contextPrompt = 'Context about the user:\n';

    if (context.personalityProfile) {
      contextPrompt += `- Personality: ${context.personalityProfile.type || 'Adaptive'}\n`;
      contextPrompt += `- Communication Style: ${context.personalityProfile.communicationStyle || 'Balanced'}\n`;
    }

    if (context.behaviorPatterns && context.behaviorPatterns.length > 0) {
      contextPrompt += `- Interests: ${context.behaviorPatterns.slice(0, 3).join(', ')}\n`;
    }

    if (context.preferences && Object.keys(context.preferences).length > 0) {
      contextPrompt += `- Preferences: ${context.preferences.language || 'adaptive'} language\n`;
    }

    contextPrompt += '\nPlease respond in a way that matches the user\'s personality and preferences.\n\n';
    
    return contextPrompt;
  }

  /**
   * ✅ 폴백 응답 생성 (Ollama 연결 실패 시)
   */
  private getFallbackResponse(userMessage: string): string {
    console.log('🔄 폴백 응답 생성 중...');

    // 간단한 키워드 기반 응답
    const lowerMessage = userMessage.toLowerCase();

    if (lowerMessage.includes('hello') || lowerMessage.includes('안녕')) {
      return '안녕하세요! 현재 AI 서비스에 일시적인 문제가 있지만, 도움을 드리기 위해 노력하고 있습니다. 어떤 도움이 필요하신가요?';
    }

    if (lowerMessage.includes('help') || lowerMessage.includes('도움')) {
      return '도움이 필요하시는군요. 현재 메인 AI 서비스가 일시적으로 이용 불가하지만, 기본적인 지원은 제공할 수 있습니다. 구체적으로 어떤 도움이 필요하신지 말씀해 주세요.';
    }

    if (lowerMessage.includes('error') || lowerMessage.includes('오류') || lowerMessage.includes('문제')) {
      return '현재 시스템에 일시적인 문제가 발생한 것 같습니다. 곧 정상화될 예정이니 잠시 후 다시 시도해 주시기 바랍니다.';
    }

    // 기본 폴백 응답
    return '죄송합니다. 현재 AI 서비스에 일시적인 문제가 있어 제한된 응답만 가능합니다. 서비스 복구 후 더 나은 도움을 드릴 수 있을 것입니다. 조금 후에 다시 시도해 주세요.';
  }

  // ============================================================================
  // 🔧 유틸리티 메서드
  // ============================================================================

  /**
   * ✅ 서비스 상태 정보 반환
   */
  getStatus(): {
    available: boolean;
    baseUrl: string;
    lastHealthCheck: Date | null;
    timeout: number;
    retryCount: number;
  } {
    return {
      available: this.isAvailable,
      baseUrl: this.baseUrl,
      lastHealthCheck: this.lastHealthCheck ? new Date(this.lastHealthCheck) : null,
      timeout: this.timeout,
      retryCount: this.retryCount
    };
  }

  /**
   * ✅ 강제 헬스체크 (캐시 무시)
   */
  async forceHealthCheck(): Promise<boolean> {
    this.lastHealthCheck = 0; // 캐시 초기화
    return await this.checkHealth();
  }

  /**
   * ✅ 연결 가능 여부 확인 (빠른 체크)
   */
  isConnected(): boolean {
    return this.isAvailable && (Date.now() - this.lastHealthCheck < this.healthCheckInterval);
  }
}

// ============================================================================
// 🏭 싱글톤 인스턴스 내보내기
// ============================================================================

const ollamaService = OllamaService.getInstance();
export default ollamaService;