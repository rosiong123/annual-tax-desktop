/**
 * 企业所得税风险检测规则
 * 已内联到本仓库，避免跨仓库相对路径依赖
 * 来源: tax-audit-pro/src/backend/api.py RuleEngine
 */
import { COMPLIANCE_RULES } from './compliance-rules.js';

export type RiskLevel = '高' | '中' | '低';
export type AuditCategory = '收入确认' | '成本费用' | '期间费用' | '税金计算' | '纳税调整' | '合规性' | '关联交易';

export interface RiskItem {
  code: string;
  name: string;
  level: RiskLevel;
  description: string;
  category: AuditCategory;
  currentValue: string;
  expectedValue?: string;
  suggestion?: string;
  legalBasis?: string;
  taxImpact?: number;
  estimatedDays?: number;
  confidence?: number;
}

export interface FinancialDataInput {
  balanceSheet?: {
    assets: number; liabilities: number; equity: number;
    cash: number; accountsReceivable: number; inventory: number;
    fixedAssets: number; accountsPayable: number;
  };
  incomeStatement?: {
    revenue: number; cost: number; grossProfit: number;
    salesExpense?: number; adminExpense?: number; financeExpense?: number;
    operatingProfit?: number; totalProfit: number; netProfit: number;
  };
  taxData?: {
    taxableIncome: number; taxPayable: number; taxPrepaid: number;
    rdExpense: number; welfareExpense: number; entertainment: number;
    advertisement: number; commission?: number; donation?: number;
    totalWages: number; isSmallBenefit: boolean; isHighTech: boolean;
    hasRelatedParty: boolean;
  };
}

export interface ComplianceIssue {
  id: string;
  category: 'logic_error' | 'human_error' | 'compliance' | 'risk_warning';
  severity: 'error' | 'warning' | 'info';
  title: string;
  description: string;
  amount?: number;
  deductionType?: string;
  requiredEvidence: string[];
  suggestion: string;
  canProceed: boolean;
}

export interface AuditResult {
  score: number;
  riskLevel: RiskLevel;
  summary: { total: number; errors: number; warnings: number; info: number };
  risks: RiskItem[];
  issues: ComplianceIssue[];
  evidenceScore: { totalScore: number; passed: boolean; categories: Array<{ category: string; score: number }> };
}

