'use client';

// ============================================================================
// 📁 src/components/AIPassportSystem.tsx  
// 🎯 원래 버전 복원 (DID 표시 문제 수정된 버전)
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
// 🔧 수정된 타입 정의 (백엔드 호환성 추가)
// ============================================================================

interface User {
  id: string;
  username: string;
  email?: string;
  did: string;
  walletAddress?: string;
  wallet_address?: string; // 백엔드 호환성
  cueBalance: number;
  cue_tokens?: number; // 백엔드 호환성
  trustScore: number;
  trust_score?: number; // 백엔드 호환성
  passportLevel: string;
  passport_level?: string; // 백엔드 호환성
  biometricVerified: boolean;
  biometric_verified?: boolean; // 백엔드 호환성
  registeredAt: string;
  created_at?: string; // 백엔드 호환성
}

interface AIPassport {
  did: string;
  username: string;
  trustScore: number;
  passportLevel: string;
  cueBalance: number;
  cueTokens?: number; // 추가: UI 호환성
  totalMined: number;
  dataVaults: Array<{
    name: string;
    type: string;
    size: string;
    items: number;
    cueCount?: number; // 추가: UI에서 사용
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

// ============================================================================
// ============================================================================
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
  // 🔧 데이터 정규화 함수들
  // ============================================================================
  
  const normalizeUserData = useCallback((userData: any): User => {
    return {
      id: userData.id,
      username: userData.username || userData.display_name || `User_${userData.id.slice(-8)}`,
      email: userData.email || null,
      did: userData.did || `did:final0626:${userData.id}`, // DID 보장
      walletAddress: userData.walletAddress || userData.wallet_address,
      cueBalance: userData.cueBalance || userData.cue_tokens || 15428,
      trustScore: userData.trustScore || userData.trust_score || 95,
      passportLevel: userData.passportLevel || userData.passport_level || 'Bronze',
      biometricVerified: userData.biometricVerified || userData.biometric_verified || true,
      registeredAt: userData.registeredAt || userData.created_at || new Date().toISOString()
    };
  }, []);

  const createDefaultPassport = useCallback((userData: User): AIPassport => {
    return {
      did: userData.did, // 🔑 핵심: DID 확실히 설정
      username: userData.username,
      trustScore: userData.trustScore,
      passportLevel: userData.passportLevel,
      cueBalance: userData.cueBalance,
      cueTokens: userData.cueBalance, // UI 호환성
      totalMined: Math.floor(userData.cueBalance * 1.5),
      dataVaults: [
        {
          name: 'Personal Data',
          type: 'encrypted',
          size: '1.2MB',
          items: 247,
          cueCount: Math.floor(userData.cueBalance * 0.1)
        },
        {
          name: 'AI Conversations',
          type: 'conversations',
          size: '856KB',
          items: 89,
          cueCount: Math.floor(userData.cueBalance * 0.05)
        }
      ],
      connectedPlatforms: ['ChatGPT', 'Claude'],
      personalityProfile: {
        traits: ['analytical', 'creative', 'curious'],
        communicationStyle: 'friendly',
        expertise: ['AI', 'Technology']
      },
      achievements: [
        {
          name: 'First Steps',
          icon: '🎯',
          earned: true,
          description: 'AI Passport 생성 완료'
        },
        {
          name: 'Verified Identity',
          icon: '✅',
          earned: true,
          description: '생체인증으로 신원 확인'
        }
      ],
      ragDagStats: {
        learnedConcepts: 247,
        connectionStrength: 0.87,
        lastLearningActivity: new Date().toISOString(),
        knowledgeNodes: 1456,
        personalityAccuracy: 0.94
      },
      recentActivity: [
        {
          type: 'passport_created',
          description: 'AI Passport 생성됨',
          timestamp: new Date().toISOString()
        }
      ]
    };
  }, []);

  // 수정된 isValidDID 함수
const isValidDID = useCallback((did: string): boolean => {
  return did && 
         (did.startsWith('did:final0626:') || 
          did.startsWith('did:ai:') || 
          did.startsWith('did:agent:')) &&  // ✅ did:agent: 추가!
         !did.includes('loading') && 
         did.length > 20;
}, []);

  // ============================================================================
  // 🚀 수정된 시스템 초기화 및 세션 복원
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
            
            if (isValidDID(userData.did)) {
              console.log('✅ 유효한 DID 발견, 사용자 복원:', userData.did);
              
              // 데이터 정규화
              const normalizedUser = normalizeUserData(userData);
              
              setUser(normalizedUser);
              setCueBalance(normalizedUser.cueBalance);
              setIsAuthenticated(true);
              
              // 패스포트 로드
              try {
                console.log('🔍 패스포트 로드 시도 - DID:', normalizedUser.did);
                const passportData = await api.loadPassport(normalizedUser.did);
                
                if (passportData && passportData.did) {
                  const normalizedPassport = {
                    ...passportData,
                    cueTokens: passportData.cueBalance || normalizedUser.cueBalance,
                    dataVaults: passportData.dataVaults?.map(vault => ({
                      ...vault,
                      cueCount: vault.cueCount || Math.floor(Math.random() * 100)
                    })) || []
                  };
                  setPassport(normalizedPassport);
                  console.log('✅ 패스포트 복원 성공, DID:', normalizedPassport.did);
                } else {
                  throw new Error('패스포트 데이터에 DID가 없습니다');
                }
              } catch (error) {
                console.warn('⚠️ 패스포트 복원 실패, 기본값 사용:', error);
                
                // 🔧 기본 패스포트에 DID 확실히 포함
                const defaultPassport = createDefaultPassport(normalizedUser);
                setPassport(defaultPassport);
                console.log('🎨 기본 패스포트 생성, DID 포함:', defaultPassport.did);
              }
            } else {
              console.warn('❌ 유효하지 않은 DID, 로컬 데이터 삭제:', userData.did);
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
              const normalizedUser = normalizeUserData(restored.user);
              setUser(normalizedUser);
              setIsAuthenticated(true);
              setCueBalance(normalizedUser.cueBalance);
              localStorage.setItem('cue_user_data', JSON.stringify(normalizedUser));
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
  }, [api, webauthnSupport.supported, normalizeUserData, createDefaultPassport, isValidDID]);

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
  // 🔐 수정된 WebAuthn 등록/로그인 처리
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

