// ============================================================================
// 📁 backend/src/routes/platform/index.ts
// 🌐 플랫폼 연동 관련 라우트 (DI 컨테이너 연동, 문자열 리터럴 문제 수정)
// ============================================================================

import { Router, Request, Response } from 'express';
import { DIContainer } from '../../core/DIContainer';

/**
 * 플랫폼 라우트 클래스 (DI 패턴 적용)
 */
export class PlatformRoutes {
  private router: Router;
  private container: DIContainer;

  constructor(container: DIContainer) {
    this.router = Router();
    this.container = container;
    this.setupRoutes();
  }

  /**
   * 라우트 설정
   */
  private setupRoutes(): void {
    console.log('🔧 Platform Routes 설정 시작...');

    // 지원하는 플랫폼 목록
    this.router.get('/supported', this.getSupportedPlatforms.bind(this));
    
    // 플랫폼 연결
    this.router.post('/:platformName/connect', this.connectPlatform.bind(this));
    
    // 플랫폼 연결 해제
    this.router.post('/:platformName/disconnect', this.disconnectPlatform.bind(this));
    
    // 플랫폼 데이터 동기화
    this.router.post('/:platformName/sync', this.syncPlatformData.bind(this));
    
    // 플랫폼 연결 상태 확인
    this.router.get('/:platformName/status', this.getPlatformStatus.bind(this));
    
    // OAuth 콜백 처리
    this.router.get('/:platformName/oauth/callback', this.handleOAuthCallback.bind(this));
    
    // 플랫폼별 설정 업데이트
    this.router.put('/:platformName/settings', this.updatePlatformSettings.bind(this));
    
    // 플랫폼 데이터 통계
    this.router.get('/:platformName/stats', this.getPlatformStats.bind(this));

    console.log('✅ Platform Routes 설정 완료');
  }

