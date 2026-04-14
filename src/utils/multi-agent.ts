/**
 * 多智能体系统 - Multi-Agent System
 * 核心功能：多Agent辩论、裁决决策
 */

/** Agent 角色 */
export type AgentRole = 'accounting' | 'tax' | 'audit' | 'judge';

/** Agent 意见 */
export interface AgentOpinion {
  role: AgentRole;
  view: string;
  conclusion: string;
  confidence: number; // 0-1
  concerns: string[];
}

/** 辩论结果 */
export interface DebateResult {
  opinions: AgentOpinion[];
  finalVerdict: {
    decision: 'approve' | 'reject' | 'revise';
    summary: string;
    conditions?: string[];
  };
  consensusLevel: number; // 0-1
}

/** Agent 系统提示词 */
const AGENT_PROMPTS: Record<AgentRole, { role: string; focus: string; style: string }> = {
  accounting: {
    role: '企业财务总监',
    focus: '数据合理性、业务逻辑、账务处理',
    style: '客观中立，关注数据间的逻辑关系',
  },
  tax: {
    role: '税务专家',
    focus: '税法合规、纳税调整、优惠适用',
    style: '严谨专业，关注税务处理合规性',
  },
  audit: {
    role: '税务稽查官',
    focus: '风险识别、异常发现、潜在问题',
    style: '严格审慎，关注可能的问题和风险',
  },
  judge: {
    role: '审计合伙人',
    focus: '综合判断、平衡利弊、最终决策',
    style: '客观公正，综合各方意见做出裁决',
  },
};

/**
 * 生成 Agent 分析提示词
 */
export function generateAgentPrompt(role: AgentRole, data: object): string {
  const config = AGENT_PROMPTS[role];
  const dataStr = JSON.stringify(data, null, 2);
  
  const prompts: Record<AgentRole, string> = {
    accounting: `你是企业的${config.role}。请分析以下财务数据的合理性：

数据：
${dataStr}

请从以下角度分析：
1. 数据间的逻辑关系是否正常
2. 各项指标是否符合业务逻辑
3. 是否存在异常波动需要解释

输出格式：
- 观点：[你的分析观点]
- 结论：[是否符合业务逻辑]
- 信心度：[0-1]
- 关注点：[需要关注的问题列表]`,
    
    tax: `你是${config.role}。请判断以下数据是否需要纳税调整：

数据：
${dataStr}

请从以下角度分析：
1. 哪些项目需要纳税调整
2. 适用的税收优惠政策
3. 税务处理是否符合法规

输出格式：
- 观点：[你的税务建议]
- 结论：[是否需要调整]
- 信心度：[0-1]
- 关注点：[税务风险点列表]`,
    
    audit: `你是${config.role}。请从最严格的角度审查以下数据：

数据：
${dataStr}

请从以下角度审查：
1. 识别潜在风险和异常
2. 指出可能被税局质疑的问题
3. 评估申报风险等级

输出格式：
- 观点：[你的风险评估]
- 结论：[风险等级：高/中/低]
- 信心度：[0-1]
- 关注点：[风险点列表]`,
    
    judge: `你是${config.role}。请综合各方意见做出最终决策：

数据：
${dataStr}

请综合会计、税务、稽查三个Agent的意见，做出最终裁决。
考虑：合规性、风险、效率的平衡。

输出格式：
- 决策：[批准/驳回/修改]
- 理由：[决策依据]
- 条件：[如有附加条件]`,
  };
  
  return prompts[role];
}

/**
 * 模拟 Agent 决策（实际应调用 LLM）
 */
export async function simulateAgentDecision(role: AgentRole, data: object): Promise<AgentOpinion> {
  // TODO: 实际应调用 LLM API
  // 这里返回模拟数据用于演示
  const prompts = generateAgentPrompt(role, data);
  
  return {
    role,
    view: `[${AGENT_PROMPTS[role].role}] 已分析数据`,
    conclusion: role === 'judge' ? 'approve' : '数据正常',
    confidence: 0.85,
    concerns: [],
  };
}

/**
 * 运行多Agent辩论
 */
export async function runMultiAgentDebate(data: object): Promise<DebateResult> {
  const opinions: AgentOpinion[] = [];
  
  // 并行运行各Agent
  const results = await Promise.all([
    simulateAgentDecision('accounting', data),
    simulateAgentDecision('tax', data),
    simulateAgentDecision('audit', data),
  ]);
  
  opinions.push(...results);
  
  // 裁判做出最终裁决
  const judgeOpinion = await simulateAgentDecision('judge', data);
  opinions.push(judgeOpinion);
  
  // 计算共识度
  const avgConfidence = opinions.reduce((sum, o) => sum + o.confidence, 0) / opinions.length;
  
  // 生成裁决
  let decision: 'approve' | 'reject' | 'revise' = 'approve';
  let summary = '数据通过审核，可以提交申报';
  
  const highRiskConcerns = opinions.filter(o => 
    o.concerns.some(c => c.includes('风险') || c.includes('异常'))
  );
  
  if (highRiskConcerns.length >= 2) {
    decision = 'revise';
    summary = '存在多个风险点，建议修改后再提交';
  } else if (highRiskConcerns.length === 1) {
    decision = 'revise';
    summary = '存在一个风险点，建议核实后提交';
  }
  
  return {
    opinions,
    finalVerdict: {
      decision,
      summary,
      conditions: decision !== 'approve' ? ['请修复风险点后重新审核'] : undefined,
    },
    consensusLevel: avgConfidence,
  };
}

export default { generateAgentPrompt, simulateAgentDecision, runMultiAgentDebate };
