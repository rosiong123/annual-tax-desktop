/**
 * 税务服务 - Tax Service
 * 核心功能：整合所有引擎，提供统一的税务分析服务
 */

import { runAdjustment, DEFAULT_ADJUSTMENT_RULES, AdjustmentResult } from './adjust-engine';
import { runRiskScan, RiskScanResult } from './risk-engine';
import { checkSLPEQualification, SLPEQualification } from './slpe-engine';
import { generateMarkdownReport, generateJsonReport, ReportData } from './report-engine';
import { normalizeFinancialData, validateData, RawFinancialData } from './data-collector';
import {
  createEvidenceChain,
  traceAdjustment,
  finalizeChain,
  EvidenceChain,
} from './evidence-chain';

/** 完整分析结果 */
export interface TaxAnalysisResult {
  /** 状态 */
  success: boolean;
  error?: string;

  /** 原始数据验证 */
  dataValidation: {
    valid: boolean;
    missing: string[];
  };

  /** 纳税调整结果 */
  adjustment: AdjustmentResult;

  /** 风险扫描结果 */
  risk: RiskScanResult;

  /** 小微优惠资格 */
  slpe: SLPEQualification;

  /** 最终税额计算 */
  taxCalculation: {
    taxableIncome: number;
    taxRate: number;
    taxPayable: number;
    taxPrepaid: number;
    taxDue: number;
    taxSavings: number;
  };

  /** 证据链（每个数字的来处） */
  evidenceChain?: EvidenceChain;

  /** 多Agent辩论结果 */
  debate?: {
    decision: string;
    summary: string;
    confidence: number;
  };
}

/** 输入数据格式 */
export interface TaxServiceInput {
  // 财务数据
  revenue: number;
  cost: number;
  grossProfit?: number;
  totalExpense: number;
  operatingProfit?: number;
  totalProfit: number;
  netProfit: number;
  
  // 期间费用明细（用于纳税调整）
  entertainment?: number;   // 业务招待费
  advertisement?: number;   // 广告费
  welfareExpense?: number;  // 职工福利费
  totalWages?: number;      // 工资总额
  
  // 税务数据
  taxableIncome?: number;
  taxPayable?: number;
  taxPrepaid?: number;
  
  // 小微判断数据
  employeeCount?: number;
  totalAssets?: number;
  
  // 可选：财务明细项
  financialItems?: Array<{ account: string; amount: number }>;
}

/**
 * 税务分析主入口
 */
