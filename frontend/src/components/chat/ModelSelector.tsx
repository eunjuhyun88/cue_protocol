// ============================================================================
// 📁 src/components/chat/ModelSelector.tsx
// 🤖 AI 모델 선택 컴포넌트
// ============================================================================
// 이 컴포넌트는 사용자가 AI 모델을 선택할 수 있는 드롭다운 메뉴를
// 제공합니다. 사용 가능한 모델 목록을 표시하며, 각 모델의 이름,
// 제공자, 설명, 사용 가능 여부, 비용 등을 보여줍니다. 백엔드
// 연결 상태에 따라 사용 가능한 모델이 제한될 수 있습니다.
// 선택된 모델의 정보는 드롭다운 아래에 표시되며, AI Passport 데이터
//가 자동으로 포함된다는 힌트를 제공합니다.
// 사용자가 모델을 선택하면 `onModelChange` 콜백이 호출되어
// 선택된 모델이 업데이트됩니다.
// 이 컴포넌트는 클라이언트 측에서만 렌더링
// (use client)되며, Lucide 아이콘을 사용하여 UI를 구성합니다
// 드롭다운 메뉴는 Tailwind CSS를 사용하여 스타일링되며,
// 반응형 디자인을 지원합니다.
// 이 컴포넌트는 AI Passport 시스템의 핵심 기능 중 하나로,
// 사용자가 다양한 AI 모델을 선택하여 개인화된 AI 경험을
// 제공할 수 있도록 합니다.
// 이 컴포넌트는 AI Passport 시스템의 다른 부분과 통합되어,
// 사용자가 선택한 모델에 따라 AI 채팅 인터페이스가
// 동적으로 업데이트됩니다.
// 이 컴포넌트는 AI Passport 시스템의 사용자 경험을 향상시키기
// ============================================================================

'use client';

import React from 'react';
import { ChevronDown, Cpu, Zap, Brain } from 'lucide-react';

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (model: string) => void;
  backendConnected: boolean;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedModel,
  onModelChange,
  backendConnected
}) => {
  const models = [
    {
      id: 'gpt-4',
      name: 'GPT-4',
      provider: 'OpenAI',
      icon: <Brain className="w-4 h-4" />,
      description: '가장 강력한 범용 AI 모델',
      available: backendConnected,
      cost: 3
    },
    {
      id: 'claude-3',
      name: 'Claude 3',
      provider: 'Anthropic',
      icon: <Cpu className="w-4 h-4" />,
      description: '안전하고 도움이 되는 AI 어시스턴트',
      available: backendConnected,
      cost: 2
    },
    {
      id: 'gemini-pro',
      name: 'Gemini Pro',
      provider: 'Google',
      icon: <Zap className="w-4 h-4" />,
      description: '빠르고 효율적인 멀티모달 AI',
      available: backendConnected,
      cost: 2
    },
    {
      id: 'mock-ai',
      name: 'Mock AI',
      provider: 'Demo',
      icon: <Brain className="w-4 h-4" />,
      description: 'Demo용 시뮬레이션 AI',
      available: true,
      cost: 0
    }
  ];

  const currentModel = models.find(m => m.id === selectedModel) || models[0];

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        AI 모델 선택
      </label>
      
      <div className="relative">
        <select
          value={selectedModel}
          onChange={(e) => onModelChange(e.target.value)}
          className="
            w-full appearance-none bg-white border border-gray-300 rounded-lg
            px-4 py-2 pr-8 text-sm
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
            disabled:bg-gray-50 disabled:cursor-not-allowed
          "
        >
          {models.map((model) => (
            <option 
              key={model.id} 
              value={model.id}
              disabled={!model.available}
            >
              {model.name} ({model.provider}) 
              {!model.available && ' - 백엔드 연결 필요'}
            </option>
          ))}
        </select>
        
        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>

      {/* 선택된 모델 정보 */}
      <div className="mt-2 p-3 bg-gray-50 rounded-lg border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {currentModel.icon}
            <div>
              <p className="text-sm font-medium text-gray-900">
                {currentModel.name}
              </p>
              <p className="text-xs text-gray-600">
                {currentModel.description}
              </p>
            </div>
          </div>
          
          <div className="text-right">
            <div className="flex items-center space-x-1 text-xs text-gray-500">
              <Zap className="w-3 h-3" />
              <span>{currentModel.cost > 0 ? `${currentModel.cost} CUE` : 'Free'}</span>
            </div>
            <div className={`text-xs font-medium ${
              currentModel.available ? 'text-green-600' : 'text-red-600'
            }`}>
              {currentModel.available ? '사용 가능' : '연결 필요'}
            </div>
          </div>
        </div>
      </div>

      {/* 힌트 */}
      <div className="mt-2 text-xs text-gray-500">
        💡 개인화를 위해 AI Passport 데이터가 자동으로 포함됩니다
      </div>
    </div>
  );
};