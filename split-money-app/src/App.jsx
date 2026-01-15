import React, { useState, useEffect, useMemo } from 'react';
import { 
  PlusCircle, Users, Trash2, History, LayoutDashboard, 
  ArrowRightLeft, CreditCard, Wallet, Edit2, Plus,
  X, Check, ChevronRight, TrendingUp, TrendingDown, ChevronDown,
  ChevronLeft, Circle, CheckCircle2, AlertCircle, AlertTriangle, Home, LogIn, LogOut, Cloud
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import { auth, googleProvider } from './firebaseConfig'; // Import Firebase
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";

// --- CẤU HÌNH API CLOUDFLARE ---
// Thay đường dẫn này bằng link Worker của bạn:
const API_URL = "https://split-money-api.sonnx-pod.workers.dev"; 

// --- UTILS ---
const formatCurrency = (amount) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

// --- COMPONENTS ---
const Toast = ({ message, type = 'error', onClose }) => {
  if (!message) return null;
  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] animate-fade-in-down">
      <div className={`flex items-center gap-3 px-6 py-3 rounded-full shadow-2xl shadow-black/20 backdrop-blur-md border ${type === 'error' ? 'bg-gray-900/90 text-white border-red-500/50' : 'bg-white text-gray-800 border-gray-200'}`}>
        {type === 'error' && <AlertCircle size={20} className="text-red-400" />}
        {type === 'success' && <CheckCircle2 size={20} className="text-green-500" />}
        {type === 'info' && <Cloud size={20} className="text-blue-500 animate-pulse" />}
        <span className="font-bold text-sm">{message}</span>
      </div>
    </div>
  );
};

// ... (Giữ nguyên ConfirmDialog, Avatar, ExpenseModal như cũ) ...
// Để ngắn gọn, tôi giả định các component ConfirmDialog, Avatar, ExpenseModal giữ nguyên code cũ của bạn ở đây.
// Bạn hãy copy lại phần định nghĩa các component đó vào nhé.
// -----------------------------------------------------------
const ConfirmDialog = ({ isOpen, onClose, onConfirm, message, title = "Xác nhận xóa" }) => {
    if (!isOpen) return null;
    return (
      <div className="fixed inset-0 z-[300] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 transform transition-all scale-100 animate-slide-up">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-500">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800">{title}</h3>
              <p className="text-sm text-gray-500 mt-1">{message}</p>
            </div>
            <div className="flex gap-3 w-full mt-2">
              <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-gray-100 font-bold text-gray-600 hover:bg-gray-200 transition-colors">Hủy</button>
              <button onClick={() => { onConfirm(); onClose(); }} className="flex-1 py-3 rounded-xl bg-red-500 font-bold text-white hover:bg-red-600 shadow-lg shadow-red-200 transition-colors">Xóa</button>
            </div>
          </div>
        </div>
      </div>
    );
};

const Avatar = ({ name, size = "md", className = "" }) => {
    const isMe = name === 'Tôi';
    const initials = isMe ? 'ME' : (name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '?');
    const colors = ['bg-rose-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-violet-500', 'bg-pink-500', 'bg-cyan-500'];
    const colorIndex = name ? name.length % colors.length : 0;
    const bgColor = isMe ? 'bg-slate-800' : colors[colorIndex];
    const sizeClasses = { sm: "w-8 h-8 text-[10px]", md: "w-10 h-10 text-xs", lg: "w-16 h-16 text-xl" };
    return (
      <div className={`${sizeClasses[size]} ${bgColor} rounded-full flex items-center justify-center text-white font-bold shadow-sm border-2 border-white shrink-0 ${className}`}>
        {initials}
      </div>
    );
};

