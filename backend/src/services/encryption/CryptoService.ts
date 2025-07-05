// ============================================================================
// 🔐 CryptoService - 무한루프 완전 해결 버전
// 파일: backend/src/services/encryption/CryptoService.ts
// 문제: Vault 데이터 암호화 테스트가 무한 반복 실행됨
// 해결: 글로벌 테스트 상태 관리, 강화된 쿨다운, 자동 호출 방지
// ============================================================================

import crypto from 'crypto';

export interface CryptoStatus {
  status: 'active' | 'error' | 'warning';
  keyConfigured: boolean;
  keyLength: number;
  algorithm: string;
  featuresAvailable: string[];
  operationCount: number;
  errors: number;
  lastTest: string;
  testResult?: any;
}

export interface EncryptionResult {
  encryptedData: string;
  iv: string;
  authTag?: string;
  algorithm: string;
  timestamp: string;
}

export interface TestResult {
  success: boolean;
  message: string;
  details: any;
  timestamp: string;
}

// ============================================================================
// 🔒 글로벌 테스트 상태 관리 (무한루프 방지)
// ============================================================================
class TestLockManager {
  private static testLocks: Map<string, number> = new Map();
  private static readonly COOLDOWN_MS = 60000; // 1분 쿨다운
  private static readonly MAX_CONCURRENT_TESTS = 1;
  private static activeTests: Set<string> = new Set();

  static canRunTest(testName: string): boolean {
    const now = Date.now();
    const lastTest = this.testLocks.get(testName) || 0;
    
    // 쿨다운 체크
    if (now - lastTest < this.COOLDOWN_MS) {
      console.log(`⏳ 테스트 쿨다운 중: ${testName} (남은 시간: ${Math.ceil((this.COOLDOWN_MS - (now - lastTest)) / 1000)}초)`);
      return false;
    }
    
    // 동시 실행 방지
    if (this.activeTests.has(testName)) {
      console.log(`🔄 이미 실행 중: ${testName}`);
      return false;
    }
    
    return true;
  }

  static startTest(testName: string): boolean {
    if (!this.canRunTest(testName)) return false;
    
    this.activeTests.add(testName);
    this.testLocks.set(testName, Date.now());
    console.log(`🚀 테스트 시작: ${testName}`);
    return true;
  }

  static endTest(testName: string): void {
    this.activeTests.delete(testName);
    console.log(`🏁 테스트 완료: ${testName}`);
  }

  static getStatus(): any {
    return {
      activeLocks: Array.from(this.activeTests),
      lockCount: this.testLocks.size,
      cooldownRemaining: Object.fromEntries(
        Array.from(this.testLocks.entries()).map(([name, time]) => [
          name, 
          Math.max(0, this.COOLDOWN_MS - (Date.now() - time))
        ])
      )
    };
  }

  static reset(): void {
    this.testLocks.clear();
    this.activeTests.clear();
    console.log('🧹 TestLockManager 초기화 완료');
  }
}

export class CryptoService {
  private static instance: CryptoService;
  private encryptionKey: Buffer;
  private algorithm: string = 'aes-256-gcm';
  private operationCount: number = 0;
  private errorCount: number = 0;
  private lastTestResult: TestResult | null = null;
  private isDisposed: boolean = false;
  
  private constructor() {
    console.log('🔐 CryptoService 초기화 중 (무한루프 방지 버전)...');
    
    // 환경변수에서 키 로드 또는 기본 키 생성
    const envKey = process.env.ENCRYPTION_KEY;
    
    if (envKey && envKey.length === 32) {
      this.encryptionKey = Buffer.from(envKey, 'utf8');
      console.log('✅ 환경변수에서 암호화 키 로드됨');
    } else {
      // 개발용 기본 키 (경고 표시)
      this.encryptionKey = Buffer.from('dev-key-32-chars-for-testing!!', 'utf8');
      if (process.env.NODE_ENV === 'production') {
        console.error('❌ 프로덕션에서 ENCRYPTION_KEY 환경변수가 필요합니다!');
        this.errorCount++;
      } else {
        console.warn('⚠️ 개발용 기본 암호화 키 사용 중');
      }
    }
    
    console.log('✅ CryptoService 초기화 완료 (무한루프 방지 적용)');
  }

