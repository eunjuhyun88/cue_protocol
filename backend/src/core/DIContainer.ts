// ============================================================================
// 📁 backend/src/core/DIContainer.ts
// 🔧 의존성 주입 컨테이너 - 순환 의존성 해결 및 서비스 관리
// ============================================================================

import { AuthConfig } from '../config/auth';

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
}

/**
 * 의존성 주입 컨테이너
 * 순환 의존성 해결 및 서비스 라이프사이클 관리
 */
export class DIContainer {
  private static instance: DIContainer;
  private services = new Map<string, ServiceDefinition>();
  private resolutionStack: string[] = [];
  private initializationOrder: string[] = [];

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
   * 컨테이너 초기화 (기본 서비스 등록)
   */
  public initialize(): void {
    console.log('🔧 DI Container 초기화 시작...');
    
    // AuthConfig 등록 (가장 기본이 되는 서비스)
    this.registerSingleton('AuthConfig', () => AuthConfig.getInstance());
    
    console.log('✅ DI Container 초기화 완료');
  }

  // ============================================================================
  // 📝 서비스 등록 메서드들
  // ============================================================================

  /**
   * 싱글톤 서비스 등록
   */
  public registerSingleton<T>(
    key: string, 
    factory: ServiceFactory<T>,
    dependencies: string[] = []
  ): void {
    this.register(key, factory, 'singleton', dependencies);
  }

  /**
   * 트랜지언트 서비스 등록 (호출시마다 새 인스턴스)
   */
  public registerTransient<T>(
    key: string, 
    factory: ServiceFactory<T>,
    dependencies: string[] = []
  ): void {
    this.register(key, factory, 'transient', dependencies);
  }

  /**
   * 스코프드 서비스 등록 (요청당 하나의 인스턴스)
   */
  public registerScoped<T>(
    key: string, 
    factory: ServiceFactory<T>,
    dependencies: string[] = []
  ): void {
    this.register(key, factory, 'scoped', dependencies);
  }

  /**
   * 일반 서비스 등록 (내부 메서드)
   */
  private register<T>(
    key: string,
    factory: ServiceFactory<T>,
    lifecycle: ServiceLifecycle,
    dependencies: string[] = []
  ): void {
    if (this.services.has(key)) {
      console.warn(`⚠️ 서비스 '${key}'가 이미 등록되어 있습니다. 덮어씁니다.`);
    }

    this.services.set(key, {
      factory,
      lifecycle,
      dependencies,
      initialized: false
    });

    console.log(`📝 서비스 등록: ${key} (${lifecycle})`);
  }

  // ============================================================================
  // 🔍 서비스 해결 메서드들
  // ============================================================================

  /**
   * 서비스 인스턴스 반환
   */
  public get<T>(key: string): T {
    return this.resolve<T>(key);
  }

  /**
   * 서비스 해결 (순환 의존성 체크 포함)
   */
  private resolve<T>(key: string): T {
    // 순환 의존성 체크
    if (this.resolutionStack.includes(key)) {
      const cycle = this.resolutionStack.slice(this.resolutionStack.indexOf(key)).join(' -> ');
      throw new Error(`순환 의존성 감지: ${cycle} -> ${key}`);
    }

    const serviceDefinition = this.services.get(key);
    if (!serviceDefinition) {
      throw new Error(`서비스 '${key}'를 찾을 수 없습니다. 등록되었는지 확인해주세요.`);
    }

    // 싱글톤이고 이미 인스턴스가 있다면 반환
    if (serviceDefinition.lifecycle === 'singleton' && serviceDefinition.instance) {
      return serviceDefinition.instance;
    }

    // 의존성 해결 스택에 추가
    this.resolutionStack.push(key);

    try {
      // 의존성 먼저 해결
      this.resolveDependencies(serviceDefinition.dependencies || []);

      // 서비스 인스턴스 생성
      const instance = serviceDefinition.factory(this);

      // 싱글톤이면 인스턴스 저장
      if (serviceDefinition.lifecycle === 'singleton') {
        serviceDefinition.instance = instance;
        serviceDefinition.initialized = true;
        
        if (!this.initializationOrder.includes(key)) {
          this.initializationOrder.push(key);
        }
      }

      console.log(`✅ 서비스 해결: ${key}`);
      return instance;

    } finally {
      // 해결 스택에서 제거
      this.resolutionStack.pop();
    }
  }

