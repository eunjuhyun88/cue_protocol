// frontend/src/components/AIPassportSystem.tsx
// ============================================================================ 
// /frontend/src/components/AIPassportSystem.tsx
// 🌐 AI Passport 시스템 컴포넌트 (영구 패스키 지원 완료)
// ============================================================================ 
// 이 컴포넌트는 AI Passport 시스템의 전체 흐름을 관리합니다.   
// 사용자 인증 상태에 따라 등록 흐름 또는 메인 대시보드를 렌더링합니다.
// 등록 흐름은 WebAuthn을 사용하여 생체인증을 처리하고,
// 블록체인 지갑과 DID를 생성합니다.
// 메인 대시보드는 AI 채팅 인터페이스와 데이터 볼트 관리 기능을 포함합니다.
// 이 컴포넌트는 클라이언트 측에서 동적으로 WebAuthn 라이브러리를 로드하여
// 오류를 방지하고, 로딩 상태를 표시합니다.
// 이 컴포넌트는 WebAuthn 등록 및 로그인, AI 채팅, CUE 마이닝,
// 데이터 볼트 관리 등의 기능을 포함합니다.
// 이 컴포넌트는 사용자 세션을 영구적으로 유지하고,   
// 페이지 새로고침 시 세션을 복원합니다.  
// 🔧 수정사항: 영구 Mock 패스키 지원으로 기존 사용자 정확 인식
// ============================================================================

'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Shield, Fingerprint, CheckCircle, AlertCircle, Database, 
  Wifi, WifiOff,MessageCircle,User,Coins,Settings,LogOut,Loader2,
  X,Menu, Send,Mic,Paperclip,Sparkles,Activity,BarChart3,Clock,Link,Star,Zap,Eye,
  Copy,Key,Globe,ArrowUp,Hash
} from 'lucide-react';


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

