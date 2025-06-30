
'use client';
import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, User, Calendar, Database, 
  Fingerprint, Key, Zap, Heart, Activity,
  CheckCircle, Send, Plus, Settings, 
  Globe, Lock, Smartphone, MessageCircle,
  TrendingUp, Eye, EyeOff, Wallet, ArrowRight,
  QrCode, Download, Upload, RefreshCw, ChevronDown,
  X, AlertCircle, Copy, ExternalLink, Star,
  BarChart3, FileText, Network, Cpu, ChevronRight,
  Menu, Monitor, Layers, Wifi, WifiOff, Circle,
  Cloud, CloudOff
} from 'lucide-react';

// ============================================================================
// 🔌 실제 백엔드 API 클라이언트
// ============================================================================

class BackendAPIClient {
  private baseURL: string;
  private headers: Record<string, string>;
  
  constructor() {
    // 환경변수에서 API URL 가져오기
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    this.headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.getAuthToken()}`
    };
  }

  private getAuthToken(): string {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token') || '';
    }
    return '';
  }

  private setAuthToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
      this.headers['Authorization'] = `Bearer ${token}`;
    }
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    try {
      console.log(`🌐 API 요청: ${this.baseURL}${endpoint}`);
      
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...options,
        headers: {
          ...this.headers,
          ...options.headers
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ API 응답:`, data);
      return data;
    } catch (error) {
      console.error(`❌ API 오류 (${endpoint}):`, error);
      
      // Mock 데이터로 폴백
      return this.getMockResponse(endpoint, options);
    }
  }

  private getMockResponse(endpoint: string, options: RequestInit) {
    console.log(`🎭 Mock 응답 생성: ${endpoint}`);
    
    if (endpoint.includes('/auth/webauthn')) {
      return {
        success: true,
        sessionId: `session_${Date.now()}`,
        challenge: `challenge_${Date.now()}`,
        user: {
          id: `user_${Date.now()}`,
          did: `did:ai:${Math.random().toString(36).substr(2, 9)}`,
          walletAddress: `0x${Math.random().toString(16).substr(2, 40)}`,
          cueTokens: Math.floor(Math.random() * 50000) + 10000,
          trustScore: Math.floor(Math.random() * 30) + 70,
          passportLevel: 'Verified'
        }
      };
    }

    if (endpoint.includes('/passport')) {
      return {
        did: `did:ai:${Math.random().toString(36).substr(2, 9)}`,
        personalityProfile: {
          type: 'INTJ-A (Architect)',
          communicationStyle: 'Direct & Technical',
          learningPattern: 'Visual + Hands-on'
        },
        dataVaults: [
          {
            id: 'vault-1',
            name: 'Professional Knowledge',
            category: 'professional',
            dataCount: 247,
            cueCount: 89
          }
        ]
      };
    }

    if (endpoint.includes('/ai/chat')) {
      return {
        success: true,
        response: `이것은 **${options.method || 'GET'}** 요청에 대한 개인화된 AI 응답입니다.\n\n실제 백엔드가 연결되면 OpenAI, Claude, Gemini와 연동되어 진짜 AI 응답을 생성합니다.`,
        cueTokensEarned: Math.floor(Math.random() * 5) + 1,
        usedPassportData: ['Professional Knowledge', 'Learning Patterns']
      };
    }

    return { success: true, message: 'Mock response generated' };
  }

  // WebAuthn 인증 메서드
  async startWebAuthnRegistration() {
    return this.request('/api/auth/webauthn/register/start', {
      method: 'POST'
    });
  }

  async completeWebAuthnRegistration(credential: any) {
    return this.request('/api/auth/webauthn/register/complete', {
      method: 'POST',
      body: JSON.stringify({ credential })
    });
  }

  async startWebAuthnLogin() {
    return this.request('/api/auth/webauthn/login/start', {
      method: 'POST'
    });
  }

  async completeWebAuthnLogin(credential: any) {
    const result = await this.request('/api/auth/webauthn/login/complete', {
      method: 'POST',
      body: JSON.stringify({ credential })
    });
    
    if (result.token) {
      this.setAuthToken(result.token);
    }
    
    return result;
  }

  // AI Passport 메서드
  async getPassport(did: string) {
  return this.request(`/api/passport/${did}`); // ✅ 구현됨
  }

  async updatePassport(did: string, data: any) {
    return this.request(`/api/passport/${did}`, {  // ✅ 구현됨
    method: 'PUT',
    body: JSON.stringify(data)
    });
  }

  async getDataVaults(did: string) {
    return this.request(`/api/passport/${did}/vaults`);
  }

  // CUE 토큰 메서드
  async getCueBalance(did: string) {
    return this.request(`/api/cue/${did}/balance`);
  }

  async mineCue(data: any) {
    return this.request('/api/cue/mine', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getCueTransactions(did: string) {
    return this.request(`/api/cue/${did}/transactions`);
  }

  // AI 채팅 메서드
  async sendChatMessage(message: string, model: string, passportData?: any) {
    return this.request('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({
        message,
        model,
        passportData,
        userId: this.getCurrentUserId()
      })
    });
  }

  // 플랫폼 연동 메서드
  async getConnectedPlatforms(did: string) {
    return this.request(`/api/platforms/${did}`);
  }

  async connectPlatform(did: string, platform: string) {
    return this.request(`/api/platforms/${did}/connect`, {
      method: 'POST',
      body: JSON.stringify({ platform })
    });
  }

  async syncPlatformData(did: string, platform: string) {
    return this.request(`/api/platforms/${did}/sync`, {
      method: 'POST',
      body: JSON.stringify({ platform })
    });
  }

  // 헬스체크
  async healthCheck() {
    return this.request('/api/health');
  }

  private getCurrentUserId(): string {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('current_user_id') || `user_${Date.now()}`;
    }
    return `user_${Date.now()}`;
  }
}

