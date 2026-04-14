/**
 * 数据采集器 - Data Collector
 * 核心功能：从 Excel 导入财务数据，数据标准化
 */

/** 原始数据格式 */
export interface RawFinancialData {
  // 资产负债表
  cash?: number;              // 货币资金
  accountsReceivable?: number; // 应收账款
  inventory?: number;        // 存货
  fixedAssets?: number;       // 固定资产
  totalAssets?: number;      // 资产合计
  accountsPayable?: number;  // 应付账款
  totalLiabilities?: number; // 负债合计
  ownerEquity?: number;      // 所有者权益
  
  // 利润表
  revenue?: number;          // 营业收入
  costOfSales?: number;      // 营业成本
  grossProfit?: number;      // 毛利
  sellingExpense?: number;   // 销售费用
  managementExpense?: number; // 管理费用
  financialExpense?: number; // 财务费用
  totalExpense?: number;    // 期间费用合计
  operatingProfit?: number;  // 营业利润
  totalProfit?: number;      // 利润总额
  netProfit?: number;        // 净利润
  
  // 税务数据
  taxableIncome?: number;    // 应纳税所得额
  taxPayable?: number;       // 应纳所得税
  taxPrepaid?: number;       // 已预缴所得税
  rdExpense?: number;        // 研发费用
  welfareExpense?: number;   // 职工福利费
  entertainment?: number;    // 业务招待费
  advertisement?: number;   // 广告费
  totalWages?: number;      // 工资总额
  employeeCount?: number;   // 职工人数
}

/** Excel 科目映射表 */
export const ACCOUNT_MAPPING: Record<string, (key: string) => boolean> = {
  // 资产负债表
  '货币资金': (k) => ['cash', '资金', '银行存款'].some(s => k.includes(s)),
  '应收账款': (k) => ['accountsReceivable', '应收'].some(s => k.includes(s)),
  '存货': (k) => ['inventory', '库存'].some(s => k.includes(s)),
  '固定资产': (k) => ['fixedAssets', '固定'].some(s => k.includes(s)),
  '资产合计': (k) => k.includes('资产') && k.includes('合计'),
  '应付账款': (k) => ['accountsPayable', '应付'].some(s => k.includes(s)),
  '负债合计': (k) => k.includes('负债') && k.includes('合计'),
  '所有者权益': (k) => ['ownerEquity', '权益'].some(s => k.includes(s)),
  
  // 利润表
  '营业收入': (k) => ['revenue', '收入'].some(s => k.includes(s)) && !k.includes('其他'),
  '营业成本': (k) => ['costOfSales', '成本'].some(s => k.includes(s)),
  '销售费用': (k) => ['sellingExpense', '销售费用'].some(s => k.includes(s)),
  '管理费用': (k) => ['managementExpense', '管理费用'].some(s => k.includes(s)),
  '财务费用': (k) => ['financialExpense', '财务费用', '利息'].some(s => k.includes(s)),
  '营业利润': (k) => ['operatingProfit', '营业利润'].some(s => k.includes(s)),
  '利润总额': (k) => ['totalProfit', '利润总额', '总利润'].some(s => k.includes(s)),
  '净利润': (k) => ['netProfit', '净利润', '净利'].some(s => k.includes(s)),
  
  // 税务数据
  '业务招待费': (k) => ['entertainment', '招待费'].some(s => k.includes(s)),
  '广告费': (k) => ['advertisement', '广告宣传费'].some(s => k.includes(s)),
  '职工福利费': (k) => ['welfareExpense', '福利费'].some(s => k.includes(s)),
  '工资总额': (k) => ['totalWages', '工资', '薪酬'].some(s => k.includes(s)),
  '研发费用': (k) => ['rdExpense', '研发费', '研究'].some(s => k.includes(s)),
};

/**
 * 从 Excel 数据行提取科目映射
 */
export function parseExcelRow(key: string, value: number | string): { key: string; value: number } | null {
  const normalizedKey = String(key).trim();
  
  for (const [targetField, matcher] of Object.entries(ACCOUNT_MAPPING)) {
    if (matcher(normalizedKey)) {
      const numValue = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^\d.-]/g, '')) || 0;
      return { key: targetField, value: numValue };
    }
  }
  
  return null;
}

/**
 * 标准化财务数据
 */
export function normalizeFinancialData(raw: Record<string, any>): RawFinancialData {
  const result: RawFinancialData = {};
  
  for (const [key, value] of Object.entries(raw)) {
    const parsed = parseExcelRow(key, value);
    if (parsed) {
      (result as any)[parsed.key] = parsed.value;
    }
  }
  
  // 计算派生字段
  if (result.revenue && result.costOfSales && !result.grossProfit) {
    result.grossProfit = result.revenue - result.costOfSales;
  }
  
  if (!result.totalExpense && (result.sellingExpense || result.managementExpense || result.financialExpense)) {
    result.totalExpense = (result.sellingExpense || 0) + (result.managementExpense || 0) + (result.financialExpense || 0);
  }
  
  return result;
}

/**
 * 验证数据完整性
 */
export function validateData(data: RawFinancialData): { valid: boolean; missing: string[] } {
  const required: (keyof RawFinancialData)[] = ['revenue', 'totalProfit'];
  const missing: string[] = [];
  
  for (const key of required) {
    if (!data[key] || data[key] === 0) {
      missing.push(key);
    }
  }
  
  return { valid: missing.length === 0, missing };
}

export default { ACCOUNT_MAPPING, parseExcelRow, normalizeFinancialData, validateData };
