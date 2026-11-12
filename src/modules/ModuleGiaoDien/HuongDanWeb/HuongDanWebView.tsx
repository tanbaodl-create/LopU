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
  Coins,
  FileText,
  Tv,
  Laptop,
} from 'lucide-react';
import { ViewId } from '../Navigation';
import { PhanTichLenh } from './PhanTichLenh';
import { LuuPromptChuanView } from './LuuPromptChuanView';
import { UserRole } from '../../../services/storageTypes';

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
  currentRole?: UserRole;
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
        name: 'LopHoc (Lớp học & Kho Tài Liệu 💎)',
        folderPath: 'src/modules/ModuleHocSinh/LopHoc',
        description: 'Xem danh sách lớp học cá nhân, tích hợp nút "➕ Tham gia lớp mới" nhập mã PIN trực tiếp, Lớp học Công khai "Kho Tài Liệu 💎" (chứa tài liệu Miễn phí 🆓 và Trả phí Kim Cương 💎 cho tất cả người dùng), lọc bài học đã mở khóa, dẫn đường Google Maps, nộp bài tập và cập nhật tiến độ học tập cá nhân. Đường dẫn mặc định: myApp/LopU/LopHoc.',
        purpose: 'Học tập trực tiếp, Đăng ký tham gia lớp mới (Mã PIN) & Kho Tài Liệu 💎 (Đường dẫn mặc định: myApp/LopU/LopHoc)',
        viewId: 'learning-classes',
        icon: BookOpen,
        tags: ['Lớp học', 'Tham gia lớp mới (Mã PIN)', 'Kho Tài Liệu 💎', 'Đường dẫn myApp/LopU/LopHoc', 'dẫn đường Google Maps', 'Miễn phí 🆓 & Kim Cương 💎'],
      },

      {
        id: 'SoDoLop',
        name: 'SoDoLop (Sơ đồ chỗ ngồi, Tinh gọn cửa sổ cài đặt điều kiện)',
        folderPath: 'src/modules/ModuleHocSinh/SoDoLop',
        description: 'Sơ đồ vị trí chỗ ngồi học sinh: tinh gọn thanh công cụ với 1 nút "Xếp chỗ ngồi" duy nhất có icon spinner xoay; trong Cửa sổ Cài Đặt Điều Kiện đã loại bỏ nút "Phân Tự Động Theo Điều Kiện" để tập trung thao tác lưu cài đặt và kích hoạt xếp chỗ trực tiếp từ nút chính trên thanh công cụ.',
        purpose: 'Thanh công cụ và cửa sổ cài đặt tinh gọn, lưu điều kiện xếp chỗ và kích hoạt qua nút "Xếp chỗ ngồi" chính có biểu tượng spinner xoay',
        viewId: 'learning-seating',
        icon: LayoutGrid,
        tags: ['Thanh công cụ tinh gọn', '1 nút Xếp chỗ ngồi duy nhất', 'Icon Spinner khi xếp chỗ', 'Loại bỏ nút trùng lặp trong modal cài đặt', 'CSP Backtracking Solver'],
      },
      {
        id: 'ThoiKhoaBieu',
        name: 'ThoiKhoaBieu (Thời Khóa Biểu - Lấy Tùy Chọn Lớp Từ 14 Trường Thông Tin Hồ Sơ Chi Tiết)',
        folderPath: 'src/modules/ModuleHocSinh/ThoiKhoaBieu',
        description: 'Module Thời Khóa Biểu: Dropdown 5 "Tên lớp" rà soát trực tiếp thông tin từ trường Các Lớp Dạy/Học (14 trường thông tin người dùng trong Hồ sơ chi tiết). Đường dẫn mặc định lưu Google Drive: myApp/LopU/ThoiKhoaBieu (độc lập, không lưu chung trong thư mục SoDoLop). Nếu chưa thiết lập thì danh sách tùy chọn là rỗng chứ không tự ý thêm danh mục mặc định. Mặc định các trường Phòng học, Ghi chú trống.',
        purpose: 'Thời khóa biểu (Đường dẫn mặc định Google Drive: myApp/LopU/ThoiKhoaBieu) đồng bộ chính xác danh sách lớp từ 14 trường thông tin người dùng và phân quyền linh hoạt',
        viewId: 'learning-schedule',
        icon: Calendar,
        tags: ['Đường dẫn myApp/LopU/ThoiKhoaBieu', 'Đồng bộ Google Drive độc lập', 'Rà soát 14 trường thông tin', 'Các Lớp Dạy/Học', 'Tùy chọn lớp rỗng nếu chưa có', 'Không lưu trong SoDoLop'],
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
        name: 'QuanLyLopDay (Quản lý Lớp dạy & Mã PIN Truy Cập)',
        folderPath: 'src/modules/ModuleQuanTri/PhanQuyenLopHoc',
        description: 'Phân hệ Quản lý Lớp dạy: 1) Giáo viên mở lớp dạy mới; 2) Duyệt/từ chối yêu cầu tham gia lớp bằng mã PIN từ học sinh; 3) Quản lý danh sách học sinh & Nhập Excel; 4) Phân công Giáo viên phụ trách môn học và thay đổi mã PIN bảo mật.',
        purpose: 'Giáo viên mở lớp dạy mới, duyệt mã PIN, quản lý danh sách lớp & thành viên học sinh',
        viewId: 'settings-permissions',
        icon: KeyRound,
        tags: ['Mở Lớp Dạy Mới', 'Duyệt Mã PIN', 'Quản lý Lớp', 'Phân công GV', 'Thành viên lớp', 'Nhập Excel'],
      },
      {
        id: 'NhapHocSinh',
        name: 'NhapHocSinh (Nhập & Xóa HS, Chuẩn hóa VTM & Đồng bộ vị trí cố định theo sơ đồ)',
        folderPath: 'src/modules/ModuleGiaoVien/NhapHocSinh',
        description: 'Dịch vụ thêm/xóa học sinh và import Excel/CSV với cơ chế định danh Google Account. Chuẩn hóa chức danh VTM (Văn Thể Mỹ) và validateAndSyncFixedSeatPositions đồng bộ vị trí bàn cố định theo số ghế thực tế từng bàn của sơ đồ lớp.',
        purpose: 'Nhập & Xóa học sinh, Chuẩn hóa chức danh VTM & Đồng bộ vị trí cố định sơ đồ',
        icon: FileSpreadsheet,
        tags: ['Google UID/Email', 'nhapHocSinhService', 'Chuẩn hóa VTM', 'Đồng bộ vị trí cố định', 'Excel chống trùng'],
      },
      {
        id: 'QuanLyDrive',
        name: 'QuanLyDrive (Module con ẩn UI - Giải Pháp 1: Drive-First Strict Sync & Cache FolderID Siêu Tốc)',
        folderPath: 'src/modules/ModuleGiaoVien/QuanLyDrive',
        description: 'Module con dịch vụ chuyên trách hỗ trợ Soạn Tài liệu (ẩn trên Menu giao diện chính, chỉ xuất hiện trên Sơ đồ cây module) triển khai Giải pháp 1 (Drive-First Strict Sync): 1) Chuyển đổi 2 chiều giữa Đường dẫn (Path) ⇆ FileID/FolderID; 2) Bộ nhớ đệm (Cache) FolderID tối ưu: ghi nhớ FolderID của từng cấp để truy xuất trực tiếp các thư mục con trong tích tắc (<200ms); 3) Tự động nhận diện lỗi Token hết hạn (401 Unauthorized / Invalid Credentials) trong mọi tiến trình đồng bộ, tự động dọn sạch token rác cũ và tự động kích hoạt popup kết nối lại Google Drive liền mạch; 4) Hỗ trợ tự động nhận diện linh hoạt cả "TaiLieu" và "TailLieu"; 5) Tạo mới Tài liệu/Chương/Bài/Vấn đề/Chuyên đề trên Drive trước (createByPath); 6) Xóa thùng rác trên Drive trước (deleteByPath); 7) Tải cây phân cấp lồng nhau (getNestedDriveTree) & nút "Đồng bộ Drive".',
        purpose: 'Dịch vụ nền Soạn Tài liệu - Giải pháp 1: Tự động xóa token hết hạn & kích hoạt popup xác thực lại 401, Drive-First Strict Sync, Cache FolderID siêu tốc',
        viewId: 'teaching-drive',
        icon: FolderTree,
        tags: ['Tự động làm mới Token 401', 'Drive-First Strict Sync', 'Cache FolderID siêu tốc', 'Truy xuất trực tiếp O(1)', 'TaiLieu & TailLieu', 'Tạo/Xóa Drive trước', 'Đồng bộ Drive'],
      },
      {
        id: 'SoanThao',
        name: 'SoanThao / Tài liệu (Quyền Biên Soạn Tài Liệu, Thanh Mốc PPT & Bộ Hiệu Ứng Cơ Bản)',
        folderPath: 'src/modules/ModuleGiaoVien/SoanThao',
        description: 'Trình soạn thảo văn bản Word & Trình chiếu PPT: 1) Quy chuẩn "Quyền biên soạn tài liệu" (chỉnh sửa, thêm, đổi tên, xóa) chỉ cấp cho Giáo viên, học sinh truy cập tài liệu tuyệt đối không có quyền này (chỉ xem và trình chiếu); 2) Tài khoản có quyền biên soạn có thể đặt Mốc PPT (ngắt slide) hoặc Mốc Hiệu ứng; 3) Bổ sung bộ 5 hiệu ứng cơ bản khi biên soạn (Hiện dần Fade in, Trượt lên Slide up, Trượt vào Slide left, Phóng to Zoom in, Nổi bật Highlight); 4) Đồng bộ hiển thị mốc trực quan trên Thước lề trái và trình chiếu PPT chuyển động tương ứng.',
        purpose: 'Phân quyền biên soạn tài liệu chuẩn mực cho giáo viên, hỗ trợ đặt mốc slide và bộ hiệu ứng cơ bản khi trình chiếu PPT',
        viewId: 'teaching-soanthao',
        icon: FileText,
        tags: ['Quyền biên soạn tài liệu', 'Chỉ giáo viên biên soạn', 'Học sinh chỉ xem/trình chiếu', 'Mốc PPT & Mốc hiệu ứng', '5 hiệu ứng cơ bản (Fade, Slide up, Slide left, Zoom, Highlight)'],
      },
      {
        id: 'PhatHanhTaiLieu',
        name: 'PhatHanhTaiLieu (Gộp nút thành 1 nút ⚙️ Cài đặt, Phân biệt lớp Thừa hưởng màu Tím chọn sẵn & Lọc lớp do Giáo viên mở)',
        folderPath: 'src/modules/ModuleGiaoVien/PhatHanhTaiLieu',
        description: 'Module độc lập chuyên trách Phát hành Tài liệu: 1) Kênh Kho tài liệu 💎 toàn trường đồng bộ cho cả tài liệu miễn phí và có phí; 2) Phát hành phân cấp Cấu trúc (Tài liệu -> Chương -> Bài -> Vấn đề -> Chuyên đề -> Luyện tập -> Bài đánh giá -> KTDG); 3) Gộp các nút thành 1 nút "⚙️ Cài đặt" duy nhất ở cuối mỗi vị trí, mở modal xem chi tiết phát hành; 4) Modal tự động chọn sẵn lớp Thừa hưởng từ cha với màu Tím nổi bật, cho phép bấm chọn/bỏ chọn trực tiếp; 5) Chỉ hiển thị danh sách các Lớp do chính Giáo viên đó mở.',
        purpose: 'Cài đặt phát hành & Định giá bán Kim Cương (💎) từng vị trí tinh gọn với 1 nút ⚙️ Cài đặt và màu sắc phân biệt lớp Thừa hưởng',
        viewId: 'teaching-monetization',
        icon: Coins,
        tags: ['1 nút ⚙️ Cài đặt vị trí', 'Màu Tím chọn sẵn cho Thừa hưởng', 'Lọc danh sách Lớp do GV mở', 'Giá Kim Cương từng vị trí', 'Phát hành phân cấp Cấu trúc', 'Giao diện tinh gọn'],
      },
      {
        id: 'DayHocInteractive',
        name: 'LenLop / DayHocInteractive (Vùng Viết Tay Nổi Rõ Trực Quan & Phủ Nền Bảng 100% Chiều Ngang Màn Hình)',
        folderPath: 'src/modules/ModuleGiaoVien/DayHocInteractive',
        description: 'Phân hệ Lên Lớp & Cửa Sổ Trình Chiếu: 1) Vùng viết bài dạy sau khi nhấp đặt được giữ nguyên viền nét đứt và nền mờ rõ ràng, không bao giờ bị biến mất; 2) Khung bọc bảng ngoài đồng bộ màu nền và họa tiết ô vuông phủ kín 100% chiều ngang màn hình thiết bị, loại bỏ hoàn toàn dải đen/xám trống lề phải.',
        purpose: 'Vùng viết tay nổi nét đứt rõ nét không biến mất & nền bảng phủ kín 100% chiều ngang màn hình',
        viewId: 'teaching-interactive',
        icon: Tv,
        tags: ['Vùng Viết Tay Nổi Nét Đứt', 'Phủ Khít 100% Chiều Ngang', 'Không Biến Mất Khi Đặt', 'Giao Diện Chuẩn Mực'],
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
        name: 'QuanLyNguoiDung (Quản trị, Phân Quyền Nút Soạn Bài ▾ Cho Giáo Viên+ & Mặc Định Vai Trò Cao Nhất)',
        folderPath: 'src/modules/ModuleQuanTri/QuanLyNguoiDung',
        description: 'Quản trị cho Admin và Superadmin. Phân định rõ đặc quyền vai trò: Tài khoản Giáo viên hoặc cao hơn (Giáo viên, Quản lý môn, Quản trị viên, Superadmin) được kích hoạt nút "Soạn bài ▾" trên thanh công cụ Word với đầy đủ cấu trúc Lý thuyết & Bài tập. Mỗi tài khoản khi đăng nhập sẽ tự động nhận vai trò cao nhất theo thứ bậc phân quyền. Bản thân tài khoản Superadmin có thể tự do chỉnh sửa trọn bộ 14 trường thông tin của chính mình thông qua nút 1-click "Sửa thông tin của tôi". Bổ sung tính năng "Thêm TKB (Con, Em...)" hỗ trợ quản lý lịch học người thân.',
        purpose: 'Quản trị, Phân quyền nút Soạn bài ▾ cho Giáo viên+, Mặc định vai trò cao nhất khi Đăng nhập & Sửa 14 trường',
        viewId: 'settings-users',
        icon: UserCog,
        tags: ['Đặc quyền Giáo viên+ nút Soạn bài ▾', 'Mặc định vai trò cao nhất', 'Superadmin tự sửa hồ sơ', 'Thêm TKB Con/Em', '14 Trường Firestore', 'Deduplicate tanbaodl@gmail.com'],
      },
      {
        id: 'BaoCaoGiamSat',
        name: 'BaoCaoGiamSat (Giám sát tiến độ & Doanh số tài liệu 💎)',
        folderPath: 'src/modules/ModuleQuanTri/BaoCaoGiamSat',
        description: 'Tổng hợp thống kê tỷ lệ hoàn thành bài giảng, điểm trung bình và liên kết bảng điểm lưu trữ trên Google Drive. Đặc biệt tích hợp "Báo cáo thương mại & Doanh số tài liệu" hiển thị tổng doanh thu Kim Cương 💎 và số lượt mua thực tế.',
        purpose: 'Thống kê, Giám sát & Doanh thu Kim Cương 💎',
        viewId: 'reports-progress',
        icon: LineChart,
        tags: ['Thống kê', 'Tiến độ', 'Doanh thu Kim Cương 💎', 'Lượt mua tài liệu'],
      },

      {
        id: 'QuanLyThietBi',
        name: 'QuanLyThietBi (Quản lý thiết bị đăng nhập: 1 Thiết bị/1 HĐH & Tối đa 2 lượt đổi/tháng)',
        folderPath: 'src/modules/ModuleQuanTri/QuanLyThietBi',
        description: 'Kiểm soát chặt chẽ thiết bị truy cập của từng tài khoản: Mỗi tài khoản chỉ được phép duy trì 1 thiết bị trên mỗi Hệ điều hành (Windows, macOS, iOS, Android, Linux). Đề xuất và áp dụng quy định tối đa 2 lượt đổi/tháng (tự động làm mới ngày 01 hàng tháng). Cung cấp giao diện tự gỡ thiết bị cho người dùng và tính năng Reset lượt hỗ trợ khẩn cấp dành cho Admin.',
        purpose: 'Bảo mật tài khoản, chống chia sẻ tài khoản & Giới hạn 1 thiết bị / 1 HĐH (Tối đa 2 lượt đổi/tháng)',
        viewId: 'settings-devices',
        icon: Laptop,
        tags: ['1 Thiết bị / 1 HĐH', 'Tối đa 2 lượt đổi/tháng', 'Tự động làm mới ngày 01', 'Admin Reset khẩn cấp', 'Tự gỡ thiết bị cũ'],
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
        name: 'GiaoDienMacDinh (Khung Layout, Header, Kho 1000 Câu Danh Ngôn Học Tập Trong Footer)',
        folderPath: 'src/modules/ModuleGiaoDien/GiaoDienMacDinh',
        description: 'Chứa khung layout cơ bản AppLayout. Header sticky z-50 gôm cụm điều khiển tài khoản (menu z-[60] tự đóng khi click ngoài). Tích hợp kho 1000 câu danh ngôn động viên học tập và rèn luyện ý chí vào Footer (file footerQuotesData.ts & Footer.tsx, mỗi câu 1 dòng duy nhất, hỗ trợ định dạng HTML, có đầy đủ trích dẫn tác giả). Đã bỏ huy hiệu nhãn đầu dòng để dải chữ chạy thanh thoát, tốc độ chữ chạy được điều chỉnh chậm rãi êm ái hơn, kèm nút Đổi câu khác (xáo trộn trong 1000 câu), nút Đổi chiều chạy (⇄) và nút Tạm dừng/Tiếp tục (⏸).',
        purpose: 'Khung xương ứng dụng, Header & Kho 1000 câu danh ngôn học tập chạy chậm rãi thanh thoát',
        icon: Layers,
        tags: ['1000 câu danh ngôn', 'Tốc độ chậm rãi dễ đọc', 'Bỏ nhãn đầu dòng', 'Mỗi câu 1 dòng', 'Hỗ trợ HTML', 'Trích dẫn tác giả', 'Nút đổi câu khác'],
      },
      {
        id: 'GiaoDienHocSinh',
        name: 'GiaoDienHocSinh (Layout chuyên biệt Học sinh)',
        folderPath: 'src/modules/ModuleGiaoDien/GiaoDienHocSinh',
        description: 'Bọc ngoài các màn hình học sinh với banner Học tập trực tuyến, huy hiệu định danh và phong cách dịu mắt.',
        purpose: 'Trải nghiệm Học tập',
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
        name: 'Navigation (Cấu hình Menu, Router Độc Lập Lazy-Loading & Nạp Dữ Liệu Lưu Tại Máy Siêu Tốc)',
        folderPath: 'src/modules/ModuleGiaoDien/Navigation',
        description: 'Định nghĩa menuConfig dạng phân cấp, NavigationContainer và DynamicViewContainer. Kiến trúc module độc lập tối ưu: 1) Tách biệt hoàn toàn WordSoanThaoView về đúng ModuleGiaoVien/SoanThao/WordSoanThaoView.tsx; 2) NavigationContainer giữ vai trò Router thuần túy, áp dụng React.lazy() và Suspense nạp động độc lập từng module theo nhu cầu, giảm kích thước bundle ban đầu từ 3.7MB xuống chỉ còn 315KB (giảm hơn 90%), tăng tốc độ mở web gấp 3-5 lần; 3) Cơ chế đồng bộ dữ liệu siêu tốc 3 cấp (lưu FolderID tham chiếu, đồng bộ Drive thêm vào máy, nạp dữ liệu lưu máy tức thì không độ trễ); 4) Loại bỏ eval() trong MenuLenLop thay bằng Safe Math Evaluator an toàn tuyệt đối; 5) Phân quyền chuẩn RBAC kiểm soát hiển thị chặt chẽ.',
        purpose: 'Điều hướng động Lazy-Loading, Kiến trúc module độc lập, Nạp tức thì dữ liệu lưu tại máy & Tối ưu hiệu năng',
        icon: Compass,
        tags: ['Menu Hàm số độc lập', 'BBT Nhập điểm cực trị & Nhập hàm', 'Bỏ +Mốc slide/Hiệu ứng trên Word', 'Xóa/Thêm/Sửa trực tiếp trên đồ thị', 'Sửa nội dung chữ/số trực tiếp', '➕ Thêm nhãn & ➕ Thêm điểm', 'Kích đôi sửa nhãn/số', 'Phím Del xóa phần tử đồ thị', 'Đơn vị độ dài mỗi trục Ox/Oy', 'Tự tính độ rộng cao đồ thị', 'Bảng biến thiên nhập hàm số', 'BBT cột thẳng hàng 100%', 'Nút ✏️ Sửa BBT', 'Lưu FolderID tham chiếu', 'Nạp dữ liệu lưu tại máy tức thì', 'Chế độ View 1. Kiến thức', 'Chèn ngay vị trí con trỏ', 'Kéo co giãn đồ thị', 'Ẩn nút đồ thị cho học sinh', 'BBT TikZ-Tab KaTeX mũi tên SVG', 'Menu Word nổi trên cùng', 'Công thức KaTeX trực quan', 'Đồ thị SVG trong suốt', 'RBAC Guard'],
      },
      {
        id: 'modulePPT',
        name: 'modulePPT (Trình Chiếu Slide Độc Lập & Thanh Mốc PPT Lề Trái)',
        folderPath: 'src/modules/ModuleGiaoDien/modulePPT',
        description: 'Module con độc lập thuộc ModuleGiaoDien quản lý toàn bộ tính năng Trình chiếu PPT và Thanh Mốc PPT: 1) PptMarkerRail: Thanh mốc PPT mỏng chạy dọc lề trái tài liệu ở chế độ View: Toàn bộ, cho phép giáo viên kích chuột vào điểm bất kỳ để bật popup đặt 🎬 +Mốc Slide hoặc ⚡ +Hiệu ứng; 2) PptSlideViewer: Khung trình chiếu PPT chuyên biệt, hiển thị đúng và chỉ riêng nội dung của từng slide (chuẩn PowerPoint), hỗ trợ hiệu ứng từng bước fade-in mượt mà, chuyển slide bằng chuột trái, phím Space hoặc phím mũi tên; 3) pptUtils: Bộ bóc tách tài liệu thông minh theo mốc thủ công hoặc tự động nhận diện.',
        purpose: 'Module con độc lập chuyên trách Trình chiếu Slide PPT chuẩn và Thanh Mốc PPT lề trái',
        icon: Tv,
        tags: ['modulePPT Độc Lập', 'PptSlideViewer', 'PptMarkerRail', 'Thanh Mốc PPT Lề Trái', 'Chỉ chiếu đúng 1 Slide', 'Hiệu ứng Hiện Từng Bước ⚡', 'Click / Phím Space chuyển slide', 'Bóc tách Slide thông minh'],
      },
      {
        id: 'HuongDanWeb',
        name: 'HuongDanWeb (Trợ giúp, Sơ đồ cây, Phân tích lệnh & Kho Prompt chuẩn 5 nhóm)',
        folderPath: 'src/modules/ModuleGiaoDien/HuongDanWeb',
        description: '(Phần sau chỉ Superadmin mới thấy: Trợ giúp). Sơ đồ cây module phân cấp, bộ phân tích lệnh siêu tốc với nút "Copy lệnh" bên trái, và Kho Prompt Lệnh Chuẩn gồm 5 nhóm: 1) Tài liệu (Làm chuyên đề SGK 2018); 2) Làm Đề (Làm đề KT theo Ma trận GDPT 2018 chi tiết hóa các năng lực TD, GQ, MH); 3) KHDH (Soạn Word chuẩn CV 5512/TT 02/QĐ 2422 & KHBD_Web E-learning 1 file HTML); 4) Infographic (Tóm tắt trực quan 1 trang, Bản đồ lộ trình giải toán); 5) Tạo App (Lệnh sửa nhanh trúng đích 1 vị trí theo sơ đồ cây AGENTS.md, sửa đa module và tạo app chuẩn kiến trúc sạch).',
        purpose: 'Đặc quyền Superadmin: Trợ giúp (Sơ đồ cây module, Phân tích lệnh & Kho Prompt 5 nhóm)',
        viewId: 'guide-tree',
        icon: Network,
        tags: ['Chỉ Superadmin', 'Sơ đồ cây', 'Phân tích lệnh', 'Kho Prompt Chuẩn 5 nhóm', 'Tài liệu', 'Làm Đề (KT theo Ma trận)', 'KHDH (Soạn Word & KHBD_Web)', 'Infographic đồ họa', 'Tạo App sửa nhanh 1 chỗ'],
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
        name: 'ConnectDrive (Google Drive API, Cache FolderID Lưu Tại Máy & Lọc Dọn Tệp Rác)',
        folderPath: 'src/modules/ConnectData/ConnectDrive',
        description: 'Hệ thống đồng bộ hóa Google Drive trực tiếp. Cơ chế nhớ FolderID lưu bền vững tại máy (localStorage) giúp truy cập và nạp thư mục con siêu tốc trong ~150ms mà không cần duyệt lại từ thư mục gốc. Tối ưu hóa thời gian chờ (15s), phòng vệ timeout êm dịu, chỉ kích hoạt đồng bộ khi Drive đã sẵn sàng kết nối và loại bỏ các thao tác tạo thư mục cưỡng bức khi chỉ đọc cây thư mục. Tự động lọc khử trùng lặp file và dọn dẹp trực quan.',
        purpose: 'Đồng bộ Google Drive trực tiếp, Phòng vệ Timeout êm dịu, Cache FolderID lưu tại máy siêu tốc, Tự động lọc tệp rác & dọn dẹp',
        icon: Cloud,
        tags: ['Phòng vệ Timeout êm dịu', 'Cache FolderID lưu tại máy', 'Truy xuất thư mục con siêu tốc', 'Lọc tệp rác & trùng lặp', 'Đồng bộ nền an toàn', 'Gốc myApp/LopU'],
      },
      {
        id: 'ConnectFirestore',
        name: 'ConnectFirestore (Firebase Firestore Dự Án LopU & Đẩy Dữ Liệu Lên Đám Mây)',
        folderPath: 'src/modules/ConnectData/ConnectFirestore',
        description: 'Hệ thống Firestore thời gian thực duy nhất kết nối dự án LopU (lopu-ddf22), loại bỏ hoàn toàn các dự án tạm ngoài ý muốn. Hỗ trợ modal quản lý kết nối LopU, kiểm tra trạng thái Authorized Domains, và nút "Đẩy toàn bộ dữ liệu lên Firebase LopU" (đồng bộ tức thì toàn bộ Lớp học, Học sinh, Hồ sơ, Tài liệu giáo viên, Tiến độ lên Firestore). Chuẩn SSOT chống xung đột dữ liệu.',
        purpose: 'Kết nối chuẩn Firebase LopU (lopu-ddf22), Đẩy toàn bộ dữ liệu lên đám mây, Quản lý ủy quyền tên miền',
        icon: Database,
        tags: ['Dự án LopU (lopu-ddf22)', 'Đẩy toàn bộ dữ liệu lên Firestore', 'Modal quản lý LopU', 'Ủy quyền tên miền Vercel', 'SSOT'],
      },
    ],
  },
  {
    id: 'ModuleShared',
    code: 'src/modules/ModuleShared',
    name: 'Phân hệ Dùng Chung (ModuleShared)',
    roleDescription: 'Chứa các module độc lập dùng chung cho cả Giáo viên, Học sinh và các phân hệ khác',
    icon: Layers,
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
        id: 'BoChonHocLieuTienTrinh',
        name: 'BoChonHocLieuTienTrinh (Bộ Chọn Học Liệu & Tiến Trình Dùng Chung Cho Cả GV và HS)',
        folderPath: 'src/modules/ModuleShared/BoChonHocLieuTienTrinh',
        description: 'Module con độc lập dùng chung: 1) Thanh điều hướng tiến trình trên cùng chuẩn bố trí 1 hàng gồm biểu tượng thư mục, dropdown Tiến trình (1. Kiến thức, 2. Luyện tập, 3. KTDG, 4. Cải thiện), badge chuyên đề, dropdown bài con; 2) Phân quyền linh hoạt: Chế độ chỉ chọn (readOnly/student) ẩn toàn bộ nút thêm/sửa/xóa bài con và nút thêm phân cấp; Chế độ quản trị (teacher) cho phép thêm/sửa/xóa; 3) Mặc định mở rộng sẵn khung 2 cột cố định (defaultExpanded=true) hoặc thu gọn; 4) Mặc định Môn học và Khối lớp ban đầu để rỗng để chọn từ đầu; 5) Đồng bộ siêu tốc kế thừa Firestore + LocalStorage + Drive Fast Tree (<200ms) như trang Tài liệu; 6) Custom hook useHocLieuTienTrinh trích xuất toàn bộ tọa độ và nạp nội dung thực tế (HTML/JSON) từ Google Drive.',
        purpose: 'Bộ chọn Học liệu & Tiến trình độc lập dùng chung cho cả Giáo viên và Học sinh, phân quyền chỉ chọn an toàn, mở rộng mặc định và đồng bộ siêu tốc',
        icon: FolderLock,
        tags: ['Module Dùng Chung', 'BoChonHocLieuTienTrinh', 'Dùng cho GV & HS', 'Mặc định mở rộng', 'Môn và Lớp rỗng', 'Chế độ chỉ chọn', 'Đồng bộ siêu tốc như Tài liệu', 'useHocLieuTienTrinh'],
      },
    ],
  },
];

