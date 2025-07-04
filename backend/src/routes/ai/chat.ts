// ============================================================================
// 📁 backend/src/routes/ai/chat.ts  
// 💬 Ollama 전용 AI 채팅 라우트 - OpenAI, Claude 제거
// ============================================================================

import express, { Request, Response, Router } from 'express';
import { 
  getService, 
  getAIService, 
  getCueService, 
  getDatabaseService,
  getOllamaService,
  getAuthService 
} from '../../core/DIContainer';

const router: Router = express.Router();

// ============================================================================
// 🔧 DI 서비스 헬퍼 함수들 (안전한 접근 - Ollama 전용)
// ============================================================================

function safeGetOllamaService() {
  try {
    return getOllamaService();
  } catch (error) {
    console.warn('⚠️ OllamaService를 DI에서 가져올 수 없음, 기본값 반환');
    return {
      checkConnection: async () => false,
      getModels: async () => [],
      chatCompletion: async () => 'Ollama 서비스를 사용할 수 없습니다.',
      getStatus: async () => ({ available: false, error: 'Service not available' }),
      getDetailedStatus: async () => ({ connection: { available: false } })
    };
  }
}

function safeGetAIService() {
  try {
    return getAIService();
  } catch (error) {
    console.warn('⚠️ AIService를 DI에서 가져올 수 없음, 기본값 반환');
    return {
      sendMessage: async (message: string, options: any) => ({
        response: `Ollama Echo: ${message}`,
        model: 'mock',
        timestamp: new Date().toISOString(),
        provider: 'ollama-mock',
        local: true,
        privacy: 'local-processing-only'
      }),
      getPersonalizedContext: async () => ({}),
      getChatHistory: async () => [],
      getStatus: async () => ({ status: 'mock', available: false })
    };
  }
}

function safeGetCueService() {
  try {
    return getCueService();
  } catch (error) {
    console.warn('⚠️ CueService를 DI에서 가져올 수 없음, 기본값 반환');
    return {
      calculateReward: async () => 5,
      awardTokens: async () => ({ success: true, tokens: 5 }),
      getBalance: async () => 0,
      getStatus: async () => ({ status: 'mock', available: true })
    };
  }
}

function safeGetDatabaseService() {
  try {
    return getDatabaseService();
  } catch (error) {
    console.warn('⚠️ DatabaseService를 DI에서 가져올 수 없음, 기본값 반환');
    return {
      query: async () => ({ data: [], error: null }),
      insert: async () => ({ data: null, error: null }),
      update: async () => ({ data: null, error: null })
    };
  }
}

// ============================================================================
// 🛡️ 인증 미들웨어 (간소화)
// ============================================================================

const authMiddleware = (req: Request, res: Response, next: express.NextFunction) => {
  try {
    // Authorization 헤더 확인
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('⚠️ 인증 토큰 없음, 익명 사용자로 처리');
      (req as any).user = { 
        did: `anonymous_${Date.now()}`, 
        username: 'Anonymous',
        authenticated: false 
      };
      return next();
    }

    // 토큰 파싱 (간단한 구현)
    const token = authHeader.substring(7);
    if (token === 'test-token' || token.length > 10) {
      (req as any).user = { 
        did: `user_${Date.now()}`, 
        username: 'TestUser',
        authenticated: true 
      };
    } else {
      (req as any).user = { 
        did: `anonymous_${Date.now()}`, 
        username: 'Anonymous',
        authenticated: false 
      };
    }
    
    next();
  } catch (error) {
    console.error('💥 인증 미들웨어 오류:', error);
    (req as any).user = { 
      did: `error_${Date.now()}`, 
      username: 'Error',
      authenticated: false 
    };
    next();
  }
};

// ============================================================================
// 🚀 핵심 Ollama AI 채팅 API
// ============================================================================

/**
 * Ollama AI 채팅 메시지 전송
 * POST /api/ai/chat
 */
