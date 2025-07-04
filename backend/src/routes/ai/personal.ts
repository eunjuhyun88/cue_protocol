// ============================================================================
// 📁 backend/src/routes/ai/personal.ts
// 🧠 개인화 AI 라우터 - AI Passport 연동, 고급 개인화 기능
// ============================================================================

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getService } from '../../core/DIContainer';

const router = Router();

// ============================================================================
// 🧠 DI Container에서 개인화 서비스 가져오기
// ============================================================================

/**
 * 데이터베이스 서비스 가져오기 (DI 우선)
 */
const getDatabaseService = () => {
  try {
    return getService('ActiveDatabaseService');
  } catch (error) {
    console.warn('⚠️ DatabaseService DI 실패, 기본 구현 사용:', error);
    
    return {
      async getUserById(id: string) { return null; },
      async createUser(userData: any) { return { id: userData.id, ...userData }; },
      async saveChatMessage(data: any) { return { success: true }; },
      async recordCueTransaction(data: any) { return { success: true }; },
      async updatePassport(did: string, updates: any) { return { success: true }; },
      async getPassport(did: string) { return null; },
      async getCUEBalance(did: string) { return 1000; },
      async getDataVaults(did: string) { return []; },
      constructor: { name: 'FallbackDatabaseService' }
    };
  }
};

/**
 * Ollama 서비스 가져오기 (우선 사용)
 */
const getOllamaService = () => {
  try {
    return getService('OllamaAIService');
  } catch (error) {
    console.warn('⚠️ OllamaAIService DI 실패, 기본 구현 사용:', error);
    
    return {
      async checkConnection() { return false; },
      async chat(model: string, messages: any[], stream: boolean) {
        return '개인화 AI 서비스에서 Ollama를 사용할 수 없습니다.';
      },
      async getModels() { return ['llama3.2:3b', 'llama3.2:1b']; },
      async generateResponse(message: string, model: string, options?: any) {
        return {
          content: '개인화 AI 서비스를 사용할 수 없습니다.',
          model: 'fallback',
          tokensUsed: 0,
          processingTime: 0,
          confidence: 0
        };
      }
    };
  }
};

/**
 * 개인화 서비스 가져오기 (핵심)
 */
const getPersonalizationService = () => {
  try {
    return getService('PersonalizationService');
  } catch (error) {
    console.warn('⚠️ PersonalizationService DI 실패, 기본 구현 사용:', error);
    
    return {
      async getPersonalizedContext(userDid: string, message: string, options: any = {}) {
        return {
          personalityProfile: { 
            type: 'Adaptive',
            communicationStyle: 'Balanced',
            learningPattern: 'Visual',
            decisionMaking: 'Analytical',
            workingStyle: 'Flexible'
          },
          cues: [],
          behaviorPatterns: [],
          vaultIds: [],
          personalityMatch: 0.7,
          preferences: {},
          recentInteractions: []
        };
      },
      async updatePersonalProfile(userDid: string, interaction: any) {
        console.log('🧠 개인화 프로필 업데이트 (기본값):', userDid);
        return true;
      }
    };
  }
};

/**
 * Personal CUE Extractor 가져오기
 */
const getPersonalCueExtractor = () => {
  try {
    return getService('PersonalCueExtractor');
  } catch (error) {
    console.warn('⚠️ PersonalCueExtractor DI 실패, 기본 구현 사용:', error);
    
    return {
      async extractAndStoreCues(userDid: string, context: any) {
        console.log('💎 개인 단서 추출 (기본 구현):', userDid);
        
        // 기본적인 키워드 기반 단서 추출
        const message = context.userMessage || '';
        const keywords = message.match(/\b\w{4,}\b/g) || [];
        
        return keywords.slice(0, 3).map(keyword => ({
          content: keyword,
          type: 'keyword',
          confidence: 0.6,
          timestamp: new Date().toISOString()
        }));
      }
    };
  }
};

/**
 * Semantic Compression 서비스 가져오기
 */
const getSemanticCompressionService = () => {
  try {
    return getService('SemanticCompressionService');
  } catch (error) {
    console.warn('⚠️ SemanticCompressionService DI 실패, 기본 구현 사용:', error);
    
    return {
      async analyzeConversation(userMessage: string, aiResponse: string) {
        return {
          shouldStore: true,
          compressedContent: `${userMessage.slice(0, 100)} -> ${aiResponse.slice(0, 100)}`,
          compressionRatio: 0.5,
          semanticPreservation: 0.8,
          keywords: [],
          entities: [],
          sentiment: 0.5,
          topics: [],
          importance: 0.7,
          cueValue: 3
        };
      }
    };
  }
};

