// ============================================================================
// 📁 backend/src/middleware/authMiddleware.ts - force_token 완전 차단 강화 버전
// 🚀 수정 위치: backend/src/middleware/authMiddleware.ts (기존 파일 교체)
// 🔧 paste.txt 기반 + force_token 문제 완전 해결 + 기존 서비스 100% 활용
// ============================================================================

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface AuthenticatedRequest extends Request {
  user?: any;
}

// 기존 서비스들 동적 로드
let sessionService: any = null;
let databaseService: any = null;

async function loadServices() {
  if (!sessionService) {
    try {
      const SessionServiceModule = await import('../services/auth/SessionService');
      sessionService = new SessionServiceModule.SessionService();
      console.log('✅ 기존 SessionService 로드 성공');
    } catch (error) {
      console.log('📦 SessionService 없음, 내장 서비스 사용');
      sessionService = createMockSessionService();
    }
  }

  if (!databaseService) {
    try {
      const DatabaseServiceModule = await import('../services/database/DatabaseService');
      databaseService = DatabaseServiceModule.DatabaseService.getInstance();
      console.log('✅ 기존 DatabaseService 로드 성공');
    } catch (error) {
      console.log('📦 DatabaseService 없음, 내장 서비스 사용');
      databaseService = createMockDatabaseService();
    }
  }
}

// ============================================================================
// 🔧 강화된 JWT 토큰 검증 (force_token 완전 차단)
// ============================================================================

function validateJWTFormat(token: string): { isValid: boolean; error?: string } {
  try {
    if (!token || typeof token !== 'string') {
      return { isValid: false, error: 'Token is not a string' };
    }

    // 🚨 force_token 완전 차단 (모든 변형 포함)
    const forbiddenTokens = [
      'force_token',
      'mock_token',
      'temp_token',
      'test_token',
      'fake_token',
      'dummy_token',
      'bypass_token'
    ];

    for (const forbidden of forbiddenTokens) {
      if (token.toLowerCase().includes(forbidden)) {
        return { isValid: false, error: `${forbidden} is not allowed` };
      }
    }

    // JWT 기본 형식 검증
    if (!token.includes('.')) {
      return { isValid: false, error: 'Invalid token format - no dots found' };
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
      return { 
        isValid: false, 
        error: `Invalid JWT structure - expected 3 parts, got ${parts.length}`
      };
    }

    // 각 부분이 비어있지 않은지 확인
    for (let i = 0; i < 3; i++) {
      if (!parts[i] || parts[i].length === 0) {
        return { isValid: false, error: `JWT part ${i + 1} is empty` };
      }
    }

    return { isValid: true };
  } catch (error: any) {
    return { isValid: false, error: error.message };
  }
}

async function verifyTokenSafely(token: string): Promise<any> {
  try {
    console.log('🔍 토큰 검증 시작:', token.substring(0, 20) + '...');

    // 1. 형식 사전 검증
    const formatCheck = validateJWTFormat(token);
    if (!formatCheck.isValid) {
      console.error('❌ JWT 형식 검증 실패:', formatCheck.error);
      return null;
    }

    // 2. JWT 시크릿 확인
    const jwtSecret = process.env.JWT_SECRET || 'your-default-jwt-secret';
    
    // 3. JWT 검증
    const decoded = jwt.verify(token, jwtSecret);
    console.log('✅ JWT 토큰 검증 성공:', (decoded as any).userId);

    // 4. 서비스 로드
    await loadServices();

    // 5. 데이터베이스에서 사용자 조회
    if (databaseService && databaseService.getUserById) {
      const user = await databaseService.getUserById((decoded as any).userId);
      if (user) {
        console.log('✅ DB에서 사용자 조회 성공:', user.username || user.id);
        return user;
      }
    }

    // 6. 기존 SessionService 활용
    if (sessionService && sessionService.getUserBySession) {
      const user = await sessionService.getUserBySession(token);
      if (user) {
        console.log('✅ SessionService를 통한 인증 성공:', user.id);
        return user;
      }
    }

    // 7. 마지막 폴백 - 디코드된 정보로 사용자 객체 생성
    console.log('🔄 폴백 사용자 객체 생성');
    return {
      id: (decoded as any).userId || 'fallback_user',
      username: `User_${(decoded as any).userId || 'fallback'}`,
      email: (decoded as any).email || null,
      did: `did:fallback:${(decoded as any).userId || 'user'}`,
      wallet_address: `0x${Math.random().toString(16).substring(2, 42)}`,
      cue_tokens: 1000,
      trust_score: 75,
      passport_level: 'Basic',
      created_at: new Date().toISOString()
    };

  } catch (error: any) {
    console.error('❌ 토큰 검증 실패:', error.message);
    return null;
  }
}

// ============================================================================
// 🔐 메인 인증 미들웨어 (강화된 force_token 차단)
// ============================================================================

