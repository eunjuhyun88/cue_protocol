// ============================================================================
// 📁 src/lib/crypto-utils.ts
// 🔐 암호화 유틸리티 함수들
// ============================================================================

/**
 * 간단한 해시 함수 (실제로는 더 강력한 알고리즘 사용 권장)
 */
export const simpleHash = (input: string): string => {
  let hash = 0;
  if (input.length === 0) return hash.toString();
  
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 32bit integer로 변환
  }
  
  return Math.abs(hash).toString(16);
};

/**
 * UUID v4 생성
 */
export const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

/**
 * 랜덤 문자열 생성
 */
export const generateRandomString = (length: number): string => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  
  return result;
};

/**
 * Base64 인코딩/디코딩 (브라우저 안전)
 */
export const base64 = {
  encode: (str: string): string => {
    try {
      return btoa(unescape(encodeURIComponent(str)));
    } catch (error) {
      console.error('Base64 인코딩 실패:', error);
      return '';
    }
  },
  
  decode: (str: string): string => {
    try {
      return decodeURIComponent(escape(atob(str)));
    } catch (error) {
      console.error('Base64 디코딩 실패:', error);
      return '';
    }
  }
};

/**
 * 간단한 대칭 암호화 (XOR 기반 - 실제로는 AES 등 사용 권장)
 */
export const simpleEncrypt = (text: string, key: string): string => {
  let encrypted = '';
  const keyLength = key.length;
  
  for (let i = 0; i < text.length; i++) {
    const textChar = text.charCodeAt(i);
    const keyChar = key.charCodeAt(i % keyLength);
    encrypted += String.fromCharCode(textChar ^ keyChar);
  }
  
  return base64.encode(encrypted);
};

/**
 * 간단한 대칭 복호화
 */
export const simpleDecrypt = (encryptedText: string, key: string): string => {
  const decoded = base64.decode(encryptedText);
  let decrypted = '';
  const keyLength = key.length;
  
  for (let i = 0; i < decoded.length; i++) {
    const encryptedChar = decoded.charCodeAt(i);
    const keyChar = key.charCodeAt(i % keyLength);
    decrypted += String.fromCharCode(encryptedChar ^ keyChar);
  }
  
  return decrypted;
};

/**
 * 브라우저 Web Crypto API 사용 가능 여부 확인
 */
export const isWebCryptoSupported = (): boolean => {
  return !!(window.crypto && window.crypto.subtle);
};

/**
 * Web Crypto API를 사용한 키 생성
 */
export const generateCryptoKey = async (): Promise<CryptoKey | null> => {
  if (!isWebCryptoSupported()) {
    console.warn('Web Crypto API가 지원되지 않습니다');
    return null;
  }
  
  try {
    return await window.crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256,
      },
      true, // extractable
      ['encrypt', 'decrypt']
    );
  } catch (error) {
    console.error('암호화 키 생성 실패:', error);
    return null;
  }
};

/**
 * Web Crypto API를 사용한 데이터 암호화
 */
export const encryptData = async (data: string, key: CryptoKey): Promise<string | null> => {
  if (!isWebCryptoSupported()) {
    return simpleEncrypt(data, 'fallback-key');
  }
  
  try {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encodedData = new TextEncoder().encode(data);
    
    const encrypted = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      encodedData
    );
    
    // IV와 암호화된 데이터를 결합
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    
    return base64.encode(String.fromCharCode(...combined));
  } catch (error) {
    console.error('데이터 암호화 실패:', error);
    return null;
  }
};

/**
 * Web Crypto API를 사용한 데이터 복호화
 */
export const decryptData = async (encryptedData: string, key: CryptoKey): Promise<string | null> => {
  if (!isWebCryptoSupported()) {
    return simpleDecrypt(encryptedData, 'fallback-key');
  }
  
  try {
    const decoded = base64.decode(encryptedData);
    const combined = new Uint8Array(decoded.length);
    
    for (let i = 0; i < decoded.length; i++) {
      combined[i] = decoded.charCodeAt(i);
    }
    
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    
    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      data
    );
    
    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error('데이터 복호화 실패:', error);
    return null;
  }
};

/**
 * 디지털 서명 생성
 */
export const signData = async (data: string, privateKey: CryptoKey): Promise<string | null> => {
  if (!isWebCryptoSupported()) {
    return simpleHash(data + 'signature');
  }
  
  try {
    const encodedData = new TextEncoder().encode(data);
    const signature = await window.crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      privateKey,
      encodedData
    );
    
    return base64.encode(String.fromCharCode(...new Uint8Array(signature)));
  } catch (error) {
    console.error('디지털 서명 생성 실패:', error);
    return null;
  }
};

/**
 * 디지털 서명 검증
 */
export const verifySignature = async (
  data: string, 
  signature: string, 
  publicKey: CryptoKey
): Promise<boolean> => {
  if (!isWebCryptoSupported()) {
    return simpleHash(data + 'signature') === signature;
  }
  
  try {
    const encodedData = new TextEncoder().encode(data);
    const decodedSignature = base64.decode(signature);
    const signatureBuffer = new Uint8Array(decodedSignature.length);
    
    for (let i = 0; i < decodedSignature.length; i++) {
      signatureBuffer[i] = decodedSignature.charCodeAt(i);
    }
    
    return await window.crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      publicKey,
      signatureBuffer,
      encodedData
    );
  } catch (error) {
    console.error('디지털 서명 검증 실패:', error);
    return false;
  }
};

/**
 * 패스워드 해싱 (PBKDF2)
 */
export const hashPassword = async (password: string, salt?: string): Promise<string | null> => {
  if (!isWebCryptoSupported()) {
    return simpleHash(password + (salt || 'default-salt'));
  }
  
  try {
    const saltBuffer = salt 
      ? new TextEncoder().encode(salt)
      : window.crypto.getRandomValues(new Uint8Array(16));
    
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );
    
    const derivedBits = await window.crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: saltBuffer,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      256
    );
    
    const hashArray = Array.from(new Uint8Array(derivedBits));
    const saltArray = Array.from(saltBuffer);
    
    return base64.encode(
      String.fromCharCode(...saltArray) + 
      String.fromCharCode(...hashArray)
    );
  } catch (error) {
    console.error('패스워드 해싱 실패:', error);
    return null;
  }
};

/**
 * 체크섬 계산
 */
export const calculateChecksum = (data: string): string => {
  return simpleHash(data).substring(0, 8);
};

/**
 * 안전한 랜덤 바이트 생성
 */
export const generateSecureRandomBytes = (length: number): Uint8Array => {
  if (window.crypto && window.crypto.getRandomValues) {
    return window.crypto.getRandomValues(new Uint8Array(length));
  } else {
    // Fallback to Math.random (less secure)
    const bytes = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
    return bytes;
  }
};

/**
 * 데이터 무결성 검증
 */
export const verifyIntegrity = (data: string, expectedChecksum: string): boolean => {
  const actualChecksum = calculateChecksum(data);
  return actualChecksum === expectedChecksum;
};

/**
 * 민감한 데이터 마스킹
 */
export const maskSensitiveData = (data: string, visibleChars: number = 4): string => {
  if (data.length <= visibleChars * 2) {
    return '*'.repeat(data.length);
  }
  
  const start = data.substring(0, visibleChars);
  const end = data.substring(data.length - visibleChars);
  const middle = '*'.repeat(data.length - visibleChars * 2);
  
  return start + middle + end;
};