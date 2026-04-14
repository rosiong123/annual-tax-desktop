/**
 * 多周期税务审核引擎
 * 支持月度增值税、季度所得税预缴、年度所得税汇算清缴
 */

// 周期类型
export type TaxPeriodType = 'monthly' | 'quarterly' | 'annual';

export interface TaxPeriod {
  type: TaxPeriodType;
  year: number;
  month?: number;
  quarter?: number;
}

// 审核问题
export interface AuditIssue {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'compliance' | 'human_error' | 'logic_error' | 'warning';
  amount?: number;
  requiredEvidence?: string[];
  suggestion: string;
}

// 审核结果
export interface AuditResult {
  period: TaxPeriod;
  score: number;
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  issues: AuditIssue[];
  evidenceScore: {
    totalScore: number;
    passed: boolean;
    categories: { category: string; score: number; missingEvidence: string[] }[];
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
    taxSavings: number;
    reason: string;
  };
  evidenceLedger: {
    timestamp: string;
    action: string;
    evidence: string;
    hash: string;
  }[];
}

export function getCurrentTaxPeriod(): TaxPeriod {
  const now = new Date();
  const month = now.getMonth() + 1;
  const quarter = Math.ceil(month / 3);
  return {
    type: 'quarterly',
    year: now.getFullYear(),
    quarter,
    month
  };
}

export function formatTaxPeriod(period: TaxPeriod): string {
  if (period.type === 'annual') return `${period.year}年度`;
  if (period.type === 'quarterly') return `${period.year}年第${period.quarter}季度`;
  return `${period.year}年${period.month}月`;
}

function getMonthlyAuditRules() {
  return [
    {
      id: 'VAT-001',
      title: '进项税额抵扣完整性',
      check: (data: any) => {
        const issues: AuditIssue[] = [];
        if (data.unverifiedInputTax && data.unverifiedInputTax > 10000) {
          issues.push({
            id: 'VAT-001',
            title: '存在未认证进项税额',
            description: `检测到 ${data.unverifiedInputTax.toLocaleString()} 元进项税额未在当期认证`,
            severity: 'high',
            category: 'compliance',
            amount: data.unverifiedInputTax,
            requiredEvidence: ['增值税专用发票', '认证截图'],
            suggestion: '建议在认证期限内完成发票认证'
          });
        }
        return issues;
      }
    },
    {
      id: 'VAT-002',
      title: '销项税额与开票金额匹配',
      check: (data: any) => {
        const issues: AuditIssue[] = [];
        const variance = Math.abs(data.outputTax - data.billedTax) / (data.billedTax || 1);
        if (variance > 0.05) {
          issues.push({
            id: 'VAT-002',
            title: '销项税额与开票金额存在差异',
            description: `开票金额差异超过5%`,
            severity: 'medium',
            category: 'logic_error',
            amount: Math.abs(data.outputTax - data.billedTax),
            suggestion: '检查是否存在未开票收入或红字发票'
          });
        }
        return issues;
      }
    },
    {
      id: 'VAT-003',
      title: '进项转出完整性',
      check: (data: any) => {
        const issues: AuditIssue[] = [];
        if (data.nonDeductibleItems && !data.inputTaxTransferred) {
          issues.push({
            id: 'VAT-003',
            title: '存在不得抵扣项目未转出',
            description: `检测到 ${data.nonDeductibleItems.toLocaleString()} 元不得抵扣项目`,
            severity: 'high',
            category: 'compliance',
            amount: data.nonDeductibleItems,
            suggestion: '按规定将不得抵扣项目的进项税额转出'
          });
        }
        return issues;
      }
    }
  ];
}

