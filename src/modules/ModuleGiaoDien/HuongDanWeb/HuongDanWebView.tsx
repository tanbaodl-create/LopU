import React, { useState, useMemo } from 'react';
import {
  Network,
  FolderTree,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Search,
  BookOpen,
  GraduationCap,
  Users,
  LineChart,
  ShieldCheck,
  Compass,
  Database,
  Cloud,
  Layers,
  Sparkles,
  LayoutGrid,
  CheckCircle2,
  FolderLock,
  Calendar,
  FileSpreadsheet,
  KeyRound,
  UserCog,
  Eye,
  Zap,
} from 'lucide-react';
import { ViewId } from '../Navigation';
import { PhanTichLenh } from './PhanTichLenh';

interface SubmoduleItem {
  id: string;
  name: string;
  folderPath: string;
  description: string;
  purpose: string;
  viewId?: ViewId;
  icon: React.ComponentType<{ className?: string }>;
  tags: string[];
}

interface ModuleNode {
  id: string;
  code: string;
  name: string;
  roleDescription: string;
  icon: React.ComponentType<{ className?: string }>;
  themeColor: {
    bg: string;
    border: string;
    text: string;
    badge: string;
    cardBg: string;
    accent: string;
  };
  submodules: SubmoduleItem[];
}

interface HuongDanWebViewProps {
  onNavigateToView?: (viewId: ViewId) => void;
}

