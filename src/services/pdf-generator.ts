/**
 * PDF生成服务 - PDF Generator Service
 * 核心功能：生成税务审计报告PDF、企业所得税申报表
 */

import { jsPDF } from 'jspdf';
import { ReportData, FILING_FORMS, FORM_DESCRIPTIONS } from '../utils/report-engine';

// 注册中文字体（使用内置 Helvetica 的中文映射）
// 由于 jsPDF 不原生支持中文，我们需要嵌入一个简化的解决方案

interface PDFOptions {
  title?: string;
  author?: string;
  companyLogo?: boolean;
}

/**
 * 生成税务审计报告PDF
 */
export function generateAuditReportPDF(data: ReportData, options: PDFOptions = {}): Blob {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPos = margin;

  // 标题
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('企业所得税汇算清缴风险自审报告', pageWidth / 2, yPos, { align: 'center' });
  yPos += 12;

  // 报告信息
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`报告编号：${data.companyName}-${data.taxYear}-001`, margin, yPos);
  yPos += 5;
  doc.text(`企业名称：${data.companyName}`, margin, yPos);
  yPos += 5;
  doc.text(`税务年度：${data.taxYear}年度`, margin, yPos);
  yPos += 5;
  doc.text(`报告日期：${data.reportDate}`, margin, yPos);
  yPos += 10;

  // 分隔线
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;

  // 一、健康评分
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('一、健康评分', margin, yPos);
  yPos += 8;

  const riskColor = data.riskLevel === 'high' ? [220, 53, 69] : data.riskLevel === 'medium' ? [255, 193, 7] : [40, 167, 69];
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`风险等级：${data.riskLevel === 'high' ? '高风险' : data.riskLevel === 'medium' ? '中等风险' : '低风险'}`, margin, yPos);
  yPos += 6;
  doc.text(`综合评分：${data.riskScore}/100`, margin, yPos);
  yPos += 10;

  // 风险统计
  doc.setFontSize(10);
  doc.text(`高风险：${data.riskCount.high} 项    中风险：${data.riskCount.medium} 项    低风险：${data.riskCount.low} 项`, margin, yPos);
  yPos += 10;

  // 二、财务概况
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('二、财务概况', margin, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const financialData = [
    ['营业收入', `${data.revenue.toLocaleString()} 万元`],
    ['营业成本', `${data.cost.toLocaleString()} 万元`],
    ['毛利', `${data.grossProfit.toLocaleString()} 万元`],
    ['期间费用', `${data.totalExpense.toLocaleString()} 万元`],
    ['营业利润', `${data.operatingProfit.toLocaleString()} 万元`],
    ['利润总额', `${data.totalProfit.toLocaleString()} 万元`],
    ['净利润', `${data.netProfit.toLocaleString()} 万元`],
  ];

  financialData.forEach(([label, value]) => {
    doc.text(`${label}：${value}`, margin, yPos);
    yPos += 5;
  });
  yPos += 5;

  // 三、应纳税所得额计算
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('三、应纳税所得额计算', margin, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`利润总额：${data.totalProfit.toLocaleString()} 万元`, margin, yPos);
  yPos += 5;
  doc.text(`加：纳税调增金额：${data.totalIncrease.toLocaleString()} 万元`, margin, yPos);
  yPos += 5;
  doc.text(`减：纳税调减金额：${data.totalDecrease.toLocaleString()} 万元`, margin, yPos);
  yPos += 5;
  doc.setFont('helvetica', 'bold');
  doc.text(`应纳税所得额：${data.taxableIncome.toLocaleString()} 万元`, margin, yPos);
  yPos += 10;

  // 四、应纳税额计算
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('四、应纳税额计算', margin, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`应纳税所得额：${data.taxableIncome.toLocaleString()} 万元`, margin, yPos);
  yPos += 5;
  const taxRateDisplay = data.slpeQualification?.eligible ? `${(data.slpeQualification.taxRate * 100).toFixed(0)}%（小微优惠）` : `${(data.taxRate * 100).toFixed(0)}%`;
  doc.text(`适用税率：${taxRateDisplay}`, margin, yPos);
  yPos += 5;
  doc.text(`应纳所得税额：${data.taxPayable.toLocaleString()} 万元`, margin, yPos);
  yPos += 5;
  doc.text(`已预缴税额：${data.taxPrepaid.toLocaleString()} 万元`, margin, yPos);
  yPos += 5;
  const taxDue = data.taxPayable - data.taxPrepaid;
  doc.setFont('helvetica', 'bold');
  doc.text(`应补（退）税额：${taxDue > 0 ? '+' : ''}${taxDue.toLocaleString()} 万元`, margin, yPos);
  yPos += 10;

  // 小微优惠信息
  if (data.slpeQualification?.eligible) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('小型微利企业优惠', margin, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`优惠税率：${(data.slpeQualification.taxRate * 100).toFixed(0)}%`, margin, yPos);
    yPos += 5;
    doc.text(`节税金额：${data.slpeQualification.taxSavings.toLocaleString()} 万元`, margin, yPos);
    yPos += 5;
    doc.text(`优惠依据：${data.slpeQualification.reason}`, margin, yPos);
    yPos += 10;
  }

  // 五、纳税调整明细
  if (data.adjustments.length > 0) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('五、纳税调整明细', margin, yPos);
    yPos += 8;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    data.adjustments.forEach((adj, i) => {
      if (yPos > pageHeight - 30) {
        doc.addPage();
        yPos = margin;
      }
      doc.text(`${i + 1}. ${adj.account}`, margin, yPos);
      yPos += 5;
      doc.text(`   发生金额：${adj.amount.toLocaleString()} 万元    调整金额：${adj.adjustment > 0 ? '+' : ''}${adj.adjustment.toLocaleString()} 万元`, margin, yPos);
      yPos += 5;
      doc.text(`   法规依据：${adj.legalBasis}`, margin, yPos);
      yPos += 7;
    });
  }

  // 六、下一步行动
  if (yPos > pageHeight - 40) {
    doc.addPage();
    yPos = margin;
  }
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('六、下一步行动', margin, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  if (data.riskCount.high > 0) {
    doc.text(`⚠ 请优先修复 ${data.riskCount.high} 项高风险问题`, margin, yPos);
  } else {
    doc.text('✅ 当前无高风险问题', margin, yPos);
  }
  yPos += 6;

  const actions = [
    '修复高风险项',
    '确认纳税调整数据',
    '补充相关凭证',
    '核对申报表勾稽关系',
    '确认无误后提交',
  ];
  actions.forEach((action, i) => {
    doc.text(`${i + 1}. [ ] ${action}`, margin, yPos);
    yPos += 5;
  });

  // 页脚
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`第 ${i} 页 / 共 ${totalPages} 页`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    doc.text('本报告仅供参考，不构成税务建议。如有疑问，请咨询专业税务顾问。', pageWidth / 2, pageHeight - 6, { align: 'center' });
  }

  return doc.output('blob');
}

