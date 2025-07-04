// ============================================================================
// 📁 backend/src/routes/ai/chat.ts
// 🤖 AI 채팅 라우터 - DI 패턴 적용 (대폭 간소화)
// ============================================================================

import { Router, Request, Response } from 'express';
import { getService } from '../../core/DIContainer';
import { authMiddleware } from '../../middleware/authMiddleware';

const router = Router();

// DI에서 서비스 가져오기
const getAIService = () => getService('AIService');
const getPersonalizationService = () => getService('PersonalizationService');
const getCueService = () => getService('CueService');
const getPersonalCueExtractor = () => getService('PersonalCueExtractor');
const getSemanticCompressionService = () => getService('SemanticCompressionService');

// ============================================================================
// 🤖 AI 채팅 API (인증 필요)
// ============================================================================

router.post('/chat', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  console.log('🤖 === AI 채팅 요청 ===');
  
  try {
    const { 
      message, 
      model = 'gpt-4', 
      includeContext = true,
      temperature = 0.7,
      maxTokens = 1000
    } = req.body;
    
    const user = (req as any).user;
    
    if (!message || message.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: '메시지가 필요합니다'
      });
      return;
    }
    
    console.log(`📝 사용자: ${user.username || user.id}, 모델: ${model}`);
    
    // DI 서비스들 사용
    const aiService = getAIService();
    const personalizationService = getPersonalizationService();
    const cueService = getCueService();
    const cueExtractor = getPersonalCueExtractor();
    
    // 개인화 컨텍스트 가져오기
    let personalizationContext = null;
    if (includeContext) {
      personalizationContext = await personalizationService.getPersonalizationContext(user.did);
      console.log(`🧠 개인화 컨텍스트 로드: ${personalizationContext?.cues?.length || 0}개 단서`);
    }
    
    // AI 응답 생성
    const startTime = Date.now();
    const aiResponse = await aiService.generateResponse(
      message,
      model,
      personalizationContext,
      user.did,
      { temperature, maxTokens }
    );
    const processingTime = Date.now() - startTime;
    
    console.log(`✅ AI 응답 생성 완료 (${processingTime}ms)`);
    
    // 대화에서 개인 단서 추출 (백그라운드)
    try {
      const conversationData = {
        userMessage: message,
        aiResponse: aiResponse.content,
        timestamp: new Date().toISOString(),
        model,
        context: personalizationContext
      };
      
      const extractedCues = await cueExtractor.extractFromConversation(conversationData, user.did);
      console.log(`🔍 새로운 개인 단서 추출: ${extractedCues.length}개`);
      
      // CUE 토큰 지급 (품질 기반)
      const baseReward = 5;
      const qualityBonus = Math.floor(aiResponse.qualityScore * 10);
      const contextBonus = personalizationContext ? 3 : 0;
      const totalReward = baseReward + qualityBonus + contextBonus;
      
      await cueService.awardTokens(user.did, totalReward, 'ai_chat', {
        messageLength: message.length,
        responseLength: aiResponse.content.length,
        qualityScore: aiResponse.qualityScore,
        usedContext: !!personalizationContext,
        extractedCues: extractedCues.length
      });
      
      console.log(`💰 CUE 토큰 지급: ${totalReward}개 (품질: ${qualityBonus}, 컨텍스트: ${contextBonus})`);
      
    } catch (cueError) {
      console.warn('⚠️ 개인 단서 추출 실패:', cueError);
    }
    
    // 응답 반환
    res.json({
      success: true,
      response: aiResponse.content,
      model: aiResponse.model,
      provider: aiResponse.provider,
      personalizationLevel: aiResponse.personalizationLevel,
      qualityScore: aiResponse.qualityScore,
      usedData: aiResponse.usedData,
      cueReward: baseReward + qualityBonus + contextBonus,
      tokensUsed: aiResponse.tokensUsed,
      processingTime,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('💥 AI 채팅 오류:', error);
    res.status(500).json({
      success: false,
      error: 'AI chat failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ============================================================================
// 🎯 AI 모델 관리 API
// ============================================================================

router.get('/models', async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('📋 === AI 모델 목록 조회 ===');
    
    // DI 서비스 사용
    const aiService = getAIService();
    const models = await aiService.getAvailableModels();
    
    res.json({
      success: true,
      models: models.map(model => ({
        id: model.id,
        name: model.name,
        provider: model.provider,
        type: model.type,
        available: model.available,
        recommended: model.recommended || false,
        description: model.description,
        maxTokens: model.maxTokens,
        contextWindow: model.contextWindow
      })),
      totalModels: models.length,
      availableModels: models.filter(m => m.available).length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('💥 모델 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get models',
      message: error.message
    });
  }
});

// 모델 상태 확인
router.get('/models/:modelId/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const { modelId } = req.params;
    
    // DI 서비스 사용
    const aiService = getAIService();
    const status = await aiService.getModelStatus(modelId);
    
    res.json({
      success: true,
      modelId,
      status,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('💥 모델 상태 확인 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get model status',
      message: error.message
    });
  }
});

// ============================================================================
// 🧠 개인화 관리 API
// ============================================================================

router.get('/personalization/profile', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    console.log(`🧠 === 개인화 프로필 조회: ${user.did} ===`);
    
    // DI 서비스 사용
    const personalizationService = getPersonalizationService();
    const profile = await personalizationService.getPersonalityProfile(user.did);
    
    res.json({
      success: true,
      profile,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('💥 개인화 프로필 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get personalization profile',
      message: error.message
    });
  }
});

router.get('/personalization/context', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    console.log(`🧠 === 개인화 컨텍스트 조회: ${user.did} ===`);
    
    // DI 서비스 사용
    const personalizationService = getPersonalizationService();
    const context = await personalizationService.getPersonalizationContext(user.did);
    
    res.json({
      success: true,
      context: {
        personalityProfile: context?.personalityProfile,
        cuesCount: context?.cues?.length || 0,
        vaultCount: context?.vaultIds?.length || 0,
        personalityMatch: context?.personalityMatch || 0,
        behaviorPatterns: context?.behaviorPatterns || [],
        preferences: context?.preferences || {}
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('💥 개인화 컨텍스트 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get personalization context',
      message: error.message
    });
  }
});

// ============================================================================
// 🔧 대화 기록 관리 API
// ============================================================================

router.get('/history', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { page = 1, limit = 20 } = req.query;
    
    console.log(`📖 === 대화 기록 조회: ${user.did} ===`);
    
    // DI 서비스 사용
    const aiService = getAIService();
    const history = await aiService.getChatHistory(user.did, {
      page: parseInt(page as string),
      limit: parseInt(limit as string)
    });
    
    res.json({
      success: true,
      history,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: history.length
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('💥 대화 기록 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get chat history',
      message: error.message
    });
  }
});

