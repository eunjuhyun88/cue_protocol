// ============================================================================
// 🗄️ 데이터베이스 서비스 통합 인덱스
// 경로: backend/src/services/database/index.ts
// 용도: 단일 진입점으로 모든 라우터에서 동일하게 사용
// 특징: 환경에 따른 자동 서비스 선택 및 통합 인터페이스 제공
// ============================================================================

import { DatabaseService } from './DatabaseService';
import { supabaseService } from './SupabaseService';

/**
 * 데이터베이스 서비스 팩토리
 * - 환경변수에 따라 DatabaseService 또는 SupabaseService 선택
 * - 모든 라우터에서 동일한 인터페이스로 사용 가능
 * - 단일 import로 간편한 사용
 */

// 환경에 따른 서비스 선택 로직
const isDatabaseServiceMode = process.env.USE_DATABASE_SERVICE === 'true' || 
                             process.env.USE_MOCK_DATABASE === 'true' ||
                             !process.env.SUPABASE_URL || 
                             process.env.SUPABASE_URL.includes('dummy');

/**
 * 통합 데이터베이스 서비스 인스턴스
 * - DatabaseService: Mock + Supabase 통합, 싱글톤 패턴
 * - SupabaseService: Supabase 전용, Mock 폴백 지원
 */
const databaseService = isDatabaseServiceMode 
  ? DatabaseService.getInstance()
  : supabaseService;

// 서비스 정보 로깅
console.log('🗄️ Database Service Factory initialized');
console.log(`📋 Selected service: ${databaseService.constructor.name}`);
console.log(`🎭 Mock mode: ${databaseService.isMockMode?.() || false}`);
console.log(`🔗 Connected: ${databaseService.isConnected()}`);

// 자동 연결 시도 (DatabaseService는 constructor에서 자동 연결)
if (!isDatabaseServiceMode) {
  databaseService.connect?.().catch((error: any) => {
    console.error('❌ Database auto-connection failed:', error);
    console.log('🎭 Service will operate in Mock mode');
  });
}

// ============================================================================
// 📋 통합 인터페이스 정의 (타입 안정성)
// ============================================================================

/**
 * 통합 데이터베이스 서비스 인터페이스
 * DatabaseService와 SupabaseService가 모두 구현해야 하는 공통 메서드들
 */
export interface IUnifiedDatabaseService {
  // 🔌 연결 관리
  connect(): Promise<void>;
  disconnect?(): Promise<void>;
  isConnected(): boolean;
  isMockMode?(): boolean;
  testConnection(): Promise<boolean>;
  healthCheck?(): Promise<boolean>;

  // 👤 사용자 관리 (필수 메서드)
  createUser(userData: any): Promise<any>;
  getUserById(userId: string): Promise<any | null>;
  getUserByEmail(email: string): Promise<any | null>;
  updateUser(id: string, updates: any): Promise<any>;
  
  // 👤 사용자 관리 (선택적 메서드)
  getUserByDID?(did: string): Promise<any | null>;
  getUserByUsername?(username: string): Promise<any | null>;
  getUserByCredentialId?(credentialId: string): Promise<any | null>;
  findUserById?(id: string): Promise<any | null>;
  findUserByEmail?(email: string): Promise<any | null>;

  // 🔐 WebAuthn 관리 (필수 메서드)
  saveWebAuthnCredential(credentialData: any): Promise<boolean>;
  getWebAuthnCredentials(userId: string): Promise<any[]>;
  getWebAuthnCredentialById(credentialId: string): Promise<any | null>;
  updateWebAuthnCredentialCounter(credentialId: string, counter: number): Promise<boolean>;
  
  // 🔐 WebAuthn 관리 (선택적 메서드)
  storeCredential?(credentialData: any): Promise<any>;
  getCredential?(credentialId: string): Promise<any | null>;

  // 🎫 AI Passport 관리 (필수 메서드)
  getPassport(did: string): Promise<any | null>;
  updatePassport(did: string, updates: any): Promise<any>;
  
  // 🎫 AI Passport 관리 (선택적 메서드)
  createPassport?(passportData: any): Promise<any>;

  // 💎 CUE 토큰 관리 (필수 메서드)
  getCUEBalance(userDid: string): Promise<number>;
  
  // 💎 CUE 토큰 관리 (선택적 메서드)
  createCUETransaction?(transaction: any): Promise<any>;
  getCUETransactions?(did: string, limit?: number): Promise<any[]>;
  addCUETransaction?(transactionData: any): Promise<any>;
  recordCueTransaction?(transactionData: any): Promise<any>;

  // 🗄️ 데이터 볼트 관리 (필수 메서드)
  getDataVaults(userDid: string): Promise<any[]>;
  
  // 🗄️ 데이터 볼트 관리 (선택적 메서드)
  getUserVaults?(userId: string): Promise<any[]>;
  getVaultById?(vaultId: string): Promise<any | null>;
  createVault?(vaultData: any): Promise<any>;
  createDataVault?(vaultData: any): Promise<any>;
  updateVault?(vaultId: string, updates: any): Promise<any>;
  deleteVault?(vaultId: string): Promise<boolean>;
  saveVaultData?(vaultData: any): Promise<any>;
  getVaultData?(vaultId: string, limit?: number): Promise<any[]>;