// 🔧 완전한 데이터 유지 API 클라이언트 (영구 패스키 지원)
class PersistentDataAPIClient {
  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    this.websocket = null;
    this.listeners = new Map();
    this.mockCredentialKey = 'cue_mock_credential'; // 🔑 영구 Mock 패스키 저장 키
  }

  // WebSocket 연결
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

  // 실시간 리스너 등록
  onRealtimeUpdate(callback) {
    const id = Math.random().toString(36);
    this.listeners.set(id, callback);
    return () => this.listeners.delete(id);
  }

  // 🔑 영구 Mock 패스키 관리 (핵심 수정!)
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
      // 1. 기존 Mock 패스키 조회
      const existingCred = localStorage.getItem(this.mockCredentialKey);
      if (existingCred) {
        const parsed = JSON.parse(existingCred);
        console.log('🔄 기존 Mock 패스키 재사용:', parsed.id);
        return parsed;
      }

      // 2. 새 Mock 패스키 생성 (디바이스 고유)
      const deviceFingerprint = [
        navigator.userAgent,
        navigator.platform,
        window.screen.width,
        window.screen.height,
        navigator.language,
        Intl.DateTimeFormat().resolvedOptions().timeZone
      ].join('|');

      // 안정적인 해시 생성
      let hash = 0;
      for (let i = 0; i < deviceFingerprint.length; i++) {
        const char = deviceFingerprint.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // 32bit 정수로 변환
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

      // 3. localStorage에 영구 저장
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

  // Mock 패스키 초기화 (디버깅용)
  clearMockCredential() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.mockCredentialKey);
      console.log('🗑️ Mock 패스키 초기화됨');
    }
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const sessionToken = localStorage.getItem('cue_session_token');
    const sessionId = localStorage.getItem('cue_session_id');
    console.log('📞 API 요청:', {
        endpoint,
        hasToken: !!sessionToken,
        hasSessionId: !!sessionId,
        method: options.method || 'GET'
      });
    try {
      const response = await fetch(url, {
        ...options,
        headers: { 
          'Content-Type': 'application/json',
           ...(sessionToken && { 'Authorization': `Bearer ${sessionToken}` }),
        ...(sessionId && !sessionToken && { 'X-Session-ID': sessionId }),
        ...options.headers 
        },
        mode: 'cors',
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

         // 🔧 401 에러 시 세션 토큰 삭제
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
      return await response.json();
    } catch (error) {
      console.error(`API 요청 실패: ${url}`, error.message);
      
      // Mock 폴백 데이터
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
        const isExisting = Math.random() > 0.3; // 70% 확률로 기존 사용자 (테스트용)
        
        return {
          success: true,
          sessionId: `perm_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`,
          sessionToken: `token_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`, // JWT 토큰 지원
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
              ? new Date(Date.now() - 86400000 * 14).toISOString() // 14일 전
              : new Date().toISOString()
          },
          message: isExisting 
            ? '기존 계정으로 로그인되었습니다. 모든 데이터가 유지됩니다.'
            : '새로운 AI Passport가 생성되었습니다!'
        };
      }
      
      if (endpoint.includes('session/restore')) {
        // 50% 확률로 성공적인 세션 복원
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
              registeredAt: new Date(Date.now() - 86400000 * 7).toISOString() // 7일 전
            }
          };
        } else {
          return { success: false, error: 'No valid session found' };
        }
      }
      
      throw error;
    }
  }

  // 🔧 WebAuthn 등록 (영구 패스키 지원)
  async startWebAuthnRegistration() {
    console.log('🆕 === WebAuthn 등록 시작 (영구 패스키 지원) ===');

    try {
      // Step 1: 등록 시작 요청
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

      // Step 2: WebAuthn 라이브러리 확인 및 패스키 처리
      console.log('📦 2단계: WebAuthn 라이브러리 로드 확인');
      const loaded = await loadWebAuthn();
      
      let credential;
      
      if (!loaded) {
        console.warn('⚠️ WebAuthn 라이브러리 없음 - 영구 Mock 패스키 사용');
        
        // 🔧 핵심 수정: 영구 Mock 패스키 사용
        credential = this.getOrCreateMockCredential();
        console.log('🔑 사용 중인 Mock 패스키:', credential.id);
      } else {
        console.log('👆 2단계: 실제 생체인증 실행...');
        
        try {
          // 🔧 먼저 기존 패스키로 로그인 시도
          try {
            const authOptions = {
              ...startResponse.options,
              allowCredentials: [] // 모든 기존 패스키 허용
            };
            credential = await startAuthentication(authOptions);
            console.log('✅ 기존 패스키 인증 성공:', credential.id);
          } catch (authError) {
            // 기존 패스키가 없으면 새로 등록
            console.log('🆕 기존 패스키 없음, 새 패스키 등록 중...');
            credential = await startRegistration(startResponse.options);
            console.log('✅ 새 패스키 등록 성공:', credential.id);
          }
        } catch (webauthnError) {
          console.error('❌ WebAuthn 실행 실패:', webauthnError);
          throw webauthnError;
        }
      }

      // Step 3: 등록 완료 요청
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

      // ✅ 응답 검증 강화
      if (!completeResponse.success) {
        throw new Error(completeResponse.message || '등록 완료 처리 실패');
      }

      if (!completeResponse.user) {
        throw new Error('사용자 정보가 응답에 포함되지 않았습니다');
      }

      // 🔧 영구 세션 토큰 저장 (JWT 지원)
      if (completeResponse.sessionToken) {
        console.log('💾 JWT 세션 토큰 localStorage 저장');
        localStorage.setItem('cue_session_token', completeResponse.sessionToken);
      }
      
      // 🔧 하위 호환성: 세션 ID도 저장
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

  // 🔧 세션 복원 (JWT 토큰 우선, 세션 ID 폴백)
  async restoreSession() {
    console.log('🔧 === 세션 복원 시도 ===');
    
    try {
      // JWT 토큰 우선 확인
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

      // JWT 토큰 기반 복원 시도
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

      // 세션 ID 기반 복원 시도 (폴백)
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
      // 오류 발생 시 모든 세션 데이터 삭제
      localStorage.removeItem('cue_session_token');
      localStorage.removeItem('cue_session_id');
      return null;
    }
  }

  // 🔧 로그아웃 (모든 세션 무효화)
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

      // 모든 로컬 세션 데이터 삭제
      localStorage.removeItem('cue_session_token');
      localStorage.removeItem('cue_session_id');
      console.log('✅ 로그아웃 완료');

      return { success: true };

    } catch (error) {
      console.error('💥 로그아웃 오류:', error);
      // 오류가 발생해도 로컬 세션은 삭제
      localStorage.removeItem('cue_session_token');
      localStorage.removeItem('cue_session_id');
      return { success: false, error: error.message };
    }
  }

  // AI 채팅
  async sendChatMessage(message, model, userDid) {
    try {
      return await this.request('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ message, model, userDid })
      });
    } catch {
      // 모의 AI 응답
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

  // CUE 마이닝
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

  // 패스포트 데이터 로드
  async loadPassport(did) {
    try {
      return await this.request(`/api/passport/${did}`);
    } catch {
      return {
        did,
        username: did.split(':').pop(),
        trustScore: 85 + Math.floor(Math.random() * 15),
        level: 'Verified Agent',
        cueBalance: 2500 + Math.floor(Math.random() * 3000),
        totalMined: 25000 + Math.floor(Math.random() * 50000),
        personalityProfile: {
          traits: ['창의적', '분석적', '신뢰할 수 있는'],
          communicationStyle: 'friendly',
          expertise: ['AI', 'Web3', 'Protocol Design']
        },
        connectedPlatforms: ['ChatGPT', 'Claude', 'Discord'],
        achievements: [
          { name: 'First CUE', icon: '🎯', earned: true },
          { name: 'Trusted Agent', icon: '🛡️', earned: true },
          { name: 'Platform Master', icon: '🌐', earned: false }
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

  // 디버깅 정보
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

// 컴포넌트들
const LoadingSpinner = ({ size = 'md', className = '' }) => (
  <Loader2 className={`animate-spin ${
    size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-8 h-8' : 'w-6 h-6'
  } ${className}`} />
);

const StatusIndicator = ({ connected, mode }) => (
  <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium ${
    connected ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
  }`}>
    {connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
    <span>{connected ? `Real (${mode})` : 'Mock Mode'}</span>
  </div>
);

// 온보딩 플로우 (30초 목표)
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-8 border border-gray-100">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <div className="mx-auto w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-6 shadow-lg">
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

        {/* 시스템 상태 */}
        <div className="flex justify-center mb-6">
          <StatusIndicator connected={backendConnected} mode={backendMode} />
        </div>

        {/* WebAuthn 지원 상태 */}
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

        {/* 에러 메시지 */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* 액션 버튼 */}
        {step === 'waiting' && (
          <div className="space-y-4">
            {/* 핵심 기능 강조 */}
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

            {/* 디버깅 버튼 */}
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
              <ArrowUp className="w-5 h-5" />
              <span>AI Passport 사용하기</span>
            </div>
          </button>
        )}

        {/* 백엔드 연결 재시도 */}
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

// 메인 대시보드 (로그인 후)
const MainDashboard = ({ user, passport, onLogout, backendConnected, backendMode, onRetryConnection }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [api] = useState(() => new PersistentDataAPIClient());
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [currentView, setCurrentView] = useState('chat');
  const [cueBalance, setCueBalance] = useState(passport?.cueBalance || user?.cueBalance || 0);
  const messagesEndRef = useRef(null);

  // 반응형 감지
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkIsMobile = () => setIsMobile(window.innerWidth < 768);
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  // 자동 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 실시간 업데이트 설정
  useEffect(() => {
    api.connectWebSocket();
    const unsubscribe = api.onRealtimeUpdate((data) => {
      if (data.type === 'cue_update') {
        setCueBalance(data.balance);
      }
    });
    return unsubscribe;
  }, [api]);

  // 메시지 전송
  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    
    const userMessage = {
      role: 'user',
      content: newMessage,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setNewMessage('');
    setIsTyping(true);
    
    try {
      const response = await api.sendChatMessage(newMessage, 'gpt-4o', user?.did);
      
      const aiMessage = {
        role: 'assistant',
        content: response.response,
        timestamp: new Date().toISOString(),
        model: response.model,
        cueReward: response.cueReward,
        trustScore: response.trustScore
      };
      
      setMessages(prev => [...prev, aiMessage]);
      
      // CUE 마이닝
      if (response.cueReward) {
        setCueBalance(prev => prev + response.cueReward);
        await api.mineCUE(user?.did, 'chat_interaction');
      }
      
    } catch (error) {
      console.error('메시지 전송 실패:', error);
      const errorMessage = {
        role: 'assistant',
        content: '죄송합니다. 메시지 전송 중 오류가 발생했습니다.',
        timestamp: new Date().toISOString(),
        error: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  // 키보드 단축키
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* 헤더 - 고정 */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex-shrink-0 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {isMobile && (
              <button
                onClick={() => setShowMobileSidebar(true)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">CUE Protocol</h1>
                <p className="text-xs text-gray-600">영구 데이터 보존 AI 에이전트</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <StatusIndicator connected={backendConnected} mode={backendMode} />
            
            {/* CUE 잔액 표시 */}
            <div className="hidden sm:flex items-center space-x-2 px-3 py-1 bg-gradient-to-r from-yellow-100 to-orange-100 rounded-full">
              <Coins className="w-4 h-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-800">{cueBalance.toLocaleString()} CUE</span>
            </div>
            
            <button
              onClick={onLogout}
              className="flex items-center space-x-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">로그아웃</span>
            </button>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 왼쪽 사이드바 - AI Passport Zone (독립 스크롤) */}
        <aside className={`
          w-80 bg-white border-r border-gray-200 flex flex-col overflow-hidden
          ${isMobile ? (showMobileSidebar ? 'fixed inset-y-0 left-0 z-50 shadow-2xl' : 'hidden') : 'relative'}
        `}>
          {/* 모바일 헤더 */}
          {isMobile && showMobileSidebar && (
            <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Shield className="w-3 h-3 text-white" />
                </div>
                <h2 className="font-semibold text-gray-900">AI Passport</h2>
              </div>
              <button
                onClick={() => setShowMobileSidebar(false)}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* AI Passport 메인 카드 - 고정 위치 */}
          <div className="p-6 border-b border-gray-200 flex-shrink-0">
            <div className="bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 rounded-2xl p-6 text-white relative overflow-hidden shadow-xl">
              {/* 배경 패턴 */}
              <div className="absolute inset-0 bg-white opacity-5">
                <div className="absolute top-0 right-0 w-32 h-32 rounded-full -mr-16 -mt-16"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full -ml-12 -mb-12"></div>
              </div>
              
              <div className="relative z-10">
                {/* AI Passport 헤더 */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                      <Shield className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">AI Passport</h3>
                      <p className="text-blue-100 text-sm">{passport?.level || user?.passportLevel || 'Verified Agent'}</p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 text-yellow-300" />
                      <span className="text-lg font-bold">{passport?.trustScore || user?.trustScore || 95}%</span>
                    </div>
                    <p className="text-blue-100 text-xs">Trust Score</p>
                  </div>
                </div>

                {/* 사용자 정보 */}
                <div className="text-center mb-6">
                  <div className="w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-3 backdrop-blur-sm">
                    <User className="w-10 h-10" />
                  </div>
                  <h4 className="text-xl font-bold">{user?.username || 'Agent'}</h4>
                  <p className="text-blue-100 text-sm">{user?.userEmail || user?.email || 'demo@cueprotocol.ai'}</p>
                </div>
                
                {/* CUE 잔액과 통계 - 3열 그리드 */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white bg-opacity-15 rounded-xl p-3 text-center backdrop-blur-sm">
                    <Coins className="w-5 h-5 mx-auto mb-1 text-yellow-300" />
                    <p className="text-lg font-bold">{cueBalance.toLocaleString()}</p>
                    <p className="text-xs text-blue-100">CUE</p>
                  </div>
                  
                  <div className="bg-white bg-opacity-15 rounded-xl p-3 text-center backdrop-blur-sm">
                    <Activity className="w-5 h-5 mx-auto mb-1 text-green-300" />
                    <p className="text-lg font-bold">{Math.floor((passport?.totalMined || 25430) / 1000)}K</p>
                    <p className="text-xs text-blue-100">Mined</p>
                  </div>
                  
                  <div className="bg-white bg-opacity-15 rounded-xl p-3 text-center backdrop-blur-sm">
                    <Globe className="w-5 h-5 mx-auto mb-1 text-purple-300" />
                    <p className="text-lg font-bold">{passport?.connectedPlatforms?.length || 3}</p>
                    <p className="text-xs text-blue-100">Linked</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 스크롤 가능한 콘텐츠 영역 */}
          <div className="flex-1 overflow-y-auto">
            {/* DID 정보 */}
            <div className="p-6 border-b border-gray-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                <Hash className="w-4 h-4 mr-2" />
                Digital Identity (영구 보존)
              </h4>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-gray-600">DID:</span>
                  <div className="flex items-center space-x-2 mt-1">
                    <p className="font-mono text-xs text-gray-800 bg-gray-100 px-2 py-1 rounded flex-1 truncate">
                      {user?.did || 'did:cue:unavailable'}
                    </p>
                    <button className="p-1 hover:bg-gray-200 rounded">
                      <Copy className="w-3 h-3 text-gray-500" />
                    </button>
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Wallet:</span>
                  <div className="flex items-center space-x-2 mt-1">
                    <p className="font-mono text-xs text-gray-800 bg-gray-100 px-2 py-1 rounded flex-1 truncate">
                      {user?.walletAddress || '0x...'}
                    </p>
                    <button className="p-1 hover:bg-gray-200 rounded">
                      <Copy className="w-3 h-3 text-gray-500" />
                    </button>
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">가입일:</span>
                  <p className="text-gray-800">
                    {user?.registeredAt ? new Date(user.registeredAt).toLocaleDateString() : 'Today'}
                  </p>
                </div>
              </div>
            </div>

            {/* 개성 프로필 */}
            <div className="p-6 border-b border-gray-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                <Sparkles className="w-4 h-4 mr-2" />
                Personality Profile
              </h4>
              <div className="space-y-3">
                {passport?.personalityProfile?.traits && (
                  <div>
                    <span className="text-xs text-gray-600 uppercase tracking-wide">Traits</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {passport.personalityProfile.traits.map((trait, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full"
                        >
                          {trait}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {passport?.personalityProfile?.expertise && (
                  <div>
                    <span className="text-xs text-gray-600 uppercase tracking-wide">Expertise</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {passport.personalityProfile.expertise.map((skill, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 연결된 플랫폼 */}
            <div className="p-6 border-b border-gray-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                <Globe className="w-4 h-4 mr-2" />
                Connected Platforms
              </h4>
              <div className="space-y-2">
                {passport?.connectedPlatforms?.map((platform, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-700">{platform}</span>
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  </div>
                )) || (
                  <div className="space-y-2">
                    {['ChatGPT', 'Claude', 'Discord'].map((platform, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-700">{platform}</span>
                        <div className={`w-2 h-2 ${backendConnected ? 'bg-green-500' : 'bg-yellow-500'} rounded-full`}></div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 성취/업적 */}
            <div className="p-6">
              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                <Star className="w-4 h-4 mr-2" />
                Achievements
              </h4>
              <div className="space-y-2">
                {passport?.achievements?.map((achievement, index) => (
                  <div key={index} className={`flex items-center space-x-3 p-2 rounded-lg ${
                    achievement.earned ? 'bg-green-50' : 'bg-gray-50'
                  }`}>
                    <span className="text-lg">{achievement.icon}</span>
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${
                        achievement.earned ? 'text-green-800' : 'text-gray-600'
                      }`}>
                        {achievement.name}
                      </p>
                    </div>
                    {achievement.earned && (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    )}
                  </div>
                )) || (
                  <div className="space-y-2">
                    {[
                      { name: 'First Login', icon: '🎯', earned: true },
                      { name: 'AI Chat Master', icon: '🤖', earned: true },
                      { name: 'CUE Collector', icon: '💰', earned: false }
                    ].map((achievement, index) => (
                      <div key={index} className={`flex items-center space-x-3 p-2 rounded-lg ${
                        achievement.earned ? 'bg-green-50' : 'bg-gray-50'
                      }`}>
                        <span className="text-lg">{achievement.icon}</span>
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${
                            achievement.earned ? 'text-green-800' : 'text-gray-600'
                          }`}>
                            {achievement.name}
                          </p>
                        </div>
                        {achievement.earned && (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </aside>

        {/* 오른쪽 메인 영역 - AI 채팅 (독립 스크롤) */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* 채팅 메시지 영역 - 스크롤 가능 */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
            {messages.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <MessageCircle className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  안녕하세요, {user?.username}님! 🌟
                </h3>
                <p className="text-gray-600 max-w-md mx-auto leading-relaxed">
                  영구 데이터 보존 기능을 갖춘 CUE Protocol AI 에이전트입니다.<br />
                  모든 대화와 데이터는 안전하게 저장되며 새로고침해도 유지됩니다.
                </p>
                
                {/* 빠른 시작 버튼들 */}
                <div className="flex flex-wrap gap-2 justify-center mt-6">
                  {[
                    "CUE Protocol에 대해 알려줘",
                    "영구 데이터 보존은 어떻게 작동해?",
                    "Web3와 AI의 융합",
                    "블록체인 지갑 설명"
                  ].map((prompt, index) => (
                    <button
                      key={index}
                      onClick={() => setNewMessage(prompt)}
                      className="px-4 py-2 bg-white border border-gray-200 rounded-full text-sm text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>

                {/* 백엔드 연결 상태에 따른 안내 */}
                {!backendConnected && (
                  <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                    <p className="text-sm text-yellow-800">
                      ⚠️ 백엔드 서버에 연결할 수 없어 Mock 모드로 실행됩니다.<br />
                      실제 AI 응답을 받으려면 백엔드 서버를 실행해주세요.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-2xl px-4 py-3 rounded-2xl ${
                      message.role === 'user'
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                        : message.error
                        ? 'bg-red-50 border border-red-200 text-red-800'
                        : 'bg-white border border-gray-200 text-gray-900 shadow-sm'
                    }`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                    
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-opacity-20">
                      <p className="text-xs opacity-70">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </p>
                      
                      <div className="flex items-center space-x-2">
                        {message.model && (
                          <span className="text-xs opacity-70">{message.model}</span>
                        )}
                        
                        {message.cueReward && (
                          <div className="flex items-center space-x-1">
                            <Coins className="w-3 h-3 text-yellow-500" />
                            <span className="text-xs text-yellow-600 font-medium">
                              +{message.cueReward} CUE
                            </span>
                          </div>
                        )}
                        
                        {message.trustScore && (
                          <div className="flex items-center space-x-1">
                            <Star className="w-3 h-3 text-blue-500" />
                            <span className="text-xs text-blue-600 font-medium">
                              {Math.round(message.trustScore * 100)}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
            
            {/* 타이핑 인디케이터 */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                    <span className="text-xs text-gray-500">AI가 응답하고 있습니다...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* 메시지 입력창 - 고정 */}
          <div className="border-t border-gray-200 bg-white p-4 flex-shrink-0">
            <div className="flex items-end space-x-3 max-w-4xl mx-auto">
              <div className="flex-1 relative">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="영구 보존되는 AI 에이전트와 대화하기..."
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                  rows={newMessage.split('\n').length || 1}
                  style={{ minHeight: '48px', maxHeight: '120px' }}
                  disabled={isTyping}
                />
                
                {/* 첨부파일 버튼 */}
                <button className="absolute right-3 bottom-3 p-1 text-gray-400 hover:text-gray-600 transition-colors">
                  <Paperclip className="w-4 h-4" />
                </button>
              </div>
              
              {/* 음성 입력 버튼 */}
              <button className="p-3 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
                <Mic className="w-5 h-5" />
              </button>
              
              {/* 전송 버튼 */}
              <button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || isTyping}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                {isTyping ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span className="hidden sm:inline font-medium">전송</span>
                  </>
                )}
              </button>
            </div>
            
            {/* 입력 도움말 */}
            <div className="flex items-center justify-center mt-2 text-xs text-gray-500">
              <span>Enter로 전송, Shift+Enter로 줄바꿈 | 모든 데이터는 영구 보존됩니다</span>
            </div>
          </div>
        </main>
      </div>

      {/* 모바일 오버레이 */}
      {isMobile && showMobileSidebar && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setShowMobileSidebar(false)}
        />
      )}
    </div>
  );
};

// 메인 앱 컴포넌트
export default function AIPassportSystem() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registrationStep, setRegistrationStep] = useState('waiting');
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [passport, setPassport] = useState(null);
  
  // 시스템 상태
  const [backendConnected, setBackendConnected] = useState(false);
  const [backendMode, setBackendMode] = useState('checking');
  const [isLibraryLoaded, setIsLibraryLoaded] = useState(false);
  
  // WebAuthn 지원 확인
  const [webauthnSupport] = useState(() => checkWebAuthnSupport());
  
  // API 클라이언트
  const [api] = useState(() => new PersistentDataAPIClient());

  // 🔧 초기화 및 세션 복원
  useEffect(() => {
    const initializeSystem = async () => {
      try {
        console.log('🚀 === 시스템 초기화 및 세션 복원 시작 ===');
        
        // 백엔드 연결 확인
        const health = await api.checkHealth();
        setBackendConnected(health.connected);
        setBackendMode(health.mode || 'unknown');
        
        // WebAuthn 라이브러리 로드
        if (webauthnSupport.supported) {
          const loaded = await loadWebAuthn();
          setIsLibraryLoaded(loaded);
        }
        
        // 🔧 세션 복원 시도 (핵심!)
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
          
          // 패스포트 데이터 로드
          if (restoredSession.user.did) {
            try {
              const passportData = await api.loadPassport(restoredSession.user.did);
              setPassport(passportData);
            } catch (error) {
              console.warn('⚠️ 패스포트 로드 실패, 기본값 사용:', error.message);
            }
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
  }, []);

  // 백엔드 재연결
  const retryBackendConnection = useCallback(async () => {
    const health = await api.checkHealth();
    setBackendConnected(health.connected);
    setBackendMode(health.mode || 'unknown');
  }, [api]);

  // 🔧 등록 핸들러 (영구 패스키 지원)
  const handleRegister = async () => {
    try {
      console.log('🚀 === 등록 프로세스 시작 (영구 패스키 지원) ===');
      
      setError('');
      setIsRegistering(true);
      setRegistrationStep('auth');

      // WebAuthn 등록 (영구 패스키 지원)
      const result = await api.startWebAuthnRegistration();
      
      if (!result.success || !result.user) {
        throw new Error('등록 응답이 올바르지 않습니다');
      }

      console.log('✅ WebAuthn 등록 성공:', {
        action: result.action,
        isExisting: result.isExistingUser,
        userId: result.user.id
      });

      // 🎯 기존 사용자 vs 신규 사용자 처리
      if (result.isExistingUser || result.action === 'login') {
        console.log('🔄 기존 사용자 데이터 복원 중...');
        console.log('💎 유지된 데이터:', {
          did: result.user.did,
          wallet: result.user.walletAddress,
          cue: result.user.cueBalance,
          trust: result.user.trustScore
        });
        
        // 기존 사용자는 바로 로그인 처리
        setUser(result.user);
        
        if (result.user.did) {
          try {
            const passportData = await api.loadPassport(result.user.did);
            setPassport(passportData);
          } catch (error) {
            console.warn('패스포트 로드 실패, 기본값 사용');
          }
        }
        
        setRegistrationStep('complete');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } else {
        console.log('🆕 신규 사용자 등록 처리');
        
        // 신규 사용자는 월렛 생성 단계 표시
        setRegistrationStep('wallet');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setRegistrationStep('passport');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setUser(result.user);
        
        if (result.user.did) {
          try {
            const passportData = await api.loadPassport(result.user.did);
            setPassport(passportData);
          } catch (error) {
            console.warn('패스포트 로드 실패, 기본값 사용');
          }
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
      
      // 사용자 친화적 에러 메시지
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

  // 🔧 로그아웃 핸들러 (완전한 세션 정리)
  const handleLogout = async () => {
    console.log('🔧 === 로그아웃 프로세스 시작 ===');
    
    try {
      // 서버 세션 무효화
      await api.logout();
      
      // 상태 완전 초기화
      setIsAuthenticated(false);
      setUser(null);
      setPassport(null);
      setRegistrationStep('waiting');
      setError('');
      
      console.log('✅ 로그아웃 완료');
    } catch (error) {
      console.error('💥 로그아웃 오류:', error);
      // 오류가 발생해도 프론트엔드 상태는 초기화
      setIsAuthenticated(false);
      setUser(null);
      setPassport(null);
    }
  };

  // 🔍 Mock 패스키 디버깅 (테스트용)
  const handleDebugCredential = useCallback(() => {
    const debugInfo = api.getDebugInfo();
    console.log('🔍 Mock 패스키 디버그 정보:', debugInfo);
    
    alert(`Mock 패스키 정보:\nID: ${debugInfo.mockCredential.id}\n세션 토큰: ${debugInfo.sessionToken ? '있음' : '없음'}\n세션 ID: ${debugInfo.sessionId ? '있음' : '없음'}`);
  }, [api]);

  // 로딩 중
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-gray-600">CUE Protocol 초기화 및 세션 복원 중...</p>
          <p className="text-sm text-gray-500 mt-2">
            백엔드 연결 확인 및 저장된 세션 복원을 진행하고 있습니다
          </p>
        </div>
      </div>
    );
  }

  // 메인 렌더링
  if (!isAuthenticated) {
    return (
      <OnboardingFlow
        step={registrationStep}
        isLoading={isRegistering}
        onStart={handleRegister}
        backendConnected={backendConnected}
        backendMode={backendMode}
        webauthnSupport={webauthnSupport}
        error={error}
        onRetryConnection={retryBackendConnection}
        onDebugCredential={handleDebugCredential}
      />
    );
  }

  return (
    <MainDashboard
      user={user}
      passport={passport}
      onLogout={handleLogout}
      backendConnected={backendConnected}
      backendMode={backendMode}
      onRetryConnection={retryBackendConnection}
    />
  );
}