// ============================================================================
// 🗄️ 통합된 데이터베이스 서비스 (완전한 버전)
// 경로: backend/src/services/database/DatabaseService.ts
// 용도: Mock과 실제 Supabase 모두 지원하는 통합 데이터베이스 서비스
// 수정사항: 메서드명 통일, SupabaseService와 동일한 인터페이스 제공, 잘린 부분 복원
// ============================================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../types/database.types';

export class DatabaseService {
  private static instance: DatabaseService;
  private supabase: SupabaseClient<Database> | null = null;
  private connected: boolean = false;
  private mockMode: boolean = false;
  private mockData: any = {
    users: [],
    ai_passports: [],
    cue_transactions: [],
    data_vaults: [],
    personal_cues: [],
    chat_messages: [],
    webauthn_credentials: [],
    system_logs: []
  };

  private constructor() {
    // Mock 모드 확인
    this.mockMode = process.env.USE_MOCK_DATABASE === 'true' || 
                   !process.env.SUPABASE_URL || 
                   !process.env.SUPABASE_SERVICE_ROLE_KEY ||
                   process.env.SUPABASE_URL.includes('dummy');

    if (this.mockMode) {
      console.log('🎭 Database running in MOCK mode');
      this.connected = true;
      this.initializeMockData();
    } else {
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
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  private initializeMockData(): void {
    // Mock 사용자 데이터 초기화
    this.mockData.users = [
      {
        id: 'user-1',
        did: 'did:final0626:mock:user1',
        email: 'mock@final0626.com',
        username: 'mockuser',
        full_name: 'Mock User',
        wallet_address: '0x742d35Cc6460C532FAEcE1dd25073C8d2FCAE857',
        webauthn_user_id: 'mock_webauthn_user',
        passkey_registered: true,
        two_factor_enabled: false,
        login_count: 1,
        last_login_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null
      }
    ];

    // Mock AI Passport 데이터
    this.mockData.ai_passports = [
      {
        id: 'passport-1',
        did: 'did:final0626:mock:user1',
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
      }
    ];

    // Mock CUE 트랜잭션
    this.mockData.cue_transactions = [
      {
        id: 'cue-1',
        user_did: 'did:final0626:mock:user1',
        transaction_type: 'reward',
        amount: 100.0,
        status: 'completed',
        source: 'registration_bonus',
        description: 'Welcome bonus for Mock user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    // Mock WebAuthn 자격증명
    this.mockData.webauthn_credentials = [
      {
        id: 'cred-1',
        user_id: 'user-1',
        credential_id: 'mock-credential-id-base64url',
        public_key: 'mock-public-key-base64',
        counter: 0,
        is_active: true,
        created_at: new Date().toISOString(),
        last_used: new Date().toISOString()
      }
    ];

    // Mock 데이터 볼트
    this.mockData.data_vaults = [
      {
        id: 'vault-1',
        owner_did: 'did:final0626:mock:user1',
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

    console.log('✅ Mock database initialized with sample data');
  }

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
  }

  public isConnected(): boolean {
    return this.connected;
  }

  public isMockMode(): boolean {
    return this.mockMode;
  }

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
  // 👤 사용자 관련 메서드 (SupabaseService와 동일한 인터페이스)
  // ============================================================================

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
      return data;
    } catch (error) {
      console.error('Create user error:', error);
      throw error;
    }
  }

  // 수정됨: getUserById로 통일 (SupabaseService와 동일)
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
      console.error('Get user by ID error:', error);
      return null;
    }
  }

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
      console.error('Get user by DID error:', error);
      return null;
    }
  }

  // 추가됨: findUserByEmail (SupabaseService와 동일)
  public async findUserByEmail(email: string) {
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
      console.error('Get user by email error:', error);
      return null;
    }
  }

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
      console.error('Get user by username error:', error);
      return null;
    }
  }

  // 수정됨: updateUser - ID로 업데이트 (SupabaseService와 동일)
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
      return data;
    } catch (error) {
      console.error('Update user error:', error);
      throw error;
    }
  }

  // ============================================================================
  // 🔐 WebAuthn 자격증명 관리 (SupabaseService와 동일한 인터페이스)
  // ============================================================================

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
      return true;
    } catch (error) {
      console.error('Save WebAuthn credential error:', error);
      return false;
    }
  }

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
      console.error('Get WebAuthn credentials error:', error);
      return [];
    }
  }

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
      console.error('Get WebAuthn credential by ID error:', error);
      return null;
    }
  }

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
      return true;
    } catch (error) {
      console.error('Update WebAuthn counter error:', error);
      return false;
    }
  }

  // ============================================================================
  // 🎫 AI Passport 관련 메서드 (SupabaseService와 동일)
  // ============================================================================

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
      console.error('Get passport error:', error);
      return null;
    }
  }

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
      return data;
    } catch (error) {
      console.error('Update passport error:', error);
      throw error;
    }
  }

  // ============================================================================
  // 💎 CUE 토큰 관련 메서드 (SupabaseService와 동일)
  // ============================================================================

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
      return data;
    } catch (error) {
      console.error('Create CUE transaction error:', error);
      throw error;
    }
  }

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
      console.error('Get CUE balance error:', error);
      return 0;
    }
  }

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
      console.error('Get CUE transactions error:', error);
      return [];
    }
  }

  // ============================================================================
  // 🗄️ 데이터 볼트 관련 메서드 (SupabaseService와 동일)
  // ============================================================================

  public async createDataVault(vaultData: any) {
    if (this.mockMode) {
      const newVault = {
        id: `vault-${Date.now()}`,
        ...vaultData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      this.mockData.data_vaults.push(newVault);
      console.log('🎭 Mock data vault created:', newVault.name);
      return newVault;
    }

    try {
      const { data, error } = await this.supabase!
        .from('data_vaults')
        .insert([vaultData])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Create data vault error:', error);
      throw error;
    }
  }

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
      console.error('Get data vaults error:', error);
      return [];
    }
  }

  // ============================================================================
  // 💬 채팅 메시지 저장 및 조회 (추가됨 - SupabaseService와 동일)
  // ============================================================================

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
    } catch (error) {
      console.error('Store chat message error:', error);
      throw error;
    }
  }

  // 새로 추가됨: recordCueTransaction (SupabaseService와 동일)
  // (중복 구현 제거됨)

  // 추가: 타입 안전성이 강화된 CUE 거래 생성
  public async createCUETransactionTyped(transactionData: {
    user_did: string;
    user_id?: string;
    transaction_type: 'mining' | 'spending' | 'reward' | 'transfer';
    amount: number;
    status: 'pending' | 'completed' | 'failed';
    source?: string;
    description?: string;
    metadata?: any;
  }) {
    if (this.mockMode) {
      const newTransaction = {
        id: `cue-tx-${Date.now()}`,
        ...transactionData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      this.mockData.cue_transactions.push(newTransaction);
      console.log('🎭 Mock typed CUE transaction created:', newTransaction.amount);
      return newTransaction;
    }

    try {
      const { data, error } = await this.supabase!
        .from('cue_transactions')
        .insert([{
          user_did: transactionData.user_did,
          user_id: transactionData.user_id || null,
          transaction_type: transactionData.transaction_type,
          amount: transactionData.amount,
          status: transactionData.status,
          source: transactionData.source || null,
          description: transactionData.description || null,
          metadata: transactionData.metadata || {},
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Create typed CUE transaction error:', error);
      throw error;
    }
  }

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
      console.error('Get chat history error:', error);
      return [];
    }
  }

  public async getRecentInteractions(did: string, limit = 10) {
    if (this.mockMode) {
      const messages = this.mockData.chat_messages
        .filter((m: any) => m.user_did === did)
        .slice(-limit);
      return messages;
    }

    try {
      const { data, error } = await this.supabase!
        .from('chat_messages')
        .select('content, ai_model, created_at, message_type')
        .eq('user_did', did)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Get recent interactions error:', error);
      return [];
    }
  }

  // ============================================================================
  // 🧠 개인화 CUE 저장 및 조회 (기존 유지)
  // ============================================================================

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
      return data;
    } catch (error) {
      console.error('Store personal cue error:', error);
      throw error;
    }
  }

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
      console.error('Get personal cues error:', error);
      return [];
    }
  }

  public async searchPersonalCues(did: string, keywords: string[], limit = 10) {
    if (this.mockMode) {
      // Mock 키워드 검색
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
        .overlaps('keywords', keywords)
        .order('importance_score', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Search personal cues error:', error);
      return [];
    }
  }

  // ============================================================================
  // 📊 시스템 로그 및 유틸리티 (기존 유지)
  // ============================================================================

  public async createSystemLog(logData: any) {
    if (this.mockMode) {
      const newLog = {
        id: `log-${Date.now()}`,
        ...logData,
        created_at: new Date().toISOString()
      };
      this.mockData.system_logs.push(newLog);
      // Mock에서는 로그를 조용히 저장
      return newLog;
    }

    try {
      const { data, error } = await this.supabase!
        .from('system_logs')
        .insert([logData]);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Create system log error:', error);
      // 로그 실패는 시스템을 중단시키지 않음
    }
  }

  // ============================================================================
  // 🧹 유틸리티 메서드 (SupabaseService와 동일)
  // ============================================================================

  public async testConnection() {
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

  public async cleanupExpiredSessions() {
    if (this.mockMode) {
      console.log('🎭 Mock 만료된 세션 정리');
      return true;
    }

    try {
      const { error } = await this.supabase!
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

  // DatabaseService.ts에 추가할 메서드들

// 1. 호환성을 위한 메서드 별칭들 추가
public async findUserById(userId: string) {
  return this.getUserById(userId);
}

s
// 2. 누락된 recordCueTransaction 메서드 추가
public async recordCueTransaction(transactionData: any) {
  if (this.mockMode) {
    const newTransaction = {
      id: `tx-${Date.now()}`,
      ...transactionData,
      created_at: new Date().toISOString()
    };
    this.mockData.cue_transactions.push(newTransaction);
    console.log('🎭 Mock CUE 거래 기록:', newTransaction.amount);
    return newTransaction;
  }

  try {
    const { data, error } = await this.supabase!
      .from('cue_transactions')
      .insert([{
        ...transactionData,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Record CUE transaction error:', error);
    return null;
  }
}

// 3. getUserByEmail 메서드 추가 (누락된 경우)
public async getUserByEmail(email: string) {
  if (this.mockMode) {
    const user = this.mockData.users.find((u: any) => u.email === email);
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
    console.error('Get user by email error:', error);
    return null;
  }
}

  // ============================================================================
  // 📈 성능 및 통계
  // ============================================================================

  public getStatistics() {
    if (this.mockMode) {
      return {
        users: this.mockData.users.length,
        passports: this.mockData.ai_passports.length,
        transactions: this.mockData.cue_transactions.length,
        credentials: this.mockData.webauthn_credentials.length,
        vaults: this.mockData.data_vaults.length,
        messages: this.mockData.chat_messages.length,
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

  // ============================================================================
  // 🔄 추가 유틸리티 메서드들
  // ============================================================================

  public async resetMockData() {
    if (this.mockMode) {
      this.initializeMockData();
      console.log('🎭 Mock 데이터 리셋 완료');
      return true;
    }
    return false;
  }

  public getMockData() {
    if (this.mockMode) {
      return { ...this.mockData };
    }
    return null;
  }

  public async backup() {
    if (this.mockMode) {
      const backup = {
        timestamp: new Date().toISOString(),
        data: { ...this.mockData }
      };
      console.log('🎭 Mock 데이터 백업 생성');
      return backup;
    }

    try {
      // 실제 백업 로직 (필요시 구현)
      console.log('🗄️ 실제 데이터베이스 백업은 Supabase 대시보드에서 수행하세요');
      return null;
    } catch (error) {
      console.error('백업 오류:', error);
      return null;
    }
  }
}

// 단일 인스턴스 생성 및 내보내기
const databaseService = DatabaseService.getInstance();

// 초기화 시 연결 테스트
databaseService.connect().catch(error => {
  console.error('Database 초기 연결 실패:', error);
});

export default databaseService;