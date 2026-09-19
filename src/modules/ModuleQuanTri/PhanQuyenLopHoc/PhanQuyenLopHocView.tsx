import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Unlock,
  Copy,
  UserCheck,
  ShieldAlert,
  Cloud,
} from 'lucide-react';
import { ClassItem, UserProfile, UserRole } from '../../../services/storageTypes';
import { getClasses, saveClass, getUsers } from '../../ConnectData/ConnectFirestore';
import { getDriveConnectionState } from '../../ConnectData/ConnectDrive';

export interface PhanQuyenLopHocViewProps {
  currentRole?: UserRole;
}

export const PhanQuyenLopHocView: React.FC<PhanQuyenLopHocViewProps> = ({ currentRole }) => {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [teachers, setTeachers] = useState<UserProfile[]>([]);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [pinInputs, setPinInputs] = useState<Record<string, string>>({});
  const [notification, setNotification] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [driveConn, setDriveConn] = useState(getDriveConnectionState());

  useEffect(() => {
    setDriveConn(getDriveConnectionState());
    async function load() {
      const list = await getClasses();
      setClasses(list);
      const allUsers = await getUsers();
      setTeachers(allUsers.filter(u => u.role === 'teacher' || u.role === 'admin' || u.role === 'superadmin' || u.role === 'manager'));
      const initialPins: Record<string, string> = {};
      list.forEach(c => {
        initialPins[c.id] = c.pinCode;
      });
      setPinInputs(initialPins);
    }
    load();
  }, []);

  const handleUpdatePin = async (cls: ClassItem) => {
    const updatedPin = (pinInputs[cls.id] || cls.pinCode).trim().toUpperCase();
    const updatedClass = { ...cls, pinCode: updatedPin };
    await saveClass(updatedClass);
    setClasses(prev => prev.map(c => (c.id === cls.id ? updatedClass : c)));
    setEditingClassId(null);
    setNotification(`Đã cập nhật mã PIN mới cho lớp ${cls.name}: "${updatedPin}"`);
    setTimeout(() => setNotification(null), 3500);
  };

  const handleToggleRequirePin = async (cls: ClassItem) => {
    const updated = { ...cls, requirePin: !cls.requirePin };
    await saveClass(updated);
    setClasses(prev => prev.map(c => (c.id === cls.id ? updated : c)));
    setNotification(
      `Đã ${updated.requirePin ? 'bật' : 'tắt'} yêu cầu nhập PIN cho lớp ${cls.name}.`
    );
    setTimeout(() => setNotification(null), 3500);
  };

  const handleAssignTeacher = async (cls: ClassItem, teacherId: string) => {
    const selectedTeacher = teachers.find(t => t.id === teacherId);
    if (!selectedTeacher) return;
    const updated: ClassItem = {
      ...cls,
      teacherId: selectedTeacher.id,
      teacherName: `${selectedTeacher.name} (${selectedTeacher.email})`,
    };
    await saveClass(updated);
    setClasses(prev => prev.map(c => (c.id === cls.id ? updated : c)));
    setNotification(`Đã phân công giáo viên [${selectedTeacher.name}] phụ trách lớp [${cls.code}].`);
    setTimeout(() => setNotification(null), 3500);
  };

  const handleCopyPin = (clsId: string, pin: string) => {
    navigator.clipboard.writeText(pin);
    setCopiedId(clsId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Phân quyền bảo vệ: Phần sau thì admin và superadmin thấy: Quản trị tài khoản và phân quyền
  if (currentRole && currentRole !== 'admin' && currentRole !== 'superadmin') {
    return (
      <div id="settings-permissions-restricted" className="p-8 text-center max-w-lg mx-auto my-12 bg-white rounded-2xl border border-amber-200 shadow-sm space-y-4">
        <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto">
          <Lock className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-slate-900">Giới Hạn Quyền Phân Quyền</h3>
        <p className="text-xs text-slate-600 leading-relaxed">
          Chỉ <strong>Quản trị viên (Admin)</strong> và <strong>Superadmin</strong> mới có quyền xem và điều phối tại phân hệ <strong>Phân quyền lớp học & Quản lý mã PIN</strong>.
        </p>
      </div>
    );
  }

  return (
    <div id="settings-permissions-view" className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                Phân Quyền Lớp Học & Quản Lý Mã PIN Lớp Dạy
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                Quản trị / Quản lý môn
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Phân công giáo viên phụ trách môn, thiết lập mã PIN bảo mật lớp học và điều phối quyền mở lớp
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        {/* Roles Policy Overview */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-600 space-y-1.5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="font-bold text-slate-700 flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-indigo-600" /> Quy chế phân quyền:
            </span>
            <span>• <strong>Superadmin</strong>: 2 tài khoản bất khả xâm phạm</span>
            <span>• <strong>Quản trị</strong>: Toàn quyền</span>
            <span>• <strong>Quản lý</strong>: Toàn quyền trong môn được phân công</span>
            <span>• <strong>Giáo viên</strong>: Mở lớp, thêm/xóa HS, soạn bài Drive 4 cấp</span>
          </div>

          <div className="pt-1 border-t border-slate-200/60 flex flex-wrap items-center gap-2 text-[10px] font-bold">
            <span className="text-slate-500">Mã màu Cán sự Bộ môn:</span>
            <span className="px-2 py-0.5 rounded bg-blue-600 text-white">Toán</span>
            <span className="px-2 py-0.5 rounded bg-sky-600 text-white">Lý</span>
            <span className="px-2 py-0.5 rounded bg-purple-600 text-white">Hóa</span>
            <span className="px-2 py-0.5 rounded bg-emerald-600 text-white">Sinh</span>
            <span className="px-2 py-0.5 rounded bg-indigo-600 text-white">Tin</span>
            <span className="px-2 py-0.5 rounded bg-rose-600 text-white">Anh</span>
            <span className="px-2 py-0.5 rounded bg-amber-600 text-white">Văn</span>
            <span className="px-2 py-0.5 rounded bg-orange-600 text-white">Sử</span>
            <span className="px-2 py-0.5 rounded bg-teal-600 text-white">Địa</span>
            <span className="px-2 py-0.5 rounded bg-cyan-600 text-white">KTPL</span>
          </div>
        </div>
      </div>

      {/* Google Drive Permissions & Connection Status & Bảo Mật Drive Giáo Viên */}
      <div className={`p-4 rounded-2xl border text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs ${
        driveConn.isConnected && driveConn.isRealConfigured
          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
          : 'bg-amber-50 border-amber-200 text-amber-800'
      }`}>
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 font-bold">
            <Cloud className="w-4 h-4 shrink-0" />
            <span>QUYỀN GHI GOOGLE DRIVE & BẢO MẬT DỮ LIỆU: {driveConn.isConnected && driveConn.isRealConfigured ? 'ĐÃ LIÊN KẾT THÀNH CÔNG' : 'CHẾ ĐỘ THỬ NGHIỆM (SANDBOX)'}</span>
          </div>
          <p className="text-[11px] leading-relaxed opacity-90">
            {driveConn.isConnected && driveConn.isRealConfigured
              ? `Tài khoản giáo viên hiện tại (${driveConn.email}) có đầy đủ quyền tạo cấu trúc thư mục myApp / LopU / TaiLieu và ghi dữ liệu bài dạy vào Google Drive. Hệ thống áp dụng cơ chế bảo mật nghiêm ngặt: Drive của giáo viên chỉ chính giáo viên và app truy cập; học sinh tuyệt đối không được cấp link trực tiếp để lấy trộm tài liệu.`
              : 'Ứng dụng chưa liên kết hoặc chưa được cấp quyền ghi thực tế từ Google Drive API của bạn. Do đó, hệ thống đang lưu tạm vào Sandbox bộ nhớ trình duyệt. Cơ chế bảo mật tuyệt đối ngăn chặn học sinh truy xuất Drive giáo viên vẫn được thực thi.'}
          </p>
          <div className="pt-1 text-[10px] font-semibold text-indigo-700">
            🛡️ Bảo mật phát lại: Với bài giảng E-Learning (KienThuc.html), hệ thống tự sinh sandbox đường dẫn tương đối để phát media/assets an toàn mà không làm lộ ID Drive hay file nguồn của giáo viên.
          </div>
        </div>
      </div>

      {/* Classes PIN & Teacher Assignment Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {classes.map(cls => {
          const isEditing = editingClassId === cls.id;
          const currentPinValue = pinInputs[cls.id] || cls.pinCode;

          return (
            <div
              key={cls.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4 hover:border-indigo-200 transition-all"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md">
                    {cls.code} • {cls.grade}
                  </span>
                  <h3 className="font-bold text-base text-slate-900 mt-1">{cls.name}</h3>
                </div>

                {/* Require PIN toggle */}
                <button
                  onClick={() => handleToggleRequirePin(cls)}
                  className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                    cls.requirePin
                      ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {cls.requirePin ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                  <span>{cls.requirePin ? 'Bắt buộc mã PIN' : 'Mở tự do'}</span>
                </button>
              </div>

              {/* Phân công giáo viên phụ trách lớp */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700 flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-indigo-600" /> Phân công Giáo viên phụ trách:
                  </span>
                </div>
                <select
                  value={cls.teacherId || ''}
                  onChange={e => handleAssignTeacher(cls, e.target.value)}
                  className="w-full py-1.5 px-2 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Chọn giáo viên từ hệ thống --</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.email}) [{t.role}]
                    </option>
                  ))}
                </select>
              </div>

              {/* PIN Code Box */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700 uppercase">Mã PIN Tham Gia Lớp</span>
                  <button
                    onClick={() => handleCopyPin(cls.id, cls.pinCode)}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedId === cls.id ? 'Đã sao chép!' : 'Sao chép mã'}</span>
                  </button>
                </div>

                {isEditing ? (
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={currentPinValue}
                      onChange={e =>
                        setPinInputs(prev => ({
                          ...prev,
                          [cls.id]: e.target.value.toUpperCase(),
                        }))
                      }
                      className="flex-1 py-1.5 px-3 bg-white border border-slate-300 rounded-lg text-sm font-mono font-extrabold uppercase focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      onClick={() => handleUpdatePin(cls)}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                    >
                      Lưu
                    </button>
                    <button
                      onClick={() => setEditingClassId(null)}
                      className="px-2.5 py-1.5 text-slate-500 hover:bg-slate-200 rounded-lg text-xs cursor-pointer"
                    >
                      Hủy
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between pt-1">
                    <div className="font-mono text-xl font-extrabold text-slate-800 tracking-wider">
                      {cls.pinCode}
                    </div>
                    <button
                      onClick={() => setEditingClassId(cls.id)}
                      className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:border-indigo-300 cursor-pointer"
                    >
                      Đổi mã PIN
                    </button>
                  </div>
                )}
              </div>

              <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1">
                <span>Giáo viên: <b className="text-slate-700">{cls.teacherName}</b></span>
                <span>Năm học: <b className="text-slate-700">{cls.academicYear || '2025 - 2026'}</b></span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
