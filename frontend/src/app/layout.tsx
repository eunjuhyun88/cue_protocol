// frontend/src/app/layout.tsx
// 🔧 Next.js 15+ 호환 - viewport와 themeColor 분리
import './globals.css'
import type { Metadata, Viewport } from 'next'

// ✅ metadata에서 viewport 관련 속성 제거
export const metadata: Metadata = {
  title: 'CUE Protocol - AI 개인화 플랫폼',
  description: 'Web3 AI 개인화 플랫폼으로 블록체인 기반 신원 인증과 개인화된 AI 어시스턴트를 제공합니다.',
  keywords: 'AI, Web3, 블록체인, 개인화, WebAuthn, CUE Protocol',
  openGraph: {
    title: 'CUE Protocol - AI 개인화 플랫폼',
    description: 'Web3 AI 개인화 플랫폼으로 블록체인 기반 신원 인증과 개인화된 AI 어시스턴트를 제공합니다.',
    type: 'website',
    url: 'https://cue-protocol.com',
    siteName: 'CUE Protocol',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'CUE Protocol - AI 개인화 플랫폼',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CUE Protocol - AI 개인화 플랫폼',
    description: 'Web3 AI 개인화 플랫폼으로 블록체인 기반 신원 인증과 개인화된 AI 어시스턴트를 제공합니다.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

// ✅ viewport를 별도로 export
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#3b82f6' },
    { media: '(prefers-color-scheme: dark)', color: '#1e40af' },
  ],
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
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="bg-gray-50 antialiased">
        {children}
      </body>
    </html>
  )
}