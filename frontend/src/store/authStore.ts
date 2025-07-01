// ============================================================================
// 🔐 Auth Store - 인증 상태 관리
// src/store/authStore.ts
// ============================================================================

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
// 🎫 Passport Store - 패스포트 상태 관리
// src/store/passportStore.ts
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

// ============================================================================
// 🤖 Chat Store - 채팅 상태 관리
// src/store/chatStore.ts
// ============================================================================

import { create } from 'zustand';
import { ChatAPI } from '../services/api/ChatAPI';
import type { ChatMessage, ChatSession, ModelType } from '../types/chat.types';

interface ChatState {
  // 상태
  messages: ChatMessage[];
  sessions: ChatSession[];
  currentSession: ChatSession | null;
  selectedModel: ModelType;
  isTyping: boolean;
  error: string | null;
  
  // 액션
  sendMessage: (content: string, passportData?: any) => Promise<void>;
  createSession: (name?: string) => Promise<void>;
  switchSession: (sessionId: string) => Promise<void>;
  loadSessions: () => Promise<void>;
  setSelectedModel: (model: ModelType) => void;
  clearMessages: () => void;
  clearError: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  // 초기 상태
  messages: [],
  sessions: [],
  currentSession: null,
  selectedModel: 'gpt-4',
  isTyping: false,
  error: null,

  // 메시지 전송
  sendMessage: async (content: string, passportData?: any) => {
    const { selectedModel, currentSession } = get();
    
    // 사용자 메시지 추가
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content,
      type: 'user',
      timestamp: new Date(),
      sessionId: currentSession?.id
    };

    set(state => ({ 
      messages: [...state.messages, userMessage],
      isTyping: true,
      error: null 
    }));

    try {
      const result = await ChatAPI.sendMessage({
        message: content,
        model: selectedModel,
        sessionId: currentSession?.id,
        passportData
      });

      if (result.success) {
        const aiMessage: ChatMessage = {
          id: result.messageId || (Date.now() + 1).toString(),
          content: result.response,
          type: 'ai',
          timestamp: new Date(),
          sessionId: result.sessionId,
          usedPassportData: result.usedPassportData,
          cueTokensEarned: result.cueTokensEarned,
          model: result.model
        };

        set(state => ({ 
          messages: [...state.messages, aiMessage],
          isTyping: false 
        }));

        // 새 세션이 생성된 경우 세션 목록 새로고침
        if (result.sessionId && !currentSession) {
          await get().loadSessions();
        }
      } else {
        set({ 
          error: result.error || 'AI 응답 실패',
          isTyping: false 
        });
      }
    } catch (error: any) {
      set({ 
        error: error.message,
        isTyping: false 
      });
    }
  },

  // 새 세션 생성
  createSession: async (name?: string) => {
    const { selectedModel } = get();
    
    try {
      const result = await ChatAPI.createSession({
        name: name || `Chat ${new Date().toLocaleDateString()}`,
        model: selectedModel
      });

      if (result.success && result.session) {
        set(state => ({
          sessions: [result.session!, ...state.sessions],
          currentSession: result.session!,
          messages: [],
          error: null
        }));
      } else {
        set({ error: result.error || '세션 생성 실패' });
      }
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  // 세션 전환
  switchSession: async (sessionId: string) => {
    const { sessions } = get();
    const session = sessions.find(s => s.id === sessionId);
    
    if (!session) return;

    set({ currentSession: session });

    try {
      const result = await ChatAPI.getChatHistory(sessionId);
      if (result.success) {
        set({ 
          messages: result.messages || [],
          error: null 
        });
      }
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  // 세션 목록 로드
  loadSessions: async () => {
    try {
      const result = await ChatAPI.getSessions();
      if (result.success) {
        set({ 
          sessions: result.sessions || [],
          error: null 
        });
      }
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  // 모델 선택
  setSelectedModel: (model: ModelType) => set({ selectedModel: model }),

  // 메시지 클리어
  clearMessages: () => set({ messages: [] }),

  // 에러 클리어
  clearError: () => set({ error: null })
}));

// ============================================================================
// 💎 CUE Store - CUE 토큰 상태 관리
// src/store/cueStore.ts
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

// ============================================================================
// 🎯 Store 조합 훅 (편의용)
// src/store/index.ts
// ============================================================================

export { useAuthStore } from './authStore';
export { usePassportStore } from '..src/components/passportcard';
export { useChatStore } from './chatStore';
export { useCueStore } from './cueStore';

// 전체 앱 상태를 위한 조합 훅
export function useAppState() {
  const auth = useAuthStore();
  const passport = usePassportStore();
  const chat = useChatStore();
  const cue = useCueStore();

  return {
    auth,
    passport,
    chat,
    cue,
    
    // 편의 메서드들
    isReady: auth.isAuthenticated && !!passport.passport,
    isLoading: auth.isLoading || passport.isLoading || cue.isLoading,
    hasErrors: !!(auth.error || passport.error || chat.error || cue.error),
    
    // 초기화 메서드
    async initialize() {
      if (auth.user && !passport.passport) {
        await passport.loadPassport(auth.user.did);
        await cue.loadBalance(auth.user.did);
        await cue.loadTransactions(auth.user.did);
        await chat.loadSessions();
      }
    },
    
    // 정리 메서드
    cleanup() {
      auth.clearError();
      passport.clearError();
      chat.clearError();
      cue.clearError();
    }
  };
}