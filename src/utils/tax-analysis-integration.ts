/**
 * 税务分析集成层 - Tax Analysis Integration
 * 整合纳税调整引擎、风险扫描引擎、小微优惠引擎、多周期审核引擎
 */

import { TaxServiceInput, analyzeTax, generateReport } from './tax-service';
import { AdjustmentItem } from './adjust-engine';
import { RiskScanResult } from './risk-engine';
import { SLPEQualification } from './slpe-engine';
import { AuditIssue } from './multi-period-audit';

// 扩展审计问题类型，包含引擎结果
export interface ExtendedAuditIssue extends AuditIssue {
  adjustmentAmount?: number;
  deductibleAmount?: number;
  legalBasis?: string;
  riskIndicator?: string;
  riskSuggestion?: string;
}

// 完整的税务分析输出
export interface FullTaxAnalysis {
  // 基础信息
  period: { type: string; year: number; month?: number; quarter?: number };
  
  // 数据验证
  dataValidation: { valid: boolean; missing: string[] };
  
  // 纳税调整
  adjustment: {
    items: Array<{
      account: string;
      originalAmount: number;
      adjustmentAmount: number;
      deductibleAmount: number;
      legalBasis: string;
      note: string;
    }>;
    totalIncrease: number;
    totalDecrease: number;
  };
  
  // 风险扫描
  risk: {
    score: number;
    level: 'high' | 'medium' | 'low';
    risks: Array<{
      name: string;
      level: 'high' | 'medium' | 'low';
      description: string;
      suggestion: string;
    }>;
  };
  
  // 小微优惠
  slpe: SLPEQualification;
  
  // 税额计算
  taxCalculation: {
    taxableIncome: number;
    taxRate: number;
    taxPayable: number;
    taxPrepaid: number;
    taxDue: number;
    taxSavings: number;
  };
  
  // 审计问题（兼容原有格式）
  issues: ExtendedAuditIssue[];
  
  // 综合得分
  score: number;
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  
  // 证据完整度
  evidenceScore: {
    totalScore: number;
    passed: boolean;
    categories: Array<{ category: string; score: number; missingEvidence: string[] }>;
  };
  
  // 审计摘要
  summary: {
    totalChecks: number;
    passedChecks: number;
    failedChecks: number;
    warnings: number;
  };
  
  // 原始输入
  input: TaxServiceInput;
}

/**
 * 将纳税调整项转换为审计问题
 */
function adjustmentToIssues(items: AdjustmentItem[]): ExtendedAuditIssue[] {
  return items.map((item, idx) => ({
    id: `ADJ-${String(idx + 1).padStart(3, '0')}`,
    title: `${item.account}需调整`,
    description: `金额 ${item.originalAmount.toLocaleString()} 元，可扣除 ${item.deductibleAmount.toLocaleString()} 元，需调增 ${item.adjustmentAmount.toLocaleString()} 元`,
    severity: item.adjustmentAmount > 100000 ? 'high' as const : 'medium' as const,
    category: 'compliance' as const,
    amount: item.adjustmentAmount,
    adjustmentAmount: item.adjustmentAmount,
    deductibleAmount: item.deductibleAmount,
    legalBasis: item.legalBasis,
    suggestion: `依据${item.legalBasis}，${item.note}`,
  }));
}

/**
 * 将风险项转换为审计问题
 */
function riskToIssues(risk: RiskScanResult): ExtendedAuditIssue[] {
  return risk.risks.map((r, idx) => ({
    id: `RISK-${String(idx + 1).padStart(3, '0')}`,
    title: r.name,
    description: r.description,
    severity: r.level,
    category: 'warning' as const,
    riskIndicator: r.indicator,
    riskSuggestion: r.suggestion,
    suggestion: r.suggestion,
  }));
}

/**
 * 执行完整税务分析
 */
