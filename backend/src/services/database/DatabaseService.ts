// ============================================================================
// 🗄️ 통합 데이터베이스 서비스 (최종 완성본)
// 경로: backend/src/services/database/DatabaseService.ts
// 수정: Document 1 + Document 2 완전 통합, source_platform 컬럼 적용
// 호출구조: DIContainer → DatabaseService → Supabase
// ============================================================================

import dotenv from 'dotenv';
import path from 'path';

// 환경 변수 강제 로딩 (프로젝트 루트의 .env)
const envPath = path.join(__dirname, '../../../.env');
dotenv.config({ path: envPath });

// 환경 변수 즉시 확인 및 로깅
console.log('🔧 DatabaseService 환경변수 로딩 상태:');
console.log(`📍 .env 경로: ${envPath}`);
console.log('- SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ 설정됨' : '❌ 누락');
console.log('- SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ 설정됨' : '❌ 누락');

import { createClient, SupabaseClient } from '@supabase/supabase-js';
// Database 타입이 없으면 any로 대체
let Database: any;
try {
  Database = require('../../types/database.types').Database;
} catch {
  console.log('⚠️ database.types를 찾을 수 없어 any 타입 사용');
}

export class DatabaseService {
  private static instance: DatabaseService;
  private supabase: SupabaseClient<any>;
  private connected: boolean = false;
  private connectionAttempts: number = 0;
  private maxRetries: number = 3;
  private connectionError: string | null = null;

