import React, { useMemo, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Menu,
  Cloud,
  Database,
  CheckCircle2,
  School,
  LogOut,
  LogIn,
  User,
  ChevronDown,
  Key,
  Sparkles,
  Check,
  X,
} from 'lucide-react';
import { ViewId, getViewMeta } from '../Navigation';
import { UserRole, UserProfile, SUPERADMIN_EMAILS } from '../../../services/storageTypes';

const ROLE_LABELS: Record<UserRole, string> = {
  superadmin: '👑 Superadmin',
  admin: '⚙️ Quản trị viên',
  manager: '👔 Quản lý môn',
  teacher: '👨‍🏫 Giáo viên',
  assistant: '🤝 Trợ giảng',
  student: '🎓 Học sinh',
  parent: '👨‍👩‍👧 Phụ huynh',
  guest: '👤 Khách',
};

interface HeaderProps {
  onOpenSidebar: () => void;
  activeView: ViewId;
  currentRole: UserRole;
  onChangeRole: (role: UserRole) => void;
  isDriveConnected: boolean;
  driveEmail: string;
  isFirestoreLive: boolean;
  onConnectDrive: () => void;
  onSelectView?: (viewId: ViewId) => void;
  currentUserProfile?: UserProfile | null;
  firebaseUser?: any;
  onSignInGoogle?: () => void;
  onSignOut?: () => void;
  onOpenFirebaseModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSidebar,
  activeView,
  currentRole,
  onChangeRole,
  isDriveConnected,
  driveEmail,
  isFirestoreLive,
  onConnectDrive,
  currentUserProfile,
  firebaseUser,
  onSignInGoogle,
  onSignOut,
  onOpenFirebaseModal,
}) => {
  const [showAccountDropdown, setShowAccountDropdown] = useState<boolean>(false);
  const accountDropdownRef = useRef<HTMLDivElement>(null);
  const meta = getViewMeta(activeView);

  // Đóng menu tài khoản khi click ra ngoài hoặc bấm Escape
  useEffect(() => {
    if (!showAccountDropdown) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (accountDropdownRef.current && !accountDropdownRef.current.contains(event.target as Node)) {
        setShowAccountDropdown(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowAccountDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showAccountDropdown]);

  // Quản lý Gemini API Keys
  const [showGeminiModal, setShowGeminiModal] = useState<boolean>(false);
  const [geminiKeysInput, setGeminiKeysInput] = useState<string>('');
  const [geminiKeyCount, setGeminiKeyCount] = useState<number>(0);
  const [geminiKeyStatus, setGeminiKeyStatus] = useState<'none' | 'active' | 'invalid'>('none');
  const [savedGeminiNotice, setSavedGeminiNotice] = useState<string | null>(null);

  const refreshGeminiKeysStatus = () => {
    try {
      const stored = localStorage.getItem('lopu_gemini_api_keys') || '';
      setGeminiKeysInput(stored);
      const list = stored
        .split(/[\n,;]+/)
        .map(k => k.trim())
        .filter(Boolean);
      setGeminiKeyCount(list.length);
      const manualStatus = localStorage.getItem('lopu_gemini_api_status');

      if (list.length === 0) {
        setGeminiKeyStatus('none');
      } else if (manualStatus === 'invalid' || manualStatus === 'all_exhausted') {
        setGeminiKeyStatus('invalid');
      } else {
        const hasValidKey = list.some(k => k.length >= 10 && !k.toLowerCase().includes('error') && !k.toLowerCase().includes('expired'));
        setGeminiKeyStatus(hasValidKey ? 'active' : 'invalid');
      }
    } catch {
      setGeminiKeyStatus('none');
    }
  };

  useEffect(() => {
    refreshGeminiKeysStatus();
    const handleUpdated = () => refreshGeminiKeysStatus();
    window.addEventListener('gemini_keys_updated', handleUpdated);
    return () => window.removeEventListener('gemini_keys_updated', handleUpdated);
  }, []);

  const handleSaveGeminiKeys = () => {
    try {
      const raw = geminiKeysInput.trim();
      localStorage.setItem('lopu_gemini_api_keys', raw);
      const list = raw
        .split(/[\n,;]+/)
        .map(k => k.trim())
        .filter(Boolean);
      setGeminiKeyCount(list.length);
      if (list.length === 0) {
        setGeminiKeyStatus('none');
        localStorage.removeItem('lopu_gemini_api_status');
        setSavedGeminiNotice('Đã xóa danh sách API key (Chìa khóa sẽ ẩn).');
      } else {
        const hasValidKey = list.some(k => k.length >= 10 && !k.toLowerCase().includes('error') && !k.toLowerCase().includes('expired'));
        const newStatus = hasValidKey ? 'active' : 'invalid';
        setGeminiKeyStatus(newStatus);
        localStorage.setItem('lopu_gemini_api_status', newStatus);
        setSavedGeminiNotice(`Đã lưu thành công ${list.length} khóa Gemini API (${hasValidKey ? 'Khóa Xanh: Đang hoạt động' : 'Khóa Đỏ: Không còn hoạt động'})!`);
      }
      window.dispatchEvent(new Event('gemini_keys_updated'));
      setTimeout(() => {
        setSavedGeminiNotice(null);
        setShowGeminiModal(false);
      }, 1400);
    } catch {
      setSavedGeminiNotice('Không thể lưu vào bộ nhớ trình duyệt!');
    }
  };

  const isConnected = Boolean(isDriveConnected || firebaseUser);
  const activeConnectedAccount = firebaseUser?.email || currentUserProfile?.email || (isDriveConnected ? driveEmail : '') || 'tanbaodl@gmail.com';

  // Danh sách các vai trò trải nghiệm trong hệ thống
  const availableRoles: UserRole[] = useMemo(() => {
    return Object.keys(ROLE_LABELS) as UserRole[];
  }, []);

  return (
    <header
      id="app-main-header"
      className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs"
    >
      <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Hamburger Button (3 gạch) & Logo & Active View Title */}
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <button
            id="btn-hamburger-menu"
            onClick={onOpenSidebar}
            aria-label="Mở menu thanh điều hướng"
            className="p-2 -ml-2 rounded-xl text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-colors cursor-pointer"
          >
            {/* 3 bars Hamburger icon */}
            <Menu className="w-6 h-6 stroke-[2.2]" />
          </button>

          {/* LopU Logo Icon & Brand */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-xs">
              <School className="w-5 h-5" />
            </div>
            <div className="hidden sm:block">
              <span className="font-extrabold text-lg tracking-tight text-slate-900 font-sans">
                Lop<span className="text-indigo-600">U</span>
              </span>
            </div>
          </div>

          {/* Breadcrumb Separator */}
          <span className="hidden md:inline-block text-slate-300">/</span>

          {/* Current Active View Title & Category */}
          <div className="min-w-0 flex flex-col justify-center">
            <div className="flex items-center gap-2">
              <span className="hidden md:inline-block text-xs font-semibold text-slate-600">
                {meta.category}
              </span>
              <span className="hidden md:inline-block text-slate-300">•</span>
              <h1 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                {meta.title}
              </h1>
            </div>
          </div>
        </div>

        {/* Right: Cụm gôm các nút: Drive [tài khoản kết nối], Kim cương, Tim, Dropdown vai trò, Đăng xuất */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Firestore indicator: Bấm để mở Cấu hình & Đồng bộ Firebase LopU */}
          <button
            id="badge-firestore-status"
            onClick={onOpenFirebaseModal}
            title={isFirestoreLive ? 'Firebase LopU: Đang kết nối thời gian thực. Bấm để quản lý cấu hình & đồng bộ dữ liệu' : 'Firebase LopU: Chế độ offline-first. Bấm để cấu hình & đồng bộ'}
            className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 transition-colors cursor-pointer"
          >
            <Database className="w-3.5 h-3.5 text-amber-600" />
            <span>Firebase LopU</span>
            <span className={`w-1.5 h-1.5 rounded-full ${isFirestoreLive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
          </button>

          {/* Nút Đăng nhập Google Drive nhanh khi chưa kết nối */}
          {!isConnected && (
            <button
              id="btn-header-login"
              onClick={onSignInGoogle || onConnectDrive}
              title="Đăng nhập tài khoản Google"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors cursor-pointer shrink-0"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Đăng nhập</span>
            </button>
          )}

          {/* Cụm tài khoản: Luôn hiển thị để người dùng cấu hình Gemini API và quan sát biểu tượng chìa khóa */}
          <div ref={accountDropdownRef} className="relative">
            <button
              id="btn-header-account-cluster"
              onClick={() => setShowAccountDropdown(prev => !prev)}
              title={`Tài khoản: ${activeConnectedAccount}${
                geminiKeyStatus === 'active'
                  ? ' • Khóa Gemini API: Đang hoạt động (Chìa khóa Xanh)'
                  : geminiKeyStatus === 'invalid'
                  ? ' • Khóa Gemini API: Không còn hoạt động (Chìa khóa Đỏ)'
                  : ' • Chưa có khóa Gemini API'
              }`}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 shadow-2xs transition-all cursor-pointer"
            >
              {/* Biểu tượng chìa khóa theo trạng thái API:
                  - Có ít nhất 1 API hoạt động: hiển thị biểu tượng chìa khóa XANH
                  - Không còn API hoạt động: hiển thị biểu tượng chìa khóa ĐỎ
                  - Không có danh sách API: KHÔNG hiển thị chìa khóa */}
              {geminiKeyStatus === 'active' && (
                <span className="p-0.5 rounded-md bg-emerald-100 text-emerald-700 shrink-0" title="Gemini API: Đang hoạt động (Chìa khóa Xanh)">
                  <Key className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                </span>
              )}
              {geminiKeyStatus === 'invalid' && (
                <span className="p-0.5 rounded-md bg-rose-100 text-rose-700 shrink-0" title="Gemini API: Không còn API hoạt động (Chìa khóa Đỏ)">
                  <Key className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                </span>
              )}

              {/* Biểu tượng hình người */}
              <User className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span className="font-bold truncate max-w-[120px] sm:max-w-[180px]">
                {activeConnectedAccount}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${showAccountDropdown ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown xổ xuống chứa: Tài khoản, Vai trò, Điểm Kim cương, Điểm Tim, Cấu hình Gemini API, Đăng xuất/Đăng nhập */}
            {showAccountDropdown && (
              <div
                id="header-account-dropdown-menu"
                className="absolute right-0 top-full mt-2 w-72 bg-white border border-slate-200 rounded-2xl p-3.5 shadow-2xl space-y-3 z-[60] text-slate-800 animate-scale-up"
              >
                {/* Header tài khoản trong dropdown */}
                <div className="border-b border-slate-100 pb-2.5">
                  <div className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider flex items-center justify-between">
                    <span>Tài khoản {isConnected ? 'kết nối' : 'trải nghiệm'}</span>
                    {geminiKeyStatus === 'active' && (
                      <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                        <Key className="w-2.5 h-2.5" /> API Xanh
                      </span>
                    )}
                    {geminiKeyStatus === 'invalid' && (
                      <span className="text-[10px] text-rose-600 font-bold bg-rose-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                        <Key className="w-2.5 h-2.5" /> API Đỏ
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-bold text-slate-900 truncate mt-0.5">
                    {activeConnectedAccount}
                  </div>
                </div>

                {/* 1. Vai trò của tài khoản */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-500 block">
                    Vai trò tài khoản:
                  </label>
                  <select
                    id="select-user-role"
                    value={currentRole}
                    onChange={e => {
                      onChangeRole(e.target.value as UserRole);
                    }}
                    title={availableRoles.length > 1 ? "Chọn vai trò để chuyển đổi giao diện hiển thị" : "Vai trò của tài khoản"}
                    className="w-full bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-bold py-2 px-2.5 rounded-xl border border-slate-200 shadow-2xs focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    {availableRoles.map(role => (
                      <option key={role} value={role}>
                        {ROLE_LABELS[role] || role}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Điểm kim cương & điểm Tim */}
                <div className="grid grid-cols-2 gap-2 pt-0.5">
                  <div className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                    <span className="text-base leading-none">💎</span>
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase font-semibold">Kim cương</div>
                      <div className="font-mono font-bold text-slate-900">
                        {currentUserProfile?.diamonds !== undefined ? currentUserProfile.diamonds : 0}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                    <span className="text-base leading-none">❤️</span>
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase font-semibold">Điểm Tim</div>
                      <div className="font-mono font-bold text-slate-900">
                        {currentUserProfile?.hearts !== undefined ? currentUserProfile.hearts : 0}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Nút Quản lý API */}
                <div className="pt-1 border-t border-slate-100">
                  <button
                    id="btn-header-gemini-api"
                    type="button"
                    onClick={() => {
                      setShowAccountDropdown(false);
                      setShowGeminiModal(true);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 transition-colors cursor-pointer"
                    title="Quản lý danh sách khóa Gemini API sử dụng cho các chức năng thông minh"
                  >
                    <div className="flex items-center gap-2">
                      <Key className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span>Quản lý API</span>
                    </div>
                    {geminiKeyCount > 0 ? (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black text-white ${geminiKeyStatus === 'active' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
                        {geminiKeyCount} key
                      </span>
                    ) : (
                      <span className="text-[10px] text-indigo-500 font-semibold italic">
                        Chưa có
                      </span>
                    )}
                  </button>
                </div>

                {/* 3.5. Nút Cấu hình & Đồng bộ Firebase LopU */}
                <div className="pt-0.5">
                  <button
                    id="btn-header-dropdown-firebase"
                    onClick={() => {
                      setShowAccountDropdown(false);
                      if (onOpenFirebaseModal) onOpenFirebaseModal();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold bg-amber-50/80 hover:bg-amber-100 text-amber-950 border border-amber-200/90 transition-colors cursor-pointer"
                    title="Cấu hình kết nối Firebase LopU và đồng bộ dữ liệu đám mây"
                  >
                    <div className="flex items-center gap-2">
                      <Database className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>Firebase LopU</span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-amber-200 text-amber-900">
                      lopu-ddf22
                    </span>
                  </button>
                </div>

                {/* 4. Nút Đăng nhập / Đăng xuất */}
                <div className="pt-0.5">
                  {!isConnected ? (
                    <button
                      id="btn-header-dropdown-login"
                      onClick={() => {
                        setShowAccountDropdown(false);
                        const loginFn = onSignInGoogle || onConnectDrive;
                        if (loginFn) loginFn();
                      }}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors cursor-pointer"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>Đăng nhập Google</span>
                    </button>
                  ) : (
                    <button
                      id="btn-header-google-signout"
                      onClick={() => {
                        setShowAccountDropdown(false);
                        onSignOut && onSignOut();
                      }}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span>Đăng xuất</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal quản lý danh sách Gemini API Key (Bọc createPortal, padding-top đảm bảo không bị che khuất trên đầu) */}
      {showGeminiModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[99999] overflow-y-auto bg-slate-900/60 backdrop-blur-sm animate-fade-in flex items-start justify-center p-4 sm:p-6 pt-16 sm:pt-20">
          <div className="bg-white rounded-2xl shadow-2xl border border-indigo-100 max-w-lg w-full p-5 sm:p-6 space-y-4 animate-scale-up relative my-4 sm:my-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
                  <Key className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-base">Quản lý API</h3>
                  <p className="text-xs text-slate-500">Khóa API sử dụng cho các chức năng trợ lý và xử lý thông minh</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGeminiModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                title="Đóng cửa sổ"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">
                Danh sách API Keys:
              </label>
              <textarea
                value={geminiKeysInput}
                onChange={(e) => setGeminiKeysInput(e.target.value)}
                placeholder="Nhập 1 hoặc nhiều API keys. Cách nhau bởi dấu phẩy (,), dấu chấm phẩy (;) hoặc mỗi API một dòng..."
                rows={5}
                className="w-full p-3 text-xs font-mono border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50/50"
              />
              <div className="text-[11px] text-slate-500 flex items-center justify-between">
                <span>💡 Hỗ trợ ngăn cách bằng dấu <code>,</code> hoặc <code>;</code> hoặc mỗi key 1 dòng.</span>
                <span className="font-bold text-indigo-600">
                  Đã nhập: {geminiKeysInput.split(/[\n,;]+/).filter(k => k.trim()).length} key
                </span>
              </div>
            </div>

            {/* Trạng thái hiển thị biểu tượng Chìa khóa */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700">Trạng thái biểu tượng chìa khóa:</span>
                {geminiKeyStatus === 'active' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Chìa khóa XANH (Có API hoạt động)
                  </span>
                )}
                {geminiKeyStatus === 'invalid' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[11px]">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    Chìa khóa ĐỎ (Không còn API hoạt động)
                  </span>
                )}
                {geminiKeyStatus === 'none' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-600 font-medium text-[11px]">
                    Ẩn chìa khóa (Chưa có danh sách API)
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-500 flex items-center gap-2 pt-1 border-t border-slate-200/60">
                <span>Kiểm tra trạng thái nhanh:</span>
                <button
                  type="button"
                  onClick={() => {
                    localStorage.setItem('lopu_gemini_api_status', 'active');
                    setGeminiKeyStatus('active');
                    window.dispatchEvent(new Event('gemini_keys_updated'));
                  }}
                  className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold hover:bg-emerald-100 cursor-pointer"
                >
                  🟢 Đặt Khóa Xanh
                </button>
                <button
                  type="button"
                  onClick={() => {
                    localStorage.setItem('lopu_gemini_api_status', 'invalid');
                    setGeminiKeyStatus('invalid');
                    window.dispatchEvent(new Event('gemini_keys_updated'));
                  }}
                  className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded text-[10px] font-bold hover:bg-rose-100 cursor-pointer"
                >
                  🔴 Đặt Khóa Đỏ
                </button>
              </div>
            </div>

            {savedGeminiNotice && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{savedGeminiNotice}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowGeminiModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 border border-slate-200 cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={handleSaveGeminiKeys}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Lưu khóa API</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </header>
  );
};
