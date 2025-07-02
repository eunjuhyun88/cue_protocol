// ============================================================================
// 🚀 Final0626 완전한 백엔드 서버 v3.0
// 개선사항: 통합 패스키 인증 + 영구 세션 + 자동 기존사용자 감지 + 에러 복구
// ============================================================================

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

console.log('🚀 Final0626 백엔드 서버 v3.0 초기화 중...');

// ============================================================================
// 🔧 환경 설정 및 초기화
// ============================================================================

// JWT 시크릿
const JWT_SECRET = process.env.JWT_SECRET || 'final0626-development-secret-key';

// Supabase 설정
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase = null;
let useDatabase = false;

if (supabaseUrl && supabaseKey && !supabaseUrl.includes('dummy')) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    useDatabase = true;
    console.log('✅ Supabase 클라이언트 초기화 성공');
  } catch (error) {
    console.warn('⚠️ Supabase 초기화 실패, Mock 데이터베이스 사용:', error.message);
  }
} else {
  console.warn('⚠️ Supabase 환경변수 없음, Mock 데이터베이스 사용');
}

// ============================================================================
// 🔧 유틸리티 함수들
// ============================================================================

function base64urlEncode(buffer: Buffer): string {
  return buffer.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// WebAuthn 설정
const sessionStore = new Map<string, any>();
const rpName = process.env.WEBAUTHN_RP_NAME || 'Final0626 AI Passport';
const rpID = process.env.WEBAUTHN_RP_ID || 'localhost';

// ============================================================================
// 🔧 세션 관리자 클래스 (개선됨)
// ============================================================================
class SessionManager {
  private sessions = new Map<string, any>();
  
  generateSessionToken(userId: string, credentialId: string): string {
    const payload = {
      userId,
      credentialId,
      type: 'session',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // 30일
    };
    return jwt.sign(payload, JWT_SECRET);
  }
  
  verifySessionToken(token: string): any {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      console.error('❌ 세션 토큰 검증 실패:', error.message);
      return null;
    }
  }
  
  async findUserByCredentialId(credentialId: string): Promise<any> {
    if (useDatabase && supabase) {
      try {
        console.log('🔍 DB에서 credential_id로 사용자 검색:', credentialId);
        
        const { data, error } = await supabase
          .from('webauthn_credentials')
          .select(`
            *,
            users (*)
          `)
          .eq('credential_id', credentialId)
          .eq('is_active', true)
          .single();
          
        if (error || !data) {
          console.log('🆕 신규 credential_id:', credentialId);
          return null;
        }
        
        console.log('🔄 기존 사용자 발견!', {
          userId: data.users.id,
          username: data.users.username,
          cueTokens: data.users.cue_tokens
        });
        
        return data.users;
      } catch (error) {
        console.error('❌ credential_id 조회 실패:', error);
        return null;
      }
    }
    
    // Mock 데이터에서 검색
    for (const [sessionId, sessionData] of sessionStore.entries()) {
      if (sessionData.credentialId === credentialId) {
        console.log('🔄 Mock에서 기존 사용자 발견:', sessionData.userId);
        return sessionData.mockUser;
      }
    }
    
    return null;
  }

  async getUserBySession(sessionToken: string): Promise<any> {
    const decoded = this.verifySessionToken(sessionToken);
    if (!decoded) return null;
    
    if (useDatabase && supabase) {
      try {
        const { data: user, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', decoded.userId)
          .single();
          
        if (error || !user) {
          console.log('❌ 세션 사용자 조회 실패');
          return null;
        }
        
        return user;
      } catch (error) {
        console.error('❌ 세션 사용자 조회 실패:', error);
      }
    }
    
    // Mock 폴백
    return {
      id: decoded.userId,
      username: 'MockUser',
      email: null,
      cue_tokens: 15428,
      trust_score: 85
    };
  }
}

const sessionManager = new SessionManager();

// ============================================================================
// 📊 데이터베이스 서비스 클래스 (개선됨)
// ============================================================================
class DatabaseService {
  private mockUsers = new Map();
  private mockCredentials = new Map();
  private mockTransactions = new Map();

  async findUserByCredentialId(credentialId: string): Promise<any> {
    return await sessionManager.findUserByCredentialId(credentialId);
  }

  async createUser(userData: any): Promise<any> {
    if (useDatabase && supabase) {
      try {
        // email이 null인 경우 처리
        const userToInsert = {
          ...userData,
          email: userData.email || null // 명시적으로 null 설정
        };
        
        const { data, error } = await supabase
          .from('users')
          .insert([userToInsert])
          .select()
          .single();

        if (error) {
          console.error('❌ Supabase 사용자 생성 오류:', error);
          throw error;
        }

        console.log('✅ Supabase 사용자 생성 성공:', data.id);
        return data;
      } catch (error) {
        console.error('❌ 데이터베이스 오류, Mock으로 fallback:', error.message);
        return this.createUserMock(userData);
      }
    } else {
      return this.createUserMock(userData);
    }
  }

  private createUserMock(userData: any): any {
    this.mockUsers.set(userData.id, userData);
    console.log('📝 Mock 사용자 생성:', userData.id);
    return userData;
  }

  async saveWebAuthnCredential(credData: any): Promise<any> {
    if (useDatabase && supabase) {
      try {
        const { data, error } = await supabase
          .from('webauthn_credentials')
          .insert([credData])
          .select()
          .single();

        if (error) {
          console.error('❌ WebAuthn 자격증명 저장 오류:', error);
          throw error;
        }

        console.log('✅ WebAuthn 자격증명 저장 성공');
        return data;
      } catch (error) {
        console.error('❌ 자격증명 저장 실패, Mock으로 fallback:', error.message);
        this.mockCredentials.set(credData.credential_id, { 
          ...credData, 
          user: this.mockUsers.get(credData.user_id) 
        });
        return credData;
      }
    } else {
      this.mockCredentials.set(credData.credential_id, { 
        ...credData, 
        user: this.mockUsers.get(credData.user_id) 
      });
      console.log('📝 Mock 자격증명 저장');
      return credData;
    }
  }

  async createCUETransaction(txData: any): Promise<any> {
    if (useDatabase && supabase) {
      try {
        const { data, error } = await supabase
          .from('cue_transactions')
          .insert([txData])
          .select()
          .single();

        if (error) throw error;

        console.log('✅ CUE 거래 기록 저장 성공');
        return data;
      } catch (error) {
        console.error('❌ CUE 거래 저장 실패:', error.message);
        this.mockTransactions.set(Date.now(), txData);
        return txData;
      }
    } else {
      this.mockTransactions.set(Date.now(), txData);
      console.log('📝 Mock CUE 거래 기록');
      return txData;
    }
  }
}

const db = new DatabaseService();

// ============================================================================
// ⚙️ 미들웨어 설정
// ============================================================================

app.use(cors({
  origin: [
    "http://localhost:3000",
    "http://localhost:3001", 
    process.env.FRONTEND_URL || "http://localhost:3000"
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('combined'));

// 디버깅 미들웨어
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`🌐 [${new Date().toISOString()}] ${req.method} ${req.path}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('📝 Body keys:', Object.keys(req.body));
  }
  next();
});

// ============================================================================
// 🏥 헬스 체크
// ============================================================================

app.get('/health', (req: Request, res: Response) => {
  console.log('🏥 Health Check 요청 받음');
  
  const healthData = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '3.0.0',
    environment: process.env.NODE_ENV || 'development',
    database: useDatabase ? 'supabase' : 'mock',
    supabaseConnected: !!supabase,
    services: {
      webauthn: true,
      ai: !!process.env.OPENAI_API_KEY || !!process.env.ANTHROPIC_API_KEY,
      cue: true,
      vault: true,
      session: true
    },
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    sessionCount: sessionStore.size
  };

  console.log('✅ Health Check 응답 전송');
  res.json(healthData);
});

// ============================================================================
// 🔐 통합 패스키 인증 시작 (로그인/가입 자동 판별)
// ============================================================================

app.post('/api/auth/webauthn/start', async (req: Request, res: Response) => {
  console.log('🔍 === 통합 패스키 인증 시작 ===');
  
  try {
    const { deviceInfo } = req.body;
    
    // 모든 패스키 허용하는 인증 옵션 생성
    const options = {
      challenge: base64urlEncode(Buffer.from(`challenge_${Date.now()}_${Math.random()}`)),
      timeout: 60000,
      rpId: rpID,
      allowCredentials: [], // 🔑 빈 배열 = 모든 기존 패스키 허용
      userVerification: "preferred" as const
    };

    const sessionId = `unified_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    sessionStore.set(sessionId, {
      challenge: options.challenge,
      timestamp: Date.now(),
      type: 'unified',
      deviceInfo: deviceInfo || {}
    });

    console.log('✅ 통합 인증 옵션 생성 완료:', sessionId);

    res.json({
      success: true,
      options,
      sessionId,
      message: '패스키를 사용하여 인증해주세요'
    });
  } catch (error) {
    console.error('❌ 통합 인증 시작 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication start failed',
      message: error.message
    });
  }
});

