/**
 * 税务申报表单服务 - Tax Filing Forms Service
 * 核心功能：生成完整的税务申报表单数据（A100000主表及主要附表）
 */

import { jsPDF } from 'jspdf';

/**
 * A100000 主表数据
 * 基于国家税务总局公告2025年第1号修订版本（2021年12月发布）
 * 38行结构，分三部分：
 * 第一部分：利润总额的计算（第1-13行）
 * 第二部分：应纳税所得额的计算（第14-23行）
 * 第三部分：税额的计算（第24-38行）
 */
export interface A100000Data {
  companyName: string;
  taxYear: number;
  reportDate: string;

  // ========== 第一部分：利润总额的计算（第1-13行）==========
  revenue: number;                          // 第1行 营业收入（填A101010/101020/103000）
  cost: number;                              // 第2行 营业成本（填A102010/102020/103000）
  taxAndAdd: number;                         // 第3行 税金及附加
  managementExpense: number;                  // 第4行 管理费用（填A104000）
  sellingExpense: number;                    // 第5行 销售费用（填A104000）
  financialExpense: number;                   // 第6行 财务费用（填A104000）
  assetImpairmentLoss: number;               // 第7行 资产减值损失
  investmentIncome: number;                   // 第8行 投资收益（损失以"-"号填列）
  fairValueChangeIncome: number;              // 第9行 公允价值变动收益
  totalProfit: number;                        // 第10行 利润总额（=1-2-3-4-5-6-7+8+9）
  nonBusinessIncome: number;                 // 第11行 营业外收入（填A101010/101020/103000）
  nonBusinessExpense: number;                // 第12行 营业外支出（填A102010/102020/103000）
  otherIncomeTotal: number;                  // 第13行 其他收益总额（=10+11-12）

  // ========== 第二部分：应纳税所得额的计算（第14-23行）==========
  lossCarryforward: number;                  // 第14行 弥补以前年度亏损（填A108010）
  taxIncrease: number;                       // 第15行 加：纳税调整增加额（填A105000）
  taxDecrease: number;                        // 第16行 减：纳税调整减少额（填A105000）
  taxAdditionDeduction: number;              // 第17行 纳税调整加计扣除（填A107010）
  overseasIncomeDeduction: number;           // 第18行 减：境外所得应纳税所得额减除（填A108000）
  taxableIncome: number;                     // 第19行 应纳税所得额（=13-14+15-16-17+18）
  additionalDeduction: number;               // 第20行 加计扣除（填A107020）
  overseasLossCarryforward: number;          // 第21行 境外所得前弥补亏损（填A106000）
  overseasTaxableDeduction: number;          // 第22行 境外应税所得额减除（填A107030）
  finalTaxableIncome: number;                 // 第23行 应纳税所得额（=19-20-21-22）

  // ========== 第三部分：税额的计算（第24-38行）==========
  taxRate: number;                           // 第24行 税率（25%）
  taxPayable: number;                         // 第25行 应纳所得税额（=23×24）
  taxReduction: number;                      // 第26行 减免所得税（填A107040）
  taxExemption: number;                       // 第27行 减（免）税额（填A107050）
  taxAmount: number;                          // 第28行 应纳税额（=25-26-27）
  taxCredit: number;                          // 第29行 实际抵免所得税额（填A108000）
  priorYearOverpaid: number;                  // 第30行 以前年度多缴税额（填A108000）
  actualTaxDue: number;                       // 第31行 实际应补（退）所得税额（=28+29-30）
  priorYearTaxDue: number;                    // 第32行 以前年度应补（退）所得税额
  currentTaxDue: number;                      // 第33行 本期实际应补（退）所得税额（=31-32）
  highTechTaxReduction: number;              // 第34行 高新技术企业减免所得税（填A109000）
  advancedServiceTaxReduction: number;       // 第35行 技术先进型服务企业所得税减免（填A109000）
  techTransferTaxReduction: number;          // 第36行 国家级技术转移示范机构减免（填A109000）
  taxRatio: number;                           // 第37行 实际应纳税额比例（兵团/地方）
  finalTaxDue: number;                        // 第38行 实际应补（退）所得税额（=33-37）
}

/** A101010 一般企业收入明细表 */
export interface A101010Data {
  companyName: string;
  taxYear: number;
  reportDate: string;
  // 主营业务收入
  mainRevenueProduct: number;          // 货物销售收入
  mainRevenueLabor: number;           // 提供劳务收入
  mainRevenueConstruction: number;    // 建造工程收入
  mainRevenueProperty: number;        // 让渡资产使用权收入
  mainRevenueOther: number;           // 其他主营业务收入
  mainRevenueTotal: number;           // 主营业务收入合计
  // 其他业务收入
  otherRevenueMaterial: number;        // 材料销售收入
  otherRevenueLabor: number;          // 提供劳务收入
  otherRevenueProperty: number;       // 让渡资产使用权收入
  otherRevenueOther: number;          // 其他其他业务收入
  otherRevenueTotal: number;           // 其他业务收入合计
  // 营业收入合计
  revenueTotal: number;
}