function getQuarterlyAuditRules() {
  return [
    {
      id: 'CIT-Q001',
      title: '预缴税额计算准确性',
      check: (data: any) => {
        const issues: AuditIssue[] = [];
        const expectedTax = (data.taxableIncome || 0) * (data.taxRate || 0.25);
        const variance = Math.abs((data.prepaidTax || 0) - expectedTax) / (expectedTax || 1);
        if (variance > 0.01) {
          issues.push({
            id: 'CIT-Q001',
            title: '预缴税额与计算结果存在差异',
            description: `差异率 ${(variance * 100).toFixed(2)}%`,
            severity: 'high',
            category: 'logic_error',
            amount: Math.abs((data.prepaidTax || 0) - expectedTax),
            suggestion: '核实收入、成本确认是否准确'
          });
        }
        return issues;
      }
    },
    {
      id: 'CIT-Q002',
      title: '收入确认时点',
      check: (data: any) => {
        const issues: AuditIssue[] = [];
        if (data.unbilledRevenue && data.unbilledRevenue > 50000) {
          issues.push({
            id: 'CIT-Q002',
            title: '存在大额未开票收入',
            description: `未开票收入 ${data.unbilledRevenue.toLocaleString()} 元`,
            severity: 'medium',
            category: 'compliance',
            amount: data.unbilledRevenue,
            suggestion: '按权责发生制确认收入'
          });
        }
        return issues;
      }
    },
    {
      id: 'CIT-Q003',
      title: '小微优惠预判',
      check: (data: any) => {
        const issues: AuditIssue[] = [];
        const taxableIncome = data.taxableIncome || 0;
        const isSmallMicro = taxableIncome <= 3000000 &&
          (data.employeeCount || 0) <= 300 &&
          (data.totalAssets || 0) <= 50000000;
        if (isSmallMicro) {
          issues.push({
            id: 'CIT-Q003',
            title: '符合小微企业优惠条件',
            description: `应纳税所得额 ${taxableIncome.toLocaleString()} 元，符合小型微利企业标准`,
            severity: 'low',
            category: 'warning',
            suggestion: '可享受小微企业所得税优惠，实际税负率可降至5%'
          });
        }
        return issues;
      }
    }
  ];
}

function getAnnualAuditRules() {
  return [
    {
      id: 'RD-001',
      title: '研发费用加计扣除',
      check: (data: any) => {
        const issues: AuditIssue[] = [];
        if (data.rdLaborCost && data.totalWages < data.rdLaborCost) {
          issues.push({
            id: 'RD-001',
            title: '研发人员人工费超出工资总额',
            description: `研发人员人工费 ${data.rdLaborCost.toLocaleString()} > 工资总额 ${data.totalWages?.toLocaleString() || 0}`,
            severity: 'critical',
            category: 'logic_error',
            requiredEvidence: ['工资发放记录', '研发项目工时表'],
            suggestion: '核实研发人员归集，确保人工费用不超出实际工资'
          });
        }
        if (data.rdOtherCost && data.rdLaborCost) {
          const ratio = data.rdOtherCost / data.rdLaborCost;
          if (ratio > 0.1) {
            issues.push({
              id: 'RD-002',
              title: '其他费用占比偏高',
              description: `其他费用占人工费比例 ${(ratio * 100).toFixed(1)}%`,
              severity: 'medium',
              category: 'compliance',
              suggestion: '其他费用不得超过人工费用的10%'
            });
          }
        }
        return issues;
      }
    },
    {
      id: 'ADJ-001',
      title: '纳税调整项目',
      check: (data: any) => {
        const issues: AuditIssue[] = [];
        if (data.businessEntertainment && data.businessEntertainment > 600000) {
          const deductible = 600000 + (data.revenue - 6000000) * 0.0005;
          if (data.businessEntertainment > deductible) {
            issues.push({
              id: 'ADJ-001',
              title: '业务招待费超限',
              description: `业务招待费 ${data.businessEntertainment.toLocaleString()} 元，可税前扣除 ${deductible.toLocaleString()} 元`,
              severity: 'high',
              category: 'compliance',
              amount: data.businessEntertainment - deductible,
              requiredEvidence: ['招待费发票', '招待事项说明'],
              suggestion: '超限部分需做纳税调增'
            });
          }
        }
        if (data.trainingExpense && data.totalWages) {
          const maxTraining = (data.totalWages || 0) * 0.08;
          if (data.trainingExpense > maxTraining) {
            issues.push({
              id: 'ADJ-002',
              title: '职工教育经费超限',
              description: `超限金额 ${(data.trainingExpense - maxTraining).toLocaleString()} 元`,
              severity: 'medium',
              category: 'compliance',
              amount: data.trainingExpense - maxTraining,
              suggestion: '超限部分结转以后年度扣除'
            });
          }
        }
        return issues;
      }
    },
    {
      id: 'FORM-001',
      title: '申报表勾稽关系',
      check: (data: any) => {
        const issues: AuditIssue[] = [];
        if (data.A107012_rdExpense && data.A105050_wages) {
          if (data.A107012_rdExpense > data.A105050_wages * 1.1) {
            issues.push({
              id: 'FORM-001',
              title: '研发人员费用与工资表存在逻辑冲突',
              description: '研发费用中人员费用大于工资表总额，可能被认定为异常',
              severity: 'critical',
              category: 'logic_error',
              requiredEvidence: ['A107012表', 'A105050表', '研发工时明细'],
              suggestion: '检查A107012表人员费用归集是否准确'
            });
          }
        }
        return issues;
      }
    }
  ];
}

