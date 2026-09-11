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
