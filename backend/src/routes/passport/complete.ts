// ============================================================================
// 🎫 완전한 AI Passport 시스템 (paste-4.txt 기능 통합)
// 파일: backend/src/routes/passport/complete.ts
// 역할: AI Passport 조회, 업데이트, 성취 시스템, 신뢰도 관리
// ============================================================================

import { Router, Request, Response } from 'express';
import { DatabaseService } from '../../services/database/DatabaseService';
import { SupabaseService } from '../../services/database/SupabaseService';

const router = Router();

// 데이터베이스 서비스 선택
const useDatabase = process.env.SUPABASE_URL && !process.env.SUPABASE_URL.includes('dummy');
const db = useDatabase ? SupabaseService.getInstance() : DatabaseService.getInstance();

// ============================================================================
// 🎫 AI Passport 조회 API
// GET /api/passport/:did
// ============================================================================
router.get('/:did', async (req: Request, res: Response) => {
  try {
    const { did } = req.params;
    
    console.log('🎫 AI Passport 조회 요청:', did);
    
    if (useDatabase) {
      try {
        const { data: user, error } = await db.from('users')
          .select('*')
          .eq('did', did)
          .single();
          
        if (user) {
          const passport = {
            did: user.did,
            username: user.username,
            displayName: user.full_name || user.username,
            trustScore: user.trust_score || 85,
            level: user.passport_level || 'Basic',
            cueBalance: user.cue_tokens || 0,
            totalMined: user.cue_tokens || 0, // 임시로 같은 값 사용
            personalityProfile: user.personality_profile || {
              type: 'INTJ-A (Architect)',
              communicationStyle: 'Direct & Technical',
              learningPattern: 'Visual + Hands-on',
              workingStyle: 'Morning Focus',
              responsePreference: 'Concise with examples',
              decisionMaking: 'Data-driven analysis'
            },
            connectedPlatforms: await getConnectedPlatforms(did),
            achievements: await getUserAchievements(did),
            stats: await getPassportStats(did),
            createdAt: user.created_at,
            lastActive: user.last_login_at || user.updated_at,
            isVerified: user.biometric_verified || false
          };

          return res.json({
            success: true,
            passport,
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('패스포트 조회 실패:', error);
      }
    }
    
    // Mock 패스포트 생성
    const passport = generateMockPassport(did);

    res.json({
      success: true,
      passport,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ AI Passport 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get passport'
    });
  }
});

// ============================================================================
// 🔄 AI Passport 업데이트 API
// PUT /api/passport/:did
// ============================================================================
router.put('/:did', async (req: Request, res: Response) => {
  try {
    const { did } = req.params;
    const updates = req.body;
    
    console.log('🔄 AI Passport 업데이트 요청:', did, Object.keys(updates));
    
    if (useDatabase) {
      try {
        // 사용자 정보 업데이트
        const { data: user, error: userError } = await db.from('users')
          .update({
            username: updates.username,
            full_name: updates.displayName,
            trust_score: updates.trustScore,
            passport_level: updates.level,
            personality_profile: updates.personalityProfile,
            updated_at: new Date().toISOString()
          })
          .eq('did', did)
          .select()
          .single();

        if (userError) throw userError;

        // AI Passport 테이블 업데이트
        const { data: passport, error: passportError } = await db.from('ai_passports')
          .upsert({
            did,
            trust_score: updates.trustScore,
            passport_level: updates.level,
            personality_profile: updates.personalityProfile,
            updated_at: new Date().toISOString(),
            last_activity_at: new Date().toISOString()
          })
          .select()
          .single();

        if (passportError) throw passportError;

        return res.json({
          success: true,
          passport: passport,
          message: 'AI Passport 업데이트 성공'
        });
      } catch (error) {
        console.error('패스포트 업데이트 실패:', error);
      }
    }
    
    // Mock 업데이트
    console.log('📝 Mock AI Passport 업데이트:', did);
    
    res.json({
      success: true,
      passport: { did, ...updates },
      message: 'Mock AI Passport 업데이트 성공'
    });
  } catch (error) {
    console.error('❌ AI Passport 업데이트 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update passport'
    });
  }
});

// ============================================================================
// 🏆 성취 시스템 API
// GET /api/passport/:did/achievements
// ============================================================================
router.get('/:did/achievements', async (req: Request, res: Response) => {
  try {
    const { did } = req.params;
    
    console.log('🏆 성취 목록 조회:', did);
    
    const achievements = await getUserAchievements(did);
    
    res.json({
      success: true,
      achievements,
      summary: {
        total: achievements.length,
        earned: achievements.filter(a => a.earned).length,
        progress: Math.round((achievements.filter(a => a.earned).length / achievements.length) * 100)
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ 성취 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get achievements'
    });
  }
});

// ============================================================================
// 🎯 성취 달성 API
// POST /api/passport/:did/achievements/:achievementId
// ============================================================================
router.post('/:did/achievements/:achievementId', async (req: Request, res: Response) => {
  try {
    const { did, achievementId } = req.params;
    const { progress } = req.body;
    
    console.log('🎯 성취 달성 처리:', did, achievementId);
    
    if (useDatabase) {
      try {
        // 성취 기록 저장
        const { data, error } = await db.from('user_achievements')
          .upsert({
            user_did: did,
            achievement_id: achievementId,
            earned: true,
            earned_at: new Date().toISOString(),
            progress: progress || 100
          })
          .select()
          .single();

        if (error) throw error;

        // CUE 보상 지급
        const achievement = getAchievementInfo(achievementId);
        if (achievement.cueReward > 0) {
          await db.recordCueTransaction({
            user_did: did,
            transaction_type: 'achievement',
            amount: achievement.cueReward,
            description: `Achievement earned: ${achievement.name}`,
            source_platform: 'system',
            metadata: {
              achievement_id: achievementId,
              achievement_name: achievement.name
            }
          });
        }

        return res.json({
          success: true,
          achievement: { ...achievement, earned: true },
          cueReward: achievement.cueReward,
          message: `🎉 성취 달성: ${achievement.name}!`
        });
      } catch (error) {
        console.error('성취 달성 처리 실패:', error);
      }
    }
    
    // Mock 성취 달성
    const achievement = getAchievementInfo(achievementId);
    
    res.json({
      success: true,
      achievement: { ...achievement, earned: true },
      cueReward: achievement.cueReward,
      message: `🎉 Mock 성취 달성: ${achievement.name}!`
    });
  } catch (error) {
    console.error('❌ 성취 달성 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to earn achievement'
    });
  }
});

// ============================================================================
// 📊 AI Passport 통계 API
// GET /api/passport/:did/stats
// ============================================================================
router.get('/:did/stats', async (req: Request, res: Response) => {
  try {
    const { did } = req.params;
    
    console.log('📊 AI Passport 통계 조회:', did);
    
    const stats = await getPassportStats(did);
    
    res.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Passport 통계 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get passport stats'
    });
  }
});

