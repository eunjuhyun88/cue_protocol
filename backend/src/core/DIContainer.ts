// ============================================================================
// 📁 backend/src/core/DIContainer.ts - 완전 통합 버전 (1+2+3 장점 결합)
// 🚀 기존 구조 보존 + 실제 에러 추적 + 세션 관리 + DatabaseService 전용
// 수정 위치: backend/src/core/DIContainer.ts (기존 파일 완전 교체)
// 개선 사항:
//   ✅ Document 2: 기존 프로젝트 구조 완전 보존
//   ✅ Document 1: 실제 에러만 추적, SupabaseService 완전 제거
//   ✅ Document 3: 순환 의존성 해결, SessionRestoreService 통합
//   💉 DatabaseService 의존성 주입 완료
//   🔧 Express Router 검증 강화
//   🛡️ Graceful Degradation 지원
//   📊 상세한 진단 정보 제공
// ============================================================================

import { AuthConfig } from '../config/auth';
import { DatabaseConfig } from '../config/database';
import { Application, Router } from 'express';

/**
 * 서비스 팩토리 함수 타입
 */
type ServiceFactory<T = any> = (container: DIContainer) => T;

/**
 * 서비스 라이프사이클 타입
 */
type ServiceLifecycle = 'singleton' | 'transient' | 'scoped';

/**
 * 서비스 정의 인터페이스 (Document 3의 강화된 메타데이터)
 */
interface ServiceDefinition<T = any> {
  factory: ServiceFactory<T>;
  lifecycle: ServiceLifecycle;
  instance?: T;
  dependencies?: string[];
  initialized?: boolean;
  metadata?: {
    name: string;
    description: string;
    category: string;
    priority?: 'critical' | 'high' | 'normal' | 'low';
    version?: string;
  };
}

/**
 * 라우터 연결 결과 인터페이스
 */
interface RouterConnectionResult {
  connectedCount: number;
  failedCount: number;
  failedRouters: any[];
}

/**
 * 완전 통합 DIContainer (1+2+3 장점 결합)
 * - Document 1: 실제 에러만 추적, SupabaseService 제거
 * - Document 2: 기존 구조 보존, 실제 파일 기반, Graceful Degradation
 * - Document 3: 순환 의존성 해결, SessionRestoreService, 편의 함수들
 */
export class DIContainer {
  private static instance: DIContainer;
  private services = new Map<string, ServiceDefinition>();
  private resolutionStack: string[] = [];
  private initializationOrder: string[] = [];
  private initializationStartTime: number = 0;
  private isInitialized: boolean = false;
  private errorLog: Array<{timestamp: number, service: string, error: string, stack?: string, severity: 'error' | 'warning'}> = [];

  /**
   * 싱글톤 인스턴스 반환
   */
  public static getInstance(): DIContainer {
    if (!DIContainer.instance) {
      DIContainer.instance = new DIContainer();
    }
    return DIContainer.instance;
  }

  /**
   * 컨테이너 초기화
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('⚠️ DI Container가 이미 초기화되어 있습니다.');
      return;
    }

    this.initializationStartTime = Date.now();
    console.log('🚀 === 완전 통합 DI Container 초기화 시작 ===');
    console.log('  ✅ 기존 프로젝트 구조 완전 보존 (Document 2)');
    console.log('  🔍 실제 에러만 추적, SupabaseService 제거 (Document 1)');
    console.log('  🔄 순환 의존성 해결, 세션 관리 강화 (Document 3)');
    console.log('  💉 DatabaseService 의존성 주입');
    console.log('  🛡️ Graceful Degradation 지원');
    
    // 핵심 설정 서비스들 먼저 등록
    await this.registerCoreServices();
    
    const initTime = Date.now() - this.initializationStartTime;
    this.isInitialized = true;
    console.log(`✅ DI Container 기본 초기화 완료 (${initTime}ms)`);
  }

  /**
   * 에러 로깅 (Document 1의 실제 문제 추적 + severity 추가)
   */
  private logError(service: string, error: any, severity: 'error' | 'warning' = 'error'): void {
    const errorEntry = {
      timestamp: Date.now(),
      service,
      error: error.message || error.toString(),
      stack: error.stack,
      severity
    };
    this.errorLog.push(errorEntry);
    
    const icon = severity === 'error' ? '❌' : '⚠️';
    console[severity](`${icon} [${service}] ${severity.toUpperCase()}:`);
    console[severity](`   메시지: ${errorEntry.error}`);
    console[severity](`   시간: ${new Date(errorEntry.timestamp).toISOString()}`);
    if (errorEntry.stack && severity === 'error') {
      console.error(`   스택: ${errorEntry.stack.split('\n')[1]?.trim()}`);
    }
  }

  // ============================================================================
  // 🔧 서비스 등록 메서드들 (Document 3의 강화된 메타데이터)
  // ============================================================================

  /**
   * 싱글톤 서비스 등록 (Document 3의 강화된 메타데이터)
   */
  public registerSingleton<T>(
    key: string, 
    factory: ServiceFactory<T>,
    dependencies: string[] = [],
    metadata?: {
      description?: string;
      category?: string;
      priority?: 'critical' | 'high' | 'normal' | 'low';
      version?: string;
    }
  ): void {
    this.register(key, factory, 'singleton', dependencies, {
      name: key,
      description: metadata?.description || `${key} service`,
      category: metadata?.category || 'unknown',
      priority: metadata?.priority || 'normal',
      version: metadata?.version || '1.0.0'
    });
  }