const MODULE_TREE_DATA: ModuleNode[] = [
  {
    id: 'ModuleHocSinh',
    code: 'src/modules/ModuleHocSinh',
    name: 'Phân hệ Học sinh (ModuleHocSinh)',
    roleDescription: 'Dành cho Học sinh tham gia lớp, làm bài tập, xem lịch và vị trí sơ đồ lớp',
    icon: GraduationCap,
    themeColor: {
      bg: 'bg-sky-50',
      border: 'border-sky-200',
      text: 'text-sky-800',
      badge: 'bg-sky-100 text-sky-700 border-sky-300',
      cardBg: 'hover:border-sky-300 hover:bg-sky-50/40',
      accent: 'bg-sky-600 text-white',
    },
    submodules: [
      {
        id: 'LopHoc',
        name: 'LopHoc (Lớp học & GPS Lớp Học)',
        folderPath: 'src/modules/ModuleHocSinh/LopHoc',
        description: 'Xem danh sách lớp học, lọc bài học đã mở khóa, tích hợp nút "lấy tọa độ GPS" mở Google Maps với 2 tùy chọn lớp bản đồ Mặc định và Vệ tinh, nộp bài tập và cập nhật tiến độ học tập cá nhân.',
        purpose: 'Học tập & GPS lớp học',
        viewId: 'learning-classes',
        icon: BookOpen,
        tags: ['Bài học', 'lấy tọa độ GPS', 'Bản đồ Mặc định & Vệ tinh', 'Tiến độ', 'Sẵn sàng Vercel'],
      },
      {
        id: 'SoDoLop',
        name: 'SoDoLop (Sơ đồ lớp & Drag & Drop Chỗ Ngồi)',
        folderPath: 'src/modules/ModuleHocSinh/SoDoLop',
        description: 'Bản đồ vị trí chỗ ngồi 4 dãy x 5 bàn; hỗ trợ nhập chuỗi học sinh dạng [Họ tên; Biệt danh; Giới tính; Tổ/nhóm; Vai trò; Chức danh], tính năng Kéo Thả (Drag & Drop) trực quan xếp chỗ ngồi và đồng bộ tức thì lên Google Drive & Firestore.',
        purpose: 'Vị trí học tập Drag & Drop',
        viewId: 'learning-seating',
        icon: LayoutGrid,
        tags: ['Kéo thả Drag & Drop', 'Drive & Firestore sync', 'Parse thông tin HS', 'Sơ đồ lớp'],
      },
      {
        id: 'ThoiKhoaBieu',
        name: 'ThoiKhoaBieu (Thời khóa biểu)',
        folderPath: 'src/modules/ModuleHocSinh/ThoiKhoaBieu',
        description: 'Bảng thời khóa biểu 7 cột hoặc 3 cột thu gọn (Hôm nay, Ngày mai, Ngày kia); ô tiết học 3 hàng chi tiết (môn, lớp, GV, giờ, ghi chú), nhãn CK/HT, tự động gộp tiết kề nhau <=20 phút và chọn/nhập lớp.',
        purpose: 'Thời gian biểu',
        viewId: 'learning-schedule',
        icon: Calendar,
        tags: ['Lịch 7 cột / 3 cột', 'CK/HT', 'Kề <=20p', 'Drive export'],
      },
      {
        id: 'DangKyLop',
        name: 'DangKyLop (Tìm lớp & Đăng ký PIN)',
        folderPath: 'src/modules/ModuleHocSinh/DangKyLop',
        description: 'Tra cứu danh sách lớp mở toàn trường, gửi yêu cầu tham gia kèm nhập mã PIN bảo mật do giáo viên cấp.',
        purpose: 'Đăng ký tham gia',
        viewId: 'learning-join',
        icon: Search,
        tags: ['Mã PIN', 'Gia nhập lớp', 'Bảo mật'],
      },
    ],
  },
  {
    id: 'ModuleGiaoVien',
    code: 'src/modules/ModuleGiaoVien',
    name: 'Phân hệ Giáo viên (ModuleGiaoVien)',
    roleDescription: 'Dành cho Giáo viên bộ môn và chủ nhiệm quản lý lớp dạy, điểm danh, tài liệu và sổ điểm',
    icon: Users,
    themeColor: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      text: 'text-emerald-800',
      badge: 'bg-emerald-100 text-emerald-700 border-emerald-300',
      cardBg: 'hover:border-emerald-300 hover:bg-emerald-50/40',
      accent: 'bg-emerald-600 text-white',
    },
    submodules: [
      {
        id: 'QuanLyLopDay',
        name: 'QuanLyLopDay (Quản lý lớp dạy & Học sinh)',
        folderPath: 'src/modules/ModuleGiaoVien/QuanLyLopDay',
        description: 'Giáo viên mở lớp dạy mới, đồng bộ Tên và Biệt danh học sinh vào app khi đăng nhập lần đầu và được duyệt vai trò chính thức (GV/Trợ giảng/HS/PH), hiển thị tọa độ GPS, sắp xếp vị trí chỗ ngồi và duyệt yêu cầu mã PIN.',
        purpose: 'Nghiệp vụ lớp học & GPS học sinh',
        viewId: 'teaching-management',
        icon: CheckCircle2,
        tags: ['Mở lớp dạy', 'Tên & Biệt danh', 'Tọa độ GPS', 'Google Account', 'Sơ đồ lớp'],
      },
      {
        id: 'NhapHocSinh',
        name: 'NhapHocSinh (Nhập & Xóa HS - Excel chống trùng)',
        folderPath: 'src/modules/ModuleGiaoVien/NhapHocSinh',
        description: 'Dịch vụ thêm/xóa học sinh và import Excel/CSV vào lớp dạy với cơ chế định danh Google Account (Email/UID làm khóa chính), tự động chống trùng lặp thông minh.',
        purpose: 'Nhập & Xóa học sinh',
        icon: FileSpreadsheet,
        tags: ['Google UID/Email', 'nhapHocSinhService', 'Thêm/Xóa HS', 'Excel chống trùng'],
      },
      {
        id: 'TheoDoiHocSinh',
        name: 'TheoDoiHocSinh (Sổ điểm & Lưu Drive GV mở lớp)',
        folderPath: 'src/modules/ModuleGiaoVien/TheoDoiHocSinh',
        description: 'Quản lý điểm miệng, 15 phút, 1 tiết, học kỳ; ghi nhận xét và tự động lưu trữ bảng điểm từng lớp trực tiếp trên Google Drive cá nhân của giáo viên mở lớp đó.',
        purpose: 'Đánh giá & Lưu Drive GV',
        viewId: 'teaching-students',
        icon: LineChart,
        tags: ['Sổ điểm', 'Drive GV mở lớp', 'Đánh giá'],
      },
      {
        id: 'TaiLieuCaNhan',
        name: 'TaiLieuCaNhan (Tài liệu dạy học Drive 4 cấp)',
        folderPath: 'src/modules/ModuleGiaoVien/TaiLieuCaNhan',
        description: 'Giáo viên tạo các bộ tài liệu dạy học lưu tự động trên Google Drive cá nhân theo cấu trúc chuẩn 4 cấp độ: Chương ➔ Bài ➔ Vấn đề ➔ Chuyên đề. Đã xóa sạch tài liệu demo mẫu, sẵn sàng soạn bài thật.',
        purpose: 'Kho tài nguyên giáo án Drive',
        viewId: 'teaching-documents',
        icon: FolderLock,
        tags: ['Chương-Bài-Vấn đề-Chuyên đề', 'Sạch dữ liệu demo', 'Google Drive 4 cấp', 'Phát hành lớp'],
      },
    ],
  },
  {
    id: 'ModuleQuanTri',
    code: 'src/modules/ModuleQuanTri',
    name: 'Phân hệ Quản trị & Báo cáo (ModuleQuanTri)',
    roleDescription: 'Dành cho Quản trị viên nhà trường giám sát số liệu, quản lý tài khoản và phân quyền lớp',
    icon: ShieldCheck,
    themeColor: {
      bg: 'bg-indigo-50',
      border: 'border-indigo-200',
      text: 'text-indigo-800',
      badge: 'bg-indigo-100 text-indigo-700 border-indigo-300',
      cardBg: 'hover:border-indigo-300 hover:bg-indigo-50/40',
      accent: 'bg-indigo-600 text-white',
    },
    submodules: [
      {
        id: 'QuanLyNguoiDung',
        name: 'QuanLyNguoiDung (Google Auth, Duyệt vai trò, 14 Trường Thông Tin & GPS)',
        folderPath: 'src/modules/ModuleQuanTri/QuanLyNguoiDung',
        description: 'Đã xóa sạch 13 tài khoản demo (chỉ giữ vĩnh viễn 2 Superadmin). Chuẩn hóa 14 trường thông tin người dùng lưu Firestore (đổi tên trường 7 thành "7. GPS"). Nút "lấy tọa độ GPS" mở trang Google Maps cho phép người dùng nhấp chọn trực tiếp trên bản đồ (tùy chọn lớp Mặc định & Vệ tinh) và xác nhận để tự động lấy tọa độ vị trí vừa chọn.',
        purpose: 'Quản lý tài khoản 14 trường & GPS',
        viewId: 'settings-users',
        icon: UserCog,
        tags: ['14 Trường Firestore', 'Trường 7. GPS', 'lấy tọa độ GPS', 'Bản đồ Mặc định & Vệ tinh', 'Import/Export Excel'],
      },
      {
        id: 'BaoCaoGiamSat',
        name: 'BaoCaoGiamSat (Báo cáo & Giám sát tiến độ học tập)',
        folderPath: 'src/modules/ModuleQuanTri/BaoCaoGiamSat',
        description: 'Tổng hợp thống kê tỷ lệ hoàn thành bài giảng, điểm trung bình và liên kết bảng điểm lưu trữ trên Google Drive của giáo viên từng lớp.',
        purpose: 'Thống kê & Giám sát',
        viewId: 'reports-progress',
        icon: LineChart,
        tags: ['Thống kê', 'Tiến độ', 'Drive GV mở lớp'],
      },
      {
        id: 'PhanQuyenLopHoc',
        name: 'PhanQuyenLopHoc (Phân công GV & PIN bảo mật)',
        folderPath: 'src/modules/ModuleQuanTri/PhanQuyenLopHoc',
        description: 'Cấu hình phân quyền lớp học, phân công Giáo viên phụ trách theo môn học, quản lý mã PIN bảo mật lớp học và điều phối quyền mở lớp cho Quản trị & Quản lý.',
        purpose: 'Phân công GV & Bảo mật lớp',
        viewId: 'settings-permissions',
        icon: KeyRound,
        tags: ['Phân công GV', 'Quản lý môn', 'Mã PIN lớp', 'Bảo mật lớp'],
      },
    ],
  },
  {
    id: 'ModuleGiaoDien',
    code: 'src/modules/ModuleGiaoDien',
    name: 'Phân hệ Giao diện & Điều hướng (ModuleGiaoDien)',
    roleDescription: 'Quản lý bộ khung hiển thị, layout chuyên biệt từng vai trò, điều hướng động và hướng dẫn web',
    icon: Layers,
    themeColor: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-800',
      badge: 'bg-amber-100 text-amber-700 border-amber-300',
      cardBg: 'hover:border-amber-300 hover:bg-amber-50/40',
      accent: 'bg-amber-600 text-white',
    },
    submodules: [
      {
        id: 'GiaoDienMacDinh',
        name: 'GiaoDienMacDinh (Khung Layout, Header, Sidebar)',
        folderPath: 'src/modules/ModuleGiaoDien/GiaoDienMacDinh',
        description: 'Chứa khung layout cơ bản AppLayout, Header sticky có switch vai trò và thanh SidebarDrawer 2 cấp mở rộng.',
        purpose: 'Khung xương ứng dụng',
        icon: Layers,
        tags: ['AppLayout', 'Header', 'SidebarDrawer'],
      },
      {
        id: 'GiaoDienHocSinh',
        name: 'GiaoDienHocSinh (Layout chuyên biệt Học sinh)',
        folderPath: 'src/modules/ModuleGiaoDien/GiaoDienHocSinh',
        description: 'Bọc ngoài các màn hình học sinh với banner không gian học tập trực tuyến, huy hiệu định danh và phong cách dịu mắt.',
        purpose: 'Trải nghiệm Học sinh',
        icon: GraduationCap,
        tags: ['Student Banner', 'Online Status', 'Brand Styling'],
      },
      {
        id: 'GiaoDienGiaoVien',
        name: 'GiaoDienGiaoVien (Layout chuyên biệt Giáo viên)',
        folderPath: 'src/modules/ModuleGiaoDien/GiaoDienGiaoVien',
        description: 'Bọc ngoài các màn hình sư phạm với thông báo quyền giáo viên bộ môn và trạng thái kết nối tủ tài liệu Drive.',
        purpose: 'Trải nghiệm Giáo viên',
        icon: Users,
        tags: ['Teacher Banner', 'Drive Ready', 'Sư phạm'],
      },
      {
        id: 'GiaoDienQuanTri',
        name: 'GiaoDienQuanTri (Layout chuyên biệt Quản trị)',
        folderPath: 'src/modules/ModuleGiaoDien/GiaoDienQuanTri',
        description: 'Bọc ngoài các màn hình quản trị với giao diện tối tương phản cao, chỉ số giám sát phân quyền và an ninh Firestore.',
        purpose: 'Trải nghiệm Quản trị',
        icon: ShieldCheck,
        tags: ['Admin Banner', 'Deduplication Status', 'Dark theme'],
      },
      {
        id: 'Navigation',
        name: 'Navigation (Cấu hình Menu & Dynamic Container)',
        folderPath: 'src/modules/ModuleGiaoDien/Navigation',
        description: 'Định nghĩa menuConfig dạng phân cấp và DynamicViewContainer phân phối view tương ứng với mã ViewId.',
        purpose: 'Bộ điều hướng động',
        icon: Compass,
        tags: ['menuConfig', 'DynamicViewContainer', 'Routing'],
      },
      {
        id: 'HuongDanWeb',
        name: 'HuongDanWeb (Sơ đồ cây & Phân tích tạo lệnh AI)',
        folderPath: 'src/modules/ModuleGiaoDien/HuongDanWeb',
        description: 'Trực quan hóa sơ đồ cây phân cấp toàn bộ module; bộ phân tích lệnh siêu tốc tinh gọn gồm ô nhập yêu cầu, hệ thống tự động bóc tách module và nội dung cụ thể cần sửa, ô prompt chuẩn hóa người dùng sửa được kèm nút copy lệnh.',
        purpose: 'Kiến trúc cây & Phân tích tạo lệnh AI',
        viewId: 'guide-tree',
        icon: Network,
        tags: ['Sơ đồ cây', 'Bóc tách module', 'Nội dung cụ thể', 'Prompt chuẩn hóa', 'Copy lệnh'],
      },
    ],
  },
  {
    id: 'ConnectData',
    code: 'src/modules/ConnectData',
    name: 'Module Kết nối Dữ liệu (ConnectData)',
    roleDescription: 'Phục vụ giao tiếp dữ liệu bên ngoài với 2 kênh trọng yếu: Google Drive cá nhân & Firebase Firestore',
    icon: Database,
    themeColor: {
      bg: 'bg-rose-50',
      border: 'border-rose-200',
      text: 'text-rose-800',
      badge: 'bg-rose-100 text-rose-700 border-rose-300',
      cardBg: 'hover:border-rose-300 hover:bg-rose-50/40',
      accent: 'bg-rose-600 text-white',
    },
    submodules: [
      {
        id: 'ConnectDrive',
        name: 'ConnectDrive (Google Drive API & Cấu trúc 4 cấp)',
        folderPath: 'src/modules/ConnectData/ConnectDrive',
        description: 'Tích hợp Google Drive API lưu trữ bảng điểm lớp học và cây thư mục tài liệu dạy học phân cấp 4 tầng (Chương ➔ Bài ➔ Vấn đề ➔ Chuyên đề) trên Drive của giáo viên.',
        purpose: 'Drive 4 tầng & Bảng điểm GV',
        icon: Cloud,
        tags: ['OAuth GSI', 'Chương-Bài-Vấn đề-Chuyên đề', 'Bảng điểm Drive GV'],
      },
      {
        id: 'ConnectFirestore',
        name: 'ConnectFirestore (Firebase & Khóa chính Google)',
        folderPath: 'src/modules/ConnectData/ConnectFirestore',
        description: 'Hệ thống Firestore thời gian thực với khóa chính là tài khoản Google (Email/UID), phân quyền RBAC 8 vai trò, bảo vệ tài khoản Superadmin và chống trùng lặp tài khoản.',
        purpose: 'Cơ sở dữ liệu tập trung',
        icon: Database,
        tags: ['Google Key', 'RBAC 8 vai trò', 'Superadmin Lock', 'Offline-First'],
      },
    ],
  },
];

