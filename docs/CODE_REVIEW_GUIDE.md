# 代码审查指南

> 适用项目：annual-tax-desktop（年度汇算清缴桌面工具）
> 技术栈：Electron + React + TypeScript + Dexie + Zustand + Vite
> 最后更新：2026-04-12

---

## 一、优先级体系

每条审查意见必须标注优先级，不允许含糊带过：

| 标记 | 含义 | 示例场景 |
|------|------|----------|
| 🔴 **阻塞** | 必须修复才能合并 | 安全漏洞、数据丢失、逻辑错误 |
| 🟡 **建议** | 应该修复，下一个迭代必须关闭 | 缺少验证、命名混乱、重复逻辑 |
| 💭 **挑剔** | 有时间再处理 | 可读性小改进、注释补充 |
| ✅ **赞扬** | 值得指出的好设计 | 写得优雅、防守性编程做得好 |

---

## 二、针对本项目的审查清单

### 2.1 🔴 安全与数据完整性（最高优先）

本项目处理纳税人敏感财务数据，安全是红线。

#### API Key 存储安全

当前实现（`src/services/ai-key-storage.ts`）使用了 XOR + Base64 的"加密"方式，这不是加密，是混淆。审查时需检查：

- [ ] **是否在 Electron 主进程中使用了 `safeStorage` API？**
  当前代码注释已承认"生产环境应使用 Electron secureStorage"，但实际未落地。
  ```
  // 简单的加密函数（生产环境应使用 Electron secureStorage）
  ```
  任何使用 localStorage 存储 API Key 的 PR 都应被阻塞。

- [ ] **device_key 存储在 localStorage 中是否安全？**
  `getDeviceKey()` 把随机生成的 device_key 也放在 localStorage，意味着加密密钥和密文在同一个位置，毫无意义。必须迁移到 Electron `safeStorage` 或 OS 密钥链。

- [ ] **是否存在 API Key 泄露路径？**
  检查 Key 是否出现在日志、错误信息、Electron IPC 消息中。

#### 审计日志链完整性

`db.ts` 中的 `verifyAuditLogChain` 只验证了 `prevHash` 链是否连续，但没有重新计算每条记录的 hash 值，可被篡改：

- [ ] **`verifyAuditLogChain` 是否重新计算并对比每条记录的 hash？**

  目前实现：
  ```typescript
  // 只检查 prevHash 引用是否连续，不验证 hash 值本身是否正确
  if (logs[i].prevHash !== logs[i - 1].hash) { ... }
  ```
  正确实现应重新计算每条记录的 hash 并与存储值比对。

#### 数据来源验证

- [ ] **Excel 导入是否限制文件大小？** 未限制可能导致内存耗尽
- [ ] **是否校验文件 MIME 类型？** 仅检查扩展名可被绕过
- [ ] **解析 Excel 时是否有异常熔断机制？** 恶意构造的 xlsx 可能导致崩溃

---

### 2.2 🔴 正确性问题

#### 类型定义冲突

项目中存在**同名接口定义在不同文件**的问题，已发现：

- `src/stores/dataStore.ts` → `AuditResult`（含 `slpeQualification`、`adjustment` 字段）
- `src/utils/audit-engine.ts` → `AuditResult`（含 `passed` 字段，`riskLevel` 值域不同）
- `src/services/db.ts` → `AuditResult`（数据库存储格式，含 `riskScore`、`resultData` 字符串化 JSON）

审查 PR 时必须检查：
- [ ] **新增的 `AuditResult`、`FilingData`、`ImportedData` 来自哪个模块？是否引用了错误的类型？**
- [ ] **跨模块传递数据时是否存在隐式类型强转（`as any`、`as unknown as X`）？**

#### `any` 类型滥用

`dataStore.ts` 中：
```typescript
excelData: any;
importedData: any;
```
这会使 TypeScript 保护失效，导致运行时错误难以追踪。

- [ ] **所有 `any` 类型必须有书面说明，或替换为具体类型/`unknown`**

#### 懒加载失败的静默处理

`audit-engine.ts` 中共享规则库加载失败时直接返回 `null` 并 fallback：
```typescript
let _sharedLoadFailed = false;
// 加载失败 → 静默降级
```
- [ ] **降级到内置规则时，是否向用户明确提示？审计结果是否标注了"规则不完整"警告？**

---

### 2.3 🟡 可维护性问题

#### 持久化存储双轨并存

项目同时使用了 Dexie（IndexedDB）和 localStorage 的 Zustand persist：

- `src/services/db.ts` → Dexie 存储（结构化、有 Schema）
- `src/stores/dataStore.ts` → localStorage persist（非结构化 JSON）

两套存储的内容存在重叠，审查时检查：
- [ ] **新 PR 是否明确说明了选择哪套存储，以及原因？**
- [ ] **审计结果等核心数据是否只写入了一套存储？**
- [ ] **是否存在两套数据状态不一致的风险？**

#### 共享模块跨仓库引用

`audit-engine.ts` 使用相对路径引用了 `ai-finance-os` 仓库的共享规则：
```typescript
type SharedRulesModule = typeof import('../../../ai-finance-os/shared/audit-rules/src/...');
```
- [ ] **这是 monorepo workspace 依赖还是目录假设？** 在 CI 或不同开发机上是否能保证路径存在？
- [ ] **共享规则的版本是否有锁定机制？**

#### 组件内类型定义外泄

`ExcelImporter.tsx` 在组件文件内定义了 `BalanceSheet`、`IncomeStatement`、`SubjectBalance` 等业务类型接口，这些类型应该在 `src/types/` 中统一管理：
- [ ] **业务核心类型是否在 `src/types/` 统一声明？**

#### 硬编码业务常量

