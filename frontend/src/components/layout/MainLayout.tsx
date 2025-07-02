// ============================================================================
// 📁 src/components/layout/MainLayout.tsx
// 🎯 완전한 CUE Protocol 메인 레이아웃 (paste-5.txt 기반 + 개선)
// ============================================================================

'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Menu, X, Settings, Wifi, WifiOff, Star, Send, Paperclip,
  Mic, MicOff, MessageCircle, Activity, Fingerprint, Database,
  Globe, BarChart3, Shield, LogOut, Plus, TrendingUp, Brain,
  Coins, Lock, User, Award, Heart, Clock, Eye, Copy, Hash,
  ChevronRight, AlertCircle, CheckCircle, Target, Download,
  Upload, Search, Calendar, Zap, RefreshCw, Coffee
} from 'lucide-react';

// 기존 컴포넌트들 import
import { IndependentSidebar } from './IndependentSidebar';
import { IndependentMainContent } from '../chat/IndependentMainContent';

// ============================================================================
// 🔧 타입 정의 (확장됨)
// ============================================================================

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: string;
  model?: string;
  cueReward?: number;
  trustScore?: number;
  contextLearned?: boolean;
  qualityScore?: number;
  attachments?: File[];
  metadata?: any;
  isError?: boolean;
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
    items: number;
    cueCount: number;
    encrypted: boolean;
    lastUpdated: Date;
    accessLevel: string;
    value: number;
    dataPoints: any[];
    usageCount: number;
    sourcePlatforms: string[];
  }>;
  connectedPlatforms: Array<{
    id: string;
    name: string;
    connected: boolean;
    status: string;
    lastSync: string;
    conversations: number;
    cueCount: number;
    contextMined: number;
    icon: string;
    color: string;
    health: string;
    data_synced: number;
    cue_earned: number;
  }>;
  personalityProfile: {
    type: string;
    traits: string[];
    communicationStyle: string;
    expertise: string[];
    mbtiType: string;
    learningStyle: string;
    learningPattern: string;
    workingStyle: string;
    responsePreference: string;
    decisionMaking: string;
  };
  achievements: Array<{
    id: string;
    name: string;
    icon: string;
    earned: boolean;
    description: string;
    date?: string;
    progress?: { current: number; total: number };
    category: string;
    rarity: string;
    earnedAt?: Date;
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
    knowledgeNodes: number;
    personalityAccuracy: number;
    adaptationRate: number;
    conceptCoverage: number;
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

// ============================================================================
// 🎨 상태 배지 컴포넌트 (개선됨)
// ============================================================================

const BackendStatus = ({ 
  status, 
  onRetry, 
  connectionDetails 
}: { 
  status: ConnectionStatus; 
  onRetry: () => void; 
  connectionDetails?: any 
}) => {
  const isConnected = status === 'connected';
  
  return (
    <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
      isConnected ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
    }`}>
      {isConnected ? (
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
      ) : (
        <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce"></div>
      )}
      <span>{isConnected ? 'Live Backend' : 'Mock Mode'}</span>
      {connectionDetails?.version && (
        <span className="opacity-75">v{connectionDetails.version}</span>
      )}
      {!isConnected && (
        <button onClick={onRetry} className="underline hover:no-underline ml-1 transition-colors">
          재시도
        </button>
      )}
    </div>
  );
};

// ============================================================================
// 🎨 대시보드 뷰 컴포넌트 (완전히 개선됨)
// ============================================================================

const DashboardView = ({ passport, cueBalance, todaysMining, messages }: { 
  passport?: AIPassport; 
  cueBalance: number; 
  todaysMining: number; 
  messages: Message[] 
}) => {
  return (
    <div className="p-6 space-y-6 h-full overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
      {/* 핵심 메트릭 카드들 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* CUE Balance Card */}
        <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white opacity-10 rounded-full -mr-10 -mt-10"></div>
          <div className="relative z-10">
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
            <div className="mt-2 text-sm text-blue-200">
              ↗ {((todaysMining / cueBalance) * 100).toFixed(1)}% 오늘 증가
            </div>
          </div>
        </div>

        {/* Trust Score Card */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-green-600" />
            </div>
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-1">{passport?.trustScore || 95}%</div>
          <div className="text-gray-600">Trust Score</div>
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-500" 
                style={{ width: `${passport?.trustScore || 95}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Conversations Card */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-purple-600" />
            </div>
            <Activity className="w-5 h-5 text-purple-500" />
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-1">{messages.length}</div>
          <div className="text-gray-600">Conversations</div>
          <div className="mt-2 text-sm text-purple-600">
            {messages.filter(m => m.type === 'ai' && m.cueReward).length} CUE 보상 메시지
          </div>
        </div>

        {/* Learning Progress Card */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Brain className="w-6 h-6 text-orange-600" />
            </div>
            <Zap className="w-5 h-5 text-orange-500" />
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-1">
            {passport?.ragDagStats?.learnedConcepts || 247}
          </div>
          <div className="text-gray-600">Learned Concepts</div>
          <div className="mt-2 text-sm text-orange-600">
            {Math.round((passport?.ragDagStats?.personalityAccuracy || 0.94) * 100)}% 정확도
          </div>
        </div>
      </div>

      {/* 상세 차트 및 분석 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Activity Chart */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
            Weekly Activity
          </h3>
          <div className="space-y-4">
            {(passport?.analytics?.weeklyActivity || [
              { day: 'Mon', chats: 12, cue: 45, quality: 0.89 },
              { day: 'Tue', chats: 18, cue: 67, quality: 0.92 },
              { day: 'Wed', chats: 25, cue: 89, quality: 0.87 },
              { day: 'Thu', chats: 14, cue: 52, quality: 0.94 },
              { day: 'Fri', chats: 20, cue: 78, quality: 0.91 },
              { day: 'Sat', chats: 8, cue: 23, quality: 0.85 },
              { day: 'Sun', chats: 6, cue: 18, quality: 0.88 }
            ]).map((day, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 w-8">{day.day}</span>
                <div className="flex items-center space-x-3 flex-1 mx-4">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500" 
                      style={{ width: `${(day.chats / 25) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-8">{day.chats}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Coins className="w-3 h-3 text-yellow-500" />
                  <span className="text-xs text-yellow-600">{day.cue}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Learning Progress Details */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Brain className="w-5 h-5 mr-2 text-purple-600" />
            RAG-DAG Learning Progress
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">개인화 정확도</span>
                <span className="font-medium">{Math.round((passport?.ragDagStats?.personalityAccuracy || 0.94) * 100)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-purple-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${(passport?.ragDagStats?.personalityAccuracy || 0.94) * 100}%` }}
                ></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">문맥 이해도</span>
                <span className="font-medium">{Math.round((passport?.ragDagStats?.contextualAccuracy || 0.89) * 100)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${(passport?.ragDagStats?.contextualAccuracy || 0.89) * 100}%` }}
                ></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">학습 속도</span>
                <span className="font-medium">{Math.round((passport?.ragDagStats?.learningVelocity || 0.78) * 100)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${(passport?.ragDagStats?.learningVelocity || 0.78) * 100}%` }}
                ></div>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">학습된 개념</span>
                  <p className="font-bold text-gray-900">{passport?.ragDagStats?.learnedConcepts || 247}</p>
                </div>
                <div>
                  <span className="text-gray-600">지식 노드</span>
                  <p className="font-bold text-gray-900">{passport?.ragDagStats?.knowledgeNodes || 1456}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 플랫폼 연결 상태 */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Globe className="w-5 h-5 mr-2 text-green-600" />
          Connected Platforms Overview
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(passport?.connectedPlatforms || [
            { name: 'ChatGPT', cue_earned: 2340, conversations: 45, health: 'good' },
            { name: 'Claude', cue_earned: 1250, conversations: 28, health: 'good' },
            { name: 'Discord', cue_earned: 0, conversations: 0, health: 'disconnected' }
          ]).slice(0, 3).map((platform, index) => (
            <div key={index} className="p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900">{platform.name}</h4>
                <div className={`w-2 h-2 rounded-full ${
                  platform.health === 'good' ? 'bg-green-500' : 
                  platform.health === 'warning' ? 'bg-yellow-500' : 'bg-gray-400'
                }`}></div>
              </div>
              <div className="space-y-1 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>대화:</span>
                  <span className="font-medium">{platform.conversations || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>CUE 획득:</span>
                  <span className="font-medium text-yellow-600">{platform.cue_earned || 0}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 최근 업적 */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Award className="w-5 h-5 mr-2 text-yellow-600" />
          Recent Achievements
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(passport?.achievements || [
            { name: 'First CUE', icon: '🎯', earned: true, description: '첫 CUE 마이닝', category: 'mining' },
            { name: 'Trusted Agent', icon: '🛡️', earned: true, description: '신뢰도 90% 달성', category: 'trust' },
            { name: 'Conversation Expert', icon: '💬', earned: true, description: '100회 대화', category: 'engagement' },
            { name: 'Platform Master', icon: '🌐', earned: false, description: '5개 플랫폼 연결', category: 'connection' }
          ]).slice(0, 4).map((achievement, index) => (
            <div key={index} className={`flex items-center space-x-3 p-3 rounded-lg ${
              achievement.earned ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'
            }`}>
              <span className="text-2xl">{achievement.icon}</span>
              <div className="flex-1">
                <p className={`font-medium ${achievement.earned ? 'text-green-800' : 'text-gray-600'}`}>
                  {achievement.name}
                </p>
                <p className="text-sm text-gray-500">{achievement.description}</p>
              </div>
              {achievement.earned && (
                <CheckCircle className="w-5 h-5 text-green-600" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 🎨 패스포트 뷰 컴포넌트 (확장됨)
// ============================================================================

const PassportView = ({ passport }: { passport?: AIPassport }) => {
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'achievements', label: 'Achievements', icon: Award },
    { id: 'personality', label: 'Personality', icon: Heart },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 }
  ];

  return (
    <div className="p-6 space-y-6 h-full overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
      {/* Passport Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16"></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                <Shield className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{passport?.username || 'AI Agent'}</h2>
                <p className="text-blue-100">{passport?.passportLevel || 'Verified Agent'}</p>
                <p className="text-sm text-blue-200 font-mono">
                  {passport?.did ? passport.did.slice(0, 20) + '...' : 'did:cue:loading...'}
                </p>
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
<div className="text-xl font-bold">{(passport?.achievements || []).filter(a => a?.earned).length || 4}</div>
              <div className="text-xs text-blue-100">Achievements</div>
            </div>
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
              className={`flex items-center space-x-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
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
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <User className="w-5 h-5 mr-2" />
              Identity & Profile
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-600">DID (Decentralized Identity)</label>
                <div className="flex items-center space-x-2 mt-1">
                  <p className="font-mono text-sm text-gray-800 bg-gray-100 px-3 py-2 rounded flex-1 truncate">
                    {passport?.did || 'did:cue:loading...'}
                  </p>
                  <button 
                    onClick={() => navigator.clipboard.writeText(passport?.did || '')}
                    className="p-2 hover:bg-gray-100 rounded transition-colors"
                  >
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
              <div>
                <label className="text-sm text-gray-600">Passport Level</label>
                <div className="mt-1">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {passport?.passportLevel || 'Verified'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Brain className="w-5 h-5 mr-2 text-purple-600" />
              RAG-DAG Learning Engine
            </h3>
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
                    className="bg-purple-500 h-2 rounded-full transition-all duration-500" 
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

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                <div className="text-center">
                  <p className="text-lg font-bold text-gray-900">{passport?.ragDagStats?.knowledgeNodes || 1456}</p>
                  <p className="text-xs text-gray-500">Knowledge Nodes</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-gray-900">
                    {Math.round((passport?.ragDagStats?.connectionStrength || 0.87) * 100)}%
                  </p>
                  <p className="text-xs text-gray-500">Connection Strength</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 다른 탭들도 여기에 추가... */}
      {activeTab === 'achievements' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(passport?.achievements || []).map((achievement, index) => (
            <div key={index} className={`p-6 rounded-xl border-2 transition-all ${
              achievement.earned 
                ? 'bg-gradient-to-br from-green-50 to-blue-50 border-green-200 hover:shadow-lg' 
                : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
            }`}>
              <div className="text-center">
                <div className="text-4xl mb-3">{achievement.icon}</div>
                <h4 className={`font-semibold mb-2 ${achievement.earned ? 'text-green-800' : 'text-gray-600'}`}>
                  {achievement.name}
                </h4>
                <p className="text-sm text-gray-600 mb-3">{achievement.description}</p>
                {achievement.earned ? (
                  <div className="flex items-center justify-center space-x-1 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-xs">완료됨</span>
                  </div>
                ) : achievement.progress ? (
                  <div className="space-y-2">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${(achievement.progress.current / achievement.progress.total) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-500">
                      {achievement.progress.current}/{achievement.progress.total}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-gray-400">미완료</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 🎨 기타 뷰 컴포넌트들 (간소화된 버전)
// ============================================================================

const VaultsView = ({ passport }: { passport?: AIPassport }) => (
  <div className="p-6 h-full overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-2xl font-bold text-gray-900">Data Vaults</h2>
      <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
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
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Size:</span>
              <span className="font-medium">{vault.size}</span>
            </div>
            <div className="flex justify-between">
              <span>Items:</span>
              <span className="font-medium">{vault.items}</span>
            </div>
            <div className="flex justify-between">
              <span>CUE Value:</span>
              <span className="font-medium text-yellow-600">{vault.cueCount}</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
            <div className="flex items-center space-x-1">
              <Lock className="w-4 h-4 text-green-500" />
              <span className="text-xs text-green-600">Encrypted</span>
            </div>
            <span className="text-xs text-gray-500">
              {new Date(vault.lastUpdated).toLocaleDateString()}
            </span>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const PlatformsView = ({ passport }: { passport?: AIPassport }) => (
  <div className="p-6 h-full overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-2xl font-bold text-gray-900">Connected Platforms</h2>
      <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
        <Plus className="w-4 h-4" />
        <span>Connect Platform</span>
      </button>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {(passport?.connectedPlatforms || []).map((platform, index) => (
        <div key={index} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-lg">{platform.icon || '🌐'}</span>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">{platform.name}</h4>
                <p className="text-sm text-green-600">Connected</p>
              </div>
            </div>
            <div className={`w-3 h-3 rounded-full ${
              platform.health === 'good' ? 'bg-green-500' : 
              platform.health === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
            }`}></div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-center bg-gray-50 rounded-lg p-3">
              <div className="text-lg font-bold text-gray-900">{platform.conversations || 0}</div>
              <div className="text-xs text-gray-500">Conversations</div>
            </div>
            <div className="text-center bg-yellow-50 rounded-lg p-3">
              <div className="text-lg font-bold text-yellow-600">{platform.cue_earned || 0}</div>
              <div className="text-xs text-gray-500">CUE Earned</div>
            </div>
          </div>

          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Data Synced:</span>
              <span className="font-medium">{platform.data_synced || 0} items</span>
            </div>
            <div className="flex justify-between">
              <span>Last Sync:</span>
              <span className="font-medium">
                {platform.lastSync ? new Date(platform.lastSync).toLocaleDateString() : 'Never'}
              </span>
            </div>
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
  <div className="p-6 space-y-6 h-full overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
    <h2 className="text-2xl font-bold text-gray-900">CUE Analytics & Insights</h2>
    
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
        <div className="text-2xl font-bold text-gray-900 mb-1">{cueBalance.toLocaleString()}</div>
        <div className="text-gray-600 text-sm">Total CUE Balance</div>
        <div className="text-xs text-green-600 mt-1">
          ↗ +{todaysMining} today
        </div>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
        <div className="text-2xl font-bold text-gray-900 mb-1">+{todaysMining}</div>
        <div className="text-gray-600 text-sm">Today's Mining</div>
        <div className="text-xs text-blue-600 mt-1">
          {((todaysMining / cueBalance) * 100).toFixed(1)}% of total
        </div>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
        <div className="text-2xl font-bold text-gray-900 mb-1">{passport?.ragDagStats?.learnedConcepts || 247}</div>
        <div className="text-gray-600 text-sm">Learned Concepts</div>
        <div className="text-xs text-purple-600 mt-1">
          +{Math.floor(Math.random() * 10) + 5} this week
        </div>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
        <div className="text-2xl font-bold text-gray-900 mb-1">{messages.length}</div>
        <div className="text-gray-600 text-sm">Total Conversations</div>
        <div className="text-xs text-green-600 mt-1">
          {messages.filter(m => m.cueReward).length} rewarded
        </div>
      </div>
    </div>

    {/* 추가 분석 차트들... */}
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">CUE Mining Efficiency</h3>
      <div className="text-center py-8 text-gray-500">
        <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p>Advanced analytics coming soon...</p>
      </div>
    </div>
  </div>
);

// ============================================================================
// 🎯 메인 레이아웃 컴포넌트
// ============================================================================

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
  const handleSendMessage = async (message: string, model: string) => {
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ⭐️ 상단 헤더 (완전 고정) */}
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
            
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-gray-900">CUE Protocol</h1>
                <p className="text-sm text-gray-500">AI Personalization Platform</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="hidden sm:flex items-center space-x-2 px-3 py-2 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
              <Coins className="w-4 h-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-800">{cueBalance.toLocaleString()}</span>
            </div>
            
            <BackendStatus 
              status={connectionStatus} 
              onRetry={onRetryConnection}
              connectionDetails={connectionDetails}
            />
            
            <button 
              onClick={onLogout}
              className="flex items-center space-x-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline text-sm">로그아웃</span>
            </button>
          </div>
        </div>
      </header>

      {/* ⭐️ 메인 콘텐츠 영역 */}
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
            currentView={currentView}
            onViewChange={onViewChange}
            isMobile={isMobile}
            showMobileSidebar={showMobileSidebar}
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
          <div className="bg-white border-b border-gray-200 px-4 md:px-6 py-3 flex-shrink-0">
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

          {/* ⭐️ 컨텐츠 영역 */}
          <div className="flex-1 overflow-hidden">
            {/* 채팅 뷰 */}
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

            {/* 다른 뷰들 */}
            {currentView === 'dashboard' && (
              <DashboardView 
                passport={passport} 
                cueBalance={cueBalance} 
                todaysMining={todaysMining} 
                messages={messages} 
              />
            )}
            {currentView === 'passport' && (
              <PassportView passport={passport} />
            )}
            {currentView === 'vaults' && (
              <VaultsView passport={passport} />
            )}
            {currentView === 'platforms' && (
              <PlatformsView passport={passport} />
            )}
            {currentView === 'analytics' && (
              <AnalyticsView 
                passport={passport} 
                cueBalance={cueBalance} 
                todaysMining={todaysMining} 
                messages={messages} 
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}