/** A102010 一般企业成本支出明细表 */
export interface A102010Data {
  companyName: string;
  taxYear: number;
  reportDate: string;
  // 主营业务成本
  mainCostProduct: number;             // 货物销售成本
  mainCostLabor: number;              // 提供劳务成本
  mainCostConstruction: number;        // 建造工程成本
  mainCostProperty: number;           // 让渡资产使用权成本
  mainCostOther: number;              // 其他主营业务成本
  mainCostTotal: number;              // 主营业务成本合计
  // 其他业务支出
  otherCostMaterial: number;           // 材料销售成本
  otherCostLabor: number;             // 提供劳务成本
  otherCostProperty: number;          // 让渡资产使用权成本
  otherCostOther: number;             // 其他其他业务成本
  otherCostTotal: number;              // 其他业务成本合计
  // 营业成本合计
  costTotal: number;
  // 期间费用
  sellingExpense: number;              // 销售费用
  managementExpense: number;           // 管理费用
  financialExpense: number;            // 财务费用
  periodExpenseTotal: number;          // 期间费用合计
}

/** A105000 纳税调整项目明细表 */
export interface A105000Data {
  companyName: string;
  taxYear: number;
  reportDate: string;
  // 收入类调整项目
  revenueAdjustments: Array<{
    account: string;
    taxIncrease: number;
    taxDecrease: number;
    description: string;
  }>;
  // 扣除类调整项目
  expenseAdjustments: Array<{
    account: string;
    amount: number;
    taxIncrease: number;
    taxDecrease: number;
    description: string;
  }>;
  // 资产类调整项目
  assetAdjustments: Array<{
    account: string;
    amount: number;
    taxIncrease: number;
    taxDecrease: number;
    description: string;
  }>;
  // 合计
  totalIncrease: number;
  totalDecrease: number;
}

/** A105050 职工薪酬支出及纳税调整明细表 */
export interface A105050Data {
  companyName: string;
  taxYear: number;
  reportDate: string;
  // 职工薪酬
  wages: number;                       // 工资薪金
  welfare: number;                     // 职工福利费
  unionFund: number;                   // 工会经费
  educationExpense: number;             // 职工教育经费
  socialInsurance: number;             // 社会保险费
  housingFund: number;                 // 住房公积金
  laborService: number;                // 劳务派遣费
  other: number;                      // 其他
  total: number;                       // 合计
  // 税收规定扣除限额
  welfareLimit: number;
  unionFundLimit: number;
  educationExpenseLimit: number;
}

/** A107012 研发费用加计扣除优惠明细表 */
export interface A107012Data {
  companyName: string;
  taxYear: number;
  reportDate: string;
  // 研发费用明细
  rdPersonnel: number;                // 人员人工费用
  rdDirectMaterials: number;          // 直接材料费用
  rdDepreciation: number;              // 折旧费用
  rdAmortization: number;             // 无形资产摊销费用
  rdTrialExpenses: number;             // 中间试验费用
  rdOther: number;                    // 其他相关费用
  rdTotal: number;                     // 研发费用合计
  // 加计扣除
  additionalDeductionRate: number;     // 加计扣除比例（75%/100%）
  additionalDeduction: number;        // 加计扣除金额
  // 委托研发
  commissionedRd: number;             // 委托研发费用
  commissionedDeduction: number;      // 委托研发可加计扣除
}

/**
 * 生成A100000主表PDF（完整版）
 * 基于国家税务总局公告2025年第1号修订版本
 * 38行结构，三部分：
 * 第一部分：利润总额的计算（第1-13行）
 * 第二部分：应纳税所得额的计算（第14-23行）
 * 第三部分：税额的计算（第24-38行）
 */
