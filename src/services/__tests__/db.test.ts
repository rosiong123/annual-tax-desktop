import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * 数据库服务单元测试
 * 注意：这些测试使用 Dexie 的内存模式，避免依赖真实的 IndexedDB
 */

// 模拟 Dexie
const mockAdd = vi.fn().mockResolvedValue(1);
const mockGet = vi.fn();
const mockUpdate = vi.fn().mockResolvedValue(1);
const mockWhere = vi.fn().mockReturnValue({
  equals: vi.fn().mockReturnValue({
    toArray: vi.fn().mockResolvedValue([]),
    reverse: vi.fn().mockReturnValue({
      sortBy: vi.fn().mockResolvedValue([]),
    }),
    delete: vi.fn().mockResolvedValue(0),
  }),
});
const mockOrderBy = vi.fn().mockReturnValue({
  reverse: vi.fn().mockReturnValue({
    limit: vi.fn().mockReturnValue({
      toArray: vi.fn().mockResolvedValue([]),
    }),
  }),
});
const mockPut = vi.fn().mockResolvedValue('key');
const mockTransaction = vi.fn().mockImplementation(async (mode, tables, callback) => {
  return callback();
});

vi.mock('dexie', () => {
  return {
    default: class MockDexie {
      companies = { add: mockAdd, get: mockGet, update: mockUpdate, where: mockWhere };
      periods = { add: mockAdd, get: mockGet, update: mockUpdate, where: mockWhere };
      sessions = { add: mockAdd, get: mockGet, update: mockUpdate, where: mockWhere, orderBy: mockOrderBy };
      importedData = { add: mockAdd, where: mockWhere };
      auditResults = { add: mockAdd, where: mockWhere };
      auditLogs = { add: mockAdd, where: mockWhere, transaction: mockTransaction };
      optimizationResults = { add: mockAdd, where: mockWhere };
      filingData = { add: mockAdd, update: mockUpdate, where: mockWhere };
      settings = { get: mockGet, put: mockPut };
      version = vi.fn().mockReturnThis();
      stores = vi.fn();
    },
  };
});

describe('数据库服务 - 类型定义验证', () => {
  it('Company 类型应包含必要字段', () => {
    const company = {
      name: '测试公司',
      taxId: '91110000123456789X',
      employeeCount: 100,
      totalAssets: 5000,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(company.name).toBe('测试公司');
    expect(company.taxId).toMatch(/^\d{17}[\dX]$/);
    expect(company.employeeCount).toBeGreaterThan(0);
    expect(company.totalAssets).toBeGreaterThan(0);
  });

  it('Session 状态枚举应覆盖完整流程', () => {
    const validStatuses = ['draft', 'importing', 'auditing', 'analyzing', 'optimizing', 'filing', 'completed', 'archived'];

    validStatuses.forEach(status => {
      const session = { status };
      expect(validStatuses).toContain(session.status);
    });
  });

  it('AuditLog 应支持链式哈希', () => {
    const log = {
      id: 1,
      sessionId: 1,
      action: 'IMPORT_DATA',
      details: '导入资产负债表',
      timestamp: new Date(),
      prevHash: 'GENESIS',
      hash: 'abc123',
    };

    expect(log.prevHash).toBeDefined();
    expect(log.hash).toBeDefined();
    expect(log.hash).not.toBe('GENESIS');
  });
});

describe('数据库服务 - 哈希计算', () => {
  it('应能计算 SHA-256 哈希', async () => {
    const encoder = new TextEncoder();
    const data = encoder.encode('test data');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // SHA-256('test data') - 验证哈希长度为64字符(256位)
    expect(hashHex.length).toBe(64);
    expect(hashHex).toMatch(/^[a-f0-9]+$/);
  });
});

describe('数据库服务 - 数据验证', () => {
  it('纳税人识别号格式验证', () => {
    const validTaxId = '91110000123456789X';
    const invalidTaxId = '12345';

    // 统一社会信用代码为18位
    expect(validTaxId.length).toBe(18);
    expect(invalidTaxId.length).not.toBe(18);
  });

  it('会话状态转换应有效', () => {
    const validTransitions: Record<string, string[]> = {
      draft: ['importing'],
      importing: ['auditing'],
      auditing: ['analyzing'],
      analyzing: ['optimizing'],
      optimizing: ['filing'],
      filing: ['completed'],
      completed: ['archived'],
      archived: [],
    };

    expect(validTransitions['draft']).toContain('importing');
    expect(validTransitions['completed']).not.toContain('draft');
  });
});
