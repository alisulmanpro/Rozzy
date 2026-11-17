import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Poppins_500Medium } from '@expo-google-fonts/poppins/500Medium';
import { Poppins_600SemiBold } from '@expo-google-fonts/poppins/600SemiBold';
import { Poppins_700Bold } from '@expo-google-fonts/poppins/700Bold';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { getDatabase } from '@/core/database/database';
import { colors, fonts } from '@/shared/theme';

export default function RootLayout() {
  const [loaded, fontError] = useFonts([
    {
      fontFamily: 'Poppins',
      fontDefinitions: [
        { path: Poppins_500Medium, weight: 500 },
        { path: Poppins_600SemiBold, weight: 600 },
        { path: Poppins_700Bold, weight: 700 },
      ],
    },
    {
      fontFamily: 'Inter',
      fontDefinitions: [
        { path: Inter_400Regular, weight: 400 },
        { path: Inter_500Medium, weight: 500 },
        { path: Inter_600SemiBold, weight: 600 },
      ],
    },
  ]);

  const [databaseReady, setDatabaseReady] = useState(false);
  const [databaseError, setDatabaseError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    getDatabase()
      .then(() => {
        if (mounted) {
          setDatabaseReady(true);
        }
      })
      .catch((error: unknown) => {
        if (mounted) {
          setDatabaseError(
            error instanceof Error
              ? error.message
              : 'Unable to initialize local database.',
          );
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (fontError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Unable to load fonts</Text>
        <Text style={styles.errorMessage}>
          {fontError.message}
        </Text>
      </View>
    );
  }

  if (databaseError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Database initialization failed</Text>
        <Text style={styles.errorMessage}>{databaseError}</Text>
      </View>
    );
  }

  if (!loaded || !databaseReady) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.violet} />
        <Text style={styles.loadingText}>Preparing ROZZY...</Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="shop-setup" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="bill" options={{ presentation: 'card' }} />
        <Stack.Screen name="bill-done" options={{ presentation: 'card' }} />
        <Stack.Screen name="item-edit" options={{ presentation: 'transparentModal' }} />
        <Stack.Screen name="voice" options={{ presentation: 'modal' }} />
        <Stack.Screen name="add-product" options={{ presentation: 'card' }} />
        <Stack.Screen name="customers" />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: colors.white,
  },
  loadingText: {
    marginTop: 12,
    color: colors.textCaption,
    fontFamily: fonts.body,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.ink,
    textAlign: 'center',
  },
  errorMessage: {
    marginTop: 10,
    color: colors.textCaption,
    textAlign: 'center',
  },
});
