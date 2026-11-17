import { StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@react-native-vector-icons/ionicons';

import {
  colors,
  fonts,
  fontSizes,
  radii,
  sizes,
  spacing,
} from '@/shared/theme';

type SearchBarProps = {
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
};

export default function SearchBar({ placeholder, value, onChangeText }: SearchBarProps) {
  return (
    <View style={styles.row}>
      <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={colors.textCaption}
        value={value}
        onChangeText={onChangeText}
        autoCorrect={false}
        returnKeyType="search"
        accessibilityLabel={placeholder}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.borderInput,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    height: sizes.searchBarHeight,
    paddingHorizontal: spacing.lg,
  },

  input: {
    color: colors.ink,
    flex: 1,
    fontFamily: fonts.body,
    fontSize: fontSizes.bodyLarge,
    padding: 0,
  },
});
