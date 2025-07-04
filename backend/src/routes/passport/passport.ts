// ============================================================================
// 📁 backend/src/routes/passport/passport.ts
// 🎫 AI Passport 관련 라우트 (DI 컨테이너 연동, 중복 제거 완료)
// ============================================================================

import { Router, Request, Response } from 'express';
import { DIContainer } from '../../core/DIContainer';

/**
 * AI Passport 라우트 클래스 (DI 패턴 적용)
 */
export class PassportRoutes {
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
    console.log('🔧 Passport Routes 설정 시작...');

    // AI Passport 생성
    this.router.post('/create', this.createPassport.bind(this));
    
    // AI Passport 조회
    this.router.get('/:did', this.getPassport.bind(this));
    
    // AI Passport 업데이트
    this.router.put('/:did', this.updatePassport.bind(this));
    
    // 플랫폼 연결
    this.router.post('/:did/platforms/connect', this.connectPlatform.bind(this));
    
    // 플랫폼 연결 해제
    this.router.delete('/:did/platforms/:platformId', this.disconnectPlatform.bind(this));
    
    // 연결된 플랫폼 목록
    this.router.get('/:did/platforms', this.getConnectedPlatforms.bind(this));
    
    // 데이터 볼트 목록
    this.router.get('/:did/vaults', this.getDataVaults.bind(this));
    
    // 개인화 프로필 업데이트
    this.router.put('/:did/profile', this.updatePersonalizationProfile.bind(this));
    
    // Trust Score 조회
    this.router.get('/:did/trust-score', this.getTrustScore.bind(this));
    
    // AI Passport 내보내기
    this.router.get('/:did/export/:format', this.exportPassport.bind(this));