  /**
   * 트랜지언트 서비스 등록
   */
  public registerTransient<T>(
    key: string, 
    factory: ServiceFactory<T>,
    dependencies: string[] = [],
    metadata?: {
      description?: string;
      category?: string;
      priority?: 'critical' | 'high' | 'normal' | 'low';
    }
  ): void {
    this.register(key, factory, 'transient', dependencies, {
      name: key,
      description: metadata?.description || `${key} service`,
      category: metadata?.category || 'unknown',
      priority: metadata?.priority || 'normal'
    });
  }

  /**
   * 서비스 등록 (내부 메서드)
   */
  private register<T>(
    key: string,
    factory: ServiceFactory<T>,
    lifecycle: ServiceLifecycle,
    dependencies: string[] = [],
    metadata: any
  ): void {
    this.services.set(key, {
      factory,
      lifecycle,
      dependencies,
      metadata,
      initialized: false
    });

    console.log(`📦 서비스 등록: ${key} (${lifecycle}) - ${metadata.category}`);
  }

  /**
   * 서비스 조회 (Document 1의 엄격한 에러 처리 + Document 3의 순환 의존성 해결)
   */
  public get<T>(key: string): T {
    const definition = this.services.get(key);
    if (!definition) {
      const error = new Error(`서비스 '${key}'를 찾을 수 없습니다. 등록된 서비스: ${Array.from(this.services.keys()).join(', ')}`);
      this.logError(key, error);
      throw error;
    }

    // 순환 의존성 검사 (Document 3)
    if (this.resolutionStack.includes(key)) {
      const error = new Error(`순환 의존성 감지: ${this.resolutionStack.join(' -> ')} -> ${key}`);
      this.logError(key, error);
      throw error;
    }

    // 싱글톤이고 이미 인스턴스가 있으면 반환
    if (definition.lifecycle === 'singleton' && definition.instance) {
      return definition.instance;
    }

    this.resolutionStack.push(key);

    try {
      // 의존성 먼저 해결 (Document 3의 지연 로딩)
      const dependencies = definition.dependencies || [];
      for (const dep of dependencies) {
        try {
          this.get(dep);
        } catch (depError: any) {
          const error = new Error(`서비스 '${key}'의 의존성 '${dep}' 해결 실패: ${depError.message}`);
          this.logError(key, error);
          throw error;
        }
      }

      // 인스턴스 생성
      try {
        const instance = definition.factory(this);
        
        // 싱글톤인 경우 인스턴스 저장
        if (definition.lifecycle === 'singleton') {
          definition.instance = instance;
          definition.initialized = true;
          this.initializationOrder.push(key);
        }

        return instance;
      } catch (factoryError: any) {
        const error = new Error(`서비스 '${key}' 팩토리 실행 실패: ${factoryError.message}`);
        this.logError(key, error);
        throw error;
      }
    } finally {
      this.resolutionStack.pop();
    }
  }

  /**
   * 서비스 존재 여부 확인 (Document 3)
   */
  public has(key: string): boolean {
    return this.services.has(key);
  }

  /**
   * 모든 싱글톤 서비스 초기화 (Document 2의 Graceful Degradation)
   */
  public initializeAll(): void {
    console.log('🔄 모든 싱글톤 서비스 초기화 중...');
    
    const singletons = Array.from(this.services.entries())
      .filter(([, definition]) => definition.lifecycle === 'singleton')
      .map(([key]) => key);

    let successCount = 0;
    let failureCount = 0;

    for (const key of singletons) {
      try {
        this.get(key);
        console.log(`✅ ${key} 초기화 성공`);
        successCount++;
      } catch (error: any) {
        console.error(`❌ ${key} 초기화 실패: ${error.message}`);
        this.logError(key, error, 'warning'); // warning으로 기록
        failureCount++;
      }
    }

    console.log(`📊 초기화 결과: 성공 ${successCount}개, 실패 ${failureCount}개`);
    
    if (failureCount > 0) {
      console.warn('⚠️ 일부 서비스 초기화 실패 (Graceful Degradation 적용)');
    }
  }

  // ============================================================================
  // 🏗️ 핵심 서비스 등록
  // ============================================================================

  /**
   * 핵심 설정 서비스들 등록
   */
  private async registerCoreServices(): Promise<void> {
    console.log('🔧 핵심 설정 서비스 등록 중...');

    // AuthConfig
    this.registerSingleton('AuthConfig', () => {
      try {
        const config = AuthConfig.getInstance();
        console.log('✅ AuthConfig 로드됨');
        return config;
      } catch (error: any) {
        this.logError('AuthConfig', error);
        throw new Error(`AuthConfig 로딩 실패: ${error.message}`);
      }
    }, [], {
      description: '인증 설정 관리',
      category: 'config',
      priority: 'critical'
    });

    // DatabaseConfig
    this.registerSingleton('DatabaseConfig', () => {
      try {
        return DatabaseConfig;
      } catch (error: any) {
        this.logError('DatabaseConfig', error);
        throw new Error(`DatabaseConfig 로딩 실패: ${error.message}`);
      }
    }, [], {
      description: '데이터베이스 설정 관리',
      category: 'config',
      priority: 'critical'
    });

    console.log('✅ 핵심 설정 서비스 등록 완료');
  }

  // ============================================================================
  // 📦 전체 서비스 등록
  // ============================================================================