const ExpenseModal = ({ isOpen, onClose, initialData, onSave, people, showToast }) => {
    const [form, setForm] = useState({ description: '', amount: '', date: format(new Date(), 'yyyy-MM-dd'), sharedWith: [], payerId: 'me', type: 'split' });
    const [currentView, setCurrentView] = useState('form'); 
  
    useEffect(() => {
      if (initialData) {
        setForm({ ...initialData, payerId: initialData.payerId || 'me' });
      } else {
        setForm({ description: '', amount: '', date: format(new Date(), 'yyyy-MM-dd'), sharedWith: [], payerId: 'me', type: 'split' });
      }
      setCurrentView('form');
    }, [initialData, isOpen]);
  
    if (!isOpen) return null;
  
    const togglePerson = (id) => {
      const list = form.sharedWith;
      setForm({ ...form, sharedWith: list.includes(id) ? list.filter(p => p !== id) : [...list, id] });
    };
  
    const handleSave = () => {
      if (!form.amount || parseInt(form.amount) === 0) { showToast("Vui lòng nhập số tiền!", "error"); return; }
      if (!form.description.trim()) { showToast("Vui lòng nhập nội dung!", "error"); return; }
      if (form.sharedWith.length === 0) { showToast("Chọn ít nhất 1 người để chia!", "error"); return; }
      onSave(form);
    };
  
    const getPayerName = () => {
      if (form.payerId === 'me') return 'Tôi (Mặc định)';
      const p = people.find(i => i.id === form.payerId);
      return p ? p.name : 'Chưa chọn';
    };
  
    return (
      <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
        <div className="bg-gray-100 md:bg-white w-full max-w-lg md:max-w-2xl h-[78vh] md:h-[66vh] rounded-t-[2rem] md:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-slide-up md:animate-none relative">
          
          <div className={`flex flex-col h-full transition-transform duration-300 ease-in-out ${currentView === 'form' ? 'translate-x-0' : '-translate-x-full'}`}>
              <div className="px-4 py-4 bg-white border-b flex justify-between items-center shrink-0">
                  <button onClick={onClose} className="text-blue-600 font-medium text-base">Hủy</button>
                  <h2 className="font-bold text-lg text-gray-800">{initialData ? 'Sửa khoản chi' : 'Thêm khoản chi'}</h2>
                  <button onClick={handleSave} className="text-blue-600 font-bold text-base">Xong</button>
              </div>
  
              <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
                  <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
                      <div className="p-4 border-b border-gray-100 flex items-center">
                          <span className="w-24 font-medium text-gray-500">Số tiền</span>
                          <input type="text" inputMode="numeric" className="flex-1 text-right font-bold text-xl text-blue-600 outline-none placeholder-gray-300" placeholder="0" value={form.amount ? form.amount.replace(/\B(?=(\d{3})+(?!\d))/g, ".") : ''} onChange={e => { const rawValue = e.target.value.replace(/\./g, ''); if (/^\d*$/.test(rawValue)) { setForm({...form, amount: rawValue}); } }} autoFocus />
                      </div>
                      <div className="p-4 flex items-center">
                          <span className="w-24 font-medium text-gray-500">Tiêu đề</span>
                          <input className="flex-1 text-right font-medium text-gray-800 outline-none placeholder-gray-300" placeholder="Nhập..." value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
                      </div>
                  </div>
  
                  <div className="space-y-4">
                      <div className="flex bg-gray-200 p-1 rounded-xl">
                          <button onClick={() => setForm({...form, type: 'split'})} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${form.type === 'split' ? 'bg-white shadow text-black' : 'text-gray-500'}`}>Chia đều</button>
                          <button onClick={() => setForm({...form, type: 'full'})} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${form.type === 'full' ? 'bg-white shadow text-orange-600' : 'text-gray-500'}`}>Ứng/Vay</button>
                      </div>
  
                      <div onClick={() => setCurrentView('payer_select')} className="bg-white rounded-2xl p-4 flex justify-between items-center shadow-sm active:bg-gray-50 transition-colors cursor-pointer">
                          <span className="font-medium text-gray-500">Người chi tiền</span>
                          <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-800">{getPayerName()}</span>
                              <ChevronRight size={20} className="text-gray-300"/>
                          </div>
                      </div>
                  </div>
  
                  <div>
                      <label className="text-xs font-bold text-gray-400 ml-4 mb-2 block uppercase">
                          {form.type === 'split' ? 'Chia tiền cho' : 'Ai nợ khoản này?'}
                      </label>
                      <div className="bg-white rounded-2xl p-2 md:p-4 shadow-sm grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3 max-h-60 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
                          {form.payerId !== 'me' && (
                              <button onClick={() => togglePerson('me')} className={`p-3 md:p-4 rounded-xl flex items-center gap-2 md:gap-3 transition-all ${form.sharedWith.includes('me') ? 'bg-blue-50 text-blue-700 font-bold' : 'text-gray-600 hover:bg-gray-50'}`}>
                                  <div className={`w-5 h-5 md:w-6 md:h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${form.sharedWith.includes('me') ? 'border-blue-600 bg-blue-600' : 'border-gray-300'}`}>
                                      {form.sharedWith.includes('me') && <Check size={14} className="text-white"/>}
                                  </div>
                                  <span className="text-sm md:text-base">Tôi (Me)</span>
                              </button>
                          )}
                          {people.map(p => {
                              if (p.id === form.payerId && form.type === 'full') return null;
                              const isSelected = form.sharedWith.includes(p.id);
                              return (
                                  <button key={p.id} onClick={() => togglePerson(p.id)} className={`p-3 md:p-4 rounded-xl flex items-center gap-2 md:gap-3 transition-all ${isSelected ? 'bg-blue-50 text-blue-700 font-bold' : 'text-gray-600 hover:bg-gray-50'}`}>
                                      <div className={`w-5 h-5 md:w-6 md:h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected ? 'border-blue-600 bg-blue-600' : 'border-gray-300'}`}>
                                          {isSelected && <Check size={14} className="text-white"/>}
                                      </div>
                                      <span className="text-sm md:text-base truncate">{p.name}</span>
                                  </button>
                              )
                          })}
                      </div>
                  </div>
              </div>
          </div>
  
          <div className={`absolute inset-0 bg-gray-100 flex flex-col transition-transform duration-300 ease-in-out ${currentView === 'payer_select' ? 'translate-x-0' : 'translate-x-full'}`}>
              <div className="px-4 py-4 bg-white border-b flex items-center shrink-0 relative">
                  <button onClick={() => setCurrentView('form')} className="absolute left-4 p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-full">
                      <ChevronLeft size={24}/>
                  </button>
                  <h2 className="font-bold text-lg text-gray-800 w-full text-center">Chọn người trả tiền</h2>
              </div>
  
              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                  <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
                      <div onClick={() => { setForm({...form, payerId: 'me'}); setCurrentView('form'); }} className={`flex items-center justify-between p-4 border-b border-gray-100 cursor-pointer active:bg-gray-50 ${form.payerId === 'me' ? 'bg-yellow-50' : ''}`}>
                          <div className="flex items-center gap-3">
                              <Avatar name="Tôi" size="md"/>
                              <span className="font-bold text-gray-800">Tôi (Mặc định)</span>
                          </div>
                          {form.payerId === 'me' ? <CheckCircle2 className="text-yellow-500 fill-current" size={24}/> : <Circle className="text-gray-300" size={24}/>}
                      </div>
                      {people.map((p, index) => {
                          const isSelected = form.payerId === p.id;
                          return (
                              <div key={p.id} onClick={() => { setForm({...form, payerId: p.id}); setCurrentView('form'); }} className={`flex items-center justify-between p-4 border-gray-100 cursor-pointer active:bg-gray-50 ${index !== people.length - 1 ? 'border-b' : ''} ${isSelected ? 'bg-yellow-50' : ''}`}>
                                  <div className="flex items-center gap-3">
                                      <Avatar name={p.name} size="md"/>
                                      <span className="font-bold text-gray-800">{p.name}</span>
                                  </div>
                                  {isSelected ? <CheckCircle2 className="text-yellow-500 fill-current" size={24}/> : <Circle className="text-gray-300" size={24}/>}
                              </div>
                          )
                      })}
                  </div>
              </div>
          </div>
  
        </div>
      </div>
    );
};
// -----------------------------------------------------------

