import { googleClientConfig, isGoogleClientConfigured, auth, isFirebaseConfigured } from '../../../config/firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { decryptData, enqueueSyncTask } from '../ConnectDataShared';
import {
  StudentGradeRecord,
  ClassSeatingPlan,
  ScheduleItem,
  TeacherDocument,
} from '../../../services/storageTypes';
import {
  INITIAL_SCHEDULE,
  INITIAL_STUDENT_GRADES,
  INITIAL_TEACHER_DOCS,
} from '../../../services/mockInitialData';

export interface DriveStoredFile {
  id: string;
  name: string;
  mimeType: string;
  category: 'teacher_grades' | 'teacher_attendance' | 'personal_schedule' | 'personal_seating' | 'teacher_library';
  size: string;
  modifiedTime: string;
  downloadUrl?: string;
  classId?: string;
  content: unknown;
}

const DRIVE_FILES_STORAGE_KEY = 'lopu_google_drive_files_v1';
const DRIVE_TOKEN_STORAGE_KEY = 'lopu_google_drive_token_v1';

// Helper to check token type
export function isRealDriveToken(token?: string | null): boolean {
  if (!token) return false;
  return !token.startsWith('lopu_token_') && !token.startsWith('sandbox_') && (token.startsWith('ya29.') || token.length > 25);
}

// Clean up any old simulated tokens on startup
const storedToken = localStorage.getItem(DRIVE_TOKEN_STORAGE_KEY);
if (storedToken && !isRealDriveToken(storedToken)) {
  localStorage.removeItem(DRIVE_TOKEN_STORAGE_KEY);
}

// In-memory token cache
let currentAccessToken: string | null = localStorage.getItem(DRIVE_TOKEN_STORAGE_KEY);
let isDriveConnected: boolean = isRealDriveToken(currentAccessToken);
let currentDriveEmail: string = localStorage.getItem('lopu_drive_email') || 'tanbaodl@gmail.com';

// Listeners for UI reactive status
export type DriveStatusListener = (connected: boolean, email: string) => void;
const statusListeners: Set<DriveStatusListener> = new Set();

export function subscribeDriveStatus(listener: DriveStatusListener): () => void {
  statusListeners.add(listener);
  listener(isDriveConnected, currentDriveEmail);
  return () => statusListeners.delete(listener);
}

function notifyStatusChanged() {
  statusListeners.forEach(listener => listener(isDriveConnected, currentDriveEmail));
}

