import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db, auth, isFirebaseConfigured } from '../../../config/firebase';
import { decryptData, resolveConflictByTimestamp, enqueueSyncTask } from '../ConnectDataShared';
import {
  ClassItem,
  UserProfile,
  StudentProfile,
  StudentProgress,
  PinJoinRequest,
  ClassSeatingPlan,
  ImportDeduplicationReport,
  UserRole,
  SUPERADMIN_EMAILS,
  TeacherDocument,
} from '../../../services/storageTypes';
import {
  INITIAL_CLASSES,
  INITIAL_USERS,
  INITIAL_PROGRESS,
  INITIAL_SEATING_PLANS,
  INITIAL_TEACHER_DOCS,
} from '../../../services/mockInitialData';
import {
  buildHierarchyFromDocuments,
  saveStoredHierarchy,
  getDeletedFoldersBlacklist,
  addDeletedFolderToBlacklist,
} from '../../ModuleGiaoVien/TaiLieuCaNhan/hierarchyData';

const STORAGE_KEYS = {
  CLASSES: 'lopu_firestore_classes_v1',
  USERS: 'lopu_firestore_users_v1',
  PROGRESS: 'lopu_firestore_progress_v1',
  SEATING: 'lopu_firestore_seating_v1',
  PIN_REQUESTS: 'lopu_firestore_pin_requests_v1',
  DOCUMENTS: 'lopu_firestore_documents_v1',
};

// Error handling helper according to Firebase skill
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): void {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
    },
    operationType,
    path,
  };
  console.warn('Firestore Operation Notice (Fallback to Local Storage):', JSON.stringify(errInfo));
}

// Local storage helpers for reactive fallback
function getLocalItem<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function setLocalItem<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to write to localStorage', err);
  }
}

function parseRemoteDocument<T>(docData: any): T {
  if (docData && docData._encrypted && docData.data) {
    return decryptData(docData.data) as T;
  }
  return docData as T;
}

function mergeAndResolveConflicts<T extends { id: string; updatedAt?: string; modifiedTime?: string }>(
  localList: T[],
  remoteList: T[]
): T[] {
  const mergedMap = new Map<string, T>();
  
  for (const item of localList) {
    mergedMap.set(item.id, item);
  }

  for (const remoteItem of remoteList) {
    const localItem = mergedMap.get(remoteItem.id);
    if (localItem) {
      const resolved = resolveConflictByTimestamp(localItem, remoteItem);
      if (resolved) {
        mergedMap.set(remoteItem.id, resolved);
      }
    } else {
      mergedMap.set(remoteItem.id, remoteItem);
    }
  }

  return Array.from(mergedMap.values());
}

// Initializer to seed local data if empty
export function seedInitialDataIfNeeded(): void {
  // Clear old demo data keys to ensure a clean state
  if (!localStorage.getItem('lopu_demo_cleared_v5')) {
    localStorage.removeItem(STORAGE_KEYS.CLASSES);
    localStorage.removeItem(STORAGE_KEYS.USERS);
    localStorage.removeItem(STORAGE_KEYS.PROGRESS);
    localStorage.removeItem(STORAGE_KEYS.SEATING);
    localStorage.removeItem(STORAGE_KEYS.PIN_REQUESTS);
    localStorage.removeItem(STORAGE_KEYS.DOCUMENTS);
    localStorage.removeItem('lopu_google_drive_files_v1');
    localStorage.setItem('lopu_demo_cleared_v5', 'true');
  }

  if (!localStorage.getItem(STORAGE_KEYS.CLASSES)) {
    setLocalItem(STORAGE_KEYS.CLASSES, INITIAL_CLASSES);
  }
  
  const existingUsers = getLocalItem<UserProfile[]>(STORAGE_KEYS.USERS, []);
  if (existingUsers.length === 0) {
    const seededUsers = INITIAL_USERS.map(u => ({
      ...u,
      diamonds: u.diamonds !== undefined ? u.diamonds : (u.role === 'student' ? 200 : 500),
      hearts: u.hearts !== undefined ? u.hearts : (u.role === 'student' ? 10 : 35)
    }));
    setLocalItem(STORAGE_KEYS.USERS, seededUsers);
  } else {
    // Đảm bảo các user cũ cũng có ví Kim cương và Tim nếu chưa có
    let modified = false;
    const mappedUsers = existingUsers.map(u => {
      const updatedUser = { ...u };
      if (updatedUser.diamonds === undefined) {
        updatedUser.diamonds = u.role === 'student' ? 200 : 500;
        modified = true;
      }
      if (updatedUser.hearts === undefined) {
        updatedUser.hearts = u.role === 'student' ? 10 : 35;
        modified = true;
      }
      return updatedUser;
    });

    // Đảm bảo 2 tài khoản Superadmin luôn có mặt
    for (const saEmail of SUPERADMIN_EMAILS) {
      const found = mappedUsers.some(u => u.email.toLowerCase() === saEmail.toLowerCase());
      if (!found) {
        const saInitial = INITIAL_USERS.find(u => u.email.toLowerCase() === saEmail.toLowerCase());
        if (saInitial) {
          mappedUsers.unshift({
            ...saInitial,
            diamonds: saInitial.diamonds !== undefined ? saInitial.diamonds : 1000,
            hearts: saInitial.hearts !== undefined ? saInitial.hearts : 100
          });
          modified = true;
        }
      }
    }
    if (modified) {
      setLocalItem(STORAGE_KEYS.USERS, mappedUsers);
    }
  }
  if (!localStorage.getItem(STORAGE_KEYS.PROGRESS)) {
    setLocalItem(STORAGE_KEYS.PROGRESS, INITIAL_PROGRESS);
  }
  if (!localStorage.getItem(STORAGE_KEYS.SEATING)) {
    setLocalItem(STORAGE_KEYS.SEATING, INITIAL_SEATING_PLANS);
  }
  if (!localStorage.getItem(STORAGE_KEYS.PIN_REQUESTS)) {
    const samplePinRequests: PinJoinRequest[] = [];
    setLocalItem(STORAGE_KEYS.PIN_REQUESTS, samplePinRequests);
  }
  if (!localStorage.getItem(STORAGE_KEYS.DOCUMENTS)) {
    setLocalItem(STORAGE_KEYS.DOCUMENTS, []);
  }
}

