import NetInfo from "@react-native-community/netinfo";
import { useEffect, useState } from "react";

function resolveOnline(state) {
  // isInternetReachable puede ser null mientras se calcula: se asume en línea.
  return state?.isConnected !== false && state?.isInternetReachable !== false;
}

// Consulta puntual, para decidir antes de intentar una escritura o lectura.
export async function isOnlineNow() {
  try {
    return resolveOnline(await NetInfo.fetch());
  } catch (error) {
    return true;
  }
}

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) =>
      setIsOnline(resolveOnline(state)),
    );

    return unsubscribe;
  }, []);

  return { isOnline };
}

export const OFFLINE_WRITE_MESSAGE =
  "Sin conexión a internet. Este cambio no se puede guardar ahora; inténtalo de nuevo cuando recuperes la señal.";
