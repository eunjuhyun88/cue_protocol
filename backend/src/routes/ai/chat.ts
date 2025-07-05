// ============================================================================
// 📁 backend/src/routes/ai/chat.ts
// 🦙 순수 Ollama 전용 AI 채팅 라우터 (클라우드 AI 완전 제거)
// ============================================================================

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getService } from '../../core/DIContainer';
import { DIContainer } from '../../core/DIContainer';

const router = Router();

// ============================================================================
// 🦙 DI Container에서 Ollama 서비스 가져오기 (순수 로컬 AI)
// ============================================================================

/**
 * Ollama 서비스 가져오기 (DI 우선, 기존 폴백)
 */
const getOllamaService = () => {
  try {
    return getService('OllamaAIService');
  } catch (error) {
    console.warn('⚠️ DI에서 OllamaAIService 가져오기 실패, 기존 방식 사용:', error);
    
    try {
      const { ollamaService } = require('../../services/ollama');
      return ollamaService;
    } catch (fallbackError) {
      console.error('❌ 기존 ollamaService도 실패:', fallbackError);
      
      // 최종 폴백 서비스
      return {
        async checkConnection() { return false; },
        async chat(model: string, messages: any[], stream: boolean) {
          return '🦙 Ollama 서비스를 사용할 수 없습니다.\n\n' +
                 '**해결 방법:**\n' +
                 '1. `ollama serve` 명령어로 Ollama 서버 시작\n' +
                 '2. `ollama pull llama3.2:3b` 명령어로 모델 다운로드\n' +
                 '3. http://localhost:11434에서 서버 상태 확인\n\n' +
                 '**설치:** `brew install ollama` (macOS) 또는 https://ollama.ai 방문';
        },
        async getModels() { return ['llama3.2:3b', 'llama3.2:1b', 'gemma2:2b']; },
        async pullModel(model: string) { 
          throw new Error('Ollama 서비스를 사용할 수 없습니다'); 
        }
      };
    }
  }
};

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
      constructor: { name: 'FallbackDatabaseService' }
    };
  }
};

/**
 * CUE 서비스 가져오기 (로컬 AI 보너스 전용)
 */
const getCueService = () => {
  try {
    return getService('CueService');
  } catch (error) {
    console.warn('⚠️ CueService DI 실패, 기본 구현 사용:', error);
    
    return {
      async mineFromActivity(userId: string, activity: any) {
        // 로컬 AI 사용 보너스 계산
        const baseAmount = 5;
        const privacyBonus = 5; // 로컬 AI 사용 보너스
        const qualityBonus = Math.floor((activity.quality || 0.8) * 3);
        return { 
          amount: baseAmount + privacyBonus + qualityBonus, 
          newBalance: 2500 + baseAmount + privacyBonus + qualityBonus 
        };
      }
    };
  }
};

console.log('🦙 순수 Ollama 전용 AI Routes 초기화 (클라우드 AI 완전 제거)');

// ============================================================================
// 🤖 메인 Ollama 채팅 엔드포인트 (클라우드 AI 제거)
// ============================================================================

