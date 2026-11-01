import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);