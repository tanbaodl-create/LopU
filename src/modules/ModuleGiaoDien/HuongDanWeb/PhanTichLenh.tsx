import React, { useState } from 'react';
import {
  Terminal,
  Sparkles,
  Copy,
  Check,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import { ViewId } from '../Navigation/menuConfig';

export interface ModuleOption {
  id: string;
  name: string;
  submodule: string;
  folderPath: string;
  parentModule: string;
  mainFile: string;
  keywords: string[];
  defaultAction: string;
}

export interface AnalyzedModuleItem {
  moduleId: string;
  submodule: string;
  folderPath: string;
  mainFile: string;
  specificChange: string;
}

export const MODULE_TARGETS: ModuleOption[] = [
  // ModuleHocSinh
  {
    id: 'LopHoc',
    name: 'Lớp Học & Bài Giảng',
    submodule: 'LopHoc',
    folderPath: 'src/modules/ModuleHocSinh/LopHoc',
    parentModule: 'ModuleHocSinh',
    mainFile: 'LopHocView.tsx',
    keywords: ['lớp học', 'bài giảng', 'tiến độ', 'khóa học', 'học tập', 'lophoc', 'chọn lớp', 'dropdown lớp', 'bài học', 'tiết học', 'video'],
    defaultAction: 'Cập nhật danh sách bài giảng, bộ lọc khóa học và tiến độ hoàn thành bài học',
  },
  {
    id: 'SoDoLop',
    name: 'Sơ Đồ Chỗ Ngồi Lớp Học',
    submodule: 'SoDoLop',
    folderPath: 'src/modules/ModuleHocSinh/SoDoLop',
    parentModule: 'ModuleHocSinh',
    mainFile: 'SoDoLopView.tsx',
    keywords: ['sơ đồ lớp', 'chỗ ngồi', 'bàn học', 'vị trí', 'sodolop', 'kê bàn', 'dãy bàn', 'học sinh ngồi', 'ghế', 'bàn', 'chỗ'],
    defaultAction: 'Cập nhật vị trí chỗ ngồi học sinh, màu sắc bàn ghế và bố cục phòng học',
  },
  {
    id: 'ThoiKhoaBieu',
    name: 'Thời Khóa Biểu Tuần',
    submodule: 'ThoiKhoaBieu',
    folderPath: 'src/modules/ModuleHocSinh/ThoiKhoaBieu',
    parentModule: 'ModuleHocSinh',
    mainFile: 'ThoiKhoaBieuView.tsx',
    keywords: ['thời khóa biểu', 'tkb', 'lịch học', 'tiết học', 'lịch tuần', 'thoikhoabieu', 'thứ 2', 'thứ 7', 'thứ hai', 'tiết', 'buổi học'],
    defaultAction: 'Cập nhật bảng thời khóa biểu tuần, hiển thị tiết học và sự kiện tương tác',
  },
  {
    id: 'DangKyLop',
    name: 'Đăng Ký Vào Lớp Học',
    submodule: 'DangKyLop',
    folderPath: 'src/modules/ModuleHocSinh/DangKyLop',
    parentModule: 'ModuleHocSinh',
    mainFile: 'DangKyLopView.tsx',
    keywords: ['đăng ký', 'mã pin', 'mã lớp', 'vào lớp', 'tham gia lớp', 'dangkylop', 'pin code', 'nhập pin', 'xin vào lớp'],
    defaultAction: 'Cập nhật quy trình kiểm tra mã PIN và gửi yêu cầu xin gia nhập lớp học',
  },

  // ModuleGiaoVien
  {
    id: 'QuanLyLopDay',
    name: 'Quản Lý Lớp Dạy & Học Sinh',
    submodule: 'QuanLyLopDay',
    folderPath: 'src/modules/ModuleGiaoVien/QuanLyLopDay',
    parentModule: 'ModuleGiaoVien',
    mainFile: 'QuanLyLopDayView.tsx',
    keywords: ['lớp dạy', 'giáo viên', 'bài tập', 'tạo lớp', 'mở lớp', 'giao bài', 'quanlylopday', 'quản lý lớp', 'chấm bài', 'danh sách lớp'],
    defaultAction: 'Quản lý mở lớp dạy mới, danh sách lớp học và giao nhiệm vụ học tập',
  },
  {
    id: 'NhapHocSinh',
    name: 'Nhập & Xóa Học Sinh (Excel)',
    submodule: 'NhapHocSinh',
    folderPath: 'src/modules/ModuleGiaoVien/NhapHocSinh',
    parentModule: 'ModuleGiaoVien',
    mainFile: 'nhapHocSinhService.ts',
    keywords: ['nhập học sinh', 'excel', 'import', 'xóa học sinh', 'thêm học sinh', 'danh sách học sinh', 'nhaphocsinh', 'tải lên file', 'bảng tính', 'csv'],
    defaultAction: 'Thêm/xóa học sinh và nhập danh sách Excel chống trùng lặp theo định danh Google',
  },
  {
    id: 'TheoDoiHocSinh',
    name: 'Theo Dõi & Điểm Danh Học Sinh',
    submodule: 'TheoDoiHocSinh',
    folderPath: 'src/modules/ModuleGiaoVien/TheoDoiHocSinh',
    parentModule: 'ModuleGiaoVien',
    mainFile: 'TheoDoiHocSinhView.tsx',
    keywords: ['theo dõi', 'điểm danh', 'chuyên cần', 'nhận xét', 'sổ theo dõi', 'theodoihocsinh', 'vắng', 'muộn', 'hạnh kiểm'],
    defaultAction: 'Cập nhật chức năng điểm danh nhanh, theo dõi chuyên cần và nhận xét học sinh',
  },
  {
    id: 'TaiLieuCaNhan',
    name: 'Tài Liệu Dạy Học Drive 4 Cấp (Quy ước Tên & Phân Cấp Drive)',
    submodule: 'TaiLieuCaNhan',
    folderPath: 'src/modules/ModuleGiaoVien/TaiLieuCaNhan',
    parentModule: 'ModuleGiaoVien',
    mainFile: 'TaiLieuCaNhanView.tsx',
    keywords: ['tài liệu', 'giáo án', 'đề thi', 'drive', 'tailieucanhan', 'kho tài liệu', 'file', 'chương', 'bài', 'vấn đề', 'chuyên đề', 'quy ước tên', 'kiểm tra drive', 'thêm mới', 'xóa tài liệu', 'vui lòng đợi', 'chờ phản hồi'],
    defaultAction: 'Quản lý tài liệu dạy học Drive theo quy ước {tên môn} {số lớp} - {tên tài liệu}, kiểm tra và tạo/xóa thư mục Drive 2 chiều',
  },
  {
    id: 'HierarchySelector',
    name: 'Bộ Chọn & Quản Lý Phân Cấp Thư Mục Drive',
    submodule: 'TaiLieuCaNhan',
    folderPath: 'src/modules/ModuleGiaoVien/TaiLieuCaNhan',
    parentModule: 'ModuleGiaoVien',
    mainFile: 'HierarchySelector.tsx',
    keywords: ['hierarchyselector', 'bộ chọn phân cấp', 'dropdown cấp', 'chương bài vấn đề', 'thư mục drive', 'chờ google', 'loading đỏ', 'quản lý cây thư mục'],
    defaultAction: 'Bộ chọn 2 nhóm phân cấp (Tài liệu ➔ Nội dung bài dạy) với thông báo chờ đỏ và kiểm tra tồn tại Drive',
  },
  {
    id: 'SoanThao',
    name: 'Trình Soạn Thảo Word, Vẽ Đồ Thị & Bảng Biến Thiên TikZ',
    submodule: 'SoanThao',
    folderPath: 'src/modules/ModuleGiaoVien/SoanThao',
    parentModule: 'ModuleGiaoVien',
    mainFile: 'SoanThaoView.tsx',
    keywords: ['soạn thảo', 'soanthao', 'word', 'tikz', 'bảng biến thiên', 'tikz-tab', 'đồ thị', 'trong suốt', 'không màu nền', 'menu view', 'chèn tikz', 'câu hỏi'],
    defaultAction: 'Trình soạn thảo văn bản Word, vẽ đồ thị TikZ/BBT trong suốt, phân quyền nút TikZ và thanh công cụ cố định',
  },
  {
    id: 'ThuongMaiTaiLieu',
    name: 'Thương Mại & Phát Hành Tài Liệu (Kim Cương 💎)',
    submodule: 'ThuongMaiTaiLieu',
    folderPath: 'src/modules/ModuleGiaoVien/ThuongMaiTaiLieu',
    parentModule: 'ModuleGiaoVien',
    mainFile: 'ThuongMaiTaiLieuView.tsx',
    keywords: ['thương mại', 'thuongmaitailieu', 'bán tài liệu', 'kim cương', 'phát hành', 'ví kim cương', 'doanh thu', 'miễn phí'],
    defaultAction: 'Quản trị giá bán Kim Cương 💎, phân quyền phát hành miễn phí hoặc có phí cho các lớp học',
  },

  // ModuleQuanTri
  {
    id: 'QuanLyNguoiDung',
    name: 'Quản Lý Người Dùng & Phân Quyền',
    submodule: 'QuanLyNguoiDung',
    folderPath: 'src/modules/ModuleQuanTri/QuanLyNguoiDung',
    parentModule: 'ModuleQuanTri',
    mainFile: 'QuanLyNguoiDungView.tsx',
    keywords: ['người dùng', 'tài khoản', 'phân quyền', 'vai trò', 'admin', 'superadmin', 'quản lý môn', 'quanlynguoidung', 'khóa tài khoản', 'rbac'],
    defaultAction: 'Quản lý người dùng, định danh Google Auth và phân quyền 8 vai trò RBAC',
  },
  {
    id: 'BaoCaoGiamSat',
    name: 'Báo Cáo & Thống Kê Giám Sát',
    submodule: 'BaoCaoGiamSat',
    folderPath: 'src/modules/ModuleQuanTri/BaoCaoGiamSat',
    parentModule: 'ModuleQuanTri',
    mainFile: 'BaoCaoGiamSatView.tsx',
    keywords: ['báo cáo', 'giám sát', 'thống kê', 'biểu đồ', 'tổng quan', 'baocaogiamsat', 'dashboard', 'chỉ số'],
    defaultAction: 'Cập nhật báo cáo giám sát tổng thể, biểu đồ chuyên cần và chỉ số toàn trường',
  },
  {
    id: 'PhanQuyenLopHoc',
    name: 'Phân Công GV & Mã PIN Bảo Mật',
    submodule: 'PhanQuyenLopHoc',
    folderPath: 'src/modules/ModuleQuanTri/PhanQuyenLopHoc',
    parentModule: 'ModuleQuanTri',
    mainFile: 'PhanQuyenLopHocView.tsx',
    keywords: ['mã pin', 'bảo mật', 'quyền', 'phân công', 'phanquyenlophoc', 'pin lớp', 'khóa mã pin', 'giáo viên phụ trách', 'môn học'],
    defaultAction: 'Phân công giáo viên phụ trách môn học và thiết lập mã PIN bảo mật lớp học',
  },

  // ModuleGiaoDien
  {
    id: 'Navigation',
    name: 'Thanh Điều Hướng & Menu Tabs',
    submodule: 'Navigation',
    folderPath: 'src/modules/ModuleGiaoDien/Navigation',
    parentModule: 'ModuleGiaoDien',
    mainFile: 'NavigationContainer.tsx',
    keywords: ['menu', 'sidebar', 'navbar', 'thanh điều hướng', 'chuyển tab', 'navigation', 'menuconfig'],
    defaultAction: 'Cập nhật danh mục menu, icon và định tuyến chuyển view',
  },
  {
    id: 'GiaoDienMacDinh',
    name: 'Khung Giao Diện Mặc Định (AppLayout)',
    submodule: 'GiaoDienMacDinh',
    folderPath: 'src/modules/ModuleGiaoDien/GiaoDienMacDinh',
    parentModule: 'ModuleGiaoDien',
    mainFile: 'AppLayout.tsx',
    keywords: ['layout chung', 'header', 'sidebar', 'applayout', 'khung ứng dụng', 'giaodienmacdinh'],
    defaultAction: 'Cập nhật khung AppLayout chung, thanh Header và thanh bên ứng dụng',
  },
  {
    id: 'GiaoDienHocSinh',
    name: 'Khung Giao Diện Học Sinh (Layout)',
    submodule: 'GiaoDienHocSinh',
    folderPath: 'src/modules/ModuleGiaoDien/GiaoDienHocSinh',
    parentModule: 'ModuleGiaoDien',
    mainFile: 'GiaoDienHocSinhLayout.tsx',
    keywords: ['layout học sinh', 'khung học sinh', 'giaodienhocsinh', 'header học sinh'],
    defaultAction: 'Cập nhật layout không gian học tập và thông tin định danh học sinh',
  },
  {
    id: 'GiaoDienGiaoVien',
    name: 'Khung Giao Diện Giáo Viên (Layout)',
    submodule: 'GiaoDienGiaoVien',
    folderPath: 'src/modules/ModuleGiaoVien/GiaoDienGiaoVien',
    parentModule: 'ModuleGiaoVien',
    mainFile: 'GiaoDienGiaoVienLayout.tsx',
    keywords: ['layout giáo viên', 'khung giáo viên', 'giaodiengiaovien', 'header giáo viên'],
    defaultAction: 'Cập nhật layout khu vực sư phạm và trạng thái giảng dạy của giáo viên',
  },
  {
    id: 'GiaoDienQuanTri',
    name: 'Khung Giao Diện Quản Trị (Layout)',
    submodule: 'GiaoDienQuanTri',
    folderPath: 'src/modules/ModuleGiaoDien/GiaoDienQuanTri',
    parentModule: 'ModuleGiaoDien',
    mainFile: 'GiaoDienQuanTriLayout.tsx',
    keywords: ['layout quản trị', 'khung quản trị', 'giaodienquantri', 'header quản trị', 'admin layout'],
    defaultAction: 'Cập nhật layout trung tâm điều hành quản trị trường học',
  },
  {
    id: 'HuongDanWeb',
    name: 'Hướng Dẫn Web & Sơ Đồ Cây',
    submodule: 'HuongDanWeb',
    folderPath: 'src/modules/ModuleGiaoDien/HuongDanWeb',
    parentModule: 'ModuleGiaoDien',
    mainFile: 'HuongDanWebView.tsx',
    keywords: ['sơ đồ cây', 'hướng dẫn web', 'kiến trúc', 'huongdanweb', 'cây module'],
    defaultAction: 'Cập nhật tài liệu sơ đồ cây module và hướng dẫn quy chuẩn ứng dụng',
  },

  // ConnectData
  {
    id: 'ConnectDrive',
    name: 'Đồng Bộ Google Drive API',
    submodule: 'ConnectDrive',
    folderPath: 'src/modules/ConnectData/ConnectDrive',
    parentModule: 'ConnectData',
    mainFile: 'googleDriveService.ts',
    keywords: ['drive', 'google drive', 'oauth', 'đồng bộ file', 'connectdrive', 'tải file drive', 'bảng điểm drive'],
    defaultAction: 'Tích hợp Google Drive API lưu trữ bảng điểm và tài liệu dạy học 4 cấp',
  },
  {
    id: 'ConnectFirestore',
    name: 'Đồng Bộ Firebase Firestore',
    submodule: 'ConnectFirestore',
    folderPath: 'src/modules/ConnectData/ConnectFirestore',
    parentModule: 'ConnectData',
    mainFile: 'dongBoFirestoreService.ts',
    keywords: ['firestore', 'firebase', 'cơ sở dữ liệu', 'database', 'connectfirestore', 'đồng bộ dữ liệu', 'offline'],
    defaultAction: 'Quản lý kết nối cơ sở dữ liệu thời gian thực Firestore và đồng bộ offline',
  },
];

const TREE_MAP_PATH = 'src/modules/ModuleGiaoDien/HuongDanWeb/HuongDanWebView.tsx';

/**
 * Hàm phân tích thông minh: bóc tách yêu cầu người dùng
 * để xác định rõ từng module cần sửa NỘI DUNG CỤ THỂ LÀ GÌ,
 * không sao chép nguyên văn cả câu yêu cầu nhập vào.
 */
function analyzeRequestToModules(text: string): AnalyzedModuleItem[] {
  if (!text || !text.trim()) {
    return [];
  }

  const raw = text.trim();
  const lower = raw.toLowerCase();

  // Tách văn bản thành các phân đoạn / mệnh đề theo liên từ và dấu câu
  const clauses = raw
    .split(/;|\n|\.|\b(?:và|đồng thời|kèm theo|song song|còn|sau đó|sau khi|đối với|kết hợp với)\b/gi)
    .map(c => c.trim())
    .filter(c => c.length > 2);

  const matchedModulesMap = new Map<string, { module: ModuleOption; specificTexts: string[]; score: number }>();

  for (const m of MODULE_TARGETS) {
    let moduleScore = 0;
    const relatedClauses: string[] = [];

    // Kiểm tra từng mệnh đề
    for (const clause of clauses) {
      const cLower = clause.toLowerCase();
      let clauseMatch = false;

      if (cLower.includes(m.submodule.toLowerCase())) {
        moduleScore += 5;
        clauseMatch = true;
      } else if (cLower.includes(m.name.toLowerCase())) {
        moduleScore += 4;
        clauseMatch = true;
      } else {
        for (const kw of m.keywords) {
          if (cLower.includes(kw)) {
            moduleScore += 2;
            clauseMatch = true;
            break;
          }
        }
      }

      if (clauseMatch) {
        relatedClauses.push(clause);
      }
    }

    // Nếu các mệnh đề không bắt được nhưng toàn văn có nhắc đến từ khóa
    if (moduleScore === 0) {
      if (lower.includes(m.submodule.toLowerCase())) moduleScore += 5;
      else if (lower.includes(m.name.toLowerCase())) moduleScore += 4;
      else {
        for (const kw of m.keywords) {
          if (lower.includes(kw)) {
            moduleScore += 2;
            break;
          }
        }
      }
    }

    if (moduleScore >= 2) {
      matchedModulesMap.set(m.id, {
        module: m,
        specificTexts: relatedClauses,
        score: moduleScore,
      });
    }
  }

  // Nếu không match được module nào cụ thể, chọn QuanLyLopDay làm mặc định
  let matchedList = Array.from(matchedModulesMap.values()).sort((a, b) => b.score - a.score);

  if (matchedList.length === 0) {
    const fallback = MODULE_TARGETS.find(m => m.id === 'QuanLyLopDay') || MODULE_TARGETS[0];
    matchedList = [{
      module: fallback,
      specificTexts: [raw],
      score: 1,
    }];
  }

  // Chuyển đổi thành AnalyzedModuleItem với nội dung cụ thể được tinh chế riêng
  return matchedList.map(item => {
    let refinedAction = '';

    if (item.specificTexts.length > 0) {
      // Làm sạch mệnh đề: bỏ các từ nối mở đầu và chuẩn hóa chữ hoa đầu dòng
      let cleaned = item.specificTexts[0].replace(/^(cho|thêm|đổi|sửa|xóa|cập nhật|bổ sung|hiển thị|tạo|cấu hình)\s+/i, (match) => {
        return match.charAt(0).toUpperCase() + match.slice(1);
      });
      cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
      refinedAction = cleaned;
    } else {
      // Tự động tinh chỉnh hành động cụ thể theo đặc thù của module
      refinedAction = `${item.module.defaultAction} phù hợp với yêu cầu`;
    }

    return {
      moduleId: item.module.id,
      submodule: item.module.submodule,
      folderPath: item.module.folderPath,
      mainFile: item.module.mainFile,
      specificChange: refinedAction,
    };
  });
}

/**
 * Xây dựng câu lệnh Prompt chuẩn hóa theo quy tắc Fast-Track
 */
function buildStandardPrompt(
  userInput: string,
  analyzedList: AnalyzedModuleItem[]
): string {
  if (analyzedList.length === 0) return '';

  const moduleNames = analyzedList.map(item => item.submodule).join(', ');
  const titleGoal = userInput.trim() ? userInput.trim() : `Cập nhật tính năng cho ${moduleNames}`;

  const lines: string[] = [];

  if (analyzedList.length === 1) {
    const single = analyzedList[0];
    lines.push(`[Sửa nhanh: ${single.submodule}] ${titleGoal}:`);
    lines.push(`- Module ${single.submodule}: ${single.specificChange}, chỉ sửa trúng đích file trong ${single.folderPath}/${single.mainFile}`);
  } else {
    lines.push(`[Sửa nhanh: ${moduleNames}] ${titleGoal}:`);
    analyzedList.forEach(item => {
      lines.push(`- Module ${item.submodule}: ${item.specificChange}, chỉ sửa trúng đích file trong ${item.folderPath}/${item.mainFile}`);
    });
  }

  // Luôn kèm lệnh đồng bộ Sơ đồ cây module theo Quy tắc 4
  lines.push(`- Cập nhật Sơ đồ cây Module: Đồng thời cập nhật tóm tắt các thay đổi trên vào trang Sơ đồ cây Module trong Hướng dẫn Web, chỉ sửa trúng đích file trong ${TREE_MAP_PATH}`);
  lines.push('Không duyệt lại toàn bộ dự án.');

  return lines.join('\n');
}

interface PhanTichLenhProps {
  onNavigateToView?: (viewId: ViewId) => void;
  onSelectSubmoduleInTree?: (submoduleId: string) => void;
}

export const PhanTichLenh: React.FC<PhanTichLenhProps> = () => {
  // 1. Ô nhập yêu cầu
  const [userInput, setUserInput] = useState<string>('');

  // 2. Danh sách phân tích module & nội dung cụ thể
  const [analyzedModules, setAnalyzedModules] = useState<AnalyzedModuleItem[]>([]);

  // 3. Ô Prompt lệnh chuẩn hóa (người dùng sửa được)
  const [promptValue, setPromptValue] = useState<string>('');

  // Trạng thái copy
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Khi người dùng gõ vào ô nhập yêu cầu, hệ thống tự động phân tích module và nội dung cụ thể
  const handleUserInputChange = (val: string) => {
    setUserInput(val);
    if (!val.trim()) {
      setAnalyzedModules([]);
      setPromptValue('');
      return;
    }

    const analyzed = analyzeRequestToModules(val);
    setAnalyzedModules(analyzed);
    const newPrompt = buildStandardPrompt(val, analyzed);
    setPromptValue(newPrompt);
  };

  // Người dùng sửa trực tiếp nội dung cụ thể của một module đã phân tích
  const handleUpdateSpecificChange = (index: number, newChange: string) => {
    const updated = [...analyzedModules];
    updated[index] = { ...updated[index], specificChange: newChange };
    setAnalyzedModules(updated);
    const newPrompt = buildStandardPrompt(userInput, updated);
    setPromptValue(newPrompt);
  };

  // Thêm một module vào danh sách phân tích
  const handleAddModule = (moduleId: string) => {
    if (!moduleId || analyzedModules.some(m => m.moduleId === moduleId)) return;
    const target = MODULE_TARGETS.find(m => m.id === moduleId);
    if (!target) return;

    const newItem: AnalyzedModuleItem = {
      moduleId: target.id,
      submodule: target.submodule,
      folderPath: target.folderPath,
      mainFile: target.mainFile,
      specificChange: target.defaultAction,
    };

    const updated = [...analyzedModules, newItem];
    setAnalyzedModules(updated);
    const newPrompt = buildStandardPrompt(userInput, updated);
    setPromptValue(newPrompt);
  };

  // Xóa bớt một module khỏi danh sách phân tích
  const handleRemoveModule = (index: number) => {
    const updated = analyzedModules.filter((_, i) => i !== index);
    setAnalyzedModules(updated);
    const newPrompt = buildStandardPrompt(userInput, updated);
    setPromptValue(newPrompt);
  };

  // Nút sao chép câu lệnh
  const handleCopyPrompt = async () => {
    if (!promptValue.trim()) return;
    try {
      await navigator.clipboard.writeText(promptValue);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch (err) {
      console.error('Lỗi sao chép', err);
    }
  };

  return (
    <div id="trang-phan-tich-va-tao-lenh-ai" className="space-y-6 max-w-5xl mx-auto">
      {/* 1. Ô NHẬP YÊU CẦU */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <label htmlFor="input-yeu-cau-ai" className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
              1
            </span>
            <span>Ô nhập yêu cầu</span>
          </label>
          <span className="text-xs text-slate-400">Tự động phân tích theo sơ đồ cây module</span>
        </div>

        <textarea
          id="input-yeu-cau-ai"
          rows={3}
          value={userInput}
          onChange={e => handleUserInputChange(e.target.value)}
          placeholder="Nhập yêu cầu bạn muốn thay đổi... (Ví dụ: Thêm nút xem nhanh sơ đồ chỗ ngồi trên thời khóa biểu và đổi màu nền các bàn học sinh sang màu xanh ngọc)"
          className="w-full p-3.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900 leading-relaxed transition-all"
        />
      </div>

      {/* 2. HỆ THỐNG PHÂN TÍCH MODULE & NỘI DUNG CỤ THỂ CẦN SỬA */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
              2
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Hệ thống phân tích module & nội dung cụ thể cần sửa
              </h3>
              <p className="text-xs text-slate-500">
                Phân tích tách bạch từng module thay đổi gì cụ thể, không để nguyên văn câu yêu cầu nhập vào
              </p>
            </div>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
            {analyzedModules.length} module
          </span>
        </div>

        {analyzedModules.length === 0 ? (
          <div className="p-8 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center space-y-2">
            <Sparkles className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs text-slate-500 font-medium">
              Chưa có yêu cầu. Hãy nhập nội dung vào ô số 1 ở trên để hệ thống tự động bóc tách module và nội dung cụ thể cần sửa.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {analyzedModules.map((item, idx) => (
              <div
                key={item.moduleId}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2.5 transition-all hover:border-indigo-300"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-indigo-600 text-white">
                      Module {item.submodule}
                    </span>
                    <code className="text-xs font-mono text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                      📁 {item.folderPath}/{item.mainFile}
                    </code>
                  </div>
                  {analyzedModules.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveModule(idx)}
                      title="Bỏ module này"
                      className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 block">
                    Nội dung cụ thể cần sửa cho module này (người dùng sửa được):
                  </label>
                  <input
                    type="text"
                    value={item.specificChange}
                    onChange={e => handleUpdateSpecificChange(idx, e.target.value)}
                    placeholder="Mô tả cụ thể thay đổi..."
                    className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800"
                  />
                </div>
              </div>
            ))}

            {/* Thêm module bổ sung */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 flex-wrap gap-2">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 font-medium">Bổ sung module khác:</span>
                <select
                  defaultValue=""
                  onChange={e => {
                    if (e.target.value) {
                      handleAddModule(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="p-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700 cursor-pointer"
                >
                  <option value="" disabled>
                    + Chọn module để thêm...
                  </option>
                  {MODULE_TARGETS.filter(m => !analyzedModules.some(a => a.moduleId === m.id)).map(m => (
                    <option key={m.id} value={m.id}>
                      {m.submodule} — {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="text-[11px] text-emerald-700 flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Tự động kèm lệnh đồng bộ Sơ đồ cây module</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Ô PROMPT LỆNH (NGƯỜI DÙNG SỬA ĐƯỢC + NÚT COPY LỆNH BÊN TRÁI) */}
      <div className="bg-slate-900 text-white rounded-2xl border border-slate-800 p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            {/* Chuyển nút Copy lệnh sang bên trái, thay thế cho số 3 có khoanh tròn */}
            <button
              type="button"
              id="btn-copy-lenh-chuan-hoa"
              onClick={handleCopyPrompt}
              disabled={!promptValue.trim()}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isCopied
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white shadow-xs'
              }`}
            >
              {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{isCopied ? 'Đã sao chép câu lệnh!' : 'Copy lệnh'}</span>
            </button>

            <span className="text-[11px] text-slate-400 italic">
              (Người dùng có thể sửa trực tiếp trong ô này trước khi copy)
            </span>
          </div>

          <div className="text-[11px] text-slate-400 font-mono">
            {promptValue ? `${promptValue.split('\n').length} dòng` : ''}
          </div>
        </div>

        <div className="space-y-2">
          <textarea
            id="textarea-prompt-lenh-chuan-hoa"
            rows={8}
            value={promptValue}
            onChange={e => setPromptValue(e.target.value)}
            placeholder="Câu lệnh chuẩn hóa sẽ xuất hiện tại đây sau khi nhập yêu cầu. Bạn có thể sửa trực tiếp nội dung câu lệnh này..."
            className="w-full p-4 text-xs sm:text-sm font-mono bg-slate-950 border border-slate-800 rounded-xl text-emerald-300 focus:outline-hidden focus:border-indigo-500 leading-relaxed resize-y"
          />
          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
            <span>Dán câu lệnh đã copy vào khung chat AI để thực thi ngay lập tức mà không duyệt lại toàn bộ dự án.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
