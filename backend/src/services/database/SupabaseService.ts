// ============================================================================
// 🗄️ Supabase 데이터베이스 서비스 (수정된 완전한 버전)
// 경로: backend/src/services/database/SupabaseService.ts
// 용도: Supabase 클라이언트 및 데이터베이스 연산 관리
// 수정사항: 메서드명 통일, 누락된 메서드 추가, 에러 처리 개선
// ============================================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// 환경 변수 확인
const supabaseUrl = process.env.SUPABASE_URL || 'https://dummy.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy_service_key';

// Supabase 클라이언트 생성
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// ============================================================================
// 📋 SupabaseService 클래스 (수정된 완전한 구현)
// ============================================================================

export class SupabaseService {
  private client: SupabaseClient;

  constructor() {
    this.client = supabase;
  }

  // ============================================================================
  // 👤 사용자 관리 메서드 (수정됨 - 메서드명 통일 및 기능 추가)
  // ============================================================================

  async createUser(userData: any) {
    try {
      if (supabaseUrl.includes('dummy')) {
        console.log('📋 Mock 사용자 생성:', userData.username || userData.email);
        return { 
          id: userData.id || `user-${Date.now()}`, 
          ...userData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      }

      const { data, error } = await this.client
        .from('users')
        .insert([userData])
        .select()
        .single();

      if (error) {
        console.error('❌ 사용자 생성 실패:', error);
        return null;
      }

      console.log('✅ 사용자 생성 성공:', data.id);
      return data;
    } catch (error) {
      console.error('❌ 사용자 생성 오류:', error);
      return null;
    }
  }

  // 수정됨: getUserById로 메서드명 통일
  async getUserById(userId: string): Promise<any | null> {
    try {
      if (supabaseUrl.includes('dummy')) {
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

      const { data, error } = await this.client
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

  // 기존 메서드 유지 (하위 호환성)
  async findUserById(id: string) {
    return this.getUserById(id);
  }

  // 수정됨: 이메일로 사용자 조회 (WebAuthn에서 필요)
  async findUserByEmail(email: string) {
    try {
      if (supabaseUrl.includes('dummy')) {
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

      const { data, error } = await this.client
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

  // 수정됨: updateUser 메서드 (ID로 업데이트)
  async updateUser(id: string, updates: any) {
    try {
      if (supabaseUrl.includes('dummy')) {
        console.log('📋 Mock 사용자 업데이트:', id, updates);
        return { 
          id, 
          ...updates,
          updated_at: new Date().toISOString()
        };
      }

      const { data, error } = await this.client
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
        return null;
      }

      console.log('✅ 사용자 업데이트 성공:', id);
      return data;
    } catch (error) {
      console.error('❌ 사용자 업데이트 오류:', error);
      return null;
    }
  }

  // 새로 추가됨: 채팅 메시지 저장 (누락되었던 메서드)
  async saveChatMessage(messageData: any): Promise<void> {
    try {
      if (supabaseUrl.includes('dummy')) {
        console.log('📋 Mock 채팅 메시지 저장:', messageData.message_type);
        return;
      }

      const { error } = await this.client
        .from('chat_messages')
        .insert([messageData]);
        
      if (error) {
        throw new Error(`Failed to save chat message: ${error.message}`);
      }

      console.log('✅ 채팅 메시지 저장 성공:', messageData.id);
    } catch (error) {
      console.error('❌ 채팅 메시지 저장 오류:', error);
      throw error;
    }
  }

  // 새로 추가됨: CUE 거래 기록 (누락되었던 메서드)
  async recordCueTransaction(transactionData: any) {
    try {
      if (supabaseUrl.includes('dummy')) {
        console.log('📋 Mock CUE 거래 기록:', transactionData.amount);
        return {
          id: `tx-${Date.now()}`,
          ...transactionData,
          created_at: new Date().toISOString()
        };
      }

      const { data, error } = await this.client
        .from('cue_transactions')
        .insert([{
          ...transactionData,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        console.error('❌ CUE 거래 기록 실패:', error);
        return null;
      }

      console.log('✅ CUE 거래 기록 성공:', data.id);
      return data;
    } catch (error) {
      console.error('❌ CUE 거래 기록 오류:', error);
      return null;
    }
  }

  // ============================================================================
  // 🔐 WebAuthn 자격증명 관리 메서드 (수정됨)
  // ============================================================================

  async saveWebAuthnCredential(credentialData: any) {
    try {
      if (supabaseUrl.includes('dummy')) {
        console.log('📋 Mock 자격증명 저장:', credentialData.user_id);
        return true;
      }

      const { data, error } = await this.client
        .from('webauthn_credentials')
        .insert([credentialData])
        .select()
        .single();

      if (error) {
        console.error('❌ WebAuthn 자격증명 저장 실패:', error);
        return false;
      }

      console.log('✅ WebAuthn 자격증명 저장 성공:', data.id);
      return true;
    } catch (error) {
      console.error('❌ WebAuthn 자격증명 저장 오류:', error);
      return false;
    }
  }

  async getWebAuthnCredentials(userId: string) {
    try {
      if (supabaseUrl.includes('dummy')) {
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

      const { data, error } = await this.client
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

  // 수정됨: credential_id로 자격증명 조회 (로그인에서 필수)
  async getWebAuthnCredentialById(credentialId: string) {
    try {
      if (supabaseUrl.includes('dummy')) {
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

      const { data, error } = await this.client
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

  async updateWebAuthnCredentialCounter(credentialId: string, counter: number) {
    try {
      if (supabaseUrl.includes('dummy')) {
        console.log('📋 Mock 카운터 업데이트:', credentialId, counter);
        return true;
      }

      const { error } = await this.client
        .from('webauthn_credentials')
        .update({ 
          counter: counter, 
          last_used: new Date().toISOString() 
        })
        .eq('credential_id', credentialId);

      if (error) {
        console.error('❌ WebAuthn 카운터 업데이트 실패:', error);
        return false;
      }

      console.log('✅ WebAuthn 카운터 업데이트 성공:', credentialId);
      return true;
    } catch (error) {
      console.error('❌ WebAuthn 카운터 업데이트 오류:', error);
      return false;
    }
  }

  // ============================================================================
  // 🎫 AI Passport 관리 메서드 (수정됨)
  // ============================================================================

  async getPassport(did: string) {
    try {
      if (supabaseUrl.includes('dummy')) {
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

      const { data, error } = await this.client
        .from('ai_passports')
        .select('*')
        .eq('did', did)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Passport 조회 실패:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('❌ Passport 조회 오류:', error);
      return null;
    }
  }

  async updatePassport(did: string, updates: any) {
    try {
      if (supabaseUrl.includes('dummy')) {
        console.log('📋 Mock Passport 업데이트:', did, Object.keys(updates));
        return { 
          id: 'mock-passport-id', 
          did, 
          ...updates, 
          updated_at: new Date().toISOString() 
        };
      }

      const { data, error } = await this.client
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
        return null;
      }

      console.log('✅ Passport 업데이트 성공:', did);
      return data;
    } catch (error) {
      console.error('❌ Passport 업데이트 오류:', error);
      return null;
    }
  }

  // ============================================================================
  // 💎 CUE 토큰 관리 메서드 (수정됨)
  // ============================================================================

  async createCUETransaction(transaction: any) {
    try {
      if (supabaseUrl.includes('dummy')) {
        console.log('📋 Mock CUE 거래 생성:', transaction.amount);
        return {
          id: `cue-tx-${Date.now()}`,
          ...transaction,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      }

      const { data, error } = await this.client
        .from('cue_transactions')
        .insert([{
          ...transaction,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        console.error('❌ CUE 거래 생성 실패:', error);
        return null;
      }

      console.log('✅ CUE 거래 생성 성공:', data.id);
      return data;
    } catch (error) {
      console.error('❌ CUE 거래 생성 오류:', error);
      return null;
    }
  }

  async getCUEBalance(did: string): Promise<number> {
    try {
      if (supabaseUrl.includes('dummy')) {
        console.log('📋 Mock CUE 잔액 조회:', did);
        return 15428.75;
      }

      const { data, error } = await this.client
        .from('cue_transactions')
        .select('amount')
        .eq('user_did', did)
        .eq('status', 'completed');

      if (error) {
        console.error('❌ CUE 잔액 조회 실패:', error);
        return 0;
      }
      
      const balance = data?.reduce((sum, tx) => sum + parseFloat(tx.amount.toString()), 0) || 0;
      return Math.round(balance * 100) / 100;
    } catch (error) {
      console.error('❌ CUE 잔액 조회 오류:', error);
      return 0;
    }
  }

  // ============================================================================
  // 🗄️ 데이터 볼트 관리 메서드 (추가됨)
  // ============================================================================

  async getDataVaults(did: string) {
    try {
      if (supabaseUrl.includes('dummy')) {
        console.log('📋 Mock 데이터 볼트 조회:', did);
        return [
          {
            id: 'vault-1',
            owner_did: did,
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

      const { data, error } = await this.client
        .from('data_vaults')
        .select('*')
        .eq('owner_did', did)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ 데이터 볼트 조회 실패:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ 데이터 볼트 조회 오류:', error);
      return [];
    }
  }

  // ============================================================================
  // 🏥 연결 테스트 메서드
  // ============================================================================

  async testConnection() {
    try {
      if (supabaseUrl.includes('dummy')) {
        console.log('⚠️ 더미 Supabase 설정 - 연결 테스트 건너뛰기');
        console.log('✅ 실제 Supabase 설정 시 연결 테스트가 수행됩니다');
        return true;
      }

      const { data, error } = await this.client
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

  // ============================================================================
  // 🧹 유틸리티 및 정리 메서드
  // ============================================================================

  async cleanupExpiredSessions() {
    try {
      if (supabaseUrl.includes('dummy')) {
        console.log('📋 Mock 만료된 세션 정리');
        return true;
      }

      const { error } = await this.client
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

  async getSystemStats() {
    try {
      if (supabaseUrl.includes('dummy')) {
        console.log('📋 Mock 시스템 통계 조회');
        return {
          totalUsers: 1,
          activeUsers: 1,
          totalCueTokens: 15428,
          totalTransactions: 25,
          timestamp: new Date().toISOString()
        };
      }

      // 실제 통계 조회 로직
      const [usersResult, activeUsersResult] = await Promise.all([
        this.client.from('users').select('count').single(),
        this.client
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
// ============================================================================
  // 🧠 Personal CUE 관련 메서드들 (새로 추가)
  // ============================================================================

  /**
   * 사용자의 모든 Personal CUE 조회
   */
  async getPersonalCuesByUser(userDid: string) {
    try {
      if (supabaseUrl.includes('dummy')) {
        // Mock 데이터 반환
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

      const { data, error } = await this.client
        .from('personal_cues')
        .select('*')
        .eq('user_did', userDid)
        .eq('is_active', true)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data || [];

    } catch (error) {
      console.error('Personal CUE 조회 오류:', error);
      return [];
    }
  }

  /**
   * 특정 Personal CUE 조회
   */
  async getPersonalCue(userDid: string, cueKey: string, cueType: string) {
    try {
      if (supabaseUrl.includes('dummy')) {
        return null; // Mock에서는 기존 CUE 없음으로 처리
      }

      const { data, error } = await this.client
        .from('personal_cues')
        .select('*')
        .eq('user_did', userDid)
        .eq('cue_key', cueKey)
        .eq('cue_type', cueType)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = 결과 없음
      return data;

    } catch (error) {
      console.error('개별 Personal CUE 조회 오류:', error);
      return null;
    }
  }

  /**
   * 새로운 Personal CUE 생성
   */
  async createPersonalCue(cueData: any) {
    try {
      if (supabaseUrl.includes('dummy')) {
        console.log('📋 Mock Personal CUE 생성:', cueData.cue_key);
        return { 
          id: `cue_${Date.now()}`, 
          ...cueData,
          created_at: new Date().toISOString()
        };
      }

      const { data, error } = await this.client
        .from('personal_cues')
        .insert(cueData)
        .select()
        .single();

      if (error) throw error;
      return data;

    } catch (error) {
      console.error('Personal CUE 생성 오류:', error);
      throw error;
    }
  }

  /**
   * 기존 Personal CUE 업데이트
   */
  async updatePersonalCue(cueId: string, updateData: any) {
    try {
      if (supabaseUrl.includes('dummy')) {
        console.log('📋 Mock Personal CUE 업데이트:', cueId);
        return { 
          id: cueId, 
          ...updateData,
          updated_at: new Date().toISOString()
        };
      }

      const { data, error } = await this.client
        .from('personal_cues')
        .update(updateData)
        .eq('id', cueId)
        .select()
        .single();

      if (error) throw error;
      return data;

    } catch (error) {
      console.error('Personal CUE 업데이트 오류:', error);
      throw error;
    }
  }

  /**
   * Dummy 모드 확인 (기존 메서드 활용)
   */
  private isDummy(): boolean {
    return supabaseUrl.includes('dummy') || false;
  }

}

// 기본 SupabaseService 인스턴스 내보내기
export const supabaseService = new SupabaseService();

// 연결 테스트 함수 (하위 호환성)
export async function testDatabaseConnection() {
  return await supabaseService.testConnection();
}

// 초기화 시 연결 테스트
console.log('🗄️ SupabaseService 초기화 중...');
testDatabaseConnection();

export default supabaseService;