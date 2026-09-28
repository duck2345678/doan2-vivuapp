/**
 * useSplashSound Hook
 * Plays a gentle travel/adventure sound effect during splash
 */

import { useCallback } from "react";

export function useSplashSound() {
  const playSound = useCallback(async () => {
    // Temporarily disabled due to expo-av deprecation in SDK 57
  }, []);

  const stopSound = useCallback(async () => {
    // Temporarily disabled due to expo-av deprecation in SDK 57
  }, []);

  return { playSound, stopSound };
}