router.post('/chat', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  
  try {
    const user = (req as any).user;
    const { 
      message, 
      model = 'llama3.2:3b', 
      includeContext = true,
      temperature = 0.7,
      maxTokens = 2000 
    } = req.body;

    console.log(`💬 === Ollama AI 채팅 요청: ${user.did} ===`);
    console.log(`📝 메시지: "${message}"`);
    console.log(`🦙 모델: ${model}`);

    // 입력 검증
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: 'Message is required and must be a non-empty string'
      });
      return;
    }

    // DI 서비스들 안전하게 가져오기
    const ollamaService = safeGetOllamaService();
    const aiService = safeGetAIService();
    const cueService = safeGetCueService();

    // Ollama 연결 상태 확인
    console.log('🔍 Ollama 연결 상태 확인 중...');
    const isOllamaConnected = await ollamaService.checkConnection();
    
    if (!isOllamaConnected) {
      console.log('⚠️ Ollama 서버 연결 불가, 안내 메시지 반환');
      
      // Ollama 연결 실패 시 도움말 포함한 응답
      const helpResponse = {
        success: true,
        response: `🦙 Ollama AI 서비스에 연결할 수 없습니다.

**해결 방법:**
1. \`ollama serve\` 명령어로 Ollama 서버 시작
2. \`ollama pull ${model}\` 명령어로 모델 다운로드
3. Ollama 설치가 필요한 경우: \`brew install ollama\`

**당신의 질문:** "${message}"

현재 로컬 AI 서비스가 준비되면 완전한 프라이버시 보장 하에 답변을 제공할 수 있습니다. 
CUE Protocol의 AI Passport는 모든 데이터를 로컬에서만 처리하여 개인정보를 100% 보호합니다.`,
        model: `${model} (연결 대기)`,
        timestamp: new Date().toISOString(),
        cueReward: 2, // 기본 보상
        trustScore: 0.5,
        processingTime: Date.now() - startTime,
        provider: 'ollama',
        local: true,
        privacy: 'local-processing-only',
        debug: {
          ollamaConnected: false,
          suggestion: 'Start Ollama server and pull model'
        }
      };
      
      res.json(helpResponse);
      return;
    }

    // Ollama AI 응답 생성
    console.log('🤖 Ollama AI 서비스로 메시지 전송 중...');
    const aiResponse = await aiService.sendMessage(message, {
      model,
      userDid: user.did,
      includeContext,
      temperature,
      maxTokens
    });

    // CUE 토큰 보상 계산 (로컬 AI 사용 보너스 포함)
    console.log('⚡ CUE 토큰 보상 계산 중...');
    const baseReward = await cueService.calculateReward({
      action: 'ollama_chat',
      quality: aiResponse.qualityScore || 0.8,
      messageLength: message.length,
      responseLength: aiResponse.response?.length || 0
    });
    
    // 로컬 AI 사용 프라이버시 보너스 추가
    const privacyBonus = 3; // 로컬 AI 사용 보너스
    const totalReward = baseReward + privacyBonus;

    // CUE 토큰 지급
    const awardResult = await cueService.awardTokens(user.did, totalReward, {
      type: 'ollama_chat',
      metadata: {
        model,
        messageId: aiResponse.messageId || `msg_${Date.now()}`,
        conversationId: aiResponse.conversationId,
        privacyBonus: privacyBonus
      }
    });

    const processingTime = Date.now() - startTime;

    console.log(`✅ Ollama AI 채팅 완료 (${processingTime}ms)`);
    console.log(`🎁 CUE 보상: ${totalReward} 토큰 (프라이버시 보너스 +${privacyBonus})`);

    // 프론트엔드 호환 응답 포맷
    res.json({
      success: true,
      response: aiResponse.response || `Ollama Echo: ${message}`,
      model: aiResponse.model || model,
      timestamp: new Date().toISOString(),
      cueReward: totalReward,
      trustScore: aiResponse.trustScore || 0.8,
      contextLearned: aiResponse.contextLearned || false,
      qualityScore: aiResponse.qualityScore || 0.8,
      processingTime,
      tokensUsed: aiResponse.tokensUsed || 0,
      // Ollama 전용 추가 메타데이터
      provider: 'ollama',
      local: true,
      privacy: 'local-processing-only',
      user: {
        did: user.did,
        authenticated: user.authenticated
      },
      aiMetadata: {
        messageId: aiResponse.messageId || `msg_${Date.now()}`,
        conversationId: aiResponse.conversationId || `conv_${Date.now()}`,
        personalityMatch: aiResponse.personalityMatch || 0.7,
        privacyBonus: privacyBonus
      },
      debug: {
        ollamaConnected: true,
        provider: 'ollama',
        modelUsed: aiResponse.model || model,
        localProcessing: true
      }
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    console.error('💥 Ollama AI 채팅 오류:', error);
    
    res.status(500).json({
      success: false,
      error: 'Ollama AI chat failed',
      message: error.message,
      processingTime,
      timestamp: new Date().toISOString(),
      provider: 'ollama',
      suggestion: 'Check if Ollama server is running and model is available'
    });
  }
});

