/**
 * 风险扫描引擎 - Risk Scanner Engine
 * 核心功能：多维度风险检测，生成风险评分
 */
export type RiskLevel = 'high' | 'medium' | 'low';

export interface RiskItem {
  id: string;
  name: string;
  description: string;
  level: RiskLevel;
  category: 'profitability' | 'expense' | 'compliance' | 'ratio' | 'structure';
  indicator: string;
  threshold: string;
  currentValue: number;
  suggestion: string;
}

export interface RiskScanResult {
  score: number;
  level: RiskLevel;
  risks: RiskItem[];
  indicators: { name: string; value: number; status: 'normal' | 'warning' | 'danger' }[];
}

/** 风险规则方向：lower=越低越危险，higher=越高越危险，bool=有则危险 */
export type RiskDirection = 'lower' | 'higher' | 'bool';

/** 风险规则 - 扩展到30+规则 */
export const RISK_RULES: Array<{
  id: string; name: string; category: 'profitability' | 'expense' | 'compliance' | 'ratio' | 'structure';
  indicator: string; threshold: string;
  warning: number | boolean; danger: number | boolean;
  direction: RiskDirection;
}> = [
  // ========== 盈利能力类（越低越危险）==========
  { id: 'RISK-001', name: '利润率异常偏低', category: 'profitability', indicator: 'grossMargin', threshold: '< 15%', warning: 0.15, danger: 0.1, direction: 'lower' },
  { id: 'RISK-002', name: '净利率异常', category: 'profitability', indicator: 'netMargin', threshold: '< 5%', warning: 0.05, danger: 0.02, direction: 'lower' },
  { id: 'RISK-003', name: '营业利润率为负', category: 'profitability', indicator: 'operatingProfitRate', threshold: '< 0', warning: 0, danger: 0, direction: 'lower' },

  // ========== 费用类（越高越危险）==========
  { id: 'RISK-004', name: '费用率异常偏高', category: 'expense', indicator: 'expenseRatio', threshold: '> 80%', warning: 0.8, danger: 0.9, direction: 'higher' },
  { id: 'RISK-005', name: '人工成本占比偏高', category: 'expense', indicator: 'laborCostRatio', threshold: '> 35%', warning: 0.35, danger: 0.4, direction: 'higher' },
  { id: 'RISK-006', name: '业务招待费超限额', category: 'expense', indicator: 'entertainmentRatio', threshold: '> 5‰', warning: 0.005, danger: 0.01, direction: 'higher' },
  { id: 'RISK-007', name: '广告费超限额', category: 'expense', indicator: 'advertisementRatio', threshold: '> 15%', warning: 0.15, danger: 0.3, direction: 'higher' },
  { id: 'RISK-008', name: '福利费超限额', category: 'expense', indicator: 'welfareRatio', threshold: '> 14%', warning: 0.14, danger: 0.2, direction: 'higher' },

  // ========== 成本类（越高越危险）==========
  { id: 'RISK-009', name: '成本收入比偏高', category: 'ratio', indicator: 'costRevenueRatio', threshold: '> 80%', warning: 0.8, danger: 0.85, direction: 'higher' },
  { id: 'RISK-010', name: '期末存货异常偏高', category: 'ratio', indicator: 'inventoryRevenueRatio', threshold: '> 25%', warning: 0.25, danger: 0.3, direction: 'higher' },
  { id: 'RISK-011', name: '发出商品金额过大', category: 'ratio', indicator: 'shippedGoodsRatio', threshold: '> 15%', warning: 0.15, danger: 0.2, direction: 'higher' },

  // ========== 税务合规类 ==========
  { id: 'RISK-012', name: '税负率异常偏低', category: 'compliance', indicator: 'taxBurden', threshold: '< 15%', warning: 0.15, danger: 0.1, direction: 'lower' },
  { id: 'RISK-013', name: '零申报或低申报', category: 'compliance', indicator: 'isLowDeclaration', threshold: '连续3年亏损', warning: true, danger: true, direction: 'bool' },
  { id: 'RISK-014', name: '进项税额转出异常', category: 'compliance', indicator: 'inputTaxTransferRatio', threshold: '> 3%', warning: 0.03, danger: 0.05, direction: 'higher' },
  { id: 'RISK-015', name: '小微优惠临界点风险', category: 'compliance', indicator: 'slpeThresholdProximity', threshold: '接近300万', warning: 0.9, danger: 0.95, direction: 'higher' },
  { id: 'RISK-016', name: '研发费用归集不规范', category: 'compliance', indicator: 'rdExpenseRatio', threshold: '研发费用占比<1%', warning: 0.01, danger: 0.02, direction: 'lower' },

  // ========== 关联交易（越高越危险）==========
  { id: 'RISK-017', name: '关联交易占比过高', category: 'compliance', indicator: 'relatedPartyRatio', threshold: '> 25%', warning: 0.25, danger: 0.3, direction: 'higher' },

  // ========== 收入确认类 ==========
  { id: 'RISK-019', name: '收入结构单一', category: 'structure', indicator: 'revenueConcentration', threshold: '> 70%', warning: 0.7, danger: 0.8, direction: 'higher' },

  // ========== 结构性风险（越高越危险）==========
  { id: 'RISK-020', name: '客户集中度高', category: 'structure', indicator: 'customerConcentration', threshold: '> 40%', warning: 0.4, danger: 0.5, direction: 'higher' },
  { id: 'RISK-021', name: '供应商集中度高', category: 'structure', indicator: 'supplierConcentration', threshold: '> 40%', warning: 0.4, danger: 0.5, direction: 'higher' },
  { id: 'RISK-022', name: '应收账款账龄异常', category: 'structure', indicator: 'arAgingRatio', threshold: '> 15%', warning: 0.15, danger: 0.2, direction: 'higher' },

  // ========== 资产负债类 ==========
  { id: 'RISK-023', name: '固定资产折旧异常', category: 'ratio', indicator: 'fixedAssetDepreciationRatio', threshold: '折旧率异常', warning: 0.05, danger: 0.03, direction: 'higher' },
  { id: 'RISK-024', name: '无形资产摊销异常', category: 'ratio', indicator: 'intangibleAssetRatio', threshold: '摊销年限异常', warning: 0.1, danger: 0.05, direction: 'higher' },
  { id: 'RISK-025', name: '长期待摊费用过高', category: 'ratio', indicator: 'deferredExpenseRatio', threshold: '> 8%', warning: 0.08, danger: 0.1, direction: 'higher' },

  // ========== 票据合规类 ==========
  { id: 'RISK-026', name: '发票三流不合一', category: 'compliance', indicator: 'invoiceTripleMatch', threshold: '存在异常', warning: true, danger: true, direction: 'bool' },
  { id: 'RISK-027', name: '增值税发票缺失', category: 'compliance', indicator: 'invoiceMissingRatio', threshold: '> 3%', warning: 0.03, danger: 0.05, direction: 'higher' },

  // ========== 特别调整类（bool：有则危险）==========
  { id: 'RISK-028', name: '罚款支出不得扣除', category: 'compliance', indicator: 'penaltyRatio', threshold: '存在罚款支出', warning: true, danger: true, direction: 'bool' },
  { id: 'RISK-029', name: '捐赠支出超标', category: 'compliance', indicator: 'donationRatio', threshold: '> 12%', warning: 0.12, danger: 0.15, direction: 'higher' },
  { id: 'RISK-030', name: '赞助支出不得扣除', category: 'compliance', indicator: 'sponsorshipRatio', threshold: '存在赞助支出', warning: true, danger: true, direction: 'bool' },
];

