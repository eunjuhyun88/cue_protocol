// ============================================================================
// 📁 backend/src/routes/auth/session-restore.ts
// 🔧 JWT malformed 에러 해결을 위한 세션 복원 API
// ============================================================================

import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

const router = Router();

// JWT 시크릿 (환경변수에서 가져오거나 기본값)
const JWT_SECRET = process.env.JWT_SECRET || 'cue-protocol-secret-key-2025';

// 임시 세션 저장소 (실제로는 데이터베이스 사용)
const validSessions = new Map<string, any>();

// ============================================================================
// 🔧 세션 복원 API (JWT malformed 에러 해결)
// POST /api/auth/session/restore
// ============================================================================

router.post('/restore', async (req: Request, res: Response) => {
  try {
    console.log('🔧 === 세션 복원 API ===');
    
    const { sessionToken, sessionId } = req.body;
    
    console.log('📝 요청 데이터:', {
      hasSessionToken: !!sessionToken,
      hasSessionId: !!sessionId,
      sessionTokenType: typeof sessionToken,
      sessionTokenLength: sessionToken?.length
    });

    // 1. JWT 토큰 검증 시도 (안전하게)
    if (sessionToken) {
      try {
        console.log('🔍 JWT 토큰 검증 시도...');
        
        // JWT 토큰이 올바른 형식인지 확인
        if (typeof sessionToken !== 'string' || !sessionToken.includes('.')) {
          throw new Error('Invalid JWT format');
        }

        // JWT 검증 (더 관대한 검증)
        const decoded = jwt.verify(sessionToken, JWT_SECRET) as any;
        console.log('✅ JWT 토큰 검증 성공:', { userId: decoded.userId, did: decoded.did });

        // Mock 사용자 데이터 반환 (실제로는 DB에서 조회)
        const mockUser = {
          id: decoded.userId || 'restored_user_123',
          username: decoded.username || 'RestoredAgent',
          email: 'restored@cueprotocol.ai',
          did: decoded.did || 'did:cue:restored:123',
          walletAddress: '0x1234567890123456789012345678901234567890',
          cueBalance: 8750 + Math.floor(Math.random() * 5000),
          trustScore: 90 + Math.floor(Math.random() * 10),
          passportLevel: 'Verified',
          biometricVerified: true,
          registeredAt: new Date(Date.now() - 86400000 * 7).toISOString() // 7일 전
        };

        return res.json({
          success: true,
          user: mockUser,
          message: 'JWT 세션 복원 성공',
          restoredFrom: 'jwt'
        });

      } catch (jwtError: any) {
        console.log('❌ JWT 토큰 검증 실패:', jwtError.message);
        
        // JWT 에러의 경우 더 자세한 로그
        if (jwtError.message.includes('malformed')) {
          console.log('🔧 JWT malformed 에러 - 토큰 형식 분석:');
          console.log('   토큰 길이:', sessionToken?.length);
          console.log('   토큰 시작:', sessionToken?.substring(0, 20));
          console.log('   점(.) 개수:', (sessionToken?.match(/\./g) || []).length);
        }
        
        // JWT 실패해도 계속 진행 (sessionId로 시도)
      }
    }

    // 2. SessionId 기반 복원 시도
    if (sessionId) {
      console.log('🔍 SessionId 기반 복원 시도:', sessionId);
      
      // 세션 ID로 조회 (간단한 패턴 매칭)
      if (sessionId.startsWith('perm_') || sessionId.startsWith('mock_')) {
        console.log('✅ 유효한 세션 ID 형식 확인');
        
        const mockUser = {
          id: 'session_user_123',
          username: 'SessionAgent',
          email: 'session@cueprotocol.ai',
          did: `did:cue:session:${Date.now()}`,
          walletAddress: '0x9876543210987654321098765432109876543210',
          cueBalance: 12000 + Math.floor(Math.random() * 3000),
          trustScore: 85 + Math.floor(Math.random() * 15),
          passportLevel: 'Verified Agent',
          biometricVerified: true,
          registeredAt: new Date(Date.now() - 86400000 * 3).toISOString() // 3일 전
        };

        return res.json({
          success: true,
          user: mockUser,
          message: '세션 ID 복원 성공',
          restoredFrom: 'sessionId'
        });
      }
    }

    // 3. 모든 복원 방법 실패
    console.log('❌ 모든 세션 복원 방법 실패');
    
    return res.status(401).json({
      success: false,
      error: 'No valid session found',
      message: '유효한 세션을 찾을 수 없습니다',
      details: {
        hasSessionToken: !!sessionToken,
        hasSessionId: !!sessionId,
        jwtError: sessionToken ? 'JWT verification failed' : null
      }
    });

  } catch (error: any) {
    console.error('💥 세션 복원 API 에러:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Session restore failed',
      message: '세션 복원 중 서버 오류가 발생했습니다',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ============================================================================
// 🔧 로그아웃 API
// POST /api/auth/logout
// ============================================================================

router.post('/logout', async (req: Request, res: Response) => {
  try {
    console.log('🔧 === 로그아웃 API ===');
    
    const { sessionToken, sessionId } = req.body;
    
    // 세션 무효화 (실제로는 DB에서 삭제)
    if (sessionToken) {
      validSessions.delete(sessionToken);
      console.log('🗑️ JWT 세션 토큰 무효화됨');
    }
    
    if (sessionId) {
      validSessions.delete(sessionId);
      console.log('🗑️ 세션 ID 무효화됨');
    }

    res.json({
      success: true,
      message: '로그아웃 성공',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('💥 로그아웃 API 에러:', error);
    
    res.status(500).json({
      success: false,
      error: 'Logout failed',
      message: '로그아웃 중 오류가 발생했습니다'
    });
  }
});

// ============================================================================
// 🔧 새로운 JWT 토큰 생성 유틸리티
// ============================================================================

export function createJWTToken(user: any): string {
  try {
    const payload = {
      userId: user.id,
      username: user.username,
      did: user.did,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // 30일
    };

    const token = jwt.sign(payload, JWT_SECRET);
    console.log('✅ JWT 토큰 생성 성공');
    
    return token;
  } catch (error) {
    console.error('❌ JWT 토큰 생성 실패:', error);
    throw error;
  }
}

console.log('✅ 세션 복원 라우트 설정 완료');

export default router;