    console.log('✅ Passport Routes 설정 완료');
  }

  /**
   * AI Passport 생성
   */
  private async createPassport(req: Request, res: Response): Promise<void> {
    try {
      console.log('🎫 AI Passport 생성 시작:', req.body);
      
      const { userDid, username, email } = req.body;
      const activeDB = this.container.get('ActiveDatabaseService');
      const cueService = this.container.get('CueService');

      // 필수 정보 검증
      if (!userDid || !username) {
        res.status(400).json({
          success: false,
          message: 'DID and username are required',
          code: 'MISSING_REQUIRED_FIELDS'
        });
        return;
      }

      // 기존 Passport 확인
      const existingPassport = await activeDB.query(
        'SELECT id FROM ai_passports WHERE user_did = $1',
        [userDid]
      );

      if (existingPassport.rows.length > 0) {
        res.status(409).json({
          success: false,
          message: 'AI Passport already exists for this DID',
          code: 'PASSPORT_EXISTS'
        });
        return;
      }

      // 새 Passport 생성
      const passportData = {
        user_did: userDid,
        username,
        email: email || null,
        trust_score: 85.0, // 기본 trust score
        passport_level: 'Starter',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        personality_profile: {
          type: 'Unknown',
          traits: [],
          communicationStyle: 'Standard',
          expertise: [],
          mbtiType: 'XXXX',
          learningStyle: 'Mixed',
          workingStyle: 'Balanced',
          responsePreference: 'Detailed',
          decisionMaking: 'Analytical'
        },
        vault_settings: {
          encryption_enabled: true,
          auto_backup: true,
          sync_frequency: 'daily',
          privacy_level: 'standard'
        }
      };

      const result = await activeDB.query(`
        INSERT INTO ai_passports (
          user_did, username, email, trust_score, passport_level,
          personality_profile, vault_settings, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `, [
        passportData.user_did,
        passportData.username,
        passportData.email,
        passportData.trust_score,
        passportData.passport_level,
        JSON.stringify(passportData.personality_profile),
        JSON.stringify(passportData.vault_settings),
        passportData.created_at,
        passportData.updated_at
      ]);

      // 웰컴 CUE 지급
      const welcomeCUE = 1000;
      await cueService.awardCUE({
        userDid,
        amount: welcomeCUE,
        source: 'passport_creation',
        description: 'Welcome CUE for new AI Passport'
      });

      console.log('✅ AI Passport 생성 성공:', { userDid, id: result.rows[0].id });

      res.status(201).json({
        success: true,
        data: {
          passport: result.rows[0],
          welcomeCUE,
          message: 'AI Passport created successfully'
        }
      });

    } catch (error) {
      console.error('❌ AI Passport 생성 실패:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create AI Passport',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * AI Passport 조회
   */
  private async getPassport(req: Request, res: Response): Promise<void> {
    try {
      console.log('🔍 AI Passport 조회 시작:', req.params.did);
      
      const { did } = req.params;
      const activeDB = this.container.get('ActiveDatabaseService');
      const cueService = this.container.get('CueService');

      // Passport 정보 조회
      const passport = await activeDB.query(`
        SELECT 
          p.*,
          u.cue_tokens as current_cue_balance
        FROM ai_passports p
        LEFT JOIN users u ON p.user_did = u.did
        WHERE p.user_did = $1
      `, [did]);

      if (passport.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: 'AI Passport not found',
          code: 'PASSPORT_NOT_FOUND'
        });
        return;
      }

      const passportData = passport.rows[0];

      // 연결된 플랫폼 정보
      const platforms = await activeDB.query(`
        SELECT 
          platform_name,
          connection_status,
          is_connected,
          data_points_count,
          last_sync_at,
          created_at
        FROM connected_platforms 
        WHERE user_did = $1 AND is_connected = true
      `, [did]);

      // 데이터 볼트 정보
      const vaults = await activeDB.query(`
        SELECT 
          vault_name,
          vault_type,
          is_encrypted,
          compartment_count,
          total_size,
          last_accessed_at
        FROM data_vaults 
        WHERE user_did = $1
      `, [did]);

      // CUE 통계
      const cueStats = await cueService.getUserStats(did);

      console.log('✅ AI Passport 조회 성공:', { did, platforms: platforms.rows.length });

      res.json({
        success: true,
        data: {
          passport: passportData,
          connectedPlatforms: platforms.rows,
          dataVaults: vaults.rows,
          cueStats,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('❌ AI Passport 조회 실패:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get AI Passport',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * AI Passport 업데이트
   */
  private async updatePassport(req: Request, res: Response): Promise<void> {
    try {
      console.log('📝 AI Passport 업데이트 시작:', req.params.did);
      
      const { did } = req.params;
      const updateData = req.body;
      const activeDB = this.container.get('ActiveDatabaseService');

      // 허용된 필드만 업데이트
      const allowedFields = [
        'username', 'email', 'personality_profile', 
        'vault_settings', 'privacy_settings'
      ];

      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramCount = 1;

      Object.keys(updateData).forEach(key => {
        if (allowedFields.includes(key)) {
          updateFields.push(`${key} = $${paramCount}`);
          updateValues.push(
            typeof updateData[key] === 'object' 
              ? JSON.stringify(updateData[key]) 
              : updateData[key]
          );
          paramCount++;
        }
      });

      if (updateFields.length === 0) {
        res.status(400).json({
          success: false,
          message: 'No valid fields to update',
          code: 'NO_VALID_FIELDS'
        });
        return;
      }

      // updated_at 필드 추가
      updateFields.push(`updated_at = $${paramCount}`);
      updateValues.push(new Date().toISOString());
      updateValues.push(did); // WHERE 절용

      const query = `
        UPDATE ai_passports 
        SET ${updateFields.join(', ')}
        WHERE user_did = $${paramCount + 1}
        RETURNING *
      `;

      const result = await activeDB.query(query, updateValues);

      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: 'AI Passport not found',
          code: 'PASSPORT_NOT_FOUND'
        });
        return;
      }

      console.log('✅ AI Passport 업데이트 성공:', { did, fieldsUpdated: updateFields.length });

      res.json({
        success: true,
        data: result.rows[0],
        message: 'AI Passport updated successfully'
      });

    } catch (error) {
      console.error('❌ AI Passport 업데이트 실패:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update AI Passport',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 플랫폼 연결
   */
  private async connectPlatform(req: Request, res: Response): Promise<void> {
    try {
      console.log('🔗 플랫폼 연결 시작:', { did: req.params.did, body: req.body });
      
      const { did } = req.params;
      const { platformName, platformType, credentials, syncSettings } = req.body;
      const activeDB = this.container.get('ActiveDatabaseService');
      const cryptoService = this.container.get('CryptoService');

      // 필수 정보 검증
      if (!platformName || !platformType) {
        res.status(400).json({
          success: false,
          message: 'Platform name and type are required',
          code: 'MISSING_PLATFORM_INFO'
        });
        return;
      }

      // 기존 연결 확인
      const existing = await activeDB.query(
        'SELECT id FROM connected_platforms WHERE user_did = $1 AND platform_name = $2',
        [did, platformName]
      );

      let result;
      if (existing.rows.length > 0) {
        // 기존 연결 업데이트
        result = await activeDB.query(`
          UPDATE connected_platforms 
          SET 
            connection_status = 'connected',
            is_connected = true,
            encrypted_credentials = $3,
            sync_settings = $4,
            updated_at = $5
          WHERE user_did = $1 AND platform_name = $2
          RETURNING *
        `, [
          did, 
          platformName,
          credentials ? await cryptoService.encrypt(JSON.stringify(credentials)) : null,
          JSON.stringify(syncSettings || { autoSync: true, syncFrequency: 'daily' }),
          new Date().toISOString()
        ]);
      } else {
        // 새 연결 생성
        result = await activeDB.query(`
          INSERT INTO connected_platforms (
            user_did, platform_name, platform_type, connection_status,
            is_connected, encrypted_credentials, sync_settings, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING *
        `, [
          did,
          platformName,
          platformType,
          'connected',
          true,
          credentials ? await cryptoService.encrypt(JSON.stringify(credentials)) : null,
          JSON.stringify(syncSettings || { autoSync: true, syncFrequency: 'daily' }),
          new Date().toISOString(),
          new Date().toISOString()
        ]);
      }

      console.log('✅ 플랫폼 연결 성공:', { did, platformName });

      res.json({
        success: true,
        data: result.rows[0],
        message: 'Platform connected successfully'
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
      console.log('🔌 플랫폼 연결 해제 시작:', { did: req.params.did, platformId: req.params.platformId });
      
      const { did, platformId } = req.params;
      const activeDB = this.container.get('ActiveDatabaseService');

      const result = await activeDB.query(`
        UPDATE connected_platforms 
        SET 
          connection_status = 'disconnected',
          is_connected = false,
          disconnected_at = $3,
          updated_at = $3
        WHERE user_did = $1 AND id = $2
        RETURNING *
      `, [did, platformId, new Date().toISOString()]);

      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: 'Platform connection not found',
          code: 'CONNECTION_NOT_FOUND'
        });
        return;
      }

      console.log('✅ 플랫폼 연결 해제 성공:', { did, platformId });

      res.json({
        success: true,
        data: result.rows[0],
        message: 'Platform disconnected successfully'
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
   * 연결된 플랫폼 목록 조회
   */
  private async getConnectedPlatforms(req: Request, res: Response): Promise<void> {
    try {
      console.log('📋 연결된 플랫폼 목록 조회 시작:', req.params.did);
      
      const { did } = req.params;
      const activeDB = this.container.get('ActiveDatabaseService');

      const platforms = await activeDB.query(`
        SELECT 
          id,
          platform_name,
          platform_type,
          connection_status,
          is_connected,
          data_points_count,
          last_sync_at,
          connected_at,
          created_at,
          updated_at
        FROM connected_platforms 
        WHERE user_did = $1
        ORDER BY created_at DESC
      `, [did]);

      console.log('✅ 연결된 플랫폼 목록 조회 성공:', { did, count: platforms.rows.length });

      res.json({
        success: true,
        data: platforms.rows,
        count: platforms.rows.length
      });

    } catch (error) {
      console.error('❌ 연결된 플랫폼 목록 조회 실패:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get connected platforms',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 데이터 볼트 목록 조회
   */
  private async getDataVaults(req: Request, res: Response): Promise<void> {
    try {
      console.log('🗄️ 데이터 볼트 목록 조회 시작:', req.params.did);
      
      const { did } = req.params;
      const activeDB = this.container.get('ActiveDatabaseService');

      const vaults = await activeDB.query(`
        SELECT 
          id,
          vault_name,
          description,
          vault_type,
          is_encrypted,
          compartment_count,
          total_size,
          access_permissions,
          metadata,
          created_at,
          last_accessed_at
        FROM data_vaults 
        WHERE user_did = $1
        ORDER BY created_at DESC
      `, [did]);

      // 각 볼트의 상세 정보 가져오기
      const vaultsWithDetails = await Promise.all(
        vaults.rows.map(async (vault) => {
          const compartments = await activeDB.query(
            'SELECT COUNT(*) as count, SUM(COALESCE(CHAR_LENGTH(encrypted_content), 0)) as size FROM vault_data WHERE vault_id = $1',
            [vault.id]
          );

          return {
            ...vault,
            actualCompartmentCount: Number(compartments.rows[0]?.count || 0),
            actualSize: Number(compartments.rows[0]?.size || 0)
          };
        })
      );

      console.log('✅ 데이터 볼트 목록 조회 성공:', { did, count: vaults.rows.length });

      res.json({
        success: true,
        data: vaultsWithDetails,
        count: vaultsWithDetails.length
      });

    } catch (error) {
      console.error('❌ 데이터 볼트 목록 조회 실패:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get data vaults',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 개인화 프로필 업데이트
   */
  private async updatePersonalizationProfile(req: Request, res: Response): Promise<void> {
    try {
      console.log('👤 개인화 프로필 업데이트 시작:', req.params.did);
      
      const { did } = req.params;
      const profileData = req.body;
      const activeDB = this.container.get('ActiveDatabaseService');
      const personalizationService = this.container.get('PersonalizationService');

      // 개인화 프로필 업데이트
      const updatedProfile = await personalizationService.updateProfile(did, profileData);

      // AI Passport에 반영
      await activeDB.query(`
        UPDATE ai_passports 
        SET 
          personality_profile = $2,
          updated_at = $3
        WHERE user_did = $1
      `, [did, JSON.stringify(updatedProfile), new Date().toISOString()]);

      console.log('✅ 개인화 프로필 업데이트 성공:', { did });

      res.json({
        success: true,
        data: updatedProfile,
        message: 'Personalization profile updated successfully'
      });

    } catch (error) {
      console.error('❌ 개인화 프로필 업데이트 실패:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update personalization profile',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Trust Score 조회
   */
  private async getTrustScore(req: Request, res: Response): Promise<void> {
    try {
      console.log('🛡️ Trust Score 조회 시작:', req.params.did);
      
      const { did } = req.params;
      const activeDB = this.container.get('ActiveDatabaseService');

      // Trust Score 계산 로직
      const passport = await activeDB.query(
        'SELECT trust_score, created_at FROM ai_passports WHERE user_did = $1',
        [did]
      );

      if (passport.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: 'AI Passport not found',
          code: 'PASSPORT_NOT_FOUND'
        });
        return;
      }

      // Trust Score 히스토리
      const history = await activeDB.query(`
        SELECT 
          old_score,
          new_score,
          change_reason,
          created_at
        FROM trust_score_history 
        WHERE user_did = $1 
        ORDER BY created_at DESC 
        LIMIT 10
      `, [did]);

      console.log('✅ Trust Score 조회 성공:', { did, score: passport.rows[0].trust_score });

      res.json({
        success: true,
        data: {
          currentScore: passport.rows[0].trust_score,
          history: history.rows,
          lastUpdated: passport.rows[0].created_at
        }
      });

    } catch (error) {
      console.error('❌ Trust Score 조회 실패:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get trust score',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * AI Passport 내보내기
   */
  private async exportPassport(req: Request, res: Response): Promise<void> {
    try {
      console.log('📤 AI Passport 내보내기 시작:', { did: req.params.did, format: req.params.format });
      
      const { did, format } = req.params;
      const activeDB = this.container.get('ActiveDatabaseService');

      // 지원하는 형식 확인
      const supportedFormats = ['json', 'csv', 'pdf'];
      if (!supportedFormats.includes(format)) {
        res.status(400).json({
          success: false,
          message: 'Unsupported export format',
          supportedFormats,
          code: 'UNSUPPORTED_FORMAT'
        });
        return;
      }

      // 전체 Passport 데이터 수집
      const passportData = await this.getFullPassportData(did, activeDB);

      if (!passportData) {
        res.status(404).json({
          success: false,
          message: 'AI Passport not found',
          code: 'PASSPORT_NOT_FOUND'
        });
        return;
      }

      // 형식에 따른 내보내기
      let exportData: any;
      let contentType: string;
      let filename: string;

      switch (format) {
        case 'json':
          exportData = JSON.stringify(passportData, null, 2);
          contentType = 'application/json';
          filename = `ai-passport-${did}-${Date.now()}.json`;
          break;
        case 'csv':
          exportData = this.convertToCSV(passportData);
          contentType = 'text/csv';
          filename = `ai-passport-${did}-${Date.now()}.csv`;
          break;
        case 'pdf':
          // PDF 생성 로직 (추후 구현)
          exportData = 'PDF generation not implemented yet';
          contentType = 'application/pdf';
          filename = `ai-passport-${did}-${Date.now()}.pdf`;
          break;
      }

      console.log('✅ AI Passport 내보내기 성공:', { did, format, size: exportData.length });

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
      res.send(exportData);

    } catch (error) {
      console.error('❌ AI Passport 내보내기 실패:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to export AI Passport',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 전체 Passport 데이터 수집 (내부 메서드)
   */
  private async getFullPassportData(did: string, activeDB: any): Promise<any> {
    try {
      // 기본 Passport 정보
      const passport = await activeDB.query(
        'SELECT * FROM ai_passports WHERE user_did = $1',
        [did]
      );

      if (passport.rows.length === 0) {
        return null;
      }

      // 관련 데이터들
      const [platforms, vaults, cueTransactions] = await Promise.all([
        activeDB.query('SELECT * FROM connected_platforms WHERE user_did = $1', [did]),
        activeDB.query('SELECT * FROM data_vaults WHERE user_did = $1', [did]),
        activeDB.query('SELECT * FROM cue_transactions WHERE user_did = $1 ORDER BY created_at DESC LIMIT 100', [did])
      ]);

      return {
        passport: passport.rows[0],
        connectedPlatforms: platforms.rows,
        dataVaults: vaults.rows,
        recentCUETransactions: cueTransactions.rows,
        exportedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ 전체 Passport 데이터 수집 실패:', error);
      throw error;
    }
  }

  /**
   * CSV 변환 (내부 메서드)
   */
  private convertToCSV(data: any): string {
    // 간단한 CSV 변환 로직
    const lines = [
      'Field,Value',
      `DID,${data.passport.user_did}`,
      `Username,${data.passport.username}`,
      `Trust Score,${data.passport.trust_score}`,
      `Passport Level,${data.passport.passport_level}`,
      `Created At,${data.passport.created_at}`,
      `Connected Platforms,${data.connectedPlatforms.length}`,
      `Data Vaults,${data.dataVaults.length}`,
      `Recent Transactions,${data.recentCUETransactions.length}`,
      `Exported At,${data.exportedAt}`
    ];

    return lines.join('\n');
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
export default function createPassportRoutes(container: DIContainer): Router {
  console.log('🏭 Passport Routes 팩토리 함수 실행');
  const passportRoutes = new PassportRoutes(container);
  return passportRoutes.getRouter();
}