// ============================================================================
// 🔍 시스템 상태 API
// ============================================================================

router.get('/status', async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('🔍 === AI 시스템 상태 확인 ===');
    
    // DI 서비스들 상태 확인
    const aiService = getAIService();
    const personalizationService = getPersonalizationService();
    const cueService = getCueService();
    
    const status = {
      ai: await aiService.getStatus(),
      personalization: await personalizationService.getStatus(),
      cue: await cueService.getStatus(),
      features: {
        aiChat: true,
        personalization: true,
        cueRewards: true,
        multiModel: true,
        contextLearning: true
      },
      timestamp: new Date().toISOString()
    };
    
    res.json({
      success: true,
      status,
      message: 'AI 시스템이 정상 작동 중입니다'
    });
    
  } catch (error) {
    console.error('💥 AI 시스템 상태 확인 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get AI system status',
      message: error.message
    });
  }
});

// 사용 가이드
router.get('/guide', (req: Request, res: Response): void => {
  res.json({
    success: true,
    service: 'AI 채팅 서비스',
    version: '3.0 (DI 적용)',
    
    features: {
      core: [
        '✅ 멀티 모델 지원 (GPT-4, Claude, Ollama)',
        '✅ 개인화 컨텍스트 학습',
        '✅ 실시간 CUE 토큰 마이닝',
        '✅ 품질 기반 보상 시스템',
        '✅ 대화 기록 관리'
      ],
      personalization: [
        '🧠 개인 성격 프로필 학습',
        '🧠 대화 패턴 분석',
        '🧠 선호도 학습 및 적용',
        '🧠 컨텍스트 기반 응답 생성'
      ],
      mining: [
        '💰 대화 참여 기본 보상',
        '💰 응답 품질 기반 보너스',
        '💰 개인화 컨텍스트 사용 보너스',
        '💰 개인 단서 추출 보너스'
      ]
    },
    
    endpoints: {
      chat: {
        'POST /chat': 'AI 채팅 (인증 필요)',
        'GET /models': '사용 가능한 모델 목록',
        'GET /models/:id/status': '특정 모델 상태',
        'GET /history': '대화 기록 조회'
      },
      personalization: {
        'GET /personalization/profile': '개인화 프로필',
        'GET /personalization/context': '개인화 컨텍스트'
      },
      system: {
        'GET /status': '시스템 상태',
        'GET /guide': '이 가이드'
      }
    },
    
    usage: {
      basicChat: {
        method: 'POST',
        endpoint: '/chat',
        headers: { 'Authorization': 'Bearer YOUR_SESSION_TOKEN' },
        body: {
          message: '안녕하세요',
          model: 'gpt-4',
          includeContext: true
        }
      },
      advancedChat: {
        method: 'POST',
        endpoint: '/chat',
        body: {
          message: '복잡한 질문입니다',
          model: 'claude-3',
          includeContext: true,
          temperature: 0.8,
          maxTokens: 2000
        }
      }
    },
    
    rewards: {
      base: '5 CUE (기본 대화 참여)',
      quality: '0-10 CUE (응답 품질 기반)',
      context: '3 CUE (개인화 컨텍스트 사용)',
      extraction: '1-5 CUE (새로운 개인 단서 추출)'
    },
    
    note: 'DI 적용으로 복잡한 AI 로직이 서비스 계층으로 분리되어 코드가 훨씬 간결해졌습니다.'
  });
});

console.log('✅ AI Chat routes initialized with DI');
export default router;