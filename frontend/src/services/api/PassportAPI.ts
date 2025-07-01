// ============================================================================
// 📁 src/services/api/PassportAPI.ts
// 🎫 AI Passport API 서비스
// ============================================================================

import { BackendAPIClient } from './BackendAPIClient';
import type { UnifiedAIPassport } from '../../types/passport.types';

export class PassportAPI extends BackendAPIClient {
  /**
   * 패스포트 조회
   */
  async getPassport(did: string): Promise<UnifiedAIPassport> {
    try {
      return await this.get(`/api/passport/${did}`);
    } catch (error) {
      console.error('패스포트 조회 실패:', error);
      throw error;
    }
  }

  /**
   * 패스포트 업데이트
   */
  async updatePassport(did: string, updates: Partial<UnifiedAIPassport>): Promise<UnifiedAIPassport> {
    try {
      return await this.put(`/api/passport/${did}`, updates);
    } catch (error) {
      console.error('패스포트 업데이트 실패:', error);
      throw error;
    }
  }

  /**
   * 패스포트 생성
   */
  async createPassport(passportData: Partial<UnifiedAIPassport>): Promise<UnifiedAIPassport> {
    try {
      return await this.post('/api/passport', passportData);
    } catch (error) {
      console.error('패스포트 생성 실패:', error);
      throw error;
    }
  }

  /**
   * Mock 패스포트 데이터 생성
   */
  createMockPassport(did: string): UnifiedAIPassport {
    return {
      did,
      walletAddress: `0x${Math.random().toString(16).substr(2, 40)}`,
      passkeyRegistered: true,
      trustScore: Math.floor(Math.random() * 30) + 70, // 70-100
      cueTokens: Math.floor(Math.random() * 10000) + 1000,
      registrationStatus: 'complete',
      biometricVerified: true,
      passportLevel: 'Verified',
      personalityProfile: {
        type: 'INTJ-A (Architect)',
        communicationStyle: 'Direct & Technical',
        learningPattern: 'Visual + Hands-on',
        workingStyle: 'Morning Focus',
        responsePreference: 'Concise with examples',
        decisionMaking: 'Data-driven analysis'
      },
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
          color: 'black'
        }
      ],
      contextHistory: [],
      cueHistory: [],
      personalizedAgents: []
    };
  }
}