const SUGGESTIONS: Record<string, string> = {
  'RISK-001': '检查成本核算是否准确，确认收入确认时点',
  'RISK-002': '复核各项收入和成本，关注关联交易定价',
  'RISK-003': '分析营业利润来源，确认业务真实性',
  'RISK-004': '分析费用结构，识别异常支出项目',
  'RISK-005': '评估人员配置效率，考虑灵活用工方式',
  'RISK-006': '业务招待费需按60%与收入5‰双限孰低扣除',
  'RISK-007': '广告费需在营业收入15%（特殊30%）限额内扣除',
  'RISK-008': '职工福利费需在工资总额14%限额内扣除',
  'RISK-009': '优化供应链管理，控制采购成本',
  'RISK-010': '检查存货结构，确认是否积压或核算错误',
  'RISK-011': '核查发出商品，确认是否已实现销售',
  'RISK-012': '复核税金计算，确认优惠是否应享尽享',
  'RISK-013': '建立长期亏损台账，准备合理说明材料',
  'RISK-014': '进项税额转出需对照税法规定核实',
  'RISK-015': '应纳税所得额接近300万时，务必精确计算临界点',
  'RISK-016': '研发费用需单独建账，归集范围需符合规定',
  'RISK-017': '准备同期资料，准备定价依据',
  // RISK-018: 无对应规则（已删除，避免 SUGGESTIONS 偏移）
  'RISK-019': '检查收入结构，确认是否单一客户依赖',
  'RISK-020': '开拓新客户，降低收入集中度',
  'RISK-021': '发展新客户，降低客户依赖',
  'RISK-022': '发展新供应商，降低供应商依赖',
  'RISK-023': '核查应收账款账龄，计提坏账准备',
  'RISK-024': '固定资产折旧年限需符合税法规定',
  'RISK-025': '无形资产摊销年限需符合税法规定',
  'RISK-026': '长期待摊费用需按规定年限摊销',
  'RISK-027': '发票流、资金流、货物流需一致（三流合一）',
  'RISK-028': '缺失发票需及时补开或换开',
  'RISK-029': '罚款支出不得在企业所得税前扣除',
  'RISK-030': '公益性捐赠需通过规定渠道，超标不得扣除',
  'RISK-031': '赞助支出不得在企业所得税前扣除',
  'RISK-032': '如有关联交易，定价需符合独立交易原则',
};