export const HuongDanWebView: React.FC<HuongDanWebViewProps> = ({ currentRole, onNavigateToView }) => {
  if (currentRole && currentRole !== 'superadmin') {
    return (
      <div id="guide-tree-restricted" className="p-8 text-center max-w-lg mx-auto my-12 bg-white rounded-2xl border border-indigo-200 shadow-sm space-y-4">
        <div className="w-14 h-14 bg-indigo-100 text-indigo-700 rounded-2xl flex items-center justify-center mx-auto">
          <FolderTree className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-slate-900">Giới Hạn Quyền Superadmin</h3>
        <p className="text-xs text-slate-600 leading-relaxed">
          Chỉ <strong>Superadmin</strong> mới có quyền xem và thao tác tại phân hệ <strong>Trợ giúp (Sơ đồ cây module, phân tích lệnh; kho prompt chuẩn)</strong>.
        </p>
      </div>
    );
  }

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

  const selectedSubmoduleData = useMemo(() => {
    for (const m of MODULE_TREE_DATA) {
      const found = m.submodules.find(s => s.id === selectedSubmoduleId);
      if (found) return { parent: m, submodule: found };
    }
    return { parent: MODULE_TREE_DATA[0], submodule: MODULE_TREE_DATA[0].submodules[0] };
  }, [selectedSubmoduleId]);

  return (
    <div id="huong-dan-web-container" className="space-y-6">
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
                <span>Phân tích lệnh</span>
              </button>
            </div>
          </div>
        </div>
      </div>

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
            <option value="ModuleHocSinh">Phân hệ Học sinh (3)</option>
            <option value="ModuleGiaoVien">Phân hệ Giáo viên (4)</option>
            <option value="ModuleQuanTri">Phân hệ Quản trị (3)</option>
            <option value="ModuleGiaoDien">Phân hệ Giao diện (5)</option>
            <option value="ConnectData">Module Kết nối Dữ liệu (2)</option>
          </select>
        </div>
      </div>

      {viewMode === 'nested-tree' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
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

          <div className="p-4 sm:p-6 space-y-3">
            {filteredData.map((moduleNode, modIdx) => {
              const isExpanded = expandedNodes[moduleNode.id] ?? true;
              const IconComp = moduleNode.icon;
              const isLastModule = modIdx === filteredData.length - 1;

              return (
                <div key={moduleNode.id} className="relative">
                  {!isLastModule && (
                    <div className="absolute left-4 top-10 bottom-0 w-0.5 bg-slate-200 pointer-events-none -z-0" />
                  )}

                  <div
                    onClick={() => toggleNode(moduleNode.id)}
                    className={`relative z-10 flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      isExpanded
                        ? `${moduleNode.themeColor.bg} ${moduleNode.themeColor.border} shadow-2xs`
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        className="w-6 h-6 rounded-lg bg-white/80 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors"
                      >
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>

                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold shadow-2xs ${moduleNode.themeColor.accent}`}
                      >
                        <IconComp className="w-5 h-5" />
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm sm:text-base text-slate-900">
                            {moduleNode.name}
                          </h3>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${moduleNode.themeColor.badge}`}
                          >
                            {moduleNode.submodules.length} Module con
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5">{moduleNode.roleDescription}</p>
                      </div>
                    </div>

                    <div className="text-xs font-mono text-slate-400 hidden sm:block">
                      {moduleNode.code}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="relative ml-4 sm:ml-6 pl-5 sm:pl-7 pt-2 pb-1 border-l-2 border-dashed border-indigo-200/80 space-y-2">
                      {moduleNode.submodules.map((sub) => {
                        const SubIcon = sub.icon;
                        const hasNavigation = Boolean(sub.viewId && onNavigateToView);

                        return (
                          <div
                            key={sub.id}
                            className="relative group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-slate-50/70 hover:bg-indigo-50/40 border border-slate-200/80 hover:border-indigo-300 transition-all shadow-2xs"
                          >
                            <div className="absolute -left-5 sm:-left-7 top-1/2 -translate-y-1/2 w-5 sm:w-7 h-0.5 bg-indigo-200 pointer-events-none" />

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

      {viewMode === 'split-explorer' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[500px]">
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

      {viewMode === 'prompt-assistant' && (
        <div className="space-y-8">
          <PhanTichLenh
            onNavigateToView={onNavigateToView}
            onSelectSubmoduleInTree={subId => {
              setSelectedSubmoduleId(subId);
              setViewMode('split-explorer');
            }}
          />
          <LuuPromptChuanView />
        </div>
      )}

      <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white rounded-2xl p-5 border border-indigo-700/50 space-y-4 shadow-lg">
        <div className="flex items-center justify-between pb-3 border-b border-indigo-800/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-600/30 text-indigo-300 rounded-xl border border-indigo-500/40">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">
                Hướng Dẫn Cấu Hình Vercel & Ủy Quyền Tên Miền (Authorized Domains)
              </h4>
              <p className="text-xs text-indigo-200 mt-0.5">
                Đảm bảo ứng dụng chạy mượt mà trên tên miền Vercel (ví dụ: <code className="text-amber-300 font-mono">lopu2.vercel.app</code>)
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700/50">
            Cấu hình Deploy
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="bg-slate-950/70 p-4 rounded-xl border border-indigo-900/60 space-y-2">
            <div className="flex items-center gap-2 font-bold text-indigo-300">
              <KeyRound className="w-4 h-4 text-amber-400" />
              <span>1. Thêm Biến Môi Trường Trên Vercel</span>
            </div>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              Vào <strong>Vercel Dashboard</strong> ➔ Chọn Project <strong>lopu2</strong> ➔ <strong>Settings</strong> ➔ <strong>Environment Variables</strong>. Thêm các biến sau:
            </p>
            <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 font-mono text-[10px] text-amber-200 space-y-1">
              <div>VITE_FIREBASE_API_KEY=AIzaSy...</div>
              <div>VITE_FIREBASE_AUTH_DOMAIN=...firebaseapp.com</div>
              <div>VITE_FIREBASE_PROJECT_ID=...</div>
              <div>VITE_FIREBASE_STORAGE_BUCKET=...appspot.com</div>
              <div>VITE_FIREBASE_MESSAGING_SENDER_ID=...</div>
              <div>VITE_FIREBASE_APP_ID=1:...:web:...</div>
            </div>
            <p className="text-[11px] text-slate-400 italic">
              💡 Lưu ý: Chọn đầy đủ 3 môi trường: <strong>Production</strong>, <strong>Preview</strong>, và <strong>Development</strong> trước khi bấm Save.
            </p>
          </div>

          <div className="bg-slate-950/70 p-4 rounded-xl border border-indigo-900/60 space-y-2">
            <div className="flex items-center gap-2 font-bold text-indigo-300">
              <Network className="w-4 h-4 text-emerald-400" />
              <span>2. Cấu Hình Authorized Domains (Firebase Console)</span>
            </div>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              Khắc phục lỗi Đăng nhập Google/Firebase (lỗi <code>auth/unauthorized-domain</code>) khi chạy trên tên miền Vercel mới:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-slate-300 text-[11px] leading-relaxed font-medium">
              <li>Truy cập <strong>Firebase Console</strong> (<code>console.firebase.google.com</code>).</li>
              <li>Chọn Dự án Firebase của ứng dụng.</li>
              <li>Vào menu <strong>Build</strong> ➔ <strong>Authentication</strong>.</li>
              <li>Chọn tab <strong>Settings</strong> ➔ Mục <strong>Authorized domains</strong>.</li>
              <li>Bấm <strong>Add domain</strong> và dán các tên miền Vercel:
                <div className="bg-slate-900 px-2 py-1 rounded text-emerald-300 font-mono text-[10px] mt-1 space-y-0.5">
                  <div>• lopu2.vercel.app</div>
                  <div>• lopuweb-36hscdsho-tanbaodl-4690s-projects.vercel.app</div>
                </div>
              </li>
              <li>Bấm <strong>Save</strong> để hoàn tất.</li>
            </ol>
          </div>
        </div>
      </div>

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
