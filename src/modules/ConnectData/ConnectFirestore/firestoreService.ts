import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../../../config/firebase';
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
} from '../../../services/storageTypes';
import {
  INITIAL_CLASSES,
  INITIAL_USERS,
  INITIAL_PROGRESS,
  INITIAL_SEATING_PLANS,
} from '../../../services/mockInitialData';

const STORAGE_KEYS = {
  CLASSES: 'lopu_firestore_classes_v1',
  USERS: 'lopu_firestore_users_v1',
  PROGRESS: 'lopu_firestore_progress_v1',
  SEATING: 'lopu_firestore_seating_v1',
  PIN_REQUESTS: 'lopu_firestore_pin_requests_v1',
};

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

// Initializer to seed local data if empty
export function seedInitialDataIfNeeded(): void {
  if (!localStorage.getItem(STORAGE_KEYS.CLASSES)) {
    setLocalItem(STORAGE_KEYS.CLASSES, INITIAL_CLASSES);
  }
  
  const existingUsers = getLocalItem<UserProfile[]>(STORAGE_KEYS.USERS, []);
  if (existingUsers.length === 0) {
    setLocalItem(STORAGE_KEYS.USERS, INITIAL_USERS);
  } else {
    // Đảm bảo 2 tài khoản Superadmin luôn có mặt
    let updated = false;
    for (const saEmail of SUPERADMIN_EMAILS) {
      const found = existingUsers.some(u => u.email.toLowerCase() === saEmail.toLowerCase());
      if (!found) {
        const saInitial = INITIAL_USERS.find(u => u.email.toLowerCase() === saEmail.toLowerCase());
        if (saInitial) {
          existingUsers.unshift(saInitial);
          updated = true;
        }
      }
    }
    if (updated) {
      setLocalItem(STORAGE_KEYS.USERS, existingUsers);
    }
  }
  if (!localStorage.getItem(STORAGE_KEYS.PROGRESS)) {
    setLocalItem(STORAGE_KEYS.PROGRESS, INITIAL_PROGRESS);
  }
  if (!localStorage.getItem(STORAGE_KEYS.SEATING)) {
    setLocalItem(STORAGE_KEYS.SEATING, INITIAL_SEATING_PLANS);
  }
  if (!localStorage.getItem(STORAGE_KEYS.PIN_REQUESTS)) {
    const samplePinRequests: PinJoinRequest[] = [
      {
        id: 'pin_req_1',
        classId: 'class_10a1',
        className: 'Toán Học Chuyên Sâu 10A1',
        studentId: 'u_hs07',
        studentName: 'Bùi Gia Huy',
        studentEmail: 'huy.bui@student.lopu.edu.vn',
        submittedPin: 'TOAN10',
        status: 'pending',
        requestDate: '2025-09-08 08:30',
      },
      {
        id: 'pin_req_2',
        classId: 'class_11b2',
        className: 'Vật Lý Ứng Dụng 11B2',
        studentId: 'u_hs08',
        studentName: 'Đỗ Hà Phương',
        studentEmail: 'phuong.do@student.lopu.edu.vn',
        submittedPin: 'VATLY11',
        status: 'approved',
        requestDate: '2025-09-07 14:15',
      },
    ];
    setLocalItem(STORAGE_KEYS.PIN_REQUESTS, samplePinRequests);
  }
}

// Ensure seed runs on module load
seedInitialDataIfNeeded();

// ==========================================
// 1. CLASSES SERVICE
// ==========================================
export async function getClasses(): Promise<ClassItem[]> {
  if (isFirebaseConfigured && db) {
    try {
      const snap = await getDocs(collection(db, 'classes'));
      if (!snap.empty) {
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as ClassItem));
      }
    } catch (err) {
      console.warn('Firestore getClasses fallback to local storage:', err);
    }
  }
  return getLocalItem<ClassItem[]>(STORAGE_KEYS.CLASSES, INITIAL_CLASSES);
}

export async function saveClass(classItem: ClassItem): Promise<void> {
  // Update local storage
  const classes = await getClasses();
  const index = classes.findIndex(c => c.id === classItem.id);
  if (index >= 0) {
    classes[index] = classItem;
  } else {
    classes.unshift(classItem);
  }
  setLocalItem(STORAGE_KEYS.CLASSES, classes);

  // Firestore sync if configured
  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, 'classes', classItem.id), classItem, { merge: true });
    } catch (err) {
      console.error('Firestore saveClass error:', err);
    }
  }
}

export async function deleteClass(classId: string): Promise<void> {
  const classes = await getClasses();
  const filtered = classes.filter(c => c.id !== classId);
  setLocalItem(STORAGE_KEYS.CLASSES, filtered);

  if (isFirebaseConfigured && db) {
    try {
      await deleteDoc(doc(db, 'classes', classId));
    } catch (err) {
      console.error('Firestore deleteClass error:', err);
    }
  }
}

