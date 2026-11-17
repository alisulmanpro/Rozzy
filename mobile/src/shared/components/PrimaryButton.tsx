import { Pressable, StyleSheet, Text } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import {
  colors,
  fonts,
  fontSizes,
  fontWeights,
  radii,
  sizes,
} from '@/shared/theme';

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  height?: number;
  style?: StyleProp<ViewStyle>;
};

export default function PrimaryButton({
  label,
  onPress,
  height = sizes.buttonHeight,
  style,
}: PrimaryButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.button, { height }, style, pressed && styles.pressed]}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.violet,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

  pressed: {
    opacity: 0.85,
  },

  label: {
    color: colors.white,
    fontFamily: fonts.heading,
    fontSize: fontSizes.input,
    fontWeight: fontWeights.semibold,
  },
});
