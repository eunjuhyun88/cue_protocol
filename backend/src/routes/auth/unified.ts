// ============================================================================
// 🔐 통합 인증 시스템 (paste-4.txt 핵심 기능 추출)
// 파일: backend/src/routes/auth/unified.ts
// 역할: 로그인/가입 자동 판별, 30일 세션 관리
// ============================================================================

import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { DatabaseService } from '../../services/database/DatabaseService';
import { SupabaseService } from '../../services/database/SupabaseService';

const router = Router();

// 환경 설정
const JWT_SECRET = process.env.JWT_SECRET || 'final0626-development-secret-key';
const rpName = process.env.WEBAUTHN_RP_NAME || 'Final0626 AI Passport';
const rpID = process.env.WEBAUTHN_RP_ID || 'localhost';

// 데이터베이스 서비스 선택
const useDatabase = process.env.SUPABASE_URL && !process.env.SUPABASE_URL.includes('dummy');
const db = useDatabase ? SupabaseService.getInstance() : DatabaseService.getInstance();

// 세션 스토어 (실제로는 Redis 권장)
const sessionStore = new Map<string, any>();

// ============================================================================
// 🔧 세션 관리 클래스
// ============================================================================
class SessionManager {
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
    if (useDatabase) {
      try {
        const { data, error } = await db.from('webauthn_credentials')
          .select(`*, users (*)`)
          .eq('credential_id', credentialId)
          .eq('is_active', true)
          .single();
          
        if (error || !data) return null;
        return data.users;
      } catch (error) {
        console.error('❌ credential_id 조회 실패:', error);
        return null;
      }
    }
    
    // Mock 폴백
    for (const [sessionId, sessionData] of sessionStore.entries()) {
      if (sessionData.credentialId === credentialId) {
        return sessionData.mockUser;
      }
    }
    return null;
  }

  async getUserBySession(sessionToken: string): Promise<any> {
    const decoded = this.verifySessionToken(sessionToken);
    if (!decoded) return null;
    
    if (useDatabase) {
      try {
        const { data: user, error } = await db.from('users')
          .select('*')
          .eq('id', decoded.userId)
          .single();
          
        if (error || !user) return null;
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
// 🔐 통합 패스키 인증 시작 (로그인/가입 자동 판별)
// ============================================================================
router.post('/start', async (req: Request, res: Response) => {
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
router.post('/complete', async (req: Request, res: Response) => {
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
    
    const existingUser = await sessionManager.findUserByCredentialId(credential.id);
    
    if (existingUser) {
      // 🔑 기존 사용자 - 자동 로그인
      console.log('🎉 기존 사용자 자동 로그인!', {
        id: existingUser.id,
        username: existingUser.username,
        cueTokens: existingUser.cue_tokens
      });
      
      const sessionToken = sessionManager.generateSessionToken(
        existingUser.id, 
        credential.id
      );
      
      sessionStore.delete(sessionId);
      
      return res.json({
        success: true,
        action: 'login', // 🔑 로그인임을 명시
        sessionToken,
        user: existingUser,
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
      email: null, // PassKey 전용
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
    let user = await createUser(userData);

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

    await saveWebAuthnCredential(credentialData);

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

    await createCUETransaction(transactionData);

    // 세션 토큰 생성
    const sessionToken = sessionManager.generateSessionToken(userId, credential.id);
    
    sessionStore.delete(sessionId);
    
    console.log('🎉 신규 사용자 등록 완료!');
    
    return res.json({
      success: true,
      action: 'register', // 🆕 회원가입임을 명시
      sessionToken,
      user: user,
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
// 🔧 세션 관리 API들
// ============================================================================
router.post('/session/restore', async (req: Request, res: Response) => {
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
      user: user,
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

router.post('/logout', async (req: Request, res: Response) => {
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
// 🛠️ 헬퍼 함수들 (paste-4.txt에서 추출)
// ============================================================================

function base64urlEncode(buffer: Buffer): string {
  return buffer.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

async function createUser(userData: any): Promise<any> {
  if (useDatabase) {
    try {
      const { data, error } = await db.from('users')
        .insert([userData])
        .select()
        .single();

      if (error) throw error;
      console.log('✅ Supabase 사용자 생성 성공:', data.id);
      return data;
    } catch (error) {
      console.error('❌ 데이터베이스 오류, Mock으로 fallback:', error.message);
      return createUserMock(userData);
    }
  } else {
    return createUserMock(userData);
  }
}

function createUserMock(userData: any): any {
  // Mock 사용자 저장 로직
  console.log('📝 Mock 사용자 생성:', userData.id);
  return userData;
}

async function saveWebAuthnCredential(credData: any): Promise<any> {
  if (useDatabase) {
    try {
      const { data, error } = await db.from('webauthn_credentials')
        .insert([credData])
        .select()
        .single();

      if (error) throw error;
      console.log('✅ WebAuthn 자격증명 저장 성공');
      return data;
    } catch (error) {
      console.error('❌ 자격증명 저장 실패, Mock으로 fallback:', error.message);
      console.log('📝 Mock 자격증명 저장');
      return credData;
    }
  } else {
    console.log('📝 Mock 자격증명 저장');
    return credData;
  }
}

async function createCUETransaction(txData: any): Promise<any> {
  if (useDatabase) {
    try {
      const { data, error } = await db.from('cue_transactions')
        .insert([txData])
        .select()
        .single();

      if (error) throw error;
      console.log('✅ CUE 거래 기록 저장 성공');
      return data;
    } catch (error) {
      console.error('❌ CUE 거래 저장 실패:', error.message);
      console.log('📝 Mock CUE 거래 기록');
      return txData;
    }
  } else {
    console.log('📝 Mock CUE 거래 기록');
    return txData;
  }
}

export default router;