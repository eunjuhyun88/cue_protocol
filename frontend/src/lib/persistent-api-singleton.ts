import { PersistentDataAPIClient } from '@/services/api/PersistentDataAPIClient';

let apiClientInstance: PersistentDataAPIClient | null = null;

export const getPersistentAPIClient = () => {
  if (!apiClientInstance) {
    console.log('🔗 PersistentDataAPIClient 초기화: https://api.cueprotocol.com');
    apiClientInstance = new PersistentDataAPIClient();
  }
  return apiClientInstance;
};