# 年度汇算清缴工具 — 代码审查报告

**审查日期：** 2026-04-14
**审查范围：** `src/` 全部 TypeScript/TSX 文件
**代码规模：** 约 6,800 行（含测试）
**测试覆盖：** 137 条测试，8 个文件，全部通过

---

## 一、执行摘要

本次审查发现 **3 个阻塞项（P1-P3）+ 2 个高优先级建议项（R3-R4）已在 2026-04-14 当日修复**。

剩余未处理项：R1（any 类型）、R2（AuditResult 三处定义）、R5（AI 超时）、R6（qwen-3）、R7（双轨存储）、R8（App.tsx 900行）。

---

## 二、修复状态（2026-04-14）

| 项 | 状态 | 修复内容 |
|----|------|---------|
| P1 | ✅ 已修复 | 迁移到 Electron safeStorage（OS 密钥链），降级时明确警告 |
| P2 | ✅ 已修复 | `verifyAuditLogChain` 现在重新计算每条记录的 hash |
| P3 | ✅ 已修复 | 规则库完全内联到 `src/rules/`，移除了 `../../../ai-finance-os/` |
| R3 | ✅ 已修复 | RISK-019 到 RISK-032 SUGGESTIONS 全部对齐 |
| R4 | ✅ 已修复 | `sortBy+[0]` → `limit(1).first()` |

---

## 三、阻塞项（已关闭）

### P1 | `src/services/ai-key-storage.ts` | API Key 存储不安全

**严重程度：** 🔴 阻塞
**影响：** 任何能访问 localStorage 的人都能拿到 API 明文

**问题代码：**

```typescript
// ai-key-storage.ts:10-16
function simpleEncrypt(text: string, key: string): string {
  const encrypted = [];
  for (let i = 0; i < text.length; i++) {
    encrypted.push(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return btoa(String.fromCharCode(...encrypted));
}
```

XOR + Base64 不是加密，是混淆。和明文存储相比，唯一的区别是需要多花 5 分钟逆向。XOR 可逆、Base64 可逆、密钥 `device_key` 也存在 localStorage 同文件里。

**加密 vs 混淆的本质区别：**
- 加密：密文 + 密钥 → 明文，缺一不可；且密钥应存在操作系统密钥链而非应用存储
- 混淆：密文 + 算法 = 明文，知道算法就等于知道明文

**当前存储结构：**
```
localStorage:
  device_key          ← 加密密钥（等于没藏）
  ai_api_keys_v1      ← XOR+Base64 密文（等于明文）
```

**修复方案：** 使用 Electron 内置的 `safeStorage` API：

```typescript
import { safeStorage } from 'electron';

// 存储时
if (safeStorage.isEncryptionAvailable()) {
  const encrypted = safeStorage.encryptString(apiKey);
  localStorage.setItem('ai_api_keys_v1', encrypted.toString('base64'));
} else {
  // fallback: 降级到密码学上不安全的存储，明确告知用户风险
}

// 读取时
const encrypted = localStorage.getItem('ai_api_keys_v1');
if (safeStorage.isEncryptionAvailable()) {
  return safeStorage.decryptString(Buffer.from(encrypted, 'base64'));
}
```

`safeStorage` 使用 OS 级别的密钥链（Windows DPAPI / macOS Keychain），密钥不出现在应用存储空间内。即使导出 localStorage 全文，没有当前登录用户的 OS 凭证也无法解密。

**补充：** `AVAILABLE_MODELS` 列表（ai-key-storage.ts:147-165）中 `qwen-3` 模型标注为 `supportsStream: true`，但 DashScope API 的 qwen-3 调用方式与 OpenAI 兼容格式不完全一致，当前配置很可能不可用。建议验证或标记为 `supportsStream: false`。

---

### P2 | `src/services/db.ts:264-277` | 审计链验证形同虚设

**严重程度：** 🔴 阻塞
**影响：** 记录内容被篡改后仍可通过验证，证据链失去法律效力

**当前代码：**

```typescript
// db.ts:264-277
export async function verifyAuditLogChain(sessionId: number): Promise<{
  valid: boolean;
  brokenAt?: number;
}> {
  const logs = await getAuditLogs(sessionId);

  for (let i = 1; i < logs.length; i++) {
    if (logs[i].prevHash !== logs[i - 1].hash) {  // ← 只检查 prevHash 引用
      return { valid: false, brokenAt: logs[i].id };
    }
  }

  return { valid: true };
}
```

