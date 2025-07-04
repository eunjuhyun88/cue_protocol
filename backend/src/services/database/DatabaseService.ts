// ============================================================================
// 🗄️ 완전 통합 데이터베이스 서비스 (최종 완성판)
// 경로: backend/src/services/database/DatabaseService.ts
// 용도: Supabase 중심의 완전한 데이터베이스 서비스 (Mock 제거, 모든 기능 포함)
// 개선: 1번 기준 + 2,3번 유용 기능 통합, Mock 완전 제거, 최적화
// 호출구조: DIContainer → DatabaseService → Supabase
// ============================================================================
import dotenv from 'dotenv';
import path from 'path';

// 환경 변수 강제 로딩
dotenv.config({ path: path.join(__dirname, '../../../.env') });

// 환경 변수 즉시 확인
console.log('🔧 DatabaseService 환경변수 로딩 상태:');
console.log('- SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ 설정됨' : '❌ 누락');
console.log('- SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ 설정됨' : '❌ 누락');


import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../types/database.types';

export class DatabaseService {
  private static instance: DatabaseService;
  private supabase: SupabaseClient<Database>;
  private connected: boolean = false;
  private connectionAttempts: number = 0;
  private maxRetries: number = 3;
  private connectionError: string | null = null;

  private constructor() {
    console.log('🗄️ DatabaseService 초기화 중...');
    this.initializeSupabase();
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  // ============================================================================
  // 🔧 Supabase 초기화 (2번에서 추가된 강화된 검증)
  // ============================================================================

  private initializeSupabase(): void {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    console.log('🔑 환경변수 확인:', {
      SUPABASE_URL: supabaseUrl ? '✅ 설정됨' : '❌ 누락',
      SUPABASE_SERVICE_ROLE_KEY: supabaseKey ? '✅ 설정됨' : '❌ 누락'
    });

    if (!supabaseUrl || !supabaseKey) {
      this.connectionError = `필수 환경변수 누락: URL=${!!supabaseUrl}, KEY=${!!supabaseKey}`;
      console.error(`❌ ${this.connectionError}`);
      throw new Error(this.connectionError);
    }

    if (supabaseUrl.includes('dummy') || supabaseKey.includes('dummy')) {
      this.connectionError = 'Dummy 환경변수가 설정되어 있습니다. 실제 Supabase 설정이 필요합니다.';
      console.error(`❌ ${this.connectionError}`);
      throw new Error(this.connectionError);
    }

    try {
      this.supabase = createClient<Database>(supabaseUrl, supabaseKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: false
        },
        db: {
          schema: 'public'
        },
        realtime: {
          params: {
            eventsPerSecond: 10
          }
        }
      });

      console.log('✅ Supabase 클라이언트 생성 완료');
      console.log('📍 연결 대상:', supabaseUrl.split('//')[1]?.split('.')[0]);
      
      // 즉시 연결 시도
      this.connect().catch(error => {
        console.error('❌ 초기 연결 실패:', error);
      });
    } catch (error) {
      this.connectionError = `Supabase 클라이언트 생성 실패: ${error}`;
      console.error(`❌ ${this.connectionError}`);
      throw error;
    }
  }

  // ============================================================================
  // 🔌 연결 관리 (Retry 로직 + 필수 테이블 확인)
  // ============================================================================

  public async connect(): Promise<void> {
    console.log('🔗 데이터베이스 연결 테스트 시작');
    
    try {
      this.connectionAttempts++;
      
      // 기본 연결 테스트
      const { data, error } = await this.supabase
        .from('users')
        .select('count', { count: 'exact', head: true });

      if (error && !error.message.includes('relation') && error.code !== 'PGRST116') {
        throw error;
      }

      // 필수 테이블 존재 확인 (2번에서 추가)
      await this.checkRequiredTables();

      this.connected = true;
      this.connectionError = null;
      this.connectionAttempts = 0;
      console.log('✅ 데이터베이스 연결 성공');
    } catch (error) {
      this.connected = false;
      this.connectionError = `데이터베이스 연결 실패: ${error}`;
      console.error(`❌ 연결 실패 (${this.connectionAttempts}/${this.maxRetries}):`, error);
      
      if (this.connectionAttempts < this.maxRetries) {
        console.log(`🔄 ${2000 * this.connectionAttempts}ms 후 재시도...`);
        await new Promise(resolve => setTimeout(resolve, 2000 * this.connectionAttempts));
        return this.connect();
      }
      
      throw new Error(`데이터베이스 연결 실패: ${this.maxRetries}회 시도 후 포기`);
    }
  }

  /**
   * 필수 테이블 존재 확인 (2번에서 추가)
   */
  private async checkRequiredTables(): Promise<void> {
    const requiredTables = [
      'users', 'ai_passports', 'cue_transactions', 
      'data_vaults', 'vault_data', 'personal_cues',
      'messages', 'conversations', 'webauthn_credentials',
      'webauthn_sessions', 'webauthn_challenges',
      'connected_platforms', 'ai_agents', 'system_activities'
    ];

    console.log('📋 필수 테이블 확인 중...');

    for (const tableName of requiredTables) {
      try {
        const { error } = await this.supabase
          .from(tableName)
          .select('*')
          .limit(1);

        if (error && error.code !== 'PGRST116') {
          console.warn(`⚠️ 테이블 '${tableName}' 접근 불가: ${error.message}`);
        } else {
          console.log(`✅ ${tableName}`);
        }
      } catch (error) {
        console.warn(`⚠️ ${tableName}: ${error}`);
      }
    }

    console.log('🎯 필수 테이블 확인 완료');
  }

  public async disconnect(): Promise<void> {
    this.connected = false;
    console.log('🔌 데이터베이스 연결 해제');
  }

  public isConnected(): boolean {
    return this.connected;
  }

  public isMockMode(): boolean {
    return false; // Mock 완전 제거
  }

  public async testConnection(): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('users')
        .select('count')
        .limit(1);
      return !error;
    } catch {
      return false;
    }
  }

  public async healthCheck(): Promise<boolean> {
    return this.testConnection();
  }

  /**
   * Supabase 클라이언트 반환 (2번에서 추가)
   */
  public getClient(): SupabaseClient<Database> {
    if (!this.connected) {
      throw new Error('데이터베이스가 연결되지 않았습니다. connect()를 먼저 호출하세요.');
    }
    return this.supabase;
  }

  public getConnectionInfo(): any {
    return {
      type: 'supabase',
      connected: this.connected,
      url: process.env.SUPABASE_URL?.split('//')[1]?.split('.')[0],
      timestamp: new Date().toISOString(),
      connectionAttempts: this.connectionAttempts,
      error: this.connectionError || undefined
    };
  }

  // ============================================================================
  // 👤 사용자 관리 (기존 1번 + 개선)
  // ============================================================================

  public async createUser(userData: any): Promise<any> {
    if (!this.connected) {
      throw new Error('데이터베이스 연결이 필요합니다.');
    }

    console.log('👤 사용자 생성:', {
      username: userData.username,
      email: userData.email,
      did: userData.did
    });

    try {
      const { data, error } = await this.supabase
        .from('users')
        .insert([{
          ...userData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        console.error('❌ 사용자 생성 실패:', error);
        throw error;
      }

      console.log('✅ 사용자 생성 성공:', data.id);
      return data;
    } catch (error) {
      console.error('💥 사용자 생성 오류:', error);
      throw error;
    }
  }

  public async getUserById(userId: string): Promise<any | null> {
    if (!this.connected) {
      console.warn('⚠️ 데이터베이스 미연결 - null 반환');
      return null;
    }

    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error(`❌ 사용자 ID 조회 실패 (${userId}):`, error);
        return null;
      }

      return data;
    } catch (error) {
      console.error(`💥 사용자 ID 조회 오류 (${userId}):`, error);
      return null;
    }
  }

  public async getUserByEmail(email: string): Promise<any | null> {
    if (!email) return null;
    
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      console.error('❌ 사용자 이메일 조회 실패:', error);
      return null;
    }
  }

  public async getUserByDID(did: string): Promise<any | null> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('did', did)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      console.error('❌ 사용자 DID 조회 실패:', error);
      return null;
    }
  }

  public async getUserByUsername(username: string): Promise<any | null> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .or(`username.eq.${username},email.eq.${username}`)
        .eq('deleted_at', null)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      console.error('❌ 사용자 이름 조회 실패:', error);
      return null;
    }
  }

  public async updateUser(id: string, updates: any): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      console.log('✅ 사용자 업데이트 성공:', id);
      return data;
    } catch (error) {
      console.error('❌ 사용자 업데이트 실패:', error);
      throw error;
    }
  }

  // 호환성 별칭들
  public async findUserById(userId: string): Promise<any | null> {
    return this.getUserById(userId);
  }

  public async findUserByEmail(email: string): Promise<any | null> {
    return this.getUserByEmail(email);
  }

  // ============================================================================
  // 🔐 WebAuthn 자격증명 관리 (기존 1번 + 추가 기능)
  // ============================================================================

  public async saveWebAuthnCredential(credentialData: any): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('webauthn_credentials')
        .insert([{
          ...credentialData,
          created_at: new Date().toISOString(),
          last_used_at: new Date().toISOString()
        }]);

      if (error) {
        console.error('❌ WebAuthn 저장 실패:', error);
        return false;
      }
      
      console.log('✅ WebAuthn 자격증명 저장 성공');
      return true;
    } catch (error) {
      console.error('❌ WebAuthn 저장 실패:', error);
      return false;
    }
  }

  public async getUserByCredentialId(credentialId: string): Promise<any | null> {
    try {
      const { data, error } = await this.supabase
        .from('webauthn_credentials')
        .select(`
          *,
          users!inner(*)
        `)
        .eq('credential_id', credentialId)
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('❌ 자격증명 ID로 사용자 조회 실패:', error);
        return null;
      }
      
      return data?.users || null;
    } catch (error) {
      console.error('❌ 자격증명 조회 실패:', error);
      return null;
    }
  }

  public async getWebAuthnCredentials(userId: string): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('webauthn_credentials')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ WebAuthn 자격증명 목록 조회 실패:', error);
      return [];
    }
  }

  public async getWebAuthnCredentialById(credentialId: string): Promise<any | null> {
    try {
      const { data, error } = await this.supabase
        .from('webauthn_credentials')
        .select('*')
        .eq('credential_id', credentialId)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      console.error('❌ WebAuthn 자격증명 조회 실패:', error);
      return null;
    }
  }

  public async updateWebAuthnCredentialCounter(credentialId: string, counter: number): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('webauthn_credentials')
        .update({
          counter: counter,
          last_used_at: new Date().toISOString()
        })
        .eq('credential_id', credentialId);

      if (error) {
        console.error('❌ WebAuthn 카운터 업데이트 실패:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('❌ WebAuthn 카운터 업데이트 실패:', error);
      return false;
    }
  }

  // ============================================================================
  // 📊 WebAuthn 세션 관리 (기존 1번)
  // ============================================================================

  public async createWebAuthnSession(sessionData: any): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('webauthn_sessions')
        .insert([{
          ...sessionData,
          created_at: new Date().toISOString(),
          last_activity_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      
      console.log('✅ WebAuthn 세션 생성 성공');
      return data;
    } catch (error) {
      console.error('❌ WebAuthn 세션 생성 실패:', error);
      throw error;
    }
  }

  public async getActiveWebAuthnSessions(userId: string): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('webauthn_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .order('last_activity_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ 활성 세션 조회 실패:', error);
      return [];
    }
  }

  public async createWebAuthnChallenge(challengeData: any): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('webauthn_challenges')
        .insert([{
          ...challengeData,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ WebAuthn 챌린지 생성 실패:', error);
      throw error;
    }
  }

  public async getWebAuthnChallenge(challenge: string): Promise<any | null> {
    try {
      const { data, error } = await this.supabase
        .from('webauthn_challenges')
        .select('*')
        .eq('challenge', challenge)
        .eq('is_used', false)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      console.error('❌ WebAuthn 챌린지 조회 실패:', error);
      return null;
    }
  }

  public async markChallengeAsUsed(challengeId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('webauthn_challenges')
        .update({
          is_used: true,
          used_at: new Date().toISOString()
        })
        .eq('id', challengeId);

      return !error;
    } catch (error) {
      console.error('❌ 챌린지 사용 처리 실패:', error);
      return false;
    }
  }

  // ============================================================================
  // 🎫 AI Passport 관리 (기존 1번 + 추가 기능)
  // ============================================================================

  public async getPassport(did: string): Promise<any | null> {
    try {
      const { data, error } = await this.supabase
        .from('ai_passports')
        .select('*')
        .eq('did', did)
        .single();

      if (error && error.code !== 'PGRST116') return null;
      return data;
    } catch (error) {
      console.error('❌ AI Passport 조회 실패:', error);
      return null;
    }
  }

  public async updatePassport(did: string, updates: any): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('ai_passports')
        .upsert({
          did,
          ...updates,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      
      console.log('✅ AI Passport 업데이트 성공:', did);
      return data;
    } catch (error) {
      console.error('❌ AI Passport 업데이트 실패:', error);
      throw error;
    }
  }

  public async createPassport(passportData: any): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('ai_passports')
        .insert([{
          ...passportData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      
      console.log('✅ AI Passport 생성 성공');
      return data;
    } catch (error) {
      console.error('❌ AI Passport 생성 실패:', error);
      throw error;
    }
  }

  // ============================================================================
  // 💎 CUE 토큰 관리 (기존 1번 + 개선)
  // ============================================================================

  public async getCUEBalance(userDid: string): Promise<number> {
    try {
      const { data, error } = await this.supabase
        .from('cue_transactions')
        .select('amount')
        .eq('user_did', userDid)
        .eq('status', 'completed');

      if (error) {
        console.error('❌ CUE 잔액 조회 실패:', error);
        return 0;
      }
      
      const balance = data?.reduce((sum, tx) => sum + parseFloat(tx.amount.toString()), 0) || 0;
      return Math.max(0, Math.round(balance * 100) / 100); // 음수 방지 + 소수점 정리
    } catch (error) {
      console.error('❌ CUE 잔액 계산 실패:', error);
      return 0;
    }
  }

  public async createCUETransaction(transaction: any): Promise<any> {
    try {
      // 현재 잔액 계산
      const currentBalance = await this.getCUEBalance(transaction.user_did);
      const newBalance = currentBalance + parseFloat(transaction.amount.toString());

      const { data, error } = await this.supabase
        .from('cue_transactions')
        .insert([{
          ...transaction,
          balance_after: newBalance,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      
      console.log('✅ CUE 거래 생성 성공:', transaction.amount);
      return data;
    } catch (error) {
      console.error('❌ CUE 거래 생성 실패:', error);
      throw error;
    }
  }

  public async getCUETransactions(userDid: string, limit = 50): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('cue_transactions')
        .select('*')
        .eq('user_did', userDid)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ CUE 거래 내역 조회 실패:', error);
      return [];
    }
  }

  // 호환성 별칭
  public async recordCueTransaction(transactionData: any): Promise<any> {
    return this.createCUETransaction(transactionData);
  }

  // ============================================================================
  // 🗄️ 데이터 볼트 관리 (기존 1번 + 3번 추가 기능)
  // ============================================================================

  public async getDataVaults(userDid: string): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('data_vaults')
        .select('*')
        .eq('owner_did', userDid)
        .eq('status', 'active')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ 데이터 볼트 조회 실패:', error);
      return [];
    }
  }

  public async getUserVaults(userId: string): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('data_vaults')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ 사용자 볼트 조회 실패:', error);
      return [];
    }
  }

  public async getVaultById(vaultId: string): Promise<any | null> {
    try {
      const { data, error } = await this.supabase
        .from('data_vaults')
        .select('*')
        .eq('id', vaultId)
        .eq('status', 'active')
        .single();

      if (error && error.code !== 'PGRST116') return null;
      return data;
    } catch (error) {
      console.error('❌ 볼트 ID 조회 실패:', error);
      return null;
    }
  }

  public async createVault(vaultData: any): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('data_vaults')
        .insert([{
          ...vaultData,
          data_count: 0,
          total_size: 0,
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      
      console.log('✅ 데이터 볼트 생성 성공:', vaultData.name);
      return data;
    } catch (error) {
      console.error('❌ 데이터 볼트 생성 실패:', error);
      throw error;
    }
  }

  public async updateVault(vaultId: string, updates: any): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('data_vaults')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', vaultId)
        .select()
        .single();

      if (error) throw error;
      
      console.log('✅ 데이터 볼트 업데이트 성공');
      return data;
    } catch (error) {
      console.error('❌ 데이터 볼트 업데이트 실패:', error);
      throw error;
    }
  }

  public async deleteVault(vaultId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('data_vaults')
        .update({
          status: 'deleted',
          updated_at: new Date().toISOString()
        })
        .eq('id', vaultId);

      if (error) {
        console.error('❌ 데이터 볼트 삭제 실패:', error);
        return false;
      }
      
      console.log('✅ 데이터 볼트 삭제 성공');
      return true;
    } catch (error) {
      console.error('❌ 데이터 볼트 삭제 실패:', error);
      return false;
    }
  }

  public async saveVaultData(vaultData: any): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('vault_data')
        .insert([{
          ...vaultData,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      
      // 볼트 통계 업데이트
      await this.updateVaultStats(vaultData.vault_id);
      
      console.log('✅ 볼트 데이터 저장 성공');
      return data;
    } catch (error) {
      console.error('❌ 볼트 데이터 저장 실패:', error);
      throw error;
    }
  }

  public async getVaultData(vaultId: string, limit: number = 50): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('vault_data')
        .select('*')
        .eq('vault_id', vaultId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ 볼트 데이터 조회 실패:', error);
      return [];
    }
  }

  /**
   * 볼트 통계 업데이트 (3번에서 추가)
   */
  private async updateVaultStats(vaultId: string): Promise<void> {
    try {
      const { data, error } = await this.supabase
        .from('vault_data')
        .select('id, metadata')
        .eq('vault_id', vaultId);

      if (error) throw error;

      const dataCount = data?.length || 0;
      const totalSize = data?.reduce((sum, item) => {
        return sum + (item.metadata?.size || 0);
      }, 0) || 0;

      await this.supabase
        .from('data_vaults')
        .update({
          data_count: dataCount,
          total_size: totalSize,
          updated_at: new Date().toISOString(),
          last_accessed_at: new Date().toISOString()
        })
        .eq('id', vaultId);

    } catch (error) {
      console.error('❌ 볼트 통계 업데이트 실패:', error);
    }
  }

  /**
   * 사용자 볼트 통계 조회 (3번에서 추가)
   */
  public async getUserVaultStats(userId: string): Promise<{
    totalVaults: number;
    totalDataCount: number;
    totalSize: number;
    lastActivity: string | null;
  }> {
    try {
      const { data, error } = await this.supabase
        .from('data_vaults')
        .select('data_count, total_size, last_accessed_at')
        .eq('user_id', userId)
        .eq('status', 'active');

      if (error) throw error;

      const stats = {
        totalVaults: data?.length || 0,
        totalDataCount: data?.reduce((sum, vault) => sum + (vault.data_count || 0), 0) || 0,
        totalSize: data?.reduce((sum, vault) => sum + (vault.total_size || 0), 0) || 0,
        lastActivity: data?.reduce((latest, vault) => {
          const vaultActivity = vault.last_accessed_at;
          return vaultActivity && (!latest || vaultActivity > latest) ? vaultActivity : latest;
        }, null as string | null)
      };

      return stats;
    } catch (error) {
      console.error('❌ 사용자 볼트 통계 조회 실패:', error);
      return {
        totalVaults: 0,
        totalDataCount: 0,
        totalSize: 0,
        lastActivity: null
      };
    }
  }

  // ============================================================================
  // 🧠 Personal CUE 관리 (기존 1번 + 3번 추가 기능)
  // ============================================================================

  public async getPersonalCues(userDid: string, limit = 50): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('personal_cues')
        .select('*')
        .or(`user_did.eq.${userDid},user_id.eq.${userDid}`)
        .eq('status', 'active')
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ Personal CUE 조회 실패:', error);
      return [];
    }
  }

  public async storePersonalCue(cueData: any): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('personal_cues')
        .insert([{
          ...cueData,
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      
      console.log('✅ Personal CUE 저장 성공:', cueData.cue_key);
      return data;
    } catch (error) {
      console.error('❌ Personal CUE 저장 실패:', error);
      throw error;
    }
  }

  public async getPersonalCue(userDid: string, cueKey: string, cueType: string): Promise<any | null> {
    try {
      const { data, error } = await this.supabase
        .from('personal_cues')
        .select('*')
        .or(`user_did.eq.${userDid},user_id.eq.${userDid}`)
        .eq('cue_key', cueKey)
        .eq('cue_type', cueType)
        .eq('status', 'active')
        .single();

      if (error && error.code !== 'PGRST116') return null;
      return data;
    } catch (error) {
      console.error('❌ Personal CUE 단일 조회 실패:', error);
      return null;
    }
  }

  public async searchPersonalCues(userDid: string, query: string, limit: number = 10): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('personal_cues')
        .select('*')
        .or(`user_did.eq.${userDid},user_id.eq.${userDid}`)
        .eq('status', 'active')
        .ilike('cue_key', `%${query}%`)
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ Personal CUE 검색 실패:', error);
      return [];
    }
  }

  // 호환성 별칭들 (3번에서 추가)
  public async getPersonalCuesByUser(userDid: string): Promise<any[]> {
    return this.getPersonalCues(userDid);
  }

  public async createPersonalCue(cueData: any): Promise<any> {
    return this.storePersonalCue(cueData);
  }

  public async addPersonalCue(cueData: any): Promise<any> {
    return this.storePersonalCue(cueData);
  }

  // ============================================================================
  // 💬 대화 및 메시지 관리 (기존 1번 + 개선)
  // ============================================================================

  public async createConversation(conversationData: any): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('conversations')
        .insert([{
          ...conversationData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_message_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      
      console.log('✅ 대화 생성 성공:', conversationData.title);
      return data;
    } catch (error) {
      console.error('❌ 대화 생성 실패:', error);
      throw error;
    }
  }

  public async saveMessage(messageData: any): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('messages')
        .insert([{
          ...messageData,
          timestamp: messageData.timestamp || new Date().toISOString(),
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      
      console.log('✅ 메시지 저장 성공');
      return data;
    } catch (error) {
      console.error('❌ 메시지 저장 실패:', error);
      throw error;
    }
  }

  public async saveChatMessage(messageData: any): Promise<void> {
    await this.saveMessage(messageData);
  }

  public async getChatHistory(userDid: string, conversationId?: string, limit = 100): Promise<any[]> {
    try {
      let query = this.supabase
        .from('messages')
        .select(`
          *,
          conversations!inner(
            id,
            user_id,
            title,
            ai_agent_id
          )
        `)
        .eq('conversations.user_id', userDid)
        .order('timestamp', { ascending: true })
        .limit(limit);

      if (conversationId) {
        query = query.eq('conversation_id', conversationId);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('❌ 채팅 기록 조회 실패:', error);
      return [];
    }
  }

  public async getConversationHistory(userId: string, conversationId?: string, limit: number = 50): Promise<any[]> {
    return this.getChatHistory(userId, conversationId, limit);
  }

  // ============================================================================
  // 🤖 AI Agents 관리 (기존 1번)
  // ============================================================================

  public async getAIAgents(): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('ai_agents')
        .select('*')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ AI Agents 조회 실패:', error);
      return [];
    }
  }

  public async getAIAgent(agentId: string): Promise<any | null> {
    try {
      const { data, error } = await this.supabase
        .from('ai_agents')
        .select('*')
        .eq('agent_id', agentId)
        .eq('status', 'active')
        .single();

      if (error && error.code !== 'PGRST116') return null;
      return data;
    } catch (error) {
      console.error('❌ AI Agent 조회 실패:', error);
      return null;
    }
  }

  // ============================================================================
  // 📱 플랫폼 연동 관리 (기존 1번)
  // ============================================================================

  public async getConnectedPlatforms(userId: string): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('connected_platforms')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ 연결된 플랫폼 조회 실패:', error);
      return [];
    }
  }

  public async updatePlatformConnection(userId: string, platformId: string, updates: any): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('connected_platforms')
        .upsert({
          user_id: userId,
          platform_id: platformId,
          ...updates,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      
      console.log('✅ 플랫폼 연결 업데이트 성공');
      return data;
    } catch (error) {
      console.error('❌ 플랫폼 연결 업데이트 실패:', error);
      throw error;
    }
  }

  // ============================================================================
  // 📋 시스템 활동 로그 (기존 1번 + 3번 추가)
  // ============================================================================

  public async logSystemActivity(activityData: any): Promise<void> {
    try {
      await this.supabase
        .from('system_activities')
        .insert([{
          ...activityData,
          created_at: new Date().toISOString()
        }]);
      
      console.log('✅ 시스템 활동 로그 저장 성공');
    } catch (error) {
      console.error('❌ 시스템 활동 로그 저장 실패:', error);
    }
  }

  public async getSystemActivities(userId?: string, limit = 100): Promise<any[]> {
    try {
      let query = this.supabase
        .from('system_activities')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('❌ 시스템 활동 조회 실패:', error);
      return [];
    }
  }

  // ============================================================================
  // 🔧 유틸리티 및 통계 (기존 1번 + 향상된 통계)
  // ============================================================================

  public async cleanupExpiredSessions(): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('webauthn_sessions')
        .update({
          is_active: false,
          ended_at: new Date().toISOString()
        })
        .eq('is_active', true)
        .lt('expires_at', new Date().toISOString());

      if (error) {
        console.error('❌ 만료된 세션 정리 실패:', error);
        return false;
      }
      
      console.log('✅ 만료된 세션 정리 완료');
      return true;
    } catch (error) {
      console.error('❌ 만료된 세션 정리 실패:', error);
      return false;
    }
  }

  public async getSystemStats(): Promise<any> {
    try {
      const [users, conversations, messages, cues, vaults, credentials] = await Promise.all([
        this.supabase.from('users').select('count', { count: 'exact' }).single(),
        this.supabase.from('conversations').select('count', { count: 'exact' }).single(),
        this.supabase.from('messages').select('count', { count: 'exact' }).single(),
        this.supabase.from('personal_cues').select('count', { count: 'exact' }).single(),
        this.supabase.from('data_vaults').select('count', { count: 'exact' }).single(),
        this.supabase.from('webauthn_credentials').select('count', { count: 'exact' }).single()
      ]);

      return {
        totalUsers: users.count || 0,
        totalConversations: conversations.count || 0,
        totalMessages: messages.count || 0,
        totalCues: cues.count || 0,
        totalVaults: vaults.count || 0,
        totalCredentials: credentials.count || 0,
        connectionInfo: this.getConnectionInfo(),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ 시스템 통계 조회 실패:', error);
      return {
        totalUsers: 0,
        totalConversations: 0,
        totalMessages: 0,
        totalCues: 0,
        totalVaults: 0,
        totalCredentials: 0,
        connectionInfo: this.getConnectionInfo(),
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  public getStatistics() {
    return {
      mockMode: false,
      connected: this.connected,
      connectionAttempts: this.connectionAttempts,
      connectionError: this.connectionError,
      timestamp: new Date().toISOString()
    };
  }

  public async close(): Promise<void> {
    await this.disconnect();
  }
}

// ============================================================================
// 🚀 지연 초기화 (dotenv 로드 후에 초기화)
// ============================================================================

let databaseServiceInstance: DatabaseService | null = null;

/**
 * 지연 초기화된 DatabaseService 인스턴스 반환
 * dotenv.config() 후에 호출되어야 함
 */
export function getDatabaseService(): DatabaseService {
  if (!databaseServiceInstance) {
    console.log('🔄 DatabaseService 지연 초기화 중...');
    databaseServiceInstance = DatabaseService.getInstance();
    
    // 초기화 후 연결 시도
    databaseServiceInstance.connect().catch(error => {
      console.error('❌ DatabaseService 초기 연결 실패:', error);
      console.log('💡 Supabase 환경변수를 확인하세요');
    });
  }
  return databaseServiceInstance;
}

/**
 * 강제 재초기화 (환경변수 변경시 사용)
 */
export function resetDatabaseService(): void {
  databaseServiceInstance = null;
  console.log('🔄 DatabaseService 인스턴스 재설정됨');
}

// 기본 export (기존 코드 호환성)
export default {
  getInstance: () => getDatabaseService(),
  reset: resetDatabaseService
};