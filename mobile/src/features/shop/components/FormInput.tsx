import { StyleSheet, Text, TextInput, View } from 'react-native';
import type { TextInputProps } from 'react-native';

import {
  colors,
  fonts,
  fontSizes,
  fontWeights,
  radii,
  sizes,
  spacing,
} from '@/shared/theme';

type FormInputProps = TextInputProps & {
  label: string;
  error?: string;
};

export default function FormInput({ label, error, ...inputProps }: FormInputProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>

      <TextInput
        style={[styles.input, error ? styles.inputError : null]}
        placeholderTextColor={colors.textCaption}
        accessibilityLabel={label}
        {...inputProps}
      />

      {error ? (
        <Text style={styles.errorText} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: spacing.sm,
  },

  label: {
    color: colors.textSecondary,
    fontFamily: fonts.body,
    fontSize: fontSizes.small,
    fontWeight: fontWeights.medium,
  },

  input: {
    height: sizes.inputHeight,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderInput,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    fontFamily: fonts.body,
    fontSize: fontSizes.input,
    color: colors.ink,
  },

  inputError: {
    borderWidth: 1.5,
    borderColor: colors.coral,
  },

  errorText: {
    color: colors.coral,
    fontFamily: fonts.body,
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.medium,
  },
});