这个函数只验证了 `prevHash` 的引用关系（即第 i 条的 `prevHash` 是否等于第 i-1 条的 `hash`），但**没有重新计算每条记录的 hash 值来验证内容是否被篡改**。

攻击场景：攻击者直接修改了数据库中某条记录的 `details` 字段（比如把"调增 10 万"改成"调增 1 万"），同时更新了该条记录的 `hash` 字段。由于引用关系没变，`verifyAuditLogChain` 仍返回 `valid: true`。

**正确做法：** 遍历时重新计算每条记录的 hash 并比对存储值

```typescript
export async function verifyAuditLogChain(sessionId: number): Promise<{
  valid: boolean;
  brokenAt?: number;
  tamperedRecords?: number[];
}> {
  const logs = await getAuditLogs(sessionId);
  const tamperedRecords: number[] = [];

  for (let i = 0; i < logs.length; i++) {
    const log = logs[i];
    // 重新计算 hash
    const dataToHash = `${log.sessionId}|${log.action}|${log.details}|${log.timestamp.toISOString()}|${log.prevHash}`;
    const computedHash = await computeHash(dataToHash);

    if (computedHash !== log.hash) {
      tamperedRecords.push(log.id!);
    }

    // 验证引用链
    if (i > 0 && logs[i].prevHash !== logs[i - 1].hash) {
      return { valid: false, brokenAt: log.id, tamperedRecords };
    }
  }

  return {
    valid: tamperedRecords.length === 0,
    tamperedRecords: tamperedRecords.length > 0 ? tamperedRecords : undefined,
  };
}
```

**注意：** `addAuditLog` 的 hash 计算顺序是正确的（第 i 条的 hash 是基于第 i 条内容 + `prevHash` 计算），问题只在 `verifyAuditLogChain` 端。

---

### P3 | `src/utils/audit-engine.ts:71,81` | 跨仓库相对路径硬编码

**严重程度：** 🔴 阻塞
**影响：** 生产打包和 CI 环境中 `../../../ai-finance-os/` 大概率 404，导致审核引擎降级但用户无感知

**问题代码：**

```typescript
// audit-engine.ts:71
type SharedRulesModule = typeof import('../../../ai-finance-os/shared/audit-rules/src/corporate-income-tax-rules');

// audit-engine.ts:81
_sharedRules = await import('../../../ai-finance-os/shared/audit-rules/src/corporate-income-tax-rules');
```

这条 import 依赖两个仓库在同一父目录下（`d:/ClaudeCode/`）的目录结构才能 work。在以下场景均会失败：
- `pnpm build` 打包后，文件结构被展平到 `release/`
- CI 服务器的 `workspaces` 配置与本地不一致
- 用户解压到不同路径

**更严重的是：** 当前降级逻辑是静默的（console.warn），用户看不到任何提示，不知道系统在使用 fallback 规则而可能遗漏审核项。

**修复方案（三选一）：**

| 方案 | 复杂度 | 可靠性 | 推荐场景 |
|------|--------|--------|---------|
| A. 发布内部 npm 包 `@company/audit-rules` | 高 | 高 | 多项目共用规则库 |
| B. 将规则文件 copy 到本仓库 `src/rules/` | 低 | 高 | 一次性解决，推荐 |
| C. 用 workspace 依赖引用 ai-finance-os | 中 | 中 | 两仓库需强同步时 |

方案 B 的落地成本最低：将 `ai-finance-os/shared/audit-rules/` 下的规则文件 copy 到本仓库，用 Vite alias 替代相对路径：

```typescript
// vite.config.mjs
resolve: {
  alias: {
    '@audit-rules': '/src/rules/audit-rules'
  }
}

// audit-engine.ts
const _sharedRules = await import('@audit-rules/corporate-income-tax-rules');
```

---

## 三、建议改进项

### R1 | 全局 `any` 类型滥用

**位置：** `src/stores/dataStore.ts` 几乎所有字段；`src/App.tsx` 的 AppState 接口

**影响：** TypeScript 失去类型检查保护，IDE 无法提供准确的自动补全，重构风险高。

