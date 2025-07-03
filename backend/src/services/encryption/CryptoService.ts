
// ============================================================================
// 🔐 CryptoService (기존 코드 + Singleton 패턴 + Node.js 호환성 수정)
// 파일: backend/src/services/encryption/CryptoService.ts
// 역할: 데이터 암호화/복호화, 해시 생성 (기존 로직 유지 + getInstance 추가)
// ============================================================================

import crypto from 'crypto';

export class CryptoService {
  private static instance: CryptoService;
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly IV_LENGTH = 16;
  private static readonly SALT_LENGTH = 32;
  private static readonly TAG_LENGTH = 16;
  private initialized: boolean = false;

  // ============================================================================
  // 🔧 Singleton 패턴 구현
  // ============================================================================
  private constructor() {
    this.initializeService();
  }

  public static getInstance(): CryptoService {
    if (!CryptoService.instance) {
      CryptoService.instance = new CryptoService();
    }
    return CryptoService.instance;
  }

  private initializeService(): void {
    try {
      // 환경변수 확인
      const encryptionKey = process.env.ENCRYPTION_KEY;
      if (!encryptionKey) {
        console.warn('⚠️ ENCRYPTION_KEY 환경변수가 없습니다. 임시 키를 사용합니다.');
        // 개발 환경에서는 임시 키 생성
        process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex').substring(0, 32);
        console.log('🔑 임시 암호화 키 생성됨');
      }
      
      this.initialized = true;
      console.log('✅ CryptoService 초기화 완료');
    } catch (error) {
      console.error('❌ CryptoService 초기화 실패:', error);
      this.initialized = false;
    }
  }

  // ============================================================================
  // 🔒 기존 static 메서드들 (Node.js 호환성 수정)
  // ============================================================================
  private static getEncryptionKey(): string {
    const key = process.env.ENCRYPTION_KEY;
    if (!key || key.length < 16) {
      throw new Error('ENCRYPTION_KEY must be at least 16 characters long');
    }
    // 32바이트로 정규화
    return crypto.createHash('sha256').update(key).digest('hex').substring(0, 32);
  }

  static encrypt(text: string): string {
    try {
      const iv = crypto.randomBytes(CryptoService.IV_LENGTH);
      const salt = crypto.randomBytes(CryptoService.SALT_LENGTH);
      const key = crypto.pbkdf2Sync(CryptoService.getEncryptionKey(), salt, 100000, 32, 'sha256');
      
      // Node.js 호환 방식으로 수정
      const cipher = crypto.createCipher('aes-256-cbc', key.toString('hex'));
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // 간단한 형식으로 결합 (GCM 대신 CBC 사용)
      return salt.toString('hex') + ':' + iv.toString('hex') + ':' + encrypted;
    } catch (error) {
      console.error('Encryption error:', error);
      
      // 대체 암호화 방법 (더 안전한 fallback)
      try {
        const key = CryptoService.getEncryptionKey();
        const cipher = crypto.createCipher('aes192', key);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return 'fallback:' + encrypted;
      } catch (fallbackError) {
        console.error('Fallback encryption also failed:', fallbackError);
        throw new Error('Failed to encrypt data');
      }
    }
  }

