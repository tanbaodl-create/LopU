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

export const INITIAL_CLASSES: ClassItem[] = [];

export const INITIAL_SEATING_PLANS: Record<string, ClassSeatingPlan> = {};

export const INITIAL_SCHEDULE: ScheduleItem[] = [];

export const INITIAL_PROGRESS: StudentProgress[] = [];

export const INITIAL_TEACHER_DOCS: TeacherDocument[] = [];

export const INITIAL_STUDENT_GRADES: StudentGradeRecord[] = [];
