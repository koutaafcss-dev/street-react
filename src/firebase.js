import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBnbCEsGSpFuo5lWpfXD5006-WEwnBXzfQ",
  authDomain: "m-map-fdb64.firebaseapp.com",
  projectId: "m-map-fdb64",
  storageBucket: "m-map-fdb64.firebasestorage.app",
  messagingSenderId: "928191964466",
  appId: "1:928191964466:web:a909b42be92c791008a32b",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);