  private constructor() {
    console.log('🗄️ === DatabaseService 초기화 (실제 Supabase 전용) ===');
    this.initializeSupabase();
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  // ============================================================================
  // 🔧 Supabase 초기화 (강화된 환경변수 검증)
  // ============================================================================

  private initializeSupabase(): void {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    console.log('🔑 환경변수 최종 확인:', {
      SUPABASE_URL: supabaseUrl ? `✅ 설정됨 (${supabaseUrl.split('//')[1]?.split('.')[0]})` : '❌ 누락',
      SUPABASE_SERVICE_ROLE_KEY: supabaseKey ? `✅ 설정됨 (${supabaseKey.length}자)` : '❌ 누락'
    });

    if (!supabaseUrl || !supabaseKey) {
      this.connectionError = `❌ 필수 환경변수 누락: SUPABASE_URL=${!!supabaseUrl}, SUPABASE_SERVICE_ROLE_KEY=${!!supabaseKey}`;
      console.error(this.connectionError);
      throw new Error(this.connectionError);
    }

    // 더미값 검증
    if (supabaseUrl.includes('dummy') || supabaseUrl.includes('your-') || 
        supabaseKey.includes('dummy') || supabaseKey.includes('your-')) {
      this.connectionError = '❌ 더미 환경변수 감지됨. 실제 Supabase URL과 SERVICE_ROLE_KEY가 필요합니다.';
      console.error(this.connectionError);
      throw new Error(this.connectionError);
    }

    try {
      this.supabase = createClient(supabaseUrl, supabaseKey, {
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
      
      // 초기 연결 시도 (비동기, 에러 무시)
      this.connect().catch(error => {
        console.warn('⚠️ 초기 연결 실패 (무시됨):', error.message);
      });
    } catch (error) {
      this.connectionError = `Supabase 클라이언트 생성 실패: ${error}`;
      console.error(`❌ ${this.connectionError}`);
      throw error;
    }
  }

  // ============================================================================
  // 🔌 연결 관리
  // ============================================================================

  public async connect(): Promise<void> {
    if (this.connected) {
      console.log('✅ 이미 연결되어 있습니다.');
      return;
    }

    console.log('🔗 === 데이터베이스 연결 시작 ===');
    
    try {
      this.connectionAttempts++;
      
      // 기본 연결 테스트 (users 테이블로 확인)
      const { data, error } = await this.supabase
        .from('users')
        .select('count', { count: 'exact', head: true });

      if (error) {
        console.error('❌ 연결 테스트 실패:', error);
        throw error;
      }

      console.log('✅ 연결 테스트 성공, 사용자 수:', data || 0);

      // 필수 테이블 존재 확인
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
   * 필수 테이블 존재 확인
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
        // 중요하지 않은 테이블은 건너뛰기
        if (['ai_agents', 'system_activities'].includes(tableName)) {
          console.log(`⚠️ 선택적 테이블 '${tableName}' 건너뛰기`);
          continue;
        }
        throw error;
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
  public getClient(): SupabaseClient<any> {
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
  // 👤 사용자 관리 (핵심 기능만)
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

  public async getUserByDid(did: string): Promise<any | null> {
    return this.getUserByDID(did);
  }

  public async getUserCount(): Promise<number> {
    try {
      const { count, error } = await this.supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.error('❌ 사용자 수 조회 실패:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('❌ 사용자 수 조회 실패:', error);
      return 0;
    }
  }

  // ============================================================================
  // 💎 CUE 토큰 관리 (⭐ 핵심 통합: source_platform 컬럼 사용)
  // ============================================================================

  public async getCUEBalance(userDid: string): Promise<number> {
    console.log(`💰 CUE 잔액 조회: ${userDid}`);

    try {
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

  /**
   * 🚨 핵심 통합: CUE 거래 생성 (source_platform 컬럼 사용)
   * Document 1의 수정사항을 Document 2 구조에 완전 통합
   */
  public async createCUETransaction(transaction: any): Promise<any> {
    console.log('💰 === CUE 거래 생성 (통합된 source_platform 컬럼 적용) ===');

    try {
      // 현재 잔액 계산
      const currentBalance = await this.getCUEBalance(transaction.user_did);
      const newBalance = currentBalance + parseFloat(transaction.amount.toString());

      // ✅ 실제 테이블 스키마에 맞는 컬럼명 사용 (Document 1의 핵심 수정사항 반영)
      const transactionData = {
        user_did: transaction.user_did,                      // ✅ 존재함
        user_id: transaction.user_id,                        // ✅ 존재함  
        transaction_type: transaction.transaction_type || 'mining', // ✅ 존재함
        amount: parseInt(transaction.amount.toString()),     // ✅ integer 타입
        balance_after: parseInt(newBalance.toString()),      // ✅ integer 타입
        source_platform: transaction.source || transaction.source_platform || 'system', // ⭐ 핵심 통합: source_platform 컬럼 사용!
        description: transaction.description || 'CUE transaction',
        status: 'completed',                                 // ✅ 존재함
        metadata: transaction.metadata || {},                // ✅ jsonb 타입
        created_at: new Date().toISOString()
      };

      console.log('📝 CUE 거래 데이터 (통합된 컬럼):', {
        user_did: transactionData.user_did,
        amount: transactionData.amount,
        balance_after: transactionData.balance_after,
        source_platform: transactionData.source_platform, // ⭐ 핵심 표시
        transaction_type: transactionData.transaction_type,
        metadata: JSON.stringify(transactionData.metadata).substring(0, 100)
      });

      const { data, error } = await this.supabase
        .from('cue_transactions')
        .insert([transactionData])
        .select()
        .single();

      if (error) {
        console.error('❌ CUE 거래 생성 실패:', error);
        throw error;
      }
      
      // 사용자 잔액 업데이트
      await this.updateUserCueBalanceByDid(transaction.user_did, newBalance);
      
      console.log('✅ CUE 거래 생성 성공 (통합):', {
        amount: transactionData.amount,
        newBalance,
        source_platform: transactionData.source_platform // ⭐ 핵심 로그
      });
      
      return data;
    } catch (error) {
      console.error('❌ CUE 거래 생성 실패:', error);
      throw error;
    }
  }

  public async getCUETransactions(userDid: string, limit = 50): Promise<any[]> {
    console.log(`📊 CUE 거래 내역 조회: ${userDid} (최대 ${limit}개)`);
    
    try {
      const { data, error } = await this.supabase
        .from('cue_transactions')
        .select('*')
        .eq('user_did', userDid)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ CUE 거래 내역 조회 실패:', error);
        throw error;
      }
      
      console.log(`✅ CUE 거래 내역 조회 성공: ${data?.length || 0}개`);
      return data || [];
    } catch (error) {
      console.error('❌ CUE 거래 내역 조회 실패:', error);
      return [];
    }
  }

  public async updateUserCueBalanceByDid(userDid: string, newBalance: number): Promise<boolean> {
    try {
      console.log(`💰 CUE 잔액 업데이트: ${userDid} → ${newBalance}`);
      
      const { error } = await this.supabase
        .from('users')
        .update({ 
          cue_tokens: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq('did', userDid);

      if (error) {
        console.error('❌ CUE 잔액 업데이트 실패:', error);
        return false;
      }

      console.log(`✅ CUE 잔액 업데이트 성공: ${userDid} → ${newBalance}`);
      return true;
    } catch (error) {
      console.error('❌ CUE 잔액 업데이트 실패:', error);
      return false;
    }
  }

  /**
   * ⭐ Document 1에서 추가된 CUE 통계 조회 (통합)
   */
  public async getCUEStatistics(userDid: string): Promise<any> {
    console.log(`📊 CUE 통계 조회: ${userDid}`);
    
    try {
      // 총 획득량 조회
      const { data: totalEarned, error: earnedError } = await this.supabase
        .from('cue_transactions')
        .select('amount')
        .eq('user_did', userDid)
        .gt('amount', 0);

      if (earnedError) throw earnedError;

      // 총 사용량 조회
      const { data: totalSpent, error: spentError } = await this.supabase
        .from('cue_transactions')
        .select('amount')
        .eq('user_did', userDid)
        .lt('amount', 0);

      if (spentError) throw spentError;

      // 거래 횟수 조회
      const { count: transactionCount, error: countError } = await this.supabase
        .from('cue_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_did', userDid);

      if (countError) throw countError;

      // 최근 거래 조회
      const { data: recentTransactions, error: recentError } = await this.supabase
        .from('cue_transactions')
        .select('*')
        .eq('user_did', userDid)
        .order('created_at', { ascending: false })
        .limit(5);

      if (recentError) throw recentError;

      const statistics = {
        totalEarned: totalEarned?.reduce((sum, tx) => sum + tx.amount, 0) || 0,
        totalSpent: Math.abs(totalSpent?.reduce((sum, tx) => sum + tx.amount, 0) || 0),
        transactionCount: transactionCount || 0,
        recentTransactions: recentTransactions || [],
        currentBalance: await this.getCUEBalance(userDid)
      };

      console.log('✅ CUE 통계 조회 성공 (통합):', {
        totalEarned: statistics.totalEarned,
        totalSpent: statistics.totalSpent,
        transactionCount: statistics.transactionCount,
        currentBalance: statistics.currentBalance
      });

      return statistics;
    } catch (error) {
      console.error('❌ CUE 통계 조회 실패:', error);
      return {
        totalEarned: 0,
        totalSpent: 0,
        transactionCount: 0,
        recentTransactions: [],
        currentBalance: 0
      };
    }
  }

  /**
   * ⭐ Document 1에서 추가된 CUE 마이닝 보상 지급 헬퍼 메서드 (통합)
   */
  public async awardCUETokens(userDid: string, amount: number, reason: string, metadata: any = {}): Promise<any> {
    console.log(`🎁 CUE 토큰 보상 지급: ${userDid} +${amount} (${reason})`);
    
    try {
      const transaction = {
        user_did: userDid,
        user_id: userDid, // DID와 동일하게 설정
        amount: amount,
        transaction_type: 'mining',
        source_platform: metadata.source_platform || 'system', // ⭐ source_platform 사용
        description: `${reason} - ${amount} CUE 보상`,
        metadata: {
          reason,
          timestamp: new Date().toISOString(),
          ...metadata
        }
      };

      const result = await this.createCUETransaction(transaction);
      
      console.log(`✅ CUE 보상 지급 완료 (통합): ${amount} CUE`);
      return result;
    } catch (error) {
      console.error('❌ CUE 보상 지급 실패:', error);
      throw error;
    }
  }

  // 호환성 별칭들 (Document 1의 별칭 + Document 2의 별칭 통합)
  public async recordCueTransaction(transactionData: any): Promise<any> {
    return this.createCUETransaction(transactionData);
  }

  public async updateUserCueBalance(userId: string, newBalance: number): Promise<any> {
    return this.updateUser(userId, { cue_tokens: newBalance });
  }

  public async getUserCueBalance(userDid: string): Promise<number> {
    return this.getCUEBalance(userDid);
  }

  // ============================================================================
  // 🔐 WebAuthn 관리 (Document 2의 핵심 기능 유지)
  // ============================================================================

  public async saveWebAuthnCredential(credentialData: any): Promise<boolean> {
    console.log('🔐 === WebAuthn 자격증명 저장 ===');

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

  // ============================================================================
  // 🎫 AI Passport 관리 (Document 2 간소화 버전 유지)
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
      return data;
    } catch (error) {
      console.error('❌ AI Passport 업데이트 실패:', error);
      throw error;
    }
  }

  // ============================================================================
  // 🗄️ 데이터 볼트 관리 (Document 2 핵심 기능 유지)
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
      return data;
    } catch (error) {
      console.error('❌ 데이터 볼트 생성 실패:', error);
      throw error;
    }
  }

  // ============================================================================
  // 🧠 Personal CUE 관리 (Document 2 핵심 기능 유지)
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
      return data;
    } catch (error) {
      console.error('❌ Personal CUE 저장 실패:', error);
      throw error;
    }
  }

  // ============================================================================
  // 💬 대화 및 메시지 관리 (Document 2 간소화 버전 유지)
  // ============================================================================

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
      return data;
    } catch (error) {
      console.error('❌ 메시지 저장 실패:', error);
      throw error;
    }
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

  // ============================================================================
  // 🔧 유틸리티 및 시스템 관리 (Document 2 핵심 기능 유지)
  // ============================================================================

  public async getHealth(): Promise<any> {
    try {
      const { count: usersCount } = await this.supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      return {
        status: 'healthy',
        connected: this.connected,
        tables: {
          users: usersCount || 0
        },
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      return {
        status: 'unhealthy',
        connected: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

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
   * DI Container에서 호출하는 정리 메서드
   */
  public dispose(): void {
    console.log('🧹 DatabaseService 정리 중...');
    this.connected = false;
    console.log('✅ DatabaseService 정리 완료');
  }
}

// ============================================================================
// 🚀 지연 초기화 및 Export (Document 2 구조 유지)
// ============================================================================

let databaseServiceInstance: DatabaseService | null = null;

/**
 * 지연 초기화된 DatabaseService 인스턴스 반환
 */
export function getDatabaseService(): DatabaseService {
  if (!databaseServiceInstance) {
    console.log('🔄 DatabaseService 지연 초기화 중...');
    databaseServiceInstance = DatabaseService.getInstance();
    
    // 초기화 후 연결 시도 (비동기, 에러 무시)
    databaseServiceInstance.connect().catch(error => {
      console.error('❌ DatabaseService 초기 연결 실패:', error.message);
      console.log('💡 Supabase 환경변수를 확인하세요');
    });
  }
  return databaseServiceInstance;
}

/**
 * 강제 재초기화
 */
export function resetDatabaseService(): void {
  if (databaseServiceInstance && typeof databaseServiceInstance.dispose === 'function') {
    databaseServiceInstance.dispose();
  }
  databaseServiceInstance = null;
  console.log('🔄 DatabaseService 인스턴스 재설정됨');
}

// 기본 export (기존 코드 호환성)
export default {
  getInstance: () => getDatabaseService(),
  reset: resetDatabaseService
};