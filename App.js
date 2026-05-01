import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { ThemeProvider, useTheme } from "./src/context/ThemeContext";
import AccessStatusScreen from "./src/screens/AccessStatusScreen";
import AuthScreen from "./src/screens/AuthScreen";
import LoadingScreen from "./src/screens/LoadingScreen";
import WorkshopHomeScreen from "./src/screens/WorkshopHomeScreen";

function AppContent() {
  const { isDarkMode } = useTheme();
  const { authUser, authReady, signOutUser, userProfile } = useAuth();

  const profileStatus = userProfile?.status;

  if (!authReady) {
    return (
      <>
        <StatusBar style={isDarkMode ? "light" : "dark"} />
        <LoadingScreen />
      </>
    );
  }

  if (!authUser) {
    return (
      <>
        <StatusBar style={isDarkMode ? "light" : "dark"} />
        <AuthScreen />
      </>
    );
  }

  if (!userProfile || profileStatus !== "active") {
    return (
      <>
        <StatusBar style={isDarkMode ? "light" : "dark"} />
        <AccessStatusScreen onSignOut={signOutUser} userProfile={userProfile} />
      </>
    );
  }

  return (
    <>
      <StatusBar style={isDarkMode ? "light" : "dark"} />
      <WorkshopHomeScreen onSignOut={signOutUser} userProfile={userProfile} />
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
