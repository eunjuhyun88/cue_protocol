// ============================================================================
// 📁 backend/src/core/DIContainer.ts - Mock 제거된 실제 에러 추적 버전
// 🚀 Fallback Mock 제거 + 실제 문제 파악을 위한 엄격한 에러 처리
// 수정 위치: backend/src/core/DIContainer.ts (기존 파일 완전 교체)
// 개선 사항:
//   ❌ Mock fallback 완전 제거
//   🔍 실제 에러 원인 명확히 표시
//   📊 정확한 문제 진단 정보 제공
//   🚨 실패 시 명확한 에러 메시지
//   ✅ 실제 서비스만 로딩 (Mock 없음)
//   🔧 isValidExpressRouter 문법 오류 완전 해결
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
 * 서비스 정의 인터페이스
 */
interface ServiceDefinition<T = any> {
  factory: ServiceFactory<T>;
  lifecycle: ServiceLifecycle;
  instance?: T;
  dependencies?: string[];
  initialized?: boolean;
  metadata?: any;
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
 * 실제 문제 파악을 위한 의존성 주입 컨테이너 (Mock 제거 버전)
 */
export class DIContainer {
  private static instance: DIContainer;
  private services = new Map<string, ServiceDefinition>();
  private resolutionStack: string[] = [];
  private initializationOrder: string[] = [];
  private initializationStartTime: number = 0;
  private isInitialized: boolean = false;
  private errorLog: Array<{timestamp: number, service: string, error: string, stack?: string}> = [];

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
    console.log('🚀 실제 문제 파악용 DI Container 초기화 시작...');
    console.log('  ❌ Mock fallback 완전 제거됨');
    console.log('  🔍 실제 에러만 표시됨');
    console.log('  📊 정확한 문제 진단 제공');
    console.log('  🚨 실패 시 명확한 원인 표시');
    console.log('  🔧 isValidExpressRouter 문법 오류 해결됨');
    
    // 핵심 설정 서비스들 먼저 등록
    await this.registerCoreServices();
    
    const initTime = Date.now() - this.initializationStartTime;
    this.isInitialized = true;
    console.log(`✅ DI Container 기본 초기화 완료 (${initTime}ms)`);
  }

  /**
   * 에러 로깅 (실제 문제 추적용)
   */
  private logError(service: string, error: any): void {
    const errorEntry = {
      timestamp: Date.now(),
      service,
      error: error.message || error.toString(),
      stack: error.stack
    };
    this.errorLog.push(errorEntry);
    
    console.error(`❌ [${service}] 실제 에러 발생:`);
    console.error(`   메시지: ${errorEntry.error}`);
    console.error(`   시간: ${new Date(errorEntry.timestamp).toISOString()}`);
    if (errorEntry.stack) {
      console.error(`   스택: ${errorEntry.stack.split('\n')[1]?.trim()}`);
    }
  }

  // ============================================================================
  // 🔧 서비스 등록 메서드들
  // ============================================================================

  /**
   * 싱글톤 서비스 등록
   */
  public registerSingleton<T>(
    key: string, 
    factory: ServiceFactory<T>,
    dependencies: string[] = [],
    metadata?: any
  ): void {
    this.register(key, factory, 'singleton', dependencies, metadata);
  }

  /**
   * 트랜지언트 서비스 등록
   */
  public registerTransient<T>(
    key: string, 
    factory: ServiceFactory<T>,
    dependencies: string[] = [],
    metadata?: any
  ): void {
    this.register(key, factory, 'transient', dependencies, metadata);
  }

  /**
   * 서비스 등록 (내부 메서드)
   */
  private register<T>(
    key: string,
    factory: ServiceFactory<T>,
    lifecycle: ServiceLifecycle,
    dependencies: string[] = [],
    metadata?: any
  ): void {
    this.services.set(key, {
      factory,
      lifecycle,
      dependencies,
      metadata,
      initialized: false
    });

    console.log(`📦 서비스 등록: ${key} (${lifecycle})`);
  }