  /**
   * 의존성들 해결
   */
  private resolveDependencies(dependencies: string[]): void {
    for (const dependency of dependencies) {
      this.resolve(dependency);
    }
  }

  // ============================================================================
  // 🧹 관리 메서드들
  // ============================================================================

  /**
   * 서비스 존재 여부 확인
   */
  public has(key: string): boolean {
    return this.services.has(key);
  }

  /**
   * 서비스 제거
   */
  public remove(key: string): boolean {
    const serviceDefinition = this.services.get(key);
    if (serviceDefinition?.instance && typeof serviceDefinition.instance.dispose === 'function') {
      serviceDefinition.instance.dispose();
    }
    
    return this.services.delete(key);
  }

  /**
   * 모든 서비스 초기화
   */
  public initializeAll(): void {
    console.log('🚀 모든 서비스 초기화 시작...');
    
    const singletonKeys = Array.from(this.services.entries())
      .filter(([, def]) => def.lifecycle === 'singleton')
      .map(([key]) => key);

    for (const key of singletonKeys) {
      try {
        this.get(key);
      } catch (error) {
        console.error(`❌ 서비스 '${key}' 초기화 실패:`, error);
      }
    }

    console.log('✅ 모든 서비스 초기화 완료');
    console.log('📋 초기화 순서:', this.initializationOrder);
  }

  /**
   * 컨테이너 상태 조회
   */
  public getStatus(): any {
    const serviceStats = Array.from(this.services.entries()).map(([key, def]) => ({
      key,
      lifecycle: def.lifecycle,
      initialized: def.initialized || false,
      hasInstance: !!def.instance,
      dependencies: def.dependencies || []
    }));

    return {
      totalServices: this.services.size,
      initializedServices: serviceStats.filter(s => s.initialized).length,
      initializationOrder: this.initializationOrder,
      services: serviceStats
    };
  }

