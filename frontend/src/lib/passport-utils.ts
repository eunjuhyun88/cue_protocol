// ============================================================================
// 📁 src/lib/passport-utils.ts
// 🎫 AI Passport 유틸리티 함수들
// ============================================================================

import type { UnifiedAIPassport, PersonalityProfile, UnifiedDataVault } from '../types/passport.types';

/**
 * Trust Score 계산
 */
export const calculateTrustScore = (passport: Partial<UnifiedAIPassport>): number => {
  let score = 0;
  
  // 기본 인증 (40점)
  if (passport.biometricVerified) score += 20;
  if (passport.passkeyRegistered) score += 20;
  
  // 데이터 볼트 (30점)
  const vaultCount = passport.dataVaults?.length || 0;
  score += Math.min(vaultCount * 5, 30);
  
  // 연결된 플랫폼 (20점)
  const platformCount = passport.connectedPlatforms?.length || 0;
  score += Math.min(platformCount * 4, 20);
  
  // 활동 이력 (10점)
  const contextCount = passport.contextHistory?.length || 0;
  score += Math.min(contextCount * 2, 10);
  
  return Math.min(score, 100);
};

/**
 * Passport 레벨 결정
 */
export const determinePassportLevel = (trustScore: number): string => {
  if (trustScore >= 90) return 'Enterprise';
  if (trustScore >= 75) return 'Premium';
  if (trustScore >= 50) return 'Verified';
  return 'Basic';
};

/**
 * 성격 프로필 분석
 */
export const analyzePersonalityProfile = (profile: PersonalityProfile) => {
  const analysis = {
    strengths: [] as string[],
    preferences: [] as string[],
    recommendedInteractions: [] as string[]
  };

  // MBTI 기반 분석
  if (profile.type.includes('INTJ') || profile.type.includes('INTP')) {
    analysis.strengths.push('논리적 사고', '체계적 접근', '독립적 학습');
    analysis.preferences.push('구체적 데이터', '단계별 설명', '심화 분석');
    analysis.recommendedInteractions.push('기술적 토론', '문제 해결', '전략 수립');
  }
  
  if (profile.type.includes('ENFP') || profile.type.includes('ENFJ')) {
    analysis.strengths.push('창의적 사고', '협업 능력', '소통 스킬');
    analysis.preferences.push('시각적 자료', '대화형 학습', '실제 사례');
    analysis.recommendedInteractions.push('브레인스토밍', '팀 프로젝트', '멘토링');
  }

  // 학습 패턴 분석
  if (profile.learningPattern.includes('Visual')) {
    analysis.preferences.push('다이어그램', '차트', '인포그래픽');
  }
  
  if (profile.learningPattern.includes('Hands-on')) {
    analysis.preferences.push('실습', '시뮬레이션', '인터랙티브');
  }

  return analysis;
};

/**
 * 데이터 볼트 가치 계산
 */
export const calculateVaultValue = (vault: UnifiedDataVault): number => {
  let value = 0;
  
  // 기본 데이터 포인트 가치
  value += vault.dataCount * 0.1;
  
  // 카테고리별 가중치
  const categoryWeights = {
    identity: 2.0,
    professional: 1.8,
    behavioral: 1.5,
    expertise: 1.4,
    social: 1.2,
    preferences: 1.0
  };
  
  value *= categoryWeights[vault.category] || 1.0;
  
  // 사용 빈도 보너스
  value += vault.usageCount * 0.05;
  
  // 암호화 보너스
  if (vault.encrypted) value *= 1.2;
  
  // 접근 레벨에 따른 조정
  if (vault.accessLevel === 'private') value *= 1.3;
  else if (vault.accessLevel === 'selective') value *= 1.1;
  
  return Math.round(value * 100) / 100;
};

/**
 * CUE 토큰 획득량 계산
 */
export const calculateCueEarning = (
  messageLength: number,
  personalityMatch: number,
  dataUtilization: number
): number => {
  let baseCue = Math.min(messageLength / 10, 5); // 메시지 길이 기반 (최대 5 CUE)
  
  // 개인화 매칭 보너스
  baseCue *= (1 + personalityMatch * 0.5);
  
  // 데이터 활용 보너스
  baseCue += dataUtilization * 2;
  
  // 품질 보너스 (랜덤)
  baseCue += Math.random() * 2;
  
  return Math.round(baseCue * 100) / 100;
};

/**
 * Passport 완성도 계산
 */
