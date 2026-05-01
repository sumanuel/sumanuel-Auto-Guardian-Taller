import AsyncStorage from "@react-native-async-storage/async-storage";
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  getReactNativePersistence,
  initializeAuth,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { Platform } from "react-native";

const firebaseConfig = {
  apiKey: "AIzaSyCiiySJE_C3QZEYJH4b9cC5LzCHa_OYexY",
  appId: "1:399899302875:android:d26fb3692b15c4591f25fe",
  authDomain: "auto-guardian-t.firebaseapp.com",
  messagingSenderId: "399899302875",
  projectId: "auto-guardian-t",
  storageBucket: "auto-guardian-t.firebasestorage.app",
};

const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

let auth;

if (Platform.OS === "web") {
  auth = getAuth(firebaseApp);
} else {
  try {
    auth = initializeAuth(firebaseApp, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (error) {
    auth = getAuth(firebaseApp);
  }
}

const firestore = getFirestore(firebaseApp);

export { auth, firebaseApp, firestore };
