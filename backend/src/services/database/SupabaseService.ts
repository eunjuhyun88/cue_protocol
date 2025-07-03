// ============================================================================
// 🗄️ 통합 Supabase 데이터베이스 서비스 (완전한 버전)
// 경로: backend/src/services/database/SupabaseService.ts
// 용도: Supabase 클라이언트 및 데이터베이스 연산 관리
// 특징: 싱글톤 패턴 + Mock 모드 + 풍부한 기능 + 타입 안정성
// ============================================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../types/database.types';

// ============================================================================
// 📋 통합 SupabaseService 클래스 (싱글톤 패턴)
// ============================================================================

class SupabaseServiceClass {
  private static instance: SupabaseServiceClass;
  private supabase: SupabaseClient<Database> | null = null;
  private connected: boolean = false;
  private isDummyMode: boolean = false;

  private constructor() {
    this.initializeConnection();
  }

  // ============================================================================
  // 🔧 싱글톤 및 초기화 메서드
  // ============================================================================

  public static getInstance(): SupabaseServiceClass {
    if (!SupabaseServiceClass.instance) {
      SupabaseServiceClass.instance = new SupabaseServiceClass();
    }
    return SupabaseServiceClass.instance;
  }

  private async initializeConnection(): Promise<void> {
    try {
      console.log('🗄️ SupabaseService 초기화 중...');
      
      const url = process.env.SUPABASE_URL || 'https://dummy.supabase.co';
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy_service_key';
      
      // Dummy 모드 확인
      if (!url || !key || url.includes('dummy')) {
        this.isDummyMode = true;
        console.warn('⚠️ 더미 Supabase 설정 - Mock 모드로 실행');
        console.log('✅ 실제 Supabase 설정 시 연결 테스트가 수행됩니다');
        this.connected = true;
        return;
      }

      // 실제 Supabase 클라이언트 생성
      this.supabase = createClient<Database>(url, key, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        },
        db: {
          schema: 'public'
        }
      });

      // 연결 테스트
      const { error } = await this.supabase.from('users').select('id').limit(1);
      
      if (error && !error.message.includes('relation') && !error.message.includes('does not exist')) {
        throw error;
      }