function getStoredDriveFiles(): DriveStoredFile[] {
  try {
    const raw = localStorage.getItem(DRIVE_FILES_STORAGE_KEY);
    if (!raw) {
      const seed: DriveStoredFile[] = [];
      localStorage.setItem(DRIVE_FILES_STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveStoredDriveFiles(files: DriveStoredFile[]): void {
  try {
    localStorage.setItem(DRIVE_FILES_STORAGE_KEY, JSON.stringify(files));
  } catch (e) {
    console.error('Error saving Drive files to local storage:', e);
  }
}

// Check connection state
export function getDriveConnectionState(): {
  isConnected: boolean;
  email: string;
  isRealConfigured: boolean;
} {
  const token = localStorage.getItem(DRIVE_TOKEN_STORAGE_KEY) || currentAccessToken;
  const isReal = isRealDriveToken(token);
  return {
    isConnected: isReal,
    email: currentDriveEmail,
    isRealConfigured: isGoogleClientConfigured || isFirebaseConfigured,
  };
}

// Connect to Google Drive using Google Identity Services or Firebase Auth popup
export async function connectGoogleDrive(): Promise<{ success: boolean; email: string; message: string }> {
  // 1. Try Firebase Auth popup first
  if (auth && isFirebaseConfigured) {
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/drive.file');
      provider.addScope('https://www.googleapis.com/auth/drive');
      
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        currentAccessToken = credential.accessToken;
        localStorage.setItem(DRIVE_TOKEN_STORAGE_KEY, currentAccessToken);
        isDriveConnected = true;
        currentDriveEmail = result.user.email || 'tanbaodl@gmail.com';
        localStorage.setItem('lopu_drive_email', currentDriveEmail);
        notifyStatusChanged();
        return {
          success: true,
          email: currentDriveEmail,
          message: 'Đã xác thực và kết nối Google Drive thành công!',
        };
      }
    } catch (firebaseErr: any) {
      console.warn('Firebase Auth Google Sign-In popup error:', firebaseErr);
    }
  }

  // 2. Fallback to Google Identity Services (GSI)
  if (typeof window !== 'undefined' && (window as any).google?.accounts?.oauth2 && isGoogleClientConfigured) {
    return new Promise((resolve) => {
      try {
        const client = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: googleClientConfig.clientId,
          scope: googleClientConfig.scope + ' https://www.googleapis.com/auth/drive.file',
          callback: (tokenResponse: { access_token?: string; error?: string }) => {
            if (tokenResponse.error || !tokenResponse.access_token) {
              resolve({
                success: false,
                email: '',
                message: `Lỗi kết nối Google: ${tokenResponse.error || 'Từ chối cấp quyền'}`,
              });
              return;
            }
            currentAccessToken = tokenResponse.access_token;
            localStorage.setItem(DRIVE_TOKEN_STORAGE_KEY, currentAccessToken);
            isDriveConnected = true;
            currentDriveEmail = 'teacher.google@lopu.edu.vn';
            localStorage.setItem('lopu_drive_email', currentDriveEmail);
            notifyStatusChanged();
            resolve({
              success: true,
              email: currentDriveEmail,
              message: 'Đã xác thực Google Drive thành công với phạm vi drive.file!',
            });
          },
        });
        client.requestAccessToken();
      } catch (err) {
        console.warn('GSI Token request error:', err);
        resolve({
          success: false,
          email: '',
          message: 'Không thể mở cửa sổ đăng nhập Google. Vui lòng kiểm tra quyền pop-up trình duyệt.',
        });
      }
    });
  }

  return {
    success: false,
    email: '',
    message: 'Chưa thể kết nối Google Drive. Vui lòng đăng nhập tài khoản Google để cấp quyền.',
  };
}

export function disconnectGoogleDrive(): void {
  currentAccessToken = null;
  isDriveConnected = false;
  localStorage.removeItem(DRIVE_TOKEN_STORAGE_KEY);
  notifyStatusChanged();
}

// ==========================================
// GOOGLE DRIVE APP SPECIFIC STORAGE METHODS
// ==========================================

// 1. Teacher Drive: Save Class Student Grades
export async function saveTeacherGradesToDrive(
  classId: string,
  className: string,
  grades: StudentGradeRecord[]
): Promise<{ success: boolean; fileId: string; fileName: string }> {
  const files = getStoredDriveFiles();
  const fileName = `LopU_BangDiem_${className.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.json`;
  const existingIdx = files.findIndex(f => f.category === 'teacher_grades' && f.classId === classId);

  const fileItem: DriveStoredFile = {
    id: existingIdx >= 0 ? files[existingIdx].id : `gdrive_gr_${Date.now()}`,
    name: fileName,
    mimeType: 'application/json',
    category: 'teacher_grades',
    size: `${Math.round(JSON.stringify(grades).length / 1024) + 12} KB`,
    modifiedTime: new Date().toLocaleString('vi-VN'),
    classId,
    content: grades,
  };

  if (existingIdx >= 0) {
    files[existingIdx] = fileItem;
  } else {
    files.unshift(fileItem);
  }
  saveStoredDriveFiles(files);

  // Queue background sync (under the hood encrypts the file before cloud transmission)
  enqueueSyncTask('drive', 'driveUpload', 'teacher_grades', fileItem.id, grades);

  return { success: true, fileId: fileItem.id, fileName: fileItem.name };
}

