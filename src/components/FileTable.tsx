/**
 * FileTable - 带吸顶表头的文件列表组件
 * 支持大量文件滚动时表头始终可见
 */

import React, { useState } from 'react';
import { FileSpreadsheet, File, CheckCircle, AlertCircle, Loader, ChevronDown, ChevronUp, Search, X } from 'lucide-react';

export interface ImportedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  status: 'pending' | 'parsing' | 'success' | 'error';
  error?: string;
  recordCount?: number;   // 记录条数
  sheetCount?: number;    // Sheet数量
  importTime?: number;    // 导入时间戳
}

interface FileTableProps {
  files: ImportedFile[];
  /** 展开/收起原始数据列表 */
  defaultExpanded?: boolean;
  /** 点击文件行时的回调（如定位到相关分析） */
  onFileClick?: (file: ImportedFile) => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTime(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
}

// 状态徽章
function StatusBadge({ status }: { status: ImportedFile['status'] }) {
  if (status === 'success') return <span className="flex items-center gap-1 text-green-600 text-xs"><CheckCircle className="w-3 h-3" />成功</span>;
  if (status === 'error') return <span className="flex items-center gap-1 text-red-600 text-xs"><AlertCircle className="w-3 h-3" />失败</span>;
  if (status === 'parsing') return <span className="flex items-center gap-1 text-blue-600 text-xs"><Loader className="w-3 h-3 animate-spin" />解析中</span>;
  return <span className="text-gray-400 text-xs">等待</span>;
}

export default function FileTable({ files, defaultExpanded = true, onFileClick }: FileTableProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [search, setSearch] = useState('');

  const filtered = files.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalRecords = files.reduce((sum, f) => sum + (f.recordCount || 0), 0);

  if (files.length === 0) return null;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      {/* 组件头部 */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition text-left"
      >
        <div className="flex items-center gap-3">
          <FileSpreadsheet className="w-5 h-5 text-blue-600" />
          <span className="font-medium text-gray-800">
            原始文件列表
          </span>
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
            {files.length} 个文件
          </span>
          {totalRecords > 0 && (
            <span className="text-xs text-gray-500">
              共 {totalRecords.toLocaleString()} 条记录
            </span>
          )}
        </div>
        {expanded
          ? <ChevronUp className="w-4 h-4 text-gray-500" />
          : <ChevronDown className="w-4 h-4 text-gray-500" />
        }
      </button>

      {/* 表头搜索 */}
      { (expanded) && (
        <div className="px-4 py-2 border-b border-gray-100 flex items-center gap-2">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜索文件名..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 text-sm outline-none placeholder-gray-400"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          )}
          <span className="text-xs text-gray-400">{filtered.length} / {files.length}</span>
        </div>
      )}

      {/* 表格区域 - 固定高度，超出滚动 */}
      {expanded && (
        <div
          className="overflow-y-auto"
          style={{ maxHeight: 'calc(100vh - 340px)', minHeight: '200px' }}
        >
          <table className="w-full text-sm">
            {/* 吸顶表头 */}
            <thead className="sticky top-0 z-10 bg-white shadow-sm">
              <tr className="text-left text-gray-500 border-b border-gray-100">
                <th className="px-4 py-2.5 font-medium w-8">#</th>
                <th className="px-4 py-2.5 font-medium">文件名</th>
                <th className="px-4 py-2.5 font-medium w-20">大小</th>
                <th className="px-4 py-2.5 font-medium w-24">记录数</th>
                <th className="px-4 py-2.5 font-medium w-20">状态</th>
                <th className="px-4 py-2.5 font-medium w-16">时间</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    未找到匹配的文件
                  </td>
                </tr>
              )}
              {filtered.map((file, idx) => (
                <tr
                  key={file.id}
                  onClick={() => onFileClick?.(file)}
                  className={`border-b border-gray-50 hover:bg-blue-50 cursor-pointer transition ${
                    onFileClick ? 'cursor-pointer' : ''
                  }`}
                >
                  <td className="px-4 py-2.5 text-gray-400 text-xs">{idx + 1}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <File className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-gray-800 truncate max-w-xs" title={file.name}>
                        {file.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-gray-500">{formatSize(file.size)}</td>
                  <td className="px-4 py-2.5 text-gray-500">
                    {file.recordCount != null ? file.recordCount.toLocaleString() : '-'}
                  </td>
                  <td className="px-4 py-2.5"><StatusBadge status={file.status} /></td>
                  <td className="px-4 py-2.5 text-gray-400 text-xs">
                    {file.importTime ? formatTime(file.importTime) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