      // 🔧 백엔드 응답 데이터 정규화
      const completeUserData = normalizeUserData(result.user);

      console.log('💾 정규화된 사용자 데이터:', completeUserData);

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

      // 🔧 패스포트 데이터 생성/로드 개선
      const createOrLoadPassport = async (userData: User) => {
        try {
          console.log('📊 패스포트 로드 시도:', userData.did);
          const passportData = await api.loadPassport(userData.did);
          
          if (passportData && passportData.did) {
            // 백엔드에서 로드된 패스포트 정규화
            const normalizedPassport = {
              ...passportData,
              cueTokens: passportData.cueBalance || userData.cueBalance, // UI 호환성
              dataVaults: passportData.dataVaults?.map(vault => ({
                ...vault,
                cueCount: vault.cueCount || 0 // 기본값 설정
              })) || []
            };
            
            setPassport(normalizedPassport);
            console.log('✅ 패스포트 로드 성공:', normalizedPassport.did);
            return;
          }
        } catch (error) {
          console.warn('⚠️ 패스포트 로드 실패, 기본 패스포트 생성:', error);
        }
        
        // 기본 패스포트 생성 (DID 확실히 포함)
        const defaultPassport = createDefaultPassport(userData);
        setPassport(defaultPassport);
        console.log('🎨 기본 패스포트 생성 완료, DID:', defaultPassport.did);
      };

      // 패스포트 생성/로드
      if (completeUserData.did && completeUserData.did !== 'did:ai:loading...') {
        await createOrLoadPassport(completeUserData);
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
// 🔧 frontend/src/components/AIPassportSystem.tsx 수정
// 📍 handleSendMessage 함수에서 force_token 생성 부분 제거
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
    const sessionToken = localStorage.getItem('cue_session_token') || 
                        localStorage.getItem('ai_agent_session_token');
    const sessionId = localStorage.getItem('cue_session_id');
    
    console.log('🔑 인증 정보 확인:', {
      hasSessionToken: !!sessionToken,
      hasSessionId: !!sessionId,
      tokenPreview: sessionToken ? sessionToken.substring(0, 20) + '...' : 'null',
      tokenLength: sessionToken?.length || 0
    });
    
    // 헤더 구성
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    // 세션 토큰이 있으면 Authorization 헤더 추가
    if (sessionToken) {
      headers['Authorization'] = `Bearer ${sessionToken}`;
    }
    
    // 요청 본문에 userId 추가
    const requestBody = {
      message: message,
      model: model,
      userDid: user.did,
      userId: user.id
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
      // 🔧 401 에러 처리 개선 - force_token 생성 제거
      if (response.status === 401) {
        console.error('❌ 인증 실패 - 401 Unauthorized');
        console.log('🔄 WebAuthn 재인증 필요');
        
        // force_token 생성하지 않고 사용자에게 재인증 요청
        const errorMessage: Message = {
          id: `msg_${Date.now()}_error`,
          type: 'ai',
          content: '🔐 인증이 만료되었습니다. 새로고침 후 다시 로그인해주세요.',
          timestamp: new Date().toISOString()
        };
        
        setMessages(prev => [...prev, errorMessage]);
        
        // 잘못된 토큰 삭제
        localStorage.removeItem('cue_session_token');
        localStorage.removeItem('ai_agent_session_token');
        
        // 3초 후 자동 새로고침
        setTimeout(() => {
          window.location.reload();
        }, 3000);
        
        return;
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
    
    // 🔧 DID 디버깅 정보 추가
    const didInfo = {
      userDID: user?.did || 'No user',
      passportDID: passport?.did || 'No passport',
      localStorage: localStorage.getItem('cue_user_data') ? 'Present' : 'Missing',
      sessionToken: localStorage.getItem('cue_session_token') ? 'Present' : 'Missing'
    };
    
    console.log('🆔 DID 디버그 정보:', didInfo);
    
    alert(`Mock 패스키 정보:\nID: ${debugInfo.mockCredential.id}\n세션 토큰: ${debugInfo.sessionToken ? '있음' : '없음'}\n세션 ID: ${debugInfo.sessionId ? '있음' : '없음'}\n\nDID 정보:\nUser DID: ${didInfo.userDID}\nPassport DID: ${didInfo.passportDID}\nLocalStorage: ${didInfo.localStorage}`);
  }, [api, user, passport]);

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