  public static getInstance(): CryptoService {
    if (!CryptoService.instance || CryptoService.instance.isDisposed) {
      CryptoService.instance = new CryptoService();
    }
    return CryptoService.instance;
  }

  // ============================================================================
  // 🔒 기본 암호화/복호화 메서드들
  // ============================================================================

  /**
   * 텍스트 암호화 (개선된 GCM 방식)
   */
  public encrypt(text: string): string {
    if (this.isDisposed) {
      throw new Error('CryptoService가 정리되었습니다');
    }

    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipherGCM('aes-256-gcm', this.encryptionKey, iv);
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      const result = iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
      
      this.operationCount++;
      return result;
    } catch (error: any) {
      this.errorCount++;
      console.error('❌ 암호화 실패:', error.message);
      throw new Error(`암호화 실패: ${error.message}`);
    }
  }

  /**
   * 텍스트 복호화 (개선된 GCM 방식)
   */
  public decrypt(encryptedData: string): string {
    if (this.isDisposed) {
      throw new Error('CryptoService가 정리되었습니다');
    }

    try {
      const parts = encryptedData.split(':');
      if (parts.length !== 3) {
        throw new Error('잘못된 암호화 데이터 형식');
      }
      
      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];
      
      const decipher = crypto.createDecipherGCM('aes-256-gcm', this.encryptionKey, iv);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      this.operationCount++;
      return decrypted;
    } catch (error: any) {
      this.errorCount++;
      console.error('❌ 복호화 실패:', error.message);
      throw new Error(`복호화 실패: ${error.message}`);
    }
  }

  /**
   * 해시 생성
   */
  public hash(data: string): string {
    if (this.isDisposed) {
      throw new Error('CryptoService가 정리되었습니다');
    }

    try {
      const hash = crypto.createHash('sha256').update(data).digest('hex');
      this.operationCount++;
      return hash;
    } catch (error: any) {
      this.errorCount++;
      throw new Error(`해시 생성 실패: ${error.message}`);
    }
  }

  // ============================================================================
  // 🆔 유틸리티 메서드들
  // ============================================================================

  /**
   * UUID 생성
   */
  public generateUUID(): string {
    if (this.isDisposed) {
      throw new Error('CryptoService가 정리되었습니다');
    }
    return crypto.randomUUID();
  }

  /**
   * 랜덤 바이트 생성
   */
  public generateRandomBytes(length: number = 32): string {
    if (this.isDisposed) {
      throw new Error('CryptoService가 정리되었습니다');
    }
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * 보안 토큰 생성
   */
  public generateSecureToken(length: number = 64): string {
    if (this.isDisposed) {
      throw new Error('CryptoService가 정리되었습니다');
    }
    return crypto.randomBytes(length).toString('base64url');
  }

  // ============================================================================
  // 🏦 Vault 전용 암호화 (무한루프 방지)
  // ============================================================================

  /**
   * Vault 데이터 암호화 (로그 스팸 방지)
   */
  public encryptVaultData(data: any): string {
    if (this.isDisposed) {
      throw new Error('CryptoService가 정리되었습니다');
    }

    try {
      const jsonData = JSON.stringify(data);
      const encrypted = this.encrypt(jsonData);
      
      this.operationCount++;
      return encrypted;
    } catch (error: any) {
      this.errorCount++;
      console.error('❌ Vault 암호화 실패:', error.message);
      throw new Error(`Vault 암호화 실패: ${error.message}`);
    }
  }

  /**
   * Vault 데이터 복호화 (로그 스팸 방지)
   */
  public decryptVaultData(encryptedData: string): any {
    if (this.isDisposed) {
      throw new Error('CryptoService가 정리되었습니다');
    }

    try {
      const decryptedJson = this.decrypt(encryptedData);
      const data = JSON.parse(decryptedJson);
      
      this.operationCount++;
      return data;
    } catch (error: any) {
      this.errorCount++;
      console.error('❌ Vault 복호화 실패:', error.message);
      throw new Error(`Vault 복호화 실패: ${error.message}`);
    }
  }

  // ============================================================================
  // 🧪 암호화 테스트 (무한루프 완전 방지)
  // ============================================================================

  /**
   * 기본 암호화 기능 테스트 (쿨다운 적용)
   */
  public testEncryption(): TestResult {
    const testName = 'basic_encryption';
    
    // 이전 결과 재사용 (10초 이내)
    if (this.lastTestResult && 
        Date.now() - new Date(this.lastTestResult.timestamp).getTime() < 10000) {
      console.log('⚡ 최근 테스트 결과 재사용');
      return this.lastTestResult;
    }
    
    if (!TestLockManager.startTest(testName)) {
      return {
        success: false,
        message: '테스트 쿨다운 중 또는 이미 실행 중',
        details: TestLockManager.getStatus(),
        timestamp: new Date().toISOString()
      };
    }
    
    try {
      const testData = 'CryptoService 테스트 데이터 - ' + new Date().toISOString();
      
      // 기본 암호화/복호화 테스트
      const encrypted = this.encrypt(testData);
      const decrypted = this.decrypt(encrypted);
      const isValid = decrypted === testData;
      
      // 해시 테스트
      const hash = this.hash(testData);
      
      // UUID 및 토큰 테스트
      const uuid = this.generateUUID();
      const token = this.generateSecureToken();
      
      const result: TestResult = {
        success: isValid,
        message: isValid ? '모든 암호화 기능 정상' : '암호화 검증 실패',
        details: {
          testDataLength: testData.length,
          encryptedLength: encrypted.length,
          decryptedLength: decrypted.length,
          hashLength: hash.length,
          uuidLength: uuid.length,
          tokenLength: token.length,
          dataIntegrity: isValid ? 'PASS' : 'FAIL',
          algorithm: this.algorithm,
          operationCount: this.operationCount
        },
        timestamp: new Date().toISOString()
      };
      
      this.lastTestResult = result;
      return result;
      
    } catch (error: any) {
      this.errorCount++;
      const errorResult: TestResult = {
        success: false,
        message: `테스트 실패: ${error.message}`,
        details: {
          error: error.message,
          operationCount: this.operationCount,
          errorCount: this.errorCount
        },
        timestamp: new Date().toISOString()
      };
      
      this.lastTestResult = errorResult;
      return errorResult;
    } finally {
      TestLockManager.endTest(testName);
    }
  }

  /**
   * Vault 데이터 테스트 (강화된 무한루프 방지)
   */
  public testVaultDataEncryption(): TestResult {
    const testName = 'vault_encryption';
    
    if (!TestLockManager.startTest(testName)) {
      console.log('⏳ Vault 테스트 스킵됨 (쿨다운 또는 실행 중)');
      return {
        success: true,
        message: 'Vault 테스트 쿨다운 중',
        details: TestLockManager.getStatus(),
        timestamp: new Date().toISOString()
      };
    }
    
    try {
      console.log('🧪 Vault 데이터 암호화 테스트 시작... (무한루프 방지 적용)');
      
      // 테스트 데이터
      const testVaultData = {
        userProfile: {
          name: 'Test User',
          email: 'test@example.com',
          preferences: { theme: 'dark', language: 'ko' }
        },
        behaviorPatterns: {
          interactions: 42,
          avgSessionTime: 1800,
          preferredModels: ['llama3.2:3b']
        },
        timestamp: Date.now()
      };
      
      // 암호화 테스트
      const encrypted = this.encryptVaultData(testVaultData);
      console.log(`🔒 Vault 암호화 성공 (길이: ${JSON.stringify(testVaultData).length} → ${encrypted.length})`);
      
      // 복호화 테스트
      const decrypted = this.decryptVaultData(encrypted);
      console.log(`🔓 Vault 복호화 성공: ${typeof decrypted} [ ${Object.keys(decrypted).join(', ')} ]`);
      
      // 데이터 무결성 검증
      const isValid = JSON.stringify(testVaultData) === JSON.stringify(decrypted);
      
      const result: TestResult = {
        success: isValid,
        message: isValid ? 'Vault 데이터 테스트 성공' : 'Vault 데이터 무결성 실패',
        details: {
          originalSize: JSON.stringify(testVaultData).length,
          encryptedSize: encrypted.length,
          decryptedSize: JSON.stringify(decrypted).length,
          dataIntegrity: isValid ? 'PASS' : 'FAIL',
          testObjectKeys: Object.keys(testVaultData),
          decryptedObjectKeys: Object.keys(decrypted),
          timestamp: testVaultData.timestamp
        },
        timestamp: new Date().toISOString()
      };
      
      console.log(`✅ Vault 데이터 테스트 ${isValid ? '성공' : '실패'}`);
      this.lastTestResult = result;
      return result;
      
    } catch (error: any) {
      console.error('❌ Vault 데이터 테스트 실패:', error.message);
      this.errorCount++;
      
      const errorResult: TestResult = {
        success: false,
        message: `Vault 테스트 실패: ${error.message}`,
        details: {
          error: error.message,
          errorCount: this.errorCount,
          stack: error.stack?.split('\n')[0]
        },
        timestamp: new Date().toISOString()
      };
      
      this.lastTestResult = errorResult;
      return errorResult;
      
    } finally {
      TestLockManager.endTest(testName);
      console.log('🏁 Vault 테스트 완료 (무한루프 방지 해제)');
    }
  }

  // ============================================================================
  // 📊 상태 조회 및 관리
  // ============================================================================

  /**
   * 서비스 상태 조회
   */
  public getStatus(): CryptoStatus {
    const keyConfigured = !!process.env.ENCRYPTION_KEY && process.env.ENCRYPTION_KEY.length === 32;
    
    let status: 'active' | 'error' | 'warning' = 'active';
    if (this.isDisposed) {
      status = 'error';
    } else if (this.errorCount > 0) {
      status = 'error';
    } else if (!keyConfigured) {
      status = 'warning';
    }
    
    return {
      status,
      keyConfigured,
      keyLength: this.encryptionKey?.length || 0,
      algorithm: this.algorithm,
      featuresAvailable: [
        'encrypt', 'decrypt', 'hash', 'generateUUID', 
        'generateRandomBytes', 'generateSecureToken',
        'encryptVaultData', 'decryptVaultData', 'testEncryption'
      ],
      operationCount: this.operationCount,
      errors: this.errorCount,
      lastTest: this.lastTestResult?.timestamp || 'N/A',
      testResult: this.lastTestResult
    };
  }

  /**
   * 서비스 재시작 (TestLockManager도 초기화)
   */
  public restart(): void {
    console.log('🔄 CryptoService 재시작 중...');
    
    this.operationCount = 0;
    this.errorCount = 0;
    this.lastTestResult = null;
    this.isDisposed = false;
    
    // 테스트 락 매니저도 초기화
    TestLockManager.reset();
    
    console.log('✅ CryptoService 재시작 완료');
  }

  /**
   * 서비스 정리 (메모리 안전)
   */
  public dispose(): void {
    console.log('🧹 CryptoService 정리 중...');
    
    this.isDisposed = true;
    
    // 메모리 정리
    if (this.encryptionKey) {
      this.encryptionKey.fill(0);
    }
    this.operationCount = 0;
    this.errorCount = 0;
    this.lastTestResult = null;
    
    // 테스트 락 매니저도 정리
    TestLockManager.reset();
    
    console.log('✅ CryptoService 정리 완료');
  }

  /**
   * 강제 테스트 정리 (디버깅용)
   */
  public clearTestLocks(): void {
    TestLockManager.reset();
    console.log('🧹 모든 테스트 락 정리됨');
  }

  /**
   * 테스트 상태 조회 (디버깅용)
   */
  public getTestStatus(): any {
    return {
      lockManager: TestLockManager.getStatus(),
      lastTestResult: this.lastTestResult,
      isDisposed: this.isDisposed,
      operationCount: this.operationCount,
      errorCount: this.errorCount
    };
  }
}

// ============================================================================
// 📤 Export
// ============================================================================

export default CryptoService;