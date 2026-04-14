/**
 * 纳税调整引擎 - Tax Adjustment Engine
 * 核心功能：自动识别需调整项目，计算调整金额
 */
export type AdjustmentType = 'disallowed' | 'limited' | 'temporary' | 'normal';

export interface AdjustmentRule {
  id: string;
  account: string;
  type: AdjustmentType;
  limitRatio?: number;
  legalBasis: string;
  description: string;
}

export interface AdjustmentItem {
  ruleId: string;
  account: string;
  originalAmount: number;
  adjustmentAmount: number;
  adjustmentType: AdjustmentType;
  deductibleAmount: number;
  legalBasis: string;
  note: string;
}

export interface AdjustmentResult {
  originalProfit: number;
  totalIncrease: number;
  totalDecrease: number;
  taxableIncome: number;
  items: AdjustmentItem[];
}

/** 默认规则库 */
export const DEFAULT_ADJUSTMENT_RULES: AdjustmentRule[] = [
  // 业务招待费：发生额60%与收入5‰熟低
  { id: 'ADJ-001', account: '业务招待费', type: 'limited', limitRatio: 0.6, legalBasis: '《企业所得税法实施条例》第43条', description: '发生额60%，但不得超过收入5‰' },
  // 广告费：不超过收入15%
  { id: 'ADJ-002', account: '广告费', type: 'limited', limitRatio: 0.15, legalBasis: '《企业所得税法实施条例》第44条', description: '不超过收入15%的部分准予扣除' },
  // 职工福利费：不超过工资14%
  { id: 'ADJ-003', account: '职工福利费', type: 'limited', limitRatio: 0.14, legalBasis: '《企业所得税法实施条例》第40条', description: '不超过工资薪金总额14%的部分准予扣除' },
  // 工会经费：不超过工资2%
  { id: 'ADJ-004', account: '工会经费', type: 'limited', limitRatio: 0.02, legalBasis: '《企业所得税法实施条例》第41条', description: '不超过工资薪金总额2%的部分准予扣除' },
  // 职工教育经费：不超过工资8%
  { id: 'ADJ-005', account: '职工教育经费', type: 'limited', limitRatio: 0.08, legalBasis: '《企业所得税法实施条例》第42条', description: '不超过工资薪金总额8%的部分准予扣除' },
  // 罚款支出：不得扣除
  { id: 'ADJ-006', account: '罚款支出', type: 'disallowed', legalBasis: '《企业所得税法》第10条', description: '税收滞纳金、罚金、罚款和被没收财物的损失不得扣除' },
  // 滞纳金：不得扣除
  { id: 'ADJ-007', account: '滞纳金', type: 'disallowed', legalBasis: '《企业所得税法》第10条', description: '税收滞纳金不得扣除' },
  // 赞助支出：不得扣除
  { id: 'ADJ-008', account: '赞助支出', type: 'disallowed', legalBasis: '《企业所得税法》第10条', description: '赞助支出不得扣除' },
];

/**
 * 匹配科目规则
 */
export function matchRule(accountName: string, rules: AdjustmentRule[]): AdjustmentRule | null {
  const normalized = accountName.trim();
  for (const rule of rules) {
    if (normalized.includes(rule.account) || rule.account.includes(normalized)) {
      return rule;
    }
  }
  return null;
}

/**
 * 计算业务招待费调整（特殊逻辑：60%与5‰熟低）
 */
export function calcEntertainmentAdjustment(expense: number, revenue: number): { deductible: number; adjustment: number } {
  // 使用 Math.round 消除浮点乘法误差（如 100000 * 0.6 = 60000.00000000007）
  const ratio60 = Math.round(expense * 0.6 * 100) / 100;
  const ratio5permille = Math.round(revenue * 0.005 * 100) / 100;
  const deductible = Math.min(ratio60, ratio5permille);
  const adjustment = Math.round((expense - deductible) * 100) / 100;
  return { deductible, adjustment };
}

/**
 * 计算限额类调整
 */
export function calcLimitedAdjustment(expense: number, baseAmount: number, limitRatio: number): { deductible: number; adjustment: number } {
  // 使用 Math.round 消除浮点乘法误差（如 100000 * 0.14 = 14000.000000000002）
  const limit = Math.round(baseAmount * limitRatio * 100) / 100;
  const deductible = Math.min(expense, limit);
  const adjustment = Math.round((expense - deductible) * 100) / 100;
  return { deductible, adjustment };
}

/**
 * 执行纳税调整
 * @param financialItems 需调整的财务科目列表
 * @param revenue 收入（用于招待费5‰和广告费限额计算）
 * @param wages 工资薪金总额（用于福利费、工会经费、教育经费限额计算）
 * @param originalProfit 会计利润（应纳税所得额的基准，从利润表取数）
 * @param rules 调整规则库
 */
export function runAdjustment(
  financialItems: Array<{ account: string; amount: number }>,
  revenue: number,
  wages: number,
  originalProfit: number,
  rules: AdjustmentRule[] = DEFAULT_ADJUSTMENT_RULES
): AdjustmentResult {
  let totalIncrease = 0;
  let totalDecrease = 0;
  const items: AdjustmentItem[] = [];

  for (const item of financialItems) {
    const rule = matchRule(item.account, rules);
    if (!rule) continue;

    let adjustmentAmount = 0;
    let deductibleAmount = item.amount;
    let note = '';

    if (rule.type === 'disallowed') {
      adjustmentAmount = item.amount;
      deductibleAmount = 0;
      note = '不得扣除，全额调增';
    } else if (rule.type === 'limited') {
      if (item.account.includes('业务招待费')) {
        const result = calcEntertainmentAdjustment(item.amount, revenue);
        adjustmentAmount = result.adjustment;
        deductibleAmount = result.deductible;
        note = `发生额60%=${(Math.round(item.amount * 0.6 * 100) / 100).toFixed(0)}，收入5‰=${(Math.round(revenue * 0.005 * 100) / 100).toFixed(0)}，取孰低值`;
      } else if (item.account.includes('广告')) {
        const result = calcLimitedAdjustment(item.amount, revenue, rule.limitRatio!);
        adjustmentAmount = result.adjustment;
        deductibleAmount = result.deductible;
        note = `限额：收入×${rule.limitRatio} = ${result.deductible.toFixed(0)}`;
      } else if (item.account.includes('福利') || item.account.includes('工会') || item.account.includes('教育')) {
        const result = calcLimitedAdjustment(item.amount, wages, rule.limitRatio!);
        adjustmentAmount = result.adjustment;
        deductibleAmount = result.deductible;
        note = `限额：工资×${rule.limitRatio} = ${result.deductible.toFixed(0)}`;
      }
    }

    if (adjustmentAmount > 0) {
      totalIncrease += adjustmentAmount;
      items.push({
        ruleId: rule.id,
        account: item.account,
        originalAmount: item.amount,
        adjustmentAmount,
        adjustmentType: rule.type,
        deductibleAmount,
        legalBasis: rule.legalBasis,
        note,
      });
    }
  }

  return {
    originalProfit,
    totalIncrease,
    totalDecrease,
    taxableIncome: originalProfit + totalIncrease - totalDecrease,
    items,
  };
}

export default runAdjustment;
