import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../services/firebase/config";
import {
  acceptPendingInvitationForCurrentUser,
  registerUserFromInvitation,
  sendPasswordRecovery,
  signInWithCredentials,
  signUpWithProfile,
  signOutUserSession,
} from "../services/auth/authService";
import { getPendingInvitationByEmail } from "../services/auth/invitations";
import {
  getUserProfileByUid,
  touchUserProfileLogin,
  updateUserProfileWorkshopContext,
} from "../services/auth/userProfiles";
import {
  clearActiveWorkshopSession,
  setActiveWorkshopSession,
} from "../services/workshops/workshopSession";
import {
  ensurePersonalWorkshopForUser,
  getWorkshopById,
  listUserWorkshopMemberships,
} from "../services/workshops/workshopService";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [authReady, setAuthReady] = useState(false);
  const [authUser, setAuthUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [memberships, setMemberships] = useState([]);
  const [activeWorkshopId, setActiveWorkshopId] = useState(null);
  const [activeWorkshop, setActiveWorkshop] = useState(null);
  const [pendingInvitation, setPendingInvitation] = useState(null);
  const [authBusy, setAuthBusy] = useState(false);

  const applyWorkshopContext = async ({
    profile,
    nextUser,
    preferredWorkshopId,
  }) => {
    if (!profile || !nextUser?.uid) {
      setMemberships([]);
      setActiveWorkshopId(null);
      setActiveWorkshop(null);
      clearActiveWorkshopSession();
      return {
        profile,
        memberships: [],
        activeWorkshopId: null,
        activeWorkshop: null,
      };
    }

    let resolvedProfile = profile;
    let nextMemberships = await listUserWorkshopMemberships(nextUser.uid);

    if (!nextMemberships.length) {
      const bootstrapResult = await ensurePersonalWorkshopForUser({
        uid: nextUser.uid,
        fullName: profile.fullName,
        email: profile.email,
      });

      nextMemberships = [bootstrapResult.membership];
      await updateUserProfileWorkshopContext(nextUser.uid, {
        defaultWorkshopId: bootstrapResult.workshop?.id || null,
        role: bootstrapResult.membership?.role || profile.role,
      });
      resolvedProfile = {
        ...resolvedProfile,
        defaultWorkshopId: bootstrapResult.workshop?.id || null,
        role: bootstrapResult.membership?.role || profile.role,
      };
    }

    const selectedMembership =
      nextMemberships.find(
        (membership) => membership.workshopId === preferredWorkshopId,
      ) ||
      nextMemberships.find(
        (membership) =>
          membership.workshopId === resolvedProfile.defaultWorkshopId,
      ) ||
      nextMemberships[0] ||
      null;

    const nextWorkshop = selectedMembership
      ? await getWorkshopById(selectedMembership.workshopId)
      : null;

    if (
      selectedMembership &&
      (resolvedProfile.defaultWorkshopId !== selectedMembership.workshopId ||
        resolvedProfile.role !== selectedMembership.role)
    ) {
      await updateUserProfileWorkshopContext(nextUser.uid, {
        defaultWorkshopId: selectedMembership.workshopId,
        role: selectedMembership.role,
      });
      resolvedProfile = {
        ...resolvedProfile,
        defaultWorkshopId: selectedMembership.workshopId,
        role: selectedMembership.role,
      };
    }

    setMemberships(nextMemberships);
    setActiveWorkshopId(selectedMembership?.workshopId || null);
    setActiveWorkshop(nextWorkshop);
    setActiveWorkshopSession(
      selectedMembership
        ? {
            workshopId: selectedMembership.workshopId,
            workshopName: nextWorkshop?.name || selectedMembership.workshopName,
            role: selectedMembership.role,
          }
        : null,
    );

    return {
      profile: resolvedProfile,
      memberships: nextMemberships,
      activeWorkshopId: selectedMembership?.workshopId || null,
      activeWorkshop: nextWorkshop,
    };
  };

  const refreshWorkshopContext = async (preferredWorkshopId) => {
    if (!auth.currentUser?.uid) {
      return null;
    }

    const profile = await getUserProfileByUid(auth.currentUser.uid);

    if (!profile) {
      setUserProfile(null);
      setMemberships([]);
      setActiveWorkshopId(null);
      setActiveWorkshop(null);
      clearActiveWorkshopSession();
      return null;
    }

    const nextContext = await applyWorkshopContext({
      profile,
      nextUser: auth.currentUser,
      preferredWorkshopId,
    });

    setUserProfile(nextContext.profile);
    return nextContext;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setAuthUser(nextUser);

      if (!nextUser) {
        setUserProfile(null);
        setMemberships([]);
        setActiveWorkshopId(null);
        setActiveWorkshop(null);
        setPendingInvitation(null);
        clearActiveWorkshopSession();
        setAuthReady(true);
        return;
      }

      try {
        const profile = await getUserProfileByUid(nextUser.uid);
        const nextPendingInvitation = await getPendingInvitationByEmail(
          nextUser.email || "",
        );

        setPendingInvitation(nextPendingInvitation);

        if (!profile) {
          setUserProfile(null);
          setMemberships([]);
          setActiveWorkshopId(null);
          setActiveWorkshop(null);
          clearActiveWorkshopSession();
        } else {
          const nextContext = await applyWorkshopContext({
            profile,
            nextUser,
          });
          setUserProfile(nextContext.profile);
          await touchUserProfileLogin(nextUser.uid);
        }
      } catch (error) {
        console.error("Error loading user profile:", error);
        setUserProfile(null);
        setMemberships([]);
        setActiveWorkshopId(null);
        setActiveWorkshop(null);
        setPendingInvitation(null);
        clearActiveWorkshopSession();
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

  const signUp = async (payload) => {
    setAuthBusy(true);
    try {
      await signUpWithProfile(payload);
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

  const acceptPendingInvitation = async (payload) => {
    setAuthBusy(true);
    try {
      const result = await acceptPendingInvitationForCurrentUser(payload);
      await refreshWorkshopContext(result.invitation?.workshopId);
      setPendingInvitation(null);

      if (result.profile?.uid) {
        await touchUserProfileLogin(result.profile.uid);
      }

      return result;
    } finally {
      setAuthBusy(false);
    }
  };

  const switchWorkshop = async (workshopId) => {
    setAuthBusy(true);

    try {
      const selectedMembership = memberships.find(
        (membership) => membership.workshopId === workshopId,
      );

      if (!auth.currentUser?.uid || !selectedMembership) {
        throw new Error("No se pudo cambiar al taller seleccionado.");
      }

      await updateUserProfileWorkshopContext(auth.currentUser.uid, {
        defaultWorkshopId: selectedMembership.workshopId,
        role: selectedMembership.role,
      });

      await refreshWorkshopContext(selectedMembership.workshopId);
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
      acceptPendingInvitation,
      activeWorkshop,
      activeWorkshopId,
      authBusy,
      authReady,
      authUser,
      memberships,
      pendingInvitation,
      refreshWorkshopContext,
      recoverPassword,
      signIn,
      signUp,
      signOutUser,
      switchWorkshop,
      userProfile,
    }),
    [
      activeWorkshop,
      activeWorkshopId,
      authBusy,
      authReady,
      authUser,
      memberships,
      pendingInvitation,
      userProfile,
    ],
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
