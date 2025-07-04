// ============================================================================
// 🦙 backend/src/services/ollama.ts
// 🔧 Ollama 연결 문제 해결 및 안정성 개선 (완전 리팩토링)
// ============================================================================

interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OllamaResponse {
  model: string;
  created_at: string;
  response?: string;
  message?: {
    role: string;
    content: string;
  };
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

interface OllamaModel {
  name: string;
  size: number;
  digest: string;
  modified_at: string;
}

/**
 * Ollama 서비스 - 완전히 개선된 버전
 * 연결 안정성, 재시도 로직, 에러 처리 강화
 */
export class OllamaService {
  private static instance: OllamaService;
  private baseUrl: string;
  private timeout: number;
  private retryCount: number;
  private isAvailable: boolean = false;
  private lastHealthCheck: number = 0;
  private healthCheckInterval: number = 5 * 60 * 1000; // 5분
  private models: string[] = [];
  private modelsLastFetched: number = 0;
  private modelsRefreshInterval: number = 10 * 60 * 1000; // 10분

  private constructor() {
    this.baseUrl = process.env.OLLAMA_HOST || process.env.OLLAMA_URL || 'http://localhost:11434';
    this.timeout = parseInt(process.env.OLLAMA_TIMEOUT || '60000');
    this.retryCount = parseInt(process.env.OLLAMA_RETRY_COUNT || '3');
    
    console.log('🤖 Ollama Service 초기화:', {
      baseUrl: this.baseUrl,
      timeout: this.timeout,
      retryCount: this.retryCount
    });

    // 초기 헬스체크 (비동기로 실행)
    this.initializeConnection();
  }

  public static getInstance(): OllamaService {
    if (!OllamaService.instance) {
      OllamaService.instance = new OllamaService();
    }
    return OllamaService.instance;
  }

  // ============================================================================
  // 🚀 초기화 및 연결 관리
  // ============================================================================

  /**
   * 서비스 초기화 및 연결 확인
   */
  private async initializeConnection(): Promise<void> {
    try {
      console.log('🔍 Ollama 초기 연결 확인 중...');
      
      const isConnected = await this.checkConnection();
      if (isConnected) {
        console.log('✅ Ollama 초기 연결 성공');
        await this.refreshModels();
      } else {
        console.warn('⚠️ Ollama 초기 연결 실패 - 나중에 자동 재시도됩니다');
        this.printConnectionHelp();
      }
    } catch (error: any) {
      console.warn('⚠️ Ollama 초기화 중 오류:', error.message);
      this.printConnectionHelp();
    }
  }

  /**
   * 연결 도움말 출력
   */
  private printConnectionHelp(): void {
    console.log('\n💡 Ollama 설정 도움말:');
    console.log('1. Ollama 설치: brew install ollama');
    console.log('2. 서버 시작: ollama serve');
    console.log('3. 모델 다운로드: ollama pull llama3.2:3b');
    console.log('4. 모델 확인: ollama list');
    console.log(`5. 연결 확인: curl ${this.baseUrl}/api/tags\n`);
  }

  // ============================================================================
  // 🔍 헬스체크 및 연결 상태 관리
  // ============================================================================

  /**
   * Ollama 서비스 헬스체크 (향상된 로직)
   */
  async checkConnection(): Promise<boolean> {
    const now = Date.now();
    
    // 최근에 체크했으면 캐시된 결과 사용 (성공한 경우만)
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
   * 강제 헬스체크 (캐시 무시)
   */
  async forceHealthCheck(): Promise<boolean> {
    this.lastHealthCheck = 0; // 캐시 무효화
    return await this.checkConnection();
  }

  // ============================================================================
  // 📋 모델 관리
  // ============================================================================

  /**
   * 사용 가능한 모델 목록 조회 (캐싱 적용)
   */
  async getModels(): Promise<string[]> {
    const now = Date.now();
    
    // 캐시된 모델 목록이 있고 최신이면 반환
    if (this.models.length > 0 && now - this.modelsLastFetched < this.modelsRefreshInterval) {
      return this.models;
    }

    try {
      if (!await this.checkConnection()) {
        console.warn('⚠️ Ollama 서비스 이용 불가 - 빈 모델 목록 반환');
        return [];
      }

      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(10000) // 10초 타임아웃
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      this.models = data.models?.map((model: OllamaModel) => model.name) || [];
      this.modelsLastFetched = now;
      
      console.log('📋 사용 가능한 Ollama 모델 업데이트:', this.models);
      return this.models;

    } catch (error: any) {
      console.error('❌ 모델 목록 조회 실패:', error.message);
      return this.models; // 이전 캐시된 목록 반환
    }
  }

  /**
   * 모델 목록 강제 새로고침
   */
  async refreshModels(): Promise<string[]> {
    this.modelsLastFetched = 0; // 캐시 무효화
    return await this.getModels();
  }

  /**
   * 특정 모델이 사용 가능한지 확인
   */
  async isModelAvailable(modelName: string): Promise<boolean> {
    const models = await this.getModels();
    return models.includes(modelName);
  }

  /**
   * 추천 모델 목록 반환
   */
  getRecommendedModels(): Array<{name: string, size: string, description: string}> {
    return [
      {
        name: 'llama3.2:3b',
        size: '2.0GB',
        description: '빠르고 효율적인 대화형 모델 (추천)'
      },
      {
        name: 'llama3.2:1b',
        size: '1.3GB',
        description: '매우 빠른 경량 모델'
      },
      {
        name: 'llama3.1:8b',
        size: '4.7GB',
        description: '고성능 모델 (더 많은 자원 필요)'
      },
      {
        name: 'gemma2:2b',
        size: '1.6GB',
        description: 'Google의 경량 모델'
      }
    ];
  }

  // ============================================================================
  // 💬 채팅 기능 (재시도 로직 포함)
  // ============================================================================

  /**
   * 채팅 완료 (재시도 로직 포함)
   */
  async chatCompletion(
    model: string,
    messages: OllamaMessage[],
    options: {
      temperature?: number;
      stream?: boolean;
      personalizedContext?: any;
    } = {}
  ): Promise<string> {
    
    for (let attempt = 1; attempt <= this.retryCount; attempt++) {
      try {
        console.log(`🦙 Ollama 채팅 시도 ${attempt}/${this.retryCount} - 모델: ${model}`);
        
        // 연결 확인
        if (!await this.checkConnection()) {
          throw new Error('Ollama 서버에 연결할 수 없습니다');
        }

        // 모델 확인
        if (!await this.isModelAvailable(model)) {
          throw new Error(`모델 '${model}'을 찾을 수 없습니다. 다운로드가 필요할 수 있습니다.`);
        }

        const result = await this.performChatRequest(model, messages, options);
        
        console.log(`✅ Ollama 채팅 성공 (시도 ${attempt})`);
        return result;

      } catch (error: any) {
        console.error(`❌ Ollama 채팅 시도 ${attempt} 실패:`, error.message);
        
        if (attempt === this.retryCount) {
          throw error; // 마지막 시도도 실패하면 에러 던짐
        }
        
        // 재시도 전 잠시 대기
        await this.delay(1000 * attempt);
      }
    }

    throw new Error('모든 재시도 실패');
  }

  /**
   * 실제 채팅 요청 수행
   */
  private async performChatRequest(
    model: string,
    messages: OllamaMessage[],
    options: {
      temperature?: number;
      stream?: boolean;
      personalizedContext?: any;
    }
  ): Promise<string> {
    
    const { temperature = 0.7, stream = false, personalizedContext } = options;

    // 메시지를 Ollama 형식으로 변환
    const requestBody = {
      model,
      messages: this.formatMessages(messages, personalizedContext),
      stream,
      options: {
        temperature,
        num_predict: 2000,
        top_k: 40,
        top_p: 0.9,
        repeat_penalty: 1.1
      }
    };

    console.log('📤 Ollama 요청 전송:', {
      model,
      messageCount: messages.length,
      temperature,
      stream
    });

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(this.timeout)
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error || errorMessage;
      } catch {
        // JSON 파싱 실패 시 원본 에러 메시지 사용
      }
      
      throw new Error(errorMessage);
    }

    const data: OllamaResponse = await response.json();
    
    if (!data.done) {
      throw new Error('Ollama 응답이 완료되지 않았습니다');
    }

    const content = data.message?.content || data.response || '';
    
    if (!content.trim()) {
      throw new Error('Ollama에서 빈 응답을 받았습니다');
    }

    return content;
  }

  /**
   * ✅ 간단한 generate 방식 (기존 app.ts와 호환)
   */
  async generate(
    model: string,
    prompt: string,
    options: {
      temperature?: number;
      num_predict?: number;
    } = {}
  ): Promise<string> {
    
    try {
      console.log(`🦙 Ollama Generate 요청: ${model}`);
      
      // 연결 확인
      if (!await this.checkConnection()) {
        throw new Error('Ollama 서버에 연결할 수 없습니다');
      }

      const requestBody = {
        model,
        prompt,
        stream: false,
        options: {
          temperature: options.temperature || 0.7,
          num_predict: options.num_predict || 1000
        }
      };

      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(this.timeout)
      });

      if (!response.ok) {
        throw new Error(`Ollama API HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const result = data.response || '응답을 생성할 수 없습니다.';
      
      console.log('✅ Ollama Generate 성공');
      return result;

    } catch (error: any) {
      console.error('❌ Ollama Generate 실패:', error.message);
      throw error;
    }
  }

  // ============================================================================
  // 🛠️ 유틸리티 메서드들
  // ============================================================================

  /**
   * 메시지를 Ollama 형식으로 포맷
   */
  private formatMessages(
    messages: OllamaMessage[],
    personalizedContext?: any
  ): OllamaMessage[] {
    
    const formattedMessages: OllamaMessage[] = [];

    // 개인화 컨텍스트가 있으면 시스템 메시지에 추가
    if (personalizedContext) {
      const contextSystemMessage: OllamaMessage = {
        role: 'system',
        content: this.formatPersonalizedContext(personalizedContext)
      };
      formattedMessages.push(contextSystemMessage);
    }

    // 기존 메시지들 추가
    formattedMessages.push(...messages);

    return formattedMessages;
  }

  /**
   * 개인화 컨텍스트를 시스템 메시지로 포맷
   */
  private formatPersonalizedContext(context: any): string {
    if (!context || Object.keys(context).length === 0) {
      return '당신은 CUE Protocol의 개인화된 AI 어시스턴트입니다. 친근하고 도움이 되는 한국어 응답을 제공해주세요.';
    }

    let contextPrompt = '당신은 CUE Protocol의 개인화된 AI 어시스턴트입니다.\n\n';
    contextPrompt += '사용자에 대한 정보:\n';

    if (context.personalityProfile) {
      contextPrompt += `- 성격: ${context.personalityProfile.type || 'Adaptive'}\n`;
      contextPrompt += `- 소통 스타일: ${context.personalityProfile.communicationStyle || 'Balanced'}\n`;
    }

    if (context.behaviorPatterns && context.behaviorPatterns.length > 0) {
      contextPrompt += `- 관심사: ${context.behaviorPatterns.slice(0, 3).join(', ')}\n`;
    }

    if (context.preferences && Object.keys(context.preferences).length > 0) {
      contextPrompt += `- 선호도: ${context.preferences.language || 'adaptive'} 언어\n`;
    }

    contextPrompt += '\n사용자의 성격과 선호도에 맞춰 친근하고 도움이 되는 한국어 응답을 제공해주세요.\n';
    
    return contextPrompt;
  }

  /**
   * 폴백 응답 생성 (Ollama 연결 실패 시)
   */
  getFallbackResponse(userMessage: string): string {
    console.log('🔄 폴백 응답 생성 중...');

    const lowerMessage = userMessage.toLowerCase();

    if (lowerMessage.includes('hello') || lowerMessage.includes('안녕')) {
      return '안녕하세요! 현재 로컬 AI 서비스에 일시적인 문제가 있지만, 도움을 드리기 위해 노력하고 있습니다. Ollama 서버가 실행 중인지 확인해주세요.';
    }

    if (lowerMessage.includes('help') || lowerMessage.includes('도움')) {
      return '도움이 필요하시는군요. 현재 Ollama AI 서비스가 일시적으로 이용 불가하지만, 서비스가 복구되면 더 나은 도움을 드릴 수 있습니다.';
    }

    if (lowerMessage.includes('error') || lowerMessage.includes('오류') || lowerMessage.includes('문제')) {
      return '현재 Ollama AI 시스템에 일시적인 문제가 발생했습니다. `ollama serve` 명령어로 서버를 시작하거나 `ollama pull llama3.2:3b` 명령어로 모델을 다운로드해 보세요.';
    }

    return `죄송합니다. 현재 Ollama AI 서비스에 연결할 수 없습니다.\n\n💡 해결 방법:\n1. \`ollama serve\` 명령어로 서버 시작\n2. \`ollama pull llama3.2:3b\` 명령어로 모델 다운로드\n3. 설치가 필요한 경우: \`brew install ollama\`\n\n질문 "${userMessage}"에 대한 답변은 서비스 복구 후 제공해드리겠습니다.`;
  }

  /**
   * 지연 함수
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ============================================================================
  // 📊 상태 및 정보 메서드들
  // ============================================================================

  /**
   * 서비스 상태 정보 반환
   */
  getStatus(): {
    available: boolean;
    baseUrl: string;
    lastHealthCheck: Date | null;
    timeout: number;
    retryCount: number;
    modelCount: number;
    cachedModels: string[];
  } {
    return {
      available: this.isAvailable,
      baseUrl: this.baseUrl,
      lastHealthCheck: this.lastHealthCheck ? new Date(this.lastHealthCheck) : null,
      timeout: this.timeout,
      retryCount: this.retryCount,
      modelCount: this.models.length,
      cachedModels: this.models
    };
  }

  /**
   * 상세 상태 정보 반환
   */
  async getDetailedStatus(): Promise<{
    connection: any;
    models: any;
    recommendations: any;
    troubleshooting: any;
  }> {
    const isConnected = await this.forceHealthCheck();
    const models = isConnected ? await this.refreshModels() : [];
    
    return {
      connection: {
        available: isConnected,
        baseUrl: this.baseUrl,
        lastCheck: new Date(this.lastHealthCheck).toISOString(),
        timeout: this.timeout
      },
      models: {
        available: models,
        count: models.length,
        recommended: this.getRecommendedModels(),
        lastFetched: new Date(this.modelsLastFetched).toISOString()
      },
      recommendations: {
        preferredModel: 'llama3.2:3b',
        minModel: 'llama3.2:1b',
        setupCommands: [
          'brew install ollama',
          'ollama serve',
          'ollama pull llama3.2:3b'
        ]
      },
      troubleshooting: {
        connectionCheck: `curl ${this.baseUrl}/api/tags`,
        modelList: 'ollama list',
        serverStatus: 'ps aux | grep ollama',
        commonIssues: [
          'Ollama 서버가 실행되지 않음',
          '모델이 다운로드되지 않음',
          '포트 충돌 (기본: 11434)'
        ]
      }
    };
  }

  /**
   * 간단한 연결 테스트
   */
  async testConnection(): Promise<{success: boolean, message: string, details?: any}> {
    try {
      const isConnected = await this.forceHealthCheck();
      
      if (isConnected) {
        const models = await this.refreshModels();
        return {
          success: true,
          message: 'Ollama 연결 성공',
          details: {
            modelCount: models.length,
            availableModels: models.slice(0, 5)
          }
        };
      } else {
        return {
          success: false,
          message: 'Ollama 서버에 연결할 수 없습니다',
          details: {
            baseUrl: this.baseUrl,
            suggestion: 'ollama serve 명령어로 서버를 시작하세요'
          }
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: `연결 테스트 실패: ${error.message}`,
        details: {
          baseUrl: this.baseUrl,
          error: error.message
        }
      };
    }
  }
}

// ============================================================================
// 📤 인스턴스 생성 및 Export
// ============================================================================

// 싱글톤 인스턴스 생성
const ollamaService = OllamaService.getInstance();

// 기존 코드와의 호환성을 위한 함수들
export const checkConnection = () => ollamaService.checkConnection();
export const getModels = () => ollamaService.getModels();
export const chat = (model: string, messages: OllamaMessage[], stream: boolean = false) => 
  ollamaService.chatCompletion(model, messages, { stream });

// Export
export { ollamaService, OllamaService };
export default ollamaService;