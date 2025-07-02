'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { 
  Shield, 
  Fingerprint, 
  CheckCircle, 
  AlertCircle, 
  Database, 
  Wifi, 
  WifiOff,
  MessageCircle,
  User,
  Coins,
  Settings,
  LogOut,
  Loader2,
  X,
  Menu,
  Send,
  Mic,
  MicOff,
  Paperclip,
  Sparkles,
  Activity,
  BarChart3,
  Globe,
  Star,
  Zap,
  Brain,
  Target,
  Award,
  Plus,
  RefreshCw,
  ChevronDown,
  Hash,
  Copy,
  Key,
  Eye,
  Clock,
  TrendingUp,
  Heart,
  Coffee
} from 'lucide-react';

// ============================================================================
// 🔧 완전한 데이터 유지 API 클라이언트 (영구 패스키 지원 + 강화된 로깅)
// ============================================================================

// WebAuthn 라이브러리 동적 로드
let startRegistration = null;
let startAuthentication = null;

const loadWebAuthn = async () => {
  if (typeof window !== 'undefined' && !startRegistration) {
    try {
      const webauthn = await import('@simplewebauthn/browser');
      startRegistration = webauthn.startRegistration;
      startAuthentication = webauthn.startAuthentication;
      return true;
    } catch (error) {
      console.error('❌ WebAuthn 라이브러리 로드 실패:', error);
      return false;
    }
  }
  return !!startRegistration;
};

class PersistentDataAPIClient {
  constructor() {
    this.baseURL = (typeof window !== 'undefined' && window.location.hostname === 'localhost') 
      ? 'http://localhost:3001' 
      : 'https://api.cueprotocol.com';
    this.websocket = null;
    this.listeners = new Map();
    this.mockCredentialKey = 'cue_mock_credential';
  }

