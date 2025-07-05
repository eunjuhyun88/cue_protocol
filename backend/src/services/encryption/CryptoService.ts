// ============================================================================
// 📁 backend/src/services/encryption/CryptoService.ts
// 🔐 올바른 ES 모듈 방식의 CryptoService (Node.js 내장 모듈)
// ============================================================================

import * as crypto from 'crypto';
// 또는 Node.js 18+ 환경에서는:
// import { randomBytes, createCipherGCM, createDecipherGCM, createHash, randomUUID, pbkdf2Sync } from 'crypto';

/**
 * 암호화 설정 인터페이스
 */
interface CryptoConfig {
  algorithm: string;
  ivLength: number;
  saltLength: number;
  tagLength: number;
  iterations: number;
}

/**
 * 암호화 상태 인터페이스
 */
interface CryptoStatus {
  status: 'healthy' | 'warning' | 'error';
  keyConfigured: boolean;
  keyLength: number;
  algorithm: string;
  featuresAvailable: string[];
  lastOperation: string | null;
  operationCount: number;
  errors: number;
  timestamp: string;
}

/**
 * 🔐 완전 개선된 CryptoService (Singleton + DI 호환) - 올바른 ES 모듈 방식
 */
export class CryptoService {
  private static instance: CryptoService;
  
  // 기본 설정
  private readonly config: CryptoConfig = {
    algorithm: process.env.CRYPTO_ALGORITHM || 'aes-256-gcm',
    ivLength: parseInt(process.env.CRYPTO_IV_LENGTH || '16'),
    saltLength: parseInt(process.env.CRYPTO_SALT_LENGTH || '32'),
    tagLength: parseInt(process.env.CRYPTO_TAG_LENGTH || '16'),
    iterations: 100000
  };
  
  // 상태 추적
  private encryptionKey: string;
  private operationCount: number = 0;
  private errorCount: number = 0;
  private lastOperation: string | null = null;
  private isInitialized: boolean = false;

  /**
   * private 생성자 (Singleton)
   */
  private constructor() {
    console.log('🔐 CryptoService 초기화 중 (ES 모듈 방식)...');
    
    try {
      this.encryptionKey = this.initializeEncryptionKey();
      this.isInitialized = true;
      console.log('✅ CryptoService 초기화 완료');
    } catch (error: any) {
      console.error('❌ CryptoService 초기화 실패:', error.message);
      this.errorCount++;
      throw error;
    }
  }

  /**
   * Singleton 인스턴스 반환
   */
  public static getInstance(): CryptoService {
    if (!CryptoService.instance) {
      CryptoService.instance = new CryptoService();
    }
    return CryptoService.instance;
  }

  /**
   * 암호화 키 초기화 (환경변수 + 기본값)
   */
  private initializeEncryptionKey(): string {
    const envKey = process.env.ENCRYPTION_KEY;
    
    if (envKey && envKey.length === 32) {
      console.log('✅ 환경변수에서 ENCRYPTION_KEY 로드됨');
      return envKey;
    }
    
    if (envKey && envKey.length !== 32) {
      console.warn(`⚠️ ENCRYPTION_KEY 길이가 잘못됨: ${envKey.length}/32`);
    }
    
    // 기본 키 생성 (개발용)
    const defaultKey = 'dev_key_1234567890abcdef1234567890';
    console.warn('⚠️ ENCRYPTION_KEY 환경변수가 없습니다. 기본 개발 키를 사용합니다.');
    console.warn('🔧 프로덕션에서는 반드시 안전한 32자리 키를 설정하세요!');
    
    return defaultKey;
  }

  /**
   * 키 유도 함수 (PBKDF2)
   */
  private deriveKey(salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(this.encryptionKey, salt, this.config.iterations, 32, 'sha256');
  }

  /**
   * 🔒 데이터 암호화
   */
  public encrypt(text: string): string {
    try {
      this.lastOperation = 'encrypt';
      this.operationCount++;
      
      if (!text || typeof text !== 'string') {
        throw new Error('암호화할 텍스트가 유효하지 않습니다');
      }
      
      const iv = crypto.randomBytes(this.config.ivLength);
      const salt = crypto.randomBytes(this.config.saltLength);
      const key = this.deriveKey(salt);
      
      const cipher = crypto.createCipherGCM(this.config.algorithm, key, iv);
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      // 결합: salt + iv + authTag + encrypted
      const result = salt.toString('hex') + ':' + 
                    iv.toString('hex') + ':' + 
                    authTag.toString('hex') + ':' + 
                    encrypted;
      
      console.log(`🔒 데이터 암호화 성공 (길이: ${text.length} → ${result.length})`);
      return result;
      
    } catch (error: any) {
      this.errorCount++;
      console.error('❌ 암호화 실패:', error.message);
      throw new Error(`데이터 암호화 실패: ${error.message}`);
    }
  }