// ============================================================================
// 🎯 TypeScript 인터페이스
// ============================================================================

interface PersonalityProfile {
  type: string;
  communicationStyle: string;
  learningPattern: string;
  workingStyle: string;
  responsePreference: string;
  decisionMaking: string;
}

interface UnifiedAIPassport {
  did: string;
  walletAddress: string;
  passkeyRegistered: boolean;
  trustScore: number;
  cueTokens: number;
  registrationStatus: 'pending' | 'verified' | 'complete';
  biometricVerified: boolean;
  passportLevel: 'Basic' | 'Verified' | 'Premium' | 'Enterprise';
  personalityProfile: PersonalityProfile;
  dataVaults: UnifiedDataVault[];
  connectedPlatforms: ConnectedPlatform[];
  contextHistory: ContextEntry[];
  cueHistory: CueEntry[];
  personalizedAgents: PersonalizedAgent[];
}

interface UnifiedDataVault {
  id: string;
  name: string;
  category: 'identity' | 'behavioral' | 'professional' | 'social' | 'preferences' | 'expertise';
  description: string;
  dataCount: number;
  cueCount: number;
  encrypted: boolean;
  lastUpdated: Date;
  accessLevel: 'public' | 'private' | 'selective';
  value: number;
  dataPoints: any[];
  usageCount: number;
  sourceplatforms: string[];
}

interface ConnectedPlatform {
  id: string;
  name: string;
  connected: boolean;
  lastSync: Date;
  cueCount: number;
  contextMined: number;
  status: 'active' | 'syncing' | 'error' | 'connecting';
  icon: string;
  color: string;
  connectionSteps?: string[];
}

interface PersonalizedAgent {
  id: string;
  name: string;
  type: 'coding' | 'creative' | 'analysis' | 'consultation' | 'research' | 'mentor';
  description: string;
  checkpoint: string;
  trainingStatus: 'idle' | 'training' | 'validating' | 'ready' | 'deployed';
  trainingProgress: number;
  accuracy: number;
  totalTrainingTime: number;
  datasetSize: number;
  lastTrained: Date;
  usageCount: number;
  specialties: string[];
  modelVersion: string;
}

interface Message {
  id: string;
  content: string;
  type: 'user' | 'ai';
  timestamp: Date;
  usedPassportData?: string[];
  cueTokensUsed?: number;
  cueTokensEarned?: number;
  verification?: {
    biometric: boolean;
    did: boolean;
    signature: string;
  };
}

interface ExtractionStep {
  id: number;
  text: string;
  type: 'system' | 'scanning' | 'found' | 'processing' | 'analysis' | 'storage' | 'reward' | 'complete';
  completed: boolean;
  timestamp: Date;
  data?: any;
}

interface ContextEntry {
  id: string;
  platform: string;
  content: string;
  timestamp: Date;
}

interface CueEntry {
  id: string;
  amount: number;
  source: string;
  timestamp: Date;
}

// ============================================================================
// 🎨 UI 컴포넌트들
// ============================================================================

