// src/firebaseConfig.js
import { initializeApp } from "firebase/app";
import { Capacitor } from "@capacitor/core";
import {
  getAuth,
  initializeAuth,
  browserLocalPersistence,
} from "firebase/auth";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDB_ySp0TnnCzXDrMmSmbP-5PToRhywQuQ",
  authDomain: "split-money-app-ad6b7.firebaseapp.com",
  projectId: "split-money-app-ad6b7",
  storageBucket: "split-money-app-ad6b7.firebasestorage.app",
  messagingSenderId: "403282098425",
  appId: "1:403282098425:web:dfa4773f8c49f1602a8a28",
};

// 1. Khởi tạo App và Export luôn
export const app = initializeApp(firebaseConfig);

// 2. Khởi tạo Auth và Export trực tiếp (Cách này giúp Vite không bao giờ bị lỗi mất export)
export const auth = Capacitor.isNativePlatform()
  ? initializeAuth(app, { persistence: browserLocalPersistence })
  : getAuth(app);

// 3. Khởi tạo Database với Offline Cache siêu tốc và Export
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});

// 4. Khởi tạo Storage và Export
export const storage = getStorage(app);
