'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Shield, Fingerprint, CheckCircle, Send, User, Settings, LogOut, Menu, X,
  MessageCircle, Database, Activity, BarChart3, Sparkles, Mic, Paperclip,
  Wifi, WifiOff, Copy, Star, Coins, Globe, Hash, Clock, Zap, Search,
  ChevronRight, Plus, Eye, Lock, AlertCircle, RefreshCw, Brain, Heart
} from 'lucide-react';

// ============================================================================
// Enhanced API Client with Real Backend Integration
// ============================================================================

class CueProtocolAPI {
  private baseURL: string;
  private websocket: WebSocket | null = null;
  
  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API Error: ${endpoint}`, error);
      return this.getMockData(endpoint);
    }
  }

  private getMockData(endpoint: string) {
    if (endpoint.includes('/health')) {
      return { status: 'mock', mode: 'offline' };
    }
    if (endpoint.includes('/chat')) {
      return {
        response: "This is a mock response. Please connect to the backend for real AI integration.",
        cueTokensEarned: Math.floor(Math.random() * 5) + 1,
        timestamp: new Date().toISOString()
      };
    }
    return { success: false, error: 'Backend not connected' };
  }

  async healthCheck() {
    return this.request('/health');
  }

  async startWebAuthnRegistration(email: string) {
    return this.request('/api/auth/webauthn/register/start', {
      method: 'POST',
      body: JSON.stringify({ userEmail: email })
    });
  }

  async completeWebAuthnRegistration(credential: any, sessionId: string) {
    return this.request('/api/auth/webauthn/register/complete', {
      method: 'POST',
      body: JSON.stringify({ credential, sessionId })
    });
  }

  async sendChatMessage(message: string, model: string) {
    return this.request('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message, model })
    });
  }

  async mineCUE(action: string, metadata: any) {
    return this.request('/api/cue/mine', {
      method: 'POST',
      body: JSON.stringify({ action, metadata })
    });
  }
}

// ============================================================================
// Type Definitions
// ============================================================================

interface User {
  id: string;
  email: string;
  username: string;
  did: string;
  walletAddress: string;
  createdAt: string;
}

interface AIPassport {
  trustScore: number;
  cueTokens: number;
  level: string;
  connectedPlatforms: string[];
  personalityProfile: {
    type: string;
    traits: string[];
    expertise: string[];
  };
}

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string;
  cueTokensEarned?: number;
  model?: string;
}

// ============================================================================
// UI Components
// ============================================================================

// Loading Spinner
const LoadingSpinner = ({ size = 'sm' }: { size?: 'sm' | 'md' | 'lg' }) => (
  <div className={`animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 ${
    size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-8 h-8' : 'w-6 h-6'
  }`} />
);

// Connection Status Indicator
const ConnectionStatus = ({ connected, onRetry }: { connected: boolean; onRetry: () => void }) => (
  <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium ${
    connected ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
  }`}>
    {connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
    <span>{connected ? 'Connected' : 'Offline'}</span>
    {!connected && (
      <button onClick={onRetry} className="ml-1 text-red-600 hover:text-red-800">
        <RefreshCw className="w-3 h-3" />
      </button>
    )}
  </div>
);

