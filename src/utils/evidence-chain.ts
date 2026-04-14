/**
 * 证据链引擎 - Evidence Chain Engine
 *
 * 核心目标：让每一个数字都有来处
 * 用户问"这个税怎么来的" → 系统能完整还原计算路径
 *
 * 设计原则：
 * - 轻量：纯函数，无副作用，不依赖网络
 * - 可测试：每一步都有明确输入输出
 * - AI 可读：结构化输出，可供 Agent 解析
 * - 审计友好：可直接给税局查看
 */

/** 数据来源追踪 */
export interface DataSource {
  /** 来源类型 */
  type: 'excel' | 'manual' | 'ai_inference' | 'system';
  /** 来源文件/System名称 */
  source: string;
  /** Sheet 名称（Excel时） */
  sheet?: string;
  /** 行号（Excel时） */
  row?: number;
  /** 字段名称 */
  field?: string;
  /** 原始值 */
  rawValue: string | number;
}

/** 单条计算步骤 */
export interface ComputationStep {
  /** 步骤ID */
  id: string;
  /** 步骤名称 */
  name: string;
  /** 输入数据（key → {value, source}） */
  inputs: Record<string, { value: number; source: DataSource }>;
  /** 应用的规则ID */
  ruleId?: string;
  /** 规则描述 */
  ruleDescription?: string;
  /** 法规依据 */
  legalBasis?: string;
  /** 计算公式（人类可读） */
  formula: string;
  /** 计算过程（每步可复核） */
  calculation: Array<{ step: string; result: string | number }>;
  /** 最终结果 */
  output: { value: number; unit: string };
  /** 时间戳 */
  timestamp: string;
  /** 上一步ID（链表） */
  prevStepId: string | null;
  /** 当前哈希（防篡改） */
  hash: string;
}

/** 完整证据链 */
export interface EvidenceChain {
  /** 链ID */
  id: string;
  /** 税务年度 */
  year: number;
  /** 企业名称 */
  companyName?: string;
  /** 所有计算步骤（按执行顺序） */
  steps: ComputationStep[];
  /** 最终结论 */
  conclusion: {
    taxableIncome: number;
    taxRate: number;
    taxPayable: number;
    confidence: number; // 0-1
    status: 'compliant' | 'non_compliant' | 'uncertain';
  };
  /** 生成的证据链报告 */
  report?: EvidenceReport;
  /** 创建时间 */
  createdAt: string;
}

/** 证据链报告（给用户/税局看） */
export interface EvidenceReport {
  /** 总览 */
  summary: {
    totalSteps: number;
    totalAdjustments: number;
    riskItems: number;
    confidence: number;
  };
  /** 风险等级 */
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  /** 关键发现 */
  findings: Array<{
    category: string;
    item: string;
    amount: number;
    impact: string;
    legalBasis: string;
  }>;
  /** 调整明细 */
  adjustments: Array<{
    account: string;
    originalAmount: number;
    deductibleAmount: number;
    adjustmentAmount: number;
    legalBasis: string;
    computationPath: string;
  }>;
  /** 证据清单 */
  evidenceList: Array<{
    stepId: string;
    description: string;
    source: string;
    hasRawEvidence: boolean;
  }>;
}

// ============================================================================
// 核心函数
// ============================================================================

let _stepCounter = 0;

/** 生成唯一步骤ID */
function newStepId(): string {
  return `EVD-${Date.now()}-${++_stepCounter}`;
}

