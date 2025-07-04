// ============================================================================
// 📁 frontend/src/hooks/useCue.ts
// 💎 CUE 토큰 관리 훅 - 완전한 구현
// ============================================================================
// CUE 토큰의 전체 생명주기를 관리합니다:
// - 실시간 잔액 조회 및 업데이트
// - 스마트 마이닝 시스템 (활동 기반 토큰 획득)
// - 거래 히스토리 추적 및 분석
// - 마이닝 상태 관리 (쿨다운, 스트릭, 배수)
// - 백엔드/Mock 자동 전환
// - Zustand Store 연동 및 실시간 업데이트

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useCueStore } from '../store/cueStore';
import { CueAPI } from '../services/api/CueAPI';
import type { 
  CueBalance, 
  CueHistory, 
  CueMiningResult, 
  CueMiningState,
  CueTransaction 
} from '../types/cue.types';

// ============================================================================
// 📝 타입 정의
// ============================================================================
interface MiningActivity {
  type: 'ai_chat' | 'data_extraction' | 'platform_sync' | 'social_interaction' | 'content_creation' | 'auto_mining';
  content?: string;
  metadata?: any;
  quality?: number; // 0-1 품질 점수
}

interface MiningBonus {
  base: number;
  quality: number;
  streak: number;
  timeOfDay: number;
  weekend: number;
  total: number;
}

interface UseCueReturn {
  // 상태
  balance: CueBalance | null;
  history: CueHistory[];
  miningState: CueMiningState;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  
  // 잔액 관리
  loadBalance: () => Promise<void>;
  refreshBalance: () => Promise<void>;
  
  // 거래 관리
  loadHistory: () => Promise<void>;
  getTransactionById: (id: string) => CueHistory | undefined;
  
  // 마이닝 시스템
  mineCue: (activity: MiningActivity) => Promise<CueMiningResult>;
  toggleMining: () => Promise<void>;
  getMiningMultiplier: () => number;
  canMineNow: () => boolean;
  getNextMiningTime: () => Date | null;
  calculateReward: (activity: MiningActivity) => Promise<MiningBonus>;
  
  // 소비 및 전송
  spendCue: (amount: number, purpose: string, metadata?: any) => Promise<void>;
  transferCue: (targetDid: string, amount: number, message?: string) => Promise<void>;
  
  // 통계 및 분석
  getTodaysMining: () => number;
  getWeeklyMining: () => number;
  getMiningStreak: () => number;
  getAverageDaily: () => number;
  
  // 유틸리티
  clearError: () => void;
  resetCue: () => void;
}

