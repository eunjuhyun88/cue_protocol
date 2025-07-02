// ============================================================================
// 🚀 Final0626 완전히 리팩토링된 백엔드 서버 v4.0
// 구조: Clean Architecture + 모듈화 + 서비스 분리
// ============================================================================

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { Server } from 'http';

// ============================================================================
// 📁 라우트 임포트 (분리된 모듈들)
// ============================================================================
import authRoutes from './routes/auth/webauthn';
import aiRoutes from './routes/ai/chat';
import cueRoutes from './routes/cue/index';
import passportRoutes from './routes/passport/index';
import vaultRoutes from './routes/vault/index';
import platformRoutes from './routes/platform/index';

// ============================================================================
// 🔧 미들웨어 임포트 (분리된 미들웨어들)
// ============================================================================
import { errorHandler } from './middleware/errorHandler';
import { loggingMiddleware } from './middleware/loggingMiddleware';
import { authMiddleware } from './middleware/authMiddleware';

// ============================================================================
// 🗄️ 서비스 임포트 (비즈니스 로직 분리)
// ============================================================================
import { DatabaseService } from './services/database/DatabaseService';
import { SupabaseService } from './services/database/SupabaseService';
import { CryptoService } from './services/encryption/CryptoService';
import { SocketService } from './services/socket/SocketService';

// ============================================================================
// 📋 타입 정의 임포트
// ============================================================================
import { User, UserSession } from './types/database.types';

// 환경변수 로드
dotenv.config();

class Application {
  private app: Application;
  private server: Server | null = null;
  private port: number;
  private socketService: SocketService | null = null;
  
  // 서비스 인스턴스들
  private databaseService: DatabaseService;
  private supabaseService: SupabaseService;
  private cryptoService: CryptoService;

  constructor() {
    this.app = express();
    this.port = parseInt(process.env.PORT || '3001');
    
    // 서비스 초기화
    this.initializeServices();
    
    // 미들웨어 설정
    this.setupMiddleware();
    
    // 라우트 설정
    this.setupRoutes();
    
    // 에러 핸들링 설정
    this.setupErrorHandling();
    
    console.log('🚀 Final0626 백엔드 서버 v4.0 초기화 완료');
  }

  // ============================================================================
  // 🔧 서비스 초기화
  // ============================================================================
  private initializeServices(): void {
    try {
      // 데이터베이스 서비스 초기화
      this.supabaseService = SupabaseService.getInstance();
      this.databaseService = DatabaseService.getInstance();
      
      // 암호화 서비스 초기화
      this.cryptoService = CryptoService.getInstance();
      
      console.log('✅ 모든 서비스 초기화 성공');
    } catch (error) {
      console.error('❌ 서비스 초기화 실패:', error);
      process.exit(1);
    }
  }

  // ============================================================================
  // ⚙️ 미들웨어 설정
  // ============================================================================
  private setupMiddleware(): void {
    // CORS 설정
    this.app.use(cors({
      origin: [
        "http://localhost:3000",
        "http://localhost:3001", 
        process.env.FRONTEND_URL || "http://localhost:3000"
      ],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    }));

    // 보안 미들웨어
    this.app.use(helmet({
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: false
    }));

    // Body 파싱 미들웨어
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // 로깅 미들웨어
    this.app.use(morgan('combined'));
    this.app.use(loggingMiddleware);

    console.log('✅ 미들웨어 설정 완료');
  }

  // ============================================================================
  // 🛣️ 라우트 설정
  // ============================================================================
  private setupRoutes(): void {
    // 기본 라우트
    this.app.get('/', this.handleRootRoute.bind(this));
    
    // 헬스 체크
    this.app.get('/health', this.handleHealthCheck.bind(this));
    
    // favicon 처리
    this.app.get('/favicon.ico', (req, res) => res.status(204).end());

    // API 라우트들 (모듈화된 라우터 사용)
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/ai', aiRoutes);
    this.app.use('/api/cue', cueRoutes);
    this.app.use('/api/passport', passportRoutes);
    this.app.use('/api/vault', vaultRoutes);
    this.app.use('/api/platform', platformRoutes);

    // 404 핸들러
    this.app.use('*', this.handle404.bind(this));

    console.log('✅ 라우트 설정 완료');
  }

