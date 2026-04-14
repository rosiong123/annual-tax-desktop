/**
 * 设置状态管理 - Settings Store
 * 使用 Zustand 管理企业信息和AI设置
 *
 * 存储策略：
 * - localStorage（限制 2MB 以内）：
 *   ✅ API Key 配置（已用 safeStorage 加密）
 *   ✅ 用户偏好（选中的模型、UI 设置）
 *   ❌ 财务数据（改用 Dexie）
 *   ❌ 审计结果（改用 Dexie）
 *
 * 此 Store 专门存储轻量级配置数据，不包含大型财务数据。
 * 详见 src/services/storage-strategy.ts
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface CompanyInfo {
  name: string;
  taxId: string;
  industry: string;
}

interface SettingsState {
  // 企业信息
  companyInfo: CompanyInfo;

  // AI设置
  selectedAIModel: string;

  // 导入方式
  importTab: 'excel' | 'finance' | 'tax';

  // 动作
  setCompanyInfo: (info: Partial<CompanyInfo>) => void;
  setSelectedAIModel: (model: string) => void;
  setImportTab: (tab: 'excel' | 'finance' | 'tax') => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      // 初始状态
      companyInfo: {
        name: '',
        taxId: '',
        industry: '制造业',
      },
      selectedAIModel: 'gpt-5.4-pro',
      importTab: 'excel',

      // 动作
      setCompanyInfo: (info) => set((state) => ({
        companyInfo: { ...state.companyInfo, ...info }
      })),
      setSelectedAIModel: (model) => set({ selectedAIModel: model }),
      setImportTab: (tab) => set({ importTab: tab }),
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export default useSettingsStore;
