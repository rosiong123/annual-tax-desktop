import { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';

export type TaxPeriodType = 'monthly' | 'quarterly' | 'annual';

export interface TaxPeriod {
  type: TaxPeriodType;
  year: number;
  month?: number;    // 月度: 1-12
  quarter?: number;  // 季度: 1-4
}

interface PeriodSelectorProps {
  value: TaxPeriod;
  onChange: (period: TaxPeriod) => void;
  compact?: boolean;
}

const periodLabels = {
  monthly: '月度申报',
  quarterly: '季度预缴',
  annual: '年度汇算'
};

const quarterLabels = ['Q1 一季度', 'Q2 二季度', 'Q3 三季度', 'Q4 四季度'];

const monthLabels = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

export default function PeriodSelector({ value, onChange, compact = false }: PeriodSelectorProps) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12
  const currentQuarter = Math.ceil(currentMonth / 3);

  // 税务申报周期范围：上一年度1月至最新
  // 例如 2026年，最早可选 2025年1月（上一年度1月）
  const MIN_YEAR = currentYear - 1; // 2025
  const MIN_MONTH = 1;              // 1月
  const MIN_QUARTER = 1;            // Q1

  // 年份列表：从最早年份到当前年份+1
  const years = Array.from(
    { length: currentYear - MIN_YEAR + 2 },
    (_, i) => MIN_YEAR + i
  ); // e.g. [2025, 2026, 2027]

  // 判断是否到达最小可选择周期
  const isAtMinimum = () => {
    if (value.type === 'monthly') {
      return value.year === MIN_YEAR && value.month === MIN_MONTH;
    }
    if (value.type === 'quarterly') {
      return value.year === MIN_YEAR && value.quarter === MIN_QUARTER;
    }
    return false;
  };

  // 获取当前周期的显示文本
  const getDisplayText = () => {
    if (value.type === 'annual') return `${value.year}年度`;
    if (value.type === 'quarterly') return `${value.year}年 ${quarterLabels[(value.quarter || 1) - 1]}`;
    return `${value.year}年 ${monthLabels[(value.month || 1) - 1]}`;
  };

  // 月份变化（带最小边界保护）
  const handleMonthChange = (delta: number) => {
    let newMonth = (value.month || 1) + delta;
    let newYear = value.year;
    if (newMonth > 12) { newMonth = 1; newYear++; }
    if (newMonth < 1) { newMonth = 12; newYear--; }
    // 不允许早于 MIN_YEAR/MIN_MONTH
    if (newYear < MIN_YEAR || (newYear === MIN_YEAR && newMonth < MIN_MONTH)) {
      return;
    }
    onChange({ ...value, month: newMonth, year: newYear });
  };

  // 季度变化（带最小边界保护）
  const handleQuarterChange = (delta: number) => {
    let newQuarter = (value.quarter || 1) + delta;
    let newYear = value.year;
    if (newQuarter > 4) { newQuarter = 1; newYear++; }
    if (newQuarter < 1) { newQuarter = 4; newYear--; }
    // 不允许早于 MIN_YEAR/MIN_QUARTER
    if (newYear < MIN_YEAR || (newYear === MIN_YEAR && newQuarter < MIN_QUARTER)) {
      return;
    }
    onChange({ ...value, quarter: newQuarter, year: newYear });
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <select
          value={value.type}
          onChange={(e) => onChange({ ...value, type: e.target.value as TaxPeriodType })}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
        >
          <option value="monthly">月度申报</option>
          <option value="quarterly">季度预缴</option>
          <option value="annual">年度汇算</option>
        </select>
        <span className="text-sm font-medium">{getDisplayText()}</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
      {/* 类型选择 */}
      <div className="flex gap-2 mb-4">
        {(['monthly', 'quarterly', 'annual'] as TaxPeriodType[]).map((type) => (
          <button
            key={type}
            onClick={() => onChange({ ...value, type })}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              value.type === type
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {value.type === type && <CheckCircle className="w-4 h-4" />}
            {periodLabels[type]}
          </button>
        ))}
      </div>

      {/* 时间选择器 */}
      <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
        <button
          onClick={() => {
            if (value.type === 'monthly') handleMonthChange(-1);
            else if (value.type === 'quarterly') handleQuarterChange(-1);
            else if (value.year > MIN_YEAR) onChange({ ...value, year: value.year - 1 });
          }}
          disabled={isAtMinimum()}
          className="p-2 hover:bg-gray-200 rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="text-center">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="w-5 h-5 text-blue-600" />
            <span className="text-lg font-bold text-gray-900">{getDisplayText()}</span>
          </div>
          <div className="flex gap-1 justify-center">
            {years.map((y) => (
              <button
                key={y}
                onClick={() => onChange({ ...value, year: y })}
                className={`px-2 py-0.5 text-xs rounded ${
                  value.year === y ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-200'
                }`}
              >
                {y}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => {
            if (value.type === 'monthly') handleMonthChange(1);
            else if (value.type === 'quarterly') handleQuarterChange(1);
            else onChange({ ...value, year: value.year + 1 });
          }}
          className="p-2 hover:bg-gray-200 rounded-lg transition"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* 月度选择 */}
      {value.type === 'monthly' && (
        <div className="grid grid-cols-6 gap-1 mt-3">
          {monthLabels.map((label, idx) => (
            <button
              key={idx}
              onClick={() => onChange({ ...value, month: idx + 1 })}
              className={`py-1.5 text-xs rounded ${
                value.month === idx + 1 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* 季度选择 */}
      {value.type === 'quarterly' && (
        <div className="grid grid-cols-4 gap-1 mt-3">
          {quarterLabels.map((label, idx) => (
            <button
              key={idx}
              onClick={() => onChange({ ...value, quarter: idx + 1 })}
              className={`py-1.5 text-xs rounded ${
                value.quarter === idx + 1 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export { periodLabels, quarterLabels, monthLabels };

/**
 * 格式化税务周期为显示文本
 */
export function formatTaxPeriod(period: TaxPeriod): string {
  if (period.type === 'annual') return `${period.year}年度`;
  if (period.type === 'quarterly') return `${period.year}年Q${period.quarter}季度`;
  return `${period.year}年${period.month}月`;
}
