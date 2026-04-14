/**
 * DrillDownAnalysis - 动态分析页面
 * 替代静态占位图，展示真实图表 + 穿透功能
 */

import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import {
  AlertTriangle, TrendingUp, DollarSign, BarChart3, PieChart as PieChartIcon,
  ChevronRight, X, Search, Filter, FileText, ArrowRight,
  CreditCard, Calculator, Shield, CheckCircle, AlertCircle
} from 'lucide-react';
import {
  AnalysisMetrics,
  TaxRiskItem,
  AssetReclassItem,
  IncomeAdjustmentItem,
  ReconstructionSuggestion,
  ImportedFileWithData,
} from '../utils/MockAnalysisService';
import FileTable from './FileTable';

interface DrillDownAnalysisProps {
  metrics: AnalysisMetrics;
  files: ImportedFileWithData[];
  onClose?: () => void;
}

const RISK_COLORS: Record<string, string> = { high: '#EF4444', medium: '#F59E0B', low: '#22C55E' };

// === 穿透详情弹窗 ===
function DrillDownModal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-6">{children}</div>
      </div>
    </div>
  );
}

// === 风险项穿透卡片 ===
function RiskCard({ risk, onDrill }: { risk: TaxRiskItem; onDrill: (r: TaxRiskItem) => void }) {
  return (
    <div
      onClick={() => onDrill(risk)}
      className="bg-white border border-gray-200 rounded-xl p-4 cursor-pointer hover:shadow-md hover:border-red-200 transition group"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className={`w-4 h-4 ${RISK_COLORS[risk.severity] === '#EF4444' ? 'text-red-500' : RISK_COLORS[risk.severity] === '#F59E0B' ? 'text-amber-500' : 'text-green-500'}`} />
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            risk.severity === 'high' ? 'bg-red-100 text-red-700' :
            risk.severity === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
          }`}>
            {risk.severity === 'high' ? '高风险' : risk.severity === 'medium' ? '中风险' : '低风险'}
          </span>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
      </div>
      <h4 className="font-medium text-gray-900 mb-1">{risk.title}</h4>
      <p className="text-sm text-gray-500 mb-2 line-clamp-2">{risk.description}</p>
      {risk.amount > 0 && (
        <p className="text-sm font-medium text-gray-700">
          涉及金额：¥{risk.amount.toLocaleString()}
        </p>
      )}
    </div>
  );
}

// === 调整项穿透卡片 ===
function AdjustmentCard({ item, onDrill }: { item: IncomeAdjustmentItem; onDrill: (i: IncomeAdjustmentItem) => void }) {
  return (
    <div
      onClick={() => onDrill(item)}
      className="bg-white border border-gray-200 rounded-xl p-4 cursor-pointer hover:shadow-md hover:border-blue-200 transition group"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {item.type === 'increase'
            ? <ArrowRight className="w-4 h-4 text-red-500" />
            : <ArrowRight className="w-4 h-4 text-green-500" />
          }
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            item.type === 'increase' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
          }`}>
            {item.type === 'increase' ? '调增' : '调减'}
          </span>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-400" />
      </div>
      <h4 className="font-medium text-gray-900 mb-1">{item.accountName}</h4>
      <p className="text-sm font-medium text-gray-700 mb-1">
        {item.type === 'increase' ? '+' : '-'} ¥{item.amount.toLocaleString()}
      </p>
      <p className="text-sm text-gray-500 line-clamp-2">{item.description}</p>
    </div>
  );
}

