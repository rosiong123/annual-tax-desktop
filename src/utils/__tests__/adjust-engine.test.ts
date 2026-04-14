/**
 * 纳税调整引擎 - 真实能力测试
 * 覆盖：业务招待费双限孰低、各类限额计算、不得扣除项、边界值
 */
import { describe, it, expect } from 'vitest';
import {
  calcEntertainmentAdjustment,
  calcLimitedAdjustment,
  matchRule,
  runAdjustment,
  DEFAULT_ADJUSTMENT_RULES,
} from '../adjust-engine';

// =====================================================================
// calcEntertainmentAdjustment —— 业务招待费"双限孰低"核心逻辑
// =====================================================================
describe('calcEntertainmentAdjustment - 业务招待费孰低计算', () => {
  it('当60%金额 < 收入5‰时，取60%（5‰更大）', () => {
    // 发生额=10000, 收入=10000000
    // 60%=6000, 5‰=50000 → 取孰低=6000
    const result = calcEntertainmentAdjustment(10000, 10000000);
    expect(result.deductible).toBe(6000);
    expect(result.adjustment).toBe(4000);
  });

  it('当收入5‰ < 60%金额时，取5‰（60%更大）', () => {
    // 发生额=200000, 收入=1000000
    // 60%=120000, 5‰=5000 → 取孰低=5000
    const result = calcEntertainmentAdjustment(200000, 1000000);
    expect(result.deductible).toBe(5000);
    expect(result.adjustment).toBe(195000);
  });

  it('两值相等时取任一均可，调整为0', () => {
    // 发生额=10000, 收入=12000000
    // 60%=6000, 5‰=6000 → 取孰低=6000
    const result = calcEntertainmentAdjustment(10000, 12000000);
    expect(result.deductible).toBe(6000);
    expect(result.adjustment).toBe(4000);
  });

  it('零发生额时可扣除金额为0，调整金额为0', () => {
    const result = calcEntertainmentAdjustment(0, 5000000);
    expect(result.deductible).toBe(0);
    expect(result.adjustment).toBe(0);
  });

  it('零收入时5‰为0，实际可扣除为0', () => {
    // 发生额100, 收入0 → 5‰=0, 60%=60 → 孰低=0
    const result = calcEntertainmentAdjustment(100, 0);
    expect(result.deductible).toBe(0);
    expect(result.adjustment).toBe(100);
  });

  it('deductible + adjustment 应等于原始发生额', () => {
    const cases = [
      { expense: 50000, revenue: 5000000 },
      { expense: 1000, revenue: 100000 },
      { expense: 999999, revenue: 1 },
    ];
    cases.forEach(({ expense, revenue }) => {
      const result = calcEntertainmentAdjustment(expense, revenue);
      expect(result.deductible + result.adjustment).toBeCloseTo(expense, 5);
    });
  });
});

// =====================================================================
// calcLimitedAdjustment —— 通用限额调整
// =====================================================================
describe('calcLimitedAdjustment - 限额类费用计算', () => {
  it('广告费：发生额在15%限额以内，不调整', () => {
    // 发生额100000, 收入1000000, 限额15% → limit=150000 > expense → 全额扣除
    const result = calcLimitedAdjustment(100000, 1000000, 0.15);
    expect(result.deductible).toBe(100000);
    expect(result.adjustment).toBe(0);
  });

  it('广告费：超过15%限额，按限额扣除', () => {
    // 发生额200000, 收入1000000, 限额15% → limit=150000 < expense → 调增50000
    const result = calcLimitedAdjustment(200000, 1000000, 0.15);
    expect(result.deductible).toBe(150000);
    expect(result.adjustment).toBe(50000);
  });

  it('福利费：发生额在14%限额以内，不调整', () => {
    const result = calcLimitedAdjustment(13000, 100000, 0.14); // 发生额13000 < limit14000
    expect(result.deductible).toBe(13000);
    expect(result.adjustment).toBe(0);
  });

  it('福利费：超过14%限额，按限额扣除', () => {
    const result = calcLimitedAdjustment(20000, 100000, 0.14); // limit=14000
    expect(result.deductible).toBe(14000);
    expect(result.adjustment).toBe(6000);
  });

  it('工会经费：超过工资2%，按限额扣除', () => {
    const result = calcLimitedAdjustment(5000, 100000, 0.02); // limit=2000
    expect(result.deductible).toBe(2000);
    expect(result.adjustment).toBe(3000);
  });

  it('deductible + adjustment 应等于原始发生额', () => {
    const result = calcLimitedAdjustment(75000, 200000, 0.14);
    expect(result.deductible + result.adjustment).toBe(75000);
  });
});

// =====================================================================
// matchRule —— 科目名称模糊匹配
// =====================================================================
describe('matchRule - 科目名称匹配', () => {
  it('精确匹配科目名称', () => {
    const rule = matchRule('业务招待费', DEFAULT_ADJUSTMENT_RULES);
    expect(rule).not.toBeNull();
    expect(rule!.id).toBe('ADJ-001');
  });

  it('部分匹配：科目名称包含规则关键字', () => {
    const rule = matchRule('销售费用-广告费', DEFAULT_ADJUSTMENT_RULES);
    expect(rule).not.toBeNull();
  });

  it('不存在的科目应返回null', () => {
    const rule = matchRule('水电费', DEFAULT_ADJUSTMENT_RULES);
    expect(rule).toBeNull();
  });

  it('前后空格应被trim处理', () => {
    const rule = matchRule('  罚款支出  ', DEFAULT_ADJUSTMENT_RULES);
    expect(rule).not.toBeNull();
    expect(rule!.type).toBe('disallowed');
  });

  it('罚款支出应匹配ADJ-006', () => {
    const rule = matchRule('罚款支出', DEFAULT_ADJUSTMENT_RULES);
    expect(rule!.id).toBe('ADJ-006');
    expect(rule!.type).toBe('disallowed');
  });
});

