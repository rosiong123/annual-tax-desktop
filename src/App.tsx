import { useState, useEffect } from 'react';
import { FileUp, Search, Brain, Lightbulb, Send, CheckCircle, AlertCircle, AlertTriangle, ChevronRight, Upload, Download, Wifi, WifiOff, Settings, FileSpreadsheet, Database, Shield, FileWarning, BadgeCheck, Sparkles, X, Loader, Calendar, TrendingDown, DollarSign, BarChart3, FileText, Clock, Zap, Target, ShieldCheck, FileBadge } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import AISettings from './components/AISettings';
import ExcelImporter from './components/ExcelImporter';
import FinanceConnect from './components/FinanceConnect';
import TaxSystemConnect from './components/TaxSystemConnect';
import PeriodSelector, { TaxPeriod, formatTaxPeriod } from './components/PeriodSelector';
import { runMultiPeriodAudit, generateFilingForms, getCurrentTaxPeriod } from './utils/multi-period-audit';
import { runFullTaxAnalysis, generateOptimizationSuggestions } from './utils/tax-analysis-integration';
import { analyzeTax } from './utils/tax-service';
import { generateAuditReportPDF, generateA100000PDF, generateFormsListPDF, downloadPDF } from './services/pdf-generator';
import { AuditResult, AnalysisResult, OptimizationResult, FilingData, ImportedFileMeta, useDataStore } from './stores/dataStore';
import DrillDownAnalysis from './components/DrillDownAnalysis';
import FileTable from './components/FileTable';
import { generateAnalysisMetrics, ImportedFileWithData } from './utils/MockAnalysisService';

type Step = 'import' | 'audit' | 'analyze' | 'optimize' | 'file';
type AuditPhase = 'idle' | 'L1' | 'L3' | 'SLPE' | 'Final';

interface AppState {
  currentStep: Step;
  excelData: any;  // eslint-disable-line @typescript-eslint/no-explicit-any
  auditResult: any;  // eslint-disable-line @typescript-eslint/no-explicit-any
  analysisResult: any;  // eslint-disable-line @typescript-eslint/no-explicit-any
  optimizationResult: any;  // eslint-disable-line @typescript-eslint/no-explicit-any
  filingData: any;  // eslint-disable-line @typescript-eslint/no-explicit-any
  isProcessing: boolean;
  isOnline: boolean;
  currentPeriod: TaxPeriod;
  companyInfo: { name: string; taxId: string; industry: string };
  auditPhase: AuditPhase;
  terminalLogs: string[];
}

// 模拟数据 - 支持多周期
const mockFinancialData = {
  taxableIncome: 3250000,
  revenue: 15000000,
  totalWages: 3600000,
  rdLaborCost: 800000,
  rdOtherCost: 60000,
  businessEntertainment: 150000,
  trainingExpense: 350000,
  employeeCount: 150,
  totalAssets: 45000000,
  prepaidTax: 812500,
  taxRate: 0.25,
  A107012_rdExpense: 860000,
  A105050_wages: 3600000,
  // 月度专用
  unverifiedInputTax: 0,
  outputTax: 180000,
  billedTax: 180000,
  nonDeductibleItems: 0,
  // 季度专用
  unbilledRevenue: 0,
};

const mockAnalysisResult = {
  taxBurden: { currentRate: 2.81, industryAverage: 3.0, assessment: 'normal' },
  riskAnalysis: { overallRisk: 45, highRisk: [{ title: '毛利率异常偏低', severity: 'high' }], mediumRisk: [{ title: '管理费用率偏高', severity: 'medium' }], lowRisk: [] },
  complianceAnalysis: { isCompliant: true, completeness: 85 }
};

const mockOptimizationResult = {
  estimatedSavings: 285000,
  suggestions: [
    { id: 'opt-001', title: '小微企业税收优惠', priority: 'high', estimatedSavings: 650000, description: '符合小微企业条件，可享受5%实际税负率优惠', implementation: { steps: ['确认符合小微企业条件', '在电子税务局选择小微企业优惠'] } },
    { id: 'opt-002', title: '研发费用加计扣除', priority: 'high', estimatedSavings: 120000, description: '研发费用800,000元，可加计扣除75%', implementation: { steps: ['确认研发费用归集正确', '在A107012表填列加计扣除'] } },
    { id: 'opt-003', title: '业务招待费优化', priority: 'medium', estimatedSavings: 5000, description: '优化招待方式，降低超限额部分', implementation: { steps: ['改用礼品馈赠', '改为业务交流活动'] } }
  ]
};

