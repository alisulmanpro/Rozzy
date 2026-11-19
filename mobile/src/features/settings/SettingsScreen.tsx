import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';

import Card from '@/shared/components/Card';
import Screen from '@/shared/components/Screen';
import SegmentedControl from '@/shared/components/SegmentedControl';
import {
  clearActiveShop,
  getActiveShop,
  updateShopLanguage,
  type Shop,
} from '@/core/database/repositories/shopRepository';
import {
  getApiUrl,
  setApiUrl,
  testApiConnection,
  DEFAULT_API_URL,
} from '@/api';
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
  const [shop, setShop] = useState<Shop | null>(null);
  const [language, setLanguage] = useState('Roman Urdu');
  const [serverAddress, setServerAddress] = useState(DEFAULT_API_URL);
  const [serverStatusMessage, setServerStatusMessage] = useState<string | null>(null);
  const [isSavingServer, setIsSavingServer] = useState(false);
  const [isTestingServer, setIsTestingServer] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      const [activeShop, currentUrl] = await Promise.all([
        getActiveShop(),
        getApiUrl(),
      ]);

      if (activeShop) {
        setShop(activeShop);
        setLanguage(activeShop.language || 'Roman Urdu');
      }

      setServerAddress(currentUrl);
    } catch (error) {
      console.error('Settings load error:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadSettings();
    }, [loadSettings]),
  );

  const handleLanguageChange = async (newLang: string) => {
    setLanguage(newLang);
    if (shop) {
      try {
        await updateShopLanguage(shop.id, newLang);
      } catch (err) {
        console.error('Language update error:', err);
      }
    }
  };

  const handleSaveServerAddress = async () => {
    if (isSavingServer || isTestingServer) return;
    setServerStatusMessage(null);

    try {
      setIsSavingServer(true);
      const saved = await setApiUrl(serverAddress);
      setServerAddress(saved);
      setServerStatusMessage('Server address kamiyabi se save ho gaya.');
      setTimeout(() => setServerStatusMessage(null), 3500);
    } catch (err) {
      setServerStatusMessage(
        err instanceof Error ? err.message : 'Server address save nahi ho saka.',
      );
    } finally {
      setIsSavingServer(false);
    }
  };

  const handleTestServerConnection = async () => {
    if (isTestingServer || isSavingServer) return;
    setServerStatusMessage(null);

    try {
      setIsTestingServer(true);
      const res = await testApiConnection(serverAddress);
      if (res.ok) {
        setServerStatusMessage(
          `Rabta kamiyab! Model: ${res.model ?? 'rozzy_nlu_model.joblib'} (Status: ${res.status})`,
        );
      } else {
        setServerStatusMessage(`Rabta fail: ${res.error}`);
      }
    } catch (err) {
      setServerStatusMessage(
        err instanceof Error ? err.message : 'Server se rabta nahi ho saka.',
      );
    } finally {
      setIsTestingServer(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Kya aap dukaan se logout karna chahte hain?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearActiveShop();
              router.replace('/login');
            } catch (err) {
              console.error('Logout error:', err);
              router.replace('/login');
            }
          },
        },
      ],
    );
  };

  return (
    <Screen edges={['top']}>
      <ScrollView
        bounces={false}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Settings</Text>

        {isLoading ? (
          <Card style={styles.profileCard}>
            <ActivityIndicator size="small" color={colors.violet} />
            <Text style={styles.profileMeta}>Settings load ho rahi hain...</Text>
          </Card>
        ) : (
          <Card style={styles.profileCard}>
            <Image source={logoSource} style={styles.profileLogo} />
            <View style={styles.profileDetails}>
              <Text style={styles.profileName}>{shop?.name || 'Meri Dukaan'}</Text>
              <Text style={styles.profileMeta}>
                {shop?.city ? `${shop.city} · ` : ''}
                {shop?.language || 'Roman Urdu'}
                {shop?.bill_footer ? ` · "${shop.bill_footer}"` : ''}
              </Text>
            </View>
          </Card>
        )}

        <Card style={styles.settingsCard}>
          <Text style={styles.cardLabel}>Zubaan</Text>
          <SegmentedControl
            options={['Roman Urdu', 'Punjabi']}
            value={language}
            onChange={(val) => void handleLanguageChange(val)}
            height={46}
          />
        </Card>

        <Card style={[styles.settingsCard, styles.rowCard]}>
          <View style={styles.printerDetails}>
            <Text style={styles.cardLabel}>Printer</Text>
            <Text style={styles.printerName}>Thermal / Bluetooth Printer</Text>
            <Text style={styles.printerStatus}>Offline ready (Phase 2)</Text>
          </View>
        </Card>

        <Card style={styles.settingsCard}>
          <View style={styles.serverHeaderRow}>
            <Text style={styles.cardLabel}>Backend server address (FastAPI / NLU)</Text>
            <Text style={styles.defaultPill}>port 8000</Text>
          </View>
          <TextInput
            style={styles.serverInput}
            value={serverAddress}
            onChangeText={(val) => {
              setServerAddress(val);
              setServerStatusMessage(null);
            }}
            placeholder="http://192.168.1.5:8000"
            placeholderTextColor={colors.textCaption}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <View style={styles.serverActionRow}>
            <Pressable
              onPress={() => void handleSaveServerAddress()}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.saveServerButton,
                pressed && styles.pressed,
                (isSavingServer || isTestingServer) && styles.disabledButton,
              ]}
              disabled={isSavingServer || isTestingServer}
            >
              {isSavingServer ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.saveServerLabel}>Address Save Karein</Text>
              )}
            </Pressable>

            <Pressable
              onPress={() => void handleTestServerConnection()}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.testServerButton,
                pressed && styles.pressed,
                (isTestingServer || isSavingServer) && styles.disabledButton,
              ]}
              disabled={isSavingServer || isTestingServer}
            >
              {isTestingServer ? (
                <ActivityIndicator size="small" color={colors.violetDeep} />
              ) : (
                <Text style={styles.testServerLabel}>Rabta Check Karein</Text>
              )}
            </Pressable>

            {serverAddress !== DEFAULT_API_URL && (
              <Pressable
                onPress={() => {
                  setServerAddress(DEFAULT_API_URL);
                  void setApiUrl(DEFAULT_API_URL);
                  setServerStatusMessage('Default emulator address set.');
                }}
                accessibilityRole="button"
                style={styles.resetButton}
              >
                <Text style={styles.resetLabel}>Reset Default</Text>
              </Pressable>
            )}
          </View>
          {serverStatusMessage ? (
            <Text
              style={[
                styles.serverFeedback,
                serverStatusMessage.includes('kamiyab') ||
                serverStatusMessage.includes('Default')
                  ? styles.serverFeedbackSuccess
                  : styles.serverFeedbackError,
              ]}
            >
              {serverStatusMessage}
            </Text>
          ) : (
            <Text style={styles.serverHint}>
              Phone se connect karne ke liye PC ka LAN IP enter karein (e.g. http://192.168.1.5:8000).
            </Text>
          )}
        </Card>

        <Card style={[styles.settingsCard, styles.rowCard]}>
          <View style={styles.backupDetails}>
            <Text style={styles.backupTitle}>Backup aur sync</Text>
            <Text style={styles.backupMeta}>Local SQLite storage active</Text>
          </View>
          <Text style={styles.backupPill}>Offline first</Text>
        </Card>

        <Pressable
          onPress={handleLogout}
          accessibilityRole="button"
          style={({ pressed }) => [styles.logoutButton, pressed && styles.pressed]}
        >
          <Text style={styles.logoutLabel}>Logout</Text>
        </Pressable>

        <Text style={styles.version}>Rozzy v0.1.0 · Dukan ka smart saathi</Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 14,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
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
    color: colors.textCaption,
    fontFamily: fonts.body,
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.semibold,
  },

  serverHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  defaultPill: {
    backgroundColor: colors.background,
    borderColor: colors.borderCard,
    borderRadius: radii.sm,
    borderWidth: 1,
    color: colors.textCaption,
    fontFamily: fonts.body,
    fontSize: 11,
    paddingHorizontal: 6,
    paddingVertical: 2,
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

  serverActionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },

  saveServerButton: {
    alignItems: 'center',
    backgroundColor: colors.violet,
    borderRadius: radii.sm,
    height: 40,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },

  saveServerLabel: {
    color: colors.white,
    fontFamily: fonts.heading,
    fontSize: fontSizes.small,
    fontWeight: fontWeights.semibold,
  },

  testServerButton: {
    alignItems: 'center',
    backgroundColor: colors.violetTint,
    borderRadius: radii.sm,
    height: 40,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },

  testServerLabel: {
    color: colors.violetDeep,
    fontFamily: fonts.body,
    fontSize: fontSizes.small,
    fontWeight: fontWeights.semibold,
  },

  resetButton: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderColor: colors.borderCard,
    borderRadius: radii.sm,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },

  resetLabel: {
    color: colors.textSecondary,
    fontFamily: fonts.body,
    fontSize: fontSizes.small,
  },

  disabledButton: {
    opacity: 0.6,
  },

  serverFeedback: {
    fontFamily: fonts.body,
    fontSize: fontSizes.caption,
    marginTop: 2,
  },

  serverFeedbackSuccess: {
    color: colors.successGreen,
  },

  serverFeedbackError: {
    color: colors.coralDestructive,
  },

  serverHint: {
    color: colors.textCaption,
    fontFamily: fonts.body,
    fontSize: fontSizes.caption - 1,
    lineHeight: 16,
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
    marginTop: spacing.sm,
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
    marginTop: spacing.xs,
    textAlign: 'center',
  },

  pressed: {
    opacity: 0.85,
  },
});
