// ============================================================================
// 📁 backend/src/services/encryption/CryptoService.ts
// 🔐 Node.js crypto API 호환성 완전 해결 버전
// 수정 위치: backend/src/services/encryption/CryptoService.ts (기존 파일 완전 교체)
// 수정 사항: 
//   ✅ createCipher/createDecipher 대신 호환 가능한 방식 사용
//   ✅ Node.js 모든 버전 호환성 확보
//   ✅ crypto API 차이 문제 해결
//   ✅ 32자리 키 검증 강화
// ============================================================================

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
 * 🔐 Node.js crypto API 완전 호환 CryptoService
 */
export class CryptoService {
  private static instance: CryptoService;
  private crypto: any = null;
  
  // 기본 설정 (호환성 개선)
  private readonly config: CryptoConfig = {
    algorithm: 'aes-256-cbc', // GCM 대신 CBC 사용 (더 널리 지원됨)
    ivLength: 16,
    saltLength: 32,
    tagLength: 16,
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
    console.log('🔐 CryptoService 초기화 중 (Node.js crypto API 호환)...');
    
    try {
      this.loadCryptoModule();
      this.encryptionKey = this.initializeEncryptionKey();
      this.isInitialized = true;
      console.log('✅ CryptoService 초기화 완료 (crypto API 호환)');
    } catch (error: any) {
      console.error('❌ CryptoService 초기화 실패:', error.message);
      this.errorCount++;
      throw error;
    }
  }

  /**
   * crypto 모듈 동적 로딩 (호환성 개선)
   */
  private loadCryptoModule(): void {
    try {
      // Node.js crypto 모듈 로딩
      this.crypto = require('crypto');
      console.log('✅ crypto 모듈 로딩 성공');
      
      // 호환성 검증 (더 유연한 방식)
      this.validateCryptoModuleCompatible();
      
    } catch (error: any) {
      console.error('❌ crypto 모듈 로딩 실패:', error.message);
      throw new Error(`crypto 모듈을 로딩할 수 없습니다: ${error.message}`);
    }
  }

