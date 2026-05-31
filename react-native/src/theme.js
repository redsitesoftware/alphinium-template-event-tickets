/**
 * Icebreaker AI — Theme
 * Deep purple/violet + coral/orange accent — fun, energetic, corporate-friendly
 */
export const colors = {
  // Backgrounds
  bg:           '#0D0820',   // very dark purple-black
  surface:      '#1A0A2E',   // deep purple
  card:         '#231240',   // card background
  cardBorder:   '#3D2070',   // subtle border

  // Brand
  primary:      '#7C3AED',   // violet
  primaryLight: '#A78BFA',   // light violet
  accent:       '#F97316',   // coral/orange
  accentLight:  '#FED7AA',   // peach

  // Players palette (up to 8 players)
  playerColors: [
    '#F97316', // orange
    '#06B6D4', // cyan
    '#10B981', // emerald
    '#F59E0B', // amber
    '#EF4444', // red
    '#8B5CF6', // purple
    '#EC4899', // pink
    '#14B8A6', // teal
  ],

  // Text
  text:         '#F5F0FF',
  textSub:      '#C4B5FD',
  textMuted:    '#7C6FA0',

  // Status
  success:      '#10B981',
  warning:      '#F59E0B',
  error:        '#EF4444',

  white:        '#FFFFFF',
  black:        '#000000',
};

export const spacing = {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48,
};

export const radius = {
  sm: 8, md: 12, lg: 16, xl: 24, round: 999,
};

export const typography = {
  hero:    { fontSize: 40, fontWeight: '800', letterSpacing: -1 },
  title:   { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  heading: { fontSize: 22, fontWeight: '700' },
  subhead: { fontSize: 17, fontWeight: '600' },
  body:    { fontSize: 15, fontWeight: '400', lineHeight: 22 },
  caption: { fontSize: 12, fontWeight: '400' },
};

export const shadows = {
  card: {
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  glow: {
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 12,
  },
};