export function generateA100000FullPDF(data: A100000Data): Blob {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 8;
  let yPos = margin;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('中华人民共和国企业所得税年度纳税申报表（A类）', pageWidth / 2, yPos, { align: 'center' });
  yPos += 4;

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`企业名称：${data.companyName}`, margin, yPos);
  doc.text(`申报日期：${data.reportDate}`, pageWidth / 2, yPos);
  doc.text(`税务年度：${data.taxYear}年度`, pageWidth - margin - 35, yPos);
  yPos += 3;

  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 2;

  const fmt = (n: number) => n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const col1 = 70;
  const col2 = 42;
  doc.setFontSize(7);
  const rowHeight = 4;

  const drawRow = (rowNum: string, label: string, bookVal: string, declVal: string, isBold = false) => {
    if (yPos > pageHeight - 20) { doc.addPage(); yPos = margin; }
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.text(rowNum, margin, yPos);
    doc.text(label, margin + 12, yPos);
    doc.text(bookVal, margin + col1, yPos, { align: 'right' });
    doc.text(declVal, margin + col1 + col2, yPos, { align: 'right' });
    yPos += rowHeight;
  };

  const drawLine = () => {
    doc.setLineWidth(0.3);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += rowHeight * 0.4;
  };

  const sectionHeader = (text: string) => {
    if (yPos > pageHeight - 25) { doc.addPage(); yPos = margin; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text(text, margin, yPos);
    yPos += rowHeight;
    doc.setFontSize(7);
  };

  doc.setFont('helvetica', 'bold');
  doc.text('行次', margin, yPos);
  doc.text('项目', margin + 15, yPos);
  doc.text('账载金额', margin + col1 + 5, yPos, { align: 'center' });
  doc.text('申报金额', margin + col1 + col2 + 10, yPos, { align: 'center' });
  yPos += rowHeight;
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 1;

  // Part 1: Profit calculation (lines 1-13)
  sectionHeader('一、利润总额的计算');
  drawRow('1', '营业收入（填A101010/101020/103000）', fmt(data.revenue), fmt(data.revenue));
  drawRow('2', '营业成本（填A102010/102020/103000）', fmt(data.cost), fmt(data.cost));
  drawRow('3', '税金及附加', fmt(data.taxAndAdd), fmt(data.taxAndAdd));
  drawRow('4', '管理费用（填A104000）', fmt(data.managementExpense), fmt(data.managementExpense));
  drawRow('5', '销售费用（填A104000）', fmt(data.sellingExpense), fmt(data.sellingExpense));
  drawRow('6', '财务费用（填A104000）', fmt(data.financialExpense), fmt(data.financialExpense));
  drawRow('7', '资产减值损失', fmt(data.assetImpairmentLoss), fmt(data.assetImpairmentLoss));
  drawRow('8', '投资收益（损失以"-"号填列）', fmt(data.investmentIncome), fmt(data.investmentIncome));
  drawRow('9', '公允价值变动收益', fmt(data.fairValueChangeIncome), fmt(data.fairValueChangeIncome));
  drawRow('10', '利润总额（=1-2-3-4-5-6-7+8+9）', fmt(data.totalProfit), fmt(data.totalProfit), true);
  drawRow('11', '营业外收入（填A101010/101020/103000）', fmt(data.nonBusinessIncome), fmt(data.nonBusinessIncome));
  drawRow('12', '营业外支出（填A102010/102020/103000）', fmt(data.nonBusinessExpense), fmt(data.nonBusinessExpense));
  drawRow('13', '其他收益总额（=10+11-12）', fmt(data.otherIncomeTotal), fmt(data.otherIncomeTotal), true);
  drawLine();

  // Part 2: Taxable income calculation (lines 14-23)
  sectionHeader('二、应纳税所得额的计算');
  drawRow('14', '弥补以前年度亏损（填A108010）', fmt(data.lossCarryforward), fmt(data.lossCarryforward));
  drawRow('15', '加：纳税调整增加额（填A105000）', fmt(data.taxIncrease), fmt(data.taxIncrease));
  drawRow('16', '减：纳税调整减少额（填A105000）', fmt(data.taxDecrease), fmt(data.taxDecrease));
  drawRow('17', '纳税调整加计扣除（填A107010）', fmt(data.taxAdditionDeduction), fmt(data.taxAdditionDeduction));
  drawRow('18', '减：境外所得应纳税所得额减除（填A108000）', fmt(data.overseasIncomeDeduction), fmt(data.overseasIncomeDeduction));
  drawRow('19', '应纳税所得额（=13-14+15-16-17+18）', fmt(data.taxableIncome), fmt(data.taxableIncome), true);
  drawRow('20', '加计扣除（填A107020）', fmt(data.additionalDeduction), fmt(data.additionalDeduction));
  drawRow('21', '境外所得前弥补亏损（填A106000）', fmt(data.overseasLossCarryforward), fmt(data.overseasLossCarryforward));
  drawRow('22', '境外应税所得额减除（填A107030）', fmt(data.overseasTaxableDeduction), fmt(data.overseasTaxableDeduction));
  drawRow('23', '应纳税所得额（=19-20-21-22）', fmt(data.finalTaxableIncome), fmt(data.finalTaxableIncome), true);
  drawLine();

  // Part 3: Tax amount calculation (lines 24-38)
  sectionHeader('三、税额的计算');
  drawRow('24', '税率', (data.taxRate * 100).toFixed(0) + '%', (data.taxRate * 100).toFixed(0) + '%');
  drawRow('25', '应纳所得税额（=23×24）', fmt(data.taxPayable), fmt(data.taxPayable));
  drawRow('26', '减免所得税（填A107040）', fmt(data.taxReduction), fmt(data.taxReduction));
  drawRow('27', '减（免）税额（填A107050）', fmt(data.taxExemption), fmt(data.taxExemption));
  drawRow('28', '应纳税额（=25-26-27）', fmt(data.taxAmount), fmt(data.taxAmount), true);
  drawRow('29', '实际抵免所得税额（填A108000）', fmt(data.taxCredit), fmt(data.taxCredit));
  drawRow('30', '以前年度多缴税额（填A108000）', fmt(data.priorYearOverpaid), fmt(data.priorYearOverpaid));
  drawRow('31', '实际应补（退）所得税额（=28+29-30）', fmt(data.actualTaxDue), fmt(data.actualTaxDue), true);
  drawRow('32', '以前年度应补（退）所得税额', fmt(data.priorYearTaxDue), fmt(data.priorYearTaxDue));
  drawRow('33', '本期实际应补（退）所得税额（=31-32）', fmt(data.currentTaxDue), fmt(data.currentTaxDue), true);
  drawRow('34', '其中：高新技术企业减免所得税（填A109000）', fmt(data.highTechTaxReduction), fmt(data.highTechTaxReduction));
  drawRow('35', '其中：技术先进型服务企业所得税减免（填A109000）', fmt(data.advancedServiceTaxReduction), fmt(data.advancedServiceTaxReduction));
  drawRow('36', '其中：国家级技术转移示范机构减免（填A109000）', fmt(data.techTransferTaxReduction), fmt(data.techTransferTaxReduction));
  drawRow('37', '实际应纳税额比例（兵团/地方）', fmt(data.taxRatio), fmt(data.taxRatio));
  drawRow('38', '实际应补（退）所得税额（=33-37）', fmt(data.finalTaxDue), fmt(data.finalTaxDue), true);

  yPos += rowHeight;

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text('经办人（签章）：________________    复核人（签章）：________________', margin, yPos);
  yPos += 4;
  doc.text('代理申报人（签章）：________________    代理机构（签章）：________________', margin, yPos);
  yPos += 4;
  doc.text('申报日期：' + data.reportDate, margin, yPos);
  doc.setFontSize(6.5);
  doc.text('A100000', pageWidth - margin - 12, pageHeight - 4);

  return doc.output('blob');
}
/**
 * 生成A101010收入明细表PDF
 */
