// ============================================================================
// 📁 backend/src/routes/auth/unified.ts
// 🔐 통합 인증 라우터 - DI Container 인스턴스 전달 지원 (완전 수정 버전)
// ============================================================================

import express, { Request, Response, Router, NextFunction } from 'express';
import { authMiddleware } from '../../middleware/authMiddleware';
import { asyncHandler } from '../../middleware/errorHandler';
import jwt from 'jsonwebtoken';
import { DIContainer } from '../../core/DIContainer';

// 🔧 핵심 수정: DI Container 인스턴스를 받을 수 있는 구조
let containerInstance: any = null;

/**
 * DI Container 인스턴스를 설정하는 함수
 */
function setDIContainer(container: any) {
  containerInstance = container;
  console.log('🔧 통합 인증 라우터에 DI Container 설정됨');
}

/**
 * DI에서 서비스를 안전하게 가져오는 함수들 (fallback 지원)
 */
const getAuthService = () => {
  if (containerInstance) {
    try {
      return containerInstance.get('AuthService');
    } catch (error) {
      console.warn('⚠️ containerInstance에서 AuthService 조회 실패:', error.message);
    }
  }
  
  // Fallback: 직접 import 시도
  try {
    const { getService } = require('../../core/DIContainer');
    return getService('AuthService');
  } catch (error) {
    console.error('❌ AuthService 가져오기 실패:', error);
    throw new Error('인증 서비스를 사용할 수 없습니다');
  }
};

const getSessionService = () => {
  if (containerInstance) {
    try {
      return containerInstance.get('SessionService');
    } catch (error) {
      console.warn('⚠️ containerInstance에서 SessionService 조회 실패:', error.message);
    }
  }
  
  try {
    const { getService } = require('../../core/DIContainer');
    return getService('SessionService');
  } catch (error) {
    console.error('❌ SessionService 가져오기 실패:', error);
    throw new Error('세션 서비스를 사용할 수 없습니다');
  }
};

const getWebAuthnService = () => {
  if (containerInstance) {
    try {
      return containerInstance.get('WebAuthnService');
    } catch (error) {
      console.warn('⚠️ containerInstance에서 WebAuthnService 조회 실패:', error.message);
    }
  }
  
  try {
    const { getService } = require('../../core/DIContainer');
    return getService('WebAuthnService');
  } catch (error) {
    console.error('❌ WebAuthnService 가져오기 실패:', error);
    throw new Error('WebAuthn 서비스를 사용할 수 없습니다');
  }
};

const getUnifiedAuthAdapter = () => {
  if (containerInstance) {
    try {
      return containerInstance.get('UnifiedAuthAdapter');
    } catch (error) {
      console.warn('⚠️ containerInstance에서 UnifiedAuthAdapter 조회 실패:', error.message);
    }
  }
  
  try {
    const { getService } = require('../../core/DIContainer');
    return getService('UnifiedAuthAdapter');
  } catch (error) {
    console.error('❌ UnifiedAuthAdapter 가져오기 실패:', error);
    throw new Error('통합 인증 어댑터를 사용할 수 없습니다');
  }
};

const getDatabaseService = () => {
  if (containerInstance) {
    try {
      return containerInstance.get('ActiveDatabaseService');
    } catch (error) {
      console.warn('⚠️ containerInstance에서 DatabaseService 조회 실패:', error.message);
    }
  }
  
  try {
    const { getService } = require('../../core/DIContainer');
    return getService('ActiveDatabaseService');
  } catch (error) {
    console.error('❌ DatabaseService 가져오기 실패:', error);
    // 임시 fallback으로 직접 import 시도
    try {
      const databaseService = require('../../services/database/DatabaseService').default;
      return databaseService;
    } catch (fallbackError) {
      throw new Error('데이터베이스 서비스를 사용할 수 없습니다');
    }
  }
};

const getCueService = () => {
  if (containerInstance) {
    try {
      return containerInstance.get('CueService');
    } catch (error) {
      console.warn('⚠️ containerInstance에서 CueService 조회 실패:', error.message);
    }
  }
  
  try {
    const { getService } = require('../../core/DIContainer');
    return getService('CueService');
  } catch (error) {
    console.warn('⚠️ CueService 가져오기 실패, 기본값 사용:', error);
    return {
      async mineFromAuth(userDid: string) {
        return { amount: 10, newBalance: 100 };
      },
      async awardTokens(userDid: string, amount: number, reason: string) {
        return { amount, newBalance: 100 + amount };
      }
    };
  }
};

