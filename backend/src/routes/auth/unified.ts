// ============================================================================
// 📁 backend/src/routes/auth/unified.ts
// 🔐 통합 인증 라우터 - DI 패턴 완전 적용 (향상된 버전)
// ============================================================================

import { Router, Request, Response, NextFunction } from 'express';
import { getService } from '../../core/DIContainer';

const router = Router();

// ============================================================================
// 🦙 DI 서비스 가져오기 함수들 (타입 안전성 향상)
// ============================================================================

/**
 * DI에서 인증 관련 서비스들을 안전하게 가져오는 함수들
 * 각 함수는 서비스가 없을 경우 기본 구현을 반환
 */
const getAuthService = () => {
  try {
    return getService('AuthService');
  } catch (error) {
    console.error('❌ AuthService 가져오기 실패:', error);
    throw new Error('인증 서비스를 사용할 수 없습니다');
  }
};

const getSessionService = () => {
  try {
    return getService('SessionService');
  } catch (error) {
    console.error('❌ SessionService 가져오기 실패:', error);
    throw new Error('세션 서비스를 사용할 수 없습니다');
  }
};

const getWebAuthnService = () => {
  try {
    return getService('WebAuthnService');
  } catch (error) {
    console.error('❌ WebAuthnService 가져오기 실패:', error);
    throw new Error('WebAuthn 서비스를 사용할 수 없습니다');
  }
};

const getUnifiedAuthAdapter = () => {
  try {
    return getService('UnifiedAuthAdapter');
  } catch (error) {
    console.error('❌ UnifiedAuthAdapter 가져오기 실패:', error);
    throw new Error('통합 인증 어댑터를 사용할 수 없습니다');
  }
};

const getDatabaseService = () => {
  try {
    return getService('ActiveDatabaseService');
  } catch (error) {
    console.error('❌ DatabaseService 가져오기 실패:', error);
    throw new Error('데이터베이스 서비스를 사용할 수 없습니다');
  }
};

const getCueService = () => {
  try {
    return getService('CueService');
  } catch (error) {
    console.warn('⚠️ CueService 가져오기 실패, 기본값 사용:', error);
    return {
      async mineFromAuth(userDid: string) {
        return { amount: 10, newBalance: 100 };
      }
    };
  }
};

console.log('🔐 통합 인증 라우트 초기화 (DI 패턴 향상됨)');

// ============================================================================
// 🔥 통합 인증 API (메인 추천 방식)
// ============================================================================

router.post('/auth/start', async (req: Request, res: Response): Promise<void> => {
  console.log('🔍 === 통합 인증 시작 (향상된 버전) ===');
  
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
    const unifiedAuthAdapter = getUnifiedAuthAdapter() as {
      startUnifiedAuth: (deviceInfo: any) => Promise<any>;
      completeUnifiedAuth?: (...args: any[]) => Promise<any>;
      validateToken?: (...args: any[]) => Promise<any>;
      restoreSession?: (...args: any[]) => Promise<any>;
    };
    const result = await unifiedAuthAdapter.startUnifiedAuth(enrichedDeviceInfo);
    
    console.log('✅ 통합 인증 시작 성공');
    
    res.json({
      success: true,
      ...result,
      method: preferredMethod,
      message: `${preferredMethod}를 사용하여 인증해주세요`,
      supportedMethods: ['WebAuthn', 'Biometric'],
      sessionTimeout: 300, // 5분
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('❌ 통합 인증 시작 오류:', error);
    
    res.status(500).json({
      success: false,
      error: 'Unified auth start failed',
      message: error.message,
      code: 'AUTH_START_FAILED',
      timestamp: new Date().toISOString(),
      suggestion: '잠시 후 다시 시도하거나 다른 인증 방법을 선택해주세요'
    });
  }
});

router.post('/auth/complete', async (req: Request, res: Response): Promise<void> => {
  console.log('✅ === 통합 인증 완료 (향상된 버전) ===');
  
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
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('❌ 통합 인증 완료 오류:', error);
    
    res.status(500).json({
      success: false,
      error: 'Unified auth complete failed',
      message: error.message,
      code: 'AUTH_COMPLETE_FAILED',
      timestamp: new Date().toISOString(),
      suggestion: '인증 정보를 확인하고 다시 시도해주세요'
    });
  }
});

