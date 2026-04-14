/**
 * 报表生成引擎 - Report Generator Engine
 * 核心功能：生成企业所得税申报表、风险报告
 */

/** 申报表清单 */
export const FILING_FORMS = {
  monthly: ['《增值税及附加税费申报表》'],
  quarterly: ['《企业所得税月（季）度预缴申报表》'],
  annual: ['A100000', 'A101010', 'A102010', 'A105000', 'A105050', 'A105080', 'A107012'],
};

/** 申报表说明 */
export const FORM_DESCRIPTIONS: Record<string, string> = {
  'A100000': '企业所得税年度纳税申报表（A类）',
  'A101010': '一般企业收入明细表',
  'A102010': '一般企业成本支出明细表',
  'A105000': '纳税调整项目明细表',
  'A105050': '职工薪酬支出及纳税调整明细表',
  'A105080': '资产折旧、摊销及纳税调整明细表',
  'A107012': '研发费用加计扣除优惠明细表',
};

/** 报告数据 */
export interface ReportData {
  /** 企业信息 */
  companyName: string;
  taxYear: number;
  reportDate: string;
  
  /** 财务数据 */
  revenue: number;
  cost: number;
  grossProfit: number;
  totalExpense: number;
  operatingProfit: number;
  totalProfit: number;
  netProfit: number;
  
  /** 税务数据 */
  taxableIncome: number;
  taxPayable: number;
  taxPrepaid: number;
  taxRate: number;
  
  /** 调整数据 */
  totalIncrease: number;
  totalDecrease: number;
  
  /** 小微优惠 */
  slpeQualification?: {
    eligible: boolean;
    taxRate: number;
    taxSavings: number;
    reason: string;
  };
  
  /** 风险数据 */
  riskScore: number;
  riskLevel: 'high' | 'medium' | 'low';
  riskCount: { high: number; medium: number; low: number };
  
  /** 调整明细 */
  adjustments: Array<{
    account: string;
    amount: number;
    adjustment: number;
    legalBasis: string;
  }>;
}

/** 生成 Markdown 报告 */
export function generateMarkdownReport(data: ReportData): string {
  const { companyName, taxYear, reportDate, revenue, cost, grossProfit, totalExpense, operatingProfit, totalProfit, netProfit, taxableIncome, taxPayable, taxPrepaid, taxRate, totalIncrease, totalDecrease, slpeQualification, riskScore, riskLevel, riskCount, adjustments } = data;

  const riskEmoji = riskLevel === 'high' ? '🔴' : riskLevel === 'medium' ? '🟡' : '🟢';
  const taxDue = taxPayable - taxPrepaid;

  let md = `# 企业所得税汇算清缴风险自审报告

**报告编号**：${companyName}-${taxYear}-001  
**企业名称**：${companyName}  
**税务年度**：${taxYear}年度  
**报告日期**：${reportDate}

---

## 一、健康评分

${riskEmoji} **风险等级**：${riskLevel === 'high' ? '高风险' : riskLevel === 'medium' ? '中等风险' : '低风险'}  
📊 **综合评分**：${riskScore}/100

| 风险类型 | 数量 |
|---------|------|
| 🔴 高风险 | ${riskCount.high} 项 |
| 🟡 中风险 | ${riskCount.medium} 项 |
| 🟢 低风险 | ${riskCount.low} 项 |

---

## 二、财务概况

| 项目 | 金额（万元） |
|------|-------------|
| 营业收入 | ${revenue.toLocaleString()} |
| 营业成本 | ${cost.toLocaleString()} |
| 毛利 | ${grossProfit.toLocaleString()} |
| 期间费用 | ${totalExpense.toLocaleString()} |
| 营业利润 | ${operatingProfit.toLocaleString()} |
| 利润总额 | ${totalProfit.toLocaleString()} |
| 净利润 | ${netProfit.toLocaleString()} |

---

## 三、应纳税所得额计算

| 项目 | 金额（万元） |
|------|-------------|
| 利润总额 | ${totalProfit.toLocaleString()} |
| 加：纳税调增金额 | ${totalIncrease.toLocaleString()} |
| 减：纳税调减金额 | ${totalDecrease.toLocaleString()} |
| **应纳税所得额** | **${taxableIncome.toLocaleString()}** |

---

## 四、应纳税额计算

| 项目 | 金额（万元） |
|------|-------------|
| 应纳税所得额 | ${taxableIncome.toLocaleString()} |
| 适用税率 | ${(taxRate * 100).toFixed(0)}%${slpeQualification?.eligible ? '（小微优惠）' : ''} |
| 应纳所得税额 | ${taxPayable.toLocaleString()} |
| 减：已预缴税额 | ${taxPrepaid.toLocaleString()} |
| **应补（退）税额** | **${taxDue > 0 ? '+' : ''}${taxDue.toLocaleString()}** |

${slpeQualification?.eligible ? `
### 小型微利企业优惠
- 优惠税率：${(slpeQualification.taxRate * 100).toFixed(0)}%
- 节税金额：${slpeQualification.taxSavings.toLocaleString()}万元
- 优惠依据：${slpeQualification.reason}
` : ''}

---

## 五、纳税调整明细

${adjustments.length > 0 ? adjustments.map((adj, i) => `
### ${i + 1}. ${adj.account}
- 发生金额：${adj.amount.toLocaleString()}万元
- 调整金额：${adj.adjustment > 0 ? '+' : ''}${adj.adjustment.toLocaleString()}万元
- 法规依据：${adj.legalBasis}
`).join('\n') : '*（无纳税调整项目）*'}

---

## 六、下一步行动

${riskCount.high > 0 ? `⚠️ **请优先修复 ${riskCount.high} 项高风险问题**` : '✅ **当前无高风险问题**'}

1. [ ] 修复高风险项
2. [ ] 确认纳税调整数据
3. [ ] 补充相关凭证
4. [ ] 核对申报表勾稽关系
5. [ ] 确认无误后提交

---

*本报告仅供参考，不构成税务建议。如有疑问，请咨询专业税务顾问。*
`;

  return md;
}