// 2. Teacher Drive: Save Attendance Log
export async function saveTeacherAttendanceToDrive(
  classId: string,
  className: string,
  attendanceList: { studentId: string; studentName: string; status: string; date: string }[]
): Promise<{ success: boolean; fileId: string; fileName: string }> {
  const files = getStoredDriveFiles();
  const fileName = `LopU_DiemDanh_${className.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.json`;
  
  const fileItem: DriveStoredFile = {
    id: `gdrive_att_${Date.now()}`,
    name: fileName,
    mimeType: 'application/json',
    category: 'teacher_attendance',
    size: `${Math.round(JSON.stringify(attendanceList).length / 1024) + 8} KB`,
    modifiedTime: new Date().toLocaleString('vi-VN'),
    classId,
    content: attendanceList,
  };

  files.unshift(fileItem);
  saveStoredDriveFiles(files);

  // Queue background sync
  enqueueSyncTask('drive', 'driveUpload', 'teacher_attendance', fileItem.id, attendanceList);

  return { success: true, fileId: fileItem.id, fileName };
}

// 3. Personal Drive: Save Timetable / Schedule
export async function savePersonalScheduleToDrive(
  userId: string,
  schedule: ScheduleItem[]
): Promise<{ success: boolean; fileId: string; fileName: string }> {
  const files = getStoredDriveFiles();
  const fileName = `LopU_ThoiKhoaBieu_CaNhan_${userId}.json`;
  const existingIdx = files.findIndex(f => f.category === 'personal_schedule');

  const fileItem: DriveStoredFile = {
    id: existingIdx >= 0 ? files[existingIdx].id : `gdrive_sch_${Date.now()}`,
    name: fileName,
    mimeType: 'application/json',
    category: 'personal_schedule',
    size: `${Math.round(JSON.stringify(schedule).length / 1024) + 14} KB`,
    modifiedTime: new Date().toLocaleString('vi-VN'),
    content: schedule,
  };

  if (existingIdx >= 0) {
    files[existingIdx] = fileItem;
  } else {
    files.unshift(fileItem);
  }
  saveStoredDriveFiles(files);

  // Queue background sync
  enqueueSyncTask('drive', 'driveUpload', 'personal_schedule', fileItem.id, schedule);

  return { success: true, fileId: fileItem.id, fileName };
}

// 4. Personal Drive: Save Custom Seating Plan Template
export async function savePersonalSeatingPlanToDrive(
  plan: ClassSeatingPlan
): Promise<{ success: boolean; fileId: string; fileName: string }> {
  const files = getStoredDriveFiles();
  const fileName = `LopU_SoDoLop_CaNhan_${plan.className.replace(/\s+/g, '_')}.json`;
  const existingIdx = files.findIndex(f => f.category === 'personal_seating' && f.classId === plan.classId);

  const fileItem: DriveStoredFile = {
    id: existingIdx >= 0 ? files[existingIdx].id : `gdrive_seat_${Date.now()}`,
    name: fileName,
    mimeType: 'application/json',
    category: 'personal_seating',
    size: '22 KB',
    modifiedTime: new Date().toLocaleString('vi-VN'),
    classId: plan.classId,
    content: plan,
  };

  if (existingIdx >= 0) {
    files[existingIdx] = fileItem;
  } else {
    files.unshift(fileItem);
  }
  saveStoredDriveFiles(files);

  // Queue background sync
  enqueueSyncTask('drive', 'driveUpload', 'personal_seating', fileItem.id, plan);

  return { success: true, fileId: fileItem.id, fileName };
}

