// ============================================================================
// 📁 src/services/api/BackendAPIClient.ts  
// 🌐 백엔드 API 통신 기본 클라이언트
// ============================================================================

'use client';

export class BackendAPIClient {
  private baseURL: string;
  private timeout: number;

  constructor(baseURL = 'http://localhost:3001', timeout = 10000) {
    this.baseURL = baseURL;
    this.timeout = timeout;
    console.log(`🔗 BackendAPIClient 초기화: ${this.baseURL}`);
  }

  async get(endpoint: string): Promise<any> {
    return { success: true, mock: true, endpoint };
  }

  async post(endpoint: string, data: any): Promise<any> {
    return { success: true, mock: true, endpoint, data };
  }

  async checkConnection(): Promise<any> {
    return { 
      status: 'OK (Mock)',
      timestamp: new Date().toISOString(),
      service: 'Mock Backend'
    };
  }
}

export default BackendAPIClient;