/** 生成步骤哈希（防篡改，使用 SHA-256） */
async function hashStep(step: Omit<ComputationStep, 'hash'>): Promise<string> {
  // 深拷贝防止引用干扰，保证确定性
  const normalized = JSON.parse(JSON.stringify({
    id: step.id,
    name: step.name,
    inputs: step.inputs,
    ruleId: step.ruleId,
    formula: step.formula,
    output: step.output,
    prevStepId: step.prevStepId,
  }));
  const data = JSON.stringify(normalized);
  const encoded = new TextEncoder().encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/** 创建空证据链 */
export function createEvidenceChain(year: number, companyName?: string): EvidenceChain {
  return {
    id: `CHAIN-${year}-${Date.now()}`,
    year,
    companyName,
    steps: [],
    conclusion: {
      taxableIncome: 0,
      taxRate: 0.25,
      taxPayable: 0,
      confidence: 0,
      status: 'uncertain',
    },
    createdAt: new Date().toISOString(),
  };
}

/** 添加计算步骤到证据链 */
export async function addStep(
  chain: EvidenceChain,
  step: Omit<ComputationStep, 'id' | 'timestamp' | 'prevStepId' | 'hash'>
): Promise<ComputationStep> {
  const prevStepId = chain.steps.length > 0 ? chain.steps[chain.steps.length - 1].id : null;
  const fullStep: ComputationStep = {
    ...step,
    id: newStepId(),
    timestamp: new Date().toISOString(),
    prevStepId,
    hash: '',
  } as ComputationStep;
  fullStep.hash = await hashStep(fullStep);
  chain.steps.push(fullStep);
  return fullStep;
}

/** 从证据链获取最后一步 */
export function getLastStep(chain: EvidenceChain): ComputationStep | null {
  return chain.steps.length > 0 ? chain.steps[chain.steps.length - 1] : null;
}

/** 验证证据链完整性（检查链表和哈希） */
export async function verifyChain(chain: EvidenceChain): Promise<{
  valid: boolean;
  brokenAt?: number;
  details: string;
}> {
  if (chain.steps.length === 0) {
    return { valid: true, details: '空链（无计算步骤）' };
  }

  for (let i = 0; i < chain.steps.length; i++) {
    const step = chain.steps[i];

    // 验证 prevHash 链接
    if (i === 0) {
      if (step.prevStepId !== null) {
        return { valid: false, brokenAt: i, details: `第1步 prevStepId 应为 null，实际为 ${step.prevStepId}` };
      }
    } else {
      const prevStep = chain.steps[i - 1];
      if (step.prevStepId !== prevStep.id) {
        return { valid: false, brokenAt: i, details: `第${i + 1}步 prevStepId 应为 ${prevStep.id}，实际为 ${step.prevStepId}` };
      }
    }

    // 验证哈希（深拷贝防止 inputs 引用干扰）
    const stepCopy = JSON.parse(JSON.stringify(step));
    delete stepCopy.hash;
    const expectedHash = await hashStep(stepCopy as Omit<ComputationStep, 'hash'>);
    if (step.hash !== expectedHash) {
      return { valid: false, brokenAt: i, details: `第${i + 1}步哈希不匹配，内容可能被篡改` };
    }
  }

  return { valid: true, details: `共 ${chain.steps.length} 步，链完整` };
}

/** 生成人类可读的报告 */
export function buildEvidenceReport(chain: EvidenceChain): EvidenceReport {
  const adjustments = chain.steps
    .filter(s => s.ruleId?.startsWith('ADJ'))
    .map(s => {
      const originalAmount = Object.values(s.inputs)[0]?.value || 0;
      const adjustmentAmount = s.calculation.find(c => String(c.step).includes('调增'))
        ? Number(s.calculation.find(c => String(c.step).includes('调增'))?.result) || 0
        : 0;
      return {
        account: s.name,
        originalAmount,
        deductibleAmount: originalAmount - adjustmentAmount,
        adjustmentAmount,
        legalBasis: s.legalBasis || '',
        computationPath: s.formula,
      };
    });

  const findings = chain.steps
    .filter(s => s.ruleId?.startsWith('RISK'))
    .map(s => ({
      category: '风险',
      item: s.name,
      amount: s.output.value,
      impact: s.calculation.map(c => c.step).join('；'),
      legalBasis: s.legalBasis || '',
    }));

  const avgConfidence = chain.steps.length > 0
    ? chain.steps.reduce((sum, s) => sum + (s.calculation[0] ? 1 : 0), 0) / chain.steps.length
    : 0;

  const riskLevel = chain.conclusion.confidence >= 0.9 ? 'low'
    : chain.conclusion.confidence >= 0.7 ? 'medium'
    : chain.conclusion.confidence >= 0.5 ? 'high'
    : 'critical';

  return {
    summary: {
      totalSteps: chain.steps.length,
      totalAdjustments: adjustments.length,
      riskItems: findings.length,
      confidence: chain.conclusion.confidence,
    },
    riskLevel,
    findings,
    adjustments,
    evidenceList: chain.steps.map(s => ({
      stepId: s.id,
      description: `${s.name}：${s.formula}`,
      source: Object.values(s.inputs)[0]?.source?.source || '未知',
      hasRawEvidence: Object.values(s.inputs)[0]?.source?.type === 'excel',
    })),
  };
}

/** 生成可追溯的纳税调整证据 */
export async function traceAdjustment(
  chain: EvidenceChain,
  accountName: string,
  originalAmount: number,
  revenue: number,
  wages: number,
  rule: { id: string; description: string; legalBasis: string; type: string; limitRatio?: number }
): Promise<ComputationStep> {
  // 计算过程
  const calculation: Array<{ step: string; result: string | number }> = [];

  let deductible = originalAmount;
  let adjustmentAmount = 0;

  if (rule.type === 'disallowed') {
    // 不得扣除：全额调增
    calculation.push({ step: `${accountName}不得扣除`, result: '依据《企业所得税法》第10条' });
    deductible = 0;
    adjustmentAmount = originalAmount;
    calculation.push({ step: '调增金额', result: adjustmentAmount });
  } else if (rule.type === 'limited') {
    if (accountName.includes('业务招待费')) {
      // 业务招待费：60% vs 收入5‰ 孰低
      const ratio60 = Math.round(originalAmount * 0.6 * 100) / 100;
      const ratio5permille = Math.round(revenue * 0.005 * 100) / 100;
      calculation.push({ step: `发生额×60% = ${originalAmount} × 60%`, result: ratio60 });
      calculation.push({ step: `收入×5‰ = ${revenue} × 5‰`, result: ratio5permille });
      deductible = Math.min(ratio60, ratio5permille);
      adjustmentAmount = Math.round((originalAmount - deductible) * 100) / 100;
      calculation.push({ step: `取孰低值 = ${deductible}`, result: deductible });
      calculation.push({ step: '调增金额 = 发生额 - 可扣除', result: `${adjustmentAmount}` });
    } else if (accountName.includes('广告')) {
      // 广告费：不超过收入15%
      const limit = Math.round(revenue * (rule.limitRatio || 0.15) * 100) / 100;
      calculation.push({ step: `收入×${rule.limitRatio || 0.15} = ${revenue} × ${rule.limitRatio || 0.15}`, result: limit });
      deductible = Math.min(originalAmount, limit);
      adjustmentAmount = Math.round((originalAmount - deductible) * 100) / 100;
      calculation.push({ step: '调增金额 = 发生额 - 限额', result: adjustmentAmount });
    } else {
      // 福利/工会/教育经费：不超过工资14%/2%/8%
      const limit = Math.round(wages * (rule.limitRatio || 0.14) * 100) / 100;
      calculation.push({ step: `工资总额×${rule.limitRatio || 0.14} = ${wages} × ${rule.limitRatio || 0.14}`, result: limit });
      deductible = Math.min(originalAmount, limit);
      adjustmentAmount = Math.round((originalAmount - deductible) * 100) / 100;
      calculation.push({ step: '调增金额 = 发生额 - 限额', result: adjustmentAmount });
    }
  }

  const step = await addStep(chain, {
    name: accountName,
    inputs: {
      发生额: {
        value: originalAmount,
        source: { type: 'excel', source: '财务报表', field: accountName, rawValue: originalAmount },
      },
      ...(revenue > 0 ? {
        收入: {
          value: revenue,
          source: { type: 'excel', source: '利润表', field: '营业收入', rawValue: revenue },
        },
      } : {}),
      ...(wages > 0 ? {
        工资总额: {
          value: wages,
          source: { type: 'excel', source: '科目余额表', field: '工资薪金', rawValue: wages },
        },
      } : {}),
    },
    ruleId: rule.id,
    ruleDescription: rule.description,
    legalBasis: rule.legalBasis,
    formula: buildFormula(accountName, originalAmount, revenue, wages, rule),
    calculation,
    output: { value: adjustmentAmount, unit: '元' },
  });

  return step;
}

/** 生成公式描述 */
function buildFormula(
  accountName: string,
  originalAmount: number,
  revenue: number,
  wages: number,
  rule: { type: string; limitRatio?: number }
): string {
  if (rule.type === 'disallowed') {
    return `${accountName} = 0（不得扣除，全额调增）`;
  }
  if (accountName.includes('业务招待费')) {
    return `min(${originalAmount}×60%, ${revenue}×5‰)`;
  }
  if (accountName.includes('广告')) {
    return `min(${originalAmount}, ${revenue}×${rule.limitRatio || 0.15})`;
  }
  return `min(${originalAmount}, ${wages}×${rule.limitRatio || 0.14})`;
}

/** 完成证据链，生成最终结论 */
export function finalizeChain(
  chain: EvidenceChain,
  taxableIncome: number,
  taxRate: number,
  taxPayable: number,
  confidence: number,
  status: 'compliant' | 'non_compliant' | 'uncertain'
): EvidenceChain {
  chain.conclusion = { taxableIncome, taxRate, taxPayable, confidence, status };
  chain.report = buildEvidenceReport(chain);
  return chain;
}

export default {
  createEvidenceChain,
  addStep,
  getLastStep,
  verifyChain,
  buildEvidenceReport,
  traceAdjustment,
  finalizeChain,
};
