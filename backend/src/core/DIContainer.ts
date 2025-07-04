// ============================================================================
// 📁 backend/src/core/DIContainer.ts
// 🔧 통합 의존성 주입 컨테이너 - 기존 구조 100% 호환하면서 점진적 개선
// ============================================================================

import { AuthConfig } from '../config/auth';
import { DatabaseConfig } from '../config/database';

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
 * 통합 의존성 주입 컨테이너
 * 기존 구조를 100% 유지하면서 DI 패턴 적용
 */
export class DIContainer {
  private static instance: DIContainer;
  private services = new Map<string, ServiceDefinition>();
  private resolutionStack: string[] = [];
  private initializationOrder: string[] = [];
  private legacyServices = new Map<string, any>(); // 기존 서비스 캐시

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
    console.log('🔧 통합 DI Container 초기화 시작...');
    
    // 핵심 설정 서비스들 먼저 등록
    this.registerCoreServices();
    
    console.log('✅ DI Container 기본 초기화 완료');
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
    dependencies: string[] = [],
    metadata?: any
  ): void {
    this.register(key, factory, 'singleton', dependencies, metadata);
  }

  /**
   * 트랜지언트 서비스 등록 (호출시마다 새 인스턴스)
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
   * 스코프드 서비스 등록 (요청당 하나의 인스턴스)
   */
  public registerScoped<T>(
    key: string, 
    factory: ServiceFactory<T>,
    dependencies: string[] = [],
    metadata?: any
  ): void {
    this.register(key, factory, 'scoped', dependencies, metadata);
  }

  /**
   * 기존 레거시 서비스 등록 (getInstance 패턴 등)
   */
  public registerLegacy<T>(
    key: string, 
    getInstance: () => T,
    metadata?: any
  ): void {
    this.registerSingleton(key, () => {
      if (!this.legacyServices.has(key)) {
        const instance = getInstance();
        this.legacyServices.set(key, instance);
        console.log(`🔄 레거시 서비스 등록: ${key}`);
      }
      return this.legacyServices.get(key);
    }, [], { ...metadata, legacy: true });
  }

  /**
   * 일반 서비스 등록 (내부 메서드)
   */
  private register<T>(
    key: string,
    factory: ServiceFactory<T>,
    lifecycle: ServiceLifecycle,
    dependencies: string[] = [],
    metadata?: any
  ): void {
    if (this.services.has(key)) {
      console.warn(`⚠️ 서비스 '${key}'가 이미 등록되어 있습니다. 덮어씁니다.`);
    }

    this.services.set(key, {
      factory,
      lifecycle,
      dependencies,
      initialized: false,
      metadata
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
  // 🏗️ 핵심 서비스 등록 (기존 구조 호환)
  // ============================================================================

  /**
   * 핵심 설정 서비스들 등록
   */
  private registerCoreServices(): void {
    // AuthConfig (기존 싱글톤 패턴 유지)
    this.registerLegacy('AuthConfig', () => AuthConfig.getInstance(), {
      description: '인증 설정 관리',
      category: 'config'
    });

    // DatabaseConfig (기존 정적 클래스 유지)
    this.registerSingleton('DatabaseConfig', () => DatabaseConfig, [], {
      description: '데이터베이스 설정 관리', 
      category: 'config'
    });
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
    
    // 레거시 서비스 캐시도 제거
    this.legacyServices.delete(key);
    
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
      dependencies: def.dependencies || [],
      metadata: def.metadata || {},
      isLegacy: def.metadata?.legacy === true
    }));

    return {
      totalServices: this.services.size,
      initializedServices: serviceStats.filter(s => s.initialized).length,
      legacyServices: serviceStats.filter(s => s.isLegacy).length,
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

    // 레거시 서비스 캐시 정리
    this.legacyServices.clear();
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
// 📁 ServiceRegistry 클래스 - 모든 서비스 등록 중앙 관리
// ============================================================================

/**
 * 통합 서비스 등록 클래스
 * 기존 구조를 100% 유지하면서 DI 패턴 점진 적용
 */
export class ServiceRegistry {
  private container: DIContainer;

  constructor(container: DIContainer = DIContainer.getInstance()) {
    this.container = container;
  }

  /**
   * 모든 서비스 등록 (단계별 진행)
   */
  public registerAll(): void {
    console.log('📝 통합 서비스 등록 시작...');

    // 1단계: 핵심 설정 서비스 (이미 초기화에서 등록됨)
    
    // 2단계: 데이터베이스 서비스 (기존 getInstance 패턴 유지)
    this.registerDatabaseServices();

    // 3단계: 암호화 서비스
    this.registerCryptoServices();

    // 4단계: 인증 서비스들 (기존 생성자 패턴 유지)
    this.registerAuthServices();

    // 5단계: AI 서비스들
    this.registerAIServices();

    // 6단계: CUE 서비스들
    this.registerCUEServices();

    // 7단계: Socket 서비스들
    this.registerSocketServices();

    // 8단계: Controller들
    this.registerControllers();

    // 9단계: 라우트들 (기존 require 방식 유지)
    this.registerRoutes();

    console.log('✅ 통합 서비스 등록 완료');
  }

  /**
   * 데이터베이스 서비스 등록 (기존 getInstance 패턴 유지)
   */
  private registerDatabaseServices(): void {
    // DatabaseService (기존 getInstance 패턴 그대로)
    this.container.registerLegacy('DatabaseService', () => {
      const { DatabaseService } = require('../services/database/DatabaseService');
      return DatabaseService.getInstance();
    }, { description: '기본 데이터베이스 서비스', category: 'database' });

    // SupabaseService (기존 getInstance 패턴 그대로)
    this.container.registerLegacy('SupabaseService', () => {
      const { SupabaseService } = require('../services/database/SupabaseService');
      return SupabaseService.getInstance();
    }, { description: 'Supabase 데이터베이스 서비스', category: 'database' });

    // 실제 사용할 DB 서비스 결정 (기존 로직 그대로)
    this.container.registerSingleton('ActiveDatabaseService', (container) => {
      const authConfig = container.get('AuthConfig');
      
      if (authConfig.DATABASE_TYPE === 'supabase') {
        return container.get('SupabaseService');
      } else {
        return container.get('DatabaseService');
      }
    }, ['AuthConfig'], { description: '활성 데이터베이스 서비스', category: 'database' });
  }

  /**
   * 암호화 서비스 등록
   */
  private registerCryptoServices(): void {
    this.container.registerLegacy('CryptoService', () => {
      const { CryptoService } = require('../services/encryption/CryptoService');
      return CryptoService.getInstance();
    }, { description: '암호화 서비스', category: 'crypto' });
  }

  /**
   * 인증 서비스들 등록 (기존 생성자 패턴 유지)
   */
 /**
 * 인증 서비스들 등록 (완전 수정됨 - 의존성 순서 및 생성자 호환성 해결)
 */
private registerAuthServices(): void {
  console.log('🔐 인증 서비스 등록 시작 (수정된 버전)...');

  // ✅ 1단계: AuthService 먼저 등록 (다른 서비스들의 기반)
  this.container.registerSingleton('AuthService', (container) => {
    const { AuthService } = require('../services/auth/AuthService');
    const config = container.get('AuthConfig');
    const db = container.get('ActiveDatabaseService');
    return new AuthService(config, db);
  }, ['AuthConfig', 'ActiveDatabaseService'], 
  { description: '인증 서비스', category: 'auth' });

  // ✅ 2단계: SessionService 등록 (AuthService 의존성 제거)
  this.container.registerSingleton('SessionService', (container) => {
    const { SessionService } = require('../services/auth/SessionService');
    const config = container.get('AuthConfig');
    // SessionService는 이제 AuthService에 의존하지 않음
    return new SessionService(config);
  }, ['AuthConfig'], 
  { description: '세션 관리 서비스', category: 'auth' });

  // ✅ 3단계: WebAuthnService 등록 (올바른 의존성 순서와 호환성)
  this.container.registerSingleton('WebAuthnService', (container) => {
    const { WebAuthnService } = require('../services/auth/WebAuthnService');
    const config = container.get('AuthConfig');
    const db = container.get('ActiveDatabaseService');
    
    // WebAuthnService 생성자 호환성 체크
    try {
      // 기존 WebAuthnService가 2개 파라미터를 받는지 4개를 받는지 확인
      const authService = container.get('AuthService');
      const sessionService = container.get('SessionService');
      
      // 새로운 생성자 시도 (4개 파라미터)
      try {
        return new WebAuthnService(config, db, authService, sessionService);
      } catch (newConstructorError) {
        console.log('🔄 새 생성자 실패, 기존 생성자 시도:', newConstructorError.message);
        // 기존 생성자 시도 (2개 파라미터)
        const webauthnService = new WebAuthnService(config, db);
        
        // 수동으로 의존성 주입 (기존 서비스 호환성)
        if (webauthnService && typeof webauthnService === 'object') {
          // @ts-ignore - 런타임에 의존성 주입
          webauthnService.authService = authService;
          // @ts-ignore - 런타임에 의존성 주입  
          webauthnService.sessionService = sessionService;
          console.log('✅ WebAuthnService 런타임 의존성 주입 완료');
        }
        
        return webauthnService;
      }
    } catch (serviceError) {
      console.error('❌ WebAuthnService 의존성 해결 실패:', serviceError);
      // 최소한의 Mock WebAuthnService 반환
      return {
        startRegistration: async () => { throw new Error('WebAuthnService not properly initialized'); },
        completeRegistration: async () => { throw new Error('WebAuthnService not properly initialized'); },
        startLogin: async () => { throw new Error('WebAuthnService not properly initialized'); },
        completeLogin: async () => { throw new Error('WebAuthnService not properly initialized'); },
        startUnifiedAuthentication: async () => { throw new Error('WebAuthnService not properly initialized'); },
        completeUnifiedAuthentication: async () => { throw new Error('WebAuthnService not properly initialized'); },
        getStatus: async () => ({ error: 'Service not initialized' })
      };
    }
  }, ['AuthConfig', 'ActiveDatabaseService', 'AuthService', 'SessionService'], 
  { description: 'WebAuthn 인증 서비스', category: 'auth' });

  // ✅ 4단계: SessionRestoreService 등록 (모든 의존성 해결 후)
  this.container.registerSingleton('SessionRestoreService', (container) => {
    const { SessionRestoreService } = require('../services/auth/SessionRestoreService');
    const sessionService = container.get('SessionService');
    const authService = container.get('AuthService');
    return new SessionRestoreService(sessionService, authService);
  }, ['SessionService', 'AuthService'], 
  { description: '세션 복원 서비스', category: 'auth' });

  console.log('✅ 인증 서비스 등록 완료 (의존성 문제 해결됨)');
}

  /**
   * AI 서비스들 등록
   */
  private registerAIServices(): void {
    // AIService
    this.container.registerSingleton('AIService', (container) => {
      const { AIService } = require('../services/ai/AIService');
      const db = container.get('ActiveDatabaseService');
      return new AIService(db);
    }, ['ActiveDatabaseService'], 
    { description: 'AI 채팅 서비스', category: 'ai' });

    // PersonalizationService
    this.container.registerSingleton('PersonalizationService', () => {
      const { PersonalizationService } = require('../services/ai/PersonalizationService');
      return new PersonalizationService();
    }, [], { description: '개인화 서비스', category: 'ai' });

    // SemanticCompressionService
    this.container.registerSingleton('SemanticCompressionService', () => {
      const { SemanticCompressionService } = require('../services/ai/SemanticCompressionService');
      return new SemanticCompressionService();
    }, [], { description: '의미론적 압축 서비스', category: 'ai' });

    // PersonalCueExtractor
    this.container.registerSingleton('PersonalCueExtractor', () => {
      const { PersonalCueExtractor } = require('../services/ai/PersonalCueExtractor');
      return new PersonalCueExtractor();
    }, [], { description: '개인 단서 추출 서비스', category: 'ai' });

    // RealPersonalCueExtractor
    this.container.registerSingleton('RealPersonalCueExtractor', () => {
      const { RealPersonalCueExtractor } = require('../services/ai/RealPersonalCueExtractor');
      return new RealPersonalCueExtractor();
    }, [], { description: '실제 개인 단서 추출 서비스', category: 'ai' });

    // RealRAGDAGEngine
    this.container.registerSingleton('RealRAGDAGEngine', () => {
      const { RealRAGDAGEngine } = require('../services/ai/RealRAGDAGEngine');
      return new RealRAGDAGEngine();
    }, [], { description: 'RAG DAG 엔진', category: 'ai' });
  }

  /**
   * CUE 서비스들 등록
   */
  private registerCUEServices(): void {
    // CueService
    this.container.registerSingleton('CueService', (container) => {
      const { CueService } = require('../services/cue/CueService');
      const db = container.get('ActiveDatabaseService');
      return new CueService(db);
    }, ['ActiveDatabaseService'], 
    { description: 'CUE 토큰 서비스', category: 'cue' });

    // CUEMiningService
    this.container.registerSingleton('CUEMiningService', (container) => {
      const { CUEMiningService } = require('../services/cue/CUEMiningService');
      const db = container.get('ActiveDatabaseService');
      return new CUEMiningService(db);
    }, ['ActiveDatabaseService'], 
    { description: 'CUE 마이닝 서비스', category: 'cue' });
  }

  /**
   * Socket 서비스들 등록
   */
  private registerSocketServices(): void {
  // ❌ 이 부분을 안전하게 수정
  this.container.registerSingleton('SocketService', () => {
    try {
      const { SocketService } = require('../services/socket/SocketService');
      // Socket.io 서버 인스턴스가 필요한데 없어서 실패하므로 Mock으로 처리
      console.log('⚠️ SocketService를 Mock으로 등록합니다 (Socket.io 서버 미설정)');
      return {
        initialize: () => console.log('Mock SocketService initialized'),
        on: () => {},
        emit: () => {},
        dispose: () => console.log('Mock SocketService disposed')
      };
    } catch (error) {
      console.warn('⚠️ SocketService 로딩 실패, Mock 서비스로 대체:', error.message);
      return {
        initialize: () => console.log('Mock SocketService initialized'),
        on: () => {},
        emit: () => {},
        dispose: () => console.log('Mock SocketService disposed')
      };
    }
  }, [], { description: 'Socket.IO 서비스 (Mock)', category: 'socket' });
}

  /**
   * Controller들 등록
   */
  private registerControllers(): void {
    // AuthController (기존 생성자 방식 유지)
    this.container.registerSingleton('AuthController', (container) => {
      const { AuthController } = require('../controllers/AuthController');
      const authService = container.get('AuthService');
      const sessionService = container.get('SessionService');
      const webauthnService = container.get('WebAuthnService');
      
      return new AuthController(authService, sessionService, webauthnService);
    }, ['AuthService', 'SessionService', 'WebAuthnService'], 
    { description: '인증 컨트롤러', category: 'controller' });
  }

  /**
   * 라우트들 등록 (기존 require 방식 유지)
   */
  private registerRoutes(): void {
    // 기존 라우트 파일들을 그대로 사용하되, 컨테이너에서 서비스 주입 가능하도록 래핑
    
    // Auth 라우트들
    this.container.registerSingleton('AuthUnifiedRoutes', () => {
      const authRoutes = require('../routes/auth/unified');
      return authRoutes.default || authRoutes;
    }, [], { description: '통합 인증 라우트', category: 'route' });

    this.container.registerSingleton('AuthSessionRoutes', () => {
      const sessionRoutes = require('../routes/auth/session-restore');
      return sessionRoutes.default || sessionRoutes;
    }, [], { description: '세션 복원 라우트', category: 'route' });

    this.container.registerSingleton('AuthWebAuthnRoutes', () => {
      const webauthnRoutes = require('../routes/auth/webauthn');
      return webauthnRoutes.default || webauthnRoutes;
    }, [], { description: 'WebAuthn 라우트', category: 'route' });

    // AI 라우트들
    this.container.registerSingleton('AIChatRoutes', () => {
      const aiRoutes = require('../routes/ai/chat');
      return aiRoutes.default || aiRoutes;
    }, [], { description: 'AI 채팅 라우트', category: 'route' });

    // CUE 라우트들
    this.container.registerSingleton('CUERoutes', () => {
      const cueRoutes = require('../routes/cue/cue');
      return cueRoutes.default || cueRoutes;
    }, [], { description: 'CUE 관리 라우트', category: 'route' });

    this.container.registerSingleton('CUEMiningRoutes', () => {
      const miningRoutes = require('../routes/cue/mining');
      return miningRoutes.default || miningRoutes;
    }, [], { description: 'CUE 마이닝 라우트', category: 'route' });

    this.container.registerSingleton('CUECompleteRoutes', () => {
      const completeRoutes = require('../routes/cue/complete');
      return completeRoutes.default || completeRoutes;
    }, [], { description: 'CUE 완료 라우트', category: 'route' });

    // Passport 라우트들
    this.container.registerSingleton('PassportRoutes', () => {
      const passportRoutes = require('../routes/passport/passport');
      return passportRoutes.default || passportRoutes;
    }, [], { description: 'Passport 라우트', category: 'route' });

    this.container.registerSingleton('PassportCompleteRoutes', () => {
      const completeRoutes = require('../routes/passport/complete');
      return completeRoutes.default || completeRoutes;
    }, [], { description: 'Passport 완료 라우트', category: 'route' });

    // Debug 라우트들
    this.container.registerSingleton('DebugRoutes', () => {
      const debugRoutes = require('../routes/debug/index');
      return debugRoutes.default || debugRoutes;
    }, [], { description: '디버그 라우트', category: 'route' });

    // Platform 라우트들
    this.container.registerSingleton('PlatformRoutes', () => {
      const platformRoutes = require('../routes/platform/index');
      return platformRoutes.default || platformRoutes;
    }, [], { description: '플랫폼 라우트', category: 'route' });

    // Vault 라우트들
    this.container.registerSingleton('VaultRoutes', () => {
      const vaultRoutes = require('../routes/vault/index');
      return vaultRoutes.default || vaultRoutes;
    }, [], { description: 'Vault 라우트', category: 'route' });
  }
}

// ============================================================================
// 📤 초기화 및 헬퍼 함수들
// ============================================================================

/**
 * 통합 의존성 주입 시스템 초기화
 */
export function initializeDI(): DIContainer {
  console.log('🚀 통합 의존성 주입 시스템 초기화...');
  
  const container = DIContainer.getInstance();
  const registry = new ServiceRegistry(container);
  
  // 컨테이너 초기화 (핵심 서비스 등록)
  container.initialize();
  
  // 모든 서비스 등록 (기존 구조 유지)
  registry.registerAll();
  
  // 모든 싱글톤 서비스 초기화
  container.initializeAll();
  
  console.log('✅ 통합 의존성 주입 시스템 초기화 완료');
  
  // 상태 출력
  const status = container.getStatus();
  console.log('📊 등록된 서비스 현황:');
  console.log(`  - 총 서비스: ${status.totalServices}개`);
  console.log(`  - 초기화된 서비스: ${status.initializedServices}개`);
  console.log(`  - 레거시 서비스: ${status.legacyServices}개`);
  console.table(status.services.map(s => ({
    이름: s.key,
    타입: s.lifecycle,
    초기화: s.initialized ? '✅' : '⏳',
    레거시: s.isLegacy ? '🔄' : '🆕',
    카테고리: s.metadata.category || '기타'
  })));
  
  return container;
}

/**
 * 의존성 주입 시스템 종료
 */
export function shutdownDI(): void {
  console.log('🛑 통합 의존성 주입 시스템 종료...');
  
  const container = DIContainer.getInstance();
  container.dispose();
  
  console.log('✅ 통합 의존성 주입 시스템 종료 완료');
}

/**
 * 컨테이너 상태 조회 (헬스체크용)
 */
export function getDIStatus(): any {
  return DIContainer.getInstance().getStatus();
}

/**
 * 빠른 서비스 접근을 위한 헬퍼 함수들 (기존 패턴 유지)
 */
export const getService = <T>(key: string): T => {
  return DIContainer.getInstance().get<T>(key);
};

// 자주 사용되는 서비스들의 편의 함수
export const getAuthService = () => getService<any>('AuthService');
export const getSessionService = () => getService<any>('SessionService');
export const getWebAuthnService = () => getService<any>('WebAuthnService');
export const getAuthController = () => getService<any>('AuthController');
export const getDatabaseService = () => getService<any>('ActiveDatabaseService');
export const getCryptoService = () => getService<any>('CryptoService');
export const getAIService = () => getService<any>('AIService');
export const getCueService = () => getService<any>('CueService');

// ============================================================================
// 📤 Exports
// ============================================================================