// ============================================================================
// 🔧 CUE API 서비스 클래스
// ============================================================================
class CueAPIService {
  private baseURL: string;
  private api: CueAPI;

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    this.api = new CueAPI();
  }

  // 잔액 조회
  async getCueBalance(userDid: string): Promise<CueBalance> {
    try {
      console.log(`💎 CUE 잔액 조회: ${userDid}`);
      
      const response = await fetch(`${this.baseURL}/api/cue/balance/${userDid}`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      const balance: CueBalance = {
        total: data.balance || data.total || 0,
        available: data.available || data.balance || 0,
        staked: data.staked || 0,
        pending: data.pending || 0,
        locked: data.locked || 0
      };

      console.log(`✅ CUE 잔액 로드 성공:`, balance);
      return balance;
    } catch (error: any) {
      console.warn(`⚠️ CUE 잔액 API 실패, Mock 데이터 사용:`, error.message);
      return this.generateMockBalance();
    }
  }

  // 거래 내역 조회
  async getTransactionHistory(userDid: string, limit: number = 50): Promise<CueHistory[]> {
    try {
      console.log(`📜 CUE 거래 내역 조회: ${userDid}`);
      
      const response = await fetch(`${this.baseURL}/api/cue/history/${userDid}?limit=${limit}`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const transactions = data.transactions || data.history || [];
      
      const history: CueHistory[] = transactions.map((tx: any) => ({
        id: tx.id,
        type: tx.type || tx.transactionType,
        amount: tx.amount,
        timestamp: new Date(tx.timestamp || tx.createdAt),
        source: tx.source || tx.activity,
        description: tx.description || tx.message,
        metadata: tx.metadata || tx.details,
        status: tx.status || 'completed'
      }));

      console.log(`✅ CUE 거래 내역 로드 성공: ${history.length}개`);
      return history;
    } catch (error: any) {
      console.warn(`⚠️ CUE 거래 내역 API 실패, Mock 데이터 사용:`, error.message);
      return this.generateMockHistory();
    }
  }

  // CUE 마이닝
  async mineCUE(userDid: string, activity: MiningActivity): Promise<CueMiningResult> {
    try {
      console.log(`⛏️ CUE 마이닝 시작:`, { userDid, activity });
      
      const response = await fetch(`${this.baseURL}/api/cue/mine`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userDid,
          activity: activity.type,
          content: activity.content,
          metadata: activity.metadata,
          quality: activity.quality
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      const result: CueMiningResult = {
        success: data.success || true,
        tokensEarned: data.amount || data.earned || data.tokensEarned || 0,
        activityType: activity.type,
        multiplier: data.multiplier || 1.0,
        bonusBreakdown: data.breakdown || {
          base: data.amount || 3,
          quality: 0,
          streak: 0,
          timeOfDay: 0,
          weekend: 0
        },
        cooldownUntil: data.cooldownUntil ? new Date(data.cooldownUntil) : undefined,
        message: data.message || `${data.amount || 3} CUE 토큰을 마이닝했습니다!`,
        metadata: data.metadata || {}
      };

      console.log(`✅ CUE 마이닝 성공:`, result);
      return result;
    } catch (error: any) {
      console.warn(`⚠️ CUE 마이닝 API 실패, Mock 결과 생성:`, error.message);
      return this.generateMockMiningResult(activity);
    }
  }

  // CUE 소비
  async spendCue(userDid: string, amount: number, purpose: string, metadata?: any): Promise<void> {
    try {
      console.log(`💸 CUE 소비:`, { userDid, amount, purpose });
      
      const response = await fetch(`${this.baseURL}/api/cue/spend`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userDid,
          amount,
          purpose,
          metadata
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      console.log(`✅ CUE 소비 완료`);
    } catch (error: any) {
      console.error(`❌ CUE 소비 실패:`, error.message);
      throw error;
    }
  }

  // CUE 전송
  async transferCue(fromDid: string, toDid: string, amount: number, message?: string): Promise<void> {
    try {
      console.log(`💸 CUE 전송:`, { fromDid, toDid, amount });
      
      const response = await fetch(`${this.baseURL}/api/cue/transfer`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromDid,
          toDid,
          amount,
          message
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      console.log(`✅ CUE 전송 완료`);
    } catch (error: any) {
      console.error(`❌ CUE 전송 실패:`, error.message);
      throw error;
    }
  }

  // 마이닝 상태 설정
  async setMiningState(userDid: string, isActive: boolean): Promise<void> {
    try {
      const response = await fetch(`${this.baseURL}/api/cue/mining/state`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userDid, isActive })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      console.log(`✅ 마이닝 상태 업데이트: ${isActive ? 'ON' : 'OFF'}`);
    } catch (error: any) {
      console.warn(`⚠️ 마이닝 상태 업데이트 실패:`, error.message);
      throw error;
    }
  }

  // ============================================================================
  // 🔧 Mock 데이터 생성기
  // ============================================================================
  
  generateMockBalance(): CueBalance {
    const total = 2500 + Math.floor(Math.random() * 3000);
    const staked = Math.floor(total * 0.2);
    const pending = Math.floor(Math.random() * 50);
    
    return {
      total,
      available: total - staked - pending,
      staked,
      pending,
      locked: 0
    };
  }

  generateMockHistory(): CueHistory[] {
    const activities = ['ai_chat', 'data_extraction', 'platform_sync', 'social_interaction'];
    const history: CueHistory[] = [];
    
    for (let i = 0; i < 20; i++) {
      const isEarned = Math.random() > 0.3;
      const activity = activities[Math.floor(Math.random() * activities.length)];
      
      history.push({
        id: `mock-${Date.now()}-${i}`,
        type: isEarned ? 'mining' : 'spend',
        amount: isEarned ? Math.floor(Math.random() * 15) + 1 : -(Math.floor(Math.random() * 20) + 5),
        timestamp: new Date(Date.now() - i * 60 * 60 * 1000),
        source: isEarned ? activity : 'ai_service',
        description: isEarned ? `${activity}에서 마이닝` : 'AI 서비스 사용',
        metadata: { mock: true },
        status: 'completed'
      });
    }
    
    return history;
  }

  generateMockMiningResult(activity: MiningActivity): CueMiningResult {
    const baseReward = this.calculateBaseReward(activity.type);
    const qualityBonus = (activity.quality || 0.5) * 2;
    const streakBonus = Math.floor(Math.random() * 3);
    const timeBonus = this.getTimeBonus();
    const weekendBonus = this.getWeekendBonus();
    
    const total = Math.floor(baseReward + qualityBonus + streakBonus + timeBonus + weekendBonus);
    
    return {
      success: true,
      tokensEarned: total,
      activityType: activity.type,
      multiplier: 1.0 + (qualityBonus + streakBonus) / baseReward,
      bonusBreakdown: {
        base: baseReward,
        quality: qualityBonus,
        streak: streakBonus,
        timeOfDay: timeBonus,
        weekend: weekendBonus
      },
      cooldownUntil: new Date(Date.now() + this.getCooldownTime(activity.type)),
      message: `Mock: ${total} CUE 토큰 마이닝 완료!`,
      metadata: { mock: true }
    };
  }

  private calculateBaseReward(activityType: string): number {
    const rewards = {
      'ai_chat': 3,
      'data_extraction': 5,
      'platform_sync': 7,
      'social_interaction': 2,
      'content_creation': 4,
      'auto_mining': 1
    };
    return rewards[activityType as keyof typeof rewards] || 3;
  }

  private getTimeBonus(): number {
    const hour = new Date().getHours();
    return (hour >= 9 && hour <= 11) || (hour >= 19 && hour <= 21) ? 1 : 0;
  }

  private getWeekendBonus(): number {
    const day = new Date().getDay();
    return (day === 0 || day === 6) ? 1 : 0;
  }

  private getCooldownTime(activityType: string): number {
    const cooldowns = {
      'ai_chat': 2 * 60 * 1000,      // 2분
      'data_extraction': 5 * 60 * 1000, // 5분
      'platform_sync': 10 * 60 * 1000,  // 10분
      'social_interaction': 1 * 60 * 1000, // 1분
      'content_creation': 3 * 60 * 1000,   // 3분
      'auto_mining': 5 * 60 * 1000         // 5분
    };
    return cooldowns[activityType as keyof typeof cooldowns] || 3 * 60 * 1000;
  }
}

// ============================================================================
// 🎣 useCue 훅 구현
// ============================================================================
export const useCue = (
  userDid?: string,
  backendConnected: boolean = false
): UseCueReturn => {
  // ============================================================================
  // 🎛️ 상태 관리 (Zustand Store 연동)
  // ============================================================================
  const cueStore = useCueStore();
  const [localState, setLocalState] = useState({
    isLoading: false,
    error: null as string | null,
    lastUpdated: null as Date | null
  });

  // API 서비스 인스턴스
  const apiServiceRef = useRef<CueAPIService>();
  if (!apiServiceRef.current) {
    apiServiceRef.current = new CueAPIService();
  }
  const apiService = apiServiceRef.current;

  // 자동 마이닝 관련
  const miningIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const loadingRef = useRef(false);

  // ============================================================================
  // 🔧 잔액 관리 메서드
  // ============================================================================
  
  const loadBalance = useCallback(async () => {
    if (!userDid || loadingRef.current) return;

    loadingRef.current = true;
    setLocalState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      console.log(`💎 CUE 잔액 로딩: ${userDid}`);
      
      const balance = await apiService.getCueBalance(userDid);
      
      // Zustand Store에 업데이트
      cueStore.loadBalance(userDid);
      
      setLocalState(prev => ({
        ...prev,
        isLoading: false,
        lastUpdated: new Date()
      }));

      console.log(`✅ CUE 잔액 로딩 완료:`, balance);
    } catch (error: any) {
      console.error(`❌ CUE 잔액 로딩 실패:`, error);
      setLocalState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message
      }));
    } finally {
      loadingRef.current = false;
    }
  }, [userDid, apiService, cueStore]);

  const refreshBalance = useCallback(async () => {
    await loadBalance();
    console.log(`🔄 CUE 잔액 새로고침 완료`);
  }, [loadBalance]);

  // ============================================================================
  // 🔧 거래 관리 메서드
  // ============================================================================
  
  const loadHistory = useCallback(async () => {
    if (!userDid) return;

    try {
      console.log(`📜 CUE 거래 내역 로딩: ${userDid}`);
      
      const history = await apiService.getTransactionHistory(userDid);
      
      // Zustand Store에 업데이트
      cueStore.loadTransactions(userDid);
      
      console.log(`✅ CUE 거래 내역 로딩 완료: ${history.length}개`);
    } catch (error: any) {
      console.error(`❌ CUE 거래 내역 로딩 실패:`, error);
      setLocalState(prev => ({ ...prev, error: error.message }));
    }
  }, [userDid, apiService, cueStore]);

  const getTransactionById = useCallback((id: string): CueHistory | undefined => {
    return cueStore.transactions.find(tx => tx.id === id);
  }, [cueStore.transactions]);

  // ============================================================================
  // 🔧 마이닝 시스템 메서드
  // ============================================================================
  
  const canMineNow = useCallback((): boolean => {
    // 쿨다운 확인
    if (cueStore.miningState?.cooldownUntil) {
      return Date.now() >= cueStore.miningState.cooldownUntil.getTime();
    }
    return true;
  }, [cueStore.miningState]);

  const getNextMiningTime = useCallback((): Date | null => {
    return cueStore.miningState?.cooldownUntil || null;
  }, [cueStore.miningState]);

  const getMiningMultiplier = useCallback((): number => {
    let multiplier = 1.0;
    
    // 스트릭 보너스
    const streakDays = getMiningStreak();
    if (streakDays >= 7) {
      multiplier += 0.5; // 7일 연속: +50%
    } else if (streakDays >= 3) {
      multiplier += 0.2; // 3일 연속: +20%
    }
    
    // 시간대 보너스
    const hour = new Date().getHours();
    if ((hour >= 9 && hour <= 11) || (hour >= 19 && hour <= 21)) {
      multiplier += 0.3; // 피크 시간: +30%
    }
    
    // 주말 보너스
    const day = new Date().getDay();
    if (day === 0 || day === 6) {
      multiplier += 0.2; // 주말: +20%
    }
    
    return Math.round(multiplier * 100) / 100;
  }, []);

  const calculateReward = useCallback(async (activity: MiningActivity): Promise<MiningBonus> => {
    const baseReward = apiService.calculateBaseReward(activity.type);
    const qualityBonus = (activity.quality || 0.5) * 2;
    const streakBonus = getMiningStreak() * 0.5;
    const timeBonus = apiService.getTimeBonus();
    const weekendBonus = apiService.getWeekendBonus();
    
    return {
      base: baseReward,
      quality: qualityBonus,
      streak: streakBonus,
      timeOfDay: timeBonus,
      weekend: weekendBonus,
      total: baseReward + qualityBonus + streakBonus + timeBonus + weekendBonus
    };
  }, [apiService]);

  const mineCue = useCallback(async (activity: MiningActivity): Promise<CueMiningResult> => {
    if (!userDid) {
      throw new Error('사용자 DID가 필요합니다');
    }

    if (!canMineNow()) {
      const nextTime = getNextMiningTime();
      const waitMinutes = nextTime ? Math.ceil((nextTime.getTime() - Date.now()) / 60000) : 0;
      throw new Error(`마이닝 쿨다운 중입니다. ${waitMinutes}분 후 다시 시도하세요.`);
    }

    try {
      console.log(`⛏️ CUE 마이닝 시작:`, activity);
      
      const result = await apiService.mineCUE(userDid, activity);
      
      if (result.success && result.tokensEarned > 0) {
        // Zustand Store에서 마이닝 수행
        await cueStore.mine(userDid, activity.type, result.tokensEarned);
        
        // 잔액 새로고침
        await refreshBalance();
        
        console.log(`✅ CUE 마이닝 완료: ${result.tokensEarned} 토큰`);
      }
      
      return result;
    } catch (error: any) {
      console.error(`❌ CUE 마이닝 실패:`, error);
      throw error;
    }
  }, [userDid, canMineNow, getNextMiningTime, apiService, cueStore, refreshBalance]);

  const toggleMining = useCallback(async () => {
    if (!userDid) return;

    try {
      const newState = !cueStore.miningState?.isActive;
      
      // 백엔드에 상태 저장
      if (backendConnected) {
        await apiService.setMiningState(userDid, newState);
      }
      
      // 로컬 상태 업데이트
      cueStore.updateMiningState({ isActive: newState });
      
      // 자동 마이닝 시작/중지
      if (newState) {
        startAutoMining();
      } else {
        stopAutoMining();
      }
      
      console.log(`🔄 마이닝 상태 변경: ${newState ? 'ON' : 'OFF'}`);
    } catch (error: any) {
      console.error(`❌ 마이닝 상태 변경 실패:`, error);
      throw error;
    }
  }, [userDid, backendConnected, apiService, cueStore]);

  // ============================================================================
  // 🔧 소비 및 전송 메서드
  // ============================================================================
  
  const spendCue = useCallback(async (amount: number, purpose: string, metadata?: any) => {
    if (!userDid) {
      throw new Error('사용자 DID가 필요합니다');
    }

    if (cueStore.balance < amount) {
      throw new Error(`잔액이 부족합니다. 사용 가능: ${cueStore.balance} CUE`);
    }

    try {
      console.log(`💸 CUE 소비:`, { amount, purpose });
      
      // 백엔드 API 호출
      if (backendConnected) {
        await apiService.spendCue(userDid, amount, purpose, metadata);
      }
      
      // Zustand Store에서 소비 처리
      await cueStore.spend(userDid, amount, purpose);
      
      // 잔액 새로고침
      await refreshBalance();
      
      console.log(`✅ CUE 소비 완료: ${amount} 토큰`);
    } catch (error: any) {
      console.error(`❌ CUE 소비 실패:`, error);
      throw error;
    }
  }, [userDid, backendConnected, cueStore, apiService, refreshBalance]);

  const transferCue = useCallback(async (targetDid: string, amount: number, message?: string) => {
    if (!userDid) {
      throw new Error('사용자 DID가 필요합니다');
    }

    if (cueStore.balance < amount) {
      throw new Error(`잔액이 부족합니다. 사용 가능: ${cueStore.balance} CUE`);
    }

    if (targetDid === userDid) {
      throw new Error('자신에게는 토큰을 전송할 수 없습니다');
    }

    try {
      console.log(`💸 CUE 전송:`, { targetDid, amount, message });
      
      // 백엔드 API 호출
      if (backendConnected) {
        await apiService.transferCue(userDid, targetDid, amount, message);
      }
      
      // 로컬 상태에서 차감 (실제로는 Store에서 처리)
      await cueStore.spend(userDid, amount, `transfer_to_${targetDid}`);
      
      // 잔액 새로고침
      await refreshBalance();
      
      console.log(`✅ CUE 전송 완료: ${amount} 토큰 → ${targetDid}`);
    } catch (error: any) {
      console.error(`❌ CUE 전송 실패:`, error);
      throw error;
    }
  }, [userDid, backendConnected, cueStore, apiService, refreshBalance]);

  // ============================================================================
  // 🔧 통계 및 분석 메서드
  // ============================================================================
  
  const getTodaysMining = useCallback((): number => {
    return cueStore.getTodaysMining();
  }, [cueStore]);

  const getWeeklyMining = useCallback((): number => {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return cueStore.transactions
      .filter(tx => 
        tx.type === 'mining' && 
        tx.timestamp >= weekAgo &&
        tx.amount > 0
      )
      .reduce((sum, tx) => sum + tx.amount, 0);
  }, [cueStore.transactions]);

  const getMiningStreak = useCallback((): number => {
    const transactions = cueStore.transactions
      .filter(tx => tx.type === 'mining')
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    let streak = 0;
    let lastDate: string | null = null;

    for (const tx of transactions) {
      const dateStr = tx.timestamp.toDateString();
      
      if (lastDate === null) {
        // 첫 번째 거래
        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();
        
        if (dateStr === today || dateStr === yesterday) {
          streak = 1;
          lastDate = dateStr;
        } else {
          break; // 오늘이나 어제가 아니면 스트릭 없음
        }
      } else {
        // 연속된 날짜인지 확인
        const currentDate = new Date(dateStr);
        const lastDateObj = new Date(lastDate);
        const dayDiff = (lastDateObj.getTime() - currentDate.getTime()) / (24 * 60 * 60 * 1000);
        
        if (dayDiff === 1) {
          streak++;
          lastDate = dateStr;
        } else {
          break; // 연속이 아니면 중단
        }
      }
    }

    return streak;
  }, [cueStore.transactions]);

  const getAverageDaily = useCallback((): number => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentMining = cueStore.transactions
      .filter(tx => 
        tx.type === 'mining' && 
        tx.timestamp >= thirtyDaysAgo &&
        tx.amount > 0
      )
      .reduce((sum, tx) => sum + tx.amount, 0);

    return Math.round(recentMining / 30 * 100) / 100;
  }, [cueStore.transactions]);

  // ============================================================================
  // 🔧 자동 마이닝 시스템
  // ============================================================================
  
  const startAutoMining = useCallback(() => {
    if (miningIntervalRef.current) return;
    
    console.log(`🤖 자동 마이닝 시작`);
    
    miningIntervalRef.current = setInterval(async () => {
      if (canMineNow() && cueStore.miningState?.isActive) {
        try {
          await mineCue({
            type: 'auto_mining',
            metadata: { 
              automatic: true, 
              timestamp: new Date().toISOString() 
            }
          });
        } catch (error) {
          console.warn(`⚠️ 자동 마이닝 실패:`, error);
        }
      }
    }, 5 * 60 * 1000); // 5분마다
  }, [canMineNow, cueStore.miningState, mineCue]);

  const stopAutoMining = useCallback(() => {
    if (miningIntervalRef.current) {
      clearInterval(miningIntervalRef.current);
      miningIntervalRef.current = null;
      console.log(`🛑 자동 마이닝 중단`);
    }
  }, []);

  // ============================================================================
  // 🔧 유틸리티 메서드
  // ============================================================================
  
  const clearError = useCallback(() => {
    setLocalState(prev => ({ ...prev, error: null }));
    cueStore.clearError();
    console.log(`🧹 CUE 에러 클리어`);
  }, [cueStore]);

  const resetCue = useCallback(() => {
    stopAutoMining();
    setLocalState({
      isLoading: false,
      error: null,
      lastUpdated: null
    });
    console.log(`🔄 CUE 상태 리셋`);
  }, [stopAutoMining]);

  // ============================================================================
  // 🔄 생명주기 관리
  // ============================================================================
  
  // userDid 변경시 데이터 로드
  useEffect(() => {
    if (userDid) {
      console.log(`🔄 userDid 변경으로 인한 CUE 데이터 로드: ${userDid}`);
      loadBalance();
      loadHistory();
    } else {
      console.log(`🔄 userDid 없음, CUE 리셋`);
      resetCue();
    }
  }, [userDid, loadBalance, loadHistory, resetCue]);

  // 백엔드 연결 상태 변경시 새로고침
  useEffect(() => {
    if (backendConnected && userDid) {
      console.log(`🔄 백엔드 연결로 인한 CUE 데이터 새로고침`);
      refreshBalance();
      loadHistory();
    }
  }, [backendConnected, userDid, refreshBalance, loadHistory]);

  // 마이닝 상태에 따른 자동 마이닝 제어
  useEffect(() => {
    if (cueStore.miningState?.isActive) {
      startAutoMining();
    } else {
      stopAutoMining();
    }
  }, [cueStore.miningState?.isActive, startAutoMining, stopAutoMining]);

  // 컴포넌트 언마운트시 정리
  useEffect(() => {
    return () => {
      stopAutoMining();
    };
  }, [stopAutoMining]);

  // ============================================================================
  // 🎯 반환값
  // ============================================================================
  return {
    // 상태
    balance: {
      total: cueStore.balance,
      available: cueStore.balance,
      staked: 0,
      pending: cueStore.getPendingAmount(),
      locked: 0
    },
    history: cueStore.transactions,
    miningState: cueStore.miningState || {
      isActive: false,
      canMine: true,
      cooldownUntil: undefined,
      multiplier: 1.0,
      streakDays: 0,
      totalMined: 0,
      lastMiningTime: undefined
    },
    isLoading: localState.isLoading || cueStore.isLoading,
    error: localState.error || cueStore.error,
    lastUpdated: localState.lastUpdated,
    
    // 잔액 관리
    loadBalance,
    refreshBalance,
    
    // 거래 관리
    loadHistory,
    getTransactionById,
    
    // 마이닝 시스템
    mineCue,
    toggleMining,
    getMiningMultiplier,
    canMineNow,
    getNextMiningTime,
    calculateReward,
    
    // 소비 및 전송
    spendCue,
    transferCue,
    
    // 통계 및 분석
    getTodaysMining,
    getWeeklyMining,
    getMiningStreak,
    getAverageDaily,
    
    // 유틸리티
    clearError,
    resetCue
  };
};