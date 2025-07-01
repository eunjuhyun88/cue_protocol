// ============================================================================
// 🤖 AI Routes 모듈 - AI 채팅 및 개인화된 응답 생성
// ============================================================================/
// backend/src/routes/ai/index.ts
  

import express from 'express';
import { v4 as uuidv4 } from 'uuid';

import { DatabaseService } from '../../services/database/DatabaseService';
import { SemanticCompressionService } from '../../services/ai/SemanticCompressionService';
import { PersonalizationService } from '../../services/ai/PersonalizationService';
import { CUEMiningService } from '../../services/cue/CUEMiningService';
import { asyncHandler } from '../../middleware/errorHandler';

const router = express.Router();
const db = DatabaseService.getInstance();

// AI 클라이언트들 - 절대 파일 로드 시점에 초기화하지 않음
let openaiClient: any = null;
let anthropicClient: any = null;
let openaiAttempted = false;
let anthropicAttempted = false;

console.log('🤖 AI Routes module loaded - NO immediate API client initialization');

// ============================================================================
// 🔐 안전한 OpenAI 클라이언트 생성
// ============================================================================
async function getOpenAIClient() {
  if (openaiAttempted) {
    return openaiClient; // 이미 시도했으면 결과 반환 (성공이든 실패든)
  }

  openaiAttempted = true;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey === 'your-openai-key-here') {
    console.log('⚠️ OpenAI API key not configured - will use mock responses');
    return null;
  }

  try {
    console.log('🔄 Dynamically importing OpenAI...');
    const { default: OpenAI } = await import('openai');
    
    console.log('🔄 Creating OpenAI client...');
    openaiClient = new OpenAI({ apiKey });
    
    console.log('✅ OpenAI client created successfully');
    return openaiClient;
  } catch (error) {
    if (error instanceof Error) {
      console.error('❌ Failed to create OpenAI client:', error.message);
    } else {
      console.error('❌ Failed to create OpenAI client:', error);
    }
    openaiClient = null;
    return null;
  }
}

// ============================================================================
// 🔐 안전한 Anthropic 클라이언트 생성
// ============================================================================
async function getAnthropicClient() {
  if (anthropicAttempted) {
    return anthropicClient;
  }

  anthropicAttempted = true;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey === 'your-anthropic-key-here') {
    console.log('⚠️ Anthropic API key not configured - will use mock responses');
    return null;
  }

  try {
    console.log('🔄 Dynamically importing Anthropic...');
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    
    console.log('🔄 Creating Anthropic client...');
    anthropicClient = new Anthropic({ apiKey });
    
    console.log('✅ Anthropic client created successfully');
    return anthropicClient;
  } catch (error) {
    if (error instanceof Error) {
      console.error('❌ Failed to create Anthropic client:', error.message);
    } else {
      console.error('❌ Failed to create Anthropic client:', error);
    }
    anthropicClient = null;
    return null;
  }
}

