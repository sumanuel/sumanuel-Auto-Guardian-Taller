import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";

const ThemeContext = createContext();

const lightColors = {
  background: "#eef2f6",
  backgroundAccent: "#d7e0ea",
  cardBackground: "#fbfcfe",
  cardMuted: "#eef3f8",
  inputBackground: "#ffffff",
  text: "#0f1720",
  textSecondary: "#536170",
  textTertiary: "#7b8998",
  primary: "#0f5fd2",
  primaryStrong: "#0a4da9",
  accent: "#15b8a6",
  warning: "#f59f00",
  danger: "#dc4c3f",
  success: "#239b56",
  border: "#d6dee7",
  borderStrong: "#b9c5d1",
  shadow: "#0b1623",
  white: "#ffffff",
  overlay: "rgba(7, 17, 29, 0.22)",
};

const darkColors = {
  background: "#09111a",
  backgroundAccent: "#112236",
  cardBackground: "#101c2a",
  cardMuted: "#132437",
  inputBackground: "#132437",
  text: "#f2f6fa",
  textSecondary: "#b2c0ce",
  textTertiary: "#7f94a8",
  primary: "#58a6ff",
  primaryStrong: "#2f7ee0",
  accent: "#24c7b2",
  warning: "#ffb648",
  danger: "#ff6b5e",
  success: "#42c883",
  border: "#1d3246",
  borderStrong: "#2a445d",
  shadow: "#000000",
  white: "#ffffff",
  overlay: "rgba(1, 6, 11, 0.5)",
};

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState("system");

  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem("@theme_preference");
      if (savedTheme) {
        setThemeMode(savedTheme);
      }
    } catch (error) {
      console.error("Error loading theme preference:", error);
    }
  };

  const setMode = async (mode) => {
    try {
      setThemeMode(mode);
      await AsyncStorage.setItem("@theme_preference", mode);
    } catch (error) {
      console.error("Error saving theme preference:", error);
    }
  };

  const toggleTheme = async () => {
    const isCurrentlyDark =
      themeMode === "system" ? systemScheme === "dark" : themeMode === "dark";
    await setMode(isCurrentlyDark ? "light" : "dark");
  };

  const isDarkMode =
    themeMode === "system" ? systemScheme === "dark" : themeMode === "dark";

  const value = useMemo(
    () => ({
      themeMode,
      isDarkMode,
      colors: isDarkMode ? darkColors : lightColors,
      setThemeMode: setMode,
      toggleTheme,
    }),
    [isDarkMode, themeMode],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
