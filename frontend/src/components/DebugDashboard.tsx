// ============================================================================
// 🔍 디버깅용 백엔드 API 클라이언트 (데이터 저장 추적)
// ============================================================================
'use client';

import React, { useState, useEffect } from 'react';
import { Shield, Database, AlertCircle, CheckCircle, Wifi, WifiOff } from 'lucide-react';

// 디버깅용 API 클라이언트
class DebugBackendAPIClient {
  constructor() {
    this.baseURL = 'http://localhost:3001';
    this.supabaseUrl = 'https://sudaayydlangiqfguvhm.supabase.co';
    this.supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1ZGFheXlkbGFuZ2lxZmd1dmhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA5NTAzMDIsImV4cCI6MjA2NjUyNjMwMn0.w7SZPEAA7i9TZC-ICmo3PQO_3zfGSSg6ACRLI9B4wUI';
  }

  async debugRequest(endpoint, options = {}) {
    const startTime = Date.now();
    console.log(`🔍 [DEBUG] API 요청 시작:`, {
      url: `${this.baseURL}${endpoint}`,
      method: options.method || 'GET',
      timestamp: new Date().toISOString()
    });

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...options.headers
        },
        mode: 'cors',
        credentials: 'include'
      });

      const responseTime = Date.now() - startTime;
      const data = await response.json();

      console.log(`✅ [DEBUG] API 응답 성공:`, {
        status: response.status,
        responseTime: `${responseTime}ms`,
        dataSize: JSON.stringify(data).length,
        data: data
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${data.message || data.error}`);
      }

      return { success: true, data, responseTime };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      console.error(`❌ [DEBUG] API 오류:`, {
        endpoint,
        error: error.message,
        responseTime: `${responseTime}ms`
      });
      return { success: false, error: error.message, responseTime };
    }
  }

  // 백엔드 연결 테스트
  async testBackendConnection() {
    return await this.debugRequest('/health');
  }

  // Supabase 직접 연결 테스트
  async testSupabaseConnection() {
    try {
      console.log(`🔍 [DEBUG] Supabase 직접 연결 테스트`);
      
      const response = await fetch(`${this.supabaseUrl}/rest/v1/users?select=count`, {
        headers: {
          'apikey': this.supabaseKey,
          'Authorization': `Bearer ${this.supabaseKey}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      console.log(`✅ [DEBUG] Supabase 직접 연결:`, {
        status: response.status,
        data: data
      });

      return { success: response.ok, data };
    } catch (error) {
      console.error(`❌ [DEBUG] Supabase 연결 실패:`, error);
      return { success: false, error: error.message };
    }
  }

  // 사용자 등록 디버깅
  async debugRegister(email) {
    console.log(`🔍 [DEBUG] 등록 프로세스 시작: ${email}`);
    
    // 1. 등록 시작
    const startResult = await this.debugRequest('/api/auth/webauthn/register/start', {
      method: 'POST',
      body: JSON.stringify({
        userEmail: email,
        userName: `debug_user_${Date.now()}`,
        deviceInfo: { userAgent: navigator.userAgent, platform: navigator.platform }
      })
    });

    if (!startResult.success) {
      return startResult;
    }

    // 2. Mock 크리덴셜 생성
    const mockCredential = {
      id: `mock_cred_${Date.now()}`,
      type: 'public-key',
      response: {
        clientDataJSON: btoa(JSON.stringify({
          type: 'webauthn.create',
          challenge: startResult.data.options.challenge,
          origin: 'http://localhost:3000'
        })),
        attestationObject: btoa('mock-attestation-object')
      }
    };

    // 3. 등록 완료
    const completeResult = await this.debugRequest('/api/auth/webauthn/register/complete', {
      method: 'POST',
      body: JSON.stringify({
        credential: mockCredential,
        sessionId: startResult.data.sessionId
      })
    });

    return completeResult;
  }

  // 테이블별 데이터 확인
  async checkTableData() {
    const tables = ['users', 'webauthn_credentials', 'ai_passports', 'cue_transactions'];
    const results = {};

    for (const table of tables) {
      try {
        const response = await fetch(`${this.supabaseUrl}/rest/v1/${table}?select=*&limit=5`, {
          headers: {
            'apikey': this.supabaseKey,
            'Authorization': `Bearer ${this.supabaseKey}`,
            'Content-Type': 'application/json'
          }
        });

        const data = await response.json();
        results[table] = {
          success: response.ok,
          count: Array.isArray(data) ? data.length : 0,
          data: Array.isArray(data) ? data.slice(0, 3) : data // 최대 3개만 표시
        };

        console.log(`📊 [DEBUG] ${table} 테이블:`, results[table]);
      } catch (error) {
        results[table] = { success: false, error: error.message };
      }
    }

    return results;
  }
}