export function generateA101010PDF(data: A101010Data): Blob {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let yPos = margin;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('一般企业收入明细表', pageWidth / 2, yPos, { align: 'center' });
  yPos += 6;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`企业名称：${data.companyName}`, margin, yPos);
  doc.text(`税务年度：${data.taxYear}年度`, pageWidth - margin - 40, yPos);
  yPos += 10;

  doc.setLineWidth(0.3);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 4;

  const formatNum = (n: number) => n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  doc.setFontSize(8);
  const col1 = 90, col2 = 40, col3 = 40;

  // 表头
  doc.setFont('helvetica', 'bold');
  doc.text('项目', margin, yPos);
  doc.text('金额', margin + col1, yPos);
  yPos += 5;

  doc.setFont('helvetica', 'normal');
  doc.line(margin, yPos, margin + col1 + col2, yPos);
  yPos += 3;

  // 主营业务收入
  doc.setFont('helvetica', 'bold');
  doc.text('一、主营业务收入', margin, yPos);
  yPos += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(`货物销售收入：`, margin + 5, yPos);
  doc.text(formatNum(data.mainRevenueProduct), margin + col1, yPos);
  yPos += 5;
  doc.text(`提供劳务收入：`, margin + 5, yPos);
  doc.text(formatNum(data.mainRevenueLabor), margin + col1, yPos);
  yPos += 5;
  doc.text(`建造工程收入：`, margin + 5, yPos);
  doc.text(formatNum(data.mainRevenueConstruction), margin + col1, yPos);
  yPos += 5;
  doc.text(`让渡资产使用权收入：`, margin + 5, yPos);
  doc.text(formatNum(data.mainRevenueProperty), margin + col1, yPos);
  yPos += 5;
  doc.text(`其他主营业务收入：`, margin + 5, yPos);
  doc.text(formatNum(data.mainRevenueOther), margin + col1, yPos);
  yPos += 5;

  doc.setFont('helvetica', 'bold');
  doc.text(`主营业务收入合计：`, margin, yPos);
  doc.text(formatNum(data.mainRevenueTotal), margin + col1, yPos);
  yPos += 8;

  // 其他业务收入
  doc.setFont('helvetica', 'bold');
  doc.text('二、其他业务收入', margin, yPos);
  yPos += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(`材料销售收入：`, margin + 5, yPos);
  doc.text(formatNum(data.otherRevenueMaterial), margin + col1, yPos);
  yPos += 5;
  doc.text(`提供劳务收入：`, margin + 5, yPos);
  doc.text(formatNum(data.otherRevenueLabor), margin + col1, yPos);
  yPos += 5;
  doc.text(`让渡资产使用权收入：`, margin + 5, yPos);
  doc.text(formatNum(data.otherRevenueProperty), margin + col1, yPos);
  yPos += 5;
  doc.text(`其他其他业务收入：`, margin + 5, yPos);
  doc.text(formatNum(data.otherRevenueOther), margin + col1, yPos);
  yPos += 5;

  doc.setFont('helvetica', 'bold');
  doc.text(`其他业务收入合计：`, margin, yPos);
  doc.text(formatNum(data.otherRevenueTotal), margin + col1, yPos);
  yPos += 8;

  // 营业收入总计
  doc.line(margin, yPos, margin + col1 + col2, yPos);
  yPos += 3;
  doc.setFont('helvetica', 'bold');
  doc.text('三、营业收入总计：', margin, yPos);
  doc.text(formatNum(data.revenueTotal), margin + col1, yPos);
  yPos += 10;

  // 签章
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`经办人（签章）：________________    复核人（签章）：________________`, margin, yPos);
  yPos += 5;
  doc.text(`申报日期：${data.reportDate}`, margin, yPos);

  doc.setFontSize(7);
  doc.text('A101010', pageWidth - margin - 15, pageHeight - 5);

  return doc.output('blob');
}

