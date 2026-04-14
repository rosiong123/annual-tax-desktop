# 年度汇算清缴系统文档

> 给 AI 开发者看的文档入口。

---

## 📚 文档导航

### ⭐ 必读文档

| 文档 | 说明 | 阅读时间 |
|------|------|----------|
| [SOUL.md](./SOUL.md) | 项目灵魂：愿景、原则、绝对不能做的事 | 5 分钟 |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | 系统架构：三报合一、模块关系、数据流向 | 10 分钟 |

### 🛠️ 开发指南

| 文档 | 说明 |
|------|------|
| [guides/GETTING_STARTED.md](./guides/GETTING_STARTED.md) | 快速开始：环境搭建、运行命令 |
| [guides/DEVELOPMENT.md](./guides/DEVELOPMENT.md) | 开发流程：组件开发、审计规则添加 |
| [guides/COMPONENT_GUIDE.md](./guides/COMPONENT_GUIDE.md) | 组件模板：卡片、表单、弹窗 |

### 📖 参考资料

| 文档 | 说明 |
|------|------|
| [references/GLOSSARY.md](./references/GLOSSARY.md) | 业务术语定义 |
| [references/CHEATSHEET.md](./references/CHEATSHEET.md) | 快速参考：常用代码模板 |

### 📝 协作规范

| 文档 | 说明 |
|------|------|
| [CHANGELOG.md](./CHANGELOG.md) | 变更记录 |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | 贡献指南 |

---

## 🎯 产品定位

**三报合一** - 月报 + 季报 + 年度汇算清缴

```
┌─────────────┐
│   月报     │  增值税申报
├─────────────┤
│   季报     │  企业所得税预缴
├─────────────┤
│   年报     │  年度汇算清缴
└─────────────┘
         ↓
    统一平台处理
```

---

## 🔑 核心概念

| 概念 | 说明 |
|------|------|
| **证据完整度** | 衡量申报材料充分性，低于阈值阻止申报 |
| **小微优惠（SLPE）** | 小型微利企业税收优惠，可享 5% 实际税负率 |
| **研产边界** | 研发费用与生产成本界限，影响加计扣除 |
| **三流合一** | 发票、合同、资金流一致性检查 |

---

## 📁 项目代码

```
annual-tax-desktop/
├── src/
│   ├── components/           # React 组件
│   ├── utils/               # 业务逻辑
│   │   ├── multi-period-    # 多周期审计核心 ⭐
│   │   │   audit.ts         │
│   │   ├── audit-engine.ts  # 审计引擎
│   │   └── ai-service.ts    # AI 服务
│   └── App.tsx              # 主应用
├── electron/                 # Electron 入口
├── src-tauri/               # Tauri 配置
└── docs/                    # 文档目录（这里）
```

---

## 🚀 快速开始

```bash
pnpm install
pnpm dev          # Web 版
pnpm tauri dev    # 桌面版
```

详见 [guides/GETTING_STARTED.md](./guides/GETTING_STARTED.md)

---

## 📝 添加/修改文档

1. 修改 `docs/` 下的 `.md` 文件
2. 更新本 `README.md` 的导航
3. 提交时注明文档变更

---

_最后更新：2026-04-12_
