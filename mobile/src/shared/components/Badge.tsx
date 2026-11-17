import { StyleSheet, Text } from 'react-native';

import {
  colors,
  fonts,
  fontSizes,
  fontWeights,
  radii,
  spacing,
} from '@/shared/theme';

type BadgeVariant = 'violet' | 'orange';

type BadgeProps = {
  label: string;
  variant?: BadgeVariant;
};

export default function Badge({ label, variant = 'violet' }: BadgeProps) {
  return (
    <Text
      style={[styles.badge, variant === 'orange' ? styles.orange : styles.violet]}
      accessibilityRole="text"
    >
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    fontFamily: fonts.body,
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.semibold,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },

  violet: {
    backgroundColor: colors.violetTint,
    color: colors.violetDeep,
  },

  orange: {
    backgroundColor: colors.orangeTint,
    color: colors.orangeText,
  },
});