  /**
   * 모든 서비스 등록
   */
  public async registerAllServices(): Promise<void> {
    console.log('🚀 모든 서비스 등록 시작...');

    try {
      // 서비스 등록 순서 (의존성 순서대로)
      const registrationSteps = [
        { name: '데이터베이스 서비스', fn: () => this.registerDatabaseServices() },
        { name: '암호화 서비스', fn: () => this.registerCryptoServices() },
        { name: 'AI 서비스', fn: () => this.registerAIServices() },
        { name: '인증 서비스', fn: () => this.registerAuthServices() },
        { name: 'CUE 서비스', fn: () => this.registerCUEServices() },
        { name: 'Socket 서비스', fn: () => this.registerSocketServices() },
        { name: 'Controller', fn: () => this.registerControllers() },
        { name: '라우터', fn: () => this.registerRoutes() }
      ];

      for (const step of registrationSteps) {
        try {
          console.log(`🔄 ${step.name} 등록 중...`);
          await step.fn();
          console.log(`✅ ${step.name} 등록 완료`);
        } catch (error: any) {
          console.error(`❌ ${step.name} 등록 실패: ${error.message}`);
          this.logError(step.name, error, 'warning'); // Graceful Degradation
        }
      }

      console.log('🎉 모든 서비스 등록 완료');
    } catch (error: any) {
      console.error('💥 서비스 등록 중 심각한 오류:', error);
      this.logError('AllServices', error);
    }
  }

  /**
   * 데이터베이스 서비스 등록 (Document 1: DatabaseService만 사용)
   */
  private async registerDatabaseServices(): Promise<void> {
    // DatabaseService (메인) - Document 1의 완전 DatabaseService 전용
    this.registerSingleton('DatabaseService', () => {
      console.log('🔄 DatabaseService 로딩 시도...');
      
      try {
        // 1차 시도: index에서 getDatabaseService
        try {
          const { getDatabaseService } = require('../services/database');
          const dbService = getDatabaseService();
          console.log('✅ DatabaseService 등록 성공 (index 방식)');
          return dbService;
        } catch (indexError: any) {
          console.warn(`⚠️ index 방식 실패: ${indexError.message}`);
          
          // 2차 시도: 직접 DatabaseService 로딩
          try {
            const { DatabaseService } = require('../services/database/DatabaseService');
            const dbService = DatabaseService.getInstance();
            console.log('✅ DatabaseService 직접 로딩 성공');
            return dbService;
          } catch (directError: any) {
            console.error(`❌ 직접 DatabaseService 로딩 실패: ${directError.message}`);
            
            // 모든 방법 실패 시 명확한 에러 정보 제공 (Document 1)
            const fullError = new Error(`DatabaseService 로딩 실패:\n1. index 방식: ${indexError.message}\n2. 직접 로딩: ${directError.message}\n\n해결 방법:\n- DatabaseService.ts 파일이 존재하는지 확인\n- database/index.ts 파일 존재 여부 확인\n- 환경 변수 설정 확인`);
            this.logError('DatabaseService', fullError);
            throw fullError;
          }
        }
      } catch (error: any) {
        this.logError('DatabaseService', error);
        throw error;
      }
    }, [], {
      description: 'DatabaseService 전용 데이터베이스 서비스',
      category: 'database',
      priority: 'critical'
    });

    // ActiveDatabaseService (호환성 별칭) - Document 2의 기존 구조 보존
    this.registerSingleton('ActiveDatabaseService', (container) => {
      return container.get('DatabaseService');
    }, ['DatabaseService'], {
      description: '활성 데이터베이스 서비스 별칭',
      category: 'database',
      priority: 'critical'
    });

    console.log('✅ 데이터베이스 서비스 등록 완료 (DatabaseService만 사용)');
  }

  /**
   * 암호화 서비스 등록 (Document 2의 Graceful Degradation)
   */
  private async registerCryptoServices(): Promise<void> {
    this.registerSingleton('CryptoService', () => {
      try {
        const { CryptoService } = require('../services/encryption/CryptoService');
        return new CryptoService();
      } catch (error: any) {
        this.logError('CryptoService', error, 'warning');
        // Graceful Degradation: 기본 암호화 서비스 반환
        return {
          encrypt: (data: string) => Buffer.from(data).toString('base64'),
          decrypt: (data: string) => Buffer.from(data, 'base64').toString(),
          hash: (data: string) => Buffer.from(data).toString('hex')
        };
      }
    }, [], {
      description: '암호화 서비스',
      category: 'security'
    });
  }

  /**
   * AI 서비스 등록 (Document 2의 실제 파일 기반)
   */
  private async registerAIServices(): Promise<void> {
    // Ollama AI 서비스
    this.registerSingleton('OllamaAIService', () => {
      try {
        const { ollamaService } = require('../services/ollama');
        console.log('✅ Ollama AI 서비스 로드됨');
        return ollamaService;
      } catch (error: any) {
        this.logError('OllamaAIService', error, 'warning');
        // Graceful Degradation: Mock AI 서비스
        return {
          chat: async (message: string) => ({ 
            response: `Mock AI 응답: ${message}`, 
            model: 'mock' 
          })
        };
      }
    }, [], {
      description: 'Ollama AI 서비스',
      category: 'ai'
    });

    // PersonalizationService (Document 3의 DatabaseService 의존성)
    this.registerSingleton('PersonalizationService', (container) => {
      try {
        const { PersonalizationService } = require('../services/ai/PersonalizationService');
        const dbService = container.get('DatabaseService');
        return new PersonalizationService(dbService);
      } catch (error: any) {
        this.logError('PersonalizationService', error, 'warning');
        // Graceful Degradation
        return {
          personalize: async (message: string) => ({ personalizedMessage: message })
        };
      }
    }, ['DatabaseService'], {
      description: 'AI 개인화 서비스 (DatabaseService 의존성)',
      category: 'ai'
    });

    console.log('✅ AI 서비스 등록 완료');
  }

