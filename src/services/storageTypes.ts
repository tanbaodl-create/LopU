export type UserRole = 
  | 'superadmin' 
  | 'admin' 
  | 'manager' 
  | 'teacher' 
  | 'assistant' 
  | 'student' 
  | 'parent' 
  | 'guest';

export const SUPERADMIN_EMAILS = ['tanbaobg@gmail.com', 'tanbaodl@gmail.com'] as const;

/**
 * Kiểm tra vai trò từ Giáo viên trở lên (Superadmin, Admin, Manager, Teacher, Assistant)
 */
export function isTeacherOrHigher(role?: UserRole): boolean {
  if (!role) return false;
  return (
    role === 'superadmin' ||
    role === 'admin' ||
    role === 'manager' ||
    role === 'teacher' ||
    role === 'assistant'
  );
}

export interface TeachingMaterialFolderHierarchy {
  chuong: string; // Chương (Ví dụ: Chương 1: Hàm số và Đồ thị)
  bai: string; // Bài (Ví dụ: Bài 1: Tính đơn điệu của hàm số)
  vanDe: string; // Vấn đề (Ví dụ: Vấn đề 1: Tìm khoảng đơn điệu)
  chuyenDe: string; // Chuyên đề (Ví dụ: Chuyên đề: Cực trị chứa tham số m)
}

export interface StudentProfile {
  id: string;
  name: string;
  nickname?: string;
  email: string;
  studentCode: string;
  phone?: string;
  avatar?: string;
  gps?: string;
  currentClassId?: string;
  status?: 'active' | 'inactive';
  level?: number; // Mức độ học sinh (1-6): Mức 1 (0-<=2đ), Mức 2 (2-<4đ), Mức 3 (4-<6đ), Mức 4 (6-<8đ), Mức 5 (8-9đ), Mức 6 (>9-10đ)
  suggestedLevel?: number; // Mức độ gợi ý dựa trên dữ liệu cải thiện điểm số
}

export interface QuestionLevelDef {
  level: number; // 1 to 6
  label: string; // "Mức 1 (0 - ≤2đ)", "Mức 2 (2 - <4đ)", ...
  scoreRange: string; // "0 - ≤2đ"
  description: string;
  badgeColor: string;
}