  /**
   * 지원하는 플랫폼 목록 조회
   */
  private async getSupportedPlatforms(req: Request, res: Response): Promise<void> {
    try {
      console.log('📋 지원 플랫폼 목록 조회 시작');

      const supportedPlatforms = [
        {
          name: 'claude',
          displayName: 'Claude (Anthropic)',
          type: 'ai_assistant',
          authMethod: 'api_key',
          status: 'active',
          capabilities: ['chat', 'analysis', 'coding'],
          description: 'Claude AI Assistant by Anthropic',
          icon: 'https://cdn.anthropic.com/claude-icon.png',
          color: '#FF6B35',
          supportedDataTypes: ['conversations', 'analysis_results', 'code_snippets']
        },
        {
          name: 'chatgpt',
          displayName: 'ChatGPT (OpenAI)',
          type: 'ai_assistant',
          authMethod: 'oauth',
          status: 'active',
          capabilities: ['chat', 'analysis', 'coding', 'image_generation'],
          description: 'ChatGPT AI Assistant by OpenAI',
          icon: 'https://openai.com/favicon.ico',
          color: '#00A67E',
          supportedDataTypes: ['conversations', 'generated_content', 'code_snippets']
        },
        {
          name: 'gemini',
          displayName: 'Gemini (Google)',
          type: 'ai_assistant',
          authMethod: 'api_key',
          status: 'active',
          capabilities: ['chat', 'analysis', 'multimodal'],
          description: 'Gemini AI Assistant by Google',
          icon: 'https://ai.google.dev/static/site-assets/images/share.png',
          color: '#4285F4',
          supportedDataTypes: ['conversations', 'multimodal_analysis']
        },
        {
          name: 'discord',
          displayName: 'Discord',
          type: 'communication',
          authMethod: 'oauth',
          status: 'active',
          capabilities: ['messages', 'voice', 'community'],
          description: 'Discord communication platform',
          icon: 'https://discord.com/assets/favicon.ico',
          color: '#5865F2',
          supportedDataTypes: ['messages', 'server_activity', 'voice_data']
        },
        {
          name: 'github',
          displayName: 'GitHub',
          type: 'development',
          authMethod: 'oauth',
          status: 'active',
          capabilities: ['repositories', 'commits', 'issues'],
          description: 'GitHub development platform',
          icon: 'https://github.com/favicon.ico',
          color: '#24292e',
          supportedDataTypes: ['code_commits', 'issues', 'pull_requests']
        },
        {
          name: 'notion',
          displayName: 'Notion',
          type: 'productivity',
          authMethod: 'oauth',
          status: 'beta',
          capabilities: ['notes', 'databases', 'collaboration'],
          description: 'Notion productivity workspace',
          icon: 'https://notion.so/favicon.ico',
          color: '#000000',
          supportedDataTypes: ['notes', 'databases', 'pages']
        }
      ];

      console.log('✅ 지원 플랫폼 목록 조회 성공:', { count: supportedPlatforms.length });

      res.json({
        success: true,
        data: supportedPlatforms,
        count: supportedPlatforms.length,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ 지원 플랫폼 목록 조회 실패:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get supported platforms',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 플랫폼 연결
   */
  private async connectPlatform(req: Request, res: Response): Promise<void> {
    try {
      console.log('🔗 플랫폼 연결 시작:', { platform: req.params.platformName, body: req.body });

      const { platformName } = req.params;
      const { userDid, credentials, settings } = req.body;
      const activeDB = this.container.get('ActiveDatabaseService');
      const cryptoService = this.container.get('CryptoService');

      // 필수 정보 검증
      if (!userDid || !credentials) {
        res.status(400).json({
          success: false,
          message: 'User DID and credentials are required',
          code: 'MISSING_REQUIRED_INFO'
        });
        return;
      }

      // 지원하는 플랫폼인지 확인
      const supportedPlatforms = ['claude', 'chatgpt', 'gemini', 'discord', 'github', 'notion'];
      if (!supportedPlatforms.includes(platformName)) {
        res.status(400).json({
          success: false,
          message: 'Unsupported platform',
          supportedPlatforms,
          code: 'UNSUPPORTED_PLATFORM'
        });
        return;
      }

      // 자격 증명 암호화
      const encryptedCredentials = await cryptoService.encrypt(JSON.stringify(credentials));

      // 플랫폼 연결 정보 저장/업데이트
      const connectionData = {
        user_did: userDid,
        platform_name: platformName,
        platform_type: this.getPlatformType(platformName),
        encrypted_credentials: encryptedCredentials,
        connection_status: 'connected',
        is_connected: true,
        sync_settings: JSON.stringify(settings || {
          autoSync: true,
          syncFrequency: 'daily',
          dataTypes: ['all']
        }),
        connected_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // 기존 연결 확인
      const existingConnection = await activeDB.query(
        'SELECT id FROM connected_platforms WHERE user_did = $1 AND platform_name = $2',
        [userDid, platformName]
      );

      let result;
      if (existingConnection.rows.length > 0) {
        // 기존 연결 업데이트
        result = await activeDB.query(`
          UPDATE connected_platforms 
          SET 
            encrypted_credentials = $3,
            connection_status = $4,
            is_connected = $5,
            sync_settings = $6,
            connected_at = $7,
            updated_at = $8
          WHERE user_did = $1 AND platform_name = $2
          RETURNING *
        `, [
          userDid, platformName, encryptedCredentials, 'connected', 
          true, connectionData.sync_settings, connectionData.connected_at, connectionData.updated_at
        ]);
      } else {
        // 새 연결 생성
        result = await activeDB.query(`
          INSERT INTO connected_platforms (
            user_did, platform_name, platform_type, encrypted_credentials,
            connection_status, is_connected, sync_settings, connected_at, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING *
        `, [
          connectionData.user_did, connectionData.platform_name, connectionData.platform_type,
          connectionData.encrypted_credentials, connectionData.connection_status, connectionData.is_connected,
          connectionData.sync_settings, connectionData.connected_at, connectionData.created_at, connectionData.updated_at
        ]);
      }

      // 연결 성공 시 초기 동기화 트리거 (백그라운드에서 실행)
      this.triggerInitialSync(userDid, platformName).catch(error => {
        console.error('⚠️ 초기 동기화 실패:', error);
      });

      console.log('✅ 플랫폼 연결 성공:', { userDid, platformName, id: result.rows[0].id });

      res.json({
        success: true,
        data: {
          connection: result.rows[0],
          message: 'Platform connected successfully'
        }
      });

    } catch (error) {
      console.error('❌ 플랫폼 연결 실패:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to connect platform',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 플랫폼 연결 해제
   */
  private async disconnectPlatform(req: Request, res: Response): Promise<void> {
    try {
      console.log('🔌 플랫폼 연결 해제 시작:', { platform: req.params.platformName, body: req.body });

      const { platformName } = req.params;
      const { userDid } = req.body;
      const activeDB = this.container.get('ActiveDatabaseService');

      // 필수 정보 검증
      if (!userDid) {
        res.status(400).json({
          success: false,
          message: 'User DID is required',
          code: 'MISSING_USER_DID'
        });
        return;
      }

      // 연결 해제
      const result = await activeDB.query(`
        UPDATE connected_platforms 
        SET 
          connection_status = 'disconnected',
          is_connected = false,
          disconnected_at = $3,
          updated_at = $3
        WHERE user_did = $1 AND platform_name = $2
        RETURNING *
      `, [userDid, platformName, new Date().toISOString()]);

      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: 'Platform connection not found',
          code: 'CONNECTION_NOT_FOUND'
        });
        return;
      }

      console.log('✅ 플랫폼 연결 해제 성공:', { userDid, platformName });

      res.json({
        success: true,
        data: {
          connection: result.rows[0],
          message: 'Platform disconnected successfully'
        }
      });

    } catch (error) {
      console.error('❌ 플랫폼 연결 해제 실패:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to disconnect platform',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 플랫폼 데이터 동기화
   */
  private async syncPlatformData(req: Request, res: Response): Promise<void> {
    try {
      console.log('🔄 플랫폼 데이터 동기화 시작:', { platform: req.params.platformName, body: req.body });

      const { platformName } = req.params;
      const { userDid, syncType = 'incremental' } = req.body;
      const activeDB = this.container.get('ActiveDatabaseService');

      // 연결 상태 확인
      const connection = await activeDB.query(
        'SELECT * FROM connected_platforms WHERE user_did = $1 AND platform_name = $2 AND is_connected = true',
        [userDid, platformName]
      );

      if (connection.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: 'Platform not connected',
          code: 'PLATFORM_NOT_CONNECTED'
        });
        return;
      }

      // 동기화 로그 시작
      const syncLog = await activeDB.query(`
        INSERT INTO sync_logs (
          platform_connection_id, sync_status, started_at, metadata
        ) VALUES ($1, 'running', $2, $3)
        RETURNING *
      `, [
        connection.rows[0].id,
        new Date().toISOString(),
        JSON.stringify({ syncType, initiatedBy: 'user' })
      ]);

      // 백그라운드 동기화 실행
      this.performPlatformSync(userDid, platformName, syncType, syncLog.rows[0].id)
        .catch(error => {
          console.error('⚠️ 백그라운드 동기화 실패:', error);
        });

      console.log('✅ 플랫폼 데이터 동기화 시작됨:', { userDid, platformName, syncLogId: syncLog.rows[0].id });

      res.json({
        success: true,
        data: {
          syncId: syncLog.rows[0].id,
          status: 'started',
          message: 'Platform data sync initiated'
        }
      });

    } catch (error) {
      console.error('❌ 플랫폼 데이터 동기화 실패:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to sync platform data',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 플랫폼 연결 상태 확인
   */
  private async getPlatformStatus(req: Request, res: Response): Promise<void> {
    try {
      console.log('📊 플랫폼 상태 확인 시작:', req.params.platformName);

      const { platformName } = req.params;
      const { userDid } = req.query;
      const activeDB = this.container.get('ActiveDatabaseService');

      if (!userDid) {
        res.status(400).json({
          success: false,
          message: 'User DID is required',
          code: 'MISSING_USER_DID'
        });
        return;
      }

      // 연결 상태 조회
      const connection = await activeDB.query(`
        SELECT 
          *,
          CASE 
            WHEN last_sync_at IS NULL THEN 'never'
            WHEN last_sync_at < NOW() - INTERVAL '1 day' THEN 'outdated'
            WHEN last_sync_at < NOW() - INTERVAL '1 hour' THEN 'stale'
            ELSE 'fresh'
          END as sync_status
        FROM connected_platforms 
        WHERE user_did = $1 AND platform_name = $2
      `, [userDid, platformName]);

      if (connection.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: 'Platform connection not found',
          code: 'CONNECTION_NOT_FOUND'
        });
        return;
      }

      // 최근 동기화 로그
      const recentSyncs = await activeDB.query(`
        SELECT * FROM sync_logs 
        WHERE platform_connection_id = $1 
        ORDER BY started_at DESC 
        LIMIT 5
      `, [connection.rows[0].id]);

      console.log('✅ 플랫폼 상태 확인 성공:', { userDid, platformName, status: connection.rows[0].connection_status });

      res.json({
        success: true,
        data: {
          connection: connection.rows[0],
          recentSyncs: recentSyncs.rows,
          isHealthy: connection.rows[0].is_connected && connection.rows[0].connection_status === 'connected'
        }
      });

    } catch (error) {
      console.error('❌ 플랫폼 상태 확인 실패:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get platform status',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * OAuth 콜백 처리
   */
  private async handleOAuthCallback(req: Request, res: Response): Promise<void> {
    try {
      console.log('🔐 OAuth 콜백 처리 시작:', { platform: req.params.platformName, query: req.query });

      const { platformName } = req.params;
      const { code, state, error } = req.query;

      if (error) {
        console.error('❌ OAuth 에러:', error);
        res.redirect(`${process.env.FRONTEND_URL}/platforms/connect?error=${error}&platform=${platformName}`);
        return;
      }

      if (!code || !state) {
        res.status(400).json({
          success: false,
          message: 'Missing authorization code or state',
          code: 'MISSING_OAUTH_PARAMS'
        });
        return;
      }

      // OAuth 토큰 교환 로직 (플랫폼별 구현 필요)
      const tokenData = await this.exchangeOAuthToken(platformName, code as string, state as string);

      console.log('✅ OAuth 콜백 처리 성공:', { platformName, hasToken: !!tokenData });

      // 프론트엔드로 리다이렉트
      res.redirect(`${process.env.FRONTEND_URL}/platforms/connect?success=true&platform=${platformName}&token=${encodeURIComponent(JSON.stringify(tokenData))}`);

    } catch (error) {
      console.error('❌ OAuth 콜백 처리 실패:', error);
      res.redirect(`${process.env.FRONTEND_URL}/platforms/connect?error=oauth_failed&platform=${req.params.platformName}`);
    }
  }

  /**
   * 플랫폼별 설정 업데이트
   */
  private async updatePlatformSettings(req: Request, res: Response): Promise<void> {
    try {
      console.log('⚙️ 플랫폼 설정 업데이트 시작:', { platform: req.params.platformName, body: req.body });

      const { platformName } = req.params;
      const { userDid, settings } = req.body;
      const activeDB = this.container.get('ActiveDatabaseService');

      const result = await activeDB.query(`
        UPDATE connected_platforms 
        SET 
          sync_settings = $3,
          updated_at = $4
        WHERE user_did = $1 AND platform_name = $2
        RETURNING *
      `, [userDid, platformName, JSON.stringify(settings), new Date().toISOString()]);

      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: 'Platform connection not found',
          code: 'CONNECTION_NOT_FOUND'
        });
        return;
      }

      console.log('✅ 플랫폼 설정 업데이트 성공:', { userDid, platformName });

      res.json({
        success: true,
        data: result.rows[0],
        message: 'Platform settings updated successfully'
      });

    } catch (error) {
      console.error('❌ 플랫폼 설정 업데이트 실패:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update platform settings',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 플랫폼 데이터 통계
   */
  private async getPlatformStats(req: Request, res: Response): Promise<void> {
    try {
      console.log('📈 플랫폼 통계 조회 시작:', req.params.platformName);

      const { platformName } = req.params;
      const { userDid } = req.query;
      const activeDB = this.container.get('ActiveDatabaseService');

      if (!userDid) {
        res.status(400).json({
          success: false,
          message: 'User DID is required',
          code: 'MISSING_USER_DID'
        });
        return;
      }

      // 기본 통계
      const connection = await activeDB.query(
        'SELECT * FROM connected_platforms WHERE user_did = $1 AND platform_name = $2',
        [userDid, platformName]
      );

      if (connection.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: 'Platform connection not found',
          code: 'CONNECTION_NOT_FOUND'
        });
        return;
      }

      // 동기화 통계
      const syncStats = await activeDB.query(`
        SELECT 
          COUNT(*) as total_syncs,
          COUNT(CASE WHEN sync_status = 'completed' THEN 1 END) as successful_syncs,
          COUNT(CASE WHEN sync_status = 'failed' THEN 1 END) as failed_syncs,
          AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_sync_duration,
          MAX(completed_at) as last_successful_sync
        FROM sync_logs 
        WHERE platform_connection_id = $1
      `, [connection.rows[0].id]);

      // 데이터 포인트 통계
      const dataStats = await activeDB.query(`
        SELECT 
          COUNT(*) as total_data_points,
          COUNT(DISTINCT data_type) as unique_data_types,
          MAX(created_at) as last_data_sync
        FROM platform_data 
        WHERE platform_connection_id = $1
      `, [connection.rows[0].id]);

      console.log('✅ 플랫폼 통계 조회 성공:', { userDid, platformName });

      res.json({
        success: true,
        data: {
          connection: connection.rows[0],
          syncStats: syncStats.rows[0],
          dataStats: dataStats.rows[0],
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('❌ 플랫폼 통계 조회 실패:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get platform stats',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // ============================================================================
  // 🔧 헬퍼 메서드들
  // ============================================================================

  /**
   * 플랫폼 타입 결정
   */
  private getPlatformType(platformName: string): string {
    const platformTypes: Record<string, string> = {
      'claude': 'ai_assistant',
      'chatgpt': 'ai_assistant',
      'gemini': 'ai_assistant',
      'discord': 'communication',
      'github': 'development',
      'notion': 'productivity'
    };

    return platformTypes[platformName] || 'unknown';
  }

  /**
   * 초기 동기화 트리거 (백그라운드)
   */
  private async triggerInitialSync(userDid: string, platformName: string): Promise<void> {
    try {
      console.log('🔄 초기 동기화 트리거:', { userDid, platformName });
      
      // 실제 동기화 로직은 각 플랫폼별로 구현
      await new Promise(resolve => setTimeout(resolve, 1000)); // 임시 지연
      
      console.log('✅ 초기 동기화 완료:', { userDid, platformName });
    } catch (error) {
      console.error('❌ 초기 동기화 실패:', error);
      throw error;
    }
  }

  /**
   * 플랫폼 동기화 실행 (백그라운드)
   */
  private async performPlatformSync(userDid: string, platformName: string, syncType: string, syncLogId: string): Promise<void> {
    const activeDB = this.container.get('ActiveDatabaseService');

    try {
      console.log('🔄 플랫폼 동기화 실행:', { userDid, platformName, syncType, syncLogId });

      // 실제 동기화 로직은 각 플랫폼별로 구현
      await new Promise(resolve => setTimeout(resolve, 2000)); // 임시 지연

      // 동기화 완료 로그 업데이트
      await activeDB.query(`
        UPDATE sync_logs 
        SET 
          sync_status = 'completed',
          completed_at = $2,
          records_processed = $3,
          status_message = 'Sync completed successfully'
        WHERE id = $1
      `, [syncLogId, new Date().toISOString(), 100]); // 임시 레코드 수

      console.log('✅ 플랫폼 동기화 완료:', { userDid, platformName, syncLogId });

    } catch (error) {
      console.error('❌ 플랫폼 동기화 실패:', error);

      // 실패 로그 업데이트
      await activeDB.query(`
        UPDATE sync_logs 
        SET 
          sync_status = 'failed',
          completed_at = $2,
          error_count = 1,
          status_message = $3
        WHERE id = $1
      `, [syncLogId, new Date().toISOString(), error instanceof Error ? error.message : 'Unknown error']);

      throw error;
    }
  }

  /**
   * OAuth 토큰 교환 (플랫폼별 구현 필요)
   */
  private async exchangeOAuthToken(platformName: string, code: string, state: string): Promise<any> {
    console.log('🔑 OAuth 토큰 교환:', { platformName, code: code.substring(0, 10) + '...', state });

    // 실제 OAuth 토큰 교환 로직은 각 플랫폼별로 구현
    // 현재는 임시 응답 반환
    return {
      access_token: 'temp_access_token_' + Date.now(),
      refresh_token: 'temp_refresh_token_' + Date.now(),
      expires_in: 3600,
      platform: platformName
    };
  }

  /**
   * 라우터 반환
   */
  public getRouter(): Router {
    return this.router;
  }
}

/**
 * DI Container와 호환되는 팩토리 함수
 */
export default function createPlatformRoutes(container: DIContainer): Router {
  console.log('🏭 Platform Routes 팩토리 함수 실행');
  const platformRoutes = new PlatformRoutes(container);
  return platformRoutes.getRouter();
}