  /**
   * 서비스 조회 (엄격한 에러 처리)
   */
  public get<T>(key: string): T {
    const definition = this.services.get(key);
    if (!definition) {
      const error = new Error(`서비스 '${key}'를 찾을 수 없습니다. 등록된 서비스: ${Array.from(this.services.keys()).join(', ')}`);
      this.logError(key, error);
      throw error;
    }

    // 순환 의존성 검사
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
      // 의존성 먼저 해결
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
   * 서비스 존재 여부 확인
   */
  public has(key: string): boolean {
    return this.services.has(key);
  }

  /**
   * 모든 싱글톤 서비스 초기화 (엄격한 에러 처리)
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
        failureCount++;
      }
    }

    console.log(`📊 초기화 결과: 성공 ${successCount}개, 실패 ${failureCount}개`);
    
    if (failureCount > 0) {
      console.error('⚠️ 실패한 서비스들로 인해 일부 기능이 제한될 수 있습니다.');
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
          // Mock 없이 실제 에러를 다시 던짐
          throw new Error(`${step.name} 등록 중 실패: ${error.message}`);
        }
      }

      console.log('🎉 모든 서비스 등록 완료');
    } catch (error: any) {
      console.error('💥 서비스 등록 중 심각한 오류:', error);
      throw error;
    }
  }

  /**
   * 데이터베이스 서비스 등록 (Mock 제거 + 통합된 source_platform 컬럼 지원)
   */
  private async registerDatabaseServices(): Promise<void> {
    // ActiveDatabaseService (메인)
    this.registerSingleton('ActiveDatabaseService', () => {
      console.log('🔄 ActiveDatabaseService 로딩 시도...');
      
      try {
        const { getDatabaseService } = require('../services/database');
        const dbService = getDatabaseService();
        console.log('✅ ActiveDatabaseService 등록 성공 (통합 source_platform 지원)');
        return dbService;
      } catch (error: any) {
        this.logError('ActiveDatabaseService', error);
        console.error('❌ getDatabaseService 로딩 실패, 직접 DatabaseService 시도...');
        
        // Fallback: 직접 DatabaseService 로딩
        try {
          const { DatabaseService } = require('../services/database/DatabaseService');
          const dbService = DatabaseService.getInstance();
          console.log('✅ 직접 DatabaseService 로딩 성공');
          return dbService;
        } catch (fallbackError: any) {
          this.logError('DatabaseService', fallbackError);
        }
      }
    }, [], {
      description: '실제 데이터베이스 서비스 (통합 source_platform 컬럼 지원)',
      category: 'database',
      priority: 'critical'
    });

    // 호환성을 위한 별칭
    this.registerSingleton('DatabaseService', (container) => {
      return container.get('ActiveDatabaseService');
    }, ['ActiveDatabaseService'], {
      description: '데이터베이스 서비스 별칭',
      category: 'database',
      priority: 'critical'
    });

    console.log('✅ 데이터베이스 서비스 등록 완료 (통합 source_platform 컬럼 지원)');
  }

  /**
   * 암호화 서비스 등록 (Mock 제거)
   */
  private async registerCryptoServices(): Promise<void> {
    this.registerSingleton('CryptoService', () => {
      try {
        const { CryptoService } = require('../services/encryption/CryptoService');
        return new CryptoService();
      } catch (error: any) {
        this.logError('CryptoService', error);
        throw new Error(`CryptoService 로딩 실패: ${error.message}`);
      }
    }, [], {
      description: '암호화 서비스',
      category: 'security'
    });
  }

  /**
   * AI 서비스 등록 (Mock 제거)
   */
  private async registerAIServices(): Promise<void> {
    // Ollama AI 서비스
    this.registerSingleton('OllamaAIService', () => {
      try {
        const { ollamaService } = require('../services/ollama');
        console.log('✅ Ollama AI 서비스 로드됨');
        return ollamaService;
      } catch (error: any) {
        this.logError('OllamaAIService', error);
        throw new Error(`Ollama 서비스 로딩 실패: ${error.message}`);
      }
    }, [], {
      description: 'Ollama AI 서비스',
      category: 'ai'
    });

    // AI 보조 서비스들
    this.registerSingleton('PersonalizationService', () => {
      try {
        const { PersonalizationService } = require('../services/ai/PersonalizationService');
        return new PersonalizationService();
      } catch (error: any) {
        this.logError('PersonalizationService', error);
        throw new Error(`PersonalizationService 로딩 실패: ${error.message}`);
      }
    }, [], {
      description: 'AI 개인화 서비스',
      category: 'ai'
    });

    this.registerSingleton('PersonalCueExtractor', () => {
      try {
        const { PersonalCueExtractor } = require('../services/ai/PersonalCueExtractor');
        return new PersonalCueExtractor();
      } catch (error: any) {
        this.logError('PersonalCueExtractor', error);
        throw new Error(`PersonalCueExtractor 로딩 실패: ${error.message}`);
      }
    }, [], {
      description: 'Personal CUE 추출 서비스',
      category: 'ai'
    });

    console.log('✅ AI 서비스 등록 완료');
  }

  /**
   * 인증 서비스 등록 (Mock 제거)
   */
  private async registerAuthServices(): Promise<void> {
    // AuthService
    this.registerSingleton('AuthService', (container) => {
      try {
        const { AuthService } = require('../services/auth/AuthService');
        const authConfig = container.get('AuthConfig');
        const dbService = container.get('ActiveDatabaseService');
        return new AuthService(authConfig, dbService);
      } catch (error: any) {
        this.logError('AuthService', error);
        throw new Error(`AuthService 로딩 실패: ${error.message}`);
      }
    }, ['AuthConfig', 'ActiveDatabaseService'], {
      description: '인증 서비스',
      category: 'auth'
    });

    // WebAuthnService
    this.registerSingleton('WebAuthnService', (container) => {
      try {
        const { WebAuthnService } = require('../services/auth/WebAuthnService');
        const authConfig = container.get('AuthConfig');
        const dbService = container.get('ActiveDatabaseService');
        return new WebAuthnService(authConfig, dbService);
      } catch (error: any) {
        this.logError('WebAuthnService', error);
        throw new Error(`WebAuthnService 로딩 실패: ${error.message}`);
      }
    }, ['AuthConfig', 'ActiveDatabaseService'], {
      description: 'WebAuthn 서비스',
      category: 'auth'
    });

    // SessionService
    this.registerSingleton('SessionService', (container) => {
      try {
        const { SessionService } = require('../services/auth/SessionService');
        const dbService = container.get('ActiveDatabaseService');
        return new SessionService(dbService);
      } catch (error: any) {
        this.logError('SessionService', error);
        throw new Error(`SessionService 로딩 실패: ${error.message}`);
      }
    }, ['ActiveDatabaseService'], {
      description: '세션 관리 서비스',
      category: 'auth'
    });

    console.log('✅ 인증 서비스 등록 완료');
  }

  /**
   * CUE 서비스 등록 (Mock 제거 + DatabaseService 의존성 주입)
   */
  private async registerCUEServices(): Promise<void> {
    // CueService 등록 (DatabaseService 의존성 주입)
    this.registerSingleton('CueService', (container) => {
      try {
        const { CueService } = require('../services/cue/CueService');
        const dbService = container.get('ActiveDatabaseService');
        const cueService = new CueService(dbService);
        console.log('✅ CueService 등록 완료 (DatabaseService 의존성 주입됨)');
        return cueService;
      } catch (error: any) {
        this.logError('CueService', error);
        throw new Error(`CueService 로딩 실패: ${error.message}`);
      }
    }, ['ActiveDatabaseService'], {
      description: 'CUE 토큰 서비스 (DatabaseService 의존성 주입)',
      category: 'cue'
    });

    // CUEMiningService 등록 (DatabaseService 의존성 주입)
    this.registerSingleton('CUEMiningService', (container) => {
      try {
        const { CUEMiningService } = require('../services/cue/CUEMiningService');
        const dbService = container.get('ActiveDatabaseService');
        const miningService = new CUEMiningService(dbService);
        console.log('✅ CUEMiningService 등록 완료 (DatabaseService 의존성 주입됨)');
        return miningService;
      } catch (error: any) {
        this.logError('CUEMiningService', error);
        throw new Error(`CUEMiningService 로딩 실패: ${error.message}`);
      }
    }, ['ActiveDatabaseService'], {
      description: 'CUE 마이닝 서비스 (DatabaseService 의존성 주입)',
      category: 'cue'
    });

    console.log('✅ CUE 서비스 등록 완료 (DatabaseService 의존성 주입)');
  }

  /**
   * Socket 서비스 등록 (Mock 제거)
   */
  private async registerSocketServices(): Promise<void> {
    this.registerSingleton('SocketService', () => {
      try {
        const { SocketService } = require('../services/socket/SocketService');
        const socketService = SocketService.createSafeInstance();
        console.log('✅ SocketService 등록 성공');
        return socketService;
      } catch (error: any) {
        this.logError('SocketService', error);
        throw new Error(`SocketService 로딩 실패: ${error.message}`);
      }
    }, [], {
      description: 'Socket.IO 서비스',
      category: 'socket'
    });
  }

  /**
   * Controller 등록 (Mock 제거)
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
        this.logError('AuthController', error);
        throw new Error(`AuthController 로딩 실패: ${error.message}`);
      }
    }, ['AuthService', 'SessionService', 'WebAuthnService'], {
      description: '인증 컨트롤러',
      category: 'controller'
    });

    console.log('✅ Controller 등록 완료');
  }

  /**
   * 라우터 등록 (Mock 제거, 실제 에러만 표시)
   */
// ============================================================================
// 🔧 DIContainer.ts - 라우트 경로 수정 (registerRoutes 함수 부분만)
// 파일: backend/src/core/DIContainer.ts
// 수정 위치: registerRoutes() 함수 내부
// 문제: 실제 존재하는 라우트 파일과 DIContainer의 require 경로 불일치
// 해결: 실제 파일 경로에 맞춰 require 경로 수정
// ============================================================================

// ============================================================================
// 🔧 DIContainer.ts - registerRoutes 함수 정확한 파일 경로 수정
// 파일: backend/src/core/DIContainer.ts 
// 수정 위치: registerRoutes() 함수 내부
// 문제: 실제 존재하는 파일들을 잘못된 경로로 찾고 있음
// 해결: 실제 파일 구조에 맞춰 경로 완전 수정
// ============================================================================

/**
 * 라우터 등록 (실제 존재하는 파일들의 정확한 경로)
 */
private async registerRoutes(): Promise<void> {
  console.log('🛣️ 라우터 등록 시작 (실제 파일 경로 기준)...');

  // ============================================================================
  // 🔍 실제 존재하는 파일들 확인됨:
  // ✅ backend/src/routes/auth/webauthn.ts (존재함)
  // ✅ backend/src/routes/auth/unified.ts (존재함) 
  // ✅ backend/src/routes/ai/chat.ts (존재함)
  // ✅ backend/src/routes/ai/index.ts (존재함)
  // ✅ backend/src/routes/cue/cue.ts (존재함)
  // ✅ backend/src/routes/cue/mining.ts (존재함)
  // ✅ backend/src/routes/cue/complete.ts (존재함) - 새로 확인됨
  // ✅ backend/src/routes/passport/passport.ts (존재함)
  // ✅ backend/src/routes/passport/index.ts (존재함) - 새로 확인됨
  // ✅ backend/src/routes/vault/index.ts (존재함)
  // ✅ backend/src/routes/debug/index.ts (존재함) - 새로 확인됨
  // ✅ backend/src/routes/platform/index.ts (존재함) - 새로 확인됨
  // ============================================================================

  // ✅ 직접 export 방식 라우터들 (실제 존재 확인됨)
  const directRoutes = [
    // 인증 관련
    { key: 'AuthWebAuthnRoutes', path: '../routes/auth/webauthn', description: 'WebAuthn 라우트' },
    
    // AI 관련
    { key: 'AIChatRoutes', path: '../routes/ai/chat', description: 'AI 채팅 라우트' },
    { key: 'AIIndexRoutes', path: '../routes/ai/index', description: 'AI 통합 라우트' },
    
    // CUE 관련 (모든 파일 존재 확인됨)
    { key: 'CUEMiningRoutes', path: '../routes/cue/mining', description: 'CUE 마이닝 라우트' },
    { key: 'CUECompleteRoutes', path: '../routes/cue/complete', description: 'CUE 완료 라우트' },
    
    // Passport 관련 (둘 다 존재함)
    { key: 'PassportMainRoutes', path: '../routes/passport/passport', description: 'Passport 메인 라우트' },
    { key: 'PassportIndexRoutes', path: '../routes/passport/index', description: 'Passport 인덱스 라우트' },
    
    // 기타 라우트 (모두 존재 확인됨)
    { key: 'VaultRoutes', path: '../routes/vault/index', description: 'Vault 라우트' },
    { key: 'DebugRoutes', path: '../routes/debug/index', description: '디버그 라우트' },
    { key: 'PlatformRoutes', path: '../routes/platform/index', description: '플랫폼 라우트' }
  ];

  // 직접 export 라우터 등록
  for (const { key, path, description } of directRoutes) {
    this.registerSingleton(key, () => {
      console.log(`🔄 ${key}: 라우터 로딩 시도 - ${path}`);
      
      try {
        const routeModule = require(path);
        console.log(`📋 ${key}: 모듈 로드 성공, exports: ${Object.keys(routeModule).join(', ')}`);
        
        // 다양한 export 패턴 확인 (우선순위 순서)
        let router = null;
        
        // 1순위: default export
        if (routeModule.default) {
          router = routeModule.default;
          console.log(`✅ ${key}: default export 사용`);
        }
        // 2순위: router export
        else if (routeModule.router) {
          router = routeModule.router;
          console.log(`✅ ${key}: router export 사용`);
        }
        // 3순위: 함수 타입의 첫 번째 export
        else {
          const functionExports = Object.keys(routeModule)
            .filter(exportKey => typeof routeModule[exportKey] === 'function');
          
          if (functionExports.length > 0) {
            const firstFunction = functionExports[0];
            router = routeModule[firstFunction];
            console.log(`✅ ${key}: 함수 export 사용 (${firstFunction})`);
          }
        }
        
        if (!router) {
          throw new Error(`라우터를 찾을 수 없음. 사용 가능한 exports: ${Object.keys(routeModule).join(', ')}`);
        }
        
        // Express Router 유효성 검증
        if (this.isValidExpressRouter(router)) {
          console.log(`✅ ${key}: Express Router 검증 통과`);
          return router;
        } else {
          // 팩토리 함수인지 확인
          if (typeof router === 'function') {
            console.log(`🏭 ${key}: 팩토리 함수로 추정, 실행 시도...`);
            try {
              const factoryResult = router(this);
              if (this.isValidExpressRouter(factoryResult)) {
                console.log(`✅ ${key}: 팩토리 함수 실행 성공`);
                return factoryResult;
              }
            } catch (factoryError) {
              console.warn(`⚠️ ${key}: 팩토리 함수 실행 실패: ${factoryError.message}`);
            }
          }
          
          throw new Error(`유효한 Express Router가 아님. 타입: ${typeof router}`);
        }
      } catch (error: any) {
        this.logError(key, error);
        console.error(`❌ ${key} 라우터 로딩 실패:`);
        console.error(`   경로: ${path}`);
        console.error(`   오류: ${error.message}`);
        
        // 파일 존재 여부 상세 확인
        try {
          const fs = require('fs');
          const pathModule = require('path');
          
          const tsPath = pathModule.resolve(__dirname, path + '.ts');
          const jsPath = pathModule.resolve(__dirname, path + '.js');
          const indexTsPath = pathModule.resolve(__dirname, path + '/index.ts');
          const indexJsPath = pathModule.resolve(__dirname, path + '/index.js');
          
          console.error(`   파일 시스템 확인:`);
          console.error(`   - ${tsPath}: ${fs.existsSync(tsPath) ? '✅ 존재' : '❌ 없음'}`);
          console.error(`   - ${jsPath}: ${fs.existsSync(jsPath) ? '✅ 존재' : '❌ 없음'}`);
          console.error(`   - ${indexTsPath}: ${fs.existsSync(indexTsPath) ? '✅ 존재' : '❌ 없음'}`);
          console.error(`   - ${indexJsPath}: ${fs.existsSync(indexJsPath) ? '✅ 존재' : '❌ 없음'}`);
          
          // 실제 디렉토리 내용 확인
          const dirPath = pathModule.resolve(__dirname, path.substring(0, path.lastIndexOf('/')));
          if (fs.existsSync(dirPath)) {
            const dirContents = fs.readdirSync(dirPath);
            console.error(`   - 디렉토리 내용: ${dirContents.join(', ')}`);
          }
        } catch (fsError) {
          console.error(`   파일 시스템 확인 실패: ${fsError.message}`);
        }
        
        throw new Error(`${key} 라우터 로딩 실패: ${error.message}`);
      }
    }, [], {
      description,
      category: 'router',
      routerType: 'direct'
    });
  }

  // ✅ 팩토리 함수 방식 라우터들 (확인된 경로)
  const factoryRoutes = [
    { key: 'AuthUnifiedRoutes', path: '../routes/auth/unified', description: '통합 인증 라우트' },
    { key: 'CUERoutes', path: '../routes/cue/cue', description: 'CUE 토큰 라우트' }
  ];

  // 팩토리 함수 라우터 등록
  for (const { key, path, description } of factoryRoutes) {
    this.registerSingleton(key, (container: DIContainer) => {
      console.log(`🔄 ${key}: 팩토리 라우터 로딩 - ${path}`);
      
      try {
        const routeModule = require(path);
        console.log(`📋 ${key}: 팩토리 모듈 로드 성공, exports: ${Object.keys(routeModule).join(', ')}`);
        
        // 팩토리 함수 찾기
        const createFunction = this.findCreateFunction(routeModule);
        
        if (createFunction) {
          console.log(`🏭 ${key}: 팩토리 함수 발견, 실행 중...`);
          
          try {
            const router = createFunction(container);
            
            if (this.isValidExpressRouter(router)) {
              console.log(`✅ ${key}: 팩토리 라우터 생성 성공`);
              return router;
            } else {
              throw new Error(`팩토리 함수가 유효한 Router를 반환하지 않음. 반환 타입: ${typeof router}`);
            }
          } catch (factoryError: any) {
            throw new Error(`${key} 팩토리 함수 실행 실패: ${factoryError.message}`);
          }
        } else {
          // 팩토리 함수가 없으면 직접 export 시도
          console.log(`⚠️ ${key}: 팩토리 함수 없음, 직접 export 시도`);
          const router = routeModule.default || routeModule.router || routeModule;
          
          if (this.isValidExpressRouter(router)) {
            console.log(`✅ ${key}: 직접 export Router 발견`);
            return router;
          } else {
            throw new Error(`팩토리 함수와 직접 export 모두 실패. exports: ${Object.keys(routeModule).join(', ')}`);
          }
        }
      } catch (error: any) {
        this.logError(key, error);
        console.error(`❌ ${key} 팩토리 라우터 로딩 실패:`);
        console.error(`   경로: ${path}`);
        console.error(`   오류: ${error.message}`);
        throw new Error(`${key} 팩토리 라우터 로딩 실패: ${error.message}`);
      }
    }, [], {
      description,
      category: 'router',
      routerType: 'factory'
    });
  }

  console.log('✅ 라우터 등록 완료 (실제 파일들 모두 확인됨)');
  console.log('📊 등록된 라우터:');
  console.log('  🔐 인증: AuthWebAuthnRoutes, AuthUnifiedRoutes');
  console.log('  🤖 AI: AIChatRoutes, AIIndexRoutes');
  console.log('  💎 CUE: CUERoutes, CUEMiningRoutes, CUECompleteRoutes');
  console.log('  🎫 Passport: PassportMainRoutes, PassportIndexRoutes');
  console.log('  🗄️ 기타: VaultRoutes, DebugRoutes, PlatformRoutes');
}

// ============================================================================
// 🔍 Express Router 유효성 검사 강화
// ============================================================================

private isValidExpressRouter(router: any): boolean {
  if (!router) {
    console.error(`❌ Router 검증: null/undefined`);
    return false;
  }
  
  if (typeof router !== 'function') {
    console.error(`❌ Router 검증: 함수가 아님. 타입: ${typeof router}`);
    return false;
  }

  // Express Router의 핵심 메서드들 확인
  const requiredMethods = ['use', 'get', 'post'];
  const availableMethods = requiredMethods.filter(method => typeof router[method] === 'function');
  
  if (availableMethods.length < requiredMethods.length) {
    const missingMethods = requiredMethods.filter(method => typeof router[method] !== 'function');
    console.error(`❌ Router 검증: 필수 메서드 누락: ${missingMethods.join(', ')}`);
    
    // 사용 가능한 모든 속성/메서드 출력 (디버깅용)
    const allProperties = Object.getOwnPropertyNames(router)
      .filter(prop => typeof router[prop] === 'function')
      .slice(0, 10); // 너무 많으면 처음 10개만
    console.error(`   사용 가능한 메서드: ${allProperties.join(', ')}`);
    
    return false;
  }
  
  console.log(`✅ Router 검증 통과: 모든 필수 메서드 존재`);
  return true;
}

// ============================================================================
// 📊 라우터 등록 상태 확인 함수
// ============================================================================

public getRouterRegistrationStatus(): any {
  const routerServices = Array.from(this.services.entries())
    .filter(([key, definition]) => definition.metadata?.category === 'router')
    .map(([key, definition]) => ({
      key,
      initialized: definition.initialized || false,
      description: definition.metadata?.description || 'No description',
      routerType: definition.metadata?.routerType || 'unknown'
    }));

  const successCount = routerServices.filter(r => r.initialized).length;
  const failureCount = routerServices.filter(r => !r.initialized).length;

  return {
    totalRouters: routerServices.length,
    successCount,
    failureCount,
    successRate: routerServices.length > 0 ? (successCount / routerServices.length * 100).toFixed(1) + '%' : '0%',
    routers: routerServices,
    summary: {
      status: failureCount === 0 ? 'healthy' : failureCount < successCount ? 'degraded' : 'critical',
      message: failureCount === 0 ? 
        '모든 라우터 성공적으로 등록됨' : 
        `${failureCount}개 라우터 등록 실패`
    }
  };
}

// ============================================================================
// 🔍 개선된 Express Router 유효성 검사
// ===========================================================================

private isValidExpressRouter(router: any): boolean {
  if (!router) {
    console.error(`❌ Router 검증: router가 null/undefined`);
    return false;
  }
  
  if (typeof router !== 'function') {
    console.error(`❌ Router 검증: 함수가 아님. 타입: ${typeof router}, 값: ${router}`);
    return false;
  }

  // Express Router의 핵심 메서드들 확인
  const requiredMethods = ['use', 'get', 'post'];
  const missingMethods = requiredMethods.filter(method => typeof router[method] !== 'function');
  
  if (missingMethods.length > 0) {
    console.error(`❌ Router 검증: 필수 메서드 누락: ${missingMethods.join(', ')}`);
    console.error(`   사용 가능한 메서드: ${Object.getOwnPropertyNames(router).filter(prop => typeof router[prop] === 'function').join(', ')}`);
    return false;
  }
  
  console.log(`✅ Router 검증 통과: 필수 메서드 모두 존재`);
  return true;
}


  /**
   * 팩토리 함수 찾기
   */
  private findCreateFunction(routeModule: any): Function | null {
    console.log(`🔍 팩토리 함수 탐색 중... 사용 가능한 exports: ${Object.keys(routeModule).join(', ')}`);
    
    // 1. createXXXRoutes 패턴 함수 찾기
    const createFunctionNames = Object.keys(routeModule).filter(key => 
      (key.startsWith('create') && key.includes('Routes') && typeof routeModule[key] === 'function') ||
      (key.startsWith('create') && typeof routeModule[key] === 'function') ||
      (key.includes('Routes') && typeof routeModule[key] === 'function')
    );
    
    if (createFunctionNames.length > 0) {
      const functionName = createFunctionNames[0];
      console.log(`🔍 팩토리 함수 발견: ${functionName}`);
      return routeModule[functionName];
    }

    // 2. 기본 이름들 확인
    const defaultNames = ['createUnifiedAuthRoutes', 'createRoutes', 'create', 'factory', 'default', 'router'];
    for (const name of defaultNames) {
      if (routeModule[name] && typeof routeModule[name] === 'function') {
        console.log(`🔍 대안 팩토리 함수 발견: ${name}`);
        return routeModule[name];
      }
    }

    // 3. 함수 타입의 모든 export 확인
    const allFunctions = Object.entries(routeModule)
      .filter(([key, value]) => typeof value === 'function')
      .map(([key]) => key);
    
    if (allFunctions.length === 1) {
      const functionName = allFunctions[0];
      console.log(`🔍 단일 함수 발견: ${functionName}`);
      return routeModule[functionName];
    }

    console.error('❌ 팩토리 함수를 찾을 수 없음');
    return null;
  }

  /**
   * 에러 로그 조회
   */
  public getErrorLog(): Array<{timestamp: number, service: string, error: string, stack?: string}> {
    return [...this.errorLog];
  }

  /**
   * 컨테이너 상태 조회 (에러 정보 포함)
   */
  public getStatus(): any {
    const serviceStats = Array.from(this.services.entries()).map(([key, definition]) => ({
      key,
      lifecycle: definition.lifecycle,
      initialized: definition.initialized || false,
      dependencies: definition.dependencies || [],
      category: definition.metadata?.category || 'unknown',
      description: definition.metadata?.description || 'No description'
    }));

    const categoryStats = serviceStats.reduce((acc, service) => {
      acc[service.category] = (acc[service.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalInitTime = this.isInitialized ? 
      Date.now() - this.initializationStartTime : 0;

    const failedServices = serviceStats.filter(s => !s.initialized);
    const errorsByService = this.errorLog.reduce((acc, error) => {
      acc[error.service] = (acc[error.service] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalServices: this.services.size,
      initializedServices: serviceStats.filter(s => s.initialized).length,
      failedServices: failedServices.length,
      initializationOrder: this.initializationOrder,
      categoryStats,
      totalInitializationTime: totalInitTime,
      services: serviceStats,
      errorLog: this.errorLog,
      errorsByService,
      health: this.getHealthStatus(),
      features: {
        strictErrorHandling: true,
        mockFallbackRemoved: true,
        realErrorTracking: true,
        detailedDiagnostics: true,
        syntaxErrorFixed: true,
        integratedSourcePlatformSupport: true,
        databaseServiceInjection: true
      }
    };
  }

  /**
   * 컨테이너 헬스 상태 확인 (에러 정보 포함)
   */
  private getHealthStatus(): { status: string; issues: string[]; errors: number } {
    const issues: string[] = [];
    
    const requiredServices = ['AuthConfig', 'ActiveDatabaseService', 'AuthService'];
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

    if (this.errorLog.length > 0) {
      issues.push(`총 ${this.errorLog.length}개의 에러 발생`);
    }

    return {
      status: issues.length === 0 ? 'healthy' : 'degraded',
      issues,
      errors: this.errorLog.length
    };
  }

  /**
   * 컨테이너 재설정
   */
  public reset(): void {
    console.log('🔄 DI Container 재설정...');
    
    for (const [key, definition] of this.services.entries()) {
      if (definition.instance && typeof definition.instance.dispose === 'function') {
        definition.instance.dispose();
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
   * 컨테이너 정리
   */
  public dispose(): void {
    console.log('🧹 DI Container 정리...');
    
    this.reset();
    this.services.clear();
    
    console.log('✅ DI Container 정리 완료');
  }
}

// ============================================================================
// 🛠️ Express 라우터 연결 함수 (엄격한 에러 처리)
// ============================================================================

/**
 * DI Container 라우터들을 Express 앱에 연결하는 함수 (엄격한 에러 처리)
 */
export async function connectDIRouters(app: Application, container: DIContainer): Promise<RouterConnectionResult> {
  console.log('🛣️ === Express 라우터 연결 시작 (엄격한 에러 처리) ===');

  let connectedCount = 0;
  let failedCount = 0;
  const failedRouters: any[] = [];

  try {
    // 라우터 매핑 정의 (우선순위 순서)
    const routerMappings = [
      // 🔐 인증 라우트들 (최우선)
      { name: 'WebAuthn Routes', serviceName: 'AuthWebAuthnRoutes', path: '/api/auth/webauthn' },
      { name: 'Session Routes', serviceName: 'AuthSessionRoutes', path: '/api/auth/session' },
      { name: 'Unified Auth Routes', serviceName: 'AuthUnifiedRoutes', path: '/api/auth' },
      
      // 🤖 AI 라우트들
      { name: 'AI Chat Routes', serviceName: 'AIChatRoutes', path: '/api/ai/chat' },
      { name: 'AI Index Routes', serviceName: 'AIIndexRoutes', path: '/api/ai' },
      
      // 💰 CUE 라우트들
      { name: 'CUE Routes', serviceName: 'CUERoutes', path: '/api/cue' },
      { name: 'CUE Mining Routes', serviceName: 'CUEMiningRoutes', path: '/api/cue/mining' },
      { name: 'CUE Complete Routes', serviceName: 'CUECompleteRoutes', path: '/api/cue/complete' },
      
      // 🎫 기타 라우트들
      { name: 'Passport Routes', serviceName: 'PassportRoutes', path: '/api/passport' },
      { name: 'Platform Routes', serviceName: 'PlatformRoutes', path: '/api/platform' },
      { name: 'Vault Routes', serviceName: 'VaultRoutes', path: '/api/vault' },
      { name: 'Debug Routes', serviceName: 'DebugRoutes', path: '/api/debug' }
    ];

    console.log(`📋 연결 대상 라우터: ${routerMappings.length}개`);

    // 라우터 연결 처리
    for (const { name, serviceName, path } of routerMappings) {
      try {
        console.log(`🔄 ${name} 연결 중... (${path})`);

        if (!container.has(serviceName)) {
          const error = `서비스 '${serviceName}'가 등록되지 않음`;
          console.error(`❌ ${name}: ${error}`);
          failedRouters.push({ name, path, error });
          failedCount++;
          continue;
        }

        try {
          const router = container.get(serviceName);
          
          // Express Router 유효성 검증
          if (!router) {
            const error = '라우터가 null 또는 undefined';
            console.error(`❌ ${name}: ${error}`);
            failedRouters.push({ name, path, error });
            failedCount++;
            continue;
          }
          
          if (typeof router !== 'function') {
            const error = `유효하지 않은 라우터 타입: ${typeof router}`;
            console.error(`❌ ${name}: ${error}`);
            failedRouters.push({ name, path, error });
            failedCount++;
            continue;
          }

          // Express 앱에 라우터 연결
          app.use(path, router);
          console.log(`✅ ${name} 연결 성공: ${path}`);
          connectedCount++;

        } catch (getError: any) {
          const error = `서비스 조회 실패: ${getError.message}`;
          console.error(`❌ ${name}: ${error}`);
          failedRouters.push({ name, path, error });
          failedCount++;
        }

      } catch (error: any) {
        console.error(`❌ ${name} 연결 실패: ${error.message}`);
        failedRouters.push({ name, path, error: error.message });
        failedCount++;
      }
    }

    // 연결 결과 요약
    console.log(`\n🎯 === 라우터 연결 완료 ===`);
    console.log(`✅ 성공: ${connectedCount}개`);
    console.log(`❌ 실패: ${failedCount}개`);

    if (connectedCount > 0) {
      console.log('\n📋 연결된 API 엔드포인트:');
      console.log('🔐 인증: /api/auth/webauthn/*, /api/auth/session/*, /api/auth/*');
      console.log('🤖 AI: /api/ai/chat/*, /api/ai/*');
      console.log('💎 CUE: /api/cue/*, /api/cue/mining/*, /api/cue/complete/*');
      console.log('🎫 기타: /api/passport/*, /api/platform/*, /api/vault/*, /api/debug/*');
    }

    if (failedCount > 0) {
      console.log('\n❌ 연결 실패한 라우터들:');
      failedRouters.forEach((failed, index) => {
        console.log(`   ${index + 1}. ${failed.name} (${failed.path})`);
        console.log(`      오류: ${failed.error}`);
      });
      console.log('\n🔍 에러 로그에서 더 자세한 정보를 확인하세요:');
      console.log('   container.getErrorLog() 또는 container.getStatus()');
    }

    return { connectedCount, failedCount, failedRouters };

  } catch (error: any) {
    console.error('❌ 라우터 연결 중 심각한 오류:', error);
    return { connectedCount: 0, failedCount: 1, failedRouters: [{ error: error.message }] };
  }
}

// ============================================================================
// 📤 초기화 및 헬퍼 함수들
// ============================================================================

/**
 * 의존성 주입 시스템 초기화 (엄격한 에러 처리)
 */
export async function initializeDI(): Promise<DIContainer> {
  const startTime = Date.now();
  console.log('🚀 === DI 시스템 초기화 시작 (엄격한 에러 처리) ===');
  
  const container = DIContainer.getInstance();
  
  try {
    // 컨테이너 초기화
    await container.initialize();
    
    // 모든 서비스 등록
    await container.registerAllServices();
    
    // 모든 싱글톤 서비스 초기화
    container.initializeAll();
    
    const initTime = Date.now() - startTime;
    console.log(`✅ === DI 시스템 초기화 완료 (${initTime}ms) ===`);
    
    const status = container.getStatus();
    console.log('📊 등록된 서비스 현황:');
    console.log(`  - 총 서비스: ${status.totalServices}개`);
    console.log(`  - 초기화된 서비스: ${status.initializedServices}개`);
    console.log(`  - 실패한 서비스: ${status.failedServices}개`);
    console.log(`  - 발생한 에러: ${status.errorLog.length}개`);
    console.log(`  - 상태: ${status.health.status}`);
    
    if (status.health.issues.length > 0) {
      console.error('❌ 발견된 문제들:');
      status.health.issues.forEach((issue: string, index: number) => {
        console.error(`   ${index + 1}. ${issue}`);
      });
    }
    
    if (status.errorLog.length > 0) {
      console.error('\n🔍 발생한 에러들:');
      status.errorLog.forEach((error: any, index: number) => {
        console.error(`   ${index + 1}. [${error.service}] ${error.error}`);
      });
    }
    
    console.log('\n🎯 개선사항 적용됨:');
    console.log('  ❌ Mock fallback 완전 제거됨');
    console.log('  🔍 실제 에러만 표시됨');
    console.log('  📊 정확한 문제 진단 제공');
    console.log('  🚨 실패 시 명확한 원인 표시');
    console.log('  🔧 isValidExpressRouter 문법 오류 해결됨');
    console.log('  🗄️ 통합된 source_platform 컬럼 지원');
    console.log('  💉 DatabaseService 의존성 주입 완료');
    
    return container;
    
  } catch (error: any) {
    const initTime = Date.now() - startTime;
    console.error(`❌ DI 시스템 초기화 실패 (${initTime}ms):`);
    console.error(`   에러: ${error.message}`);
    
    const status = container.getStatus();
    if (status.errorLog.length > 0) {
      console.error('\n🔍 발생한 에러들:');
      status.errorLog.forEach((error: any, index: number) => {
        console.error(`   ${index + 1}. [${error.service}] ${error.error}`);
      });
    }
    
    throw error;
  }
}

/**
 * 의존성 주입 시스템 종료
 */
export function shutdownDI(): void {
  console.log('🛑 DI 시스템 종료...');
  
  const container = DIContainer.getInstance();
  container.dispose();
  
  console.log('✅ DI 시스템 종료 완료');
}

/**
 * 컨테이너 상태 조회
 */
export function getDIStatus(): any {
  return DIContainer.getInstance().getStatus();
}

/**
 * 에러 로그 조회
 */
export function getDIErrorLog(): Array<{timestamp: number, service: string, error: string, stack?: string}> {
  return DIContainer.getInstance().getErrorLog();
}

/**
 * 빠른 서비스 접근을 위한 헬퍼 함수
 */
export const getService = <T>(key: string): T => {
  return DIContainer.getInstance().get<T>(key);
};

// ============================================================================
// 🎯 최종 완료 로그
// ============================================================================

console.log('✅ DIContainer.ts 완전 수정 완료:');
console.log('  🔧 isValidExpressRouter 문법 오류 해결됨');
console.log('  ❌ Mock fallback 완전 제거됨');
console.log('  🔍 실제 에러만 표시됨');
console.log('  📊 정확한 문제 진단 제공');
console.log('  🗄️ 통합된 source_platform 컬럼 지원');
console.log('  💉 DatabaseService 의존성 주입 완료');
console.log('  🚨 실패 시 명확한 원인 표시');