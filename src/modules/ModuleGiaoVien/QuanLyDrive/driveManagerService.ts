/**
 * Module Con: Quản Lý Drive (QuanLyDrive) - Thuộc ModuleGiaoVien
 * Đảm nhận các vai trò chính:
 * 1. Chuyển đổi qua lại giữa Đường Dẫn (file/folder) <-> FileID/FolderID
 * 2. Tạo folder/file mới theo đường dẫn (Kiểm tra từng cấp, tận dụng Hàm 1)
 * 3. Xóa folder/file theo đường dẫn (Thùng rác, kiểm tra trước khi xóa)
 * 4. Lấy cây thư mục/tệp tin lồng nhau (FolderID/FileID cấp con, cháu...) để tham chiếu.
 */

import { getDriveConnectionState, connectGoogleDrive } from '../../ConnectData/ConnectDrive/driveService';
export { getDriveConnectionState, connectGoogleDrive };
import { createDriveFolderIfNotExists, ensureValidDriveToken, removeVietnameseTones } from '../../ConnectData/ConnectDrive/googleDriveService';

export interface PathToIdResult {
  found: boolean;
  id: string | null;
  type: 'folder' | 'file' | 'not_found';
  mimeType?: string;
  name?: string;
  parentId?: string;
  fullPath: string;
  pathArray: string[];
}

export interface IdToPathResult {
  found: boolean;
  path: string;
  pathArray: string[];
  type: 'folder' | 'file';
  name: string;
  id: string;
  mimeType?: string;
}

export interface CreateByPathResult {
  success: boolean;
  id: string | null;
  path: string;
  status: 'created' | 'existed' | 'failed';
  mimeType?: string;
  message: string;
  createdFolders?: string[];
}

export interface DeleteByPathResult {
  success: boolean;
  status: 'deleted' | 'already_deleted_or_not_found' | 'failed';
  id?: string | null;
  path: string;
  message: string;
  error?: string;
}

export interface DriveTreeNode {
  id: string;
  name: string;
  type: 'folder' | 'file';
  mimeType: string;
  path: string;
  size?: string;
  modifiedTime?: string;
  children?: DriveTreeNode[];
}

export interface DriveTreeResult {
  success: boolean;
  rootFolderId: string | null;
  rootPath: string;
  tree: DriveTreeNode | null;
  message?: string;
}

// Lấy OAuth Token từ localStorage
export function getAccessToken(): string | null {
  return (
    localStorage.getItem('lopu_google_drive_token_v1') ||
    localStorage.getItem('lopu_gdrive_token')
  );
}

// Xử lý tự động khi Token Google Drive hết hạn (Lỗi 401 Unauthorized / Invalid Credentials)
export function handleDriveAuth401(): void {
  try {
    localStorage.removeItem('lopu_google_drive_token_v1');
    localStorage.removeItem('lopu_gdrive_token');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('lopu_drive_token_expired'));
    }
  } catch {}
}

// Chuẩn hóa input đường dẫn thành mảng các segment
export function parsePathInput(pathInput: string | string[]): string[] {
  if (Array.isArray(pathInput)) {
    return pathInput
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && s !== '/' && s !== '\\');
  }
  if (!pathInput || typeof pathInput !== 'string') return [];
  return pathInput
    .replace(/\\/g, '/')
    .split('/')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s !== 'Drive của tôi');
}

// BỘ NHỚ ĐỆM (CACHE) FOLDER ID TRUY CẬP SIÊU TỐC - LƯU TẠI MÁY (LOCALSTORAGE)
// Lưu ánh xạ đường dẫn (Path) ➔ FolderID / FileID để đồng bộ thư mục con nhanh gấp nhiều lần,
// không phải truy vấn dò tìm từng cấp tên thư mục mỗi khi người dùng chọn.
const DRIVE_FOLDER_ID_CACHE_KEY = 'lopu_drive_folder_id_cache_v2';

// In-memory cache đồng bộ để đọc tức thì không có độ trễ
let inMemoryFolderIdCache: Record<string, string> | null = null;

