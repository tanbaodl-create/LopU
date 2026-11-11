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
    name: 'Kho tài liệu 💎',
    code: 'KTL-OPEN',
    subject: 'Chung (Tất cả môn)',
    grade: 'Toàn trường',
    teacherId: 'u_superadmin_1',
    teacherName: 'Hệ thống & Tất cả GV',
    room: 'Kho Học Liệu Công Khai',
    pinCode: '000000',
    requirePin: false,
    studentCount: 0,
    academicYear: '2025-2026',
    semester: 'Học kỳ I',
    color: 'emerald',
    description: 'Kho tài liệu công khai dành cho tất cả thành viên truy cập (chứa các tài liệu bán và tài liệu miễn phí 0 kim cương)',
    lessons: [],
  },
];

export const INITIAL_SEATING_PLANS: Record<string, ClassSeatingPlan> = {};

export const INITIAL_SCHEDULE: ScheduleItem[] = [];

export const INITIAL_PROGRESS: StudentProgress[] = [];

export const INITIAL_TEACHER_DOCS: TeacherDocument[] = [];

export const INITIAL_STUDENT_GRADES: StudentGradeRecord[] = [];
