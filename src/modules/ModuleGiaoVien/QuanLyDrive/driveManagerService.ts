/**
 * Module Con: Quản Lý Drive (QuanLyDrive) - Thuộc ModuleGiaoVien
 * Đảm nhận các vai trò chính:
 * 1. Chuyển đổi qua lại giữa Đường Dẫn (file/folder) <-> FileID/FolderID
 * 2. Tạo folder/file mới theo đường dẫn (Kiểm tra từng cấp, tận dụng Hàm 1)
 * 3. Xóa folder/file theo đường dẫn (Thùng rác, kiểm tra trước khi xóa)
 * 4. Lấy cây thư mục/tệp tin lồng nhau (FolderID/FileID cấp con, cháu...) để tham chiếu.
 */

import { getDriveConnectionState } from '../../ConnectData/ConnectDrive/driveService';
import { createDriveFolderIfNotExists } from '../../ConnectData/ConnectDrive/googleDriveService';

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

/**
 * HÀM 1A: Đường dẫn (path) -> FileID / FolderID
 * Kiểm tra tuần tự từng cấp thư mục/tệp từ root
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

  // Helper để tìm chuỗi thư mục từ 1 parentId chỉ định
  const tryResolveFromParent = async (startParentId: string, segments: string[]): Promise<PathToIdResult | null> => {
    let currentParentId = startParentId;
    let currentMetadata: any = null;

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      try {
        const query = `'${currentParentId}' in parents and name = '${segment.replace(/'/g, "\\'")}' and trashed = false`;
        const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,parents)&pageSize=10`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return null;
        const data = await res.json();
        if (!data.files || data.files.length === 0) return null;
        currentMetadata = data.files[0];
        currentParentId = currentMetadata.id;
      } catch {
        return null;
      }
    }

    if (!currentMetadata) return null;
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

  // Chỉ giải mã đường dẫn chính xác từng cấp từ root (root -> myApp -> LopU -> TaiLieu)
  const res = await tryResolveFromParent('root', pathArray);
  if (res && res.found) return res;

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
  const token = options?.overrideToken || getAccessToken();
  const pathArray = parsePathInput(pathInput);
  const fullPath = pathArray.join('/');

  if (pathArray.length === 0) {
    return {
      success: false,
      id: null,
      path: '',
      status: 'failed',
      message: 'Đường dẫn đầu vào không hợp lệ.',
    };
  }

  if (!token) {
    return {
      success: false,
      id: null,
      path: fullPath,
      status: 'failed',
      message: 'Chưa kết nối Google Drive. Vui lòng bấm Kết nối Drive.',
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
      return {
        success: true,
        status: 'deleted',
        id: check.id,
        path: fullPath,
        message: `Đã xóa thành công "${fullPath}" (chuyển vào thùng rác Google Drive).`,
      };
    } else {
      const errData = await res.json().catch(() => ({}));
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

  if (typeof parentFolderPathOrId === 'string' && (parentFolderPathOrId === 'root' || parentFolderPathOrId.startsWith('1'))) {
    rootFolderIdsSet.add(parentFolderPathOrId);
    const resolvedPath = await resolveDriveIdToPath(parentFolderPathOrId, token);
    rootPath = resolvedPath.path;
  } else {
    const pathArray = parsePathInput(parentFolderPathOrId);
    rootPath = pathArray.join('/');
    const targetName = pathArray[pathArray.length - 1];

    // Tự động đảm bảo thư mục duy nhất myApp/LopU/TaiLieu được khởi tạo trên Google Drive
    if (pathArray.length > 0) {
      if (pathArray.join('/').includes('TaiLieu') || pathArray[0] === 'myApp') {
        try {
          await createDriveFolderIfNotExists(['myApp', 'LopU', 'TaiLieu']);
        } catch (err) {
          console.warn('Lỗi khi tự động khởi tạo thư mục mặc định myApp/LopU/TaiLieu:', err);
        }
      }

      // 1. Giải mã bằng path chuẩn từ root
      const check = await resolvePathToDriveId(pathArray, token);
      if (check.found && check.id) {
        rootFolderIdsSet.add(check.id);
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
      const query = `'${folderId}' in parents and trashed = false`;
      const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
        query
      )}&fields=files(id,name,mimeType,size,modifiedTime)&pageSize=100`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) return node;

      const data = await res.json();
      const files: any[] = data.files || [];

      for (const item of files) {
        const itemPath = `${currentPath}/${item.name}`;
        const isFolder = item.mimeType === 'application/vnd.google-apps.folder';

        if (isFolder) {
          const childFolderNode = await buildTree(
            item.id,
            item.name,
            itemPath,
            depth + 1
          );
          node.children?.push(childFolderNode);
        } else {
          node.children?.push({
            id: item.id,
            name: item.name,
            type: 'file',
            mimeType: item.mimeType,
            path: itemPath,
            size: item.size ? `${(parseInt(item.size) / 1024).toFixed(1)} KB` : undefined,
            modifiedTime: item.modifiedTime,
          });
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