export default function App() {
  const [people, setPeople] = useState(() => JSON.parse(localStorage.getItem('sm_people')) || []);
  const [expenses, setExpenses] = useState(() => JSON.parse(localStorage.getItem('sm_expenses')) || []);
  
  // --- AUTH STATES ---
  const [user, setUser] = useState(null); // Người dùng đăng nhập
  const [isSyncing, setIsSyncing] = useState(false); // Trạng thái đang đồng bộ
  
  const [activeTab, setActiveTab] = useState('dashboard'); 
  const [selectedPersonId, setSelectedPersonId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [newPersonName, setNewPersonName] = useState('');
  const [toast, setToast] = useState(null); 
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, message: '', onConfirm: null });

  // --- HIỆU ỨNG: THEO DÕI ĐĂNG NHẬP ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Nếu đã đăng nhập, tải dữ liệu từ Cloudflare
        fetchDataFromServer(currentUser.uid);
      }
    });
    return () => unsubscribe();
  }, []);

  // --- HIỆU ỨNG: LƯU LOCALSTORAGE + SYNC CLOUD ---
  useEffect(() => { 
    localStorage.setItem('sm_people', JSON.stringify(people)); 
    // Nếu đang đăng nhập, tự động lưu lên server (Debounce nếu cần, ở đây làm đơn giản)
    if (user && !isSyncing) { saveDataToServer(); }
  }, [people]);

  useEffect(() => { 
    localStorage.setItem('sm_expenses', JSON.stringify(expenses)); 
    if (user && !isSyncing) { saveDataToServer(); }
  }, [expenses]);

  // --- HÀM XỬ LÝ SERVER ---