export const HuongDanWebView: React.FC<HuongDanWebViewProps> = ({ onNavigateToView }) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedModuleFilter, setSelectedModuleFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'nested-tree' | 'split-explorer' | 'table' | 'prompt-assistant'>('nested-tree');
  const [selectedSubmoduleId, setSelectedSubmoduleId] = useState<string>('LopHoc');
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    ModuleHocSinh: true,
    ModuleGiaoVien: true,
    ModuleQuanTri: true,
    ModuleGiaoDien: true,
    ConnectData: true,
  });

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  const expandAll = () => {
    const allExpanded: Record<string, boolean> = {};
    MODULE_TREE_DATA.forEach(m => {
      allExpanded[m.id] = true;
    });
    setExpandedNodes(allExpanded);
  };

  const collapseAll = () => {
    const allCollapsed: Record<string, boolean> = {};
    MODULE_TREE_DATA.forEach(m => {
      allCollapsed[m.id] = false;
    });
    setExpandedNodes(allCollapsed);
  };

  // Filter logic
  const filteredData = useMemo(() => {
    return MODULE_TREE_DATA.filter(moduleItem => {
      if (selectedModuleFilter !== 'all' && moduleItem.id !== selectedModuleFilter) {
        return false;
      }
      if (!searchTerm.trim()) return true;

      const q = searchTerm.toLowerCase();
      const matchModule =
        moduleItem.name.toLowerCase().includes(q) ||
        moduleItem.code.toLowerCase().includes(q) ||
        moduleItem.roleDescription.toLowerCase().includes(q);

      const matchSub = moduleItem.submodules.some(
        sub =>
          sub.name.toLowerCase().includes(q) ||
          sub.description.toLowerCase().includes(q) ||
          sub.purpose.toLowerCase().includes(q) ||
          sub.tags.some(t => t.toLowerCase().includes(q))
      );

      return matchModule || matchSub;
    }).map(moduleItem => {
      if (!searchTerm.trim()) return moduleItem;
      const q = searchTerm.toLowerCase();
      const filteredSubs = moduleItem.submodules.filter(
        sub =>
          sub.name.toLowerCase().includes(q) ||
          sub.description.toLowerCase().includes(q) ||
          sub.purpose.toLowerCase().includes(q) ||
          sub.tags.some(t => t.toLowerCase().includes(q)) ||
          moduleItem.name.toLowerCase().includes(q)
      );
      return {
        ...moduleItem,
        submodules: filteredSubs.length > 0 ? filteredSubs : moduleItem.submodules,
      };
    });
  }, [searchTerm, selectedModuleFilter]);

  const totalSubmodules = useMemo(() => {
    return MODULE_TREE_DATA.reduce((acc, curr) => acc + curr.submodules.length, 0);
  }, []);

  // Selected submodule detail for explorer mode
  const selectedSubmoduleData = useMemo(() => {
    for (const m of MODULE_TREE_DATA) {
      const found = m.submodules.find(s => s.id === selectedSubmoduleId);
      if (found) return { parent: m, submodule: found };
    }
    return { parent: MODULE_TREE_DATA[0], submodule: MODULE_TREE_DATA[0].submodules[0] };
  }, [selectedSubmoduleId]);

  return (
    <div id="huong-dan-web-container" className="space-y-6">
      {/* Top Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-7 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                <Network className="w-3.5 h-3.5" />
                Kiểu Menu Cây Lồng Nhau (Nested Tree Menu)
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                <Sparkles className="w-3 h-3" />
                5 Module chính • {totalSubmodules} Module con
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Sơ Đồ Cây Module Phân Cấp Lồng Nhau
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Trình bày theo dạng <strong>menu phân cấp lồng nhau (Tree Menu Hierarchy)</strong> liền mạch với các nhánh cây chỉ mục.
              Mỗi module con hiển thị mô tả ngắn gọn vai trò nhiệm vụ, đường dẫn mã nguồn và nút mở xem trải nghiệm trực tiếp.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 self-start md:self-auto">
            <button
              id="btn-expand-all"
              onClick={expandAll}
              className="px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
            >
              Mở rộng tất cả
            </button>
            <button
              id="btn-collapse-all"
              onClick={collapseAll}
              className="px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
            >
              Thu gọn tất cả
            </button>
            <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
              <button
                id="btn-view-nested-tree"
                onClick={() => setViewMode('nested-tree')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  viewMode === 'nested-tree' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                Menu cây lồng nhau
              </button>
              <button
                id="btn-view-split-explorer"
                onClick={() => setViewMode('split-explorer')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  viewMode === 'split-explorer' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                Explorer 2 cột
              </button>
              <button
                id="btn-view-table"
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  viewMode === 'table' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                Dạng bảng
              </button>
              <button
                id="btn-view-prompt-assistant"
                onClick={() => setViewMode('prompt-assistant')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  viewMode === 'prompt-assistant'
                    ? 'bg-amber-500 text-slate-950 font-extrabold shadow-xs'
                    : 'text-amber-400 hover:text-white'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Trợ lý tạo lệnh AI</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="input-search-modules"
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên module, module con, chức năng, thư mục..."
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-colors"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              Xóa
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Lọc phân hệ:</span>
          <select
            id="select-filter-module"
            value={selectedModuleFilter}
            onChange={e => setSelectedModuleFilter(e.target.value)}
            className="text-xs font-semibold bg-slate-100 border border-slate-200 rounded-xl py-2 px-3 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer text-slate-700"
          >
            <option value="all">Tất cả ({MODULE_TREE_DATA.length} Module)</option>
            <option value="ModuleHocSinh">Phân hệ Học sinh (4)</option>
            <option value="ModuleGiaoVien">Phân hệ Giáo viên (4)</option>
            <option value="ModuleQuanTri">Phân hệ Quản trị (3)</option>
            <option value="ModuleGiaoDien">Phân hệ Giao diện (5)</option>
            <option value="ConnectData">Module Kết nối Dữ liệu (2)</option>
          </select>
        </div>
      </div>

      {/* CHẾ ĐỘ 1: MENU CÂY LỒNG NHAU LIỀN MẠCH (NESTED TREE VIEW) */}
      {viewMode === 'nested-tree' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Node gốc (Root Item) */}
          <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
                <FolderTree className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-extrabold text-indigo-300">src/modules/</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-200 border border-indigo-400/20">
                    Gốc hệ thống LopU
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Cấu trúc phẳng không thư mục trung gian • Menu cây phân cấp 2 cấp độ
                </div>
              </div>
            </div>

            <div className="text-xs font-semibold text-slate-400">
              Tổng cộng: <strong className="text-emerald-400">{filteredData.length}</strong> Module chính •{' '}
              <strong className="text-indigo-300">
                {filteredData.reduce((acc, m) => acc + m.submodules.length, 0)}
              </strong>{' '}
              Module con
            </div>
          </div>

          {/* Danh sách các Module cha & con lồng nhau */}
          <div className="p-4 sm:p-6 space-y-3">
            {filteredData.map((moduleNode, modIdx) => {
              const isExpanded = expandedNodes[moduleNode.id] ?? true;
              const IconComp = moduleNode.icon;
              const isLastModule = modIdx === filteredData.length - 1;

              return (
                <div key={moduleNode.id} className="relative">
                  {/* Đường kẻ gióng dọc liên kết giữa các Module cha */}
                  {!isLastModule && (
                    <div className="absolute left-4 top-10 bottom-0 w-0.5 bg-slate-200 pointer-events-none -z-0" />
                  )}

                  {/* Menu Cha Cấp 1 (Parent Module Row) */}
                  <div
                    onClick={() => toggleNode(moduleNode.id)}
                    className={`relative z-10 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 p-3 sm:p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
                      isExpanded
                        ? `${moduleNode.themeColor.bg} ${moduleNode.themeColor.border} shadow-2xs`
                        : 'bg-white hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        type="button"
                        aria-label={isExpanded ? 'Thu gọn' : 'Mở rộng'}
                        className={`w-6 h-6 rounded-md flex items-center justify-center transition-transform shrink-0 ${
                          isExpanded ? 'text-slate-800 bg-white shadow-2xs' : 'text-slate-400 bg-slate-100'
                        }`}
                      >
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>

                      <div
                        className={`w-8 h-8 rounded-lg ${moduleNode.themeColor.accent} flex items-center justify-center shrink-0 shadow-2xs`}
                      >
                        <IconComp className="w-4 h-4" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-slate-900 truncate">
                            {moduleNode.name}
                          </span>
                          <code className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/90 border border-slate-200/80 text-slate-600 font-semibold">
                            {moduleNode.code}
                          </code>
                        </div>
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          {moduleNode.roleDescription}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${moduleNode.themeColor.badge}`}>
                        {moduleNode.submodules.length} Module con
                      </span>
                    </div>
                  </div>

                  {/* Nhánh Menu Con Cấp 2 Lồng Nhau (Nested Submodules) */}
                  {isExpanded && (
                    <div className="relative ml-4 sm:ml-6 pl-5 sm:pl-7 pt-2 pb-1 border-l-2 border-dashed border-indigo-200/80 space-y-2">
                      {moduleNode.submodules.map((sub, subIdx) => {
                        const SubIcon = sub.icon;
                        const hasNavigation = Boolean(sub.viewId && onNavigateToView);
                        const isLastSub = subIdx === moduleNode.submodules.length - 1;

                        return (
                          <div
                            key={sub.id}
                            className="relative group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-slate-50/70 hover:bg-indigo-50/40 border border-slate-200/80 hover:border-indigo-300 transition-all shadow-2xs"
                          >
                            {/* Cành nhánh ngang kết nối (Branch arm ├─) */}
                            <div className="absolute -left-5 sm:-left-7 top-1/2 -translate-y-1/2 w-5 sm:w-7 h-0.5 bg-indigo-200 pointer-events-none" />

                            {/* Cột thông tin chính: Icon, Tên, Mô tả ngắn */}
                            <div className="flex items-start gap-3 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-indigo-600 flex items-center justify-center shrink-0 shadow-2xs mt-0.5 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-colors">
                                <SubIcon className="w-4 h-4" />
                              </div>

                              <div className="space-y-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-indigo-950">
                                    {sub.name}
                                  </span>
                                  <code className="text-[10px] font-mono text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                                    📁 {sub.folderPath}
                                  </code>
                                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                    {sub.purpose}
                                  </span>
                                </div>

                                {/* Mô tả ngắn gọn module con làm gì */}
                                <p className="text-xs text-slate-600 leading-relaxed">
                                  {sub.description}
                                </p>

                                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                                  {sub.tags.map((tag, tIdx) => (
                                    <span
                                      key={tIdx}
                                      className="text-[10px] font-medium bg-white text-slate-500 border border-slate-200/60 px-2 py-0.5 rounded-md"
                                    >
                                      #{tag}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* Nút hành động mở xem */}
                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                              {hasNavigation && sub.viewId && onNavigateToView ? (
                                <button
                                  type="button"
                                  onClick={() => onNavigateToView(sub.viewId!)}
                                  className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-xl shadow-xs transition-colors cursor-pointer"
                                  title={`Chuyển đến màn hình ${sub.name}`}
                                >
                                  <span>Mở xem</span>
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <span className="text-[11px] text-slate-400 font-medium italic px-2 py-1 bg-white border border-slate-200/60 rounded-lg">
                                  Dịch vụ nền
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CHẾ ĐỘ 2: TRÌNH KHÁM PHÁ 2 CỘT (SPLIT EXPLORER VIEW) */}
      {viewMode === 'split-explorer' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[500px]">
          {/* Cột Trái: Cây Menu Lồng Nhau (Collapsible Tree Navigation) */}
          <div className="lg:col-span-5 border-r border-slate-200 p-4 bg-slate-50/50 space-y-2 overflow-y-auto max-h-[650px]">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 px-2 pb-2 border-b border-slate-200 flex items-center justify-between">
              <span>Cây Thư Mục Hệ Thống</span>
              <span className="font-mono text-[10px] text-indigo-600">src/modules/</span>
            </div>

            {filteredData.map(moduleNode => {
              const isExpanded = expandedNodes[moduleNode.id] ?? true;
              const IconComp = moduleNode.icon;

              return (
                <div key={moduleNode.id} className="space-y-1">
                  {/* Module Cha */}
                  <div
                    onClick={() => toggleNode(moduleNode.id)}
                    className="flex items-center justify-between p-2 rounded-xl hover:bg-white cursor-pointer select-none text-xs font-bold text-slate-800 transition-colors"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-slate-400">
                        {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      </span>
                      <IconComp className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span className="truncate">{moduleNode.name.replace(/\(.*?\)/, '')}</span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-200 text-slate-600 font-bold shrink-0">
                      {moduleNode.submodules.length}
                    </span>
                  </div>

                  {/* Module Con lồng nhau */}
                  {isExpanded && (
                    <div className="ml-5 pl-3 border-l-2 border-slate-200 space-y-1">
                      {moduleNode.submodules.map(sub => {
                        const SubIcon = sub.icon;
                        const isSelected = sub.id === selectedSubmoduleId;

                        return (
                          <button
                            key={sub.id}
                            onClick={() => setSelectedSubmoduleId(sub.id)}
                            className={`w-full text-left flex items-center justify-between p-2 rounded-lg text-xs transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-600 text-white font-bold shadow-xs'
                                : 'text-slate-600 hover:bg-white hover:text-slate-900 font-medium'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <SubIcon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                              <span className="truncate">{sub.name.replace(/\(.*?\)/, '')}</span>
                            </div>
                            {sub.viewId && (
                              <span
                                className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                                  isSelected ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-600'
                                }`}
                              >
                                View
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
          </div>

          {/* Cột Phải: Bảng Chi Tiết Module Con Đang Chọn */}
          <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between space-y-6">
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                  <span>{selectedSubmoduleData.parent.name}</span>
                  <span>/</span>
                  <span className="text-indigo-600 font-bold">{selectedSubmoduleData.submodule.name}</span>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {selectedSubmoduleData.submodule.purpose}
                </span>
              </div>

              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs">
                    {React.createElement(selectedSubmoduleData.submodule.icon, { className: 'w-5 h-5' })}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      {selectedSubmoduleData.submodule.name}
                    </h3>
                    <code className="text-xs font-mono text-indigo-600">
                      📁 {selectedSubmoduleData.submodule.folderPath}
                    </code>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2 mt-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    Nhiệm vụ & Chức năng chính:
                  </span>
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                    {selectedSubmoduleData.submodule.description}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Từ khóa & Công nghệ liên quan:
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  {selectedSubmoduleData.submodule.tags.map((t, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Thao tác chuyển tới view */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                {selectedSubmoduleData.submodule.viewId
                  ? 'Module này có màn hình giao diện sẵn sàng tương tác.'
                  : 'Module dịch vụ nền phục vụ kết nối dữ liệu đám mây.'}
              </span>

              {selectedSubmoduleData.submodule.viewId && onNavigateToView && (
                <button
                  type="button"
                  onClick={() => onNavigateToView(selectedSubmoduleData.submodule.viewId!)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer"
                >
                  <span>Mở Màn Hình Trải Nghiệm</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CHẾ ĐỘ 3: BẢNG DANH MỤC TOÀN DIỆN (TABLE VIEW) */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="px-4 py-3.5">Module Cha</th>
                  <th className="px-4 py-3.5">Module Con</th>
                  <th className="px-4 py-3.5">Đường Dẫn Mã Nguồn</th>
                  <th className="px-4 py-3.5">Chức Năng & Nhiệm Vụ Chính</th>
                  <th className="px-4 py-3.5">Mục Đích</th>
                  <th className="px-4 py-3.5 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredData.flatMap(parent =>
                  parent.submodules.map((sub, sIdx) => {
                    const SubIcon = sub.icon;
                    return (
                      <tr key={`${parent.id}-${sub.id}`} className="hover:bg-slate-50/80 transition-colors">
                        {sIdx === 0 ? (
                          <td
                            rowSpan={parent.submodules.length}
                            className={`px-4 py-3 font-bold align-top border-r border-slate-100 ${parent.themeColor.bg}`}
                          >
                            <div className="flex items-center gap-2">
                              <parent.icon className="w-4 h-4 text-slate-700" />
                              <span className="text-slate-900">{parent.name}</span>
                            </div>
                            <span className="text-[11px] font-normal text-slate-500 block mt-1">
                              {parent.code}
                            </span>
                          </td>
                        ) : null}

                        <td className="px-4 py-3 font-semibold text-slate-900">
                          <div className="flex items-center gap-2">
                            <SubIcon className="w-4 h-4 text-indigo-600 shrink-0" />
                            <span>{sub.name}</span>
                          </div>
                        </td>

                        <td className="px-4 py-3 font-mono text-[11px] text-indigo-700">
                          {sub.folderPath}
                        </td>

                        <td className="px-4 py-3 text-slate-600 text-xs max-w-xs leading-relaxed">
                          {sub.description}
                        </td>

                        <td className="px-4 py-3 text-slate-700 font-medium whitespace-nowrap">
                          <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold">
                            {sub.purpose}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          {sub.viewId && onNavigateToView ? (
                            <button
                              onClick={() => onNavigateToView(sub.viewId!)}
                              className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                            >
                              <span>Xem</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Dịch vụ nền</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CHẾ ĐỘ 4: TRỢ LÝ PHÂN TÍCH & TẠO CÂU LỆNH AI SIÊU TỐC */}
      {viewMode === 'prompt-assistant' && (
        <PhanTichLenh
          onNavigateToView={onNavigateToView}
          onSelectSubmoduleInTree={subId => {
            setSelectedSubmoduleId(subId);
            setViewMode('split-explorer');
          }}
        />
      )}

      {/* Box Tóm Tắt Quy Chuẩn Kiến Trúc */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <h4 className="text-sm font-bold text-white">
              Quy Chuẩn Tổ Chức Thư Mục Chuẩn Không Thừa Thãi
            </h4>
          </div>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            Mỗi module con nằm trực tiếp trong thư mục của module cha (ví dụ:{' '}
            <code className="text-indigo-300 font-mono">src/modules/ModuleHocSinh/SoDoLop/index.ts</code>).
            Không sử dụng thư mục trung gian lồng nhau <code className="text-rose-300 font-mono">/submodules/</code>.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-300 shrink-0">
          <span className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 font-mono text-indigo-300">
            ESM Facade Pattern via index.ts
          </span>
        </div>
      </div>
    </div>
  );
};

