// ============================================================================
// 📁 backend/src/routes/auth/unified.ts
// 🔐 통합 인증 라우터 - DI 패턴 적용 (기존 350줄 → 80줄)
// ============================================================================

import { Router, Request, Response } from 'express';
import { getService } from '../../core/DIContainer';
import webauthnRoutes from './webauthn';

const router = Router();

// DI에서 서비스 가져오기 (기존 복잡한 초기화 코드 제거)
const getAuthService = () => getService('AuthService');
const getSessionService = () => getService('SessionService');
const getWebAuthnService = () => getService('WebAuthnService');

// ============================================================================
// 🔐 통합 패스키 인증 시작 (로그인/가입 자동 판별)
// ============================================================================

router.post('/start', async (req: Request, res: Response) => {
  console.log('🔍 === 통합 패스키 인증 시작 ===');
  
  try {
    const { deviceInfo } = req.body;
    
    // DI 서비스 사용 (기존 복잡한 로직을 서비스로 이동)
    const webauthnService = getWebAuthnService();
    const result = await webauthnService.startUnifiedAuthentication(deviceInfo);
    
    res.json({
      success: true,
      ...result,
      message: '패스키를 사용하여 인증해주세요'
    });
  } catch (error) {
    console.error('❌ 통합 인증 시작 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication start failed',
      message: error.message
    });
  }
});

// ============================================================================
// ✅ 통합 패스키 인증 완료 (로그인/가입 자동 처리)
// ============================================================================

router.post('/complete', async (req: Request, res: Response) => {
  console.log('✅ === 통합 패스키 인증 완료 ===');
  
  try {
    const { credential, sessionId } = req.body;
    
    if (!credential || !sessionId) {
      return res.status(400).json({
        success: false,
        error: 'credential과 sessionId가 필요합니다'
      });
    }
    
    // DI 서비스 사용 (기존 200줄 로직을 서비스로 이동)
    const webauthnService = getWebAuthnService();
    const result = await webauthnService.completeUnifiedAuthentication(
      credential, 
      sessionId,
      req.get('User-Agent') || 'Unknown'
    );
    
    res.json({
      success: true,
      ...result
    });
    
  } catch (error) {
    console.error('💥 통합 인증 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed',
      message: error.message
    });
  }
});

// ============================================================================
// 🔧 세션 관리 API들
// ============================================================================

router.post('/session/restore', async (req: Request, res: Response) => {
  console.log('🔧 === 세션 복원 API ===');
  
  try {
    const { sessionToken } = req.body;
    
    if (!sessionToken) {
      return res.status(400).json({
        success: false,
        error: 'sessionToken이 필요합니다'
      });
    }
    
    // DI 서비스 사용 (기존 복잡한 로직을 서비스로 이동)
    const sessionService = getSessionService();
    const user = await sessionService.getUserBySession(sessionToken);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: '유효하지 않거나 만료된 세션입니다'
      });
    }
    
    res.json({
      success: true,
      user: user,
      message: '세션이 복원되었습니다'
    });
    
  } catch (error) {
    console.error('💥 세션 복원 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Session restore failed',
      message: error.message
    });
  }
});

router.post('/logout', async (req: Request, res: Response) => {
  try {
    const { sessionToken } = req.body;
    
    // DI 서비스 사용
    const sessionService = getSessionService();
    await sessionService.invalidateSession(sessionToken);
    
    res.json({
      success: true,
      message: '로그아웃되었습니다'
    });
    
  } catch (error) {
    console.error('💥 로그아웃 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Logout failed'
    });
  }
});

// 기존 WebAuthn 라우터 포함
router.use('/webauthn', webauthnRoutes);

console.log('✅ Auth Unified routes initialized with DI');
export default router;