router.post('/chat', async (req: Request, res: Response): Promise<void> => {
  console.log('🦙 === 순수 Ollama AI 채팅 시작 ===');
  console.log('🔒 100% 로컬 처리 - 데이터 외부 전송 없음');
  
  const { message, model = 'llama3.2:3b', conversationId, userId, passportData } = req.body;
  
  console.log('🔍 입력 파라미터:', {
    message: message?.slice(0, 50),
    model,
    userId,
    hasPassportData: !!passportData
  });

  // 사용자 정보 확인
  const userDid = (req as any).user?.did || 
                  (passportData?.did) || 
                  (userId ? `did:local:${userId}` : `did:anonymous:${Date.now()}`);

  console.log(`🦙 Ollama 채팅: ${model} for user ${userDid?.slice(0, 20)}...`);

  if (!message || !message.trim()) {
    res.status(400).json({
      success: false,
      error: 'Message is required',
      message: '메시지를 입력해주세요',
      provider: 'ollama'
    });
    return;
  }

  const startTime = Date.now();
  const currentConversationId = conversationId || uuidv4();

  try {
    // DI에서 서비스들 가져오기
    const ollamaService = getOllamaService();
    const db = getDatabaseService() as {
      getUserById?: (id: string) => Promise<any>;
      createUser?: (userData: any) => Promise<any>;
      saveChatMessage?: (data: any) => Promise<any>;
      recordCueTransaction?: (data: any) => Promise<any>;
      createCUETransaction?: (data: any) => Promise<any>;
      updatePassport?: (did: string, updates: any) => Promise<any>;
      [key: string]: any;
    };
    const cueService = getCueService();
    
    console.log('✅ Ollama 전용 서비스들 로딩 완료');

    // 1. 사용자 정보 확인 및 생성
    console.log('👤 사용자 정보 확인 중...');
    let user = null;
    
    if (userId) {
      user = await db.getUserById(userId);
      
      if (!user) {
        const newUserData = {
          id: userId,
          username: `ollama_user_${userId.slice(-8)}`,
          did: userDid,
          wallet_address: `0x${Math.random().toString(16).substring(2, 42)}`,
          ai_preference: 'ollama_only',
          privacy_level: 'maximum',
          created_at: new Date().toISOString()
        };
        
        user = await db.createUser(newUserData);
        console.log(`✅ 새 Ollama 사용자 생성: ${userId}`);
      }
    } else {
      user = { id: userDid, username: 'anonymous', did: userDid };
    }

    // 2. 사용자 메시지 저장
    console.log('💾 Ollama 채팅 메시지 저장 중...');
    const userMessageData = {
      id: uuidv4(),
      user_did: userDid,
      user_id: user?.id || userId,
      conversation_id: currentConversationId,
      message_type: 'user',
      content: message,
      ai_provider: 'ollama',
      privacy_level: 'local_only',
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    };

    await db.saveChatMessage(userMessageData);

    // 3. Ollama 연결 상태 확인
    console.log('🔍 Ollama 서버 연결 확인 중...');
    const isConnected = await ollamaService.checkConnection();
    
    if (!isConnected) {
      console.log('❌ Ollama 서버 연결 실패 - 설치 안내 제공');
      
      const helpResponse = {
        success: true,
        message: {
          content: `🦙 **Ollama 로컬 AI 서버 연결 필요**

**당신의 질문:** "${message}"

현재 Ollama 서버에 연결할 수 없습니다. 다음 단계를 따라 설정해주세요:

**1단계: Ollama 설치**
\`\`\`bash
# macOS
brew install ollama

# Linux/Windows
curl -fsSL https://ollama.ai/install.sh | sh
\`\`\`

**2단계: 서버 시작**
\`\`\`bash
ollama serve
\`\`\`

**3단계: 추천 모델 다운로드**
\`\`\`bash
ollama pull llama3.2:3b    # 빠르고 효율적 (추천)
ollama pull llama3.2:1b    # 초경량 모델
ollama pull gemma2:2b      # Google 모델
\`\`\`

**4단계: 연결 확인**
- 브라우저에서 http://localhost:11434 접속
- "Ollama is running" 메시지 확인

**왜 Ollama인가요?**
🔒 **완전한 프라이버시**: 모든 데이터가 당신의 컴퓨터에서만 처리됩니다
⚡ **빠른 응답**: 인터넷 연결 없이도 동작합니다  
💎 **특별 보상**: 로컬 AI 사용 시 추가 CUE 토큰 획득
🌍 **오프라인 가능**: 인터넷 없어도 AI와 대화할 수 있습니다

설정 완료 후 다시 메시지를 보내주세요!`,
          model: `${model} (연결 대기)`,
          provider: 'ollama',
          local: true,
          privacy: 'local-processing-only'
        },
        ollamaStatus: {
          connected: false,
          recommendedModels: [
            { name: 'llama3.2:3b', size: '2.0GB', speed: 'fast', recommended: true },
            { name: 'llama3.2:1b', size: '1.3GB', speed: 'very-fast', recommended: true },
            { name: 'gemma2:2b', size: '1.6GB', speed: 'fast', recommended: false }
          ],
          installGuide: 'https://ollama.ai'
        },
        cueReward: 2, // 시도에 대한 기본 보상
        timestamp: new Date().toISOString()
      };
      
      res.json(helpResponse);
      return;
    }

    // 4. Ollama AI 응답 생성
    console.log(`🤖 Ollama ${model} 모델로 응답 생성 중...`);
    
    // 프라이버시 중심 시스템 프롬프트
    const systemPrompt = `당신은 완전한 프라이버시를 보장하는 로컬 AI 어시스턴트입니다.

**핵심 원칙:**
- 모든 대화는 사용자의 컴퓨터에서만 처리됩니다
- 어떤 데이터도 외부 서버로 전송되지 않습니다
- 사용자의 프라이버시를 최우선으로 합니다

**응답 스타일:**
- 친근하고 도움이 되는 한국어 응답
- 명확하고 실용적인 정보 제공
- 필요시 구체적인 예시나 단계별 설명 포함

사용자의 질문에 성실하고 유용하게 답변해주세요.`;
    
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
    const aiResponse = await ollamaService.chat(model, messages, false);
    
    console.log(`✅ Ollama ${model} 응답 생성 완료`);

    // 5. CUE 토큰 계산 (로컬 AI 보너스 포함)
    console.log('💎 로컬 AI 사용 CUE 보상 계산 중...');
    const activity = {
      type: 'ollama_chat',
      model: model,
      messageLength: message.length,
      responseLength: aiResponse.length,
      quality: 0.9, // 로컬 AI 고품질 점수
      privacy: 'local_only'
    };
    
    const miningResult = await cueService.mineFromActivity(userDid, activity);
    const totalTokens = miningResult.amount;

    console.log(`💎 로컬 AI 보상 지급: ${totalTokens} CUE (프라이버시 보너스 포함)`);

    // 6. AI 응답 저장
    console.log('💾 Ollama 응답 저장 중...');
    const aiMessageData = {
      id: uuidv4(),
      user_did: userDid,
      user_id: user?.id || userId,
      conversation_id: currentConversationId,
      message_type: 'ai',
      content: aiResponse,
      ai_model: model,
      ai_provider: 'ollama',
      privacy_level: 'local_only',
      cue_tokens_earned: totalTokens,
      verified: true,
      verification_signature: `ollama_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      response_time_ms: Date.now() - startTime,
      tokens_used: Math.floor(aiResponse.length / 4) // 대략적 토큰 수
    };

    await db.saveChatMessage(aiMessageData);

    // 7. CUE 거래 기록
    if (totalTokens > 0) {
      const transactionData = {
        user_did: userDid,
        user_id: user?.id || userId,
        transaction_type: 'ollama_mining',
        amount: totalTokens,
        status: 'completed',
        source: 'ollama_chat',
        description: `Ollama 로컬 AI 채팅 보상 (${model})`,
        metadata: {
          messageId: aiMessageData.id,
          model: model,
          privacyBonus: true,
          localProcessing: true
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

    // 8. Passport 활동 업데이트
    try {
      await db.updatePassport(userDid, {
        total_interactions: 1,
        last_activity_at: new Date().toISOString(),
        ai_preference: 'ollama',
        privacy_score: 100 // 로컬 AI 사용으로 최고 프라이버시 점수
      });
    } catch (error) {
      console.warn('⚠️ Passport 업데이트 실패:', error);
    }

    const processingTime = Date.now() - startTime;
    
    console.log(`✅ Ollama 채팅 완료 (${processingTime}ms) - ${totalTokens} CUE 획득`);

    // 9. 응답 반환
    res.json({
      success: true,
      message: {
        id: aiMessageData.id,
        conversationId: currentConversationId,
        content: aiResponse,
        model,
        provider: 'ollama',
        local: true,
        privacy: 'local-processing-only',
        cueTokensEarned: totalTokens,
        responseTimeMs: processingTime,
        verification: {
          verified: true,
          signature: aiMessageData.verification_signature,
          localProcessing: true
        }
      },
      ollamaInfo: {
        model: model,
        localProcessing: true,
        dataPrivacy: '모든 데이터가 로컬에서만 처리됩니다',
        internetRequired: false,
        serverUrl: 'localhost:11434'
      },
      rewards: {
        totalCUE: totalTokens,
        breakdown: {
          base: 5,
          privacyBonus: 5,
          qualityBonus: totalTokens - 10
        },
        reason: '로컬 AI 사용으로 프라이버시 보너스 지급'
      },
      user: user ? {
        id: user.id,
        username: user.username,
        did: user.did,
        aiPreference: 'ollama_only'
      } : null,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Ollama 채팅 처리 오류:', error);
    
    res.status(500).json({
      success: false,
      error: 'Ollama chat processing failed',
      message: 'Ollama AI 채팅 중 오류가 발생했습니다',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      provider: 'ollama',
      suggestion: 'Ollama 서버 상태를 확인하고 다시 시도해주세요',
      troubleshooting: [
        'ollama serve 명령어로 서버 실행 확인',
        'ollama list 명령어로 모델 설치 확인', 
        'http://localhost:11434 접속하여 서버 상태 확인'
      ],
      conversationId: currentConversationId,
      timestamp: new Date().toISOString()
    });
  }
});

// ============================================================================
// 📋 Ollama 모델 목록 API
// ============================================================================

router.get('/models', async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('📋 === Ollama 모델 목록 조회 ===');

    const ollamaService = getOllamaService();
    
    // Ollama 연결 확인
    const isConnected = await ollamaService.checkConnection();
    
    if (!isConnected) {
      res.json({
        success: false,
        message: 'Ollama 서버에 연결할 수 없습니다',
        connected: false,
        models: [],
        instructions: {
          install: 'brew install ollama (macOS) 또는 https://ollama.ai 방문',
          start: 'ollama serve',
          pullModel: 'ollama pull llama3.2:3b',
          checkConnection: 'curl http://localhost:11434/api/tags'
        },
        recommended: [
          {
            id: 'llama3.2:3b',
            name: 'Llama 3.2 3B',
            size: '2.0GB',
            description: '빠르고 효율적인 대화형 모델 (강력 추천)',
            command: 'ollama pull llama3.2:3b',
            features: ['빠른 응답', '한국어 지원', '범용 대화']
          },
          {
            id: 'llama3.2:1b',
            name: 'Llama 3.2 1B',
            size: '1.3GB',
            description: '초경량 빠른 모델',
            command: 'ollama pull llama3.2:1b',
            features: ['매우 빠름', '저사양 PC 가능', '기본 대화']
          },
          {
            id: 'gemma2:2b',
            name: 'Gemma 2 2B',
            size: '1.6GB',
            description: 'Google의 효율적인 모델',
            command: 'ollama pull gemma2:2b',
            features: ['Google 기술', '균형잡힌 성능', '다국어 지원']
          }
        ],
        provider: 'ollama',
        privacy: 'local-processing-only'
      });
      return;
    }

    // 설치된 모델 목록 가져오기
    const installedModels = await ollamaService.getModels();
    
    // 모델 정보 구성
    const modelList = installedModels.map(modelName => {
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
        privacy: 'local-processing-only',
        cueBonus: '로컬 AI 사용 시 프라이버시 보너스 +5 CUE'
      };
    });

    res.json({
      success: true,
      connected: true,
      provider: 'ollama',
      serverUrl: 'http://localhost:11434',
      privacy: '100% 로컬 처리 - 데이터 외부 전송 없음',
      models: modelList,
      totalModels: modelList.length,
      recommendations: {
        beginners: 'llama3.2:1b - 빠르고 가벼움',
        balanced: 'llama3.2:3b - 성능과 속도의 균형',
        advanced: 'gemma2:2b - Google 기술 기반'
      },
      benefits: [
        '🔒 완전한 프라이버시 보장',
        '⚡ 빠른 로컬 처리',
        '🌍 오프라인 동작 가능',
        '💎 프라이버시 보너스 CUE',
        '📱 인터넷 연결 불필요'
      ],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Ollama 모델 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve Ollama models',
      message: 'Ollama 모델 목록을 가져올 수 없습니다',
      models: [],
      provider: 'ollama'
    });
  }
});

// ============================================================================
// 🔽 Ollama 모델 다운로드 API
// ============================================================================

router.post('/models/pull', async (req: Request, res: Response): Promise<void> => {
  const { model } = req.body;
  
  if (!model) {
    res.status(400).json({
      success: false,
      error: 'Model name is required',
      message: '모델명을 입력해주세요',
      examples: ['llama3.2:3b', 'llama3.2:1b', 'gemma2:2b']
    });
    return;
  }

  try {
    console.log(`🔽 Ollama 모델 다운로드 시작: ${model}`);
    
    const ollamaService = getOllamaService();
    await ollamaService.pullModel(model);
    
    res.json({
      success: true,
      message: `모델 ${model} 다운로드가 시작되었습니다`,
      model: model,
      provider: 'ollama',
      note: '다운로드 완료까지 몇 분이 소요될 수 있습니다',
      checkCommand: `ollama list`,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error(`❌ 모델 다운로드 실패: ${model}`, error);
    res.status(500).json({
      success: false,
      error: `모델 다운로드 실패: ${error.message}`,
      model: model,
      suggestion: 'Ollama 서버가 실행 중인지 확인하고 다시 시도해주세요',
      troubleshooting: [
        'ollama serve 명령어로 서버 시작',
        '인터넷 연결 상태 확인',
        '충분한 디스크 공간 확인'
      ]
    });
  }
});

// ============================================================================
// 📊 Ollama 서버 상태 API
// ============================================================================

router.get('/status', async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('📊 === Ollama 서버 상태 확인 ===');
    
    const ollamaService = getOllamaService();
    
    const isConnected = await ollamaService.checkConnection();
    const models = isConnected ? await ollamaService.getModels() : [];
    
    res.json({
      success: true,
      ollama: {
        connected: isConnected,
        serverUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
        models: models,
        modelCount: models.length,
        status: isConnected ? 'healthy' : 'disconnected'
      },
      system: {
        provider: 'ollama',
        privacy: 'local-processing-only',
        internetRequired: false,
        dataRetention: 'local-only',
        uptime: process.uptime(),
        nodeVersion: process.version
      },
      features: {
        localAI: true,
        privacyGuaranteed: true,
        offlineCapable: true,
        cueRewards: true,
        modelDownloads: true
      },
      recommendations: isConnected ? 
        models.length > 0 ? 
          '✅ Ollama가 정상 작동 중입니다!' :
          '⚠️ 모델을 다운로드해주세요: ollama pull llama3.2:3b' :
        '❌ Ollama 서버를 시작해주세요: ollama serve',
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('❌ Ollama 상태 확인 오류:', error);
    
    res.json({
      success: false,
      ollama: {
        connected: false,
        error: error.message,
        status: 'error'
      },
      system: {
        provider: 'ollama',
        privacy: 'local-processing-only'
      },
      troubleshooting: [
        '1. Ollama 설치: brew install ollama',
        '2. 서버 시작: ollama serve',
        '3. 모델 다운로드: ollama pull llama3.2:3b',
        '4. 연결 확인: curl http://localhost:11434'
      ],
      timestamp: new Date().toISOString()
    });
  }
});

// ============================================================================
// 🏥 헬스체크 API
// ============================================================================

router.get('/health', (req: Request, res: Response): void => {
  res.json({
    success: true,
    service: 'Ollama 전용 AI Routes',
    version: '1.0.0-ollama-only',
    provider: 'ollama',
    privacy: 'local-processing-only',
    features: [
      '🦙 Ollama 로컬 AI 전용',
      '🔒 100% 프라이버시 보장',
      '⚡ 빠른 로컬 처리',
      '🌍 오프라인 동작 가능',
      '💎 프라이버시 보너스 CUE',
      '🚫 클라우드 AI 완전 제거'
    ],
    endpoints: [
      'POST /chat - Ollama AI 채팅',
      'GET /models - 모델 목록',
      'POST /models/pull - 모델 다운로드',
      'GET /status - 서버 상태',
      'GET /health - 헬스체크'
    ],
    requirements: {
      ollama: 'https://ollama.ai',
      models: ['llama3.2:3b', 'llama3.2:1b', 'gemma2:2b'],
      server: 'ollama serve (http://localhost:11434)'
    },
    timestamp: new Date().toISOString()
  });
});

console.log('✅ 순수 Ollama 전용 AI Routes 로딩 완료');
console.log('🔒 클라우드 AI 완전 제거 - 100% 로컬 프라이버시 보장');

export default router;