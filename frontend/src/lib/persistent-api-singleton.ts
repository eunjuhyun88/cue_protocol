import { PersistentDataAPIClient } from '@/services/api/PersistentDataAPIClient';

let apiClientInstance: PersistentDataAPIClient | null = null;

export const getPersistentAPIClient = () => {
  if (!apiClientInstance) {
    // 🔧 수정: baseURL을 명시적으로 전달
    const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    console.log(`🔗 PersistentDataAPIClient 초기화: ${baseURL}`);
    apiClientInstance = new PersistentDataAPIClient(baseURL);
  }
  return apiClientInstance;
};

// 🆕 추가: 인스턴스 재설정 함수 (개발용)
export const resetPersistentAPIClient = () => {
  if (apiClientInstance) {
    console.log('🔄 PersistentDataAPIClient 재설정');
    apiClientInstance = null;
  }
};

// 🆕 추가: 현재 설정 확인 함수
export const getPersistentAPIClientInfo = () => {
  const client = getPersistentAPIClient();
  return {
    baseURL: client.baseURL,
    isConnected: !!client,
    instance: client
  };
};