export async function analyzeTax(input: TaxServiceInput): Promise<TaxAnalysisResult> {
  try {
    // 1. 数据验证
    const rawData: RawFinancialData = {
      revenue: input.revenue,
      costOfSales: input.cost,
      grossProfit: input.grossProfit,
      sellingExpense: input.totalExpense,
      operatingProfit: input.operatingProfit,
      totalProfit: input.totalProfit,
      netProfit: input.netProfit,
      entertainment: input.entertainment,
      advertisement: input.advertisement,
      welfareExpense: input.welfareExpense,
      totalWages: input.totalWages,
      taxableIncome: input.taxableIncome,
      taxPayable: input.taxPayable,
      taxPrepaid: input.taxPrepaid,
      employeeCount: input.employeeCount,
      totalAssets: input.totalAssets,
    };

    const validation = validateData(rawData);

    // 2. 准备纳税调整数据
    const adjustmentItems = input.financialItems || [
      { account: '业务招待费', amount: input.entertainment || 0 },
      { account: '广告费', amount: input.advertisement || 0 },
      { account: '职工福利费', amount: input.welfareExpense || 0 },
    ].filter(item => item.amount > 0);

    // 3. 执行纳税调整
    const adjustment = runAdjustment(
      adjustmentItems,
      input.revenue,
      input.totalWages || 0,
      input.taxableIncome || input.totalProfit,
      DEFAULT_ADJUSTMENT_RULES
    );

    // 4. 检查小微优惠
    const slpe = checkSLPEQualification(
      adjustment.taxableIncome,
      input.employeeCount || 0,
      input.totalAssets || 0
    );

    // 5. 执行风险扫描
    const risk = runRiskScan({
      revenue: input.revenue,
      cost: input.cost,
      grossProfit: input.grossProfit || input.revenue - input.cost,
      operatingExpense: input.totalExpense,
      netProfit: input.netProfit,
      totalExpense: input.totalExpense,
      wages: input.totalWages || 0,
      taxPayable: input.taxPayable || 0,
      totalProfit: input.totalProfit,
    });

    // 6. 计算税额
    const taxRate = slpe.eligible ? slpe.taxRate : 0.25;
    const taxPayable = adjustment.taxableIncome * taxRate;
    const taxPrepaid = input.taxPrepaid || 0;
    const taxDue = taxPayable - taxPrepaid;

    // 7. 构建证据链
    const chain = createEvidenceChain(new Date().getFullYear());

    // 为每条纳税调整生成证据
    for (const item of adjustment.items) {
      const rule = DEFAULT_ADJUSTMENT_RULES.find(r => r.id === item.ruleId);
      if (rule) {
        await traceAdjustment(
          chain,
          item.account,
          item.originalAmount,
          input.revenue,
          input.totalWages || 0,
          {
            id: rule.id,
            description: rule.description,
            legalBasis: rule.legalBasis,
            type: rule.type,
            limitRatio: rule.limitRatio,
          }
        );
      }
    }

    // 8. 完成证据链
    finalizeChain(
      chain,
      adjustment.taxableIncome,
      taxRate,
      taxPayable,
      validation.valid ? 0.92 : 0.6,
      validation.valid && risk.level === 'low' ? 'compliant' : 'non_compliant'
    );

    // 9. 组装结果
    return {
      success: true,
      dataValidation: validation,
      adjustment,
      risk,
      slpe,
      evidenceChain: chain,
      taxCalculation: {
        taxableIncome: adjustment.taxableIncome,
        taxRate,
        taxPayable,
        taxPrepaid,
        taxDue,
        taxSavings: slpe.taxSavings,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
      dataValidation: { valid: false, missing: [] },
      adjustment: { originalProfit: 0, totalIncrease: 0, totalDecrease: 0, taxableIncome: 0, items: [] },
      risk: { score: 0, level: 'high', risks: [], indicators: [] },
      slpe: { eligible: false, conditions: { taxableIncome: { value: 0, threshold: 0, passed: false }, employeeCount: { value: 0, threshold: 0, passed: false }, totalAssets: { value: 0, threshold: 0, passed: false } }, taxRate: 0.25, taxSavings: 0, reason: '' },
      taxCalculation: { taxableIncome: 0, taxRate: 0.25, taxPayable: 0, taxPrepaid: 0, taxDue: 0, taxSavings: 0 },
    };
  }
}

/**
 * 生成完整报告
 */
export async function generateReport(
  input: TaxServiceInput,
  companyName: string,
  taxYear: number
): Promise<{ markdown: string; json: object }> {
  const result = await analyzeTax(input);

  const reportData: ReportData = {
    companyName,
    taxYear,
    reportDate: new Date().toISOString().split('T')[0],
    revenue: input.revenue,
    cost: input.cost,
    grossProfit: input.grossProfit || input.revenue - input.cost,
    totalExpense: input.totalExpense,
    operatingProfit: input.operatingProfit || 0,
    totalProfit: input.totalProfit,
    netProfit: input.netProfit,
    taxableIncome: result.taxCalculation.taxableIncome,
    taxPayable: result.taxCalculation.taxPayable,
    taxPrepaid: result.taxCalculation.taxPrepaid,
    taxRate: result.taxCalculation.taxRate,
    totalIncrease: result.adjustment.totalIncrease,
    totalDecrease: result.adjustment.totalDecrease,
    slpeQualification: result.slpe,
    riskScore: result.risk.score,
    riskLevel: result.risk.level,
    riskCount: {
      high: result.risk.risks.filter(r => r.level === 'high').length,
      medium: result.risk.risks.filter(r => r.level === 'medium').length,
      low: result.risk.risks.filter(r => r.level === 'low').length,
    },
    adjustments: result.adjustment.items.map(item => ({
      account: item.account,
      amount: item.originalAmount,
      adjustment: item.adjustmentAmount,
      legalBasis: item.legalBasis,
    })),
  };

  return {
    markdown: generateMarkdownReport(reportData),
    json: generateJsonReport(reportData),
  };
}

export default { analyzeTax, generateReport };