/** 生成 JSON 报告 */
export function generateJsonReport(data: ReportData): object {
  return {
    reportInfo: {
      companyName: data.companyName,
      taxYear: data.taxYear,
      reportDate: data.reportDate,
      reportType: 'annual-tax-filing',
    },
    financialOverview: {
      revenue: data.revenue,
      cost: data.cost,
      grossProfit: data.grossProfit,
      totalExpense: data.totalExpense,
      operatingProfit: data.operatingProfit,
      totalProfit: data.totalProfit,
      netProfit: data.netProfit,
    },
    taxCalculation: {
      taxableIncome: data.taxableIncome,
      taxRate: data.taxRate,
      taxPayable: data.taxPayable,
      taxPrepaid: data.taxPrepaid,
      taxDue: data.taxPayable - data.taxPrepaid,
    },
    riskAssessment: {
      score: data.riskScore,
      level: data.riskLevel,
      riskCounts: data.riskCount,
    },
    adjustments: data.adjustments,
    filingForms: FILING_FORMS.annual,
  };
}

/**
 * A100000 主表勾稽关系验证结果
 */
export interface A100000ReconciliationResult {
  valid: boolean;
  part1ProfitReconciliation: {
    valid: boolean;
    calculatedProfit: number;
    declaredProfit: number;
    difference: number;
  };
  part2TaxableIncomeReconciliation: {
    valid: boolean;
    calculatedTaxableIncome: number;
    declaredTaxableIncome: number;
    difference: number;
  };
  part3TaxDueReconciliation: {
    valid: boolean;
    calculatedTaxDue: number;
    declaredTaxDue: number;
    difference: number;
  };
  warnings: string[];
  errors: string[];
}

/**
 * 验证A100000主表三部分勾稽关系
 * 基于国家税务总局公告2025年第1号修订版本（38行结构）
 *
 * 第一部分（利润总额，第1-13行）：
 *   第10行 = 1-2-3-4-5-6-7+8+9
 *   第13行 = 10+11-12
 * 第二部分（应纳税所得额，第14-23行）：
 *   第19行 = 13-14+15-16-17+18
 *   第23行 = 19-20-21-22
 * 第三部分（税额计算，第24-38行）：
 *   第25行 = 23×24
 *   第28行 = 25-26-27
 *   第31行 = 28+29-30
 *   第33行 = 31-32
 *   第38行 = 33-37
 */