// ============================================================================
// 🌐 연결된 플랫폼 관리 API
// GET /api/passport/:did/platforms
// ============================================================================
router.get('/:did/platforms', async (req: Request, res: Response) => {
  try {
    const { did } = req.params;
    
    console.log('🌐 연결된 플랫폼 조회:', did);
    
    const platforms = await getConnectedPlatforms(did);
    
    res.json({
      success: true,
      platforms,
      summary: {
        total: platforms.length,
        connected: platforms.filter(p => p.connected).length,
        lastSync: platforms.reduce((latest, p) => 
          p.lastSync && (!latest || p.lastSync > latest) ? p.lastSync : latest, null
        )
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ 연결된 플랫폼 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get connected platforms'
    });
  }
});

// ============================================================================
// 📈 신뢰도 점수 업데이트 API
// POST /api/passport/:did/trust-score
// ============================================================================
router.post('/:did/trust-score', async (req: Request, res: Response) => {
  try {
    const { did } = req.params;
    const { action, value, reason } = req.body;
    
    console.log('📈 신뢰도 점수 업데이트:', did, action, value);
    
    if (useDatabase) {
      try {
        // 현재 사용자 정보 조회
        const { data: user, error: userError } = await db.from('users')
          .select('trust_score')
          .eq('did', did)
          .single();

        if (userError) throw userError;

        let newTrustScore = user.trust_score || 85;
        
        // 액션에 따른 점수 계산
        switch (action) {
          case 'increase':
            newTrustScore = Math.min(100, newTrustScore + (value || 1));
            break;
          case 'decrease':
            newTrustScore = Math.max(0, newTrustScore - (value || 1));
            break;
          case 'set':
            newTrustScore = Math.max(0, Math.min(100, value || 85));
            break;
        }

        // 사용자 신뢰도 업데이트
        const { data: updatedUser, error: updateError } = await db.from('users')
          .update({ 
            trust_score: newTrustScore,
            updated_at: new Date().toISOString()
          })
          .eq('did', did)
          .select()
          .single();

        if (updateError) throw updateError;

        // 신뢰도 변경 기록
        await db.from('trust_score_history')
          .insert({
            user_did: did,
            old_score: user.trust_score,
            new_score: newTrustScore,
            action,
            reason: reason || 'Manual update',
            changed_by: 'system',
            created_at: new Date().toISOString()
          });

        return res.json({
          success: true,
          oldScore: user.trust_score,
          newScore: newTrustScore,
          change: newTrustScore - user.trust_score,
          reason,
          message: `신뢰도 점수가 ${user.trust_score}에서 ${newTrustScore}로 변경되었습니다`
        });
      } catch (error) {
        console.error('신뢰도 점수 업데이트 실패:', error);
      }
    }
    
    // Mock 신뢰도 업데이트
    const oldScore = 85;
    let newScore = oldScore;
    
    switch (action) {
      case 'increase':
        newScore = Math.min(100, oldScore + (value || 1));
        break;
      case 'decrease':
        newScore = Math.max(0, oldScore - (value || 1));
        break;
      case 'set':
        newScore = Math.max(0, Math.min(100, value || 85));
        break;
    }
    
    res.json({
      success: true,
      oldScore,
      newScore,
      change: newScore - oldScore,
      reason,
      message: `Mock 신뢰도 점수가 ${oldScore}에서 ${newScore}로 변경되었습니다`
    });
  } catch (error) {
    console.error('❌ 신뢰도 점수 업데이트 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update trust score'
    });
  }
});

