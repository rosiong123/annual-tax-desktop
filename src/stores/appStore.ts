/**
 * 应用状态管理 - App Store
 * 使用 Zustand 管理应用核心状态
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { TaxPeriod, TaxPeriodType } from '../components/PeriodSelector';

export type Step = 'import' | 'audit' | 'analyze' | 'optimize' | 'file';
export type AuditPhase = 'idle' | 'L1' | 'L3' | 'SLPE' | 'Final';

interface AppState {
  // 步骤控制
  currentStep: Step;
  auditPhase: AuditPhase;

  // 处理状态
  isProcessing: boolean;
  isOnline: boolean;

  // 税务期间
  currentPeriod: TaxPeriod;

  // 终端日志
  terminalLogs: string[];

  // UI状态
  showAISettings: boolean;
  showExitFullscreenHint: boolean;

  // 动作
  setCurrentStep: (step: Step) => void;
  setAuditPhase: (phase: AuditPhase) => void;
  setIsProcessing: (processing: boolean) => void;
  setIsOnline: (online: boolean) => void;
  setCurrentPeriod: (period: TaxPeriod) => void;
  addTerminalLog: (log: string) => void;
  clearTerminalLogs: () => void;
  setShowAISettings: (show: boolean) => void;
  setShowExitFullscreenHint: (show: boolean) => void;
  reset: () => void;
}

const getInitialPeriod = (): TaxPeriod => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  if (month >= 0 && month <= 2) {
    return { type: 'annual', year: year - 1 };
  } else if (month >= 3 && month <= 5) {
    return { type: 'quarterly', year, quarter: 1 };
  } else if (month >= 6 && month <= 8) {
    return { type: 'quarterly', year, quarter: 2 };
  } else if (month >= 9 && month <= 11) {
    return { type: 'quarterly', year, quarter: 3 };
  }
  return { type: 'annual', year };
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // 初始状态
      currentStep: 'import',
      auditPhase: 'idle',
      isProcessing: false,
      isOnline: true,
      currentPeriod: getInitialPeriod(),
      terminalLogs: [],
      showAISettings: false,
      showExitFullscreenHint: false,

      // 动作
      setCurrentStep: (step) => set({ currentStep: step }),
      setAuditPhase: (phase) => set({ auditPhase: phase }),
      setIsProcessing: (processing) => set({ isProcessing: processing }),
      setIsOnline: (online) => set({ isOnline: online }),
      setCurrentPeriod: (period) => set({ currentPeriod: period }),
      addTerminalLog: (log) => set((state) => ({
        terminalLogs: [...state.terminalLogs, `> ${log}`]
      })),
      clearTerminalLogs: () => set({ terminalLogs: [] }),
      setShowAISettings: (show) => set({ showAISettings: show }),
      setShowExitFullscreenHint: (show) => set({ showExitFullscreenHint: show }),
      reset: () => set({
        currentStep: 'import',
        auditPhase: 'idle',
        isProcessing: false,
        terminalLogs: [],
      }),
    }),
    {
      name: 'app-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        currentPeriod: state.currentPeriod,
        isOnline: state.isOnline,
      }),
    }
  )
);

export default useAppStore;