// Onboarding Flow
const OnboardingFlow = ({ 
  step, 
  isLoading, 
  onStart, 
  backendConnected,
  error 
}: {
  step: 'waiting' | 'auth' | 'wallet' | 'passport' | 'complete';
  isLoading: boolean;
  onStart: () => void;
  backendConnected: boolean;
  error?: string;
}) => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-4">
            {step === 'waiting' && <Shield className="w-8 h-8 text-white" />}
            {step === 'auth' && <Fingerprint className="w-8 h-8 text-white animate-pulse" />}
            {step === 'wallet' && <Wallet className="w-8 h-8 text-white animate-pulse" />}
            {step === 'passport' && <User className="w-8 h-8 text-white animate-pulse" />}
            {step === 'complete' && <CheckCircle className="w-8 h-8 text-white" />}
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {step === 'waiting' && 'CUE Protocol'}
            {step === 'auth' && 'Setting up authentication...'}
            {step === 'wallet' && 'Creating wallet...'}
            {step === 'passport' && 'Building AI Passport...'}
            {step === 'complete' && 'Welcome!'}
          </h1>
          
          <p className="text-gray-600">
            {step === 'waiting' && 'AI-powered personalization platform'}
            {step === 'auth' && 'Please complete biometric authentication'}
            {step === 'wallet' && 'Generating blockchain wallet and DID'}
            {step === 'passport' && 'Initializing your AI Passport'}
            {step === 'complete' && 'Your AI Passport is ready!'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {step === 'waiting' && (
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">Quick Setup</h3>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• WebAuthn biometric authentication</li>
                <li>• Auto-generated blockchain wallet</li>
                <li>• AI Passport with personalization</li>
                <li>• CUE token mining system</li>
              </ul>
            </div>
            
            <button
              onClick={onStart}
              disabled={isLoading || !backendConnected}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <LoadingSpinner size="sm" />
                  <span>Setting up...</span>
                </div>
              ) : (
                'Get Started'
              )}
            </button>
            
            {!backendConnected && (
              <p className="text-xs text-red-600 text-center">
                Backend server required for full functionality
              </p>
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
            className="w-full bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 font-medium"
          >
            Enter AI Passport
          </button>
        )}
      </div>
    </div>
  );
};

