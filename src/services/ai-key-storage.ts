/**
 * API Key 安全存储服务
 * 使用 Electron safeStorage（OS 密钥链）加密存储敏感信息
 */

const STORAGE_KEY = 'ai_api_keys_v1';
const SELECTED_MODEL_KEY = 'selected_ai_model_v1';
const FALLBACK_WARNING_KEY = 'ai_key_fallback_mode_v1';

/**
 * 检查 safeStorage 是否可用
 */
async function isSafeStorageAvailable(): Promise<boolean> {
  if (!window.electronAPI?.safeStorage) {
    return false;
  }
  try {
    return await window.electronAPI.safeStorage.isAvailable();
  } catch {
    return false;
  }
}

/**
 * 使用 safeStorage 加密
 */
async function safeEncrypt(plainText: string): Promise<string> {
  if (!window.electronAPI?.safeStorage) {
    throw new Error('safeStorage IPC 不可用');
  }
  return window.electronAPI.safeStorage.encrypt(plainText);
}

/**
 * 使用 safeStorage 解密
 */
async function safeDecrypt(encryptedBase64: string): Promise<string> {
  if (!window.electronAPI?.safeStorage) {
    throw new Error('safeStorage IPC 不可用');
  }
  return window.electronAPI.safeStorage.decrypt(encryptedBase64);
}

export interface ModelKeyEntry {
  model: string;
  apiKey: string;
  savedAt: Date;
}

export interface SavedAIConfig {
  selectedModel: string;
  keys: ModelKeyEntry[];
  updatedAt: Date;
}

// 安全存储 API Key
export async function saveApiKey(model: string, apiKey: string): Promise<void> {
  const config = await loadConfig();
  const existing = config.keys.findIndex(k => k.model === model);

  if (existing >= 0) {
    config.keys[existing].apiKey = apiKey;
    config.keys[existing].savedAt = new Date();
  } else {
    config.keys.push({ model, apiKey, savedAt: new Date() });
  }

  config.updatedAt = new Date();
  await persistConfig(config);
}

// 获取 API Key（异步，与 safeStorage 对齐）
export async function getApiKey(model: string): Promise<string | null> {
  const config = await loadConfig();
  const entry = config.keys.find(k => k.model === model);
  return entry?.apiKey || null;
}

// 删除 API Key
export async function deleteApiKey(model: string): Promise<void> {
  const config = await loadConfig();
  config.keys = config.keys.filter(k => k.model !== model);
  config.updatedAt = new Date();
  await persistConfig(config);
}

// 获取所有已保存的模型
export async function getSavedModels(): Promise<string[]> {
  const config = await loadConfig();
  return config.keys.map(k => k.model);
}

// 保存选中的模型
export async function saveSelectedModel(model: string): Promise<void> {
  const config = await loadConfig();
  config.selectedModel = model;
  config.updatedAt = new Date();
  await persistConfig(config);
}

// 获取选中的模型
export async function getSelectedModel(): Promise<string> {
  const config = await loadConfig();
  return config.selectedModel || 'deepseek-v3.2';
}

// 检查是否已配置任何 API Key
export async function hasAnyApiKey(): Promise<boolean> {
  const config = await loadConfig();
  return config.keys.length > 0;
}

// 检查特定模型是否已配置
export async function isModelConfigured(model: string): Promise<boolean> {
  return (await getApiKey(model)) !== null;
}

// 加载配置（自动选择 safeStorage 或明文降级）
async function loadConfig(): Promise<SavedAIConfig> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return { selectedModel: 'deepseek-v3.2', keys: [], updatedAt: new Date() };
    }

    const isAvailable = await isSafeStorageAvailable();
    if (!isAvailable) {
      // 降级模式：检测是否首次降级，提示用户
      const firstFallback = !localStorage.getItem(FALLBACK_WARNING_KEY);
      if (firstFallback) {
        localStorage.setItem(FALLBACK_WARNING_KEY, 'true');
        console.warn(
          '[AI-Key-Storage] safeStorage 不可用，API Key 将以不加密形式存储在本地。\n' +
          '这仅在开发/测试环境中可接受。生产环境请确保在 Electron 环境中运行。'
        );
      }
      // 降级：使用 JSON 明文存储（不安全，仅用于开发调试）
      return JSON.parse(stored);
    }

    // 正常路径：使用 safeStorage 解密
    const decrypted = await safeDecrypt(stored);
    return JSON.parse(decrypted);
  } catch {
    return { selectedModel: 'deepseek-v3.2', keys: [], updatedAt: new Date() };
  }
}

// 持久化配置（自动选择 safeStorage 或明文降级）
async function persistConfig(config: SavedAIConfig): Promise<void> {
  try {
    const isAvailable = await isSafeStorageAvailable();

    if (!isAvailable) {
      // 降级模式：明文存储（不安全）
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      return;
    }

    // 正常路径：使用 safeStorage 加密
    const encrypted = await safeEncrypt(JSON.stringify(config));
    localStorage.setItem(STORAGE_KEY, encrypted);
  } catch (error) {
    console.error('[AI-Key-Storage] Failed to persist AI config:', error);
    // 降级：尝试明文存储
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch {
      console.error('[AI-Key-Storage] Fallback storage also failed:', error);
    }
  }
}

// 获取模型列表（带配置状态）
export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  hasApiKey: boolean;
  supportsStream: boolean;
}

export const AVAILABLE_MODELS: ModelInfo[] = [
  // OpenAI
  { id: 'gpt-5.4-pro', name: 'GPT-5.4 Pro', provider: 'OpenAI', hasApiKey: false, supportsStream: true },
  { id: 'gpt-5.4-mini', name: 'GPT-5.4 Mini', provider: 'OpenAI', hasApiKey: false, supportsStream: true },
  // Anthropic
  { id: 'claude-4.6-opus', name: 'Claude 4.6 Opus', provider: 'Anthropic', hasApiKey: false, supportsStream: true },
  // Google
  { id: 'gemini-3.1-pro', name: 'Gemini 3.1 Pro', provider: 'Google', hasApiKey: false, supportsStream: false },
  // 国内模型
  { id: 'deepseek-v3.2', name: 'DeepSeek V3.2', provider: 'DeepSeek', hasApiKey: false, supportsStream: true },
  { id: 'kimi-k2.5', name: 'Kimi K2.5', provider: 'Moonshot', hasApiKey: false, supportsStream: true },
  // qwen-3: DashScope API 调用格式与 OpenAI 兼容模式存在差异，暂标记为不支持流式
  { id: 'qwen-3', name: 'Qwen 3', provider: 'Alibaba', hasApiKey: false, supportsStream: false },
  // GPU 加速
  { id: 'groq-llama-3.3-70b', name: 'Llama 3.3 70B', provider: 'Groq', hasApiKey: false, supportsStream: true },
  { id: 'groq-mixtral-8x7b', name: 'Mixtral 8x7B', provider: 'Groq', hasApiKey: false, supportsStream: true },
  { id: 'fireworks-llama-3.1-405b', name: 'Llama 3.1 405B', provider: 'Fireworks', hasApiKey: false, supportsStream: true },
  // 本地
  { id: 'llama-4-70b', name: 'Llama 4 70B (本地)', provider: 'Ollama', hasApiKey: false, supportsStream: true },
];

// 刷新配置状态（从存储加载最新状态）
export async function refreshModelConfig(): Promise<ModelInfo[]> {
  const models = AVAILABLE_MODELS.map(async (model) => ({
    ...model,
    hasApiKey: await isModelConfigured(model.id),
  }));
  return Promise.all(models);
}