export function calcIndicators(data: {
  revenue: number;
  cost: number;
  grossProfit: number;
  operatingExpense: number;
  netProfit: number;
  totalExpense: number;
  wages: number;
  taxPayable: number;
  totalProfit: number;
  operatingProfit?: number;
  relatedPartyRevenue?: number;
  topCustomerRevenue?: number;
  topSupplierCost?: number;
  inventory?: number;
  shippedGoods?: number;
  inputTaxTransfer?: number;
  rdExpense?: number;
  entertainment?: number;
  advertisement?: number;
  welfareExpense?: number;
  taxableIncome?: number;
  penaltyExpense?: number;
  donationExpense?: number;
  sponsorshipExpense?: number;
  fixedAssets?: number;
  depreciation?: number;
  intangibleAssets?: number;
  amortization?: number;
  deferredExpense?: number;
  accountsReceivable?: number;
  longTermAr?: number;
  missingInvoiceRatio?: number;
}): Record<string, number> {
  const {
    revenue, cost, grossProfit, netProfit, totalExpense, wages,
    taxPayable, totalProfit, operatingProfit = 0, relatedPartyRevenue = 0,
    topCustomerRevenue = 0, topSupplierCost = 0, inventory = 0,
    shippedGoods = 0, inputTaxTransfer = 0, rdExpense = 0,
    entertainment = 0, advertisement = 0, welfareExpense = 0,
    taxableIncome = 0, penaltyExpense = 0, donationExpense = 0,
    sponsorshipExpense = 0, fixedAssets = 0, depreciation = 0,
    intangibleAssets = 0, amortization = 0, deferredExpense = 0,
    accountsReceivable = 0, longTermAr = 0, missingInvoiceRatio = 0,
  } = data;

  return {
    // 盈利指标
    grossMargin: revenue > 0 ? grossProfit / revenue : 0,
    netMargin: revenue > 0 ? netProfit / revenue : 0,
    operatingProfitRate: revenue > 0 ? operatingProfit / revenue : 0,

    // 费用指标
    expenseRatio: revenue > 0 ? totalExpense / revenue : 1,
    laborCostRatio: totalExpense > 0 ? wages / totalExpense : 0,
    entertainmentRatio: revenue > 0 ? entertainment / revenue : 0,
    advertisementRatio: revenue > 0 ? advertisement / revenue : 0,
    welfareRatio: wages > 0 ? welfareExpense / wages : 0,

    // 成本指标
    costRevenueRatio: revenue > 0 ? cost / revenue : 1,
    inventoryRevenueRatio: revenue > 0 ? inventory / revenue : 0,
    shippedGoodsRatio: revenue > 0 ? shippedGoods / revenue : 0,

    // 税务合规指标
    taxBurden: totalProfit > 0 ? taxPayable / totalProfit : 0,
    inputTaxTransferRatio: taxPayable > 0 ? inputTaxTransfer / taxPayable : 0,
    slpeThresholdProximity: taxableIncome > 0 ? taxableIncome / 3000000 : 0,
    rdExpenseRatio: revenue > 0 ? rdExpense / revenue : 0,

    // 关联交易
    relatedPartyRatio: revenue > 0 ? relatedPartyRevenue / revenue : 0,

    // 结构性指标
    revenueConcentration: revenue > 0 ? topCustomerRevenue / revenue : 0,
    customerConcentration: revenue > 0 ? topCustomerRevenue / revenue : 0,
    supplierConcentration: cost > 0 ? topSupplierCost / cost : 0,
    arAgingRatio: accountsReceivable > 0 ? longTermAr / accountsReceivable : 0,

    // 资产指标
    fixedAssetDepreciationRatio: fixedAssets > 0 ? depreciation / fixedAssets : 0,
    intangibleAssetRatio: intangibleAssets > 0 ? amortization / intangibleAssets : 0,
    deferredExpenseRatio: totalProfit > 0 ? deferredExpense / totalProfit : 0,

    // 票据合规
    invoiceTripleMatch: 0, // 定性指标，需人工判断
    invoiceMissingRatio: missingInvoiceRatio,

    // 特别调整项
    penaltyRatio: totalProfit > 0 ? penaltyExpense / totalProfit : 0,
    donationRatio: totalProfit > 0 ? donationExpense / totalProfit : 0,
    sponsorshipRatio: totalProfit > 0 ? sponsorshipExpense / totalProfit : 0,
  };
}

