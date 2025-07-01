'use client';

import React, { useState } from 'react';
import { 
  AlertTriangle, CheckCircle, XCircle, Copy, 
  Terminal, Code, Settings, RefreshCw, Bug,
  FileText, Database, Key, MessageCircle
} from 'lucide-react';

export default function BackendErrorDebugger() {
  const [selectedError, setSelectedError] = useState('ai-chat');

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
              <Bug className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Backend Error Debugger</h1>
              <p className="text-gray-600">API 에러 분석 및 해결 가이드</p>
            </div>
          </div>

          {/* 에러 선택 버튼들 */}
          <div className="flex space-x-2">
            <button
              onClick={() => setSelectedError('ai-chat')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                selectedError === 'ai-chat'
                  ? 'bg-red-100 text-red-700 border border-red-300'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <MessageCircle className="w-4 h-4 inline mr-2" />
              AI Chat Error
            </button>
          </div>
        </div>

        {/* 빠른 해결책 */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-4">
            🚀 빠른 해결 방법
          </h3>
          
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-medium text-blue-800 mb-2">1. AI 채팅 라우트 생성:</h4>
              <div className="bg-blue-100 p-4 rounded">
                <p className="text-blue-900 mb-2">backend/src/routes/ai/chat.ts 파일 생성</p>
                <button
                  onClick={() => copyToClipboard(`import express from 'express';
const router = express.Router();

router.post('/chat', async (req, res) => {
  try {
    const { message, model } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    // 임시 Mock 응답
    res.json({
      success: true,
      response: \`AI Response: \${message}\`,
      cueTokensEarned: 3,
      usedPassportData: ['Mock Knowledge']
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;`)}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
                >
                  Copy Code
                </button>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-blue-800 mb-2">2. CUE 마이닝 라우트 생성:</h4>
              <div className="bg-blue-100 p-4 rounded">
                <p className="text-blue-900 mb-2">backend/src/routes/cue/mining.ts 파일 생성</p>
                <button
                  onClick={() => copyToClipboard(`import express from 'express';
const router = express.Router();

router.post('/mine', async (req, res) => {
  try {
    const { userId, amount } = req.body;
    
    if (!userId || !amount) {
      return res.status(400).json({ 
        error: 'userId and amount are required' 
      });
    }
    
    // 임시 Mock 응답
    res.json({
      success: true,
      amount: amount,
      newBalance: 1000 + amount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;`)}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
                >
                  Copy Code
                </button>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-blue-800 mb-2">3. app.ts에 라우트 등록:</h4>
              <div className="bg-blue-100 p-4 rounded">
                <p className="text-blue-900 mb-2">backend/src/app.ts 파일에 추가</p>
                <button
                  onClick={() => copyToClipboard(`// 기존 imports에 추가
import aiRoutes from './routes/ai/chat';
import cueRoutes from './routes/cue/mining';

// 기존 라우트들 아래에 추가
app.use('/api/ai', aiRoutes);
app.use('/api/cue', cueRoutes);`)}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
                >
                  Copy Code
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}