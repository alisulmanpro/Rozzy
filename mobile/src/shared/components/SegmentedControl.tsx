import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  colors,
  fonts,
  fontSizes,
  fontWeights,
  radii,
  sizes,
} from '@/shared/theme';

type SegmentedControlProps = {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  height?: number;
};

export default function SegmentedControl({
  options,
  value,
  onChange,
  height = sizes.segmentedHeight,
}: SegmentedControlProps) {
  return (
    <View style={styles.row}>
      {options.map((option) => {
        const active = option === value;
        return (
          <Pressable
            key={option}
            onPress={() => onChange(option)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={[styles.option, { height }, active ? styles.optionActive : styles.optionInactive]}
          >
            <Text style={[styles.text, active ? styles.textActive : styles.textInactive]}>
              {option}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
  },

  option: {
    flex: 1,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

  optionActive: {
    borderWidth: 2,
    borderColor: colors.violet,
    backgroundColor: colors.violetTint,
  },

  optionInactive: {
    borderWidth: 1,
    borderColor: colors.borderInput,
    backgroundColor: colors.white,
  },

  text: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.body,
  },

  textActive: {
    color: colors.violetDeep,
    fontWeight: fontWeights.semibold,
  },

  textInactive: {
    color: colors.ink,
    fontWeight: fontWeights.medium,
  },
});
