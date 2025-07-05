// ============================================================================
// 🔧 backend/src/routes/cue/mining.ts 완전 수정
// 문제: Router export 방식 + SupabaseService 없음
// 해결: 올바른 export default + DatabaseService 사용
// ============================================================================

import { Router, Request, Response } from 'express';
import { DatabaseService } from '../../services/database/DatabaseService';
import { CueService } from '../../services/cue/CueService';

const router = Router();

// ✅ 안전한 서비스 인스턴스 가져오기
const getDatabaseService = () => {
  try {
    return DatabaseService.getInstance();
  } catch (error) {
    console.error('❌ DatabaseService 인스턴스 가져오기 실패:', error);
    throw new Error('Database service unavailable');
  }
};

const getCueService = () => {
  try {
    return CueService.getInstance();
  } catch (error) {
    console.error('❌ CueService 인스턴스 가져오기 실패:', error);
    throw new Error('CUE service unavailable');
  }
};

// ============================================================================
// ⛏️ CUE 마이닝 엔드포인트
// ============================================================================

router.post('/mine', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, userDid, activity, metadata } = req.body;

    if (!userId || !userDid || !activity) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'userId, userDid, activity는 필수입니다',
        timestamp: new Date().toISOString()
      });
      return;
    }

    console.log(`⛏️ CUE 마이닝 시작: ${userDid} - ${activity}`);

    // CUE 마이닝 실행
    const cueService = getCueService();
    const tokensEarned = await cueService.mineTokensForActivity({
      userId,
      activity,
      metadata
    });

    res.json({
      success: true,
      tokensEarned,
      message: `${tokensEarned} CUE 토큰을 획득했습니다!`,
      activity,
      userDid,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ CUE 마이닝 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Mining failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ============================================================================
// 📊 마이닝 통계 조회
// ============================================================================

router.get('/stats/:userDid', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userDid } = req.params;

    console.log(`📊 마이닝 통계 조회: ${userDid}`);

    const databaseService = getDatabaseService();
    const balance = await databaseService.getCUEBalance(userDid);
    const transactions = await databaseService.getCUETransactions(userDid, 100);

    const miningTransactions = transactions.filter(tx => 
      tx.transaction_type === 'mining' || 
      tx.transaction_type === 'task_completion'
    );

    const totalMined = miningTransactions.reduce((sum, tx) => sum + (tx.amount || 0), 0);

    res.json({
      success: true,
      userDid,
      balance,
      totalMined,
      totalTransactions: transactions.length,
      miningTransactions: miningTransactions.length,
      recentTransactions: transactions.slice(0, 10),
      statistics: {
        dailyAverage: Math.round(totalMined / Math.max(1, transactions.length)),
        lastActivity: transactions[0]?.created_at || null
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ 마이닝 통계 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Stats fetch failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ============================================================================
// 🏆 마이닝 리더보드
// ============================================================================

router.get('/leaderboard', async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    
    console.log(`🏆 마이닝 리더보드 조회 (상위 ${limit}명)`);

    // 간단한 리더보드 구현 (실제로는 더 복잡한 쿼리 필요)
    res.json({
      success: true,
      leaderboard: [
        { rank: 1, userDid: 'did:example:top1', totalMined: 5000, username: 'TopMiner1' },
        { rank: 2, userDid: 'did:example:top2', totalMined: 4500, username: 'TopMiner2' },
        { rank: 3, userDid: 'did:example:top3', totalMined: 4000, username: 'TopMiner3' }
      ],
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ 리더보드 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Leaderboard fetch failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ============================================================================
// ✅ 라우터 Export
// ============================================================================

console.log('✅ CUE 마이닝 라우트 초기화 완료');

// ✅ 함수 형태 export (DI Container 호환)
export function createCUEMiningRoutes(): Router {
  return router;
}

// ✅ 기본 export (기존 호환성)
export default router;