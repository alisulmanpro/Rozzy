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

import Screen from '@/shared/components/Screen';
import { createCustomer } from '@/core/database/repositories/customerRepository';
import {
  colors,
  fonts,
  fontSizes,
  fontWeights,
  radii,
  spacing,
} from '@/shared/theme';

export default function AddCustomerScreen() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const saveCustomer = async () => {
    if (isSaving) return;

    if (!name.trim()) {
      setError('Customer ka naam enter karein.');
      return;
    }

    if (name.trim().length > 100) {
      setError('Customer ka naam 100 characters se chhota rakhein.');
      return;
    }

    if (phone.trim().length > 30) {
      setError('Phone number bohat lamba hai.');
      return;
    }

    try {
      setIsSaving(true);
      setError('');

      await createCustomer({
        name: name.trim(),
        phone: phone.trim(),
      });

      router.back();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Customer save nahi ho saka. Dobara try karein.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        enabled={Platform.OS === 'ios'}
        style={styles.flex}
      >
        <View style={styles.topBar}>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={8}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={24} color={colors.ink} />
          </Pressable>

          <Text style={styles.title}>Naya customer</Text>
        </View>

        <ScrollView
          bounces={false}
          contentContainerStyle={styles.form}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.field}>
            <Text style={styles.label}>Customer ka naam *</Text>

            <TextInput
              style={styles.input}
              value={name}
              editable={!isSaving}
              onChangeText={(value) => {
                setName(value);
                setError('');
              }}
              placeholder="Misal: Ali Ahmed"
              placeholderTextColor={colors.textCaption}
              autoCapitalize="words"
              returnKeyType="next"
              maxLength={100}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Phone number (optional)</Text>

            <TextInput
              style={styles.input}
              value={phone}
              editable={!isSaving}
              onChangeText={(value) => {
                setPhone(value);
                setError('');
              }}
              placeholder="Misal: 03001234567"
              placeholderTextColor={colors.textCaption}
              keyboardType="phone-pad"
              returnKeyType="done"
              maxLength={30}
            />

            <Text style={styles.helper}>
              Customer ka phone number baad mein bhi add kiya ja sakta hai.
            </Text>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </ScrollView>

        <View style={styles.buttonsRow}>
          <Pressable
            onPress={() => router.back()}
            disabled={isSaving}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.cancelButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.cancelLabel}>Cancel</Text>
          </Pressable>

          <Pressable
            onPress={saveCustomer}
            disabled={isSaving}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.saveButton,
              (pressed || isSaving) && styles.pressed,
            ]}
          >
            <Text style={styles.saveLabel}>
              {isSaving ? 'Saving...' : 'Customer save karein'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },

  backButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },

  title: {
    color: colors.ink,
    flex: 1,
    fontFamily: fonts.heading,
    fontSize: fontSizes.heading,
    fontWeight: fontWeights.bold,
  },

  form: {
    gap: 18,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },

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
    backgroundColor: colors.white,
    borderColor: colors.borderInput,
    borderRadius: radii.md,
    borderWidth: 1,
    color: colors.ink,
    fontFamily: fonts.body,
    fontSize: fontSizes.input,
    height: 54,
    paddingHorizontal: spacing.lg,
  },

  helper: {
    color: colors.textCaption,
    fontFamily: fonts.body,
    fontSize: fontSizes.caption,
  },

  error: {
    color: '#DC2626',
    fontFamily: fonts.body,
    fontSize: fontSizes.small,
  },

  buttonsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
  },

  cancelButton: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.borderInput,
    borderRadius: radii.md,
    borderWidth: 1.5,
    flex: 1,
    height: 56,
    justifyContent: 'center',
  },

  cancelLabel: {
    color: colors.ink,
    fontFamily: fonts.heading,
    fontSize: fontSizes.bodyLarge,
    fontWeight: fontWeights.semibold,
  },

  saveButton: {
    alignItems: 'center',
    backgroundColor: colors.violet,
    borderRadius: radii.md,
    flex: 1.6,
    height: 56,
    justifyContent: 'center',
  },

  saveLabel: {
    color: colors.white,
    fontFamily: fonts.heading,
    fontSize: fontSizes.input,
    fontWeight: fontWeights.semibold,
  },

  pressed: {
    opacity: 0.85,
  },
});
