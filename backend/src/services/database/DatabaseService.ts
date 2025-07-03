// ============================================================================
// 🗄️ 완전한 통합 데이터베이스 서비스 (중복 제거 및 기능 완성)
// 경로: backend/src/services/database/DatabaseService.ts
// 용도: Mock과 실제 Supabase 모두 지원하는 통합 데이터베이스 서비스
// 개선사항: 중복 제거, 누락 메서드 추가, 일관된 인터페이스 제공
// ============================================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../types/database.types';

/**
 * 통합 데이터베이스 서비스 클래스
 * - Singleton 패턴으로 단일 인스턴스 보장
 * - Mock 모드와 실제 Supabase 모드 자동 전환
 * - 모든 데이터 테이블에 대한 CRUD 작업 지원
 */
export class DatabaseService {
  private static instance: DatabaseService;
  private supabase: SupabaseClient<Database> | null = null;
  private connected: boolean = false;
  private mockMode: boolean = false;
  
  // Mock 데이터 저장소 - 실제 DB 구조와 동일하게 유지
  private mockData: {
    users: any[];
    ai_passports: any[];
    cue_transactions: any[];
    data_vaults: any[];
    vault_data: any[];
    personal_cues: any[];
    chat_messages: any[];
    webauthn_credentials: any[];
    system_logs: any[];
  } = {
    users: [],
    ai_passports: [],
    cue_transactions: [],
    data_vaults: [],
    vault_data: [],
    personal_cues: [],
    chat_messages: [],
    webauthn_credentials: [],
    system_logs: []
  };

