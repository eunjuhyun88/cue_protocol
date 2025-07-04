// ============================================================================
// 📁 frontend/src/hooks/usePassport.ts (완전히 개선된 버전)
// 🎯 AI 패스포트 데이터 관리 훅 - 실제 로딩 로직 구현
// ============================================================================
// 이 훅은 AI 패스포트 데이터의 로딩, 업데이트, 캐싱을 관리합니다.
// 백엔드 연결 상태에 따라 실제 API 또는 Mock 데이터를 사용합니다.
// 에러 발생시 안전한 폴백 메커니즘을 제공합니다.
// ============================================================================

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { PassportAPI } from '../services/api/PassportAPI';
import { createLogger } from '../lib/logger';
import type { UnifiedAIPassport } from '../types/passport.types';

const logger = createLogger('usePassport');

interface UsePassportState {
  passport: UnifiedAIPassport | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

interface UsePassportReturn extends UsePassportState {
  loadPassport: () => Promise<void>;
  updatePassport: (updates: Partial<UnifiedAIPassport>) => Promise<void>;
  refreshPassport: () => Promise<void>;
  clearError: () => void;
  resetPassport: () => void;
}

export const usePassport = (
  userDid?: string,
  backendConnected: boolean = false
): UsePassportReturn => {
  const [state, setState] = useState<UsePassportState>({
    passport: null,
    loading: false,
    error: null,
    lastUpdated: null
  });

  const api = useRef(new PassportAPI()).current;
  const loadingRef = useRef(false); // 중복 로딩 방지

  // ============================================================================
  // 🔧 패스포트 로딩 (실제 구현)
  // ============================================================================
  const loadPassport = useCallback(async () => {
    if (!userDid) {
      logger.warn('userDid가 제공되지 않았습니다');
      return;
    }

    if (loadingRef.current) {
      logger.info('이미 로딩 중입니다');
      return;
    }

    loadingRef.current = true;
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      logger.info('패스포트 로딩 시작', { userDid, backendConnected });

      let passport: UnifiedAIPassport;

      if (backendConnected) {
        logger.info('실제 백엔드에서 패스포트 로드');
        
        try {
          // 실제 API 호출
          passport = await api.getPassport(userDid);
          logger.success('백엔드 패스포트 로드 완료', {
            did: passport.did,
            level: passport.passportLevel,
            trustScore: passport.trustScore
          });
        } catch (apiError: any) {
          logger.warn('백엔드 패스포트 로드 실패, Mock으로 폴백', apiError.message);
          
          // API 실패시 Mock 데이터 사용
          passport = api.createMockPassport(userDid);
          passport.did = userDid; // DID 일치시키기
        }
      } else {
        logger.info('Mock 패스포트 데이터 생성');
        
        // Mock 지연 시뮬레이션 (실제 API 호출과 유사한 경험)
        await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200));
        
        passport = api.createMockPassport(userDid);
        passport.did = userDid;
      }

      // 데이터 정규화 및 검증
      const normalizedPassport = normalizePassportData(passport);

      setState(prev => ({
        ...prev,
        passport: normalizedPassport,
        loading: false,
        error: null,
        lastUpdated: new Date()
      }));

      logger.success('패스포트 로딩 완료', {
        did: normalizedPassport.did,
        level: normalizedPassport.passportLevel,
        trustScore: normalizedPassport.trustScore,
        dataVaults: normalizedPassport.dataVaults?.length || 0,
        connectedPlatforms: normalizedPassport.connectedPlatforms?.length || 0
      });

    } catch (error: any) {
      const errorMessage = error.message || '패스포트를 불러오는데 실패했습니다.';
      
      logger.error('패스포트 로딩 실패', error);
      
      setState(prev => ({
        ...prev,
        passport: null,
        loading: false,
        error: errorMessage,
        lastUpdated: null
      }));

      // 최종 폴백: 기본 Mock 패스포트 생성
      try {
        logger.info('최종 폴백으로 기본 패스포트 생성');
        const fallbackPassport = createFallbackPassport(userDid || 'fallback-did');
        
        setState(prev => ({
          ...prev,
          passport: fallbackPassport,
          error: `${errorMessage} (기본 패스포트로 대체됨)`
        }));
      } catch (fallbackError) {
        logger.error('기본 패스포트 생성 실패', fallbackError);
      }
    } finally {
      loadingRef.current = false;
    }
  }, [userDid, backendConnected, api]);

  // ============================================================================
  // 🔧 패스포트 업데이트 (실제 구현)
  // ============================================================================
  const updatePassport = useCallback(async (updates: Partial<UnifiedAIPassport>) => {
    if (!userDid || !state.passport) {
      logger.warn('패스포트 업데이트 불가', { userDid: !!userDid, passport: !!state.passport });
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      logger.info('패스포트 업데이트 시작', { userDid, updates });

      let updatedPassport: UnifiedAIPassport;

      if (backendConnected) {
        logger.info('실제 백엔드에서 패스포트 업데이트');
        
        try {
          // 실제 API 호출
          updatedPassport = await api.updatePassport(userDid, updates);
          logger.success('백엔드 패스포트 업데이트 완료');
        } catch (apiError: any) {
          logger.warn('백엔드 업데이트 실패, 로컬 업데이트로 폴백', apiError.message);
          
          // API 실패시 로컬 업데이트
          updatedPassport = { ...state.passport, ...updates };
        }
      } else {
        logger.info('Mock 패스포트 업데이트');
        
        // Mock 업데이트 지연 시뮬레이션
        await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
        
        updatedPassport = { ...state.passport, ...updates };
      }

      // 업데이트된 데이터 정규화
      const normalizedPassport = normalizePassportData(updatedPassport);

      setState(prev => ({
        ...prev,
        passport: normalizedPassport,
        loading: false,
        error: null,
        lastUpdated: new Date()
      }));

      logger.success('패스포트 업데이트 완료', {
        updatedFields: Object.keys(updates),
        newTrustScore: normalizedPassport.trustScore
      });

    } catch (error: any) {
      const errorMessage = error.message || '패스포트 업데이트에 실패했습니다.';
      
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));

      logger.error('패스포트 업데이트 실패', error);
      throw new Error(errorMessage);
    }
  }, [userDid, backendConnected, state.passport, api]);

  // ============================================================================
  // 🔧 편의 메서드들
  // ============================================================================
  const refreshPassport = useCallback(async () => {
    logger.info('패스포트 새로고침');
    await loadPassport();
  }, [loadPassport]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
    logger.info('패스포트 에러 클리어');
  }, []);

  const resetPassport = useCallback(() => {
    setState({
      passport: null,
      loading: false,
      error: null,
      lastUpdated: null
    });
    logger.info('패스포트 상태 리셋');
  }, []);

  // ============================================================================
  // 🔧 자동 로딩 및 생명주기
  // ============================================================================
  
  // userDid 변경시 자동 로드
  useEffect(() => {
    if (userDid) {
      logger.info('userDid 변경으로 인한 자동 로드', userDid);
      loadPassport();
    } else {
      logger.info('userDid가 없어 패스포트 리셋');
      resetPassport();
    }
  }, [userDid, loadPassport, resetPassport]);

  // 백엔드 연결 상태 변경시 필요한 경우 다시 로드
  useEffect(() => {
    if (backendConnected && userDid && !state.passport) {
      logger.info('백엔드 연결로 인한 자동 로드');
      loadPassport();
    }
  }, [backendConnected, userDid, state.passport, loadPassport]);

  return {
    ...state,
    loadPassport,
    updatePassport,
    refreshPassport,
    clearError,
    resetPassport
  };
};

