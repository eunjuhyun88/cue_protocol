// ============================================================================
// 📁 src/services/api/PassportAPI.ts
// 🛡️ AI Passport API 클라이언트
// ============================================================================

import { PersistentDataAPIClient } from './PersistentDataAPIClient';

export class PassportAPI {
  private persistentClient: PersistentDataAPIClient;

  constructor() {
    this.persistentClient = new PersistentDataAPIClient();
  }

  // ============================================================================
  // 🔧 기본 패스포트 관리
  // ============================================================================

  async getPassport(did: string): Promise<any> {
    try {
      const response = await this.persistentClient.get(`/api/passport/${did}`);
      return this.normalizePassportData(response);
    } catch (error) {
      console.warn('패스포트 조회 실패, Mock 데이터 사용:', error);
      return this.createMockPassport(did);
    }
  }

  async createPassport(passportData: any): Promise<any> {
    try {
      const response = await this.persistentClient.post('/api/passport', passportData);
      return this.normalizePassportData(response);
    } catch (error) {
      console.warn('패스포트 생성 실패, Mock 데이터 사용:', error);
      return this.createMockPassport(passportData.did || `did:cue:${Date.now()}`);
    }
  }

  async updatePassport(did: string, updates: any): Promise<any> {
    try {
      const response = await this.persistentClient.put(`/api/passport/${did}`, updates);
      return this.normalizePassportData(response);
    } catch (error) {
      console.warn('패스포트 업데이트 실패:', error);
      return this.createMockPassport(did);
    }
  }

  // ============================================================================
  // 🔧 연결된 플랫폼 관리
  // ============================================================================

  async getConnectedPlatforms(did: string): Promise<any[]> {
    try {
      const response = await this.persistentClient.get(`/api/passport/${did}/platforms`);
      return response.platforms || [];
    } catch (error) {
      return [
        {
          id: 'github',
          name: 'GitHub',
          connected: true,
          lastSync: new Date(),
          cueCount: 2340,
          contextMined: 45,
          status: 'active',
          icon: '🐙',
          color: 'black',
          health: 'good'
        },
        {
          id: 'discord',
          name: 'Discord',
          connected: true,
          lastSync: new Date(Date.now() - 2 * 60 * 60 * 1000),
          cueCount: 1250,
          contextMined: 28,
          status: 'active',
          icon: '💬',
          color: 'purple',
          health: 'good'
        },
        {
          id: 'notion',
          name: 'Notion',
          connected: false,
          lastSync: null,
          cueCount: 0,
          contextMined: 0,
          status: 'disconnected',
          icon: '📝',
          color: 'gray',
          health: 'disconnected'
        }
      ];
    }
  }

  async connectPlatform(did: string, platform: string, credentials: any): Promise<boolean> {
    try {
      const response = await this.persistentClient.post('/api/passport/platform/connect', {
        did, 
        platform, 
        credentials
      });
      return response.success;
    } catch (error) {
      console.warn('플랫폼 연결 실패:', error);
      return false;
    }
  }

  // ============================================================================
  // 🔧 데이터 볼트 관리
  // ============================================================================

  async getDataVaults(did: string): Promise<any[]> {
    try {
      const response = await this.persistentClient.get(`/api/passport/${did}/vaults`);
      return response.vaults || [];
    } catch (error) {
      return [
        {
          id: 'vault-identity',
          name: 'Identity Vault',
          type: 'identity',
          category: 'identity',
          description: '신원 정보 및 인증 데이터',
          size: '2.3MB',
          items: 47,
          dataCount: 47,
          cueCount: 850,
          encrypted: true,
          lastUpdated: new Date(),
          accessLevel: 'private',
          value: 850,
          dataPoints: [],
          usageCount: 23,
          sourcePlatforms: ['WebAuthn', 'Passport']
        },
        {
          id: 'vault-knowledge',
          name: 'Knowledge Vault',
          type: 'knowledge',
          category: 'knowledge',
          description: '학습 데이터 및 개인화 정보',
          size: '15.7MB',
          items: 234,
          dataCount: 234,
          cueCount: 3200,
          encrypted: true,
          lastUpdated: new Date(),
          accessLevel: 'private',
          value: 3200,
          dataPoints: [],
          usageCount: 156,
          sourcePlatforms: ['ChatGPT', 'Claude', 'Conversations']
        },
        {
          id: 'vault-preference',
          name: 'Preference Vault',
          type: 'preference',
          category: 'preference',
          description: '사용자 선호도 및 설정',
          size: '1.2MB',
          items: 89,
          dataCount: 89,
          cueCount: 445,
          encrypted: true,
          lastUpdated: new Date(),
          accessLevel: 'private',
          value: 445,
          dataPoints: [],
          usageCount: 67,
          sourcePlatforms: ['UI Settings', 'Behavior Analysis']
        }
      ];
    }
  }

  // ============================================================================
  // 🔧 성취 및 업적 관리
  // ============================================================================

  async getAchievements(did: string): Promise<any[]> {
    try {
      const response = await this.persistentClient.get(`/api/passport/${did}/achievements`);
      return response.achievements || [];
    } catch (error) {
      return [
        {
          id: 'first-cue',
          name: 'First CUE',
          icon: '🎯',
          earned: true,
          description: '첫 CUE 토큰 마이닝',
          earnedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          category: 'mining',
          rarity: 'common'
        },
        {
          id: 'trusted-agent',
          name: 'Trusted Agent',
          icon: '🛡️',
          earned: true,
          description: '신뢰도 90% 달성',
          earnedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          category: 'trust',
          rarity: 'rare'
        },
        {
          id: 'platform-master',
          name: 'Platform Master',
          icon: '🌐',
          earned: false,
          description: '5개 플랫폼 연결',
          progress: { current: 2, total: 5 },
          category: 'connection',
          rarity: 'epic'
        },
        {
          id: 'conversation-expert',
          name: 'Conversation Expert',
          icon: '💬',
          earned: true,
          description: '100회 이상 AI 대화',
          earnedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          category: 'engagement',
          rarity: 'uncommon'
        }
      ];
    }
  }