  /**
   * 🔓 데이터 복호화
   */
  public decrypt(encryptedData: string): string {
    try {
      this.lastOperation = 'decrypt';
      this.operationCount++;
      
      if (!encryptedData || typeof encryptedData !== 'string') {
        throw new Error('복호화할 데이터가 유효하지 않습니다');
      }
      
      const parts = encryptedData.split(':');
      if (parts.length !== 4) {
        throw new Error('암호화된 데이터 형식이 잘못되었습니다');
      }

      const salt = Buffer.from(parts[0], 'hex');
      const iv = Buffer.from(parts[1], 'hex');
      const authTag = Buffer.from(parts[2], 'hex');
      const encrypted = parts[3];

      const key = this.deriveKey(salt);
      
      const decipher = crypto.createDecipherGCM(this.config.algorithm, key, iv);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      console.log(`🔓 데이터 복호화 성공 (길이: ${encryptedData.length} → ${decrypted.length})`);
      return decrypted;
      
    } catch (error: any) {
      this.errorCount++;
      console.error('❌ 복호화 실패:', error.message);
      throw new Error(`데이터 복호화 실패: ${error.message}`);
    }
  }

  /**
   * 🔨 데이터 해시 생성
   */
  public hash(data: string): string {
    try {
      this.lastOperation = 'hash';
      this.operationCount++;
      
      if (!data || typeof data !== 'string') {
        throw new Error('해시할 데이터가 유효하지 않습니다');
      }
      
      const hash = crypto.createHash('sha256').update(data).digest('hex');
      console.log(`🔨 해시 생성 성공 (길이: ${data.length} → ${hash.length})`);
      return hash;
      
    } catch (error: any) {
      this.errorCount++;
      console.error('❌ 해시 생성 실패:', error.message);
      throw new Error(`해시 생성 실패: ${error.message}`);
    }
  }

  /**
   * 🎲 UUID 생성
   */
  public generateUUID(): string {
    try {
      this.lastOperation = 'generateUUID';
      this.operationCount++;
      
      const uuid = crypto.randomUUID();
      console.log(`🎲 UUID 생성 성공: ${uuid}`);
      return uuid;
      
    } catch (error: any) {
      this.errorCount++;
      console.error('❌ UUID 생성 실패:', error.message);
      
      // fallback UUID 생성
      const fallbackUuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
      
      console.log(`🔄 fallback UUID 생성: ${fallbackUuid}`);
      return fallbackUuid;
    }
  }

  /**
   * 🎯 랜덤 바이트 생성
   */
  public generateRandomBytes(length: number): string {
    try {
      this.lastOperation = 'generateRandomBytes';
      this.operationCount++;
      
      if (length <= 0 || length > 1024) {
        throw new Error('잘못된 바이트 길이입니다 (1-1024)');
      }
      
      const bytes = crypto.randomBytes(length).toString('hex');
      console.log(`🎯 랜덤 바이트 생성 성공 (길이: ${length} → ${bytes.length})`);
      return bytes;
      
    } catch (error: any) {
      this.errorCount++;
      console.error('❌ 랜덤 바이트 생성 실패:', error.message);
      throw new Error(`랜덤 바이트 생성 실패: ${error.message}`);
    }
  }

  /**
   * 🔑 보안 토큰 생성
   */
  public generateSecureToken(): string {
    try {
      this.lastOperation = 'generateSecureToken';
      this.operationCount++;
      
      const token = crypto.randomBytes(32).toString('hex');
      console.log(`🔑 보안 토큰 생성 성공 (길이: ${token.length})`);
      return token;
      
    } catch (error: any) {
      this.errorCount++;
      console.error('❌ 보안 토큰 생성 실패:', error.message);
      throw new Error(`보안 토큰 생성 실패: ${error.message}`);
    }
  }

  /**
   * 🗄️ Vault 데이터 전용 암호화 (추가 보안 레이어)
   */
  public encryptVaultData(data: any): string {
    try {
      this.lastOperation = 'encryptVaultData';
      
      const jsonData = JSON.stringify(data);
      const timestamp = Date.now().toString();
      const dataWithTimestamp = `${timestamp}:${jsonData}`;
      
      return this.encrypt(dataWithTimestamp);
      
    } catch (error: any) {
      this.errorCount++;
      console.error('❌ Vault 데이터 암호화 실패:', error.message);
      throw new Error(`Vault 데이터 암호화 실패: ${error.message}`);
    }
  }

  /**
   * 🗄️ Vault 데이터 전용 복호화
   */
  public decryptVaultData<T = any>(encryptedData: string): T {
    try {
      this.lastOperation = 'decryptVaultData';
      
      const decryptedData = this.decrypt(encryptedData);
      const [timestamp, jsonData] = decryptedData.split(':', 2);
      
      if (!timestamp || !jsonData) {
        throw new Error('Vault 데이터 형식이 잘못되었습니다');
      }
      
      const data = JSON.parse(jsonData);
      console.log(`🗄️ Vault 데이터 복호화 성공 (타임스탬프: ${new Date(parseInt(timestamp)).toISOString()})`);
      
      return data;
      
    } catch (error: any) {
      this.errorCount++;
      console.error('❌ Vault 데이터 복호화 실패:', error.message);
      throw new Error(`Vault 데이터 복호화 실패: ${error.message}`);
    }
  }

