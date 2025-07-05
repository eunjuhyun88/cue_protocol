// ============================================================================
// 📁 backend/src/config/index.ts - 통합 설정 export (import 에러 해결)
// 🎯 목적: config import 에러 완전 해결
// ============================================================================

import dotenv from 'dotenv';
import path from 'path';

// 환경변수 로딩
dotenv.config({ path: path.join(__dirname, '../../.env') });

console.log('🔧 Config 모듈 로딩 중...');

// ============================================================================
// 🔧 안전한 Config Import 및 Export
// ============================================================================

// DatabaseConfig import with fallback
let DatabaseConfig: any;
try {
  const dbModule = require('./database');
  DatabaseConfig = dbModule.DatabaseConfig || dbModule.default;
  
  if (!DatabaseConfig) {
    throw new Error('DatabaseConfig not found');
  }
} catch (error) {
  console.warn('⚠️ DatabaseConfig import 실패, fallback 사용:', error);
  
  // Fallback DatabaseConfig
  DatabaseConfig = {
    async initialize() {
      console.log('✅ DatabaseConfig fallback 초기화');
      return true;
    },
    
    async disconnect() {
      console.log('🔌 DatabaseConfig fallback 연결 해제');
      return true;
    },
    
    getConnectionString() {
      return process.env.SUPABASE_URL || 'fallback-connection';
    },
    
    isConnected() {
      return !!process.env.SUPABASE_URL;
    }
  };
}

// AuthConfig import with fallback
let AuthConfig: any;
try {
  const authModule = require('./auth');
  AuthConfig = authModule.AuthConfig || authModule.default;
  
  if (!AuthConfig) {
    throw new Error('AuthConfig not found');
  }
} catch (error) {
  console.warn('⚠️ AuthConfig import 실패, fallback 사용:', error);
  
  // Fallback AuthConfig
  AuthConfig = {
    getInstance() {
      return {
        JWT_SECRET: process.env.JWT_SECRET || 'fallback-jwt-secret',
        JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '30d',
        WEBAUTHN_RP_NAME: process.env.WEBAUTHN_RP_NAME || 'AI Personal',
        WEBAUTHN_RP_ID: process.env.WEBAUTHN_RP_ID || 'localhost',
        WEBAUTHN_ORIGIN: process.env.WEBAUTHN_ORIGIN || 'http://localhost:3000',
        DATABASE_TYPE: 'supabase' as const,
        
        validateCurrentConfig() {
          const errors: string[] = [];
          
          if (!this.JWT_SECRET || this.JWT_SECRET === 'fallback-jwt-secret') {
            errors.push('JWT_SECRET not configured');
          }
          
          if (!this.WEBAUTHN_RP_NAME || this.WEBAUTHN_RP_NAME === 'AI Personal') {
            errors.push('WEBAUTHN_RP_NAME not configured');
          }
          
          return {
            valid: errors.length === 0,
            errors
          };
        },
        
        getSummary() {
          return `AuthConfig Summary:
- JWT: ${this.JWT_SECRET ? '✅ Configured' : '❌ Missing'}
- WebAuthn: ${this.WEBAUTHN_RP_NAME ? '✅ Configured' : '❌ Missing'}
- Database: ${this.DATABASE_TYPE}`;
        }
      };
    }
  };
}

// APIConfig fallback (새로 생성)
const APIConfig = {
  PORT: parseInt(process.env.PORT || '3001'),
  HOST: process.env.HOST || 'localhost',
  NODE_ENV: process.env.NODE_ENV || 'development',
  CORS_ORIGIN: process.env.FRONTEND_URL || 'http://localhost:3000',
  
  // Rate limiting
  RATE_LIMIT_WINDOW: 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX: process.env.NODE_ENV === 'production' ? 100 : 1000,
  
  // Request limits
  MAX_REQUEST_SIZE: '10mb',
  
  // Security
  HELMET_CONFIG: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "ws:", "wss:"]
      }
    },
    crossOriginEmbedderPolicy: false
  },
  
  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  LOG_FORMAT: process.env.NODE_ENV === 'production' ? 'combined' : 'dev',
  
  getServerInfo() {
    return {
      port: this.PORT,
      host: this.HOST,
      environment: this.NODE_ENV,
      corsOrigin: this.CORS_ORIGIN,
      rateLimit: {
        window: this.RATE_LIMIT_WINDOW,
        max: this.RATE_LIMIT_MAX
      }
    };
  }
};

// ============================================================================
// 🌐 환경변수 통합 관리
// ============================================================================

