// AI服务层 - 支持多模型
// src/utils/ai-service.ts

import type { AIModel } from '../components/AISettings';
import {
  getApiKey,
  saveApiKey,
  getSelectedModel,
  saveSelectedModel,
} from '../services/ai-key-storage';

// 模型配置
const MODEL_CONFIGS: Record<string, {
  endpoint: string;
  apiKeyRequired: boolean;
  supportsStream: boolean;
}> = {
  // OpenAI
  'gpt-5.4-pro': {
    endpoint: 'https://api.openai.com/v1/chat/completions',
    apiKeyRequired: true,
    supportsStream: true
  },
  'gpt-5.4-mini': {
    endpoint: 'https://api.openai.com/v1/chat/completions',
    apiKeyRequired: true,
    supportsStream: true
  },
  // Anthropic
  'claude-4.6-opus': {
    endpoint: 'https://api.anthropic.com/v1/messages',
    apiKeyRequired: true,
    supportsStream: true
  },
  // Google
  'gemini-3.1-pro': {
    endpoint: 'https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent',
    apiKeyRequired: true,
    supportsStream: false
  },
  // 国内模型
  'deepseek-v3.2': {
    endpoint: 'https://api.deepseek.com/v1/chat/completions',
    apiKeyRequired: true,
    supportsStream: true
  },
  'kimi-k2.5': {
    endpoint: 'https://api.moonshot.cn/v1/chat/completions',
    apiKeyRequired: true,
    supportsStream: true
  },
  'qwen-3': {
    endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    apiKeyRequired: true,
    supportsStream: false
  },
  // 本地模型
  'llama-4-70b': {
    endpoint: 'http://localhost:11434/api/chat',
    apiKeyRequired: false,
    supportsStream: true
  },
  'qwen2.5-7b': {
    endpoint: 'http://localhost:11434/api/chat',
    apiKeyRequired: false,
    supportsStream: true
  },
  // ============ NVIDIA GPU 加速模型 (Groq) ============
  'groq-llama-3.3-70b': {
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    apiKeyRequired: true,
    supportsStream: true
  },
  'groq-llama-3.1-8b': {
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    apiKeyRequired: true,
    supportsStream: true
  },
  'groq-mixtral-8x7b': {
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    apiKeyRequired: true,
    supportsStream: true
  },
  // ============ NVIDIA GPU 加速模型 (Fireworks) ============
  'fireworks-llama-3.1-405b': {
    endpoint: 'https://api.fireworks.ai/inference/v1/chat/completions',
    apiKeyRequired: true,
    supportsStream: true
  },
  'fireworks-qwen-2.5-72b': {
    endpoint: 'https://api.fireworks.ai/inference/v1/chat/completions',
    apiKeyRequired: true,
    supportsStream: true
  },
  // ============ NVIDIA GPU 加速模型 (Lepton) ============
  'lepton-llama-3.1-405b': {
    endpoint: 'https://llama3-1-405b.lepton.run/api/v1/chat/completions',
    apiKeyRequired: true,
    supportsStream: true
  }
};

// 财税分析提示词模板
const TAX_ANALYSIS_PROMPT = `
你是一个专业的税务顾问AI，擅长企业所得税年度汇算清缴分析。

请分析以下财务数据并提供：
1. 税负分析 - 计算企业所得税税负率
2. 风险识别 - 识别潜在的税务风险
3. 优化建议 - 提供合法节税建议
4. 合规性检查 - 检查是否符合税法要求

财务数据：
- 营业收入：{{revenue}} 元
- 营业成本：{{costOfSales}} 元
- 毛利：{{grossProfit}} 元
- 利润总额：{{totalProfit}} 元
- 资产总计：{{assets}} 元
- 负债合计：{{liabilities}} 元

请用JSON格式返回分析结果，格式如下：
{
  "taxBurden": { "rate": number, "assessment": "normal/high/low" },
  "risks": [{ "title": string, "severity": "high/medium/low", "description": string }],
  "optimizations": [{ "title": string, "estimatedSavings": number, "steps": string[] }],
  "compliance": { "isCompliant": boolean, "issues": string[] }
}
`;

