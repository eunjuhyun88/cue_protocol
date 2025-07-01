// ============================================================================
// 📁 src/components/layout/MainLayout.tsx
// 🎯 완전한 CUE Protocol 메인 레이아웃 (기존 구조 기반)
// ============================================================================

'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Menu, X, Settings, Wifi, WifiOff, Star, Send, Paperclip,
  Mic, MicOff, MessageCircle, Activity, Fingerprint, Database,
  Globe, BarChart3, Shield, LogOut, Plus, TrendingUp, Brain,
  Coins, Lock, User, Award, Heart, Clock, Eye, Copy, Hash,
  ChevronRight, AlertCircle, CheckCircle, Target, Download,
  Upload, Search, Calendar, Zap, RefreshCw
} from 'lucide-react';

// 기존 컴포넌트들 import
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { BackendStatus } from '../ui/BackendStatus';
import { LoadingSpinner } from '../ui/LoadingSpinner';

// 타입 정의
interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: string;
  model?: string;
  cueReward?: number;
}

interface AIPassport {
  did: string;
  username: string;
  trustScore: number;
  passportLevel: string;
  cueBalance: number;
  totalMined: number;
  dataVaults: Array<{
    name: string;
    type: string;
    size: string;
    status: string;
  }>;
  connectedPlatforms: Array<{
    name: string;
    status: string;
    lastSync: string;
    conversations: number;
  }>;
  personalityProfile: {
    traits: string[];
    communicationStyle: string;
    expertise: string[];
    mbtiType: string;
    learningStyle: string;
  };
  achievements: Array<{
    name: string;
    icon: string;
    earned: boolean;
    description: string;
    date?: string;
    progress?: number;
  }>;
  ragDagStats: {
    learnedConcepts: number;
    connectionStrength: number;
    contextualAccuracy: number;
    learningVelocity: number;
    memoryEfficiency: number;
    lastLearningActivity: string;
    totalInteractions: number;
    conceptCategories: Record<string, number>;
  };
  analytics: {
    weeklyActivity: Array<{
      day: string;
      chats: number;
      cue: number;
      quality: number;
    }>;
    topicDistribution: Array<{
      name: string;
      value: number;
      color: string;
    }>;
    platformMetrics: {
      mostActive: string;
      totalSyncs: number;
      lastFullSync: string;
    };
  };
  createdAt: string;
}

type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';
type ViewType = 'chat' | 'dashboard' | 'passport' | 'vaults' | 'platforms' | 'analytics';

interface MainLayoutProps {
  passport?: AIPassport;
  cueBalance: number;
  todaysMining: number;
  backendConnected: boolean;
  connectionStatus: ConnectionStatus;
  connectionDetails?: any;
  messages: Message[];
  isLoadingChat: boolean;
  selectedModel: string;
  onModelChange: (model: string) => void;
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  onSendMessage: (message: string, model: string) => void;
  onUpdatePassport: (updates: any) => void;
  onLogout: () => void;
  onRetryConnection: () => void;
}