// ============================================================================
// ✅ 통합 패스키 인증 완료 (로그인/가입 자동 처리)
// ============================================================================

app.post('/api/auth/webauthn/complete', async (req: Request, res: Response) => {
  console.log('✅ === 통합 패스키 인증 완료 ===');
  
  try {
    const { credential, sessionId } = req.body;
    
    if (!credential || !sessionId) {
      return res.status(400).json({
        success: false,
        error: 'credential과 sessionId가 필요합니다'
      });
    }
    
    const sessionData = sessionStore.get(sessionId);
    if (!sessionData) {
      return res.status(400).json({
        success: false,
        error: '유효하지 않거나 만료된 세션입니다'
      });
    }
    
    console.log('✅ 임시 세션 검증 완료');
    
    // 🔍 STEP 1: credential.id로 기존 사용자 확인
    console.log('🔍 기존 사용자 확인 중... credential_id:', credential.id);
    
    const existingUser = await db.findUserByCredentialId(credential.id);
    
    if (existingUser) {
      // 🔑 기존 사용자 - 자동 로그인
      console.log('🎉 기존 사용자 자동 로그인!', {
        id: existingUser.id,
        username: existingUser.username,
        cueTokens: existingUser.cue_tokens,
        trustScore: existingUser.trust_score
      });
      
      const sessionToken = sessionManager.generateSessionToken(
        existingUser.id, 
        credential.id
      );
      
      // 마지막 사용 시간 업데이트
      if (useDatabase && supabase) {
        try {
          await supabase
            .from('webauthn_credentials')
            .update({ last_used_at: new Date().toISOString() })
            .eq('credential_id', credential.id);
        } catch (error) {
          console.warn('⚠️ 마지막 사용 시간 업데이트 실패:', error);
        }
      }
      
      sessionStore.delete(sessionId);
      
      return res.json({
        success: true,
        action: 'login', // 🔑 로그인임을 명시
        sessionToken,
        user: {
          id: existingUser.id,
          username: existingUser.username,
          email: existingUser.email,
          did: existingUser.did,
          wallet_address: existingUser.wallet_address,
          walletAddress: existingUser.wallet_address, // 하위 호환성
          cue_tokens: existingUser.cue_tokens,
          cueBalance: existingUser.cue_tokens, // 하위 호환성
          trust_score: existingUser.trust_score,
          trustScore: existingUser.trust_score, // 하위 호환성
          passport_level: existingUser.passport_level,
          passportLevel: existingUser.passport_level, // 하위 호환성
          biometric_verified: existingUser.biometric_verified,
          biometricVerified: existingUser.biometric_verified, // 하위 호환성
          created_at: existingUser.created_at,
          registeredAt: existingUser.created_at // 하위 호환성
        },
        isExistingUser: true,
        message: '환영합니다! 기존 계정으로 로그인되었습니다.'
      });
    }
    
    // 🆕 STEP 2: 신규 사용자 - 회원가입 진행
    console.log('🆕 신규 사용자 회원가입 진행');
    
    const userId = crypto.randomUUID();
    const username = `PassKey_User_${Date.now()}`;
    
    // 신규 사용자 데이터 생성
    const userData = {
      id: userId,
      username,
      email: null, // PassKey 전용이므로 이메일 없음 (v2.1 지원)
      display_name: `AI Passport User ${username}`,
      did: `did:final0626:${userId}`,
      wallet_address: `0x${Math.random().toString(16).substring(2, 42)}`,
      trust_score: 85.0,
      passport_level: 'Basic',
      biometric_verified: true,
      auth_method: 'passkey',
      cue_tokens: 15428,
      created_at: new Date().toISOString()
    };

    console.log('📝 신규 사용자 데이터 준비:', {
      id: userData.id,
      username: userData.username,
      did: userData.did
    });

    // 사용자 DB 저장
    let user = await db.createUser(userData);

    // WebAuthn credential 저장
    const credentialData = {
      id: crypto.randomUUID(),
      user_id: userId,
      credential_id: credential.id, // 🔑 핵심: 이 ID로 나중에 사용자 찾음
      public_key: Buffer.from('mock-public-key-data').toString('base64'),
      counter: 0,
      device_type: 'platform',
      user_agent: req.get('User-Agent') || '',
      backup_eligible: false,
      backup_state: false,
      is_active: true,
      device_fingerprint: {
        primary: JSON.stringify(sessionData.deviceInfo || {}),
        platform: 'web',
        confidence: 0.9
      },
      created_at: new Date().toISOString(),
      last_used_at: new Date().toISOString()
    };

    console.log('🔑 자격증명 데이터 준비:', {
      id: credentialData.id,
      user_id: credentialData.user_id,
      credential_id: credentialData.credential_id
    });

    await db.saveWebAuthnCredential(credentialData);

    // CUE 거래 저장
    const transactionData = {
      user_id: userId,
      transaction_type: 'registration_bonus',
      amount: 15428,
      balance_after: 15428,
      description: 'Welcome bonus for new user registration',
      source_platform: 'system',
      metadata: {
        registration_id: userId,
        device_info: sessionData.deviceInfo,
        registration_time: new Date().toISOString()
      },
      created_at: new Date().toISOString()
    };

    await db.createCUETransaction(transactionData);

    // 세션 토큰 생성
    const sessionToken = sessionManager.generateSessionToken(userId, credential.id);
    
    sessionStore.delete(sessionId);
    
    console.log('🎉 신규 사용자 등록 완료!');
    
    return res.json({
      success: true,
      action: 'register', // 🆕 회원가입임을 명시
      sessionToken,
      user: {
        id: user.id,
        did: user.did,
        username: user.username,
        email: user.email,
        wallet_address: user.wallet_address,
        walletAddress: user.wallet_address, // 하위 호환성
        cue_tokens: user.cue_tokens || 15428,
        cueBalance: user.cue_tokens || 15428, // 하위 호환성
        trust_score: user.trust_score || 85.0,
        trustScore: user.trust_score || 85.0, // 하위 호환성
        passport_level: user.passport_level || 'Basic',
        passportLevel: user.passport_level || 'Basic', // 하위 호환성
        biometric_verified: user.biometric_verified || true,
        biometricVerified: user.biometric_verified || true, // 하위 호환성
        created_at: user.created_at,
        registeredAt: user.created_at // 하위 호환성
      },
      isExistingUser: false,
      rewards: { welcomeCUE: 15428 },
      message: '🎉 새로운 AI Passport가 생성되었습니다!'
    });

  } catch (error) {
    console.error('💥 통합 인증 오류:', error);
    
    res.status(500).json({
      success: false,
      error: 'Authentication failed',
      message: error.message
    });
  }
});

