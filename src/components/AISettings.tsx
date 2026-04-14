import { useState, useEffect } from 'react';
import { Settings, X, Check, Cloud, HardDrive, ExternalLink, CreditCard, Download, ChevronDown, ChevronUp, Trash2, AlertCircle } from 'lucide-react';
import {
  saveApiKey,
  deleteApiKey,
  isModelConfigured,
  type ModelInfo,
  AVAILABLE_MODELS,
} from '../services/ai-key-storage';

// AI模型定义
export interface AIModel {
  id: string;
  name: string;
  provider: string;
  description: string;
  price: string;
  context: string;
  taxAbility: number; // 1-5 stars
  type: 'cloud' | 'local';
  status: 'available' | 'upcoming';
  apiUrl?: string; // API Key获取网址
}

// 最新AI模型列表 (2026年Q1)
const AI_MODELS: AIModel[] = [
  // 国际顶级模型
  {
    id: 'gpt-5.4-pro',
    name: 'GPT-5.4 Pro',
    provider: 'OpenAI',
    description: '逻辑推理王者，支持思考模式，财税最强',
    price: '$100/月',
    context: '1.1M tokens',
    taxAbility: 5,
    type: 'cloud',
    status: 'available',
    apiUrl: 'https://platform.openai.com/api-keys'
  },
  {
    id: 'gpt-5.4-mini',
    name: 'GPT-5.4 Mini',
    provider: 'OpenAI',
    description: '轻量快速，性价比高',
    price: '$3/百万tokens',
    context: '1M tokens',
    taxAbility: 4,
    type: 'cloud',
    status: 'available',
    apiUrl: 'https://platform.openai.com/api-keys'
  },
  {
    id: 'claude-4.6-opus',
    name: 'Claude 4.6 Opus',
    provider: 'Anthropic',
    description: '低幻觉率，准确可靠',
    price: '$25/月',
    context: '1M tokens',
    taxAbility: 5,
    type: 'cloud',
    status: 'available',
    apiUrl: 'https://console.anthropic.com/settings/keys'
  },
  {
    id: 'gemini-3.1-pro',
    name: 'Gemini 3.1 Pro',
    provider: 'Google',
    description: '多模态原生支持',
    price: '$35/月',
    context: '2M+ tokens',
    taxAbility: 4,
    type: 'cloud',
    status: 'available',
    apiUrl: 'https://aistudio.google.com/app/apikey'
  },
  // 国内主流模型
  {
    id: 'deepseek-v3.2',
    name: 'DeepSeek V3.2',
    provider: '深度求索',
    description: '极高性价比，逻辑推理接近GPT-5',
    price: '免费+按量',
    context: '512K tokens',
    taxAbility: 4,
    type: 'cloud',
    status: 'available',
    apiUrl: 'https://platform.deepseek.com/api-keys'
  },
  {
    id: 'kimi-k2.5',
    name: 'Kimi K2.5',
    provider: '月之暗面',
    description: '长文本处理领先，擅长财税文档',
    price: '免费额度',
    context: '2M tokens',
    taxAbility: 4,
    type: 'cloud',
    status: 'available',
    apiUrl: 'https://platform.moonshot.cn/account/api-keys'
  },
  {
    id: 'qwen-3',
    name: 'Qwen 3',
    provider: '阿里云',
    description: '综合素质均衡，插件生态丰富',
    price: '免费+按量',
    context: '1M tokens',
    taxAbility: 4,
    type: 'cloud',
    status: 'available',
    apiUrl: 'https://dashscope.console.aliyun.com/manage'
  },
  // 本地模型
  {
    id: 'llama-4-70b',
    name: 'Llama 4 (70B)',
    provider: 'Meta (本地)',
    description: '开源定海神针，性能对标Claude 4.5',
    price: '免费',
    context: '128K tokens',
    taxAbility: 4,
    type: 'local',
    status: 'available'
  },
  {
    id: 'qwen2.5-7b',
    name: 'Qwen2.5 7B',
    provider: '阿里云 (本地)',
    description: '中文好，免费离线可用',
    price: '免费',
    context: '128K tokens',
    taxAbility: 3,
    type: 'local',
    status: 'available'
  },
  // ============ NVIDIA GPU 加速模型 (测试) ============
  // Groq 免费高速推理 (使用 NVIDIA GPU)
  {
    id: 'groq-llama-3.3-70b',
    name: 'Llama 3.3 70B (Groq)',
    provider: 'Groq (NVIDIA GPU)',
    description: '🔥 免费高速推理，支持财税推理，Groq LPU 加速',
    price: '免费',
    context: '128K tokens',
    taxAbility: 4,
    type: 'cloud',
    status: 'available',
    apiUrl: 'https://console.groq.com/keys'
  },
  {
    id: 'groq-llama-3.1-8b',
    name: 'Llama 3.1 8B (Groq)',
    provider: 'Groq (NVIDIA GPU)',
    description: '🔥 超快推理，极低延迟，免费额度充足',
    price: '免费',
    context: '128K tokens',
    taxAbility: 3,
    type: 'cloud',
    status: 'available',
    apiUrl: 'https://console.groq.com/keys'
  },
  {
    id: 'groq-mixtral-8x7b',
    name: 'Mixtral 8x7B (Groq)',
    provider: 'Groq (NVIDIA GPU)',
    description: '🔥 MoE架构，多专家组合，免费高速',
    price: '免费',
    context: '32K tokens',
    taxAbility: 4,
    type: 'cloud',
    status: 'available',
    apiUrl: 'https://console.groq.com/keys'
  },
  // Fireworks AI (使用 NVIDIA GPU)
  {
    id: 'fireworks-llama-3.1-405b',
    name: 'Llama 3.1 405B (Fireworks)',
    provider: 'Fireworks (NVIDIA GPU)',
    description: '超大海量模型，支持长上下文，精确推理',
    price: '$0.88/百万tokens',
    context: '128K tokens',
    taxAbility: 5,
    type: 'cloud',
    status: 'available',
    apiUrl: 'https:// fireworks.ai/'
  },
  {
    id: 'fireworks-qwen-2.5-72b',
    name: 'Qwen2.5 72B (Fireworks)',
    provider: 'Fireworks (NVIDIA GPU)',
    description: '阿里顶级开源，中文优化，性价比极高',
    price: '$0.9/百万tokens',
    context: '128K tokens',
    taxAbility: 5,
    type: 'cloud',
    status: 'available',
    apiUrl: 'https://fireworks.ai/'
  },
  // Lepton AI (使用 NVIDIA GPU)
  {
    id: 'lepton-llama-3.1-405b',
    name: 'Llama 3.1 405B (Lepton)',
    provider: 'Lepton (NVIDIA GPU)',
    description: '极速推理，透明计费，财税场景优化',
    price: '$0.5/百万tokens',
    context: '128K tokens',
    taxAbility: 5,
    type: 'cloud',
    status: 'available',
    apiUrl: 'https://www.lepton.ai/'
  }
];

