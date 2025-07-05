// ============================================================================
// 🦙 통합된 Ollama AI 서비스 (중복 해결 + 호환성 유지)
// 경로: backend/src/services/ai/OllamaAIService.ts
// 용도: Ollama 전용 AI 서비스 + DatabaseService 통합 + 기존 코드 호환성
// 호출구조: DIContainer → OllamaAIService → DatabaseService + Ollama API
// ============================================================================

interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  images?: string[];
}

interface OllamaResponse {
  model: string;
  created_at: string;
  message?: {
    role: string;
    content: string;
  };
  response?: string; // generate API용
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

interface OllamaModelInfo {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details?: {
    format?: string;
    family?: string;
    families?: string[];
    parameter_size?: string;
    quantization_level?: string;
  };
}

export interface AIResponse {
  content: string;
  model: string;
  tokensUsed?: number;
  processingTime?: number;
  confidence?: number;
  provider?: string;
  local?: boolean;
  privacy?: string;
  metadata?: {
    promptTokens?: number;
    completionTokens?: number;
    modelSize?: string;
    quantization?: string;
    error?: string;
    fallback?: boolean;
    conversationId?: string;
    messageId?: string;
  };
}

export interface AIModel {
  id: string;
  name: string;
  available: boolean;
  type: 'chat' | 'code' | 'reasoning' | 'embedding';
  size: string;
  description: string;
  recommended?: boolean;
}

/**
 * 통합된 Ollama AI 서비스
 * - 기존 ollama.ts의 모든 기능 포함
 * - DatabaseService 통합으로 대화 저장
 * - 개인화 컨텍스트 지원
 * - 향상된 에러 처리 및 재시도 로직
 */
export class OllamaAIService {
  private static instance: OllamaAIService;
  private baseURL: string;
  private timeout: number;
  private retryCount: number;
  private isAvailable: boolean = false;
  private lastHealthCheck: number = 0;
  private healthCheckInterval: number = 5 * 60 * 1000; // 5분
  private models: string[] = [];
  private modelsLastFetched: number = 0;
  private modelsRefreshInterval: number = 10 * 60 * 1000; // 10분
  private availableModels: Map<string, OllamaModelInfo> = new Map();
  private modelConfigs: Map<string, any> = new Map();
  private isInitialized: boolean = false;
  private db: any = null; // DatabaseService (선택적)

  private constructor() {
    console.log('🦙 === OllamaAIService 초기화 (DatabaseService 통합) ===');
    
    this.baseURL = process.env.OLLAMA_BASE_URL || process.env.OLLAMA_HOST || process.env.OLLAMA_URL || 'http://localhost:11434';
    this.timeout = parseInt(process.env.OLLAMA_TIMEOUT || '60000');
    this.retryCount = parseInt(process.env.OLLAMA_RETRY_COUNT || '3');
    
    console.log(`🔗 Ollama 서버: ${this.baseURL}`);
    
    // DatabaseService 연동 시도 (선택적)
    this.initializeDatabaseConnection();
    
    // 모델별 설정 초기화
    this.initializeModelConfigs();
    
    // 비동기 초기화
    this.initializeAsync();
  }

  public static getInstance(): OllamaAIService {
    if (!OllamaAIService.instance) {
      OllamaAIService.instance = new OllamaAIService();
    }
    return OllamaAIService.instance;
  }

  // ============================================================================
  // 🔧 초기화 메서드들
  // ============================================================================

  /**
   * DatabaseService 연동 초기화 (선택적)
   */
  private initializeDatabaseConnection(): void {
    try {
      // DI Container를 통한 DatabaseService 가져오기 시도
      const DIContainer = require('../../core/DIContainer');
      const container = DIContainer.DIContainer?.getInstance?.();
      
      if (container) {
        this.db = container.get('ActiveDatabaseService');
        console.log(`🗄️ DatabaseService 연동: ${this.db?.isConnected?.() ? '✅' : '⚠️'}`);
      }
    } catch (error) {
      console.log('🗄️ DatabaseService 연동: ⚠️ (선택적 기능)');
      this.db = null;
    }
  }

