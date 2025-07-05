
// ============================================================================
// 💎 CUE 토큰 라우트 - CUE 잔액 조회,    
// CUE 트랜잭션 기록 조회, CUE 마이닝 API
// ============================================================================
// backend/src/routes/cue/index.ts

import express from 'express';
// Update the import path below if the file is named or located differently, e.g. DatabaseService.ts or databaseService.ts
import { DatabaseService } from '../../services/database/DatabaseService'; // Adjust the path as necessary
// If the file is actually named DatabaseService.ts, ensure the casing matches exactly.
import { CUEMiningService } from '../../services/cue/CUEMiningService';
import { asyncHandler } from '../../middleware/errorHandler';

const router = express.Router();
const db = DatabaseService.getInstance();

// CUE 잔액 조회
router.get('/:did/balance', asyncHandler(async (req, res) => {
  const { did } = req.params;
  const userDid = (req as any).user.did;

  // 권한 확인
  if (userDid !== did) {
    return res.status(403).json({
      success: false,
      error: 'Access denied'
    });
  }

  try {
    const balance = await db.getCUEBalance(did);
    
    res.json({
      success: true,
      balance,
      did
    });

  } catch (error) {
    console.error('Get CUE balance error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get CUE balance'
    });
  }
}));

// CUE 트랜잭션 기록 조회
router.get('/:did/transactions', asyncHandler(async (req, res) => {
  const { did } = req.params;
  const { limit = 50 } = req.query;
  const userDid = (req as any).user.did;

  if (userDid !== did) {
    return res.status(403).json({
      success: false,
      error: 'Access denied'
    });
  }

  try {
    const cueService = new CUEMiningService(db);
    const transactions = await cueService.getTransactionHistory(did, parseInt(limit as string));
    
    res.json({
      success: true,
      transactions,
      count: transactions.length
    });

  } catch (error) {
    console.error('Get CUE transactions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get CUE transactions'
    });
  }
}));

// CUE 마이닝 (수동)
router.post('/mine', asyncHandler(async (req, res) => {
  const { activity, data } = req.body;
  const userDid = (req as any).user.did;

  try {
    const cueService = new CUEMiningService(db);
    
    // 활동에 따른 CUE 마이닝
    let minedAmount = 0;
    
    switch (activity) {
      case 'manual_interaction':
        minedAmount = await cueService.mineFromInteraction({
          userDid,
          messageContent: data.message || 'Manual interaction',
          aiResponse: 'System response',
          model: 'system',
          personalContextUsed: 0,
          responseTime: 0,
          conversationId: data.conversationId || 'manual'
        });
        break;
        
      case 'data_contribution':
        // 데이터 기여에 대한 보상
        minedAmount = Math.random() * 5 + 1; // 1-6 CUE
        break;
        
      default:
        minedAmount = 1; // 기본 보상
    }

    res.json({
      success: true,
      minedAmount,
      activity,
      userDid
    });

  } catch (error) {
    console.error('CUE mining error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mine CUE tokens'
    });
  }
}));

export default router;
