// src/firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth"; // Thêm dòng này

const firebaseConfig = {
  apiKey: "AIzaSyDB_ySp0TnnCzXDrMmSmbP-5PToRhywQuQ",
  authDomain: "split-money-app-ad6b7.firebaseapp.com",
  projectId: "split-money-app-ad6b7",
  storageBucket: "split-money-app-ad6b7.firebasestorage.app",
  messagingSenderId: "403282098425",
  appId: "1:403282098425:web:dfa4773f8c49f1602a8a28"
};

const app = initializeApp(firebaseConfig);

// Xuất các biến này ra để sử dụng ở App.jsx
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();