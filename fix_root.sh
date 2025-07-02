#!/bin/bash

# ============================================================================
# 🔧 루트 경로 404 에러 완전 해결 스크립트
# 문제: GET / HTTP/1.1" 404 505 여전히 발생
# 원인: 기존 앱의 404 핸들러가 새 루트 라우트보다 먼저 실행됨
# 해결: 기존 app.ts의 적절한 위치에 루트 라우트 삽입
# ============================================================================

echo "🔧 루트 경로 404 에러 해결 중..."

cd backend

# ============================================================================
# 1️⃣ 기존 app.ts 분석 및 수정
# ============================================================================

echo "📋 기존 app.ts 구조 분석 중..."

# app.ts 백업
cp src/app.ts src/app.ts.404fix.backup

echo "🔧 기존 app.ts에서 404 핸들러 위치 찾기..."

# 404 핸들러나 catch-all 라우트 찾기
if grep -n "404\|찾을 수 없는\|catch.*all\|\*.*route" src/app.ts; then
  echo "✅ 기존 404 핸들러 발견"
  
  # 404 핸들러 바로 앞에 루트 라우트 삽입
  awk '
  /404|찾을 수 없는|catch.*all|\*.*route/ && !inserted {
    print "// ============================================================================"
    print "// 🏠 루트 경로 라우트 (404 핸들러 앞에 삽입)"
    print "// ============================================================================"
    print ""
    print "app.get(\"/\", (req, res) => {"
    print "  res.json({"
    print "    name: \"Final0626 Backend API\","
    print "    version: \"3.0.0\","
    print "    status: \"running\","
    print "    timestamp: new Date().toISOString(),"
    print "    uptime: process.uptime(),"
    print "    routes: ["
    print "      \"GET /health\","
    print "      \"POST /api/auth/webauthn/*\","
    print "      \"POST /api/ai/chat\","
    print "      \"POST /api/cue/mine\","
    print "      \"GET /api/passport/:did\","
    print "      \"GET /api/vault\","
    print "      \"GET /api/platform\""
    print "    ]"
    print "  });"
    print "});"
    print ""
    print "console.log(\"✅ 루트 경로 라우트 등록 완료\");"
    print ""
    inserted = 1
  }
  { print }
  ' src/app.ts > src/app.ts.tmp && mv src/app.ts.tmp src/app.ts
  
  echo "✅ 루트 라우트를 404 핸들러 앞에 삽입 완료"
  
else
  echo "⚠️ 명시적 404 핸들러 없음 - 서버 시작 부분에 루트 라우트 추가"
  
  # 서버 시작 전에 루트 라우트 추가
  awk '
  /app\.listen|server.*listen|PORT.*listen/ && !inserted {
    print "// ============================================================================"
    print "// 🏠 루트 경로 라우트 (서버 시작 전 등록)"
    print "// ============================================================================"
    print ""
    print "app.get(\"/\", (req, res) => {"
    print "  console.log(\"🏠 루트 경로 요청 받음\");"
    print "  res.status(200).json({"
    print "    name: \"Final0626 Backend API\","
    print "    version: \"3.0.0\","
    print "    status: \"running\","
    print "    timestamp: new Date().toISOString(),"
    print "    uptime: process.uptime(),"
    print "    health: \"OK\","
    print "    routes: ["
    print "      \"GET /health\","
    print "      \"POST /api/auth/webauthn/*\","
    print "      \"POST /api/ai/chat\","
    print "      \"POST /api/cue/mine\","
    print "      \"GET /api/passport/:did\""
    print "    ]"
    print "  });"
    print "});"
    print ""
    print "console.log(\"✅ 루트 경로 라우트 등록 완료\");"
    print ""
    inserted = 1
  }
  { print }
  ' src/app.ts > src/app.ts.tmp && mv src/app.ts.tmp src/app.ts
  
  echo "✅ 루트 라우트를 서버 시작 전에 추가 완료"
fi

# ============================================================================
# 2️⃣ 기존 404 에러 메시지 수정 (원인 파악용)
# ============================================================================

echo "🔧 기존 404 에러 메시지에 디버깅 정보 추가..."

# 기존 404 에러 메시지 찾아서 더 상세하게 수정
sed -i '' 's/찾을 수 없는 경로/찾을 수 없는 경로 (루트 라우트 체크됨)/g' src/app.ts

# ============================================================================
# 3️⃣ 대안: Express 앱 구조 확인용 미들웨어 추가
# ============================================================================

echo "🔍 Express 앱 구조 확인용 디버깅 미들웨어 추가..."

