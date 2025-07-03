// ============================================================================
// 🗄️ 실제 Supabase 데이터베이스 서비스 (Mock 완전 제거)
// 경로: backend/src/services/database/RealDatabaseService.ts
// 목적: Mock 데이터 완전 제거, 실제 Supabase만 사용, 상세 로깅
// ============================================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';

export class RealDatabaseService {
  private static instance: RealDatabaseService;
  private supabase: SupabaseClient;
  private connected: boolean = false;

  private constructor() {
    console.log('🔧 === RealDatabaseService 초기화 시작 ===');
    this.initializeSupabase();
  }

  public static getInstance(): RealDatabaseService {
    if (!RealDatabaseService.instance) {
      RealDatabaseService.instance = new RealDatabaseService();
    }
    return RealDatabaseService.instance;
  }

  private initializeSupabase(): void {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

    console.log('🔑 환경변수 확인:', {
      SUPABASE_URL: supabaseUrl ? '✅ 설정됨' : '❌ 누락',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ 설정됨' : '❌ 누락',
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? '✅ 설정됨' : '❌ 누락',
      사용중인_키: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SERVICE_ROLE' : 'ANON'
    });

    if (!supabaseUrl || !supabaseKey) {
      throw new Error(`❌ Supabase 환경변수 누락: URL=${!!supabaseUrl}, KEY=${!!supabaseKey}`);
    }

    try {
      this.supabase = createClient(supabaseUrl, supabaseKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        },
        db: {
          schema: 'public'
        }
      });

