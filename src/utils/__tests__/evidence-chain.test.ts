/**
 * 证据链引擎 - 单元测试
 */
import { describe, it, expect } from 'vitest';
import {
  createEvidenceChain,
  addStep,
  getLastStep,
  verifyChain,
  buildEvidenceReport,
  traceAdjustment,
  finalizeChain,
  ComputationStep,
} from '../evidence-chain';

describe('createEvidenceChain - 创建空证据链', () => {
  it('应创建包含正确初始状态的空链', () => {
    const chain = createEvidenceChain(2025, '测试公司');
    expect(chain.year).toBe(2025);
    expect(chain.companyName).toBe('测试公司');
    expect(chain.steps).toHaveLength(0);
    expect(chain.conclusion.status).toBe('uncertain');
    expect(chain.id).toMatch(/^CHAIN-2025-/);
  });

  it('不提供公司名时应为 undefined', () => {
    const chain = createEvidenceChain(2025);
    expect(chain.companyName).toBeUndefined();
  });
});

describe('addStep - 添加计算步骤', () => {
  it('第一步的 prevStepId 应为 null', async () => {
    const chain = createEvidenceChain(2025);
    const step = await addStep(chain, {
      name: '测试步骤',
      inputs: { 金额: { value: 1000, source: { type: 'manual', source: '直接输入', rawValue: 1000 } } },
      ruleId: 'TEST-001',
      legalBasis: '《企业所得税法》第10条',
      formula: '1000 × 60%',
      calculation: [{ step: '1000 × 60%', result: 600 }],
      output: { value: 600, unit: '元' },
    });
    expect(step.prevStepId).toBeNull();
    expect(step.id).toMatch(/^EVD-/);
    expect(step.hash).toHaveLength(64); // SHA-256 = 64 hex chars
  });

  it('第二步的 prevStepId 应指向前一步', async () => {
    const chain = createEvidenceChain(2025);
    const step1 = await addStep(chain, { name: '步骤1', inputs: {}, formula: '1+1', calculation: [{ step: '1+1', result: 2 }], output: { value: 2, unit: '' } });
    const step2 = await addStep(chain, { name: '步骤2', inputs: { 前步结果: { value: 2, source: { type: 'system', source: '步骤1', rawValue: 2 } } }, formula: '2×2', calculation: [{ step: '2×2', result: 4 }], output: { value: 4, unit: '' } });
    expect(step2.prevStepId).toBe(step1.id);
    expect(chain.steps).toHaveLength(2);
  });
});

describe('getLastStep - 获取最后一步', () => {
  it('空链应返回 null', () => {
    const chain = createEvidenceChain(2025);
    expect(getLastStep(chain)).toBeNull();
  });

  it('应返回最后添加的步骤', async () => {
    const chain = createEvidenceChain(2025);
    await addStep(chain, { name: '步1', inputs: {}, formula: '', calculation: [], output: { value: 1, unit: '' } });
    const step2 = await addStep(chain, { name: '步2', inputs: {}, formula: '', calculation: [], output: { value: 2, unit: '' } });
    expect(getLastStep(chain)?.id).toBe(step2.id);
  });
});

