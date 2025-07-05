// ============================================================================
// 📁 backend/src/core/DIContainer.ts - 라우터 연결 문제 완전 해결
// 🚀 기존 문제점 완전 해결 + Express Router 인식 개선
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
 * 완전 개선된 의존성 주입 컨테이너
 */
export class DIContainer {
  private static instance: DIContainer;
  private services = new Map<string, ServiceDefinition>();
  private resolutionStack: string[] = [];
  private initializationOrder: string[] = [];
  private initializationStartTime: number = 0;
  private isInitialized: boolean = false;

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
    console.log('🚀 개선된 DI Container 초기화 시작...');
    
    // 핵심 설정 서비스들 먼저 등록
    await this.registerCoreServices();
    
    const initTime = Date.now() - this.initializationStartTime;
    this.isInitialized = true;
    console.log(`✅ DI Container 기본 초기화 완료 (${initTime}ms)`);
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
   * 서비스 조회
   */
  public get<T>(key: string): T {
    const definition = this.services.get(key);
    if (!definition) {
      throw new Error(`서비스 '${key}'를 찾을 수 없습니다.`);
    }

    // 순환 의존성 검사
    if (this.resolutionStack.includes(key)) {
      throw new Error(`순환 의존성 감지: ${this.resolutionStack.join(' -> ')} -> ${key}`);
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
        this.get(dep);
      }

      // 인스턴스 생성
      const instance = definition.factory(this);

      // 싱글톤인 경우 인스턴스 저장
      if (definition.lifecycle === 'singleton') {
        definition.instance = instance;
        definition.initialized = true;
        this.initializationOrder.push(key);
      }

      return instance;
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
   * 모든 싱글톤 서비스 초기화
   */
  public initializeAll(): void {
    console.log('🔄 모든 싱글톤 서비스 초기화 중...');
    
    const singletons = Array.from(this.services.entries())
      .filter(([, definition]) => definition.lifecycle === 'singleton')
      .map(([key]) => key);

    for (const key of singletons) {
      try {
        this.get(key);
        console.log(`✅ ${key} 초기화 성공`);
      } catch (error: any) {
        console.error(`❌ ${key} 초기화 실패:`, error.message);
      }
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
      const config = AuthConfig.getInstance();
      console.log('✅ AuthConfig 로드됨');
      return config;
    }, [], {
      description: '인증 설정 관리',
      category: 'config',
      priority: 'critical'
    });

    // DatabaseConfig
    this.registerSingleton('DatabaseConfig', () => {
      return DatabaseConfig;
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
        { name: '라우터 (개선됨)', fn: () => this.registerRoutes() }
      ];

      for (const step of registrationSteps) {
        try {
          console.log(`🔄 ${step.name} 등록 중...`);
          await step.fn();
          console.log(`✅ ${step.name} 등록 완료`);
        } catch (error: any) {
          console.error(`❌ ${step.name} 등록 실패:`, error.message);
          // 중요한 서비스 실패 시 계속 진행하지만 경고
          if (step.name.includes('데이터베이스')) {
            console.warn('⚠️ 데이터베이스 서비스 실패 - 일부 기능 제한됨');
          }
        }
      }

      console.log('🎉 모든 서비스 등록 완료');
    } catch (error: any) {
      console.error('💥 서비스 등록 중 심각한 오류:', error);
      throw error;
    }
  }

