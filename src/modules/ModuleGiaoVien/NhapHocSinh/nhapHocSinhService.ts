/**
 * Dịch vụ Quản lý & Nhập học sinh vào lớp học (ModuleGiaoVien/NhapHocSinh)
 * Định danh tài khoản học sinh bằng Google Account (Email/UID) làm khóa chính Firestore
 */

import { StudentProfile, ImportDeduplicationReport, UserProfile } from '../../../services/storageTypes';
import {
  getStudentsByClassId,
  addStudentsToClassWithDeduplication,
  removeStudentFromClass,
  getUsers,
  saveUser,
  saveStudent,
} from '../../ConnectData/ConnectFirestore';

export interface HocSinhInputData {
  name: string;
  email: string;
  phone?: string;
  studentCode?: string;
}

/**
 * Lấy danh sách học sinh của một lớp học
 */
export async function layDanhSachHocSinhCuaLop(classId: string): Promise<StudentProfile[]> {
  return await getStudentsByClassId(classId);
}

/**
 * Thêm danh sách học sinh vào lớp học với cơ chế định danh Google Account và chống trùng lặp
 */
export async function themHocSinhVaoLop(
  classId: string,
  danhSachHocSinh: HocSinhInputData[]
): Promise<ImportDeduplicationReport> {
  return await addStudentsToClassWithDeduplication(classId, danhSachHocSinh);
}

/**
 * Thêm một học sinh đơn lẻ vào lớp với tài khoản Google
 */
export async function themMotHocSinh(
  classId: string,
  hocSinh: HocSinhInputData
): Promise<{ success: boolean; studentId: string; message: string }> {
  const report = await addStudentsToClassWithDeduplication(classId, [hocSinh]);
  if (report.addedToClass > 0 || report.linkedExistingUsers > 0) {
    return {
      success: true,
      studentId: `std_${Date.now()}`,
      message: `Đã thêm học sinh [${hocSinh.name}] (Google: ${hocSinh.email}) vào lớp thành công!`,
    };
  }
  return {
    success: false,
    studentId: '',
    message: `Học sinh [${hocSinh.email}] đã có trong lớp hoặc thông tin không hợp lệ.`,
  };
}

/**
 * Giáo viên xóa học sinh ra khỏi lớp dạy
 */
export async function xoaHocSinhKhoiLop(
  classId: string,
  studentId: string
): Promise<{ success: boolean; message: string }> {
  try {
    await removeStudentFromClass(classId, studentId);
    return {
      success: true,
      message: 'Đã xóa học sinh khỏi danh sách lớp dạy.',
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Không thể xóa học sinh khỏi lớp dạy.',
    };
  }
}

/**
 * Kiểm tra xem tài khoản Google email đã tồn tại trong Firestore hay chưa
 */
export async function kiemTraGoogleAccountTonTai(email: string): Promise<UserProfile | null> {
  const users = await getUsers();
  const found = users.find(u => u.email.trim().toLowerCase() === email.trim().toLowerCase());
  return found || null;
}

/**
 * Chuẩn hóa danh sách chức danh học sinh khi nạp từ Excel, hỗ trợ đầy đủ các chức danh bao gồm VTM (Văn Thể Mỹ)
 */
export function chuanHoaChucDanhHocSinh(titles: string[]): string[] {
  const allowedTitles = [
    'LT', 'PHT', 'TQ', 'CĐ', 'CD', 'PLĐ', 'VTM',
    'BT', 'PBT', 'UV',
    'TT', 'TP',
    'TOÁN', 'LÝ', 'HÓA', 'SINH', 'TIN', 'ANH', 'VĂN', 'SỬ', 'ĐỊA', 'KTPL', 'TOAN', 'LY', 'HOA'
  ];
  return titles
    .map(t => t.trim().toUpperCase())
    .filter(t => t && t !== 'STUDENT' && t !== 'THÀNH VIÊN' && allowedTitles.includes(t));
}

