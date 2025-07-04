// ============================================================================
// 📁 backend/src/routes/vault/index.ts
// 🏠 데이터 볼트 라우터 - DI 패턴 적용 (대폭 간소화)
// ============================================================================

import { Router, Request, Response } from 'express';
import { getService } from '../../core/DIContainer';
import { authMiddleware } from '../../middleware/authMiddleware';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// DI에서 서비스 가져오기
const getActiveDB = () => getService('ActiveDatabaseService');
const getCryptoService = () => getService('CryptoService');
const getPersonalCueExtractor = () => getService('PersonalCueExtractor');
const getCueService = () => getService('CueService');
const getSemanticCompressionService = () => getService('SemanticCompressionService');

// ============================================================================
// 🏠 볼트 생성
// ============================================================================

router.post('/create', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, vaultType = 'personal', data, encrypted = false } = req.body;
    const user = (req as any).user;
    
    if (!name || !data) {
      res.status(400).json({
        success: false,
        error: '볼트 이름과 데이터가 필요합니다'
      });
      return;
    }
    
    console.log(`🏠 === 볼트 생성: ${user.did} ===`);
    
    // DI 서비스 사용
    const db = getActiveDB();
    const cryptoService = getCryptoService();
    const cueExtractor = getPersonalCueExtractor();
    const cueService = getCueService();
    const compressionService = getSemanticCompressionService();
    
    // 데이터 압축
    const compressionResult = await compressionService.compressData(data);
    
    // 볼트 데이터 생성
    const vaultData = {
      id: uuidv4(),
      userDid: user.did,
      name,
      description,
      vaultType,
      isEncrypted: encrypted,
      originalData: encrypted ? null : data,
      compressedData: compressionResult.compressedContent,
      compressionRatio: compressionResult.compressionRatio,
      dataSize: JSON.stringify(data).length,
      createdAt: new Date().toISOString(),
      lastAccessedAt: new Date().toISOString()
    };
    
    // 데이터 암호화 (필요시)
    if (encrypted) {
      vaultData.encryptedData = await cryptoService.encrypt(JSON.stringify(data));
    }
    
    // 볼트 저장
    const savedVault = await db.saveDataVault(vaultData);
    
    // 개인 단서 추출 (백그라운드)
    setImmediate(async () => {
      try {
        const cues = await cueExtractor.extractFromData(data, user.did, savedVault.id);
        console.log(`🔍 ${cues.length}개 개인 단서 추출 완료`);
        
        // CUE 토큰 지급
        const cueReward = Math.min(cues.length * 5, 100);
        await cueService.awardTokens(user.did, cueReward, 'data_vault_creation');
      } catch (error) {
        console.warn('⚠️ 개인 단서 추출 실패:', error);
      }
    });
    
    res.status(201).json({
      success: true,
      vault: {
        id: savedVault.id,
        name: savedVault.name,
        description: savedVault.description,
        vaultType: savedVault.vaultType,
        isEncrypted: savedVault.isEncrypted,
        compressionRatio: savedVault.compressionRatio,
        dataSize: savedVault.dataSize,
        createdAt: savedVault.createdAt
      },
      message: '데이터 볼트가 생성되었습니다',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ 볼트 생성 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create vault',
      message: error.message
    });
  }
});

// ============================================================================
// 📋 볼트 목록 조회
// ============================================================================

router.get('/list', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { page = 1, limit = 10, type } = req.query;
    
    console.log(`📋 === 볼트 목록 조회: ${user.did} ===`);
    
    // DI 서비스 사용
    const db = getActiveDB();
    
    const vaults = await db.getDataVaultsByUser(user.did, {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      type: type as string
    });
    
    // 민감한 데이터 제외하고 반환
    const sanitizedVaults = vaults.map(vault => ({
      id: vault.id,
      name: vault.name,
      description: vault.description,
      vaultType: vault.vaultType,
      isEncrypted: vault.isEncrypted,
      compressionRatio: vault.compressionRatio,
      dataSize: vault.dataSize,
      createdAt: vault.createdAt,
      lastAccessedAt: vault.lastAccessedAt
    }));
    
    res.json({
      success: true,
      vaults: sanitizedVaults,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: vaults.length
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ 볼트 목록 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get vault list',
      message: error.message
    });
  }
});

// ============================================================================
// 🔍 볼트 데이터 조회
// ============================================================================

