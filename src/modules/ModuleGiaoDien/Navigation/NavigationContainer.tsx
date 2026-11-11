import React, { useEffect, Suspense, lazy } from 'react';
import { ViewId, getViewMeta } from './menuConfig';
import { UserRole, UserProfile } from '../../../services/storageTypes';
import { ShieldAlert, Lock, ArrowLeft, Loader2 } from 'lucide-react';
import type { RailMarker, RailLineItem, PptSlideItem, PptRailClickMenuData } from '../modulePPT';

export type { RailMarker, RailLineItem, PptSlideItem, PptRailClickMenuData };

// =====================================================================
// Nạp động (Lazy-loading) từng module độc lập:
// Mỗi phân hệ nằm trong 1 chunk riêng biệt, tải khi cần (giảm bundle size)
// =====================================================================

// Phân hệ 1: Học tập (ModuleHocSinh)
const LopHocView = lazy(() =>
  import('../../ModuleHocSinh').then((m) => ({ default: m.LopHocView }))
);
const SoDoLopView = lazy(() =>
  import('../../ModuleHocSinh').then((m) => ({ default: m.SoDoLopView }))
);
const ThoiKhoaBieuView = lazy(() =>
  import('../../ModuleHocSinh').then((m) => ({ default: m.ThoiKhoaBieuView }))
);

// Phân hệ 2: Giảng dạy (ModuleGiaoVien)
const WordSoanThaoView = lazy(() =>
  import('../../ModuleGiaoVien/SoanThao/WordSoanThaoView').then((m) => ({ default: m.WordSoanThaoView }))
);
const QuanLyDriveView = lazy(() =>
  import('../../ModuleGiaoVien').then((m) => ({ default: m.QuanLyDriveView }))
);
const PhatHanhTaiLieuView = lazy(() =>
  import('../../ModuleGiaoVien').then((m) => ({ default: m.PhatHanhTaiLieuView }))
);
const DayHocInteractiveView = lazy(() =>
  import('../../ModuleGiaoVien').then((m) => ({ default: m.DayHocInteractiveView }))
);

// Phân hệ 3: Quản trị & Báo cáo Giám sát (ModuleQuanTri)
const BaoCaoGiamSatView = lazy(() =>
  import('../../ModuleQuanTri').then((m) => ({ default: m.BaoCaoGiamSatView }))
);
const QuanLyNguoiDungView = lazy(() =>
  import('../../ModuleQuanTri').then((m) => ({ default: m.QuanLyNguoiDungView }))
);
const PhanQuyenLopHocView = lazy(() =>
  import('../../ModuleQuanTri').then((m) => ({ default: m.PhanQuyenLopHocView }))
);
const QuanLyThietBiView = lazy(() =>
  import('../../ModuleQuanTri').then((m) => ({ default: m.QuanLyThietBiView }))
);

// Phân hệ 4: Hướng dẫn Web & Trợ lý Prompt (ModuleGiaoDien)
const HuongDanWebView = lazy(() =>
  import('../HuongDanWeb').then((m) => ({ default: m.HuongDanWebView }))
);
const PhanTichLenh = lazy(() =>
  import('../HuongDanWeb').then((m) => ({ default: m.PhanTichLenh }))
);
const LuuPromptChuanView = lazy(() =>
  import('../HuongDanWeb').then((m) => ({ default: m.LuuPromptChuanView }))
);

// Spinner nạp module mượt mà
const ModuleLoadingFallback: React.FC = () => (
  <div className="flex flex-col items-center justify-center min-h-[360px] p-8 text-center space-y-3">
    <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
    <p className="text-sm font-semibold text-slate-600">Đang tải phân hệ...</p>
  </div>
);

/**
 * Trợ giúp trích xuất danh sách tất cả các vai trò trải nghiệm trong ứng dụng.
 * Hỗ trợ chuyển đổi nhanh vai trò trải nghiệm từ dropdown Vai trò tài khoản.
 */
