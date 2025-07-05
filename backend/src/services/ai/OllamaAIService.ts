// ============================================================================
// 🦙 실제 프로젝트 호환 OllamaAIService - chat.ts와 완벽 호환
// 파일: backend/src/services/ai/OllamaAIService.ts  
// 특징: 기존 ollama.ts 완전 호환 + generateOllamaResponse 함수 제공
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

/**
 * 🦙 실제 프로젝트 호환 OllamaAIService
 * - 기존 ollama.ts 완전 호환 (OllamaService 클래스)
 * - chat.ts에서 사용하는 generateOllamaResponse 함수 제공
 * - 무한루프 방지 시스템
 * - DatabaseService 안전한 연동
 * - app.ts generateResponse 메서드 지원
 */
export class OllamaAIService {
  private static instance: OllamaAIService;
  private baseURL: string;
  private timeout: number;
  private retryCount: number;
  private defaultModel: string;
  private operationCount: number = 0;
  
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
  private lastError: string | null = null;

  private constructor() {
    console.log('🦙 === 실제 프로젝트 호환 OllamaAIService 초기화 ===');
    
    this.baseURL = this.validateBaseURL();
    this.timeout = parseInt(process.env.OLLAMA_TIMEOUT || '60000');
    this.retryCount = parseInt(process.env.OLLAMA_RETRY_COUNT || '3');
    this.defaultModel = process.env.OLLAMA_DEFAULT_MODEL || 'llama3.2:3b';
    
    console.log(`🔗 Ollama 서버: ${this.baseURL}`);
    console.log(`⚙️ 기본 모델: ${this.defaultModel}, 타임아웃: ${this.timeout}ms`);
    
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
  // 🔧 기존 ollama.ts 완전 호환 메서드들
  // ============================================================================

  /**
   * 🔧 Base URL 검증 및 설정
   */
  private validateBaseURL(): string {
    const possibleUrls = [
      process.env.OLLAMA_BASE_URL,
      process.env.OLLAMA_URL,
      process.env.OLLAMA_HOST,
      'http://localhost:11434'
    ];

    for (const url of possibleUrls) {
      if (url && url.trim() !== '') {
        const cleanUrl = url.trim().replace(/\/$/, ''); // 마지막 슬래시 제거
        console.log(`🔍 Ollama URL 설정: ${cleanUrl}`);
        return cleanUrl;
      }
    }

    console.warn('⚠️ OLLAMA_BASE_URL 환경변수가 설정되지 않음, 기본값 사용');
    return 'http://localhost:11434';
  }

  /**
   * 🔌 연결 상태 확인 (기존 ollama.ts 호환)
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
   * 💬 기본 채팅 메서드 (기존 ollama.ts 완전 호환)
   */
  async chat(
    model: string = 'llama3.2',
    messages: OllamaMessage[],
    stream: boolean = false
  ): Promise<string> {
    
    for (let attempt = 1; attempt <= this.retryCount; attempt++) {
      try {
        console.log(`🦙 Ollama 채팅 시도 ${attempt}/${this.retryCount} - 모델: ${model}`);
        
        if (!await this.checkConnection()) {
          throw new Error('Ollama 서버에 연결할 수 없습니다');
        }

        const result = await this.performChatRequest(model, messages, { stream });
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

  /**
   * 📋 사용 가능한 모델 목록 조회 (기존 ollama.ts 호환)
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
   * 📥 모델 다운로드 (기존 ollama.ts 호환)
   */
  async pullModel(model: string): Promise<void> {
    try {
      console.log(`📥 모델 다운로드 시작: ${model}`);
      
      const response = await fetch(`${this.baseURL}/api/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: model }),
        signal: AbortSignal.timeout(300000) // 5분 타임아웃
      });

      if (!response.ok) {
        throw new Error(`Failed to pull model: ${model}`);
      }

      console.log(`✅ 모델 다운로드 완료: ${model}`);

    } catch (error: any) {
      const errorMessage = this.getErrorMessage(error);
      console.error(`❌ 모델 다운로드 실패: ${model}`, errorMessage);
      throw new Error(`모델 다운로드 실패: ${errorMessage}`);
    }
  }

  // ============================================================================
  // 🎯 chat.ts에서 사용하는 generateOllamaResponse 호환 메서드
  // ============================================================================

  /**
   * 💬 app.ts 호환 generateResponse 메서드 (app.ts에서 호출)
   * ✅ app.ts와 완전 호환되는 시그니처
   */
  async generateResponse(
    message: string,
    model: string = this.defaultModel,
    personalizedContext: any = {},
    userDid: string = 'anonymous',
    conversationId: string = `conv_${Date.now()}`
  ): Promise<{
    content: string;
    model: string;
    tokensUsed: number;
    processingTime: number;
    conversationId: string;
    metadata: any;
  }> {
    const startTime = Date.now();
    this.operationCount++;

    console.log(`🦙 AI 응답 생성 시작 [${this.operationCount}]: ${model}`);
    console.log(`📝 메시지: "${message.substring(0, 100)}..."`);
    console.log(`👤 사용자: ${userDid}, 대화: ${conversationId}`);

    try {
      // 단일 연결 확인 (무한루프 방지)
      const connected = await this.checkConnection();
      if (!connected) {
        throw new Error('Ollama 서버에 연결할 수 없습니다. `ollama serve` 명령어로 서버를 시작하세요.');
      }

      // 개인화된 시스템 프롬프트 생성
      const systemPrompt = this.createPersonalizedSystemPrompt(personalizedContext, userDid);
      
      // 메시지 구성
      const messages: OllamaMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ];
      
      // Ollama API 호출 (기존 chat 메서드 활용)
      const aiResponseContent = await this.chat(model, messages, false);
      const processingTime = Date.now() - startTime;
      
      // 토큰 사용량 추정
      const estimatedTokens = this.estimateTokenUsage(message, aiResponseContent);

      // app.ts 호환 응답 객체 생성
      const result = {
        content: aiResponseContent,
        model,
        tokensUsed: estimatedTokens,
        processingTime,
        conversationId,
        metadata: {
          userDid,
          systemPromptUsed: !!systemPrompt,
          personalizedContext: !!personalizedContext.personalityProfile,
          cuesUsed: personalizedContext.cues?.length || 0,
          operationId: this.operationCount,
          timestamp: new Date().toISOString(),
          promptTokens: this.estimateTokensFromText(message),
          completionTokens: this.estimateTokensFromText(aiResponseContent),
          provider: 'ollama',
          local: true,
          privacy: 'fully_local'
        }
      };

      // DatabaseService를 통한 대화 저장 (안전하게)
      if (userDid && this.db) {
        try {
          await this.saveChatToDatabase(userDid, message, result, conversationId);
        } catch (dbError) {
          console.warn('⚠️ 대화 저장 실패 (기능은 계속됨):', dbError);
        }
      }

      console.log(`✅ AI 응답 생성 완료 [${processingTime}ms]: ${estimatedTokens} tokens`);
      return result;

    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      const errorMessage = this.getErrorMessage(error);
      
      console.error(`❌ AI 응답 생성 실패 [${processingTime}ms]:`, errorMessage);
      this.lastError = errorMessage;

      // 에러 시에도 구조적 응답 반환 (app.ts 호환)
      return {
        content: `죄송합니다. AI 서비스에 일시적인 문제가 발생했습니다. (${errorMessage})`,
        model,
        tokensUsed: 0,
        processingTime,
        conversationId,
        metadata: {
          userDid,
          error: errorMessage,
          operationId: this.operationCount,
          timestamp: new Date().toISOString(),
          fallback: true
        }
      };
    }
  }

  // ============================================================================
  // 📊 chat.ts 호환 전용 함수 (generateOllamaResponse와 같은 형태)
  // ============================================================================

  /**
   * 🔧 개인화된 시스템 프롬프트 생성 (chat.ts 호환)
   */
  private createPersonalizedSystemPrompt(context: any = {}, userDid: string): string {
    const { personalityProfile, cues, behaviorPatterns } = context;
    
    let prompt = `당신은 AI Personal Assistant입니다. 사용자의 개인 데이터를 바탕으로 맞춤형 응답을 제공해주세요.

기본 지침:
- 한국어로 친근하고 도움이 되는 답변을 제공해주세요
- 사용자의 개인 데이터와 패턴을 고려하여 개인화된 응답을 만들어주세요
- 구체적이고 실용적인 조언을 제공해주세요`;

    // 개성 프로필 추가
    if (personalityProfile?.type) {
      prompt += `\n\n사용자 성격 타입: ${personalityProfile.type}`;
      if (personalityProfile.traits?.length > 0) {
        prompt += `\n주요 특성: ${personalityProfile.traits.join(', ')}`;
      }
    }

    // 개인 큐 데이터 추가
    if (cues?.length > 0) {
      const recentCues = cues.slice(0, 5); // 최근 5개만 사용
      prompt += `\n\n사용자의 최근 관심사 및 패턴:`;
      recentCues.forEach((cue: any, index: number) => {
        prompt += `\n${index + 1}. ${cue.content || cue.text}`;
      });
    }

    // 행동 패턴 추가
    if (behaviorPatterns?.length > 0) {
      prompt += `\n\n사용자 행동 패턴: ${behaviorPatterns.join(', ')}`;
    }

    prompt += `\n\n사용자 ID: ${userDid}`;
    
    return prompt;
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
          try {
            this.db = container.get('DatabaseService');
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
  // 🔧 내부 메서드들 (안전한 구현)
  // ============================================================================

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
      this.lastError = null;
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
      this.lastError = this.getErrorMessage(error);
      return false;
      
    } finally {
      this.isConnecting = false;
    }
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
   * DatabaseService를 통한 안전한 대화 저장
   */
  private async saveChatToDatabase(
    userId: string,
    userMessage: string,
    aiResponse: any,
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

  /**
   * 🔢 토큰 사용량 추정
   */
  private estimateTokenUsage(input: string, output: string): number {
    const inputTokens = this.estimateTokensFromText(input);
    const outputTokens = this.estimateTokensFromText(output);
    return inputTokens + outputTokens;
  }

  /**
   * 📝 텍스트에서 토큰 수 추정
   */
  private estimateTokensFromText(text: string): number {
    if (!text) return 0;
    
    // 영어는 4자당 1토큰, 한국어는 2자당 1토큰으로 근사
    const englishChars = (text.match(/[a-zA-Z\s]/g) || []).length;
    const koreanChars = (text.match(/[ㄱ-ㅎ가-힣]/g) || []).length;
    const otherChars = text.length - englishChars - koreanChars;
    
    return Math.ceil(englishChars / 4) + Math.ceil(koreanChars / 2) + Math.ceil(otherChars / 3);
  }

  /**
   * 🔧 에러 메시지 정리
   */
  private getErrorMessage(error: any): string {
    if (typeof error === 'string') return error;
    if (error?.message) return error.message;
    if (error?.response?.data?.message) return error.response.data.message;
    if (error?.response?.statusText) return error.response.statusText;
    return 'Unknown error occurred';
  }

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

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 📊 서비스 통계 조회
   */
  getStats(): {
    operationCount: number;
    baseURL: string;
    defaultModel: string;
    timeout: number;
    lastError: string | null;
    available: boolean;
    modelCount: number;
  } {
    return {
      operationCount: this.operationCount,
      baseURL: this.baseURL,
      defaultModel: this.defaultModel,
      timeout: this.timeout,
      lastError: this.lastError,
      available: this.isAvailable,
      modelCount: this.models.length
    };
  }

  /**
   * 📊 서비스 상태 조회 (app.ts 호환)
   */
  async getServiceStatus(): Promise<any> {
    const timestamp = new Date().toISOString();
    
    try {
      const connected = await this.checkConnection();
      
      if (!connected) {
        return {
          connected: false,
          baseUrl: this.baseURL,
          models: [],
          status: 'offline',
          error: this.lastError || 'Connection failed',
          timestamp,
          database: {
            connected: this.db?.isConnected?.() || false,
            available: !!this.db
          }
        };
      }

      const models = await this.getModels();
      
      return {
        connected: true,
        baseUrl: this.baseURL,
        models,
        status: 'ready',
        timestamp,
        database: {
          connected: this.db?.isConnected?.() || false,
          available: !!this.db
        },
        features: [
          'chat', 
          'completion', 
          'local', 
          'privacy-focused',
          'conversation_storage',
          'personalization_support'
        ]
      };

    } catch (error: any) {
      const errorMessage = this.getErrorMessage(error);
      this.lastError = errorMessage;

      return {
        connected: false,
        baseUrl: this.baseURL,
        models: [],
        status: 'error',
        error: errorMessage,
        timestamp,
        database: {
          connected: false,
          available: !!this.db
        }
      };
    }
  }

  /**
   * 🧹 서비스 정리 (DI Container용)
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
    this.operationCount = 0;
    this.lastError = null;
    console.log('✅ OllamaAIService 정리 완료');
  }
}

// ============================================================================
// 📤 Export (기존 ollama.ts 완전 호환)
// ============================================================================

// 싱글톤 인스턴스 생성 (기존 ollama.ts와 동일한 방식)
const ollamaService = OllamaAIService.getInstance();

// 기존 ollama.ts 완전 호환 함수들
export const checkConnection = () => ollamaService.checkConnection();
export const getModels = () => ollamaService.getModels();

// ✅ chat.ts에서 필요한 generateOllamaResponse 함수 제공
export async function generateOllamaResponse(message: string, context: any): Promise<{
  response: string;
  tokensUsed: number;
  usedData: any[];
}> {
  try {
    console.log('🦙 generateOllamaResponse 호출됨 (chat.ts 호환)');
    
    // 기본 모델 사용 (환경변수 또는 기본값)
    const model = process.env.OLLAMA_DEFAULT_MODEL || 'llama3.2:3b';
    
    // OllamaAIService의 generateResponse 메서드 활용
    const result = await ollamaService.generateResponse(
      message,
      model,
      context,
      context.userDid || 'anonymous',
      context.conversationId || `conv_${Date.now()}`
    );

    // chat.ts에서 기대하는 형태로 변환
    return {
      response: result.content,
      tokensUsed: result.tokensUsed,
      usedData: context.cues || []
    };

  } catch (error: any) {
    console.error('❌ generateOllamaResponse 실패:', error.message);
    
    // 에러 시 폴백 응답
    return {
      response: `죄송합니다. Ollama AI 서비스에 연결할 수 없습니다.\n\n💡 해결 방법:\n1. \`ollama serve\` 명령어로 서버 시작\n2. \`ollama pull llama3.2:3b\` 명령어로 모델 다운로드\n3. 서버가 실행 중인지 확인\n\n문의: "${message}"`,
      tokensUsed: 0,
      usedData: []
    };
  }
}

// 기존 ollama.ts 호환을 위한 chat 함수
export const chat = (model: string, messages: OllamaMessage[], stream: boolean = false) => 
  ollamaService.chat(model, messages, stream);

// 클래스와 인스턴스 export
export { ollamaService, OllamaAIService };
export default OllamaAIService;

// ============================================================================
// 🎉 실제 프로젝트 호환 완료 로그
// ============================================================================

console.log('✅ 실제 프로젝트 호환 Ollama AI 서비스 로드됨');
console.log('  🔗 기존 ollama.ts 완전 호환');
console.log('  🎯 chat.ts generateOllamaResponse 함수 제공');
console.log('  ✅ app.ts generateResponse 메서드 호환');
console.log('  🐛 무한루프 완전 방지');
console.log('  🗄️ DatabaseService 안전한 연결');
console.log('  💪 모든 기존 기능 유지');
console.log('  🛡️ 강화된 에러 처리');