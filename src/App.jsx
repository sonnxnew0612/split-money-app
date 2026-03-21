import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
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
  UserMinus,
  Link,
  Copy,
  Pen, // <----- THÊM CHỮ Pen VÀO ĐÂY
} from "lucide-react";
import appIcon from "./assets/icon.png";
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
  arrayRemove,
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
    return (number / 1_000).toFixed(0) + " k";
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
    // Đã sửa z-[200] thành z-[9999] để không bao giờ bị form nào che mất nữa
    <div className="fixed top-14 left-1/2 -translate-x-1/2 z-[9999] animate-fade-in-down">
      <div
        className={`flex items-center gap-3 px-6 py-3 rounded-full shadow-2xl shadow-black/20  border ${
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
        <span className="font-bold text-base md:text-sm">{message}</span>
      </div>
    </div>
  );
};

// --- COMPONENT XÁC NHẬN XÓA (Custom Dialog) ---
const ConfirmDialog = ({ isOpen, onClose, onConfirm, title, message }) => {
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) setIsLoading(false);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsLoading(true);
    await onConfirm();
    // Đóng form sẽ do component cha quản lý
  };

  return (
    <div
      className="fixed inset-0 z-[600] bg-black/60  flex items-center justify-center p-4 animate-fade-in cursor-pointer" // <-- Sửa cho iPad
      onClick={!isLoading ? onClose : undefined}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-scale-up cursor-default" // <-- Sửa cho iPad
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
          <Trash2 size={24} />
        </div>
        <h3 className="text-xl font-bold text-center text-gray-800 mb-2">
          {title || "Xác nhận xóa"}
        </h3>
        <p className="text-gray-500 text-center mb-6 text-base md:text-sm leading-relaxed">
          {message ||
            "Hành động này không thể hoàn tác. Bạn có chắc chắn muốn tiếp tục?"}
        </p>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Hủy bỏ
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 shadow-lg shadow-red-200 transition-colors flex justify-center items-center disabled:opacity-50"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              "Xóa ngay"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- COMPONENT AVATAR (ĐÃ FIX TRỊỆT ĐỂ LỖI MÉO ẢNH TRÊN MOBILE) ---
const Avatar = ({ name, src, size = "md", className = "" }) => {
  const sizeClasses = {
    xs: "w-6 h-6 text-[9px]",
    sm: "w-8 h-8 ",
    md: "w-10 h-10 text-[12px]",
    lg: "w-16 h-16 text-xl",
    xl: "w-24 h-24 text-3xl",
  };
  const currentSizeClass = sizeClasses[size] || sizeClasses.md;

  // NẾU CÓ ẢNH TỪ GOOGLE (SRC)
  if (src) {
    const dimensions = currentSizeClass.split(" ").slice(0, 2).join(" ");
    return (
      // 1. THẺ DIV BAO NGOÀI: Làm chiếc "khung" đóng cứng kích thước và bo tròn (overflow-hidden)
      <div
        className={`${dimensions} rounded-full overflow-hidden shrink-0 shadow-sm border border-gray-100 flex items-center justify-center bg-gray-50 ${className}`}
      >
        {/* 2. THẺ IMG BÊN TRONG: Đã thêm object-top và image-rendering */}
        <img
          src={src}
          alt={name || "Avatar"}
          // THÊM "object-top" ĐỂ KHUNG CẮT ẢNH ƯU TIÊN LẤY KHUÔN MẶT Ở NỬA TRÊN
          className="w-full h-full object-cover object-top"
          // BẬT CHẾ ĐỘ RENDER ẢNH SIÊU NÉT (Chống nhòe khi thu nhỏ)
          style={{ imageRendering: "-webkit-optimize-contrast" }}
        />
      </div>
    );
  }

  // NẾU KHÔNG CÓ ẢNH (CHỈ CÓ TÊN) -> GIỮ NGUYÊN CODE CỦA BẠN
  const safeName = typeof name === "string" ? name.trim() : "?";
  const isMe = safeName === "Tôi" || safeName.toLowerCase() === "me";

  const initials = isMe
    ? "ME"
    : safeName.length > 0
    ? safeName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase()
    : "?";

  // Bảng màu mới: Tone màu Pastel / Thanh lịch
  const colors = [
    "bg-blue-400", // Xanh dương nhạt
    "bg-indigo-400", // Xanh tím
    "bg-violet-500", // Tím đậm
    "bg-fuchsia-500", // Tím hồng năng động
    "bg-emerald-400", // Xanh lá ngọc (Rất trend)
    "bg-cyan-500", // Xanh lơ trong trẻo
    "bg-amber-400", // Vàng cam ấm
  ];

  const colorIndex = safeName.length ? safeName.length % colors.length : 0;
  const bgColor = isMe ? "bg-slate-700" : colors[colorIndex];

  return (
    <div
      className={`${currentSizeClass} ${bgColor} rounded-full flex items-center justify-center text-white font-bold shadow-sm border-2 border-white shrink-0 ${className}`}
    >
      {initials}
    </div>
  );
};

// THÊM ĐOẠN NÀY LÊN TRÊN CÙNG
const GroupItem = React.memo(
  ({ group, isMobile, onSelectGroup, onEditGroup, onDeleteGroup }) => {
    const [isSwiped, setIsSwiped] = React.useState(false);
    const itemRef = React.useRef(null);

    React.useEffect(() => {
      if (!isSwiped) return;

      const handleTouchOrClick = (e) => {
        if (itemRef.current && itemRef.current.contains(e.target)) return;
        setIsSwiped(false);
      };

      const handleScroll = () => setIsSwiped(false);

      document.addEventListener("touchstart", handleTouchOrClick, {
        passive: true,
      });
      document.addEventListener("mousedown", handleTouchOrClick);
      window.addEventListener("scroll", handleScroll, true);

      return () => {
        document.removeEventListener("touchstart", handleTouchOrClick);
        document.removeEventListener("mousedown", handleTouchOrClick);
        window.removeEventListener("scroll", handleScroll, true);
      };
    }, [isSwiped]);

    return (
      <motion.div
        ref={itemRef}
        initial={{ opacity: 0, y: 15, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 24 }}
        // Bật tăng tốc GPU
        className="relative mb-3 isolate transform-gpu will-change-transform"
      >
        {/* KHỐI NÚT SỬA & XÓA (Nằm tàng hình ở dưới đáy) */}
        {isMobile && (
          <div className="absolute top-0 bottom-0 right-0 w-[120px] bg-gray-100 rounded-2xl flex justify-end items-center overflow-hidden z-0">
            <div
              className="h-full w-[60px] bg-yellow-400 flex flex-col items-center justify-center text-yellow-900 active:bg-yellow-500 transition-colors cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onEditGroup(group);
                setIsSwiped(false);
              }}
            >
              <Pen size={16} />
              <span className="text-[10px] font-bold mt-1 select-none">
                Sửa
              </span>
            </div>

            <div
              className="h-full w-[60px] bg-red-500 flex flex-col items-center justify-center text-white active:bg-red-600 transition-colors cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteGroup(group);
                setIsSwiped(false);
              }}
            >
              <Trash2 size={16} />
              <span className="text-[10px] font-bold mt-1 select-none">
                Xóa
              </span>
            </div>
          </div>
        )}

        {/* THẺ NHÓM CHÍNH (ĐƯỢC VUỐT) */}
        <motion.div
          drag={isMobile ? "x" : false}
          dragDirectionLock={true}
          style={{ touchAction: "pan-y" }}
          dragConstraints={{ left: -120, right: 0 }}
          dragElastic={0.05}
          onDragEnd={(e, info) => {
            if (info.offset.x < -40 || info.velocity.x < -300) {
              setIsSwiped(true);
            } else {
              setIsSwiped(false);
            }
          }}
          animate={{ x: isSwiped ? -120 : 0 }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 26,
            mass: 0.8,
          }}
          onClick={() => {
            if (isSwiped) {
              setIsSwiped(false);
            } else {
              onSelectGroup(group.id);
            }
          }}
          // ---> SỬA Ở ĐÂY: Đã xóa active:bg-violet-50/50
          className="group flex items-center gap-3 p-3 bg-white rounded-2xl border border-gray-100 shadow-sm relative z-10 w-full transition-colors cursor-pointer transform-gpu will-change-transform"
        >
          <div className="w-10 h-10 rounded-xl bg-violet-100 text-indigo-600 flex items-center justify-center font-bold shrink-0">
            {group.icon || "🏕️"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-gray-800 text-base truncate select-none">
              {group.name}
            </p>
          </div>
          <div className="text-gray-300 animate-pulse pl-2">
            <ChevronLeft size={16} strokeWidth={3} />
          </div>

          {/* BỘ NÚT CHO PC (SẼ HIỆN KHI DI CHUỘT) */}
          {!isMobile && (
            <div
              className="absolute top-1/2 -translate-y-1/2 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEditGroup(group);
                }}
                className="text-yellow-600 hover:text-yellow-700 bg-yellow-50 p-2 rounded-xl shadow-sm hover:bg-yellow-100 transition-colors"
              >
                <Pen size={16} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteGroup(group);
                }}
                className="text-red-500 hover:text-red-600 bg-red-50 p-2 rounded-xl shadow-sm hover:bg-red-100 transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    );
  },
  (prevProps, nextProps) => {
    return JSON.stringify(prevProps.group) === JSON.stringify(nextProps.group);
  },
);

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
    <div className="fixed inset-0 z-[300] bg-black/70 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white w-full max-w-4xl h-[80dvh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-slide-up">
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
              <p className="text-base md:text-sm text-gray-500">
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

// --- COMPONENT HỢP NHẤT TÀI KHOẢN ---
const MergeContactModal = ({
  isOpen,
  onClose,
  fakeContact,
  realContacts,
  onConfirm,
}) => {
  if (!isOpen || !fakeContact) return null;

  return (
    <div
      className="fixed inset-0 z-[500] bg-black/70 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-bold text-gray-800 mb-2">
          Liên kết tài khoản
        </h3>
        <p className="text-base md:text-sm text-gray-500 mb-6">
          Chọn một người bạn <b>đã kết bạn (có Email)</b> để thay thế cho tài
          khoản ảo <b className="text-indigo-600">{fakeContact.name}</b> trong
          tất cả các nhóm.
        </p>

        <div className="max-h-[50vh] overflow-y-auto custom-scrollbar space-y-2">
          {realContacts.length === 0 ? (
            <p className="text-center text-base md:text-sm italic text-gray-400 py-4">
              Bạn chưa có bạn bè nào có Email để liên kết.
            </p>
          ) : (
            realContacts.map((friend) => {
              // Kiểm tra xem tài khoản này đã từng liên kết chưa
              const isAlreadyLinked = friend.isLinked;

              return (
                <button
                  key={friend.id}
                  onClick={() => !isAlreadyLinked && onConfirm(friend)}
                  disabled={isAlreadyLinked}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                    isAlreadyLinked
                      ? "border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed"
                      : "border-gray-100 hover:border-blue-500 hover:bg-violet-50/50"
                  }`}
                >
                  <Avatar name={friend.name} src={friend.photoURL} size="md" />
                  <div className="flex-1">
                    <p className="font-bold text-gray-800">{friend.name}</p>
                    <p className=" text-gray-500">{friend.email}</p>
                  </div>

                  {/* Nếu đã liên kết thì hiện nhãn xám, ngược lại hiện nút Chọn */}
                  {isAlreadyLinked ? (
                    <div className=" font-bold text-gray-400 bg-gray-200 px-2 py-1 rounded-lg">
                      Đã liên kết
                    </div>
                  ) : (
                    <div className=" font-bold text-indigo-600 bg-white px-2 py-1 rounded-lg border border-violet-100">
                      Chọn
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
        <button
          onClick={onClose}
          className="w-full mt-4 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200"
        >
          Hủy bỏ
        </button>
      </div>
    </div>
  );
};