  // 💬 채팅 관리 (필수 메서드)
  saveChatMessage(messageData: any): Promise<any>;
  getChatHistory(userDid: string, conversationId?: string, limit?: number): Promise<any[]>;

  // 🧠 개인화 CUE 관리 (선택적 메서드)
  getPersonalCues?(userDid: string, limit?: number): Promise<any[]>;
  getPersonalCuesByUser?(userDid: string): Promise<any[]>;
  getPersonalCue?(userDid: string, cueKey: string, cueType: string): Promise<any | null>;
  createPersonalCue?(cueData: any): Promise<any>;
  addPersonalCue?(cueData: any): Promise<any>;
  storePersonalCue?(cueData: any): Promise<any>;
  updatePersonalCue?(cueId: string, updateData: any): Promise<any>;

  // 🧹 유틸리티 (선택적 메서드)
  getSystemStats?(): Promise<any>;
  cleanupExpiredSessions?(): Promise<boolean>;
  getConnectionInfo?(): any;
  getStatistics?(): any;
  close?(): Promise<void>;
}

/**
 * 데이터베이스 연결 정보 타입
 */
export interface DatabaseConnectionInfo {
  type: 'supabase' | 'mock';
  connected: boolean;
  url?: string;
  mockDataCount?: number;
}

/**
 * 데이터베이스 헬스체크 결과 타입
 */
export interface DatabaseHealthCheck {
  healthy: boolean;
  service: string;
  mode: 'mock' | 'supabase';
  latency?: number;
}

/**
 * 데이터베이스 서비스 정보 타입
 */
export interface DatabaseServiceInfo {
  serviceName: string;
  isMockMode: boolean;
  isConnected: boolean;
  connectionInfo: DatabaseConnectionInfo | null;
  timestamp: string;
}

// ============================================================================
// 🎯 사용법 가이드 및 예시
// ============================================================================

/**
 * 사용법 예시:
 * 
 * // 모든 라우터에서 동일하게 사용
 * import databaseService from '../../services/database';
 * 
 * // 사용자 조회
 * const user = await databaseService.getUserById(userId);
 * 
 * // Passport 조회
 * const passport = await databaseService.getPassport(userDid);
 * 
 * // CUE 잔액 조회
 * const balance = await databaseService.getCUEBalance(userDid);
 * 
 * // 볼트 목록 조회
 * const vaults = await databaseService.getDataVaults(userDid);
 * 
 * // 연결 상태 확인
 * const isConnected = databaseService.isConnected();
 * const isMock = databaseService.isMockMode?.() || false;
 */

// ============================================================================
// 🧹 유틸리티 함수들
// ============================================================================

/**
 * 현재 사용 중인 데이터베이스 서비스 정보 반환
 */
export function getDatabaseServiceInfo(): DatabaseServiceInfo {
  return {
    serviceName: databaseService.constructor.name,
    isMockMode: databaseService.isMockMode?.() || false,
    isConnected: databaseService.isConnected(),
    connectionInfo: databaseService.getConnectionInfo?.() || null,
    timestamp: new Date().toISOString()
  };
}

/**
 * 데이터베이스 연결 상태 확인
 */
export async function checkDatabaseHealth(): Promise<DatabaseHealthCheck> {
  const startTime = Date.now();
  
  try {
    const isHealthy = await databaseService.testConnection();
    const latency = Date.now() - startTime;
    
    return {
      healthy: isHealthy,
      service: databaseService.constructor.name,
      mode: databaseService.isMockMode?.() ? 'mock' : 'supabase',
      latency
    };
  } catch (error) {
    return {
      healthy: false,
      service: databaseService.constructor.name,
      mode: databaseService.isMockMode?.() ? 'mock' : 'supabase'
    };
  }
}

/**
 * 강제로 특정 서비스 사용 (테스트용)
 */
export function getSpecificDatabaseService(type: 'database' | 'supabase') {
  if (type === 'database') {
    return DatabaseService.getInstance();
  } else {
    return supabaseService;
  }
}

// ============================================================================
// 🚀 Export
// ============================================================================

// 기본 export (주 사용법)
export default databaseService;

// 명시적 export들
export { DatabaseService } from './DatabaseService';
export { SupabaseService, supabaseService } from './SupabaseService';

// 타입 export들
export type { 
  IUnifiedDatabaseService,
  DatabaseConnectionInfo,
  DatabaseHealthCheck,
  DatabaseServiceInfo
};

// 디버깅용 export
export const debugInfo = {
  selectedService: databaseService.constructor.name,
  isDatabaseServiceMode,
  environment: {
    USE_DATABASE_SERVICE: process.env.USE_DATABASE_SERVICE,
    USE_MOCK_DATABASE: process.env.USE_MOCK_DATABASE,
    SUPABASE_URL: process.env.SUPABASE_URL ? '***configured***' : 'not set'
  }
};

console.log('✅ Database service index initialized successfully');
console.log('📊 Debug info:', debugInfo);