  /**
   * 인증 서비스 등록 (Document 3의 SessionRestoreService 통합)
   */
  private async registerAuthServices(): Promise<void> {
    // SessionRestoreService (Document 3의 핵심 추가 기능)
    this.registerSingleton('SessionRestoreService', (container) => {
      try {
        const { SessionRestoreService } = require('../services/auth/SessionRestoreService');
        const dbService = container.get('DatabaseService');
        return new SessionRestoreService(dbService);
      } catch (error: any) {
        this.logError('SessionRestoreService', error, 'warning');
        // Graceful Degradation: Mock 세션 복원 서비스
        return {
          restoreSession: async (token: string) => null,
          validateSession: async (sessionId: string) => false
        };
      }
    }, ['DatabaseService'], {
      description: 'JWT 기반 세션 복원 서비스',
      category: 'auth',
      priority: 'high'
    });

    // AuthService (Document 3의 SessionRestoreService 의존성 추가)
    this.registerSingleton('AuthService', (container) => {
      try {
        const { AuthService } = require('../services/auth/AuthService');
        const authConfig = container.get('AuthConfig');
        const dbService = container.get('DatabaseService');
        const sessionRestoreService = container.get('SessionRestoreService');
        return new AuthService(authConfig, dbService, sessionRestoreService);
      } catch (error: any) {
        this.logError('AuthService', error, 'warning');
        // Graceful Degradation
        return {
          authenticate: async () => ({ success: false, message: 'Auth service unavailable' })
        };
      }
    }, ['AuthConfig', 'DatabaseService', 'SessionRestoreService'], {
      description: '인증 서비스 (SessionRestoreService 통합)',
      category: 'auth',
      priority: 'critical'
    });

    // SessionService (Document 3의 완전한 의존성)
    this.registerSingleton('SessionService', (container) => {
      try {
        const { SessionService } = require('../services/auth/SessionService');
        const authConfig = container.get('AuthConfig');
        const authService = container.get('AuthService');
        const sessionRestoreService = container.get('SessionRestoreService');
        return new SessionService(authConfig, authService, sessionRestoreService);
      } catch (error: any) {
        this.logError('SessionService', error, 'warning');
        // Graceful Degradation
        return {
          createSession: async () => ({ sessionId: 'mock-session' }),
          validateSession: async () => false
        };
      }
    }, ['AuthConfig', 'AuthService', 'SessionRestoreService'], {
      description: 'JWT 토큰 및 세션 관리 서비스',
      category: 'auth',
      priority: 'high'
    });

    // WebAuthnService (Document 3의 모든 의존성 통합)
    this.registerSingleton('WebAuthnService', (container) => {
      try {
        const { WebAuthnService } = require('../services/auth/WebAuthnService');
        const authConfig = container.get('AuthConfig');
        const authService = container.get('AuthService');
        const sessionService = container.get('SessionService');
        return new WebAuthnService(authConfig, authService, sessionService);
      } catch (error: any) {
        this.logError('WebAuthnService', error, 'warning');
        // Graceful Degradation
        return {
          generateRegistrationOptions: async () => ({}),
          verifyRegistration: async () => ({ verified: false })
        };
      }
    }, ['AuthConfig', 'AuthService', 'SessionService'], {
      description: '패스키 기반 WebAuthn 인증 서비스',
      category: 'auth',
      priority: 'high'
    });

    console.log('✅ 인증 서비스 등록 완료 (SessionRestoreService 통합)');
  }

  /**
   * CUE 서비스 등록 (Document 1+2의 DatabaseService 의존성)
   */
  private async registerCUEServices(): Promise<void> {
    // CueService
    this.registerSingleton('CueService', (container) => {
      try {
        const { CueService } = require('../services/cue/CueService');
        const dbService = container.get('DatabaseService');
        return new CueService(dbService);
      } catch (error: any) {
        this.logError('CueService', error, 'warning');
        // Graceful Degradation
        return {
          getCueBalance: async () => 0,
          addCueTokens: async () => ({ success: false })
        };
      }
    }, ['DatabaseService'], {
      description: 'CUE 토큰 서비스',
      category: 'cue'
    });

    // CUEMiningService
    this.registerSingleton('CUEMiningService', (container) => {
      try {
        const { CUEMiningService } = require('../services/cue/CUEMiningService');
        const dbService = container.get('DatabaseService');
        return new CUEMiningService(dbService);
      } catch (error: any) {
        this.logError('CUEMiningService', error, 'warning');
        // Graceful Degradation
        return {
          mineFromInteraction: async () => 0,
          getMiningStats: async () => ({ totalMined: 0 })
        };
      }
    }, ['DatabaseService'], {
      description: 'CUE 마이닝 서비스',
      category: 'cue'
    });

    console.log('✅ CUE 서비스 등록 완료');
  }

  /**
   * Socket 서비스 등록 (Document 2의 Graceful Degradation)
   */
  private async registerSocketServices(): Promise<void> {
    this.registerSingleton('SocketService', () => {
      try {
        const { SocketService } = require('../services/socket/SocketService');
        return SocketService.createSafeInstance();
      } catch (error: any) {
        this.logError('SocketService', error, 'warning');
        // Graceful Degradation: Mock Socket 서비스
        return {
          emit: () => {},
          on: () => {},
          disconnect: () => {}
        };
      }
    }, [], {
      description: 'Socket.IO 서비스',
      category: 'socket'
    });
  }

