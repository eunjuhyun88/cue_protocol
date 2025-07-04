// ============================================================================
// 🚀 AI 라우터 통합 시스템 (index.ts)
// 경로: backend/src/routes/ai/index.ts
// 용도: Ollama 전용 + 개인화 AI 서비스 통합 라우터
// ============================================================================

import { Router, Request, Response } from 'express';
import { getService } from '../../core/DIContainer';

const router = Router();

// ============================================================================
// 🦙 개별 라우터들 지연 로딩
// ============================================================================

/**
 * Ollama 전용 라우터 가져오기
 */
const getOllamaRouter = () => {
  try {
    return require('./chat').default; // chat.ts는 Ollama 전용으로 수정됨
  } catch (error) {
    console.warn('⚠️ Ollama 라우터 로딩 실패:', error);
    
    // 폴백 라우터
    const fallbackRouter = Router();
    fallbackRouter.use('*', (req: Request, res: Response) => {
      res.status(503).json({
        success: false,
        error: 'Ollama service unavailable',
        message: 'Ollama 라우터를 로딩할 수 없습니다',
        suggestion: 'chat.ts 파일을 확인하세요'
      });
    });
    return fallbackRouter;
  }
};

/**
 * 개인화 AI 라우터 가져오기
 */
const getPersonalRouter = () => {
  try {
    return require('./personal').default; // personal.ts는 고급 개인화 기능
  } catch (error) {
    console.warn('⚠️ 개인화 AI 라우터 로딩 실패:', error);
    
    // 폴백 라우터
    const fallbackRouter = Router();
    fallbackRouter.use('*', (req: Request, res: Response) => {
      res.status(503).json({
        success: false,
        error: 'Personal AI service unavailable',
        message: '개인화 AI 라우터를 로딩할 수 없습니다',
        suggestion: 'personal.ts 파일을 확인하세요'
      });
    });
    return fallbackRouter;
  }
};

console.log('🚀 AI 통합 라우터 초기화 중...');

// ============================================================================
// 🎯 스마트 라우팅 시스템
// ============================================================================

/**
 * 사용자 설정에 따른 서비스 선택
 */
function determineAIService(req: Request): 'ollama' | 'personal' | 'auto' {
  // 1. URL 경로로 명시적 선택
  if (req.path.startsWith('/ollama/')) return 'ollama';
  if (req.path.startsWith('/personal/')) return 'personal';
  
  // 2. 요청 본문에서 서비스 타입 확인
  const serviceType = req.body?.serviceType || req.query?.serviceType;
  if (serviceType === 'ollama' || serviceType === 'local') return 'ollama';
  if (serviceType === 'personal' || serviceType === 'personalized') return 'personal';
  
  // 3. 사용자 프로필 기반 자동 선택
  const user = (req as any).user;
  if (user?.aiPreference === 'ollama_only') return 'ollama';
  if (user?.aiPreference === 'personalized') return 'personal';
  
  // 4. 요청 모델명으로 자동 판별
  const model = req.body?.model || req.query?.model;
  if (model && (
    model.startsWith('llama') || 
    model.startsWith('gemma') || 
    model.startsWith('qwen') ||
    model.includes(':')
  )) {
    return 'ollama';
  }
  
  // 5. 기본값: 개인화 서비스 (더 고급 기능)
  return 'personal';
}

// ============================================================================
// 🚀 메인 채팅 엔드포인트 (스마트 라우팅)
// ============================================================================