// Ensure seed runs on module load
seedInitialDataIfNeeded();

// ==========================================
// 1. CLASSES SERVICE
// ==========================================
export async function getClasses(): Promise<ClassItem[]> {
  const local = getLocalItem<ClassItem[]>(STORAGE_KEYS.CLASSES, INITIAL_CLASSES);
  if (isFirebaseConfigured && db) {
    try {
      const snap = await getDocs(collection(db, 'classes'));
      if (!snap.empty) {
        const remote = snap.docs.map(d => parseRemoteDocument<ClassItem>({ id: d.id, ...d.data() }));
        const resolved = mergeAndResolveConflicts(local, remote);
        setLocalItem(STORAGE_KEYS.CLASSES, resolved);
        return resolved;
      }
    } catch (err) {
      console.warn('Firestore getClasses fallback to local storage:', err);
    }
  }
  return local;
}

export async function saveClass(classItem: ClassItem): Promise<void> {
  const classWithTimestamp = {
    ...classItem,
    updatedAt: classItem.updatedAt || new Date().toLocaleString('vi-VN')
  };
  
  // Update local storage
  const classes = await getLocalItem<ClassItem[]>(STORAGE_KEYS.CLASSES, INITIAL_CLASSES);
  const index = classes.findIndex(c => c.id === classWithTimestamp.id);
  if (index >= 0) {
    classes[index] = classWithTimestamp;
  } else {
    classes.unshift(classWithTimestamp);
  }
  setLocalItem(STORAGE_KEYS.CLASSES, classes);

  // Queue background sync
  enqueueSyncTask('firestore', 'setDoc', 'classes', classWithTimestamp.id, classWithTimestamp);
}

export async function deleteClass(classId: string): Promise<void> {
  const classes = await getLocalItem<ClassItem[]>(STORAGE_KEYS.CLASSES, INITIAL_CLASSES);
  const filtered = classes.filter(c => c.id !== classId);
  setLocalItem(STORAGE_KEYS.CLASSES, filtered);

  enqueueSyncTask('firestore', 'deleteDoc', 'classes', classId, null);
}