interface AnalysisRequest {
  revenue: number;
  costOfSales: number;
  grossProfit: number;
  totalProfit: number;
  assets: number;
  liabilities: number;
}

interface AnalysisResult {
  taxBurden: { rate: number; assessment: string };
  risks: Array<{ title: string; severity: string; description: string }>;
  optimizations: Array<{ title: string; estimatedSavings: number; steps: string[] }>;
  compliance: { isCompliant: boolean; issues: string[] };
}

class AIService {
  private selectedModel: string = 'deepseek-v3.2';
  private isOnline: boolean = true;
  private initialized: boolean = false;

  constructor() {
    // 异步初始化（不在构造函数中等待）
    this.init();
  }

  private async init() {
    try {
      this.selectedModel = await getSelectedModel();
    } catch {
      // 使用默认值
    }
    this.checkNetwork();
    this.initialized = true;
  }

  // 获取API Key (使用 ai-key-storage)
  async getApiKey(model: string): Promise<string | null> {
    return getApiKey(model);
  }

  // 保存API Key (使用 ai-key-storage)
  async saveApiKey(model: string, apiKey: string): Promise<void> {
    await saveApiKey(model, apiKey);
  }

  // 设置选中的模型
  async setModel(model: string): Promise<void> {
    this.selectedModel = model;
    await saveSelectedModel(model);
  }

  // 获取选中的模型
  getModel(): string {
    return this.selectedModel;
  }