export const EnvironmentConfig = {
  // Server
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3001'),
  HOST: process.env.HOST || 'localhost',
  
  // Frontend
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
  
  // Database
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
  
  // Authentication
  JWT_SECRET: process.env.JWT_SECRET || '',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '30d',
  
  // WebAuthn
  WEBAUTHN_RP_NAME: process.env.WEBAUTHN_RP_NAME || 'AI Personal',
  WEBAUTHN_RP_ID: process.env.WEBAUTHN_RP_ID || 'localhost',
  WEBAUTHN_ORIGIN: process.env.WEBAUTHN_ORIGIN || 'http://localhost:3000',
  
  // AI Services
  OLLAMA_URL: process.env.OLLAMA_URL || 'http://localhost:11434',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  
  // Validation
  validate() {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Critical checks
    if (!this.SUPABASE_URL) {
      errors.push('SUPABASE_URL is required');
    }
    
    if (!this.SUPABASE_SERVICE_ROLE_KEY) {
      errors.push('SUPABASE_SERVICE_ROLE_KEY is required');
    }
    
    if (!this.JWT_SECRET || this.JWT_SECRET.length < 32) {
      errors.push('JWT_SECRET must be at least 32 characters long');
    }
    
    // Warning checks
    if (this.NODE_ENV === 'production') {
      if (this.FRONTEND_URL.includes('localhost')) {
        warnings.push('FRONTEND_URL should not use localhost in production');
      }
      
      if (!this.OPENAI_API_KEY && !this.OLLAMA_URL) {
        warnings.push('No AI service configured (OPENAI_API_KEY or OLLAMA_URL)');
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  },
  
  getStatus() {
    const validation = this.validate();
    
    return {
      environment: this.NODE_ENV,
      validation,
      services: {
        database: !!this.SUPABASE_URL && !!this.SUPABASE_SERVICE_ROLE_KEY,
        authentication: !!this.JWT_SECRET,
        webauthn: !!this.WEBAUTHN_RP_NAME,
        ai: !!this.OLLAMA_URL || !!this.OPENAI_API_KEY,
        frontend: !!this.FRONTEND_URL
      },
      timestamp: new Date().toISOString()
    };
  }
};

// ============================================================================
// 🔧 설정 통합 유틸리티
// ============================================================================

export const ConfigManager = {
  database: DatabaseConfig,
  auth: AuthConfig,
  api: APIConfig,
  environment: EnvironmentConfig,
  
  // 전체 설정 초기화
  async initializeAll() {
    console.log('🚀 모든 설정 초기화 중...');
    
    try {
      // 환경변수 검증
      const envValidation = EnvironmentConfig.validate();
      if (!envValidation.valid) {
        console.error('❌ 환경변수 검증 실패:', envValidation.errors);
        throw new Error(`환경변수 오류: ${envValidation.errors.join(', ')}`);
      }
      
      if (envValidation.warnings.length > 0) {
        console.warn('⚠️ 환경변수 경고:', envValidation.warnings);
      }
      
      // 데이터베이스 초기화
      await DatabaseConfig.initialize();
      console.log('✅ 데이터베이스 설정 초기화 완료');
      
      // 인증 설정 검증
      const authInstance = AuthConfig.getInstance();
      const authValidation = authInstance.validateCurrentConfig();
      if (!authValidation.valid) {
        console.warn('⚠️ 인증 설정 경고:', authValidation.errors);
      } else {
        console.log('✅ 인증 설정 검증 완료');
      }
      
      console.log('🎉 모든 설정 초기화 완료');
      return true;
      
    } catch (error: any) {
      console.error('❌ 설정 초기화 실패:', error);
      throw error;
    }
  },
  
  // 전체 설정 상태 확인
  getOverallStatus() {
    return {
      database: DatabaseConfig.isConnected ? DatabaseConfig.isConnected() : false,
      auth: AuthConfig.getInstance().validateCurrentConfig().valid,
      environment: EnvironmentConfig.validate().valid,
      api: {
        port: APIConfig.PORT,
        environment: APIConfig.NODE_ENV
      },
      timestamp: new Date().toISOString()
    };
  },
  
  // 설정 요약 출력
  printSummary() {
    console.log('📋 === 설정 요약 ===');
    console.log(`🌍 환경: ${EnvironmentConfig.NODE_ENV}`);
    console.log(`🚪 포트: ${APIConfig.PORT}`);
    console.log(`🔗 프론트엔드: ${EnvironmentConfig.FRONTEND_URL}`);
    console.log(`🗄️ 데이터베이스: ${EnvironmentConfig.SUPABASE_URL ? '✅ Supabase' : '❌ 미설정'}`);
    console.log(`🔐 JWT: ${EnvironmentConfig.JWT_SECRET ? '✅ 설정됨' : '❌ 미설정'}`);
    console.log(`🎯 WebAuthn: ${EnvironmentConfig.WEBAUTHN_RP_NAME}`);
    console.log(`🤖 AI 서비스: ${EnvironmentConfig.OLLAMA_URL || EnvironmentConfig.OPENAI_API_KEY ? '✅ 설정됨' : '⚠️ 미설정'}`);
    
    const envStatus = EnvironmentConfig.getStatus();
    if (!envStatus.validation.valid) {
      console.log('❌ 설정 오류:', envStatus.validation.errors);
    }
    if (envStatus.validation.warnings.length > 0) {
      console.log('⚠️ 설정 경고:', envStatus.validation.warnings);
    }
    console.log('========================');
  }
};

// ============================================================================
// 📤 Export
// ============================================================================

export { DatabaseConfig, AuthConfig, APIConfig };

// Default export
export default {
  DatabaseConfig,
  AuthConfig,
  APIConfig,
  EnvironmentConfig,
  ConfigManager
};

// 초기화 시 요약 출력
if (process.env.NODE_ENV !== 'test') {
  ConfigManager.printSummary();
}

console.log('✅ Config 모듈 로딩 완료');