// ============================================================================
// 🗄️ DIContainer 호환 데이터베이스 서비스 인덱스
// 경로: backend/src/services/database/index.ts
// 용도: DIContainer에서 관리하되, 직접 사용도 가능
// ============================================================================

import { DatabaseService } from './DatabaseService';

// 🔧 DIContainer 사용 여부 확인
let databaseService: DatabaseService;

try {
  // DIContainer가 있다면 그것을 사용
  const { DIContainer } = require('../../core/DIContainer');
  const container = DIContainer.getInstance();
  
  if (container.has && container.has('DatabaseService')) {
    console.log('📦 DIContainer에서 DatabaseService 사용');
    databaseService = container.get<DatabaseService>('DatabaseService');
  } else {
    console.log('🔧 DIContainer 없음 - 직접 인스턴스 생성');
    databaseService = DatabaseService.getInstance();
  }
} catch (error) {
  // DIContainer가 없거나 에러 시 직접 생성
  console.log('🔧 DIContainer 없음 - 직접 인스턴스 생성');
  databaseService = DatabaseService.getInstance();
}

// 초기화 시 연결 시도 (DIContainer가 관리하지 않는 경우에만)
if (!databaseService.isConnected()) {
  databaseService.connect().catch(error => {
    console.error('❌ Database 초기 연결 실패:', error);
    console.log('💡 Supabase 환경변수를 확인하고 다시 시도하세요.');
  });
}

// 🚀 Export
export default databaseService;
export { DatabaseService };

console.log('✅ Database service 초기화 완료');
console.log('📊 Service:', databaseService.constructor.name);
console.log('🔗 Connected:', databaseService.isConnected());