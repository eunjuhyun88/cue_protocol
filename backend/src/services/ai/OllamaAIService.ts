// ============================================================================
// 🦙 완전히 수정된 Ollama AI 서비스 (무한루프 해결 + 전체 기능)
// 경로: backend/src/services/ai/OllamaAIService.ts
// 용도: Ollama 전용 AI 서비스 + DatabaseService 통합 + 안정성 보장
// 수정사항: 무한루프 방지, DatabaseService 올바른 연결, 중복 호출 방지
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
 * 완전히 수정된 Ollama AI 서비스
 * - 무한루프 완전 방지
 * - DatabaseService 안전한 연결
 * - 중복 호출 방지 시스템
 * - 강화된 에러 처리
 * - 모든 기존 기능 유지
 */
export class OllamaAIService {
  private static instance: OllamaAIService;
  private baseURL: string;
  private timeout: number;
  private retryCount: number;
  
  // 무한루프 방지 시스템
  private isConnecting: boolean = false;
  private isLoadingModels: boolean = false;
  private lastConnectionCheck: number = 0;
  private lastModelsCheck: number = 0;
  private connectionCooldown: number = 5000; // 5초
  private modelsCooldown: number = 10000; // 10초
  
  // 상태 관리
  private isAvailable: boolean = false;
  private models: string[] = [];
  private availableModels: Map<string, OllamaModelInfo> = new Map();
  private modelConfigs: Map<string, any> = new Map();
  private isInitialized: boolean = false;
  private db: any = null; // DatabaseService (선택적)

  private constructor() {
    console.log('🦙 === OllamaAIService 초기화 (무한루프 방지 + 완전 기능) ===');
    
    this.baseURL = process.env.OLLAMA_BASE_URL || 
                   process.env.OLLAMA_HOST || 
                   process.env.OLLAMA_URL || 
                   'http://localhost:11434';
    this.timeout = parseInt(process.env.OLLAMA_TIMEOUT || '60000');
    this.retryCount = parseInt(process.env.OLLAMA_RETRY_COUNT || '3');
    
    console.log(`🔗 Ollama 서버: ${this.baseURL}`);
    
    // DatabaseService 안전한 연동
    this.initializeDatabaseConnection();
    
    // 모델별 설정 초기화
    this.initializeModelConfigs();
    
    // 비동기 초기화 (안전하게)
    this.safeInitializeAsync();
  }

  public static getInstance(): OllamaAIService {
    if (!OllamaAIService.instance) {
      OllamaAIService.instance = new OllamaAIService();
    }
    return OllamaAIService.instance;
  }

  // ============================================================================
  // 🔧 안전한 초기화 메서드들 (무한루프 방지)
  // ============================================================================

  /**
   * DatabaseService 안전한 연동 (DI Container 통합)
   */
  private initializeDatabaseConnection(): void {
    try {
      // 환경 변수로 DI Container 사용 여부 확인
      if (process.env.USE_DI_CONTAINER !== 'false') {
        // DI Container를 통한 안전한 연결 시도
        const DIContainer = require('../../core/DIContainer');
        const container = DIContainer.DIContainer?.getInstance?.();
        
        if (container && typeof container.get === 'function') {
          // DatabaseService 대신 ActiveDatabaseService를 시도하되, 없으면 DatabaseService 사용
          try {
            this.db = container.get('DatabaseService'); // ✅ 수정: ActiveDatabaseService → DatabaseService
            console.log(`🗄️ DatabaseService 연동: ${this.db?.isConnected?.() ? '✅' : '⚠️'} (DI)`);
          } catch (diError) {
            console.log('🗄️ DatabaseService 연동: ⚠️ (DI 실패, 선택적 기능)');
            this.db = null;
          }
        }
      }
    } catch (error) {
      console.log('🗄️ DatabaseService 연동: ⚠️ (선택적 기능)');
      this.db = null;
    }
  }

