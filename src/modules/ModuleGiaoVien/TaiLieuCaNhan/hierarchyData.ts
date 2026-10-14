import { TeacherDocument } from '../../../services/storageTypes';
import { auth } from '../../../config/firebase';

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

/**
 * Lấy Email của tài khoản người dùng đang đăng nhập để định danh bộ nhớ máy
 */
export function getActiveUserEmail(): string {
  try {
    if (auth && auth.currentUser && auth.currentUser.email) {
      return auth.currentUser.email.toLowerCase().trim();
    }
  } catch {}

  try {
    const authEmail = localStorage.getItem('lopu_auth_email');
    if (authEmail && authEmail.includes('@')) {
      return authEmail.toLowerCase().trim();
    }
    const driveEmail = localStorage.getItem('lopu_drive_email');
    if (driveEmail && driveEmail.includes('@')) {
      return driveEmail.toLowerCase().trim();
    }
    const profileRaw = localStorage.getItem('lopu_current_user_profile');
    if (profileRaw) {
      const p = JSON.parse(profileRaw);
      if (p.email && p.email.includes('@')) return p.email.toLowerCase().trim();
    }
  } catch {}

  return 'tanbaodl@gmail.com';
}

/**
 * Định danh tên dữ liệu tại máy (localStorage) theo đúng yêu cầu:
 * LopUTaiLieu-{Email tài khoản đăng nhập}
 */
export function getHierarchyStorageKey(overrideEmail?: string): string {
  const email = (overrideEmail || getActiveUserEmail()).toLowerCase().trim();
  return `LopUTaiLieu-${email}`;
}

export const HIERARCHY_STORAGE_KEY = getHierarchyStorageKey();
export const DELETED_FOLDERS_KEY = 'lopu_deleted_drive_folders_v1';

/**
 * Lấy số lớp từ chuỗi khối lớp (ví dụ: "Khối 10" -> "10", "11" -> "11")
 */
export function getGradeNumber(grade?: string | number): string {
  if (!grade) return '';
  const num = String(grade).replace(/\D+/g, '');
  return num || String(grade).trim();
}

/**
 * Chuẩn hóa Quy ước Đặt Tên Tài liệu Bắt buộc: {Môn học} {Số lớp} - {Tên tài liệu}
 * Ví dụ: Toán 10 - Đại Số 10, Lý 12 - Dao Động Cơ, Tin 10 - Lập Trình Python
 */
export function formatDocumentTitle(subject?: string, grade?: string | number, title?: string): string {
  const cleanSubject = (subject || '').trim().replace(/^(Môn\s+)/i, '') || 'Toán';
  const cleanGrade = getGradeNumber(grade) || '10';
  let cleanTitle = (title || '').trim();

  if (!cleanTitle) {
    cleanTitle = 'Tài liệu mới';
  }

  // Loại bỏ các tiền tố trùng lặp nếu người dùng đã gõ sẵn môn và lớp
  const prefixRegex = new RegExp(`^(${cleanSubject}|Toán Học|Toán|Vật Lý|Lý|Hóa Học|Hóa|Sinh Học|Sinh|Tin Học|Tin|Tiếng Anh|Anh|Ngữ Văn|Văn)?\\s*(${cleanGrade}|Khối\\s*${cleanGrade})?\\s*-\\s*`, 'i');
  cleanTitle = cleanTitle.replace(prefixRegex, '').trim();

  // Loại bỏ trường hợp người dùng gõ số lớp trước: ví dụ "10 - Đại số"
  cleanTitle = cleanTitle.replace(/^\d+\s*-\s*/, '').trim();

  return `${cleanSubject} ${cleanGrade} - ${cleanTitle}`;
}

/**
 * Kiểm tra Tên tài liệu (thư mục trực tiếp trong thư mục gốc) có khớp với Môn học và Khối lớp
 * Tuân theo quy ước bắt buộc: "{Môn học} {Số lớp} - {Tên tài liệu}"
 */
