import React, { useState, useEffect } from 'react';
import { Header } from './Header';
import { SidebarDrawer } from './SidebarDrawer';
import { DynamicViewContainer, ViewId } from '../Navigation';
import { UserRole } from '../../../services/storageTypes';
import {
  connectGoogleDrive,
  disconnectGoogleDrive,
  subscribeDriveStatus,
  listAppFilesFromDrive,
  downloadFileJson,
  DriveStoredFile,
} from '../../ConnectData/ConnectDrive';
import { isFirebaseConfigured } from '../../../config/firebase';
import { Cloud, X, CheckCircle2, Download } from 'lucide-react';

interface AppLayoutProps {
  initialView?: ViewId;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  initialView = 'learning-classes',
}) => {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [activeView, setActiveView] = useState<ViewId>(initialView);
  const [currentRole, setCurrentRole] = useState<UserRole>('student');

  // Google Drive & Firestore connection state
  const [isDriveConnected, setIsDriveConnected] = useState<boolean>(false);
  const [driveEmail, setDriveEmail] = useState<string>('tanbaodl@gmail.com');
  const [showDriveModal, setShowDriveModal] = useState<boolean>(false);
  const [driveFiles, setDriveFiles] = useState<DriveStoredFile[]>([]);
  const [driveModalMessage, setDriveModalMessage] = useState<string | null>(null);

  useEffect(() => {
    // Subscribe to Google Drive connection changes
    const unsubscribe = subscribeDriveStatus((connected, email) => {
      setIsDriveConnected(connected);
      setDriveEmail(email);
    });

    async function loadFiles() {
      const files = await listAppFilesFromDrive();
      setDriveFiles(files);
    }
    loadFiles();

    return () => unsubscribe();
  }, []);

  const handleOpenDriveModal = async () => {
    const files = await listAppFilesFromDrive();
    setDriveFiles(files);
    setShowDriveModal(true);
  };

  const handleConnectDriveAction = async (forceSimulated = false) => {
    const res = await connectGoogleDrive(forceSimulated);
    setDriveModalMessage(res.message);
    const files = await listAppFilesFromDrive();
    setDriveFiles(files);
    setTimeout(() => setDriveModalMessage(null), 5000);
  };

  const handleDisconnectDriveAction = () => {
    disconnectGoogleDrive();
    setDriveModalMessage('Đã ngắt kết nối Google Drive.');
    setTimeout(() => setDriveModalMessage(null), 3000);
  };

  return (
    <div id="app-layout" className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* 1. Header with 3-line hamburger, brand, active view breadcrumbs and status indicators */}
      <Header
        onOpenSidebar={() => setSidebarOpen(true)}
        activeView={activeView}
        currentRole={currentRole}
        onChangeRole={setCurrentRole}
        isDriveConnected={isDriveConnected}
        driveEmail={driveEmail}
        isFirestoreLive={isFirebaseConfigured}
        onConnectDrive={handleOpenDriveModal}
        onSelectView={setActiveView}
      />

      {/* 2. Sidebar Drawer (Left edge slide-in, backdrop, 2-level accordion menu) */}
      <SidebarDrawer
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeView={activeView}
        onSelectView={viewId => setActiveView(viewId)}
        currentRole={currentRole}
        onChangeRole={setCurrentRole}
        isDriveConnected={isDriveConnected}
        driveEmail={driveEmail}
        isFirestoreLive={isFirebaseConfigured}
        onConnectDrive={handleOpenDriveModal}
      />

      {/* 3. Main Workspace / Dynamic View Container */}
      <main id="app-main-content" className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <DynamicViewContainer
          activeView={activeView}
          currentRole={currentRole}
          onOpenDriveConnect={handleOpenDriveModal}
          onNavigateToView={viewId => setActiveView(viewId)}
          driveEmail={driveEmail}
        />
      </main>

      {/* 4. Footer */}
      <footer id="app-footer" className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-medium">
            <span className="font-extrabold text-slate-900">LopU Modular</span>
            <span>•</span>
            <span>Kiến trúc phân chia theo 4 Phân hệ Role-Driven</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-600">
            <span>Firestore: {isFirebaseConfigured ? 'Live Cloud' : 'Offline Reactive'}</span>
            <span>•</span>
            <span>Google Drive: <code className="font-mono text-indigo-600">drive.file</code></span>
          </div>
        </div>
      </footer>

      {/* 5. Google Drive Integration Modal & File Manager */}
      {showDriveModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Cloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    Kết Nối & Quản Lý Google Drive (Scope: drive.file)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Chỉ truy cập và lưu trữ các tệp do ứng dụng LopU tạo ra
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDriveModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 font-bold text-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {driveModalMessage && (
              <div className="p-3 bg-blue-50 text-blue-800 border border-blue-200 rounded-xl text-xs font-semibold flex items-center gap-2 shrink-0">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>{driveModalMessage}</span>
              </div>
            )}

            {/* Connection Status Box */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4 shrink-0 text-xs">
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    Trạng thái kết nối Google Drive:
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        isDriveConnected ? 'bg-emerald-500' : 'bg-slate-400'
                      }`}
                    />
                    <span className="font-bold text-sm text-slate-800">
                      {isDriveConnected ? `Đã liên kết (${driveEmail})` : 'Chưa kết nối'}
                    </span>
                  </div>
                </div>

                {isDriveConnected && (
                  <button
                    onClick={handleDisconnectDriveAction}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors cursor-pointer"
                  >
                    Ngắt kết nối
                  </button>
                )}
              </div>

              {!isDriveConnected ? (
                <div className="space-y-3">
                  <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg text-[11px] leading-relaxed">
                    💡 <strong>Lưu ý về Popup Blocker:</strong> Trình duyệt của bạn có thể chặn cửa sổ đăng nhập Google khi chạy bên trong Iframe của AI Studio. Bạn có hai lựa chọn dưới đây để tiếp tục:
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {/* Option 1: Sandbox */}
                    <div className="p-3 border border-slate-200 bg-white rounded-xl flex flex-col justify-between space-y-2 hover:border-blue-200 transition-all">
                      <div>
                        <h4 className="font-bold text-slate-800 text-[12px]">Option A: Chế độ Sandbox (Khuyên dùng)</h4>
                        <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                          Chạy an toàn ngay trên bộ nhớ trình duyệt, <strong>không lo bị chặn Popup</strong> hay lỗi cấu hình Client ID. Thích hợp nhất trong môi trường AI Studio.
                        </p>
                      </div>
                      <button
                        onClick={() => handleConnectDriveAction(true)}
                        className="w-full text-center py-2 px-3 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                      >
                        Sử dụng Sandbox
                      </button>
                    </div>

                    {/* Option 2: Real Google Drive */}
                    <div className="p-3 border border-slate-200 bg-white rounded-xl flex flex-col justify-between space-y-2 hover:border-blue-200 transition-all">
                      <div>
                        <h4 className="font-bold text-slate-800 text-[12px]">Option B: Đăng nhập Google thật</h4>
                        <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                          Lưu trữ thực tế vào tài khoản Google Drive cá nhân của bạn. <strong>Lưu ý:</strong> Cần bấm cho phép mở Popup ở góc thanh địa chỉ trình duyệt nếu bị chặn.
                        </p>
                      </div>
                      <button
                        onClick={() => handleConnectDriveAction(false)}
                        className="w-full text-center py-2 px-3 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1"
                      >
                        <Cloud className="w-3.5 h-3.5" />
                        <span>Đăng nhập Google</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-[11px] text-slate-600 flex items-center justify-between bg-emerald-50/50 p-2 rounded-lg border border-emerald-100">
                  <span>Dữ liệu sơ đồ lớp học và tài liệu giảng dạy sẽ tự động lưu vào thư mục <code className="font-mono bg-emerald-100/60 px-1 py-0.5 rounded text-emerald-800 font-bold">myApp\LopU</code></span>
                </div>
              )}
            </div>

            {/* List of files created/stored in Google Drive by LopU */}
            <div className="flex-1 overflow-y-auto space-y-2 text-xs">
              <div className="flex items-center justify-between pb-1">
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                  Tệp Tin Đã Đồng Bộ Trên Google Drive ({driveFiles.length})
                </span>
                <span className="text-[11px] text-slate-400">Tự động sao lưu</span>
              </div>

              {driveFiles.length > 0 ? (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                  {driveFiles.map(file => (
                    <div
                      key={file.id}
                      className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-slate-800 truncate">{file.name}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span className="capitalize">{file.category.replace('_', ' ')}</span>
                          <span>•</span>
                          <span>{file.size}</span>
                          <span>•</span>
                          <span>{file.modifiedTime}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => downloadFileJson(file)}
                        title="Tải về máy tính"
                        className="p-2 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 transition-colors shrink-0 cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-slate-400 italic bg-slate-50 rounded-xl">
                  Chưa có tệp nào được lưu vào Drive. Sử dụng nút lưu Drive ở các màn hình Thời khóa biểu, Sơ đồ, Điểm danh để đồng bộ.
                </div>
              )}
            </div>

            <div className="pt-2 text-right shrink-0">
              <button
                onClick={() => setShowDriveModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
              >
                Đóng cửa sổ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