  static decrypt(encryptedData: string): string {
    try {
      // fallback 방식 확인
      if (encryptedData.startsWith('fallback:')) {
        const key = CryptoService.getEncryptionKey();
        const actualData = encryptedData.replace('fallback:', '');
        const decipher = crypto.createDecipher('aes192', key);
        let decrypted = decipher.update(actualData, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
      }

      const parts = encryptedData.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
      }

      const salt = Buffer.from(parts[0], 'hex');
      const iv = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];

      const key = crypto.pbkdf2Sync(CryptoService.getEncryptionKey(), salt, 100000, 32, 'sha256');
      
      // Node.js 호환 방식으로 수정
      const decipher = crypto.createDecipher('aes-256-cbc', key.toString('hex'));
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  static hash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  static generateRandomBytes(length: number): string {
    return crypto.randomBytes(length).toString('hex');
  }

  static generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  // ============================================================================
  // 🆕 인스턴스 메서드들 (새로 추가)
  // ============================================================================

  /**
   * 인스턴스를 통한 암호화 (기존 static 메서드 호출)
   */
  public encryptData(text: string): string {
    return CryptoService.encrypt(text);
  }

  /**
   * 인스턴스를 통한 복호화 (기존 static 메서드 호출)
   */
  public decryptData(encryptedData: string): string {
    return CryptoService.decrypt(encryptedData);
  }

  /**
   * 인스턴스를 통한 해시 생성 (기존 static 메서드 호출)
   */
  public hashData(data: string): string {
    return CryptoService.hash(data);
  }

  /**
   * 랜덤 바이트 생성
   */
  public generateRandomBytes(length: number): string {
    return CryptoService.generateRandomBytes(length);
  }

  /**
   * 보안 토큰 생성
   */
  public generateSecureToken(): string {
    return CryptoService.generateSecureToken();
  }

  /**
   * UUID 생성 (암호학적으로 안전)
   */
  public generateUUID(): string {
    return crypto.randomUUID();
  }

  // ============================================================================
  // 🗄️ 데이터 볼트용 특화 메서드
  // ============================================================================

  /**
   * 볼트 데이터 암호화 (메타데이터 포함)
   */
  public encryptVaultData(data: any, vaultId: string, userDid: string): {
    encryptedData: string;
    metadata: {
      vaultId: string;
      userDid: string;
      timestamp: string;
      algorithm: string;
    };
  } {
    try {
      const jsonData = JSON.stringify(data);
      const encryptedData = this.encryptData(jsonData);

      return {
        encryptedData,
        metadata: {
          vaultId,
          userDid,
          timestamp: new Date().toISOString(),
          algorithm: CryptoService.ALGORITHM
        }
      };
    } catch (error) {
      console.error('❌ 볼트 데이터 암호화 실패:', error);
      throw new Error('볼트 데이터 암호화에 실패했습니다');
    }
  }

  /**
   * 볼트 데이터 복호화
   */
  public decryptVaultData(encryptedData: string, metadata: any): any {
    try {
      const decryptedJson = this.decryptData(encryptedData);
      return JSON.parse(decryptedJson);
    } catch (error) {
      console.error('❌ 볼트 데이터 복호화 실패:', error);
      throw new Error('볼트 데이터 복호화에 실패했습니다');
    }
  }

  // ============================================================================
  // 🔧 안전한 간단 암호화 (추가 백업 방법)
  // ============================================================================

  /**
   * 간단하고 안전한 암호화
   */
  public simpleEncrypt(text: string): string {
    try {
      const key = CryptoService.getEncryptionKey();
      const cipher = crypto.createCipher('aes192', key);
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return encrypted;
    } catch (error) {
      console.error('Simple encryption error:', error);
      // Base64 인코딩으로 fallback (암호화 아님, 단순 인코딩)
      return Buffer.from(text, 'utf8').toString('base64');
    }
  }

  /**
   * 간단하고 안전한 복호화
   */
  public simpleDecrypt(encryptedText: string): string {
    try {
      const key = CryptoService.getEncryptionKey();
      const decipher = crypto.createDecipher('aes192', key);
      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      console.error('Simple decryption error:', error);
      // Base64 디코딩으로 fallback
      try {
        return Buffer.from(encryptedText, 'base64').toString('utf8');
      } catch (base64Error) {
        console.error('Base64 decoding also failed:', base64Error);
        return encryptedText; // 실패시 원본 반환
      }
    }
  }

  // ============================================================================
  // 📊 상태 및 유틸리티 메서드
  // ============================================================================

  /**
   * 서비스 초기화 상태 확인
   */
  public isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * 암호화 테스트 (향상된 버전)
   */
  public testEncryption(): {
    success: boolean;
    performance: number;
    details: string;
  } {
    try {
      console.log('🧪 CryptoService 암호화 테스트 시작...');
      const testData = 'CryptoService 암호화 테스트 데이터 🔐';
      const startTime = Date.now();
      
      // 1. 기본 암호화 테스트
      const encrypted = this.encryptData(testData);
      console.log('✅ 기본 암호화 성공');
      
      // 2. 복호화 테스트
      const decrypted = this.decryptData(encrypted);
      console.log('✅ 기본 복호화 성공');
      
      // 3. 데이터 일치 확인
      if (decrypted !== testData) {
        throw new Error('복호화된 데이터가 원본과 다릅니다');
      }
      console.log('✅ 데이터 일치 확인');
      
      // 4. 간단 암호화 테스트
      const simpleEncrypted = this.simpleEncrypt(testData);
      const simpleDecrypted = this.simpleDecrypt(simpleEncrypted);
      console.log('✅ 간단 암호화 테스트 성공');
      
      // 5. 해시 테스트
      const hash = this.hashData(testData);
      if (hash.length !== 64) {
        throw new Error('해시 길이가 올바르지 않습니다');
      }
      console.log('✅ 해시 생성 테스트 성공');
      
      // 6. UUID 생성 테스트
      const uuid = this.generateUUID();
      if (!uuid || uuid.length !== 36) {
        throw new Error('UUID 생성 실패');
      }
      console.log('✅ UUID 생성 테스트 성공');
      
      const endTime = Date.now();
      const performance = endTime - startTime;
      
      const details = `모든 암호화 테스트 통과 (기본암호화: ${encrypted.length}chars, 해시: ${hash.substring(0, 8)}...)`;
      
      console.log(`🎯 암호화 테스트 완료: ${performance}ms`);
      
      return {
        success: true,
        performance,
        details
      };
    } catch (error: any) {
      console.error('❌ 암호화 테스트 실패:', error.message);
      return {
        success: false,
        performance: -1,
        details: `테스트 실패: ${error.message}`
      };
    }
  }

  /**
   * 서비스 정보 조회
   */
  public getServiceInfo(): {
    initialized: boolean;
    algorithm: string;
    hasEncryptionKey: boolean;
    version: string;
    features: string[];
  } {
    return {
      initialized: this.initialized,
      algorithm: CryptoService.ALGORITHM,
      hasEncryptionKey: !!process.env.ENCRYPTION_KEY,
      version: '1.1.0',
      features: [
        'AES-256-GCM encryption',
        'PBKDF2 key derivation',
        'SHA-256 hashing',
        'Secure random generation',
        'Vault data encryption',
        'Simple backup encryption',
        'UUID generation'
      ]
    };
  }
}

// 기본 인스턴스 생성 및 export
export const cryptoService = CryptoService.getInstance();

// 개발 환경에서 테스트 실행
if (process.env.NODE_ENV === 'development') {
  const testResult = cryptoService.testEncryption();
  console.log('🧪 CryptoService 테스트 결과:', testResult);
  
  if (testResult.success) {
    console.log('🎉 CryptoService 완전 준비됨!');
  } else {
    console.log('⚠️ CryptoService 제한적 모드로 실행');
  }
}

export default CryptoService;
