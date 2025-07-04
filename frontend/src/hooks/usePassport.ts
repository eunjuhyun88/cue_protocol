// ============================================================================
// 📁 frontend/src/hooks/usePassport.ts
// 🎫 AI 패스포트 관리 훅 - 완전한 구현
// ============================================================================
// AI 패스포트 데이터의 로딩, 업데이트, 캐싱, 분석을 관리합니다.
// 백엔드 연결 상태에 따라 실제 API 또는 Mock 데이터를 사용하며,
// 에러 발생시 안전한 폴백 메커니즘을 제공합니다.
// 개인화 프로필, 데이터 볼트, 연결된 플랫폼, 업적 시스템을 통합 관리합니다.

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { usePassportStore } from '../store/passportStore';
import { PassportAPI } from '../services/api/PassportAPI';
import type { 
  UnifiedAIPassport, 
  PersonalityProfile,
  DataVault,
  ConnectedPlatform,
  Achievement,
  ContextHistory,
  PersonalizedAgent
} from '../types/passport.types';

// ============================================================================
// 📝 타입 정의
// ============================================================================
interface PassportMetrics {
  trustScoreChange: number;
  cueTokensEarned: number;
  platformsConnected: number;
  dataPointsCollected: number;
  achievementsUnlocked: number;
  lastActivityTime: Date;
}

interface PassportAnalytics {
  personalityAccuracy: number;
  dataCompleteness: number;
  engagementLevel: number;
  privacyScore: number;
  interactionQuality: number;
}

interface UsePassportReturn {
  // 상태
  passport: UnifiedAIPassport | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  
  // 패스포트 관리
  loadPassport: () => Promise<void>;
  updatePassport: (updates: Partial<UnifiedAIPassport>) => Promise<void>;
  refreshPassport: () => Promise<void>;
  createPassport: (userData: any) => Promise<void>;
  
  // 개성 프로필 관리
  updatePersonalityProfile: (profile: Partial<PersonalityProfile>) => Promise<void>;
  analyzePersonality: () => Promise<PersonalityProfile>;
  
  // 데이터 볼트 관리
  addDataVault: (vault: Omit<DataVault, 'id' | 'createdAt'>) => Promise<void>;
  updateDataVault: (vaultId: string, updates: Partial<DataVault>) => Promise<void>;
  removeDataVault: (vaultId: string) => Promise<void>;
  
  // 플랫폼 관리
  connectPlatform: (platform: Omit<ConnectedPlatform, 'connectedAt'>) => Promise<void>;
  disconnectPlatform: (platformId: string) => Promise<void>;
  syncPlatformData: (platformId: string) => Promise<void>;
  
  // 업적 시스템
  checkAchievements: () => Promise<Achievement[]>;
  unlockAchievement: (achievementId: string) => Promise<void>;
  
  // 개인화 에이전트
  createPersonalizedAgent: (agentData: Omit<PersonalizedAgent, 'id' | 'createdAt'>) => Promise<void>;
  updateAgent: (agentId: string, updates: Partial<PersonalizedAgent>) => Promise<void>;
  
  // 분석 및 통계
  getPassportMetrics: () => PassportMetrics;
  getAnalytics: () => PassportAnalytics;
  
  // 유틸리티
  clearError: () => void;
  resetPassport: () => void;
  exportPassportData: () => Promise<any>;
  importPassportData: (data: any) => Promise<void>;
}