  connectWebSocket() {
    try {
      this.websocket = new WebSocket(this.baseURL.replace('http', 'ws'));
      this.websocket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        this.listeners.forEach(callback => callback(data));
      };
    } catch (error) {
      console.warn('WebSocket 연결 실패, HTTP 폴백 사용');
    }
  }

  onRealtimeUpdate(callback) {
    const id = Math.random().toString(36);
    this.listeners.set(id, callback);
    return () => this.listeners.delete(id);
  }

  getOrCreateMockCredential() {
    if (typeof window === 'undefined') {
      return {
        id: 'temp_mock_credential',
        type: 'public-key',
        response: {
          attestationObject: 'temp-attestation',
          clientDataJSON: 'temp-client-data'
        }
      };
    }

    try {
      const existingCred = localStorage.getItem(this.mockCredentialKey);
      if (existingCred) {
        const parsed = JSON.parse(existingCred);
        console.log('🔄 기존 Mock 패스키 재사용:', parsed.id);
        return parsed;
      }

      const deviceFingerprint = [
        navigator.userAgent,
        navigator.platform,
        window.screen.width,
        window.screen.height,
        navigator.language,
        Intl.DateTimeFormat().resolvedOptions().timeZone
      ].join('|');

      let hash = 0;
      for (let i = 0; i < deviceFingerprint.length; i++) {
        const char = deviceFingerprint.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      
      const credentialId = `mock_passkey_${Math.abs(hash).toString(36)}`;
      const newCredential = {
        id: credentialId,
        type: 'public-key',
        response: {
          attestationObject: 'mock-attestation-object',
          clientDataJSON: 'mock-client-data-json'
        }
      };

      localStorage.setItem(this.mockCredentialKey, JSON.stringify(newCredential));
      console.log('🆕 새 Mock 패스키 생성 및 저장:', credentialId);
      
      return newCredential;

    } catch (error) {
      console.error('❌ Mock 패스키 관리 실패:', error);
      return {
        id: 'fallback_mock_credential',
        type: 'public-key',
        response: {
          attestationObject: 'fallback-attestation',
          clientDataJSON: 'fallback-client-data'
        }
      };
    }
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const sessionToken = localStorage.getItem('cue_session_token');
    const sessionId = localStorage.getItem('cue_session_id');

    // 📊 상세한 API 요청 로깅
    console.log('📞 API 요청:', {
      endpoint,
      hasToken: !!sessionToken,
      hasSessionId: !!sessionId,
      method: options.method || 'GET'
    });
    
    const headers = { 
      'Content-Type': 'application/json',
      ...options.headers 
    };
    
    if (sessionToken) {
      headers['Authorization'] = `Bearer ${sessionToken}`;
    } else if (sessionId) {
      headers['X-Session-ID'] = sessionId;
    }
    
    try {
      const response = await fetch(url, {
        ...options,
        headers,
        mode: 'cors',
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        // 🔧 401 에러 시 세션 토큰 자동 삭제
        if (response.status === 401) {
          console.log('🗑️ 401 에러로 인한 세션 토큰 삭제');
          localStorage.removeItem('cue_session_token');
          localStorage.removeItem('cue_session_id');
        }

        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ API 성공:', { endpoint, hasData: !!data });
      return data;
    } catch (error) {
      console.error(`💥 API 요청 실패: ${url}`, error.message);
      return this.getMockFallback(endpoint, options);
    }
  }

  getMockFallback(endpoint, options) {
    if (endpoint.includes('/health')) {
      return { status: 'mock', mode: 'frontend-only', timestamp: new Date().toISOString() };
    }
    
    if (endpoint.includes('register/start')) {
      return {
        success: true,
        sessionId: `mock_${Date.now()}`,
        options: { challenge: btoa(Math.random().toString()) }
      };
    }
    
    if (endpoint.includes('register/complete') || endpoint.includes('login/complete')) {
      const isExisting = Math.random() > 0.3;
      
      return {
        success: true,
        sessionId: `perm_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`,
        sessionToken: `token_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
        isExistingUser: isExisting,
        action: isExisting ? 'login' : 'register',
        user: {
          id: isExisting ? 'existing_user_123' : `user_${Date.now()}`,
          username: isExisting ? 'ExistingAgent' : `Agent${Math.floor(Math.random() * 10000)}`,
          userEmail: isExisting ? 'existing@cueprotocol.ai' : 'demo@cueprotocol.ai',
          did: isExisting ? 'did:cue:existing:123' : `did:cue:${Date.now()}`,
          walletAddress: isExisting ? '0x1234567890123456789012345678901234567890' : `0x${Math.random().toString(16).substring(2, 42)}`,
          cueBalance: isExisting ? 8750 + Math.floor(Math.random() * 5000) : 15428,
          trustScore: isExisting ? 88 + Math.floor(Math.random() * 12) : 85,
          passportLevel: 'Verified',
          biometricVerified: true,
          registeredAt: isExisting 
            ? new Date(Date.now() - 86400000 * 14).toISOString()
            : new Date().toISOString()
        },
        message: isExisting 
          ? '기존 계정으로 로그인되었습니다. 모든 데이터가 유지됩니다.'
          : '새로운 AI Passport가 생성되었습니다!'
      };
    }
    
    if (endpoint.includes('session/restore')) {
      if (Math.random() > 0.5) {
        return {
          success: true,
          user: {
            id: 'restored_user_123',
            username: 'RestoredAgent',
            userEmail: 'restored@cueprotocol.ai',
            did: 'did:cue:restored:123',
            walletAddress: '0x1234567890123456789012345678901234567890',
            cueBalance: 8750 + Math.floor(Math.random() * 5000),
            trustScore: 90 + Math.floor(Math.random() * 10),
            passportLevel: 'Verified',
            biometricVerified: true,
            registeredAt: new Date(Date.now() - 86400000 * 7).toISOString()
          }
        };
      } else {
        return { success: false, error: 'No valid session found' };
      }
    }
    
    if (endpoint.includes('/api/ai/chat')) {
      const responses = [
        "CUE Protocol은 AI 개인화를 위한 혁신적인 블록체인 플랫폼입니다. RAG-DAG 시스템으로 당신의 대화를 학습하여 더욱 정확한 개인화 AI를 제공합니다.",
        "블록체인 기반 신원 인증과 WebAuthn 생체인증으로 보호되는 개인 데이터 볼트에서 안전하게 문맥을 학습합니다. 매 대화마다 CUE 토큰을 획득하세요!",
        "RAG-DAG(Retrieval-Augmented Generation with Directed Acyclic Graph) 시스템은 당신의 대화 패턴과 선호도를 지속적으로 학습합니다. 시간이 지날수록 더욱 정확해집니다.",
        "실시간 문맥 학습과 품질 기반 CUE 마이닝이 진행 중입니다. 고품질 대화일수록 더 많은 CUE 토큰을 획득할 수 있습니다.",
        "AI Passport를 통해 당신의 디지털 정체성과 학습 패턴을 안전하게 관리합니다. 크로스 플랫폼 동기화로 어디서든 일관된 AI 경험을 제공합니다."
      ];
      
      return {
        response: responses[Math.floor(Math.random() * responses.length)],
        model: 'gpt-4o-cue',
        timestamp: new Date().toISOString(),
        cueReward: Math.floor(Math.random() * 20) + 5,
        trustScore: 0.85 + Math.random() * 0.15,
        contextLearned: true,
        qualityScore: 0.88 + Math.random() * 0.12
      };
    }
    
    throw new Error(`Mock fallback not implemented for ${endpoint}`);
  }

  async startWebAuthnRegistration() {
    console.log('🆕 === WebAuthn 등록 시작 (영구 패스키 지원) ===');

    try {
      console.log('📞 1단계: /register/start 호출');
      const startResponse = await this.request('/api/auth/webauthn/register/start', {
        method: 'POST',
        body: JSON.stringify({
          userName: `PassKey_User_${Date.now()}`,
          deviceInfo: { 
            userAgent: navigator.userAgent, 
            platform: navigator.platform,
            timestamp: Date.now()
          }
        })
      });

      console.log('✅ 1단계 성공:', { 
        success: startResponse.success, 
        sessionId: startResponse.sessionId 
      });

      if (!startResponse.success || !startResponse.options) {
        throw new Error('등록 시작 응답이 올바르지 않습니다');
      }

      console.log('📦 2단계: WebAuthn 라이브러리 로드 확인');
      const loaded = await loadWebAuthn();
      
      let credential;
      
      if (!loaded) {
        console.warn('⚠️ WebAuthn 라이브러리 없음 - 영구 Mock 패스키 사용');
        credential = this.getOrCreateMockCredential();
        console.log('🔑 사용 중인 Mock 패스키:', credential.id);
      } else {
        console.log('👆 2단계: 실제 생체인증 실행...');
        
        try {
          try {
            const authOptions = {
              ...startResponse.options,
              allowCredentials: []
            };
            credential = await startAuthentication(authOptions);
            console.log('✅ 기존 패스키 인증 성공:', credential.id);
          } catch (authError) {
            console.log('🆕 기존 패스키 없음, 새 패스키 등록 중...');
            credential = await startRegistration(startResponse.options);
            console.log('✅ 새 패스키 등록 성공:', credential.id);
          }
        } catch (webauthnError) {
          console.error('❌ WebAuthn 실행 실패:', webauthnError);
          throw webauthnError;
        }
      }

      console.log('📞 3단계: /register/complete 호출');
      console.log('🔑 사용 중인 credential_id:', credential.id);
      
      const completeResponse = await this.request('/api/auth/webauthn/register/complete', {
        method: 'POST',
        body: JSON.stringify({ 
          credential, 
          sessionId: startResponse.sessionId 
        })
      });

      console.log('✅ 3단계 완료:', { 
        success: completeResponse.success,
        hasUser: !!completeResponse.user,
        isExisting: completeResponse.isExistingUser,
        action: completeResponse.action,
        sessionToken: !!completeResponse.sessionToken
      });

      if (!completeResponse.success) {
        throw new Error(completeResponse.message || '등록 완료 처리 실패');
      }

      if (!completeResponse.user) {
        throw new Error('사용자 정보가 응답에 포함되지 않았습니다');
      }

      if (completeResponse.sessionToken) {
        console.log('💾 JWT 세션 토큰 localStorage 저장');
        localStorage.setItem('cue_session_token', completeResponse.sessionToken);
      }
      
      if (completeResponse.sessionId) {
        console.log('💾 세션 ID localStorage 저장:', completeResponse.sessionId);
        localStorage.setItem('cue_session_id', completeResponse.sessionId);
      }

      console.log('🎉 WebAuthn 등록 완료!', {
        userId: completeResponse.user.id,
        username: completeResponse.user.username,
        did: completeResponse.user.did,
        action: completeResponse.action,
        isExisting: completeResponse.isExistingUser || false
      });

      return completeResponse;

    } catch (error) {
      console.error('💥 WebAuthn 등록 실패:', error);
      throw error;
    }
  }

  async restoreSession() {
    console.log('🔧 === 세션 복원 시도 ===');
    
    try {
      const sessionToken = localStorage.getItem('cue_session_token');
      const sessionId = localStorage.getItem('cue_session_id');
      
      if (!sessionToken && !sessionId) {
        console.log('❌ 저장된 세션 토큰/ID 없음');
        return null;
      }

      console.log('🔍 저장된 세션 발견:', {
        hasToken: !!sessionToken,
        hasId: !!sessionId
      });

      if (sessionToken) {
        try {
          const response = await this.request('/api/auth/session/restore', {
            method: 'POST',
            body: JSON.stringify({ sessionToken })
          });

          if (response.success) {
            console.log('✅ JWT 토큰 기반 세션 복원 성공!');
            return response;
          }
        } catch (error) {
          console.warn('⚠️ JWT 토큰 복원 실패, 세션 ID로 시도:', error.message);
          localStorage.removeItem('cue_session_token');
        }
      }

      if (sessionId) {
        try {
          const response = await this.request('/api/auth/session/restore', {
            method: 'POST',
            body: JSON.stringify({ sessionId })
          });

          if (response.success) {
            console.log('✅ 세션 ID 기반 복원 성공!');
            return response;
          }
        } catch (error) {
          console.warn('⚠️ 세션 ID 복원도 실패:', error.message);
          localStorage.removeItem('cue_session_id');
        }
      }

      console.log('❌ 모든 세션 복원 실패');
      return null;

    } catch (error) {
      console.error('💥 세션 복원 오류:', error);
      localStorage.removeItem('cue_session_token');
      localStorage.removeItem('cue_session_id');
      return null;
    }
  }

  async logout() {
    console.log('🔧 === 로그아웃 처리 ===');
    
    try {
      const sessionToken = localStorage.getItem('cue_session_token');
      const sessionId = localStorage.getItem('cue_session_id');
      
      if (sessionToken || sessionId) {
        console.log('🗑️ 서버 세션 무효화 시도');
        
        try {
          await this.request('/api/auth/logout', {
            method: 'POST',
            body: JSON.stringify({ sessionToken, sessionId })
          });
        } catch (error) {
          console.warn('⚠️ 서버 로그아웃 실패 (로컬 토큰은 삭제)', error);
        }
      }

      localStorage.removeItem('cue_session_token');
      localStorage.removeItem('cue_session_id');
      console.log('✅ 로그아웃 완료');

      return { success: true };

    } catch (error) {
      console.error('💥 로그아웃 오류:', error);
      localStorage.removeItem('cue_session_token');
      localStorage.removeItem('cue_session_id');
      return { success: false, error: error.message };
    }
  }

  async sendChatMessage(message, model, userDid) {
    try {
      return await this.request('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ message, model, userDid })
      });
    } catch {
      const responses = [
        "안녕하세요! CUE Protocol에서 개인화된 AI 어시스턴트입니다. 어떻게 도와드릴까요?",
        "흥미로운 질문이네요! 개인화 데이터를 기반으로 맞춤형 답변을 준비하고 있습니다.",
        "데이터 볼트에서 관련 정보를 찾고 있습니다. 잠시만 기다려주세요.",
        "WebAuthn 인증을 통해 안전하게 저장된 개인 정보를 활용하여 답변드리겠습니다."
      ];
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return {
        response: responses[Math.floor(Math.random() * responses.length)],
        model,
        timestamp: new Date().toISOString(),
        cueReward: Math.floor(Math.random() * 15) + 5,
        trustScore: 0.85 + Math.random() * 0.15
      };
    }
  }

  async mineCUE(userDid, activity) {
    try {
      return await this.request('/api/cue/mine', {
        method: 'POST',
        body: JSON.stringify({ userDid, activity })
      });
    } catch {
      return {
        success: true,
        amount: Math.floor(Math.random() * 10) + 1,
        totalBalance: Math.floor(Math.random() * 5000) + 1000,
        activity
      };
    }
  }

  async loadPassport(did) {
    try {
      return await this.request(`/api/passport/${did}`);
    } catch {
      return {
        did,
        username: did.split(':').pop(),
        trustScore: 85 + Math.floor(Math.random() * 15),
        passportLevel: 'Verified Agent',
        cueBalance: 2500 + Math.floor(Math.random() * 3000),
        totalMined: 25000 + Math.floor(Math.random() * 50000),
        dataVaults: [
          { name: 'Identity Vault', type: 'identity', size: '2.3MB', items: 47 },
          { name: 'Knowledge Vault', type: 'knowledge', size: '15.7MB', items: 234 },
          { name: 'Preference Vault', type: 'preference', size: '1.2MB', items: 89 }
        ],
        connectedPlatforms: ['ChatGPT', 'Claude', 'Discord', 'GitHub', 'Notion'],
        personalityProfile: {
          traits: ['창의적', '분석적', '신뢰할 수 있는'],
          communicationStyle: 'friendly',
          expertise: ['AI', 'Web3', 'Protocol Design']
        },
        achievements: [
          { name: 'First CUE', icon: '🎯', earned: true, description: '첫 CUE 마이닝' },
          { name: 'Trusted Agent', icon: '🛡️', earned: true, description: '신뢰도 90% 달성' },
          { name: 'Platform Master', icon: '🌐', earned: false, description: '5개 플랫폼 연결' }
        ],
        ragDagStats: {
          learnedConcepts: 247,
          connectionStrength: 0.87,
          lastLearningActivity: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
          knowledgeNodes: 1456,
          personalityAccuracy: 0.94
        },
        recentActivity: [
          { type: 'chat', description: 'AI와 Web3 주제로 대화', timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString() },
          { type: 'mining', description: '15 CUE 토큰 마이닝', timestamp: new Date(Date.now() - 12 * 60 * 1000).toISOString() },
          { type: 'learning', description: 'Protocol Design 개념 학습', timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString() }
        ],
        createdAt: new Date().toISOString()
      };
    }
  }

  async checkHealth() {
    try {
      const response = await this.request('/health');
      return { connected: true, mode: 'real', ...response };
    } catch (error) {
      return { connected: false, mode: 'mock', error: error.message };
    }
  }

  getDebugInfo() {
    const mockCredential = this.getOrCreateMockCredential();
    return {
      mockCredential,
      sessionToken: localStorage.getItem('cue_session_token'),
      sessionId: localStorage.getItem('cue_session_id'),
      timestamp: new Date().toISOString()
    };
  }
}

// WebAuthn 지원 확인
const checkWebAuthnSupport = () => {
  if (typeof window === 'undefined') {
    return { supported: false, reason: 'Server-side rendering' };
  }
  if (!window.PublicKeyCredential) {
    return { supported: false, reason: 'WebAuthn을 지원하지 않는 브라우저입니다.' };
  }
  return { supported: true };
};

// ============================================================================
// 🎨 UI Components (독립 스크롤 최적화)
// ============================================================================

const LoadingSpinner = ({ size = 'md', className = '' }) => (
  <Loader2 className={`animate-spin ${
    size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5'
  } ${className}`} />
);

const BackendStatus = ({ status, onRetry, connectionDetails }) => {
  const isConnected = status === 'connected';
  
  return (
    <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium ${
      isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
    }`}>
      {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
      <span>{isConnected ? 'Live Backend' : 'Mock Mode'}</span>
      {!isConnected && (
        <button onClick={onRetry} className="underline hover:no-underline ml-1">
          재시도
        </button>
      )}
    </div>
  );
};

// 온보딩 컴포넌트
const OnboardingFlow = ({ 
  step, 
  isLoading, 
  onStart, 
  backendConnected,
  backendMode,
  webauthnSupport,
  error,
  onRetryConnection,
  onDebugCredential
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl max-w-lg w-full p-8 border border-gray-100">
        <div className="text-center mb-8">
          <div className="mx-auto w-20 h-20 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
            {step === 'waiting' && <Shield className="w-10 h-10 text-white" />}
            {step === 'auth' && <Fingerprint className="w-10 h-10 text-white animate-pulse" />}
            {step === 'wallet' && <Key className="w-10 h-10 text-white animate-pulse" />}
            {step === 'passport' && <User className="w-10 h-10 text-white animate-pulse" />}
            {step === 'complete' && <CheckCircle className="w-10 h-10 text-white" />}
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {step === 'waiting' && 'CUE Protocol'}
            {step === 'auth' && '🔐 생체인증 중...'}
            {step === 'wallet' && '🌐 DID 생성 중...'}
            {step === 'passport' && '🛡️ AI Passport 생성 중...'}
            {step === 'complete' && '🎉 완료!'}
          </h1>
          
          <p className="text-gray-600">
            {step === 'waiting' && 'Web3 AI 개인화 플랫폼에 오신 것을 환영합니다'}
            {step === 'auth' && '생체인증을 완료해주세요'}
            {step === 'wallet' && '블록체인 지갑과 DID를 생성하고 있습니다'}
            {step === 'passport' && 'AI Passport를 초기화하고 있습니다'}
            {step === 'complete' && 'AI Passport가 준비되었습니다!'}
          </p>
        </div>

        <div className="flex justify-center mb-6">
          <BackendStatus 
            status={backendConnected ? 'connected' : 'disconnected'} 
            onRetry={onRetryConnection}
            connectionDetails={{}}
          />
        </div>

        {webauthnSupport && (
          <div className={`mb-6 p-4 rounded-xl ${
            webauthnSupport.supported ? 'bg-blue-50 border border-blue-200' : 'bg-yellow-50 border border-yellow-200'
          }`}>
            <div className="flex items-center space-x-2">
              <Fingerprint className={`w-4 h-4 ${webauthnSupport.supported ? 'text-blue-600' : 'text-yellow-600'}`} />
              <span className={`text-sm font-medium ${webauthnSupport.supported ? 'text-blue-800' : 'text-yellow-800'}`}>
                {webauthnSupport.supported ? '✅ WebAuthn 지원됨' : '⚠️ WebAuthn 제한됨'}
              </span>
            </div>
            {!webauthnSupport.supported && (
              <p className="text-xs text-yellow-700 mt-1">{webauthnSupport.reason}</p>
            )}
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {step === 'waiting' && (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-xl border border-blue-100">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                <Sparkles className="w-4 h-4 mr-2 text-purple-600" />
                영구 데이터 보존 기능
              </h3>
              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>WebAuthn 생체인증 (Face ID, Touch ID)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>자동 블록체인 지갑 + DID 생성</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span>영구 세션 기반 데이터 유지</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span>CUE 토큰 & Trust Score 누적</span>
                </div>
              </div>
            </div>
            
            <button
              onClick={onStart}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 px-6 rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <LoadingSpinner size="sm" />
                  <span>생성 중...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <Zap className="w-5 h-5" />
                  <span>영구 AI Passport 생성</span>
                </div>
              )}
            </button>

            {onDebugCredential && (
              <button
                onClick={onDebugCredential}
                className="w-full text-gray-500 hover:text-gray-700 text-sm underline"
              >
                🔍 Mock 패스키 디버그 정보 확인
              </button>
            )}
          </div>
        )}

        {(step === 'auth' || step === 'wallet' || step === 'passport') && (
          <div className="flex justify-center py-8">
            <LoadingSpinner size="lg" />
          </div>
        )}

        {step === 'complete' && (
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-gradient-to-r from-green-600 to-blue-600 text-white py-4 px-6 rounded-xl hover:from-green-700 hover:to-blue-700 font-semibold text-lg transition-all duration-200 shadow-lg"
          >
            <div className="flex items-center justify-center space-x-2">
              <Target className="w-5 h-5" />
              <span>AI Passport 사용하기</span>
            </div>
          </button>
        )}

        {!backendConnected && (
          <button
            onClick={onRetryConnection}
            className="w-full mt-3 text-gray-600 hover:text-gray-900 text-sm underline"
          >
            백엔드 연결 재시도
          </button>
        )}
      </div>
    </div>
  );
};

// ⭐️ AI Passport 카드 (개선된 레이아웃)
const AIPassportCard = ({ passport, cueBalance, todaysMining, backendConnected }) => {
  return (
    <div className={`rounded-xl p-4 md:p-6 text-white relative overflow-hidden shadow-lg ${
      backendConnected 
        ? 'bg-gradient-to-br from-blue-600 to-indigo-700' 
        : 'bg-gradient-to-br from-gray-500 to-gray-700'
    }`}>
      <div className="absolute top-0 right-0 w-24 h-24 bg-white opacity-10 rounded-full -mr-12 -mt-12"></div>
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <div className="flex items-center space-x-2 md:space-x-3">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
              <Shield className="w-4 h-4 md:w-5 md:h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm md:text-lg">AI Passport</h3>
              <p className={`text-xs md:text-sm ${backendConnected ? 'text-blue-200' : 'text-gray-300'}`}>
                {passport?.passportLevel || 'Verified Agent'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg md:text-xl font-bold">{passport?.trustScore || 95}%</div>
            <div className={`text-xs ${backendConnected ? 'text-blue-200' : 'text-gray-300'}`}>
              Trust Score
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 md:gap-4 mb-4 md:mb-6">
          <div className="text-center bg-white bg-opacity-15 rounded-lg p-2 md:p-4">
            <Coins className="w-4 h-4 md:w-5 md:h-5 mx-auto mb-1 md:mb-2 text-yellow-300" />
            <div className="text-sm md:text-lg font-bold">{Math.floor((cueBalance || 0) / 1000)}K</div>
            <div className={`text-xs ${backendConnected ? 'text-blue-200' : 'text-gray-300'}`}>
              CUE
            </div>
          </div>
          <div className="text-center bg-white bg-opacity-15 rounded-lg p-2 md:p-4">
            <Star className="w-4 h-4 md:w-5 md:h-5 mx-auto mb-1 md:mb-2 text-orange-300" />
            <div className="text-sm md:text-lg font-bold">+{todaysMining}</div>
            <div className={`text-xs ${backendConnected ? 'text-blue-200' : 'text-gray-300'}`}>
              Today
            </div>
          </div>
          <div className="text-center bg-white bg-opacity-15 rounded-lg p-2 md:p-4">
            <Globe className="w-4 h-4 md:w-5 md:h-5 mx-auto mb-1 md:mb-2 text-green-300" />
            <div className="text-sm md:text-lg font-bold">{passport?.connectedPlatforms?.length || 3}</div>
            <div className={`text-xs ${backendConnected ? 'text-blue-200' : 'text-gray-300'}`}>
              Links
            </div>
          </div>
        </div>

        <div className="pt-3 md:pt-4 border-t border-white border-opacity-20">
          <div className={`text-xs ${backendConnected ? 'text-blue-200' : 'text-gray-300'} mb-2`}>
            Digital Identity
          </div>
          <div className="font-mono text-xs bg-black bg-opacity-20 rounded p-2 truncate">
            {passport?.did?.slice(0, 35) || 'did:ai:loading'}...
          </div>
        </div>
      </div>
    </div>
  );
};

// ⭐️ 독립 스크롤 사이드바 컴포넌트 (핵심 개선!)
const IndependentSidebar = ({ passport, cueBalance, todaysMining, backendConnected, ragDagStats }) => {
  return (
    <div 
      className="flex-1 p-4 md:p-6 space-y-4 md:space-y-6" 
      style={{ 
        overflowY: 'auto',
        scrollbarWidth: 'thin',
        scrollbarColor: '#CBD5E0 #F7FAFC',
        height: '100%'
      }}
    >
      {/* CSS 스크롤바 스타일링 */}
      <style jsx>{`
        div::-webkit-scrollbar {
          width: 6px;
        }
        div::-webkit-scrollbar-track {
          background: #F7FAFC;
        }
        div::-webkit-scrollbar-thumb {
          background: #CBD5E0;
          border-radius: 3px;
        }
        div::-webkit-scrollbar-thumb:hover {
          background: #A0AEC0;
        }
      `}</style>

      <AIPassportCard 
        passport={passport}
        cueBalance={cueBalance}
        todaysMining={todaysMining}
        backendConnected={backendConnected}
      />

      <div className="bg-white rounded-xl p-4 md:p-6 border border-gray-200">
        <h4 className="text-sm font-semibold text-gray-900 mb-3 md:mb-4 flex items-center">
          <Brain className="w-4 h-4 mr-2 text-purple-600" />
          RAG-DAG 학습 현황
        </h4>
        
        <div className="space-y-3 md:space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs md:text-sm font-medium text-gray-700">진행률</span>
              <span className="text-xs md:text-sm font-bold text-purple-600">87%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full" style={{width: '87%'}}></div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3 md:gap-4 text-xs md:text-sm">
            <div>
              <span className="text-gray-600">학습된 개념</span>
              <p className="font-bold text-gray-900">{ragDagStats?.learnedConcepts || 247}</p>
            </div>
            <div>
              <span className="text-gray-600">연결 강도</span>
              <p className="font-bold text-gray-900">{Math.round((ragDagStats?.connectionStrength || 0.87) * 100)}%</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 md:p-6 border border-gray-200">
        <h4 className="text-sm font-semibold text-gray-900 mb-3 md:mb-4 flex items-center">
          <Sparkles className="w-4 h-4 mr-2 text-orange-600" />
          Personality Profile
        </h4>
        
        <div className="space-y-3">
          <div>
            <span className="text-xs text-gray-600 uppercase tracking-wide">특성</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {(passport?.personalityProfile?.traits || ['혁신적', '분석적', '창의적']).map((trait, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full"
                >
                  {trait}
                </span>
              ))}
            </div>
          </div>
          
          <div>
            <span className="text-xs text-gray-600 uppercase tracking-wide">전문 분야</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {(passport?.personalityProfile?.expertise || ['Web3', 'AI', 'Protocol']).map((skill, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 md:p-6 border border-gray-200">
        <h4 className="text-sm font-semibold text-gray-900 mb-3 md:mb-4 flex items-center">
          <Globe className="w-4 h-4 mr-2 text-green-600" />
          Connected Platforms
        </h4>
        
        <div className="space-y-2">
          {(passport?.connectedPlatforms || ['ChatGPT', 'Claude', 'Discord']).map((platform, index) => (
            <div key={index} className="flex items-center justify-between p-2 md:p-3 bg-gray-50 rounded-lg">
              <span className="text-xs md:text-sm text-gray-700 font-medium">{platform}</span>
              <div className={`w-2 h-2 ${backendConnected ? 'bg-green-500' : 'bg-yellow-500'} rounded-full`}></div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 md:p-6 border border-gray-200">
        <h4 className="text-sm font-semibold text-gray-900 mb-3 md:mb-4 flex items-center">
          <Award className="w-4 h-4 mr-2 text-yellow-600" />
          Achievements
        </h4>
        
        <div className="space-y-3">
          {(passport?.achievements || [
            { name: 'Pioneer', icon: '🚀', earned: true },
            { name: 'Trusted Agent', icon: '🛡️', earned: true },
            { name: 'Expert', icon: '🧠', earned: false }
          ]).map((achievement, index) => (
            <div key={index} className={`flex items-center space-x-3 p-2 md:p-3 rounded-lg ${
              achievement.earned ? 'bg-green-50 border border-green-200' : 'bg-gray-50'
            }`}>
              <span className="text-base md:text-lg">{achievement.icon}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-xs md:text-sm font-medium truncate ${
                  achievement.earned ? 'text-green-800' : 'text-gray-600'
                }`}>
                  {achievement.name}
                </p>
                {achievement.description && (
                  <p className="text-xs text-gray-500 truncate">{achievement.description}</p>
                )}
              </div>
              {achievement.earned && (
                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 md:p-6 border border-gray-200">
        <h4 className="text-sm font-semibold text-gray-900 mb-3 md:mb-4 flex items-center">
          <Activity className="w-4 h-4 mr-2 text-indigo-600" />
          Recent Activity
        </h4>
        
        <div className="space-y-3">
          {(passport?.recentActivity || [
            { type: 'chat', description: 'AI와 대화', timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString() },
            { type: 'mining', description: 'CUE 토큰 마이닝', timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString() }
          ]).map((activity, index) => (
            <div key={index} className="flex items-center space-x-3 p-2">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                activity.type === 'chat' ? 'bg-blue-500' :
                activity.type === 'mining' ? 'bg-yellow-500' :
                'bg-purple-500'
              }`}></div>
              <div className="flex-1 min-w-0">
                <p className="text-xs md:text-sm text-gray-700 truncate">{activity.description}</p>
                <p className="text-xs text-gray-500">
                  {new Date(activity.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ⭐️ 독립 스크롤 메인 콘텐츠 (핵심 개선!)
const IndependentMainContent = ({
  messages,
  isTyping,
  newMessage,
  setNewMessage,
  onSendMessage,
  selectedModel,
  onModelChange,
  backendConnected,
  todaysMining,
  attachments,
  setAttachments,
  isVoiceMode,
  setIsVoiceMode
}) => {
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  useEffect(() => {
    if (messagesEndRef.current && messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, isTyping]);

 const models = [
  { id: 'personalized-agent', name: 'Personal Agent', description: 'AI Passport 기반' },
  
  // 🦙 Ollama 로컬 모델들
  { id: 'llama3.2:3b', name: '🦙 Llama 3.2 (3B)', description: '로컬 고속' },
  { id: 'llama3.2:1b', name: '🦙 Llama 3.2 (1B)', description: '로컬 초고속' },
  { id: 'qwen2.5:3b', name: '🇰🇷 Qwen 2.5 (3B)', description: '한국어 우수' },
  { id: 'gemma2:2b', name: '🤖 Gemma 2 (2B)', description: 'Google 로컬' },
  
  // 기존 클라우드 모델들
  { id: 'gpt-4o', name: '☁️ GPT-4o', description: 'OpenAI 클라우드' },
  { id: 'claude-3.5-sonnet', name: '☁️ Claude 3.5', description: 'Anthropic 클라우드' },
  { id: 'gemini-pro', name: '☁️ Gemini Pro', description: 'Google 클라우드' }
];

  const handleSendMessage = async () => {
    if (!newMessage.trim() && attachments.length === 0) return;
    
    try {
      await onSendMessage(newMessage, selectedModel);
      setNewMessage('');
      setAttachments([]);
    } catch (error) {
      console.error('메시지 전송 실패:', error);
    }
  };

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files || []);
    setAttachments(prev => [...prev, ...files]);
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col h-full">
      {/* ⭐️ 상단 상태 바 (고정) */}
      <div className="flex-shrink-0 p-3 md:p-4 border-b border-gray-200 bg-gray-50">
        <div className={`flex items-center justify-between p-2 md:p-3 rounded-lg ${
          backendConnected ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'
        }`}>
          <div className="flex items-center space-x-2 md:space-x-3">
            {backendConnected ? <Wifi className="w-3 h-3 md:w-4 md:h-4 text-green-600" /> : <WifiOff className="w-3 h-3 md:w-4 md:h-4 text-yellow-600" />}
            <span className={`text-xs md:text-sm font-medium ${backendConnected ? 'text-green-700' : 'text-yellow-700'}`}>
              {backendConnected ? 'Real AI Backend Connected' : 'Mock AI (Backend Offline)'}
            </span>
          </div>
          <div className="flex items-center space-x-2 md:space-x-4">
            <div className="flex items-center space-x-1">
              <Coffee className="w-3 h-3 md:w-4 md:h-4 text-gray-500" />
              <span className="text-xs text-gray-600">오늘 +{todaysMining} 마이닝</span>
            </div>
          </div>
        </div>
      </div>

      {/* ⭐️ 메시지 영역 (독립 스크롤) */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 p-3 md:p-6 space-y-4 md:space-y-6"
        style={{ 
          overflowY: 'auto',
          overflowX: 'hidden',
          scrollBehavior: 'smooth',
          scrollbarWidth: 'thin',
          scrollbarColor: '#CBD5E0 #F7FAFC'
        }}
      >
        {/* CSS 스크롤바 스타일링 */}
        <style jsx>{`
          div::-webkit-scrollbar {
            width: 6px;
          }
          div::-webkit-scrollbar-track {
            background: #F7FAFC;
          }
          div::-webkit-scrollbar-thumb {
            background: #CBD5E0;
            border-radius: 3px;
          }
          div::-webkit-scrollbar-thumb:hover {
            background: #A0AEC0;
          }
        `}</style>

        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center max-w-2xl mx-auto px-4">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-4 md:mb-6 shadow-lg">
              <MessageCircle className="w-6 h-6 md:w-8 md:h-8 text-white" />
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-3 md:mb-4">
              안녕하세요! 👋
            </h2>
            <p className="text-gray-600 text-sm md:text-lg mb-6 md:mb-8 leading-relaxed">
              CUE Protocol AI 어시스턴트입니다.<br />
              개인화된 AI와 대화하고 CUE 토큰을 마이닝하세요.
            </p>
            
            <div className="flex flex-wrap gap-2 justify-center">
              {[
                "CUE Protocol 설명해줘",
                "AI Passport가 뭐야?",
                "RAG-DAG 학습 방식",
                "개인화 AI의 장점"
              ].map((prompt, index) => (
                <button
                  key={index}
                  onClick={() => setNewMessage(prompt)}
                  className="px-3 md:px-4 py-2 bg-white border border-gray-200 rounded-full text-xs md:text-sm text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm hover:shadow"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {!backendConnected && (
              <div className="mt-4 md:mt-6 p-3 md:p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                <p className="text-xs md:text-sm text-yellow-800">
                  ⚠️ Mock 모드로 실행 중입니다. 실제 AI 경험을 위해 백엔드 서버를 연결해주세요.
                </p>
              </div>
            )}
          </div>
        ) : (
          <>
            {messages.map(message => (
              <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] lg:max-w-[70%] ${message.type === 'user' ? 'order-2' : 'order-1'}`}>
                  {message.type === 'ai' && (
                    <div className="flex items-center space-x-2 md:space-x-3 mb-2 md:mb-3">
                      <div className="w-6 h-6 md:w-8 md:h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                        <Star className="w-3 h-3 md:w-4 md:h-4 text-white" />
                      </div>
                      <span className="text-xs md:text-sm font-medium text-gray-700">
                        Personal AI Agent
                      </span>
                    </div>
                  )}
                  
                  <div className={`p-3 md:p-5 rounded-xl shadow-sm ${
                    message.type === 'user' 
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white' 
                      : 'bg-white border border-gray-200'
                  }`}>
                    <div className="whitespace-pre-wrap text-sm md:text-base leading-relaxed">
                      {message.content}
                    </div>
                    
                    {message.type === 'ai' && message.cueReward && (
                      <div className="mt-2 md:mt-3 pt-2 md:pt-3 border-t border-gray-100 flex items-center space-x-3 md:space-x-4">
                        <div className="flex items-center space-x-1">
                          <Coins className="w-3 h-3 md:w-4 md:h-4 text-yellow-500" />
                          <span className="text-xs md:text-sm text-yellow-600 font-medium">+{message.cueReward} CUE</span>
                        </div>
                        {message.trustScore && (
                          <div className="flex items-center space-x-1">
                            <Star className="w-3 h-3 md:w-4 md:h-4 text-blue-500" />
                            <span className="text-xs md:text-sm text-blue-600">{Math.round(message.trustScore * 100)}%</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 p-3 md:p-5 rounded-xl shadow-sm">
                  <div className="flex items-center space-x-3">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-100"></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-200"></div>
                    </div>
                    <span className="text-xs md:text-sm text-gray-600">AI가 생각하는 중...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* ⭐️ 하단 입력창 (완전 고정) */}
      <div className="flex-shrink-0 border-t border-gray-200 p-3 md:p-4 bg-white">
        <div className="max-w-4xl mx-auto">
          {attachments.length > 0 && (
            <div className="mb-2 md:mb-3 flex flex-wrap gap-2">
              {attachments.map((file, index) => (
                <div key={index} className="flex items-center space-x-2 bg-gray-100 px-2 md:px-3 py-1 md:py-2 rounded-lg">
                  <Paperclip className="w-3 h-3 md:w-4 md:h-4 text-gray-500" />
                  <span className="text-xs md:text-sm text-gray-700 truncate max-w-20 md:max-w-none">{file.name}</span>
                  <button
                    onClick={() => removeAttachment(index)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-3 h-3 md:w-4 md:h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
          
          <div className="flex space-x-2 md:space-x-3 items-end">
            <div className="flex-shrink-0">
              <select
                value={selectedModel}
                onChange={(e) => onModelChange(e.target.value)}
                className="px-2 md:px-3 py-2 md:py-3 bg-gray-50 border-2 border-gray-200 rounded-lg text-xs md:text-sm hover:bg-gray-100 focus:border-blue-500 focus:outline-none transition-colors"
              >
                {models.map(model => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex-1 relative">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="CUE Protocol AI와 대화하기..."
                className="w-full min-h-[44px] md:min-h-[52px] max-h-[100px] md:max-h-[120px] px-3 md:px-4 py-2 md:py-3 bg-gray-50 border-2 border-gray-200 rounded-lg resize-none focus:outline-none focus:bg-white focus:border-blue-500 transition-all text-sm md:text-base pr-16 md:pr-20"
                rows={1}
              />
              
              <div className="absolute right-1 md:right-2 bottom-1 md:bottom-2 flex items-center space-x-1">
                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
                />
                <label
                  htmlFor="file-upload"
                  className="p-1 md:p-2 text-gray-400 hover:text-gray-600 cursor-pointer rounded transition-colors"
                >
                  <Paperclip className="w-3 h-3 md:w-4 md:h-4" />
                </label>
                
                <button
                  onClick={() => setIsVoiceMode(!isVoiceMode)}
                  className={`p-1 md:p-2 rounded transition-colors ${
                    isVoiceMode 
                      ? 'text-blue-600 bg-blue-50' 
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {isVoiceMode ? <MicOff className="w-3 h-3 md:w-4 md:h-4" /> : <Mic className="w-3 h-3 md:w-4 md:h-4" />}
                </button>
              </div>
            </div>
            
            <div className="flex-shrink-0">
              <button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() && attachments.length === 0}
                className={`px-4 md:px-6 py-2 md:py-3 rounded-lg font-medium transition-all flex items-center space-x-1 md:space-x-2 shadow-lg ${
                  (newMessage.trim() || attachments.length > 0)
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white hover:shadow-xl transform hover:-translate-y-0.5'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                <Send className="w-3 h-3 md:w-4 md:h-4" />
                <span className="hidden sm:inline text-xs md:text-sm">Send</span>
              </button>
            </div>
          </div>
          
          <div className="flex items-center justify-center mt-1 md:mt-2 text-xs text-gray-500">
            <span>Enter 전송, Shift+Enter 줄바꿈 • CUE 토큰 마이닝 활성</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ⭐️ 메인 레이아웃 (완전히 독립 스크롤 최적화)
const MainLayout = ({
  passport,
  cueBalance,
  todaysMining,
  backendConnected,
  connectionStatus,
  connectionDetails,
  messages,
  isLoadingChat,
  selectedModel,
  onModelChange,
  currentView,
  onViewChange,
  onSendMessage,
  onUpdatePassport,
  onLogout,
  onRetryConnection
}) => {
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [attachments, setAttachments] = useState([]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setShowMobileSidebar(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const viewTabs = [
    { id: 'chat', label: 'AI Chat', icon: MessageCircle },
    { id: 'dashboard', label: 'Dashboard', icon: Activity },
    { id: 'passport', label: 'AI Passport', icon: Fingerprint },
    { id: 'vaults', label: 'Data Vaults', icon: Database },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 }
  ];

  const handleSendMessage = async (message, model) => {
    setIsTyping(true);
    try {
      await onSendMessage(message, model);
    } catch (error) {
      console.error('메시지 전송 실패:', error);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* ⭐️ 상단 헤더 (완전 고정) */}
      <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-3 md:py-4 flex-shrink-0 z-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 md:space-x-4">
            {isMobile && (
              <button
                onClick={() => setShowMobileSidebar(!showMobileSidebar)}
                className="p-2 hover:bg-gray-100 rounded-lg lg:hidden transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            
            <div className="flex items-center space-x-2 md:space-x-3">
              <div className="w-6 h-6 md:w-8 md:h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <Shield className="w-3 h-3 md:w-4 md:h-4 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-sm md:text-lg font-bold text-gray-900">CUE Protocol</h1>
                <p className="text-xs text-gray-500">AI 개인화 플랫폼</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 md:space-x-3">
            <div className="hidden sm:flex items-center space-x-2 px-2 md:px-3 py-1 md:py-2 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
              <Coins className="w-3 h-3 md:w-4 md:h-4 text-yellow-600" />
              <span className="text-xs md:text-sm font-medium text-yellow-800">{(cueBalance || 0).toLocaleString()}</span>
            </div>
            
            <BackendStatus 
              status={connectionStatus} 
              onRetry={onRetryConnection}
              connectionDetails={connectionDetails}
            />
            
            <button 
              onClick={onLogout}
              className="flex items-center space-x-1 md:space-x-2 px-2 md:px-3 py-1 md:py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <LogOut className="w-3 h-3 md:w-4 md:h-4" />
              <span className="hidden sm:inline text-xs md:text-sm">로그아웃</span>
            </button>
          </div>
        </div>
      </header>

      {/* ⭐️ 메인 콘텐츠 영역 (완전히 독립된 두 스크롤 영역) */}
      <div className="flex flex-1 overflow-hidden">
        {/* 모바일 오버레이 */}
        {isMobile && showMobileSidebar && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setShowMobileSidebar(false)}
          />
        )}

        {/* ⭐️ 왼쪽 사이드바 (독립 스크롤) */}
        <aside 
          className={`
            ${isMobile ? 'fixed z-50' : 'flex-shrink-0'}
            ${isMobile && !showMobileSidebar ? '-translate-x-full' : 'translate-x-0'}
            w-72 md:w-80 bg-gray-50 border-r border-gray-200 transition-transform duration-300 ease-in-out
            flex flex-col overflow-hidden
          `}
          style={{ 
            height: isMobile ? '100vh' : 'calc(100vh - 73px)'
          }}
        >
          {/* 모바일 헤더 */}
          {isMobile && (
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white flex-shrink-0">
              <h2 className="font-semibold text-gray-900">AI Passport</h2>
              <button
                onClick={() => setShowMobileSidebar(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}
          
          {/* ⭐️ 독립 스크롤 사이드바 콘텐츠 */}
          <IndependentSidebar 
            passport={passport}
            cueBalance={cueBalance}
            todaysMining={todaysMining}
            backendConnected={backendConnected}
            ragDagStats={passport?.ragDagStats}
          />
        </aside>

        {/* ⭐️ 오른쪽 메인 영역 (독립 스크롤) */}
        <main 
          className="flex-1 flex flex-col overflow-hidden"
          style={{ 
            height: 'calc(100vh - 73px)'
          }}
        >
          {/* 탭 네비게이션 (고정) */}
          <div className="bg-white border-b border-gray-200 px-4 md:px-6 py-2 md:py-3 flex-shrink-0">
            <div className="flex space-x-1 overflow-x-auto" style={{ scrollbarWidth: 'thin' }}>
              {viewTabs.map(view => (
                <button
                  key={view.id}
                  onClick={() => {
                    onViewChange(view.id);
                    if (isMobile) setShowMobileSidebar(false);
                  }}
                  className={`flex items-center space-x-1 md:space-x-2 px-3 md:px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
                    currentView === view.id 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <view.icon className="w-3 h-3 md:w-4 md:h-4" />
                  <span className="text-xs md:text-sm font-medium">
                    {isMobile ? view.label.split(' ')[0] : view.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* ⭐️ 채팅 뷰 (독립 스크롤) */}
          {currentView === 'chat' && (
            <IndependentMainContent
              messages={messages}
              isTyping={isTyping}
              newMessage={newMessage}
              setNewMessage={setNewMessage}
              onSendMessage={handleSendMessage}
              selectedModel={selectedModel}
              onModelChange={onModelChange}
              backendConnected={backendConnected}
              todaysMining={todaysMining}
              attachments={attachments}
              setAttachments={setAttachments}
              isVoiceMode={isVoiceMode}
              setIsVoiceMode={setIsVoiceMode}
            />
          )}

          {/* 다른 뷰들 (독립 스크롤) */}
          {currentView !== 'chat' && (
            <div 
              className="flex-1 p-4 md:p-6"
              style={{ 
                overflowY: 'auto',
                scrollbarWidth: 'thin',
                scrollbarColor: '#CBD5E0 #F7FAFC'
              }}
            >
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className={`w-12 h-12 md:w-16 md:h-16 rounded-2xl flex items-center justify-center mb-4 md:mb-6 ${
                  backendConnected ? 'bg-blue-100' : 'bg-gray-100'
                }`}>
                  {viewTabs.find(tab => tab.id === currentView)?.icon && 
                    React.createElement(viewTabs.find(tab => tab.id === currentView).icon, {
                      className: `w-6 h-6 md:w-8 md:h-8 ${backendConnected ? 'text-blue-600' : 'text-gray-600'}`
                    })
                  }
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-3 md:mb-4">
                  {currentView.charAt(0).toUpperCase() + currentView.slice(1)} 
                  {backendConnected ? ' (Real Backend)' : ' (Mock Mode)'}
                </h2>
                <p className="text-gray-600 text-sm md:text-base mb-6 md:mb-8 max-w-md">
                  {backendConnected 
                    ? `실제 ${currentView} 기능이 백엔드와 연동되어 작동합니다.`
                    : `Mock ${currentView} 화면입니다. 전체 기능은 백엔드 연결 후 사용 가능합니다.`
                  }
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

// ============================================================================
// 🎯 메인 앱 컴포넌트
// ============================================================================

function CUEProtocolApp() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registrationStep, setRegistrationStep] = useState('waiting');
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [passport, setPassport] = useState(null);
  
  const [currentView, setCurrentView] = useState('chat');
  const [selectedModel, setSelectedModel] = useState('personalized-agent');
  const [messages, setMessages] = useState([]);
  const [cueBalance, setCueBalance] = useState(3200);
  const [todaysMining, setTodaysMining] = useState(47);
  
  const [backendConnected, setBackendConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [isLibraryLoaded, setIsLibraryLoaded] = useState(false);
  
  const [webauthnSupport] = useState(() => checkWebAuthnSupport());
  
  const [api] = useState(() => new PersistentDataAPIClient());

  useEffect(() => {
    const initializeSystem = async () => {
      try {
        console.log('🚀 === 시스템 초기화 및 세션 복원 시작 ===');
        
        const health = await api.checkHealth();
        setBackendConnected(health.connected);
        setConnectionStatus(health.connected ? 'connected' : 'disconnected');
        
        if (webauthnSupport.supported) {
          const loaded = await loadWebAuthn();
          setIsLibraryLoaded(loaded);
        }
        
        console.log('🔧 저장된 세션 복원 시도...');
        const restoredSession = await api.restoreSession();
        
        if (restoredSession && restoredSession.success) {
          console.log('✅ 세션 복원 성공! 자동 로그인 처리');
          console.log('📊 복원된 데이터:', {
            userId: restoredSession.user.id,
            did: restoredSession.user.did,
            wallet: restoredSession.user.walletAddress,
            cue: restoredSession.user.cueBalance,
            trust: restoredSession.user.trustScore
          });
          
          setUser(restoredSession.user);
          
          if (restoredSession.user.did) {
            try {
              const passportData = await api.loadPassport(restoredSession.user.did);
              setPassport(passportData);
              setCueBalance(passportData.cueBalance || restoredSession.user.cueBalance || 0);
            } catch (error) {
              console.warn('⚠️ 패스포트 로드 실패, 기본값 사용:', error.message);
              setCueBalance(restoredSession.user.cueBalance || 0);
            }
          } else {
            setCueBalance(restoredSession.user.cueBalance || 0);
          }
          
          setIsAuthenticated(true);
          console.log('🎉 자동 로그인 완료!');
        } else {
          console.log('❌ 저장된 세션 없음 또는 만료됨');
        }
        
        setIsInitialized(true);
        console.log('✅ 시스템 초기화 완료');
      } catch (error) {
        console.error('❌ 초기화 실패:', error);
        setIsInitialized(true);
      }
    };
    
    initializeSystem();
  }, [api, webauthnSupport]);

  const retryBackendConnection = useCallback(async () => {
    const health = await api.checkHealth();
    setBackendConnected(health.connected);
    setConnectionStatus(health.connected ? 'connected' : 'disconnected');
  }, [api]);

  const handleRegister = async () => {
    try {
      console.log('🚀 === 등록 프로세스 시작 (영구 패스키 지원) ===');
      
      setError('');
      setIsRegistering(true);
      setRegistrationStep('auth');

      const result = await api.startWebAuthnRegistration();
      
      if (!result.success || !result.user) {
        throw new Error('등록 응답이 올바르지 않습니다');
      }

      console.log('✅ WebAuthn 등록 성공:', {
        action: result.action,
        isExisting: result.isExistingUser,
        userId: result.user.id
      });

      if (result.isExistingUser || result.action === 'login') {
        console.log('🔄 기존 사용자 데이터 복원 중...');
        console.log('💎 유지된 데이터:', {
          did: result.user.did,
          wallet: result.user.walletAddress,
          cue: result.user.cueBalance,
          trust: result.user.trustScore
        });
        
        setUser(result.user);
        
        if (result.user.did) {
          try {
            const passportData = await api.loadPassport(result.user.did);
            setPassport(passportData);
            setCueBalance(passportData.cueBalance || result.user.cueBalance || 0);
          } catch (error) {
            console.warn('패스포트 로드 실패, 기본값 사용');
            setCueBalance(result.user.cueBalance || 0);
          }
        } else {
          setCueBalance(result.user.cueBalance || 0);
        }
        
        setRegistrationStep('complete');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } else {
        console.log('🆕 신규 사용자 등록 처리');
        
        setRegistrationStep('wallet');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setRegistrationStep('passport');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setUser(result.user);
        
        if (result.user.did) {
          try {
            const passportData = await api.loadPassport(result.user.did);
            setPassport(passportData);
            setCueBalance(passportData.cueBalance || result.user.cueBalance || 0);
          } catch (error) {
            console.warn('패스포트 로드 실패, 기본값 사용');
            setCueBalance(result.user.cueBalance || 0);
          }
        } else {
          setCueBalance(result.user.cueBalance || 0);
        }
        
        setRegistrationStep('complete');
        await new Promise(resolve => setTimeout(resolve, 1500));
      }

      console.log('🎉 처리 완료! 메인 화면으로 전환...');
      setIsAuthenticated(true);
      setIsRegistering(false);
      setRegistrationStep('waiting');

    } catch (error) {
      console.error('💥 등록 실패:', error);
      
      let errorMessage = error.message;
      if (error.message.includes('취소')) {
        errorMessage = '생체인증이 취소되었습니다. 다시 시도해주세요.';
      } else if (error.message.includes('지원하지 않')) {
        errorMessage = '이 기기는 생체인증을 지원하지 않습니다. 다른 기기를 사용해주세요.';
      } else if (error.message.includes('백엔드')) {
        errorMessage = '서버 연결에 문제가 있습니다. 잠시 후 다시 시도해주세요.';
      }
      
      setError(errorMessage);
      setIsRegistering(false);
      setRegistrationStep('waiting');
    }
  };

  const handleLogout = async () => {
    console.log('🔧 === 로그아웃 프로세스 시작 ===');
    
    try {
      await api.logout();
      
      setIsAuthenticated(false);
      setUser(null);
      setPassport(null);
      setMessages([]);
      setRegistrationStep('waiting');
      setError('');
      
      console.log('✅ 로그아웃 완료');
    } catch (error) {
      console.error('💥 로그아웃 오류:', error);
      setIsAuthenticated(false);
      setUser(null);
      setPassport(null);
      setMessages([]);
    }
  };

  const handleDebugCredential = useCallback(() => {
    const debugInfo = api.getDebugInfo();
    console.log('🔍 Mock 패스키 디버그 정보:', debugInfo);
    
    alert(`Mock 패스키 정보:\nID: ${debugInfo.mockCredential.id}\n세션 토큰: ${debugInfo.sessionToken ? '있음' : '없음'}\n세션 ID: ${debugInfo.sessionId ? '있음' : '없음'}`);
  }, [api]);

  const handle30SecondOnboarding = async () => {
    return await handleRegister();
  };

  const handleSendMessage = async (message, model) => {
    const userMessage = {
      id: `msg_${Date.now()}_user`,
      type: 'user',
      content: message,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    try {
      const response = await api.sendChatMessage(message, model, user?.did);
      
      const aiMessage = {
        id: `msg_${Date.now()}_ai`,
        type: 'ai',
        content: response.response,
        timestamp: new Date().toISOString(),
        model: response.model,
        cueReward: response.cueReward,
        trustScore: response.trustScore
      };
      
      setMessages(prev => [...prev, aiMessage]);
      
      if (response.cueReward) {
        setCueBalance(prev => prev + response.cueReward);
        setTodaysMining(prev => prev + response.cueReward);
      }
      
    } catch (error) {
      console.error('메시지 전송 실패:', error);
    }
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-gray-600">CUE Protocol 초기화 중...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <OnboardingFlow
        step={registrationStep}
        isLoading={isRegistering}
        onStart={handle30SecondOnboarding}
        backendConnected={backendConnected}
        backendMode={connectionStatus}
        webauthnSupport={webauthnSupport}
        error={error}
        onRetryConnection={retryBackendConnection}
        onDebugCredential={handleDebugCredential}
      />
    );
  }

  return (
    <MainLayout
      passport={passport}
      cueBalance={cueBalance}
      todaysMining={todaysMining}
      backendConnected={backendConnected}
      connectionStatus={connectionStatus}
      connectionDetails={{}}
      messages={messages}
      isLoadingChat={false}
      selectedModel={selectedModel}
      onModelChange={setSelectedModel}
      currentView={currentView}
      onViewChange={setCurrentView}
      onSendMessage={handleSendMessage}
      onUpdatePassport={() => {}}
      onLogout={handleLogout}
      onRetryConnection={retryBackendConnection}
    />
  );
}

export default CUEProtocolApp;