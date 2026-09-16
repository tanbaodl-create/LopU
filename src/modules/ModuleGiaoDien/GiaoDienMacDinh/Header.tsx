import React from 'react';
import {
  Menu,
  Cloud,
  Database,
  CheckCircle2,
  School,
  Network,
  BookMarked,
} from 'lucide-react';
import { ViewId, getViewMeta } from '../Navigation';
import { UserRole } from '../../../services/storageTypes';

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
  onSelectView,
}) => {
  const meta = getViewMeta(activeView);

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

        {/* Right: Storage Indicators & Role Profile */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Firestore indicator */}
          <div
            id="badge-firestore-status"
            title={isFirestoreLive ? 'Firestore: Đang đồng bộ thời gian thực' : 'Firestore: Chế độ offline-first'}
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-900 border border-amber-200"
          >
            <Database className="w-3.5 h-3.5 text-amber-600" />
            <span>Firestore</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>

          {/* Google Drive Status & Connect */}
          {isDriveConnected ? (
            <div
              id="badge-drive-status"
              title={`Google Drive scope drive.file: ${driveEmail}`}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-800 border border-blue-200"
            >
              <Cloud className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">Drive:</span>
              <span className="font-semibold truncate max-w-[80px] sm:max-w-[120px]">
                {driveEmail.split('@')[0]}
              </span>
              <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
            </div>
          ) : (
            <button
              id="btn-header-connect-drive"
              onClick={onConnectDrive}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors cursor-pointer"
            >
              <Cloud className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Kết nối</span> Drive
            </button>
          )}

          {/* Role selector dropdown */}
          <div className="relative">
            <select
              id="select-user-role"
              value={currentRole}
              onChange={e => onChangeRole(e.target.value as UserRole)}
              className="appearance-none bg-slate-100 hover:bg-slate-200/80 text-slate-800 text-xs font-bold py-1.5 pl-2.5 pr-7 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden cursor-pointer"
            >
              <option value="student">🎓 Học sinh</option>
              <option value="teacher">👨‍🏫 Giáo viên</option>
              <option value="admin">⚙️ Quản trị viên</option>
            </select>
          </div>

          {/* Quick link button: Sơ đồ cây Module */}
          {onSelectView && (
            <button
              id="btn-header-guide-tree"
              onClick={() => onSelectView('guide-tree')}
              title="Xem Sơ đồ cây các Module và Module con"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeView === 'guide-tree'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/60'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Sơ đồ cây</span>
            </button>
          )}

          {/* Quick link button: Kho Prompt Lệnh Chuẩn (Developer Only) */}
          {onSelectView && (driveEmail === 'tanbaobg@gmail.com' || driveEmail === 'tanbaodl@gmail.com' || driveEmail === 'teacher.google@lopu.edu.vn') && (
            <button
              id="btn-header-guide-prompts-saved"
              onClick={() => onSelectView('guide-prompts-saved')}
              title="Kho Prompt Lệnh Chuẩn (Chỉ mở cho Dev)"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeView === 'guide-prompts-saved'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/60 animate-bounce'
              }`}
            >
              <BookMarked className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Kho Prompt</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
