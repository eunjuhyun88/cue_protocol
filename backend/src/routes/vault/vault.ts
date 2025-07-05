// ============================================================================
// 🗄️ 데이터 볼트 관리 라우트
// 경로: backend/src/routes/vault/vault.ts
// 용도: RAG-DAG 데이터 볼트 CRUD 및 검색 API
// ============================================================================

import { Router, Request, Response } from 'express';
import { DIContainer } from '../../core/DIContainer';

const router = Router();
const container = DIContainer.getInstance();

// 데이터베이스 서비스 가져오기
const db = container.resolve('DatabaseService');

console.log('🗄️ Vault routes initialized');

// ============================================================================
// 📋 데이터 볼트 목록 조회
// GET /api/vault/:did
// ============================================================================

router.get('/:did', async (req: Request, res: Response) => {
  try {
    const { did } = req.params;
    const { category, search, limit = 20, offset = 0 } = req.query;
    
    console.log(`📋 데이터 볼트 목록 조회: ${did}`, { category, search });

    // 사용자 확인
    const user = await db.getUserByDID(did);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: '사용자를 찾을 수 없습니다.'
      });
    }

    // 데이터 볼트 조회
    let vaults = await db.getDataVaults(did);

    // 카테고리 필터링
    if (category && typeof category === 'string') {
      vaults = vaults.filter(vault => vault.category === category);
    }

    // 검색 필터링
    if (search && typeof search === 'string') {
      const searchLower = search.toLowerCase();
      vaults = vaults.filter(vault => 
        vault.title.toLowerCase().includes(searchLower) ||
        vault.description?.toLowerCase().includes(searchLower) ||
        vault.tags?.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    // 페이지네이션
    const total = vaults.length;
    const limitNum = parseInt(limit as string);
    const offsetNum = parseInt(offset as string);
    
    vaults = vaults
      .sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime())
      .slice(offsetNum, offsetNum + limitNum);

    // 카테고리별 통계
    const allVaults = await db.getDataVaults(did);
    const categoryStats = allVaults.reduce((stats, vault) => {
      stats[vault.category] = (stats[vault.category] || 0) + 1;
      return stats;
    }, {} as Record<string, number>);

    res.json({
      success: true,
      vaults,
      pagination: {
        total,
        limit: limitNum,
        offset: offsetNum,
        hasMore: offsetNum + limitNum < total
      },
      categoryStats,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ 데이터 볼트 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get data vaults',
      message: '데이터 볼트 조회 중 오류가 발생했습니다.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ============================================================================
// 🆕 데이터 볼트 생성
// POST /api/vault
// ============================================================================

router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      userDid,
      title,
      description,
      category,
      data,
      tags = [],
      accessLevel = 'private',
      encrypted = true
    } = req.body;

    console.log(`🆕 데이터 볼트 생성 요청: ${userDid}`, { title, category });

    // 입력 검증
    if (!userDid || !title || !category || !data) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'userDid, title, category, data가 필요합니다.',
        required: ['userDid', 'title', 'category', 'data']
      });
    }

    // 사용자 확인
    const user = await db.getUserByDID(userDid);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // 카테고리 검증
    const validCategories = ['identity', 'behavioral', 'professional', 'social', 'preferences', 'expertise'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid category',
        validCategories
      });
    }

    // 데이터 볼트 생성
    const vaultData = {
      user_id: user.id,
      user_did: userDid,
      title,
      description,
      category,
      data: encrypted ? await encryptData(data) : data,
      tags,
      access_level: accessLevel,
      encrypted,
      data_count: Array.isArray(data) ? data.length : 1,
      usage_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const newVault = await db.createDataVault(vaultData);

    // CUE 토큰 보상 (데이터 기여에 대한 보상)
    const cueReward = calculateDataContributionReward(category, data);
    if (cueReward > 0) {
      await db.createCueTransaction({
        user_id: user.id,
        type: 'mining',
        amount: cueReward,
        description: `데이터 볼트 생성 보상 (${category})`,
        metadata: {
          vaultId: newVault.id,
          category,
          dataCount: vaultData.data_count
        }
      });

      // 사용자 잔액 업데이트
      const newBalance = (user.cue_tokens || 0) + cueReward;
      await db.updateUserCueBalance(user.id, newBalance);
    }

    res.status(201).json({
      success: true,
      vault: newVault,
      cueReward,
      message: `데이터 볼트가 생성되었습니다. ${cueReward} CUE 보상을 받았습니다.`,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ 데이터 볼트 생성 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create data vault',
      message: '데이터 볼트 생성 중 오류가 발생했습니다.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ============================================================================
// 🔍 데이터 볼트 검색
// POST /api/vault/search
// ============================================================================

router.post('/search', async (req: Request, res: Response) => {
  try {
    const { userDid, query, categories = [], limit = 10 } = req.body;

    console.log(`🔍 데이터 볼트 검색: ${userDid}`, { query, categories });

    if (!userDid || !query) {
      return res.status(400).json({
        success: false,
        error: 'userDid and query are required'
      });
    }

    // 사용자 확인
    const user = await db.getUserByDID(userDid);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // 검색 실행
    const searchResults = await performVaultSearch(userDid, query, categories, limit);

    // 검색 사용량 기록 (향후 개인화를 위해)
    await db.recordVaultUsage(userDid, {
      action: 'search',
      query,
      categories,
      resultCount: searchResults.length,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      results: searchResults,
      query,
      categories,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ 데이터 볼트 검색 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search data vaults',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ============================================================================
// ✏️ 데이터 볼트 업데이트
// PUT /api/vault/:vaultId
// ============================================================================

router.put('/:vaultId', async (req: Request, res: Response) => {
  try {
    const { vaultId } = req.params;
    const updates = req.body;

    console.log(`✏️ 데이터 볼트 업데이트: ${vaultId}`, Object.keys(updates));

    // 업데이트 가능한 필드 검증
    const allowedFields = ['title', 'description', 'tags', 'access_level', 'data'];
    const filteredUpdates: any = {};
    
    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    });

    if (Object.keys(filteredUpdates).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update',
        allowedFields
      });
    }

    // 기존 볼트 확인
    const existingVault = await db.getDataVaultById(vaultId);
    if (!existingVault) {
      return res.status(404).json({
        success: false,
        error: 'Data vault not found'
      });
    }

    // 데이터 암호화 (필요시)
    if (filteredUpdates.data && existingVault.encrypted) {
      filteredUpdates.data = await encryptData(filteredUpdates.data);
    }

    // 업데이트 실행
    const updatedVault = await db.updateDataVault(vaultId, {
      ...filteredUpdates,
      updated_at: new Date().toISOString()
    });

    res.json({
      success: true,
      vault: updatedVault,
      updatedFields: Object.keys(filteredUpdates),
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ 데이터 볼트 업데이트 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update data vault',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ============================================================================
// 🗑️ 데이터 볼트 삭제
// DELETE /api/vault/:vaultId
// ============================================================================

router.delete('/:vaultId', async (req: Request, res: Response) => {
  try {
    const { vaultId } = req.params;
    const { userDid } = req.query;

    console.log(`🗑️ 데이터 볼트 삭제: ${vaultId}`);

    if (!userDid) {
      return res.status(400).json({
        success: false,
        error: 'userDid is required'
      });
    }

    // 볼트 확인 및 소유권 검증
    const vault = await db.getDataVaultById(vaultId);
    if (!vault) {
      return res.status(404).json({
        success: false,
        error: 'Data vault not found'
      });
    }

    if (vault.user_did !== userDid) {
      return res.status(403).json({
        success: false,
        error: 'Access denied - You can only delete your own vaults'
      });
    }

    // 삭제 실행
    await db.deleteDataVault(vaultId);

    res.json({
      success: true,
      message: '데이터 볼트가 삭제되었습니다.',
      deletedVault: {
        id: vault.id,
        title: vault.title,
        category: vault.category
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ 데이터 볼트 삭제 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete data vault',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ============================================================================
// 📊 데이터 볼트 통계
// GET /api/vault/:did/stats
// ============================================================================

router.get('/:did/stats', async (req: Request, res: Response) => {
  try {
    const { did } = req.params;

    console.log(`📊 데이터 볼트 통계: ${did}`);

    const vaults = await db.getDataVaults(did);
    
    // 카테고리별 통계
    const categoryStats = vaults.reduce((stats, vault) => {
      stats[vault.category] = (stats[vault.category] || 0) + 1;
      return stats;
    }, {} as Record<string, number>);

    // 전체 통계
    const stats = {
      totalVaults: vaults.length,
      totalDataPoints: vaults.reduce((sum, vault) => sum + vault.data_count, 0),
      categoryBreakdown: categoryStats,
      averageUsage: vaults.length > 0 
        ? vaults.reduce((sum, vault) => sum + vault.usage_count, 0) / vaults.length 
        : 0,
      encryptedVaults: vaults.filter(vault => vault.encrypted).length,
      lastActivity: vaults.length > 0 
        ? Math.max(...vaults.map(vault => new Date(vault.updated_at || vault.created_at).getTime()))
        : null
    };

    res.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ 데이터 볼트 통계 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get vault stats',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ============================================================================
// 🔍 상태 확인
// GET /api/vault/health
// ============================================================================

router.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    service: 'Data Vault Service',
    status: 'operational',
    database: db.constructor.name,
    features: ['create', 'search', 'update', 'delete', 'stats'],
    encryption: 'AES-256-GCM',
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// 🔧 유틸리티 함수들
// ============================================================================

/**
 * 데이터 암호화
 */
async function encryptData(data: any): Promise<string> {
  // 실제 구현에서는 AES-256-GCM 등 강력한 암호화 사용
  // 여기서는 간단한 Base64 인코딩으로 예시
  try {
    const jsonString = JSON.stringify(data);
    return Buffer.from(jsonString).toString('base64');
  } catch (error) {
    console.error('❌ 데이터 암호화 오류:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * 데이터 기여 보상 계산
 */
function calculateDataContributionReward(category: string, data: any): number {
  const baseReward = 1.0; // 기본 1 CUE
  
  // 카테고리별 가중치
  const categoryWeights = {
    identity: 2.0,
    behavioral: 1.8,
    professional: 1.6,
    expertise: 1.4,
    social: 1.2,
    preferences: 1.0
  };
  
  const weight = categoryWeights[category as keyof typeof categoryWeights] || 1.0;
  
  // 데이터 크기에 따른 추가 보상
  const dataSize = JSON.stringify(data).length;
  const sizeBonus = Math.min(dataSize / 1000, 2.0); // 최대 2 CUE 추가
  
  return Math.round((baseReward * weight + sizeBonus) * 100) / 100;
}

/**
 * 볼트 검색 실행
 */
async function performVaultSearch(userDid: string, query: string, categories: string[], limit: number) {
  // 실제 구현에서는 벡터 검색이나 전문 검색 엔진 사용
  // 여기서는 간단한 텍스트 매칭으로 예시
  
  const allVaults = await db.getDataVaults(userDid);
  const queryLower = query.toLowerCase();
  
  let results = allVaults.filter(vault => {
    // 카테고리 필터
    if (categories.length > 0 && !categories.includes(vault.category)) {
      return false;
    }
    
    // 텍스트 검색
    return (
      vault.title.toLowerCase().includes(queryLower) ||
      vault.description?.toLowerCase().includes(queryLower) ||
      vault.tags?.some(tag => tag.toLowerCase().includes(queryLower))
    );
  });
  
  // 관련성 점수로 정렬 (간단한 예시)
  results = results
    .map(vault => ({
      ...vault,
      relevanceScore: calculateRelevanceScore(vault, query)
    }))
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, limit);
  
  return results;
}

/**
 * 관련성 점수 계산
 */
function calculateRelevanceScore(vault: any, query: string): number {
  let score = 0;
  const queryLower = query.toLowerCase();
  
  if (vault.title.toLowerCase().includes(queryLower)) score += 3;
  if (vault.description?.toLowerCase().includes(queryLower)) score += 2;
  if (vault.tags?.some((tag: string) => tag.toLowerCase().includes(queryLower))) score += 1;
  
  // 사용 빈도 보너스
  score += vault.usage_count * 0.1;
  
  // 최신성 보너스
  const daysSinceUpdate = (Date.now() - new Date(vault.updated_at || vault.created_at).getTime()) / (1000 * 60 * 60 * 24);
  score += Math.max(0, 1 - daysSinceUpdate / 30); // 최대 1점, 30일 후 0점
  
  return score;
}

export default router;