// --- COMPONENT EXPENSE MODAL (BẢN TỐI ƯU UX CHO IPAD/PC, KHÓA SCROLL & TÁCH MÀN HÌNH CHỌN NGƯỜI) ---
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
    shippingFee: "",
    discount: "",
    billImage: null,
    comments: [],
    loanType: "lend",
  });

  // 1. Khai báo Ref để giám sát các trạng thái đóng/mở UI

  const [currentView, setCurrentView] = useState("form"); // "form" | "payer_select" | "participant_select"
  const [uploading, setUploading] = useState(false);
  const [commentText, setCommentText] = useState("");

  // Khởi tạo sharedWith mặc định khi tạo mới
  useEffect(() => {
    if (isOpen && !editingExpense && form.sharedWith.length === 0) {
      setForm((prev) => ({ ...prev, sharedWith: [prev.payerId] }));
    }
  }, [isOpen, editingExpense]);

  // --- HELPER MỚI: RENDER AVATAR ---
  const renderMyAvatar = (size = "sm") => {
    const sizeClasses = {
      xs: "w-6 h-6 ",
      sm: "w-8 h-8 ",
      md: "w-10 h-10 text-base md:text-sm",
    };
    const css = sizeClasses[size] || sizeClasses.sm;
    if (user?.photoURL) {
      return (
        <img
          src={user.photoURL}
          alt="Me"
          className={`${css.split(" ")[0]} ${
            css.split(" ")[1]
          } rounded-full object-cover shadow-sm border-2 border-white shrink-0`}
        />
      );
    }
    return <Avatar name={user?.displayName || "Tôi"} size={size} />;
  };

  // --- EFFECT 1: LOAD DATA ---
  useEffect(() => {
    if (isOpen) {
      if (editingExpense) {
        // --- BẢN FIX: Dịch ngược UID thật về chữ "me" để Modal hiểu đúng là "Tôi" ---
        const uid = user?.uid;

        let loadedPayerId = editingExpense.payerId || "me";
        if (loadedPayerId === uid) loadedPayerId = "me";

        let loadedSharedWith = editingExpense.sharedWith || [];
        loadedSharedWith = loadedSharedWith.map((id) =>
          id === uid ? "me" : id,
        );

        let loadedCustomShares = {
          ...(editingExpense.baseShares || editingExpense.customShares || {}),
        };
        if (uid && loadedCustomShares[uid] !== undefined) {
          loadedCustomShares["me"] = loadedCustomShares[uid];
          delete loadedCustomShares[uid];
        }
        // --------------------------------------------------------------------------

        setForm({
          description: editingExpense.description || "",
          amount: editingExpense.amount ? String(editingExpense.amount) : "",
          date: editingExpense.date
            ? format(new Date(editingExpense.date), "yyyy-MM-dd")
            : format(new Date(), "yyyy-MM-dd"),
          sharedWith: loadedSharedWith,
          payerId: loadedPayerId,
          type: editingExpense.type || "split",
          customShares: loadedCustomShares,
          shippingFee: editingExpense.shippingFee || "",
          discount: editingExpense.discount || "",
          billImage: editingExpense.billImage || null,
          comments: editingExpense.comments || [],
          loanType: editingExpense.loanType || "lend",
        });
      } else {
        setForm({
          description: "",
          amount: "",
          date: format(new Date(), "yyyy-MM-dd"),
          sharedWith: ["me"], // Mặc định có mình
          payerId: "me",
          type: "split",
          customShares: {},
          shippingFee: "",
          discount: "",
          billImage: null,
          comments: [],
          loanType: "lend",
        });
      }
      setCurrentView("form");
      setCommentText("");
    }
  }, [editingExpense, isOpen, user?.uid]);

  // --- EFFECT 2: LOGIC TỰ ĐỘNG CHO SPLIT (ĐÃ CẬP NHẬT CHỐNG TRÙNG LẶP LỖI) ---
  useEffect(() => {
    if (form.type === "split" && form.payerId) {
      const uid = user?.uid;
      // Quy đổi id người trả về chuẩn để so sánh
      const actualPayerId = form.payerId === "me" ? uid : form.payerId;

      // Kiểm tra an toàn: Người trả tiền ĐÃ CÓ trong danh sách chia chưa?
      // (Bất kể đang lưu dưới dạng chữ "me" hay UID thật)
      const hasPayer = form.sharedWith.some(
        (id) => (id === "me" ? uid : id) === actualPayerId,
      );

      if (!hasPayer) {
        setForm((prev) => ({
          ...prev,
          sharedWith: [...prev.sharedWith, prev.payerId],
        }));
      }
    }
  }, [form.payerId, form.type, form.sharedWith, user?.uid]);

  if (!isOpen) return null;

  // --- HANDLERS: CHIA TIỀN ---
  const togglePerson = (id) => {
    if (form.type === "full") {
      setForm({ ...form, sharedWith: [id] });
      return;
    }

    const list = form.sharedWith;
    let newCustomShares = { ...form.customShares };

    if (!list.includes(id)) {
      newCustomShares[id] = [""];
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

  const handleSpecificChange = (personId, index, value) => {
    setForm((prev) => {
      const currentVal = prev.customShares[personId];
      const currentArr = Array.isArray(currentVal)
        ? [...currentVal]
        : currentVal
        ? [currentVal]
        : [""];
      currentArr[index] = value;
      return {
        ...prev,
        customShares: { ...prev.customShares, [personId]: currentArr },
      };
    });
  };

  const handleAddQuantity = (personId) => {
    setForm((prev) => {
      const currentVal = prev.customShares[personId];
      const currentArr = Array.isArray(currentVal)
        ? [...currentVal]
        : currentVal
        ? [currentVal]
        : [""];
      return {
        ...prev,
        customShares: { ...prev.customShares, [personId]: [...currentArr, ""] },
      };
    });
  };

  const handleRemoveQuantity = (personId) => {
    setForm((prev) => {
      const currentVal = prev.customShares[personId];
      const currentArr = Array.isArray(currentVal)
        ? [...currentVal]
        : currentVal
        ? [currentVal]
        : [""];

      if (currentArr.length > 1) {
        // Trừ bớt 1 món (Giữ nguyên logic cũ)
        currentArr.pop();
        return {
          ...prev,
          customShares: { ...prev.customShares, [personId]: currentArr },
        };
      } else {
        // NẾU CHỈ CÒN 1 MÓN MÀ BẤM DẤU "-" -> XÓA LUÔN NGƯỜI ĐÓ KHỎI DANH SÁCH
        const newSharedWith = prev.sharedWith.filter((id) => id !== personId);
        const newCustomShares = { ...prev.customShares };
        delete newCustomShares[personId]; // Dọn dẹp dữ liệu rác

        return {
          ...prev,
          sharedWith: newSharedWith,
          customShares: newCustomShares,
        };
      }
    });
  };

  const getPayerName = () => {
    if (form.payerId === "me") return "Tôi";
    const p = people.find((i) => i.id === form.payerId);
    return p ? p.name : "Chưa chọn";
  };

  const getSharedWithNames = () => {
    if (form.sharedWith.length === 0) return "Chưa chọn ai";
    const names = form.sharedWith.map((id) =>
      id === "me" || id === user?.uid
        ? "Tôi"
        : people.find((p) => p.id === id)?.name || "",
    );
    return names.join(", ");
  };

  // --- HANDLERS: UPLOAD ẢNH & COMMENT ---
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
      showToast("Lỗi tải ảnh: " + error.message, "error");
    } finally {
      setUploading(false);
    }
  };

  const handleAddComment = () => {
    if (!commentText.trim()) return;
    const newComment = {
      id: uuidv4(),
      text: commentText,
      userName: currentUser?.displayName || user?.displayName || "Tôi",
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
    if (!form.description.trim()) {
      showToast("Vui lòng nhập nội dung!", "error");
      return;
    }

    if (form.type === "custom") {
      let currentSum = 0;
      const autoSharedWith = [];
      const ship = parseInt(form.shippingFee) || 0;
      const disc = parseInt(form.discount) || 0;
      const netDiscount = disc - ship;

      const getSum = (val) => {
        const arr = Array.isArray(val) ? val : [val];
        return arr.reduce((acc, curr) => acc + parseInt(curr || 0), 0);
      };

      const getValidCount = (val) => {
        const arr = Array.isArray(val) ? val : [val];
        return arr.filter((curr) => parseInt(curr || 0) > 0).length;
      };

      let totalSlots = 0;
      const allParticipantIds = [
        "me",
        ...people.filter((p) => p.id !== user?.uid).map((p) => p.id),
      ];

      allParticipantIds.forEach((pId) => {
        if (
          form.sharedWith.includes(pId === "me" ? user?.uid : pId) ||
          (pId === "me" && form.sharedWith.includes("me"))
        ) {
          if (getSum(form.customShares[pId]) > 0) {
            totalSlots += getValidCount(form.customShares[pId]);
          }
        }
      });

      const adjustmentPerSlot =
        totalSlots > 0 ? Math.floor(netDiscount / totalSlots) : 0;
      const finalSharesToSave = {};

      allParticipantIds.forEach((pId) => {
        const actualId = pId === "me" ? user?.uid || "me" : pId;
        if (
          form.sharedWith.includes(actualId) ||
          form.sharedWith.includes(pId)
        ) {
          const originalShare = getSum(form.customShares[pId]);
          const pSlots = getValidCount(form.customShares[pId]);

          if (originalShare > 0) {
            const pAdjustment = adjustmentPerSlot * pSlots;
            const finalShare = Math.max(0, originalShare - pAdjustment);
            finalSharesToSave[pId] = finalShare.toString();
            currentSum += finalShare;

            if (pId !== "me") autoSharedWith.push(pId);
          }
        }
      });

      if (currentSum === 0) {
        showToast("Vui lòng nhập số tiền cho ít nhất 1 người!", "error");
        return;
      }

      form.baseShares = { ...form.customShares };
      form.customShares = finalSharesToSave;
      form.sharedWith =
        autoSharedWith.length > 0 ? autoSharedWith : form.sharedWith;
      form.amount = currentSum.toString();
    } else {
      const totalAmount = parseInt(form.amount || 0);
      if (totalAmount === 0) {
        showToast("Vui lòng nhập số tiền!", "error");
        return;
      }
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
    }
    onSave(form);
  };

  // Tính toán TỔNG BILL THỰC TẾ hiển thị bên ngoài
  const calculateTotalPreview = () => {
    let baseSum = 0;
    const ship = parseInt(form.shippingFee) || 0;
    const disc = parseInt(form.discount) || 0;
    const netDiscount = disc - ship;

    const allParticipants = [
      { id: "me", isMe: true },
      ...people.filter((p) => p.id !== user?.uid),
    ];
    allParticipants.forEach((p) => {
      const actualId = p.isMe ? "me" : p.id;
      const checkId = p.isMe ? user?.uid || "me" : p.id;
      if (
        form.sharedWith.includes(checkId) ||
        form.sharedWith.includes(actualId)
      ) {
        const val = form.customShares[actualId];
        const arr = Array.isArray(val) ? val : [val];
        baseSum += arr.reduce((acc, curr) => acc + parseInt(curr || 0), 0);
      }
    });
    return Math.max(0, baseSum - netDiscount);
  };

  // --- BIẾN GIAO DIỆN CHUNG: HÓA ĐƠN & BÌNH LUẬN ---
  const imageAndCommentUI = (
    <div className="grid grid-cols-1 gap-5 mt-2 md:mt-0">
      <div className="bg-white border border-gray-100 rounded-3xl p-4 shadow-sm">
        <div className="flex justify-between items-center mb-3">
          <span className="font-bold text-gray-500 text-base md:text-sm">
            Hóa đơn đính kèm
          </span>
          <label className="flex items-center gap-1.5 text-indigo-500 font-bold  cursor-pointer bg-indigo-50 px-3 py-1.5 rounded-xl hover:bg-rose-100 transition-colors">
            <Camera size={16} />
            {uploading ? "Đang tải..." : "Thêm ảnh"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
              disabled={uploading}
            />
          </label>
        </div>
        {form.billImage && (
          <div className="relative group mt-2">
            <img
              src={form.billImage}
              alt="Bill"
              className="w-full h-32 object-cover rounded-2xl border border-gray-200 shadow-sm"
            />
            <button
              onClick={() => setForm({ ...form, billImage: null })}
              className="absolute top-2 right-2 bg-black/50 text-white p-2 rounded-full hover:bg-red-500"
            >
              <X size={14} strokeWidth={3} />
            </button>
          </div>
        )}
      </div>

      <div className="bg-white border border-gray-100 rounded-3xl p-4 shadow-sm">
        <span className="font-bold text-gray-500 text-base md:text-sm flex items-center gap-2 mb-4">
          <MessageSquare size={16} /> Bình luận ({form.comments.length})
        </span>
        {form.comments.length > 0 && (
          <div className="max-h-32 overflow-y-auto space-y-3 custom-scrollbar mb-4">
            {form.comments.map((cmt, index) => (
              <div
                key={cmt.id || index}
                className="bg-gray-50 p-3 rounded-2xl text-base md:text-sm border border-gray-100"
              >
                <span className="font-bold text-gray-800">{cmt.userName}</span>
                <p className="text-gray-600 mt-1 break-words font-medium">
                  {cmt.text}
                </p>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Viết gì đó..."
            className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-base md:text-sm outline-none focus:ring-2 focus:ring-indigo-200"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
          />
          <button
            onClick={handleAddComment}
            className="px-4 bg-indigo-500 text-white rounded-2xl hover:bg-indigo-600 flex items-center"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[600] flex items-end md:items-center justify-center pointer-events-none">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-900/50  pointer-events-auto"
        onClick={onClose}
      />

      {/* KHUNG MODAL (ĐÃ NÂNG CHIỀU RỘNG VÀ KHÓA SCROLL CHUẨN) */}
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        // Thêm 2 class ở cuối:
        className="bg-gray-50 md:bg-gray-100 w-full md:max-w-4xl lg:max-w-5xl pointer-events-auto rounded-t-[2.5rem] md:rounded-[2rem] shadow-2xl flex flex-col h-[90dvh] md:h-[85dvh] relative overflow-hidden transform-gpu will-change-transform"
      >
        <div className="flex-1 w-full relative">
          {/* ======================================================= */}
          {/* MÀN HÌNH 1: NHẬP THÔNG TIN CHÍNH (FORM)                   */}
          {/* ======================================================= */}
          <div
            className={`absolute inset-0 w-full h-full flex flex-col transition-transform duration-300 ease-in-out ${
              currentView === "form" ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            {/* Header Form */}
            <div className="shrink-0 bg-white md:bg-white rounded-t-[2.5rem] md:rounded-t-[2rem] z-10 pb-2 shadow-sm relative">
              <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mt-3 md:hidden" />
              <div className="flex justify-between items-center px-6 py-3 md:py-4">
                <h2 className="text-lg md:text-xl font-black text-gray-800 tracking-tight select-none">
                  {editingExpense ? "Sửa giao dịch" : "Thêm khoản chi"}
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-rose-100 hover:text-indigo-500 transition-colors"
                >
                  <X size={20} strokeWidth={2.5} />
                </button>
              </div>
            </div>

            {/* Nội dung Form (Đã thêm overscroll-none để chống lỗi kéo vuốt vỡ giao diện) */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-none touch-pan-y px-4 md:px-8 pb-[350px] md:pb-[200px] pt-4 custom-scrollbar bg-gray-50 md:bg-transparent">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 items-start">
                {/* --- CỘT TRÁI: THÔNG TIN CƠ BẢN --- */}
                <div className="space-y-5">
                  {/* THANH CHỌN CHẾ ĐỘ: TÁCH CÁC NÚT VÀ CĂN CHỈNH SLIDER CHUẨN XÁC */}
                  <div className="flex gap-1.5 bg-slate-100 p-1.5 rounded-2xl relative border border-slate-200/60 shadow-inner mt-1">
                    {["split", "custom", "full"].map((tabMode) => (
                      <button
                        key={tabMode}
                        onClick={() => setForm({ ...form, type: tabMode })}
                        className={`flex-1 py-3 rounded-xl font-bold text-base md:text-sm z-10 transition-colors duration-300 ${
                          form.type === tabMode
                            ? "text-indigo-600"
                            : "text-slate-500 hover:text-slate-700"
                        }`}
                      >
                        {
                          {
                            split: "Chia đều",
                            custom: "Shopee/Chi tiết",
                            full: "Ứng/Vay",
                          }[tabMode]
                        }
                      </button>
                    ))}
                    {/* Cục Slider màu trắng nổi bật, có bóng đổ */}
                    <div
                      className="absolute top-1.5 bottom-1.5 w-[calc(33.33%-8px)] bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-slate-200 transition-all duration-300 ease-out"
                      style={{
                        left:
                          form.type === "split"
                            ? "6px"
                            : form.type === "custom"
                            ? "calc(33.33% + 4px)"
                            : "calc(66.66% + 2px)",
                      }}
                    />
                  </div>

                  {/* Nhập số tiền (KO autofocus) */}
                  <div className="text-center bg-gradient-to-br from-indigo-50 to-violet-50 p-6 rounded-[2rem] border border-indigo-100/50 shadow-sm relative overflow-hidden">
                    <div className="absolute top-[-20px] right-[-20px] w-24 h-24 bg-white/40 rounded-full blur-2xl"></div>
                    <label className="text-[11px] font-black text-indigo-400 uppercase tracking-widest mb-2 block relative z-10">
                      {form.type === "custom"
                        ? "TỔNG BILL (TỰ ĐỘNG TÍNH)"
                        : "Tổng số tiền"}
                    </label>
                    {(() => {
                      const totalVal =
                        form.type === "custom"
                          ? calculateTotalPreview().toString()
                          : form.amount;

                      const displayValue = totalVal
                        ? totalVal.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
                        : "";

                      const displayLen = displayValue.length;
                      // THÊM DẤU ! VÀO TRƯỚC MỖI CLASS ĐỂ ÉP CHẾT KÍCH THƯỚC TRÊN IOS
                      let textSize = "!text-5xl md:!text-6xl";
                      let symbolSize = "!text-2xl pb-2";

                      if (displayLen >= 15) {
                        // Tầm 100 tỷ trở lên
                        textSize = "!text-2xl md:!text-3xl";
                        symbolSize = "!text-lg pb-0.5";
                      } else if (displayLen >= 13) {
                        // Tầm 1 tỷ trở lên
                        textSize = "!text-3xl md:!text-4xl";
                        symbolSize = "!text-xl pb-1";
                      } else if (displayLen >= 11) {
                        // Tầm 100 triệu trở lên
                        textSize = "!text-4xl md:!text-5xl";
                        symbolSize = "!text-xl pb-1.5";
                      }

                      // Tính độ rộng động theo số lượng ký tự
                      const inputLen =
                        displayValue.length > 0 ? displayValue.length : 1;

                      return (
                        // Parent div: Thêm relative để làm gốc tọa độ
                        // 1. Thẻ cha: Đã xóa "transition-all duration-300" và "overflow-hidden"
                        <div className="relative flex items-center justify-center font-black text-indigo-600 z-10 w-full min-h-[60px] md:min-h-[80px]">
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            readOnly={form.type === "custom"}
                            // 2. Thẻ input: Đã xóa "transition-all duration-300"
                            className={`bg-transparent outline-none text-center placeholder-indigo-200 caret-indigo-600 p-0 m-0 max-w-full ${textSize}`}
                            style={{
                              width: `${inputLen * 1.1}ch`,
                              minWidth: "2ch",
                            }}
                            placeholder="0"
                            value={displayValue}
                            onFocus={(e) => {
                              setTimeout(() => {
                                e.target.scrollIntoView({
                                  behavior: "smooth",
                                  block: "center",
                                });
                              }, 300);
                            }}
                            onChange={(e) => {
                              if (form.type !== "custom") {
                                const val = e.target.value.replace(/\./g, "");
                                if (/^\d*$/.test(val))
                                  setForm({ ...form, amount: val });
                              }
                            }}
                          />
                          {/* 3. Chữ đ: Đã xóa "transition-all duration-300" */}
                          <span
                            className={`absolute right-4 text-indigo-400/60 shrink-0 ${symbolSize}`}
                          >
                            đ
                          </span>
                        </div>
                      );
                    })()}
                  </div>

                  <div className="space-y-3">
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-300">
                        <Edit2 size={18} />
                      </div>
                      <input
                        type="text"
                        placeholder="*Khoản chi này cho việc gì?"
                        className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl font-bold text-gray-700 outline-none focus:ring-2 ring-indigo-200 shadow-sm border border-gray-100"
                        value={form.description}
                        onChange={(e) =>
                          setForm({ ...form, description: e.target.value })
                        }
                      />
                    </div>

                    {/* KHUNG NHẬP NGÀY THÁNG ĐÃ ĐƯỢC FIX ÉP CHUẨN VIỆT NAM (dd/MM/yyyy) */}
                    <div className="relative w-full group">
                      {/* Lớp hiển thị giả: Luôn format chuẩn ngày/tháng/năm */}
                      <div className="w-full px-5 py-4 bg-white rounded-2xl font-bold text-gray-500 shadow-sm border border-gray-100 flex items-center group-hover:border-indigo-200 transition-colors">
                        <span>
                          {form.date
                            ? form.date.split("-").reverse().join("/")
                            : "Chọn ngày"}
                        </span>
                      </div>

                      {/* Lớp Input thật: Làm tàng hình tuyệt đối, chèn lấp lên trên để hứng sự kiện bấm */}
                      <input
                        type="date"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        value={form.date}
                        onChange={(e) =>
                          setForm({ ...form, date: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  {/* Nút Gọi Màn Hình Chọn Người Trả Tiền */}
                  {form.type !== "full" && (
                    <div
                      onClick={() => setCurrentView("payer_select")}
                      className="bg-white border border-gray-100 rounded-2xl p-4 flex justify-between items-center shadow-sm active:scale-[0.98] transition-all cursor-pointer group hover:border-indigo-200 hover:shadow-md"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center text-violet-600">
                          <Wallet size={20} />
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">
                            Người trả tiền
                          </p>
                          <p className="font-bold text-gray-800 text-base">
                            {getPayerName()}
                          </p>
                        </div>
                      </div>
                      <ChevronRight
                        size={20}
                        className="text-gray-300 group-hover:text-rose-400 transition-colors"
                      />
                    </div>
                  )}

                  {form.type === "custom" && imageAndCommentUI}
                </div>

                {/* --- CỘT PHẢI: CHIA TIỀN CHI TIẾT --- */}
                <div className="space-y-5">
                  {/* === KHỐI NÚT CHỌN NGƯỜI THAM GIA === */}
                  <div className="bg-white border border-gray-100 rounded-[2rem] p-4 shadow-sm">
                    {/* Header Khối */}
                    <div className="flex justify-between items-center mb-4 ml-2">
                      <label className="text-[11px] font-black text-rose-400 uppercase tracking-wider block">
                        {form.type === "custom"
                          ? "Chi tiết từng người"
                          : form.type === "full"
                          ? "Chọn người giao dịch"
                          : "Chia cùng ai?"}
                      </label>
                      <button
                        onClick={() => setCurrentView("participant_select")}
                        className="flex items-center gap-1 bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-xl  font-bold hover:bg-indigo-100 transition-colors"
                      >
                        <Users size={14} /> Thêm/Sửa
                      </button>
                    </div>

                    {/* VÙNG HIỂN THỊ CHIA TIỀN THEO CHẾ ĐỘ */}

                    {/* CHẾ ĐỘ 1: CHIA ĐỀU (CÓ THÊM SLOT/SUẤT CHO TỪNG NGƯỜI) */}
                    {form.type === "split" && (
                      // ĐÃ SỬA: Ép danh sách thành 1 cột dọc cho TẤT CẢ thiết bị (Mobile, iPad, PC)
                      <div className="flex flex-col gap-3 mt-2">
                        {[...new Set(form.sharedWith)].map((id, index) => {
                          const count = form.sharedWith.filter(
                            (x) => x === id,
                          ).length;
                          const actualId = id === "me" ? user?.uid : id;
                          const p =
                            actualId === user?.uid
                              ? {
                                  id: "me",
                                  name: "Tôi",
                                  photoURL: user?.photoURL,
                                }
                              : people.find((x) => x.id === id);
                          if (!p) return null;

                          return (
                            <div
                              key={`${p.id}-${index}`}
                              className="relative flex items-center justify-between bg-gray-50 border border-gray-200 p-2.5 md:p-3 rounded-xl transition-all hover:border-indigo-200 shadow-sm w-full group"
                            >
                              {/* NÚT XÓA */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setForm((prev) => ({
                                    ...prev,
                                    sharedWith: prev.sharedWith.filter(
                                      (x) => x !== id,
                                    ),
                                  }));
                                }}
                                className="absolute -top-[0.8rem] -right-[0.7rem] p-[0.1rem] bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors z-10 shadow-sm border-2 border-white"
                              >
                                <X
                                  size={10}
                                  strokeWidth={3}
                                  className="md:w-3.5 md:h-3.5"
                                />
                              </button>

                              {/* THÔNG TIN NGƯỜI DÙNG: Không gian giờ đã vô cùng rộng rãi */}
                              <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
                                <div className="shrink-0 flex items-center justify-center">
                                  {p.id === "me" ? (
                                    renderMyAvatar("sm")
                                  ) : (
                                    <Avatar
                                      name={p.name}
                                      src={p.photoURL}
                                      size="sm"
                                    />
                                  )}
                                </div>
                                {/* Tên sẽ hiển thị đầy đủ, không bị cắt sớm */}
                                <span className="text-base md:text-sm font-bold text-gray-700 truncate w-full">
                                  {p.name}
                                </span>
                              </div>

                              {/* BỘ NÚT TĂNG GIẢM SUẤT */}
                              <div className="flex items-center bg-white rounded-md shadow-sm border border-gray-200 overflow-hidden shrink-0">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (count > 1) {
                                      setForm((prev) => {
                                        const idx = prev.sharedWith.indexOf(id);
                                        const newArr = [...prev.sharedWith];
                                        newArr.splice(idx, 1);
                                        return { ...prev, sharedWith: newArr };
                                      });
                                    }
                                  }}
                                  disabled={count <= 1}
                                  className="w-6 h-6 md:w-7 md:h-7 flex items-center justify-center text-rose-500 disabled:text-gray-300 font-black text-base md:text-sm active:bg-gray-50 transition-colors"
                                >
                                  -
                                </button>
                                <span className=" md:text-base md:text-sm font-black text-indigo-600 w-5 md:w-6 text-center">
                                  {count}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setForm((prev) => ({
                                      ...prev,
                                      sharedWith: [...prev.sharedWith, id],
                                    }));
                                  }}
                                  className="w-6 h-6 md:w-7 md:h-7 flex items-center justify-center text-indigo-600 font-black text-base md:text-sm active:bg-gray-50 transition-colors"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          );
                        })}
                        {form.sharedWith.length === 0 && (
                          <p className="text-base md:text-sm md:text-base text-gray-400 italic px-2 mt-2">
                            Vui lòng chọn người tham gia...
                          </p>
                        )}
                      </div>
                    )}

                    {/* CHẾ ĐỘ 2: ỨNG/VAY */}
                    {form.type === "full" && (
                      <div className="space-y-4">
                        <div className="flex bg-gray-100 p-1.5 rounded-2xl relative">
                          <button
                            onClick={() =>
                              setForm({
                                ...form,
                                loanType: "lend",
                                payerId: "me",
                                sharedWith: [],
                              })
                            }
                            className={`flex-1 py-3 rounded-xl text-base md:text-sm font-bold transition-all z-10 ${
                              form.loanType === "lend"
                                ? "bg-white shadow-sm text-indigo-600"
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
                                payerId: "",
                                sharedWith: ["me"],
                              })
                            }
                            className={`flex-1 py-3 rounded-xl text-base md:text-sm font-bold transition-all z-10 ${
                              form.loanType === "borrow"
                                ? "bg-white shadow-sm text-violet-600"
                                : "text-gray-500"
                            }`}
                          >
                            Tôi đi vay
                          </button>
                        </div>
                        <div
                          className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex items-center justify-center gap-4 cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => setCurrentView("participant_select")}
                        >
                          {form.loanType === "lend" ? (
                            form.sharedWith.length > 0 &&
                            form.sharedWith[0] !== "me" ? (
                              <div className="flex items-center gap-3">
                                <Avatar
                                  name={
                                    people.find(
                                      (p) => p.id === form.sharedWith[0],
                                    )?.name
                                  }
                                  size="md"
                                />
                                <span className="font-bold text-gray-800 text-lg">
                                  {
                                    people.find(
                                      (p) => p.id === form.sharedWith[0],
                                    )?.name
                                  }
                                </span>
                              </div>
                            ) : (
                              <span className="font-bold text-gray-400">
                                👉 Nhấn để chọn người mượn
                              </span>
                            )
                          ) : form.payerId && form.payerId !== "me" ? (
                            <div className="flex items-center gap-3">
                              <Avatar
                                name={
                                  people.find((p) => p.id === form.payerId)
                                    ?.name
                                }
                                size="md"
                              />
                              <span className="font-bold text-gray-800 text-lg">
                                {
                                  people.find((p) => p.id === form.payerId)
                                    ?.name
                                }
                              </span>
                            </div>
                          ) : (
                            <span className="font-bold text-gray-400">
                              👉 Nhấn để chọn chủ nợ
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* CHẾ ĐỘ 3: CỤ THỂ */}
                    {form.type === "custom" &&
                      (() => {
                        // 1. TÍNH TOÁN TRỰC TIẾP ĐỂ HIỂN THỊ PREVIEW
                        const ship = parseInt(form.shippingFee) || 0;
                        const disc = parseInt(form.discount) || 0;
                        const netDiscount = disc - ship;

                        const getSum = (val) => {
                          const arr = Array.isArray(val) ? val : [val];
                          return arr.reduce(
                            (acc, curr) => acc + parseInt(curr || 0),
                            0,
                          );
                        };

                        const getValidCount = (val) => {
                          const arr = Array.isArray(val) ? val : [val];
                          return arr.filter((curr) => parseInt(curr || 0) > 0)
                            .length;
                        };

                        let totalSlots = 0;
                        const allParticipantIds = [
                          "me",
                          ...people
                            .filter((p) => p.id !== user?.uid)
                            .map((p) => p.id),
                        ];

                        allParticipantIds.forEach((pId) => {
                          if (
                            form.sharedWith.includes(
                              pId === "me" ? user?.uid : pId,
                            ) ||
                            (pId === "me" && form.sharedWith.includes("me"))
                          ) {
                            if (getSum(form.customShares[pId]) > 0) {
                              totalSlots += getValidCount(
                                form.customShares[pId],
                              );
                            }
                          }
                        });

                        const adjustmentPerSlot =
                          totalSlots > 0
                            ? Math.floor(netDiscount / totalSlots)
                            : 0;

                        // Hàm format tiền tệ (thêm dấu chấm)
                        const fmt = (num) =>
                          Math.round(num)
                            .toString()
                            .replace(/\B(?=(\d{3})+(?!\d))/g, ".");

                        return (
                          <div className="space-y-4">
                            <div className="flex flex-col gap-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100">
                              {/* Hàng ngang chứa ô nhập Ship và Giảm giá */}
                              <div className="flex gap-3">
                                <div className="flex-1">
                                  <label className=" font-black text-blue-400 uppercase tracking-widest mb-1 block">
                                    Tiền Ship (+)
                                  </label>
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    placeholder="0"
                                    className="w-full p-2.5 bg-white rounded-xl font-bold text-gray-700 outline-none focus:ring-2 ring-blue-200 text-right shadow-sm"
                                    value={
                                      form.shippingFee
                                        ? form.shippingFee.replace(
                                            /\B(?=(\d{3})+(?!\d))/g,
                                            ".",
                                          )
                                        : ""
                                    }
                                    onChange={(e) => {
                                      const val = e.target.value.replace(
                                        /\./g,
                                        "",
                                      );
                                      if (/^\d*$/.test(val))
                                        setForm({ ...form, shippingFee: val });
                                    }}
                                  />
                                </div>
                                <div className="flex-1">
                                  <label className=" font-black text-teal-500 uppercase tracking-widest mb-1 block">
                                    Giảm giá (-)
                                  </label>
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    placeholder="0"
                                    className="w-full p-2.5 bg-white rounded-xl font-bold text-teal-600 outline-none focus:ring-2 ring-teal-200 text-right shadow-sm"
                                    value={
                                      form.discount
                                        ? form.discount.replace(
                                            /\B(?=(\d{3})+(?!\d))/g,
                                            ".",
                                          )
                                        : ""
                                    }
                                    onChange={(e) => {
                                      const val = e.target.value.replace(
                                        /\./g,
                                        "",
                                      );
                                      if (/^\d*$/.test(val))
                                        setForm({ ...form, discount: val });
                                    }}
                                  />
                                </div>
                              </div>

                              {/* DÒNG HIỂN THỊ TÍNH TOÁN "MỖI CHÁU..." */}
                              {totalSlots > 0 && adjustmentPerSlot !== 0 && (
                                <div
                                  className={`text-center  font-black uppercase tracking-wide px-4 py-2 rounded-xl bg-white/60 border animate-fade-in ${
                                    adjustmentPerSlot > 0
                                      ? "text-teal-600 border-teal-100"
                                      : "text-rose-500 border-rose-100"
                                  }`}
                                >
                                  {adjustmentPerSlot > 0
                                    ? `Mỗi cháu giảm ${formatNumber(
                                        adjustmentPerSlot,
                                      )}đ 🔥`
                                    : `Mỗi cháu cõng ship ${formatNumber(
                                        Math.abs(adjustmentPerSlot),
                                      )}đ 🛵`}
                                </div>
                              )}
                            </div>

                            <div className="space-y-3">
                              {form.sharedWith.length === 0 && (
                                <p className="text-base md:text-sm text-gray-400 italic px-2 text-center py-4 bg-gray-50 rounded-xl">
                                  Chưa chọn người tham gia...
                                </p>
                              )}

                              {form.sharedWith.map((id, index) => {
                                const actualId = id === "me" ? user?.uid : id;
                                const p =
                                  actualId === user?.uid
                                    ? {
                                        id: "me",
                                        name: "Tôi",
                                        photoURL: user?.photoURL,
                                        isMe: true,
                                      }
                                    : people.find((x) => x.id === id);
                                if (!p) return null;

                                const amounts = Array.isArray(
                                  form.customShares[p.id],
                                )
                                  ? form.customShares[p.id]
                                  : form.customShares[p.id]
                                  ? [form.customShares[p.id]]
                                  : [""];

                                // 2. TÍNH TOÁN SỐ TIỀN THỰC TẾ CHO TỪNG NGƯỜI
                                const originalShare = getSum(
                                  form.customShares[p.id],
                                );
                                const pSlots = getValidCount(
                                  form.customShares[p.id],
                                );
                                const pAdjustment = adjustmentPerSlot * pSlots;
                                const finalShare = Math.max(
                                  0,
                                  originalShare - pAdjustment,
                                );

                                return (
                                  <div
                                    key={`${p.id}-${index}`}
                                    className="bg-gray-50 p-3 rounded-2xl border border-gray-100 shadow-sm transition-all hover:border-indigo-100"
                                  >
                                    <div className="flex items-center justify-between mb-3">
                                      <div className="flex items-center gap-3">
                                        {p.isMe ? (
                                          renderMyAvatar("md")
                                        ) : (
                                          <Avatar
                                            name={p.name}
                                            src={p.photoURL}
                                            size="md"
                                          />
                                        )}
                                        <span className="font-bold text-gray-700 truncate max-w-[100px] md:max-w-[150px] select-none">
                                          {p.name}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2 bg-white px-1.5 py-1 rounded-lg border border-gray-200 shadow-sm">
                                        <button
                                          onClick={() =>
                                            handleRemoveQuantity(p.id)
                                          }
                                          className="w-6 h-6 flex items-center justify-center text-rose-500 disabled:text-gray-300 font-bold text-lg active:scale-90"
                                        >
                                          -
                                        </button>
                                        <span className="text-[11px] font-black text-indigo-600 w-3 text-center">
                                          {amounts.length}
                                        </span>
                                        <button
                                          onClick={() =>
                                            handleAddQuantity(p.id)
                                          }
                                          className="w-6 h-6 flex items-center justify-center text-indigo-600 font-bold text-lg active:scale-90"
                                        >
                                          +
                                        </button>
                                      </div>
                                    </div>
                                    <div className="space-y-2">
                                      {amounts.map((amt, idx) => (
                                        <div
                                          key={idx}
                                          className="flex items-center gap-2 animate-fade-in md:pl-[52px]"
                                        >
                                          {amounts.length > 1 && (
                                            <span className=" font-bold text-gray-400 uppercase w-10 shrink-0">
                                              Món {idx + 1}
                                            </span>
                                          )}
                                          <div className="relative flex-1">
                                            <input
                                              type="text"
                                              inputMode="numeric"
                                              pattern="[0-9]*"
                                              placeholder="0"
                                              className="w-full text-right p-2.5 rounded-xl font-bold outline-none focus:ring-2 ring-indigo-200 bg-white text-gray-700 focus:text-indigo-600 shadow-sm pr-7"
                                              value={
                                                amt
                                                  ? String(amt).replace(
                                                      /\B(?=(\d{3})+(?!\d))/g,
                                                      ".",
                                                    )
                                                  : ""
                                              }
                                              onChange={(e) => {
                                                const val =
                                                  e.target.value.replace(
                                                    /\./g,
                                                    "",
                                                  );
                                                if (/^\d*$/.test(val))
                                                  handleSpecificChange(
                                                    p.id,
                                                    idx,
                                                    val,
                                                  );
                                              }}
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400  font-bold">
                                              đ
                                            </span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>

                                    {/* 3. BẢNG HIỂN THỊ CHI TIẾT SAU KHI TRỪ */}
                                    {originalShare > 0 && pAdjustment !== 0 && (
                                      <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between items-center bg-white p-3 rounded-xl shadow-sm md:ml-[52px] animate-fade-in">
                                        <div className="flex flex-col">
                                          <span className=" font-black text-gray-400 uppercase mb-0.5">
                                            Thực tế
                                          </span>
                                          <div className="flex items-center gap-2">
                                            <span className=" font-bold text-gray-400 line-through">
                                              {fmt(originalShare)}đ
                                            </span>
                                            <ArrowRightLeft
                                              size={10}
                                              className="text-gray-300"
                                            />
                                            <span
                                              className={`text-base md:text-sm font-black ${
                                                pAdjustment > 0
                                                  ? "text-teal-600"
                                                  : "text-rose-500"
                                              }`}
                                            >
                                              {fmt(finalShare)}đ
                                            </span>
                                          </div>
                                        </div>
                                        <div
                                          className={`px-2.5 py-1.5 rounded-lg  font-black ${
                                            pAdjustment > 0
                                              ? "bg-teal-50 text-teal-600 border border-teal-100"
                                              : "bg-rose-50 text-rose-500 border border-rose-100"
                                          }`}
                                        >
                                          {pAdjustment > 0
                                            ? "Giảm "
                                            : "Phí ship "}
                                          {fmt(Math.abs(pAdjustment))}đ
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                  </div>
                  {form.type !== "custom" && imageAndCommentUI}
                </div>
              </div>
            </div>
          </div>

          {/* ======================================================= */}
          {/* MÀN HÌNH 2: CHỌN NGƯỜI TRẢ TIỀN (Trượt từ phải qua)       */}
          {/* ======================================================= */}
          <div
            className={`absolute inset-0 w-full h-full bg-gray-50 flex flex-col transition-transform duration-300 ease-in-out ${
              currentView === "payer_select"
                ? "translate-x-0"
                : "translate-x-full"
            }`}
          >
            <div className="px-4 py-4 bg-white shadow-sm flex items-center shrink-0 relative z-10 rounded-t-[2.5rem] md:rounded-t-[2rem]">
              <button
                onClick={() => setCurrentView("form")}
                className="absolute left-4 p-2.5 text-gray-500 hover:bg-indigo-50 hover:text-indigo-500 rounded-full transition-colors"
              >
                <ChevronLeft size={24} />
              </button>
              <h2 className="font-black text-lg text-gray-800 w-full text-center mt-2 md:mt-0">
                Chọn người trả tiền
              </h2>
            </div>
            {/* Đã thêm overscroll-none */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-none touch-pan-y p-4 pt-6 custom-scrollbar space-y-3 pb-[160px]">
              <div
                onClick={() => {
                  setForm({ ...form, payerId: "me" });
                  setCurrentView("form");
                }}
                className={`flex items-center justify-between p-4 rounded-2xl cursor-pointer active:scale-95 transition-all border ${
                  form.payerId === "me"
                    ? "bg-indigo-50 border-indigo-200 shadow-sm"
                    : "bg-white border-gray-100 hover:shadow-md"
                }`}
              >
                <div className="flex items-center gap-4">
                  {renderMyAvatar("md")}
                  <span
                    className={`font-bold text-lg ${
                      form.payerId === "me"
                        ? "text-indigo-600"
                        : "text-gray-800"
                    }`}
                  >
                    Tôi (Mặc định)
                  </span>
                </div>
                {form.payerId === "me" ? (
                  <CheckCircle2 className="text-indigo-500" size={28} />
                ) : (
                  <Circle className="text-gray-300" size={28} />
                )}
              </div>
              {people
                .filter((p) => p.id !== user?.uid)
                .map((p) => {
                  const isSelected = form.payerId === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => {
                        setForm({ ...form, payerId: p.id });
                        setCurrentView("form");
                      }}
                      className={`flex items-center justify-between p-4 rounded-2xl cursor-pointer active:scale-95 transition-all border ${
                        isSelected
                          ? "bg-indigo-50 border-indigo-200 shadow-sm"
                          : "bg-white border-gray-100 hover:shadow-md"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        {p.photoURL ? (
                          <img
                            src={p.photoURL}
                            alt={p.name}
                            className="w-10 h-10 rounded-full object-cover shadow-sm border-2 border-white shrink-0"
                          />
                        ) : (
                          <Avatar name={p.name} src={p.photoURL} size="md" />
                        )}
                        <span
                          className={`font-bold text-lg ${
                            isSelected ? "text-indigo-600" : "text-gray-800"
                          }`}
                        >
                          {p.name}
                        </span>
                      </div>
                      {isSelected ? (
                        <CheckCircle2 className="text-indigo-500" size={28} />
                      ) : (
                        <Circle className="text-gray-300" size={28} />
                      )}
                    </div>
                  );
                })}
            </div>
          </div>

          {/* ======================================================= */}
          {/* MÀN HÌNH 3: CHỌN NGƯỜI THAM GIA (MỚI THÊM)                */}
          {/* ======================================================= */}
          <div
            className={`absolute inset-0 w-full h-full bg-gray-50 flex flex-col transition-transform duration-300 ease-in-out ${
              currentView === "participant_select"
                ? "translate-x-0"
                : "translate-x-full"
            }`}
          >
            <div className="px-4 py-4 bg-white shadow-sm flex items-center shrink-0 relative z-10 rounded-t-[2.5rem] md:rounded-t-[2rem]">
              <button
                onClick={() => setCurrentView("form")}
                className="absolute left-4 p-2.5 text-gray-500 hover:bg-indigo-50 hover:text-indigo-500 rounded-full transition-colors"
              >
                <ChevronLeft size={24} />
              </button>
              <h2 className="font-black text-lg text-gray-800 w-full text-center mt-2 md:mt-0">
                {form.type === "full"
                  ? "Chọn người giao dịch"
                  : "Ai tham gia khoản này?"}
              </h2>
            </div>
            {/* Đã thêm overscroll-none */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-none touch-pan-y p-4 pt-6 custom-scrollbar space-y-3 pb-[160px]">
              {/* NÚT CHỌN NHANH (Tất cả / Bỏ chọn) chỉ hiển thị cho chia đều / cụ thể */}
              {form.type !== "full" && (
                <div className="flex justify-between items-center mb-4 px-2">
                  <span className="text-base md:text-sm font-bold text-gray-500">
                    Đã chọn:{" "}
                    <span className="text-indigo-600">
                      {form.sharedWith.length}
                    </span>{" "}
                    người
                  </span>
                  <button
                    onClick={() => {
                      if (form.sharedWith.length === people.length)
                        setForm({
                          ...form,
                          sharedWith: ["me"],
                        });
                      // Bỏ chọn hết chừa lại Tôi
                      else
                        setForm({
                          ...form,
                          sharedWith: [
                            "me",
                            ...people
                              .filter((p) => p.id !== user?.uid)
                              .map((p) => p.id),
                          ],
                        }); // Chọn tất cả
                    }}
                    className="text-indigo-600 text-base md:text-sm font-bold bg-indigo-50 px-3 py-1.5 rounded-xl hover:bg-indigo-100"
                  >
                    {form.sharedWith.length === people.length
                      ? "Bỏ chọn"
                      : "Chọn tất cả"}
                  </button>
                </div>
              )}

              {/* Dòng TÔI */}
              {form.type !== "full" && (
                <div
                  onClick={() => togglePerson("me")}
                  className={`flex items-center justify-between p-4 rounded-2xl cursor-pointer active:scale-95 transition-all border ${
                    form.sharedWith.includes("me") ||
                    form.sharedWith.includes(user?.uid)
                      ? "bg-indigo-50 border-indigo-200 shadow-sm"
                      : "bg-white border-gray-100 hover:shadow-md"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {renderMyAvatar("md")}
                    <span
                      className={`font-bold text-lg ${
                        form.sharedWith.includes("me") ||
                        form.sharedWith.includes(user?.uid)
                          ? "text-indigo-600"
                          : "text-gray-800"
                      }`}
                    >
                      Tôi
                    </span>
                  </div>
                  {form.sharedWith.includes("me") ||
                  form.sharedWith.includes(user?.uid) ? (
                    <CheckCircle2 className="text-indigo-500" size={28} />
                  ) : (
                    <Circle className="text-gray-300" size={28} />
                  )}
                </div>
              )}

              {/* Dòng BẠN BÈ */}
              {people
                .filter((p) => p.id !== user?.uid)
                .map((p) => {
                  let isSelected = false;
                  if (form.type === "full")
                    isSelected =
                      form.loanType === "lend"
                        ? form.sharedWith.includes(p.id)
                        : form.payerId === p.id;
                  else isSelected = form.sharedWith.includes(p.id);

                  return (
                    <div
                      key={p.id}
                      onClick={() => {
                        if (form.type === "full") {
                          if (form.loanType === "lend")
                            setForm({
                              ...form,
                              payerId: "me",
                              sharedWith: [p.id],
                            });
                          else
                            setForm({
                              ...form,
                              payerId: p.id,
                              sharedWith: ["me"],
                            });
                          setCurrentView("form"); // Chạm xong quay về luôn nếu là 1-1
                        } else {
                          togglePerson(p.id);
                        }
                      }}
                      className={`flex items-center justify-between p-4 rounded-2xl cursor-pointer active:scale-95 transition-all border ${
                        isSelected
                          ? "bg-indigo-50 border-indigo-200 shadow-sm"
                          : "bg-white border-gray-100 hover:shadow-md"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        {p.photoURL ? (
                          <img
                            src={p.photoURL}
                            alt={p.name}
                            className="w-10 h-10 rounded-full object-cover shadow-sm border-2 border-white shrink-0"
                          />
                        ) : (
                          <Avatar name={p.name} src={p.photoURL} size="md" />
                        )}
                        <span
                          className={`font-bold text-lg ${
                            isSelected ? "text-indigo-600" : "text-gray-800"
                          }`}
                        >
                          {p.name}
                        </span>
                      </div>
                      {form.type === "full" ? (
                        isSelected ? (
                          <div
                            className={`w-6 h-6 rounded-full border-[6px] ${
                              form.loanType === "lend"
                                ? "border-rose-500"
                                : "border-fuchsia-500"
                            }`}
                          ></div>
                        ) : (
                          <div className="w-6 h-6 rounded-full border-2 border-gray-300"></div>
                        )
                      ) : isSelected ? (
                        <CheckCircle2 className="text-indigo-500" size={28} />
                      ) : (
                        <Circle className="text-gray-300" size={28} />
                      )}
                    </div>
                  );
                })}
            </div>

            {/* Nút Xong cho màn hình chọn người tham gia nhiều người */}
            {form.type !== "full" && (
              <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100/50 bg-white/80  pb-[calc(1rem+env(safe-area-inset-bottom))] z-50">
                <button
                  onClick={() => setCurrentView("form")}
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-lg shadow-indigo-200 active:scale-95 transition-all"
                >
                  Xong
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ======================================================= */}
        {/* FOOTER NÚT LƯU CỐ ĐỊNH (CHỈ HIỆN Ở MÀN HÌNH FORM CHÍNH)    */}
        {/* ======================================================= */}
        <div
          className={`absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100/50 bg-white/80  pb-[calc(1rem+env(safe-area-inset-bottom))] z-50 transition-transform duration-300 ${
            currentView === "form" ? "translate-y-0" : "translate-y-full"
          }`}
        >
          <button
            onClick={handleSave}
            className="w-full py-4 bg-gradient-to-r from-indigo-500 to-violet-500 text-white rounded-2xl font-black text-lg shadow-lg shadow-indigo-200 hover:shadow-[0_12px_30px_rgba(99,102,241,0.5)] active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Check size={24} strokeWidth={3} />
            <span>Lưu Giao Dịch</span>
          </button>
        </div>
      </motion.div>
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
    <div className="fixed inset-0 z-[300] bg-black/40  flex items-center justify-center p-4 animate-fade-in">
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-600 transition-colors flex items-center justify-center p-1"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          )}

          {error && (
            <div className="bg-red-50 text-red-500 text-base md:text-sm p-3 rounded-lg flex items-center gap-2">
              <AlertTriangle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-indigo-500 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-indigo-200/50 flex items-center justify-center gap-2 transition-all"
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

        <div className="mt-6 text-center text-base md:text-sm text-gray-500 space-y-2">
          {/* Nút chuyển qua lại Quên mật khẩu */}
          {!isRegistering && !isForgotPassword && (
            <button
              onClick={() => {
                setIsForgotPassword(true);
                setError("");
              }}
              className="text-gray-500 hover:text-indigo-600 underline block w-full mb-2"
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
              className="text-indigo-600 font-bold hover:underline"
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
      className="fixed inset-0 z-[300] bg-black/40  flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="bg-gradient-to-br from-indigo-600 to-violet-500 p-6 text-white text-center relative">
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
                <div className="w-full h-full rounded-full bg-violet-100 flex items-center justify-center text-indigo-600 font-bold text-3xl">
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
          <p className="text-blue-100 text-base md:text-sm opacity-80">
            {user.email}
          </p>
        </div>

        {/* BODY */}
        <div className="p-6 space-y-3">
          {isChangePassMode ? (
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 animate-fade-in">
              <p className="text-base md:text-sm font-bold text-gray-800 mb-3 text-center border-b pb-2">
                Đổi Mật Khẩu
              </p>

              {/* Ô nhập mật khẩu CŨ */}
              <div className="mb-3">
                <p className=" font-bold text-gray-500 uppercase mb-1">
                  Mật khẩu hiện tại
                </p>
                <div className="relative">
                  <input
                    type={showCurrentPass ? "text" : "password"}
                    placeholder="********"
                    className="w-full p-2.5 pr-10 rounded-lg border border-gray-200 text-base md:text-sm focus:border-blue-500 outline-none bg-white"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    autoFocus
                  />
                  {/* [FIX] Căn giữa icon */}
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-600 p-1"
                  >
                    {showCurrentPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Ô nhập mật khẩu MỚI */}
              <div className="mb-4">
                <p className=" font-bold text-gray-500 uppercase mb-1">
                  Mật khẩu mới
                </p>
                <div className="relative">
                  <input
                    type={showNewPass ? "text" : "password"}
                    placeholder="Nhập mật khẩu mới..."
                    className="w-full p-2.5 pr-10 rounded-lg border border-gray-200 text-base md:text-sm focus:border-blue-500 outline-none bg-white"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  {/* [FIX] Căn giữa icon */}
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-600 p-1"
                  >
                    {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setIsChangePassMode(false)}
                  className="flex-1 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg text-base md:text-sm font-bold hover:bg-gray-50"
                  disabled={passLoading}
                >
                  Hủy
                </button>
                <button
                  onClick={handleChangePassword}
                  disabled={passLoading}
                  className="flex-1 py-2 bg-indigo-500 text-white rounded-lg text-base md:text-sm font-bold hover:bg-blue-700 flex justify-center items-center shadow-lg shadow-indigo-200/50"
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
              className="w-full py-3 rounded-xl bg-violet-50/50 text-indigo-600 font-bold border border-blue-100 hover:bg-violet-100 transition-all flex items-center justify-center gap-2"
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
    <div className="fixed inset-0 z-[300] bg-black/40  flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-slide-up">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Sửa thông tin</h3>

        <div className="space-y-4">
          <div>
            <label className=" font-bold text-gray-500 uppercase block mb-1">
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
            <label className=" font-bold text-gray-500 uppercase block mb-1">
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
            className="flex-1 py-3 bg-indigo-500 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-indigo-200/50 transition-colors"
          >
            Lưu
          </button>
        </div>
      </div>
    </div>
  );
};

// --- BỌC React.memo Ở NGAY ĐÂY ĐỂ CHỐNG LAG ---
const HistoryItem = React.memo(
  ({
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
    selectedPersonId,
  }) => {
    const [isSwiped, setIsSwiped] = React.useState(false);
    const itemRef = React.useRef(null); // 1. THÊM REF ĐỂ QUẢN LÝ VÙNG CHẠM

    // --- 2. HIỆU ỨNG TỰ ĐỘNG THU LẠI KHI CUỘN HOẶC CHẠM RA NGOÀI ---
    React.useEffect(() => {
      if (!isSwiped) return;

      const handleTouchOrClick = (e) => {
        // Nếu chạm vào chính Card này hoặc nút Xóa thì không làm gì cả
        if (itemRef.current && itemRef.current.contains(e.target)) return;
        setIsSwiped(false); // Nếu chạm ra ngoài -> Đóng
      };

      const handleScroll = () => {
        setIsSwiped(false); // Đang mở mà cuộn trang -> Đóng
      };

      // Lắng nghe sự kiện toàn cục (passive: true để không làm chậm scroll)
      document.addEventListener("touchstart", handleTouchOrClick, {
        passive: true,
      });
      document.addEventListener("mousedown", handleTouchOrClick);
      // true (capture phase) giúp bắt được thao tác cuộn ở mọi phần tử chứa nội dung
      window.addEventListener("scroll", handleScroll, true);

      return () => {
        document.removeEventListener("touchstart", handleTouchOrClick);
        document.removeEventListener("mousedown", handleTouchOrClick);
        window.removeEventListener("scroll", handleScroll, true);
      };
    }, [isSwiped]);

    // --- TÍNH TOÁN TIỀN NỢ CỦA RIÊNG NGƯỜI ĐƯỢC CHỌN ---
    let specificDebt = 0;
    if (selectedPersonId) {
      if (exp.type === "split") {
        const slots = (exp.sharedWith || []).filter(
          (id) => id === selectedPersonId,
        ).length;
        if (slots > 0)
          specificDebt = (exp.amount / exp.sharedWith.length) * slots;
      } else if (exp.type === "custom") {
        const val = exp.customShares?.[selectedPersonId];
        const arr = Array.isArray(val) ? val : val ? [val] : [];
        specificDebt = arr.reduce((sum, curr) => sum + parseInt(curr || 0), 0);
      } else if (exp.type === "full") {
        if ((exp.sharedWith || []).includes(selectedPersonId))
          specificDebt = exp.amount;
      }
    }

    const currentContextPeople = exp._groupMembers || people;
    const actualPayerId = exp.payerId || "me";
    const payerName =
      actualPayerId === "me" || actualPayerId === user?.uid
        ? "Tôi"
        : currentContextPeople.find((p) => p.id === actualPayerId)?.name ||
          "Ai đó";

    const uniqueSharedWith = [...new Set(exp.sharedWith || [])];

    return (
      <motion.div
        ref={itemRef} // GẮN REF VÀO THẺ CHA
        initial={{ opacity: 0, y: 15, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 24 }}
        // 3. TỐI ƯU CSS: Bật tăng tốc GPU (transform-gpu)
        className="relative mb-3 md:mb-4 isolate transform-gpu will-change-transform"
      >
        {/* NÚT XÓA */}
        {isMobile && (
          <div
            className="absolute top-[1px] bottom-[1px] right-[1px] w-[90px] bg-red-500 rounded-r-[calc(1.5rem-1px)] flex justify-end items-center pr-6 text-white active:bg-red-600 transition-colors cursor-pointer z-0"
            onClick={(e) => {
              e.stopPropagation();
              setItemToDelete({ id: exp.id, groupId: exp.groupId });
              setIsSwiped(false);
            }}
          >
            <div className="flex flex-col items-center gap-1">
              <Trash2 size={20} />
              <span className=" font-bold">Xóa</span>
            </div>
          </div>
        )}

        {/* CARD NỘI DUNG CHÍNH (THẺ ĐƯỢC VUỐT) */}
        <motion.div
          drag={isMobile ? "x" : false}
          dragDirectionLock={true}
          style={{ touchAction: "pan-y" }}
          dragConstraints={{ left: -80, right: 0 }}
          dragElastic={0.05} // Giảm độ thun để khi kéo mượt hơn, không bị lố
          onDragEnd={(e, info) => {
            // Cân chỉnh lại lực kéo (offset và velocity) để dễ nhận diện vuốt hơn
            if (info.offset.x < -40 || info.velocity.x < -300) {
              setIsSwiped(true);
            } else {
              setIsSwiped(false);
            }
          }}
          animate={{ x: isSwiped ? -80 : 0 }}
          // 4. TỐI ƯU HIỆU ỨNG VẬT LÝ: Giảm mass và damping để nhẹ máy
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 26,
            mass: 0.8,
          }}
          onClick={() => {
            if (isSwiped) {
              setIsSwiped(false); // Nếu đang mở mà bấm vào Card -> Đóng
            } else {
              openEditModal(exp); // Nếu đang đóng -> Mở chi tiết
            }
          }}
          // 3. TỐI ƯU CSS: Bật tăng tốc GPU
          className={`group bg-white rounded-2xl md:rounded-[1.5rem] border border-gray-100 shadow-sm relative flex items-center p-3 md:p-4 z-10 w-full transform-gpu will-change-transform ${
            !isMobile && "hover:shadow-md hover:bg-indigo-50/30 cursor-pointer"
          }`}
        >
          {/* ICON TO BO TRÒN */}
          <div
            className={`w-11 h-11 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center text-xl md:text-2xl shrink-0 shadow-inner mr-3 md:mr-4 ${
              exp.type === "split"
                ? "bg-indigo-100/50 text-indigo-600"
                : "bg-emerald-100/50 text-emerald-600"
            }`}
          >
            {exp.type === "split" ? "🛍️" : "💸"}
          </div>

          <div className="flex-1 min-w-0 flex flex-col">
            {/* KHU VỰC 1: TÊN VÀ NGÀY CĂN TRÁI - TIỀN GÓC PHẢI */}
            <div className="relative w-full flex justify-start items-start mb-3 md:mb-4 pt-0.5">
              {/* CỤM BÊN TRÁI (Giới hạn max-width để không đè vào Số tiền) */}
              <div className="flex flex-col items-start justify-start max-w-[70%] md:max-w-[75%] pr-2">
                {/* 1. Tên giao dịch (Giảm size và độ đậm cho tinh tế hơn) */}
                <span className="font-bold text-gray-800 text-base md:text-lg text-left line-clamp-2 select-none leading-tight mb-1">
                  {exp.description}
                </span>

                {/* Badge tên nhóm (Chỉ hiện trên PC) */}
                {exp.groupName && !isMobile && (
                  <span className="bg-gray-50 text-gray-400 px-2 py-0.5 rounded-full border border-gray-100 font-bold select-none text-[10px] md:text-xs mb-1.5">
                    {exp.groupName}
                  </span>
                )}

                {/* 2. Ngày tháng (Đã tăng size) */}
                <div className="text-sm md:text-base font-medium text-gray-500 select-none text-left">
                  <span className="font-semibold text-gray-700">
                    {payerName}
                  </span>{" "}
                  trả • {format(new Date(exp.date), "dd/MM/yyyy")}
                </div>
              </div>

              {/* SỐ TIỀN BÊN GÓC PHẢI (Neo absolute) */}
              <div className="absolute right-0 top-0 flex flex-col items-end shrink-0 z-10">
                {(() => {
                  // Logic kiểm tra vị thế của TÔI trong giao dịch này
                  const isMePayer =
                    exp.payerId === user?.uid || exp.payerId === "me";
                  const amIInvolved =
                    (exp.sharedWith || []).includes(user?.uid) ||
                    (exp.sharedWith || []).includes("me");

                  const isOweMe = isMePayer; // Nợ tôi
                  const iOwe = !isMePayer && amIInvolved; // Tôi nợ

                  return (
                    <>
                      {/* SỐ TIỀN TỔNG CỦA GIAO DỊCH */}
                      <span
                        className={`font-black text-base md:text-lg select-none ${
                          isOweMe
                            ? "text-emerald-600" // Nợ tôi (Xanh lá)
                            : iOwe
                            ? "text-rose-500" // Tôi nợ (Đỏ hồng)
                            : "text-gray-400" // Không liên quan (Xám)
                        }`}
                      >
                        {formatCompactCurrency(exp.amount)}
                      </span>

                      {/* BADGE TIỀN NỢ RIÊNG (Nếu đang xem chi tiết 1 người) */}
                      {selectedPersonId && specificDebt > 0 && (
                        <span
                          className={`text-[10px] md:text-xs font-bold px-1.5 py-0.5 rounded-md border mt-1 shadow-sm select-none ${
                            isOweMe
                              ? "text-emerald-600 bg-emerald-50 border-emerald-100"
                              : "text-rose-500 bg-rose-50 border-rose-100"
                          }`}
                        >
                          {isOweMe ? "Nợ tôi:" : "Tôi nợ:"}{" "}
                          {new Intl.NumberFormat("vi-VN").format(
                            Math.round(specificDebt),
                          )}
                          đ
                        </span>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>

            {/* KHU VỰC 2: AVATAR VÀ COMMENT GIỮ NGUYÊN (Có thêm vạch kẻ mờ border-t cho đẹp) */}
            <div className="flex flex-col gap-2 md:gap-3 border-t border-gray-50/80 pt-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 md:gap-2">
                  <div className="flex -space-x-2">
                    {uniqueSharedWith.slice(0, 4).map((id, idx) => {
                      const p = currentContextPeople?.find(
                        (person) => person.id === id,
                      );
                      if (!p) return null;
                      return (
                        <Avatar
                          key={`${id}-${idx}`}
                          name={p.name}
                          src={p.photoURL}
                          size={isMobile ? "xs" : "sm"}
                          className={`border-2 border-white shadow-sm ${
                            isMobile ? "w-5 h-5 text-[8px]" : ""
                          }`}
                        />
                      );
                    })}
                    {uniqueSharedWith.length > 4 && (
                      <div
                        className={`rounded-full bg-gray-100 border-2 border-white flex items-center justify-center font-bold text-gray-500 z-10 shadow-sm select-none ${
                          isMobile ? "w-5 h-5 text-[8px]" : "w-6 h-6 text-[9px]"
                        }`}
                      >
                        +{uniqueSharedWith.length - 4}
                      </div>
                    )}
                  </div>
                </div>

                {/* NÚT HÓA ĐƠN & BÌNH LUẬN */}
                <div className="flex gap-1.5 md:gap-2">
                  {exp.billImage && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewingImage(exp.billImage);
                      }}
                      className="flex items-center gap-1 bg-violet-50 text-pink-500 px-2 py-0.5 md:px-2.5 md:py-1 rounded-full text-[9px] md:text-xs font-bold shadow-sm cursor-pointer"
                    >
                      <ImageIcon size={10} className="md:w-3 md:h-3" />
                      {!isMobile && (
                        <span className="select-none">Hóa đơn</span>
                      )}
                    </div>
                  )}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setCommentModalData(exp);
                    }}
                    className="flex items-center gap-1 bg-gray-50 text-gray-500 px-2 py-0.5 md:px-2.5 md:py-1 rounded-full text-[9px] md:text-xs font-bold shadow-sm relative cursor-pointer"
                  >
                    <MessageSquare size={10} className="md:w-3 md:h-3" />
                    <span className="select-none">
                      {exp.comments?.length || 0}
                    </span>
                    {exp.comments?.length > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 md:w-2.5 md:h-2.5 bg-indigo-500 rounded-full border border-white"></span>
                    )}
                  </div>
                </div>
              </div>
              {/* CHECKBOX XÁC NHẬN ĐÃ TRẢ TIỀN */}
              <div className="flex flex-wrap gap-1.5 md:gap-2 pt-1.5 md:pt-2 border-t border-gray-50">
                {uniqueSharedWith.map((id, idx) => {
                  // 1. Xác định vị thế
                  const isMe = id === user?.uid || id === "me";
                  const isMePayer =
                    exp.payerId === user?.uid || exp.payerId === "me";

                  // [SỬA LỖI LOGIC TẠI ĐÂY]: Nếu TÔI là người thanh toán bill này, tôi không nợ chính mình -> Ẩn luôn nút xác nhận của TÔI
                  if (isMePayer && isMe) return null;

                  // 2. Tìm thông tin người dùng
                  const p =
                    currentContextPeople?.find((person) => person.id === id) ||
                    contacts?.find((c) => c.id === id) ||
                    globalFriendStats?.find((f) => f.id === id);

                  if (!p && !isMe) return null;

                  const isSettled = exp.settledBy?.includes(id);

                  // 3. Tối ưu UI khi xem chi tiết 1 người
                  if (selectedPersonId && id !== selectedPersonId && !isMe)
                    return null;

                  return (
                    <button
                      key={`${id}-${idx}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSettled(exp.id, id, exp.groupId);
                      }}
                      className={`text-[11px] md:text-sm px-2.5 py-1 md:px-3 md:py-1.5 rounded-full border flex items-center gap-1.5 transition-all font-bold ${
                        isSettled
                          ? "bg-teal-50 border-teal-200 text-teal-600 shadow-sm"
                          : isMe
                          ? "bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-indigo-100 shadow-sm"
                          : "bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100"
                      }`}
                    >
                      {isSettled ? (
                        <CheckCircle2
                          size={12}
                          strokeWidth={3}
                          className="md:w-4 md:h-4"
                        />
                      ) : (
                        <Circle size={12} className="md:w-4 md:h-4" />
                      )}

                      <span className="truncate max-w-[80px] md:max-w-none select-none">
                        {isMe ? "Tôi đã trả" : p?.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* NÚT THAO TÁC TRÊN DESKTOP */}
          {!isMobile && groupId && (
            <div
              className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openEditModal(exp);
                }}
                className="text-gray-400 hover:text-blue-500 bg-white p-2 rounded-xl shadow-sm border border-gray-100 hover:bg-blue-50 transition-colors"
              >
                <Edit2 size={16} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setItemToDelete({ id: exp.id, groupId: exp.groupId });
                }}
                className="text-gray-400 hover:text-red-500 bg-white p-2 rounded-xl shadow-sm border border-gray-100 hover:bg-red-50 transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.selectedPersonId === nextProps.selectedPersonId &&
      JSON.stringify(prevProps.exp) === JSON.stringify(nextProps.exp)
    );
  },
);

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
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState("");
  const [commentModalData, setCommentModalData] = useState(null);
  // Thêm vào trong App
  const [tempMembers, setTempMembers] = useState([]); // Danh sách người chờ thêm khi tạo nhóm
  const [tempName, setTempName] = useState("");
  const [tempEmail, setTempEmail] = useState("");

  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);

  useEffect(() => {
    // Lưu lại chiều rộng ban đầu
    let lastWidth = window.innerWidth;

    const handleResize = () => {
      // CHỈ PHÁT HIỆN LÀ MOBILE NẾU CHIỀU RỘNG THAY ĐỔI ĐÁNG KỂ (TRÊN 50px)
      // Việc này giúp bỏ qua những sai số nhỏ do bàn phím ảo của iPad gây ra
      if (Math.abs(window.innerWidth - lastWidth) > 50) {
        setIsMobileView(window.innerWidth < 768);
        lastWidth = window.innerWidth;
      }
    };

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

  // --- STATE QUẢN LÝ SỐ LƯỢNG GIAO DỊCH HIỂN THỊ ---
  const [visibleHistoryCount, setVisibleHistoryCount] = useState(15);

  // Reset lại hiển thị 15 mục mỗi khi đổi nhóm khác
  useEffect(() => {
    setVisibleHistoryCount(15);
  }, [groupId]);

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

  // --- HÀM LƯU TÊN MỚI (ĐÃ FIX: ĐỒNG BỘ TÊN VÀO CẢ USERS) ---
  const submitRenameGroup = async () => {
    if (!groupToRename || !newNameInput.trim()) return;
    try {
      const newName = newNameInput.trim();
      const groupRef = doc(db, "groups", groupToRename.id);

      // 1. Lấy danh sách thành viên hiện tại trước khi cập nhật
      const groupSnap = await getDoc(groupRef);
      let members = [];
      if (groupSnap.exists()) {
        members = groupSnap.data().members || [];
      }

      // 2. Cập nhật tên và icon trong collection 'groups'
      await updateDoc(groupRef, {
        name: newName,
        icon: selectedIcon,
      });

      // 3. ĐỒNG BỘ TÊN MỚI CHO TẤT CẢ THÀNH VIÊN TRONG NHÓM
      // Phải làm bước này thì Sidebar của mọi người (và của chính bạn) mới tự động đổi tên
      for (const m of members) {
        const userRef = doc(db, "users", m.id);
        const uSnap = await getDoc(userRef);

        if (uSnap.exists()) {
          const uData = uSnap.data();
          const joinedGroups = uData.joinedGroups || [];

          // Tìm và sửa tên nhóm trong danh sách của user này
          const updatedGroups = joinedGroups.map((g) =>
            g.id === groupToRename.id
              ? { ...g, name: newName, icon: selectedIcon }
              : g,
          );

          await updateDoc(userRef, { joinedGroups: updatedGroups });
        }
      }

      showToast("Đã cập nhật thông tin nhóm", "success");
      setIsRenameModalOpen(false);
    } catch (e) {
      console.error(e);
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
          setConfirmDialog((prev) => ({ ...prev, isOpen: false })); // <--- THÊM DÒNG NÀY
        } catch (e) {
          console.error(e);
          showToast("Lỗi khi rời nhóm", "error");
          setConfirmDialog((prev) => ({ ...prev, isOpen: false })); // <--- THÊM DÒNG NÀY
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
  // --- STATES CHO TÌM KIẾM & HỢP NHẤT TÀI KHOẢN ---
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [mergingContact, setMergingContact] = useState(null); // Lưu người ảo đang cần liên kết
  const [newLocalContactName, setNewLocalContactName] = useState(""); // <--- CODE THÊM MỚI
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
  // --- EFFECT MỚI: XỬ LÝ VUỐT MÉP MÀN HÌNH ĐỂ BACK/FORWARD (ĐÃ TỐI ƯU HIỆU SUẤT) ---
  // 1. Tạo "Camera giám sát" trạng thái để không làm re-render sự kiện vuốt
  const uiStateRef = useRef({
    viewingImage,
    commentModalData,
    isModalOpen,
    isHistoryModalOpen,
    isCreateGroupModalOpen,
    isJoinModalOpen,
    isProfileOpen,
    sharingGroup,
    selectedPersonId,
    groupId,
    activeTab,
  });

  // 2. Cập nhật "Camera" mỗi khi có thay đổi
  useEffect(() => {
    uiStateRef.current = {
      viewingImage,
      commentModalData,
      isModalOpen,
      isHistoryModalOpen,
      isCreateGroupModalOpen,
      isJoinModalOpen,
      isProfileOpen,
      sharingGroup,
      selectedPersonId,
      groupId,
      activeTab,
    };
  }, [
    viewingImage,
    commentModalData,
    isModalOpen,
    isHistoryModalOpen,
    isCreateGroupModalOpen,
    isJoinModalOpen,
    isProfileOpen,
    sharingGroup,
    selectedPersonId,
    groupId,
    activeTab,
  ]);

  // 3. Gắn sự kiện vuốt đúng 1 LẦN DUY NHẤT
  useEffect(() => {
    let touchStartX = 0;
    let touchEndX = 0;
    let touchStartY = 0;
    let touchEndY = 0;
    const minSwipeDistance = 60;

    const onTouchStart = (e) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    };

    const onTouchEnd = (e) => {
      touchEndX = e.changedTouches[0].clientX;
      touchEndY = e.changedTouches[0].clientY;
      const deltaX = touchEndX - touchStartX;
      const deltaY = touchEndY - touchStartY;
      const state = uiStateRef.current; // Lấy trạng thái hiện tại từ Ref

      if (
        Math.abs(deltaX) > Math.abs(deltaY) &&
        Math.abs(deltaX) > minSwipeDistance
      ) {
        if (deltaX > 0 && touchStartX <= 40) {
          if (state.viewingImage) return setViewingImage(null);
          if (state.commentModalData) return setCommentModalData(null);
          if (state.isModalOpen) {
            setIsModalOpen(false);
            return setEditingExpense(null);
          }
          if (state.isHistoryModalOpen) return setIsHistoryModalOpen(false);
          if (state.isCreateGroupModalOpen)
            return setIsCreateGroupModalOpen(false);
          if (state.isJoinModalOpen) return setIsJoinModalOpen(false);
          if (state.isProfileOpen) return setIsProfileOpen(false);
          if (state.sharingGroup) return setSharingGroup(null);
          if (state.selectedPersonId) return setSelectedPersonId(null);
          if (state.groupId && state.activeTab === "people")
            return setActiveTab("dashboard");
          if (state.groupId && state.activeTab === "dashboard") {
            setGroupId("");
            return setIsGroupMode(false);
          }
          if (!state.groupId && state.activeTab === "people")
            return setActiveTab("dashboard");
        }
      }
    };

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, []); // <--- MẢNG RỖNG NÀY SẼ GIẢI CỨU IPHONE KHỎI GIẬT LAG

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
                    id: memId, // <--- THÊM ĐÚNG 1 DÒNG NÀY VÀO ĐÂY
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
    // Lưu lại thời điểm bắt đầu mở app
    const startTime = Date.now();

    const safetyTimer = setTimeout(() => {
      setAuthLoading((prev) => {
        if (prev) return false;
        return prev;
      });
    }, 6000); // Tăng safety timer lên chút phòng khi mạng chậm

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      clearTimeout(safetyTimer);

      if (currentUser) {
        // ... (Giữ nguyên phần lưu thông tin user lên Firestore của bạn)
        try {
          await setDoc(
            doc(db, "users", currentUser.uid),
            {
              email: currentUser.email,
              displayName: currentUser.displayName || "",
              photoURL: currentUser.photoURL || "",
            },
            { merge: true },
          );
        } catch (error) {
          console.error("Lỗi lưu thông tin user lên DB: ", error);
        }

        fetchDataFromServer(currentUser.uid);

        if (Capacitor.isNativePlatform()) {
          PushNotifications.requestPermissions().then((result) => {
            if (result.receive === "granted") {
              PushNotifications.register();
            }
          });
        }
      }

      // --- ĐÃ SỬA: BỎ TOÀN BỘ SETTIMEOUT VÀ DELAY ---
      // Gọi ngay lập tức để ứng dụng vào thẳng giao diện chính
      setUser(currentUser);
      setAuthLoading(false);
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

  // --- HÀM XÓA NHÓM (FIX TRIỆT ĐỂ LỖI KẸT TÊN NHÓM "MA") ---
  const handleDeleteGroup = async (groupIdToDelete) => {
    if (!user) {
      showToast("Vui lòng đăng nhập!", "error");
      return;
    }

    try {
      showToast("Đang kiểm tra quyền...", "info");

      const groupRef = doc(db, "groups", groupIdToDelete);
      const groupSnap = await getDoc(groupRef);

      if (!groupSnap.exists()) {
        // Nhóm đã mất thật rồi, dọn dẹp nốt cái vỏ trên UI cho sạch
        showToast("Nhóm này không tồn tại hoặc đã bị xóa từ trước!", "error");
        setMyGroups((prev) => prev.filter((g) => g.id !== groupIdToDelete));
        return;
      }

      const groupData = groupSnap.data();
      const ownerId = groupData.createdBy || groupData.ownerId;

      if (ownerId !== user.uid) {
        showToast("Chỉ trưởng nhóm mới có quyền xóa!", "error");
        return;
      }

      setConfirmDialog({
        isOpen: true,
        title: "Xóa vĩnh viễn nhóm?",
        message: `Hành động này sẽ xóa vĩnh viễn nhóm "${groupData.name}". Toàn bộ lịch sử giao dịch không thể khôi phục.`,
        onConfirm: async () => {
          try {
            showToast("Đang xóa dữ liệu...", "info");

            // A. Xóa tận gốc document nhóm trong collection 'groups'
            await deleteDoc(groupRef);

            // B. [ĐÃ FIX CHUẨN] - Tự lọc mảng và ghi đè để dọn sạch "Vỏ" trong Profile User
            const newJoinedGroups = myGroups.filter(
              (g) => g.id !== groupIdToDelete,
            );
            const userRef = doc(db, "users", user.uid);
            await updateDoc(userRef, {
              joinedGroups: newJoinedGroups,
            });

            // C. Cập nhật UI ngay lập tức
            setMyGroups(newJoinedGroups);

            // D. Đá ra ngoài Dashboard nếu đang đứng xem nhóm bị xóa
            if (groupId === groupIdToDelete) {
              setGroupId("");
              setIsGroupMode(false);
              setGroupOwnerId(null);
              setActiveTab("dashboard");
            }

            showToast("Đã xóa nhóm thành công!", "success");
          } catch (e) {
            console.error("Lỗi xóa nhóm:", e);
            showToast("Lỗi khi xóa nhóm: " + e.message, "error");
          } finally {
            setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
          }
        },
      });
    } catch (e) {
      console.error("Lỗi kiểm tra quyền:", e);
      showToast("Lỗi khi kiểm tra: " + e.message, "error");
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
        // TÔI trả tiền -> Tính số suất của PersonId và nhân lên
        const personSlots = exp.sharedWith.filter(
          (id) => id === personId,
        ).length;
        if (personSlots > 0 && !settledBy.includes(personId)) {
          balance += getShareOf(personId) * personSlots;
        }
      } else if (payerId === personId) {
        // PERSON_ID trả tiền -> Tính số suất của TÔI và nhân lên
        const mySlots = exp.sharedWith.filter((id) => id === user.uid).length;
        if (mySlots > 0 && !settledBy.includes(user.uid)) {
          balance -= getShareOf(user.uid) * mySlots;
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

  // --- THÊM ĐOẠN NÀY VÀO NGAY DƯỚI sortedPeople ---
  const activeDebtorsList = useMemo(() => {
    if (!user) return [];
    return sortedPeople
      .filter((p) => p.id !== user.uid)
      .map((p) => ({ ...p, debt: calculateNetDebt(p.id) }))
      .filter((p) => p.debt !== 0); // Chỉ lấy những người có phát sinh nợ
  }, [sortedPeople, user, expenses]);

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

        // 1. TÔI trả tiền, P tham gia -> P nợ tôi (+) (Nhân theo số suất)
        if (payerId === user.uid) {
          const pSlots = exp.sharedWith.filter((id) => id === p.id).length;
          if (pSlots > 0 && !exp.settledBy?.includes(p.id)) {
            bilateral += getShare(p.id) * pSlots;
          }
        }

        // 2. P trả tiền, TÔI tham gia -> Tôi nợ P (-) (Nhân theo số suất)
        if (payerId === p.id) {
          const mySlots = exp.sharedWith.filter((id) => id === user.uid).length;
          if (mySlots > 0 && !exp.settledBy?.includes(user.uid)) {
            bilateral -= getShare(user.uid) * mySlots;
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

  // --- 1. HÀM TÌM KIẾM NGƯỜI DÙNG TRÊN HỆ THỐNG (Đã sửa để chạy tự động) ---
  const searchNetwork = async () => {
    // Nếu ô tìm kiếm trống, xóa kết quả và dừng lại
    if (!searchQuery.trim() || !user) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const usersRef = collection(db, "users");
      const snap = await getDocs(usersRef);
      const term = searchQuery.toLowerCase();
      const results = [];

      snap.forEach((doc) => {
        if (doc.id === user.uid) return;
        const data = doc.data();
        const nameMatch = data.displayName?.toLowerCase().includes(term);
        const emailMatch = data.email?.toLowerCase().includes(term);

        if (nameMatch || emailMatch) {
          results.push({
            id: doc.id,
            name: data.displayName || data.email.split("@")[0],
            email: data.email,
            photoURL: data.photoURL || "",
          });
        }
      });

      if (results.length === 0) {
        setSearchResults([{ id: "NOT_FOUND" }]);
      } else {
        setSearchResults(results);
      }
    } catch (err) {
      showToast("Lỗi tìm kiếm: " + err.message, "error");
    } finally {
      setIsSearching(false);
    }
  };

  // --- HIỆU ỨNG DEBOUNCE: Tự động tìm kiếm sau khi ngừng gõ 0.5s ---
  React.useEffect(() => {
    // Tạo một bộ đếm thời gian
    const delaySearch = setTimeout(() => {
      if (searchQuery.trim()) {
        searchNetwork(); // Gõ xong thì gọi tìm kiếm
      } else {
        setSearchResults([]); // Nếu xóa hết chữ thì dọn sạch kết quả
      }
    }, 500); // 500ms = 0.5 giây

    // Dọn dẹp bộ đếm cũ nếu người dùng tiếp tục gõ (chưa hết 0.5s)
    return () => clearTimeout(delaySearch);
  }, [searchQuery]); // Hiệu ứng này chạy lại mỗi khi searchQuery thay đổi

  // --- 2. HÀM GỬI LỜI MỜI (DÀNH CHO NÚT KẾT BẠN TRONG TÌM KIẾM) ---
  const handleAddFriendFromSearch = async (targetUser) => {
    try {
      const requestData = {
        id: user.uid,
        name: user.displayName || user.email.split("@")[0],
        email: user.email,
        photoURL: user.photoURL || "",
        timestamp: new Date().toISOString(),
      };
      await updateDoc(doc(db, "users", targetUser.id), {
        friendRequests: arrayUnion(requestData),
      });
      showToast(`Đã gửi lời mời đến ${targetUser.name}!`, "success");
    } catch (e) {
      showToast("Lỗi gửi lời mời: " + e.message, "error");
    }
  };

  // --- 3. HÀM HỦY KẾT BẠN (UNFRIEND) ---
  const handleUnfriend = (friendId) => {
    setConfirmDialog({
      isOpen: true,
      title: "Hủy kết bạn?",
      message:
        "Bạn có chắc muốn hủy kết bạn? Người này sẽ bị xóa khỏi danh bạ của bạn.",
      onConfirm: async () => {
        try {
          // Xóa khỏi danh bạ của MÌNH
          const myUpdatedContacts = contacts.filter((c) => c.id !== friendId);
          await setDoc(
            doc(db, "users", user.uid),
            { contacts: myUpdatedContacts },
            { merge: true },
          );

          // Xóa mình khỏi danh bạ của HỌ
          const friendRef = doc(db, "users", friendId);
          const friendSnap = await getDoc(friendRef);
          if (friendSnap.exists()) {
            const theirContacts = friendSnap.data().contacts || [];
            const theirUpdatedContacts = theirContacts.filter(
              (c) => c.id !== user.uid,
            );
            await updateDoc(friendRef, { contacts: theirUpdatedContacts });
          }

          setContacts(myUpdatedContacts);
          showToast("Đã hủy kết bạn!", "success");
          setConfirmDialog({ isOpen: false });
        } catch (e) {
          showToast("Lỗi: " + e.message, "error");
        }
      },
    });
  };

  // --- 4. HÀM HỢP NHẤT TÀI KHOẢN ẢO VÀO TÀI KHOẢN THẬT ---
  const executeMergeContact = async (realFriend) => {
    if (!mergingContact || !realFriend || !user) return;
    const fakeId = mergingContact.id;
    const realId = realFriend.id;

    try {
      // 1. SỬA Ở ĐÂY: Xóa tài khoản ảo VÀ đánh dấu tài khoản thật là "isLinked: true"
      const updatedContacts = contacts
        .filter((c) => c.id !== fakeId)
        .map((c) => (c.id === realId ? { ...c, isLinked: true } : c));

      await setDoc(
        doc(db, "users", user.uid),
        { contacts: updatedContacts },
        { merge: true },
      );
      setContacts(updatedContacts);

      // 2. Chạy qua tất cả các nhóm để thay thế ID
      for (const g of myGroups) {
        const groupRef = doc(db, "groups", g.id);
        const groupSnap = await getDoc(groupRef);

        if (groupSnap.exists()) {
          const groupData = groupSnap.data();
          let groupMembers = groupData.members || [];
          let groupExpenses = groupData.expenses || [];

          // Nếu tài khoản ảo có trong nhóm này
          if (groupMembers.some((m) => m.id === fakeId)) {
            // A. Đổi ID trong danh sách thành viên
            groupMembers = groupMembers.map((m) =>
              m.id === fakeId
                ? {
                    ...m,
                    id: realId,
                    name: realFriend.name,
                    photoURL: realFriend.photoURL,
                    email: realFriend.email,
                  }
                : m,
            );

            // B. Đổi ID trong toàn bộ lịch sử giao dịch
            groupExpenses = groupExpenses.map((exp) => {
              let newExp = { ...exp };
              if (newExp.payerId === fakeId) newExp.payerId = realId;
              if (newExp.sharedWith?.includes(fakeId)) {
                newExp.sharedWith = newExp.sharedWith.map((id) =>
                  id === fakeId ? realId : id,
                );
              }
              if (newExp.settledBy?.includes(fakeId)) {
                newExp.settledBy = newExp.settledBy.map((id) =>
                  id === fakeId ? realId : id,
                );
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

            // C. Lưu lên DB
            await updateDoc(groupRef, {
              members: groupMembers,
              expenses: groupExpenses,
            });

            // D. Bắn nhóm này cho người bạn thật để họ thấy
            const groupInfoForFriend = {
              id: g.id,
              name: groupData.name || "Nhóm",
              icon: groupData.icon || "💰",
            };
            await updateDoc(doc(db, "users", realId), {
              joinedGroups: arrayUnion(groupInfoForFriend),
            });
          }
        }
      }

      showToast(
        `Đã đồng bộ ${mergingContact.name} vào tài khoản thật thành công!`,
        "success",
      );
      setMergingContact(null);
    } catch (e) {
      showToast("Lỗi đồng bộ: " + e.message, "error");
    }
  };

  // --- HÀM MỚI: THÊM LIÊN HỆ KHÔNG CẦN EMAIL ---
  const handleAddLocalContact = async () => {
    if (!newLocalContactName.trim()) {
      return showToast("Vui lòng nhập tên người muốn thêm!", "error");
    }
    if (!user) return showToast("Vui lòng đăng nhập!", "error");

    try {
      const newContact = {
        id: uuidv4(), // Tạo một ID ảo
        name: newLocalContactName.trim(),
        email: "", // Bỏ trống email
        photoURL: "",
        createdAt: new Date().toISOString(),
      };

      const updatedList = [...contacts, newContact];

      // Lưu lên Firestore
      await setDoc(
        doc(db, "users", user.uid),
        { contacts: updatedList },
        { merge: true },
      );

      setContacts(updatedList);
      setNewLocalContactName(""); // Xóa rỗng ô nhập
      showToast("Đã thêm người mới vào danh bạ!", "success");
    } catch (e) {
      console.error(e);
      showToast("Lỗi thêm liên hệ: " + e.message, "error");
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

  // --- 2. HÀM CẬP NHẬT LIÊN HỆ (SỬA TÊN/EMAIL VÀ ĐỒNG BỘ VÀO NHÓM) ---
  const handleUpdateContact = async (updatedName, updatedEmail) => {
    if (!editingContact || !user) return;
    if (!updatedName.trim())
      return showToast("Tên không được để trống", "error");

    try {
      const contactId = editingContact.id;
      const newName = updatedName.trim();
      const newEmail = updatedEmail.trim();

      // 1. Cập nhật trong danh bạ cá nhân
      const updatedList = contacts.map((c) =>
        c.id === contactId ? { ...c, name: newName, email: newEmail } : c,
      );

      await setDoc(
        doc(db, "users", user.uid),
        { contacts: updatedList },
        { merge: true },
      );

      setContacts(updatedList);

      // ==========================================
      // 2. [MỚI] ĐỒNG BỘ TÊN MỚI VÀO TẤT CẢ CÁC NHÓM
      // ==========================================
      for (const g of myGroups) {
        const groupRef = doc(db, "groups", g.id);
        const groupSnap = await getDoc(groupRef);

        if (groupSnap.exists()) {
          const groupData = groupSnap.data();
          let members = groupData.members || [];

          // Nếu tìm thấy người này trong nhóm
          const memberIndex = members.findIndex((m) => m.id === contactId);
          if (memberIndex >= 0) {
            members[memberIndex] = {
              ...members[memberIndex],
              name: newName,
              email: newEmail,
            };

            // Lưu dữ liệu nhóm mới lên Firebase
            await updateDoc(groupRef, { members: members });
          }
        }
      }

      // 3. Nếu đang mở xem 1 nhóm cụ thể, cập nhật luôn giao diện ngay lập tức
      if (groupId) {
        setPeople((prev) =>
          prev.map((p) =>
            p.id === contactId ? { ...p, name: newName, email: newEmail } : p,
          ),
        );
      }

      setEditingContact(null);
      showToast("Đã cập nhật và đồng bộ tên vào các nhóm!", "success");
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
          setConfirmDialog((prev) => ({ ...prev, isOpen: false })); // <--- THÊM DÒNG NÀY
        } catch (e) {
          console.error(e);
          showToast("Lỗi khi xóa thành viên", "error");
          setConfirmDialog((prev) => ({ ...prev, isOpen: false })); // <--- THÊM DÒNG NÀY
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

  const openAddModal = useCallback(() => {
    setEditingExpense(null);
    setIsModalOpen(true);
  }, []);

  const openEditModal = useCallback((exp) => {
    setEditingExpense(exp);
    setIsModalOpen(true);
  }, []);

  const handleToggleSettled = useCallback(
    (expenseId, personId, groupId) => {
      toggleSettled(expenseId, personId);
    },
    [expenses], // Bạn giữ [expenses] ở đây là đúng nếu toggleSettled phụ thuộc vào expenses
  );

  const handleSetItemToDelete = useCallback((val) => setItemToDelete(val), []);
  const handleSetViewingImage = useCallback((val) => setViewingImage(val), []);
  const handleSetCommentModalData = useCallback(
    (val) => setCommentModalData(val),
    [],
  );

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
      // BỎ new Set ĐỂ CHO PHÉP 1 NGƯỜI CÓ THỂ CÓ NHIỀU SUẤT (ID trùng lặp)
      cleanData.sharedWith = cleanData.sharedWith.map((id) =>
        id === "me" ? realUid : id,
      );
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

        // 1. Đóng form NGAY LẬP TỨC để iPad không bị cảm giác đơ (Optimistic UI)
        setIsModalOpen(false);
        setEditingExpense(null);

        // 2. Chạy ngầm lưu dữ liệu lên Firebase
        await updateDoc(groupRef, { expenses: updatedExpenses });

        // 3. Báo thành công
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
      <div className="fixed inset-0 h-[100dvh] w-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-600 to-violet-600 relative overflow-hidden z-[9999]">
        {/* --- Hiệu ứng ánh sáng nền (Glow Blur) --- */}
        <div className="absolute top-[-10%] right-[-10%] w-72 h-72 bg-white/10 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
        <div
          className="absolute bottom-[-10%] left-[-10%] w-72 h-72 bg-indigo-400/20 rounded-full blur-3xl pointer-events-none animate-pulse"
          style={{ animationDelay: "1s" }}
        ></div>

        <div className="relative z-10 flex flex-col items-center animate-fade-in">
          {/* --- Icon App (ĐÃ THAY THÀNH <img> VỚI LOGO XỊN) --- */}
          <div className="w-28 h-28 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-indigo-900/50 mb-8 relative">
            {/* Đổi object-contain thành object-cover và bo góc cho khớp hoàn toàn */}
            <img
              src={appIcon}
              alt="Split Money Logo"
              className="w-full h-full object-cover rounded-[2rem] relative z-10"
            />
          </div>

          {/* --- Vòng xoay Loading Custom --- */}
          <div className="relative w-12 h-12 mb-5">
            {/* Vòng mờ bên dưới */}
            <div className="absolute inset-0 border-4 border-white/20 rounded-full"></div>
            {/* Vòng chạy xoay bên trên */}
            <div className="absolute inset-0 border-4 border-white border-t-transparent border-l-transparent rounded-full animate-spin"></div>
          </div>

          {/* --- Tên App & Dòng chữ Loading --- */}
          <h2 className="text-2xl font-bold text-white tracking-wide mb-1 drop-shadow-md">
            Split Money
          </h2>
          <p className="text-indigo-200 text-base md:text-sm font-medium animate-pulse">
            Đang tải dữ liệu...
          </p>
        </div>
      </div>
    );
  }

  const renderHistoryItem = (exp, isMobile = false, idx = "") => {
    return (
      <HistoryItem
        key={`${exp.id}-${idx}`}
        exp={exp}
        isMobile={isMobile}
        user={user}
        people={people}
        groupId={groupId}
        openEditModal={openEditModal}
        setItemToDelete={handleSetItemToDelete}
        setViewingImage={handleSetViewingImage}
        setCommentModalData={handleSetCommentModalData}
        toggleSettled={handleToggleSettled}
        formatCompactCurrency={formatCompactCurrency}
        selectedPersonId={selectedPersonId}
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
      <div className="fixed inset-0 z-[400] bg-black/70 flex items-center justify-center p-4 animate-fade-in">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col h-[80dvh] animate-slide-up overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
            <div>
              <h3 className="font-bold text-gray-800">Bình luận</h3>
              <p className=" text-gray-500 truncate max-w-[200px]">
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
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-50/50 shadow-[inset_0_4px_20px_rgba(0,0,0,0.02)] bg-slate-50 space-y-4">
            {!expense.comments || expense.comments.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-60">
                <MessageSquare size={48} className="mb-2 text-gray-300" />
                <p className="text-base md:text-sm">Chưa có thảo luận nào.</p>
                <p className="">Hãy là người đầu tiên bình luận!</p>
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
                        className={`px-3 py-2 rounded-2xl text-base md:text-sm ${
                          isMe
                            ? "bg-indigo-500 text-white rounded-tr-none"
                            : "bg-white border border-gray-200 text-gray-800 rounded-tl-none shadow-sm"
                        }`}
                      >
                        {c.text}
                      </div>
                      {/* Thông tin người gửi + Thời gian */}
                      <p className=" text-gray-400 px-1">
                        {isMe ? "Tôi" : c.userName} •{" "}
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
              className="flex-1 bg-gray-100 border-none outline-none rounded-xl px-4 py-2.5 text-base md:text-sm focus:ring-2 focus:ring-blue-500/50 transition-all"
              autoFocus
            />
            <button
              onClick={handleSend}
              disabled={!text.trim()}
              className="p-2.5 bg-indigo-500 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-200/50"
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
        className="fixed inset-0 z-[500] bg-black/90  flex items-center justify-center p-4 animate-fade-in"
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
        className="fixed inset-0 z-[400] bg-black/60  flex items-center justify-center p-4 animate-fade-in"
        onClick={() => setSharingGroup(null)}
      >
        <div
          className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 animate-slide-up relative overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header trang trí */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-indigo-600 to-violet-500"></div>

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
            <p className="text-base md:text-sm text-gray-500 mb-8">
              Gửi mã này cho bạn bè để vào nhóm
            </p>

            {/* HIỂN THỊ MÃ NHÓM TO RÕ */}
            <div className="bg-gray-50 border-2 border-dashed border-violet-100 rounded-2xl p-6 mb-8 relative group">
              <p className=" font-bold text-blue-500 uppercase tracking-widest mb-2">
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
                className="mt-4 px-6 py-2 bg-white border border-gray-200 rounded-xl text-base md:text-sm font-bold text-indigo-600 hover:bg-violet-50/50 shadow-sm transition-all active:scale-95"
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
              className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-500 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200/50 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Share2 size={20} /> Gửi cho bạn bè
            </button>

            <p className="mt-4  text-gray-400 italic">
              Bạn bè có thể nhập mã này tại màn hình chính để tham gia.
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 h-[100dvh] w-screen bg-gray-50 font-sans overflow-hidden flex flex-col overscroll-none">
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
            ? [...expenses]
                .filter(
                  (e) =>
                    e.payerId === user?.uid || e.sharedWith.includes(user?.uid),
                )
                .sort(
                  (a, b) =>
                    new Date(b.date).getTime() - new Date(a.date).getTime(),
                ) /* <--- THÊM SẮP XẾP Ở ĐÂY */
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

      {/* --- CHÈN MODAL HỢP NHẤT Ở ĐÂY --- */}
      <MergeContactModal
        isOpen={!!mergingContact}
        onClose={() => setMergingContact(null)}
        fakeContact={mergingContact}
        realContacts={contacts.filter((c) => c.email)}
        onConfirm={executeMergeContact}
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

      {/* --- MODAL TẠO NHÓM MỚI (UI SIÊU MƯỢT & HIỆN ĐẠI) --- */}
      {isCreateGroupModalOpen && (
        <div className="fixed inset-0 z-[600] flex items-end md:items-center justify-center bg-black/40  p-0 md:p-4 animate-fade-in">
          <div className="bg-white rounded-t-[2rem] md:rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-slide-up">
            {/* Header */}
            <div className="p-5 md:p-6 border-b border-gray-100 flex justify-between items-center bg-white relative shrink-0">
              {/* Thanh kéo nhỏ cho Mobile */}
              <div className="w-12 h-1.5 bg-gray-200 rounded-full absolute top-2 left-1/2 -translate-x-1/2 md:hidden"></div>
              <h3 className="font-black text-xl text-gray-800 mt-2 md:mt-0">
                Tạo nhóm mới
              </h3>
              <button
                onClick={() => setIsCreateGroupModalOpen(false)}
                className="p-2 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-full transition-colors mt-2 md:mt-0"
              >
                <X size={20} strokeWidth={3} />
              </button>
            </div>

            <div className="p-5 md:p-6 space-y-7 overflow-y-auto custom-scrollbar bg-gray-50/50">
              {/* Tên nhóm */}
              <div>
                <label className=" font-bold text-gray-400 uppercase tracking-widest mb-2 block">
                  Tên nhóm chi tiêu
                </label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="VD: Du lịch Đà Lạt, Tiền nhà..."
                  className="w-full p-4 bg-white rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/30 border border-gray-200 text-lg font-bold text-gray-800 shadow-sm transition-all placeholder-gray-300"
                  autoFocus
                />
              </div>

              {/* CHỌN ICON NHÓM (Dạng scroll ngang cho thoáng) */}
              <div>
                <label className=" font-bold text-gray-400 uppercase tracking-widest mb-2 block">
                  Biểu tượng
                </label>
                {/* Đã thêm pt-3 và pb-4 để mở rộng không gian trên dưới, icon nảy lên thoải mái không bị cắt */}
                <div className="flex overflow-x-auto gap-3 pt-3 pb-4 px-2 -mx-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none'] snap-x">
                  {GROUP_ICONS.map((icon) => (
                    <button
                      key={icon}
                      onClick={() => setSelectedIcon(icon)}
                      className={`text-3xl w-14 h-14 shrink-0 flex items-center justify-center rounded-2xl transition-all snap-center ${
                        selectedIcon === icon
                          ? "bg-indigo-500 shadow-lg shadow-indigo-200/50 scale-110 -translate-y-1"
                          : "bg-white border border-gray-200 hover:bg-gray-50 opacity-50 hover:opacity-100 grayscale hover:grayscale-0"
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* KHU VỰC CHỌN THÀNH VIÊN TỪ DANH BẠ */}
              <div>
                <div className="flex justify-between items-end mb-3">
                  <label className=" font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Users size={14} /> Chọn thành viên
                  </label>
                  {contacts.length > 0 && (
                    <button
                      onClick={() => {
                        if (tempMembers.length === contacts.length) {
                          setTempMembers([]);
                        } else {
                          const allMembers = contacts.map((c) => ({
                            id: c.id,
                            name: c.name,
                            email: c.email,
                            role: "member",
                          }));
                          setTempMembers(allMembers);
                        }
                      }}
                      className=" font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors active:scale-95"
                    >
                      {tempMembers.length === contacts.length
                        ? "Bỏ chọn tất cả"
                        : "Chọn tất cả"}
                    </button>
                  )}
                </div>

                <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
                  {contacts.length === 0 ? (
                    <div className="text-center py-6 text-gray-400 text-base md:text-sm italic">
                      <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Users size={20} className="text-gray-300" />
                      </div>
                      Danh bạ của bạn đang trống.
                      <br />
                      Hãy ra tab "Danh bạ bạn bè" để thêm nhé!
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-wrap gap-2.5 max-h-[220px] overflow-y-auto custom-scrollbar pr-1 pb-1">
                        {contacts.map((contact) => {
                          const isSelected = tempMembers.some(
                            (m) => m.id === contact.id,
                          );

                          return (
                            <button
                              key={contact.id}
                              onClick={() => {
                                if (isSelected) {
                                  setTempMembers(
                                    tempMembers.filter(
                                      (m) => m.id !== contact.id,
                                    ),
                                  );
                                } else {
                                  const newMember = {
                                    id: contact.id,
                                    name: contact.name,
                                    email: contact.email,
                                    role: "member",
                                  };
                                  setTempMembers([...tempMembers, newMember]);
                                }
                              }}
                              className={`flex items-center gap-2.5 pl-1.5 pr-4 py-1.5 rounded-full border-2 transition-all active:scale-95 ${
                                isSelected
                                  ? "border-indigo-500 bg-indigo-50 shadow-sm"
                                  : "border-transparent bg-gray-50 hover:bg-gray-100"
                              }`}
                            >
                              <Avatar
                                name={contact.name}
                                size="sm"
                                src={contact.photoURL} // <--- THÊM DÒNG NÀY VÀO ĐÂY
                                className="shadow-sm"
                              />
                              <span
                                className={`text-base md:text-sm font-bold ${
                                  isSelected
                                    ? "text-indigo-700"
                                    : "text-gray-600"
                                }`}
                              >
                                {contact.name}
                              </span>
                              {isSelected && (
                                <CheckCircle2
                                  size={16}
                                  className="text-indigo-600 ml-1"
                                  strokeWidth={3}
                                />
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Hiển thị số lượng đã chọn */}
                      {tempMembers.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-gray-50 flex items-center gap-2  font-bold text-gray-500">
                          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                          Đã chọn{" "}
                          <span className="text-indigo-600">
                            {tempMembers.length}
                          </span>{" "}
                          người
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="p-5 md:p-6 border-t border-gray-100 bg-white flex gap-3 shrink-0 pb-[calc(1.25rem+env(safe-area-inset-bottom))] md:pb-6">
              <button
                onClick={() => setIsCreateGroupModalOpen(false)}
                className="flex-[0.4] py-3.5 md:py-4 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-2xl transition-colors active:scale-95"
              >
                Hủy
              </button>
              <button
                onClick={handleCreateNewGroup}
                disabled={!newGroupName.trim()}
                className="flex-1 py-3.5 md:py-4 bg-gradient-to-r from-indigo-600 to-violet-500 hover:shadow-lg hover:shadow-indigo-200/50 text-white font-black rounded-2xl transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Plus size={20} strokeWidth={3} /> Tạo nhóm
              </button>
            </div>
          </div>
        </div>
      )}

      {isRenameModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden scale-100 animate-scale-up">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-6 text-center">
                Cài đặt nhóm
              </h3>

              {/* Sửa Icon */}
              <div className="mb-6">
                <label className="block  font-bold text-gray-400 uppercase tracking-widest mb-3 text-center">
                  Thay đổi biểu tượng
                </label>
                <div className="flex flex-wrap justify-center gap-2 bg-gray-50 p-3 rounded-2xl border border-gray-100">
                  {GROUP_ICONS.map((icon) => (
                    <button
                      key={icon}
                      onClick={() => setSelectedIcon(icon)}
                      className={`text-xl w-10 h-10 flex items-center justify-center rounded-lg transition-all ${
                        selectedIcon === icon
                          ? "bg-indigo-500 scale-110 shadow-md shadow-indigo-200/50"
                          : "hover:bg-white shadow-sm"
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <label className="block  font-bold text-gray-400 uppercase tracking-widest mb-2">
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
                  className="flex-1 py-3 bg-indigo-500 text-white font-bold rounded-xl transition-colors shadow-lg shadow-blue-100"
                >
                  Lưu thay đổi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL NHẬP MÃ THAM GIA NHÓM --- */}
      {isJoinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden scale-100 animate-scale-up">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800">
                  Tham gia nhóm
                </h3>
                <button
                  onClick={() => setIsJoinModalOpen(false)}
                  className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="mb-6">
                <label className="block  font-bold text-gray-400 uppercase tracking-widest mb-2">
                  Mã nhóm (8 ký tự)
                </label>
                <input
                  type="text"
                  value={joinCodeInput}
                  onChange={(e) =>
                    setJoinCodeInput(e.target.value.toUpperCase())
                  }
                  className="w-full p-4 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 border border-gray-100 font-black text-gray-700 tracking-widest text-center text-xl uppercase"
                  placeholder="VD: ABCXYZ12"
                  autoFocus
                />
              </div>
              <button
                onClick={() => {
                  handleJoinGroup(joinCodeInput);
                  setIsJoinModalOpen(false);
                  setJoinCodeInput("");
                }}
                disabled={!joinCodeInput.trim()}
                className="w-full py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-200 active:scale-95 disabled:opacity-50"
              >
                Vào nhóm ngay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- SIDEBAR MỚI (QUẢN LÝ LIST NHÓM) --- */}
      <aside className="hidden md:flex fixed top-0 bottom-0 left-0 w-72 flex-col bg-white border-r border-gray-100 shadow-xl z-20">
        {/* 1. HEADER */}
        <div className="p-6 flex items-center gap-3 border-b border-gray-50 shrink-0">
          {/* Đã thay bằng appIcon, có bo góc và đổ bóng cho đẹp */}
          <img
            src={appIcon}
            alt="Split Money Logo"
            className="w-10 h-10 rounded-xl shadow-lg shadow-indigo-200/50 object-cover"
          />
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
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-base md:text-sm ${
              activeTab === "dashboard" && !groupId
                ? "bg-violet-50/50 text-indigo-600 shadow-sm"
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
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-base md:text-sm ${
              activeTab === "people" && !groupId
                ? "bg-violet-50/50 text-indigo-600 shadow-sm"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Users size={20} /> Danh bạ bạn bè
          </button>
        </div>

        <div className="mx-6 my-4 border-b border-gray-100"></div>

        {/* 2. DANH SÁCH NHÓM (SCROLL ĐƯỢC) */}
        {/* THẺ CHA: Sidebar cố định */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white border-r border-gray-100">
          {/* PHẦN CỐ ĐỊNH PHÍA TRÊN (Tiêu đề & Nút bấm) */}
          <div className="p-4 pb-2 shrink-0">
            {" "}
            {/* Thêm padding đồng nhất ở đây */}
            {/* Header nhỏ */}
            <div className="px-2 mb-3 font-bold text-gray-400 uppercase tracking-wider flex justify-between items-center">
              <span className="text-[11px] lg:text-xs">
                Nhóm của tôi ({myGroups.length})
              </span>
              <button
                onClick={() => setIsCreateGroupModalOpen(true)}
                className="text-indigo-600 hover:bg-violet-50 p-1 rounded-md transition-colors"
              >
                <Plus size={16} strokeWidth={3} />
              </button>
            </div>
            {/* CỤM NÚT: Tạo & Nhập mã */}
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => setIsCreateGroupModalOpen(true)}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-1.5 text-[13px]"
              >
                <Plus size={14} /> Tạo
              </button>
              <button
                onClick={() => setIsJoinModalOpen(true)}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-1.5 text-[13px]"
              >
                <QrCode size={14} /> Mã QR
              </button>
            </div>
          </div>

          {/* PHẦN CUỘN DANH SÁCH NHÓM */}
          {/* Sử dụng mẹo giấu thanh cuộn để không bị lệch trái */}
          <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
            {[...myGroups].reverse().map((g) => (
              <button
                key={g.id}
                onClick={() => {
                  setGroupId(g.id);
                  setIsGroupMode(true);
                  setActiveTab("dashboard");
                }}
                className={`w-full p-3 rounded-2xl flex items-center gap-3 transition-all text-left group relative border ${
                  groupId === g.id
                    ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100 scale-[1.02]"
                    : "bg-white border-transparent hover:bg-slate-50 text-slate-700 hover:border-slate-100"
                }`}
              >
                {/* Icon nhóm */}
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg shrink-0 transition-all ${
                    groupId === g.id
                      ? "bg-white/20 text-white rotate-3"
                      : "bg-indigo-50 text-indigo-600 group-hover:bg-white"
                  }`}
                >
                  {g.icon ? g.icon : g.name?.charAt(0).toUpperCase()}
                </div>

                {/* Tên nhóm */}
                <div className="overflow-hidden flex-1">
                  <p
                    className={`truncate text-[15px] ${
                      groupId === g.id ? "font-bold" : "font-semibold"
                    }`}
                  >
                    {g.name}
                  </p>
                </div>

                {/* Cụm nút thao tác (Sửa/Xóa/Out) */}
                {groupId === g.id && (
                  <div className="flex items-center gap-1 bg-white/10 p-1 rounded-lg animate-fade-in shrink-0">
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setSharingGroup(g);
                      }}
                      className="p-1.5 hover:bg-white/20 rounded-md text-white transition-colors"
                    >
                      <QrCode size={13} />
                    </div>

                    {groupOwnerId === user?.uid ? (
                      <>
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            openRenameModal(g);
                          }}
                          className="p-1.5 hover:bg-white/20 rounded-md text-white transition-colors"
                        >
                          <Edit2 size={13} />
                        </div>
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteGroup(g.id);
                          }}
                          className="p-1.5 hover:bg-red-500 rounded-md text-white transition-colors"
                        >
                          <Trash2 size={13} />
                        </div>
                      </>
                    ) : (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLeaveGroup(g.id);
                        }}
                        className="p-1.5 hover:bg-orange-500 rounded-md text-white transition-colors"
                      >
                        <LogOut size={13} />
                      </div>
                    )}
                  </div>
                )}
              </button>
            ))}

            {myGroups.length === 0 && (
              <div className="text-center text-slate-400 py-12 px-4 italic bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
                <p className="text-sm">Bạn chưa có nhóm nào.</p>
              </div>
            )}
          </div>
        </div>
        {/* 3. NÚT THÊM GIAO DỊCH (CHỈ HIỆN KHI ĐANG Ở TRONG NHÓM) */}
        {groupId && (
          <div className="px-4 pb-2 shrink-0">
            <button
              onClick={openAddModal}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-200/50 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
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
                <p className="font-bold text-base md:text-sm text-gray-800 truncate">
                  {user.displayName || "User"}
                </p>
                <p className=" text-gray-500 truncate flex items-center gap-1">
                  <Lock size={10} /> Tài khoản cá nhân
                </p>
              </div>
              <Settings size={16} className="text-gray-400" />
            </div>
          ) : (
            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="w-full py-2 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold text-base md:text-sm hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
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
            {/* 1. HEADER MOBILE (Nền hồng) */}
            <div className="bg-gradient-to-br from-indigo-600 to-violet-500 px-5 pt-12 pb-16 shrink-0 text-white rounded-b-[3rem] shadow-sm relative z-20 overflow-hidden">
              {/* Bóng mờ */}
              <div className="absolute top-[-40px] right-[-20px] w-48 h-48 bg-white/15 rounded-full blur-3xl pointer-events-none"></div>
              <div className="absolute bottom-[-20px] left-[-20px] w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>

              <div className="flex justify-between items-center mb-6 relative z-10">
                <div className="flex items-center gap-3">
                  {groupId ? (
                    <button
                      onClick={() => {
                        setGroupId("");
                        setIsGroupMode(false);
                        setActiveTab("dashboard");
                      }}
                      className="p-2.5 bg-black/10  rounded-full"
                    >
                      <ChevronLeft size={22} />
                    </button>
                  ) : (
                    <div className="p-2.5 bg-white/20  rounded-2xl border border-white/20">
                      <Wallet size={22} />
                    </div>
                  )}
                  <div className="flex flex-col">
                    <span className="font-bold text-lg tracking-wide">
                      {groupId
                        ? myGroups.find((g) => g.id === groupId)?.name
                        : "Ví Split Money"}
                    </span>
                  </div>
                </div>

                <div
                  onClick={
                    user
                      ? () => setIsProfileOpen(true)
                      : () => setIsLoginModalOpen(true)
                  }
                  className="w-11 h-11 bg-white/20  rounded-full flex items-center justify-center border-2 border-white/30 cursor-pointer overflow-hidden shadow-sm shrink-0"
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

              {activeTab === "dashboard" && (
                <div className="relative z-10 text-center animate-fade-in mt-2 mb-2">
                  <p className="text-rose-100 text-[11px] font-bold uppercase tracking-widest opacity-90 mb-1">
                    {groupId ? "Tổng tài sản nhóm" : "Tổng tài sản ròng"}
                  </p>
                  <h2 className="font-bold text-4xl tracking-tight drop-shadow-md">
                    {formatCompactCurrency(displayNetBalance)}
                  </h2>
                </div>
              )}
            </div>
            {/* --- KẾT THÚC THẺ NỀN HỒNG --- */}

            {/* 1.5 FLOATING CARD (Đã rút ra ngoài để không bao giờ bị cắt viền) */}
            {activeTab === "dashboard" && (
              <div className="px-5 relative z-30 -mt-10 mb-4 animate-slide-up">
                <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] p-5 flex justify-between items-center">
                  <div className="flex-1 flex flex-col items-center border-r border-gray-100">
                    <div className="w-8 h-8 rounded-full bg-teal-50 flex items-center justify-center mb-1">
                      <TrendingUp size={16} className="text-teal-600" />
                    </div>
                    <p className=" text-gray-400 font-bold uppercase mb-0.5">
                      Tiền thu về
                    </p>
                    <p className="text-teal-600 font-extrabold text-lg">
                      {formatCompactCurrency(displayReceivable)}
                    </p>
                  </div>
                  <div className="flex-1 flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-amber-50/50 flex items-center justify-center mb-1">
                      <TrendingDown size={16} className="text-orange-500" />
                    </div>
                    <p className=" text-gray-400 font-bold uppercase mb-0.5">
                      Tiền phải trả
                    </p>
                    <p className="text-orange-600 font-extrabold text-lg">
                      {formatCompactCurrency(displayPayable)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 2. BODY CONTENT */}
            {/* SỬA 1: Xóa pb-[350px] và các class thừa ở thẻ cha ngoài cùng */}
            <div className="flex-1 flex flex-col min-h-0 z-30 px-4 pt-2 relative overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={
                    groupId
                      ? `group-${groupId}-${activeTab}`
                      : `global-${activeTab}`
                  }
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  // SỬA 2: Đảm bảo thẻ motion.div này chiếm full không gian
                  className="absolute inset-0 px-4 pb-[100px] flex flex-col"
                >
                  {/* ========================================================
                  TRƯỜNG HỢP 1: GLOBAL VIEW (KHÔNG CÓ GROUP)
                  ======================================================== */}
                  {!groupId ? (
                    selectedPersonId ? (
                      // >>> 1.3 GLOBAL: CHI TIẾT CÔNG NỢ MỘT NGƯỜI (DESKTOP) <<<
                      <div className="h-full bg-white rounded-[2rem] shadow-sm border border-gray-200 flex flex-col relative overflow-hidden animate-slide-up">
                        <div className="p-6 border-b flex justify-between items-center bg-gray-50">
                          <h2 className="font-bold text-xl text-gray-700">
                            Chi tiết công nợ (Tất cả)
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
                            const p =
                              globalFriendStats.find(
                                (item) => item.id === selectedPersonId,
                              ) ||
                              contacts.find(
                                (item) => item.id === selectedPersonId,
                              );
                            if (!p) return null;
                            const debt = p.amount || 0;
                            const related = globalHistory.filter(
                              (e) =>
                                ((e.payerId === user?.uid ||
                                  e.payerId === "me") &&
                                  (e.sharedWith || []).includes(p.id)) ||
                                (e.payerId === p.id &&
                                  ((e.sharedWith || []).includes(user?.uid) ||
                                    (e.sharedWith || []).includes("me"))),
                            );

                            // Gom nhóm theo tên
                            const groupedExpenses = {};
                            related.forEach((e) => {
                              const gName =
                                e.groupName ||
                                myGroups?.find((g) => g.id === e.groupId)
                                  ?.name ||
                                "Giao dịch cá nhân";
                              if (!groupedExpenses[gName]) {
                                groupedExpenses[gName] = [];
                              }
                              groupedExpenses[gName].push(e);
                            });

                            return (
                              <div className="max-w-3xl mx-auto">
                                <div className="flex items-center gap-8 mb-10 p-8 bg-gray-50/80 rounded-[2rem] border border-gray-100 relative">
                                  <Avatar
                                    name={p.name}
                                    size="lg"
                                    src={p.avatar || p.photoURL}
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
                                </div>
                                <h3 className="font-bold text-gray-400 text-base md:text-sm uppercase mb-6 flex items-center gap-4">
                                  <span className="bg-gray-200 h-px flex-1"></span>{" "}
                                  Lịch sử chung ({related.length}){" "}
                                  <span className="bg-gray-200 h-px flex-1"></span>
                                </h3>
                                <div className="space-y-5 pb-10">
                                  {Object.keys(groupedExpenses).length === 0 ? (
                                    <p className="text-center text-gray-400 italic text-sm py-4">
                                      Chưa có giao dịch chung nào.
                                    </p>
                                  ) : (
                                    Object.entries(groupedExpenses).map(
                                      ([groupName, exps]) => (
                                        <div
                                          key={groupName}
                                          className="bg-white p-4 rounded-[1.5rem] shadow-sm border border-gray-100"
                                        >
                                          <div className="flex items-center gap-2 mb-4 px-1">
                                            <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]"></div>
                                            <h4 className="font-black text-gray-800 text-base">
                                              {groupName}
                                            </h4>
                                            <span className="text-[10px] font-bold text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-md ml-auto">
                                              {exps.length} giao dịch
                                            </span>
                                          </div>
                                          <div className="space-y-0">
                                            {exps
                                              .sort(
                                                (a, b) =>
                                                  new Date(b.date) -
                                                  new Date(a.date),
                                              )
                                              .map((e) =>
                                                renderHistoryItem(e, false),
                                              )}
                                          </div>
                                        </div>
                                      ),
                                    )
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    ) : activeTab === "people" ? (
                      // >>> 1.1 GLOBAL: DANH BẠ BẠN BÈ <<<
                      <div className="bg-white rounded-[2rem] shadow-lg flex-1 flex flex-col overflow-hidden animate-slide-up">
                        <div className="p-4 md:p-6 border-b border-gray-100">
                          <h3 className="font-bold text-gray-800 text-base md:text-lg flex items-center gap-2">
                            <Users className="text-indigo-600" size={20} /> Danh
                            bạ của tôi
                          </h3>
                        </div>

                        <div className="flex-1 overflow-y-auto p-3 md:p-4 custom-scrollbar bg-slate-50/50 shadow-[inset_0_4px_20px_rgba(0,0,0,0.02)]">
                          {/* Form tìm & thêm danh bạ (ĐÃ CÂN CHỈNH LẠI SIZE VỪA VẶN) */}
                          <div className="bg-violet-50/50 p-3 md:p-4 rounded-xl md:rounded-2xl mb-4 border border-blue-100 space-y-3 md:space-y-4">
                            {/* Mục 1: Thêm nhanh không cần Email */}
                            <div>
                              <p className="text-xs md:text-sm font-bold text-indigo-700 mb-1.5 md:mb-2 uppercase">
                                Thêm nhanh (Không cần Email)
                              </p>
                              <div className="flex gap-2">
                                <input
                                  value={newLocalContactName}
                                  onChange={(e) =>
                                    setNewLocalContactName(e.target.value)
                                  }
                                  placeholder="Nhập tên (VD: Gdragon)..."
                                  className="flex-1 min-w-0 p-2.5 md:p-3 rounded-lg md:rounded-xl border border-violet-100 text-sm outline-none focus:ring-2 ring-gray-200"
                                />
                                <button
                                  onClick={handleAddLocalContact}
                                  className="px-3 py-2.5 md:px-4 md:py-3 bg-violet-400 text-white rounded-lg md:rounded-xl text-sm font-bold shadow-sm active:scale-95 transition-transform shrink-0 whitespace-nowrap"
                                >
                                  Thêm ngay
                                </button>
                              </div>
                            </div>

                            <hr className="border-violet-100/50" />

                            {/* Mục 2: Tìm kiếm kết bạn */}
                            <div>
                              <p className="text-xs md:text-sm font-bold text-indigo-700 mb-1.5 md:mb-2 uppercase">
                                Tìm kiếm bạn bè
                              </p>
                              <div className="flex gap-2">
                                <input
                                  value={searchQuery}
                                  onChange={(e) =>
                                    setSearchQuery(e.target.value)
                                  }
                                  placeholder="Nhập Email hoặc Tên thật..."
                                  className="flex-1 min-w-0 p-2.5 md:p-3 rounded-lg md:rounded-xl border border-violet-100 text-sm outline-none focus:ring-2 ring-gray-200 transition-colors"
                                />
                                <button
                                  type="submit"
                                  className="px-4 py-2.5 md:px-4 md:py-3 bg-indigo-500 text-white rounded-lg md:rounded-xl text-sm font-bold shadow-sm active:scale-95 shrink-0 whitespace-nowrap"
                                >
                                  {isSearching ? "Tìm..." : "Tìm"}
                                </button>
                              </div>

                              {searchResults &&
                                searchResults.length > 0 &&
                                searchResults[0].id === "NOT_FOUND" && (
                                  <div className="mt-3 p-2.5 text-center font-bold text-rose-500 bg-rose-50 rounded-lg md:rounded-xl border border-rose-100 animate-fade-in shadow-sm text-sm">
                                    Không tìm thấy tài khoản!
                                  </div>
                                )}

                              {/* HIỂN THỊ KẾT QUẢ TÌM KIẾM CHUẨN */}
                              {searchResults &&
                                searchResults.length > 0 &&
                                searchResults[0].id !== "NOT_FOUND" && (
                                  <div className="mt-3 p-2.5 md:p-3 bg-white/60 rounded-lg md:rounded-xl border border-blue-100 animate-fade-in">
                                    <p className="text-xs md:text-sm font-bold text-indigo-700 mb-2 uppercase">
                                      Kết quả ({searchResults.length})
                                    </p>
                                    <div className="space-y-2 max-h-[250px] overflow-y-auto custom-scrollbar pr-1">
                                      {searchResults.map((res) => {
                                        const isFriend = contacts.some(
                                          (c) => c.id === res.id,
                                        );
                                        return (
                                          <div
                                            key={res.id}
                                            className="flex items-center gap-2 md:gap-3 p-2 bg-white rounded-lg border border-blue-50 shadow-sm"
                                          >
                                            <Avatar
                                              name={res.name}
                                              src={res.photoURL}
                                              size="sm"
                                              className="w-9 h-9 md:w-10 md:h-10 text-[11px] md:text-xs shrink-0"
                                            />
                                            <div className="flex-1 min-w-0">
                                              <p className="font-bold text-gray-800 text-sm md:text-base truncate">
                                                {res.name}
                                              </p>
                                              <p className="text-[11px] md:text-xs text-gray-500 truncate">
                                                {res.email}
                                              </p>
                                            </div>
                                            {isFriend ? (
                                              <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded">
                                                Đã KB
                                              </span>
                                            ) : (
                                              <button
                                                onClick={() =>
                                                  handleAddFriendFromSearch(res)
                                                }
                                                className="px-3 py-1.5 bg-indigo-500 text-white text-xs md:text-sm font-bold rounded shadow-sm active:scale-90 transition-transform"
                                              >
                                                Kết bạn
                                              </button>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                            </div>
                          </div>

                          {/* KHU VỰC HIỂN THỊ LỜI MỜI KẾT BẠN */}
                          {friendRequests?.length > 0 && (
                            <div className="mb-5 md:mb-6">
                              <p className="text-xs md:text-sm font-bold text-orange-600 uppercase mb-2 flex items-center gap-2">
                                <Bell size={18} className="animate-bounce" />{" "}
                                Lời mời kết bạn ({friendRequests.length})
                              </p>
                              <div className="space-y-2 md:space-y-3">
                                {friendRequests.map((req) => (
                                  <div
                                    key={req.id}
                                    className="flex items-center gap-3 p-2.5 md:p-3 bg-amber-50/50 rounded-xl md:rounded-2xl border border-orange-100"
                                  >
                                    {req.photoURL ? (
                                      <img
                                        src={req.photoURL}
                                        alt={req.name}
                                        className="w-9 h-9 md:w-10 md:h-10 rounded-full object-cover shrink-0"
                                      />
                                    ) : (
                                      <Avatar
                                        name={req.name}
                                        size="md"
                                        className="w-9 h-9 md:w-10 md:h-10 text-[11px] md:text-xs shrink-0"
                                      />
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <p className="font-bold text-gray-800 text-sm md:text-base truncate">
                                        {req.name}
                                      </p>
                                      <p className="text-[11px] md:text-xs text-gray-500 truncate">
                                        {req.email}
                                      </p>
                                    </div>
                                    <div className="flex gap-1.5 shrink-0">
                                      <button
                                        onClick={() => handleAcceptRequest(req)}
                                        className="px-3 py-1.5 md:px-3 md:py-1.5 bg-indigo-500 text-white text-xs md:text-sm font-bold rounded-lg shadow-sm active:scale-95"
                                      >
                                        Chấp nhận
                                      </button>
                                      <button
                                        onClick={() =>
                                          handleDeclineRequest(req.id)
                                        }
                                        className="px-3 py-1.5 md:px-3 md:py-1.5 bg-gray-200 text-gray-600 text-xs md:text-sm font-bold rounded-lg shadow-sm active:scale-95"
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
                          <div className="space-y-2 md:space-y-3">
                            {contacts.length === 0 ? (
                              <p className="text-center text-gray-400 text-sm md:text-base italic mt-8 md:mt-10">
                                Danh bạ trống
                              </p>
                            ) : (
                              contacts.map((c) => (
                                <div
                                  key={c.id}
                                  className="flex items-center gap-3 p-2.5 md:p-3 bg-gray-50 rounded-xl md:rounded-2xl border border-transparent hover:border-violet-100 transition-all group"
                                >
                                  {/* AVATAR TỶ LỆ VÀNG: w-9 h-9 cho Mobile */}
                                  {c.photoURL ? (
                                    <img
                                      src={c.photoURL}
                                      alt={c.name}
                                      className="w-9 h-9 md:w-10 md:h-10 rounded-full object-cover border border-gray-200 shrink-0"
                                    />
                                  ) : (
                                    <Avatar
                                      name={c.name}
                                      size="md"
                                      className="w-9 h-9 md:w-10 md:h-10 text-[11px] md:text-[12px] shrink-0"
                                    />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="font-bold text-gray-800 text-sm md:text-base truncate">
                                      {c.name}
                                    </p>
                                    {c.email ? (
                                      <p className="text-[11px] md:text-xs text-gray-400 truncate">
                                        {c.email}
                                      </p>
                                    ) : (
                                      <p className="text-[10px] md:text-xs text-orange-400 italic">
                                        Chưa có email
                                      </p>
                                    )}
                                  </div>

                                  {/* CỤM NÚT QUẢN LÝ DỄ BẤM HƠN */}
                                  <div className="flex gap-1.5 md:gap-2">
                                    {!c.email ? (
                                      // Nút Link cho người Ảo (Giữ Icon nhưng to hơn xíu)
                                      <button
                                        onClick={() => setMergingContact(c)}
                                        className="p-2 md:p-2 bg-violet-50 text-indigo-600 hover:bg-indigo-100 rounded-lg shadow-sm border border-indigo-100 flex items-center justify-center font-bold"
                                      >
                                        <Link
                                          size={16}
                                          className="md:w-4 md:h-4"
                                        />
                                        <span className="hidden md:inline ml-1 text-sm">
                                          Liên kết
                                        </span>
                                      </button>
                                    ) : (
                                      // Nút Unfriend cho bạn Thật
                                      <button
                                        onClick={() => handleUnfriend(c.id)}
                                        className="p-2 md:p-2 bg-violet-50/50 text-indigo-600 hover:bg-rose-100 rounded-lg shadow-sm border border-rose-100 flex items-center justify-center font-bold"
                                      >
                                        <UserMinus
                                          size={16}
                                          className="md:w-4 md:h-4"
                                        />
                                        <span className="hidden md:inline ml-1 text-sm">
                                          Hủy KB
                                        </span>
                                      </button>
                                    )}

                                    {/* Nút Sửa & Xóa (Tăng vùng bấm p-2, icon 16) */}
                                    <button
                                      onClick={() => setEditingContact(c)}
                                      className="p-2 bg-white text-gray-400 hover:text-indigo-600 rounded-lg shadow-sm border border-gray-100 flex items-center justify-center"
                                    >
                                      <Edit2
                                        size={16}
                                        className="md:w-4 md:h-4"
                                      />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteContact(c.id)}
                                      className="p-2 bg-white text-gray-400 hover:text-red-500 rounded-lg shadow-sm border border-gray-100 flex items-center justify-center"
                                    >
                                      <Trash2
                                        size={16}
                                        className="md:w-4 md:h-4"
                                      />
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
                            <h3 className="font-bold text-gray-700 text-sm uppercase select-none">
                              Nhóm của tôi
                            </h3>
                            <div className="flex gap-2">
                              {/* NÚT NHẬP MÃ */}
                              <button
                                onClick={() => setIsJoinModalOpen(true)}
                                className="text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-sm active:scale-95"
                              >
                                <QrCode size={14} /> Nhập mã
                              </button>
                              {/* NÚT TẠO NHÓM */}
                              <button
                                onClick={() => setIsCreateGroupModalOpen(true)}
                                className="text-rose-600 bg-rose-50 hover:bg-rose-100 p-1.5 rounded-lg transition-colors shadow-sm active:scale-95"
                              >
                                <Plus size={16} />
                              </button>
                            </div>
                          </div>

                          {/* SỬ DỤNG myGroups THAY VÌ groups */}
                          <div>
                            {myGroups.length === 0 ? (
                              <div className="text-center py-6 text-gray-400 text-xs italic border-3 border-dashed border-gray-100 rounded-xl">
                                Chưa có nhóm nào.
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {[...myGroups].reverse().map((group) => (
                                  <GroupItem
                                    key={group.id}
                                    group={group}
                                    isMobile={isMobileView}
                                    // MAPPING LẠI CÁC HÀM CHO ĐÚNG VỚI APP CỦA BẠN
                                    onSelectGroup={() => {
                                      setGroupId(group.id);
                                      setIsGroupMode(true);
                                      setActiveTab("dashboard");
                                    }}
                                    onEditGroup={() => openRenameModal(group)}
                                    onDeleteGroup={() =>
                                      handleDeleteGroup(group.id)
                                    }
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Global Debts */}
                        <div className="bg-white p-4 rounded-[2rem] shadow-sm flex-1">
                          <div className="flex justify-between items-center mb-3">
                            <h3 className="font-bold text-gray-700 text-base md:text-sm uppercase">
                              Chi tiết công nợ (Tất cả)
                            </h3>
                            <button
                              onClick={() => {
                                let owesMe = [];
                                let iOwe = [];

                                globalFriendStats.forEach((item) => {
                                  if (item.amount !== 0) {
                                    const roundedK = Math.round(
                                      Math.abs(item.amount) / 1000,
                                    );
                                    if (item.amount > 0)
                                      owesMe.push(
                                        `- ${item.name} ${roundedK}k`,
                                      );
                                    else
                                      iOwe.push(`- ${item.name} ${roundedK}k`);
                                  }
                                });

                                if (owesMe.length === 0 && iOwe.length === 0) {
                                  showToast(
                                    "Chưa có công nợ nào để copy!",
                                    "info",
                                  );
                                  return;
                                }

                                let text = "";
                                if (owesMe.length > 0)
                                  text += "Cần thu:\n" + owesMe.join("\n");
                                if (owesMe.length > 0 && iOwe.length > 0)
                                  text += "\n\n";
                                if (iOwe.length > 0)
                                  text += "Cần trả:\n" + iOwe.join("\n");

                                navigator.clipboard.writeText(text).then(() => {
                                  showToast("Đã copy danh sách nợ!", "success");
                                });
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-[11px] font-bold text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm active:scale-95"
                            >
                              <Copy size={14} /> Copy Bill
                            </button>
                          </div>
                          <div className="space-y-3">
                            {globalFriendStats.length === 0 ? (
                              <p className="text-center text-gray-400 italic">
                                Không có công nợ.
                              </p>
                            ) : (
                              globalFriendStats.map((item, idx) => (
                                <div
                                  key={idx}
                                  // --- THÊM DÒNG NÀY ĐỂ KÍCH HOẠT POPUP ---
                                  onClick={() => setSelectedPersonId(item.id)}
                                  // --- THÊM CLASS ĐỂ CÓ HIỆU ỨNG BẤM ---
                                  className="flex justify-between items-center p-2 border-b border-gray-50 last:border-0 cursor-pointer active:bg-gray-50 transition-colors rounded-xl"
                                >
                                  <div className="flex items-center gap-3">
                                    <Avatar
                                      name={item.name}
                                      size="sm"
                                      src={item.avatar}
                                    />
                                    <span className="font-bold text-base md:text-sm text-gray-700 select-none">
                                      {item.name}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`font-bold text-base md:text-sm ${
                                        item.amount >= 0
                                          ? "text-teal-600"
                                          : "text-indigo-600"
                                      }`}
                                    >
                                      {item.amount >= 0 ? "+" : ""}
                                      {formatCurrency(item.amount)}
                                    </span>
                                    {/* Thêm một icon mũi tên nhỏ cho giống app thật */}
                                    <ChevronRight
                                      size={14}
                                      className="text-gray-300"
                                    />
                                  </div>
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
                    <div className="bg-white rounded-[2rem] shadow-lg h-full flex flex-col overflow-hidden animate-slide-up relative">
                      {/* 1. HEADER MODAL */}
                      <div className="p-6 pb-4 border-b border-gray-50 flex justify-between items-center bg-white/80  sticky top-0 z-10">
                        <h3 className="font-black text-gray-800 text-xl">
                          Thành viên ({people.length})
                        </h3>
                        <button
                          onClick={() => {
                            // Nút thoát nhóm nhỏ
                            setGroupId("");
                            setIsGroupMode(false);
                          }}
                          className="text-sm font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-full transition-colors"
                        >
                          Đóng
                        </button>
                      </div>

                      {/* 2. KHU VỰC NỘI DUNG SCROLL */}
                      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-white">
                        {/* Khu vực thêm từ danh bạ (UI Mới Nét đứt) */}
                        <div className="flex flex-col p-5 bg-indigo-50/30 border-2 border-indigo-100 border-dashed rounded-[1.5rem] mb-8">
                          {/* Tiêu đề và Icon (Nằm bên trái bình thường) */}
                          <div className="flex items-center justify-center text gap-2 mb-4">
                            <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center">
                              <Plus size={16} strokeWidth={3} />
                            </div>
                            <span className="font-bold text-indigo-700 text-sm">
                              Thêm từ danh bạ
                            </span>
                          </div>

                          {/* Nội dung bên trong (Được căn giữa) */}
                          {contacts.length === 0 ? (
                            <p className="text-center text-gray-400 italic text-sm">
                              Danh bạ trống. Ra trang chủ để thêm.
                            </p>
                          ) : (
                            <div className="flex flex-wrap justify-center gap-2">
                              {contacts.filter(
                                (c) => !people.some((p) => p.id === c.id),
                              ).length === 0 && (
                                <p className="text-center text-indigo-400 text-xs font-medium w-full">
                                  Đã thêm hết bạn bè vào nhóm.
                                </p>
                              )}

                              {contacts
                                .filter(
                                  (c) => !people.some((p) => p.id === c.id),
                                )
                                .map((c) => (
                                  <button
                                    key={c.id}
                                    onClick={() => addContactToGroup(c)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-xl border border-indigo-200 font-bold text-gray-700 text-sm shadow-sm active:scale-95 hover:bg-indigo-50 transition-colors"
                                  >
                                    <Avatar
                                      name={c.name}
                                      size="sm"
                                      className="w-5 h-5 text-[8px]"
                                    />
                                    {c.name}
                                  </button>
                                ))}
                            </div>
                          )}
                        </div>

                        {/* List thành viên hiện tại */}
                        <div className="space-y-1">
                          {people.map((p) => (
                            <div
                              key={p.id}
                              className="flex justify-between items-center p-2 hover:bg-gray-50 rounded-2xl transition-colors group"
                            >
                              <div className="flex items-center gap-3.5">
                                {p.photoURL ? (
                                  <img
                                    src={p.photoURL}
                                    alt={p.name}
                                    className="w-10 h-10 rounded-full object-cover shadow-sm border border-gray-100 shrink-0"
                                  />
                                ) : (
                                  <Avatar
                                    name={p.name}
                                    src={p.photoURL}
                                    size="md"
                                    className="shadow-sm border border-gray-100"
                                  />
                                )}
                                <div className="flex flex-col">
                                  <span className="font-bold text-gray-800 text-base">
                                    {p.name}
                                  </span>
                                  {p.email && (
                                    <span className="text-[11px] md:text-xs font-medium text-gray-400">
                                      {p.email}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {p.id !== user?.uid && (
                                <button
                                  onClick={() => deletePerson(p.id)}
                                  className="p-2.5 text-gray-300 hover:text-red-500 hover:bg-red-50 active:bg-red-100 rounded-xl transition-all"
                                >
                                  <Trash2 size={18} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* 3. KHU VỰC MÃ NHÓM Ở ĐÁY */}
                        <div className="mt-10 mb-6 p-6 bg-gradient-to-br from-slate-50 to-gray-100 rounded-[2rem] border border-gray-200 text-center relative overflow-hidden">
                          <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 block">
                            Mã tham gia nhóm
                          </span>
                          <div className="font-black text-3xl md:text-4xl text-gray-800 tracking-[0.2em] select-all py-1">
                            {groupId}
                          </div>
                          <button
                            onClick={handleShareGroup}
                            className="mt-4 mx-auto bg-white border border-gray-200 shadow-sm text-indigo-600 font-bold px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-50 active:scale-95 transition-all w-full md:w-auto"
                          >
                            <Share2 size={18} strokeWidth={2.5} /> Chia sẻ mã
                            này
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // >>> 2.2 GROUP: DASHBOARD (LIST NỢ & LỊCH SỬ) <<<
                    <div className="flex flex-col gap-3 h-full overflow-y-auto custom-scrollbar pt-2 pb-[100px]">
                      {/* BẢNG CÔNG NỢ NGANG (ĐÃ ĐƯỢC PHÓNG TO VÀ THÊM TÍNH NĂNG COPY) */}
                      <div className="bg-white pt-3 pb-3 px-0 rounded-[1.5rem] shadow-sm shrink-0">
                        {/* HEADER: Tiêu đề + Nút Copy */}
                        <div className="flex justify-between items-center px-4 mb-3">
                          <h3 className="font-bold text-gray-700  uppercase">
                            Bảng công nợ
                          </h3>
                          <button
                            onClick={() => {
                              let owesMe = [];
                              let iOwe = [];

                              sortedPeople
                                .filter((p) => p.id !== user?.uid)
                                .forEach((p) => {
                                  const debt = calculateNetDebt(p.id);
                                  if (debt !== 0) {
                                    // Làm tròn chia 1000 (Ví dụ: 639.538 -> 640k)
                                    const roundedK = Math.round(
                                      Math.abs(debt) / 1000,
                                    );
                                    if (debt > 0)
                                      owesMe.push(`- ${p.name} ${roundedK}k`);
                                    else iOwe.push(`- ${p.name} ${roundedK}k`);
                                  }
                                });

                              if (owesMe.length === 0 && iOwe.length === 0) {
                                showToast(
                                  "Chưa có công nợ nào để copy!",
                                  "info",
                                );
                                return;
                              }

                              let text = "";
                              if (owesMe.length > 0)
                                text += "Cần thu:\n" + owesMe.join("\n");
                              if (owesMe.length > 0 && iOwe.length > 0)
                                text += "\n\n";
                              if (iOwe.length > 0)
                                text += "Cần trả:\n" + iOwe.join("\n");

                              navigator.clipboard.writeText(text).then(() => {
                                showToast("Đã copy danh sách nợ!", "success");
                              });
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-[11px] font-bold text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm active:scale-95"
                          >
                            <Copy size={14} /> Copy Bill
                          </button>
                        </div>

                        <div className="flex overflow-x-auto gap-3 px-4 pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none'] snap-x">
                          <div
                            onClick={() => setActiveTab("people")}
                            className="bg-gray-50 px-4 py-2 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1.5 snap-center cursor-pointer hover:border-indigo-300 shrink-0"
                          >
                            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-gray-400 shadow-sm shrink-0">
                              <Plus size={16} />
                            </div>
                            <span className="text-[10px] font-bold text-gray-400 whitespace-nowrap">
                              Thêm người
                            </span>
                          </div>
                          {/* Thẻ Công Nợ */}
                          {/* 2. FIX LOGIC: Gộp chung việc tính nợ vào mảng trước để không phải tính lại 2 lần */}
                          {activeDebtorsList.map((person) => {
                            return (
                              <div
                                key={person.id}
                                onClick={() => setSelectedPersonId(person.id)}
                                className="min-w-[125px] bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center gap-2 relative snap-center transform-gpu cursor-pointer hover:shadow-md"
                              >
                                {/* NÚT BUZZ */}
                                {person.debt > 0 && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleBuzz(person);
                                    }}
                                    // Đổi active:scale-110 thành active:bg-yellow-100 để có phản hồi chạm mà không làm sai lệch layout
                                    className="absolute top-2 right-2 text-yellow-600 bg-yellow-50 p-1.5 rounded-full hover:bg-yellow-200 active:bg-yellow-100 transition-colors shadow-sm z-10"
                                  >
                                    <Bell size={14} className="fill-current" />
                                  </button>
                                )}

                                {/* NÚT CHECK (SETTLE) */}
                                {person.debt > 0 && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSettleAll(person);
                                    }}
                                    className="absolute top-2 left-2 text-teal-600 bg-teal-50 p-1.5 rounded-full hover:bg-emerald-200 active:bg-teal-100 transition-colors shadow-sm z-10"
                                    title="Xác nhận người này đã trả hết tiền cho tôi"
                                  >
                                    <Check size={14} strokeWidth={3} />
                                  </button>
                                )}

                                {person.photoURL ? (
                                  <img
                                    src={person.photoURL}
                                    alt={person.name}
                                    className="w-10 h-10 rounded-full object-cover shadow-sm border border-gray-100 shrink-0"
                                  />
                                ) : (
                                  <Avatar
                                    name={person.name}
                                    src={person.photoURL}
                                    size="md"
                                  />
                                )}
                                <div className="text-center w-full mt-1">
                                  <p className="font-bold text-gray-800  truncate w-full mb-1.5">
                                    {person.name}
                                  </p>
                                  <span
                                    className={`text-[11px] font-black px-2 py-1 rounded-lg block mx-auto w-max border ${
                                      person.debt >= 0
                                        ? "bg-teal-50 text-teal-600 border-teal-100"
                                        : "bg-rose-50 text-rose-500 border-rose-100"
                                    }`}
                                  >
                                    {formatCurrency(Math.abs(person.debt))}
                                  </span>
                                </div>
                                <span
                                  className={`text-[9px] font-bold uppercase tracking-wider mt-1 px-1.5 py-0.5 rounded-md ${
                                    person.debt >= 0
                                      ? "bg-teal-50 text-teal-600"
                                      : "bg-violet-50/50 text-indigo-600"
                                  }`}
                                >
                                  {person.debt >= 0 ? "Nợ tôi" : "Tôi nợ"}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* LỊCH SỬ GIAO DỊCH (SCROLL TỰ NHIÊN) */}
                      <div className="bg-white p-4 rounded-[1.5rem] shadow-sm shrink-0 flex flex-col mb-4">
                        <div className="flex justify-between items-center mb-4 px-1 shrink-0">
                          <h3 className="font-bold text-gray-700 text-[11px] uppercase">
                            Giao dịch mới
                          </h3>
                          <button
                            onClick={() => setIsHistoryModalOpen(true)}
                            className="text-indigo-600 text-[11px] font-bold flex items-center gap-0.5"
                          >
                            Xem tất cả <ChevronRight size={12} />
                          </button>
                        </div>

                        <div>
                          {expenses.length === 0 ? (
                            <div className="text-center py-6 text-gray-300 flex flex-col items-center">
                              <div className="text-4xl mb-2 animate-bounce">
                                👻
                              </div>
                              <h3 className="font-bold text-gray-700 text-base md:text-sm mb-1">
                                Trống trơn!
                              </h3>
                              <p className="text-[11px] text-gray-400">
                                Chưa có khoản chi nào cả.
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-0">
                              {expenses
                                .filter(
                                  (exp) =>
                                    exp.payerId === user?.uid ||
                                    exp.sharedWith.includes(user?.uid),
                                )
                                .sort(
                                  (a, b) => new Date(b.date) - new Date(a.date),
                                )
                                .slice(0, visibleHistoryCount) // Chỉ render ~30 mục cho nhẹ
                                .map((exp) => renderHistoryItem(exp, true))}
                              {/* NÚT TẢI THÊM - DESKTOP */}
                              {/* NÚT TẢI THÊM - DESKTOP (ĐÃ SỬA KHOẢNG CÁCH) */}
                              {expenses.length > visibleHistoryCount && (
                                <div className="col-span-1 md:col-span-2 w-full pt-8 pb-6 mt-2 flex justify-center border-t border-gray-100/60">
                                  <button
                                    onClick={() =>
                                      setVisibleHistoryCount(
                                        (prev) => prev + 20,
                                      )
                                    }
                                    className="px-8 py-2.5 bg-white border border-indigo-200 text-indigo-600 font-bold rounded-full hover:bg-indigo-50 active:scale-95 transition-all shadow-sm flex items-center gap-2"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      width="18"
                                      height="18"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <path d="m6 9 6 6 6-6" />
                                    </svg>
                                    Xem thêm lịch sử cũ
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* POPUP CHI TIẾT THÀNH VIÊN MOBILE (Đã tích hợp Vuốt nảy bám ngón tay chuẩn iOS) */}
              <AnimatePresence>
                {selectedPersonId && (
                  <motion.div
                    initial={{ x: "100%" }}
                    animate={{ x: 0 }}
                    exit={{ x: "100%" }}
                    // Tinh chỉnh lại lò xo mượt hơn, giống lật trang sách hơn
                    transition={{
                      type: "spring",
                      damping: 25,
                      stiffness: 250,
                      mass: 0.8,
                    }}
                    // --- CHẾ ĐỘ VUỐT 1:1 CHUẨN IOS ---
                    drag="x"
                    dragDirectionLock
                    // Giữ mỏ neo ở tọa độ 0
                    dragConstraints={{ left: 0, right: 0 }}
                    // Ma thuật nằm ở đây: right: 1 nghĩa là KHÔNG có lực cản khi kéo sang phải (tay đi bao nhiêu hình đi bấy nhiêu)
                    dragElastic={{ left: 0, right: 1 }}
                    onDragEnd={(e, info) => {
                      // Nếu kéo qua 120px (khoảng 1/3 màn hình) HOẶC vuốt nhanh thì lật trang (thoát)
                      if (info.offset.x > 120 || info.velocity.x > 400) {
                        setSelectedPersonId(null);
                      }
                      // Nếu nhả tay mà khoảng cách < 120px, Framer Motion sẽ TỰ ĐỘNG hút giao diện về lại tọa độ animate={{ x: 0 }}
                    }}
                    className="fixed inset-0 z-50 bg-white flex flex-col shadow-[-10px_0_30px_rgba(0,0,0,0.1)] pt-[env(safe-area-inset-top)]"
                  >
                    style=
                    {{
                      paddingTop: "max(18px, env(safe-area-inset-top))",
                    }}
                    >
                    <div className="p-4 border-b border-gray-100 flex items-center gap-3">
                      <button
                        onClick={() => setSelectedPersonId(null)}
                        className="p-2 bg-gray-100 rounded-full shrink-0"
                      >
                        <ChevronLeft className="text-gray-600" size={24} />
                      </button>
                      <span className="font-bold text-lg truncate flex-1 text-gray-800">
                        Chi tiết công nợ{" "}
                        <span className="text-indigo-600">
                          {groupId
                            ? `- ${
                                myGroups?.find((g) => g.id === groupId)?.name ||
                                "Nhóm"
                              }`
                            : "(Tất cả)"}
                        </span>
                      </span>
                    </div>
                    {(() => {
                      // 1. Tự động tìm người ở mọi nơi (trong nhóm cụ thể hoặc ngoài tổng quan)
                      const p =
                        people.find((item) => item.id === selectedPersonId) ||
                        globalFriendStats.find(
                          (item) => item.id === selectedPersonId,
                        ) ||
                        contacts.find((item) => item.id === selectedPersonId);

                      if (!p) return null;

                      // 2. Tự động chuyển đổi nguồn dữ liệu: Trong nhóm lấy expenses, ở ngoài lấy globalHistory
                      // 2. Tự động chuyển đổi nguồn dữ liệu: Trong nhóm lấy expenses, ở ngoài lấy globalFriendStats
                      const sourceExpenses = groupId ? expenses : globalHistory;
                      const debt = groupId
                        ? calculateNetDebt(p.id)
                        : globalFriendStats.find(
                            (f) => f.id === selectedPersonId,
                          )?.amount || 0;

                      // 3. Lọc đúng giao dịch liên quan (CHỈ LẤY KHOẢN CHƯA TRẢ TIỀN)
                      const related = sourceExpenses.filter((e) => {
                        const iPaid =
                          (e.payerId === user?.uid || e.payerId === "me") &&
                          (e.sharedWith || []).includes(p.id);
                        const theyPaid =
                          e.payerId === p.id &&
                          ((e.sharedWith || []).includes(user?.uid) ||
                            (e.sharedWith || []).includes("me"));

                        if (iPaid) return !(e.settledBy || []).includes(p.id);
                        if (theyPaid)
                          return (
                            !(e.settledBy || []).includes(user?.uid) &&
                            !(e.settledBy || []).includes("me")
                          );
                        return false;
                      });

                      // >>> BỔ SUNG ĐOẠN GOM NHÓM NÀY VÀO ĐÂY <<<
                      const groupedExpenses = {};
                      related.forEach((e) => {
                        const gName =
                          e.groupName ||
                          myGroups?.find((g) => g.id === e.groupId)?.name ||
                          "Giao dịch cá nhân";
                        if (!groupedExpenses[gName]) {
                          groupedExpenses[gName] = [];
                        }
                        groupedExpenses[gName].push(e);
                      });
                      // >>> KẾT THÚC BỔ SUNG <<<

                      return (
                        <div className="flex-1 overflow-y-auto p-6 bg-gray-50 custom-scrollbar">
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
                                  className="flex items-center gap-2 px-4 py-2 bg-teal-500 text-white rounded-xl font-bold shadow-md active:scale-95"
                                >
                                  <Check size={18} /> Xác nhận trả
                                </button>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between mb-4 mt-6">
                            <h3 className="font-bold text-gray-500 text-xs uppercase flex items-center gap-2">
                              <History size={14} /> Lịch sử chung (
                              {related.length})
                            </h3>
                          </div>

                          <div className="space-y-5 pb-10">
                            {Object.keys(groupedExpenses).length === 0 ? (
                              <p className="text-center text-gray-400 italic text-sm py-4">
                                Chưa có giao dịch chung nào.
                              </p>
                            ) : (
                              Object.entries(groupedExpenses).map(
                                ([groupName, exps]) => (
                                  <div
                                    key={groupName}
                                    className="bg-white p-4 rounded-[1.5rem] shadow-sm border border-gray-100"
                                  >
                                    {/* TIÊU ĐỀ NHÓM (VD: Tháng 2, Tháng 3) */}
                                    <div className="flex items-center gap-2 mb-4 px-1">
                                      <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]"></div>
                                      <h4 className="font-black text-gray-800 text-base">
                                        {groupName}
                                      </h4>
                                      <span className="text-[10px] font-bold text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-md ml-auto">
                                        {exps.length} giao dịch
                                      </span>
                                    </div>

                                    {/* DANH SÁCH GIAO DỊCH CỦA NHÓM ĐÓ */}
                                    <div className="space-y-0">
                                      {exps
                                        .sort(
                                          (a, b) =>
                                            new Date(b.date) - new Date(a.date),
                                        )
                                        // QUAN TRỌNG: Gọi hàm render và truyền p.id vào để card biết đang xem nợ của ai
                                        .map((e) =>
                                          renderHistoryItem(e, true, p.id),
                                        )}
                                    </div>
                                  </div>
                                ),
                              )
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* 3. BOTTOM NAVIGATION (Phong cách Super App MoMo - ĐÃ CÂN BẰNG TUYỆT ĐỐI) */}
            {!selectedPersonId && (
              <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 shadow-lg border-t border-gray-100 pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                {/* Dùng grid 3 cột để đảm bảo các nút tự động chia đều không gian */}
                <div className="grid grid-cols-3 items-center h-16 relative max-w-md mx-auto">
                  {/* NÚT HOME (BÊN TRÁI) */}
                  <button
                    onClick={() => {
                      setGroupId(""); // Xóa ID nhóm hiện tại để thoát ra ngoài
                      setIsGroupMode(false); // Tắt chế độ đang xem nhóm
                      setActiveTab("dashboard"); // Chuyển về tab Tổng quan toàn cục
                    }}
                    className={`flex flex-col items-center justify-center gap-1 h-full w-full transition-colors active:scale-95 ${
                      activeTab === "dashboard" && !groupId
                        ? "text-indigo-600"
                        : "text-gray-400 hover:text-indigo-400"
                    }`}
                  >
                    <Home
                      size={24}
                      strokeWidth={
                        activeTab === "dashboard" && !groupId ? 2.5 : 2
                      }
                      className={
                        activeTab === "dashboard" && !groupId
                          ? "-translate-y-1 transition-transform"
                          : "transition-transform"
                      }
                    />
                    <span className="text-[10px] font-bold">Home</span>
                  </button>

                  {/* NÚT CỘNG NỔI FAB (Ở GIỮA) - ĐÃ PHÓNG TO */}
                  <div className="flex justify-center h-full relative">
                    <button
                      onClick={
                        groupId
                          ? openAddModal
                          : () => setIsCreateGroupModalOpen(true)
                      }
                      className="absolute -top-7 w-16 h-16 bg-gradient-to-tr from-indigo-600 to-violet-500 rounded-full text-white flex items-center justify-center active:scale-90 transition-transform border-4 border-white shadow-xl z-50"
                    >
                      <Plus size={32} strokeWidth={2.5} />
                    </button>
                  </div>

                  {/* NÚT FRIEND/NHÓM (BÊN PHẢI) */}
                  <button
                    onClick={() => setActiveTab("people")}
                    className={`flex flex-col items-center justify-center gap-1 h-full w-full transition-colors active:scale-95 ${
                      activeTab === "people"
                        ? "text-indigo-600"
                        : "text-gray-400 hover:text-indigo-400"
                    }`}
                  >
                    <Users
                      size={24}
                      strokeWidth={activeTab === "people" ? 2.5 : 2}
                      className={
                        activeTab === "people"
                          ? "-translate-y-1 transition-transform"
                          : "transition-transform"
                      }
                    />
                    <span className="text-[10px] font-bold">
                      {groupId ? "Nhóm" : "Friend"}
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
          <div className="flex-1 overflow-hidden p-8 w-full min-w-0">
            {/* ========================================================
              TRƯỜNG HỢP 1: GLOBAL VIEW (DANH BẠ & TỔNG QUAN)
              ======================================================== */}
            {!groupId ? (
              activeTab === "people" ? (
                // >>> 1.1: QUẢN LÝ DANH BẠ (THÊM BẠN MỚI TẠI ĐÂY) <<<
                <div className="h-full flex flex-col animate-fade-in">
                  <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <Users className="text-indigo-600" /> Danh bạ bạn bè
                  </h2>

                  {/* GIAO DIỆN TÌM KIẾM MẠNG XÃ HỘI */}
                  <div className="bg-white p-4 rounded-2xl mb-4 border border-gray-200 shadow-sm space-y-4">
                    {/* 1. Thêm nhanh người ảo */}
                    <div className="flex gap-2">
                      <input
                        value={newLocalContactName}
                        onChange={(e) => setNewLocalContactName(e.target.value)}
                        placeholder="Tạo bạn ảo (Không cần Email)..."
                        className="flex-1 p-3 rounded-xl bg-gray-50 border border-gray-200 text-base md:text-sm outline-none focus:border-indigo-500"
                      />
                      <button
                        onClick={handleAddLocalContact}
                        className="px-4 py-3 bg-violet-400 text-white rounded-xl text-base md:text-sm font-bold shadow-sm active:scale-95 shrink-0"
                      >
                        Tạo
                      </button>
                    </div>

                    <hr className="border-gray-100" />

                    {/* 2. Tìm kiếm trên mạng xã hội */}
                    <div className="flex gap-2">
                      <input
                        value={searchQuery}
                        // Chỉ cần lưu lại chữ người dùng gõ, Effect ở trên sẽ tự lo phần tìm kiếm
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Tìm kiếm Email hoặc Tên thật..."
                        className="flex-1 p-3 rounded-xl bg-gray-50 border border-gray-200 text-base md:text-sm outline-none focus:border-blue-500 transition-colors"
                      />
                      <button
                        onClick={searchNetwork}
                        disabled={isSearching || !searchQuery.trim()}
                        className="px-4 py-3 bg-indigo-500 text-white rounded-xl text-base md:text-sm font-bold shadow-sm active:scale-95 transition-all shrink-0 whitespace-nowrap disabled:opacity-50"
                      >
                        {/* Sửa ở đây: Xóa điều kiện, chỉ giữ lại chữ "Tìm" */}
                        Tìm
                      </button>
                    </div>

                    {/* HIỂN THỊ THÔNG BÁO LỖI (KHI KHÔNG TÌM THẤY) */}
                    {searchResults &&
                      searchResults.length > 0 &&
                      searchResults[0].id === "NOT_FOUND" && (
                        <div className="mt-4 p-4 text-center text-base md:text-sm font-bold text-rose-500 bg-rose-50 rounded-xl border border-rose-100 animate-fade-in shadow-sm">
                          Không tìm thấy tài khoản nào phù hợp!
                        </div>
                      )}

                    {/* HIỂN THỊ KẾT QUẢ TÌM KIẾM CHUẨN */}
                    {searchResults &&
                      searchResults.length > 0 &&
                      searchResults[0].id !== "NOT_FOUND" && (
                        <div className="mt-4 p-4 bg-violet-50/50 rounded-xl border border-blue-100 animate-fade-in">
                          <p className=" font-bold text-indigo-700 mb-3 uppercase">
                            Kết quả tìm kiếm ({searchResults.length})
                          </p>
                          <div className="space-y-2">
                            {searchResults.map((res) => {
                              const isFriend = contacts.some(
                                (c) => c.id === res.id,
                              );
                              return (
                                <div
                                  key={res.id}
                                  className="flex items-center gap-3 p-2 bg-white rounded-xl border border-blue-100 shadow-sm"
                                >
                                  <Avatar
                                    name={res.name}
                                    src={res.photoURL}
                                    size="md"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className="font-bold text-gray-800 text-base md:text-sm truncate">
                                      {res.name}
                                    </p>
                                    <p className=" text-gray-500 truncate">
                                      {res.email}
                                    </p>
                                  </div>
                                  {isFriend ? (
                                    <span className=" font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded">
                                      Đã kết bạn
                                    </span>
                                  ) : (
                                    <button
                                      onClick={() =>
                                        handleAddFriendFromSearch(res)
                                      }
                                      className="px-3 py-1.5 bg-indigo-500 text-white  font-bold rounded-lg shadow-sm"
                                    >
                                      Kết bạn
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                  </div>

                  {/* KHU VỰC HIỂN THỊ LỜI MỜI KẾT BẠN */}
                  {friendRequests?.length > 0 && (
                    <div className="mb-6 bg-amber-50/50/50 p-6 rounded-2xl border border-orange-100">
                      <p className="text-base md:text-sm font-bold text-orange-600 uppercase mb-4 flex items-center gap-2">
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
                              <p className=" text-gray-500 truncate">
                                {req.email}
                              </p>
                            </div>
                            <div className="flex flex-col gap-1 shrink-0">
                              <button
                                onClick={() => handleAcceptRequest(req)}
                                className="px-3 py-1.5 bg-indigo-500 text-white  font-bold rounded-lg shadow-sm active:scale-95"
                              >
                                Chấp nhận
                              </button>
                              <button
                                onClick={() => handleDeclineRequest(req.id)}
                                className="px-3 py-1.5 bg-gray-100 text-gray-600  font-bold rounded-lg shadow-sm active:scale-95"
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
                      <p className="text-base md:text-sm text-gray-500">
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
                                  <p className=" text-gray-400 truncate">
                                    {contact.email}
                                  </p>
                                ) : (
                                  <p className=" text-orange-400 italic">
                                    Chưa có email
                                  </p>
                                )}
                              </div>

                              {/* Nút Sửa (Hiện khi hover - MỚI) */}
                              {/* Nút Sửa và Xóa (Hiện khi hover - MỚI) */}
                              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all flex gap-2">
                                <button
                                  onClick={() => setEditingContact(contact)}
                                  className="p-2 bg-white text-gray-400 hover:text-indigo-600 rounded-lg shadow-sm hover:scale-110 transition-all"
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
                <div className="h-full flex flex-col animate-fade-in">
                  {selectedPersonId ? (
                    // --- NẾU CÓ CHỌN NGƯỜI -> HIỂN THỊ CHI TIẾT CÔNG NỢ TOÀN CỤC ---
                    <div className="h-full bg-white rounded-[2rem] shadow-sm border border-gray-200 flex flex-col relative overflow-hidden animate-slide-up">
                      <div className="p-6 border-b flex justify-between items-center bg-gray-50">
                        <h2 className="font-bold text-xl text-gray-700">
                          Chi tiết công nợ (Tất cả)
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
                          const p =
                            globalFriendStats.find(
                              (item) => item.id === selectedPersonId,
                            ) ||
                            contacts.find(
                              (item) => item.id === selectedPersonId,
                            );
                          if (!p) return null;

                          const debt = p.amount || 0;
                          // Lọc lịch sử: Chỉ lấy các khoản CHƯA TRẢ TIỀN giữa Tôi và Nỏ
                          const related = globalHistory.filter((e) => {
                            // TÔI trả tiền, NÓ tham gia
                            const iPaid =
                              (e.payerId === user?.uid || e.payerId === "me") &&
                              (e.sharedWith || []).includes(p.id);
                            // NÓ trả tiền, TÔI tham gia
                            const theyPaid =
                              e.payerId === p.id &&
                              ((e.sharedWith || []).includes(user?.uid) ||
                                (e.sharedWith || []).includes("me"));

                            if (iPaid) {
                              // NÓ chưa trả cho TÔI thì hiện
                              return !(e.settledBy || []).includes(p.id);
                            }
                            if (theyPaid) {
                              // TÔI chưa trả cho NÓ thì hiện
                              return (
                                !(e.settledBy || []).includes(user?.uid) &&
                                !(e.settledBy || []).includes("me")
                              );
                            }
                            return false;
                          });

                          const groupedExpenses = {};
                          related.forEach((e) => {
                            const gName =
                              e.groupName ||
                              myGroups?.find((g) => g.id === e.groupId)?.name ||
                              "Giao dịch cá nhân";
                            if (!groupedExpenses[gName])
                              groupedExpenses[gName] = [];
                            groupedExpenses[gName].push(e);
                          });

                          return (
                            <div className="max-w-3xl mx-auto">
                              <div className="flex items-center gap-8 mb-10 p-8 bg-gray-50/80 rounded-[2rem] border border-gray-100 relative">
                                <Avatar
                                  name={p.name}
                                  size="lg"
                                  src={p.avatar || p.photoURL}
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
                                      ? `Nợ tôi: ${formatCompactCurrency(debt)}`
                                      : `Tôi nợ: ${formatCompactCurrency(
                                          Math.abs(debt),
                                        )}`}
                                  </div>
                                </div>
                              </div>
                              <h3 className="font-bold text-gray-400 text-base md:text-sm uppercase mb-6 flex items-center gap-4">
                                <span className="bg-gray-200 h-px flex-1"></span>{" "}
                                Lịch sử chung ({related.length}){" "}
                                <span className="bg-gray-200 h-px flex-1"></span>
                              </h3>
                              <div className="space-y-5 pb-10">
                                {Object.keys(groupedExpenses).length === 0 ? (
                                  <p className="text-center text-gray-400 italic text-sm py-4">
                                    Chưa có giao dịch chung nào.
                                  </p>
                                ) : (
                                  Object.entries(groupedExpenses).map(
                                    ([groupName, exps]) => (
                                      <div
                                        key={groupName}
                                        className="bg-white p-4 rounded-[1.5rem] shadow-sm border border-gray-100"
                                      >
                                        <div className="flex items-center gap-2 mb-4 px-1">
                                          <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]"></div>
                                          <h4 className="font-black text-gray-800 text-base">
                                            {groupName}
                                          </h4>
                                          <span className="text-[10px] font-bold text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-md ml-auto">
                                            {exps.length} giao dịch
                                          </span>
                                        </div>
                                        <div className="space-y-0">
                                          {exps
                                            .sort(
                                              (a, b) =>
                                                new Date(b.date) -
                                                new Date(a.date),
                                            )
                                            .map((e) =>
                                              renderHistoryItem(e, false, p.id),
                                            )}
                                        </div>
                                      </div>
                                    ),
                                  )
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  ) : (
                    // --- NẾU KHÔNG BẤM AI -> GIỮ NGUYÊN CODE TỔNG QUAN CŨ CỦA BẠN CHỖ NÀY ---
                    // 1. Thêm flex flex-col và min-h-0 vào Fragment ảo (<>)
                    <div className="flex flex-col h-full min-h-0">
                      <h2 className="text-2xl font-bold text-gray-800 mb-6 shrink-0">
                        Tổng quan tài chính
                      </h2>

                      {loadingGlobal ? (
                        <div className="text-gray-500 italic shrink-0">
                          Đang tải dữ liệu...
                        </div>
                      ) : (
                        // 2. Thêm flex flex-col min-h-0 vào div bọc nội dung
                        <div className="flex-1 overflow-hidden pr-2 flex flex-col min-h-0">
                          {/* 3 CARD STATS (Phong cách MoMo Desktop) */}
                          {/* 3. Thêm shrink-0 để 3 thẻ này không bị bóp méo khi màn hình nhỏ */}
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 shrink-0">
                            {/* Thẻ Tài sản ròng */}
                            <div className="bg-gradient-to-br from-indigo-600 to-violet-500 rounded-3xl p-6 text-white shadow-lg shadow-indigo-200/50 relative overflow-hidden flex flex-col justify-center min-h-[150px]">
                              <div className="absolute top-[-20px] right-[-20px] w-32 h-32 bg-white/20 rounded-full blur-2xl"></div>
                              <div className="absolute bottom-[-20px] left-[-20px] w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
                              <p className="opacity-90 text-base md:text-sm font-bold uppercase mb-2 relative z-10 flex items-center gap-2">
                                <Wallet size={16} /> Tài sản ròng
                              </p>
                              <h3
                                className="text-4xl font-extrabold tracking-tight relative z-10 truncate drop-shadow-md"
                                title={formatCurrency(globalStats.netWorth)}
                              >
                                {formatCompactCurrency(globalStats.netWorth)}
                              </h3>
                            </div>

                            {/* Thẻ Cần Thu */}
                            <div className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 flex flex-col justify-center min-h-[150px] relative overflow-hidden group">
                              <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                <TrendingUp
                                  size={20}
                                  className="text-teal-600"
                                />
                              </div>
                              <p className="text-gray-400 font-bold  uppercase mb-1">
                                Tiền nhận về
                              </p>
                              <h3
                                className="text-3xl font-extrabold text-teal-600 truncate"
                                title={formatCurrency(globalStats.totalOwed)}
                              >
                                {formatCompactCurrency(globalStats.totalOwed)}
                              </h3>
                            </div>

                            {/* Thẻ Cần Trả */}
                            <div className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 flex flex-col justify-center min-h-[150px] relative overflow-hidden group">
                              <div className="w-10 h-10 rounded-full bg-amber-50/50 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                <TrendingDown
                                  size={20}
                                  className="text-orange-500"
                                />
                              </div>
                              <p className="text-gray-400 font-bold  uppercase mb-1">
                                Tiền phải trả
                              </p>
                              <h3
                                className="text-3xl font-extrabold text-orange-600 truncate"
                                title={formatCurrency(globalStats.totalDebt)}
                              >
                                {formatCompactCurrency(globalStats.totalDebt)}
                              </h3>
                            </div>
                          </div>

                          {/* LIST CHI TIẾT NỢ TOÀN CỤC */}
                          {/* --- KHU VỰC DASHBOARD 2 CỘT (UI/UX CAO CẤP) --- */}
                          {/* 4. Thêm flex-1 min-h-0 vào lưới 2 cột, XÓA mb-8 thay bằng pb-4 */}
                          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 lg:gap-8 pb-4 items-stretch flex-1 min-h-0">
                            {/* ================= CỘT 1: CHI TIẾT CÔNG NỢ ================= */}
                            {/* 5. XÓA h-[500px] xl:h-[75vh], THAY BẰNG h-full */}
                            <div className="xl:col-span-2 bg-white rounded-[2rem] p-6 lg:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col h-[500px] lg:h-[68vh]">
                              {/* ... GIỮ NGUYÊN TOÀN BỘ NỘI DUNG CỘT 1 Ở ĐÂY ... */}
                              <div className="flex justify-between items-center mb-6 pb-5 border-b border-slate-100/80 shrink-0">
                                <div className="flex items-center gap-3.5">
                                  <div className="p-2.5 bg-blue-50 rounded-2xl text-blue-500 shadow-inner">
                                    <Users size={20} strokeWidth={2.5} />
                                  </div>
                                  <div>
                                    <h3 className="font-bold text-slate-800 text-lg">
                                      Chi tiết công nợ
                                    </h3>
                                    <p className="text-xs font-medium text-slate-400 mt-0.5">
                                      Tất cả các nhóm
                                    </p>
                                  </div>
                                </div>
                                <button
                                  onClick={() => {
                                    /* Copy logic */
                                  }}
                                  className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-[13px] text-slate-600 hover:bg-white hover:text-blue-600 hover:border-blue-200 hover:shadow-sm transition-all active:scale-95"
                                >
                                  <Copy size={14} />{" "}
                                  <span className="hidden sm:inline">
                                    Copy Bill
                                  </span>
                                </button>
                              </div>
                              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 -mr-2 space-y-3">
                                {globalFriendStats.length === 0 ? (
                                  <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                                    <div className="bg-slate-50 p-4 rounded-full mb-3">
                                      <Users
                                        size={32}
                                        className="text-slate-300"
                                      />
                                    </div>
                                    <p className="text-sm font-medium">
                                      Bạn đã thanh toán xong với mọi người!
                                    </p>
                                  </div>
                                ) : (
                                  globalFriendStats.map((item, idx) => (
                                    <div
                                      key={idx}
                                      onClick={() =>
                                        setSelectedPersonId(item.id)
                                      }
                                      className="group flex justify-between items-center p-3.5 bg-white hover:bg-slate-50/80 rounded-2xl transition-all duration-300 border border-slate-100 hover:border-blue-100 hover:shadow-[0_4px_12px_rgb(0,0,0,0.03)] cursor-pointer active:scale-[0.98]"
                                    >
                                      <div className="flex items-center gap-3.5">
                                        <Avatar
                                          name={item.name}
                                          size="md"
                                          src={item.avatar}
                                        />
                                        <div className="flex flex-col">
                                          <p className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                                            {item.name}
                                          </p>
                                          {item.email && (
                                            <p className="text-[11px] font-medium text-slate-400">
                                              {item.email}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                      <div
                                        className={`px-3 py-1.5 rounded-xl font-bold text-sm tracking-wide shadow-sm ${
                                          item.amount >= 0
                                            ? "bg-teal-50 text-teal-700 border border-teal-100/50"
                                            : "bg-rose-50 text-rose-600 border border-rose-100/50"
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
                            {/* ================= KẾT THÚC CỘT 1 ================= */}

                            {/* ================= CỘT 2: HOẠT ĐỘNG GẦN ĐÂY ================= */}
                            {/* 6. XÓA h-[500px] xl:h-[75vh], THAY BẰNG h-full */}
                            <div className="xl:col-span-3 bg-white rounded-[2rem] p-6 lg:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col h-[500px] lg:h-[68vh]">
                              {/* ... GIỮ NGUYÊN TOÀN BỘ NỘI DUNG CỘT 2 Ở ĐÂY ... */}
                              <div className="flex justify-between items-center mb-6 pb-5 border-b border-slate-100/80 shrink-0">
                                <div className="flex items-center gap-3.5">
                                  <div className="p-2.5 bg-violet-50 rounded-2xl text-violet-500 shadow-inner">
                                    <History size={20} strokeWidth={2.5} />
                                  </div>
                                  <div>
                                    <h3 className="font-bold text-slate-800 text-lg">
                                      Hoạt động gần đây
                                    </h3>
                                    <p className="text-xs font-medium text-slate-400 mt-0.5">
                                      Theo thời gian thực
                                    </p>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => setIsHistoryModalOpen(true)}
                                    className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-slate-50 text-slate-600 rounded-xl font-bold text-[13px] hover:bg-white hover:shadow-sm transition-all border border-slate-200 active:scale-95"
                                  >
                                    Tất cả <ChevronRight size={14} />
                                  </button>
                                  <button
                                    onClick={() =>
                                      setIsCreateGroupModalOpen(true)
                                    }
                                    className="flex items-center gap-1.5 px-3 py-2 bg-violet-50 text-violet-600 rounded-xl font-bold text-[13px] hover:bg-violet-100 hover:shadow-sm transition-all border border-violet-100 active:scale-95"
                                  >
                                    <Plus size={14} /> Tạo nhóm
                                  </button>
                                </div>
                              </div>
                              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 -mr-2">
                                {globalHistory.length === 0 ? (
                                  <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                                    <div className="bg-slate-50 p-4 rounded-full mb-3">
                                      <History
                                        size={32}
                                        className="text-slate-300"
                                      />
                                    </div>
                                    <p className="text-sm font-medium">
                                      Chưa có giao dịch nào.
                                    </p>
                                  </div>
                                ) : (
                                  <div className="space-y-3">
                                    {globalHistory
                                      .slice(0, 10)
                                      .map((item, idx) => (
                                        <div
                                          key={`${item.id}_${idx}`}
                                          className="transform-gpu transition-all duration-300 hover:-translate-y-0.5"
                                        >
                                          {renderHistoryItem(item)}
                                        </div>
                                      ))}
                                    {globalHistory.length > 10 && (
                                      <div className="pt-4 pb-2 flex justify-center">
                                        <button
                                          onClick={() =>
                                            setIsHistoryModalOpen(true)
                                          }
                                          className="text-[13px] font-bold text-slate-500 bg-slate-50 border border-slate-100 hover:bg-slate-100 hover:text-slate-700 px-5 py-2 rounded-xl transition-colors active:scale-95"
                                        >
                                          Xem thêm {globalHistory.length - 10}{" "}
                                          giao dịch...
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                            {/* ================= KẾT THÚC CỘT 2 ================= */}
                          </div>
                        </div>
                      )}
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
                    <p className=" text-gray-400 font-mono mt-1">
                      ID: {groupId}
                    </p>
                  </div>
                  {/* TAB SWITCHER */}
                  {!selectedPersonId && (
                    <div className="flex bg-gray-100 p-1 rounded-xl">
                      <button
                        onClick={() => setActiveTab("dashboard")}
                        className={`px-5 py-2.5 rounded-lg text-base md:text-sm font-bold transition-all flex items-center gap-2 ${
                          activeTab === "dashboard"
                            ? "bg-white shadow text-indigo-600"
                            : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        <LayoutDashboard size={18} /> Tổng quan
                      </button>
                      <button
                        onClick={() => setActiveTab("people")}
                        className={`px-5 py-2.5 rounded-lg text-base md:text-sm font-bold transition-all flex items-center gap-2 ${
                          activeTab === "people"
                            ? "bg-white shadow text-indigo-600"
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
                          // Lọc lịch sử: Chỉ lấy các khoản CHƯA TRẢ TIỀN
                          const related = expenses.filter((e) => {
                            const iPaid =
                              (e.payerId === user?.uid || e.payerId === "me") &&
                              (e.sharedWith || []).includes(p.id);
                            const theyPaid =
                              e.payerId === p.id &&
                              ((e.sharedWith || []).includes(user?.uid) ||
                                (e.sharedWith || []).includes("me"));

                            if (iPaid)
                              return !(e.settledBy || []).includes(p.id);
                            if (theyPaid)
                              return (
                                !(e.settledBy || []).includes(user?.uid) &&
                                !(e.settledBy || []).includes("me")
                              );
                            return false;
                          });
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
                              <h3 className="font-bold text-gray-400 text-base md:text-sm uppercase mb-6 flex items-center gap-4">
                                <span className="bg-gray-200 h-px flex-1"></span>{" "}
                                Lịch sử chung ({related.length}){" "}
                                <span className="bg-gray-200 h-px flex-1"></span>
                              </h3>
                              {(() => {
                                const groupedExpenses = {};
                                related.forEach((e) => {
                                  const gName =
                                    e.groupName ||
                                    myGroups?.find((g) => g.id === e.groupId)
                                      ?.name ||
                                    "Giao dịch cá nhân";
                                  if (!groupedExpenses[gName]) {
                                    groupedExpenses[gName] = [];
                                  }
                                  groupedExpenses[gName].push(e);
                                });

                                return (
                                  <div className="space-y-5 pb-10">
                                    {Object.keys(groupedExpenses).length ===
                                    0 ? (
                                      <p className="text-center text-gray-400 italic text-sm py-4">
                                        Chưa có giao dịch chung nào.
                                      </p>
                                    ) : (
                                      Object.entries(groupedExpenses).map(
                                        ([groupName, exps]) => (
                                          <div
                                            key={groupName}
                                            className="bg-white p-4 rounded-[1.5rem] shadow-sm border border-gray-100"
                                          >
                                            <div className="flex items-center gap-2 mb-4 px-1">
                                              <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]"></div>
                                              <h4 className="font-black text-gray-800 text-base">
                                                {groupName}
                                              </h4>
                                              <span className="text-[10px] font-bold text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-md ml-auto">
                                                {exps.length} giao dịch
                                              </span>
                                            </div>
                                            <div className="space-y-0">
                                              {exps
                                                .sort(
                                                  (a, b) =>
                                                    new Date(b.date) -
                                                    new Date(a.date),
                                                )
                                                .map((e) =>
                                                  renderHistoryItem(e, false),
                                                )}
                                            </div>
                                          </div>
                                        ),
                                      )
                                    )}
                                  </div>
                                );
                              })()}
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
                        <div className="bg-violet-50/50 p-6 rounded-2xl border border-blue-100">
                          <h3 className="font-bold text-indigo-700 mb-4 flex items-center gap-2">
                            <Plus size={20} /> Thêm thành viên từ Danh bạ
                          </h3>

                          {contacts.length === 0 ? (
                            <p className="text-base md:text-sm text-gray-500 italic">
                              Danh bạ trống. Hãy ra ngoài "Danh bạ bạn bè" để
                              thêm trước.
                            </p>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {/* Thông báo nếu đã thêm hết */}
                              {contacts.filter(
                                (c) => !people.some((p) => p.id === c.id),
                              ).length === 0 && (
                                <p className="text-base md:text-sm text-gray-500 italic">
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
                                    className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-violet-100 shadow-sm hover:shadow-md hover:border-blue-500 hover:text-indigo-600 transition-all text-base md:text-sm font-bold text-gray-700"
                                  >
                                    <Avatar name={contact.name} size="sm" />
                                    {contact.name}
                                    <Plus size={14} className="ml-1" />
                                  </button>
                                ))}
                            </div>
                          )}
                          <div className="mt-4 pt-4 border-t border-blue-100">
                            <p className=" text-blue-400 italic">
                              * Muốn thêm người mới hoàn toàn? Hãy quay lại tab
                              "Danh bạ bạn bè" ở ngoài trang chủ.
                            </p>
                          </div>
                        </div>

                        <h3 className="font-bold text-xl text-gray-800 flex items-center gap-2">
                          Thành viên hiện tại{" "}
                          <span className="text-base md:text-sm bg-gray-100 text-gray-500 px-2 py-1 rounded-lg">
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
                                  <Avatar
                                    name={p.name}
                                    src={p.photoURL}
                                    size="md"
                                  />
                                )}
                                <div>
                                  <div className="font-bold text-lg text-gray-700">
                                    {p.name}
                                  </div>
                                  {p.email && (
                                    <div className="text-base md:text-sm text-gray-400">
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
                          <div className="flex justify-between items-center mb-3 shrink-0">
                            <h2 className="font-bold text-gray-700 flex items-center gap-2 text-base">
                              <Users size={18} className="text-blue-500" /> Bảng
                              công nợ
                            </h2>

                            <button
                              onClick={() => {
                                let owesMe = [];
                                let iOwe = [];

                                sortedPeople
                                  .filter((p) => p.id !== user?.uid)
                                  .forEach((p) => {
                                    const debt = calculateNetDebt(p.id);
                                    if (debt !== 0) {
                                      // Làm tròn chia 1000 (Ví dụ: 639.538 -> 640k)
                                      const roundedK = Math.round(
                                        Math.abs(debt) / 1000,
                                      );
                                      if (debt > 0)
                                        owesMe.push(`- ${p.name} ${roundedK}k`);
                                      else
                                        iOwe.push(`- ${p.name} ${roundedK}k`);
                                    }
                                  });

                                if (owesMe.length === 0 && iOwe.length === 0) {
                                  showToast(
                                    "Chưa có công nợ nào để copy!",
                                    "info",
                                  );
                                  return;
                                }

                                let text = "";
                                if (owesMe.length > 0)
                                  text += "Cần thu:\n" + owesMe.join("\n");
                                if (owesMe.length > 0 && iOwe.length > 0)
                                  text += "\n\n";
                                if (iOwe.length > 0)
                                  text += "Cần trả:\n" + iOwe.join("\n");

                                navigator.clipboard.writeText(text).then(() => {
                                  showToast("Đã copy danh sách nợ!", "success");
                                });
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-xl  font-bold text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm active:scale-95"
                            >
                              <Copy size={14} /> Copy Bill
                            </button>
                          </div>
                          <div className="flex-1 overflow-y-auto px-2 pt-4 pb-10 -mx-2 custom-scrollbar">
                            <div className="grid grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
                              {/* LỌC BỎ CHÍNH MÌNH (user.uid) KHỎI GRID */}
                              {activeDebtorsList.map((person) => {
                                const debt = person.debt; // Lấy trực tiếp, không gọi hàm tính toán nữa
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
                                        className="absolute top-2 left-2 text-teal-600 bg-teal-50 p-1.5 rounded-full hover:bg-emerald-200 hover:scale-110 transition-all shadow-sm z-10"
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
                                    <p className="font-bold text-gray-800 text-base md:text-sm line-clamp-1 w-full px-1">
                                      {person.name}
                                    </p>
                                    <div
                                      className={`mt-1 font-extrabold text-lg tracking-tight ${
                                        debt >= 0
                                          ? "text-teal-600"
                                          : "text-indigo-600"
                                      }`}
                                    >
                                      {formatCurrency(Math.abs(debt))}
                                    </div>
                                    <span
                                      className={`text-[9px] font-bold uppercase tracking-wider mt-1 px-1.5 py-0.5 rounded-md ${
                                        debt >= 0
                                          ? "bg-teal-50 text-teal-600"
                                          : "bg-violet-50/50 text-indigo-600"
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
                                className="bg-gray-50 p-3 rounded-2xl border-2 border-dashed border-gray-300 cursor-pointer hover:border-blue-400 hover:bg-violet-50/50 transition-all flex flex-col items-center justify-center text-center group min-h-[120px]"
                              >
                                <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-400 group-hover:text-blue-500 mb-2 transition-colors">
                                  <Plus size={20} />
                                </div>
                                <span className=" font-bold text-gray-400 group-hover:text-indigo-600 transition-colors">
                                  Thêm thành viên
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        {/* Cột Stats */}
                        <div className="w-full md:w-64 xl:w-72 flex flex-col shrink-0">
                          <div className="bg-gradient-to-br from-indigo-600 to-violet-500 rounded-2xl p-5 text-white shadow-lg shadow-indigo-200/50/50 relative overflow-hidden h-full flex flex-col justify-center">
                            <div className="absolute top-[-50px] right-[-50px] w-48 h-48 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
                            <div className="mb-4 text-center md:text-left relative z-10">
                              <p className="opacity-80 font-bold  uppercase tracking-wider mb-1">
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
                              <div className="bg-white/10 p-3 rounded-xl  border border-white/10 flex items-center gap-3">
                                <div className="p-2 bg-teal-500/20 rounded-lg">
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
                              <div className="bg-white/10 p-3 rounded-xl  border border-white/10 flex items-center gap-3">
                                <div className="p-2 bg-violet-50/500/20 rounded-lg">
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
                            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg  font-bold text-gray-600 hover:bg-violet-50 hover:text-violet-600 transition-all shadow-sm"
                          >
                            <span>Xem tất cả ({expenses.length})</span>
                            <div className="bg-gray-100 p-1 rounded">
                              <ChevronRight size={12} />
                            </div>
                          </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-50/50 shadow-[inset_0_4px_20px_rgba(0,0,0,0.02)]">
                          {expenses.length === 0 && (
                            <div className="text-center text-gray-400 mt-10 text-base md:text-sm">
                              Chưa có giao dịch nào
                            </div>
                          )}
                          {expenses
                            .filter(
                              (exp) =>
                                exp.payerId === user?.uid ||
                                exp.sharedWith.includes(user?.uid),
                            )
                            .sort(
                              (a, b) => new Date(b.date) - new Date(a.date),
                            ) /* <--- THÊM DÒNG NÀY ĐỂ XẾP GẦN NHẤT LÊN ĐẦU */
                            .slice(0, visibleHistoryCount)
                            .map((exp) => renderHistoryItem(exp, true))}
                          {/* NÚT TẢI THÊM - MOBILE */}
                          {/* NÚT TẢI THÊM - DESKTOP (ĐÃ SỬA KHOẢNG CÁCH) */}
                          {expenses.length > visibleHistoryCount && (
                            <div className="col-span-1 md:col-span-2 w-full pt-8 pb-6 mt-2 flex justify-center border-t border-gray-100/60">
                              <button
                                onClick={() =>
                                  setVisibleHistoryCount((prev) => prev + 20)
                                }
                                className="px-8 py-2.5 bg-white border border-indigo-200 text-indigo-600 font-bold rounded-full hover:bg-indigo-50 active:scale-95 transition-all shadow-sm flex items-center gap-2"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="18"
                                  height="18"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="m6 9 6 6 6-6" />
                                </svg>
                                Xem thêm lịch sử cũ
                              </button>
                            </div>
                          )}
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
