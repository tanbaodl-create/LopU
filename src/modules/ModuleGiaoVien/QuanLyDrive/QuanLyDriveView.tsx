import React, { useState, useEffect } from 'react';
import {
  FolderTree,
  ArrowRightLeft,
  FolderPlus,
  Trash2,
  Network,
  Cloud,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Copy,
  Check,
  ChevronRight,
  ChevronDown,
  FileText,
  Folder,
  RefreshCw,
  Search,
  ExternalLink,
  Plus,
} from 'lucide-react';
import {
  resolvePathToDriveId,
  resolveDriveIdToPath,
  createByPath,
  deleteByPath,
  getNestedDriveTree,
  PathToIdResult,
  IdToPathResult,
  CreateByPathResult,
  DeleteByPathResult,
  DriveTreeResult,
  DriveTreeNode,
} from './driveManagerService';
import {
  getDriveConnectionState,
  connectGoogleDrive,
  disconnectGoogleDrive,
} from '../../ConnectData/ConnectDrive/driveService';

export const QuanLyDriveView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'convert' | 'create' | 'delete' | 'tree'>('convert');
  const [driveConn, setDriveConn] = useState(getDriveConnectionState());
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Tab 1: Chuyển đổi Qua lại
  const [convertPathInput, setConvertPathInput] = useState<string>('myApp/LopU/TaiLieu/Toán 10-T0CoBan');
  const [convertIdInput, setConvertIdInput] = useState<string>('');
  const [pathToIdResult, setPathToIdResult] = useState<PathToIdResult | null>(null);
  const [idToPathResult, setIdToPathResult] = useState<IdToPathResult | null>(null);
  const [isConvertingPath, setIsConvertingPath] = useState<boolean>(false);
  const [isConvertingId, setIsConvertingId] = useState<boolean>(false);

  // Tab 2: Tạo Theo Đường Dẫn
  const [createPathInput, setCreatePathInput] = useState<string>('myApp/LopU/TaiLieu/Toán 10-T0CoBan/Bai1/GiaoAn.txt');
  const [isCreateFile, setIsCreateFile] = useState<boolean>(true);
  const [createFileContent, setCreateFileContent] = useState<string>('Giáo án bài 1 - Toán 10. Tạo tự động từ ứng dụng.');
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [createResult, setCreateResult] = useState<CreateByPathResult | null>(null);

  // Tab 3: Xóa Theo Đường Dẫn
  const [deletePathInput, setDeletePathInput] = useState<string>('myApp/LopU/TaiLieu/Toán 10-T0CoBan/Bai1/GiaoAn.txt');
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteResult, setDeleteResult] = useState<DeleteByPathResult | null>(null);

  // Tab 4: Cây Thư Mục Lồng Nhau
  const [treeParentInput, setTreeParentInput] = useState<string>('myApp/LopU/TaiLieu');
  const [treeResult, setTreeResult] = useState<DriveTreeResult | null>(null);
  const [isLoadingTree, setIsLoadingTree] = useState<boolean>(false);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const conn = getDriveConnectionState();
    setDriveConn(conn);
  }, []);

  const handleConnectDrive = async () => {
    const res = await connectGoogleDrive();
    setDriveConn(getDriveConnectionState());
  };

  const handleDisconnectDrive = () => {
    disconnectGoogleDrive();
    setDriveConn(getDriveConnectionState());
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // 1. Thực thi Chuyển đổi Đường dẫn -> ID
  const handleResolvePathToId = async () => {
    if (!convertPathInput.trim()) return;
    setIsConvertingPath(true);
    setPathToIdResult(null);
    const res = await resolvePathToDriveId(convertPathInput.trim());
    setPathToIdResult(res);
    setIsConvertingPath(false);
  };

  // 1. Thực thi Chuyển đổi ID -> Đường dẫn
  const handleResolveIdToPath = async () => {
    if (!convertIdInput.trim()) return;
    setIsConvertingId(true);
    setIdToPathResult(null);
    const res = await resolveDriveIdToPath(convertIdInput.trim());
    setIdToPathResult(res);
    setIsConvertingId(false);
  };

  // 2. Thực thi Tạo folder/file mới
  const handleCreateByPath = async () => {
    if (!createPathInput.trim()) return;
    setIsCreating(true);
    setCreateResult(null);
    const res = await createByPath(createPathInput.trim(), {
      isFile: isCreateFile,
      fileContent: createFileContent,
    });
    setCreateResult(res);
    setIsCreating(false);
  };

  // 3. Thực thi Xóa folder/file
  const handleDeleteByPath = async () => {
    if (!deletePathInput.trim()) return;
    setIsDeleting(true);
    setDeleteResult(null);
    const res = await deleteByPath(deletePathInput.trim());
    setDeleteResult(res);
    setIsDeleting(false);
  };

  // 4. Thực thi Lấy Cây Phân Cấp Lồng Nhau
  const handleLoadTree = async () => {
    if (!treeParentInput.trim()) return;
    setIsLoadingTree(true);
    setTreeResult(null);
    const res = await getNestedDriveTree(treeParentInput.trim());
    setTreeResult(res);
    setIsLoadingTree(false);
    if (res.tree?.id) {
      setExpandedNodes({ [res.tree.id]: true });
    }
  };

  const toggleNodeExpand = (id: string) => {
    setExpandedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Component hiển thị cây đệ quy
  const renderTreeNode = (node: DriveTreeNode, depth = 0) => {
    const isFolder = node.type === 'folder';
    const isExpanded = expandedNodes[node.id] ?? depth < 2;

    return (
      <div key={node.id} className="select-none text-xs">
        <div
          className={`flex items-center justify-between py-1.5 px-2.5 rounded-lg hover:bg-slate-100 transition-colors my-0.5 border ${
            isFolder ? 'bg-amber-50/40 border-amber-200/60' : 'bg-slate-50 border-slate-200/60'
          }`}
          style={{ marginLeft: `${depth * 18}px` }}
        >
          <div className="flex items-center gap-2 overflow-hidden flex-1 mr-2">
            {isFolder ? (
              <button
                type="button"
                onClick={() => toggleNodeExpand(node.id)}
                className="p-0.5 text-amber-700 hover:text-amber-900 rounded cursor-pointer"
              >
                {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            ) : (
              <span className="w-3.5 inline-block" />
            )}

            {isFolder ? (
              <Folder className="w-4 h-4 text-amber-500 shrink-0" />
            ) : (
              <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
            )}

            <span className="font-semibold text-slate-800 truncate">{node.name}</span>

            {node.size && (
              <span className="text-[10px] text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                {node.size}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] font-mono bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded truncate max-w-[120px]">
              ID: {node.id}
            </span>
            <button
              type="button"
              onClick={() => copyToClipboard(node.id)}
              title="Sao chép ID"
              className="p-1 hover:bg-slate-200 text-slate-600 rounded transition-colors cursor-pointer"
            >
              {copiedText === node.id ? (
                <Check className="w-3 h-3 text-emerald-600" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </button>
          </div>
        </div>

        {isFolder && isExpanded && node.children && node.children.length > 0 && (
          <div className="space-y-0.5">
            {node.children.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        )}

        {isFolder && isExpanded && (!node.children || node.children.length === 0) && (
          <div
            className="text-[11px] text-slate-400 italic py-1 px-3"
            style={{ marginLeft: `${(depth + 1) * 18}px` }}
          >
            (Thư mục rỗng)
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Banner tiêu đề Module Con */}
        <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-blue-600 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 bg-indigo-500/30 backdrop-blur-md border border-indigo-300/30 text-indigo-100 text-xs font-bold px-3 py-1 rounded-full">
              <Network className="w-3.5 h-3.5" />
              <span>Module Con: QuanLyDrive / ModuleGiaoVien</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <FolderTree className="w-7 h-7 text-indigo-200" />
              <span>Quản Lý Đường Dẫn & Tệp Tin Google Drive</span>
            </h1>
            <p className="text-indigo-100/90 text-xs max-w-2xl leading-relaxed">
              Phân hệ chuyển đổi giữa Đường dẫn (Path) và ID, tự động kiểm tra tạo mới, xóa bỏ theo đường dẫn và lấy cây thư mục tham chiếu lồng nhau.
            </p>
          </div>

          {/* Trạng thái kết nối Drive */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 text-xs space-y-2 shrink-0 min-w-[240px]">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-bold">
                <Cloud className={`w-4 h-4 ${driveConn.isConnected ? 'text-emerald-300' : 'text-amber-300'}`} />
                <span>Google Drive</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                driveConn.isConnected ? 'bg-emerald-500/30 text-emerald-100' : 'bg-amber-500/30 text-amber-100'
              }`}>
                {driveConn.isConnected ? 'Đã kết nối' : 'Chưa kết nối'}
              </span>
            </div>

            {driveConn.isConnected ? (
              <div className="space-y-2">
                <p className="text-[11px] text-indigo-100 truncate">
                  Tài khoản: <strong>{driveConn.email}</strong>
                </p>
                <button
                  type="button"
                  onClick={handleDisconnectDrive}
                  className="w-full py-1.5 px-3 bg-red-500/80 hover:bg-red-600 text-white rounded-xl font-semibold transition-all text-[11px] cursor-pointer"
                >
                  Ngắt kết nối
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleConnectDrive}
                className="w-full py-2 px-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition-all text-xs cursor-pointer shadow-sm"
              >
                Kết nối Google Drive
              </button>
            )}
          </div>
        </div>

        {/* Thẻ Tab điều hướng 4 vai trò chính */}
        <div className="flex items-center gap-2 bg-white p-2 rounded-2xl shadow-sm border border-slate-200 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('convert')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'convert'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>1. Chuyển đổi Path ⇆ ID</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'create'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FolderPlus className="w-4 h-4" />
            <span>2. Tạo theo Đường dẫn</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('delete')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'delete'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            <span>3. Xóa theo Đường dẫn</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tree')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'tree'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FolderTree className="w-4 h-4" />
            <span>4. Cây Phân Cấp Lồng Nhau</span>
          </button>
        </div>

        {/* Nội dung Tab 1: Chuyển đổi Qua lại Đường dẫn ⇆ ID */}
        {activeTab === 'convert' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Chiều 1: Đường dẫn -> FileID/FolderID */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700">
                    <ArrowRightLeft className="w-4 h-4" />
                  </span>
                  <span>Chiều A: Đường Dẫn ➔ FileID / FolderID</span>
                </h3>
                <p className="text-slate-500 text-xs mt-1">
                  Nhập đường dẫn tương đối (ví dụ: <code>myApp/LopU/TaiLieu/Toán 10-T0CoBan</code>) để tra ID.
                </p>
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-700">Nhập đường dẫn (Path):</label>
                <input
                  type="text"
                  value={convertPathInput}
                  onChange={(e) => setConvertPathInput(e.target.value)}
                  placeholder="e.g. myApp/LopU/TaiLieu/Toán 10-T0CoBan"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                />

                <button
                  type="button"
                  onClick={handleResolvePathToId}
                  disabled={isConvertingPath}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isConvertingPath ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang tra cứu trên Drive...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      <span>Tra Cứu FileID / FolderID</span>
                    </>
                  )}
                </button>
              </div>

              {pathToIdResult && (
                <div className={`p-4 rounded-xl border text-xs space-y-2 ${
                  pathToIdResult.found ? 'bg-emerald-50/70 border-emerald-200' : 'bg-amber-50/70 border-amber-200'
                }`}>
                  <div className="flex items-center justify-between font-bold">
                    <span className={pathToIdResult.found ? 'text-emerald-800' : 'text-amber-800'}>
                      {pathToIdResult.found ? '✅ Đã tìm thấy trên Google Drive' : '⚠️ Không tìm thấy trên Google Drive'}
                    </span>
                    <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-600">
                      Loại: {pathToIdResult.type}
                    </span>
                  </div>

                  {pathToIdResult.found && pathToIdResult.id && (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-slate-200">
                        <span className="text-slate-500 font-semibold">ID:</span>
                        <div className="flex items-center gap-1.5">
                          <code className="font-mono font-bold text-indigo-700">{pathToIdResult.id}</code>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(pathToIdResult.id!)}
                            className="p-1 hover:bg-slate-100 rounded text-slate-600 cursor-pointer"
                          >
                            {copiedText === pathToIdResult.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {pathToIdResult.name && (
                        <p className="text-slate-600">
                          Tên mục: <strong className="text-slate-900">{pathToIdResult.name}</strong>
                        </p>
                      )}
                      {pathToIdResult.mimeType && (
                        <p className="text-slate-500 text-[11px]">
                          MimeType: <code>{pathToIdResult.mimeType}</code>
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Chiều 2: FileID/FolderID -> Đường dẫn */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
                    <ArrowRightLeft className="w-4 h-4" />
                  </span>
                  <span>Chiều B: FileID / FolderID ➔ Đường Dẫn</span>
                </h3>
                <p className="text-slate-500 text-xs mt-1">
                  Nhập FileID hoặc FolderID cụ thể từ Google Drive để truy ra đường dẫn phân cấp.
                </p>
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-700">Nhập FileID / FolderID:</label>
                <input
                  type="text"
                  value={convertIdInput}
                  onChange={(e) => setConvertIdInput(e.target.value)}
                  placeholder="e.g. 1A2b3C4d5E..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                />

                <button
                  type="button"
                  onClick={handleResolveIdToPath}
                  disabled={isConvertingId}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isConvertingId ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang truy ngược đường dẫn...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      <span>Truy Ngược Đường Dẫn</span>
                    </>
                  )}
                </button>
              </div>

              {idToPathResult && (
                <div className={`p-4 rounded-xl border text-xs space-y-2 ${
                  idToPathResult.found ? 'bg-emerald-50/70 border-emerald-200' : 'bg-rose-50/70 border-rose-200'
                }`}>
                  <div className="flex items-center justify-between font-bold">
                    <span className={idToPathResult.found ? 'text-emerald-800' : 'text-rose-800'}>
                      {idToPathResult.found ? '✅ Tìm thấy phân cấp đường dẫn' : '❌ Lỗi hoặc không tồn tại'}
                    </span>
                    <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-600">
                      Loại: {idToPathResult.type}
                    </span>
                  </div>

                  {idToPathResult.found && (
                    <div className="space-y-2 pt-1">
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1">
                        <span className="text-slate-500 font-semibold block text-[11px]">Đường dẫn hoàn chỉnh:</span>
                        <code className="font-mono font-bold text-blue-700 block text-xs break-all">
                          {idToPathResult.path}
                        </code>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {idToPathResult.pathArray.map((seg, idx) => (
                          <span key={idx} className="bg-slate-200 text-slate-800 text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <span>{seg}</span>
                            {idx < idToPathResult.pathArray.length - 1 && <ChevronRight className="w-3 h-3 text-slate-400" />}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Nội dung Tab 2: Tạo Theo Đường Dẫn */}
        {activeTab === 'create' && (
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                  <FolderPlus className="w-4 h-4" />
                </span>
                <span>Tạo Thư Mục / Tệp Tin Theo Đường Dẫn</span>
              </h3>
              <p className="text-slate-500 text-xs mt-1">
                Tự động kiểm tra từng cấp thư mục (dùng Hàm 1). Nếu đã tồn tại thì đi tiếp; nếu chưa có thì tạo mới.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-700">Đường dẫn đầy đủ:</label>
                <input
                  type="text"
                  value={createPathInput}
                  onChange={(e) => setCreatePathInput(e.target.value)}
                  placeholder="e.g. myApp/LopU/TaiLieu/Toán 10-T0CoBan/Bai1/GiaoAn.txt"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
                />

                <div className="flex items-center gap-4 pt-1">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      checked={!isCreateFile}
                      onChange={() => setIsCreateFile(false)}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Tạo Thư Mục (Folder)</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      checked={isCreateFile}
                      onChange={() => setIsCreateFile(true)}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Tạo Tệp Tin (File)</span>
                  </label>
                </div>
              </div>

              {isCreateFile && (
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700">Nội dung tệp thử nghiệm:</label>
                  <textarea
                    rows={3}
                    value={createFileContent}
                    onChange={(e) => setCreateFileContent(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleCreateByPath}
              disabled={isCreating}
              className="py-3 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang duyệt kiểm tra và tạo trên Drive...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Thực Hiện Tạo Theo Đường Dẫn</span>
                </>
              )}
            </button>

            {createResult && (
              <div className={`p-4 rounded-xl border text-xs space-y-2 ${
                createResult.success ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'
              }`}>
                <div className="flex items-center justify-between font-bold">
                  <span className={createResult.success ? 'text-emerald-800' : 'text-rose-800'}>
                    {createResult.message}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                    createResult.status === 'created'
                      ? 'bg-emerald-200 text-emerald-900'
                      : createResult.status === 'existed'
                      ? 'bg-amber-200 text-amber-900'
                      : 'bg-rose-200 text-rose-900'
                  }`}>
                    Trạng thái: {createResult.status}
                  </span>
                </div>

                {createResult.id && (
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 flex items-center justify-between">
                    <span className="text-slate-500">ID kết quả:</span>
                    <code className="font-mono font-bold text-emerald-700">{createResult.id}</code>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Nội dung Tab 3: Xóa Theo Đường Dẫn */}
        {activeTab === 'delete' && (
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 text-rose-700">
                <span className="p-1.5 rounded-lg bg-rose-100 text-rose-700">
                  <Trash2 className="w-4 h-4" />
                </span>
                <span>Xóa Thư Mục / Tệp Tin Theo Đường Dẫn</span>
              </h3>
              <p className="text-slate-500 text-xs mt-1">
                Sử dụng Hàm 1 để kiểm tra trước. Nếu tồn tại sẽ tiến hành xóa (chuyển thùng rác); nếu không có hoặc đã xóa trước đó sẽ báo thành công.
              </p>
            </div>

            <div className="space-y-3 max-w-2xl">
              <label className="block text-xs font-bold text-slate-700">Đường dẫn cần xóa:</label>
              <input
                type="text"
                value={deletePathInput}
                onChange={(e) => setDeletePathInput(e.target.value)}
                placeholder="e.g. myApp/LopU/TaiLieu/Toán 10-T0CoBan/Bai1/GiaoAn.txt"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-rose-500 outline-none"
              />

              <button
                type="button"
                onClick={handleDeleteByPath}
                disabled={isDeleting}
                className="py-2.5 px-5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang kiểm tra và xóa trên Drive...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Xóa Theo Đường Dẫn (Thùng rác)</span>
                  </>
                )}
              </button>
            </div>

            {deleteResult && (
              <div className={`p-4 rounded-xl border text-xs space-y-2 ${
                deleteResult.success ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'
              }`}>
                <div className="flex items-center justify-between font-bold">
                  <span className={deleteResult.success ? 'text-emerald-800' : 'text-rose-800'}>
                    {deleteResult.message}
                  </span>
                  <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-700">
                    Trạng thái: {deleteResult.status}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Nội dung Tab 4: Cây Phân Cấp Lồng Nhau */}
        {activeTab === 'tree' && (
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
            <div className="border-b border-slate-100 pb-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700">
                    <FolderTree className="w-4 h-4" />
                  </span>
                  <span>Cây Phân Cấp Thư Mục & Tệp Tin Lồng Nhau (Reference Tree)</span>
                </h3>
                <p className="text-slate-500 text-xs mt-1">
                  Lấy toàn bộ FolderID và FileID các cấp con/cháu để làm dữ liệu tham chiếu lồng nhau.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={treeParentInput}
                  onChange={(e) => setTreeParentInput(e.target.value)}
                  placeholder="e.g. myApp/LopU/TaiLieu"
                  className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-mono outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleLoadTree}
                  disabled={isLoadingTree}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
                >
                  {isLoadingTree ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  <span>Tải Cây</span>
                </button>
              </div>
            </div>

            {treeResult && treeResult.tree ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span>Thư mục gốc: <strong className="text-slate-900">{treeResult.rootPath}</strong></span>
                  <span>Root ID: <code className="font-mono font-bold text-indigo-700">{treeResult.rootFolderId}</code></span>
                </div>

                <div className="p-4 bg-slate-900/5 rounded-2xl border border-slate-200/80 max-h-[500px] overflow-y-auto">
                  {renderTreeNode(treeResult.tree)}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                <FolderTree className="w-8 h-8 mx-auto text-slate-300" />
                <p>Bấm "Tải Cây" để quét toàn bộ thư mục & tệp tin lồng nhau từ Google Drive.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
