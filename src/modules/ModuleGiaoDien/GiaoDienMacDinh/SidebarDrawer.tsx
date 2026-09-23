import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  ChevronDown,
  ChevronRight,
  School,
  Database,
  Cloud,
  CheckCircle2,
} from 'lucide-react';
import { MENU_GROUPS, ViewId } from '../Navigation';
import { UserRole } from '../../../services/storageTypes';

interface SidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeView: ViewId;
  onSelectView: (viewId: ViewId) => void;
  currentRole: UserRole;
  onChangeRole: (role: UserRole) => void;
  isDriveConnected: boolean;
  driveEmail: string;
  isFirestoreLive: boolean;
  onConnectDrive: () => void;
}

export const SidebarDrawer: React.FC<SidebarDrawerProps> = ({
  isOpen,
  onClose,
  activeView,
  onSelectView,
  currentRole,
  onChangeRole,
  isDriveConnected,
  driveEmail,
  isFirestoreLive,
  onConnectDrive,
}) => {
  const isDevEmail = driveEmail === 'tanbaobg@gmail.com' || driveEmail === 'tanbaodl@gmail.com' || driveEmail === 'teacher.google@lopu.edu.vn';

  const filteredMenuGroups = useMemo(() => {
    return MENU_GROUPS.filter(group => {
      // 1. Chỉ superadmin mới thấy: Hướng dẫn web và sơ đồ cây (Sơ đồ cây module, phân tích & tạo lệnh AI; kho prompt chuẩn)
      if (group.id === 'guide') {
        return currentRole === 'superadmin';
      }
      // 2. Admin và superadmin thấy: Quản trị tài khoản và phân quyền
      if (group.id === 'settings' || group.id === 'reports') {
        return currentRole === 'superadmin' || currentRole === 'admin';
      }
      // 3. Giáo viên trở lên mới thấy: Nghiệp vụ giảng dạy
      if (group.id === 'teaching') {
        return (
          currentRole === 'superadmin' ||
          currentRole === 'admin' ||
          currentRole === 'manager' ||
          currentRole === 'teacher'
        );
      }
      // Mặc định (Không gian học tập): Tất cả vai trò đều thấy
      return true;
    }).map(group => {
      return {
        ...group,
        subItems: group.subItems.filter(sub => {
          if (sub.id === 'guide-prompts-saved') {
            return currentRole === 'superadmin';
          }
          return true;
        })
      };
    }).filter(group => group.subItems.length > 0);
  }, [currentRole]);

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => ({
    learning: true,
    teaching: true,
    reports: false,
    settings: false,
    guide: true,
  }));

  useEffect(() => {
    if (isOpen) {
      const activeGroup = filteredMenuGroups.find(g =>
        g.subItems.some(sub => sub.id === activeView)
      );
      if (activeGroup) {
        setExpandedGroups(prev => ({
          ...prev,
          [activeGroup.id]: true,
        }));
      }
    }
  }, [isOpen, activeView, filteredMenuGroups]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const handleItemClick = (viewId: ViewId) => {
    onSelectView(viewId);
    onClose();
  };

  return (
    <>
      {/* 1. Backdrop overlay */}
      <div
        id="sidebar-backdrop"
        onClick={onClose}
        aria-hidden={!isOpen}
        className={`fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs transition-opacity duration-300 ease-in-out ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* 2. Sidebar Drawer */}
      <aside
        id="sidebar-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Thanh điều hướng chính LopU"
        className={`fixed top-0 left-0 bottom-0 z-50 w-80 max-w-[85vw] bg-white border-r border-slate-200 shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-700 flex items-center justify-center text-white shadow-md shadow-indigo-200">
              <School className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xl tracking-tight text-slate-900 font-sans">
                  Lop<span className="text-indigo-600">U</span>
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 tracking-wide">
                  ROLES
                </span>
              </div>
              <p className="text-xs text-slate-700">Kiến trúc Phân hệ 4 Module</p>
            </div>
          </div>

          <button
            id="btn-close-sidebar"
            onClick={onClose}
            aria-label="Đóng thanh điều hướng"
            className="p-2 rounded-lg text-slate-600 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Accordion Menu List (Level 1 & Level 2) */}
        <nav
          id="sidebar-accordion-nav"
          className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5 divide-y divide-slate-100"
        >
          {filteredMenuGroups.map(group => {
            const isExpanded = expandedGroups[group.id] ?? false;
            const GroupIcon = group.icon;
            const hasActiveChild = group.subItems.some(item => item.id === activeView);

            return (
              <div key={group.id} className="pt-2 first:pt-0">
                {/* Level 1: Accordion Header */}
                <button
                  id={`accordion-group-${group.id}`}
                  onClick={() => toggleGroup(group.id)}
                  aria-expanded={isExpanded}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-bold tracking-tight transition-all select-none cursor-pointer ${
                    hasActiveChild
                      ? 'text-indigo-900 bg-indigo-50/70'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`p-1 rounded-md ${
                        hasActiveChild ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <GroupIcon className="w-4 h-4" />
                    </span>
                    <span className="text-left">{group.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-full">
                      {group.subItems.length}
                    </span>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-slate-600 transition-transform duration-200" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-600 transition-transform duration-200" />
                    )}
                  </div>
                </button>

                {/* Level 2: Accordion Sub-items */}
                {isExpanded && (
                  <div className="mt-1 ml-3 pl-3 border-l-2 border-slate-200 space-y-0.5">
                    {group.subItems.map(subItem => {
                      const isSelected = activeView === subItem.id;
                      const SubIcon = subItem.icon;

                      return (
                        <button
                          key={subItem.id}
                          id={`nav-item-${subItem.id}`}
                          onClick={() => handleItemClick(subItem.id)}
                          className={`w-full text-left flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all group cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-600 text-white shadow-xs font-bold'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <SubIcon
                              className={`w-3.5 h-3.5 shrink-0 ${
                                isSelected ? 'text-white' : 'text-slate-600 group-hover:text-indigo-600'
                              }`}
                            />
                            <span className="truncate">{subItem.label}</span>
                          </div>

                          {subItem.badge && (
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium shrink-0 ml-1.5 ${
                                isSelected
                                  ? 'bg-white/20 text-white'
                                  : 'bg-slate-200/70 text-slate-600 group-hover:bg-indigo-100 group-hover:text-indigo-700'
                              }`}
                            >
                              {subItem.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Drawer Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600 px-1">
            Hạ tầng Hybrid Sync
          </div>

          <div className="flex items-center justify-between px-2.5 py-1.5 rounded-md bg-white border border-slate-200 text-xs">
            <div className="flex items-center gap-2 text-slate-700">
              <Database className="w-3.5 h-3.5 text-amber-600" />
              <span className="font-medium">Firestore</span>
            </div>
            <span
              className={`flex items-center gap-1 text-[11px] font-semibold ${
                isFirestoreLive ? 'text-emerald-600' : 'text-slate-600'
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              {isFirestoreLive ? 'Đang kết nối' : 'Offline-First'}
            </span>
          </div>

          <div className="flex items-center justify-between px-2.5 py-1.5 rounded-md bg-white border border-slate-200 text-xs">
            <div className="flex items-center gap-2 text-slate-700">
              <Cloud className="w-3.5 h-3.5 text-blue-600" />
              <span className="font-medium truncate max-w-[90px]">Google Drive</span>
            </div>
            {isDriveConnected ? (
              <button
                onClick={onConnectDrive}
                className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 cursor-pointer"
                title="Google Drive đã kết nối và sẵn sàng đồng bộ. Bấm để xem chi tiết."
              >
                <CheckCircle2 className="w-3 h-3" />
                Đã kết nối
              </button>
            ) : (
              <button
                id="btn-drawer-connect-drive"
                onClick={onConnectDrive}
                className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-blue-600 cursor-pointer"
                title="Chưa kết nối Google Drive. Bấm để đăng nhập và kết nối."
              >
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                Chưa kết nối
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
