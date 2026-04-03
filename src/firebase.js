import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBnbCEsGSpFuo5lWpfXD5006-WEwnBXzfQ",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "m-map-fdb64.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "m-map-fdb64",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "m-map-fdb64.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "928191964466",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:928191964466:web:a909b42be92c791008a32b",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const functions = getFunctions(app);