// 디버깅 대시보드 컴포넌트
export default function DebugDashboard() {
  const [api] = useState(() => new DebugBackendAPIClient());
  const [backendStatus, setBackendStatus] = useState(null);
  const [supabaseStatus, setSupabaseStatus] = useState(null);
  const [tableData, setTableData] = useState({});
  const [testResults, setTestResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // 전체 시스템 상태 체크
  const checkSystemStatus = async () => {
    setIsLoading(true);
    const results = [];

    try {
      // 1. 백엔드 연결 테스트
      const backendResult = await api.testBackendConnection();
      setBackendStatus(backendResult);
      results.push({
        test: '백엔드 연결',
        success: backendResult.success,
        message: backendResult.success ? '연결됨' : backendResult.error,
        time: backendResult.responseTime
      });

      // 2. Supabase 직접 연결 테스트
      const supabaseResult = await api.testSupabaseConnection();
      setSupabaseStatus(supabaseResult);
      results.push({
        test: 'Supabase 연결',
        success: supabaseResult.success,
        message: supabaseResult.success ? '연결됨' : supabaseResult.error
      });

      // 3. 테이블 데이터 확인
      const tableResult = await api.checkTableData();
      setTableData(tableResult);
      
      Object.entries(tableResult).forEach(([table, result]) => {
        results.push({
          test: `${table} 테이블`,
          success: result.success,
          message: result.success ? `${result.count}개 레코드` : result.error
        });
      });

    } catch (error) {
      results.push({
        test: '시스템 체크',
        success: false,
        message: error.message
      });
    }

    setTestResults(results);
    setIsLoading(false);
  };

  // 테스트 등록 실행
  const testRegistration = async () => {
    setIsLoading(true);
    const result = await api.debugRegister('debug@example.com');
    
    const newResult = {
      test: '테스트 등록',
      success: result.success,
      message: result.success ? '등록 성공' : result.error,
      time: result.responseTime,
      data: result.data
    };

    setTestResults(prev => [...prev, newResult]);
    
    // 등록 후 테이블 데이터 다시 확인
    if (result.success) {
      setTimeout(() => {
        api.checkTableData().then(setTableData);
      }, 1000);
    }
    
    setIsLoading(false);
  };

  useEffect(() => {
    checkSystemStatus();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">🔍 AI Passport 시스템 디버깅</h1>

        {/* 시스템 상태 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              {backendStatus?.success ? <Wifi className="w-5 h-5 text-green-600 mr-2" /> : <WifiOff className="w-5 h-5 text-red-600 mr-2" />}
              백엔드 상태
            </h2>
            <div className={`p-4 rounded ${backendStatus?.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
              {backendStatus?.success ? '✅ 연결됨' : `❌ ${backendStatus?.error || '연결 실패'}`}
              {backendStatus?.responseTime && <span className="block text-sm mt-1">응답시간: {backendStatus.responseTime}ms</span>}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <Database className="w-5 h-5 text-blue-600 mr-2" />
              Supabase 상태
            </h2>
            <div className={`p-4 rounded ${supabaseStatus?.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
              {supabaseStatus?.success ? '✅ 연결됨' : `❌ ${supabaseStatus?.error || '연결 실패'}`}
            </div>
          </div>
        </div>

        {/* 테이블 데이터 현황 */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">📊 데이터베이스 테이블 현황</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(tableData).map(([table, result]) => (
              <div key={table} className={`p-4 rounded-lg border ${result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                <h3 className="font-medium text-gray-900">{table}</h3>
                <p className="text-2xl font-bold mt-2">
                  {result.success ? result.count : '❌'}
                </p>
                <p className="text-sm text-gray-600">
                  {result.success ? '레코드' : '오류'}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="flex space-x-4 mb-8">
          <button
            onClick={checkSystemStatus}
            disabled={isLoading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? '검사 중...' : '🔄 시스템 상태 재검사'}
          </button>
          
          <button
            onClick={testRegistration}
            disabled={isLoading || !backendStatus?.success}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {isLoading ? '테스트 중...' : '🧪 테스트 등록 실행'}
          </button>
        </div>

        {/* 테스트 결과 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">📋 테스트 결과</h2>
          <div className="space-y-3">
            {testResults.map((result, index) => (
              <div key={index} className={`p-4 rounded-lg border ${result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {result.success ? <CheckCircle className="w-5 h-5 text-green-600 mr-2" /> : <AlertCircle className="w-5 h-5 text-red-600 mr-2" />}
                    <span className="font-medium">{result.test}</span>
                  </div>
                  <div className="text-right">
                    <span className={result.success ? 'text-green-800' : 'text-red-800'}>
                      {result.message}
                    </span>
                    {result.time && <span className="block text-xs text-gray-500">{result.time}</span>}
                  </div>
                </div>
                {result.data && (
                  <div className="mt-3 p-3 bg-gray-100 rounded text-xs">
                    <pre>{JSON.stringify(result.data, null, 2)}</pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 실제 테이블 데이터 미리보기 */}
        {Object.keys(tableData).length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">👀 실제 데이터 미리보기</h2>
            {Object.entries(tableData).map(([table, result]) => (
              result.success && result.data && result.data.length > 0 && (
                <div key={table} className="mb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">{table} 테이블</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full bg-gray-50 rounded">
                      <tbody>
                        {result.data.map((row, index) => (
                          <tr key={index} className="border-b">
                            <td className="p-2 text-sm">
                              <pre className="text-xs">{JSON.stringify(row, null, 2)}</pre>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            ))}
          </div>
        )}
      </div>
    </div>
  );
}