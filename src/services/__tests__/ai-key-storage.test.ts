/**
 * API Key 存储安全性测试
 * 验证：safeStorage 加密、密钥管理、fallback 降级、数据完整性
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// =====================================================================
// Mock window.electronAPI
// safeStorage 在测试环境不可用（isAvailable 返回 false），
// 所以所有操作都走 fallback 明文路径，测试重点是业务逻辑而非加密
// =====================================================================
const mockSafeStorage = {
  encrypt: vi.fn((plainText: string) => Promise.resolve(`enc:${btoa(plainText)}`)),
  decrypt: vi.fn((data: string) => {
    if (data.startsWith('enc:')) {
      return Promise.resolve(atob(data.slice(4)));
    }
    return Promise.reject(new Error('Invalid format'));
  }),
  isAvailable: vi.fn(() => Promise.resolve(false)), // 默认返回 false，测试 fallback 路径
};

Object.defineProperty(global, 'window', {
  value: { electronAPI: { safeStorage: mockSafeStorage } },
  writable: true,
});

// =====================================================================
// Mock localStorage
// =====================================================================
const localStorageStore: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => localStorageStore[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { localStorageStore[key] = value; }),
  removeItem: vi.fn((key: string) => { delete localStorageStore[key]; }),
  clear: vi.fn(() => { Object.keys(localStorageStore).forEach(k => delete localStorageStore[k]); }),
  get _store() { return localStorageStore; },
};
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

// =====================================================================
// 重新导入（确保使用 mock）
// =====================================================================
import {
  saveApiKey,
  getApiKey,
  deleteApiKey,
  getSavedModels,
  saveSelectedModel,
  getSelectedModel,
  hasAnyApiKey,
  isModelConfigured,
  refreshModelConfig,
  AVAILABLE_MODELS,
} from '../../services/ai-key-storage';

// =====================================================================
// 每个测试前清空
// =====================================================================
beforeEach(() => {
  Object.keys(localStorageStore).forEach(k => delete localStorageStore[k]);
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  // 确保 fallback 模式
  mockSafeStorage.isAvailable.mockResolvedValue(false);
  mockSafeStorage.encrypt.mockClear();
  mockSafeStorage.decrypt.mockClear();
});

// =====================================================================
// 基础功能：保存与读取
// =====================================================================
describe('API Key 基础存取功能', () => {
  it('保存后应能读取相同的 API Key', async () => {
    await saveApiKey('deepseek-v3.2', 'sk-test-key-12345');
    expect(await getApiKey('deepseek-v3.2')).toBe('sk-test-key-12345');
  });

  it('读取不存在的模型应返回 null', async () => {
    expect(await getApiKey('non-existent-model')).toBeNull();
  });

  it('更新同一模型的 Key 应覆盖旧值', async () => {
    await saveApiKey('deepseek-v3.2', 'old-key');
    await saveApiKey('deepseek-v3.2', 'new-key');
    expect(await getApiKey('deepseek-v3.2')).toBe('new-key');
  });

  it('保存多个不同模型的 Key 应互不干扰', async () => {
    await saveApiKey('deepseek-v3.2', 'deepseek-key');
    await saveApiKey('kimi-k2.5', 'kimi-key');
    await saveApiKey('qwen-3', 'qwen-key');
    expect(await getApiKey('deepseek-v3.2')).toBe('deepseek-key');
    expect(await getApiKey('kimi-k2.5')).toBe('kimi-key');
    expect(await getApiKey('qwen-3')).toBe('qwen-key');
  });

  it('保存特殊字符的 Key 应能正确存取', async () => {
    const specialKey = 'sk-abc123!@#$%^&*()_+-=[]{}|;:,.<>?';
    await saveApiKey('test-model', specialKey);
    expect(await getApiKey('test-model')).toBe(specialKey);
  });

  it('保存超长 Key 应能正确存取', async () => {
    const longKey = 'sk-' + 'a'.repeat(500);
    await saveApiKey('test-model', longKey);
    expect(await getApiKey('test-model')).toBe(longKey);
  });

  it('保存含有 JSON 特殊字符的 Key 应能正确存取', async () => {
    const jsonKey = '{"key": "value", "nested": {"a": 1}}';
    await saveApiKey('test-model', jsonKey);
    expect(await getApiKey('test-model')).toBe(jsonKey);
  });
});

// =====================================================================
// 删除功能
// =====================================================================
describe('API Key 删除功能', () => {
  it('删除已存在的 Key 后应返回 null', async () => {
    await saveApiKey('deepseek-v3.2', 'some-key');
    await deleteApiKey('deepseek-v3.2');
    expect(await getApiKey('deepseek-v3.2')).toBeNull();
  });

  it('删除不存在的 Key 不应报错', async () => {
    await expect(deleteApiKey('non-existent')).resolves.not.toThrow();
  });

  it('删除一个模型的 Key 不影响其他模型', async () => {
    await saveApiKey('model-a', 'key-a');
    await saveApiKey('model-b', 'key-b');
    await deleteApiKey('model-a');
    expect(await getApiKey('model-a')).toBeNull();
    expect(await getApiKey('model-b')).toBe('key-b');
  });
});

// =====================================================================
// 查询功能
// =====================================================================
describe('API Key 查询功能', () => {
  it('未保存任何 Key 时 hasAnyApiKey 应返回 false', async () => {
    expect(await hasAnyApiKey()).toBe(false);
  });

  it('保存一个 Key 后 hasAnyApiKey 应返回 true', async () => {
    await saveApiKey('deepseek-v3.2', 'test-key');
    expect(await hasAnyApiKey()).toBe(true);
  });

  it('全部删除后 hasAnyApiKey 应返回 false', async () => {
    await saveApiKey('model-a', 'key-a');
    await deleteApiKey('model-a');
    expect(await hasAnyApiKey()).toBe(false);
  });

  it('getSavedModels 应返回已配置模型的列表', async () => {
    await saveApiKey('deepseek-v3.2', 'key1');
    await saveApiKey('kimi-k2.5', 'key2');
    const models = await getSavedModels();
    expect(models).toContain('deepseek-v3.2');
    expect(models).toContain('kimi-k2.5');
    expect(models.length).toBe(2);
  });

  it('isModelConfigured 对已配置模型返回 true', async () => {
    await saveApiKey('deepseek-v3.2', 'test-key');
    expect(await isModelConfigured('deepseek-v3.2')).toBe(true);
  });

  it('isModelConfigured 对未配置模型返回 false', async () => {
    expect(await isModelConfigured('never-configured-model')).toBe(false);
  });
});

// =====================================================================
// 模型选择
// =====================================================================
describe('模型选择功能', () => {
  it('未设置时应返回默认模型 deepseek-v3.2', async () => {
    expect(await getSelectedModel()).toBe('deepseek-v3.2');
  });

  it('设置后应能读取选中的模型', async () => {
    await saveSelectedModel('kimi-k2.5');
    expect(await getSelectedModel()).toBe('kimi-k2.5');
  });

  it('多次更改选中模型应保留最新值', async () => {
    await saveSelectedModel('model-a');
    await saveSelectedModel('model-b');
    await saveSelectedModel('model-c');
    expect(await getSelectedModel()).toBe('model-c');
  });
});

// =====================================================================
// AVAILABLE_MODELS 常量完整性
// =====================================================================
describe('AVAILABLE_MODELS 常量完整性', () => {
  it('模型列表应包含 deepseek-v3.2（默认模型）', () => {
    const deepseek = AVAILABLE_MODELS.find(m => m.id === 'deepseek-v3.2');
    expect(deepseek).toBeDefined();
  });

  it('每个模型应包含必要字段', () => {
    AVAILABLE_MODELS.forEach(model => {
      expect(model.id).toBeTruthy();
      expect(model.name).toBeTruthy();
      expect(model.provider).toBeTruthy();
      expect(typeof model.supportsStream).toBe('boolean');
    });
  });

  it('模型 ID 应唯一', () => {
    const ids = AVAILABLE_MODELS.map(m => m.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('refreshModelConfig 应返回带 hasApiKey 状态的模型列表', async () => {
    await saveApiKey('deepseek-v3.2', 'some-key');
    const models = await refreshModelConfig();
    const deepseek = models.find(m => m.id === 'deepseek-v3.2');
    expect(deepseek?.hasApiKey).toBe(true);
  });

  it('refreshModelConfig 未配置的模型 hasApiKey 应为 false', async () => {
    const models = await refreshModelConfig();
    models.forEach(model => {
      if (model.id !== 'deepseek-v3.2') {
        expect(model.hasApiKey).toBe(false);
      }
    });
  });
});

// =====================================================================
// safeStorage 降级测试
// =====================================================================
describe('safeStorage 降级处理', () => {
  it('safeStorage 不可用时应调用 fallback 并存储明文 JSON', async () => {
    // isAvailable = false，确保走 fallback
    mockSafeStorage.isAvailable.mockResolvedValue(false);
    await saveApiKey('test-model', 'fallback-key');
    const stored = localStorageStore['ai_api_keys_v1'];
    // Fallback 模式存储明文 JSON（可读）
    const parsed = JSON.parse(stored);
    expect(parsed.keys.find((k: { model: string }) => k.model === 'test-model')?.apiKey).toBe('fallback-key');
  });

  it('解密失败时应返回默认值而不抛出异常', async () => {
    localStorageStore['ai_api_keys_v1'] = 'invalid-not-json';
    await expect(getApiKey('any-model')).resolves.toBeNull();
  });

  it('localStorage 配额超限时保存不应抛出异常', async () => {
    const original = localStorageMock.setItem;
    localStorageMock.setItem.mockImplementationOnce(() => {
      throw new DOMException('QuotaExceededError');
    });
    await expect(saveApiKey('test-model', 'some-key')).resolves.not.toThrow();
    localStorageMock.setItem.mockImplementation(original);
  });
});
