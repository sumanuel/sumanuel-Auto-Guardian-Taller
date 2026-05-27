import { useEffect, useMemo, useState } from "react";
import { Alert, BackHandler, StyleSheet, View } from "react-native";
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
import WorkshopMoreScreen from "./src/screens/WorkshopMoreScreen";
import VehicleFormScreen from "./src/screens/VehicleFormScreen";
import WorkshopTabBar from "./src/components/common/WorkshopTabBar";
import { findActiveDiagnosticByVehicleId } from "./src/services/diagnostics/diagnosticService";

const APP_SCREENS = {
  HOME: "home",
  CLIENTS: "clients",
  CLIENT_FORM: "client-form",
  VEHICLE_FORM: "vehicle-form",
  DIAGNOSTICS: "diagnostics",
  DIAGNOSTIC_FORM: "diagnostic-form",
  WORK_ORDERS: "work-orders",
  WORK_ORDER_FORM: "work-order-form",
  SPARE_PARTS: "spare-parts",
  SPARE_PART_FORM: "spare-part-form",
  TEAM_ACCESS: "team-access",
  MORE: "more",
};

const ROOT_TABS = new Set([
  APP_SCREENS.HOME,
  APP_SCREENS.CLIENTS,
  APP_SCREENS.DIAGNOSTICS,
  APP_SCREENS.WORK_ORDERS,
  APP_SCREENS.MORE,
]);

