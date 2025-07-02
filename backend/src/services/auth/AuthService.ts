// ============================================================================
// 🔐 인증 서비스 - 사용자 인증 비즈니스 로직
// 파일: backend/src/services/auth/AuthService.ts
// 역할: 사용자 인증, 데이터베이스 연동, 비즈니스 로직 처리
// ============================================================================

import { DatabaseService } from '../database/DatabaseService';
import crypto from 'crypto';
import { User, CreateUserData } from '../../types/auth.types';

export class AuthService {
  private dbService: DatabaseService;

  constructor() {
    this.dbService = DatabaseService.getInstance();
  }

  // ============================================================================
  // 👤 사용자 관리
  // ============================================================================

  /**
   * 새로운 사용자 생성
   */
  async createUser(userData: CreateUserData): Promise<User> {
    try {
      console.log('👤 새 사용자 생성:', userData.username || userData.email);
      
      const user = await this.dbService.createUser({
        ...userData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      console.log('✅ 사용자 생성 성공:', user.id);
      return user;
    } catch (error) {
      console.error('❌ 사용자 생성 실패:', error);
      throw new Error('사용자 생성에 실패했습니다');
    }
  }

  /**
   * 사용자 ID로 조회
   */
  async findUserById(userId: string): Promise<User | null> {
    try {
      const user = await this.dbService.findUserById(userId);
      return user;
    } catch (error) {
      console.error('❌ 사용자 ID 조회 실패:', error);
      return null;
    }
  }

  /**
   * 이메일로 사용자 조회
   */
  async findUserByEmail(email: string): Promise<User | null> {
    try {
      // DatabaseService에 findUserByEmail 메서드가 있는지 확인
      if (typeof this.dbService.findUserByEmail === 'function') {
        return await this.dbService.findUserByEmail(email);
      }
      
      // 없다면 getUserByUsername으로 대체 (이메일도 처리)
      return await this.dbService.getUserByUsername(email);
    } catch (error) {
      console.error('❌ 사용자 이메일 조회 실패:', error);
      return null;
    }
  }

  /**
   * 사용자명으로 사용자 조회
   */
  async findUserByUsername(username: string): Promise<User | null> {
    try {
      return await this.dbService.getUserByUsername(username);
    } catch (error) {
      console.error('❌ 사용자명 조회 실패:', error);
      return null;
    }
  }

  /**
   * Credential ID로 사용자 찾기
   */
  async findUserByCredentialId(credentialId: string): Promise<User | null> {
    try {
      return await this.dbService.findUserByCredentialId(credentialId);
    } catch (error) {
      console.error('❌ Credential ID로 사용자 조회 실패:', error);
      return null;
    }
  }

  /**
   * 사용자 정보 업데이트
   */
  async updateUser(userId: string, updates: Partial<User>): Promise<User | null> {
    try {
      const updatedUser = await this.dbService.updateUser(userId, {
        ...updates,
        updated_at: new Date().toISOString()
      });
      
      console.log('✅ 사용자 업데이트 성공:', userId);
      return updatedUser;
    } catch (error) {
      console.error('❌ 사용자 업데이트 실패:', error);
      return null;
    }
  }

  // ============================================================================
  // 🔑 WebAuthn Credential 관리
  // ============================================================================

  /**
   * WebAuthn 자격증명 저장
   */
  async saveWebAuthnCredential(credData: {
    user_id: string;
    credential_id: string;
    public_key: string;
    counter: number;
    device_type: string;
    user_agent: string;
    device_fingerprint?: any;
  }): Promise<boolean> {
    try {
      await this.dbService.saveWebAuthnCredential(credData);
      console.log('✅ WebAuthn 자격증명 저장 성공:', credData.credential_id);
      return true;
    } catch (error) {
      console.error('❌ WebAuthn 자격증명 저장 실패:', error);
      return false;
    }
  }

  /**
   * 자격증명 마지막 사용 시간 업데이트
   */
  async updateCredentialLastUsed(credentialId: string): Promise<void> {
    try {
      await this.dbService.updateCredentialLastUsed(credentialId);
      console.log('✅ 자격증명 사용 시간 업데이트:', credentialId);
    } catch (error) {
      console.error('❌ 자격증명 사용 시간 업데이트 실패:', error);
    }
  }

  // ============================================================================
  // 🎫 패스포트 관리
  // ============================================================================

  /**
   * AI 패스포트 조회
   */
  async getPassport(did: string): Promise<any> {
    try {
      return await this.dbService.getPassport(did);
    } catch (error) {
      console.error('❌ 패스포트 조회 실패:', error);
      return null;
    }
  }

  /**
   * AI 패스포트 업데이트
   */
  async updatePassport(did: string, updates: any): Promise<any> {
    try {
      return await this.dbService.updatePassport(did, updates);
    } catch (error) {
      console.error('❌ 패스포트 업데이트 실패:', error);
      return null;
    }
  }

  // ============================================================================
  // 💰 CUE 토큰 관리
  // ============================================================================

  /**
   * CUE 잔액 조회
   */
  async getCUEBalance(userDid: string): Promise<number> {
    try {
      return await this.dbService.getCUEBalance(userDid);
    } catch (error) {
      console.error('❌ CUE 잔액 조회 실패:', error);
      return 0;
    }
  }

  /**
   * CUE 거래 생성
   */
  async createCUETransaction(transactionData: {
    user_did: string;
    transaction_type: 'mining' | 'spending' | 'reward' | 'transfer';
    amount: number;
    status: 'pending' | 'completed' | 'failed';
    source?: string;
    description?: string;
    metadata?: any;
  }): Promise<any> {
    try {
      return await this.dbService.createCUETransaction(transactionData);
    } catch (error) {
      console.error('❌ CUE 거래 생성 실패:', error);
      return null;
    }
  }

  /**
   * 웰컴 CUE 지급
   */
  async grantWelcomeCUE(userDid: string): Promise<boolean> {
    try {
      await this.createCUETransaction({
        user_did: userDid,
        transaction_type: 'reward',
        amount: 100,
        status: 'completed',
        source: 'welcome_bonus',
        description: '가입 축하 CUE 지급',
        metadata: {
          type: 'welcome_bonus',
          granted_at: new Date().toISOString()
        }
      });
      
      console.log('🎉 웰컴 CUE 지급 완료:', userDid);
      return true;
    } catch (error) {
      console.error('❌ 웰컴 CUE 지급 실패:', error);
      return false;
    }
  }

  // ============================================================================
  // 🛠️ 유틸리티 메서드
  // ============================================================================

  /**
   * 사용자 응답 포맷팅
   */
  formatUserResponse(user: User): any {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      did: user.did,
      wallet_address: user.wallet_address,
      display_name: user.display_name,
      trust_score: user.trust_score || 75,
      passport_level: user.passport_level || 'Basic',
      biometric_verified: user.biometric_verified || false,
      passkey_registered: user.passkey_registered || false,
      cue_balance: user.cue_tokens || 0,
      created_at: user.created_at,
      last_login_at: user.last_login_at
    };
  }

  /**
   * DID 생성
   */
  generateDID(userId: string): string {
    return `did:ai-personal:${userId}`;
  }

  /**
   * 지갑 주소 생성
   */
  generateWalletAddress(): string {
    return `0x${crypto.randomBytes(20).toString('hex')}`;
  }

  /**
   * 사용자 통계 조회
   */
  async getUserStats(userId: string): Promise<any> {
    try {
      const user = await this.findUserById(userId);
      if (!user) return null;

      const cueBalance = await this.getCUEBalance(user.did);
      
      return {
        userId: user.id,
        username: user.username,
        did: user.did,
        trustScore: user.trust_score || 75,
        passportLevel: user.passport_level || 'Basic',
        cueBalance,
        biometricVerified: user.biometric_verified || false,
        passkeyRegistered: user.passkey_registered || false,
        loginCount: user.login_count || 0,
        lastLoginAt: user.last_login_at,
        createdAt: user.created_at
      };
    } catch (error) {
      console.error('❌ 사용자 통계 조회 실패:', error);
      return null;
    }
  }

  /**
   * 인증 시스템 상태 확인
   */
  async getAuthSystemStatus(): Promise<any> {
    try {
      const dbStatus = await this.dbService.getStatus();
      
      return {
        database: {
          connected: dbStatus.connected,
          type: dbStatus.type,
          lastCheck: new Date().toISOString()
        },
        services: {
          auth: true,
          webauthn: true,
          session: true,
          cue: true
        },
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ 인증 시스템 상태 확인 실패:', error);
      return {
        database: { connected: false, error: error.message },
        services: { auth: false },
        timestamp: new Date().toISOString()
      };
    }
  }
}