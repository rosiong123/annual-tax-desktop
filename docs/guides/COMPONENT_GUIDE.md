# 组件开发指南

> 如何在 annual-tax-desktop 中创建新组件。

---

## 组件目录结构

```
src/components/
├── AISettings.tsx         # AI 设置弹窗
├── ExcelImporter.tsx      # Excel 导入
├── FinanceConnect.tsx    # 财务软件对接
├── PeriodSelector.tsx    # 周期选择器
└── TaxSystemConnect.tsx  # 税务系统对接
```

---

## 组件模板

### 基础卡片组件

```typescript
// src/components/MyCard.tsx
import React, { useState } from 'react'

interface Props {
  title: string
  onDataChange: (data: any) => void
}

export default function MyCard({ title, onDataChange }: Props) {
  const [loading, setLoading] = useState(false)

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <div className="space-y-4">
        {/* 组件内容 */}
      </div>
      {loading && (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>
      )}
    </div>
  )
}
```

### 弹窗组件

```typescript
// src/components/MyModal.tsx
import React from 'react'
import { X } from 'lucide-react'

interface Props {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
}

export default function MyModal({ isOpen, onClose, children }: Props) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 遮罩 */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      {/* 内容 */}
      <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 p-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>
        {children}
      </div>
    </div>
  )
}
```

### 表单组件

```typescript
// src/components/MyForm.tsx
import React, { useState } from 'react'

interface FormData {
  field1: string
  field2: number
}

interface Props {
  onSubmit: (data: FormData) => void
}

export default function MyForm({ onSubmit }: Props) {
  const [formData, setFormData] = useState<FormData>({
    field1: '',
    field2: 0,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          字段1
        </label>
        <input
          type="text"
          value={formData.field1}
          onChange={(e) => setFormData({ ...formData, field1: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          字段2
        </label>
        <input
          type="number"
          value={formData.field2}
          onChange={(e) => setFormData({ ...formData, field2: Number(e.target.value) })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
      <button type="submit" className="btn-primary w-full">
        提交
      </button>
    </form>
  )
}
```

---

## 在 App.tsx 中集成组件

### 1. 导入组件

```typescript
import MyCard from './components/MyCard'
import MyModal from './components/MyModal'
```

### 2. 添加状态

```typescript
const [showMyModal, setShowMyModal] = useState(false)
const [myData, setMyData] = useState<any>(null)
```

### 3. 在 render 中使用

```typescript
{state.currentStep === 'audit' && (
  <div className="max-w-6xl mx-auto">
    <MyCard
      title="我的卡片"
      onDataChange={(data) => setMyData(data)}
    />
  </div>
)}

<MyModal isOpen={showMyModal} onClose={() => setShowMyModal(false)}>
  <h3>弹窗内容</h3>
</MyModal>
```

---

## 常用样式类

| 类名 | 用途 |
|------|------|
| `card` | 白色卡片容器，带阴影和圆角 |
| `btn-primary` | 主按钮，蓝色背景 |
| `btn-secondary` | 次要按钮，灰色背景 |
| `btn-green` | 成功按钮，绿色背景 |
| `text-sm/md/lg` | 字号 |
| `font-medium/semibold/bold` | 字重 |
| `space-y-2/4/6` | 垂直间距 |
| `p-4/6/8` | 内边距 |

---

## 图标使用

```typescript
import { 
  FileUp,       // 上传
  Search,       // 搜索/审核
  Brain,        // 分析
  Lightbulb,    // 优化
  Send,         // 发送/申报
  CheckCircle,  // 完成
  AlertCircle,  // 错误
  AlertTriangle // 警告
} from 'lucide-react'

// 使用
<FileUp className="w-6 h-6 text-blue-600" />
```

---

_最后更新：2026-04-12_
