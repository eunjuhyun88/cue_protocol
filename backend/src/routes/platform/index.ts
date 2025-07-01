// // 실제 운영용 CUE 마이닝 라우트
// // backend/src/routes/platform/index.ts
// ============================================================================
// 🤖 플랫폼 연결 및 데이터 동기화 라우트
// ============================================================================


import express from 'express';
import { DatabaseService } from '../../services/database/DatabaseService';
import { asyncHandler } from '../../middleware/errorHandler';

const router = express.Router();
const db = DatabaseService.getInstance();

// 연결된 플랫폼 목록 조회
router.get('/:did', asyncHandler(async (req, res) => {
  const { did } = req.params;
  const userDid = (req as any).user.did;

  if (userDid !== did) {
    return res.status(403).json({
      success: false,
      error: 'Access denied'
    });
  }

  try {
    const { data: platforms, error } = await db.getClient()
      .from('connected_platforms')
      .select('*')
      .eq('user_did', did);

    if (error) throw error;

    res.json({
      success: true,
      platforms: platforms || []
    });

  } catch (error) {
    console.error('Get connected platforms error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get connected platforms'
    });
  }
}));

// 플랫폼 연결
router.post('/:did/connect', asyncHandler(async (req, res) => {
  const { did } = req.params;
  const { platform, credentials } = req.body;
  const userDid = (req as any).user.did;

  if (userDid !== did) {
    return res.status(403).json({
      success: false,
      error: 'Access denied'
    });
  }

  try {
    // 플랫폼 연결 시뮬레이션 (실제로는 OAuth 등 구현)
    const { data: newPlatform, error } = await db.getClient()
      .from('connected_platforms')
      .upsert({
        user_did: did,
        platform_name: platform,
        platform_id: credentials.platformId || `user_${Date.now()}`,
        display_name: credentials.displayName || platform,
        connected: true,
        status: 'active',
        last_sync_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      platform: newPlatform,
      message: `Successfully connected to ${platform}`
    });

  } catch (error) {
    console.error('Connect platform error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to connect platform'
    });
  }
}));

// 플랫폼 데이터 동기화
router.post('/:did/sync', asyncHandler(async (req, res) => {
  const { did } = req.params;
  const { platform } = req.body;
  const userDid = (req as any).user.did;

  if (userDid !== did) {
    return res.status(403).json({
      success: false,
      error: 'Access denied'
    });
  }

  try {
    // 동기화 시뮬레이션
    const syncResult = {
      platform,
      syncedCount: Math.floor(Math.random() * 50) + 10,
      newCues: Math.floor(Math.random() * 10) + 1,
      timestamp: new Date().toISOString()
    };

    // 동기화 시간 업데이트
    await db.getClient()
      .from('connected_platforms')
      .update({
        last_sync_at: new Date().toISOString(),
        context_mined: db.getClient().rpc('increment_context_mined')
      })
      .eq('user_did', did)
      .eq('platform_name', platform);

    res.json({
      success: true,
      syncResult
    });

  } catch (error) {
    console.error('Sync platform error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync platform data'
    });
  }
}));

export default router;
