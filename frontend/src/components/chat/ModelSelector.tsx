// ============================================================================
// 📁 frontend/src/components/chat/ModelSelector.tsx
// 🦙 Ollama 전용 모델 선택기 (OpenAI/Claude 제거)
// ============================================================================

import React, { useState, useEffect } from 'react';
import { ChevronDown, Cpu, Zap, Brain, Code, Globe } from 'lucide-react';

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (model: string) => void;
  className?: string;
}

// 🦙 Ollama 지원 모델들
const OLLAMA_MODELS = [
  {
    id: 'llama3.2',
    name: 'Llama 3.2',
    description: '최신 Meta 모델, 균형잡힌 성능',
    icon: <Brain className="w-4 h-4" />,
    size: '7B',
    recommended: true,
    color: 'bg-blue-500'
  },
  {
    id: 'llama3.2:3b',
    name: 'Llama 3.2 (3B)',
    description: '빠른 응답, 가벼운 모델',
    icon: <Zap className="w-4 h-4" />,
    size: '3B',
    recommended: false,
    color: 'bg-green-500'
  },
  {
    id: 'llama3.2:1b',
    name: 'Llama 3.2 (1B)',
    description: '초고속 응답, 초경량 모델',
    icon: <Zap className="w-4 h-4" />,
    size: '1B',
    recommended: false,
    color: 'bg-emerald-500'
  },
  {
    id: 'mistral',
    name: 'Mistral',
    description: '유럽산 고성능 모델',
    icon: <Globe className="w-4 h-4" />,
    size: '7B',
    recommended: false,
    color: 'bg-purple-500'
  },
  {
    id: 'codellama',
    name: 'Code Llama',
    description: '코딩 전문 모델',
    icon: <Code className="w-4 h-4" />,
    size: '7B',
    recommended: false,
    color: 'bg-orange-500'
  },
  {
    id: 'phi3',
    name: 'Phi-3',
    description: 'Microsoft의 소형 고성능 모델',
    icon: <Cpu className="w-4 h-4" />,
    size: '3.8B',
    recommended: false,
    color: 'bg-cyan-500'
  },
  {
    id: 'gemma',
    name: 'Gemma',
    description: 'Google의 오픈소스 모델',
    icon: <Brain className="w-4 h-4" />,
    size: '2B/7B',
    recommended: false,
    color: 'bg-red-500'
  }
];

