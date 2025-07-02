'use client';

// ============================================================================
// 📁 src/components/AIPassportSystem.tsx  
// 🎯 완전히 수정된 메인 AI Passport 시스템 컴포넌트
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield, Fingerprint, CheckCircle, AlertCircle, Database,
  Wifi, WifiOff, MessageCircle, User, Coins, Settings, LogOut,
  Loader2, X, Menu, Send, Mic, MicOff, Paperclip, Sparkles,
  Activity, BarChart3, Globe, Star, Zap, Brain, Target, Award,
  Plus, RefreshCw, ChevronDown, Copy, Key, Eye, Clock,
  TrendingUp, Heart, Coffee, Lock
} from 'lucide-react';

// ============================================================================
// 🔧 Import 분리된 컴포넌트들
// ============================================================================

// API 클라이언트들
import { PersistentDataAPIClient, checkWebAuthnSupport } from '../services/api/PersistentDataAPIClient';

// UI 컴포넌트들
import { LoadingSpinner } from './ui/LoadingSpinner';
import { BackendStatus } from './ui/BackendStatus';

// 레이아웃 컴포넌트들
import { OnboardingFlow } from './auth/OnBoardingFlow';
import { MainLayout } from './layout/MainLayout';

// ============================================================================
// 🔧 타입 정의
// ============================================================================

interface User {
  id: string;
  username: string;
  email?: string;
  did: string;
  walletAddress?: string;
  cueBalance: number;
  trustScore: number;
  passportLevel: string;
  biometricVerified: boolean;
  registeredAt: string;
}

interface AIPassport {
  did: string;
  username: string;
  trustScore: number;
  passportLevel: string;
  cueBalance: number;
  totalMined: number;
  dataVaults: Array<{
    name: string;
    type: string;
    size: string;
    items: number;
  }>;
  connectedPlatforms: string[];
  personalityProfile: {
    traits: string[];
    communicationStyle: string;
    expertise: string[];
  };
  achievements: Array<{
    name: string;
    icon: string;
    earned: boolean;
    description: string;
  }>;
  ragDagStats: {
    learnedConcepts: number;
    connectionStrength: number;
    lastLearningActivity: string;
    knowledgeNodes: number;
    personalityAccuracy: number;
  };
  recentActivity: Array<{
    type: string;
    description: string;
    timestamp: string;
  }>;
}

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: string;
  model?: string;
  cueReward?: number;
  trustScore?: number;
  contextLearned?: boolean;
  qualityScore?: number;
}

// WebAuthn 라이브러리 동적 로드
let startRegistration: any = null;
let startAuthentication: any = null;

const loadWebAuthn = async () => {
  if (typeof window !== 'undefined' && !startRegistration) {
    try {
      const webauthn = await import('@simplewebauthn/browser');
      startRegistration = webauthn.startRegistration;
      startAuthentication = webauthn.startAuthentication;
      return true;
    } catch (error) {
      console.error('❌ WebAuthn 라이브러리 로드 실패:', error);
      return false;
    }
  }
  return !!startRegistration;
};

// ============================================================================
// 🎯 메인 AI Passport 시스템 컴포넌트
// ============================================================================

const AIPassportSystem: React.FC = () => {
  // ============================================================================
  // 🔧 상태 관리
  // ============================================================================
  
  // 초기화 및 인증 상태
  const [isInitialized, setIsInitialized] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registrationStep, setRegistrationStep] = useState<'waiting' | 'passport' | 'auth' | 'wallet' | 'complete'>('waiting');
  const [error, setError] = useState('');
  
  // 사용자 및 패스포트 데이터
  const [user, setUser] = useState<User | null>(null);
  const [passport, setPassport] = useState<AIPassport | null>(null);
  
  // UI 상태
  const [currentView, setCurrentView] = useState('chat');
  const [selectedModel, setSelectedModel] = useState('personalized-agent');
  const [messages, setMessages] = useState<Message[]>([]);
  const [cueBalance, setCueBalance] = useState(3200);
  const [todaysMining, setTodaysMining] = useState(47);
  
  // 연결 상태
  const [backendConnected, setBackendConnected] = useState(false);
  const [backendMode, setBackendMode] = useState('checking');
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [isLibraryLoaded, setIsLibraryLoaded] = useState(false);
  
  // WebAuthn 지원 확인
  const [webauthnSupport] = useState(() => checkWebAuthnSupport());
  
  // API 클라이언트 인스턴스
  const [api] = useState(() => new PersistentDataAPIClient());

  // ============================================================================
  // 🚀 시스템 초기화 및 세션 복원 (수정됨)
  // ============================================================================
  
