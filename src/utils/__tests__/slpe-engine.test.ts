import { describe, it, expect } from 'vitest';
import { checkSLPEQualification, calcSLPETax, SLPE_STANDARDS } from '../slpe-engine';

describe('小微优惠引擎 (SLPE Engine)', () => {
  describe('checkSLPEQualification', () => {
    it('应税所得额≤100万：符合小微条件，税率5%', () => {
      const result = checkSLPEQualification(800000, 100, 30000000);

      expect(result.eligible).toBe(true);
      expect(result.taxRate).toBe(0.05);
      expect(result.conditions.taxableIncome.passed).toBe(true);
      expect(result.conditions.employeeCount.passed).toBe(true);
      expect(result.conditions.totalAssets.passed).toBe(true);
      expect(result.reason).toContain('符合小型微利企业标准');
    });

    it('应税所得额100-300万：符合小微条件，税率10%', () => {
      const result = checkSLPEQualification(2000000, 200, 40000000);

      expect(result.eligible).toBe(true);
      expect(result.taxRate).toBe(0.10);
    });

    it('应税所得额>300万：不符合小微条件', () => {
      const result = checkSLPEQualification(3500000, 100, 30000000);

      expect(result.eligible).toBe(false);
      expect(result.taxRate).toBe(0.25); // 标准税率
      expect(result.conditions.taxableIncome.passed).toBe(false);
      expect(result.reason).toContain('不符合');
    });

    it('从业人数>300人：不符合小微条件', () => {
      const result = checkSLPEQualification(1000000, 350, 30000000);

      expect(result.eligible).toBe(false);
      expect(result.conditions.employeeCount.passed).toBe(false);
    });

    it('资产总额>5000万：不符合小微条件', () => {
      const result = checkSLPEQualification(1000000, 100, 60000000);

      expect(result.eligible).toBe(false);
      expect(result.conditions.totalAssets.passed).toBe(false);
    });

    it('所有条件都超过：不符合小微条件', () => {
      const result = checkSLPEQualification(5000000, 500, 80000000);

      expect(result.eligible).toBe(false);
      expect(result.taxSavings).toBe(0);
    });
  });

  describe('calcSLPETax', () => {
    it('不符合小微条件：按标准税率25%计算', () => {
      const qualification = checkSLPEQualification(5000000, 500, 80000000);
      const result = calcSLPETax(5000000, qualification);

      expect(result.taxPayable).toBe(5000000 * 0.25);
      expect(result.effectiveRate).toBe(0.25);
      expect(result.savings).toBe(0);
    });

    it('符合小微条件（≤100万）：节税金额正确计算', () => {
      const qualification = checkSLPEQualification(800000, 100, 30000000);
      const result = calcSLPETax(800000, qualification);

      const standardTax = 800000 * 0.25; // 200000
      const actualTax = 800000 * 0.05;   // 40000
      const expectedSavings = standardTax - actualTax;

      expect(result.taxPayable).toBe(800000 * 0.05);
      expect(result.effectiveRate).toBe(0.05);
      expect(result.savings).toBe(expectedSavings);
    });

    it('符合小微条件（100-300万）：节税金额正确计算', () => {
      const qualification = checkSLPEQualification(2000000, 200, 40000000);
      const result = calcSLPETax(2000000, qualification);

      const standardTax = 2000000 * 0.25; // 500000
      const actualTax = 2000000 * 0.10;   // 200000
      const expectedSavings = standardTax - actualTax;

      expect(result.taxPayable).toBe(2000000 * 0.10);
      expect(result.savings).toBe(expectedSavings);
    });
  });

  describe('SLPE_STANDARDS 常量', () => {
    it('阈值常量正确', () => {
      expect(SLPE_STANDARDS.taxableIncomeThreshold).toBe(3000000);
      expect(SLPE_STANDARDS.employeeCountThreshold).toBe(300);
      expect(SLPE_STANDARDS.totalAssetsThreshold).toBe(50000000);
    });

    it('税率档位正确', () => {
      expect(SLPE_STANDARDS.taxRateSLPE.tier1.maxIncome).toBe(1000000);
      expect(SLPE_STANDARDS.taxRateSLPE.tier1.rate).toBe(0.05);
      expect(SLPE_STANDARDS.taxRateSLPE.tier2.maxIncome).toBe(3000000);
      expect(SLPE_STANDARDS.taxRateSLPE.tier2.rate).toBe(0.10);
    });
  });
});