// ==========================================
// 2. USERS SERVICE & IMPORT EXCEL
// ==========================================
export async function getUsers(): Promise<UserProfile[]> {
  const local = getLocalItem<UserProfile[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
  if (isFirebaseConfigured && db) {
    try {
      const snap = await getDocs(collection(db, 'users'));
      if (!snap.empty) {
        const remote = snap.docs.map(d => parseRemoteDocument<UserProfile>({ id: d.id, ...d.data() }));
        const resolved = mergeAndResolveConflicts(local, remote);
        setLocalItem(STORAGE_KEYS.USERS, resolved);
        return resolved;
      }
    } catch (err) {
      console.warn('Firestore getUsers fallback to local storage:', err);
    }
  }
  return local;
}

export async function saveUser(user: UserProfile): Promise<void> {
  const userWithTimestamp = {
    ...user,
    updatedAt: user.updatedAt || new Date().toLocaleString('vi-VN')
  };
  
  const users = await getLocalItem<UserProfile[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
  const index = users.findIndex(u => u.id === userWithTimestamp.id);
  if (index >= 0) {
    users[index] = userWithTimestamp;
  } else {
    users.unshift(userWithTimestamp);
  }
  setLocalItem(STORAGE_KEYS.USERS, users);

  enqueueSyncTask('firestore', 'setDoc', 'users', userWithTimestamp.id, userWithTimestamp);
}

export async function deleteUser(userId: string): Promise<void> {
  const users = await getLocalItem<UserProfile[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
  const target = users.find(u => u.id === userId);
  if (target) {
    const isProtected = target.isProtected || SUPERADMIN_EMAILS.some(e => e.toLowerCase() === target.email.toLowerCase());
    if (isProtected) {
      console.warn(`Không thể xóa tài khoản Superadmin bất khả xâm phạm: ${target.email}`);
      throw new Error(`Tài khoản Superadmin [${target.email}] được bảo vệ vĩnh viễn, không thể xóa khỏi app.`);
    }
  }

  const filtered = users.filter(u => u.id !== userId);
  setLocalItem(STORAGE_KEYS.USERS, filtered);

  enqueueSyncTask('firestore', 'deleteDoc', 'users', userId, null);
}

export async function importUsers(newUsers: UserProfile[]): Promise<number> {
  let count = 0;
  for (const nu of newUsers) {
    await saveUser(nu);
    count++;
  }
  return count;
}

// ==========================================
// 3. STUDENT PROGRESS SERVICE
// ==========================================
export async function getStudentProgressList(classId?: string): Promise<StudentProgress[]> {
  const local = getLocalItem<StudentProgress[]>(STORAGE_KEYS.PROGRESS, INITIAL_PROGRESS);
  let resolved = local;
  if (isFirebaseConfigured && db) {
    try {
      const snap = await getDocs(collection(db, 'progress'));
      if (!snap.empty) {
        const remote = snap.docs.map(d => parseRemoteDocument<StudentProgress>({ id: d.id, ...d.data() }));
        resolved = mergeAndResolveConflicts(local, remote);
        setLocalItem(STORAGE_KEYS.PROGRESS, resolved);
      }
    } catch (err) {
      console.warn('Firestore getStudentProgressList fallback:', err);
    }
  }

  if (classId) {
    return resolved.filter(p => p.classId === classId);
  }
  return resolved;
}

export async function updateProgress(item: StudentProgress): Promise<void> {
  const itemWithTimestamp = {
    ...item,
    updatedAt: item.updatedAt || new Date().toLocaleString('vi-VN')
  };
  const list = await getLocalItem<StudentProgress[]>(STORAGE_KEYS.PROGRESS, INITIAL_PROGRESS);
  const idx = list.findIndex(p => p.id === itemWithTimestamp.id);
  if (idx >= 0) {
    list[idx] = itemWithTimestamp;
  } else {
    list.unshift(itemWithTimestamp);
  }
  setLocalItem(STORAGE_KEYS.PROGRESS, list);

  enqueueSyncTask('firestore', 'setDoc', 'progress', itemWithTimestamp.id, itemWithTimestamp);
}

// ==========================================
// 4. SEATING PLANS SERVICE
// ==========================================
export async function getSeatingPlan(classId: string): Promise<ClassSeatingPlan | null> {
  const allPlans = getLocalItem<Record<string, ClassSeatingPlan>>(
    STORAGE_KEYS.SEATING,
    INITIAL_SEATING_PLANS
  );
  const localPlan = allPlans[classId] || null;

  if (isFirebaseConfigured && db) {
    try {
      const snap = await getDocs(collection(db, 'seating_plans'));
      if (!snap.empty) {
        const remotePlans = snap.docs.map(d => parseRemoteDocument<ClassSeatingPlan>({ classId: d.id, ...d.data() }));
        const remotePlan = remotePlans.find(p => p.classId === classId) || null;
        const resolved = resolveConflictByTimestamp(localPlan, remotePlan);
        if (resolved) {
          allPlans[classId] = resolved;
          setLocalItem(STORAGE_KEYS.SEATING, allPlans);
          return resolved;
        }
      }
    } catch (err) {
      console.warn('Sync seating plan fallback to local:', err);
    }
  }
  return localPlan;
}

export async function saveSeatingPlan(plan: ClassSeatingPlan): Promise<void> {
  const allPlans = getLocalItem<Record<string, ClassSeatingPlan>>(
    STORAGE_KEYS.SEATING,
    INITIAL_SEATING_PLANS
  );
  const planWithTimestamp = {
    ...plan,
    updatedAt: plan.updatedAt || new Date().toLocaleString('vi-VN'),
  };
  allPlans[plan.classId] = planWithTimestamp;
  setLocalItem(STORAGE_KEYS.SEATING, allPlans);

  enqueueSyncTask('firestore', 'setDoc', 'seating_plans', plan.classId, planWithTimestamp);
}

// ==========================================
// 5. PIN JOIN REQUESTS SERVICE
// ==========================================
export async function getPinRequests(): Promise<PinJoinRequest[]> {
  const local = getLocalItem<PinJoinRequest[]>(STORAGE_KEYS.PIN_REQUESTS, []);
  if (isFirebaseConfigured && db) {
    try {
      const snap = await getDocs(collection(db, 'pin_requests'));
      if (!snap.empty) {
        const remote = snap.docs.map(d => parseRemoteDocument<PinJoinRequest>({ id: d.id, ...d.data() }));
        const resolved = mergeAndResolveConflicts(local, remote);
        setLocalItem(STORAGE_KEYS.PIN_REQUESTS, resolved);
        return resolved;
      }
    } catch (err) {
      console.warn('Sync pin requests fallback:', err);
    }
  }
  return local;
}

export async function submitPinRequest(req: Omit<PinJoinRequest, 'id' | 'status' | 'requestDate'>): Promise<{ success: boolean; message: string }> {
  const requests = await getPinRequests();
  const classes = await getClasses();
  const targetClass = classes.find(c => c.id === req.classId);

  if (!targetClass) {
    return { success: false, message: 'Lớp học không tồn tại trong hệ thống.' };
  }

  if (targetClass.requirePin && targetClass.pinCode !== req.submittedPin.trim().toUpperCase()) {
    return { success: false, message: 'Mã PIN lớp học không chính xác! Vui lòng liên hệ giáo viên bộ môn.' };
  }

  const newReq: PinJoinRequest = {
    id: `req_${Date.now()}`,
    ...req,
    status: 'pending',
    requestDate: new Date().toLocaleString('vi-VN'),
  };

  requests.unshift(newReq);
  setLocalItem(STORAGE_KEYS.PIN_REQUESTS, requests);

  enqueueSyncTask('firestore', 'setDoc', 'pin_requests', newReq.id, newReq);

  return { success: true, message: 'Đã gửi yêu cầu tham gia lớp học thành công! Chờ giáo viên duyệt.' };
}

export async function reviewPinRequest(reqId: string, status: 'approved' | 'rejected'): Promise<void> {
  const requests = await getPinRequests();
  const idx = requests.findIndex(r => r.id === reqId);
  if (idx >= 0) {
    requests[idx].status = status;
    requests[idx].updatedAt = new Date().toLocaleString('vi-VN');
    setLocalItem(STORAGE_KEYS.PIN_REQUESTS, requests);

    enqueueSyncTask('firestore', 'setDoc', 'pin_requests', reqId, requests[idx]);

    // If approved, automatically add student to class
    if (status === 'approved') {
      const req = requests[idx];
      const classes = await getClasses();
      const targetClass = classes.find(c => c.id === req.classId);
      if (targetClass) {
        if (!targetClass.studentIds) targetClass.studentIds = [];
        if (!targetClass.studentIds.includes(req.studentId)) {
          targetClass.studentIds.push(req.studentId);
          targetClass.studentCount = targetClass.studentIds.length;
          await saveClass(targetClass);
        }

        // Cập nhật classIds của Học sinh để đồng bộ hiển thị lớp học trong Menu Học sinh
        const users = await getUsers();
        const studentUser = users.find(u => u.id === req.studentId);
        if (studentUser) {
          if (!studentUser.classIds) studentUser.classIds = [];
          if (!studentUser.classIds.includes(req.classId)) {
            studentUser.classIds.push(req.classId);
            await saveUser(studentUser);
          }
        }

        // Add to seating plan if empty seat exists
        const seating = await getSeatingPlan(req.classId);
        if (seating) {
          const emptySeat = seating.seats.find(s => !s.studentName || s.status === 'empty');
          if (emptySeat) {
            emptySeat.studentId = req.studentId;
            emptySeat.studentName = req.studentName;
            emptySeat.status = 'present';
            await saveSeatingPlan(seating);
          }
        }
      }
    }
  }
}

// ==========================================
// 6. CHỐNG CHỒNG CHÉO (DEDUPLICATION ENGINE)
// ==========================================

/**
 * Giáo viên thêm học sinh từ Excel vào lớp học:
 * - Tránh đã có rồi giáo viên thêm vào lần nữa (Skip)
 * - Đã có tài khoản trong trường -> Tự liên kết vào lớp
 * - Chưa có tài khoản -> Tạo mới và liên kết
 */
export async function addStudentsToClassWithDeduplication(
  classId: string,
  rawStudents: Array<{ name: string; email: string; phone?: string; studentCode?: string }>
): Promise<ImportDeduplicationReport> {
  const classes = await getClasses();
  const targetClass = classes.find(c => c.id === classId);
  const users = await getUsers();
  const seating = await getSeatingPlan(classId);

  if (!targetClass) {
    throw new Error('Lớp học không tồn tại');
  }

  if (!targetClass.studentIds) {
    targetClass.studentIds = [];
  }

  const report: ImportDeduplicationReport = {
    totalProcessed: rawStudents.length,
    addedToClass: 0,
    skippedDuplicates: 0,
    newUsersCreated: 0,
    linkedExistingUsers: 0,
    items: [],
  };

  const updatedUsers = [...users];

  for (const raw of rawStudents) {
    const cleanEmail = raw.email.trim().toLowerCase();
    const cleanName = raw.name.trim();
    const cleanCode = raw.studentCode?.trim();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      report.items.push({
        name: cleanName,
        email: cleanEmail,
        studentCode: cleanCode,
        status: 'skipped_duplicate',
        message: 'Email không hợp lệ, bỏ qua.',
      });
      continue;
    }

    // 1. Kiểm tra xem học sinh đã có trong lớp này chưa (qua email hoặc studentIds)
    const existingUserInDb = updatedUsers.find(
      u => u.email.toLowerCase() === cleanEmail || (cleanCode && u.studentCode === cleanCode)
    );

    const isAlreadyInClass =
      (existingUserInDb && targetClass.studentIds.includes(existingUserInDb.id)) ||
      (seating && seating.seats.some(s => s.studentName?.toLowerCase() === cleanName.toLowerCase()));

    if (isAlreadyInClass) {
      report.skippedDuplicates++;
      report.items.push({
        name: cleanName,
        email: cleanEmail,
        studentCode: cleanCode,
        status: 'already_in_class',
        message: 'Đã có tên trong lớp này (tự động bỏ qua để tránh trùng lặp)',
      });
      continue;
    }

    // 2. Học sinh đã có tài khoản trên hệ thống trường -> Liên kết vào lớp
    if (existingUserInDb) {
      if (!existingUserInDb.classIds) existingUserInDb.classIds = [];
      if (!existingUserInDb.classIds.includes(classId)) {
        existingUserInDb.classIds.push(classId);
      }
      targetClass.studentIds.push(existingUserInDb.id);
      report.addedToClass++;
      report.linkedExistingUsers++;
      report.items.push({
        name: cleanName,
        email: cleanEmail,
        studentCode: cleanCode || existingUserInDb.studentCode,
        status: 'linked_existing_user',
        message: 'Đã có tài khoản trên trường -> Tự động liên kết vào lớp',
      });

      // Bổ sung vào sơ đồ chỗ ngồi nếu còn bàn trống
      if (seating) {
        const emptySeat = seating.seats.find(s => !s.studentName || s.status === 'empty');
        if (emptySeat) {
          emptySeat.studentId = existingUserInDb.id;
          emptySeat.studentName = existingUserInDb.name;
          emptySeat.studentCode = existingUserInDb.studentCode || cleanCode;
          emptySeat.status = 'present';
        }
      }
      continue;
    }

    // 3. Chưa có tài khoản trên hệ thống -> Tạo tài khoản mới
    const newStudentId = `u_hs_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newProfile: UserProfile = {
      id: newStudentId,
      name: cleanName,
      email: cleanEmail,
      role: 'student',
      phone: raw.phone || '0901234567',
      studentCode: cleanCode || `HS-${Date.now().toString().slice(-4)}`,
      classIds: [classId],
      createdAt: new Date().toISOString().slice(0, 10),
    };

    updatedUsers.push(newProfile);
    targetClass.studentIds.push(newStudentId);
    report.addedToClass++;
    report.newUsersCreated++;
    report.items.push({
      name: cleanName,
      email: cleanEmail,
      studentCode: newProfile.studentCode,
      status: 'created_new_user',
      message: 'Tạo tài khoản mới và thêm vào lớp thành công',
    });

    // Bổ sung vào sơ đồ chỗ ngồi nếu còn bàn trống
    if (seating) {
      const emptySeat = seating.seats.find(s => !s.studentName || s.status === 'empty');
      if (emptySeat) {
        emptySeat.studentId = newStudentId;
        emptySeat.studentName = cleanName;
        emptySeat.studentCode = newProfile.studentCode;
        emptySeat.status = 'present';
      }
    }
  }

  // Cập nhật số lượng học sinh thực tế
  targetClass.studentCount = targetClass.studentIds.length;

  // Lưu đồng bộ
  await saveClass(targetClass);
  setLocalItem(STORAGE_KEYS.USERS, updatedUsers);
  if (seating) {
    await saveSeatingPlan(seating);
  }

  return report;
}

/**
 * Quản trị viên Import danh sách tài khoản toàn trường có kiểm tra trùng lặp email
 */
export async function importUsersWithDeduplication(
  rawUsers: Array<{ name: string; email: string; role?: UserRole; phone?: string; studentCode?: string }>
): Promise<{ added: number; skipped: number; updated: number }> {
  const currentUsers = await getUsers();
  const currentMap = new Map<string, UserProfile>();
  currentUsers.forEach(u => currentMap.set(u.email.toLowerCase(), u));

  let added = 0;
  let skipped = 0;
  let updated = 0;

  const resultList = [...currentUsers];

  for (const raw of rawUsers) {
    const email = raw.email.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      skipped++;
      continue;
    }

    if (currentMap.has(email)) {
      // Đã có tài khoản: Cập nhật thông tin bổ sung nếu thiếu, không tạo trùng
      const existing = currentMap.get(email)!;
      if (raw.phone && !existing.phone) existing.phone = raw.phone;
      if (raw.studentCode && !existing.studentCode) existing.studentCode = raw.studentCode;
      updated++;
    } else {
      // Tạo tài khoản mới
      const newUser: UserProfile = {
        id: `u_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: raw.name.trim(),
        email,
        role: raw.role || 'student',
        phone: raw.phone || '0901234567',
        studentCode: raw.studentCode || `MB-${Date.now().toString().slice(-4)}`,
        createdAt: new Date().toISOString().slice(0, 10),
      };
      resultList.push(newUser);
      currentMap.set(email, newUser);
      added++;
    }
  }

  setLocalItem(STORAGE_KEYS.USERS, resultList);
  return { added, skipped, updated };
}

