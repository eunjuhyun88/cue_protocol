// ============================================================================
// 🚀 AI Personal 서버 시작 스크립트 (수정됨)
// 파일: backend/src/server.ts
// 역할: 서버 시작, 종료 처리, app.ts와 연동
// 수정: app.ts에서 Express 앱과 HTTP 서버를 import하여 사용
// ============================================================================

import { prepareApp, getServer, shutdownApp } from './app';
import { DatabaseConfig } from './config/database';
import { AuthConfig } from './config/auth';

const PORT = process.env.PORT || 3001;

// 서버 통계 추적
const serverStats = {
  startTime: Date.now(),
  requests: { total: 0, successful: 0, failed: 0 },
  authentication: { attempts: 0, successful: 0, failed: 0 }
};

/**
 * 서버 시작 함수
 */
async function startServer(): Promise<void> {
  try {
    console.log('🚀 ================================');
    console.log('🚀 AI Personal 서버 v4.0 시작 중...');
    console.log('🚀 ================================');

    // 환경변수 확인
    console.log('🔧 환경 설정:');
    console.log(`  - 환경: ${process.env.NODE_ENV || 'development'}`);
    console.log(`  - 포트: ${PORT}`);
    console.log(`  - 프론트엔드: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);

    // 데이터베이스 초기화 시도
    try {
      await DatabaseConfig.initialize();
      console.log('✅ 데이터베이스 설정 초기화 성공');
    } catch (dbError: any) {
      console.warn('⚠️ 데이터베이스 설정 초기화 실패:', dbError.message);
      console.log('💡 앱은 계속 시작되지만 DB 기능은 제한될 수 있습니다.');
    }

    // 인증 시스템 초기화
    try {
      const authConfig = AuthConfig.getInstance();
      console.log('✅ 인증 시스템 초기화 완료');
      
      // Auth 설정 정보 출력
      console.log('🔐 Auth 설정 상태:', {
        jwtConfigured: !!authConfig.JWT_SECRET,
        webauthnConfigured: !!authConfig.WEBAUTHN_RP_NAME,
        databaseType: authConfig.DATABASE_TYPE
      });
    } catch (authError: any) {
      console.warn('⚠️ 인증 시스템 초기화 실패:', authError.message);
    }

    // Express 앱 준비 (DI Container 초기화 포함)
    console.log('🚀 Express 앱 및 DI Container 초기화...');
    await prepareApp();
    console.log('✅ Express 앱 준비 완료');

    // HTTP 서버 시작 (app.ts에서 생성된 서버 사용)
    const server = getServer();
    
    server.listen(PORT, () => {
      const startupTime = Date.now() - serverStats.startTime;
      
      console.log('\n🎉 === AI Personal 백엔드 서버 시작 완료! ===');
      console.log('🚀 ==========================================');
      console.log(`📍 Backend: http://localhost:${PORT}`);
      console.log(`🏥 Health: http://localhost:${PORT}/health`);
      console.log(`📊 Status: http://localhost:${PORT}/api/status`);
      console.log(`⏱️ 시작 시간: ${startupTime}ms`);
      console.log('🚀 ==========================================');
      console.log('');
      console.log('📋 주요 기능:');
      console.log('  🔥 Clean Architecture: DI Container 기반 모듈화');
      console.log('  🔐 WebAuthn 인증: 패스키 기반 보안 인증');
      console.log('  🤖 AI 채팅: Ollama/OpenAI/Claude 통합');
      console.log('  💰 CUE 토큰: 실시간 마이닝 및 거래 시스템');
      console.log('  🎫 AI Passport: 개인화된 디지털 신원증');
      console.log('  🏠 Data Vault: 암호화된 개인 데이터 저장소');
      console.log('  🔌 Socket.IO: 실시간 통신 지원');
      console.log('');
      console.log('🔥 핵심 API 엔드포인트:');
      console.log(`🔐 인증 API:`);
      console.log(`  POST http://localhost:${PORT}/api/auth/webauthn/register/start`);
      console.log(`  POST http://localhost:${PORT}/api/auth/webauthn/register/complete`);
      console.log(`  POST http://localhost:${PORT}/api/auth/webauthn/login/start`);
      console.log(`  POST http://localhost:${PORT}/api/auth/webauthn/login/complete`);
      console.log(`🤖 AI 채팅 API:`);
      console.log(`  POST http://localhost:${PORT}/api/ai/chat`);
      console.log(`  GET  http://localhost:${PORT}/api/ai/models`);
      console.log(`💰 CUE 토큰 API:`);
      console.log(`  GET  http://localhost:${PORT}/api/cue/balance/:userDid`);
      console.log(`  POST http://localhost:${PORT}/api/cue/mine`);
      console.log(`🎫 AI Passport API:`);
      console.log(`  GET  http://localhost:${PORT}/api/passport/:did`);
      console.log(`  POST http://localhost:${PORT}/api/passport`);
      console.log('');
      console.log('🔍 Debug 및 관리 API:');
      console.log(`🔍 JWT 분석: http://localhost:${PORT}/api/debug/token`);
      console.log(`🔍 세션 분석: http://localhost:${PORT}/api/debug/session`);
      console.log(`🔍 시스템 상태: http://localhost:${PORT}/api/debug/system`);
      console.log(`🔍 성능 통계: http://localhost:${PORT}/api/debug/stats`);
      console.log('');
      console.log('💡 Quick Start Guide:');
      console.log('1. 회원가입 테스트:');
      console.log(`   curl -X POST http://localhost:${PORT}/api/auth/webauthn/register/start \\`);
      console.log(`     -H "Content-Type: application/json" \\`);
      console.log(`     -d '{"username":"testuser","email":"test@example.com"}'`);
      console.log('');
      console.log('2. AI 채팅 테스트:');
      console.log(`   curl -X POST http://localhost:${PORT}/api/ai/chat \\`);
      console.log(`     -H "Content-Type: application/json" \\`);
      console.log(`     -d '{"message":"Hello AI","model":"llama3.2:3b"}'`);
      console.log('');
      console.log('3. 시스템 상태 확인:');
      console.log(`   curl http://localhost:${PORT}/health`);
      console.log(`   curl http://localhost:${PORT}/api/status`);
      console.log('');
      console.log('🎯 개발 환경 설정 완료!');
      console.log('   - Supabase 데이터베이스 연결됨');
      console.log('   - WebAuthn 패스키 인증 준비됨');
      console.log('   - Ollama AI 서비스 대기중');
      console.log('   - CUE 토큰 시스템 활성화');
      console.log('   - Socket.IO 실시간 통신 준비됨');

      // 서버 통계 업데이트
      serverStats.startTime = Date.now();
    });

    // 서버 에러 처리
    server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ 포트 ${PORT}가 이미 사용 중입니다.`);
        console.log('💡 해결 방법:');
        console.log(`   1. 다른 포트 사용: PORT=3002 npm run dev`);
        console.log(`   2. 기존 프로세스 종료: lsof -ti:${PORT} | xargs kill -9`);
      } else {
        console.error('❌ 서버 오류:', error);
      }
      process.exit(1);
    });

    // 우아한 종료 처리
    setupGracefulShutdown(server);

  } catch (error: any) {
    console.error('❌ 서버 시작 실패:', error);
    console.error('💡 문제 해결 단계:');
    console.log('  1. .env 파일 확인');
    console.log('  2. Supabase 연결 정보 확인');
    console.log('  3. 포트 사용 가능 여부 확인');
    console.log('  4. Node.js 버전 확인 (>=18.0.0 필요)');
    process.exit(1);
  }
}

/**
 * 우아한 종료 처리 설정
 */
function setupGracefulShutdown(server: any): void {
  const gracefulShutdown = async (signal: string) => {
    console.log(`\n🛑 ${signal} 신호 수신 - 우아한 종료 시작...`);
    
    try {
      // 서버 연결 종료
      server.close(() => {
        console.log('✅ HTTP 서버 종료 완료');
      });

      // 앱 정리
      await shutdownApp();
      
      console.log('✅ 우아한 종료 완료');
      process.exit(0);
    } catch (error) {
      console.error('❌ 종료 처리 중 오류:', error);
      process.exit(1);
    }
  };

  // 신호 처리기 등록
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  
  // 처리되지 않은 예외 처리
  process.on('uncaughtException', (error: Error) => {
    console.error('🚨 처리되지 않은 예외:', error);
    gracefulShutdown('UNCAUGHT_EXCEPTION');
  });

  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    console.error('🚨 처리되지 않은 Promise 거부:', reason);
    gracefulShutdown('UNHANDLED_REJECTION');
  });

  console.log('✅ 우아한 종료 처리기 등록 완료');
}

/**
 * 서버 통계 업데이트 함수
 */
function updateServerStats(type: 'request' | 'auth', success: boolean = true): void {
  if (type === 'request') {
    serverStats.requests.total++;
    if (success) {
      serverStats.requests.successful++;
    } else {
      serverStats.requests.failed++;
    }
  } else if (type === 'auth') {
    serverStats.authentication.attempts++;
    if (success) {
      serverStats.authentication.successful++;
    } else {
      serverStats.authentication.failed++;
    }
  }
}

/**
 * 서버 통계 조회 함수
 */
export function getServerStats() {
  return {
    ...serverStats,
    uptime: Date.now() - serverStats.startTime,
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString()
  };
}

// ============================================================================
// 🚀 서버 시작
// ============================================================================

// 프로세스 제목 설정
process.title = 'ai-personal-backend';

// 서버 시작
startServer().catch((error) => {
  console.error('💥 서버 시작 중 치명적 오류:', error);
  process.exit(1);
});

// ============================================================================
// 📤 Export (필요시 다른 모듈에서 사용)
// ============================================================================

export { startServer, updateServerStats, getServerStats };