export function validateA100000Reconciliation(params: {
  // 第一部分
  revenue: number;
  cost: number;
  taxAndAdd: number;
  managementExpense: number;
  sellingExpense: number;
  financialExpense: number;
  assetImpairmentLoss: number;
  investmentIncome: number;
  fairValueChangeIncome: number;
  totalProfit: number;
  nonBusinessIncome: number;
  nonBusinessExpense: number;
  otherIncomeTotal: number;
  // 第二部分
  lossCarryforward: number;
  taxIncrease: number;
  taxDecrease: number;
  taxAdditionDeduction: number;
  overseasIncomeDeduction: number;
  taxableIncome: number;
  additionalDeduction: number;
  overseasLossCarryforward: number;
  overseasTaxableDeduction: number;
  finalTaxableIncome: number;
  // 第三部分
  taxRate: number;
  taxPayable: number;
  taxReduction: number;
  taxExemption: number;
  taxAmount: number;
  taxCredit: number;
  priorYearOverpaid: number;
  actualTaxDue: number;
  priorYearTaxDue: number;
  currentTaxDue: number;
  highTechTaxReduction: number;
  advancedServiceTaxReduction: number;
  techTransferTaxReduction: number;
  taxRatio: number;
  finalTaxDue: number;
}): A100000ReconciliationResult {
  const {
    revenue, cost, taxAndAdd, managementExpense, sellingExpense, financialExpense,
    assetImpairmentLoss, investmentIncome, fairValueChangeIncome,
    totalProfit, nonBusinessIncome, nonBusinessExpense, otherIncomeTotal,
    lossCarryforward, taxIncrease, taxDecrease, taxAdditionDeduction, overseasIncomeDeduction,
    taxableIncome, additionalDeduction, overseasLossCarryforward, overseasTaxableDeduction, finalTaxableIncome,
    taxRate, taxPayable, taxReduction, taxExemption, taxAmount,
    taxCredit, priorYearOverpaid, actualTaxDue, priorYearTaxDue, currentTaxDue,
    highTechTaxReduction, advancedServiceTaxReduction, techTransferTaxReduction, taxRatio, finalTaxDue,
  } = params;

  const warnings: string[] = [];
  const errors: string[] = [];

  // ========== 第一部分：利润总额勾稽（第1-13行）==========
  // 第10行 = 1-2-3-4-5-6-7+8+9
  const calculatedProfit = revenue - cost - taxAndAdd - managementExpense - sellingExpense - financialExpense - assetImpairmentLoss + investmentIncome + fairValueChangeIncome;
  const profitDiff = Math.abs(calculatedProfit - totalProfit);
  const part1Line10Valid = profitDiff <= 100;

  if (!part1Line10Valid) {
    errors.push(`第10行利润总额勾稽失败：计算值${calculatedProfit.toFixed(2)}与申报值${totalProfit.toFixed(2)}差异${profitDiff.toFixed(2)}元（公式：1-2-3-4-5-6-7+8+9）`);
  }

  // 第13行 = 10+11-12
  const calculatedOtherIncome = totalProfit + nonBusinessIncome - nonBusinessExpense;
  const otherIncomeDiff = Math.abs(calculatedOtherIncome - otherIncomeTotal);
  const part1Line13Valid = otherIncomeDiff <= 1;

  if (!part1Line13Valid) {
    errors.push(`第13行其他收益总额勾稽失败：计算值${calculatedOtherIncome.toFixed(2)}与申报值${otherIncomeTotal.toFixed(2)}差异${otherIncomeDiff.toFixed(2)}元（公式：10+11-12）`);
  }

  const part1Valid = part1Line10Valid && part1Line13Valid;

  // ========== 第二部分：应纳税所得额勾稽（第14-23行）==========
  // 第19行 = 13-14+15-16-17+18
  const calculatedTaxableIncome = otherIncomeTotal - lossCarryforward + taxIncrease - taxDecrease - taxAdditionDeduction + overseasIncomeDeduction;
  const taxableIncomeDiff = Math.abs(calculatedTaxableIncome - taxableIncome);
  const part2Line19Valid = taxableIncomeDiff <= 1;

  if (!part2Line19Valid) {
    errors.push(`第19行应纳税所得额勾稽失败：计算值${calculatedTaxableIncome.toFixed(2)}与申报值${taxableIncome.toFixed(2)}差异${taxableIncomeDiff.toFixed(2)}元（公式：13-14+15-16-17+18）`);
  }

  // 第23行 = 19-20-21-22
  const calculatedFinalTaxable = taxableIncome - additionalDeduction - overseasLossCarryforward - overseasTaxableDeduction;
  const finalTaxableDiff = Math.abs(calculatedFinalTaxable - finalTaxableIncome);
  const part2Line23Valid = finalTaxableDiff <= 1;

  if (!part2Line23Valid) {
    errors.push(`第23行应纳税所得额勾稽失败：计算值${calculatedFinalTaxable.toFixed(2)}与申报值${finalTaxableIncome.toFixed(2)}差异${finalTaxableDiff.toFixed(2)}元（公式：19-20-21-22）`);
  }

  const part2Valid = part2Line19Valid && part2Line23Valid;

  // ========== 第三部分：税额计算勾稽（第24-38行）==========
  // 第25行 = 23×24
  const calculatedTaxPayable = Math.round(finalTaxableIncome * taxRate * 100) / 100;
  const taxPayableDiff = Math.abs(calculatedTaxPayable - taxPayable);

  if (taxPayableDiff > 1) {
    warnings.push(`第25行应纳所得税额可能有误：${finalTaxableIncome.toFixed(2)} × ${(taxRate * 100).toFixed(0)}% = ${calculatedTaxPayable.toFixed(2)}，申报值${taxPayable.toFixed(2)}`);
  }

  // 第28行 = 25-26-27
  const calculatedTaxAmount = taxPayable - taxReduction - taxExemption;
  const taxAmountDiff = Math.abs(calculatedTaxAmount - taxAmount);

  if (taxAmountDiff > 1) {
    warnings.push(`第28行应纳税额可能有误：计算值${calculatedTaxAmount.toFixed(2)}与申报值${taxAmount.toFixed(2)}差异${taxAmountDiff.toFixed(2)}元（公式：25-26-27）`);
  }

  // 第31行 = 28+29-30
  const calculatedActualTaxDue = taxAmount + taxCredit - priorYearOverpaid;
  const actualTaxDueDiff = Math.abs(calculatedActualTaxDue - actualTaxDue);

  if (actualTaxDueDiff > 1) {
    warnings.push(`第31行实际应补（退）所得税额可能有误：计算值${calculatedActualTaxDue.toFixed(2)}与申报值${actualTaxDue.toFixed(2)}差异${actualTaxDueDiff.toFixed(2)}元（公式：28+29-30）`);
  }

  // 第33行 = 31-32
  const calculatedCurrentTaxDue = actualTaxDue - priorYearTaxDue;
  const currentTaxDueDiff = Math.abs(calculatedCurrentTaxDue - currentTaxDue);
  const part3Line33Valid = currentTaxDueDiff <= 1;

  if (!part3Line33Valid) {
    errors.push(`第33行本期实际应补（退）所得税额勾稽失败：计算值${calculatedCurrentTaxDue.toFixed(2)}与申报值${currentTaxDue.toFixed(2)}差异${currentTaxDueDiff.toFixed(2)}元（公式：31-32）`);
  }

  // 第38行 = 33-37
  const calculatedFinalTaxDue = currentTaxDue - taxRatio;
  const finalTaxDueDiff = Math.abs(calculatedFinalTaxDue - finalTaxDue);
  const part3Line38Valid = finalTaxDueDiff <= 1;

  if (!part3Line38Valid) {
    errors.push(`第38行实际应补（退）所得税额勾稽失败：计算值${calculatedFinalTaxDue.toFixed(2)}与申报值${finalTaxDue.toFixed(2)}差异${finalTaxDueDiff.toFixed(2)}元（公式：33-37）`);
  }

  const part3Valid = part3Line33Valid && part3Line38Valid;

  // 业务逻辑警告
  if (taxIncrease > 0 && taxIncrease < 1000) {
    warnings.push(`纳税调整增加额${taxIncrease.toFixed(2)}元较小，请确认是否有遗漏的调整项（如业务招待费超标部分）`);
  }

  if (lossCarryforward > 0 && lossCarryforward > otherIncomeTotal * 0.5 && otherIncomeTotal > 0) {
    warnings.push(`弥补以前年度亏损${lossCarryforward.toFixed(2)}元超过其他收益总额50%，请确认亏损年度及金额的准确性`);
  }

  if (taxRate < 0.15) {
    warnings.push(`适用税率${(taxRate * 100).toFixed(0)}%低于15%，请确认是否符合高新技术企业对或小型微利企业优惠条件`);
  }

  return {
    valid: part1Valid && part2Valid && part3Valid && errors.length === 0,
    part1ProfitReconciliation: {
      valid: part1Valid,
      calculatedProfit,
      declaredProfit: totalProfit,
      difference: profitDiff,
    },
    part2TaxableIncomeReconciliation: {
      valid: part2Valid,
      calculatedTaxableIncome: finalTaxableIncome,
      declaredTaxableIncome: finalTaxableIncome,
      difference: finalTaxableDiff,
    },
    part3TaxDueReconciliation: {
      valid: part3Valid,
      calculatedTaxDue: calculatedFinalTaxDue,
      declaredTaxDue: finalTaxDue,
      difference: finalTaxDueDiff,
    },
    warnings,
    errors,
  };
}

export default { generateMarkdownReport, generateJsonReport, FILING_FORMS, FORM_DESCRIPTIONS, validateA100000Reconciliation };