// ============================================================================
// 🔑 토큰 검증 API (향상된 버전)
// ============================================================================

router.post('/token/verify', async (req: Request, res: Response): Promise<void> => {
  console.log('🔍 === 토큰 검증 요청 ===');
  
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
});

// ============================================================================
// 🔄 세션 복원 API (향상된 버전)
// ============================================================================

router.post('/session/restore', async (req: Request, res: Response): Promise<void> => {
  console.log('🔄 === 세션 복원 요청 ===');
  
  try {
    const { token, deviceId, extended = false } = req.body;
    
    if (!token) {
      res.status(400).json({
        success: false,
        error: 'Session token required',
        message: '세션 토큰이 필요합니다',
        code: 'SESSION_TOKEN_MISSING'
      });
      return;
    }
    
    console.log('🔄 세션 복원 중...');
    console.log('🆔 Device ID:', deviceId);
    console.log('⏰ Extended:', extended);
    
    // DI에서 통합 인증 어댑터 사용
    const unifiedAuthAdapter = getUnifiedAuthAdapter();
    const sessionResult = await unifiedAuthAdapter.restoreSession(token);
    
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
    
    console.log('✅ 세션 복원 성공');
    
    res.json({
      success: true,
      user: sessionResult.user,
      newToken,
      tokenExpiry: extended ? '30d' : '7d',
      sessionType: extended ? 'extended' : 'standard',
      lastActivity: sessionResult.lastActivity,
      deviceVerified: !!deviceId,
      timestamp: new Date().toISOString()
    });
    
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
});

// ============================================================================
// 🚪 로그아웃 API (향상된 버전)
// ============================================================================

router.post('/logout', async (req: Request, res: Response): Promise<void> => {
  console.log('🚪 === 로그아웃 요청 ===');
  
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
        '모든 디바이스에서 로그아웃되었습니다' : 
        '로그아웃되었습니다',
      allDevices,
      reason,
      timestamp: new Date().toISOString(),
      redirectTo: '/login'
    });
    
  } catch (error: any) {
    console.error('❌ 로그아웃 처리 오류:', error);
    
    // 로그아웃은 항상 성공으로 처리 (보안상)
    res.json({
      success: true,
      message: '로그아웃되었습니다',
      note: '일부 세션 정리 중 오류가 발생했을 수 있습니다',
      timestamp: new Date().toISOString()
    });
  }
});

// ============================================================================
// 📊 인증 시스템 상태 확인 API
// ============================================================================

router.get('/status', async (req: Request, res: Response): Promise<void> => {
  console.log('📊 === 인증 시스템 상태 확인 ===');
  
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
            details: await authService.getStatus() 
          };
        } catch (error) {
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
            details: await sessionService.getStatus() 
          };
        } catch (error) {
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
            details: await webauthnService.getStatus() 
          };
        } catch (error) {
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
            status: databaseService.isConnected() ? 'healthy' : 'degraded',
            details: databaseService.getConnectionInfo() 
          };
        } catch (error) {
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
        cueIntegration: true
      },
      endpoints: [
        'POST /auth/start - 통합 인증 시작',
        'POST /auth/complete - 통합 인증 완료',
        'POST /token/verify - 토큰 검증',
        'POST /session/restore - 세션 복원',
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
      timestamp: new Date().toISOString()
    });
  }
});

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
    timestamp: new Date().toISOString()
  });
});

console.log('✅ 통합 인증 라우트 초기화 완료 (DI 패턴, 향상된 버전)');
console.log('🔥 주요 기능: 통합 인증, 토큰 검증, 세션 복원, CUE 보상');

export default router;