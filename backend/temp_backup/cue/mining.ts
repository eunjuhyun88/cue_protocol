// ============================================================================
// 💎 CUE 마이닝 라우트 (실제 운영용)
// // CUE 토큰 마이닝, 잔액 조회, 거래 기록 API
// // backend/src/routes/cue/mining.ts

// ============================================================================

import { Router, Request, Response } from 'express';
import { supabaseService } from '../../services/database/SupabaseService';

const router = Router();

// CUE 토큰 마이닝
router.post('/mine', async (req: Request, res: Response) => {
  try {
    console.log('💎 CUE 토큰 마이닝 요청 받음');
    
    const { userId, amount, source, messageId } = req.body;

    if (!userId || !amount) {
      return res.status(400).json({
        success: false,
        error: 'UserId and amount are required'
      });
    }

    // 현재 사용자 정보 조회
    const user = await supabaseService.getUserById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // 새로운 잔액 계산
    const newBalance = (user.cue_tokens || 0) + amount;

    // 사용자 CUE 잔액 업데이트
    await supabaseService.updateUser(userId, {
      cue_tokens: newBalance,
      last_cue_update_at: new Date().toISOString()
    });

    // CUE 거래 기록
    await supabaseService.recordCueTransaction({
      user_id: userId,
      transaction_type: 'mining',
      amount: amount,
      balance_after: newBalance,
      description: `${source || 'general'} 활동을 통한 CUE 마이닝`,
      source_platform: source || 'system',
      metadata: {
        messageId: messageId,
        miningTimestamp: Date.now()
      }
    });

    console.log(`✅ CUE 마이닝 완료: ${userId} +${amount} CUE (잔액: ${newBalance})`);

    res.json({
      success: true,
      amount: amount,
      newBalance: newBalance,
      transactionId: `mine_${Date.now()}`,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ CUE 마이닝 오류:', error);
    res.status(500).json({
      success: false,
      error: 'CUE mining failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// CUE 잔액 조회
router.get('/balance/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    const user = await supabaseService.getUserById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      balance: user.cue_tokens || 0,
      userId: userId,
      lastUpdate: user.last_cue_update_at
    });

  } catch (error: any) {
    console.error('❌ CUE 잔액 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Balance check failed'
    });
  }
});

export default router;
