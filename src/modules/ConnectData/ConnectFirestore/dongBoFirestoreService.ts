/**
 * Dịch vụ đồng bộ Firebase Firestore & Quản lý danh tính tài khoản Google
 * Đường dẫn cô lập: src/modules/ConnectData/ConnectFirestore/dongBoFirestoreService.ts
 */

import {
  UserProfile,
  UserRole,
  SUPERADMIN_EMAILS,
} from '../../../services/storageTypes';
import {
  getUsers,
  saveUser,
  deleteUser,
  importUsersWithDeduplication,
  getClasses,
  saveClass,
  deleteClass,
  getStudentProgressList,
  updateProgress,
  getSeatingPlan,
  saveSeatingPlan,
  getPinRequests,
  submitPinRequest,
  reviewPinRequest,
  seedInitialDataIfNeeded,
} from './firestoreService';

export const firestoreUserService = {
  getAll: getUsers,
  getById: async (id: string) => {
    const users = await getUsers();
    return users.find(u => u.id === id) || null;
  },
  getByEmail: async (email: string) => {
    const users = await getUsers();
    return users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
  },
  save: saveUser,
  delete: deleteUser,
  importDeduplicated: importUsersWithDeduplication,
};

export const firestoreClassService = {
  getAll: getClasses,
  save: saveClass,
  delete: deleteClass,
};

export const firestoreProgressService = {
  getAll: getStudentProgressList,
  update: updateProgress,
};

export const firestoreSeatingService = {
  get: getSeatingPlan,
  save: saveSeatingPlan,
};

export const firestorePinService = {
  getRequests: getPinRequests,
  submit: submitPinRequest,
  review: reviewPinRequest,
};

export const SUPERADMIN_LIST: readonly string[] = SUPERADMIN_EMAILS;

/**
 * Kiểm tra xem một email Google có phải là Superadmin bất khả xâm phạm hay không
 */
export function isSuperadminAccount(email: string): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return SUPERADMIN_LIST.some(saEmail => saEmail.toLowerCase() === normalized);
}

/**
 * Xác định vai trò chuẩn xác dựa trên tài khoản Google
 */
export function resolveUserRoleFromGoogleAuth(email: string, requestedRole?: UserRole): UserRole {
  if (isSuperadminAccount(email)) {
    return 'superadmin';
  }
  return requestedRole || 'guest';
}

/**
 * Kiểm tra quyền hạn của tài khoản
 */
export function checkUserPermissions(user: UserProfile) {
  const isSuperadmin = isSuperadminAccount(user.email) || user.role === 'superadmin';
  const isAdmin = isSuperadmin || user.role === 'admin';
  const isManager = user.role === 'manager';
  const isTeacher = isSuperadmin || isAdmin || user.role === 'teacher';
  const isAssistant = user.role === 'assistant';
  const isStudent = user.role === 'student';
  const isParent = user.role === 'parent';
  const isGuest = user.role === 'guest';

  return {
    canManageAll: isSuperadmin || isAdmin,
    canManageSubject: (subjectName?: string) => {
      if (isSuperadmin || isAdmin) return true;
      if (isManager && subjectName && user.assignedSubject) {
        return user.assignedSubject.toLowerCase().includes(subjectName.toLowerCase());
      }
      return false;
    },
    canCreateClass: isSuperadmin || isAdmin || isTeacher,
    canManageClassStudents: isSuperadmin || isAdmin || isTeacher,
    canUploadTeachingMaterials: isSuperadmin || isAdmin || isTeacher,
    canGradeOrAssist: isSuperadmin || isAdmin || isTeacher || isAssistant,
    canViewLessonsAndSubmit: isStudent,
    canViewChildProgress: isParent,
    isProtectedFromDeletion: isSuperadmin,
  };
}

/**
 * Tạo hoặc cập nhật tài khoản Google đăng nhập Firebase Firestore
 * Chuẩn hóa 14 trường thông tin người dùng lưu trên Firestore
 */
export async function syncGoogleAuthUserToFirestore(googleUser: {
  uid: string;
  email: string;
  displayName?: string;
  desiredRole?: UserRole;
  nickname?: string;
  gender?: string;
  workplace?: string;
  phone?: string;
  homeAddress?: string;
}): Promise<UserProfile> {
  const isSuperadmin = isSuperadminAccount(googleUser.email);
  const finalRole: UserRole = isSuperadmin ? 'superadmin' : (googleUser.desiredRole || 'guest');

  const existing = await firestoreUserService.getById(googleUser.uid) 
    || (googleUser.email ? await firestoreUserService.getByEmail(googleUser.email) : null);

  const profileData: UserProfile = {
    id: googleUser.uid || googleUser.email,
    name: googleUser.displayName || (isSuperadmin ? 'Superadmin Google' : 'Người dùng Google'),
    nickname: googleUser.nickname || existing?.nickname || '',
    gender: googleUser.gender || existing?.gender || 'Khác',
    workplace: googleUser.workplace || existing?.workplace || '',
    email: googleUser.email,
    role: finalRole,
    roles: existing?.roles || [finalRole],
    gps: existing?.gps || (isSuperadmin ? (googleUser.email.includes('bg') ? '21.273099, 106.194602' : '11.940419, 108.458313') : ''),
    phone: googleUser.phone || existing?.phone || '',
    homeAddress: googleUser.homeAddress || existing?.homeAddress || '',
    classIds: existing?.classIds || [],
    subjects: existing?.subjects || [],
    managedSubjects: existing?.managedSubjects || [],
    groupOrTeam: existing?.groupOrTeam || '',
    classTitle: existing?.classTitle || '',
    isApproved: isSuperadmin || (existing ? existing.isApproved : false),
    isProtected: isSuperadmin,
  };

  await firestoreUserService.save(profileData);
  return profileData;
}

export { seedInitialDataIfNeeded };
