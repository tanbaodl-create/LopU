/**
 * Dịch vụ tích hợp Google Drive API & Lưu trữ theo phân cấp:
 * Chương --> Bài --> Vấn đề --> Chuyên đề
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
 * Chương --> Bài --> Vấn đề --> Chuyên đề
 */
export async function saveTeachingMaterialHierarchyToDrive(
  docItem: TeacherDocument,
  chuong: string,
  bai: string,
  vanDe: string,
  chuyenDe: string
): Promise<HierarchyDriveResult> {
  const safeChuong = (chuong || docItem.chuong || 'Chương 1: Mở đầu').trim();
  const safeBai = (bai || docItem.bai || 'Bài 1: Kiến thức nền tảng').trim();
  const safeVanDe = (vanDe || docItem.vanDe || 'Vấn đề 1: Lý thuyết trọng tâm').trim();
  const safeChuyenDe = (chuyenDe || docItem.chuyenDe || 'Chuyên đề: Phương pháp giải bài tập').trim();

  // Mảng phân đoạn thư mục vật lý để tạo trên Google Drive
  const physicalFolders = [
    'myApp',
    'LopU',
    docItem.subject || 'MonHoc',
    safeChuong,
    safeBai,
    safeVanDe,
    safeChuyenDe,
  ];

  const drivePath = physicalFolders.join(' / ');
  const cleanTitle = (docItem.title || 'TaiLieu').replace(/[\s:/\\?*]+/g, '_');
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
      // 1. Tìm hoặc tạo cấu trúc thư mục vật lý sâu 7 cấp độ
      const parentFolderId = await getOrCreateFolderPathOnDrive(token, physicalFolders);

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

    localStorage.setItem('lopu_gdrive_files_v1', JSON.stringify(files));

    // THỰC HIỆN UPLOAD THỰC TẾ LÊN GOOGLE DRIVE NẾU ĐÃ CẤU HÌNH VÀ KẾT NỐI
    const token = localStorage.getItem('lopu_google_drive_token_v1');
    if (token && isGoogleClientConfigured) {
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
 * Đọc sơ đồ chỗ ngồi lớp học từ Google Drive
 */
export async function getSeatingChartFromDrive(classId: string): Promise<any | null> {
  try {
    const fileName = `LopU_SeatingChart_${classId}.json`;
    const stored = localStorage.getItem('lopu_gdrive_files_v1') || '[]';
    const files: DriveStoredFile[] = JSON.parse(stored);
    const target = files.find(f => f.name === fileName);
    return target ? target.content : null;
  } catch (err) {
    console.error('Lỗi đọc sơ đồ lớp Google Drive:', err);
    return null;
  }
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
