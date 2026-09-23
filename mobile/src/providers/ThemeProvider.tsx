import { useSettingsStore } from "@/features/settings/store/settings.store";
import type { ColorScheme } from "@/shared/constants";
import React, { createContext, useCallback, useContext } from "react";
import { useColorScheme as useSystemColorScheme } from "react-native";

interface ThemeContextValue {
  colorScheme: ColorScheme;
  setColorScheme: (scheme: ColorScheme | "system") => void;
  toggleColorScheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const systemScheme = useSystemColorScheme();
  const darkMode = useSettingsStore((state) => state.darkMode);
  const setDarkMode = useSettingsStore((state) => state.setDarkMode);
  const toggleDarkModeSetting = useSettingsStore(
    (state) => state.toggleDarkMode,
  );

  const colorScheme: ColorScheme = darkMode ? "dark" : "light";

  const setColorScheme = useCallback(
    (scheme: ColorScheme | "system") => {
      if (scheme === "system") {
        setDarkMode(systemScheme === "dark");
      } else {
        setDarkMode(scheme === "dark");
      }
    },
    [setDarkMode, systemScheme],
  );

  const toggleColorScheme = useCallback(() => {
    toggleDarkModeSetting();
  }, [toggleDarkModeSetting]);

  return (
    <ThemeContext.Provider
      value={{ colorScheme, setColorScheme, toggleColorScheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