const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedModel,
  onModelChange,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [ollamaStatus, setOllamaStatus] = useState<{
    connected: boolean;
    availableModels: string[];
    loading: boolean;
  }>({
    connected: false,
    availableModels: [],
    loading: true
  });

  // 🔍 Ollama 서버 상태 확인
  useEffect(() => {
    checkOllamaStatus();
  }, []);

  const checkOllamaStatus = async () => {
    try {
      console.log('🔍 Ollama 서버 상태 확인 중...');
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/ai/ollama/status`);
      const data = await response.json();
      
      if (data.success && data.connected) {
        const modelNames = data.models?.map((m: any) => m.name || m.model) || [];
        
        setOllamaStatus({
          connected: true,
          availableModels: modelNames,
          loading: false
        });
        
        console.log('✅ Ollama 서버 연결 확인:', {
          modelCount: modelNames.length,
          models: modelNames.slice(0, 3)
        });
      } else {
        throw new Error(data.error || 'Ollama 서버 응답 없음');
      }
      
    } catch (error) {
      console.warn('⚠️ Ollama 서버 연결 실패:', error);
      
      setOllamaStatus({
        connected: false,
        availableModels: [],
        loading: false
      });
    }
  };

  const selectedModelInfo = OLLAMA_MODELS.find(m => m.id === selectedModel) || OLLAMA_MODELS[0];

  // 사용 가능한 모델만 필터링
  const availableModels = OLLAMA_MODELS.filter(model => {
    if (ollamaStatus.availableModels.length === 0) {
      // Ollama 상태를 모르면 모든 모델 표시
      return true;
    }
    
    // Ollama에 설치된 모델만 표시
    return ollamaStatus.availableModels.some(available => 
      available.includes(model.id.split(':')[0]) // 'llama3.2:3b' → 'llama3.2' 매칭
    );
  });

  return (
    <div className={`relative ${className}`}>
      {/* 🦙 Ollama 상태 표시 */}
      <div className="mb-2 flex items-center gap-2 text-xs">
        <div className={`w-2 h-2 rounded-full ${
          ollamaStatus.loading ? 'bg-yellow-400 animate-pulse' :
          ollamaStatus.connected ? 'bg-green-400' : 'bg-red-400'
        }`} />
        <span className="text-gray-600">
          {ollamaStatus.loading ? 'Ollama 상태 확인 중...' :
           ollamaStatus.connected ? `Ollama 연결됨 (${ollamaStatus.availableModels.length}개 모델)` :
           'Ollama 서버 연결 안됨'}
        </span>
        {!ollamaStatus.connected && !ollamaStatus.loading && (
          <button
            onClick={checkOllamaStatus}
            className="text-blue-500 hover:text-blue-600 underline"
          >
            재시도
          </button>
        )}
      </div>

      {/* 모델 선택 버튼 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${selectedModelInfo.color}`} />
          <div className="flex items-center gap-2">
            {selectedModelInfo.icon}
            <span className="font-medium">{selectedModelInfo.name}</span>
            {selectedModelInfo.recommended && (
              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-600 rounded-full">
                추천
              </span>
            )}
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* 모델 선택 드롭다운 */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          <div className="p-2">
            <div className="text-xs text-gray-500 mb-2 px-2">
              🦙 Ollama 로컬 AI 모델 ({availableModels.length}개 사용 가능)
            </div>
            
            {availableModels.map((model) => {
              const isSelected = model.id === selectedModel;
              const isInstalled = ollamaStatus.availableModels.some(available => 
                available.includes(model.id.split(':')[0])
              );
              
              return (
                <button
                  key={model.id}
                  onClick={() => {
                    onModelChange(model.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                    isSelected ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className={`w-3 h-3 rounded-full ${model.color}`} />
                  <div className="flex items-center gap-2">
                    {model.icon}
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{model.name}</span>
                        <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                          {model.size}
                        </span>
                        {model.recommended && (
                          <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">
                            추천
                          </span>
                        )}
                        {isInstalled && (
                          <span className="text-xs bg-green-100 text-green-600 px-1.5 py-0.5 rounded">
                            설치됨
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">{model.description}</div>
                    </div>
                  </div>
                </button>
              );
            })}

            {/* Ollama 설치 안내 */}
            {!ollamaStatus.connected && (
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="text-sm font-medium text-yellow-800 mb-1">
                  🦙 Ollama 서버가 필요합니다
                </div>
                <div className="text-xs text-yellow-700 mb-2">
                  로컬 AI 모델을 사용하려면 Ollama를 설치하고 실행하세요:
                </div>
                <div className="text-xs font-mono bg-yellow-100 p-2 rounded">
                  # Ollama 설치 및 실행<br/>
                  curl -fsSL https://ollama.ai/install.sh | sh<br/>
                  ollama serve<br/>
                  ollama pull llama3.2
                </div>
              </div>
            )}

            {/* 사용법 안내 */}
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-sm font-medium text-blue-800 mb-1">
                💡 Ollama 모델 추천
              </div>
              <div className="text-xs text-blue-700 space-y-1">
                <div>• <strong>Llama 3.2</strong>: 범용 대화, 균형잡힌 성능</div>
                <div>• <strong>Code Llama</strong>: 프로그래밍 및 코드 생성</div>
                <div>• <strong>Mistral</strong>: 창의적 글쓰기 및 분석</div>
                <div>• <strong>Phi-3</strong>: 빠른 응답, 메모리 효율적</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelSelector;

// ============================================================================
// 📁 frontend/src/components/AIPassportSystem.tsx에서 수정할 부분
// 기본 모델을 Ollama로 변경
// ============================================================================

/*
AIPassportSystem.tsx에서 다음 라인을 찾아서 수정:

기존:
const [selectedModel, setSelectedModel] = useState('personalized-agent');

수정:
const [selectedModel, setSelectedModel] = useState('llama3.2');

이렇게 하면 기본값이 Ollama Llama 3.2 모델로 설정됩니다.
*/