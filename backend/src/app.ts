// ============================================================================
// 🚀 Final0626 백엔드 서버 (완전한 세션 기반 데이터 유지 버전)
// 수정사항: webauthn_sessions 테이블 활용 + 세션 복원 API 추가
// ============================================================================

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// 환경변수 로드
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

console.log('🚀 Final0626 백엔드 서버 초기화 중...');

// ============================================================================
// 🗄️ Supabase 클라이언트 설정
// ============================================================================

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
// 🔧 유틸리티 및 설정
// ============================================================================

function base64urlEncode(buffer: Buffer): string {
  return buffer.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// 세션 저장소 및 WebAuthn 설정
const sessionStore = new Map<string, any>();
const rpName = process.env.WEBAUTHN_RP_NAME || 'Final0626 AI Passport';
const rpID = process.env.WEBAUTHN_RP_ID || 'localhost';

// ============================================================================
// 📊 데이터베이스 서비스
// ============================================================================

class DatabaseService {
  private mockData = {
    users: new Map(),
    credentials: new Map(),
    transactions: new Map(),
    sessions: new Map()  // 🔧 Mock 세션 저장소 추가
  };

  async createUser(userData: any): Promise<any> {
    if (useDatabase && supabase) {
      try {
        const { data, error } = await supabase
          .from('users')
          .insert([userData])
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
    this.mockData.users.set(userData.id, userData);
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
        this.mockData.credentials.set(credData.credential_id, credData);
        return credData;
      }
    } else {
      this.mockData.credentials.set(credData.credential_id, credData);
      console.log('📝 Mock 자격증명 저장');
      return credData;
    }
  }

  // 🔧 새로운 메서드: WebAuthn 세션 저장
  async saveWebAuthnSession(sessionData: any): Promise<any> {
    if (useDatabase && supabase) {
      try {
        const { data, error } = await supabase
          .from('webauthn_sessions')
          .insert([sessionData])
          .select()
          .single();

        if (error) {
          console.error('❌ WebAuthn 세션 저장 오류:', error);
          throw error;
        }

        console.log('✅ WebAuthn 세션 저장 성공:', data.session_id);
        return data;
      } catch (error) {
        console.error('❌ 세션 저장 실패, Mock으로 fallback:', error.message);
        this.mockData.sessions.set(sessionData.session_id, sessionData);
        return sessionData;
      }
    } else {
      this.mockData.sessions.set(sessionData.session_id, sessionData);
      console.log('📝 Mock 세션 저장:', sessionData.session_id);
      return sessionData;
    }
  }

  // 🔧 새로운 메서드: 세션 복원
  async findSession(sessionId: string): Promise<any> {
    if (useDatabase && supabase) {
      try {
        const { data, error } = await supabase
          .from('webauthn_sessions')
          .select(`
            *,
            users (
              id, username, email, did, cue_tokens, trust_score, 
              passport_level, biometric_verified, wallet_address, created_at
            )
          `)
          .eq('session_id', sessionId)
          .eq('is_active', true)
          .gte('expires_at', new Date().toISOString())
          .single();

        if (error || !data) {
          console.log('❌ 활성 세션 없음:', sessionId);
          return null;
        }

        console.log('✅ 세션 복원 성공:', sessionId);
        return data;
      } catch (error) {
        console.error('❌ 세션 조회 실패:', error.message);
        return this.mockData.sessions.get(sessionId) || null;
      }
    } else {
      return this.mockData.sessions.get(sessionId) || null;
    }
  }

  // 🔧 새로운 메서드: 세션 무효화
  async invalidateSession(sessionId: string): Promise<boolean> {
    if (useDatabase && supabase) {
      try {
        const { error } = await supabase
          .from('webauthn_sessions')
          .update({ 
            is_active: false, 
            ended_at: new Date().toISOString() 
          })
          .eq('session_id', sessionId);

        if (error) {
          console.error('❌ 세션 무효화 실패:', error);
          return false;
        }

        console.log('✅ 세션 무효화 성공:', sessionId);
        return true;
      } catch (error) {
        console.error('❌ 세션 무효화 예외:', error.message);
        this.mockData.sessions.delete(sessionId);
        return true;
      }
    } else {
      this.mockData.sessions.delete(sessionId);
      console.log('📝 Mock 세션 삭제:', sessionId);
      return true;
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
        return txData;
      }
    } else {
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
  console.log(`📊 Headers:`, {
    'content-type': req.get('content-type'),
    'origin': req.get('origin'),
    'user-agent': req.get('user-agent')?.substring(0, 50) + '...'
  });
  
  if (req.body && Object.keys(req.body).length > 0) {
    console.log(`📝 Body keys:`, Object.keys(req.body));
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
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    database: useDatabase ? 'supabase' : 'mock',
    supabaseConnected: !!supabase,
    services: {
      webauthn: true,
      ai: !!process.env.OPENAI_API_KEY || !!process.env.ANTHROPIC_API_KEY,
      cue: true,
      vault: true
    },
    uptime: process.uptime(),
    memory: process.memoryUsage()
  };

  console.log('✅ Health Check 응답 전송:', { 
    status: healthData.status,
    database: healthData.database 
  });
  
  res.json(healthData);
});

// ============================================================================
// 🔐 WebAuthn 등록 시작
// ============================================================================

app.post('/api/auth/webauthn/register/start', async (req: Request, res: Response) => {
  console.log('🆕 === REGISTER START API 호출됨 ===');
  console.log('📥 Request body:', req.body);
  
  try {
    const { userEmail, deviceInfo = {} } = req.body;
    console.log(`👤 사용자 정보: email=${userEmail}, deviceInfo=${JSON.stringify(deviceInfo)}`);
    
    // UUID 생성
    const userId = crypto.randomUUID();
    const userName = userEmail || `user_${Date.now()}`;
    
    console.log(`🆔 생성된 UUID: ${userId}`);
    
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

    console.log('✅ 등록 옵션 생성 완료:', { 
      sessionId, 
      userId, 
      userName,
      sessionStoreSize: sessionStore.size 
    });

    const response = {
      success: true,
      options,
      sessionId,
      user: {
        id: userId,
        username: userName,
        email: userEmail
      }
    };
    
    console.log('📤 응답 전송:', { 
      success: response.success, 
      sessionId: response.sessionId,
      userId: response.user.id 
    });

    res.json(response);
  } catch (error) {
    console.error('❌ 등록 시작 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Registration start failed',
      message: error.message
    });
  }
});

