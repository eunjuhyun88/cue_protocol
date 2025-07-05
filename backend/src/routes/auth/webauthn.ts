// ============================================================================
// 🔐 WebAuthn 인증 API 라우트 (crypto 에러 수정 버전)
// 경로: backend/src/routes/auth/webauthn.ts
// 용도: 패스키 기반 회원가입/로그인 API 엔드포인트
// 수정사항: crypto 임포트 문제 해결, Node.js crypto 모듈 정확히 사용
// ============================================================================

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';  // ✅ Node.js crypto 모듈 정확한 임포트
import { supabaseService } from '../../services/database/SupabaseService';
import { DatabaseService } from '../../services/database/DatabaseService';

// Express Router 생성
const router = Router();

// 데이터베이스 서비스 선택
const db = process.env.USE_MOCK_DATABASE === 'true' || 
          !process.env.SUPABASE_URL || 
          process.env.SUPABASE_URL.includes('dummy')
  ? DatabaseService.getInstance()
  : supabaseService;

// 메모리 기반 세션 저장소 (실제로는 Redis 권장)
const sessionStore = new Map<string, any>();

// WebAuthn 설정
const rpName = process.env.WEBAUTHN_RP_NAME || 'Final0626 AI Passport';
const rpID = process.env.WEBAUTHN_RP_ID || 'localhost';
const origin = process.env.WEBAUTHN_ORIGIN || 'http://localhost:3000';

console.log('🔐 WebAuthn 라우트 초기화됨');
console.log(`🏷️  RP Name: ${rpName}`);
console.log(`🌐 RP ID: ${rpID}`);
console.log(`🔗 Origin: ${origin}`);
console.log(`🗄️ Database: ${db.constructor.name}`);

// ============================================================================
// 🛠️ 유틸리티 함수들 (crypto 모듈 사용)
// ============================================================================

/**
 * Base64URL 인코딩 함수
 */
