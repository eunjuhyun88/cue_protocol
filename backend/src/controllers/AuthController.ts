// ============================================================================
// 📁 backend/src/controllers/AuthController.ts
// 🎮 리팩토링된 AuthController - DI 패턴 적용, 완전한 에러 처리
// ============================================================================

import { Request, Response } from 'express';
import { 
  AuthService, 
  SessionService, 
  WebAuthnService 
} from '../services/auth';
import { 
  WebAuthnStartRequest, 
  WebAuthnCompleteRequest,
  SessionRestoreRequest,
  AuthError,
  WebAuthnError,
  SessionError,
  ValidationError
} from '../types/auth.types';

/**
 * 인증 컨트롤러 - DI 패턴 적용 완료
 * 모든 의존성을 생성자에서 주입받음
 */
export class AuthController {
  constructor(
    private authService: AuthService,
    private sessionService: SessionService,
    private webauthnService: WebAuthnService
  ) {
    console.log('🎮 AuthController 초기화됨 (DI 패턴)');
    console.log('✅ 모든 서비스 의존성 주입 완료');
  }

  // ============================================================================
  // 🔥 통합 WebAuthn 인증 (paste.txt 로직 완전 적용)
  // ============================================================================

  /**
   * 통합 인증 시작 - 기존/신규 사용자 자동 처리
   * POST /api/auth/webauthn/start
   */
  startUnifiedAuth = async (req: Request, res: Response): Promise<void> => {
    try {
      console.log('🔍 === 통합 WebAuthn 인증 시작 ===');
      
      const { deviceInfo } = req.body as WebAuthnStartRequest;
      
      // 요청 검증
      this.validateStartRequest(req.body);
      
      // 디바이스 정보 수집 및 보강
      const enrichedDeviceInfo = this.enrichDeviceInfo(req, deviceInfo);
      
      // WebAuthn 서비스를 통한 인증 시작
      const result = await this.webauthnService.startUnifiedAuthentication(enrichedDeviceInfo);
      
      // 성공 응답
      res.json({
        success: true,
        ...result,
        message: '패스키를 사용하여 인증해주세요. 기존 사용자는 자동 로그인, 신규 사용자는 자동 가입됩니다.',
        timestamp: new Date().toISOString(),
        debug: this.createDebugInfo(req, result)
      });
      
    } catch (error) {
      this.handleError(error, res, 'startUnifiedAuth');
    }
  };

  /**
   * 통합 인증 완료 - 로그인 또는 회원가입 처리 (paste.txt 완전 적용)
   * POST /api/auth/webauthn/complete
   */
  completeUnifiedAuth = async (req: Request, res: Response): Promise<void> => {
    try {
      console.log('✅ === 통합 WebAuthn 인증 완료 ===');
      
      const { credential, sessionId } = req.body as WebAuthnCompleteRequest;
      
      // 요청 검증
      this.validateCompleteRequest(req.body);
      
      const userAgent = req.get('User-Agent') || 'Unknown';
      
      // WebAuthn 서비스를 통한 인증 완료
      const result = await this.webauthnService.completeUnifiedAuthentication(
        credential, 
        sessionId,
        userAgent
      );
      
      // paste.txt 방식의 응답 포맷 적용 (하위 호환성 포함)
      const response = {
        success: true,
        action: result.action, // 'login' | 'register'
        sessionToken: result.sessionToken,
        user: this.formatCompatibleUserResponse(result.user),
        isExistingUser: result.isExistingUser,
        rewards: result.rewards,
        message: result.message,
        timestamp: new Date().toISOString(),
        debug: this.createDebugInfo(req, result)
      };
      
      res.json(response);
      
    } catch (error) {
      this.handleError(error, res, 'completeUnifiedAuth');
    }
  };

  // ============================================================================
  // 🔧 기존 WebAuthn API (하위 호환성 - 완전 지원)
  // ============================================================================