/**
 * Lấy danh sách học sinh theo ClassId
 */
export async function getStudentsByClassId(classId: string): Promise<StudentProfile[]> {
  const users = await getUsers();
  const classes = await getClasses();
  const targetClass = classes.find(c => c.id === classId);
  const targetIds = targetClass?.studentIds || [];

  // Học sinh thỏa mãn nếu có trong studentIds của lớp hoặc có classId trong classIds của user
  const matchingUsers = users.filter(
    u => u.role === 'student' && (targetIds.includes(u.id) || (u.classIds && u.classIds.includes(classId)))
  );

  return matchingUsers.map(u => ({
    id: u.id,
    name: u.name,
    nickname: u.nickname,
    email: u.email,
    studentCode: u.studentCode || '',
    phone: u.phone || '',
    gps: u.gps || '',
    currentClassId: classId,
    status: 'active',
    level: u.level || 3, // Mặc định mức 3 nếu chưa gán
    suggestedLevel: u.suggestedLevel || (u.level ? Math.min(6, Math.max(1, u.level)) : 3),
  }));
}

/**
 * Cập nhật mức độ học sinh (1-6) do giáo viên đánh giá
 */
export async function updateStudentLevel(studentId: string, level: number): Promise<void> {
  const users = await getUsers();
  const user = users.find(u => u.id === studentId);
  if (user) {
    user.level = level;
    user.updatedAt = new Date().toISOString().slice(0, 10);
    await saveUser(user);
  }
}

