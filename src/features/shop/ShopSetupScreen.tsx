import { useState } from 'react';
import { router } from 'expo-router';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { createShop } from '@/core/database/repositories/shopRepository';
import PrimaryButton from '@/shared/components/PrimaryButton';
import SegmentedControl from '@/shared/components/SegmentedControl';
import {
  colors,
  fonts,
  fontSizes,
  fontWeights,
  radii,
  spacing,
} from '@/shared/theme';

import FormInput from './components/FormInput';

const LANGUAGES = ['Roman Urdu', 'Punjabi'];
const DEFAULT_LANGUAGE = 'Roman Urdu';

type ShopFormErrors = {
  shopName?: string;
};

export default function ShopSetupScreen() {
  const [shopName, setShopName] = useState('');
  const [city, setCity] = useState('');
  const [language, setLanguage] = useState(DEFAULT_LANGUAGE);
  const [billFooter, setBillFooter] = useState('');
  const [errors, setErrors] = useState<ShopFormErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleShuruKarein = async () => {
    if (isSaving) return;

    const nextErrors: ShopFormErrors = {};

    if (!shopName.trim()) {
      nextErrors.shopName = 'Dukaan ka naam zaroori hai.';
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      await createShop({
        name: shopName,
        city,
        language,
        billFooter,
      });

      router.replace('/home');
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : 'Dukaan save nahi ho saki. Dobara koshish karein.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.eyebrow}>Step 1 of 1 · sirf pehli baar</Text>

            <Text style={styles.heading}>Apni dukaan ke baare mein bataein</Text>
          </View>

          <FormInput
            label="Dukaan ka naam"
            placeholder="Apni dukaan ka naam"
            value={shopName}
            onChangeText={(text) => {
              setShopName(text);
              if (errors.shopName) {
                setErrors({ ...errors, shopName: undefined });
              }
              setSaveError(null);
            }}
            autoCapitalize="words"
            autoCorrect={false}
            error={errors.shopName}
          />

          <FormInput
            label="Shehar"
            placeholder="Apna shehar"
            value={city}
            onChangeText={setCity}
            autoCapitalize="words"
            autoCorrect={false}
          />

          <View style={styles.zubaanBlock}>
            <Text style={styles.zubaanLabel}>
              Aap kis zubaan mein bolte hain?
            </Text>

            <SegmentedControl
              options={LANGUAGES}
              value={language}
              onChange={setLanguage}
            />

            <Text style={styles.zubaanHelper}>
              Dono zubaanen samajh aati hain. Ye sirf aap ki pehli pasand hai.
            </Text>
          </View>

          <FormInput
            label="Bill ke neeche likhna hai (optional)"
            placeholder="Shukriya, phir tashreef laayein"
            value={billFooter}
            onChangeText={setBillFooter}
            autoCorrect={false}
          />

          {saveError ? (
            <View style={styles.notice}>
              <Text style={styles.noticeText}>{saveError}</Text>
            </View>
          ) : null}

          <PrimaryButton
            label={isSaving ? 'Save ho raha hai...' : 'Shuru karein'}
            onPress={handleShuruKarein}
            style={styles.cta}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    flexGrow: 1,
    gap: 22,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xl,
    paddingBottom: 28,
  },

  header: {
    gap: 10,
  },

  eyebrow: {
    color: colors.violet,
    fontFamily: fonts.body,
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.semibold,
  },

  heading: {
    color: colors.ink,
    fontFamily: fonts.heading,
    fontSize: fontSizes.display,
    fontWeight: fontWeights.bold,
    lineHeight: 35,
  },

  zubaanBlock: {
    gap: 10,
  },

  zubaanLabel: {
    color: colors.textSecondary,
    fontFamily: fonts.body,
    fontSize: fontSizes.small,
    fontWeight: fontWeights.medium,
  },

  zubaanHelper: {
    color: colors.textCaption,
    fontFamily: fonts.body,
    fontSize: fontSizes.caption,
  },

  notice: {
    backgroundColor: colors.orangeTint,
    borderColor: colors.orange,
    borderWidth: 1,
    borderRadius: radii.sm,
    padding: spacing.md,
  },

  noticeText: {
    color: colors.ink,
    fontFamily: fonts.body,
    fontSize: fontSizes.caption,
    lineHeight: 19,
    textAlign: 'center',
  },

  cta: {
    marginTop: 'auto',
  },
});
