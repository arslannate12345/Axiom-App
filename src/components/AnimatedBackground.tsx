import { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Animated, Easing } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Orb {
  size: number;
  color: string;
  initialX: number;
  initialY: number;
  driftX: number;
  driftY: number;
  duration: number;
  delay: number;
  opacity: number;
}

const ORBS: Orb[] = [
  {
    size: 200,
    color: '#6366F1',
    initialX: SCREEN_WIDTH * 0.1,
    initialY: SCREEN_HEIGHT * 0.15,
    driftX: 40,
    driftY: 30,
    duration: 8000,
    delay: 0,
    opacity: 0.06,
  },
  {
    size: 160,
    color: '#8B5CF6',
    initialX: SCREEN_WIDTH * 0.65,
    initialY: SCREEN_HEIGHT * 0.55,
    driftX: -35,
    driftY: 25,
    duration: 10000,
    delay: 1000,
    opacity: 0.05,
  },
  {
    size: 120,
    color: '#6366F1',
    initialX: SCREEN_WIDTH * 0.3,
    initialY: SCREEN_HEIGHT * 0.75,
    driftX: 30,
    driftY: -20,
    duration: 7000,
    delay: 2000,
    opacity: 0.07,
  },
  {
    size: 90,
    color: '#A78BFA',
    initialX: SCREEN_WIDTH * 0.8,
    initialY: SCREEN_HEIGHT * 0.2,
    driftX: -25,
    driftY: 35,
    duration: 9000,
    delay: 500,
    opacity: 0.04,
  },
];

function FloatingOrb({ orb }: { orb: Orb }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Wait for the delay
    const timeout = setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(progress, {
            toValue: 1,
            duration: orb.duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(progress, {
            toValue: 0,
            duration: orb.duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      ).start();
    }, orb.delay);

    return () => clearTimeout(timeout);
  }, []);

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, orb.driftX],
  });

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, orb.driftY],
  });

  const scale = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.15, 1],
  });

  const opacity = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [orb.opacity, orb.opacity * 1.5, orb.opacity],
  });

  return (
    <Animated.View
      style={[
        styles.orb,
        {
          width: orb.size,
          height: orb.size,
          borderRadius: orb.size / 2,
          backgroundColor: orb.color,
          left: orb.initialX - orb.size / 2,
          top: orb.initialY - orb.size / 2,
          transform: [{ translateX }, { translateY }, { scale }],
          opacity,
        },
      ]}
    />
  );
}

interface Props {
  children: React.ReactNode;
}

export function AnimatedBackground({ children }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.orbContainer} pointerEvents="none">
        {ORBS.map((orb, i) => (
          <FloatingOrb key={i} orb={orb} />
        ))}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  orbContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  orb: {
    position: 'absolute',
  },
});