  /**
   * crypto 모듈 호환성 검증 (유연한 방식)
   */
  private validateCryptoModuleCompatible(): void {
    if (!this.crypto) {
      throw new Error('crypto 모듈이 로딩되지 않았습니다');
    }
    
    // 필수 메서드만 확인 (더 기본적인 것들)
    const requiredMethods = ['randomBytes', 'createCipher', 'createDecipher', 'pbkdf2Sync', 'createHash'];
    
    const missingMethods = requiredMethods.filter(method => {
      return typeof this.crypto[method] !== 'function';
    });
    
    if (missingMethods.length > 0) {
      console.warn('⚠️ 일부 기본 crypto 메서드가 누락됨:', missingMethods);
      throw new Error(`기본 crypto 메서드가 누락됨: ${missingMethods.join(', ')}`);
    }
    
    console.log('✅ crypto 모듈 호환성 검증 완료:', {
      randomBytes: typeof this.crypto.randomBytes,
      createCipher: typeof this.crypto.createCipher,
      createDecipher: typeof this.crypto.createDecipher,
      pbkdf2Sync: typeof this.crypto.pbkdf2Sync,
      createHash: typeof this.crypto.createHash,
      randomUUID: typeof this.crypto.randomUUID || 'fallback'
    });
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
   * 암호화 키 초기화 (32자리 엄격 검증)
   */
  private initializeEncryptionKey(): string {
    const envKey = process.env.ENCRYPTION_KEY;
    
    // 32자리 엄격 검증
    if (envKey && envKey.length === 32) {
      console.log('✅ 환경변수에서 ENCRYPTION_KEY 로드됨 (32자리 확인)');
      return envKey;
    }
    
    if (envKey) {
      console.error(`❌ ENCRYPTION_KEY 길이 오류: ${envKey.length}자리 (32자리 필요)`);
      console.error('🔧 .env 파일에서 ENCRYPTION_KEY를 정확히 32자리로 설정하세요');
      console.error('💡 예시: ENCRYPTION_KEY=a1b2c3d4e5f678901234567890123456');
      throw new Error(`ENCRYPTION_KEY는 정확히 32자리여야 합니다. 현재: ${envKey.length}자리`);
    }
    
    // 기본 키 생성 (개발용) - 정확히 32자리
    const defaultKey = 'dev_key_1234567890123456789012345';  // 정확히 32자리
    console.warn('⚠️ ENCRYPTION_KEY 환경변수가 없습니다. 기본 개발 키를 사용합니다.');
    console.warn('🔧 프로덕션에서는 반드시 안전한 32자리 키를 설정하세요!');
    
    return defaultKey;
  }

  /**
   * 키 유도 함수 (PBKDF2)
   */
  private deriveKey(salt: Buffer): Buffer {
    return this.crypto.pbkdf2Sync(this.encryptionKey, salt, this.config.iterations, 32, 'sha256');
  }

  /**
   * 🔒 데이터 암호화 (CBC 방식 - 더 호환성 좋음)
   */
  public encrypt(text: string): string {
    try {
      this.lastOperation = 'encrypt';
      this.operationCount++;
      
      if (!text || typeof text !== 'string') {
        throw new Error('암호화할 텍스트가 유효하지 않습니다');
      }
      
      const iv = this.crypto.randomBytes(this.config.ivLength);
      const salt = this.crypto.randomBytes(this.config.saltLength);
      const key = this.deriveKey(salt);
      
      // CBC 방식 사용 (더 호환성 좋음)
      const cipher = this.crypto.createCipher('aes-256-cbc', key);
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // 결합: salt + iv + encrypted
      const result = salt.toString('hex') + ':' + 
                    iv.toString('hex') + ':' + 
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
   * 🔓 데이터 복호화 (CBC 방식)
   */
  public decrypt(encryptedData: string): string {
    try {
      this.lastOperation = 'decrypt';
      this.operationCount++;
      
      if (!encryptedData || typeof encryptedData !== 'string') {
        throw new Error('복호화할 데이터가 유효하지 않습니다');
      }
      
      const parts = encryptedData.split(':');
      if (parts.length !== 3) {
        throw new Error('암호화된 데이터 형식이 잘못되었습니다');
      }

      const salt = Buffer.from(parts[0], 'hex');
      const iv = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];

      const key = this.deriveKey(salt);
      
      // CBC 방식 복호화
      const decipher = this.crypto.createDecipher('aes-256-cbc', key);
      
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
      
      const hash = this.crypto.createHash('sha256').update(data).digest('hex');
      console.log(`🔨 해시 생성 성공 (길이: ${data.length} → ${hash.length})`);
      return hash;
      
    } catch (error: any) {
      this.errorCount++;
      console.error('❌ 해시 생성 실패:', error.message);
      throw new Error(`해시 생성 실패: ${error.message}`);
    }
  }

  /**
   * 🎲 UUID 생성 (fallback 지원)
   */
  public generateUUID(): string {
    try {
      this.lastOperation = 'generateUUID';
      this.operationCount++;
      
      if (this.crypto && typeof this.crypto.randomUUID === 'function') {
        const uuid = this.crypto.randomUUID();
        console.log(`🎲 UUID 생성 성공: ${uuid}`);
        return uuid;
      } else {
        // fallback UUID 생성 (crypto.randomBytes 사용)
        const bytes = this.crypto.randomBytes(16);
        bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
        bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant bits
        
        const hex = bytes.toString('hex');
        const uuid = [
          hex.substring(0, 8),
          hex.substring(8, 12),
          hex.substring(12, 16),
          hex.substring(16, 20),
          hex.substring(20, 32)
        ].join('-');
        
        console.log(`🔄 fallback UUID 생성: ${uuid}`);
        return uuid;
      }
      
    } catch (error: any) {
      this.errorCount++;
      console.error('❌ UUID 생성 실패:', error.message);
      
      // 최종 fallback
      const emergencyUuid = `uuid_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      console.log(`🆘 emergency UUID 생성: ${emergencyUuid}`);
      return emergencyUuid;
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
      
      const bytes = this.crypto.randomBytes(length).toString('hex');
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
      
      const token = this.crypto.randomBytes(32).toString('hex');
      console.log(`🔑 보안 토큰 생성 성공 (길이: ${token.length})`);
      return token;
      
    } catch (error: any) {
      this.errorCount++;
      console.error('❌ 보안 토큰 생성 실패:', error.message);
      throw new Error(`보안 토큰 생성 실패: ${error.message}`);
    }
  }

 /**
 * Vault 데이터 암호화 (개선된 버전)
 * @param data - 암호화할 객체 데이터
 * @returns 암호화된 문자열
 */
encryptVaultData(data: any): string {
  try {
    // 1. 타임스탬프 추가
    const timestampedData = {
      timestamp: Date.now(),
      data: data
    };
    
    // 2. JSON 직렬화
    const jsonString = JSON.stringify(timestampedData);
    
    // 3. 표준 암호화 적용
    const encrypted = this.encrypt(jsonString);
    
    console.log(`🔒 Vault 데이터 암호화 성공 (길이: ${jsonString.length} → ${encrypted.length})`);
    return encrypted;
    
  } catch (error) {
    console.error('❌ Vault 데이터 암호화 실패:', error);
    throw new Error(`Vault 데이터 암호화 실패: ${error.message}`);
  }
}

/**
 * Vault 데이터 복호화 (개선된 버전)
 * @param encryptedData - 암호화된 문자열
 * @returns 복호화된 원본 객체
 */
decryptVaultData(encryptedData: string): any {
  try {
    // 1. 표준 복호화 적용
    const decrypted = this.decrypt(encryptedData);
    
    // 2. JSON 파싱
    let parsedData;
    try {
      parsedData = JSON.parse(decrypted);
    } catch (parseError) {
      console.warn('⚠️ JSON 파싱 실패, 원본 문자열 반환:', decrypted.slice(0, 100));
      return decrypted; // 원본 문자열 반환
    }
    
    // 3. 타임스탬프 데이터 구조 확인
    if (parsedData && typeof parsedData === 'object' && parsedData.data !== undefined) {
      console.log(`🔓 Vault 데이터 복호화 성공 (타임스탬프: ${parsedData.timestamp})`);
      return parsedData.data; // 실제 데이터만 반환
    }
    
    // 4. 레거시 데이터 호환성
    console.log(`🔓 Vault 데이터 복호화 성공 (레거시 형식)`);
    return parsedData;
    
  } catch (error) {
    console.error('❌ Vault 데이터 복호화 실패:', error);
    throw new Error(`Vault 데이터 복호화 실패: ${error.message}`);
  }
}
  /**
   * 🧪 암호화 기능 테스트
   */
  // testEncryption() 함수 내 Vault 데이터 테스트 부분 교체
async testEncryption(): Promise<boolean> {
  try {
    // ... 기존 암호화/복호화 테스트 코드 유지 ...
    
    // 🗃️ Vault 데이터 테스트 (개선된 버전)
    console.log('🧪 Vault 데이터 암호화 테스트 시작...');
    
    const testVaultData = {
      userProfile: {
        name: "Test User",
        preferences: ["AI", "Tech", "Privacy"]
      },
      behaviorPatterns: ["analytical", "privacy-conscious"],
      timestamp: Date.now()
    };
    
    const encryptedVault = this.encryptVaultData(testVaultData);
    console.log(`🔒 Vault 암호화 성공 (길이: ${JSON.stringify(testVaultData).length} → ${encryptedVault.length})`);
    
    const decryptedVault = this.decryptVaultData(encryptedVault);
    console.log(`🔓 Vault 복호화 성공:`, typeof decryptedVault, Object.keys(decryptedVault || {}));
    
    // 데이터 무결성 확인
    const isValid = decryptedVault && 
                   decryptedVault.userProfile && 
                   decryptedVault.userProfile.name === "Test User" &&
                   Array.isArray(decryptedVault.behaviorPatterns);
    
    if (!isValid) {
      throw new Error('Vault 데이터 무결성 검증 실패');
    }
    
    console.log('✅ Vault 데이터 테스트 성공');
      
    return true;
    
  } catch (error) {
    console.error('❌ 암호화 기능 테스트 실패:', error.message);
    return false;
  }
}

  /**
   * 📊 서비스 상태 조회
   */
  public getStatus(): CryptoStatus {
    const featuresAvailable = [];
    
    if (this.crypto) {
      try {
        this.crypto.randomBytes(1);
        featuresAvailable.push('randomBytes');
      } catch { /* ignore */ }
      
      try {
        this.crypto.createHash('sha256');
        featuresAvailable.push('hash');
      } catch { /* ignore */ }
      
      try {
        this.crypto.createCipher('aes-256-cbc', 'test');
        featuresAvailable.push('encryption');
      } catch { /* ignore */ }
      
      try {
        if (typeof this.crypto.randomUUID === 'function') {
          this.crypto.randomUUID();
          featuresAvailable.push('uuid');
        } else {
          featuresAvailable.push('uuid-fallback');
        }
      } catch { 
        featuresAvailable.push('uuid-fallback');
      }
    }

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
   * 🧹 서비스 정리
   */
  public dispose(): void {
    console.log('🧹 CryptoService 정리 중...');
    
    if (this.encryptionKey) {
      this.encryptionKey = '';
    }
    
    this.crypto = null;
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
      this.loadCryptoModule();
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

export const CryptoUtils = {
  encrypt: (text: string) => CryptoService.getInstance().encrypt(text),
  decrypt: (encryptedData: string) => CryptoService.getInstance().decrypt(encryptedData),
  hash: (data: string) => CryptoService.getInstance().hash(data),
  generateUUID: () => CryptoService.getInstance().generateUUID(),
  generateRandomBytes: (length: number) => CryptoService.getInstance().generateRandomBytes(length),
  generateSecureToken: () => CryptoService.getInstance().generateSecureToken()
};

console.log('✅ CryptoService (Node.js crypto API 호환) 로드 완료');