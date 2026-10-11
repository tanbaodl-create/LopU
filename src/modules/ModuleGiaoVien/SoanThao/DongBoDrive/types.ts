/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type DongBoDriveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'unsaved';

/**
 * Cấu trúc dữ liệu bài luyện tập (mục 2. Luyện tập có thể có nhiều bài)
 */
export interface ExerciseItemData {
  name: string; // Tên định danh file (ví dụ: 'co_ban', 'trac_nghiem', 'nang_cao')
  title?: string; // Tên hiển thị bài luyện tập
  data?: any; // Dữ liệu câu hỏi / bài tập dạng JSON
}

/**
 * Cấu trúc dữ liệu bài kiểm tra đánh giá (mục 3. KTDG có thể có nhiều bài)
 */
export interface KtdgItemData {
  name: string; // Tên định danh file (ví dụ: '15_phut', '1_tiet', 'danh_gia_nang_luc')
  title?: string; // Tên hiển thị bài KTDG
  data?: any; // Dữ liệu câu hỏi / ma trận đánh giá dạng JSON
}

/**
 * Đánh giá chi tiết cho từng học sinh phần Cải thiện
 */
export interface StudentImprovementItem {
  studentId: string;
  studentName: string;
  lamTot: string[]; // Nội dung làm tốt của học sinh
  chuaTot: string[]; // Nội dung chưa tốt của học sinh
  deXuatCaiThien: string; // Đề xuất cần cải thiện gì
  cachHoc: string; // Phương pháp / cách học phù hợp
  danhGiaChung?: string;
}

/**
 * Dữ liệu phần Cải thiện lưu file CaiThien.json
 */
export interface CaiThienData {
  chuyenDe: string;
  bai?: string;
  chuong?: string;
  lop?: string;
  ngayCapNhat: string;
  danhSachHocSinh: StudentImprovementItem[];
  tongKetChung?: {
    tiLeDat?: string;
    uuDiemChung?: string;
    tonTaiChung?: string;
    deXuatGiaoVien?: string;
    phuongPhapHocChung?: string;
  };
}

export interface DongBoDriveDocData {
  id?: string;
  title: string;
  subject?: string;
  grade?: string;
  chuong?: string;
  bai?: string;
  vanDe?: string;
  chuyenDe?: string;
  tienTrinh?: string; // 'Kiến thức' | 'Luyện tập' | 'KTDG' | 'Cải thiện'
  contentHtml?: string;
  textContent?: string;
  selectedClasses?: string[];
  isForSale?: boolean;
  priceDiamonds?: number;
  // Các tệp đồng bộ theo yêu cầu Chuyên đề
  kienThucName?: string; // Tên bài kiến thức đang chọn (tùy chỉnh)
  kienThucList?: { name: string; title?: string; contentHtml?: string }[]; // Mục 1. Kiến thức (nhiều file -> KienThuc_{tên}.html)
  luyenTapList?: ExerciseItemData[]; // Mục 2. Luyện tập (nhiều bài -> luyentap_{tên}.json)
  ktdgList?: KtdgItemData[]; // Mục 3. KTDG (nhiều bài -> KTDG_{tên}.json)
  caiThienData?: CaiThienData; // Mục 4. Cải thiện -> CaiThien.json
}

export interface SyncedFileInfo {
  name: string;
  fileId: string;
  isCreated: boolean;
  status: 'created' | 'updated';
}

export interface DongBoDriveResult {
  success: boolean;
  drivePath?: string;
  folderId?: string;
  cleanFileName?: string;
  message?: string;
  error?: string;
  savedAt?: string;
  syncedFiles?: SyncedFileInfo[];
}

export interface DongBoDriveButtonProps {
  isSaving?: boolean;
  syncStatus?: DongBoDriveStatus;
  lastSavedTime?: string | null;
  onClick: () => void | Promise<void>;
  className?: string;
  disabled?: boolean;
  title?: string;
}
