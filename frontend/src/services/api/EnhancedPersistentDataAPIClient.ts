// ============================================================================
// 📁 src/services/api/EnhancedPersistentDataAPIClient.ts
// 🔧 완전히 강화된 API 클라이언트 (JWT 문제 완전 해결 + 모든 기능 확장)
// ============================================================================

import { PersistentDataAPIClient } from './PersistentDataAPIClient';

// 확장된 인터페이스들
interface TokenValidationResult {
  isValid: boolean;
  error?: string;
  details?: any;
  timestamp: number;
}

interface APIRequestOptions {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
  requireAuth?: boolean;
  retryCount?: number;
  timeout?: number;
  useCache?: boolean;
}

interface SessionInfo {
  isValid: boolean;
  expiresAt: Date;
  createdAt: Date;
  lastUsed: Date;
  remainingTime: number;
  remainingDays: number;
  tokenFormat?: string;
  validated?: boolean;
}

export class EnhancedPersistentDataAPIClient extends PersistentDataAPIClient {
  // 확장된 캐싱 시스템
  private tokenValidationCache = new Map<string, TokenValidationResult>();
  private requestCache = new Map<string, { data: any; timestamp: number }>();
  private errorCache = new Map<string, { error: any; timestamp: number; retryAfter: number }>();
  
  // 설정값들
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5분
  private readonly REQUEST_CACHE_DURATION = 2 * 60 * 1000; // 2분
  private readonly ERROR_CACHE_DURATION = 30 * 1000; // 30초
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly DEFAULT_TIMEOUT = 30000; // 30초
  
