import React, { useMemo, useState } from 'react';
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
}) => {
  const [showAccountDropdown, setShowAccountDropdown] = useState<boolean>(false);
  const meta = getViewMeta(activeView);

  const isConnected = Boolean(isDriveConnected || firebaseUser);
  const activeConnectedAccount = firebaseUser?.email || currentUserProfile?.email || (isDriveConnected ? driveEmail : '') || 'tanbaodl@gmail.com';

  // Danh sách các vai trò trải nghiệm trong hệ thống
  const availableRoles: UserRole[] = useMemo(() => {
    return Object.keys(ROLE_LABELS) as UserRole[];
  }, []);

  return (
    <header
      id="app-main-header"
      className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs"
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
          {/* Firestore indicator */}
          <div
            id="badge-firestore-status"
            title={isFirestoreLive ? 'Firestore: Đang đồng bộ thời gian thực' : 'Firestore: Chế độ offline-first'}
            className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-900 border border-amber-200"
          >
            <Database className="w-3.5 h-3.5 text-amber-600" />
            <span>Firestore</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>

          {/* Cụm gôm các mục theo yêu cầu: Đăng nhập khi chưa kết nối, hoặc [tài khoản kết nối] kèm dropdown khi đã kết nối */}
          {!isConnected ? (
            /* Khi chưa kết nối tài khoản Google: CHỈ có chữ Đăng nhập */
            <button
              id="btn-header-login"
              onClick={onSignInGoogle || onConnectDrive}
              title="Đăng nhập tài khoản Google"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Đăng nhập</span>
            </button>
          ) : (
            /* Khi đã kết nối: [tài khoản kết nối] (bỏ chữ Drive:) và dropdown xổ xuống */
            <div className="relative">
              <button
                id="btn-header-account-cluster"
                onClick={() => setShowAccountDropdown(prev => !prev)}
                title={`Tài khoản kết nối: ${activeConnectedAccount}`}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 shadow-2xs transition-all cursor-pointer"
              >
                <User className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span className="font-bold truncate max-w-[120px] sm:max-w-[180px]">
                  {activeConnectedAccount}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${showAccountDropdown ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown xổ xuống chứa: Vai trò, Điểm Kim cương, Điểm Tim, Đăng xuất */}
              {showAccountDropdown && (
                <div
                  id="header-account-dropdown-menu"
                  className="absolute right-0 top-full mt-2 w-72 bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xl space-y-3 z-50 text-slate-800"
                >
                  {/* Header tài khoản trong dropdown */}
                  <div className="border-b border-slate-100 pb-2.5">
                    <div className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">
                      Tài khoản kết nối
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

                  {/* 3. Nút Đăng xuất */}
                  <div className="pt-1 border-t border-slate-100">
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
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
