/**
 * 数据库服务 - 基于 Dexie (IndexedDB)
 * 用于税务审计数据的持久化存储
 */

import Dexie, { type Table } from 'dexie';

// ==================== 类型定义 ====================

export interface Company {
  id?: number;
  name: string;
  taxId: string;           // 纳税人识别号
  employeeCount: number;    // 从业人数
  totalAssets: number;     // 资产总额（万元）
  createdAt: Date;
  updatedAt: Date;
}

export interface TaxPeriod {
  id?: number;
  year: number;
  periodType: 'monthly' | 'quarterly' | 'annual';
  startDate: Date;
  endDate: Date;
}

export interface Session {
  id?: number;
  companyId: number;
  periodId: number;
  status: 'draft' | 'importing' | 'auditing' | 'analyzing' | 'optimizing' | 'filing' | 'completed' | 'archived';
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface ImportedData {
  id?: number;
  sessionId: number;
  dataType: 'balance_sheet' | 'income_statement' | 'subject_balances' | 'input_invoices' | 'output_invoices';
  rawFileName?: string;
  rawData: string;         // JSON stringified
  rowCount: number;        // 行数
  columnCount: number;     // 列数
  parseErrors: string[];   // 解析错误列表
  createdAt: Date;
}

export interface AuditResult {
  id?: number;
  sessionId: number;
  resultData: string;       // JSON stringified audit result
  riskScore: number;       // 0-100
  evidenceScore: number;   // 0-100
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  riskCount: { critical: number; high: number; medium: number; low: number };
  createdAt: Date;
}

export interface AuditLog {
  id?: number;
  sessionId: number;
  action: string;           // 操作类型
  details: string;         // 详细信息
  timestamp: Date;
  prevHash: string;        // 前一条记录的hash，用于链式审计
  hash: string;            // 当前记录的hash
}

export interface OptimizationResult {
  id?: number;
  sessionId: number;
  resultData: string;      // JSON stringified optimization result
  taxSavings: number;      // 节税金额
  createdAt: Date;
}

export interface FilingData {
  id?: number;
  sessionId: number;
  formType: string;        // A100000, A101010, etc.
  formData: string;        // JSON stringified
  status: 'draft' | 'ready' | 'filed';
  filedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AppSettings {
  key: string;
  value: string;
  updatedAt: Date;
}

// ==================== 数据库类 ====================

class TaxAuditDB extends Dexie {
  companies!: Table<Company, number>;
  periods!: Table<TaxPeriod, number>;
  sessions!: Table<Session, number>;
  importedData!: Table<ImportedData, number>;
  auditResults!: Table<AuditResult, number>;
  auditLogs!: Table<AuditLog, number>;
  optimizationResults!: Table<OptimizationResult, number>;
  filingData!: Table<FilingData, number>;
  settings!: Table<AppSettings, string>;

