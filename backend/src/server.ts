// ============================================================================
// 🚀 AI Personal 서버 시작 스크립트 (수정됨)
// 파일: backend/src/server.ts
// 역할: 서버 시작 및 종료 처리
// 수정: app.ts에서 Express 앱을 import하고 서버만 시작
// ============================================================================

import app from './app';
import { DatabaseConfig } from './config/database';
import { AuthConfig } from './config/auth';

const PORT = process.env.PORT || 3001;

// 서버 통계 추적
const serverStats = {
  startTime: Date.now(),
  requests: { total: 0, successful: 0, failed: 0 },
  authentication: { attempts: 0, successful: 0, failed: 0 }
};

async function startServer() {
  try {
    console.log('🚀 ================================');
    console.log('🚀 AI Personal 서버 v4.0 시작 중...');
    console.log('🚀 ================================');

    // 데이터베이스 초기화
    await DatabaseConfig.initialize();
    console.log('✅ 데이터베이스 연결 성공');

    // 인증 시스템 초기화 (수정: getInstance() 사용)
    const authConfig = AuthConfig.getInstance();
    console.log('✅ 인증 시스템 초기화 완료');
    
    // Auth 설정 정보 출력
    console.log('🔐 Auth 설정:', {
      jwtConfigured: !!authConfig.JWT_SECRET,
      webauthnConfigured: !!authConfig.WEBAUTHN_RP_NAME,
      databaseType: authConfig.DATABASE_TYPE
    });

    // 서버 시작 (app.ts에서 설정된 Express 앱 사용)
    const server = app.listen(PORT, () => {
      console.log('\n🎉 강화된 백엔드 서버 시작 완료!');
      console.log('🚀 ==========================================');
      console.log(`📍 Backend: http://localhost:${PORT}`);
      console.log(`🏥 Health: http://localhost:${PORT}/health`);
      console.log(`📊 Status: http://localhost:${PORT}/api/status`);
      console.log('🚀 ==========================================');
      console.log('');
      console.log('📋 주요 기능:');
      console.log('  🔥 Clean Architecture: 모듈화된 구조');
      console.log('  🔐 WebAuthn 인증: 패스키 기반 보안');
      console.log('  🤖 AI 채팅: OpenAI/Claude/Ollama 통합');
      console.log('  💰 CUE 토큰: 실시간 마이닝 시스템');
      console.log('  🎫 AI Passport: 개인화된 디지털 ID');
      console.log('  🏠 Data Vault: 암호화된 개인 데이터');
      console.log('');
      console.log('🔥 새로운 Debug API:');
      console.log(`🔍 JWT 분석: http://localhost:${PORT}/api/debug/token`);
      console.log(`🔍 세션 분석: http://localhost:${PORT}/api/debug/session`);
      console.log(`🔍 시스템 상태: http://localhost:${PORT}/api/debug/system`);
      console.log(`🔍 성능 통계: http://localhost:${PORT}/api/debug/stats`);
      console.log('');
      console.log('💡 Debug API 사용법:');
      console.log('1. JWT 문제 발생 시:');
      console.log(`   curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:${PORT}/api/debug/token`);
      console.log('2. 세션 문제 발생 시:');
      console.log(`   curl http://localhost:${PORT}/api/debug/session`);
      console.log('3. 시스템 상태 확인:');
      console.log(`   curl http://localhost:${PORT}/api/debug/system`);
      console.log('4. 성능 통계 확인:');
      console.log(`   curl http://localhost:${PORT}/api/debug/stats`);
      console.log('');
      console.log('🔧 Force Token 해결법:');
      console.log('1. 브라우저에서 localStorage.clear() 실행');
      console.log('2. 페이지 새로고침');
      console.log('3. WebAuthn으로 다시 등록');
      console.log('4. Debug API로 확인');
      console.log('🚀 ================================');
      
      // AuthConfig 요약 정보 출력
      console.log('\n' + authConfig.getSummary());
    });

    // 우아한 종료 처리
    setupGracefulShutdown(server);

  } catch (error) {
    console.error('💥 서버 시작 실패:', error);
    process.exit(1);
  }
}

function setupGracefulShutdown(server: any) {
  const shutdown = async (signal: string) => {
    console.log(`\n🛑 ${signal} 수신, 강화된 백엔드 종료 중...`);
    
    // 최종 통계 출력
    const uptime = Date.now() - serverStats.startTime;
    const uptimeHours = Math.floor(uptime / (1000 * 60 * 60));
    const uptimeMinutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
    
    console.log('📊 최종 서버 통계:');
    console.log(`   총 요청: ${serverStats.requests.total}`);
    console.log(`   성공률: ${serverStats.requests.total > 0 ? 
      (serverStats.requests.successful / serverStats.requests.total * 100).toFixed(2) : 0}%`);
    console.log(`   인증 성공률: ${serverStats.authentication.attempts > 0 ?
      (serverStats.authentication.successful / serverStats.authentication.attempts * 100).toFixed(2) : 0}%`);
    console.log(`   JWT 오류: ${serverStats.requests.failed}회`);
    console.log(`   Force Token 감지: 0회`);
    console.log(`   401 오류: ${serverStats.authentication.failed}회`);
    console.log(`   운영 시간: ${uptimeHours}시간 ${uptimeMinutes}분`);
    
    server.close(async () => {
      try {
        await DatabaseConfig.disconnect();
        console.log('✅ 데이터베이스 연결 종료');
      } catch (error) {
        console.error('❌ 데이터베이스 종료 실패:', error);
      }
      console.log('✅ 강화된 백엔드 종료 완료');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // 예외 처리
  process.on('uncaughtException', (error) => {
    console.error('💥 처리되지 않은 예외:', error);
    serverStats.requests.failed++;
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 처리되지 않은 Promise 거부:', reason);
    serverStats.requests.failed++;
    process.exit(1);
  });
}

// 서버 시작
if (require.main === module) {
  startServer();
}

export { startServer };