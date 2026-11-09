/**
 * Vámonos Design System
 *
 * Map-first, street-bold identity — deliberately NOT Apple HIG grey/blue
 * and NOT Jobless's coral. Deep pine green + electric violet on pale mint:
 * the map is the hero, the UI is the trail signage.
 */

export const Colors = {
  // Primary — deep pine green
  primary: '#0D7A5F',
  primaryLight: '#2FA37F',
  primaryDark: '#075C46',

  // Neutrals — green-tinted ink, not Apple grey
  black: '#0C1B16',
  white: '#FFFFFF',
  text: '#122019',
  textSecondary: '#5C6E66',
  textTertiary: '#93A69D',

  // Backgrounds — pale mint, not #F2F2F7
  background: '#E9F2EC',
  backgroundElevated: '#FFFFFF',
  backgroundTertiary: '#D3E2D8',

  // Semantic
  success: '#0D7A5F',
  warning: '#B7791F',
  danger: '#D92D20',
  info: '#6C2BD9',

  // Accent — electric violet, for highlights, badges, CTAs
  accent: '#6C2BD9',
  accentSoft: 'rgba(108, 43, 217, 0.12)',

  // Separators
  separator: '#B9CFC2',
  separatorLight: 'rgba(18, 32, 25, 0.08)',

  // Overlays
  overlay: 'rgba(12, 27, 22, 0.45)',
  sheetBackground: 'rgba(255, 255, 255, 0.97)',

  // Tab bar
  tabActive: '#0D7A5F',
  tabInactive: '#93A69D',
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