// ============================================================================
// 🛠️ 헬퍼 함수들
// ============================================================================

function generateMockPassport(did: string): any {
  const username = did?.split(':').pop() || 'Agent';
  
  return {
    did,
    username: username,
    displayName: `AI Agent ${username}`,
    trustScore: 85 + Math.floor(Math.random() * 15),
    level: 'Verified Agent',
    cueBalance: 2500 + Math.floor(Math.random() * 3000),
    totalMined: 25000 + Math.floor(Math.random() * 50000),
    personalityProfile: {
      type: 'INTJ-A (Architect)',
      communicationStyle: 'Direct & Technical',
      learningPattern: 'Visual + Hands-on',
      workingStyle: 'Morning Focus',
      responsePreference: 'Concise with examples',
      decisionMaking: 'Data-driven analysis'
    },
    connectedPlatforms: [
      { name: 'ChatGPT', connected: true, lastSync: new Date().toISOString(), dataPoints: 150 },
      { name: 'Claude', connected: true, lastSync: new Date().toISOString(), dataPoints: 89 },
      { name: 'Discord', connected: false, lastSync: null, dataPoints: 0 }
    ],
    achievements: [
      { 
        id: 'first_login', 
        name: 'First Steps', 
        description: 'Complete your first login',
        icon: '🎯', 
        category: 'Getting Started',
        rarity: 'common',
        earned: true,
        earnedAt: new Date().toISOString(),
        progress: 100,
        maxProgress: 100,
        cueReward: 10
      },
      { 
        id: 'ai_chat_master', 
        name: 'AI Chat Master', 
        description: 'Have 100 conversations with AI',
        icon: '🤖', 
        category: 'Communication',
        rarity: 'rare',
        earned: true,
        earnedAt: new Date().toISOString(),
        progress: 100,
        maxProgress: 100,
        cueReward: 50
      },
      { 
        id: 'platform_master', 
        name: 'Platform Master', 
        description: 'Connect to 5 different platforms',
        icon: '🌐', 
        category: 'Integration',
        rarity: 'epic',
        earned: false,
        progress: 2,
        maxProgress: 5,
        cueReward: 100
      }
    ],
    stats: {
      totalInteractions: 145 + Math.floor(Math.random() * 100),
      favoriteModel: 'Claude',
      averageSessionDuration: '12.5 minutes',
      platformConnections: 2,
      dataVaults: 3,
      trustScoreHistory: [
        { date: '2025-01-01', score: 75 },
        { date: '2025-01-15', score: 82 },
        { date: '2025-02-01', score: 85 }
      ]
    },
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    lastActive: new Date().toISOString(),
    isVerified: true
  };
}

async function getConnectedPlatforms(did: string): Promise<any[]> {
  if (useDatabase) {
    try {
      const { data, error } = await db.from('platform_connections')
        .select('*')
        .eq('user_did', did)
        .eq('is_connected', true);

      if (!error && data) {
        return data.map(platform => ({
          name: platform.platform_name,
          connected: platform.is_connected,
          lastSync: platform.last_sync_at,
          dataPoints: platform.data_points_count || 0
        }));
      }
    } catch (error) {
      console.error('연결된 플랫폼 조회 실패:', error);
    }
  }
  
  // Mock 플랫폼
  return [
    { name: 'ChatGPT', connected: true, lastSync: new Date().toISOString(), dataPoints: 150 },
    { name: 'Claude', connected: true, lastSync: new Date().toISOString(), dataPoints: 89 },
    { name: 'Discord', connected: false, lastSync: null, dataPoints: 0 }
  ];
}

