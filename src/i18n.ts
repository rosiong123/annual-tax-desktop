/**
 * 国际化工具 - Internationalization Utility
 * 支持中英文切换
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import zhCN from './locales/zh-CN.json';
import en from './locales/en.json';

type Locale = 'zh-CN' | 'en';

type LocaleMessages = typeof zhCN;

// 嵌套键获取工具函数
function getNestedValue(obj: any, path: string): string {
  return path.split('.').reduce((current, key) => current?.[key], obj) ?? path;
}

// 加载语言文件
const messages: Record<Locale, LocaleMessages> = {
  'zh-CN': zhCN,
  'en': en,
};

interface I18nState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

// 从 localStorage 恢复语言设置
function getInitialLocale(): Locale {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('locale');
    if (stored === 'en' || stored === 'zh-CN') {
      return stored;
    }
    // 根据浏览器语言设置默认语言
    const browserLang = navigator.language;
    if (browserLang.startsWith('en')) {
      return 'en';
    }
  }
  return 'zh-CN';
}

export const useI18nStore = create<I18nState>()(
  persist(
    (set) => ({
      locale: getInitialLocale(),
      setLocale: (locale) => set({ locale }),
    }),
    {
      name: 'i18n-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

/**
 * 翻译函数
 * @param key 键路径，如 'app.title' 或 'steps.import'
 * @param params 替换参数，如 { name: 'xxx' }
 */
export function t(key: string, params?: Record<string, string | number>): string {
  const { locale } = useI18nStore.getState();
  const message = getNestedValue(messages[locale], key);

  if (params) {
    return Object.entries(params).reduce(
      (str, [k, v]) => str.replace(new RegExp(`{{${k}}}`, 'g'), String(v)),
      message
    );
  }

  return message;
}

/**
 * 获取当前语言
 */
export function getCurrentLocale(): Locale {
  return useI18nStore.getState().locale;
}

/**
 * 切换语言
 */
export function switchLocale(locale?: Locale): void {
  if (locale) {
    useI18nStore.getState().setLocale(locale);
  } else {
    const current = useI18nStore.getState().locale;
    useI18nStore.getState().setLocale(current === 'zh-CN' ? 'en' : 'zh-CN');
  }
}

/**
 * 格式化数字（根据语言）
 */
export function formatNumber(value: number, locale?: Locale): string {
  const l = locale || useI18nStore.getState().locale;
  return new Intl.NumberFormat(l === 'en' ? 'en-US' : 'zh-CN').format(value);
}

/**
 * 格式化货币（根据语言）
 */
export function formatCurrency(value: number, locale?: Locale): string {
  const l = locale || useI18nStore.getState().locale;
  const formatter = new Intl.NumberFormat(l === 'en' ? 'en-US' : 'zh-CN', {
    style: 'currency',
    currency: l === 'en' ? 'USD' : 'CNY',
    minimumFractionDigits: 2,
  });
  return formatter.format(value);
}

/**
 * 格式化百分比
 */
export function formatPercent(value: number, locale?: Locale): string {
  const l = locale || useI18nStore.getState().locale;
  return new Intl.NumberFormat(l === 'en' ? 'en-US' : 'zh-CN', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * 格式化日期（根据语言）
 */
export function formatDate(date: Date | number, locale?: Locale): string {
  const l = locale || useI18nStore.getState().locale;
  const d = typeof date === 'number' ? new Date(date) : date;
  return new Intl.DateTimeFormat(l === 'en' ? 'en-US' : 'zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

export default {
  useI18nStore,
  t,
  getCurrentLocale,
  switchLocale,
  formatNumber,
  formatCurrency,
  formatPercent,
  formatDate,
};
