// File: src/Login.jsx
import React, { useState } from "react";
import { auth } from "./firebaseConfig";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { Mail, Lock, ArrowLeft } from "lucide-react"; // Đảm bảo đã cài lucide-react

const Login = () => {
  const [showForm, setShowForm] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
        alert("Đăng ký thành công! Đã tự động đăng nhập.");
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      let msg = err.message;
      if (err.code === "auth/invalid-email") msg = "Email sai định dạng.";
      if (
        err.code === "auth/user-not-found" ||
        err.code === "auth/wrong-password" ||
        err.code === "auth/invalid-credential"
      )
        msg = "Sai tài khoản hoặc mật khẩu.";
      if (err.code === "auth/email-already-in-use")
        msg = "Email này đã được sử dụng.";
      if (err.code === "auth/weak-password")
        msg = "Mật khẩu phải trên 6 ký tự.";
      setError(msg);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans p-4">
      <div className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.08)] w-full max-w-sm p-8 text-center relative overflow-hidden">
        {/* Decorative background blur */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-indigo-200 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-violet-200 rounded-full blur-3xl opacity-50 pointer-events-none"></div>

        {!showForm ? (
          <div className="relative z-10 py-4">
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-lg shadow-indigo-200 text-white text-3xl font-bold">
              SM
            </div>
            <h2 className="text-2xl font-extrabold text-slate-800 mb-2">
              Split Money
            </h2>
            <p className="text-slate-500 mb-10 text-sm">
              Cưa đôi hóa đơn, nhân đôi niềm vui
            </p>

            <button
              onClick={() => setShowForm(true)}
              className="w-full py-4 bg-slate-800 text-white rounded-2xl font-bold text-base hover:bg-slate-700 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg"
            >
              <Mail size={18} /> Bắt đầu với Email
            </button>
          </div>
        ) : (
          <div className="relative z-10">
            <div className="flex items-center mb-8 relative">
              <button
                onClick={() => {
                  setShowForm(false);
                  setError("");
                }}
                className="absolute left-0 p-2 bg-slate-100 text-slate-600 rounded-full hover:bg-slate-200 transition-colors"
              >
                <ArrowLeft size={18} />
              </button>
              <h2 className="w-full text-xl font-bold text-slate-800 text-center">
                {isRegistering ? "Tạo tài khoản" : "Đăng nhập"}
              </h2>
            </div>

            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-4 text-left"
            >
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="hello@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block">
                  Mật khẩu
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                />
              </div>

              {error && (
                <div className="bg-red-50 text-red-500 text-xs font-bold p-3 rounded-xl mt-2 text-center">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-4 bg-gradient-to-r from-indigo-500 to-violet-500 text-white rounded-2xl font-bold text-base hover:shadow-lg hover:shadow-indigo-200 transition-all active:scale-95 mt-4"
              >
                {isRegistering ? "Đăng ký ngay" : "Đăng nhập"}
              </button>
            </form>

            <p className="mt-8 text-sm text-slate-500">
              {isRegistering ? "Đã có tài khoản? " : "Chưa có tài khoản? "}
              <button
                onClick={() => {
                  setIsRegistering(!isRegistering);
                  setError("");
                }}
                className="text-indigo-600 font-bold hover:underline outline-none"
              >
                {isRegistering ? "Đăng nhập" : "Tạo mới"}
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
