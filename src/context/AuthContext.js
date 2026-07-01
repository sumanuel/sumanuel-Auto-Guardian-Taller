import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../services/firebase/config";
import { USER_ROLES } from "../constants/accessControl";
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
  renameWorkshop,
  resolveUserWorkshopContext,
  updateWorkshop,
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
  const [requiresWorkshopSetup, setRequiresWorkshopSetup] = useState(false);

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

    let nextContext = await resolveUserWorkshopContext({
      uid: nextUser.uid,
      fullName: profile.fullName,
      email: profile.email,
      phone: profile.phone,
      preferredWorkshopId,
      defaultWorkshopId: profile.defaultWorkshopId,
      membershipStatus: profile.status,
    });

    if (nextContext.requiresWorkshopSetup || !nextContext.memberships.length) {
      setRequiresWorkshopSetup(true);
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

    const { activeMembership: selectedMembership, activeWorkshop: nextWorkshop } = nextContext;

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

    setMemberships(nextContext.memberships);
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
      memberships: nextContext.memberships,
      activeWorkshopId: selectedMembership?.workshopId || null,
      activeWorkshop: nextWorkshop,
    };
  };

  const refreshWorkshopContext = async (preferredWorkshopId) => {
    if (!auth.currentUser?.uid) {
      return null;
    }

    let profile;

    try {
      profile = await getUserProfileByUid(auth.currentUser.uid);
    } catch (error) {
      console.error("Error loading own user profile document:", error);
      throw error;
    }

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

    if (!nextContext || nextContext.requiresWorkshopSetup === undefined) {
      setRequiresWorkshopSetup(false);
    }

    setUserProfile(nextContext?.profile || profile);
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
        let profile = null;

        try {
          profile = await getUserProfileByUid(nextUser.uid);
        } catch (error) {
          console.error("Error loading own user profile document:", error);
          throw error;
        }

        try {
          const nextPendingInvitation = await getPendingInvitationByEmail(
            nextUser.email || "",
          );
          setPendingInvitation(nextPendingInvitation);
        } catch (error) {
          console.error("Error loading pending invitation:", error);
          setPendingInvitation(null);
        }

        if (!profile) {
          setUserProfile(null);
          setMemberships([]);
          setActiveWorkshopId(null);
          setActiveWorkshop(null);
          clearActiveWorkshopSession();
        } else {
          try {
            const nextContext = await applyWorkshopContext({
              profile,
              nextUser,
            });
            setUserProfile(nextContext.profile);
          } catch (error) {
            console.error("Error loading workshop context:", error);
            setUserProfile(profile);
            setMemberships([]);
            setActiveWorkshopId(null);
            setActiveWorkshop(null);
            clearActiveWorkshopSession();
          }

          try {
            await touchUserProfileLogin(nextUser.uid);
          } catch (error) {
            console.error("Error updating last login timestamp:", error);
          }
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

  const createWorkshop = async ({} = {}) => {
    throw new Error(
      "Esta version opera con un solo taller y ya no permite crear talleres nuevos.",
    );
  };

  const renameActiveWorkshop = async (name) => {
    if (!activeWorkshopId) {
      throw new Error("No hay un taller activo para renombrar.");
    }

    setAuthBusy(true);

    try {
      const workshop = await renameWorkshop(activeWorkshopId, name);
      await refreshWorkshopContext(activeWorkshopId);
      return workshop;
    } finally {
      setAuthBusy(false);
    }
  };

  const updateActiveWorkshop = async ({
    name,
    phone,
    email,
    address,
    rif,
    logoUrl,
    commercialNotes,
  } = {}) => {
    if (!activeWorkshopId) {
      throw new Error("No hay un taller activo para actualizar.");
    }

    setAuthBusy(true);

    try {
      const workshop = await updateWorkshop(activeWorkshopId, {
        name,
        phone,
        email,
        address,
        rif,
        logoUrl,
        commercialNotes,
      });
      await refreshWorkshopContext(activeWorkshopId);
      return workshop;
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
      requiresWorkshopSetup,
      createWorkshop,
      refreshWorkshopContext,
      renameActiveWorkshop,
      updateActiveWorkshop,
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
      requiresWorkshopSetup,
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
