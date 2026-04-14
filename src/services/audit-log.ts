/**
 * 审计日志服务
 * 结合 Dexie (数据库) + electron-log (系统日志)
 * 实现不可篡改的操作日志链
 */

import { addAuditLog, verifyAuditLogChain, type AuditLog } from './db';

// ==================== 日志级别 ====================

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface LogEntry {
  level: LogLevel;
  action: string;
  details: string;
  sessionId?: number;
  timestamp: Date;
}

// ==================== 全局日志缓冲 ====================

const logBuffer: LogEntry[] = [];
const MAX_BUFFER_SIZE = 100;

// ==================== 渲染进程日志（electron-log） ====================

export async function logToSystem(level: LogLevel, message: string): Promise<void> {
  const formatted = `[${level}] ${new Date().toISOString()} - ${message}`;

  try {
    switch (level) {
      case 'DEBUG':
        console.debug(formatted);
        break;
      case 'INFO':
        console.info(formatted);
        await window.electronAPI?.log?.info(message);
        break;
      case 'WARN':
        console.warn(formatted);
        await window.electronAPI?.log?.warn(message);
        break;
      case 'ERROR':
        console.error(formatted);
        await window.electronAPI?.log?.error(message);
        break;
    }
  } catch {
    // Fallback to console if electron API not available
    console.log(formatted);
  }
}

// ==================== 数据库审计日志 ====================

export async function logAuditAction(
  sessionId: number,
  action: string,
  details: string
): Promise<void> {
  // 写入数据库（链式哈希）
  await addAuditLog(sessionId, action, details);

  // 同时写入系统日志
  await logToSystem('INFO', `[Session ${sessionId}] ${action}: ${details}`);
}

// ==================== 审计日志验证 ====================

export async function verifySessionAuditChain(sessionId: number): Promise<{
  valid: boolean;
  brokenAt?: number;
  message?: string;
}> {
  const result = await verifyAuditLogChain(sessionId);

  if (result.valid) {
    return { valid: true, message: '审计链完整，无篡改迹象' };
  } else {
    await logToSystem('ERROR', `审计链验证失败，断裂点: ${result.brokenAt}`);
    return {
      valid: false,
      brokenAt: result.brokenAt,
      message: `审计链已被破坏，断裂点 ID: ${result.brokenAt}`,
    };
  }
}

// ==================== 批量日志写入 ====================

export function addToBuffer(entry: LogEntry): void {
  logBuffer.push(entry);

  if (logBuffer.length > MAX_BUFFER_SIZE) {
    logBuffer.shift();
  }
}

export async function flushBuffer(): Promise<void> {
  for (const entry of logBuffer) {
    await logToSystem(entry.level, entry.details);
  }
  logBuffer.length = 0;
}

// ==================== 导出审计日志 ====================

export async function exportAuditLogs(sessionId: number): Promise<AuditLog[]> {
  const { getAuditLogs } = await import('./db');
  return getAuditLogs(sessionId);
}

// ==================== 预定义操作类型 ====================

export const AuditActions = {
  // 数据导入
  IMPORT_EXCEL: 'IMPORT_EXCEL',
  IMPORT_CSV: 'IMPORT_CSV',
  IMPORT_DEMO: 'IMPORT_DEMO',
  CONNECT_FINANCE_SOFTWARE: 'CONNECT_FINANCE_SOFTWARE',

  // 税务审计
  START_AUDIT: 'START_AUDIT',
  AUDIT_PROGRESS: 'AUDIT_PROGRESS',
  AUDIT_COMPLETE: 'AUDIT_COMPLETE',
  AUDIT_ERROR: 'AUDIT_ERROR',

  // 风险分析
  RISK_ANALYSIS_START: 'RISK_ANALYSIS_START',
  RISK_ANALYSIS_COMPLETE: 'RISK_ANALYSIS_COMPLETE',

  // 优化建议
  OPTIMIZATION_START: 'OPTIMIZATION_START',
  OPTIMIZATION_COMPLETE: 'OPTIMIZATION_COMPLETE',

  // 申报
  GENERATE_FORMS: 'GENERATE_FORMS',
  EXPORT_PDF: 'EXPORT_PDF',
  EXPORT_ZIP: 'EXPORT_ZIP',
  MARK_AS_FILED: 'MARK_AS_FILED',

  // 会话管理
  SESSION_CREATE: 'SESSION_CREATE',
  SESSION_UPDATE: 'SESSION_UPDATE',
  SESSION_COMPLETE: 'SESSION_COMPLETE',
  SESSION_ARCHIVE: 'SESSION_ARCHIVE',

  // 设置
  SETTINGS_UPDATE: 'SETTINGS_UPDATE',
  AI_MODEL_CHANGE: 'AI_MODEL_CHANGE',
} as const;

export type AuditActionType = typeof AuditActions[keyof typeof AuditActions];