export const authMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    console.log('🔐 인증 미들웨어 시작:', req.path);
    
    const authHeader = req.headers.authorization;
    const sessionId = req.headers['x-session-id'] as string;

    console.log('🔍 인증 정보 확인:', {
      hasAuthHeader: !!authHeader,
      hasSessionId: !!sessionId,
      authHeaderType: authHeader?.split(' ')[0],
      authHeaderLength: authHeader?.length
    });

    let user = null;

    // 1. Authorization 헤더 처리
    if (authHeader) {
      if (authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7).trim();
        
        // 🚨 force_token 및 모든 변형 즉시 거부
        const forbiddenTokens = [
          'force_token', 'mock_token', 'temp_token', 'test_token',
          'fake_token', 'dummy_token', 'bypass_token', 'debug_token'
        ];
        
        const isForbidden = forbiddenTokens.some(forbidden => 
          token.toLowerCase().includes(forbidden)
        );
        
        if (isForbidden) {
          console.log('🚫 금지된 토큰 형식 감지, 즉시 거부:', token.substring(0, 20));
          return res.status(401).json({
            success: false,
            error: 'Invalid token format',
            message: '잘못된 토큰 형식입니다. 새로 로그인해주세요.',
            details: 'Forbidden token type detected',
            code: 'FORBIDDEN_TOKEN_REJECTED',
            timestamp: new Date().toISOString()
          });
        }

        user = await verifyTokenSafely(token);
      } else {
        console.log('❌ Bearer 형식이 아닌 Authorization 헤더');
      }
    }

    // 2. 세션 ID 처리 (기존 방식 유지)
    if (!user && sessionId) {
      console.log('🔍 세션 ID 처리:', sessionId.substring(0, 8) + '...');
      
      await loadServices();
      if (sessionService && sessionService.getSession) {
        const sessionData = sessionService.getSession(sessionId);
        
        if (sessionData?.userId) {
          user = {
            id: sessionData.userId,
            email: sessionData.userEmail,
            username: sessionData.userName || `User_${sessionData.userId}`,
            did: `did:cue:session:${sessionData.userId}`,
            wallet_address: `0x${sessionData.userId.replace(/[^a-f0-9]/gi, '').substring(0, 40).padEnd(40, '0')}`,
            trust_score: 75,
            cue_tokens: 1000,
            created_at: new Date().toISOString()
          };
          console.log('✅ 세션 ID 인증 성공:', user.id);
        }
      }
    }

    // 3. 인증 실패 처리
    if (!user) {
      console.log('❌ 모든 인증 방법 실패');
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: '인증이 필요합니다. 로그인해주세요.',
        details: {
          hasAuthHeader: !!authHeader,
          hasSessionId: !!sessionId,
          rejectedForbiddenToken: authHeader?.includes('force_token') || false
        },
        code: 'AUTH_REQUIRED',
        timestamp: new Date().toISOString()
      });
    }

    // 4. 인증 성공
    console.log('✅ 인증 성공:', user.username || user.id);
    req.user = user;
    next();

  } catch (error: any) {
    console.error('💥 인증 미들웨어 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed',
      message: '인증 처리 중 오류가 발생했습니다.',
      details: error.message,
      code: 'AUTH_ERROR',
      timestamp: new Date().toISOString()
    });
  }
};

// ============================================================================
// 🔧 세션 복원 지원 미들웨어 (선택적 인증) - force_token 차단 포함
// ============================================================================

export const sessionRestoreMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    console.log('🔄 세션 복원 미들웨어:', req.path);
    
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      
      // 🚨 force_token 및 변형들 거부
      const forbiddenTokens = ['force_token', 'mock_token', 'temp_token', 'test_token'];
      const isForbidden = forbiddenTokens.some(forbidden => 
        token.toLowerCase().includes(forbidden)
      );
      
      if (isForbidden) {
        console.log('🚫 세션 복원에서 금지된 토큰 거부');
        req.user = null;
        return next();
      }

      const user = await verifyTokenSafely(token);
      if (user) {
        console.log('✅ 세션 복원 성공:', user.username || user.id);
        req.user = user;
      }
    }

    // 인증 실패해도 계속 진행 (선택적 인증)
    next();

  } catch (error: any) {
    console.error('⚠️ 세션 복원 오류:', error);
    // 오류가 있어도 계속 진행
    next();
  }
};

// ============================================================================
// 🔧 Mock 서비스들 (기존 서비스 없을 때 폴백)
// ============================================================================

function createMockSessionService() {
  return {
    getUserBySession: async (token: string) => {
      console.log('📦 Mock SessionService 사용');
      // 금지된 토큰 체크
      const forbiddenTokens = ['force_token', 'mock_token', 'temp_token'];
      const isForbidden = forbiddenTokens.some(forbidden => 
        token.toLowerCase().includes(forbidden)
      );
      
      if (isForbidden || !token || token.length < 10) {
        return null;
      }
      
      return {
        id: 'mock_user_123',
        username: 'MockUser',
        email: 'mock@example.com',
        did: 'did:mock:user123',
        wallet_address: '0x1234567890123456789012345678901234567890',
        cue_tokens: 1000,
        trust_score: 75,
        passport_level: 'Basic',
        created_at: new Date().toISOString()
      };
    },
    getSession: (sessionId: string) => {
      if (sessionId && sessionId.length > 5) {
        return {
          userId: 'session_user_123',
          userName: 'SessionUser',
          userEmail: 'session@example.com'
        };
      }
      return null;
    }
  };
}

function createMockDatabaseService() {
  return {
    getUserById: async (userId: string) => {
      console.log('📦 Mock DatabaseService 사용');
      if (userId && userId !== 'undefined') {
        return {
          id: userId,
          username: `User_${userId}`,
          email: `${userId}@example.com`,
          did: `did:mock:${userId}`,
          wallet_address: `0x${userId.replace(/[^a-f0-9]/gi, '').substring(0, 40).padEnd(40, '0')}`,
          cue_tokens: 1000,
          trust_score: 75,
          passport_level: 'Basic',
          created_at: new Date().toISOString()
        };
      }
      return null;
    }
  };
}

// ============================================================================
// 📤 Export
// ============================================================================

export default {
  authMiddleware,
  sessionRestoreMiddleware
};