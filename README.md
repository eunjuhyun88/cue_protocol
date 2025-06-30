# 🚀 Final0626 AI Passport + CUE Token System

완전한 AI 기반 개인화 시스템으로 WebAuthn 인증, CUE 토큰 마이닝, RAG-DAG 데이터 볼트를 통합한 차세대 AI Passport 플랫폼입니다.

## ✨ 주요 기능

- 🔐 **WebAuthn 패스키 인증**: 생체 인증 기반 보안 로그인
- 🤖 **AI 채팅 시스템**: OpenAI/Claude/Gemini 통합 개인화 AI
- ⚡ **CUE 토큰 마이닝**: AI 상호작용을 통한 토큰 획득 시스템
- 🗄️ **데이터 볼트**: RAG-DAG 구조 개인화 데이터 저장소
- 📱 **완전한 모바일 최적화**: 반응형 PWA 지원

## 🏗️ 기술 스택

### 프론트엔드
- **Next.js 14** (App Router)
- **TypeScript** + **Tailwind CSS**
- **React Hooks** + **Zustand**

### 백엔드
- **Express.js** + **TypeScript**
- **Supabase** (PostgreSQL)
- **SimpleWebAuthn** (패스키 인증)

### AI 연동
- **OpenAI GPT-4**
- **Anthropic Claude**
- **Google Gemini**

## 🚀 빠른 시작

### 1단계: 환경 설정
```bash
# 01-setup-environment.sh 실행 (이미 완료됨)
# 02-create-backend.sh 실행
# 03-create-frontend.sh 실행
# 04-setup-database.sh 실행
```

### 2단계: 개발 서버 실행
```bash
# 루트 디렉토리에서
npm run dev

# 또는 개별 실행
npm run dev:backend  # http://localhost:3001
npm run dev:frontend # http://localhost:3000
```

### 3단계: 환경 변수 설정
1. `backend/.env.example` → `backend/.env` 복사 후 수정
2. `frontend/.env.local.example` → `frontend/.env.local` 복사 후 수정

## 📁 프로젝트 구조

```
final0626-project/
├── backend/           # Express.js API 서버
├── frontend/          # Next.js 웹 애플리케이션
├── shared/            # 공유 타입 및 유틸리티
├── docs/              # 프로젝트 문서
├── scripts/           # 설정 및 배포 스크립트
└── database/          # 데이터베이스 스키마 및 마이그레이션
```

## 🔧 설정 가이드

### Supabase 설정
1. https://supabase.com 에서 새 프로젝트 생성
2. `database/schema.sql` 실행
3. API 키를 환경 변수에 설정

### AI API 설정
1. OpenAI, Anthropic, Google AI API 키 발급
2. 환경 변수에 설정

## 📚 문서

- [API 문서](docs/api/README.md)
- [사용자 가이드](docs/user-guide/README.md)
- [개발자 가이드](docs/development/README.md)

## 🤝 기여하기

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 라이선스

MIT License - 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.
