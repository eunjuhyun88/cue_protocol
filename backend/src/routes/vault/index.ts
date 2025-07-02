// ============================================================================
// 🗄️ 데이터 볼트 라우트 - 개인 데이터 저장 및 관리
// 파일: backend/src/routes/vault/index.ts
// 역할: 데이터 볼트 생성, 저장, 조회, 암호화 관리
// ============================================================================

import { Router, Request, Response } from 'express';
import { DatabaseService } from '../../services/database/DatabaseService';
import { CryptoService } from '../../services/encryption/CryptoService';
import { SemanticCompressionService } from '../../services/ai/SemanticCompressionService';
import { PersonalcueExtractor } from '../../services/ai/PersonalcueExtractor';
import { authMiddleware } from '../../middleware/authMiddleware';
import { asyncHandler } from '../../middleware/errorHandler';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// 서비스 인스턴스들
const databaseService = DatabaseService.getInstance();
const cryptoService = CryptoService.getInstance();
const compressionService = new SemanticCompressionService();
const cueExtractor = new PersonalcueExtractor();

// ============================================================================
// 🗄️ 데이터 볼트 목록 조회
// ============================================================================

router.get('/', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;

  try {
    console.log(`🗄️ 볼트 목록 조회 - 사용자: ${user.id}`);

    const vaults = await databaseService.getUserVaults(user.id);

    res.json({
      success: true,
      vaults: vaults.map(vault => ({
        id: vault.id,
        name: vault.vault_name,
        description: vault.description,
        type: vault.vault_type,
        isEncrypted: vault.is_encrypted,
        compartmentCount: vault.compartment_count || 0,
        totalSize: vault.total_size || 0,
        createdAt: vault.created_at,
        lastAccessed: vault.last_accessed_at,
        permissions: vault.access_permissions
      })),
      count: vaults.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ 볼트 목록 조회 오류:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to get vaults'
    });
  }
}));

// ============================================================================
// 📦 새 데이터 볼트 생성
// ============================================================================

router.post('/', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const { name, description, type = 'personal', isEncrypted = true } = req.body;
  const user = (req as any).user;

  if (!name?.trim()) {
    return res.status(400).json({
      success: false,
      error: 'Vault name is required'
    });
  }

  try {
    console.log(`📦 새 볼트 생성 - 사용자: ${user.id}, 이름: ${name}`);

    // 암호화 키 생성 (필요한 경우)
    let encryptionKey = null;
    if (isEncrypted) {
      encryptionKey = await cryptoService.generateVaultKey(user.id, name);
    }

    const vaultData = {
      id: uuidv4(),
      user_id: user.id,
      user_did: user.did,
      vault_name: name,
      description: description || `${name} 개인 데이터 볼트`,
      vault_type: type,
      is_encrypted: isEncrypted,
      encryption_key_id: encryptionKey?.keyId || null,
      access_permissions: {
        owner: user.id,
        read: [user.id],
        write: [user.id],
        admin: [user.id]
      },
      metadata: {
        createdBy: user.username,
        platform: 'web',
        initialSize: 0
      },
      created_at: new Date().toISOString()
    };

    const vault = await databaseService.createVault(vaultData);

    console.log(`✅ 볼트 생성 완료 - ID: ${vault.id}`);

    res.json({
      success: true,
      vault: {
        id: vault.id,
        name: vault.vault_name,
        description: vault.description,
        type: vault.vault_type,
        isEncrypted: vault.is_encrypted,
        createdAt: vault.created_at
      },
      message: '데이터 볼트가 성공적으로 생성되었습니다.',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ 볼트 생성 오류:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to create vault'
    });
  }
}));

// ============================================================================
// 💾 데이터 저장 (개인 CUE 추출 포함)
// ============================================================================

