
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <View style={styles.brandContainer}>
        <View style={styles.logoBox}>
          <Text style={styles.logoText}>R</Text>
        </View>

        <Text style={styles.brandName}>ROZZY</Text>

        <Text style={styles.urduName}>روزی</Text>

        <Text style={styles.tagline}>
          Speak. Sell. Grow.
        </Text>
      </View>

      <View style={styles.bottomContainer}>
        <Text style={styles.heading}>
          Dukaan ka hisaab,
        </Text>

        <Text style={styles.heading}>
          ab aasaan.
        </Text>

        <Text style={styles.description}>
          Smart billing for every dukaan.
          Your business, made simpler.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F5FF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  brandContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  logoBox: {
    width: 100,
    height: 100,
    backgroundColor: '#02002F',
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },

  logoText: {
    color: '#FFFFFF',
    fontSize: 64,
    fontWeight: '900',
  },

  brandName: {
    color: '#14123A',
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: 4,
  },

  urduName: {
    color: '#7B2CF5',
    fontSize: 30,
    marginTop: 4,
  },

  tagline: {
    color: '#55537A',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 2,
    marginTop: 14,
  },

  bottomContainer: {
    position: 'absolute',
    bottom: 90,
    alignItems: 'center',
  },

  heading: {
    color: '#14123A',
    fontSize: 25,
    fontWeight: '800',
    textAlign: 'center',
  },

  description: {
    color: '#55537A',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 14,
    lineHeight: 22,
  },
});