  // ============================================================================
  // 🚫 에러 핸들링 설정
  // ============================================================================
  private setupErrorHandling(): void {
    // 전역 에러 핸들러
    this.app.use(errorHandler);

    console.log('✅ 에러 핸들링 설정 완료');
  }

  // ============================================================================
  // 📍 기본 라우트 핸들러들
  // ============================================================================
  private handleRootRoute(req: Request, res: Response): void {
    res.json({
      service: 'CUE Protocol Backend API',
      version: '4.0.0',
      status: 'running',
      timestamp: new Date().toISOString(),
      endpoints: {
        health: '/health',
        auth: '/api/auth/*',
        ai: '/api/ai/*',
        cue: '/api/cue/*',
        passport: '/api/passport/*',
        vault: '/api/vault/*',
        platform: '/api/platform/*'
      }
    });
  }

  private async handleHealthCheck(req: Request, res: Response): Promise<void> {
    console.log('🏥 Health Check 요청 받음');
    
    try {
      // 서비스 상태 체크
      const databaseStatus = await this.checkDatabaseHealth();
      const serviceStatus = this.checkServicesHealth();
      
      const healthData = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '4.0.0',
        environment: process.env.NODE_ENV || 'development',
        services: {
          database: databaseStatus,
          ...serviceStatus
        },
        uptime: process.uptime(),
        memory: process.memoryUsage()
      };

      console.log('✅ Health Check 응답 전송');
      res.json(healthData);
    } catch (error) {
      console.error('❌ Health Check 실패:', error);
      res.status(500).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message
      });
    }
  }

  private handle404(req: Request, res: Response): void {
    console.log(`❌ 404 - 찾을 수 없는 경로: ${req.method} ${req.originalUrl}`);

    res.status(404).json({
      success: false,
      error: 'API endpoint not found',
      method: req.method,
      path: req.originalUrl,
      timestamp: new Date().toISOString(),
      availableEndpoints: [
        'GET /health',
        'POST /api/auth/webauthn/*',
        'POST /api/ai/chat',
        'GET /api/cue/balance/:did',
        'GET /api/passport/:did',
        'POST /api/vault/save',
        'GET /api/platform/connections'
      ]
    });
  }

  // ============================================================================
  // 🔍 헬스 체크 유틸리티 메서드들
  // ============================================================================
  private async checkDatabaseHealth(): Promise<any> {
    try {
      const supabaseConnected = await this.supabaseService.healthCheck();
      const databaseConnected = await this.databaseService.healthCheck();
      
      return {
        supabase: supabaseConnected,
        database: databaseConnected,
        connected: supabaseConnected && databaseConnected
      };
    } catch (error) {
      return {
        supabase: false,
        database: false,
        connected: false,
        error: error.message
      };
    }
  }

  private checkServicesHealth(): any {
    return {
      webauthn: true,
      ai: !!process.env.OPENAI_API_KEY || !!process.env.ANTHROPIC_API_KEY,
      cue: true,
      vault: true,
      crypto: this.cryptoService.isInitialized(),
      socket: !!this.socketService
    };
  }

  // ============================================================================
  // 🌐 소켓 서비스 초기화 (선택적)
  // ============================================================================
  private initializeSocketService(): void {
    if (this.server) {
      this.socketService = new SocketService(this.server);
      console.log('✅ 소켓 서비스 초기화 성공');
    }
  }

  // ============================================================================
  // 🚀 서버 시작
  // ============================================================================
  public async start(): Promise<void> {
    try {
      this.server = this.app.listen(this.port, () => {
        console.log('🚀 ================================');
        console.log('🚀 Final0626 백엔드 서버 v4.0 시작됨');
        console.log('🚀 ================================');
        console.log(`📍 서버: http://localhost:${this.port}`);
        console.log(`🏥 헬스체크: http://localhost:${this.port}/health`);
        console.log('🗄️ 데이터베이스: Supabase + Local Fallback');
        console.log('📋 주요 기능:');
        console.log('  🔐 WebAuthn 패스키 인증');
        console.log('  🤖 AI 채팅 시스템');
        console.log('  💰 CUE 토큰 마이닝');
        console.log('  🎫 AI Passport 관리');
        console.log('  🗄️ 데이터 볼트 시스템');
        console.log('  🌐 플랫폼 연동');
        console.log('📋 API 엔드포인트:');
        console.log('  🔐 Auth: /api/auth/*');
        console.log('  🤖 AI: /api/ai/*');
        console.log('  💎 CUE: /api/cue/*');
        console.log('  🎫 Passport: /api/passport/*');
        console.log('  🗄️ Vault: /api/vault/*');
        console.log('  🌐 Platform: /api/platform/*');
        console.log('🚀 ================================');
      });

      // 소켓 서비스 초기화 (필요한 경우)
      if (process.env.ENABLE_WEBSOCKET === 'true') {
        this.initializeSocketService();
      }

      // 우아한 종료 핸들러 설정
      this.setupGracefulShutdown();

    } catch (error) {
      console.error('💥 서버 시작 실패:', error);
      process.exit(1);
    }
  }

  // ============================================================================
  // 🛑 우아한 종료 처리
  // ============================================================================
  private setupGracefulShutdown(): void {
    const gracefulShutdown = (signal: string) => {
      console.log(`\n🛑 ${signal} 신호 받음 - 서버 종료 중...`);
      
      if (this.server) {
        this.server.close(async () => {
          console.log('📡 HTTP 서버 종료 완료');
          
          // 서비스들 정리
          try {
            if (this.socketService) {
              await this.socketService.close();
              console.log('🌐 소켓 서비스 종료 완료');
            }
            
            await this.databaseService.close();
            console.log('🗄️ 데이터베이스 연결 종료 완료');
            
            console.log('✅ 모든 서비스 정리 완료');
            process.exit(0);
          } catch (error) {
            console.error('❌ 서비스 정리 중 오류:', error);
            process.exit(1);
          }
        });
      } else {
        process.exit(0);
      }
    };

    // 시그널 핸들러 등록
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

    // 예외 처리
    process.on('uncaughtException', (error) => {
      console.error('💥 처리되지 않은 예외:', error);
      gracefulShutdown('UNCAUGHT_EXCEPTION');
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('💥 처리되지 않은 Promise 거부:', reason);
      gracefulShutdown('UNHANDLED_REJECTION');
    });
  }

  // ============================================================================
  // 🔧 공개 유틸리티 메서드들
  // ============================================================================
  public getApp(): Application {
    return this.app;
  }

  public getServer(): Server | null {
    return this.server;
  }

  public getDatabaseService(): DatabaseService {
    return this.databaseService;
  }

  public getSupabaseService(): SupabaseService {
    return this.supabaseService;
  }

  public getCryptoService(): CryptoService {
    return this.cryptoService;
  }

  public getSocketService(): SocketService | null {
    return this.socketService;
  }
}

// ============================================================================
// 🎯 애플리케이션 시작점
// ============================================================================
async function main() {
  try {
    const application = new Application();
    await application.start();
  } catch (error) {
    console.error('💥 애플리케이션 시작 실패:', error);
    process.exit(1);
  }
}

// 직접 실행되는 경우에만 서버 시작
if (require.main === module) {
  main();
}

// 테스트나 다른 모듈에서 사용할 수 있도록 export
export default Application;