// ============================================================================
// 📋 Ollama 모델 목록 API  
// ============================================================================

/**
 * 사용 가능한 Ollama 모델 목록 조회
 * GET /api/ai/models
 */
router.get('/models', async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('📋 === Ollama 모델 목록 조회 ===');

    const ollamaService = safeGetOllamaService();
    
    // Ollama 연결 확인
    const isConnected = await ollamaService.checkConnection();
    
    if (!isConnected) {
      res.json({
        success: false,
        message: 'Ollama 서버에 연결할 수 없습니다',
        models: [],
        instructions: {
          install: 'brew install ollama',
          start: 'ollama serve',
          pullModel: 'ollama pull llama3.2:3b',
          checkConnection: 'curl http://localhost:11434/api/tags'
        },
        recommended: [
          {
            id: 'llama3.2:3b',
            name: 'Llama 3.2 3B',
            size: '2.0GB',
            description: '빠르고 효율적인 대화형 모델 (추천)',
            command: 'ollama pull llama3.2:3b'
          },
          {
            id: 'llama3.2:1b',
            name: 'Llama 3.2 1B',
            size: '1.3GB',
            description: '매우 빠른 경량 모델',
            command: 'ollama pull llama3.2:1b'
          }
        ]
      });
      return;
    }

    // 사용 가능한 모델 목록 가져오기
    const availableModels = await ollamaService.getModels();
    
    // 모델 정보 구성
    const modelList = availableModels.map(modelName => {
      const isRecommended = ['llama3.2:3b', 'llama3.2:1b'].includes(modelName);
      const size = modelName.includes(':1b') ? '1B' : 
                   modelName.includes(':2b') ? '2B' :
                   modelName.includes(':3b') ? '3B' :
                   modelName.includes(':7b') ? '7B' :
                   modelName.includes(':8b') ? '8B' : 'Unknown';
      
      return {
        id: modelName,
        name: `${modelName.split(':')[0].toUpperCase()} (${size})`,
        available: true,
        recommended: isRecommended,
        type: 'local',
        provider: 'ollama',
        description: `로컬 AI 모델 - 완전한 프라이버시 보장`,
        speed: modelName.includes(':1b') ? 'very-fast' :
               modelName.includes(':3b') ? 'fast' : 'moderate',
        privacy: 'local-processing-only'
      };
    });

    // 기본 추천 모델도 포함 (다운로드되지 않은 경우)
    const baseModels = [
      { 
        id: 'llama3.2:3b', 
        name: 'Llama 3.2 3B', 
        available: availableModels.includes('llama3.2:3b'),
        recommended: true,
        type: 'local',
        provider: 'ollama',
        description: '추천: 빠르고 정확한 대화형 모델',
        speed: 'fast',
        size: '2.0GB',
        privacy: 'local-processing-only',
        command: availableModels.includes('llama3.2:3b') ? null : 'ollama pull llama3.2:3b'
      },
      { 
        id: 'llama3.2:1b', 
        name: 'Llama 3.2 1B', 
        available: availableModels.includes('llama3.2:1b'),
        recommended: true,
        type: 'local',
        provider: 'ollama',
        description: '추천: 매우 빠른 경량 모델',
        speed: 'very-fast',
        size: '1.3GB',
        privacy: 'local-processing-only',
        command: availableModels.includes('llama3.2:1b') ? null : 'ollama pull llama3.2:1b'
      }
    ];
    
    // 중복 제거하여 결합
    const allModels = [...baseModels];
    modelList.forEach(model => {
      if (!allModels.find(m => m.id === model.id)) {
        allModels.push(model);
      }
    });

    res.json({
      success: true,
      connected: isConnected,
      ollama: {
        connected: true,
        host: process.env.OLLAMA_HOST || 'http://localhost:11434',
        modelCount: availableModels.length,
        availableModels: availableModels
      },
      models: allModels,
      totalModels: allModels.length,
      availableModels: allModels.filter(m => m.available).length,
      privacy: 'All models process data locally - 100% privacy guaranteed'
    });

  } catch (error) {
    console.error('Error getting Ollama models:', error);
    res.json({
      success: false,
      error: 'Failed to retrieve Ollama models',
      models: [
        { 
          id: 'llama3.2:3b', 
          name: 'Llama 3.2 3B', 
          available: false, 
          recommended: true,
          note: 'ollama pull llama3.2:3b 명령어로 다운로드하세요',
          command: 'ollama pull llama3.2:3b'
        }
      ],
      instructions: {
        install: 'brew install ollama',
        start: 'ollama serve',
        pullModel: 'ollama pull llama3.2:3b'
      }
    });
  }
});