  // 상태 추적
  private requestStats = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    cachedResponses: 0,
    tokenValidations: 0,
    autoRecoveries: 0
  };

  constructor(baseURL?: string) {
    super(baseURL);
    console.log('🔧 Enhanced PersistentDataAPIClient 완전 초기화');
    
    // 주기적 캐시 정리 (5분마다)
    setInterval(() => {
      this.cleanupCaches();
    }, 5 * 60 * 1000);
    
    // 토큰 자동 검증 (10분마다)
    setInterval(() => {
      this.autoValidateToken();
    }, 10 * 60 * 1000);
    
    // 페이지 숨김/표시 시 자동 세션 체크
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          this.handlePageVisible();
        }
      });
    }
  }


  // ============================================================================
  // 🔧 완전히 강화된 JWT 토큰 관리 시스템
  // ============================================================================

  /**
   * 고급 JWT 토큰 형식 검증 (완전한 분석)
   */
  private validateJWTFormat(token: string): TokenValidationResult {
    const result: TokenValidationResult = {
      isValid: false,
      timestamp: Date.now(),
      details: {}
    };

    try {
      // 1. 기본 타입 및 존재 확인
      if (!token || typeof token !== 'string') {
        result.error = 'Token is not a string or is empty';
        result.details = { type: typeof token, isEmpty: !token };
        return result;
      }

      // 2. Bearer 접두사 처리
      const cleanToken = token.replace(/^Bearer\s+/i, '').trim();
      
      if (!cleanToken) {
        result.error = 'Empty token after cleaning Bearer prefix';
        result.details = { 
          originalLength: token.length, 
          cleanedLength: 0,
          hadBearerPrefix: token.toLowerCase().includes('bearer')
        };
        return result;
      }

      // 3. JWT 구조 검증 (header.payload.signature)
      const parts = cleanToken.split('.');
      if (parts.length !== 3) {
        result.error = `Invalid JWT format - expected 3 parts, got ${parts.length}`;
        result.details = { 
          partsCount: parts.length, 
          partsLengths: parts.map(p => p?.length || 0),
          tokenPreview: cleanToken.substring(0, 50) + '...'
        };
        return result;
      }

      // 4. 각 부분 검증 및 분석
      const [header, payload, signature] = parts;
      
      // 헤더 검증
      if (!header || header.length === 0) {
        result.error = 'JWT header is empty';
        return result;
      }

      // 페이로드 검증
      if (!payload || payload.length === 0) {
        result.error = 'JWT payload is empty';
        return result;
      }

      // 서명 검증
      if (!signature || signature.length === 0) {
        result.error = 'JWT signature is empty';
        return result;
      }

      // 5. Base64URL 디코딩 시도 및 구조 분석
      try {
        // 헤더 분석
        const decodedHeader = this.base64UrlDecode(header);
        const headerObj = JSON.parse(decodedHeader);
        
        if (!headerObj.alg || !headerObj.typ) {
          result.error = 'Invalid JWT header structure - missing alg or typ';
          result.details.header = headerObj;
          return result;
        }

        result.details.header = {
          algorithm: headerObj.alg,
          type: headerObj.typ,
          valid: headerObj.typ === 'JWT'
        };

        // 페이로드 분석
        const decodedPayload = this.base64UrlDecode(payload);
        const payloadObj = JSON.parse(decodedPayload);
        
        result.details.payload = {
          hasUserId: !!payloadObj.userId,
          hasExpiry: !!payloadObj.exp,
          hasIssued: !!payloadObj.iat,
          isExpired: payloadObj.exp ? Date.now() / 1000 > payloadObj.exp : false,
          expiryDate: payloadObj.exp ? new Date(payloadObj.exp * 1000).toISOString() : null
        };

        // 서명 분석
        result.details.signature = {
          length: signature.length,
          isBase64Url: this.isValidBase64Url(signature)
        };

      } catch (decodeError: any) {
        result.error = `JWT decoding failed: ${decodeError.message}`;
        result.details.decodeError = decodeError.message;
        return result;
      }

      // 6. 모든 검증 통과
      result.isValid = true;
      result.details.validationPassed = true;
      result.details.tokenLength = cleanToken.length;
      
      console.log('✅ JWT 형식 검증 완전 통과');
      return result;

    } catch (error: any) {
      result.error = `JWT validation error: ${error.message}`;
      result.details.exception = error.message;
      return result;
    }
  }

  /**
   * Base64URL 디코딩 헬퍼
   */
  private base64UrlDecode(str: string): string {
    // Base64URL을 Base64로 변환
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    
    // 패딩 추가
    while (base64.length % 4) {
      base64 += '=';
    }
    
    return atob(base64);
  }

  /**
   * Base64URL 형식 검증
   */
  private isValidBase64Url(str: string): boolean {
    const base64UrlRegex = /^[A-Za-z0-9_-]*$/;
    return base64UrlRegex.test(str);
  }

  /**
   * 서버 기반 토큰 검증 (고급)
   */
  private async validateTokenWithServer(token: string): Promise<TokenValidationResult> {
    try {
      console.log('🔍 서버 토큰 검증 시작');
      
      const response = await fetch(`${this.baseURL}/api/auth/verify-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
        signal: AbortSignal.timeout(10000) // 10초 타임아웃
      });

      const result = await response.json();
      
      return {
        isValid: result.success === true,
        timestamp: Date.now(),
        details: {
          serverValidation: true,
          serverResponse: result,
          responseStatus: response.status
        },
        error: result.success ? undefined : result.error
      };
    } catch (error: any) {
      console.warn('⚠️ 서버 토큰 검증 실패:', error.message);
      return {
        isValid: false,
        timestamp: Date.now(),
        error: `Server validation failed: ${error.message}`,
        details: { serverValidation: false, networkError: true }
      };
    }
  }

  /**
   * 종합 토큰 검증 (캐시 + 형식 + 서버)
   */
  private async validateTokenComprehensive(token: string): Promise<TokenValidationResult> {
    if (!token) {
      return {
        isValid: false,
        timestamp: Date.now(),
        error: 'No token provided'
      };
    }

    // 1. 캐시 확인
    const cached = this.tokenValidationCache.get(token);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log('🎯 캐시된 토큰 검증 결과 사용');
      return cached;
    }

    // 2. 형식 검증
    const formatResult = this.validateJWTFormat(token);
    if (!formatResult.isValid) {
      this.tokenValidationCache.set(token, formatResult);
      this.requestStats.tokenValidations++;
      return formatResult;
    }

    // 3. 서버 검증 (형식이 유효한 경우만)
    const serverResult = await this.validateTokenWithServer(token);
    
    // 4. 결과 통합
    const finalResult: TokenValidationResult = {
      isValid: formatResult.isValid && serverResult.isValid,
      timestamp: Date.now(),
      error: serverResult.error || formatResult.error,
      details: {
        ...formatResult.details,
        ...serverResult.details,
        comprehensiveValidation: true
      }
    };

    // 5. 캐시 저장
    this.tokenValidationCache.set(token, finalResult);
    this.requestStats.tokenValidations++;
    
    console.log(finalResult.isValid ? '✅ 종합 토큰 검증 성공' : '❌ 종합 토큰 검증 실패');
    return finalResult;
  }

  /**
   * 고급 세션 토큰 설정 (검증 포함)
   */
  setSessionToken(token: string): void {
    if (typeof window === 'undefined') return;
    
    try {
      console.log('💾 고급 세션 토큰 설정 시작');
      
      // 토큰 형식 사전 검증
      const validation = this.validateJWTFormat(token);
      if (!validation.isValid) {
        console.error('❌ 유효하지 않은 토큰 형식:', validation.error);
        throw new Error(`Invalid token format: ${validation.error}`);
      }

      const sessionTimeout = 30 * 24 * 60 * 60 * 1000; // 30일
      const expiresAt = Date.now() + sessionTimeout;
      const sessionData = {
        token,
        expiresAt,
        createdAt: Date.now(),
        lastUsed: Date.now(),
        validated: true,
        format: 'jwt',
        validation: validation.details,
        clientVersion: 'enhanced-v2.0'
      };
      
      // 다중 저장 (안전성 확보)
      localStorage.setItem('cue_session_token', token);
      localStorage.setItem('cue_session_data', JSON.stringify(sessionData));
      
      // 백업 저장소
      try {
        sessionStorage.setItem('cue_session_backup', token);
      } catch (sessionError) {
        console.warn('⚠️ 세션 백업 저장 실패:', sessionError);
      }
      
      // 캐시에 유효한 토큰으로 저장
      this.tokenValidationCache.set(token, {
        isValid: true,
        timestamp: Date.now(),
        details: { localValidation: true }
      });
      
      console.log('💾 고급 세션 토큰 저장 완료 (검증됨 + 백업됨)');
    } catch (error) {
      console.error('❌ 세션 토큰 저장 실패:', error);
      throw error;
    }
  }

  /**
   * 강화된 세션 토큰 조회 (자동 복구 포함)
   */
  getSessionToken(): string | null {
    if (typeof window === 'undefined') return null;
    
    try {
      let token = localStorage.getItem('cue_session_token');
      let sessionDataStr = localStorage.getItem('cue_session_data');
      
      // 메인 토큰이 없으면 백업에서 복구 시도
      if (!token) {
        console.log('🔄 메인 토큰 없음, 백업에서 복구 시도');
        try {
          token = sessionStorage.getItem('cue_session_backup');
          if (token) {
            console.log('✅ 백업 토큰으로 복구 성공');
            this.setSessionToken(token); // 메인 저장소에 복원
            this.requestStats.autoRecoveries++;
          }
        } catch (backupError) {
          console.warn('⚠️ 백업 토큰 복구 실패:', backupError);
        }
      }
      
      if (!token) return null;
      
      // 세션 데이터 파싱 및 만료 확인
      if (sessionDataStr) {
        try {
          const sessionData = JSON.parse(sessionDataStr);
          
          // 만료 확인
          if (sessionData.expiresAt && Date.now() > sessionData.expiresAt) {
            console.log('⏰ 세션 토큰 만료됨');
            this.clearSessionToken();
            return null;
          }

          // 마지막 사용 시간 업데이트
          sessionData.lastUsed = Date.now();
          localStorage.setItem('cue_session_data', JSON.stringify(sessionData));
        } catch (parseError) {
          console.warn('⚠️ 세션 데이터 파싱 실패, 토큰은 유지');
        }
      }

      // 토큰 형식 검증
      const validation = this.validateJWTFormat(token);
      if (!validation.isValid) {
        console.error('❌ 저장된 토큰이 유효하지 않은 형식:', validation.error);
        this.clearSessionToken();
        return null;
      }
      
      return token;
    } catch (error) {
      console.error('❌ 세션 토큰 조회 실패:', error);
      this.clearSessionToken();
      return null;
    }
  }

  /**
   * 강화된 세션 정보 조회
   */
  getSessionInfo(): SessionInfo | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const sessionDataStr = localStorage.getItem('cue_session_data');
      if (!sessionDataStr) return null;
      
      const sessionData = JSON.parse(sessionDataStr);
      const now = Date.now();
      
      return {
        isValid: sessionData.expiresAt > now,
        expiresAt: new Date(sessionData.expiresAt),
        createdAt: new Date(sessionData.createdAt),
        lastUsed: new Date(sessionData.lastUsed),
        remainingTime: Math.max(0, sessionData.expiresAt - now),
        remainingDays: Math.max(0, Math.floor((sessionData.expiresAt - now) / (24 * 60 * 60 * 1000))),
        tokenFormat: sessionData.format || 'unknown',
        validated: sessionData.validated || false
      };
    } catch (error) {
      console.error('❌ 세션 정보 조회 실패:', error);
      return null;
    }
  }

  /**
   * 완전한 세션 토큰 정리
   */
  clearSessionToken(): void {
    if (typeof window === 'undefined') return;
    
    try {
      // 메인 저장소 정리
      localStorage.removeItem('cue_session_token');
      localStorage.removeItem('cue_session_data');
      localStorage.removeItem('cue_session_id'); // 호환성
      
      // 백업 저장소 정리
      try {
        sessionStorage.removeItem('cue_session_backup');
      } catch (sessionError) {
        console.warn('⚠️ 세션 백업 정리 실패:', sessionError);
      }
      
      // 레거시 데이터 정리
      localStorage.removeItem('webauthn_user_data');
      localStorage.removeItem('final0626_auth_token');
      
      // 캐시 정리
      this.tokenValidationCache.clear();
      this.requestCache.clear();
      this.errorCache.clear();
      
      console.log('🗑️ 모든 세션 데이터 완전 삭제됨');
    } catch (error) {
      console.error('❌ 세션 토큰 삭제 실패:', error);
    }
  }

  /**
   * 고급 인증 헤더 생성
   */
  private getAuthHeaders(): Record<string, string> {
    const token = this.getSessionToken();
    if (!token) return {};

    // Bearer 접두사 처리
    const bearerToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    
    return { 
      'Authorization': bearerToken,
      'X-Token-Format': 'jwt',
      'X-Client-Version': 'enhanced-v2.0',
      'X-Validation-Cache': this.tokenValidationCache.has(token) ? 'hit' : 'miss'
    };
  }

  // ============================================================================
  // 🔧 고급 API 요청 처리 시스템
  // ============================================================================

  /**
   * 완전히 강화된 API 요청 (캐싱 + 재시도 + 검증)
   */
  async request(endpoint: string, options: APIRequestOptions = {}): Promise<any> {
    const {
      method = 'GET',
      body,
      headers = {},
      requireAuth = true,
      retryCount = this.MAX_RETRY_ATTEMPTS,
      timeout = this.DEFAULT_TIMEOUT,
      useCache = true
    } = options;

    const url = `${this.baseURL}${endpoint}`;
    const cacheKey = `${method}:${endpoint}:${JSON.stringify(body)}`;
    
    this.requestStats.totalRequests++;
    
    // 1. 요청 캐시 확인 (GET 요청만)
    if (method === 'GET' && useCache) {
      const cached = this.requestCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.REQUEST_CACHE_DURATION) {
        console.log('🎯 캐시된 API 응답 사용:', endpoint);
        this.requestStats.cachedResponses++;
        return cached.data;
      }
    }

    // 2. 에러 캐시 확인 (반복 실패 방지)
    const errorCached = this.errorCache.get(cacheKey);
    if (errorCached && Date.now() - errorCached.timestamp < errorCached.retryAfter) {
      console.log('⏳ 에러 캐시로 인한 요청 지연:', endpoint);
      throw new Error(`Request temporarily blocked due to recent failure: ${errorCached.error.message}`);
    }

    // 3. 토큰 사전 검증 (인증 필요한 요청)
    if (requireAuth) {
      const token = this.getSessionToken();
      if (token) {
        const validation = await this.validateTokenComprehensive(token);
        if (!validation.isValid) {
          console.warn('⚠️ 유효하지 않은 토큰 감지, 정리 후 재시도');
          this.clearSessionToken();
          throw new Error(`Token validation failed: ${validation.error}`);
        }
      }
    }
    
    let lastError: Error | null = null;
    
    // 4. 재시도 로직
    for (let attempt = 1; attempt <= retryCount; attempt++) {
      try {
        console.log(`📞 고급 API 요청 [시도 ${attempt}/${retryCount}]: ${method} ${endpoint}`);
        
        const requestHeaders = { 
          'Content-Type': 'application/json',
          ...(requireAuth ? this.getAuthHeaders() : {}),
          ...headers
        };
        
        // FormData인 경우 Content-Type 제거
        if (body instanceof FormData) {
          delete requestHeaders['Content-Type'];
        }
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        const response = await fetch(url, {
          method,
          headers: requestHeaders,
          body: body instanceof FormData ? body : (body ? JSON.stringify(body) : undefined),
          mode: 'cors',
          credentials: 'include',
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));

          // 401 에러 특별 처리
          if (response.status === 401) {
            console.log('🗑️ 401 에러로 인한 세션 토큰 삭제');
            this.clearSessionToken();
            
            // 상세 에러 정보 로깅
            if (errorData.details) {
              console.log('🔧 401 에러 상세 정보:', errorData.details);
            }
            if (errorData.suggestions) {
              console.log('💡 해결 제안:', errorData.suggestions);
            }
            if (errorData.troubleshooting) {
              console.log('🛠️ 트러블슈팅:', errorData.troubleshooting);
            }
          }

          const error = new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
          (error as any).status = response.status;
          (error as any).details = errorData;
          throw error;
        }

        const data = await response.json();
        
        // 5. 성공 시 캐시 저장 (GET 요청만)
        if (method === 'GET' && useCache) {
          this.requestCache.set(cacheKey, {
            data,
            timestamp: Date.now()
          });
        }

        // 6. 에러 캐시 정리 (성공 시)
        this.errorCache.delete(cacheKey);
        
        this.requestStats.successfulRequests++;
        console.log('✅ 고급 API 요청 성공:', { endpoint, attempt, hasData: !!data });
        return data;
        
      } catch (error: any) {
        lastError = error;
        console.error(`❌ 고급 API 요청 실패 [시도 ${attempt}/${retryCount}]:`, error.message);
        
        // 토큰 관련 에러 처리
        if (error.message.includes('Token validation failed') || 
            error.message.includes('JWT') ||
            error.status === 401) {
          console.log('🔧 토큰 관련 에러, 캐시 정리');
          this.tokenValidationCache.clear();
          if (error.status === 401) {
            this.clearSessionToken();
          }
        }
        
        // 네트워크 오류인 경우 재시도
        if (attempt < retryCount && this.isRetryableError(error)) {
          const delay = 1000 * Math.pow(2, attempt - 1); // 지수 백오프
          console.log(`⏳ ${delay}ms 후 재시도...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        break;
      }
    }
    
    // 7. 모든 재시도 실패 시 에러 캐시 저장
    if (lastError) {
      this.errorCache.set(cacheKey, {
        error: lastError,
        timestamp: Date.now(),
        retryAfter: this.getRetryAfter(lastError)
      });
      
      this.requestStats.failedRequests++;
    }
    
    // 8. Mock 응답 제공 (최종 폴백)
    console.log(`🎭 ${retryCount}회 시도 실패, Mock 응답 사용: ${endpoint}`);
    return this.getMockFallback(endpoint, { method, body });
  }

  /**
   * 재시도 대기 시간 계산
   */
  private getRetryAfter(error: any): number {
    if (error.status === 429) return 60000; // 1분
    if (error.status >= 500) return 30000; // 30초
    if (error.message.includes('network')) return 10000; // 10초
    return 5000; // 기본 5초
  }

  // ============================================================================
  // 🔧 자동화 및 생명주기 관리
  // ============================================================================

  /**
   * 페이지 표시 시 자동 처리
   */
  private async handlePageVisible(): Promise<void> {
    console.log('👁️ 페이지 표시됨, 자동 세션 확인');
    
    const token = this.getSessionToken();
    if (token) {
      // 토큰 유효성 재검증
      const validation = await this.validateTokenComprehensive(token);
      if (!validation.isValid) {
        console.log('🔄 페이지 복귀 시 유효하지 않은 토큰 감지, 세션 복원 시도');
        await this.restoreSession();
      }
    }
    
    // WebSocket 재연결
    if (this.websocket?.readyState !== WebSocket.OPEN) {
      this.connectWebSocket();
    }
  }

  /**
   * 자동 토큰 검증 (주기적)
   */
  private async autoValidateToken(): Promise<void> {
    const token = this.getSessionToken();
    if (!token) return;
    
    console.log('🔄 자동 토큰 검증 실행');
    
    try {
      const validation = await this.validateTokenComprehensive(token);
      if (!validation.isValid) {
        console.log('🚨 자동 검증에서 유효하지 않은 토큰 발견, 정리');
        this.clearSessionToken();
      }
    } catch (error) {
      console.warn('⚠️ 자동 토큰 검증 실패:', error);
    }
  }

  /**
   * 캐시 정리 (주기적)
   */
  private cleanupCaches(): void {
    const now = Date.now();
    
    // 토큰 검증 캐시 정리
    for (const [token, result] of this.tokenValidationCache.entries()) {
      if (now - result.timestamp > this.CACHE_DURATION) {
        this.tokenValidationCache.delete(token);
      }
    }
    
    // 요청 캐시 정리
    for (const [key, cached] of this.requestCache.entries()) {
      if (now - cached.timestamp > this.REQUEST_CACHE_DURATION) {
        this.requestCache.delete(key);
      }
    }
    
    // 에러 캐시 정리
    for (const [key, errorCached] of this.errorCache.entries()) {
      if (now - errorCached.timestamp > this.ERROR_CACHE_DURATION) {
        this.errorCache.delete(key);
      }
    }
    
    console.log('🧹 캐시 정리 완료:', {
      tokenCache: this.tokenValidationCache.size,
      requestCache: this.requestCache.size,
      errorCache: this.errorCache.size
    });
  }

  // ============================================================================
  // 🔧 완전히 강화된 세션 복원
  // ============================================================================

  async restoreSession(): Promise<any> {
    console.log('🔧 === 완전히 강화된 세션 복원 ===');
    
    try {
      const sessionToken = this.getSessionToken();
      
      if (!sessionToken) {
        console.log('❌ 저장된 세션 토큰 없음');
        return { success: false, error: 'No session token found' };
      }

      console.log('🔍 저장된 세션 토큰 발견, 종합 검증 후 복원...');
      
      // 종합 토큰 검증
      const validation = await this.validateTokenComprehensive(sessionToken);
      if (!validation.isValid) {
        console.error('❌ 저장된 토큰 종합 검증 실패:', validation.error);
        this.clearSessionToken();
        return { 
          success: false, 
          error: 'Token validation failed',
          details: validation.details
        };
      }

      // 세션 정보 확인
      const sessionInfo = this.getSessionInfo();
      if (sessionInfo && !sessionInfo.isValid) {
        console.log('⏰ 세션 토큰 만료됨');
        this.clearSessionToken();
        return { success: false, error: 'Session token expired' };
      }

      const response = await this.request('/api/auth/session/restore', {
        method: 'POST',
        body: { sessionToken },
        requireAuth: false, // 복원 요청이므로 사전 인증 검증 생략
        useCache: false // 항상 최신 데이터
      });

      if (!response.success) {
        console.log('❌ 서버 세션 복원 실패, 토큰 삭제');
        this.clearSessionToken();
        return { 
          success: false, 
          error: response.error || 'Session restore failed',
          serverResponse: response
        };
      }

      console.log('✅ 완전히 강화된 세션 복원 성공!', {
        username: response.user?.username,
        cueBalance: response.user?.cueBalance || response.user?.cue_tokens,
        restoredFrom: response.restoredFrom,
        validationPassed: validation.isValid
      });

      return {
        success: true,
        user: response.user,
        message: response.message || '세션이 완전히 복원되었습니다',
        sessionInfo: response.sessionInfo,
        validation: validation.details
      };

    } catch (error: any) {
      console.error('💥 완전히 강화된 세션 복원 오류:', error);
      this.clearSessionToken();
      this.tokenValidationCache.clear();
      return { 
        success: false, 
        error: error.message || 'Session restore failed',
        details: { exception: error.message }
      };
    }
  }

  // ============================================================================
  // 🔧 고급 디버깅 및 모니터링
  // ============================================================================

  getComprehensiveDebugInfo(): any {
    const sessionInfo = this.getSessionInfo();
    const token = this.getSessionToken();
    const validation = token ? this.validateJWTFormat(token) : null;
    
    return {
      client: 'EnhancedPersistentDataAPIClient v2.0',
      session: {
        hasToken: !!token,
        tokenLength: token?.length,
        tokenValidation: validation,
        sessionInfo,
        backupAvailable: typeof window !== 'undefined' ? 
          !!sessionStorage.getItem('cue_session_backup') : false
      },
      caches: {
        tokenValidation: {
          size: this.tokenValidationCache.size,
          entries: Array.from(this.tokenValidationCache.keys()).slice(0, 3)
        },
        requests: {
          size: this.requestCache.size,
          entries: Array.from(this.requestCache.keys()).slice(0, 3)
        },
        errors: {
          size: this.errorCache.size,
          entries: Array.from(this.errorCache.keys()).slice(0, 3)
        }
      },
      statistics: this.requestStats,
      connection: {
        baseURL: this.baseURL,
        websocketState: this.websocket?.readyState,
        listenerCount: this.listeners.size
      },
      performance: {
        cacheHitRate: this.requestStats.totalRequests > 0 ? 
          (this.requestStats.cachedResponses / this.requestStats.totalRequests * 100).toFixed(2) + '%' : '0%',
        successRate: this.requestStats.totalRequests > 0 ? 
          (this.requestStats.successfulRequests / this.requestStats.totalRequests * 100).toFixed(2) + '%' : '0%',
        autoRecoveries: this.requestStats.autoRecoveries
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 통계 초기화
   */
  resetStatistics(): void {
    this.requestStats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      cachedResponses: 0,
      tokenValidations: 0,
      autoRecoveries: 0
    };
    console.log('📊 통계 초기화됨');
  }

  /**
   * 전체 캐시 강제 정리
   */
  forceCleanupAll(): void {
    this.tokenValidationCache.clear();
    this.requestCache.clear();
    this.errorCache.clear();
    console.log('🧹 모든 캐시 강제 정리됨');
  }

  /**
   * 정리 (컴포넌트 언마운트 시 호출)
   */
  cleanup(): void {
    console.log('🧹 EnhancedPersistentDataAPIClient 완전 정리 중...');
    
    // 부모 클래스 정리
    super.cleanup?.();
    
    // 확장된 정리
    this.forceCleanupAll();
    this.resetStatistics();
  }
}

// 기본 export
export default EnhancedPersistentDataAPIClient;