// ==========================================
// 2. USERS SERVICE & IMPORT EXCEL
// ==========================================
export async function getUsers(): Promise<UserProfile[]> {
  if (isFirebaseConfigured && db) {
    try {
      const snap = await getDocs(collection(db, 'users'));
      if (!snap.empty) {
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile));
      }
    } catch (err) {
      console.warn('Firestore getUsers fallback to local storage:', err);
    }
  }
  return getLocalItem<UserProfile[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
}

export async function saveUser(user: UserProfile): Promise<void> {
  const users = await getUsers();
  const index = users.findIndex(u => u.id === user.id);
  if (index >= 0) {
    users[index] = user;
  } else {
    users.unshift(user);
  }
  setLocalItem(STORAGE_KEYS.USERS, users);

  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, 'users', user.id), user, { merge: true });
    } catch (err) {
      console.error('Firestore saveUser error:', err);
    }
  }
}

export async function deleteUser(userId: string): Promise<void> {
  const users = await getUsers();
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

  if (isFirebaseConfigured && db) {
    try {
      await deleteDoc(doc(db, 'users', userId));
    } catch (err) {
      console.error('Firestore deleteUser error:', err);
    }
  }
}

export async function importUsers(newUsers: UserProfile[]): Promise<number> {
  const users = await getUsers();
  let count = 0;
  for (const nu of newUsers) {
    const existingIndex = users.findIndex(u => u.email === nu.email || u.id === nu.id);
    if (existingIndex >= 0) {
      users[existingIndex] = { ...users[existingIndex], ...nu };
    } else {
      users.push(nu);
    }
    count++;

    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'users', nu.id), nu, { merge: true });
      } catch (err) {
        console.warn('Sync imported user failed:', err);
      }
    }
  }
  setLocalItem(STORAGE_KEYS.USERS, users);
  return count;
}

// ==========================================
// 3. STUDENT PROGRESS SERVICE
// ==========================================
export async function getStudentProgressList(classId?: string): Promise<StudentProgress[]> {
  let list: StudentProgress[] = [];
  if (isFirebaseConfigured && db) {
    try {
      const snap = await getDocs(collection(db, 'progress'));
      if (!snap.empty) {
        list = snap.docs.map(d => ({ id: d.id, ...d.data() } as StudentProgress));
      }
    } catch (err) {
      console.warn('Firestore getStudentProgressList fallback:', err);
    }
  }
  if (list.length === 0) {
    list = getLocalItem<StudentProgress[]>(STORAGE_KEYS.PROGRESS, INITIAL_PROGRESS);
  }

  if (classId) {
    return list.filter(p => p.classId === classId);
  }
  return list;
}

export async function updateProgress(item: StudentProgress): Promise<void> {
  const list = await getStudentProgressList();
  const idx = list.findIndex(p => p.id === item.id);
  if (idx >= 0) {
    list[idx] = item;
  } else {
    list.unshift(item);
  }
  setLocalItem(STORAGE_KEYS.PROGRESS, list);

  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, 'progress', item.id), item, { merge: true });
    } catch (err) {
      console.error('Firestore updateProgress error:', err);
    }
  }
}

// ==========================================
// 4. SEATING PLANS SERVICE
// ==========================================
export async function getSeatingPlan(classId: string): Promise<ClassSeatingPlan | null> {
  const allPlans = getLocalItem<Record<string, ClassSeatingPlan>>(
    STORAGE_KEYS.SEATING,
    INITIAL_SEATING_PLANS
  );
  return allPlans[classId] || null;
}

export async function saveSeatingPlan(plan: ClassSeatingPlan): Promise<void> {
  const allPlans = getLocalItem<Record<string, ClassSeatingPlan>>(
    STORAGE_KEYS.SEATING,
    INITIAL_SEATING_PLANS
  );
  allPlans[plan.classId] = {
    ...plan,
    updatedAt: new Date().toLocaleString('vi-VN'),
  };
  setLocalItem(STORAGE_KEYS.SEATING, allPlans);

  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, 'seating_plans', plan.classId), plan, { merge: true });
    } catch (err) {
      console.warn('Sync seating plan failed:', err);
    }
  }
}

// ==========================================
// 5. PIN JOIN REQUESTS SERVICE
// ==========================================
export async function getPinRequests(): Promise<PinJoinRequest[]> {
  return getLocalItem<PinJoinRequest[]>(STORAGE_KEYS.PIN_REQUESTS, []);
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

  return { success: true, message: 'Đã gửi yêu cầu tham gia lớp học thành công! Chờ giáo viên duyệt.' };
}

export async function reviewPinRequest(reqId: string, status: 'approved' | 'rejected'): Promise<void> {
  const requests = await getPinRequests();
  const idx = requests.findIndex(r => r.id === reqId);
  if (idx >= 0) {
    requests[idx].status = status;
    setLocalItem(STORAGE_KEYS.PIN_REQUESTS, requests);

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
    email: u.email,
    studentCode: u.studentCode || '',
    phone: u.phone || '',
    currentClassId: classId,
    status: 'active',
  }));
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