/**
 * 生成A102010成本支出明细表PDF
 */
export function generateA102010PDF(data: A102010Data): Blob {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let yPos = margin;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('一般企业成本支出明细表', pageWidth / 2, yPos, { align: 'center' });
  yPos += 6;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`企业名称：${data.companyName}`, margin, yPos);
  doc.text(`税务年度：${data.taxYear}年度`, pageWidth - margin - 40, yPos);
  yPos += 10;

  doc.setLineWidth(0.3);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 4;

  const formatNum = (n: number) => n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  doc.setFontSize(8);
  const col1 = 90, col2 = 40;

  // 表头
  doc.setFont('helvetica', 'bold');
  doc.text('项目', margin, yPos);
  doc.text('金额', margin + col1, yPos);
  yPos += 5;

  doc.setFont('helvetica', 'normal');
  doc.line(margin, yPos, margin + col1 + col2, yPos);
  yPos += 3;

  // 主营业务成本
  doc.setFont('helvetica', 'bold');
  doc.text('一、主营业务成本', margin, yPos);
  yPos += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(`货物销售成本：`, margin + 5, yPos);
  doc.text(formatNum(data.mainCostProduct), margin + col1, yPos);
  yPos += 5;
  doc.text(`提供劳务成本：`, margin + 5, yPos);
  doc.text(formatNum(data.mainCostLabor), margin + col1, yPos);
  yPos += 5;
  doc.text(`建造工程成本：`, margin + 5, yPos);
  doc.text(formatNum(data.mainCostConstruction), margin + col1, yPos);
  yPos += 5;
  doc.text(`让渡资产使用权成本：`, margin + 5, yPos);
  doc.text(formatNum(data.mainCostProperty), margin + col1, yPos);
  yPos += 5;
  doc.text(`其他主营业务成本：`, margin + 5, yPos);
  doc.text(formatNum(data.mainCostOther), margin + col1, yPos);
  yPos += 5;

  doc.setFont('helvetica', 'bold');
  doc.text(`主营业务成本合计：`, margin, yPos);
  doc.text(formatNum(data.mainCostTotal), margin + col1, yPos);
  yPos += 8;

  // 其他业务支出
  doc.setFont('helvetica', 'bold');
  doc.text('二、其他业务支出', margin, yPos);
  yPos += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(`材料销售成本：`, margin + 5, yPos);
  doc.text(formatNum(data.otherCostMaterial), margin + col1, yPos);
  yPos += 5;
  doc.text(`提供劳务成本：`, margin + 5, yPos);
  doc.text(formatNum(data.otherCostLabor), margin + col1, yPos);
  yPos += 5;
  doc.text(`让渡资产使用权成本：`, margin + 5, yPos);
  doc.text(formatNum(data.otherCostProperty), margin + col1, yPos);
  yPos += 5;
  doc.text(`其他其他业务成本：`, margin + 5, yPos);
  doc.text(formatNum(data.otherCostOther), margin + col1, yPos);
  yPos += 5;

  doc.setFont('helvetica', 'bold');
  doc.text(`其他业务成本合计：`, margin, yPos);
  doc.text(formatNum(data.otherCostTotal), margin + col1, yPos);
  yPos += 8;

  // 营业成本总计
  doc.line(margin, yPos, margin + col1 + col2, yPos);
  yPos += 3;
  doc.setFont('helvetica', 'bold');
  doc.text('三、营业成本总计：', margin, yPos);
  doc.text(formatNum(data.costTotal), margin + col1, yPos);
  yPos += 8;

  // 期间费用
  doc.setFont('helvetica', 'bold');
  doc.text('四、期间费用', margin, yPos);
  yPos += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(`销售费用：`, margin + 5, yPos);
  doc.text(formatNum(data.sellingExpense), margin + col1, yPos);
  yPos += 5;
  doc.text(`管理费用：`, margin + 5, yPos);
  doc.text(formatNum(data.managementExpense), margin + col1, yPos);
  yPos += 5;
  doc.text(`财务费用：`, margin + 5, yPos);
  doc.text(formatNum(data.financialExpense), margin + col1, yPos);
  yPos += 5;

  doc.setFont('helvetica', 'bold');
  doc.text(`期间费用合计：`, margin, yPos);
  doc.text(formatNum(data.periodExpenseTotal), margin + col1, yPos);
  yPos += 10;

  // 签章
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`经办人（签章）：________________    复核人（签章）：________________`, margin, yPos);
  yPos += 5;
  doc.text(`申报日期：${data.reportDate}`, margin, yPos);

  doc.setFontSize(7);
  doc.text('A102010', pageWidth - margin - 15, pageHeight - 5);

  return doc.output('blob');
}

