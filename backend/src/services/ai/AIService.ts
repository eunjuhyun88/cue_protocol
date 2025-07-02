// ============================================================================
// 🤖 AI 서비스 - 통합 AI 모델 관리
// 파일: backend/src/services/ai/AIService.ts
// 역할: OpenAI, Claude, Ollama 등 다양한 AI 모델 통합 관리
// ============================================================================

import { DatabaseService } from '../database/DatabaseService';

interface AIResponse {
  content: string;
  model: string;
  tokensUsed?: number;
  personalizationLevel?: number;
  usedData?: string[];
  provider?: string;
  local?: boolean;
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
}

export class AIService {
  private static instance: AIService;
  private databaseService: DatabaseService;
  
  // AI 클라이언트들 (지연 로딩)
  private openaiClient: any = null;
  private anthropicClient: any = null;
  private openaiAttempted = false;
  private anthropicAttempted = false;

  private constructor() {
    this.databaseService = DatabaseService.getInstance();
    console.log('🤖 AIService 초기화 완료');
  }

  public static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  // ============================================================================
  // 🔐 OpenAI 클라이언트 생성 (지연 로딩)
  // ============================================================================
  
  private async getOpenAIClient() {
    if (this.openaiAttempted) {
      return this.openaiClient;
    }

    this.openaiAttempted = true;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey.trim() === '' || apiKey === 'your-openai-key-here') {
      console.log('⚠️ OpenAI API key not configured');
      return null;
    }

