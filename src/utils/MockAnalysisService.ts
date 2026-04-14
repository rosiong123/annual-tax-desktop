/**
 * MockAnalysisService - 根据导入的91个文件生成真实财务指标
 * 真实数据驱动：所有分析指标均从 ImportedData 计算得出
 */

import type { ImportedData } from '../components/ExcelImporter';

// 税务风险类型
export interface TaxRiskItem {
  id: string;
  title: string;
  severity: 'high' | 'medium' | 'low';
  amount: number;           // 涉及金额
  description: string;
  relatedFileId?: string;   // 关联的原始文件ID
  adjustmentEntry?: string; // 调账分录
  legalBasis?: string;      // 法规依据
}

// 资产重分类问题
export interface AssetReclassItem {
  id: string;
  accountName: string;
  currentValue: number;
  suggestedValue: number;
  difference: number;
  reason: string;
  relatedFileId?: string;
}

// 损益调整项
export interface IncomeAdjustmentItem {
  id: string;
  type: 'increase' | 'decrease';
  accountName: string;
  amount: number;
  description: string;
  calculationBasis: string;
  relatedFileId?: string;
}

// 重构建议
export interface ReconstructionSuggestion {
  id: string;
  category: 'asset_reclass' | 'tax_adjustment' | 'cost_optimization' | 'expense_optimization';
  title: string;
  priority: 'high' | 'medium' | 'low';
  estimatedImpact: number;  // 预计影响金额
  description: string;
  calculationLogic: string; // 计算逻辑
  adjustmentEntries: Array<{ debit: string; credit: string; amount: number }>;
  relatedFileId?: string;
}

// 完整分析结果
export interface AnalysisMetrics {
  // 基础统计
  totalFiles: number;
  totalRecords: number;
  balanceSheet: { assets: number; liabilities: number; equity: number };
  incomeStatement: { revenue: number; cost: number; grossProfit: number; netProfit: number };

  // 资产重分类
  assetReclassItems: AssetReclassItem[];

  // 税务风险点
  taxRiskItems: TaxRiskItem[];

  // 损益调整项
  incomeAdjustmentItems: IncomeAdjustmentItem[];

  // 重构建议
  suggestions: ReconstructionSuggestion[];

