import { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import ClientFormScreen from "./src/screens/ClientFormScreen";
import ClientsScreen from "./src/screens/ClientsScreen";
import DiagnosticFormScreen from "./src/screens/DiagnosticFormScreen";
import DiagnosticsScreen from "./src/screens/DiagnosticsScreen";
import SparePartFormScreen from "./src/screens/SparePartFormScreen";
import SparePartsScreen from "./src/screens/SparePartsScreen";
import TeamAccessScreen from "./src/screens/TeamAccessScreen";
import { ThemeProvider, useTheme } from "./src/context/ThemeContext";
import AccessStatusScreen from "./src/screens/AccessStatusScreen";
import AuthScreen from "./src/screens/AuthScreen";
import LoadingScreen from "./src/screens/LoadingScreen";
import WorkOrderFormScreen from "./src/screens/WorkOrderFormScreen";
import WorkOrdersScreen from "./src/screens/WorkOrdersScreen";
import WorkshopHomeScreen from "./src/screens/WorkshopHomeScreen";

const APP_SCREENS = {
  HOME: "home",
  CLIENTS: "clients",
  CLIENT_FORM: "client-form",
  DIAGNOSTICS: "diagnostics",
  DIAGNOSTIC_FORM: "diagnostic-form",
  WORK_ORDERS: "work-orders",
  WORK_ORDER_FORM: "work-order-form",
  SPARE_PARTS: "spare-parts",
  SPARE_PART_FORM: "spare-part-form",
  TEAM_ACCESS: "team-access",
};

function AppContent() {
  const { isDarkMode } = useTheme();
  const {
    acceptPendingInvitation,
    authUser,
    authReady,
    pendingInvitation,
    signOutUser,
    userProfile,
  } = useAuth();
  const [activeScreen, setActiveScreen] = useState(APP_SCREENS.HOME);
  const [clientFormContext, setClientFormContext] = useState({
    client: null,
    returnTo: "list",
  });
  const [clientsViewState, setClientsViewState] = useState({
    selectedClientId: null,
    screenMode: "list",
  });
  const [diagnosticFormContext, setDiagnosticFormContext] = useState({
    diagnostic: null,
    draft: null,
  });
  const [diagnosticsViewState, setDiagnosticsViewState] = useState({
    selectedDiagnosticId: null,
  });
  const [workOrderFormContext, setWorkOrderFormContext] = useState({
    workOrder: null,
    draft: null,
  });
  const [workOrdersViewState, setWorkOrdersViewState] = useState({
    selectedWorkOrderId: null,
  });
  const [sparePartFormContext, setSparePartFormContext] = useState({
    sparePart: null,
    draft: null,
  });
  const [sparePartsViewState, setSparePartsViewState] = useState({
    selectedSparePartId: null,
  });

  const profileStatus = userProfile?.status;

  useEffect(() => {
    setActiveScreen(APP_SCREENS.HOME);
    setClientFormContext({
      client: null,
      returnTo: "list",
    });
    setClientsViewState({
      selectedClientId: null,
      screenMode: "list",
    });
    setDiagnosticFormContext({
      diagnostic: null,
      draft: null,
    });
    setDiagnosticsViewState({
      selectedDiagnosticId: null,
    });
    setWorkOrderFormContext({
      workOrder: null,
      draft: null,
    });
    setWorkOrdersViewState({
      selectedWorkOrderId: null,
    });
    setSparePartFormContext({
      sparePart: null,
      draft: null,
    });
    setSparePartsViewState({
      selectedSparePartId: null,
    });
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
        <AccessStatusScreen
          authUser={authUser}
          onAcceptInvitation={acceptPendingInvitation}
          onSignOut={signOutUser}
          pendingInvitation={pendingInvitation}
          userProfile={userProfile}
        />
      </>
    );
  }

  if (activeScreen === APP_SCREENS.CLIENTS) {
    return (
      <>
        <StatusBar style={isDarkMode ? "light" : "dark"} />
        <ClientsScreen
          onBack={() => setActiveScreen(APP_SCREENS.HOME)}
          onOpenClientForm={(client, options = {}) => {
            setClientFormContext({
              client: client || null,
              returnTo: options.returnTo || "list",
            });
            setActiveScreen(APP_SCREENS.CLIENT_FORM);
          }}
          userProfile={userProfile}
          viewState={clientsViewState}
        />
      </>
    );
  }

  if (activeScreen === APP_SCREENS.CLIENT_FORM) {
    return (
      <>
        <StatusBar style={isDarkMode ? "light" : "dark"} />
        <ClientFormScreen
          initialClient={clientFormContext.client}
          onBack={() => setActiveScreen(APP_SCREENS.CLIENTS)}
          onSaved={(savedClientId) => {
            setClientsViewState({
              selectedClientId: savedClientId,
              screenMode: clientFormContext.returnTo,
            });
            setActiveScreen(APP_SCREENS.CLIENTS);
          }}
          userProfile={userProfile}
        />
      </>
    );
  }

  if (activeScreen === APP_SCREENS.DIAGNOSTICS) {
    return (
      <>
        <StatusBar style={isDarkMode ? "light" : "dark"} />
        <DiagnosticsScreen
          onBack={() => setActiveScreen(APP_SCREENS.HOME)}
          onOpenDiagnosticForm={(diagnostic, options = {}) => {
            setDiagnosticFormContext({
              diagnostic: diagnostic || null,
              draft: options.seedData || null,
            });
            setActiveScreen(APP_SCREENS.DIAGNOSTIC_FORM);
          }}
          onOpenWorkOrderForm={(workOrder, options = {}) => {
            setWorkOrderFormContext({
              workOrder: workOrder || null,
              draft: options.seedData || null,
            });
            setActiveScreen(APP_SCREENS.WORK_ORDER_FORM);
          }}
          viewState={diagnosticsViewState}
        />
      </>
    );
  }

  if (activeScreen === APP_SCREENS.DIAGNOSTIC_FORM) {
    return (
      <>
        <StatusBar style={isDarkMode ? "light" : "dark"} />
        <DiagnosticFormScreen
          initialDiagnostic={diagnosticFormContext.diagnostic}
          initialDraft={diagnosticFormContext.draft}
          onBack={() => setActiveScreen(APP_SCREENS.DIAGNOSTICS)}
          onSaved={(savedDiagnosticId) => {
            setDiagnosticsViewState({
              selectedDiagnosticId: savedDiagnosticId,
            });
            setActiveScreen(APP_SCREENS.DIAGNOSTICS);
          }}
          userProfile={userProfile}
        />
      </>
    );
  }

  if (activeScreen === APP_SCREENS.WORK_ORDERS) {
    return (
      <>
        <StatusBar style={isDarkMode ? "light" : "dark"} />
        <WorkOrdersScreen
          onBack={() => setActiveScreen(APP_SCREENS.HOME)}
          onOpenSparePartForm={(sparePart, options = {}) => {
            setSparePartFormContext({
              sparePart: sparePart || null,
              draft: options.seedData || null,
            });
            setActiveScreen(APP_SCREENS.SPARE_PART_FORM);
          }}
          onOpenWorkOrderForm={(workOrder, options = {}) => {
            setWorkOrderFormContext({
              workOrder: workOrder || null,
              draft: options.seedData || null,
            });
            setActiveScreen(APP_SCREENS.WORK_ORDER_FORM);
          }}
          userProfile={userProfile}
          viewState={workOrdersViewState}
        />
      </>
    );
  }

  if (activeScreen === APP_SCREENS.WORK_ORDER_FORM) {
    return (
      <>
        <StatusBar style={isDarkMode ? "light" : "dark"} />
        <WorkOrderFormScreen
          initialDraft={workOrderFormContext.draft}
          initialWorkOrder={workOrderFormContext.workOrder}
          onBack={() => setActiveScreen(APP_SCREENS.WORK_ORDERS)}
          onSaved={(savedWorkOrderId) => {
            setWorkOrdersViewState({
              selectedWorkOrderId: savedWorkOrderId,
            });
            setActiveScreen(APP_SCREENS.WORK_ORDERS);
          }}
        />
      </>
    );
  }

  if (activeScreen === APP_SCREENS.SPARE_PARTS) {
    return (
      <>
        <StatusBar style={isDarkMode ? "light" : "dark"} />
        <SparePartsScreen
          onBack={() => setActiveScreen(APP_SCREENS.HOME)}
          onOpenSparePartForm={(sparePart, options = {}) => {
            setSparePartFormContext({
              sparePart: sparePart || null,
              draft: options.seedData || null,
            });
            setActiveScreen(APP_SCREENS.SPARE_PART_FORM);
          }}
          viewState={sparePartsViewState}
        />
      </>
    );
  }

  if (activeScreen === APP_SCREENS.SPARE_PART_FORM) {
    return (
      <>
        <StatusBar style={isDarkMode ? "light" : "dark"} />
        <SparePartFormScreen
          initialDraft={sparePartFormContext.draft}
          initialSparePart={sparePartFormContext.sparePart}
          onBack={() => setActiveScreen(APP_SCREENS.SPARE_PARTS)}
          onSaved={(savedSparePartId) => {
            setSparePartsViewState({
              selectedSparePartId: savedSparePartId,
            });
            setActiveScreen(APP_SCREENS.SPARE_PARTS);
          }}
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
        onOpenDiagnostics={() => setActiveScreen(APP_SCREENS.DIAGNOSTICS)}
        onOpenSpareParts={() => setActiveScreen(APP_SCREENS.SPARE_PARTS)}
        onOpenTeamAccess={() => setActiveScreen(APP_SCREENS.TEAM_ACCESS)}
        onOpenWorkOrders={() => setActiveScreen(APP_SCREENS.WORK_ORDERS)}
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
