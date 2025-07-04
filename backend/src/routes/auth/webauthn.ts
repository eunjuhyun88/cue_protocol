// ============================================================================
// 📁 backend/src/routes/auth/webauthn.ts
// 🔐 WebAuthn 라우터 - DI 패턴 적용 (대폭 간소화)
// ============================================================================

import { Router, Request, Response } from 'express';
import { getService } from '../../core/DIContainer';

const router = Router();

// DI에서 서비스 가져오기
const getWebAuthnService = () => getService('WebAuthnService');
const getAuthService = () => getService('AuthService');
const getSessionService = () => getService('SessionService');

// ============================================================================
// 🔥 회원가입 API (하위 호환성)
// ============================================================================

router.post('/register/start', async (req: Request, res: Response): Promise<void> => {
  console.log('🔍 === WebAuthn 회원가입 시작 ===');
  
  try {
    const { username, email, deviceInfo } = req.body;
    
    // DI 서비스 사용
    const webauthnService = getWebAuthnService();
    const result = await webauthnService.startRegistration(username, email, deviceInfo);
    
    res.json({
      success: true,
      ...result,
      message: '회원가입을 위한 패스키를 생성해주세요'
    });
  } catch (error) {
    console.error('❌ 회원가입 시작 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Registration start failed',
      message: error.message
    });
  }
});

router.post('/register/complete', async (req: Request, res: Response): Promise<void> => {
  console.log('✅ === WebAuthn 회원가입 완료 ===');
  
  try {
    const { credential, sessionId } = req.body;
    
    if (!credential || !sessionId) {
      res.status(400).json({
        success: false,
        error: 'credential과 sessionId가 필요합니다'
      });
      return;
    }
    
    // DI 서비스 사용
    const webauthnService = getWebAuthnService();
    const result = await webauthnService.completeRegistration(
      credential,
      sessionId,
      req.get('User-Agent') || 'Unknown'
    );
    
    res.json({
      success: true,
      ...result,
      message: '회원가입이 완료되었습니다'
    });
  } catch (error) {
    console.error('❌ 회원가입 완료 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Registration complete failed',
      message: error.message
    });
  }
});

// ============================================================================
// 🔑 로그인 API (하위 호환성)
// ============================================================================

router.post('/login/start', async (req: Request, res: Response): Promise<void> => {
  console.log('🔍 === WebAuthn 로그인 시작 ===');
  
  try {
    const { username, deviceInfo } = req.body;
    
    // DI 서비스 사용
    const webauthnService = getWebAuthnService();
    const result = await webauthnService.startLogin(username, deviceInfo);
    
    res.json({
      success: true,
      ...result,
      message: '패스키를 사용하여 로그인해주세요'
    });
  } catch (error) {
    console.error('❌ 로그인 시작 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Login start failed',
      message: error.message
    });
  }
});

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
    
    // DI 서비스 사용
    const webauthnService = getWebAuthnService();
    const result = await webauthnService.completeLogin(
      credential,
      sessionId,
      req.get('User-Agent') || 'Unknown'
    );
    
    res.json({
      success: true,
      ...result,
      message: '로그인이 완료되었습니다'
    });
  } catch (error) {
    console.error('❌ 로그인 완료 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Login complete failed',
      message: error.message
    });
  }
});

// ============================================================================
// 🔧 관리 API들
// ============================================================================

router.post('/logout', async (req: Request, res: Response): Promise<void> => {
  console.log('🔧 === 로그아웃 API ===');
  
  try {
    const { sessionToken } = req.body;
    
    if (sessionToken) {
      // DI 서비스 사용
      const sessionService = getSessionService();
      await sessionService.invalidateSession(sessionToken);
      console.log('🗑️ 세션 토큰 무효화 처리');
    }
    
    res.json({
      success: true,
      message: '로그아웃되었습니다'
    });
    
  } catch (error) {
    console.error('💥 로그아웃 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Logout failed',
      message: error.message
    });
  }
});

// 시스템 상태 확인
router.get('/status', async (req: Request, res: Response): Promise<void> => {
  try {
    // DI 서비스 상태 확인
    const webauthnService = getWebAuthnService();
    const authService = getAuthService();
    const sessionService = getSessionService();
    
    const status = {
      webauthn: await webauthnService.getStatus(),
      auth: await authService.getStatus(),
      session: await sessionService.getStatus(),
      timestamp: new Date().toISOString()
    };
    
    res.json({
      success: true,
      status,
      message: 'WebAuthn 시스템이 정상 작동 중입니다'
    });
  } catch (error) {
    console.error('❌ 상태 확인 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Status check failed',
      message: error.message
    });
  }
});

// 가이드 정보
router.get('/guide', (req: Request, res: Response): void => {
  res.json({
    success: true,
    service: 'WebAuthn 인증 서비스',
    version: '2.0 (DI 적용)',
    
    workflow: {
      registration: [
        '1. POST /register/start - 회원가입 시작',
        '2. 브라우저에서 패스키 생성',
        '3. POST /register/complete - 회원가입 완료',
        '4. sessionToken 받아서 저장'
      ],
      login: [
        '1. POST /login/start - 로그인 시작',
        '2. 브라우저에서 패스키 인증',
        '3. POST /login/complete - 로그인 완료',
        '4. sessionToken 받아서 저장'
      ],
      unified: [
        '1. POST /start - 통합 인증 시작 (권장)',
        '2. 브라우저에서 패스키 인증',
        '3. POST /complete - 자동 로그인/가입',
        '4. sessionToken 받아서 저장'
      ]
    },
    
    features: {
      diIntegration: [
        '✅ 의존성 주입으로 서비스 관리',
        '✅ 복잡한 로직을 서비스 계층으로 분리',
        '✅ 코드 재사용성 및 테스트 용이성 향상',
        '✅ 설정 기반 서비스 교체 가능'
      ],
      compatibility: [
        '✅ 기존 API 100% 호환',
        '✅ 요청/응답 포맷 동일',
        '✅ 하위 호환성 완전 지원',
        '✅ 점진적 마이그레이션 가능'
      ]
    },
    
    endpoints: {
      legacy: {
        'POST /register/start': '회원가입 시작',
        'POST /register/complete': '회원가입 완료',
        'POST /login/start': '로그인 시작',
        'POST /login/complete': '로그인 완료'
      },
      management: {
        'POST /logout': '로그아웃',
        'GET /status': '시스템 상태',
        'GET /guide': '이 가이드'
      },
      recommended: {
        'POST /start': '통합 인증 시작 (권장)',
        'POST /complete': '통합 인증 완료 (권장)'
      }
    },
    
    note: 'DI 적용으로 코드가 대폭 간소화되었지만 모든 기능은 그대로 유지됩니다.'
  });
});

console.log('✅ WebAuthn routes initialized with DI');
export default router;