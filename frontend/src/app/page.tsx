//  // ============================================================================
//  // 📁 src/app/page.tsx
//  // 🌐 AI Passport 시스템 메인 페이지
//  // ============================================================================
//  // 이 페이지는 AI Passport 시스템의 메인 인터페이스로,
//  // 사용자 인증 상태에 따라 등록 흐름 또는 메인 대시보드를
//  // 렌더링합니다.
//  // 사용자 인증 상태는 클라이언트 측에서 관리되며,
//  // 등록 흐름은 사용자 DID 및 지갑 주소를 입력받아
//  // WebAuthn을 통해 인증을 처리합니다.
//  // 메인 대시보드는 AI 채팅 인터페이스와 데이터 볼트
//  // 관리 기능을 포함합니다.
//  // 이 페이지는 Next.js의 동적 임포트를 사용하여
//  // WebAuthn 라이브러리 오류를 방지하고,
//  // 로딩 상태를 표시합니다.
//  // 또한, Suspense를 사용하여 비동기 컴포넌트를
//  // 렌더링합니다.
//  // ============================================================================
//
'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

// Dynamic import로 WebAuthn 라이브러리 오류 방지
const AIPassportSystem = dynamic(
  () => import('@/components/AIPassportSystem'),
  { 
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-gray-600">AI Passport 시스템 로딩 중...</p>
        </div>
      </div>
    )
  }
)

export default function HomePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AIPassportSystem />
    </Suspense>
  )
}
