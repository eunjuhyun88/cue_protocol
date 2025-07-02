// ============================================================================
// 📁 src/components/chat/ModelSelector.tsx
// 🤖 AI 모델 선택 컴포넌트 (분리됨)
// ============================================================================

'use client';

import React from 'react';
import { ChevronDown, Cpu, Zap, Brain, Globe, Sparkles } from 'lucide-react';

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (model: string) => void;
  backendConnected: boolean;
  className?: string;
}

interface AIModel {
  id: string;
  name: string;
  provider: string;
  icon: React.ReactNode;
  description: string;
  available: boolean;
  cost: number;
  type: 'hybrid' | 'cloud' | 'local';
  speed?: 'very-fast' | 'fast' | 'moderate' | 'slow';
  recommended?: boolean;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedModel,
  onModelChange,
  backendConnected,
  className = ''
}) => {
  const models: AIModel[] = [
    {
      id: 'personalized-agent',
      name: 'Personal Agent',
      provider: 'CUE Protocol',
      icon: <Sparkles className="w-4 h-4" />,
      description: 'AI Passport 기반 개인화 모델',
      available: true,
      cost: 0,
      type: 'hybrid',
      recommended: true
    },
    
    // 🦙 인기 로컬 모델들 (사용자 Ollama 리스트 기반)
    {
      id: 'llama3.2:latest',
      name: '🦙 Llama 3.2 (Latest)',
      provider: 'Meta/Ollama',
      icon: <Brain className="w-4 h-4" />,
      description: '최신 Llama 모델 - 2GB, 고성능',
      available: true,
      cost: 0,
      type: 'local',
      speed: 'fast',
      recommended: true
    },
    {
      id: 'llama3.2:1b',
      name: '🚀 Llama 3.2 (1B)',
      provider: 'Meta/Ollama',
      icon: <Zap className="w-4 h-4" />,
      description: '초고속 모델 - 1.3GB, 실시간 응답',
      available: true,
      cost: 0,
      type: 'local',
      speed: 'very-fast',
      recommended: true
    },
    {
      id: 'llama3.1:8b',
      name: '🧠 Llama 3.1 (8B)',
      provider: 'Meta/Ollama',
      icon: <Brain className="w-4 h-4" />,
      description: '고품질 모델 - 4.9GB, 강력한 성능',
      available: true,
      cost: 0,
      type: 'local',
      speed: 'moderate'
    },
    {
      id: 'phi3:mini',
      name: '⚡ Phi3 Mini',
      provider: 'Microsoft/Ollama',
      icon: <Zap className="w-4 h-4" />,
      description: '효율적인 소형 모델 - 2.2GB',
      available: true,
      cost: 0,
      type: 'local',
      speed: 'fast'
    },
    {
      id: 'deepseek-coder:6.7b',
      name: '💻 DeepSeek Coder (6.7B)',
      provider: 'DeepSeek/Ollama',
      icon: <Cpu className="w-4 h-4" />,
      description: '코딩 전문 AI - 3.8GB',
      available: true,
      cost: 0,
      type: 'local',
      speed: 'moderate'
    },
    {
      id: 'mistral:latest',
      name: '🇫🇷 Mistral (7B)',
      provider: 'Mistral/Ollama',
      icon: <Globe className="w-4 h-4" />,
      description: '유럽산 고품질 모델 - 4.1GB',
      available: true,
      cost: 0,
      type: 'local',
      speed: 'moderate'
    },
    {
      id: 'codellama:7b',
      name: '🔨 CodeLlama (7B)',
      provider: 'Meta/Ollama',
      icon: <Cpu className="w-4 h-4" />,
      description: '코딩 특화 모델 - 3.8GB',
      available: true,
      cost: 0,
      type: 'local',
      speed: 'moderate'
    },
    {
      id: 'qwen:7b',
      name: '🇰🇷 Qwen (7B)',
      provider: 'Alibaba/Ollama',
      icon: <Globe className="w-4 h-4" />,
      description: '다국어 지원 - 4.5GB',
      available: true,
      cost: 0,
      type: 'local',
      speed: 'moderate'
    }
  ];

  const currentModel = models.find(m => m.id === selectedModel) || models[0];

  const getModelTypeColor = (type: string) => {
    switch (type) {
      case 'hybrid': return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'local': return 'text-green-600 bg-green-50 border-green-200';
      case 'cloud': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getSpeedIndicator = (speed?: string) => {
    switch (speed) {
      case 'very-fast': return '🚀';
      case 'fast': return '⚡';
      case 'moderate': return '🔄';
      case 'slow': return '🐌';
      default: return '';
    }
  };

  return (
    <div className={`relative ${className}`}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        AI 모델 선택
      </label>
      
      {/* 현재 선택된 모델 정보 */}
      <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {currentModel.icon}
            <div>
              <span className="font-medium text-gray-900">{currentModel.name}</span>
              <span className="text-xs text-gray-500 ml-1">({currentModel.provider})</span>
            </div>
            {currentModel.recommended && (
              <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded-full">
                추천
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-1 text-xs rounded-full border ${getModelTypeColor(currentModel.type)}`}>
              {currentModel.type.toUpperCase()}
            </span>
            {currentModel.speed && (
              <span className="text-lg" title={`속도: ${currentModel.speed}`}>
                {getSpeedIndicator(currentModel.speed)}
              </span>
            )}
          </div>
        </div>
        <p className="text-xs text-gray-600 mt-1">{currentModel.description}</p>
        
        {/* AI Passport 개인화 힌트 */}
        {currentModel.id === 'personalized-agent' && (
          <div className="mt-2 p-2 bg-purple-50 border border-purple-200 rounded text-xs text-purple-700">
            💫 <strong>개인화 활성화:</strong> AI Passport 데이터가 자동으로 포함됩니다
          </div>
        )}
      </div>
      
      {/* 모델 선택 드롭다운 */}
      <div className="relative">
        <select
          value={selectedModel}
          onChange={(e) => onModelChange(e.target.value)}
          className="
            w-full appearance-none bg-white border-2 border-gray-200 rounded-lg
            px-4 py-3 pr-10 text-sm
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
            disabled:bg-gray-50 disabled:cursor-not-allowed
            hover:border-gray-300 transition-colors
          "
        >
          <optgroup label="🌟 추천 모델">
            {models.filter(m => m.recommended).map((model) => (
              <option 
                key={model.id} 
                value={model.id}
                disabled={!model.available}
              >
                {model.name} - {model.description}
                {!model.available ? ' (사용 불가)' : ''}
              </option>
            ))}
          </optgroup>
          
          <optgroup label="🦙 Llama 시리즈 (추천)">
            {models.filter(m => m.id.startsWith('llama')).map((model) => (
              <option 
                key={model.id} 
                value={model.id}
                disabled={!model.available}
              >
                {model.name} - {model.description}
              </option>
            ))}
          </optgroup>
          
          <optgroup label="💻 코딩 특화 AI">
            {models.filter(m => m.id.includes('coder') || m.id.includes('codellama')).map((model) => (
              <option 
                key={model.id} 
                value={model.id}
                disabled={!model.available}
              >
                {model.name} - {model.description}
              </option>
            ))}
          </optgroup>
          
          <optgroup label="⚡ 고속/경량 모델">
            {models.filter(m => m.id.includes('phi') || m.id.includes('mistral') || m.id.includes('qwen')).map((model) => (
              <option 
                key={model.id} 
                value={model.id}
                disabled={!model.available}
              >
                {model.name} - {model.description}
              </option>
            ))}
          </optgroup>
        </select>
        
        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
      </div>
      
      {/* 백엔드 연결 상태는 제거하고 모델 사용법 안내 */}
      <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
        💡 <strong>로컬 AI 사용:</strong> 모든 모델이 사용자 기기에서 실행되어 완전한 프라이버시 보장
      </div>
      
      {/* 모델 타입별 설명 */}
      <div className="mt-3 space-y-1 text-xs text-gray-600">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
          <span><strong>Hybrid:</strong> AI Passport + 로컬 AI 조합</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
          <span><strong>Local:</strong> 완전한 프라이버시, 무제한 사용</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
          <span><strong>속도:</strong> 🚀초고속 ⚡빠름 🔄보통</span>
        </div>
      </div>
    </div>
  );
};