export function getUserAssignedRoles(profile?: UserProfile | null): UserRole[] {
  return [
    'superadmin',
    'admin',
    'manager',
    'teacher',
    'assistant',
    'student',
    'parent',
    'guest',
  ];
}

/**
 * Kiểm tra xem vai trò hiện tại có quyền truy cập vào ViewId này không.
 */
export function isViewAllowedForRole(viewId: ViewId, role: UserRole): boolean {
  // 1. Phân hệ Hướng dẫn Web (guide-*): chỉ Superadmin
  if (viewId === 'guide-tree' || viewId === 'guide-prompt-assistant' || viewId === 'guide-prompts-saved') {
    return role === 'superadmin';
  }

  // 2. Phân hệ Quản trị & Báo cáo (settings-*, reports-*): Superadmin và Admin
  if (viewId === 'settings-users' || viewId === 'reports-progress') {
    return role === 'superadmin' || role === 'admin';
  }

  // 3. Phân hệ Nghiệp vụ Giảng dạy (teaching-*): Superadmin, Admin, Manager, Teacher
  // Riêng "teaching-soanthao" (Tài liệu): Học sinh cũng được phép mở xem tài liệu
  if (viewId === 'teaching-soanthao') {
    return true;
  }

  if (
    viewId === 'settings-permissions' ||
    viewId === 'teaching-monetization'
  ) {
    return (
      role === 'superadmin' ||
      role === 'admin' ||
      role === 'manager' ||
      role === 'teacher'
    );
  }

  // 4. Phân hệ Không gian Học tập (learning-*): Cho phép tất cả các vai trò
  return true;
}

export interface NavigationContainerProps {
  activeView: ViewId;
  currentRole: UserRole;
  onOpenDriveConnect: () => void;
  onNavigateToView?: (viewId: ViewId) => void;
  driveEmail?: string;
  onChangeRole?: (role: UserRole) => void;
  currentUserProfile?: UserProfile | null;
  firebaseUser?: any;
}

