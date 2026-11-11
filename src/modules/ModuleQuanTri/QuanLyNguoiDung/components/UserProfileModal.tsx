import React, { useState, useEffect, Suspense, lazy } from 'react';
import { User, Sparkles, CheckSquare, Square, AlertCircle } from 'lucide-react';
import { UserRole } from '../../../../services/storageTypes';
import { ExtendedUserProfile } from '../QuanLyNguoiDungView';

const GpsPickerModal = lazy(() =>
  import('../../../../components/GpsPickerModal').then((m) => ({ default: m.GpsPickerModal }))
);

interface UserProfileModalProps {
  user: ExtendedUserProfile | null;
  onClose: () => void;
  onSave: (updatedUser: ExtendedUserProfile) => Promise<void>;
  onOpenGpsModal?: () => void;
}

const AVAILABLE_ROLES: { id: UserRole; label: string }[] = [
  { id: 'student', label: 'Học sinh' },
  { id: 'teacher', label: 'Giáo viên' },
  { id: 'manager', label: 'Quản lý môn' },
  { id: 'assistant', label: 'Trợ giảng' },
  { id: 'admin', label: 'Quản trị viên' },
  { id: 'parent', label: 'Phụ huynh' },
  { id: 'guest', label: 'Khách' },
  { id: 'superadmin', label: 'Superadmin' },
];

