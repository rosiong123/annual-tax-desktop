# 快速参考

> 给 AI 开发者用的速查表。

---

## 常用命令

```bash
pnpm install          # 安装依赖
pnpm dev              # 开发 Web 版
pnpm tauri dev        # 开发桌面版
pnpm build            # 构建
pnpm electron:build   # 构建 Electron
```

---

## 核心数据结构

```typescript
// 财务数据
interface FinancialData {
  taxableIncome: number      // 应税收入
  revenue: number           // 营业收入
  totalWages: number        // 工资总额
  rdLaborCost: number       // 研发人员工资
  rdOtherCost: number       // 研发其他费用
  businessEntertainment: number  // 业务招待费
  trainingExpense: number   // 职工教育经费
  employeeCount: number    // 员工人数
  totalAssets: number       // 资产总额
  prepaidTax: number       // 已预缴税款
  taxRate: number          // 税率
}

// 审计结果
interface AuditResult {
  score: number            // 综合得分 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  issues: Issue[]          // 发现的问题
  slpeQualification: SLPEResult  // 小微优惠资格
  evidenceScore: EvidenceScore    // 证据完整度
}

// 问题
interface Issue {
  id: string
  title: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  category: 'compliance' | 'human_error' | 'logic_error' | 'warning'
  amount?: number          // 影响金额
  description: string
  suggestion: string
  requiredEvidence?: string[]
}
```

---

## 组件开发模板

```typescript
import { useState } from 'react'

interface Props {
  onComplete: (data: any) => void
  onError?: (error: Error) => void
}

export default function MyComponent({ onComplete, onError }: Props) {
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (data: any) => {
    setLoading(true)
    try {
      // 业务逻辑
      onComplete(result)
    } catch (e) {
      onError?.(e as Error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card">
      {/* 实现 */}
      {loading && <div className="animate-pulse">加载中...</div>}
    </div>
  )
}
```

---

## 添加审计规则

```typescript
// src/utils/audit-engine.ts

export function checkMyRule(data: FinancialData): Issue | null {
  // 示例：业务招待费超限检查
  const limit = data.revenue * 0.0005 * 2  // 发生额 60% 与收入 5‰ 孰低
  if (data.businessEntertainment > limit) {
    return {
      id: 'RULE_ENT_001',
      title: '业务招待费超限',
      severity: 'medium',
      category: 'compliance',
      amount: data.businessEntertainment - limit,
      description: '业务招待费超过税法扣除限额',
      suggestion: '调增应纳税所得额',
    }
  }
  return null
}
```

---

## 周期类型

```typescript
type PeriodType = 'monthly' | 'quarterly' | 'annual'

// 月报：增值税及附加
// 季报：企业所得税预缴
// 年报：汇算清缴 + 所有税种
```

---

## 申报表清单

| 周期 | 申报表 |
|------|--------|
| 月报 | 增值税及附加税费申报表 |
| 季报 | 企业所得税预缴申报表 |
| 年报 | A100000, A101010, A102010, A105000, A105050, A107012 |

---

## 小微优惠判断

```typescript
function checkSLPE(data: FinancialData): SLPEResult {
  const employees = data.employeeCount <= 300
  const assets = data.totalAssets <= 50000000
  const income = data.taxableIncome <= 3000000

  if (employees && assets && income) {
    // 享受小微优惠，实际税负率 5%
    return {
      eligible: true,
      savings: data.taxableIncome * 0.20,  // 节省 20% - 5% = 15%
    }
  }
  return { eligible: false }
}
```

---

_最后更新：2026-04-12_