router.get('/:vaultId', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { vaultId } = req.params;
    const user = (req as any).user;
    
    console.log(`🔍 === 볼트 데이터 조회: ${vaultId} ===`);
    
    // DI 서비스 사용
    const db = getActiveDB();
    const cryptoService = getCryptoService();
    
    const vault = await db.getDataVault(vaultId);
    
    if (!vault || vault.userDid !== user.did) {
      res.status(404).json({
        success: false,
        error: '볼트를 찾을 수 없습니다'
      });
      return;
    }
    
    // 데이터 복호화 (필요시)
    let vaultData = vault.originalData || vault.compressedData;
    if (vault.isEncrypted && vault.encryptedData) {
      const decryptedData = await cryptoService.decrypt(vault.encryptedData);
      vaultData = JSON.parse(decryptedData);
    }
    
    // 접근 시간 업데이트
    await db.updateDataVault(vaultId, {
      lastAccessedAt: new Date().toISOString()
    });
    
    res.json({
      success: true,
      vault: {
        id: vault.id,
        name: vault.name,
        description: vault.description,
        vaultType: vault.vaultType,
        data: vaultData,
        isEncrypted: vault.isEncrypted,
        compressionRatio: vault.compressionRatio,
        dataSize: vault.dataSize,
        createdAt: vault.createdAt,
        lastAccessedAt: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ 볼트 데이터 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get vault data',
      message: error.message
    });
  }
});

// ============================================================================
// 🔧 볼트 업데이트
// ============================================================================

router.put('/:vaultId', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { vaultId } = req.params;
    const { name, description, data } = req.body;
    const user = (req as any).user;
    
    console.log(`🔧 === 볼트 업데이트: ${vaultId} ===`);
    
    // DI 서비스 사용
    const db = getActiveDB();
    const cryptoService = getCryptoService();
    const compressionService = getSemanticCompressionService();
    
    const vault = await db.getDataVault(vaultId);
    
    if (!vault || vault.userDid !== user.did) {
      res.status(404).json({
        success: false,
        error: '볼트를 찾을 수 없습니다'
      });
      return;
    }
    
    const updates = {
      name: name || vault.name,
      description: description || vault.description,
      updatedAt: new Date().toISOString()
    };
    
    // 데이터 업데이트 시 재압축
    if (data) {
      const compressionResult = await compressionService.compressData(data);
      updates.compressedData = compressionResult.compressedContent;
      updates.compressionRatio = compressionResult.compressionRatio;
      updates.dataSize = JSON.stringify(data).length;
      
      if (vault.isEncrypted) {
        updates.encryptedData = await cryptoService.encrypt(JSON.stringify(data));
      } else {
        updates.originalData = data;
      }
    }
    
    const updatedVault = await db.updateDataVault(vaultId, updates);
    
    res.json({
      success: true,
      vault: {
        id: updatedVault.id,
        name: updatedVault.name,
        description: updatedVault.description,
        vaultType: updatedVault.vaultType,
        isEncrypted: updatedVault.isEncrypted,
        compressionRatio: updatedVault.compressionRatio,
        dataSize: updatedVault.dataSize,
        updatedAt: updatedVault.updatedAt
      },
      message: '볼트가 업데이트되었습니다',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ 볼트 업데이트 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update vault',
      message: error.message
    });
  }
});

// ============================================================================
// 🗑️ 볼트 삭제
// ============================================================================

router.delete('/:vaultId', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { vaultId } = req.params;
    const user = (req as any).user;
    
    console.log(`🗑️ === 볼트 삭제: ${vaultId} ===`);
    
    // DI 서비스 사용
    const db = getActiveDB();
    
    const vault = await db.getDataVault(vaultId);
    
    if (!vault || vault.userDid !== user.did) {
      res.status(404).json({
        success: false,
        error: '볼트를 찾을 수 없습니다'
      });
      return;
    }
    
    await db.deleteDataVault(vaultId);
    
    res.json({
      success: true,
      message: '볼트가 삭제되었습니다',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ 볼트 삭제 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete vault',
      message: error.message
    });
  }
});

// ============================================================================
// 📊 볼트 통계
// ============================================================================

router.get('/stats/summary', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    
    console.log(`📊 === 볼트 통계 조회: ${user.did} ===`);
    
    // DI 서비스 사용
    const db = getActiveDB();
    
    const stats = await db.getDataVaultStats(user.did);
    
    res.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ 볼트 통계 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get vault stats',
      message: error.message
    });
  }
});

console.log('✅ Vault routes initialized with DI');
export default router;