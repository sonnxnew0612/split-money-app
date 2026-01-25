// src/firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore"; // MỚI
import { getStorage } from "firebase/storage"; // MỚI

const firebaseConfig = {
  // ... giữ nguyên config cũ của bạn ...
  apiKey: "AIzaSyDB_ySp0TnnCzXDrMmSmbP-5PToRhywQuQ",
  authDomain: "split-money-app-ad6b7.firebaseapp.com",
  projectId: "split-money-app-ad6b7",
  storageBucket: "split-money-app-ad6b7.firebasestorage.app",
  messagingSenderId: "403282098425",
  appId: "1:403282098425:web:dfa4773f8c49f1602a8a28",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app); // Xuất db để dùng
export const storage = getStorage(app); // Xuất storage để lưu ảnh
