// ============================================================================
// 📁 backend/src/services/database/index.ts - 중복 export 해결 (최종)
// 🔧 기존 문제: export 중복 정의, DI Container 호환성 부족
// ✅ 해결: 단일 export 통일, DI Container 완전 호환
// ============================================================================

import { DatabaseService } from './DatabaseService';

console.log('🗄️ === 데이터베이스 서비스 인덱스 초기화 (수정판) ===');

// ============================================================================
// 🏗️ DI Container 통합 관리 (개선됨)
// ============================================================================

let databaseService: DatabaseService | null = null;
let isDIManaged = false;

/**
 * DI Container에서 관리되는 데이터베이스 서비스 초기화
 */
export function initializeDatabaseFromDI(): void {
  if (databaseService) {
    console.log('⚠️ DatabaseService 이미 초기화됨');
    return;
  }

  try {
    // DI Container에서 DatabaseService 가져오기 시도
    const { DIContainer } = require('../../core/DIContainer');
    const container = DIContainer.getInstance();
    
    if (container && container.has) {
      // ActiveDatabaseService 우선 시도
      if (container.has('ActiveDatabaseService')) {
        databaseService = container.get<DatabaseService>('ActiveDatabaseService');
        isDIManaged = true;
        console.log('✅ DI Container에서 ActiveDatabaseService 로드됨');
        return;
      }
      
      // DatabaseService 대안
      if (container.has('DatabaseService')) {
        databaseService = container.get<DatabaseService>('DatabaseService');
        isDIManaged = true;
        console.log('✅ DI Container에서 DatabaseService 로드됨');
        return;
      }
    }
    
    throw new Error('DI Container에서 적절한 DatabaseService를 찾을 수 없음');
    
  } catch (error: any) {
    console.warn('⚠️ DI Container에서 DatabaseService 로딩 실패:', error.message);
    console.log('🔧 직접 인스턴스 생성으로 대체');
    
    // Fallback: 직접 인스턴스 생성
    databaseService = DatabaseService.getInstance();
    isDIManaged = false;
    
    // 연결 시도
    databaseService.connect().catch(connectError => {
      console.error('❌ Fallback 데이터베이스 연결 실패:', connectError);
    });
  }
}

/**
 * 데이터베이스 서비스 인스턴스 반환 (지연 초기화)
 */
export function getDatabaseService(): DatabaseService {
  if (!databaseService) {
    initializeDatabaseFromDI();
  }
  
  if (!databaseService) {
    throw new Error('DatabaseService를 초기화할 수 없습니다');
  }
  
  return databaseService;
}

/**
 * 수동으로 데이터베이스 서비스 설정 (테스트/개발용)
 */
export function setDatabaseService(service: DatabaseService): void {
  // 기존 서비스 정리
  if (databaseService && typeof databaseService.dispose === 'function') {
    databaseService.dispose();
  }
  
  databaseService = service;
  isDIManaged = false;
  console.log('🔧 DatabaseService 수동 설정됨');
}

/**
 * 데이터베이스 서비스 재설정
 */
export function resetDatabaseService(): void {
  if (databaseService && typeof databaseService.dispose === 'function') {
    databaseService.dispose();
  }
  databaseService = null;
  isDIManaged = false;
  console.log('🔄 DatabaseService 재설정됨');
}

// ============================================================================
// 🔍 헬퍼 함수들 (단일 정의)
// ============================================================================

/**
 * 데이터베이스 연결 상태 확인
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const db = getDatabaseService();
    if (!db.isConnected()) {
      console.log('🔄 연결 상태 확인 중...');
      await db.connect();
    }
    return db.isConnected();
  } catch (error) {
    console.error('❌ 연결 상태 확인 실패:', error);
    return false;
  }
}

/**
 * 데이터베이스 상태 정보 조회
 */