// ============================================================================
// 🛡️ 데이터 정규화 및 안전성 보장 함수들
// ============================================================================

/**
 * 패스포트 데이터를 안전하게 정규화합니다
 */
function normalizePassportData(passport: UnifiedAIPassport): UnifiedAIPassport {
  return {
    did: passport.did || 'unknown-did',
    walletAddress: passport.walletAddress || '0x...',
    passkeyRegistered: Boolean(passport.passkeyRegistered),
    trustScore: Math.max(0, Math.min(100, passport.trustScore || 0)),
    cueTokens: Math.max(0, passport.cueTokens || 0),
    registrationStatus: passport.registrationStatus || 'pending',
    biometricVerified: Boolean(passport.biometricVerified),
    passportLevel: passport.passportLevel || 'Basic',
    
    personalityProfile: {
      type: passport.personalityProfile?.type || 'Analyzing...',
      communicationStyle: passport.personalityProfile?.communicationStyle || 'Adaptive',
      learningPattern: passport.personalityProfile?.learningPattern || 'Visual',
      workingStyle: passport.personalityProfile?.workingStyle || 'Flexible',
      responsePreference: passport.personalityProfile?.responsePreference || 'Balanced',
      decisionMaking: passport.personalityProfile?.decisionMaking || 'Analytical'
    },
    
    dataVaults: Array.isArray(passport.dataVaults) ? passport.dataVaults : [],
    connectedPlatforms: Array.isArray(passport.connectedPlatforms) ? passport.connectedPlatforms : [],
    contextHistory: Array.isArray(passport.contextHistory) ? passport.contextHistory : [],
    cueHistory: Array.isArray(passport.cueHistory) ? passport.cueHistory : [],
    personalizedAgents: Array.isArray(passport.personalizedAgents) ? passport.personalizedAgents : []
  };
}

/**
 * 최종 폴백용 기본 패스포트를 생성합니다
 */
function createFallbackPassport(userDid: string): UnifiedAIPassport {
  return {
    did: userDid,
    walletAddress: '0x0000000000000000000000000000000000000000',
    passkeyRegistered: false,
    trustScore: 50,
    cueTokens: 0,
    registrationStatus: 'pending',
    biometricVerified: false,
    passportLevel: 'Basic',
    
    personalityProfile: {
      type: 'New User',
      communicationStyle: 'Learning',
      learningPattern: 'Adaptive',
      workingStyle: 'Exploring',
      responsePreference: 'Helpful',
      decisionMaking: 'Collaborative'
    },
    
    dataVaults: [],
    connectedPlatforms: [],
    contextHistory: [],
    cueHistory: [],
    personalizedAgents: []
  };
}

export default usePassport;