// === 重构建议穿透卡片 ===
function SuggestionCard({ sug, onDrill }: { sug: ReconstructionSuggestion; onDrill: (s: ReconstructionSuggestion) => void }) {
  return (
    <div
      onClick={() => onDrill(sug)}
      className="bg-white border border-gray-200 rounded-xl p-4 cursor-pointer hover:shadow-md hover:border-purple-200 transition group"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-purple-500" />
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            sug.priority === 'high' ? 'bg-purple-100 text-purple-700' :
            sug.priority === 'medium' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
          }`}>
            {sug.priority === 'high' ? '高优先' : sug.priority === 'medium' ? '中优先' : '低优先'}
          </span>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-400" />
      </div>
      <h4 className="font-medium text-gray-900 mb-1">{sug.title}</h4>
      <p className="text-sm text-gray-500 mb-2 line-clamp-2">{sug.description}</p>
      <p className="text-sm font-medium text-purple-700">
        预计节税：¥{sug.estimatedImpact.toLocaleString()}
      </p>
    </div>
  );
}

// === 主组件 ===
export default function DrillDownAnalysis({ metrics, files, onClose }: DrillDownAnalysisProps) {
  const [drillType, setDrillType] = useState<string | null>(null);
  const [drillItem, setDrillItem] = useState<TaxRiskItem | IncomeAdjustmentItem | ReconstructionSuggestion | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [searchText, setSearchText] = useState('');

  // 过滤后的风险项
  const filteredRisks = metrics.taxRiskItems.filter(r => {
    if (filterSeverity !== 'all' && r.severity !== filterSeverity) return false;
    if (searchText && !r.title.toLowerCase().includes(searchText.toLowerCase())) return false;
    return true;
  });

  function handleDrill(risk: TaxRiskItem): void {
    setDrillItem(risk);
    setDrillType('risk');
  }

  function handleDrillAdjustment(item: IncomeAdjustmentItem): void {
    setDrillItem(item);
    setDrillType('adjustment');
  }

  function handleDrillSuggestion(sug: ReconstructionSuggestion): void {
    setDrillItem(sug);
    setDrillType('suggestion');
  }

  const highRisks = metrics.taxRiskItems.filter(r => r.severity === 'high');
  const totalAdjustment = metrics.incomeAdjustmentItems.reduce((sum, i) => sum + i.amount, 0);
  const totalSaving = metrics.suggestions.reduce((sum, s) => sum + s.estimatedImpact, 0);

  return (
    <div className="space-y-6">
      {/* KPI 指标卡 */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-red-500 to-red-600 text-white rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm">高风险点</p>
              <p className="text-2xl font-bold">{highRisks.length}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-200" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-amber-100 text-sm">中风险点</p>
              <p className="text-2xl font-bold">{metrics.taxRiskItems.filter(r => r.severity === 'medium').length}</p>
            </div>
            <BarChart3 className="w-8 h-8 text-amber-200" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">调整总额</p>
              <p className="text-2xl font-bold">¥{(totalAdjustment / 10000).toFixed(0)}万</p>
            </div>
            <DollarSign className="w-8 h-8 text-blue-200" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">预计节税</p>
              <p className="text-2xl font-bold">¥{(totalSaving / 10000).toFixed(0)}万</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-200" />
          </div>
        </div>
      </div>

      {/* 图表区：资产分布 + 利润结构 */}
      <div className="grid grid-cols-2 gap-6">
        {/* 资产分布饼图 */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <PieChartIcon className="w-5 h-5 text-blue-500" />
            资产结构分布
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={metrics.chartData.assetDistribution}
                cx="50%"
                cy="50%"
                outerRadius={80}
                innerRadius={40}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {metrics.chartData.assetDistribution.map((entry, idx) => (
                  <Cell key={idx} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => `¥${v.toLocaleString()}`} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* 利润结构柱状图 */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-green-500" />
            利润结构
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={metrics.chartData.profitStructure}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `¥${(v/10000).toFixed(0)}万`} />
              <Tooltip formatter={(v: number) => `¥${v.toLocaleString()}`} />
              <Bar dataKey="value" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 风险分布 */}
      {metrics.chartData.riskDistribution.some(r => r.value > 0) && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-500" />
            风险分布
          </h3>
          <div className="grid grid-cols-3 gap-4">
            {metrics.chartData.riskDistribution.map(r => (
              <div key={r.name} className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: RISK_COLORS[r.severity] }}
                />
                <span className="text-sm text-gray-600">{r.name}：{r.value} 项</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 税务风险穿透列表 */}
      {metrics.taxRiskItems.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              税务风险点 ({filteredRisks.length})
            </h3>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="搜索风险..."
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-blue-400"
              />
              <select
                value={filterSeverity}
                onChange={e => setFilterSeverity(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-blue-400"
              >
                <option value="all">全部</option>
                <option value="high">高风险</option>
                <option value="medium">中风险</option>
                <option value="low">低风险</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {filteredRisks.map(risk => (
              <RiskCard key={risk.id} risk={risk} onDrill={handleDrill} />
            ))}
          </div>
        </div>
      )}

      {/* 损益调整项 */}
      {metrics.incomeAdjustmentItems.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-blue-500" />
            损益调整项 ({metrics.incomeAdjustmentItems.length})
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {metrics.incomeAdjustmentItems.map(item => (
              <AdjustmentCard key={item.id} item={item} onDrill={handleDrillAdjustment} />
            ))}
          </div>
        </div>
      )}

      {/* 重构建议 */}
      {metrics.suggestions.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-500" />
            重构建议 ({metrics.suggestions.length})
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {metrics.suggestions.map(sug => (
              <SuggestionCard key={sug.id} sug={sug} onDrill={handleDrillSuggestion} />
            ))}
          </div>
        </div>
      )}

      {/* 资产重分类 */}
      {metrics.assetReclassItems.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-orange-500" />
            资产重分类 ({metrics.assetReclassItems.length})
          </h3>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-gray-50 shadow-sm">
                <tr className="text-left text-gray-500">
                  <th className="px-4 py-2.5 font-medium">科目</th>
                  <th className="px-4 py-2.5 font-medium text-right">当前值</th>
                  <th className="px-4 py-2.5 font-medium text-right">建议值</th>
                  <th className="px-4 py-2.5 font-medium text-right">差异</th>
                  <th className="px-4 py-2.5 font-medium">原因</th>
                </tr>
              </thead>
              <tbody>
                {metrics.assetReclassItems.map(item => (
                  <tr key={item.id} className="border-t border-gray-50 hover:bg-orange-50">
                    <td className="px-4 py-2.5 text-gray-800">{item.accountName}</td>
                    <td className="px-4 py-2.5 text-right text-gray-600">¥{item.currentValue.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right text-green-600">¥{item.suggestedValue.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right text-red-600">-¥{item.difference.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs">{item.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 原始文件列表 */}
      <FileTable
        files={files.map(f => ({
          id: f.id,
          name: f.name,
          size: 0,
          type: 'excel',
          status: 'success' as const,
          recordCount: f.data.subjectBalances?.length || f.data.invoices?.length || 0,
          sheetCount: 4,
          importTime: Date.now(),
        }))}
        defaultExpanded={false}
        onFileClick={(file) => {
          // 穿透：点击文件 → 找到关联的风险项
          const relatedRisks = metrics.taxRiskItems.filter(r => r.relatedFileId === file.id);
          if (relatedRisks.length > 0) {
            setDrillItem(relatedRisks[0]);
            setDrillType('risk');
          }
        }}
      />

      {/* === 穿透详情弹窗 === */}
      {drillItem && drillType === 'risk' && (
        <DrillDownModal
          title={(drillItem as TaxRiskItem).title}
          onClose={() => { setDrillItem(null); setDrillType(null); }}
        >
          {(() => {
            const r = drillItem as TaxRiskItem;
            return (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${r.severity === 'high' ? 'bg-red-100 text-red-700' : r.severity === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                    {r.severity === 'high' ? '高风险' : r.severity === 'medium' ? '中风险' : '低风险'}
                  </span>
                </div>
                <p className="text-gray-700">{r.description}</p>
                {r.amount > 0 && (
                  <div className="bg-red-50 border border-red-100 rounded-lg p-3">
                    <p className="text-sm text-red-800">涉及金额：<span className="font-semibold">¥{r.amount.toLocaleString()}</span></p>
                  </div>
                )}
                {r.adjustmentEntry && (
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                    <p className="text-xs font-medium text-blue-800 mb-1">调账分录</p>
                    <p className="text-sm text-blue-700 font-mono">{r.adjustmentEntry}</p>
                  </div>
                )}
                {r.legalBasis && (
                  <div className="bg-gray-50 border border-gray-100 rounded-lg p-3">
                    <p className="text-xs font-medium text-gray-600 mb-1">法规依据</p>
                    <p className="text-sm text-gray-600">{r.legalBasis}</p>
                  </div>
                )}
                {/* 关联原始文件 */}
                {r.relatedFileId && files.find(f => f.id === r.relatedFileId) && (
                  <div className="bg-orange-50 border border-orange-100 rounded-lg p-3">
                    <p className="text-xs font-medium text-orange-800 mb-1">关联原始文件</p>
                    <p className="text-sm text-orange-700">{files.find(f => f.id === r.relatedFileId)?.name}</p>
                  </div>
                )}
              </div>
            );
          })()}
        </DrillDownModal>
      )}

      {drillItem && drillType === 'adjustment' && (
        <DrillDownModal
          title={`${(drillItem as IncomeAdjustmentItem).accountName} - 调整计算`}
          onClose={() => { setDrillItem(null); setDrillType(null); }}
        >
          {(() => {
            const item = drillItem as IncomeAdjustmentItem;
            return (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${item.type === 'increase' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {item.type === 'increase' ? '需调增' : '需调减'}
                  </span>
                </div>
                <p className="text-gray-700">{item.description}</p>
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                  <p className="text-xs font-medium text-blue-800 mb-1">计算逻辑</p>
                  <p className="text-sm text-blue-700 font-mono whitespace-pre-wrap">{item.calculationBasis}</p>
                </div>
                <div className="bg-red-50 border border-red-100 rounded-lg p-3">
                  <p className="text-sm font-medium text-red-800">
                    调整金额：<span className="font-bold">¥{item.amount.toLocaleString()}</span>
                  </p>
                </div>
              </div>
            );
          })()}
        </DrillDownModal>
      )}

      {drillItem && drillType === 'suggestion' && (
        <DrillDownModal
          title={(drillItem as ReconstructionSuggestion).title}
          onClose={() => { setDrillItem(null); setDrillType(null); }}
        >
          {(() => {
            const s = drillItem as ReconstructionSuggestion;
            return (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${s.priority === 'high' ? 'bg-purple-100 text-purple-700' : s.priority === 'medium' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                    {s.priority === 'high' ? '高优先' : s.priority === 'medium' ? '中优先' : '低优先'}
                  </span>
                </div>
                <p className="text-gray-700">{s.description}</p>
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                  <p className="text-xs font-medium text-blue-800 mb-1">计算逻辑</p>
                  <p className="text-sm text-blue-700 font-mono whitespace-pre-wrap">{s.calculationLogic}</p>
                </div>
                {s.adjustmentEntries.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-2">调整分录</p>
                    {s.adjustmentEntries.map((entry, idx) => (
                      <div key={idx} className="bg-gray-50 border border-gray-100 rounded-lg p-2 mb-2">
                        <p className="text-sm text-gray-700">
                          <span className="font-mono text-gray-800">借：{entry.debit}</span>
                          <span className="mx-2 text-gray-400">|</span>
                          <span className="font-mono text-gray-800">贷：{entry.credit}</span>
                          <span className="ml-2 text-gray-500">¥{entry.amount.toLocaleString()}</span>
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                <div className="bg-green-50 border border-green-100 rounded-lg p-3">
                  <p className="text-sm font-medium text-green-800">
                    预计节税：<span className="font-bold text-lg">¥{s.estimatedImpact.toLocaleString()}</span>
                  </p>
                </div>
              </div>
            );
          })()}
        </DrillDownModal>
      )}
    </div>
  );
}
