// ============================================================================
// 🧪 백엔드 연동 테스트 도구
// ============================================================================

'use client';

import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, XCircle, AlertCircle, RefreshCw, 
  Server, Database, Shield, MessageCircle, 
  Zap, Monitor, Play, Copy, ExternalLink,
  Wifi, WifiOff, Activity, Clock, Settings
} from 'lucide-react';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error' | 'warning';
  message: string;
  duration?: number;
  data?: any;
}

interface APIEndpoint {
  id: string;
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  url: string;
  description: string;
  testData?: any;
  headers?: Record<string, string>;
}

export default function BackendIntegrationTester() {
  const [baseURL, setBaseURL] = useState('http://localhost:3001');
  const [isTestingAll, setIsTestingAll] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [overallStatus, setOverallStatus] = useState<'disconnected' | 'connected' | 'testing'>('disconnected');
  const [connectionDetails, setConnectionDetails] = useState<any>(null);

  // API 엔드포인트 정의
  const endpoints: APIEndpoint[] = [
    {
      id: 'health',
      name: 'Health Check',
      method: 'GET',
      url: '/health',
      description: '서버 상태 확인'
    },
    {
      id: 'webauthn-register-start',
      name: 'WebAuthn Register Start',
      method: 'POST',
      url: '/api/auth/webauthn/register/start',
      description: 'WebAuthn 등록 시작',
      testData: {
        userEmail: 'test@example.com',
        deviceInfo: {
          userAgent: 'Test Agent',
          platform: 'Test Platform'
        }
      }
    },
    {
      id: 'ai-chat',
      name: 'AI Chat',
      method: 'POST',
      url: '/api/ai/chat',
      description: 'AI 채팅 테스트',
      testData: {
        message: 'Hello from backend test!',
        model: 'gpt-4o',
        passportData: {
          did: 'test-did',
          personalityProfile: {
            type: 'INTJ-A',
            communicationStyle: 'Direct'
          }
        }
      }
    },
    {
      id: 'cue-mine',
      name: 'CUE Mining',
      method: 'POST',
      url: '/api/cue/mine',
      description: 'CUE 토큰 마이닝',
      testData: {
        userId: 'test-user',
        amount: 5,
        source: 'test_mining',
        messageId: 'test-message-123'
      }
    },
    {
      id: 'passport-get',
      name: 'Get Passport',
      method: 'GET',
      url: '/api/passport/test-did',
      description: 'AI Passport 조회'
    },
    {
      id: 'cue-balance',
      name: 'CUE Balance',
      method: 'GET',
      url: '/api/cue/test-did/balance',
      description: 'CUE 잔액 조회'
    }
  ];

  // 단일 API 테스트
  const testEndpoint = async (endpoint: APIEndpoint): Promise<TestResult> => {
    const startTime = Date.now();
    
    try {
      const options: RequestInit = {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Origin': window.location.origin,
          ...endpoint.headers
        },
        mode: 'cors',
        credentials: 'include'
      };

      if (endpoint.testData && endpoint.method !== 'GET') {
        options.body = JSON.stringify(endpoint.testData);
      }

      const response = await fetch(`${baseURL}${endpoint.url}`, options);
      const duration = Date.now() - startTime;
      
      if (!response.ok) {
        return {
          name: endpoint.name,
          status: 'error',
          message: `HTTP ${response.status}: ${response.statusText}`,
          duration
        };
      }

      const data = await response.json();
      
      return {
        name: endpoint.name,
        status: 'success',
        message: `✅ Success (${duration}ms)`,
        duration,
        data
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      return {
        name: endpoint.name,
        status: 'error',
        message: `❌ ${error.message}`,
        duration
      };
    }
  };

  // 전체 테스트 실행
  const runAllTests = async () => {
    setIsTestingAll(true);
    setOverallStatus('testing');
    setTestResults({});

    for (const endpoint of endpoints) {
      setTestResults(prev => ({
        ...prev,
        [endpoint.id]: {
          name: endpoint.name,
          status: 'pending',
          message: 'Testing...'
        }
      }));

      const result = await testEndpoint(endpoint);
      
      setTestResults(prev => ({
        ...prev,
        [endpoint.id]: result
      }));

      // Health check 결과로 연결 상태 업데이트
      if (endpoint.id === 'health' && result.status === 'success') {
        setOverallStatus('connected');
        setConnectionDetails(result.data);
      }

      // 테스트 간 간격
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setIsTestingAll(false);
    
    // 전체 결과 평가
    const results = Object.values(testResults);
    const hasErrors = results.some(r => r.status === 'error');
    
    if (!hasErrors && results.length > 0) {
      setOverallStatus('connected');
    } else {
      setOverallStatus('disconnected');
    }
  };

  // 개별 테스트 실행
  const runSingleTest = async (endpoint: APIEndpoint) => {
    setTestResults(prev => ({
      ...prev,
      [endpoint.id]: {
        name: endpoint.name,
        status: 'pending',
        message: 'Testing...'
      }
    }));

    const result = await testEndpoint(endpoint);
    
    setTestResults(prev => ({
      ...prev,
      [endpoint.id]: result
    }));
  };

  // 초기 연결 테스트
  useEffect(() => {
    const checkInitialConnection = async () => {
      try {
        const response = await fetch(`${baseURL}/health`);
        if (response.ok) {
          const data = await response.json();
          setOverallStatus('connected');
          setConnectionDetails(data);
        } else {
          setOverallStatus('disconnected');
        }
      } catch (error) {
        setOverallStatus('disconnected');
      }
    };

    checkInitialConnection();
  }, [baseURL]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case 'pending':
        return <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />;
      default:
        return <div className="w-5 h-5 rounded-full bg-gray-300" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'pending':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* 헤더 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Server className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Backend Integration Tester</h1>
                <p className="text-gray-600">AI Passport + CUE 백엔드 API 연동 테스트</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {overallStatus === 'connected' ? (
                <div className="flex items-center space-x-2 bg-green-50 text-green-700 px-3 py-2 rounded-lg">
                  <Wifi className="w-4 h-4" />
                  <span className="text-sm font-medium">Connected</span>
                </div>
              ) : overallStatus === 'testing' ? (
                <div className="flex items-center space-x-2 bg-blue-50 text-blue-700 px-3 py-2 rounded-lg">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span className="text-sm font-medium">Testing...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2 bg-red-50 text-red-700 px-3 py-2 rounded-lg">
                  <WifiOff className="w-4 h-4" />
                  <span className="text-sm font-medium">Disconnected</span>
                </div>
              )}
            </div>
          </div>

          {/* 서버 설정 */}
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Backend URL
              </label>
              <input
                type="text"
                value={baseURL}
                onChange={(e) => setBaseURL(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="http://localhost:3001"
              />
            </div>
            
            <div className="flex space-x-2 pt-7">
              <button
                onClick={runAllTests}
                disabled={isTestingAll}
                className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
                  isTestingAll
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {isTestingAll ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                <span>{isTestingAll ? 'Testing...' : 'Run All Tests'}</span>
              </button>
            </div>
          </div>

          {/* 연결 정보 */}
          {connectionDetails && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="font-medium text-green-800 mb-2">Connection Details</h3>
              <div className="text-sm text-green-700 space-y-1">
                <div>Service: {connectionDetails.service || 'AI Passport Backend'}</div>
                <div>Version: {connectionDetails.version || 'Unknown'}</div>
                <div>Status: {connectionDetails.status || 'OK'}</div>
                <div>Timestamp: {connectionDetails.timestamp || 'Unknown'}</div>
              </div>
            </div>
          )}
        </div>

        {/* 테스트 결과 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {endpoints.map(endpoint => {
            const result = testResults[endpoint.id];
            
            return (
              <div key={endpoint.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(result?.status || 'idle')}
                    <div>
                      <h3 className="font-semibold text-gray-900">{endpoint.name}</h3>
                      <p className="text-sm text-gray-600">{endpoint.description}</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => runSingleTest(endpoint)}
                    disabled={result?.status === 'pending'}
                    className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                  >
                    Test
                  </button>
                </div>

                {/* API 정보 */}
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-2 text-sm font-mono text-gray-700">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      endpoint.method === 'GET' ? 'bg-green-100 text-green-700' :
                      endpoint.method === 'POST' ? 'bg-blue-100 text-blue-700' :
                      endpoint.method === 'PUT' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {endpoint.method}
                    </span>
                    <span>{endpoint.url}</span>
                    <button
                      onClick={() => copyToClipboard(`${baseURL}${endpoint.url}`)}
                      className="p-1 hover:bg-gray-200 rounded"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* 테스트 결과 */}
                {result && (
                  <div className={`p-3 rounded-lg border ${getStatusColor(result.status)}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{result.message}</span>
                      {result.duration && (
                        <span className="text-xs opacity-75">
                          <Clock className="w-3 h-3 inline mr-1" />
                          {result.duration}ms
                        </span>
                      )}
                    </div>
                    
                    {result.data && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-sm font-medium">
                          View Response Data
                        </summary>
                        <pre className="mt-2 p-2 bg-black bg-opacity-10 rounded text-xs overflow-auto max-h-32">
                          {JSON.stringify(result.data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                )}

                {/* 테스트 데이터 */}
                {endpoint.testData && (
                  <details className="mt-4">
                    <summary className="cursor-pointer text-sm font-medium text-gray-700">
                      View Test Data
                    </summary>
                    <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto max-h-32">
                      {JSON.stringify(endpoint.testData, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            );
          })}
        </div>

        {/* 전체 결과 요약 */}
        <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Test Summary</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {Object.values(testResults).filter(r => r.status === 'success').length}
              </div>
              <div className="text-sm text-green-700">Passed</div>
            </div>
            
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {Object.values(testResults).filter(r => r.status === 'error').length}
              </div>
              <div className="text-sm text-red-700">Failed</div>
            </div>
            
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {Object.values(testResults).filter(r => r.status === 'pending').length}
              </div>
              <div className="text-sm text-blue-700">Running</div>
            </div>
            
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-600">
                {endpoints.length - Object.keys(testResults).length}
              </div>
              <div className="text-sm text-gray-700">Pending</div>
            </div>
          </div>
        </div>

        {/* 백엔드 시작 가이드 */}
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-yellow-800 mb-4">
            🚀 백엔드 서버 시작 가이드
          </h3>
          
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-medium text-yellow-800 mb-2">1. 백엔드 폴더로 이동:</h4>
              <code className="bg-yellow-100 px-3 py-2 rounded block font-mono text-yellow-900">
                cd backend && npm install
              </code>
            </div>
            
            <div>
              <h4 className="font-medium text-yellow-800 mb-2">2. 환경변수 설정:</h4>
              <code className="bg-yellow-100 px-3 py-2 rounded block font-mono text-yellow-900">
                cp .env.example .env && vim .env
              </code>
            </div>
            
            <div>
              <h4 className="font-medium text-yellow-800 mb-2">3. 서버 실행:</h4>
              <code className="bg-yellow-100 px-3 py-2 rounded block font-mono text-yellow-900">
                npm run dev
              </code>
            </div>
            
            <div>
              <h4 className="font-medium text-yellow-800 mb-2">4. 확인:</h4>
              <code className="bg-yellow-100 px-3 py-2 rounded block font-mono text-yellow-900">
                curl http://localhost:3001/health
              </code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}