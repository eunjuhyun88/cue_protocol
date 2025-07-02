// ============================================================================
// 🌐 플랫폼 연동 라우트 - 외부 서비스 연결 관리
// 파일: backend/src/routes/platform/index.ts
// 역할: ChatGPT, Claude, Discord 등 외부 플랫폼 연동
// ============================================================================

import { Router, Request, Response } from 'express';
import { DatabaseService } from '../../services/database/DatabaseService';
import { CryptoService } from '../../services/encryption/CryptoService';
import { authMiddleware } from '../../middleware/authMiddleware';
import { asyncHandler } from '../../middleware/errorHandler';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// 서비스 인스턴스들
const databaseService = DatabaseService.getInstance();
const cryptoService = CryptoService.getInstance();

// 지원되는 플랫폼 목록
const SUPPORTED_PLATFORMS = {
  chatgpt: {
    name: 'ChatGPT',
    icon: '🤖',
    description: 'OpenAI ChatGPT 대화 데이터 연동',
    authType: 'api_key',
    dataTypes: ['conversations', 'prompts', 'responses']
  },
  claude: {
    name: 'Claude AI', 
    icon: '🧠',
    description: 'Anthropic Claude 대화 데이터 연동',
    authType: 'api_key',
    dataTypes: ['conversations', 'documents']
  },
  discord: {
    name: 'Discord',
    icon: '💬',
    description: 'Discord 서버 및 메시지 데이터 연동',
    authType: 'oauth',
    dataTypes: ['messages', 'servers', 'reactions']
  },
  notion: {
    name: 'Notion',
    icon: '📝',
    description: 'Notion 워크스페이스 및 페이지 연동',
    authType: 'oauth',
    dataTypes: ['pages', 'databases', 'blocks']
  },
  github: {
    name: 'GitHub',
    icon: '🐙',
    description: 'GitHub 리포지토리 및 코드 연동',
    authType: 'oauth',
    dataTypes: ['repositories', 'commits', 'issues']
  },
  twitter: {
    name: 'Twitter/X',
    icon: '🐦',
    description: 'Twitter 트윗 및 상호작용 데이터',
    authType: 'oauth',
    dataTypes: ['tweets', 'mentions', 'likes']
  }
};

// ============================================================================
// 🌐 지원 플랫폼 목록 조회
// ============================================================================

router.get('/supported', asyncHandler(async (req: Request, res: Response) => {
  res.json({
    success: true,
    platforms: Object.entries(SUPPORTED_PLATFORMS).map(([id, platform]) => ({
      id,
      ...platform,
      available: true
    })),
    count: Object.keys(SUPPORTED_PLATFORMS).length,
    timestamp: new Date().toISOString()
  });
}));

// ============================================================================
// 🔗 사용자 연결된 플랫폼 조회
// ============================================================================

router.get('/connections', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;

  try {
    console.log(`🔗 연결된 플랫폼 조회 - 사용자: ${user.id}`);

    const connections = await databaseService.getConnectedPlatforms(user.id);

    res.json({
      success: true,
      connections: connections.map(connection => ({
        id: connection.id,
        platform: connection.platform_name,
        platformInfo: SUPPORTED_PLATFORMS[connection.platform_name as keyof typeof SUPPORTED_PLATFORMS],
        isConnected: connection.is_connected,
        status: connection.connection_status,
        lastSync: connection.last_sync_at,
        dataPoints: connection.data_points_count || 0,
        connectedAt: connection.connected_at,
        settings: connection.sync_settings
      })),
      count: connections.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ 연결된 플랫폼 조회 오류:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to get platform connections'
    });
  }
}));

// ============================================================================
// 🔌 플랫폼 연결 시작
// ============================================================================

