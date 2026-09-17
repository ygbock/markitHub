import { lightColorTokens, darkColorTokens, ColorTokens, radiusTokens, shadowTokens, spacingTokens } from './tokens';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export function getThemeVariables(mode: ResolvedTheme): Record<string, string> {
  const colors = mode === 'dark' ? darkColorTokens : lightColorTokens;
  return {
    '--mk-background': colors.background,
    '--mk-surface': colors.surface,
    '--mk-surface-elevated': colors.surfaceElevated,
    '--mk-surface-muted': colors.surfaceMuted,
    '--mk-foreground': colors.foreground,
    '--mk-foreground-muted': colors.foregroundMuted,
    '--mk-border': colors.border,
    '--mk-border-subtle': colors.borderSubtle,
    '--mk-primary': colors.primary,
    '--mk-primary-foreground': colors.primaryForeground,
    '--mk-secondary': colors.secondary,
    '--mk-secondary-foreground': colors.secondaryForeground,
    '--mk-success': colors.success,
    '--mk-success-foreground': colors.successForeground,
    '--mk-warning': colors.warning,
    '--mk-warning-foreground': colors.warningForeground,
    '--mk-danger': colors.danger,
    '--mk-danger-foreground': colors.dangerForeground,
    '--mk-info': colors.info,
    '--mk-info-foreground': colors.infoForeground,
    '--mk-focus': colors.focus,
    '--mk-overlay': colors.overlay,

    // Radii
    '--mk-radius-sm': radiusTokens.sm,
    '--mk-radius-md': radiusTokens.md,
    '--mk-radius-lg': radiusTokens.lg,
    '--mk-radius-xl': radiusTokens.xl,
    '--mk-radius-full': radiusTokens.full,

    // Shadows
    '--mk-shadow-sm': shadowTokens.sm,
    '--mk-shadow-md': shadowTokens.md,
    '--mk-shadow-lg': shadowTokens.lg,
    '--mk-shadow-xl': shadowTokens.xl,
  };
}

export function applyThemeVariables(mode: ResolvedTheme): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const vars = getThemeVariables(mode);
  for (const [key, val] of Object.entries(vars)) {
    root.style.setProperty(key, val);
  }
  root.setAttribute('data-mk-theme', mode);
  if (mode === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}
