// ============================================================================
// 📁 backend/src/app.ts 
// 🎯 Ollama 전용 AI 백엔드 (OpenAI, Anthropic 제거)
// 로컬 AI 모델만 지원하는 프라이버시 우선 버전
// ============================================================================

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import dotenv from 'dotenv';

// 환경변수 로딩
try {
  dotenv.config({ path: path.join(__dirname, '..', '.env') });
  dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });
  console.log('🔧 환경변수 파일 로딩 완료');
} catch (error) {
  console.warn('⚠️ .env 파일 로딩 실패, 시스템 환경변수 사용:', error);
}

// Express 앱 생성
const app = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

console.log('🚀 Ollama 전용 AI Express 서버 시작...');
console.log(`📍 포트: ${PORT}`);
console.log(`🌍 환경: ${NODE_ENV}`);
console.log('🦙 AI 모델: Ollama 로컬 AI 전용');

// ============================================================================
// 🦙 Ollama 서비스 관리
// ============================================================================

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';

// Ollama 연결 확인
async function checkOllamaConnection(): Promise<boolean> {
  try {
    const response = await fetch(`${OLLAMA_HOST}/api/tags`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000) // 5초 타임아웃
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

// Ollama 모델 목록 조회
async function getOllamaModels(): Promise<string[]> {
  try {
    const response = await fetch(`${OLLAMA_HOST}/api/tags`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    return data.models?.map((model: any) => model.name) || [];
  } catch (error: any) {
    console.error('❌ Ollama 모델 목록 조회 실패:', error.message);
    return [];
  }
}

// Ollama AI 응답 생성
async function generateOllamaResponse(model: string, prompt: string): Promise<string> {
  try {
    console.log(`🦙 Ollama API 호출: ${model}`);
    
    const response = await fetch(`${OLLAMA_HOST}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.7,
          num_predict: 1000
        }
      }),
      signal: AbortSignal.timeout(60000) // 60초 타임아웃
    });

    if (!response.ok) {
      throw new Error(`Ollama API HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const aiResponse = data.response || '응답을 생성할 수 없습니다.';
    
    console.log('✅ Ollama 응답 생성 성공');
    return aiResponse;
    
  } catch (error: any) {
    console.error('❌ Ollama API 오류:', error.message);
    throw error;
  }
}

// AI 응답 생성 (Ollama 전용)
async function generateAIResponse(message: string, model: string, userContext: any): Promise<{
  content: string;
  model: string;
  provider: string;
  error?: string;
}> {
  console.log(`🤖 AI 응답 생성 시작: ${model}`);

  // 개인화 시스템 프롬프트
  const systemPrompt = `당신은 CUE Protocol의 개인화된 AI 어시스턴트입니다.

사용자 정보:
- DID: ${userContext.userDid || 'unknown'}
- Trust Score: ${userContext.trustScore || 50}
- 대화 스타일: 친근하고 도움이 되는

지침:
1. 한국어로 정확하고 유용한 답변을 제공해주세요
2. CUE Protocol, AI 개인화, 블록체인에 대한 질문이면 더 자세히 설명해주세요
3. 사용자의 개인 정보를 바탕으로 맞춤형 응답을 제공해주세요
4. 간결하면서도 도움이 되는 답변을 해주세요

사용자 질문: ${message}

AI 답변:`;

  // Ollama 연결 확인
  const isConnected = await checkOllamaConnection();
  if (!isConnected) {
    console.log('⚠️ Ollama 서버 연결 실패, Mock 응답 사용');
    return {
      content: `Ollama 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.\n\n실행 방법:\n1. \`ollama serve\` 명령어로 서버 시작\n2. \`ollama pull ${model}\` 명령어로 모델 다운로드\n\n현재 질문 "${message}"에 대한 Mock 응답: CUE Protocol의 개인화 AI 시스템을 통해 답변을 제공하고 있습니다.`,
      model: `${model} (Mock)`,
      provider: 'mock',
      error: 'Ollama server not running'
    };
  }

  try {
    // Ollama AI 응답 생성
    const aiResponse = await generateOllamaResponse(model, systemPrompt);
    
    return {
      content: aiResponse,
      model: model,
      provider: 'ollama'
    };

  } catch (error: any) {
    console.error('❌ Ollama 응답 생성 실패:', error.message);
    
    // 오류 발생 시 도움말 포함한 Mock 응답
    const errorMessage = error.message.includes('model') 
      ? `모델 "${model}"을 찾을 수 없습니다. 다음 명령어로 모델을 다운로드하세요:\n\`ollama pull ${model}\``
      : `Ollama API 오류: ${error.message}`;
    
    return {
      content: `${errorMessage}\n\n현재 질문 "${message}"에 대한 응답: CUE Protocol의 AI Passport 시스템을 통해 개인화된 답변을 제공하려고 했지만, 로컬 AI 모델에 문제가 발생했습니다. Ollama 서버와 모델 상태를 확인해주세요.`,
      model: `${model} (오류)`,
      provider: 'ollama',
      error: error.message
    };
  }
}

// ============================================================================
// 🔧 기본 미들웨어 설정
// ============================================================================

// CORS 설정
app.use(cors({
  origin: [
    'http://localhost:3000', 
    'http://127.0.0.1:3000',
    'https://3c8e-125-142-232-68.ngrok-free.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 기본 미들웨어
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

if (NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// 로깅 미들웨어
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`📞 ${req.method} ${req.originalUrl}`);
  res.on('finish', () => {
    console.log(`✅ ${req.method} ${req.originalUrl} - ${res.statusCode}`);
  });
  next();
});

console.log('✅ 기본 미들웨어 설정 완료');

// ============================================================================
// 🧪 기본 테스트 라우트들
// ============================================================================

app.get('/test', async (req: Request, res: Response) => {
  console.log('🧪 기본 테스트 라우트 실행됨');
  
  const ollamaConnected = await checkOllamaConnection();
  const models = ollamaConnected ? await getOllamaModels() : [];
  
  res.json({ 
    message: 'Ollama 전용 서버 작동 중!', 
    timestamp: new Date().toISOString(),
    ollama: {
      host: OLLAMA_HOST,
      connected: ollamaConnected,
      models: models,
      recommended: ['llama3.2:3b', 'llama3.2:1b']
    }
  });
});

app.get('/health', async (req: Request, res: Response) => {
  console.log('🏥 헬스체크 실행됨');
  
  const ollamaConnected = await checkOllamaConnection();
  const models = ollamaConnected ? await getOllamaModels() : [];
  
  res.json({
    status: 'healthy',
    connected: true,
    mode: 'ollama-only',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: '1.0.0',
    service: 'Ollama AI Personal Backend',
    database: 'supabase',
    ai: {
      provider: 'ollama',
      host: OLLAMA_HOST,
      connected: ollamaConnected,
      models: models,
      modelCount: models.length,
      status: ollamaConnected ? 'ready' : 'disconnected'
    },
    services: {
      webauthn: true,
      ai: ollamaConnected,
      cue: true,
      vault: true
    }
  });
});

app.get('/ping', (req: Request, res: Response) => {
  console.log('🏓 Ping 실행됨');
  res.json({ 
    message: 'pong', 
    timestamp: new Date().toISOString(),
    ai: 'ollama-only'
  });
});

console.log('✅ 기본 테스트 라우트 등록 완료');

// ============================================================================
// 🦙 Ollama 전용 API
// ============================================================================

// Ollama 상태 확인
app.get('/api/ollama/status', async (req: Request, res: Response) => {
  console.log('🦙 Ollama 상태 확인');
  
  try {
    const isConnected = await checkOllamaConnection();
    const models = isConnected ? await getOllamaModels() : [];
    
    res.json({
      success: true,
      connected: isConnected,
      host: OLLAMA_HOST,
      models: models,
      modelCount: models.length,
      recommended: [
        {
          name: 'llama3.2:3b',
          size: '2.0GB',
          description: '빠르고 효율적인 대화형 모델',
          command: 'ollama pull llama3.2:3b'
        },
        {
          name: 'llama3.2:1b',
          size: '1.3GB', 
          description: '매우 빠른 경량 모델',
          command: 'ollama pull llama3.2:1b'
        }
      ],
      instructions: isConnected ? null : {
        install: 'brew install ollama',
        start: 'ollama serve',
        pullModel: 'ollama pull llama3.2:3b'
      }
    });
    
  } catch (error: any) {
    res.json({
      success: false,
      connected: false,
      error: error.message,
      host: OLLAMA_HOST,
      instructions: {
        install: 'brew install ollama',
        start: 'ollama serve', 
        pullModel: 'ollama pull llama3.2:3b'
      }
    });
  }
});

// 사용 가능한 모델 목록
app.get('/api/models', async (req: Request, res: Response) => {
  console.log('📋 모델 목록 조회');
  
  try {
    const isConnected = await checkOllamaConnection();
    
    if (!isConnected) {
      return res.json({
        success: false,
        message: 'Ollama 서버에 연결할 수 없습니다',
        models: [],
        instructions: 'ollama serve 명령어로 서버를 시작하세요'
      });
    }
    
    const ollamaModels = await getOllamaModels();
    
    const modelList = ollamaModels.map(modelName => {
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
               modelName.includes(':3b') ? 'fast' : 'moderate'
      };
    });
    
    // 기본 추천 모델도 포함
    const baseModels = [
      { 
        id: 'llama3.2:3b', 
        name: 'Llama 3.2 (3B)', 
        available: ollamaModels.includes('llama3.2:3b'),
        recommended: true,
        type: 'local',
        provider: 'ollama',
        description: '추천: 빠르고 정확한 대화형 모델',
        speed: 'fast'
      },
      { 
        id: 'llama3.2:1b', 
        name: 'Llama 3.2 (1B)', 
        available: ollamaModels.includes('llama3.2:1b'),
        recommended: true,
        type: 'local',
        provider: 'ollama',
        description: '추천: 매우 빠른 경량 모델',
        speed: 'very-fast'
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
      ollama: {
        connected: true,
        host: OLLAMA_HOST,
        modelCount: ollamaModels.length
      },
      models: allModels
    });

  } catch (error: any) {
    console.error('Error getting models:', error);
    res.json({
      success: false,
      error: 'Failed to retrieve models',
      models: [
        { 
          id: 'llama3.2:3b', 
          name: 'Llama 3.2 (3B)', 
          available: false, 
          recommended: true,
          note: 'ollama pull llama3.2:3b 명령어로 다운로드하세요'
        }
      ]
    });
  }
});

console.log('✅ Ollama API 라우트 등록 완료');

// ============================================================================
// 🔐 WebAuthn API (기존과 동일)
// ============================================================================

app.get('/api/auth/webauthn/test', (req: Request, res: Response) => {
  console.log('🧪 WebAuthn 테스트 실행됨');
  res.json({
    success: true,
    message: 'WebAuthn API is working',
    timestamp: new Date().toISOString()
  });
});

app.post('/api/auth/webauthn/register/start', (req: Request, res: Response) => {
  console.log('🔥 WebAuthn 등록 시작 실행됨');
  console.log('📝 요청 데이터:', req.body);
  
  const { userName, displayName, deviceInfo } = req.body;
  
  const response = {
    success: true,
    sessionId: `session_${Date.now()}`,
    options: {
      rp: { 
        name: process.env.WEBAUTHN_RP_NAME || 'AI Personal Assistant', 
        id: process.env.WEBAUTHN_RP_ID || 'localhost' 
      },
      user: {
        id: Buffer.from(`user_${Date.now()}`).toString('base64'),
        name: userName || `PassKey_User_${Date.now()}`,
        displayName: displayName || 'CUE User'
      },
      challenge: Buffer.from(`challenge_${Date.now()}`).toString('base64'),
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' },
        { alg: -257, type: 'public-key' }
      ],
      timeout: 60000,
      attestation: 'none'
    },
    message: '패스키 등록을 시작하세요'
  };
  
  res.json(response);
});

app.post('/api/auth/webauthn/register/complete', (req: Request, res: Response) => {
  console.log('🔥 WebAuthn 등록 완료 실행됨');
  console.log('📝 요청 데이터:', req.body);
  
  const { credential, sessionId } = req.body;
  const isExistingUser = Math.random() > 0.7;
  
  const mockUser = isExistingUser ? {
    id: 'existing_user_123',
    username: 'ExistingAgent',
    email: Math.random() > 0.5 ? 'existing@cueprotocol.ai' : null,
    userEmail: Math.random() > 0.5 ? 'existing@cueprotocol.ai' : null,
    display_name: 'Existing User',
    displayName: 'Existing User',
    did: 'did:cue:existing:123',
    wallet_address: '0x1234567890123456789012345678901234567890',
    walletAddress: '0x1234567890123456789012345678901234567890',
    cue_tokens: 8750 + Math.floor(Math.random() * 5000),
    cueBalance: 8750 + Math.floor(Math.random() * 5000),
    trust_score: 88 + Math.floor(Math.random() * 12),
    trustScore: 88 + Math.floor(Math.random() * 12),
    passport_level: 'Verified',
    passportLevel: 'Verified',
    biometric_verified: true,
    biometricVerified: true,
    auth_method: 'passkey',
    status: 'active',
    created_at: new Date(Date.now() - 86400000 * 14).toISOString(),
    registeredAt: new Date(Date.now() - 86400000 * 14).toISOString(),
    updated_at: new Date().toISOString(),
    lastLogin: new Date().toISOString()
  } : {
    id: `user_${Date.now()}`,
    username: `Agent${Math.floor(Math.random() * 10000)}`,
    email: Math.random() > 0.5 ? 'new@cueprotocol.ai' : null,
    userEmail: Math.random() > 0.5 ? 'new@cueprotocol.ai' : null,
    display_name: 'New User',
    displayName: 'New User',
    did: `did:cue:${Date.now()}`,
    wallet_address: `0x${Math.random().toString(16).substring(2, 42)}`,
    walletAddress: `0x${Math.random().toString(16).substring(2, 42)}`,
    cue_tokens: 15428,
    cueBalance: 15428,
    trust_score: 85,
    trustScore: 85,
    passport_level: 'Verified',
    passportLevel: 'Verified',
    biometric_verified: true,
    biometricVerified: true,
    auth_method: 'passkey',
    status: 'active',
    created_at: new Date().toISOString(),
    registeredAt: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    lastLogin: new Date().toISOString()
  };
  
  const sessionToken = `token_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
  
  const response = {
    success: true,
    sessionId: sessionId,
    sessionToken: sessionToken,
    isExistingUser: isExistingUser,
    action: isExistingUser ? 'login' : 'register',
    user: mockUser,
    message: isExistingUser 
      ? '기존 계정으로 로그인되었습니다. 모든 데이터가 유지됩니다.'
      : '새로운 AI Passport가 생성되었습니다!',
    rewards: isExistingUser ? undefined : { welcomeCUE: 15428 },
    cueBalance: mockUser.cueBalance,
    timestamp: new Date().toISOString()
  };
  
  res.json(response);
});

app.post('/api/auth/webauthn/login/start', (req: Request, res: Response) => {
  console.log('🔑 WebAuthn 로그인 시작 실행됨');
  
  const response = {
    success: true,
    sessionId: `login_session_${Date.now()}`,
    options: {
      challenge: Buffer.from(`challenge_${Date.now()}`).toString('base64'),
      timeout: 60000,
      rpId: process.env.WEBAUTHN_RP_ID || 'localhost',
      allowCredentials: []
    },
    message: '등록된 패스키로 로그인하세요'
  };
  
  res.json(response);
});

app.post('/api/auth/webauthn/login/complete', (req: Request, res: Response) => {
  console.log('🔑 WebAuthn 로그인 완료 실행됨');
  
  const { credential, sessionId } = req.body;
  
  const mockUser = {
    id: 'existing_user_123',
    username: 'ExistingAgent',
    email: Math.random() > 0.3 ? 'existing@cueprotocol.ai' : null,
    userEmail: Math.random() > 0.3 ? 'existing@cueprotocol.ai' : null,
    display_name: 'Returning User',
    displayName: 'Returning User',
    did: 'did:cue:existing:123',
    wallet_address: '0x1234567890123456789012345678901234567890',
    walletAddress: '0x1234567890123456789012345678901234567890',
    cue_tokens: 8750 + Math.floor(Math.random() * 5000),
    cueBalance: 8750 + Math.floor(Math.random() * 5000),
    trust_score: 90 + Math.floor(Math.random() * 10),
    trustScore: 90 + Math.floor(Math.random() * 10),
    passport_level: 'Verified',
    passportLevel: 'Verified',
    biometric_verified: true,
    biometricVerified: true,
    auth_method: 'passkey',
    status: 'active',
    created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
    registeredAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    updated_at: new Date().toISOString(),
    lastLogin: new Date().toISOString()
  };
  
  const sessionToken = `token_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
  
  const response = {
    success: true,
    sessionId: sessionId,
    sessionToken: sessionToken,
    isExistingUser: true,
    action: 'login',
    user: mockUser,
    message: '로그인이 완료되었습니다',
    cueBalance: mockUser.cueBalance,
    timestamp: new Date().toISOString()
  };
  
  res.json(response);
});

console.log('✅ WebAuthn API 라우트 등록 완료');

// ============================================================================
// 🔧 세션 관리 API
// ============================================================================

app.post('/api/auth/session/restore', (req: Request, res: Response) => {
  console.log('🔄 세션 복원 요청 수신');
  console.log('📝 요청 데이터:', req.body);
  
  const { sessionToken, sessionId } = req.body;
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.replace('Bearer ', '');
  
  const token = sessionToken || bearerToken;
  
  if (!token && !sessionId) {
    return res.status(401).json({
      success: false,
      error: 'No token or session ID provided'
    });
  }
  
  if (Math.random() > 0.3) {
    const mockUser = {
      id: 'restored_user_123',
      username: 'RestoredAgent',
      email: Math.random() > 0.3 ? 'restored@cueprotocol.ai' : null,
      userEmail: Math.random() > 0.3 ? 'restored@cueprotocol.ai' : null,
      display_name: 'Restored User',
      displayName: 'Restored User',
      did: 'did:cue:restored:123',
      wallet_address: '0x1234567890123456789012345678901234567890',
      walletAddress: '0x1234567890123456789012345678901234567890',
      cue_tokens: 8750 + Math.floor(Math.random() * 5000),
      cueBalance: 8750 + Math.floor(Math.random() * 5000),
      trust_score: 90 + Math.floor(Math.random() * 10),
      trustScore: 90 + Math.floor(Math.random() * 10),
      passport_level: 'Verified',
      passportLevel: 'Verified',
      biometric_verified: true,
      biometricVerified: true,
      auth_method: 'passkey',
      created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
      registeredAt: new Date(Date.now() - 86400000 * 7).toISOString(),
      updated_at: new Date().toISOString(),
      lastLogin: new Date().toISOString()
    };
    
    res.json({
      success: true,
      user: mockUser,
      message: '세션이 복원되었습니다'
    });
  } else {
    res.status(401).json({
      success: false,
      error: 'No valid session found'
    });
  }
});

app.post('/api/auth/logout', (req: Request, res: Response) => {
  console.log('👋 로그아웃 요청 수신');
  console.log('📝 요청 데이터:', req.body);
  
  res.json({
    success: true,
    message: '로그아웃이 완료되었습니다'
  });
});

console.log('✅ 세션 관리 API 라우트 등록 완료');

// ============================================================================
// 🎫 Passport API
// ============================================================================

app.get('/api/passport/:did', (req: Request, res: Response) => {
  console.log('🎫 Passport 조회 실행됨');
  console.log('📝 DID:', req.params.did);
  
  const mockPassport = {
    success: true,
    did: req.params.did,
    username: `Agent_${req.params.did.slice(-8)}`,
    trustScore: 85 + Math.floor(Math.random() * 15),
    passportLevel: 'Verified Agent',
    cueBalance: 2500 + Math.floor(Math.random() * 3000),
    cueTokens: 2500 + Math.floor(Math.random() * 3000),
    totalMined: 25000 + Math.floor(Math.random() * 50000),
    personalityProfile: {
      traits: ['창의적', '분석적', '신뢰할 수 있는'],
      communicationStyle: 'friendly',
      expertise: ['AI', 'Web3', 'Protocol Design'],
      preferences: {
        communication_style: 'detailed',
        information_depth: 'comprehensive',
        response_tone: 'professional'
      }
    },
    dataVaults: [
      {
        name: 'Personal Data',
        type: 'encrypted',
        size: '1.2MB',
        items: 247,
        cueCount: 15
      },
      {
        name: 'AI Conversations',
        type: 'conversations',
        size: '856KB',
        items: 89,
        cueCount: 8
      },
      {
        name: 'Knowledge Vault',
        type: 'knowledge',
        size: '15.7MB',
        items: 234,
        cueCount: 23
      }
    ],
    connectedPlatforms: ['Local AI (Ollama)', 'Blockchain', 'CUE Protocol'],
    achievements: [
      {
        name: 'Privacy First',
        icon: '🔒',
        earned: true,
        description: '로컬 AI 모델 사용으로 완전한 프라이버시 확보'
      },
      {
        name: 'Verified Identity',
        icon: '✅',
        earned: true,
        description: '생체인증으로 신원 확인'
      },
      {
        name: 'Trusted Agent',
        icon: '🛡️',
        earned: true,
        description: '신뢰도 90% 달성'
      },
      {
        name: 'Local AI Master',
        icon: '🦙',
        earned: false,
        description: 'Ollama 모델 5개 이상 사용'
      }
    ],
    ragDagStats: {
      learnedConcepts: 247,
      connectionStrength: 0.87,
      lastLearningActivity: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      knowledgeNodes: 1456,
      personalityAccuracy: 0.94
    },
    recentActivity: [
      {
        type: 'passport_created',
        description: 'AI Passport 생성됨',
        timestamp: new Date().toISOString()
      },
      {
        type: 'chat',
        description: 'Ollama로 AI와 대화',
        timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString()
      },
      {
        type: 'mining',
        description: '15 CUE 토큰 마이닝',
        timestamp: new Date(Date.now() - 12 * 60 * 1000).toISOString()
      }
    ],
    lastUpdated: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    timestamp: new Date().toISOString()
  };
  
  res.json(mockPassport);
});

console.log('✅ Passport API 라우트 등록 완료');

// ============================================================================
// 🤖 AI Chat API (Ollama 전용)
// ============================================================================

app.post('/api/ai/chat', async (req: Request, res: Response) => {
  console.log('🤖 AI 채팅 실행됨 (Ollama 전용)');
  console.log('📝 요청:', req.body);
  
  const { message, conversationId, model, userDid, userId } = req.body;
  
  try {
    // 사용자 컨텍스트 구성
    const userContext = {
      userDid: userDid,
      userId: userId,
      trustScore: 85 + Math.floor(Math.random() * 15),
      conversationId: conversationId
    };

    // 모델 이름 정규화 (기본값: llama3.2:3b)
    const aiModel = model || 'llama3.2:3b';

    // Ollama AI 응답 생성
    const aiResult = await generateAIResponse(message, aiModel, userContext);
    
    const cueEarned = Math.floor(Math.random() * 15) + 5;
    
    // PersistentDataAPIClient 호환 응답 형식
    const response = {
      success: true,
      message: {
        content: aiResult.content,
        conversationId: conversationId || `conv_${Date.now()}`,
        messageId: `msg_${Date.now()}`,
        timestamp: new Date().toISOString(),
        personalityContext: {
          adaptedFor: 'analytical_user',
          tone: 'professional',
          depth: 'comprehensive'
        },
        cueTokensEarned: cueEarned,
        // Ollama 정보 추가
        aiModel: aiResult.model,
        provider: aiResult.provider,
        error: aiResult.error,
        privacy: 'local-only'
      },
      response: aiResult.content,
      model: aiResult.model,
      cueReward: cueEarned,
      cueEarned: cueEarned,
      trustScore: 0.85 + Math.random() * 0.15,
      contextLearned: true,
      qualityScore: 0.88 + Math.random() * 0.12,
      processingTime: Math.floor(Math.random() * 3000) + 1000, // Ollama는 더 오래 걸릴 수 있음
      timestamp: new Date().toISOString(),
      // 디버깅 정보
      debug: {
        provider: 'ollama',
        modelUsed: aiResult.model,
        hasError: !!aiResult.error,
        privacy: 'local-processing-only'
      }
    };
    
    res.json(response);

  } catch (error: any) {
    console.error('💥 AI 채팅 오류:', error);
    
    // 오류 발생 시 도움말 포함한 응답
    const errorResponse = {
      success: true,
      message: {
        content: `Ollama AI 서비스에 문제가 발생했습니다.\n\n오류: ${error.message}\n\n해결 방법:\n1. \`ollama serve\` 명령어로 Ollama 서버 시작\n2. \`ollama pull llama3.2:3b\` 명령어로 모델 다운로드\n3. 모델이 다운로드될 때까지 잠시 기다린 후 다시 시도\n\n현재 질문 "${message}"에 대한 응답을 위해 Ollama 설정을 확인해주세요.`,
        conversationId: conversationId || `conv_${Date.now()}`,
        messageId: `msg_${Date.now()}`,
        timestamp: new Date().toISOString(),
        cueTokensEarned: 2,
        error: error.message,
        helpUrl: 'https://ollama.ai'
      },
      response: `Ollama 서비스 오류: ${error.message}`,
      model: `${model || 'llama3.2:3b'} (오류)`,
      cueReward: 2,
      cueEarned: 2,
      timestamp: new Date().toISOString(),
      debug: {
        error: error.message,
        provider: 'ollama',
        fallbackUsed: true,
        instructions: 'ollama serve && ollama pull llama3.2:3b'
      }
    };
    
    res.json(errorResponse);
  }
});

console.log('✅ AI Chat API 라우트 등록 완료 (Ollama 전용)');

// ============================================================================
// 💰 CUE API
// ============================================================================

app.get('/api/cue/balance/:did', (req: Request, res: Response) => {
  console.log('💰 CUE 잔액 조회 실행됨');
  
  res.json({
    success: true,
    balance: Math.floor(Math.random() * 1000) + 100,
    did: req.params.did,
    lastUpdated: new Date().toISOString()
  });
});

app.post('/api/cue/mine', (req: Request, res: Response) => {
  console.log('⛏️ CUE 마이닝 실행됨');
  console.log('📝 요청:', req.body);
  
  const { userDid, activity } = req.body;
  const earned = Math.floor(Math.random() * 10) + 1;
  const newBalance = Math.floor(Math.random() * 1000) + 100 + earned;
  
  res.json({
    success: true,
    amount: earned,
    earned: earned,
    totalBalance: newBalance,
    newBalance: newBalance,
    activity: activity || 'ollama_chat',
    breakdown: {
      baseReward: Math.floor(Math.random() * 3) + 1,
      privacyBonus: 2, // 로컬 AI 사용 보너스
      qualityBonus: Math.floor(Math.random() * 2),
      conversationBonus: Math.floor(Math.random() * 1)
    },
    timestamp: new Date().toISOString(),
    note: '로컬 AI 사용으로 프라이버시 보너스 적용'
  });
});

console.log('✅ CUE API 라우트 등록 완료');

// ============================================================================
// 🔍 Debug API
// ============================================================================

app.get('/api/debug/routes', async (req: Request, res: Response) => {
  console.log('🔍 라우트 디버그 실행됨');
  
  const ollamaConnected = await checkOllamaConnection();
  const models = ollamaConnected ? await getOllamaModels() : [];
  
  const routes = [
    'GET /test',
    'GET /health', 
    'GET /ping',
    'GET /api/ollama/status',
    'GET /api/models',
    'GET /api/auth/webauthn/test',
    'POST /api/auth/webauthn/register/start',
    'POST /api/auth/webauthn/register/complete',
    'POST /api/auth/webauthn/login/start',
    'POST /api/auth/webauthn/login/complete',
    'POST /api/auth/session/restore',
    'POST /api/auth/logout',
    'GET /api/passport/:did',
    'POST /api/ai/chat (🦙 Ollama 전용)',
    'GET /api/cue/balance/:did',
    'POST /api/cue/mine',
    'GET /api/debug/routes'
  ];
  
  res.json({
    success: true,
    routes: routes,
    total: routes.length,
    timestamp: new Date().toISOString(),
    note: 'Ollama 전용 AI 백엔드',
    ollama: {
      host: OLLAMA_HOST,
      connected: ollamaConnected,
      models: models,
      modelCount: models.length,
      status: ollamaConnected ? 'ready' : 'disconnected',
      instructions: ollamaConnected ? null : {
        start: 'ollama serve',
        pullModel: 'ollama pull llama3.2:3b'
      }
    },
    privacy: 'local-processing-only'
  });
});

console.log('✅ Debug API 라우트 등록 완료');

// ============================================================================
// 🚫 404 핸들러
// ============================================================================

app.use('*', (req: Request, res: Response) => {
  console.log(`❌ 404 - 경로를 찾을 수 없음: ${req.method} ${req.originalUrl}`);
  
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
    availableEndpoints: [
      'GET /test',
      'GET /health',
      'GET /ping',
      'GET /api/ollama/status',
      'GET /api/models',
      'GET /api/auth/webauthn/test',
      'POST /api/auth/webauthn/register/start',
      'POST /api/auth/webauthn/register/complete',
      'POST /api/auth/webauthn/login/start',
      'POST /api/auth/webauthn/login/complete',
      'POST /api/auth/session/restore',
      'POST /api/auth/logout',
      'GET /api/passport/:did',
      'POST /api/ai/chat',
      'GET /api/cue/balance/:did',
      'POST /api/cue/mine',
      'GET /api/debug/routes'
    ]
  });
});

// ============================================================================
// 🚀 서버 시작
// ============================================================================

const server = app.listen(PORT, async () => {
  console.log('\n🚀 ================================');
  console.log('🚀 Ollama 전용 AI 백엔드 서버 시작됨');
  console.log('🚀 ================================');
  console.log(`📍 서버: http://localhost:${PORT}`);
  console.log(`🏥 헬스체크: http://localhost:${PORT}/health`);
  console.log(`🧪 테스트: http://localhost:${PORT}/test`);
  console.log('📋 주요 기능:');
  console.log('  🔐 WebAuthn: 패스키 등록/로그인');
  console.log('  🎫 Passport: AI 개인성향 프로필');
  console.log('  🤖 AI Chat: Ollama 로컬 AI 전용');
  console.log('  💰 CUE: 토큰 마이닝 (프라이버시 보너스 포함)');
  console.log('  🔧 Session: JWT 기반 세션 관리');
  
  // Ollama 상태 확인
  console.log('🦙 Ollama 상태 확인 중...');
  const ollamaConnected = await checkOllamaConnection();
  const models = ollamaConnected ? await getOllamaModels() : [];
  
  console.log(`📡 Ollama 서버: ${ollamaConnected ? '✅ 연결됨' : '❌ 연결 실패'}`);
  console.log(`📍 Ollama 호스트: ${OLLAMA_HOST}`);
  
  if (ollamaConnected) {
    console.log(`🤖 사용 가능한 모델: ${models.length}개`);
    if (models.length > 0) {
      console.log(`   추천 모델: ${models.filter(m => m.includes('llama3.2')).join(', ') || models[0]}`);
    }
  } else {
    console.log('⚠️ Ollama 설정 방법:');
    console.log('   1. brew install ollama');
    console.log('   2. ollama serve');
    console.log('   3. ollama pull llama3.2:3b');
  }
  
  console.log('📋 주요 API:');
  console.log('  🔐 WebAuthn: /api/auth/webauthn/*');
  console.log('  🔧 Session: /api/auth/session/*');
  console.log('  🎫 Passport: /api/passport/:did');
  console.log('  🤖 AI Chat: /api/ai/chat (Ollama 전용)');
  console.log('  🦙 Ollama: /api/ollama/status');
  console.log('  📋 Models: /api/models');
  console.log('  💰 CUE: /api/cue/*');
  if (NODE_ENV === 'development') {
    console.log('  🔍 Debug: /api/debug/*');
    console.log('  🧪 테스트: /api/auth/webauthn/test');
  }
  console.log('🔒 완전한 로컬 프라이버시 보장');
  console.log('🚀 ================================\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 서버 종료 중...');
  server.close(() => {
    console.log('✅ 서버가 정상적으로 종료되었습니다');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 서버 종료 중...');
  server.close(() => {
    console.log('✅ 서버가 정상적으로 종료되었습니다');
    process.exit(0);
  });
});

export default app;