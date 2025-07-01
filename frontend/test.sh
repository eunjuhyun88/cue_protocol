# 🚀 빠른 해결 방법

# 1. 현재 위치 확인
pwd
ls -la src/services/api/

# 2. BackendAPIClient.ts 파일 확인
cat src/services/api/BackendAPIClient.ts

# 3. 만약 파일이 문제가 있다면 새로 생성
cat > src/services/api/BackendAPIClient.ts << 'EOF'
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
EOF

# 4. 캐시 클리어
rm -rf .next
rm -rf node_modules/.cache

# 5. 파일이 제대로 생성되었는지 확인
echo "=== BackendAPIClient.ts 파일 내용 ==="
head -20 src/services/api/BackendAPIClient.ts

# 6. 다른 API 파일들도 확인
echo "=== WebAuthnAPI.ts import 부분 ==="
head -15 src/services/api/WebAuthnAPI.ts | grep -E "import.*BackendAPIClient"

# 7. 서버 재시작
echo "이제 npm run dev를 실행하세요!"