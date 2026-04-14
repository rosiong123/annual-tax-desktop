/**
 * 智能审核引擎 - annual-tax-desktop
 *
 * 规则已内联到 src/rules/，避免跨仓库相对路径问题
 * 共享规则来源 (已内联):
 * - ai-finance-os/shared/audit-rules/src/corporate-income-tax-rules.ts
 * - ai-finance-os/shared/audit-rules/src/compliance-rules.ts
 */

import { runCorporateTaxAudit } from '../rules/corporate-income-tax-rules';

// ============================================================
// 类型兼容层 (与原有 App.tsx 接口完全兼容)
// ============================================================

export type IssueSeverity = 'error' | 'warning' | 'info';
export type IssueCategory = 'compliance' | 'human_error' | 'logic_error' | 'risk_warning';

export interface Evidence {
  type: string;
  name: string;
  amount?: number;
  count: number;
  hasElectronic: boolean;
}

export interface AuditIssue {
  id: string;
  category: IssueCategory;
  title: string;
  severity: IssueSeverity;
  description: string;
  amount?: number;
  deductionType?: string;
  requiredEvidence: string[];
  suggestion: string;
  canProceed: boolean;
}

export interface EvidenceScore {
  totalScore: number;
  passed: boolean;
  categories: {
    category: string;
    score: number;
    maxScore: number;
    missingEvidence: string[];
  }[];
}

export interface AuditResult {
  score: number;
  riskLevel: 'high' | 'medium' | 'low';
  summary: {
    totalChecks: number;
    passedChecks: number;
    failedChecks: number;
    warnings: number;
  };
  issues: AuditIssue[];
  evidenceScore: EvidenceScore;
  passed: boolean;
}

// ============================================================
// 数据格式映射
// ============================================================

interface SharedFinancialData {
  balanceSheet: {
    assets: number; liabilities: number; equity: number;
    cash: number; accountsReceivable: number; inventory: number;
    fixedAssets: number; accountsPayable: number;
  };
  incomeStatement: {
    revenue: number; cost: number; grossProfit: number;
    operatingExpense: number; managementExpense: number; financialExpense: number;
    operatingProfit: number; totalProfit: number; netProfit: number;
  };
  taxData?: {
    taxableIncome: number; taxPayable: number; taxPrepaid: number;
    rdExpense: number; welfareExpense: number; entertainment: number;
    advertisement: number; totalWages: number; isSmallBenefit: boolean;
    isHighTech: boolean; hasRelatedParty: boolean;
  };
  invoices?: unknown[];
}

function toSharedFormat(data: unknown): SharedFinancialData {
  const d = data as Record<string, unknown>;
  const bs = (d?.balanceSheet as Record<string, unknown>) || {};
  const is_ = (d?.incomeStatement as Record<string, unknown>) || {};
  const tax = (d?.taxData as Record<string, unknown>) || {};

  return {
    balanceSheet: {
      assets: Number(bs.assets) || 0,
      liabilities: Number(bs.liabilities) || 0,
      equity: Number(bs.ownerEquity || bs.equity) || 0,
      cash: Number(bs.cash) || 0,
      accountsReceivable: Number(bs.accountsReceivable) || 0,
      inventory: Number(bs.inventory) || 0,
      fixedAssets: Number(bs.fixedAssets) || 0,
      accountsPayable: Number(bs.accountsPayable) || 0,
    },
    incomeStatement: {
      revenue: Number(is_.revenue) || 0,
      cost: Number(is_.costOfSales || is_.cost) || 0,
      grossProfit: Number(is_.grossProfit) || 0,
      operatingExpense: Number(is_.operatingExpense) || 0,
      managementExpense: Number(is_.managementExpense || is_.adminExpense) || 0,
      financialExpense: Number(is_.financialExpense) || 0,
      operatingProfit: Number(is_.operatingProfit) || 0,
      totalProfit: Number(is_.totalProfit) || 0,
      netProfit: Number(is_.netProfit) || 0,
    },
    taxData: {
      taxableIncome: Number(tax.taxableIncome || is_.totalProfit) || 0,
      taxPayable: Number(tax.taxPayable) || 0,
      taxPrepaid: Number(tax.taxPrepaid) || 0,
      rdExpense: Number(tax.rdExpense) || 0,
      welfareExpense: Number(tax.welfareExpense) || 0,
      entertainment: Number(tax.entertainment) || 0,
      advertisement: Number(tax.advertisement) || 0,
      totalWages: Number(tax.totalWages) || 0,
      isSmallBenefit: Boolean(tax.isSmallBenefit),
      isHighTech: Boolean(tax.isHighTech),
      hasRelatedParty: Boolean(tax.hasRelatedParty),
    },
    invoices: (d?.invoices as unknown[]) || [],
  };
}

function toAppFormat(result: {
  score: number;
  riskLevel: string;
  summary: { total: number; errors: number; warnings: number };
  issues: unknown[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  evidenceScore?: any;
}): AuditResult {
  const errors = result.summary?.errors || 0;
  const warnings = result.summary?.warnings || 0;

  return {
    score: result.score || 0,
    riskLevel: result.riskLevel === '高' ? 'high' : result.riskLevel === '中' ? 'medium' : 'low',
    summary: {
      totalChecks: result.summary?.total || 0,
      passedChecks: 0,
      failedChecks: errors + warnings,
      warnings,
    },
    issues: (result.issues || []).map((issue: unknown) => {
      const i = issue as Record<string, unknown>;
      return {
        id: String(i.id || i.code || ''),
        category: (i.category as IssueCategory) || 'compliance',
        title: String(i.title || i.name || ''),
        severity: (i.severity as IssueSeverity) || 'warning',
        description: String(i.description || ''),
        amount: Number(i.amount) || 0,
        deductionType: String(i.deductionType || ''),
        requiredEvidence: (i.requiredEvidence || []) as string[],
        suggestion: String(i.suggestion || ''),
        canProceed: i.canProceed !== false,
      };
    }),
    evidenceScore: result.evidenceScore ? {
      totalScore: result.evidenceScore.totalScore ?? 100,
      passed: result.evidenceScore.passed ?? true,
      categories: (result.evidenceScore.categories || []).map((c: { category: string; score: number }) => ({
        category: c.category,
        score: c.score,
        maxScore: 100,
        missingEvidence: [] as string[],
      })),
    } : { totalScore: 100, passed: true, categories: [] },
    passed: result.evidenceScore?.passed ?? true,
  };
}

// ============================================================
// 主入口 (同步)
// ============================================================

export function runComprehensiveAudit(data: unknown, _evidence?: Evidence[]): AuditResult {
  const shared = toSharedFormat(data);
  const result = runCorporateTaxAudit(shared as Parameters<typeof runCorporateTaxAudit>[0]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return toAppFormat(result as any) as unknown as AuditResult;
}

// 异步入口 (与原有 API 兼容)
export async function runComprehensiveAuditAsync(data: unknown, evidence?: Evidence[]): Promise<AuditResult> {
  return runComprehensiveAudit(data, evidence);
}

export default runComprehensiveAudit;
