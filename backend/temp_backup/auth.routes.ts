// ============================================================================
// 🛣️ 인증 라우트 - Clean Architecture
// 파일: backend/src/routes/auth.routes.ts
// 역할: 인증 관련 API 엔드포인트만 정의 (컨트롤러로 위임)
// ============================================================================

import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';

const router = Router();
const authController = new AuthController();

// ============================================================================
// 🔥 통합 WebAuthn 인증 (NEW - 권장)
// ============================================================================

/**
 * POST /api/auth/webauthn/start
 * 통합 인증 시작 - 로그인/가입 자동 판별
 */
router.post('/webauthn/start', authController.startUnifiedAuth);

/**
 * POST /api/auth/webauthn/complete  
 * 통합 인증 완료 - 기존/신규 사용자 자동 처리
 */
router.post('/webauthn/complete', authController.completeUnifiedAuth);

// ============================================================================
// 🔧 기존 WebAuthn API (하위 호환성)
// ============================================================================

/**
 * POST /api/auth/webauthn/register/start
 * 회원가입 시작
 */
router.post('/webauthn/register/start', authController.startRegistration);

/**
 * POST /api/auth/webauthn/register/complete
 * 회원가입 완료
 */
router.post('/webauthn/register/complete', authController.completeRegistration);

/**
 * POST /api/auth/webauthn/login/start
 * 로그인 시작
 */
router.post('/webauthn/login/start', authController.startLogin);

/**
 * POST /api/auth/webauthn/login/complete
 * 로그인 완료
 */
router.post('/webauthn/login/complete', authController.completeLogin);

// ============================================================================
// 🔧 세션 관리
// ============================================================================

/**
 * POST /api/auth/session/restore
 * 세션 복원
 */
router.post('/session/restore', authController.restoreSession);

/**
 * POST /api/auth/logout
 * 로그아웃
 */
router.post('/logout', authController.logout);

// ============================================================================
// 🔍 상태 확인 & 디버깅
// ============================================================================

/**
 * GET /api/auth/status
 * 인증 시스템 상태 확인
 */
router.get('/status', authController.getAuthStatus);

/**
 * GET /api/auth/sessions (개발용)
 * 활성 세션 목록 조회
 */
router.get('/sessions', authController.getSessions);

console.log('✅ Auth routes loaded');

export default router;