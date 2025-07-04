// ============================================================================
// 🗄️ 완전 통합 데이터베이스 서비스 (최종 완성판 + 2번 기능 추가)
// 경로: backend/src/services/database/DatabaseService.ts
// 용도: Supabase 중심의 완전한 데이터베이스 서비스 (Mock 제거, 모든 기능 포함)
// 개선: 1번 기준 + 2번 유용 기능 통합 + 추가 개선사항
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
    console.log('🗄️ === DatabaseService 초기화 (실제 DB 전용) ===');
    this.initializeSupabase();
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  // ============================================================================
  // 🔧 Supabase 초기화 (2번에서 개선된 환경변수 검증)
  // ============================================================================

  private initializeSupabase(): void {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    console.log('🔑 환경변수 확인:', {
      SUPABASE_URL: supabaseUrl ? '✅ 설정됨' : '❌ 누락',
      SUPABASE_SERVICE_ROLE_KEY: supabaseKey ? '✅ 설정됨' : '❌ 누락'
    });

    if (!supabaseUrl || !supabaseKey) {
      this.connectionError = `❌ 필수 환경변수 누락: SUPABASE_URL=${!!supabaseUrl}, SUPABASE_SERVICE_ROLE_KEY=${!!supabaseKey}`;
      console.error(this.connectionError);
      throw new Error(this.connectionError);
    }

    if (supabaseUrl.includes('dummy') || supabaseKey.includes('dummy')) {
      this.connectionError = '❌ 더미 환경변수 감지됨. 실제 Supabase URL과 SERVICE_ROLE_KEY가 필요합니다.';
      console.error(this.connectionError);
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
  // 🔌 연결 관리 (2번에서 개선된 버전)
  // ============================================================================

  public async connect(): Promise<void> {
    if (this.connected) {
      console.log('✅ 이미 연결되어 있습니다.');
      return;
    }

    console.log('🔗 === 데이터베이스 연결 시작 ===');
    
    try {
      this.connectionAttempts++;
      
      // 기본 연결 테스트
      const { data, error } = await this.supabase
        .from('users')
        .select('count', { count: 'exact', head: true });

      if (error) {
        console.error('❌ 연결 테스트 실패:', error);
        throw error;
      }

      console.log('✅ 연결 테스트 성공, 사용자 수:', data || 0);

      // 필수 테이블 존재 확인 (2번에서 추가된 강화된 검증)
      await this.verifyRequiredTables();

      this.connected = true;
      this.connectionError = null;
      this.connectionAttempts = 0;
      console.log('🎉 === 데이터베이스 연결 완료 ===');

    } catch (error: any) {
      this.connected = false;
      this.connectionError = `데이터베이스 연결 실패: ${error.message}`;
      console.error(`💥 연결 실패 (시도 ${this.connectionAttempts}/${this.maxRetries}):`, error);
      
      if (this.connectionAttempts < this.maxRetries) {
        console.log(`🔄 ${2000 * this.connectionAttempts}ms 후 재시도...`);
        await new Promise(resolve => setTimeout(resolve, 2000 * this.connectionAttempts));
        return this.connect();
      }
      
      throw new Error(`데이터베이스 연결 실패: ${this.maxRetries}회 시도 후 포기`);
    }
  }

  /**
   * 필수 테이블 존재 확인 (2번에서 추가된 상세한 테이블 검증)
   */
  private async verifyRequiredTables(): Promise<void> {
    console.log('📋 필수 테이블 확인 중...');

    const requiredTables = [
      'users',
      'webauthn_credentials',
      'webauthn_sessions',
      'webauthn_challenges',
      'conversations',
      'messages',
      'personal_cues',
      'cue_transactions',
      'ai_passports',
      'data_vaults',
      'vault_data',
      'connected_platforms',
      'ai_agents',
      'system_activities'
    ];

    for (const tableName of requiredTables) {
      try {
        const { error } = await this.supabase
          .from(tableName)
          .select('*')
          .limit(1);

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found (정상)
          console.error(`❌ 테이블 '${tableName}' 오류:`, error);
          throw new Error(`테이블 '${tableName}' 접근 불가: ${error.message}`);
        }

        console.log(`✅ 테이블 '${tableName}' 확인됨`);
      } catch (error) {
        console.error(`💥 테이블 '${tableName}' 확인 실패:`, error);
        throw error;
      }
    }

    console.log('🎯 모든 필수 테이블 확인 완료');
  }

  public async disconnect(): Promise<void> {
    this.connected = false;
    console.log('🔌 데이터베이스 연결 해제');
  }

  public isConnected(): boolean {
    return this.connected;
  }

  public isMockMode(): boolean {
    return false; // ✅ Mock 완전 제거 - 실제 DB만 사용
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
   * Supabase 클라이언트 반환
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
  // 👤 사용자 관리 (1번 + 2번 개선사항 융합)
  // ============================================================================

  public async createUser(userData: any): Promise<any> {
    if (!this.connected) {
      throw new Error('데이터베이스 연결이 필요합니다.');
    }

    console.log('👤 === 사용자 생성 ===');
    console.log('📝 입력 데이터:', {
      id: userData.id,
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

      console.log('✅ 사용자 생성 성공:', {
        id: data.id,
        username: data.username,
        did: data.did,
        created_at: data.created_at
      });

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

    console.log(`🔍 ID로 사용자 조회: ${userId}`);

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

      if (!data) {
        console.log(`🔍 사용자 없음: ${userId}`);
        return null;
      }

      console.log(`✅ 사용자 조회 성공: ${data.username} (${data.did})`);
      return data;
    } catch (error) {
      console.error(`💥 사용자 ID 조회 오류 (${userId}):`, error);
      return null;
    }
  }

  public async getUserByEmail(email: string): Promise<any | null> {
    if (!email) return null;

    console.log(`🔍 이메일로 사용자 조회: ${email}`);
    
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error(`❌ 이메일 사용자 조회 실패 (${email}):`, error);
        return null;
      }

      if (!data) {
        console.log(`🔍 이메일 사용자 없음: ${email}`);
        return null;
      }

      console.log(`✅ 이메일 사용자 조회 성공: ${data.username}`);
      return data;
    } catch (error) {
      console.error(`💥 이메일 사용자 조회 오류 (${email}):`, error);
      return null;
    }
  }

  public async getUserByDID(did: string): Promise<any | null> {
    console.log(`🔍 DID로 사용자 조회: ${did}`);

    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('did', did)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error(`❌ DID 사용자 조회 실패 (${did}):`, error);
        return null;
      }

      if (!data) {
        console.log(`🔍 DID 사용자 없음: ${did}`);
        return null;
      }

      console.log(`✅ DID 사용자 조회 성공: ${data.username} (${data.id})`);
      return data;
    } catch (error) {
      console.error(`💥 DID 사용자 조회 오류 (${did}):`, error);
      return null;
    }
  }

  public async getUserByUsername(username: string): Promise<any | null> {
    console.log(`🔍 사용자명으로 조회: ${username}`);

    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .or(`username.eq.${username},email.eq.${username}`)
        .eq('deleted_at', null)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error(`❌ 사용자명 조회 실패 (${username}):`, error);
        return null;
      }

      if (!data) {
        console.log(`🔍 사용자명 없음: ${username}`);
        return null;
      }

      console.log(`✅ 사용자명 조회 성공: ${data.username}`);
      return data;
    } catch (error) {
      console.error('❌ 사용자 이름 조회 실패:', error);
      return null;
    }
  }

  public async updateUser(id: string, updates: any): Promise<any> {
    console.log(`🔄 사용자 업데이트: ${id}`);

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

      if (error) {
        console.error(`❌ 사용자 업데이트 실패 (${id}):`, error);
        throw error;
      }

      console.log(`✅ 사용자 업데이트 성공: ${id}`);
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
  // 🔐 WebAuthn 자격증명 관리 (1번 + 2번 기능 융합)
  // ============================================================================

  public async saveWebAuthnCredential(credentialData: any): Promise<boolean> {
    console.log('🔐 === WebAuthn 자격증명 저장 ===');
    console.log('📝 자격증명 데이터:', {
      user_id: credentialData.user_id,
      credential_id: credentialData.credential_id,
      device_name: credentialData.device_name
    });

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
    console.log(`🔍 자격증명 ID로 사용자 조회: ${credentialId}`);

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
      
      if (!data) {
        console.log(`🔍 자격증명 사용자 없음: ${credentialId}`);
        return null;
      }

      console.log(`✅ 자격증명 사용자 조회 성공: ${data.users.username}`);
      return data?.users || null;
    } catch (error) {
      console.error('❌ 자격증명 조회 실패:', error);
      return null;
    }
  }

  public async getWebAuthnCredentials(userId: string): Promise<any[]> {
    console.log(`🔍 사용자 자격증명 목록 조회: ${userId}`);

    try {
      const { data, error } = await this.supabase
        .from('webauthn_credentials')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ 자격증명 목록 조회 실패:', error);
        return [];
      }

      console.log(`✅ 자격증명 목록 조회 성공: ${data.length}개`);
      return data || [];
    } catch (error) {
      console.error('❌ WebAuthn 자격증명 목록 조회 실패:', error);
      return [];
    }
  }

  public async getWebAuthnCredentialById(credentialId: string): Promise<any | null> {
    console.log(`🔍 자격증명 상세 조회: ${credentialId}`);

    try {
      const { data, error } = await this.supabase
        .from('webauthn_credentials')
        .select('*')
        .eq('credential_id', credentialId)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('❌ 자격증명 상세 조회 실패:', error);
        return null;
      }

      if (!data) {
        console.log(`🔍 자격증명 없음: ${credentialId}`);
        return null;
      }

      console.log(`✅ 자격증명 상세 조회 성공: ${credentialId}`);
      return data;
    } catch (error) {
      console.error('❌ WebAuthn 자격증명 조회 실패:', error);
      return null;
    }
  }

  public async updateWebAuthnCredentialCounter(credentialId: string, counter: number): Promise<boolean> {
    console.log(`🔄 WebAuthn 카운터 업데이트: ${credentialId} → ${counter}`);

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
      
      console.log(`✅ WebAuthn 카운터 업데이트 성공: ${credentialId}`);
      return true;
    } catch (error) {
      console.error('❌ WebAuthn 카운터 업데이트 실패:', error);
      return false;
    }
  }

  // 2번에서 추가된 메서드
  public async updateCredentialLastUsed(credentialId: string): Promise<boolean> {
    console.log(`🔄 자격증명 사용 시간 업데이트: ${credentialId}`);

    try {
      const { error } = await this.supabase
        .from('webauthn_credentials')
        .update({
          last_used_at: new Date().toISOString()
        })
        .eq('credential_id', credentialId)
        .eq('is_active', true);

      if (error) {
        console.error('❌ 자격증명 사용 시간 업데이트 실패:', error);
        return false;
      }

      console.log(`✅ 자격증명 사용 시간 업데이트 성공: ${credentialId}`);
      return true;
    } catch (error) {
      console.error('💥 자격증명 사용 시간 업데이트 오류:', error);
      return false;
    }
  }

  // ============================================================================
  // 📊 WebAuthn 세션 관리 (1번 + 2번 기능 융합)
  // ============================================================================

  public async createWebAuthnSession(sessionData: any): Promise<any> {
    console.log('📱 === WebAuthn 세션 생성 ===');

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

      if (error) {
        console.error('❌ WebAuthn 세션 생성 실패:', error);
        throw error;
      }
      
      console.log('✅ WebAuthn 세션 생성 성공:', data.id);
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

  // 2번에서 추가된 세션 메서드들
  public async getWebAuthnSession(sessionId: string): Promise<any> {
    console.log(`🔍 WebAuthn 세션 조회: ${sessionId}`);

    try {
      const { data, error } = await this.supabase
        .from('webauthn_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('❌ WebAuthn 세션 조회 실패:', error);
        return null;
      }

      if (!data) {
        console.log(`🔍 WebAuthn 세션 없음: ${sessionId}`);
        return null;
      }

      console.log(`✅ WebAuthn 세션 조회 성공: ${sessionId}`);
      return data;
    } catch (error) {
      console.error('💥 WebAuthn 세션 조회 오류:', error);
      return null;
    }
  }

  public async deleteWebAuthnSession(sessionId: string): Promise<boolean> {
    console.log(`🗑️ WebAuthn 세션 삭제: ${sessionId}`);

    try {
      const { error } = await this.supabase
        .from('webauthn_sessions')
        .update({ is_active: false })
        .eq('id', sessionId);

      if (error) {
        console.error('❌ WebAuthn 세션 삭제 실패:', error);
        return false;
      }

      console.log(`✅ WebAuthn 세션 삭제 성공: ${sessionId}`);
      return true;
    } catch (error) {
      console.error('💥 WebAuthn 세션 삭제 오류:', error);
      return false;
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
  // 🎫 AI Passport 관리 (1번 + 2번 기능 융합)
  // ============================================================================

  public async getPassport(did: string): Promise<any | null> {
    console.log(`🎫 Passport 조회: ${did}`);

    try {
      const { data, error } = await this.supabase
        .from('ai_passports')
        .select('*')
        .eq('did', did)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Passport 조회 실패:', error);
        return null;
      }

      if (!data) {
        console.log(`🔍 Passport 없음: ${did}`);
        return null;
      }

      console.log(`✅ Passport 조회 성공: ${did}`);
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
  // 💎 CUE 토큰 관리 (1번 + 2번 기능 융합)
  // ============================================================================

  public async getCUEBalance(userDid: string): Promise<number> {
    console.log(`💰 CUE 잔액 조회: ${userDid}`);

    try {
      // 2번에서 개선된 방식: 사용자 테이블에서 직접 조회
      const user = await this.getUserByDID(userDid);
      if (!user) {
        console.log(`❌ 사용자 없음: ${userDid}`);
        return 0;
      }

      const balance = user.cue_tokens || 0;
      console.log(`✅ CUE 잔액: ${balance}`);
      return balance;
    } catch (error) {
      console.error('❌ CUE 잔액 조회 실패:', error);
      return 0;
    }
  }

  public async createCUETransaction(transaction: any): Promise<any> {
    console.log('💰 === CUE 거래 생성 ===');

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

      if (error) {
        console.error('❌ CUE 거래 생성 실패:', error);
        throw error;
      }
      
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

  // 호환성 별칭들
  public async recordCueTransaction(transactionData: any): Promise<any> {
    return this.createCUETransaction(transactionData);
  }

  // 2번에서 추가된 메서드
  public async updateUserCueBalance(userId: string, newBalance: number): Promise<any> {
    return this.updateUser(userId, { cue_tokens: newBalance });
  }

  // ============================================================================
  // 🗄️ 데이터 볼트 관리 (1번 + 2번 기능 융합)
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
   * 볼트 통계 업데이트
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
   * 사용자 볼트 통계 조회
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
  // 🧠 Personal CUE 관리 (1번 + 2번 기능 융합)
  // ============================================================================

  public async getPersonalCues(userDid: string, limit = 50): Promise<any[]> {
    console.log(`🔍 Personal CUEs 조회: ${userDid}`);

    try {
      const { data, error } = await this.supabase
        .from('personal_cues')
        .select('*')
        .or(`user_did.eq.${userDid},user_id.eq.${userDid}`)
        .eq('status', 'active')
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ Personal CUEs 조회 실패:', error);
        return [];
      }

      console.log(`✅ Personal CUEs 조회 성공: ${data?.length || 0}개`);
      return data || [];
    } catch (error) {
      console.error('❌ Personal CUE 조회 실패:', error);
      return [];
    }
  }

  public async storePersonalCue(cueData: any): Promise<any> {
    console.log('🧠 === Personal CUE 저장 ===');

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

      if (error) {
        console.error('❌ Personal CUE 저장 실패:', error);
        throw error;
      }
      
      console.log('✅ Personal CUE 저장 성공:', data.id);
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

  // 호환성 별칭들
  public async getPersonalCuesByUser(userDid: string): Promise<any[]> {
    return this.getPersonalCues(userDid);
  }

  public async createPersonalCue(cueData: any): Promise<any> {
    return this.storePersonalCue(cueData);
  }

  public async addPersonalCue(cueData: any): Promise<any> {
    return this.storePersonalCue(cueData);
  }

  // 2번에서 추가된 메서드
  public async savePersonalCue(cueData: any): Promise<any> {
    return this.storePersonalCue(cueData);
  }

  // ============================================================================
  // 💬 대화 및 메시지 관리 (1번 + 2번 기능 융합)
  // ============================================================================

  public async createConversation(conversationData: any): Promise<any> {
    console.log('💬 === 대화 생성 ===');

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

      if (error) {
        console.error('❌ 대화 생성 실패:', error);
        throw error;
      }

      console.log('✅ 대화 생성 성공:', data.id);
      return data;
    } catch (error) {
      console.error('❌ 대화 생성 실패:', error);
      throw error;
    }
  }

  public async saveMessage(messageData: any): Promise<any> {
    console.log('📨 === 메시지 저장 ===');

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

      if (error) {
        console.error('❌ 메시지 저장 실패:', error);
        throw error;
      }
      
      console.log('✅ 메시지 저장 성공:', data.id);
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
    console.log(`📜 대화 기록 조회: ${userDid}`);

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
      if (error) {
        console.error('❌ 대화 기록 조회 실패:', error);
        throw error;
      }
      
      console.log(`✅ 대화 기록 조회 성공: ${data?.length || 0}개`);
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
  // 🤖 AI Agents 관리
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
  // 📱 플랫폼 연동 관리
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
  // 📋 시스템 활동 로그
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
  // 🔧 유틸리티 및 통계 (1번 + 2번 기능 융합)
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

  // 2번에서 추가된 헬스체크 메서드
  public async getHealth(): Promise<any> {
    try {
      const { data: usersCount } = await this.supabase
        .from('users')
        .select('count', { count: 'exact', head: true });

      const { data: credentialsCount } = await this.supabase
        .from('webauthn_credentials')
        .select('count', { count: 'exact', head: true });

      return {
        status: 'healthy',
        connected: this.connected,
        tables: {
          users: usersCount || 0,
          credentials: credentialsCount || 0
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        connected: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // 2번에서 추가된 진단 메서드
  public async runDiagnostics(): Promise<void> {
    console.log('🔍 === 데이터베이스 진단 ===');

    const tables = [
      'users',
      'webauthn_credentials',
      'webauthn_sessions',
      'conversations',
      'messages',
      'personal_cues',
      'cue_transactions',
      'ai_passports',
      'data_vaults'
    ];

    for (const table of tables) {
      try {
        const { count, error } = await this.supabase
          .from(table)
          .select('*', { count: 'exact', head: true });

        if (error) {
          console.log(`❌ ${table}: 오류 - ${error.message}`);
        } else {
          console.log(`📊 ${table}: ${count}개 레코드`);
        }
      } catch (error) {
        console.log(`💥 ${table}: 접근 불가`);
      }
    }

    console.log('🎯 === 진단 완료 ===');
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

  /**
   * DI Container에서 호출하는 정리 메서드 (2번에서 추가)
   */
  public dispose(): void {
    console.log('🧹 DatabaseService 정리 중...');
    this.connected = false;
    console.log('✅ DatabaseService 정리 완료');
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