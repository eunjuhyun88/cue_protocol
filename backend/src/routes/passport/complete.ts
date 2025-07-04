// ============================================================================
// 📁 backend/src/routes/passport/complete.ts
// 🎯 Passport 완료 처리 라우터 - DI 패턴 적용
// ============================================================================

import { Router, Request, Response } from 'express';
import { getService } from '../../core/DIContainer';
import { authMiddleware } from '../../middleware/authMiddleware';

const router = Router();

// DI에서 서비스 가져오기
const getActiveDB = () => getService('ActiveDatabaseService');
const getCueService = () => getService('CueService');
const getPersonalizationService = () => getService('PersonalizationService');

// ============================================================================
// 🎯 온보딩 완료 처리
// ============================================================================

router.post('/onboarding', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { surveyResults, initialPreferences, biometricData } = req.body;
    
    console.log(`🎯 === 온보딩 완료: ${user.did} ===`);
    
    // DI 서비스 사용
    const db = getActiveDB();
    const cueService = getCueService();
    const personalizationService = getPersonalizationService();
    
    // 온보딩 완료 처리
    const completionData = {
      onboardingCompleted: true,
      surveyResults,
      initialPreferences,
      biometricData,
      onboardingCompletedAt: new Date().toISOString()
    };
    
    await db.updatePassport(user.did, completionData);
    
    // 개인화 프로필 초기화
    if (surveyResults) {
      await personalizationService.initializePersonalityProfile(user.did, surveyResults);
    }
    
    // 온보딩 완료 보상
    await cueService.awardTokens(user.did, 500, 'onboarding_complete');
    
    res.json({
      success: true,
      message: '온보딩이 완료되었습니다',
      rewards: { cueTokens: 500 },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ 온보딩 완료 처리 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete onboarding',
      message: error.message
    });
  }
});

console.log('✅ Passport Complete routes initialized with DI');
export default router;

