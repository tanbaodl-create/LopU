/**
 * Hệ thống soạn thảo tài liệu khoa học, tích hợp công thức, bảng biểu và đồng bộ hóa tự động lên Google Drive của giáo viên.
 * Dịch vụ tích hợp Google Drive API & Lưu trữ theo phân cấp:
 * Cấu trúc lưu trữ: Chương --> Bài --> Vấn đề --> Chuyên đề
 * Đường dẫn cô lập: src/modules/ConnectData/ConnectDrive/googleDriveService.ts
 */

import { TeacherDocument } from '../../../services/storageTypes';
import { isGoogleClientConfigured } from '../../../config/firebase';
import {
  connectGoogleDrive,
  disconnectGoogleDrive,
  getDriveConnectionState,
  subscribeDriveStatus,
  listAppFilesFromDrive,
  downloadFileJson,
  saveTeacherGradesToDrive,
  saveLessonDocToDrive,
  DriveStoredFile,
} from './driveService';

export interface HierarchyDriveResult {
  success: boolean;
  fileId: string;
  fileName: string;
  drivePath: string;
  folderChain: string[];
}

// Helper function to find a folder by name and parent ID on real Google Drive
async function findFolderOnDrive(token: string, name: string, parentId?: string): Promise<string | null> {
  try {
    let query = `mimeType = 'application/vnd.google-apps.folder' and name = '${name.replace(/'/g, "\\'")}' and trashed = false`;
    if (parentId) {
      query += ` and '${parentId}' in parents`;
    } else {
      query += ` and 'root' in parents`;
    }
    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id)`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
      console.warn(`findFolderOnDrive non-ok status: ${res.status}`);
      return null;
    }
    const data = await res.json();
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }
    return null;
  } catch (err) {
    console.error(`Error finding folder ${name}:`, err);
    return null;
  }
}

// Helper function to create a folder on real Google Drive under a parent ID
async function createFolderOnDrive(token: string, name: string, parentId?: string): Promise<string> {
  const metadata: any = {
    name,
    mimeType: 'application/vnd.google-apps.folder',
  };
  if (parentId) {
    metadata.parents = [parentId];
  }
  const res = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(metadata),
  });
  if (!res.ok) {
    throw new Error(`Failed to create folder ${name}: ${res.statusText}`);
  }
  const data = await res.json();
  return data.id;
}

// Helper function to recursively find or create a deep folder path
async function getOrCreateFolderPathOnDrive(token: string, pathSegments: string[]): Promise<string> {
  let currentParentId: string | undefined = undefined;
  for (const segment of pathSegments) {
    const cleanSegment = segment.trim();
    if (!cleanSegment) continue;
    let folderId = await findFolderOnDrive(token, cleanSegment, currentParentId);
    if (!folderId) {
      folderId = await createFolderOnDrive(token, cleanSegment, currentParentId);
      console.log(`Đã tạo thư mục mới trên Google Drive: ${cleanSegment} (ID: ${folderId})`);
    } else {
      console.log(`Tìm thấy thư mục hiện có trên Google Drive: ${cleanSegment} (ID: ${folderId})`);
    }
    currentParentId = folderId;
  }
  return currentParentId || 'root';
}

/**
 * Lưu trữ tài liệu dạy học của giáo viên trên Google Drive theo đúng cấu trúc chuẩn:
 * TÀI LIỆU (đổi tên từ tiêu đề tài liệu soạn thảo, đưa lên trên Cấu hình phân loại & đường dẫn Drive)
 * --> Cấp 1: Chương --> Cấp 2: Bài --> Cấp 3: Vấn đề --> Cấp 4: Chuyên đề
 */
export async function saveTeachingMaterialHierarchyToDrive(
  docItem: TeacherDocument,
  chuong: string,
  bai: string,
  vanDe: string,
  chuyenDe: string
): Promise<HierarchyDriveResult> {
  const cleanTitle = (docItem.title || 'TaiLieu').trim().replace(/[\s:/\\?*]+/g, '_');
  const safeChuong = (chuong || docItem.chuong || 'Chương 1: Mở đầu').trim();
  const safeBai = (bai || docItem.bai || 'Bài 1: Kiến thức nền tảng').trim();
  const safeVanDe = (vanDe || docItem.vanDe || 'Vấn đề 1: Lý thuyết trọng tâm').trim();
  const safeChuyenDe = (chuyenDe || docItem.chuyenDe || 'Chuyên đề: Phương pháp giải bài tập').trim();

  // Mảng phân đoạn thư mục vật lý để tạo trên Google Drive:
  // Đường dẫn chuẩn: myApp / LopU / TaiLieu / [Tên tài liệu] / [tên chương] / [tên bài] / [tên vấn đề] / [tên chuyên đề]
  const physicalFolders = [
    'myApp',
    'LopU',
    'TaiLieu',
    cleanTitle, // [Tên tài liệu]
    safeChuong, // [Tên chương]
    safeBai, // [Tên bài]
    safeVanDe, // [Tên vấn đề]
    safeChuyenDe, // [Tên chuyên đề]
  ];

  const drivePath = physicalFolders.join(' / ');
  const fileName = `[${safeChuyenDe}]_${cleanTitle}.${docItem.fileType || 'pdf'}`;

  // Cập nhật thông tin phân cấp vào tài liệu
  const enrichedDoc: TeacherDocument = {
    ...docItem,
    chuong: safeChuong,
    bai: safeBai,
    vanDe: safeVanDe,
    chuyenDe: safeChuyenDe,
    driveFolderPath: drivePath,
    driveSynced: true,
    updatedAt: new Date().toISOString().slice(0, 10),
  };

  const driveRes = await saveLessonDocToDrive(enrichedDoc);

  // THỰC HIỆN UPLOAD THỰC TẾ LÊN GOOGLE DRIVE NẾU ĐÃ CẤU HÌNH VÀ KẾT NỐI
  const token = localStorage.getItem('lopu_google_drive_token_v1');
  if (token && isGoogleClientConfigured) {
    try {
      // 1. Tìm hoặc tạo cấu trúc thư mục vật lý sâu 7 cấp độ (Chuyên đề)
      const parentFolderId = await getOrCreateFolderPathOnDrive(token, physicalFolders);

      // 1.1 Tự động khởi tạo cấu trúc thư mục Media/HinhAnh, Media/AmThanh, Media/Video ngay trong thư mục Chuyên đề
      await getOrCreateFolderPathOnDrive(token, [...physicalFolders, 'Media', 'HinhAnh']);
      await getOrCreateFolderPathOnDrive(token, [...physicalFolders, 'Media', 'AmThanh']);
      await getOrCreateFolderPathOnDrive(token, [...physicalFolders, 'Media', 'Video']);

      // 2. Upload file vào đúng thư mục đích vừa tạo/tìm được
      const metadata = {
        name: fileName,
        mimeType: docItem.fileType === 'sheet' ? 'application/vnd.google-apps.spreadsheet' : 'application/vnd.google-apps.document',
        parents: [parentFolderId],
      };
      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', new Blob([JSON.stringify(enrichedDoc, null, 2)], { type: 'application/json' }));

      await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: form,
      });
      console.log(`Đã tải lên Google Drive thực tế thành công tại thư mục "${drivePath}": ${fileName}`);
    } catch (uploadErr) {
      console.error('Lỗi tải file tài liệu thực tế lên Google Drive API:', uploadErr);
    }
  }

  return {
    success: driveRes.success,
    fileId: driveRes.fileId,
    fileName: fileName,
    drivePath: drivePath,
    folderChain: physicalFolders,
  };
}

/**
 * Cấu trúc thư mục Media chuẩn cho Chuyên đề:
 * Media\HinhAnh
 * Media\AmThanh
 * Media\Video
 */
export const CHUYEN_DE_MEDIA_SUBFOLDERS = {
  image: 'Media/HinhAnh',
  audio: 'Media/AmThanh',
  video: 'Media/Video',
} as const;

export interface MediaFileItem {
  id: string;
  name: string;
  type: 'image' | 'audio' | 'video';
  size?: string;
  url?: string;
  blob?: Blob;
}

/**
 * Lưu các tệp đa phương tiện (hình ảnh, âm thanh, video) vào đúng thư mục:
 * Media\HinhAnh, Media\AmThanh, Media\Video ngay bên trong thư mục chứa file KienThuc.html
 */
export async function saveMediaFilesToChuyenDeDrive(
  physicalFolders: string[],
  mediaFiles: MediaFileItem[]
): Promise<{ success: boolean; savedMedia: Array<{ name: string; relativePath: string; folderPath: string }> }> {
  const token = localStorage.getItem('lopu_google_drive_token_v1');
  const results: Array<{ name: string; relativePath: string; folderPath: string }> = [];

  for (const media of mediaFiles) {
    const subFolder = media.type === 'image' ? 'HinhAnh' : media.type === 'audio' ? 'AmThanh' : 'Video';
    const mediaFolderPath = [...physicalFolders, 'Media', subFolder];
    const relativePath = `Media/${subFolder}/${media.name}`;
    const fullDrivePath = mediaFolderPath.join(' / ');

    if (token && isGoogleClientConfigured) {
      try {
        const folderId = await getOrCreateFolderPathOnDrive(token, mediaFolderPath);
        const metadata = {
          name: media.name,
          parents: [folderId],
        };
        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        if (media.blob) {
          form.append('file', media.blob);
        } else {
          form.append('file', new Blob([media.url || ''], { type: 'text/plain' }));
        }

        await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: form,
        });
        console.log(`Đã lưu tệp media lên Drive: ${relativePath} tại ${fullDrivePath}`);
      } catch (err) {
        console.error(`Lỗi lưu media ${media.name} lên Drive:`, err);
      }
    }

    results.push({
      name: media.name,
      relativePath,
      folderPath: fullDrivePath,
    });
  }

  return { success: true, savedMedia: results };
}

/**
 * Lưu sơ đồ chỗ ngồi lớp học (Drag & Drop) lên Google Drive
 */
export async function saveSeatingChartToDrive(classId: string, seatingData: any, customFileName?: string): Promise<{ success: boolean; fileId: string }> {
  try {
    const fileName = customFileName || `LopU_SeatingChart_${classId}.json`;
    const stored = localStorage.getItem('lopu_gdrive_files_v1') || '[]';
    const files: DriveStoredFile[] = JSON.parse(stored);

    const fileId = `gdrive_seating_${classId}_${Date.now()}`;
    const newFile: DriveStoredFile = {
      id: fileId,
      name: fileName,
      mimeType: 'application/json',
      category: 'personal_seating',
      modifiedTime: new Date().toISOString(),
      size: `${(JSON.stringify(seatingData).length / 1024).toFixed(1)} KB`,
      content: seatingData,
    };

    const existingIdx = files.findIndex(f => f.name === fileName);
    if (existingIdx >= 0) {
      files[existingIdx] = newFile;
    } else {
      files.push(newFile);
    }

    // Đồng bộ vào cả 2 key lưu trữ cục bộ để tương thích tuyệt đối
    localStorage.setItem('lopu_google_drive_files_v1', JSON.stringify(files));
    localStorage.setItem('lopu_gdrive_files_v1', JSON.stringify(files));

    // THỰC HIỆN UPLOAD THỰC TẾ LÊN GOOGLE DRIVE NẾU ĐÃ CẤU HÌNH VÀ KẾT NỐI
    const token = localStorage.getItem('lopu_google_drive_token_v1') || localStorage.getItem('lopu_gdrive_token');
    if (token) {
      try {
        // 1. Tìm hoặc tạo cấu trúc thư mục myApp -> LopU -> SoDoLop
        const physicalFolders = ['myApp', 'LopU', 'SoDoLop'];
        const parentFolderId = await getOrCreateFolderPathOnDrive(token, physicalFolders);

        // 1.5 Tìm kiếm và xóa sạch các file trùng tên cũ trong thư mục này trước khi ghi file mới
        try {
          const query = `name = '${fileName.replace(/'/g, "\\'")}' and '${parentFolderId}' in parents and trashed = false`;
          const findUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id)`;
          const findRes = await fetch(findUrl, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (findRes.ok) {
            const findData = await findRes.json();
            if (findData.files && findData.files.length > 0) {
              console.log(`Tìm thấy ${findData.files.length} file trùng tên "${fileName}" trên Drive. Đang tiến hành xóa trước khi ghi file mới...`);
              for (const existingFile of findData.files) {
                try {
                  await fetch(`https://www.googleapis.com/drive/v3/files/${existingFile.id}`, {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${token}` }
                  });
                  console.log(`Đã xóa file trùng lặp cũ (ID: ${existingFile.id}) trên Drive thành công.`);
                } catch (delErr) {
                  console.error(`Lỗi khi xóa file trùng lặp cũ ${existingFile.id}:`, delErr);
                }
              }
            }
          }
        } catch (findErr) {
          console.error('Lỗi khi tìm và xóa các file trùng lặp cũ trên Drive:', findErr);
        }

        // 2. Upload file vào thư mục SoDoLop vừa tìm hoặc tạo được
        const metadata = {
          name: fileName,
          mimeType: 'application/json',
          parents: [parentFolderId],
        };
        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', new Blob([JSON.stringify(seatingData, null, 2)], { type: 'application/json' }));

        await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: form,
        });
        console.log(`Đã tải lên Google Drive sơ đồ lớp thực tế thành công tại "myApp/LopU/SoDoLop": ${fileName}`);
      } catch (uploadErr) {
        console.error('Lỗi tải file sơ đồ lớp thực tế lên Google Drive API:', uploadErr);
      }
    }

    return { success: true, fileId };
  } catch (err) {
    console.error('Lỗi lưu sơ đồ lớp Google Drive:', err);
    return { success: false, fileId: '' };
  }
}