router.post('/chat', async (req: Request, res: Response): Promise<void> => {
  console.log('🎯 === AI 통합 채팅 시작 ===');
  
  const serviceType = determineAIService(req);
  const { message, model = 'auto' } = req.body;
  
  console.log(`🎯 서비스 선택: ${serviceType} (모델: ${model})`);

  try {
    let response;
    
    switch (serviceType) {
      case 'ollama':
        console.log('🦙 Ollama 전용 서비스 호출');
        const ollamaRouter = getOllamaRouter();
        
        // Ollama 라우터의 /chat 엔드포인트로 전달
        req.url = '/chat';
        req.method = 'POST';
        
        // 프록시 방식으로 Ollama 라우터 호출
        return new Promise<void>((resolve, reject) => {
          ollamaRouter.handle(req, res, (error: any) => {
            if (error) {
              console.error('❌ Ollama 라우터 오류:', error);
              res.status(500).json({
                success: false,
                error: 'Ollama service error',
                message: 'Ollama 서비스 처리 중 오류가 발생했습니다',
                serviceType: 'ollama'
              });
            }
            resolve();
          });
        });
        
      case 'personal':
        console.log('🧠 개인화 AI 서비스 호출');
        const personalRouter = getPersonalRouter();
        
        // 개인화 라우터의 /chat 엔드포인트로 전달
        req.url = '/chat';
        req.method = 'POST';
        
        // 프록시 방식으로 개인화 라우터 호출
        return new Promise<void>((resolve, reject) => {
          personalRouter.handle(req, res, (error: any) => {
            if (error) {
              console.error('❌ 개인화 AI 라우터 오류:', error);
              res.status(500).json({
                success: false,
                error: 'Personal AI service error',
                message: '개인화 AI 서비스 처리 중 오류가 발생했습니다',
                serviceType: 'personal'
              });
            }
            resolve();
          });
        });
        
      default:
        console.log('🔄 자동 선택 모드 - 개인화 서비스 기본 사용');
        req.body.serviceType = 'personal';
        const autoRouter = getPersonalRouter();
        req.url = '/chat';
        req.method = 'POST';
        
        return new Promise<void>((resolve, reject) => {
          autoRouter.handle(req, res, (error: any) => {
            if (error) {
              console.error('❌ 자동 선택 오류:', error);
              res.status(500).json({
                success: false,
                error: 'Auto service selection error',
                serviceType: 'auto'
              });
            }
            resolve();
          });
        });
    }
    
  } catch (error: any) {
    console.error('❌ AI 통합 라우터 오류:', error);
    
    res.status(500).json({
      success: false,
      error: 'AI routing failed',
      message: 'AI 서비스 라우팅 중 오류가 발생했습니다',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      serviceType: serviceType,
      suggestion: '다른 AI 서비스를 시도하거나 잠시 후 다시 시도해주세요'
    });
  }
});

// ============================================================================
// 🦙 Ollama 전용 라우트들
// ============================================================================

// Ollama 서비스 직접 호출
router.use('/ollama', getOllamaRouter());

// ============================================================================
// 🧠 개인화 AI 전용 라우트들  
// ============================================================================

// 개인화 AI 서비스 직접 호출
router.use('/personal', getPersonalRouter());

// ============================================================================
// 📊 통합 상태 및 정보 엔드포인트들
// ============================================================================

/**
 * 전체 AI 서비스 상태 조회
 */