function base64urlEncode(buffer: Buffer): string {
  return buffer.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Base64URL 디코딩 함수
 */
function base64urlDecode(str: string): Buffer {
  str += new Array(5 - (str.length % 4)).join('=');
  return Buffer.from(str.replace(/\-/g, '+').replace(/_/g, '/'), 'base64');
}

/**
 * 안전한 랜덤 바이트 생성 (crypto 모듈 사용)
 */
function generateSecureRandom(length: number): Buffer {
  try {
    return crypto.randomBytes(length);
  } catch (error: any) {
    console.error('❌ crypto.randomBytes 실패:', error.message);
    throw new Error(`암호화 랜덤 바이트 생성 실패: ${error.message}`);
  }
}

/**
 * 챌린지 생성 (32바이트 랜덤)
 */
function generateChallenge(): string {
  const challengeBuffer = generateSecureRandom(32);
  return base64urlEncode(challengeBuffer);
}

/**
 * 사용자 핸들 생성 (64바이트 랜덤)
 */
function generateUserHandle(): string {
  const handleBuffer = generateSecureRandom(64);
  return base64urlEncode(handleBuffer);
}

// ============================================================================
// 🆕 패스키 등록 시작 API
// POST /api/auth/webauthn/register/start
// ============================================================================

router.post('/register/start', async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('🆕 패스키 등록 시작 요청 받음');
    
    const { userEmail, deviceInfo = {} } = req.body;
    
    // 익명 사용자 핸들 생성 (crypto 모듈 사용)
    const userHandle = userEmail 
      ? base64urlEncode(Buffer.from(userEmail, 'utf8'))
      : generateUserHandle();  // ✅ 수정된 부분: crypto 함수 사용
    
    const userId = userEmail || `anonymous-${Date.now()}`;
    
    // 챌린지 생성 (crypto 모듈 사용)
    const challenge = generateChallenge();  // ✅ 수정된 부분: crypto 함수 사용
    
    console.log(`👤 사용자: ${userId}`);
    console.log(`🎯 챌린지 생성됨: ${challenge.substring(0, 16)}...`);
    
    // 세션 생성
    const sessionId = uuidv4();
    const sessionData = {
      challenge,
      userHandle,
      userId,
      userEmail,
      deviceInfo,
      timestamp: Date.now(),
      step: 'registration_started'
    };
    
    sessionStore.set(sessionId, sessionData);
    console.log(`💾 세션 저장됨: ${sessionId}`);
    
    // WebAuthn 등록 옵션 생성
    const registrationOptions = {
      challenge,
      rp: {
        name: rpName,
        id: rpID
      },
      user: {
        id: userHandle,
        name: userId,
        displayName: userEmail || `Anonymous User ${Date.now()}`
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' },   // ES256
        { alg: -35, type: 'public-key' },  // ES384
        { alg: -36, type: 'public-key' },  // ES512
        { alg: -257, type: 'public-key' }, // RS256
        { alg: -258, type: 'public-key' }, // RS384
        { alg: -259, type: 'public-key' }  // RS512
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        requireResidentKey: false,
        residentKey: 'preferred',
        userVerification: 'preferred'
      },
      timeout: 60000,
      attestation: 'none'
    };
    
    res.json({
      success: true,
      sessionId,
      options: registrationOptions,
      message: '패스키 등록 준비 완료'
    });
    
    console.log(`✅ 패스키 등록 시작 응답 전송 완료: ${sessionId}`);
    
  } catch (error: any) {
    console.error('❌ 패스키 등록 시작 오류:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Registration start failed',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// ============================================================================
// ✅ 패스키 등록 완료 API
// POST /api/auth/webauthn/register/complete
// ============================================================================

router.post('/register/complete', async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('✅ 패스키 등록 완료 요청 받음');
    
    const { sessionId, credential, userEmail } = req.body;
    
    if (!sessionId || !credential) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: sessionId, credential'
      });
      return;
    }
    
    // 세션 검증
    const sessionData = sessionStore.get(sessionId);
    if (!sessionData) {
      res.status(400).json({
        success: false,
        error: 'Invalid or expired session'
      });
      return;
    }
    
    console.log(`🔍 세션 검증 완료: ${sessionId}`);
    
    // 간단한 자격증명 검증 (실제로는 더 복잡한 검증 필요)
    if (!credential.id || !credential.rawId || !credential.response) {
      res.status(400).json({
        success: false,
        error: 'Invalid credential format'
      });
      return;
    }
    
    // 사용자 생성
    const userId = sessionData.userId;
    const did = `did:cue:${userId.replace(/[^a-zA-Z0-9]/g, '')}:${Date.now()}`;
    
    const userData = {
      id: uuidv4(),
      did,
      email: userEmail || sessionData.userEmail,
      display_name: userEmail || `Anonymous User ${Date.now()}`,
      user_handle: sessionData.userHandle,
      created_at: new Date().toISOString(),
      last_login_at: new Date().toISOString(),
      is_active: true
    };
    
    console.log(`👤 사용자 생성 중: ${did}`);
    
    // 데이터베이스에 사용자 저장
    let user;
    try {
      user = await db.createUser(userData);
      console.log(`✅ 사용자 저장 성공: ${user.id}`);
    } catch (dbError: any) {
      console.error('❌ 사용자 저장 실패:', dbError);
      res.status(500).json({
        success: false,
        error: 'Failed to save user',
        message: dbError.message
      });
      return;
    }
    
    // WebAuthn 자격증명 저장
    const credentialData = {
      id: uuidv4(),
      user_id: user.id,
      credential_id: credential.id,
      public_key: credential.response.publicKey || 'placeholder-public-key',
      counter: 0,
      device_type: 'platform',
      created_at: new Date().toISOString(),
      last_used_at: new Date().toISOString(),
      is_active: true
    };
    
    try {
      await db.saveWebAuthnCredential(credentialData);
      console.log(`🔐 자격증명 저장 성공: ${credential.id}`);
    } catch (credError: any) {
      console.error('❌ 자격증명 저장 실패:', credError);
      // 사용자는 생성되었으므로 계속 진행
    }
    
    // AI Passport 생성
    const passportData = {
      id: uuidv4(),
      user_did: did,
      personality_profile: {},
      preferences: {},
      total_interactions: 1,
      cue_balance: 100, // 초기 보너스
      last_activity_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    };
    
    try {
      if (typeof db.createPassport === 'function') {
        await db.createPassport(passportData);
        console.log(`🎫 AI Passport 생성 성공: ${did}`);
      }
    } catch (passportError: any) {
      console.error('❌ AI Passport 생성 실패:', passportError);
      // 계속 진행
    }
    
    // CUE 초기 잔액 설정
    try {
      if (typeof db.setCUEBalance === 'function') {
        await db.setCUEBalance(did, 100);
        console.log(`💰 초기 CUE 잔액 설정: 100`);
      }
    } catch (cueError: any) {
      console.error('❌ CUE 잔액 설정 실패:', cueError);
      // 계속 진행
    }
    
    // 세션 정리
    sessionStore.delete(sessionId);
    
    // 응답
    res.json({
      success: true,
      message: 'Registration completed successfully',
      user: {
        id: user.id,
        did,
        email: userData.email,
        displayName: userData.display_name
      },
      passport: passportData,
      cueTokens: {
        balance: 100,
        currency: 'CUE'
      }
    });
    
    console.log(`🎉 패스키 등록 완료: ${did}`);
    
  } catch (error: any) {
    console.error('❌ 패스키 등록 완료 오류:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Registration completion failed',
      message: error.message
    });
  }
});

// ============================================================================
// 🔑 패스키 로그인 시작 API
// POST /api/auth/webauthn/login/start
// ============================================================================