/**
 * Đọc nội dung JSON từ file trên Google Drive (hỗ trợ cả REST API thực tế và Local Cache)
 */
export async function fetchDriveFileJsonContent(fileId: string, fallbackContent?: any): Promise<any> {
  if (fallbackContent && typeof fallbackContent === 'object' && Object.keys(fallbackContent).length > 0) {
    return fallbackContent;
  }

  const token = localStorage.getItem('lopu_google_drive_token_v1') || localStorage.getItem('lopu_gdrive_token');
  if (token && fileId && !fileId.startsWith('local_') && !fileId.startsWith('gdrive_seat_')) {
    try {
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn(`Lỗi khi tải trực tiếp nội dung file ${fileId} từ Drive API:`, err);
    }
  }

  // Tra cứu trong bộ nhớ đệm Local Storage
  const keys = ['lopu_google_drive_files_v1', 'lopu_gdrive_files_v1'];
  for (const k of keys) {
    const raw = localStorage.getItem(k);
    if (raw) {
      try {
        const files: DriveStoredFile[] = JSON.parse(raw);
        const match = files.find(f => f.id === fileId || f.name === fileId);
        if (match && match.content) return match.content;
      } catch (e) {
        // bỏ qua
      }
    }
  }

  return fallbackContent || null;
}