    try {
      console.log('🔄 OpenAI 클라이언트 생성 중...');
      const { default: OpenAI } = await import('openai');
      
      this.openaiClient = new OpenAI({ apiKey });
      console.log('✅ OpenAI 클라이언트 생성 성공');
      return this.openaiClient;
    } catch (error: any) {
      console.error('❌ OpenAI 클라이언트 생성 실패:', error.message);
      this.openaiClient = null;
      return null;
    }
  }

  // ============================================================================
  // 🔐 Anthropic 클라이언트 생성 (지연 로딩)
  // ============================================================================
  
  private async getAnthropicClient() {
    if (this.anthropicAttempted) {
      return this.anthropicClient;
    }

    this.anthropicAttempted = true;

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey.trim() === '' || apiKey === 'your-anthropic-key-here') {
      console.log('⚠️ Anthropic API key not configured');
      return null;
    }

    try {
      console.log('🔄 Anthropic 클라이언트 생성 중...');
      const { default: Anthropic } = await import('@anthropic-ai/sdk');
      
      this.anthropicClient = new Anthropic({ apiKey });
      console.log('✅ Anthropic 클라이언트 생성 성공');
      return this.anthropicClient;
    } catch (error: any) {
      console.error('❌ Anthropic 클라이언트 생성 실패:', error.message);
      this.anthropicClient = null;
      return null;
    }
  }

  // ============================================================================
  // 🎯 메인 AI 응답 생성 메서드
  // ============================================================================
  
  public async generateResponse(options: GenerateOptions): Promise<AIResponse> {
    const { message, model, context, userId, userDid, temperature = 0.7, maxTokens = 1000 } = options;
    
    console.log(`🤖 AI 응답 생성 시작 - 모델: ${model}, 사용자: ${userId}`);

    try {
      // 모델에 따른 응답 생성
      switch (model) {
        case 'gpt-4':
        case 'gpt-4o':
        case 'gpt-4o-mini':
          return await this.generateGPTResponse(message, context, model, temperature, maxTokens);
          
        case 'claude-3.5-sonnet':
        case 'claude-sonnet':
        case 'claude-3-sonnet':
          return await this.generateClaudeResponse(message, context, model, maxTokens);
          
        case 'llama3.2:3b':
        case 'llama3.2:1b':
        case 'llama3.1:8b':
        case 'gemma2:2b':
        case 'qwen2.5:3b':
          return await this.generateOllamaResponse(message, context, model);
          
        case 'personalized-agent':
        default:
          return await this.generatePersonalizedResponse(message, context, userDid);
      }
    } catch (error: any) {
      console.error('❌ AI 응답 생성 오류:', error);
      
      // 에러 발생 시 Enhanced Mock 응답 반환
      return this.generateEnhancedMockResponse(message, context, model);
    }
  }

  // ============================================================================
  // 🔵 GPT 응답 생성
  // ============================================================================
  
  private async generateGPTResponse(
    message: string, 
    context: any, 
    model: string = 'gpt-4o-mini',
    temperature: number = 0.7,
    maxTokens: number = 1000
  ): Promise<AIResponse> {
    const client = await this.getOpenAIClient();
    if (!client) {
      return this.generateEnhancedMockResponse(message, context, `${model} (API 미사용)`);
    }

    try {
      const systemPrompt = this.createPersonalizedSystemPrompt(context);
      
      const completion = await client.chat.completions.create({
        model: model === 'gpt-4' ? 'gpt-4o-mini' : model, // 안정적인 모델 사용
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        max_tokens: maxTokens,
        temperature: temperature,
      });

      const responseContent = completion.choices[0]?.message?.content || 
                             'Sorry, I could not generate a response.';

      console.log('✅ GPT 응답 생성 성공');
      
      return {
        content: responseContent,
        model: model,
        tokensUsed: completion.usage?.total_tokens || 0,
        personalizationLevel: this.calculatePersonalizationLevel(context),
        usedData: this.extractUsedData(context),
        provider: 'openai'
      };
    } catch (error: any) {
      console.error('❌ GPT API 오류:', error.message);
      return this.generateEnhancedMockResponse(message, context, `${model} (API 오류)`);
    }
  }

  // ============================================================================
  // 🟠 Claude 응답 생성
  // ============================================================================
  
  private async generateClaudeResponse(
    message: string, 
    context: any, 
    model: string = 'claude-3-5-sonnet-20241022',
    maxTokens: number = 1000
  ): Promise<AIResponse> {
    const client = await this.getAnthropicClient();
    if (!client) {
      return this.generateEnhancedMockResponse(message, context, `${model} (API 미사용)`);
    }

    try {
      const systemPrompt = this.createPersonalizedSystemPrompt(context);
      
      const response = await client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: 'user', content: message }]
      });

      const content = response.content[0];
      const responseText = content.type === 'text' ? content.text : 
                          'Sorry, I could not generate a response.';

      console.log('✅ Claude 응답 생성 성공');
      
      return {
        content: responseText,
        model: model,
        tokensUsed: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0),
        personalizationLevel: this.calculatePersonalizationLevel(context),
        usedData: this.extractUsedData(context),
        provider: 'anthropic'
      };
    } catch (error: any) {
      console.error('❌ Claude API 오류:', error.message);
      return this.generateEnhancedMockResponse(message, context, `${model} (API 오류)`);
    }
  }

  // ============================================================================
  // 🦙 Ollama 응답 생성
  // ============================================================================
  
  private async generateOllamaResponse(
    message: string, 
    context: any, 
    model: string = 'llama3.2:3b'
  ): Promise<AIResponse> {
    try {
      // Ollama 서비스 동적 임포트
      const { ollamaService } = await import('../ollama');
      
      const isConnected = await ollamaService.checkConnection();
      if (!isConnected) {
        console.log('➡️ Ollama 연결 불가, Mock 응답 사용');
        return this.generateEnhancedMockResponse(message, context, `${model} (로컬)`);
      }

      const systemPrompt = this.createPersonalizedSystemPrompt(context);
      
      const messages = [
        {
          role: 'system' as const,
          content: `${systemPrompt}

당신은 CUE Protocol의 개인화된 AI 어시스턴트입니다. 
사용자의 개인 정보와 컨텍스트를 바탕으로 친근하고 도움이 되는 한국어 응답을 제공해주세요.
로컬 AI 모델로서 사용자의 프라이버시를 완전히 보호하며 빠른 응답을 제공합니다.`
        },
        {
          role: 'user' as const,
          content: message
        }
      ];

      const response = await ollamaService.chat(model, messages, false);
      
      console.log(`✅ Ollama ${model} 응답 생성 성공`);
      
      return {
        content: response,
        model: model,
        tokensUsed: Math.floor(response.length / 4), // 대략적인 토큰 수
        personalizationLevel: this.calculatePersonalizationLevel(context),
        usedData: this.extractUsedData(context),
        provider: 'ollama',
        local: true
      };

    } catch (error: any) {
      console.error(`❌ Ollama ${model} 오류:`, error.message);
      return this.generateEnhancedMockResponse(message, context, `${model} (로컬 오류)`);
    }
  }

  // ============================================================================
  // 🧠 개인화된 응답 생성 (하이브리드)
  // ============================================================================
  
  private async generatePersonalizedResponse(
    message: string, 
    context: any, 
    userDid: string
  ): Promise<AIResponse> {
    console.log('🧠 개인화된 응답 생성 중...');
    
    const personalityType = context.personalityProfile?.type || '';
    
    // 성격 타입에 따른 최적 모델 선택
    if (personalityType.includes('Technical') || personalityType.includes('INTJ')) {
      // 기술적/분석적 성향 → Claude 선호
      return await this.generateClaudeResponse(message, context);
    } else if (personalityType.includes('Creative') || personalityType.includes('ENFP')) {
      // 창의적 성향 → GPT 선호
      return await this.generateGPTResponse(message, context);
    } else {
      // 기본적으로 가장 안정적인 모델 사용
      return await this.generateGPTResponse(message, context);
    }
  }

  // ============================================================================
  // 🎭 Enhanced Mock 응답 생성
  // ============================================================================
  
  private generateEnhancedMockResponse(
    message: string, 
    context: any, 
    modelName: string
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
      greeting: `**${modelName}** 안녕하세요! 👋

반갑습니다! AI Passport 시스템의 개인화된 어시스턴트입니다.

**당신의 프로필:**
• **성격 유형**: ${personalityProfile?.type || 'Learning...'}
• **소통 스타일**: ${personalityProfile?.communicationStyle || 'Adaptive'}
• **개인 컨텍스트**: ${cues?.length || 0}개 활용 가능

궁금한 것이 있으시면 언제든 말씀해주세요!`,

      question: `**${modelName}** 질문 응답 🤔

"${message}"

이 질문에 대해 당신의 **${personalityProfile?.type || 'Adaptive'}** 성격과 학습 패턴을 고려하여 답변드리겠습니다.

**개인화 적용:**
• **학습 방식**: ${personalityProfile?.learningPattern || 'Visual'} 
• **관련 컨텍스트**: ${cues?.length || 0}개 활용

더 구체적인 정보가 필요하시면 언제든 추가 질문해주세요!`,

      technical: `**${modelName}** 기술 분석 🔧

**분석 대상:** "${message}"

**개인화된 기술 접근:**
• **기술 성향**: ${personalityProfile?.type?.includes('Technical') ? 'High (상세 분석)' : 'Moderate (이해 중심)'}
• **학습 패턴**: ${personalityProfile?.learningPattern || 'Visual'} 방식 적용

더 구체적인 기술적 질문이나 코드 예제가 필요하시면 말씀해주세요!`,

      general: `**${modelName}** 개인화 응답 💫

**메시지:** "${message}"

**당신의 AI Passport 프로필 적용:**
• **성격**: ${personalityProfile?.type || 'Learning...'}
• **소통**: ${personalityProfile?.communicationStyle || 'Adaptive'}
• **개인 CUE**: ${cues?.length || 0}개 컨텍스트 활용

더 구체적인 질문이나 특정 주제에 대해 자세히 알고 싶으시면 언제든 말씀해주세요!`
    };

    return {
      content: responses[responseType] || responses.general,
      model: modelName,
      tokensUsed: Math.floor(Math.random() * 500) + 300,
      personalizationLevel: this.calculatePersonalizationLevel(context),
      usedData: this.extractUsedData(context),
      provider: 'mock'
    };
  }

  // ============================================================================
  // 🛠️ 헬퍼 메서드들
  // ============================================================================
  
  private createPersonalizedSystemPrompt(context: any): string {
    const { personalityProfile, cues, behaviorPatterns, preferences } = context;
    
    return `You are an AI assistant with deep knowledge of the user's personality and preferences.

**User Profile:**
- Personality: ${personalityProfile?.type || 'Unknown'}
- Communication: ${personalityProfile?.communicationStyle || 'Adaptive'}
- Learning: ${personalityProfile?.learningPattern || 'Visual'}
- Decision Making: ${personalityProfile?.decisionMaking || 'Analytical'}

**Personal Context (${cues?.length || 0} items):**
${cues?.slice(0, 5).map((cue: any, i: number) => 
  `${i + 1}. ${cue.compressed_content || cue.content || 'Context data'} (${cue.content_type || 'general'})`
).join('\n') || 'No personal context available yet.'}

**Behavioral Patterns:**
${behaviorPatterns?.slice(0, 5).join(', ') || 'Learning patterns...'}

**User Preferences:**
${Object.entries(preferences || {}).slice(0, 3).map(([key, value]) => `- ${key}: ${value}`).join('\n') || '- Preferences learning...'}

Respond in a way that matches their personality and communication style. Use their personal context when relevant. Be helpful, accurate, and personalized. Respond in Korean unless specified otherwise.`;
  }

  private calculatePersonalizationLevel(context: any): number {
    const { personalityProfile, cues, behaviorPatterns } = context;
    
    let level = 0.3; // 기본 레벨
    
    if (personalityProfile?.type) level += 0.2;
    if (cues?.length > 0) level += Math.min(cues.length * 0.05, 0.3);
    if (behaviorPatterns?.length > 0) level += Math.min(behaviorPatterns.length * 0.02, 0.2);
    
    return Math.min(level, 1.0);
  }

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
  // 📊 공개 유틸리티 메서드들
  // ============================================================================
  
  public getAvailableModels(): any[] {
    return [
      {
        id: 'personalized-agent',
        name: 'Personalized Agent',
        available: true,
        recommended: true,
        type: 'hybrid',
        description: 'AI Passport 기반 개인화 모델'
      },
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        available: !!process.env.OPENAI_API_KEY,
        type: 'cloud',
        provider: 'openai'
      },
      {
        id: 'claude-3.5-sonnet',
        name: 'Claude 3.5 Sonnet',
        available: !!process.env.ANTHROPIC_API_KEY,
        type: 'cloud',
        provider: 'anthropic'
      },
      {
        id: 'llama3.2:3b',
        name: 'Llama 3.2 3B',
        available: true,
        type: 'local',
        provider: 'ollama',
        recommended: true
      }
    ];
  }

  public async getServiceStatus(): Promise<any> {
    return {
      openai: {
        configured: !!process.env.OPENAI_API_KEY,
        connected: !!this.openaiClient
      },
      anthropic: {
        configured: !!process.env.ANTHROPIC_API_KEY,
        connected: !!this.anthropicClient
      },
      ollama: {
        configured: true,
        connected: false // 실제 연결 상태는 별도 체크 필요
      }
    };
  }

  public async getChatHistory(options: {
    userId: string;
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    try {
      return await this.databaseService.getChatHistory(
        options.userId,
        undefined,
        options.limit || 20,
        options.offset || 0
      );
    } catch (error) {
      console.error('❌ 채팅 히스토리 조회 오류:', error);
      return [];
    }
  }
}