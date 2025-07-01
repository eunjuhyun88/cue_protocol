// File: backend/src/routes/vault/index.ts
// ============================================================================
// 📦 데이터 볼트 라우트 - 데이터 볼트 목록 조회, 생성, 데이 터
// 추출 및 압축 API
// ============================================================================ 
// backend/src/routes/vault/index.ts  
// ============================================================================
import express from 'express';
// Update the import path below if DatabaseService is located elsewhere
import { DatabaseService } from '../../services/database/DatabaseService';
// If the file does not exist, create ../../services/database/DatabaseService.ts and export DatabaseService from it
import { SemanticCompressionService } from '../../services/ai/SemanticCompressionService';
import { CUEMiningService } from '../../services/cue/CUEMiningService';
import { asyncHandler } from '../../middleware/errorHandler';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();
const db = DatabaseService.getInstance();

// 데이터 볼트 목록 조회
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
    const vaults = await db.getDataVaults(did);
    
    res.json({
      success: true,
      vaults
    });

  } catch (error) {
    console.error('Get data vaults error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get data vaults'
    });
  }
}));

// 새 데이터 볼트 생성
router.post('/', asyncHandler(async (req, res) => {
  const { name, description, category } = req.body;
  const userDid = (req as any).user.did;

  try {
    const vaultData = {
      id: uuidv4(),
      owner_did: userDid,
      name,
      description,
      category,
      access_level: 'private',
      status: 'active',
      encrypted: true,
      source_platforms: []
    };

    const newVault = await db.createDataVault(vaultData);
    
    res.json({
      success: true,
      vault: newVault
    });

  } catch (error) {
    console.error('Create data vault error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create data vault'
    });
  }
}));

// 데이터 추출 및 압축
router.post('/extract', asyncHandler(async (req, res) => {
  const { platform, data } = req.body;
  const userDid = (req as any).user.did;

  try {
    const compressionService = new SemanticCompressionService();
    const cueService = new CUEMiningService(db);

    // 데이터 압축 및 분석
    const analysisResult = await compressionService.analyzeConversation(
      data.content || 'Extracted data',
      'System processed extraction'
    );

    if (
      analysisResult.shouldStore &&
      'compressedContent' in analysisResult &&
      'compressionRatio' in analysisResult &&
      'semanticPreservation' in analysisResult &&
      'keywords' in analysisResult &&
      'entities' in analysisResult &&
      'topics' in analysisResult &&
      'importance' in analysisResult &&
      'cueValue' in analysisResult
    ) {
      // 개인화 CUE 저장
      await db.storePersonalCue({
        id: uuidv4(),
        user_did: userDid,
        vault_id: null, // 나중에 볼트 할당
        content_type: 'knowledge',
        original_content: data.content || 'Extracted data',
        compressed_content: analysisResult.compressedContent,
        compression_algorithm: 'semantic',
        compression_ratio: analysisResult.compressionRatio,
        semantic_preservation: analysisResult.semanticPreservation,
        keywords: analysisResult.keywords,
        entities: analysisResult.entities,
        topics: analysisResult.topics,
        importance_score: analysisResult.importance,
        cue_mining_value: analysisResult.cueValue,
        source_platform: platform
      });

      // CUE 토큰 마이닝
      const minedTokens = analysisResult.cueValue * 10; // CUE 값에 따른 토큰 지급
      
      await cueService.mineFromInteraction({
        userDid,
        messageContent: `Data extraction from ${platform}`,
        aiResponse: 'Data processed and compressed',
        model: 'data_extraction',
        personalContextUsed: 1,
        responseTime: 1000,
        conversationId: `extraction_${Date.now()}`
      });
    }

    res.json({
      success: true,
      extracted: analysisResult.shouldStore,
      analysis: analysisResult,
      cueTokensEarned: analysisResult.cueValue * 10
    });

  } catch (error) {
    console.error('Data extraction error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to extract data'
    });
  }
}));

export default router;