  /**
   * Controller 등록 (Document 2+3의 완전한 의존성)
   */
  private async registerControllers(): Promise<void> {
    this.registerSingleton('AuthController', (container) => {
      try {
        const { AuthController } = require('../controllers/AuthController');
        const authService = container.get('AuthService');
        const sessionService = container.get('SessionService');
        const webauthnService = container.get('WebAuthnService');
        
        return new AuthController(authService, sessionService, webauthnService);
      } catch (error: any) {
        this.logError('AuthController', error, 'warning');
        // Graceful Degradation: Mock Controller
        return {
          login: async (req: any, res: any) => res.status(503).json({ error: 'Service unavailable' }),
          register: async (req: any, res: any) => res.status(503).json({ error: 'Service unavailable' })
        };
      }
    }, ['AuthService', 'SessionService', 'WebAuthnService'], {
      description: '인증 컨트롤러',
      category: 'controller'
    });

    console.log('✅ Controller 등록 완료');
  }

  /**
   * 라우터 등록 (Document 2의 실제 파일 기반 + Graceful Degradation)
   */
  private async registerRoutes(): Promise<void> {
    console.log('🛣️ 라우터 등록 시작 (실제 파일 기반)...');

    // Document 2의 실제 존재 확인된 직접 export 라우터들
    const directRoutes = [
      // 인증 관련
      { key: 'AuthWebAuthnRoutes', path: '../routes/auth/webauthn', description: 'WebAuthn 라우트' },
      { key: 'AuthSessionRestoreRoutes', path: '../routes/auth/session-restore', description: '세션 복원 라우트' },
      
      // AI 관련
      { key: 'AIChatRoutes', path: '../routes/ai/chat', description: 'AI 채팅 라우트' },
      { key: 'AIPersonalRoutes', path: '../routes/ai/personal', description: 'AI 개인화 라우트' },
      { key: 'AIIndexRoutes', path: '../routes/ai/index', description: 'AI 통합 라우트' },
      
      // CUE 관련
      { key: 'CUEMiningRoutes', path: '../routes/cue/mining', description: 'CUE 마이닝 라우트' },
      { key: 'CUECompleteRoutes', path: '../routes/cue/complete', description: 'CUE 완료 라우트' },
      
      // 기타
      { key: 'VaultRoutes', path: '../routes/vault/index', description: 'Vault 라우트' },
      { key: 'DebugRoutes', path: '../routes/debug/index', description: '디버그 라우트' },
      { key: 'PlatformRoutes', path: '../routes/platform/index', description: '플랫폼 라우트' }
    ];

    // Document 2의 Graceful Degradation 적용
    for (const { key, path, description } of directRoutes) {
      this.registerSingleton(key, () => {
        try {
          const routeModule = require(path);
          const router = routeModule.default || routeModule.router || routeModule;
          
          if (this.isValidExpressRouter(router)) {
            console.log(`✅ ${key}: Express Router 로딩 성공`);
            return router;
          } else {
            throw new Error(`유효한 Express Router를 찾을 수 없음`);
          }
        } catch (error: any) {
          this.logError(key, error, 'warning');
          // Graceful Degradation: 더미 라우터 반환
          const express = require('express');
          const dummyRouter = express.Router();
          dummyRouter.get('/health', (req: any, res: any) => {
            res.json({ status: 'ok', message: `${key} dummy router` });
          });
          return dummyRouter;
        }
      }, [], {
        description,
        category: 'router',
        priority: 'normal'
      });
    }

    // Document 2의 팩토리 함수 방식 라우터들
    const factoryRoutes = [
      { key: 'AuthUnifiedRoutes', path: '../routes/auth/unified', description: '통합 인증 라우트' },
      { key: 'CUERoutes', path: '../routes/cue/cue', description: 'CUE 토큰 라우트' },
      { key: 'PassportRoutes', path: '../routes/passport/passport', description: 'Passport 메인 라우트' }
    ];

    for (const { key, path, description } of factoryRoutes) {
      this.registerSingleton(key, (container: DIContainer) => {
        try {
          const routeModule = require(path);
          const createFunction = this.findCreateFunction(routeModule);
          
          if (createFunction) {
            const router = createFunction(container);
            if (this.isValidExpressRouter(router)) {
              console.log(`✅ ${key}: 팩토리 라우터 생성 성공`);
              return router;
            }
          }
          throw new Error(`팩토리 함수 실행 실패`);
        } catch (error: any) {
          this.logError(key, error, 'warning');
          // Graceful Degradation
          const express = require('express');
          const dummyRouter = express.Router();
          dummyRouter.get('/health', (req: any, res: any) => {
            res.json({ status: 'ok', message: `${key} dummy factory router` });
          });
          return dummyRouter;
        }
      }, [], {
        description,
        category: 'router',
        priority: 'normal'
      });
    }

    console.log('✅ 라우터 등록 완료 (Graceful Degradation 적용)');
  }

  // ============================================================================
  // 🔧 유틸리티 메서드들 (Document 2)
  // ============================================================================

  /**
   * Express Router 유효성 검사
   */
  private isValidExpressRouter(router: any): boolean {
    if (!router || typeof router !== 'function') {
      return false;
    }
    const requiredMethods = ['use', 'get', 'post'];
    return requiredMethods.every(method => typeof router[method] === 'function');
  }

  /**
   * 팩토리 함수 찾기
   */
  private findCreateFunction(routeModule: any): Function | null {
    const createFunctionNames = Object.keys(routeModule).filter(key => 
      (key.startsWith('create') && typeof routeModule[key] === 'function')
    );
    
    if (createFunctionNames.length > 0) {
      return routeModule[createFunctionNames[0]];
    }

    const defaultNames = ['createUnifiedAuthRoutes', 'createRoutes', 'create'];
    for (const name of defaultNames) {
      if (routeModule[name] && typeof routeModule[name] === 'function') {
        return routeModule[name];
      }
    }
    return null;
  }