function getFolderIdMap(): Record<string, string> {
  if (inMemoryFolderIdCache) return inMemoryFolderIdCache;
  try {
    const raw = localStorage.getItem(DRIVE_FOLDER_ID_CACHE_KEY);
    if (raw) {
      inMemoryFolderIdCache = JSON.parse(raw);
      return inMemoryFolderIdCache || {};
    }
  } catch {}
  inMemoryFolderIdCache = {};
  return inMemoryFolderIdCache;
}

export function getCachedDriveFolderId(pathStr: string): string | null {
  if (!pathStr) return null;
  try {
    const map = getFolderIdMap();
    const cleanKey = pathStr.toLowerCase().trim().replace(/\\/g, '/');
    if (map[cleanKey]) return map[cleanKey];

    // Thử các biến thể đường dẫn (bỏ tiền tố myApp/LopU/ hoặc chỉ lấy phần sau TaiLieu)
    const withoutPrefix = cleanKey.replace(/^myapp\/lopu\//i, '');
    if (map[withoutPrefix]) return map[withoutPrefix];

    const withPrefix = `myapp/lopu/${withoutPrefix}`;
    if (map[withPrefix]) return map[withPrefix];
  } catch {}
  return null;
}

export function setCachedDriveFolderId(pathStr: string, id: string): void {
  if (!pathStr || !id) return;
  try {
    const map = getFolderIdMap();
    const cleanKey = pathStr.toLowerCase().trim().replace(/\\/g, '/');
    map[cleanKey] = id;

    // Lưu thêm biến thể không có tiền tố myApp/LopU/
    const withoutPrefix = cleanKey.replace(/^myapp\/lopu\//i, '');
    if (withoutPrefix !== cleanKey) {
      map[withoutPrefix] = id;
    }
    const withPrefix = `myapp/lopu/${withoutPrefix}`;
    map[withPrefix] = id;

    inMemoryFolderIdCache = map;
    localStorage.setItem(DRIVE_FOLDER_ID_CACHE_KEY, JSON.stringify(map));
  } catch {}
}

export function removeCachedDriveFolderId(pathStr: string): void {
  if (!pathStr) return;
  try {
    const map = getFolderIdMap();
    const cleanKey = pathStr.toLowerCase().trim().replace(/\\/g, '/');
    delete map[cleanKey];
    const withoutPrefix = cleanKey.replace(/^myapp\/lopu\//i, '');
    delete map[withoutPrefix];
    delete map[`myapp/lopu/${withoutPrefix}`];

    inMemoryFolderIdCache = map;
    localStorage.setItem(DRIVE_FOLDER_ID_CACHE_KEY, JSON.stringify(map));
  } catch {}
}

/**
 * HÀM 1A: Đường dẫn (path) -> FileID / FolderID
 * Kiểm tra tuần tự từng cấp thư mục/tệp từ root (có hỗ trợ cache ID siêu tốc)
 */
export async function resolvePathToDriveId(
  pathInput: string | string[],
  overrideToken?: string
): Promise<PathToIdResult> {
  const token = overrideToken || getAccessToken();
  const pathArray = parsePathInput(pathInput);
  const fullPath = pathArray.join('/');

  if (pathArray.length === 0) {
    return {
      found: true,
      id: 'root',
      type: 'folder',
      name: 'Drive của tôi',
      fullPath: 'root',
      pathArray: [],
    };
  }

  if (!token) {
    return {
      found: false,
      id: null,
      type: 'not_found',
      fullPath,
      pathArray,
    };
  }

  // 0. TỐI ƯU SIÊU TỐC BẰNG FOLDER ID CACHE:
  // Nếu đã nhớ FolderID của đường dẫn này, kiểm tra trực tiếp qua 1 request duy nhất
  const cachedId = getCachedDriveFolderId(fullPath);
  if (cachedId) {
    try {
      const chkRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${cachedId}?fields=id,name,mimeType,parents,trashed`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (chkRes.status === 401) {
        handleDriveAuth401();
        return {
          found: false,
          id: null,
          type: 'not_found',
          fullPath,
          pathArray,
        };
      }
      if (chkRes.ok) {
        const chkData = await chkRes.json();
        if (!chkData.trashed) {
          return {
            found: true,
            id: chkData.id,
            type: chkData.mimeType === 'application/vnd.google-apps.folder' ? 'folder' : 'file',
            mimeType: chkData.mimeType,
            name: chkData.name,
            parentId: chkData.parents?.[0],
            fullPath,
            pathArray,
          };
        }
      }
    } catch {}
    removeCachedDriveFolderId(fullPath);
  }

  // Helper để tìm chuỗi thư mục từ 1 parentId chỉ định
  const tryResolveFromParent = async (startParentId: string, segments: string[]): Promise<PathToIdResult | null> => {
    let currentParentId = startParentId;
    let currentMetadata: any = null;

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const partialPath = segments.slice(0, i + 1).join('/');

      // Kiểm tra cache cho từng cấp con
      const cachedPartial = getCachedDriveFolderId(partialPath);
      if (cachedPartial) {
        try {
          const chk = await fetch(
            `https://www.googleapis.com/drive/v3/files/${cachedPartial}?fields=id,name,mimeType,parents,trashed`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (chk.ok) {
            const chkMeta = await chk.json();
            if (!chkMeta.trashed) {
              currentMetadata = chkMeta;
              currentParentId = chkMeta.id;
              continue;
            }
          }
        } catch {}
      }

      try {
        const isTaiLieuVariant = segment.toLowerCase() === 'tailieu' || segment.toLowerCase() === 'taillieu';
        const nameFilter = isTaiLieuVariant
          ? `(name = 'TaiLieu' or name = 'TailLieu')`
          : `name = '${segment.replace(/'/g, "\\'")}'`;

        const query = `'${currentParentId}' in parents and ${nameFilter} and trashed = false`;
        const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,parents,trashed)&pageSize=10`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return null;
        const data = await res.json();
        let validFile = (data.files || []).find((f: any) => !f.trashed);
        if (!validFile) {
          // Fallback đối soát tất cả thư mục con của currentParentId có chuẩn hóa Unicode NFC/NFD
          const fallbackQuery = `'${currentParentId}' in parents and trashed = false`;
          const fbUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(fallbackQuery)}&fields=files(id,name,mimeType,parents,trashed)&pageSize=100`;
          const fbRes = await fetch(fbUrl, { headers: { Authorization: `Bearer ${token}` } });
          if (fbRes.ok) {
            const fbData = await fbRes.json();
            const segNorm = segment.normalize('NFC').trim().toLowerCase();
            const segSlug = removeVietnameseTones(segNorm).replace(/[^a-z0-9]/g, '');
            validFile = (fbData.files || []).find((f: any) => {
              if (f.trashed) return false;
              const fNameNorm = (f.name || '').normalize('NFC').trim().toLowerCase();
              if (fNameNorm === segNorm) return true;
              const fSlug = removeVietnameseTones(fNameNorm).replace(/[^a-z0-9]/g, '');
              if (segSlug && fSlug === segSlug) return true;
              if ((segNorm === 'tailieu' && fNameNorm === 'taillieu') || (segNorm === 'taillieu' && fNameNorm === 'tailieu')) {
                return true;
              }
              return false;
            });
          }
        }
        if (!validFile) return null;
        currentMetadata = validFile;
        currentParentId = currentMetadata.id;
        // Ghi nhớ ID của cấp này vào cache
        setCachedDriveFolderId(partialPath, currentMetadata.id);
      } catch {
        return null;
      }
    }

    if (!currentMetadata || currentMetadata.trashed) return null;
    return {
      found: true,
      id: currentMetadata.id,
      type: currentMetadata.mimeType === 'application/vnd.google-apps.folder' ? 'folder' : 'file',
      mimeType: currentMetadata.mimeType,
      name: currentMetadata.name,
      parentId: currentMetadata.parents?.[0],
      fullPath,
      pathArray,
    };
  };

  // 1. Giải mã đường dẫn chính xác từng cấp từ root (root -> myApp -> LopU -> TaiLieu -> ...)
  const res = await tryResolveFromParent('root', pathArray);
  if (res && res.found) {
    if (res.id) setCachedDriveFolderId(fullPath, res.id);
    return res;
  }

  // 2. Thử tìm từ thư mục TaiLieu / TailLieu nếu có trong đường dẫn
  const taiLieuIndex = pathArray.findIndex(p => p.toLowerCase() === 'tailieu' || p.toLowerCase() === 'taillieu');
  if (taiLieuIndex !== -1) {
    try {
      const qTaiLieu = `(name = 'TaiLieu' or name = 'TailLieu') and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
      const resTL = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(qTaiLieu)}&fields=files(id,name,mimeType,parents,trashed)&pageSize=5`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (resTL.ok) {
        const dataTL = await resTL.json();
        const validTL = (dataTL.files || []).find((f: any) => !f.trashed);
        if (validTL) {
          const remainingSegments = pathArray.slice(taiLieuIndex + 1);
          if (remainingSegments.length === 0) {
            setCachedDriveFolderId(fullPath, validTL.id);
            return {
              found: true,
              id: validTL.id,
              type: 'folder',
              mimeType: validTL.mimeType,
              name: validTL.name,
              parentId: validTL.parents?.[0],
              fullPath,
              pathArray,
            };
          }
          const subRes = await tryResolveFromParent(validTL.id, remainingSegments);
          if (subRes && subRes.found) {
            if (subRes.id) setCachedDriveFolderId(fullPath, subRes.id);
            return subRes;
          }
        }
      }
    } catch {}
  }

  // 3. Fallback: Tìm trực tiếp theo tên thư mục cuối cùng (leaf folder)
  const targetName = pathArray[pathArray.length - 1];
  if (targetName) {
    try {
      const qLeaf = `name = '${targetName.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
      const resLeaf = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(qLeaf)}&fields=files(id,name,mimeType,parents,trashed)&pageSize=5`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (resLeaf.ok) {
        const dataLeaf = await resLeaf.json();
        const validLeaf = (dataLeaf.files || []).find((f: any) => !f.trashed);
        if (validLeaf) {
          setCachedDriveFolderId(fullPath, validLeaf.id);
          return {
            found: true,
            id: validLeaf.id,
            type: 'folder',
            mimeType: validLeaf.mimeType,
            name: validLeaf.name,
            parentId: validLeaf.parents?.[0],
            fullPath,
            pathArray,
          };
        }
      }
    } catch {}
  }

  return {
    found: false,
    id: null,
    type: 'not_found',
    fullPath,
    pathArray,
  };
}

