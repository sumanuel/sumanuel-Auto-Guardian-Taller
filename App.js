import { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import ClientsScreen from "./src/screens/ClientsScreen";
import TeamAccessScreen from "./src/screens/TeamAccessScreen";
import { ThemeProvider, useTheme } from "./src/context/ThemeContext";
import AccessStatusScreen from "./src/screens/AccessStatusScreen";
import AuthScreen from "./src/screens/AuthScreen";
import LoadingScreen from "./src/screens/LoadingScreen";
import WorkshopHomeScreen from "./src/screens/WorkshopHomeScreen";

const APP_SCREENS = {
  HOME: "home",
  CLIENTS: "clients",
  TEAM_ACCESS: "team-access",
};

function AppContent() {
  const { isDarkMode } = useTheme();
  const { authUser, authReady, signOutUser, userProfile } = useAuth();
  const [activeScreen, setActiveScreen] = useState(APP_SCREENS.HOME);

  const profileStatus = userProfile?.status;

  useEffect(() => {
    setActiveScreen(APP_SCREENS.HOME);
  }, [authUser?.uid]);

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

  if (activeScreen === APP_SCREENS.CLIENTS) {
    return (
      <>
        <StatusBar style={isDarkMode ? "light" : "dark"} />
        <ClientsScreen
          onBack={() => setActiveScreen(APP_SCREENS.HOME)}
          userProfile={userProfile}
        />
      </>
    );
  }

  if (activeScreen === APP_SCREENS.TEAM_ACCESS) {
    return (
      <>
        <StatusBar style={isDarkMode ? "light" : "dark"} />
        <TeamAccessScreen
          onBack={() => setActiveScreen(APP_SCREENS.HOME)}
          userProfile={userProfile}
        />
      </>
    );
  }

  return (
    <>
      <StatusBar style={isDarkMode ? "light" : "dark"} />
      <WorkshopHomeScreen
        onOpenClients={() => setActiveScreen(APP_SCREENS.CLIENTS)}
        onOpenTeamAccess={() => setActiveScreen(APP_SCREENS.TEAM_ACCESS)}
        onSignOut={signOutUser}
        userProfile={userProfile}
      />
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
