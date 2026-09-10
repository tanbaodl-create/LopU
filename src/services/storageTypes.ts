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
}

export interface UserProfile {
  id: string; // Khóa chính: Google UID hoặc Google Email định danh trong Firebase Firestore
  name: string; // 1. Họ và Tên
  nickname?: string; // 2. Biệt Danh (Cá nhân tự sửa)
  gender?: 'Nam' | 'Nữ' | 'Khác' | string; // 3. Giới tính
  workplace?: string; // 4. Nơi công tác/học tập
  email: string; // 5. Google Email
  role: UserRole; // Vai trò chính
  roles?: UserRole[]; // 6. Vai Trò (Có thể có nhiều vai trò)
  gps?: string; // 7. Tọa Độ GPS (Google Maps: lat, lng)
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
  fileType: 'pdf' | 'docx' | 'gdoc' | 'sheet' | 'json';
  createdAt: string;
  updatedAt: string;
  isPublished: boolean;
  publishedToClasses: string[];
  driveFileId?: string;
  driveSynced: boolean;
  fileSize: string;
  authorId: string;
  authorEmail?: string;
  contentSnippet?: string;
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