// Dashboard View Component
const DashboardView = ({ passport, cueBalance, todaysMining, messages }: { 
  passport?: AIPassport; 
  cueBalance: number; 
  todaysMining: number; 
  messages: Message[] 
}) => {
  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* CUE Balance Card */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
              <Coins className="w-6 h-6" />
            </div>
            <span className="text-sm font-medium bg-white bg-opacity-20 px-2 py-1 rounded-full">
              +{todaysMining}
            </span>
          </div>
          <div className="text-3xl font-bold mb-1">{cueBalance.toLocaleString()}</div>
          <div className="text-blue-100">Total CUE Tokens</div>
        </div>

        {/* Trust Score Card */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-green-600" />
            </div>
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-1">{passport?.trustScore || 95}%</div>
          <div className="text-gray-600">Trust Score</div>
        </div>

        {/* Conversations Card */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-purple-600" />
            </div>
            <Activity className="w-5 h-5 text-purple-500" />
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-1">{messages.length}</div>
          <div className="text-gray-600">Conversations</div>
        </div>

        {/* Data Vaults Card */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Database className="w-6 h-6 text-orange-600" />
            </div>
            <Lock className="w-5 h-5 text-orange-500" />
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-1">{passport?.dataVaults?.length || 5}</div>
          <div className="text-gray-600">Secure Vaults</div>
        </div>
      </div>

      {/* Activity Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Weekly Activity</h3>
          <div className="space-y-3">
            {passport?.analytics?.weeklyActivity?.map((day, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{day.day}</span>
                <div className="flex items-center space-x-3">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full" 
                      style={{ width: `${(day.chats / 25) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{day.chats} chats</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Learning Progress</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Personalization</span>
                <span className="font-medium">87%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-purple-500 h-2 rounded-full" style={{width: '87%'}}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Context Understanding</span>
                <span className="font-medium">94%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{width: '94%'}}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Learning Velocity</span>
                <span className="font-medium">78%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{width: '78%'}}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Passport View Component
const PassportView = ({ passport }: { passport?: AIPassport }) => {
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'achievements', label: 'Achievements', icon: Award },
    { id: 'personality', label: 'Personality', icon: Heart },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Passport Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
              <Shield className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">{passport?.username || 'AI Agent'}</h2>
              <p className="text-blue-100">{passport?.passportLevel || 'Verified Agent'}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{passport?.trustScore || 95}%</div>
            <div className="text-blue-100">Trust Score</div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div className="text-center bg-white bg-opacity-15 rounded-lg p-3">
            <div className="text-xl font-bold">{Math.floor((passport?.cueBalance || 3200) / 1000)}K</div>
            <div className="text-xs text-blue-100">CUE Tokens</div>
          </div>
          <div className="text-center bg-white bg-opacity-15 rounded-lg p-3">
            <div className="text-xl font-bold">{passport?.dataVaults?.length || 5}</div>
            <div className="text-xs text-blue-100">Data Vaults</div>
          </div>
          <div className="text-center bg-white bg-opacity-15 rounded-lg p-3">
            <div className="text-xl font-bold">{passport?.connectedPlatforms?.length || 4}</div>
            <div className="text-xs text-blue-100">Platforms</div>
          </div>
          <div className="text-center bg-white bg-opacity-15 rounded-lg p-3">
            <div className="text-xl font-bold">{passport?.achievements?.filter(a => a.earned).length || 4}</div>
            <div className="text-xs text-blue-100">Achievements</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex space-x-8">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 py-3 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Identity</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-600">DID</label>
                <div className="flex items-center space-x-2 mt-1">
                  <p className="font-mono text-sm text-gray-800 bg-gray-100 px-3 py-2 rounded flex-1 truncate">
                    {passport?.did || 'did:cue:loading...'}
                  </p>
                  <button className="p-2 hover:bg-gray-100 rounded">
                    <Copy className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-600">Created</label>
                <p className="text-sm text-gray-800 mt-1">
                  {passport?.createdAt ? new Date(passport.createdAt).toLocaleDateString() : 'Today'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">RAG-DAG Learning</h3>
            <div className="space-y-4">
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Learning Progress</span>
                  <span className="text-sm font-bold text-purple-600">
                    {Math.round((passport?.ragDagStats?.contextualAccuracy || 0.94) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-purple-500 h-2 rounded-full" 
                    style={{width: `${(passport?.ragDagStats?.contextualAccuracy || 0.94) * 100}%`}}
                  ></div>
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  {passport?.ragDagStats?.learnedConcepts || 247} concepts learned
                </p>
              </div>

              <div className="space-y-2">
                <span className="text-sm text-gray-600">Concept Categories</span>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(passport?.ragDagStats?.conceptCategories || {
                    'Technical': 89,
                    'Personal': 76,
                    'Professional': 62
                  }).map(([category, count]) => (
                    <span key={category} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                      {category} ({count})
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 다른 탭들도 여기에 추가... */}
    </div>
  );
};

// Other View Components (간소화된 버전)
const VaultsView = ({ passport }: { passport?: AIPassport }) => (
  <div className="p-6">
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-2xl font-bold text-gray-900">Data Vaults</h2>
      <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
        <Plus className="w-4 h-4" />
        <span>Add Vault</span>
      </button>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {(passport?.dataVaults || []).map((vault, index) => (
        <div key={index} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Database className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">{vault.name}</h4>
              <p className="text-sm text-gray-500 capitalize">{vault.type}</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">{vault.size}</span>
            <Lock className="w-4 h-4 text-green-500" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

const PlatformsView = ({ passport }: { passport?: AIPassport }) => (
  <div className="p-6">
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-2xl font-bold text-gray-900">Connected Platforms</h2>
      <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
        <Plus className="w-4 h-4" />
        <span>Connect Platform</span>
      </button>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {(passport?.connectedPlatforms || []).map((platform, index) => (
        <div key={index} className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Globe className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">{platform.name}</h4>
                <p className="text-sm text-green-600">Connected</p>
              </div>
            </div>
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          </div>
          <div className="text-center bg-gray-50 rounded-lg p-3">
            <div className="text-lg font-bold text-gray-900">{platform.conversations}</div>
            <div className="text-xs text-gray-500">Conversations</div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const AnalyticsView = ({ passport, cueBalance, todaysMining, messages }: {
  passport?: AIPassport;
  cueBalance: number;
  todaysMining: number;
  messages: Message[];
}) => (
  <div className="p-6 space-y-6">
    <h2 className="text-2xl font-bold text-gray-900">CUE Analytics</h2>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="text-2xl font-bold text-gray-900 mb-1">{cueBalance.toLocaleString()}</div>
        <div className="text-gray-600 text-sm">Total CUE Balance</div>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="text-2xl font-bold text-gray-900 mb-1">+{todaysMining}</div>
        <div className="text-gray-600 text-sm">Today's Mining</div>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="text-2xl font-bold text-gray-900 mb-1">{passport?.ragDagStats?.learnedConcepts || 247}</div>
        <div className="text-gray-600 text-sm">Learned Concepts</div>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="text-2xl font-bold text-gray-900 mb-1">{messages.length}</div>
        <div className="text-gray-600 text-sm">Conversations</div>
      </div>
    </div>
  </div>
);

export function MainLayout({
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
}: MainLayoutProps) {
  // UI 상태
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  
  // 채팅 상태
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);

  // 스크롤 참조
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

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

  // 메시지 자동 스크롤
  useEffect(() => {
    if (messagesEndRef.current && messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, isTyping]);

  // AI 모델 목록
  const models = [
    { id: 'personalized-agent', name: 'Personal Agent', description: 'AI Passport 기반' },
    { id: 'gpt-4o', name: 'GPT-4o', description: 'OpenAI 최고 모델' },
    { id: 'claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', description: 'Anthropic' },
    { id: 'gemini-pro', name: 'Gemini Pro', description: 'Google AI' }
  ];

  // 뷰 탭 목록
  const viewTabs = [
    { id: 'chat', label: 'AI Chat', icon: MessageCircle },
    { id: 'dashboard', label: 'Dashboard', icon: Activity },
    { id: 'passport', label: 'AI Passport', icon: Fingerprint },
    { id: 'vaults', label: 'Data Vaults', icon: Database },
    { id: 'platforms', label: 'Platforms', icon: Globe },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 }
  ];

  // 메시지 전송 핸들러
  const handleSendMessage = async () => {
    if (!newMessage.trim() && attachments.length === 0) return;
    
    setIsTyping(true);
    try {
      await onSendMessage(newMessage, selectedModel);
      setNewMessage('');
      setAttachments([]);
    } catch (error) {
      console.error('메시지 전송 실패:', error);
    } finally {
      setIsTyping(false);
    }
  };

  // 파일 첨부 핸들러
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []) as File[];
    setAttachments(prev => [...prev, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 헤더 - 고정 */}
      <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-3 flex-shrink-0 z-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {isMobile && (
              <button
                onClick={() => setShowMobileSidebar(!showMobileSidebar)}
                className="p-2 hover:bg-gray-100 rounded-lg lg:hidden transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-gray-900">CUE Protocol</h1>
              <p className="text-sm text-gray-500">AI Personalization Platform</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <BackendStatus 
              status={connectionStatus} 
              onRetry={onRetryConnection}
              connectionDetails={connectionDetails}
            />
            
            <button 
              onClick={onLogout}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5 text-gray-600" />
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

        {/* 왼쪽 사이드바 - 독립적 스크롤 */}
        <aside
          ref={sidebarRef}
          className={`
            ${isMobile ? 'fixed z-50' : 'relative'}
            ${isMobile && !showMobileSidebar ? '-translate-x-full' : 'translate-x-0'}
            w-80 bg-white border-r border-gray-200 transition-transform duration-300 ease-in-out
            flex flex-col overflow-hidden
          `}
          style={{
            height: isMobile ? '100vh' : 'calc(100vh - 73px)',
            top: isMobile ? '0' : 'auto',
            left: isMobile ? '0' : 'auto'
          }}
        >
          {/* 모바일 사이드바 헤더 */}
          {isMobile && (
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
              <h2 className="font-semibold text-gray-900">AI Passport</h2>
              <button
                onClick={() => setShowMobileSidebar(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}
          
          {/* 사이드바 컴포넌트 사용 */}
          <Sidebar
            passport={passport}
            currentView={currentView}
            onViewChange={onViewChange}
            backendConnected={backendConnected}
            isMobile={isMobile}
            showMobileSidebar={showMobileSidebar}
          />
        </aside>

        {/* 오른쪽 메인 영역 - 독립적 스크롤 */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* 뷰 탭 네비게이션 */}
          <div className="bg-white border-b border-gray-200 px-6 py-3 flex-shrink-0">
            <div className="flex space-x-1 overflow-x-auto" style={{ scrollbarWidth: 'thin' }}>
              {viewTabs.map(view => (
                <button
                  key={view.id}
                  onClick={() => {
                    onViewChange(view.id as ViewType);
                    if (isMobile) setShowMobileSidebar(false);
                  }}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
                    currentView === view.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <view.icon className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {isMobile ? view.label.split(' ')[0] : view.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 컨텐츠 영역 */}
          <div className="flex-1 overflow-hidden">
            {/* 채팅 뷰 */}
            {currentView === 'chat' && (
              <div className="flex-1 flex flex-col overflow-hidden h-full">
                {/* 채팅 상태 헤더 */}
                <div className="flex-shrink-0 p-4 border-b border-gray-200 bg-gray-50">
                  <div className={`flex items-center justify-between p-3 rounded-lg ${
                    backendConnected ? 'bg-green-50' : 'bg-orange-50'
                  }`}>
                    <div className="flex items-center space-x-3">
                      {backendConnected ? <Wifi className="w-4 h-4 text-green-600" /> : <WifiOff className="w-4 h-4 text-orange-600" />}
                      <span className={`text-sm font-medium ${backendConnected ? 'text-green-700' : 'text-orange-700'}`}>
                        {backendConnected ? 'AI Backend Connected' : 'Demo Mode'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-xs text-gray-500">
                        💎 {cueBalance.toLocaleString()} CUE
                      </div>
                      <div className="text-xs text-blue-600">
                        Today +{todaysMining}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 메시지 영역 - 독립적 스크롤 */}
                <div
                  ref={messagesContainerRef}
                  className="flex-1 overflow-y-auto p-4 space-y-6"
                  style={{
                    scrollBehavior: 'smooth',
                    scrollbarWidth: 'thin'
                  }}
                >
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center max-w-2xl mx-auto px-4">
                      <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-6">
                        <MessageCircle className="w-8 h-8 text-blue-600" />
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-4">
                        {backendConnected ? 'AI Ready' : 'Demo Chat'}
                      </h2>
                      <p className="text-gray-600 text-lg mb-8">
                        AI Passport 기반 개인화된 AI와 대화하고 CUE 토큰을 마이닝하세요.
                      </p>
                      
                      {/* 빠른 시작 */}
                      <div className="flex flex-wrap gap-2 justify-center">
                        {[
                          "CUE Protocol 설명해줘",
                          "RAG-DAG 학습은 어떻게 작동해?",
                          "내 AI Passport 분석해줘",
                          "개인화 AI의 장점은?"
                        ].map((prompt, index) => (
                          <button
                            key={index}
                            onClick={() => setNewMessage(prompt)}
                            className="px-3 py-2 bg-white border border-gray-200 rounded-full text-sm text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
                          >
                            {prompt}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <>
                      {messages.map(message => (
                        <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[85%] lg:max-w-[70%] ${message.type === 'user' ? 'order-2' : 'order-1'}`}>
                            {message.type === 'ai' && (
                              <div className="flex items-center space-x-3 mb-3">
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                  <Star className="w-4 h-4 text-blue-600" />
                                </div>
                                <span className="text-sm font-medium text-gray-700">
                                  Personal AI Agent
                                </span>
                              </div>
                            )}
                            
                            <div className={`p-5 rounded-xl ${
                              message.type === 'user'
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'bg-white border border-gray-200 shadow-sm'
                            }`}>
                              <div className="whitespace-pre-wrap text-base leading-relaxed">
                                {message.content}
                              </div>
                              
                              {message.cueReward && (
                                <div className="mt-2 pt-2 border-t border-opacity-20">
                                  <div className="flex items-center space-x-1">
                                    <Coins className="w-3 h-3 text-yellow-500" />
                                    <span className="text-xs text-yellow-600 font-medium">
                                      +{message.cueReward} CUE
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {isTyping && (
                        <div className="flex justify-start">
                          <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-sm">
                            <div className="flex items-center space-x-3">
                              <div className="flex space-x-1">
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-100"></div>
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-200"></div>
                              </div>
                              <span className="text-sm text-gray-600">AI thinking...</span>
                            </div>
                          </div>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>

                {/* 채팅 입력 영역 - 하단 고정 */}
                <div className="flex-shrink-0 border-t border-gray-200 p-4 bg-white">
                  <div className="max-w-4xl mx-auto">
                    {/* 첨부파일 미리보기 */}
                    {attachments.length > 0 && (
                      <div className="mb-3 flex flex-wrap gap-2">
                        {attachments.map((file, index) => (
                          <div key={index} className="flex items-center space-x-2 bg-gray-100 px-3 py-2 rounded-lg">
                            <Paperclip className="w-4 h-4 text-gray-500" />
                            <span className="text-sm text-gray-700">{file.name}</span>
                            <button
                              onClick={() => removeAttachment(index)}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex space-x-3 items-end">
                      {/* AI 모델 선택 */}
                      <div className="flex-shrink-0">
                        <select
                          value={selectedModel}
                          onChange={(e) => onModelChange(e.target.value)}
                          className="px-3 py-3 bg-gray-50 border-2 border-gray-200 rounded-lg text-sm hover:bg-gray-100 focus:border-blue-500 focus:outline-none transition-colors"
                        >
                          {models.map(model => (
                            <option key={model.id} value={model.id}>
                              {model.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      {/* 메시지 입력 */}
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
                          placeholder="AI와 대화하기..."
                          className="w-full min-h-[52px] max-h-[120px] px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-lg resize-none focus:outline-none focus:bg-white focus:border-blue-500 transition-all text-base pr-20"
                          rows={1}
                        />
                        
                        {/* 입력 도구들 */}
                        <div className="absolute right-2 bottom-2 flex items-center space-x-1">
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
                            className="p-2 text-gray-400 hover:text-gray-600 cursor-pointer rounded transition-colors"
                          >
                            <Paperclip className="w-4 h-4" />
                          </label>
                          
                          <button
                            onClick={() => setIsVoiceMode(!isVoiceMode)}
                            className={`p-2 rounded transition-colors ${
                              isVoiceMode
                                ? 'text-blue-600 bg-blue-50'
                                : 'text-gray-400 hover:text-gray-600'
                            }`}
                          >
                            {isVoiceMode ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      
                      {/* 전송 버튼 */}
                      <div className="flex-shrink-0">
                        <button
                          onClick={handleSendMessage}
                          disabled={!newMessage.trim() && attachments.length === 0}
                          className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center space-x-2 shadow-lg ${
                            (newMessage.trim() || attachments.length > 0)
                              ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white hover:shadow-xl transform hover:-translate-y-0.5'
                              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          <Send className="w-4 h-4" />
                          <span className="hidden sm:inline">Send</span>
                        </button>
                      </div>
                    </div>
                    
                    {/* 도움말 */}
                    <div className="flex items-center justify-center mt-2 text-xs text-gray-500">
                      <span>Enter 전송, Shift+Enter 줄바꿈 • CUE 토큰 마이닝 활성</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 다른 뷰들 */}
            {currentView === 'dashboard' && (
              <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                <DashboardView 
                  passport={passport} 
                  cueBalance={cueBalance} 
                  todaysMining={todaysMining} 
                  messages={messages} 
                />
              </div>
            )}
            {currentView === 'passport' && (
              <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                <PassportView passport={passport} />
              </div>
            )}
            {currentView === 'vaults' && (
              <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                <VaultsView passport={passport} />
              </div>
            )}
            {currentView === 'platforms' && (
              <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                <PlatformsView passport={passport} />
              </div>
            )}
            {currentView === 'analytics' && (
              <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                <AnalyticsView 
                  passport={passport} 
                  cueBalance={cueBalance} 
                  todaysMining={todaysMining} 
                  messages={messages} 
                />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}