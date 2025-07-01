// ============================================================================
// 📁 src/services/api/ChatAPI.ts
// 💬 AI 채팅 API 서비스
// ============================================================================

import { BackendAPIClient } from './BackendAPIClient';
import type { ChatResponse } from '../../types/chat.types';
import type { UnifiedAIPassport } from '../../types/passport.types';

export class ChatAPI extends BackendAPIClient {
  /**
   * AI 채팅 메시지 전송
   */
  async sendChatMessage(
    message: string,
    model: string,
    passportData?: UnifiedAIPassport
  ): Promise<ChatResponse> {
    try {
      const response = await this.post('/api/ai/chat', {
        message,
        model,
        passportData,
        userId: passportData?.did || 'anonymous',
        timestamp: new Date().toISOString(),
      });

      return response;
    } catch (error) {
      console.error('채팅 메시지 전송 실패:', error);
      throw error;
    }
  }

  /**
   * 채팅 히스토리 조회
   */
  async getChatHistory(userDid: string): Promise<any[]> {
    try {
      return await this.get(`/api/ai/chat/history/${userDid}`);
    } catch (error) {
      console.error('채팅 히스토리 조회 실패:', error);
      throw error;
    }
  }

  /**
   * 사용 가능한 AI 모델 목록 조회
   */
  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await this.get('/api/ai/models');
      return response.models || [];
    } catch (error) {
      console.warn('모델 목록 조회 실패, 기본 모델 사용:', error);
      return ['gpt-4', 'claude-3', 'gemini-pro'];
    }
  }

  /**
   * Mock AI 응답 생성
   */
  generateMockResponse(
    message: string,
    model: string,
    personalityProfile?: any,
    cues: any[] = [],
    behaviorPatterns: string[] = []
  ): ChatResponse {
    // 메시지 타입 분석
    const isQuestion = /\?|how|what|why|when|where|어떻게|무엇|왜|언제|어디/.test(message.toLowerCase());
    const isTechnical = /code|api|algorithm|system|data|programming|개발|시스템|알고리즘/.test(message.toLowerCase());
    const isHelp = /help|도움|지원|support/.test(message.toLowerCase());
    const isGreeting = /hello|hi|hey|안녕|안녕하세요/.test(message.toLowerCase());

    let responseType: 'greeting' | 'question' | 'technical' | 'help' | 'general' = 'general';
    if (isGreeting) responseType = 'greeting';
    else if (isQuestion) responseType = 'question';
    else if (isTechnical) responseType = 'technical';
    else if (isHelp) responseType = 'help';

    const modelName = model === 'gpt-4' ? 'GPT-4' : 
                     model === 'claude-3' ? 'Claude 3' : 
                     model === 'gemini-pro' ? 'Gemini Pro' : 'AI Assistant';

    const responses = {
      greeting: `**${modelName}** 안녕하세요! 👋

반갑습니다! AI Passport 시스템의 개인화된 어시스턴트입니다.

**당신의 프로필:**
• **성격 유형**: ${personalityProfile?.type || 'Learning...'}
• **소통 스타일**: ${personalityProfile?.communicationStyle || 'Adaptive'}
• **개인 컨텍스트**: ${cues.length}개 활용 가능

궁금한 것이 있으시면 언제든 말씀해주세요!`,

      question: `**${modelName}** 질문 응답 🤔

"${message}"

이 질문에 대해 당신의 **${personalityProfile?.type || 'Adaptive'}** 성격과 학습 패턴을 고려하여 답변드리겠습니다.

**개인화 적용:**
• **학습 방식**: ${personalityProfile?.learningPattern || 'Visual'} 
• **의사결정**: ${personalityProfile?.decisionMaking || 'Analytical'}
• **관련 컨텍스트**: ${cues.length}개 활용

더 구체적인 정보가 필요하시면 언제든 추가 질문해주세요!`,

      technical: `**${modelName}** 기술 분석 🔧

**분석 대상:** "${message}"

**개인화된 기술 접근:**
• **기술 성향**: ${personalityProfile?.type?.includes('Technical') ? 'High (상세 분석)' : 'Moderate (이해 중심)'}
• **학습 패턴**: ${personalityProfile?.learningPattern || 'Visual'} 방식 적용
• **응답 선호도**: ${personalityProfile?.responsePreference || 'Balanced'}

더 구체적인 기술적 질문이나 코드 예제가 필요하시면 말씀해주세요!`,

      help: `**${modelName}** 맞춤형 지원 🆘

"${message}"에 대한 도움을 요청하셨습니다.

**당신의 프로필 기반 지원 전략:**
• **성격 유형**: ${personalityProfile?.type || 'Adaptive'} - 맞춤형 접근
• **소통 방식**: ${personalityProfile?.communicationStyle || 'Balanced'}
• **작업 스타일**: ${personalityProfile?.workingStyle || 'Flexible'}

어떤 구체적인 도움이 필요하신지 알려주시면 더 정확한 지원을 제공하겠습니다!`,

      general: `**${modelName}** 응답 💭

"${message}"

당신의 개인화 프로필을 기반으로 응답드리겠습니다.

**적용된 개인화:**
• **성격**: ${personalityProfile?.type || 'Adaptive'}
• **컨텍스트**: ${cues.length}개 데이터 활용
• **패턴**: ${behaviorPatterns?.slice(0, 2).join(', ') || '분석 중...'}

추가 질문이나 더 자세한 설명이 필요하시면 언제든 말씀해주세요!`
    };

    return {
      message: responses[responseType],
      model: modelName,
      tokensUsed: Math.floor(Math.random() * 500) + 100,
      cueEarned: Math.floor(Math.random() * 5) + 1,
      processingTime: Math.floor(Math.random() * 2000) + 500,
    };
  }
}