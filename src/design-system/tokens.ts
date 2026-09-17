/**
 * MIKITHUB DESIGN TOKENS (Phase 1)
 *
 * Centralized design tokens establishing semantic colors, typography scale,
 * spacing, radii, shadows, and breakpoints.
 */

export interface ColorTokens {
  background: string;
  surface: string;
  surfaceElevated: string;
  surfaceMuted: string;
  foreground: string;
  foregroundMuted: string;
  border: string;
  borderSubtle: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  success: string;
  successForeground: string;
  warning: string;
  warningForeground: string;
  danger: string;
  dangerForeground: string;
  info: string;
  infoForeground: string;
  focus: string;
  overlay: string;
}

export const lightColorTokens: ColorTokens = {
  background: '#f8fafc', // slate-50
  surface: '#ffffff',
  surfaceElevated: '#ffffff',
  surfaceMuted: '#f1f5f9', // slate-100
  foreground: '#0f172a', // slate-900
  foregroundMuted: '#64748b', // slate-500
  border: '#e2e8f0', // slate-200
  borderSubtle: '#f1f5f9', // slate-100
  primary: '#4f46e5', // indigo-600
  primaryForeground: '#ffffff',
  secondary: '#e2e8f0', // slate-200
  secondaryForeground: '#1e293b', // slate-800
  success: '#10b981', // emerald-500
  successForeground: '#ffffff',
  warning: '#f59e0b', // amber-500
  warningForeground: '#ffffff',
  danger: '#ef4444', // rose-500
  dangerForeground: '#ffffff',
  info: '#0ea5e9', // sky-500
  infoForeground: '#ffffff',
  focus: '#6366f1', // indigo-500
  overlay: 'rgba(15, 23, 42, 0.6)',
};

export const darkColorTokens: ColorTokens = {
  background: '#020617', // slate-950
  surface: '#0f172a', // slate-900
  surfaceElevated: '#1e293b', // slate-800
  surfaceMuted: '#0b1120', // slate-925
  foreground: '#f8fafc', // slate-50
  foregroundMuted: '#94a3b8', // slate-400
  border: '#1e293b', // slate-800
  borderSubtle: '#0f172a', // slate-900
  primary: '#6366f1', // indigo-500
  primaryForeground: '#ffffff',
  secondary: '#1e293b', // slate-800
  secondaryForeground: '#e2e8f0', // slate-200
  success: '#10b981', // emerald-500
  successForeground: '#ffffff',
  warning: '#f59e0b', // amber-500
  warningForeground: '#ffffff',
  danger: '#f43f5e', // rose-500
  dangerForeground: '#ffffff',
  info: '#38bdf8', // sky-400
  infoForeground: '#ffffff',
  focus: '#818cf8', // indigo-400
  overlay: 'rgba(2, 6, 23, 0.75)',
};

export const spacingTokens = {
  '2xs': '0.25rem', // 4px
  xs: '0.5rem',    // 8px
  sm: '0.75rem',   // 12px
  md: '1rem',      // 16px
  lg: '1.5rem',    // 24px
  xl: '2rem',      // 32px
  '2xl': '2.5rem',  // 40px
  '3xl': '3rem',    // 48px
  '4xl': '4rem',    // 64px
} as const;

export const radiusTokens = {
  sm: '0.375rem', // 6px
  md: '0.5rem',   // 8px
  lg: '0.75rem',  // 12px
  xl: '1rem',     // 16px
  '2xl': '1.5rem', // 24px
  full: '9999px',
} as const;

export const shadowTokens = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
} as const;

export const typographyTokens = {
  display: {
    fontSize: '2.25rem', // 36px
    lineHeight: '2.5rem',
    fontWeight: '800',
    letterSpacing: '-0.025em',
  },
  h1: {
    fontSize: '1.875rem', // 30px
    lineHeight: '2.25rem',
    fontWeight: '700',
    letterSpacing: '-0.025em',
  },
  h2: {
    fontSize: '1.5rem', // 24px
    lineHeight: '2rem',
    fontWeight: '700',
    letterSpacing: '-0.02em',
  },
  h3: {
    fontSize: '1.25rem', // 20px
    lineHeight: '1.75rem',
    fontWeight: '600',
    letterSpacing: '-0.015em',
  },
  h4: {
    fontSize: '1.125rem', // 18px
    lineHeight: '1.5rem',
    fontWeight: '600',
    letterSpacing: '-0.01em',
  },
  body: {
    fontSize: '0.875rem', // 14px
    lineHeight: '1.25rem',
    fontWeight: '400',
    letterSpacing: '0',
  },
  bodySmall: {
    fontSize: '0.75rem', // 12px
    lineHeight: '1rem',
    fontWeight: '400',
    letterSpacing: '0',
  },
  label: {
    fontSize: '0.75rem', // 12px
    lineHeight: '1rem',
    fontWeight: '600',
    letterSpacing: '0.025em',
    textTransform: 'uppercase' as const,
  },
  caption: {
    fontSize: '0.6875rem', // 11px
    lineHeight: '0.875rem',
    fontWeight: '400',
    letterSpacing: '0.01em',
  },
  metric: {
    fontSize: '1.75rem', // 28px
    lineHeight: '2rem',
    fontWeight: '800',
    letterSpacing: '-0.02em',
    fontVariantNumeric: 'tabular-nums',
  },
} as const;
