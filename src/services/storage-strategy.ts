/**
 * 存储策略 - Storage Strategy
 *
 * 本系统采用双轨存储策略，明确划分 localStorage 和 Dexie (IndexedDB) 的使用范围。
 *
 * ==================== 存储分界线 ====================
 *
 * - localStorage（限制 2MB 以内）：
 *   ✅ API Key 配置（已用 safeStorage 加密）
 *   ✅ 用户偏好（选中的模型、UI 设置）
 *   ❌ 财务数据（改用 Dexie）
 *   ❌ 审计结果（改用 Dexie）
 *
 * - Dexie（无限额）：
 *   ✅ 财务数据（科目余额表、发票等）
 *   ✅ 审计结果和证据链
 *   ✅ 申报数据
 *   ✅ 会话记录
 *
 * ==================== 设计原则 ====================
 *
 * 1. localStorage 限额：浏览器 localStorage 有 5-10MB 上限，大型财务数据容易溢出
 * 2. Dexie 优势：基于 IndexedDB，支持大容量、索引查询、事务控制
 * 3. 安全隔离：敏感配置（API Key）仍使用 localStorage + safeStorage 加密
 * 4. 性能优化：频繁访问的轻量配置使用 localStorage，大型数据使用 Dexie
 *
 * ==================== 存储对应关系 ====================
 *
 * | 数据类型           | localStorage | Dexie      | 说明                    |
 * |-------------------|-------------|------------|------------------------|
 * | API Key           | ✅          | ❌         | safeStorage 加密        |
 * | 选中模型          | ✅          | ❌         | 轻量配置                |
 * | UI 设置           | ✅          | ❌         | 轻量配置                |
 * | 企业信息          | ✅          | ✅         | 轻量但需关联 session    |
 * | excelData         | ❌          | ✅         | 大型财务数据            |
 * | importedData      | ❌          | ✅         | 导入的原始数据          |
 * | auditResult       | ❌          | ✅         | 审计结果及证据链        |
 * | analysisResult    | ❌          | ✅         | 分析结果                |
 * | optimizationResult| ❌          | ✅         | 优化结果                |
 * | filingData        | ❌          | ✅         | 申报数据                |
 * | 会话记录          | ❌          | ✅         | 完整审计轨迹            |
 *
 * ==================== 迁移记录 ====================
 *
 * - 2026-04-14: excelData/importedData 从 localStorage 迁移到 Dexie
 *   (原 persist 配置使用 localStorage，现改为 Dexie)
 */

export {};