/**
 * HÀM 1B: FileID / FolderID -> Đường dẫn (path)
 * Truy ngược danh sách parents đến khi chạm root
 */
export async function resolveDriveIdToPath(
  id: string,
  overrideToken?: string
): Promise<IdToPathResult> {
  const token = overrideToken || getAccessToken();

  if (!id) {
    return {
      found: false,
      path: '',
      pathArray: [],
      type: 'folder',
      name: '',
      id: '',
    };
  }

  if (id === 'root') {
    return {
      found: true,
      path: 'Drive của tôi',
      pathArray: ['Drive của tôi'],
      type: 'folder',
      name: 'Drive của tôi',
      id: 'root',
    };
  }

  if (!token) {
    return {
      found: false,
      path: id,
      pathArray: [id],
      type: 'folder',
      name: id,
      id,
    };
  }

  const pathSegments: string[] = [];
  let currentId: string | undefined = id;
  let targetName = '';
  let targetType: 'folder' | 'file' = 'folder';
  let targetMime = '';

  try {
    let depth = 0;
    while (currentId && currentId !== 'root' && depth < 20) {
      const fetchUrl: string = `https://www.googleapis.com/drive/v3/files/${currentId}?fields=id,name,mimeType,parents`;
      const fetchRes: Response = await fetch(fetchUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!fetchRes.ok) {
        break;
      }

      const fileData: any = await fetchRes.json();
      if (depth === 0) {
        targetName = fileData.name;
        targetMime = fileData.mimeType;
        targetType =
          fileData.mimeType === 'application/vnd.google-apps.folder'
            ? 'folder'
            : 'file';
      }

      pathSegments.unshift(fileData.name);
      currentId = fileData.parents?.[0];
      depth++;
    }

    const fullPath = pathSegments.join('/');
    return {
      found: true,
      path: fullPath,
      pathArray: pathSegments,
      type: targetType,
      name: targetName,
      id,
      mimeType: targetMime,
    };
  } catch (err) {
    console.error(`Error resolving ID ${id} to path:`, err);
    return {
      found: false,
      path: id,
      pathArray: [id],
      type: 'folder',
      name: id,
      id,
    };
  }
}

