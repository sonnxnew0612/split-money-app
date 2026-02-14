import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Users,
  Trash2,
  History,
  LayoutDashboard,
  ArrowRightLeft,
  Wallet,
  Edit2,
  Plus,
  X,
  Check,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  ChevronLeft,
  Circle,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Home,
  LogIn,
  LogOut,
  Cloud,
  Mail,
  Lock,
  Bell,
  Camera,
  MessageSquare,
  Image as ImageIcon,
  Send,
  Share2,
  QrCode,
  Settings,
  Eye,
  EyeOff,
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { format } from "date-fns";
import { auth } from "./firebaseConfig";
import {
  signOut,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  sendPasswordResetEmail,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";
import { PushNotifications } from "@capacitor/push-notifications";
import { Capacitor } from "@capacitor/core";
import {
  getFirestore,
  doc,
  onSnapshot,
  updateDoc,
  setDoc,
  getDoc,
  deleteDoc,
  arrayUnion,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "./firebaseConfig"; // Import từ file config
import { QRCodeSVG } from "qrcode.react";
import { motion, AnimatePresence } from "framer-motion";

// --- CẤU HÌNH API CLOUDFLARE ---
const API_URL = "https://split-money-api.sonnx-pod.workers.dev";

// Thêm hàm này ở đầu file App.jsx
const formatNumber = (num) => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

// --- UTILS ---
const formatCurrency = (amount) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    amount,
  );

// --- HÀM MỚI: RÚT GỌN SỐ TIỀN (1.5 Tr, 2 Tỷ...) ---
const formatCompactCurrency = (number) => {
  const absNumber = Math.abs(number);
  if (absNumber >= 1_000_000_000) {
    return (number / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + " Tỷ";
  }
  if (absNumber >= 1_000_000) {
    return (number / 1_000_000).toFixed(1).replace(/\.0$/, "") + " Tr";
  }
  if (absNumber >= 1_000) {
    return (number / 1_000).toFixed(0) + " k"; // Hoặc để nguyên nếu muốn hiện chi tiết nghìn
  }
  return formatCurrency(number);
};

const GROUP_ICONS = [
  "🏠",
  "🚗",
  "🍔",
  "✈️",
  "🛒",
  "🎮",
  "🍿",
  "💡",
  "💰",
  "🏥",
  "🐾",
  "🎁",
];

const playBuzzSound = () => {
  try {
    const audio = new Audio("/buzz.mp3");
    audio.play();

    // Nếu bạn muốn rung điện thoại (cần hỗ trợ từ trình duyệt/Capacitor)
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 500]); // Rung tít tít... tíiiit
    }
  } catch (e) {
    console.error("Lỗi phát âm thanh:", e);
  }
};

// --- COMPONENTS ---
const Toast = ({ message, type = "error", onClose }) => {
  if (!message) return null;
  return (
    <div className="fixed top-14 left-1/2 -translate-x-1/2 z-[200] animate-fade-in-down">
      <div
        className={`flex items-center gap-3 px-6 py-3 rounded-full shadow-2xl shadow-black/20 backdrop-blur-md border ${
          type === "error"
            ? "bg-gray-900/90 text-white border-red-500/50"
            : "bg-white text-gray-800 border-gray-200"
        }`}
      >
        {type === "error" && <AlertCircle size={20} className="text-red-400" />}
        {type === "success" && (
          <CheckCircle2 size={20} className="text-green-500" />
        )}
        {type === "info" && (
          <Cloud size={20} className="text-blue-500 animate-pulse" />
        )}
        {type === "buzz" && (
          <Bell size={20} className="text-yellow-500 animate-bounce" />
        )}
        <span className="font-bold text-sm">{message}</span>
      </div>
    </div>
  );
};

// --- COMPONENT XÁC NHẬN XÓA (Custom Dialog) ---
const ConfirmDialog = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[600] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose} // Bấm ra ngoài thì đóng
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-scale-up"
        onClick={(e) => e.stopPropagation()} // Chặn click xuyên
      >
        {/* Icon cảnh báo */}
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
          <Trash2 size={24} />
        </div>

        <h3 className="text-xl font-bold text-center text-gray-800 mb-2">
          {title || "Xác nhận xóa"}
        </h3>

        <p className="text-gray-500 text-center mb-6 text-sm leading-relaxed">
          {message ||
            "Hành động này không thể hoàn tác. Bạn có chắc chắn muốn tiếp tục?"}
        </p>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors"
          >
            Hủy bỏ
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 shadow-lg shadow-red-200 transition-colors"
          >
            Xóa ngay
          </button>
        </div>
      </div>
    </div>
  );
};

// --- COMPONENT AVATAR (ĐÃ NÂNG CẤP: HỖ TRỢ TỰ ĐỘNG HIỂN THỊ ẢNH THẬT) ---
const Avatar = ({ name, src, size = "md", className = "" }) => {
  // Định nghĩa kích thước và cỡ chữ
  const sizeClasses = {
    xs: "w-6 h-6 text-[9px]",
    sm: "w-8 h-8 text-[10px]",
    md: "w-10 h-10 text-[12px]",
    lg: "w-16 h-16 text-xl",
    xl: "w-24 h-24 text-3xl",
  };
  const currentSizeClass = sizeClasses[size] || sizeClasses.md;

  // 1. NẾU CÓ LINK ẢNH (SRC) -> HIỂN THỊ ẢNH THẬT
  if (src) {
    // Tự động trích xuất width và height từ sizeClasses để áp vào ảnh
    const dimensions = currentSizeClass.split(" ").slice(0, 2).join(" ");
    return (
      <img
        src={src}
        alt={name}
        className={`${dimensions} rounded-full object-cover shadow-sm border border-gray-100 shrink-0 ${className}`}
      />
    );
  }

  // 2. NẾU KHÔNG CÓ ẢNH -> HIỂN THỊ CHỮ CÁI ĐẦU NHƯ CŨ
  const isMe = name === "Tôi";
  const initials = isMe
    ? "ME"
    : name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase()
    : "?";

  const colors = [
    "bg-rose-500",
    "bg-blue-500",
    "bg-emerald-500",
    "bg-amber-500",
    "bg-violet-500",
    "bg-pink-500",
    "bg-cyan-500",
  ];
  const colorIndex = name ? name.length % colors.length : 0;
  const bgColor = isMe ? "bg-slate-800" : colors[colorIndex];

  return (
    <div
      className={`${currentSizeClass} ${bgColor} rounded-full flex items-center justify-center text-white font-bold shadow-sm border-2 border-white shrink-0 ${className}`}
    >
      {initials}
    </div>
  );
};