  constructor() {
    super('TaxAuditDB');

    this.version(1).stores({
      companies: '++id, name, taxId, createdAt',
      periods: '++id, year, periodType, startDate',
      sessions: '++id, companyId, periodId, status, createdAt',
      importedData: '++id, sessionId, dataType, createdAt',
      auditResults: '++id, sessionId, riskScore, createdAt',
      auditLogs: '++id, sessionId, timestamp, hash',
      optimizationResults: '++id, sessionId, taxSavings, createdAt',
      filingData: '++id, sessionId, formType, status, createdAt',
      settings: 'key, updatedAt',
    });
  }
}

// ==================== 单例 ====================

const db = new TaxAuditDB();

// ==================== 哈希工具 ====================

async function computeHash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ==================== 服务函数 ====================

// 公司
export async function createCompany(company: Omit<Company, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
  const now = new Date();
  return db.companies.add({
    ...company,
    createdAt: now,
    updatedAt: now,
  });
}

export async function getCompany(id: number): Promise<Company | undefined> {
  return db.companies.get(id);
}

export async function updateCompany(id: number, updates: Partial<Company>): Promise<number> {
  return db.companies.update(id, { ...updates, updatedAt: new Date() });
}

// 税务期间
export async function createPeriod(period: Omit<TaxPeriod, 'id'>): Promise<number> {
  return db.periods.add(period);
}

export async function getPeriodsByYear(year: number): Promise<TaxPeriod[]> {
  return db.periods.where('year').equals(year).toArray();
}

// 审计会话
export async function createSession(session: Omit<Session, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
  const now = new Date();
  return db.sessions.add({
    ...session,
    createdAt: now,
    updatedAt: now,
  });
}

export async function getSession(id: number): Promise<Session | undefined> {
  return db.sessions.get(id);
}

export async function updateSession(id: number, updates: Partial<Session>): Promise<number> {
  const now = new Date();
  return db.sessions.update(id, { ...updates, updatedAt: now });
}

export async function getSessionsByCompany(companyId: number): Promise<Session[]> {
  return db.sessions.where('companyId').equals(companyId).reverse().sortBy('createdAt');
}

export async function getRecentSessions(limit: number = 10): Promise<Session[]> {
  return db.sessions.orderBy('updatedAt').reverse().limit(limit).toArray();
}

// 导入数据
export async function saveImportedData(data: Omit<ImportedData, 'id' | 'createdAt'>): Promise<number> {
  return db.importedData.add({
    ...data,
    createdAt: new Date(),
  });
}

export async function getImportedDataBySession(sessionId: number): Promise<ImportedData[]> {
  return db.importedData.where('sessionId').equals(sessionId).toArray();
}

// 审计结果
export async function saveAuditResult(result: Omit<AuditResult, 'id' | 'createdAt'>): Promise<number> {
  return db.auditResults.add({
    ...result,
    createdAt: new Date(),
  });
}

export async function getLatestAuditResult(sessionId: number): Promise<AuditResult | undefined> {
  return db.auditResults
    .where('sessionId')
    .equals(sessionId)
    .reverse()
    .limit(1)
    .first();
}

// 审计日志（不可篡改，链式存储）
export async function addAuditLog(
  sessionId: number,
  action: string,
  details: string
): Promise<number> {
  const timestamp = new Date();

  // 获取前一条日志的hash（只取 1 条，避免全量加载）
  const prevLog = await db.auditLogs
    .where('sessionId')
    .equals(sessionId)
    .reverse()
    .limit(1)
    .first();

  const prevHash = prevLog?.hash || 'GENESIS';

  // 计算当前记录的hash
  const dataToHash = `${sessionId}|${action}|${details}|${timestamp.toISOString()}|${prevHash}`;
  const hash = await computeHash(dataToHash);

  return db.auditLogs.add({
    sessionId,
    action,
    details,
    timestamp,
    prevHash,
    hash,
  });
}

export async function getAuditLogs(sessionId: number): Promise<AuditLog[]> {
  return db.auditLogs
    .where('sessionId')
    .equals(sessionId)
    .sortBy('timestamp');
}

export async function verifyAuditLogChain(sessionId: number): Promise<{
  valid: boolean;
  brokenAt?: number;
  tamperedRecords?: number[];
}> {
  const logs = await getAuditLogs(sessionId);
  const tamperedRecords: number[] = [];

  for (let i = 0; i < logs.length; i++) {
    const log = logs[i];

    // 重新计算 hash，验证内容未被篡改
    const dataToHash = `${log.sessionId}|${log.action}|${log.details}|${log.timestamp.toISOString()}|${log.prevHash}`;
    const computedHash = await computeHash(dataToHash);

    if (computedHash !== log.hash) {
      tamperedRecords.push(log.id!);
    }

    // 验证引用链：第 i 条的 prevHash 必须等于第 i-1 条的 hash
    if (i > 0 && logs[i].prevHash !== logs[i - 1].hash) {
      return { valid: false, brokenAt: log.id, tamperedRecords };
    }
  }

  return {
    valid: tamperedRecords.length === 0,
    tamperedRecords: tamperedRecords.length > 0 ? tamperedRecords : undefined,
  };
}

// 优化结果
export async function saveOptimizationResult(result: Omit<OptimizationResult, 'id' | 'createdAt'>): Promise<number> {
  return db.optimizationResults.add({
    ...result,
    createdAt: new Date(),
  });
}

export async function getLatestOptimization(sessionId: number): Promise<OptimizationResult | undefined> {
  return db.optimizationResults
    .where('sessionId')
    .equals(sessionId)
    .reverse()
    .limit(1)
    .first();
}

// 申报数据
export async function saveFilingData(data: Omit<FilingData, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
  const now = new Date();
  return db.filingData.add({
    ...data,
    createdAt: now,
    updatedAt: now,
  });
}

export async function getFilingDataBySession(sessionId: number): Promise<FilingData[]> {
  return db.filingData.where('sessionId').equals(sessionId).toArray();
}

export async function updateFilingStatus(id: number, status: FilingData['status']): Promise<number> {
  return db.filingData.update(id, { status, updatedAt: new Date() });
}

// 设置
export async function getSetting(key: string): Promise<string | undefined> {
  const setting = await db.settings.get(key);
  return setting?.value;
}

export async function setSetting(key: string, value: string): Promise<string> {
  await db.settings.put({ key, value, updatedAt: new Date() });
  return value;
}

// 数据清理
export async function clearSessionData(sessionId: number): Promise<void> {
  await db.transaction('rw', [
    db.importedData,
    db.auditResults,
    db.auditLogs,
    db.optimizationResults,
    db.filingData,
  ], async () => {
    await db.importedData.where('sessionId').equals(sessionId).delete();
    await db.auditResults.where('sessionId').equals(sessionId).delete();
    await db.auditLogs.where('sessionId').equals(sessionId).delete();
    await db.optimizationResults.where('sessionId').equals(sessionId).delete();
    await db.filingData.where('sessionId').equals(sessionId).delete();
  });
}

export { db };
