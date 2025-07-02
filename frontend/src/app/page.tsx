// frontend/src/app/page.tsx
// 🔧 수정: metadata 제거, 순수 클라이언트 컴포넌트로 변경
'use client';

import React from 'react';
import { AIPassportSystem } from '@/components/AIPassportSystem';

// 🚨 중요: metadata는 layout.tsx로 이동해야 함
// Next.js에서 'use client' 컴포넌트는 metadata export 불가능

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <AIPassportSystem />
    </main>
  );
}