  /**
   * 컨테이너 재설정
   */
  public reset(): void {
    console.log('🔄 DI Container 재설정...');
    
    // 모든 싱글톤 인스턴스 정리
    for (const [key, definition] of this.services.entries()) {
      if (definition.instance && typeof definition.instance.dispose === 'function') {
        definition.instance.dispose();
      }
      definition.instance = undefined;
      definition.initialized = false;
    }

    this.resolutionStack = [];
    this.initializationOrder = [];
    
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
// 📁 backend/src/core/ServiceRegistry.ts
// 🎯 서비스 등록 중앙 관리
// ============================================================================

/**
 * 서비스 등록 클래스
 * 모든 서비스의 등록을 중앙에서 관리
 */
export class ServiceRegistry {
  private container: DIContainer;

  constructor(container: DIContainer = DIContainer.getInstance()) {
    this.container = container;
  }

  /**
   * 모든 서비스 등록
   */
  public registerAll(): void {
    console.log('📝 모든 서비스 등록 시작...');

    // 1. 핵심 설정 서비스
    this.registerCoreServices();

    // 2. 데이터베이스 서비스
    this.registerDatabaseServices();

    // 3. 인증 서비스들
    this.registerAuthServices();

    // 4. 컨트롤러들
    this.registerControllers();

    // 5. 미들웨어들
    this.registerMiddlewares();

    console.log('✅ 모든 서비스 등록 완료');
  }

  /**
   * 핵심 설정 서비스 등록
   */
  private registerCoreServices(): void {
    // AuthConfig는 이미 initialize()에서 등록됨
    
    // Logger 서비스 (예시)
    this.container.registerSingleton('Logger', () => {
      return {
        info: (msg: string, ...args: any[]) => console.log(`ℹ️ ${msg}`, ...args),
        warn: (msg: string, ...args: any[]) => console.warn(`⚠️ ${msg}`, ...args),
        error: (msg: string, ...args: any[]) => console.error(`❌ ${msg}`, ...args),
        debug: (msg: string, ...args: any[]) => {
          if (process.env.NODE_ENV === 'development') {
            console.log(`🐛 ${msg}`, ...args);
          }
        }
      };
    });
  }

  /**
   * 데이터베이스 서비스 등록
   */
  private registerDatabaseServices(): void {
    // DatabaseService 등록
    this.container.registerSingleton('DatabaseService', (container) => {
      const config = container.get<AuthConfig>('AuthConfig');
      
      // 실제 DatabaseService import 및 설정
      if (config.DATABASE_TYPE === 'supabase') {
        const { SupabaseService } = require('../services/database/SupabaseService');
        return SupabaseService.getInstance();
      } else {
        const { DatabaseService } = require('../services/database/DatabaseService');
        return DatabaseService.getInstance();
      }
    }, ['AuthConfig']);
  }

  /**
   * 인증 서비스들 등록
   */
  private registerAuthServices(): void {
    // AuthService 등록
    this.container.registerSingleton('AuthService', (container) => {
      const { AuthService } = require('../services/auth/AuthService');
      return new AuthService(
        container.get('AuthConfig'),
        container.get('DatabaseService')
      );
    }, ['AuthConfig', 'DatabaseService']);

    // SessionService 등록
    this.container.registerSingleton('SessionService', (container) => {
      const { SessionService } = require('../services/auth/SessionService');
      return new SessionService(
        container.get('AuthConfig'),
        container.get('AuthService')
      );
    }, ['AuthConfig', 'AuthService']);

    // WebAuthnService 등록
    this.container.registerSingleton('WebAuthnService', (container) => {
      const { WebAuthnService } = require('../services/auth/WebAuthnService');
      return new WebAuthnService(
        container.get('AuthConfig'),
        container.get('AuthService'),
        container.get('SessionService')
      );
    }, ['AuthConfig', 'AuthService', 'SessionService']);
  }

  /**
   * 컨트롤러들 등록
   */
  private registerControllers(): void {
    // AuthController 등록
    this.container.registerSingleton('AuthController', (container) => {
      const { AuthController } = require('../controllers/AuthController');
      return new AuthController(
        container.get('AuthService'),
        container.get('SessionService'),
        container.get('WebAuthnService')
      );
    }, ['AuthService', 'SessionService', 'WebAuthnService']);

    // 다른 컨트롤러들도 필요에 따라 추가...
  }

  /**
   * 미들웨어들 등록
   */
  private registerMiddlewares(): void {
    // AuthMiddleware 등록
    this.container.registerTransient('AuthMiddleware', (container) => {
      const { authMiddleware } = require('../middleware/authMiddleware');
      // SessionService를 주입받는 미들웨어로 개선 가능
      return authMiddleware;
    }, ['SessionService']);
  }

  /**
   * 서비스 등록 상태 확인
   */
  public getRegistrationStatus(): any {
    return this.container.getStatus();
  }
}

// ============================================================================
// 📁 backend/src/core/index.ts
// 🚀 코어 시스템 초기화
// ============================================================================

/**
 * 의존성 주입 시스템 초기화
 */
export function initializeDI(): DIContainer {
  console.log('🚀 의존성 주입 시스템 초기화...');
  
  const container = DIContainer.getInstance();
  const registry = new ServiceRegistry(container);
  
  // 컨테이너 초기화
  container.initialize();
  
  // 모든 서비스 등록
  registry.registerAll();
  
  // 모든 싱글톤 서비스 초기화
  container.initializeAll();
  
  console.log('✅ 의존성 주입 시스템 초기화 완료');
  console.log('📊 등록된 서비스 현황:');
  console.table(container.getStatus().services);
  
  return container;
}

/**
 * 의존성 주입 시스템 종료
 */
export function shutdownDI(): void {
  console.log('🛑 의존성 주입 시스템 종료...');
  
  const container = DIContainer.getInstance();
  container.dispose();
  
  console.log('✅ 의존성 주입 시스템 종료 완료');
}

/**
 * 컨테이너 상태 조회 (헬스체크용)
 */
export function getDIStatus(): any {
  return DIContainer.getInstance().getStatus();
}

/**
 * 빠른 서비스 접근을 위한 헬퍼 함수들
 */
export const getService = <T>(key: string): T => {
  return DIContainer.getInstance().get<T>(key);
};

export const getAuthService = () => getService<any>('AuthService');
export const getSessionService = () => getService<any>('SessionService');
export const getWebAuthnService = () => getService<any>('WebAuthnService');
export const getAuthController = () => getService<any>('AuthController');

// ============================================================================
// 📤 Exports
// ============================================================================

export * from '../config/auth'; // AuthConfig 등 다른 설정도 export
export * from '../services/auth/AuthService';
export * from '../services/auth/SessionService';
export * from '../services/auth/WebAuthnService';
export * from '../controllers/AuthController';
export * from '../middleware/authMiddleware';   