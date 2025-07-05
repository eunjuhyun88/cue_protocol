// ============================================================================
// ⚙️ Next.js 설정 파일 (i18n 포함)
// 경로: frontend/next.config.js
// ============================================================================

const withNextIntl = require('next-intl/plugin')('./src/i18n/config.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // 기존 설정 유지
  experimental: {
    appDir: true,
  },
  
  // 이미지 최적화
  images: {
    domains: ['localhost', 'your-domain.com'],
    unoptimized: process.env.NODE_ENV === 'development'
  },
  
  // 환경 변수
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  
  // 리다이렉트 설정
  async redirects() {
    return [
      {
        source: '/',
        destination: '/en',
        permanent: false,
        has: [
          {
            type: 'header',
            key: 'accept-language',
            value: '^(?!.*ko).*'
          }
        ]
      }
    ];
  },
  
  // 헤더 설정
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          }
        ],
      },
    ];
  }
};

module.exports = withNextIntl(nextConfig);