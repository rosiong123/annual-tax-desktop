# GETTING_STARTED.md - 快速开始

> 5 分钟内让你的开发环境跑起来。

---

## 前置要求

| 工具 | 版本 | 安装地址 |
|------|------|----------|
| Node.js | 18+ | https://nodejs.org/ |
| pnpm | 8+ | `npm i -g pnpm` |
| Rust | 1.70+ | https://rustup.rs/ |

---

## 安装步骤

### 1. 克隆项目

```bash
cd D:\ClaudeCode\annual-tax-desktop
```

### 2. 安装依赖

```bash
pnpm install
```

### 3. 开发模式

**Web 版本（推荐先跑这个）**
```bash
pnpm dev
```

**桌面版（需要 Tauri）**
```bash
pnpm tauri dev
```

### 4. 构建

```bash
# Web 构建
pnpm build

# 桌面版打包
pnpm electron:build
```

---

## 项目结构

```
src/
├── components/          # React 组件
│   ├── AISettings.tsx
│   ├── ExcelImporter.tsx
│   ├── FinanceConnect.tsx
│   ├── PeriodSelector.tsx
│   └── TaxSystemConnect.tsx
├── pages/              # 页面（待开发）
├── styles/             # 样式
├── utils/              # 业务逻辑 ⭐
│   ├── ai-service.ts
│   ├── audit-engine.ts
│   └── multi-period-audit.ts
└── App.tsx             # 主入口
```

---

## 快速验证

1. 运行 `pnpm dev`
2. 打开 http://localhost:5173
3. 点击"示例数据"按钮
4. 点击"开始审核"
5. 应该看到 AI 驾驶舱界面

---

## 常见问题

### Q: pnpm install 失败

```bash
# 清除缓存重试
pnpm store prune
rm -rf node_modules
pnpm install
```

### Q: Tauri 构建失败

确保 Rust 环境正确安装：
```bash
rustc --version
cargo --version
```

---

## 下一步

- [DEVELOPMENT.md](./DEVELOPMENT.md) - 开发流程和代码规范
- [ARCHITECTURE.md](../ARCHITECTURE.md) - 系统架构详解