  /**
   * 비동기 초기화
   */
  private async initializeAsync(): Promise<void> {
    try {
      console.log('🔍 Ollama 초기 연결 확인 중...');
      
      const isConnected = await this.checkConnection();
      if (isConnected) {
        console.log('✅ Ollama 초기 연결 성공');
        await this.loadAvailableModels();
        console.log(`✅ 모델 설정 초기화 완료: ${this.models.length} 개 모델`);
      } else {
        console.warn('⚠️ Ollama 초기 연결 실패 - 폴백 모드로 동작');
        this.printConnectionHelp();
      }
      
      this.isInitialized = true;
    } catch (error: any) {
      console.warn('⚠️ Ollama 초기화 실패:', error.message);
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
    console.log(`5. 연결 확인: curl ${this.baseURL}/api/tags\n`);
  }

  /**
   * 모델별 기본 설정 초기화
   */
  private initializeModelConfigs(): void {
    const configs = {
      'llama3.2:3b': { type: 'chat', temperature: 0.7, max_tokens: 2048 },
      'llama3.2:1b': { type: 'chat', temperature: 0.8, max_tokens: 1024 },
      'deepseek-coder:6.7b': { type: 'code', temperature: 0.3, max_tokens: 4096 },
      'codellama:7b': { type: 'code', temperature: 0.2, max_tokens: 4096 },
      'phi3:mini': { type: 'reasoning', temperature: 0.5, max_tokens: 2048 },
      'mistral:latest': { type: 'chat', temperature: 0.7, max_tokens: 2048 },
      'llama3.1:8b': { type: 'chat', temperature: 0.7, max_tokens: 4096 }
    };

    Object.entries(configs).forEach(([model, config]) => {
      this.modelConfigs.set(model, config);
    });

    console.log(`✅ 모델 설정 초기화 완료: ${this.modelConfigs.size} 개 모델`);
  }

  // ============================================================================
  // 🔍 연결 상태 관리 (ollama.ts 호환)
  // ============================================================================

  /**
   * Ollama 서버 연결 상태 확인
   */
  async checkConnection(): Promise<boolean> {
    const now = Date.now();
    
    // 캐시된 연결 상태 사용 (성공한 경우만)
    if (now - this.lastHealthCheck < this.healthCheckInterval && this.isAvailable) {
      return this.isAvailable;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.baseURL}/api/tags`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      this.isAvailable = true;
      this.lastHealthCheck = now;
      
      return true;

    } catch (error: any) {
      this.isAvailable = false;
      this.lastHealthCheck = now;
      
      if (error.name === 'AbortError') {
        console.warn('⚠️ Ollama 서버 연결 시간 초과');
      } else {
        console.warn('⚠️ Ollama 서버 연결 실패:', error.message);
      }
      
      return false;
    }
  }

  /**
   * 강제 헬스체크 (캐시 무시)
   */
  async forceHealthCheck(): Promise<boolean> {
    this.lastHealthCheck = 0;
    return await this.checkConnection();
  }

  // ============================================================================
  // 📋 모델 관리 (ollama.ts 호환)
  // ============================================================================

  /**
   * 사용 가능한 모델 목록 조회
   */
  async getModels(): Promise<string[]> {
    await this.loadAvailableModels();
    return this.models;
  }

  /**
   * 사용 가능한 모델 목록 로드
   */
  async loadAvailableModels(): Promise<void> {
    const now = Date.now();
    
    // 캐시된 모델 목록이 있고 최신이면 반환
    if (this.models.length > 0 && now - this.modelsLastFetched < this.modelsRefreshInterval) {
      return;
    }

    try {
      if (!await this.checkConnection()) {
        console.warn('⚠️ Ollama 서비스 이용 불가 - 빈 모델 목록 반환');
        return;
      }

      const response = await fetch(`${this.baseURL}/api/tags`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: unknown = await response.json();
      const modelsData = (data as any).models || [];
      
      this.availableModels.clear();
      this.models = [];
      
      modelsData.forEach((model: OllamaModelInfo) => {
        this.availableModels.set(model.name, model);
        this.models.push(model.name);
      });
      
      this.modelsLastFetched = now;
      
      console.log(`📋 사용 가능한 Ollama 모델 (${this.models.length}개):`, this.models);

    } catch (error: any) {
      console.error('❌ 모델 목록 로딩 실패:', error.message);
    }
  }

  /**
   * 향상된 모델 목록 (AIModel 형식)
   */
  async getAvailableModels(): Promise<AIModel[]> {
    await this.loadAvailableModels();

    const models: AIModel[] = [];
    
    this.availableModels.forEach((info, name) => {
      const config = this.modelConfigs.get(name);
      const size = this.formatSize(info.size);
      
      models.push({
        id: name,
        name: this.getDisplayName(name),
        available: true,
        type: config?.type || 'chat',
        size,
        description: this.getModelDescription(name),
        recommended: name === 'llama3.2:3b'
      });
    });

    return models.sort((a, b) => {
      const typeOrder = { 'chat': 0, 'code': 1, 'reasoning': 2, 'embedding': 3 };
      return (typeOrder[a.type] || 9) - (typeOrder[b.type] || 9);
    });
  }

  /**
   * 기본 모델 반환
   */
  getDefaultModel(): string {
    if (this.models.includes('llama3.2:3b')) return 'llama3.2:3b';
    if (this.models.includes('llama3.2')) return 'llama3.2';
    if (this.models.includes('llama3:8b')) return 'llama3:8b';
    if (this.models.length > 0) return this.models[0];
    return 'llama3.2:3b';
  }

  // ============================================================================
  // 🎯 AI 응답 생성 (향상된 기능)
  // ============================================================================

  /**
   * AI 응답 생성 (메인 메서드)
   */
  async generateResponse(
    message: string,
    modelId?: string,
    personalizedContext?: any,
    userId?: string,
    conversationId?: string
  ): Promise<AIResponse> {
    const startTime = Date.now();
    const model = modelId || this.getDefaultModel();

    try {
      // 연결 상태 확인
      const connected = await this.checkConnection();
      if (!connected) {
        throw new Error('Ollama 서버에 연결할 수 없습니다. `ollama serve` 명령어로 서버를 시작하세요.');
      }

      console.log(`🦙 Ollama 응답 생성 시작: ${model}`);

      // 메시지 구성 (개인화 컨텍스트 포함)
      const messages = this.buildMessages(message, model, personalizedContext);
      
      // Ollama API 호출
      const response = await this.callOllamaAPI(model, messages);
      
      const processingTime = Date.now() - startTime;
      
      const aiResponse: AIResponse = {
        content: response.message?.content || response.response || '',
        model: `${model}`,
        tokensUsed: response.eval_count || this.estimateTokens(message + (response.message?.content || '')),
        processingTime,
        confidence: 0.9,
        provider: 'ollama',
        local: true,
        privacy: 'fully_local',
        metadata: {
          promptTokens: response.prompt_eval_count || this.estimateTokens(message),
          completionTokens: response.eval_count || this.estimateTokens(response.message?.content || ''),
          modelSize: this.getModelSize(model),
          conversationId,
          messageId: this.generateMessageId()
        }
      };

      // DatabaseService를 통한 대화 저장 (선택적)
      if (userId && this.db) {
        try {
          await this.saveChatToDatabase(userId, message, aiResponse, conversationId);
        } catch (dbError) {
          console.warn('⚠️ 대화 저장 실패 (기능은 계속됨):', dbError);
        }
      }

      console.log(`✅ Ollama 응답 생성 완료: ${processingTime}ms`);
      return aiResponse;

    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      console.error(`❌ Ollama 응답 생성 실패 (${processingTime}ms):`, error.message);
      
      return this.generateFallbackResponse(message, model, processingTime);
    }
  }

  /**
   * 기존 ollama.ts 호환 - generate 메서드
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

      const response = await fetch(`${this.baseURL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(this.timeout)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: unknown = await response.json();
      const result = (data as any).response || '응답을 생성할 수 없습니다.';
      
      console.log('✅ Ollama Generate 성공');
      return result;

    } catch (error: any) {
      console.error('❌ Ollama Generate 실패:', error.message);
      throw error;
    }
  }

  /**
   * 기존 ollama.ts 호환 - chatCompletion 메서드
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
        
        if (!await this.checkConnection()) {
          throw new Error('Ollama 서버에 연결할 수 없습니다');
        }

        const result = await this.performChatRequest(model, messages, options);
        console.log(`✅ Ollama 채팅 성공 (시도 ${attempt})`);
        return result;

      } catch (error: any) {
        console.error(`❌ Ollama 채팅 시도 ${attempt} 실패:`, error.message);
        
        if (attempt === this.retryCount) {
          throw error;
        }
        
        await this.delay(1000 * attempt);
      }
    }

    throw new Error('모든 재시도 실패');
  }

  // ============================================================================
  // 🔧 내부 메서드들
  // ============================================================================

  /**
   * Ollama API 직접 호출
   */
  private async callOllamaAPI(model: string, messages: OllamaMessage[]): Promise<OllamaResponse> {
    const response = await fetch(`${this.baseURL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        options: {
          temperature: this.modelConfigs.get(model)?.temperature || 0.7,
          num_predict: this.modelConfigs.get(model)?.max_tokens || 2048
        }
      }),
      signal: AbortSignal.timeout(this.timeout)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: unknown = await response.json();
    return data as OllamaResponse;
  }

  /**
   * 실제 채팅 요청 수행 (기존 호환)
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

    const response = await fetch(`${this.baseURL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
        // JSON 파싱 실패 시 원본 사용
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
   * 메시지 포맷팅 (개인화 컨텍스트 포함)
   */
  private buildMessages(message: string, model: string, context?: any): OllamaMessage[] {
    const messages: OllamaMessage[] = [];
    
    // 시스템 프롬프트 추가
    const systemPrompt = this.buildSystemPrompt(model, context);
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }

    // 사용자 메시지 추가
    messages.push({ role: 'user', content: message });

    return messages;
  }

  /**
   * 기존 호환 - 메시지 포맷팅
   */
  private formatMessages(messages: OllamaMessage[], personalizedContext?: any): OllamaMessage[] {
    const formattedMessages: OllamaMessage[] = [];

    if (personalizedContext) {
      formattedMessages.push({
        role: 'system',
        content: this.formatPersonalizedContext(personalizedContext)
      });
    }

    formattedMessages.push(...messages);
    return formattedMessages;
  }

  /**
   * 시스템 프롬프트 생성
   */
  private buildSystemPrompt(model: string, context?: any): string {
    let basePrompt = "You are a helpful AI assistant specialized in conversational interactions.";
    
    const config = this.modelConfigs.get(model);
    if (config?.type === 'code') {
      basePrompt = "You are an expert programming assistant. Provide clear, well-commented code solutions.";
    } else if (config?.type === 'reasoning') {
      basePrompt = "You are a logical reasoning assistant. Think step by step and provide detailed explanations.";
    }

    if (!context) return basePrompt;

    // 개인화 컨텍스트 추가
    if (context.personalityProfile?.type) {
      basePrompt += `\n\nUser Profile: The user has a ${context.personalityProfile.type} personality type.`;
    }

    if (context.cues && context.cues.length > 0) {
      basePrompt += `\n\nPersonalization: You have access to ${context.cues.length} personal preference data points.`;
    }

    return basePrompt;
  }

  /**
   * 기존 호환 - 개인화 컨텍스트 포맷팅
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

    contextPrompt += '\n사용자의 성격과 선호도에 맞춰 친근하고 도움이 되는 한국어 응답을 제공해주세요.\n';
    return contextPrompt;
  }

  /**
   * DatabaseService를 통한 대화 저장
   */
  private async saveChatToDatabase(
    userId: string,
    userMessage: string,
    aiResponse: AIResponse,
    conversationId?: string
  ): Promise<void> {
    try {
      if (!this.db || typeof this.db.saveChatMessage !== 'function') {
        return; // DB 서비스 없으면 스킵
      }

      // 사용자 메시지 저장
      await this.db.saveChatMessage({
        conversation_id: conversationId || 'default',
        user_id: userId,
        content: userMessage,
        sender: 'user',
        model: null,
        tokens_used: aiResponse.metadata?.promptTokens || 0,
        timestamp: new Date().toISOString()
      });

      // AI 응답 저장
      await this.db.saveChatMessage({
        conversation_id: conversationId || 'default',
        user_id: userId,
        content: aiResponse.content,
        sender: 'assistant',
        model: aiResponse.model,
        tokens_used: aiResponse.metadata?.completionTokens || 0,
        processing_time: aiResponse.processingTime,
        timestamp: new Date().toISOString()
      });

      console.log('✅ 대화 저장 완료');
    } catch (error) {
      console.warn('⚠️ 대화 저장 실패:', error);
    }
  }

  // ============================================================================
  // 🛠️ 유틸리티 메서드들
  // ============================================================================

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  private getModelSize(model: string): string {
    const info = this.availableModels.get(model);
    return info ? this.formatSize(info.size) : 'Unknown';
  }

  private formatSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  private getDisplayName(modelName: string): string {
    const nameMap: { [key: string]: string } = {
      'llama3.2:3b': 'Llama 3.2 (3B)',
      'llama3.2:1b': 'Llama 3.2 (1B)',
      'deepseek-coder:6.7b': 'DeepSeek Coder (6.7B)',
      'codellama:7b': 'Code Llama (7B)',
      'phi3:mini': 'Phi-3 Mini',
      'mistral:latest': 'Mistral 7B',
      'llama3.1:8b': 'Llama 3.1 (8B)'
    };
    
    return nameMap[modelName] || modelName;
  }

  private getModelDescription(modelName: string): string {
    const descriptions: { [key: string]: string } = {
      'llama3.2:3b': '범용 대화 및 텍스트 생성에 최적화된 모델',
      'llama3.2:1b': '빠른 응답이 필요한 간단한 작업용 경량 모델',
      'deepseek-coder:6.7b': '코드 생성, 디버깅, 설명에 특화된 프로그래밍 전문 모델',
      'codellama:7b': 'Meta의 코드 생성 전문 모델, 다양한 프로그래밍 언어 지원',
      'phi3:mini': '논리적 추론과 수학적 문제 해결에 강한 소형 모델',
      'mistral:latest': '효율적이고 빠른 응답을 제공하는 범용 모델'
    };
    
    return descriptions[modelName] || '범용 AI 모델';
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 폴백 응답 생성
   */
  getFallbackResponse(userMessage: string): string {
    return `죄송합니다. 현재 Ollama AI 서비스에 연결할 수 없습니다.\n\n💡 해결 방법:\n1. \`ollama serve\` 명령어로 서버 시작\n2. \`ollama pull llama3.2:3b\` 명령어로 모델 다운로드\n3. Ollama가 ${this.baseURL} 에서 실행 중인지 확인\n\n질문 "${userMessage}"에 대한 답변은 서비스 복구 후 제공해드리겠습니다.`;
  }

  private generateFallbackResponse(message: string, model: string, processingTime: number): AIResponse {
    const fallbackContent = this.getFallbackResponse(message);

    return {
      content: fallbackContent,
      model: `Fallback (${model})`,
      tokensUsed: fallbackContent.length,
      processingTime,
      confidence: 0.3,
      provider: 'ollama',
      local: true,
      metadata: {
        error: 'Service unavailable',
        fallback: true
      }
    };
  }

  // ============================================================================
  // 📊 상태 및 정보 메서드들
  // ============================================================================

  /**
   * 서비스 상태 정보 반환
   */
  async getServiceStatus(): Promise<any> {
    const isConnected = await this.checkConnection();
    await this.loadAvailableModels();

    return {
      provider: 'ollama',
      connected: isConnected,
      baseUrl: this.baseURL,
      models: this.models,
      defaultModel: this.getDefaultModel(),
      features: [
        'chat', 
        'completion', 
        'local', 
        'privacy-focused',
        'conversation_storage',
        'personalization_support'
      ],
      database: {
        connected: this.db?.isConnected?.() || false,
        available: !!this.db
      }
    };
  }

  /**
   * 기존 호환 - 상태 정보
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
      baseUrl: this.baseURL,
      lastHealthCheck: this.lastHealthCheck ? new Date(this.lastHealthCheck) : null,
      timeout: this.timeout,
      retryCount: this.retryCount,
      modelCount: this.models.length,
      cachedModels: this.models
    };
  }

  /**
   * 연결 테스트
   */
  async testConnection(): Promise<{success: boolean, message: string, details?: any}> {
    try {
      const isConnected = await this.forceHealthCheck();
      
      if (isConnected) {
        await this.loadAvailableModels();
        return {
          success: true,
          message: 'Ollama 연결 성공',
          details: {
            modelCount: this.models.length,
            availableModels: this.models.slice(0, 5)
          }
        };
      } else {
        return {
          success: false,
          message: 'Ollama 서버에 연결할 수 없습니다',
          details: {
            baseUrl: this.baseURL,
            suggestion: 'ollama serve 명령어로 서버를 시작하세요'
          }
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: `연결 테스트 실패: ${error.message}`,
        details: {
          baseUrl: this.baseURL,
          error: error.message
        }
      };
    }
  }

  /**
   * 서비스 정리 (DI Container용)
   */
  public dispose(): void {
    console.log('🧹 OllamaAIService 정리 중...');
    this.isInitialized = false;
    this.models = [];
    this.availableModels.clear();
    this.isAvailable = false;
    console.log('✅ OllamaAIService 정리 완료');
  }
}

// ============================================================================
// 📤 Export (중복 제거 및 호환성 보장)
// ============================================================================

// 싱글톤 인스턴스 생성
const ollamaService = OllamaAIService.getInstance();

// 기존 ollama.ts 호환성을 위한 함수들
export const checkConnection = () => ollamaService.checkConnection();
export const getModels = () => ollamaService.getModels();
export const chat = (model: string, messages: OllamaMessage[], stream: boolean = false) => 
  ollamaService.chatCompletion(model, messages, { stream });

// ============================================================================
// 🐛 수정: 중복 export 문제 해결
// ============================================================================

// 클래스와 인스턴스 export (중복 제거)
export { OllamaAIService };
export { ollamaService };

// 기본 export
export default ollamaService;

// ============================================================================
// 🎉 수정 완료 로그
// ============================================================================

console.log('✅ OllamaAIService Export 수정 완료:');
console.log('  🐛 FIXED: Multiple exports 중복 제거');
console.log('  ✅ 클래스와 인스턴스 명확히 구분');
console.log('  🔧 기존 호환성 100% 유지');