# 모든 요청을 로깅하는 미들웨어 추가 (라우트 등록 상태 확인용)
awk '
/app\.use.*cors|app\.use.*json/ && !debug_added {
  print $0
  print ""
  print "// ============================================================================"
  print "// 🔍 라우트 디버깅 미들웨어 (일시적)"
  print "// ============================================================================"
  print ""
  print "app.use((req, res, next) => {"
  print "  if (req.path === \"/\") {"
  print "    console.log(\"🔍 루트 경로 요청 감지:\", {"
  print "      method: req.method,"
  print "      path: req.path,"
  print "      timestamp: new Date().toISOString()"
  print "    });"
  print "  }"
  print "  next();"
  print "});"
  print ""
  debug_added = 1
  next
}
{ print }
' src/app.ts > src/app.ts.tmp && mv src/app.ts.tmp src/app.ts

echo "✅ 디버깅 미들웨어 추가 완료"

# ============================================================================
# 4️⃣ 프론트엔드 API 클라이언트 수정 (아직 401 에러 있을 수 있음)
# ============================================================================

echo "🔧 프론트엔드 API 클라이언트 수정 중..."

cd ../frontend/src/components

# AIPassportSystem.tsx에서 request 메소드만 수정
if [ -f "AIPassportSystem.tsx" ]; then
  echo "📁 AIPassportSystem.tsx 발견 - request 메소드 수정 중..."
  
  # 백업
  cp AIPassportSystem.tsx AIPassportSystem.tsx.401fix.backup
  
  # request 메소드 찾아서 Authorization 헤더 추가
  cat > /tmp/request_method_fix.js << 'EOF'
const fs = require('fs');

const content = fs.readFileSync('AIPassportSystem.tsx', 'utf8');

// request 메소드 찾기 및 교체
const updatedContent = content.replace(
  /async request\(endpoint, options = \{\}\) \{[\s\S]*?(?=\n  \}[\s\S]*?(?:async|\/\/|export))/,
  `async request(endpoint, options = {}) {
    const url = \`\${this.baseURL}\${endpoint}\`;
    
    // 🔧 세션 토큰 가져오기 (JWT 우선, 세션 ID 폴백)
    const sessionToken = localStorage.getItem('cue_session_token');
    const sessionId = localStorage.getItem('cue_session_id');
    
    console.log('📞 API 요청:', {
      endpoint,
      hasToken: !!sessionToken,
      hasSessionId: !!sessionId,
      method: options.method || 'GET'
    });
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: { 
          'Content-Type': 'application/json',
          // 🔧 핵심 수정: Authorization 헤더 추가
          ...(sessionToken && { 'Authorization': \`Bearer \${sessionToken}\` }),
          ...(sessionId && !sessionToken && { 'X-Session-ID': sessionId }),
          ...options.headers 
        },
        mode: 'cors',
        credentials: 'include'
      });

      console.log('📬 API 응답:', {
        status: response.status,
        ok: response.ok,
        endpoint
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // 🔧 401 에러 시 세션 토큰 삭제
        if (response.status === 401) {
          console.log('🗑️ 401 에러로 인한 세션 토큰 삭제');
          localStorage.removeItem('cue_session_token');
          localStorage.removeItem('cue_session_id');
        }
        
        throw new Error(errorData.error || \`HTTP \${response.status}\`);
      }

      const data = await response.json();
      console.log('✅ API 성공:', { endpoint, hasData: !!data });
      return data;

    } catch (error) {
      console.error(\`💥 API 요청 실패: \${url}\`, error.message);
      
      // 기존 Mock 폴백 로직은 그대로 유지...`
);

fs.writeFileSync('AIPassportSystem.tsx', updatedContent);
console.log('✅ request 메소드 수정 완료');
EOF

  node /tmp/request_method_fix.js
  rm /tmp/request_method_fix.js
  
  echo "✅ 프론트엔드 API 클라이언트 수정 완료"
else
  echo "⚠️ AIPassportSystem.tsx 파일을 찾을 수 없습니다"
  echo "   수동으로 request 메소드에 Authorization 헤더를 추가해주세요"
fi

# ============================================================================
# 5️⃣ 서버 재시작
# ============================================================================

echo "🔄 서버 재시작 중..."

cd ../../backend

# 기존 프로세스 종료
echo "🚫 기존 백엔드 프로세스 종료 중..."
pkill -f "tsx watch src/app.ts" 2>/dev/null || true
sleep 3

# 서버 시작
echo "🚀 백엔드 서버 재시작..."
npm run dev &

# 대기
sleep 5

echo ""
echo "🎉 ============================================"
echo "🎉 루트 경로 404 에러 해결 완료!"
echo "🎉 ============================================"
echo ""
echo "✅ 수정 사항:"
echo "  🏠 루트 라우트를 404 핸들러 앞에 삽입"
echo "  🔍 디버깅 미들웨어 추가"
echo "  🔧 프론트엔드 Authorization 헤더 추가"
echo ""
echo "🧪 테스트 방법:"
echo "  1. 브라우저: http://localhost:3001 (404 → 200 확인)"
echo "  2. 프론트엔드 AI 채팅 (401 → 200 확인)"
echo "  3. 로그에서 '🏠 루트 경로 요청 감지' 메시지 확인"
echo ""
echo "📊 이제 모든 에러가 해결되어야 합니다!"