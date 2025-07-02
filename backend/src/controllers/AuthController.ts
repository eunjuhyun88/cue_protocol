// ============================================================================
// 🎮 인증 컨트롤러 - Clean Architecture 최종 완성 버전
// 파일: backend/src/controllers/AuthController.ts
// 역할: 인증 요청 처리 및 응답 (비즈니스 로직은 서비스로 위임)
// 개선사항: asyncHandler 제거, 직접 에러 처리, paste.txt 로직 완전 통합
// ============================================================================

import { Request, Response } from 'express';
import { AuthService } from '../services/auth/AuthService';
import { SessionService } from '../services/auth/SessionService';
import { WebAuthnService } from '../services/auth/WebAuthnService';
import { 
  WebAuthnStartRequest, 
  WebAuthnCompleteRequest,
  SessionRestoreRequest 
} from '../types/auth.types';

export class AuthController {
  constructor(
    private authService = new AuthService(),
    private sessionService = new SessionService(),
    private webauthnService = new WebAuthnService()
  ) {
    console.log('🎮 AuthController 초기화됨 (최종 완성 버전)');
    console.log('👤 AuthService 연결:', !!this.authService);
    console.log('🔑 SessionService 연결:', !!this.sessionService);
    console.log('🔐 WebAuthnService 연결:', !!this.webauthnService);
  }

  // ============================================================================
  // 🔥 통합 WebAuthn 인증 (paste.txt 로직 완전 적용)
  // ============================================================================

