import { TeacherDocument } from '../../../services/storageTypes';

export interface HierarchyStore {
  [documentTitle: string]: {
    [chuongName: string]: {
      [baiName: string]: {
        [vanDeName: string]: string[]; // danh sách Chuyên đề
      };
    };
  };
}

// Làm rỗng hoàn toàn dữ liệu demo các cấp độ theo yêu cầu
export const INITIAL_HIERARCHY_DATA: HierarchyStore = {};

export const HIERARCHY_STORAGE_KEY = 'lopu_teaching_hierarchy_tree_v3';
export const DELETED_FOLDERS_KEY = 'lopu_deleted_drive_folders_v1';

/**
 * Chuẩn hóa Quy ước Đặt Tên Tài liệu: {tên môn học} {Số lớp}-{tên tài liệu}
 * Ví dụ: Toán 10-T0CoBan
 */
export function formatDocumentTitle(subject?: string, grade?: string | number, title?: string): string {
  const cleanSubject = (subject || '').trim() || 'Toán';
  const cleanGrade = String(grade || '').replace(/\D+/g, '') || '10';
  let cleanTitle = (title || '').trim();

  if (!cleanTitle) {
    cleanTitle = 'TaiLieuMoi';
  }

  // Loại bỏ các tiền tố trùng lặp nếu người dùng đã gõ sẵn môn và lớp
  const prefixRegex = new RegExp(`^${cleanSubject}\\s*${cleanGrade}\\s*-\\s*`, 'i');
  cleanTitle = cleanTitle.replace(prefixRegex, '');

  return `${cleanSubject} ${cleanGrade}-${cleanTitle}`;
}

/**
 * Lấy danh sách các mục đã bị xóa
 */
export function getDeletedFoldersBlacklist(): string[] {
  try {
    const raw = localStorage.getItem(DELETED_FOLDERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch {}
  return [];
}

/**
 * Thêm một mục vào blacklist đã xóa
 */
export function addDeletedFolderToBlacklist(folderName: string): void {
  try {
    const list = getDeletedFoldersBlacklist();
    const clean = folderName.trim();
    if (clean && !list.includes(clean)) {
      list.push(clean);
      localStorage.setItem(DELETED_FOLDERS_KEY, JSON.stringify(list));
    }
  } catch {}
}

/**
 * Tái cấu trúc Cây phân cấp từ danh sách tài liệu Firestore thực tế
 */
export function buildHierarchyFromDocuments(documents: TeacherDocument[]): HierarchyStore {
  const deletedList = getDeletedFoldersBlacklist();
  const store: HierarchyStore = {};

  for (const doc of documents) {
    const title = (doc.title || '').trim();
    if (!title || deletedList.includes(title)) continue;

    if (!store[title]) {
      store[title] = {};
    }

    const chuong = (doc.chuong || '').trim();
    if (chuong && !deletedList.includes(chuong)) {
      if (!store[title][chuong]) {
        store[title][chuong] = {};
      }

      const bai = (doc.bai || '').trim();
      if (bai && !deletedList.includes(bai)) {
        if (!store[title][chuong][bai]) {
          store[title][chuong][bai] = {};
        }

        const vanDe = (doc.vanDe || '').trim();
        if (vanDe && !deletedList.includes(vanDe)) {
          if (!store[title][chuong][bai][vanDe]) {
            store[title][chuong][bai][vanDe] = [];
          }

          const chuyenDe = (doc.chuyenDe || '').trim();
          if (chuyenDe && !deletedList.includes(chuyenDe)) {
            if (!store[title][chuong][bai][vanDe].includes(chuyenDe)) {
              store[title][chuong][bai][vanDe].push(chuyenDe);
            }
          }
        }
      }
    }
  }

  return store;
}

/**
 * Làm sạch Cây phân cấp: loại bỏ các mục đã bị xóa hoặc rác
 */
export function sanitizeHierarchyStore(rawStore: any, validDocs?: TeacherDocument[]): HierarchyStore {
  const deletedList = getDeletedFoldersBlacklist();
  const cleaned: HierarchyStore = {};

  if (!rawStore || typeof rawStore !== 'object') {
    return cleaned;
  }

  // Nếu có danh sách documents chuẩn, chỉ giữ lại các title hợp lệ hoặc đã có cấu trúc chuẩn
  for (const [title, chuongs] of Object.entries(rawStore)) {
    const cleanTitle = title.trim();
    if (!cleanTitle || deletedList.includes(cleanTitle)) continue;

    // Nếu có danh sách validDocs và title không khớp doc nào và không có chuong con
    if (validDocs && validDocs.length > 0) {
      const matchDoc = validDocs.some(d => (d.title || '').trim() === cleanTitle);
      if (!matchDoc && (!chuongs || typeof chuongs !== 'object' || Object.keys(chuongs).length === 0)) {
        continue;
      }
    }

    cleaned[cleanTitle] = {};

    if (chuongs && typeof chuongs === 'object') {
      for (const [chuong, bais] of Object.entries(chuongs)) {
        const cleanChuong = chuong.trim();
        if (!cleanChuong || deletedList.includes(cleanChuong)) continue;

        cleaned[cleanTitle][cleanChuong] = {};

        if (bais && typeof bais === 'object') {
          for (const [bai, vanDes] of Object.entries(bais)) {
            const cleanBai = bai.trim();
            if (!cleanBai || deletedList.includes(cleanBai)) continue;

            cleaned[cleanTitle][cleanChuong][cleanBai] = {};

            if (vanDes && typeof vanDes === 'object') {
              for (const [vanDe, chuyenDes] of Object.entries(vanDes)) {
                const cleanVanDe = vanDe.trim();
                if (!cleanVanDe || deletedList.includes(cleanVanDe)) continue;

                const validChuyenDes: string[] = [];
                if (Array.isArray(chuyenDes)) {
                  for (const cd of chuyenDes) {
                    if (typeof cd === 'string') {
                      const cleanCd = cd.trim();
                      if (cleanCd && !deletedList.includes(cleanCd) && !validChuyenDes.includes(cleanCd)) {
                        validChuyenDes.push(cleanCd);
                      }
                    }
                  }
                }
                cleaned[cleanTitle][cleanChuong][cleanBai][cleanVanDe] = validChuyenDes;
              }
            }
          }
        }
      }
    }
  }

  return cleaned;
}

export function getStoredHierarchy(validDocs?: TeacherDocument[]): HierarchyStore {
  try {
    const raw = localStorage.getItem(HIERARCHY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return sanitizeHierarchyStore(parsed, validDocs);
      }
    }
  } catch (e) {
    console.error('Failed to load hierarchy data:', e);
  }
  return INITIAL_HIERARCHY_DATA;
}

export function saveStoredHierarchy(data: HierarchyStore): void {
  try {
    const sanitized = sanitizeHierarchyStore(data);
    localStorage.setItem(HIERARCHY_STORAGE_KEY, JSON.stringify(sanitized));
  } catch (e) {
    console.error('Failed to save hierarchy data:', e);
  }
}

/**
 * Xóa sạch hoàn toàn cache Cây phân cấp
 */
export function clearHierarchyCache(): void {
  try {
    localStorage.removeItem(HIERARCHY_STORAGE_KEY);
  } catch {}
}