router.post('/connect/:platform', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const { platform } = req.params;
  const { credentials, settings = {} } = req.body;
  const user = (req as any).user;

  if (!SUPPORTED_PLATFORMS[platform as keyof typeof SUPPORTED_PLATFORMS]) {
    return res.status(400).json({
      success: false,
      error: 'Unsupported platform',
      supportedPlatforms: Object.keys(SUPPORTED_PLATFORMS)
    });
  }

  try {
    console.log(`🔌 플랫폼 연결 시작 - 사용자: ${user.id}, 플랫폼: ${platform}`);

    const platformInfo = SUPPORTED_PLATFORMS[platform as keyof typeof SUPPORTED_PLATFORMS];

    // 자격증명 암호화
    let encryptedCredentials = null;
    if (credentials) {
      encryptedCredentials = await cryptoService.encryptSensitiveData(
        JSON.stringify(credentials),
        user.id
      );
    }

    // 기존 연결 확인
    const existingConnection = await databaseService.getPlatformConnection(user.id, platform);
    
    if (existingConnection) {
      // 기존 연결 업데이트
      await databaseService.updatePlatformConnection(existingConnection.id, {
        encrypted_credentials: encryptedCredentials,
        sync_settings: settings,
        connection_status: 'connected',
        is_connected: true,
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      console.log(`✅ 플랫폼 연결 업데이트 완료 - ${platform}`);
    } else {
      // 새 연결 생성
      const connectionData = {
        id: uuidv4(),
        user_id: user.id,
        user_did: user.did,
        platform_name: platform,
        platform_type: platformInfo.authType,
        encrypted_credentials: encryptedCredentials,
        connection_status: 'connected',
        is_connected: true,
        sync_settings: {
          autoSync: settings.autoSync !== false,
          syncFrequency: settings.syncFrequency || 'daily',
          dataTypes: settings.dataTypes || platformInfo.dataTypes,
          ...settings
        },
        metadata: {
          platformInfo: platformInfo,
          userAgent: req.get('User-Agent'),
          ip: req.ip
        },
        connected_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      };

      await databaseService.createPlatformConnection(connectionData);
      console.log(`✅ 새 플랫폼 연결 생성 완료 - ${platform}`);
    }

    // 초기 데이터 동기화 시작 (백그라운드)
    setImmediate(async () => {
      try {
        await this.startInitialSync(user.id, platform, credentials);
      } catch (error) {
        console.error('초기 동기화 오류:', error);
      }
    });

    res.json({
      success: true,
      platform: platform,
      platformInfo: platformInfo,
      status: 'connected',
      message: `${platformInfo.name} 연결이 성공적으로 완료되었습니다.`,
      syncStarted: true,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ 플랫폼 연결 오류:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to connect platform',
      platform: platform
    });
  }
}));

// ============================================================================
// 🔄 데이터 동기화 실행
// ============================================================================

router.post('/sync/:platform', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const { platform } = req.params;
  const { force = false } = req.body;
  const user = (req as any).user;

  try {
    console.log(`🔄 데이터 동기화 시작 - 사용자: ${user.id}, 플랫폼: ${platform}`);

    const connection = await databaseService.getPlatformConnection(user.id, platform);
    if (!connection || !connection.is_connected) {
      return res.status(400).json({
        success: false,
        error: 'Platform not connected',
        platform: platform
      });
    }

    // 마지막 동기화 시간 확인 (강제가 아닌 경우)
    if (!force && connection.last_sync_at) {
      const lastSync = new Date(connection.last_sync_at);
      const hoursSinceSync = (Date.now() - lastSync.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceSync < 1) { // 1시간 이내면 스킵
        return res.json({
          success: true,
          skipped: true,
          message: '최근에 동기화되었습니다.',
          lastSync: connection.last_sync_at
        });
      }
    }

    // 동기화 실행 (백그라운드)
    const syncId = uuidv4();
    setImmediate(async () => {
      try {
        await this.performPlatformSync(user.id, platform, connection, syncId);
      } catch (error) {
        console.error('동기화 실행 오류:', error);
      }
    });

    res.json({
      success: true,
      platform: platform,
      syncId: syncId,
      status: 'started',
      message: '데이터 동기화가 시작되었습니다.',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ 데이터 동기화 오류:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to start sync',
      platform: platform
    });
  }
}));

