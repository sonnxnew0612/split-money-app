// File: src/Login.jsx
import React, { useState } from "react";
import { auth } from "./firebaseConfig";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";

const Login = () => {
  // Biến này để chuyển đổi giữa màn hình "Chào mừng" và màn hình "Nhập liệu"
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
    <div
      style={{
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#f0f2f5",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          padding: "30px",
          background: "white",
          borderRadius: "12px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          width: "350px",
          textAlign: "center",
        }}
      >
        {/* LOGIC GIAO DIỆN: Kiểm tra biến showForm */}
        {!showForm ? (
          // --- MÀN HÌNH 1: CHÀO MỪNG ---
          <div>
            <h2 style={{ marginBottom: "10px", color: "#333" }}>
              Split Money App
            </h2>
            <p style={{ marginBottom: "30px", color: "#666" }}>
              Quản lý chi tiêu dễ dàng
            </p>

            {/* Đây là nút thay thế cho nút Google cũ */}
            <button
              onClick={() => setShowForm(true)}
              style={{
                width: "100%",
                padding: "12px",
                background: "#1877f2", // Màu xanh Facebook/Email
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
              }}
            >
              ✉️ Tiếp tục bằng Email
            </button>
          </div>
        ) : (
          // --- MÀN HÌNH 2: FORM NHẬP LIỆU ---
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              {/* Nút quay lại (Back) */}
              <button
                onClick={() => {
                  setShowForm(false);
                  setError("");
                }}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "18px",
                  marginRight: "10px",
                }}
                title="Quay lại"
              >
                ⬅
              </button>
              <h2 style={{ margin: 0, flex: 1, fontSize: "20px" }}>
                {isRegistering ? "Đăng Ký" : "Đăng Nhập"}
              </h2>
            </div>

            <form
              onSubmit={handleSubmit}
              style={{ display: "flex", flexDirection: "column", gap: "15px" }}
            >
              <input
                type="email"
                placeholder="Nhập Email (vd: ten@gmail.com)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  padding: "12px",
                  borderRadius: "6px",
                  border: "1px solid #ddd",
                  fontSize: "15px",
                }}
              />
              <input
                type="password"
                placeholder="Mật khẩu"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  padding: "12px",
                  borderRadius: "6px",
                  border: "1px solid #ddd",
                  fontSize: "15px",
                }}
              />

              {error && (
                <p
                  style={{ color: "red", fontSize: "14px", textAlign: "left" }}
                >
                  ⚠ {error}
                </p>
              )}

              <button
                type="submit"
                style={{
                  padding: "12px",
                  background: "#1877f2",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "bold",
                  fontSize: "16px",
                  marginTop: "10px",
                }}
              >
                {isRegistering ? "Xác nhận Đăng Ký" : "Xác nhận Đăng Nhập"}
              </button>
            </form>

            <p style={{ marginTop: "20px", fontSize: "14px" }}>
              {isRegistering ? "Đã có tài khoản? " : "Chưa có tài khoản? "}
              <span
                onClick={() => {
                  setIsRegistering(!isRegistering);
                  setError("");
                }}
                style={{
                  color: "#1877f2",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                {isRegistering ? "Đăng nhập ngay" : "Tạo mới"}
              </span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
