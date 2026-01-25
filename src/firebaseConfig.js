// src/firebaseConfig.js
import { initializeApp } from "firebase/app";
import { Capacitor } from "@capacitor/core";
import {
  getAuth,
  initializeAuth,
  browserLocalPersistence,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  // ... giữ nguyên config cũ của bạn ...
  apiKey: "AIzaSyDB_ySp0TnnCzXDrMmSmbP-5PToRhywQuQ",
  authDomain: "split-money-app-ad6b7.firebaseapp.com",
  projectId: "split-money-app-ad6b7",
  storageBucket: "split-money-app-ad6b7.firebasestorage.app",
  messagingSenderId: "403282098425",
  appId: "1:403282098425:web:dfa4773f8c49f1602a8a28",
};

// 1. Khởi tạo App
const app = initializeApp(firebaseConfig);

// 2. Khởi tạo Auth với điều kiện kiểm tra thiết bị [FIX QUAN TRỌNG CHO IPHONE]
let auth;

if (Capacitor.isNativePlatform()) {
  // Nếu là Mobile (iOS/Android): Dùng LocalStorage để tránh lỗi treo IndexedDB
  auth = initializeAuth(app, {
    persistence: browserLocalPersistence,
  });
} else {
  // Nếu là Web (Desktop/iPad Safari): Dùng mặc định (IndexedDB)
  auth = getAuth(app);
}

// 3. Khởi tạo DB & Storage
const db = getFirestore(app);
const storage = getStorage(app);

// 4. Xuất ra để dùng ở các file khác
export { auth, db, storage };
