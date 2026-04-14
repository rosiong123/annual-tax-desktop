/**
 * 小微优惠引擎 - Small & Micro Enterprise Benefits Engine
 * 核心功能：判断小微优惠资格、计算节税金额
 */

/** 小微优惠资格条件 */
export interface SLPEQualification {
  eligible: boolean;
  conditions: {
    taxableIncome: { value: number; threshold: number; passed: boolean };
    employeeCount: { value: number; threshold: number; passed: boolean };
    totalAssets: { value: number; threshold: number; passed: boolean };
  };
  taxRate: number;
  taxSavings: number;
  reason: string;
}

/** 小微优惠标准（2023-2027年） */
export const SLPE_STANDARDS = {
  taxableIncomeThreshold: 3000000, // 300万元
  employeeCountThreshold: 300,     // 300人
  totalAssetsThreshold: 50000000,   // 5000万元
  taxRateStandard: 0.25,
  taxRateSLPE: {
    tier1: { maxIncome: 1000000, rate: 0.05 },      // ≤100万：5%
    tier2: { maxIncome: 3000000, rate: 0.10 },      // 100-300万：10%
    above: { rate: 0.25 },                          // >300万：25%
  },
};

/**
 * 判断小微优惠资格
 */
export function checkSLPEQualification(
  taxableIncome: number,
  employeeCount: number,
  totalAssets: number
): SLPEQualification {
  const { taxableIncomeThreshold, employeeCountThreshold, totalAssetsThreshold } = SLPE_STANDARDS;

  const incomePassed = taxableIncome <= taxableIncomeThreshold;
  const employeePassed = employeeCount <= employeeCountThreshold;
  const assetsPassed = totalAssets <= totalAssetsThreshold;
  const eligible = incomePassed && employeePassed && assetsPassed;

  let taxRate = SLPE_STANDARDS.taxRateStandard;
  let tier = '';
  
  if (taxableIncome <= 1000000) {
    taxRate = 0.05;
    tier = '≤100万减按25%×20%=5%';
  } else if (taxableIncome <= 3000000) {
    taxRate = 0.10;
    tier = '100-300万减按50%×20%=10%';
  }

  const standardTax = taxableIncome * SLPE_STANDARDS.taxRateStandard;
  const actualTax = taxableIncome * taxRate;
  const savings = standardTax - actualTax;

  let reason = eligible
    ? `符合小型微利企业标准（${tier}）`
    : `不符合小型微利企业标准：${[
        !incomePassed && `应纳税所得额${(taxableIncome / 10000).toFixed(0)}万>${taxableIncomeThreshold / 10000}万`,
        !employeePassed && `从业人数${employeeCount}>${employeeCountThreshold}人`,
        !assetsPassed && `资产总额${(totalAssets / 10000).toFixed(0)}万>${totalAssetsThreshold / 10000}万`,
      ].filter(Boolean).join('，')}`;

  return {
    eligible,
    conditions: {
      taxableIncome: { value: taxableIncome, threshold: taxableIncomeThreshold, passed: incomePassed },
      employeeCount: { value: employeeCount, threshold: employeeCountThreshold, passed: employeePassed },
      totalAssets: { value: totalAssets, threshold: totalAssetsThreshold, passed: assetsPassed },
    },
    taxRate,
    taxSavings: eligible ? savings : 0,
    reason,
  };
}

/**
 * 计算小微优惠税额
 */
export function calcSLPETax(taxableIncome: number, qualification: SLPEQualification): {
  taxPayable: number;
  effectiveRate: number;
  savings: number;
} {
  if (!qualification.eligible) {
    return {
      taxPayable: taxableIncome * SLPE_STANDARDS.taxRateStandard,
      effectiveRate: SLPE_STANDARDS.taxRateStandard,
      savings: 0,
    };
  }

  const taxPayable = taxableIncome * qualification.taxRate;
  const effectiveRate = qualification.taxRate;
  
  return {
    taxPayable,
    effectiveRate,
    savings: qualification.taxSavings,
  };
}

export default { checkSLPEQualification, calcSLPETax, SLPE_STANDARDS };