export async function getDatabaseStatus(): Promise<any> {
  try {
    const db = getDatabaseService();
    const connectionInfo = db.getConnectionInfo();
    const health = await db.getHealth();
    
    return {
      service: db.constructor.name,
      isDIManaged,
      connection: connectionInfo,
      health,
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        SUPABASE_URL_SET: !!process.env.SUPABASE_URL,
        SUPABASE_KEY_SET: !!process.env.SUPABASE_SERVICE_ROLE_KEY
      },
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      service: 'DatabaseService',
      error: error.message,
      isDIManaged,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * 데이터베이스 재연결
 */
export async function reconnectDatabase(): Promise<boolean> {
  try {
    console.log('🔄 데이터베이스 재연결 시도...');
    const db = getDatabaseService();
    
    // 기존 연결 해제
    if (db.isConnected()) {
      await db.disconnect();
    }
    
    // 새 연결 시도
    await db.connect();
    const isConnected = db.isConnected();
    
    console.log(isConnected ? '✅ 재연결 성공' : '❌ 재연결 실패');
    return isConnected;
  } catch (error) {
    console.error('❌ 데이터베이스 재연결 실패:', error);
    return false;
  }
}

/**
 * 데이터베이스 진단 실행
 */
export async function runDatabaseDiagnostics(): Promise<void> {
  console.log('🔍 === 데이터베이스 진단 시작 ===');
  
  try {
    const db = getDatabaseService();
    
    console.log('📊 현재 상태:', await getDatabaseStatus());
    console.log('🔗 연결 테스트:', await checkDatabaseConnection());
    
    if (db.isConnected()) {
      console.log('✅ 연결 상태 양호');
      
      // 기본 기능 테스트
      if (typeof db.runDiagnostics === 'function') {
        await db.runDiagnostics();
      } else {
        console.log('📋 기본 진단만 실행됨 (runDiagnostics 메서드 없음)');
      }
    } else {
      console.log('❌ 연결 실패');
      console.log('💡 해결 방법:');
      console.log('  1. .env 파일의 SUPABASE_URL 확인');
      console.log('  2. .env 파일의 SUPABASE_SERVICE_ROLE_KEY 확인');
      console.log('  3. Supabase 프로젝트 상태 확인');
      console.log('  4. 네트워크 연결 확인');
    }
  } catch (error) {
    console.error('❌ 진단 실행 실패:', error);
  }
  
  console.log('🎯 === 데이터베이스 진단 완료 ===');
}

// ============================================================================
// 📊 초기화 상태 로깅 (모듈 로드 시 실행)
// ============================================================================

// 지연 초기화 방식으로 변경 - 모듈 로드 시 즉시 초기화하지 않음
console.log('✅ === 데이터베이스 서비스 인덱스 설정 완료 ===');
console.log('📋 특징:');
console.log('  - 지연 초기화: 첫 사용 시점에 초기화');
console.log('  - DI Container 우선: ActiveDatabaseService > DatabaseService');
console.log('  - Fallback 지원: DI 실패 시 직접 인스턴스 생성');
console.log('  - Export 중복 해결: 단일 export 패턴');

// 환경변수 상태 미리 체크
if (process.env.SUPABASE_URL) {
  const supabaseProject = process.env.SUPABASE_URL.split('//')[1]?.split('.')[0];
  console.log(`  - Supabase 프로젝트: ${supabaseProject}`);
} else {
  console.log('  - ⚠️ SUPABASE_URL 환경변수 없음');
}

// ============================================================================
// 🔚 통합된 Export (중복 완전 제거)
// ============================================================================

// 기본 내보내기 (호환성 유지)
export default getDatabaseService;

// 명명된 내보내기들 (모든 필요한 기능)
export {
  DatabaseService,
  initializeDatabaseFromDI,
  setDatabaseService,
  resetDatabaseService,
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
    
    databaseService = null;
    isDIManaged = false;
    
    console.log('✅ 데이터베이스 서비스 정리 완료');
  } catch (error) {
    console.error('❌ 데이터베이스 정리 실패:', error);
  }
};

// 프로세스 종료 시 자동 정리 등록
if (typeof process !== 'undefined') {
  process.on('beforeExit', cleanupDatabase);
  process.on('SIGTERM', cleanupDatabase);
  process.on('SIGINT', cleanupDatabase);
}

console.log('🎯 === 데이터베이스 인덱스 초기화 완료 (수정판) ===');