/**
 * HÀM 2: Tạo Folder/File mới theo đường dẫn.
 * Tận dụng HÀM 1 (resolvePathToDriveId) để kiểm tra từng cấp.
 * Nếu đã có -> đi tiếp cấp sau. Chưa có -> Tạo folder/file mới.
 */
export async function createByPath(
  pathInput: string | string[],
  options?: {
    isFile?: boolean;
    fileContent?: string | Blob;
    mimeType?: string;
    overrideToken?: string;
  }
): Promise<CreateByPathResult> {
  const pathArray = parsePathInput(pathInput);
  const fullPath = pathArray.join('/');

  let token = options?.overrideToken || getAccessToken();
  if (!token) {
    token = await ensureValidDriveToken();
  }

  if (!token) {
    return {
      success: false,
      id: null,
      path: fullPath,
      status: 'failed',
      message: 'Chưa kết nối Google Drive hoặc phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
    };
  }

  // Tận dụng Hàm 1: Kiểm tra xem toàn bộ đường dẫn đã tồn tại trên Drive hay chưa
  const existingCheck = await resolvePathToDriveId(pathArray, token);
  if (existingCheck.found && existingCheck.id) {
    return {
      success: true,
      id: existingCheck.id,
      path: fullPath,
      status: 'existed',
      mimeType: existingCheck.mimeType,
      message: `Tệp/Thư mục "${fullPath}" đã tồn tại trên Google Drive.`,
    };
  }

  // Nếu chưa tồn tại toàn bộ -> Tiến hành duyệt từng cấp thư mục từ root
  const isTargetFile = options?.isFile || false;
  const folderSegments = isTargetFile ? pathArray.slice(0, -1) : pathArray;
  const fileName = isTargetFile ? pathArray[pathArray.length - 1] : null;

  let currentParentId = 'root';
  const createdFolders: string[] = [];

  // Duyệt tạo các thư mục cha
  for (let i = 0; i < folderSegments.length; i++) {
    const segment = folderSegments[i];
    const partialPath = folderSegments.slice(0, i + 1);

    // Dùng Hàm 1 kiểm tra cấp này đã có chưa
    const checkSegment = await resolvePathToDriveId(partialPath, token);

    if (checkSegment.found && checkSegment.id) {
      currentParentId = checkSegment.id;
    } else {
      // Chưa có -> Tạo thư mục mới tại cấp này dưới currentParentId
      try {
        const metadata: any = {
          name: segment,
          mimeType: 'application/vnd.google-apps.folder',
        };
        if (currentParentId && currentParentId !== 'root') {
          metadata.parents = [currentParentId];
        }

        const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(metadata),
        });

        if (!createRes.ok) {
          const errData = await createRes.json().catch(() => ({}));
          const is401 = createRes.status === 401 || errData.error?.code === 401 || String(errData.error?.message || '').toLowerCase().includes('authentication credential');
          if (is401) {
            handleDriveAuth401();
            return {
              success: false,
              id: null,
              path: fullPath,
              status: 'failed',
              message: 'Phiên kết nối Google Drive đã hết hạn hoặc chưa được cấp quyền (401). Vui lòng bấm nút "Kết nối Drive" để cấp lại quyền truy cập.',
            };
          }
          return {
            success: false,
            id: null,
            path: fullPath,
            status: 'failed',
            message: `Lỗi tạo thư mục "${segment}": ${errData.error?.message || createRes.statusText}`,
          };
        }

        const newFolder = await createRes.json();
        currentParentId = newFolder.id;
        setCachedDriveFolderId(partialPath.join('/'), newFolder.id);
        createdFolders.push(segment);
      } catch (err: any) {
        return {
          success: false,
          id: null,
          path: fullPath,
          status: 'failed',
          message: `Lỗi tạo thư mục "${segment}": ${err.message}`,
        };
      }
    }
  }

  // Nếu mục tiêu là tạo File trong thư mục đích
  if (isTargetFile && fileName) {
    // Tận dụng Hàm 1 kiểm tra file đã tồn tại trong thư mục đích chưa
    const checkFile = await resolvePathToDriveId(pathArray, token);
    if (checkFile.found && checkFile.id) {
      return {
        success: true,
        id: checkFile.id,
        path: fullPath,
        status: 'existed',
        mimeType: checkFile.mimeType,
        message: `File "${fileName}" đã tồn tại sẵn trong thư mục.`,
        createdFolders,
      };
    }

    // Nếu file chưa có -> Tạo file mới
    try {
      const mimeType = options?.mimeType || 'text/plain';
      const fileMetadata = {
        name: fileName,
        mimeType,
        parents: currentParentId !== 'root' ? [currentParentId] : undefined,
      };

      const content = options?.fileContent || `Tệp tài liệu: ${fileName}\nTạo tự động từ LopU App.`;
      const form = new FormData();
      form.append(
        'metadata',
        new Blob([JSON.stringify(fileMetadata)], { type: 'application/json' })
      );
      form.append(
        'file',
        typeof content === 'string' ? new Blob([content], { type: mimeType }) : content
      );

      const fileRes = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType',
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: form,
        }
      );

      if (!fileRes.ok) {
        const errData = await fileRes.json().catch(() => ({}));
        const is401 = fileRes.status === 401 || errData.error?.code === 401 || String(errData.error?.message || '').toLowerCase().includes('authentication credential');
        if (is401) {
          handleDriveAuth401();
          return {
            success: false,
            id: null,
            path: fullPath,
            status: 'failed',
            message: 'Phiên kết nối Google Drive đã hết hạn hoặc chưa được cấp quyền (401). Vui lòng bấm nút "Kết nối Drive" để cấp lại quyền truy cập.',
          };
        }
        return {
          success: false,
          id: null,
          path: fullPath,
          status: 'failed',
          message: `Lỗi tạo tệp "${fileName}": ${errData.error?.message || fileRes.statusText}`,
        };
      }

      const createdFile = await fileRes.json();
      return {
        success: true,
        id: createdFile.id,
        path: fullPath,
        status: 'created',
        mimeType: createdFile.mimeType,
        message: `Đã tạo thành công tệp mới "${fileName}" theo đường dẫn.`,
        createdFolders,
      };
    } catch (err: any) {
      return {
        success: false,
        id: null,
        path: fullPath,
        status: 'failed',
        message: `Lỗi tạo tệp "${fileName}": ${err.message}`,
      };
    }
  }

  setCachedDriveFolderId(fullPath, currentParentId);
  return {
    success: true,
    id: currentParentId,
    path: fullPath,
    status: createdFolders.length > 0 ? 'created' : 'existed',
    mimeType: 'application/vnd.google-apps.folder',
    message: createdFolders.length > 0
      ? `Đã tạo thành công thư mục mới theo đường dẫn: ${fullPath}`
      : `Thư mục "${fullPath}" đã sẵn có trên Google Drive.`,
    createdFolders,
  };
}