export interface FixedSeatPosition {
  desk: number; // 1..6
  row: number;  // 1 (Dãy 1) hoặc 2 (Dãy 2)
  seatCol: number; // 1..4 (G1..G4)
  label: string; // "bàn 6-dãy 1-G3"
}

export interface StudentFixedSeatRule {
  studentNickname: string;
  positions: FixedSeatPosition[];
  rawText: string;
}

export interface SeatingRulesConfig {
  avoidNearStudents: string; // VD: "Bảo - Tuấn; Cường - Dũng - Giảng" (các nhóm học sinh không được gần nhau)
  fixedSeatRules: StudentFixedSeatRule[];
  studyPairs: string; // VD: "HS1 - HS2; HS3 - HS4" (Cặp đôi cùng tiến)
  showViolationWarnings?: boolean; // Tùy chọn hiển thị cảnh báo vi phạm điều kiện xếp chỗ & nút tự động sửa vi phạm
  lockedTeams?: string[]; // Danh sách các tổ được khóa giữ nguyên thành viên (VD: ['Tổ 1', 'Tổ 2'])
}

export const DEFAULT_SEATING_RULES: SeatingRulesConfig = {
  avoidNearStudents: '',
  fixedSeatRules: [],
  studyPairs: '',
  showViolationWarnings: true,
  lockedTeams: [],
};

/**
 * Phân tích chuỗi điều kiện các nhóm học sinh không ngồi gần nhau
 * VD: "Bạn A - Bạn B; Bạn C - Bạn D - Bạn E" -> [["Bạn A", "Bạn B"], ["Bạn C", "Bạn D", "Bạn E"]]
 */