/**
 * Xóa học sinh ra khỏi lớp dạy
 */
export async function removeStudentFromClass(classId: string, studentId: string): Promise<void> {
  const classes = await getClasses();
  const targetClass = classes.find(c => c.id === classId);
  if (targetClass && targetClass.studentIds) {
    targetClass.studentIds = targetClass.studentIds.filter(id => id !== studentId);
    targetClass.studentCount = targetClass.studentIds.length;
    await saveClass(targetClass);
  }

  // Cập nhật profile người dùng
  const users = await getUsers();
  const user = users.find(u => u.id === studentId);
  if (user && user.classIds) {
    user.classIds = user.classIds.filter(id => id !== classId);
    await saveUser(user);
  }

  // Xóa khỏi sơ đồ chỗ ngồi nếu có
  const seating = await getSeatingPlan(classId);
  if (seating) {
    seating.seats.forEach(s => {
      if (s.studentId === studentId) {
        s.studentId = undefined;
        s.studentName = undefined;
        s.studentCode = undefined;
        s.status = 'empty';
      }
    });
    await saveSeatingPlan(seating);
  }
}

/**
 * Lưu thông tin học sinh
 */
export async function saveStudent(student: StudentProfile): Promise<void> {
  const users = await getUsers();
  const existing = users.find(u => u.id === student.id || u.email === student.email);
  if (existing) {
    existing.name = student.name;
    existing.phone = student.phone;
    existing.studentCode = student.studentCode;
    await saveUser(existing);
  } else {
    const newUser: UserProfile = {
      id: student.id,
      name: student.name,
      email: student.email,
      role: 'student',
      phone: student.phone,
      studentCode: student.studentCode,
      classIds: student.currentClassId ? [student.currentClassId] : [],
      createdAt: new Date().toISOString().slice(0, 10),
    };
    await saveUser(newUser);
  }
}

