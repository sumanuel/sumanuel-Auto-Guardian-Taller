import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../services/firebase/config";
import {
  registerUserFromInvitation,
  sendPasswordRecovery,
  signInWithCredentials,
  signOutUserSession,
} from "../services/auth/authService";
import {
  getUserProfileByUid,
  touchUserProfileLogin,
} from "../services/auth/userProfiles";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [authReady, setAuthReady] = useState(false);
  const [authUser, setAuthUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [authBusy, setAuthBusy] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setAuthUser(nextUser);

      if (!nextUser) {
        setUserProfile(null);
        setAuthReady(true);
        return;
      }

      try {
        const profile = await getUserProfileByUid(nextUser.uid);
        setUserProfile(profile);

        if (profile) {
          await touchUserProfileLogin(nextUser.uid);
        }
      } catch (error) {
        console.error("Error loading user profile:", error);
        setUserProfile(null);
      } finally {
        setAuthReady(true);
      }
    });

    return unsubscribe;
  }, []);

  const signIn = async (credentials) => {
    setAuthBusy(true);
    try {
      await signInWithCredentials(credentials);
    } finally {
      setAuthBusy(false);
    }
  };

  const recoverPassword = async (email) => {
    setAuthBusy(true);
    try {
      await sendPasswordRecovery(email);
    } finally {
      setAuthBusy(false);
    }
  };

  const activateInvitation = async (payload) => {
    setAuthBusy(true);
    try {
      await registerUserFromInvitation(payload);
    } finally {
      setAuthBusy(false);
    }
  };

  const signOutUser = async () => {
    setAuthBusy(true);
    try {
      await signOutUserSession();
    } finally {
      setAuthBusy(false);
    }
  };

  const value = useMemo(
    () => ({
      activateInvitation,
      authBusy,
      authReady,
      authUser,
      recoverPassword,
      signIn,
      signOutUser,
      userProfile,
    }),
    [authBusy, authReady, authUser, userProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