router.get('/status', async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('📊 === AI 통합 시스템 상태 확인 ===');
    
    // 각 서비스 상태 확인
    const [ollamaStatus, personalStatus] = await Promise.allSettled([
      checkServiceStatus('ollama'),
      checkServiceStatus('personal')
    ]);
    
    const systemStatus = {
      success: true,
      system: {
        name: 'AI 통합 시스템',
        version: '2.0.0',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString()
      },
      services: {
        ollama: {
          status: ollamaStatus.status === 'fulfilled' ? ollamaStatus.value : 'error',
          description: '순수 로컬 AI (Ollama)',
          features: ['🔒 완전한 프라이버시', '⚡ 빠른 응답', '🌍 오프라인 가능'],
          endpoint: '/api/ai/ollama/'
        },
        personal: {
          status: personalStatus.status === 'fulfilled' ? personalStatus.value : 'error',
          description: '개인화 AI (AI Passport)',
          features: ['🧠 고급 개인화', '💎 CUE 마이닝', '📚 지속 학습', '🎫 AI Passport 연동'],
          endpoint: '/api/ai/personal/'
        }
      },
      routing: {
        smartRouting: true,
        userPreference: true,
        autoDetection: true,
        fallbackSupport: true
      },
      recommendations: generateServiceRecommendations()
    };
    
    res.json(systemStatus);
    
  } catch (error: any) {
    console.error('❌ AI 시스템 상태 확인 오류:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to check AI system status',
      message: 'AI 시스템 상태 확인 중 오류가 발생했습니다',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * 사용 가능한 모든 AI 모델 목록
 */
router.get('/models', async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('📋 === 전체 AI 모델 목록 조회 ===');
    
    const [ollamaModels, personalModels] = await Promise.allSettled([
      getServiceModels('ollama'),
      getServiceModels('personal')
    ]);
    
    const allModels = {
      success: true,
      categories: {
        local: {
          provider: 'Ollama',
          description: '로컬 AI 모델 (완전한 프라이버시)',
          models: ollamaModels.status === 'fulfilled' ? ollamaModels.value : [],
          benefits: ['🔒 데이터 외부 전송 없음', '⚡ 빠른 응답', '💎 프라이버시 보너스']
        },
        personalized: {
          provider: 'Personal AI',
          description: '개인화 AI 모델 (혼합 지원)',
          models: personalModels.status === 'fulfilled' ? personalModels.value : [],
          benefits: ['🧠 AI Passport 연동', '📚 개인 학습', '💎 고급 CUE 마이닝']
        }
      },
      recommendations: {
        privacy: 'Ollama 모델 사용 (100% 로컬)',
        personalization: 'Personal AI 모델 사용 (고급 기능)',
        balanced: 'Personal AI with Ollama 우선 (최적 조합)'
      },
      total: (ollamaModels.status === 'fulfilled' ? ollamaModels.value.length : 0) +
             (personalModels.status === 'fulfilled' ? personalModels.value.length : 0),
      timestamp: new Date().toISOString()
    };
    
    res.json(allModels);
    
  } catch (error: any) {
    console.error('❌ AI 모델 목록 조회 오류:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to get AI models',
      message: 'AI 모델 목록 조회 중 오류가 발생했습니다'
    });
  }
});

/**
 * 서비스 비교 정보
 */
router.get('/compare', (req: Request, res: Response): void => {
  const comparison = {
    success: true,
    services: {
      ollama: {
        name: '🦙 Ollama (로컬 AI)',
        strengths: [
          '🔒 완전한 프라이버시 보장',
          '⚡ 빠른 로컬 처리',
          '🌍 오프라인 동작 가능',
          '💾 데이터 외부 전송 없음',
          '🔧 단순하고 직접적'
        ],
        weaknesses: [
          '📱 모바일 지원 제한',
          '🧠 기본적인 개인화만',
          '🎯 특화 기능 부족'
        ],
        bestFor: ['프라이버시 중시 사용자', '오프라인 환경', '빠른 응답 필요'],
        cueReward: '기본 + 프라이버시 보너스'
      },
      personal: {
        name: '🧠 Personal AI (개인화)',
        strengths: [
          '🎫 AI Passport 완전 연동',
          '📚 지속적 개인화 학습',
          '💎 고급 CUE 마이닝',
          '🎯 성격 기반 모델 선택',
          '📊 상세한 분석 기능'
        ],
        weaknesses: [
          '🌐 일부 클라우드 AI 옵션',
          '⚙️ 복잡한 설정',
          '🔋 더 많은 리소스 사용'
        ],
        bestFor: ['개인화 중시 사용자', '고급 기능 원하는 사용자', 'AI Passport 사용자'],
        cueReward: '최고 보상 (최대 22 CUE)'
      }
    },
    recommendation: {
      beginners: 'Ollama - 단순하고 빠른 시작',
      advanced: 'Personal AI - 고급 개인화 기능',
      privacy: 'Ollama - 100% 로컬 처리',
      features: 'Personal AI - 모든 고급 기능',
      balance: 'Personal AI with Ollama 우선 - 최적의 조합'
    }
  };
  
  res.json(comparison);
});