function App() {
  const [state, setState] = useState<AppState>({
    currentStep: 'import',
    excelData: null,
    auditResult: null,
    analysisResult: null,
    optimizationResult: null,
    filingData: null,
    isProcessing: false,
    isOnline: true,
    currentPeriod: getCurrentTaxPeriod(),
    companyInfo: { name: '', taxId: '', industry: '制造业' },
    auditPhase: 'idle',
    terminalLogs: []
  });

  const [dragActive, setDragActive] = useState(false);
  const [showAISettings, setShowAISettings] = useState(false);
  const [selectedAIModel, setSelectedAIModel] = useState('gpt-5.4-pro');
  const [importTab, setImportTab] = useState<'excel' | 'finance' | 'tax'>('excel');
  const [importedData, setImportedData] = useState<any>(null);
  const [showExitFullscreenHint, setShowExitFullscreenHint] = useState(false);

  const handleExitFullscreen = () => {
    // 优先使用Electron API
    if (window.electronAPI?.exitFullscreen) {
      window.electronAPI.exitFullscreen();
    }
    // 使用浏览器API
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if ((document as any).webkitExitFullscreen) {
      (document as any).webkitExitFullscreen();
    }
  };

  // 监听全屏状态变化 - 使用Electron事件
  useEffect(() => {
    const api = window.electronAPI;

    // 添加ESC键监听退出全屏
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        console.log('ESC pressed, exiting fullscreen');
        handleExitFullscreen();
      }
    };

    // 添加点击空白处退出全屏
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // 如果点击的是body或者没有任何子元素的div，且当前在全屏状态
      if (target.tagName === 'BODY' || (target.classList && target.classList.contains('min-h-screen'))) {
        const isFullscreen = !!(document.fullscreenElement || (document as any).webkitFullscreenElement);
        if (isFullscreen) {
          console.log('Clicked on background, exiting fullscreen');
          handleExitFullscreen();
        }
      }
    };

    // 监听Electron全屏事件
    if (api?.onEnterFullscreen && api?.onLeaveFullscreen) {
      api.onEnterFullscreen(() => {
        console.log('Entered fullscreen');
        setShowExitFullscreenHint(true);
        setTimeout(() => setShowExitFullscreenHint(false), 3000);
      });
      api.onLeaveFullscreen(() => {
        console.log('Left fullscreen');
        setShowExitFullscreenHint(false);
      });
    } else {
      // 浏览器环境回退方案
      const handleFullscreenChange = () => {
        const isFullscreen = !!(document.fullscreenElement || (document as any).webkitFullscreenElement);
        console.log('Fullscreen change:', isFullscreen);
        if (isFullscreen) {
          setShowExitFullscreenHint(true);
          setTimeout(() => setShowExitFullscreenHint(false), 3000);
        } else {
          setShowExitFullscreenHint(false);
        }
      };
      document.addEventListener('fullscreenchange', handleFullscreenChange);
      document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    }

    // 注册所有事件监听器
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('click', handleClick);

    // 清理函数
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('click', handleClick);
    };
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setState(s => ({ ...s, excelData: mockFinancialData }));
    }
  };

  const runAudit = async () => {
    setState(s => ({ ...s, isProcessing: true, auditPhase: 'idle', terminalLogs: [] }));

    // 添加终端日志
    const addLog = (msg: string) => {
      setState(s => ({ ...s, terminalLogs: [...s.terminalLogs, `> ${msg}`] }));
    };

    // 获取财务数据
    const financialData = state.excelData || mockFinancialData;

    // 模拟多智能体决策流程
    addLog('正在初始化多周期税务审核引擎...');
    await new Promise(r => setTimeout(r, 600));

    // L1: 事实统一
    setState(s => ({ ...s, auditPhase: 'L1' }));
    addLog(`[L1] 正在统一 ${formatTaxPeriod(state.currentPeriod)} 财务数据...`);
    await new Promise(r => setTimeout(r, 800));

    // L3: 研产边界风险扫描
    setState(s => ({ ...s, auditPhase: 'L3' }));
    addLog(`[L3] 正在执行纳税调整与风险扫描...`);
    
    // 构建税务分析输入
    const taxInput = {
      revenue: financialData.revenue || 0,
      cost: financialData.cost || 0,
      grossProfit: financialData.grossProfit || (financialData.revenue - financialData.cost) || 0,
      totalExpense: financialData.totalExpense || 0,
      operatingProfit: financialData.operatingProfit || 0,
      totalProfit: financialData.totalProfit || financialData.taxableIncome || 0,
      netProfit: financialData.netProfit || 0,
      entertainment: financialData.businessEntertainment || 0,
      advertisement: financialData.advertisement || 0,
      welfareExpense: financialData.welfareExpense || 0,
      totalWages: financialData.totalWages || 0,
      taxableIncome: financialData.taxableIncome || financialData.totalProfit || 0,
      taxPayable: financialData.taxPayable || 0,
      taxPrepaid: financialData.prepaidTax || 0,
      employeeCount: financialData.employeeCount || 0,
      totalAssets: financialData.totalAssets || 0,
      financialItems: [
        { account: '业务招待费', amount: financialData.businessEntertainment || 0 },
        { account: '广告费', amount: financialData.advertisement || 0 },
        { account: '职工福利费', amount: financialData.welfareExpense || 0 },
        { account: '职工教育经费', amount: financialData.trainingExpense || 0 },
      ],
    };

    // 执行完整税务分析（纳税调整 + 风险扫描 + 小微优惠）
    const fullAnalysis = await runFullTaxAnalysis(taxInput, state.currentPeriod);

    await new Promise(r => setTimeout(r, 600));

    // SLPE: 小微优惠检测
    setState(s => ({ ...s, auditPhase: 'SLPE' }));
    if (fullAnalysis.slpe.eligible) {
      addLog(`[SLPE] ✓ 符合小微优惠条件，预计节税 ¥${fullAnalysis.slpe.taxSavings.toLocaleString()}`);
    } else {
      addLog(`[SLPE] ✗ 不符合小微优惠条件: ${fullAnalysis.slpe.reason}`);
    }
    await new Promise(r => setTimeout(r, 600));

    // Final: 裁决结项
    setState(s => ({ ...s, auditPhase: 'Final' }));
    addLog('[Final] 正在生成最终裁决报告...');

    await new Promise(r => setTimeout(r, 400));

    // 构建审计结果（兼容原有格式）
    const auditResult = {
      score: fullAnalysis.score,
      riskLevel: fullAnalysis.riskLevel,
      issues: fullAnalysis.issues.map((issue: any) => ({
        id: issue.id,
        title: issue.title,
        description: issue.description,
        severity: issue.severity,
        category: issue.category,
        amount: issue.amount || issue.adjustmentAmount || 0,
        suggestion: issue.suggestion,
        requiredEvidence: issue.severity === 'high' || issue.severity === 'critical' 
          ? [`${issue.title}相关凭证`]
          : [],
      })),
      evidenceScore: fullAnalysis.evidenceScore,
      summary: fullAnalysis.summary,
      slpeQualification: {
        eligible: fullAnalysis.slpe.eligible,
        taxRate: fullAnalysis.slpe.taxRate,
        savings: fullAnalysis.slpe.taxSavings,
        reason: fullAnalysis.slpe.reason,
      },
      adjustment: fullAnalysis.adjustment,
      risk: fullAnalysis.risk,
      taxCalculation: fullAnalysis.taxCalculation,
    };

    addLog(`审核完成。综合得分: ${fullAnalysis.score}/100`);
    addLog(`纳税调增: ¥${fullAnalysis.adjustment.totalIncrease.toLocaleString()}`);
    addLog(`应纳税额: ¥${fullAnalysis.taxCalculation.taxPayable.toLocaleString()}`);

    setState(s => ({ 
      ...s, 
      auditResult, 
      currentStep: 'audit', 
      isProcessing: false,
      analysisResult: {
        taxBurden: {
          currentRate: fullAnalysis.taxCalculation.taxRate * 100,
          industryAverage: 25,
          assessment: fullAnalysis.taxCalculation.taxRate < 0.25 ? '低于行业平均' : '正常',
        },
        riskAnalysis: {
          overallRisk: 100 - fullAnalysis.score,
          highRisk: fullAnalysis.risk.risks.filter((r: any) => r.level === 'high'),
          mediumRisk: fullAnalysis.risk.risks.filter((r: any) => r.level === 'medium'),
          lowRisk: fullAnalysis.risk.risks.filter((r: any) => r.level === 'low'),
        },
        complianceAnalysis: {
          isCompliant: fullAnalysis.evidenceScore.passed,
          completeness: fullAnalysis.evidenceScore.totalScore,
        },
      },
    }));
  };

  const runAnalysis = async () => {
    setState(s => ({ ...s, isProcessing: true }));
    await new Promise(r => setTimeout(r, 1500));

    // 使用真实导入数据和文件列表生成分析指标
    const importedFiles = useDataStore.getState().importedFiles;
    const filesWithData: ImportedFileWithData[] = importedFiles.map(f => ({
      id: f.id,
      name: f.name,
      data: importedData || {
        balanceSheet: { year: 2025, assets: 5000000, liabilities: 2000000, ownerEquity: 3000000, cash: 500000, accountsReceivable: 800000, inventory: 1000000, fixedAssets: 2000000, accountsPayable: 500000 },
        incomeStatement: { year: 2025, revenue: 8000000, costOfSales: 5600000, grossProfit: 2400000, operatingExpense: 800000, managementExpense: 600000, financialExpense: 100000, operatingProfit: 1000000, totalProfit: 900000, netProfit: 675000 },
        subjectBalances: [],
        invoices: [],
      },
    }));

    const metrics = generateAnalysisMetrics(filesWithData);

    setState(s => ({
      ...s,
      analysisResult: {
        taxBurden: {
          currentRate: 2.81,
          industryAverage: 3.0,
          assessment: 'normal',
        },
        riskAnalysis: {
          overallRisk: Math.round((metrics.taxRiskItems.filter(r => r.severity === 'high').length / Math.max(metrics.taxRiskItems.length, 1)) * 100),
          highRisk: metrics.taxRiskItems.filter(r => r.severity === 'high').map(r => ({ title: r.title, severity: 'high' })),
          mediumRisk: metrics.taxRiskItems.filter(r => r.severity === 'medium').map(r => ({ title: r.title, severity: 'medium' })),
          lowRisk: metrics.taxRiskItems.filter(r => r.severity === 'low').map(r => ({ title: r.title, severity: 'low' })),
        },
        complianceAnalysis: {
          isCompliant: metrics.taxRiskItems.filter(r => r.severity === 'high').length === 0,
          completeness: 85,
        },
      },
      currentStep: 'analyze',
      isProcessing: false,
    }));
  };

  const runOptimization = async () => {
    setState(s => ({ ...s, isProcessing: true }));
    
    // 获取财务数据
    const financialData = state.excelData || mockFinancialData;
    
    // 构建税务分析输入
    const taxInput = {
      revenue: financialData.revenue || 0,
      cost: financialData.cost || 0,
      grossProfit: financialData.grossProfit || (financialData.revenue - financialData.cost) || 0,
      totalExpense: financialData.totalExpense || 0,
      operatingProfit: financialData.operatingProfit || 0,
      totalProfit: financialData.totalProfit || financialData.taxableIncome || 0,
      netProfit: financialData.netProfit || 0,
      entertainment: financialData.businessEntertainment || 0,
      advertisement: financialData.advertisement || 0,
      welfareExpense: financialData.welfareExpense || 0,
      totalWages: financialData.totalWages || 0,
      taxableIncome: financialData.taxableIncome || financialData.totalProfit || 0,
      taxPayable: financialData.taxPayable || 0,
      taxPrepaid: financialData.prepaidTax || 0,
      employeeCount: financialData.employeeCount || 0,
      totalAssets: financialData.totalAssets || 0,
      financialItems: [
        { account: '业务招待费', amount: financialData.businessEntertainment || 0 },
        { account: '广告费', amount: financialData.advertisement || 0 },
        { account: '职工福利费', amount: financialData.welfareExpense || 0 },
        { account: '职工教育经费', amount: financialData.trainingExpense || 0 },
      ],
    };
    
    // 执行完整税务分析
    const fullAnalysis = await runFullTaxAnalysis(taxInput, state.currentPeriod);
    
    // 生成优化建议
    const suggestions = generateOptimizationSuggestions(fullAnalysis);
    
    // 计算总节税金额
    const estimatedSavings = suggestions.reduce((sum, s) => sum + (s.estimatedSavings || 0), 0);
    
    await new Promise(r => setTimeout(r, 800));
    setState(s => ({ 
      ...s, 
      optimizationResult: {
        estimatedSavings,
        suggestions,
      },
      currentStep: 'optimize', 
      isProcessing: false 
    }));
  };

  const generateFiling = async () => {
    setState(s => ({ ...s, isProcessing: true }));
    await new Promise(r => setTimeout(r, 1000));
    // 根据周期生成对应申报表
    const forms = generateFilingForms(state.currentPeriod, state.excelData || mockFinancialData);
    setState(s => ({ ...s, filingData: { forms, period: state.currentPeriod }, currentStep: 'file', isProcessing: false }));
  };

  // PDF导出处理函数
  const handleExportAuditReportPDF = () => {
    if (!state.auditResult) return;
    const financialData = state.excelData || mockFinancialData;
    const reportData = {
      companyName: state.companyInfo.name || '某科技有限公司',
      taxYear: state.currentPeriod.year,
      reportDate: new Date().toLocaleDateString('zh-CN'),
      revenue: financialData.revenue || 0,
      cost: financialData.cost || 0,
      grossProfit: financialData.grossProfit || (financialData.revenue - financialData.cost) || 0,
      totalExpense: financialData.totalExpense || 0,
      operatingProfit: financialData.operatingProfit || 0,
      totalProfit: financialData.totalProfit || financialData.taxableIncome || 0,
      netProfit: financialData.netProfit || 0,
      taxableIncome: financialData.taxableIncome || financialData.totalProfit || 0,
      taxPayable: state.auditResult.taxCalculation?.taxPayable || 0,
      taxPrepaid: financialData.prepaidTax || 0,
      taxRate: financialData.taxRate || 0.25,
      totalIncrease: state.auditResult.adjustment?.totalIncrease || 0,
      totalDecrease: state.auditResult.adjustment?.totalDecrease || 0,
      slpeQualification: state.auditResult.slpeQualification,
      riskScore: state.auditResult.score,
      riskLevel: state.auditResult.riskLevel,
      riskCount: {
        high: state.auditResult.risk?.risks?.filter((r: any) => r.level === 'high').length || 0,
        medium: state.auditResult.risk?.risks?.filter((r: any) => r.level === 'medium').length || 0,
        low: state.auditResult.risk?.risks?.filter((r: any) => r.level === 'low').length || 0,
      },
      adjustments: state.auditResult.adjustment?.items?.map((item: any) => ({
        account: item.account,
        amount: item.amount || 0,
        adjustment: item.adjustment || 0,
        legalBasis: item.legalBasis || '',
      })) || [],
    };
    const blob = generateAuditReportPDF(reportData);
    downloadPDF(blob, `税务审计报告_${state.currentPeriod.year}年度.pdf`);
  };

  const handleExportA100000PDF = () => {
    const financialData = state.excelData || mockFinancialData;
    const blob = generateA100000PDF({
      companyName: state.companyInfo.name || '某科技有限公司',
      taxYear: state.currentPeriod.year,
      reportDate: new Date().toLocaleDateString('zh-CN'),
      taxableIncome: financialData.taxableIncome || financialData.totalProfit || 0,
      taxRate: state.auditResult?.slpeQualification?.eligible ? 0.05 : 0.25,
      taxPayable: state.auditResult?.taxCalculation?.taxPayable || 0,
      totalProfit: financialData.totalProfit || financialData.taxableIncome || 0,
      totalRevenue: financialData.revenue || 0,
      totalCost: financialData.cost || 0,
      totalExpense: financialData.totalExpense || 0,
      slpeEligible: state.auditResult?.slpeQualification?.eligible,
      slpeTaxRate: state.auditResult?.slpeQualification?.taxRate,
    });
    downloadPDF(blob, `A100000企业所得税申报表_${state.currentPeriod.year}年度.pdf`);
  };

  const handleExportFormsListPDF = () => {
    if (!state.filingData) return;
    const blob = generateFormsListPDF({
      companyName: state.companyInfo.name || '某科技有限公司',
      taxYear: state.currentPeriod.year,
      reportDate: new Date().toLocaleDateString('zh-CN'),
      forms: state.filingData.forms,
    });
    downloadPDF(blob, `申报表单清单_${state.currentPeriod.year}年度.pdf`);
  };

  const steps = [
    { key: 'import', title: '数据导入', icon: FileUp },
    { key: 'audit', title: 'AI审核', icon: Search },
    { key: 'analyze', title: '分析报告', icon: Brain },
    { key: 'optimize', title: '优化方案', icon: Lightbulb },
    { key: 'file', title: '生成申报', icon: Send }
  ];

  const currentStepIndex = steps.findIndex(s => s.key === state.currentStep);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 - 多周期税务管理平台 */}
      <header className="bg-gradient-to-r from-blue-900 to-blue-700 px-6 py-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">2025年度汇算清缴</h1>
              <p className="text-sm text-blue-200">AI税务合规 OS · 月度 · 季度 · 年度 全周期覆盖</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* 周期选择器 */}
            <div className="bg-white/10 backdrop-blur rounded-lg px-3 py-2">
              <PeriodSelector
                value={state.currentPeriod}
                onChange={(period) => setState(s => ({ ...s, currentPeriod: period }))}
                compact
              />
            </div>
            {/* AI模型选择按钮 */}
            <button
              onClick={() => setShowAISettings(true)}
              className="flex items-center gap-2 px-3 py-2 bg-purple-500/30 hover:bg-purple-500/50 rounded-lg text-sm text-white transition backdrop-blur"
            >
              <Sparkles className="w-4 h-4" />
              <span>AI设置</span>
            </button>
            {/* 网络状态 */}
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg backdrop-blur ${state.isOnline ? 'bg-green-500/30 text-green-200' : 'bg-red-500/30 text-red-200'}`}>
              {state.isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
              <span className="text-sm font-medium">{state.isOnline ? '在线' : '离线'}</span>
            </div>
          </div>
        </div>
      </header>

      {/* 步骤指示器 */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-center gap-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = step.key === state.currentStep;
            const isCompleted = index < currentStepIndex;
            return (
              <div key={step.key} className="flex items-center">
                <div className={`flex items-center gap-2 ${isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isActive ? 'bg-blue-600 text-white' : isCompleted ? 'bg-green-500 text-white' : 'bg-gray-200'}`}>
                    {isCompleted ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <span className="text-sm font-medium">{step.title}</span>
                </div>
                {index < steps.length - 1 && <ChevronRight className="w-5 h-5 text-gray-300 mx-2" />}
              </div>
            );
          })}
        </div>
      </div>

      <main className="p-6">
        {/* 步骤1: 数据导入 */}
        {state.currentStep === 'import' && (
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">导入财务数据</h2>
              <p className="text-gray-500">选择数据导入方式或使用示例数据开始体验</p>
            </div>

            {/* 导入方式选择 - 网格布局 */}
            <div className="grid grid-cols-3 gap-6 mb-8">
              <div
                className="card hover:shadow-md transition cursor-pointer"
                onClick={() => setImportTab('excel')}
              >
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <FileSpreadsheet className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Excel导入</h3>
                <p className="text-sm text-gray-500">上传Excel文件，自动解析发票数据</p>
              </div>

              <div className="card hover:shadow-md transition cursor-pointer opacity-50">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <Database className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">财务软件对接</h3>
                <p className="text-sm text-gray-500">连接用友、金蝶等财务系统</p>
                <span className="text-xs text-gray-400 mt-2">即将推出</span>
              </div>

              <div
                className="card hover:shadow-md transition cursor-pointer"
                onClick={() => {
                  setImportedData({ source: 'demo' });
                  setState(s => ({ ...s, excelData: mockFinancialData }));
                }}
              >
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <Brain className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">示例数据</h3>
                <p className="text-sm text-gray-500">使用模拟数据进行演示</p>
              </div>
            </div>

            {/* 导入内容 */}
            {importTab === 'excel' && (
              <div className="card mb-8">
                <ExcelImporter
                  onDataImported={(data) => {
                    setImportedData(data);
                    setState(s => ({ ...s, excelData: data.incomeStatement || mockFinancialData }));
                  }}
                  onFilesImported={(files) => {
                    // 存储导入文件列表（持久化，跨导航不丢失）
                    files.forEach(f => useDataStore.getState().addImportedFile(f));
                  }}
                />
              </div>
            )}
            {importTab === 'finance' && (
              <div className="card mb-8">
                <FinanceConnect
                  onConnected={(software, data) => {
                    setImportedData({ ...data, source: software });
                    setState(s => ({ ...s, excelData: data.incomeStatement || mockFinancialData }));
                  }}
                />
              </div>
            )}
            {importTab === 'tax' && (
              <div className="card mb-8">
                <TaxSystemConnect
                  onConnected={(data) => {
                    setImportedData({ ...data, source: 'tax' });
                  }}
                />
              </div>
            )}

            {/* 下一步 */}
            {state.excelData && (
              <div className="flex justify-center">
                <button onClick={runAudit} disabled={state.isProcessing} className="btn-primary">
                  {state.isProcessing ? '处理中...' : '开始审核'} <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* 步骤2: AI审核 - 新版Dashboard */}
        {state.currentStep === 'audit' && state.auditResult && (
          <div className="max-w-6xl mx-auto">
            {/* 审核结果头部 */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {formatTaxPeriod(state.currentPeriod)} AI驾驶舱
                </h2>
                <p className="text-gray-500 mt-1">多智能体决策流 · 证据链审计</p>
              </div>
              <div className={`px-4 py-2 rounded-full font-medium ${
                state.auditResult.riskLevel === 'critical' ? 'bg-red-100 text-red-700' :
                state.auditResult.riskLevel === 'high' ? 'bg-orange-100 text-orange-700' :
                state.auditResult.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                'bg-green-100 text-green-700'
              }`}>
                {state.auditResult.riskLevel === 'critical' ? '🚨 紧急' :
                 state.auditResult.riskLevel === 'high' ? '⚠️ 高风险' :
                 state.auditResult.riskLevel === 'medium' ? '⚡ 中风险' : '✅ 低风险'}
              </div>
            </div>

            {/* KPI卡片 */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm">综合得分</p>
                    <p className="text-3xl font-bold">{state.auditResult.score}</p>
                  </div>
                  <BarChart3 className="w-10 h-10 text-blue-200" />
                </div>
              </div>
              <div className="card bg-gradient-to-br from-red-500 to-red-600 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-red-100 text-sm">拦截风险额</p>
                    <p className="text-3xl font-bold">
                      ¥{state.auditResult.issues.filter((i: { severity: string; amount?: number }) => i.severity === 'critical' || i.severity === 'high')
                        .reduce((sum: number, i: { amount?: number }) => sum + (i.amount || 0), 0).toLocaleString()}
                    </p>
                  </div>
                  <ShieldCheck className="w-10 h-10 text-red-200" />
                </div>
              </div>
              <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm">小微优惠节省</p>
                    <p className="text-3xl font-bold">
                      {state.auditResult.slpeQualification?.eligible ? '¥' + (state.auditResult.slpeQualification.savings || 0).toLocaleString() : '--'}
                    </p>
                  </div>
                  <TrendingDown className="w-10 h-10 text-green-200" />
                </div>
              </div>
              <div className="card bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm">证据完整度</p>
                    <p className="text-3xl font-bold">{state.auditResult.evidenceScore.totalScore}分</p>
                  </div>
                  <FileBadge className="w-10 h-10 text-purple-200" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6 mb-6">
              {/* 多智能体决策流 */}
              <div className="col-span-2 card">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-500" />
                  多智能体决策流
                </h3>
                <div className="flex items-center justify-between mb-4">
                  <div className={`flex-1 text-center ${state.auditPhase === 'L1' || ['L3', 'SLPE', 'Final'].includes(state.auditPhase) ? 'text-green-600' : 'text-gray-400'}`}>
                    <Target className="w-8 h-8 mx-auto mb-1" />
                    <p className="text-xs font-medium">L1</p>
                    <p className="text-xs">事实统一</p>
                  </div>
                  <div className="h-0.5 flex-1 bg-gray-200 mx-2">
                    <div className={`h-full ${['L3', 'SLPE', 'Final'].includes(state.auditPhase) ? 'bg-green-500' : 'bg-gray-200'}`} />
                  </div>
                  <div className={`flex-1 text-center ${['L3', 'SLPE', 'Final'].includes(state.auditPhase) ? 'text-green-600' : 'text-gray-400'}`}>
                    <Search className="w-8 h-8 mx-auto mb-1" />
                    <p className="text-xs font-medium">L3</p>
                    <p className="text-xs">风险扫描</p>
                  </div>
                  <div className="h-0.5 flex-1 bg-gray-200 mx-2">
                    <div className={`h-full ${['SLPE', 'Final'].includes(state.auditPhase) ? 'bg-green-500' : 'bg-gray-200'}`} />
                  </div>
                  <div className={`flex-1 text-center ${['SLPE', 'Final'].includes(state.auditPhase) ? 'text-green-600' : 'text-gray-400'}`}>
                    <DollarSign className="w-8 h-8 mx-auto mb-1" />
                    <p className="text-xs font-medium">SLPE</p>
                    <p className="text-xs">小微优惠</p>
                  </div>
                  <div className="h-0.5 flex-1 bg-gray-200 mx-2">
                    <div className={`h-full ${state.auditPhase === 'Final' ? 'bg-green-500' : 'bg-gray-200'}`} />
                  </div>
                  <div className={`flex-1 text-center ${state.auditPhase === 'Final' ? 'text-green-600' : 'text-gray-400'}`}>
                    <CheckCircle className="w-8 h-8 mx-auto mb-1" />
                    <p className="text-xs font-medium">Final</p>
                    <p className="text-xs">裁决结项</p>
                  </div>
                </div>

                {/* 终端日志 */}
                <div className="bg-gray-900 rounded-lg p-4 h-48 overflow-y-auto">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-green-400 text-xs font-mono">TERMINAL</span>
                  </div>
                  {state.terminalLogs.map((log, idx) => (
                    <p key={idx} className="text-green-400 text-xs font-mono">{log}</p>
                  ))}
                </div>
              </div>

              {/* 税负对比图 */}
              <div className="card">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-500" />
                  税负成本对比
                </h3>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { name: '标准税负(25%)', value: 812500, fill: '#ef4444' },
                      { name: state.auditResult.slpeQualification?.eligible ? '小微优惠(5%)' : '优惠后', value: state.auditResult.slpeQualification?.eligible ? 162500 : 650000, fill: '#22c55e' }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(value: any) => '¥' + value.toLocaleString()} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {[
                          <Cell key="1" fill="#ef4444" />,
                          <Cell key="2" fill="#22c55e" />
                        ]}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {state.auditResult.slpeQualification?.eligible && (
                  <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-green-700 text-sm font-medium">💡 {state.auditResult.slpeQualification.reason}</p>
                    <p className="text-green-600 text-lg font-bold mt-1">预计节省 ¥{state.auditResult.slpeQualification.savings.toLocaleString()}</p>
                  </div>
                )}
              </div>
            </div>

            {/* 证据完整度 */}
            <div className={`card ${state.auditResult.evidenceScore.passed ? 'border-green-300' : 'border-red-300'}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Shield className={`w-5 h-5 ${state.auditResult.evidenceScore.passed ? 'text-green-600' : 'text-red-600'}`} />
                  证据完整度评分
                </h3>
                <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${state.auditResult.evidenceScore.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {state.auditResult.evidenceScore.passed ? <BadgeCheck className="w-5 h-5" /> : <FileWarning className="w-5 h-5" />}
                  <span className="font-bold">{state.auditResult.evidenceScore.totalScore}分</span>
                  <span className="text-sm">/ 100分</span>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
                <div
                  className={`h-3 rounded-full ${state.auditResult.evidenceScore.passed ? 'bg-green-500' : 'bg-red-500'}`}
                  style={{ width: `${state.auditResult.evidenceScore.totalScore}%` }}
                />
              </div>
              {!state.auditResult.evidenceScore.passed && (
                <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-red-700 font-medium flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    证据完整度不足，请补充以下证据后继续申报：
                  </p>
                  <ul className="mt-2 text-red-600 text-sm list-disc list-inside">
                    {state.auditResult.evidenceScore.categories.flatMap((cat: { missingEvidence: string[] }) => cat.missingEvidence).filter((v: string, i: number, a: string[]) => a.indexOf(v) === i).map((evidence: string, idx: number) => (
                      <li key={idx}>{evidence}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* 问题分类展示 */}
            <div className="card mb-6">
              <h3 className="text-lg font-semibold mb-4">发现问题 ({state.auditResult.issues.length}项)</h3>
              {state.auditResult.issues.length === 0 ? (
                <div className="text-center py-8 text-green-600">
                  <CheckCircle className="w-12 h-12 mx-auto mb-2" />
                  <p className="font-medium">🎉 未发现明显问题，符合申报条件</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {state.auditResult.issues.map((issue: any) => (
                    <div key={issue.id} className={`p-4 rounded-lg border ${
                      issue.severity === 'critical' ? 'bg-red-50 border-red-300' :
                      issue.severity === 'high' ? 'bg-orange-50 border-orange-200' :
                      issue.severity === 'medium' ? 'bg-yellow-50 border-yellow-200' :
                      'bg-blue-50 border-blue-200'
                    }`}>
                      <div className="flex items-start gap-3">
                        {issue.severity === 'critical' ? (
                          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                        ) : issue.severity === 'high' ? (
                          <AlertCircle className="w-5 h-5 text-orange-500 mt-0.5" />
                        ) : issue.severity === 'medium' ? (
                          <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
                        ) : (
                          <CheckCircle className="w-5 h-5 text-blue-500 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-gray-900">{issue.title}</h4>
                              <span className={`text-xs px-2 py-0.5 rounded ${
                                issue.category === 'compliance' ? 'bg-purple-100 text-purple-700' :
                                issue.category === 'human_error' ? 'bg-orange-100 text-orange-700' :
                                issue.category === 'logic_error' ? 'bg-red-100 text-red-700' :
                                'bg-blue-100 text-blue-700'
                              }`}>
                                {issue.category === 'compliance' ? '合规' :
                                 issue.category === 'human_error' ? '人为错误' :
                                 issue.category === 'logic_error' ? '逻辑错误' : '风险预警'}
                              </span>
                            </div>
                            {issue.amount && <span className="text-sm text-gray-500">影响金额: ¥{issue.amount.toLocaleString()}</span>}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{issue.description}</p>
                          {issue.requiredEvidence && issue.requiredEvidence.length > 0 && (
                            <p className="text-sm text-orange-600 mt-2">📋 需补充证据: {issue.requiredEvidence.join(', ')}</p>
                          )}
                          <p className="text-sm text-blue-600 mt-2">💡 {issue.suggestion}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 审核统计 */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="card text-center py-3">
                <div className="text-base font-bold text-blue-600">{state.auditResult.summary.totalChecks}</div>
                <div className="text-xs text-gray-500 mt-1">检查项</div>
              </div>
              <div className="card text-center py-3">
                <div className="text-base font-bold text-green-600">{state.auditResult.summary.passedChecks}</div>
                <div className="text-xs text-gray-500 mt-1">通过</div>
              </div>
              <div className="card text-center py-3">
                <div className="text-base font-bold text-red-600">{state.auditResult.summary.failedChecks}</div>
                <div className="text-xs text-gray-500 mt-1">不合格</div>
              </div>
              <div className="card text-center py-3">
                <div className="text-base font-bold text-yellow-600">{state.auditResult.summary.warnings}</div>
                <div className="text-xs text-gray-500 mt-1">警告</div>
              </div>
            </div>

            <div className="flex justify-center gap-4">
              <button onClick={() => setState(s => ({ ...s, currentStep: 'import' }))} className="btn-secondary">上一步</button>
              <button onClick={handleExportAuditReportPDF} className="btn-secondary"><Download className="w-5 h-5" />导出PDF报告</button>
              <button
                onClick={runAnalysis}
                disabled={state.isProcessing || !state.auditResult.evidenceScore.passed}
                className={`btn-primary ${!state.auditResult.evidenceScore.passed ? 'opacity-50 cursor-not-allowed' : ''}`}
                title={!state.auditResult.evidenceScore.passed ? '证据完整度不足，需先补充证据' : ''}
              >
                {state.isProcessing ? 'AI分析中...' : 'AI分析'} <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* 步骤3: AI分析 - 动态穿透分析页 */}
        {state.currentStep === 'analyze' && state.analysisResult && (
          <div className="max-w-6xl mx-auto">
            {/* 顶部导航 */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">AI分析报告</h2>
                <p className="text-gray-500 mt-1">基于导入的 {useDataStore.getState().importedFiles.length || 1} 个文件生成</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setState(s => ({ ...s, currentStep: 'audit' }))} className="btn-secondary">
                  返回审核
                </button>
                <button onClick={runOptimization} disabled={state.isProcessing} className="btn-primary">
                  {state.isProcessing ? '生成建议中...' : '获取优化建议'} <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* 原始文件列表（始终可见，可折叠） */}
            <div className="mb-6">
              <FileTable
                files={useDataStore.getState().importedFiles}
                defaultExpanded={false}
              />
            </div>

            {/* 动态分析内容 */}
            <DrillDownAnalysis
              metrics={generateAnalysisMetrics(
                useDataStore.getState().importedFiles.map((f, idx) => ({
                  id: f.id,
                  name: f.name,
                  data: importedData || {
                    balanceSheet: { year: 2025, assets: 5000000, liabilities: 2000000, ownerEquity: 3000000, cash: 500000, accountsReceivable: 800000, inventory: 1000000, fixedAssets: 2000000, accountsPayable: 500000 },
                    incomeStatement: { year: 2025, revenue: 8000000, costOfSales: 5600000, grossProfit: 2400000, operatingExpense: 800000, managementExpense: 600000, financialExpense: 100000, operatingProfit: 1000000, totalProfit: 900000, netProfit: 675000 },
                    subjectBalances: [],
                    invoices: [],
                  },
                }))
              )}
              files={useDataStore.getState().importedFiles.map((f, idx) => ({
                id: f.id,
                name: f.name,
                data: importedData || {
                  balanceSheet: { year: 2025, assets: 5000000, liabilities: 2000000, ownerEquity: 3000000, cash: 500000, accountsReceivable: 800000, inventory: 1000000, fixedAssets: 2000000, accountsPayable: 500000 },
                  incomeStatement: { year: 2025, revenue: 8000000, costOfSales: 5600000, grossProfit: 2400000, operatingExpense: 800000, managementExpense: 600000, financialExpense: 100000, operatingProfit: 1000000, totalProfit: 900000, netProfit: 675000 },
                  subjectBalances: [],
                  invoices: [],
                },
              }))}
            />
          </div>
        )}

        {/* 步骤4: 优化建议 */}
        {state.currentStep === 'optimize' && state.optimizationResult && (
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">优化建议</h2>
            </div>

            {/* 优化概览 - 紧凑网格布局 */}
            <div className="grid grid-cols-2 gap-4 mb-6 max-w-sm mx-auto">
              <div className="card text-center py-4 px-3">
                <div className="text-lg font-bold text-green-600">¥{state.optimizationResult.estimatedSavings.toLocaleString()}</div>
                <div className="text-xs text-gray-500 mt-1">预估节税金额</div>
              </div>
              <div className="card text-center py-4 px-3">
                <div className="text-lg font-bold text-gray-900">{state.optimizationResult.suggestions.length}</div>
                <div className="text-xs text-gray-500 mt-1">优化建议</div>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              {state.optimizationResult.suggestions.map((suggestion: any) => (
                <div key={suggestion.id} className="card">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${suggestion.priority === 'high' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {suggestion.priority === 'high' ? '高' : '中'}
                        </span>
                        <h3 className="font-semibold text-gray-900">{suggestion.title}</h3>
                      </div>
                      <p className="text-sm text-gray-600 mt-2">{suggestion.description}</p>
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-500">实施步骤:</p>
                        <ul className="text-sm text-gray-700 mt-1 list-disc list-inside">
                          {suggestion.implementation.steps.map((step: string, i: number) => <li key={i}>{step}</li>)}
                        </ul>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-base font-bold text-green-600">¥{suggestion.estimatedSavings.toLocaleString()}</div>
                      <p className="text-xs text-gray-500">预估节税</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-center gap-4">
              <button onClick={() => setState(s => ({ ...s, currentStep: 'analyze' }))} className="btn-secondary">上一步</button>
              <button onClick={generateFiling} disabled={state.isProcessing} className="btn-primary">
                {state.isProcessing ? '生成中...' : '生成申报表'} <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* 步骤5: 一键申报 */}
        {state.currentStep === 'file' && state.filingData && (
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">申报表已生成</h2>
              <p className="text-gray-500">请核对后进行申报</p>
            </div>
            <div className="card mb-8">
              <h3 className="text-lg font-semibold mb-4">生成的申报表</h3>
              <div className="space-y-2">
                {state.filingData.forms.map((form: string) => (
                  <div key={form} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium">{form}</span>
                    <span className="text-sm text-gray-500">
                      {form === 'A100000' && '中华人民共和国企业所得税年度纳税申报表（A类）'}
                      {form === 'A101010' && '一般企业收入明细表'}
                      {form === 'A102010' && '一般企业成本费用明细表'}
                      {form === 'A105000' && '纳税调整项目明细表'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-center gap-4">
              <button onClick={() => setState(s => ({ ...s, currentStep: 'optimize' }))} className="btn-secondary">上一步</button>
              <button onClick={handleExportFormsListPDF} className="btn-secondary"><FileText className="w-5 h-5" />导出表单清单PDF</button>
              <button onClick={handleExportA100000PDF} className="btn-secondary"><Download className="w-5 h-5" />导出A100000表PDF</button>
              <button className="btn-primary"><Download className="w-5 h-5" />导出Excel</button>
              <button className="btn-green"><Send className="w-5 h-5" />一键申报</button>
            </div>
          </div>
        )}
      </main>

      {/* AI设置弹窗 */}
      <AISettings
        isOpen={showAISettings}
        onClose={() => setShowAISettings(false)}
        selectedModel={selectedAIModel}
        onSelectModel={(modelId) => setSelectedAIModel(modelId)}
      />

      {/* 全屏提示 */}
      {showExitFullscreenHint && (
        <div
          className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-pulse cursor-pointer"
          onClick={handleExitFullscreen}
        >
          <div className="bg-yellow-400 text-yellow-900 px-6 py-3 rounded-lg shadow-lg font-medium flex items-center gap-2">
            <span>按 ESC 或点击此处退出全屏</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
