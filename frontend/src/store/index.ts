// ============================================================================
// 🎯 Store 조합 및 전체 상태 관리
// 경로: frontend/src/store/index.ts
// ============================================================================

export { useAuthStore } from './authStore';
export { usePassportStore } from './passportStore';
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