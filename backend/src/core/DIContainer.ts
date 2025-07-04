// ============================================================================
// 📁 backend/src/core/DIContainer.ts (기존 Ollama 전용 + AI 기능 활성화 개선)
// 🔧 개선 사항: Mock 제거, 실제 AI 기능 강화, 로깅 개선
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
 * 개선된 Ollama 전용 의존성 주입 컨테이너
 * Mock 제거, 실제 AI 기능 강화, 로깅 개선
 */
export class DIContainer {
  private static instance: DIContainer;
  private services = new Map<string, ServiceDefinition>();
  private resolutionStack: string[] = [];
  private initializationOrder: string[] = [];
  private legacyServices = new Map<string, any>(); // 기존 서비스 캐시
  private initializationStartTime: number = 0;

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
    this.initializationStartTime = Date.now();
    console.log('🔧 개선된 Ollama 전용 DI Container 초기화 시작...');
    
    // 핵심 설정 서비스들 먼저 등록
    this.registerCoreServices();
    
    const initTime = Date.now() - this.initializationStartTime;
    console.log(`✅ DI Container 기본 초기화 완료 (${initTime}ms)`);
  }

  // ============================================================================
  // 📝 서비스 등록 메서드들 (기존 유지)
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
        console.log(`🔄 레거시 서비스 초기화: ${key}`);
        const startTime = Date.now();
        
        try {
          const instance = getInstance();
          this.legacyServices.set(key, instance);
          
          const loadTime = Date.now() - startTime;
          console.log(`✅ 레거시 서비스 등록 완료: ${key} (${loadTime}ms)`);
        } catch (error) {
          console.error(`❌ 레거시 서비스 등록 실패: ${key}`, error);
          throw error;
        }
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
  // 🔍 서비스 해결 메서드들 (로깅 강화)
  // ============================================================================

  /**
   * 서비스 인스턴스 반환
   */
  public get<T>(key: string): T {
    return this.resolve<T>(key);
  }

  /**
   * 서비스 해결 (순환 의존성 체크 포함, 로깅 강화)
   */
  private resolve<T>(key: string): T {
    const startTime = Date.now();
    
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
      console.log(`🔄 서비스 해결 중: ${key}${serviceDefinition.dependencies?.length ? ` (의존성: ${serviceDefinition.dependencies.join(', ')})` : ''}`);

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

      const resolveTime = Date.now() - startTime;
      console.log(`✅ 서비스 해결 완료: ${key} (${resolveTime}ms)`);
      return instance;

    } catch (error) {
      const errorTime = Date.now() - startTime;
      console.error(`❌ 서비스 해결 실패: ${key} (${errorTime}ms)`, error);
      throw error;
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
  // 🏗️ 핵심 서비스 등록 (개선됨)
  // ============================================================================

  /**
   * 핵심 설정 서비스들 등록
   */
  private registerCoreServices(): void {
    console.log('📋 핵심 설정 서비스 등록 중...');

    // AuthConfig (기존 싱글톤 패턴 유지, 검증 강화)
    this.registerLegacy('AuthConfig', () => {
      const config = AuthConfig.getInstance();
      
      // 환경변수 검증
      const validation = config.validateCurrentConfig();
      if (!validation.valid) {
        console.warn('⚠️ AuthConfig 검증 실패:', validation.errors);
      }
      
      return config;
    }, {
      description: '인증 설정 관리 (검증 강화)',
      category: 'config'
    });

    // DatabaseConfig (기존 정적 클래스 유지, 연결 확인)
    this.registerSingleton('DatabaseConfig', async () => {
      try {
        // 데이터베이스 연결 상태 확인
        const healthStatus = await DatabaseConfig.getHealthStatus();
        console.log('🗄️ 데이터베이스 상태:', healthStatus.status);
        
        return DatabaseConfig;
      } catch (error) {
        console.error('❌ DatabaseConfig 초기화 실패:', error);
        return DatabaseConfig; // 실패해도 인스턴스는 반환
      }
    }, [], {
      description: '데이터베이스 설정 관리 (연결 확인)', 
      category: 'config'
    });

    console.log('✅ 핵심 설정 서비스 등록 완료');
  }

  // ============================================================================
  // 🧹 관리 메서드들 (기존 유지, 로깅 개선)
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
      console.log(`🧹 서비스 정리: ${key}`);
      serviceDefinition.instance.dispose();
    }
    
    // 레거시 서비스 캐시도 제거
    this.legacyServices.delete(key);
    
    const removed = this.services.delete(key);
    console.log(`${removed ? '✅' : '❌'} 서비스 제거: ${key}`);
    return removed;
  }

  /**
   * 모든 서비스 초기화 (로깅 강화)
   */
  public initializeAll(): void {
    const startTime = Date.now();
    console.log('🚀 모든 서비스 초기화 시작...');
    
    const singletonKeys = Array.from(this.services.entries())
      .filter(([, def]) => def.lifecycle === 'singleton')
      .map(([key]) => key);

    console.log(`📋 초기화할 싱글톤 서비스: ${singletonKeys.length}개`);

    let successCount = 0;
    let failureCount = 0;

    for (const key of singletonKeys) {
      try {
        const serviceStartTime = Date.now();
        this.get(key);
        const serviceTime = Date.now() - serviceStartTime;
        console.log(`✅ ${key} 초기화 완료 (${serviceTime}ms)`);
        successCount++;
      } catch (error) {
        console.error(`❌ 서비스 '${key}' 초기화 실패:`, error);
        failureCount++;
      }
    }

    const totalTime = Date.now() - startTime;
    console.log(`🎯 모든 서비스 초기화 완료 (${totalTime}ms)`);
    console.log(`📊 결과: 성공 ${successCount}개, 실패 ${failureCount}개`);
    console.log('📋 초기화 순서:', this.initializationOrder);
  }

  /**
   * 컨테이너 상태 조회 (상세 정보 추가)
   */
  public getStatus(): any {
    const serviceStats = Array.from(this.services.entries()).map(([key, def]) => ({
      key,
      lifecycle: def.lifecycle,
      initialized: def.initialized || false,
      hasInstance: !!def.instance,
      dependencies: def.dependencies || [],
      metadata: def.metadata || {},
      isLegacy: def.metadata?.legacy === true,
      category: def.metadata?.category || 'unknown'
    }));

    // 카테고리별 통계
    const categoryStats = serviceStats.reduce((acc, service) => {
      const category = service.category;
      if (!acc[category]) {
        acc[category] = { total: 0, initialized: 0 };
      }
      acc[category].total++;
      if (service.initialized) {
        acc[category].initialized++;
      }
      return acc;
    }, {} as Record<string, { total: number; initialized: number }>);

    const totalInitTime = this.initializationStartTime > 0 ? Date.now() - this.initializationStartTime : 0;

    return {
      totalServices: this.services.size,
      initializedServices: serviceStats.filter(s => s.initialized).length,
      legacyServices: serviceStats.filter(s => s.isLegacy).length,
      initializationOrder: this.initializationOrder,
      categoryStats,
      totalInitializationTime: totalInitTime,
      services: serviceStats,
      health: this.getHealthStatus()
    };
  }

  /**
   * 컨테이너 헬스 상태 확인 (신규 추가)
   */
  private getHealthStatus(): { status: string; issues: string[] } {
    const issues: string[] = [];
    
    // 필수 서비스 확인
    const requiredServices = ['AuthConfig', 'DatabaseConfig'];
    for (const service of requiredServices) {
      if (!this.has(service)) {
        issues.push(`필수 서비스 누락: ${service}`);
      }
    }

    // 초기화 실패한 서비스 확인
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
    this.initializationStartTime = 0;
    
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
// 📁 ServiceRegistry 클래스 - 개선된 서비스 등록
// ============================================================================

/**
 * 개선된 서비스 등록 클래스 (Mock 제거, 실제 기능 강화)
 */
export class ServiceRegistry {
  private container: DIContainer;

  constructor(container: DIContainer = DIContainer.getInstance()) {
    this.container = container;
  }

  /**
   * 모든 서비스 등록 (개선된 버전)
   */
  public registerAll(): void {
    console.log('📝 개선된 서비스 등록 시작...');

    try {
      // 1단계: 데이터베이스 서비스 (핵심 우선)
      this.registerDatabaseServices();

      // 2단계: 암호화 서비스
      this.registerCryptoServices();

      // 3단계: Ollama 서비스 (핵심)
      this.registerOllamaServices();

      // 4단계: 인증 서비스들
      this.registerAuthServices();

      // 5단계: AI 서비스들 (실제 기능 강화)
      this.registerAIServices();

      // 6단계: CUE 서비스들
      this.registerCUEServices();

      // 7단계: Socket 서비스들 (실제 구현 시도)
      this.registerSocketServices();

      // 8단계: Controller들
      this.registerControllers();

      // 9단계: 라우트들
      this.registerRoutes();

      console.log('✅ 개선된 서비스 등록 완료');

    } catch (error) {
      console.error('❌ 서비스 등록 중 오류 발생:', error);
      throw error;
    }
  }

  /**
   * 데이터베이스 서비스 등록 (완전한 실제 구현 사용)
   */
  private registerDatabaseServices(): void {
    console.log('🗄️ 데이터베이스 서비스 등록 중...');

    // DatabaseService (완전한 실제 구현 사용)
    this.container.registerLegacy('DatabaseService', () => {
      const { DatabaseService } = require('../services/database/DatabaseService');
      const instance = DatabaseService.getInstance();
      
      // 연결 상태 확인
      if (!instance.isConnected()) {
        console.log('🔄 데이터베이스 연결 시도 중...');
        instance.connect().catch((error: any) => {
          console.error('❌ 데이터베이스 연결 실패:', error);
        });
      }
      
      return instance;
    }, { description: '기본 데이터베이스 서비스 (Mock 제거)', category: 'database' });

    // SupabaseService (기존 getInstance 패턴 그대로)
    this.container.registerLegacy('SupabaseService', () => {
      const { SupabaseService } = require('../services/database/SupabaseService');
      return SupabaseService.getInstance();
    }, { description: 'Supabase 데이터베이스 서비스', category: 'database' });

    // 실제 사용할 DB 서비스 결정 (Mock 완전 제거)
    this.container.registerSingleton('ActiveDatabaseService', (container) => {
      const authConfig = container.get('AuthConfig');
      
      // Supabase 우선, 환경변수가 제대로 설정된 경우에만
      if (authConfig.DATABASE_TYPE === 'supabase' && 
          process.env.SUPABASE_URL && 
          !process.env.SUPABASE_URL.includes('dummy')) {
        console.log('🚀 Supabase 데이터베이스 서비스 활성화');
        return container.get('SupabaseService');
      } else {
        console.log('🚀 기본 데이터베이스 서비스 활성화');
        return container.get('DatabaseService');
      }
    }, ['AuthConfig'], { description: '활성 데이터베이스 서비스 (실제 구현)', category: 'database' });

    console.log('✅ 데이터베이스 서비스 등록 완료');
  }

  /**
   * 암호화 서비스 등록
   */
  private registerCryptoServices(): void {
    console.log('🔐 암호화 서비스 등록 중...');

    this.container.registerLegacy('CryptoService', () => {
      const { CryptoService } = require('../services/encryption/CryptoService');
      return CryptoService.getInstance();
    }, { description: '암호화 서비스', category: 'crypto' });

    console.log('✅ 암호화 서비스 등록 완료');
  }

  /**
   * ⭐ Ollama 서비스 등록 (개선된 버전)
   */
  private registerOllamaServices(): void {
    console.log('🦙 Ollama 서비스 등록 시작...');

    // OllamaService - 연결 상태 확인 강화
    this.container.registerLegacy('OllamaService', () => {
      const { OllamaService } = require('../services/ollama');
      const instance = OllamaService.getInstance();
      
      // Ollama 서버 연결 상태 확인
      instance.checkConnection().then((connected: boolean) => {
        console.log(`🦙 Ollama 서버 상태: ${connected ? '연결됨' : '연결 실패'}`);
      }).catch((error: any) => {
        console.warn('⚠️ Ollama 연결 상태 확인 실패:', error.message);
      });
      
      return instance;
    }, { description: 'Ollama 로컬 AI 서비스 (연결 확인 강화)', category: 'ai' });

    console.log('✅ Ollama 서비스 등록 완료');
  }

  /**
   * 인증 서비스들 등록 (기존 구조 유지, 로깅 강화)
   */
  private registerAuthServices(): void {
    console.log('🔐 인증 서비스 등록 시작...');

    // ✅ 1단계: AuthService
    this.container.registerSingleton('AuthService', (container) => {
      const { AuthService } = require('../services/auth/AuthService');
      const config = container.get('AuthConfig');
      const db = container.get('ActiveDatabaseService');
      
      console.log('🔐 AuthService 생성 중...');
      return new AuthService(config, db);
    }, ['AuthConfig', 'ActiveDatabaseService'], 
    { description: '인증 서비스', category: 'auth' });

    // ✅ 2단계: SessionService
    this.container.registerSingleton('SessionService', (container) => {
      const { SessionService } = require('../services/auth/SessionService');
      const config = container.get('AuthConfig');
      
      console.log('🔐 SessionService 생성 중...');
      return new SessionService(config);
    }, ['AuthConfig'], 
    { description: '세션 관리 서비스', category: 'auth' });

    // ✅ 3단계: WebAuthnService (에러 처리 강화)
    this.container.registerSingleton('WebAuthnService', (container) => {
      const { WebAuthnService } = require('../services/auth/WebAuthnService');
      const config = container.get('AuthConfig');
      const db = container.get('ActiveDatabaseService');
      
      try {
        const authService = container.get('AuthService');
        const sessionService = container.get('SessionService');
        
        console.log('🔐 WebAuthnService 생성 중...');
        
        try {
          return new WebAuthnService(config, db, authService, sessionService);
        } catch (newConstructorError) {
          console.log('🔄 새 생성자 실패, 기존 생성자 시도:', newConstructorError.message);
          const webauthnService = new WebAuthnService(config, db);
          
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
        
        // 폴백 서비스 (실제 동작하지만 기본 기능만)
        return {
          startRegistration: async () => { 
            throw new Error('WebAuthnService 초기화 실패. 환경설정을 확인하세요.'); 
          },
          completeRegistration: async () => { 
            throw new Error('WebAuthnService 초기화 실패. 환경설정을 확인하세요.'); 
          },
          startLogin: async () => { 
            throw new Error('WebAuthnService 초기화 실패. 환경설정을 확인하세요.'); 
          },
          completeLogin: async () => { 
            throw new Error('WebAuthnService 초기화 실패. 환경설정을 확인하세요.'); 
          },
          getStatus: async () => ({ 
            error: 'Service not initialized',
            suggestion: '.env 파일의 WEBAUTHN_* 환경변수를 확인하세요'
          })
        };
      }
    }, ['AuthConfig', 'ActiveDatabaseService', 'AuthService', 'SessionService'], 
    { description: 'WebAuthn 인증 서비스 (에러 처리 강화)', category: 'auth' });

    // ✅ 4단계: SessionRestoreService
    this.container.registerSingleton('SessionRestoreService', (container) => {
      const { SessionRestoreService } = require('../services/auth/SessionRestoreService');
      const sessionService = container.get('SessionService');
      const authService = container.get('AuthService');
      
      console.log('🔐 SessionRestoreService 생성 중...');
      return new SessionRestoreService(sessionService, authService);
    }, ['SessionService', 'AuthService'], 
    { description: '세션 복원 서비스', category: 'auth' });

    console.log('✅ 인증 서비스 등록 완료');
  }

  /**
   * AI 서비스들 등록 (실제 기능 강화)
   */
  private registerAIServices(): void {
    console.log('🤖 AI 서비스 등록 시작 (실제 기능 강화)...');

    // AIService - 실제 기능 확인 및 강화
    this.container.registerSingleton('AIService', (container) => {
      const { AIService } = require('../services/ai/AIService');
      const db = container.get('ActiveDatabaseService');
      
      console.log('🤖 AIService 생성 중...');
      const aiService = new AIService(db);
      
      // API 키 상태 확인
      if (process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.includes('your-key')) {
        console.log('✅ OpenAI API 키 설정됨');
      }
      if (process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_API_KEY.includes('your-key')) {
        console.log('✅ Anthropic API 키 설정됨');
      }
      
      return aiService;
    }, ['ActiveDatabaseService'], 
    { description: 'AI 채팅 서비스 (실제 API 연동)', category: 'ai' });

    // PersonalizationService
    this.container.registerSingleton('PersonalizationService', () => {
      const { PersonalizationService } = require('../services/ai/PersonalizationService');
      console.log('🧠 PersonalizationService 생성 중...');
      return new PersonalizationService();
    }, [], { description: '개인화 서비스', category: 'ai' });

    // SemanticCompressionService
    this.container.registerSingleton('SemanticCompressionService', () => {
      const { SemanticCompressionService } = require('../services/ai/SemanticCompressionService');
      console.log('📊 SemanticCompressionService 생성 중...');
      return new SemanticCompressionService();
    }, [], { description: '의미론적 압축 서비스', category: 'ai' });

    // PersonalCueExtractor
    this.container.registerSingleton('PersonalCueExtractor', () => {
      const { PersonalCueExtractor } = require('../services/ai/PersonalCueExtractor');
      console.log('🧩 PersonalCueExtractor 생성 중...');
      return new PersonalCueExtractor();
    }, [], { description: '개인 단서 추출 서비스', category: 'ai' });

    // RealPersonalCueExtractor
    this.container.registerSingleton('RealPersonalCueExtractor', () => {
      const { RealPersonalCueExtractor } = require('../services/ai/RealPersonalCueExtractor');
      console.log('🧩 RealPersonalCueExtractor 생성 중...');
      return new RealPersonalCueExtractor();
    }, [], { description: '실제 개인 단서 추출 서비스', category: 'ai' });

    // RealRAGDAGEngine
    this.container.registerSingleton('RealRAGDAGEngine', () => {
      const { RealRAGDAGEngine } = require('../services/ai/RealRAGDAGEngine');
      console.log('🔗 RealRAGDAGEngine 생성 중...');
      return new RealRAGDAGEngine();
    }, [], { description: 'RAG DAG 엔진', category: 'ai' });

    console.log('✅ AI 서비스 등록 완료 (실제 기능 강화)');
  }

  /**
   * CUE 서비스들 등록
   */
  private registerCUEServices(): void {
    console.log('💎 CUE 서비스 등록 시작...');

    // CueService
    this.container.registerSingleton('CueService', (container) => {
      const { CueService } = require('../services/cue/CueService');
      const db = container.get('ActiveDatabaseService');
      
      console.log('💎 CueService 생성 중...');
      return new CueService(db);
    }, ['ActiveDatabaseService'], 
    { description: 'CUE 토큰 서비스', category: 'cue' });

    // CUEMiningService
    this.container.registerSingleton('CUEMiningService', (container) => {
      const { CUEMiningService } = require('../services/cue/CUEMiningService');
      const db = container.get('ActiveDatabaseService');
      
      console.log('⛏️ CUEMiningService 생성 중...');
      return new CUEMiningService(db);
    }, ['ActiveDatabaseService'], 
    { description: 'CUE 마이닝 서비스', category: 'cue' });

    console.log('✅ CUE 서비스 등록 완료');
  }

  /**
   * Socket 서비스들 등록 (실제 구현 시도, 실패시 Mock)
   */
  private registerSocketServices(): void {
    console.log('🔌 Socket 서비스 등록 시작...');

    this.container.registerSingleton('SocketService', () => {
      try {
        const { SocketService } = require('../services/socket/SocketService');
        
        // 실제 SocketService 초기화 시도
        const socketService = new SocketService();
        console.log('✅ 실제 SocketService 등록 성공');
        return socketService;
        
      } catch (error) {
        console.warn('⚠️ SocketService 로딩 실패, 기본 구현으로 대체:', error.message);
        
        // 기본 구현 제공
        return {
          initialize: () => console.log('Socket 서비스 초기화됨 (기본 구현)'),
          on: (event: string, handler: Function) => console.log(`Socket 이벤트 등록: ${event}`),
          emit: (event: string, data: any) => console.log(`Socket 이벤트 발송: ${event}`, data),
          disconnect: () => console.log('Socket 연결 해제'),
          dispose: () => console.log('Socket 서비스 정리')
        };
      }
    }, [], { description: 'Socket.IO 서비스 (실제/기본 구현)', category: 'socket' });

    console.log('✅ Socket 서비스 등록 완료');
  }

  /**
   * Controller들 등록
   */
  private registerControllers(): void {
    console.log('🎮 Controller 등록 시작...');

    // AuthController (기존 생성자 방식 유지)
    this.container.registerSingleton('AuthController', (container) => {
      const { AuthController } = require('../controllers/AuthController');
      const authService = container.get('AuthService');
      const sessionService = container.get('SessionService');
      const webauthnService = container.get('WebAuthnService');
      
      console.log('🎮 AuthController 생성 중...');
      return new AuthController(authService, sessionService, webauthnService);
    }, ['AuthService', 'SessionService', 'WebAuthnService'], 
    { description: '인증 컨트롤러', category: 'controller' });

    console.log('✅ Controller 등록 완료');
  }

  /**
   * 라우트들 등록 (기존 require 방식 유지, 에러 처리 강화)
   */
  private registerRoutes(): void {
    console.log('🛣️ 라우트 등록 시작...');

    const routes = [
      // Auth 라우트들
      { key: 'AuthUnifiedRoutes', path: '../routes/auth/unified', description: '통합 인증 라우트' },
      { key: 'AuthSessionRoutes', path: '../routes/auth/session-restore', description: '세션 복원 라우트' },
      { key: 'AuthWebAuthnRoutes', path: '../routes/auth/webauthn', description: 'WebAuthn 라우트' },
      
      // AI 라우트들
      { key: 'AIChatRoutes', path: '../routes/ai/chat', description: 'AI 채팅 라우트' },
      
      // CUE 라우트들
      { key: 'CUERoutes', path: '../routes/cue/cue', description: 'CUE 관리 라우트' },
      { key: 'CUEMiningRoutes', path: '../routes/cue/mining', description: 'CUE 마이닝 라우트' },
      { key: 'CUECompleteRoutes', path: '../routes/cue/complete', description: 'CUE 완료 라우트' },
      
      // 기타 라우트들
      { key: 'PassportRoutes', path: '../routes/passport/passport', description: 'Passport 라우트' },
      { key: 'PassportCompleteRoutes', path: '../routes/passport/complete', description: 'Passport 완료 라우트' },
      { key: 'DebugRoutes', path: '../routes/debug/index', description: '디버그 라우트' },
      { key: 'PlatformRoutes', path: '../routes/platform/index', description: '플랫폼 라우트' },
      { key: 'VaultRoutes', path: '../routes/vault/index', description: 'Vault 라우트' }
    ];

    for (const route of routes) {
      this.container.registerSingleton(route.key, () => {
        try {
          const routeModule = require(route.path);
          console.log(`✅ ${route.key} 로딩 성공`);
          return routeModule.default || routeModule;
        } catch (error) {
          console.warn(`⚠️ ${route.key} 로딩 실패, 기본 라우터로 대체:`, error.message);
          
          // 기본 Express 라우터 반환
          const express = require('express');
          const router = express.Router();
          router.use('*', (req: any, res: any) => {
            res.status(501).json({
              error: `${route.key} 라우트가 구현되지 않았습니다`,
              suggestion: `${route.path} 파일을 확인하세요`
            });
          });
          return router;
        }
      }, [], { description: route.description, category: 'route' });
    }

    console.log('✅ 라우트 등록 완료');
  }
}

// ============================================================================
// 📤 초기화 및 헬퍼 함수들 (개선됨)
// ============================================================================

/**
 * 개선된 의존성 주입 시스템 초기화
 */
export function initializeDI(): DIContainer {
  const startTime = Date.now();
  console.log('🚀 개선된 의존성 주입 시스템 초기화...');
  
  const container = DIContainer.getInstance();
  const registry = new ServiceRegistry(container);
  
  try {
    // 컨테이너 초기화 (핵심 서비스 등록)
    container.initialize();
    
    // 모든 서비스 등록
    registry.registerAll();
    
    // 모든 싱글톤 서비스 초기화
    container.initializeAll();
    
    const initTime = Date.now() - startTime;
    console.log(`✅ 의존성 주입 시스템 초기화 완료 (${initTime}ms)`);
    
    // 상태 출력
    const status = container.getStatus();
    console.log('📊 등록된 서비스 현황:');
    console.log(`  - 총 서비스: ${status.totalServices}개`);
    console.log(`  - 초기화된 서비스: ${status.initializedServices}개`);
    console.log(`  - 레거시 서비스: ${status.legacyServices}개`);
    console.log(`  - 상태: ${status.health.status}`);
    
    if (status.health.issues.length > 0) {
      console.warn('⚠️ 발견된 문제:', status.health.issues);
    }
    
    console.log('🦙 AI 제공자: Ollama + 외부 API (실제 기능 활성화)');
    
    return container;
    
  } catch (error) {
    const initTime = Date.now() - startTime;
    console.error(`❌ 의존성 주입 시스템 초기화 실패 (${initTime}ms):`, error);
    throw error;
  }
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
 * 빠른 서비스 접근을 위한 헬퍼 함수들 (기존 패턴 유지)
 */
export const getService = <T>(key: string): T => {
  return DIContainer.getInstance().get<T>(key);
};

// 자주 사용되는 서비스들의 편의 함수 (실제 기능 활성화)
export const getAuthService = () => getService<any>('AuthService');
export const getSessionService = () => getService<any>('SessionService');
export const getWebAuthnService = () => getService<any>('WebAuthnService');
export const getAuthController = () => getService<any>('AuthController');
export const getDatabaseService = () => getService<any>('ActiveDatabaseService');
export const getCryptoService = () => getService<any>('CryptoService');
export const getOllamaService = () => getService<any>('OllamaService');
export const getAIService = () => getService<any>('AIService');
export const getCueService = () => getService<any>('CueService');

// ============================================================================
// 📤 Exports
// ============================================================================

export default DIContainer;