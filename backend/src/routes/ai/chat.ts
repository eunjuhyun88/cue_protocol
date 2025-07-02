// ============================================================================
// 🤖 AI 채팅 라우트 (수정된 완전한 구현)
// 경로: backend/src/routes/ai/chat.ts
// 용도: AI 채팅, 개인화, CUE 마이닝 통합 API
// 수정사항: 메서드 통일, 오류 처리 개선, DatabaseService와 SupabaseService 호환
// ============================================================================
import { ollamaService } from '../../services/ollama';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from '../../services/database/DatabaseService';
import { supabaseService } from '../../services/database/SupabaseService';
import { SemanticCompressionService } from '../../services/ai/SemanticCompressionService';
import { PersonalizationService } from '../../services/ai/PersonalizationService';
import { asyncHandler } from '../../middleware/errorHandler';
import { PersonalCueExtractor } from '../../services/ai/PersonalCueExtractor';
const cueExtractor = new PersonalCueExtractor();

const router = express.Router();

// 데이터베이스 서비스 선택 (환경에 따라 자동 선택)
const db = process.env.USE_MOCK_DATABASE === 'true' || 
          !process.env.SUPABASE_URL || 
          process.env.SUPABASE_URL.includes('dummy')
  ? DatabaseService.getInstance()
  : supabaseService;

// AI 클라이언트들 - 지연 로딩
let openaiClient: any = null;
let anthropicClient: any = null;
let openaiAttempted = false;
let anthropicAttempted = false;

console.log('🤖 AI Routes module loaded - using', db.constructor.name);

// ============================================================================
// 🔐 안전한 OpenAI 클라이언트 생성
// ============================================================================
async function getOpenAIClient() {
  if (openaiAttempted) {
    return openaiClient;
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
  } catch (error: any) {
    console.error('❌ Failed to create OpenAI client:', error.message);
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
  } catch (error: any) {
    console.error('❌ Failed to create Anthropic client:', error.message);
    anthropicClient = null;
    return null;
  }
}