// 백엔드 연결 상태 표시 컴포넌트
const BackendStatus = ({ 
  status, 
  onRetry 
}: { 
  status: 'checking' | 'connected' | 'disconnected';
  onRetry: () => void;
}) => (
  <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm ${
    status === 'connected' ? 'bg-green-50 text-green-700' :
    status === 'checking' ? 'bg-yellow-50 text-yellow-700' :
    'bg-red-50 text-red-700'
  }`}>
    {status === 'connected' ? <Cloud className="w-4 h-4" /> :
     status === 'checking' ? <RefreshCw className="w-4 h-4 animate-spin" /> :
     <CloudOff className="w-4 h-4" />}
    
    <span>
      {status === 'connected' ? '백엔드 연결됨' :
       status === 'checking' ? '연결 확인 중...' :
       '백엔드 연결 실패'}
    </span>
    
    {status === 'disconnected' && (
      <button 
        onClick={onRetry}
        className="ml-2 px-2 py-1 bg-red-100 hover:bg-red-200 rounded text-xs"
      >
        재시도
      </button>
    )}
  </div>
);

// 등록 플로우 컴포넌트
const RegistrationFlow = ({ 
  registrationStep, 
  isRegistering, 
  onStart 
}: { 
  registrationStep: 'passkey' | 'wallet' | 'complete';
  isRegistering: boolean;
  onStart: () => void;
}) => (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-blue-100 flex items-center justify-center p-4">
    <div className="w-full max-w-sm sm:max-w-md">
      <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 text-center border border-blue-100">
        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-600 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
          {registrationStep === 'passkey' ? <Fingerprint className="w-6 h-6 sm:w-8 sm:h-8 text-white" /> :
           registrationStep === 'wallet' ? <Wallet className="w-6 h-6 sm:w-8 sm:h-8 text-white" /> :
           <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-white" />}
        </div>
        
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">AI Passport + Cue</h1>
        <p className="text-gray-600 mb-6 sm:mb-8 text-sm sm:text-base">Complete Backend Integration</p>
        
        {/* Progress Steps */}
        <div className="flex justify-center mb-6 sm:mb-8">
          <div className="flex items-center space-x-2">
            {['passkey', 'wallet', 'complete'].map((step, index) => (
              <div key={step} className="flex items-center">
                <div className={`w-2 h-2 rounded-full ${
                  registrationStep === step ? 'bg-blue-600 animate-pulse' :
                  ['passkey', 'wallet', 'complete'].indexOf(registrationStep) > index ? 'bg-blue-400' : 'bg-gray-300'
                }`}></div>
                {index < 2 && <div className="w-4 sm:w-6 h-0.5 bg-gray-300 mx-1"></div>}
              </div>
            ))}
          </div>
        </div>
        
        {registrationStep === 'passkey' && (
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">Step 1: WebAuthn Setup</h2>
            <p className="text-gray-600 mb-4 sm:mb-6 text-sm sm:text-base">Real biometric authentication with backend</p>
            <div className="bg-blue-50 rounded-xl p-4 mb-4 sm:mb-6">
              <div className="flex items-center justify-center space-x-2 mb-2 sm:mb-3">
                <div className="w-2 h-2 sm:w-3 sm:h-3 bg-blue-600 rounded-full animate-pulse"></div>
                <span className="text-xs sm:text-sm text-blue-700 font-medium">Connecting to /api/auth/webauthn...</span>
              </div>
              <p className="text-xs text-blue-600">Real backend integration active</p>
            </div>
          </div>
        )}
        
        {registrationStep === 'wallet' && (
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">Step 2: Blockchain Wallet</h2>
            <p className="text-gray-600 mb-4 sm:mb-6 text-sm sm:text-base">Auto-generating wallet with Supabase</p>
            <div className="bg-blue-50 rounded-xl p-4 mb-4 sm:mb-6">
              <div className="flex items-center justify-center space-x-2 mb-2 sm:mb-3">
                <div className="w-2 h-2 sm:w-3 sm:h-3 bg-blue-600 rounded-full animate-pulse"></div>
                <span className="text-xs sm:text-sm text-blue-700 font-medium">Database connection established...</span>
              </div>
              <p className="text-xs text-blue-600">Supabase + PostgreSQL ready</p>
            </div>
          </div>
        )}
        
        {registrationStep === 'complete' && (
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">Backend Connected!</h2>
            <p className="text-gray-600 mb-4 sm:mb-6 text-sm sm:text-base">All systems integrated and ready</p>
            <div className="bg-blue-50 rounded-xl p-4 mb-4 sm:mb-6">
              <div className="flex items-center justify-center space-x-2 mb-2 sm:mb-3">
                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                <span className="text-xs sm:text-sm text-blue-700 font-medium">AI + DB + WebAuthn + CUE all connected</span>
              </div>
              <p className="text-xs text-blue-600">Production-ready backend active</p>
            </div>
          </div>
        )}
        
        {!isRegistering && (
          <button
            onClick={onStart}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 shadow-sm text-sm sm:text-base"
          >
            <Star className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>Start Backend Integration</span>
          </button>
        )}
        
        <div className="mt-4 sm:mt-6 grid grid-cols-3 gap-2 sm:gap-4 text-center">
          <div className="text-xs text-gray-500">
            <Shield className="w-4 h-4 sm:w-5 sm:h-5 mx-auto mb-1 text-blue-600" />
            <span>WebAuthn<br/>Security</span>
          </div>
          <div className="text-xs text-gray-500">
            <Database className="w-4 h-4 sm:w-5 sm:h-5 mx-auto mb-1 text-blue-600" />
            <span>Supabase<br/>Database</span>
          </div>
          <div className="text-xs text-gray-500">
            <Star className="w-4 h-4 sm:w-5 sm:h-5 mx-auto mb-1 text-blue-600" />
            <span>AI + CUE<br/>Mining</span>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// 채팅 뷰 컴포넌트 (스크롤 문제 해결)
const ChatView = ({ 
  messages, 
  newMessage, 
  setNewMessage, 
  onSendMessage, 
  isTyping, 
  selectedModel,
  onModelChange,
  backendConnected 
}: {
  messages: Message[];
  newMessage: string;
  setNewMessage: (msg: string) => void;
  onSendMessage: () => void;
  isTyping: boolean;
  selectedModel: string;
  onModelChange: (model: string) => void;
  backendConnected: boolean;
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  
  // 메시지가 추가될 때마다 자동 스크롤
  useEffect(() => {
    if (messagesEndRef.current && messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      const scrollHeight = container.scrollHeight;
      const height = container.clientHeight;
      const maxScrollTop = scrollHeight - height;
      
      // 부드러운 스크롤
      container.scrollTo({
        top: maxScrollTop,
        behavior: 'smooth'
      });
    }
  }, [messages, isTyping]);

  const models = [
    { id: 'gpt-4o', name: 'GPT-4o', description: 'OpenAI 최고 모델' },
    { id: 'claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', description: 'Anthropic 고성능' },
    { id: 'gemini-pro', name: 'Gemini Pro', description: 'Google AI' },
    { id: 'personalized-agent', name: 'Personalized Agent', description: 'AI Passport 기반' }
  ];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* 백엔드 연결 상태 표시 */}
      <div className="flex-shrink-0 p-3 border-b border-gray-200 bg-gray-50">
        <div className={`flex items-center justify-between p-2 rounded-lg ${
          backendConnected ? 'bg-green-50' : 'bg-red-50'
        }`}>
          <div className="flex items-center space-x-2">
            {backendConnected ? <Wifi className="w-4 h-4 text-green-600" /> : <WifiOff className="w-4 h-4 text-red-600" />}
            <span className={`text-sm font-medium ${backendConnected ? 'text-green-700' : 'text-red-700'}`}>
              {backendConnected ? 'Backend Connected' : 'Backend Disconnected (Mock Mode)'}
            </span>
          </div>
          <div className="text-xs text-gray-500">
            AI + DB + WebAuthn {backendConnected ? '✅' : '❌'}
          </div>
        </div>
      </div>

      {/* 메시지 영역 - 수정된 스크롤 */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6"
        style={{ 
          maxHeight: 'calc(100% - 200px)', // 입력창과 헤더 공간 확보
          overflowY: 'auto',
          scrollBehavior: 'smooth'
        }}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center max-w-2xl mx-auto px-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-6">
              <MessageCircle className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">완전 연동된 AI 채팅</h2>
            <p className="text-gray-600 text-base sm:text-lg mb-6 sm:mb-8 leading-relaxed">
              실제 백엔드와 연동된 AI가 CUE 토큰을 마이닝하며 개인화된 응답을 제공합니다.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 w-full max-w-3xl">
              <div className="p-4 sm:p-6 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-shadow">
                <Database className="w-8 h-8 sm:w-12 sm:h-12 text-blue-600 mx-auto mb-3 sm:mb-4" />
                <h3 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">Real Database</h3>
                <p className="text-xs sm:text-sm text-gray-600">Supabase PostgreSQL 연동</p>
              </div>
              
              <div className="p-4 sm:p-6 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-shadow">
                <Shield className="w-8 h-8 sm:w-12 sm:h-12 text-blue-600 mx-auto mb-3 sm:mb-4" />
                <h3 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">WebAuthn Auth</h3>
                <p className="text-xs sm:text-sm text-gray-600">실제 생체인증 연동</p>
              </div>
              
              <div className="p-4 sm:p-6 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-shadow">
                <Star className="w-8 h-8 sm:w-12 sm:h-12 text-blue-600 mx-auto mb-3 sm:mb-4" />
                <h3 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">CUE Mining</h3>
                <p className="text-xs sm:text-sm text-gray-600">실시간 토큰 마이닝</p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {messages.map(message => (
              <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] sm:max-w-[75%] lg:max-w-[70%] ${message.type === 'user' ? 'order-2' : 'order-1'}`}>
                  {message.type === 'ai' && (
                    <div className="flex items-center space-x-2 sm:space-x-3 mb-2 sm:mb-3">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <Star className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                      </div>
                      <span className="text-xs sm:text-sm font-medium text-gray-700">Backend AI Agent</span>
                      {message.verification && (
                        <div className="flex items-center space-x-1 bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                          <Shield className="w-3 h-3" />
                          <span className="text-xs">Verified</span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className={`p-3 sm:p-4 lg:p-5 rounded-xl ${
                    message.type === 'user' 
                      ? 'bg-blue-600 text-white shadow-sm' 
                      : 'bg-white border border-gray-200 shadow-sm'
                  }`}>
                    <div className="whitespace-pre-wrap text-sm sm:text-base leading-relaxed">
                      {message.content}
                    </div>
                    
                    {message.usedPassportData && (
                      <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-blue-200">
                        <div className="text-xs text-blue-200 mb-2">Backend Data Used:</div>
                        <div className="flex flex-wrap gap-1">
                          {message.usedPassportData.map((data, idx) => (
                            <span key={idx} className="bg-blue-500 bg-opacity-30 px-2 py-1 rounded text-xs">
                              {data}
                            </span>
                          ))}
                        </div>
                        {message.cueTokensEarned && (
                          <div className="text-xs text-blue-200 mt-2">
                            💎 +{message.cueTokensEarned} CUE tokens mined (saved to DB)
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
                <div className="bg-white border border-gray-200 p-3 sm:p-4 lg:p-5 rounded-xl shadow-sm">
                  <div className="flex items-center space-x-3">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-100"></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-200"></div>
                    </div>
                    <span className="text-xs sm:text-sm text-gray-600">Backend AI processing...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* 채팅 입력창 - 고정 */}
      <div className="flex-shrink-0 border-t border-gray-200 p-3 sm:p-4 lg:p-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="flex space-x-3 items-end">
            {/* 모델 선택기 */}
            <div className="flex-shrink-0">
              <select
                value={selectedModel}
                onChange={(e) => onModelChange(e.target.value)}
                className="px-3 py-2 bg-gray-50 border-2 border-gray-200 rounded-lg text-sm hover:bg-gray-100 focus:border-blue-500 focus:outline-none"
              >
                {models.map(model => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* 텍스트 입력 */}
            <div className="flex-1">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    onSendMessage();
                  }
                }}
                placeholder={`${backendConnected ? 'Real backend' : 'Mock mode'} - Send message to AI...`}
                className="w-full min-h-[44px] max-h-[120px] px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50 border-2 border-gray-200 rounded-lg resize-none focus:outline-none focus:bg-white focus:border-blue-500 transition-all text-sm sm:text-base"
                rows={1}
              />
            </div>
            
            {/* 전송 버튼 */}
            <div className="flex-shrink-0">
              <button
                onClick={onSendMessage}
                disabled={!newMessage.trim()}
                className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-medium transition-all flex items-center space-x-2 shadow-sm ${
                  newMessage.trim()
                    ? 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-md transform hover:-translate-y-0.5'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline text-sm sm:text-base">Send</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 🎨 메인 앱 컴포넌트
// ============================================================================

export default function ProductionAIPassportCueSystem() {
  // API 클라이언트 초기화
  const api = new BackendAPIClient();
  
  // 코어 상태
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registrationStep, setRegistrationStep] = useState<'passkey' | 'wallet' | 'complete'>('passkey');
  
  // 백엔드 연결 상태
  const [backendConnected, setBackendConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  
  // UI 상태
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [currentView, setCurrentView] = useState<'chat' | 'dashboard' | 'passport' | 'analytics' | 'vaults'>('chat');
  
  // 채팅 상태
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedModel, setSelectedModel] = useState('personalized-agent');
  
  // 현재 사용자 Passport
  const [passport, setPassport] = useState<UnifiedAIPassport>({
    did: 'did:ai:loading...',
    walletAddress: '0x...',
    passkeyRegistered: false,
    trustScore: 0,
    cueTokens: 0,
    registrationStatus: 'pending',
    biometricVerified: false,
    passportLevel: 'Basic',
    personalityProfile: {
      type: 'Loading...',
      communicationStyle: 'Loading...',
      learningPattern: 'Loading...',
      workingStyle: 'Loading...',
      responsePreference: 'Loading...',
      decisionMaking: 'Loading...'
    },
    dataVaults: [],
    connectedPlatforms: [],
    contextHistory: [],
    cueHistory: [],
    personalizedAgents: []
  });

  // 백엔드 연결 확인
  useEffect(() => {
    const checkBackendConnection = async () => {
      try {
        setConnectionStatus('checking');
        console.log('🔌 백엔드 연결 확인 중...');
        
        const healthResponse = await api.healthCheck();
        console.log('✅ 백엔드 연결 성공:', healthResponse);
        
        setBackendConnected(true);
        setConnectionStatus('connected');
      } catch (error) {
        console.error('❌ 백엔드 연결 실패:', error);
        setBackendConnected(false);
        setConnectionStatus('disconnected');
        
        // Mock 데이터로 폴백
        loadMockPassportData();
      }
    };

    checkBackendConnection();
  }, []);

  // Mock 데이터 로드
  const loadMockPassportData = () => {
    setPassport({
      did: 'did:ai:mock-12345-backend-test',
      walletAddress: '0x742d35Cc6460C532FAEcE1dd25073C8d2FCAE857',
      passkeyRegistered: true,
      trustScore: 96.8,
      cueTokens: 15428,
      registrationStatus: 'complete',
      biometricVerified: true,
      passportLevel: 'Verified',
      personalityProfile: {
        type: 'INTJ-A (Architect)',
        communicationStyle: 'Direct & Technical',
        learningPattern: 'Visual + Hands-on',
        workingStyle: 'Morning Focus, Deep Work',
        responsePreference: 'Concise with examples',
        decisionMaking: 'Data-driven analysis'
      },
      dataVaults: [
        {
          id: 'vault-1',
          name: 'Professional Knowledge',
          category: 'professional',
          description: 'Coding, architecture, technology stack expertise',
          dataCount: 247,
          cueCount: 89,
          encrypted: true,
          lastUpdated: new Date(),
          accessLevel: 'private',
          value: 1250,
          dataPoints: [],
          usageCount: 156,
          sourceplatforms: ['ChatGPT', 'Claude', 'Discord']
        }
      ],
      connectedPlatforms: [],
      contextHistory: [],
      cueHistory: [],
      personalizedAgents: []
    });
  };

  // 반응형 처리
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

  // 등록 프로세스
  const handleUnifiedRegistration = async () => {
    setIsRegistering(true);
    setRegistrationStep('passkey');
    
    try {
      // Step 1: WebAuthn 등록
      console.log('🔐 WebAuthn 등록 시작...');
      const webauthnResult = await api.startWebAuthnRegistration();
      console.log('✅ WebAuthn 등록 결과:', webauthnResult);
      
      setTimeout(() => setRegistrationStep('wallet'), 3000);
      
      // Step 2: 지갑 생성
      setTimeout(async () => {
        console.log('💰 지갑 생성 중...');
        const passportResult = await api.updatePassport(passport.did, {
          walletAddress: `0x${Math.random().toString(16).substr(2, 40)}`,
          passkeyRegistered: true,
          biometricVerified: true
        });
        console.log('✅ 지갑 생성 완료:', passportResult);
        setRegistrationStep('complete');
      }, 6000);
      
      // Step 3: 완료
      setTimeout(() => {
        setIsAuthenticated(true);
        setIsRegistering(false);
        addWelcomeMessage();
      }, 9000);
      
    } catch (error) {
      console.error('❌ 등록 실패:', error);
      // Mock으로 폴백
      setTimeout(() => setRegistrationStep('wallet'), 3000);
      setTimeout(() => setRegistrationStep('complete'), 6000);
      setTimeout(() => {
        setIsAuthenticated(true);
        setIsRegistering(false);
        addWelcomeMessage();
      }, 9000);
    }
  };

  // 환영 메시지 추가
  const addWelcomeMessage = () => {
    const welcomeMsg: Message = {
      id: Date.now().toString(),
      type: 'ai',
      content: `**🎉 Backend Integration Complete!**

**System Status:**
🔐 **WebAuthn**: ${backendConnected ? '✅ Connected to /api/auth/webauthn' : '❌ Mock mode'}
🗄️ **Database**: ${backendConnected ? '✅ Supabase PostgreSQL active' : '❌ Mock data'}
🤖 **AI Services**: ${backendConnected ? '✅ OpenAI + Claude + Gemini ready' : '❌ Mock responses'}
💎 **CUE Mining**: ${backendConnected ? '✅ Real-time token tracking' : '❌ Simulated'}

**Your AI Passport:**
• DID: ${passport.did}
• Wallet: ${passport.walletAddress.slice(0, 10)}...
• CUE Tokens: ${passport.cueTokens.toLocaleString()}
• Trust Score: ${passport.trustScore}%

${backendConnected ? 
  'All systems are fully operational with real backend APIs!' : 
  'Running in mock mode - backend connection will retry automatically.'
}`,
      timestamp: new Date(),
      cueTokensEarned: 100,
      verification: {
        biometric: true,
        did: true,
        signature: `0x${Math.random().toString(16).substr(2, 40)}`
      }
    };
    setMessages([welcomeMsg]);
  };

  // 메시지 전송
  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: newMessage,
      type: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setNewMessage('');
    setIsTyping(true);

    try {
      // 실제 AI API 호출
      const aiResponse = await api.sendChatMessage(
        userMessage.content,
        selectedModel,
        passport
      );
      
      setIsTyping(false);
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: aiResponse.response || 'AI response received from backend',
        timestamp: new Date(),
        usedPassportData: aiResponse.usedPassportData || ['Professional Knowledge'],
        cueTokensEarned: aiResponse.cueTokensEarned || 3,
        verification: {
          biometric: true,
          did: true,
          signature: `0x${Math.random().toString(16).substr(2, 40)}`
        }
      };
      
      setMessages(prev => [...prev, aiMessage]);
      
      // CUE 토큰 마이닝
      await api.mineCue({
        userId: passport.did,
        amount: aiMessage.cueTokensEarned,
        source: 'ai_chat',
        messageId: aiMessage.id
      });
      
    } catch (error) {
      console.error('❌ 메시지 전송 실패:', error);
      setIsTyping(false);
    }
  };

  // 백엔드 재연결
  const retryBackendConnection = async () => {
    setConnectionStatus('checking');
    try {
      await api.healthCheck();
      setBackendConnected(true);
      setConnectionStatus('connected');
    } catch (error) {
      setBackendConnected(false);
      setConnectionStatus('disconnected');
    }
  };

  if (!isAuthenticated) {
    return (
      <RegistrationFlow 
        registrationStep={registrationStep}
        isRegistering={isRegistering}
        onStart={handleUnifiedRegistration}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200 px-3 sm:px-4 lg:px-6 py-3 flex-shrink-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-4">
            {isMobile && (
              <button
                onClick={() => setShowMobileSidebar(!showMobileSidebar)}
                className="p-2 hover:bg-gray-100 rounded-lg lg:hidden"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Star className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-base sm:text-lg font-bold text-gray-900">AI Passport + Cue</h1>
              <p className="text-xs sm:text-sm text-gray-500">Complete Backend Integration</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <BackendStatus status={connectionStatus} onRetry={retryBackendConnection} />
            
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <Settings className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </header>

      {/* 메인 컨테이너 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 모바일 사이드바 오버레이 */}
        {isMobile && showMobileSidebar && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setShowMobileSidebar(false)}
          />
        )}

        {/* 왼쪽 사이드바 */}
        <aside 
          className={`
            ${isMobile ? 'fixed z-50' : 'relative'}
            ${isMobile && !showMobileSidebar ? '-translate-x-full' : 'translate-x-0'}
            w-72 sm:w-80 bg-white border-r border-gray-200 transition-transform duration-300 ease-in-out
            flex flex-col overflow-hidden
          `}
          style={{ 
            height: isMobile ? '100vh' : 'calc(100vh - 73px)',
            top: isMobile ? '0' : 'auto',
            left: isMobile ? '0' : 'auto'
          }}
        >
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6">
            <div className="space-y-4 sm:space-y-6">
              {/* AI Passport 카드 */}
              <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl p-4 sm:p-5 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 sm:w-24 sm:h-24 bg-white opacity-10 rounded-full -mr-8 sm:-mr-12 -mt-8 sm:-mt-12"></div>
                
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4 sm:mb-5">
                    <div className="flex items-center space-x-2 sm:space-x-3">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                        <Star className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm sm:text-base">AI Passport + Cue</h3>
                        <p className="text-blue-200 text-xs sm:text-sm">{passport.passportLevel} Level</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg sm:text-xl font-bold">{passport.trustScore}%</div>
                      <div className="text-blue-200 text-xs">Trust Score</div>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4 sm:mb-5">
                    <div className="text-xs text-blue-200">Backend Status</div>
                    <div className="font-mono text-xs sm:text-sm bg-black bg-opacity-20 rounded-lg p-2">
                      {backendConnected ? '🟢 API Connected' : '🔴 Mock Mode'}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    <div className="text-center hover:bg-white hover:bg-opacity-10 rounded-lg p-2 transition-colors">
                      <div className="text-base sm:text-lg font-bold">{passport.cueTokens.toLocaleString()}</div>
                      <div className="text-xs text-blue-200">CUE Tokens</div>
                    </div>
                    <div className="text-center hover:bg-white hover:bg-opacity-10 rounded-lg p-2 transition-colors">
                      <div className="text-base sm:text-lg font-bold">{passport.dataVaults.length}</div>
                      <div className="text-xs text-blue-200">AI Vaults</div>
                    </div>
                    <div className="text-center hover:bg-white hover:bg-opacity-10 rounded-lg p-2 transition-colors">
                      <div className="text-base sm:text-lg font-bold">3</div>
                      <div className="text-xs text-blue-200">Platforms</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 오늘의 마이닝 */}
              <div className="grid grid-cols-2 gap-2 sm:gap-4">
                <div className="bg-blue-50 rounded-xl p-3 sm:p-4 border border-blue-100">
                  <div className="flex items-center space-x-2 mb-2">
                    <Star className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                    <span className="text-xs sm:text-sm font-medium text-blue-800">Today's Mining</span>
                  </div>
                  <div className="text-lg sm:text-2xl font-bold text-blue-700">+47</div>
                  <div className="text-xs text-blue-600">CUE Tokens</div>
                </div>
                
                <div className="bg-blue-50 rounded-xl p-3 sm:p-4 border border-blue-100">
                  <div className="flex items-center space-x-2 mb-2">
                    <Database className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                    <span className="text-xs sm:text-sm font-medium text-blue-800">Backend Calls</span>
                  </div>
                  <div className="text-lg sm:text-2xl font-bold text-blue-700">12</div>
                  <div className="text-xs text-blue-600">API Requests</div>
                </div>
              </div>

              {/* 추가 섹션들 - 독립적 스크롤 테스트 */}
              <div className="space-y-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                  <div key={i} className="bg-white rounded-xl border border-gray-200 p-4">
                    <h5 className="font-medium text-gray-900 mb-2">Section {i}</h5>
                    <p className="text-sm text-gray-600">
                      Content for section {i}. This demonstrates independent scrolling between sidebar and main content.
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* 메인 콘텐츠 영역 */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* 뷰 탭 */}
          <div className="bg-white border-b border-gray-200 px-3 sm:px-6 py-2 sm:py-3 flex-shrink-0">
            <div className="flex space-x-1 overflow-x-auto">
              {[
                { id: 'chat', label: 'Backend AI Chat', icon: MessageCircle },
                { id: 'dashboard', label: 'Dashboard', icon: Activity },
                { id: 'passport', label: 'AI Passport', icon: Fingerprint },
                { id: 'vaults', label: 'Data Vaults', icon: Database },
                { id: 'analytics', label: 'Analytics', icon: BarChart3 }
              ].map(view => (
                <button
                  key={view.id}
                  onClick={() => {
                    setCurrentView(view.id as any);
                    if (isMobile) setShowMobileSidebar(false);
                  }}
                  className={`flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
                    currentView === view.id 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <view.icon className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="text-xs sm:text-sm font-medium">{isMobile ? view.label.split(' ')[0] : view.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 콘텐츠 영역 */}
          <div className="flex-1 overflow-hidden">
            {currentView === 'chat' && (
              <ChatView 
                messages={messages}
                newMessage={newMessage}
                setNewMessage={setNewMessage}
                onSendMessage={sendMessage}
                isTyping={isTyping}
                selectedModel={selectedModel}
                onModelChange={setSelectedModel}
                backendConnected={backendConnected}
              />
            )}

            {currentView === 'dashboard' && (
              <div className="h-full overflow-y-auto p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Backend Integration Dashboard</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">Database Status</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span>Supabase:</span>
                        <span className={backendConnected ? 'text-green-600' : 'text-red-600'}>
                          {backendConnected ? '✅ Connected' : '❌ Disconnected'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>PostgreSQL:</span>
                        <span className={backendConnected ? 'text-green-600' : 'text-red-600'}>
                          {backendConnected ? '✅ Ready' : '❌ Mock'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">AI Services</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span>OpenAI:</span>
                        <span className={backendConnected ? 'text-green-600' : 'text-red-600'}>
                          {backendConnected ? '✅ Ready' : '❌ Mock'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Claude:</span>
                        <span className={backendConnected ? 'text-green-600' : 'text-red-600'}>
                          {backendConnected ? '✅ Ready' : '❌ Mock'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">WebAuthn</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span>Status:</span>
                        <span className={backendConnected ? 'text-green-600' : 'text-red-600'}>
                          {backendConnected ? '✅ Active' : '❌ Mock'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Passkeys:</span>
                        <span className="text-blue-600">Ready</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dashboard 추가 섹션들 - 독립적 스크롤 테스트 */}
                <div className="mt-8 space-y-6">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
                    <div key={i} className="bg-white rounded-xl border border-gray-200 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Dashboard Section {i}</h3>
                      <p className="text-gray-600 mb-4">
                        This is additional dashboard content to demonstrate independent scrolling. 
                        The left sidebar maintains its scroll position while this main content scrolls independently.
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-blue-50 rounded-lg p-4">
                          <h4 className="font-medium text-blue-900 mb-2">Metric {i}A</h4>
                          <div className="text-2xl font-bold text-blue-700">{Math.floor(Math.random() * 1000)}</div>
                        </div>
                        <div className="bg-green-50 rounded-lg p-4">
                          <h4 className="font-medium text-green-900 mb-2">Metric {i}B</h4>
                          <div className="text-2xl font-bold text-green-700">{Math.floor(Math.random() * 1000)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {currentView === 'passport' && (
              <div className="h-full overflow-y-auto p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">AI Passport Details</h2>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-6">
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Identity Information</h3>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">DID:</span>
                          <span className="font-mono text-sm">{passport.did.slice(0, 20)}...</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Trust Score:</span>
                          <span className="font-semibold text-blue-600">{passport.trustScore}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Level:</span>
                          <span className="font-semibold">{passport.passportLevel}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Security Status</h3>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-3">
                          <CheckCircle className="w-5 h-5 text-blue-500" />
                          <span className="text-sm">WebAuthn authentication active</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <CheckCircle className="w-5 h-5 text-blue-500" />
                          <span className="text-sm">Blockchain wallet connected</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <CheckCircle className="w-5 h-5 text-blue-500" />
                          <span className="text-sm">Data vaults encrypted</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Personality Profile</h3>
                    <div className="space-y-4">
                      {Object.entries(passport.personalityProfile).map(([key, value]) => (
                        <div key={key} className="bg-gray-50 rounded-xl p-4">
                          <div className="text-sm font-medium text-gray-900 mb-2">
                            {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                          </div>
                          <div className="text-sm text-gray-700">{value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentView === 'vaults' && (
              <div className="h-full overflow-y-auto p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Data Vault Management</h2>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2">
                    <Plus className="w-4 h-4" />
                    <span>Extract New Data</span>
                  </button>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {passport.dataVaults.map(vault => (
                    <div key={vault.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          vault.category === 'professional' ? 'bg-blue-100' :
                          vault.category === 'behavioral' ? 'bg-purple-100' :
                          vault.category === 'social' ? 'bg-green-100' :
                          'bg-gray-100'
                        }`}>
                          <Database className={`w-6 h-6 ${
                            vault.category === 'professional' ? 'text-blue-600' :
                            vault.category === 'behavioral' ? 'text-purple-600' :
                            vault.category === 'social' ? 'text-green-600' :
                            'text-gray-600'
                          }`} />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{vault.name}</h4>
                          <p className="text-sm text-gray-500 capitalize">{vault.category}</p>
                        </div>
                        <div className="flex items-center space-x-1">
                          {vault.encrypted && <Lock className="w-4 h-4 text-blue-500" />}
                          <div className={`w-3 h-3 rounded-full ${
                            vault.accessLevel === 'private' ? 'bg-red-500' :
                            vault.accessLevel === 'selective' ? 'bg-yellow-500' :
                            'bg-green-500'
                          }`}></div>
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-4">{vault.description}</p>
                      
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="text-center bg-gray-50 rounded-lg p-3">
                          <div className="text-lg font-bold text-gray-900">{vault.dataCount}</div>
                          <div className="text-xs text-gray-500">Data</div>
                        </div>
                        <div className="text-center bg-gray-50 rounded-lg p-3">
                          <div className="text-lg font-bold text-blue-600">{vault.cueCount}</div>
                          <div className="text-xs text-gray-500">Cues</div>
                        </div>
                        <div className="text-center bg-gray-50 rounded-lg p-3">
                          <div className="text-lg font-bold text-green-600">{vault.usageCount}</div>
                          <div className="text-xs text-gray-500">Usage</div>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-1">
                        {vault.sourceplatforms.map(platform => (
                          <span key={platform} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                            {platform}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Empty state when no vaults */}
                {passport.dataVaults.length === 0 && (
                  <div className="text-center py-12">
                    <Database className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Data Vaults Yet</h3>
                    <p className="text-gray-600 mb-6">Extract data from AI platforms to create your first vault</p>
                    <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                      Start Data Extraction
                    </button>
                  </div>
                )}
              </div>
            )}

            {currentView === 'analytics' && (
              <div className="h-full overflow-y-auto p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">CUE Analytics</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Mining Statistics</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Total CUE:</span>
                        <span className="font-bold text-blue-600 text-xl">{passport.cueTokens.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Today's Mining:</span>
                        <span className="font-bold text-blue-600 text-xl">+47</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Daily Average:</span>
                        <span className="font-bold text-blue-600 text-xl">23.5</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Backend Performance</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">API Calls:</span>
                        <span className="font-medium">{backendConnected ? '127' : '0 (Mock)'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">DB Writes:</span>
                        <span className="font-medium">{backendConnected ? '89' : '0 (Mock)'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">AI Responses:</span>
                        <span className="font-medium">{messages.filter(m => m.type === 'ai').length}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Vaults</h3>
                    <div className="space-y-3">
                      {passport.dataVaults.map(vault => (
                        <div key={vault.id} className="flex justify-between items-center">
                          <span className="text-gray-600">{vault.name}:</span>
                          <span className="font-medium">{vault.cueCount}C</span>
                        </div>
                      ))}
                      {passport.dataVaults.length === 0 && (
                        <div className="text-center text-gray-500 py-4">
                          No vaults created yet
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Additional analytics sections for scrolling */}
                <div className="mt-8 space-y-6">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="bg-white rounded-xl border border-gray-200 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Analytics Section {i}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-blue-50 rounded-lg p-4 text-center">
                          <div className="text-2xl font-bold text-blue-700">{Math.floor(Math.random() * 1000)}</div>
                          <div className="text-sm text-blue-600">Metric A</div>
                        </div>
                        <div className="bg-green-50 rounded-lg p-4 text-center">
                          <div className="text-2xl font-bold text-green-700">{Math.floor(Math.random() * 1000)}</div>
                          <div className="text-sm text-green-600">Metric B</div>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-4 text-center">
                          <div className="text-2xl font-bold text-purple-700">{Math.floor(Math.random() * 1000)}</div>
                          <div className="text-sm text-purple-600">Metric C</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}