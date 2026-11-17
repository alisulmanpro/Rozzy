import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';

import Badge from '@/shared/components/Badge';
import {
  colors,
  fonts,
  fontSizes,
  fontWeights,
  radii,
  spacing,
} from '@/shared/theme';

const WAVEFORM_FACTORS = [0.32, 0.58, 0.86, 0.44, 1, 0.66, 0.82, 0.38, 0.54];

export default function VoiceScreen() {
  const [isStarting, setIsStarting] = useState(false);
  const [hasRecorded, setHasRecorded] = useState(false);
  const [message, setMessage] = useState('');

  const recorder = useAudioRecorder({
    ...RecordingPresets.HIGH_QUALITY,
    isMeteringEnabled: true,
  });

  const recorderState = useAudioRecorderState(recorder, 100);

  const isRecording = recorderState.isRecording;

  const metering = recorderState.metering ?? -160;
  const audioLevel = isRecording
    ? Math.max(0, Math.min(1, (metering + 60) / 60))
    : 0;

  const handleRecordingPress = async () => {
    if (isStarting) {
      return;
    }

    if (isRecording) {
      try {
        await recorder.stop();
        setHasRecorded(true);
        setMessage('Awaaz record ho gayi. Speech-to-text abhi connect nahi hai.');
      } catch {
        setMessage('Recording stop nahi ho saki. Dobara koshish karein.');
      }
      return;
    }

    setIsStarting(true);
    setMessage('');

    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();

      if (!permission.granted) {
        setMessage('Microphone permission zaroori hai. Phone settings mein allow karein.');
        return;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      await recorder.prepareToRecordAsync();
      recorder.record();

      setHasRecorded(false);
    } catch {
      setMessage('Microphone start nahi ho saka. Dobara koshish karein.');
    } finally {
      setIsStarting(false);
    }
  };

  const handleClose = async () => {
    if (isRecording) {
      try {
        await recorder.stop();
      } catch {
        // The screen can still close if stopping fails.
      }
    }

    router.back();
  };

  const handleKeyboard = async () => {
    if (isRecording) {
      try {
        await recorder.stop();
      } catch {
        setMessage('Recording stop nahi ho saki.');
        return;
      }
    }

    router.navigate('/bill');
  };

  const statusText = isStarting
    ? 'Microphone tayyar ho raha hai…'
    : isRecording
      ? 'Main sun rahi hoon…'
      : hasRecorded
        ? 'Recording complete'
        : 'Bolne ke liye button dabayein';

  const detailText = message || (
    isRecording
      ? 'Aapki awaaz microphone se receive ho rahi hai.'
      : hasRecorded
        ? 'Awaaz record hui hai, lekin abhi text mein convert nahi hui.'
        : 'Center button dabayein aur bolna shuru karein.'
  );

  return (
    <LinearGradient
      colors={[colors.voiceBg, colors.background]}
      locations={[0, 0.55]}
      style={styles.gradient}
    >
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <View style={styles.topBar}>
          <Pressable
            onPress={handleClose}
            accessibilityLabel="Band karein"
            hitSlop={8}
            style={styles.closeButton}
          >
            <Ionicons name="close" size={24} color={colors.ink} />
          </Pressable>

          <Text style={styles.title}>Rozzy AI</Text>
          <Badge label="Roman Urdu" />
        </View>

        <Text style={styles.hint}>{'Kabhi bhi kahein: "Hey Rozzy"'}</Text>

        <ScrollView
          bounces={false}
          contentContainerStyle={styles.middle}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.orbStack}>
            <View
              style={[
                styles.ringOuter,
                isRecording && audioLevel > 0.05 && styles.ringActive,
              ]}
            />
            <View style={styles.ringMiddle} />
            <View style={styles.ringInner} />

            <View style={styles.orb}>
              <View style={styles.spotOrange} />
              <View style={styles.spotCoral} />
              <View style={styles.spotMagenta} />
              <View style={styles.spotWhite} />

              <View style={styles.waveform}>
                {WAVEFORM_FACTORS.map((factor, index) => {
                  const height = isRecording
                    ? Math.max(5, 5 + audioLevel * 63 * factor)
                    : 5;

                  return (
                    <View
                      key={index}
                      style={[styles.waveBar, { height }]}
                    />
                  );
                })}
              </View>
            </View>
          </View>

          <Text style={styles.listening}>{statusText}</Text>

          <View style={styles.transcript}>
            <Text style={styles.transcriptLabel}>VOICE INPUT STATUS</Text>
            <Text style={styles.transcriptText}>{detailText}</Text>
          </View>
        </ScrollView>

        <View style={styles.controls}>
          <Pressable
            onPress={handleKeyboard}
            accessibilityLabel="Likh kar bataein"
            style={({ pressed }) => [
              styles.controlButton,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="keypad-outline" size={24} color={colors.ink} />
          </Pressable>

          <Pressable
            onPress={handleRecordingPress}
            disabled={isStarting}
            accessibilityLabel={
              isRecording ? 'Recording band karein' : 'Recording shuru karein'
            }
            style={({ pressed }) => [
              styles.stopButton,
              isRecording && styles.recordingButton,
              pressed && styles.pressed,
              isStarting && styles.disabledButton,
            ]}
          >
            {isRecording ? (
              <View style={styles.stopSquare} />
            ) : (
              <Ionicons name="mic" size={32} color={colors.white} />
            )}
          </Pressable>

          <Pressable
            onPress={() =>
              setMessage('Center microphone button dabayein aur bolna shuru karein.')
            }
            accessibilityLabel="Madad"
            style={({ pressed }) => [
              styles.controlButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.helpLabel}>?</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },

  safeArea: {
    flex: 1,
  },

  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },

  closeButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },

  title: {
    color: colors.ink,
    fontFamily: fonts.heading,
    fontSize: fontSizes.input,
    fontWeight: fontWeights.semibold,
  },

  hint: {
    color: colors.textSecondary,
    fontFamily: fonts.body,
    fontSize: fontSizes.caption,
    marginTop: 10,
    textAlign: 'center',
  },

  middle: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.xl,
  },

  orbStack: {
    alignItems: 'center',
    height: 340,
    justifyContent: 'center',
    position: 'relative',
    width: 340,
  },

  ringOuter: {
    borderColor: 'rgba(123,44,245,0.14)',
    borderRadius: 170,
    borderWidth: 1.5,
    height: 340,
    left: 0,
    position: 'absolute',
    top: 0,
    width: 340,
  },

  ringActive: {
    borderColor: 'rgba(123,44,245,0.55)',
  },

  ringMiddle: {
    backgroundColor: 'rgba(123,44,245,0.05)',
    borderColor: 'rgba(123,44,245,0.22)',
    borderRadius: 138,
    borderWidth: 1.5,
    height: 276,
    left: '50%',
    marginLeft: -138,
    marginTop: -138,
    position: 'absolute',
    top: '50%',
    width: 276,
  },

  ringInner: {
    backgroundColor: 'rgba(232,30,200,0.10)',
    borderRadius: 108,
    height: 216,
    left: '50%',
    marginLeft: -108,
    marginTop: -108,
    position: 'absolute',
    top: '50%',
    width: 216,
  },

  orb: {
    alignItems: 'center',
    backgroundColor: colors.violet,
    borderRadius: 84,
    elevation: 24,
    height: 168,
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: colors.violet,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.38,
    shadowRadius: 50,
    width: 168,
  },

  spotOrange: {
    backgroundColor: 'rgba(255,161,59,0.75)',
    borderRadius: 48,
    height: 96,
    left: -8,
    position: 'absolute',
    top: -11,
    width: 96,
  },

  spotCoral: {
    backgroundColor: 'rgba(240,62,90,0.65)',
    borderRadius: 52,
    height: 104,
    left: 86,
    position: 'absolute',
    top: -2,
    width: 104,
  },

  spotMagenta: {
    backgroundColor: 'rgba(232,30,200,0.65)',
    borderRadius: 55,
    height: 110,
    left: -5,
    position: 'absolute',
    top: 89,
    width: 110,
  },

  spotWhite: {
    backgroundColor: 'rgba(255,255,255,0.28)',
    borderRadius: 15,
    height: 30,
    left: 29,
    position: 'absolute',
    top: 8,
    width: 110,
  },

  waveform: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    height: 72,
  },

  waveBar: {
    backgroundColor: colors.white,
    borderRadius: 4,
    width: 8,
  },

  listening: {
    color: colors.ink,
    fontFamily: fonts.heading,
    fontSize: fontSizes.title,
    fontWeight: fontWeights.bold,
    marginTop: spacing.md,
    textAlign: 'center',
  },

  transcript: {
    backgroundColor: colors.white,
    borderColor: colors.borderCard,
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: 6,
    marginHorizontal: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
  },

  transcriptLabel: {
    color: colors.textCaption,
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: fontWeights.semibold,
  },

  transcriptText: {
    color: colors.ink,
    fontFamily: fonts.body,
    fontSize: fontSizes.input,
    fontWeight: fontWeights.medium,
    lineHeight: 25,
  },

  controls: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 36,
    paddingHorizontal: 28,
  },

  controlButton: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.borderInput,
    borderRadius: 28,
    borderWidth: 1.5,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },

  stopButton: {
    alignItems: 'center',
    backgroundColor: colors.ink,
    borderRadius: 38,
    elevation: 12,
    height: 76,
    justifyContent: 'center',
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 26,
    width: 76,
  },

  recordingButton: {
    backgroundColor: colors.coral,
  },

  disabledButton: {
    opacity: 0.6,
  },

  stopSquare: {
    backgroundColor: colors.white,
    borderRadius: 6,
    height: 24,
    width: 24,
  },

  helpLabel: {
    color: colors.ink,
    fontFamily: fonts.heading,
    fontSize: 20,
    fontWeight: fontWeights.semibold,
  },

  pressed: {
    opacity: 0.85,
  },
});