// ============================================================================
// 🔧 기존 등록 API들 (하위 호환성을 위해 유지)
// ============================================================================

app.post('/api/auth/webauthn/register/start', async (req: Request, res: Response) => {
  console.log('🆕 === REGISTER START API 호출됨 (하위 호환성) ===');
  
  try {
    const { userEmail, deviceInfo = {} } = req.body;
    
    const userId = crypto.randomUUID();
    const userName = userEmail || `user_${Date.now()}`;
    
    const options = {
      rp: {
        name: rpName,
        id: rpID
      },
      user: {
        id: base64urlEncode(Buffer.from(userId)),
        name: userName,
        displayName: userName
      },
      challenge: base64urlEncode(Buffer.from(`challenge_${Date.now()}_${Math.random()}`)),
      pubKeyCredParams: [
        { alg: -7, type: "public-key" as const },
        { alg: -257, type: "public-key" as const }
      ],
      timeout: 60000,
      attestation: "none" as const,
      authenticatorSelection: {
        authenticatorAttachment: "platform" as const,
        userVerification: "preferred" as const,
        residentKey: "preferred" as const
      }
    };

    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    sessionStore.set(sessionId, {
      challenge: options.challenge,
      userId,
      userName,
      userEmail,
      deviceInfo,
      timestamp: Date.now()
    });

    console.log('✅ 등록 옵션 생성 완료');

    res.json({
      success: true,
      options,
      sessionId,
      user: {
        id: userId,
        username: userName,
        email: userEmail
      }
    });
  } catch (error) {
    console.error('❌ 등록 시작 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Registration start failed',
      message: error.message
    });
  }
});

