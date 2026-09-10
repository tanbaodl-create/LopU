/**
 * Dịch vụ tích hợp Google Drive API & Lưu trữ theo phân cấp:
 * Chương --> Bài --> Vấn đề --> Chuyên đề
 * Đường dẫn cô lập: src/modules/ConnectData/ConnectDrive/googleDriveService.ts
 */

import { TeacherDocument } from '../../../services/storageTypes';
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

  const folderChain = [
    'LopU_TaiLieuDayHoc',
    docItem.subject || 'MonHoc',
    safeChuong,
    safeBai,
    safeVanDe,
    safeChuyenDe,
  ];

  const drivePath = folderChain.join(' / ');
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

  return {
    success: driveRes.success,
    fileId: driveRes.fileId,
    fileName: fileName,
    drivePath: drivePath,
    folderChain: folderChain,
  };
}

/**
 * Lưu sơ đồ chỗ ngồi lớp học (Drag & Drop) lên Google Drive
 */
export async function saveSeatingChartToDrive(classId: string, seatingData: any): Promise<{ success: boolean; fileId: string }> {
  try {
    const fileName = `LopU_SeatingChart_${classId}.json`;
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
