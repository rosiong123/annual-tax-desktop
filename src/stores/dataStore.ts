/**
 * 数据状态管理 - Data Store
 * 使用 Zustand 管理财务数据和审计结果
 *
 * 存储策略：
 * - excelData 和 importedData 使用 Dexie 持久化（大型财务数据）
 * - 其他字段使用内存存储，不持久化（避免 localStorage 5MB 限额问题）
 */

import { create } from 'zustand';
import { persist, createJSONStorage, type StorageInterface } from 'zustand/middleware';
import Dexie from 'dexie';
import { ImportedData } from '../components/ExcelImporter';
import { AuditResultUI as AuditResult } from '../types/audit';

// ==================== Dexie 存储适配器 ====================

/**
 * Dexie 存储适配器 - 用于 Zustand persist 中间件
 * 将 excelData 和 importedData 存储到 IndexedDB (TaxAuditDataStore)
 * 解决 localStorage 5MB 限额问题
 */
class DexieStorage implements StorageInterface {
  private db: Dexie;

  constructor() {
    this.db = new Dexie('TaxAuditDataStore');
    this.db.version(1).stores({
      appData: 'key',
    });
  }

  async getItem(key: string): Promise<string | null> {
    const record = await this.db.table('appData').get(key);
    return record ? record.value : null;
  }

  async setItem(key: string, value: string): Promise<void> {
    await this.db.table('appData').put({ key, value });
  }

  async removeItem(key: string): Promise<void> {
    await this.db.table('appData').delete(key);
  }
}

const dexieStorage = new DexieStorage();

export interface ExcelData {
  balanceSheet: ImportedData['balanceSheet'];
  incomeStatement: ImportedData['incomeStatement'];
  subjectBalances: ImportedData['subjectBalances'];
  invoices: ImportedData['invoices'];
}

export interface FilingData {
  forms: string[];
  period: { year: number; period: string; quarter?: number };
}

// AuditResult is now imported from '../types/audit' as AuditResultUI
// See src/types/audit.ts for the unified type definition

export interface AnalysisResult {
  taxBurden: {
    currentRate: number;
    industryAverage: number;
    assessment: string;
  };
  riskAnalysis: {
    overallRisk: number;
    highRisk: Array<{ title: string; severity: string }>;
    mediumRisk: Array<{ title: string; severity: string }>;
    lowRisk: Array<{ title: string; severity: string }>;
  };
  complianceAnalysis: {
    isCompliant: boolean;
    completeness: number;
  };
}

export interface OptimizationResult {
  estimatedSavings: number;
  suggestions: Array<{
    id: string;
    title: string;
    priority: 'high' | 'medium' | 'low';
    estimatedSavings: number;
    description: string;
    implementation: {
      steps: string[];
    };
  }>;
}

interface DataState {
  // 财务数据
  excelData: ExcelData | null;
  importedData: ImportedData | null;

  // 审计结果
  auditResult: AuditResult | null;

  // 分析结果
  analysisResult: AnalysisResult | null;

  // 优化结果
  optimizationResult: OptimizationResult | null;

  // 申报数据
  filingData: FilingData | null;

  // 动作
  setExcelData: (data: ExcelData | null) => void;
  setImportedData: (data: ImportedData | null) => void;
  setAuditResult: (result: AuditResult | null) => void;
  setAnalysisResult: (result: AnalysisResult | null) => void;
  setOptimizationResult: (result: OptimizationResult | null) => void;
  setFilingData: (data: FilingData | null) => void;
  clearAllData: () => void;
}

export const useDataStore = create<DataState>()(
  persist(
    (set) => ({
      // 初始状态
      excelData: null,
      importedData: null,
      auditResult: null,
      analysisResult: null,
      optimizationResult: null,
      filingData: null,

      // 动作
      setExcelData: (data) => set({ excelData: data }),
      setImportedData: (data) => set({ importedData: data }),
      setAuditResult: (result) => set({ auditResult: result }),
      setAnalysisResult: (result) => set({ analysisResult: result }),
      setOptimizationResult: (result) => set({ optimizationResult: result }),
      setFilingData: (data) => set({ filingData: data }),
      clearAllData: () => set({
        excelData: null,
        importedData: null,
        auditResult: null,
        analysisResult: null,
        optimizationResult: null,
        filingData: null,
      }),
    }),
    {
      name: 'data-storage',
      // 只持久化 excelData 和 importedData（大型财务数据，使用 Dexie）
      // 其他字段（auditResult、analysisResult 等）在内存中，不持久化
      partialize: (state) => ({
        excelData: state.excelData,
        importedData: state.importedData,
      }),
      storage: dexieStorage,
    }
  )
);

export default useDataStore;
