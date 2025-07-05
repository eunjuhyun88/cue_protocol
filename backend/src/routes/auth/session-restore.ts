// ============================================================================
// 📁 backend/src/routes/auth/session-restore.ts
// 🔧 세션 복원 라우터 - DI 패턴 적용 (간소화)
// ============================================================================

import { Router, Request, Response } from 'express';
import { getService } from '../../core/DIContainer';

const router = Router();

// DI에서 서비스 가져오기
const getSessionService = () => getService('SessionService');
const getAuthService = () => getService('AuthService');

// ============================================================================
// 🔧 세션 복원 API
// ============================================================================

router.post('/restore', async (req: Request, res: Response): Promise<void> => {
  console.log('🔧 === 세션 복원 API ===');
  
  try {
    const { sessionToken } = req.body;
    
    if (!sessionToken) {
      res.status(400).json({
        success: false,
        error: 'sessionToken이 필요합니다'
      });
      return;
    }
    
    // DI 서비스 사용
    const sessionService = getSessionService();
    const user = await sessionService.getUserBySession(sessionToken);
    
    if (!user) {
      res.status(401).json({
        success: false,
        error: '유효하지 않거나 만료된 세션입니다'
      });
      return;
    }
    
    console.log('✅ 세션 복원 성공:', user.username || user.id);
    
    res.json({
      success: true,
      user: user,
      message: '세션이 복원되었습니다',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('💥 세션 복원 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Session restore failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 세션 유효성 검사
router.post('/validate', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionToken } = req.body;
    
    if (!sessionToken) {
      res.status(400).json({
        success: false,
        error: 'sessionToken이 필요합니다'
      });
      return;
    }
    
    const sessionService = getSessionService();
    const isValid = await sessionService.validateSession(sessionToken);
    
    res.json({
      success: true,
      valid: isValid,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('💥 세션 검증 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Session validation failed',
      message: error.message
    });
  }
});
// ✅ 로그 출력 (기존 로그 있으면 제거하고 이것만)
console.log('✅ Session Restore routes initialized with DI');

// ✅ 함수 형태 export (DI Container 호환)
export function createAuthSessionRoutes(): Router {
  return router;
}

// ✅ 기본 export (기존 호환성) - 기존 것 있으면 교체
export default router;