import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  colors,
  fonts,
  fontSizes,
  fontWeights,
  radii,
  spacing,
} from '@/shared/theme';

type OptionId = 'create' | 'laung' | 'zeera';

const OPTIONS: {
  id: OptionId;
  title: string;
  subtitle: string;
  subtitleColor: string;
}[] = [
  {
    id: 'create',
    title: 'Ilachi (nayi cheez banayein)',
    subtitle: 'Products mein jod di jayegi',
    subtitleColor: colors.textSecondary,
  },
  {
    id: 'laung',
    title: 'Laung',
    subtitle: 'Rs 900 / kg',
    subtitleColor: colors.textCaption,
  },
  {
    id: 'zeera',
    title: 'Zeera',
    subtitle: 'Rs 800 / kg',
    subtitleColor: colors.textCaption,
  },
];

export default function ItemEditScreen() {
  const [selected, setSelected] = useState<OptionId>('create');

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      enabled={Platform.OS === 'ios'}
      style={styles.overlay}
    >
      <Pressable
        onPress={() => router.back()}
        accessibilityLabel="Item badlein band karein"
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView edges={['bottom']}>
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.titleBlock}>
            <Text style={styles.title}>Ye kaun si cheez hai?</Text>
            <Text style={styles.subtitle}>{'Aap ne kaha: "ilachi" · Rs 50'}</Text>
          </View>

          <View style={styles.searchRow}>
            <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              defaultValue="ilachi"
              autoCorrect={false}
            />
          </View>

          <ScrollView
            contentContainerStyle={styles.optionList}
            style={{ flexShrink: 1 }}
            showsVerticalScrollIndicator={false}
          >
            {OPTIONS.map((option) => {
              const isSelected = option.id === selected;
              return (
                <Pressable
                  key={option.id}
                  onPress={() => setSelected(option.id)}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.optionCard,
                    isSelected && styles.optionCardSelected,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={styles.optionDetails}>
                    <Text style={styles.optionTitle}>{option.title}</Text>
                    <Text style={[styles.optionSubtitle, { color: option.subtitleColor }]}>
                      {option.subtitle}
                    </Text>
                  </View>
                  {isSelected ? (
                    <Ionicons name="checkmark" size={22} color={colors.violetLink} />
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.inputsRow}>
            <View style={styles.inputColumn}>
              <Text style={styles.inputLabel}>Miqdar</Text>
              <TextInput style={styles.input} defaultValue="100" />
            </View>
            <View style={styles.inputColumn}>
              <Text style={styles.inputLabel}>Unit</Text>
              <TextInput style={styles.input} defaultValue="gram" />
            </View>
            <View style={styles.inputColumn}>
              <Text style={styles.inputLabel}>Raqam (Rs)</Text>
              <TextInput style={styles.input} defaultValue="50" />
            </View>
          </View>

          <View style={styles.buttonsRow}>
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.removeButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.removeLabel}>Item hatayein</Text>
            </Pressable>
            <Pressable
              onPress={() =>
                router.navigate({ pathname: '/bill', params: { resolved: 'true' } })
              }
              accessibilityRole="button"
              style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}
            >
              <Text style={styles.saveLabel}>Save karein</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: colors.scrim,
    flex: 1,
    justifyContent: 'flex-end',
  },

  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    gap: spacing.lg,
    maxHeight: '92%',
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },

  handle: {
    alignSelf: 'center',
    backgroundColor: colors.borderInput,
    borderRadius: 3,
    height: 5,
    width: 44,
  },

  titleBlock: {
    gap: 4,
  },

  title: {
    color: colors.ink,
    fontFamily: fonts.heading,
    fontSize: fontSizes.heading,
    fontWeight: fontWeights.bold,
  },

  subtitle: {
    color: colors.textSecondary,
    fontFamily: fonts.body,
    fontSize: fontSizes.small,
  },

  searchRow: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.violet,
    borderRadius: radii.md,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 10,
    height: 50,
    paddingHorizontal: spacing.md + 2,
  },

  searchInput: {
    color: colors.ink,
    flex: 1,
    fontFamily: fonts.body,
    fontSize: fontSizes.bodyLarge,
    padding: 0,
  },

  optionList: {
    gap: spacing.sm,
  },

  optionCard: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.borderCard,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.md,
  },

  optionCardSelected: {
    backgroundColor: colors.violetTint,
    borderColor: colors.violet,
    borderWidth: 2,
  },

  optionDetails: {
    flex: 1,
    gap: 2,
  },

  optionTitle: {
    color: colors.ink,
    fontFamily: fonts.body,
    fontSize: fontSizes.bodyLarge,
    fontWeight: fontWeights.semibold,
  },

  optionSubtitle: {
    fontFamily: fonts.body,
    fontSize: fontSizes.caption,
  },

  inputsRow: {
    flexDirection: 'row',
    gap: 10,
  },

  inputColumn: {
    flex: 1,
    gap: 6,
  },

  inputLabel: {
    color: colors.textSecondary,
    fontFamily: fonts.body,
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.medium,
  },

  input: {
    borderColor: colors.borderInput,
    borderRadius: radii.sm,
    borderWidth: 1,
    color: colors.ink,
    fontFamily: fonts.body,
    fontSize: fontSizes.bodyLarge,
    height: 50,
    paddingHorizontal: spacing.md + 2,
  },

  buttonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 'auto',
  },

  removeButton: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.borderInput,
    borderRadius: radii.md,
    borderWidth: 1.5,
    flex: 1,
    height: 54,
    justifyContent: 'center',
  },

  removeLabel: {
    color: colors.ink,
    fontFamily: fonts.heading,
    fontSize: fontSizes.bodyLarge,
    fontWeight: fontWeights.semibold,
  },

  saveButton: {
    alignItems: 'center',
    backgroundColor: colors.violet,
    borderRadius: radii.md,
    flex: 1.4,
    height: 54,
    justifyContent: 'center',
  },

  saveLabel: {
    color: colors.white,
    fontFamily: fonts.heading,
    fontSize: fontSizes.bodyLarge,
    fontWeight: fontWeights.semibold,
  },

  pressed: {
    opacity: 0.85,
  },
});
