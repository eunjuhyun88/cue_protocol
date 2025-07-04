// ============================================================================
// 🤖 AIService.ts - Ollama 전용 AI 서비스 (OpenAI, Claude 제거)
// 파일: backend/src/services/ai/AIService.ts  
// 역할: Ollama 로컬 AI 모델만 관리하는 완전한 프라이버시 우선 서비스
// ============================================================================

import { DatabaseService } from '../database/DatabaseService';

interface AIResponse {
  content: string;
  model: string;
  tokensUsed?: number;
  personalizationLevel?: number;
  usedData?: string[];
  provider: string;
  local: boolean;
  privacy: string;
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface GenerateOptions {
  message: string;
  model: string;
  context: any;
  userId: string;
  userDid: string;
  temperature?: number;
  maxTokens?: number;
  includeContext?: boolean;
}

export class AIService {
  private static instance: AIService;
  private databaseService: DatabaseService;
  
  // Ollama 설정
  private ollamaHost: string;
  private isOllamaAvailable: boolean = false;
  private lastHealthCheck: number = 0;
  private healthCheckInterval: number = 5 * 60 * 1000; // 5분

  constructor(databaseService?: DatabaseService) {
    this.databaseService = databaseService || DatabaseService.getInstance();
    this.ollamaHost = process.env.OLLAMA_HOST || 'http://localhost:11434';
    
    console.log('🤖 AIService 초기화 완료 (Ollama 전용)');
    console.log(`🦙 Ollama 호스트: ${this.ollamaHost}`);
    
    // 초기 연결 체크
    this.checkOllamaHealth().catch(error => {
      console.warn('⚠️ 초기 Ollama 연결 실패:', error.message);
    });
  }

  public static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  // ============================================================================
  // 🦙 Ollama 연결 및 헬스체크
  // ============================================================================