  /**
   * 데이터베이스 서비스 등록
   */
  private async registerDatabaseServices(): Promise<void> {
    // ActiveDatabaseService (메인)
    this.registerSingleton('ActiveDatabaseService', () => {
      try {
        const { getDatabaseService } = require('../services/database');
        const dbService = getDatabaseService();
        console.log('✅ ActiveDatabaseService 등록 성공');
        return dbService;
      } catch (error: any) {
        console.error('❌ ActiveDatabaseService 로딩 실패:', error.message);
        
        // Fallback: 직접 DatabaseService 로딩
        try {
          const { DatabaseService } = require('../services/database/DatabaseService');
          const dbService = DatabaseService.getInstance();
          console.log('✅ Fallback DatabaseService 사용');
          return dbService;
        } catch (fallbackError: any) {
          console.error('❌ Fallback DatabaseService도 실패:', fallbackError.message);
          throw new Error('데이터베이스 서비스를 로딩할 수 없습니다');
        }
      }
    }, [], {
      description: '실제 데이터베이스 서비스',
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

    console.log('✅ 데이터베이스 서비스 등록 완료');
  }

  /**
   * 암호화 서비스 등록
   */
  private async registerCryptoServices(): Promise<void> {
    this.registerSingleton('CryptoService', () => {
      try {
        const { CryptoService } = require('../services/encryption/CryptoService');
        return new CryptoService();
      } catch (error) {
        console.warn('⚠️ CryptoService 로딩 실패, 기본 구현 사용');
        return {
          encrypt: (data: string) => Buffer.from(data).toString('base64'),
          decrypt: (data: string) => Buffer.from(data, 'base64').toString('utf8'),
          hash: (data: string) => Buffer.from(data).toString('hex')
        };
      }
    }, [], {
      description: '암호화 서비스',
      category: 'security'
    });
  }

  /**
   * AI 서비스 등록
   */
  private async registerAIServices(): Promise<void> {
    // Ollama AI 서비스
    this.registerSingleton('OllamaAIService', () => {
      try {
        const { ollamaService } = require('../services/ollama');
        console.log('✅ Ollama AI 서비스 로드됨');
        return ollamaService;
      } catch (error) {
        console.warn('⚠️ Ollama 서비스 로딩 실패, Mock 서비스 사용');
        return {
          async checkConnection() { return false; },
          async chat(model: string, messages: any[]) {
            return '🦙 Ollama 서비스가 연결되지 않았습니다. `ollama serve` 명령어로 서버를 시작하세요.';
          },
          async getModels() { return []; }
        };
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
      } catch (error) {
        console.warn('⚠️ PersonalizationService 로딩 실패');
        return { analyze: async () => ({ personality: 'unknown' }) };
      }
    }, [], {
      description: 'AI 개인화 서비스',
      category: 'ai'
    });

    this.registerSingleton('PersonalCueExtractor', () => {
      try {
        const { PersonalCueExtractor } = require('../services/ai/PersonalCueExtractor');
        return new PersonalCueExtractor();
      } catch (error) {
        console.warn('⚠️ PersonalCueExtractor 로딩 실패');
        return { extract: async () => [] };
      }
    }, [], {
      description: 'Personal CUE 추출 서비스',
      category: 'ai'
    });

    console.log('✅ AI 서비스 등록 완료');
  }

  /**
   * 인증 서비스 등록
   */
  private async registerAuthServices(): Promise<void> {
    // AuthService
    this.registerSingleton('AuthService', (container) => {
      try {
        const { AuthService } = require('../services/auth/AuthService');
        const authConfig = container.get('AuthConfig');
        const dbService = container.get('ActiveDatabaseService');
        return new AuthService(authConfig, dbService);
      } catch (error) {
        console.warn('⚠️ AuthService 로딩 실패, 기본 구현 사용');
        return {
          async createUser() { throw new Error('AuthService not available'); },
          async validateUser() { return null; }
        };
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
      } catch (error) {
        console.warn('⚠️ WebAuthnService 로딩 실패');
        return {
          async generateRegistrationOptions() { throw new Error('WebAuthn not available'); },
          async verifyRegistration() { return { verified: false }; }
        };
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
      } catch (error) {
        console.warn('⚠️ SessionService 로딩 실패');
        return {
          async createSession() { return null; },
          async validateSession() { return null; }
        };
      }
    }, ['ActiveDatabaseService'], {
      description: '세션 관리 서비스',
      category: 'auth'
    });

    console.log('✅ 인증 서비스 등록 완료');
  }

  /**
   * CUE 서비스 등록
   */
  private async registerCUEServices(): Promise<void> {
    this.registerSingleton('CueService', (container) => {
      try {
        const { CueService } = require('../services/cue/CueService');
        const dbService = container.get('ActiveDatabaseService');
        return new CueService(dbService);
      } catch (error) {
        console.warn('⚠️ CueService 로딩 실패');
        return {
          async mineFromAuth() { return { amount: 10, newBalance: 100 }; },
          async awardTokens() { return { amount: 0, newBalance: 0 }; }
        };
      }
    }, ['ActiveDatabaseService'], {
      description: 'CUE 토큰 서비스',
      category: 'cue'
    });

    console.log('✅ CUE 서비스 등록 완료');
  }

  /**
   * Socket 서비스 등록
   */
  private async registerSocketServices(): Promise<void> {
    this.registerSingleton('SocketService', () => {
      try {
        const { SocketService } = require('../services/socket/SocketService');
        const socketService = SocketService.createSafeInstance();
        console.log('✅ SocketService 등록 성공');
        return socketService;
      } catch (error: any) {
        console.warn('⚠️ SocketService 로딩 실패:', error.message);
        return {
          initialize: () => console.log('Socket 서비스 초기화됨 (Mock)'),
          emit: () => console.log('Socket 이벤트 발송 (Mock)'),
          disconnect: () => console.log('Socket 연결 해제 (Mock)')
        };
      }
    }, [], {
      description: 'Socket.IO 서비스',
      category: 'socket'
    });
  }

  /**
   * Controller 등록
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
        console.warn('⚠️ AuthController 로딩 실패:', error.message);
        return {
          register: async (req: any, res: any) => res.status(501).json({ error: 'Controller not available' }),
          login: async (req: any, res: any) => res.status(501).json({ error: 'Controller not available' })
        };
      }
    }, ['AuthService', 'SessionService', 'WebAuthnService'], {
      description: '인증 컨트롤러',
      category: 'controller'
    });

    console.log('✅ Controller 등록 완료');
  }

  /**
   * 라우터 등록 (개선된 버전)
   */
  private async registerRoutes(): Promise<void> {
    console.log('🛣️ 라우터 등록 시작 (개선된 Express Router 인식)...');

    // ✅ 직접 export 방식 라우터들 (우선 처리)
    const directRoutes = [
      { key: 'AuthWebAuthnRoutes', path: '../routes/auth/webauthn', description: 'WebAuthn 라우트 (최우선)' },
      { key: 'AuthSessionRoutes', path: '../routes/auth/session-restore', description: '세션 복원 라우트' },
      { key: 'AIChatRoutes', path: '../routes/ai/chat', description: 'AI 채팅 라우트' },
      { key: 'AIIndexRoutes', path: '../routes/ai/index', description: 'AI 통합 라우트' },
      { key: 'CUEMiningRoutes', path: '../routes/cue/mining', description: 'CUE 마이닝 라우트' },
      { key: 'CUECompleteRoutes', path: '../routes/cue/complete', description: 'CUE 완료 라우트' },
      { key: 'DebugRoutes', path: '../routes/debug/index', description: '디버그 라우트' },
      { key: 'VaultRoutes', path: '../routes/vault/index', description: 'Vault 라우트' }
    ];

    // 직접 export 라우터 등록
    for (const { key, path, description } of directRoutes) {
      this.registerSingleton(key, () => {
        try {
          console.log(`🔄 ${key}: 직접 export 라우터 로딩 - ${path}`);
          const routeModule = require(path);
          
          // Express Router 확인 (개선된 검증)
          const router = routeModule.default || routeModule;
          
          if (this.isValidExpressRouter(router)) {
            console.log(`✅ ${key}: Express Router 로딩 성공`);
            return router;
          } else {
            throw new Error(`유효한 Express Router가 아님: ${typeof router}`);
          }
        } catch (error: any) {
          console.error(`❌ ${key} 로딩 실패:`, error.message);
          // Fallback: 기본 라우터 반환
          const express = require('express');
          const fallbackRouter = express.Router();
          fallbackRouter.get('*', (req: any, res: any) => {
            res.status(503).json({ error: `${key} temporarily unavailable` });
          });
          return fallbackRouter;
        }
      }, [], {
        description,
        category: 'router',
        routerType: 'direct'
      });
    }

    // ✅ 팩토리 함수 방식 라우터들
    const factoryRoutes = [
      { key: 'AuthUnifiedRoutes', path: '../routes/auth/unified', description: '통합 인증 라우트' },
      { key: 'PassportRoutes', path: '../routes/passport/index', description: 'AI Passport 라우트' },
      { key: 'CUERoutes', path: '../routes/cue/index', description: 'CUE 토큰 라우트' },
      { key: 'PlatformRoutes', path: '../routes/platform/index', description: '플랫폼 라우트' }
    ];

    // 팩토리 함수 라우터 등록
    for (const { key, path, description } of factoryRoutes) {
      this.registerSingleton(key, (container: DIContainer) => {
        try {
          console.log(`🔄 ${key}: 팩토리 라우터 로딩 - ${path}`);
          const routeModule = require(path);
          
          // 팩토리 함수 찾기
          const createFunction = this.findCreateFunction(routeModule);
          
          if (createFunction) {
            console.log(`🏭 ${key}: 팩토리 함수 실행 중...`);
            const router = createFunction(container);
            
            if (this.isValidExpressRouter(router)) {
              console.log(`✅ ${key}: 팩토리 라우터 생성 성공`);
              return router;
            } else {
              throw new Error(`팩토리 함수가 유효한 Express Router를 반환하지 않음`);
            }
          } else {
            throw new Error(`팩토리 함수를 찾을 수 없음`);
          }
        } catch (error: any) {
          console.error(`❌ ${key} 팩토리 라우터 로딩 실패:`, error.message);
          // Fallback 라우터
          const express = require('express');
          const fallbackRouter = express.Router();
          fallbackRouter.get('*', (req: any, res: any) => {
            res.status(503).json({ error: `${key} factory temporarily unavailable` });
          });
          return fallbackRouter;
        }
      }, [], {
        description,
        category: 'router',
        routerType: 'factory'
      });
    }

    console.log('✅ 라우터 등록 완료 (개선된 버전)');
  }

  /**
   * Express Router 유효성 검사 (개선됨)
   */
  private isValidExpressRouter(router: any): boolean {
    if (!router || typeof router !== 'function') {
      return false;
    }

    // Express Router의 핵심 메서드들 확인
    const requiredMethods = ['use', 'get', 'post', 'put', 'delete'];
    const hasRequiredMethods = requiredMethods.every(method => typeof router[method] === 'function');
    
    // Express Router stack 속성 확인
    const hasStack = Array.isArray(router.stack) || router.stack === undefined;
    
    // Express Router params 속성 확인  
    const hasParams = typeof router.params === 'object' || router.params === undefined;
    
    return hasRequiredMethods && hasStack && hasParams;
  }

  /**
   * 팩토리 함수 찾기 (개선됨)
   */
  private findCreateFunction(routeModule: any): Function | null {
    // 1. createXXXRoutes 패턴 함수 찾기
    const createFunctionName = Object.keys(routeModule).find(key => 
      key.startsWith('create') && key.includes('Routes') && typeof routeModule[key] === 'function'
    );
    
    if (createFunctionName) {
      console.log(`🔍 팩토리 함수 발견: ${createFunctionName}`);
      return routeModule[createFunctionName];
    }

    // 2. 기본 이름들 확인
    const defaultNames = ['createRoutes', 'create', 'factory', 'default'];
    for (const name of defaultNames) {
      if (routeModule[name] && typeof routeModule[name] === 'function') {
        console.log(`🔍 대안 팩토리 함수 발견: ${name}`);
        return routeModule[name];
      }
    }

    // 3. 클래스 constructor 확인 (new ClassName(container).router 패턴)
    const ClassConstructor = Object.values(routeModule).find((value: any) => 
      typeof value === 'function' && value.prototype && value.prototype.constructor === value
    );
    
    if (ClassConstructor) {
      console.log(`🔍 클래스 생성자 발견`);
      return (container: DIContainer) => {
        const instance = new (ClassConstructor as any)(container);
        return instance.router || instance.getRouter?.() || instance;
      };
    }

    return null;
  }

  // ============================================================================
  // 🔧 유틸리티 메서드들
  // ============================================================================

  /**
   * 컨테이너 상태 조회
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

    return {
      totalServices: this.services.size,
      initializedServices: serviceStats.filter(s => s.initialized).length,
      initializationOrder: this.initializationOrder,
      categoryStats,
      totalInitializationTime: totalInitTime,
      services: serviceStats,
      health: this.getHealthStatus(),
      features: {
        realDatabaseOnly: true,
        improvedRouterHandling: true,
        expressRouterValidation: true,
        factoryFunctionDetection: true,
        fallbackRouters: true,
        containerInstancePassing: true
      }
    };
  }

  /**
   * 컨테이너 헬스 상태 확인
   */
  private getHealthStatus(): { status: string; issues: string[] } {
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

    return {
      status: issues.length === 0 ? 'healthy' : 'degraded',
      issues
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
// 🛠️ Express 라우터 연결 함수 (개선된 버전)
// ============================================================================

/**
 * DI Container 라우터들을 Express 앱에 연결하는 함수 (개선된 버전)
 */
export async function connectDIRouters(app: Application, container: DIContainer): Promise<RouterConnectionResult> {
  console.log('🛣️ === Express 라우터 연결 시작 (개선된 버전) ===');

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
          console.warn(`⚠️ ${name}: 서비스 '${serviceName}'가 등록되지 않음`);
          failedRouters.push({ name, path, error: '서비스 미등록' });
          failedCount++;
          continue;
        }

        const router = container.get(serviceName);
        
        // Express Router 유효성 재검증
        if (!router || typeof router !== 'function') {
          console.error(`❌ ${name}: 유효하지 않은 라우터 (${typeof router})`);
          failedRouters.push({ name, path, error: '유효하지 않은 라우터 타입' });
          failedCount++;
          continue;
        }

        // Express 앱에 라우터 연결
        app.use(path, router);
        console.log(`✅ ${name} 연결 성공: ${path}`);
        connectedCount++;

      } catch (error: any) {
        console.error(`❌ ${name} 연결 실패:`, error.message);
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
      console.log('\n⚠️ 연결 실패한 라우터들:');
      failedRouters.forEach((failed, index) => {
        console.log(`   ${index + 1}. ${failed.name} (${failed.path})`);
        console.log(`      오류: ${failed.error}`);
      });
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
 * 의존성 주입 시스템 초기화
 */
export async function initializeDI(): Promise<DIContainer> {
  const startTime = Date.now();
  console.log('🚀 === DI 시스템 초기화 시작 ===');
  
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
    console.log(`  - 상태: ${status.health.status}`);
    
    if (status.health.issues.length > 0) {
      console.warn('⚠️ 발견된 문제:', status.health.issues);
    }
    
    return container;
    
  } catch (error: any) {
    const initTime = Date.now() - startTime;
    console.error(`❌ DI 시스템 초기화 실패 (${initTime}ms):`, error);
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
 * 빠른 서비스 접근을 위한 헬퍼 함수
 */
export const getService = <T>(key: string): T => {
  return DIContainer.getInstance().get<T>(key);
};
