// ============================================================================
// 🎮 인증 컨트롤러 - Clean Architecture
// 파일: backend/src/controllers/AuthController.ts
// 역할: 인증 요청 처리 및 응답 (비즈니스 로직은 서비스로 위임)
// ============================================================================

import { Request, Response } from 'express';
import { AuthService } from '../services/auth/AuthService';
import { SessionService } from '../services/auth/SessionService';
import { WebAuthnService } from '../services/auth/WebAuthnService';
import { asyncHandler } from '../middleware/errorHandler';
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
  ) {}

  // ============================================================================
  // 🔥 통합 WebAuthn 인증
  // ============================================================================

  /**
   * 통합 인증 시작 - 기존/신규 사용자 자동 처리
   */
  startUnifiedAuth = asyncHandler(async (req: Request, res: Response) => {
    console.log('🔍 === 통합 WebAuthn 인증 시작 ===');
    
    const { deviceInfo } = req.body as WebAuthnStartRequest;
    
    const result = await this.webauthnService.startUnifiedAuthentication(deviceInfo);
    
    res.json({
      success: true,
      ...result,
      message: '패스키를 사용하여 인증해주세요'
    });
  });

  /**
   * 통합 인증 완료 - 로그인 또는 회원가입 처리
   */
  completeUnifiedAuth = asyncHandler(async (req: Request, res: Response) => {
    console.log('✅ === 통합 WebAuthn 인증 완료 ===');
    
    const { credential, sessionId } = req.body as WebAuthnCompleteRequest;
    
    if (!credential || !sessionId) {
      return res.status(400).json({
        success: false,
        error: 'credential과 sessionId가 필요합니다'
      });
    }
    
    const result = await this.webauthnService.completeUnifiedAuthentication(
      credential, 
      sessionId,
      req.get('User-Agent') || ''
    );
    
    res.json({
      success: true,
      ...result
    });
  });

  // ============================================================================
  // 🔧 기존 WebAuthn API (하위 호환성)
  // ============================================================================

  /**
   * 회원가입 시작
   */
  startRegistration = asyncHandler(async (req: Request, res: Response) => {
    console.log('🆕 === WebAuthn 회원가입 시작 ===');
    
    const { userEmail, deviceInfo } = req.body;
    
    const result = await this.webauthnService.startRegistration(userEmail, deviceInfo);
    
    res.json({
      success: true,
      ...result
    });
  });

  /**
   * 회원가입 완료
   */
  completeRegistration = asyncHandler(async (req: Request, res: Response) => {
    console.log('🚀 === WebAuthn 회원가입 완료 ===');
    
    const { credential, sessionId } = req.body as WebAuthnCompleteRequest;
    
    const result = await this.webauthnService.completeRegistration(
      credential,
      sessionId,
      req.get('User-Agent') || ''
    );
    
    res.json({
      success: true,
      ...result
    });
  });

  /**
   * 로그인 시작
   */
  startLogin = asyncHandler(async (req: Request, res: Response) => {
    console.log('🔑 === WebAuthn 로그인 시작 ===');
    
    const { deviceInfo } = req.body;
    
    const result = await this.webauthnService.startLogin(deviceInfo);
    
    res.json({
      success: true,
      ...result
    });
  });

  /**
   * 로그인 완료
   */
  completeLogin = asyncHandler(async (req: Request, res: Response) => {
    console.log('✅ === WebAuthn 로그인 완료 ===');
    
    const { credential, sessionId } = req.body as WebAuthnCompleteRequest;
    
    const result = await this.webauthnService.completeLogin(
      credential,
      sessionId,
      req.get('User-Agent') || ''
    );
    
    res.json({
      success: true,
      ...result
    });
  });

  // ============================================================================
  // 🔧 세션 관리
  // ============================================================================

  /**
   * 세션 복원
   */
  restoreSession = asyncHandler(async (req: Request, res: Response) => {
    console.log('🔧 === 세션 복원 ===');
    
    const { sessionToken } = req.body as SessionRestoreRequest;
    
    if (!sessionToken) {
      return res.status(400).json({
        success: false,
        error: 'sessionToken이 필요합니다'
      });
    }
    
    const user = await this.sessionService.getUserBySession(sessionToken);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: '유효하지 않거나 만료된 세션입니다'
      });
    }
    
    res.json({
      success: true,
      user: this.authService.formatUserResponse(user),
      message: '세션이 복원되었습니다'
    });
  });

  /**
   * 로그아웃
   */
  logout = asyncHandler(async (req: Request, res: Response) => {
    console.log('🔧 === 로그아웃 ===');
    
    const { sessionToken } = req.body;
    
    if (sessionToken) {
      await this.sessionService.invalidateSession(sessionToken);
    }
    
    res.json({
      success: true,
      message: '로그아웃되었습니다'
    });
  });

  // ============================================================================
  // 🔍 상태 확인 & 디버깅
  // ============================================================================

  /**
   * 활성 세션 목록 조회 (개발용)
   */
  getSessions = asyncHandler(async (req: Request, res: Response) => {
    const sessions = this.sessionService.getActiveSessions();
    
    res.json({
      success: true,
      sessionCount: sessions.length,
      sessions: sessions.map(session => ({
        sessionId: session.id,
        userId: session.userId,
        created: session.created,
        lastAccess: session.lastAccess,
        type: session.type
      }))
    });
  });

  /**
   * 인증 시스템 상태 확인
   */
  getAuthStatus = asyncHandler(async (req: Request, res: Response) => {
    const status = await this.authService.getSystemStatus();
    
    res.json({
      success: true,
      ...status,
      timestamp: new Date().toISOString()
    });
  });
}