  /**
   * Ollama 서버 연결 상태 확인
   */
  private async checkOllamaHealth(): Promise<boolean> {
    const now = Date.now();
    
    // 최근에 체크했으면 캐시된 결과 사용
    if (now - this.lastHealthCheck < this.healthCheckInterval && this.isOllamaAvailable) {
      return this.isOllamaAvailable;
    }

    try {
      console.log('🔍 Ollama 헬스체크 시작...');
      
      const response = await fetch(`${this.ollamaHost}/api/tags`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000) // 5초 타임아웃
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      this.isOllamaAvailable = true;
      this.lastHealthCheck = now;
      
      console.log('✅ Ollama 연결 성공:', {
        modelCount: data.models?.length || 0,
        availableModels: data.models?.slice(0, 3).map((m: any) => m.name) || []
      });
      
      return true;

    } catch (error: any) {
      this.isOllamaAvailable = false;
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
   * 사용 가능한 Ollama 모델 목록 조회
   */
  private async getOllamaModels(): Promise<string[]> {
    try {
      if (!await this.checkOllamaHealth()) {
        console.warn('⚠️ Ollama 서비스 이용 불가');
        return [];
      }

      const response = await fetch(`${this.ollamaHost}/api/tags`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000)
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
  // 🎯 메인 AI 응답 생성 메서드 (Ollama 전용)
  // ============================================================================

  /**
   * Ollama를 사용한 AI 응답 생성
   */
  public async generateResponse(options: GenerateOptions): Promise<AIResponse> {
    const { 
      message, 
      model, 
      context, 
      userId, 
      userDid, 
      temperature = 0.7, 
      maxTokens = 1000,
      includeContext = true 
    } = options;
    
    console.log(`🤖 AI 응답 생성 시작 (Ollama 전용) - 모델: ${model}, 사용자: ${userId}`);

    try {
      // 기본적으로 Ollama 응답 생성 시도
      return await this.generateOllamaResponse(message, context, model, temperature, maxTokens);
    } catch (error: any) {
      console.error('❌ AI 응답 생성 오류:', error);
      
      // Ollama 실패 시 Enhanced Mock 응답 반환
      return this.generateEnhancedMockResponse(message, context, model);
    }
  }

  // ============================================================================
  // 🦙 Ollama 응답 생성 (핵심 로직)
  // ============================================================================

  /**
   * Ollama AI 응답 생성 메서드
   */
  private async generateOllamaResponse(
    message: string, 
    context: any, 
    model: string = 'llama3.2:3b',
    temperature: number = 0.7,
    maxTokens: number = 1000
  ): Promise<AIResponse> {
    
    // 1. Ollama 연결 확인
    const isConnected = await this.checkOllamaHealth();
    if (!isConnected) {
      console.log('➡️ Ollama 연결 불가, Mock 응답 사용');
      return this.generateEnhancedMockResponse(message, context, `${model} (로컬 연결실패)`);
    }

    try {
      // 2. 개인화된 시스템 프롬프트 생성
      const systemPrompt = this.createPersonalizedSystemPrompt(context);
      
      // 3. 완전한 프롬프트 구성
      const fullPrompt = `${systemPrompt}

사용자 질문: ${message}

AI 답변:`;

      console.log(`🦙 Ollama API 호출: ${model}`);
      
      // 4. Ollama API 호출
      const response = await fetch(`${this.ollamaHost}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model,
          prompt: fullPrompt,
          stream: false,
          options: {
            temperature: temperature,
            num_predict: maxTokens,
            top_k: 40,
            top_p: 0.9,
            repeat_penalty: 1.1
          }
        }),
        signal: AbortSignal.timeout(60000) // 60초 타임아웃
      });

      if (!response.ok) {
        throw new Error(`Ollama API HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const aiResponse = data.response || '응답을 생성할 수 없습니다.';
      
      console.log(`✅ Ollama ${model} 응답 생성 성공`);
      
      return {
        content: aiResponse,
        model: model,
        tokensUsed: Math.floor(aiResponse.length / 4), // 대략적인 토큰 수
        personalizationLevel: this.calculatePersonalizationLevel(context),
        usedData: this.extractUsedData(context),
        provider: 'ollama',
        local: true,
        privacy: 'local-processing-only'
      };

    } catch (error: any) {
      console.error(`❌ Ollama ${model} 오류:`, error.message);
      
      // 모델별 도움말 메시지
      let helpMessage = '';
      if (error.message.includes('model') || error.message.includes('404')) {
        helpMessage = `\n\n💡 모델 다운로드 방법:\n1. \`ollama pull ${model}\` 명령어 실행\n2. 다운로드 완료 후 다시 시도`;
      } else if (error.message.includes('connection') || error.message.includes('ECONNREFUSED')) {
        helpMessage = `\n\n💡 Ollama 서버 시작 방법:\n1. \`ollama serve\` 명령어 실행\n2. 서버 실행 확인 후 다시 시도`;
      }
      
      return this.generateEnhancedMockResponse(
        message, 
        context, 
        `${model} (오류: ${error.message})`,
        helpMessage
      );
    }
  }

  // ============================================================================
  // 🎭 Enhanced Mock 응답 생성 (Ollama 전용)
  // ============================================================================

  /**
   * Ollama 연결 실패 시 사용할 Enhanced Mock 응답
   */
  private generateEnhancedMockResponse(
    message: string, 
    context: any, 
    modelName: string,
    helpMessage: string = ''
  ): AIResponse {
    const { personalityProfile, cues, behaviorPatterns } = context;
    
    // 메시지 분석
    const isQuestion = message.includes('?') || /how|what|why|when|where|어떻게|무엇|왜|언제|어디/.test(message.toLowerCase());
    const isTechnical = /code|api|algorithm|system|data|programming|개발|시스템|알고리즘/.test(message.toLowerCase());
    const isGreeting = /hello|hi|hey|안녕|안녕하세요/.test(message.toLowerCase());
    
    let responseType = 'general';
    if (isGreeting) responseType = 'greeting';
    else if (isQuestion) responseType = 'question';
    else if (isTechnical) responseType = 'technical';

    const responses: Record<string, string> = {
      greeting: `**${modelName}** 안녕하세요! 🦙

CUE Protocol의 로컬 AI 어시스턴트입니다. 완전한 프라이버시를 보장하는 Ollama 기반 AI로 운영됩니다.

**당신의 프로필:**
• **성격 유형**: ${personalityProfile?.type || 'Learning...'}
• **소통 스타일**: ${personalityProfile?.communicationStyle || 'Adaptive'}
• **개인 컨텍스트**: ${cues?.length || 0}개 활용 가능
• **프라이버시**: 🔒 100% 로컬 처리 보장

${helpMessage}

궁금한 것이 있으시면 언제든 말씀해주세요!`,

      question: `**${modelName}** 질문 응답 🤔

"${message}"

이 질문에 대해 당신의 **${personalityProfile?.type || 'Adaptive'}** 성격과 학습 패턴을 고려하여 답변드리겠습니다.

**Ollama 로컬 AI 특징:**
• **완전한 프라이버시**: 데이터가 외부로 전송되지 않음
• **개인화**: ${cues?.length || 0}개 컨텍스트 활용
• **빠른 응답**: 로컬 처리로 즉시 응답

${helpMessage}

더 구체적인 정보가 필요하시면 언제든 추가 질문해주세요!`,

      technical: `**${modelName}** 기술 분석 🔧

**분석 대상:** "${message}"

**로컬 AI 기술 접근:**
• **기술 성향**: ${personalityProfile?.type?.includes('Technical') ? 'High (상세 분석)' : 'Moderate (이해 중심)'}
• **학습 패턴**: ${personalityProfile?.learningPattern || 'Visual'} 방식 적용
• **프라이버시**: 🔒 코드와 데이터가 로컬에만 보존

${helpMessage}

더 구체적인 기술적 질문이나 코드 예제가 필요하시면 말씀해주세요!`,

      general: `**${modelName}** Ollama 로컬 AI 응답 🦙

**메시지:** "${message}"

**로컬 AI Passport 프로필 적용:**
• **성격**: ${personalityProfile?.type || 'Learning...'}
• **소통**: ${personalityProfile?.communicationStyle || 'Adaptive'}
• **개인 CUE**: ${cues?.length || 0}개 컨텍스트 활용
• **프라이버시**: 🔒 완전한 로컬 처리

**Ollama의 장점:**
✅ 완전한 데이터 프라이버시
✅ 인터넷 없이도 작동
✅ 개인화된 AI 경험
✅ 빠른 로컬 응답

${helpMessage}

더 구체적인 질문이나 특정 주제에 대해 자세히 알고 싶으시면 언제든 말씀해주세요!`
    };

    return {
      content: responses[responseType] || responses.general,
      model: modelName,
      tokensUsed: Math.floor(Math.random() * 500) + 300,
      personalizationLevel: this.calculatePersonalizationLevel(context),
      usedData: this.extractUsedData(context),
      provider: 'ollama-mock',
      local: true,
      privacy: 'local-processing-only'
    };
  }

  // ============================================================================
  // 🛠️ 헬퍼 메서드들
  // ============================================================================

  /**
   * 개인화된 시스템 프롬프트 생성
   */
  private createPersonalizedSystemPrompt(context: any): string {
    const { personalityProfile, cues, behaviorPatterns, preferences } = context;
    
    return `당신은 CUE Protocol의 개인화된 AI 어시스턴트입니다. 완전히 로컬에서 실행되는 Ollama AI로서 사용자의 프라이버시를 100% 보장합니다.

**사용자 프로필:**
- 성격: ${personalityProfile?.type || 'Unknown'}
- 소통: ${personalityProfile?.communicationStyle || 'Adaptive'}
- 학습: ${personalityProfile?.learningPattern || 'Visual'}
- 의사결정: ${personalityProfile?.decisionMaking || 'Analytical'}

**개인 컨텍스트 (${cues?.length || 0}개):**
${cues?.slice(0, 5).map((cue: any, i: number) => 
  `${i + 1}. ${cue.compressed_content || cue.content || 'Context data'} (${cue.content_type || 'general'})`
).join('\n') || '아직 개인 컨텍스트가 수집되지 않았습니다.'}

**행동 패턴:**
${behaviorPatterns?.slice(0, 5).join(', ') || '패턴을 학습 중입니다...'}

**사용자 선호도:**
${Object.entries(preferences || {}).slice(0, 3).map(([key, value]) => `- ${key}: ${value}`).join('\n') || '- 선호도를 학습 중입니다...'}

**중요한 지침:**
1. 항상 한국어로 친근하고 도움이 되는 응답을 제공하세요
2. 사용자의 성격과 소통 스타일에 맞춰 응답하세요
3. 관련이 있을 때 개인 컨텍스트를 활용하세요
4. 완전한 로컬 처리로 프라이버시가 보장됨을 강조하세요
5. 정확하고 유용한 정보를 제공하되, 확실하지 않으면 그렇게 말하세요`;
  }

  /**
   * 개인화 수준 계산
   */
  private calculatePersonalizationLevel(context: any): number {
    const { personalityProfile, cues, behaviorPatterns } = context;
    
    let level = 0.3; // 기본 레벨
    
    if (personalityProfile?.type) level += 0.2;
    if (cues?.length > 0) level += Math.min(cues.length * 0.05, 0.3);
    if (behaviorPatterns?.length > 0) level += Math.min(behaviorPatterns.length * 0.02, 0.2);
    
    return Math.min(level, 1.0);
  }

  /**
   * 사용된 데이터 추출
   */
  private extractUsedData(context: any): string[] {
    const data: string[] = [];
    
    if (context.personalityProfile) data.push('Personality Profile');
    if (context.cues?.length > 0) data.push(`${context.cues.length} Personal Contexts`);
    if (context.behaviorPatterns?.length > 0) data.push('Behavior Patterns');
    if (context.preferences && Object.keys(context.preferences).length > 0) data.push('User Preferences');
    if (context.recentInteractions?.length > 0) data.push('Recent Interactions');
    
    return data;
  }

  // ============================================================================
  // 📊 공개 유틸리티 메서드들 (DI 호환)
  // ============================================================================

  /**
   * DI Container 호환 - 메시지 전송 메서드
   */
  public async sendMessage(message: string, options: any = {}): Promise<any> {
    const {
      model = 'llama3.2:3b',
      userDid = 'anonymous',
      includeContext = true,
      temperature = 0.7,
      maxTokens = 2000
    } = options;

    try {
      // 사용자 개인화 컨텍스트 가져오기
      const context = includeContext ? await this.getPersonalizedContext(userDid) : {};
      
      // AI 응답 생성
      const response = await this.generateResponse({
        message,
        model,
        context,
        userId: userDid,
        userDid,
        temperature,
        maxTokens,
        includeContext
      });

      return {
        response: response.content,
        model: response.model,
        timestamp: new Date().toISOString(),
        qualityScore: response.personalizationLevel || 0.8,
        tokensUsed: response.tokensUsed || 0,
        provider: response.provider,
        local: response.local,
        privacy: response.privacy,
        messageId: `msg_${Date.now()}`,
        conversationId: `conv_${Date.now()}`
      };

    } catch (error: any) {
      console.error('❌ sendMessage 오류:', error);
      
      return {
        response: `Ollama AI 서비스 오류: ${error.message}\n\n💡 해결 방법:\n1. \`ollama serve\` 명령어로 서버 시작\n2. \`ollama pull ${model}\` 명령어로 모델 다운로드`,
        model: `${model} (오류)`,
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }

  /**
   * 개인화 컨텍스트 조회
   */
  public async getPersonalizedContext(userDid: string): Promise<any> {
    try {
      // 실제 구현에서는 데이터베이스에서 사용자 컨텍스트를 가져옴
      return {
        personalityProfile: {
          type: 'Tech-Savvy Privacy Advocate',
          communicationStyle: 'Direct',
          learningPattern: 'Visual',
          decisionMaking: 'Analytical'
        },
        cues: [
          { content: 'Ollama 로컬 AI 사용 선호', content_type: 'preference' },
          { content: '프라이버시 중시', content_type: 'value' },
          { content: '기술적 정확성 요구', content_type: 'behavior' }
        ],
        behaviorPatterns: ['로컬 AI 선호', '프라이버시 중시', '기술 문서 선호'],
        preferences: {
          language: 'korean',
          responseStyle: 'detailed',
          privacyLevel: 'maximum'
        }
      };
    } catch (error) {
      console.error('❌ 개인화 컨텍스트 조회 오류:', error);
      return {};
    }
  }

  /**
   * 사용 가능한 모델 목록 반환 (Ollama 전용)
   */
  public getAvailableModels(): any[] {
    return [
      {
        id: 'llama3.2:3b',
        name: 'Llama 3.2 3B',
        available: true,
        recommended: true,
        type: 'local',
        provider: 'ollama',
        description: '빠르고 효율적인 대화형 모델 (추천)',
        size: '2.0GB',
        speed: 'fast'
      },
      {
        id: 'llama3.2:1b',
        name: 'Llama 3.2 1B',
        available: true,
        recommended: true,
        type: 'local',
        provider: 'ollama',
        description: '매우 빠른 경량 모델',
        size: '1.3GB',
        speed: 'very-fast'
      },
      {
        id: 'llama3.1:8b',
        name: 'Llama 3.1 8B',
        available: false,
        recommended: false,
        type: 'local',
        provider: 'ollama',
        description: '고성능 모델 (더 많은 자원 필요)',
        size: '4.7GB',
        speed: 'moderate'
      },
      {
        id: 'gemma2:2b',
        name: 'Gemma 2 2B',
        available: false,
        recommended: false,
        type: 'local',
        provider: 'ollama',
        description: 'Google의 경량 모델',
        size: '1.6GB',
        speed: 'fast'
      }
    ];
  }

  /**
   * 서비스 상태 반환
   */
  public async getServiceStatus(): Promise<any> {
    const isConnected = await this.checkOllamaHealth();
    const models = isConnected ? await this.getOllamaModels() : [];
    
    return {
      available: isConnected,
      provider: 'ollama',
      host: this.ollamaHost,
      models: models,
      modelCount: models.length,
      lastHealthCheck: new Date(this.lastHealthCheck).toISOString(),
      privacy: 'local-processing-only',
      features: {
        localProcessing: true,
        noDataCollection: true,
        offlineCapable: true,
        customizable: true
      }
    };
  }

  /**
   * 채팅 히스토리 조회 (DI 호환)
   */
  public async getChatHistory(userId: string, options: any = {}): Promise<any[]> {
    try {
      const { limit = 20, offset = 0 } = options;
      
      // 실제 구현에서는 데이터베이스에서 채팅 히스토리를 가져옴
      return [
        {
          id: 'msg_1',
          content: 'Ollama AI와의 대화 예시',
          role: 'user',
          timestamp: new Date().toISOString(),
          model: 'llama3.2:3b'
        }
      ];
    } catch (error) {
      console.error('❌ 채팅 히스토리 조회 오류:', error);
      return [];
    }
  }

  /**
   * 상태 조회 (DI 호환)
   */
  public async getStatus(): Promise<any> {
    return this.getServiceStatus();
  }
}