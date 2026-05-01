import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCiiySJE_C3QZEYJH4b9cC5LzCHa_OYexY",
  appId: "1:399899302875:android:d26fb3692b15c4591f25fe",
  authDomain: "auto-guardian-t.firebaseapp.com",
  messagingSenderId: "399899302875",
  projectId: "auto-guardian-t",
  storageBucket: "auto-guardian-t.firebasestorage.app",
};

const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

const firestore = getFirestore(firebaseApp);

export { firebaseApp, firestore };