export const QUESTION_LEVELS: QuestionLevelDef[] = [
  { level: 1, label: 'Mức 1', scoreRange: '0 → ≤2 điểm', description: 'Nhận biết rất cơ bản (Điểm 0 - ≤2)', badgeColor: 'bg-slate-100 text-slate-700 border-slate-300' },
  { level: 2, label: 'Mức 2', scoreRange: '>2 → <4 điểm', description: 'Nhận biết & thông hiểu cơ bản (Điểm >2 - <4)', badgeColor: 'bg-sky-50 text-sky-700 border-sky-200' },
  { level: 3, label: 'Mức 3', scoreRange: '4 → <6 điểm', description: 'Thông hiểu trung bình (Điểm 4 - <6)', badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { level: 4, label: 'Mức 4', scoreRange: '6 → <8 điểm', description: 'Vận dụng khá (Điểm 6 - <8)', badgeColor: 'bg-amber-50 text-amber-700 border-amber-200' },
  { level: 5, label: 'Mức 5', scoreRange: '8 → 9 điểm', description: 'Vận dụng cao - Giỏi (Điểm 8 - 9)', badgeColor: 'bg-purple-50 text-purple-700 border-purple-200' },
  { level: 6, label: 'Mức 6', scoreRange: '>9 → 10 điểm', description: 'Vận dụng rất cao - Xuất sắc (Điểm >9 - 10)', badgeColor: 'bg-rose-50 text-rose-700 border-rose-200' },
];

export interface UserProfile {
  id: string; // Khóa chính: Google UID hoặc Google Email định danh trong Firebase Firestore
  name: string; // 1. Họ và Tên
  nickname?: string; // 2. Biệt Danh (Cá nhân tự sửa)
  gender?: 'Nam' | 'Nữ' | 'Khác' | string; // 3. Giới tính
  workplace?: string; // 4. Nơi công tác/học tập
  email: string; // 5. Google Email
  role: UserRole; // Vai trò chính
  roles?: UserRole[]; // 6. Vai Trò (Có thể có nhiều vai trò)
  gps?: string; // 7. Dẫn đường (Google Maps: lat, lng)
  gpsAddress?: string;
  phone?: string; // 8. SĐT
  homeAddress?: string; // 9. Địa chỉ nhà
  classIds?: string[]; // 10. Các Lớp dạy/học
  subjects?: string[]; // 11. Các môn dạy/học
  managedSubjects?: string[]; // 12. Các môn giữ vai trò quản lý (nằm trong các môn dạy/học)
  groupOrTeam?: string; // 13. Phân nhóm/tổ
  classTitle?: string; // 14. Chức danh trong lớp (LT, PHT, VTM, PLĐ, CĐ, BT, PBT, UV, TT, TP, ban cán sự môn)
  classTitles?: string[]; // 14. Các chức danh trong lớp (Hỗ trợ chọn nhiều chức danh)
  isApproved?: boolean; // Đã duyệt qua vai trò chính thức
  isProtected?: boolean; // Superadmin vĩnh viễn
  studentCode?: string; // Mã học sinh/nhân viên
  assignedSubject?: string; // Môn phụ trách nếu là quản lý
  isGoogleAuth?: boolean;
  createdAt?: string;
  updatedAt?: string;
  diamonds?: number; // Ví Kim Cương 💎: Tiền số của ứng dụng (do admin nạp, dùng mua tài liệu)
  hearts?: number; // Điểm Tim ❤️: Điểm đánh giá năng lực/uy tín tài khoản (không mua bán)
  level?: number; // Mức độ năng lực học sinh (1-6)
  suggestedLevel?: number; // Mức độ gợi ý từ kết quả điểm số
}

export interface ClassLesson {
  id: string;
  title: string;
  description: string;
  unit: string;
  isUnlocked: boolean;
  unlockDate?: string;
  documentUrl?: string;
  driveFileId?: string;
  driveSync?: boolean;
  estimatedMinutes?: number;
  tags?: string[];
}

export interface ClassItem {
  id: string;
  code: string; // e.g. "LOP-10A1"
  name: string; // e.g. "Toán Học Nâng Cao 10A1"
  subject: string;
  grade: string;
  teacherId: string;
  teacherName: string;
  room: string;
  pinCode: string;
  requirePin: boolean;
  description?: string;
  studentCount: number;
  studentIds?: string[];
  academicYear: string;
  semester: string;
  lessons: ClassLesson[];
  color: string;
  updatedAt?: string;
  gpsCoords?: string;
  assistantIds?: string[];
  assistantNames?: string[];
}

export interface ImportDeduplicationReport {
  totalProcessed: number;
  addedToClass: number;
  skippedDuplicates: number;
  newUsersCreated: number;
  linkedExistingUsers: number;
  items: Array<{
    name: string;
    email: string;
    studentCode?: string;
    status: 'already_in_class' | 'linked_existing_user' | 'created_new_user' | 'skipped_duplicate';
    message: string;
  }>;
}

export interface SeatingSeat {
  id: string;
  row: number;
  col: number;
  studentId?: string;
  studentName?: string;
  studentCode?: string;
  status?: 'present' | 'absent' | 'late' | 'empty';
  notes?: string;
}

export interface ClassSeatingPlan {
  classId: string;
  className: string;
  rows?: number;
  cols?: number;
  room?: string;
  teacherName?: string;
  academicYear?: string;
  seats: SeatingSeat[];
  updatedAt?: string;
  driveSynced?: boolean;
}

export interface ScheduleItem {
  id: string;
  dayOfWeek: number; // 1: Monday (Thứ 2), 2: Thứ 3, ..., 7: Chủ Nhật
  dayName: string;
  period: number; // Tiết 1 - 5
  time: string; // "07:30 - 08:15"
  subject: string;
  className: string;
  classCode: string;
  room: string;
  teacher: string;
  status: 'upcoming' | 'ongoing' | 'completed';
  notes?: string;
}

export interface StudentProgress {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  completedLessons: number;
  totalLessons: number;
  completionRate: number; // Percentage 0 - 100
  attendanceRate: number; // Percentage 0 - 100
  averageScore: number; // 0 - 10
  lastActive: string;
  recentScore?: number;
  updatedAt?: string;
}

export interface PinJoinRequest {
  id: string;
  classId: string;
  className: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  submittedPin: string;
  status: 'pending' | 'approved' | 'rejected';
  requestDate: string;
  updatedAt?: string;
}

export type GranularNodePublishStatus = 'inherit' | 'published' | 'unpublished';

export interface ClassPublishSchedule {
  startDate?: string; // Thời gian bắt đầu phát hành ("YYYY-MM-DDTHH:mm")
  endDate?: string;   // Thời gian kết thúc phát hành ("YYYY-MM-DDTHH:mm")
  nodeOverrides?: Record<string, GranularNodePublishStatus>; // Tùy chỉnh phát hành theo từng cấp con (Chương, Bài, Vấn đề, Chuyên đề, Bài đánh giá, Luyện tập, KTDG)
}

export interface NodePublishConfig {
  isPublished?: boolean;
  isForSale?: boolean;
  priceDiamonds?: number;
  publishedToClasses?: string[]; // Danh sách các lớp nhận riêng tài liệu ở cấp độ này
  classSchedules?: Record<string, ClassPublishSchedule>; // Hạn giờ mở phát hành theo lớp cho riêng cấp độ này
}

export interface TeacherDocument {
  id: string;
  title: string;
  subject: string;
  grade: string;
  // Cấu trúc phân cấp tài liệu dạy học trên Drive của giáo viên: Chương -> Bài -> Vấn đề -> Chuyên đề
  chuong?: string; // Ví dụ: "Chương 1: Mệnh đề & Tập hợp"
  bai?: string; // Ví dụ: "Bài 1: Khái niệm Mệnh đề"
  vanDe?: string; // Ví dụ: "Vấn đề 1: Mệnh đề phủ định và kéo theo"
  chuyenDe?: string; // Ví dụ: "Chuyên đề: Ứng dụng suy luận toán học"
  driveFolderPath?: string; // Đường dẫn thư mục Google Drive: "Chương 1/Bài 1/Vấn đề 1/Chuyên đề"
  category: 'lesson_plan' | 'exercise' | 'slide' | 'exam' | 'reference';
  fileType: 'pdf' | 'docx' | 'gdoc' | 'sheet' | 'json' | 'html';
  createdAt: string;
  updatedAt: string;
  isPublished: boolean;
  publishedToClasses: string[];
  classSchedules?: Record<string, ClassPublishSchedule>; // Lịch bắt đầu/kết thúc phát hành cho từng lớp (hoặc open-library)
  globalNodeOverrides?: Record<string, GranularNodePublishStatus>; // Ghi đè phát hành cấp nút mặc định chung
  nodeConfigs?: Record<string, NodePublishConfig>; // Cấu hình phát hành & bán Kim Cương riêng cho từng vị trí / cấp độ (Chương, Bài, Vấn đề, KTDG, ...)
  driveFileId?: string;
  driveSynced: boolean;
  fileSize: string;
  authorId: string;
  authorEmail?: string;
  contentSnippet?: string;
  isForSale?: boolean; // Phát hành có phí thu bằng Kim Cương
  priceDiamonds?: number; // Giá bán tài liệu bằng Kim Cương 💎
  purchasedUserIds?: string[]; // Danh sách các học sinh đã mua tài liệu
}

export interface StudentGradeRecord {
  id: string;
  studentId: string;
  studentCode: string;
  studentName: string;
  classId: string;
  regularScore1: number; // Miệng / 15p
  regularScore2: number;
  midtermScore: number; // Giữa kỳ
  finalScore: number; // Cuối kỳ
  average: number;
  evaluation: string;
  notes: string;
  lastUpdated: string;
  driveSynced: boolean;
}

export interface DriveSyncStatus {
  isConnected: boolean;
  userEmail?: string;
  lastSyncTime?: string;
  teacherDriveFilesCount: number;
  personalDriveFilesCount: number;
  isSyncing: boolean;
}
