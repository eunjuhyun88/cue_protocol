// ============================================================================
// 📁 src/hooks/useChat.ts
// 💬 AI 채팅 기능 관리 훅
// ============================================================================

import { useState, useCallback, useEffect } from 'react';
import { ChatAPI } from '../services/api/ChatAPI';
import type { Message, ChatState, ChatResponse } from '../types/chat.types';
import type { UnifiedAIPassport } from '../types/passport.types';

interface UseChatReturn extends ChatState {
  sendMessage: (message: string, model?: string) => Promise<void>;
  clearMessages: () => void;
  setSelectedModel: (model: string) => void;
  loadChatHistory: (userDid: string) => Promise<void>;
  addWelcomeMessage: () => void;
}

export const useChat = (
  passport?: UnifiedAIPassport,
  backendConnected: boolean = false
): UseChatReturn => {
  const [state, setState] = useState<ChatState>({
    messages: [],
    isLoading: false,
    selectedModel: 'gpt-4',
    availableModels: ['gpt-4', 'claude-3', 'gemini-pro', 'mock-ai']
  });

  const api = new ChatAPI();

  const sendMessage = useCallback(async (content: string, model?: string) => {
    const selectedModel = model || state.selectedModel;
    
    // 사용자 메시지 추가
    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      type: 'user',
      timestamp: new Date(),
      cueTokensUsed: backendConnected ? Math.floor(Math.random() * 3) + 1 : undefined
    };

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isLoading: true
    }));

    try {
      let response: ChatResponse;

      if (backendConnected) {
        console.log('🤖 실제 AI 서비스 호출:', { content, selectedModel });
        response = await api.sendChatMessage(content, selectedModel, passport);
      } else {
        console.log('🔧 Mock AI 응답 생성:', { content, selectedModel });
        // Mock 지연 시뮬레이션
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
        
        response = api.generateMockResponse(
          content,
          selectedModel,
          passport?.personalityProfile,
          [], // cues
          [] // behaviorPatterns
        );
      }

      // AI 응답 메시지 추가
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response.message,
        type: 'ai',
        timestamp: new Date(),
        cueTokensEarned: Math.floor(Math.random() * 8) + 2,
        usedPassportData: passport ? [
          '성격 프로필',
          '학습 패턴',
          '소통 스타일'
        ] : undefined,
        verification: passport?.biometricVerified ? {
          biometric: true,
          did: true,
          signature: 'verified'
        } : undefined
      };

      setState(prev => ({
        ...prev,
        messages: [...prev.messages, aiMessage],
        isLoading: false
      }));

      console.log('✅ AI 응답 완료:', response);
    } catch (error: any) {
      console.error('❌ 채팅 메시지 전송 실패:', error);
      
      // 에러 메시지 추가
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `죄송합니다. 메시지 전송 중 오류가 발생했습니다: ${error.message}`,
        type: 'ai',
        timestamp: new Date()
      };

      setState(prev => ({
        ...prev,
        messages: [...prev.messages, errorMessage],
        isLoading: false
      }));
    }
  }, [state.selectedModel, passport, backendConnected]);

  const loadChatHistory = useCallback(async (userDid: string) => {
    if (!backendConnected) {
      console.log('🔧 Mock 모드에서는 채팅 히스토리를 로드하지 않습니다.');
      return;
    }

    try {
      console.log('📜 채팅 히스토리 로드:', userDid);
      const history = await api.getChatHistory(userDid);
      
      setState(prev => ({
        ...prev,
        messages: history
      }));

      console.log('✅ 채팅 히스토리 로드 완료:', history.length, '개 메시지');
    } catch (error) {
      console.error('❌ 채팅 히스토리 로드 실패:', error);
    }
  }, [backendConnected]);

  const addWelcomeMessage = useCallback(() => {
    const welcomeMessage: Message = {
      id: 'welcome-' + Date.now(),
      content: backendConnected ? 
        `**🎉 실제 백엔드 통합 완료!**

**Real System Status:**
🔐 **WebAuthn**: ✅ 실제 생체인증 완료
🗄️ **Database**: ✅ Supabase PostgreSQL 저장 완료  
🤖 **AI Services**: ✅ OpenAI + Claude + Gemini 준비
💎 **CUE Mining**: ✅ 실시간 토큰 마이닝 활성화

**Your Real AI Passport:**
• DID: ${passport?.did || 'Loading...'}
• Trust Score: ${passport?.trustScore || 0}%
• CUE Tokens: ${passport?.cueTokens?.toLocaleString() || '0'}
• Level: ${passport?.passportLevel || 'Basic'}

🚀 **모든 시스템이 실제 백엔드 API와 연동되어 완전히 작동합니다!**` :

        `**⚠️ Mock 모드로 실행 중**

**Mock System Status:**
🔐 **WebAuthn**: ❌ Mock 시뮬레이션
🗄️ **Database**: ❌ Mock 데이터
🤖 **AI Services**: ❌ Mock 응답  
💎 **CUE Mining**: ❌ 시뮬레이션

**Mock AI Passport:**
• DID: ${passport?.did || 'mock-did'}
• Trust Score: ${passport?.trustScore || 85}% (Mock)
• CUE Tokens: ${passport?.cueTokens?.toLocaleString() || '5,430'} (Mock)
• Level: ${passport?.passportLevel || 'Verified'} (Mock)

💡 **실제 백엔드(localhost:3001)를 실행하면 완전한 기능을 사용할 수 있습니다.**

**개인화된 AI 경험을 시작해보세요:**
• 질문이나 대화를 시작해보세요
• AI가 당신의 성격과 선호도에 맞춰 응답합니다
• 대화할 때마다 CUE 토큰을 획득합니다`,
      type: 'ai',
      timestamp: new Date(),
      usedPassportData: passport ? [
        '성격 프로필',
        '패스포트 레벨',
        '신뢰 점수'
      ] : undefined
    };

    setState(prev => ({
      ...prev,
      messages: [welcomeMessage]
    }));
  }, [passport, backendConnected]);

  const clearMessages = useCallback(() => {
    setState(prev => ({
      ...prev,
      messages: []
    }));
  }, []);

  const setSelectedModel = useCallback((model: string) => {
    setState(prev => ({
      ...prev,
      selectedModel: model
    }));
  }, []);

  // 사용 가능한 모델 목록 로드
  useEffect(() => {
    if (backendConnected) {
      api.getAvailableModels().then(models => {
        setState(prev => ({
          ...prev,
          availableModels: models
        }));
      });
    }
  }, [backendConnected]);

  // 패스포트 변경 시 환영 메시지 추가
  useEffect(() => {
    if (passport && state.messages.length === 0) {
      addWelcomeMessage();
    }
  }, [passport, state.messages.length, addWelcomeMessage]);

  return {
    ...state,
    sendMessage,
    clearMessages,
    setSelectedModel,
    loadChatHistory,
    addWelcomeMessage
  };
};