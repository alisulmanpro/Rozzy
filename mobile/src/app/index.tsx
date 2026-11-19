import { useEffect } from 'react';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Image, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getActiveShop } from '@/core/database/repositories/shopRepository';
import {
  colors,
  fonts,
  fontSizes,
  fontWeights,
  shadows,
  spacing,
} from '@/shared/theme';

const SPLASH_DURATION_MS = 2500;

export default function SplashScreen() {
  useEffect(() => {
    StatusBar.setStyle('light');

    return () => {
      StatusBar.setStyle('dark');
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const timer = setTimeout(async () => {
      try {
        const activeShop = await getActiveShop();

        if (!isMounted) return;

        if (activeShop) {
          router.replace('/home');
        } else {
          router.replace('/login');
        }
      } catch (error) {
        console.error('Unable to load saved shop:', error);

        if (isMounted) {
          router.replace('/login');
        }
      }
    }, SPLASH_DURATION_MS);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.center}>
        <Image
          source={require('../../assets/rozzy-logo.png')}
          style={styles.logo}
          accessibilityLabel="Rozzy logo"
        />

        <View style={styles.textBlock}>
          <Text style={styles.name}>Rozzy</Text>
          <Text style={styles.urduName}>روزی</Text>
          <Text style={styles.tagline}>Bolo, bill banao.</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.progressBar} />
        <Text style={styles.footerText}>Dukan ka smart saathi</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.navy,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
  },

  logo: {
    width: 148,
    height: 148,
    borderRadius: 36,
    ...shadows.logoGlow,
  },

  textBlock: {
    alignItems: 'center',
    gap: 6,
  },

  name: {
    color: colors.white,
    fontFamily: fonts.heading,
    fontSize: 40,
    fontWeight: fontWeights.bold,
  },

  urduName: {
    color: colors.violet,
    fontSize: 26,
  },

  tagline: {
    color: 'rgba(255,255,255,0.72)',
    fontFamily: fonts.body,
    fontSize: fontSizes.input,
    fontWeight: fontWeights.regular,
  },

  footer: {
    position: 'absolute',
    bottom: 56,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: spacing.md,
  },

  progressBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.violet,
  },

  footerText: {
    color: 'rgba(255,255,255,0.6)',
    fontFamily: fonts.body,
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.regular,
  },
});
