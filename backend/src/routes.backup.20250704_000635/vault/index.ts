// ============================================================================
// 🗄️ 통합된 완전한 데이터 볼트 라우트 시스템
// 파일: backend/src/routes/vault/index.ts
// 기존 기능 + 신규 기능 = 완전한 볼트 시스템
// ============================================================================

import { Router, Request, Response } from 'express';
import { DatabaseService } from '../../services/database/DatabaseService';
import { SupabaseService } from '../../services/database/SupabaseService';
import { SemanticCompressionService } from '../../services/ai/SemanticCompressionService';
import { PersonalCueExtractor } from '../../services/ai/PersonalCueExtractor';
import { CUEMiningService } from '../../services/cue/CUEMiningService';
import { CryptoService } from '../../services/encryption/CryptoService';
import { authMiddleware } from '../../middleware/authMiddleware';
import { asyncHandler } from '../../middleware/errorHandler';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// 서비스 인스턴스들 (기존 + 신규 통합)
const databaseService = DatabaseService.getInstance();
const supabaseService = SupabaseService.getInstance();
const compressionService = new SemanticCompressionService();
const cueExtractor = new PersonalCueExtractor();
const cueMinigService = new CUEMiningService();
const cryptoService = CryptoService.getInstance();

// 데이터베이스 서비스 선택 (환경에 따라)
const db = process.env.USE_MOCK_DATABASE === 'true' || 
          !process.env.SUPABASE_URL || 
          process.env.SUPABASE_URL.includes('dummy')
  ? databaseService
  : supabaseService;

console.log('🗄️ 통합 Vault routes initialized with:', db.constructor.name);

// ============================================================================
// 🗄️ 데이터 볼트 목록 조회 (기존 + 신규 기능 통합)
// GET /api/vault 또는 GET /api/vault/:did
// ============================================================================

