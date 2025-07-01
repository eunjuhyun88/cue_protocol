'use client';

export class BackendAPIClient {
  private baseURL: string;

  constructor(baseURL = 'http://localhost:3001') {
    this.baseURL = baseURL;
    console.log(`🔗 BackendAPIClient 초기화: ${this.baseURL}`);
  }

  async get(endpoint: string): Promise<any> {
    console.log(`GET ${this.baseURL}${endpoint}`);
    return { 
      success: true, 
      mock: true, 
      endpoint,
      timestamp: new Date().toISOString()
    };
  }

  async post(endpoint: string, data: any): Promise<any> {
    console.log(`POST ${this.baseURL}${endpoint}`, data);
    return { 
      success: true, 
      mock: true, 
      endpoint, 
      data,
      timestamp: new Date().toISOString()
    };
  }

  async put(endpoint: string, data: any): Promise<any> {
    console.log(`PUT ${this.baseURL}${endpoint}`, data);
    return { 
      success: true, 
      mock: true, 
      endpoint, 
      data,
      timestamp: new Date().toISOString()
    };
  }

  async delete(endpoint: string): Promise<any> {
    console.log(`DELETE ${this.baseURL}${endpoint}`);
    return { 
      success: true, 
      mock: true, 
      endpoint,
      timestamp: new Date().toISOString()
    };
  }

  async checkConnection(): Promise<any> {
    console.log('🔌 백엔드 연결 상태 확인 (Mock)');
    return { 
      status: 'OK (Mock)',
      timestamp: new Date().toISOString(),
      service: 'Mock Backend Service',
      version: '1.0.0-mock'
    };
  }
}

export default BackendAPIClient;