// ============================================================================
// ✅ WebAuthn 등록 완료 (credential_id 기반 중복 체크 + 세션 저장)
// ============================================================================

app.post('/api/auth/webauthn/register/complete', async (req: Request, res: Response) => {
  console.log('🚀 === 등록 완료 API 시작 ===');
  
  try {
    const { credential, sessionId } = req.body;
    console.log('📥 수신된 데이터:', { 
      credentialId: credential?.id, 
      sessionId,
      hasCredential: !!credential 
    });
    
    if (!credential || !sessionId) {
      console.log('❌ 필수 데이터 누락');
      return res.status(400).json({
        success: false,
        error: 'Credential and sessionId are required'
      });
    }

    const sessionData = sessionStore.get(sessionId);
    if (!sessionData) {
      console.log('❌ 세션 데이터 없음:', sessionId);
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired session'
      });
    }

    console.log('✅ 세션 데이터 발견:', {
      userId: sessionData.userId,
      userName: sessionData.userName,
      userEmail: sessionData.userEmail
    });

    const { userId, userName, userEmail, deviceInfo } = sessionData;

    // ============================================================================
    // 🔍 STEP 1: credential_id로 기존 자격증명 확인 (핵심!)
    // ============================================================================
    
    console.log('🔍 === 기존 credential 확인 중 ===');
    console.log('🔑 확인할 credential_id:', credential.id);
    
    if (useDatabase && supabase) {
      try {
        const { data: existingCredential, error: credCheckError } = await supabase
          .from('webauthn_credentials')
          .select(`
            *,
            users (
              id, username, email, did, cue_tokens, trust_score, 
              passport_level, biometric_verified, wallet_address, created_at
            )
          `)
          .eq('credential_id', credential.id)
          .eq('is_active', true)
          .single();

        if (existingCredential && !credCheckError) {
          console.log('🔄 기존 PassKey 발견! 데이터 유지하며 로그인 처리');
          console.log('💎 기존 데이터:', {
            id: existingCredential.users.id,
            did: existingCredential.users.did,
            wallet: existingCredential.users.wallet_address,
            cue: existingCredential.users.cue_tokens,
            trust: existingCredential.users.trust_score
          });
          
          // 🔧 새로운 영구 세션 생성
          const permanentSessionId = `perm_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
          
          const sessionData = {
            session_id: permanentSessionId,
            user_id: existingCredential.users.id,
            user_handle: existingCredential.users.username,
            credential_id: credential.id,
            device_fingerprint: JSON.stringify(deviceInfo),
            metadata: {
              userAgent: req.get('User-Agent'),
              clientIP: req.ip,
              loginTime: new Date().toISOString(),
              lastActivity: new Date().toISOString(),
              deviceType: 'platform',
              platform: 'web'
            },
            is_active: true,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7일
            created_at: new Date().toISOString(),
            last_activity_at: new Date().toISOString()
          };

          // 세션 DB 저장
          await db.saveWebAuthnSession(sessionData);
          
          // 기존 세션 정리
          sessionStore.delete(sessionId);
          
          // 마지막 사용 시간 업데이트
          await supabase
            .from('webauthn_credentials')
            .update({ last_used_at: new Date().toISOString() })
            .eq('credential_id', credential.id);
          
          // 🎯 기존 사용자 정보 그대로 반환 (데이터 유지!)
          return res.json({
            success: true,
            isExistingUser: true,
            sessionId: permanentSessionId, // 🔧 영구 세션 ID 반환
            user: {
              id: existingCredential.users.id,
              did: existingCredential.users.did,
              username: existingCredential.users.username,
              email: existingCredential.users.email,
              walletAddress: existingCredential.users.wallet_address,  // 🔑 월렛 유지
              cueBalance: existingCredential.users.cue_tokens,  // 💰 CUE 유지
              trustScore: existingCredential.users.trust_score,  // ⭐ 신뢰도 유지
              passportLevel: existingCredential.users.passport_level,
              biometricVerified: existingCredential.users.biometric_verified,
              registeredAt: existingCredential.users.created_at
            },
            message: '기존 PassKey로 로그인 - 모든 데이터 유지됨'
          });
        }

        console.log('✅ 신규 credential 확인 - 새 사용자 등록 진행');
        
      } catch (error) {
        console.log('⚠️ credential 확인 중 오류 (신규 사용자로 처리):', error.message);
      }
    }

    // ============================================================================
    // 🆕 STEP 2: 신규 사용자 등록 진행
    // ============================================================================
    
    console.log('👤 === 신규 사용자 생성 시작 ===');
    
    const userData = {
      id: userId,
      username: userName,
      email: userEmail,
      display_name: `AI Passport User ${userName}`,
      did: `did:final0626:${userId}`,
      wallet_address: `0x${Math.random().toString(16).substring(2, 42)}`,
      trust_score: 85.0,
      passport_level: 'Basic',  // ✅ 스키마 기본값
      biometric_verified: true,
      device_fingerprint: deviceInfo ? JSON.stringify(deviceInfo) : null,
      auth_method: 'passkey',
      cue_tokens: 15428,  // ✅ 스키마 기본값 (환영 보너스!)
      created_at: new Date().toISOString()
    };

    console.log('📝 신규 사용자 데이터 준비 완료:', userData.id);

    let user = null;
    let userCreateSuccess = false;

    if (useDatabase && supabase) {
      try {
        console.log('💾 Supabase에 신규 사용자 저장 시도...');
        
        const { data, error } = await supabase
          .from('users')
          .insert([userData])
          .select()
          .single();

        if (error) {
          console.error('❌ Supabase 사용자 저장 실패:', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint
          });
          throw error;
        }

        user = data;
        userCreateSuccess = true;
        console.log('✅ Supabase 사용자 저장 성공!', {
          id: user.id,
          username: user.username,
          did: user.did,
          email: user.email
        });
      } catch (error) {
        console.error('❌ 사용자 저장 실패, fallback 사용:', error.message);
        user = userData;
        userCreateSuccess = false;
      }
    } else {
      console.log('📝 Mock 모드 - 실제 DB 없음');
      user = userData;
      userCreateSuccess = false;
    }

    // ============================================================================
    // 🔐 STEP 3: WebAuthn 자격증명 저장
    // ============================================================================
    
    console.log('🔐 === WebAuthn 자격증명 저장 시작 ===');
    
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

    console.log('🔑 자격증명 데이터 준비:', {
      id: credentialData.id,
      user_id: credentialData.user_id,
      credential_id: credentialData.credential_id,
      device_type: credentialData.device_type
    });

    let credentialSaveSuccess = false;

    if (useDatabase && supabase) {
      try {
        console.log('💾 Supabase에 자격증명 저장 시도...');
        
        const { data: credData, error: credError } = await supabase
          .from('webauthn_credentials')
          .insert([credentialData])
          .select()
          .single();

        if (credError) {
          console.error('❌ WebAuthn 자격증명 저장 실패:', {
            code: credError.code,
            message: credError.message,
            details: credError.details,
            hint: credError.hint
          });
        } else {
          credentialSaveSuccess = true;
          console.log('✅ WebAuthn 자격증명 저장 성공!', {
            id: credData.id,
            credential_id: credData.credential_id,
            user_id: credData.user_id
          });
        }
      } catch (error) {
        console.error('❌ 자격증명 저장 예외:', error);
      }
    } else {
      console.log('📝 Mock 모드 - 자격증명 실제 저장 없음');
    }

    // ============================================================================
    // 🔧 STEP 4: 신규 사용자용 영구 세션 생성
    // ============================================================================
    
    console.log('🔧 === 신규 사용자 영구 세션 생성 ===');
    
    const permanentSessionId = `perm_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    
    const newSessionData = {
      session_id: permanentSessionId,
      user_id: userId,
      user_handle: userName,
      credential_id: credential.id,
      device_fingerprint: JSON.stringify(deviceInfo),
      metadata: {
        userAgent: req.get('User-Agent'),
        clientIP: req.ip,
        loginTime: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        deviceType: 'platform',
        platform: 'web',
        isNewUser: true
      },
      is_active: true,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7일
      created_at: new Date().toISOString(),
      last_activity_at: new Date().toISOString()
    };

    await db.saveWebAuthnSession(newSessionData);
    console.log('✅ 신규 사용자 영구 세션 생성 완료:', permanentSessionId);

    // ============================================================================
    // 💰 STEP 5: CUE 거래 저장 (기존과 동일)
    // ============================================================================
    
    console.log('💰 === CUE 거래 기록 시작 ===');
    
    const transactionData = {
      user_id: userId,
      transaction_type: 'registration_bonus',
      amount: 15428,
      balance_after: 15428,
      description: 'Welcome bonus for new user registration',
      source_platform: 'system',
      metadata: {
        registration_id: userId,
        device_info: deviceInfo,
        registration_time: new Date().toISOString()
      },
      created_at: new Date().toISOString()
    };

    let transactionSaveSuccess = false;

    if (useDatabase && supabase) {
      try {
        console.log('💾 Supabase에 CUE 거래 저장 시도...');
        
        const { data: txData, error: txError } = await supabase
          .from('cue_transactions')
          .insert([transactionData])
          .select()
          .single();

        if (txError) {
          console.error('❌ CUE 거래 저장 실패:', {
            code: txError.code,
            message: txError.message
          });
        } else {
          transactionSaveSuccess = true;
          console.log('✅ CUE 거래 저장 성공!', {
            id: txData.id,
            amount: txData.amount
          });
        }
      } catch (error) {
        console.error('❌ CUE 거래 저장 예외:', error);
      }
    }

    // 시스템 활동 로그
    console.log('📋 === 시스템 활동 로그 기록 ===');
    
    const activityData = {
      user_id: userId,
      activity_type: 'user_registration',
      description: `User ${userName} registered successfully with passkey`,
      status: 'completed',
      metadata: {
        registration_method: 'webauthn_passkey',
        device_info: deviceInfo,
        user_agent: req.get('User-Agent'),
        credential_id: credential.id,
        saves: {
          user: userCreateSuccess,
          credential: credentialSaveSuccess,
          transaction: transactionSaveSuccess
        },
        session_id: permanentSessionId
      },
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      device_fingerprint: JSON.stringify(deviceInfo),
      session_id: permanentSessionId,
      security_level: 'high',
      created_at: new Date().toISOString()
    };

    if (useDatabase && supabase) {
      try {
        await supabase.from('system_activities').insert([activityData]);
        console.log('✅ 활동 로그 저장 성공');
      } catch (error) {
        console.error('❌ 활동 로그 저장 실패:', error);
      }
    }

    // 임시 세션 정리
    sessionStore.delete(sessionId);
    console.log('🗑️ 임시 세션 정리 완료');

    // 최종 결과 요약
    const summary = {
      userSaved: userCreateSuccess,
      credentialSaved: credentialSaveSuccess,
      transactionSaved: transactionSaveSuccess,
      sessionCreated: true,
      useDatabase,
      supabaseConnected: !!supabase
    };

    console.log('📊 === 신규 등록 완료 요약 ===', summary);

    // 신규 사용자 성공 응답
    res.json({
      success: true,
      isExistingUser: false,
      sessionId: permanentSessionId, // 🔧 영구 세션 ID 반환
      user: {
        id: user.id,
        did: user.did,
        username: user.username,
        email: user.email,
        walletAddress: user.wallet_address,
        cueBalance: user.cue_tokens || 15428,
        trustScore: user.trust_score || 85.0,
        passportLevel: user.passport_level || 'Basic',
        biometricVerified: user.biometric_verified || true,
        registeredAt: user.created_at
      },
      debug: {
        summary,
        databaseMode: useDatabase ? 'supabase' : 'mock',
        timestamp: new Date().toISOString()
      },
      message: 'Registration completed successfully'
    });

    console.log('🎉 === 신규 등록 완료 API 종료 ===');

  } catch (error) {
    console.error('💥 === 등록 완료 전체 오류 ===', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    res.status(500).json({
      success: false,
      error: 'Registration completion failed',
      message: error.message,
      debug: {
        timestamp: new Date().toISOString(),
        useDatabase,
        supabaseConnected: !!supabase
      }
    });
  }
});

// ============================================================================
// 🔧 새로운 API: 세션 복원
// ============================================================================

app.post('/api/auth/session/restore', async (req: Request, res: Response) => {
  console.log('🔧 === 세션 복원 API 호출 ===');
  
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      console.log('❌ 세션 ID 없음');
      return res.status(400).json({
        success: false,
        error: 'Session ID is required'
      });
    }

    console.log('🔍 세션 조회 중:', sessionId);
    
    const sessionData = await db.findSession(sessionId);
    
    if (!sessionData) {
      console.log('❌ 유효하지 않은 세션:', sessionId);
      return res.status(404).json({
        success: false,
        error: 'Session not found or expired',
        message: '세션이 만료되었거나 존재하지 않습니다'
      });
    }

    console.log('✅ 세션 복원 성공:', {
      sessionId: sessionData.session_id,
      userId: sessionData.user_id,
      userHandle: sessionData.user_handle
    });

    // 🔧 활동 시간 업데이트
    if (useDatabase && supabase) {
      try {
        await supabase
          .from('webauthn_sessions')
          .update({ last_activity_at: new Date().toISOString() })
          .eq('session_id', sessionId);
      } catch (error) {
        console.warn('⚠️ 활동 시간 업데이트 실패:', error.message);
      }
    }

    // 사용자 정보 반환
    res.json({
      success: true,
      user: {
        id: sessionData.users.id,
        did: sessionData.users.did,
        username: sessionData.users.username,
        email: sessionData.users.email,
        walletAddress: sessionData.users.wallet_address,
        cueBalance: sessionData.users.cue_tokens,
        trustScore: sessionData.users.trust_score,
        passportLevel: sessionData.users.passport_level,
        biometricVerified: sessionData.users.biometric_verified,
        registeredAt: sessionData.users.created_at
      },
      sessionInfo: {
        sessionId: sessionData.session_id,
        loginTime: sessionData.metadata?.loginTime,
        lastActivity: sessionData.last_activity_at,
        expiresAt: sessionData.expires_at,
        deviceType: sessionData.metadata?.deviceType || 'unknown'
      },
      message: '세션이 성공적으로 복원되었습니다'
    });

    console.log('🎉 세션 복원 완료');

  } catch (error) {
    console.error('💥 세션 복원 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Session restore failed',
      message: error.message
    });
  }
});

