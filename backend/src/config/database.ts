// ============================================================================
// 📁 backend/src/config/database.ts
// 데이터베이스 설정 및 연결 관리
// ============================================================================

import { createClient } from '@supabase/supabase-js';

export class DatabaseConfig {
  private static supabase: any = null;
  private static useDatabase = false;

  static async initialize() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && supabaseKey && !supabaseUrl.includes('dummy')) {
      try {
        this.supabase = createClient(supabaseUrl, supabaseKey);
        this.useDatabase = true;
        console.log('✅ Supabase 클라이언트 초기화 성공');
      } catch (error: any) {
        console.warn('⚠️ Supabase 초기화 실패, Mock 데이터베이스 사용:', error.message);
      }
    } else {
      console.warn('⚠️ Supabase 환경변수 없음, Mock 데이터베이스 사용');
    }
  }

  static async checkConnection() {
    if (!this.useDatabase) return { type: 'mock', connected: true };
    
    try {
      const { data, error } = await this.supabase.from('users').select('count').limit(1);
      return { 
        type: 'supabase', 
        connected: !error,
        error: error?.message 
      };
    } catch (error: any) {
      return { 
        type: 'supabase', 
        connected: false, 
        error: error.message 
      };
    }
  }

  static async getHealthStatus() {
    const connection = await this.checkConnection();
    
    return {
      status: connection.connected ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      version: '4.0.0',
      environment: process.env.NODE_ENV || 'development',
      database: connection,
      services: {
        webauthn: true,
        ai: !!process.env.OPENAI_API_KEY || !!process.env.ANTHROPIC_API_KEY,
        cue: true,
        vault: true,
        session: true
      },
      uptime: process.uptime(),
      memory: process.memoryUsage()
    };
  }

  static async disconnect() {
    if (this.supabase) {
      console.log('📊 데이터베이스 연결 종료');
    }
  }

  static getClient() {
    return this.supabase;
  }

  static isUsingDatabase() {
    return this.useDatabase;
  }
}