      console.log('✅ Supabase 클라이언트 생성 완료');
      console.log('📍 URL:', supabaseUrl.split('//')[1]?.split('.')[0]);
    } catch (error) {
      console.error('💥 Supabase 클라이언트 생성 실패:', error);
      throw error;
    }
  }

  // ============================================================================
  // 🔌 연결 관리 및 테스트
  // ============================================================================

  public async connect(): Promise<void> {
    console.log('🔗 === 데이터베이스 연결 테스트 시작 ===');
    
    try {
      // 1. 기본 연결 테스트
      const { data: testData, error: testError } = await this.supabase
        .from('users')
        .select('count', { count: 'exact', head: true });

      if (testError) {
        console.error('❌ 기본 연결 테스트 실패:', testError);
        throw testError;
      }

      console.log('✅ 기본 연결 테스트 성공, 사용자 수:', testData || 0);

      // 2. 테이블 존재 확인
      await this.checkRequiredTables();

      this.connected = true;
      console.log('🎉 === 데이터베이스 연결 완료 ===');

    } catch (error) {
      console.error('💥 데이터베이스 연결 실패:', error);
      this.connected = false;
      throw error;
    }
  }

  private async checkRequiredTables(): Promise<void> {
    console.log('📋 필수 테이블 존재 확인 중...');

    const requiredTables = [
      'users',
      'conversations', 
      'messages',
      'personal_cues',
      'ai_agents',
      'webauthn_credentials',
      'webauthn_sessions',
      'cue_transactions'
    ];

    for (const tableName of requiredTables) {
      try {
        const { error } = await this.supabase
          .from(tableName)
          .select('*')
          .limit(1);

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found (정상)
          console.error(`❌ 테이블 '${tableName}' 접근 실패:`, error);
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

  // ============================================================================
  // 👤 사용자 관리 메서드
  // ============================================================================

  public async createUser(userData: any): Promise<any> {
    console.log('👤 === 사용자 생성 시작 ===');
    console.log('📝 입력 데이터:', {
      id: userData.id,
      username: userData.username,
      email: userData.email,
      did: userData.did
    });

    try {
      const { data, error } = await this.supabase
        .from('users')
        .insert([userData])
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

  public async getUserByDid(did: string): Promise<any> {
    console.log(`🔍 DID로 사용자 조회: ${did}`);

    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('did', did)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error(`❌ 사용자 조회 실패 (${did}):`, error);
        throw error;
      }

      if (!data) {
        console.log(`🔍 사용자 없음: ${did}`);
        return null;
      }

      console.log(`✅ 사용자 조회 성공: ${data.username} (${data.id})`);
      return data;
    } catch (error) {
      console.error(`💥 사용자 조회 오류 (${did}):`, error);
      throw error;
    }
  }

  public async getUserById(userId: string): Promise<any> {
    console.log(`🔍 ID로 사용자 조회: ${userId}`);

    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error(`❌ 사용자 조회 실패 (${userId}):`, error);
        throw error;
      }

      if (!data) {
        console.log(`🔍 사용자 없음: ${userId}`);
        return null;
      }

      console.log(`✅ 사용자 조회 성공: ${data.username} (${data.did})`);
      return data;
    } catch (error) {
      console.error(`💥 사용자 조회 오류 (${userId}):`, error);
      throw error;
    }
  }

  // ============================================================================
  // 💬 대화 관리 메서드 (새로 추가)
  // ============================================================================

  public async createConversation(conversationData: any): Promise<any> {
    console.log('💬 === 대화 생성 시작 ===');
    console.log('📝 대화 데이터:', {
      user_id: conversationData.user_id,
      ai_agent_id: conversationData.ai_agent_id,
      title: conversationData.title
    });

    try {
      const { data, error } = await this.supabase
        .from('conversations')
        .insert([conversationData])
        .select()
        .single();

      if (error) {
        console.error('❌ 대화 생성 실패:', error);
        throw error;
      }

      console.log('✅ 대화 생성 성공:', {
        id: data.id,
        title: data.title,
        created_at: data.created_at
      });

      return data;
    } catch (error) {
      console.error('💥 대화 생성 오류:', error);
      throw error;
    }
  }

  public async saveMessage(messageData: any): Promise<any> {
    console.log('📨 === 메시지 저장 시작 ===');
    console.log('📝 메시지 데이터:', {
      conversation_id: messageData.conversation_id,
      role: messageData.role,
      content_length: messageData.content?.length || 0
    });

    try {
      const { data, error } = await this.supabase
        .from('messages')
        .insert([messageData])
        .select()
        .single();

      if (error) {
        console.error('❌ 메시지 저장 실패:', error);
        throw error;
      }

      console.log('✅ 메시지 저장 성공:', {
        id: data.id,
        role: data.role,
        timestamp: data.timestamp
      });

      return data;
    } catch (error) {
      console.error('💥 메시지 저장 오류:', error);
      throw error;
    }
  }

  public async getConversationHistory(userId: string, conversationId?: string, limit: number = 50): Promise<any[]> {
    console.log(`📜 === 대화 기록 조회 ===`);
    console.log('🔍 조회 조건:', {
      userId,
      conversationId: conversationId || 'all',
      limit
    });

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
        .eq('conversations.user_id', userId)
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

      console.log(`✅ 대화 기록 조회 성공: ${data?.length || 0}개 메시지`);
      return data || [];
    } catch (error) {
      console.error('💥 대화 기록 조회 오류:', error);
      throw error;
    }
  }

  // ============================================================================
  // 🧠 Personal Cues 관리 메서드
  // ============================================================================

  public async savePersonalCue(cueData: any): Promise<any> {
    console.log('🧠 === Personal CUE 저장 시작 ===');
    console.log('📝 CUE 데이터:', {
      user_id: cueData.user_id,
      cue_key: cueData.cue_key,
      cue_type: cueData.cue_type,
      cue_category: cueData.cue_category
    });

    try {
      const { data, error } = await this.supabase
        .from('personal_cues')
        .insert([cueData])
        .select()
        .single();

      if (error) {
        console.error('❌ Personal CUE 저장 실패:', error);
        throw error;
      }

      console.log('✅ Personal CUE 저장 성공:', {
        id: data.id,
        cue_key: data.cue_key,
        confidence_score: data.confidence_metrics?.confidence_score
      });

      return data;
    } catch (error) {
      console.error('💥 Personal CUE 저장 오류:', error);
      throw error;
    }
  }

  public async getPersonalCues(userId: string, limit: number = 20): Promise<any[]> {
    console.log(`🔍 === Personal CUEs 조회 ===`);
    console.log('🔍 조회 조건:', { userId, limit });

    try {
      const { data, error } = await this.supabase
        .from('personal_cues')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ Personal CUEs 조회 실패:', error);
        throw error;
      }

      console.log(`✅ Personal CUEs 조회 성공: ${data?.length || 0}개 CUE`);
      return data || [];
    } catch (error) {
      console.error('💥 Personal CUEs 조회 오류:', error);
      throw error;
    }
  }

  // ============================================================================
  // 💰 CUE 토큰 거래 관리
  // ============================================================================

  public async saveCueTransaction(transactionData: any): Promise<any> {
    console.log('💰 === CUE 거래 저장 시작 ===');
    console.log('📝 거래 데이터:', {
      user_id: transactionData.user_id,
      transaction_type: transactionData.transaction_type,
      amount: transactionData.amount,
      balance_after: transactionData.balance_after
    });

    try {
      const { data, error } = await this.supabase
        .from('cue_transactions')
        .insert([transactionData])
        .select()
        .single();

      if (error) {
        console.error('❌ CUE 거래 저장 실패:', error);
        throw error;
      }

      console.log('✅ CUE 거래 저장 성공:', {
        id: data.id,
        amount: data.amount,
        balance_after: data.balance_after
      });

      return data;
    } catch (error) {
      console.error('💥 CUE 거래 저장 오류:', error);
      throw error;
    }
  }

  public async updateUserCueBalance(userId: string, newBalance: number): Promise<any> {
    console.log(`💰 사용자 CUE 잔액 업데이트: ${userId} → ${newBalance}`);

    try {
      const { data, error } = await this.supabase
        .from('users')
        .update({ 
          cue_tokens: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        console.error('❌ CUE 잔액 업데이트 실패:', error);
        throw error;
      }

      console.log(`✅ CUE 잔액 업데이트 성공: ${data.cue_tokens}`);
      return data;
    } catch (error) {
      console.error('💥 CUE 잔액 업데이트 오류:', error);
      throw error;
    }
  }

  // ============================================================================
  // 🔧 유틸리티 메서드
  // ============================================================================

  public isConnected(): boolean {
    return this.connected;
  }

  public getConnectionInfo(): any {
    return {
      type: 'supabase',
      connected: this.connected,
      url: process.env.SUPABASE_URL?.split('//')[1]?.split('.')[0],
      timestamp: new Date().toISOString()
    };
  }

  // ============================================================================
  // 🔍 디버깅 및 테스트 메서드
  // ============================================================================

  public async runDiagnostics(): Promise<void> {
    console.log('🔍 === 데이터베이스 진단 시작 ===');

    try {
      // 1. 테이블별 레코드 수 확인
      const tables = ['users', 'conversations', 'messages', 'personal_cues', 'cue_transactions'];
      
      for (const table of tables) {
        const { count, error } = await this.supabase
          .from(table)
          .select('*', { count: 'exact', head: true });

        if (error) {
          console.log(`❌ ${table}: 오류 - ${error.message}`);
        } else {
          console.log(`📊 ${table}: ${count}개 레코드`);
        }
      }

      console.log('🎯 === 데이터베이스 진단 완료 ===');
    } catch (error) {
      console.error('💥 진단 실행 오류:', error);
    }
  }
}