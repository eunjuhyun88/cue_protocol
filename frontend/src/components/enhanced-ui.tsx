// ============================================================================
// 📁 src/components/enhanced-ui.tsx
// 🎨 개선된 UI 컴포넌트들 - 안전성과 1번 파일 스타일 반영
// ============================================================================

import React, { useState, useRef } from 'react';
import { 
  Shield, 
  Coins, 
  TrendingUp, 
  Database, 
  Globe, 
  Award, 
  Activity, 
  Clock,
  User,
  Bot,
  Send,
  Paperclip,
  Mic,
  Smile,
  Plus,
  X,
  Wifi,
  WifiOff,
  CheckCircle,
  Star,
  Loader2,
  Copy,
  Hash,
  Sparkles,
  Eye,
  Menu,
  LogOut,
  AlertCircle
} from 'lucide-react';

import { 
  AIPassport, 
  User as UserType, 
  Message, 
  ConnectionStatus, 
  WebAuthnSupport,
  safePassportAccess 
} from '../types/unified.types';

// ============================================================================
// 🧩 기본 UI 컴포넌트들
// ============================================================================

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  text?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  className = '',
  text 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6', 
    lg: 'w-8 h-8'
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Loader2 className={`${sizeClasses[size]} animate-spin`} />
      {text && <span className="text-sm text-gray-600">{text}</span>}
    </div>
  );
};

