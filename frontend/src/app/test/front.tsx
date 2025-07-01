import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Shield, 
  User, 
  MessageCircle, 
  Settings, 
  Menu, 
  X, 
  Send, 
  Star, 
  Globe, 
  Hash, 
  Copy, 
  Clock,
  Zap,
  Activity,
  Eye,
  Sparkles,
  CheckCircle,
  ChevronRight,
  Brain,
  Database,
  Trophy,
  Mic,
  Paperclip,
  Image,
  BarChart3,
  TrendingUp,
  FileText,
  Wifi,
  WifiOff,
  Loader2,
  Upload,
  Download,
  Lock,
  Unlock,
  RefreshCw,
  AlertCircle,
  Coins,
  Pickaxe,
  Crown,
  Target,
  Fingerprint
} from 'lucide-react';

// CUE Protocol theme colors - 따뜻하고 신뢰감 있는 톤
const theme = {
  primary: '#2563EB',      // Blue 600 - 신뢰감 있는 파란색
  primaryLight: '#3B82F6', // Blue 500 - 밝은 파란색
  primaryDark: '#1D4ED8',   // Blue 700 - 어두운 파란색
  accent: '#F59E0B',       // Amber 500 - 따뜻한 황색 (CUE 토큰)
  accentLight: '#FCD34D',  // Amber 300 - 밝은 황색
  success: '#10B981',      // Emerald 500 - 성공/인증
  warning: '#F59E0B',      // Amber 500 - 경고
  error: '#EF4444',        // Red 500 - 오류
  purple: '#8B5CF6',       // Purple 500 - AI/학습
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827'
  }
};

// Types
interface User {
  id: string;
  userName: string;
  userEmail: string;
  did: string;
  registeredAt: string;
}

interface Passport {
  id: string;
  did: string;
  username: string;
  trustScore: number;
  level: string;
  cueBalance: number;
  totalMined: number;
  passportLevel: string;
  biometricVerified: boolean;
  passkeyRegistered: boolean;
  personalityProfile: {
    traits: string[];
    communicationStyle: string;
    expertise: string[];
    type: string;
    learningPattern: string;
  };
  connectedPlatforms: string[];
  achievements: Array<{
    name: string;
    icon: string;
    earned: boolean;
  }>;
  dataVaults: Array<{
    id: string;
    name: string;
    size: string;
    encrypted: boolean;
  }>;
  personalizedAgents: Array<{
    id: string;
    name: string;
    model: string;
    performance: number;
  }>;
  createdAt: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  model?: string;
  cueReward?: number;
  trustScore?: number;
  attachments?: Array<{
    type: 'file' | 'image' | 'audio';
    name: string;
    url: string;
  }>;
  cueData?: {
    extracted: boolean;
    concepts: string[];
    connections: number;
  };
}

interface BackendStatus {
  connected: boolean;
  mode: 'real' | 'mock';
  lastPing: string;
  latency: number;
}

// WebAuthn Helper Functions
const checkWebAuthnSupport = () => {
  if (typeof window === 'undefined') {
    return { supported: false, reason: 'Server-side rendering' };
  }
  if (!window.PublicKeyCredential) {
    return { supported: false, reason: 'WebAuthn을 지원하지 않는 브라우저입니다.' };
  }
  return { supported: true };
};