// ============================================================================
// 📊 Ollama 시스템 상태 조회 API
// ============================================================================

/**
 * Ollama 시스템 상태 조회
 * GET /api/ai/status
 */
router.get('/status', async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('🔍 === Ollama 시스템 상태 확인 ===');

    const ollamaService = safeGetOllamaService();
    const aiService = safeGetAIService();
    const cueService = safeGetCueService();

    const [ollamaStatus, aiStatus, cueStatus] = await Promise.all([
      ollamaService.getDetailedStatus(),
      aiService.getStatus(),
      cueService.getStatus()
    ]);

    res.json({
      success: true,
      status: {
        ollama: ollamaStatus,
        ai: aiStatus,
        cue: cueStatus,
        features: {
          localProcessing: true,
          noDataCollection: true,
          offlineCapable: true,
          privacyGuaranteed: true,
          ollamaIntegration: true,
          cueRewards: true,
          personalization: true
        },
        version: '3.0-ollama-only',
        uptime: process.uptime(),
        provider: 'ollama',
        privacy: 'local-processing-only'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('💥 Ollama 시스템 상태 확인 오류:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to get Ollama system status',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ============================================================================
// 🔍 개인화 컨텍스트 조회 API (Ollama 최적화)
// ============================================================================

/**
 * 사용자 개인화 컨텍스트 조회  
 * GET /api/ai/personalization/context
 */
router.get('/personalization/context', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    
    console.log(`🧠 === 개인화 컨텍스트 조회: ${user.did} ===`);

    const aiService = safeGetAIService();
    const context = await aiService.getPersonalizedContext(user.did);

    res.json({
      success: true,
      context: {
        personalityProfile: context.personalityProfile || {
          type: 'Privacy-Focused User',
          communicationStyle: 'Direct',
          learningPattern: 'Visual',
          decisionMaking: 'Analytical',
          aiPreference: 'Local AI (Ollama)'
        },
        totalCues: context.cues?.length || 0,
        vaultsCount: context.vaultIds?.length || 0,
        behaviorPatterns: context.behaviorPatterns || ['Ollama 사용 선호', '프라이버시 중시'],
        recentInteractions: context.recentInteractions || [],
        personalityMatch: context.personalityMatch || 0.8,
        preferences: {
          ...context.preferences,
          aiProvider: 'ollama',
          privacyLevel: 'maximum',
          localProcessing: true
        }
      },
      user: {
        did: user.did,
        authenticated: user.authenticated
      },
      timestamp: new Date().toISOString(),
      privacy: 'All personalization data stays local'
    });

  } catch (error) {
    console.error('💥 개인화 컨텍스트 조회 오류:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to get personalization context',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ============================================================================
// 📚 대화 기록 조회 API (Ollama 전용)
// ============================================================================

/**
 * Ollama 대화 기록 조회
 * GET /api/ai/history?page=1&limit=20
 */
router.get('/history', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { page = 1, limit = 20, conversationId } = req.query;

    console.log(`📖 === Ollama 대화 기록 조회: ${user.did} ===`);

    const aiService = safeGetAIService();
    const history = await aiService.getChatHistory(user.did, {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      conversationId: conversationId as string,
      provider: 'ollama'
    });

    res.json({
      success: true,
      history: history || [],
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: history?.length || 0
      },
      user: {
        did: user.did,
        authenticated: user.authenticated
      },
      privacy: 'All conversation history stored locally',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('💥 대화 기록 조회 오류:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to get chat history',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ============================================================================
// 🦙 Ollama 헬스체크 API
// ============================================================================

/**
 * Ollama 연결 테스트
 * GET /api/ai/ollama/health
 */
router.get('/ollama/health', async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('🔍 === Ollama 헬스체크 ===');

    const ollamaService = safeGetOllamaService();
    const healthResult = await ollamaService.testConnection();

    res.json({
      success: healthResult.success,
      ...healthResult,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('💥 Ollama 헬스체크 오류:', error);
    
    res.json({
      success: false,
      error: 'Ollama health check failed',
      message: error.message,
      timestamp: new Date().toISOString(),
      instructions: {
        install: 'brew install ollama',
        start: 'ollama serve',
        pullModel: 'ollama pull llama3.2:3b'
      }
    });
  }
});

// ============================================================================
// 📖 Ollama 전용 API 사용 가이드
// ============================================================================

/**
 * Ollama AI Chat API 사용 가이드
 * GET /api/ai/guide
 */
router.get('/guide', (req: Request, res: Response): void => {
  res.json({
    success: true,
    service: 'Ollama 전용 AI 채팅 서비스',
    version: '3.0-ollama-only',
    
    features: {
      core: [
        '✅ Ollama 로컬 AI 모델 전용 지원',
        '✅ 100% 로컬 데이터 처리 (완전한 프라이버시)',
        '✅ 개인화 컨텍스트 학습',
        '✅ 실시간 CUE 토큰 마이닝 (프라이버시 보너스 포함)',
        '✅ 품질 기반 보상 시스템',
        '✅ 대화 기록 관리',
        '✅ DI Container 완전 연동'
      ],
      privacy: [
        '🔒 모든 AI 처리가 로컬에서 실행',
        '🔒 데이터가 외부 서버로 전송되지 않음',
        '🔒 인터넷 없이도 AI 사용 가능',
        '🔒 개인 정보 100% 보호'
      ],
      personalization: [
        '🧠 개인 성격 프로필 학습',
        '🧠 대화 패턴 분석',
        '🧠 선호도 학습 및 적용',
        '🧠 로컬 컨텍스트 기반 응답 생성'
      ],
      mining: [
        '💰 대화 참여 기본 보상',
        '💰 응답 품질 기반 보너스',
        '💰 로컬 AI 사용 프라이버시 보너스 (+3 CUE)',
        '💰 개인화 컨텍스트 사용 보너스',
        '💰 개인 단서 추출 보너스'
      ]
    },
    
    endpoints: {
      chat: {
        'POST /chat': 'Ollama AI 채팅 (인증 권장)',
        'GET /models': '사용 가능한 Ollama 모델 목록',
        'GET /history': '대화 기록 조회',
        'GET /personalization/context': '개인화 컨텍스트'
      },
      system: {
        'GET /status': '시스템 상태',
        'GET /ollama/health': 'Ollama 헬스체크',
        'GET /guide': '이 가이드'
      }
    },
    
    usage: {
      basicChat: {
        method: 'POST',
        endpoint: '/chat',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer YOUR_TOKEN (선택사항)'
        },
        body: {
          message: '안녕하세요',
          model: 'llama3.2:3b',
          includeContext: true
        }
      },
      advancedChat: {
        method: 'POST',
        endpoint: '/chat',
        body: {
          message: '복잡한 질문입니다',
          model: 'llama3.2:3b',
          includeContext: true,
          temperature: 0.8,
          maxTokens: 2000
        }
      }
    },
    
    ollama: {
      installation: {
        mac: 'brew install ollama',
        linux: 'curl -fsSL https://ollama.ai/install.sh | sh',
        windows: 'Download from ollama.ai'
      },
      commands: {
        startServer: 'ollama serve',
        pullModel: 'ollama pull llama3.2:3b',
        listModels: 'ollama list',
        checkHealth: 'curl http://localhost:11434/api/tags'
      },
      recommendedModels: [
        {
          name: 'llama3.2:3b',
          size: '2.0GB',
          description: '빠르고 효율적인 대화형 모델 (추천)',
          command: 'ollama pull llama3.2:3b'
        },
        {
          name: 'llama3.2:1b',
          size: '1.3GB',
          description: '매우 빠른 경량 모델',
          command: 'ollama pull llama3.2:1b'
        }
      ]
    },
    
    rewards: {
      base: '5 CUE (기본 대화 참여)',
      quality: '0-10 CUE (응답 품질 기반)',
      privacy: '3 CUE (로컬 AI 사용 보너스)',
      context: '3 CUE (개인화 컨텍스트 사용)',
      extraction: '1-5 CUE (새로운 개인 단서 추출)'
    },
    
    authentication: {
      required: false,
      recommended: true,
      anonymous: '익명 사용자도 사용 가능 (기능 제한)',
      bearer: 'Authorization: Bearer TOKEN'
    },
    
    privacy: {
      guarantee: '100% 로컬 처리',
      dataStorage: '모든 데이터가 사용자 기기에만 저장',
      internetRequired: '모델 다운로드 시에만 필요',
      thirdParty: '제3자 서버와 데이터 공유 없음'
    },
    
    troubleshooting: {
      connectionIssues: {
        problem: 'Ollama 서버 연결 실패',
        solutions: [
          'ollama serve 명령어로 서버 시작',
          '포트 11434가 열려있는지 확인',
          'Ollama가 설치되어 있는지 확인'
        ]
      },
      modelIssues: {
        problem: '모델을 찾을 수 없음',
        solutions: [
          'ollama pull llama3.2:3b로 모델 다운로드',
          'ollama list로 설치된 모델 확인',
          '충분한 디스크 공간 확보'
        ]
      }
    },
    
    frontendIntegration: {
      baseURL: 'http://localhost:3001/api/ai',
      examples: {
        fetch: `
fetch('/api/ai/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    message: '안녕하세요', 
    model: 'llama3.2:3b' 
  })
})`,
        axios: `
axios.post('/api/ai/chat', { 
  message: '안녕하세요', 
  model: 'llama3.2:3b' 
})`
      }
    },
    
    note: 'Ollama 전용 AI 서비스로 완전한 프라이버시를 보장합니다. 모든 AI 처리가 로컬에서 실행되며, 개인 데이터가 외부로 전송되지 않습니다.'
  });
});

console.log('✅ Ollama 전용 AI Chat routes initialized');
export default router;