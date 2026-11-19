export const colors = {
  background: '#F7F5FF',
  ink: '#14123A',
  textSecondary: '#4A4770',
  textCaption: '#5E5B82',
  violet: '#7B2CF5',
  violetDeep: '#4B12B8',
  violetLink: '#6A1FE0',
  violetTint: '#F0E8FF',
  violetMuted: '#9B7BE0',
  magenta: '#E81EC8',
  coral: '#F03E5A',
  coralDestructive: '#B3203B',
  coralBorder: '#F2B5BF',
  orange: '#FFA13B',
  orangeTint: '#FFF3E2',
  orangeTintSoft: '#FFF8EE',
  orangeText: '#8A4B00',
  orangeTextDeep: '#6B4A12',
  orangeBorder: '#B86A00',
  orangeAction: '#7A4300',
  navy: '#02002F',
  borderInput: '#D9D3F0',
  borderCard: '#E8E4F7',
  divider: '#F0EDFA',
  white: '#FFFFFF',
  successGreen: '#0F6B3A',
  disabledBg: '#E6E1F5',
  scrim: 'rgba(20,18,58,0.5)',
  voiceBg: '#EADFFF',
  receiptFooter: '#F2F0F8',
} as const;

export const fonts = {
  heading: 'Poppins',
  body: 'Inter',
} as const;

export const fontSizes = {
  caption: 13,
  small: 14,
  body: 15,
  bodyLarge: 16,
  input: 17,
  heading: 22,
  title: 26,
  display: 28,
} as const;

export const fontWeights = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;

export const radii = {
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 20,
  sheet: 28,
  pill: 999,
} as const;

export const sizes = {
  touchTarget: 44,
  inputHeight: 54,
  buttonHeight: 56,
  segmentedHeight: 52,
  searchBarHeight: 50,
  tabBarHeight: 76,
} as const;

export const shadows = {
  buttonGlow: {
    shadowColor: colors.violet,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  logoGlow: {
    shadowColor: colors.violet,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 10,
  },
  card: {
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },
} as const;
