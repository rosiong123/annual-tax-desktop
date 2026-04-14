# CHANGELOG.md - 变更记录

> 项目变更历史。所有重大变更都应记录在此。

---

## [1.0.0] - 2026-04-12

### 新增

- 项目初始化
- 三报合一核心架构（支持月报、季报、年报）
- 多智能体决策流程（L1 → L3 → SLPE → Final）
- 证据完整度评分系统
- 小微优惠（SLPE）自动检测
- AI 驾驶舱界面
- 5 步完整申报流程

### 功能模块

| 模块 | 说明 |
|------|------|
| ExcelImporter | Excel 数据导入 |
| PeriodSelector | 税务周期选择 |
| multi-period-audit | 多周期审计核心 |
| audit-engine | 审计引擎 |

### 技术栈

- Tauri 2.x
- React 18
- TypeScript 5
- TailwindCSS 3.x
- Vite 5.x
- Electron 41.x

---

_格式参考：[Keep a Changelog](https://keepachangelog.com/)_
