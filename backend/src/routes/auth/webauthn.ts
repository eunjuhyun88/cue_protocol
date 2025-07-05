// ============================================================================
// 📁 backend/src/routes/auth/webauthn.ts
// 🔐 WebAuthn 라우터 - Express Router Export 문제 완전 해결
// 수정일: 2025-07-05
// 문제: DI Container에서 Express Router로 인식되지 않음
// 해결: Express Router 직접 export, 에러 처리 개선
// ============================================================================
import { DIContainer } from '../../core/DIContainer';
import express, { Router, Request, Response } from 'express';

// 🔧 Express Router 생성 (반드시 express.Router() 사용)
const router: Router = express.Router();

// DI Container에서 서비스 가져오기 (지연 로딩)
let webauthnService: any = null;
let authService: any = null;
let sessionService: any = null;
let databaseService: any = null;

/**
 * DI Container 서비스 지연 로딩 함수들
 */
async function getWebAuthnService() {
  if (!webauthnService) {
    try {
      const { getService } = await import('../../core/DIContainer');
      webauthnService = getService('WebAuthnService');
    } catch (error) {
      console.error('❌ WebAuthnService 로딩 실패:', error);
      throw new Error('WebAuthn 서비스를 사용할 수 없습니다');
    }
  }
  return webauthnService;
}

async function getAuthService() {
  if (!authService) {
    try {
      const { getService } = await import('../../core/DIContainer');
      authService = getService('AuthService');
    } catch (error) {
      console.warn('⚠️ AuthService 로딩 실패:', error);
      return null;
    }
  }
  return authService;
}

async function getSessionService() {
  if (!sessionService) {
    try {
      const { getService } = await import('../../core/DIContainer');
      sessionService = getService('SessionService');
    } catch (error) {
      console.warn('⚠️ SessionService 로딩 실패:', error);
      return null;
    }
  }
  return sessionService;
}

async function getDatabaseService() {
  if (!databaseService) {
    try {
      const { getService } = await import('../../core/DIContainer');
      databaseService = getService('ActiveDatabaseService');
    } catch (error) {
      console.warn('⚠️ DatabaseService 로딩 실패:', error);
      return null;
    }
  }
  return databaseService;
}

console.log('🔐 WebAuthn 라우터 생성 시작...');

// ============================================================================
// 🔥 회원가입 API (핵심 - 404 에러 해결 대상)
// ============================================================================

/**
 * POST /api/auth/webauthn/register/start
 * 회원가입 시작 - 404 에러 해결 핵심 엔드포인트
 */