// --- HistoryModal (MỚI: Popup xem lịch sử) ---
const HistoryModal = ({
  isOpen,
  onClose,
  expenses,
  people,
  renderHistoryItem,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white w-full max-w-4xl h-[80vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-slide-up">
        {/* Header Modal */}
        <div className="p-6 border-b flex justify-between items-center bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-100 text-violet-600 rounded-xl">
              <History size={24} />
            </div>
            <div>
              <h2 className="font-bold text-xl text-gray-800">
                Toàn bộ lịch sử giao dịch
              </h2>
              <p className="text-sm text-gray-500">
                Tổng cộng {expenses.length} giao dịch
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-white border border-gray-200 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Body List */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30 custom-scrollbar">
          {expenses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {expenses.map((exp) => (
                <div key={exp.id}>{renderHistoryItem(exp)}</div>
              ))}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-60">
              <History size={64} className="mb-4" strokeWidth={1} />
              <p>Chưa có giao dịch nào</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- COMPONENT EXPENSE MODAL (FINAL FIX: SPLIT AUTO-INCLUDE & FULL SINGLE SELECT) ---
// --- COMPONENT EXPENSE MODAL (FULL GỐC + FIX AVATAR + FIX LOGIC) ---
const ExpenseModal = ({
  isOpen,
  onClose,
  editingExpense,
  onSave,
  people,
  showToast,
  currentUser,
  groupId,
  user,
}) => {
  // --- STATES ---
  const [form, setForm] = useState({
    description: "",
    amount: "",
    date: format(new Date(), "yyyy-MM-dd"),
    sharedWith: [],
    payerId: "me",
    type: "split",
    customShares: {},
    billImage: null,
    comments: [],
    loanType: "lend",
  });

  const [currentView, setCurrentView] = useState("form");
  const [uploading, setUploading] = useState(false);
  const [commentText, setCommentText] = useState("");

  // --- HELPER MỚI: RENDER AVATAR (Ưu tiên ảnh Google) ---
  const renderMyAvatar = (size = "sm") => {
    const sizeClasses = {
      xs: "w-6 h-6 text-[10px]",
      sm: "w-8 h-8 text-xs",
      md: "w-10 h-10 text-sm",
    };
    const css = sizeClasses[size] || sizeClasses.sm;

    if (user?.photoURL) {
      return (
        <img
          src={user.photoURL}
          alt="Me"
          className={`${css.split(" ")[0]} ${
            css.split(" ")[1]
          } rounded-full object-cover border border-gray-200 shrink-0`}
        />
      );
    }
    return <Avatar name={user?.displayName || "Tôi"} size={size} />;
  };

  // --- EFFECT 1: LOAD DATA ---
  useEffect(() => {
    if (isOpen) {
      if (editingExpense) {
        setForm({
          description: editingExpense.description || "",
          amount: editingExpense.amount ? String(editingExpense.amount) : "",
          date: editingExpense.date
            ? format(new Date(editingExpense.date), "yyyy-MM-dd")
            : format(new Date(), "yyyy-MM-dd"),
          sharedWith: editingExpense.sharedWith || [],
          payerId: editingExpense.payerId || "me",
          type: editingExpense.type || "split",
          customShares: editingExpense.customShares || {},
          billImage: editingExpense.billImage || null,
          comments: editingExpense.comments || [],
          loanType: "lend",
        });
      } else {
        setForm({
          description: "",
          amount: "",
          date: format(new Date(), "yyyy-MM-dd"),
          sharedWith: [],
          payerId: "me",
          type: "split",
          customShares: {},
          billImage: null,
          comments: [],
          loanType: "lend",
        });
      }
      setCurrentView("form");
      setCommentText("");
    }
  }, [editingExpense, isOpen]);

  // --- EFFECT 2: LOGIC TỰ ĐỘNG CHO SPLIT ---
  useEffect(() => {
    if (form.type === "split") {
      if (!form.sharedWith.includes(form.payerId)) {
        setForm((prev) => ({
          ...prev,
          sharedWith: [...prev.sharedWith, prev.payerId],
        }));
      }
    }
  }, [form.payerId, form.type, form.sharedWith]);

  if (!isOpen) return null;

  // --- HANDLERS: CHIA TIỀN ---
  const togglePerson = (id) => {
    // Nếu là Ứng/Vay (full) -> Chỉ được chọn 1 người
    if (form.type === "full") {
      setForm({ ...form, sharedWith: [id] });
      return;
    }

    const list = form.sharedWith;
    let newCustomShares = { ...form.customShares };

    if (!list.includes(id)) {
      newCustomShares[id] = "";
    } else {
      delete newCustomShares[id];
    }

    setForm({
      ...form,
      sharedWith: list.includes(id)
        ? list.filter((p) => p !== id)
        : [...list, id],
      customShares: newCustomShares,
    });
  };

  const handleCustomShareChange = (id, value) => {
    const rawValue = value.replace(/\./g, "");
    if (/^\d*$/.test(rawValue)) {
      setForm({
        ...form,
        customShares: {
          ...form.customShares,
          [id]: rawValue,
        },
      });
    }
  };

  const getPayerName = () => {
    if (form.payerId === "me") return "Tôi (Mặc định)";
    const p = people.find((i) => i.id === form.payerId);
    return p ? p.name : "Chưa chọn";
  };

  // --- HANDLERS: UPLOAD ẢNH ---
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const path = `receipts/${groupId || "personal"}/${Date.now()}_${
        file.name
      }`;
      const storageRef = ref(storage, path);

      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      setForm((prev) => ({ ...prev, billImage: url }));
      showToast("Đã tải ảnh lên!", "success");
    } catch (error) {
      console.error(error);
      showToast("Lỗi tải ảnh: " + error.message, "error");
    } finally {
      setUploading(false);
    }
  };

  // --- HANDLERS: COMMENT ---
  const handleAddComment = () => {
    if (!commentText.trim()) return;

    const newComment = {
      id: uuidv4(),
      text: commentText,
      userName: currentUser?.displayName || user?.displayName || "Bạn",
      timestamp: new Date().toISOString(),
    };

    setForm((prev) => ({
      ...prev,
      comments: [...(prev.comments || []), newComment],
    }));
    setCommentText("");
  };

  // --- SAVE ---
  const handleSave = () => {
    const totalAmount = parseInt(form.amount || 0);
    if (totalAmount === 0) {
      showToast("Vui lòng nhập số tiền!", "error");
      return;
    }
    if (!form.description.trim()) {
      showToast("Vui lòng nhập nội dung!", "error");
      return;
    }

    // Validate Custom Split
    if (form.type === "custom") {
      let currentSum = 0;
      const autoSharedWith = []; // Danh sách người tham gia tự động dựa trên số tiền nhập

      // 1. Quét phần của TÔI
      const myShare = parseInt(form.customShares["me"] || 0);
      if (myShare > 0) {
        currentSum += myShare;
        // Logic cũ của bạn có thể không push "me" vào sharedWith, tùy cách bạn xử lý backend
        // Nhưng thường custom thì ta chỉ cần đảm bảo tổng đúng.
      }

      // 2. Quét phần của CÁC THÀNH VIÊN KHÁC
      people.forEach((p) => {
        if (p.id === user?.uid) return; // Bỏ qua tôi (đã tính ở trên)
        const s = parseInt(form.customShares[p.id] || 0);
        if (s > 0) {
          currentSum += s;
          autoSharedWith.push(p.id);
        }
      });

      if (currentSum !== totalAmount) {
        showToast(
          `Tổng chia (${formatCurrency(
            currentSum,
          )}) khác tổng bill (${formatCurrency(totalAmount)})!`,
          "error",
        );
        return;
      }

      // [FIX 2] Tự động cập nhật danh sách sharedWith dựa trên những ai có tiền > 0
      // Điều này giúp user không cần phải bấm chọn từng người thủ công
      form.sharedWith = autoSharedWith;
    }

    // Validate Full (Ứng/Vay)
    if (form.type === "full") {
      const targetId =
        form.loanType === "lend" ? form.sharedWith[0] : form.payerId;
      if (
        !targetId ||
        (form.loanType === "lend" && form.sharedWith.length === 0)
      ) {
        showToast("Vui lòng chọn người vay/cho vay!", "error");
        return;
      }
    }

    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-gray-100 md:bg-white w-full max-w-lg md:max-w-2xl h-[90vh] md:h-[85vh] rounded-t-[2rem] md:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-slide-up md:animate-none relative">
        {/* === MAIN VIEW === */}
        <div
          className={`flex flex-col h-full transition-transform duration-300 ease-in-out ${
            currentView === "form" ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {/* HEADER */}
          <div className="px-4 py-4 bg-white border-b flex justify-between items-center shrink-0">
            <button
              onClick={onClose}
              className="text-blue-600 font-medium text-base"
            >
              Hủy
            </button>
            <h2 className="font-bold text-lg text-gray-800">
              {editingExpense ? "Sửa khoản chi" : "Thêm khoản chi"}
            </h2>
            <button
              onClick={handleSave}
              className="text-blue-600 font-bold text-base"
            >
              Xong
            </button>
          </div>

          {/* SCROLLABLE CONTENT */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
            {/* 1. INPUT TIỀN & INFO */}
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-gray-100 flex items-center">
                <span className="w-24 font-medium text-gray-500">Số tiền</span>
                <input
                  type="text"
                  inputMode="numeric"
                  className="flex-1 text-right font-bold text-xl text-blue-600 outline-none placeholder-gray-300"
                  placeholder="0"
                  value={
                    form.amount
                      ? form.amount.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
                      : ""
                  }
                  onChange={(e) => {
                    const rawValue = e.target.value.replace(/\./g, "");
                    if (/^\d*$/.test(rawValue))
                      setForm({ ...form, amount: rawValue });
                  }}
                  autoFocus={!editingExpense}
                />
              </div>
              <div className="p-4 border-b border-gray-100 flex items-center">
                <span className="w-24 font-medium text-gray-500">Tiêu đề</span>
                <input
                  className="flex-1 text-right font-medium text-gray-800 outline-none placeholder-gray-300"
                  placeholder="Ăn trưa, cafe..."
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </div>
              <div className="p-4 flex items-center">
                <span className="w-24 font-medium text-gray-500">Ngày</span>
                <input
                  type="date"
                  className="flex-1 text-right font-bold text-gray-700 outline-none bg-transparent"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </div>
            </div>

            {/* 2. LOẠI CHIA & NGƯỜI TRẢ */}
            <div className="space-y-4">
              <div className="flex bg-gray-200 p-1 rounded-xl">
                <button
                  onClick={() => setForm({ ...form, type: "split" })}
                  className={`flex-1 py-2 rounded-lg text-xs md:text-sm font-bold transition-all ${
                    form.type === "split"
                      ? "bg-white shadow text-black"
                      : "text-gray-500"
                  }`}
                >
                  Chia đều
                </button>
                <button
                  onClick={() => setForm({ ...form, type: "custom" })}
                  className={`flex-1 py-2 rounded-lg text-xs md:text-sm font-bold transition-all ${
                    form.type === "custom"
                      ? "bg-white shadow text-purple-600"
                      : "text-gray-500"
                  }`}
                >
                  Cụ thể
                </button>
                <button
                  onClick={() => setForm({ ...form, type: "full" })}
                  className={`flex-1 py-2 rounded-lg text-xs md:text-sm font-bold transition-all ${
                    form.type === "full"
                      ? "bg-white shadow text-orange-600"
                      : "text-gray-500"
                  }`}
                >
                  Ứng/Vay
                </button>
              </div>

              {form.type !== "full" && (
                <div
                  onClick={() => setCurrentView("payer_select")}
                  className="bg-white rounded-2xl p-4 flex justify-between items-center shadow-sm active:bg-gray-50 transition-colors cursor-pointer"
                >
                  <span className="font-medium text-gray-500">
                    Người trả tiền
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-800">
                      {getPayerName()}
                    </span>
                    <ChevronRight size={20} className="text-gray-300" />
                  </div>
                </div>
              )}
            </div>

            {/* 3. DANH SÁCH THÀNH VIÊN */}
            <div>
              <label className="text-xs font-bold text-gray-400 ml-4 mb-2 block uppercase">
                {form.type === "custom"
                  ? "Nhập số tiền từng người"
                  : form.type === "full"
                  ? "Chọn người giao dịch (Chỉ 1 người)"
                  : "Chọn người chia cùng (Người trả mặc định có mặt)"}
              </label>

              <div className="bg-white rounded-2xl p-2 md:p-4 shadow-sm space-y-2">
                {/* ================= CASE 1: CỤ THỂ (CUSTOM) ================= */}
                {form.type === "custom" && (
                  <>
                    {/* A. Dòng của TÔI */}
                    <div className="flex items-center justify-between p-2 border-b border-gray-50">
                      <div className="flex items-center gap-2">
                        {renderMyAvatar("sm")} {/* SỬ DỤNG HELPER AVATAR */}
                        <span className="font-bold text-gray-700">Tôi</span>
                      </div>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        className="w-32 text-right p-2 bg-gray-50 rounded-lg font-bold text-purple-600 outline-none focus:ring-2 ring-purple-100"
                        value={
                          form.customShares["me"]
                            ? formatNumber(form.customShares["me"])
                            : ""
                        }
                        onChange={(e) => {
                          const val = e.target.value.replace(/\./g, "");
                          if (/^\d*$/.test(val)) {
                            setForm({
                              ...form,
                              customShares: {
                                ...form.customShares,
                                ["me"]: val,
                              },
                            });
                          }
                        }}
                      />
                    </div>

                    {/* B. Các bạn bè */}
                    {people
                      .filter((p) => p.id !== user?.uid)
                      .map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between p-2 border-b border-gray-50 last:border-0"
                        >
                          <div className="flex items-center gap-2 flex-1">
                            <Avatar name={p.name} size="sm" />
                            <span className="font-medium text-gray-700 truncate">
                              {p.name}
                            </span>
                          </div>
                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder="0"
                            className="w-32 text-right p-2 bg-gray-50 rounded-lg font-bold text-gray-700 outline-none focus:ring-2 ring-blue-100 focus:text-blue-600"
                            value={
                              form.customShares[p.id]
                                ? formatNumber(form.customShares[p.id])
                                : ""
                            }
                            onChange={(e) => {
                              const val = e.target.value.replace(/\./g, "");
                              if (/^\d*$/.test(val)) {
                                setForm({
                                  ...form,
                                  customShares: {
                                    ...form.customShares,
                                    [p.id]: val,
                                  },
                                });
                              }
                            }}
                          />
                        </div>
                      ))}
                    <div className="mt-2 text-right text-xs font-bold text-gray-500">
                      Đã nhập:{" "}
                      {formatCurrency(
                        Object.values(form.customShares).reduce(
                          (a, b) => a + (parseInt(b) || 0),
                          0,
                        ),
                      )}{" "}
                      / {formatCurrency(form.amount || 0)}
                    </div>
                  </>
                )}

                {/* ================= CASE 2: CHIA ĐỀU (SPLIT) ================= */}
                {form.type === "split" && (
                  <>
                    {/* A. Dòng của TÔI (ẨN NẾU LÀ NGƯỜI TRẢ) */}
                    {form.payerId !== "me" && (
                      <button
                        onClick={() => togglePerson("me")}
                        className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all ${
                          form.sharedWith.includes(user.uid)
                            ? "bg-blue-50 text-blue-800 font-bold border border-blue-200"
                            : "text-gray-600 hover:bg-gray-50 border border-transparent"
                        }`}
                      >
                        {renderMyAvatar("sm")} {/* SỬ DỤNG HELPER AVATAR */}
                        <span className="truncate">Tôi</span>
                        {form.sharedWith.includes(user.uid) && (
                          <div className="ml-auto text-blue-600">
                            <Check size={16} />
                          </div>
                        )}
                      </button>
                    )}

                    {/* B. Các bạn bè (ẨN NẾU LÀ NGƯỜI TRẢ) */}
                    {people
                      .filter(
                        (p) => p.id !== user?.uid && p.id !== form.payerId, // <--- LỌC NGƯỜI TRẢ
                      )
                      .map((p) => {
                        const isSelected = form.sharedWith.includes(p.id);
                        return (
                          <button
                            key={p.id}
                            onClick={() => togglePerson(p.id)}
                            className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all ${
                              isSelected
                                ? "bg-blue-50 text-blue-800 font-bold border border-blue-200"
                                : "text-gray-600 hover:bg-gray-50 border border-transparent"
                            }`}
                          >
                            <Avatar name={p.name} size="xs" />
                            <span className="truncate">{p.name}</span>
                            {isSelected && (
                              <div className="ml-auto text-blue-600">
                                <Check size={16} />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    <p className="text-xs text-center text-gray-400 italic mt-2">
                      Người trả tiền ({getPayerName()}) mặc định được tính 1
                      phần.
                    </p>
                  </>
                )}

                {/* ================= CASE 3: ỨNG / VAY (FULL) ================= */}
                {form.type === "full" && (
                  <div className="space-y-4">
                    {/* Toggle Button: Tôi cho vay / Tôi đi vay */}
                    <div className="flex bg-gray-100 p-1 rounded-xl">
                      <button
                        onClick={() =>
                          setForm({
                            ...form,
                            loanType: "lend",
                            payerId: user.uid,
                            sharedWith: [], // Reset người vay
                          })
                        }
                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                          form.loanType === "lend"
                            ? "bg-white shadow text-blue-600"
                            : "text-gray-500"
                        }`}
                      >
                        Tôi cho vay
                      </button>
                      <button
                        onClick={() =>
                          setForm({
                            ...form,
                            loanType: "borrow",
                            payerId: "", // Reset người cho vay
                            sharedWith: [user.uid], // Mặc định người hưởng là Tôi
                          })
                        }
                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                          form.loanType === "borrow"
                            ? "bg-white shadow text-purple-600"
                            : "text-gray-500"
                        }`}
                      >
                        Tôi đi vay
                      </button>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs text-center text-gray-400 italic">
                        {form.loanType === "lend"
                          ? "Chọn DUY NHẤT 1 người vay tiền bạn"
                          : "Chọn DUY NHẤT 1 người bạn mượn tiền"}
                      </p>

                      {people
                        .filter((p) => p.id !== user?.uid)
                        .map((p) => {
                          const isSelected =
                            form.loanType === "lend"
                              ? form.sharedWith.includes(p.id)
                              : form.payerId === p.id;

                          return (
                            <button
                              key={p.id}
                              onClick={() => {
                                if (form.loanType === "lend") {
                                  // Tôi cho vay -> Set sharedWith = [1 người]
                                  setForm({
                                    ...form,
                                    payerId: user.uid,
                                    sharedWith: [p.id],
                                  });
                                } else {
                                  // Tôi đi vay -> Set payerId = người đó
                                  setForm({
                                    ...form,
                                    payerId: p.id,
                                    sharedWith: [user.uid],
                                  });
                                }
                              }}
                              className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all border ${
                                isSelected
                                  ? form.loanType === "lend"
                                    ? "bg-blue-50 text-blue-800 border-blue-200"
                                    : "bg-purple-50 text-purple-800 border-purple-200"
                                  : "text-gray-600 hover:bg-gray-50 border-transparent"
                              }`}
                            >
                              <Avatar name={p.name} size="xs" />
                              <span className="truncate">{p.name}</span>

                              {/* Radio Indicator */}
                              <div className="ml-auto">
                                {isSelected ? (
                                  <div
                                    className={`w-5 h-5 rounded-full border-[5px] ${
                                      form.loanType === "lend"
                                        ? "border-blue-600"
                                        : "border-purple-600"
                                    }`}
                                  ></div>
                                ) : (
                                  <div className="w-5 h-5 rounded-full border-2 border-gray-300"></div>
                                )}
                              </div>
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 4. ẢNH HÓA ĐƠN */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-gray-500 text-sm">
                  Ảnh hóa đơn
                </span>
                <label className="flex items-center gap-2 text-blue-600 font-bold text-sm cursor-pointer bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors">
                  <Camera size={16} />
                  {uploading ? "Đang tải..." : "Chụp/Tải lên"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={uploading}
                  />
                </label>
              </div>

              {form.billImage ? (
                <div className="relative group">
                  <img
                    src={form.billImage}
                    alt="Bill"
                    className="w-full h-48 object-cover rounded-xl border border-gray-200"
                  />
                  <button
                    onClick={() => setForm({ ...form, billImage: null })}
                    className="absolute top-2 right-2 bg-black/50 text-white p-1.5 rounded-full hover:bg-red-500 transition-colors shadow-sm"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="h-20 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center text-gray-400 text-sm bg-gray-50/50">
                  <ImageIcon size={20} className="mr-2 opacity-50" />
                  Chưa có ảnh
                </div>
              )}
            </div>

            {/* 5. BÌNH LUẬN */}
            <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
              <span className="font-bold text-gray-500 text-sm flex items-center gap-2">
                <MessageSquare size={16} /> Bình luận ({form.comments.length})
              </span>

              {/* List Comments */}
              {form.comments.length > 0 && (
                <div className="max-h-40 overflow-y-auto space-y-3 custom-scrollbar p-1">
                  {/* SỬA: Thêm tham số index vào hàm map */}
                  {form.comments.map((cmt, index) => (
                    <div
                      /* SỬA: Dùng id, nếu không có thì dùng index để đảm bảo không lỗi */
                      key={cmt.id || index}
                      className="bg-gray-50 p-3 rounded-xl text-sm"
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-gray-800">
                          {cmt.userName}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {/* Thêm kiểm tra timestamp tồn tại trước khi format để tránh lỗi Invalid Date */}
                          {cmt.timestamp
                            ? format(new Date(cmt.timestamp), "dd/MM HH:mm")
                            : ""}
                        </span>
                      </div>
                      <p className="text-gray-600 mt-1 break-words">
                        {cmt.text}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Input Comment */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Viết bình luận..."
                  className="flex-1 bg-gray-50 border-none rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
                />
                <button
                  onClick={handleAddComment}
                  className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* === PAYER SELECT VIEW (OVERLAY) === */}
        <div
          className={`absolute inset-0 bg-gray-100 flex flex-col transition-transform duration-300 ease-in-out ${
            currentView === "payer_select"
              ? "translate-x-0"
              : "translate-x-full"
          }`}
        >
          <div className="px-4 py-4 bg-white border-b flex items-center shrink-0 relative">
            <button
              onClick={() => setCurrentView("form")}
              className="absolute left-4 p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-full"
            >
              <ChevronLeft size={24} />
            </button>
            <h2 className="font-bold text-lg text-gray-800 w-full text-center">
              Chọn người trả tiền
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
              {/* --- OPTION 1: TÔI --- */}
              <div
                onClick={() => {
                  setForm({ ...form, payerId: "me" });
                  setCurrentView("form");
                }}
                className={`flex items-center justify-between p-4 border-b border-gray-100 cursor-pointer active:bg-gray-50 ${
                  form.payerId === "me" ? "bg-yellow-50" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  {renderMyAvatar("md")} {/* SỬ DỤNG HELPER AVATAR */}
                  <span className="font-bold text-gray-800">
                    Tôi (Mặc định)
                  </span>
                </div>
                {form.payerId === "me" ? (
                  <CheckCircle2
                    className="text-yellow-500 fill-current"
                    size={24}
                  />
                ) : (
                  <Circle className="text-gray-300" size={24} />
                )}
              </div>

              {/* --- OPTION 2: DANH SÁCH BẠN BÈ --- */}
              {people
                .filter((p) => p.id !== user?.uid)
                .map((p, index) => {
                  const isSelected = form.payerId === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => {
                        setForm({ ...form, payerId: p.id });
                        setCurrentView("form");
                      }}
                      className={`flex items-center justify-between p-4 border-gray-100 cursor-pointer active:bg-gray-50 ${
                        index !== people.length - 1 ? "border-b" : ""
                      } ${isSelected ? "bg-yellow-50" : ""}`}
                    >
                      <div className="flex items-center gap-3">
                        {p.photoURL ? (
                          <img
                            src={p.photoURL}
                            alt={p.name}
                            className="w-10 h-10 rounded-full object-cover shadow-sm border border-gray-100 shrink-0"
                          />
                        ) : (
                          <Avatar name={p.name} size="md" src={p.photoURL} />
                        )}
                        <span className="font-bold text-gray-800">
                          {p.name}
                        </span>
                      </div>
                      {isSelected ? (
                        <CheckCircle2
                          className="text-yellow-500 fill-current"
                          size={24}
                        />
                      ) : (
                        <Circle className="text-gray-300" size={24} />
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const LoginModal = ({ isOpen, onClose, showToast }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false); // [MỚI] Chế độ quên mật khẩu
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  useEffect(() => {
    if (!isOpen) {
      // Reset form
      setEmail("");
      setPassword("");
      setFullName("");
      setError("");
      setIsRegistering(false);
      setIsForgotPassword(false);
      setShowPassword(false); // [MỚI] Reset về ẩn
    }
  }, [isOpen]);

  // [MỚI] Hàm xử lý quên mật khẩu
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!email) {
      setError("Vui lòng nhập Email để nhận link đặt lại mật khẩu.");
      return;
    }
    setError("");
    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      showToast(
        "Đã gửi email! Vui lòng kiểm tra hộp thư (cả mục Spam).",
        "success",
      );
      setIsForgotPassword(false); // Quay lại màn hình đăng nhập
    } catch (err) {
      console.error(err);
      if (err.code === "auth/user-not-found")
        setError("Email này chưa được đăng ký.");
      else if (err.code === "auth/invalid-email")
        setError("Email không hợp lệ.");
      else setError("Lỗi: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    // [FIX IPHONE] 1. Tạo một cái "đồng hồ" đếm ngược 10 giây
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("TIMEOUT")), 10000);
    });

    try {
      if (isRegistering) {
        // --- ĐĂNG KÝ (Kèm cơ chế đua Timeout) ---
        // Nếu Firebase treo -> timeoutPromise sẽ thắng và báo lỗi sau 10s
        const userCredential = await Promise.race([
          createUserWithEmailAndPassword(auth, email, password),
          timeoutPromise,
        ]);

        const user = userCredential.user;
        if (fullName.trim()) {
          await updateProfile(user, { displayName: fullName });
        }
        await sendEmailVerification(user);
        await signOut(auth);

        showToast(
          "Đăng ký thành công! Vui lòng xác thực Email rồi đăng nhập.",
          "success",
        );
        setIsRegistering(false);
        setPassword("");
      } else {
        // --- ĐĂNG NHẬP (Kèm cơ chế đua Timeout) ---
        // Nếu Firebase treo -> timeoutPromise sẽ thắng và báo lỗi sau 10s
        const userCredential = await Promise.race([
          signInWithEmailAndPassword(auth, email, password),
          timeoutPromise,
        ]);

        const user = userCredential.user;
        if (!user.emailVerified) {
          await signOut(auth);
          throw new Error("auth/email-not-verified");
        }
        showToast("Đăng nhập thành công!", "success");
        onClose();
      }
    } catch (err) {
      // [FIX IPHONE] 2. Xử lý lỗi Timeout riêng biệt
      if (err.message === "TIMEOUT") {
        setError(
          "Kết nối quá lâu (Timeout). Vui lòng tắt Wifi bật 4G hoặc thử lại sau.",
        );
      } else {
        // Các lỗi cũ giữ nguyên
        let msg = err.message;
        if (msg.includes("auth/email-not-verified"))
          msg = "Bạn chưa xác thực Email! Kiểm tra hộp thư (cả mục Spam).";
        else if (err.code === "auth/email-already-in-use")
          msg = "Email này đã đăng ký. Hãy đăng nhập.";
        else if (err.code === "auth/invalid-email")
          msg = "Email sai định dạng.";
        else if (
          err.code === "auth/user-not-found" ||
          err.code === "auth/wrong-password" ||
          err.code === "auth/invalid-credential"
        )
          msg = "Sai tài khoản hoặc mật khẩu.";
        else if (err.code === "auth/weak-password")
          msg = "Mật khẩu quá yếu (> 6 ký tự).";
        else if (err.code === "auth/network-request-failed")
          msg = "Lỗi kết nối mạng. Hãy kiểm tra đường truyền.";

        setError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 transform transition-all scale-100 animate-slide-up relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X size={20} />
        </button>

        <h2 className="text-xl font-bold text-center mb-6 text-gray-800">
          {isForgotPassword
            ? "Quên Mật Khẩu"
            : isRegistering
            ? "Đăng Ký Tài Khoản"
            : "Đăng Nhập"}
        </h2>

        {/* Form dùng chung: Nếu quên mật khẩu thì chạy handleResetPassword, ngược lại chạy handleSubmit */}
        <form
          onSubmit={isForgotPassword ? handleResetPassword : handleSubmit}
          className="flex flex-col gap-4"
        >
          {/* Tên hiển thị (Chỉ hiện khi Đăng ký) */}
          {isRegistering && !isForgotPassword && (
            <div className="relative animate-fade-in">
              <Users
                className="absolute left-3 top-3 text-gray-400"
                size={18}
              />
              <input
                type="text"
                placeholder="Tên hiển thị"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required={isRegistering}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 outline-none"
              />
            </div>
          )}

          {/* Email (Luôn hiện) */}
          <div className="relative">
            <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
            <input
              type="email"
              placeholder={isForgotPassword ? "Nhập email đăng ký..." : "Email"}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 outline-none"
            />
          </div>

          {/* Mật khẩu (Ẩn khi Quên mật khẩu) */}
          {!isForgotPassword && (
            <div className="relative animate-fade-in">
              {/* [FIX] Ổ khóa: Căn giữa theo chiều dọc (top-1/2 -translate-y-1/2) */}
              <Lock
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />

              <input
                type={showPassword ? "text" : "password"}
                placeholder="Mật khẩu"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required={!isForgotPassword}
                className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-200 focus:border-blue-500 outline-none transition-all"
              />

              {/* [FIX] Nút Con mắt: Căn giữa theo chiều dọc (top-1/2 -translate-y-1/2) */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors flex items-center justify-center p-1"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          )}

          {error && (
            <div className="bg-red-50 text-red-500 text-sm p-3 rounded-lg flex items-center gap-2">
              <AlertTriangle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 flex items-center justify-center gap-2 transition-all"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : isForgotPassword ? (
              "Gửi Email Khôi Phục"
            ) : isRegistering ? (
              "Đăng Ký & Gửi Email"
            ) : (
              "Đăng Nhập"
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500 space-y-2">
          {/* Nút chuyển qua lại Quên mật khẩu */}
          {!isRegistering && !isForgotPassword && (
            <button
              onClick={() => {
                setIsForgotPassword(true);
                setError("");
              }}
              className="text-gray-500 hover:text-blue-600 underline block w-full mb-2"
            >
              Quên mật khẩu?
            </button>
          )}

          <p>
            {isForgotPassword
              ? "Đã nhớ mật khẩu? "
              : isRegistering
              ? "Đã có tài khoản? "
              : "Chưa có tài khoản? "}
            <button
              onClick={() => {
                if (isForgotPassword) setIsForgotPassword(false);
                else setIsRegistering(!isRegistering);
                setError("");
              }}
              className="text-blue-600 font-bold hover:underline"
            >
              {isForgotPassword
                ? "Đăng nhập"
                : isRegistering
                ? "Đăng nhập ngay"
                : "Tạo mới"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

const UserProfileModal = ({ isOpen, onClose, user, onLogout, showToast }) => {
  const [uploading, setUploading] = useState(false);

  // States cho đổi mật khẩu
  const [isChangePassMode, setIsChangePassMode] = useState(false);
  const [currentPassword, setCurrentPassword] = useState(""); // [MỚI] Mật khẩu cũ
  const [newPassword, setNewPassword] = useState(""); // [MỚI] Mật khẩu mới
  const [passLoading, setPassLoading] = useState(false);
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  // Reset state khi đóng mở modal
  useEffect(() => {
    if (isOpen) {
      setIsChangePassMode(false);
      setNewPassword("");
      setCurrentPassword("");
      setPassLoading(false);
      setShowCurrentPass(false); // [MỚI]
      setShowNewPass(false); // [MỚI]
    }
  }, [isOpen]);

  if (!isOpen || !user) return null;

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      // 1. Tải ảnh lên Storage
      const storageRef = ref(storage, `profile_pictures/${user.uid}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      // 2. Cập nhật vào hệ thống Auth
      await updateProfile(user, { photoURL: url });

      // ==========================================
      // 3. [CODE MỚI] LƯU ẢNH VÀO FIRESTORE ĐỂ BẠN BÈ THẤY
      // ==========================================
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, { photoURL: url }, { merge: true });

      // ==========================================
      // 4. [CODE MỚI] ĐỔI ẢNH HÀNG LOẠT TRONG CÁC NHÓM ĐANG THAM GIA
      // ==========================================
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        const joinedGroups = userDoc.data().joinedGroups || [];

        // Quét qua tất cả các nhóm mình có mặt
        for (const g of joinedGroups) {
          const groupRef = doc(db, "groups", g.id);
          const groupSnap = await getDoc(groupRef);

          if (groupSnap.exists()) {
            const gData = groupSnap.data();
            let updatedMembers = gData.members || [];

            // Tìm tên mình trong nhóm và cập nhật lại link ảnh mới
            updatedMembers = updatedMembers.map((m) =>
              m.id === user.uid ? { ...m, photoURL: url } : m,
            );

            // Lưu lại vào nhóm
            await updateDoc(groupRef, { members: updatedMembers });
          }
        }
      }

      showToast("Đã cập nhật ảnh đại diện thành công!", "success");

      // [QUAN TRỌNG]: Tự động tải lại trang để Firebase Auth làm mới dữ liệu ảnh toàn App
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error(error);
      showToast("Lỗi cập nhật ảnh: " + error.message, "error");
    } finally {
      setUploading(false);
    }
  };

  // --- HÀM ĐỔI MẬT KHẨU (LOGIC MỚI) ---
  const handleChangePassword = async () => {
    // 1. Validate cơ bản
    if (!currentPassword) {
      return showToast("Vui lòng nhập mật khẩu hiện tại", "error");
    }
    if (newPassword.length < 6) {
      return showToast("Mật khẩu mới phải từ 6 ký tự trở lên", "error");
    }
    if (currentPassword === newPassword) {
      return showToast("Mật khẩu mới không được trùng mật khẩu cũ", "error");
    }

    setPassLoading(true);
    try {
      // 2. TẠO CREDENTIAL TỪ MẬT KHẨU CŨ
      const credential = EmailAuthProvider.credential(
        user.email,
        currentPassword,
      );

      // 3. XÁC THỰC LẠI (Re-authenticate)
      // Nếu pass cũ sai, hàm này sẽ throw lỗi ngay
      await reauthenticateWithCredential(user, credential);

      // 4. NẾU ĐÚNG PASS CŨ -> CẬP NHẬT PASS MỚI
      await updatePassword(user, newPassword);

      showToast("Đổi mật khẩu thành công!", "success");

      // Reset form & đóng mode
      setIsChangePassMode(false);
      setNewPassword("");
      setCurrentPassword("");
    } catch (error) {
      console.error(error);
      // Xử lý các mã lỗi phổ biến
      if (
        error.code === "auth/wrong-password" ||
        error.code === "auth/invalid-credential"
      ) {
        showToast("Mật khẩu hiện tại không đúng!", "error");
      } else if (error.code === "auth/too-many-requests") {
        showToast("Thử lại quá nhiều lần. Vui lòng đợi chút!", "error");
      } else {
        showToast("Lỗi: " + error.message, "error");
      }
    } finally {
      setPassLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[300] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 text-white text-center relative">
          <button
            onClick={onClose}
            className="absolute top-12 md:top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all shadow-sm"
          >
            <X size={20} />
          </button>

          <div className="relative w-24 h-24 mx-auto mb-4 group cursor-pointer">
            <div className="w-full h-full rounded-full bg-white p-1 shadow-lg overflow-hidden relative">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt="User"
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-3xl">
                  {user.email?.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera size={24} className="text-white" />
              </div>
              {uploading && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                </div>
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={handleAvatarUpload}
              disabled={uploading}
            />
          </div>

          <h2 className="text-xl font-bold">
            {user.displayName || "Người dùng"}
          </h2>
          <p className="text-blue-100 text-sm opacity-80">{user.email}</p>
        </div>

        {/* BODY */}
        <div className="p-6 space-y-3">
          {isChangePassMode ? (
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 animate-fade-in">
              <p className="text-sm font-bold text-gray-800 mb-3 text-center border-b pb-2">
                Đổi Mật Khẩu
              </p>

              {/* Ô nhập mật khẩu CŨ */}
              <div className="mb-3">
                <p className="text-xs font-bold text-gray-500 uppercase mb-1">
                  Mật khẩu hiện tại
                </p>
                <div className="relative">
                  <input
                    type={showCurrentPass ? "text" : "password"}
                    placeholder="********"
                    className="w-full p-2.5 pr-10 rounded-lg border border-gray-200 text-sm focus:border-blue-500 outline-none bg-white"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    autoFocus
                  />
                  {/* [FIX] Căn giữa icon */}
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 p-1"
                  >
                    {showCurrentPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Ô nhập mật khẩu MỚI */}
              <div className="mb-4">
                <p className="text-xs font-bold text-gray-500 uppercase mb-1">
                  Mật khẩu mới
                </p>
                <div className="relative">
                  <input
                    type={showNewPass ? "text" : "password"}
                    placeholder="Nhập mật khẩu mới..."
                    className="w-full p-2.5 pr-10 rounded-lg border border-gray-200 text-sm focus:border-blue-500 outline-none bg-white"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  {/* [FIX] Căn giữa icon */}
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 p-1"
                  >
                    {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setIsChangePassMode(false)}
                  className="flex-1 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg text-sm font-bold hover:bg-gray-50"
                  disabled={passLoading}
                >
                  Hủy
                </button>
                <button
                  onClick={handleChangePassword}
                  disabled={passLoading}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 flex justify-center items-center shadow-lg shadow-blue-200"
                >
                  {passLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    "Lưu thay đổi"
                  )}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsChangePassMode(true)}
              className="w-full py-3 rounded-xl bg-blue-50 text-blue-600 font-bold border border-blue-100 hover:bg-blue-100 transition-all flex items-center justify-center gap-2"
            >
              <Lock size={18} /> Đổi mật khẩu
            </button>
          )}

          <button
            onClick={() => {
              onLogout();
              onClose();
            }}
            className="w-full py-3 rounded-xl bg-red-50 text-red-500 font-bold border border-red-100 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2"
          >
            <LogOut size={18} /> Đăng xuất
          </button>
        </div>
      </div>
    </div>
  );
};

// --- COMPONENT MODAL SỬA LIÊN HỆ (ĐÃ FIX: TỰ ĐIỀN DỮ LIỆU CŨ) ---
const EditContactModal = ({ contact, onClose, onSave }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  // useEffect: Mỗi khi "contact" thay đổi (người dùng bấm nút sửa),
  // cập nhật lại name và email vào ô input
  useEffect(() => {
    if (contact) {
      setName(contact.name || "");
      setEmail(contact.email || "");
    }
  }, [contact]);

  if (!contact) return null;

  return (
    <div className="fixed inset-0 z-[300] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-slide-up">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Sửa thông tin</h3>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">
              Tên gợi nhớ
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-blue-500 transition-colors"
              placeholder="Nhập tên..."
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">
              Email (Buzz)
            </label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-blue-500 transition-colors"
              placeholder="Nhập email..."
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={() => onSave(name, email)}
            className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-colors"
          >
            Lưu
          </button>
        </div>
      </div>
    </div>
  );
};

// --- COMPONENT CON ĐỂ XỬ LÝ RIÊNG TỪNG DÒNG GIAO DỊCH (FIX LỖI HOOK) ---
const HistoryItem = ({
  exp,
  isMobile,
  user,
  people,
  groupId,
  openEditModal,
  setItemToDelete,
  setViewingImage,
  setCommentModalData,
  toggleSettled,
  formatCompactCurrency,
}) => {
  // Các Hook này bây giờ nằm trong vòng đời của component con, không vi phạm quy tắc React
  const [touchStart, setTouchStart] = React.useState(0);
  const [touchEnd, setTouchEnd] = React.useState(0);
  const [isSwiped, setIsSwiped] = React.useState(false);

  const handleTouchStart = (e) => {
    if (!isMobile) return;
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e) => {
    if (!isMobile) return;
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!isMobile) return;
    // Vuốt từ phải sang trái > 50px
    if (touchStart - touchEnd > 50) setIsSwiped(true);
    // Vuốt từ trái sang phải > 50px
    if (touchEnd - touchStart > 50) setIsSwiped(false);
  };

  const currentContextPeople = exp._groupMembers || people;
  const actualPayerId = exp.payerId || "me";
  const payerName =
    actualPayerId === "me" || actualPayerId === user?.uid
      ? "Bạn"
      : currentContextPeople.find((p) => p.id === actualPayerId)?.name ||
        "Ai đó";

  const names = exp.sharedWith
    .map((id) =>
      id === "me" || id === user?.uid
        ? "Tôi"
        : currentContextPeople.find((p) => p.id === id)?.name,
    )
    .filter(Boolean)
    .join(", ");

  return (
    <div
      className="relative mb-3 overflow-hidden rounded-2xl"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* NÚT XÓA ẨN BÊN DƯỚI (Chỉ hiện khi vuốt trên Mobile) */}
      {isMobile && (
        <div
          className="absolute inset-0 bg-red-500 flex justify-end items-center pr-6 text-white active:bg-red-700 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            setItemToDelete({ id: exp.id, groupId: exp.groupId });
            setIsSwiped(false);
          }}
        >
          <div className="flex flex-col items-center gap-1">
            <Trash2 size={24} />
            <span className="text-[10px] font-bold">Xóa</span>
          </div>
        </div>
      )}

      {/* NỘI DUNG GIAO DỊCH */}
      <div
        onClick={() => !isSwiped && openEditModal(exp)}
        className={`group bg-white rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden flex items-center p-4 transition-transform duration-300 ease-out ${
          isMobile
            ? "mx-0 border-transparent"
            : "hover:shadow-md hover:bg-gray-50 cursor-pointer"
        } ${isSwiped ? "-translate-x-20" : "translate-x-0"}`}
      >
        <div
          className={`w-1.5 bg-gradient-to-b absolute left-0 top-0 bottom-0 ${
            exp.type === "split"
              ? "from-blue-400 to-blue-600"
              : "from-orange-400 to-orange-600"
          }`}
        ></div>

        <div className="ml-4 flex-1">
          <div className="flex justify-between items-start mb-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-800 text-sm md:text-lg line-clamp-1">
                {exp.description}
              </span>
              {exp.groupName && (
                <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full border border-gray-200">
                  {exp.groupName}
                </span>
              )}
            </div>
            <span
              className={`font-bold text-base md:text-xl shrink-0 ${
                exp.type === "split" ? "text-blue-600" : "text-orange-600"
              }`}
            >
              {formatCompactCurrency(exp.amount)}
            </span>
          </div>

          <div className="flex justify-between items-end">
            <div className="text-xs md:text-base text-gray-400 w-full">
              <p>
                <span className="font-medium text-gray-600">{payerName}</span>{" "}
                trả • {format(new Date(exp.date), "dd/MM")}
              </p>
              <div className="text-gray-400 truncate max-w-[200px] md:max-w-full mt-1 mb-2">
                Với: {names}
              </div>

              <div className="flex gap-3 mb-2">
                {exp.billImage && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewingImage(exp.billImage);
                    }}
                    className="flex items-center gap-1 text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold border border-blue-100 cursor-pointer"
                  >
                    <ImageIcon size={12} />
                    <span>Hóa đơn</span>
                  </div>
                )}
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setCommentModalData(exp);
                  }}
                  className="flex items-center gap-1 text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-bold border border-gray-200 cursor-pointer"
                >
                  <MessageSquare size={12} />
                  <span>{exp.comments?.length || 0} bình luận</span>
                </div>
              </div>

              {groupId && (
                <div className="flex flex-wrap gap-2 mt-1">
                  {exp.sharedWith.map((id) => {
                    const p = currentContextPeople.find(
                      (person) => person.id === id,
                    );
                    if (!p) return null;
                    const isSettled = exp.settledBy?.includes(id);
                    return (
                      <button
                        key={id}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSettled(exp.id, id);
                        }}
                        className={`text-[10px] px-2.5 py-1 rounded-full border flex items-center gap-1.5 transition-all font-bold ${
                          isSettled
                            ? "bg-green-100 border-green-200 text-green-700"
                            : "bg-gray-50 border-gray-200 text-gray-400"
                        }`}
                      >
                        {isSettled ? (
                          <CheckCircle2 size={12} strokeWidth={3} />
                        ) : (
                          <Circle size={12} />
                        )}
                        {p.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            {!isMobile && groupId && (
              <div
                className="flex gap-2 ml-4 shrink-0 hidden md:flex opacity-0 group-hover:opacity-100"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditModal(exp);
                  }}
                  className="text-gray-400 hover:text-blue-500 bg-gray-50 p-2 rounded-lg border border-gray-100"
                >
                  <Edit2 size={18} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setItemToDelete({ id: exp.id, groupId: exp.groupId });
                  }}
                  className="text-gray-400 hover:text-red-500 bg-gray-50 p-2 rounded-lg border border-gray-100"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [people, setPeople] = useState(
    () => JSON.parse(localStorage.getItem("sm_people")) || [],
  );
  const [expenses, setExpenses] = useState(
    () => JSON.parse(localStorage.getItem("sm_expenses")) || [],
  );

  const [sharingGroup, setSharingGroup] = useState(null);
  const [globalHistory, setGlobalHistory] = useState([]);
  // --- STATE MỚI CHO NHÓM ---
  const [groupId, setGroupId] = useState(
    localStorage.getItem("sm_group_id") || "",
  );
  const [itemToDelete, setItemToDelete] = useState(null);
  const [viewingImage, setViewingImage] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [user, setUser] = useState(null);
  const [globalFriendStats, setGlobalFriendStats] = useState([]);
  const [groupOwnerId, setGroupOwnerId] = useState(null);
  const [isGroupMode, setIsGroupMode] = useState(!!groupId);
  const [globalStats, setGlobalStats] = useState({
    netWorth: 0,
    totalOwed: 0,
    totalDebt: 0,
  });

  const [selectedIcon, setSelectedIcon] = useState("💰");
  const [loadingGlobal, setLoadingGlobal] = useState(false);
  // Thêm vào khu vực khai báo State
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [groupToRename, setGroupToRename] = useState(null); // Lưu nhóm đang chọn để đổi tên
  const [newNameInput, setNewNameInput] = useState("");
  // --- STATE MỚI CHO DANH SÁCH NHÓM ---
  const [myGroups, setMyGroups] = useState([]); // Danh sách nhóm của tôi
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

  const [commentModalData, setCommentModalData] = useState(null);
  // Thêm vào trong App
  const [tempMembers, setTempMembers] = useState([]); // Danh sách người chờ thêm khi tạo nhóm
  const [tempName, setTempName] = useState("");
  const [tempEmail, setTempEmail] = useState("");

  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobileView(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // --- AUTO-FIX BUG "me": CHUYỂN ĐỔI CHỮ "me" THÀNH UID CỦA CHỦ NHÓM ---
  useEffect(() => {
    if (!groupId || !expenses.length || !groupOwnerId) return;

    let needsUpdate = false;
    const fixedExpenses = expenses.map((exp) => {
      let newExp = { ...exp };
      let modified = false;

      // 1. Chuyển người trả tiền ("me") thành UID của trưởng nhóm
      if (newExp.payerId === "me") {
        newExp.payerId = groupOwnerId;
        modified = true;
      }

      // 2. Chuyển "me" trong danh sách người tham gia
      if (newExp.sharedWith?.includes("me")) {
        newExp.sharedWith = [
          ...new Set(
            newExp.sharedWith.map((id) => (id === "me" ? groupOwnerId : id)),
          ),
        ];
        modified = true;
      }

      // 3. Chuyển "me" trong danh sách người đã trả nợ
      if (newExp.settledBy?.includes("me")) {
        newExp.settledBy = [
          ...new Set(
            newExp.settledBy.map((id) => (id === "me" ? groupOwnerId : id)),
          ),
        ];
        modified = true;
      }

      // 4. Chuyển "me" trong chia tiền chi tiết (Custom Shares)
      if (newExp.customShares && newExp.customShares["me"] !== undefined) {
        newExp.customShares[groupOwnerId] = newExp.customShares["me"];
        delete newExp.customShares["me"];
        modified = true;
      }

      if (modified) needsUpdate = true;
      return newExp;
    });

    // Cập nhật lại toàn bộ lên Firebase
    if (needsUpdate) {
      updateDoc(doc(db, "groups", groupId), { expenses: fixedExpenses })
        .then(() =>
          showToast("Đã tự động sửa lỗi hiển thị sai công nợ!", "success"),
        )
        .catch((e) => console.error("Lỗi fix data:", e));
    }
  }, [expenses, groupId, groupOwnerId]);

  // --- AUTO-MERGE: TỰ ĐỘNG GỘP THÀNH VIÊN TRÙNG LẶP TRONG NHÓM ---
  useEffect(() => {
    // Chỉ chạy khi đang ở trong nhóm và có dữ liệu
    if (!groupId || !people || people.length === 0) return;

    const emailMap = {};
    let needsUpdate = false;
    let newPeople = [...people];
    let newExpenses = [...expenses];

    people.forEach((p) => {
      if (!p.email) return; // Nếu không có email thì bỏ qua

      if (!emailMap[p.email]) {
        emailMap[p.email] = p;
      } else {
        // PHÁT HIỆN TRÙNG EMAIL TRONG CÙNG 1 NHÓM!
        needsUpdate = true;
        const existing = emailMap[p.email];

        // Xác định ai là tài khoản "Thật" (ưu tiên có Avatar hoặc ID dài hơn)
        let realId, fakeId;
        if (p.photoURL || p.id.length > existing.id.length) {
          realId = p.id;
          fakeId = existing.id;
          emailMap[p.email] = p; // Cập nhật người "thật" vào danh sách chuẩn
        } else {
          realId = existing.id;
          fakeId = p.id;
        }

        // 1. Gạch tên tài khoản ảo khỏi danh sách thành viên nhóm
        newPeople = newPeople.filter((m) => m.id !== fakeId);

        // 2. Chuyển toàn bộ tiền nợ, lịch sử chi tiêu từ ID ảo sang ID thật
        newExpenses = newExpenses.map((exp) => {
          let newExp = { ...exp };
          if (newExp.payerId === fakeId) newExp.payerId = realId; // Đổi người trả

          if (newExp.sharedWith?.includes(fakeId)) {
            newExp.sharedWith = [
              ...new Set(
                newExp.sharedWith.map((id) => (id === fakeId ? realId : id)),
              ),
            ];
          }
          if (newExp.settledBy?.includes(fakeId)) {
            newExp.settledBy = [
              ...new Set(
                newExp.settledBy.map((id) => (id === fakeId ? realId : id)),
              ),
            ];
          }
          if (
            newExp.customShares &&
            newExp.customShares[fakeId] !== undefined
          ) {
            newExp.customShares[realId] = newExp.customShares[fakeId];
            delete newExp.customShares[fakeId];
          }
          return newExp;
        });
      }
    });

    // Nếu có gộp, lưu ngay lên Firebase
    if (needsUpdate) {
      updateDoc(doc(db, "groups", groupId), {
        members: newPeople,
        expenses: newExpenses,
      })
        .then(() => {
          showToast("Hệ thống đã tự động gộp 2 tài khoản Thu Hà!", "success");
        })
        .catch((e) => console.error("Lỗi gộp:", e));
    }
  }, [people, expenses, groupId]);

  // --- THAY THẾ: LOGIC ĐỒNG BỘ REAL-TIME VỚI FIREBASE ---
  // Xóa hoặc comment lại các hàm fetchDataFromServer / saveDataToServer cũ
  useEffect(() => {
    setGroupOwnerId(null); // <--- THÊM DÒNG NÀY: Reset chủ nhóm cũ ngay lập tức
    if (!groupId) return;

    const unsub = onSnapshot(doc(db, "groups", groupId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setPeople(data.members || []);
        setExpenses(data.expenses || []);
        setGroupOwnerId(data.createdBy); // Cập nhật chủ nhóm mới

        localStorage.setItem("sm_people", JSON.stringify(data.members || []));
        localStorage.setItem(
          "sm_expenses",
          JSON.stringify(data.expenses || []),
        );
      }
    });

    return () => unsub();
  }, [groupId]);

  // --- HÀM XỬ LÝ KHI BẤM "XÓA NGAY" TRONG MODAL ---
  const handleConfirmDelete = async () => {
    if (itemToDelete) {
      // Gọi hàm xóa cũ của bạn
      await deleteExpense(itemToDelete.id, itemToDelete.groupId);
      // Đóng modal và reset
      setItemToDelete(null);
    }
  };

  const openRenameModal = (group) => {
    setGroupToRename(group);
    setNewNameInput(group.name);
    setIsRenameModalOpen(true);
  };

  // --- HÀM GỬI BÌNH LUẬN (ĐÃ FIX LỖI INVALID DOCUMENT REFERENCE) ---
  const handleSendCommentRaw = async (expenseId, text) => {
    if (!user) return showToast("Vui lòng đăng nhập để bình luận", "error");

    try {
      // 1. Xác định nhóm mục tiêu
      let targetGroupId = groupId;

      // Nếu đang ở Dashboard (không có groupId), lấy groupId từ chính expense đang mở modal
      if (!targetGroupId && commentModalData && commentModalData.groupId) {
        targetGroupId = commentModalData.groupId;
      }

      if (!targetGroupId) {
        console.error("Không tìm thấy Group ID cho giao dịch này:", expenseId);
        return showToast(
          "Lỗi: Không xác định được nhóm của giao dịch này.",
          "error",
        );
      }

      // 2. Tạo object comment
      const newComment = {
        userId: user.uid,
        userName: user.displayName || "Thành viên",
        userAvatar: user.photoURL || "",
        text: text,
        timestamp: new Date().toISOString(),
      };

      // 3. Update Firestore
      const groupRef = doc(db, "groups", targetGroupId); // Giờ chắc chắn targetGroupId đã có giá trị
      const groupSnap = await getDoc(groupRef);

      if (groupSnap.exists()) {
        const data = groupSnap.data();
        const updatedExpenses = data.expenses.map((e) => {
          if (e.id === expenseId) {
            return { ...e, comments: [...(e.comments || []), newComment] };
          }
          return e;
        });

        await updateDoc(groupRef, { expenses: updatedExpenses });

        // 4. Cập nhật UI Modal ngay lập tức
        const updatedExpense = updatedExpenses.find((e) => e.id === expenseId);

        // Cần giữ lại các thông tin phụ trợ (groupId, groupName...) để không bị lỗi khi render lại
        setCommentModalData({
          ...updatedExpense,
          groupId: targetGroupId,
          groupName: commentModalData.groupName, // Giữ lại tên nhóm
          _groupMembers: commentModalData._groupMembers, // Giữ lại thành viên để hiện avatar đúng
        });
      }
    } catch (error) {
      console.error(error);
      showToast("Lỗi gửi bình luận: " + error.message, "error");
    }
  };

  // --- HÀM 2: LƯU TÊN MỚI (Gắn vào nút Lưu trong Modal) ---
  const submitRenameGroup = async () => {
    if (!groupToRename || !newNameInput.trim()) return;
    try {
      await updateDoc(doc(db, "groups", groupToRename.id), {
        name: newNameInput,
        icon: selectedIcon, // Lưu icon mới chọn
      });

      // Cập nhật UI nhanh
      setMyGroups((prev) =>
        prev.map((g) =>
          g.id === groupToRename.id
            ? { ...g, name: newNameInput, icon: selectedIcon }
            : g,
        ),
      );

      showToast("Đã cập nhật thông tin nhóm", "success");
      setIsRenameModalOpen(false);
    } catch (e) {
      showToast("Lỗi cập nhật: " + e.message, "error");
    }
  };

  const handleLeaveGroup = async (groupIdToLeave) => {
    setConfirmDialog({
      isOpen: true,
      title: "Rời nhóm?",
      message: "Bạn sẽ không còn thấy nhóm này trong danh sách nữa.",
      onConfirm: async () => {
        try {
          // 1. Xóa nhóm khỏi danh sách 'joinedGroups' của User
          const newGroupList = myGroups.filter((g) => g.id !== groupIdToLeave);
          await setDoc(
            doc(db, "users", user.uid),
            { joinedGroups: newGroupList },
            { merge: true },
          );

          // 2. (Tuỳ chọn) Xóa User khỏi danh sách 'members' của Group
          // (Để danh sách thành viên trong nhóm sạch sẽ)
          const groupRef = doc(db, "groups", groupIdToLeave);
          const groupSnap = await getDoc(groupRef);
          if (groupSnap.exists()) {
            const gData = groupSnap.data();
            const newMembers = (gData.members || []).filter(
              (m) => m.id !== user.uid,
            );
            await updateDoc(groupRef, { members: newMembers });
          }

          // 3. Cập nhật UI
          setMyGroups(newGroupList);
          if (groupId === groupIdToLeave) {
            setGroupId("");
            setIsGroupMode(false);
            setGroupOwnerId(null);
          }
          showToast("Đã rời nhóm thành công", "success");
        } catch (e) {
          console.error(e);
          showToast("Lỗi khi rời nhóm", "error");
        }
      },
    });
  };

  // Hàm lưu dữ liệu lên Firebase (Dùng thay cho setPeople/setExpenses cục bộ)
  const syncToGroup = async (newPeople, newExpenses) => {
    if (!groupId) return;
    try {
      await updateDoc(doc(db, "groups", groupId), {
        members: newPeople,
        expenses: newExpenses,
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      // FIX LỖI: Nếu lỗi là "not-found" (do vừa xóa nhóm xong), thì bỏ qua không báo lỗi đỏ lòm nữa
      if (e.code === "not-found") {
        console.log("Nhóm đã bị xóa, ngừng đồng bộ.");
        return;
      }
      console.error("Lỗi đồng bộ:", e);
      // Không showToast lỗi này để tránh user hoang mang khi xóa nhóm
    }
  };

  // --- AUTH STATES ---
  const [isSyncing, setIsSyncing] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  // --- UI STATES ---
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedPersonId, setSelectedPersonId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  // States cho thêm người (Có thêm email)
  const [newPersonName, setNewPersonName] = useState("");
  const [newPersonEmail, setNewPersonEmail] = useState(""); // <--- MỚI

  const [toast, setToast] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    message: "",
    onConfirm: null,
  });

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // --- REQUEST NOTIFICATION PERMISSION ---
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      PushNotifications.requestPermissions().then((result) => {
        if (result.receive === "granted") {
          PushNotifications.register();
        }
      });

      PushNotifications.addListener("registration", (token) => {
        console.log("Push registration success, token: " + token.value);
        // Lưu token này lên server nếu muốn nhận thông báo từ xa
      });

      // Tìm đoạn listener "registration" và sửa lại thế này:
      PushNotifications.addListener("registration", async (token) => {
        console.log("Thiết bị đã cấp Token:", token.value);

        if (auth.currentUser) {
          const uid = auth.currentUser.uid;

          // 1. Cập nhật Firestore
          await setDoc(
            doc(db, "users", uid),
            { fcmToken: token.value },
            { merge: true },
          );

          // 2. [QUAN TRỌNG]: ÉP ĐỒNG BỘ SANG CLOUDFLARE KV
          try {
            // Lấy dữ liệu hiện tại từ Cloudflare
            const res = await fetch(`${API_URL}?uid=${uid}`);
            let userData = { people: [], expenses: [] };
            if (res.ok) {
              userData = await res.json();
            }

            // Kiểm tra nếu Token trong KV khác với Token máy vừa cấp thì mới update
            if (userData.fcmToken !== token.value) {
              await fetch(`${API_URL}?uid=${uid}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...userData, fcmToken: token.value }),
              });
              console.log(
                "Đã vá lỗi thiếu Token trên Cloudflare KV thành công!",
              );
            }
          } catch (e) {
            console.error("Lỗi khi vá Token sang Cloudflare:", e);
          }
        }
      });

      PushNotifications.addListener(
        "pushNotificationReceived",
        (notification) => {
          playBuzzSound(); // <--- GỌI ÂM THANH Ở ĐÂY (MÁY NGƯỜI NHẬN SẼ KÊU)
          showToast(`Buzz: ${notification.title || "Bạn bị đòi nợ!"}`, "buzz");
        },
      );
    }
  }, []);

  // --- LOGIC TÍNH TOÁN TỔNG HỢP & LỊCH SỬ TOÀN CỤC ---
  useEffect(() => {
    if (!user || groupId) return;

    if (myGroups.length === 0) {
      setGlobalFriendStats([]);
      setGlobalHistory([]); // Reset lịch sử
      setGlobalStats({ netWorth: 0, totalOwed: 0, totalDebt: 0 });
      return;
    }

    const calculateGlobal = async () => {
      setLoadingGlobal(true);

      const friendMap = {};
      let totalOwed = 0;
      let totalDebt = 0;
      let allExpenses = []; // Mảng chứa tất cả giao dịch

      for (const group of myGroups) {
        try {
          const groupRef = doc(db, "groups", group.id);
          const snap = await getDoc(groupRef);

          if (snap.exists()) {
            const data = snap.data();
            const gExpenses = data.expenses || [];
            const gMembers = data.members || [];

            // 1. GOM GIAO DỊCH VÀO LIST CHUNG
            // Ta cần gắn thêm 'members' của nhóm đó vào expense để hiển thị đúng tên
            const enrichedExpenses = gExpenses.map((e) => ({
              ...e,
              groupId: group.id, // <--- THÊM DÒNG NÀY (QUAN TRỌNG)
              groupName: data.name,
              _groupMembers: gMembers,
            }));
            allExpenses = [...allExpenses, ...enrichedExpenses];

            // 2. TÍNH TOÁN CÔNG NỢ (Logic cũ giữ nguyên)
            const groupDebts = {};
            gExpenses.forEach((exp) => {
              const amount = parseFloat(exp.amount);
              const payerId = exp.payerId === "me" ? user.uid : exp.payerId;

              const getShare = (uid) => {
                if (exp.type === "custom")
                  return parseFloat(exp.customShares?.[uid] || 0);

                let count = exp.sharedWith.length; // <--- BẠN ĐANG CÓ DÒNG NÀY

                // --- HÃY DÁN ĐOẠN FIX VÀO NGAY SAU DÒNG TRÊN ---
                if (exp.type === "full") {
                  const realPayerId =
                    exp.payerId === "me" ? user?.uid : exp.payerId;
                  const validDebtors = exp.sharedWith.filter((id) => {
                    const realId = id === "me" ? user?.uid : id;
                    return realId !== realPayerId;
                  });
                  count = validDebtors.length;
                }
                if (count === 0) return 0;
                // ------------------------------------------------

                return amount / count;
              };

              if (payerId === user.uid) {
                exp.sharedWith.forEach((debtorId) => {
                  if (
                    debtorId !== user.uid &&
                    !exp.settledBy?.includes(debtorId)
                  ) {
                    groupDebts[debtorId] =
                      (groupDebts[debtorId] || 0) + getShare(debtorId);
                  }
                });
              } else if (exp.sharedWith.includes(user.uid)) {
                if (!exp.settledBy?.includes(user.uid)) {
                  groupDebts[payerId] =
                    (groupDebts[payerId] || 0) - getShare(user.uid);
                }
              }
            });

            Object.keys(groupDebts).forEach((memId) => {
              const amount = groupDebts[memId];
              if (Math.abs(amount) < 1) return;
              const memInfo = gMembers.find((m) => m.id === memId);
              if (memInfo) {
                const key = memInfo.email || memInfo.name;
                if (!friendMap[key]) {
                  friendMap[key] = {
                    name: memInfo.name,
                    email: memInfo.email,
                    amount: 0,
                    avatar: memInfo.photoURL,
                  };
                }
                friendMap[key].amount += amount;
              }
            });
          }
        } catch (err) {
          console.error("Lỗi tính toán nhóm:", group.id, err);
        }
      }

      // 3. LỌC VÀ SẮP XẾP LỊCH SỬ (CHỈ LẤY GIAO DỊCH CÓ MẶT TÔI)
      const myRelatedExpenses = allExpenses.filter(
        (e) =>
          e.payerId === user.uid ||
          (e.sharedWith && e.sharedWith.includes(user.uid)),
      );
      myRelatedExpenses.sort((a, b) => new Date(b.date) - new Date(a.date));
      setGlobalHistory(myRelatedExpenses);

      // 4. Update Stats
      const statsArray = Object.values(friendMap).sort(
        (a, b) => b.amount - a.amount,
      );
      statsArray.forEach((item) => {
        if (item.amount > 0) totalOwed += item.amount;
        else totalDebt += Math.abs(item.amount);
      });

      setGlobalFriendStats(statsArray);
      setGlobalStats({ netWorth: totalOwed - totalDebt, totalOwed, totalDebt });
      setLoadingGlobal(false);
    };

    calculateGlobal();
  }, [user, groupId, myGroups]);

  // --- AUTH + SYNC ---
  useEffect(() => {
    const safetyTimer = setTimeout(() => {
      setAuthLoading((prev) => {
        if (prev) {
          console.log("Auth timeout - Force loading false");
          return false;
        }
        return prev;
      });
    }, 4000);

    // [SỬA]: Thêm async vào đây
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      clearTimeout(safetyTimer);
      setUser(currentUser);
      setAuthLoading(false);
      if (currentUser) {
        // [QUAN TRỌNG NHẤT]: Lưu thông tin user lên Firestore để hệ thống nhận diện được email và avatar
        try {
          await setDoc(
            doc(db, "users", currentUser.uid),
            {
              email: currentUser.email,
              displayName: currentUser.displayName || "",
              photoURL: currentUser.photoURL || "", // Lưu avatar
            },
            { merge: true },
          );
        } catch (error) {
          console.error("Lỗi lưu thông tin user lên DB: ", error);
        }

        fetchDataFromServer(currentUser.uid);

        // ==========================================
        // ---> THÊM ĐOẠN NÀY: ÉP LẤY TOKEN SAU KHI ĐĂNG NHẬP <---
        // ==========================================
        if (Capacitor.isNativePlatform()) {
          PushNotifications.requestPermissions().then((result) => {
            if (result.receive === "granted") {
              PushNotifications.register();
            }
          });
        }
        // ==========================================
      }
    });
    return () => {
      clearTimeout(safetyTimer);
      unsubscribe();
    };
  }, []);

  // useEffect(() => {
  //   localStorage.setItem("sm_people", JSON.stringify(people));

  //   // NẾU CÓ NHÓM -> LƯU FIREBASE. KHÔNG THÌ LƯU SERVER CŨ
  //   if (groupId) {
  //     syncToGroup(people, expenses);
  //   } else if (user && !isSyncing) {
  //     saveDataToServer(); // Logic cũ
  //   }
  // }, [people]); // Chú ý: Cần sync cả khi expenses thay đổi, nên gộp logic hoặc sửa cả 2 effect

  // useEffect(() => {
  //   localStorage.setItem("sm_expenses", JSON.stringify(expenses));

  //   if (groupId) {
  //     syncToGroup(people, expenses);
  //   } else if (user && !isSyncing) {
  //     saveDataToServer();
  //   }
  // }, [expenses]);

  // --- CHECK URL ĐỂ JOIN NHÓM ---
  useEffect(() => {
    // Lấy params từ URL
    const params = new URLSearchParams(window.location.search);
    const joinCode = params.get("join");

    if (joinCode && user) {
      // Chỉ join nếu đã đăng nhập
      // Nếu đang ở nhóm khác hoặc chưa vào nhóm này
      if (groupId !== joinCode) {
        handleJoinGroup(joinCode);
        // Xóa param trên thanh địa chỉ cho gọn
        window.history.replaceState({}, document.title, "/");
      }
    } else if (joinCode && !user) {
      // Nếu chưa đăng nhập -> Mở modal login
      showToast("Vui lòng đăng nhập để tham gia nhóm!", "info");
      setIsLoginModalOpen(true);
      // Lưu mã lại để sau khi login xong thì xử lý (Logic nâng cao, tạm thời bắt user bấm lại link)
    }
  }, [user]); // Chạy lại khi user thay đổi trạng thái đăng nhập

  const fetchDataFromServer = async (uid) => {
    setIsSyncing(true);
    try {
      const res = await fetch(`${API_URL}?uid=${uid}`);
      if (res.ok) {
        const data = await res.json();

        // KIỂM TRA DỮ LIỆU TRÊN CLOUD
        if (data.people && data.people.length > 0) {
          // TRƯỜNG HỢP 1: Server có dữ liệu -> TỰ ĐỘNG LẤY VỀ (Server Wins)
          // Đã xóa bỏ window.confirm để không hỏi nữa

          setPeople(data.people);
          setExpenses(data.expenses);

          // Mẹo: Nếu bạn không dùng useEffect để tự lưu khi state thay đổi,
          // thì nên thêm dòng lưu vào localStorage ở đây để chắc ăn:
          localStorage.setItem("sm_people", JSON.stringify(data.people));
          if (data.expenses)
            localStorage.setItem("sm_expenses", JSON.stringify(data.expenses));

          console.log("Đã tự động đồng bộ dữ liệu mới nhất từ Cloud.");
        } else {
          // TRƯỜNG HỢP 2: Server trống trơn -> TỰ ĐỘNG ĐẨY LÊN
          // (Ví dụ: Lần đầu dùng Cloud hoặc server bị reset)
          saveDataToServer();
          console.log("Server trống, đang đẩy dữ liệu từ máy lên.");
        }
      }
    } catch (error) {
      console.error("Lỗi khi đồng bộ:", error);
      // Lỗi mạng thì thôi, cứ dùng dữ liệu cũ ở máy, không làm gì cả.
    } finally {
      setIsSyncing(false);
    }
  };

  const handleShareGroup = () => {
    const joinUrl = `${window.location.origin}?join=${groupId}`;

    // Kiểm tra nếu trình duyệt hỗ trợ chia sẻ native (cho Mobile)
    if (navigator.share) {
      navigator
        .share({
          title: "Vào nhóm chia tiền!",
          text: `Tham gia nhóm "${
            myGroups.find((g) => g.id === groupId)?.name
          }" trên Split Money nhé!`,
          url: joinUrl,
        })
        .catch(() => {
          // Nếu user hủy chia sẻ hoặc lỗi, copy vào clipboard thay thế
          navigator.clipboard.writeText(joinUrl);
          showToast("Đã copy link mời!", "success");
        });
    } else {
      navigator.clipboard.writeText(joinUrl);
      showToast("Đã copy link mời!", "success");
    }
  };

  // --- EFFECT: TẢI DANH SÁCH NHÓM CỦA USER ---
  useEffect(() => {
    if (!user) {
      setMyGroups([]);
      setContacts([]);
      setFriendRequests([]); // Reset
      return;
    }
    const unsub = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const userData = docSnap.data();
        setMyGroups(userData.joinedGroups || []);
        setContacts(userData.contacts || []);
        setFriendRequests(userData.friendRequests || []); // <--- THÊM DÒNG NÀY
      }
    });
    return () => unsub();
  }, [user]);

  // --- HÀM TẠO NHÓM MỚI (ĐÃ FIX: THÊM THÀNH VIÊN ĐÃ CHỌN) ---
  const handleCreateNewGroup = async () => {
    if (!newGroupName.trim() || !user) return;

    const newGroupId = uuidv4().slice(0, 8).toUpperCase();
    // [FIX 1] Lưu icon vào thông tin nhóm rút gọn (để hiển thị ở Sidebar/Dashboard)
    const groupInfo = {
      id: newGroupId,
      name: newGroupName,
      icon: selectedIcon,
    };

    // 1. Chuẩn bị dữ liệu Người tạo (Owner)
    const ownerData = {
      id: user.uid,
      name: user.displayName || "Chủ nhóm",
      email: user.email || "",
      photoURL: user.photoURL || null,
      role: "owner",
    };

    try {
      // 2. Xử lý danh sách thành viên đã chọn (tempMembers)
      // Chúng ta cần kiểm tra xem họ có tài khoản thật không để link UID
      const finalMembers = [ownerData]; // Bắt đầu với chủ nhóm

      // Duyệt qua từng người được chọn
      for (const temp of tempMembers) {
        let memberToAdd = {
          id: temp.id, // Mặc định dùng ID ảo từ danh bạ
          name: temp.name,
          email: temp.email,
          photoURL: "",
          role: "member",
        };

        // Nếu có email, đi tìm tài khoản thật trên hệ thống
        if (temp.email) {
          const usersRef = collection(db, "users");
          const q = query(usersRef, where("email", "==", temp.email));
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            // TÌM THẤY TÀI KHOẢN THẬT
            const userDoc = querySnapshot.docs[0];
            const realUser = userDoc.data();
            const realUid = userDoc.id;

            // Update thông tin thật
            memberToAdd = {
              ...memberToAdd,
              id: realUid, // Dùng UID thật
              name: realUser.displayName || temp.name,
              photoURL: realUser.photoURL || "",
            };

            // --- ĐỒNG BỘ NGƯỢC: Thêm nhóm vào danh sách của họ ---
            await updateDoc(doc(db, "users", realUid), {
              joinedGroups: arrayUnion(groupInfo),
            });
          }
        }
        finalMembers.push(memberToAdd);
      }

      // 3. Tạo document Group trên Firestore
      await setDoc(doc(db, "groups", newGroupId), {
        name: newGroupName,
        icon: selectedIcon, // [FIX 2] Lưu icon vào document chính
        members: finalMembers,
        expenses: [],
        createdAt: new Date().toISOString(),
        createdBy: user.uid,
      });

      // 4. Thêm nhóm vào danh sách của TÔI
      await setDoc(
        doc(db, "users", user.uid),
        { joinedGroups: arrayUnion(groupInfo) },
        { merge: true },
      );

      // 5. Reset các ô nhập và đóng Modal (KHÔNG gọi setMyGroups ở đây)
      setGroupId(newGroupId);
      setIsGroupMode(true);
      setIsCreateGroupModalOpen(false);
      setTempMembers([]);
      setNewGroupName("");
      setSelectedIcon("💰"); // Reset luôn icon về mặc định

      showToast(
        `Tạo nhóm thành công với ${finalMembers.length} thành viên!`,
        "success",
      );
    } catch (error) {
      console.error(error);
      showToast("Lỗi tạo nhóm: " + error.message, "error");
      // BỎ LUÔN phần rollback setMyGroups ở đây vì ta không thêm thủ công nữa
    }
  };

  // ... (Code cũ: const handleCreateNewGroup = ...)

  // --- [MỚI] HÀM XỬ LÝ THANH TOÁN & QUẢN LÝ NHÓM ---

  const toggleSettled = async (expenseId, personId) => {
    const expense = expenses.find((e) => e.id === expenseId);
    if (!expense) return;

    const settledBy = expense.settledBy || [];
    const isSettled = settledBy.includes(personId);

    // Toggle trạng thái: Nếu có rồi thì bỏ ra, chưa có thì thêm vào
    const newSettledBy = isSettled
      ? settledBy.filter((id) => id !== personId)
      : [...settledBy, personId];

    const newExpenses = expenses.map((e) =>
      e.id === expenseId ? { ...e, settledBy: newSettledBy } : e,
    );

    // Lưu ngay lập tức
    setExpenses(newExpenses);
    await syncToGroup(people, newExpenses);

    showToast(
      isSettled ? "Đã hủy xác nhận" : "Đã xác nhận trả tiền",
      "success",
    );
  };

  const handleUpdateGroupName = async (groupIdToUpdate, newName) => {
    if (!newName.trim()) return;
    try {
      // 1. Cập nhật tên trong collection 'groups'
      await updateDoc(doc(db, "groups", groupIdToUpdate), { name: newName });

      // 2. Cập nhật tên hiển thị ở Sidebar (Optimistic Update)
      setMyGroups((prev) =>
        prev.map((g) =>
          g.id === groupIdToUpdate ? { ...g, name: newName } : g,
        ),
      );

      // 3. (Tuỳ chọn) Cập nhật trong profile User trên Firebase nếu cần thiết
      // Lưu ý: Để đồng bộ hoàn hảo, cần updateDoc vào users/{uid}, nhưng cập nhật UI trước cho nhanh.

      showToast("Đã đổi tên nhóm", "success");
    } catch (e) {
      console.error(e);
      showToast("Lỗi khi đổi tên", "error");
    }
  };

  // --- HÀM XÓA NHÓM (FIX LỖI CHECK QUYỀN MOBILE) ---
  const handleDeleteGroup = async (groupIdToDelete) => {
    if (!user) {
      showToast("Vui lòng đăng nhập!", "error");
      return;
    }

    try {
      // 1. Lấy dữ liệu nhóm trực tiếp từ Firestore để kiểm tra quyền
      // (Vì khi vuốt xóa ở ngoài danh sách, biến groupOwnerId chưa kịp load)
      const groupRef = doc(db, "groups", groupIdToDelete);
      const groupSnap = await getDoc(groupRef);

      if (!groupSnap.exists()) {
        showToast("Nhóm này không tồn tại hoặc đã bị xóa!", "error");
        // Xóa luôn khỏi danh sách hiển thị cho sạch
        setMyGroups((prev) => prev.filter((g) => g.id !== groupIdToDelete));
        return;
      }

      const groupData = groupSnap.data();

      // 2. Kiểm tra: ID người tạo (createdBy) có trùng với User hiện tại không?
      if (groupData.createdBy !== user.uid) {
        showToast("Chỉ trưởng nhóm mới có quyền xóa!", "error");
        return;
      }

      // 3. Nếu đúng quyền -> Mở hộp thoại xác nhận
      setConfirmDialog({
        isOpen: true,
        title: "Xóa vĩnh viễn nhóm?",
        message: `Bạn có chắc muốn xóa nhóm "${groupData.name}"? Hành động này không thể hoàn tác.`,
        onConfirm: async () => {
          try {
            // A. Xóa document nhóm trong collection 'groups'
            await deleteDoc(groupRef);

            // B. Xóa nhóm khỏi danh sách 'joinedGroups' của User hiện tại trên Server
            const newGroupList = myGroups.filter(
              (g) => g.id !== groupIdToDelete,
            );

            await setDoc(
              doc(db, "users", user.uid),
              { joinedGroups: newGroupList },
              { merge: true },
            );

            // C. CẬP NHẬT GIAO DIỆN
            // Lưu ý: Nếu bạn có onSnapshot đang lắng nghe joinedGroups,
            // thì KHÔNG NÊN gọi setMyGroups(newGroupList) ở đây để tránh lỗi trùng Key.
            // Nếu không dùng onSnapshot thì giữ lại dòng dưới:
            setMyGroups(newGroupList);

            // Điều hướng nếu đang xem nhóm vừa xóa
            if (groupId === groupIdToDelete) {
              setGroupId("");
              setIsGroupMode(false);
              setGroupOwnerId(null);
              setActiveTab("dashboard");
            }

            showToast("Đã xóa nhóm thành công", "success");

            // D. ĐÓNG POPUP
            setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
          } catch (e) {
            console.error("Lỗi xóa nhóm:", e);
            showToast("Lỗi khi xóa nhóm: " + e.message, "error");

            // Đóng popup kể cả khi lỗi
            setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
          }
        },
      });
    } catch (e) {
      console.error("Lỗi kiểm tra quyền:", e);
      showToast("Lỗi kết nối: " + e.message, "error");
    }
  };

  // --- HÀM 2: GIA NHẬP NHÓM BẰNG MÃ (PHIÊN BẢN MỚI) ---
  const handleJoinGroup = async (inputGroupId) => {
    if (!inputGroupId || !user) return; // Thêm check user
    const groupRef = doc(db, "groups", inputGroupId);
    const docSnap = await getDoc(groupRef);

    if (docSnap.exists()) {
      const groupData = docSnap.data();

      // LOGIC MỚI: Thêm nhóm vào danh sách của User để hiện ở Sidebar
      await setDoc(
        doc(db, "users", user.uid),
        {
          joinedGroups: arrayUnion({
            id: inputGroupId,
            name: groupData.name || "Nhóm không tên",
          }),
        },
        { merge: true },
      );

      // Thêm User vào danh sách members của Group (nếu chưa có)
      const currentMembers = groupData.members || [];
      const isMember = currentMembers.find((m) => m.id === user.uid);

      if (!isMember) {
        await updateDoc(groupRef, {
          members: arrayUnion({
            id: user.uid,
            name: user.displayName,
            email: user.email,
            photoURL: user.photoURL,
          }),
        });
      }

      setGroupId(inputGroupId);
      setIsGroupMode(true);
      showToast("Đã vào nhóm!", "success");
    } else {
      showToast("Mã nhóm không tồn tại!", "error");
    }
  };

  const saveDataToServer = async () => {
    if (!user) return;
    try {
      const payload = JSON.stringify({ people, expenses });
      await fetch(`${API_URL}?uid=${user.uid}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
      });
    } catch (error) {
      console.error("Save failed", error);
    }
  };

  // --- HÀM ĐĂNG XUẤT (ĐÃ FIX: DỌN SẠCH DỮ LIỆU THÀNH BẢNG TRẮNG) ---
  const handleLogout = async () => {
    try {
      // 1. Đăng xuất khỏi Firebase
      await signOut(auth);

      // 2. Xóa dữ liệu user và đóng modal
      setUser(null);
      setIsProfileOpen(false);

      // 3. Đưa tất cả các state hiển thị trên màn hình về số 0 / mảng rỗng
      setPeople([]);
      setExpenses([]);
      setGroupId("");
      setIsGroupMode(false);
      setMyGroups([]);
      setContacts([]);
      setGlobalHistory([]);
      setGlobalFriendStats([]);
      setGlobalStats({ netWorth: 0, totalOwed: 0, totalDebt: 0 });
      setActiveTab("dashboard");

      // 4. Quét sạch bộ nhớ đệm (Local Storage) lưu trên máy
      localStorage.removeItem("sm_people");
      localStorage.removeItem("sm_expenses");
      localStorage.removeItem("sm_group_id");

      showToast("Đã đăng xuất an toàn và xóa dữ liệu cục bộ.", "info");
    } catch (error) {
      console.error("Lỗi đăng xuất:", error);
      showToast("Lỗi khi đăng xuất!", "error");
    }
  };

  const showToast = (message, type = "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // --- LOGIC TÍNH TOÁN CÔNG NỢ (ĐÃ CẬP NHẬT SETTLEMENT) ---
  const calculateNetDebt = (personId) => {
    if (!user) return 0;
    let balance = 0; // Dương = Họ nợ mình, Âm = Mình nợ họ

    expenses.forEach((exp) => {
      const amount = parseFloat(exp.amount);
      const payerId = exp.payerId || "me";
      const settledBy = exp.settledBy || [];

      const getShareOf = (uid) => {
        if (exp.type === "custom") {
          return parseFloat(exp.customShares?.[uid] || 0);
        } else {
          let count = exp.sharedWith.length;
          if (exp.type === "full") {
            const realPayerId = exp.payerId === "me" ? user?.uid : exp.payerId;
            const validDebtors = exp.sharedWith.filter((id) => {
              const realId = id === "me" ? user?.uid : id;
              return realId !== realPayerId;
            });
            count = validDebtors.length;
          }
          if (count === 0) return 0;
          return amount / count;
        }
      };

      // CHỈ TÍNH TOÁN NẾU GIAO DỊCH NÀY TRỰC TIẾP GIỮA TÔI VÀ PERSON_ID
      if (payerId === user.uid) {
        // TÔI trả tiền -> Kiểm tra xem PersonId có nợ tôi không
        if (
          exp.sharedWith.includes(personId) &&
          !settledBy.includes(personId)
        ) {
          balance += getShareOf(personId);
        }
      } else if (payerId === personId) {
        // PERSON_ID trả tiền -> Kiểm tra xem Tôi có nợ họ không
        if (
          exp.sharedWith.includes(user.uid) &&
          !settledBy.includes(user.uid)
        ) {
          balance -= getShareOf(user.uid);
        }
      }
    });

    return balance;
  };

  const sortedPeople = useMemo(
    () =>
      [...people].sort((a, b) => {
        const debtA = calculateNetDebt(a.id);
        const debtB = calculateNetDebt(b.id);
        if (debtA < 0 && debtB >= 0) return -1;
        if (debtA >= 0 && debtB < 0) return 1;
        if (debtA < 0 && debtB < 0) return debtA - debtB;
        return debtB - debtA;
      }),
    [people, expenses],
  );

  // --- [FIX LOGIC] TÍNH TOÁN SONG PHƯƠNG (GIỐNG GLOBAL DASHBOARD) ---
  // --- [FIX LOGIC] TÍNH TOÁN SONG PHƯƠNG (GIỐNG GLOBAL DASHBOARD) ---
  const groupStats = useMemo(() => {
    if (!user || !groupId) return { net: 0, receivable: 0, payable: 0 };

    let totalRec = 0;
    let totalPay = 0;

    // Duyệt qua từng thành viên KHÁC trong nhóm
    people.forEach((p) => {
      if (p.id === user.uid) return; // Bỏ qua chính mình

      let bilateral = 0; // > 0: Họ nợ mình | < 0: Mình nợ họ

      expenses.forEach((exp) => {
        const amount = parseFloat(exp.amount);
        const payerId = exp.payerId === "me" ? user.uid : exp.payerId;

        // Helper tính phần tiền
        const getShare = (uid) => {
          if (exp.type === "custom")
            return parseFloat(exp.customShares?.[uid] || 0);

          let count = exp.sharedWith.length; // <--- BẠN ĐANG CÓ DÒNG NÀY

          // --- HÃY DÁN ĐOẠN FIX VÀO NGAY SAU DÒNG TRÊN ---
          if (exp.type === "full") {
            const realPayerId = exp.payerId === "me" ? user?.uid : exp.payerId;
            const validDebtors = exp.sharedWith.filter((id) => {
              const realId = id === "me" ? user?.uid : id;
              return realId !== realPayerId;
            });
            count = validDebtors.length;
          }
          if (count === 0) return 0;
          // ------------------------------------------------

          return amount / count;
        };

        // 1. TÔI trả tiền, P tham gia -> P nợ tôi (+)
        if (payerId === user.uid) {
          if (exp.sharedWith.includes(p.id) && !exp.settledBy?.includes(p.id)) {
            bilateral += getShare(p.id);
          }
        }

        // 2. P trả tiền, TÔI tham gia -> Tôi nợ P (-)
        if (payerId === p.id) {
          if (
            exp.sharedWith.includes(user.uid) &&
            !exp.settledBy?.includes(user.uid)
          ) {
            bilateral -= getShare(user.uid);
          }
        }
      });

      // Cộng dồn riêng biệt (Không bù trừ)
      if (bilateral > 0) totalRec += bilateral;
      if (bilateral < 0) totalPay += Math.abs(bilateral);
    });

    return {
      net: totalRec - totalPay,
      receivable: totalRec,
      payable: totalPay,
    };
  }, [people, expenses, user, groupId]);

  // --- BIẾN HIỂN THỊ (TỰ ĐỘNG SWITCH GIỮA GROUP VÀ GLOBAL) ---
  const displayNetBalance = groupId ? groupStats.net : globalStats.netWorth;
  const displayReceivable = groupId
    ? groupStats.receivable
    : globalStats.totalOwed;
  const displayPayable = groupId ? groupStats.payable : globalStats.totalDebt;

  const [editingContact, setEditingContact] = useState(null);

  // --- 1. GỬI LỜI MỜI KẾT BẠN ---
  const sendFriendRequest = async () => {
    const emailToSearch = newPersonEmail.trim();
    if (!emailToSearch)
      return showToast("Vui lòng nhập Email để tìm kiếm!", "error");
    if (emailToSearch === user.email)
      return showToast("Không thể tự kết bạn với chính mình!", "error");

    try {
      // Tìm user trên hệ thống
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", emailToSearch));
      const snap = await getDocs(q);

      if (snap.empty) {
        return showToast(
          "Không tìm thấy tài khoản nào với Email này!",
          "error",
        );
      }

      const targetUid = snap.docs[0].id;

      // Kiểm tra xem đã là bạn bè chưa
      if (contacts.some((c) => c.id === targetUid)) {
        return showToast("Hai bạn đã là bạn bè rồi!", "info");
      }

      // Đẩy lời mời vào hộp thư của người kia
      const requestData = {
        id: user.uid,
        name: user.displayName || user.email.split("@")[0],
        email: user.email,
        photoURL: user.photoURL || "",
        timestamp: new Date().toISOString(),
      };

      await updateDoc(doc(db, "users", targetUid), {
        friendRequests: arrayUnion(requestData),
      });

      showToast("Đã gửi lời mời kết bạn!", "success");
      setNewPersonEmail(""); // Xóa ô nhập
    } catch (e) {
      console.error(e);
      showToast("Lỗi gửi lời mời: " + e.message, "error");
    }
  };

  // --- 2. CHẤP NHẬN LỜI MỜI (ĐỒNG BỘ TOÀN DIỆN DANH BẠ & NHÓM CŨ) ---
  const handleAcceptRequest = async (requester) => {
    if (!user) return;
    try {
      // A. Xóa khỏi danh sách chờ
      const updatedRequests = friendRequests.filter(
        (req) => req.id !== requester.id,
      );

      // B. XỬ LÝ DANH BẠ CỦA MÌNH (GỘP NẾU TRÙNG EMAIL)
      let myUpdatedContacts = [...contacts];
      const existingIndex = myUpdatedContacts.findIndex(
        (c) => c.email === requester.email,
      );
      let oldFakeId = null;

      const newContactForMe = {
        id: requester.id, // ID thật của Firebase
        name: requester.name,
        email: requester.email,
        photoURL: requester.photoURL || "",
        createdAt: new Date().toISOString(),
      };

      if (existingIndex >= 0) {
        oldFakeId = myUpdatedContacts[existingIndex].id; // Lưu lại ID ảo cũ để đi tìm trong các nhóm
        myUpdatedContacts[existingIndex] = {
          ...myUpdatedContacts[existingIndex],
          ...newContactForMe,
        };
      } else {
        myUpdatedContacts.push(newContactForMe);
      }

      await updateDoc(doc(db, "users", user.uid), {
        friendRequests: updatedRequests,
        contacts: myUpdatedContacts,
      });

      // C. XỬ LÝ DANH BẠ CỦA NGƯỜI KIA
      const requesterRef = doc(db, "users", requester.id);
      const requesterSnap = await getDoc(requesterRef);

      if (requesterSnap.exists()) {
        let requesterContacts = requesterSnap.data().contacts || [];
        const meIndexInTheirs = requesterContacts.findIndex(
          (c) => c.email === user.email,
        );

        const myInfoForThem = {
          id: user.uid,
          name: user.displayName || user.email.split("@")[0],
          email: user.email,
          photoURL: user.photoURL || "",
          createdAt: new Date().toISOString(),
        };

        if (meIndexInTheirs >= 0) {
          requesterContacts[meIndexInTheirs] = {
            ...requesterContacts[meIndexInTheirs],
            ...myInfoForThem,
          };
        } else {
          requesterContacts.push(myInfoForThem);
        }

        await updateDoc(requesterRef, { contacts: requesterContacts });
      }

      // ==========================================
      // D. NÂNG CẤP: ĐỒNG BỘ ID VÀO CÁC NHÓM CŨ ĐÃ THAM GIA
      // ==========================================
      // Nếu phát hiện ra có ID ảo cũ (nhập tay) và ID này khác với ID thật
      if (oldFakeId && oldFakeId !== requester.id) {
        // Duyệt qua tất cả các nhóm của bạn
        for (const g of myGroups) {
          const groupRef = doc(db, "groups", g.id);
          const groupSnap = await getDoc(groupRef);

          if (groupSnap.exists()) {
            const groupData = groupSnap.data();
            let members = groupData.members || [];
            let expenses = groupData.expenses || [];

            // Kiểm tra xem nhóm này có Thu Hà (ảo) không?
            const memberIndex = members.findIndex((m) => m.id === oldFakeId);

            if (memberIndex >= 0) {
              // 1. Cập nhật thành viên: Thay ID ảo bằng ID thật, cập nhật Avatar
              members[memberIndex] = {
                ...members[memberIndex],
                id: requester.id,
                photoURL: requester.photoURL || "",
                name: requester.name, // Lấy tên thật của họ
              };

              // 2. Cập nhật Lịch sử giao dịch: Tìm tất cả chỗ nào có ID ảo -> Đổi thành ID thật
              const updatedExpenses = expenses.map((exp) => {
                let newExp = { ...exp };

                // Đổi người trả tiền
                if (newExp.payerId === oldFakeId) newExp.payerId = requester.id;

                // Đổi người tham gia (chia tiền)
                if (
                  newExp.sharedWith &&
                  newExp.sharedWith.includes(oldFakeId)
                ) {
                  newExp.sharedWith = newExp.sharedWith.map((id) =>
                    id === oldFakeId ? requester.id : id,
                  );
                }

                // Đổi người đã xác nhận trả (settled)
                if (newExp.settledBy && newExp.settledBy.includes(oldFakeId)) {
                  newExp.settledBy = newExp.settledBy.map((id) =>
                    id === oldFakeId ? requester.id : id,
                  );
                }

                // Đổi Object chia tiền chi tiết (customShares)
                if (
                  newExp.customShares &&
                  newExp.customShares[oldFakeId] !== undefined
                ) {
                  newExp.customShares[requester.id] =
                    newExp.customShares[oldFakeId];
                  delete newExp.customShares[oldFakeId];
                }

                return newExp;
              });

              // 3. Lưu toàn bộ dữ liệu Nhóm mới lên Firebase
              await updateDoc(groupRef, {
                members: members,
                expenses: updatedExpenses,
              });

              // 4. BẮN NHÓM NÀY SANG CHO NGƯỜI KIA (Để họ thấy nhóm cũ ngay lập tức)
              const groupInfoForFriend = {
                id: g.id,
                name: groupData.name || "Nhóm",
                icon: groupData.icon || "💰",
              };

              await updateDoc(doc(db, "users", requester.id), {
                joinedGroups: arrayUnion(groupInfoForFriend),
              });
            }
          }
        }
      }

      showToast("Đã đồng bộ toàn bộ bạn bè và nhóm thành công!", "success");
    } catch (e) {
      console.error("Lỗi đồng bộ:", e);
      showToast("Lỗi: " + e.message, "error");
    }
  };

  // --- 3. TỪ CHỐI LỜI MỜI ---
  const handleDeclineRequest = async (requesterId) => {
    if (!user) return;
    try {
      const updatedRequests = friendRequests.filter(
        (req) => req.id !== requesterId,
      );
      await updateDoc(doc(db, "users", user.uid), {
        friendRequests: updatedRequests,
      });
      showToast("Đã từ chối lời mời", "info");
    } catch (e) {
      showToast("Lỗi: " + e.message, "error");
    }
  };

  // --- 2. HÀM CẬP NHẬT LIÊN HỆ (SỬA TÊN/EMAIL) ---
  // --- 2. HÀM CẬP NHẬT LIÊN HỆ (SỬA TÊN/EMAIL) ---
  const handleUpdateContact = async (updatedName, updatedEmail) => {
    if (!editingContact || !user) return;
    if (!updatedName.trim())
      return showToast("Tên không được để trống", "error");

    try {
      const updatedList = contacts.map((c) =>
        c.id === editingContact.id
          ? { ...c, name: updatedName, email: updatedEmail.trim() }
          : c,
      );

      // [SỬA LỖI]: Dùng setDoc với { merge: true } thay vì updateDoc
      await setDoc(
        doc(db, "users", user.uid),
        {
          contacts: updatedList,
        },
        { merge: true },
      );

      setContacts(updatedList);
      setEditingContact(null);
      showToast("Đã cập nhật thông tin!", "success");
    } catch (e) {
      console.error(e);
      showToast("Lỗi cập nhật: " + e.message, "error");
    }
  };

  // --- 3. HÀM XÓA LIÊN HỆ (MỚI) ---
  const handleDeleteContact = (contactId) => {
    setConfirmDialog({
      isOpen: true,
      title: "Xóa khỏi danh bạ?",
      message: "Bạn có chắc chắn muốn xóa người này khỏi danh bạ chung không?",
      onConfirm: async () => {
        if (!user) return;
        try {
          const updatedList = contacts.filter((c) => c.id !== contactId);

          await setDoc(
            doc(db, "users", user.uid),
            {
              contacts: updatedList,
            },
            { merge: true },
          );

          setContacts(updatedList);
          showToast("Đã xóa liên hệ!", "success");
          setConfirmDialog({ isOpen: false });
        } catch (e) {
          console.error(e);
          showToast("Lỗi khi xóa: " + e.message, "error");
          setConfirmDialog({ isOpen: false });
        }
      },
    });
  };

  // --- HÀM: XÁC NHẬN THANH TOÁN (BẢN FIX LỖI) ---
  const handleSettleAll = (targetPerson) => {
    if (!groupId || !user) return;

    // Helper: Kiểm tra xem giao dịch này có phải do "Mình" trả không
    // Chấp nhận cả ID thật và chữ "me" (tương thích dữ liệu cũ)
    const isPayerMe = (payerId) => payerId === user.uid || payerId === "me";

    // 1. Tìm tất cả các khoản họ đang nợ mình
    const pendingExpenses = expenses.filter(
      (e) =>
        isPayerMe(e.payerId) && // Mình trả tiền
        e.sharedWith.includes(targetPerson.id) && // Họ có tham gia
        !e.settledBy?.includes(targetPerson.id), // Họ chưa trả
    );

    if (pendingExpenses.length === 0) {
      // Debug log để bạn kiểm tra nếu vẫn lỗi
      console.log("Debug Nợ:", {
        myId: user.uid,
        targetId: targetPerson.id,
        totalExpenses: expenses.length,
      });
      showToast("Không tìm thấy giao dịch nào cần thanh toán.", "info");
      return;
    }

    // 2. Mở hộp thoại xác nhận
    setConfirmDialog({
      isOpen: true,
      title: "Xác nhận thanh toán",
      message: `Xác nhận ${targetPerson.name} đã trả hết toàn bộ nợ cho bạn? (${pendingExpenses.length} giao dịch)`,
      onConfirm: async () => {
        try {
          // 3. Cập nhật trạng thái "đã trả" (settledBy)
          const updatedExpenses = expenses.map((e) => {
            if (
              isPayerMe(e.payerId) &&
              e.sharedWith.includes(targetPerson.id) &&
              !e.settledBy?.includes(targetPerson.id)
            ) {
              return {
                ...e,
                settledBy: [...(e.settledBy || []), targetPerson.id],
              };
            }
            return e;
          });

          // 4. Gửi lên Server
          await updateDoc(doc(db, "groups", groupId), {
            expenses: updatedExpenses,
          });

          showToast(`Đã xác nhận thanh toán xong!`, "success");

          // --- BỔ SUNG: Đóng Popup sau khi thành công ---
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        } catch (err) {
          console.error(err);
          showToast("Lỗi cập nhật: " + err.message, "error");

          // (Tùy chọn) Đóng Popup kể cả khi lỗi nếu bạn muốn
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // --- HÀM 2: CHỌN BẠN TỪ DANH BẠ ĐỂ THÊM VÀO NHÓM ---
  // --- HÀM THÊM THÀNH VIÊN VÀO NHÓM (CÓ ĐỒNG BỘ 2 CHIỀU & LẤY AVATAR THẬT) ---
  const addContactToGroup = async (contact) => {
    if (!groupId) return;

    // 1. Check xem đã có trong nhóm chưa
    if (people.some((p) => p.id === contact.id)) {
      return showToast("Người này đã ở trong nhóm rồi!", "info");
    }

    try {
      let realMemberData = {
        id: contact.id, // Giữ ID từ danh bạ (nếu contact này là user ảo)
        name: contact.name,
        email: contact.email,
        photoURL: "",
        role: "member",
      };

      // 2. TÌM KIẾM TÀI KHOẢN THẬT DỰA TRÊN EMAIL
      if (contact.email) {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", contact.email));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          // A. NẾU TÌM THẤY TÀI KHOẢN THẬT
          const userDoc = querySnapshot.docs[0];
          const userData = userDoc.data();
          const realUid = userDoc.id;

          // Cập nhật thông tin thành viên bằng thông tin thật từ account
          realMemberData = {
            id: realUid, // Dùng UID thật để liên kết
            name: userData.displayName || contact.name, // Ưu tiên tên hiển thị của họ
            email: userData.email,
            photoURL: userData.photoURL || "", // LẤY AVATAR THẬT CỦA HỌ
            role: "member",
          };

          // --- ĐỒNG BỘ NGƯỢC: THÊM NHÓM VÀO LIST CỦA HỌ ---
          // Để khi họ đăng nhập, họ sẽ thấy nhóm này ngay lập tức
          const groupInfoForFriend = {
            id: groupId,
            name: myGroups.find((g) => g.id === groupId)?.name || "Nhóm mới",
            role: "member",
          };

          await updateDoc(doc(db, "users", realUid), {
            joinedGroups: arrayUnion(groupInfoForFriend),
          });

          showToast(
            `Đã liên kết với tài khoản ${userData.displayName || "bạn bè"}!`,
            "success",
          );
        }
      }

      // 3. Thêm vào nhóm hiện tại (Cập nhật Group)
      const groupRef = doc(db, "groups", groupId);
      const snap = await getDoc(groupRef);
      if (snap.exists()) {
        const currentMembers = snap.data().members || [];

        // Kiểm tra lần cuối xem UID thật đã có trong nhóm chưa (đề phòng)
        if (currentMembers.some((m) => m.id === realMemberData.id)) {
          return showToast(
            "Tài khoản này thực ra đã có trong nhóm rồi!",
            "info",
          );
        }

        await updateDoc(groupRef, {
          members: [...currentMembers, realMemberData],
        });
        showToast(`Đã thêm ${realMemberData.name} vào nhóm`, "success");
      }
    } catch (e) {
      console.error(e);
      showToast("Lỗi thêm thành viên: " + e.message, "error");
    }
  };

  // Thay thế hàm deletePerson cũ bằng hàm này:
  const deletePerson = (id) => {
    setConfirmDialog({
      isOpen: true,
      message: "Lịch sử giao dịch liên quan cũng sẽ bị xóa.",
      title: "Xóa thành viên?",
      onConfirm: async () => {
        if (!groupId) return;

        try {
          // 1. Lọc bỏ người này khỏi danh sách thành viên
          const newPeople = people.filter((p) => p.id !== id);

          // 2. Lọc bỏ các giao dịch mà người này Trả hoặc Tham gia
          const newExpenses = expenses.filter(
            (e) => e.payerId !== id && !e.sharedWith.includes(id),
          );

          // 3. Gửi cập nhật lên Server
          await updateDoc(doc(db, "groups", groupId), {
            members: newPeople,
            expenses: newExpenses,
          });

          if (selectedPersonId === id) setSelectedPersonId(null);
          showToast("Đã xóa thành viên", "success");
        } catch (e) {
          console.error(e);
          showToast("Lỗi khi xóa thành viên", "error");
        }
      },
    });
  };

  // Thay thế hàm deleteExpense cũ bằng hàm này:
  const deleteExpense = async (expenseId, targetGroupId = null) => {
    // Nếu không truyền targetGroupId (lúc ở trong nhóm), dùng groupId hiện tại
    // Nếu đang ở Global, targetGroupId sẽ được truyền vào từ renderHistoryItem
    const finalGroupId = targetGroupId || groupId;

    if (!finalGroupId)
      return showToast("Lỗi: Không xác định được nhóm.", "error");

    try {
      const groupRef = doc(db, "groups", finalGroupId);
      const groupSnap = await getDoc(groupRef);

      if (groupSnap.exists()) {
        const data = groupSnap.data();
        const updatedExpenses = data.expenses.filter((e) => e.id !== expenseId);

        await updateDoc(groupRef, { expenses: updatedExpenses });
        showToast("Đã xóa giao dịch!", "success");

        // Nếu đang ở Global view, cần update lại state globalHistory để UI tự mất dòng đó
        if (!groupId) {
          setGlobalHistory((prev) => prev.filter((e) => e.id !== expenseId));
          // Lưu ý: Tính toán lại tiền nong Global hơi phức tạp,
          // cách nhanh nhất là reload hoặc user tự refresh, nhưng tạm thời xóa khỏi list là ổn.
        }
      }
    } catch (error) {
      console.error(error);
      showToast("Lỗi khi xóa: " + error.message, "error");
    }
  };

  // --- LOGIC BUZZ (GIỤC NỢ) TỐI ƯU ---
  const handleBuzz = async (person) => {
    if (!person.id) {
      showToast(`Lỗi: Không tìm thấy ID của ${person.name}!`, "error");
      return;
    }

    try {
      // 1. Kéo thẳng FCM Token của người nợ từ Firestore
      const userDocRef = doc(db, "users", person.id);
      const userSnap = await getDoc(userDocRef);

      if (!userSnap.exists() || !userSnap.data().fcmToken) {
        showToast(
          `Không thể Buzz! ${person.name} chưa cài app hoặc chưa bật thông báo.`,
          "error",
        );
        return;
      }

      const targetFcmToken = userSnap.data().fcmToken;

      // 2. Phát âm thanh ở máy mình trước cho vui tai
      playBuzzSound();
      showToast(`Đã BUZZ tới ${person.name}!`, "buzz");

      // 3. Gửi Token thẳng lên Backend để đẩy thông báo
      const response = await fetch(`${API_URL}/buzz`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fcmToken: targetFcmToken, // Truyền thẳng token lên đây
          title: "Bíp bíp! Đòi nợ!!! 💸",
          body: `${
            user.displayName || "Ai đó"
          } đang gọi bạn vào thanh toán kìa!`,
        }),
      });

      if (!response.ok) {
        console.error("Backend phản hồi lỗi:", await response.text());
      }
    } catch (error) {
      console.error("Lỗi khi gọi API Buzz:", error);
    }
  };

  const openAddModal = () => {
    setEditingExpense(null);
    setIsModalOpen(true);
  };
  const openEditModal = (exp) => {
    setEditingExpense(exp);
    setIsModalOpen(true);
  };

  // --- HÀM LƯU GIAO DỊCH (ĐÃ FIX LỖI "me") ---
  const handleSaveExpense = async (expenseData) => {
    const targetGroupId = editingExpense?.groupId || groupId;
    if (!targetGroupId)
      return showToast("Lỗi: Không xác định được nhóm.", "error");

    // [BƯỚC QUAN TRỌNG]: Dịch tất cả chữ "me" thành UID thật của máy đang dùng trước khi lưu
    const realUid = user.uid;
    let cleanData = { ...expenseData };

    if (cleanData.payerId === "me") cleanData.payerId = realUid;

    if (cleanData.sharedWith) {
      cleanData.sharedWith = [
        ...new Set(
          cleanData.sharedWith.map((id) => (id === "me" ? realUid : id)),
        ),
      ];
    }
    if (cleanData.customShares && cleanData.customShares["me"] !== undefined) {
      cleanData.customShares[realUid] = cleanData.customShares["me"];
      delete cleanData.customShares["me"];
    }
    if (cleanData.settledBy) {
      cleanData.settledBy = [
        ...new Set(
          cleanData.settledBy.map((id) => (id === "me" ? realUid : id)),
        ),
      ];
    }

    try {
      const groupRef = doc(db, "groups", targetGroupId);
      const groupSnap = await getDoc(groupRef);

      if (groupSnap.exists()) {
        const data = groupSnap.data();
        let updatedExpenses = data.expenses || [];

        if (editingExpense) {
          updatedExpenses = updatedExpenses.map((e) =>
            e.id === editingExpense.id
              ? {
                  ...cleanData,
                  id: editingExpense.id,
                  comments: e.comments || [],
                  billImage: e.billImage || null,
                }
              : e,
          );
        } else {
          updatedExpenses.push({
            ...cleanData,
            id: uuidv4(),
            comments: [],
            billImage: null,
          });
        }

        await updateDoc(groupRef, { expenses: updatedExpenses });

        setIsModalOpen(false);
        setEditingExpense(null);
        showToast(
          editingExpense ? "Đã cập nhật!" : "Đã thêm khoản mới!",
          "success",
        );
      }
    } catch (error) {
      console.error(error);
      showToast("Lỗi lưu dữ liệu: " + error.message, "error");
    }
  };

  if (authLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const renderHistoryItem = (exp, isMobile = false) => {
    return (
      <HistoryItem
        key={exp.id} // Quan trọng để React xác định đúng phần tử
        exp={exp}
        isMobile={isMobile}
        user={user}
        people={people}
        groupId={groupId}
        openEditModal={openEditModal}
        setItemToDelete={setItemToDelete}
        setViewingImage={setViewingImage}
        setCommentModalData={setCommentModalData}
        toggleSettled={toggleSettled}
        formatCompactCurrency={formatCompactCurrency}
      />
    );
  };

  const CommentModal = ({ expense, isOpen, onClose, onSend, user }) => {
    const [text, setText] = useState("");
    const messagesEndRef = useRef(null);

    // Tự động cuộn xuống cuối khi mở hoặc có tin mới
    useEffect(() => {
      if (isOpen) {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }, [isOpen, expense?.comments]);

    if (!isOpen || !expense) return null;

    const handleSend = () => {
      if (!text.trim()) return;
      onSend(expense.id, text);
      setText("");
    };

    return (
      <div className="fixed inset-0 z-[400] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col h-[80vh] animate-slide-up overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
            <div>
              <h3 className="font-bold text-gray-800">Bình luận</h3>
              <p className="text-xs text-gray-500 truncate max-w-[200px]">
                Về: {expense.description}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-200 rounded-full transition-colors"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          {/* List Bình luận */}
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-50 space-y-4">
            {!expense.comments || expense.comments.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-60">
                <MessageSquare size={48} className="mb-2 text-gray-300" />
                <p className="text-sm">Chưa có thảo luận nào.</p>
                <p className="text-xs">Hãy là người đầu tiên bình luận!</p>
              </div>
            ) : (
              expense.comments.map((c, idx) => {
                const isMe = c.userId === user?.uid;
                return (
                  <div
                    key={idx}
                    className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}
                  >
                    {/* --- SỬA: HIỂN THỊ AVATAR THẬT --- */}
                    <div className="shrink-0">
                      {c.userAvatar ? (
                        <img
                          src={c.userAvatar}
                          alt={c.userName}
                          className="w-6 h-6 rounded-full object-cover border border-gray-200"
                        />
                      ) : (
                        <Avatar name={c.userName} size="xs" />
                      )}
                    </div>

                    <div
                      className={`max-w-[80%] space-y-1 ${
                        isMe ? "items-end flex flex-col" : ""
                      }`}
                    >
                      <div
                        className={`px-3 py-2 rounded-2xl text-sm ${
                          isMe
                            ? "bg-blue-600 text-white rounded-tr-none"
                            : "bg-white border border-gray-200 text-gray-800 rounded-tl-none shadow-sm"
                        }`}
                      >
                        {c.text}
                      </div>
                      {/* Thông tin người gửi + Thời gian */}
                      <p className="text-[10px] text-gray-400 px-1">
                        {isMe ? "Bạn" : c.userName} •{" "}
                        {c.timestamp
                          ? format(new Date(c.timestamp), "HH:mm dd/MM")
                          : ""}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 bg-white border-t border-gray-100 flex gap-2 items-center">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Viết bình luận..."
              className="flex-1 bg-gray-100 border-none outline-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/50 transition-all"
              autoFocus
            />
            <button
              onClick={handleSend}
              disabled={!text.trim()}
              className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-200"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const ImageViewer = ({ src, onClose }) => {
    if (!src) return null;

    return (
      <div
        className="fixed inset-0 z-[500] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
        onClick={onClose}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/70 hover:text-white p-2 bg-white/10 rounded-full"
        >
          <X size={24} />
        </button>

        <img
          src={src}
          alt="Full Invoice"
          className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl animate-scale-up"
          onClick={(e) => e.stopPropagation()} // Để bấm vào ảnh không bị tắt
        />
      </div>
    );
  };

  // --- COMPONENT POPUP CHIA SẺ (CHỈ HIỆN MÃ NHÓM) ---
  const renderShareModal = () => {
    if (!sharingGroup) return null;

    // Link rút gọn hoặc chỉ lấy ID
    const groupCode = sharingGroup.id;

    return (
      <div
        className="fixed inset-0 z-[400] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
        onClick={() => setSharingGroup(null)}
      >
        <div
          className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 animate-slide-up relative overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header trang trí */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-600 to-indigo-600"></div>

          <button
            onClick={() => setSharingGroup(null)}
            className="absolute top-4 right-4 p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200"
          >
            <X size={20} />
          </button>

          <div className="text-center mt-4">
            <h3 className="text-xl font-bold text-gray-800 mb-1">
              {sharingGroup.name}
            </h3>
            <p className="text-sm text-gray-500 mb-8">
              Gửi mã này cho bạn bè để vào nhóm
            </p>

            {/* HIỂN THỊ MÃ NHÓM TO RÕ */}
            <div className="bg-gray-50 border-2 border-dashed border-blue-200 rounded-2xl p-6 mb-8 relative group">
              <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-2">
                Mã gia nhập nhóm
              </p>
              <h2 className="text-4xl font-black text-gray-800 tracking-[0.2em] font-mono">
                {groupCode}
              </h2>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(groupCode);
                  showToast("Đã copy mã nhóm!", "success");
                }}
                className="mt-4 px-6 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-blue-600 hover:bg-blue-50 shadow-sm transition-all active:scale-95"
              >
                Sao chép mã
              </button>
            </div>

            {/* Nút Chia sẻ hệ thống (Vẫn giữ link cho tiện nếu cần) */}
            <button
              onClick={() => {
                // Chỉ lấy mã nhóm
                const groupCode = sharingGroup.id;
                // Nội dung chính xác như bạn đã soạn
                const shareText = `Tham gia nhóm ${sharingGroup.name} bằng cách nhập mã: ${groupCode}`;

                if (navigator.share) {
                  navigator
                    .share({
                      title: "Vào nhóm chia tiền!",
                      text: shareText, // Gửi nội dung: "Tham gia nhóm abc bằng cách nhập mã: ABCXYZ"
                    })
                    .catch(console.error);
                } else {
                  // Nếu trình duyệt không hỗ trợ Share API thì copy nội dung này vào bộ nhớ tạm
                  navigator.clipboard.writeText(shareText);
                  showToast("Đã copy nội dung mời!", "success");
                }
              }}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-200 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Share2 size={20} /> Gửi cho bạn bè
            </button>

            <p className="mt-4 text-[10px] text-gray-400 italic">
              Bạn bè có thể nhập mã này tại màn hình chính để tham gia.
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 h-[100dvh] w-screen bg-gray-50 font-sans overflow-hidden flex flex-col">
      <Toast
        message={toast?.message}
        type={toast?.type}
        onClose={() => setToast(null)}
      />
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        message={confirmDialog.message}
        title={confirmDialog.title}
        onConfirm={confirmDialog.onConfirm}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />
      <ExpenseModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingExpense(null);
        }}
        onSave={handleSaveExpense}
        editingExpense={editingExpense}
        people={people}
        user={user}
        showToast={showToast} // <--- THÊM DÒNG NÀY ĐỂ SỬA LỖI CRASH
      />

      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        user={user}
        onLogout={handleLogout}
        showToast={showToast}
      />

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        showToast={showToast}
      />

      {renderShareModal()}

      {/* COMPONENT MỚI THÊM VÀO */}
      <HistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        expenses={
          groupId
            ? expenses.filter(
                (e) =>
                  e.payerId === user?.uid || e.sharedWith.includes(user?.uid),
              )
            : globalHistory
        }
        people={people}
        renderHistoryItem={(exp) => renderHistoryItem(exp)}
      />

      {/* MODAL SỬA DANH BẠ */}
      <EditContactModal
        contact={editingContact}
        onClose={() => setEditingContact(null)}
        onSave={handleUpdateContact}
      />

      {/* MODAL BÌNH LUẬN RIÊNG BIỆT */}
      <CommentModal
        isOpen={!!commentModalData}
        onClose={() => setCommentModalData(null)}
        expense={commentModalData}
        onSend={handleSendCommentRaw}
        user={user}
      />

      <ConfirmDialog
        isOpen={!!itemToDelete} // Có dữ liệu thì mở
        onClose={() => setItemToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Xóa giao dịch?"
        message="Bạn có chắc chắn muốn xóa khoản chi tiêu này không? Hành động này sẽ không thể khôi phục."
      />

      {/* --- DÁN IMAGE VIEWER VÀO ĐÂY --- */}
      <ImageViewer src={viewingImage} onClose={() => setViewingImage(null)} />
      {/* -------------------------------- */}

      {/* --- MODAL TẠO NHÓM MỚI (ĐÃ CẬP NHẬT) --- */}
      {isCreateGroupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-bold text-xl text-gray-800">
                Tạo nhóm chi tiêu mới
              </h3>
              <button
                onClick={() => setIsCreateGroupModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
              {/* CHỌN ICON NHÓM */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">
                  Biểu tượng nhóm
                </label>
                <div className="grid grid-cols-6 gap-2 bg-gray-50 p-3 rounded-2xl border border-gray-100">
                  {GROUP_ICONS.map((icon) => (
                    <button
                      key={icon}
                      onClick={() => setSelectedIcon(icon)}
                      className={`text-2xl w-12 h-12 flex items-center justify-center rounded-xl transition-all ${
                        selectedIcon === icon
                          ? "bg-blue-600 shadow-lg scale-110 shadow-blue-200"
                          : "hover:bg-white hover:shadow-sm"
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nhập tên nhóm */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Tên nhóm
                </label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Ví dụ: Du lịch Đà Lạt, Tiền nhà..."
                  className="w-full p-4 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 border border-gray-100 text-lg font-medium"
                />
              </div>

              {/* KHU VỰC CHỌN THÀNH VIÊN TỪ DANH BẠ (LOGIC MỚI) */}
              <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                <label className="block text-sm font-bold text-blue-800 mb-3 flex items-center gap-2">
                  <Users size={16} /> Chọn thành viên từ Danh bạ
                </label>
                {/* NÚT CHỌN TẤT CẢ (MỚI) */}
                {contacts.length > 0 && (
                  <div className="flex justify-end mb-2">
                    <button
                      onClick={() => {
                        if (tempMembers.length === contacts.length) {
                          // Nếu đang chọn hết -> Bỏ chọn tất cả
                          setTempMembers([]);
                        } else {
                          // Nếu chưa chọn hết -> Chọn tất cả
                          const allMembers = contacts.map((c) => ({
                            id: c.id,
                            name: c.name,
                            email: c.email,
                            role: "member",
                          }));
                          setTempMembers(allMembers);
                        }
                      }}
                      className="text-xs font-bold text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      {tempMembers.length === contacts.length
                        ? "Bỏ chọn tất cả"
                        : "Chọn tất cả"}
                    </button>
                  </div>
                )}
                {/* --------------------------- */}

                {contacts.length === 0 ? (
                  <div className="text-center py-4 text-gray-500 text-sm italic border-2 border-dashed border-gray-200 rounded-xl bg-white/50">
                    Danh bạ của bạn đang trống.
                    <br />
                    <span className="text-xs">
                      (Hãy tạo nhóm trước, sau đó ra ngoài tab "Danh bạ" để thêm
                      bạn bè)
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 max-h-[200px] overflow-y-auto custom-scrollbar p-1">
                    {contacts.map((contact) => {
                      // Kiểm tra xem người này đã được chọn chưa
                      const isSelected = tempMembers.some(
                        (m) => m.id === contact.id,
                      );

                      return (
                        <button
                          key={contact.id}
                          onClick={() => {
                            if (isSelected) {
                              // Nếu đang chọn -> Bỏ chọn
                              setTempMembers(
                                tempMembers.filter((m) => m.id !== contact.id),
                              );
                            } else {
                              // Nếu chưa chọn -> Thêm vào list tạm
                              const newMember = {
                                id: contact.id,
                                name: contact.name,
                                email: contact.email,
                                role: "member",
                              };
                              setTempMembers([...tempMembers, newMember]);
                            }
                          }}
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all text-sm font-bold ${
                            isSelected
                              ? "bg-blue-600 text-white border-blue-600 shadow-md transform scale-105"
                              : "bg-white text-gray-700 border-gray-200 hover:border-blue-300"
                          }`}
                        >
                          <Avatar name={contact.name} size="sm" />
                          {contact.name}
                          {isSelected && (
                            <div className="bg-white/20 rounded-full p-0.5">
                              <Check size={12} />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Hiển thị số lượng đã chọn */}
                {contacts.length > 0 && (
                  <p className="text-right text-xs text-blue-600 font-bold mt-2">
                    Đã chọn: {tempMembers.length} thành viên
                  </p>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex gap-3">
              <button
                onClick={() => setIsCreateGroupModalOpen(false)}
                className="flex-1 py-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold rounded-xl transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleCreateNewGroup}
                className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-lg hover:shadow-blue-200 text-white font-bold rounded-xl transition-all transform active:scale-95"
              >
                Tạo nhóm ngay
              </button>
            </div>
          </div>
        </div>
      )}

      {isRenameModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden scale-100 animate-scale-up">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-6 text-center">
                Cài đặt nhóm
              </h3>

              {/* Sửa Icon */}
              <div className="mb-6">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 text-center">
                  Thay đổi biểu tượng
                </label>
                <div className="flex flex-wrap justify-center gap-2 bg-gray-50 p-3 rounded-2xl border border-gray-100">
                  {GROUP_ICONS.map((icon) => (
                    <button
                      key={icon}
                      onClick={() => setSelectedIcon(icon)}
                      className={`text-xl w-10 h-10 flex items-center justify-center rounded-lg transition-all ${
                        selectedIcon === icon
                          ? "bg-blue-600 scale-110 shadow-md shadow-blue-200"
                          : "hover:bg-white shadow-sm"
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                  Tên nhóm
                </label>
                <input
                  type="text"
                  value={newNameInput}
                  onChange={(e) => setNewNameInput(e.target.value)}
                  className="w-full p-4 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 border border-gray-100 font-bold text-gray-700"
                  placeholder="Nhập tên mới..."
                  autoFocus
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setIsRenameModalOpen(false)}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl"
                >
                  Hủy
                </button>
                <button
                  onClick={submitRenameGroup}
                  className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl transition-colors shadow-lg shadow-blue-100"
                >
                  Lưu thay đổi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- SIDEBAR MỚI (QUẢN LÝ LIST NHÓM) --- */}
      <aside className="hidden md:flex fixed top-0 bottom-0 left-0 w-72 flex-col bg-white border-r border-gray-100 shadow-xl z-20">
        {/* 1. HEADER */}
        <div className="p-6 flex items-center gap-3 border-b border-gray-50 shrink-0">
          <div className="p-2 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-200">
            <Wallet size={24} />
          </div>
          <h1 className="font-bold text-xl text-gray-800">Split Money</h1>
        </div>

        {/* --- 1.5 MENU ĐIỀU HƯỚNG CHÍNH --- */}
        <div className="px-4 mt-4 space-y-1">
          <button
            onClick={() => {
              setActiveTab("dashboard");
              setGroupId(""); // Về tổng quan
              setIsGroupMode(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm ${
              activeTab === "dashboard" && !groupId
                ? "bg-blue-50 text-blue-600 shadow-sm"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <LayoutDashboard size={20} /> Tổng quan
          </button>
          <button
            onClick={() => {
              setActiveTab("people");
              setGroupId(""); // Về tổng quan nhưng xem list bạn
              setIsGroupMode(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm ${
              activeTab === "people" && !groupId
                ? "bg-blue-50 text-blue-600 shadow-sm"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Users size={20} /> Danh bạ bạn bè
          </button>
        </div>

        <div className="mx-6 my-4 border-b border-gray-100"></div>

        {/* 2. DANH SÁCH NHÓM (SCROLL ĐƯỢC) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
          {/* Header nhỏ của section */}
          <div className="px-2 mb-2 text-xs font-bold text-gray-400 uppercase tracking-wider flex justify-between items-center">
            <span>Nhóm của tôi ({myGroups.length})</span>
            <button
              onClick={() => setIsCreateGroupModalOpen(true)}
              className="text-blue-600 hover:bg-blue-50 p-1 rounded transition-colors"
              title="Tạo nhóm mới"
            >
              <Plus size={16} />
            </button>
          </div>

          {/* Nút Tạo nhóm to (nếu chưa có nhóm nào hoặc muốn nổi bật) */}
          <button
            onClick={() => setIsCreateGroupModalOpen(true)}
            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-400 font-bold hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 transition-all flex items-center justify-center gap-2 mb-4"
          >
            <Plus size={18} /> Tạo nhóm mới
          </button>

          {/* Render List Nhóm */}
          {[...myGroups].reverse().map((g) => (
            <button
              key={g.id}
              onClick={() => {
                setGroupId(g.id);
                setIsGroupMode(true);
                setActiveTab("dashboard");
              }}
              className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all text-left group relative ${
                groupId === g.id
                  ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                  : "hover:bg-gray-50 text-gray-700"
              }`}
            >
              {/* Icon chữ cái đầu tên nhóm */}
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg shrink-0 transition-colors ${
                  groupId === g.id
                    ? "bg-white/20 text-white"
                    : "bg-blue-100 text-blue-600 group-hover:bg-white group-hover:shadow-sm"
                }`}
              >
                {/* [FIX 3] Ưu tiên hiện icon, nếu không có mới hiện chữ cái đầu */}
                {g.icon ? g.icon : g.name?.charAt(0).toUpperCase()}
              </div>

              <div className="overflow-hidden flex-1">
                <p className="font-bold truncate text-sm">{g.name}</p>
                <p
                  className={`text-[10px] truncate ${
                    groupId === g.id ? "text-blue-100" : "text-gray-400"
                  }`}
                >
                  ID: {g.id}
                </p>
              </div>

              {/* --- CỤM NÚT SỬA/XÓA --- */}
              {groupId === g.id ? (
                <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm p-1 rounded-lg ml-2 animate-fade-in shrink-0">
                  {/* Nút Share QR */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setSharingGroup(g);
                    }}
                    className="p-1.5 hover:bg-blue-500 rounded-md cursor-pointer text-white transition-colors"
                    title="Mã QR"
                  >
                    <QrCode size={14} />
                  </div>

                  {/* LOGIC MỚI: Kiểm tra quyền chủ nhóm */}
                  {groupOwnerId === user?.uid ? (
                    // NẾU LÀ CHỦ: Hiện Sửa tên & Xóa nhóm
                    <>
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          openRenameModal(g); // <--- SỬA THÀNH CÁI NÀY
                        }}
                        className="p-1.5 hover:bg-white/20 rounded-md cursor-pointer text-white transition-colors"
                        title="Đổi tên"
                      >
                        <Edit2 size={14} />
                      </div>
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteGroup(g.id);
                        }}
                        className="p-1.5 hover:bg-red-500 rounded-md cursor-pointer text-white transition-colors"
                        title="Xóa nhóm vĩnh viễn"
                      >
                        <Trash2 size={14} />
                      </div>
                    </>
                  ) : (
                    // NẾU LÀ THÀNH VIÊN: Chỉ hiện Rời nhóm (Out)
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLeaveGroup(g.id);
                      }}
                      className="p-1.5 hover:bg-orange-500 rounded-md cursor-pointer text-white transition-colors"
                      title="Rời khỏi nhóm này"
                    >
                      <LogOut size={14} />
                    </div>
                  )}
                </div>
              ) : null}
            </button>
          ))}

          {myGroups.length === 0 && (
            <div className="text-center text-gray-400 text-xs py-10 px-4 italic bg-gray-50 rounded-xl">
              Bạn chưa tham gia nhóm nào.
              <br />
              Hãy tạo hoặc nhập mã để vào nhóm.
            </div>
          )}
        </div>

        {/* 3. NÚT THÊM GIAO DỊCH (CHỈ HIỆN KHI ĐANG Ở TRONG NHÓM) */}
        {groupId && (
          <div className="px-4 pb-2 shrink-0">
            <button
              onClick={openAddModal}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Plus size={20} /> Thêm Giao Dịch
            </button>
          </div>
        )}

        {/* 4. USER PROFILE (FOOTER) */}
        <div className="p-4 border-t border-gray-50 bg-gray-50/50 shrink-0">
          {user ? (
            <div
              onClick={() => setIsProfileOpen(true)}
              className="flex items-center gap-3 cursor-pointer hover:bg-white p-2 rounded-xl transition-all border border-transparent hover:border-gray-200 hover:shadow-sm"
            >
              <div className="relative">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    className="w-10 h-10 rounded-full border border-gray-200 object-cover"
                    alt="avt"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                    {user.email?.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
              </div>

              <div className="overflow-hidden flex-1">
                <p className="font-bold text-sm text-gray-800 truncate">
                  {user.displayName || "User"}
                </p>
                <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                  <Lock size={10} /> Tài khoản cá nhân
                </p>
              </div>
              <Settings size={16} className="text-gray-400" />
            </div>
          ) : (
            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="w-full py-2 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              <LogIn size={16} /> Đăng nhập
            </button>
          )}
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col h-full md:pl-72 relative">
        {/* --- MOBILE VIEW --- */}
        {/* Chỉ render khi là Mobile */}
        {isMobileView && (
          <div className="md:hidden flex flex-col h-full bg-gray-50">
            {/* 1. HEADER MOBILE (Dynamic: Global hoặc Group) */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 px-6 pt-16 pb-20 shrink-0 text-white shadow-md z-20 rounded-b-[2rem] relative overflow-hidden">
              {/* Background Decor */}
              <div className="absolute top-[-50px] right-[-50px] w-48 h-48 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>

              <div className="flex justify-between items-center mb-6 relative z-10">
                <div className="flex items-center gap-3">
                  {/* Nếu đang trong nhóm -> Hiện nút Back ra Global */}
                  {groupId ? (
                    <button
                      onClick={() => {
                        setGroupId("");
                        setIsGroupMode(false);
                        setActiveTab("dashboard");
                      }}
                      className="p-2 bg-white/20 backdrop-blur-md rounded-xl hover:bg-white/30 transition-colors"
                    >
                      <ChevronLeft size={20} />
                    </button>
                  ) : (
                    <div className="p-2 bg-white/20 backdrop-blur-md rounded-xl">
                      <Wallet size={20} />
                    </div>
                  )}

                  <div className="flex flex-col">
                    <span className="font-bold text-xl tracking-tight leading-none">
                      {groupId
                        ? myGroups.find((g) => g.id === groupId)?.name
                        : "Ví Nhóm"}
                    </span>
                    {groupId && (
                      <span className="text-[10px] opacity-70 font-mono">
                        ID: {groupId}
                      </span>
                    )}
                  </div>
                </div>

                {/* Avatar User (Góc phải) */}
                <div
                  onClick={
                    user
                      ? () => setIsProfileOpen(true)
                      : () => setIsLoginModalOpen(true)
                  }
                  className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/10 cursor-pointer overflow-hidden active:scale-95 transition-transform"
                >
                  {user ? (
                    user.photoURL ? (
                      <img
                        src={user.photoURL}
                        className="w-full h-full object-cover"
                        alt="avt"
                      />
                    ) : (
                      <span className="font-bold text-lg">
                        {user.email?.charAt(0).toUpperCase()}
                      </span>
                    )
                  ) : (
                    <LogIn size={20} />
                  )}
                </div>
              </div>
              {/* HEADER STATS MOBILE (Chỉ hiện ở Tab Dashboard) */}
              {activeTab === "dashboard" && (
                <div className="relative z-10 animate-fade-in mt-2">
                  <p className="text-blue-100 text-xs font-bold uppercase tracking-wider opacity-80">
                    {groupId ? "Tài sản ròng (Nhóm này)" : "Tổng tài sản ròng"}
                  </p>
                  <h2
                    className="font-bold mt-1 tracking-tighter truncate"
                    // Logic chỉnh size chữ động: Dài quá thì giảm size
                    style={{
                      fontSize:
                        displayNetBalance.toString().length > 9
                          ? "2rem"
                          : "2.5rem",
                    }}
                  >
                    {/* [FIX] Dùng biến displayNetBalance mới */}
                    {formatCompactCurrency(displayNetBalance)}
                  </h2>
                  {/* Hiển thị số nhỏ chi tiết bên dưới nếu cần thiết */}
                  <p className="text-blue-200 text-xs font-mono opacity-60 truncate">
                    {/* [FIX] Dùng biến displayNetBalance mới */}
                    {formatCurrency(displayNetBalance)}
                  </p>
                </div>
              )}
            </div>

            {/* 2. BODY CONTENT (Đẩy lên đè vào Header) */}
            <div className="flex-1 flex flex-col min-h-0 -mt-12 z-30 px-4 pb-24 overflow-hidden">
              {/* ========================================================
                TRƯỜNG HỢP 1: GLOBAL VIEW (KHÔNG CÓ GROUP)
                ======================================================== */}
              {!groupId ? (
                activeTab === "people" ? (
                  // >>> 1.1 GLOBAL: DANH BẠ BẠN BÈ <<<
                  <div className="bg-white rounded-[2rem] shadow-lg h-full flex flex-col overflow-hidden animate-slide-up">
                    <div className="p-6 border-b border-gray-100">
                      <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                        <Users className="text-blue-600" size={20} /> Danh bạ
                        của tôi
                      </h3>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                      {/* Form tìm & gửi lời mời */}
                      <div className="bg-blue-50 p-4 rounded-2xl mb-4 border border-blue-100">
                        <p className="text-xs font-bold text-blue-800 mb-2 uppercase">
                          Kết bạn mới
                        </p>
                        <div className="flex gap-2">
                          <input
                            value={newPersonEmail}
                            onChange={(e) => setNewPersonEmail(e.target.value)}
                            placeholder="Nhập email bạn bè..."
                            className="flex-1 p-3 rounded-xl border border-blue-200 text-sm outline-none focus:ring-2 ring-blue-100"
                          />
                          <button
                            onClick={sendFriendRequest}
                            className="px-4 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-sm active:scale-95 transition-transform shrink-0"
                          >
                            Gửi lời mời
                          </button>
                        </div>
                      </div>

                      {/* KHU VỰC HIỂN THỊ LỜI MỜI KẾT BẠN */}
                      {friendRequests?.length > 0 && (
                        <div className="mb-6">
                          <p className="text-xs font-bold text-orange-600 uppercase mb-3 flex items-center gap-2">
                            <Bell size={16} className="animate-bounce" /> Lời
                            mời kết bạn ({friendRequests.length})
                          </p>
                          <div className="space-y-3">
                            {friendRequests.map((req) => (
                              <div
                                key={req.id}
                                className="flex items-center gap-3 p-3 bg-orange-50 rounded-2xl border border-orange-100"
                              >
                                {req.photoURL ? (
                                  <img
                                    src={req.photoURL}
                                    alt={req.name}
                                    className="w-10 h-10 rounded-full object-cover shrink-0"
                                  />
                                ) : (
                                  <Avatar name={req.name} size="md" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="font-bold text-gray-800 text-sm truncate">
                                    {req.name}
                                  </p>
                                  <p className="text-xs text-gray-500 truncate">
                                    {req.email}
                                  </p>
                                </div>
                                <div className="flex gap-2 shrink-0">
                                  <button
                                    onClick={() => handleAcceptRequest(req)}
                                    className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg shadow-sm active:scale-95"
                                  >
                                    Chấp nhận
                                  </button>
                                  <button
                                    onClick={() => handleDeclineRequest(req.id)}
                                    className="px-3 py-1.5 bg-gray-200 text-gray-600 text-xs font-bold rounded-lg shadow-sm active:scale-95"
                                  >
                                    Xóa
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* List Contacts */}
                      <div className="space-y-3">
                        {contacts.length === 0 ? (
                          <p className="text-center text-gray-400 text-sm italic mt-10">
                            Danh bạ trống
                          </p>
                        ) : (
                          contacts.map((c) => (
                            <div
                              key={c.id}
                              className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl border border-transparent hover:border-blue-200 transition-all group"
                            >
                              {/* [SỬA]: Ưu tiên hiển thị ảnh thật nếu có */}
                              {c.photoURL ? (
                                <img
                                  src={c.photoURL}
                                  alt={c.name}
                                  className="w-10 h-10 rounded-full object-cover border border-gray-200 shrink-0"
                                />
                              ) : (
                                <Avatar name={c.name} size="md" />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-gray-800 text-sm truncate">
                                  {c.name}
                                </p>
                                {c.email ? (
                                  <p className="text-xs text-gray-400 truncate">
                                    {c.email}
                                  </p>
                                ) : (
                                  <p className="text-[10px] text-orange-400 italic">
                                    Chưa có email
                                  </p>
                                )}
                              </div>
                              {/* Nút Sửa (MỚI) */}
                              {/* Nút Sửa & Xóa (MỚI) */}
                              <div className="flex gap-2">
                                <button
                                  onClick={() => setEditingContact(c)}
                                  className="p-2 bg-white text-gray-400 hover:text-blue-600 rounded-lg shadow-sm border border-gray-100"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button
                                  onClick={() => handleDeleteContact(c.id)}
                                  className="p-2 bg-white text-gray-400 hover:text-red-500 rounded-lg shadow-sm border border-gray-100"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  // >>> 1.2 GLOBAL: DASHBOARD TỔNG QUAN <<<
                  <div className="flex flex-col gap-4 h-full overflow-y-auto custom-scrollbar pt-2 pb-4">
                    {/* List Nhóm (Card ngang - SWIPE TO ACTION) */}
                    <div className="bg-white p-4 rounded-[2rem] shadow-sm">
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="font-bold text-gray-700 text-sm uppercase">
                          Nhóm của tôi
                        </h3>
                        <button
                          onClick={() => setIsCreateGroupModalOpen(true)}
                          className="text-blue-600 bg-blue-50 p-1.5 rounded-lg"
                        >
                          <Plus size={16} />
                        </button>
                      </div>

                      {myGroups.length === 0 ? (
                        <div className="text-center py-6 text-gray-400 text-xs italic border-2 border-dashed border-gray-100 rounded-xl">
                          Chưa có nhóm nào.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {[...myGroups].reverse().map((g) => (
                            // Container vuốt ngang (Scroll Snap)
                            <div
                              key={g.id}
                              className="flex w-full overflow-x-auto snap-x snap-mandatory [&::-webkit-scrollbar]:hidden rounded-2xl bg-gray-50 shadow-sm border border-gray-100"
                            >
                              {/* 1. NỘI DUNG CHÍNH (Snap Center) */}
                              <div
                                onClick={() => {
                                  setGroupId(g.id);
                                  setIsGroupMode(true);
                                  setActiveTab("dashboard");
                                }}
                                className="min-w-full snap-center flex items-center gap-3 p-3 active:bg-blue-50 transition-colors bg-white"
                              >
                                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold shrink-0">
                                  {/* [FIX 4] Thêm logic hiển thị icon */}
                                  {g.icon
                                    ? g.icon
                                    : g.name?.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-bold text-gray-800 text-sm truncate">
                                    {g.name}
                                  </p>
                                  <p className="text-[10px] text-gray-400 font-mono">
                                    ID: {g.id}
                                  </p>
                                </div>
                                {/* Mũi tên gợi ý vuốt */}
                                <div className="text-gray-300 animate-pulse pl-2">
                                  <ChevronLeft size={16} strokeWidth={3} />
                                </div>
                              </div>

                              {/* 2. CÁC NÚT HÀNH ĐỘNG (Ẩn bên phải - Vuốt ra sẽ thấy) */}
                              <div className="flex snap-center shrink-0">
                                <button
                                  onClick={() => openRenameModal(g)}
                                  className="w-14 bg-yellow-400 text-yellow-900 font-bold text-[10px] flex flex-col items-center justify-center gap-1 active:bg-yellow-500"
                                >
                                  <Edit2 size={16} /> Sửa
                                </button>
                                <button
                                  onClick={() => handleDeleteGroup(g.id)}
                                  className="w-14 bg-red-500 text-white font-bold text-[10px] flex flex-col items-center justify-center gap-1 active:bg-red-600 rounded-r-2xl"
                                >
                                  <Trash2 size={16} /> Xóa
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Global Debts */}
                    <div className="bg-white p-4 rounded-[2rem] shadow-sm flex-1">
                      <h3 className="font-bold text-gray-700 text-sm uppercase mb-3">
                        Chi tiết công nợ (Tất cả)
                      </h3>
                      <div className="space-y-3">
                        {globalFriendStats.length === 0 ? (
                          <p className="text-center text-gray-400 text-xs italic">
                            Không có công nợ.
                          </p>
                        ) : (
                          globalFriendStats.map((item, idx) => (
                            <div
                              key={idx}
                              className="flex justify-between items-center p-2 border-b border-gray-50 last:border-0"
                            >
                              <div className="flex items-center gap-3">
                                <Avatar name={item.name} size="sm" />
                                <span className="font-bold text-sm text-gray-700">
                                  {item.name}
                                </span>
                              </div>
                              <span
                                className={`font-bold text-sm ${
                                  item.amount >= 0
                                    ? "text-emerald-600"
                                    : "text-rose-600"
                                }`}
                              >
                                {item.amount >= 0 ? "+" : ""}
                                {formatCurrency(item.amount)}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )
              ) : /* ========================================================
                  TRƯỜNG HỢP 2: GROUP VIEW (KHI ĐÃ CHỌN NHÓM)
                  ======================================================== */
              activeTab === "people" ? (
                // >>> 2.1 GROUP: QUẢN LÝ THÀNH VIÊN (CHỌN TỪ DANH BẠ) <<<
                <div className="bg-white rounded-[2rem] shadow-lg h-full flex flex-col overflow-hidden animate-slide-up">
                  <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-gray-800 text-lg">
                      Thành viên ({people.length})
                    </h3>
                    <button
                      onClick={() => {
                        // Nút thoát nhóm nhỏ
                        setGroupId("");
                        setIsGroupMode(false);
                      }}
                      className="text-xs text-red-500 font-bold bg-red-50 px-3 py-1.5 rounded-lg"
                    >
                      Thoát
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {/* Khu vực thêm từ danh bạ */}
                    <div className="bg-indigo-50 p-4 rounded-2xl mb-6 border border-indigo-100">
                      <p className="text-xs font-bold text-indigo-800 mb-3 uppercase flex items-center gap-1">
                        <Plus size={14} /> Thêm từ danh bạ
                      </p>

                      {contacts.length === 0 ? (
                        <p className="text-xs text-center text-gray-400 italic bg-white/50 p-2 rounded-lg">
                          Danh bạ trống. Ra trang chủ để thêm.
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {contacts.filter(
                            (c) => !people.some((p) => p.id === c.id),
                          ).length === 0 && (
                            <p className="text-xs text-gray-400 w-full text-center">
                              Đã thêm hết bạn bè.
                            </p>
                          )}

                          {contacts
                            .filter((c) => !people.some((p) => p.id === c.id))
                            .map((c) => (
                              <button
                                key={c.id}
                                onClick={() => addContactToGroup(c)}
                                className="flex items-center gap-1 px-3 py-2 bg-white rounded-xl border border-indigo-200 text-xs font-bold text-gray-700 shadow-sm active:scale-95"
                              >
                                <Avatar
                                  name={c.name}
                                  size="sm"
                                  className="w-4 h-4 text-[8px]"
                                />
                                {c.name}
                              </button>
                            ))}
                        </div>
                      )}
                    </div>

                    {/* List thành viên hiện tại */}
                    <div className="space-y-3">
                      {people.map((p) => (
                        <div
                          key={p.id}
                          className="flex justify-between items-center p-3 bg-gray-50 rounded-xl"
                        >
                          <div className="flex items-center gap-3">
                            {p.photoURL ? (
                              <img
                                src={p.photoURL}
                                alt={p.name}
                                className="w-10 h-10 rounded-full object-cover shadow-sm border border-gray-100 shrink-0"
                              />
                            ) : (
                              <Avatar name={p.name} size="md" />
                            )}
                            <div>
                              <p className="font-bold text-gray-800 text-sm">
                                {p.name}
                              </p>
                              {p.email && (
                                <p className="text-[10px] text-gray-400">
                                  {p.email}
                                </p>
                              )}
                            </div>
                          </div>
                          {p.id !== user?.uid && (
                            <button
                              onClick={() => deletePerson(p.id)}
                              className="p-2 bg-white text-red-400 rounded-lg shadow-sm"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Chia sẻ mã nhóm */}
                    <div className="mt-6 pt-6 border-t border-gray-100 text-center">
                      <p className="text-xs text-gray-400 mb-2">Mã nhóm</p>
                      <p className="text-xl font-bold text-gray-800 tracking-widest bg-gray-100 py-2 rounded-xl select-all">
                        {groupId}
                      </p>
                      <button
                        onClick={handleShareGroup}
                        className="mt-3 text-blue-600 text-xs font-bold flex items-center justify-center gap-1 w-full"
                      >
                        <Share2 size={12} /> Chia sẻ mã này
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                // >>> 2.2 GROUP: DASHBOARD (LIST NỢ & LỊCH SỬ) <<<
                <div className="flex flex-col gap-4 h-full pt-2 pb-4">
                  {/* Horizontal Scroll List Nợ (ĐÃ CẬP NHẬT NÚT TICK & BUZZ) */}
                  <div className="bg-white pt-4 pb-2 px-0 rounded-[2rem] shadow-sm">
                    <h3 className="font-bold text-gray-700 text-xs uppercase px-5 mb-3">
                      Bảng công nợ
                    </h3>

                    <div className="flex overflow-x-auto gap-3 px-5 pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none'] snap-x">
                      {/* Add Member Button */}
                      <div
                        onClick={() => setActiveTab("people")}
                        className="min-w-[100px] bg-gray-50 p-4 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform snap-center cursor-pointer"
                      >
                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-gray-400 shadow-sm">
                          <Plus size={16} />
                        </div>
                        <span className="text-[10px] font-bold text-gray-400">
                          Thêm người
                        </span>
                      </div>

                      {/* Debt Cards */}
                      {sortedPeople
                        .filter((p) => p.id !== user?.uid) // Lọc bỏ chính mình
                        .filter((p) => calculateNetDebt(p.id) !== 0) // [SỬA MỚI]: Ẩn những người không có nợ nần gì với TÔI
                        .map((p) => {
                          const debt = calculateNetDebt(p.id);
                          return (
                            <div
                              key={p.id}
                              onClick={() => setSelectedPersonId(p.id)}
                              className="min-w-[120px] bg-white p-3 rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.05)] border border-gray-100 flex flex-col items-center gap-2 relative snap-center active:scale-95 transition-transform"
                            >
                              {/* Nút Tick Xanh (Settle All) - Mới */}
                              {debt > 0 && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSettleAll(p);
                                  }}
                                  className="absolute top-1 left-1 p-1.5 bg-emerald-50 text-emerald-600 rounded-full shadow-sm z-10"
                                >
                                  <Check size={12} strokeWidth={3} />
                                </button>
                              )}

                              {/* Nút Buzz Vàng - Mới */}
                              {debt > 0 && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleBuzz(p);
                                  }}
                                  className="absolute top-1 right-1 p-1.5 bg-yellow-50 text-yellow-600 rounded-full shadow-sm z-10"
                                >
                                  <Bell size={12} className="fill-current" />
                                </button>
                              )}

                              {p.photoURL ? (
                                <img
                                  src={p.photoURL}
                                  alt={p.name}
                                  className="w-10 h-10 rounded-full object-cover shadow-sm border border-gray-100 shrink-0"
                                />
                              ) : (
                                <Avatar name={p.name} size="md" />
                              )}
                              <div className="text-center w-full">
                                <p className="font-bold text-gray-800 text-xs truncate w-full mb-1">
                                  {p.name}
                                </p>
                                <span
                                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-lg ${
                                    debt >= 0
                                      ? "bg-emerald-50 text-emerald-600"
                                      : "bg-rose-50 text-rose-600"
                                  }`}
                                >
                                  {formatCurrency(Math.abs(debt))}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>

                  {/* Recent History */}
                  <div className="bg-white p-4 rounded-[2rem] shadow-sm flex-1 flex flex-col min-h-[30vh]">
                    {/* Header: Thêm shrink-0 để không bị co lại khi list dài */}
                    <div className="flex justify-between items-center mb-4 px-2 shrink-0">
                      <h3 className="font-bold text-gray-700 text-xs uppercase">
                        Giao dịch mới
                      </h3>
                      <button
                        onClick={() => setIsHistoryModalOpen(true)}
                        className="text-blue-600 text-xs font-bold flex items-center gap-1"
                      >
                        Xem tất cả <ChevronRight size={12} />
                      </button>
                    </div>

                    {/* Body: Thêm overflow-y-auto để cuộn vùng này */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                      {expenses.length === 0 ? (
                        <div className="text-center py-10 text-gray-300 flex flex-col items-center">
                          <History size={32} className="mb-2 opacity-50" />
                          <span className="text-xs">Chưa có giao dịch</span>
                        </div>
                      ) : (
                        <div className="space-y-3 pb-2">
                          {/* Thêm pb-2 để item cuối không bị sát mép dưới quá */}
                          {expenses
                            .filter(
                              (e) =>
                                e.payerId === user?.uid ||
                                e.sharedWith.includes(user?.uid),
                            )
                            .slice(0, 50)
                            .map((e) => renderHistoryItem(e))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* POPUP CHI TIẾT THÀNH VIÊN MOBILE (Giữ nguyên logic cũ nhưng style lại chút) */}
              {selectedPersonId && (
                <div className="fixed inset-0 z-50 bg-white flex flex-col animate-slide-up">
                  <div className="p-4 border-b border-gray-100 flex items-center gap-3">
                    <button
                      onClick={() => setSelectedPersonId(null)}
                      className="p-2 bg-gray-100 rounded-full"
                    >
                      <ArrowRightLeft size={20} />
                    </button>
                    <span className="font-bold text-lg">Chi tiết công nợ</span>
                  </div>
                  {(() => {
                    const p = people.find(
                      (item) => item.id === selectedPersonId,
                    );
                    if (!p) return null;
                    const debt = calculateNetDebt(p.id);
                    const related = expenses.filter(
                      (e) =>
                        (e.payerId === user?.uid &&
                          e.sharedWith.includes(p.id)) ||
                        (e.payerId === p.id &&
                          e.sharedWith.includes(user?.uid)),
                    );

                    return (
                      <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                        <div className="bg-white p-6 rounded-[2rem] shadow-sm text-center mb-6">
                          <Avatar
                            name={p.name}
                            size="lg"
                            src={p.photoURL}
                            className="mx-auto mb-3 shadow-lg"
                          />
                          <h2 className="text-2xl font-bold text-gray-800">
                            {p.name}
                          </h2>
                          {p.email && (
                            <p className="text-sm text-gray-400 mb-4">
                              {p.email}
                            </p>
                          )}

                          <div
                            className={`inline-block px-4 py-2 rounded-xl text-lg font-bold ${
                              debt >= 0
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-rose-100 text-rose-700"
                            }`}
                          >
                            {debt >= 0
                              ? `Nợ tôi: ${formatCurrency(debt)}`
                              : `Tôi nợ: ${formatCurrency(Math.abs(debt))}`}
                          </div>

                          {debt > 0 && (
                            <div className="flex justify-center gap-3 mt-6">
                              <button
                                onClick={() => handleBuzz(p)}
                                className="flex items-center gap-2 px-4 py-2 bg-yellow-400 text-yellow-900 rounded-xl font-bold shadow-md active:scale-95"
                              >
                                <Bell size={18} className="fill-current" />{" "}
                                Buzz!
                              </button>
                              <button
                                onClick={() => handleSettleAll(p)}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl font-bold shadow-md active:scale-95"
                              >
                                <Check size={18} /> Xác nhận trả
                              </button>
                            </div>
                          )}
                        </div>

                        <h3 className="font-bold text-gray-500 text-xs uppercase mb-3 ml-2">
                          Lịch sử chung ({related.length})
                        </h3>
                        <div className="space-y-3 pb-10">
                          {related.map((e) => renderHistoryItem(e, true))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* 3. BOTTOM NAVIGATION (Chỉ hiện khi chưa chọn chi tiết member) */}
            {!selectedPersonId && (
              <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 pb-[env(safe-area-inset-bottom)] shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
                <div className="flex justify-around items-center h-16 px-6">
                  <button
                    onClick={() => setActiveTab("dashboard")}
                    className={`flex flex-col items-center gap-1 ${
                      activeTab === "dashboard"
                        ? "text-blue-600"
                        : "text-gray-400"
                    }`}
                  >
                    <Home
                      size={24}
                      strokeWidth={activeTab === "dashboard" ? 2.5 : 2}
                    />
                    <span className="text-[10px] font-bold">Trang chủ</span>
                  </button>

                  {/* Nút Add to ở giữa - Chỉ hiện khi CÓ Group (để add giao dịch) */}
                  {groupId ? (
                    <div className="relative -top-6">
                      <button
                        onClick={openAddModal}
                        className="w-16 h-16 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-full shadow-xl shadow-blue-300 text-white flex items-center justify-center active:scale-95 transition-transform border-4 border-gray-50"
                      >
                        <Plus size={32} strokeWidth={3} />
                      </button>
                    </div>
                  ) : (
                    // Nếu Global thì nút giữa là tạo Group (hoặc ẩn đi cho đẹp)
                    <div className="w-10"></div>
                  )}

                  <button
                    onClick={() => setActiveTab("people")}
                    className={`flex flex-col items-center gap-1 ${
                      activeTab === "people" ? "text-blue-600" : "text-gray-400"
                    }`}
                  >
                    <Users
                      size={24}
                      strokeWidth={activeTab === "people" ? 2.5 : 2}
                    />
                    <span className="text-[10px] font-bold">
                      {groupId ? "Thành viên" : "Danh bạ"}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        {/* --- DESKTOP / IPAD VIEW --- */}
        {/* Chỉ render khi KHÔNG PHẢI mobile */}
        {!isMobileView && (
          <div className="flex-1 overflow-hidden p-8">
            {/* ========================================================
              TRƯỜNG HỢP 1: GLOBAL VIEW (DANH BẠ & TỔNG QUAN)
              ======================================================== */}
            {!groupId ? (
              activeTab === "people" ? (
                // >>> 1.1: QUẢN LÝ DANH BẠ (THÊM BẠN MỚI TẠI ĐÂY) <<<
                <div className="h-full flex flex-col animate-fade-in">
                  <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <Users className="text-blue-600" /> Danh bạ bạn bè
                  </h2>

                  {/* FORM TÌM & GỬI LỜI MỜI */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 mb-6">
                    <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">
                      Tìm kiếm bạn bè qua Email
                    </label>
                    <div className="flex gap-4">
                      <input
                        value={newPersonEmail}
                        onChange={(e) => setNewPersonEmail(e.target.value)}
                        className="flex-1 p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-blue-500 transition-colors"
                        placeholder="Nhập email bạn bè..."
                      />
                      <button
                        onClick={sendFriendRequest}
                        className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-transform active:scale-95 shrink-0"
                      >
                        Gửi lời mời kết bạn
                      </button>
                    </div>
                  </div>

                  {/* KHU VỰC HIỂN THỊ LỜI MỜI KẾT BẠN */}
                  {friendRequests?.length > 0 && (
                    <div className="mb-6 bg-orange-50/50 p-6 rounded-2xl border border-orange-100">
                      <p className="text-sm font-bold text-orange-600 uppercase mb-4 flex items-center gap-2">
                        <Bell size={18} className="animate-bounce" /> Lời mời
                        đang chờ ({friendRequests.length})
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {friendRequests.map((req) => (
                          <div
                            key={req.id}
                            className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-orange-200 shadow-sm"
                          >
                            {req.photoURL ? (
                              <img
                                src={req.photoURL}
                                alt={req.name}
                                className="w-12 h-12 rounded-full object-cover shrink-0"
                              />
                            ) : (
                              <Avatar name={req.name} size="md" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-gray-800 truncate">
                                {req.name}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                {req.email}
                              </p>
                            </div>
                            <div className="flex flex-col gap-1 shrink-0">
                              <button
                                onClick={() => handleAcceptRequest(req)}
                                className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg shadow-sm active:scale-95"
                              >
                                Chấp nhận
                              </button>
                              <button
                                onClick={() => handleDeclineRequest(req.id)}
                                className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-bold rounded-lg shadow-sm active:scale-95"
                              >
                                Từ chối
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* LIST DANH BẠ HIỆN CÓ */}
                  <div className="flex-1 bg-white rounded-[2rem] shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                      <p className="text-sm text-gray-500">
                        Đây là danh sách bạn bè dùng chung cho tất cả các nhóm.
                      </p>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                      {/* TÌM THẺ DIV NÀY VÀ THAY THẾ NỘI DUNG BÊN TRONG NÓ */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {contacts.length === 0 ? (
                          <div className="col-span-full text-center text-gray-400 mt-10 italic">
                            Chưa có bạn bè nào trong danh bạ.
                          </div>
                        ) : (
                          contacts.map((contact) => (
                            <div
                              key={contact.id}
                              className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100 relative group hover:bg-white hover:shadow-md transition-all"
                            >
                              {/* [SỬA]: Ưu tiên hiển thị ảnh thật nếu có */}
                              {contact.photoURL ? (
                                <img
                                  src={contact.photoURL}
                                  alt={contact.name}
                                  className="w-10 h-10 rounded-full object-cover border border-gray-200 shrink-0"
                                />
                              ) : (
                                <Avatar name={contact.name} size="md" />
                              )}
                              <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-gray-800 truncate">
                                  {contact.name}
                                </h4>
                                {contact.email ? (
                                  <p className="text-xs text-gray-400 truncate">
                                    {contact.email}
                                  </p>
                                ) : (
                                  <p className="text-xs text-orange-400 italic">
                                    Chưa có email
                                  </p>
                                )}
                              </div>

                              {/* Nút Sửa (Hiện khi hover - MỚI) */}
                              {/* Nút Sửa và Xóa (Hiện khi hover - MỚI) */}
                              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all flex gap-2">
                                <button
                                  onClick={() => setEditingContact(contact)}
                                  className="p-2 bg-white text-gray-400 hover:text-blue-600 rounded-lg shadow-sm hover:scale-110 transition-all"
                                  title="Sửa thông tin"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button
                                  onClick={() =>
                                    handleDeleteContact(contact.id)
                                  }
                                  className="p-2 bg-white text-gray-400 hover:text-red-500 rounded-lg shadow-sm hover:scale-110 transition-all"
                                  title="Xóa liên hệ"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // >>> 1.2: DASHBOARD TỔNG QUAN (VIEW MẶC ĐỊNH) <<<
                <div className="h-full flex flex-col animate-fade-in">
                  <h2 className="text-2xl font-bold text-gray-800 mb-6">
                    Tổng quan tài chính
                  </h2>

                  {loadingGlobal ? (
                    <div className="text-gray-500 italic">
                      Đang tải dữ liệu...
                    </div>
                  ) : (
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                      {/* 3 CARD STATS */}
                      <div className="grid grid-cols-3 gap-6 mb-8">
                        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden flex flex-col justify-center min-h-[140px]">
                          <div className="absolute top-[-20px] right-[-20px] w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                          <p className="opacity-80 text-sm font-bold uppercase mb-1 relative z-10">
                            Tài sản ròng
                          </p>
                          <h3
                            className="text-3xl xl:text-4xl font-bold tracking-tight relative z-10 truncate"
                            title={formatCurrency(globalStats.netWorth)}
                          >
                            {formatCompactCurrency(globalStats.netWorth)}
                          </h3>
                        </div>
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-center min-h-[140px]">
                          <p className="text-gray-500 font-bold text-sm uppercase mb-1">
                            Cần thu về
                          </p>
                          <h3
                            className="text-2xl xl:text-3xl font-bold text-emerald-600 truncate"
                            title={formatCurrency(globalStats.totalOwed)}
                          >
                            {formatCompactCurrency(globalStats.totalOwed)}
                          </h3>
                        </div>
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-center min-h-[140px]">
                          <p className="text-gray-500 font-bold text-sm uppercase mb-1">
                            Cần phải trả
                          </p>
                          <h3
                            className="text-2xl xl:text-3xl font-bold text-rose-600 truncate"
                            title={formatCurrency(globalStats.totalDebt)}
                          >
                            {formatCompactCurrency(globalStats.totalDebt)}
                          </h3>
                        </div>
                      </div>

                      {/* LIST CHI TIẾT NỢ TOÀN CỤC */}
                      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
                        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                          <Users size={18} className="text-blue-500" />
                          Chi tiết công nợ (Tất cả các nhóm)
                        </h3>
                        <div className="space-y-2">
                          {globalFriendStats.length === 0 ? (
                            <p className="text-gray-400 text-center italic py-4">
                              Hiện tại không có công nợ nào.
                            </p>
                          ) : (
                            globalFriendStats.map((item, idx) => (
                              <div
                                key={idx}
                                className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-xl transition-colors border-b border-gray-50 last:border-0"
                              >
                                <div className="flex items-center gap-3">
                                  <Avatar
                                    name={item.name}
                                    size="md"
                                    src={item.avatar}
                                  />
                                  <div>
                                    <p className="font-bold text-gray-800">
                                      {item.name}
                                    </p>
                                    {item.email && (
                                      <p className="text-xs text-gray-400">
                                        {item.email}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <div
                                  className={`font-bold text-lg ${
                                    item.amount >= 0
                                      ? "text-emerald-600"
                                      : "text-rose-600"
                                  }`}
                                >
                                  {item.amount >= 0 ? "+" : "-"}
                                  {formatCurrency(Math.abs(item.amount))}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* --- LỊCH SỬ GIAO DỊCH TOÀN CỤC (ĐÃ SỬA: GỌN + NÚT XEM TẤT CẢ) --- */}
                      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8 flex flex-col h-[350px]">
                        <div className="flex justify-between items-center mb-6 shrink-0">
                          <h3 className="font-bold text-gray-800 flex items-center gap-2 text-lg">
                            <History size={20} className="text-violet-500" />
                            Hoạt động gần đây
                          </h3>
                          <div className="flex gap-2">
                            {/* Nút Xem tất cả */}
                            <button
                              onClick={() => setIsHistoryModalOpen(true)}
                              className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-200 transition-colors border border-gray-200"
                            >
                              <span>Xem tất cả</span>
                              <ChevronRight size={12} />
                            </button>

                            {/* Nút Tạo nhóm */}
                            <button
                              onClick={() => setIsCreateGroupModalOpen(true)}
                              className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors border border-blue-100"
                            >
                              <Plus size={14} /> Tạo nhóm
                            </button>
                          </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                          {globalHistory.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-60">
                              <div className="bg-gray-50 p-4 rounded-full mb-3">
                                <History size={32} />
                              </div>
                              <p className="text-sm">Chưa có giao dịch nào.</p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {globalHistory.slice(0, 10).map(
                                (
                                  item,
                                  idx, // Chỉ hiện 10 tin mới nhất ở đây cho gọn
                                ) => (
                                  <div key={`${item.id}_${idx}`}>
                                    {renderHistoryItem(item)}
                                  </div>
                                ),
                              )}
                              {globalHistory.length > 10 && (
                                <p className="text-center text-xs text-gray-400 pt-4 italic">
                                  ... và {globalHistory.length - 10} giao dịch
                                  khác
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            ) : (
              /* ========================================================
               TRƯỜNG HỢP 2: GROUP VIEW (KHI ĐÃ CHỌN NHÓM)
               ======================================================== */
              <div className="h-full flex flex-col animate-fade-in">
                <div className="flex justify-between items-center mb-6 shrink-0">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                      {myGroups.find((g) => g.id === groupId)?.name}
                    </h2>
                    <p className="text-xs text-gray-400 font-mono mt-1">
                      ID: {groupId}
                    </p>
                  </div>
                  {/* TAB SWITCHER */}
                  {!selectedPersonId && (
                    <div className="flex bg-gray-100 p-1 rounded-xl">
                      <button
                        onClick={() => setActiveTab("dashboard")}
                        className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                          activeTab === "dashboard"
                            ? "bg-white shadow text-blue-600"
                            : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        <LayoutDashboard size={18} /> Tổng quan
                      </button>
                      <button
                        onClick={() => setActiveTab("people")}
                        className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                          activeTab === "people"
                            ? "bg-white shadow text-blue-600"
                            : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        <Users size={18} /> Thành viên
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex-1 overflow-hidden relative">
                  {selectedPersonId ? (
                    // >>> 2.1: POPUP CHI TIẾT THÀNH VIÊN <<<
                    <div className="h-full bg-white rounded-[2rem] shadow-sm border border-gray-200 flex flex-col relative overflow-hidden animate-slide-up">
                      <div className="p-6 border-b flex justify-between items-center bg-gray-50">
                        <h2 className="font-bold text-xl text-gray-700">
                          Chi tiết công nợ
                        </h2>
                        <button
                          onClick={() => setSelectedPersonId(null)}
                          className="p-2 bg-white rounded-full shadow hover:bg-gray-100"
                        >
                          <X size={20} />
                        </button>
                      </div>
                      <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                        {(() => {
                          const p = people.find(
                            (item) => item.id === selectedPersonId,
                          );
                          if (!p) return null;
                          const debt = calculateNetDebt(p.id);
                          const related = expenses.filter(
                            (e) =>
                              (e.payerId === user?.uid &&
                                e.sharedWith.includes(p.id)) ||
                              (e.payerId === p.id &&
                                e.sharedWith.includes(user?.uid)),
                          );
                          return (
                            <div className="max-w-3xl mx-auto">
                              <div className="flex items-center gap-8 mb-10 p-8 bg-gray-50/80 rounded-[2rem] border border-gray-100 relative">
                                <Avatar
                                  name={p.name}
                                  size="lg"
                                  className="shadow-lg"
                                />
                                <div>
                                  <h2 className="text-4xl font-bold text-gray-800">
                                    {p.name}
                                  </h2>
                                  {p.email && (
                                    <p className="text-gray-500 font-medium mt-1">
                                      {p.email}
                                    </p>
                                  )}
                                  <div
                                    className={`mt-3 inline-flex items-center px-4 py-2 rounded-xl text-lg font-bold ${
                                      debt >= 0
                                        ? "bg-emerald-100 text-emerald-700"
                                        : "bg-rose-100 text-rose-700"
                                    }`}
                                  >
                                    {debt >= 0
                                      ? `Nợ tôi: ${formatCurrency(debt)}`
                                      : `Tôi nợ: ${formatCurrency(
                                          Math.abs(debt),
                                        )}`}
                                  </div>
                                </div>
                                {debt > 0 && (
                                  <button
                                    onClick={() => handleBuzz(p)}
                                    className="absolute right-8 top-1/2 -translate-y-1/2 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 px-6 py-4 rounded-2xl font-bold shadow-lg flex flex-col items-center gap-1 active:scale-95"
                                  >
                                    <Bell
                                      size={24}
                                      className="fill-current animate-pulse"
                                    />{" "}
                                    BUZZ!
                                  </button>
                                )}
                              </div>
                              <h3 className="font-bold text-gray-400 text-sm uppercase mb-6 flex items-center gap-4">
                                <span className="bg-gray-200 h-px flex-1"></span>{" "}
                                Lịch sử chung ({related.length}){" "}
                                <span className="bg-gray-200 h-px flex-1"></span>
                              </h3>
                              <div className="space-y-4">
                                {related.map((e) => renderHistoryItem(e))}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  ) : activeTab === "people" ? (
                    // >>> 2.2: QUẢN LÝ THÀNH VIÊN NHÓM (CHỌN TỪ DANH BẠ) <<<
                    <div className="h-full overflow-y-auto custom-scrollbar">
                      <div className="max-w-4xl mx-auto space-y-8 bg-white p-8 rounded-[2rem] shadow-sm border border-gray-200">
                        {/* KHU VỰC CHỌN TỪ DANH BẠ */}
                        <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                          <h3 className="font-bold text-blue-800 mb-4 flex items-center gap-2">
                            <Plus size={20} /> Thêm thành viên từ Danh bạ
                          </h3>

                          {contacts.length === 0 ? (
                            <p className="text-sm text-gray-500 italic">
                              Danh bạ trống. Hãy ra ngoài "Danh bạ bạn bè" để
                              thêm trước.
                            </p>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {/* Thông báo nếu đã thêm hết */}
                              {contacts.filter(
                                (c) => !people.some((p) => p.id === c.id),
                              ).length === 0 && (
                                <p className="text-sm text-gray-500 italic">
                                  Tất cả bạn bè đã có trong nhóm này.
                                </p>
                              )}

                              {/* Nút bấm thêm nhanh */}
                              {contacts
                                .filter(
                                  (c) => !people.some((p) => p.id === c.id),
                                ) // Chỉ hiện người CHƯA ở trong nhóm
                                .map((contact) => (
                                  <button
                                    key={contact.id}
                                    onClick={() => addContactToGroup(contact)}
                                    className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-blue-200 shadow-sm hover:shadow-md hover:border-blue-500 hover:text-blue-600 transition-all text-sm font-bold text-gray-700"
                                  >
                                    <Avatar name={contact.name} size="sm" />
                                    {contact.name}
                                    <Plus size={14} className="ml-1" />
                                  </button>
                                ))}
                            </div>
                          )}
                          <div className="mt-4 pt-4 border-t border-blue-100">
                            <p className="text-xs text-blue-400 italic">
                              * Muốn thêm người mới hoàn toàn? Hãy quay lại tab
                              "Danh bạ bạn bè" ở ngoài trang chủ.
                            </p>
                          </div>
                        </div>

                        <h3 className="font-bold text-xl text-gray-800 flex items-center gap-2">
                          Thành viên hiện tại{" "}
                          <span className="text-sm bg-gray-100 text-gray-500 px-2 py-1 rounded-lg">
                            {people.length}
                          </span>
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {people.map((p) => (
                            <div
                              key={p.id}
                              className="p-4 bg-gray-50 rounded-2xl flex justify-between items-center group hover:bg-white hover:shadow-md transition-all border border-transparent hover:border-gray-100"
                            >
                              <div className="flex items-center gap-4">
                                {p.photoURL ? (
                                  <img
                                    src={p.photoURL}
                                    alt={p.name}
                                    className="w-10 h-10 rounded-full object-cover shadow-sm border border-gray-100 shrink-0"
                                  />
                                ) : (
                                  <Avatar name={p.name} size="md" />
                                )}
                                <div>
                                  <div className="font-bold text-lg text-gray-700">
                                    {p.name}
                                  </div>
                                  {p.email && (
                                    <div className="text-sm text-gray-400">
                                      {p.email}
                                    </div>
                                  )}
                                </div>
                              </div>
                              {/* Nút xóa thành viên (chỉ hiện nếu không phải chính mình) */}
                              {p.id !== user?.uid && (
                                <button
                                  onClick={() => deletePerson(p.id)}
                                  className="text-gray-300 hover:text-red-500 p-2 bg-white rounded-xl shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Xóa khỏi nhóm"
                                >
                                  <Trash2 size={20} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    // >>> 2.3: DASHBOARD NHÓM (GRID CÔNG NỢ & LỊCH SỬ) <<<
                    <div className="flex flex-col h-full gap-4">
                      {/* Grid Nợ & Stats */}
                      <div className="flex flex-col md:flex-row gap-4 shrink-0 h-[40%] min-h-[300px]">
                        <div className="flex-1 flex flex-col min-h-0">
                          <h2 className="font-bold text-gray-700 flex items-center gap-2 mb-2 text-base shrink-0">
                            <Users size={18} className="text-blue-500" /> Bảng
                            công nợ
                          </h2>
                          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar pb-2">
                            <div className="grid grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
                              {/* LỌC BỎ CHÍNH MÌNH (user.uid) KHỎI GRID */}
                              {sortedPeople
                                .filter((p) => p.id !== user?.uid)
                                .map((person) => {
                                  const debt = calculateNetDebt(person.id);
                                  return (
                                    <div
                                      key={person.id}
                                      onClick={() =>
                                        setSelectedPersonId(person.id)
                                      }
                                      className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 cursor-pointer hover:shadow-md hover:-translate-y-1 hover:border-blue-300 transition-all flex flex-col items-center text-center relative group"
                                    >
                                      {/* NÚT BUZZ */}
                                      {debt > 0 && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleBuzz(person);
                                          }}
                                          className="absolute top-2 right-2 text-yellow-600 bg-yellow-50 p-1.5 rounded-full hover:bg-yellow-200 hover:scale-110 transition-all shadow-sm z-10"
                                        >
                                          <Bell
                                            size={14}
                                            className="fill-current"
                                          />
                                        </button>
                                      )}
                                      {/* NÚT CHECK (SETTLE) */}
                                      {debt > 0 && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleSettleAll(person);
                                          }}
                                          className="absolute top-2 left-2 text-emerald-600 bg-emerald-50 p-1.5 rounded-full hover:bg-emerald-200 hover:scale-110 transition-all shadow-sm z-10"
                                          title="Xác nhận người này đã trả hết tiền cho tôi"
                                        >
                                          <Check size={14} strokeWidth={3} />
                                        </button>
                                      )}

                                      <Avatar
                                        name={person.name}
                                        size="md"
                                        src={person.photoURL}
                                        className="mb-2 shadow-sm"
                                      />
                                      <p className="font-bold text-gray-800 text-sm line-clamp-1 w-full px-1">
                                        {person.name}
                                      </p>
                                      <div
                                        className={`mt-1 font-extrabold text-lg tracking-tight ${
                                          debt >= 0
                                            ? "text-emerald-600"
                                            : "text-rose-600"
                                        }`}
                                      >
                                        {formatCurrency(Math.abs(debt))}
                                      </div>
                                      <span
                                        className={`text-[9px] font-bold uppercase tracking-wider mt-1 px-1.5 py-0.5 rounded-md ${
                                          debt >= 0
                                            ? "bg-emerald-50 text-emerald-600"
                                            : "bg-rose-50 text-rose-600"
                                        }`}
                                      >
                                        {debt >= 0 ? "Nợ tôi" : "Tôi nợ"}
                                      </span>
                                    </div>
                                  );
                                })}

                              {/* NÚT THÊM THÀNH VIÊN NHANH TRONG GRID */}
                              <div
                                onClick={() => setActiveTab("people")}
                                className="bg-gray-50 p-3 rounded-2xl border-2 border-dashed border-gray-300 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all flex flex-col items-center justify-center text-center group min-h-[120px]"
                              >
                                <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-400 group-hover:text-blue-500 mb-2 transition-colors">
                                  <Plus size={20} />
                                </div>
                                <span className="text-xs font-bold text-gray-400 group-hover:text-blue-600 transition-colors">
                                  Thêm thành viên
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        {/* Cột Stats */}
                        <div className="w-full md:w-64 xl:w-72 flex flex-col shrink-0">
                          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-5 text-white shadow-lg shadow-blue-200/50 relative overflow-hidden h-full flex flex-col justify-center">
                            <div className="absolute top-[-50px] right-[-50px] w-48 h-48 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
                            <div className="mb-4 text-center md:text-left relative z-10">
                              <p className="opacity-80 font-bold text-xs uppercase tracking-wider mb-1">
                                Tài sản ròng (Nhóm này)
                              </p>
                              <h3
                                className="text-3xl xl:text-4xl font-bold tracking-tighter truncate"
                                // [FIX] Thay bằng myNetBalance
                                title={formatCurrency(displayNetBalance)}
                              >
                                {formatCompactCurrency(displayNetBalance)}
                              </h3>
                            </div>
                            <div className="space-y-3 relative z-10">
                              <div className="bg-white/10 p-3 rounded-xl backdrop-blur-md border border-white/10 flex items-center gap-3">
                                <div className="p-2 bg-emerald-500/20 rounded-lg">
                                  <TrendingUp
                                    size={18}
                                    className="text-emerald-300"
                                  />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-[9px] opacity-80 uppercase font-bold">
                                    Cần thu
                                  </p>
                                  <p
                                    className="font-bold text-lg text-emerald-300 truncate"
                                    // [FIX] Thay bằng myTotalReceivable
                                    title={formatCurrency(displayReceivable)}
                                  >
                                    {formatCompactCurrency(displayReceivable)}
                                  </p>
                                </div>
                              </div>
                              <div className="bg-white/10 p-3 rounded-xl backdrop-blur-md border border-white/10 flex items-center gap-3">
                                <div className="p-2 bg-rose-500/20 rounded-lg">
                                  <TrendingDown
                                    size={18}
                                    className="text-rose-300"
                                  />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-[9px] opacity-80 uppercase font-bold">
                                    Cần trả
                                  </p>
                                  <p
                                    className="font-bold text-lg text-rose-300 truncate"
                                    // [FIX] Thay bằng myTotalPayable
                                    title={formatCurrency(displayPayable)}
                                  >
                                    {formatCompactCurrency(displayPayable)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Lịch sử giao dịch */}
                      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col min-h-0 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                          <h2 className="font-bold text-gray-800 flex items-center gap-2 text-base">
                            <History size={20} className="text-violet-500" />{" "}
                            Giao dịch gần đây
                          </h2>
                          <button
                            onClick={() => setIsHistoryModalOpen(true)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-violet-50 hover:text-violet-600 transition-all shadow-sm"
                          >
                            <span>Xem tất cả ({expenses.length})</span>
                            <div className="bg-gray-100 p-1 rounded">
                              <ChevronRight size={12} />
                            </div>
                          </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                          {expenses.length === 0 && (
                            <div className="text-center text-gray-400 mt-10 text-sm">
                              Chưa có giao dịch nào
                            </div>
                          )}
                          {expenses
                            .filter(
                              (exp) =>
                                exp.payerId === user?.uid ||
                                exp.sharedWith.includes(user?.uid),
                            )
                            .slice(0, 50)
                            .map((exp) => renderHistoryItem(exp, true))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