/**
 * 生成A105000纳税调整项目明细表PDF
 */
export function generateA105000PDF(data: A105000Data): Blob {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let yPos = margin;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('纳税调整项目明细表', pageWidth / 2, yPos, { align: 'center' });
  yPos += 6;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`企业名称：${data.companyName}`, margin, yPos);
  doc.text(`税务年度：${data.taxYear}年度`, pageWidth - margin - 40, yPos);
  yPos += 10;

  doc.setLineWidth(0.3);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 4;

  const formatNum = (n: number) => n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const col1 = 50, col2 = 35, col3 = 35, col4 = 35;

  doc.setFontSize(8);

  // 表头
  doc.setFont('helvetica', 'bold');
  doc.text('项目', margin, yPos);
  doc.text('账载金额', margin + col1, yPos);
  doc.text('纳税调增', margin + col1 + col2, yPos);
  doc.text('纳税调减', margin + col1 + col2 + col3, yPos);
  yPos += 5;

  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 3;

  // 收入类调整
  if (data.revenueAdjustments.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.text('一、收入类调整项目', margin, yPos);
    yPos += 5;

    doc.setFont('helvetica', 'normal');
    data.revenueAdjustments.forEach(item => {
      doc.text(`${item.account}：`, margin + 5, yPos);
      doc.text(formatNum(item.taxIncrease), margin + col1, yPos);
      doc.text(item.taxIncrease > 0 ? formatNum(item.taxIncrease) : '-', margin + col1 + col2, yPos);
      doc.text(item.taxDecrease > 0 ? formatNum(item.taxDecrease) : '-', margin + col1 + col2 + col3, yPos);
      yPos += 5;
    });
    yPos += 3;
  }

  // 扣除类调整
  if (data.expenseAdjustments.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.text('二、扣除类调整项目', margin, yPos);
    yPos += 5;

    doc.setFont('helvetica', 'normal');
    data.expenseAdjustments.forEach(item => {
      doc.text(`${item.account}：`, margin + 5, yPos);
      doc.text(formatNum(item.amount), margin + col1, yPos);
      doc.text(item.taxIncrease > 0 ? formatNum(item.taxIncrease) : '-', margin + col1 + col2, yPos);
      doc.text(item.taxDecrease > 0 ? formatNum(item.taxDecrease) : '-', margin + col1 + col2 + col3, yPos);
      yPos += 5;
    });
    yPos += 3;
  }

  // 资产类调整
  if (data.assetAdjustments.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.text('三、资产类调整项目', margin, yPos);
    yPos += 5;

    doc.setFont('helvetica', 'normal');
    data.assetAdjustments.forEach(item => {
      doc.text(`${item.account}：`, margin + 5, yPos);
      doc.text(formatNum(item.amount), margin + col1, yPos);
      doc.text(item.taxIncrease > 0 ? formatNum(item.taxIncrease) : '-', margin + col1 + col2, yPos);
      doc.text(item.taxDecrease > 0 ? formatNum(item.taxDecrease) : '-', margin + col1 + col2 + col3, yPos);
      yPos += 5;
    });
    yPos += 3;
  }

  // 合计
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 3;
  doc.setFont('helvetica', 'bold');
  doc.text('合计', margin, yPos);
  doc.text(formatNum(data.totalIncrease), margin + col1 + col2, yPos);
  doc.text(formatNum(data.totalDecrease), margin + col1 + col2 + col3, yPos);
  yPos += 10;

  // 签章
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`经办人（签章）：________________    复核人（签章）：________________`, margin, yPos);
  yPos += 5;
  doc.text(`申报日期：${data.reportDate}`, margin, yPos);

  doc.setFontSize(7);
  doc.text('A105000', pageWidth - margin - 15, pageHeight - 5);

  return doc.output('blob');
}