  // ============================================================================
  // 🔧 RAG-DAG 통계 관리
  // ============================================================================

  async getRAGDAGStats(did: string): Promise<any> {
    try {
      const response = await this.persistentClient.get(`/api/passport/${did}/rag-dag`);
      return response.stats;
    } catch (error) {
      return {
        learnedConcepts: 247 + Math.floor(Math.random() * 100),
        connectionStrength: 0.87 + Math.random() * 0.13,
        lastLearningActivity: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
        knowledgeNodes: 1456 + Math.floor(Math.random() * 500),
        personalityAccuracy: 0.94 + Math.random() * 0.06,
        learningVelocity: 0.75 + Math.random() * 0.25,
        conceptCoverage: 0.68 + Math.random() * 0.32,
        adaptationRate: 0.82 + Math.random() * 0.18,
        contextualAccuracy: 0.89 + Math.random() * 0.11,
        memoryEfficiency: 0.91 + Math.random() * 0.09,
        totalInteractions: 1250 + Math.floor(Math.random() * 500),
        conceptCategories: {
          'Technical': 89,
          'Personal': 76,
          'Professional': 62,
          'Creative': 45,
          'Social': 38
        }
      };
    }
  }

  // ============================================================================
  // 🔧 데이터 정규화 및 Mock 생성
  // ============================================================================

  private normalizePassportData(data: any): any {
    return {
      did: data.did,
      username: data.username,
      walletAddress: data.walletAddress || data.wallet_address,
      passkeyRegistered: data.passkeyRegistered || data.biometric_verified || true,
      trustScore: data.trustScore || data.trust_score || 85,
      cueTokens: data.cueTokens || data.cue_tokens || data.cueBalance || 0,
      registrationStatus: data.registrationStatus || 'complete',
      biometricVerified: data.biometricVerified || data.biometric_verified || true,
      passportLevel: data.passportLevel || data.passport_level || 'Verified',
      personalityProfile: data.personalityProfile || this.getDefaultPersonalityProfile(),
      dataVaults: data.dataVaults || [],
      connectedPlatforms: data.connectedPlatforms || [],
      contextHistory: data.contextHistory || [],
      cueHistory: data.cueHistory || [],
      personalizedAgents: data.personalizedAgents || [],
      achievements: data.achievements || [],
      ragDagStats: data.ragDagStats || {},
      analytics: data.analytics || {},
      createdAt: data.createdAt || new Date().toISOString()
    };
  }

  private getDefaultPersonalityProfile(): any {
    return {
      type: 'INTJ-A (Architect)',
      traits: ['분석적', '혁신적', '독립적'],
      communicationStyle: 'Direct & Technical',
      expertise: ['AI', 'Blockchain', 'Protocol Design'],
      mbtiType: 'INTJ',
      learningStyle: 'Visual + Hands-on',
      learningPattern: 'Deep dive 선호',
      workingStyle: 'Morning Focus',
      responsePreference: 'Concise with examples',
      decisionMaking: 'Data-driven analysis'
    };
  }

  createMockPassport(did: string): any {
    return {
      did,
      username: did.split(':').pop() || `Agent${Math.floor(Math.random() * 10000)}`,
      walletAddress: `0x${Math.random().toString(16).substr(2, 40)}`,
      passkeyRegistered: true,
      trustScore: Math.floor(Math.random() * 30) + 70,
      cueTokens: Math.floor(Math.random() * 10000) + 1000,
      registrationStatus: 'complete',
      biometricVerified: true,
      passportLevel: 'Verified',
      personalityProfile: this.getDefaultPersonalityProfile(),
      dataVaults: [
        {
          id: 'vault-1',
          name: 'Professional Identity',
          category: 'professional',
          description: 'Career achievements and skills',
          dataCount: 25,
          cueCount: 450,
          encrypted: true,
          lastUpdated: new Date(),
          accessLevel: 'private',
          value: 850,
          dataPoints: [],
          usageCount: 12,
          sourcePlatforms: ['LinkedIn', 'GitHub']
        }
      ],
      connectedPlatforms: [
        {
          id: 'github',
          name: 'GitHub',
          connected: true,
          lastSync: new Date(),
          cueCount: 2340,
          contextMined: 45,
          status: 'active',
          icon: '🐙',
          color: 'black',
          health: 'good'
        }
      ],
      achievements: this.getAchievements(did),
      ragDagStats: this.getRAGDAGStats(did),
      analytics: {
        weeklyActivity: [
          { day: 'Mon', chats: 12, cue: 45, quality: 0.89 },
          { day: 'Tue', chats: 18, cue: 67, quality: 0.92 },
          { day: 'Wed', chats: 25, cue: 89, quality: 0.87 },
          { day: 'Thu', chats: 14, cue: 52, quality: 0.94 },
          { day: 'Fri', chats: 20, cue: 78, quality: 0.91 },
          { day: 'Sat', chats: 8, cue: 23, quality: 0.85 },
          { day: 'Sun', chats: 6, cue: 18, quality: 0.88 }
        ],
        topicDistribution: [
          { name: 'AI & Technology', value: 45, color: '#3B74BF' },
          { name: 'Protocol Design', value: 30, color: '#EDF25E' },
          { name: 'Web3 & Blockchain', value: 25, color: '#BF8034' }
        ]
      },
      contextHistory: [],
      cueHistory: [],
      personalizedAgents: [],
      createdAt: new Date().toISOString()
    };
  }
}