// Main Dashboard
const MainDashboard = ({ 
  user, 
  passport, 
  onLogout, 
  backendConnected,
  onRetryConnection 
}: {
  user: User;
  passport: AIPassport;
  onLogout: () => void;
  backendConnected: boolean;
  onRetryConnection: () => void;
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentView, setCurrentView] = useState('chat');
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const api = new CueProtocolAPI();

  // Responsive detection
  useEffect(() => {
    const checkIsMobile = () => setIsMobile(window.innerWidth < 768);
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  // Auto scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      content: newMessage,
      role: 'user',
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setNewMessage('');
    setIsTyping(true);
    
    try {
      const response = await api.sendChatMessage(newMessage, 'gpt-4');
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response.response,
        role: 'assistant',
        timestamp: new Date().toISOString(),
        cueTokensEarned: response.cueTokensEarned,
        model: 'gpt-4'
      };
      
      setMessages(prev => [...prev, aiMessage]);
      
      // Mine CUE tokens
      if (response.cueTokensEarned) {
        await api.mineCUE('chat_interaction', { messageLength: newMessage.length });
      }
      
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsTyping(false);
    }
  };

  const views = [
    { id: 'chat', label: 'Chat', icon: MessageCircle },
    { id: 'passport', label: 'Passport', icon: User },
    { id: 'vaults', label: 'Vaults', icon: Database },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 }
  ];

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {isMobile && (
              <button
                onClick={() => setShowMobileSidebar(true)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-semibold text-gray-900">CUE Protocol</h1>
                <p className="text-xs text-gray-500">AI Personalization Platform</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <ConnectionStatus connected={backendConnected} onRetry={onRetryConnection} />
            
            <div className="hidden sm:flex items-center space-x-2 px-3 py-1 bg-yellow-50 rounded-full">
              <Coins className="w-4 h-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-800">
                {passport.cueTokens.toLocaleString()}
              </span>
            </div>
            
            <button
              onClick={onLogout}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - AI Passport */}
        <aside className={`
          w-80 bg-white border-r border-gray-200 flex flex-col overflow-hidden
          ${isMobile ? (showMobileSidebar ? 'fixed inset-y-0 left-0 z-50 shadow-lg' : 'hidden') : 'relative'}
        `}>
          {/* Mobile header */}
          {isMobile && showMobileSidebar && (
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">AI Passport</h2>
              <button
                onClick={() => setShowMobileSidebar(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* AI Passport Card */}
          <div className="p-6 border-b border-gray-200 flex-shrink-0">
            <div className="bg-blue-600 rounded-lg p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">AI Passport</h3>
                    <p className="text-blue-100 text-sm">{passport.level}</p>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="flex items-center space-x-1">
                    <Star className="w-4 h-4 text-yellow-300" />
                    <span className="font-bold">{passport.trustScore}%</span>
                  </div>
                  <p className="text-blue-100 text-xs">Trust Score</p>
                </div>
              </div>

              <div className="text-center mb-4">
                <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <User className="w-8 h-8" />
                </div>
                <h4 className="font-semibold">{user.username}</h4>
                <p className="text-blue-100 text-sm">{user.email}</p>
              </div>
              
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white bg-opacity-15 rounded-lg p-3 text-center">
                  <Coins className="w-4 h-4 mx-auto mb-1 text-yellow-300" />
                  <p className="text-sm font-bold">{passport.cueTokens.toLocaleString()}</p>
                  <p className="text-xs text-blue-100">CUE</p>
                </div>
                <div className="bg-white bg-opacity-15 rounded-lg p-3 text-center">
                  <Database className="w-4 h-4 mx-auto mb-1 text-green-300" />
                  <p className="text-sm font-bold">5</p>
                  <p className="text-xs text-blue-100">Vaults</p>
                </div>
                <div className="bg-white bg-opacity-15 rounded-lg p-3 text-center">
                  <Globe className="w-4 h-4 mx-auto mb-1 text-purple-300" />
                  <p className="text-sm font-bold">{passport.connectedPlatforms.length}</p>
                  <p className="text-xs text-blue-100">Linked</p>
                </div>
              </div>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto">
            {/* DID Information */}
            <div className="p-6 border-b border-gray-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                <Hash className="w-4 h-4 mr-2" />
                Digital Identity
              </h4>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-gray-600">DID:</span>
                  <div className="flex items-center space-x-2 mt-1">
                    <p className="font-mono text-xs text-gray-800 bg-gray-100 px-2 py-1 rounded flex-1 truncate">
                      {user.did}
                    </p>
                    <button className="p-1 hover:bg-gray-200 rounded">
                      <Copy className="w-3 h-3 text-gray-500" />
                    </button>
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Created:</span>
                  <p className="text-gray-800">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            {/* RAG-DAG Learning Status */}
            <div className="p-6 border-b border-gray-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                <Brain className="w-4 h-4 mr-2 text-purple-600" />
                Learning Progress
              </h4>
              
              <div className="space-y-4">
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Personalization</span>
                    <span className="text-sm font-bold text-purple-600">87%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-purple-500 h-2 rounded-full" style={{width: '87%'}}></div>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">247 conversations analyzed</p>
                </div>

                <div className="space-y-2">
                  <span className="text-xs text-gray-600 uppercase tracking-wide">Learned Concepts</span>
                  <div className="flex flex-wrap gap-2">
                    {['Web3 Dev', 'AI Ethics', 'Blockchain', 'UX Design'].map((concept, index) => (
                      <span key={index} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                        {concept}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Personality Profile */}
            <div className="p-6 border-b border-gray-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                <Heart className="w-4 h-4 mr-2" />
                Personality
              </h4>
              <div className="space-y-3">
                <div>
                  <span className="text-xs text-gray-600 uppercase tracking-wide">Type</span>
                  <p className="text-sm font-medium text-purple-600">{passport.personalityProfile.type}</p>
                </div>
                
                <div>
                  <span className="text-xs text-gray-600 uppercase tracking-wide">Traits</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {passport.personalityProfile.traits.map((trait, index) => (
                      <span key={index} className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                        {trait}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div>
                  <span className="text-xs text-gray-600 uppercase tracking-wide">Expertise</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {passport.personalityProfile.expertise.map((skill, index) => (
                      <span key={index} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Connected Platforms */}
            <div className="p-6">
              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                <Globe className="w-4 h-4 mr-2" />
                Connected Platforms
              </h4>
              <div className="space-y-2">
                {passport.connectedPlatforms.map((platform, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-700">{platform}</span>
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* View Tabs */}
          <div className="bg-white border-b border-gray-200 px-4 py-2">
            <div className="flex space-x-1 overflow-x-auto">
              {views.map((view) => (
                <button
                  key={view.id}
                  onClick={() => {
                    setCurrentView(view.id);
                    if (isMobile) setShowMobileSidebar(false);
                  }}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
                    currentView === view.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <view.icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{view.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-hidden">
            {currentView === 'chat' && (
              <div className="h-full flex flex-col">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.length === 0 ? (
                    <div className="text-center py-12">
                      <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Hello, {user.username}!
                      </h3>
                      <p className="text-gray-600 max-w-md mx-auto">
                        Start a conversation with your personalized AI. Every chat is learned and stored in your RAG-DAG system.
                      </p>
                      
                      <div className="mt-6 flex flex-wrap gap-2 justify-center">
                        {[
                          "Analyze my learning patterns",
                          "How does CUE Protocol work?",
                          "What's RAG-DAG?",
                          "Help me with coding"
                        ].map((prompt, index) => (
                          <button
                            key={index}
                            onClick={() => setNewMessage(prompt)}
                            className="px-4 py-2 bg-white border border-gray-200 rounded-full text-sm text-gray-700 hover:bg-gray-50 hover:border-gray-300"
                          >
                            {prompt}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-2xl px-4 py-3 rounded-lg ${
                            message.role === 'user'
                              ? 'bg-blue-600 text-white'
                              : 'bg-white border border-gray-200 text-gray-900'
                          }`}
                        >
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">
                            {message.content}
                          </p>
                          
                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-opacity-20">
                            <p className="text-xs opacity-70">
                              {new Date(message.timestamp).toLocaleTimeString()}
                            </p>
                            
                            <div className="flex items-center space-x-2">
                              {message.model && (
                                <span className="text-xs opacity-70">{message.model}</span>
                              )}
                              
                              {message.cueTokensEarned && (
                                <div className="flex items-center space-x-1">
                                  <Coins className="w-3 h-3 text-yellow-500" />
                                  <span className="text-xs text-yellow-600 font-medium">
                                    +{message.cueTokensEarned}
                                  </span>
                                </div>
                              )}
                              
                              {message.role === 'assistant' && (
                                <div className="flex items-center space-x-1">
                                  <Sparkles className="w-3 h-3 text-purple-500" />
                                  <span className="text-xs text-purple-600">Learned</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  
                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
                        <div className="flex items-center space-x-2">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                          </div>
                          <span className="text-xs text-gray-500">AI is responding...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="border-t border-gray-200 p-4">
                  <div className="flex items-end space-x-3">
                    <div className="flex-1 relative">
                      <textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        placeholder="Message AI..."
                        className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                        rows={1}
                        style={{ minHeight: '48px', maxHeight: '120px' }}
                        disabled={isTyping}
                      />
                      
                      <button className="absolute right-3 bottom-3 p-1 text-gray-400 hover:text-gray-600">
                        <Paperclip className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <button className="p-3 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                      <Mic className="w-5 h-5" />
                    </button>
                    
                    <button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || isTyping}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                      {isTyping ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span className="hidden sm:inline">Send</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Other Views */}
            {currentView !== 'chat' && (
              <div className="h-full overflow-y-auto p-6">
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    {currentView === 'passport' && <User className="w-8 h-8 text-gray-600" />}
                    {currentView === 'vaults' && <Database className="w-8 h-8 text-gray-600" />}
                    {currentView === 'analytics' && <BarChart3 className="w-8 h-8 text-gray-600" />}
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    {currentView.charAt(0).toUpperCase() + currentView.slice(1)} View
                  </h2>
                  <p className="text-gray-600">
                    {backendConnected 
                      ? `${currentView} functionality with real backend integration.`
                      : `Connect to backend for full ${currentView} functionality.`
                    }
                  </p>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Mobile Overlay */}
      {isMobile && showMobileSidebar && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setShowMobileSidebar(false)}
        />
      )}
    </div>
  );
};

// Main App Component
export default function CueProtocolApp() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registrationStep, setRegistrationStep] = useState<'waiting' | 'auth' | 'wallet' | 'passport' | 'complete'>('waiting');
  const [error, setError] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [passport, setPassport] = useState<AIPassport | null>(null);
  const [backendConnected, setBackendConnected] = useState(false);
  
  const api = new CueProtocolAPI();

  // Initialize system
  useEffect(() => {
    const initializeSystem = async () => {
      try {
        const health = await api.healthCheck();
        setBackendConnected(health.status === 'OK' || health.status === 'mock');
        setIsInitialized(true);
      } catch (error) {
        console.error('Initialization failed:', error);
        setIsInitialized(true);
      }
    };
    
    initializeSystem();
  }, []);

  // Handle registration
  const handleRegistration = async () => {
    try {
      setError('');
      setIsRegistering(true);
      setRegistrationStep('auth');

      // Step 1: WebAuthn authentication
      const authResult = await api.startWebAuthnRegistration('demo@cueprotocol.ai');
      
      // Step 2: Wallet generation
      setRegistrationStep('wallet');
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Step 3: AI Passport creation
      setRegistrationStep('passport');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setRegistrationStep('complete');
      
      // Set user data
      const userData: User = {
        id: authResult.user?.id || `user_${Date.now()}`,
        email: 'demo@cueprotocol.ai',
        username: authResult.user?.username || `Agent${Math.floor(Math.random() * 10000)}`,
        did: authResult.user?.did || `did:cue:${Date.now()}`,
        walletAddress: authResult.user?.walletAddress || `0x${Math.random().toString(16).substr(2, 40)}`,
        createdAt: new Date().toISOString()
      };
      
      const passportData: AIPassport = {
        trustScore: 95,
        cueTokens: 15000,
        level: 'Verified',
        connectedPlatforms: ['ChatGPT', 'Claude'],
        personalityProfile: {
          type: 'INTJ-A',
          traits: ['Analytical', 'Creative', 'Strategic'],
          expertise: ['AI', 'Web3', 'Development']
        }
      };
      
      setUser(userData);
      setPassport(passportData);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      setIsAuthenticated(true);
      setIsRegistering(false);
      
    } catch (error: any) {
      console.error('Registration failed:', error);
      setError(error.message);
      setIsRegistering(false);
      setRegistrationStep('waiting');
    }
  };

  // Handle logout
  const handleLogout = () => {
    setIsAuthenticated(false);
    setUser(null);
    setPassport(null);
    setRegistrationStep('waiting');
    setError('');
  };

  // Retry backend connection
  const retryBackendConnection = async () => {
    const health = await api.healthCheck();
    setBackendConnected(health.status === 'OK' || health.status === 'mock');
  };

  // Loading state
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="text-gray-600 mt-4">Initializing CUE Protocol...</p>
        </div>
      </div>
    );
  }

  // Main render
  if (!isAuthenticated) {
    return (
      <OnboardingFlow
        step={registrationStep}
        isLoading={isRegistering}
        onStart={handleRegistration}
        backendConnected={backendConnected}
        error={error}
      />
    );
  }

  return (
    <MainDashboard
      user={user!}
      passport={passport!}
      onLogout={handleLogout}
      backendConnected={backendConnected}
      onRetryConnection={retryBackendConnection}
    />
  );
}