// 5. Personal Drive: Teacher Original Lesson Book / Documents
export async function saveLessonDocToDrive(
  docItem: TeacherDocument
): Promise<{ success: boolean; fileId: string; fileName: string }> {
  const files = getStoredDriveFiles();
  const fileName = `LopU_TuSach_${docItem.title.replace(/[\s:/]+/g, '_')}.${docItem.fileType}`;

  const fileItem: DriveStoredFile = {
    id: `gdrive_doc_${Date.now()}`,
    name: fileName,
    mimeType: docItem.fileType === 'sheet' ? 'application/vnd.google-apps.spreadsheet' : 'application/vnd.google-apps.document',
    category: 'teacher_library',
    size: docItem.fileSize || '1.8 MB',
    modifiedTime: new Date().toLocaleString('vi-VN'),
    content: docItem,
  };

  files.unshift(fileItem);
  saveStoredDriveFiles(files);

  // Queue background sync
  enqueueSyncTask('drive', 'driveUpload', 'teacher_library', fileItem.id, docItem);

  return { success: true, fileId: fileItem.id, fileName };
}

// List all files created/saved by LopU in Google Drive, sanitizing blacklisted & duplicate files
export async function listAppFilesFromDrive(): Promise<DriveStoredFile[]> {
  const files = getStoredDriveFiles();
  let deletedList: string[] = [];
  try {
    deletedList = JSON.parse(localStorage.getItem('lopu_deleted_drive_folders_v1') || '[]');
  } catch {}

  // Filter out any file whose name contains or matches a blacklisted string (e.g. đss, sss)
  const validFiles = files.filter(file => {
    if (!file || !file.name) return false;
    const cleanName = file.name.trim();
    for (const del of deletedList) {
      if (del && del.trim() && cleanName.toLowerCase().includes(del.trim().toLowerCase())) {
        return false;
      }
    }
    return true;
  });

  // Deduplicate files by file.name (keep the first/newest occurrence)
  const seenNames = new Set<string>();
  const deduplicatedFiles: DriveStoredFile[] = [];
  for (const file of validFiles) {
    if (!seenNames.has(file.name)) {
      seenNames.add(file.name);
      deduplicatedFiles.push(file);
    }
  }

  // Persist cleaned & deduplicated list if changes occurred
  if (deduplicatedFiles.length !== files.length) {
    saveStoredDriveFiles(deduplicatedFiles);
  }

  return deduplicatedFiles.map(file => {
    if (file.content && (file.content as any)._encrypted && (file.content as any).data) {
      try {
        return {
          ...file,
          content: decryptData((file.content as any).data)
        };
      } catch (err) {
        console.warn('Decryption failed for listed drive file:', err);
      }
    }
    return file;
  });
}

// Delete a specific file from the synced Drive storage list
export function deleteAppFileFromDrive(fileId: string): DriveStoredFile[] {
  const files = getStoredDriveFiles();
  const targetFile = files.find(f => f.id === fileId);
  if (targetFile?.name) {
    try {
      const deletedListRaw = localStorage.getItem('lopu_deleted_drive_folders_v1') || '[]';
      let deletedList: string[] = JSON.parse(deletedListRaw);
      const cleanName = targetFile.name.replace(/^LopU_TuSach_/, '').replace(/\.[^/.]+$/, '');
      if (cleanName && !deletedList.includes(cleanName)) {
        deletedList.push(cleanName);
        localStorage.setItem('lopu_deleted_drive_folders_v1', JSON.stringify(deletedList));
      }
    } catch {}
  }
  const updated = files.filter(f => f.id !== fileId);
  saveStoredDriveFiles(updated);
  return updated;
}

// Clear all garbage / blacklisted / duplicate files from synced Drive storage
export function clearAppTrashFilesFromDrive(): DriveStoredFile[] {
  saveStoredDriveFiles([]);
  return [];
}

// Download file content
export function downloadFileJson(file: DriveStoredFile): void {
  let content = file.content;
  if (content && (content as any)._encrypted && (content as any).data) {
    content = decryptData((content as any).data);
  }
  const blob = new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Direct Google Drive REST upload (used when real token is authorized)
async function uploadFileToGoogleDriveApi(name: string, content: unknown, mimeType: string) {
  if (!currentAccessToken) return;
  const metadata = {
    name,
    mimeType,
  };
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', new Blob([JSON.stringify(content, null, 2)], { type: mimeType }));

  await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${currentAccessToken}`,
    },
    body: form,
  });
}