// ============================================================================
// 📊 동기화 상태 조회
// ============================================================================

router.get('/sync/:platform/status', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const { platform } = req.params;
  const user = (req as any).user;

  try {
    const connection = await databaseService.getPlatformConnection(user.id, platform);
    if (!connection) {
      return res.status(404).json({
        success: false,
        error: 'Platform connection not found'
      });
    }

    const syncLogs = await databaseService.getPlatformSyncLogs(connection.id, 5);

    res.json({
      success: true,
      platform: platform,
      connection: {
        status: connection.connection_status,
        isConnected: connection.is_connected,
        lastSync: connection.last_sync_at,
        dataPoints: connection.data_points_count || 0
      },
      recentSyncs: syncLogs.map(log => ({
        id: log.id,
        status: log.sync_status,
        startedAt: log.started_at,
        completedAt: log.completed_at,
        recordsProcessed: log.records_processed || 0,
        errors: log.error_count || 0,
        message: log.status_message
      })),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ 동기화 상태 조회 오류:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to get sync status'
    });
  }
}));

// ============================================================================
// 🔌 플랫폼 연결 해제
// ============================================================================

router.delete('/disconnect/:platform', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const { platform } = req.params;
  const { deleteData = false } = req.body;
  const user = (req as any).user;

  try {
    console.log(`🔌 플랫폼 연결 해제 - 사용자: ${user.id}, 플랫폼: ${platform}`);

    const connection = await databaseService.getPlatformConnection(user.id, platform);
    if (!connection) {
      return res.status(404).json({
        success: false,
        error: 'Platform connection not found'
      });
    }

    // 연결 상태 업데이트
    await databaseService.updatePlatformConnection(connection.id, {
      is_connected: false,
      connection_status: 'disconnected',
      encrypted_credentials: null,
      disconnected_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    // 데이터 삭제 요청된 경우
    if (deleteData) {
      await databaseService.deletePlatformData(user.id, platform);
      console.log(`🗑️ ${platform} 데이터 삭제 완료`);
    }

    console.log(`✅ 플랫폼 연결 해제 완료 - ${platform}`);

    res.json({
      success: true,
      platform: platform,
      disconnected: true,
      dataDeleted: deleteData,
      message: `${SUPPORTED_PLATFORMS[platform as keyof typeof SUPPORTED_PLATFORMS]?.name || platform} 연결이 해제되었습니다.`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ 플랫폼 연결 해제 오류:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to disconnect platform'
    });
  }
}));

// ============================================================================
// 📈 플랫폼 데이터 통계
// ============================================================================

router.get('/:platform/stats', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const { platform } = req.params;
  const user = (req as any).user;

  try {
    const connection = await databaseService.getPlatformConnection(user.id, platform);
    if (!connection || !connection.is_connected) {
      return res.status(400).json({
        success: false,
        error: 'Platform not connected'
      });
    }

    const stats = await databaseService.getPlatformDataStats(user.id, platform);

    res.json({
      success: true,
      platform: platform,
      stats: {
        totalRecords: stats.totalRecords || 0,
        lastSync: connection.last_sync_at,
        dataTypes: stats.dataTypes || [],
        syncFrequency: connection.sync_settings?.syncFrequency || 'manual',
        errorRate: stats.errorRate || 0,
        averageSyncTime: stats.averageSyncTime || 0,
        dataQuality: stats.dataQuality || 0.9
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ 플랫폼 통계 조회 오류:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to get platform stats'
    });
  }
}));

// ============================================================================
// 🔧 프라이빗 헬퍼 메서드들
// ============================================================================