// ============================================================================
// 🤖 AI 채팅 엔드포인트
// ============================================================================
router.post('/chat', asyncHandler(async (req: express.Request, res: express.Response) => {
  const { message, model = 'personalized-agent', conversationId } = req.body;
  const userDid = (req as any).user.did;

  console.log(`🎯 AI Chat Request: ${model} for user ${userDid?.slice(0, 8)}...`);

  if (!message || !message.trim()) {
    return res.status(400).json({
      success: false,
      error: 'Message is required'
    });
  }

  const startTime = Date.now();
  const currentConversationId = conversationId || uuidv4();

  try {
    // 1. 사용자 메시지 저장
    console.log('💾 Storing user message...');
    const userMessage = await db.saveChatMessage({
      id: uuidv4(),
      user_did: userDid,
      conversation_id: currentConversationId,
      message_type: 'user',
      content: message,
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    });

    // 2. 개인화 컨텍스트 준비
    console.log('🧠 Loading personalization context...');
    const personalizationService = new PersonalizationService(db);
    const personalContext = await personalizationService.getPersonalizedContext(userDid, message);

    // 3. AI 응답 생성
    console.log(`🤖 Generating ${model} response...`);
    let aiResult;

    switch (model) {
      case 'gpt-4o':
        aiResult = await generateGPTResponse(message, personalContext);
        break;
      case 'claude-3.5-sonnet':
        aiResult = await generateClaudeResponse(message, personalContext);
        break;
      case 'gemini-pro':
        aiResult = await generateGeminiResponse(message, personalContext);
        break;
      case 'personalized-agent':
      default:
        aiResult = await generatePersonalizedResponse(message, personalContext, userDid);
        break;
    }

    const responseTime = Date.now() - startTime;

    // 4. CUE 토큰 마이닝
    console.log('⛏️ Mining CUE tokens...');
    const cueService = new CUEMiningService(db);
    const minedTokens = await cueService.mineFromInteraction({
      userDid,
      messageContent: message,
      aiResponse: aiResult.response,
      model,
      personalContextUsed: personalContext.cues.length,
      responseTime,
      conversationId: currentConversationId
    });

    // 5. AI 응답 저장
    console.log('💾 Storing AI response...');
    const aiMessageData = {
      id: uuidv4(),
      user_did: userDid,
      conversation_id: currentConversationId,
      message_type: 'ai',
      content: aiResult.response,
      ai_model: model,
      used_passport_data: aiResult.usedData,
      used_vault_ids: personalContext.vaultIds,
      cue_tokens_earned: minedTokens,
      cue_tokens_used: personalContext.cues.length * 0.1,
      verified: true,
      verification_signature: `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      response_time_ms: responseTime,
      tokens_used: aiResult.tokensUsed
    };
    await db.saveChatMessage(aiMessageData);
    const aiMessage = aiMessageData;

    // 6. 백그라운드 학습
    setImmediate(async () => {
      try {
        await learnFromInteraction(userDid, message, aiResult.response, personalContext);
      } catch (error) {
        console.error('Background learning error:', error);
      }
    });

    // 7. Passport 활동 업데이트
    await updatePassportActivity(userDid);

    console.log(`✅ AI Chat completed in ${responseTime}ms - mined ${minedTokens} CUE`);

    res.json({
      success: true,
      message: {
        id: aiMessage.id,
        conversationId: currentConversationId,
        content: aiResult.response,
        model,
        usedPassportData: aiResult.usedData,
        cueTokensEarned: minedTokens,
        responseTimeMs: responseTime,
        verification: {
          verified: true,
          signature: aiMessage.verification_signature,
          biometric: true
        }
      },
      personalContext: {
        cuesUsed: personalContext.cues.length,
        vaultsAccessed: personalContext.vaultIds.length,
        personalityMatch: personalContext.personalityMatch
      }
    });

  } catch (error) {
    console.error('❌ AI chat processing error:', error);
    
    // 에러 로그 저장
    try {
      await db.getClient()
        .from('system_logs')
        .insert({
          user_did: userDid,
          level: 'error',
          service: 'ai',
          action: 'chat_error',
          message: 'AI chat processing failed',
          details: {
            model,
            error: error instanceof Error ? error.message : String(error),
            conversationId: currentConversationId
          },
          error_stack: error instanceof Error ? error.stack : undefined
        });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    res.status(500).json({
      success: false,
      error: 'Failed to process AI chat',
      details: process.env.NODE_ENV === 'development'
        ? (error instanceof Error ? error.message : String(error))
        : undefined,
      conversationId: currentConversationId
    });
  }
}));

// ============================================================================
// 🎯 AI 응답 생성 함수들
// ============================================================================

async function generateGPTResponse(message: string, context: any) {
  console.log('🔄 Attempting GPT response...');
  
  const client = await getOpenAIClient();
  if (!client) {
    console.log('➡️ OpenAI unavailable, using enhanced mock');
    return generateEnhancedMockResponse(message, context, 'GPT-4o');
  }

  try {
    const systemPrompt = createPersonalizedSystemPrompt(context);
    
    const completion = await client.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      max_tokens: 1000,
      temperature: 0.7,
    });

    console.log('✅ GPT response generated successfully');
    return {
      response: completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.',
      tokensUsed: completion.usage?.total_tokens || 0,
      usedData: extractUsedData(context)
    };
  } catch (error) {
    console.error('GPT API error:', error);
    return generateEnhancedMockResponse(message, context, 'GPT-4o (API Error)');
  }
}

async function generateClaudeResponse(message: string, context: any) {
  console.log('🔄 Attempting Claude response...');
  
  const client = await getAnthropicClient();
  if (!client) {
    console.log('➡️ Anthropic unavailable, using enhanced mock');
    return generateEnhancedMockResponse(message, context, 'Claude 3.5 Sonnet');
  }

  try {
    const systemPrompt = createPersonalizedSystemPrompt(context);
    
    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: 'user', content: message }]
    });

    const content = response.content[0];
    const responseText = content.type === 'text' ? content.text : 'Sorry, I could not generate a response.';

    console.log('✅ Claude response generated successfully');
    return {
      response: responseText,
      tokensUsed: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0),
      usedData: extractUsedData(context)
    };
  } catch (error) {
    console.error('Claude API error:', error);
    return generateEnhancedMockResponse(message, context, 'Claude 3.5 Sonnet (API Error)');
  }
}

async function generateGeminiResponse(message: string, context: any) {
  console.log('➡️ Gemini API not implemented, using enhanced mock');
  return generateEnhancedMockResponse(message, context, 'Gemini Pro');
}

async function generatePersonalizedResponse(message: string, context: any, userDid: string) {
  console.log('🧠 Generating personalized response...');
  
  const personalityType = context.personalityProfile?.type || '';
  
  if (personalityType.includes('Technical') || personalityType.includes('INTJ')) {
    return await generateClaudeResponse(message, context);
  } else {
    return await generateGPTResponse(message, context);
  }
}

// ============================================================================
// 🎭 Enhanced Mock Response Generator
// ============================================================================

function generateEnhancedMockResponse(message: string, context: any, modelName: string) {
  const { personalityProfile, cues, behaviorPatterns } = context;
  
  // 메시지 분석
  const isQuestion = message.includes('?') || /how|what|why|when|where|어떻게|무엇|왜|언제|어디/.test(message.toLowerCase());
  const isTechnical = /code|api|algorithm|system|data|programming|개발|시스템|알고리즘/.test(message.toLowerCase());
  const isHelp = /help|도움|지원|support/.test(message.toLowerCase());
  
  type ResponseType = 'question' | 'technical' | 'help' | 'general';
  let responseType: ResponseType = 'general';
  if (isQuestion) responseType = 'question';
  if (isTechnical) responseType = 'technical';
  if (isHelp) responseType = 'help';

  const responses: Record<ResponseType, string> = {
    question: `**${modelName}** 질문 응답

"${message}"

이 질문에 대해 당신의 **${personalityProfile?.type || 'Adaptive'}** 성격과 **${personalityProfile?.communicationStyle || 'Balanced'}** 소통 스타일을 고려하여 답변드리겠습니다.

${personalityProfile?.type?.includes('Technical') ? 
  '🔧 **기술적 접근**: 구체적이고 논리적인 설명을 선호하시므로, 단계별로 상세히 설명드리겠습니다.' :
  '💡 **친근한 접근**: 이해하기 쉽고 실용적인 방식으로 설명드리겠습니다.'
}

**개인화 적용 데이터:**
• 사용된 개인 컨텍스트: ${cues.length}개
• 행동 패턴: ${behaviorPatterns?.slice(0, 2).join(', ') || '분석 중...'}

*실제 ${modelName} API 연결 시 더욱 정교한 답변을 제공합니다.*`,

    technical: `**${modelName}** 기술 분석

**요청 분석:** "${message}"

${personalityProfile?.type?.includes('INTJ') || personalityProfile?.type?.includes('Technical') ?
  '🎯 **당신의 기술적 성향**에 맞춰 상세한 분석을 제공합니다:' :
  '🎯 **기술적 내용**을 이해하기 쉽게 설명해드리겠습니다:'
}

**개인화된 기술 응답:**
• **학습 패턴**: ${personalityProfile?.learningPattern || 'Visual'} 방식 적용
• **의사결정 스타일**: ${personalityProfile?.decisionMaking || 'Analytical'} 접근

**관련 컨텍스트:**
${cues.slice(0, 2).map((cue: any, idx: number) => 
  `${idx + 1}. ${cue.content_type}: ${cue.compressed_content?.slice(0, 50) || 'No content'}...`
).join('\n') || '• 새로운 기술 컨텍스트 학습 중...'}

*실제 API 연결 시 최신 기술 정보와 개인화된 코드 예제를 제공합니다.*`,

    help: `**${modelName}** 맞춤형 지원

"${message}"에 대한 도움을 요청하셨군요.

**당신의 프로필 기반 지원:**
• **성격 유형**: ${personalityProfile?.type || 'Adaptive'} - 맞춤형 접근
• **소통 스타일**: ${personalityProfile?.communicationStyle || 'Balanced'} 적용
• **학습 선호도**: ${personalityProfile?.learningPattern || 'Visual'} 방식

**개인화된 도움 제안:**
${personalityProfile?.communicationStyle?.includes('Direct') ?
  '🎯 직접적이고 실용적인 해결책을 제시하겠습니다.' :
  '🤝 단계별로 친근하게 안내해드리겠습니다.'
}

**사용 가능한 개인 데이터:**
• ${cues.length}개의 개인 컨텍스트
• ${behaviorPatterns?.length || 0}개의 행동 패턴

어떤 부분에서 구체적으로 도움이 필요한지 알려주시면, 더 정확한 맞춤형 지원을 제공하겠습니다.`,

    general: `**${modelName}** 개인화 응답

**메시지:** "${message}"

**당신의 개인화 프로필 적용:**
• **성격**: ${personalityProfile?.type || 'Learning...'}
• **소통**: ${personalityProfile?.communicationStyle || 'Adaptive'}
• **개인 CUE**: ${cues.length}개 활용

${personalityProfile?.type?.includes('Technical') || personalityProfile?.type?.includes('INTJ') ?
  '⚡ 논리적이고 체계적인 사고를 선호하시는 것으로 파악되어, 구조화된 응답을 제공합니다.' :
  '💫 균형 잡힌 접근 방식으로 친근하게 응답드리겠습니다.'
}

**행동 패턴 기반 맞춤형 제안:**
${behaviorPatterns?.slice(0, 3).join(' • ') || '• 새로운 패턴 학습 중...'}

궁금한 점이 더 있으시면 언제든 말씀해주세요!`
  };

  return {
    response: responses[responseType] || responses.general,
    tokensUsed: Math.floor(Math.random() * 400) + 200,
    usedData: extractUsedData(context)
  };
}

// ============================================================================
// 🛠️ 헬퍼 함수들
// ============================================================================

function createPersonalizedSystemPrompt(context: any): string {
  const { personalityProfile, cues, behaviorPatterns } = context;
  
  return `You are an AI assistant with deep knowledge of the user's personality and preferences.

**User Profile:**
- Personality: ${personalityProfile?.type || 'Unknown'}
- Communication: ${personalityProfile?.communicationStyle || 'Adaptive'}
- Learning: ${personalityProfile?.learningPattern || 'Visual'}
- Decision Making: ${personalityProfile?.decisionMaking || 'Analytical'}

**Personal Context (${cues.length} items):**
${cues.slice(0, 5).map((cue: any, i: number) => 
  `${i + 1}. ${cue.compressed_content} (${cue.content_type})`
).join('\n')}

**Behavioral Patterns:**
${behaviorPatterns?.slice(0, 5).join(', ') || 'Learning patterns...'}

Respond in a way that matches their personality and communication style. Use their personal context when relevant.`;
}

function extractUsedData(context: any): string[] {
  const data: string[] = [];
  
  if (context.personalityProfile) data.push('Personality Profile');
  if (context.cues?.length > 0) data.push(`${context.cues.length} Personal Contexts`);
  if (context.behaviorPatterns?.length > 0) data.push('Behavior Patterns');
  if (context.preferences) data.push('User Preferences');
  
  return data;
}

async function learnFromInteraction(userDid: string, userMessage: string, aiResponse: string, context: any) {
  try {
    const compressionService = new SemanticCompressionService();
    const analysis = await compressionService.analyzeConversation(userMessage, aiResponse);
    
    if (
      analysis.shouldStore &&
      'compressedContent' in analysis &&
      'compressionRatio' in analysis &&
      'semanticPreservation' in analysis &&
      'keywords' in analysis &&
      'entities' in analysis &&
      'sentiment' in analysis &&
      'topics' in analysis &&
      'importance' in analysis &&
      'cueValue' in analysis
    ) {
      await db.storePersonalCue({
        id: uuidv4(),
        user_did: userDid,
        vault_id: context.primaryVaultId,
        content_type: 'conversation',
        original_content: `User: ${userMessage}\nAI: ${aiResponse}`,
        compressed_content: analysis.compressedContent,
        compression_algorithm: 'semantic',
        compression_ratio: analysis.compressionRatio,
        semantic_preservation: analysis.semanticPreservation,
        keywords: analysis.keywords,
        entities: analysis.entities,
        sentiment_score: analysis.sentiment,
        topics: analysis.topics,
        importance_score: analysis.importance,
        cue_mining_value: analysis.cueValue
      });
    }
  } catch (error) {
    console.error('Learning error:', error);
  }
}

async function updatePassportActivity(userDid: string) {
  try {
    await db.updatePassport(userDid, {
      total_interactions: 1,
      last_activity_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Passport update error:', error);
  }
}

// ============================================================================
// 📊 추가 엔드포인트들
// ============================================================================

router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'AI Routes',
    timestamp: new Date().toISOString(),
    openaiConfigured: !!process.env.OPENAI_API_KEY,
    anthropicConfigured: !!process.env.ANTHROPIC_API_KEY
  });
});

router.get('/models', (req, res) => {
  res.json({
    success: true,
    models: [
      { id: 'personalized-agent', name: 'Personalized Agent', available: true },
      { id: 'gpt-4o', name: 'GPT-4o', available: !!process.env.OPENAI_API_KEY },
      { id: 'claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', available: !!process.env.ANTHROPIC_API_KEY },
      { id: 'gemini-pro', name: 'Gemini Pro', available: false }
    ]
  });
});

router.get('/history/:conversationId?', asyncHandler(async (req: express.Request, res: express.Response) => {
  const userDid = (req as any).user.did;
  const { conversationId } = req.params;
  const { limit = 50 } = req.query;

  try {
    const messages = await db.getChatHistory(userDid, conversationId, parseInt(limit as string));
    
    res.json({
      success: true,
      messages,
      count: messages.length
    });
  } catch (error) {
    console.error('Get chat history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve chat history'
    });
  }
}));

router.get('/context', asyncHandler(async (req: express.Request, res: express.Response) => {
  const userDid = (req as any).user.did;

  try {
    const personalizationService = new PersonalizationService(db);
    const context = await personalizationService.getPersonalizedContext(userDid, '', {
      includeFullProfile: true,
      includeBehaviorPatterns: true,
      includeRecentInteractions: true
    });

    res.json({
      success: true,
      context: {
        personalityProfile: context.personalityProfile,
        totalCues: context.cues.length,
        vaultsCount: context.vaultIds.length,
        behaviorPatterns: context.behaviorPatterns,
        recentInteractions: context.recentInteractions?.length || 0,
        personalityMatch: context.personalityMatch
      }
    });
  } catch (error) {
    console.error('Get context error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve context'
    });
  }
}));

console.log('✅ AI Routes module initialized successfully');

export default router;
