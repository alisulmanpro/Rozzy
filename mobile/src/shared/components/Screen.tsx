import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Edge } from 'react-native-safe-area-context';

import { colors } from '@/shared/theme';

type ScreenProps = {
  children: ReactNode;
  edges?: readonly Edge[];
  style?: StyleProp<ViewStyle>;
};

export default function Screen({
  children,
  edges = ['top', 'bottom'],
  style,
}: ScreenProps) {
  return (
    <SafeAreaView edges={edges} style={[styles.safeArea, style]}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