export function matchesSubjectAndGrade(title: string, subject?: string, grade?: string | number): boolean {
  if (!title) return false;
  const s = (subject || '').trim().replace(/^(Môn\s+)/i, '');
  const gNum = getGradeNumber(grade);
  if (!s && !gNum) return true;

  const lowerTitle = title.toLowerCase().replace(/[\u2010-\u2015]/g, '-').trim();
  const unaccentedTitle = lowerTitle
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd');

  // Tạo danh sách các biến thể tên môn (bao gồm cả có dấu, không dấu và các phân môn đặc thù)
  const getSubjVariants = (rawSubj: string): string[] => {
    const raw = rawSubj.toLowerCase().trim();
    if (!raw) return [];
    const set = new Set<string>([raw]);
    const rawUnaccent = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
    set.add(rawUnaccent);

    if (raw.includes('toán') || rawUnaccent.includes('toan')) {
      set.add('toán'); set.add('toán học'); set.add('toan'); set.add('toan hoc');
      set.add('đại số'); set.add('dai so'); set.add('hình học'); set.add('hinh hoc');
      set.add('giải tích'); set.add('giai tich');
    }
    if (raw.includes('lý') || raw.includes('lí') || rawUnaccent.includes('ly') || rawUnaccent.includes('li')) {
      set.add('lý'); set.add('vật lý'); set.add('vật lí'); set.add('ly'); set.add('vat ly'); set.add('vat li');
    }
    if (raw.includes('hóa') || rawUnaccent.includes('hoa')) {
      set.add('hóa'); set.add('hóa học'); set.add('hoa'); set.add('hoa hoc');
    }
    if (raw.includes('sinh') || rawUnaccent.includes('sinh')) {
      set.add('sinh'); set.add('sinh học'); set.add('sinh hoc');
    }
    if (raw.includes('tin') || rawUnaccent.includes('tin')) {
      set.add('tin'); set.add('tin học'); set.add('tin hoc');
    }
    if (raw.includes('anh') || rawUnaccent.includes('anh')) {
      set.add('anh'); set.add('tiếng anh'); set.add('tieng anh'); set.add('english');
    }
    if (raw.includes('văn') || rawUnaccent.includes('van')) {
      set.add('văn'); set.add('ngữ văn'); set.add('van'); set.add('ngu van');
    }
    return Array.from(set);
  };

  const variants = s ? getSubjVariants(s) : [];

  if (s && gNum) {
    for (const v of variants) {
      const vUnaccent = v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
      if (
        lowerTitle.startsWith(`${v} ${gNum} -`) ||
        lowerTitle.startsWith(`${v} ${gNum}-`) ||
        lowerTitle.startsWith(`${v}${gNum} -`) ||
        lowerTitle.startsWith(`${v} ${gNum}:`) ||
        unaccentedTitle.startsWith(`${vUnaccent} ${gNum} -`) ||
        unaccentedTitle.startsWith(`${vUnaccent} ${gNum}-`) ||
        unaccentedTitle.startsWith(`${vUnaccent}${gNum} -`) ||
        (lowerTitle.includes(v) && lowerTitle.includes(gNum)) ||
        (unaccentedTitle.includes(vUnaccent) && unaccentedTitle.includes(gNum))
      ) {
        return true;
      }
    }
    return false;
  }

  if (s) {
    for (const v of variants) {
      const vUnaccent = v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
      if (lowerTitle.includes(v) || unaccentedTitle.includes(vUnaccent)) return true;
    }
    return false;
  }

  if (gNum) {
    const reg = new RegExp(`(^|\\s|-)(${gNum}|khối\\s*${gNum})(\\s|-|$)`, 'i');
    return reg.test(lowerTitle) || lowerTitle.includes(` ${gNum} `) || lowerTitle.includes(` ${gNum}-`) || lowerTitle.includes(` ${gNum} -`) || unaccentedTitle.includes(gNum);
  }

  return true;
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

    const lower = cleanTitle.toLowerCase();
    if (
      lower.includes('tài liệu cơ bản') ||
      lower.includes('tai lieu co ban') ||
      lower.includes('tài liệu mới') ||
      lower.includes('tai lieu moi')
    ) {
      continue;
    }

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

export function getStoredHierarchy(validDocs?: TeacherDocument[], overrideEmail?: string): HierarchyStore {
  try {
    const key = getHierarchyStorageKey(overrideEmail);
    let raw = localStorage.getItem(key);

    // Tự động kế thừa và di chuyển dữ liệu cũ nếu khóa LopUTaiLieu-{Email} chưa có
    if (!raw) {
      const legacyRaw = localStorage.getItem('lopu_teaching_hierarchy_tree_v3');
      if (legacyRaw) {
        localStorage.setItem(key, legacyRaw);
        raw = legacyRaw;
      }
    }

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

export function saveStoredHierarchy(data: HierarchyStore, overrideEmail?: string): void {
  try {
    const key = getHierarchyStorageKey(overrideEmail);
    const sanitized = sanitizeHierarchyStore(data);
    localStorage.setItem(key, JSON.stringify(sanitized));
  } catch (e) {
    console.error('Failed to save hierarchy data:', e);
  }
}

/**
 * Xóa sạch hoàn toàn cache Cây phân cấp
 */
export function clearHierarchyCache(overrideEmail?: string): void {
  try {
    const key = getHierarchyStorageKey(overrideEmail);
    localStorage.removeItem(key);
    localStorage.removeItem('lopu_teaching_hierarchy_tree_v3');
  } catch {}
}