export const NavigationContainer: React.FC<NavigationContainerProps> = ({
  activeView,
  currentRole,
  onOpenDriveConnect,
  onNavigateToView,
  driveEmail = '',
  onChangeRole,
  currentUserProfile,
  firebaseUser,
}) => {
  const meta = getViewMeta(activeView);
  const viewTitle = meta.title;

  // Tự động chuyển sang cửa sổ Soạn thảo Word khi mở tài liệu từ module TÀI LIỆU
  useEffect(() => {
    const handleOpenWordDoc = () => {
      if (onNavigateToView) {
        onNavigateToView('teaching-soanthao');
      }
    };
    window.addEventListener('app-open-word-document', handleOpenWordDoc);
    return () => {
      window.removeEventListener('app-open-word-document', handleOpenWordDoc);
    };
  }, [onNavigateToView]);

  // Kiểm tra quyền truy cập theo vai trò hiện hành
  const isAllowed = isViewAllowedForRole(activeView, currentRole);

  if (!isAllowed) {
    const ROLE_TITLES: Record<UserRole, string> = {
      superadmin: 'Superadmin',
      admin: 'Quản trị viên',
      manager: 'Quản lý môn',
      teacher: 'Giáo viên',
      assistant: 'Trợ giảng',
      student: 'Học sinh',
      parent: 'Phụ huynh',
      guest: 'Khách',
    };

    return (
      <div
        id="panel-permission-restricted"
        className="max-w-xl mx-auto my-12 p-6 sm:p-8 bg-white border border-rose-200 rounded-3xl shadow-lg text-center space-y-4"
      >
        <div className="w-14 h-14 bg-rose-50 border border-rose-100 rounded-2xl flex items-center justify-center mx-auto text-rose-600">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <div>
          <h2 className="text-lg font-black text-slate-900">
            Giới Hạn Quyền Truy Cập
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            Vai trò hiện hành <span className="font-bold text-rose-600">[{ROLE_TITLES[currentRole] || currentRole}]</span> không có quyền truy cập vào mục{' '}
            <span className="font-bold text-slate-900">"{viewTitle}"</span>.
          </p>
        </div>

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-left text-xs text-slate-600 space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-slate-700">
            <Lock className="w-3.5 h-3.5 text-slate-500" />
            <span>Chính sách kiểm soát phân quyền:</span>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-500">
            Khi chuyển đổi vai trò ở menu tài khoản, hệ thống áp dụng nghiêm ngặt các giới hạn hiển thị và nội dung tương ứng với vai trò đó để đảm bảo tính phân quyền chặt chẽ.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
          {onChangeRole && (
            <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-600">Chuyển vai trò:</span>
              <select
                id="select-restricted-role-switcher"
                value={currentRole}
                onChange={(e) => onChangeRole(e.target.value as UserRole)}
                className="bg-white text-slate-800 text-xs font-bold py-1 px-2 rounded-lg border border-slate-300 shadow-2xs focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                {Object.entries(ROLE_TITLES).map(([r, title]) => (
                  <option key={r} value={r}>
                    {title}
                  </option>
                ))}
              </select>
            </div>
          )}
          {onNavigateToView && (
            <button
              onClick={() => onNavigateToView('learning-classes')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors cursor-pointer shadow-xs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Về Không gian Học tập</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // Render view khi đã được phép
  const renderView = () => {
    switch (activeView) {
      // Module 4: Giao diện & Hướng dẫn Web (ModuleGiaoDien)
      case 'guide-tree':
        return <HuongDanWebView currentRole={currentRole} onNavigateToView={onNavigateToView} />;
      case 'guide-prompt-assistant':
        return <PhanTichLenh onNavigateToView={onNavigateToView} />;
      case 'guide-prompts-saved': {
        if (currentRole !== 'superadmin') {
          return (
            <div className="p-8 text-center bg-rose-50 text-rose-700 font-bold border border-rose-200 rounded-2xl max-w-md mx-auto mt-10 shadow-xs">
              Quyền truy cập bị từ chối! Phân hệ này chỉ dành riêng cho Superadmin.
            </div>
          );
        }
        return <LuuPromptChuanView />;
      }

      // Module 1: Không gian Học tập (ModuleHocSinh)
      case 'learning-classes':
        return (
          <LopHocView
            currentRole={currentRole}
            currentUserProfile={currentUserProfile}
            firebaseUser={firebaseUser}
          />
        );
      case 'learning-seating':
        return <SoDoLopView currentRole={currentRole} onOpenDriveConnect={onOpenDriveConnect} />;
      case 'learning-schedule':
        return <ThoiKhoaBieuView currentRole={currentRole} onOpenDriveConnect={onOpenDriveConnect} />;

      // Module 2: Nghiệp vụ Giảng dạy & Lớp học (ModuleGiaoVien)
      case 'teaching-soanthao':
        return <WordSoanThaoView currentRole={currentRole} />;
      case 'teaching-drive':
        return <QuanLyDriveView />;
      case 'teaching-monetization':
        return <PhatHanhTaiLieuView />;
      case 'teaching-interactive':
        return <DayHocInteractiveView />;

      // Module 3: Quản trị & Báo cáo Giám sát (ModuleQuanTri)
      case 'reports-progress':
        return <BaoCaoGiamSatView />;
      case 'settings-users':
        return (
          <QuanLyNguoiDungView
            currentRole={currentRole}
            onNavigateToView={onNavigateToView}
            driveEmail={driveEmail}
            onOpenDriveConnect={onOpenDriveConnect}
            onChangeRole={onChangeRole}
          />
        );
      case 'settings-permissions':
        return <PhanQuyenLopHocView currentRole={currentRole} />;
      case 'settings-devices':
        return <QuanLyThietBiView />;

      default:
        return (
          <LopHocView
            currentRole={currentRole}
            currentUserProfile={currentUserProfile}
            firebaseUser={firebaseUser}
          />
        );
    }
  };

  return (
    <Suspense fallback={<ModuleLoadingFallback />}>
      {renderView()}
    </Suspense>
  );
};