/**
 * 헬스체크
 */
router.get('/health', (req: Request, res: Response): void => {
  res.json({
    success: true,
    service: 'AI 통합 라우터',
    version: '2.0.0',
    features: [
      '🦙 Ollama 로컬 AI',
      '🧠 개인화 AI',
      '🎯 스마트 라우팅',
      '🔄 자동 폴백',
      '📊 통합 모니터링'
    ],
    routing: {
      available: ['ollama', 'personal', 'auto'],
      default: 'personal',
      fallback: true
    },
    endpoints: [
      'POST /chat - 스마트 AI 채팅',
      'GET /status - 시스템 상태',
      'GET /models - 모델 목록',
      'GET /compare - 서비스 비교',
      'GET /health - 헬스체크',
      'USE /ollama/* - Ollama 직접 호출',
      'USE /personal/* - 개인화 AI 직접 호출'
    ],
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// 🛠️ 헬퍼 함수들
// ============================================================================

/**
 * 개별 서비스 상태 확인
 */
async function checkServiceStatus(serviceType: 'ollama' | 'personal'): Promise<any> {
  try {
    if (serviceType === 'ollama') {
      // Ollama 서비스 상태 확인
      const ollamaService = getService('OllamaAIService');
      const connected = await ollamaService.checkConnection();
      return {
        available: true,
        connected: connected,
        status: connected ? 'healthy' : 'disconnected'
      };
    } else {
      // 개인화 서비스 상태 확인
      const personalizationService = getService('PersonalizationService');
      return {
        available: true,
        status: 'healthy',
        features: ['AI Passport', 'Personal CUE', 'Learning']
      };
    }
  } catch (error) {
    return {
      available: false,
      status: 'error',
      error: error.message
    };
  }
}

/**
 * 서비스별 모델 목록 조회
 */
async function getServiceModels(serviceType: 'ollama' | 'personal'): Promise<any[]> {
  try {
    if (serviceType === 'ollama') {
      const ollamaService = getService('OllamaAIService');
      const models = await ollamaService.getModels();
      return models.map((model: string) => ({
        id: model,
        name: model,
        provider: 'ollama',
        type: 'local',
        privacy: 'local-only'
      }));
    } else {
      return [
        {
          id: 'personalized-agent',
          name: 'Personalized Agent',
          provider: 'personal-ai',
          type: 'hybrid',
          features: ['AI Passport', 'Personal Learning', 'Smart Model Selection']
        }
      ];
    }
  } catch (error) {
    console.error(`❌ ${serviceType} 모델 조회 실패:`, error);
    return [];
  }
}

/**
 * 서비스 추천사항 생성
 */
function generateServiceRecommendations(): any {
  return {
    privacy: {
      service: 'ollama',
      reason: '완전한 로컬 처리로 최고의 프라이버시 보장',
      endpoint: '/api/ai/ollama/chat'
    },
    personalization: {
      service: 'personal',
      reason: 'AI Passport 기반 고급 개인화 기능',
      endpoint: '/api/ai/personal/chat'
    },
    balanced: {
      service: 'auto',
      reason: '스마트 라우팅으로 상황에 맞는 최적 선택',
      endpoint: '/api/ai/chat'
    },
    beginners: {
      service: 'ollama',
      reason: '단순하고 직관적인 AI 경험',
      endpoint: '/api/ai/ollama/chat'
    }
  };
}

console.log('✅ AI 통합 라우터 초기화 완료');
console.log('🦙 Ollama 경로: /api/ai/ollama/*');
console.log('🧠 개인화 AI 경로: /api/ai/personal/*');
console.log('🎯 스마트 채팅: /api/ai/chat');

export default router;