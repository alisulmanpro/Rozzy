import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

type EnergyCoreProps = {
  audioLevel: number;
  isListening: boolean;
};

const PARTICLES = Array.from({ length: 24 }, (_, index) => {
  const angle = (index / 24) * Math.PI * 2;
  const radius = index % 3 === 0 ? 148 : index % 3 === 1 ? 132 : 158;

  return {
    key: index,
    left: 170 + Math.cos(angle) * radius - 2,
    top: 170 + Math.sin(angle) * radius - 2,
    size: index % 4 === 0 ? 5 : 3,
    color: index % 3 === 0 ? '#42E8FF' : index % 3 === 1 ? '#A66BFF' : '#E85BFF',
  };
});

export default function EnergyCore({
  audioLevel,
  isListening,
}: EnergyCoreProps) {
  const rotation = useRef(new Animated.Value(0)).current;
  const reverseRotation = useRef(new Animated.Value(0)).current;
  const breathing = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const firstRotation = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 18000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    const secondRotation = Animated.loop(
      Animated.timing(reverseRotation, {
        toValue: 1,
        duration: 26000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    const breathingLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathing, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(breathing, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );

    firstRotation.start();
    secondRotation.start();
    breathingLoop.start();

    return () => {
      firstRotation.stop();
      secondRotation.stop();
      breathingLoop.stop();
    };
  }, [breathing, reverseRotation, rotation]);

  const outerRotate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const innerRotate = reverseRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['360deg', '0deg'],
  });

  const breathingScale = breathing.interpolate({
    inputRange: [0, 1],
    outputRange: [0.97, 1.035],
  });

  const level = Math.max(0, Math.min(1, audioLevel));
  const coreScale = 1 + level * 0.12;
  const glowOpacity = 0.35 + level * 0.65;

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.outerGlow,
          {
            opacity: glowOpacity,
            transform: [{ scale: 1 + level * 0.16 }],
          },
        ]}
      />

      <Animated.View
        style={[
          styles.outerRing,
          { transform: [{ rotate: outerRotate }] },
        ]}
      >
        <View style={styles.outerArcOne} />
        <View style={styles.outerArcTwo} />
        <View style={styles.outerArcThree} />
        <View style={styles.outerArcFour} />
      </Animated.View>

      <Animated.View
        style={[
          styles.middleRing,
          { transform: [{ rotate: innerRotate }] },
        ]}
      >
        <View style={styles.middleDotTop} />
        <View style={styles.middleDotBottom} />
        <View style={styles.middleDotLeft} />
        <View style={styles.middleDotRight} />
      </Animated.View>

      {PARTICLES.map((particle, index) => (
        <Animated.View
          key={particle.key}
          style={[
            styles.particle,
            {
              left: particle.left,
              top: particle.top,
              width: particle.size,
              height: particle.size,
              borderRadius: particle.size / 2,
              backgroundColor: particle.color,
              opacity: 0.55 + level * 0.45,
              transform: [
                {
                  scale: 1 + level * (index % 3) * 0.45,
                },
              ],
            },
          ]}
        />
      ))}

      <Animated.View
        style={[
          styles.coreHalo,
          {
            opacity: glowOpacity,
            transform: [{ scale: coreScale }],
          },
        ]}
      />

      <Animated.View
        style={[
          styles.core,
          {
            transform: [
              { scale: coreScale },
              { scale: breathingScale },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={['#B78BFF', '#7938F5', '#35118F', '#10083D']}
          locations={[0, 0.32, 0.72, 1]}
          start={{ x: 0.12, y: 0.08 }}
          end={{ x: 0.88, y: 0.95 }}
          style={styles.coreGradient}
        >
          <View style={styles.coreHighlight} />
          <View style={styles.coreBlueGlow} />
          <View style={styles.coreMagentaGlow} />
          <View style={styles.coreCenter} />
        </LinearGradient>
      </Animated.View>

      <View style={styles.statusLight} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    height: 340,
    justifyContent: 'center',
    position: 'relative',
    width: 340,
  },

  outerGlow: {
    backgroundColor: 'rgba(80, 67, 255, 0.16)',
    borderRadius: 170,
    height: 300,
    position: 'absolute',
    width: 300,
  },

  outerRing: {
    alignItems: 'center',
    borderColor: 'rgba(76, 218, 255, 0.30)',
    borderRadius: 158,
    borderStyle: 'dashed',
    borderWidth: 1,
    height: 316,
    justifyContent: 'center',
    position: 'absolute',
    width: 316,
  },

  outerArcOne: {
    backgroundColor: '#4DEBFF',
    borderRadius: 4,
    height: 7,
    position: 'absolute',
    right: 42,
    top: 40,
    width: 7,
  },

  outerArcTwo: {
    backgroundColor: '#B66CFF',
    borderRadius: 4,
    height: 6,
    left: 32,
    position: 'absolute',
    top: 104,
    width: 6,
  },

  outerArcThree: {
    backgroundColor: '#4DEBFF',
    borderRadius: 4,
    bottom: 38,
    height: 7,
    position: 'absolute',
    right: 94,
    width: 7,
  },

  outerArcFour: {
    backgroundColor: '#E85BFF',
    borderRadius: 4,
    height: 6,
    left: 78,
    position: 'absolute',
    top: 30,
    width: 6,
  },

  middleRing: {
    borderColor: 'rgba(166, 107, 255, 0.55)',
    borderRadius: 126,
    borderWidth: 1.5,
    height: 252,
    position: 'absolute',
    width: 252,
  },

  middleDotTop: {
    backgroundColor: '#56E9FF',
    borderRadius: 4,
    height: 8,
    left: '50%',
    marginLeft: -4,
    position: 'absolute',
    top: -4,
    width: 8,
  },

  middleDotBottom: {
    backgroundColor: '#B77BFF',
    borderRadius: 4,
    bottom: -4,
    height: 8,
    left: '50%',
    marginLeft: -4,
    position: 'absolute',
    width: 8,
  },

  middleDotLeft: {
    backgroundColor: '#56E9FF',
    borderRadius: 4,
    height: 8,
    left: -4,
    position: 'absolute',
    top: '50%',
    marginTop: -4,
    width: 8,
  },

  middleDotRight: {
    backgroundColor: '#E85BFF',
    borderRadius: 4,
    height: 8,
    marginTop: -4,
    position: 'absolute',
    right: -4,
    top: '50%',
    width: 8,
  },

  particle: {
    position: 'absolute',
    shadowColor: '#63DFFF',
    shadowOpacity: 0.9,
    shadowRadius: 8,
  },

  coreHalo: {
    backgroundColor: 'rgba(112, 64, 255, 0.24)',
    borderRadius: 100,
    height: 200,
    position: 'absolute',
    width: 200,
  },

  core: {
    borderColor: 'rgba(207, 184, 255, 0.65)',
    borderRadius: 78,
    borderWidth: 1,
    elevation: 24,
    height: 156,
    overflow: 'hidden',
    shadowColor: '#7A48FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 35,
    width: 156,
  },

  coreGradient: {
    flex: 1,
    overflow: 'hidden',
  },

  coreHighlight: {
    backgroundColor: 'rgba(255,255,255,0.48)',
    borderRadius: 38,
    height: 38,
    left: 29,
    position: 'absolute',
    top: 15,
    transform: [{ rotate: '-32deg' }],
    width: 72,
  },

  coreBlueGlow: {
    backgroundColor: 'rgba(39, 220, 255, 0.65)',
    borderRadius: 35,
    height: 70,
    left: -25,
    position: 'absolute',
    top: 65,
    width: 70,
  },

  coreMagentaGlow: {
    backgroundColor: 'rgba(255, 62, 213, 0.55)',
    borderRadius: 42,
    height: 84,
    position: 'absolute',
    right: -25,
    top: 62,
    width: 84,
  },

  coreCenter: {
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderColor: 'rgba(255,255,255,0.24)',
    borderRadius: 45,
    borderWidth: 1,
    height: 90,
    left: 32,
    position: 'absolute',
    top: 32,
    width: 90,
  },

  statusLight: {
    backgroundColor: '#52E9FF',
    borderColor: 'rgba(255,255,255,0.8)',
    borderRadius: 4,
    borderWidth: 1,
    height: 7,
    position: 'absolute',
    right: 82,
    top: 86,
    width: 7,
  },
});