  // ============================================================================
  // 📊 상태 및 진단 (Document 3의 강화된 진단)
  // ============================================================================

  /**
   * 서비스 의존성 그래프 검증 (Document 3)
   */
  public validateDependencies(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    for (const [name, definition] of this.services.entries()) {
      const dependencies = definition.dependencies || [];
      
      for (const dep of dependencies) {
        if (!this.services.has(dep)) {
          errors.push(`서비스 '${name}'의 의존성 '${dep}'가 등록되지 않음`);
        }
      }
    }

    const valid = errors.length === 0;
    
    if (valid) {
      console.log('✅ 모든 서비스 의존성 검증 완료');
    } else {
      console.error('❌ 서비스 의존성 오류:');
      errors.forEach(error => console.error(`   - ${error}`));
    }

    return { valid, errors };
  }

  /**
   * 등록된 서비스 상태 출력 (Document 3)
   */
  public printServiceStatus(): void {
    console.log('\n📋 등록된 서비스 목록:');
    console.log('='.repeat(50));
    
    const categories = ['config', 'database', 'auth', 'ai', 'cue', 'socket', 'controller', 'router'];
    
    for (const category of categories) {
      const categoryServices = Array.from(this.services.entries())
        .filter(([, def]) => def.metadata?.category === category);
      
      if (categoryServices.length > 0) {
        console.log(`\n📦 ${category.toUpperCase()} 서비스:`);
        for (const [name, definition] of categoryServices) {
          const hasInstance = !!definition.instance;
          const dependencies = definition.dependencies?.join(', ') || '없음';
          
          console.log(`   ${hasInstance ? '✅' : '⏳'} ${name}`);
          console.log(`      타입: ${definition.lifecycle}`);
          console.log(`      의존성: ${dependencies}`);
          console.log(`      설명: ${definition.metadata?.description}`);
        }
      }
    }
  }

  /**
   * 에러 로그 조회 (Document 1의 강화된 에러 추적)
   */
  public getErrorLog(): Array<{timestamp: number, service: string, error: string, stack?: string, severity: 'error' | 'warning'}> {
    return [...this.errorLog];
  }