/**
 * 生成A105050职工薪酬支出及纳税调整明细表PDF
 */
export function generateA105050PDF(data: A105050Data): Blob {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let yPos = margin;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('职工薪酬支出及纳税调整明细表', pageWidth / 2, yPos, { align: 'center' });
  yPos += 6;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`企业名称：${data.companyName}`, margin, yPos);
  doc.text(`税务年度：${data.taxYear}年度`, pageWidth - margin - 40, yPos);
  yPos += 10;

  doc.setLineWidth(0.3);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 4;

  const formatNum = (n: number) => n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const col1 = 60, col2 = 40, col3 = 40;

  doc.setFontSize(8);

  // 表头
  doc.setFont('helvetica', 'bold');
  doc.text('项目', margin, yPos);
  doc.text('实际发生额', margin + col1, yPos);
  doc.text('税收规定扣除限额', margin + col1 + col2, yPos);
  doc.text('纳税调整', margin + col1 + col2 + col3, yPos);
  yPos += 5;

  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 3;

  doc.setFont('helvetica', 'normal');
  doc.text(`工资薪金：`, margin + 5, yPos);
  doc.text(formatNum(data.wages), margin + col1, yPos);
  doc.text('-', margin + col1 + col2, yPos);
  doc.text('-', margin + col1 + col2 + col3, yPos);
  yPos += 5;

  doc.text(`职工福利费：`, margin + 5, yPos);
  doc.text(formatNum(data.welfare), margin + col1, yPos);
  doc.text(formatNum(data.welfareLimit), margin + col1 + col2, yPos);
  doc.text(data.welfare > data.welfareLimit ? formatNum(data.welfare - data.welfareLimit) : '-', margin + col1 + col2 + col3, yPos);
  yPos += 5;

  doc.text(`工会经费：`, margin + 5, yPos);
  doc.text(formatNum(data.unionFund), margin + col1, yPos);
  doc.text(formatNum(data.unionFundLimit), margin + col1 + col2, yPos);
  doc.text(data.unionFund > data.unionFundLimit ? formatNum(data.unionFund - data.unionFundLimit) : '-', margin + col1 + col2 + col3, yPos);
  yPos += 5;

  doc.text(`职工教育经费：`, margin + 5, yPos);
  doc.text(formatNum(data.educationExpense), margin + col1, yPos);
  doc.text(formatNum(data.educationExpenseLimit), margin + col1 + col2, yPos);
  doc.text(data.educationExpense > data.educationExpenseLimit ? formatNum(data.educationExpense - data.educationExpenseLimit) : '-', margin + col1 + col2 + col3, yPos);
  yPos += 5;

  doc.text(`社会保险费：`, margin + 5, yPos);
  doc.text(formatNum(data.socialInsurance), margin + col1, yPos);
  doc.text('-', margin + col1 + col2, yPos);
  doc.text('-', margin + col1 + col2 + col3, yPos);
  yPos += 5;

  doc.text(`住房公积金：`, margin + 5, yPos);
  doc.text(formatNum(data.housingFund), margin + col1, yPos);
  doc.text('-', margin + col1 + col2, yPos);
  doc.text('-', margin + col1 + col2 + col3, yPos);
  yPos += 5;

  doc.text(`劳务派遣费：`, margin + 5, yPos);
  doc.text(formatNum(data.laborService), margin + col1, yPos);
  doc.text('-', margin + col1 + col2, yPos);
  doc.text('-', margin + col1 + col2 + col3, yPos);
  yPos += 5;

  doc.text(`其他：`, margin + 5, yPos);
  doc.text(formatNum(data.other), margin + col1, yPos);
  doc.text('-', margin + col1 + col2, yPos);
  doc.text('-', margin + col1 + col2 + col3, yPos);
  yPos += 5;

  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 3;
  doc.setFont('helvetica', 'bold');
  doc.text(`合计`, margin, yPos);
  doc.text(formatNum(data.total), margin + col1, yPos);
  yPos += 10;

  // 签章
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`经办人（签章）：________________    复核人（签章）：________________`, margin, yPos);
  yPos += 5;
  doc.text(`申报日期：${data.reportDate}`, margin, yPos);

  doc.setFontSize(7);
  doc.text('A105050', pageWidth - margin - 15, pageHeight - 5);

  return doc.output('blob');
}

