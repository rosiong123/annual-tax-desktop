# 贡献指南

> 欢迎贡献代码！请遵循以下指南。

---

## 开发前准备

1. 阅读 [SOUL.md](./SOUL.md) - 了解项目原则
2. 阅读 [ARCHITECTURE.md](./ARCHITECTURE.md) - 了解系统架构
3. 阅读 [GETTING_STARTED.md](./guides/GETTING_STARTED.md) - 搭建开发环境

---

## 分支管理

```
main          # 稳定版本
├── develop   # 开发分支
│   ├── feature/xxx   # 功能分支
│   └── fix/xxx       # 修复分支
└── release/xxx       # 发布分支
```

**命名规范**：
- 功能：`feature/功能名称`
- 修复：`fix/问题描述`
- 文档：`docs/文档类型`

---

## 提交规范

### 格式

```
<type>: <subject>

<body>

<footer>
```

### 类型

| 类型 | 说明 |
|------|------|
| `feat` | 新功能 |
| `fix` | Bug 修复 |
| `docs` | 文档更新 |
| `style` | 格式调整（不影响代码） |
| `refactor` | 重构 |
| `test` | 测试相关 |
| `chore` | 构建/工具 |

### 示例

```
feat: 添加多周期申报表导出功能

支持导出 Excel 格式的 A100000、A101010 等申报表

Closes #123
```

---

## 代码规范

### TypeScript

- 使用 `interface` 定义对象
- 避免 `any`，使用 `unknown` 代替
- 导出的函数添加 JSDoc 注释

```typescript
/**
 * 运行多周期审计
 * @param period 税务周期
 * @param data 财务数据
 * @returns 审计结果
 */
export function runMultiPeriodAudit(period: TaxPeriod, data: FinancialData): AuditResult
```

### React 组件

- 函数组件 + Hooks
- Props 使用 `interface` 定义
- 组件文件首字母大写

### 样式

- 使用 Tailwind CSS
- 复用 `card`、`btn-primary` 等通用类

---

## 文档要求

- 新功能必须有文档
- API 变更需要更新参考文档
- 破坏性变更需要迁移指南

---

## 测试

```bash
pnpm test        # 运行测试
pnpm build       # 构建验证
```

---

## Pull Request

1. Fork 仓库
2. 创建功能分支
3. 提交代码
4. 创建 Pull Request
5. 等待 Code Review

### PR 模板

```markdown
## 描述
<!-- 简述这个 PR 做什么 -->

## 类型
- [ ] 功能新增
- [ ] Bug 修复
- [ ] 文档更新
- [ ] 重构

## 截图
<!-- 如果有 UI 变更 -->

## 检查清单
- [ ] 代码通过 lint
- [ ] 有必要的测试
- [ ] 文档已更新
```

---

_最后更新：2026-04-12_