async function getUserAchievements(did: string): Promise<any[]> {
  const allAchievements = [
    {
      id: 'first_login',
      name: 'First Steps',
      description: 'Complete your first login',
      icon: '🎯',
      category: 'Getting Started',
      rarity: 'common',
      cueReward: 10
    },
    {
      id: 'ai_chat_master',
      name: 'AI Chat Master',
      description: 'Have 100 conversations with AI',
      icon: '🤖',
      category: 'Communication',
      rarity: 'rare',
      cueReward: 50
    },
    {
      id: 'cue_collector',
      name: 'CUE Collector',
      description: 'Earn 1000 CUE tokens',
      icon: '💰',
      category: 'Economy',
      rarity: 'rare',
      cueReward: 25
    },
    {
      id: 'platform_master',
      name: 'Platform Master',
      description: 'Connect to 5 different platforms',
      icon: '🌐',
      category: 'Integration',
      rarity: 'epic',
      cueReward: 100
    },
    {
      id: 'trusted_agent',
      name: 'Trusted Agent',
      description: 'Reach 95+ trust score',
      icon: '🛡️',
      category: 'Reputation',
      rarity: 'legendary',
      cueReward: 200
    }
  ];

  if (useDatabase) {
    try {
      const { data, error } = await db.from('user_achievements')
        .select('*')
        .eq('user_did', did);

      if (!error && data) {
        return allAchievements.map(achievement => {
          const userAchievement = data.find(ua => ua.achievement_id === achievement.id);
          return {
            ...achievement,
            earned: !!userAchievement,
            earnedAt: userAchievement?.earned_at,
            progress: userAchievement?.progress || 0,
            maxProgress: 100
          };
        });
      }
    } catch (error) {
      console.error('사용자 성취 조회 실패:', error);
    }
  }
  
  // Mock 성취
  return allAchievements.map((achievement, index) => ({
    ...achievement,
    earned: index < 2, // 처음 2개만 달성
    earnedAt: index < 2 ? new Date().toISOString() : null,
    progress: index < 2 ? 100 : Math.floor(Math.random() * 80),
    maxProgress: 100
  }));
}

async function getPassportStats(did: string): Promise<any> {
  if (useDatabase) {
    try {
      // 실제 통계 조회 로직
      const [interactionsResult, cueResult] = await Promise.all([
        db.from('chat_messages').select('count').eq('user_did', did),
        db.from('cue_transactions').select('amount').eq('user_did', did)
      ]);

      return {
        totalInteractions: interactionsResult.data?.length || 0,
        favoriteModel: 'Claude', // 가장 많이 사용된 모델 계산 필요
        averageSessionDuration: '12.5 minutes',
        platformConnections: 2,
        dataVaults: 3,
        trustScoreHistory: []
      };
    } catch (error) {
      console.error('Passport 통계 조회 실패:', error);
    }
  }
  
  // Mock 통계
  return {
    totalInteractions: 145 + Math.floor(Math.random() * 100),
    favoriteModel: 'Claude',
    averageSessionDuration: '12.5 minutes',
    platformConnections: 2,
    dataVaults: 3,
    trustScoreHistory: [
      { date: '2025-01-01', score: 75 },
      { date: '2025-01-15', score: 82 },
      { date: '2025-02-01', score: 85 }
    ]
  };
}

function getAchievementInfo(achievementId: string): any {
  const achievements = {
    'first_login': {
      id: 'first_login',
      name: 'First Steps',
      description: 'Complete your first login',
      icon: '🎯',
      category: 'Getting Started',
      rarity: 'common',
      cueReward: 10
    },
    'ai_chat_master': {
      id: 'ai_chat_master',
      name: 'AI Chat Master',
      description: 'Have 100 conversations with AI',
      icon: '🤖',
      category: 'Communication',
      rarity: 'rare',
      cueReward: 50
    },
    'cue_collector': {
      id: 'cue_collector',
      name: 'CUE Collector',
      description: 'Earn 1000 CUE tokens',
      icon: '💰',
      category: 'Economy',
      rarity: 'rare',
      cueReward: 25
    }
  };

  return achievements[achievementId] || {
    id: achievementId,
    name: 'Unknown Achievement',
    description: 'Achievement description not found',
    icon: '❓',
    category: 'Unknown',
    rarity: 'common',
    cueReward: 0
  };
}

export default router;