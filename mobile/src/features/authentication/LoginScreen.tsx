import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, fonts, fontSizes, radii } from '@/shared/theme';
import PrimaryButton from '@/shared/components/PrimaryButton';

export default function LoginScreen() {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpStep, setOtpStep] = useState(false);
  const [error, setError] = useState('');

  const sendCode = () => {
    if (!/^3\d{9}$/.test(phone)) {
      setError('Apna 10 digit mobile number enter karein.');
      return;
    }
    setError('');
    setOtpStep(true);
  };

  const verifyCode = () => {
    if (!/^\d{6}$/.test(otp)) {
      setError('6 digit OTP enter karein.');
      return;
    }
    setError('');
    router.replace('/shop-setup');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.content}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>R</Text>
          </View>

          <Text style={styles.brand}>Rozzy</Text>
          <Text style={styles.urdu}>روزی</Text>

          {!otpStep ? (
            <>
              <Text style={styles.heading}>Apne number se shuru karein</Text>
              <Text style={styles.description}>
                Aapke mobile par verification code bheja jayega.
              </Text>

              <Text style={styles.label}>Mobile number</Text>
              <View style={styles.phoneInput}>
                <Text style={styles.countryCode}>🇵🇰 +92</Text>
                <TextInput
                  value={phone}
                  onChangeText={(value) => {
                    setPhone(value.replace(/\D/g, '').slice(0, 10));
                    setError('');
                  }}
                  placeholder="3XX XXXXXXX"
                  placeholderTextColor={colors.textCaption}
                  keyboardType="phone-pad"
                  maxLength={10}
                  style={styles.input}
                />
              </View>

              <PrimaryButton label="Code bhejein" onPress={sendCode} />
            </>
          ) : (
            <>
              <Text style={styles.heading}>Number verify karein</Text>
              <Text style={styles.description}>
                +92 {phone} par bheja gaya 6 digit code enter karein.
              </Text>

              <Text style={styles.label}>Verification code</Text>
              <TextInput
                value={otp}
                onChangeText={(value) => {
                  setOtp(value.replace(/\D/g, '').slice(0, 6));
                  setError('');
                }}
                placeholder="000000"
                placeholderTextColor={colors.textCaption}
                keyboardType="number-pad"
                maxLength={6}
                style={styles.otpInput}
              />

              <PrimaryButton label="Verify karein" onPress={verifyCode} />

              <Text style={styles.backText} onPress={() => {
                setOtpStep(false);
                setOtp('');
                setError('');
              }}>
                Number change karein
              </Text>
            </>
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>

        <Text style={styles.footer}>Dukaan ka smart saathi</Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, paddingHorizontal: 24 },
  content: { flex: 1, justifyContent: 'center' },
  logo: {
    width: 64, height: 64, borderRadius: 18,
    backgroundColor: colors.navy, alignItems: 'center',
    justifyContent: 'center', alignSelf: 'center',
  },
  logoText: { color: colors.white, fontFamily: fonts.heading, fontSize: 36, fontWeight: '700' },
  brand: {
    textAlign: 'center', color: colors.ink,
    fontFamily: fonts.heading, fontSize: 30, fontWeight: '700', marginTop: 10,
  },
  urdu: { textAlign: 'center', color: colors.violet, fontSize: 22, marginBottom: 42 },
  heading: {
    color: colors.ink, fontFamily: fonts.heading,
    fontSize: 22, fontWeight: '600', marginBottom: 10,
  },
  description: {
    color: colors.textSecondary, fontFamily: fonts.body,
    fontSize: 15, lineHeight: 23, marginBottom: 28,
  },
  label: {
    color: colors.ink, fontFamily: fonts.body,
    fontSize: 14, fontWeight: '600', marginBottom: 9,
  },
  phoneInput: {
    minHeight: 56, borderWidth: 1, borderColor: colors.borderInput,
    borderRadius: radii.md, backgroundColor: colors.white,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, marginBottom: 22,
  },
  countryCode: { color: colors.ink, fontFamily: fonts.body, fontSize: 15 },
  input: {
    flex: 1, color: colors.ink, fontFamily: fonts.body,
    fontSize: 16, paddingVertical: 12, paddingLeft: 12,
  },
  otpInput: {
    height: 60, borderWidth: 1, borderColor: colors.borderInput,
    borderRadius: radii.md, backgroundColor: colors.white,
    color: colors.ink, textAlign: 'center', letterSpacing: 12,
    fontFamily: fonts.heading, fontSize: 24, marginBottom: 22,
  },
  backText: {
    color: colors.violet, textAlign: 'center',
    fontFamily: fonts.body, fontSize: 14, marginTop: 22,
  },
  error: { color: colors.coral, fontFamily: fonts.body, fontSize: 13, marginTop: 14 },
  footer: {
    textAlign: 'center', color: colors.textCaption,
    fontFamily: fonts.body, fontSize: fontSizes.caption, paddingBottom: 20,
  },
});