router.get('/', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { category, encrypted, limit = 50, offset = 0 } = req.query;

  try {
    console.log(`🗄️ 볼트 목록 조회 - 사용자: ${user.id || user.did}`);

    // 두 가지 방식 모두 지원 (기존 getUserVaults + 신규 getDataVaults)
    let vaults;
    if (typeof db.getUserVaults === 'function') {
      vaults = await db.getUserVaults(user.id);
    } else {
      vaults = await db.getDataVaults(user.did);
    }

    // 필터링 적용 (신규 기능)
    if (category) {
      vaults = vaults.filter(vault => 
        (vault.vault_type || vault.category) === category
      );
    }
    
    if (encrypted !== undefined) {
      const isEncrypted = encrypted === 'true';
      vaults = vaults.filter(vault => 
        (vault.is_encrypted || vault.encrypted) === isEncrypted
      );
    }

    // 페이지네이션 적용
    const limitNum = parseInt(limit as string);
    const offsetNum = parseInt(offset as string);
    const paginatedVaults = vaults.slice(offsetNum, offsetNum + limitNum);

    // 통계 계산 (신규 기능)
    const vaultStats = {
      total: vaults.length,
      categories: [...new Set(vaults.map(v => v.vault_type || v.category))],
      totalSize: vaults.reduce((sum, v) => sum + (v.total_size || v.dataSize || 0), 0),
      encryptedCount: vaults.filter(v => v.is_encrypted || v.encrypted).length
    };

    // 응답 형식 통합
    const responseVaults = paginatedVaults.map(vault => ({
      id: vault.id,
      name: vault.vault_name || vault.name,
      description: vault.description,
      type: vault.vault_type || vault.category,
      isEncrypted: vault.is_encrypted || vault.encrypted,
      compartmentCount: vault.compartment_count || 0,
      totalSize: vault.total_size || vault.dataSize || 0,
      createdAt: vault.created_at || vault.createdAt,
      lastAccessed: vault.last_accessed_at || vault.updatedAt,
      permissions: vault.access_permissions,
      compressed: vault.compressed,
      tags: vault.tags || []
    }));

    res.json({
      success: true,
      vaults: responseVaults,
      stats: vaultStats,
      pagination: {
        limit: limitNum,
        offset: offsetNum,
        total: vaults.length,
        hasMore: offsetNum + limitNum < vaults.length
      },
      count: responseVaults.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ 볼트 목록 조회 오류:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to get vaults',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// ============================================================================
// 📦 새 데이터 볼트 생성 (기존 + 신규 기능 통합)
// POST /api/vault 또는 POST /api/vault/:did
// ============================================================================

router.post(['/', '/:did'], authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const { name, description, type = 'personal', isEncrypted = true, category } = req.body;
  const user = (req as any).user;
  const did = req.params.did || user.did;

  if (!name?.trim()) {
    return res.status(400).json({
      success: false,
      error: 'Vault name is required'
    });
  }

  try {
    console.log(`📦 새 볼트 생성 - 사용자: ${user.id || user.did}, 이름: ${name}`);

    // 암호화 키 생성 (기존 기능)
    let encryptionKey = null;
    if (isEncrypted) {
      encryptionKey = await cryptoService.generateVaultKey(user.id || did, name);
    }

    // 볼트 데이터 구성 (기존 + 신규 통합)
    const vaultData = {
      id: uuidv4(),
      user_id: user.id,
      user_did: user.did || did,
      userDid: user.did || did, // 신규 형식 호환
      vault_name: name,
      name: name, // 신규 형식 호환
      description: description || `${name} 개인 데이터 볼트`,
      vault_type: type,
      category: category || type, // 신규 형식 호환
      is_encrypted: isEncrypted,
      encrypted: isEncrypted, // 신규 형식 호환
      encryption_key_id: encryptionKey?.keyId || null,
      access_permissions: {
        owner: user.id || did,
        read: [user.id || did],
        write: [user.id || did],
        admin: [user.id || did]
      },
      compartment_count: 0,
      total_size: 0,
      dataSize: 0, // 신규 형식 호환
      metadata: {
        createdBy: user.username || 'unknown',
        platform: 'web',
        initialSize: 0,
        version: '1.0'
      },
      created_at: new Date().toISOString(),
      createdAt: new Date().toISOString(), // 신규 형식 호환
      updated_at: new Date().toISOString(),
      updatedAt: new Date().toISOString(), // 신규 형식 호환
      tags: [],
      accessCount: 0
    };

    // 볼트 생성 (두 방식 모두 지원)
    let vault;
    if (typeof db.createVault === 'function') {
      vault = await db.createVault(vaultData);
    } else {
      vault = await db.saveDataVault(vaultData);
    }

    console.log(`✅ 볼트 생성 완료 - ID: ${vault.id}`);

    res.status(201).json({
      success: true,
      vault: {
        id: vault.id,
        name: vault.vault_name || vault.name,
        description: vault.description,
        type: vault.vault_type || vault.category,
        isEncrypted: vault.is_encrypted || vault.encrypted,
        createdAt: vault.created_at || vault.createdAt
      },
      message: '데이터 볼트가 성공적으로 생성되었습니다.',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ 볼트 생성 오류:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to create vault',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// ============================================================================
// 💾 데이터 저장 (기존 개인 CUE 추출 기능 유지)
// POST /api/vault/save 또는 POST /api/vault/:did
// ============================================================================

router.post(['/save', '/:did/data'], authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const { 
    vaultId, 
    data, 
    type = 'text', 
    source = 'manual',
    compress = true,
    extractCues = true,
    category = 'general'
  } = req.body;
  
  const user = (req as any).user;
  const did = req.params.did || user.did;

  if (!vaultId && !did) {
    return res.status(400).json({
      success: false,
      error: 'Vault ID or DID is required'
    });
  }

  if (!data) {
    return res.status(400).json({
      success: false,
      error: 'Data is required'
    });
  }

  try {
    console.log(`💾 데이터 저장 시작 - 볼트: ${vaultId || 'auto'}, 타입: ${type}`);

    // 볼트 확인/생성
    let vault;
    if (vaultId) {
      // 기존 방식: 특정 볼트에 저장
      if (typeof db.getVault === 'function') {
        vault = await db.getVault(vaultId);
      } else {
        vault = await db.getDataVault(vaultId);
      }
      
      if (!vault || (vault.user_id !== user.id && vault.userDid !== did)) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to vault'
        });
      }
    } else {
      // 신규 방식: DID 기반 자동 볼트 선택/생성
      const vaults = await db.getDataVaults(did);
      vault = vaults.find(v => v.category === category) || vaults[0];
      
      if (!vault) {
        // 기본 볼트 생성
        const defaultVaultData = {
          id: uuidv4(),
          userDid: did,
          name: 'Default Vault',
          category: category,
          encrypted: true,
          dataSize: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          accessCount: 0,
          tags: ['auto-created'],
          metadata: { source: 'auto', version: '1.0' }
        };
        vault = await db.saveDataVault(defaultVaultData);
      }
    }

    // 데이터 압축 (기존 기능 유지)
    let processedData = data;
    let compressionInfo = null;
    
    if (compress && typeof data === 'string' && data.length > 100) {
      try {
        const compressed = await compressionService.compressContent(data);
        processedData = compressed.compressedContent;
        compressionInfo = {
          ratio: compressed.compressionRatio,
          preservation: compressed.semanticPreservation,
          keywords: compressed.keywords,
          entities: compressed.entities,
          topics: compressed.topics
        };
      } catch (compressionError) {
        console.warn('⚠️ 압축 실패, 원본 데이터 사용:', compressionError);
      }
    }

    // 데이터 암호화 (기존 기능 유지)
    let encryptedData = processedData;
    if (vault.is_encrypted || vault.encrypted) {
      try {
        encryptedData = await cryptoService.encryptVaultData(
          processedData, 
          vault.encryption_key_id
        );
      } catch (encryptionError) {
        console.warn('⚠️ 암호화 실패:', encryptionError);
      }
    }

    // 컴파트먼트 데이터 구성 (기존 + 신규 통합)
    const compartmentData = {
      id: uuidv4(),
      vault_id: vault.id,
      vaultId: vault.id, // 신규 형식 호환
      user_id: user.id,
      user_did: user.did || did,
      userDid: user.did || did, // 신규 형식 호환
      data_type: type,
      dataType: type, // 신규 형식 호환
      category: category,
      original_content: (vault.is_encrypted || vault.encrypted) ? null : data,
      encrypted_content: encryptedData,
      data: encryptedData, // 신규 형식 호환
      originalData: (vault.is_encrypted || vault.encrypted) ? null : data, // 신규 형식 호환
      is_encrypted: vault.is_encrypted || vault.encrypted,
      encrypted: vault.is_encrypted || vault.encrypted, // 신규 형식 호환
      compressed: !!compressionInfo,
      compression_info: compressionInfo,
      compression: compressionInfo, // 신규 형식 호환
      source_platform: source,
      source: source, // 신규 형식 호환
      dataSize: typeof data === 'string' ? data.length : JSON.stringify(data).length,
      metadata: {
        originalSize: typeof data === 'string' ? data.length : JSON.stringify(data).length,
        compressedSize: typeof processedData === 'string' ? processedData.length : JSON.stringify(processedData).length,
        source: source,
        timestamp: Date.now(),
        contentType: type,
        version: '1.0'
      },
      tags: [type, source],
      accessCount: 0,
      created_at: new Date().toISOString(),
      createdAt: new Date().toISOString(), // 신규 형식 호환
      updated_at: new Date().toISOString(),
      updatedAt: new Date().toISOString() // 신규 형식 호환
    };

    // 컴파트먼트 저장 (두 방식 모두 지원)
    let compartment;
    if (typeof db.createCompartment === 'function') {
      compartment = await db.createCompartment(compartmentData);
    } else {
      compartment = await db.saveDataVault(compartmentData);
    }

    // Personal CUE 추출 (기존 기능 유지)
    let extractedCues = [];
    if (extractCues && typeof data === 'string') {
      setImmediate(async () => {
        try {
          extractedCues = await cueExtractor.extractAndStoreCues(user.did || did, {
            content: data,
            type: type,
            source: source,
            vaultId: vault.id,
            compartmentId: compartment.id
          });
          
          console.log(`🧠 CUE 추출 완료 - ${extractedCues.length}개 추출`);
          
          // CUE 마이닝 (신규 기능)
          try {
            const miningResult = await cueMinigService.mineFromDataVault(compartmentData);
            await db.updateCueBalance(user.did || did, miningResult.tokensEarned);
            console.log(`⚡ CUE 마이닝 완료: +${miningResult.tokensEarned} CUE`);
          } catch (miningError) {
            console.warn('⚠️ CUE 마이닝 실패:', miningError);
          }
        } catch (error) {
          console.error('❌ CUE 추출 오류:', error);
        }
      });
    }

    // 볼트 통계 업데이트 (기존 기능)
    if (typeof db.updateVaultStats === 'function') {
      await db.updateVaultStats(vault.id, {
        compartment_count: (vault.compartment_count || 0) + 1,
        total_size: (vault.total_size || 0) + compartmentData.metadata.originalSize,
        last_accessed_at: new Date().toISOString()
      });
    }

    console.log(`✅ 데이터 저장 완료 - 컴파트먼트: ${compartment.id}`);

    res.json({
      success: true,
      compartment: {
        id: compartment.id,
        vaultId: vault.id,
        type: type,
        category: category,
        size: compartmentData.metadata.originalSize,
        compressed: !!compressionInfo,
        encrypted: vault.is_encrypted || vault.encrypted,
        createdAt: compartment.created_at || compartment.createdAt
      },
      vault: {
        id: vault.id,
        name: vault.vault_name || vault.name
      },
      compression: compressionInfo,
      cueExtraction: {
        started: extractCues,
        estimatedCount: extractCues ? Math.floor(data.length / 100) : 0
      },
      message: '데이터가 성공적으로 저장되었습니다.',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ 데이터 저장 오류:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to save data',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// ============================================================================
// 📖 데이터 조회 (기존 + 신규 기능 통합)
// GET /api/vault/:vaultId/data 또는 GET /api/vault/:did/:vaultId
// ============================================================================

router.get(['/:vaultId/data', '/:did/:vaultId'], authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const { vaultId, did } = req.params;
  const { limit = 20, offset = 0, type, includeData = 'true' } = req.query;
  const user = (req as any).user;

  try {
    console.log(`📖 볼트 데이터 조회 - 볼트: ${vaultId}`);

    // 볼트 권한 확인 (두 방식 모두 지원)
    let vault;
    if (typeof db.getVault === 'function') {
      vault = await db.getVault(vaultId);
    } else {
      vault = await db.getDataVault(vaultId);
    }

    if (!vault) {
      return res.status(404).json({
        success: false,
        error: 'Vault not found'
      });
    }

    // 권한 확인
    const hasAccess = vault.user_id === user.id || 
                     vault.userDid === (user.did || did) ||
                     vault.user_did === (user.did || did);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to vault'
      });
    }

    // 컴파트먼트 목록 조회 (기존 방식)
    let compartments = [];
    if (typeof db.getVaultCompartments === 'function') {
      compartments = await db.getVaultCompartments(vaultId, {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        type: type as string
      });
    } else {
      // 신규 방식: 모든 데이터 조회 후 필터링
      const allVaults = await db.getDataVaults(user.did || did);
      compartments = allVaults.filter(v => v.vaultId === vaultId || v.vault_id === vaultId);
      
      if (type) {
        compartments = compartments.filter(c => c.data_type === type || c.dataType === type);
      }
      
      const limitNum = parseInt(limit as string);
      const offsetNum = parseInt(offset as string);
      compartments = compartments.slice(offsetNum, offsetNum + limitNum);
    }

    // 데이터 복호화 (기존 기능 유지)
    const decryptedCompartments = await Promise.all(
      compartments.map(async (compartment) => {
        let content = compartment.original_content || compartment.originalData;
        
        if ((vault.is_encrypted || vault.encrypted) && 
            (compartment.encrypted_content || compartment.data)) {
          try {
            content = await cryptoService.decryptVaultData(
              compartment.encrypted_content || compartment.data,
              vault.encryption_key_id
            );
          } catch (error) {
            console.warn('복호화 실패:', error);
            content = '[암호화된 데이터]';
          }
        }

        return {
          id: compartment.id,
          type: compartment.data_type || compartment.dataType,
          category: compartment.category,
          content: includeData === 'true' ? content : undefined,
          source: compartment.source_platform || compartment.source,
          size: compartment.metadata?.originalSize || compartment.dataSize || 0,
          compressed: !!compartment.compression_info || compartment.compressed,
          encrypted: compartment.is_encrypted || compartment.encrypted,
          tags: compartment.tags || [],
          createdAt: compartment.created_at || compartment.createdAt,
          updatedAt: compartment.updated_at || compartment.updatedAt
        };
      })
    );

    // 액세스 카운트 증가 (신규 기능)
    if (typeof db.incrementVaultAccess === 'function') {
      await db.incrementVaultAccess(vaultId);
    }

    res.json({
      success: true,
      vault: {
        id: vault.id,
        name: vault.vault_name || vault.name,
        type: vault.vault_type || vault.category,
        isEncrypted: vault.is_encrypted || vault.encrypted
      },
      compartments: decryptedCompartments,
      pagination: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        total: compartments.length,
        hasMore: compartments.length === parseInt(limit as string)
      },
      metadata: {
        lastAccessed: new Date().toISOString(),
        includeData: includeData === 'true'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ 데이터 조회 오류:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to get vault data',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// ============================================================================
// 🔍 개인 CUE 조회 및 검색 (기존 + 신규 기능 통합)
// GET /api/vault/:vaultId/cues 또는 GET /api/vault/:did/search
// ============================================================================

router.get(['/:vaultId/cues', '/:did/search'], authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const { vaultId, did } = req.params;
  const { limit = 50, category, query, tags, dateFrom, dateTo } = req.query;
  const user = (req as any).user;

  try {
    if (req.path.includes('/cues')) {
      // 기존 방식: 개인 CUE 조회
      console.log(`🔍 개인 CUE 조회 - 볼트: ${vaultId}`);

      const vault = await db.getVault(vaultId);
      if (!vault || vault.user_id !== user.id) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to vault'
        });
      }

      const cues = await db.getPersonalCues(vaultId, {
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
    } else {
      // 신규 방식: 볼트 검색
      console.log(`🔍 데이터 볼트 검색: ${did}, 쿼리: ${query}`);

      let vaults = await db.getDataVaults(did);
      
      // 삭제된 볼트 제외
      vaults = vaults.filter(vault => !vault.deleted);

      // 텍스트 검색
      if (query) {
        const searchTerm = query.toString().toLowerCase();
        vaults = vaults.filter(vault => 
          JSON.stringify(vault.data || vault.encrypted_content || '').toLowerCase().includes(searchTerm) ||
          (vault.vault_type || vault.category || '').toLowerCase().includes(searchTerm) ||
          (vault.tags && vault.tags.some((tag: string) => tag.toLowerCase().includes(searchTerm)))
        );
      }

      // 카테고리 필터
      if (category) {
        vaults = vaults.filter(vault => 
          (vault.vault_type || vault.category) === category
        );
      }

      // 태그 필터
      if (tags) {
        const tagList = tags.toString().split(',');
        vaults = vaults.filter(vault => 
          vault.tags && tagList.some(tag => vault.tags.includes(tag.trim()))
        );
      }

      // 날짜 범위 필터
      if (dateFrom || dateTo) {
        vaults = vaults.filter(vault => {
          const vaultDate = new Date(vault.created_at || vault.createdAt);
          const fromDate = dateFrom ? new Date(dateFrom.toString()) : new Date(0);
          const toDate = dateTo ? new Date(dateTo.toString()) : new Date();
          return vaultDate >= fromDate && vaultDate <= toDate;
        });
      }

      // 결과 제한
      const limitNum = parseInt(limit.toString());
      const limitedVaults = vaults.slice(0, limitNum);

      res.json({
        success: true,
        vaults: limitedVaults,
        total: vaults.length,
        showing: limitedVaults.length,
        query: {
          text: query,
          category,
          tags,
          dateFrom,
          dateTo,
          limit: limitNum
        },
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('❌ CUE 조회/검색 오류:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to get CUEs or search vaults',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// ============================================================================
// 🗑️ 데이터 삭제 (기존 + 신규 소프트 삭제 기능)
// DELETE /api/vault/:vaultId/compartments/:compartmentId 또는 
// DELETE /api/vault/:did/:vaultId
// ============================================================================

router.delete(['/:vaultId/compartments/:compartmentId', '/:did/:vaultId'], authMiddleware, 
asyncHandler(async (req: Request, res: Response) => {
  const { vaultId, compartmentId, did } = req.params;
  const { permanent = 'false' } = req.query;
  const user = (req as any).user;

  try {
    if (compartmentId) {
      // 기존 방식: 컴파트먼트 삭제
      console.log(`🗑️ 컴파트먼트 삭제 - ${compartmentId}`);

      const vault = await db.getVault(vaultId);
      if (!vault || vault.user_id !== user.id) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      await db.deleteCompartment(compartmentId);

      res.json({
        success: true,
        message: '데이터가 성공적으로 삭제되었습니다.',
        timestamp: new Date().toISOString()
      });
    } else {
      // 신규 방식: 볼트 삭제
      console.log(`🗑️ 데이터 볼트 삭제: ${vaultId}, 영구삭제: ${permanent}`);

      const vault = await db.getDataVault(vaultId);
      
      if (!vault) {
        return res.status(404).json({
          success: false,
          error: 'Vault not found'
        });
      }

      // 권한 확인
      if (vault.userDid !== (user.did || did)) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      if (permanent === 'true') {
        // 영구 삭제
        await db.deleteDataVault(vaultId);
        res.json({
          success: true,
          message: '데이터 볼트가 영구적으로 삭제되었습니다.',
          timestamp: new Date().toISOString()
        });
      } else {
        // 소프트 삭제
        const deletedVault = await db.updateDataVault(vaultId, {
          ...vault,
          deleted: true,
          deletedAt: new Date().toISOString()
        });
        
        res.json({
          success: true,
          vault: deletedVault,
          message: '데이터 볼트가 삭제되었습니다. (복구 가능)',
          timestamp: new Date().toISOString()
        });
      }
    }

  } catch (error) {
    console.error('❌ 데이터 삭제 오류:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to delete data',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// ============================================================================
// 📊 볼트 통계 (기존 + 신규 고급 통계)
// GET /api/vault/:vaultId/stats 또는 GET /api/vault/:did/stats
// ============================================================================

router.get(['/:vaultId/stats', '/:did/stats'], authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const { vaultId, did } = req.params;
  const user = (req as any).user;

  try {
    if (vaultId && !did) {
      // 기존 방식: 특정 볼트 통계
      console.log(`📊 볼트 통계 조회 - ${vaultId}`);

      const vault = await db.getVault(vaultId);
      if (!vault || vault.user_id !== user.id) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      const stats = await db.getVaultStats(vaultId);

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
    } else {
      // 신규 방식: 전체 볼트 통계
      console.log(`📊 데이터 볼트 통계: ${did}`);

      const vaults = await db.getDataVaults(did);
      const activeVaults = vaults.filter(vault => !vault.deleted);

      const stats = {
        total: activeVaults.length,
        totalSize: activeVaults.reduce((sum, v) => sum + (v.dataSize || 0), 0),
        categories: activeVaults.reduce((acc: any, vault) => {
          const category = vault.vault_type || vault.category;
          acc[category] = (acc[category] || 0) + 1;
          return acc;
        }, {}),
        compression: {
          compressed: activeVaults.filter(v => v.compressed).length,
          totalOriginalSize: activeVaults.reduce((sum, v) => 
            sum + (v.originalData ? JSON.stringify(v.originalData).length : v.dataSize), 0),
          totalCompressedSize: activeVaults.reduce((sum, v) => sum + (v.dataSize || 0), 0)
        },
        encryption: {
          encrypted: activeVaults.filter(v => v.is_encrypted || v.encrypted).length,
          unencrypted: activeVaults.filter(v => !(v.is_encrypted || v.encrypted)).length
        },
        activity: {
          recentlyCreated: activeVaults.filter(v => 
            new Date(v.created_at || v.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          ).length,
          recentlyUpdated: activeVaults.filter(v => 
            new Date(v.updated_at || v.updatedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          ).length
        }
      };

      res.json({
        success: true,
        stats,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('❌ 볼트 통계 조회 오류:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to get vault stats',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// ============================================================================
// 📋 상태 확인 API
// GET /api/vault/health
// ============================================================================

router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'Integrated Vault Routes',
    database: db.constructor.name,
    timestamp: new Date().toISOString(),
    features: [
      'Personal data vaults',
      'Encryption & compression',
      'Personal CUE extraction',
      'CUE token mining',
      'Advanced search',
      'Statistics & analytics',
      'Soft delete',
      'Compartment management'
    ],
    compatibility: {
      legacy: 'Supports existing getUserVaults, createVault APIs',
      modern: 'Supports new getDataVaults, saveDataVault APIs'
    }
  });
});

console.log('✅ Integrated Vault routes loaded successfully');

export default router;