/**
 * 生成A107012研发费用加计扣除优惠明细表PDF
 */
export function generateA107012PDF(data: A107012Data): Blob {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let yPos = margin;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('研发费用加计扣除优惠明细表', pageWidth / 2, yPos, { align: 'center' });
  yPos += 6;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`企业名称：${data.companyName}`, margin, yPos);
  doc.text(`税务年度：${data.taxYear}年度`, pageWidth - margin - 40, yPos);
  yPos += 10;

  doc.setLineWidth(0.3);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 4;

  const formatNum = (n: number) => n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const col1 = 80, col2 = 40;

  doc.setFontSize(8);

  // 表头
  doc.setFont('helvetica', 'bold');
  doc.text('项目', margin, yPos);
  doc.text('金额', margin + col1, yPos);
  yPos += 5;

  doc.line(margin, yPos, margin + col1 + col2, yPos);
  yPos += 3;

  // 研发费用明细
  doc.setFont('helvetica', 'bold');
  doc.text('一、研发费用明细', margin, yPos);
  yPos += 5;

  doc.setFont('helvetica', 'normal');
  doc.text(`人员人工费用：`, margin + 5, yPos);
  doc.text(formatNum(data.rdPersonnel), margin + col1, yPos);
  yPos += 5;

  doc.text(`直接材料费用：`, margin + 5, yPos);
  doc.text(formatNum(data.rdDirectMaterials), margin + col1, yPos);
  yPos += 5;

  doc.text(`折旧费用：`, margin + 5, yPos);
  doc.text(formatNum(data.rdDepreciation), margin + col1, yPos);
  yPos += 5;

  doc.text(`无形资产摊销费用：`, margin + 5, yPos);
  doc.text(formatNum(data.rdAmortization), margin + col1, yPos);
  yPos += 5;

  doc.text(`中间试验费用：`, margin + 5, yPos);
  doc.text(formatNum(data.rdTrialExpenses), margin + col1, yPos);
  yPos += 5;

  doc.text(`其他相关费用：`, margin + 5, yPos);
  doc.text(formatNum(data.rdOther), margin + col1, yPos);
  yPos += 5;

  doc.setFont('helvetica', 'bold');
  doc.text(`研发费用合计：`, margin, yPos);
  doc.text(formatNum(data.rdTotal), margin + col1, yPos);
  yPos += 8;

  // 加计扣除
  doc.setFont('helvetica', 'bold');
  doc.text('二、加计扣除', margin, yPos);
  yPos += 5;

  doc.setFont('helvetica', 'normal');
  doc.text(`加计扣除比例：`, margin + 5, yPos);
  doc.text(`${(data.additionalDeductionRate * 100).toFixed(0)}%`, margin + col1, yPos);
  yPos += 5;

  doc.text(`加计扣除金额：`, margin + 5, yPos);
  doc.text(formatNum(data.additionalDeduction), margin + col1, yPos);
  yPos += 8;

  // 委托研发
  doc.setFont('helvetica', 'bold');
  doc.text('三、委托研发', margin, yPos);
  yPos += 5;

  doc.setFont('helvetica', 'normal');
  doc.text(`委托研发费用：`, margin + 5, yPos);
  doc.text(formatNum(data.commissionedRd), margin + col1, yPos);
  yPos += 5;

  doc.text(`委托研发可加计扣除：`, margin + 5, yPos);
  doc.text(formatNum(data.commissionedDeduction), margin + col1, yPos);
  yPos += 10;

  // 签章
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`经办人（签章）：________________    复核人（签章）：________________`, margin, yPos);
  yPos += 5;
  doc.text(`申报日期：${data.reportDate}`, margin, yPos);

  doc.setFontSize(7);
  doc.text('A107012', pageWidth - margin - 15, pageHeight - 5);

  return doc.output('blob');
}

export default {
  generateA100000FullPDF,
  generateA101010PDF,
  generateA102010PDF,
  generateA105000PDF,
  generateA105050PDF,
  generateA107012PDF,
};