router.post('/save', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const { 
    vaultId, 
    data, 
    type = 'text', 
    source = 'manual',
    compress = true,
    extractCues = true 
  } = req.body;
  
  const user = (req as any).user;

  if (!vaultId || !data) {
    return res.status(400).json({
      success: false,
      error: 'Vault ID and data are required'
    });
  }

  try {
    console.log(`💾 데이터 저장 시작 - 볼트: ${vaultId}, 타입: ${type}`);

    // 1. 볼트 권한 확인
    const vault = await databaseService.getVault(vaultId);
    if (!vault || vault.user_id !== user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to vault'
      });
    }

    // 2. 데이터 압축 (선택적)
    let processedData = data;
    let compressionInfo = null;
    
    if (compress && typeof data === 'string' && data.length > 100) {
      const compressed = await compressionService.compressContent(data);
      processedData = compressed.compressedContent;
      compressionInfo = {
        ratio: compressed.compressionRatio,
        preservation: compressed.semanticPreservation,
        keywords: compressed.keywords,
        entities: compressed.entities,
        topics: compressed.topics
      };
    }

    // 3. 데이터 암호화 (볼트가 암호화된 경우)
    let encryptedData = processedData;
    if (vault.is_encrypted) {
      encryptedData = await cryptoService.encryptVaultData(
        processedData, 
        vault.encryption_key_id
      );
    }

    // 4. 컴파트먼트에 데이터 저장
    const compartmentData = {
      id: uuidv4(),
      vault_id: vaultId,
      user_id: user.id,
      data_type: type,
      original_content: vault.is_encrypted ? null : data, // 암호화된 경우 원본 저장 안함
      encrypted_content: encryptedData,
      is_encrypted: vault.is_encrypted,
      source_platform: source,
      compression_info: compressionInfo,
      metadata: {
        originalSize: typeof data === 'string' ? data.length : JSON.stringify(data).length,
        compressedSize: typeof processedData === 'string' ? processedData.length : JSON.stringify(processedData).length,
        source: source,
        timestamp: Date.now()
      },
      created_at: new Date().toISOString()
    };

    const compartment = await databaseService.createCompartment(compartmentData);

    // 5. Personal CUE 추출 (백그라운드)
    let extractedCues = [];
    if (extractCues && typeof data === 'string') {
      setImmediate(async () => {
        try {
          extractedCues = await cueExtractor.extractAndStoreCues(user.did, {
            content: data,
            type: type,
            source: source,
            vaultId: vaultId,
            compartmentId: compartment.id
          });
          
          console.log(`🧠 CUE 추출 완료 - ${extractedCues.length}개 추출`);
        } catch (error) {
          console.error('❌ CUE 추출 오류:', error);
        }
      });
    }

    // 6. 볼트 통계 업데이트
    await databaseService.updateVaultStats(vaultId, {
      compartment_count: vault.compartment_count + 1,
      total_size: vault.total_size + compartmentData.metadata.originalSize,
      last_accessed_at: new Date().toISOString()
    });

    console.log(`✅ 데이터 저장 완료 - 컴파트먼트: ${compartment.id}`);

    res.json({
      success: true,
      compartment: {
        id: compartment.id,
        vaultId: vaultId,
        type: type,
        size: compartmentData.metadata.originalSize,
        compressed: !!compressionInfo,
        encrypted: vault.is_encrypted,
        createdAt: compartment.created_at
      },
      compression: compressionInfo,
      cueExtraction: {
        started: extractCues,
        estimatedCount: extractCues ? Math.floor(data.length / 100) : 0
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ 데이터 저장 오류:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to save data'
    });
  }
}));

// ============================================================================
// 📖 데이터 조회
// ============================================================================