      this.connected = true;
      console.log('✅ Supabase 연결 성공');
    } catch (error) {
      console.error('❌ Supabase 연결 실패:', error);
      this.connected = false;
      this.isDummyMode = true; // 연결 실패 시 Mock 모드로 전환
    }
  }

  public isConnected(): boolean {
    return this.connected;
  }

  public getClient(): SupabaseClient<Database> | null {
    return this.supabase;
  }

  private isDummy(): boolean {
    return this.isDummyMode;
  }

  // ============================================================================
  // 👤 사용자 관리 메서드
  // ============================================================================

  public async createUser(userData: any): Promise<any> {
    try {
      if (this.isDummy()) {
        console.log('📋 Mock 사용자 생성:', userData.username || userData.email);
        return { 
          id: userData.id || `user-${Date.now()}`, 
          ...userData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      }

      if (!this.supabase) throw new Error('Supabase not initialized');

      const { data, error } = await this.supabase
        .from('users')
        .insert([userData])
        .select()
        .single();

      if (error) {
        console.error('❌ 사용자 생성 실패:', error);
        throw error;
      }

      console.log('✅ 사용자 생성 성공:', data.id);
      return data;
    } catch (error) {
      console.error('❌ 사용자 생성 오류:', error);
      throw error;
    }
  }

  public async getUserById(userId: string): Promise<any | null> {
    try {
      if (this.isDummy()) {
        console.log('📋 Mock 사용자 ID 조회:', userId);
        return {
          id: userId,
          username: `user-${userId.slice(-4)}`,
          email: 'demo@example.com',
          did: `did:final0626:${Date.now()}`,
          wallet_address: `0x${Math.random().toString(16).substring(2, 42)}`,
          passkey_registered: true,
          two_factor_enabled: false,
          login_count: 5,
          created_at: new Date().toISOString(),
          last_login_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      }

      if (!this.supabase) throw new Error('Supabase not initialized');

      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('❌ 사용자 ID 조회 실패:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('❌ 사용자 ID 조회 오류:', error);
      return null;
    }
  }

  // 하위 호환성을 위한 별칭
  public async findUserById(id: string): Promise<any | null> {
    return this.getUserById(id);
  }

  public async findUserByEmail(email: string): Promise<any | null> {
    try {
      if (this.isDummy()) {
        console.log('📋 Mock 사용자 이메일 조회:', email);
        if (email === 'demo@example.com') {
          return {
            id: 'mock-user-id',
            username: 'demo_user',
            email: email,
            did: `did:final0626:mock`,
            wallet_address: '0x742d35Cc6460C532FAEcE1dd25073C8d2FCAE857',
            passkey_registered: false,
            two_factor_enabled: false,
            login_count: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
        }
        return null;
      }

      if (!this.supabase) throw new Error('Supabase not initialized');

      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('❌ 사용자 이메일 조회 실패:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('❌ 사용자 이메일 조회 오류:', error);
      return null;
    }
  }

  public async getUserByCredentialId(credentialId: string): Promise<any | null> {
    try {
      if (this.isDummy()) {
        console.log('📋 Mock credential로 사용자 조회:', credentialId);
        return {
          id: 'mock-user-id',
          username: 'demo_user',
          email: 'demo@example.com',
          did: `did:final0626:mock`
        };
      }

      if (!this.supabase) throw new Error('Supabase not initialized');

      const { data, error } = await this.supabase
        .from('webauthn_credentials')
        .select(`
          *,
          users (*)
        `)
        .eq('credential_id', credentialId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('❌ credential로 사용자 조회 실패:', error);
        return null;
      }

      return data?.users || null;
    } catch (error) {
      console.error('❌ credential로 사용자 조회 오류:', error);
      return null;
    }
  }

  public async updateUser(id: string, updates: any): Promise<any | null> {
    try {
      if (this.isDummy()) {
        console.log('📋 Mock 사용자 업데이트:', id, updates);
        return { 
          id, 
          ...updates,
          updated_at: new Date().toISOString()
        };
      }

      if (!this.supabase) throw new Error('Supabase not initialized');

      const { data, error } = await this.supabase
        .from('users')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('❌ 사용자 업데이트 실패:', error);
        throw error;
      }

      console.log('✅ 사용자 업데이트 성공:', id);
      return data;
    } catch (error) {
      console.error('❌ 사용자 업데이트 오류:', error);
      throw error;
    }
  }

  // ============================================================================
  // 🔐 WebAuthn 자격증명 관리 메서드
  // ============================================================================

  public async saveWebAuthnCredential(credentialData: any): Promise<boolean> {
    try {
      if (this.isDummy()) {
        console.log('📋 Mock 자격증명 저장:', credentialData.user_id);
        return true;
      }

      if (!this.supabase) throw new Error('Supabase not initialized');

      const { data, error } = await this.supabase
        .from('webauthn_credentials')
        .insert([credentialData])
        .select()
        .single();

      if (error) {
        console.error('❌ WebAuthn 자격증명 저장 실패:', error);
        throw error;
      }

      console.log('✅ WebAuthn 자격증명 저장 성공:', data.id);
      return true;
    } catch (error) {
      console.error('❌ WebAuthn 자격증명 저장 오류:', error);
      throw error;
    }
  }

  // 별칭 메서드
  public async storeCredential(credentialData: any): Promise<any> {
    await this.saveWebAuthnCredential(credentialData);
    return credentialData;
  }

  public async getWebAuthnCredentials(userId: string): Promise<any[]> {
    try {
      if (this.isDummy()) {
        console.log('📋 Mock 자격증명 조회:', userId);
        return [
          {
            id: 'mock-cred-1',
            user_id: userId,
            credential_id: 'mock-credential-id-base64url',
            public_key: 'mock-public-key-base64',
            counter: 0,
            is_active: true,
            created_at: new Date().toISOString(),
            last_used: new Date().toISOString()
          }
        ];
      }

      if (!this.supabase) throw new Error('Supabase not initialized');

      const { data, error } = await this.supabase
        .from('webauthn_credentials')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error) {
        console.error('❌ WebAuthn 자격증명 조회 실패:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ WebAuthn 자격증명 조회 오류:', error);
      return [];
    }
  }

  public async getWebAuthnCredentialById(credentialId: string): Promise<any | null> {
    try {
      if (this.isDummy()) {
        console.log('📋 Mock 자격증명 ID 조회:', credentialId);
        return {
          id: 'mock-cred-1',
          user_id: 'mock-user-id',
          credential_id: credentialId,
          public_key: 'mock-public-key-base64',
          counter: 0,
          is_active: true,
          created_at: new Date().toISOString(),
          last_used: new Date().toISOString()
        };
      }

      if (!this.supabase) throw new Error('Supabase not initialized');

      const { data, error } = await this.supabase
        .from('webauthn_credentials')
        .select('*')
        .eq('credential_id', credentialId)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('❌ WebAuthn 자격증명 ID 조회 실패:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('❌ WebAuthn 자격증명 ID 조회 오류:', error);
      return null;
    }
  }

  // 별칭 메서드
  public async getCredential(credentialId: string): Promise<any | null> {
    return this.getWebAuthnCredentialById(credentialId);
  }

  public async updateWebAuthnCredentialCounter(credentialId: string, counter: number): Promise<boolean> {
    try {
      if (this.isDummy()) {
        console.log('📋 Mock 카운터 업데이트:', credentialId, counter);
        return true;
      }

      if (!this.supabase) throw new Error('Supabase not initialized');

      const { error } = await this.supabase
        .from('webauthn_credentials')
        .update({ 
          counter: counter, 
          last_used: new Date().toISOString() 
        })
        .eq('credential_id', credentialId);

      if (error) {
        console.error('❌ WebAuthn 카운터 업데이트 실패:', error);
        throw error;
      }

      console.log('✅ WebAuthn 카운터 업데이트 성공:', credentialId);
      return true;
    } catch (error) {
      console.error('❌ WebAuthn 카운터 업데이트 오류:', error);
      throw error;
    }
  }

  // ============================================================================
  // 🎫 AI Passport 관리 메서드
  // ============================================================================

  public async getPassport(did: string): Promise<any | null> {
    try {
      if (this.isDummy()) {
        console.log('📋 Mock Passport 조회:', did);
        return {
          id: 'mock-passport-id',
          did: did,
          passport_level: 'Verified',
          registration_status: 'complete',
          trust_score: 96.8,
          biometric_verified: true,
          email_verified: true,
          phone_verified: false,
          kyc_verified: false,
          personality_profile: {
            type: 'INTJ-A (Architect)',
            communicationStyle: 'Direct & Technical',
            learningPattern: 'Visual + Hands-on',
            workingStyle: 'Morning Focus',
            responsePreference: 'Concise with examples',
            decisionMaking: 'Data-driven analysis'
          },
          total_interactions: 25,
          successful_verifications: 12,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_activity_at: new Date().toISOString()
        };
      }

      if (!this.supabase) throw new Error('Supabase not initialized');

      const { data, error } = await this.supabase
        .from('ai_passports')
        .select('*')
        .eq('did', did)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.log('Get passport error:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.log('Get passport error:', error);
      return null;
    }
  }

  public async createPassport(passportData: any): Promise<any> {
    try {
      if (this.isDummy()) {
        console.log('📋 Mock Passport 생성:', passportData.did);
        return {
          id: `passport-${Date.now()}`,
          ...passportData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      }

      if (!this.supabase) throw new Error('Supabase not initialized');

      const { data, error } = await this.supabase
        .from('ai_passports')
        .insert([passportData])
        .select()
        .single();

      if (error) {
        console.error('❌ Passport 생성 실패:', error);
        throw error;
      }

      console.log('✅ Passport 생성 성공:', data.id);
      return data;
    } catch (error) {
      console.error('❌ Passport 생성 오류:', error);
      throw error;
    }
  }

  public async updatePassport(did: string, updates: any): Promise<any | null> {
    try {
      if (this.isDummy()) {
        console.log('📋 Mock Passport 업데이트:', did, Object.keys(updates));
        return { 
          id: 'mock-passport-id', 
          did, 
          ...updates, 
          updated_at: new Date().toISOString() 
        };
      }

      if (!this.supabase) throw new Error('Supabase not initialized');

      const { data, error } = await this.supabase
        .from('ai_passports')
        .upsert({ 
          did, 
          ...updates, 
          updated_at: new Date().toISOString() 
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Passport 업데이트 실패:', error);
        throw error;
      }

      console.log('✅ Passport 업데이트 성공:', did);
      return data;
    } catch (error) {
      console.error('❌ Passport 업데이트 오류:', error);
      throw error;
    }
  }

  // ============================================================================
  // 💎 CUE 토큰 관리 메서드
  // ============================================================================

  public async getCUEBalance(userDid: string): Promise<number> {
    try {
      if (this.isDummy()) {
        console.log('📋 Mock CUE 잔액 조회:', userDid);
        return 15428.75;
      }

      if (!this.supabase) return 0;

      const { data, error } = await this.supabase
        .from('cue_transactions')
        .select('amount')
        .eq('user_did', userDid)
        .eq('status', 'completed');

      if (error) {
        console.log('Get CUE balance error:', error);
        return 0;
      }
      
      const balance = data?.reduce((sum, tx) => sum + parseFloat(tx.amount.toString()), 0) || 0;
      return Math.round(balance * 100) / 100;
    } catch (error) {
      console.error('❌ CUE 잔액 조회 오류:', error);
      return 0;
    }
  }

  public async createCUETransaction(transaction: any): Promise<any | null> {
    try {
      if (this.isDummy()) {
        console.log('📋 Mock CUE 거래 생성:', transaction.amount);
        return {
          id: `cue-tx-${Date.now()}`,
          ...transaction,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      }

      if (!this.supabase) throw new Error('Supabase not initialized');

      const { data, error } = await this.supabase
        .from('cue_transactions')
        .insert([{
          ...transaction,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        console.error('❌ CUE 거래 생성 실패:', error);
        throw error;
      }

      console.log('✅ CUE 거래 생성 성공:', data.id);
      return data;
    } catch (error) {
      console.error('❌ CUE 거래 생성 오류:', error);
      throw error;
    }
  }

  // 별칭 메서드
  public async addCUETransaction(transactionData: any): Promise<any> {
    return this.createCUETransaction(transactionData);
  }

  public async recordCueTransaction(transactionData: any): Promise<any | null> {
    return this.createCUETransaction(transactionData);
  }

  // ============================================================================
  // 🧠 Personal CUE 관리 메서드
  // ============================================================================

  public async getPersonalCuesByUser(userDid: string): Promise<any[]> {
    try {
      if (this.isDummy()) {
        console.log('📋 Mock Personal CUE 조회:', userDid);
        return [
          {
            id: 'cue-1',
            user_did: userDid,
            cue_key: 'tech_preference_react',
            cue_type: 'preference',
            cue_category: 'programming_language',
            cue_data: {
              language: 'react',
              interest_level: 'high'
            },
            confidence_metrics: {
              confidence_score: 0.8
            },
            last_applied: new Date()
          }
        ];
      }

      if (!this.supabase) return [];

      const { data, error } = await this.supabase
        .from('personal_cues')
        .select('*')
        .eq('user_did', userDid)
        .eq('is_active', true)
        .order('updated_at', { ascending: false });

      if (error) {
        console.log('Get personal cues error:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Personal CUE 조회 오류:', error);
      return [];
    }
  }

  // 별칭 메서드 (두 번째 파일 호환성)
  public async getPersonalCues(userDid: string): Promise<any[]> {
    return this.getPersonalCuesByUser(userDid);
  }

  public async getPersonalCue(userDid: string, cueKey: string, cueType: string): Promise<any | null> {
    try {
      if (this.isDummy()) {
        return null; // Mock에서는 기존 CUE 없음으로 처리
      }

      if (!this.supabase) throw new Error('Supabase not initialized');

      const { data, error } = await this.supabase
        .from('personal_cues')
        .select('*')
        .eq('user_did', userDid)
        .eq('cue_key', cueKey)
        .eq('cue_type', cueType)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;

    } catch (error) {
      console.error('개별 Personal CUE 조회 오류:', error);
      return null;
    }
  }

  public async createPersonalCue(cueData: any): Promise<any> {
    try {
      if (this.isDummy()) {
        console.log('📋 Mock Personal CUE 생성:', cueData.cue_key);
        return { 
          id: `cue_${Date.now()}`, 
          ...cueData,
          created_at: new Date().toISOString()
        };
      }

      if (!this.supabase) throw new Error('Supabase not initialized');

      const { data, error } = await this.supabase
        .from('personal_cues')
        .insert(cueData)
        .select()
        .single();

      if (error) {
        console.error('❌ Personal CUE 생성 실패:', error);
        throw error;
      }

      console.log('✅ Personal CUE 생성 성공:', data.id);
      return data;
    } catch (error) {
      console.error('Personal CUE 생성 오류:', error);
      throw error;
    }
  }

  // 별칭 메서드
  public async addPersonalCue(cueData: any): Promise<any> {
    return this.createPersonalCue(cueData);
  }

  public async updatePersonalCue(cueId: string, updateData: any): Promise<any | null> {
    try {
      if (this.isDummy()) {
        console.log('📋 Mock Personal CUE 업데이트:', cueId);
        return { 
          id: cueId, 
          ...updateData,
          updated_at: new Date().toISOString()
        };
      }

      if (!this.supabase) throw new Error('Supabase not initialized');

      const { data, error } = await this.supabase
        .from('personal_cues')
        .update(updateData)
        .eq('id', cueId)
        .select()
        .single();

      if (error) {
        console.error('❌ Personal CUE 업데이트 실패:', error);
        throw error;
      }

      console.log('✅ Personal CUE 업데이트 성공:', cueId);
      return data;
    } catch (error) {
      console.error('Personal CUE 업데이트 오류:', error);
      throw error;
    }
  }

  // ============================================================================
  // 🗄️ 데이터 볼트 관리 메서드
  // ============================================================================

  public async getDataVaults(userDid: string): Promise<any[]> {
    try {
      if (this.isDummy()) {
        console.log('📋 Mock 데이터 볼트 조회:', userDid);
        return [
          {
            id: 'vault-1',
            owner_did: userDid,
            name: 'Professional Knowledge',
            description: 'Mock professional data vault',
            category: 'professional',
            access_level: 'private',
            status: 'active',
            data_count: 47,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ];
      }

      if (!this.supabase) return [];

      const { data, error } = await this.supabase
        .from('data_vaults')
        .select('*')
        .eq('owner_did', userDid)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        console.log('Get data vaults error:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ 데이터 볼트 조회 오류:', error);
      return [];
    }
  }

  public async createDataVault(vaultData: any): Promise<any> {
    try {
      if (this.isDummy()) {
        console.log('📋 Mock 데이터 볼트 생성:', vaultData.name);
        return {
          id: `vault-${Date.now()}`,
          ...vaultData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      }

      if (!this.supabase) throw new Error('Supabase not initialized');

      const { data, error } = await this.supabase
        .from('data_vaults')
        .insert([vaultData])
        .select()
        .single();

      if (error) {
        console.error('❌ 데이터 볼트 생성 실패:', error);
        throw error;
      }

      console.log('✅ 데이터 볼트 생성 성공:', data.id);
      return data;
    } catch (error) {
      console.error('❌ 데이터 볼트 생성 오류:', error);
      throw error;
    }
  }

  // ============================================================================
  // 💬 채팅 메시지 관리 메서드
  // ============================================================================

  public async saveChatMessage(messageData: any): Promise<any> {
    try {
      if (this.isDummy()) {
        console.log('📋 Mock 채팅 메시지 저장:', messageData.message_type);
        return {
          id: `msg-${Date.now()}`,
          ...messageData,
          created_at: new Date().toISOString()
        };
      }

      if (!this.supabase) throw new Error('Supabase not initialized');

      const { data, error } = await this.supabase
        .from('chat_messages')
        .insert([messageData])
        .select()
        .single();

      if (error) {
        console.error('❌ 채팅 메시지 저장 실패:', error);
        throw error;
      }

      console.log('✅ 채팅 메시지 저장 성공:', data.id);
      return data;
    } catch (error) {
      console.error('❌ 채팅 메시지 저장 오류:', error);
      throw error;
    }
  }

  public async getChatHistory(userDid: string, limit: number = 50): Promise<any[]> {
    try {
      if (this.isDummy()) {
        console.log('📋 Mock 채팅 이력 조회:', userDid);
        return [
          {
            id: 'msg-1',
            user_did: userDid,
            message_type: 'user',
            content: 'Hello',
            created_at: new Date().toISOString()
          }
        ];
      }

      if (!this.supabase) return [];

      const { data, error } = await this.supabase
        .from('chat_messages')
        .select('*')
        .eq('user_did', userDid)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ 채팅 이력 조회 실패:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ 채팅 이력 조회 오류:', error);
      return [];
    }
  }

  // ============================================================================
  // 🧹 유틸리티 및 시스템 관리 메서드
  // ============================================================================

  public async testConnection(): Promise<boolean> {
    try {
      if (this.isDummy()) {
        console.log('⚠️ 더미 Supabase 설정 - 연결 테스트 건너뛰기');
        console.log('✅ 실제 Supabase 설정 시 연결 테스트가 수행됩니다');
        return true;
      }

      if (!this.supabase) return false;

      const { data, error } = await this.supabase
        .from('users')
        .select('count')
        .limit(1);

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Supabase 연결 테스트 실패:', error);
        return false;
      }

      console.log('✅ Supabase 연결 성공');
      return true;
    } catch (error) {
      console.error('❌ Supabase 연결 오류:', error);
      return false;
    }
  }

  public async cleanupExpiredSessions(): Promise<boolean> {
    try {
      if (this.isDummy()) {
        console.log('📋 Mock 만료된 세션 정리');
        return true;
      }

      if (!this.supabase) throw new Error('Supabase not initialized');

      const { error } = await this.supabase
        .from('webauthn_challenges')
        .delete()
        .lt('expires_at', new Date().toISOString());

      if (error) {
        console.error('❌ 만료된 세션 정리 실패:', error);
        return false;
      }

      console.log('✅ 만료된 세션 정리 완료');
      return true;
    } catch (error) {
      console.error('❌ 만료된 세션 정리 오류:', error);
      return false;
    }
  }

  public async getSystemStats(): Promise<any | null> {
    try {
      if (this.isDummy()) {
        console.log('📋 Mock 시스템 통계 조회');
        return {
          totalUsers: 1,
          activeUsers: 1,
          totalCueTokens: 15428,
          totalTransactions: 25,
          timestamp: new Date().toISOString()
        };
      }

      if (!this.supabase) return null;

      // 실제 통계 조회 로직
      const [usersResult, activeUsersResult] = await Promise.all([
        this.supabase.from('users').select('count').single(),
        this.supabase
          .from('users')
          .select('count')
          .gte('last_login_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .single()
      ]);

      return {
        totalUsers: usersResult.data?.count || 0,
        activeUsers: activeUsersResult.data?.count || 0,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ 시스템 통계 조회 오류:', error);
      return null;
    }
  }
}

// ============================================================================
// 🔧 Export 및 초기화
// ============================================================================

// 싱글톤 인스턴스 내보내기
export const SupabaseService = SupabaseServiceClass;
export const supabaseService = SupabaseServiceClass.getInstance();

// 하위 호환성을 위한 함수들
export async function testDatabaseConnection(): Promise<boolean> {
  return await supabaseService.testConnection();
}

// 초기화 로그
console.log('🗄️ 통합 SupabaseService 초기화 완료');

// 기본 export
export default supabaseService;