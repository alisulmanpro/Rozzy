import Constants from 'expo-constants';

import ExpoGoVoiceScreen from '@/features/voice/ExpoGoVoiceScreen';

export default function VoiceRoute() {
  if (Constants.expoGoConfig) {
    return <ExpoGoVoiceScreen />;
  }

  // Intentional: keep the native voice module out of Expo Go's import graph.
  const NativeVoiceScreen =
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('@/features/voice/NativeVoiceScreen').default;

  return <NativeVoiceScreen />;
}
