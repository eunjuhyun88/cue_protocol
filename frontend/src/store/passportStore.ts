// ============================================================================
// 🎫 Passport Store - 패스포트 상태 관리 (완전한 버전)
// 경로: frontend/src/store/passportStore.ts
// ============================================================================

import { create } from 'zustand';
import { PassportAPI } from '../services/api/PassportAPI';
import type { PassportData } from '../types/passport.types';

interface PassportState {
  // 상태
  passport: PassportData | null;
  isLoading: boolean;
  error: string | null;
  
  // 액션
  loadPassport: (userDid: string) => Promise<void>;
  updatePassport: (data: Partial<PassportData>) => Promise<void>;
  createPassport: (userData: any) => Promise<void>;
  refreshPassport: () => Promise<void>;
  clearError: () => void;
}

export const usePassportStore = create<PassportState>((set, get) => ({
  // 초기 상태
  passport: null,
  isLoading: false,
  error: null,

  // 패스포트 로드
  loadPassport: async (userDid: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const result = await PassportAPI.getPassport(userDid);
      
      if (result.success) {
        set({ 
          passport: result.passport,
          isLoading: false 
        });
      } else {
        set({ 
          error: result.error || '패스포트 로드 실패',
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

  // 패스포트 업데이트
  updatePassport: async (data: Partial<PassportData>) => {
    const { passport } = get();
    if (!passport) return;

    set({ isLoading: true, error: null });
    
    try {
      const result = await PassportAPI.updatePassport(passport.did, data);
      
      if (result.success) {
        set({ 
          passport: result.passport,
          isLoading: false 
        });
      } else {
        set({ 
          error: result.error || '패스포트 업데이트 실패',
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

  // 패스포트 생성
  createPassport: async (userData: any) => {
    set({ isLoading: true, error: null });
    
    try {
      const result = await PassportAPI.createPassport(userData);
      
      if (result.success) {
        set({ 
          passport: result.passport,
          isLoading: false 
        });
      } else {
        set({ 
          error: result.error || '패스포트 생성 실패',
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

  // 패스포트 새로고침
  refreshPassport: async () => {
    const { passport } = get();
    if (!passport) return;

    await get().loadPassport(passport.did);
  },

  // 에러 클리어
  clearError: () => set({ error: null })
}));