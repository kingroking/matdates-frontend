import { getAuth, setPersistence, indexedDBLocalPersistence, browserLocalPersistence } from "firebase/auth";
import { initializeApp } from "firebase/app";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAxbPlKJDRzXqkJcjD85wIn0Tdcc2WC7Fk",
  authDomain: "matdatesbjj.firebaseapp.com",
  databaseURL: "https://matdatesbjj-default-rtdb.firebaseio.com",
  projectId: "matdatesbjj",
  storageBucket: "matdatesbjj.firebasestorage.app",
  messagingSenderId: "207207897063",
  appId: "1:207207897063:web:8c744bd3a6d30d1e2e0f42",
  measurementId: "G-42DG20DP44"
};

const app = initializeApp(firebaseConfig);
export const db = (() => {
  if (typeof window !== "undefined") {
    try {
      return initializeFirestore(app, {
        localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
      });
    } catch {}
  }
  return getFirestore(app);
})();
export const auth = getAuth(app);
try {
  setPersistence(auth, indexedDBLocalPersistence).catch(() => {
    setPersistence(auth, browserLocalPersistence).catch(() => {});
  });
} catch {}