/**
 * HÀM 3: Xóa Folder/File theo đường dẫn.
 * Sử dụng HÀM 1 để kiểm tra trước:
 * - Nếu có -> Xóa (chuyển vào thùng rác trashed: true).
 * - Nếu không có hoặc đã xóa -> Báo thành công.
 * - Nếu có mà không xóa được -> Báo thất bại.
 */
export async function deleteByPath(
  pathInput: string | string[],
  overrideToken?: string
): Promise<DeleteByPathResult> {
  const token = overrideToken || getAccessToken();
  const pathArray = parsePathInput(pathInput);
  const fullPath = pathArray.join('/');

  if (pathArray.length === 0) {
    return {
      success: false,
      status: 'failed',
      path: '',
      message: 'Đường dẫn truyền vào không hợp lệ.',
    };
  }

  if (!token) {
    return {
      success: false,
      status: 'failed',
      path: fullPath,
      message: 'Chưa kết nối Google Drive. Vui lòng kết nối tài khoản.',
    };
  }

  // Bước 1: Dùng HÀM 1 (resolvePathToDriveId) kiểm tra xem thư mục/file có tồn tại không
  const check = await resolvePathToDriveId(pathArray, token);

  // Nếu không tìm thấy hoặc đã xóa trước đó -> Báo thành công theo quy tắc 3
  if (!check.found || !check.id) {
    removeCachedDriveFolderId(fullPath);
    return {
      success: true,
      status: 'already_deleted_or_not_found',
      path: fullPath,
      message: `Thư mục/Tệp tin "${fullPath}" không tồn tại hoặc đã được xóa trước đó.`,
    };
  }

  // Bước 2: Tồn tại -> Thực hiện xóa (chuyển vào thùng rác trashed = true)
  try {
    const url = `https://www.googleapis.com/drive/v3/files/${check.id}`;
    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ trashed: true }),
    });

    if (res.ok) {
      removeCachedDriveFolderId(fullPath);
      return {
        success: true,
        status: 'deleted',
        id: check.id,
        path: fullPath,
        message: `Đã xóa thành công "${fullPath}" (chuyển vào thùng rác Google Drive).`,
      };
    } else {
      const errData = await res.json().catch(() => ({}));
      const is401 = res.status === 401 || errData.error?.code === 401 || String(errData.error?.message || '').toLowerCase().includes('authentication credential');
      if (is401) {
        handleDriveAuth401();
        return {
          success: false,
          status: 'failed',
          id: check.id,
          path: fullPath,
          message: 'Phiên kết nối Google Drive đã hết hạn hoặc chưa được cấp quyền (401). Vui lòng bấm nút "Kết nối Drive" để cấp lại quyền truy cập.',
          error: 'UNAUTHENTICATED',
        };
      }
      return {
        success: false,
        status: 'failed',
        id: check.id,
        path: fullPath,
        message: `Google Drive từ chối lệnh xóa: ${errData.error?.message || res.statusText}`,
        error: errData.error?.message || res.statusText,
      };
    }
  } catch (err: any) {
    return {
      success: false,
      status: 'failed',
      id: check.id,
      path: fullPath,
      message: `Lỗi kết nối mạng khi thực hiện xóa: ${err.message}`,
      error: err.message,
    };
  }
}

