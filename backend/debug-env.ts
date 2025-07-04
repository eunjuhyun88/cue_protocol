// =============================================================================
// 🔍 환경 변수 디버그 스크립트
// 파일: backend/debug-env.ts
// 목적: .env 파일 로딩 상태 확인 및 문제 해결
// =============================================================================

import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

console.log('🔍 === 환경 변수 디버그 시작 ===');

// 1. 현재 작업 디렉토리 확인
console.log('\n📁 === 디렉토리 정보 ===');
console.log('Current Working Directory:', process.cwd());
console.log('Script Directory:', __dirname);

// 2. .env 파일 위치 확인
const possibleEnvPaths = [
  path.join(process.cwd(), '.env'),
  path.join(__dirname, '.env'),
  path.join(__dirname, '..', '.env'),
  path.join(process.cwd(), 'backend', '.env'),
  path.join(__dirname, '..', '..', '.env')
];

console.log('\n🔍 === .env 파일 검색 ===');
let envFilePath = null;

for (const envPath of possibleEnvPaths) {
  const exists = fs.existsSync(envPath);
  console.log(`${exists ? '✅' : '❌'} ${envPath}`);
  
  if (exists && !envFilePath) {
    envFilePath = envPath;
  }
}

if (!envFilePath) {
  console.log('\n❌ .env 파일을 찾을 수 없습니다!');
  console.log('\n🔧 해결 방법:');
  console.log('1. backend 폴더에 .env 파일 생성');
  console.log('2. 아래 내용을 복사하여 저장:');
  
  console.log('\n--- .env 파일 내용 ---');
  console.log(`NODE_ENV=development
PORT=3001
SUPABASE_URL=https://sudaayydlangiqfguvhm.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1ZGFheXlkbGFuZ2lxZmd1dmhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA5NTAzMDIsImV4cCI6MjA2NjUyNjMwMn0.w7SZPEAA7i9TZC-ICmo3PQO_3zfGSSg6ACRLI9B4wUI
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1ZGFheXlkbGFuZ2lxZmd1dmhtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDk1MDMwMiwiZXhwIjoyMDY2NTI2MzAyfQ.afrVLyGt5h1oIZNhffG34DoGxYeyBXYgH9JVeHJiwHI
JWT_SECRET=34638c3a6908b1eddf7dad27ddbb17534d73ea6c29b9aca16701267cf1d606d13295bf2536ca115602aed6f91f18776609542f8a18b584106e4f598d47f44ca0`);
  
  process.exit(1);
}

console.log(`\n✅ .env 파일 발견: ${envFilePath}`);

// 3. .env 파일 내용 확인
console.log('\n📖 === .env 파일 내용 ===');
try {
  const envContent = fs.readFileSync(envFilePath, 'utf8');
  const lines = envContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));
  
  console.log(`파일 크기: ${envContent.length} bytes`);
  console.log(`설정 라인 수: ${lines.length}`);
  
  // 주요 변수 확인
  const importantVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'JWT_SECRET'];
  
  for (const varName of importantVars) {
    const line = lines.find(l => l.startsWith(`${varName}=`));
    if (line) {
      const value = line.split('=')[1];
      console.log(`✅ ${varName}: ${value ? value.substring(0, 20) + '...' : '(empty)'}`);
    } else {
      console.log(`❌ ${varName}: 누락`);
    }
  }
} catch (error) {
  console.error('❌ .env 파일 읽기 실패:', error.message);
}

// 4. dotenv 로딩 테스트
console.log('\n🔄 === dotenv 로딩 테스트 ===');

// 기존 환경 변수 초기화
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;
delete process.env.JWT_SECRET;

console.log('로딩 전 환경 변수:', {
  SUPABASE_URL: process.env.SUPABASE_URL || 'undefined',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || 'undefined',
  JWT_SECRET: process.env.JWT_SECRET || 'undefined'
});

// dotenv 로딩
const result = dotenv.config({ path: envFilePath });

if (result.error) {
  console.error('❌ dotenv 로딩 실패:', result.error.message);
} else {
  console.log('✅ dotenv 로딩 성공');
  console.log('로딩된 변수 수:', Object.keys(result.parsed || {}).length);
}

// 5. 로딩 후 환경 변수 확인
console.log('\n✅ === 로딩 후 환경 변수 ===');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ 설정됨' : '❌ 누락');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ 설정됨' : '❌ 누락');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✅ 설정됨' : '❌ 누락');

if (process.env.SUPABASE_URL) {
  console.log('SUPABASE_URL 값:', process.env.SUPABASE_URL.substring(0, 30) + '...');
}

// 6. 데이터베이스 연결 테스트
console.log('\n🔗 === 데이터베이스 연결 테스트 ===');

if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  try {
    const { createClient } = require('@supabase/supabase-js');
    
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    console.log('✅ Supabase 클라이언트 생성 성공');
    
    // 간단한 연결 테스트
    supabase.from('users').select('count', { count: 'exact', head: true })
      .then(({ data, error }) => {
        if (error) {
          console.log('⚠️ 연결 테스트:', error.message);
        } else {
          console.log('🎉 데이터베이스 연결 성공!');
        }
      })
      .catch(err => {
        console.log('❌ 연결 테스트 실패:', err.message);
      });
      
  } catch (error) {
    console.error('❌ Supabase 클라이언트 생성 실패:', error.message);
  }
} else {
  console.log('❌ 환경 변수가 설정되지 않아 연결 테스트를 건너뜁니다');
}

// 7. 권장 수정사항
console.log('\n💡 === 권장 해결책 ===');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.log('1. backend/.env 파일 생성:');
  console.log('   cd backend && touch .env');
  console.log('');
  console.log('2. 다음 내용을 backend/.env 파일에 저장:');
  console.log('');
  console.log('SUPABASE_URL=https://sudaayydlangiqfguvhm.supabase.co');
  console.log('SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1ZGFheXlkbGFuZ2lxZmd1dmhtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDk1MDMwMiwiZXhwIjoyMDY2NTI2MzAyfQ.afrVLyGt5h1oIZNhffG34DoGxYeyBXYgH9JVeHJiwHI');
  console.log('JWT_SECRET=34638c3a6908b1eddf7dad27ddbb17534d73ea6c29b9aca16701267cf1d606d13295bf2536ca115602aed6f91f18776609542f8a18b584106e4f598d47f44ca0');
  console.log('');
  console.log('3. 서버 재시작:');
  console.log('   npm run dev');
} else {
  console.log('✅ 환경 변수가 올바르게 설정되었습니다!');
  console.log('🎉 DatabaseService가 정상적으로 작동해야 합니다.');
}

console.log('\n🔍 === 디버그 완료 ===');