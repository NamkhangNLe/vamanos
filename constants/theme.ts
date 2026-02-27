/**
 * Vámonos Design System
 * Apple HIG-inspired tokens for a premium, cohesive UI
 */

export const Colors = {
  // Primary
  primary: '#007AFF',
  primaryLight: '#47A0FF',
  primaryDark: '#0056CC',

  // Neutrals (Apple System)
  black: '#000000',
  white: '#FFFFFF',
  text: '#1C1C1E',
  textSecondary: '#8E8E93',
  textTertiary: '#AEAEB2',

  // Backgrounds
  background: '#F2F2F7',
  backgroundElevated: '#FFFFFF',
  backgroundTertiary: '#E5E5EA',

  // Semantic
  success: '#34C759',
  warning: '#FF9500',
  danger: '#FF3B30',
  info: '#5AC8FA',

  // Accent (for highlights, badges, CTAs)
  accent: '#FF6B2C',
  accentSoft: 'rgba(255, 107, 44, 0.12)',

  // Separators
  separator: '#C6C6C8',
  separatorLight: 'rgba(60, 60, 67, 0.06)',

  // Overlays
  overlay: 'rgba(0, 0, 0, 0.4)',
  sheetBackground: 'rgba(255, 255, 255, 0.97)',

  // Tab bar
  tabActive: '#007AFF',
  tabInactive: '#8E8E93',
} as const;

export const Typography = {
  largeTitle: {
    fontSize: 34,
    fontWeight: '800' as const,
    letterSpacing: 0.37,
  },
  title1: {
    fontSize: 28,
    fontWeight: '700' as const,
    letterSpacing: 0.36,
  },
  title2: {
    fontSize: 22,
    fontWeight: '700' as const,
    letterSpacing: -0.26,
  },
  title3: {
    fontSize: 20,
    fontWeight: '600' as const,
    letterSpacing: -0.45,
  },
  headline: {
    fontSize: 17,
    fontWeight: '600' as const,
    letterSpacing: -0.41,
  },
  body: {
    fontSize: 17,
    fontWeight: '400' as const,
    letterSpacing: -0.41,
  },
  callout: {
    fontSize: 16,
    fontWeight: '400' as const,
    letterSpacing: -0.32,
  },
  subhead: {
    fontSize: 15,
    fontWeight: '400' as const,
    letterSpacing: -0.24,
  },
  footnote: {
    fontSize: 13,
    fontWeight: '400' as const,
    letterSpacing: -0.08,
  },
  caption1: {
    fontSize: 12,
    fontWeight: '400' as const,
  },
  caption2: {
    fontSize: 11,
    fontWeight: '400' as const,
    letterSpacing: 0.07,
  },
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
  massive: 48,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  pill: 100,
  full: 9999,
} as const;

export const Shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  sheet: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 16,
  },
} as const;

// Quick-action category chips for the home screen
export const ActivityCategories = [
  { id: 'all', label: 'All', emoji: '✨' },
  { id: 'sports', label: 'Hoops', emoji: '🏀' },
  { id: 'food', label: 'Food Run', emoji: '🍕' },
  { id: 'movies', label: 'Movie', emoji: '🎬' },
  { id: 'beach', label: 'Beach', emoji: '🏖️' },
  { id: 'gaming', label: 'Game Night', emoji: '🎮' },
  { id: 'music', label: 'Concert', emoji: '🎵' },
  { id: 'fitness', label: 'Gym', emoji: '💪' },
  { id: 'hangout', label: 'Hang', emoji: '🛋️' },
] as const;