  /**
   * 회원가입 시작
   * POST /api/auth/webauthn/register/start
   */
  startRegistration = async (req: Request, res: Response): Promise<void> => {
    try {
      console.log('🆕 === WebAuthn 회원가입 시작 ===');
      
      const { userEmail, deviceInfo } = req.body;
      
      const enrichedDeviceInfo = this.enrichDeviceInfo(req, deviceInfo);
      
      const result = await this.webauthnService.startRegistration(userEmail, enrichedDeviceInfo);
      
      res.json({
        success: true,
        ...result,
        message: '패스키를 등록해주세요.',
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      this.handleError(error, res, 'startRegistration');
    }
  };

  /**
   * 회원가입 완료
   * POST /api/auth/webauthn/register/complete
   */
  completeRegistration = async (req: Request, res: Response): Promise<void> => {
    try {
      console.log('🚀 === WebAuthn 회원가입 완료 ===');
      
      const { credential, sessionId } = req.body as WebAuthnCompleteRequest;
      
      this.validateCompleteRequest(req.body);
      
      const userAgent = req.get('User-Agent') || 'Unknown';
      
      // 통합 인증을 사용하여 처리 (중복 로직 제거)
      const result = await this.webauthnService.completeUnifiedAuthentication(
        credential,
        sessionId,
        userAgent
      );
      
      res.json({
        success: true,
        ...result,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      this.handleError(error, res, 'completeRegistration');
    }
  };

  /**
   * 로그인 시작
   * POST /api/auth/webauthn/login/start
   */
  startLogin = async (req: Request, res: Response): Promise<void> => {
    try {
      console.log('🔑 === WebAuthn 로그인 시작 ===');
      
      const { deviceInfo } = req.body;
      
      const enrichedDeviceInfo = this.enrichDeviceInfo(req, deviceInfo);
      
      const result = await this.webauthnService.startLogin(enrichedDeviceInfo);
      
      res.json({
        success: true,
        ...result,
        message: '등록된 패스키로 인증해주세요.',
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      this.handleError(error, res, 'startLogin');
    }
  };

  /**
   * 로그인 완료
   * POST /api/auth/webauthn/login/complete
   */
  completeLogin = async (req: Request, res: Response): Promise<void> => {
    try {
      console.log('✅ === WebAuthn 로그인 완료 ===');
      
      const { credential, sessionId } = req.body as WebAuthnCompleteRequest;
      
      this.validateCompleteRequest(req.body);
      
      const userAgent = req.get('User-Agent') || 'Unknown';
      
      // 통합 인증을 사용하여 처리
      const result = await this.webauthnService.completeUnifiedAuthentication(
        credential,
        sessionId,
        userAgent
      );
      
      res.json({
        success: true,
        ...result,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      this.handleError(error, res, 'completeLogin');
    }
  };

  // ============================================================================
  // 🔧 세션 관리 (paste.txt 방식 완전 적용)
  // ============================================================================

  /**
   * 세션 복원
   * POST /api/auth/session/restore
   */
  restoreSession = async (req: Request, res: Response): Promise<void> => {
    try {
      console.log('🔧 === 세션 복원 ===');
      
      const { sessionToken } = req.body as SessionRestoreRequest;
      
      // 요청 검증
      if (!sessionToken) {
        throw new ValidationError('sessionToken이 필요합니다', 'sessionToken');
      }
      
      // 세션 서비스를 통한 사용자 조회
      const user = await this.sessionService.getUserBySession(sessionToken);
      
      if (!user) {
        throw new SessionError('유효하지 않거나 만료된 세션입니다', 'invalid');
      }
      
      // paste.txt와 동일한 응답 포맷
      res.json({
        success: true,
        user: this.formatCompatibleUserResponse(user),
        sessionInfo: {
          restoredAt: new Date().toISOString(),
          deviceTrusted: true // 기존 세션이므로 신뢰함
        },
        message: '세션이 복원되었습니다',
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      this.handleError(error, res, 'restoreSession');
    }
  };

  /**
   * 로그아웃
   * POST /api/auth/logout
   */
  logout = async (req: Request, res: Response): Promise<void> => {
    try {
      console.log('🔧 === 로그아웃 ===');
      
      const { sessionToken } = req.body;
      
      if (sessionToken) {
        await this.sessionService.invalidateSession(sessionToken);
        console.log('🗑️ 세션 토큰 무효화 처리 완료');
      }
      
      res.json({
        success: true,
        message: '로그아웃되었습니다',
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      this.handleError(error, res, 'logout');
    }
  };

  // ============================================================================
  // 🔍 상태 확인 & 디버깅
  // ============================================================================

  /**
   * 활성 세션 목록 조회 (개발용)
   * GET /api/auth/sessions
   */
  getSessions = async (req: Request, res: Response): Promise<void> => {
    try {
      const sessions = this.sessionService.getActiveSessions();
      
      // 민감한 정보 제거
      const safeSessions = sessions.map(session => ({
        sessionId: session.id.substring(0, 8) + '...',
        userId: session.userId?.substring(0, 8) + '...' || 'anonymous',
        type: session.type,
        created: session.created,
        lastAccess: session.lastAccess,
        isActive: session.isActive,
        deviceType: session.deviceInfo?.deviceType || 'unknown'
      }));
      
      res.json({
        success: true,
        sessionCount: sessions.length,
        sessions: safeSessions,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      this.handleError(error, res, 'getSessions');
    }
  };

  /**
   * 인증 시스템 상태 확인
   * GET /api/auth/status
   */
  getAuthStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const [authStatus, sessionInfo] = await Promise.all([
        this.authService.getAuthSystemStatus(),
        this.sessionService.getStatus()
      ]);
      
      res.json({
        success: true,
        system: {
          authService: {
            initialized: true,
            database: authStatus.database,
            services: authStatus.services,
            config: authStatus.config
          },
          sessionService: {
            initialized: true,
            activeSessions: sessionInfo.sessionService.activeSessions,
            jwtConfigured: sessionInfo.sessionService.jwtConfigured,
            sessionTimeout: sessionInfo.sessionService.sessionTimeout
          },
          webauthnService: {
            initialized: true,
            configured: true
          }
        },
        integration: {
          diContainer: 'active',
          serviceConnections: 'healthy'
        },
        environment: process.env.NODE_ENV || 'development',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      this.handleError(error, res, 'getAuthStatus');
    }
  };

  // ============================================================================
  // 🛠️ 헬퍼 메서드들
  // ============================================================================

  /**
   * 디바이스 정보 보강
   */
  private enrichDeviceInfo(req: Request, deviceInfo?: any): any {
    return {
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      forwarded: req.get('X-Forwarded-For'),
      host: req.get('Host'),
      origin: req.get('Origin'),
      referer: req.get('Referer'),
      acceptLanguage: req.get('Accept-Language'),
      timestamp: new Date().toISOString(),
      ...deviceInfo
    };
  }

  /**
   * 호환성을 위한 사용자 응답 포맷팅
   */
  private formatCompatibleUserResponse(user: any): any {
    return {
      // 기본 정보
      id: user.id,
      username: user.username,
      email: user.email,
      did: user.did,
      
      // 지갑 정보 (호환성을 위한 중복 키)
      wallet_address: user.wallet_address,
      walletAddress: user.wallet_address, // 프론트엔드 호환성
      
      // 프로필 정보
      display_name: user.display_name,
      
      // 점수 및 레벨 (호환성을 위한 중복 키)
      trust_score: user.trust_score,
      trustScore: user.trust_score, // 프론트엔드 호환성
      passport_level: user.passport_level,
      passportLevel: user.passport_level, // 프론트엔드 호환성
      
      // 인증 상태 (호환성을 위한 중복 키)
      biometric_verified: user.biometric_verified,
      biometricVerified: user.biometric_verified, // 프론트엔드 호환성
      passkey_registered: user.passkey_registered,
      passkeyRegistered: user.passkey_registered, // 프론트엔드 호환성
      
      // CUE 토큰 (호환성을 위한 중복 키)
      cue_tokens: user.cue_tokens,
      cueBalance: user.cue_tokens, // 프론트엔드 호환성
      
      // 날짜 정보 (호환성을 위한 중복 키)
      created_at: user.created_at,
      registeredAt: user.created_at, // 프론트엔드 호환성
      last_login_at: user.last_login_at,
      lastLoginAt: user.last_login_at // 프론트엔드 호환성
    };
  }

  /**
   * 디버그 정보 생성 (개발 환경에서만)
   */
  private createDebugInfo(req: Request, data?: any): any {
    if (process.env.NODE_ENV !== 'development') {
      return undefined;
    }
    
    return {
      method: req.method,
      path: req.path,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      sessionData: data ? {
        sessionId: data.sessionId?.substring(0, 8) + '...',
        hasOptions: !!data.options,
        hasUser: !!data.user
      } : undefined,
      timestamp: new Date().toISOString()
    };
  }

  // ============================================================================
  // 🔍 요청 검증 메서드들
  // ============================================================================

  /**
   * 인증 시작 요청 검증
   */
  private validateStartRequest(body: any): void {
    // 기본적으로는 검증할 필수 필드 없음 (deviceInfo는 선택적)
    if (body.deviceInfo && typeof body.deviceInfo !== 'object') {
      throw new ValidationError('deviceInfo는 객체여야 합니다', 'deviceInfo', body.deviceInfo);
    }
  }

  /**
   * 인증 완료 요청 검증
   */
  private validateCompleteRequest(body: any): void {
    const { credential, sessionId } = body;
    
    if (!credential) {
      throw new ValidationError('credential이 필요합니다', 'credential');
    }
    
    if (!sessionId) {
      throw new ValidationError('sessionId가 필요합니다', 'sessionId');
    }
    
    if (typeof credential !== 'object') {
      throw new ValidationError('credential은 객체여야 합니다', 'credential', credential);
    }
    
    if (!credential.id) {
      throw new ValidationError('credential.id가 필요합니다', 'credential.id');
    }
    
    if (!credential.response) {
      throw new ValidationError('credential.response가 필요합니다', 'credential.response');
    }
    
    if (typeof sessionId !== 'string' || sessionId.length < 10) {
      throw new ValidationError('유효하지 않은 sessionId입니다', 'sessionId', sessionId);
    }
  }

  // ============================================================================
  // 🚨 통합 에러 처리
  // ============================================================================

  /**
   * 통합 에러 처리 메서드
   */
  private handleError(error: any, res: Response, context: string): void {
    console.error(`❌ ${context} 오류:`, error);
    
    // 커스텀 에러 타입별 처리
    if (error instanceof ValidationError) {
      res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: error.message,
        field: error.field,
        value: error.value,
        context,
        timestamp: new Date().toISOString()
      });
      return;
    }
    
    if (error instanceof SessionError) {
      res.status(401).json({
        success: false,
        error: 'Session Error',
        message: error.message,
        reason: error.reason,
        context,
        timestamp: new Date().toISOString()
      });
      return;
    }
    
    if (error instanceof WebAuthnError) {
      res.status(400).json({
        success: false,
        error: 'WebAuthn Error',
        message: error.message,
        code: error.code,
        context,
        timestamp: new Date().toISOString()
      });
      return;
    }
    
    if (error instanceof AuthError) {
      res.status(error.statusCode).json({
        success: false,
        error: 'Authentication Error',
        message: error.message,
        code: error.code,
        context,
        timestamp: new Date().toISOString()
      });
      return;
    }
    
    // 일반 에러 처리
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: isDevelopment ? error.message : '서버 오류가 발생했습니다',
      context,
      timestamp: new Date().toISOString(),
      stack: isDevelopment ? error.stack : undefined
    });
  }
}