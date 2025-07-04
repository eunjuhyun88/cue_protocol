// ============================================================================
// 🗄️ 데이터베이스 서비스 인덱스 (DI Container 호환)
// 경로: backend/src/services/database/index.ts
// 목적: DI Container와 직접 사용 모두 지원하는 통합 인덱스
// 특징: Mock 제거, 실제 DB만, 자동 초기화
// ============================================================================

import { DatabaseService } from './DatabaseService';

console.log('🗄️ === 데이터베이스 서비스 인덱스 초기화 ===');

// ============================================================================
// 🔧 DI Container 감지 및 서비스 생성
// ============================================================================

let databaseService: DatabaseService;
let isDIManaged = false;

try {
  // DI Container 사용 가능 여부 확인
  const { DIContainer } = require('../../core/DIContainer');
  const container = DIContainer.getInstance();
  
  if (container && container.has && container.has('DatabaseService')) {
    console.log('📦 DI Container에서 DatabaseService 사용');
    databaseService = container.get<DatabaseService>('DatabaseService');
    isDIManaged = true;
  } else if (container && container.has && container.has('ActiveDatabaseService')) {
    console.log('📦 DI Container에서 ActiveDatabaseService 사용');
    databaseService = container.get<DatabaseService>('ActiveDatabaseService');
    isDIManaged = true;
  } else {
    console.log('🔧 DI Container 없음 - 직접 인스턴스 생성');
    databaseService = DatabaseService.getInstance();
    isDIManaged = false;
  }
} catch (error) {
  // DI Container가 없거나 오류 시 직접 생성
  console.log('🔧 DI Container 없음 - 직접 인스턴스 생성');
  databaseService = DatabaseService.getInstance();
  isDIManaged = false;
}

// ============================================================================
// 🚀 자동 초기화 (DI Container가 관리하지 않는 경우에만)
// ============================================================================

if (!isDIManaged && !databaseService.isConnected()) {
  console.log('🔄 자동 데이터베이스 연결 시도...');
  
  databaseService.connect()
    .then(() => {
      console.log('✅ 데이터베이스 자동 연결 성공');
      
      // 진단 실행 (선택사항)
      if (process.env.NODE_ENV === 'development') {
        databaseService.runDiagnostics().catch(error => {
          console.warn('⚠️ 진단 실패:', error.message);
        });
      }
    })
    .catch(error => {
      console.error('❌ 데이터베이스 자동 연결 실패:', error.message);
      console.log('💡 해결방법:');
      console.log('  1. .env 파일의 SUPABASE_URL 확인');
      console.log('  2. .env 파일의 SUPABASE_SERVICE_ROLE_KEY 확인');
      console.log('  3. Supabase 프로젝트 상태 확인');
      console.log('  4. 네트워크 연결 확인');
    });
}

// ============================================================================
// 📊 초기화 상태 로깅
// ============================================================================

console.log('✅ === 데이터베이스 서비스 초기화 완료 ===');
console.log('📊 상태 정보:');
console.log(`  - 서비스: ${databaseService.constructor.name}`);
console.log(`  - DI 관리: ${isDIManaged ? '✅ DI Container 관리' : '🔧 직접 관리'}`);
console.log(`  - 연결 상태: ${databaseService.isConnected() ? '✅ 연결됨' : '⏳ 연결 중...'}`);
console.log(`  - 환경: ${process.env.NODE_ENV || 'development'}`);

if (process.env.SUPABASE_URL) {
  const supabaseProject = process.env.SUPABASE_URL.split('//')[1]?.split('.')[0];
  console.log(`  - Supabase 프로젝트: ${supabaseProject}`);
} else {
  console.log('  - ⚠️ SUPABASE_URL 환경변수 없음');
}

// ============================================================================
// 🔍 헬퍼 함수들
// ============================================================================

/**
 * 데이터베이스 연결 상태 확인
 */
export const checkDatabaseConnection = async (): Promise<boolean> => {
  try {
    if (!databaseService.isConnected()) {
      console.log('🔄 연결 상태 확인 중...');
      await databaseService.connect();
    }
    return databaseService.isConnected();
  } catch (error) {
    console.error('❌ 연결 상태 확인 실패:', error);
    return false;
  }
};

/**
 * 데이터베이스 상태 정보 조회
 */
export const getDatabaseStatus = async (): Promise<any> => {
  try {
    const connectionInfo = databaseService.getConnectionInfo();
    const health = await databaseService.getHealth();
    
    return {
      service: databaseService.constructor.name,
      isDIManaged,
      connection: connectionInfo,
      health,
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        SUPABASE_URL_SET: !!process.env.SUPABASE_URL,
        SUPABASE_KEY_SET: !!(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)
      },
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      service: databaseService.constructor.name,
      isDIManaged,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * 강제 재연결
 */
export const reconnectDatabase = async (): Promise<boolean> => {
  try {
    console.log('🔄 데이터베이스 강제 재연결...');
    await databaseService.connect();
    console.log('✅ 재연결 성공');
    return true;
  } catch (error) {
    console.error('❌ 재연결 실패:', error);
    return false;
  }
};

/**
 * 진단 실행
 */
export const runDatabaseDiagnostics = async (): Promise<void> => {
  try {
    console.log('🔍 데이터베이스 진단 실행...');
    await databaseService.runDiagnostics();
  } catch (error) {
    console.error('❌ 진단 실행 실패:', error);
  }
};

// ============================================================================
// 📤 메인 Export
// ============================================================================

export default databaseService;
export { DatabaseService };

// 편의 함수들도 export
export {
  checkDatabaseConnection,
  getDatabaseStatus,
  reconnectDatabase,
  runDatabaseDiagnostics
};

// ============================================================================
// 🧹 정리 함수 (애플리케이션 종료 시)
// ============================================================================

/**
 * 애플리케이션 종료 시 정리
 */
export const cleanupDatabase = (): void => {
  try {
    console.log('🧹 데이터베이스 서비스 정리...');
    
    if (databaseService && typeof databaseService.dispose === 'function') {
      databaseService.dispose();
    }
    
    console.log('✅ 데이터베이스 서비스 정리 완료');
  } catch (error) {
    console.error('❌ 데이터베이스 정리 실패:', error);
  }
};

// 프로세스 종료 시 자동 정리
process.on('beforeExit', cleanupDatabase);
process.on('SIGTERM', cleanupDatabase);
process.on('SIGINT', cleanupDatabase);

console.log('🎯 === 데이터베이스 인덱스 초기화 완료 ===');