import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Speech from 'expo-speech';
import type { Voice } from 'expo-speech';

import { colors, fonts, fontSizes, fontWeights, radii, spacing } from '@/shared/theme';

export default function VoiceTestingPanel() {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const [error, setError] = useState('');

  const loadVoices = async () => {
    setLoading(true);
    setError('');

    try {
      const availableVoices = await Speech.getAvailableVoicesAsync();

      const sortedVoices = [...availableVoices].sort((a, b) => {
        const aPreferred = /^(ur|hi)(-|$)/i.test(a.language);
        const bPreferred = /^(ur|hi)(-|$)/i.test(b.language);

        return Number(bPreferred) - Number(aPreferred);
      });

      setVoices(sortedVoices);
    } catch {
      setError('Phone ki available voices load nahi ho sakin.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadVoices();

    return () => {
      Speech.stop();
    };
  }, []);

  const playSample = (voice: Voice) => {
    Speech.stop();
    setPlayingVoice(voice.identifier);
    setError('');

    Speech.speak(
      'Assalam o alaikum. Ji, main Rozzy hoon. Aap apni dukaan ka bill banane ke liye mujh se baat kar sakte hain.',
      {
        voice: voice.identifier,
        language: voice.language,
        rate: 0.9,
        pitch: 1,
        onDone: () => setPlayingVoice(null),
        onStopped: () => setPlayingVoice(null),
        onError: () => {
          setPlayingVoice(null);
          setError('Is voice ka sample play nahi ho saka.');
        },
      },
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Voice Testing</Text>
      <Text style={styles.description}>
        Phone par installed voices sun kar Rozzy ki female voice identify karein.
      </Text>

      {loading ? (
        <Text style={styles.info}>Voices load ho rahi hain…</Text>
      ) : (
        <>
          <Text style={styles.count}>
            {voices.length} available voices
          </Text>

          {voices.length === 0 ? (
            <Text style={styles.info}>Koi voice available nahi mili.</Text>
          ) : (
            <ScrollView
              style={styles.list}
              nestedScrollEnabled
              showsVerticalScrollIndicator
            >
              {voices.map((voice) => {
                const preferred = /^(ur|hi)(-|$)/i.test(voice.language);
                const playing = playingVoice === voice.identifier;

                return (
                  <View key={voice.identifier} style={styles.voiceRow}>
                    <View style={styles.voiceDetails}>
                      <Text style={styles.voiceName}>{voice.name}</Text>
                      <Text style={styles.voiceMeta}>
                        {voice.language} · {voice.quality}
                      </Text>
                      {preferred && (
                        <Text style={styles.preferred}>Urdu / Hindi</Text>
                      )}
                    </View>

                    <Pressable
                      onPress={() => playSample(voice)}
                      style={[
                        styles.playButton,
                        playing && styles.playingButton,
                      ]}
                    >
                      <Text style={styles.playText}>
                        {playing ? 'Playing…' : 'Test'}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </>
      )}

      {!!error && <Text style={styles.error}>{error}</Text>}

      <Pressable onPress={loadVoices} style={styles.refreshButton}>
        <Text style={styles.refreshText}>Refresh voice list</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(22, 18, 58, 0.92)',
    borderColor: 'rgba(135, 111, 220, 0.45)',
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    padding: spacing.lg,
  },
  heading: {
    color: colors.white,
    fontFamily: fonts.heading,
    fontSize: fontSizes.title,
    fontWeight: fontWeights.bold,
  },
  description: {
    color: '#B9B3E8',
    fontFamily: fonts.body,
    fontSize: fontSizes.caption,
    lineHeight: 20,
  },
  count: {
    color: '#D9CEFF',
    fontFamily: fonts.body,
    fontSize: fontSizes.small,
  },
  info: {
    color: colors.white,
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
  },
  list: {
    maxHeight: 320,
  },
  voiceRow: {
    alignItems: 'center',
    borderBottomColor: 'rgba(135, 111, 220, 0.25)',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  voiceDetails: {
    flex: 1,
    gap: 4,
  },
  voiceName: {
    color: colors.white,
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    fontWeight: fontWeights.semibold,
  },
  voiceMeta: {
    color: '#B9B3E8',
    fontFamily: fonts.body,
    fontSize: fontSizes.caption,
  },
  preferred: {
    color: '#D5B9FF',
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: fontWeights.semibold,
  },
  playButton: {
    backgroundColor: colors.violet,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  playingButton: {
    backgroundColor: colors.successGreen,
  },
  playText: {
    color: colors.white,
    fontFamily: fonts.body,
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.semibold,
  },
  error: {
    color: '#FFB5C0',
    fontFamily: fonts.body,
    fontSize: fontSizes.caption,
  },
  refreshButton: {
    alignItems: 'center',
    borderColor: '#AFA6E8',
    borderRadius: radii.pill,
    borderWidth: 1,
    padding: spacing.md,
  },
  refreshText: {
    color: colors.white,
    fontFamily: fonts.body,
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.semibold,
  },
});