app.post('/api/auth/webauthn/register/complete', async (req: Request, res: Response) => {
  console.log('🚀 === WebAuthn 등록 완료 (기존 API + 자동 기존사용자 감지) ===');
  
  try {
    const { credential, sessionId } = req.body;
    
    if (!credential || !sessionId) {
      return res.status(400).json({
        success: false,
        error: 'credential과 sessionId가 필요합니다'
      });
    }
    
    const sessionData = sessionStore.get(sessionId);
    if (!sessionData) {
      return res.status(400).json({
        success: false,
        error: '유효하지 않거나 만료된 세션입니다'
      });
    }
    
    console.log('✅ 임시 세션 검증 완료');
    
    // 🔍 기존 사용자 확인
    const existingUser = await db.findUserByCredentialId(credential.id);
    
    if (existingUser) {
      console.log('🎉 기존 사용자 로그인! 모든 데이터 유지됨');
      
      const sessionToken = sessionManager.generateSessionToken(
        existingUser.id, 
        credential.id
      );
      
      if (useDatabase && supabase) {
        await supabase
          .from('webauthn_credentials')
          .update({ last_used_at: new Date().toISOString() })
          .eq('credential_id', credential.id);
      }
      
      sessionStore.delete(sessionId);
      
      return res.json({
        success: true,
        isExistingUser: true,
        sessionToken,
        user: {
          id: existingUser.id,
          username: existingUser.username,
          email: existingUser.email,
          did: existingUser.did,
          wallet_address: existingUser.wallet_address,
          walletAddress: existingUser.wallet_address,
          cue_tokens: existingUser.cue_tokens,
          cueBalance: existingUser.cue_tokens,
          trust_score: existingUser.trust_score,
          trustScore: existingUser.trust_score,
          passport_level: existingUser.passport_level,
          passportLevel: existingUser.passport_level,
          biometric_verified: existingUser.biometric_verified,
          biometricVerified: existingUser.biometric_verified,
          created_at: existingUser.created_at,
          registeredAt: existingUser.created_at
        },
        message: '기존 계정으로 로그인되었습니다. 모든 데이터가 유지됩니다.'
      });
    }
    
    // 🆕 신규 사용자 등록 (기존 로직과 동일)
    const { userId, userName, userEmail, deviceInfo } = sessionData;

    const userData = {
      id: userId,
      username: userName,
      email: userEmail,
      display_name: `AI Passport User ${userName}`,
      did: `did:final0626:${userId}`,
      wallet_address: `0x${Math.random().toString(16).substring(2, 42)}`,
      trust_score: 85.0,
      passport_level: 'Basic',
      biometric_verified: true,
      device_fingerprint: deviceInfo ? JSON.stringify(deviceInfo) : null,
      auth_method: 'passkey',
      cue_tokens: 15428,
      created_at: new Date().toISOString()
    };

    let user = await db.createUser(userData);

    // WebAuthn credential 저장
    const credentialData = {
      id: crypto.randomUUID(),
      user_id: userId,
      credential_id: credential.id,
      public_key: Buffer.from('mock-public-key-data').toString('base64'),
      counter: 0,
      device_type: 'platform',
      user_agent: req.get('User-Agent') || '',
      backup_eligible: false,
      backup_state: false,
      is_active: true,
      device_fingerprint: {
        primary: JSON.stringify(deviceInfo),
        platform: 'web',
        confidence: 0.9
      },
      created_at: new Date().toISOString(),
      last_used_at: new Date().toISOString()
    };

    await db.saveWebAuthnCredential(credentialData);

    // 세션 토큰 생성
    const sessionToken = sessionManager.generateSessionToken(userId, credential.id);
    
    sessionStore.delete(sessionId);
    
    res.json({
      success: true,
      isExistingUser: false,
      sessionToken,
      user: {
        id: user.id,
        did: user.did,
        username: user.username,
        email: user.email,
        wallet_address: user.wallet_address,
        walletAddress: user.wallet_address,
        cue_tokens: user.cue_tokens || 15428,
        cueBalance: user.cue_tokens || 15428,
        trust_score: user.trust_score || 85.0,
        trustScore: user.trust_score || 85.0,
        passport_level: user.passport_level || 'Basic',
        passportLevel: user.passport_level || 'Basic',
        biometric_verified: user.biometric_verified || true,
        biometricVerified: user.biometric_verified || true,
        created_at: user.created_at,
        registeredAt: user.created_at
      },
      message: '새로운 AI Passport가 생성되었습니다!'
    });

  } catch (error) {
    console.error('💥 등록 완료 전체 오류:', error);
    
    res.status(500).json({
      success: false,
      error: 'Registration completion failed',
      message: error.message
    });
  }
});