export function runRiskScan(
  financialData: {
    revenue: number; cost: number; grossProfit: number; operatingExpense: number;
    netProfit: number; totalExpense: number; wages: number; taxPayable: number;
    totalProfit: number; operatingProfit?: number;
    relatedPartyRevenue?: number; topCustomerRevenue?: number; topSupplierCost?: number;
    consecutiveLossYears?: number; inventory?: number; shippedGoods?: number;
    inputTaxTransfer?: number; rdExpense?: number;
    entertainment?: number; advertisement?: number; welfareExpense?: number;
    taxableIncome?: number; penaltyExpense?: number; donationExpense?: number;
    sponsorshipExpense?: number; fixedAssets?: number; depreciation?: number;
    intangibleAssets?: number; amortization?: number; deferredExpense?: number;
    accountsReceivable?: number; longTermAr?: number; missingInvoiceRatio?: number;
  },
  rules = RISK_RULES
): RiskScanResult {
  const indicators = calcIndicators({
    revenue: financialData.revenue,
    cost: financialData.cost,
    grossProfit: financialData.grossProfit,
    operatingExpense: financialData.operatingExpense,
    netProfit: financialData.netProfit,
    totalExpense: financialData.totalExpense,
    wages: financialData.wages,
    taxPayable: financialData.taxPayable,
    totalProfit: financialData.totalProfit,
    operatingProfit: financialData.operatingProfit,
    relatedPartyRevenue: financialData.relatedPartyRevenue,
    topCustomerRevenue: financialData.topCustomerRevenue,
    topSupplierCost: financialData.topSupplierCost,
    inventory: financialData.inventory,
    shippedGoods: financialData.shippedGoods,
    inputTaxTransfer: financialData.inputTaxTransfer,
    rdExpense: financialData.rdExpense,
    entertainment: financialData.entertainment,
    advertisement: financialData.advertisement,
    welfareExpense: financialData.welfareExpense,
    taxableIncome: financialData.taxableIncome,
    penaltyExpense: financialData.penaltyExpense,
    donationExpense: financialData.donationExpense,
    sponsorshipExpense: financialData.sponsorshipExpense,
    fixedAssets: financialData.fixedAssets,
    depreciation: financialData.depreciation,
    intangibleAssets: financialData.intangibleAssets,
    amortization: financialData.amortization,
    deferredExpense: financialData.deferredExpense,
    accountsReceivable: financialData.accountsReceivable,
    longTermAr: financialData.longTermAr,
    missingInvoiceRatio: financialData.missingInvoiceRatio,
  });
  const risks: RiskItem[] = [];
  const isLowDeclaration = (financialData.consecutiveLossYears || 0) >= 3;

  for (const rule of rules) {
    let currentValue = indicators[rule.indicator] || 0;
    let isWarning = false, isDanger = false;

    // 特殊 bool 指标处理（当前只有 isLowDeclaration）
    if (rule.indicator === 'isLowDeclaration') {
      currentValue = isLowDeclaration ? 1 : 0;
      isWarning = isDanger = currentValue > 0;
    } else if (rule.direction === 'bool') {
      // bool 规则：有该指标值（>0）才触发
      isWarning = currentValue > 0 && !!rule.warning;
      isDanger = currentValue > 0 && !!rule.danger;
    } else if (rule.direction === 'higher') {
      // 越高越危险：当前值超过阈值
      isWarning = typeof rule.warning === 'number' ? currentValue > rule.warning : false;
      isDanger = typeof rule.danger === 'number' ? currentValue > rule.danger : false;
    } else {
      // 越低越危险：当前值低于阈值
      isWarning = typeof rule.warning === 'number' ? currentValue < rule.warning : false;
      isDanger = typeof rule.danger === 'number' ? currentValue < rule.danger : false;
    }

    if (isWarning || isDanger) {
      risks.push({
        id: rule.id, name: rule.name, level: isDanger ? 'high' : 'medium',
        description: `${rule.name}：当前${(currentValue * 100).toFixed(1)}%，阈值${rule.threshold}`,
        category: rule.category, indicator: rule.indicator, threshold: rule.threshold,
        currentValue, suggestion: SUGGESTIONS[rule.id] || '建议进一步分析',
      });
    }
  }

  const highRisks = risks.filter(r => r.level === 'high').length;
  const mediumRisks = risks.filter(r => r.level === 'medium').length;
  const score = Math.max(0, 100 - highRisks * 25 - mediumRisks * 10);
  let level: RiskLevel = score < 30 ? 'high' : score < 60 ? 'medium' : 'low';

  return {
    score, level, risks,
    indicators: Object.entries(indicators).map(([name, value]) => ({
      name, value, status: value < 0.1 ? 'danger' : value < 0.2 ? 'warning' : 'normal',
    })),
  };
}

export default runRiskScan;
