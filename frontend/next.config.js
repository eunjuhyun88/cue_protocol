// ============================================================================
// 📁 frontend/next.config.js (수정됨)
// 수정사항: appDir 경고 제거, 서버 컴포넌트에서 클라이언트 전용 모듈 제외
// ============================================================================

/** @type {import('next').NextConfig} */
const nextConfig = {
  // ✅ experimental.appDir 제거 (Next.js 14에서는 기본값)
  experimental: {
    // serverComponentsExternalPackages 추가로 서버에서 특정 패키지 제외
    serverComponentsExternalPackages: [
      '@simplewebauthn/server',
      'ioredis',
      'crypto'
    ]
  },
  
  // 웹팩 설정 - 클라이언트에서 서버 전용 모듈 제외
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // 클라이언트 번들에서 서버 전용 모듈 제외
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
        ioredis: false
      };
      
      // 서버 전용 패키지들을 클라이언트에서 완전히 제외
      config.externals = [
        ...(config.externals || []),
        '@simplewebauthn/server',
        'ioredis',
        'redis'
      ];
    }
    
    return config;
  },
  
  // TypeScript 설정
  typescript: {
    // 빌드 시 타입 에러 무시 (개발 중)
    ignoreBuildErrors: false
  },
  
  // ESLint 설정
  eslint: {
    // 빌드 시 ESLint 에러 무시 (개발 중)
    ignoreDuringBuilds: false
  },
  
  // 환경 변수 설정
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
  },
  
  // 리다이렉트 설정
  async redirects() {
    return [
      // 필요한 리다이렉트 규칙 추가
    ];
  },
  
  // 헤더 설정
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          }
        ]
      }
    ];
  }
};

module.exports = nextConfig;