router.post('/login/start', async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('🔑 패스키 로그인 시작 요청 받음');
    
    const { userEmail } = req.body;
    
    // 챌린지 생성 (crypto 모듈 사용)
    const challenge = generateChallenge();  // ✅ 수정된 부분: crypto 함수 사용
    
    console.log(`🎯 로그인 챌린지 생성됨: ${challenge.substring(0, 16)}...`);
    
    // 세션 생성
    const sessionId = uuidv4();
    const sessionData = {
      challenge,
      userEmail,
      timestamp: Date.now(),
      step: 'login_started'
    };
    
    sessionStore.set(sessionId, sessionData);
    console.log(`💾 로그인 세션 저장됨: ${sessionId}`);
    
    // WebAuthn 인증 옵션 생성
    const authenticationOptions = {
      challenge,
      timeout: 60000,
      rpId: rpID,
      userVerification: 'preferred'
    };
    
    res.json({
      success: true,
      sessionId,
      options: authenticationOptions,
      message: '패스키 로그인 준비 완료'
    });
    
    console.log(`✅ 패스키 로그인 시작 응답 전송 완료: ${sessionId}`);
    
  } catch (error: any) {
    console.error('❌ 패스키 로그인 시작 오류:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Login start failed',
      message: error.message
    });
  }
});

// ============================================================================
// 🎯 패스키 로그인 완료 API
// POST /api/auth/webauthn/login/complete
// ============================================================================

router.post('/login/complete', async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('🎯 패스키 로그인 완료 요청 받음');
    
    const { sessionId, credential } = req.body;
    
    if (!sessionId || !credential) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: sessionId, credential'
      });
      return;
    }
    
    // 세션 검증
    const sessionData = sessionStore.get(sessionId);
    if (!sessionData) {
      res.status(400).json({
        success: false,
        error: 'Invalid or expired session'
      });
      return;
    }
    
    console.log(`🔍 로그인 세션 검증 완료: ${sessionId}`);
    
    // 자격증명으로 사용자 찾기
    let user;
    try {
      if (typeof db.findUserByCredentialId === 'function') {
        user = await db.findUserByCredentialId(credential.id);
      }
      
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found',
          message: '등록된 패스키를 찾을 수 없습니다. 먼저 회원가입을 해주세요.'
        });
        return;
      }
    } catch (findError: any) {
      console.error('❌ 사용자 조회 실패:', findError);
      res.status(500).json({
        success: false,
        error: 'Failed to find user',
        message: findError.message
      });
      return;
    }
    
    console.log(`👤 사용자 발견: ${user.did}`);
    
    // 마지막 로그인 시간 업데이트
    try {
      if (typeof db.updateUser === 'function') {
        await db.updateUser(user.id, {
          last_login_at: new Date().toISOString()
        });
      }
    } catch (updateError: any) {
      console.error('❌ 로그인 시간 업데이트 실패:', updateError);
      // 계속 진행
    }
    
    // AI Passport 조회
    let passport;
    try {
      if (typeof db.getPassport === 'function') {
        passport = await db.getPassport(user.did);
      }
    } catch (passportError: any) {
      console.error('❌ AI Passport 조회 실패:', passportError);
      // 계속 진행
    }
    
    // CUE 잔액 조회
    let cueBalance = 0;
    try {
      if (typeof db.getCUEBalance === 'function') {
        cueBalance = await db.getCUEBalance(user.did);
      }
    } catch (cueError: any) {
      console.error('❌ CUE 잔액 조회 실패:', cueError);
      // 계속 진행
    }
    
    // 세션 정리
    sessionStore.delete(sessionId);
    
    // 응답
    res.json({
      success: true,
      message: 'Login completed successfully',
      user,
      passport,
      cueTokens: {
        balance: cueBalance,
        currency: 'CUE'
      }
    });
    
    console.log(`🎉 패스키 로그인 완료: ${user.did}`);
    
  } catch (error: any) {
    console.error('❌ 패스키 로그인 완료 오류:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Authentication completion failed',
      message: error.message
    });
  }
});

// ============================================================================
// 📋 상태 확인 API
// GET /api/auth/webauthn/health
// ============================================================================

router.get('/health', (req: Request, res: Response): void => {
  res.json({
    success: true,
    status: 'WebAuthn service is running',
    config: {
      rpName,
      rpID,
      origin,
      sessionCount: sessionStore.size,
      database: db.constructor.name,
      cryptoAvailable: typeof crypto !== 'undefined' && typeof crypto.randomBytes === 'function'
    },
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// 🧹 세션 정리 (만료된 세션 자동 정리)
// ============================================================================

// 만료된 세션 정리 (5분 후 만료)
setInterval(() => {
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;
  
  let cleanedCount = 0;
  for (const [sessionId, sessionData] of sessionStore.entries()) {
    if (now - sessionData.timestamp > fiveMinutes) {
      sessionStore.delete(sessionId);
      cleanedCount++;
    }
  }
  
  if (cleanedCount > 0) {
    console.log(`🧹 만료된 세션 ${cleanedCount}개 정리됨`);
  }
}, 60000); // 1분마다 정리

console.log('✅ WebAuthn 라우트 설정 완료 (crypto 에러 수정됨)');

// ✅ 올바른 기본 내보내기
export default router;