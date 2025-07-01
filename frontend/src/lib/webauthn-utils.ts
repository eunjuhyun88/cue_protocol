// ============================================================================
// 📁 src/lib/webauthn-utils.ts
// 🔐 WebAuthn 유틸리티 함수들
// ============================================================================

/**
 * WebAuthn 지원 여부 확인
 */
export const isWebAuthnSupported = (): boolean => {
  return !!(
    window.PublicKeyCredential &&
    typeof window.PublicKeyCredential === 'function' &&
    window.navigator.credentials
  );
};

/**
 * 플랫폼 인증기 지원 여부 확인 (Touch ID, Face ID, Windows Hello 등)
 */
export const isPlatformAuthenticatorSupported = async (): Promise<boolean> => {
  if (!isWebAuthnSupported()) return false;
  
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch (error) {
    console.warn('플랫폼 인증기 지원 확인 실패:', error);
    return false;
  }
};

/**
 * 조건부 UI 지원 여부 확인
 */
export const isConditionalMediationSupported = async (): Promise<boolean> => {
  if (!isWebAuthnSupported()) return false;
  
  try {
    return await PublicKeyCredential.isConditionalMediationAvailable?.() || false;
  } catch (error) {
    console.warn('조건부 UI 지원 확인 실패:', error);
    return false;
  }
};

/**
 * 브라우저별 WebAuthn 지원 정보 반환
 */
export const getBrowserWebAuthnSupport = () => {
  const userAgent = navigator.userAgent;
  const isChrome = /Chrome/.test(userAgent);
  const isFirefox = /Firefox/.test(userAgent);
  const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
  const isEdge = /Edg/.test(userAgent);

  return {
    isSupported: isWebAuthnSupported(),
    browser: {
      chrome: isChrome,
      firefox: isFirefox,
      safari: isSafari,
      edge: isEdge
    },
    features: {
      platformAuthenticator: true, // 대부분의 모던 브라우저에서 지원
      conditionalUI: isChrome || isEdge, // Chrome과 Edge에서 주로 지원
      crossOrigin: isChrome || isFirefox || isEdge
    }
  };
};

/**
 * WebAuthn 에러 메시지 한국어 변환
 */
export const translateWebAuthnError = (error: any): string => {
  const errorName = error.name || error.code;
  
  switch (errorName) {
    case 'NotAllowedError':
      return '사용자가 인증을 취소했거나 시간이 초과되었습니다.';
    
    case 'SecurityError':
      return '보안 오류가 발생했습니다. HTTPS 환경에서 시도해주세요.';
    
    case 'NotSupportedError':
      return '이 기기나 브라우저에서는 생체인증을 지원하지 않습니다.';
    
    case 'InvalidStateError':
      return '이미 등록된 인증기입니다.';
    
    case 'ConstraintError':
      return '요청한 인증 방식을 사용할 수 없습니다.';
    
    case 'UnknownError':
      return '알 수 없는 오류가 발생했습니다.';
    
    case 'AbortError':
      return '인증 과정이 중단되었습니다.';
    
    case 'TimeoutError':
      return '인증 시간이 초과되었습니다.';
    
    default:
      return error.message || '생체인증 중 오류가 발생했습니다.';
  }
};

/**
 * DID 생성 (WebAuthn 크리덴셜 기반)
 */
export const generateDIDFromCredential = (credentialId: string): string => {
  // 간단한 DID 생성 (실제로는 더 복잡한 알고리즘 사용)
  const timestamp = Date.now().toString(36);
  const shortId = credentialId.substring(0, 8);
  return `did:webauthn:${shortId}-${timestamp}`;
};

/**
 * 지갑 주소 생성 (WebAuthn 크리덴셜 기반)
 */
export const generateWalletAddress = (credentialId: string): string => {
  // 간단한 이더리움 스타일 주소 생성 (실제로는 암호화 키 기반)
  const hash = Array.from(credentialId)
    .map(char => char.charCodeAt(0).toString(16))
    .join('')
    .substring(0, 40);
  
  return `0x${hash.padEnd(40, '0')}`;
};

/**
 * WebAuthn 인증기 타입 감지
 */
export const detectAuthenticatorType = (response: any): string => {
  if (!response?.getClientExtensionResults) return 'unknown';
  
  const extensions = response.getClientExtensionResults();
  
  if (extensions.appid) return 'external';
  if (extensions.uvm) return 'platform';
  
  // Authenticator attachment 확인
  const authenticatorData = response.response?.authenticatorData;
  if (authenticatorData) {
    const flags = new Uint8Array(authenticatorData)[32];
    const userPresent = !!(flags & 0x01);
    const userVerified = !!(flags & 0x04);
    
    if (userVerified) return 'platform';
    if (userPresent) return 'external';
  }
  
  return 'unknown';
};

/**
 * 인증기 정보 추출
 */
export const extractAuthenticatorInfo = (response: any) => {
  try {
    const authenticatorData = new Uint8Array(response.response.authenticatorData);
    
    // Flags 파싱
    const flags = authenticatorData[32];
    const userPresent = !!(flags & 0x01);
    const userVerified = !!(flags & 0x04);
    const attestedCredentialData = !!(flags & 0x40);
    const extensionData = !!(flags & 0x80);
    
    // Counter 추출
    const counter = new DataView(authenticatorData.buffer, 33, 4).getUint32(0, false);
    
    return {
      userPresent,
      userVerified,
      attestedCredentialData,
      extensionData,
      counter,
      rpIdHash: Array.from(authenticatorData.slice(0, 32))
        .map(b => b.toString(16).padStart(2, '0'))
        .join(''),
      credentialId: response.id,
      type: detectAuthenticatorType(response)
    };
  } catch (error) {
    console.error('인증기 정보 추출 실패:', error);
    return null;
  }
};

/**
 * Base64URL 인코딩/디코딩 유틸리티
 */
export const base64url = {
  encode: (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  },
  
  decode: (str: string): ArrayBuffer => {
    str = (str + '===').slice(0, str.length + (str.length % 4));
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(str);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
};

/**
 * WebAuthn 옵션 검증
 */
export const validateWebAuthnOptions = (options: any): boolean => {
  try {
    // 필수 필드 확인
    if (!options.challenge) return false;
    if (!options.rp?.name) return false;
    if (!options.user?.id) return false;
    if (!options.user?.name) return false;
    if (!options.user?.displayName) return false;
    if (!Array.isArray(options.pubKeyCredParams)) return false;
    
    return true;
  } catch (error) {
    console.error('WebAuthn 옵션 검증 실패:', error);
    return false;
  }
};

/**
 * 디바이스 정보 수집
 */
export const getDeviceInfo = () => {
  return {
    platform: navigator.platform,
    userAgent: navigator.userAgent,
    language: navigator.language,
    cookieEnabled: navigator.cookieEnabled,
    onLine: navigator.onLine,
    hardwareConcurrency: navigator.hardwareConcurrency,
    deviceMemory: (navigator as any).deviceMemory || 'unknown',
    screen: {
      width: screen.width,
      height: screen.height,
      colorDepth: screen.colorDepth
    },
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timestamp: new Date().toISOString()
  };
};