  /**
   * 통합 인증 시작 - 기존/신규 사용자 자동 처리
   */
  startUnifiedAuth = async (req: Request, res: Response): Promise<void> => {
    try {
      console.log('🔍 === 통합 WebAuthn 인증 시작 ===');
      
      const { deviceInfo } = req.body as WebAuthnStartRequest;
      
      // 디바이스 정보 수집 (paste.txt 방식)
      const enrichedDeviceInfo = {
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        forwarded: req.get('X-Forwarded-For'),
        timestamp: new Date().toISOString(),
        ...deviceInfo
      };
      
      const result = await this.webauthnService.startUnifiedAuthentication(enrichedDeviceInfo);
      
      res.json({
        success: true,
        ...result,
        message: '패스키를 사용하여 인증해주세요. 기존 사용자는 자동 로그인, 신규 사용자는 자동 가입됩니다.',
        debug: process.env.NODE_ENV === 'development' ? {
          deviceInfo: enrichedDeviceInfo,
          sessionId: result.sessionId
        } : undefined
      });
      
    } catch (error: any) {
      console.error('❌ 통합 WebAuthn 시작 오류:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Unified authentication start failed',
        message: '인증 시작에 실패했습니다.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  };

  /**
   * 통합 인증 완료 - 로그인 또는 회원가입 처리 (paste.txt 완전 적용)
   */
  completeUnifiedAuth = async (req: Request, res: Response): Promise<void> => {
    try {
      console.log('✅ === 통합 WebAuthn 인증 완료 ===');
      
      const { credential, sessionId } = req.body as WebAuthnCompleteRequest;
      const userAgent = req.get('User-Agent') || 'Unknown';
      
      if (!credential || !sessionId) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields',
          message: '인증 정보와 세션 ID가 필요합니다.'
        });
        return;
      }
      
      const result = await this.webauthnService.completeUnifiedAuthentication(
        credential, 
        sessionId,
        userAgent
      );
      
      // paste.txt 방식의 응답 포맷 적용
      res.json({
        success: true,
        action: result.action, // 'login' | 'register'
        sessionToken: result.sessionToken,
        user: {
          // paste.txt와 동일한 사용자 정보 포맷
          id: result.user.id,
          username: result.user.username,
          email: result.user.email,
          did: result.user.did,
          wallet_address: result.user.walletAddress,
          walletAddress: result.user.walletAddress, // 프론트엔드 호환성
          cue_tokens: result.user.cueTokens,
          cueBalance: result.user.cueTokens, // 프론트엔드 호환성
          trust_score: result.user.trustScore,
          trustScore: result.user.trustScore, // 프론트엔드 호환성
          passport_level: result.user.passportLevel,
          passportLevel: result.user.passportLevel, // 프론트엔드 호환성
          biometric_verified: result.user.biometricVerified,
          biometricVerified: result.user.biometricVerified, // 프론트엔드 호환성
          created_at: result.user.createdAt,
          registeredAt: result.user.createdAt // 프론트엔드 호환성
        },
        isExistingUser: result.isExistingUser,
        rewards: result.rewards,
        message: result.message
      });
      
    } catch (error: any) {
      console.error('❌ 통합 WebAuthn 완료 오류:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Unified authentication failed',
        message: '인증에 실패했습니다.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  };

  // ============================================================================
  // 🔧 기존 WebAuthn API (하위 호환성 - paste-2.txt 방식)
  // ============================================================================

  /**
   * 회원가입 시작
   */
  startRegistration = async (req: Request, res: Response): Promise<void> => {
    try {
      console.log('🆕 === WebAuthn 회원가입 시작 ===');
      
      const { userEmail, deviceInfo } = req.body;
      
      const result = await this.webauthnService.startRegistration(userEmail, {
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        ...deviceInfo
      });
      
      res.json({
        success: true,
        ...result,
        message: '패스키를 등록해주세요.'
      });
      
    } catch (error: any) {
      console.error('❌ 회원가입 시작 오류:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Registration start failed',
        message: '회원가입 시작에 실패했습니다.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  };

  /**
   * 회원가입 완료
   */
  completeRegistration = async (req: Request, res: Response): Promise<void> => {
    try {
      console.log('🚀 === WebAuthn 회원가입 완료 ===');
      
      const { credential, sessionId } = req.body as WebAuthnCompleteRequest;
      const userAgent = req.get('User-Agent') || 'Unknown';
      
      const result = await this.webauthnService.completeRegistration(
        credential,
        sessionId,
        userAgent
      );
      
      res.json({
        success: true,
        ...result
      });
      
    } catch (error: any) {
      console.error('❌ 회원가입 완료 오류:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Registration failed',
        message: '회원가입에 실패했습니다.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  };

  /**
   * 로그인 시작
   */
  startLogin = async (req: Request, res: Response): Promise<void> => {
    try {
      console.log('🔑 === WebAuthn 로그인 시작 ===');
      
      const { deviceInfo } = req.body;
      
      const result = await this.webauthnService.startLogin({
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        ...deviceInfo
      });
      
      res.json({
        success: true,
        ...result,
        message: '등록된 패스키로 인증해주세요.'
      });
      
    } catch (error: any) {
      console.error('❌ 로그인 시작 오류:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Login start failed',
        message: '로그인 시작에 실패했습니다.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  };

  /**
   * 로그인 완료
   */
  completeLogin = async (req: Request, res: Response): Promise<void> => {
    try {
      console.log('✅ === WebAuthn 로그인 완료 ===');
      
      const { credential, sessionId } = req.body as WebAuthnCompleteRequest;
      const userAgent = req.get('User-Agent') || 'Unknown';
      
      const result = await this.webauthnService.completeLogin(
        credential,
        sessionId,
        userAgent
      );
      
      res.json({
        success: true,
        ...result
      });
      
    } catch (error: any) {
      console.error('❌ 로그인 완료 오류:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Login failed',
        message: '로그인에 실패했습니다.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  };

  // ============================================================================
  // 🔧 세션 관리 (paste-2.txt 방식 완전 적용)
  // ============================================================================

  /**
   * 세션 복원
   */
  restoreSession = async (req: Request, res: Response): Promise<void> => {
    try {
      console.log('🔧 === 세션 복원 ===');
      
      const { sessionToken } = req.body as SessionRestoreRequest;
      
      if (!sessionToken) {
        res.status(400).json({
          success: false,
          error: 'Missing session token',
          message: 'sessionToken이 필요합니다'
        });
        return;
      }
      
      const user = await this.sessionService.getUserBySession(sessionToken);
      
      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Invalid or expired session',
          message: '유효하지 않거나 만료된 세션입니다'
        });
        return;
      }
      
      // paste-2.txt와 동일한 응답 포맷
      res.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          did: user.did,
          wallet_address: user.wallet_address,
          walletAddress: user.wallet_address,
          cue_tokens: user.cue_tokens,
          cueBalance: user.cue_tokens,
          trust_score: user.trust_score,
          trustScore: user.trust_score,
          passport_level: user.passport_level,
          passportLevel: user.passport_level,
          biometric_verified: user.biometric_verified,
          biometricVerified: user.biometric_verified,
          created_at: user.created_at,
          registeredAt: user.created_at
        },
        message: '세션이 복원되었습니다'
      });
      
    } catch (error: any) {
      console.error('❌ 세션 복원 오류:', error);
      res.status(500).json({
        success: false,
        error: 'Session restore failed',
        message: '세션 복원에 실패했습니다.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  };

  /**
   * 로그아웃
   */
  logout = async (req: Request, res: Response): Promise<void> => {
    try {
      console.log('🔧 === 로그아웃 ===');
      
      const { sessionToken } = req.body;
      
      if (sessionToken) {
        await this.sessionService.invalidateSession(sessionToken);
        console.log('🗑️ 세션 토큰 무효화 처리');
      }
      
      res.json({
        success: true,
        message: '로그아웃되었습니다'
      });
      
    } catch (error: any) {
      console.error('❌ 로그아웃 오류:', error);
      res.status(500).json({
        success: false,
        error: 'Logout failed',
        message: '로그아웃에 실패했습니다.'
      });
    }
  };

  // ============================================================================
  // 🔍 상태 확인 & 디버깅
  // ============================================================================

  /**
   * 활성 세션 목록 조회 (개발용)
   */
  getSessions = async (req: Request, res: Response): Promise<void> => {
    try {
      const sessions = this.sessionService.getActiveSessions();
      
      res.json({
        success: true,
        sessionCount: sessions.length,
        sessions: sessions.map(session => ({
          sessionId: session.id,
          userId: session.userId,
          type: session.type,
          created: session.created,
          lastAccess: session.lastAccess,
          isActive: session.isActive
        })),
        timestamp: new Date().toISOString()
      });
      
    } catch (error: any) {
      console.error('❌ 세션 목록 조회 오류:', error);
      res.status(500).json({
        success: false,
        error: 'Session list retrieval failed'
      });
    }
  };

  /**
   * 인증 시스템 상태 확인
   */
  getAuthStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const authStatus = await this.authService.getAuthSystemStatus();
      const sessionInfo = this.sessionService.getSessionInfo();
      
      res.json({
        success: true,
        system: {
          authService: authStatus,
          sessionService: {
            initialized: true,
            activeSessions: sessionInfo.activeSessionCount,
            jwtConfigured: !sessionInfo.jwtSecret.includes('development')
          },
          webauthnService: {
            initialized: true,
            configured: true
          }
        },
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
      });
      
    } catch (error: any) {
      console.error('❌ 시스템 상태 조회 오류:', error);
      res.status(500).json({
        success: false,
        error: 'System status check failed',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  };
}