  /**
   * 안전한 비동기 초기화 (무한루프 방지)
   */
  private async safeInitializeAsync(): Promise<void> {
    try {
      console.log('🔍 Ollama 초기 연결 확인 중...');
      
      // 단일 연결 시도 (재귀 호출 없음)
      const isConnected = await this.performSingleConnectionCheck();
      
      if (isConnected) {
        console.log('✅ Ollama 초기 연결 성공');
        
        // 모델 로딩도 단일 시도
        await this.performSingleModelsLoad();
        console.log(`✅ 모델 설정 초기화 완료: ${this.models.length} 개 모델`);
        
        this.isAvailable = true;
      } else {
        console.warn('⚠️ Ollama 초기 연결 실패 - 폴백 모드로 동작');
        this.printConnectionHelp();
        this.isAvailable = false;
      }
      
      this.isInitialized = true;
    } catch (error: any) {
      console.warn('⚠️ Ollama 초기화 실패:', error.message);
      this.printConnectionHelp();
      this.isAvailable = false;
      this.isInitialized = true; // 초기화 완료로 표시 (무한 대기 방지)
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
   * 모델별 기본 설정 초기화 (전체 Ollama 모델 지원)
   */
  private initializeModelConfigs(): void {
    const configs = {
      // 🦙 Llama 모델군
      'llama3.2:3b': { type: 'chat', temperature: 0.7, max_tokens: 2048, recommended: true },
      'llama3.2:1b': { type: 'chat', temperature: 0.8, max_tokens: 1024 },
      'llama3.2:latest': { type: 'chat', temperature: 0.7, max_tokens: 2048 },
      'llama3.1:8b': { type: 'chat', temperature: 0.7, max_tokens: 4096 },
      'llama3.1:70b': { type: 'chat', temperature: 0.6, max_tokens: 8192 },
      'llama2:7b': { type: 'chat', temperature: 0.7, max_tokens: 2048 },
      'llama2:13b': { type: 'chat', temperature: 0.6, max_tokens: 4096 },
      'llama2:70b': { type: 'chat', temperature: 0.5, max_tokens: 8192 },

      // 💻 코딩 전문 모델군
      'deepseek-coder:6.7b': { type: 'code', temperature: 0.3, max_tokens: 4096, recommended: true },
      'deepseek-coder:33b': { type: 'code', temperature: 0.2, max_tokens: 8192 },
      'deepseek-coder-v2:16b': { type: 'code', temperature: 0.3, max_tokens: 6144 },
      'codellama:7b': { type: 'code', temperature: 0.2, max_tokens: 4096 },
      'codellama:13b': { type: 'code', temperature: 0.2, max_tokens: 6144 },
      'magicoder:7b': { type: 'code', temperature: 0.3, max_tokens: 4096 },
      'starcoder2:15b': { type: 'code', temperature: 0.2, max_tokens: 8192 },

      // 🧠 추론/논리 모델군
      'phi3:mini': { type: 'reasoning', temperature: 0.5, max_tokens: 2048, recommended: true },
      'phi3:latest': { type: 'reasoning', temperature: 0.5, max_tokens: 2048 },
      'phi:2.7b': { type: 'reasoning', temperature: 0.6, max_tokens: 2048 },

      // 🎭 범용 대화 모델군
      'mistral:latest': { type: 'chat', temperature: 0.7, max_tokens: 2048 },
      'mistral:7b': { type: 'chat', temperature: 0.7, max_tokens: 2048 },
      'mixtral:8x7b': { type: 'chat', temperature: 0.6, max_tokens: 4096 },
      'vicuna:7b': { type: 'chat', temperature: 0.7, max_tokens: 2048 },
      'qwen:7b': { type: 'chat', temperature: 0.7, max_tokens: 2048 },

      // 🔗 임베딩 모델군
      'nomic-embed-text:latest': { type: 'embedding', temperature: 0.0, max_tokens: 512 },
      'mxbai-embed-large:latest': { type: 'embedding', temperature: 0.0, max_tokens: 512 }
    };

    Object.entries(configs).forEach(([model, config]) => {
      this.modelConfigs.set(model, config);
    });

    console.log(`✅ 모델 설정 초기화 완료: ${this.modelConfigs.size} 개 모델 (전체 Ollama 지원)`);
    console.log(`🎯 추천 모델: ${Object.entries(configs).filter(([_, config]) => config.recommended).map(([name]) => name).join(', ')}`);
  }

  // ============================================================================
  // 🔍 무한루프 방지 연결 상태 관리
  // ============================================================================

  /**
   * 안전한 연결 확인 (쿨다운 + 중복 방지)
   */
  async checkConnection(): Promise<boolean> {
    const now = Date.now();
    
    // 쿨다운 체크
    if (now - this.lastConnectionCheck < this.connectionCooldown) {
      console.log('🔄 연결 체크 쿨다운 중... 캐시된 결과 반환');
      return this.isAvailable;
    }
    
    // 중복 호출 방지
    if (this.isConnecting) {
      console.log('⏳ 이미 연결 체크 중... 기존 결과 반환');
      return this.isAvailable;
    }
    
    return await this.performSingleConnectionCheck();
  }

  /**
   * 단일 연결 확인 수행 (재귀 호출 없음)
   */
  private async performSingleConnectionCheck(): Promise<boolean> {
    this.isConnecting = true;
    this.lastConnectionCheck = Date.now();
    
    try {
      console.log(`🔍 Ollama 연결 확인 중: ${this.baseURL}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${this.baseURL}/api/tags`, {
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.warn(`⚠️ Ollama 서버 응답 오류: ${response.status}`);
        this.isAvailable = false;
        return false;
      }
      
      const data = await response.json();
      console.log(`✅ Ollama 연결 성공, 모델 수: ${data.models?.length || 0}`);
      this.isAvailable = true;
      return true;
      
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.warn('⚠️ Ollama 서버 연결 타임아웃 (5초)');
      } else if (error.message?.includes('ECONNREFUSED')) {
        console.warn('⚠️ Ollama 서버가 실행되지 않음. `ollama serve` 명령으로 시작하세요.');
      } else {
        console.warn(`⚠️ Ollama 연결 실패: ${error.message}`);
      }
      this.isAvailable = false;
      return false;
      
    } finally {
      this.isConnecting = false;
    }
  }

  /**
   * 강제 헬스체크 (캐시 무시)
   */
  async forceHealthCheck(): Promise<boolean> {
    this.lastConnectionCheck = 0;
    this.isConnecting = false;
    return await this.checkConnection();
  }

  // ============================================================================
  // 📋 무한루프 방지 모델 관리
  // ============================================================================

  /**
   * 안전한 모델 목록 조회 (쿨다운 + 중복 방지)
   */
  async getModels(): Promise<string[]> {
    const now = Date.now();
    
    // 쿨다운 체크
    if (this.models.length > 0 && now - this.lastModelsCheck < this.modelsCooldown) {
      console.log('🔄 모델 목록 쿨다운 중... 캐시된 결과 반환');
      return this.models;
    }
    
    // 중복 호출 방지
    if (this.isLoadingModels) {
      console.log('⏳ 이미 모델 로딩 중... 기존 결과 반환');
      return this.models;
    }
    
    await this.performSingleModelsLoad();
    return this.models;
  }

  /**
   * 단일 모델 로딩 수행 (재귀 호출 없음)
   */
  private async performSingleModelsLoad(): Promise<void> {
    this.isLoadingModels = true;
    this.lastModelsCheck = Date.now();
    
    try {
      // 연결 상태가 확실히 실패한 경우 빈 배열 반환
      if (!this.isAvailable) {
        console.warn('⚠️ Ollama 서비스 이용 불가 - 빈 모델 목록 반환');
        this.models = [];
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
      
      console.log(`📋 사용 가능한 Ollama 모델 (${this.models.length}개):`, this.models);

    } catch (error: any) {
      console.error('❌ 모델 목록 로딩 실패:', error.message);
      this.models = [];
    } finally {
      this.isLoadingModels = false;
    }
  }

  /**
   * 향상된 모델 목록 (AIModel 형식)
   */
  async getAvailableModels(): Promise<AIModel[]> {
    await this.getModels(); // 안전한 모델 로딩

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
        recommended: config?.recommended || false
      });
    });