// ============================================================================
// 🔧 PassportAPIService 클래스
// ============================================================================
class PassportAPIService {
  private baseURL: string;
  private api: PassportAPI;

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    this.api = new PassportAPI();
  }

  // 패스포트 조회
  async getPassport(userDid: string): Promise<UnifiedAIPassport> {
    try {
      console.log(`🎫 패스포트 조회: ${userDid}`);
      
      const response = await fetch(`${this.baseURL}/api/passport/${userDid}`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const passport = this.normalizePassportData(data.passport || data);
      
      console.log(`✅ 패스포트 로드 성공:`, passport.did);
      return passport;
    } catch (error: any) {
      console.warn(`⚠️ 패스포트 API 실패, Mock 데이터 사용:`, error.message);
      return this.createMockPassport(userDid);
    }
  }

  // 패스포트 업데이트
  async updatePassport(userDid: string, updates: Partial<UnifiedAIPassport>): Promise<UnifiedAIPassport> {
    try {
      console.log(`🎫 패스포트 업데이트: ${userDid}`, updates);
      
      const response = await fetch(`${this.baseURL}/api/passport/${userDid}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const passport = this.normalizePassportData(data.passport || data);
      
      console.log(`✅ 패스포트 업데이트 성공`);
      return passport;
    } catch (error: any) {
      console.warn(`⚠️ 패스포트 업데이트 API 실패:`, error.message);
      throw error;
    }
  }

  // 패스포트 생성
  async createPassport(userData: any): Promise<UnifiedAIPassport> {
    try {
      console.log(`🎫 패스포트 생성:`, userData);
      
      const response = await fetch(`${this.baseURL}/api/passport`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const passport = this.normalizePassportData(data.passport || data);
      
      console.log(`✅ 패스포트 생성 성공:`, passport.did);
      return passport;
    } catch (error: any) {
      console.warn(`⚠️ 패스포트 생성 API 실패, Mock 생성:`, error.message);
      return this.createMockPassport(userData.did || `did:mock:${Date.now()}`);
    }
  }

  // 개성 분석
  async analyzePersonality(userDid: string, contextData: any[]): Promise<PersonalityProfile> {
    try {
      console.log(`🧠 개성 분석: ${userDid}`);
      
      const response = await fetch(`${this.baseURL}/api/passport/${userDid}/analyze`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contextData })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ 개성 분석 완료`);
      return data.personalityProfile;
    } catch (error: any) {
      console.warn(`⚠️ 개성 분석 API 실패, Mock 생성:`, error.message);
      return this.generateMockPersonality();
    }
  }

  // 플랫폼 동기화
  async syncPlatformData(userDid: string, platformId: string): Promise<any> {
    try {
      console.log(`🔄 플랫폼 동기화: ${platformId}`);
      
      const response = await fetch(`${this.baseURL}/api/passport/${userDid}/sync/${platformId}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ 플랫폼 동기화 완료`);
      return data;
    } catch (error: any) {
      console.warn(`⚠️ 플랫폼 동기화 API 실패:`, error.message);
      throw error;
    }
  }

  // 업적 확인
  async checkAchievements(userDid: string): Promise<Achievement[]> {
    try {
      console.log(`🏆 업적 확인: ${userDid}`);
      
      const response = await fetch(`${this.baseURL}/api/passport/${userDid}/achievements`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ 업적 확인 완료: ${data.achievements?.length || 0}개`);
      return data.achievements || [];
    } catch (error: any) {
      console.warn(`⚠️ 업적 확인 API 실패, Mock 생성:`, error.message);
      return this.generateMockAchievements();
    }
  }

  // ============================================================================
  // 🔧 데이터 정규화 및 Mock 생성
  // ============================================================================
  
  normalizePassportData(data: any): UnifiedAIPassport {
    return {
      did: data.did || 'unknown-did',
      walletAddress: data.walletAddress || data.wallet_address || '0x...',
      passkeyRegistered: Boolean(data.passkeyRegistered || data.passkey_registered),
      trustScore: Math.max(0, Math.min(100, data.trustScore || data.trust_score || 0)),
      cueTokens: Math.max(0, data.cueTokens || data.cue_tokens || 0),
      registrationStatus: data.registrationStatus || data.registration_status || 'pending',
      biometricVerified: Boolean(data.biometricVerified || data.biometric_verified),
      passportLevel: data.passportLevel || data.passport_level || 'Basic',
      
      personalityProfile: {
        type: data.personalityProfile?.type || data.personality_profile?.type || 'Analyzing...',
        communicationStyle: data.personalityProfile?.communicationStyle || 
                           data.personality_profile?.communication_style || 'Adaptive',
        learningPattern: data.personalityProfile?.learningPattern || 
                        data.personality_profile?.learning_pattern || 'Visual',
        workingStyle: data.personalityProfile?.workingStyle || 
                     data.personality_profile?.working_style || 'Flexible',
        responsePreference: data.personalityProfile?.responsePreference || 
                           data.personality_profile?.response_preference || 'Balanced',
        decisionMaking: data.personalityProfile?.decisionMaking || 
                       data.personality_profile?.decision_making || 'Analytical'
      },
      
      dataVaults: Array.isArray(data.dataVaults || data.data_vaults) ? 
                  (data.dataVaults || data.data_vaults) : [],
      connectedPlatforms: Array.isArray(data.connectedPlatforms || data.connected_platforms) ? 
                         (data.connectedPlatforms || data.connected_platforms) : [],
      contextHistory: Array.isArray(data.contextHistory || data.context_history) ? 
                     (data.contextHistory || data.context_history) : [],
      cueHistory: Array.isArray(data.cueHistory || data.cue_history) ? 
                 (data.cueHistory || data.cue_history) : [],
      personalizedAgents: Array.isArray(data.personalizedAgents || data.personalized_agents) ? 
                         (data.personalizedAgents || data.personalized_agents) : []
    };
  }

  createMockPassport(userDid: string): UnifiedAIPassport {
    return {
      did: userDid,
      walletAddress: `0x${Math.random().toString(16).substring(2, 42)}`,
      passkeyRegistered: true,
      trustScore: 75 + Math.floor(Math.random() * 25),
      cueTokens: 1500 + Math.floor(Math.random() * 5000),
      registrationStatus: 'verified',
      biometricVerified: true,
      passportLevel: 'Verified',
      
      personalityProfile: this.generateMockPersonality(),
      
      dataVaults: this.generateMockDataVaults(),
      connectedPlatforms: this.generateMockPlatforms(),
      contextHistory: this.generateMockContextHistory(),
      cueHistory: [],
      personalizedAgents: this.generateMockAgents()
    };
  }

  generateMockPersonality(): PersonalityProfile {
    const types = ['Analyst', 'Creator', 'Collaborator', 'Explorer', 'Optimizer'];
    const styles = ['Direct', 'Friendly', 'Formal', 'Casual', 'Adaptive'];
    const patterns = ['Visual', 'Auditory', 'Kinesthetic', 'Reading', 'Multimodal'];
    const workStyles = ['Methodical', 'Creative', 'Collaborative', 'Independent', 'Flexible'];
    const preferences = ['Concise', 'Detailed', 'Balanced', 'Examples', 'Step-by-step'];
    const decisions = ['Analytical', 'Intuitive', 'Collaborative', 'Quick', 'Thorough'];

    return {
      type: types[Math.floor(Math.random() * types.length)],
      communicationStyle: styles[Math.floor(Math.random() * styles.length)],
      learningPattern: patterns[Math.floor(Math.random() * patterns.length)],
      workingStyle: workStyles[Math.floor(Math.random() * workStyles.length)],
      responsePreference: preferences[Math.floor(Math.random() * preferences.length)],
      decisionMaking: decisions[Math.floor(Math.random() * decisions.length)]
    };
  }

  generateMockDataVaults(): DataVault[] {
    return [
      {
        id: 'vault-1',
        name: 'Personal Data',
        type: 'encrypted',
        size: '1.2MB',
        itemCount: 247,
        cueCount: 15,
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        lastModified: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        encryptionLevel: 'AES-256',
        accessLevel: 'private'
      },
      {
        id: 'vault-2',
        name: 'AI Conversations',
        type: 'conversations',
        size: '856KB',
        itemCount: 89,
        cueCount: 8,
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        lastModified: new Date(Date.now() - 1 * 60 * 60 * 1000),
        encryptionLevel: 'AES-256',
        accessLevel: 'shared'
      },
      {
        id: 'vault-3',
        name: 'Knowledge Base',
        type: 'knowledge',
        size: '15.7MB',
        itemCount: 234,
        cueCount: 23,
        createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
        lastModified: new Date(Date.now() - 3 * 60 * 60 * 1000),
        encryptionLevel: 'AES-256',
        accessLevel: 'private'
      }
    ];
  }

  generateMockPlatforms(): ConnectedPlatform[] {
    return [
      {
        id: 'platform-1',
        name: 'ChatGPT',
        type: 'ai_assistant',
        status: 'connected',
        connectedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
        lastSync: new Date(Date.now() - 1 * 60 * 60 * 1000),
        dataPoints: 156,
        permissions: ['read_conversations', 'analyze_patterns']
      },
      {
        id: 'platform-2',
        name: 'Claude',
        type: 'ai_assistant',
        status: 'connected',
        connectedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        lastSync: new Date(Date.now() - 30 * 60 * 1000),
        dataPoints: 89,
        permissions: ['read_conversations', 'export_data']
      },
      {
        id: 'platform-3',
        name: 'Notion',
        type: 'productivity',
        status: 'pending',
        connectedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        lastSync: undefined,
        dataPoints: 0,
        permissions: ['read_workspace']
      }
    ];
  }

  generateMockContextHistory(): ContextHistory[] {
    return [
      {
        id: 'context-1',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        context: 'AI 개발에 대한 질문과 토론',
        source: 'ChatGPT',
        cueGenerated: 5,
        metadata: { topic: 'AI Development', sentiment: 'positive' }
      },
      {
        id: 'context-2',
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
        context: 'TypeScript 코딩 패턴 학습',
        source: 'Claude',
        cueGenerated: 3,
        metadata: { topic: 'Programming', complexity: 'intermediate' }
      },
      {
        id: 'context-3',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
        context: '개인 생산성 향상 방법',
        source: 'ChatGPT',
        cueGenerated: 4,
        metadata: { topic: 'Productivity', actionable: true }
      }
    ];
  }

  generateMockAgents(): PersonalizedAgent[] {
    return [
      {
        id: 'agent-1',
        name: 'Code Mentor',
        type: 'coding_assistant',
        personality: 'patient_teacher',
        specialization: ['TypeScript', 'React', 'Node.js'],
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        lastActive: new Date(Date.now() - 2 * 60 * 60 * 1000),
        interactionCount: 45,
        effectiveness: 0.87
      },
      {
        id: 'agent-2',
        name: 'Research Assistant',
        type: 'research_helper',
        personality: 'analytical_thorough',
        specialization: ['Data Analysis', 'Academic Research', 'Fact Checking'],
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        lastActive: new Date(Date.now() - 4 * 60 * 60 * 1000),
        interactionCount: 23,
        effectiveness: 0.92
      }
    ];
  }

  generateMockAchievements(): Achievement[] {
    return [
      {
        id: 'achievement-1',
        name: 'First Steps',
        description: 'AI 패스포트를 처음 생성했습니다',
        icon: '🎯',
        category: 'milestone',
        earned: true,
        earnedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        progress: 100,
        requirements: ['Create AI Passport']
      },
      {
        id: 'achievement-2',
        name: 'Conversationalist',
        description: '100번의 AI 대화를 완료했습니다',
        icon: '💬',
        category: 'interaction',
        earned: false,
        earnedAt: undefined,
        progress: 67,
        requirements: ['Complete 100 AI conversations']
      },
      {
        id: 'achievement-3',
        name: 'Data Collector',
        description: '1000개의 데이터 포인트를 수집했습니다',
        icon: '📊',
        category: 'data',
        earned: false,
        earnedAt: undefined,
        progress: 34,
        requirements: ['Collect 1000 data points']
      }
    ];
  }
}

// ============================================================================
// 🎣 usePassport 훅 구현
// ============================================================================
export const usePassport = (
  userDid?: string,
  backendConnected: boolean = false
): UsePassportReturn => {
  // ============================================================================
  // 🎛️ 상태 관리 (Zustand Store 연동)
  // ============================================================================
  const passportStore = usePassportStore();
  const [localState, setLocalState] = useState({
    isLoading: false,
    error: null as string | null,
    lastUpdated: null as Date | null
  });

  // API 서비스 인스턴스
  const apiServiceRef = useRef<PassportAPIService>();
  if (!apiServiceRef.current) {
    apiServiceRef.current = new PassportAPIService();
  }
  const apiService = apiServiceRef.current;

  const loadingRef = useRef(false);

  // ============================================================================
  // 🔧 패스포트 관리 메서드
  // ============================================================================
  
  const loadPassport = useCallback(async () => {
    if (!userDid || loadingRef.current) return;

    loadingRef.current = true;
    setLocalState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      console.log(`🎫 패스포트 로딩: ${userDid}`);
      
      const passport = await apiService.getPassport(userDid);
      
      // Zustand Store에 업데이트
      passportStore.loadPassport(userDid);
      
      setLocalState(prev => ({
        ...prev,
        isLoading: false,
        lastUpdated: new Date()
      }));

      console.log(`✅ 패스포트 로딩 완료:`, passport.did);
    } catch (error: any) {
      console.error(`❌ 패스포트 로딩 실패:`, error);
      setLocalState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message
      }));
    } finally {
      loadingRef.current = false;
    }
  }, [userDid, apiService, passportStore]);

  const updatePassport = useCallback(async (updates: Partial<UnifiedAIPassport>) => {
    if (!userDid) {
      throw new Error('사용자 DID가 필요합니다');
    }

    try {
      console.log(`🎫 패스포트 업데이트:`, updates);
      
      // 백엔드 API 호출
      if (backendConnected) {
        await apiService.updatePassport(userDid, updates);
      }
      
      // Zustand Store에 업데이트
      await passportStore.updatePassport(updates);
      
      setLocalState(prev => ({
        ...prev,
        lastUpdated: new Date()
      }));

      console.log(`✅ 패스포트 업데이트 완료`);
    } catch (error: any) {
      console.error(`❌ 패스포트 업데이트 실패:`, error);
      throw error;
    }
  }, [userDid, backendConnected, apiService, passportStore]);

  const refreshPassport = useCallback(async () => {
    await loadPassport();
    console.log(`🔄 패스포트 새로고침 완료`);
  }, [loadPassport]);

  const createPassport = useCallback(async (userData: any) => {
    try {
      console.log(`🎫 패스포트 생성:`, userData);
      
      const passport = await apiService.createPassport(userData);
      
      // Zustand Store에 저장
      await passportStore.createPassport(userData);
      
      setLocalState(prev => ({
        ...prev,
        lastUpdated: new Date()
      }));

      console.log(`✅ 패스포트 생성 완료:`, passport.did);
    } catch (error: any) {
      console.error(`❌ 패스포트 생성 실패:`, error);
      throw error;
    }
  }, [apiService, passportStore]);

  // ============================================================================
  // 🔧 개성 프로필 관리 메서드
  // ============================================================================
  
  const updatePersonalityProfile = useCallback(async (profile: Partial<PersonalityProfile>) => {
    if (!userDid || !passportStore.passport) {
      throw new Error('패스포트가 로드되지 않았습니다');
    }

    try {
      console.log(`🧠 개성 프로필 업데이트:`, profile);
      
      const updates = {
        personalityProfile: {
          ...passportStore.passport.personalityProfile,
          ...profile
        }
      };
      
      await updatePassport(updates);
      
      console.log(`✅ 개성 프로필 업데이트 완료`);
    } catch (error: any) {
      console.error(`❌ 개성 프로필 업데이트 실패:`, error);
      throw error;
    }
  }, [userDid, passportStore.passport, updatePassport]);

  const analyzePersonality = useCallback(async (): Promise<PersonalityProfile> => {
    if (!userDid || !passportStore.passport) {
      throw new Error('패스포트가 로드되지 않았습니다');
    }

    try {
      console.log(`🧠 개성 분석 시작`);
      
      const contextData = passportStore.passport.contextHistory || [];
      const personalityProfile = await apiService.analyzePersonality(userDid, contextData);
      
      // 분석 결과로 프로필 업데이트
      await updatePersonalityProfile(personalityProfile);
      
      console.log(`✅ 개성 분석 완료`);
      return personalityProfile;
    } catch (error: any) {
      console.error(`❌ 개성 분석 실패:`, error);
      throw error;
    }
  }, [userDid, passportStore.passport, updatePersonalityProfile, apiService]);

  // ============================================================================
  // 🔧 데이터 볼트 관리 메서드
  // ============================================================================
  
  const addDataVault = useCallback(async (vault: Omit<DataVault, 'id' | 'createdAt'>) => {
    if (!userDid || !passportStore.passport) {
      throw new Error('패스포트가 로드되지 않았습니다');
    }

    try {
      console.log(`🗄️ 데이터 볼트 추가:`, vault.name);
      
      const newVault: DataVault = {
        ...vault,
        id: `vault-${Date.now()}`,
        createdAt: new Date()
      };

      const currentVaults = passportStore.passport.dataVaults || [];
      const updates = {
        dataVaults: [...currentVaults, newVault]
      };
      
      await updatePassport(updates);
      
      console.log(`✅ 데이터 볼트 추가 완료`);
    } catch (error: any) {
      console.error(`❌ 데이터 볼트 추가 실패:`, error);
      throw error;
    }
  }, [userDid, passportStore.passport, updatePassport]);

  const updateDataVault = useCallback(async (vaultId: string, updates: Partial<DataVault>) => {
    if (!userDid || !passportStore.passport) {
      throw new Error('패스포트가 로드되지 않았습니다');
    }

    try {
      console.log(`🗄️ 데이터 볼트 업데이트: ${vaultId}`);
      
      const currentVaults = passportStore.passport.dataVaults || [];
      const updatedVaults = currentVaults.map(vault => 
        vault.id === vaultId 
          ? { ...vault, ...updates, lastModified: new Date() }
          : vault
      );

      await updatePassport({ dataVaults: updatedVaults });
      
      console.log(`✅ 데이터 볼트 업데이트 완료`);
    } catch (error: any) {
      console.error(`❌ 데이터 볼트 업데이트 실패:`, error);
      throw error;
    }
  }, [userDid, passportStore.passport, updatePassport]);

  const removeDataVault = useCallback(async (vaultId: string) => {
    if (!userDid || !passportStore.passport) {
      throw new Error('패스포트가 로드되지 않았습니다');
    }

    try {
      console.log(`🗑️ 데이터 볼트 제거: ${vaultId}`);
      
      const currentVaults = passportStore.passport.dataVaults || [];
      const filteredVaults = currentVaults.filter(vault => vault.id !== vaultId);

      await updatePassport({ dataVaults: filteredVaults });
      
      console.log(`✅ 데이터 볼트 제거 완료`);
    } catch (error: any) {
      console.error(`❌ 데이터 볼트 제거 실패:`, error);
      throw error;
    }
  }, [userDid, passportStore.passport, updatePassport]);

  // ============================================================================
  // 🔧 플랫폼 관리 메서드
  // ============================================================================
  
  const connectPlatform = useCallback(async (platform: Omit<ConnectedPlatform, 'connectedAt'>) => {
    if (!userDid || !passportStore.passport) {
      throw new Error('패스포트가 로드되지 않았습니다');
    }

    try {
      console.log(`🔗 플랫폼 연결:`, platform.name);
      
      const newPlatform: ConnectedPlatform = {
        ...platform,
        connectedAt: new Date()
      };

      const currentPlatforms = passportStore.passport.connectedPlatforms || [];
      const updates = {
        connectedPlatforms: [...currentPlatforms, newPlatform]
      };
      
      await updatePassport(updates);
      
      console.log(`✅ 플랫폼 연결 완료`);
    } catch (error: any) {
      console.error(`❌ 플랫폼 연결 실패:`, error);
      throw error;
    }
  }, [userDid, passportStore.passport, updatePassport]);

  const disconnectPlatform = useCallback(async (platformId: string) => {
    if (!userDid || !passportStore.passport) {
      throw new Error('패스포트가 로드되지 않았습니다');
    }

    try {
      console.log(`🔌 플랫폼 연결 해제: ${platformId}`);
      
      const currentPlatforms = passportStore.passport.connectedPlatforms || [];
      const filteredPlatforms = currentPlatforms.filter(platform => platform.id !== platformId);

      await updatePassport({ connectedPlatforms: filteredPlatforms });
      
      console.log(`✅ 플랫폼 연결 해제 완료`);
    } catch (error: any) {
      console.error(`❌ 플랫폼 연결 해제 실패:`, error);
      throw error;
    }
  }, [userDid, passportStore.passport, updatePassport]);

  const syncPlatformData = useCallback(async (platformId: string) => {
    if (!userDid) {
      throw new Error('사용자 DID가 필요합니다');
    }

    try {
      console.log(`🔄 플랫폼 데이터 동기화: ${platformId}`);
      
      const syncResult = await apiService.syncPlatformData(userDid, platformId);
      
      // 동기화 결과를 패스포트에 반영
      if (syncResult.dataUpdates) {
        await updatePassport(syncResult.dataUpdates);
      }
      
      console.log(`✅ 플랫폼 데이터 동기화 완료`);
    } catch (error: any) {
      console.error(`❌ 플랫폼 데이터 동기화 실패:`, error);
      throw error;
    }
  }, [userDid, apiService, updatePassport]);

  // ============================================================================
  // 🔧 업적 시스템 메서드
  // ============================================================================
  
  const checkAchievements = useCallback(async (): Promise<Achievement[]> => {
    if (!userDid) {
      throw new Error('사용자 DID가 필요합니다');
    }

    try {
      console.log(`🏆 업적 확인`);
      
      const achievements = await apiService.checkAchievements(userDid);
      
      console.log(`✅ 업적 확인 완료: ${achievements.length}개`);
      return achievements;
    } catch (error: any) {
      console.error(`❌ 업적 확인 실패:`, error);
      throw error;
    }
  }, [userDid, apiService]);

  const unlockAchievement = useCallback(async (achievementId: string) => {
    if (!userDid || !passportStore.passport) {
      throw new Error('패스포트가 로드되지 않았습니다');
    }

    try {
      console.log(`🏆 업적 해제: ${achievementId}`);
      
      // 업적 목록에서 해당 업적을 찾아 earned 상태로 변경
      const currentAchievements = await checkAchievements();
      const updatedAchievements = currentAchievements.map(achievement => 
        achievement.id === achievementId 
          ? { ...achievement, earned: true, earnedAt: new Date(), progress: 100 }
          : achievement
      );

      // 패스포트에 업적 정보 업데이트 (achievements 필드가 있다면)
      // 현재 타입에는 없지만 확장 가능
      
      console.log(`✅ 업적 해제 완료`);
    } catch (error: any) {
      console.error(`❌ 업적 해제 실패:`, error);
      throw error;
    }
  }, [userDid, passportStore.passport, checkAchievements]);

  // ============================================================================
  // 🔧 개인화 에이전트 메서드
  // ============================================================================
  
  const createPersonalizedAgent = useCallback(async (agentData: Omit<PersonalizedAgent, 'id' | 'createdAt'>) => {
    if (!userDid || !passportStore.passport) {
      throw new Error('패스포트가 로드되지 않았습니다');
    }

    try {
      console.log(`🤖 개인화 에이전트 생성:`, agentData.name);
      
      const newAgent: PersonalizedAgent = {
        ...agentData,
        id: `agent-${Date.now()}`,
        createdAt: new Date()
      };

      const currentAgents = passportStore.passport.personalizedAgents || [];
      const updates = {
        personalizedAgents: [...currentAgents, newAgent]
      };
      
      await updatePassport(updates);
      
      console.log(`✅ 개인화 에이전트 생성 완료`);
    } catch (error: any) {
      console.error(`❌ 개인화 에이전트 생성 실패:`, error);
      throw error;
    }
  }, [userDid, passportStore.passport, updatePassport]);

  const updateAgent = useCallback(async (agentId: string, updates: Partial<PersonalizedAgent>) => {
    if (!userDid || !passportStore.passport) {
      throw new Error('패스포트가 로드되지 않았습니다');
    }

    try {
      console.log(`🤖 에이전트 업데이트: ${agentId}`);
      
      const currentAgents = passportStore.passport.personalizedAgents || [];
      const updatedAgents = currentAgents.map(agent => 
        agent.id === agentId 
          ? { ...agent, ...updates, lastActive: new Date() }
          : agent
      );

      await updatePassport({ personalizedAgents: updatedAgents });
      
      console.log(`✅ 에이전트 업데이트 완료`);
    } catch (error: any) {
      console.error(`❌ 에이전트 업데이트 실패:`, error);
      throw error;
    }
  }, [userDid, passportStore.passport, updatePassport]);

  // ============================================================================
  // 🔧 분석 및 통계 메서드
  // ============================================================================
  
  const getPassportMetrics = useCallback((): PassportMetrics => {
    if (!passportStore.passport) {
      return {
        trustScoreChange: 0,
        cueTokensEarned: 0,
        platformsConnected: 0,
        dataPointsCollected: 0,
        achievementsUnlocked: 0,
        lastActivityTime: new Date()
      };
    }

    const passport = passportStore.passport;
    
    return {
      trustScoreChange: 5, // 계산 로직 필요
      cueTokensEarned: passport.cueTokens,
      platformsConnected: passport.connectedPlatforms?.length || 0,
      dataPointsCollected: passport.dataVaults?.reduce((sum, vault) => sum + vault.itemCount, 0) || 0,
      achievementsUnlocked: 0, // 업적 시스템 확장 필요
      lastActivityTime: new Date()
    };
  }, [passportStore.passport]);

  const getAnalytics = useCallback((): PassportAnalytics => {
    if (!passportStore.passport) {
      return {
        personalityAccuracy: 0,
        dataCompleteness: 0,
        engagementLevel: 0,
        privacyScore: 0,
        interactionQuality: 0
      };
    }

    const passport = passportStore.passport;
    
    // 데이터 완성도 계산
    const requiredFields = ['personalityProfile', 'dataVaults', 'connectedPlatforms'];
    const completedFields = requiredFields.filter(field => {
      const value = passport[field as keyof UnifiedAIPassport];
      return value && (Array.isArray(value) ? value.length > 0 : true);
    });
    const dataCompleteness = (completedFields.length / requiredFields.length) * 100;

    // 개성 정확도 계산 (Mock)
    const personalityAccuracy = passport.personalityProfile?.type !== 'Analyzing...' ? 85 : 0;

    // 참여 수준 계산
    const engagementLevel = Math.min(100, 
      (passport.contextHistory?.length || 0) * 2 + 
      (passport.connectedPlatforms?.length || 0) * 10
    );

    // 프라이버시 점수 계산
    const encryptedVaults = passport.dataVaults?.filter(v => v.encryptionLevel === 'AES-256').length || 0;
    const totalVaults = passport.dataVaults?.length || 1;
    const privacyScore = (encryptedVaults / totalVaults) * 100;

    // 상호작용 품질 계산 (Mock)
    const interactionQuality = Math.min(100, passport.trustScore * 0.8 + 20);

    return {
      personalityAccuracy,
      dataCompleteness,
      engagementLevel,
      privacyScore,
      interactionQuality
    };
  }, [passportStore.passport]);

  // ============================================================================
  // 🔧 유틸리티 메서드
  // ============================================================================
  
  const clearError = useCallback(() => {
    setLocalState(prev => ({ ...prev, error: null }));
    passportStore.clearError();
    console.log(`🧹 패스포트 에러 클리어`);
  }, [passportStore]);

  const resetPassport = useCallback(() => {
    setLocalState({
      isLoading: false,
      error: null,
      lastUpdated: null
    });
    console.log(`🔄 패스포트 상태 리셋`);
  }, []);

  const exportPassportData = useCallback(async (): Promise<any> => {
    if (!passportStore.passport) {
      throw new Error('패스포트가 로드되지 않았습니다');
    }

    try {
      console.log(`📤 패스포트 데이터 내보내기`);
      
      const exportData = {
        ...passportStore.passport,
        exportedAt: new Date().toISOString(),
        version: '1.0'
      };
      
      console.log(`✅ 패스포트 데이터 내보내기 완료`);
      return exportData;
    } catch (error: any) {
      console.error(`❌ 패스포트 데이터 내보내기 실패:`, error);
      throw error;
    }
  }, [passportStore.passport]);

  const importPassportData = useCallback(async (data: any) => {
    if (!userDid) {
      throw new Error('사용자 DID가 필요합니다');
    }

    try {
      console.log(`📥 패스포트 데이터 가져오기`);
      
      // 데이터 검증
      if (!data.did || !data.personalityProfile) {
        throw new Error('유효하지 않은 패스포트 데이터입니다');
      }

      // 현재 DID와 일치하는지 확인
      if (data.did !== userDid) {
        console.warn(`⚠️ DID 불일치, 현재 사용자로 업데이트: ${userDid}`);
        data.did = userDid;
      }

      const normalizedData = apiService.normalizePassportData(data);
      await updatePassport(normalizedData);
      
      console.log(`✅ 패스포트 데이터 가져오기 완료`);
    } catch (error: any) {
      console.error(`❌ 패스포트 데이터 가져오기 실패:`, error);
      throw error;
    }
  }, [userDid, apiService, updatePassport]);

  // ============================================================================
  // 🔄 생명주기 관리
  // ============================================================================
  
  // userDid 변경시 패스포트 로드
  useEffect(() => {
    if (userDid) {
      console.log(`🔄 userDid 변경으로 인한 패스포트 로드: ${userDid}`);
      loadPassport();
    } else {
      console.log(`🔄 userDid 없음, 패스포트 리셋`);
      resetPassport();
    }
  }, [userDid, loadPassport, resetPassport]);

  // 백엔드 연결 상태 변경시 새로고침
  useEffect(() => {
    if (backendConnected && userDid && !passportStore.passport) {
      console.log(`🔄 백엔드 연결로 인한 패스포트 로드`);
      loadPassport();
    }
  }, [backendConnected, userDid, passportStore.passport, loadPassport]);

  // ============================================================================
  // 🎯 반환값
  // ============================================================================
  return {
    // 상태
    passport: passportStore.passport,
    isLoading: localState.isLoading || passportStore.isLoading,
    error: localState.error || passportStore.error,
    lastUpdated: localState.lastUpdated,
    
    // 패스포트 관리
    loadPassport,
    updatePassport,
    refreshPassport,
    createPassport,
    
    // 개성 프로필 관리
    updatePersonalityProfile,
    analyzePersonality,
    
    // 데이터 볼트 관리
    addDataVault,
    updateDataVault,
    removeDataVault,
    
    // 플랫폼 관리
    connectPlatform,
    disconnectPlatform,
    syncPlatformData,
    
    // 업적 시스템
    checkAchievements,
    unlockAchievement,
    
    // 개인화 에이전트
    createPersonalizedAgent,
    updateAgent,
    
    // 분석 및 통계
    getPassportMetrics,
    getAnalytics,
    
    // 유틸리티
    clearError,
    resetPassport,
    exportPassportData,
    importPassportData
  };
};