/** 执行全部规则检测 */
export function runCorporateTaxAudit(data: FinancialDataInput): AuditResult {
  const bs: any = data.balanceSheet || {};
  const is_: any = data.incomeStatement || {};
  const tax: any = data.taxData || {};

  const risks: RiskItem[] = [];
  const issues: ComplianceIssue[] = [];

  // === 规则 R01: 成本率异常 ===
  if (is_.revenue > 0) {
    const costRatio = is_.cost / is_.revenue;
    if (costRatio > 0.95) {
      risks.push({ code: 'R01', name: '成本率异常偏高', level: '高', category: '成本费用',
        description: `成本率${(costRatio*100).toFixed(1)}%超过95%，可能存在虚增成本`,
        currentValue: `成本率 ${(costRatio*100).toFixed(1)}%`, expectedValue: '正常范围 50%-85%',
        suggestion: '检查成本归集是否正确', legalBasis: '会计准则第14号', confidence: 0.9 });
    }
  }

  // === 规则 R02: 毛利率偏低 ===
  if (is_.revenue > 0 && is_.grossProfit > 0) {
    const gm = is_.grossProfit / is_.revenue;
    if (gm < 0.1) {
      risks.push({ code: 'R02', name: '毛利率偏低', level: '中', category: '收入确认',
        description: `毛利率${(gm*100).toFixed(1)}%低于正常水平`,
        currentValue: `毛利率 ${(gm*100).toFixed(1)}%`, expectedValue: '>10%',
        suggestion: '分析毛利波动原因', legalBasis: '成本效益分析', confidence: 0.8 });
    }
  }

  // === 规则 R10: 业务招待费超标 ===
  if (is_.revenue > 0 && tax.entertainment > 0) {
    const limit = Math.min(tax.entertainment * 0.6, is_.revenue * 0.003);
    const nonDed = tax.entertainment - limit;
    if (nonDed > 0) {
      risks.push({ code: 'R10', name: '业务招待费超标', level: '高', category: '期间费用',
        description: `招待费${tax.entertainment.toFixed(0)}万，超标${nonDed.toFixed(0)}万`,
        currentValue: `招待费 ${tax.entertainment.toFixed(0)}万元`, expectedValue: `最高可扣 ${limit.toFixed(0)}万元`,
        suggestion: `调增应纳税所得额 ${nonDed.toFixed(0)}万元`, legalBasis: '《企业所得税法》第四十三条',
        taxImpact: nonDed * 0.25, estimatedDays: 15, confidence: 0.95 });
    }
  }

  // === 规则 R11: 职工福利费超标 ===
  if (tax.totalWages > 0 && tax.welfareExpense > 0) {
    const limit = tax.totalWages * 0.14;
    if (tax.welfareExpense > limit) {
      const excess = tax.welfareExpense - limit;
      risks.push({ code: 'R11', name: '职工福利费超标', level: '高', category: '期间费用',
        description: `福利费${tax.welfareExpense.toFixed(0)}万超标准${limit.toFixed(0)}万`,
        currentValue: `福利费 ${tax.welfareExpense.toFixed(0)}万元`, expectedValue: `<工资×14% = ${limit.toFixed(0)}万元`,
        suggestion: `调增应纳税所得额 ${excess.toFixed(0)}万元`, legalBasis: '《企业所得税法》第四十条',
        taxImpact: excess * 0.25, estimatedDays: 15, confidence: 0.9 });
    }
  }

  // === 规则 R12: 广告宣传费超标 ===
  if (is_.revenue > 0 && tax.advertisement > 0) {
    const limit = is_.revenue * 0.15;
    if (tax.advertisement > limit) {
      const excess = tax.advertisement - limit;
      risks.push({ code: 'R12', name: '广告宣传费超标', level: '中', category: '期间费用',
        description: `广告费${tax.advertisement.toFixed(0)}万超过限额${limit.toFixed(0)}万`,
        currentValue: `广告费 ${tax.advertisement.toFixed(0)}万元`, expectedValue: `<收入×15% = ${limit.toFixed(0)}万元`,
        suggestion: `超标准部分调增应纳税所得额 ${excess.toFixed(0)}万元（可无限期结转）`,
        legalBasis: '《企业所得税法》第四十四条', taxImpact: excess * 0.25, estimatedDays: 15, confidence: 0.85 });
    }
  }

  // === 规则 R20: 小型微利企业优惠 ===
  if (tax.isSmallBenefit) {
    if (tax.taxableIncome > 300) {
      risks.push({ code: 'R20', name: '不符合小型微利企业优惠', level: '高', category: '税金计算',
        description: '应纳税所得额超过300万不符合小微优惠',
        currentValue: `应纳税所得额 ${tax.taxableIncome.toFixed(0)}万元`, expectedValue: '<=300万元',
        suggestion: '按25%标准税率计算', legalBasis: '财税〔2023〕6号',
        taxImpact: tax.taxableIncome * 0.15, estimatedDays: 20, confidence: 0.95 });
    }
    if (bs.assets > COMPLIANCE_RULES.small_micro.conditions.max_assets) {
      risks.push({ code: 'R20', name: '资产总额超出小微优惠范围', level: '高', category: '税金计算',
        description: `资产总额${(bs.assets/10000).toFixed(0)}万超过小微优惠标准`,
        currentValue: `资产总额 ${(bs.assets/10000).toFixed(0)}万元`, expectedValue: '<=5000万元',
        suggestion: '资产总额超标，不能享受小微优惠，需按25%税率计算',
        legalBasis: '财税〔2023〕6号', taxImpact: is_.totalProfit ? is_.totalProfit * 0.15 : 0, estimatedDays: 20, confidence: 0.95 });
    }
  }

  // === 规则 R21: 研发费用 ===
  if (is_.revenue > 1000 && tax.rdExpense === 0) {
    risks.push({ code: 'R21', name: '研发费用为空', level: '低', category: '税金计算',
      description: `营收${is_.revenue.toFixed(0)}万的企业研发费用为0`,
      currentValue: '研发费用 0 万元', expectedValue: '根据实际情况填报',
      suggestion: '核实是否有符合条件的研发支出', legalBasis: '财税〔2023〕7号', confidence: 0.7 });
  } else if (tax.rdExpense > 0) {
    const ratio = tax.isHighTech ? 1.0 : 0.75;
    const additional = tax.rdExpense * ratio;
    const saving = additional * 0.25;
    risks.push({ code: 'R21b', name: '研发费用加计扣除', level: '低', category: '税金计算',
      description: `研发费用${tax.rdExpense.toFixed(0)}万可加计扣除${additional.toFixed(0)}万`,
      currentValue: `研发费用 ${tax.rdExpense.toFixed(0)}万元`, expectedValue: `加计${ratio*100}%`,
      suggestion: `可节省企业所得税约 ${saving.toFixed(0)}万元`, legalBasis: '财税〔2023〕7号',
      taxImpact: -saving, estimatedDays: 10, confidence: 0.95 });
  }

  // === 规则 R23: 预缴所得税不足 ===
  if (tax.taxPayable > 0 && tax.taxPrepaid < tax.taxPayable * 0.9) {
    const shortfall = tax.taxPayable - tax.taxPrepaid;
    risks.push({ code: 'R23', name: '年度预缴所得税不足', level: '中', category: '税金计算',
      description: `已预缴${tax.taxPrepaid.toFixed(0)}万，应纳税${tax.taxPayable.toFixed(0)}万`,
      currentValue: `已预缴 ${tax.taxPrepaid.toFixed(0)}万元`, expectedValue: `>=应纳税额90% = ${(tax.taxPayable*0.9).toFixed(0)}万元`,
      suggestion: `需补缴所得税约 ${shortfall.toFixed(0)}万元`, legalBasis: '《企业所得税法》',
      taxImpact: shortfall, estimatedDays: 10, confidence: 0.9 });
  }

  // === 规则 R50: 关联交易 ===
  if (tax.hasRelatedParty) {
    risks.push({ code: 'R50', name: '关联交易需准备同期资料', level: '高', category: '关联交易',
      description: '企业存在关联交易，需准备关联申报同期资料',
      currentValue: '存在关联交易', expectedValue: '准备完整资料',
      suggestion: '准备关联申报表、同期资料文档（主体文档/本地文档）',
      legalBasis: '税务总局公告2016年第42号', estimatedDays: 60, confidence: 0.95 });
  }

  // === 规则 R60: 资产负债表平衡 ===
  if (bs.assets > 0) {
    const total = (bs.liabilities || 0) + (bs.equity || 0);
    if (Math.abs(bs.assets - total) > bs.assets * 0.01) {
      risks.push({ code: 'R60', name: '资产负债表不平衡', level: '高', category: '合规性',
        description: `资产总计与负债+权益合计差异超过1%`,
        currentValue: `资产=${bs.assets.toFixed(0)}万，负债+权益=${total.toFixed(0)}万`,
        expectedValue: '资产 = 负债 + 权益', suggestion: '检查报表数据', legalBasis: '会计恒等式', confidence: 0.95 });
    }
  }

  // === 合规性检查 ===
  if (bs.assets > 0 && bs.liabilities !== undefined) {
    const calcEquity = bs.assets - bs.liabilities;
    if (Math.abs(calcEquity - bs.equity) > 1) {
      issues.push({ id: 'LOGIC-001', category: 'logic_error', severity: 'error',
        title: '资产负债表不平', description: `资产(${bs.assets}) ≠ 负债(${bs.liabilities}) + 权益(${bs.equity})`,
        amount: Math.abs(calcEquity - bs.equity), requiredEvidence: [],
        suggestion: '检查资产负债表各科目是否正确', canProceed: false });
    }
  }
  if (is_.revenue > 0 && Math.abs(is_.revenue - is_.cost - is_.grossProfit) > 1) {
    issues.push({ id: 'LOGIC-002', category: 'logic_error', severity: 'error',
      title: '毛利计算错误', description: `营业收入 - 营业成本 ≠ 毛利`,
      amount: Math.abs(is_.revenue - is_.cost - is_.grossProfit), requiredEvidence: [],
      suggestion: '重新计算毛利', canProceed: false });
  }
  if (bs.cash < 0) {
    issues.push({ id: 'HUMAN-001', category: 'human_error', severity: 'error',
      title: '货币资金为负数', description: '货币资金不能为负数',
      amount: Math.abs(bs.cash), requiredEvidence: [], suggestion: '检查银行存款科目', canProceed: false });
  }
  if (is_.revenue > 0 && is_.cost > 0 && is_.cost / is_.revenue > 0.9) {
    issues.push({ id: 'HUMAN-002', category: 'human_error', severity: 'warning',
      title: '成本收入比异常偏高', description: `成本收入比 ${((is_.cost/is_.revenue)*100).toFixed(1)}% 偏高，可能成本多记`,
      requiredEvidence: ['成本计算依据', '原材料入库单'], suggestion: '复核成本核算', canProceed: true });
  }
  if (is_.totalProfit > 100000 && is_.netProfit > 0) {
    const burden = (is_.totalProfit - is_.netProfit) / is_.totalProfit;
    if (burden < 0.1) {
      issues.push({ id: 'RISK-001', category: 'risk_warning', severity: 'warning',
        title: '税负率异常偏低', description: `税负率 ${(burden*100).toFixed(1)}% 明显偏低`,
        requiredEvidence: [], suggestion: '复核各项收入和成本真实性', canProceed: true });
    }
  }
  if (is_.revenue > 1000000 && is_.grossProfit > 0) {
    const gm = is_.grossProfit / is_.revenue;
    if (gm < 0.1) {
      issues.push({ id: 'RISK-002', category: 'risk_warning', severity: 'warning',
        title: '毛利率异常偏低', description: `毛利率 ${(gm*100).toFixed(1)}% 明显偏低，可能虚增成本`,
        requiredEvidence: ['成本计算依据', '原材料入库单', '产品出库单'], suggestion: '检查成本核算', canProceed: true });
    }
  }

  const errCount = issues.filter(i => i.severity === 'error').length;
  const warnCount = issues.filter(i => i.severity === 'warning').length;
  const highCount = risks.filter(r => r.level === '高').length;
  const score = Math.max(0, 100 - errCount * 20 - warnCount * 10 - highCount * 5);
  const riskLevel: RiskLevel = score >= 80 ? '低' : score >= 60 ? '中' : '高';

  return {
    score,
    riskLevel,
    summary: { total: risks.length + issues.length, errors: errCount, warnings: warnCount, info: 0 },
    risks,
    issues,
    evidenceScore: { totalScore: 100, passed: true, categories: [] }
  };
}