/**
 * 生成A100000企业所得税年度纳税申报表
 */
export function generateA100000PDF(data: {
  companyName: string;
  taxYear: number;
  reportDate: string;
  taxableIncome: number;
  taxRate: number;
  taxPayable: number;
  totalProfit: number;
  totalRevenue: number;
  totalCost: number;
  totalExpense: number;
  slpeEligible?: boolean;
  slpeTaxRate?: number;
}): Blob {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let yPos = margin;

  // 标题
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('企业所得税年度纳税申报表（A类）', pageWidth / 2, yPos, { align: 'center' });
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`企业名称：${data.companyName}`, margin, yPos);
  doc.text(`税务年度：${data.taxYear}年度`, pageWidth - margin - 50, yPos);
  yPos += 10;

  // 分隔线
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;

  // 表头
  doc.setFontSize(9);
  const colWidths = [80, 40, 40, 40];
  const headers = ['项目', '账载金额', '纳税调整金额', '申报金额'];

  doc.setFont('helvetica', 'bold');
  headers.forEach((header, i) => {
    const x = margin + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
    doc.text(header, x, yPos);
  });
  yPos += 5;

  doc.setLineWidth(0.2);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 5;

  doc.setFont('helvetica', 'normal');

  // 表格数据 - A100000主表核心项目
  const tableData = [
    ['一、营业收入', data.totalRevenue.toLocaleString(), '', ''],
    ['减：营业成本', data.totalCost.toLocaleString(), '', ''],
    ['减：期间费用', data.totalExpense.toLocaleString(), '', ''],
    ['二、营业利润', (data.totalRevenue - data.totalCost - data.totalExpense).toLocaleString(), '', ''],
    ['加：营业外收入', '', '', ''],
    ['减：营业外支出', '', '', ''],
    ['三、利润总额', data.totalProfit.toLocaleString(), '', ''],
    ['加：纳税调整增加额', '', '', ''],
    ['减：纳税调整减少额', '', '', ''],
    ['减：弥补以前年度亏损', '', '', ''],
    ['四、应纳税所得额', data.taxableIncome.toLocaleString(), '', ''],
    ['税率', `${(data.taxRate * 100).toFixed(0)}%`, '', ''],
    ['五、应纳所得税额', data.taxPayable.toLocaleString(), '', ''],
  ];

  tableData.forEach((row) => {
    row.forEach((cell, i) => {
      const x = margin + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
      if (i === 0) {
        doc.setFont('helvetica', 'normal');
      } else {
        doc.setFont('helvetica', 'normal');
      }
      doc.text(cell, x + 2, yPos);
    });
    yPos += 6;
  });

  yPos += 5;
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;

  // 小微优惠信息
  if (data.slpeEligible) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('小型微利企业优惠', margin, yPos);
    yPos += 6;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`优惠税率：${(data.slpeTaxRate || 0.05) * 100}%（应纳税所得额100万以下的部分，减按12.5%；100万-300万的部分，减按25%）`, margin, yPos);
    yPos += 5;
    doc.text('优惠条件：同时满足从业人数≤300人、资产总额≤5000万、应纳税所得额≤300万', margin, yPos);
    yPos += 10;
  }

  // 签章区
  doc.setLineWidth(0.2);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`经办人（签章）：________________    复核人（签章）：________________`, margin, yPos);
  yPos += 6;
  doc.text(`申报日期：${data.reportDate}`, margin, yPos);

  // 页脚
  doc.setFontSize(8);
  doc.text('A100000', pageWidth - margin - 15, pageHeight - 6);

  return doc.output('blob');
}

