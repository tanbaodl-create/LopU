/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ensureValidDriveToken,
  getOrCreateFolderPathOnDrive,
  saveOrUpdateDriveFile,
  findFileInDriveFolder,
  deleteDriveFileEverywhere,
} from '../../../ConnectData/ConnectDrive/googleDriveService';
import { PptWhiteboardData } from '../../../../modules/ModuleGiaoDien/modulePPT';

export interface PptExtraData {
  fileType: 'ppt_extra';
  version: number;
  originalFileName: string;
  originalContentHash: string;
  title: string;
  chuong: string;
  bai: string;
  vanDe: string;
  chuyenDe: string;
  whiteboards: PptWhiteboardData[];
  savedAt: string;
}

/**
 * Tính mã hash kiểm tra tính toàn vẹn của nội dung văn bản gốc
 */
export function computeContentHash(content: string): string {
  const clean = (content || '').trim().replace(/\s+/g, ' ');
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    const char = clean.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `h_${clean.length}_${hash}`;
}

/**
 * Tạo tên file nội dung chèn thêm PPT tương ứng với file nội dung gốc
 */
export function getPptExtraFileName(cleanName: string): string {
  const base = (cleanName || 'ly_thuyet_trong_tam').trim();
  return `KienThuc_${base}_ppt_extra.json`;
}

/**
 * Tạo key lưu trữ cục bộ cho file chèn thêm PPT
 */
export function getPptExtraStorageKey(physicalFolders: string[], cleanName: string): string {
  return `lopu_pptextra_${physicalFolders.join('_')}_${cleanName}`;
}

/**
 * Lưu bài giảng PPT: Lưu file nội dung chèn thêm (khoảng trống, bảng, hình vẽ, đồ thị)
 * vào đúng thư mục của nội dung gốc trên Google Drive và lưu cache
 */
export async function savePptExtraToDrive(
  token: string | null,
  physicalFolders: string[],
  cleanName: string,
  extraData: {
    title: string;
    chuong: string;
    bai: string;
    vanDe: string;
    chuyenDe: string;
    originalContentHtml: string;
    whiteboards: PptWhiteboardData[];
  }
): Promise<{ success: boolean; fileId?: string; error?: string }> {
  try {
    const fileName = getPptExtraFileName(cleanName);
    const originalFileName = `KienThuc_${cleanName}.html`;
    const hash = computeContentHash(extraData.originalContentHtml);

    const payload: PptExtraData = {
      fileType: 'ppt_extra',
      version: 1,
      originalFileName,
      originalContentHash: hash,
      title: extraData.title,
      chuong: extraData.chuong,
      bai: extraData.bai,
      vanDe: extraData.vanDe,
      chuyenDe: extraData.chuyenDe,
      whiteboards: extraData.whiteboards,
      savedAt: new Date().toISOString(),
    };

    const jsonStr = JSON.stringify(payload, null, 2);

    // 1. Lưu vào bộ nhớ cục bộ (localStorage cache)
    const storageKey = getPptExtraStorageKey(physicalFolders, cleanName);
    try {
      localStorage.setItem(storageKey, jsonStr);
      localStorage.setItem(`lopu_drive_file_content_name_${fileName}`, jsonStr);
    } catch (e) {
      console.warn('Không thể lưu cache pptExtra vào localStorage:', e);
    }

    // 2. Lưu trực tiếp lên Google Drive nếu có token
    if (token) {
      const folderId = await getOrCreateFolderPathOnDrive(token, physicalFolders);
      const res = await saveOrUpdateDriveFile(token, folderId, fileName, jsonStr, 'application/json');
      return { success: true, fileId: res.fileId };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Lỗi khi lưu PptExtra lên Drive:', err);
    return { success: false, error: err?.message || 'Lỗi khi lưu bài giảng PPT' };
  }
}

/**
 * Nạp file nội dung chèn thêm PPT từ Drive hoặc cache:
 * Tự động xóa file nếu nội dung gốc đã bị giáo viên thay đổi hoặc xóa
 */
export async function loadPptExtraFromDriveOrCache(
  token: string | null,
  physicalFolders: string[],
  cleanName: string,
  currentOriginalHtml: string
): Promise<{ whiteboards: PptWhiteboardData[]; isFresh: boolean } | null> {
  const fileName = getPptExtraFileName(cleanName);
  const storageKey = getPptExtraStorageKey(physicalFolders, cleanName);
  const currentHash = computeContentHash(currentOriginalHtml);

  let rawJson: string | null = null;

  // 1. Kiểm tra cache cục bộ trước
  try {
    rawJson = localStorage.getItem(storageKey) || localStorage.getItem(`lopu_drive_file_content_name_${fileName}`);
  } catch {}

  // 2. Nếu chưa có trong cache và có token Drive, tải từ Drive
  if (!rawJson && token) {
    try {
      const folderId = await getOrCreateFolderPathOnDrive(token, physicalFolders);
      const fileId = await findFileInDriveFolder(token, folderId, fileName);
      if (fileId) {
        const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          rawJson = await res.text();
          try {
            localStorage.setItem(storageKey, rawJson);
            localStorage.setItem(`lopu_drive_file_content_name_${fileName}`, rawJson);
          } catch {}
        }
      }
    } catch (err) {
      console.warn('Lỗi tải pptExtra từ Drive:', err);
    }
  }

  if (!rawJson) return null;

  try {
    const data: PptExtraData = JSON.parse(rawJson);
    if (data.fileType !== 'ppt_extra') return null;

    // KIỂM TRA QUAN TRỌNG:
    // Nếu nội dung gốc bị giáo viên thay đổi hoặc xóa, lập tức XÓA file này cả trên Drive và cache!
    if (data.originalContentHash !== currentHash) {
      console.warn(
        `Nội dung gốc đã bị thay đổi (Hash cũ: ${data.originalContentHash} !== Hash mới: ${currentHash}). Tự động xóa file PPT chèn thêm cũ!`
      );
      await deletePptExtraEverywhere(token, physicalFolders, cleanName);
      return null;
    }

    return {
      whiteboards: data.whiteboards || [],
      isFresh: false,
    };
  } catch (err) {
    console.warn('Lỗi phân tích cú pháp pptExtra JSON:', err);
    return null;
  }
}

/**
 * Xóa file nội dung chèn thêm PPT cả trên Drive và trong cache
 */
export async function deletePptExtraEverywhere(
  token: string | null,
  physicalFolders: string[],
  cleanName: string
): Promise<void> {
  const fileName = getPptExtraFileName(cleanName);
  const storageKey = getPptExtraStorageKey(physicalFolders, cleanName);

  // 1. Xóa trong localStorage cache
  try {
    localStorage.removeItem(storageKey);
    localStorage.removeItem(`lopu_drive_file_content_name_${fileName}`);
  } catch {}

  // 2. Xóa trên Google Drive REST API
  try {
    if (token) {
      const folderId = await getOrCreateFolderPathOnDrive(token, physicalFolders);
      const fileId = await findFileInDriveFolder(token, folderId, fileName);
      if (fileId) {
        await deleteDriveFileEverywhere(fileId, fileName);
        console.log(`Đã xóa file nội dung chèn thêm PPT "${fileName}" trên Drive.`);
      }
    } else {
      await deleteDriveFileEverywhere('', fileName);
    }
  } catch (err) {
    console.warn('Lỗi khi xóa file pptExtra trên Drive:', err);
  }
}
