/**
 * useSplashSound Hook
 * Plays a gentle travel/adventure sound effect during splash
 */

import { Audio } from "expo-av";
import { useCallback, useEffect, useRef } from "react";

export function useSplashSound() {
  const soundRef = useRef<Audio.Sound | null>(null);
  const isLoadedRef = useRef(false);

  // Load sound on mount
  useEffect(() => {
    const loadSound = async () => {
      try {
        // Configure audio mode for splash sound
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: false,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        });

        // Use a simple notification/chime sound from expo-av
        // This creates a quick "whoosh" effect without needing external files
        const { sound } = await Audio.Sound.createAsync(
          // Using a gentle notification sound URL (free, royalty-free)
          {
            uri: "https://cdn.pixabay.com/audio/2022/03/15/audio_d6e0a33f13.mp3",
          },
          { shouldPlay: false, volume: 0.4 },
        );
        soundRef.current = sound;
        isLoadedRef.current = true;
      } catch (error) {
        // Silently fail - sound is not critical
        console.log("Splash sound not available:", error);
      }
    };

    loadSound();

    // Cleanup
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
      }
    };
  }, []);

  const playSound = useCallback(async () => {
    try {
      if (soundRef.current && isLoadedRef.current) {
        await soundRef.current.setPositionAsync(0);
        await soundRef.current.playAsync();
      }
    } catch (error) {
      // Silently fail - sound is not critical
    }
  }, []);

  const stopSound = useCallback(async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.stopAsync();
      }
    } catch (error) {
      // Silently fail
    }
  }, []);

  return { playSound, stopSound };
}
