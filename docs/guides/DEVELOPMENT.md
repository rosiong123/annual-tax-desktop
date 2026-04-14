# DEVELOPMENT.md - 开发指南

> 开发流程、代码规范、组件模板。

---

## 开发流程

### 1. 添加新组件

```typescript
// src/components/MyComponent.tsx
import React, { useState } from 'react'

interface Props {
  onComplete: (data: any) => void
}

export default function MyComponent({ onComplete }: Props) {
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    setLoading(true)
    try {
      // 业务逻辑
      onComplete(result)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card">
      {/* 组件内容 */}
    </div>
  )
}
```

### 2. 添加新工具函数

```typescript
// src/utils/my-service.ts
import { FinancialData, AuditResult } from './types'

export function myAnalysis(data: FinancialData): AuditResult {
  // 分析逻辑
  return {
    score: 85,
    riskLevel: 'low',
    issues: [],
    // ...
  }
}
```

### 3. 添加新页面

在 `src/App.tsx` 中添加路由：

```typescript
// 在 steps 数组中添加新步骤
const steps = [
  { key: 'import', title: '数据导入', icon: FileUp },
  { key: 'audit', title: 'AI审核', icon: Search },
  { key: 'analyze', title: '分析报告', icon: Brain },
  { key: 'optimize', title: '优化方案', icon: Lightbulb },
  { key: 'file', title: '生成申报', icon: Send },
  // 添加新步骤
  { key: 'report', title: '报告导出', icon: FileText },
]

// 在 render 中添加页面
{state.currentStep === 'report' && <ReportPage />}
```

---

## 代码规范

### TypeScript

- 使用 `interface` 定义对象结构
- 使用 `type` 定义联合类型和别名
- 避免使用 `any`，尽量用 `unknown`

```typescript
// ✅ 正确
interface User {
  name: string
  age: number
}

// ❌ 错误
const user: any = {}
```

### React 组件

- 使用函数组件 + Hooks
- Props 使用 `interface` 定义
- 组件文件首字母大写

### 样式

- 使用 Tailwind CSS
- 复用 `card`, `btn-primary`, `btn-secondary` 等通用样式类

---

## 多周期审计开发指南

### 修改周期选择逻辑

编辑 `src/components/PeriodSelector.tsx`：

```typescript
export type TaxPeriod = {
  type: 'monthly' | 'quarterly' | 'annual'
  year: number
  month?: number
  quarter?: number
}
```

### 添加新的审计规则

编辑 `src/utils/audit-engine.ts` 或 `multi-period-audit.ts`：

```typescript
// 添加新规则
function checkMyRule(data: FinancialData): Issue | null {
  if (data.someField > threshold) {
    return {
      id: 'MY_RULE_001',
      title: '规则标题',
      severity: 'high',
      description: '问题描述',
      suggestion: '修改建议'
    }
  }
  return null
}
```

### 添加新的申报表

编辑 `generateFilingForms` 函数：

```typescript
if (period.type === 'annual') {
  return [
    'A100000',
    'A101010',
    'A102010',
    // 添加新表单
    'A105080',  // 资产折旧摊销表
  ]
}
```

---

## 测试

```bash
pnpm test
```

---

## 提交规范

```
feat: 添加新组件
fix: 修复问题
docs: 文档更新
style: 样式调整
refactor: 重构
test: 测试
```

示例：
```
feat: 添加多周期申报表生成逻辑
fix: 修复 Excel 导入解析错误
```

---

_最后更新：2026-04-12_