// ==========================================
// 7. TEACHER DOCUMENTS & WALLETS (KIM CƯƠNG & TIM)
// ==========================================

export async function getTeacherDocuments(): Promise<TeacherDocument[]> {
  const deletedList = getDeletedFoldersBlacklist();
  
  if (isFirebaseConfigured && db) {
    try {
      const snap = await getDocs(collection(db, 'documents'));
      // Firestore is the definitive single source of truth:
      // Even when empty (e.g. after deletion), remote is the authoritative state.
      const remote = snap.docs
        .map(d => parseRemoteDocument<TeacherDocument>({ id: d.id, ...d.data() }))
        .filter(d => d.title && !deletedList.includes(d.title.trim()));
      
      // Overwrite local storage cache completely with Firestore authoritative data
      setLocalItem(STORAGE_KEYS.DOCUMENTS, remote);

      // Rebuild and sanitize hierarchy tree based on Firestore data
      const updatedHierarchy = buildHierarchyFromDocuments(remote);
      saveStoredHierarchy(updatedHierarchy);

      return remote;
    } catch (err) {
      console.warn('Sync documents fallback to local cache:', err);
    }
  }

  const local = getLocalItem<TeacherDocument[]>(STORAGE_KEYS.DOCUMENTS, INITIAL_TEACHER_DOCS)
    .filter(d => d.title && !deletedList.includes(d.title.trim()));
  
  // Re-sync local hierarchy
  const updatedHierarchy = buildHierarchyFromDocuments(local);
  saveStoredHierarchy(updatedHierarchy);

  return local;
}

export async function saveTeacherDocument(docItem: TeacherDocument): Promise<void> {
  const docWithTimestamp = {
    ...docItem,
    updatedAt: docItem.updatedAt || new Date().toLocaleString('vi-VN'),
  };

  // Directly save to Firestore if configured
  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, 'documents', docWithTimestamp.id), docWithTimestamp);
    } catch (err) {
      console.warn('Direct Firestore save failed, enqueuing sync task:', err);
    }
  }

  // Update local storage cache
  const list = getLocalItem<TeacherDocument[]>(STORAGE_KEYS.DOCUMENTS, []);
  const idx = list.findIndex(d => d.id === docWithTimestamp.id);
  if (idx >= 0) {
    list[idx] = docWithTimestamp;
  } else {
    list.unshift(docWithTimestamp);
  }
  setLocalItem(STORAGE_KEYS.DOCUMENTS, list);

  // Rebuild hierarchy immediately
  const updatedHierarchy = buildHierarchyFromDocuments(list);
  saveStoredHierarchy(updatedHierarchy);

  enqueueSyncTask('firestore', 'setDoc', 'documents', docWithTimestamp.id, docWithTimestamp);
}

