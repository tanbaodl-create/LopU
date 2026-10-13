import React, { useState } from 'react';
import { Database, CheckCircle2, AlertTriangle, ExternalLink, RefreshCw, UploadCloud, X, Save, ShieldCheck } from 'lucide-react';
import { firebaseConfig, isFirebaseConfigured } from '../../../config/firebase';
import { pushAllLocalDataToFirestore } from './firestoreService';

interface ModalFirebaseLopUProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ModalFirebaseLopU: React.FC<ModalFirebaseLopUProps> = ({ isOpen, onClose }) => {
  const [apiKey, setApiKey] = useState(() => {
    try {
      const raw = localStorage.getItem('lopu_custom_firebase_config');
      if (raw) {
        const parsed = JSON.parse(raw);
        return parsed.apiKey || '';
      }
    } catch (e) {
      // ignore
    }
    return firebaseConfig.apiKey || '';
  });

  const [appId, setAppId] = useState(() => {
    try {
      const raw = localStorage.getItem('lopu_custom_firebase_config');
      if (raw) {
        const parsed = JSON.parse(raw);
        return parsed.appId || '';
      }
    } catch (e) {
      // ignore
    }
    return firebaseConfig.appId || '';
  });

  const [isPushing, setIsPushing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    success: boolean;
    message: string;
    stats?: any;
  } | null>(null);

  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSaveConfig = () => {
    try {
      const configObj = {
        projectId: 'lopu-ddf22',
        authDomain: 'lopu-ddf22.firebaseapp.com',
        storageBucket: 'lopu-ddf22.firebasestorage.app',
        messagingSenderId: '895470500244',
        apiKey: apiKey.trim(),
        appId: appId.trim(),
      };
      localStorage.setItem('lopu_custom_firebase_config', JSON.stringify(configObj));
      setSaveSuccess(true);
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (err) {
      console.error('Lỗi khi lưu cấu hình Firebase LopU:', err);
    }
  };

  const handlePushData = async () => {
    setIsPushing(true);
    setSyncResult(null);
    try {
      const res = await pushAllLocalDataToFirestore();
      setSyncResult(res);
    } catch (err: any) {
      setSyncResult({
        success: false,
        message: err?.message || 'Có lỗi khi đẩy dữ liệu lên Firestore LopU.',
      });
    } finally {
      setIsPushing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header Modal */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 text-amber-700 rounded-xl border border-amber-500/20">
              <Database className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-base sm:text-lg">
                  Quản lý Firebase LopU & Đồng bộ
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  lopu-ddf22
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Cơ sở dữ liệu đám mây duy nhất và chính thức của ứng dụng LopU
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs sm:text-sm">
          {/* Trạng thái kết nối */}
          <div className={`p-4 rounded-xl border flex items-start gap-3 ${
            isFirebaseConfigured
              ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
              : 'bg-amber-50/80 border-amber-200 text-amber-950'
          }`}>
            {isFirebaseConfigured ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <div className="font-bold text-sm">
                {isFirebaseConfigured
                  ? 'Đã kết nối trực tiếp tới Firebase Firestore LopU'
                  : 'Ứng dụng đang hoạt động ở chế độ Đệm cục bộ (Offline-first)'}
              </div>
              <p className="text-xs leading-relaxed opacity-90">
                {isFirebaseConfigured
                  ? 'Mọi thay đổi dữ liệu sẽ được đồng bộ trực tiếp hai chiều lên dự án Firebase LopU (lopu-ddf22).'
                  : 'Dữ liệu đang được lưu an toàn tại bộ nhớ trình duyệt. Vui lòng nhập API Key & App ID của dự án LopU bên dưới để kết nối đám mây.'}
              </p>
            </div>
          </div>

          {/* Form nhập thông số */}
          <div className="space-y-3.5 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                Thông số kết nối LopU
              </span>
              <a
                href="https://console.firebase.google.com/project/lopu-ddf22/settings/general"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1 hover:underline"
              >
                <span>Mở Firebase Console LopU</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-slate-600 text-xs font-semibold mb-1">
                  Project ID (Cố định):
                </label>
                <input
                  type="text"
                  readOnly
                  value="lopu-ddf22"
                  className="w-full bg-slate-200/70 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-slate-800 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 text-xs font-semibold mb-1">
                  Firebase API Key:
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: AIzaSyBunDWkqQf_..."
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  className="w-full bg-white border border-slate-300 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 outline-none shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 text-xs font-semibold mb-1">
                  Firebase App ID:
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: 1:895470500244:web:..."
                  value={appId}
                  onChange={e => setAppId(e.target.value)}
                  className="w-full bg-white border border-slate-300 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 outline-none shadow-2xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-slate-500">
                * Sau khi lưu, ứng dụng sẽ tự động tải lại để kích hoạt kết nối.
              </span>
              <button
                onClick={handleSaveConfig}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs shadow-xs cursor-pointer transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>{saveSuccess ? 'Đã lưu & Đang tải lại...' : 'Lưu cấu hình LopU'}</span>
              </button>
            </div>
          </div>

          {/* Nút Đẩy dữ liệu lên Firebase LopU */}
          <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <UploadCloud className="w-4 h-4 text-amber-600" />
                  Đẩy dữ liệu hiện tại lên Firebase LopU
                </h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Đồng bộ toàn bộ danh sách lớp học, hồ sơ học sinh, tài liệu và tiến độ học tập hiện có lên Firestore của dự án LopU.
                </p>
              </div>
            </div>

            {syncResult && (
              <div className={`p-3 rounded-lg text-xs leading-relaxed ${
                syncResult.success
                  ? 'bg-emerald-100/80 text-emerald-950 border border-emerald-300'
                  : 'bg-red-100/80 text-red-950 border border-red-300'
              }`}>
                {syncResult.message}
              </div>
            )}

            <button
              onClick={handlePushData}
              disabled={isPushing}
              className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-60"
            >
              {isPushing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Đang đẩy dữ liệu lên Firestore LopU...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>Đẩy toàn bộ dữ liệu vào LopU ngay</span>
                </>
              )}
            </button>
          </div>

          {/* Hướng dẫn cấp phép tên miền Vercel trên Firebase LopU */}
          <div className="p-4 bg-blue-50/70 rounded-xl border border-blue-200 text-xs text-blue-950 space-y-2">
            <div className="font-bold flex items-center gap-1.5 text-blue-900">
              <ExternalLink className="w-3.5 h-3.5 text-blue-700" />
              Cấp phép tên miền cho trang web (Vercel & AI Studio):
            </div>
            <p className="leading-relaxed">
              Nếu đăng nhập Google Auth báo lỗi <code>auth/unauthorized-domain</code> trên trang <code>lopu2.vercel.app</code>, thầy/cô chỉ cần thêm tên miền <code>lopu2.vercel.app</code> vào mục <strong>Authorized domains</strong> trên Firebase Console của dự án LopU.
            </p>
            <div className="pt-1">
              <a
                href="https://console.firebase.google.com/project/lopu-ddf22/authentication/settings"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs shadow-2xs transition-colors"
              >
                <span>Cài đặt Authorized Domains trên Firebase LopU</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg text-xs cursor-pointer transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
