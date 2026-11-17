import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';

import Badge from '@/shared/components/Badge';
import EnergyCore from './components/EnergyCore';
import VoiceTestingPanel from './components/VoiceTestingPanel';
import {
  colors,
  fonts,
  fontSizes,
  fontWeights,
  radii,
  spacing,
} from '@/shared/theme';

type FemaleVoice = Speech.Voice;

export default function VoiceScreen() {
  const [isStarting, setIsStarting] = useState(false);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isAssistantSpeaking, setIsAssistantSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [message, setMessage] = useState('');
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(null);

  const pendingReplyRef = useRef<string | null>(null);
  const femaleVoiceRef = useRef<FemaleVoice | null>(null);

  useEffect(() => {
    let cancelled = false;

    const restoreSelectedVoice = async () => {
      try {
        const savedVoiceId = await AsyncStorage.getItem(
          'rozzy:selected-female-voice',
        );

        if (!savedVoiceId) return;

        const availableVoices = await Speech.getAvailableVoicesAsync();
        const savedVoice = availableVoices.find(
          (voice) => voice.identifier === savedVoiceId,
        );

        if (!cancelled && savedVoice) {
          femaleVoiceRef.current = savedVoice;
          setSelectedVoiceId(savedVoice.identifier);
        }
      } catch {
        // Saved voice restore is optional; manual selection remains available.
      }
    };

    void restoreSelectedVoice();

    return () => {
      cancelled = true;
    };
  }, []);

  const speakReply = async (recognizedText: string) => {
    setMessage('Rozzy jawab tayyar kar rahi hai…');

    try {
      let selectedVoice = femaleVoiceRef.current;

      if (!selectedVoice) {
        const voices = await Speech.getAvailableVoicesAsync();

        selectedVoice =
          voices.find(
            (voice) =>
              /female|woman/i.test(voice.name) &&
              /^(ur|hi)(-|$)/i.test(voice.language),
          ) ?? null;

        femaleVoiceRef.current = selectedVoice;
      }

      if (!selectedVoice) {
        setMessage(
          'Phone par verified female Urdu/Hindi voice nahi mili. Android Text-to-speech settings mein female voice install karein.',
        );
        return;
      }

      const reply =
        'Ji, main ne aapki baat sun li. Abhi main voice testing mode mein hoon.';

      setMessage('');

      Speech.speak(reply, {
        voice: selectedVoice.identifier,
        language: selectedVoice.language,
        pitch: 1,
        rate: 0.9,
        onStart: () => {
          setIsAssistantSpeaking(true);
          setAudioLevel(0.65);
        },
        onDone: () => {
          setIsAssistantSpeaking(false);
          setAudioLevel(0);
        },
        onStopped: () => {
          setIsAssistantSpeaking(false);
          setAudioLevel(0);
        },
        onError: () => {
          setIsAssistantSpeaking(false);
          setAudioLevel(0);
          setMessage('Rozzy ki voice play nahi ho saki.');
        },
      });
    } catch {
      setIsAssistantSpeaking(false);
      setAudioLevel(0);
      setMessage('Phone ki text-to-speech service available nahi hai.');
    }
  };

  useSpeechRecognitionEvent('start', () => {
    setIsRecognizing(true);
    setMessage('');
  });

  useSpeechRecognitionEvent('end', () => {
    setIsRecognizing(false);
    setIsSpeaking(false);
    setAudioLevel(0);

    const pendingText = pendingReplyRef.current;

    if (pendingText) {
      pendingReplyRef.current = null;
      void speakReply(pendingText);
    }
  });

  useSpeechRecognitionEvent('speechstart', () => {
    setIsSpeaking(true);
  });

  useSpeechRecognitionEvent('speechend', () => {
    setIsSpeaking(false);
    setAudioLevel(0);
  });

  useSpeechRecognitionEvent('volumechange', (event) => {
    const normalized = Math.max(
      0,
      Math.min(1, (event.value + 2) / 12),
    );

    setAudioLevel(normalized);
  });

  useSpeechRecognitionEvent('result', (event) => {
    const text = event.results[0]?.transcript?.trim();

    if (text) {
      setTranscript(text);

      if (event.isFinal && !pendingReplyRef.current) {
        pendingReplyRef.current = text;
        ExpoSpeechRecognitionModule.stop();
      }
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    setIsRecognizing(false);
    setIsSpeaking(false);
    setAudioLevel(0);

    if (event.error === 'not-allowed') {
      setMessage('Microphone permission allow karein.');
    } else if (event.error === 'language-not-supported') {
      setMessage('Urdu language is device par supported nahi hai.');
    } else if (event.error === 'no-speech') {
      setMessage('Awaaz receive nahi hui. Dobara bol kar dekhein.');
    } else {
      setMessage(`Voice recognition error: ${event.error}`);
    }
  });

  const handleMicrophonePress = async () => {
    if (isStarting || isAssistantSpeaking) return;

    if (isRecognizing) {
      ExpoSpeechRecognitionModule.stop();
      return;
    }

    setIsStarting(true);
    setMessage('');
    setTranscript('');
    setAudioLevel(0);
    pendingReplyRef.current = null;

    try {
      const permission =
        await ExpoSpeechRecognitionModule.requestPermissionsAsync();

      if (!permission.granted) {
        setMessage(
          'Microphone permission zaroori hai. Phone settings mein allow karein.',
        );
        return;
      }

      const available =
        ExpoSpeechRecognitionModule.isRecognitionAvailable();

      if (!available) {
        setMessage(
          'Device par speech recognition service available nahi hai.',
        );
        return;
      }

      ExpoSpeechRecognitionModule.start({
        lang: 'ur-PK',
        interimResults: true,
        continuous: true,
        maxAlternatives: 1,
        volumeChangeEventOptions: {
          enabled: true,
          intervalMillis: 100,
        },
      });
    } catch {
      setMessage(
        'Voice recognition start nahi ho saki. Dobara koshish karein.',
      );
    } finally {
      setIsStarting(false);
    }
  };

  const handleClose = () => {
    pendingReplyRef.current = null;
    Speech.stop();

    if (isRecognizing) {
      ExpoSpeechRecognitionModule.abort();
    }

    router.back();
  };

  const handleKeyboard = () => {
    pendingReplyRef.current = null;
    Speech.stop();

    if (isRecognizing) {
      ExpoSpeechRecognitionModule.stop();
    }

    router.navigate('/bill');
  };

  const statusText = isStarting
    ? 'Microphone tayyar ho raha hai…'
    : isAssistantSpeaking
      ? 'Main jawab de rahi hoon…'
      : isSpeaking
        ? 'Main sun rahi hoon…'
        : isRecognizing
          ? 'Aapki awaaz ka intezar hai…'
          : transcript
            ? 'Awaaz samajh aa gayi'
            : 'Bolne ke liye button dabayein';

  const detailText = message || (
    transcript ||
    (isRecognizing
      ? 'Aap bolna shuru karein. Main sun rahi hoon.'
      : 'Center button dabayein aur bolna shuru karein.')
  );

  return (
    <LinearGradient
      colors={['#020014', '#080522', '#10082F']}
      locations={[0, 0.55, 1]}
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
            <Ionicons name="close" size={24} color={colors.white} />
          </Pressable>

          <Text style={styles.title}>Rozzy AI</Text>
          <Badge label="Roman Urdu" />
        </View>

        <Text style={styles.hint}>
          {'Abhi mic dabayein aur Rozzy se baat karein'}
        </Text>

        <ScrollView
          bounces={false}
          contentContainerStyle={styles.middle}
          showsVerticalScrollIndicator={false}
        >
          <EnergyCore
            audioLevel={isAssistantSpeaking ? 0.65 : audioLevel}
            isListening={
              (isRecognizing && isSpeaking) || isAssistantSpeaking
            }
          />

          <Text style={styles.listening}>{statusText}</Text>

          <View style={styles.transcript}>
            <Text style={styles.transcriptLabel}>
              VOICE TRANSCRIPT
            </Text>
            <Text style={styles.transcriptText}>
              {detailText}
            </Text>
          </View>

          <VoiceTestingPanel
            selectedVoiceId={selectedVoiceId}
            onSelectVoice={(voice) => {
              femaleVoiceRef.current = voice;
              setSelectedVoiceId(voice.identifier);
              setMessage(`Rozzy ki voice select ho gayi: ${voice.name}`);

              void AsyncStorage.setItem(
                'rozzy:selected-female-voice',
                voice.identifier,
              ).catch(() => {
                setMessage('Voice selection save nahi ho saki.');
              });
            }}
          />
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
            onPress={handleMicrophonePress}
            disabled={isStarting || isAssistantSpeaking}
            accessibilityLabel={
              isRecognizing ? 'Listening band karein' : 'Baat shuru karein'
            }
            style={({ pressed }) => [
              styles.stopButton,
              isRecognizing && styles.recordingButton,
              pressed && styles.pressed,
              (isStarting || isAssistantSpeaking) && styles.disabledButton,
            ]}
          >
            {isRecognizing ? (
              <View style={styles.stopSquare} />
            ) : (
              <Ionicons name="mic" size={32} color={colors.white} />
            )}
          </Pressable>

          <Pressable
            onPress={() =>
              setMessage(
                'Center microphone button dabayein aur bolna shuru karein.',
              )
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
    color: colors.white,
    fontFamily: fonts.heading,
    fontSize: fontSizes.input,
    fontWeight: fontWeights.semibold,
  },
  hint: {
    color: '#B9B3E8',
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
  listening: {
    color: colors.white,
    fontFamily: fonts.heading,
    fontSize: fontSizes.title,
    fontWeight: fontWeights.bold,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  transcript: {
    backgroundColor: 'rgba(22, 18, 58, 0.92)',
    borderColor: 'rgba(135, 111, 220, 0.35)',
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: 6,
    marginHorizontal: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
  },
  transcriptLabel: {
    color: '#AFA6E8',
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: fontWeights.semibold,
  },
  transcriptText: {
    color: colors.white,
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