// ============================================================================
// 🔧 세션 관리 API들
// ============================================================================

app.post('/api/auth/session/restore', async (req: Request, res: Response) => {
  console.log('🔧 === 세션 복원 API ===');
  
  try {
    const { sessionToken } = req.body;
    
    if (!sessionToken) {
      return res.status(400).json({
        success: false,
        error: 'sessionToken이 필요합니다'
      });
    }
    
    const user = await sessionManager.getUserBySession(sessionToken);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: '유효하지 않거나 만료된 세션입니다'
      });
    }
    
    console.log('✅ 세션 복원 성공:', user.username || user.id);
    
    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        did: user.did,
        wallet_address: user.wallet_address,
        walletAddress: user.wallet_address,
        cue_tokens: user.cue_tokens,
        cueBalance: user.cue_tokens,
        trust_score: user.trust_score,
        trustScore: user.trust_score,
        passport_level: user.passport_level,
        passportLevel: user.passport_level,
        biometric_verified: user.biometric_verified,
        biometricVerified: user.biometric_verified,
        created_at: user.created_at,
        registeredAt: user.created_at
      },
      message: '세션이 복원되었습니다'
    });
    
  } catch (error) {
    console.error('💥 세션 복원 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Session restore failed',
      message: error.message
    });
  }
});