const AVAILABLE_TITLES: { id: string; label: string }[] = [
  { id: 'Thành viên', label: 'Thành viên' },
  { id: 'LT', label: 'LT (Lớp Trưởng)' },
  { id: 'PHT', label: 'PHT (Phó Học Tập)' },
  { id: 'VTM', label: 'VTM (Văn Thể Mỹ)' },
  { id: 'PLĐ', label: 'PLĐ (Phó Lao Động)' },
  { id: 'CĐ', label: 'Cờ Đỏ' },
  { id: 'BT', label: 'BT (Bí Thư)' },
  { id: 'PBT', label: 'PBT (Phó Bí Thư)' },
  { id: 'UV', label: 'UV (Ủy Viên)' },
  { id: 'TT', label: 'TT (Tổ Trưởng)' },
  { id: 'TP', label: 'TP (Tổ Phó)' },
  { id: 'Ban Cán Sự Môn', label: 'Ban Cán Sự Môn' },
];

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ user, onClose, onSave, onOpenGpsModal }) => {
  const [formData, setFormData] = useState<ExtendedUserProfile | null>(user);
  const [isSaving, setIsSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showGpsPicker, setShowGpsPicker] = useState(false);

  useEffect(() => {
    setFormData(user);
    setValidationError(null);
  }, [user]);

  if (!formData) return null;

  const currentRoles: UserRole[] = formData.roles && formData.roles.length > 0 
    ? formData.roles 
    : [formData.role || 'guest'];

  const currentTitles: string[] = formData.classTitles && formData.classTitles.length > 0 
    ? formData.classTitles 
    : (formData.classTitle ? formData.classTitle.split(',').map(s => s.trim()).filter(Boolean) : ['Thành viên']);

  const toggleRole = (roleId: UserRole) => {
    let nextRoles: UserRole[];
    if (currentRoles.includes(roleId)) {
      if (currentRoles.length === 1) return; // Must have at least 1 role
      nextRoles = currentRoles.filter(r => r !== roleId);
    } else {
      nextRoles = [...currentRoles, roleId];
    }
    setFormData({
      ...formData,
      role: nextRoles[0],
      roles: nextRoles,
    });
  };

  const toggleTitle = (titleId: string) => {
    let nextTitles: string[];
    if (currentTitles.includes(titleId)) {
      if (currentTitles.length === 1 && titleId === 'Thành viên') return;
      nextTitles = currentTitles.filter(t => t !== titleId);
      if (nextTitles.length === 0) nextTitles = ['Thành viên'];
    } else {
      if (titleId === 'Thành viên') {
        nextTitles = ['Thành viên'];
      } else {
        nextTitles = [...currentTitles.filter(t => t !== 'Thành viên'), titleId];
      }
    }
    setFormData({
      ...formData,
      classTitle: nextTitles.join(', '),
      classTitles: nextTitles,
    });
  };

  const validate = (): boolean => {
    setValidationError(null);

    // Email validation
    if (formData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        setValidationError('Email Google không đúng định dạng chuẩn (ví dụ: user@gmail.com).');
        return false;
      }
    }

    // Phone validation (if provided)
    if (formData.phone && formData.phone.trim().length > 0) {
      const phoneRegex = /^(\+84|0)[0-9]{9,10}$/;
      if (!phoneRegex.test(formData.phone.trim().replace(/[\s-]/g, ''))) {
        setValidationError('Số điện thoại không hợp lệ (phải bắt đầu bằng 0 hoặc +84 và gồm 10-11 chữ số).');
        return false;
      }
    }

    // GPS validation (if provided)
    if (formData.gps && formData.gps.trim().length > 0) {
      const gpsRegex = /^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/;
      if (!gpsRegex.test(formData.gps.trim())) {
        setValidationError('Tọa độ GPS không đúng định dạng. Cần dạng: "vĩ độ, kinh độ" (Ví dụ: 21.028511, 105.854444).');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setIsSaving(true);
      await onSave(formData);
      onClose();
    } catch (err) {
      console.error('Lỗi khi lưu 14 trường thông tin:', err);
      setValidationError('Không thể lưu dữ liệu. Vui lòng kiểm tra kết nối mạng hoặc thử lại!');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-scale-up">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">
                Hồ Sơ Chi Tiết — 14 Trường Thông Tin Người Dùng
              </h3>
              <p className="text-xs text-slate-500">
                Mã tài khoản: <span className="font-mono font-semibold text-indigo-600">{formData.id}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer"
          >
            ✕
          </button>
        </div>

        {validationError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700 font-medium">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs max-h-[70vh] overflow-y-auto pr-1">
          <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
            <span className="text-[11px] text-indigo-900 font-medium">
              Dữ liệu lưu trữ chuẩn hóa Firestore. Bạn có thể chọn nhiều Vai trò và Chức danh cho cùng 1 tài khoản.
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-bold text-slate-700 mb-0.5 uppercase">1. Họ và Tên</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-0.5 uppercase">2. Biệt Danh</label>
              <input
                type="text"
                value={formData.nickname || ''}
                onChange={e => setFormData({ ...formData, nickname: e.target.value })}
                className="w-full py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-emerald-800 font-semibold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-bold text-slate-700 mb-0.5 uppercase">3. Giới Tính</label>
              <select
                value={formData.gender || 'Nam'}
                onChange={e => setFormData({ ...formData, gender: e.target.value })}
                className="w-full py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg"
              >
                <option value="Nam">Nam</option>
                <option value="Nữ">Nữ</option>
                <option value="Khác">Khác</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-0.5 uppercase">4. Nơi Công Tác/Học Tập</label>
              <input
                type="text"
                value={formData.workplace || ''}
                onChange={e => setFormData({ ...formData, workplace: e.target.value })}
                className="w-full py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-0.5 uppercase">5. Google Email (Định danh)</label>
            <input
              type="email"
              disabled
              value={formData.email}
              className="w-full py-1.5 px-2.5 bg-slate-100 border border-slate-200 rounded-lg font-mono text-slate-500 cursor-not-allowed"
            />
          </div>

          {/* 6. VAI TRÒ (MULTI-SELECT) */}
          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
            <label className="block font-bold text-slate-700 mb-1.5 uppercase">
              6. Vai Trò Hệ Thống (Có thể chọn nhiều)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {AVAILABLE_ROLES.map(r => {
                const isSelected = currentRoles.includes(r.id);
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => toggleRole(r.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-bold shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {isSelected ? (
                      <CheckSquare className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    )}
                    <span className="truncate">{r.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="flex items-center justify-between mb-0.5">
                <label className="block font-bold text-slate-700 uppercase">
                  7. GPS
                </label>
                <button
                  type="button"
                  onClick={() => setShowGpsPicker(true)}
                  className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded cursor-pointer transition-colors shadow-xs"
                >
                  Lấy tọa độ GPS
                </button>
              </div>
              <input
                type="text"
                value={formData.gps || ''}
                onChange={e => setFormData({ ...formData, gps: e.target.value })}
                className="w-full py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                placeholder="VD: 21.028511, 105.854444"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-0.5 uppercase">
                8. SĐT (Chỉ chấp nhận SĐT chuẩn)
              </label>
              <input
                type="text"
                value={formData.phone || ''}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                className="w-full py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                placeholder="VD: 0912345678"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-bold text-slate-700 mb-0.5 uppercase">9. Địa Chỉ Nhà</label>
              <input
                type="text"
                value={formData.homeAddress || ''}
                onChange={e => setFormData({ ...formData, homeAddress: e.target.value })}
                className="w-full py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-0.5 uppercase">10. Phân Nhóm/Tổ</label>
              <input
                type="text"
                value={formData.groupOrTeam || ''}
                onChange={e => setFormData({ ...formData, groupOrTeam: e.target.value })}
                className="w-full py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-bold text-slate-700 mb-0.5 uppercase">11. Các Lớp Dạy/Học</label>
              <input
                type="text"
                value={formData.classIds?.join(', ') || ''}
                onChange={e =>
                  setFormData({
                    ...formData,
                    classIds: e.target.value.split(',').map(s => s.trim()).filter(Boolean),
                  })
                }
                className="w-full py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                placeholder="Phân cách bằng dấu phẩy"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-0.5 uppercase">12. Các Môn Dạy/Học</label>
              <input
                type="text"
                value={formData.subjects?.join(', ') || ''}
                onChange={e =>
                  setFormData({
                    ...formData,
                    subjects: e.target.value.split(',').map(s => s.trim()).filter(Boolean),
                  })
                }
                className="w-full py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                placeholder="Phân cách bằng dấu phẩy"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-0.5 uppercase">13. Các Môn Quản Lý</label>
            <input
              type="text"
              value={formData.managedSubjects?.join(', ') || ''}
              onChange={e =>
                setFormData({
                  ...formData,
                  managedSubjects: e.target.value.split(',').map(s => s.trim()).filter(Boolean),
                })
              }
              className="w-full py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg"
              placeholder="Ví dụ: Toán, Vật Lý"
            />
          </div>

          {/* 14. CHỨC DANH TRONG LỚP (MULTI-SELECT) */}
          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
            <label className="block font-bold text-slate-700 mb-1.5 uppercase">
              14. Chức Danh Trong Lớp (Có thể chọn nhiều)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {AVAILABLE_TITLES.map(t => {
                const isSelected = currentTitles.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleTitle(t.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {isSelected ? (
                      <CheckSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    )}
                    <span className="truncate">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer disabled:opacity-50"
            >
              Đóng
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isSaving ? 'Đang kiểm tra & lưu...' : 'Cập Nhật Hồ Sơ 14 Trường'}
            </button>
          </div>
        </form>
      </div>

      {showGpsPicker && (
        <Suspense fallback={null}>
          <GpsPickerModal
            title="Google Maps — Chọn Tọa Độ GPS Cho Hồ Sơ"
            userNameOrContext={formData.name}
            initialLat={
              formData.gps
                ? parseFloat(formData.gps.split(',')[0]) || 21.028511
                : 21.028511
            }
            initialLng={
              formData.gps
                ? parseFloat(formData.gps.split(',')[1]) || 105.854444
                : 105.854444
            }
            onClose={() => setShowGpsPicker(false)}
            onConfirm={(coordsStr) => {
              setFormData({ ...formData, gps: coordsStr });
              setShowGpsPicker(false);
            }}
          />
        </Suspense>
      )}
    </div>
  );
};
