import { describe, it, expect } from 'vitest';
import { runRiskScan, calcIndicators, RISK_RULES } from '../risk-engine';

describe('风险扫描引擎 (Risk Engine)', () => {
  describe('RISK_RULES 规则库完整性', () => {
    it('应有至少25条风险规则', () => {
      expect(RISK_RULES.length).toBeGreaterThanOrEqual(25);
    });

    it('每条规则应包含必要字段', () => {
      RISK_RULES.forEach((rule) => {
        expect(rule.id).toBeDefined();
        expect(rule.name).toBeDefined();
        expect(rule.category).toBeDefined();
        expect(rule.indicator).toBeDefined();
        expect(rule.threshold).toBeDefined();
        expect(rule.direction).toBeDefined();
        expect(['lower', 'higher', 'bool']).toContain(rule.direction);
      });
    });

    it('规则ID应唯一', () => {
      const ids = RISK_RULES.map((r) => r.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe('calcIndicators 计算指标', () => {
    it('应正确计算毛利率', () => {
      const result = calcIndicators({
        revenue: 1000000, cost: 600000, grossProfit: 400000,
        operatingExpense: 0, netProfit: 100000, totalExpense: 300000,
        wages: 100000, taxPayable: 25000, totalProfit: 100000,
      });
      expect(result.grossMargin).toBe(0.4);
    });

    it('应正确计算费用率', () => {
      const result = calcIndicators({
        revenue: 1000000, cost: 0, grossProfit: 0,
        operatingExpense: 0, netProfit: 0, totalExpense: 800000,
        wages: 100000, taxPayable: 0, totalProfit: 100000,
      });
      expect(result.expenseRatio).toBe(0.8);
    });

    it('应正确计算招待费比率', () => {
      const result = calcIndicators({
        revenue: 1000000, cost: 0, grossProfit: 0,
        operatingExpense: 0, netProfit: 0, totalExpense: 10000,
        wages: 0, taxPayable: 0, totalProfit: 100000,
        entertainment: 6000, // 6000/1000000 = 0.6%
      });
      expect(result.entertainmentRatio).toBe(0.006);
    });

    it('revenue为0时应返回0，避免除零错误', () => {
      const result = calcIndicators({
        revenue: 0, cost: 0, grossProfit: 0,
        operatingExpense: 0, netProfit: 0, totalExpense: 0,
        wages: 0, taxPayable: 0, totalProfit: 0,
      });
      expect(result.grossMargin).toBe(0);
      expect(result.netMargin).toBe(0);
      expect(result.expenseRatio).toBe(1);
    });
  });

  describe('runRiskScan 风险扫描', () => {
    const baseData = {
      revenue: 10000000, cost: 6000000, grossProfit: 4000000,
      operatingExpense: 2000000, netProfit: 500000, totalExpense: 3000000,
      wages: 500000, taxPayable: 125000, totalProfit: 500000,
      operatingProfit: 300000,
    };

    it('正常数据应返回低风险', () => {
      const result = runRiskScan(baseData);
      expect(result.level).toBe('low');
      expect(result.score).toBeGreaterThan(70);
    });

    it('费用率过高(>90%)应触发高风险', () => {
      const result = runRiskScan({
        ...baseData,
        totalExpense: 9500000, // 95% 费用率
      });
      const highExpenseRisk = result.risks.find(r => r.id === 'RISK-004');
      expect(highExpenseRisk).toBeDefined();
      expect(highExpenseRisk!.level).toBe('high');
    });

    it('招待费超限额(>1%)应触发警告', () => {
      const result = runRiskScan({
        ...baseData,
        entertainment: 150000, // 150000/10000000 = 1.5%
      });
      const entertainmentRisk = result.risks.find(r => r.id === 'RISK-006');
      expect(entertainmentRisk).toBeDefined();
      expect(entertainmentRisk!.level).toBe('high');
    });

    it('利润率偏低(<10%)应触发警告', () => {
      const result = runRiskScan({
        ...baseData,
        revenue: 10000000,
        grossProfit: 800000, // 8% 毛利率
        netProfit: 100000,
      });
      const marginRisk = result.risks.find(r => r.id === 'RISK-001');
      expect(marginRisk).toBeDefined();
    });

    it('小微临界点风险：应纳税所得额接近300万', () => {
      const result = runRiskScan({
        ...baseData,
        taxableIncome: 2800000, // 接近300万
        totalProfit: 2800000,
        taxPayable: 70000,
      });
      const slpeRisk = result.risks.find(r => r.id === 'RISK-015');
      expect(slpeRisk).toBeDefined();
      expect(slpeRisk!.level).toBe('medium');
    });

    it('多风险并发时应正确计算综合得分', () => {
      const result = runRiskScan({
        ...baseData,
        totalExpense: 9500000, // 高费用
        entertainment: 150000,   // 高招待费
        grossProfit: 800000,    // 低利润
      });
      expect(result.risks.length).toBeGreaterThan(2);
      expect(result.score).toBeLessThan(70);
    });

    it('bool类型规则：有罚款支出应触发风险', () => {
      const result = runRiskScan({
        ...baseData,
        penaltyExpense: 50000,
      });
      const penaltyRisk = result.risks.find(r => r.id === 'RISK-028');
      expect(penaltyRisk).toBeDefined();
      expect(penaltyRisk!.level).toBe('high');
    });

    it('捐赠超标(>12%)应触发风险', () => {
      const result = runRiskScan({
        ...baseData,
        donationExpense: 80000, // 80000/500000 = 16%
      });
      const donationRisk = result.risks.find(r => r.id === 'RISK-029');
      expect(donationRisk).toBeDefined();
    });
  });

  describe('风险评分计算', () => {
    it('低风险数据应返回较高分', () => {
      const safeData = {
        revenue: 10000000, cost: 5000000, grossProfit: 5000000,
        operatingExpense: 1000000, netProfit: 2000000, totalExpense: 2000000,
        wages: 200000, taxPayable: 500000, totalProfit: 2000000,
        operatingProfit: 1500000,
        entertainment: 30000, advertisement: 100000,
      };
      const result = runRiskScan(safeData);
      // 低风险时得分应 > 60
      expect(result.score).toBeGreaterThan(60);
    });

    it('高风险数量多时得分应大幅下降', () => {
      const highRiskData = {
        revenue: 10000000, cost: 9500000, grossProfit: 500000,
        operatingExpense: 4000000, netProfit: -500000, totalExpense: 9000000,
        wages: 4000000, taxPayable: 1000, totalProfit: -500000,
        operatingProfit: -1000000,
        entertainment: 200000, advertisement: 3000000,
        penaltyExpense: 50000, donationExpense: 100000,
      };
      const result = runRiskScan(highRiskData);
      expect(result.score).toBeLessThan(50);
    });
  });
});