export const calculateCompleteness = (passport: UnifiedAIPassport): number => {
  let completeness = 0;
  const totalSteps = 10;
  
  // 기본 정보 (20%)
  if (passport.did) completeness += 10;
  if (passport.walletAddress) completeness += 10;
  
  // 인증 (30%)
  if (passport.biometricVerified) completeness += 15;
  if (passport.passkeyRegistered) completeness += 15;
  
  // 프로필 (20%)
  if (passport.personalityProfile?.type) completeness += 10;
  if (passport.personalityProfile?.communicationStyle) completeness += 10;
  
  // 데이터 (20%)
  if (passport.dataVaults.length > 0) completeness += 10;
  if (passport.connectedPlatforms.length > 0) completeness += 10;
  
  // 활동 (10%)
  if (passport.contextHistory.length > 0) completeness += 5;
  if (passport.cueHistory.length > 0) completeness += 5;
  
  return completeness;
};

/**
 * 개인화 추천 생성
 */
export const generatePersonalizationRecommendations = (passport: UnifiedAIPassport): string[] => {
  const recommendations: string[] = [];
  
  // 완성도 기반 추천
  const completeness = calculateCompleteness(passport);
  
  if (completeness < 50) {
    recommendations.push('프로필 정보를 더 자세히 입력해보세요');
  }
  
  if (passport.dataVaults.length < 3) {
    recommendations.push('다양한 데이터 볼트를 생성하여 개인화를 향상시켜보세요');
  }
  
  if (passport.connectedPlatforms.length < 2) {
    recommendations.push('외부 플랫폼을 연결하여 더 풍부한 컨텍스트를 제공해보세요');
  }
  
  if (passport.cueTokens < 100) {
    recommendations.push('AI와 더 많이 대화하여 CUE 토큰을 획득해보세요');
  }
  
  // 성격 기반 추천
  const analysis = analyzePersonalityProfile(passport.personalityProfile);
  recommendations.push(...analysis.recommendedInteractions.map(
    interaction => `${interaction} 활동을 시도해보세요`
  ));
  
  return recommendations.slice(0, 5); // 최대 5개 추천
};

/**
 * 보안 점수 계산
 */
export const calculateSecurityScore = (passport: UnifiedAIPassport): number => {
  let score = 0;
  
  // 생체인증 (40점)
  if (passport.biometricVerified) score += 40;
  
  // 패스키 등록 (30점)
  if (passport.passkeyRegistered) score += 30;
  
  // 암호화된 볼트 (20점)
  const encryptedVaults = passport.dataVaults.filter(v => v.encrypted).length;
  score += Math.min(encryptedVaults * 5, 20);
  
  // 접근 제어 (10점)
  const privateVaults = passport.dataVaults.filter(v => v.accessLevel === 'private').length;
  score += Math.min(privateVaults * 2, 10);
  
  return Math.min(score, 100);
};

/**
 * 활동 통계 계산
 */
export const calculateActivityStats = (passport: UnifiedAIPassport) => {
  const now = new Date();
  const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  return {
    totalInteractions: passport.contextHistory.length,
    weeklyInteractions: passport.contextHistory.filter(
      entry => new Date(entry.timestamp) > lastWeek
    ).length,
    monthlyInteractions: passport.contextHistory.filter(
      entry => new Date(entry.timestamp) > lastMonth
    ).length,
    totalCueEarned: passport.cueHistory
      .filter(entry => entry.source !== 'spent')
      .reduce((sum, entry) => sum + entry.amount, 0),
    averageDailyCue: passport.cueHistory.length > 0 
      ? passport.cueTokens / Math.max(passport.cueHistory.length, 1)
      : 0
  };
};

/**
 * 데이터 볼트 추천
 */
export const recommendDataVaults = (passport: UnifiedAIPassport): string[] => {
  const existingCategories = passport.dataVaults.map(v => v.category);
  const allCategories = ['identity', 'behavioral', 'professional', 'social', 'preferences', 'expertise'];
  
  const missingCategories = allCategories.filter(cat => !existingCategories.includes(cat as any));
  
  const categoryDescriptions = {
    identity: '신원 정보 - 기본 프로필과 인증 데이터',
    behavioral: '행동 패턴 - 사용 습관과 선호도 분석',
    professional: '전문 정보 - 경력과 기술 스킬',
    social: '소셜 데이터 - 네트워크와 관계 정보',
    preferences: '개인 취향 - 관심사와 선호도',
    expertise: '전문 지식 - 특별한 기술과 경험'
  };
  
  return missingCategories.map(cat => 
    categoryDescriptions[cat as keyof typeof categoryDescriptions]
  );
};

/**
 * Passport 데이터 검증
 */
export const validatePassportData = (passport: Partial<UnifiedAIPassport>): { 
  isValid: boolean; 
  errors: string[]; 
} => {
  const errors: string[] = [];
  
  if (!passport.did) {
    errors.push('DID가 필요합니다');
  }
  
  if (!passport.walletAddress) {
    errors.push('지갑 주소가 필요합니다');
  }
  
  if (!passport.personalityProfile?.type) {
    errors.push('성격 유형이 필요합니다');
  }
  
  if (!passport.personalityProfile?.communicationStyle) {
    errors.push('소통 스타일이 필요합니다');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};