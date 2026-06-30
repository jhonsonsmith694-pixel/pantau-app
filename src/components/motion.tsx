// PANTAU motion primitives — built on React Native Animated (no reanimated,
// per project constraint). Implements the high-end-visual-design skill's motion
// language adapted to RN: staggered fade-up entry + spring press physics.
import React, { useCallback, useEffect, useRef } from 'react';
import { Animated, Easing, TouchableOpacity, ViewStyle, StyleProp, GestureResponderEvent } from 'react-native';
import { MOTION } from '../config';

// --- FadeInView ---------------------------------------------------------------
// Elements never appear statically: they fade up gently on mount. Pass `index`
// to cascade items in a list (staggered reveal).
interface FadeInViewProps {
  children: React.ReactNode;
  index?: number;
  delay?: number;
  offset?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
}
export const FadeInView = React.memo(function FadeInView({
  children, index = 0, delay, offset = MOTION.entryOffset, duration = MOTION.durationBase, style,
}: FadeInViewProps) {
  const progress = useRef(new Animated.Value(0)).current;
  const startDelay = delay ?? index * MOTION.staggerStep;

  useEffect(() => {
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration,
      delay: startDelay,
      easing: Easing.bezier(MOTION.easing[0], MOTION.easing[1], MOTION.easing[2], MOTION.easing[3]),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [progress, duration, startDelay]);

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [offset, 0] });

  return (
    <Animated.View style={[{ opacity: progress, transform: [{ translateY }] }, style]}>
      {children}
    </Animated.View>
  );
});

// --- PressableScale -----------------------------------------------------------
// Physical press feedback: spring scale-down on press-in, spring-back on release.
interface PressableScaleProps {
  children: React.ReactNode;
  onPress?: (e: GestureResponderEvent) => void;
  onLongPress?: () => void;
  disabled?: boolean;
  scaleTo?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  accessibilityRole?: 'button' | 'link' | 'none';
}
export const PressableScale = React.memo(function PressableScale({
  children, onPress, onLongPress, disabled, scaleTo = MOTION.pressScale, style, accessibilityLabel, accessibilityRole = 'button',
}: PressableScaleProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = useCallback(() => {
    Animated.spring(scale, { toValue: scaleTo, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  }, [scale, scaleTo]);
  const pressOut = useCallback(() => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  }, [scale]);

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <TouchableOpacity
        activeOpacity={0.85}
        disabled={disabled}
        onPress={onPress}
        onLongPress={onLongPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole={accessibilityRole}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
});

// --- Pulse --------------------------------------------------------------------
// Gentle looping opacity pulse for "live"/"thinking" indicators.
export function usePulse(active: boolean = true): Animated.Value {
  const v = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    if (!active) { v.setValue(1); return; }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0.4, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [v, active]);
  return v;
}

// --- AnimatedNumber -----------------------------------------------------------
// Animates from 0 to a target value using Animated.timing. Formats with provided
// formatter. Re-animates when value changes.
interface AnimatedNumberProps {
  value: number;
  duration?: number;
  format?: (n: number) => string;
  style?: any;
}
export const AnimatedNumber = React.memo(function AnimatedNumber({
  value,
  duration = MOTION.durationSlow,
  format = (n: number) => Math.round(n).toString(),
  style,
}: AnimatedNumberProps) {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = React.useState(format(0));

  useEffect(() => {
    animatedValue.setValue(0);
    const anim = Animated.timing(animatedValue, {
      toValue: value,
      duration,
      easing: Easing.bezier(MOTION.easing[0], MOTION.easing[1], MOTION.easing[2], MOTION.easing[3]),
      useNativeDriver: false, // need JS-side value for text
    });

    const listenerId = animatedValue.addListener(({ value: v }) => {
      setDisplay(format(v));
    });

    anim.start(() => {
      // Ensure final value is exact
      setDisplay(format(value));
    });

    return () => {
      anim.stop();
      animatedValue.removeListener(listenerId);
    };
  }, [value, duration, format]);

  return (
    <Animated.Text style={style}>
      {display}
    </Animated.Text>
  );
});
