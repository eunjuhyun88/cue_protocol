// ============================================================================
// 📁 backend/src/routes/cue/cue.ts
// 💰 CUE 토큰 관련 라우트 (DI 컨테이너 연동, 중복 제거 완료)
// ============================================================================

import { Router, Request, Response } from 'express';
import { DIContainer } from '../../core/DIContainer';

/**
 * CUE 라우트 클래스 (DI 패턴 적용)
 */
export class CUERoutes {
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
    console.log('🔧 CUE Routes 설정 시작...');

    // CUE 잔액 조회
    this.router.get('/balance/:did', this.getCUEBalance.bind(this));
    
    // CUE 거래 내역
    this.router.get('/transactions/:did', this.getCUETransactions.bind(this));
    
    // CUE 전송
    this.router.post('/transfer', this.transferCUE.bind(this));
    
    // CUE 스테이킹
    this.router.post('/stake', this.stakeCUE.bind(this));
    
    // CUE 언스테이킹
    this.router.post('/unstake', this.unstakeCUE.bind(this));
    
    // 사용자 CUE 통계
    this.router.get('/stats/:did', this.getCUEStats.bind(this));

    console.log('✅ CUE Routes 설정 완료');
  }

  /**
   * CUE 잔액 조회
   */
  private async getCUEBalance(req: Request, res: Response): Promise<void> {
    try {
      console.log('💰 CUE 잔액 조회 시작:', req.params.did);
      
      const { did } = req.params;
      const cueService = this.container.get('CueService');
      const activeDB = this.container.get('ActiveDatabaseService');

      // DID 유효성 검증
      if (!did || typeof did !== 'string') {
        res.status(400).json({
          success: false,
          message: 'Invalid DID provided',
          code: 'INVALID_DID'
        });
        return;
      }

      // 잔액 조회
      const balance = await cueService.getUserBalance(did);
      
      // 추가 통계 정보
      const additionalStats = await activeDB.query(`
        SELECT 
          COUNT(*) as total_transactions,
          SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as total_earned,
          SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as total_spent,
          MAX(created_at) as last_transaction
        FROM cue_transactions 
        WHERE user_did = $1
      `, [did]);

      console.log('✅ CUE 잔액 조회 성공:', { did, balance });

      res.json({
        success: true,
        data: {
          did,
          balance: balance || 0,
          stats: additionalStats?.rows[0] || null,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('❌ CUE 잔액 조회 실패:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get CUE balance',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * CUE 거래 내역 조회
   */
  private async getCUETransactions(req: Request, res: Response): Promise<void> {
    try {
      console.log('📊 CUE 거래 내역 조회 시작:', req.params.did);
      
      const { did } = req.params;
      const { page = 1, limit = 20, type = 'all' } = req.query;
      const activeDB = this.container.get('ActiveDatabaseService');

      // 페이지네이션 계산
      const offset = (Number(page) - 1) * Number(limit);

      // 타입별 필터링
      let typeFilter = '';
      const params: any[] = [did, Number(limit), offset];

      if (type !== 'all') {
        typeFilter = 'AND transaction_type = $4';
        params.push(type);
      }

      // 거래 내역 조회
      const query = `
        SELECT 
          id,
          transaction_type,
          amount,
          source_type,
          source_id,
          description,
          metadata,
          created_at
        FROM cue_transactions 
        WHERE user_did = $1
        ${typeFilter}
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `;

      const transactions = await activeDB.query(query, params);

      // 총 개수 조회
      const countQuery = `
        SELECT COUNT(*) as total
        FROM cue_transactions 
        WHERE user_did = $1 ${typeFilter}
      `;
      const countParams = type !== 'all' ? [did, type] : [did];
      const totalCount = await activeDB.query(countQuery, countParams);

      console.log('✅ CUE 거래 내역 조회 성공:', { 
        did, 
        count: transactions.rows.length,
        total: totalCount.rows[0]?.total 
      });

      res.json({
        success: true,
        data: {
          transactions: transactions.rows,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total: Number(totalCount.rows[0]?.total || 0),
            totalPages: Math.ceil(Number(totalCount.rows[0]?.total || 0) / Number(limit))
          }
        }
      });

    } catch (error) {
      console.error('❌ CUE 거래 내역 조회 실패:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get CUE transactions',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * CUE 전송
   */
  private async transferCUE(req: Request, res: Response): Promise<void> {
    try {
      console.log('💸 CUE 전송 시작:', req.body);
      
      const { fromDid, toDid, amount, description = 'CUE Transfer' } = req.body;
      const cueService = this.container.get('CueService');

      // 입력값 검증
      if (!fromDid || !toDid || !amount || amount <= 0) {
        res.status(400).json({
          success: false,
          message: 'Invalid transfer parameters',
          code: 'INVALID_PARAMS'
        });
        return;
      }

      // CUE 전송 실행
      const transferResult = await cueService.transferCUE({
        fromDid,
        toDid,
        amount: Number(amount),
        description,
        metadata: {
          timestamp: new Date().toISOString(),
          ip: req.ip,
          userAgent: req.get('User-Agent')
        }
      });

      console.log('✅ CUE 전송 성공:', transferResult);

      res.json({
        success: true,
        data: transferResult,
        message: 'CUE transferred successfully'
      });

    } catch (error) {
      console.error('❌ CUE 전송 실패:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to transfer CUE',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * CUE 스테이킹
   */
  private async stakeCUE(req: Request, res: Response): Promise<void> {
    try {
      console.log('🔒 CUE 스테이킹 시작:', req.body);
      
      const { userDid, amount, duration = 30 } = req.body;
      const cueService = this.container.get('CueService');

      // 입력값 검증
      if (!userDid || !amount || amount <= 0) {
        res.status(400).json({
          success: false,
          message: 'Invalid staking parameters',
          code: 'INVALID_PARAMS'
        });
        return;
      }

      // 스테이킹 실행
      const stakingResult = await cueService.stakeCUE({
        userDid,
        amount: Number(amount),
        duration: Number(duration),
        metadata: {
          timestamp: new Date().toISOString(),
          ip: req.ip
        }
      });

      console.log('✅ CUE 스테이킹 성공:', stakingResult);

      res.json({
        success: true,
        data: stakingResult,
        message: 'CUE staked successfully'
      });

    } catch (error) {
      console.error('❌ CUE 스테이킹 실패:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to stake CUE',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * CUE 언스테이킹
   */
  private async unstakeCUE(req: Request, res: Response): Promise<void> {
    try {
      console.log('🔓 CUE 언스테이킹 시작:', req.body);
      
      const { userDid, stakingId } = req.body;
      const cueService = this.container.get('CueService');

      // 입력값 검증
      if (!userDid || !stakingId) {
        res.status(400).json({
          success: false,
          message: 'Invalid unstaking parameters',
          code: 'INVALID_PARAMS'
        });
        return;
      }

      // 언스테이킹 실행
      const unstakingResult = await cueService.unstakeCUE({
        userDid,
        stakingId,
        metadata: {
          timestamp: new Date().toISOString(),
          ip: req.ip
        }
      });

      console.log('✅ CUE 언스테이킹 성공:', unstakingResult);

      res.json({
        success: true,
        data: unstakingResult,
        message: 'CUE unstaked successfully'
      });

    } catch (error) {
      console.error('❌ CUE 언스테이킹 실패:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to unstake CUE',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * CUE 통계 조회
   */
  private async getCUEStats(req: Request, res: Response): Promise<void> {
    try {
      console.log('📈 CUE 통계 조회 시작:', req.params.did);
      
      const { did } = req.params;
      const cueService = this.container.get('CueService');
      const activeDB = this.container.get('ActiveDatabaseService');

      // 기본 통계
      const basicStats = await cueService.getUserStats(did);

      // 상세 통계 쿼리
      const detailedStats = await activeDB.query(`
        SELECT 
          COUNT(*) as total_transactions,
          SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as total_earned,
          SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as total_spent,
          AVG(amount) as avg_transaction,
          COUNT(DISTINCT DATE(created_at)) as active_days,
          MAX(created_at) as last_activity,
          MIN(created_at) as first_activity
        FROM cue_transactions 
        WHERE user_did = $1
      `, [did]);

      // 카테고리별 통계
      const categoryStats = await activeDB.query(`
        SELECT 
          transaction_type,
          COUNT(*) as count,
          SUM(amount) as total_amount,
          AVG(amount) as avg_amount
        FROM cue_transactions 
        WHERE user_did = $1 
        GROUP BY transaction_type
        ORDER BY total_amount DESC
      `, [did]);

      console.log('✅ CUE 통계 조회 성공:', { did, basicStats });

      res.json({
        success: true,
        data: {
          basic: basicStats,
          detailed: detailedStats.rows[0],
          categories: categoryStats.rows,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('❌ CUE 통계 조회 실패:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get CUE stats',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
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
export default function createCUERoutes(container: DIContainer): Router {
  console.log('🏭 CUE Routes 팩토리 함수 실행');
  const cueRoutes = new CUERoutes(container);
  return cueRoutes.getRouter();
}