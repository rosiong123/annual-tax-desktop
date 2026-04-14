/**
 * 离线支持服务 - Offline Support Service
 * 核心功能：IndexedDB缓存、AI分析结果缓存、离线申报草稿队列
 */

import Dexie, { type Table } from 'dexie';

interface CachedAnalysisResult {
  id?: number;
  dataHash: string;
  modelId: string;
  result: object;
  cachedAt: number;
}

interface OfflineFilingDraft {
  id?: number;
  companyName: string;
  taxYear: number;
  period: string;
  filingData: object;
  status: 'draft' | 'pending' | 'submitted';
  createdAt: number;
  updatedAt: number;
}

interface ImportedDataCache {
  id?: number;
  sessionId: string;
  dataType: 'excel' | 'finance' | 'tax';
  data: object;
  importedAt: number;
}

class OfflineDatabase extends Dexie {
  cachedAnalysis!: Table<CachedAnalysisResult>;
  offlineFilingDrafts!: Table<OfflineFilingDraft>;
  importedDataCache!: Table<ImportedDataCache>;

  constructor() {
    super('OfflineTaxDB');

    this.version(1).stores({
      cachedAnalysis: '++id, dataHash, modelId, cachedAt',
      offlineFilingDrafts: '++id, companyName, taxYear, period, status, createdAt',
      importedDataCache: '++id, sessionId, dataType, importedAt',
    });
  }
}

const db = new OfflineDatabase();

/**
 * 生成数据的哈希值（用于缓存键）
 */
export async function generateDataHash(data: object): Promise<string> {
  const str = JSON.stringify(data);
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 缓存AI分析结果
 */
export async function cacheAnalysisResult(
  dataHash: string,
  modelId: string,
  result: object
): Promise<void> {
  await db.cachedAnalysis.put({
    dataHash,
    modelId,
    result,
    cachedAt: Date.now(),
  });
}

/**
 * 获取缓存的AI分析结果
 */
export async function getCachedAnalysisResult(
  dataHash: string,
  modelId: string
): Promise<object | null> {
  const cached = await db.cachedAnalysis
    .where({ dataHash, modelId })
    .first();

  if (!cached) return null;

  // 检查缓存是否过期（7天）
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  if (Date.now() - cached.cachedAt > sevenDays) {
    await db.cachedAnalysis.delete(cached.id!);
    return null;
  }

  return cached.result;
}

/**
 * 保存申报草稿
 */
export async function saveFilingDraft(
  companyName: string,
  taxYear: number,
  period: string,
  filingData: object
): Promise<number> {
  const now = Date.now();
  const id = await db.offlineFilingDrafts.put({
    companyName,
    taxYear,
    period,
    filingData,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

/**
 * 更新申报草稿
 */
export async function updateFilingDraft(
  id: number,
  filingData: object
): Promise<void> {
  await db.offlineFilingDrafts.update(id, {
    filingData,
    updatedAt: Date.now(),
  });
}

/**
 * 获取申报草稿列表
 */
export async function getFilingDrafts(
  companyName?: string,
  taxYear?: number
): Promise<OfflineFilingDraft[]> {
  let collection = db.offlineFilingDrafts.orderBy('updatedAt').reverse();

  if (companyName && taxYear) {
    return await db.offlineFilingDrafts
      .where({ companyName, taxYear })
      .reverse()
      .sortBy('updatedAt');
  }

  return await collection.toArray();
}

/**
 * 删除申报草稿
 */
export async function deleteFilingDraft(id: number): Promise<void> {
  await db.offlineFilingDrafts.delete(id);
}

/**
 * 将草稿标记为待提交
 */
export async function markDraftAsPending(id: number): Promise<void> {
  await db.offlineFilingDrafts.update(id, {
    status: 'pending',
    updatedAt: Date.now(),
  });
}

/**
 * 缓存导入的数据
 */
export async function cacheImportedData(
  sessionId: string,
  dataType: 'excel' | 'finance' | 'tax',
  data: object
): Promise<void> {
  await db.importedDataCache.put({
    sessionId,
    dataType,
    data,
    importedAt: Date.now(),
  });
}

/**
 * 获取缓存的导入数据
 */
export async function getCachedImportedData(
  sessionId: string
): Promise<ImportedDataCache | null> {
  const cached = await db.importedDataCache
    .where('sessionId')
    .equals(sessionId)
    .first();
  return cached ?? null;
}

/**
 * 清除过期缓存（30天）
 */
export async function clearExpiredCache(): Promise<void> {
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

  await db.cachedAnalysis
    .where('cachedAt')
    .below(thirtyDaysAgo)
    .delete();

  await db.importedDataCache
    .where('importedAt')
    .below(thirtyDaysAgo)
    .delete();
}

/**
 * 检查是否在线
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * 监听网络状态变化
 */
export function onNetworkChange(
  callback: (online: boolean) => void
): () => void {
  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

/**
 * 获取数据库统计信息
 */
export async function getDatabaseStats(): Promise<{
  cachedAnalysisCount: number;
  filingDraftsCount: number;
  importedDataCount: number;
}> {
  return {
    cachedAnalysisCount: await db.cachedAnalysis.count(),
    filingDraftsCount: await db.offlineFilingDrafts.count(),
    importedDataCount: await db.importedDataCache.count(),
  };
}

export default {
  cacheAnalysisResult,
  getCachedAnalysisResult,
  saveFilingDraft,
  updateFilingDraft,
  getFilingDrafts,
  deleteFilingDraft,
  markDraftAsPending,
  cacheImportedData,
  getCachedImportedData,
  clearExpiredCache,
  isOnline,
  onNetworkChange,
  getDatabaseStats,
};
