// ============================================================================
// 💎 CUE Store - CUE 토큰 상태 관리 (완전한 버전)
// 경로: frontend/src/store/cueStore.ts
// ============================================================================

import { create } from 'zustand';
import { CueAPI } from '../services/api/CueAPI';
import type { CueTransaction, CueBalance } from '../types/cue.types';

interface CueState {
  // 상태
  balance: number;
  transactions: CueTransaction[];
  isLoading: boolean;
  error: string | null;
  
  // 액션
  loadBalance: (userDid: string) => Promise<void>;
  loadTransactions: (userDid: string) => Promise<void>;
  mine: (userDid: string, activity: string, amount?: number) => Promise<boolean>;
  spend: (userDid: string, amount: number, description: string) => Promise<boolean>;
  refreshData: (userDid: string) => Promise<void>;
  clearError: () => void;
  
  // 계산된 값
  getTodaysMining: () => number;
  getPendingAmount: () => number;
}

export const useCueStore = create<CueState>((set, get) => ({
  // 초기 상태
  balance: 0,
  transactions: [],
  isLoading: false,
  error: null,

  // 잔액 로드
  loadBalance: async (userDid: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const result = await CueAPI.getBalance(userDid);
      
      if (result.success) {
        set({ 
          balance: result.balance || 0,
          isLoading: false 
        });
      } else {
        set({ 
          error: result.error || '잔액 조회 실패',
          isLoading: false 
        });
      }
    } catch (error: any) {
      set({ 
        error: error.message,
        isLoading: false 
      });
    }
  },

  // 거래 내역 로드
  loadTransactions: async (userDid: string) => {
    try {
      const result = await CueAPI.getTransactions(userDid);
      
      if (result.success) {
        set({ 
          transactions: result.transactions || [],
          error: null 
        });
      } else {
        set({ error: result.error || '거래 내역 조회 실패' });
      }
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  // CUE 마이닝
  mine: async (userDid: string, activity: string, amount = 3) => {
    try {
      const result = await CueAPI.mine({
        userDid,
        activity,
        amount
      });

      if (result.success) {
        // 잔액 업데이트
        set(state => ({ 
          balance: state.balance + amount,
          transactions: result.transaction 
            ? [result.transaction, ...state.transactions]
            : state.transactions
        }));
        return true;
      } else {
        set({ error: result.error || '마이닝 실패' });
        return false;
      }
    } catch (error: any) {
      set({ error: error.message });
      return false;
    }
  },

  // CUE 사용
  spend: async (userDid: string, amount: number, description: string) => {
    const { balance } = get();
    
    if (balance < amount) {
      set({ error: '잔액이 부족합니다.' });
      return false;
    }

    try {
      const result = await CueAPI.spend({
        userDid,
        amount,
        description
      });

      if (result.success) {
        set(state => ({ 
          balance: state.balance - amount,
          transactions: result.transaction 
            ? [result.transaction, ...state.transactions]
            : state.transactions
        }));
        return true;
      } else {
        set({ error: result.error || 'CUE 사용 실패' });
        return false;
      }
    } catch (error: any) {
      set({ error: error.message });
      return false;
    }
  },

  // 데이터 새로고침
  refreshData: async (userDid: string) => {
    await Promise.all([
      get().loadBalance(userDid),
      get().loadTransactions(userDid)
    ]);
  },

  // 에러 클리어
  clearError: () => set({ error: null }),

  // 오늘의 마이닝 계산
  getTodaysMining: () => {
    const { transactions } = get();
    const today = new Date().toDateString();
    
    return transactions
      .filter(tx => 
        tx.transactionType === 'mining' && 
        new Date(tx.createdAt).toDateString() === today
      )
      .reduce((sum, tx) => sum + tx.amount, 0);
  },

  // 대기 중인 금액 계산
  getPendingAmount: () => {
    const { transactions } = get();
    
    return transactions
      .filter(tx => tx.status === 'pending')
      .reduce((sum, tx) => sum + tx.amount, 0);
  }
}));