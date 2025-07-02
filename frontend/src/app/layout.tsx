// frontend/src/app/layout.tsx  
// 🔧 수정: 메타데이터를 여기서 관리 (서버 컴포넌트)
import './globals.css'
import type { Metadata } from 'next'

// ✅ 서버 컴포넌트에서 metadata export 가능
export const metadata: Metadata = {
  title: 'CUE Protocol - AI 개인화 플랫폼',
  description: 'Web3 AI 개인화 플랫폼으로 블록체인 기반 신원 인증과 개인화된 AI 어시스턴트를 제공합니다.',
  keywords: 'AI, Web3, 블록체인, 개인화, WebAuthn, CUE Protocol',
  viewport: 'width=device-width, initial-scale=1',
  themeColor: '#3b82f6',
  openGraph: {
    title: 'CUE Protocol - AI 개인화 플랫폼',
    description: 'Web3 AI 개인화 플랫폼으로 블록체인 기반 신원 인증과 개인화된 AI 어시스턴트를 제공합니다.',
    type: 'website',
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      </head>
      <body className="bg-gray-50 antialiased">
        {children}
      </body>
    </html>
  )
}