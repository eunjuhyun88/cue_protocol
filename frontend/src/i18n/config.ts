// ============================================================================
// 🌐 다국어 설정 파일
// 경로: frontend/src/i18n/config.ts
// 연관 파일: frontend/messages/en.json, frontend/messages/ko.json
// ============================================================================

import { notFound } from 'next/navigation';
import { getRequestConfig } from 'next-intl/server';

// 지원하는 언어 목록
export const locales = ['en', 'ko'] as const;
export type Locale = typeof locales[number];

// 기본 언어
export const defaultLocale: Locale = 'en';

export default getRequestConfig(async ({ locale }) => {
  // 지원하지 않는 언어인 경우 404 처리
  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  try {
    // 동적으로 메시지 파일 로드
    const messages = (await import(`../../messages/${locale}.json`)).default;
    
    return {
      messages,
      timeZone: 'Asia/Seoul',
      now: new Date()
    };
  } catch (error) {
    console.error(`Failed to load messages for locale: ${locale}`, error);
    // 기본 언어로 폴백
    const fallbackMessages = (await import(`../../messages/${defaultLocale}.json`)).default;
    return {
      messages: fallbackMessages,
      timeZone: 'Asia/Seoul',
      now: new Date()
    };
  }
});

// 언어 감지 유틸리티
export function detectLocale(): Locale {
  if (typeof window === 'undefined') return defaultLocale;
  
  // 1. URL 파라미터에서 언어 확인
  const urlParams = new URLSearchParams(window.location.search);
  const urlLocale = urlParams.get('lang') as Locale;
  if (urlLocale && locales.includes(urlLocale)) {
    return urlLocale;
  }
  
  // 2. localStorage에서 저장된 언어 확인
  try {
    const savedLocale = localStorage.getItem('preferred-locale') as Locale;
    if (savedLocale && locales.includes(savedLocale)) {
      return savedLocale;
    }
  } catch (error) {
    console.warn('localStorage not available');
  }
  
  // 3. 브라우저 언어 확인
  const browserLocale = navigator.language.slice(0, 2) as Locale;
  if (locales.includes(browserLocale)) {
    return browserLocale;
  }
  
  // 4. 기본 언어 반환
  return defaultLocale;
}

// 언어 변경 유틸리티
export function setLocale(locale: Locale): void {
  if (!locales.includes(locale)) {
    console.warn(`Unsupported locale: ${locale}`);
    return;
  }
  
  try {
    localStorage.setItem('preferred-locale', locale);
    
    // URL 업데이트 (선택사항)
    const url = new URL(window.location.href);
    url.searchParams.set('lang', locale);
    window.history.replaceState({}, '', url.toString());
    
    // 페이지 새로고침으로 언어 적용
    window.location.reload();
  } catch (error) {
    console.error('Failed to set locale:', error);
  }
}