// ============================================================================
// 🔧 새로운 API: 로그아웃 (세션 무효화)
// ============================================================================

app.post('/api/auth/session/logout', async (req: Request, res: Response) => {
  console.log('🔧 === 로그아웃 API 호출 ===');
  
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      console.log('❌ 세션 ID 없음');
      return res.status(400).json({
        success: false,
        error: 'Session ID is required'
      });
    }

    console.log('🗑️ 세션 무효화 중:', sessionId);
    
    const result = await db.invalidateSession(sessionId);
    
    if (result) {
      console.log('✅ 로그아웃 성공:', sessionId);
      
      res.json({
        success: true,
        message: '성공적으로 로그아웃되었습니다'
      });
    } else {
      console.log('⚠️ 세션 무효화 실패:', sessionId);
      
      res.status(500).json({
        success: false,
        error: 'Logout failed',
        message: '로그아웃 처리에 실패했습니다'
      });
    }

  } catch (error) {
    console.error('💥 로그아웃 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Logout failed',
      message: error.message
    });
  }
});

// ============================================================================
// 🔓 WebAuthn 로그인 API들 (기존과 동일)
// ============================================================================

app.post('/api/auth/webauthn/login/start', async (req: Request, res: Response) => {
  try {
    console.log('🔓 패스키 로그인 시작');
    
    const options = {
      challenge: base64urlEncode(Buffer.from(`auth_challenge_${Date.now()}_${Math.random()}`)),
      timeout: 60000,
      rpId: rpID,
      userVerification: "preferred" as const
    };

    const sessionId = `auth_session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    sessionStore.set(sessionId, {
      challenge: options.challenge,
      timestamp: Date.now()
    });

    res.json({
      success: true,
      options,
      sessionId
    });
  } catch (error) {
    console.error('❌ 로그인 시작 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Login start failed'
    });
  }
});

app.post('/api/auth/webauthn/login/complete', async (req: Request, res: Response) => {
  try {
    console.log('✅ 패스키 로그인 완료');
    
    const { credential, sessionId } = req.body;
    
    const sessionData = sessionStore.get(sessionId);
    if (!sessionData) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired session'
      });
    }

    // Mock user (실제로는 DB에서 조회)
    const user = {
      id: 'returning_user_123',
      did: 'did:final0626:returning_user_123',
      username: 'returning_user',
      email: 'user@example.com',
      wallet_address: '0x742d35Cc6460C532FAEcE1dd25073C8d2FCAE857',
      trust_score: 92.5,
      cue_balance: 15428.75,
      lastLogin: new Date().toISOString()
    };

    sessionStore.delete(sessionId);

    console.log('✅ 로그인 성공:', user.username);

    res.json({
      success: true,
      user,
      message: 'Login successful'
    });

  } catch (error) {
    console.error('❌ 로그인 완료 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Login completion failed'
    });
  }
});

// ============================================================================
// 🔧 자동 세션 정리 (1시간마다)
// ============================================================================

setInterval(async () => {
  console.log('🧹 === 만료된 세션 자동 정리 시작 ===');
  
  if (useDatabase && supabase) {
    try {
      const { data, error } = await supabase
        .from('webauthn_sessions')
        .update({ 
          is_active: false, 
          ended_at: new Date().toISOString() 
        })
        .eq('is_active', true)
        .lt('expires_at', new Date().toISOString())
        .select('session_id');

      if (error) {
        console.error('❌ 세션 정리 실패:', error);
      } else {
        console.log(`✅ ${data?.length || 0}개 만료된 세션 정리 완료`);
      }
    } catch (error) {
      console.error('❌ 세션 정리 예외:', error);
    }
  }
  
  // 임시 세션 정리 (기존)
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;
  
  for (const [sessionId, sessionData] of sessionStore.entries()) {
    if (now - sessionData.timestamp > fiveMinutes) {
      sessionStore.delete(sessionId);
      console.log(`🗑️ 만료된 임시 세션 삭제: ${sessionId}`);
    }
  }
}, 60 * 60 * 1000); // 1시간마다 실행

// ============================================================================
// 🔍 디버깅 API들 (기존과 동일)
// ============================================================================

app.get('/api/debug/sessions', (req: Request, res: Response) => {
  const sessions = Array.from(sessionStore.entries()).map(([id, data]) => ({
    sessionId: id,
    userId: data.userId,
    userName: data.userName,
    timestamp: data.timestamp,
    age: Date.now() - data.timestamp
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
    }
  };
  
  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    status
  });
});

// ============================================================================
// 🤖 기타 API들 (AI, CUE, Passport) - 기존과 동일
// ============================================================================

app.post('/api/ai/chat', async (req: Request, res: Response) => {
  try {
    const { message, userDid, model = 'gpt-4' } = req.body;

    if (!message || !userDid) {
      return res.status(400).json({
        success: false,
        error: 'Message and userDid are required'
      });
    }

    const aiResponse = `**AI 응답**: "${message}"\n\n실제 백엔드가 작동하고 있습니다! 🎉`;
    const cueEarned = Math.round((2.0 + Math.random() * 3.0) * 100) / 100;

    res.json({
      success: true,
      response: aiResponse,
      cueEarned,
      model,
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

app.get('/api/cue/balance/:did', async (req: Request, res: Response) => {
  try {
    const { did } = req.params;
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

app.get('/api/passport/:did', async (req: Request, res: Response) => {
  try {
    const { did } = req.params;
    
    const passport = {
      did,
      username: did.split(':').pop(),
      trustScore: 75 + Math.floor(Math.random() * 25),
      personalityProfile: {
        traits: ['창의적', '분석적', '호기심 많음'],
        preferences: { 
          communicationStyle: 'friendly', 
          responseLength: 'detailed' 
        }
      },
      cueBalance: 1500 + Math.floor(Math.random() * 5000),
      totalMined: 15000 + Math.floor(Math.random() * 50000),
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
      'POST /api/auth/webauthn/register/start',
      'POST /api/auth/webauthn/register/complete',
      'POST /api/auth/webauthn/login/start',
      'POST /api/auth/webauthn/login/complete',
      'POST /api/auth/session/restore',  // 🔧 새로운 엔드포인트
      'POST /api/auth/session/logout',   // 🔧 새로운 엔드포인트
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
      : error.message
  });
});

// ============================================================================
// 🚀 서버 시작
// ============================================================================

const server = app.listen(PORT, () => {
  console.log('🚀 ================================');
  console.log('🚀 Final0626 백엔드 서버 시작됨');
  console.log('🚀 ================================');
  console.log(`📍 서버: http://localhost:${PORT}`);
  console.log(`🏥 헬스체크: http://localhost:${PORT}/health`);
  console.log(`🗄️ 데이터베이스: ${useDatabase ? 'Supabase' : 'Mock'}`);
  console.log('📋 주요 API:');
  console.log('  🔐 Auth: /api/auth/webauthn/*');
  console.log('  🔧 Session: /api/auth/session/*'); // 🔧 새로운 세션 API
  console.log('  🤖 AI: /api/ai/chat');
  console.log('  💎 CUE: /api/cue/*');
  console.log('  🎫 Passport: /api/passport/*');
  console.log('🚀 ================================');
});

process.on('SIGINT', () => {
  console.log('\n🛑 서버 종료 중...');
  server.close(() => {
    console.log('✅ 서버 종료 완료');
    process.exit(0);
  });
});

export default app;