function AppContent() {
  const { isDarkMode, toggleTheme } = useTheme();
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
  const [vehicleFormContext, setVehicleFormContext] = useState({
    client: null,
    vehicle: null,
  });
  const [clientsViewState, setClientsViewState] = useState({
    selectedClientId: null,
    screenMode: "list",
  });
  const [diagnosticFormContext, setDiagnosticFormContext] = useState({
    diagnostic: null,
    draft: null,
    returnTo: APP_SCREENS.DIAGNOSTICS,
    clientId: null,
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
    selectedWorkOrderId: null,
    returnTo: APP_SCREENS.MORE,
  });

  const activeTab = useMemo(() => {
    if (ROOT_TABS.has(activeScreen)) {
      return activeScreen;
    }

    if (
      activeScreen === APP_SCREENS.CLIENT_FORM ||
      activeScreen === APP_SCREENS.VEHICLE_FORM
    ) {
      return APP_SCREENS.CLIENTS;
    }

    if (activeScreen === APP_SCREENS.DIAGNOSTIC_FORM) {
      return APP_SCREENS.DIAGNOSTICS;
    }

    if (activeScreen === APP_SCREENS.WORK_ORDER_FORM) {
      return APP_SCREENS.WORK_ORDERS;
    }

    return APP_SCREENS.MORE;
  }, [activeScreen]);

  const profileStatus = userProfile?.status;

  useEffect(() => {
    setActiveScreen(APP_SCREENS.HOME);
    setClientFormContext({
      client: null,
      returnTo: "list",
    });
    setVehicleFormContext({
      client: null,
      vehicle: null,
    });
    setClientsViewState({
      selectedClientId: null,
      screenMode: "list",
    });
    setDiagnosticFormContext({
      diagnostic: null,
      draft: null,
      returnTo: APP_SCREENS.DIAGNOSTICS,
      clientId: null,
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
      selectedWorkOrderId: null,
      returnTo: APP_SCREENS.MORE,
    });
  }, [authUser?.uid]);

  useEffect(() => {
    if (!authReady || !authUser || !userProfile || profileStatus !== "active") {
      return undefined;
    }

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (activeScreen === APP_SCREENS.CLIENT_FORM) {
          setClientsViewState({ selectedClientId: null, screenMode: "list" });
          setActiveScreen(APP_SCREENS.CLIENTS);
          return true;
        }

        if (activeScreen === APP_SCREENS.VEHICLE_FORM) {
          setClientsViewState({
            selectedClientId:
              vehicleFormContext.client?.id ||
              vehicleFormContext.client?.refId ||
              null,
            screenMode: "detail",
          });
          setActiveScreen(APP_SCREENS.CLIENTS);
          return true;
        }

        if (activeScreen === APP_SCREENS.DIAGNOSTIC_FORM) {
          if (diagnosticFormContext.returnTo === APP_SCREENS.CLIENTS) {
            setClientsViewState({
              selectedClientId: diagnosticFormContext.clientId,
              screenMode: "detail",
            });
            setActiveScreen(APP_SCREENS.CLIENTS);
            return true;
          }

          setActiveScreen(APP_SCREENS.DIAGNOSTICS);
          return true;
        }

        if (activeScreen === APP_SCREENS.WORK_ORDER_FORM) {
          setActiveScreen(APP_SCREENS.WORK_ORDERS);
          return true;
        }

        if (activeScreen === APP_SCREENS.SPARE_PART_FORM) {
          setActiveScreen(APP_SCREENS.SPARE_PARTS);
          return true;
        }

        if (activeScreen === APP_SCREENS.TEAM_ACCESS) {
          setActiveScreen(APP_SCREENS.MORE);
          return true;
        }

        if (activeScreen === APP_SCREENS.SPARE_PARTS) {
          setActiveScreen(sparePartsViewState.returnTo || APP_SCREENS.MORE);
          return true;
        }

        if (activeScreen === APP_SCREENS.CLIENTS) {
          setClientsViewState({ selectedClientId: null, screenMode: "list" });
          setActiveScreen(APP_SCREENS.HOME);
          return true;
        }

        if (
          activeScreen === APP_SCREENS.DIAGNOSTICS ||
          activeScreen === APP_SCREENS.WORK_ORDERS ||
          activeScreen === APP_SCREENS.MORE
        ) {
          setActiveScreen(APP_SCREENS.HOME);
          return true;
        }

        return false;
      },
    );

    return () => subscription.remove();
  }, [
    activeScreen,
    authReady,
    authUser,
    profileStatus,
    userProfile,
    diagnosticFormContext.clientId,
    diagnosticFormContext.returnTo,
    sparePartsViewState.returnTo,
    vehicleFormContext.client,
  ]);

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

  const handleTabChange = (nextTab) => {
    if (nextTab === APP_SCREENS.HOME) {
      setActiveScreen(APP_SCREENS.HOME);
      return;
    }

    if (nextTab === APP_SCREENS.CLIENTS) {
      setClientsViewState({ selectedClientId: null, screenMode: "list" });
      setActiveScreen(APP_SCREENS.CLIENTS);
      return;
    }

    if (nextTab === APP_SCREENS.DIAGNOSTICS) {
      setDiagnosticsViewState({ selectedDiagnosticId: null });
      setActiveScreen(APP_SCREENS.DIAGNOSTICS);
      return;
    }

    if (nextTab === APP_SCREENS.WORK_ORDERS) {
      setWorkOrdersViewState({ selectedWorkOrderId: null });
      setActiveScreen(APP_SCREENS.WORK_ORDERS);
      return;
    }

    setSparePartsViewState({
      selectedSparePartId: null,
      selectedWorkOrderId: null,
      returnTo: APP_SCREENS.MORE,
    });
    setActiveScreen(APP_SCREENS.MORE);
  };

  const renderAuthenticatedScreen = () => {
    if (activeScreen === APP_SCREENS.CLIENTS) {
      return (
        <ClientsScreen
          onBack={() => setActiveScreen(APP_SCREENS.HOME)}
          onOpenClientForm={(client, options = {}) => {
            setClientFormContext({
              client: client || null,
              returnTo: options.returnTo || "list",
            });
            setActiveScreen(APP_SCREENS.CLIENT_FORM);
          }}
          onOpenVehicleForm={(client, vehicle) => {
            setVehicleFormContext({
              client: client || null,
              vehicle: vehicle || null,
            });
            setActiveScreen(APP_SCREENS.VEHICLE_FORM);
          }}
          onOpenDiagnosticForm={async (diagnostic, options = {}) => {
            try {
              const seedData = options.seedData || null;

              if (!diagnostic && seedData?.vehicleId) {
                const activeDiagnostic = await findActiveDiagnosticByVehicleId(
                  seedData.vehicleId,
                );

                if (activeDiagnostic) {
                  Alert.alert(
                    "Diagnosticos",
                    "Esta unidad ya tiene un diagnostico abierto. Se abrira ese mismo registro para editarlo.",
                  );

                  setDiagnosticFormContext({
                    diagnostic: activeDiagnostic,
                    draft: seedData,
                    returnTo: APP_SCREENS.CLIENTS,
                    clientId:
                      seedData.clientId || activeDiagnostic.clientId || null,
                  });
                  setActiveScreen(APP_SCREENS.DIAGNOSTIC_FORM);
                  return;
                }
              }

              setDiagnosticFormContext({
                diagnostic: diagnostic || null,
                draft: seedData,
                returnTo: APP_SCREENS.CLIENTS,
                clientId: seedData?.clientId || diagnostic?.clientId || null,
              });
              setActiveScreen(APP_SCREENS.DIAGNOSTIC_FORM);
            } catch (error) {
              Alert.alert(
                "Diagnosticos",
                error?.message ||
                  "No se pudo preparar el diagnostico para esta unidad.",
              );
            }
          }}
          userProfile={userProfile}
          viewState={clientsViewState}
        />
      );
    }

    if (activeScreen === APP_SCREENS.CLIENT_FORM) {
      return (
        <ClientFormScreen
          initialClient={clientFormContext.client}
          onBack={() => {
            setClientsViewState({ selectedClientId: null, screenMode: "list" });
            setActiveScreen(APP_SCREENS.CLIENTS);
          }}
          onSaved={() => {
            setClientsViewState({ selectedClientId: null, screenMode: "list" });
            setActiveScreen(APP_SCREENS.CLIENTS);
          }}
          userProfile={userProfile}
        />
      );
    }

    if (activeScreen === APP_SCREENS.VEHICLE_FORM) {
      return (
        <VehicleFormScreen
          initialClient={vehicleFormContext.client}
          initialVehicle={vehicleFormContext.vehicle}
          onBack={() => {
            setClientsViewState({
              selectedClientId:
                vehicleFormContext.client?.id ||
                vehicleFormContext.client?.refId ||
                null,
              screenMode: "detail",
            });
            setActiveScreen(APP_SCREENS.CLIENTS);
          }}
          onSaved={() => {
            setClientsViewState({
              selectedClientId:
                vehicleFormContext.client?.id ||
                vehicleFormContext.client?.refId,
              screenMode: "detail",
            });
            setActiveScreen(APP_SCREENS.CLIENTS);
          }}
        />
      );
    }

    if (activeScreen === APP_SCREENS.DIAGNOSTICS) {
      return (
        <DiagnosticsScreen
          onBack={() => setActiveScreen(APP_SCREENS.HOME)}
          onOpenDiagnosticForm={(diagnostic, options = {}) => {
            setDiagnosticFormContext({
              diagnostic: diagnostic || null,
              draft: options.seedData || null,
              returnTo: APP_SCREENS.DIAGNOSTICS,
              clientId:
                options.seedData?.clientId || diagnostic?.clientId || null,
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
      );
    }

    if (activeScreen === APP_SCREENS.DIAGNOSTIC_FORM) {
      return (
        <DiagnosticFormScreen
          initialDiagnostic={diagnosticFormContext.diagnostic}
          initialDraft={diagnosticFormContext.draft}
          onBack={() => {
            if (diagnosticFormContext.returnTo === APP_SCREENS.CLIENTS) {
              setClientsViewState({
                selectedClientId: diagnosticFormContext.clientId,
                screenMode: "detail",
              });
              setActiveScreen(APP_SCREENS.CLIENTS);
              return;
            }

            setActiveScreen(APP_SCREENS.DIAGNOSTICS);
          }}
          onSaved={(savedDiagnosticId) => {
            if (diagnosticFormContext.returnTo === APP_SCREENS.CLIENTS) {
              setClientsViewState({
                selectedClientId: diagnosticFormContext.clientId,
                screenMode: "detail",
              });
              setActiveScreen(APP_SCREENS.CLIENTS);
              return;
            }

            setDiagnosticsViewState({
              selectedDiagnosticId: savedDiagnosticId,
            });
            setActiveScreen(APP_SCREENS.DIAGNOSTICS);
          }}
          userProfile={userProfile}
        />
      );
    }

    if (activeScreen === APP_SCREENS.WORK_ORDERS) {
      return (
        <WorkOrdersScreen
          onBack={() => setActiveScreen(APP_SCREENS.HOME)}
          onOpenSpareParts={(workOrder) => {
            setWorkOrdersViewState({
              selectedWorkOrderId: workOrder?.id || null,
            });
            setSparePartsViewState({
              selectedSparePartId: null,
              selectedWorkOrderId: workOrder?.id || null,
              returnTo: APP_SCREENS.WORK_ORDERS,
            });
            setActiveScreen(APP_SCREENS.SPARE_PARTS);
          }}
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
      );
    }

    if (activeScreen === APP_SCREENS.WORK_ORDER_FORM) {
      return (
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
      );
    }

    if (activeScreen === APP_SCREENS.SPARE_PARTS) {
      return (
        <SparePartsScreen
          onBack={() =>
            setActiveScreen(sparePartsViewState.returnTo || APP_SCREENS.MORE)
          }
          onOpenSparePartForm={(sparePart, options = {}) => {
            setSparePartFormContext({
              sparePart: sparePart || null,
              draft: options.seedData || null,
            });
            setActiveScreen(APP_SCREENS.SPARE_PART_FORM);
          }}
          userProfile={userProfile}
          viewState={sparePartsViewState}
        />
      );
    }

    if (activeScreen === APP_SCREENS.SPARE_PART_FORM) {
      return (
        <SparePartFormScreen
          initialDraft={sparePartFormContext.draft}
          initialSparePart={sparePartFormContext.sparePart}
          onBack={() => setActiveScreen(APP_SCREENS.SPARE_PARTS)}
          onSaved={(savedSparePartId) => {
            setSparePartsViewState((current) => ({
              ...current,
              selectedSparePartId: savedSparePartId,
            }));
            setActiveScreen(APP_SCREENS.SPARE_PARTS);
          }}
        />
      );
    }

    if (activeScreen === APP_SCREENS.TEAM_ACCESS) {
      return (
        <TeamAccessScreen
          onBack={() => setActiveScreen(APP_SCREENS.MORE)}
          userProfile={userProfile}
        />
      );
    }

    if (activeScreen === APP_SCREENS.MORE) {
      return (
        <WorkshopMoreScreen
          onBack={() => setActiveScreen(APP_SCREENS.HOME)}
          onOpenSpareParts={() => {
            setSparePartsViewState({
              selectedSparePartId: null,
              selectedWorkOrderId: null,
              returnTo: APP_SCREENS.MORE,
            });
            setActiveScreen(APP_SCREENS.SPARE_PARTS);
          }}
          onOpenTeamAccess={() => setActiveScreen(APP_SCREENS.TEAM_ACCESS)}
          onSignOut={signOutUser}
          onToggleTheme={toggleTheme}
          themeLabel={
            isDarkMode ? "Cambiar a modo claro" : "Cambiar a modo oscuro"
          }
        />
      );
    }

    return (
      <WorkshopHomeScreen
        onOpenClients={() => setActiveScreen(APP_SCREENS.CLIENTS)}
        onOpenDiagnostics={() => setActiveScreen(APP_SCREENS.DIAGNOSTICS)}
        onOpenSpareParts={() => {
          setSparePartsViewState({
            selectedSparePartId: null,
            selectedWorkOrderId: null,
            returnTo: APP_SCREENS.MORE,
          });
          setActiveScreen(APP_SCREENS.SPARE_PARTS);
        }}
        onOpenTeamAccess={() => setActiveScreen(APP_SCREENS.TEAM_ACCESS)}
        onOpenWorkOrders={() => setActiveScreen(APP_SCREENS.WORK_ORDERS)}
        onSignOut={signOutUser}
        userProfile={userProfile}
      />
    );
  };

  return (
    <>
      <StatusBar style={isDarkMode ? "light" : "dark"} />
      <View style={styles.shell}>
        <View style={styles.content}>{renderAuthenticatedScreen()}</View>
        <WorkshopTabBar activeTab={activeTab} onChange={handleTabChange} />
      </View>
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

const styles = StyleSheet.create({
  shell: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