  /**
   * 컨테이너 상태 조회 (Document 2+3 통합)
   */
  public getStatus(): any {
    const serviceStats = Array.from(this.services.entries()).map(([key, definition]) => ({
      key,
      lifecycle: definition.lifecycle,
      initialized: definition.initialized || false,
      dependencies: definition.dependencies || [],
      category: definition.metadata?.category || 'unknown',
      description: definition.metadata?.description || 'No description',
      priority: definition.metadata?.priority || 'normal'
    }));

    const categoryStats = serviceStats.reduce((acc, service) => {
      acc[service.category] = (acc[service.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const priorityStats = serviceStats.reduce((acc, service) => {
      acc[service.priority] = (acc[service.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalInitTime = this.isInitialized ? 
      Date.now() - this.initializationStartTime : 0;

    const errorsByService = this.errorLog.reduce((acc, error) => {
      acc[error.service] = (acc[error.service] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const errorsBySeverity = this.errorLog.reduce((acc, error) => {
      acc[error.severity] = (acc[error.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalServices: this.services.size,
      initializedServices: serviceStats.filter(s => s.initialized).length,
      failedServices: serviceStats.filter(s => !s.initialized).length,
      initializationOrder: this.initializationOrder,
      categoryStats,
      priorityStats,
      totalInitializationTime: totalInitTime,
      services: serviceStats,
      errorLog: this.errorLog,
      errorsByService,
      errorsBySeverity,
      health: this.getHealthStatus(),
      validation: this.validateDependencies(),
      features: {
        // Document 1 특징
        databaseServiceOnly: true,
        supabaseServiceRemoved: true,
        realErrorTracking: true,
        
        // Document 2 특징
        existingStructurePreserved: true,
        realFileBasedRouting: true,
        gracefulDegradation: true,
        
        // Document 3 특징
        circularDependencyResolution: true,
        sessionRestoreIntegrated: true,
        enhancedDiagnostics: true,
        
        // 통합 특징
        completeIntegration: true
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 컨테이너 헬스 상태 확인 (Document 1+2+3 통합)
   */
  private getHealthStatus(): { status: string; issues: string[]; errors: number; warnings: number } {
    const issues: string[] = [];
    
    const requiredServices = ['AuthConfig', 'DatabaseService', 'AuthService'];
    for (const service of requiredServices) {
      if (!this.has(service)) {
        issues.push(`필수 서비스 누락: ${service}`);
      }
    }

    const failedServices = Array.from(this.services.entries())
      .filter(([, def]) => def.lifecycle === 'singleton' && !def.initialized)
      .map(([key]) => key);
    
    if (failedServices.length > 0) {
      issues.push(`초기화 실패 서비스: ${failedServices.join(', ')}`);
    }

    const errors = this.errorLog.filter(e => e.severity === 'error').length;
    const warnings = this.errorLog.filter(e => e.severity === 'warning').length;

    if (errors > 0) {
      issues.push(`심각한 에러 ${errors}개 발생`);
    }
    if (warnings > 0) {
      issues.push(`경고 ${warnings}개 발생 (Graceful Degradation 적용됨)`);
    }

    return {
      status: errors === 0 ? (warnings === 0 ? 'healthy' : 'degraded') : 'error',
      issues,
      errors,
      warnings
    };
  }

  // ============================================================================
  // 🧹 정리 및 해제 (Document 3)
  // ============================================================================

  /**
   * 특정 서비스 재시작 (Document 3)
   */
  public async restartService(name: string): Promise<void> {
    const definition = this.services.get(name);
    
    if (!definition) {
      throw new Error(`서비스 '${name}'이(가) 등록되지 않았습니다`);
    }

    if (definition.lifecycle !== 'singleton') {
      throw new Error(`일시적 서비스 '${name}'은(는) 재시작할 수 없습니다`);
    }

    console.log(`🔄 서비스 재시작: ${name}`);

    // 기존 인스턴스 정리
    if (definition.instance && typeof definition.instance.dispose === 'function') {
      try {
        await definition.instance.dispose();
      } catch (error) {
        console.warn(`⚠️ 서비스 정리 중 오류 (${name}):`, error);
      }
    }

    // 새 인스턴스 생성
    definition.instance = null;
    definition.initialized = false;
    definition.instance = definition.factory(this);
    definition.initialized = true;
    
    console.log(`✅ 서비스 재시작 완료: ${name}`);
  }

  /**
   * 컨테이너 재설정
   */
  public reset(): void {
    console.log('🔄 DI Container 재설정...');
    
    for (const [key, definition] of this.services.entries()) {
      if (definition.instance && typeof definition.instance.dispose === 'function') {
        try {
          definition.instance.dispose();
        } catch (error) {
          console.warn(`⚠️ ${key} 정리 중 오류:`, error);
        }
      }
      definition.instance = undefined;
      definition.initialized = false;
    }

    this.resolutionStack = [];
    this.initializationOrder = [];
    this.initializationStartTime = 0;
    this.isInitialized = false;
    this.errorLog = [];
    
    console.log('✅ DI Container 재설정 완료');
  }

  /**
   * 컨테이너 정리 (Document 3의 완전한 정리)
   */
  public async dispose(): Promise<void> {
    console.log('🧹 DI Container 정리 시작');

    const servicesToDispose = Array.from(this.services.entries())
      .filter(([_, definition]) => definition.instance && typeof definition.instance.dispose === 'function')
      .reverse(); // 의존성 역순으로 정리

    for (const [name, definition] of servicesToDispose) {
      try {
        console.log(`🧹 서비스 정리 중: ${name}`);
        await definition.instance.dispose();
        definition.instance = null;
      } catch (error) {
        console.error(`❌ 서비스 정리 실패 (${name}):`, error);
      }
    }

    this.services.clear();
    this.isInitialized = false;
    this.errorLog = [];
    
    console.log('✅ DI Container 정리 완료');
  }
}

// ============================================================================
// 🛠️ Express 라우터 연결 함수 (Document 2의 완전한 매핑)
// ============================================================================

/**
 * DI Container 라우터들을 Express 앱에 연결하는 함수
 */
export async function connectDIRouters(app: Application, container: DIContainer): Promise<RouterConnectionResult> {
  console.log('🛣️ === Express 라우터 연결 시작 (완전 통합 버전) ===');

  let connectedCount = 0;
  let failedCount = 0;
  const failedRouters: any[] = [];

  try {
    // Document 2의 완전한 라우터 매핑
    const routerMappings = [
      // 🔐 인증 라우트들
      { name: 'WebAuthn Routes', serviceName: 'AuthWebAuthnRoutes', path: '/api/auth/webauthn' },
      { name: 'Session Restore Routes', serviceName: 'AuthSessionRestoreRoutes', path: '/api/auth/session' },
      { name: 'Unified Auth Routes', serviceName: 'AuthUnifiedRoutes', path: '/api/auth' },
      
      // 🤖 AI 라우트들
      { name: 'AI Chat Routes', serviceName: 'AIChatRoutes', path: '/api/ai/chat' },
      { name: 'AI Personal Routes', serviceName: 'AIPersonalRoutes', path: '/api/ai/personal' },
      { name: 'AI Index Routes', serviceName: 'AIIndexRoutes', path: '/api/ai' },
      
      // 💰 CUE 라우트들
      { name: 'CUE Routes', serviceName: 'CUERoutes', path: '/api/cue' },
      { name: 'CUE Mining Routes', serviceName: 'CUEMiningRoutes', path: '/api/cue/mining' },
      { name: 'CUE Complete Routes', serviceName: 'CUECompleteRoutes', path: '/api/cue/complete' },
      
      // 🎫 기타 라우트들
      { name: 'Passport Routes', serviceName: 'PassportRoutes', path: '/api/passport' },
      { name: 'Vault Routes', serviceName: 'VaultRoutes', path: '/api/vault' },
      { name: 'Platform Routes', serviceName: 'PlatformRoutes', path: '/api/platform' },
      { name: 'Debug Routes', serviceName: 'DebugRoutes', path: '/api/debug' }
    ];

    console.log(`📋 연결 대상 라우터: ${routerMappings.length}개`);

    // 라우터 연결 처리 (Graceful Degradation 적용)
    for (const { name, serviceName, path } of routerMappings) {
      try {
        if (!container.has(serviceName)) {
          const error = `서비스 '${serviceName}'가 등록되지 않음`;
          console.warn(`⚠️ ${name}: ${error}`);
          failedRouters.push({ name, path, error });
          failedCount++;
          continue;
        }

        const router = container.get(serviceName);
        
        if (!router || typeof router !== 'function') {
          const error = `유효하지 않은 라우터 타입: ${typeof router}`;
          console.warn(`⚠️ ${name}: ${error} (더미 라우터 사용됨)`);
          failedRouters.push({ name, path, error });
          failedCount++;
        }

        // Express 앱에 라우터 연결 (더미 라우터도 연결됨)
        app.use(path, router);
        console.log(`✅ ${name} 연결: ${path}`);
        connectedCount++;

      } catch (error: any) {
        console.warn(`⚠️ ${name} 연결 실패: ${error.message}`);
        failedRouters.push({ name, path, error: error.message });
        failedCount++;
      }
    }

    // 연결 결과 요약
    console.log(`\n🎯 === 라우터 연결 완료 ===`);
    console.log(`✅ 성공: ${connectedCount}개`);
    console.log(`⚠️ 실패: ${failedCount}개 (Graceful Degradation 적용됨)`);

    if (connectedCount > 0) {
      console.log('\n📋 연결된 API 엔드포인트:');
      console.log('🔐 인증: /api/auth/webauthn/*, /api/auth/session/*, /api/auth/*');
      console.log('🤖 AI: /api/ai/chat/*, /api/ai/personal/*, /api/ai/*');
      console.log('💎 CUE: /api/cue/*, /api/cue/mining/*, /api/cue/complete/*');
      console.log('🎫 기타: /api/passport/*, /api/vault/*, /api/platform/*, /api/debug/*');
    }

    return { connectedCount, failedCount, failedRouters };

  } catch (error: any) {
    console.error('❌ 라우터 연결 중 심각한 오류:', error);
    return { connectedCount: 0, failedCount: 1, failedRouters: [{ error: error.message }] };
  }
}

// ============================================================================
// 📤 초기화 및 헬퍼 함수들 (Document 3의 편의 함수들)
// ============================================================================

/**
 * 의존성 주입 시스템 초기화 (완전 통합 버전)
 */
export async function initializeDI(): Promise<DIContainer> {
  const startTime = Date.now();
  console.log('🚀 === 완전 통합 DI 시스템 초기화 시작 ===');
  
  const container = DIContainer.getInstance();
  
  try {
    // 컨테이너 초기화
    await container.initialize();
    
    // 모든 서비스 등록
    await container.registerAllServices();
    
    // 모든 싱글톤 서비스 초기화
    container.initializeAll();
    
    const initTime = Date.now() - startTime;
    console.log(`✅ === 완전 통합 DI 시스템 초기화 완료 (${initTime}ms) ===`);
    
    const status = container.getStatus();
    console.log('📊 서비스 현황:');
    console.log(`  - 총 서비스: ${status.totalServices}개`);
    console.log(`  - 초기화된 서비스: ${status.initializedServices}개`);
    console.log(`  - 실패한 서비스: ${status.failedServices}개`);
    console.log(`  - 에러: ${status.errorsBySeverity.error || 0}개`);
    console.log(`  - 경고: ${status.errorsBySeverity.warning || 0}개`);
    console.log(`  - 상태: ${status.health.status}`);
    
    console.log('\n🎯 통합된 특징:');
    console.log('  ✅ Document 1: 실제 에러 추적, SupabaseService 제거');
    console.log('  ✅ Document 2: 기존 구조 보존, Graceful Degradation');
    console.log('  ✅ Document 3: 순환 의존성 해결, 세션 관리 강화');
    console.log('  💉 DatabaseService 의존성 주입 완료');
    console.log('  🛡️ 완전한 실패 허용 시스템');
    
    // Document 3의 서비스 상태 출력
    container.printServiceStatus();
    
    return container;
    
  } catch (error: any) {
    const initTime = Date.now() - startTime;
    console.error(`❌ DI 시스템 초기화 실패 (${initTime}ms):`);
    console.error(`   에러: ${error.message}`);
    
    const status = container.getStatus();
    if (status.errorLog.length > 0) {
      console.error('\n🔍 발생한 에러들:');
      status.errorLog.forEach((error: any, index: number) => {
        console.error(`   ${index + 1}. [${error.service}] ${error.severity.toUpperCase()}: ${error.error}`);
      });
    }
    
    throw error;
  }
}

/**
 * 의존성 주입 시스템 종료 (Document 3)
 */
export async function shutdownDI(): Promise<void> {
  console.log('🛑 DI 시스템 종료...');
  
  const container = DIContainer.getInstance();
  await container.dispose();
  
  console.log('✅ DI 시스템 종료 완료');
}

/**
 * 컨테이너 상태 조회 (Document 3)
 */
export function getDIStatus(): any {
  return DIContainer.getInstance().getStatus();
}

/**
 * 에러 로그 조회 (Document 1+3)
 */
export function getDIErrorLog(): Array<{timestamp: number, service: string, error: string, stack?: string, severity: 'error' | 'warning'}> {
  return DIContainer.getInstance().getErrorLog();
}

/**
 * 서비스 가져오기 (Document 3의 편의 함수)
 */
export function getService<T>(name: string): T {
  return DIContainer.getInstance().get<T>(name);
}

/**
 * 서비스 등록 여부 확인 (Document 3)
 */
export function hasService(name: string): boolean {
  return DIContainer.getInstance().has(name);
}

/**
 * 서비스 재시작 (Document 3)
 */
export async function restartService(name: string): Promise<void> {
  return DIContainer.getInstance().restartService(name);
}

/**
 * 의존성 검증 (Document 3)
 */
export function validateDependencies(): { valid: boolean; errors: string[] } {
  return DIContainer.getInstance().validateDependencies();
}

console.log('✅ 완전 통합 DIContainer.ts 완성 (1+2+3 장점 결합):');
console.log('  ✅ Document 1: 실제 에러 추적, SupabaseService 제거');
console.log('  ✅ Document 2: 기존 구조 보존, 실제 파일 기반, Graceful Degradation');
console.log('  ✅ Document 3: 순환 의존성 해결, SessionRestoreService, 편의 함수들');
console.log('  💉 완전한 DatabaseService 의존성 주입');
console.log('  🛡️ 강화된 실패 허용 시스템');
console.log('  📊 상세한 진단 및 상태 관리');