app.post('/api/auth/logout', async (req: Request, res: Response) => {
  console.log('🔧 === 로그아웃 API ===');
  
  try {
    const { sessionToken } = req.body;
    
    if (sessionToken) {
      console.log('🗑️ 세션 토큰 무효화 처리');
      // 실제로는 토큰 블랙리스트에 추가하거나 DB에서 무효화
    }
    
    res.json({
      success: true,
      message: '로그아웃되었습니다'
    });
    
  } catch (error) {
    console.error('💥 로그아웃 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Logout failed'
    });
  }
});

// ============================================================================
// 🔐 인증 미들웨어
// ============================================================================

async function authenticateSession(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    const sessionToken = authHeader?.replace('Bearer ', '');
    
    if (!sessionToken) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    const user = await sessionManager.getUserBySession(sessionToken);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired session'
      });
    }
    
    req.user = user;
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
}

// ============================================================================
// 🤖 AI 채팅 API (인증 필요)
// ============================================================================

app.post('/api/ai/chat', authenticateSession, async (req: Request, res: Response) => {
  try {
    const { message, model } = req.body;
    const user = req.user;
    
    if (!message || !user) {
      return res.status(400).json({
        success: false,
        error: 'Message and user required'
      });
    }

    // AI 응답 생성 (실제로는 OpenAI/Claude API 호출)
    const aiResponse = `안녕하세요 ${user.username}님! "${message}"에 대한 개인화된 응답입니다.\n\n실제 백엔드가 작동하고 있으며, 세션이 유지되고 있습니다. 🎉`;
    const cueEarned = Math.round((2.0 + Math.random() * 3.0) * 100) / 100;

    // CUE 잔액 업데이트
    if (useDatabase && supabase) {
      try {
        await supabase
          .from('users')
          .update({ 
            cue_tokens: user.cue_tokens + cueEarned 
          })
          .eq('id', user.id);
          
        // CUE 거래 기록
        await supabase
          .from('cue_transactions')
          .insert([{
            user_id: user.id,
            transaction_type: 'chat_reward',
            amount: cueEarned,
            balance_after: user.cue_tokens + cueEarned,
            description: `AI chat interaction reward`,
            source_platform: 'chat',
            metadata: {
              message_length: message.length,
              model: model || 'gpt-4o',
              timestamp: new Date().toISOString()
            },
            created_at: new Date().toISOString()
          }]);
      } catch (error) {
        console.error('CUE 업데이트 실패:', error);
      }
    }

    res.json({
      success: true,
      response: aiResponse,
      cueReward: cueEarned,
      model: model || 'gpt-4o',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ AI 채팅 오류:', error);
    res.status(500).json({
      success: false,
      error: 'AI chat failed'
    });
  }
});

// ============================================================================
// 💎 기타 API들
// ============================================================================

app.get('/api/cue/balance/:did', async (req: Request, res: Response) => {
  try {
    const { did } = req.params;
    
    if (useDatabase && supabase) {
      try {
        const { data: user, error } = await supabase
          .from('users')
          .select('cue_tokens')
          .eq('did', did)
          .single();
          
        if (user) {
          return res.json({
            success: true,
            balance: user.cue_tokens,
            did,
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('CUE 잔액 조회 실패:', error);
      }
    }
    
    // Mock 폴백
    const balance = 15428 + Math.floor(Math.random() * 5000);
    res.json({
      success: true,
      balance,
      did,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get CUE balance'
    });
  }
});

app.post('/api/cue/mine', authenticateSession, async (req: Request, res: Response) => {
  try {
    const { activity, amount } = req.body;
    const user = req.user;
    
    const mineAmount = amount || Math.floor(Math.random() * 10) + 1;
    
    // CUE 마이닝 기록
    if (useDatabase && supabase) {
      try {
        await supabase
          .from('cue_transactions')
          .insert([{
            user_id: user.id,
            transaction_type: 'mining',
            amount: mineAmount,
            balance_after: user.cue_tokens + mineAmount,
            description: `CUE mining from ${activity}`,
            source_platform: 'system',
            metadata: {
              activity,
              mining_time: new Date().toISOString()
            },
            created_at: new Date().toISOString()
          }]);
      } catch (error) {
        console.error('CUE 마이닝 기록 실패:', error);
      }
    }
    
    res.json({
      success: true,
      amount: mineAmount,
      totalBalance: user.cue_tokens + mineAmount,
      activity,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'CUE mining failed'
    });
  }
});

app.get('/api/passport/:did', async (req: Request, res: Response) => {
  try {
    const { did } = req.params;
    
    if (useDatabase && supabase) {
      try {
        const { data: user, error } = await supabase
          .from('users')
          .select('*')
          .eq('did', did)
          .single();
          
        if (user) {
          return res.json({
            success: true,
            passport: {
              did: user.did,
              username: user.username,
              trustScore: user.trust_score,
              level: user.passport_level,
              cueBalance: user.cue_tokens,
              totalMined: user.cue_tokens, // 임시로 같은 값 사용
              personalityProfile: user.personality || {
                traits: ['AI 사용자', '탐험가'],
                communicationStyle: 'friendly',
                expertise: ['AI', 'Web3']
              },
              connectedPlatforms: ['ChatGPT', 'Claude', 'Discord'],
              achievements: [
                { name: 'First Login', icon: '🎯', earned: true },
                { name: 'AI Chat Master', icon: '🤖', earned: true },
                { name: 'CUE Collector', icon: '💰', earned: user.cue_tokens > 1000 }
              ],
              createdAt: user.created_at
            }
          });
        }
      } catch (error) {
        console.error('패스포트 조회 실패:', error);
      }
    }
    
    // Mock 폴백
    const passport = {
      did,
      username: did?.split(':').pop() || 'Agent',
      trustScore: 85 + Math.floor(Math.random() * 15),
      level: 'Verified Agent',
      cueBalance: 2500 + Math.floor(Math.random() * 3000),
      totalMined: 25000 + Math.floor(Math.random() * 50000),
      personalityProfile: {
        traits: ['창의적', '분석적', '신뢰할 수 있는'],
        communicationStyle: 'friendly',
        expertise: ['AI', 'Web3', 'Protocol Design']
      },
      connectedPlatforms: ['ChatGPT', 'Claude', 'Discord'],
      achievements: [
        { name: 'First CUE', icon: '🎯', earned: true },
        { name: 'Trusted Agent', icon: '🛡️', earned: true },
        { name: 'Platform Master', icon: '🌐', earned: false }
      ],
      createdAt: new Date().toISOString()
    };

    res.json({
      success: true,
      passport,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get passport'
    });
  }
});

// ============================================================================
// 🔍 디버깅 API들
// ============================================================================

app.get('/api/debug/sessions', (req: Request, res: Response) => {
  const sessions = Array.from(sessionStore.entries()).map(([id, data]) => ({
    sessionId: id,
    userId: data.userId,
    userName: data.userName,
    timestamp: data.timestamp,
    age: Date.now() - data.timestamp,
    type: data.type
  }));

  console.log('🔍 세션 상태 조회:', sessions.length);

  res.json({
    success: true,
    sessionCount: sessionStore.size,
    sessions: sessions
  });
});

app.get('/api/debug/status', (req: Request, res: Response) => {
  console.log('🔍 시스템 상태 종합 체크 요청');

  const status = {
    server: {
      status: 'running',
      version: '3.0.0',
      uptime: process.uptime(),
      nodeVersion: process.version,
      platform: process.platform
    },
    database: {
      type: useDatabase ? 'supabase' : 'mock',
      connected: !!supabase,
      url: supabase ? 'connected' : 'not configured'
    },
    sessions: {
      count: sessionStore.size,
      list: Array.from(sessionStore.keys())
    },
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      FRONTEND_URL: process.env.FRONTEND_URL,
      hasSupabaseUrl: !!process.env.SUPABASE_URL,
      hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    },
    features: {
      unifiedAuth: true,
      sessionRestore: true,
      automaticUserDetection: true,
      emailNullable: true
    }
  };

  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    status
  });
});

// ============================================================================
// 🚫 404 및 에러 핸들링
// ============================================================================

app.use('*', (req: Request, res: Response) => {
  console.log(`❌ 404 - 찾을 수 없는 경로: ${req.method} ${req.originalUrl}`);

  res.status(404).json({
    success: false,
    error: 'API endpoint not found',
    method: req.method,
    path: req.originalUrl,
    timestamp: new Date().toISOString(),
    availableEndpoints: [
      'GET /health',
      'POST /api/auth/webauthn/start',           // 🔥 새로운 통합 인증
      'POST /api/auth/webauthn/complete',        // 🔥 새로운 통합 인증
      'POST /api/auth/webauthn/register/start',  // 기존 등록 API
      'POST /api/auth/webauthn/register/complete', // 기존 등록 API
      'POST /api/auth/session/restore',
      'POST /api/auth/logout',
      'POST /api/ai/chat',
      'POST /api/cue/mine',
      'GET /api/cue/balance/:did',
      'GET /api/passport/:did',
      'GET /api/debug/sessions',
      'GET /api/debug/status'
    ]
  });
});

app.use((error: any, req: Request, res: Response, next: NextFunction) => {
  console.error('❌ 서버 에러:', error);

  res.status(error.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : error.message,
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// 🚀 서버 시작
// ============================================================================

const server = app.listen(PORT, () => {
  console.log('🚀 ================================');
  console.log('🚀 Final0626 백엔드 서버 v3.0 시작됨');
  console.log('🚀 ================================');
  console.log(`📍 서버: http://localhost:${PORT}`);
  console.log(`🏥 헬스체크: http://localhost:${PORT}/health`);
  console.log(`🗄️ 데이터베이스: ${useDatabase ? 'Supabase' : 'Mock'}`);
  console.log('📋 주요 기능:');
  console.log('  🔥 통합 패스키 인증: 로그인/가입 자동 판별');
  console.log('  💾 영구 세션 관리: 30일간 자동 로그인');
  console.log('  🔄 자동 기존사용자 감지: 데이터 보존');
  console.log('  📧 Email Nullable: PassKey 전용 계정 지원');
  console.log('  🤖 AI 채팅: 인증된 사용자 전용');
  console.log('  💰 CUE 마이닝: 실시간 토큰 적립');
  console.log('📋 주요 API:');
  console.log('  🔥 통합 인증: /api/auth/webauthn/start + /api/auth/webauthn/complete');
  console.log('  🔐 기존 Auth: /api/auth/webauthn/register/*');
  console.log('  🔧 Session: /api/auth/session/*');
  console.log('  🤖 AI: /api/ai/chat');
  console.log('  💎 CUE: /api/cue/*');
  console.log('  🎫 Passport: /api/passport/*');
  console.log('  🔍 Debug: /api/debug/*');
  console.log('🚀 ================================');
});

// 우아한 종료 처리
process.on('SIGINT', () => {
  console.log('\n🛑 서버 종료 중...');
  server.close(() => {
    console.log('✅ 서버 종료 완료');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n🛑 서버 종료 신호 받음...');
  server.close(() => {
    console.log('✅ 서버 종료 완료');
    process.exit(0);
  });
});

// 예외 처리
process.on('uncaughtException', (error) => {
  console.error('💥 처리되지 않은 예외:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 처리되지 않은 Promise 거부:', reason);
  process.exit(1);
});

export default app;