/**
 * 生成申报表单清单PDF
 */
export function generateFormsListPDF(data: {
  companyName: string;
  taxYear: number;
  reportDate: string;
  forms: string[];
}): Blob {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPos = margin;

  // 标题
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('企业所得税年度申报表单清单', pageWidth / 2, yPos, { align: 'center' });
  yPos += 12;

  // 企业信息
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`企业名称：${data.companyName}`, margin, yPos);
  yPos += 6;
  doc.text(`税务年度：${data.taxYear}年度`, margin, yPos);
  yPos += 6;
  doc.text(`编制日期：${data.reportDate}`, margin, yPos);
  yPos += 10;

  // 分隔线
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;

  // 表单列表
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('需填报的申报表单：', margin, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  data.forms.forEach((form, i) => {
    const description = FORM_DESCRIPTIONS[form] || form;
    doc.text(`${i + 1}. ${form} - ${description}`, margin + 5, yPos);
    yPos += 7;
  });

  yPos += 10;

  // 填报说明
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('填报说明：', margin, yPos);
  yPos += 8;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const instructions = [
    '1. 所有表单需填写完整，确保数据勾稽关系正确',
    '2. 主表A100000与附表数据需保持一致',
    '3. 涉及纳税调整的项目，需附相应说明及证据材料',
    '4. 小型微利企业需同时填报A101010小型微利企业优惠',
    '5. 高新技术企业需填报A107050高新技术企业优惠明细表',
    '6. 研发费用加计扣除需填报A107012研发费用加计扣除优惠明细表',
    '7. 提交前请仔细核对各项数据，确保真实、完整、准确',
  ];

  instructions.forEach((instruction) => {
    doc.text(instruction, margin, yPos);
    yPos += 6;
  });

  // 页脚
  doc.setFontSize(8);
  doc.text('本清单一式两份，企业留存一份，报送税务机关一份。', pageWidth / 2, pageHeight - 10, { align: 'center' });

  return doc.output('blob');
}

/**
 * 保存PDF到本地（触发浏览器下载）
 */
export function downloadPDF(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 获取PDF的ArrayBuffer（用于Electron主进程保存）
 */
export async function getPDFArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  return await blob.arrayBuffer();
}

export default {
  generateAuditReportPDF,
  generateA100000PDF,
  generateFormsListPDF,
  downloadPDF,
  getPDFArrayBuffer,
};