// ============================================================================
// 🤖 AI 채팅 엔드포인트 (수정됨)
// ============================================================================
router.post('/chat', asyncHandler(async (req, res) => {
  console.log('🎯 === AI CHAT 라우트 시작 ===');
  console.log('📝 Request body:', req.body);
  
  const { message, model = 'personalized-agent', conversationId, userId, passportData } = req.body;
  
  console.log('🔍 추출된 값들:', {
    message: message?.slice(0, 50),
    model,
    userId,
    hasPassportData: !!passportData
  });
   const userDid = (req as any).user?.did || 
                  (passportData?.did) || 
                  (userId ? `did:final0626:${userId}` : null);

  console.log(`🎯 AI Chat Request: ${model} for user ${userDid?.slice(0, 20)}...`);
  
router.post('/chat', asyncHandler(async (req, res) => {
  const { message, model = 'personalized-agent', conversationId, userId, passportData } = req.body;
  
  // 사용자 정보 확인 (req.user 또는 body에서)
  const userDid = (req as any).user?.did || 
                  (passportData?.did) || 
                  (userId ? `did:final0626:${userId}` : null);

  console.log(`🎯 AI Chat Request: ${model} for user ${userDid?.slice(0, 20)}...`);

  if (!message || !message.trim()) {
    return res.status(400).json({
      success: false,
      error: 'Message is required'
    });
  }

  if (!userDid) {
    return res.status(400).json({
      success: false,
      error: 'User identification required (userId or authenticated user)'
    });
  }

  const startTime = Date.now();
  const currentConversationId = conversationId || uuidv4();

  try {
    // 1. 사용자 정보 확인 및 생성
    console.log('👤 Checking user information...');
    let user = null;
    
    if (userId) {
      // 수정됨: getUserById 메서드 사용 (통일됨)
      user = await db.getUserById(userId);
      
      if (!user) {
        // 사용자가 없으면 기본 사용자 생성
        const newUserData = {
          id: userId,
          username: `user_${userId.slice(-8)}`,
          did: userDid,
          wallet_address: `0x${Math.random().toString(16).substring(2, 42)}`,
          passkey_registered: false,
          created_at: new Date().toISOString()
        };
        
        user = await db.createUser(newUserData);
        console.log(`✅ 새 사용자 생성: ${userId}`);
      }
    } else {
      // DID로 사용자 조회
      user = await db.getUserById(userDid);
    }

    // 2. 사용자 메시지 저장
    console.log('💾 Storing user message...');
    const userMessageData = {
      id: uuidv4(),
      user_did: userDid,
      user_id: user?.id || userId,
      conversation_id: currentConversationId,
      message_type: 'user',
      content: message,
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    };

    await db.saveChatMessage(userMessageData);

    // 3. 개인화 컨텍스트 준비
    console.log('🧠 Loading personalization context...');
    const personalizationService = new PersonalizationService(db as any);
    const personalContext = await personalizationService.getPersonalizedContext(userDid, message, {
      includeFullProfile: true,
      includeBehaviorPatterns: true,
      includeRecentInteractions: true
    });

    // 4. AI 응답 생성
    console.log(`🤖 Generating ${model} response...`);
    let aiResult;

    switch (model) {
  case 'gpt-4o':
  case 'gpt-4':
    aiResult = await generateGPTResponse(message, personalContext);
    break;
  case 'claude-3.5-sonnet':
  case 'claude-sonnet':
    aiResult = await generateClaudeResponse(message, personalContext);
    break;
  case 'gemini-pro':
    aiResult = await generateGeminiResponse(message, personalContext);
    break;
  
  // 🦙 Ollama 로컬 모델들 추가
  case 'llama3.2:3b':
  case 'llama3.2:1b':
  case 'llama3.1:8b':
  case 'gemma2:2b':
  case 'qwen2.5:3b':
  case 'qwen2.5:1.5b':
    aiResult = await generateOllamaResponse(message, personalContext, model);
    break;
  
  // 기본 모델명으로 Ollama 모델 감지
  default:
    if (model.startsWith('llama') || model.startsWith('gemma') || model.startsWith('qwen') || model.startsWith('phi') || model.startsWith('mistral')) {
      aiResult = await generateOllamaResponse(message, personalContext, model);
    } else {
      // 기존 개인화 에이전트
      aiResult = await generatePersonalizedResponse(message, personalContext, userDid);
    }
    break;
}


    const responseTime = Date.now() - startTime;

// 위치: AI 응답 생성 완료 후, 메시지 저장 전에 추가
// 즉, "const responseTime = Date.now() - startTime;" 라인 다음에 추가

    // ✨ Personal CUE 추출 및 저장 (새로 추가)
    console.log('🧠 Personal CUE 추출 시작...');
    const chatContext = {
      userMessage: message,
      aiResponse: aiResult.response,
      model,
      timestamp: new Date(),
      conversationId: currentConversationId
    };

    // 백그라운드에서 CUE 추출 (비동기 - 기존 플로우에 영향 없음)
    setImmediate(async () => {
      try {
        const extractedCues = await cueExtractor.extractAndStoreCues(userDid, chatContext);
        console.log(`✅ ${extractedCues.length}개 새로운 CUE 추출 완료`);
      } catch (error) {
        console.error('❌ CUE 추출 오류:', error);
      }
    });

    // 5. CUE 토큰 계산 (간단한 공식)
    console.log('⛏️ Calculating CUE tokens...');
    const baseTokens = Math.floor(message.length / 10);
    const personalityBonus = personalContext.personalityMatch > 0.7 ? 2 : 1;
    const contextBonus = Math.min(personalContext.cues.length, 5);
    const minedTokens = baseTokens + personalityBonus + contextBonus;

    // 6. AI 응답 저장
    console.log('💾 Storing AI response...');
    const aiMessageData = {
      id: uuidv4(),
      user_did: userDid,
      user_id: user?.id || userId,
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
      tokens_used: aiResult.tokensUsed || 0
    };

    await db.saveChatMessage(aiMessageData);

    // 7. CUE 거래 기록
    if (minedTokens > 0) {
      const transactionData = {
        user_did: userDid,
        user_id: user?.id || userId,
        transaction_type: 'mining',
        amount: minedTokens,
        status: 'completed',
        source: 'ai_chat',
        description: `AI 채팅을 통한 CUE 마이닝 (${model})`,
        metadata: {
          messageId: aiMessageData.id,
          model: model,
          personalContextUsed: personalContext.cues.length
        }
      };

      // 수정됨: recordCueTransaction 또는 createCUETransaction 사용
      if (typeof db.recordCueTransaction === 'function') {
        await db.recordCueTransaction(transactionData);
      } else {
        await db.createCUETransaction(transactionData);
      }
    }

    // 8. 백그라운드 학습
    setImmediate(async () => {
      try {
        await learnFromInteraction(userDid, message, aiResult.response, personalContext);
      } catch (error) {
        console.error('Background learning error:', error);
      }
    });

    // 9. Passport 활동 업데이트
    await updatePassportActivity(userDid);

    console.log(`✅ AI Chat completed in ${responseTime}ms - mined ${minedTokens} CUE`);

    res.json({
      success: true,
      message: {
        id: aiMessageData.id,
        conversationId: currentConversationId,
        content: aiResult.response,
        model,
        usedPassportData: aiResult.usedData,
        cueTokensEarned: minedTokens,
        responseTimeMs: responseTime,
        cueExtractionStarted: true, // 새로 추가

        verification: {
          verified: true,
          signature: aiMessageData.verification_signature,
          biometric: true
        }
      },
      personalContext: {
  cuesUsed: personalContext.cues.length,
  vaultsAccessed: personalContext.vaultIds.length,
  personalityMatch: personalContext.personalityMatch,
  behaviorPatterns: personalContext.behaviorPatterns?.slice(0, 3) || [],
  newCueExtraction: 'processing' // ✅ 콤마 추가!
},
      user: user ? {
        id: user.id,
        username: user.username,
        did: user.did
      } : null
    });

  } catch (error: any) {
    console.error('❌ AI chat processing error:', error);
    
    // 에러 로그 저장
    try {
      if ('createSystemLog' in db && typeof (db as any).createSystemLog === 'function') {
        await (db as any).createSystemLog({
          user_did: userDid,
          level: 'error',
          service: 'ai',
          action: 'chat_error',
          message: 'AI chat processing failed',
          details: {
            model,
            error: error.message,
            conversationId: currentConversationId
          },
          error_stack: error.stack
        });
      } else if ('logSystemError' in db && typeof (db as any).logSystemError === 'function') {
        await (db as any).logSystemError({
          user_did: userDid,
          level: 'error',
          service: 'ai',
          action: 'chat_error',
          message: 'AI chat processing failed',
          details: {
            model,
            error: error.message,
            conversationId: currentConversationId
          },
          error_stack: error.stack
        });
      } else {
        console.error('No system log method available on db service');
      }
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    res.status(500).json({
      success: false,
      error: 'Failed to process AI chat',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      conversationId: currentConversationId
    });
  }
}));

// ============================================================================
// 🎯 AI 응답 생성 함수들 (개선됨)
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
      model: 'gpt-4o-mini', // 더 안정적인 모델
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
  } catch (error: any) {
    console.error('GPT API error:', error.message);
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
  } catch (error: any) {
    console.error('Claude API error:', error.message);
    return generateEnhancedMockResponse(message, context, 'Claude 3.5 Sonnet (API Error)');
  }
}

async function generatePersonalizedResponse(message: string, context: any, userDid: string) {
  console.log('🧠 Generating personalized response...');
  
  const personalityType = context.personalityProfile?.type || '';
  
  // 성격 타입에 따른 모델 선택
  if (personalityType.includes('Technical') || personalityType.includes('INTJ')) {
    return await generateClaudeResponse(message, context);
  } else {
    return await generateGPTResponse(message, context);
  }
}

async function generateOllamaResponse(message: string, context: any, model: string = 'llama3.2:3b') {
  console.log(`🦙 Generating Ollama response with ${model}...`);
  
  try {
    // Ollama 연결 확인
    const isConnected = await ollamaService.checkConnection();
    if (!isConnected) {
      console.log('➡️ Ollama unavailable, using enhanced mock');
      return generateEnhancedMockResponse(message, context, `${model} (Local)`);
    }

    // 개인화된 시스템 프롬프트 생성
    const systemPrompt = createPersonalizedSystemPrompt(context);
    
    // Ollama 메시지 형식으로 변환
    const messages = [
      {
        role: 'system' as const,
        content: `${systemPrompt}

당신은 CUE Protocol의 개인화된 AI 어시스턴트입니다. 
사용자의 개인 정보와 컨텍스트를 바탕으로 친근하고 도움이 되는 한국어 응답을 제공해주세요.
로컬 AI 모델로서 사용자의 프라이버시를 완전히 보호하며 빠른 응답을 제공합니다.`
      },
      {
        role: 'user' as const,
        content: message
      }
    ];

    // Ollama API 호출
    const response = await ollamaService.chat(model, messages, false);
    
    console.log(`✅ Ollama ${model} response generated successfully`);
    return {
      response: response,
      tokensUsed: Math.floor(response.length / 4), // 대략적인 토큰 수 계산
      usedData: extractUsedData(context),
      model: model,
      provider: 'ollama',
      local: true
    };

  } catch (error: any) {
    console.error(`❌ Ollama ${model} error:`, error.message);
    return generateEnhancedMockResponse(message, context, `${model} (Local Error)`);
  }
}

async function generatePersonalizedResponse(message: string, context: any, userDid: string) {
  console.log('🧠 Generating personalized response...');
  
  const personalityType = context.personalityProfile?.type || '';
  
  // 성격 타입에 따른 모델 선택
  if (personalityType.includes('Technical') || personalityType.includes('INTJ')) {
    return await generateClaudeResponse(message, context);
  } else {
    return await generateGPTResponse(message, context);
  }
}

// ============================================================================
// 🎭 Enhanced Mock Response Generator (개선됨)
// ============================================================================

function generateEnhancedMockResponse(message: string, context: any, modelName: string) {
  const { personalityProfile, cues, behaviorPatterns } = context;
  
  // 메시지 분석
  const isQuestion = message.includes('?') || /how|what|why|when|where|어떻게|무엇|왜|언제|어디/.test(message.toLowerCase());
  const isTechnical = /code|api|algorithm|system|data|programming|개발|시스템|알고리즘/.test(message.toLowerCase());
  const isHelp = /help|도움|지원|support/.test(message.toLowerCase());
  const isGreeting = /hello|hi|hey|안녕|안녕하세요/.test(message.toLowerCase());
  
  type ResponseType = 'greeting' | 'question' | 'technical' | 'help' | 'general';
  let responseType: ResponseType = 'general';
  if (isGreeting) responseType = 'greeting';
  else if (isQuestion) responseType = 'question';
  else if (isTechnical) responseType = 'technical';
  else if (isHelp) responseType = 'help';

  const responses: Record<ResponseType, string> = {
    greeting: `**${modelName}** 안녕하세요! 👋

반갑습니다! AI Passport 시스템의 개인화된 어시스턴트입니다.

**당신의 프로필:**
• **성격 유형**: ${personalityProfile?.type || 'Learning...'}
• **소통 스타일**: ${personalityProfile?.communicationStyle || 'Adaptive'}
• **개인 컨텍스트**: ${cues.length}개 활용 가능

${personalityProfile?.type?.includes('Technical') || personalityProfile?.type?.includes('INTJ') ?
  '🎯 논리적이고 체계적인 접근을 선호하시는군요. 구체적인 질문이나 기술적 내용에 대해 언제든 문의해주세요!' :
  '💫 어떤 도움이 필요하신지 알려주세요. 개인화된 응답으로 도와드리겠습니다!'
}

궁금한 것이 있으시면 언제든 말씀해주세요!`,

    question: `**${modelName}** 질문 응답 🤔

"${message}"

이 질문에 대해 당신의 **${personalityProfile?.type || 'Adaptive'}** 성격과 학습 패턴을 고려하여 답변드리겠습니다.

**개인화 적용:**
• **학습 방식**: ${personalityProfile?.learningPattern || 'Visual'} 
• **의사결정**: ${personalityProfile?.decisionMaking || 'Analytical'}
• **관련 컨텍스트**: ${cues.length}개 활용

${personalityProfile?.type?.includes('Technical') ? 
  '🔧 **체계적 설명**: 논리적 순서로 단계별 분석을 제공하겠습니다.' :
  '💡 **이해하기 쉬운 설명**: 실용적이고 명확한 답변을 드리겠습니다.'
}

**관련 행동 패턴**: ${behaviorPatterns?.slice(0, 3).join(', ') || '분석 중...'}

더 구체적인 정보가 필요하시면 언제든 추가 질문해주세요!`,

    technical: `**${modelName}** 기술 분석 🔧

**분석 대상:** "${message}"

**개인화된 기술 접근:**
• **기술 성향**: ${personalityProfile?.type?.includes('Technical') ? 'High (상세 분석)' : 'Moderate (이해 중심)'}
• **학습 패턴**: ${personalityProfile?.learningPattern || 'Visual'} 방식 적용
• **응답 선호도**: ${personalityProfile?.responsePreference || 'Balanced'}

**기술적 컨텍스트 활용:**
${cues.slice(0, 3).map((cue: any, idx: number) => 
  `${idx + 1}. ${cue.content_type || 'Context'}: ${cue.compressed_content?.slice(0, 60) || 'Technical knowledge'}...`
).join('\n') || '• 새로운 기술 학습 데이터 수집 중...'}

${personalityProfile?.type?.includes('INTJ') || personalityProfile?.type?.includes('Technical') ?
  '⚡ **심화 분석**: 아키텍처와 구현 세부사항을 포함한 상세 설명을 제공합니다.' :
  '🎯 **핵심 요약**: 실용적 관점에서 핵심 개념을 중심으로 설명드립니다.'
}

더 구체적인 기술적 질문이나 코드 예제가 필요하시면 말씀해주세요!`,

    help: `**${modelName}** 맞춤형 지원 🆘

"${message}"에 대한 도움을 요청하셨습니다.

**당신의 프로필 기반 지원 전략:**
• **성격 유형**: ${personalityProfile?.type || 'Adaptive'} - 맞춤형 접근
• **소통 방식**: ${personalityProfile?.communicationStyle || 'Balanced'}
• **작업 스타일**: ${personalityProfile?.workingStyle || 'Flexible'}

**개인화된 도움 방식:**
${personalityProfile?.communicationStyle?.includes('Direct') ?
  '🎯 **직접적 해결**: 핵심 문제를 파악하고 즉시 실행 가능한 솔루션을 제시합니다.' :
  '🤝 **단계별 안내**: 친근하고 차근차근 문제를 해결해나가겠습니다.'
}

**활용 가능한 자원:**
• ${cues.length}개의 개인 학습 컨텍스트
• ${behaviorPatterns?.length || 0}개의 행동 패턴 분석
• 개인화된 추천 시스템

어떤 부분에서 구체적으로 막히셨는지, 또는 어떤 결과를 원하시는지 자세히 알려주시면 더 정확한 맞춤형 지원을 제공할 수 있습니다.`,

    general: `**${modelName}** 개인화 응답 💫

**메시지:** "${message}"

**당신의 AI Passport 프로필 적용:**
• **성격**: ${personalityProfile?.type || 'Learning...'}
• **소통**: ${personalityProfile?.communicationStyle || 'Adaptive'}
• **개인 CUE**: ${cues.length}개 컨텍스트 활용
• **행동 패턴**: ${behaviorPatterns?.slice(0, 2).join(', ') || '패턴 분석 중'}

${personalityProfile?.type?.includes('Technical') || personalityProfile?.type?.includes('INTJ') ?
  '⚡ **분석적 접근**: 논리적이고 체계적인 사고를 선호하시므로, 구조화된 분석과 구체적인 예시를 포함한 응답을 제공합니다.' :
  '💫 **균형 잡힌 접근**: 이해하기 쉽고 실용적인 방식으로 친근하게 응답드리겠습니다.'
}

**개인화 컨텍스트 기반 인사이트:**
${cues.length > 0 ? 
  `• 이전 학습한 ${cues.length}개 컨텍스트를 바탕으로 맞춤형 응답을 생성했습니다.` :
  '• 새로운 개인화 컨텍스트를 학습하고 있습니다.'
}

더 구체적인 질문이나 특정 주제에 대해 자세히 알고 싶으시면 언제든 말씀해주세요!`
  };

  return {
    response: responses[responseType],
    tokensUsed: Math.floor(Math.random() * 500) + 300,
    usedData: extractUsedData(context)
  };
}

// ============================================================================
// 🛠️ 헬퍼 함수들 (개선됨)
// ============================================================================

function createPersonalizedSystemPrompt(context: any): string {
  const { personalityProfile, cues, behaviorPatterns, preferences } = context;
  
  return `You are an AI assistant with deep knowledge of the user's personality and preferences.

**User Profile:**
- Personality: ${personalityProfile?.type || 'Unknown'}
- Communication: ${personalityProfile?.communicationStyle || 'Adaptive'}
- Learning: ${personalityProfile?.learningPattern || 'Visual'}
- Decision Making: ${personalityProfile?.decisionMaking || 'Analytical'}
- Work Style: ${personalityProfile?.workingStyle || 'Flexible'}

**Personal Context (${cues.length} items):**
${cues.slice(0, 5).map((cue: any, i: number) => 
  `${i + 1}. ${cue.compressed_content || cue.content || 'Context data'} (${cue.content_type || 'general'})`
).join('\n')}

**Behavioral Patterns:**
${behaviorPatterns?.slice(0, 5).join(', ') || 'Learning patterns...'}

**User Preferences:**
${Object.entries(preferences || {}).slice(0, 3).map(([key, value]) => `- ${key}: ${value}`).join('\n') || '- Preferences learning...'}

Respond in a way that matches their personality and communication style. Use their personal context when relevant. Be helpful, accurate, and personalized.`;
}

function extractUsedData(context: any): string[] {
  const data: string[] = [];
  
  if (context.personalityProfile) data.push('Personality Profile');
  if (context.cues?.length > 0) data.push(`${context.cues.length} Personal Contexts`);
  if (context.behaviorPatterns?.length > 0) data.push('Behavior Patterns');
  if (context.preferences && Object.keys(context.preferences).length > 0) data.push('User Preferences');
  if (context.recentInteractions?.length > 0) data.push('Recent Interactions');
  
  return data;
}


async function learnFromInteraction(userDid: string, userMessage: string, aiResponse: string, context: any) {
  try {
    const compressionService = new SemanticCompressionService();
    const analysis = await compressionService.analyzeConversation(userMessage, aiResponse);
    
    if (analysis.shouldStore) {
      // Use the correct method and type guard for analysis
      if (
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
        // Prefer createPersonalCue if available, fallback to storePersonalCue for legacy/mock
        // Type guard for SupabaseService (which may have createPersonalCue)
        if ('createPersonalCue' in db && typeof (db as any).createPersonalCue === 'function') {
          await (db as any).createPersonalCue({
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
        } else if ('storePersonalCue' in db && typeof (db as any).storePersonalCue === 'function') {
          await (db as any).storePersonalCue({
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
      }
      
      console.log('✅ 백그라운드 학습 완료');
    }
  } catch (error) {
    console.error('Learning error:', error);
  }
}

async function updatePassportActivity(userDid: string) {
  try {
    await db.updatePassport(userDid, {
      total_interactions: 1, // 실제로는 += 1 이어야 함
      last_activity_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Passport update error:', error);
  }
}

// ============================================================================
// 📊 추가 엔드포인트들 (개선됨)
// ============================================================================

router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'AI Routes',
    database: db.constructor.name,
    timestamp: new Date().toISOString(),
    openaiConfigured: !!process.env.OPENAI_API_KEY,
    anthropicConfigured: !!process.env.ANTHROPIC_API_KEY,
    mockMode: process.env.USE_MOCK_DATABASE === 'true'
  });
});

router.get('/models', asyncHandler(async (req, res) => {
  try {
    // Ollama 연결 상태 확인
    const ollamaConnected = await ollamaService.checkConnection();
    let ollamaModels: string[] = [];
    
    if (ollamaConnected) {
      try {
        ollamaModels = await ollamaService.getModels();
      } catch (error) {
        console.error('Failed to get Ollama models:', error);
      }
    }

    const baseModels = [
      { 
        id: 'personalized-agent', 
        name: 'Personalized Agent', 
        available: true, 
        recommended: true,
        type: 'hybrid',
        description: 'AI Passport 기반 개인화 모델'
      },
      { 
        id: 'gpt-4o', 
        name: 'GPT-4o', 
        available: !!process.env.OPENAI_API_KEY,
        type: 'cloud',
        description: 'OpenAI 최고 성능 모델'
      },
      { 
        id: 'claude-3.5-sonnet', 
        name: 'Claude 3.5 Sonnet', 
        available: !!process.env.ANTHROPIC_API_KEY,
        type: 'cloud',
        description: 'Anthropic 고품질 모델'
      },
      { 
        id: 'gemini-pro', 
        name: 'Gemini Pro', 
        available: false,
        type: 'cloud',
        description: 'Google AI 모델 (준비 중)'
      }
    ];

    // Ollama 모델들을 목록에 추가
    const ollamaModelEntries = ollamaModels.map(modelName => {
      const isRecommended = ['llama3.2:3b', 'llama3.2:1b'].includes(modelName);
      const size = modelName.includes(':1b') ? '1B' : 
                   modelName.includes(':2b') ? '2B' :
                   modelName.includes(':3b') ? '3B' :
                   modelName.includes(':7b') ? '7B' :
                   modelName.includes(':8b') ? '8B' : 'Unknown';
      
      return {
        id: modelName,
        name: `${modelName.split(':')[0].toUpperCase()} (${size})`,
        available: true,
        recommended: isRecommended,
        type: 'local',
        provider: 'ollama',
        description: `로컬 AI 모델 - 완전한 프라이버시 보장`,
        speed: modelName.includes(':1b') ? 'very-fast' :
               modelName.includes(':3b') ? 'fast' : 'moderate'
      };
    });

    res.json({
      success: true,
      ollama: {
        connected: ollamaConnected,
        models: ollamaModels.length
      },
      models: [...baseModels, ...ollamaModelEntries]
    });

  } catch (error) {
    console.error('Error getting models:', error);
    res.json({
      success: false,
      error: 'Failed to retrieve models',
      models: [
        { id: 'personalized-agent', name: 'Personalized Agent', available: true, recommended: true }
      ]
    });
  }
}));

router.get('/ollama/health', asyncHandler(async (req, res) => {
  try {
    const isConnected = await ollamaService.checkConnection();
    const models = isConnected ? await ollamaService.getModels() : [];
    
    res.json({
      success: true,
      connected: isConnected,
      url: process.env.OLLAMA_URL || 'http://localhost:11434',
      models: models,
      modelCount: models.length,
      recommendedModels: ['llama3.2:3b', 'llama3.2:1b', 'gemma2:2b'],
      status: isConnected ? 'ready' : 'disconnected'
    });
  } catch (error: any) {
    res.json({
      success: false,
      connected: false,
      error: error.message,
      status: 'error'
    });
  }
}));
console.log(`🔍 디버그: 받은 모델명 = "${model}"`);

switch (model) {
  case 'gpt-4o':
  case 'gpt-4':
    console.log('📍 GPT 케이스 실행');
    aiResult = await generateGPTResponse(message, personalContext);
    break;
  case 'claude-3.5-sonnet':
  case 'claude-sonnet':
    console.log('📍 Claude 케이스 실행');
    aiResult = await generateClaudeResponse(message, personalContext);
    break;
  case 'gemini-pro':
    console.log('📍 Gemini 케이스 실행');
    aiResult = await generateGeminiResponse(message, personalContext);
    break;
  
  // 🦙 Ollama 로컬 모델들 추가
  case 'llama3.2:3b':
  case 'llama3.2:1b':
  case 'llama3.1:8b':
  case 'gemma2:2b':
  case 'qwen2.5:3b':
  case 'qwen2.5:1.5b':
    console.log('📍 Ollama 특정 케이스 실행:', model);
    aiResult = await generateOllamaResponse(message, personalContext, model);
    break;
  
  // 기본 모델명으로 Ollama 모델 감지
  default:
    console.log('📍 Default 케이스 실행:', model);
    if (model.startsWith('llama') || model.startsWith('gemma') || model.startsWith('qwen') || model.startsWith('phi') || model.startsWith('mistral')) {
      console.log('📍 Default에서 Ollama 모델 감지:', model);
      aiResult = await generateOllamaResponse(message, personalContext, model);
    } else {
      console.log('📍 개인화 에이전트 실행');
      aiResult = await generatePersonalizedResponse(message, personalContext, userDid);
    }
    break;
}
// 7. Ollama 모델 다운로드 엔드포인트 추가
router.post('/ollama/pull', asyncHandler(async (req, res) => {
  const { model } = req.body;
  
  if (!model) {
    return res.status(400).json({
      success: false,
      error: 'Model name is required'
    });
  }

  try {
    console.log(`🦙 Downloading Ollama model: ${model}`);
    await ollamaService.pullModel(model);
    
    res.json({
      success: true,
      message: `Model ${model} download started`,
      model: model
    });
  } catch (error: any) {
    console.error(`Failed to pull model ${model}:`, error);
    res.status(500).json({
      success: false,
      error: `Failed to download model: ${error.message}`,
      model: model
    });
  }
}));
// 전체 히스토리 (conversationId 없이)
router.get('/history', asyncHandler(async (req: express.Request, res: express.Response) => {
  const userDid = (req as any).user?.did;
  const { limit = 50 } = req.query;

  if (!userDid) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  try {
    let messages: any[] = [];
    if ('getChatHistory' in db && typeof (db as any).getChatHistory === 'function') {
      messages = await (db as any).getChatHistory(userDid, undefined, parseInt(limit as string));
    } else {
      return res.status(501).json({
        success: false,
        error: 'Chat history retrieval is not supported by the current database service.'
      });
    }
    
    res.json({
      success: true,
      messages,
      count: messages.length,
      conversationId: null
    });
  } catch (error) {
    console.error('Get chat history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve chat history'
    });
  }
}));

// 특정 대화 히스토리 (기존 코드, ? 제거)
  // 기존 코드 그대로 유지, 첫 줄만 수정
router.get('/history/:conversationId', asyncHandler(async (req: express.Request, res: express.Response) => {
  const userDid = (req as any).user?.did;
  const { conversationId } = req.params;
  const { limit = 50 } = req.query;

  if (!userDid) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  try {
    let messages: any[] = [];
    if ('getChatHistory' in db && typeof (db as any).getChatHistory === 'function') {
      messages = await (db as any).getChatHistory(userDid, conversationId, parseInt(limit as string));
    } else {
      return res.status(501).json({
        success: false,
        error: 'Chat history retrieval is not supported by the current database service.'
      });
    }
    
    res.json({
      success: true,
      messages,
      count: messages.length,
      conversationId: conversationId || null
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
  const userDid = (req as any).user?.did;

  if (!userDid) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  try {
    const personalizationService = new PersonalizationService(db as any);
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
        personalityMatch: context.personalityMatch,
        preferences: context.preferences
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

// 통계 엔드포인트 추가
router.get('/stats', asyncHandler(async (req: express.Request, res: express.Response) => {
  try {
    let stats;
    if ('getStatistics' in db && typeof (db as any).getStatistics === 'function') {
      stats = (db as any).getStatistics();
    } else {
      stats = {
        message: 'Statistics not available',
        timestamp: new Date().toISOString()
      };
    }

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve statistics'
    });
  }
}));
console.log('✅ [라우트명] routes loaded successfully');

export default router;