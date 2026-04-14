/**
 * 数据状态管理 - Data Store
 * 使用 Zustand 管理财务数据和审计结果
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface FilingData {
  forms: string[];
  period: { year: number; period: string; quarter?: number };
}

export interface AuditResult {
  score: number;
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  issues: Array<{
    id: string;
    title: string;
    description: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    category: string;
    amount?: number;
    suggestion: string;
    requiredEvidence?: string[];
  }>;
  evidenceScore: {
    totalScore: number;
    passed: boolean;
    categories: Array<{
      name: string;
      score: number;
      missingEvidence: string[];
    }>;
  };
  summary: {
    totalChecks: number;
    passedChecks: number;
    failedChecks: number;
    warnings: number;
  };
  slpeQualification?: {
    eligible: boolean;
    taxRate: number;
    savings: number;
    reason: string;
  };
  adjustment: {
    totalIncrease: number;
    totalDecrease: number;
    items: Array<{
      account: string;
      amount: number;
      adjustment: number;
      legalBasis: string;
    }>;
  };
  risk: {
    score: number;
    level: string;
    risks: Array<{
      id: string;
      name: string;
      level: string;
      category: string;
    }>;
  };
  taxCalculation: {
    taxableIncome: number;
    taxRate: number;
    taxPayable: number;
    taxPrepaid: number;
  };
}

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

// 导入文件元数据（用于91文件列表）
// Excel 导入数据类型（与 ExcelImporter ImportedData 兼容）
export interface ExcelData {
  balanceSheet: {
    year: number; assets: number; liabilities: number; ownerEquity: number;
    cash: number; accountsReceivable: number; inventory: number; fixedAssets: number; accountsPayable: number;
  };
  incomeStatement: {
    year: number; revenue: number; costOfSales: number; grossProfit: number;
    operatingExpense: number; managementExpense: number; financialExpense: number;
    operatingProfit: number; totalProfit: number; netProfit: number;
  };
  subjectBalances: Array<{
    code: string; name: string; category: string;
    openingBalance: number; debitBalance: number; creditBalance: number; closingBalance: number;
  }>;
  invoices: Array<{
    id: string; date: string; type: 'special' | 'normal'; amount: number; taxAmount: number;
    sellerName: string; sellerTaxId: string; invoiceCode: string; invoiceNumber: string;
    status: 'valid' | 'invalid' | 'voided';
  }>;
}

export interface ImportedFileMeta {
  id: string;
  name: string;
  size: number;
  type: string;
  status: 'pending' | 'parsing' | 'success' | 'error';
  recordCount?: number;
  sheetCount?: number;
  importTime: number;
}

interface DataState {
  // 财务数据
  excelData: any;
  importedData: any;

  // 导入文件列表（91文件持久化）
  importedFiles: ImportedFileMeta[];

  // 审计结果
  auditResult: AuditResult | null;

  // 分析结果
  analysisResult: AnalysisResult | null;

  // 优化结果
  optimizationResult: OptimizationResult | null;

  // 申报数据
  filingData: FilingData | null;

  // 动作
  setExcelData: (data: any) => void;
  setImportedData: (data: any) => void;
  setImportedFiles: (files: ImportedFileMeta[]) => void;
  addImportedFile: (file: ImportedFileMeta) => void;
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
      importedFiles: [],
      auditResult: null,
      analysisResult: null,
      optimizationResult: null,
      filingData: null,

      // 动作
      setExcelData: (data) => set({ excelData: data }),
      setImportedData: (data) => set({ importedData: data }),
      setImportedFiles: (files) => set({ importedFiles: files }),
      addImportedFile: (file) => set(s => ({ importedFiles: [...s.importedFiles, file] })),
      setAuditResult: (result) => set({ auditResult: result }),
      setAnalysisResult: (result) => set({ analysisResult: result }),
      setOptimizationResult: (result) => set({ optimizationResult: result }),
      setFilingData: (data) => set({ filingData: data }),
      clearAllData: () => set({
        excelData: null,
        importedData: null,
        importedFiles: [],
        auditResult: null,
        analysisResult: null,
        optimizationResult: null,
        filingData: null,
      }),
    }),
    {
      name: 'data-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export default useDataStore;
