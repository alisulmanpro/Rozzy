import Constants, { AppOwnership } from 'expo-constants';
import { requireOptionalNativeModule } from 'expo-modules-core';

import ExpoGoVoiceScreen from '@/features/voice/ExpoGoVoiceScreen';

export default function VoiceRoute() {
  // Check if speech recognition native module is available
  const hasNativeSpeechModule =
    Boolean(requireOptionalNativeModule('ExpoSpeechRecognition'));

  // Fallback to ExpoGoVoiceScreen ONLY if running inside actual Expo Go
  // or if the native speech recognition module is missing from the binary.
  const isActualExpoGo =
    Constants.appOwnership === AppOwnership.Expo ||
    Constants.appOwnership === ('expo' as AppOwnership);

  if (isActualExpoGo || !hasNativeSpeechModule) {
    return <ExpoGoVoiceScreen />;
  }

  // Load the native voice screen in custom native development or production builds
  const NativeVoiceScreen =
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('@/features/voice/NativeVoiceScreen').default;

  return <NativeVoiceScreen />;
}