export function parseAvoidNearGroups(raw: string): string[][] {
  if (!raw || !raw.trim()) return [];
  const lines = raw.split(/[\n;]+/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  const hasGroupSeparators = lines.some(l => l.includes('-') || l.includes(','));

  if (hasGroupSeparators) {
    const groups: string[][] = [];
    for (const line of lines) {
      const items = line.split(/[-,\t]+/).map(x => x.trim()).filter(Boolean);
      if (items.length >= 2) {
        groups.push(items);
      } else if (items.length === 1) {
        if (groups.length > 0) {
          groups[groups.length - 1].push(items[0]);
        } else {
          groups.push(items);
        }
      }
    }
    return groups;
  } else {
    // Nếu chỉ có danh sách phân tách dấu chấm phẩy thông thường, coi như 1 nhóm duy nhất
    if (lines.length >= 2) {
      return [lines];
    }
    return [];
  }
}

/**
 * Chuyển danh sách mảng nhóm các học sinh không gần nhau thành chuỗi chuẩn hiển thị
 */
export function formatAvoidNearGroups(groups: string[][]): string {
  return groups
    .map(g => g.filter(Boolean).join(' - '))
    .filter(Boolean)
    .join('; ');
}

/**
 * Kiểm tra 2 vị trí chỗ ngồi có vi phạm điều kiện "không được gần nhau"
 * (Không được ngồi chung bàn, hoặc bàn liền trên, hoặc bàn liền dưới trên cùng dãy)
 */
export function isAvoidNearViolation(
  c1: { row: number; desk: number },
  c2: { row: number; desk: number }
): boolean {
  if (c1.row === c2.row && Math.abs(c1.desk - c2.desk) <= 1) {
    return true;
  }
  return false;
}


/**
 * Chuẩn hóa và chuyển đổi định dạng vị trí: "bàn 6-dãy 1-G3" -> FixedSeatPosition
 */
export function parseSinglePosition(text: string): FixedSeatPosition | null {
  const clean = text.trim().toLowerCase();
  // Regex khớp các dạng: bàn 6-dãy 1-g3, b6-d1-g3, ban 6 - day 1 - g3
  const match = clean.match(/b(?:àn)?\s*(\d+)\s*[-_–]\s*d(?:ãy)?\s*(\d+)\s*[-_–]\s*g\s*(\d+)/i);
  if (match) {
    const desk = parseInt(match[1], 10);
    const row = parseInt(match[2], 10);
    const seatCol = parseInt(match[3], 10);
    if (desk >= 1 && desk <= 6 && (row === 1 || row === 2) && seatCol >= 1 && seatCol <= 4) {
      return {
        desk,
        row,
        seatCol,
        label: `bàn ${desk}-dãy ${row}-G${seatCol}`,
      };
    }
  }
  return null;
}

/**
 * Phân tích chuỗi nhiều vị trí: "bàn 6-dãy 1-G3; bàn 6-dãy 2-G1; Bàn 5-dãy 1-G2"
 */
export function parseMultiplePositions(raw: string): FixedSeatPosition[] {
  if (!raw) return [];
  const parts = raw.split(/[;,]+/).map(p => p.trim()).filter(Boolean);
  const result: FixedSeatPosition[] = [];
  for (const p of parts) {
    const parsed = parseSinglePosition(p);
    if (parsed && !result.some(r => r.desk === parsed.desk && r.row === parsed.row && r.seatCol === parsed.seatCol)) {
      result.push(parsed);
    }
  }
  return result;
}

/**
 * Chuyển tọa độ Bàn, Dãy, Ghế thành chuỗi hiển thị chuẩn: "bàn 6-dãy 1-G3"
 */
export function formatFixedPosition(desk: number, row: number, seatCol: number): string {
  return `bàn ${desk}-dãy ${row}-G${seatCol}`;
}

/**
 * Chuẩn hóa và kiểm tra đồng bộ vị trí bàn cố định với số ghế thực tế từng bàn của sơ đồ lớp
 */
export function validateAndSyncFixedSeatPositions(
  rules: SeatingRulesConfig,
  getDeskCapacity?: (desk: number, row: number) => number
): SeatingRulesConfig {
  if (!rules || !rules.fixedSeatRules) return rules;

  const updatedRules = rules.fixedSeatRules.map(rule => {
    const validPositions = rule.positions.filter(pos => {
      const maxSeats = getDeskCapacity ? getDeskCapacity(pos.desk, pos.row) : 4;
      return pos.seatCol <= maxSeats;
    });
    return {
      ...rule,
      positions: validPositions,
      rawText: validPositions.map(p => p.label).join('; '),
    };
  });

  return {
    ...rules,
    fixedSeatRules: updatedRules,
  };
}

/**
 * Lấy cấu hình điều kiện xếp chỗ của lớp học từ LocalStorage / Cache
 */
export function getClassSeatingRules(classId: string): SeatingRulesConfig {
  const key = `lopu_seating_rules_v1_${classId}`;
  const raw = localStorage.getItem(key);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      return {
        avoidNearStudents: parsed.avoidNearStudents || '',
        fixedSeatRules: Array.isArray(parsed.fixedSeatRules) ? parsed.fixedSeatRules : [],
        studyPairs: parsed.studyPairs || '',
      };
    } catch {}
  }
  return { ...DEFAULT_SEATING_RULES };
}

/**
 * Lưu cấu hình điều kiện xếp chỗ của lớp học (Gồm 1. Không gần nhau, 2. Vị trí cố định, 3. Cặp đôi cùng tiến)
 */
export function saveClassSeatingRules(classId: string, rules: SeatingRulesConfig): void {
  const key = `lopu_seating_rules_v1_${classId}`;
  const cleanRules: SeatingRulesConfig = {
    avoidNearStudents: (rules?.avoidNearStudents || '').trim(),
    fixedSeatRules: Array.isArray(rules?.fixedSeatRules) ? rules.fixedSeatRules : [],
    studyPairs: (rules?.studyPairs || '').trim(),
  };
  localStorage.setItem(key, JSON.stringify(cleanRules));
}


