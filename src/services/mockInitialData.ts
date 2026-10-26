import { ClassItem, UserProfile, ScheduleItem, StudentProgress, TeacherDocument, StudentGradeRecord, ClassSeatingPlan } from './storageTypes';

export const INITIAL_USERS: UserProfile[] = [
  { 
    id: 'u_superadmin_1', 
    name: 'Đỗ Tấn Bảo', 
    nickname: 'Th Bảo',
    email: 'tanbaobg@gmail.com', 
    role: 'superadmin', 
    roles: ['superadmin'],
    isProtected: true, 
    isGoogleAuth: true, 
    phone: '0912999888', 
    createdAt: '2025-08-01',
    diamonds: 1000,
    hearts: 100
  },
  { 
    id: 'u_superadmin_2', 
    name: 'Đỗ Tấn Bảo', 
    nickname: 'Th Bảo',
    email: 'tanbaodl@gmail.com', 
    role: 'superadmin', 
    roles: ['superadmin'],
    isProtected: true, 
    isGoogleAuth: true, 
    phone: '0912999999', 
    createdAt: '2025-08-01',
    diamonds: 1000,
    hearts: 100
  },
];

export const INITIAL_CLASSES: ClassItem[] = [
  {
    id: 'cls_open_library',
    name: 'Kho Tài Liệu 💎',
    code: 'KTL-OPEN',
    subject: 'Chung (Tất cả môn)',
    grade: 'Toàn trường',
    teacherId: 'u_superadmin_1',
    teacherName: 'Hệ thống & Tất cả GV',
    room: 'Kho Học Liệu Công Khai',
    pinCode: '000000',
    requirePin: false,
    studentCount: 999,
    academicYear: '2025-2026',
    semester: 'Học kỳ I',
    color: 'emerald',
    description: 'Kho tài liệu công khai dành cho tất cả học sinh và thành viên hệ thống truy cập (chứa cả tài liệu Miễn phí 🆓 và Trả phí Kim Cương 💎)',
    lessons: [
      {
        id: 'les_lib_01',
        title: 'Bộ Đề Thi Thử THPT Quốc Gia - Chuyên Đề Toán 12',
        unit: 'Chuyên đề 01',
        description: 'Tài liệu tổng hợp đề thi thử chuẩn cấu trúc Bộ GD&ĐT có đáp án và lời giải chi tiết.',
        isUnlocked: true,
        estimatedMinutes: 90,
        unlockDate: '2025-09-01',
        tags: ['Đề thi', 'Toán 12', 'Miễn phí'],
      },
      {
        id: 'les_lib_02',
        title: 'Bí Quyết Ôn Thi Siêu Tốc & Bài Tập Phân Loại Cao 9+',
        unit: 'Chuyên đề 02',
        description: 'Chuyên đề bài tập phân hóa vận dụng cao lấy điểm 9+ kèm sơ đồ tư duy tóm tắt.',
        isUnlocked: true,
        estimatedMinutes: 120,
        unlockDate: '2025-09-05',
        tags: ['Vận dụng cao', 'Toán 12', 'Kim Cương 💎'],
      },
    ],
  },
  {
    id: 'cls_12a1',
    name: 'Lớp 12A1 - Toán Chuyên',
    code: '12A1-TOAN',
    subject: 'Toán Học',
    grade: 'Lớp 12',
    teacherId: 'u_superadmin_1',
    teacherName: 'Thầy Đỗ Tấn Bảo',
    room: 'Phòng A101',
    pinCode: '123456',
    requirePin: true,
    studentCount: 38,
    academicYear: '2025-2026',
    semester: 'Học kỳ I',
    color: 'indigo',
    description: 'Lớp học Toán chuyên sâu THPT Chuyên',
    lessons: [
      {
        id: 'les_12a1_01',
        title: 'Chương 1: Đơn Điệu & Cực Trị Hàm Số',
        unit: 'Bài 01',
        description: 'Lý thuyết cơ bản, các dạng toán xác định khoảng đơn điệu và cực trị hàm số.',
        isUnlocked: true,
        estimatedMinutes: 45,
        unlockDate: '2025-09-01',
        tags: ['Toán 12', 'Đơn điệu', 'Cực trị'],
      },
    ],
  },
];

export const INITIAL_SEATING_PLANS: Record<string, ClassSeatingPlan> = {};

export const INITIAL_SCHEDULE: ScheduleItem[] = [];

export const INITIAL_PROGRESS: StudentProgress[] = [];

export const INITIAL_TEACHER_DOCS: TeacherDocument[] = [];

export const INITIAL_STUDENT_GRADES: StudentGradeRecord[] = [];