router.post('/register/start', async (req: Request, res: Response): Promise<void> => {
  console.log('🔍 === WebAuthn 회원가입 시작 (404 에러 해결) ===');
  
  try {
    const { username, email, deviceInfo } = req.body;
    
    console.log('📝 회원가입 요청 데이터:', { username, email, hasDeviceInfo: !!deviceInfo });
    
    // DI 서비스 가져오기
    const webauthnSvc = await getWebAuthnService();
    
    // 회원가입 시작 처리
    const result = await webauthnSvc.startRegistration(email || username, deviceInfo);
    
    console.log('✅ 회원가입 시작 성공');
    
    res.json({
      success: true,
      ...result,
      message: '회원가입을 위한 패스키를 생성해주세요',
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('❌ 회원가입 시작 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Registration start failed',
      message: error.message || '회원가입 시작 중 오류가 발생했습니다',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/auth/webauthn/register/complete
 * 회원가입 완료 - 404 에러 해결 핵심 엔드포인트
 */
router.post('/register/complete', async (req: Request, res: Response): Promise<void> => {
  console.log('🔐 === WebAuthn 회원가입 완료 (404 에러 해결) ===');
  
  try {
    const { credential, sessionId } = req.body;
    
    if (!credential || !sessionId) {
      console.warn('⚠️ 필수 데이터 누락:', { hasCredential: !!credential, hasSessionId: !!sessionId });
      res.status(400).json({
        success: false,
        error: 'credential과 sessionId가 필요합니다',
        timestamp: new Date().toISOString()
      });
      return;
    }
    
    console.log('📝 회원가입 완료 요청:', { sessionId, credentialType: typeof credential });
    
    // DI 서비스 가져오기
    const webauthnSvc = await getWebAuthnService();
    const userAgent = req.get('User-Agent') || 'Unknown';
    
    // 회원가입 완료 처리
    const result = await webauthnSvc.completeRegistration(
      credential,
      sessionId,
      userAgent
    );
    
    console.log('✅ WebAuthn 회원가입 처리 완료:', result.action);
    
    // 성공 응답 처리
    if (result.action === 'login') {
      // 기존 사용자 자동 로그인
      console.log('✅ 기존 사용자 자동 로그인 성공');
      res.status(200).json({
        success: true,
        action: 'login',
        sessionToken: result.sessionToken,
        user: result.user,
        isExistingUser: true,
        message: '기존 계정으로 성공적으로 로그인되었습니다!',
        timestamp: new Date().toISOString()
      });
    } else {
      // 새 사용자 등록 성공
      console.log('✅ 새 사용자 등록 성공');
      res.status(200).json({
        success: true,
        action: 'register',
        sessionToken: result.sessionToken,
        user: result.user,
        isExistingUser: false,
        rewards: result.rewards,
        message: '새 계정이 성공적으로 등록되었습니다!',
        timestamp: new Date().toISOString()
      });
    }
    
  } catch (error: any) {
    console.error('❌ WebAuthn 회원가입 완료 실패:', error);
    
    res.status(500).json({
      success: false,
      error: 'Registration/Login failed',
      message: error.message || '회원가입 완료 중 오류가 발생했습니다',
      timestamp: new Date().toISOString()
    });
  }
});

// ============================================================================
// 🔑 로그인 API (하위 호환성)
// ============================================================================

/**
 * POST /api/auth/webauthn/login/start
 * 로그인 시작
 */
router.post('/login/start', async (req: Request, res: Response): Promise<void> => {
  console.log('🔍 === WebAuthn 로그인 시작 ===');
  
  try {
    const { username, deviceInfo } = req.body;
    
    const webauthnSvc = await getWebAuthnService();
    const result = await webauthnSvc.startLogin(username, deviceInfo);
    
    res.json({
      success: true,
      ...result,
      message: '패스키를 사용하여 로그인해주세요',
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('❌ 로그인 시작 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Login start failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/auth/webauthn/login/complete
 * 로그인 완료
 */
router.post('/login/complete', async (req: Request, res: Response): Promise<void> => {
  console.log('✅ === WebAuthn 로그인 완료 ===');
  
  try {
    const { credential, sessionId } = req.body;
    
    if (!credential || !sessionId) {
      res.status(400).json({
        success: false,
        error: 'credential과 sessionId가 필요합니다'
      });
      return;
    }
    
    const webauthnSvc = await getWebAuthnService();
    const userAgent = req.get('User-Agent') || 'Unknown';
    
    const result = await webauthnSvc.completeLogin(
      credential,
      sessionId,
      userAgent
    );
    
    console.log('✅ 로그인 완료:', result.user?.username);
    
    res.json({
      success: true,
      sessionToken: result.sessionToken,
      user: result.user,
      message: '성공적으로 로그인되었습니다!',
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('❌ 로그인 완료 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Login complete failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ============================================================================
// 🔥 통합 인증 API (추천)
// ============================================================================

/**
 * POST /api/auth/webauthn/start
 * 통합 인증 시작 - 기존/신규 사용자 자동 처리
 */
router.post('/start', async (req: Request, res: Response): Promise<void> => {
  console.log('🔍 === 통합 WebAuthn 인증 시작 ===');
  
  try {
    const { username, email, deviceInfo } = req.body;
    
    const webauthnSvc = await getWebAuthnService();
    const result = await webauthnSvc.startUnifiedAuthentication(deviceInfo);
    
    res.json({
      success: true,
      ...result,
      message: '패스키를 사용하여 인증해주세요. 기존 사용자는 자동 로그인, 신규 사용자는 자동 가입됩니다.',
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('❌ 통합 인증 시작 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Unified auth start failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/auth/webauthn/complete
 * 통합 인증 완료 - 기존/신규 사용자 자동 처리
 */
router.post('/complete', async (req: Request, res: Response): Promise<void> => {
  console.log('✅ === 통합 WebAuthn 인증 완료 ===');
  
  try {
    const { credential, sessionId } = req.body;
    
    if (!credential || !sessionId) {
      res.status(400).json({
        success: false,
        error: 'credential과 sessionId가 필요합니다'
      });
      return;
    }
    
    const webauthnSvc = await getWebAuthnService();
    const result = await webauthnSvc.completeUnifiedAuthentication(
      credential,
      sessionId,
      'UnifiedAuth'
    );
    
    console.log('✅ 통합 인증 완료:', result.action);
    
    res.json({
      success: true,
      action: result.action,
      sessionToken: result.sessionToken,
      user: result.user,
      isExistingUser: result.action === 'login',
      rewards: result.rewards,
      message: result.action === 'login' ? 
        '기존 계정으로 성공적으로 로그인되었습니다!' : 
        '새 계정이 성공적으로 등록되었습니다!',
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('❌ 통합 인증 완료 오류:', error);
    
    // 에러 메시지에서 성공적인 로그인인지 확인
    if (error.message && error.message.includes('기존 계정으로 로그인')) {
      res.status(200).json({
        success: true,
        action: 'login',
        isExistingUser: true,
        message: '기존 계정으로 성공적으로 로그인되었습니다!',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Unified auth complete failed',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
});

// ============================================================================
// 🚪 기타 API
// ============================================================================

/**
 * POST /api/auth/webauthn/logout
 * 로그아웃
 */
router.post('/logout', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionToken } = req.body;
    
    if (sessionToken) {
      const sessionSvc = await getSessionService();
      if (sessionSvc) {
        await sessionSvc.invalidateSession(sessionToken);
      }
    }
    
    res.json({
      success: true,
      message: '성공적으로 로그아웃되었습니다',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('❌ 로그아웃 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Logout failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/auth/webauthn/status
 * 시스템 상태 확인
 */
router.get('/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const webauthnSvc = await getWebAuthnService();
    const authSvc = await getAuthService();
    const sessionSvc = await getSessionService();
    const dbSvc = await getDatabaseService();
    
    res.json({
      success: true,
      status: 'healthy',
      services: {
        webauthn: !!webauthnSvc,
        auth: !!authSvc,
        session: !!sessionSvc,
        database: !!dbSvc
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/auth/webauthn/health
 * 간단한 헬스 체크
 */
router.get('/health', async (req: Request, res: Response): Promise<void> => {
  try {
    res.json({
      success: true,
      status: 'healthy',
      service: 'WebAuthn Router',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV || 'development'
    });
    
  } catch (error: any) {
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ============================================================================
// 📤 Express Router Export - DI Container 호환성 보장
// ============================================================================

console.log('✅ WebAuthn 라우터 생성 완료 (통일된 패턴)');
console.log('🔥 지원 엔드포인트:');
console.log('  📍 POST /start - 통합 인증 시작');
console.log('  📍 POST /complete - 통합 인증 완료');
console.log('  📍 POST /register/start - 회원가입 시작 (404 해결)');
console.log('  📍 POST /register/complete - 회원가입 완료 (404 해결)');
console.log('  📍 POST /login/start - 로그인 시작');
console.log('  📍 POST /login/complete - 로그인 완료');
console.log('  📍 POST /logout - 로그아웃');
console.log('  📍 GET /status - 시스템 상태');
console.log('  📍 GET /health - 헬스 체크');

// ✅ 중요: Express Router를 직접 export해야 DI Container에서 인식함
export function createAuthWebAuthnRoutes(container?: DIContainer): Router {
  console.log('🏭 WebAuthn Routes 팩토리 함수 실행');
  // 기존 router 변수 그대로 반환
  return router;
}

 export default router;