/**
 * HÀM 4: Lấy cây FolderID cấp con/cháu... và FileID với tên thư mục và tên file tương ứng.
 * Làm công việc tham chiếu lồng nhau mỗi khi cung cấp 1 folder cụ thể (hoặc FolderID).
 */
export async function getNestedDriveTree(
  parentFolderPathOrId: string | string[],
  options?: { maxDepth?: number; overrideToken?: string }
): Promise<DriveTreeResult> {
  const token = options?.overrideToken || getAccessToken();
  const maxDepth = options?.maxDepth ?? 5;

  if (!token) {
    return {
      success: false,
      rootFolderId: null,
      rootPath: typeof parentFolderPathOrId === 'string' ? parentFolderPathOrId : parentFolderPathOrId.join('/'),
      tree: null,
      message: 'Chưa kết nối Google Drive.',
    };
  }

  // Tìm danh sách tất cả các folderId tiềm năng phù hợp với tên/đường dẫn
  const rootFolderIdsSet = new Set<string>();
  let rootPath = '';

  if (typeof parentFolderPathOrId === 'string' && (parentFolderPathOrId === 'root' || !parentFolderPathOrId.includes('/') || parentFolderPathOrId.startsWith('1'))) {
    rootFolderIdsSet.add(parentFolderPathOrId);
    try {
      const resolvedPath = await resolveDriveIdToPath(parentFolderPathOrId, token);
      rootPath = resolvedPath.path;
    } catch {
      rootPath = parentFolderPathOrId;
    }
  } else {
    const pathArray = parsePathInput(parentFolderPathOrId);
    rootPath = pathArray.join('/');
    const targetName = pathArray[pathArray.length - 1];

    // Kiểm tra cây thư mục theo đường dẫn
    if (pathArray.length > 0) {
      // 0. TẬN DỤNG FOLDER ID ĐÃ LƯU TẠI MÁY ĐỂ ĐỒNG BỘ SIÊU TỐC
      const cachedRootId = getCachedDriveFolderId(rootPath);
      if (cachedRootId) {
        rootFolderIdsSet.add(cachedRootId);
      }

      // 1. Giải mã bằng path chuẩn từ root nếu chưa có trong bộ nhớ máy
      if (rootFolderIdsSet.size === 0) {
        try {
          const check = await resolvePathToDriveId(pathArray, token);
          if (check.found && check.id) {
            rootFolderIdsSet.add(check.id);
            setCachedDriveFolderId(rootPath, check.id);
          }
        } catch (resolveErr) {
          console.warn('Lỗi phân giải đường dẫn cây Drive:', resolveErr);
        }
      }
    }
  }

  if (rootFolderIdsSet.size === 0) {
    return {
      success: false,
      rootFolderId: null,
      rootPath,
      tree: null,
      message: `Không tìm thấy thư mục gốc "${rootPath}" trên Google Drive.`,
    };
  }

  // Hàm đệ quy lấy cây con/cháu
  async function buildTree(
    folderId: string,
    folderName: string,
    currentPath: string,
    depth: number
  ): Promise<DriveTreeNode> {
    const node: DriveTreeNode = {
      id: folderId,
      name: folderName,
      type: 'folder',
      mimeType: 'application/vnd.google-apps.folder',
      path: currentPath,
      children: [],
    };

    if (depth >= maxDepth) return node;

    try {
      // Đảm bảo không quét nếu thư mục cha hoặc gốc đang nằm trong Thùng rác (trashed: true)
      if (depth === 0) {
        try {
          const checkParentRes = await fetch(
            `https://www.googleapis.com/drive/v3/files/${folderId}?fields=id,trashed`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (checkParentRes.ok) {
            const checkParentData = await checkParentRes.json();
            if (checkParentData.trashed) {
              console.warn(`Thư mục gốc ${folderName} (${folderId}) đang ở trong Thùng rác. Bỏ qua không quét.`);
              return node;
            }
          }
        } catch {}
      }

      const query = `'${folderId}' in parents and trashed = false`;
      const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
        query
      )}&orderBy=modifiedTime desc&fields=files(id,name,mimeType,size,modifiedTime,trashed)&pageSize=100`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        if (res.status === 401) handleDriveAuth401();
        return node;
      }

      const data = await res.json();
      const files: any[] = (data.files || []).filter((f: any) => !f.trashed);

      if (files.length > 1) {
        files.sort((a, b) => {
          const tA = a.modifiedTime ? new Date(a.modifiedTime).getTime() : 0;
          const tB = b.modifiedTime ? new Date(b.modifiedTime).getTime() : 0;
          return tB - tA;
        });
      }

      const childNodes = await Promise.all(
        files.map(async (item) => {
          const itemPath = `${currentPath}/${item.name}`;
          const isFolder = item.mimeType === 'application/vnd.google-apps.folder';

          if (isFolder) {
            setCachedDriveFolderId(itemPath, item.id);
            setCachedDriveFolderId(itemPath.replace(/^myApp\/LopU\//i, ''), item.id);
            setCachedDriveFolderId(item.name, item.id);
            return await buildTree(
              item.id,
              item.name,
              itemPath,
              depth + 1
            );
          } else {
            return {
              id: item.id,
              name: item.name,
              type: 'file' as const,
              mimeType: item.mimeType,
              path: itemPath,
              size: item.size ? `${(parseInt(item.size) / 1024).toFixed(1)} KB` : undefined,
              modifiedTime: item.modifiedTime,
            };
          }
        })
      );

      for (const cNode of childNodes) {
        if (cNode) {
          node.children?.push(cNode);
        }
      }
    } catch (err) {
      console.error(`Error building tree for folder ${folderId}:`, err);
    }

    return node;
  }

  const rootName = rootPath ? rootPath.split('/').pop() || 'Drive của tôi' : 'Drive của tôi';
  const mainTree: DriveTreeNode = {
    id: Array.from(rootFolderIdsSet)[0],
    name: rootName,
    type: 'folder',
    mimeType: 'application/vnd.google-apps.folder',
    path: rootPath || 'root',
    children: [],
  };

  const seenChildrenNames = new Set<string>();

  for (const fId of rootFolderIdsSet) {
    const subTree = await buildTree(fId, rootName, rootPath || 'root', 0);
    if (subTree && subTree.children) {
      for (const child of subTree.children) {
        if (!seenChildrenNames.has(child.name)) {
          seenChildrenNames.add(child.name);
          mainTree.children?.push(child);
        }
      }
    }
  }

  return {
    success: true,
    rootFolderId: mainTree.id,
    rootPath,
    tree: mainTree,
    message: 'Tải cây phân cấp tham chiếu Google Drive thành công.',
  };
}