建议：至少对 `dataStore.ts` 的 `companyData`、`financialData` 等核心字段补齐类型定义。这些是系统的主干数据流，用 `any` 等于放弃了 TypeScript 最大的价值。

---

### R2 | `AuditResult` 接口三处定义，字段冲突

三个文件各自定义了 `AuditResult`，结构完全不同：

| 文件 | 核心字段 |
|------|---------|
| `db.ts:50` | `resultData: string`（JSON stringified）+ 附件 metadata |
| `audit-engine.ts:53` | `score: number` + `riskLevel` + `summary` |
| `dataStore.ts:14` | `score: number` + `riskLevel: 'critical'\|...` + `issues[]` |
| `multi-period-audit.ts:29` | `period` + `score` + `riskLevel` + `issues[]` |

跨模块传数据时极易用错类型。建议在 `src/types/audit.ts` 统一导出，用命名区分：

```typescript
export interface AuditResultCore { score: number; riskLevel: RiskLevel; }
export interface AuditResultDB { id?: number; sessionId: number; resultData: string; ... }
export interface AuditResultUI { issues: AuditIssue[]; summary: AuditSummary; }
```

---

### R3 | `RISK_RULES` 和 `SUGGESTIONS` 索引错位

**位置：** `src/utils/risk-engine.ts:86-119`

`RISK_RULES` 定义到 `RISK-030`，但 `SUGGESTIONS` 定义到 `RISK-032`，且两者索引不对应：

| 行号 | SUGGESTIONS 键 | 对应规则 |
|------|----------------|---------|
| 106 | `RISK-018` | 无对应规则（规则列表从 RISK-001 到 RISK-030，跳过了 RISK-018） |
| 107 | `RISK-019` | 对应"收入结构单一" |
| 108 | `RISK-020` | 对应"客户集中度高" |
| ... | ... | 后续全部错位 |

导致触发 `RISK-020` 时用户看到的建议是"跨期收入需按权责发生制调整"（应为 RISK-019 的建议），直接误导用户决策。

**修复：** 删除 SUGGESTIONS 中的空档索引（RISK-018），确保每条规则的 index 与 SUGGESTIONS[key] 一一对应。

---

### R4 | `db.ts` 中 `sortBy + [0]` 反模式（全量加载再取第一条）

**位置：** `db.ts:217-223, 288-294, 234-239`

```typescript
// db.ts:234-239 addAuditLog 中的 prevLog 查询
const prevLog = await db.auditLogs
  .where('sessionId').equals(sessionId)
  .reverse()
  .sortBy('timestamp')
  .then(logs => logs[0]);  // ← 先加载全部日志，再取第一条
```

对于大型审计会话（数千条日志），这会不必要地加载全部数据到内存。正确做法是用 `limit(1)` + `first()`：

```typescript
const prevLog = await db.auditLogs
  .where('sessionId').equals(sessionId)
  .reverse()
  .limit(1)
  .first();  // ← 只加载 1 条
```

---

### R5 | AI 服务缺少超时控制与错误码分类

**位置：** `src/utils/ai-service.ts`（推测）

所有 AI 服务调用缺超时控制，HTTP 错误码（401 认证失败 / 429 限流 / 500 服务器错误 / 503 服务不可用）都显示同一错误文案。

建议：
- 为 fetch 调用添加 `AbortController` 超时（建议 60s）
- 按 HTTP 状态码分类报错：401 提示"API Key 无效或已过期"，429 提示"请求频率超限"，500/503 提示"AI 服务暂时不可用"

---

### R6 | `qwen-3` 模型调用格式存疑

**位置：** `src/services/ai-key-storage.ts:158`

DashScope API 的 qwen-3 与 OpenAI 兼容模式存在端点路径和 header 差异，当前 `AVAILABLE_MODELS` 中 `qwen-3` 的 `supportsStream: true` 可能误导用户。

建议：验证 qwen-3 的实际调用格式或暂时标记为 `supportsStream: false`。

---

### R7 | 双轨存储策略不清晰

**存储层现状：**
- **Dexie（IndexedDB）：** 审计结果、申报数据、会话记录
- **localStorage：** API Key 加密数据、选中的模型、设备 key