const fetchDataFromServer = async (uid) => {
  setIsSyncing(true);
  try {
    const res = await fetch(`${API_URL}?uid=${uid}`);
    if (res.ok) {
      const data = await res.json();
      
      // KIỂM TRA: Nếu máy đang có dữ liệu mà Server cũng có dữ liệu khác nhau
      const localPeople = JSON.parse(localStorage.getItem('sm_people') || "[]");
      
      if (data.people && data.people.length > 0) {
        if (localPeople.length > 0) {
           // Hỏi người dùng nếu muốn giữ dữ liệu cũ hay lấy từ đám mây
           if (window.confirm("Bạn có dữ liệu cũ trên máy. Bạn muốn TẢI DỮ LIỆU TỪ CLOUD về (Nhấn OK) hay ĐẨY DỮ LIỆU HIỆN TẠI LÊN CLOUD (Nhấn Hủy)?")) {
              setPeople(data.people);
              setExpenses(data.expenses);
           } else {
              saveDataToServer(); // Đẩy dữ liệu hiện có lên server
           }
        } else {
          setPeople(data.people);
          setExpenses(data.expenses);
        }
      } else {
        // Nếu server trống (người dùng mới), tự động đẩy dữ liệu hiện tại lên
        saveDataToServer();
      }
    }
  } catch (error) {
    console.error(error);
  } finally {
    setIsSyncing(false);
  }
};

  const saveDataToServer = async () => {
    if (!user) return;
    try {
      const payload = JSON.stringify({ people, expenses });
      await fetch(`${API_URL}?uid=${user.uid}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload
      });
      console.log("Saved to cloud");
    } catch (error) {
      console.error("Save failed", error);
    }
  };

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      showToast("Đăng nhập thành công!", "success");
    } catch (error) {
      showToast("Lỗi đăng nhập", "error");
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    setPeople([]); // Xóa dữ liệu hiển thị (hoặc giữ lại tùy bạn)
    setExpenses([]);
    localStorage.removeItem('sm_people');
    localStorage.removeItem('sm_expenses');
    showToast("Đã đăng xuất", "success");
  };

  // --- CÁC HÀM CŨ (Giữ nguyên logic) ---
  const showToast = (message, type = 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000); 
  };

  const calculateNetDebt = (personId) => {
    let balance = 0;
    expenses.forEach(exp => {
      const amount = parseFloat(exp.amount);
      const actualPayerId = exp.payerId || 'me';
      let shareAmount = exp.type === 'split' ? amount / (exp.sharedWith.length + 1) : amount / exp.sharedWith.length;
      if (actualPayerId === 'me' && exp.sharedWith.includes(personId)) balance += shareAmount;
      if (actualPayerId === personId && exp.sharedWith.includes('me')) balance -= shareAmount;
    });
    return balance;
  };

  const sortedPeople = useMemo(() => [...people].sort((a, b) => {
    const debtA = calculateNetDebt(a.id);
    const debtB = calculateNetDebt(b.id);
    if (debtA < 0 && debtB >= 0) return -1;
    if (debtA >= 0 && debtB < 0) return 1;
    if (debtA < 0 && debtB < 0) return debtA - debtB;
    return debtB - debtA;
  }), [people, expenses]);

  const totalOwedToMe = sortedPeople.reduce((acc, p) => { const d = calculateNetDebt(p.id); return d > 0 ? acc + d : acc; }, 0);
  const totalIOwe = sortedPeople.reduce((acc, p) => { const d = calculateNetDebt(p.id); return d < 0 ? acc + Math.abs(d) : acc; }, 0);

  const addPerson = () => { 
      if (!newPersonName.trim()) { showToast("Vui lòng nhập tên!", "error"); return; } 
      setPeople([...people, { id: uuidv4(), name: newPersonName }]); 
      setNewPersonName(''); 
      showToast("Đã thêm thành viên", "success");
  };

  const deletePerson = (id) => { 
    setConfirmDialog({
      isOpen: true,
      message: "Toàn bộ lịch sử giao dịch liên quan đến người này cũng sẽ bị xóa vĩnh viễn.",
      title: "Xóa thành viên này?",
      onConfirm: () => {
        setPeople(prev => prev.filter(p => p.id !== id));
        setExpenses(prev => prev.filter(e => e.payerId !== id && !e.sharedWith.includes(id)));
        if (selectedPersonId === id) setSelectedPersonId(null);
        showToast("Đã xóa thành viên", "success");
      }
    });
  };

  const deleteExpense = (id) => { 
    setConfirmDialog({
      isOpen: true,
      message: "Hành động này không thể hoàn tác.",
      title: "Xóa khoản chi này?",
      onConfirm: () => {
        setExpenses(prev => prev.filter(e => e.id !== id));
        showToast("Đã xóa giao dịch", "success");
      }
    });
  };
  
  const openAddModal = () => { setEditingExpense(null); setIsModalOpen(true); };
  const openEditModal = (exp) => { setEditingExpense(exp); setIsModalOpen(true); };
  
  const handleSaveExpense = (formData) => {
    if (editingExpense) { 
        setExpenses(expenses.map(e => e.id === editingExpense.id ? { ...e, ...formData } : e)); 
        showToast("Đã cập nhật giao dịch", "success");
    } else { 
        setExpenses([{ id: uuidv4(), ...formData, createdAt: new Date().toISOString() }, ...expenses]); 
        showToast("Đã thêm giao dịch mới", "success");
    }
    setIsModalOpen(false);
  };

  const renderHistoryItem = (exp, isMobile = false) => {
    const actualPayerId = exp.payerId || 'me';
    const payerName = actualPayerId === 'me' ? 'Bạn' : people.find(p => p.id === actualPayerId)?.name || 'Ai đó';
    const names = exp.sharedWith.map(id => (id === 'me' ? 'Tôi' : people.find(p => p.id === id)?.name)).filter(Boolean).join(', ');
    
    return (
      <div key={exp.id} onClick={() => openEditModal(exp)} className={`group bg-white rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden flex items-center p-4 mb-3 cursor-pointer active:scale-95 transition-all ${isMobile ? 'mx-0 shadow-sm border-transparent' : 'hover:shadow-md'}`}>
         <div className={`w-1.5 bg-gradient-to-b absolute left-0 top-0 bottom-0 ${exp.type === 'split' ? 'from-blue-400 to-blue-600' : 'from-orange-400 to-orange-600'}`}></div>
         <div className="ml-4 flex-1">
            <div className="flex justify-between items-start mb-1">
               <div className="flex items-center gap-2">
                 <span className="font-bold text-gray-800 text-sm md:text-lg line-clamp-1">{exp.description}</span>
                 {exp.type === 'full' && <span className="text-[10px] md:text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">Vay</span>}
               </div>
               <span className={`font-bold text-base md:text-xl ${exp.type === 'split' ? 'text-blue-600' : 'text-orange-600'}`}>{formatCurrency(exp.amount)}</span>
            </div>
            <div className="flex justify-between items-end">
               <div className="text-xs md:text-base text-gray-400 w-full">
                  <div className="flex justify-between items-center w-full">
                      <span><span className="font-medium text-gray-600">{payerName}</span> trả • {format(new Date(exp.date), 'dd/MM')}</span>
                  </div>
                  <div className="text-gray-400 truncate max-w-[200px] md:max-w-full mt-1">Với: {names}</div>
               </div>
               <div className={`flex gap-2 ml-4 ${isMobile ? '' : 'hidden md:flex opacity-0 group-hover:opacity-100 transition-opacity'}`}>
                  <button onClick={(e) => { e.stopPropagation(); openEditModal(exp); }} className="text-gray-400 hover:text-blue-500 bg-gray-50 p-2 rounded-lg"><Edit2 size={18} /></button>
                  <button onClick={(e) => { e.stopPropagation(); deleteExpense(exp.id); }} className="text-gray-400 hover:text-red-500 bg-gray-50 p-2 rounded-lg"><Trash2 size={18} /></button>
               </div>
            </div>
         </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 h-[100dvh] w-screen bg-gray-50 font-sans overflow-hidden flex flex-col">
      <Toast message={toast?.message} type={toast?.type} onClose={() => setToast(null)} />
      <ConfirmDialog isOpen={confirmDialog.isOpen} message={confirmDialog.message} title={confirmDialog.title} onConfirm={confirmDialog.onConfirm} onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))} />
      <ExpenseModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} initialData={editingExpense} onSave={handleSaveExpense} people={people} showToast={showToast} />

      {/* FLOAT BUTTON */}
      <button onClick={openAddModal} className="hidden md:flex fixed bottom-10 right-10 w-16 h-16 bg-blue-600 text-white rounded-full shadow-2xl shadow-blue-400 items-center justify-center hover:scale-110 active:scale-95 transition-all z-40 group">
        <Plus size={32} />
      </button>

      {/* SIDEBAR */}
      <aside className="hidden md:flex fixed top-0 bottom-0 left-0 w-72 flex-col bg-whiteSx border-r border-gray-100 shadow-xl z-20">
        <div className="p-8 flex items-center gap-3">
          <div className="p-2.5 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-200"><Wallet size={28}/></div>
          <h1 className="font-bold text-2xl text-gray-800 tracking-tight">Split Money</h1>
        </div>
        
        {/* LOGIN INFO (DESKTOP) */}
        <div className="px-6 mb-4">
           {user ? (
             <div className="p-4 bg-gray-50 rounded-2xl flex items-center gap-3">
               <img src={user.photoURL} alt="User" className="w-10 h-10 rounded-full border border-gray-200"/>
               <div className="flex-1 min-w-0">
                 <p className="font-bold text-sm text-gray-800 truncate">{user.displayName}</p>
                 <button onClick={handleLogout} className="text-xs text-red-500 font-bold flex items-center gap-1 hover:underline">Đăng xuất</button>
               </div>
             </div>
           ) : (
             <button onClick={handleLogin} className="w-full py-3 bg-white border border-gray-200 shadow-sm rounded-xl font-bold text-gray-700 flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors">
               <LogIn size={18}/> Đăng nhập Google
             </button>
           )}
        </div>

        <nav className="flex-1 px-6 py-4 space-y-3">
          <button onClick={() => {setActiveTab('dashboard'); setSelectedPersonId(null);}} className={`w-full flex items-center gap-4 p-4 rounded-2xl font-bold transition-all ${activeTab === 'dashboard' && !selectedPersonId ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'}`}>
            <LayoutDashboard size={22}/> Tổng quan
          </button>
          <button onClick={() => setActiveTab('people')} className={`w-full flex items-center gap-4 p-4 rounded-2xl font-bold transition-all ${activeTab === 'people' ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'}`}>
            <Users size={22}/> Thành viên
          </button>
        </nav>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col h-full md:pl-72 relative">
        
        {/* --- MOBILE VIEW --- */}
        <div className="md:hidden flex flex-col h-full bg-blue-600">
           {/* HEADER */}
           <div className="bg-gradient-to-br from-blue-600 to-indigo-700 px-6 pt-8 pb-16 shrink-0 text-white shadow-md z-20">
              <div className="flex justify-between items-center mb-6">
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 backdrop-blur-md rounded-xl"><Wallet size={20}/></div>
                    <span className="font-bold text-xl tracking-tight">Ví Nhóm</span>
                 </div>
                 {/* LOGIN BUTTON MOBILE */}
                 <div onClick={user ? handleLogout : handleLogin} className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/10 cursor-pointer overflow-hidden">
                    {user ? <img src={user.photoURL} className="w-full h-full object-cover"/> : <LogIn size={20}/>}
                 </div>
              </div>
              {/* ... STATS ... */}
              <div>
                 <p className="text-blue-100 text-xs font-bold uppercase tracking-wider opacity-80">Tài sản ròng</p>
                 <h2 className="text-4xl font-bold mt-1 tracking-tighter">{formatCurrency(totalOwedToMe - totalIOwe)}</h2>
                 <div className="flex gap-3 mt-4">
                    <div className="flex items-center gap-2 bg-emerald-500/20 px-3 py-1.5 rounded-lg backdrop-blur-md border border-emerald-500/30">
                       <TrendingUp size={14} className="text-emerald-300"/>
                       <span className="text-xs font-bold text-emerald-100">{formatCurrency(totalOwedToMe)}</span>
                    </div>
                    <div className="flex items-center gap-2 bg-rose-500/20 px-3 py-1.5 rounded-lg backdrop-blur-md border border-rose-500/30">
                       <TrendingDown size={14} className="text-rose-300"/>
                       <span className="text-xs font-bold text-rose-100">{formatCurrency(totalIOwe)}</span>
                    </div>
                 </div>
              </div>
           </div>
           
           {/* BODY MOBILE */}
           <div className="flex-1 flex flex-col min-h-0 bg-gray-50 rounded-t-[2rem] -mt-12 overflow-hidden z-20 shadow-[0_-10px_30px_rgba(0,0,0,0.15)] relative">
                {/* ... (Phần nội dung Mobile giữ nguyên logic hiển thị) ... */}
                {/* DOẠN NÀY DÀI, BẠN GIỮ NGUYÊN CODE TRONG PHẦN RENDER MOBILE CŨ CỦA MÌNH NHÉ, CHỈ THAY ĐỔI CÁC BIẾN STATE NẾU CẦN */}
                {activeTab === 'dashboard' && !selectedPersonId && (
                <>
                  <div className="shrink-0 pt-6 px-4 pb-2 border-b border-gray-100 bg-white/50">
                     <div className="flex justify-between items-end mb-3 px-2">
                        <h3 className="font-bold text-gray-800 text-sm tracking-wide">Danh sách công nợ</h3>
                        <button onClick={() => setActiveTab('people')} className="text-blue-600 text-[10px] font-bold bg-blue-50 px-2 py-1 rounded-full">Chi tiết</button>
                     </div>
                     <div className="flex overflow-x-auto gap-3 pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none'] snap-x -mx-4 px-4">
                        {sortedPeople.length === 0 && <div className="w-full py-4 text-center border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 text-xs">Chưa có ai</div>}
                        {sortedPeople.map(p => {
                           const debt = calculateNetDebt(p.id);
                           return (
                             <div key={p.id} onClick={() => setSelectedPersonId(p.id)} className="min-w-[110px] bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center gap-2 active:scale-95 transition-transform snap-center">
                                <Avatar name={p.name} size="md"/>
                                <div className="text-center w-full">
                                   <p className="font-bold text-gray-800 text-xs truncate mb-0.5">{p.name}</p>
                                   <p className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md inline-block ${debt >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{formatCurrency(Math.abs(debt))}</p>
                                </div>
                             </div>
                           )
                        })}
                     </div>
                  </div>
                  <div className="flex-1 overflow-y-auto px-4 pb-24 pt-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
                     <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wide mb-3 px-2">Giao dịch gần đây</h3>
                     {expenses.length === 0 && <div className="text-center py-10 text-gray-400 text-sm italic">Chưa có giao dịch nào</div>}
                     {expenses.map(exp => renderHistoryItem(exp, true))}
                  </div>
                </>
              )}
              
              {/* MEMBER DETAIL VIEW */}
              {selectedPersonId && (
                  <div className="flex-1 overflow-y-auto bg-white p-6 pb-24">
                     <button onClick={() => setSelectedPersonId(null)} className="mb-6 text-gray-500 flex items-center gap-2 text-sm font-bold bg-gray-100 py-2 px-4 rounded-xl w-fit"><ArrowRightLeft size={16}/> Quay lại</button>
                     {(() => {
                        const p = people.find(item => item.id === selectedPersonId);
                        const debt = calculateNetDebt(p?.id);
                        const related = expenses.filter(e => e.sharedWith.includes(p?.id) || e.payerId === p?.id);
                        return p ? (
                           <>
                              <div className="text-center mb-8">
                                 <Avatar name={p.name} size="lg" className="mx-auto mb-3"/>
                                 <h2 className="text-2xl font-bold">{p.name}</h2>
                                 <p className={`text-lg font-bold ${debt >= 0 ? 'text-green-500' : 'text-red-500'}`}>{debt >= 0 ? `Nợ bạn: ${formatCurrency(debt)}` : `Bạn nợ: ${formatCurrency(Math.abs(debt))}`}</p>
                              </div>
                              <h3 className="font-bold text-gray-400 text-xs uppercase mb-4 border-b pb-2">Lịch sử chung</h3>
                              <div className="space-y-3">{related.map(e => renderHistoryItem(e, true))}</div>
                           </>
                        ) : null;
                     })()}
                  </div>
              )}

              {/* PEOPLE MANAGE VIEW */}
              {activeTab === 'people' && (
                 <div className="flex-1 overflow-y-auto bg-white p-6 pb-24 space-y-6">
                    <h2 className="text-2xl font-bold text-gray-800">Thành viên</h2>
                    <div className="flex gap-2">
                       <input value={newPersonName} onChange={e => setNewPersonName(e.target.value)} placeholder="Nhập tên..." className="flex-1 bg-gray-50 p-4 rounded-xl border-none outline-none"/>
                       <button onClick={addPerson} className="bg-blue-600 text-white px-6 rounded-xl font-bold">Thêm</button>
                    </div>
                    <div className="space-y-3">
                      {people.map(p => (
                         <div key={p.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                            <span className="font-bold flex items-center gap-3"><Avatar name={p.name} size="sm"/> {p.name}</span>
                            <button onClick={() => deletePerson(p.id)} className="text-red-400 bg-white p-2 rounded-lg shadow-sm"><Trash2 size={18}/></button>
                         </div>
                      ))}
                    </div>
                 </div>
              )}
           </div>

           {/* BOTTOM NAV */}
           <div className="fixed bottom-0 left-0 right-0 z-50">
              <div className="bg-white h-20 shadow-[0_-10px_40px_rgba(0,0,0,0.08)] flex justify-between items-end px-10Ql relative">
                 <button onClick={() => {setActiveTab('dashboard'); setSelectedPersonId(null)}} className={`bg-transparent flex flex-col items-center gap-1 transition-all duration-300 mb-1 ${activeTab === 'dashboard' ? 'text-blue-500' : 'text-gray-300 hover:text-gray-400'}`}>
                    <Home size={28} strokeWidth={activeTab === 'dashboard' ? 2.5 : 2} />
                    <span className="text-[10px] font-bold">Trang chủ</span>
                 </button>
                 <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                    <button onClick={openAddModal} className="w-20 h-20 rounded-full flex items-center justify-center text-white shadow-2xl shadow-blue-500/40 hover:scale-105 active:scale-95 transition-all bg-gradient-to-tr from-blue-400 to-cyan-500 border-[6px] border-gray-50"><Plus size={36} strokeWidth={3} /></button>
                 </div>
                 <button onClick={() => setActiveTab('people')} className={`bg-transparent flex flex-col items-center gap-1 transition-all duration-300 mb-1 ${activeTab === 'people' ? 'text-blue-500' : 'text-gray-300 hover:text-gray-400'}`}>
                    <Users size={28} strokeWidth={activeTab === 'people' ? 2.5 : 2}/>
                    <span className="text-[10px] font-bold">Thành viên</span>
                 </button>
              </div>
           </div>
        </div>

        {/* --- DESKTOP VIEW --- */}
        {/* Phần Desktop giữ nguyên cấu trúc, chỉ thêm header User ở trên sidebar đã làm */}
        <div className="hidden md:block flex-1 overflow-hidden p-8">
           {/* ... Giữ nguyên code hiển thị Desktop ... */}
           {/* Tôi rút gọn phần này để tiết kiệm không gian hiển thị, bạn giữ nguyên code render phần Desktop cũ ở đây nhé */}
           {selectedPersonId ? (
             /* Code render chi tiết */
             <div className="h-full bg-white rounded-[2rem] shadow-sm border border-gray-200 flex flex-col relative overflow-hidden animate-fade-in">
                 <div className="p-6 border-b flex justify-between items-center bg-gray-50">
                    <h2 className="font-bold text-xl text-gray-700">Chi tiết công nợ</h2>
                    <button onClick={() => setSelectedPersonId(null)} className="p-2 bg-white rounded-full shadow hover:bg-gray-100 transition-colors"><X size={20}/></button>
                 </div>
                 <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                    {(() => {
                       const p = people.find(item => item.id === selectedPersonId);
                       if(!p) return null;
                       const debt = calculateNetDebt(p.id);
                       const related = expenses.filter(e => e.sharedWith.includes(p.id) || e.payerId === p.id);
                       return (
                          <div className="max-w-3xl mx-auto">
                             <div className="flex items-center gap-8 mb-10 p-8 bg-gray-50/80 rounded-[2rem] border border-gray-100">
                                <Avatar name={p.name} size="lg" className="shadow-lg"/>
                                <div>
                                    <h2 className="text-4xl font-bold text-gray-800">{p.name}</h2>
                                    <div className={`mt-3 inline-flex items-center px-4 py-2 rounded-xl text-lg font-bold ${debt >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                        {debt >= 0 ? `Đang nợ bạn: ${formatCurrency(debt)}` : `Bạn nợ: ${formatCurrency(Math.abs(debt))}`}
                                    </div>
                                </div>
                             </div>
                             <h3 className="font-bold text-gray-400 text-sm uppercase mb-6 flex items-center gap-4"><span className="bg-gray-200 h-px flex-1"></span> Lịch sử chung ({related.length}) <span className="bg-gray-200 h-px flex-1"></span></h3>
                             <div className="space-y-4">{related.map(e => renderHistoryItem(e))}</div>
                          </div>
                       )
                    })()}
                 </div>
             </div>
           ) : activeTab === 'people' ? (
             /* Code render Manage People */
             <div className="h-full overflow-y-auto custom-scrollbar">
                <div className="max-w-2xl mx-auto space-y-8 bg-white p-10 rounded-[2rem] shadow-sm border border-gray-200">
                   <h2 className="font-bold text-3xl text-gray-800">Quản lý thành viên</h2>
                   <div className="flex gap-3">
                     <input type="text" value={newPersonName} onChange={(e) => setNewPersonName(e.target.value)} placeholder="Nhập tên người mới..." className="flex-1 p-5 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-blue-100 border border-transparent focus:bg-white transition-all text-lg"/>
                     <button onClick={addPerson} className="bg-blue-600 text-white px-8 rounded-2xl font-bold hover:bg-blue-700 transition-transform active:scale-95 text-lg">Thêm</button>
                   </div>
                   <div className="space-y-3">
                     {people.map(p => (
                       <div key={p.id} className="p-5 bg-gray-50 rounded-2xl flex justify-between items-center group hover:bg-white hover:shadow-md hover:border-blue-100 border border-transparent transition-all">
                         <div className="flex items-center gap-4"><Avatar name={p.name} size="md"/><span className="font-bold text-lg text-gray-700">{p.name}</span></div>
                         <button onClick={() => deletePerson(p.id)} className="text-gray-300 hover:text-red-500 transition-colors p-2 bg-white rounded-xl shadow-sm opacity-0 group-hover:opacity-100"><Trash2 size={20}/></button>
                       </div>
                     ))}
                   </div>
                </div>
             </div>
           ) : (
             /* Code render Dashboard chính */
             <div className="flex flex-col h-full gap-8">
                <div className="flex flex-col xl:flex-row gap-8 shrink-0">
                  <div className="flex-1 flex flex-col h-[400px]">
                     <h2 className="font-bold text-gray-700 flex items-center gap-2 mb-4 text-lg"><Users size={22} className="text-blue-500"/> Danh sách công nợ</h2>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto pr-2 custom-scrollbar pb-2">
                        {sortedPeople.map(person => {
                          const debt = calculateNetDebt(person.id);
                          return (
                            <div key={person.id} onClick={() => setSelectedPersonId(person.id)} className="bg-white p-5 rounded-[1.5rem] shadow-sm border border-gray-200 cursor-pointer hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:border-blue-300 transition-all flex items-center gap-4 group">
                              <Avatar name={person.name} />
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-gray-800 truncate text-base mb-0.5">{person.name}</p>
                                <p className="text-xs text-gray-400 group-hover:text-blue-500 font-bold">Xem chi tiết</p>
                              </div>
                              <div className="text-right">
                                <p className={`font-bold text-lg ${debt >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{formatCurrency(Math.abs(debt))}</p>
                                <p className={`text-[10px] font-bold px-2 py-0.5 rounded-md inline-block ${debt >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{debt >= 0 ? 'Họ nợ' : 'Nợ họ'}</p>
                              </div>
                            </div>
                          )
                        })}
                     </div>
                  </div>
                  
                  {/* DESKTOP CARD */}
                  <div className="xl:w-96 flex flex-col">
                     <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2rem] p-8 text-white shadow-xl relative overflow-hidden h-fit flex flex-col justify-between">
                        <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
                        <div className="absolute bottom-[-20px] left-[-20px] w-40 h-40 bg-purple-500/20 rounded-full blur-2xl pointer-events-none"></div>
                        <div className="mb-8">
                           <p className="opacity-80 font-bold text-sm uppercase tracking-wider mb-2">Tổng tài sản ròng</p>
                           <h3 className="text-5xl font-bold tracking-tighter">{formatCurrency(totalOwedToMe - totalIOwe)}</h3>
                        </div>
                        <div className="space-y-4 relative z-10">
                          <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md border border-white/10 flex items-center gap-4">
                             <div className="p-3 bg-emerald-500/20 rounded-xl"><TrendingUp size={24} className="text-emerald-300"/></div>
                             <div>
                                <p className="text-[10px] opacity-80 uppercase font-bold">Cần thu về</p>
                                <p className="font-bold text-xl text-emerald-300">{formatCurrency(totalOwedToMe)}</p>
                             </div>
                          </div>
                          <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md border border-white/10 flex items-center gap-4">
                             <div className="p-3 bg-rose-500/20 rounded-xl"><TrendingDown size={24} className="text-rose-300"/></div>
                             <div>
                                <p className="text-[10px] opacity-80 uppercase font-bold">Cần trả đi</p>
                                <p className="font-bold text-xl text-rose-300">{formatCurrency(totalIOwe)}</p>
                             </div>
                          </div>
                        </div>
                     </div>
                  </div>
                </div>
                
                <div className="flex-1 bg-white rounded-[2rem] shadow-sm border border-gray-200 flex flex-col min-h-0 overflow-hidden">
                   <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                     <h2 className="font-bold text-gray-800 flex items-center gap-2 text-lg"><History size={22} className="text-violet-500"/> Lịch sử giao dịch</h2>
                     <span className="text-xs font-bold bg-gray-100 text-gray-500 px-3 py-1 rounded-full">{expenses.length} giao dịch</span>
                   </div>
                   <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-gray-50/50">
                      {expenses.map(e => renderHistoryItem(e))}
                   </div>
                </div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
}