interface AISettingsProps {
  isOpen: boolean;
  onClose: () => void;
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
}

export default function AISettings({ isOpen, onClose, selectedModel, onSelectModel }: AISettingsProps) {
  const [filter, setFilter] = useState<'all' | 'cloud' | 'local'>('all');
  const [expandedModel, setExpandedModel] = useState<string | null>(null);
  const [apiKeyInputs, setApiKeyInputs] = useState<Record<string, string>>({});
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({});
  const [saveStatus, setSaveStatus] = useState<Record<string, 'idle' | 'saved' | 'error'>>({});

  // 刷新已配置的模型状态
  const [configuredModels, setConfiguredModels] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      const checkConfigured = async () => {
        const configured = new Set<string>();
        for (const m of AVAILABLE_MODELS) {
          if (await isModelConfigured(m.id)) {
            configured.add(m.id);
          }
        }
        setConfiguredModels(configured);
      };
      checkConfigured();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredModels = AI_MODELS.filter(m => filter === 'all' || m.type === filter);

  const handleSaveApiKey = async (modelId: string) => {
    const key = apiKeyInputs[modelId]?.trim();
    if (!key) return;

    try {
      await saveApiKey(modelId, key);
      setSaveStatus({ ...saveStatus, [modelId]: 'saved' });
      setConfiguredModels(prev => new Set([...prev, modelId]));
      setTimeout(() => setSaveStatus(prev => ({ ...prev, [modelId]: 'idle' })), 2000);
    } catch {
      setSaveStatus({ ...saveStatus, [modelId]: 'error' });
    }
  };

  const handleDeleteApiKey = async (modelId: string) => {
    await deleteApiKey(modelId);
    setConfiguredModels(prev => {
      const next = new Set(prev);
      next.delete(modelId);
      return next;
    });
    setApiKeyInputs(prev => {
      const next = { ...prev };
      delete next[modelId];
      return next;
    });
  };

  const handleSelectModel = (modelId: string) => {
    onSelectModel(modelId);
    // 如果该模型需要 API Key 但未配置，展开它
    const model = AI_MODELS.find(m => m.id === modelId);
    if (model?.type === 'cloud' && !configuredModels.has(modelId)) {
      setExpandedModel(modelId);
    }
  };

  const renderStars = (count: number) => {
    return '⭐'.repeat(count) + '☆'.repeat(5 - count);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl">
        {/* 头部 */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Settings className="w-6 h-6" />
              AI 模型设置中心
            </h2>
            <p className="text-blue-100 text-sm">选择最适合您的AI模型</p>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* 筛选 */}
        <div className="px-6 py-3 border-b flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filter === 'all' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
            }`}
          >
            全部模型
          </button>
          <button
            onClick={() => setFilter('cloud')}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1 transition ${
              filter === 'cloud' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
            }`}
          >
            <Cloud className="w-4 h-4" /> 云端模型
          </button>
          <button
            onClick={() => setFilter('local')}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1 transition ${
              filter === 'local' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
            }`}
          >
            <HardDrive className="w-4 h-4" /> 本地模型
          </button>
        </div>

        {/* 模型列表 */}
        <div className="px-6 py-4 overflow-y-auto max-h-[60vh]">
          <div className="grid gap-3">
            {filteredModels.map(model => (
              <div
                key={model.id}
                className={`border-2 rounded-lg p-4 transition cursor-pointer ${
                  selectedModel === model.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleSelectModel(model.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {selectedModel === model.id && (
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900">{model.name}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                          {model.provider}
                        </span>
                        {configuredModels.has(model.id) ? (
                          <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700 flex items-center gap-1">
                            <Check className="w-3 h-3" /> 已配置
                          </span>
                        ) : model.type === 'cloud' ? (
                          <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-700 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> 未配置
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700 flex items-center gap-1">
                            <HardDrive className="w-3 h-3" /> 离线可用
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{model.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <CreditCard className="w-4 h-4" /> {model.price}
                        </span>
                        <span>{model.context}</span>
                        <span>{renderStars(model.taxAbility)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 展开详情 */}
                {expandedModel === model.id && (
                  <div className="mt-4 pt-4 border-t">
                    {model.type === 'cloud' ? (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          API Key {configuredModels.has(model.id) && <span className="text-green-600 text-xs">(已保存)</span>}
                        </label>
                        <div className="flex gap-2">
                          <input
                            type={showApiKey[model.id] ? 'text' : 'password'}
                            value={apiKeyInputs[model.id] || ''}
                            onChange={(e) => setApiKeyInputs({ ...apiKeyInputs, [model.id]: e.target.value })}
                            placeholder={configuredModels.has(model.id) ? '••••••••' : '请输入 API Key'}
                            className="flex-1 px-3 py-2 border rounded-lg text-sm"
                          />
                          <button
                            onClick={() => setShowApiKey({ ...showApiKey, [model.id]: !showApiKey[model.id] })}
                            className="px-3 py-2 bg-gray-100 rounded-lg text-sm"
                          >
                            {showApiKey[model.id] ? '隐藏' : '显示'}
                          </button>
                          <button
                            onClick={() => handleSaveApiKey(model.id)}
                            disabled={!apiKeyInputs[model.id]?.trim()}
                            className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Check className="w-4 h-4" /> {saveStatus[model.id] === 'saved' ? '已保存' : '保存'}
                          </button>
                          {configuredModels.has(model.id) && (
                            <button
                              onClick={() => handleDeleteApiKey(model.id)}
                              className="px-3 py-2 bg-red-50 text-red-600 rounded-lg text-sm flex items-center gap-1 hover:bg-red-100"
                              title="删除已保存的 API Key"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        {model.apiUrl && (
                          <div className="mt-3 flex items-center gap-2">
                            <a
                              href={model.apiUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 flex items-center gap-1 hover:underline"
                            >
                              <ExternalLink className="w-4 h-4" />
                              获取 API Key
                            </a>
                          </div>
                        )}
                        {saveStatus[model.id] === 'error' && (
                          <p className="mt-2 text-sm text-red-600">保存失败，请重试</p>
                        )}
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm text-gray-600 mb-3">
                          本地模型需要下载后使用，数据完全保存在本地，安全可靠。
                        </p>
                        <button className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm flex items-center gap-1">
                          <Download className="w-4 h-4" /> 下载模型 ({model.id})
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedModel(expandedModel === model.id ? null : model.id);
                  }}
                  className="mt-2 text-sm text-gray-500 flex items-center gap-1"
                >
                  {expandedModel === model.id ? (
                    <>收起 <ChevronUp className="w-4 h-4" /></>
                  ) : (
                    <>展开配置 <ChevronDown className="w-4 h-4" /></>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 底部说明 */}
        <div className="px-6 py-4 bg-gray-50 border-t">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <span className="font-medium">当前选择:</span> {AI_MODELS.find(m => m.id === selectedModel)?.name || '未选择'}
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm"
              >
                取消
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
              >
                确认并开始使用
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
