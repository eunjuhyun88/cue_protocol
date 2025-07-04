
// ============================================================================
// 📁 backend/src/routes/auth/webauthn.ts
// 🔐 WebAuthn 라우터 - DI 패턴 완전 적용
// ============================================================================

import { Router, Request, Response } from 'express';
import { getService } from '../../core/DIContainer';

const router = Router();

// DI에서 서비스 가져오기
const getWebAuthnService = () => getService('WebAuthnService');
const getAuthService = () => getService('AuthService');
const getSessionService = () => getService('SessionService');
const getDatabaseService = () => getService('ActiveDatabaseService');

console.log('🔐 WebAuthn 라우트 초기화 (DI 패턴)');

// ============================================================================
// 🔥 통합 인증 API (추천)
// ============================================================================

router.post('/start', async (req: Request, res: Response): Promise<void> => {
  console.log('🔍 === 통합 WebAuthn 인증 시작 ===');
  
  try {
    const { username, email, deviceInfo } = req.body;
    
    // DI 서비스 사용
    const webauthnService = getWebAuthnService() as {
      startUnifiedAuthentication: (deviceInfo: any) => Promise<any>;
      // 다른 필요한 메서드 타입도 여기에 추가하세요
    };
    const result = await webauthnService.startUnifiedAuthentication(deviceInfo);
    
    res.json({
      success: true,
      ...result,
      message: '패스키를 사용하여 인증해주세요'
    });
  } catch (error: any) {
    console.error('❌ 통합 인증 시작 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Unified auth start failed',
      message: error.message
    });
  }
});

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
    
    // DI 서비스 사용
    const webauthnService = getWebAuthnService() as {
      completeUnifiedAuthentication: (credential: any, sessionId: any, method: string) => Promise<any>;
    };
    const result = await webauthnService.completeUnifiedAuthentication(
      credential,
      sessionId,
      'WebAuthn'
    );
    
    res.json({
      success: true,
      ...result,
      message: result.isExistingUser ? '로그인 완료' : '회원가입 완료'
    });
  } catch (error: any) {
    console.error('❌ 통합 인증 완료 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Unified auth complete failed',
      message: error.message
    });
  }
});

// ============================================================================
// 🔥 회원가입 API (하위 호환성)
// ============================================================================

router.post('/register/start', async (req: Request, res: Response): Promise<void> => {
  console.log('🔍 === WebAuthn 회원가입 시작 ===');
  
  try {
    const { username, email, deviceInfo } = req.body;
    
    // DI 서비스 사용
    const webauthnService = getWebAuthnService() as {
      startRegistration: (username: string, email: string, deviceInfo: any) => Promise<any>;
      // 필요한 경우 다른 메서드 타입도 추가하세요
    };
    const result = await webauthnService.startRegistration(username, email, deviceInfo);
    
    res.json({
      success: true,
      ...result,
      message: '회원가입을 위한 패스키를 생성해주세요'
    });
  } catch (error: any) {
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
  } catch (error: any) {
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
  } catch (error: any) {
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
  } catch (error: any) {
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
    
  } catch (error: any) {
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
    const webauthnService = getWebAuthnService() as { getStatus: () => Promise<any> };
    const authService = getAuthService() as { getStatus: () => Promise<any> };
    const sessionService = getSessionService() as { getStatus: () => Promise<any> };
    const databaseService = getDatabaseService() as { getConnectionInfo: () => any };
    
    const status = {
      webauthn: await webauthnService.getStatus(),
      auth: await authService.getStatus(),
      session: await sessionService.getStatus(),
      database: databaseService.getConnectionInfo(),
      timestamp: new Date().toISOString()
    };
    
    res.json({
      success: true,
      status,
      message: 'WebAuthn 시스템이 정상 작동 중입니다'
    });
  } catch (error: any) {
    console.error('❌ 상태 확인 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Status check failed',
      message: error.message
    });
  }
});

console.log('✅ WebAuthn routes initialized with DI');
export default router;