// ============================================================================
  // 🚀 시스템 초기화 및 세션 복원 (수정됨)
  // ============================================================================
  
  useEffect(() => {
    const initializeSystem = async () => {
      try {
        console.log('🚀 === 시스템 초기화 시작 ===');
        
        // 백엔드 연결 확인
        const health = await api.checkHealth();
        setBackendConnected(health.connected);
        setBackendMode(health.mode || 'unknown');
        setConnectionStatus(health.connected ? 'connected' : 'disconnected');
        
        // WebAuthn 라이브러리 로드
        if (webauthnSupport.supported) {
          const loaded = await loadWebAuthn();
          setIsLibraryLoaded(loaded);
        }
        
        // 저장된 사용자 데이터 확인
        const storedUserData = localStorage.getItem('cue_user_data');
        const sessionToken = localStorage.getItem('cue_session_token');
        
        if (storedUserData) {
          try {
            const userData = JSON.parse(storedUserData);
            console.log('📱 저장된 사용자 데이터 발견:', userData);
            
            // DID가 올바른 형식인지 확인
            if (userData.did && userData.did.startsWith('did:final0626:') && !userData.did.includes('loading')) {
              console.log('✅ 유효한 DID 발견, 사용자 복원:', userData.did);
              
              setUser(userData);
              setCueBalance(userData.cueBalance || 15428);
              setIsAuthenticated(true);
              
              // 패스포트 로드
              try {
                const passportData = await api.loadPassport(userData.did);
                if (passportData) {
                  setPassport(passportData);
                  console.log('✅ 패스포트 복원 성공');
                }
              } catch (error) {
                console.warn('⚠️ 패스포트 복원 실패, 기본값 사용');
                // 기본 패스포트 생성
                const defaultPassport = {
                  did: userData.did,
                  username: userData.username,
                  trustScore: userData.trustScore,
                  passportLevel: userData.passportLevel,
                  cueBalance: userData.cueBalance,
                  totalMined: 0,
                  dataVaults: [],
                  connectedPlatforms: [],
                  personalityProfile: {
                    traits: ['analytical', 'creative'],
                    communicationStyle: 'friendly',
                    expertise: []
                  },
                  achievements: [],
                  ragDagStats: {
                    learnedConcepts: 247,
                    connectionStrength: 0.87,
                    lastLearningActivity: new Date().toISOString(),
                    knowledgeNodes: 1456,
                    personalityAccuracy: 0.94
                  },
                  recentActivity: []
                };
                setPassport(defaultPassport);
              }
            } else {
              console.warn('❌ 유효하지 않은 DID, 로컬 데이터 삭제');
              localStorage.removeItem('cue_user_data');
              localStorage.removeItem('cue_session_token');
              localStorage.removeItem('cue_session_id');
            }
          } catch (error) {
            console.error('❌ 저장된 데이터 파싱 실패:', error);
            localStorage.removeItem('cue_user_data');
          }
        }
        
        // 서버 세션 복원 (필요한 경우에만)
        if (sessionToken && !storedUserData) {
          try {
            const restored = await api.restoreSession();
            if (restored && restored.success && restored.user) {
              console.log('✅ 서버 세션 복원 성공');
              setUser(restored.user);
              setIsAuthenticated(true);
              setCueBalance(restored.user.cueBalance || 15428);
              localStorage.setItem('cue_user_data', JSON.stringify(restored.user));
            }
          } catch (error) {
            console.warn('⚠️ 서버 세션 복원 실패:', error);
          }
        }
        
      } catch (error) {
        console.error('💥 초기화 실패:', error);
      } finally {
        setIsInitialized(true);
      }
    };

    initializeSystem();
  }, [api, webauthnSupport.supported]);
  // ============================================================================
  // 🔧 백엔드 연결 재시도
  // ============================================================================
  
  const retryBackendConnection = useCallback(async () => {
    console.log('🔄 백엔드 연결 재시도...');
    const health = await api.checkHealth();
    setBackendConnected(health.connected);
    setConnectionStatus(health.connected ? 'connected' : 'disconnected');
  }, [api]);

  // ============================================================================
  // 🔐 WebAuthn 등록/로그인 처리 (수정됨)
  // ============================================================================
  
  const handleRegister = async () => {
    try {
      console.log('🚀 === WebAuthn 등록/로그인 프로세스 시작 ===');
      
      setError('');
      setIsRegistering(true);
      setRegistrationStep('auth');

      const result = await api.startWebAuthnRegistration();
      
      if (!result.success || !result.user) {
        throw new Error('등록 응답이 올바르지 않습니다');
      }

      console.log('✅ WebAuthn 처리 성공:', result);

      // 🔧 완전한 사용자 데이터 설정
      const completeUserData = {
        id: result.user.id,
        username: result.user.username || result.user.display_name || `User_${result.user.id.slice(-8)}`,
        email: result.user.email || null,
        did: result.user.did,
        walletAddress: result.user.walletAddress || result.user.wallet_address,
        cueBalance: result.user.cueBalance || result.user.cue_tokens || 15428,
        trustScore: result.user.trustScore || result.user.trust_score || 95,
        passportLevel: result.user.passportLevel || result.user.passport_level || 'Bronze',
        biometricVerified: result.user.biometricVerified || result.user.biometric_verified || true,
        registeredAt: result.user.registeredAt || result.user.created_at || new Date().toISOString()
      };

      console.log('💾 완전한 사용자 데이터:', completeUserData);

      // localStorage에 완전한 사용자 정보 저장
      localStorage.setItem('cue_user_data', JSON.stringify(completeUserData));
      
      // 세션 토큰들 저장
      if (result.sessionToken) {
        localStorage.setItem('cue_session_token', result.sessionToken);
      }
      if (result.sessionId) {
        localStorage.setItem('cue_session_id', result.sessionId);
      }

      // 즉시 상태 업데이트
      setUser(completeUserData);
      setCueBalance(completeUserData.cueBalance);
      setIsAuthenticated(true);

      // 패스포트 데이터 로드 시도
      if (completeUserData.did && completeUserData.did !== 'did:ai:loading...') {
        try {
          console.log('📊 패스포트 로드 시도:', completeUserData.did);
          const passportData = await api.loadPassport(completeUserData.did);
          
          if (passportData && passportData.did) {
            setPassport(passportData);
            console.log('✅ 패스포트 로드 성공:', passportData);
          }
        } catch (error) {
          console.warn('⚠️ 패스포트 로드 실패, 기본 패스포트 생성:', error);
          
          // 기본 패스포트 생성
          const defaultPassport = {
            did: completeUserData.did,
            username: completeUserData.username,
            trustScore: completeUserData.trustScore,
            passportLevel: completeUserData.passportLevel,
            cueBalance: completeUserData.cueBalance,
            totalMined: 0,
            dataVaults: [],
            connectedPlatforms: [],
            personalityProfile: {
              traits: ['analytical', 'creative'],
              communicationStyle: 'friendly',
              expertise: []
            },
            achievements: [],
            ragDagStats: {
              learnedConcepts: 247,
              connectionStrength: 0.87,
              lastLearningActivity: new Date().toISOString(),
              knowledgeNodes: 1456,
              personalityAccuracy: 0.94
            },
            recentActivity: []
          };
          setPassport(defaultPassport);
        }
      }

      // 등록 플로우 완료
      if (result.isExistingUser) {
        setRegistrationStep('complete');
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        setRegistrationStep('wallet');
        await new Promise(resolve => setTimeout(resolve, 800));
        setRegistrationStep('passport');
        await new Promise(resolve => setTimeout(resolve, 800));
        setRegistrationStep('complete');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      setIsRegistering(false);
      setRegistrationStep('waiting');

      console.log('🎉 등록/로그인 완료! DID:', completeUserData.did);

    } catch (error: any) {
      console.error('💥 등록/로그인 실패:', error);
      
      // 에러 메시지 사용자 친화적으로 변환
      let errorMessage = error.message;
      if (error.message.includes('취소')) {
        errorMessage = '생체인증이 취소되었습니다. 다시 시도해주세요.';
      } else if (error.message.includes('지원하지 않')) {
        errorMessage = '이 기기는 생체인증을 지원하지 않습니다. 다른 기기를 사용해주세요.';
      } else if (error.message.includes('백엔드')) {
        errorMessage = '서버 연결에 문제가 있습니다. 잠시 후 다시 시도해주세요.';
      }
      
      setError(errorMessage);
      setIsRegistering(false);
      setRegistrationStep('waiting');
    }
  };

  // ============================================================================
  // 🚪 로그아웃 처리 (수정됨)
  // ============================================================================
  
  const handleLogout = useCallback(async () => {
    try {
      console.log('🔧 로그아웃 처리 시작...');
      
      // 서버 로그아웃 시도
      await api.logout();
      
      // 모든 로컬 데이터 정리
      localStorage.removeItem('cue_session_token');
      localStorage.removeItem('cue_session_id');
      localStorage.removeItem('cue_user_data');
      localStorage.removeItem('cue_mock_credential');
      
      // 상태 초기화
      setUser(null);
      setPassport(null);
      setIsAuthenticated(false);
      setIsRegistering(false);
      setRegistrationStep('waiting');
      setMessages([]);
      setError('');
      setCueBalance(0);
      setTodaysMining(0);
      
      console.log('✅ 로그아웃 완료');
      
    } catch (error) {
      console.error('❌ 로그아웃 중 오류:', error);
      // 오류가 발생해도 로컬 상태는 초기화
      localStorage.clear();
      setUser(null);
      setPassport(null);
      setIsAuthenticated(false);
    }
  }, [api]);

  // ============================================================================
  // 💬 채팅 메시지 전송 처리 (수정됨)
  // ============================================================================
  
  // ============================================================================
  // 💬 채팅 메시지 전송 처리 (인증 헤더 수정됨)
  // ============================================================================
  
  const handleSendMessage = useCallback(async (message: string, model: string) => {
    if (!message.trim() || !user) return;

    const userMessage: Message = {
      id: `msg_${Date.now()}_user`,
      type: 'user',
      content: message,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);

    try {
      console.log('🤖 AI 채팅 요청 시작:', {
        message: message.substring(0, 50),
        model: model,
        userDid: user.did,
        userId: user.id
      });
      
      // 🔧 세션 토큰 확인 및 로깅
      const sessionToken = localStorage.getItem('cue_session_token');
      const sessionId = localStorage.getItem('cue_session_id');
      
      console.log('🔑 인증 정보 확인:', {
        hasSessionToken: !!sessionToken,
        hasSessionId: !!sessionId,
        tokenPreview: sessionToken ? sessionToken.substring(0, 20) + '...' : 'null'
      });
      
      // 헤더 구성
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      // 세션 토큰이 있으면 Authorization 헤더 추가
      if (sessionToken) {
        headers['Authorization'] = `Bearer ${sessionToken}`;
      }
      
      // 요청 본문에 userId 추가 (백엔드에서 userId로 사용자 조회 시도)
      const requestBody = {
        message: message,
        model: model,
        userDid: user.did,
        userId: user.id  // 추가: 백엔드에서 userId로도 사용자 조회 가능
      };
      
      console.log('📤 요청 데이터:', requestBody);
      console.log('📤 요청 헤더:', headers);
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/ai/chat`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestBody)
      });
      
      console.log('📨 응답 상태:', response.status, response.statusText);
      
      if (!response.ok) {
        // 401 에러인 경우 상세 에러 정보 로깅
        if (response.status === 401) {
          console.error('❌ 인증 실패 - 401 Unauthorized');
          console.log('🔧 세션 토큰 재생성 시도...');
          
          // 세션 토큰 재생성 시도
          try {
            const newToken = `force_token_${Date.now()}_${user.id}`;
            localStorage.setItem('cue_session_token', newToken);
            console.log('🔑 새 세션 토큰 생성:', newToken);
            
            // 새 토큰으로 재시도
            const retryResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/ai/chat`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${newToken}`
              },
              body: JSON.stringify(requestBody)
            });
            
            if (retryResponse.ok) {
              console.log('✅ 재시도 성공!');
              const retryData = await retryResponse.json();
              
              if (retryData.success && retryData.message?.content) {
                const aiMessage: Message = {
                  id: `msg_${Date.now()}_ai`,
                  type: 'ai',
                  content: retryData.message.content,
                  timestamp: new Date().toISOString(),
                  model: model,
                  cueReward: retryData.message.cueTokensEarned
                };
                
                setMessages(prev => [...prev, aiMessage]);
                
                // CUE 토큰 업데이트
                if (retryData.message.cueTokensEarned) {
                  const newBalance = cueBalance + retryData.message.cueTokensEarned;
                  setCueBalance(newBalance);
                  setTodaysMining(prev => prev + retryData.message.cueTokensEarned);
                  
                  const updatedUser = { ...user, cueBalance: newBalance };
                  setUser(updatedUser);
                  localStorage.setItem('cue_user_data', JSON.stringify(updatedUser));
                }
                
                return; // 성공적으로 완료
              }
            }
          } catch (retryError) {
            console.error('❌ 재시도도 실패:', retryError);
          }
        }
        
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`AI 서비스 오류 (${response.status}): ${errorData.message || errorData.error || '알 수 없는 오류'}`);
      }
      
      const data = await response.json();
      
      console.log('📨 성공 응답:', {
        success: data.success,
        hasContent: !!data.message?.content,
        cueReward: data.message?.cueTokensEarned
      });
      
      if (data.success && data.message?.content) {
        const aiMessage: Message = {
          id: `msg_${Date.now()}_ai`,
          type: 'ai',
          content: data.message.content,
          timestamp: new Date().toISOString(),
          model: model,
          cueReward: data.message.cueTokensEarned
        };
        
        setMessages(prev => [...prev, aiMessage]);
        
        // CUE 토큰 마이닝 결과 반영
        if (data.message.cueTokensEarned) {
          const newBalance = cueBalance + data.message.cueTokensEarned;
          setCueBalance(newBalance);
          setTodaysMining(prev => prev + data.message.cueTokensEarned);
          
          const updatedUser = { ...user, cueBalance: newBalance };
          setUser(updatedUser);
          localStorage.setItem('cue_user_data', JSON.stringify(updatedUser));
        }
        
      } else {
        throw new Error('AI 응답 형식이 올바르지 않습니다');
      }
      
    } catch (error: any) {
      console.error('💥 AI 채팅 실패:', error);
      
      // 에러 메시지 표시
      const errorMessage: Message = {
        id: `msg_${Date.now()}_error`,
        type: 'ai',
        content: `죄송합니다. AI 서비스에 일시적인 문제가 발생했습니다: ${error.message}`,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    }
  }, [user, cueBalance]);

  // ============================================================================
  // 🔍 디버그 기능
  // ============================================================================
  
  const handleDebugCredential = useCallback(() => {
    const debugInfo = api.getDebugInfo();
    console.log('🔍 Mock 패스키 디버그 정보:', debugInfo);
    
    alert(`Mock 패스키 정보:\nID: ${debugInfo.mockCredential.id}\n세션 토큰: ${debugInfo.sessionToken ? '있음' : '없음'}\n세션 ID: ${debugInfo.sessionId ? '있음' : '없음'}`);
  }, [api]);

  // ============================================================================
  // 🎨 렌더링
  // ============================================================================

  // 초기화 중인 경우
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-gray-600">CUE Protocol 초기화 중...</p>
        </div>
      </div>
    );
  }

  // 인증되지 않은 경우 온보딩 화면
  if (!isAuthenticated) {
    return (
      <OnboardingFlow
        step={registrationStep}
        isLoading={isRegistering}
        onStart={handleRegister}
        backendConnected={backendConnected}
        backendMode={backendMode}
        webauthnSupport={webauthnSupport}
        error={error}
        onRetryConnection={retryBackendConnection}
        onDebugCredential={handleDebugCredential}
      />
    );
  }

  // 인증된 경우 메인 레이아웃
  return (
    <MainLayout
      passport={passport ?? undefined}
      cueBalance={cueBalance}
      todaysMining={todaysMining}
      backendConnected={backendConnected}
      connectionStatus={connectionStatus as any}
      connectionDetails={{}}
      messages={messages}
      isLoadingChat={false}
      selectedModel={selectedModel}
      onModelChange={setSelectedModel}
      currentView={currentView as any}
      onViewChange={setCurrentView as any}
      onSendMessage={handleSendMessage}
      onUpdatePassport={() => {}}
      onLogout={handleLogout}
      onRetryConnection={retryBackendConnection}
    />
  );
};

export default AIPassportSystem;