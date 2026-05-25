// ═══════════════════════════════════════════════════════════════════════════════
// eAdmin Guinée — Design System
// Premium institutional design inspired by Stripe, Gov.uk, Linear, Datadog
// Guinea national colors: #CE1126 (red), #FCD116 (yellow), #009460 (green)
// ═══════════════════════════════════════════════════════════════════════════════

export const GUINEA_COLORS = {
  red: '#CE1126',
  yellow: '#FCD116',
  green: '#009460',
} as const

export const DESIGN_TOKENS = {
  colors: {
    primary: {
      50: '#FEF2F2',
      100: '#FEE2E2',
      200: '#FECACA',
      300: '#FCA5A5',
      400: '#F87171',
      500: '#CE1126',
      600: '#B01020',
      700: '#991B1B',
      800: '#7F1D1D',
      900: '#661212',
    },
    secondary: {
      50: '#FFFBEB',
      100: '#FEF3C7',
      200: '#FDE68A',
      300: '#FCD34D',
      400: '#FBBF24',
      500: '#FCD116',
      600: '#D4A012',
      700: '#B8860B',
      800: '#92710C',
      900: '#78590A',
    },
    accent: {
      50: '#ECFDF5',
      100: '#D1FAE5',
      200: '#A7F3D0',
      300: '#6EE7B7',
      400: '#34D399',
      500: '#009460',
      600: '#007A4F',
      700: '#00613F',
      800: '#004D33',
      900: '#003A27',
    },
    neutral: {
      50: '#F9FAFB',
      100: '#F3F4F6',
      200: '#E5E7EB',
      300: '#D1D5DB',
      400: '#9CA3AF',
      500: '#6B7280',
      600: '#4B5563',
      700: '#374151',
      800: '#1F2937',
      900: '#111827',
    },
    success: {
      50: '#ECFDF5', 100: '#D1FAE5', 200: '#A7F3D0', 300: '#6EE7B7',
      400: '#34D399', 500: '#10B981', 600: '#059669', 700: '#047857',
      800: '#065F46', 900: '#064E3B',
    },
    warning: {
      50: '#FFFBEB', 100: '#FEF3C7', 200: '#FDE68A', 300: '#FCD34D',
      400: '#FBBF24', 500: '#F59E0B', 600: '#D97706', 700: '#B45309',
      800: '#92400E', 900: '#78350F',
    },
    error: {
      50: '#FEF2F2', 100: '#FEE2E2', 200: '#FECACA', 300: '#FCA5A5',
      400: '#F87171', 500: '#EF4444', 600: '#DC2626', 700: '#B91C1C',
      800: '#991B1B', 900: '#7F1D1D',
    },
    info: {
      50: '#EFF6FF', 100: '#DBEAFE', 200: '#BFDBFE', 300: '#93C5FD',
      400: '#60A5FA', 500: '#3B82F6', 600: '#2563EB', 700: '#1D4ED8',
      800: '#1E40AF', 900: '#1E3A8A',
    },
  },
  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    '2xl': '24px',
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    card: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    hover: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  },
  typography: {
    fontFamilies: {
      heading: "'Inter', 'Noto Sans SC', system-ui, -apple-system, sans-serif",
      body: "'Inter', 'Noto Serif SC', system-ui, -apple-system, sans-serif",
      mono: "'JetBrains Mono', 'Sarasa Mono SC', monospace",
    },
    fontSizes: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem',
      '5xl': '3rem',
    },
    fontWeights: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeights: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
    },
  },
  animation: {
    durations: {
      fast: '150ms',
      normal: '250ms',
      slow: '350ms',
    },
    easings: {
      default: 'cubic-bezier(0.4, 0, 0.2, 1)',
      spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    },
  },
  spacing: {
    0: '0px',
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    5: '20px',
    6: '24px',
    8: '32px',
    10: '40px',
    12: '48px',
    16: '64px',
    20: '80px',
    24: '96px',
  },
} as const

// Guinea-themed gradient backgrounds
export const GUINEA_GRADIENTS = {
  horizontal: 'linear-gradient(90deg, #CE1126, #FCD116, #009460)',
  vertical: 'linear-gradient(180deg, #CE1126, #FCD116, #009460)',
  subtle: 'linear-gradient(135deg, #CE1126 0%, #D4323A 33%, #FCD116 33%, #FBD94E 66%, #009460 66%, #00A86B 100%)',
  hero: 'linear-gradient(135deg, #661212 0%, #CE1126 40%, #D4A012 60%, #009460 100%)',
  card: 'linear-gradient(135deg, #FEF2F2, #FFFBEB, #ECFDF5)',
  darkHero: 'linear-gradient(135deg, #1F2937 0%, #374151 40%, #1F2937 100%)',
}

// Status colors for workflow states
export const WORKFLOW_STATUS_COLORS = {
  pending: { bg: '#FFFBEB', text: '#92400E', border: '#FDE68A', dot: '#F59E0B' },
  in_progress: { bg: '#EFF6FF', text: '#1E40AF', border: '#BFDBFE', dot: '#3B82F6' },
  approved: { bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0', dot: '#10B981' },
  rejected: { bg: '#FEF2F2', text: '#991B1B', border: '#FECACA', dot: '#EF4444' },
  signed: { bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0', dot: '#009460' },
  escalated: { bg: '#FEF2F2', text: '#7F1D1D', border: '#FCA5A5', dot: '#CE1126' },
  draft: { bg: '#F9FAFB', text: '#4B5563', border: '#E5E7EB', dot: '#9CA3AF' },
  archived: { bg: '#F3F4F6', text: '#6B7280', border: '#D1D5DB', dot: '#9CA3AF' },
} as const

// Role-specific colors
export const ROLE_COLORS = {
  SUPER_ADMIN: { bg: '#FEF2F2', text: '#991B1B', badge: '#CE1126' },
  MINISTRE: { bg: '#FEF2F2', text: '#B91C1C', badge: '#DC2626' },
  DIRECTEUR: { bg: '#FFFBEB', text: '#92400E', badge: '#FCD116' },
  CHEF_SERVICE: { bg: '#FFFBEB', text: '#78350F', badge: '#D97706' },
  ADMIN: { bg: '#EFF6FF', text: '#1E40AF', badge: '#3B82F6' },
  AGENT: { bg: '#ECFDF5', text: '#065F46', badge: '#009460' },
  MAIRIE: { bg: '#ECFDF5', text: '#065F46', badge: '#34D399' },
  AGENCE: { bg: '#ECFDF5', text: '#065F46', badge: '#6EE7B7' },
  CITOYEN: { bg: '#F3F4F6', text: '#374151', badge: '#6B7280' },
} as const
