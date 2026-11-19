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
import { parseSentence } from '@/api';
import { listProducts, type ProductRecord } from '@/core/database/repositories/productRepository';
import { matchParsedItemToProduct, normalizeName } from '@/shared/utils/productMatcher';
import { setPendingCartItems, clearPendingCartItems, type PendingCartItem } from '@/shared/utils/pendingCartBridge';
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
  const [isProcessingNlu, setIsProcessingNlu] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [message, setMessage] = useState('');
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(null);

  const pendingReplyRef = useRef<string | null>(null);
  const isProcessingRef = useRef<boolean>(false);
  const lastProcessedTranscriptRef = useRef<string>('');
  const femaleVoiceRef = useRef<FemaleVoice | null>(null);

  // Clarification state machine: stores candidates from an ambiguous match
  // so the merchant's next reply can be resolved against them.
  const pendingClarificationCandidatesRef = useRef<ProductRecord[] | null>(null);
  const pendingClarificationQtyRef = useRef<number>(1);

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

  const speakFemaleTTS = async (text: string, onFinish?: () => void) => {
    try {
      let selectedVoice = femaleVoiceRef.current;

      if (!selectedVoice) {
        const voices = await Speech.getAvailableVoicesAsync();

        // Strict Female Urdu/Hindi TTS logic (never fall back to male voice)
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
        if (onFinish) onFinish();
        return;
      }

      Speech.speak(text, {
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
          if (onFinish) onFinish();
        },
        onStopped: () => {
          setIsAssistantSpeaking(false);
          setAudioLevel(0);
        },
        onError: () => {
          setIsAssistantSpeaking(false);
          setAudioLevel(0);
          setMessage('Rozzy ki voice play nahi ho saki.');
          if (onFinish) onFinish();
        },
      });
    } catch {
      setIsAssistantSpeaking(false);
      setAudioLevel(0);
      setMessage('Phone ki text-to-speech service available nahi hai.');
      if (onFinish) onFinish();
    }
  };

  /**
   * Resolves a clarification reply against a list of candidate products.
   * Uses word-overlap between the merchant's reply and each candidate's name/aliases.
   * Returns the unique matched product, or null if 0 or 2+ candidates match.
   */
  const resolveClarificationReply = (
    reply: string,
    candidates: ProductRecord[],
  ): ProductRecord | null => {
    const normReply = normalizeName(reply);
    const matches = candidates.filter((c) => {
      const nameWords = normalizeName(c.name).split(' ');
      if (nameWords.some((w) => w.length > 2 && normReply.includes(w))) return true;
      return c.aliases.some((a) => {
        const aWords = normalizeName(a).split(' ');
        return aWords.some((w) => w.length > 2 && normReply.includes(w));
      });
    });
    return matches.length === 1 ? matches[0] : null;
  };

  /**
   * Processes the final transcript through NLU, product matching, and cart bridging.
   */
  const processFinalTranscript = async (finalText: string) => {
    const trimmed = finalText.trim();
    if (!trimmed) return;

    // Deduplication check: prevent processing identical transcripts in the same session.
    // Exception: if a clarification is pending, the reply MUST be processed even if it
    // looks identical to the previous transcript (edge case: merchant says the same word twice).
    if (isProcessingRef.current) return;
    if (!pendingClarificationCandidatesRef.current && lastProcessedTranscriptRef.current === trimmed) {
      return;
    }

    isProcessingRef.current = true;
    lastProcessedTranscriptRef.current = trimmed;
    setIsProcessingNlu(true);

    // ── CLARIFICATION RESOLUTION PATH ────────────────────────────────────────
    // If there is a pending ambiguous clarification, try to resolve the merchant's
    // reply against the stored candidate list WITHOUT calling the NLU backend.
    if (pendingClarificationCandidatesRef.current) {
      const candidates = pendingClarificationCandidatesRef.current;
      const resolvedProduct = resolveClarificationReply(trimmed, candidates);

      if (resolvedProduct) {
        // Merchant's reply identified a unique product → stage it
        pendingClarificationCandidatesRef.current = null;
        const qty = pendingClarificationQtyRef.current;
        const pendingItem: PendingCartItem = {
          product: resolvedProduct,
          quantity: qty,
          unitPrice: resolvedProduct.price,
        };
        await setPendingCartItems([pendingItem]);

        const confirmMsg = `${qty} ${resolvedProduct.unit} ${resolvedProduct.name} bill mein shaamil kar diya.`;
        setMessage(confirmMsg);
        await speakFemaleTTS(confirmMsg, () => {
          router.navigate('/bill');
        });
      } else {
        // Could not resolve uniquely → ask again
        const candidateNames = candidates.map((c) => c.name).join(' ya ');
        const retryMsg = `Samajh nahi aayi. Baraye meherbani batayein: ${candidateNames}?`;
        setMessage(retryMsg);
        await speakFemaleTTS(retryMsg);
        // Keep pendingClarificationCandidatesRef set so the next reply is also resolved here
      }

      setIsProcessingNlu(false);
      isProcessingRef.current = false;
      return;
    }
    // ── END CLARIFICATION RESOLUTION ─────────────────────────────────────────

    setMessage('NLU process ho raha hai…');

    try {
      // 1. Call existing FastAPI /parse endpoint
      const parseResult = await parseSentence(trimmed);

      if (!parseResult.items || parseResult.items.length === 0) {
        setMessage('Koi cheez samajh nahi aayi. Baraye meherbani dobara batayein.');
        await speakFemaleTTS('Koi cheez samajh nahi aayi. Baraye meherbani dobara batayein.');
        setIsProcessingNlu(false);
        isProcessingRef.current = false;
        return;
      }

      // 2. Fetch active SQLite catalogue for product matching
      const catalogue: ProductRecord[] = await listProducts('');

      const matchedPendingItems: PendingCartItem[] = [];
      const clarifications: string[] = [];
      // Track the first ambiguous result so we can store its candidates for the next turn
      let firstAmbiguousResult: ReturnType<typeof matchParsedItemToProduct> | null = null;

      for (const item of parseResult.items) {
        const matchRes = matchParsedItemToProduct(item, catalogue);

        if (matchRes.status === 'exact' && matchRes.product) {
          matchedPendingItems.push({
            product: matchRes.product,
            quantity: matchRes.matchedQuantity,
            unitPrice: matchRes.product.price,
          });
        } else if (matchRes.clarificationMessage) {
          clarifications.push(matchRes.clarificationMessage);
          if (matchRes.status === 'ambiguous' && !firstAmbiguousResult) {
            firstAmbiguousResult = matchRes;
          }
        }
      }

      // 3. Handle clarifications vs successful cart addition
      if (clarifications.length > 0) {
        const clarificationText = clarifications.join(' Aur ');
        setMessage(clarificationText);
        // If the first issue was ambiguous, store candidates so the next turn resolves it
        if (firstAmbiguousResult && firstAmbiguousResult.candidateProducts.length > 1) {
          pendingClarificationCandidatesRef.current = firstAmbiguousResult.candidateProducts;
          // Store the quantity from the parsed item (default 1 if not present)
          pendingClarificationQtyRef.current = parseResult.items[0]?.qty ?? 1;
          // Reset dedup so the follow-up reply is not blocked
          lastProcessedTranscriptRef.current = '';
        }
        // Ask clarification via female TTS, then wait for merchant's next turn
        await speakFemaleTTS(clarificationText);
        setIsProcessingNlu(false);
        isProcessingRef.current = false;
        return;
      }

      if (matchedPendingItems.length > 0) {
        // Safe staging: populate bridge so BillScreen will import into cart for merchant review
        await setPendingCartItems(matchedPendingItems);

        const summaryNames = matchedPendingItems
          .map((i) => `${i.quantity} ${i.product.unit} ${i.product.name}`)
          .join(', ');

        const confirmMsg = `${summaryNames} bill mein shaamil kar diye hain. Bill screen par check karein.`;
        setMessage(confirmMsg);

        // Speak confirmation then transition to BillScreen for merchant review
        await speakFemaleTTS(confirmMsg, () => {
          router.navigate('/bill');
        });
      } else {
        const noMatchMsg = 'Koi product match nahi hua. Baraye meherbani dobara batayein.';
        setMessage(noMatchMsg);
        await speakFemaleTTS(noMatchMsg);
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'NLU backend tak rasai nahi ho saki.';
      setMessage(`Masla: ${errMsg}. Likh kar bill banayein.`);
      await speakFemaleTTS('NLU backend se rabta nahi ho saka. Likh kar bill banayein.');
    } finally {
      setIsProcessingNlu(false);
      isProcessingRef.current = false;
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
      void processFinalTranscript(pendingText);
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

      // Only process when transcript is marked FINAL
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
    if (isStarting || isAssistantSpeaking || isProcessingNlu) return;

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
    isProcessingRef.current = false;
    pendingClarificationCandidatesRef.current = null;
    pendingClarificationQtyRef.current = 1;
    // Cancellation safety: ensure no pending items are staged
    void clearPendingCartItems();
    Speech.stop();

    if (isRecognizing) {
      ExpoSpeechRecognitionModule.abort();
    }

    router.back();
  };

  const handleKeyboard = () => {
    pendingReplyRef.current = null;
    isProcessingRef.current = false;
    pendingClarificationCandidatesRef.current = null;
    pendingClarificationQtyRef.current = 1;
    Speech.stop();

    if (isRecognizing) {
      ExpoSpeechRecognitionModule.stop();
    }

    router.navigate('/bill');
  };

  const statusText = isStarting
    ? 'Microphone tayyar ho raha hai…'
    : isProcessingNlu
      ? 'Rozzy NLU samajh rahi hai…'
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
              (isRecognizing && isSpeaking) || isAssistantSpeaking || isProcessingNlu
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
            disabled={isStarting || isAssistantSpeaking || isProcessingNlu}
            accessibilityLabel={
              isRecognizing ? 'Listening band karein' : 'Baat shuru karein'
            }
            style={({ pressed }) => [
              styles.stopButton,
              isRecognizing && styles.recordingButton,
              pressed && styles.pressed,
              (isStarting || isAssistantSpeaking || isProcessingNlu) && styles.disabledButton,
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
                'Center microphone button dabayein aur bolna shuru karein. Maslan: "Do kilo cheeni aur aik litre doodh".',
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