  private constructor() {
    // Mock 모드 자동 감지
    this.mockMode = process.env.USE_MOCK_DATABASE === 'true' || 
                   !process.env.SUPABASE_URL || 
                   !process.env.SUPABASE_SERVICE_ROLE_KEY ||
                   process.env.SUPABASE_URL.includes('dummy');

    if (this.mockMode) {
      console.log('🎭 Database running in MOCK mode');
      this.connected = true;
      this.initializeMockData();
    } else {
      this.initializeSupabase();
    }
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  private initializeSupabase(): void {
    try {
      this.supabase = createClient<Database>(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          },
          db: {
            schema: 'public'
          }
        }
      );
      console.log('🗄️ Supabase client initialized');
    } catch (error) {
      console.error('❌ Supabase initialization failed, switching to Mock mode:', error);
      this.mockMode = true;
      this.connected = true;
      this.initializeMockData();
    }
  }

  /**
   * Mock 데이터 초기화 - 현실적인 테스트 데이터 생성
   */
  private initializeMockData(): void {
    const now = new Date().toISOString();
    const userId = 'user-mock-001';
    const userDid = 'did:final0626:mock:user1';

    // 👤 Mock 사용자 데이터
    this.mockData.users = [
      {
        id: userId,
        did: userDid,
        email: 'mock@final0626.com',
        username: 'mockuser',
        full_name: 'Mock User',
        wallet_address: '0x742d35Cc6460C532FAEcE1dd25073C8d2FCAE857',
        webauthn_user_id: 'mock_webauthn_user',
        passkey_registered: true,
        two_factor_enabled: false,
        login_count: 1,
        last_login_at: now,
        created_at: now,
        updated_at: now,
        deleted_at: null
      }
    ];

    // 🎫 Mock AI Passport 데이터
    this.mockData.ai_passports = [
      {
        id: 'passport-001',
        did: userDid,
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
        created_at: now,
        updated_at: now,
        last_activity_at: now
      }
    ];

    // 💎 Mock CUE 트랜잭션 데이터
    this.mockData.cue_transactions = [
      {
        id: 'cue-tx-001',
        user_did: userDid,
        transaction_type: 'reward',
        amount: 100.0,
        status: 'completed',
        source: 'registration_bonus',
        description: 'Welcome bonus for Mock user',
        created_at: now,
        updated_at: now
      },
      {
        id: 'cue-tx-002',
        user_did: userDid,
        transaction_type: 'mining',
        amount: 25.5,
        status: 'completed',
        source: 'daily_mining',
        description: 'Daily mining reward',
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      }
    ];

    // 🔐 Mock WebAuthn 자격증명
    this.mockData.webauthn_credentials = [
      {
        id: 'cred-001',
        user_id: userId,
        credential_id: 'mock-credential-id-base64url',
        public_key: 'mock-public-key-base64',
        counter: 0,
        is_active: true,
        created_at: now,
        last_used: now
      }
    ];

    // 🗄️ Mock 데이터 볼트
    this.mockData.data_vaults = [
      {
        id: 'vault-001',
        user_id: userId,
        owner_did: userDid,
        name: 'Personal Knowledge',
        description: 'My personal learning and insights',
        category: 'personal',
        is_encrypted: true,
        data_count: 25,
        total_size: 1024000,
        access_level: 'private',
        status: 'active',
        created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: now,
        last_accessed_at: now
      },
      {
        id: 'vault-002',
        user_id: userId,
        owner_did: userDid,
        name: 'Work Projects',
        description: 'Professional development and projects',
        category: 'professional',
        is_encrypted: true,
        data_count: 42,
        total_size: 2048000,
        access_level: 'private',
        status: 'active',
        created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: now,
        last_accessed_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      }
    ];

    // 📄 Mock 볼트 데이터
    this.mockData.vault_data = [
      {
        id: 'data-001',
        vault_id: 'vault-001',
        data_type: 'text',
        encrypted_content: 'encrypted-mock-content-123',
        original_content: 'This is sample vault content',
        metadata: {
          title: 'Sample Note',
          size: 1024,
          source: 'manual',
          tags: ['personal', 'note']
        },
        created_at: now,
        updated_at: now
      }
    ];

    console.log('✅ Mock database initialized with comprehensive sample data');
  }

  // ============================================================================
  // 🔌 연결 관리 메서드
  // ============================================================================

  /**
   * 데이터베이스 연결 설정
   */
  public async connect(): Promise<void> {
    if (this.mockMode) {
      console.log('✅ Mock database connected');
      return;
    }

    try {
      const { data, error } = await this.supabase!
        .from('users')
        .select('count')
        .limit(1);

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      this.connected = true;
      console.log('✅ Supabase connection established');
    } catch (error) {
      console.error('❌ Supabase connection failed, switching to Mock mode:', error);
      this.mockMode = true;
      this.connected = true;
      this.initializeMockData();
    }
  }

  public async disconnect(): Promise<void> {
    this.connected = false;
    console.log('🔌 Database disconnected');
  }

  public isConnected(): boolean {
    return this.connected;
  }

  public isMockMode(): boolean {
    return this.mockMode;
  }

  /**
   * 연결 정보 반환
   */
  public getConnectionInfo(): {
    type: 'supabase' | 'mock';
    connected: boolean;
    url?: string;
    mockDataCount?: number;
  } {
    if (this.mockMode) {
      return {
        type: 'mock',
        connected: true,
        mockDataCount: this.mockData.users.length
      };
    } else {
      return {
        type: 'supabase',
        connected: this.connected,
        url: process.env.SUPABASE_URL
      };
    }
  }

  /**
   * Supabase 클라이언트 반환 (Mock 모드에서는 예외 발생)
   */
  public getClient(): SupabaseClient<Database> {
    if (this.mockMode) {
      throw new Error('Cannot get Supabase client in Mock mode');
    }
    if (!this.connected || !this.supabase) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.supabase;
  }

  // ============================================================================
  // 👤 사용자 관리 메서드
  // ============================================================================

  /**
   * 새 사용자 생성
   * @param userData 사용자 데이터 객체
   * @returns 생성된 사용자 정보
   */
  public async createUser(userData: any) {
    if (this.mockMode) {
      const newUser = {
        id: userData.id || `user-${Date.now()}`,
        ...userData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      this.mockData.users.push(newUser);
      console.log('🎭 Mock user created:', newUser.username || newUser.email);
      return newUser;
    }

    try {
      const { data, error } = await this.supabase!
        .from('users')
        .insert([userData])
        .select()
        .single();

      if (error) throw error;
      console.log('✅ User created successfully:', data.id);
      return data;
    } catch (error) {
      console.error('❌ Create user error:', error);
      throw error;
    }
  }

  /**
   * ID로 사용자 조회
   */
  public async getUserById(userId: string) {
    if (this.mockMode) {
      const user = this.mockData.users.find((u: any) => u.id === userId);
      console.log('🎭 Mock user by ID found:', !!user);
      return user || null;
    }

    try {
      const { data, error } = await this.supabase!
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      console.error('❌ Get user by ID error:', error);
      return null;
    }
  }

  /**
   * DID로 사용자 조회
   */
  public async getUserByDID(did: string) {
    if (this.mockMode) {
      const user = this.mockData.users.find((u: any) => u.did === did);
      console.log('🎭 Mock user by DID found:', !!user);
      return user || null;
    }

    try {
      const { data, error } = await this.supabase!
        .from('users')
        .select('*')
        .eq('did', did)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      console.error('❌ Get user by DID error:', error);
      return null;
    }
  }

  /**
   * 이메일로 사용자 조회
   */
  public async getUserByEmail(email: string) {
    if (this.mockMode) {
      const user = this.mockData.users.find((u: any) => u.email === email);
      console.log('🎭 Mock user by email found:', !!user);
      return user || null;
    }

    try {
      const { data, error } = await this.supabase!
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      console.error('❌ Get user by email error:', error);
      return null;
    }
  }

  /**
   * 사용자명으로 사용자 조회
   */
  public async getUserByUsername(username: string) {
    if (this.mockMode) {
      const user = this.mockData.users.find((u: any) => 
        u.username === username || u.email === username
      );
      return user || null;
    }

    try {
      const { data, error } = await this.supabase!
        .from('users')
        .select('*')
        .or(`username.eq.${username},email.eq.${username}`)
        .eq('deleted_at', null)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      console.error('❌ Get user by username error:', error);
      return null;
    }
  }

  /**
   * 사용자 정보 업데이트
   */
  public async updateUser(id: string, updates: any) {
    if (this.mockMode) {
      const userIndex = this.mockData.users.findIndex((u: any) => u.id === id);
      if (userIndex >= 0) {
        this.mockData.users[userIndex] = {
          ...this.mockData.users[userIndex],
          ...updates,
          updated_at: new Date().toISOString()
        };
        console.log('🎭 Mock user updated:', id);
        return this.mockData.users[userIndex];
      }
      throw new Error('User not found');
    }

    try {
      const { data, error } = await this.supabase!
        .from('users')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      console.log('✅ User updated successfully:', data.id);
      return data;
    } catch (error) {
      console.error('❌ Update user error:', error);
      throw error;
    }
  }

  // 호환성을 위한 별칭 메서드들
  public async findUserById(userId: string) {
    return this.getUserById(userId);
  }

  public async findUserByEmail(email: string) {
    return this.getUserByEmail(email);
  }

  // ============================================================================
  // 🔐 WebAuthn 자격증명 관리
  // ============================================================================

  /**
   * WebAuthn 자격증명 저장
   */
  public async saveWebAuthnCredential(credentialData: any) {
    if (this.mockMode) {
      const newCredential = {
        id: credentialData.id || `cred-${Date.now()}`,
        ...credentialData,
        created_at: new Date().toISOString()
      };
      this.mockData.webauthn_credentials.push(newCredential);
      console.log('🎭 Mock WebAuthn credential saved:', newCredential.user_id);
      return true;
    }

    try {
      const { data, error } = await this.supabase!
        .from('webauthn_credentials')
        .insert([credentialData])
        .select()
        .single();

      if (error) throw error;
      console.log('✅ WebAuthn credential saved successfully');
      return true;
    } catch (error) {
      console.error('❌ Save WebAuthn credential error:', error);
      return false;
    }
  }

  /**
   * 사용자의 WebAuthn 자격증명 목록 조회
   */
  public async getWebAuthnCredentials(userId: string) {
    if (this.mockMode) {
      const credentials = this.mockData.webauthn_credentials.filter((c: any) => 
        c.user_id === userId && c.is_active !== false
      );
      console.log('🎭 Mock WebAuthn credentials found:', credentials.length);
      return credentials;
    }

    try {
      const { data, error } = await this.supabase!
        .from('webauthn_credentials')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ Get WebAuthn credentials error:', error);
      return [];
    }
  }

  /**
   * 자격증명 ID로 WebAuthn 자격증명 조회
   */
  public async getWebAuthnCredentialById(credentialId: string) {
    if (this.mockMode) {
      const credential = this.mockData.webauthn_credentials.find((c: any) => 
        c.credential_id === credentialId && c.is_active !== false
      );
      console.log('🎭 Mock WebAuthn credential by ID found:', !!credential);
      return credential || null;
    }

    try {
      const { data, error } = await this.supabase!
        .from('webauthn_credentials')
        .select('*')
        .eq('credential_id', credentialId)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      console.error('❌ Get WebAuthn credential by ID error:', error);
      return null;
    }
  }

  /**
   * WebAuthn 자격증명 카운터 업데이트
   */
  public async updateWebAuthnCredentialCounter(credentialId: string, counter: number) {
    if (this.mockMode) {
      const credentialIndex = this.mockData.webauthn_credentials.findIndex((c: any) => 
        c.credential_id === credentialId
      );
      if (credentialIndex >= 0) {
        this.mockData.webauthn_credentials[credentialIndex].counter = counter;
        this.mockData.webauthn_credentials[credentialIndex].last_used = new Date().toISOString();
        console.log('🎭 Mock WebAuthn counter updated:', credentialId);
        return true;
      }
      return false;
    }

    try {
      const { error } = await this.supabase!
        .from('webauthn_credentials')
        .update({ 
          counter: counter, 
          last_used: new Date().toISOString() 
        })
        .eq('credential_id', credentialId);

      if (error) throw error;
      console.log('✅ WebAuthn counter updated successfully');
      return true;
    } catch (error) {
      console.error('❌ Update WebAuthn counter error:', error);
      return false;
    }
  }

  // ============================================================================
  // 🎫 AI Passport 관리
  // ============================================================================

  /**
   * AI Passport 조회
   */
  public async getPassport(did: string) {
    if (this.mockMode) {
      const passport = this.mockData.ai_passports.find((p: any) => p.did === did);
      console.log('🎭 Mock passport found:', !!passport);
      return passport || null;
    }

    try {
      const { data, error } = await this.supabase!
        .from('ai_passports')
        .select('*')
        .eq('did', did)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      console.error('❌ Get passport error:', error);
      return null;
    }
  }

  /**
   * AI Passport 업데이트 또는 생성
   */
  public async updatePassport(did: string, updates: any) {
    if (this.mockMode) {
      let passport = this.mockData.ai_passports.find((p: any) => p.did === did);
      if (!passport) {
        passport = {
          id: `passport-${Date.now()}`,
          did,
          ...updates,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        this.mockData.ai_passports.push(passport);
      } else {
        Object.assign(passport, updates, { updated_at: new Date().toISOString() });
      }
      console.log('🎭 Mock passport updated:', did);
      return passport;
    }

    try {
      const { data, error } = await this.supabase!
        .from('ai_passports')
        .upsert({ 
          did, 
          ...updates, 
          updated_at: new Date().toISOString() 
        })
        .select()
        .single();

      if (error) throw error;
      console.log('✅ Passport updated successfully:', data.id);
      return data;
    } catch (error) {
      console.error('❌ Update passport error:', error);
      throw error;
    }
  }

  // ============================================================================
  // 💎 CUE 토큰 관리
  // ============================================================================

  /**
   * CUE 트랜잭션 생성
   */
  public async createCUETransaction(transaction: any) {
    if (this.mockMode) {
      const newTransaction = {
        id: `cue-${Date.now()}`,
        ...transaction,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      this.mockData.cue_transactions.push(newTransaction);
      console.log('🎭 Mock CUE transaction created:', newTransaction.amount);
      return newTransaction;
    }

    try {
      const { data, error } = await this.supabase!
        .from('cue_transactions')
        .insert([transaction])
        .select()
        .single();

      if (error) throw error;
      console.log('✅ CUE transaction created successfully:', data.id);
      return data;
    } catch (error) {
      console.error('❌ Create CUE transaction error:', error);
      throw error;
    }
  }

  /**
   * CUE 잔액 조회
   */
  public async getCUEBalance(did: string): Promise<number> {
    if (this.mockMode) {
      const transactions = this.mockData.cue_transactions.filter((t: any) => t.user_did === did);
      const balance = transactions.reduce((sum: number, tx: any) => sum + parseFloat(tx.amount), 0);
      console.log('🎭 Mock CUE balance:', balance);
      return Math.round(balance * 100) / 100;
    }

    try {
      const { data, error } = await this.supabase!
        .from('cue_transactions')
        .select('amount')
        .eq('user_did', did);

      if (error) throw error;
      
      const balance = data?.reduce((sum, tx) => sum + parseFloat(tx.amount.toString()), 0) || 0;
      return Math.round(balance * 100) / 100;
    } catch (error) {
      console.error('❌ Get CUE balance error:', error);
      return 0;
    }
  }

  /**
   * CUE 트랜잭션 히스토리 조회
   */
  public async getCUETransactions(did: string, limit = 50) {
    if (this.mockMode) {
      const transactions = this.mockData.cue_transactions
        .filter((t: any) => t.user_did === did)
        .slice(-limit)
        .reverse();
      return transactions;
    }

    try {
      const { data, error } = await this.supabase!
        .from('cue_transactions')
        .select('*')
        .eq('user_did', did)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ Get CUE transactions error:', error);
      return [];
    }
  }

  /**
   * CUE 트랜잭션 기록 (별칭 메서드)
   */
  public async recordCueTransaction(transactionData: any) {
    return this.createCUETransaction(transactionData);
  }

  // ============================================================================
  // 🗄️ 데이터 볼트 관리
  // ============================================================================

  /**
   * 사용자의 모든 볼트 조회
   */
  public async getUserVaults(userId: string): Promise<any[]> {
    if (this.mockMode) {
      console.log('🎭 Mock 사용자 볼트 조회:', userId);
      return this.mockData.data_vaults.filter((v: any) => v.user_id === userId);
    }

    try {
      const { data, error } = await this.supabase!
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

  /**
   * DID로 데이터 볼트 조회 (호환성 메서드)
   */
  public async getDataVaults(did: string) {
    if (this.mockMode) {
      const vaults = this.mockData.data_vaults.filter((v: any) => v.owner_did === did);
      return vaults;
    }

    try {
      const { data, error } = await this.supabase!
        .from('data_vaults')
        .select('*')
        .eq('owner_did', did)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ Get data vaults error:', error);
      return [];
    }
  }

  /**
   * 볼트 ID로 볼트 조회
   */
  public async getVaultById(vaultId: string): Promise<any | null> {
    if (this.mockMode) {
      console.log('🎭 Mock 볼트 ID 조회:', vaultId);
      return this.mockData.data_vaults.find(vault => vault.id === vaultId) || null;
    }

    try {
      const { data, error } = await this.supabase!
        .from('data_vaults')
        .select('*')
        .eq('id', vaultId)
        .eq('status', 'active')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      console.error('❌ 볼트 ID 조회 실패:', error);
      return null;
    }
  }

  /**
   * 새 볼트 생성
   */
  public async createVault(vaultData: {
    user_id: string;
    name: string;
    description?: string;
    category: string;
    is_encrypted: boolean;
    access_level: 'private' | 'shared' | 'public';
  }): Promise<any> {
    if (this.mockMode) {
      const newVault = {
        id: `vault-${Date.now()}`,
        ...vaultData,
        data_count: 0,
        total_size: 0,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_accessed_at: new Date().toISOString()
      };
      this.mockData.data_vaults.push(newVault);
      console.log('🎭 Mock 볼트 생성:', newVault.name);
      return newVault;
    }

    try {
      const { data, error } = await this.supabase!
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
      console.log('✅ 볼트 생성 성공:', data.id);
      return data;
    } catch (error) {
      console.error('❌ 볼트 생성 실패:', error);
      throw error;
    }
  }

  /**
   * 볼트 업데이트
   */
  public async updateVault(vaultId: string, updates: any): Promise<any> {
    if (this.mockMode) {
      const vaultIndex = this.mockData.data_vaults.findIndex(v => v.id === vaultId);
      if (vaultIndex >= 0) {
        this.mockData.data_vaults[vaultIndex] = {
          ...this.mockData.data_vaults[vaultIndex],
          ...updates,
          updated_at: new Date().toISOString()
        };
        console.log('🎭 Mock 볼트 업데이트:', vaultId);
        return this.mockData.data_vaults[vaultIndex];
      }
      throw new Error('Vault not found');
    }

    try {
      const { data, error } = await this.supabase!
        .from('data_vaults')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', vaultId)
        .select()
        .single();

      if (error) throw error;
      console.log('✅ 볼트 업데이트 성공:', data.id);
      return data;
    } catch (error) {
      console.error('❌ 볼트 업데이트 실패:', error);
      throw error;
    }
  }

  /**
   * 볼트 삭제 (소프트 삭제)
   */
  public async deleteVault(vaultId: string): Promise<boolean> {
    if (this.mockMode) {
      const vaultIndex = this.mockData.data_vaults.findIndex(v => v.id === vaultId);
      if (vaultIndex >= 0) {
        this.mockData.data_vaults[vaultIndex].status = 'deleted';
        this.mockData.data_vaults[vaultIndex].updated_at = new Date().toISOString();
        console.log('🎭 Mock 볼트 삭제:', vaultId);
        return true;
      }
      return false;
    }

    try {
      const { error } = await this.supabase!
        .from('data_vaults')
        .update({ 
          status: 'deleted',
          updated_at: new Date().toISOString()
        })
        .eq('id', vaultId);

      if (error) throw error;
      console.log('✅ 볼트 삭제 성공:', vaultId);
      return true;
    } catch (error) {
      console.error('❌ 볼트 삭제 실패:', error);
      return false;
    }
  }

  /**
   * 볼트에 데이터 저장
   */
  public async saveVaultData(vaultData: {
    vault_id: string;
    data_type: string;
    encrypted_content?: string;
    original_content?: string;
    metadata?: any;
  }): Promise<any> {
    if (this.mockMode) {
      const newData = {
        id: `data-${Date.now()}`,
        ...vaultData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      this.mockData.vault_data.push(newData);
      console.log('🎭 Mock 볼트 데이터 저장:', vaultData.data_type);
      return newData;
    }

    try {
      const { data, error } = await this.supabase!
        .from('vault_data')
        .insert([{
          ...vaultData,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      
      // 볼트의 데이터 카운트 업데이트
      await this.updateVaultStats(vaultData.vault_id);
      
      console.log('✅ 볼트 데이터 저장 성공:', data.id);
      return data;
    } catch (error) {
      console.error('❌ 볼트 데이터 저장 실패:', error);
      throw error;
    }
  }

  /**
   * 볼트 데이터 조회
   */
  public async getVaultData(vaultId: string, limit: number = 50): Promise<any[]> {
    if (this.mockMode) {
      console.log('🎭 Mock 볼트 데이터 조회:', vaultId);
      return this.mockData.vault_data
        .filter(data => data.vault_id === vaultId)
        .slice(-limit);
    }

    try {
      const { data, error } = await this.supabase!
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
   * 볼트 통계 업데이트 (내부 메서드)
   */
  private async updateVaultStats(vaultId: string): Promise<void> {
    if (this.mockMode) {
      const vaultIndex = this.mockData.data_vaults.findIndex(v => v.id === vaultId);
      if (vaultIndex >= 0) {
        const vaultData = this.mockData.vault_data.filter(d => d.vault_id === vaultId);
        this.mockData.data_vaults[vaultIndex].data_count = vaultData.length;
        this.mockData.data_vaults[vaultIndex].total_size = vaultData.reduce((sum, item) => 
          sum + (item.metadata?.size || 0), 0);
        this.mockData.data_vaults[vaultIndex].last_accessed_at = new Date().toISOString();
      }
      return;
    }

    try {
      // 볼트의 데이터 개수와 총 크기 계산
      const { data, error } = await this.supabase!
        .from('vault_data')
        .select('id, metadata')
        .eq('vault_id', vaultId);

      if (error) throw error;

      const dataCount = data?.length || 0;
      const totalSize = data?.reduce((sum, item) => {
        return sum + (item.metadata?.size || 0);
      }, 0) || 0;

      // 볼트 통계 업데이트
      await this.supabase!
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
   * 사용자 볼트 통계 조회
   */
  public async getUserVaultStats(userId: string): Promise<{
    totalVaults: number;
    totalDataCount: number;
    totalSize: number;
    lastActivity: string | null;
  }> {
    if (this.mockMode) {
      const userVaults = this.mockData.data_vaults.filter(v => v.user_id === userId);
      return {
        totalVaults: userVaults.length,
        totalDataCount: userVaults.reduce((sum, vault) => sum + (vault.data_count || 0), 0),
        totalSize: userVaults.reduce((sum, vault) => sum + (vault.total_size || 0), 0),
        lastActivity: userVaults.reduce((latest, vault) => {
          const vaultActivity = vault.last_accessed_at;
          return vaultActivity && (!latest || vaultActivity > latest) ? vaultActivity : latest;
        }, null as string | null)
      };
    }

    try {
      const { data, error } = await this.supabase!
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
  // 💬 채팅 메시지 관리
  // ============================================================================

  /**
   * 채팅 메시지 저장
   */
  public async saveChatMessage(messageData: any): Promise<void> {
    if (this.mockMode) {
      const newMessage = {
        id: messageData.id || `msg-${Date.now()}`,
        ...messageData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      this.mockData.chat_messages.push(newMessage);
      console.log('🎭 Mock chat message stored:', newMessage.message_type);
      return;
    }

    try {
      const { error } = await this.supabase!
        .from('chat_messages')
        .insert([messageData]);

      if (error) throw error;
      console.log('✅ Chat message saved successfully');
    } catch (error) {
      console.error('❌ Store chat message error:', error);
      throw error;
    }
  }

  /**
   * 채팅 히스토리 조회
   */
  public async getChatHistory(did: string, conversationId?: string, limit = 100) {
    if (this.mockMode) {
      let messages = this.mockData.chat_messages.filter((m: any) => m.user_did === did);
      if (conversationId) {
        messages = messages.filter((m: any) => m.conversation_id === conversationId);
      }
      return messages.slice(-limit).reverse();
    }

    try {
      let query = this.supabase!
        .from('chat_messages')
        .select('*')
        .eq('user_did', did)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (conversationId) {
        query = query.eq('conversation_id', conversationId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ Get chat history error:', error);
      return [];
    }
  }

  // ============================================================================
  // 🧠 개인화 CUE 관리
  // ============================================================================

  /**
   * 개인화 CUE 저장
   */
  public async storePersonalCue(cueData: any) {
    if (this.mockMode) {
      const newCue = {
        id: `cue-${Date.now()}`,
        ...cueData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      this.mockData.personal_cues.push(newCue);
      console.log('🎭 Mock personal CUE stored');
      return newCue;
    }

    try {
      const { data, error } = await this.supabase!
        .from('personal_cues')
        .insert([cueData])
        .select()
        .single();

      if (error) throw error;
      console.log('✅ Personal CUE stored successfully:', data.id);
      return data;
    } catch (error) {
      console.error('❌ Store personal cue error:', error);
      throw error;
    }
  }

  /**
   * 개인화 CUE 조회
   */
  public async getPersonalCues(did: string, limit = 50) {
    if (this.mockMode) {
      const cues = this.mockData.personal_cues
        .filter((c: any) => c.user_did === did)
        .slice(-limit);
      return cues;
    }

    try {
      const { data, error } = await this.supabase!
        .from('personal_cues')
        .select('*')
        .eq('user_did', did)
        .order('importance_score', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ Get personal cues error:', error);
      return [];
    }
  }

  // ============================================================================
  // 🧹 유틸리티 및 관리 메서드
  // ============================================================================

  /**
   * 데이터베이스 연결 테스트
   */
  public async testConnection(): Promise<boolean> {
    if (this.mockMode) {
      console.log('⚠️ Mock 데이터베이스 - 연결 테스트 건너뛰기');
      return true;
    }

    try {
      const { data, error } = await this.supabase!
        .from('users')
        .select('count')
        .limit(1);

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Database 연결 테스트 실패:', error);
        return false;
      }

      console.log('✅ Database 연결 성공');
      return true;
    } catch (error) {
      console.error('❌ Database 연결 오류:', error);
      return false;
    }
  }

  /**
   * 헬스 체크 (별칭 메서드)
   */
  public async healthCheck(): Promise<boolean> {
    return await this.testConnection();
  }

  /**
   * 데이터베이스 서비스 종료
   */
  public async close(): Promise<void> {
    console.log('🗄️ 데이터베이스 서비스 종료 중...');
    
    if (this.supabase) {
      this.supabase = null;
    }
    
    // Mock 데이터 정리
    Object.keys(this.mockData).forEach(key => {
      this.mockData[key as keyof typeof this.mockData] = [];
    });
    
    this.connected = false;
    console.log('✅ 데이터베이스 서비스 종료 완료');
  }

  /**
   * 데이터베이스 통계 조회
   */
  public getStatistics() {
    if (this.mockMode) {
      return {
        users: this.mockData.users.length,
        passports: this.mockData.ai_passports.length,
        transactions: this.mockData.cue_transactions.length,
        credentials: this.mockData.webauthn_credentials.length,
        vaults: this.mockData.data_vaults.length,
        vault_data: this.mockData.vault_data.length,
        messages: this.mockData.chat_messages.length,
        personal_cues: this.mockData.personal_cues.length,
        mockMode: true,
        timestamp: new Date().toISOString()
      };
    }

    return {
      mockMode: false,
      connected: this.connected,
      timestamp: new Date().toISOString()
    };
  }
}

// ============================================================================
// 🏭 싱글톤 인스턴스 생성 및 내보내기
// ============================================================================

/**
 * DatabaseService 싱글톤 인스턴스
 * - 애플리케이션 전체에서 단일 데이터베이스 연결 유지
 * - 자동으로 Mock/Supabase 모드 감지
 */
const databaseService = DatabaseService.getInstance();

// 초기화 시 연결 테스트 수행
databaseService.connect().catch(error => {
  console.error('❌ Database 초기 연결 실패:', error);
  console.log('🎭 Mock 모드로 전환하여 계속 진행합니다.');
});

export default databaseService;