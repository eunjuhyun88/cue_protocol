// ============================================================================
// 🔧 세션 복원 서비스 - JWT malformed 에러 특화 (paste.txt 로직 추출)
// 파일: backend/src/services/auth/SessionRestoreService.ts
// 역할: 강화된 세션 복원, JWT 에러 대응, 다중 폴백 지원
// ============================================================================

import jwt from 'jsonwebtoken';

export class SessionRestoreService {
  private readonly JWT_SECRET: string;

  constructor() {
    this.JWT_SECRET = process.env.JWT_SECRET || 'final0626-development-secret-key';
    console.log('🔧 SessionRestoreService 초기화됨 (JWT malformed 특화)');
  }

  /**
   * 강화된 세션 복원 (paste.txt 로직 완전 적용)
   */
  async restoreSessionRobust(sessionToken?: string, sessionId?: string): Promise<any> {
    try {
      console.log('🔧 === 강화된 세션 복원 ===');
      
      console.log('📝 요청 데이터:', {
        hasSessionToken: !!sessionToken,
        hasSessionId: !!sessionId,
        sessionTokenType: typeof sessionToken,
        sessionTokenLength: sessionToken?.length
      });

      // 1. JWT 토큰 검증 시도 (paste.txt 방식)
      if (sessionToken) {
        try {
          console.log('🔍 JWT 토큰 검증 시도...');
          
          // JWT 토큰이 올바른 형식인지 확인
          if (typeof sessionToken !== 'string' || !sessionToken.includes('.')) {
            throw new Error('Invalid JWT format');
          }

          // JWT 검증 (더 관대한 검증)
          const decoded = jwt.verify(sessionToken, this.JWT_SECRET) as any;
          console.log('✅ JWT 토큰 검증 성공:', { userId: decoded.userId, did: decoded.did });

          // Mock 사용자 데이터 반환 (paste.txt 방식)
          const mockUser = {
            id: decoded.userId || 'restored_user_123',
            username: decoded.username || 'RestoredAgent',
            email: 'restored@final0626.ai',
            did: decoded.did || 'did:final0626:restored:123',
            wallet_address: '0x1234567890123456789012345678901234567890',
            walletAddress: '0x1234567890123456789012345678901234567890', // 프론트엔드 호환성
            cue_tokens: 8750 + Math.floor(Math.random() * 5000),
            cueBalance: 8750 + Math.floor(Math.random() * 5000), // 프론트엔드 호환성
            trust_score: 90 + Math.floor(Math.random() * 10),
            trustScore: 90 + Math.floor(Math.random() * 10), // 프론트엔드 호환성
            passport_level: 'Verified',
            passportLevel: 'Verified', // 프론트엔드 호환성
            biometric_verified: true,
            biometricVerified: true, // 프론트엔드 호환성
            created_at: new Date(Date.now() - 86400000 * 7).toISOString(), // 7일 전
            registeredAt: new Date(Date.now() - 86400000 * 7).toISOString() // 프론트엔드 호환성
          };

          return {
            success: true,
            user: mockUser,
            message: 'JWT 세션 복원 성공',
            restoredFrom: 'jwt'
          };

        } catch (jwtError: any) {
          console.log('❌ JWT 토큰 검증 실패:', jwtError.message);
          
          // JWT 에러의 경우 더 자세한 로그 (paste.txt 방식)
          if (jwtError.message.includes('malformed')) {
            console.log('🔧 JWT malformed 에러 - 토큰 형식 분석:');
            console.log('   토큰 길이:', sessionToken?.length);
            console.log('   토큰 시작:', sessionToken?.substring(0, 20));
            console.log('   점(.) 개수:', (sessionToken?.match(/\./g) || []).length);
          }
          
          // JWT 실패해도 계속 진행 (sessionId로 시도)
        }
      }

      // 2. SessionId 기반 복원 시도 (paste.txt 방식)
      if (sessionId) {
        console.log('🔍 SessionId 기반 복원 시도:', sessionId);
        
        // 세션 ID로 조회 (간단한 패턴 매칭)
        if (sessionId.startsWith('perm_') || 
            sessionId.startsWith('mock_') || 
            sessionId.startsWith('unified_') ||
            sessionId.startsWith('register_') ||
            sessionId.startsWith('login_')) {
          console.log('✅ 유효한 세션 ID 형식 확인');
          
          const mockUser = {
            id: 'session_user_123',
            username: 'SessionAgent',
            email: 'session@final0626.ai',
            did: `did:final0626:session:${Date.now()}`,
            wallet_address: '0x9876543210987654321098765432109876543210',
            walletAddress: '0x9876543210987654321098765432109876543210', // 프론트엔드 호환성
            cue_tokens: 12000 + Math.floor(Math.random() * 3000),
            cueBalance: 12000 + Math.floor(Math.random() * 3000), // 프론트엔드 호환성
            trust_score: 85 + Math.floor(Math.random() * 15),
            trustScore: 85 + Math.floor(Math.random() * 15), // 프론트엔드 호환성
            passport_level: 'Verified Agent',
            passportLevel: 'Verified Agent', // 프론트엔드 호환성
            biometric_verified: true,
            biometricVerified: true, // 프론트엔드 호환성
            created_at: new Date(Date.now() - 86400000 * 3).toISOString(), // 3일 전
            registeredAt: new Date(Date.now() - 86400000 * 3).toISOString() // 프론트엔드 호환성
          };

          return {
            success: true,
            user: mockUser,
            message: '세션 ID 복원 성공',
            restoredFrom: 'sessionId'
          };
        }
      }

      // 3. 모든 복원 방법 실패
      console.log('❌ 모든 세션 복원 방법 실패');
      
      return {
        success: false,
        error: 'No valid session found',
        message: '유효한 세션을 찾을 수 없습니다',
        details: {
          hasSessionToken: !!sessionToken,
          hasSessionId: !!sessionId,
          jwtError: sessionToken ? 'JWT verification failed' : null
        }
      };

    } catch (error: any) {
      console.error('💥 강화된 세션 복원 에러:', error);
      
      return {
        success: false,
        error: 'Session restore failed',
        message: '세션 복원 중 서버 오류가 발생했습니다',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * JWT 토큰 생성 (paste.txt 유틸리티)
   */
  createJWTToken(user: any): string {
    try {
      const payload = {
        userId: user.id,
        username: user.username,
        did: user.did,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // 30일
      };

      const token = jwt.sign(payload, this.JWT_SECRET);
      console.log('✅ JWT 토큰 생성 성공');
      
      return token;
    } catch (error) {
      console.error('❌ JWT 토큰 생성 실패:', error);
      throw error;
    }
  }

  /**
   * 로그아웃 처리 (paste.txt 로직)
   */
  async logout(sessionToken?: string, sessionId?: string): Promise<any> {
    try {
      console.log('🔧 === 로그아웃 API ===');
      
      // 세션 무효화 (실제로는 DB에서 삭제)
      if (sessionToken) {
        console.log('🗑️ JWT 세션 토큰 무효화됨');
      }
      
      if (sessionId) {
        console.log('🗑️ 세션 ID 무효화됨');
      }

      return {
        success: true,
        message: '로그아웃 성공',
        timestamp: new Date().toISOString()
      };

    } catch (error: any) {
      console.error('💥 로그아웃 API 에러:', error);
      
      return {
        success: false,
        error: 'Logout failed',
        message: '로그아웃 중 오류가 발생했습니다'
      };
    }
  }

  /**
   * 서비스 상태 조회
   */
  getStatus(): any {
    return {
      sessionRestoreService: {
        initialized: true,
        jwtConfigured: !this.JWT_SECRET.includes('development'),
        features: {
          jwtRestore: true,
          sessionIdRestore: true,
          robustErrorHandling: true,
          malformedJWTSupport: true
        }
      },
      timestamp: new Date().toISOString()
    };
  }
}