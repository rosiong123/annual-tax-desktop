# ARCHITECTURE.md - 系统架构文档

> 给 AI 开发者看的系统架构。描述模块关系、数据流向、核心逻辑。

---

## 🏗️ 系统架构

### 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                    年度汇算清缴系统 (Tauri Desktop)          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   展示层    │  │   业务层    │  │      数据层         │ │
│  │   (React)   │  │  (TypeScript)│  │   (TypeScript)     │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
│        │                │                    │              │
│  ┌─────┴────┐    ┌─────┴────┐        ┌─────┴────┐          │
│  │ App.tsx  │    │  utils/  │        │ electron/        │ │
│  │          │    │          │        │   main.js         │ │
│  │components│    │audit-    │        │                   │ │
│  │          │    │engine    │        │  本地文件读写     │ │
│  │          │    │          │        │  系统集成          │ │
│  │          │    │multi-    │        │                   │ │
│  │          │    │period    │        │                   │ │
│  │          │    │audit     │        │                   │ │
│  └──────────┘    └──────────┘        └───────────────────┘ │
│                                                             │
│                      ┌─────────────────────┐                │
│                      │      AI 服务        │                │
│                      │  (ai-service.ts)   │                │
│                      └─────────────────────┘                │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 模块关系

### 1. 展示层 (src/components/)

| 组件 | 职责 | 依赖 |
|------|------|------|
| `App.tsx` | 主应用状态管理、路由控制 | 所有组件 |
| `AISettings.tsx` | AI 模型配置弹窗 | - |
| `ExcelImporter.tsx` | Excel 文件上传与解析 | xlsx 库 |
| `FinanceConnect.tsx` | 财务软件对接（用友/金蝶） | 待实现 |
| `PeriodSelector.tsx` | 税务周期选择（月/季/年） | - |
| `TaxSystemConnect.tsx` | 税务系统对接 | 待实现 |

### 2. 业务层 (src/utils/)

| 模块 | 职责 | 关键函数 |
|------|------|----------|
| `ai-service.ts` | AI 服务调用封装 | `callAI()`, `analyzeRisk()` |
| `audit-engine.ts` | 核心审计逻辑 | `runAudit()`, `calculateRisk()` |
| `multi-period-audit.ts` | **多周期审计核心** | `runMultiPeriodAudit()`, `generateFilingForms()` |

### 3. 数据层 (src-tauri/)

| 模块 | 职责 |
|------|------|
| `main.js` | Electron 主进程 |
| `src-tauri/` | Tauri Rust 后端配置 |

---

## 🔄 数据流向

### 完整申报流程

```
1. 数据导入
   ExcelImporter ─▶ 数据解析 ─▶ App State
                                        │
                                        ▼
2. AI 审核
   runAudit() ─▶ L1 → L3 → SLPE → Final ─▶ auditResult
                                                       │
3. 分析报告                                             ▼
   runAnalysis() ─▶ 税负分析 ─▶ analysisResult
                                                       │
4. 优化方案                                             ▼
   runOptimization() ─▶ 小微优惠检测 ─▶ optimizationResult
                                                       │
5. 生成申报                                             ▼
   generateFiling() ─▶ 申报表生成 ─▶ filingData
```

---

## 🎯 多周期审计核心 (multi-period-audit.ts)

### 三报合一逻辑

```typescript
// 核心函数
export function runMultiPeriodAudit(period: TaxPeriod, data: FinancialData): AuditResult

// 税务周期类型
type TaxPeriod = {
  type: 'monthly' | 'quarterly' | 'annual'  // 月报/季报/年报
  year: number                               // 年份
  month?: number                             // 月份（月报用）
  quarter?: number                           // 季度（季报用）
}
```

### 各周期审计重点

| 周期 | 主表 | 核心检查项 |
|------|------|------------|
| **月报** | A1 增值税申报表 | 进项税额勾选、销项税额计算、未认证进项税 |
| **季报** | A2 企业所得税预缴表 | 收入确认、成本匹配、预缴金额 |
| **年报** | A100000 主表 + 附件 | 纳税调整项、小微优惠、研发加计扣除 |

### 申报表生成逻辑

```typescript
// 根据周期生成对应申报表
export function generateFilingForms(period: TaxPeriod, data: FinancialData): string[] {
  if (period.type === 'monthly') {
    return ['A1_增值税申报表']
  } else if (period.type === 'quarterly') {
    return ['A2_企业所得税预缴表']
  } else {
    // 年度汇算清缴完整表单体系
    return [
      'A100000',  // 主表
      'A101010',  // 收入明细表
      'A102010',  // 成本费用明细表
      'A105000',  // 纳税调整明细表
      'A107012',  // 研发费用加计扣除
      'A107050',  // 减免所得税优惠
    ]
  }
}
```

---

## 📊 核心数据结构

### FinancialData（财务数据）

```typescript
interface FinancialData {
  // 通用字段
  taxableIncome: number          // 应纳税所得额
  revenue: number               // 营业收入
  totalWages: number            // 工资总额
  taxRate: number               // 税率
  prepaidTax: number            // 已预缴税额
  
  // 研发相关
  rdLaborCost: number           // 研发人员人工成本
  rdOtherCost: number          // 研发其他费用
  
  // 费用相关
  businessEntertainment: number // 业务招待费
  trainingExpense: number       // 职工教育经费
  
  // 月报专用
  unverifiedInputTax?: number   // 未认证进项税
  outputTax?: number            // 销项税额
  billedTax?: number            // 已开票税额
  nonDeductibleItems?: number   // 不可抵扣项
  
  // 季报/年报专用
  unbilledRevenue?: number      // 未开票收入
}
```

### AuditResult（审计结果）

```typescript
interface AuditResult {
  score: number                 // 综合得分 (0-100)
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  issues: Issue[]               // 发现的问题
  slpeQualification: {
    eligible: boolean           // 是否符合小微优惠
    reason: string             // 判断依据
    savings: number            // 预计节税金额
  }
  evidenceScore: {
    totalScore: number         // 证据评分
    passed: boolean           // 是否通过
    categories: EvidenceCategory[]
  }
}
```

---

## 🔌 外部依赖

### AI 服务

```typescript
// ai-service.ts 封装
interface AIService {
  callAI(prompt: string, context: object): Promise<AIResponse>
  explainRisk(risk: RiskItem): Promise<string>
  suggestOptimization(data: FinancialData): Promise<Optimization[]>
}
```

### Excel 解析

使用 `xlsx` 库解析 Excel 文件。

---

## 📝 开发注意事项

1. **状态管理**：使用 React useState，避免过度设计
2. **模拟数据**：当前使用 mock 数据，生产环境需对接真实 API
3. **离线支持**：优先考虑离线可用，减少网络依赖
4. **桌面集成**：利用 Tauri API 实现全屏、文件选择等系统功能

---

_最后更新：2026-04-12_