interface StatusIndicatorProps {
  status: ConnectionStatus;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status }) => (
  <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium ${
    status.connected ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
  }`}>
    {status.connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
    <span>{status.connected ? `Real (${status.mode})` : 'Mock Mode'}</span>
  </div>
);

// ============================================================================
// 🎫 안전한 PassportCard 컴포넌트 (1번 파일 스타일)
// ============================================================================

interface SafePassportCardProps {
  passport: AIPassport | null;
  cueBalance: number;
}

export const SafePassportCard: React.FC<SafePassportCardProps> = ({ passport, cueBalance }) => {
  // 안전한 데이터 접근
  const totalMined = safePassportAccess.getTotalMined(passport);
  const trustScore = safePassportAccess.getTrustScore(passport);
  const dataVaults = safePassportAccess.getDataVaults(passport);
  const connectedPlatforms = safePassportAccess.getConnectedPlatforms(passport);
  const achievements = safePassportAccess.getAchievements(passport);
  const recentActivity = safePassportAccess.getRecentActivity(passport);

  return (
    <div className="bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 rounded-2xl p-6 text-white relative overflow-hidden shadow-xl">
      {/* 배경 패턴 */}
      <div className="absolute inset-0 bg-white opacity-5">
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full -mr-16 -mt-16"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full -ml-12 -mb-12"></div>
      </div>
      
      <div className="relative z-10">
        {/* AI Passport 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold">AI Passport</h3>
              <p className="text-blue-100 text-sm">{passport?.passportLevel || 'Verified Agent'}</p>
            </div>
          </div>
          
          <div className="text-right">
            <div className="flex items-center space-x-1">
              <Star className="w-4 h-4 text-yellow-300" />
              <span className="text-lg font-bold">{trustScore}%</span>
            </div>
            <p className="text-blue-100 text-xs">Trust Score</p>
          </div>
        </div>

        {/* 사용자 정보 */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-3 backdrop-blur-sm">
            <User className="w-10 h-10" />
          </div>
          <h4 className="text-xl font-bold">{passport?.username || 'Agent'}</h4>
          <p className="text-blue-100 text-sm">{passport?.did?.slice(0, 30) || 'Loading...'}</p>
        </div>
        
        {/* CUE 잔액과 통계 - 3열 그리드 */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white bg-opacity-15 rounded-xl p-3 text-center backdrop-blur-sm">
            <Coins className="w-5 h-5 mx-auto mb-1 text-yellow-300" />
            <p className="text-lg font-bold">{cueBalance.toLocaleString()}</p>
            <p className="text-xs text-blue-100">CUE</p>
          </div>
          
          <div className="bg-white bg-opacity-15 rounded-xl p-3 text-center backdrop-blur-sm">
            <Activity className="w-5 h-5 mx-auto mb-1 text-green-300" />
            <p className="text-lg font-bold">{Math.floor(totalMined / 1000)}K</p>
            <p className="text-xs text-blue-100">Mined</p>
          </div>
          
          <div className="bg-white bg-opacity-15 rounded-xl p-3 text-center backdrop-blur-sm">
            <Globe className="w-5 h-5 mx-auto mb-1 text-purple-300" />
            <p className="text-lg font-bold">{connectedPlatforms.length}</p>
            <p className="text-xs text-blue-100">Linked</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 🔒 온보딩 플로우 (1번 파일 스타일)
// ============================================================================

interface OnboardingFlowProps {
  step: 'waiting' | 'auth' | 'wallet' | 'passport' | 'complete';
  isLoading: boolean;
  onStart: () => void;
  backendConnected: boolean;
  backendMode: string;
  webauthnSupport: WebAuthnSupport;
  error?: string;
  onRetryConnection?: () => void;
  onDebugCredential?: () => void;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  step,
  isLoading,
  onStart,
  backendConnected,
  backendMode,
  webauthnSupport,
  error,
  onRetryConnection,
  onDebugCredential
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-8 border border-gray-100">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <div className="mx-auto w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-6 shadow-lg">
            {step === 'waiting' && <Shield className="w-10 h-10 text-white" />}
            {step === 'auth' && <Shield className="w-10 h-10 text-white animate-pulse" />}
            {step === 'wallet' && <Coins className="w-10 h-10 text-white animate-pulse" />}
            {step === 'passport' && <User className="w-10 h-10 text-white animate-pulse" />}
            {step === 'complete' && <CheckCircle className="w-10 h-10 text-white" />}
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {step === 'waiting' && 'CUE Protocol'}
            {step === 'auth' && '🔐 생체인증 중...'}
            {step === 'wallet' && '🌐 DID 생성 중...'}
            {step === 'passport' && '🛡️ AI Passport 생성 중...'}
            {step === 'complete' && '🎉 완료!'}
          </h1>
          
          <p className="text-gray-600">
            {step === 'waiting' && 'Web3 AI 개인화 플랫폼에 오신 것을 환영합니다'}
            {step === 'auth' && '생체인증을 완료해주세요'}
            {step === 'wallet' && '블록체인 지갑과 DID를 생성하고 있습니다'}
            {step === 'passport' && 'AI Passport를 초기화하고 있습니다'}
            {step === 'complete' && 'AI Passport가 준비되었습니다!'}
          </p>
        </div>

        {/* 시스템 상태 */}
        <div className="flex justify-center mb-6">
          <StatusIndicator status={{
            connected: backendConnected,
            mode: backendMode as any,
            status: backendConnected ? 'Connected' : 'Mock Mode',
            timestamp: new Date().toISOString(),
            service: 'CUE Protocol API',
            version: '1.0.0'
          }} />
        </div>

        {/* WebAuthn 지원 상태 */}
        <div className={`mb-6 p-4 rounded-xl ${
          webauthnSupport.supported ? 'bg-blue-50 border border-blue-200' : 'bg-yellow-50 border border-yellow-200'
        }`}>
          <div className="flex items-center space-x-2">
            <Shield className={`w-4 h-4 ${webauthnSupport.supported ? 'text-blue-600' : 'text-yellow-600'}`} />
            <span className={`text-sm font-medium ${webauthnSupport.supported ? 'text-blue-800' : 'text-yellow-800'}`}>
              {webauthnSupport.supported ? '✅ WebAuthn 지원됨' : '⚠️ WebAuthn 제한됨'}
            </span>
          </div>
          {!webauthnSupport.supported && (
            <p className="text-xs text-yellow-700 mt-1">{webauthnSupport.reason}</p>
          )}
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* 액션 버튼 */}
        {step === 'waiting' && (
          <div className="space-y-4">
            {/* 핵심 기능 강조 */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-xl border border-blue-100">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                <Sparkles className="w-4 h-4 mr-2 text-purple-600" />
                영구 데이터 보존 기능
              </h3>
              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>WebAuthn 생체인증 (Face ID, Touch ID)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>자동 블록체인 지갑 + DID 생성</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span>영구 세션 기반 데이터 유지</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span>CUE 토큰 & Trust Score 누적</span>
                </div>
              </div>
            </div>
            
            <button
              onClick={onStart}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 px-6 rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <LoadingSpinner size="sm" />
                  <span>생성 중...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <Shield className="w-5 h-5" />
                  <span>영구 AI Passport 생성</span>
                </div>
              )}
            </button>

            {/* 디버깅 버튼 */}
            {onDebugCredential && (
              <button
                onClick={onDebugCredential}
                className="w-full text-gray-500 hover:text-gray-700 text-sm underline"
              >
                🔍 Mock 패스키 디버그 정보 확인
              </button>
            )}
          </div>
        )}

        {(step === 'auth' || step === 'wallet' || step === 'passport') && (
          <div className="flex justify-center py-8">
            <LoadingSpinner size="lg" />
          </div>
        )}

        {step === 'complete' && (
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-gradient-to-r from-green-600 to-blue-600 text-white py-4 px-6 rounded-xl hover:from-green-700 hover:to-blue-700 font-semibold text-lg transition-all duration-200 shadow-lg"
          >
            <div className="flex items-center justify-center space-x-2">
              <CheckCircle className="w-5 h-5" />
              <span>AI Passport 사용하기</span>
            </div>
          </button>
        )}

        {/* 백엔드 연결 재시도 */}
        {!backendConnected && onRetryConnection && (
          <button
            onClick={onRetryConnection}
            className="w-full mt-3 text-gray-600 hover:text-gray-900 text-sm underline"
          >
            백엔드 연결 재시도
          </button>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// 💬 채팅 관련 컴포넌트들
// ============================================================================

interface MessageBubbleProps {
  message: Message;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => (
  <div className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
    <div className={`max-w-xs lg:max-w-2xl px-4 py-3 rounded-2xl ${
      message.sender === 'user'
        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
        : message.error
        ? 'bg-red-50 border border-red-200 text-red-800'
        : 'bg-white border border-gray-200 text-gray-900 shadow-sm'
    }`}>
      <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
      
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-opacity-20">
        <p className="text-xs opacity-70">
          {new Date(message.timestamp).toLocaleTimeString()}
        </p>
        
        <div className="flex items-center space-x-2">
          {message.model && (
            <span className="text-xs opacity-70">{message.model}</span>
          )}
          
          {message.cueReward && (
            <div className="flex items-center space-x-1">
              <Coins className="w-3 h-3 text-yellow-500" />
              <span className="text-xs text-yellow-600 font-medium">
                +{message.cueReward} CUE
              </span>
            </div>
          )}
          
          {message.trustScore && (
            <div className="flex items-center space-x-1">
              <Star className="w-3 h-3 text-blue-500" />
              <span className="text-xs text-blue-600 font-medium">
                {Math.round(message.trustScore * 100)}%
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
);

interface ChatInputProps {
  onSendMessage: (message: string, attachments?: File[]) => void;
  disabled: boolean;
  supportMultimodal?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ 
  onSendMessage, 
  disabled, 
  supportMultimodal = true 
}) => {
  const [message, setMessage] = useState('');
  const [showOptions, setShowOptions] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message.trim(), attachments);
      setMessage('');
      setAttachments([]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments(prev => [...prev, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="border-t border-gray-200 bg-white p-4 flex-shrink-0">
      {/* 첨부파일 미리보기 */}
      {attachments.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {attachments.map((file, index) => (
            <div key={index} className="flex items-center space-x-2 bg-gray-100 rounded-lg px-3 py-2">
              <Paperclip className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-700">{file.name}</span>
              <button
                onClick={() => removeAttachment(index)}
                className="text-gray-500 hover:text-red-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end space-x-3 max-w-4xl mx-auto">
        <div className="flex-1 relative">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="영구 보존되는 AI 에이전트와 대화하기..."
            className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
            rows={message.split('\n').length || 1}
            style={{ minHeight: '48px', maxHeight: '120px' }}
            disabled={disabled}
          />
          
          {/* 첨부파일 버튼 */}
          {supportMultimodal && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,text/*,.pdf,.doc,.docx"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="absolute right-3 bottom-3 p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <Paperclip className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
        
        {/* 음성 입력 버튼 */}
        <button className="p-3 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
          <Mic className="w-5 h-5" />
        </button>
        
        {/* 전송 버튼 */}
        <button
          onClick={handleSubmit}
          disabled={!message.trim() || disabled}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          {disabled ? (
            <LoadingSpinner size="sm" />
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline font-medium">전송</span>
            </>
          )}
        </button>
      </div>
      
      {/* 입력 도움말 */}
      <div className="flex items-center justify-center mt-2 text-xs text-gray-500">
        <span>Enter로 전송, Shift+Enter로 줄바꿈 | 모든 데이터는 영구 보존됩니다</span>
      </div>
    </div>
  );
};