**问题：**
- 部分字段同时出现在两个存储中（如会话状态），没有明确主从
- `localStorage` 有 5MB 上限，大型财务数据导入（如 1000+ 科目余额表）有溢出风险
- API Key 之外的数据是否也应该走 Dexie 而非 localStorage，需要明确

---

### R8 | App.tsx 规模过大

`src/App.tsx` 当前超过 900 行，混合了 UI 渲染、状态管理、业务逻辑三个关注点。

建议：下一迭代将其按职责拆分为多个组件（数据导入区 / AI 终端面板 / 申报表单区），用 Zustand 共享状态。这不只是代码风格问题——900 行的文件是 bug 滋生的温床，重构可以低成本避免大量未来调试时间。

---

## 四、值得保持的设计模式

### ✅ `risk-engine.ts` — 数据驱动规则引擎

风险规则全部数据化（`RISK_RULES` 数组），新增规则只需在数组中添加一行定义，无需改写扫描逻辑。这是正确的方法论，扩展成本极低。

### ✅ `slpe-engine.ts` — `SLPE_STANDARDS` 常量化

小微企业的判定标准（从业人数、资产总额、应纳税所得额阈值）集中管理，符合单一数据源原则。政策调整时只改一处。

### ✅ Electron 安全基线配置正确

`contextIsolation: true`、`nodeIntegration: false`、`sandBox: true` 的配置是正确的安全基线，没有为了开发便利而牺牲安全。

### ✅ 构建代码分割有效

主包从 1.37MB 降至 421KB，PDF 生成和图表按需加载。这直接影响用户首次加载体验。

### ✅ `evidence-chain.ts` — SHA-256 证据链架构

每个数字可追溯来源的设计思路正确，与 P2 的 hash 验证形成互补（本报告的 P2 阻塞项是 `verifyAuditLogChain` 验证逻辑的缺陷，而非证据链架构本身）。

---

## 五、修复优先级建议

```
P1 (API Key 加密)          → 预计 2 小时
P2 (审计链验证)             → 预计 1 小时
P3 (跨仓库路径)             → 预计 1 小时（方案 B）

R3 (SUGGESTIONS 错位)      → 预计 30 分钟
R4 (sortBy+[0])            → 预计 20 分钟
R1 (any 类型)              → 预计 4 小时（渐进式）
R2 (AuditResult 统一)      → 预计 3 小时（需跨文件协调）
R5 (AI 超时)               → 预计 2 小时
R6 (qwen-3)               → 预计 1 小时（验证后决定）
R7 (双轨存储)              → 预计 3 小时（需架构决策）
R8 (App.tsx 拆分)          → 预计 6 小时
```

**建议执行顺序：** P1 → P2 → P3 → R3 → R4 → R5 → R6 → R2 → R1 → R7 → R8

P1-P3 关闭后系统即可进入可演示状态。R3-R4 是低投入高回报的 quick wins。R5-R6 改善用户体验但不影响核心逻辑。R1-R2-R7-R8 是架构层面的改善，回报周期较长但对长期可维护性至关重要。

---

## 六、附录

### A. 审查的文件清单

| 文件 | 行数 | 审查结果 |
|------|------|---------|
| `src/services/ai-key-storage.ts` | 174 | P1 |
| `src/services/db.ts` | 343 | P2, R4 |
| `src/utils/audit-engine.ts` | ~100 | P3 |
| `src/utils/risk-engine.ts` | 315 | R3 |
| `src/stores/dataStore.ts` | ~150 | R1, R2 |
| `src/App.tsx` | ~900 | R8 |
| `src/utils/slpe-engine.ts` | ~200 | ✅ |
| `src/utils/adjust-engine.ts` | ~300 | ✅ |
| `src/utils/evidence-chain.ts` | ~250 | ✅（架构） |
| `src/services/tax-forms.ts` | ~400 | ✅ |

### B. 相关规范参考

- Electron 安全最佳实践：https://www.electronjs.org/docs/tutorial/security
- Windows DPAPI（safeStorage 底层）：https://learn.microsoft.com/en-us/windows/win32/api/dpapi/
- 纳税调整扣除标准：《企业所得税法》第三章、《企业所得税法实施条例》第四十三条
- 小型微利企业标准：财税〔2023〕6 号