  // 检测网络状态
  async checkNetwork(): Promise<boolean> {
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'HEAD',
        signal: AbortSignal.timeout(3000)
      });
      this.isOnline = response.ok;
    } catch {
      this.isOnline = false;
    }
    return this.isOnline;
  }

  // 获取网络状态
  getOnlineStatus(): boolean {
    return this.isOnline;
  }

  // 检查本地模型是否可用
  async checkLocalModel(): Promise<boolean> {
    try {
      const response = await fetch('http://localhost:11434/api/tags', {
        signal: AbortSignal.timeout(3000)
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  // 检查当前选中的模型是否已配置 API Key
  async isCurrentModelConfigured(): Promise<boolean> {
    return (await getApiKey(this.selectedModel)) !== null;
  }

  // 财税分析
  async analyzeTax(data: AnalysisRequest): Promise<AnalysisResult> {
    const config = MODEL_CONFIGS[this.selectedModel];
    const prompt = this.buildPrompt(data);

    // 检查是否为本地模型
    if (this.selectedModel.includes('llama') || this.selectedModel.includes('qwen2.5')) {
      return this.callLocalModel(prompt);
    }

    // 根据模型选择调用方式
    if (this.selectedModel.includes('claude')) {
      return this.callClaude(prompt);
    }

    return this.callOpenAICompatible(prompt);
  }

  // 构建提示词
  private buildPrompt(data: AnalysisRequest): string {
    return TAX_ANALYSIS_PROMPT
      .replace('{{revenue}}', data.revenue.toString())
      .replace('{{costOfSales}}', data.costOfSales.toString())
      .replace('{{grossProfit}}', data.grossProfit.toString())
      .replace('{{totalProfit}}', data.totalProfit.toString())
      .replace('{{assets}}', data.assets.toString())
      .replace('{{liabilities}}', data.liabilities.toString());
  }

  // 调用OpenAI兼容API
  private async callOpenAICompatible(prompt: string): Promise<AnalysisResult> {
    const apiKey = await this.getApiKey(this.selectedModel);
    const config = MODEL_CONFIGS[this.selectedModel];

    if (!apiKey && config.apiKeyRequired) {
      throw new Error('请先在设置中配置API Key');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60_000);

    let status = 0;
    try {
      const response = await fetch(config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: this.getModelName(),
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: 4000
        }),
        signal: controller.signal,
      });
      status = response.status;

      if (!response.ok) {
        throw new Error(this.formatErrorMessage(status));
      }

      const result = await response.json();
      return this.parseResponse(result);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private formatErrorMessage(status: number): string {
    switch (status) {
      case 401: return 'API Key无效或已过期，请检查设置';
      case 403: return 'API Key权限不足';
      case 429: return '请求频率超限，请稍后再试';
      case 500: return 'AI服务内部错误';
      case 503: return 'AI服务暂时不可用，请稍后重试';
      default:   return `API调用失败: ${status}`;
    }
  }

  // 调用Claude
  private async callClaude(prompt: string): Promise<AnalysisResult> {
    const apiKey = await this.getApiKey('claude-4.6-opus');
    if (!apiKey) throw new Error('请先配置Claude API Key');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60_000);

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-4-opus-20240229',
          max_tokens: 4000,
          messages: [{ role: 'user', content: prompt }]
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(this.formatErrorMessage(response.status));
      }

      const result = await response.json();
      return this.parseResponse(result);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // 调用本地模型 (Ollama)
  private async callLocalModel(prompt: string): Promise<AnalysisResult> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60_000);

    try {
      const response = await fetch('http://localhost:11434/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.getLocalModelName(),
          messages: [{ role: 'user', content: prompt }],
          stream: false
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`本地模型调用失败: ${response.status}`);
      }

      const result = await response.json();
      return this.parseLocalResponse(result);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // 获取模型名称映射
  private getModelName(): string {
    const modelMap: Record<string, string> = {
      'gpt-5.4-pro': 'gpt-4o',
      'gpt-5.4-mini': 'gpt-4o-mini',
      'deepseek-v3.2': 'deepseek-chat',
      'kimi-k2.5': 'kimi-k2.5',
      'qwen-3': 'qwen-turbo',
      // Groq 模型 (使用 NVIDIA GPU)
      'groq-llama-3.3-70b': 'llama-3.3-70b-versatile',
      'groq-llama-3.1-8b': 'llama-3.1-8b-instant',
      'groq-mixtral-8x7b': 'mixtral-8x7b-32768',
      // Fireworks 模型 (使用 NVIDIA GPU)
      'fireworks-llama-3.1-405b': 'accounts/fireworks/models/llama-v3p1-405b-instruct',
      'fireworks-qwen-2.5-72b': 'accounts/fireworks/models/qwen2p5-72b-instruct',
      // Lepton 模型 (使用 NVIDIA GPU)
      'lepton-llama-3.1-405b': 'llama-3.1-405b'
    };
    return modelMap[this.selectedModel] || this.selectedModel;
  }

  // 获取本地模型名称
  private getLocalModelName(): string {
    if (this.selectedModel.includes('llama')) return 'llama3:8b';
    if (this.selectedModel.includes('qwen2.5')) return 'qwen2.5:7b';
    return 'llama3:8b';
  }

  // 解析响应
  private parseResponse(result: any): AnalysisResult {
    try {
      let content = '';
      if (result.choices && result.choices[0]) {
        content = result.choices[0].message.content;
      } else if (result.content) {
        content = result.content;
      }

      // 尝试解析JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // 返回默认结果
      return this.getDefaultResult();
    } catch {
      return this.getDefaultResult();
    }
  }

  // 解析本地响应
  private parseLocalResponse(result: any): AnalysisResult {
    try {
      const content = result.message?.content || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return this.getDefaultResult();
    } catch {
      return this.getDefaultResult();
    }
  }

  // 默认结果
  private getDefaultResult(): AnalysisResult {
    return {
      taxBurden: { rate: 2.5, assessment: 'normal' },
      risks: [],
      optimizations: [],
      compliance: { isCompliant: true, issues: [] }
    };
  }

  // 下载本地模型
  async pullLocalModel(modelName: string): Promise<void> {
    const response = await fetch('http://localhost:11434/api/pull', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: modelName, stream: false })
    });

    if (!response.ok) {
      throw new Error('模型下载失败');
    }
  }

  // 获取已安装的本地模型列表
  async listLocalModels(): Promise<string[]> {
    try {
      const response = await fetch('http://localhost:11434/api/tags');
      const data = await response.json();
      return data.models?.map((m: any) => m.name) || [];
    } catch {
      return [];
    }
  }
}

// 导出单例
export const aiService = new AIService();
export default AIService;
