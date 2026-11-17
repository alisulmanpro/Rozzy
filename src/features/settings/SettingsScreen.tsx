import { useState } from 'react';
import { router } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import Card from '@/shared/components/Card';
import Screen from '@/shared/components/Screen';
import SegmentedControl from '@/shared/components/SegmentedControl';
import {
  colors,
  fonts,
  fontSizes,
  fontWeights,
  radii,
  spacing,
} from '@/shared/theme';

const logoSource = require('../../../assets/rozzy-logo.png');

export default function SettingsScreen() {
  const [language, setLanguage] = useState('Roman Urdu');

  return (
    <Screen edges={['top']}>
      <ScrollView
        bounces={false}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Settings</Text>

        <Card style={styles.profileCard}>
          <Image source={logoSource} style={styles.profileLogo} />
          <View style={styles.profileDetails}>
            <Text style={styles.profileName}>Ali General Store</Text>
            <Text style={styles.profileMeta}>Lahore · +92 300 1234567</Text>
          </View>
        </Card>

        <Card style={styles.settingsCard}>
          <Text style={styles.cardLabel}>Zubaan</Text>
          <SegmentedControl
            options={['Roman Urdu', 'Punjabi']}
            value={language}
            onChange={setLanguage}
            height={46}
          />
        </Card>

        <Card style={[styles.settingsCard, styles.rowCard]}>
          <View style={styles.printerDetails}>
            <Text style={styles.cardLabel}>Printer</Text>
            <Text style={styles.printerName}>XP-58 Bluetooth</Text>
            <Text style={styles.printerStatus}>Connected</Text>
          </View>
          <Pressable
            onPress={() => router.replace('/login')}
            accessibilityRole="button"
            style={({ pressed }) => [styles.changeButton, pressed && styles.pressed]}
          >
            <Text style={styles.changeLabel}>Badlein</Text>
          </Pressable>
        </Card>

        <Card style={styles.settingsCard}>
          <Text style={styles.cardLabel}>Server address (developer)</Text>
          <TextInput
            style={styles.serverInput}
            defaultValue="http://192.168.1.5:8000"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </Card>

        <Card style={[styles.settingsCard, styles.rowCard]}>
          <View style={styles.backupDetails}>
            <Text style={styles.backupTitle}>Backup aur sync</Text>
            <Text style={styles.backupMeta}>Jald aa raha hai</Text>
          </View>
          <Text style={styles.backupPill}>Phase 2</Text>
        </Card>

        <Pressable
          onPress={() => router.replace('/login')}
          accessibilityRole="button"
          style={({ pressed }) => [styles.logoutButton, pressed && styles.pressed]}
        >
          <Text style={styles.logoutLabel}>Logout</Text>
        </Pressable>

        <Text style={styles.version}>Rozzy v0.1.0</Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 14,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },

  title: {
    color: colors.ink,
    fontFamily: fonts.heading,
    fontSize: fontSizes.title,
    fontWeight: fontWeights.bold,
  },

  profileCard: {
    alignItems: 'center',
    borderRadius: radii.xl,
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.md + 2,
  },

  profileLogo: {
    borderRadius: radii.sm,
    height: 48,
    width: 48,
  },

  profileDetails: {
    flex: 1,
    gap: 2,
  },

  profileName: {
    color: colors.ink,
    fontFamily: fonts.body,
    fontSize: fontSizes.bodyLarge,
    fontWeight: fontWeights.semibold,
  },

  profileMeta: {
    color: colors.textCaption,
    fontFamily: fonts.body,
    fontSize: fontSizes.caption,
  },

  settingsCard: {
    borderRadius: radii.xl,
    gap: spacing.md + 2,
    padding: spacing.lg,
  },

  rowCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },

  cardLabel: {
    color: colors.textCaption,
    fontFamily: fonts.body,
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.semibold,
  },

  printerDetails: {
    flex: 1,
    gap: 3,
  },

  printerName: {
    color: colors.ink,
    fontFamily: fonts.body,
    fontSize: fontSizes.bodyLarge,
    fontWeight: fontWeights.semibold,
  },

  printerStatus: {
    color: colors.successGreen,
    fontFamily: fonts.body,
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.semibold,
  },

  changeButton: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.violet,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    height: 40,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },

  changeLabel: {
    color: colors.violetDeep,
    fontFamily: fonts.heading,
    fontSize: fontSizes.small,
    fontWeight: fontWeights.semibold,
  },

  serverInput: {
    backgroundColor: colors.background,
    borderColor: colors.borderInput,
    borderRadius: radii.sm,
    borderWidth: 1,
    color: colors.ink,
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    height: 46,
    paddingHorizontal: spacing.md + 2,
  },

  backupDetails: {
    flex: 1,
    gap: 3,
  },

  backupTitle: {
    color: colors.ink,
    fontFamily: fonts.body,
    fontSize: fontSizes.bodyLarge,
    fontWeight: fontWeights.semibold,
  },

  backupMeta: {
    color: colors.textCaption,
    fontFamily: fonts.body,
    fontSize: fontSizes.caption,
  },

  backupPill: {
    backgroundColor: colors.violetTint,
    borderRadius: radii.pill,
    color: colors.violetDeep,
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: fontWeights.semibold,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },

  logoutButton: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.coralBorder,
    borderRadius: radii.md,
    borderWidth: 1.5,
    height: 50,
    justifyContent: 'center',
  },

  logoutLabel: {
    color: colors.coralDestructive,
    fontFamily: fonts.heading,
    fontSize: fontSizes.body,
    fontWeight: fontWeights.semibold,
  },

  version: {
    color: colors.textCaption,
    fontFamily: fonts.body,
    fontSize: 12,
    textAlign: 'center',
  },

  pressed: {
    opacity: 0.85,
  },
});
