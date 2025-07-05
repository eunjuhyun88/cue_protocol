// ============================================================================
// 📁 backend/src/services/database/index.ts - 중복 export 완전 해결
// 수정 위치: 기존 파일 완전 교체
// 연관 파일: DatabaseService.ts, DIContainer.ts
// 해결 문제: Multiple exports with the same name 오류 완전 제거
// ============================================================================

import { DatabaseService } from './DatabaseService';

console.log('🗄️ === 데이터베이스 서비스 인덱스 초기화 (최종 수정판) ===');

// ============================================================================
// 🏗️ 단일 인스턴스 관리 (싱글톤 패턴)
// ============================================================================

let activeDatabaseService: DatabaseService | null = null;
let isInitialized = false;

/**
 * DI Container용 데이터베이스 서비스 초기화 (단일 함수)
 * @param container 선택적 DI Container 인스턴스
 * @returns DatabaseService 인스턴스
 */
export function initializeDatabaseFromDI(container?: any): DatabaseService {
  if (activeDatabaseService && isInitialized) {
    console.log('✅ DatabaseService 이미 초기화됨, 기존 인스턴스 반환');
    return activeDatabaseService;
  }

  console.log('🔄 DatabaseService DI 초기화 시작...');

  try {
    // 환경변수 상태 확인
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    console.log('🔧 환경변수 상태:');
    console.log(`- SUPABASE_URL: ${supabaseUrl ? '✅ 설정됨' : '❌ 누락'}`);
    console.log(`- SUPABASE_SERVICE_ROLE_KEY: ${supabaseKey ? '✅ 설정됨' : '❌ 누락'}`);

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('필수 환경변수 누락: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
    }

    // DatabaseService 인스턴스 생성
    activeDatabaseService = DatabaseService.getInstance();
    
    // 연결 시도 (비동기, 백그라운드)
    activeDatabaseService.connect().catch(error => {
      console.warn('⚠️ 초기 연결 실패 (백그라운드):', error.message);
    });

    isInitialized = true;
    console.log('✅ DatabaseService DI 초기화 성공');
    
    return activeDatabaseService;

  } catch (error: any) {
    console.error('❌ DatabaseService DI 초기화 실패:', error.message);
    
    // Fallback 시도
    console.log('🔄 Fallback 모드로 전환...');
    activeDatabaseService = DatabaseService.getInstance();
    isInitialized = true;
    
    console.log('✅ Fallback DatabaseService 사용');
    return activeDatabaseService;
  }
}

/**
 * 활성 데이터베이스 서비스 반환 (지연 초기화)
 * @returns DatabaseService 인스턴스
 */
export function getDatabaseService(): DatabaseService {
  if (!activeDatabaseService || !isInitialized) {
    console.log('🔄 DatabaseService 지연 초기화...');
    return initializeDatabaseFromDI();
  }
  return activeDatabaseService;
}

/**
 * 데이터베이스 서비스 수동 설정 (테스트용)
 * @param service DatabaseService 인스턴스
 */
export function setDatabaseService(service: DatabaseService): void {
  if (activeDatabaseService && typeof activeDatabaseService.dispose === 'function') {
    activeDatabaseService.dispose();
  }
  activeDatabaseService = service;
  isInitialized = true;
  console.log('🔧 DatabaseService 수동 설정 완료');
}

/**
 * 데이터베이스 서비스 재설정
 */
export function resetDatabaseService(): void {
  console.log('🔄 DatabaseService 재설정...');
  
  if (activeDatabaseService && typeof activeDatabaseService.dispose === 'function') {
    activeDatabaseService.dispose();
  }
  
  activeDatabaseService = null;
  isInitialized = false;
  
  console.log('✅ DatabaseService 재설정 완료');
}

/**
 * 데이터베이스 연결 상태 확인
 * @returns 연결 성공 여부
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const dbService = getDatabaseService();
    
    if (!dbService.isConnected()) {
      console.log('🔄 데이터베이스 연결 시도...');
      await dbService.connect();
    }
    
    const isConnected = dbService.isConnected();
    console.log(`🔍 연결 상태: ${isConnected ? '✅ 연결됨' : '❌ 연결 실패'}`);
    
    return isConnected;
  } catch (error: any) {
    console.error('❌ 연결 상태 확인 실패:', error.message);
    return false;
  }
}

/**
 * 데이터베이스 상태 정보 조회
 * @returns 상태 정보 객체
 */
export function getDatabaseStatus(): {
  initialized: boolean;
  connected: boolean;
  serviceName: string;
  mode: string;
  environment: Record<string, any>;
  timestamp: string;
} {
  const status = {
    initialized: isInitialized,
    connected: false,
    serviceName: 'DatabaseService',
    mode: process.env.USE_MOCK_DATABASE === 'true' ? 'mock' : 'supabase',
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      SUPABASE_URL_SET: !!process.env.SUPABASE_URL,
      SUPABASE_KEY_SET: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      USE_MOCK_DATABASE: process.env.USE_MOCK_DATABASE === 'true'
    },
    timestamp: new Date().toISOString()
  };

  if (activeDatabaseService) {
    status.connected = activeDatabaseService.isConnected();
    status.serviceName = activeDatabaseService.constructor.name;
  }

  return status;
}

// ============================================================================
// 📤 Export 정리 (중복 완전 제거)
// ============================================================================

// 메인 클래스 export
export { DatabaseService } from './DatabaseService';

// 기본 export (지연 초기화 함수)
export default getDatabaseService;

// 유틸리티 export (단일 정의만)
export const database = {
  getInstance: getDatabaseService,
  initialize: initializeDatabaseFromDI,
  getStatus: getDatabaseStatus,
  checkConnection: checkDatabaseConnection,
  reset: resetDatabaseService
};

// ============================================================================
// 🧹 정리 및 로깅
// ============================================================================

// 환경변수 미리보기
if (process.env.SUPABASE_URL) {
  const projectId = process.env.SUPABASE_URL.split('//')[1]?.split('.')[0];
  console.log(`📍 Supabase 프로젝트: ${projectId}`);
} else {
  console.log('⚠️ SUPABASE_URL 환경변수 설정 필요');
}

// 프로세스 종료 시 정리
const cleanup = () => {
  try {
    console.log('🧹 DatabaseService 정리 중...');
    resetDatabaseService();
    console.log('✅ DatabaseService 정리 완료');
  } catch (error) {
    console.error('❌ DatabaseService 정리 실패:', error);
  }
};

if (typeof process !== 'undefined') {
  process.on('beforeExit', cleanup);
  process.on('SIGTERM', cleanup);
  process.on('SIGINT', cleanup);
}

console.log('✅ === 데이터베이스 서비스 인덱스 초기화 완료 (중복 export 해결) ===');