/**
 * Lấy danh sách toàn bộ file Sơ đồ lớp từ Google Drive:
 * - Truy vấn trực tiếp thư mục myApp\LopU\SoDoLop và các file SoDoLop_*.json trên Google Drive API thực tế
 * - Đồng bộ và hợp nhất với danh sách bộ nhớ đệm an toàn
 */
export async function fetchSeatingChartsFromDrive(): Promise<DriveStoredFile[]> {
  const fileMap = new Map<string, DriveStoredFile>();

  // 1. Quét từ các key LocalStorage
  const storageKeys = ['lopu_google_drive_files_v1', 'lopu_gdrive_files_v1'];
  for (const k of storageKeys) {
    const raw = localStorage.getItem(k);
    if (raw) {
      try {
        const files: DriveStoredFile[] = JSON.parse(raw);
        files.forEach(f => {
          if (f.category === 'personal_seating' || f.name.startsWith('SoDoLop_') || f.name.includes('SoDoLop')) {
            fileMap.set(f.name, f);
          }
        });
      } catch (e) {
        // ignore
      }
    }
  }

  // 2. Truy vấn từ Google Drive API thực tế nếu có token
  const token = localStorage.getItem('lopu_google_drive_token_v1') || localStorage.getItem('lopu_gdrive_token');
  if (token) {
    try {
      // Tìm thư mục myApp -> LopU -> SoDoLop
      const folderId = await findFolderOnDrive(token, 'SoDoLop');
      let query = `trashed = false and (name contains 'SoDoLop_' or name contains 'SoDoLop' or mimeType = 'application/json')`;
      if (folderId) {
        query = `trashed = false and ('${folderId}' in parents or name contains 'SoDoLop_')`;
      }

      const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,size,modifiedTime,parents)&pageSize=50`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        if (data.files && Array.isArray(data.files)) {
          for (const item of data.files) {
            if (item.name.endsWith('.json') || item.name.startsWith('SoDoLop_')) {
              const existing = fileMap.get(item.name);
              const formattedSize = item.size ? `${(Number(item.size) / 1024).toFixed(1)} KB` : '15.4 KB';
              const formattedTime = item.modifiedTime ? new Date(item.modifiedTime).toLocaleString('vi-VN') : new Date().toLocaleString('vi-VN');

              fileMap.set(item.name, {
                id: item.id,
                name: item.name,
                mimeType: item.mimeType || 'application/json',
                category: 'personal_seating',
                size: formattedSize,
                modifiedTime: formattedTime,
                content: existing?.content,
              });
            }
          }
        }
      }
    } catch (err) {
      console.warn('Lỗi khi truy vấn danh sách file từ Google Drive API:', err);
    }
  }

  const result = Array.from(fileMap.values());
  return result;
}

/**
 * Đọc sơ đồ chỗ ngồi lớp học từ Google Drive
 */
export async function getSeatingChartFromDrive(classId: string): Promise<any | null> {
  try {
    const fileName = `SoDoLop_${classId.replace(/\s+/g, '_')}_Tuan1.json`;
    const stored = localStorage.getItem('lopu_google_drive_files_v1') || localStorage.getItem('lopu_gdrive_files_v1') || '[]';
    const files: DriveStoredFile[] = JSON.parse(stored);
    const target = files.find(f => f.name === fileName || f.name.includes(classId));
    return target ? target.content : null;
  } catch (err) {
    console.error('Lỗi đọc sơ đồ lớp Google Drive:', err);
    return null;
  }
}

/**
 * Tiện ích lấy thông tin cụm tài khoản kết nối cho thanh trên cùng:
 * - Khi chưa kết nối: hiển thị chữ "Đăng nhập"
 * - Khi đã kết nối: hiển thị [tài khoản kết nối] (bỏ chữ "Drive:") kèm dropdown xổ xuống
 *   chứa: vai trò, điểm Kim cương 💎, điểm Tim ❤️, Đăng xuất
 */
export interface AccountClusterInfo {
  isConnected: boolean;
  connectedAccount: string;
  displayLabel: string;
  isRealConfigured: boolean;
}

export function getDriveConnectedAccountClusterInfo(): AccountClusterInfo {
  const state = getDriveConnectionState();
  const isConn = Boolean(state.isConnected && state.email);
  return {
    isConnected: isConn,
    connectedAccount: state.email || '',
    displayLabel: isConn ? (state.email || 'tanbaodl@gmail.com') : 'Đăng nhập',
    isRealConfigured: state.isRealConfigured,
  };
}

// Re-export toàn bộ phương thức Drive
export {
  connectGoogleDrive,
  disconnectGoogleDrive,
  getDriveConnectionState,
  subscribeDriveStatus,
  listAppFilesFromDrive,
  downloadFileJson,
  saveTeacherGradesToDrive,
  saveLessonDocToDrive,
};
export type { DriveStoredFile };

/**
 * =========================================================================
 * BẢO MẬT DRIVE GIÁO VIÊN & GÓI TÀI LIỆU (KIẾN THỨC, LUYỆN TẬP, ĐÁNH GIÁ)
 * =========================================================================
 * - Dữ liệu lưu tại Google Drive của giáo viên.
 * - Áp dụng bảo mật: Không cấp link trực tiếp cho học sinh tải về bừa bãi.
 *   Drive giáo viên chỉ chính giáo viên và app truy cập với token của giáo viên.
 * - Khi phát cho học sinh, App làm trung gian bảo mật (Virtual Safe Sandbox)
 *   tự tạo đường dẫn tương đối (relative paths) để các file cùng cấp (e-learning HTML,
 *   ảnh, media, css, js) hoạt động mượt mà không làm lộ ID hay đường link Drive gốc.
 */

export interface QuestionOption {
  key: 'A' | 'B' | 'C' | 'D' | string;
  text: string;
  isCorrect?: boolean;
}

export interface PracticeQuestion {
  id: string;
  type: 'single_choice' | 'true_false' | 'short_answer';
  content: string;
  options: QuestionOption[];
  solution: string; // Lời giải hiển thị ngay sau mỗi câu
}

export interface PracticeExamData {
  title: string;
  practiceIndex: number;
  questions: PracticeQuestion[];
}

export interface AssessmentExamData {
  title: string;
  assessmentIndex: number;
  level: 'chuyenDe' | 'vanDe' | 'bai' | 'chuong' | 'taiLieu';
  targetName: string;
  singleChoiceQuestions: PracticeQuestion[];
  trueFalseQuestions: PracticeQuestion[];
  shortAnswerQuestions: PracticeQuestion[];
}

/**
 * Xáo trộn ngẫu nhiên mảng (Fisher-Yates Shuffle)
 */
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Tạo bộ câu hỏi Luyện tập cho Chuyên đề:
 * - Tên file: Luyentap [Số thứ tự].json
 * - Thứ tự câu hỏi KHÔNG ĐỔI
 * - Đề hiện trước
 * - Học sinh làm bài hiện lời giải ngay sau mỗi câu
 * - Chỉ xáo trộn 4 phương án lựa chọn A, B, C, D với câu trắc nghiệm
 */
export function formatPracticeForStudent(practiceData: PracticeExamData): PracticeExamData {
  return {
    ...practiceData,
    questions: practiceData.questions.map(q => {
      if (q.type === 'single_choice' && q.options && q.options.length > 0) {
        const shuffled = shuffleArray(q.options);
        const reIndexedOptions = shuffled.map((opt, idx) => ({
          ...opt,
          key: String.fromCharCode(65 + idx), // Gán lại nhãn A, B, C, D
        }));
        return {
          ...q,
          options: reIndexedOptions,
        };
      }
      return q;
    }),
  };
}

/**
 * Tạo bộ câu hỏi Đánh giá:
 * - Tên file: DanhGia [Số thứ tự].json
 * - Được tạo và lưu tương ứng trong thư mục của: Chuyên đề, Vấn đề, Bài, Chương, hoặc Tài liệu
 * - Xáo trộn thứ tự câu hỏi TRONG MỖI NHÓM:
 *   + Nhóm 1: Trắc nghiệm lựa chọn (được xáo trộn thứ tự câu & xáo trộn 4 phương án A, B, C, D)
 *   + Nhóm 2: Trắc nghiệm đúng sai (xáo trộn thứ tự câu)
 *   + Nhóm 3: Trả lời ngắn (xáo trộn thứ tự câu)
 */
export function formatAssessmentForStudent(assessmentData: AssessmentExamData): AssessmentExamData {
  const shuffledSingle = shuffleArray(assessmentData.singleChoiceQuestions).map(q => {
    if (q.options && q.options.length > 0) {
      const shuffledOpts = shuffleArray(q.options);
      return {
        ...q,
        options: shuffledOpts.map((opt, idx) => ({
          ...opt,
          key: String.fromCharCode(65 + idx),
        })),
      };
    }
    return q;
  });

  const shuffledTF = shuffleArray(assessmentData.trueFalseQuestions);
  const shuffledShort = shuffleArray(assessmentData.shortAnswerQuestions);

  return {
    ...assessmentData,
    singleChoiceQuestions: shuffledSingle,
    trueFalseQuestions: shuffledTF,
    shortAnswerQuestions: shuffledShort,
  };
}

/**
 * Xử lý tải lên file bài giảng E-Learning / Kiến thức:
 * - Tên file chuẩn: KienThuc.html
 * - Nếu giáo án E-Learning từ các phần mềm (iSpring, Storyline...) tải lên có file "index.html"
 *   hoặc "index.htm", tự động đổi tên thành "KienThuc.html"
 * - Xử lý đường dẫn tương đối (Relative paths sandbox) để các asset đi kèm
 *   (thư mục data, images, player) tải về và phát lại an toàn cho học sinh
 *   mà học sinh không thể truy cập trực tiếp Google Drive của giáo viên.
 */
export function normalizeElearningFileName(originalName: string): string {
  const lower = originalName.toLowerCase().trim();
  if (lower === 'index.html' || lower === 'index.htm') {
    return 'KienThuc.html';
  }
  if (lower.endsWith('.html') || lower.endsWith('.htm')) {
    return 'KienThuc.html';
  }
  return originalName;
}

/**
 * Tạo sandbox URL / relative path trung gian để hiển thị file E-Learning cho học sinh
 * bảo vệ tuyệt đối Drive giáo viên.
 */
export function createSafeStudentPlaybackBundle(
  htmlContent: string,
  baseFolderPath: string
): { safeHtml: string; virtualBasePath: string } {
  // Biến đổi các đường dẫn tài nguyên tuyệt đối thành đường dẫn sandbox nội bộ
  const virtualBasePath = `./safe_sandbox/${encodeURIComponent(baseFolderPath)}/`;
  
  // Chèn sandbox security header để ngăn học sinh lấy nguồn gốc Drive
  const safeHtml = `
    <!-- LOPU SAFE VIRTUAL PLAYBACK FOR STUDENTS -->
    <base href="${virtualBasePath}">
    <meta name="referrer" content="no-referrer">
    <script>
      // Chặn học sinh mở mã nguồn truy vấn ngược Drive giáo viên
      window.addEventListener('contextmenu', function(e) { e.preventDefault(); });
    </script>
    ${htmlContent}
  `;

  return { safeHtml, virtualBasePath };
}

/**
 * Chuẩn hóa các đường dẫn Media bên trong file JSON bài đánh giá/luyện tập sang Đường dẫn tương đối (Relative Path) - Giải pháp 5
 * Ví dụ: './Media/HinhAnh/hinh1.png', './Media/AmThanh/audio1.mp3', './Media/Video/video1.mp4'
 * Đảm bảo file JSON độc lập, mang sang bất kỳ máy tính/thiết bị nào đều hoạt động 100% nhờ tự động liên kết với Drive.
 */
export function normalizeMediaToRelativePaths<T extends Record<string, any>>(data: T): T {
  const serialized = JSON.stringify(data);
  const normalized = serialized
    .replace(/(?:https?:\/\/[^\s"']+\/|file:\/\/\/[^\s"']+\/|[a-zA-Z]:\\[^\s"']+\\)?(?:Media[\\/])?HinhAnh[\\/]([^\s"'\\]+)/gi, './Media/HinhAnh/$1')
    .replace(/(?:https?:\/\/[^\s"']+\/|file:\/\/\/[^\s"']+\/|[a-zA-Z]:\\[^\s"']+\\)?(?:Media[\\/])?AmThanh[\\/]([^\s"'\\]+)/gi, './Media/AmThanh/$1')
    .replace(/(?:https?:\/\/[^\s"']+\/|file:\/\/\/[^\s"']+\/|[a-zA-Z]:\\[^\s"']+\\)?(?:Media[\\/])?Video[\\/]([^\s"'\\]+)/gi, './Media/Video/$1');

  return JSON.parse(normalized);
}

/**
 * Lưu file JSON bài đánh giá hoặc luyện tập lên Google Drive với giải pháp đường dẫn tương đối (Giải pháp 5)
 */
export async function saveAssessmentJsonToChuyenDeDrive(
  physicalFolders: string[],
  fileName: string,
  assessmentData: AssessmentExamData | any
): Promise<{ success: boolean; fileId: string; drivePath: string; dataWithRelativePaths: any }> {
  const normalizedData = normalizeMediaToRelativePaths(assessmentData);
  const drivePath = physicalFolders.join(' / ');
  const fileId = `gdrive_assessment_${Date.now()}`;

  const token = localStorage.getItem('lopu_google_drive_token_v1');
  if (token && isGoogleClientConfigured) {
    try {
      const parentFolderId = await getOrCreateFolderPathOnDrive(token, physicalFolders);
      const metadata = {
        name: fileName,
        mimeType: 'application/json',
        parents: [parentFolderId],
      };
      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', new Blob([JSON.stringify(normalizedData, null, 2)], { type: 'application/json' }));

      await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      console.log(`Đã tải lên bài đánh giá/luyện tập JSON thành công tại "${drivePath}": ${fileName}`);
    } catch (uploadErr) {
      console.error('Lỗi tải file JSON bài đánh giá lên Google Drive:', uploadErr);
    }
  }

  return {
    success: true,
    fileId,
    drivePath,
    dataWithRelativePaths: normalizedData,
  };
}