// Enhanced API Client with WebAuthn
class CUEProtocolAPI {
  private baseURL: string;
  private websocket: WebSocket | null = null;
  private listeners: Map<string, (data: any) => void> = new Map();

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  }

  // WebSocket Connection
  connectWebSocket() {
    try {
      this.websocket = new WebSocket(this.baseURL.replace('http', 'ws'));
      this.websocket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        this.listeners.forEach(callback => callback(data));
      };
      this.websocket.onopen = () => console.log('🔗 WebSocket Connected');
      this.websocket.onclose = () => console.log('❌ WebSocket Disconnected');
    } catch (error) {
      console.warn('⚠️ WebSocket connection failed, using HTTP fallback');
    }
  }

  onRealtimeUpdate(callback: (data: any) => void): () => void {
    const id = Math.random().toString(36);
    this.listeners.set(id, callback);
    return () => this.listeners.delete(id);
  }

  async request(endpoint: string, options: any = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: { 
          'Content-Type': 'application/json',
          ...options.headers 
        },
        mode: 'cors',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`❌ API Request Failed: ${url}`, error.message);
      return this.getMockResponse(endpoint);
    }
  }

  // Mock responses for offline mode
  private getMockResponse(endpoint: string) {
    if (endpoint.includes('/health')) {
      return { 
        status: 'mock', 
        mode: 'frontend-only', 
        timestamp: new Date().toISOString(),
        latency: Math.floor(Math.random() * 50) + 10
      };
    }
    
    if (endpoint.includes('/auth/webauthn/register')) {
      return {
        success: true,
        user: mockUser,
        sessionId: `mock_${Date.now()}`
      };
    }
    
    if (endpoint.includes('/ai/chat')) {
      const responses = [
        "안녕하세요! CUE Protocol의 개인화된 AI 어시스턴트입니다. RAG-DAG 시스템을 통해 문맥을 학습하며 점점 더 개인화된 답변을 제공합니다.",
        "흥미로운 질문이네요! 제가 학습한 개인화 데이터를 바탕으로 맞춤형 답변을 준비하고 있습니다. CUE 토큰도 함께 마이닝되고 있어요!",
        "WebAuthn으로 인증된 AI Passport를 통해 안전하게 저장된 개인 정보를 활용하여 답변드리겠습니다. 블록체인 기반 신뢰 시스템이 작동중입니다.",
        "Cue 객체가 생성되어 로컬 볼트에 저장되고, 해시만 블록체인에 기록됩니다. 이를 통해 완전한 데이터 주권을 보장합니다."
      ];
      
      return {
        response: responses[Math.floor(Math.random() * responses.length)],
        model: 'gpt-4o',
        timestamp: new Date().toISOString(),
        cueReward: Math.floor(Math.random() * 15) + 5,
        trustScore: 0.85 + Math.random() * 0.15,
        cueData: {
          extracted: true,
          concepts: ['AI', 'Web3', 'Personalization', 'Blockchain'],
          connections: Math.floor(Math.random() * 10) + 3
        }
      };
    }

    if (endpoint.includes('/passport/')) {
      return mockPassport;
    }

    return { success: false, error: 'Mock data not available' };
  }

  // API Methods
  async checkHealth(): Promise<BackendStatus> {
    const response = await this.request('/health');
    return {
      connected: response.status !== 'mock',
      mode: response.status === 'mock' ? 'mock' : 'real',
      lastPing: response.timestamp,
      latency: response.latency || 0
    };
  }

  // WebAuthn Registration
  async startWebAuthnRegistration(email: string) {
    try {
      // Start registration
      const startResponse = await this.request('/api/auth/webauthn/register/start', {
        method: 'POST',
        body: JSON.stringify({
          userEmail: email,
          userName: `Agent${Date.now()}`,
          deviceInfo: { 
            userAgent: navigator.userAgent, 
            platform: navigator.platform,
            timestamp: Date.now()
          }
        })
      });

      if (!startResponse.success) {
        throw new Error(startResponse.error || 'Registration start failed');
      }

      // Check WebAuthn support
      const webauthnSupport = checkWebAuthnSupport();
      if (!webauthnSupport.supported) {
        // Return mock success for unsupported browsers
        return {
          success: true,
          user: mockUser,
          sessionId: startResponse.sessionId
        };
      }

      // Import WebAuthn library dynamically
      let startRegistration;
      try {
        const webauthn = await import('@simplewebauthn/browser');
        startRegistration = webauthn.startRegistration;
      } catch (error) {
        console.warn('WebAuthn library not available, using mock flow');
        return {
          success: true,
          user: mockUser,
          sessionId: startResponse.sessionId
        };
      }

      // Perform actual WebAuthn registration
      const credential = await startRegistration(startResponse.options);

      // Complete registration
      return await this.request('/api/auth/webauthn/register/complete', {
        method: 'POST',
        body: JSON.stringify({ 
          credential, 
          sessionId: startResponse.sessionId 
        })
      });

    } catch (error) {
      console.error('WebAuthn registration failed:', error);
      // Return mock success for demo
      return {
        success: true,
        user: mockUser,
        sessionId: `mock_${Date.now()}`
      };
    }
  }

  // WebAuthn Login
  async startWebAuthnLogin() {
    try {
      // Start authentication
      const startResponse = await this.request('/api/auth/webauthn/login/start', {
        method: 'POST'
      });

      if (!startResponse.success) {
        throw new Error(startResponse.error || 'Login start failed');
      }

      // Check WebAuthn support
      const webauthnSupport = checkWebAuthnSupport();
      if (!webauthnSupport.supported) {
        return {
          success: true,
          user: mockUser
        };
      }

      // Import WebAuthn library dynamically
      let startAuthentication;
      try {
        const webauthn = await import('@simplewebauthn/browser');
        startAuthentication = webauthn.startAuthentication;
      } catch (error) {
        console.warn('WebAuthn library not available, using mock flow');
        return {
          success: true,
          user: mockUser
        };
      }

      // Perform actual WebAuthn authentication
      const credential = await startAuthentication(startResponse.options);

      // Complete authentication
      return await this.request('/api/auth/webauthn/login/complete', {
        method: 'POST',
        body: JSON.stringify({ 
          credential, 
          sessionId: startResponse.sessionId 
        })
      });

    } catch (error) {
      console.error('WebAuthn login failed:', error);
      // Return mock success for demo
      return {
        success: true,
        user: mockUser
      };
    }
  }

  async sendChatMessage(message: string, model: string, userDid: string, attachments?: any[]) {
    return await this.request('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ 
        message, 
        model, 
        userDid, 
        attachments,
        enableCueExtraction: true 
      })
    });
  }

  async mineCUE(userDid: string, activity: string) {
    return await this.request('/api/cue/mine', {
      method: 'POST',
      body: JSON.stringify({ userDid, activity })
    });
  }

  async loadPassport(did: string) {
    return await this.request(`/api/passport/${did}`);
  }

  async saveChatMessage(message: Message) {
    return await this.request('/api/chat/save', {
      method: 'POST',
      body: JSON.stringify(message)
    });
  }

  async loadChatHistory(userDid: string) {
    return await this.request(`/api/chat/history/${userDid}`);
  }

  async extractPersonalCues(message: string, context: any) {
    return await this.request('/api/cue/extract', {
      method: 'POST',
      body: JSON.stringify({ message, context })
    });
  }
}