  /**
   * 🧪 암호화 기능 테스트
   */
  public testEncryption(): { success: boolean; message: string; details: any } {
    try {
      console.log('🧪 암호화 기능 테스트 시작...');
      
      const testData = 'Hello, CryptoService Test! 🔐';
      const testObject = { test: true, timestamp: Date.now(), data: [1, 2, 3] };
      
      // 1. 기본 암호화/복호화 테스트
      const encrypted = this.encrypt(testData);
      const decrypted = this.decrypt(encrypted);
      
      if (decrypted !== testData) {
        throw new Error('기본 암호화/복호화 테스트 실패');
      }
      
      // 2. 해시 테스트
      const hash1 = this.hash(testData);
      const hash2 = this.hash(testData);
      
      if (hash1 !== hash2) {
        throw new Error('해시 일관성 테스트 실패');
      }
      
      // 3. UUID 테스트
      const uuid = this.generateUUID();
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      
      if (!uuidRegex.test(uuid)) {
        throw new Error('UUID 형식 테스트 실패');
      }
      
      // 4. Vault 데이터 테스트
      const encryptedVault = this.encryptVaultData(testObject);
      const decryptedVault = this.decryptVaultData(encryptedVault);
      
      if (JSON.stringify(decryptedVault) !== JSON.stringify(testObject)) {
        throw new Error('Vault 데이터 테스트 실패');
      }
      
      console.log('✅ 모든 암호화 기능 테스트 통과');
      
      return {
        success: true,
        message: '모든 암호화 기능이 정상 작동합니다',
        details: {
          basicEncryption: true,
          hashConsistency: true,
          uuidGeneration: true,
          vaultEncryption: true,
          testDataLength: testData.length,
          encryptedLength: encrypted.length,
          hashLength: hash1.length,
          uuid,
          operationCount: this.operationCount
        }
      };
      
    } catch (error: any) {
      this.errorCount++;
      console.error('❌ 암호화 기능 테스트 실패:', error.message);
      
      return {
        success: false,
        message: `암호화 기능 테스트 실패: ${error.message}`,
        details: {
          error: error.message,
          operationCount: this.operationCount,
          errorCount: this.errorCount
        }
      };
    }
  }

  /**
   * 📊 서비스 상태 조회 (헬스체크 호환)
   */
  public getStatus(): CryptoStatus {
    const featuresAvailable = [];
    
    // 기능 가용성 체크
    try {
      crypto.randomBytes(1);
      featuresAvailable.push('randomBytes');
    } catch { /* ignore */ }
    
    try {
      crypto.createHash('sha256');
      featuresAvailable.push('hash');
    } catch { /* ignore */ }
    
    try {
      crypto.createCipherGCM('aes-256-gcm', Buffer.alloc(32), Buffer.alloc(16));
      featuresAvailable.push('encryption');
    } catch { /* ignore */ }
    
    try {
      crypto.randomUUID();
      featuresAvailable.push('uuid');
    } catch { /* ignore */ }

    const status: CryptoStatus = {
      status: this.isInitialized ? (this.errorCount === 0 ? 'healthy' : 'warning') : 'error',
      keyConfigured: !!this.encryptionKey && this.encryptionKey.length === 32,
      keyLength: this.encryptionKey?.length || 0,
      algorithm: this.config.algorithm,
      featuresAvailable,
      lastOperation: this.lastOperation,
      operationCount: this.operationCount,
      errors: this.errorCount,
      timestamp: new Date().toISOString()
    };
    
    return status;
  }

  /**
   * 🧹 서비스 정리 (dispose 패턴)
   */
  public dispose(): void {
    console.log('🧹 CryptoService 정리 중...');
    
    // 메모리에서 키 제거 (보안)
    if (this.encryptionKey) {
      this.encryptionKey = '';
    }
    
    this.isInitialized = false;
    console.log('✅ CryptoService 정리 완료');
  }

  /**
   * 🔄 서비스 재시작
   */
  public restart(): void {
    console.log('🔄 CryptoService 재시작 중...');
    
    this.dispose();
    
    try {
      this.encryptionKey = this.initializeEncryptionKey();
      this.isInitialized = true;
      this.operationCount = 0;
      this.errorCount = 0;
      this.lastOperation = null;
      
      console.log('✅ CryptoService 재시작 완료');
    } catch (error: any) {
      console.error('❌ CryptoService 재시작 실패:', error.message);
      throw error;
    }
  }
}

// ============================================================================
// 📤 Export
// ============================================================================

export default CryptoService;

// 하위 호환성을 위한 static 방식 접근
export const CryptoUtils = {
  encrypt: (text: string) => CryptoService.getInstance().encrypt(text),
  decrypt: (encryptedData: string) => CryptoService.getInstance().decrypt(encryptedData),
  hash: (data: string) => CryptoService.getInstance().hash(data),
  generateUUID: () => CryptoService.getInstance().generateUUID(),
  generateRandomBytes: (length: number) => CryptoService.getInstance().generateRandomBytes(length),
  generateSecureToken: () => CryptoService.getInstance().generateSecureToken()
};

console.log('✅ CryptoService (올바른 ES 모듈 방식) 로드 완료');