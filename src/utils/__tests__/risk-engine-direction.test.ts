import { describe, it, expect } from 'vitest';
import { runRiskScan, calcIndicators, RISK_RULES } from '../risk-engine';

describe('Risk Engine 风险引擎 - 方向逻辑测试', () => {
  describe('RISK_RULES 方向属性完整性', () => {
    it('所有规则应有direction属性', () => {
      RISK_RULES.forEach((rule) => {
        expect(rule.direction).toBeDefined();
        expect(['lower', 'higher', 'bool']).toContain(rule.direction);
      });
    });

    it('lower方向规则warning应大于danger', () => {
      const lowerRules = RISK_RULES.filter(r => r.direction === 'lower');
      expect(lowerRules.length).toBeGreaterThan(0);

      // 利润率偏低规则：<15% warning, <10% danger
      // warning threshold 更高因为是"偏低"到某个程度才危险
      const marginRule = lowerRules.find(r => r.id === 'RISK-001');
      expect(marginRule).toBeDefined();
      const warning = marginRule!.warning as number;
      const danger = marginRule!.danger as number;
      expect(warning).toBeGreaterThan(danger);
    });

    it('higher方向规则warning应小于danger', () => {
      const higherRules = RISK_RULES.filter(r => r.direction === 'higher');
      expect(higherRules.length).toBeGreaterThan(0);

      // 费用率异常偏高
      const expenseRule = higherRules.find(r => r.id === 'RISK-004');
      expect(expenseRule).toBeDefined();
      const warning = expenseRule!.warning as number;
      const danger = expenseRule!.danger as number;
      expect(warning).toBeLessThan(danger);
    });

    it('bool方向规则应检查存在性', () => {
      const boolRules = RISK_RULES.filter(r => r.direction === 'bool');
      expect(boolRules.length).toBeGreaterThan(0);

      // 罚款支出规则
      const penaltyRule = boolRules.find(r => r.id === 'RISK-028');
      expect(penaltyRule).toBeDefined();
    });
  });

  describe('runRiskScan 方向逻辑验证', () => {
    const baseData = {
      revenue: 10000000, cost: 6000000, grossProfit: 4000000,
      operatingExpense: 2000000, netProfit: 500000, totalExpense: 3000000,
      wages: 500000, taxPayable: 125000, totalProfit: 500000,
      operatingProfit: 300000,
    };

    it('利润率正常时不应触发RISK-001', () => {
      const result = runRiskScan(baseData);
      const risk001 = result.risks.find(r => r.id === 'RISK-001');
      expect(risk001).toBeUndefined();
    });

    it('利润率偏低时应触发RISK-001', () => {
      const result = runRiskScan({
        ...baseData,
        grossProfit: 800000, // 8% 毛利率
      });
      const risk001 = result.risks.find(r => r.id === 'RISK-001');
      expect(risk001).toBeDefined();
    });

    it('费用率>90%时应触发高风险', () => {
      const result = runRiskScan({
        ...baseData,
        totalExpense: 9500000, // 95% 费用率
      });
      const risk004 = result.risks.find(r => r.id === 'RISK-004');
      expect(risk004).toBeDefined();
      expect(risk004!.level).toBe('high');
    });

    it('有罚款支出时应触发RISK-028', () => {
      const result = runRiskScan({
        ...baseData,
        penaltyExpense: 50000,
      });
      const risk028 = result.risks.find(r => r.id === 'RISK-028');
      expect(risk028).toBeDefined();
      expect(risk028!.level).toBe('high');
    });

    it('无罚款支出时不应触发RISK-028', () => {
      const result = runRiskScan({
        ...baseData,
        penaltyExpense: 0,
      });
      const risk028 = result.risks.find(r => r.id === 'RISK-028');
      expect(risk028).toBeUndefined();
    });

    it('招待费>1%时应触发警告', () => {
      const result = runRiskScan({
        ...baseData,
        entertainment: 150000, // 150000/10000000 = 1.5%
      });
      const risk006 = result.risks.find(r => r.id === 'RISK-006');
      expect(risk006).toBeDefined();
    });
  });

  describe('calcIndicators 指标计算', () => {
    it('应正确计算毛利率', () => {
      const result = calcIndicators({
        revenue: 1000000, cost: 600000, grossProfit: 400000,
        operatingExpense: 0, netProfit: 100000, totalExpense: 300000,
        wages: 100000, taxPayable: 25000, totalProfit: 100000,
      });
      expect(result.grossMargin).toBe(0.4);
    });

    it('revenue为0时应避免除零错误', () => {
      const result = calcIndicators({
        revenue: 0, cost: 0, grossProfit: 0,
        operatingExpense: 0, netProfit: 0, totalExpense: 0,
        wages: 0, taxPayable: 0, totalProfit: 0,
      });
      expect(result.grossMargin).toBe(0);
      expect(result.netMargin).toBe(0);
    });
  });
});
