// Arquivo: src/firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD6P79hPT2qJrr-GfmpozNESPGVLwO74qI",
  authDomain: "projeto-storefy.firebaseapp.com",
  projectId: "projeto-storefy",
  storageBucket: "projeto-storefy.firebasestorage.app",
  messagingSenderId: "168849520454",
  appId: "1:168849520454:web:62f8d7022b0642edacd747"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);