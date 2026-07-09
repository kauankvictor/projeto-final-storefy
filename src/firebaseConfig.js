// Arquivo: src/firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  // Chave atualizada com o número 0 no final
  apiKey: "AIzaSyD6P79hPT2qJrr-GfmpozNESPGVLw074qI",
  authDomain: "projeto-storefy.firebaseapp.com",
  projectId: "projeto-storefy",
  storageBucket: "projeto-storefy.firebasestorage.app",
  messagingSenderId: "168849520454",
  appId: "1:168849520454:web:62f8d7022b0642edacd747"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);