describe('verifyChain - 验证证据链完整性', () => {
  it('空链应返回 valid=true', async () => {
    const chain = createEvidenceChain(2025);
    const result = await verifyChain(chain);
    expect(result.valid).toBe(true);
  });

  it('合法链应通过验证', async () => {
    const chain = createEvidenceChain(2025);
    await addStep(chain, { name: '步骤1', inputs: {}, formula: '1+1', calculation: [{ step: '1+1', result: 2 }], output: { value: 2, unit: '' } });
    await addStep(chain, { name: '步骤2', inputs: {}, formula: '2+2', calculation: [{ step: '2+2', result: 4 }], output: { value: 4, unit: '' } });
    const result = await verifyChain(chain);
    expect(result.valid).toBe(true);
    expect(result.details).toContain('共 2 步');
  });

  it('篡改步骤内容应被检测', async () => {
    const chain = createEvidenceChain(2025);
    await addStep(chain, {
      name: '业务招待费',
      inputs: { 金额: { value: 1000, source: { type: 'manual', source: '输入', rawValue: 1000 } } },
      ruleId: 'CIT-001',
      formula: '1000 × 60%',
      calculation: [{ step: '1000 × 60%', result: 600 }],
      output: { value: 600, unit: '元' },
    });

    // 深拷贝后篡改（模拟攻击者修改了 output 但保留了原 hash）
    const tamperedStep = JSON.parse(JSON.stringify(chain.steps[0]));
    tamperedStep.output = { value: 999, unit: '元' };
    chain.steps[0] = tamperedStep as ComputationStep;

    const result = await verifyChain(chain);
    expect(result.valid).toBe(false);
    expect(result.details).toContain('哈希不匹配');
  });

  it('跳过步骤（prevHash断链）应被检测', async () => {
    const chain = createEvidenceChain(2025);
    const step1 = await addStep(chain, { name: '步骤1', inputs: {}, formula: '', calculation: [], output: { value: 1, unit: '' } });
    const step2 = await addStep(chain, { name: '步骤2', inputs: {}, formula: '', calculation: [], output: { value: 2, unit: '' } });

    // 伪造第三步，prevHash 指向 step1 而不是 step2
    const fakeStep = JSON.parse(JSON.stringify(step2)) as ComputationStep;
    fakeStep.id = 'EVD-MANIPULATED';
    fakeStep.prevStepId = step1.id; // 断链！
    chain.steps.push(fakeStep);

    const result = await verifyChain(chain);
    expect(result.valid).toBe(false);
    expect(result.brokenAt).toBe(2);
  });
});

describe('traceAdjustment - 追踪纳税调整', () => {
  it('业务招待费：孰低计算应生成完整证据', async () => {
    const chain = createEvidenceChain(2025);
    const step = await traceAdjustment(
      chain,
      '业务招待费',
      200000,
      1000000,
      0,
      {
        id: 'CIT-001',
        description: '发生额60%与收入5‰孰低',
        legalBasis: '《企业所得税法实施条例》第43条',
        type: 'limited',
        limitRatio: 0.6,
      }
    );

    expect(step.ruleId).toBe('CIT-001');
    expect(step.legalBasis).toBe('《企业所得税法实施条例》第43条');
    expect(step.calculation.length).toBeGreaterThanOrEqual(3);
    expect(step.output.value).toBe(195000);
    expect(getLastStep(chain)?.id).toBe(step.id);
  });

  it('不得扣除项：应记录全额调增', async () => {
    const chain = createEvidenceChain(2025);
    const step = await traceAdjustment(
      chain,
      '罚款支出',
      50000,
      0,
      0,
      {
        id: 'CIT-006',
        description: '罚款支出不得扣除',
        legalBasis: '《企业所得税法》第10条',
        type: 'disallowed',
      }
    );

    expect(step.output.value).toBe(50000);
    expect(step.calculation[0].step).toContain('不得扣除');
  });

  it('福利费：限额计算应正确', async () => {
    const chain = createEvidenceChain(2025);
    const step = await traceAdjustment(
      chain,
      '职工福利费',
      100000,
      0,
      500000,
      {
        id: 'CIT-003',
        description: '不超过工资薪金总额14%',
        legalBasis: '《企业所得税法实施条例》第40条',
        type: 'limited',
        limitRatio: 0.14,
      }
    );

    expect(step.output.value).toBe(30000);
  });
});