async function startInitialSync(userId: string, platform: string, credentials: any): Promise<void> {
  console.log(`🔄 초기 동기화 시작 - 플랫폼: ${platform}`);
  
  try {
    // 플랫폼별 초기 동기화 로직
    switch (platform) {
      case 'chatgpt':
        await syncChatGPTData(userId, credentials);
        break;
      case 'claude':
        await syncClaudeData(userId, credentials);
        break;
      case 'discord':
        await syncDiscordData(userId, credentials);
        break;
      default:
        console.log(`⚠️ ${platform} 초기 동기화 로직 미구현`);
    }
    
    console.log(`✅ 초기 동기화 완료 - 플랫폼: ${platform}`);
  } catch (error) {
    console.error(`❌ 초기 동기화 실패 - 플랫폼: ${platform}`, error);
  }
}

async function performPlatformSync(
  userId: string, 
  platform: string, 
  connection: any, 
  syncId: string
): Promise<void> {
  console.log(`🔄 플랫폼 동기화 실행 - ID: ${syncId}`);
  
  const startTime = Date.now();
  let recordsProcessed = 0;
  let errors = 0;
  
  try {
    // 동기화 로그 시작
    await databaseService.createSyncLog({
      id: syncId,
      platform_connection_id: connection.id,
      sync_status: 'running',
      started_at: new Date().toISOString()
    });

    // 자격증명 복호화
    const credentials = connection.encrypted_credentials ? 
      JSON.parse(await cryptoService.decryptSensitiveData(
        connection.encrypted_credentials, 
        userId
      )) : null;

    // 플랫폼별 동기화 실행
    const syncResult = await executePlatformSync(platform, credentials, connection.sync_settings);
    recordsProcessed = syncResult.recordsProcessed;
    errors = syncResult.errors;

    // 동기화 완료 로깅
    await databaseService.updateSyncLog(syncId, {
      sync_status: 'completed',
      completed_at: new Date().toISOString(),
      records_processed: recordsProcessed,
      error_count: errors,
      status_message: `성공적으로 ${recordsProcessed}개 레코드 처리`
    });

    // 연결 정보 업데이트
    await databaseService.updatePlatformConnection(connection.id, {
      last_sync_at: new Date().toISOString(),
      data_points_count: (connection.data_points_count || 0) + recordsProcessed
    });

    console.log(`✅ 플랫폼 동기화 완료 - ${recordsProcessed}개 레코드 처리`);

  } catch (error) {
    console.error('❌ 플랫폼 동기화 실패:', error);
    
    // 실패 로깅
    await databaseService.updateSyncLog(syncId, {
      sync_status: 'failed',
      completed_at: new Date().toISOString(),
      records_processed: recordsProcessed,
      error_count: errors + 1,
      status_message: `동기화 실패: ${error.message}`
    });
  }
}

// 플랫폼별 동기화 함수들 (Mock 구현)
async function syncChatGPTData(userId: string, credentials: any): Promise<void> {
  console.log('🤖 ChatGPT 데이터 동기화 (Mock)');
  // TODO: 실제 ChatGPT API 연동 구현
}

async function syncClaudeData(userId: string, credentials: any): Promise<void> {
  console.log('🧠 Claude 데이터 동기화 (Mock)');
  // TODO: 실제 Claude API 연동 구현
}

async function syncDiscordData(userId: string, credentials: any): Promise<void> {
  console.log('💬 Discord 데이터 동기화 (Mock)');
  // TODO: 실제 Discord API 연동 구현
}

async function executePlatformSync(
  platform: string, 
  credentials: any, 
  settings: any
): Promise<{ recordsProcessed: number; errors: number }> {
  // Mock 구현
  const recordsProcessed = Math.floor(Math.random() * 100) + 10;
  const errors = Math.floor(Math.random() * 3);
  
  // 실제 동기화 시뮬레이션 (시간 지연)
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  return { recordsProcessed, errors };
}

export default router;