// =====================================================================
// runAdjustment —— 完整调整流程（最关键的集成测试）
// =====================================================================
describe('runAdjustment - 纳税调整完整流程', () => {
  it('不含任何限制科目时，无调整项，taxableIncome 等于原始利润', () => {
    const items = [{ account: '租金支出', amount: 120000 }];
    const result = runAdjustment(items, 1000000, 500000, 800000);
    expect(result.items.length).toBe(0);
    expect(result.totalIncrease).toBe(0);
    expect(result.taxableIncome).toBe(800000); // 原始利润不变
  });

  it('罚款支出：全额调增，可扣除为0', () => {
    const items = [{ account: '罚款支出', amount: 30000 }];
    const result = runAdjustment(items, 1000000, 0, 100000);
    expect(result.items.length).toBe(1);
    expect(result.items[0].adjustmentAmount).toBe(30000);
    expect(result.items[0].deductibleAmount).toBe(0);
    expect(result.totalIncrease).toBe(30000);
  });

  it('赞助支出：全额调增', () => {
    const items = [{ account: '赞助支出', amount: 50000 }];
    const result = runAdjustment(items, 1000000, 0, 200000);
    expect(result.items[0].adjustmentAmount).toBe(50000);
    expect(result.items[0].deductibleAmount).toBe(0);
  });

  it('业务招待费：正确计算孰低并调整', () => {
    // 发生额20000, 收入2000000 → 60%=12000, 5‰=10000 → 孰低=10000, 调增10000
    const items = [{ account: '业务招待费', amount: 20000 }];
    const result = runAdjustment(items, 2000000, 0, 500000);
    expect(result.items.length).toBe(1);
    expect(result.items[0].deductibleAmount).toBe(10000);
    expect(result.items[0].adjustmentAmount).toBe(10000);
  });

  it('广告费：超额部分调增', () => {
    // 发生额300000, 收入1000000, 15%限额=150000, 调增150000
    const items = [{ account: '广告费', amount: 300000 }];
    const result = runAdjustment(items, 1000000, 500000, 600000);
    expect(result.items[0].deductibleAmount).toBe(150000);
    expect(result.items[0].adjustmentAmount).toBe(150000);
  });

  it('福利费：超额部分调增', () => {
    // 工资500000, 14%=70000, 发生额100000, 调增30000
    const items = [{ account: '职工福利费', amount: 100000 }];
    const result = runAdjustment(items, 2000000, 500000, 300000);
    expect(result.items[0].deductibleAmount).toBe(70000);
    expect(result.items[0].adjustmentAmount).toBe(30000);
  });

  it('多科目混合：totalIncrease 为各项之和', () => {
    const items = [
      { account: '罚款支出', amount: 10000 },      // 全额调增 10000
      { account: '业务招待费', amount: 20000 },     // 部分调增
    ];
    const result = runAdjustment(items, 2000000, 0, 100000);
    // 招待费：60%=12000, 5‰=10000 → 孰低=10000, 调增10000
    expect(result.totalIncrease).toBe(10000 + 10000);
    expect(result.items.length).toBe(2);
  });

  it('taxableIncome = originalProfit + totalIncrease - totalDecrease（参数原样透传）', () => {
    const originalProfit = 250000;
    const items = [
      { account: '罚款支出', amount: 50000 },
      { account: '水电费', amount: 30000 },         // 无规则，不调整
    ];
    const result = runAdjustment(items, 500000, 100000, originalProfit);
    expect(result.originalProfit).toBe(originalProfit);  // 参数透传，不是内部计算的
    expect(result.taxableIncome).toBe(originalProfit + 50000);
  });

  it('调整项的note字段应包含有意义的说明', () => {
    const items = [{ account: '业务招待费', amount: 10000 }];
    const result = runAdjustment(items, 1000000, 0, 500000);
    expect(result.items[0].note).toContain('60%');
    expect(result.items[0].note).toContain('5‰');
  });

  it('originalProfit 为0时：调整项正常工作', () => {
    // 亏损企业也可能需要调整（调增后更亏损，但须申报）
    const items = [{ account: '罚款支出', amount: 10000 }];
    const result = runAdjustment(items, 1000000, 0, 0);
    expect(result.originalProfit).toBe(0);
    expect(result.taxableIncome).toBe(10000); // 调增后应税所得为正
  });

  it('原始利润为负数时：正确反映亏损状态', () => {
    const items = [{ account: '赞助支出', amount: 50000 }];
    const result = runAdjustment(items, 500000, 0, -300000);
    expect(result.originalProfit).toBe(-300000);
    expect(result.taxableIncome).toBe(-300000 + 50000); // -250000
  });
});