// Mock Data
const mockUser: User = {
  id: 'user_1',
  userName: 'Agent42',
  userEmail: 'demo@cueprotocol.ai',
  did: 'did:cue:agent42_2025',
  registeredAt: new Date().toISOString()
};

const mockPassport: Passport = {
  id: 'passport_1',
  did: 'did:cue:agent42_2025',
  username: 'Agent42',
  trustScore: 87,
  level: 'Verified Agent',
  cueBalance: 2850,
  totalMined: 28750,
  passportLevel: 'Verified',
  biometricVerified: true,
  passkeyRegistered: true,
  personalityProfile: {
    traits: ['창의적', '분석적', '협력적'],
    communicationStyle: 'professional',
    expertise: ['AI', 'Web3', 'UX Design'],
    type: 'Innovator',
    learningPattern: 'Visual + Analytical'
  },
  connectedPlatforms: ['ChatGPT', 'Claude', 'Discord', 'GitHub'],
  achievements: [
    { name: 'First CUE', icon: '🎯', earned: true },
    { name: 'Trusted Agent', icon: '🛡️', earned: true },
    { name: 'Platform Master', icon: '🌐', earned: false },
    { name: 'CUE Millionaire', icon: '💰', earned: false }
  ],
  dataVaults: [
    { id: 'vault_1', name: 'Personal Conversations', size: '2.3GB', encrypted: true },
    { id: 'vault_2', name: 'Work Projects', size: '1.8GB', encrypted: true },
    { id: 'vault_3', name: 'Learning Materials', size: '934MB', encrypted: true }
  ],
  personalizedAgents: [
    { id: 'agent_1', name: 'Creative Assistant', model: 'gpt-4o', performance: 92 },
    { id: 'agent_2', name: 'Code Helper', model: 'claude-3.5', performance: 88 },
    { id: 'agent_3', name: 'Research Bot', model: 'gpt-4o-mini', performance: 85 }
  ],
  createdAt: new Date().toISOString()
};

// Components
const StatusBadge = ({ variant, children, size = 'sm' }: { 
  variant: 'success' | 'warning' | 'error' | 'info'; 
  children: React.ReactNode;
  size?: 'sm' | 'md';
}) => {
  const baseClasses = `inline-flex items-center font-medium rounded-full ${
    size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm'
  }`;
  
  const variants = {
    success: 'bg-green-100 text-green-700',
    warning: 'bg-yellow-100 text-yellow-700',
    error: 'bg-red-100 text-red-700',
    info: 'bg-blue-100 text-blue-700'
  };

  return (
    <span className={`${baseClasses} ${variants[variant]}`}>
      {children}
    </span>
  );
};

const LoadingSpinner = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => (
  <Loader2 className={`animate-spin ${
    size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-8 h-8' : 'w-6 h-6'
  }`} />
);

const PassportCard = ({ passport, user, backendStatus }: { 
  passport: Passport; 
  user: User; 
  backendStatus: BackendStatus;
}) => (
  <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
    {/* Header */}
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center space-x-2">
        <div 
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{backgroundColor: theme.primary}}
        >
          <Shield className="w-4 h-4 text-white" />
        </div>
        <div>
          <h3 className="font-medium text-gray-900 text-sm">AI Passport</h3>
          <p className="text-xs text-gray-500">{passport.passportLevel}</p>
        </div>
      </div>
      
      <div className="text-right">
        <div className="flex items-center space-x-1">
          <Star className="w-3 h-3" style={{color: theme.primary}} />
          <span className="font-medium text-gray-900 text-sm">{passport.trustScore}%</span>
        </div>
        <p className="text-xs text-gray-500">Trust</p>
      </div>
    </div>

    {/* User Info */}
    <div className="text-center mb-3">
      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
        <User className="w-6 h-6 text-gray-400" />
      </div>
      <h4 className="font-medium text-gray-900 text-sm">{user.userName}</h4>
      <p className="text-xs text-gray-500">{user.userEmail}</p>
    </div>
    
    {/* Stats */}
    <div className="grid grid-cols-3 gap-2 mb-3">
      <div className="bg-gray-50 rounded-lg p-2 text-center">
        <p className="text-sm font-medium text-gray-900">{passport.cueBalance.toLocaleString()}</p>
        <p className="text-xs text-gray-500">CUE</p>
      </div>
      
      <div className="bg-gray-50 rounded-lg p-2 text-center">
        <p className="text-sm font-medium text-gray-900">{Math.floor(passport.totalMined / 1000)}K</p>
        <p className="text-xs text-gray-500">Mined</p>
      </div>
      
      <div className="bg-gray-50 rounded-lg p-2 text-center">
        <p className="text-sm font-medium text-gray-900">{passport.connectedPlatforms.length}</p>
        <p className="text-xs text-gray-500">Linked</p>
      </div>
    </div>

    {/* Status */}
    <div className="flex items-center justify-between text-xs">
      <StatusBadge variant={backendStatus.connected ? 'success' : 'warning'}>
        {backendStatus.connected ? 'Real Backend' : 'Mock Mode'}
      </StatusBadge>
      
      <div className="flex items-center space-x-1">
        {backendStatus.connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
        <span className="text-gray-500">{backendStatus.latency}ms</span>
      </div>
    </div>
  </div>
);