  // 图表数据
  chartData: {
    // 资产负债分布（饼图）
    assetDistribution: Array<{ name: string; value: number; color: string }>;
    // 利润结构（柱状图）
    profitStructure: Array<{ name: string; value: number }>;
    // 风险分布（饼图）
    riskDistribution: Array<{ name: string; value: number; severity: 'high' | 'medium' | 'low' }>;
    // 调整项趋势
    adjustmentTrend: Array<{ name: string; increase: number; decrease: number }>;
  };
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

/**
 * 核心分析函数：输入导入数据，输出完整分析指标
 */
export function generateAnalysisMetrics(importedFiles: ImportedFileWithData[]): AnalysisMetrics {
  // 聚合所有文件的 ImportedData
  const mergedData = mergeImportedData(importedFiles.map(f => f.data));

  const bs = mergedData.balanceSheet;
  const is_ = mergedData.incomeStatement;
  const subjects = mergedData.subjectBalances;
  const invoices = mergedData.invoices;

  // === 资产重分类分析 ===
  const assetReclassItems = analyzeAssetReclassification(bs, subjects, invoices);

  // === 税务风险分析 ===
  const taxRiskItems = analyzeTaxRisks(bs, is_, subjects, invoices);

  // === 损益调整项 ===
  const incomeAdjustmentItems = analyzeIncomeAdjustments(is_, subjects, bs);

  // === 重构建议 ===
  const suggestions = generateSuggestions(assetReclassItems, taxRiskItems, incomeAdjustmentItems, bs, is_, subjects);

  // === 图表数据 ===
  const chartData = buildChartData(assetReclassItems, taxRiskItems, incomeAdjustmentItems, bs, is_);

  return {
    totalFiles: importedFiles.length,
    totalRecords: importedFiles.reduce((sum, f) => sum + (f.data.subjectBalances?.length || 0) + (f.data.invoices?.length || 0), 0),
    balanceSheet: { assets: bs.assets || 0, liabilities: bs.liabilities || 0, equity: bs.ownerEquity || 0 },
    incomeStatement: {
      revenue: is_.revenue || 0,
      cost: is_.costOfSales || 0,
      grossProfit: is_.grossProfit || 0,
      netProfit: is_.netProfit || 0,
    },
    assetReclassItems,
    taxRiskItems,
    incomeAdjustmentItems,
    suggestions,
    chartData,
  };
}

export interface ImportedFileWithData {
  id: string;
  name: string;
  data: ImportedData;
}

function mergeImportedData(dataList: ImportedData[]): ImportedData {
  const result: ImportedData = {
    balanceSheet: {} as ImportedData['balanceSheet'],
    incomeStatement: {} as ImportedData['incomeStatement'],
    subjectBalances: [],
    invoices: [],
  };

  for (const data of dataList) {
    if (!result.balanceSheet.assets && data.balanceSheet?.assets) {
      result.balanceSheet = data.balanceSheet;
    }
    if (!result.incomeStatement.revenue && data.incomeStatement?.revenue) {
      result.incomeStatement = data.incomeStatement;
    }
    if (data.subjectBalances?.length) {
      result.subjectBalances.push(...data.subjectBalances);
    }
    if (data.invoices?.length) {
      result.invoices.push(...data.invoices);
    }
  }

  // 去重
  if (result.subjectBalances.length) {
    const seen = new Set<string>();
    result.subjectBalances = result.subjectBalances.filter(s => {
      if (seen.has(s.code)) return false;
      seen.add(s.code);
      return true;
    });
  }

  return result;
}

// === 资产重分类分析 ===
function analyzeAssetReclassification(
  bs: ImportedData['balanceSheet'],
  subjects: ImportedData['subjectBalances'],
  invoices: ImportedData['invoices']
): AssetReclassItem[] {
  const items: AssetReclassItem[] = [];

  // 1. 应收账款账龄分析（高账龄应收 → 疑似坏账）
  const arSubjects = subjects.filter(s => s.code.startsWith('1122') || s.name.includes('应收账款'));
  for (const s of arSubjects) {
    if (s.closingBalance > 500000 && s.creditBalance > s.debitBalance * 0.3) {
      items.push({
        id: generateId(),
        accountName: s.name,
        currentValue: s.closingBalance,
        suggestedValue: s.closingBalance * 0.7,
        difference: s.closingBalance * 0.3,
        reason: '应收账款账龄较长，建议计提坏账准备',
      });
    }
  }

  // 2. 存货周转异常（库存过大 → 跌价准备）
  const invSubjects = subjects.filter(s => s.code.startsWith('1405') || s.name.includes('存货'));
  for (const s of invSubjects) {
    if (s.closingBalance > bs.assets * 0.2 && bs.assets > 0) {
      items.push({
        id: generateId(),
        accountName: s.name,
        currentValue: s.closingBalance,
        suggestedValue: s.closingBalance * 0.85,
        difference: s.closingBalance * 0.15,
        reason: '存货占比过高，建议计提存货跌价准备',
      });
    }
  }

  // 3. 固定资产折旧政策核查
  const faSubjects = subjects.filter(s => s.code.startsWith('1601') || s.name.includes('固定资产'));
  for (const s of faSubjects) {
    if (s.closingBalance > 1000000) {
      items.push({
        id: generateId(),
        accountName: s.name,
        currentValue: s.closingBalance,
        suggestedValue: s.closingBalance * 0.9,
        difference: s.closingBalance * 0.1,
        reason: '固定资产原值较大，建议复核折旧年限是否合规',
      });
    }
  }

  return items;
}

// === 税务风险分析 ===
function analyzeTaxRisks(
  bs: ImportedData['balanceSheet'],
  is_: ImportedData['incomeStatement'],
  subjects: ImportedData['subjectBalances'],
  invoices: ImportedData['invoices']
): TaxRiskItem[] {
  const items: TaxRiskItem[] = [];

  // 1. 毛利率异常
  if (is_.revenue > 0) {
    const grossMargin = is_.grossProfit / is_.revenue;
    if (grossMargin < 0.1) {
      items.push({
        id: generateId(),
        title: '毛利率异常偏低',
        severity: 'high',
        amount: is_.revenue,
        description: `毛利率仅 ${(grossMargin * 100).toFixed(1)}%，低于行业正常水平`,
        adjustmentEntry: '借：主营业务成本 贷：存货（调增利润）',
        legalBasis: '《企业所得税法》第八条',
      });
    } else if (grossMargin < 0.15) {
      items.push({
        id: generateId(),
        title: '毛利率偏低',
        severity: 'medium',
        amount: is_.revenue,
        description: `毛利率 ${(grossMargin * 100).toFixed(1)}%，建议复核成本归集完整性`,
      });
    }
  }

  // 2. 费用率异常（管理费用/营业收入）
  if (is_.revenue > 0) {
    const mgmtRatio = (is_.managementExpense || 0) / is_.revenue;
    if (mgmtRatio > 0.2) {
      items.push({
        id: generateId(),
        title: '管理费用率偏高',
        severity: 'medium',
        amount: is_.managementExpense || 0,
        description: `管理费用占营业收入 ${(mgmtRatio * 100).toFixed(1)}%，建议复核费用明细`,
      });
    }
  }

  // 3. 发票合规风险
  const voidedInvoices = invoices.filter(i => i.status === 'voided' || i.status === 'invalid');
  if (voidedInvoices.length > 0) {
    const voidedAmount = voidedInvoices.reduce((sum, i) => sum + i.amount, 0);
    items.push({
      id: generateId(),
      title: '存在作废/失控发票',
      severity: 'high',
      amount: voidedAmount,
      description: `发现 ${voidedInvoices.length} 张作废或失控发票，税额 ${voidedInvoices.reduce((s, i) => s + i.taxAmount, 0).toLocaleString()} 元不得抵扣`,
      adjustmentEntry: '借：应交税费-应交增值税（进项税额转出） 贷：应交税费-应交增值税（待抵扣）',
      legalBasis: '《增值税暂行条例》第九条、《国家税务总局公告2012年第33号》',
    });
  }

  // 4. 进项发票金额异常
  const specialInvoices = invoices.filter(i => i.type === 'special');
  if (specialInvoices.length === 0 && invoices.length > 10) {
    items.push({
      id: generateId(),
      title: '缺少专用发票',
      severity: 'high',
      amount: 0,
      description: `导入了 ${invoices.length} 张发票但无专用发票，可能存在进项抵扣不足问题`,
    });
  }

  // 5. 关联交易风险（若有）
  const relatedPartyAccounts = subjects.filter(s =>
    s.name.includes('关联方') || s.name.includes('关联往来')
  );
  if (relatedPartyAccounts.length > 0) {
    const total = relatedPartyAccounts.reduce((sum, s) => sum + Math.abs(s.closingBalance), 0);
    if (total > 0) {
      items.push({
        id: generateId(),
        title: '存在关联交易',
        severity: 'medium',
        amount: total,
        description: `关联方往来余额 ${total.toLocaleString()} 元，需准备转让定价文档`,
        legalBasis: '《企业所得税法》第四十一条、征管法细则第五十二条',
      });
    }
  }

  // 6. 成本倒算风险
  if (is_.costOfSales > is_.revenue) {
    items.push({
      id: generateId(),
      title: '营业成本大于营业收入',
      severity: 'high',
      amount: is_.costOfSales - is_.revenue,
      description: '成本大于收入，疑似虚列成本或收入跨期问题',
      adjustmentEntry: '借：主营业务收入 贷：以前年度损益调整',
      legalBasis: '《企业所得税法》第四条',
    });
  }

  return items;
}

// === 损益调整项 ===
function analyzeIncomeAdjustments(
  is_: ImportedData['incomeStatement'],
  subjects: ImportedData['subjectBalances'],
  bs: ImportedData['balanceSheet']
): IncomeAdjustmentItem[] {
  const items: IncomeAdjustmentItem[] = [];

  // 1. 业务招待费超限额（实际发生额60% vs 营业收入5‰）
  const entSubjects = subjects.filter(s => s.name.includes('业务招待费'));
  for (const s of entSubjects) {
    const amount = Math.abs(s.debitBalance || 0);
    const revenue = is_.revenue || bs.assets * 0.5; // fallback
    const limit60pct = amount * 0.6;
    const limit5permil = revenue * 0.005;
    const deductible = Math.min(limit60pct, limit5permil);
    if (deductible < amount * 0.5) {
      items.push({
        id: generateId(),
        type: 'increase',
        accountName: '业务招待费',
        amount: amount - deductible,
        description: `招待费 ${amount.toLocaleString()} 元，可扣除限额 ${deductible.toLocaleString()} 元，需调增 ${(amount - deductible).toLocaleString()} 元`,
        calculationBasis: `限额计算：min(發生額×60%, 营业收入×5‰) = min(${limit60pct.toFixed(0)}, ${limit5permil.toFixed(0)}) = ${deductible.toFixed(0)}`,
      });
    }
  }

  // 2. 广告费超限额（营业收入15%）
  const adSubjects = subjects.filter(s => s.name.includes('广告费') || s.name.includes('业务宣传费'));
  for (const s of adSubjects) {
    const amount = Math.abs(s.debitBalance || 0);
    const limit = (is_.revenue || 0) * 0.15;
    if (amount > limit && limit > 0) {
      items.push({
        id: generateId(),
        type: 'increase',
        accountName: '广告宣传费',
        amount: amount - limit,
        description: `广告费超限额，需调增 ${(amount - limit).toLocaleString()} 元`,
        calculationBasis: `限额：营业收入×15% = ${(is_.revenue || 0).toLocaleString()} × 15% = ${limit.toFixed(0)} 元`,
      });
    }
  }

  // 3. 职工福利费超限额（工资总额14%）
  const wfSubjects = subjects.filter(s => s.name.includes('福利费') || s.name.includes('职工福利'));
  const wageSubjects = subjects.filter(s => s.name.includes('工资') || s.name.includes('薪酬'));
  const totalWages = wageSubjects.reduce((sum, s) => sum + Math.abs(s.debitBalance || 0), 0);
  for (const s of wfSubjects) {
    const amount = Math.abs(s.debitBalance || 0);
    const limit = totalWages * 0.14;
    if (amount > limit && limit > 0) {
      items.push({
        id: generateId(),
        type: 'increase',
        accountName: '职工福利费',
        amount: amount - limit,
        description: `福利费超限额，需调增 ${(amount - limit).toLocaleString()} 元`,
        calculationBasis: `限额：工资总额×14% = ${totalWages.toLocaleString()} × 14% = ${limit.toFixed(0)} 元`,
      });
    }
  }

  // 4. 利息支出（金融企业利息支出不可扣除等）
  const intSubjects = subjects.filter(s => s.name.includes('利息支出'));
  for (const s of intSubjects) {
    const amount = Math.abs(s.debitBalance || 0);
    if (amount > 0 && bs.liabilities > 0) {
      items.push({
        id: generateId(),
        type: 'decrease',
        accountName: '利息支出',
        amount: amount * 0.5,
        description: `利息支出 ${amount.toLocaleString()} 元，关联方借款利息需进行纳税调整`,
        calculationBasis: '按照金融企业同期同类贷款利率计算的利息可扣除',
      });
    }
  }

  return items;
}

// === 重构建议 ===
function generateSuggestions(
  assetItems: AssetReclassItem[],
  riskItems: TaxRiskItem[],
  adjustmentItems: IncomeAdjustmentItem[],
  bs: ImportedData['balanceSheet'],
  is_: ImportedData['incomeStatement'],
  subjects: ImportedData['subjectBalances']
): ReconstructionSuggestion[] {
  const suggestions: ReconstructionSuggestion[] = [];

  // 1. 小微优惠建议
  if ((bs.assets || 0) <= 50000000 && (is_.totalProfit || 0) <= 3000000) {
    suggestions.push({
      id: generateId(),
      category: 'tax_adjustment',
      title: '小微企业税收优惠',
      priority: 'high',
      estimatedImpact: (is_.totalProfit || 0) * 0.1,
      description: '符合小微企业条件，可享受5%实际税负率优惠（应纳税所得额100万以内）',
      calculationLogic: '年应纳税所得额≤300万，资产总额≤5000万，从业人数≤300人，实际税负率可降至5%',
      adjustmentEntries: [
        { debit: '所得税费用', credit: '应交税费-应交所得税', amount: (is_.totalProfit || 0) * 0.05 },
      ],
    });
  }

  // 2. 研发费用加计扣除建议
  const rdSubjects = subjects.filter(s => s.name.includes('研发'));
  const rdExpense = rdSubjects.reduce((sum, s) => sum + Math.abs(s.debitBalance || 0), 0);
  if (rdExpense > 0) {
    suggestions.push({
      id: generateId(),
      category: 'cost_optimization',
      title: '研发费用加计扣除',
      priority: 'high',
      estimatedImpact: rdExpense * 0.75 * 0.25,
      description: `研发费用 ${rdExpense.toLocaleString()} 元，可加计扣除75%，节税约 ${(rdExpense * 0.75 * 0.25).toLocaleString()} 元`,
      calculationLogic: `加计扣除金额 = 研发费用 × 75% = ${rdExpense.toLocaleString()} × 75% = ${(rdExpense * 0.75).toLocaleString()} 元\n节税 = 加计扣除金额 × 税率25% = ${(rdExpense * 0.75 * 0.25).toLocaleString()} 元`,
      adjustmentEntries: [
        { debit: '研发费用', credit: '无形资产/管理费用', amount: rdExpense * 0.75 },
      ],
    });
  }

  // 3. 坏账准备计提
  for (const item of assetItems.filter(i => i.id.startsWith('ar'))) {
    suggestions.push({
      id: generateId(),
      category: 'asset_reclass',
      title: '坏账准备计提',
      priority: 'medium',
      estimatedImpact: item.difference * 0.25,
      description: `建议对 ${item.accountName} 计提坏账准备 ${item.difference.toLocaleString()} 元`,
      calculationLogic: `计提金额 = 账面余额 × 计提比例 = ${item.currentValue.toLocaleString()} × 30% = ${item.difference.toLocaleString()} 元`,
      adjustmentEntries: [
        { debit: '资产减值损失', credit: '坏账准备', amount: item.difference },
      ],
    });
  }

  // 4. 招待费调整建议
  for (const item of adjustmentItems.filter(i => i.accountName === '业务招待费')) {
    suggestions.push({
      id: generateId(),
      category: 'expense_optimization',
      title: '业务招待费纳税调整',
      priority: 'medium',
      estimatedImpact: item.amount * 0.25,
      description: item.description,
      calculationLogic: item.calculationBasis,
      adjustmentEntries: [
        { debit: '营业外支出', credit: '管理费用-业务招待费', amount: item.amount },
      ],
    });
  }

  return suggestions;
}

// === 图表数据构建 ===
function buildChartData(
  assetItems: AssetReclassItem[],
  riskItems: TaxRiskItem[],
  adjustmentItems: IncomeAdjustmentItem[],
  bs: ImportedData['balanceSheet'],
  is_: ImportedData['incomeStatement']
) {
  const assets = bs.assets || 1;
  const income = is_.revenue || 0;

  return {
    assetDistribution: [
      { name: '货币资金', value: bs.cash || 0, color: '#3B82F6' },
      { name: '应收账款', value: bs.accountsReceivable || 0, color: '#8B5CF6' },
      { name: '存货', value: bs.inventory || 0, color: '#F59E0B' },
      { name: '固定资产', value: bs.fixedAssets || 0, color: '#10B981' },
      { name: '其他资产', value: Math.max(0, assets - (bs.cash || 0) - (bs.accountsReceivable || 0) - (bs.inventory || 0) - (bs.fixedAssets || 0)), color: '#6B7280' },
    ].filter(i => i.value > 0),

    profitStructure: [
      { name: '营业收入', value: income },
      { name: '营业成本', value: is_.costOfSales || 0 },
      { name: '毛利', value: is_.grossProfit || Math.max(0, income - (is_.costOfSales || 0)) },
      { name: '营业利润', value: is_.operatingProfit || 0 },
      { name: '净利润', value: is_.netProfit || 0 },
    ],

    riskDistribution: [
      { name: '高风险', value: riskItems.filter(r => r.severity === 'high').length, severity: 'high' as const },
      { name: '中风险', value: riskItems.filter(r => r.severity === 'medium').length, severity: 'medium' as const },
      { name: '低风险', value: riskItems.filter(r => r.severity === 'low').length, severity: 'low' as const },
    ],

    adjustmentTrend: adjustmentItems.map(item => ({
      name: item.accountName,
      increase: item.type === 'increase' ? item.amount : 0,
      decrease: item.type === 'decrease' ? item.amount : 0,
    })),
  };
}
