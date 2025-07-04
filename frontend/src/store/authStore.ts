// ============================================================================
// 🔐 Auth Store - 인증 상태 관리 (완전 수정됨)
// 경로: frontend/src/store/authStore.ts
// ============================================================================
// 빌드 에러 수정: Auth Store만 포함, 다른 store들은 별도 파일로 분리

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { WebAuthnAPI } from '../services/api/WebAuthnAPI';
import type { AuthUser } from '../types/auth.types';

interface AuthState {
  // 상태
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // 액션
  login: () => Promise<boolean>;
  register: (userData: any) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
  refreshUser: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // 초기 상태
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // 로그인
      login: async () => {
        set({ isLoading: true, error: null });
        
        try {
          const result = await WebAuthnAPI.login();
          
          if (result.success && result.user) {
            set({ 
              user: result.user, 
              isAuthenticated: true,
              isLoading: false 
            });
            return true;
          } else {
            set({ 
              error: result.error || '로그인에 실패했습니다.',
              isLoading: false 
            });
            return false;
          }
        } catch (error: any) {
          set({ 
            error: error.message,
            isLoading: false 
          });
          return false;
        }
      },

      // 회원가입
      register: async (userData) => {
        set({ isLoading: true, error: null });
        
        try {
          const result = await WebAuthnAPI.register(userData);
          
          if (result.success && result.user) {
            set({ 
              user: result.user, 
              isAuthenticated: true,
              isLoading: false 
            });
            return true;
          } else {
            set({ 
              error: result.error || '회원가입에 실패했습니다.',
              isLoading: false 
            });
            return false;
          }
        } catch (error: any) {
          set({ 
            error: error.message,
            isLoading: false 
          });
          return false;
        }
      },

      // 로그아웃
      logout: async () => {
        try {
          await WebAuthnAPI.logout();
        } finally {
          set({ 
            user: null, 
            isAuthenticated: false,
            error: null 
          });
        }
      },

      // 에러 클리어
      clearError: () => set({ error: null }),

      // 사용자 정보 새로고침
      refreshUser: async () => {
        const { user } = get();
        if (!user) return;

        try {
          const result = await WebAuthnAPI.getCurrentUser();
          if (result.user) {
            set({ user: result.user });
          }
        } catch (error) {
          console.error('사용자 정보 새로고침 실패:', error);
        }
      },

      // 사용자 설정
      setUser: (user) => set({ 
        user, 
        isAuthenticated: !!user 
      })
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        user: state.user,
        isAuthenticated: state.isAuthenticated 
      })
    }
  )
);

// ============================================================================
// 주의: 다른 store들 (passport, chat, cue)은 별도 파일로 분리해야 합니다!
// ============================================================================
// 1. frontend/src/store/passportStore.ts
// 2. frontend/src/store/chatStore.ts  
// 3. frontend/src/store/cueStore.ts
// 4. frontend/src/store/index.ts (전체 export)
// ============================================================================