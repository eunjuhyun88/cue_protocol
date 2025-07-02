// ============================================================================
// 🚀 AI Personal 서버 시작 스크립트
// 파일: backend/src/server.ts
// 역할: 서버 시작 및 종료 처리
// ============================================================================

import app from './app';
import { DatabaseConfig } from './config/database';
import { AuthConfig } from './config/auth';

const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    // 데이터베이스 초기화
    await DatabaseConfig.initialize();
    console.log('✅ 데이터베이스 연결 성공');

    // 인증 시스템 초기화
    AuthConfig.initialize();
    console.log('✅ 인증 시스템 초기화 완료');

    // 서버 시작
    const server = app.listen(PORT, () => {
      console.log('🚀 ================================');
      console.log('🚀 AI Personal 서버 v4.0 시작됨');
      console.log('🚀 ================================');
      console.log(`📍 서버: http://localhost:${PORT}`);
      console.log(`🏥 헬스체크: http://localhost:${PORT}/health`);
      console.log('📋 주요 기능:');
      console.log('  🔥 Clean Architecture: 모듈화된 구조');
      console.log('  🔐 WebAuthn 인증: 패스키 기반 보안');
      console.log('  🤖 AI 채팅: OpenAI/Claude/Ollama 통합');
      console.log('  💰 CUE 토큰: 실시간 마이닝 시스템');
      console.log('  🎫 AI Passport: 개인화된 디지털 ID');
      console.log('  🏠 Data Vault: 암호화된 개인 데이터');
      console.log('🚀 ================================');
    });

    // 우아한 종료 처리
    setupGracefulShutdown(server);

  } catch (error) {
    console.error('💥 서버 시작 실패:', error);
    process.exit(1);
  }
}

function setupGracefulShutdown(server: any) {
  const shutdown = async () => {
    console.log('\n🛑 서버 종료 중...');
    
    server.close(async () => {
      await DatabaseConfig.disconnect();
      console.log('✅ 서버 종료 완료');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // 예외 처리
  process.on('uncaughtException', (error) => {
    console.error('💥 처리되지 않은 예외:', error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 처리되지 않은 Promise 거부:', reason);
    process.exit(1);
  });
}

// 서버 시작
if (require.main === module) {
  startServer();
}

export { startServer };