`risk-engine.ts` 中税务规则阈值（如业务招待费 5‰、福利费 14%）直接写死在代码中，无法通过配置更新：
- [ ] **税务规则阈值是否应提取到独立配置文件或常量模块中？**（税法修订时只需改配置，不需要改逻辑）

---

### 2.4 🟡 性能问题

#### IndexedDB 排序回路

`db.ts` 中多处先 `sortBy` 再取 `[0]`：
```typescript
.reverse()
.sortBy('createdAt')
.then(results => results[0]);
```
`sortBy` 会将所有结果加载到内存再排序，当数据量大时性能很差。应改用 Dexie 的 `last()` 或限制查询数量：
- [ ] **含 `sortBy + [0]` 模式的查询是否有数据量上限的说明？**

#### Zustand persist 存储大对象

`dataStore.ts` 将 `excelData`（Excel 原始数据）、`auditResult`（完整审计结果 JSON）全部序列化到 localStorage：
- [ ] **大型审计结果是否应只缓存摘要，完整数据只存 Dexie？**
- [ ] **是否存在 localStorage 超限（约 5MB）的风险？**

---

### 2.5 🟡 测试覆盖

本项目测试基础设施已到位（Vitest + Testing Library + Playwright），但实际覆盖需检查：

- [ ] **风险引擎（`risk-engine.ts`）的 30+ 条规则是否有单元测试？** 规则阈值计算错误是最高风险场景
- [ ] **审计日志 hash 链验证是否有测试？**
- [ ] **Excel 解析是否有边界用例测试？**（空文件、格式错误、超大文件）
- [ ] **AI 服务调用是否有 mock 测试？**（避免 CI 实际调用外部 API）

**最低测试要求（必须阻塞）：**
- 新增业务逻辑必须附带对应单元测试
- 修复 Bug 必须附带防回归测试

---

### 2.6 💭 代码风格一致性

不强制，但团队应统一：

- [ ] 工具函数文件头注释风格是否一致？（`db.ts` 有，`ai-service.ts` 无）
- [ ] 错误处理方式是否统一？（部分用 `try/catch`，部分用 `.catch()`，部分忽略）
- [ ] 中英文混用注释是否影响可读性？

---

## 三、审查流程

### PR 提交前（作者自查）

```
□ 自己先跑一遍 lint：pnpm run build（TypeScript 编译）
□ 自己先跑一遍测试：pnpm test
□ 对照第二节清单做自检，在 PR 描述中说明每个阻塞项的处理结论
□ PR 描述包含：改了什么、为什么改、如何测试
```

### PR 创建

**PR 描述模板：**

```markdown
## 改动概述
[一句话说清楚这个 PR 做了什么]

## 变更类型
- [ ] 新功能
- [ ] Bug 修复
- [ ] 重构
- [ ] 配置/依赖变更

## 自测结果
- [ ] TypeScript 编译通过
- [ ] 单元测试全部通过
- [ ] 手动测试了以下场景：[具体描述]

## 安全自查（如涉及敏感数据处理）
- [ ] 未新增 any 类型
- [ ] 无敏感数据写入日志
- [ ] 无 API Key 明文传递
```

### Review 时间要求

| PR 大小 | 期望 Review 时间 |
|---------|----------------|
| < 200 行改动 | 24 小时内 |
| 200~500 行 | 48 小时内 |
| > 500 行 | 需要拆分，或安排专项 Review |

### 合并条件

- 至少 1 名 reviewer approve
- 所有 🔴 阻塞意见已解决（Close 或明确说明延后原因）
- 🟡 建议意见可以转为 issue 跟踪，但需要在 PR 中留链接
- CI 通过（build + test）

---

## 四、本项目专项关注领域

基于代码现状，以下方向需要重点关注：

### 财务数据准确性
税务数据涉及法律风险，任何数值计算逻辑变更都需要：
1. 附上对应税法条款的引用
2. 用真实数据场景做回归测试
3. 在 PR 中说明边界值（负数、零值、超大金额）的处理

### AI 接口健壮性
多模型适配（`ai-service.ts`）涉及多个外部服务：
- 每个模型的 API 格式差异需要有文档
- 新增模型时需要附带 mock 测试
- 超时、限流、余额不足等错误必须有用户友好的提示

### Electron 主进程/渲染进程隔离
`electron/main.js` 的 IPC 通信需要检查：
- 渲染进程不能直接访问 Node.js API（CSP 和 contextIsolation）
- IPC 消息不能盲目信任，需要在主进程侧验证入参

---

## 五、快速参考：一眼判断要不要阻塞

遇到以下代码，直接标记 🔴 阻塞：

```typescript
// ❌ 直接在 localStorage 存明文 API Key
localStorage.setItem('api_key', apiKey);

// ❌ 把用户数据打到日志
log.info('audit result:', JSON.stringify(fullAuditResult));

// ❌ 关键财务计算用 any
function calculate(a: any, b: any) { return a + b; }

// ❌ 渲染进程直接 require Node 模块（contextIsolation 绕过）
const fs = require('fs');

// ❌ 未处理 Promise rejection 的异步操作（静默失败）
someAsyncOperation(); // 没有 await 也没有 .catch()
```

遇到以下代码，标记 🟡 建议：

```typescript
// ⚠️ 重复实现 sortBy + [0] 反模式
.sortBy('createdAt').then(r => r[0]);

// ⚠️ 组件内定义核心业务类型
interface BalanceSheet { ... } // 放在 ExcelImporter.tsx 里

// ⚠️ 税务规则阈值硬编码
warning: 0.005, // 5‰ 业务招待费
```

---

*本文档应随项目演进持续更新。发现新的审查模式，请直接在 PR 中提出，合并后更新此文档。*