const TabButton = ({ active, onClick, icon: Icon, label, count }: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<any>;
  label: string;
  count?: number;
}) => (
  <button
    onClick={onClick}
    className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      active 
        ? 'text-white shadow-sm' 
        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
    }`}
    style={active ? {backgroundColor: theme.primary} : {}}
  >
    <Icon className="w-4 h-4" />
    <span>{label}</span>
    {count && (
      <span className={`text-xs px-1.5 py-0.5 rounded-full ${
        active ? 'bg-white bg-opacity-20' : 'bg-gray-200'
      }`}>
        {count}
      </span>
    )}
  </button>
);

const DetailView = ({ activeTab, passport, user, backendStatus }: {
  activeTab: string;
  passport: Passport;
  user: User;
  backendStatus: BackendStatus;
}) => {
  if (activeTab === 'learning') {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
          <Brain className="w-4 h-4 mr-2" style={{color: theme.primary}} />
          RAG-DAG 문맥 학습
        </h4>
        
        {/* Learning Progress */}
        <div className="bg-gray-50 rounded-lg p-3 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">개인화 학습 진행률</span>
            <span className="text-sm font-medium" style={{color: theme.primary}}>87%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="h-2 rounded-full" 
              style={{backgroundColor: theme.primary, width: '87%'}}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">247개 대화에서 학습된 패턴</p>
        </div>

        {/* Learned Concepts */}
        <div className="space-y-3 mb-4">
          <span className="text-xs text-gray-500 uppercase tracking-wide">학습된 개념</span>
          <div className="flex flex-wrap gap-1.5">
            {[
              { concept: 'Web3 개발', strength: 0.9, color: 'bg-blue-50 text-blue-700' },
              { concept: 'AI 윤리', strength: 0.8, color: 'bg-green-50 text-green-700' },
              { concept: 'UX 디자인', strength: 0.7, color: 'bg-purple-50 text-purple-700' },
              { concept: '블록체인', strength: 0.85, color: 'bg-amber-50 text-amber-700' }
            ].map((item, index) => (
              <div key={index} className={`relative px-2 py-1 rounded-full text-xs font-medium ${item.color}`}>
                {item.concept}
                <div 
                  className="absolute -bottom-1 left-0 h-1 bg-current opacity-30 rounded-full"
                  style={{width: `${item.strength * 100}%`}}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Cue Network Visualization */}
        <div className="bg-gray-50 rounded-lg p-3 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-700">Cue 연결 네트워크</span>
            <button className="text-xs hover:underline" style={{color: theme.primary}}>
              전체 보기 →
            </button>
          </div>
          
          <div className="relative h-12 bg-white rounded border border-gray-200 overflow-hidden">
            <svg viewBox="0 0 200 48" className="w-full h-full">
              <circle cx="24" cy="24" r="5" fill={theme.primary} opacity="0.8" />
              <circle cx="64" cy="16" r="3" fill="#3b82f6" opacity="0.8" />
              <circle cx="64" cy="32" r="3" fill="#10b981" opacity="0.8" />
              <circle cx="104" cy="24" r="5" fill="#8b5cf6" opacity="0.8" />
              <circle cx="144" cy="24" r="3" fill="#ef4444" opacity="0.8" />
              
              <line x1="29" y1="24" x2="61" y2="18" stroke="#6b7280" strokeWidth="1" opacity="0.6" />
              <line x1="29" y1="24" x2="61" y2="30" stroke="#6b7280" strokeWidth="1" opacity="0.6" />
              <line x1="67" y1="18" x2="99" y2="22" stroke="#6b7280" strokeWidth="1" opacity="0.6" />
              <line x1="67" y1="30" x2="99" y2="26" stroke="#6b7280" strokeWidth="1" opacity="0.6" />
              <line x1="109" y1="24" x2="141" y2="24" stroke="#6b7280" strokeWidth="1" opacity="0.6" />
            </svg>
            
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs text-gray-500 bg-white px-2 rounded">
                {Math.floor(Math.random() * 50) + 120}개 Cue 노드
              </span>
            </div>
          </div>
        </div>

        {/* Recent Cue Activities */}
        <div>
          <span className="text-xs text-gray-500 uppercase tracking-wide mb-2 block">최근 Cue 활동</span>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <span className="text-gray-700">새로운 문맥 패턴 발견</span>
              <span className="text-gray-500">2분 전</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <span className="text-gray-700">RAG-DAG 연결 강화</span>
              <span className="text-gray-500">15분 전</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <span className="text-gray-700">개인화 모델 업데이트</span>
              <span className="text-gray-500">1시간 전</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === 'identity') {
    return (
      <div className="space-y-3">
        {/* DID Information */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
            <Hash className="w-4 h-4 mr-2" style={{color: theme.primary}} />
            Decentralized Identity
          </h4>
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-gray-500">DID:</span>
              <div className="flex items-center space-x-2 mt-1">
                <p className="font-mono text-xs text-gray-800 bg-gray-50 px-2 py-1 rounded flex-1 truncate">
                  {user.did}
                </p>
                <button className="p-1 hover:bg-gray-100 rounded">
                  <Copy className="w-3 h-3 text-gray-500" />
                </button>
              </div>
            </div>
            <div>
              <span className="text-gray-500">가입일:</span>
              <p className="text-gray-800">
                {new Date(user.registeredAt).toLocaleDateString()}
              </p>
            </div>
            <div>
              <span className="text-gray-500">Passport Level:</span>
              <StatusBadge variant="success">{passport.passportLevel}</StatusBadge>
            </div>
          </div>
        </div>

        {/* Biometric Status */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
            <Fingerprint className="w-4 h-4 mr-2" style={{color: theme.primary}} />
            인증 상태
          </h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <span className="text-sm text-gray-700">생체 인증</span>
              <StatusBadge variant={passport.biometricVerified ? 'success' : 'warning'}>
                {passport.biometricVerified ? '완료' : '미완료'}
              </StatusBadge>
            </div>
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <span className="text-sm text-gray-700">패스키 등록</span>
              <StatusBadge variant={passport.passkeyRegistered ? 'success' : 'warning'}>
                {passport.passkeyRegistered ? '등록됨' : '미등록'}
              </StatusBadge>
            </div>
          </div>
        </div>

        {/* Personality Profile */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
            <User className="w-4 h-4 mr-2" style={{color: theme.primary}} />
            성격 프로필
          </h4>
          <div className="space-y-3">
            <div>
              <span className="text-xs text-gray-500 uppercase tracking-wide">특성</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {passport.personalityProfile.traits.map((trait, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 text-xs rounded-full"
                    style={{backgroundColor: theme.accentLight, color: theme.primaryDark}}
                  >
                    {trait}
                  </span>
                ))}
              </div>
            </div>
            
            <div>
              <span className="text-xs text-gray-500 uppercase tracking-wide">전문성</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {passport.personalityProfile.expertise.map((skill, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <span className="text-xs text-gray-500 uppercase tracking-wide">학습 패턴</span>
              <p className="text-sm text-gray-800">{passport.personalityProfile.learningPattern}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === 'platforms') {
    return (
      <div className="space-y-3">
        {/* Connected Platforms */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
            <Globe className="w-4 h-4 mr-2" style={{color: theme.primary}} />
            연결된 플랫폼
          </h4>
          <div className="space-y-2">
            {passport.connectedPlatforms.map((platform, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-700">{platform}</span>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-xs text-gray-500">활성</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Data Vaults */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
            <Database className="w-4 h-4 mr-2" style={{color: theme.primary}} />
            데이터 볼트
          </h4>
          <div className="space-y-2">
            {passport.dataVaults.map((vault, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-700">{vault.name}</p>
                  <p className="text-xs text-gray-500">{vault.size}</p>
                </div>
                <div className="flex items-center space-x-2">
                  {vault.encrypted ? <Lock className="w-3 h-3 text-green-600" /> : <Unlock className="w-3 h-3 text-red-600" />}
                  <span className="text-xs text-gray-500">{vault.encrypted ? '암호화됨' : '암호화 안됨'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Achievements */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
            <Trophy className="w-4 h-4 mr-2" style={{color: theme.primary}} />
            업적
          </h4>
          <div className="space-y-2">
            {passport.achievements.map((achievement, index) => (
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
        </div>
      </div>
    );
  }

  return null;
};

// Authentication Flow Component
const AuthenticationFlow = ({ 
  onAuthenticated, 
  backendStatus 
}: { 
  onAuthenticated: (user: User, passport: Passport) => void;
  backendStatus: BackendStatus;
}) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [step, setStep] = useState<'waiting' | 'auth' | 'wallet' | 'passport' | 'complete'>('waiting');
  const [error, setError] = useState('');
  const [showLogin, setShowLogin] = useState(false);
  const [webauthnSupport] = useState(() => checkWebAuthnSupport());
  const [api] = useState(() => new CUEProtocolAPI());

  const handleQuickOnboarding = async () => {
    try {
      setError('');
      setIsRegistering(true);
      setStep('auth');

      // WebAuthn Registration
      const authResult = await api.startWebAuthnRegistration('demo@cueprotocol.ai');
      
      if (!authResult.success) {
        throw new Error(authResult.error || 'Registration failed');
      }
      
      setStep('wallet');
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setStep('passport');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setStep('complete');
      await new Promise(resolve => setTimeout(resolve, 800));
      
      onAuthenticated(authResult.user || mockUser, mockPassport);
    } catch (err: any) {
      setError(err.message || '온보딩 중 오류가 발생했습니다.');
      setStep('waiting');
    } finally {
      setIsRegistering(false);
    }
  };

  const handleWebAuthnLogin = async () => {
    try {
      setError('');
      setIsLoggingIn(true);

      const loginResult = await api.startWebAuthnLogin();
      
      if (!loginResult.success) {
        throw new Error(loginResult.error || 'Login failed');
      }

      onAuthenticated(loginResult.user || mockUser, mockPassport);
    } catch (err: any) {
      setError(err.message || '로그인 중 오류가 발생했습니다.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 border border-gray-100">
        <div className="text-center mb-8">
          <div 
            className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-6 shadow-lg"
            style={{backgroundColor: theme.primary}}
          >
            {step === 'waiting' && <Shield className="w-8 h-8 text-white" />}
            {step === 'auth' && <Fingerprint className="w-8 h-8 text-white animate-pulse" />}
            {step === 'wallet' && <Hash className="w-8 h-8 text-white animate-pulse" />}
            {step === 'passport' && <User className="w-8 h-8 text-white animate-pulse" />}
            {step === 'complete' && <CheckCircle className="w-8 h-8 text-white" />}
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {step === 'waiting' && 'CUE Protocol'}
            {step === 'auth' && '🔐 WebAuthn 인증중...'}
            {step === 'wallet' && '🌐 DID 생성중...'}
            {step === 'passport' && '🛡️ AI Passport 생성중...'}
            {step === 'complete' && '🎉 완료!'}
          </h1>
          
          <p className="text-gray-600">
            {step === 'waiting' && 'Web3 AI 개인화 플랫폼'}
            {step === 'auth' && 'WebAuthn으로 안전하게 인증하고 있습니다'}
            {step === 'wallet' && '블록체인 지갑과 DID를 생성하고 있습니다'}
            {step === 'passport' && 'AI Passport를 초기화하고 있습니다'}
            {step === 'complete' && 'AI Passport가 준비되었습니다!'}
          </p>
        </div>

        {/* Backend Status */}
        <div className="flex justify-center mb-6">
          <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium ${
            backendStatus.connected ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
          }`}>
            {backendStatus.connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            <span>{backendStatus.connected ? `Real Backend (${backendStatus.latency}ms)` : 'Mock Mode'}</span>
          </div>
        </div>

        {/* WebAuthn Support Status */}
        <div className={`mb-6 p-3 rounded-lg ${
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
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
              <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                <Sparkles className="w-4 h-4 mr-2" style={{color: theme.primary}} />
                핵심 기능
              </h3>
              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full" style={{backgroundColor: theme.success}}></div>
                  <span>WebAuthn 생체인증 (Face ID, Touch ID)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full" style={{backgroundColor: theme.primary}}></div>
                  <span>자동 블록체인 DID 생성</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full" style={{backgroundColor: theme.purple}}></div>
                  <span>RAG-DAG 개인화 학습</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full" style={{backgroundColor: theme.accent}}></div>
                  <span>CUE 토큰 마이닝 & 경제 시스템</span>
                </div>
              </div>
            </div>
            
            {/* Login/Register Buttons */}
            {!showLogin ? (
              <div className="space-y-3">
                <button
                  onClick={handleQuickOnboarding}
                  disabled={isRegistering}
                  className="w-full text-white py-4 px-6 rounded-xl font-medium text-lg transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
                  style={{backgroundColor: theme.primary}}
                >
                  {isRegistering ? (
                    <div className="flex items-center justify-center space-x-2">
                      <LoadingSpinner size="sm" />
                      <span>생성중...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center space-x-2">
                      <Zap className="w-5 h-5" />
                      <span>30초 만에 시작하기</span>
                    </div>
                  )}
                </button>

                <button
                  onClick={() => setShowLogin(true)}
                  className="w-full border-2 text-gray-700 py-3 px-6 rounded-xl font-medium transition-all duration-200 hover:bg-gray-50"
                  style={{borderColor: theme.primary, color: theme.primary}}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <Fingerprint className="w-5 h-5" />
                    <span>이미 계정이 있어요</span>
                  </div>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  onClick={handleWebAuthnLogin}
                  disabled={isLoggingIn}
                  className="w-full text-white py-4 px-6 rounded-xl font-medium text-lg transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
                  style={{backgroundColor: theme.success}}
                >
                  {isLoggingIn ? (
                    <div className="flex items-center justify-center space-x-2">
                      <LoadingSpinner size="sm" />
                      <span>인증중...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center space-x-2">
                      <Fingerprint className="w-5 h-5" />
                      <span>WebAuthn으로 로그인</span>
                    </div>
                  )}
                </button>

                <button
                  onClick={() => setShowLogin(false)}
                  className="w-full text-gray-600 py-2 text-sm hover:text-gray-900 transition-colors"
                >
                  ← 회원가입으로 돌아가기
                </button>
              </div>
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
            onClick={() => onAuthenticated(mockUser, mockPassport)}
            className="w-full text-white py-4 px-6 rounded-xl font-medium text-lg transition-all duration-200 shadow-lg"
            style={{backgroundColor: theme.success}}
          >
            <div className="flex items-center justify-center space-x-2">
              <Target className="w-5 h-5" />
              <span>AI Passport 사용하기</span>
            </div>
          </button>
        )}

        {/* Footer Info */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <Shield className="w-4 h-4" />
            <span>
              {webauthnSupport.supported && backendStatus.connected
                ? '실제 WebAuthn 표준을 사용한 안전한 인증'
                : 'Demo 모드 - 실제 데이터는 저장되지 않습니다'
              }
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main Page Component
export default function CUEProtocolPage() {
  // Core State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [passport, setPassport] = useState<Passport | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // UI State
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [activeTab, setActiveTab] = useState('learning');

  // Chat State
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // Backend State
  const [backendStatus, setBackendStatus] = useState<BackendStatus>({
    connected: false,
    mode: 'mock',
    lastPing: '',
    latency: 0
  });

  // API Client
  const [api] = useState(() => new CUEProtocolAPI());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Detect mobile
  useEffect(() => {
    const checkIsMobile = () => setIsMobile(window.innerWidth < 768);
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  // Initialize system
  useEffect(() => {
    const initializeSystem = async () => {
      try {
        // Check backend connection
        const status = await api.checkHealth();
        setBackendStatus(status);

        // Connect WebSocket for real-time updates
        api.connectWebSocket();

        // Setup real-time listeners
        const unsubscribe = api.onRealtimeUpdate((data) => {
          if (data.type === 'cue_update' && passport) {
            setPassport(prev => prev ? {...prev, cueBalance: data.balance} : prev);
          }
        });

        setIsInitialized(true);
        return unsubscribe;
      } catch (error) {
        console.error('System initialization failed:', error);
        setIsInitialized(true);
      }
    };

    initializeSystem();
  }, [api]);

  // Auto scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Periodic backend health check
  useEffect(() => {
    const interval = setInterval(async () => {
      const status = await api.checkHealth();
      setBackendStatus(status);
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [api]);

  // Authentication handler
  const handleAuthenticated = useCallback((authenticatedUser: User, userPassport: Passport) => {
    setUser(authenticatedUser);
    setPassport(userPassport);
    setIsAuthenticated(true);
    
    // Load chat history
    api.loadChatHistory(authenticatedUser.did).then(history => {
      if (history.messages) {
        setMessages(history.messages);
      }
    });
  }, [api]);

  // Message sending
  const handleSendMessage = async () => {
    if (!newMessage.trim() && selectedFiles.length === 0) return;
    if (!user) return;
    
    const messageId = `msg_${Date.now()}`;
    const userMessage: Message = {
      id: messageId,
      role: 'user',
      content: newMessage,
      timestamp: new Date().toISOString(),
      attachments: selectedFiles.map(file => ({
        type: file.type.startsWith('image/') ? 'image' : 'file',
        name: file.name,
        url: URL.createObjectURL(file)
      }))
    };
    
    setMessages(prev => [...prev, userMessage]);
    setNewMessage('');
    setSelectedFiles([]);
    setIsTyping(true);
    
    try {
      // Send to backend with CUE extraction enabled
      const response = await api.sendChatMessage(
        newMessage, 
        'gpt-4o', 
        user.did, 
        userMessage.attachments
      );
      
      const aiMessage: Message = {
        id: `msg_${Date.now() + 1}`,
        role: 'assistant',
        content: response.response,
        timestamp: new Date().toISOString(),
        model: response.model,
        cueReward: response.cueReward,
        trustScore: response.trustScore,
        cueData: response.cueData
      };
      
      setMessages(prev => [...prev, aiMessage]);
      
      // Update CUE balance if reward earned
      if (response.cueReward && passport) {
        setPassport(prev => prev ? {
          ...prev, 
          cueBalance: prev.cueBalance + response.cueReward
        } : prev);
        
        // Mine CUE tokens
        api.mineCUE(user.did, 'chat_interaction');
      }
      
      // Save messages to backend
      await Promise.all([
        api.saveChatMessage(userMessage),
        api.saveChatMessage(aiMessage)
      ]);
      
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage: Message = {
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: '죄송합니다. 메시지 전송 중 오류가 발생했습니다. 다시 시도해 주세요.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUser(null);
    setPassport(null);
    setMessages([]);
    setActiveTab('learning');
  };

  // Loading state
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="text-gray-600 mt-4">CUE Protocol 초기화 중...</p>
        </div>
      </div>
    );
  }

  // Authentication flow
  if (!isAuthenticated) {
    return (
      <AuthenticationFlow 
        onAuthenticated={handleAuthenticated}
        backendStatus={backendStatus}
      />
    );
  }

  // Main application
  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Header - Fixed */}
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
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{backgroundColor: theme.primary}}
              >
                <Shield className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">CUE Protocol</h1>
                <p className="text-xs text-gray-500">Web3 AI Personal Agent</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* CUE Balance - Desktop */}
            <div 
              className="hidden sm:flex items-center space-x-2 px-3 py-1 rounded-full"
              style={{backgroundColor: `${theme.accent}20`, border: `1px solid ${theme.accent}30`}}
            >
              <Coins className="w-4 h-4" style={{color: theme.accent}} />
              <span 
                className="text-sm font-medium" 
                style={{color: theme.primaryDark}}
              >
                {passport?.cueBalance.toLocaleString()} CUE
              </span>
            </div>
            
            {/* Backend Status */}
            <div className={`flex items-center space-x-2 px-2 py-1 rounded-full text-xs ${
              backendStatus.connected ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
            }`}>
              {backendStatus.connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              <span className="hidden sm:inline">
                {backendStatus.connected ? `Real (${backendStatus.latency}ms)` : 'Mock'}
              </span>
            </div>
            
            <button 
              onClick={handleLogout}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Settings className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content - Flexible */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Independent Scroll */}
        <aside className={`
          w-80 bg-gray-50 border-r border-gray-200 flex flex-col overflow-hidden
          ${isMobile ? (showMobileSidebar ? 'fixed inset-y-0 left-0 z-50 shadow-2xl' : 'hidden') : 'relative'}
        `}>
          {/* Mobile Header */}
          {isMobile && showMobileSidebar && (
            <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-white flex-shrink-0">
              <h2 className="font-medium text-gray-900">AI Passport</h2>
              <button
                onClick={() => setShowMobileSidebar(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Fixed Passport Card */}
          <div className="p-4 border-b border-gray-200 bg-white flex-shrink-0">
            {passport && user && (
              <PassportCard 
                passport={passport} 
                user={user} 
                backendStatus={backendStatus}
              />
            )}
          </div>

          {/* Fixed Tabs */}
          <div className="p-4 bg-white border-b border-gray-200 flex-shrink-0">
            <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
              <TabButton
                active={activeTab === 'learning'}
                onClick={() => setActiveTab('learning')}
                icon={Brain}
                label="학습"
              />
              <TabButton
                active={activeTab === 'identity'}
                onClick={() => setActiveTab('identity')}
                icon={User}
                label="신원"
              />
              <TabButton
                active={activeTab === 'platforms'}
                onClick={() => setActiveTab('platforms')}
                icon={Globe}
                label="연결"
                count={passport?.connectedPlatforms.length}
              />
            </div>
          </div>

          {/* Scrollable Content - Independent */}
          <div 
            className="flex-1 overflow-y-auto p-4" 
            style={{ scrollBehavior: 'smooth' }}
          >
            {passport && user && (
              <DetailView 
                activeTab={activeTab} 
                passport={passport} 
                user={user} 
                backendStatus={backendStatus}
              />
            )}
          </div>
        </aside>

        {/* Right Chat Area - Independent Scroll */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Messages Area - Scrollable */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-16">
                <div 
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg"
                  style={{backgroundColor: theme.primary}}
                >
                  <MessageCircle className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  안녕하세요, {user?.userName}님! ✨
                </h3>
                <p className="text-gray-600 max-w-md mx-auto leading-relaxed mb-6">
                  CUE Protocol의 개인화된 AI 에이전트와 대화하세요.<br />
                  <span className="font-medium" style={{color: theme.primary}}>
                    모든 대화가 RAG-DAG로 학습되어 점점 더 개인화됩니다.
                  </span>
                </p>

                <div 
                  className="rounded-xl p-4 mb-6 max-w-md mx-auto border"
                  style={{backgroundColor: `${theme.primary}10`, borderColor: `${theme.primary}30`}}
                >
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <Sparkles className="w-5 h-5" style={{color: theme.primary}} />
                    <span className="text-sm font-medium text-gray-700">실시간 Cue 추출 시스템</span>
                  </div>
                  <div className="text-xs text-gray-600 space-y-1">
                    <div className="flex items-center justify-between">
                      <span>• 개인화 패턴 분석</span>
                      <span style={{color: theme.success}}>✓ 활성</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>• RAG-DAG 연결 구축</span>
                      <span style={{color: theme.success}}>✓ 활성</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>• CUE 토큰 마이닝</span>
                      <span style={{color: theme.success}}>✓ 활성</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>• 블록체인 신뢰 검증</span>
                      <span style={{color: theme.success}}>✓ 활성</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2 justify-center">
                  {[
                    "내 RAG-DAG 학습 현황을 보여줘",
                    "CUE Protocol의 Cue 객체란?",
                    "개인화 AI는 어떻게 작동해?",
                    "블록체인 기반 신뢰 시스템 설명"
                  ].map((prompt, index) => (
                    <button
                      key={index}
                      onClick={() => setNewMessage(prompt)}
                      className="px-4 py-2 bg-white border border-gray-200 rounded-full text-sm text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-2xl px-4 py-3 rounded-2xl ${
                      message.role === 'user'
                        ? 'text-white'
                        : 'bg-white border border-gray-200 text-gray-900 shadow-sm'
                    }`}
                    style={message.role === 'user' ? {backgroundColor: theme.primary} : {}}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {message.content}
                    </p>
                    
                    {/* Attachments */}
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {message.attachments.map((attachment, i) => (
                          <div key={i} className="flex items-center space-x-2 text-xs opacity-80">
                            {attachment.type === 'image' ? <Image className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                            <span>{attachment.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    
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
                            <Coins className="w-3 h-3" style={{color: message.role === 'user' ? 'rgba(255,255,255,0.8)' : theme.primary}} />
                            <span className="text-xs font-medium" style={{color: message.role === 'user' ? 'rgba(255,255,255,0.8)' : theme.primary}}>
                              +{message.cueReward}
                            </span>
                          </div>
                        )}
                        
                        {message.cueData?.extracted && (
                          <div className="flex items-center space-x-1">
                            <Brain className="w-3 h-3" style={{color: message.role === 'user' ? 'rgba(255,255,255,0.8)' : theme.primary}} />
                            <span className="text-xs font-medium" style={{color: message.role === 'user' ? 'rgba(255,255,255