    // 타입별, 추천 여부별 정렬
    return models.sort((a, b) => {
      // 추천 모델을 먼저 배치
      if (a.recommended && !b.recommended) return -1;
      if (!a.recommended && b.recommended) return 1;
      
      // 타입별 정렬
      const typeOrder = { 'chat': 0, 'code': 1, 'reasoning': 2, 'embedding': 3 };
      const typeCompare = (typeOrder[a.type] || 9) - (typeOrder[b.type] || 9);
      if (typeCompare !== 0) return typeCompare;
      
      // 같은 타입 내에서는 이름순
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * 기본 모델 반환 (사용자 모델 목록 기반)
   */
  getDefaultModel(): string {
    // 사용자가 보유한 모델 중에서 추천 순서대로 선택
    const preferredOrder = [
      'llama3.2:3b',       // 추천 1순위
      'llama3.2:latest',   
      'deepseek-coder:6.7b', // 코딩용 추천
      'phi3:mini',         // 추론용 추천
      'llama3.1:8b',
      'mistral:latest',
      'llama2:7b',
      'codellama:7b',
      'vicuna:7b',
      'qwen:7b'
    ];

    // 사용자가 보유한 모델 중 첫 번째 추천 모델 선택
    for (const model of preferredOrder) {
      if (this.models.includes(model)) {
        return model;
      }
    }

    // 추천 목록에 없으면 첫 번째 사용 가능한 모델
    if (this.models.length > 0) return this.models[0];
    
    // 기본값
    return 'llama3.2:3b';
  }

  // ============================================================================
  // 🎯 AI 응답 생성 (향상된 기능 + 안전성)
  // ============================================================================

  /**
   * AI 응답 생성 (메인 메서드) - 안전한 구현
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
      // 단일 연결 확인 (무한루프 방지)
      const connected = await this.checkConnection();
      if (!connected) {
        throw new Error('Ollama 서버에 연결할 수 없습니다. `ollama serve` 명령어로 서버를 시작하세요.');
      }

      console.log(`🦙 Ollama 응답 생성 시작: ${model}`);

      // 메시지 구성
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

      // DatabaseService를 통한 대화 저장 (안전하게)
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
  // 🔧 내부 메서드들 (안전한 구현)
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
   * DatabaseService를 통한 안전한 대화 저장
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
      // Llama 모델군
      'llama3.2:3b': 'Llama 3.2 (3B) ⭐',
      'llama3.2:1b': 'Llama 3.2 (1B)',
      'llama3.2:latest': 'Llama 3.2 (Latest)',
      'llama3.1:8b': 'Llama 3.1 (8B)',
      'llama3.1:70b': 'Llama 3.1 (70B)',
      'llama2:7b': 'Llama 2 (7B)',
      'llama2:13b': 'Llama 2 (13B)', 
      'llama2:70b': 'Llama 2 (70B)',

      // 코딩 모델군
      'deepseek-coder:6.7b': 'DeepSeek Coder (6.7B) 💻',
      'deepseek-coder:33b': 'DeepSeek Coder (33B)',
      'deepseek-coder-v2:16b': 'DeepSeek Coder V2 (16B)',
      'codellama:7b': 'Code Llama (7B)',
      'codellama:13b': 'Code Llama (13B)',
      'magicoder:7b': 'MagiCoder (7B)',
      'starcoder2:15b': 'StarCoder 2 (15B)',

      // 추론 모델군
      'phi3:mini': 'Phi-3 Mini 🧠',
      'phi3:latest': 'Phi-3 (Latest)',
      'phi:2.7b': 'Phi (2.7B)',

      // 범용 모델군
      'mistral:latest': 'Mistral 7B',
      'mistral:7b': 'Mistral 7B',
      'mixtral:8x7b': 'Mixtral 8x7B',
      'vicuna:7b': 'Vicuna (7B)',
      'qwen:7b': 'Qwen (7B)',

      // 임베딩 모델군
      'nomic-embed-text:latest': 'Nomic Embed 📊',
      'mxbai-embed-large:latest': 'MxBai Embed Large'
    };
    
    return nameMap[modelName] || modelName;
  }

  private getModelDescription(modelName: string): string {
    const descriptions: { [key: string]: string } = {
      // Llama 모델군
      'llama3.2:3b': '🎯 가장 균형잡힌 범용 대화 모델 (추천)',
      'llama3.2:1b': '⚡ 빠른 응답이 필요한 간단한 작업용 경량 모델',
      'llama3.2:latest': '🆕 최신 Llama 3.2 모델',
      'llama3.1:8b': '💪 향상된 성능의 중급 범용 모델',
      'llama3.1:70b': '🚀 최고 성능의 대형 언어 모델',
      'llama2:7b': '📚 안정적인 기본 대화 모델',
      'llama2:13b': '🎓 중급 규모의 범용 모델',
      'llama2:70b': '🏆 대형 고성능 언어 모델',

      // 코딩 모델군
      'deepseek-coder:6.7b': '💻 코드 생성/디버깅 최적화 모델 (추천)',
      'deepseek-coder:33b': '🔧 대형 코딩 전문 모델',
      'deepseek-coder-v2:16b': '✨ 개선된 코딩 전문 모델',
      'codellama:7b': '🦙 Meta의 코드 생성 전문 모델',
      'codellama:13b': '🔥 향상된 코드 생성 능력',
      'magicoder:7b': '🪄 마법 같은 코드 생성 모델',
      'starcoder2:15b': '⭐ BigCode의 차세대 코딩 모델',

      // 추론 모델군
      'phi3:mini': '🧠 논리적 추론과 수학 문제 해결 특화 (추천)',
      'phi3:latest': '🎯 최신 소형 추론 모델',
      'phi:2.7b': '💡 효율적인 추론 전문 모델',

      // 범용 모델군
      'mistral:latest': '🌟 빠르고 효율적인 유럽산 모델',
      'mistral:7b': '⚡ 빠른 응답의 범용 모델',
      'mixtral:8x7b': '🎛️ 전문가 혼합 대형 모델',
      'vicuna:7b': '🦙 Llama 기반 대화 최적화 모델',
      'qwen:7b': '🇨🇳 Alibaba의 다국어 지원 모델',

      // 임베딩 모델군
      'nomic-embed-text:latest': '📊 텍스트 임베딩 전용 모델',
      'mxbai-embed-large:latest': '🔗 대형 임베딩 벡터 생성'
    };
    
    return descriptions[modelName] || '🤖 범용 AI 모델';
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
  // 📊 상태 및 정보 메서드들 (무한루프 방지)
  // ============================================================================

  /**
   * 서비스 상태 정보 반환 (안전한 구현)
   */
  async getServiceStatus(): Promise<any> {
    // 연결 상태만 확인 (모델 로딩 없음)
    const isConnected = this.isAvailable;

    return {
      provider: 'ollama',
      connected: isConnected,
      baseUrl: this.baseURL,
      models: this.models, // 캐시된 모델 목록 사용
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
      },
      status: {
        initialized: this.isInitialized,
        connecting: this.isConnecting,
        loadingModels: this.isLoadingModels,
        lastConnectionCheck: this.lastConnectionCheck,
        lastModelsCheck: this.lastModelsCheck
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
      lastHealthCheck: this.lastConnectionCheck ? new Date(this.lastConnectionCheck) : null,
      timeout: this.timeout,
      retryCount: this.retryCount,
      modelCount: this.models.length,
      cachedModels: this.models
    };
  }

  /**
   * 연결 테스트 (안전한 구현)
   */
  async testConnection(): Promise<{success: boolean, message: string, details?: any}> {
    try {
      const isConnected = await this.forceHealthCheck();
      
      if (isConnected) {
        // 모델 로딩은 선택적으로
        if (this.models.length === 0) {
          await this.getModels();
        }
        
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
    this.isConnecting = false;
    this.isLoadingModels = false;
    this.lastConnectionCheck = 0;
    this.lastModelsCheck = 0;
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

// 클래스와 인스턴스 export
export { ollamaService };
export default OllamaAIService;

// ============================================================================
// 🎉 수정 완료 로그
// ============================================================================

console.log('✅ 향상된 Ollama AI 서비스 로드됨');
console.log('  🐛 FIXED: 무한루프 완전 방지');
console.log('  ✅ DatabaseService 안전한 연결');  
console.log('  🔧 중복 호출 방지 시스템');
console.log('  💪 모든 기존 기능 유지');
console.log('  🛡️ 강화된 에러 처리');