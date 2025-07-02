// ============================================================================
// 📁 backend/src/middleware/authMiddleware.ts
// 🎯 간단하고 효율적인 인증 미들웨어 (SessionService 활용)
// ============================================================================

import { Request, Response, NextFunction } from 'express';
import { SessionService } from '../services/auth/SessionService';

interface AuthenticatedRequest extends Request {
  user?: any;
}

// SessionService 싱글톤
let sessionService: SessionService | null = null;

function getSessionService(): SessionService {
  if (!sessionService) {
    sessionService = new SessionService();
    console.log('🔧 SessionService 인스턴스 생성됨');
  }
  return sessionService;
}

// ============================================================================
// 🔐 메인 인증 미들웨어 (심플 버전)
// ============================================================================

export const authMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    console.log(`🔐 인증 확인: ${req.method} ${req.path}`);
    
    const authHeader = req.headers.authorization;
    const sessionId = req.headers['x-session-id'] as string;
    
    // 인증 정보 없음
    if (!authHeader && !sessionId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: '인증이 필요합니다. Authorization 헤더를 제공해주세요.'
      });
    }

    const sessionSvc = getSessionService();
    let user = null;

    // 🎯 1. Bearer JWT 토큰 처리 (메인 방법)
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      console.log('🔑 JWT 토큰 인증 시도');
      
      try {
        // SessionService에 모든 로직 위임
        user = await sessionSvc.getUserBySession(token);
        
        if (user) {
          console.log('✅ JWT 인증 성공:', user.id);
        } else {
          console.log('❌ JWT 토큰으로 사용자 조회 실패');
        }
      } catch (error) {
        console.error('❌ JWT 처리 오류:', error);
      }
    }

    // 🎯 2. 세션 ID 처리 (레거시 지원)
    if (!user && sessionId) {
      console.log('🔍 세션 ID 처리:', sessionId.substring(0, 8) + '...');
      
      try {
        const sessionData = sessionSvc.getSession(sessionId);
        
        if (sessionData?.userId) {
          // 세션 데이터를 사용자 객체로 변환
          user = {
            id: sessionData.userId,
            email: sessionData.userEmail,
            username: sessionData.userName || `User_${sessionData.userId}`,
            did: `did:ai-personal:${sessionData.userId}`,
            wallet_address: `0x${sessionData.userId.replace(/[^a-f0-9]/gi, '').substring(0, 40).padEnd(40, '0')}`,
            trust_score: 75,
            cue_balance: 1000,
            created_at: new Date().toISOString()
          };
          console.log('✅ 세션 ID 인증 성공:', user.id);
        }
      } catch (error) {
        console.error('❌ 세션 ID 처리 오류:', error);
      }
    }

    // 🎯 3. 개발 환경 Mock (최후 수단)
    if (!user && process.env.NODE_ENV === 'development') {
      console.log('🧪 개발 환경 Mock 사용자 적용');
      user = {
        id: 'dev_user_' + Date.now(),
        username: 'DevUser',
        email: 'dev@example.com',
        did: 'did:ai-personal:dev-user',
        wallet_address: '0x1234567890123456789012345678901234567890',
        trust_score: 95,
        cue_balance: 10000,
        created_at: new Date().toISOString()
      };
    }

    // 🚫 최종 인증 실패
    if (!user) {
      console.log('❌ 모든 인증 방법 실패');
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
        message: '유효하지 않거나 만료된 토큰입니다.'
      });
    }

    // ✅ 인증 성공
    req.user = user;
    console.log('✅ 인증 성공:', {
      userId: user.id,
      method: authHeader ? 'JWT' : sessionId ? 'Session' : 'Mock'
    });

    next();

  } catch (error) {
    console.error('💥 인증 미들웨어 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed',
      message: '인증 처리 중 오류가 발생했습니다.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================================================
// 🔧 헬퍼 미들웨어들
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
 * 공개 경로 체크
 */
export function isPublicPath(path: string): boolean {
  const publicPaths = [
    '/health',
    '/api/auth/webauthn/register/start',
    '/api/auth/webauthn/login/start',
    '/api/auth/webauthn/start',
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
    userId: req.user?.id || 'none'
  });
  
  next();
};

// ============================================================================
// 🎯 SessionService 상태 조회
// ============================================================================

/**
 * 인증 시스템 상태 조회 (API 엔드포인트용)
 */
export async function getAuthStatus() {
  try {
    const sessionSvc = getSessionService();
    const status = await sessionSvc.getStatus();
    
    return {
      middleware: 'Simple Auth Middleware',
      timestamp: new Date().toISOString(),
      ...status
    };
  } catch (error) {
    return {
      middleware: 'Simple Auth Middleware',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

export default authMiddleware;