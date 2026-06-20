export type FontSize = 'small' | 'medium' | 'large';
export type CardDensity = 'compact' | 'normal';
export type SidebarWidth = 'narrow' | 'normal' | 'wide';
export type ThemeMode = 'light' | 'dark';

export interface AppSettings {
  fontSize: FontSize;
  cardDensity: CardDensity;
  sidebarWidth: SidebarWidth;
  theme: ThemeMode;
}

const STORAGE_KEY = 'ibm-prefs';

const defaults: AppSettings = {
  fontSize: 'medium',
  cardDensity: 'compact',
  sidebarWidth: 'normal',
  theme: 'light',
};

function load(): AppSettings {
  if (import.meta.client) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return { ...defaults, ...JSON.parse(raw) };
    } catch {
      /* ignore */
    }
  }
  return { ...defaults };
}

function persist(s: AppSettings) {
  if (import.meta.client) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  }
}

function applyCSS(s: AppSettings) {
  if (!import.meta.client) return;
  const root = document.documentElement;

  // Font size scale
  const scales: Record<FontSize, { base: string; sm: string; xs: string; lg: string }> = {
    small: { base: '13px', sm: '12px', xs: '11px', lg: '18px' },
    medium: { base: '14px', sm: '13px', xs: '12px', lg: '20px' },
    large: { base: '15px', sm: '14px', xs: '13px', lg: '22px' },
  };
  const scale = scales[s.fontSize];
  root.style.setProperty('--fs-base', scale.base);
  root.style.setProperty('--fs-sm', scale.sm);
  root.style.setProperty('--fs-xs', scale.xs);
  root.style.setProperty('--fs-lg', scale.lg);

  // Card density
  root.style.setProperty('--card-px', s.cardDensity === 'compact' ? '16px' : '20px');
  root.style.setProperty('--card-py', s.cardDensity === 'compact' ? '12px' : '16px');
  root.style.setProperty('--card-body-p', s.cardDensity === 'compact' ? '16px' : '20px');
  root.style.setProperty('--card-gap', s.cardDensity === 'compact' ? '12px' : '16px');

  // Sidebar width
  const widths: Record<SidebarWidth, string> = {
    narrow: '192px',
    normal: '224px',
    wide: '256px',
  };
  root.style.setProperty('--sidebar-w', widths[s.sidebarWidth]);

  // Theme : bascule la classe 'dark' sur <html>
  if (s.theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

export const useAppSettings = () => {
  const settings = reactive<AppSettings>(load());

  function update(partial: Partial<AppSettings>) {
    Object.assign(settings, partial);
    persist({ ...settings });
    applyCSS(settings);
  }

  function reset() {
    update({ ...defaults });
  }

  // Apply on first call
  if (import.meta.client) {
    applyCSS(settings);
  }

  return {
    settings: settings as Readonly<AppSettings>,
    update,
    reset,
  };
};