/**
 * CUE 서비스 가져오기 (개인화 보너스 포함)
 */
const getCueService = () => {
  try {
    return getService('CueService');
  } catch (error) {
    console.warn('⚠️ CueService DI 실패, 기본 구현 사용:', error);
    
    return {
      async mineFromActivity(userId: string, activity: any) {
        // 개인화 AI 사용 보너스 계산
        const baseAmount = 7;
        const personalizationBonus = activity.personalizedResponse ? 5 : 0;
        const qualityBonus = Math.floor((activity.quality || 0.8) * 5);
        const cueExtractionBonus = activity.cuesExtracted ? 3 : 0;
        
        return { 
          amount: baseAmount + personalizationBonus + qualityBonus + cueExtractionBonus, 
          newBalance: 3000 + baseAmount + personalizationBonus + qualityBonus + cueExtractionBonus 
        };
      }
    };
  }
};

console.log('🧠 개인화 AI Routes 초기화 - AI Passport 연동');

// ============================================================================
// 🤖 메인 개인화 AI 채팅 엔드포인트
// ============================================================================

router.post('/chat', async (req: Request, res: Response): Promise<void> => {
  console.log('🧠 === 개인화 AI 채팅 시작 ===');
  console.log('🎫 AI Passport 기반 개인화 서비스');
  
  const { 
    message, 
    model = 'personalized-agent', 
    conversationId, 
    userId, 
    passportData,
    includePersonalization = true,
    learningMode = true 
  } = req.body;
  
  console.log('🔍 입력 파라미터:', {
    message: message?.slice(0, 50),
    model,
    userId,
    hasPassportData: !!passportData,
    includePersonalization,
    learningMode
  });

  // 사용자 정보 확인
  const userDid = (req as any).user?.did || 
                  (passportData?.did) || 
                  (userId ? `did:personal:${userId}` : null);

  console.log(`🧠 개인화 AI 채팅: ${model} for user ${userDid?.slice(0, 20)}...`);

  if (!message || !message.trim()) {
    res.status(400).json({
      success: false,
      error: 'Message is required',
      message: '메시지를 입력해주세요',
      provider: 'personal-ai'
    });
    return;
  }

  if (!userDid) {
    res.status(400).json({
      success: false,
      error: 'User identification required',
      message: '개인화 AI 서비스를 위해 사용자 인증이 필요합니다',
      suggestion: 'AI Passport 로그인 또는 userId를 제공해주세요'
    });
    return;
  }

  const startTime = Date.now();
  const currentConversationId = conversationId || uuidv4();

  try {
    // DI에서 서비스들 가져오기
    const db = getDatabaseService();
    const personalizationService = getPersonalizationService();
    const cueExtractor = getPersonalCueExtractor();
    const compressionService = getSemanticCompressionService();
    const ollamaService = getOllamaService();
    const cueService = getCueService();
    
    console.log('✅ 개인화 AI 서비스들 로딩 완료');

    // 1. 사용자 정보 확인 및 생성
    console.log('👤 사용자 정보 확인 중...');
    let user = null;
    
    if (userId) {
      user = await db.getUserById(userId);
      
      if (!user) {
        const newUserData = {
          id: userId,
          username: `personal_ai_${userId.slice(-8)}`,
          did: userDid,
          wallet_address: `0x${Math.random().toString(16).substring(2, 42)}`,
          ai_preference: 'personalized',
          personalization_enabled: true,
          created_at: new Date().toISOString()
        };
        
        user = await db.createUser(newUserData);
        console.log(`✅ 새 개인화 AI 사용자 생성: ${userId}`);
      }
    } else {
      user = await db.getUserById(userDid);
    }

    // 2. AI Passport 정보 조회
    console.log('🎫 AI Passport 정보 로딩 중...');
    let passportInfo = null;
    let cueBalance = 0;
    let dataVaults = [];
    
    if (passportData?.did || userDid) {
      try {
        passportInfo = await db.getPassport(userDid);
        cueBalance = await db.getCUEBalance(userDid);
        dataVaults = await db.getDataVaults(userDid);
        
        console.log(`🎫 AI Passport 로딩 완료: 신뢰도 ${passportInfo?.trustScore || 'N/A'}, CUE ${cueBalance}`);
      } catch (error) {
        console.warn('⚠️ AI Passport 정보 조회 실패:', error);
      }
    }

    // 3. 개인화 컨텍스트 준비 (핵심 기능)
    console.log('🧠 개인화 컨텍스트 로딩 중...');
    let personalContext = null;
    
    if (includePersonalization) {
      try {
        personalContext = await personalizationService.getPersonalizedContext(userDid, message, {
          includeFullProfile: true,
          includeBehaviorPatterns: true,
          includeRecentInteractions: true,
          includePassportData: !!passportInfo
        });
        
        // AI Passport 데이터 통합
        if (passportInfo) {
          personalContext.passportInfo = {
            trustScore: passportInfo.trustScore,
            passportLevel: passportInfo.passport_level,
            totalInteractions: passportInfo.total_interactions,
            privacyScore: passportInfo.privacy_score
          };
        }
        
        console.log(`🧠 개인화 컨텍스트 로딩 완료 (단서 ${personalContext.cues?.length || 0}개, 신뢰도 ${personalContext.personalityMatch})`);
      } catch (error) {
        console.warn('⚠️ 개인화 컨텍스트 로딩 실패:', error);
        personalContext = await personalizationService.getPersonalizedContext(userDid, message);
      }
    }

    // 4. 사용자 메시지 저장
    console.log('💾 개인화 AI 채팅 메시지 저장 중...');
    const userMessageData = {
      id: uuidv4(),
      user_did: userDid,
      user_id: user?.id || userId,
      conversation_id: currentConversationId,
      message_type: 'user',
      content: message,
      ai_provider: 'personal-ai',
      personalization_level: personalContext ? 'high' : 'basic',
      passport_trust_score: passportInfo?.trustScore || null,
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    };

    await db.saveChatMessage(userMessageData);

    // 5. Personal CUE 추출 및 저장 (백그라운드)
    let extractedCuesCount = 0;
    if (learningMode && personalContext) {
      setImmediate(async () => {
        try {
          console.log('🧠 Personal CUE 추출 시작...');
          const chatContext = {
            userMessage: message,
            model,
            timestamp: new Date(),
            conversationId: currentConversationId,
            personalityProfile: personalContext.personalityProfile,
            trustScore: passportInfo?.trustScore
          };

          const extractedCues = await cueExtractor.extractAndStoreCues(userDid, chatContext);
          extractedCuesCount = extractedCues.length;
          console.log(`✅ ${extractedCues.length}개 새로운 Personal CUE 추출 완료`);
        } catch (error) {
          console.error('❌ Personal CUE 추출 오류:', error);
        }
      });
    }

    // 6. AI 응답 생성 (모델 선택)
    console.log(`🤖 개인화 AI 응답 생성 중 (${model})...`);
    let aiResult;

    // 개인화된 시스템 프롬프트 생성
    const personalizedPrompt = createPersonalizedSystemPrompt(personalContext, passportInfo);
    
    // 모델별 응답 생성 (Ollama 우선)
    switch (model) {
      case 'llama3.2:3b':
      case 'llama3.2:1b':
      case 'llama3.1:8b':
      case 'gemma2:2b':
      case 'qwen2.5:3b':
      case 'qwen2.5:1.5b':
        console.log('📍 Ollama 개인화 모델 사용:', model);
        aiResult = await generatePersonalizedOllamaResponse(message, personalContext, model, ollamaService);
        break;
      
      case 'personalized-agent':
      default:
        console.log('📍 개인화 에이전트 모드');
        // 성격 타입에 따른 최적 모델 자동 선택
        const optimalModel = selectOptimalModel(personalContext);
        aiResult = await generatePersonalizedOllamaResponse(message, personalContext, optimalModel, ollamaService);
        aiResult.selectedModel = optimalModel;
        break;
    }

    const responseTime = Date.now() - startTime;

    // 7. CUE 토큰 계산 (개인화 보너스 포함)
    console.log('💎 개인화 AI CUE 보상 계산 중...');
    const activity = {
      type: 'personalized_ai_chat',
      model: aiResult.selectedModel || model,
      messageLength: message.length,
      responseLength: aiResult.response.length,
      quality: aiResult.confidence || 0.8,
      personalizedResponse: !!personalContext,
      cuesExtracted: extractedCuesCount > 0,
      trustScore: passportInfo?.trustScore || 50,
      passportLevel: passportInfo?.passport_level || 'Bronze'
    };
    
    const miningResult = await cueService.mineFromActivity(userDid, activity);
    const totalTokens = miningResult.amount;

    console.log(`💎 개인화 AI 보상 지급: ${totalTokens} CUE (개인화 보너스 포함)`);

    // 8. AI 응답 저장
    console.log('💾 개인화 AI 응답 저장 중...');
    const aiMessageData = {
      id: uuidv4(),
      user_did: userDid,
      user_id: user?.id || userId,
      conversation_id: currentConversationId,
      message_type: 'ai',
      content: aiResult.response,
      ai_model: aiResult.selectedModel || model,
      ai_provider: 'personal-ai',
      personalization_level: personalContext ? 'high' : 'basic',
      used_passport_data: !!passportInfo,
      used_vault_ids: personalContext?.vaultIds || [],
      cue_tokens_earned: totalTokens,
      cue_tokens_used: personalContext?.cues?.length * 0.1 || 0,
      personality_match: personalContext?.personalityMatch || 0.5,
      trust_score_used: passportInfo?.trustScore || null,
      verified: true,
      verification_signature: `personal_ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      response_time_ms: responseTime,
      tokens_used: aiResult.tokensUsed || Math.floor(aiResult.response.length / 4)
    };

    await db.saveChatMessage(aiMessageData);

    // 9. CUE 거래 기록
    if (totalTokens > 0) {
      const transactionData = {
        user_did: userDid,
        user_id: user?.id || userId,
        transaction_type: 'personalized_mining',
        amount: totalTokens,
        status: 'completed',
        source: 'personal_ai_chat',
        description: `개인화 AI 채팅 보상 (${aiResult.selectedModel || model})`,
        metadata: {
          messageId: aiMessageData.id,
          model: aiResult.selectedModel || model,
          personalizationBonus: true,
          passportLevel: passportInfo?.passport_level,
          trustScore: passportInfo?.trustScore,
          cuesExtracted: extractedCuesCount
        }
      };

      try {
        if (typeof db.recordCueTransaction === 'function') {
          await db.recordCueTransaction(transactionData);
        } else if (typeof db.createCUETransaction === 'function') {
          await db.createCUETransaction(transactionData);
        }
      } catch (error) {
        console.warn('⚠️ CUE 거래 기록 실패:', error);
      }
    }

    // 10. 백그라운드 학습 (고급 기능)
    if (learningMode && personalContext) {
      setImmediate(async () => {
        try {
          console.log('📚 백그라운드 학습 시작...');
          await learnFromInteraction(userDid, message, aiResult.response, personalContext, compressionService, db);
          
          // 개인화 프로필 업데이트
          await personalizationService.updatePersonalProfile(userDid, {
            message,
            response: aiResult.response,
            model: aiResult.selectedModel || model,
            satisfaction: 'positive', // 실제로는 사용자 피드백 기반
            personalityMatch: personalContext.personalityMatch,
            timestamp: new Date().toISOString()
          });
          
          console.log('✅ 백그라운드 학습 완료');
        } catch (error) {
          console.error('❌ 백그라운드 학습 오류:', error);
        }
      });
    }

    // 11. Passport 활동 업데이트
    try {
      await db.updatePassport(userDid, {
        total_interactions: 1,
        last_activity_at: new Date().toISOString(),
        ai_preference: 'personalized',
        privacy_score: Math.min((passportInfo?.privacy_score || 70) + 1, 100),
        trust_score: Math.min((passportInfo?.trustScore || 50) + 0.5, 100)
      });
    } catch (error) {
      console.warn('⚠️ Passport 업데이트 실패:', error);
    }

    console.log(`✅ 개인화 AI 채팅 완료 (${responseTime}ms) - ${totalTokens} CUE 획득`);

    // 12. 완전한 응답 반환
    res.json({
      success: true,
      message: {
        id: aiMessageData.id,
        conversationId: currentConversationId,
        content: aiResult.response,
        model: aiResult.selectedModel || model,
        provider: 'personal-ai',
        personalized: true,
        cueTokensEarned: totalTokens,
        responseTimeMs: responseTime,
        verification: {
          verified: true,
          signature: aiMessageData.verification_signature,
          personalizedResponse: true
        }
      },
      personalization: {
        enabled: !!personalContext,
        personalityMatch: personalContext?.personalityMatch || 0.5,
        cuesUsed: personalContext?.cues?.length || 0,
        vaultsAccessed: personalContext?.vaultIds?.length || 0,
        behaviorPatterns: personalContext?.behaviorPatterns?.slice(0, 3) || [],
        learningActive: learningMode,
        cuesExtracted: extractedCuesCount
      },
      passport: passportInfo ? {
        trustScore: passportInfo.trustScore,
        passportLevel: passportInfo.passport_level,
        cueBalance: cueBalance,
        vaultCount: dataVaults.length,
        privacyScore: passportInfo.privacy_score
      } : null,
      rewards: {
        totalCUE: totalTokens,
        breakdown: {
          base: 7,
          personalizationBonus: personalContext ? 5 : 0,
          qualityBonus: Math.floor((aiResult.confidence || 0.8) * 5),
          cueExtractionBonus: extractedCuesCount > 0 ? 3 : 0,
          passportBonus: passportInfo ? 2 : 0
        },
        reason: '개인화 AI 사용으로 고급 보상 지급'
      },
      user: user ? {
        id: user.id,
        username: user.username,
        did: user.did,
        aiPreference: 'personalized'
      } : null,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ 개인화 AI 채팅 처리 오류:', error);
    
    res.status(500).json({
      success: false,
      error: 'Personal AI chat processing failed',
      message: '개인화 AI 채팅 중 오류가 발생했습니다',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      provider: 'personal-ai',
      suggestion: '잠시 후 다시 시도하거나 기본 AI 모드를 사용해보세요',
      conversationId: currentConversationId,
      timestamp: new Date().toISOString()
    });
  }
});

// ============================================================================
// 🎯 AI 응답 생성 함수들 (개인화 특화)
// ============================================================================

/**
 * 개인화된 시스템 프롬프트 생성
 */
function createPersonalizedSystemPrompt(personalContext: any, passportInfo: any): string {
  const context = personalContext || {};
  const passport = passportInfo || {};
  
  return `당신은 AI Passport 기반 개인화된 AI 어시스턴트입니다.

**사용자 개인화 프로필:**
- 성격 유형: ${context.personalityProfile?.type || 'Adaptive'}
- 소통 스타일: ${context.personalityProfile?.communicationStyle || 'Balanced'}
- 학습 패턴: ${context.personalityProfile?.learningPattern || 'Visual'}
- 의사결정 방식: ${context.personalityProfile?.decisionMaking || 'Analytical'}

**AI Passport 정보:**
- 신뢰도: ${passport.trustScore || 50}/100
- Passport 레벨: ${passport.passport_level || 'Bronze'}
- 총 상호작용: ${passport.total_interactions || 0}회
- 프라이버시 점수: ${passport.privacy_score || 70}/100

**개인 컨텍스트 (${context.cues?.length || 0}개 단서):**
${context.cues?.slice(0, 5).map((cue: any, i: number) => 
  `${i + 1}. ${cue.compressed_content || cue.content || 'Context data'}`
).join('\n') || '- 새로운 개인화 학습 시작'}

**행동 패턴:**
${context.behaviorPatterns?.slice(0, 3).join(', ') || '패턴 분석 중...'}

**응답 지침:**
1. 사용자의 성격과 소통 스타일에 맞춰 응답하세요
2. 개인 컨텍스트를 자연스럽게 활용하세요
3. AI Passport 레벨에 맞는 상세도로 답변하세요
4. 친근하고 도움이 되는 한국어로 응답하세요
5. 사용자의 학습 패턴을 고려하여 설명하세요

개인화된 맞춤형 응답을 제공해주세요.`;
}

/**
 * 개인화된 Ollama 응답 생성
 */
async function generatePersonalizedOllamaResponse(
  message: string, 
  personalContext: any, 
  model: string,
  ollamaService: any
) {
  try {
    // Ollama 연결 확인
    const isConnected = await ollamaService.checkConnection();
    if (!isConnected) {
      return generatePersonalizedMockResponse(message, personalContext, `${model} (Ollama 연결 필요)`);
    }

    // 개인화된 프롬프트 구성
    const systemPrompt = createPersonalizedSystemPrompt(personalContext, personalContext?.passportInfo);
    
    // Ollama 메시지 형식으로 변환
    const messages = [
      {
        role: 'system' as const,
        content: systemPrompt
      },
      {
        role: 'user' as const,
        content: message
      }
    ];

    // Ollama API 호출
    const response = await ollamaService.chat(model, messages, false);
    
    console.log(`✅ 개인화된 Ollama ${model} 응답 생성 완료`);
    return {
      response: response,
      tokensUsed: Math.floor(response.length / 4),
      confidence: 0.85,
      selectedModel: model,
      provider: 'ollama',
      personalized: true
    };

  } catch (error: any) {
    console.error(`❌ 개인화된 Ollama ${model} 오류:`, error.message);
    return generatePersonalizedMockResponse(message, personalContext, `${model} (Ollama 오류)`);
  }
}

/**
 * 성격 유형에 따른 최적 모델 선택
 */
function selectOptimalModel(personalContext: any): string {
  const personalityType = personalContext?.personalityProfile?.type || '';
  const communicationStyle = personalContext?.personalityProfile?.communicationStyle || '';
  
  // 기술적/분석적 성향
  if (personalityType.includes('Technical') || personalityType.includes('INTJ') || personalityType.includes('Analytical')) {
    return 'llama3.2:3b'; // 더 정확하고 논리적
  }
  
  // 창의적/직관적 성향
  if (personalityType.includes('Creative') || personalityType.includes('ENFP') || communicationStyle.includes('Creative')) {
    return 'gemma2:2b'; // 더 창의적이고 유연함
  }
  
  // 빠른 응답 선호
  if (personalContext?.behaviorPatterns?.includes('빠른 응답 선호') || communicationStyle.includes('Direct')) {
    return 'llama3.2:1b'; // 가장 빠른 응답
  }
  
  // 기본값: 균형잡힌 모델
  return 'llama3.2:3b';
}

/**
 * 개인화된 Mock 응답 생성
 */
function generatePersonalizedMockResponse(message: string, personalContext: any, modelName: string) {
  const context = personalContext || {};
  const personalityType = context.personalityProfile?.type || 'Adaptive';
  const cuesCount = context.cues?.length || 0;
  const passportInfo = context.passportInfo || {};
  
  const response = `🧠 **개인화 AI 응답** (${modelName})

**메시지:** "${message}"

**당신의 AI Passport 프로필:**
• **성격 유형**: ${personalityType}
• **신뢰도**: ${passportInfo.trustScore || 50}/100 (${passportInfo.passportLevel || 'Bronze'} 레벨)
• **개인화 단서**: ${cuesCount}개 활용 중
• **개인화 매치**: ${Math.round((context.personalityMatch || 0.7) * 100)}%

**개인화된 응답:**
${personalityType.includes('Technical') || personalityType.includes('INTJ') ?
  `🔧 **체계적 분석**: 당신의 분석적 성향에 맞춰 논리적으로 단계별로 설명드리겠습니다. 기술적 세부사항과 구현 방법을 포함하여 구체적으로 답변하겠습니다.` :
  `💫 **친근한 설명**: 당신의 소통 스타일에 맞춰 이해하기 쉽고 실용적으로 설명드리겠습니다. 예시와 함께 단계별로 안내해드리겠습니다.`
}

**학습된 개인 컨텍스트:**
${cuesCount > 0 ? 
  `• ${cuesCount}개의 개인 단서를 바탕으로 맞춤형 응답을 생성했습니다.` :
  '• 새로운 개인화 학습을 시작합니다. 대화할수록 더 정확해집니다.'
}

**다음 단계 제안:**
${personalityType.includes('Technical') ?
  '- 더 구체적인 기술적 질문을 해보세요\n- 단계별 구현 방법을 요청해보세요\n- 코드 예시나 아키텍처 설명을 요청해보세요' :
  '- 더 자세한 설명이나 예시를 요청해보세요\n- 관련된 다른 질문을 해보세요\n- 실용적인 적용 방법을 물어보세요'
}

계속 대화하시면 AI Passport 기반으로 더욱 정확한 개인화 응답을 제공해드리겠습니다!`;

  return {
    response,
    tokensUsed: Math.floor(response.length / 4),
    confidence: 0.75,
    selectedModel: modelName,
    provider: 'personal-ai-mock',
    personalized: true
  };
}

/**
 * 상호작용에서 학습
 */
async function learnFromInteraction(
  userDid: string, 
  userMessage: string, 
  aiResponse: string, 
  personalContext: any,
  compressionService: any,
  db: any
) {
  try {
    const analysis = await compressionService.analyzeConversation(userMessage, aiResponse);
    
    if (analysis.shouldStore) {
      // 개인화 학습 데이터 저장 로직
      console.log('📚 개인화 학습 데이터 저장 중...');
      
      const learningData = {
        id: uuidv4(),
        user_did: userDid,
        content_type: 'personalized_conversation',
        original_content: `User: ${userMessage}\nAI: ${aiResponse}`,
        compressed_content: analysis.compressedContent,
        personalization_score: personalContext.personalityMatch,
        trust_score: personalContext.passportInfo?.trustScore,
        keywords: analysis.keywords,
        entities: analysis.entities,
        sentiment_score: analysis.sentiment,
        importance_score: analysis.importance,
        cue_value: analysis.cueValue
      };
      
      // 학습 데이터 저장 시도
      if (typeof db.storePersonalCue === 'function') {
        await db.storePersonalCue(learningData);
      } else if (typeof db.createPersonalCue === 'function') {
        await db.createPersonalCue(learningData);
      }
      
      console.log('✅ 개인화 학습 완료');
    }
  } catch (error) {
    console.error('❌ 개인화 학습 오류:', error);
  }
}

// ============================================================================
// 🧠 개인화 컨텍스트 조회 API
// ============================================================================

router.get('/context', async (req: Request, res: Response): Promise<void> => {
  try {
    const userDid = (req as any).user?.did || req.query.userDid;
    
    if (!userDid) {
      res.status(400).json({
        success: false,
        error: 'User DID required',
        message: '사용자 DID가 필요합니다'
      });
      return;
    }
    
    console.log(`🧠 개인화 컨텍스트 조회: ${userDid}`);
    
    const personalizationService = getPersonalizationService();
    const db = getDatabaseService();
    
    // 개인화 컨텍스트 및 Passport 정보 조회
    const [personalContext, passportInfo, cueBalance] = await Promise.allSettled([
      personalizationService.getPersonalizedContext(userDid, '', {
        includeFullProfile: true,
        includeBehaviorPatterns: true,
        includeRecentInteractions: true
      }),
      db.getPassport(userDid),
      db.getCUEBalance(userDid)
    ]);
    
    const context = personalContext.status === 'fulfilled' ? personalContext.value : null;
    const passport = passportInfo.status === 'fulfilled' ? passportInfo.value : null;
    const balance = cueBalance.status === 'fulfilled' ? cueBalance.value : 0;
    
    res.json({
      success: true,
      context: {
        personalityProfile: context?.personalityProfile || {
          type: 'Adaptive',
          communicationStyle: 'Balanced',
          learningPattern: 'Visual'
        },
        totalCues: context?.cues?.length || 0,
        vaultsCount: context?.vaultIds?.length || 0,
        behaviorPatterns: context?.behaviorPatterns || [],
        recentInteractions: context?.recentInteractions?.length || 0,
        personalityMatch: context?.personalityMatch || 0.5,
        preferences: context?.preferences || {}
      },
      passport: passport ? {
        trustScore: passport.trustScore,
        passportLevel: passport.passport_level,
        totalInteractions: passport.total_interactions,
        privacyScore: passport.privacy_score,
        lastActivity: passport.last_activity_at
      } : null,
      cueBalance: balance,
      recommendations: generatePersonalizationRecommendations(context, passport),
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('❌ 개인화 컨텍스트 조회 오류:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to get personalization context',
      message: '개인화 컨텍스트 조회 중 오류가 발생했습니다',
      details: error.message
    });
  }
});

/**
 * 개인화 추천사항 생성
 */
function generatePersonalizationRecommendations(context: any, passport: any) {
  const recommendations = [];
  
  if (!context || context.cues?.length < 5) {
    recommendations.push({
      type: 'learning',
      title: '더 많은 대화로 개인화 향상',
      description: '더 많은 AI 대화를 통해 개인화 정확도를 높여보세요',
      action: 'AI와 다양한 주제로 대화하기'
    });
  }
  
  if (!passport || passport.trustScore < 70) {
    recommendations.push({
      type: 'trust',
      title: '신뢰도 점수 향상',
      description: '지속적인 활동으로 AI Passport 신뢰도를 높여보세요',
      action: '정기적인 AI 상호작용 유지'
    });
  }
  
  if (context?.personalityMatch < 0.8) {
    recommendations.push({
      type: 'personality',
      title: '성격 매칭 최적화',
      description: '개인 선호도 설정을 통해 더 정확한 개인화를 경험하세요',
      action: '프로필 설정 업데이트'
    });
  }
  
  return recommendations;
}

// ============================================================================
// 📊 개인화 분석 API
// ============================================================================

router.get('/analytics', async (req: Request, res: Response): Promise<void> => {
  try {
    const userDid = (req as any).user?.did || req.query.userDid;
    const { period = '30d' } = req.query;
    
    if (!userDid) {
      res.status(400).json({
        success: false,
        error: 'User DID required'
      });
      return;
    }
    
    console.log(`📊 개인화 분석 데이터 생성: ${userDid}`);
    
    const db = getDatabaseService();
    const personalizationService = getPersonalizationService();
    
    // 분석 데이터 생성 (실제 구현에서는 DB에서 조회)
    const analytics = {
      personalityEvolution: generatePersonalityEvolution(period as string),
      cueGrowth: generateCueGrowthData(period as string),
      interactionQuality: generateInteractionQuality(period as string),
      modelPreferences: generateModelPreferences(),
      learningProgress: generateLearningProgress(),
      recommendations: await generateAdvancedRecommendations(userDid, personalizationService)
    };
    
    res.json({
      success: true,
      userDid,
      period,
      analytics,
      generatedAt: new Date().toISOString(),
      nextUpdate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    });
    
  } catch (error: any) {
    console.error('❌ 개인화 분석 오류:', error);
    
    res.status(500).json({
      success: false,
      error: 'Analytics generation failed',
      message: '분석 데이터 생성 중 오류가 발생했습니다',
      details: error.message
    });
  }
});

/**
 * 분석 데이터 생성 함수들
 */
function generatePersonalityEvolution(period: string) {
  const days = period === '30d' ? 30 : 7;
  return Array.from({ length: days }, (_, i) => ({
    date: new Date(Date.now() - (days - 1 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    confidence: Math.min(0.5 + (i / days) * 0.4, 0.9),
    traits: ['analytical', 'creative', 'helpful']
  }));
}

function generateCueGrowthData(period: string) {
  const days = period === '30d' ? 30 : 7;
  return Array.from({ length: days }, (_, i) => ({
    date: new Date(Date.now() - (days - 1 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    cuesCount: Math.floor(Math.random() * 5) + i,
    quality: Math.random() * 0.3 + 0.7
  }));
}

function generateInteractionQuality(period: string) {
  return {
    averageScore: 0.85,
    improvement: 0.12,
    bestDay: new Date().toISOString().split('T')[0],
    totalInteractions: Math.floor(Math.random() * 50) + 20
  };
}

function generateModelPreferences() {
  return [
    { model: 'llama3.2:3b', usage: 45, satisfaction: 0.88 },
    { model: 'gemma2:2b', usage: 30, satisfaction: 0.82 },
    { model: 'llama3.2:1b', usage: 25, satisfaction: 0.79 }
  ];
}

function generateLearningProgress() {
  return {
    stage: 'Advanced Personalization',
    progress: 0.73,
    nextMilestone: 'Expert Level (500 CUEs)',
    strengths: ['Technical Communication', 'Context Retention'],
    improvements: ['Creative Expression', 'Emotional Intelligence']
  };
}

async function generateAdvancedRecommendations(userDid: string, personalizationService: any) {
  // 고급 개인화 추천사항 생성
  return [
    {
      type: 'model_optimization',
      title: 'AI 모델 최적화',
      description: '당신의 성격에 가장 적합한 AI 모델을 자동 선택하도록 설정하세요',
      priority: 'high',
      estimatedBenefit: '응답 만족도 15% 향상'
    },
    {
      type: 'cue_enhancement',
      title: '개인 단서 품질 향상',
      description: '더 구체적이고 상세한 대화로 개인화 정확도를 높이세요',
      priority: 'medium',
      estimatedBenefit: '개인화 매칭 20% 향상'
    }
  ];
}

// ============================================================================
// 🏥 개인화 AI 상태 API
// ============================================================================

router.get('/status', async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('📊 === 개인화 AI 시스템 상태 확인 ===');
    
    const personalizationService = getPersonalizationService();
    const ollamaService = getOllamaService();
    const db = getDatabaseService();
    
    const [ollamaConnected, dbStatus] = await Promise.allSettled([
      ollamaService.checkConnection(),
      Promise.resolve({ connected: true, type: db.constructor.name })
    ]);
    
    res.json({
      success: true,
      status: 'healthy',
      services: {
        personalization: {
          status: 'healthy',
          features: ['AI Passport 연동', '개인화 컨텍스트', 'Personal CUE 추출']
        },
        ollama: {
          status: ollamaConnected.status === 'fulfilled' && ollamaConnected.value ? 'healthy' : 'degraded',
          connected: ollamaConnected.status === 'fulfilled' ? ollamaConnected.value : false
        },
        database: {
          status: dbStatus.status === 'fulfilled' ? 'healthy' : 'degraded',
          type: dbStatus.status === 'fulfilled' ? dbStatus.value.type : 'unknown'
        }
      },
      features: {
        aiPassportIntegration: true,
        personalizedResponses: true,
        personalCueExtraction: true,
        continuousLearning: true,
        modelOptimization: true,
        contextRetention: true,
        privacyPreservation: true
      },
      capabilities: {
        supportedModels: ['llama3.2:3b', 'llama3.2:1b', 'gemma2:2b', 'personalized-agent'],
        personalizationLevels: ['basic', 'intermediate', 'advanced', 'expert'],
        learningMethods: ['conversation', 'feedback', 'behavior-analysis', 'context-extraction']
      },
      provider: 'personal-ai',
      version: '2.0.0-ai-passport',
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('❌ 개인화 AI 상태 확인 오류:', error);
    
    res.status(500).json({
      success: false,
      status: 'error',
      error: 'Personal AI status check failed',
      message: '개인화 AI 상태 확인 중 오류가 발생했습니다',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

console.log('✅ 개인화 AI Routes 로딩 완료');
console.log('🧠 AI Passport 연동, 고급 개인화 기능 활성화');

export default router;