export async function deleteTeacherDocument(docId: string): Promise<void> {
  const list = getLocalItem<TeacherDocument[]>(STORAGE_KEYS.DOCUMENTS, []);
  const targetDoc = list.find(d => d.id === docId);
  if (targetDoc?.title) {
    addDeletedFolderToBlacklist(targetDoc.title);
  }

  // Directly delete from Firestore if configured
  if (isFirebaseConfigured && db) {
    try {
      await deleteDoc(doc(db, 'documents', docId));
    } catch (err) {
      console.warn('Direct Firestore delete failed, enqueuing sync task:', err);
    }
  }

  const filtered = list.filter(d => d.id !== docId);
  setLocalItem(STORAGE_KEYS.DOCUMENTS, filtered);

  // Rebuild hierarchy immediately
  const updatedHierarchy = buildHierarchyFromDocuments(filtered);
  saveStoredHierarchy(updatedHierarchy);

  enqueueSyncTask('firestore', 'deleteDoc', 'documents', docId, null);
}

/**
 * Nạp/Trừ Kim cương 💎 (Ví tiền số) cho tài khoản
 */
export async function adjustUserDiamonds(userId: string, amount: number): Promise<UserProfile> {
  const users = await getUsers();
  const userIdx = users.findIndex(u => u.id === userId);
  if (userIdx < 0) {
    throw new Error('Tài khoản không tồn tại.');
  }

  const currentDiamonds = users[userIdx].diamonds || 0;
  const nextDiamonds = Math.max(0, currentDiamonds + amount);
  users[userIdx].diamonds = nextDiamonds;
  users[userIdx].updatedAt = new Date().toLocaleString('vi-VN');

  await saveUser(users[userIdx]);
  return users[userIdx];
}

/**
 * Cộng/Trừ Điểm Tim ❤️ (Đánh giá uy tín) cho tài khoản
 */
export async function adjustUserHearts(userId: string, amount: number): Promise<UserProfile> {
  const users = await getUsers();
  const userIdx = users.findIndex(u => u.id === userId);
  if (userIdx < 0) {
    throw new Error('Tài khoản không tồn tại.');
  }

  const currentHearts = users[userIdx].hearts || 0;
  const nextHearts = Math.max(0, currentHearts + amount);
  users[userIdx].hearts = nextHearts;
  users[userIdx].updatedAt = new Date().toLocaleString('vi-VN');

  await saveUser(users[userIdx]);
  return users[userIdx];
}

/**
 * Học sinh mua tài liệu mất phí bằng Kim Cương 💎
 */
export async function purchaseDocument(docId: string, studentId: string): Promise<{ success: boolean; message: string; updatedUser?: UserProfile; updatedDoc?: TeacherDocument }> {
  const users = await getUsers();
  const studentIdx = users.findIndex(u => u.id === studentId);
  if (studentIdx < 0) {
    return { success: false, message: 'Không tìm thấy tài khoản học sinh.' };
  }

  const docs = await getTeacherDocuments();
  const docIdx = docs.findIndex(d => d.id === docId);
  if (docIdx < 0) {
    return { success: false, message: 'Tài liệu không tồn tại trên hệ thống.' };
  }

  const student = users[studentIdx];
  const document = docs[docIdx];

  // Kiểm tra nếu đã sở hữu hoặc tài liệu miễn phí
  const isForSale = document.isForSale || false;
  const price = document.priceDiamonds || 0;

  if (!isForSale || price <= 0) {
    return { success: true, message: 'Tài liệu này hoàn toàn miễn phí!', updatedUser: student, updatedDoc: document };
  }

  const purchasedList = document.purchasedUserIds || [];
  if (purchasedList.includes(studentId)) {
    return { success: true, message: 'Bạn đã mua tài liệu này trước đó rồi.', updatedUser: student, updatedDoc: document };
  }

  const currentBalance = student.diamonds || 0;
  if (currentBalance < price) {
    return { success: false, message: `Bạn không đủ Kim cương 💎 để mở khóa tài liệu này! Cần thêm ${price - currentBalance} Kim cương.` };
  }

  // Khấu trừ số dư Kim Cương của học sinh
  student.diamonds = currentBalance - price;
  student.updatedAt = new Date().toLocaleString('vi-VN');
  
  // Ghi nhận học sinh đã mua tài liệu
  if (!document.purchasedUserIds) {
    document.purchasedUserIds = [];
  }
  document.purchasedUserIds.push(studentId);
  document.updatedAt = new Date().toLocaleString('vi-VN');

  // Lưu cả hai vào Local & Sync Cloud
  await saveUser(student);
  await saveTeacherDocument(document);

  return {
    success: true,
    message: `Đã mở khóa tài liệu thành công! Trừ ${price} Kim cương 💎. Số dư hiện tại: ${student.diamonds} Kim cương.`,
    updatedUser: student,
    updatedDoc: document,
  };
}

/**
 * Dọn dẹp toàn bộ bộ nhớ đệm (Cache), ServiceWorker, dữ liệu tạm dư thừa của trình duyệt và Firestore
 */