export async function runFullTaxAnalysis(
  input: TaxServiceInput,
  period: { type: 'monthly' | 'quarterly' | 'annual'; year: number; month?: number; quarter?: number }
): Promise<FullTaxAnalysis> {
  // 调用核心分析引擎
  const result = await analyzeTax(input);
  
  // 合并问题
  const issues: ExtendedAuditIssue[] = [
    ...adjustmentToIssues(result.adjustment.items),
    ...riskToIssues(result.risk),
  ];
  
  // 计算得分
  const criticalCount = issues.filter(i => i.severity === 'critical').length;
  const highCount = issues.filter(i => i.severity === 'high').length;
  const mediumCount = issues.filter(i => i.severity === 'medium').length;
  const score = Math.max(0, 100 - criticalCount * 25 - highCount * 10 - mediumCount * 5);
  
  // 确定风险等级
  let riskLevel: 'critical' | 'high' | 'medium' | 'low' = 'low';
  if (score < 30) riskLevel = 'critical';
  else if (score < 50) riskLevel = 'high';
  else if (score < 75) riskLevel = 'medium';
  
  // 计算证据完整度
  const missingEvidence = issues.flatMap(i => {
    if (i.severity === 'high' || i.severity === 'critical') {
      return [`${i.title}相关凭证`];
    }
    return [];
  });
  const evidenceScore = {
    totalScore: missingEvidence.length > 3 ? Math.max(30, 100 - missingEvidence.length * 10) : 100,
    passed: missingEvidence.length <= 3,
    categories: [{
      category: '核心凭证',
      score: missingEvidence.length > 3 ? Math.max(30, 100 - missingEvidence.length * 10) : 100,
      missingEvidence,
    }],
  };
  
  // 统计
  const totalChecks = 10;
  const failedChecks = issues.filter(i => i.severity === 'high' || i.severity === 'critical').length;
  const warnings = issues.filter(i => i.severity === 'medium' || i.severity === 'low').length;
  
  return {
    period,
    dataValidation: result.dataValidation,
    adjustment: {
      items: result.adjustment.items.map(item => ({
        account: item.account,
        originalAmount: item.originalAmount,
        adjustmentAmount: item.adjustmentAmount,
        deductibleAmount: item.deductibleAmount,
        legalBasis: item.legalBasis,
        note: item.note,
      })),
      totalIncrease: result.adjustment.totalIncrease,
      totalDecrease: result.adjustment.totalDecrease,
    },
    risk: {
      score: result.risk.score,
      level: result.risk.level,
      risks: result.risk.risks.map(r => ({
        name: r.name,
        level: r.level,
        description: r.description,
        suggestion: r.suggestion,
      })),
    },
    slpe: result.slpe,
    taxCalculation: result.taxCalculation,
    issues,
    score,
    riskLevel,
    evidenceScore,
    summary: {
      totalChecks,
      passedChecks: totalChecks - failedChecks - warnings,
      failedChecks,
      warnings,
    },
    input,
  };
}

/**
 * 生成优化建议
 */
export function generateOptimizationSuggestions(analysis: FullTaxAnalysis): Array<{
  id: string;
  title: string;
  priority: 'high' | 'medium' | 'low';
  estimatedSavings: number;
  description: string;
  implementation: { steps: string[] };
}> {
  const suggestions: Array<{
    id: string;
    title: string;
    priority: 'high' | 'medium' | 'low';
    estimatedSavings: number;
    description: string;
    implementation: { steps: string[] };
  }> = [];
  
  // 小微优惠建议
  if (analysis.slpe.eligible) {
    suggestions.push({
      id: 'OPT-SLPE',
      title: '小微企业税收优惠',
      priority: 'high',
      estimatedSavings: analysis.slpe.taxSavings,
      description: analysis.slpe.reason,
      implementation: {
        steps: [
          '确认符合小微企业条件（应纳税所得额≤300万、从业人数≤300人、资产总额≤5000万）',
          '在电子税务局选择"小微企业"选项',
          '系统自动计算优惠税额',
        ],
      },
    });
  }
  
  // 纳税调整优化建议
  const adjustmentIssues = analysis.adjustment.items.filter(i => i.adjustmentAmount > 0);
  if (adjustmentIssues.length > 0) {
    adjustmentIssues.forEach((item, idx) => {
      suggestions.push({
        id: `OPT-ADJ-${idx + 1}`,
        title: `${item.account}超标调整`,
        priority: item.adjustmentAmount > 50000 ? 'medium' : 'low',
        estimatedSavings: 0, // 调整项不能省税，只是合规要求
        description: `${item.account}超限 ${item.adjustmentAmount.toLocaleString()} 元，需调增应纳税所得额。${item.note}`,
        implementation: {
          steps: [
            `确认${item.account}实际发生金额：${item.originalAmount.toLocaleString()}元`,
            `计算可税前扣除限额：${item.deductibleAmount.toLocaleString()}元`,
            `在A105000表调增：${item.adjustmentAmount.toLocaleString()}元`,
          ],
        },
      });
    });
  }
  
  // 风险提示
  const highRisks = analysis.risk.risks.filter(r => r.level === 'high');
  if (highRisks.length > 0) {
    highRisks.forEach((risk, idx) => {
      suggestions.push({
        id: `OPT-RISK-${idx + 1}`,
        title: `风险提示：${risk.name}`,
        priority: risk.level,
        estimatedSavings: 0,
        description: risk.description,
        implementation: {
          steps: [risk.suggestion],
        },
      });
    });
  }
  
  return suggestions;
}

/**
 * 生成报告
 */
export async function generateTaxReport(analysis: FullTaxAnalysis, companyName: string): Promise<{
  markdown: string;
  json: object;
}> {
  const { markdown: mReport, json: jReport } = await generateReport(
    analysis.input,
    companyName,
    analysis.period.year
  );
  return { markdown: mReport, json: jReport };
}

export default {
  runFullTaxAnalysis,
  generateOptimizationSuggestions,
  generateTaxReport,
};