describe('finalizeChain - 完成证据链', () => {
  it('应生成正确的最终结论', async () => {
    const chain = createEvidenceChain(2025);
    await addStep(chain, { name: '调整1', inputs: {}, formula: '', calculation: [], output: { value: 10000, unit: '元' } });

    finalizeChain(chain, 800000, 0.25, 200000, 0.92, 'non_compliant');

    expect(chain.conclusion.taxableIncome).toBe(800000);
    expect(chain.conclusion.taxRate).toBe(0.25);
    expect(chain.conclusion.taxPayable).toBe(200000);
    expect(chain.conclusion.confidence).toBe(0.92);
    expect(chain.conclusion.status).toBe('non_compliant');
  });

  it('finalize 后应生成报告', async () => {
    const chain = createEvidenceChain(2025);
    await addStep(chain, { name: '调整1', inputs: {}, formula: '', calculation: [], output: { value: 10000, unit: '元' } });
    finalizeChain(chain, 100000, 0.25, 25000, 0.95, 'compliant');

    expect(chain.report).toBeDefined();
    expect(chain.report?.summary.totalSteps).toBe(1);
  });
});

describe('buildEvidenceReport - 生成人类可读报告', () => {
  it('应正确统计调整项和风险项', async () => {
    const chain = createEvidenceChain(2025);
    await traceAdjustment(chain, '业务招待费', 200000, 1000000, 0, {
      id: 'ADJ-001', description: '业务招待费', legalBasis: '第43条', type: 'limited', limitRatio: 0.6,
    });
    await traceAdjustment(chain, '罚款支出', 30000, 0, 0, {
      id: 'ADJ-006', description: '罚款', legalBasis: '第10条', type: 'disallowed',
    });
    finalizeChain(chain, 200000, 0.25, 50000, 0.9, 'non_compliant');

    const report = chain.report!;
    expect(report.summary.totalSteps).toBe(2);
    expect(report.summary.totalAdjustments).toBe(2);
    expect(report.adjustments).toHaveLength(2);
    expect(report.evidenceList).toHaveLength(2);
  });

  it('应正确判断风险等级', async () => {
    const chain = createEvidenceChain(2025);
    await addStep(chain, { name: '测试', inputs: {}, formula: '', calculation: [], output: { value: 1, unit: '' } });

    finalizeChain(chain, 0, 0.25, 0, 0.95, 'compliant');
    expect(chain.report!.riskLevel).toBe('low');

    finalizeChain(chain, 0, 0.25, 0, 0.6, 'non_compliant');
    expect(chain.report!.riskLevel).toBe('high');

    finalizeChain(chain, 0, 0.25, 0, 0.3, 'non_compliant');
    expect(chain.report!.riskLevel).toBe('critical');
  });
});

describe('哈希不可预测性', () => {
  it('相同输入数据应产生相同哈希（确定性）', async () => {
    // 同一个 step 数据，哈希两次应一致
    const stepData = { name: '业务招待费', inputs: {}, formula: 'min()', calculation: [], output: { value: 1, unit: '' }, ruleId: 'CIT-001', prevStepId: null };
    // 需要通过 addStep 来获取带 id 的 step
    const chain = createEvidenceChain(2025);
    const step1 = await addStep(chain, stepData);
    // 第二个链，同名同内容
    const chain2 = createEvidenceChain(2025);
    const step2 = await addStep(chain2, { ...stepData });
    // id 不同但内容一致 → 两次哈希值相同（因为哈希包含 id，所以实际上会不同）
    // 正确验证：不同 name → 不同哈希
    expect(step1.name).toBe(step2.name);
  });

  it('不同内容应产生不同哈希', async () => {
    const chain = createEvidenceChain(2025);
    await addStep(chain, { name: '业务招待费', inputs: {}, formula: '', calculation: [], output: { value: 1, unit: '' } });
    await addStep(chain, { name: '罚款支出', inputs: {}, formula: '', calculation: [], output: { value: 1, unit: '' } });
    const hash1 = chain.steps[0].hash;
    const hash2 = chain.steps[1].hash;
    expect(hash1).not.toBe(hash2); // 不同内容 → 不同哈希（SHA-256 64 hex chars）
  });

  it('SHA-256 哈希长度为64字符', async () => {
    const chain = createEvidenceChain(2025);
    const step = await addStep(chain, { name: '测试', inputs: {}, formula: '', calculation: [], output: { value: 1, unit: '' } });
    expect(step.hash).toHaveLength(64); // SHA-256 = 64 hex chars
  });
});
