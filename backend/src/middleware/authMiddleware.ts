// ============================================================================
// 📁 backend/src/middleware/authMiddleware.ts (기존 구조 개선)
// 🔧 JWT 토큰 검증 오류 해결 + 기존 SessionService 100% 활용
// ============================================================================

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { SessionService } from '../services/auth/SessionService';

interface AuthenticatedRequest extends Request {
  user?: any;
}

// 기존 SessionService 인스턴스 재사용
let sessionService: SessionService | null = null;

function getSessionService(): SessionService {
  if (!sessionService) {
    sessionService = new SessionService();
    console.log('🔧 기존 SessionService 인스턴스 재사용');
  }
  return sessionService;
}

// ============================================================================
// 🔧 강화된 JWT 토큰 검증 (force_token 문제 해결)
// ============================================================================

/**
 * JWT 토큰 형식 사전 검증
 */
function validateJWTFormat(token: string): { isValid: boolean; error?: string } {
  try {
    if (!token || typeof token !== 'string') {
      return { isValid: false, error: 'Token is not a string' };
    }

    // force_token 같은 잘못된 토큰 감지
    if (token.startsWith('force_token') || !token.includes('.')) {
      return { isValid: false, error: 'Invalid token format detected' };
    }

    // JWT는 반드시 3개 부분으로 구성
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

/**
 * 안전한 JWT 검증 (기존 SessionService 활용)
 */
async function verifyTokenSafely(token: string): Promise<any> {
  try {
    // 1. 형식 사전 검증
    const formatCheck = validateJWTFormat(token);
    if (!formatCheck.isValid) {
      console.error('❌ JWT 형식 검증 실패:', formatCheck.error);
      return null;
    }

    // 2. 기존 SessionService 활용
    const sessionSvc = getSessionService();
    const user = await sessionSvc.getUserBySession(token);
    
    if (user) {
      console.log('✅ 기존 SessionService를 통한 인증 성공:', user.id);
      return user;
    }

    // 3. 직접 JWT 검증 (SessionService 실패 시 백업)
    const JWT_SECRET = process.env.JWT_SECRET || 'cue-protocol-secret-key-2025';
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // Mock 사용자 데이터 생성 (기존 구조와 호환)
    const mockUser = {
      id: decoded.userId || 'jwt_user_' + Date.now(),
      username: decoded.username || 'JWTUser',
      email: decoded.email || 'jwt@cueprotocol.ai',
      did: decoded.did || `did:cue:jwt:${decoded.userId}`,
      wallet_address: '0x1234567890123456789012345678901234567890',
      walletAddress: '0x1234567890123456789012345678901234567890',
      cue_tokens: 5000 + Math.floor(Math.random() * 3000),
      cueBalance: 5000 + Math.floor(Math.random() * 3000),
      trust_score: 85 + Math.floor(Math.random() * 15),
      trustScore: 85 + Math.floor(Math.random() * 15),
      passport_level: 'Verified',
      passportLevel: 'Verified',
      biometric_verified: true,
      biometricVerified: true,
      auth_method: 'jwt',
      created_at: new Date().toISOString(),
      registeredAt: new Date().toISOString()
    };

    console.log('✅ 직접 JWT 검증 성공 (백업 방식)');
    return mockUser;

  } catch (error: any) {
    console.error('❌ JWT 검증 완전 실패:', error.message);
    return null;
  }
}

// ============================================================================
// 🔐 강화된 메인 인증 미들웨어 (기존 구조 100% 호환)
// ============================================================================

export const authMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    console.log(`🔐 강화된 인증 확인: ${req.method} ${req.path}`);
    
    const authHeader = req.headers.authorization;
    const sessionId = req.headers['x-session-id'] as string;
    
    console.log('📝 인증 정보:', {
      hasAuthHeader: !!authHeader,
      hasSessionId: !!sessionId,
      authHeaderType: authHeader?.split(' ')[0],
      authHeaderLength: authHeader?.length
    });

    let user = null;

    // 🎯 1. Authorization 헤더 처리 (강화됨)
    if (authHeader) {
      if (authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7).trim();
        console.log('🔑 Bearer 토큰 처리 시작:', {
          tokenLength: token.length,
          tokenStart: token.substring(0, 20),
          isForceToken: token.startsWith('force_token')
        });

        // force_token 같은 잘못된 토큰 즉시 거부
        if (token.startsWith('force_token')) {
          console.log('🚫 force_token 감지, 거부');
          return res.status(401).json({
            success: false,
            error: 'Invalid token format',
            message: '잘못된 토큰 형식입니다. 다시 로그인해주세요.',
            details: 'force_token is not supported'
          });
        }

        user = await verifyTokenSafely(token);
      } else {
        console.log('❌ Bearer 형식이 아닌 Authorization 헤더');
      }
    }

    // 🎯 2. 세션 ID 처리 (기존 방식 유지)
    if (!user && sessionId) {
      console.log('🔍 세션 ID 처리:', sessionId.substring(0, 8) + '...');
      
      try {
        const sessionSvc = getSessionService();
        const sessionData = sessionSvc.getSession(sessionId);
        
        if (sessionData?.userId) {
          user = {
            id: sessionData.userId,
            email: sessionData.userEmail,
            username: sessionData.userName || `User_${sessionData.userId}`,
            did: `did:cue:session:${sessionData.userId}`,
            wallet_address: `0x${sessionData.userId.replace(/[^a-f0-9]/gi, '').substring(0, 40).padEnd(40, '0')}`,
            walletAddress: `0x${sessionData.userId.replace(/[^a-f0-9]/gi, '').substring(0, 40).padEnd(40, '0')}`,
            trust_score: 75,
            trustScore: 75,
            cue_balance: 1000,
            cueBalance: 1000,
            created_at: new Date().toISOString(),
            registeredAt: new Date().toISOString()
          };
          console.log('✅ 세션 ID 인증 성공:', user.id);
        }
      } catch (error) {
        console.error('❌ 세션 ID 처리 오류:', error);
      }
    }

    // 🎯 3. 개발 환경 Mock (최후 수단, 기존 구조 유지)
    if (!user && process.env.NODE_ENV === 'development') {
      console.log('🧪 개발 환경 Mock 사용자 적용');
      user = {
        id: 'dev_user_' + Date.now(),
        username: 'DevUser',
        email: 'dev@cueprotocol.ai',
        did: 'did:cue:dev:user',
        wallet_address: '0x1234567890123456789012345678901234567890',
        walletAddress: '0x1234567890123456789012345678901234567890',
        trust_score: 95,
        trustScore: 95,
        cue_balance: 10000,
        cueBalance: 10000,
        passport_level: 'Developer',
        passportLevel: 'Developer',
        created_at: new Date().toISOString(),
        registeredAt: new Date().toISOString()
      };
    }

    // 🚫 최종 인증 실패
    if (!user) {
      console.log('❌ 모든 인증 방법 실패');
      return res.status(401).json({
        success: false,
        error: 'Authentication failed',
        message: '인증에 실패했습니다. 다시 로그인해주세요.',
        details: process.env.NODE_ENV === 'development' ? {
          hasAuthHeader: !!authHeader,
          hasSessionId: !!sessionId,
          authHeaderValid: authHeader ? validateJWTFormat(authHeader.substring(7)) : null
        } : undefined
      });
    }

    // ✅ 인증 성공
    req.user = user;
    console.log('✅ 인증 성공:', {
      userId: user.id,
      username: user.username,
      method: authHeader ? 'JWT' : sessionId ? 'Session' : 'Mock'
    });

    next();

  } catch (error: any) {
    console.error('💥 인증 미들웨어 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication error',
      message: '인증 처리 중 오류가 발생했습니다.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================================================
// 🔧 기존 헬퍼 미들웨어들 (그대로 유지)
// ============================================================================

/**
 * 선택적 인증 (토큰이 있으면 인증, 없으면 패스)
 */
export const optionalAuthMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const sessionId = req.headers['x-session-id'];
  
  if (authHeader || sessionId) {
    console.log('🔓 선택적 인증: 토큰 있음, 인증 진행');
    return authMiddleware(req, res, next);
  } else {
    console.log('🔓 선택적 인증: 토큰 없음, 익명 진행');
    next();
  }
};

/**
 * 공개 경로 체크 (기존 구조 유지)
 */
export function isPublicPath(path: string): boolean {
  const publicPaths = [
    '/health',
    '/api/auth/webauthn/register/start',
    '/api/auth/webauthn/login/start',
    '/api/auth/webauthn/start',
    '/api/auth/webauthn/complete',
    '/api/auth/session/restore',
    '/api/status'
  ];
  
  return publicPaths.some(publicPath => path.startsWith(publicPath));
}

/**
 * 조건부 인증 미들웨어 (공개 경로는 패스)
 */
export const conditionalAuthMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (isPublicPath(req.path)) {
    console.log(`🔓 공개 경로: ${req.path}`);
    next();
  } else {
    authMiddleware(req, res, next);
  }
};

/**
 * 인증 상태 디버깅
 */
export const debugAuthMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  console.log('🔍 인증 디버그:', {
    method: req.method,
    path: req.path,
    hasAuth: !!req.headers.authorization,
    hasSession: !!req.headers['x-session-id'],
    userAgent: req.headers['user-agent']?.substring(0, 50)
  });
  next();
};

export default authMiddleware;