export async function clearAllAppCacheAndRedundantData(options?: { reload?: boolean }): Promise<{ success: boolean; clearedCount: number; message: string }> {
  let clearedCount = 0;

  try {
    // 1. Xóa toàn bộ Service Worker Caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      for (const name of cacheNames) {
        await caches.delete(name);
        clearedCount++;
      }
    }

    // 2. Dọn sạch các key cache rác / phantom / dữ liệu tạm trong localStorage
    const obsoletePrefixes = [
      'lopu_temp_',
      'lopu_custom_titles_',
      'lopu_custom_chuongs_',
      'lopu_custom_bais_',
      'lopu_custom_vandes_',
      'lopu_custom_chuyendes_',
      'firebase:previous_websocket_failure',
      'loglevel',
    ];

    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        if (obsoletePrefixes.some(p => key.startsWith(p))) {
          keysToRemove.push(key);
        }
      }
    }

    keysToRemove.forEach(k => {
      localStorage.removeItem(k);
      clearedCount++;
    });

    // 3. Dọn sạch sessionStorage
    sessionStorage.clear();

    // 4. Dọn dẹp dữ liệu trùng lặp trong Firestore User & Document Store
    const users = await getUsers();
    const uniqueUsersMap = new Map<string, UserProfile>();
    users.forEach(u => {
      const key = u.email?.toLowerCase().trim() || u.id;
      if (!uniqueUsersMap.has(key)) {
        uniqueUsersMap.set(key, u);
      }
    });
    if (uniqueUsersMap.size < users.length) {
      setLocalItem(STORAGE_KEYS.USERS, Array.from(uniqueUsersMap.values()));
    }

    if (options?.reload) {
      window.location.reload();
    }

    return {
      success: true,
      clearedCount,
      message: `Đã dọn dẹp sạch sẽ toàn bộ Cache trình duyệt, ServiceWorker và ${clearedCount} mục dữ liệu dư thừa!`,
    };
  } catch (err) {
    console.error('Lỗi dọn cache:', err);
    return {
      success: false,
      clearedCount,
      message: 'Có lỗi trong quá trình dọn dẹp cache.',
    };
  }
}

/**
 * Đẩy toàn bộ dữ liệu từ bộ nhớ nội bộ lên Firebase Firestore của dự án LopU
 */
export async function pushAllLocalDataToFirestore(): Promise<{
  success: boolean;
  message: string;
  stats?: {
    users: number;
    classes: number;
    documents: number;
    progress: number;
    seating: number;
  };
}> {
  if (!isFirebaseConfigured || !db) {
    return {
      success: false,
      message: 'Firebase LopU chưa được cấu hình đầy đủ API Key và App ID. Vui lòng nhập thông tin cấu hình của dự án LopU để đồng bộ.',
    };
  }

  try {
    let usersCount = 0;
    let classesCount = 0;
    let docsCount = 0;
    let progressCount = 0;
    let seatingCount = 0;

    // 1. Đẩy danh sách Người dùng (Users)
    const users = getLocalItem<UserProfile[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
    for (const u of users) {
      if (u.id) {
        await setDoc(doc(db, 'users', u.id), u, { merge: true });
        usersCount++;
      }
    }

    // 2. Đẩy danh sách Lớp học (Classes)
    const classes = getLocalItem<ClassItem[]>(STORAGE_KEYS.CLASSES, INITIAL_CLASSES);
    for (const c of classes) {
      if (c.id) {
        await setDoc(doc(db, 'classes', c.id), c, { merge: true });
        classesCount++;
      }
    }

    // 3. Đẩy danh sách Tài liệu Giáo viên (Documents)
    const documents = getLocalItem<TeacherDocument[]>(STORAGE_KEYS.DOCUMENTS, INITIAL_TEACHER_DOCS);
    for (const d of documents) {
      if (d.id) {
        await setDoc(doc(db, 'documents', d.id), d, { merge: true });
        docsCount++;
      }
    }

    // 4. Đẩy danh sách Tiến độ học sinh (Progress)
    const progressList = getLocalItem<StudentProgress[]>(STORAGE_KEYS.PROGRESS, INITIAL_PROGRESS);
    for (const p of progressList) {
      if (p.id) {
        await setDoc(doc(db, 'progress', p.id), p, { merge: true });
        progressCount++;
      }
    }

    // 5. Đẩy danh sách Sơ đồ lớp (Seating Plans)
    const seatingPlans = getLocalItem<Record<string, ClassSeatingPlan>>(STORAGE_KEYS.SEATING, INITIAL_SEATING_PLANS);
    for (const [classId, s] of Object.entries(seatingPlans)) {
      if (classId && s) {
        await setDoc(doc(db, 'seating_plans', classId), s, { merge: true });
        seatingCount++;
      }
    }

    return {
      success: true,
      message: `Đã đẩy thành công toàn bộ dữ liệu lên Firebase Firestore dự án LopU! (${usersCount} người dùng, ${classesCount} lớp học, ${docsCount} tài liệu).`,
      stats: {
        users: usersCount,
        classes: classesCount,
        documents: docsCount,
        progress: progressCount,
        seating: seatingCount,
      },
    };
  } catch (error: any) {
    console.error('Lỗi khi đẩy dữ liệu lên Firebase LopU:', error);
    return {
      success: false,
      message: `Lỗi đồng bộ dữ liệu lên Firebase LopU: ${error?.message || 'Không thể ghi vào Firestore'}. Vui lòng kiểm tra Rules và mạng kết nối.`,
    };
  }
}


