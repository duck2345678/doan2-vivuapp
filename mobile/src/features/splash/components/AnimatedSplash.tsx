/**
 * AnimatedSplash Component
 * Option A: Logo Reveal Animation with sound effect
 * Tagline: "Trải nghiệm du lịch cùng mọi người"
 */
import { useColorScheme } from "@/shared/hooks";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import * as SplashScreen from "expo-splash-screen";
import React, { useCallback, useEffect, useState } from "react";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import Animated, {
    Easing,
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withSequence,
    withSpring,
    withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { runOnJS } from "react-native-worklets";
import { useSplashSound } from "../hooks/useSplashSound";
const { width: SCREEN_WIDTH } = Dimensions.get("window");
// Animation durations (ms)
const TIMINGS = {
  GRADIENT_FADE: 500,
  PIN_DROP: 600,
  LOGO_SCALE: 400,
  PLANE_FLY: 500,
  TEXT_REVEAL: 400,
  TOTAL_DURATION: 2500,
};
interface AnimatedSplashProps {
  onAnimationComplete: () => void;
}
export function AnimatedSplash({ onAnimationComplete }: AnimatedSplashProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();
  const [isReady, setIsReady] = useState(false);
  // Animation values
  const gradientOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0);
  const logoTranslateY = useSharedValue(-100);
  const planeTranslateX = useSharedValue(-SCREEN_WIDTH);
  const planeOpacity = useSharedValue(0);
  const taglineOpacity = useSharedValue(0);
  const taglineTranslateY = useSharedValue(20);
  const appNameOpacity = useSharedValue(0);
  const appNameTranslateY = useSharedValue(20);
  // Sound hook
  const { playSound } = useSplashSound();
  const handleAnimationComplete = useCallback(() => {
    onAnimationComplete();
  }, [onAnimationComplete]);
  // Start animation sequence
  useEffect(() => {
    const startAnimation = async () => {
      // Hide native splash
      await SplashScreen.hideAsync();
      setIsReady(true);
      // Play sound at start
      playSound();
      // 1. Gradient fade in (0-500ms)
      gradientOpacity.value = withTiming(1, {
        duration: TIMINGS.GRADIENT_FADE,
        easing: Easing.out(Easing.ease),
      });
      // 2. Logo pin drop with bounce (500-1100ms)
      logoTranslateY.value = withDelay(
        400,
        withSpring(0, {
          damping: 12,
          stiffness: 180,
          mass: 1,
        }),
      );
      logoScale.value = withDelay(
        400,
        withSpring(1, {
          damping: 10,
          stiffness: 200,
        }),
      );
      // 3. Paper plane flies in (1100-1600ms)
      planeOpacity.value = withDelay(1000, withTiming(1, { duration: 100 }));
      planeTranslateX.value = withDelay(
        1000,
        withSequence(
          withTiming(SCREEN_WIDTH * 0.15, {
            duration: TIMINGS.PLANE_FLY,
            easing: Easing.out(Easing.cubic),
          }),
          withTiming(SCREEN_WIDTH * 0.1, {
            duration: 200,
            easing: Easing.inOut(Easing.ease),
          }),
        ),
      );
      // 4. App name reveal (1600-2000ms)
      appNameOpacity.value = withDelay(
        1500,
        withTiming(1, { duration: TIMINGS.TEXT_REVEAL }),
      );
      appNameTranslateY.value = withDelay(
        1500,
        withSpring(0, { damping: 15, stiffness: 150 }),
      );
      // 5. Tagline reveal (1800-2200ms)
      taglineOpacity.value = withDelay(
        1700,
        withTiming(1, { duration: TIMINGS.TEXT_REVEAL }),
      );
      taglineTranslateY.value = withDelay(
        1700,
        withSpring(0, { damping: 15, stiffness: 150 }),
      );
      // Complete animation after total duration
      setTimeout(() => {
        runOnJS(handleAnimationComplete)();
      }, TIMINGS.TOTAL_DURATION);
    };
    startAnimation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Animated styles
  const gradientStyle = useAnimatedStyle(() => ({
    opacity: gradientOpacity.value,
  }));
  const logoStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: logoTranslateY.value },
      { scale: logoScale.value },
    ],
  }));
  const planeStyle = useAnimatedStyle(() => ({
    opacity: planeOpacity.value,
    transform: [
      { translateX: planeTranslateX.value },
      {
        rotate: `${interpolate(
          planeTranslateX.value,
          [-SCREEN_WIDTH, 0, SCREEN_WIDTH * 0.15],
          [-15, 0, 5],
        )}deg`,
      },
    ],
  }));
  const appNameStyle = useAnimatedStyle(() => ({
    opacity: appNameOpacity.value,
    transform: [{ translateY: appNameTranslateY.value }],
  }));
  const taglineStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
    transform: [{ translateY: taglineTranslateY.value }],
  }));
  // Colors based on theme
  const gradientColors = isDark
    ? (["#1E293B", "#0F172A", "#14532D"] as const)
    : (["#EFF6FF", "#FFFFFF", "#F0FDF4"] as const);
  if (!isReady) {
    return null;
  }
  return (
    <View style={styles.container}>
      <Animated.View style={[StyleSheet.absoluteFill, gradientStyle]}>
        <LinearGradient
          colors={gradientColors}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      </Animated.View>
      <View style={styles.content}>
        {/* Logo with pin drop animation */}
        <Animated.View style={[styles.logoContainer, logoStyle]}>
          <Image
            source={require("@/assets/images/univillage-logo.png")}
            style={styles.logo}
            contentFit="contain"
          />
        </Animated.View>
        {/* Paper plane overlay (optional decorative) */}
        <Animated.View style={[styles.planeContainer, planeStyle]}>
          <Text style={styles.planeEmoji}>✈️</Text>
        </Animated.View>
        {/* App name */}
        <Animated.Text
          style={[
            styles.appName,
            { color: isDark ? "#FFFFFF" : "#1E3A8A" },
            appNameStyle,
          ]}
        >
          Uni Village
        </Animated.Text>
        {/* Tagline */}
        <Animated.Text
          style={[
            styles.tagline,
            { color: isDark ? "#94A3B8" : "#6B7280" },
            taglineStyle,
          ]}
        >
          Trải nghiệm du lịch cùng mọi người
        </Animated.Text>
      </View>
      {/* Version footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Text
          style={[styles.version, { color: isDark ? "#64748B" : "#9CA3AF" }]}
        >
          v1.0.0
        </Text>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  logoContainer: {
    width: 160,
    height: 160,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 140,
    height: 140,
  },
  planeContainer: {
    position: "absolute",
    top: "35%",
  },
  planeEmoji: {
    fontSize: 32,
  },
  appName: {
    marginTop: 24,
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: 1,
  },
  tagline: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "400",
    textAlign: "center",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  version: {
    fontSize: 12,
    fontWeight: "500",
  },
});