router.get('/:vaultId/data', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const { vaultId } = req.params;
  const { limit = 20, offset = 0, type } = req.query;
  const user = (req as any).user;

  try {
    console.log(`📖 볼트 데이터 조회 - 볼트: ${vaultId}`);

    // 볼트 권한 확인
    const vault = await databaseService.getVault(vaultId);
    if (!vault || vault.user_id !== user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to vault'
      });
    }

    // 컴파트먼트 목록 조회
    const compartments = await databaseService.getVaultCompartments(vaultId, {
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      type: type as string
    });

    // 데이터 복호화 (필요한 경우)
    const decryptedCompartments = await Promise.all(
      compartments.map(async (compartment) => {
        let content = compartment.original_content;
        
        if (vault.is_encrypted && compartment.encrypted_content) {
          try {
            content = await cryptoService.decryptVaultData(
              compartment.encrypted_content,
              vault.encryption_key_id
            );
          } catch (error) {
            console.warn('복호화 실패:', error);
            content = '[암호화된 데이터]';
          }
        }

        return {
          id: compartment.id,
          type: compartment.data_type,
          content: content,
          source: compartment.source_platform,
          size: compartment.metadata?.originalSize || 0,
          compressed: !!compartment.compression_info,
          createdAt: compartment.created_at
        };
      })
    );

    res.json({
      success: true,
      vault: {
        id: vault.id,
        name: vault.vault_name,
        type: vault.vault_type,
        isEncrypted: vault.is_encrypted
      },
      compartments: decryptedCompartments,
      pagination: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        total: compartments.length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ 데이터 조회 오류:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to get vault data'
    });
  }
}));

// ============================================================================
// 🔍 개인 CUE 조회
// ============================================================================

router.get('/:vaultId/cues', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const { vaultId } = req.params;
  const { limit = 50, category } = req.query;
  const user = (req as any).user;

  try {
    console.log(`🔍 개인 CUE 조회 - 볼트: ${vaultId}`);

    // 볼트 권한 확인
    const vault = await databaseService.getVault(vaultId);
    if (!vault || vault.user_id !== user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to vault'
      });
    }

    const cues = await databaseService.getPersonalCues(vaultId, {
      limit: parseInt(limit as string),
      category: category as string
    });

    res.json({
      success: true,
      vault: {
        id: vault.id,
        name: vault.vault_name
      },
      cues: cues.map(cue => ({
        id: cue.id,
        type: cue.content_type,
        content: cue.compressed_content,
        keywords: cue.keywords,
        entities: cue.entities,
        topics: cue.topics,
        importance: cue.importance_score,
        cueValue: cue.cue_mining_value,
        createdAt: cue.created_at
      })),
      count: cues.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ CUE 조회 오류:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to get personal CUEs'
    });
  }
}));

// ============================================================================
// 🗑️ 데이터 삭제
// ============================================================================

router.delete('/:vaultId/compartments/:compartmentId', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const { vaultId, compartmentId } = req.params;
  const user = (req as any).user;

  try {
    console.log(`🗑️ 컴파트먼트 삭제 - ${compartmentId}`);

    // 권한 확인
    const vault = await databaseService.getVault(vaultId);
    if (!vault || vault.user_id !== user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    await databaseService.deleteCompartment(compartmentId);

    console.log(`✅ 컴파트먼트 삭제 완료 - ${compartmentId}`);

    res.json({
      success: true,
      message: '데이터가 성공적으로 삭제되었습니다.',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ 데이터 삭제 오류:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to delete data'
    });
  }
}));

// ============================================================================
// 📊 볼트 통계
// ============================================================================

router.get('/:vaultId/stats', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const { vaultId } = req.params;
  const user = (req as any).user;

  try {
    // 권한 확인
    const vault = await databaseService.getVault(vaultId);
    if (!vault || vault.user_id !== user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const stats = await databaseService.getVaultStats(vaultId);

    res.json({
      success: true,
      vault: {
        id: vault.id,
        name: vault.vault_name
      },
      stats: {
        totalCompartments: stats.compartmentCount,
        totalSize: stats.totalSize,
        dataTypes: stats.dataTypes,
        compressionRatio: stats.averageCompression,
        cueCount: stats.personalCueCount,
        lastActivity: stats.lastActivity
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ 볼트 통계 조회 오류:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to get vault stats'
    });
  }
}));

export default router;