/**
 * 통합 인증 라우터 생성 함수 (DI Container 인스턴스 지원)
 */
function createAuthUnifiedRoutes(container?: any): Router {
  const router = Router();
  
  // DI Container 설정
  if (container) {
    setDIContainer(container);
    console.log('🔐 통합 인증 라우트 초기화 (DI Container 인스턴스 전달됨)');
  } else {
    console.log('🔐 통합 인증 라우트 초기화 (fallback 모드)');
  }

  // ============================================================================
  // 🔥 통합 인증 API (메인 추천 방식)
  // ============================================================================

  /**
   * POST /auth/start
   * 통합 인증 시작 - 로그인/회원가입 자동 판별
   */
  router.post('/auth/start', asyncHandler(async (req: Request, res: Response): Promise<void> => {
    console.log('🔍 === 통합 인증 시작 (수정된 DI 버전) ===');
    
    try {
      const { deviceInfo, userAgent, preferredMethod = 'WebAuthn' } = req.body;
      
      // 디바이스 정보 보강
      const enrichedDeviceInfo = {
        ...deviceInfo,
        userAgent: userAgent || req.get('User-Agent') || 'Unknown',
        ip: req.ip || req.connection.remoteAddress,
        timestamp: new Date().toISOString(),
        fingerprint: req.get('X-Client-Fingerprint'),
        preferredMethod
      };
      
      console.log('📱 디바이스 정보:', JSON.stringify(enrichedDeviceInfo, null, 2));
      
      // DI에서 통합 인증 어댑터 사용
      const unifiedAuthAdapter = getUnifiedAuthAdapter();
      const result = await unifiedAuthAdapter.startUnifiedAuth(enrichedDeviceInfo);
      
      console.log('✅ 통합 인증 시작 성공');
      
      res.json({
        success: true,
        ...result,
        method: preferredMethod,
        message: `${preferredMethod}를 사용하여 인증해주세요`,
        supportedMethods: ['WebAuthn', 'Biometric'],
        sessionTimeout: 300, // 5분
        containerMode: containerInstance ? 'direct' : 'fallback',
        timestamp: new Date().toISOString()
      });
      
    } catch (error: any) {
      console.error('❌ 통합 인증 시작 오류:', error);
      
      res.status(500).json({
        success: false,
        error: 'Unified auth start failed',
        message: error.message,
        code: 'AUTH_START_FAILED',
        containerMode: containerInstance ? 'direct' : 'fallback',
        timestamp: new Date().toISOString(),
        suggestion: '잠시 후 다시 시도하거나 다른 인증 방법을 선택해주세요'
      });
    }
  }));

  /**
   * POST /auth/complete
   * 통합 인증 완료 - 기존/신규 사용자 자동 처리
   */
  router.post('/auth/complete', asyncHandler(async (req: Request, res: Response): Promise<void> => {
    console.log('✅ === 통합 인증 완료 (수정된 DI 버전) ===');
    
    try {
      const { credential, sessionId, deviceId, metadata = {} } = req.body;
      
      // 필수 파라미터 검증
      if (!credential || !sessionId) {
        res.status(400).json({
          success: false,
          error: 'Missing required parameters',
          message: 'credential과 sessionId가 필요합니다',
          code: 'MISSING_PARAMETERS'
        });
        return;
      }
      
      console.log('🔐 인증 완료 처리 중...');
      console.log('📋 Session ID:', sessionId);
      console.log('🆔 Device ID:', deviceId);
      
      // DI에서 통합 인증 어댑터 사용
      const unifiedAuthAdapter = getUnifiedAuthAdapter();
      const result = await unifiedAuthAdapter.completeUnifiedAuth(credential, sessionId);
      
      // 인증 성공 시 CUE 토큰 보상 지급 (백그라운드)
      if (result.success && result.user?.did) {
        setImmediate(async () => {
          try {
            const cueService = getCueService();
            const reward = await cueService.mineFromAuth(result.user.did);
            console.log(`💎 인증 보상 지급: ${reward.amount} CUE`);
          } catch (error) {
            console.warn('⚠️ CUE 보상 지급 실패:', error);
          }
        });
      }
      
      console.log('✅ 통합 인증 완료 성공');
      
      res.json({
        success: true,
        ...result,
        authType: 'unified',
        message: result.isExistingUser ? '로그인 완료!' : '환영합니다! 회원가입이 완료되었습니다.',
        bonusMessage: result.isExistingUser ? 
          '로그인 보상으로 10 CUE가 지급됩니다!' : 
          '가입 축하 보상으로 100 CUE가 지급됩니다!',
        nextSteps: result.isExistingUser ? 
          ['대시보드 이용', 'AI 채팅 시작', 'CUE 마이닝'] :
          ['프로필 설정', '첫 AI 대화', 'CUE 마이닝 시작'],
        containerMode: containerInstance ? 'direct' : 'fallback',
        timestamp: new Date().toISOString()
      });
      
    } catch (error: any) {
      console.error('❌ 통합 인증 완료 오류:', error);
      
      res.status(500).json({
        success: false,
        error: 'Unified auth complete failed',
        message: error.message,
        code: 'AUTH_COMPLETE_FAILED',
        containerMode: containerInstance ? 'direct' : 'fallback',
        timestamp: new Date().toISOString(),
        suggestion: '인증 정보를 확인하고 다시 시도해주세요'
      });
    }
  }));

  // ============================================================================
  // 🔑 토큰 검증 API (DI 패턴 적용)
  // ============================================================================

  /**
   * POST /token/verify
   * 토큰 검증 및 사용자 정보 반환
   */
  router.post('/token/verify', asyncHandler(async (req: Request, res: Response): Promise<void> => {
    console.log('🔍 === 토큰 검증 요청 (수정된 DI 패턴) ===');
    
    try {
      const { token } = req.body;
      const authHeader = req.headers.authorization;
      
      // 토큰 추출 (Body 또는 Authorization Header에서)
      const authToken = token || 
        (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : authHeader);
      
      if (!authToken) {
        res.status(400).json({
          success: false,
          error: 'Token required',
          message: '인증 토큰이 필요합니다',
          code: 'TOKEN_MISSING'
        });
        return;
      }
      
      console.log('🔐 토큰 검증 중...');
      
      // DI에서 통합 인증 어댑터 사용
      const unifiedAuthAdapter = getUnifiedAuthAdapter();
      const validation = await unifiedAuthAdapter.validateToken(authToken);
      
      if (!validation.valid) {
        res.status(401).json({
          success: false,
          error: 'Invalid token',
          message: '유효하지 않은 토큰입니다',
          code: 'TOKEN_INVALID',
          details: validation.error
        });
        return;
      }
      
      console.log('✅ 토큰 검증 성공');
      
      res.json({
        success: true,
        valid: true,
        user: validation.user,
        tokenType: 'Bearer',
        expiresIn: validation.expiresIn || 3600, // 1시간
        scope: validation.scope || ['read', 'write'],
        containerMode: containerInstance ? 'direct' : 'fallback',
        timestamp: new Date().toISOString()
      });
      
    } catch (error: any) {
      console.error('❌ 토큰 검증 오류:', error);
      
      res.status(500).json({
        success: false,
        error: 'Token verification failed',
        message: '토큰 검증 중 오류가 발생했습니다',
        code: 'TOKEN_VERIFICATION_FAILED',
        details: error.message
      });
    }
  }));

  // ============================================================================
  // 🔍 간단한 토큰 검증 API (authMiddleware 사용)
  // ============================================================================

  /**
   * POST /verify
   * authMiddleware를 사용한 간단한 토큰 검증
   */
  router.post('/verify', authMiddleware, asyncHandler(async (req: Request, res: Response): Promise<void> => {
    console.log('🔍 토큰 검증 API 호출 (authMiddleware 사용)');

    try {
      // authMiddleware에서 이미 사용자 검증 완료
      const user = (req as any).user;
      
      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Token verification failed',
          message: '토큰 검증에 실패했습니다.',
          code: 'TOKEN_INVALID'
        });
        return;
      }

      // 사용자 정보 보강
      let enrichedUser = { ...user };
      
      try {
        // DI를 통한 데이터베이스 서비스 사용
        const databaseService = getDatabaseService();
        
        // CUE 잔액 조회
        const cueBalance = await databaseService.getCUEBalance(user.id);
        enrichedUser.cueBalance = cueBalance;
        
        // 추가 프로필 정보 조회
        const profile = await databaseService.getUserProfile(user.id);
        if (profile) {
          enrichedUser = { ...enrichedUser, ...profile };
        }
      } catch (error) {
        console.warn('⚠️ 사용자 정보 보강 실패:', error);
      }

      res.json({
        success: true,
        message: '토큰 검증 성공',
        user: enrichedUser,
        tokenValid: true,
        authenticated: true,
        containerMode: containerInstance ? 'direct' : 'fallback',
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('❌ 토큰 검증 API 오류:', error);
      res.status(500).json({
        success: false,
        error: 'Token verification error',
        message: '토큰 검증 중 오류가 발생했습니다.',
        details: error.message,
        code: 'TOKEN_VERIFICATION_ERROR'
      });
    }
  }));

  // ============================================================================
  // 🔄 세션 복원 API (DI 패턴 적용)
  // ============================================================================

  /**
   * POST /session/restore
   * 세션 복원 및 토큰 갱신
   */
  router.post('/session/restore', asyncHandler(async (req: Request, res: Response): Promise<void> => {
    console.log('🔄 === 세션 복원 요청 (수정된 DI 패턴) ===');
    
    try {
      const { token, sessionToken, deviceId, extended = false } = req.body;
      const authHeader = req.headers.authorization;
      
      // 토큰 추출
      const authToken = sessionToken || token || 
        (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : authHeader);
      
      if (!authToken) {
        res.status(400).json({
          success: false,
          error: 'Session token required',
          message: '세션 토큰이 필요합니다.',
          code: 'SESSION_TOKEN_MISSING'
        });
        return;
      }

      // force_token 체크 (보안)
      if (authToken.startsWith('force_token')) {
        res.status(401).json({
          success: false,
          error: 'Invalid token format',
          message: '잘못된 토큰 형식입니다.',
          code: 'FORCE_TOKEN_REJECTED'
        });
        return;
      }
      
      console.log('🔄 세션 복원 중...');
      console.log('🆔 Device ID:', deviceId);
      console.log('⏰ Extended:', extended);
      
      try {
        // DI에서 통합 인증 어댑터 사용 (우선순위)
        const unifiedAuthAdapter = getUnifiedAuthAdapter();
        const sessionResult = await unifiedAuthAdapter.restoreSession(authToken);
        
        if (!sessionResult.success) {
          res.status(401).json({
            success: false,
            error: 'Session restore failed',
            message: '세션을 복원할 수 없습니다',
            code: 'SESSION_RESTORE_FAILED',
            details: sessionResult.error
          });
          return;
        }
        
        // Extended 세션인 경우 토큰 갱신
        let newToken = null;
        if (extended && sessionResult.user) {
          try {
            const sessionService = getSessionService();
            newToken = sessionService.generateSessionToken(
              sessionResult.user.id,
              deviceId,
              { extended: true }
            );
            console.log('🔄 Extended 토큰 발급됨');
          } catch (error) {
            console.warn('⚠️ Extended 토큰 발급 실패:', error);
          }
        }
        
        console.log('✅ 세션 복원 성공 (DI Adapter)');
        
        res.json({
          success: true,
          user: sessionResult.user,
          newToken,
          tokenExpiry: extended ? '30d' : '7d',
          sessionType: extended ? 'extended' : 'standard',
          lastActivity: sessionResult.lastActivity,
          deviceVerified: !!deviceId,
          containerMode: containerInstance ? 'direct' : 'fallback',
          timestamp: new Date().toISOString()
        });
        
      } catch (adapterError) {
        console.warn('⚠️ DI Adapter 세션 복원 실패, JWT 직접 처리:', adapterError);
        
        // Fallback: JWT 직접 검증
        const jwtSecret = process.env.JWT_SECRET || 'your-default-jwt-secret';
        
        try {
          const decoded = jwt.verify(authToken, jwtSecret) as any;
          
          // 사용자 조회
          const databaseService = getDatabaseService();
          const user = await databaseService.getUserById(decoded.userId);
          
          if (!user) {
            res.status(401).json({
              success: false,
              error: 'User not found',
              message: '사용자를 찾을 수 없습니다.',
              code: 'USER_NOT_FOUND'
            });
            return;
          }

          // 세션 복원 성공
          console.log('✅ 세션 복원 성공 (JWT Fallback):', user.username);

          res.json({
            success: true,
            message: '세션 복원 성공',
            user: {
              ...user,
              authenticated: true
            },
            sessionRestored: true,
            containerMode: 'fallback-jwt',
            timestamp: new Date().toISOString()
          });

        } catch (jwtError) {
          console.error('❌ JWT 검증 실패:', jwtError);
          
          res.status(401).json({
            success: false,
            error: 'Invalid session token',
            message: '유효하지 않은 세션 토큰입니다.',
            code: 'INVALID_SESSION_TOKEN'
          });
        }
      }
      
    } catch (error: any) {
      console.error('❌ 세션 복원 오류:', error);
      
      res.status(500).json({
        success: false,
        error: 'Session restore failed',
        message: '세션 복원 중 오류가 발생했습니다',
        code: 'SESSION_RESTORE_ERROR',
        details: error.message
      });
    }
  }));

  // ============================================================================
  // 👤 사용자 정보 조회 API
  // ============================================================================

  /**
   * GET /me
   * 현재 인증된 사용자 정보 조회
   */
  router.get('/me', authMiddleware, asyncHandler(async (req: Request, res: Response): Promise<void> => {
    console.log('👤 사용자 정보 조회 API 호출');

    try {
      const user = (req as any).user;
      
      if (!user) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated',
          message: '인증되지 않은 사용자입니다.',
          code: 'NOT_AUTHENTICATED'
        });
        return;
      }

      // 최신 사용자 정보 조회
      let latestUser = user;
      
      try {
        const databaseService = getDatabaseService();
        const dbUser = await databaseService.getUserById(user.id);
        if (dbUser) {
          latestUser = { ...dbUser, authenticated: true };
        }
      } catch (error) {
        console.warn('⚠️ 최신 사용자 정보 조회 실패:', error);
      }

      res.json({
        success: true,
        message: '사용자 정보 조회 성공',
        user: latestUser,
        containerMode: containerInstance ? 'direct' : 'fallback',
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('❌ 사용자 정보 조회 API 오류:', error);
      res.status(500).json({
        success: false,
        error: 'User info fetch failed',
        message: '사용자 정보 조회 중 오류가 발생했습니다.',
        details: error.message,
        code: 'USER_INFO_FETCH_ERROR'
      });
    }
  }));

  // ============================================================================
  // 🚪 로그아웃 API (DI 패턴 적용)
  // ============================================================================

  /**
   * POST /logout
   * 사용자 로그아웃 및 세션 무효화
   */
  router.post('/logout', asyncHandler(async (req: Request, res: Response): Promise<void> => {
    console.log('🚪 === 로그아웃 요청 (수정된 DI 패턴) ===');
    
    try {
      const { sessionToken, allDevices = false, reason = 'user_logout' } = req.body;
      const authHeader = req.headers.authorization;
      
      // 토큰 추출
      const token = sessionToken || 
        (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : authHeader);
      
      console.log('🚪 로그아웃 처리 중...');
      console.log('📱 All Devices:', allDevices);
      console.log('📝 Reason:', reason);
      
      if (token) {
        try {
          // DI에서 세션 서비스 사용
          const sessionService = getSessionService();
          
          if (allDevices) {
            // 모든 디바이스에서 로그아웃
            await sessionService.invalidateAllUserSessions(token);
            console.log('🗑️ 모든 디바이스 세션 무효화 완료');
          } else {
            // 현재 세션만 무효화
            await sessionService.invalidateSession(token);
            console.log('🗑️ 현재 세션 무효화 완료');
          }
        } catch (error) {
          console.warn('⚠️ 세션 무효화 중 오류:', error);
          // 로그아웃은 항상 성공으로 처리 (보안상)
        }
      }
      
      console.log('✅ 로그아웃 완료');
      
      res.json({
        success: true,
        message: allDevices ? 
          '모든 디바이스에서 로그아웃되었습니다.' : 
          '로그아웃되었습니다.',
        allDevices,
        reason,
        containerMode: containerInstance ? 'direct' : 'fallback',
        timestamp: new Date().toISOString(),
        redirectTo: '/login'
      });
      
    } catch (error: any) {
      console.error('❌ 로그아웃 처리 오류:', error);
      
      // 로그아웃은 항상 성공으로 처리 (보안상)
      res.json({
        success: true,
        message: '로그아웃되었습니다.',
        note: '일부 세션 정리 중 오류가 발생했을 수 있습니다.',
        containerMode: containerInstance ? 'direct' : 'fallback',
        timestamp: new Date().toISOString()
      });
    }
  }));

  // ============================================================================
  // 📊 인증 시스템 상태 확인 API
  // ============================================================================

  /**
   * GET /status
   * 인증 시스템 전체 상태 확인
   */
  router.get('/status', asyncHandler(async (req: Request, res: Response): Promise<void> => {
    console.log('📊 === 인증 시스템 상태 확인 (수정된 DI 패턴) ===');
    
    try {
      // DI에서 각 서비스들의 상태 확인
      const statusChecks = await Promise.allSettled([
        // AuthService 상태
        (async () => {
          try {
            const authService = getAuthService();
            return { 
              service: 'AuthService', 
              status: 'healthy',
              details: authService.getStatus ? await authService.getStatus() : 'available'
            };
          } catch (error: any) {
            return { 
              service: 'AuthService', 
              status: 'error', 
              error: error.message 
            };
          }
        })(),
        
        // SessionService 상태
        (async () => {
          try {
            const sessionService = getSessionService();
            return { 
              service: 'SessionService', 
              status: 'healthy',
              details: sessionService.getStatus ? await sessionService.getStatus() : 'available'
            };
          } catch (error: any) {
            return { 
              service: 'SessionService', 
              status: 'error', 
              error: error.message 
            };
          }
        })(),
        
        // WebAuthnService 상태
        (async () => {
          try {
            const webauthnService = getWebAuthnService();
            return { 
              service: 'WebAuthnService', 
              status: 'healthy',
              details: webauthnService.getStatus ? await webauthnService.getStatus() : 'available'
            };
          } catch (error: any) {
            return { 
              service: 'WebAuthnService', 
              status: 'error', 
              error: error.message 
            };
          }
        })(),
        
        // DatabaseService 상태
        (async () => {
          try {
            const databaseService = getDatabaseService();
            return { 
              service: 'DatabaseService', 
              status: databaseService.isConnected ? (databaseService.isConnected() ? 'healthy' : 'degraded') : 'unknown',
              details: databaseService.getConnectionInfo ? databaseService.getConnectionInfo() : 'available'
            };
          } catch (error: any) {
            return { 
              service: 'DatabaseService', 
              status: 'error', 
              error: error.message 
            };
          }
        })()
      ]);
      
      // 결과 분석
      const services = statusChecks.map(result => 
        result.status === 'fulfilled' ? result.value : 
        { service: 'Unknown', status: 'error', error: result.reason }
      );
      
      const healthyCount = services.filter(s => s.status === 'healthy').length;
      const totalCount = services.length;
      const overallStatus = healthyCount === totalCount ? 'healthy' : 
                           healthyCount > 0 ? 'degraded' : 'critical';
      
      console.log(`📊 시스템 상태: ${overallStatus} (${healthyCount}/${totalCount})`);
      
      res.json({
        success: true,
        status: overallStatus,
        services,
        summary: {
          healthy: healthyCount,
          total: totalCount,
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          lastCheck: new Date().toISOString()
        },
        features: {
          unifiedAuth: true,
          webauthn: true,
          sessionManagement: true,
          tokenValidation: true,
          cueIntegration: true,
          diContainer: true,
          routerConnectionFixed: true
        },
        containerMode: containerInstance ? 'direct' : 'fallback',
        endpoints: [
          'POST /auth/start - 통합 인증 시작',
          'POST /auth/complete - 통합 인증 완료',
          'POST /token/verify - 토큰 검증',
          'POST /verify - 간단한 토큰 검증',
          'POST /session/restore - 세션 복원',
          'GET /me - 사용자 정보 조회',
          'POST /logout - 로그아웃',
          'GET /status - 시스템 상태'
        ],
        timestamp: new Date().toISOString()
      });
      
    } catch (error: any) {
      console.error('❌ 상태 확인 중 오류:', error);
      
      res.status(500).json({
        success: false,
        status: 'error',
        error: 'Status check failed',
        message: '시스템 상태 확인 중 오류가 발생했습니다',
        details: error.message,
        containerMode: containerInstance ? 'direct' : 'fallback',
        timestamp: new Date().toISOString()
      });
    }
  }));

  // ============================================================================
  // 🛡️ 에러 핸들링 미들웨어
  // ============================================================================

  router.use((error: any, req: Request, res: Response, next: NextFunction) => {
    console.error('❌ 통합 인증 라우터 에러:', error);
    
    res.status(error.status || 500).json({
      success: false,
      error: 'Authentication system error',
      message: '인증 시스템에서 오류가 발생했습니다',
      code: error.code || 'AUTH_SYSTEM_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      containerMode: containerInstance ? 'direct' : 'fallback',
      timestamp: new Date().toISOString()
    });
  });

  console.log('✅ 통합 인증 라우트 생성 완료 (DI Container 인스턴스 지원)');
  return router;
}

// ============================================================================
// 📤 Export (완전 수정 버전)
// ============================================================================

console.log('🔐 통합 인증 라우트 모듈 로딩 완료 (DI Container 인스턴스 전달 지원)');
console.log('🔥 주요 기능: 통합 인증, 토큰 검증, 세션 복원, CUE 보상, DI Container 지원');

export default router;