function calculateSLPE(data: any) {
  const taxableIncome = data.taxableIncome || 0;
  const employeeCount = data.employeeCount || 0;
  const totalAssets = data.totalAssets || 0;
  const isSmallMicro = taxableIncome <= 3000000 && employeeCount <= 300 && totalAssets <= 50000000;
  if (!isSmallMicro) {
    return { eligible: false, taxRate: 0.25, taxSavings: 0, reason: '不符合小型微利企业标准' };
  }
  const standardTax = taxableIncome * 0.25;
  const actualTax = taxableIncome * 0.05;
  return {
    eligible: true,
    taxRate: 0.05,
    taxSavings: standardTax - actualTax,
    reason: '符合小微企业所得税优惠条件，实际税负率5%'
  };
}

function generateHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

export function runMultiPeriodAudit(period: TaxPeriod, financialData: any): AuditResult {
  const issues: AuditIssue[] = [];
  const evidenceLedger: AuditResult['evidenceLedger'] = [];
  const timestamp = new Date().toISOString();
  let rules: any[] = [];
  switch (period.type) {
    case 'monthly': rules = getMonthlyAuditRules(); break;
    case 'quarterly': rules = getQuarterlyAuditRules(); break;
    case 'annual': rules = getAnnualAuditRules(); break;
  }
  let passedChecks = 0, failedChecks = 0, warnings = 0;
  for (const rule of rules) {
    const ruleIssues = rule.check(financialData);
    if (ruleIssues.length === 0) {
      passedChecks++;
      evidenceLedger.push({ timestamp, action: '规则检查通过', evidence: rule.title, hash: generateHash(`${rule.id}-${timestamp}`) });
    } else {
      for (const issue of ruleIssues) {
        issues.push(issue);
        if (issue.severity === 'critical' || issue.severity === 'high') failedChecks++;
        else warnings++;
        evidenceLedger.push({ timestamp, action: issue.severity === 'critical' ? '高风险拦截' : issue.severity === 'high' ? '风险警告' : '提示', evidence: issue.title, hash: generateHash(`${issue.id}-${timestamp}`) });
      }
    }
  }
  const baseScore = 100;
  const score = Math.max(0, baseScore - issues.filter(i => i.severity === 'critical').length * 25 - issues.filter(i => i.severity === 'high').length * 10 - issues.filter(i => i.severity === 'medium').length * 5);
  let riskLevel: AuditResult['riskLevel'] = 'low';
  if (score < 30) riskLevel = 'critical';
  else if (score < 50) riskLevel = 'high';
  else if (score < 75) riskLevel = 'medium';
  const totalRequired = issues.reduce((sum, i) => sum + (i.requiredEvidence?.length || 0), 0);
  const evidenceScore = { totalScore: totalRequired > 0 ? Math.max(30, 100 - totalRequired * 10) : 100, passed: totalRequired <= 3, categories: totalRequired > 0 ? [{ category: '核心凭证', score: Math.max(30, 100 - totalRequired * 10), missingEvidence: issues.flatMap(i => i.requiredEvidence || []) }] : [] };
  const slpeQualification = period.type !== 'monthly' ? calculateSLPE(financialData) : undefined;
  return { period, score, riskLevel, issues, evidenceScore, summary: { totalChecks: rules.length, passedChecks, failedChecks, warnings }, slpeQualification, evidenceLedger };
}

export function generateFilingForms(period: TaxPeriod, data: any): string[] {
  const forms: string[] = [];
  switch (period.type) {
    case 'monthly': forms.push('《增值税及附加税费申报表》'); break;
    case 'quarterly': forms.push('《企业所得税月（季）度预缴申报表》'); break;
    case 'annual': forms.push('A100000', 'A101010', 'A102010', 'A105000', 'A105080', 'A107012'); break;
  }
  return forms;
}
