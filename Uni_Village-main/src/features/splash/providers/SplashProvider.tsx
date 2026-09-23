/**
 * SplashProvider
 * Manages animated splash screen lifecycle
 */

import React, { createContext, useCallback, useContext, useState } from "react";

import { AnimatedSplash } from "../components/AnimatedSplash";

interface SplashContextType {
  isVisible: boolean;
  hideSplash: () => void;
}

const SplashContext = createContext<SplashContextType>({
  isVisible: true,
  hideSplash: () => {},
});

export function useSplash() {
  return useContext(SplashContext);
}

interface SplashProviderProps {
  children: React.ReactNode;
}

export function SplashProvider({ children }: SplashProviderProps) {
  const [isVisible, setIsVisible] = useState(true);

  const hideSplash = useCallback(() => {
    setIsVisible(false);
  }, []);

  const handleAnimationComplete = useCallback(() => {
    setIsVisible(false);
  }, []);

  return (
    <SplashContext.Provider value={{ isVisible, hideSplash }}>
      {children}
      {isVisible && (
        <AnimatedSplash onAnimationComplete={handleAnimationComplete} />
      )}
    </SplashContext.Provider>
  );
}
