//  // CueService 모듈은 CUE 토큰의 마이닝, 잔액 조회, 거래 기록 등을 처리합니다.
//  // 이 모듈은 데이터베이스와 상호작용하여 CUE 토큰의 상태를 관리합니다.
//  // ============================================================================
//  import { DatabaseService } from '../database/DatabaseService';
//
//  import { CueTransaction } from '../../models/CueTransaction';
//  import { CueMiningActivity } from '../../models/CueMiningActivity';
//  import { CueBalance } from '../../models/CueBalance';
//  import { CueMiningReward } from '../../models/CueMiningReward';
//  import { CueTransactionType } from '../../models/CueTransactionType';
//  import { CueMiningSource } from '../../models/CueMiningSource';
//  import { CueMiningStatus } from '../../models/CueMiningStatus';
//  import { CueMiningError } from '../../models/CueMiningError';
//  import { CueMiningResult } from '../../models/CueMiningResult';
//  import { CueMiningOptions } from '../../models/CueMiningOptions';
//  import { CueMiningResponse } from '../../models/CueMiningResponse';
//  import { CueMiningErrorResponse } from '../../models/CueMiningErrorResponse';
//  import { CueMiningSuccessResponse } from '../../models/CueMiningSuccessResponse';
//  import { CueMiningActivityType } from '../../models/CueMiningActivityType';
//  import { CueMiningActivityStatus } from '../../models/CueMiningActivityStatus';
//  import { CueMiningActivityError } from '../../models/CueMiningActivityError';
//  import { CueMiningActivityResult } from '../../models/CueMiningActivityResult';
//  import { CueMiningActivityOptions } from '../../models/CueMiningActivityOptions';
//  import { CueMiningActivityResponse } from '../../models/CueMiningActivityResponse';     
import crypto from 'crypto';

export class CryptoService {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly IV_LENGTH = 16;
  private static readonly SALT_LENGTH = 32;
  private static readonly TAG_LENGTH = 16;

  private static getEncryptionKey(): string {
    const key = process.env.ENCRYPTION_KEY;
    if (!key || key.length !== 32) {
      throw new Error('ENCRYPTION_KEY must be 32 characters long');
    }
    return key;
  }

  static encrypt(text: string): string {
    try {
      const iv = crypto.randomBytes(CryptoService.IV_LENGTH);
      const salt = crypto.randomBytes(CryptoService.SALT_LENGTH);
      const key = crypto.pbkdf2Sync(CryptoService.getEncryptionKey(), salt, 100000, 32, 'sha256');
      
      const cipher = crypto.createCipherGCM(CryptoService.ALGORITHM, key, iv);
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      // 결합: salt + iv + authTag + encrypted
      return salt.toString('hex') + ':' + iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  static decrypt(encryptedData: string): string {
    try {
      const parts = encryptedData.split(':');
      if (parts.length !== 4) {
        throw new Error('Invalid encrypted data format');
      }

      const salt = Buffer.from(parts[0], 'hex');
      const iv = Buffer.from(parts[1], 'hex');
      const authTag = Buffer.from(parts[2], 'hex');
      const encrypted = parts[3];

      const key = crypto.pbkdf2Sync(CryptoService.getEncryptionKey(), salt, 100000, 32, 'sha256');
      
      const decipher = crypto.createDecipherGCM(CryptoService.ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);
      
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
}
