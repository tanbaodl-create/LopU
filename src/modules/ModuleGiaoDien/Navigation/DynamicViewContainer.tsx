import React from 'react';
import { ViewId, getViewMeta } from './menuConfig';
import { UserRole } from '../../../services/storageTypes';
import {
  LopHocView,
  SoDoLopView,
  ThoiKhoaBieuView,
  DangKyLopView,
} from '../../ModuleHocSinh';
import {
  QuanLyLopDayView,
  TaiLieuCaNhanView,
  TheoDoiHocSinhView,
} from '../../ModuleGiaoVien';
import {
  BaoCaoGiamSatView,
  QuanLyNguoiDungView,
  PhanQuyenLopHocView,
} from '../../ModuleQuanTri';
import { GiaoDienHocSinhLayout } from '../GiaoDienHocSinh';
import { GiaoDienGiaoVienLayout } from '../GiaoDienGiaoVien';
import { GiaoDienQuanTriLayout } from '../GiaoDienQuanTri';
import { HuongDanWebView, PhanTichLenh } from '../HuongDanWeb';

interface DynamicViewContainerProps {
  activeView: ViewId;
  currentRole: UserRole;
  onOpenDriveConnect: () => void;
  onNavigateToView?: (viewId: ViewId) => void;
}

export const DynamicViewContainer: React.FC<DynamicViewContainerProps> = ({
  activeView,
  currentRole,
  onOpenDriveConnect,
  onNavigateToView,
}) => {
  const meta = getViewMeta(activeView);
  const viewTitle = meta.title;

  switch (activeView) {
    // Module 4: Giao diện & Hướng dẫn Web (ModuleGiaoDien) -> Sơ đồ cây module & Trợ lý phân tích lệnh
    case 'guide-tree':
      return <HuongDanWebView onNavigateToView={onNavigateToView} />;
    case 'guide-prompt-assistant':
      return <PhanTichLenh onNavigateToView={onNavigateToView} />;

    // Module 1: Không gian Học tập (ModuleHocSinh) -> Giao diện Học sinh
    case 'learning-classes':
      return (
        <GiaoDienHocSinhLayout activeViewTitle={viewTitle}>
          <LopHocView />
        </GiaoDienHocSinhLayout>
      );
    case 'learning-seating':
      return (
        <GiaoDienHocSinhLayout activeViewTitle={viewTitle}>
          <SoDoLopView onOpenDriveConnect={onOpenDriveConnect} />
        </GiaoDienHocSinhLayout>
      );
    case 'learning-schedule':
      return (
        <GiaoDienHocSinhLayout activeViewTitle={viewTitle}>
          <ThoiKhoaBieuView />
        </GiaoDienHocSinhLayout>
      );
    case 'learning-join':
      return (
        <GiaoDienHocSinhLayout activeViewTitle={viewTitle}>
          <DangKyLopView />
        </GiaoDienHocSinhLayout>
      );

    // Module 2: Nghiệp vụ Giảng dạy & Lớp học (ModuleGiaoVien) -> Giao diện Giáo viên
    case 'teaching-management':
      return (
        <GiaoDienGiaoVienLayout activeViewTitle={viewTitle}>
          <QuanLyLopDayView />
        </GiaoDienGiaoVienLayout>
      );
    case 'teaching-documents':
      return (
        <GiaoDienGiaoVienLayout activeViewTitle={viewTitle}>
          <TaiLieuCaNhanView />
        </GiaoDienGiaoVienLayout>
      );
    case 'teaching-students':
      return (
        <GiaoDienGiaoVienLayout activeViewTitle={viewTitle}>
          <TheoDoiHocSinhView />
        </GiaoDienGiaoVienLayout>
      );

    // Module 3: Quản trị & Báo cáo Giám sát (ModuleQuanTri) -> Giao diện Quản trị
    case 'reports-progress':
      return (
        <GiaoDienQuanTriLayout activeViewTitle={viewTitle}>
          <BaoCaoGiamSatView />
        </GiaoDienQuanTriLayout>
      );
    case 'settings-users':
      return (
        <GiaoDienQuanTriLayout activeViewTitle={viewTitle}>
          <QuanLyNguoiDungView />
        </GiaoDienQuanTriLayout>
      );
    case 'settings-permissions':
      return (
        <GiaoDienQuanTriLayout activeViewTitle={viewTitle}>
          <PhanQuyenLopHocView />
        </GiaoDienQuanTriLayout>
      );

    default:
      return (
        <GiaoDienHocSinhLayout activeViewTitle="Không gian học tập">
          <LopHocView />
        </GiaoDienHocSinhLayout>
      );
  }
};

