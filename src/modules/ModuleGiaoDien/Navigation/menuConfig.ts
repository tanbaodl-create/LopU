import React from 'react';
import {
  GraduationCap,
  Users,
  Calendar,
  Search,
  BookOpen,
  FolderLock,
  LineChart,
  UserCog,
  KeyRound,
  LayoutGrid,
  ClipboardList,
  Network,
  Zap,
} from 'lucide-react';

export type ViewId =
  | 'learning-classes'
  | 'learning-seating'
  | 'learning-schedule'
  | 'learning-join'
  | 'teaching-management'
  | 'teaching-documents'
  | 'teaching-students'
  | 'reports-progress'
  | 'settings-users'
  | 'settings-permissions'
  | 'guide-tree'
  | 'guide-prompt-assistant';

export interface SubMenuItem {
  id: ViewId;
  label: string;
  badge?: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

export interface MenuGroup {
  id: 'learning' | 'teaching' | 'reports' | 'settings' | 'guide';
  moduleName: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  subItems: SubMenuItem[];
}

export const MENU_GROUPS: MenuGroup[] = [
  {
    id: 'learning',
    moduleName: 'Module 1: Không gian Học tập (ModuleHocSinh)',
    label: 'Không gian Học tập',
    icon: GraduationCap,
    subItems: [
      {
        id: 'learning-classes',
        label: 'Lớp học & Bài giảng',
        badge: 'Chính',
        icon: BookOpen,
        description: 'Tích hợp dropdown chọn lớp, xem bài giảng mở khóa và tiến độ cá nhân',
      },
      {
        id: 'learning-seating',
        label: 'Sơ đồ lớp',
        badge: 'Drive',
        icon: LayoutGrid,
        description: 'Bản đồ vị trí chỗ ngồi học sinh trực quan và đồng bộ Google Drive',
      },
      {
        id: 'learning-schedule',
        label: 'Thời khóa biểu',
        badge: 'Lịch tuần',
        icon: Calendar,
        description: 'Lịch học các tiết trong tuần, phòng học và giáo viên phụ trách',
      },
      {
        id: 'learning-join',
        label: 'Tìm lớp & Đăng ký (PIN)',
        badge: 'PIN',
        icon: Search,
        description: 'Tra cứu mã lớp và nhập mã bảo mật PIN để tham gia lớp học mới',
      },
    ],
  },
  {
    id: 'teaching',
    moduleName: 'Module 2: Nghiệp vụ Giảng dạy & Lớp học (ModuleGiaoVien)',
    label: 'Nghiệp vụ Giảng dạy',
    icon: Users,
    subItems: [
      {
        id: 'teaching-management',
        label: 'Quản lý lớp dạy & Sơ đồ lớp',
        badge: 'Excel & Sơ đồ',
        icon: ClipboardList,
        description: 'Xếp chỗ sơ đồ, duyệt mã PIN tham gia và thêm học sinh bằng Excel chống trùng lặp',
      },
      {
        id: 'teaching-documents',
        label: 'Tài liệu & Tủ sách cá nhân',
        badge: 'Drive cá nhân',
        icon: FolderLock,
        description: 'Tủ sách cá nhân & Phát hành bài giảng - lưu trữ Google Drive cá nhân',
      },
      {
        id: 'teaching-students',
        label: 'Sổ điểm & Lưu Drive Giáo viên',
        badge: 'Drive giáo viên',
        icon: LineChart,
        description: 'Bảng điểm số & đánh giá nhận xét - tự động lưu trữ vào Google Drive của giáo viên mở lớp',
      },
    ],
  },
  {
    id: 'reports',
    moduleName: 'Module 3: Quản trị & Báo cáo Giám sát (ModuleQuanTri)',
    label: 'Báo cáo Giám sát',
    icon: LineChart,
    subItems: [
      {
        id: 'reports-progress',
        label: 'Tiến độ học tập & Điểm số',
        badge: 'Thống kê',
        icon: LineChart,
        description: 'Tiến độ hoàn thành bài của học sinh và bảng điểm tổng hợp từng lớp',
      },
    ],
  },
  {
    id: 'settings',
    moduleName: 'Module 3: Quản trị Hệ thống (ModuleQuanTri)',
    label: 'Quản trị Tài khoản & Phân quyền',
    icon: UserCog,
    subItems: [
      {
        id: 'settings-users',
        label: 'Quản lý người dùng & Excel',
        badge: 'Chống trùng',
        icon: UserCog,
        description: 'Quản trị viên thêm trước tài khoản, import Excel chống trùng lặp email/mã HS',
      },
      {
        id: 'settings-permissions',
        label: 'Cấu hình mã PIN & Phân quyền',
        badge: 'Bảo mật',
        icon: KeyRound,
        description: 'Cấu hình mã PIN lớp học, thời hạn và phân quyền hệ thống',
      },
    ],
  },
  {
    id: 'guide',
    moduleName: 'Module 4: Giao diện & Hướng dẫn Web (ModuleGiaoDien)',
    label: 'Hướng dẫn Web & Sơ đồ Cây',
    icon: Network,
    subItems: [
      {
        id: 'guide-tree',
        label: 'Sơ đồ cây Module',
        badge: 'Cấu trúc',
        icon: Network,
        description: 'Sơ đồ cây phân cấp kiến trúc các module chính và module con cùng mô tả chức năng chi tiết',
      },
      {
        id: 'guide-prompt-assistant',
        label: 'Phân tích & Tạo lệnh AI',
        badge: 'Siêu tốc',
        icon: Zap,
        description: 'Nhập yêu cầu tự nhiên, đối chiếu sơ đồ cây và tạo Prompt chuẩn tối ưu sửa nhanh app',
      },
    ],
  },
];

export function getViewMeta(viewId: ViewId): { title: string; category: string; description: string } {
  for (const group of MENU_GROUPS) {
    const item = group.subItems.find(sub => sub.id === viewId);
    if (item) {
      return {
        title: item.label,
        category: group.label,
        description: item.description,
      };
    }
  }
  return {
    title: 'Lớp học & Bài giảng',
    category: 'Không gian Học tập',
    description: 'Quản lý lớp học thông minh LopU',
  };
}
