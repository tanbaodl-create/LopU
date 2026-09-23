import React, { useState, useEffect } from 'react';
import { Header } from './Header';
import { SidebarDrawer } from './SidebarDrawer';
import { DynamicViewContainer, ViewId } from '../Navigation';
import { UserRole, UserProfile } from '../../../services/storageTypes';
import { auth, isFirebaseConfigured } from '../../../config/firebase';
import { onAuthStateChanged, signOut, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { syncGoogleAuthUserToFirestore, getUsers } from '../../ConnectData/ConnectFirestore';
import {
  connectGoogleDrive,
  disconnectGoogleDrive,
  subscribeDriveStatus,
  listAppFilesFromDrive,
  downloadFileJson,
  DriveStoredFile,
} from '../../ConnectData/ConnectDrive';
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
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);

  // Real Google Auth states
  const [firebaseUser, setFirebaseUser] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Google Drive & Firestore connection state
  const [isDriveConnected, setIsDriveConnected] = useState<boolean>(false);
  const [driveEmail, setDriveEmail] = useState<string>('tanbaodl@gmail.com');
  const [showDriveModal, setShowDriveModal] = useState<boolean>(false);
  const [driveFiles, setDriveFiles] = useState<DriveStoredFile[]>([]);
  const [driveModalMessage, setDriveModalMessage] = useState<string | null>(null);

  // Subscribe to real Google Auth state changed
  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setIsAuthLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          const emailLower = (user.email || '').toLowerCase();
          const isSA = emailLower === 'tanbaodl@gmail.com' || emailLower === 'tanbaobg@gmail.com';
          const desiredRole: UserRole = isSA
            ? 'superadmin'
            : (emailLower.includes('admin')
              ? 'admin'
              : (emailLower.includes('teacher')
                ? 'teacher'
                : 'student'));
          
          const profile = await syncGoogleAuthUserToFirestore({
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || (isSA ? (emailLower.includes('dl') ? 'Superadmin Tân Bảo (ĐL)' : 'Superadmin Tân Bảo (BG)') : undefined),
            desiredRole: desiredRole,
          });
          const finalProfile = isSA ? { ...profile, role: 'superadmin' as UserRole, isProtected: true } : profile;
          setCurrentUserProfile(finalProfile);
          setCurrentRole(finalProfile.role);
          setDriveEmail(user.email || '');
        } catch (err) {
          console.warn('Failed to sync authenticated Google user to Firestore:', err);
        }
      } else {
        setFirebaseUser(null);
      }
      setIsAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Fetch / Sync profile depending on current role or authenticated state
  useEffect(() => {
    async function fetchProfile() {
      if (firebaseUser) {
        try {
          const users = await getUsers();
          const emailLower = (firebaseUser.email || '').toLowerCase();
          const isSA = emailLower === 'tanbaodl@gmail.com' || emailLower === 'tanbaobg@gmail.com';
          const found = users.find(u => 
            u.id === firebaseUser.uid || 
            (emailLower && (u.email || '').toLowerCase() === emailLower)
          );
          if (found) {
            const finalFound = isSA ? { ...found, role: 'superadmin' as UserRole, isProtected: true } : found;
            setCurrentUserProfile(finalFound);
            // Không ghi đè currentRole ở đây để giữ nguyên vai trò người dùng vừa chuyển đổi từ dropdown
          }
        } catch (err) {
          console.warn('Failed to fetch real profile:', err);
        }
        return;
      }

      // Revert to mock profiles when offline or not logged in
      try {
        const users = await getUsers();
        let userId = 'u_hs01'; // Mặc định học sinh Lê Minh Khang
        if (currentRole === 'superadmin') userId = 'u_superadmin_2'; // Superadmin Tân Bảo (ĐL)
        else if (currentRole === 'admin') userId = 'u_admin';
        else if (currentRole === 'teacher') userId = 'u_gv01'; // Mặc định giáo viên Nguyễn Văn An
        
        const found = users.find(u => u.id === userId);
        if (found) {
          setCurrentUserProfile(found);
        }
      } catch (err) {
        console.warn('Failed to fetch profile in layout:', err);
      }
    }
    fetchProfile();

    const handleRefresh = () => {
      fetchProfile();
    };
    window.addEventListener('lopu_wallet_refresh', handleRefresh);

    return () => {
      window.removeEventListener('lopu_wallet_refresh', handleRefresh);
    };
  }, [currentRole, firebaseUser]);

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

  const handleConnectDriveAction = async () => {
    const res = await connectGoogleDrive();
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

  const handleChangeRole = async (newRole: UserRole) => {
    setCurrentRole(newRole);
    if (firebaseUser && currentUserProfile) {
      try {
        const updatedProfile = {
          ...currentUserProfile,
          role: newRole,
          updatedAt: new Date().toLocaleString('vi-VN'),
        };
        setCurrentUserProfile(updatedProfile);
        await syncGoogleAuthUserToFirestore({
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          desiredRole: newRole,
          displayName: firebaseUser.displayName || undefined,
        });
      } catch (err) {
        console.warn('Failed to update real user role in backend:', err);
      }
    }
  };

  const handleSignInGoogle = async () => {
    setAuthError(null);
    if (auth && isFirebaseConfigured) {
      try {
        const provider = new GoogleAuthProvider();
        provider.addScope('https://www.googleapis.com/auth/drive.file');
        provider.addScope('https://www.googleapis.com/auth/drive');
        await signInWithPopup(auth, provider);
      } catch (err: any) {
        console.error('Failed to sign in with Google:', err);
        const errMsg = err?.message || String(err);
        const errCode = err?.code || '';
        if (errCode === 'auth/unauthorized-domain' || errMsg.includes('auth/unauthorized-domain') || errMsg.includes('unauthorized-domain')) {
          setAuthError('unauthorized-domain');
        } else {
          setAuthError(errMsg);
        }
      }
    }
  };

  const handleSignOut = async () => {
    if (auth && isFirebaseConfigured) {
      try {
        await signOut(auth);
        setFirebaseUser(null);
        setCurrentUserProfile(null);
        setCurrentRole('student');
        setIsDriveConnected(false);
        setDriveEmail('tanbaodl@gmail.com');
      } catch (err) {
        console.error('Failed to sign out:', err);
      }
    }
  };

  return (
    <div id="app-layout" className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* 1. Header with 3-line hamburger, brand, active view breadcrumbs and status indicators */}
      <Header
        onOpenSidebar={() => setSidebarOpen(true)}
        activeView={activeView}
        currentRole={currentRole}
        onChangeRole={handleChangeRole}
        isDriveConnected={isDriveConnected}
        driveEmail={driveEmail}
        isFirestoreLive={isFirebaseConfigured}
        onConnectDrive={handleOpenDriveModal}
        onSelectView={setActiveView}
        currentUserProfile={currentUserProfile}
        firebaseUser={firebaseUser}
        onSignInGoogle={handleSignInGoogle}
        onSignOut={handleSignOut}
      />

      {/* 2. Sidebar Drawer (Left edge slide-in, backdrop, 2-level accordion menu) */}
      <SidebarDrawer
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeView={activeView}
        onSelectView={viewId => setActiveView(viewId)}
        currentRole={currentRole}
        onChangeRole={handleChangeRole}
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
          onChangeRole={handleChangeRole}
          onOpenDriveConnect={handleOpenDriveModal}
          onNavigateToView={viewId => setActiveView(viewId)}
          driveEmail={driveEmail}
          currentUserProfile={currentUserProfile}
          firebaseUser={firebaseUser}
        />
      </main>

      {/* 4. Footer: Danh ngôn giáo dục mang ý nghĩa cố gắng, kiên trì sẽ thành công chạy từ phải sang trái, mỗi buổi của ngày là 1 câu */}
      <footer id="app-footer" className="bg-white border-t border-slate-200 py-2.5 overflow-hidden select-none">
        <div className="w-full overflow-hidden whitespace-nowrap relative">
          <div className="animate-marquee inline-block text-xs font-medium text-slate-700 tracking-wide">
            {(() => {
              const hour = new Date().getHours();
              if (hour >= 5 && hour < 12) {
                return '🌅 Buổi Sáng: «Học tập không phải là đích đến mà là hành trình của lòng kiên trì. Mỗi nỗ lực hôm nay là nền móng vững chắc cho thành công rực rỡ ngày mai. Hãy kiên tâm vững bước!»';
              } else if (hour >= 12 && hour < 14) {
                return '☀️ Buổi Trưa: «Nghị lực và sự bền bỉ chiến thắng tất cả mọi trở ngại. Người kiên trì tích lũy kiến thức từng chút một chính là người chạm đến đỉnh vinh quang.»';
              } else if (hour >= 14 && hour < 18) {
                return '🌇 Buổi Chiều: «Đường dài vạn dặm bắt đầu từ từng bước chân kiên định. Chỉ cần không dừng lại, sự kiên trì vượt khó trong học tập chắc chắn sẽ mở rộng cánh cửa tương lai.»';
              } else {
                return '🌙 Buổi Tối: «Cần cù bù thông minh, kiên trì ắt thành công. Những giờ phút miệt mài gieo hạt giống tri thức hôm nay sẽ biến mọi ước mơ của bạn thành hiện thực rạng ngời.»';
              }
            })()}
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
                      {isDriveConnected ? `Đã kết nối (${driveEmail})` : 'Chưa kết nối'}
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

              {isDriveConnected ? (
                <div className="text-[11px] text-emerald-800 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200 flex flex-col gap-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Google Drive đang đồng bộ trực tiếp lên đám mây (drive.google.com)</span>
                  </div>
                  <span className="text-slate-600">
                    Cấu trúc thư mục được lưu tại: <code className="font-mono bg-white px-1.5 py-0.5 rounded text-emerald-800 font-bold border border-emerald-200">Drive của tôi / myApp / LopU / TaiLieu</code>
                  </span>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-[11px] leading-relaxed">
                    Chưa kết nối tài khoản Google Drive. Để tự động tạo thư mục và sao lưu tài liệu trực tiếp lên <strong>drive.google.com</strong>, vui lòng đăng nhập bên dưới:
                  </div>

                  <button
                    onClick={handleConnectDriveAction}
                    className="w-full text-center py-2.5 px-4 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Cloud className="w-4 h-4" />
                    <span>Đăng nhập & Kết nối Google Drive</span>
                  </button>
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

      {/* 6. Firebase Auth Error / Unauthorized Domain Modal */}
      {authError && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] flex flex-col overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                  <X className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    Lỗi xác thực Google Auth
                  </h3>
                  <p className="text-xs text-slate-500">
                    {authError === 'unauthorized-domain' ? 'Tên miền chưa được cấp phép trong Firebase' : 'Đã có lỗi xảy ra'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAuthError(null)}
                className="text-slate-400 hover:text-slate-600 p-1 font-bold text-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {authError === 'unauthorized-domain' ? (
              <div className="space-y-4 text-xs text-slate-600">
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-950 rounded-xl leading-relaxed">
                  ⚠️ <strong>Lỗi auth/unauthorized-domain:</strong> Firebase Authentication chặn các yêu cầu đăng nhập từ tên miền ứng dụng hiện tại vì nó chưa được liệt kê trong danh sách được phép (Authorized Domains).
                </div>

                <div className="space-y-2">
                  <h4 className="font-bold text-slate-800 text-[13px]">Các bước cấp phép tên miền trong Firebase:</h4>
                  <ol className="list-decimal pl-4 space-y-1.5 leading-relaxed text-slate-600">
                    <li>Truy cập vào <strong>Firebase Console</strong> dự án của bạn.</li>
                    <li>Vào mục <strong>Authentication</strong> ➔ Tab <strong>Settings</strong> (Cài đặt).</li>
                    <li>Ở danh sách cột trái, chọn <strong>Authorized domains</strong> (Tên miền được ủy quyền).</li>
                    <li>Bấm nút <strong>Add domain</strong> (Thêm tên miền) và sao chép/dán hai tên miền bên dưới vào:</li>
                  </ol>
                </div>

                <div className="space-y-2.5 pt-1">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Tên miền Development:</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value="ais-dev-l5bsxmqhasi2bjkz6rqwz5-111135435575.asia-southeast1.run.app"
                        className="flex-1 font-mono text-[11px] bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-slate-700 outline-none select-all"
                      />
                      <button
                        onClick={() => navigator.clipboard.writeText("ais-dev-l5bsxmqhasi2bjkz6rqwz5-111135435575.asia-southeast1.run.app")}
                        className="px-2.5 py-1.5 text-[11px] bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg font-bold hover:bg-indigo-100 cursor-pointer"
                      >
                        Sao chép
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Tên miền Production / Share:</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value="ais-pre-l5bsxmqhasi2bjkz6rqwz5-111135435575.asia-southeast1.run.app"
                        className="flex-1 font-mono text-[11px] bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-slate-700 outline-none select-all"
                      />
                      <button
                        onClick={() => navigator.clipboard.writeText("ais-pre-l5bsxmqhasi2bjkz6rqwz5-111135435575.asia-southeast1.run.app")}
                        className="px-2.5 py-1.5 text-[11px] bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg font-bold hover:bg-indigo-100 cursor-pointer"
                      >
                        Sao chép
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-rose-50 border border-rose-100 text-rose-800 text-xs rounded-xl">
                <span className="font-semibold block">Chi tiết lỗi:</span>
                <code className="block mt-1 font-mono bg-white p-2 rounded border border-rose-200 text-[11px] overflow-x-auto select-all">
                  {authError}
                </code>
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
              <button
                onClick={() => setAuthError(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
