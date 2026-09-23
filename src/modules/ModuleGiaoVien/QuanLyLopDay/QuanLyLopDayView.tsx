import React, { useState, useEffect, useMemo } from 'react';
import {
  LayoutGrid,
  KeyRound,
  CheckCircle2,
  XCircle,
  Save,
  FileSpreadsheet,
  Plus,
  Trash2,
  Users,
  GraduationCap,
  School,
  MapPin,
  ArrowRightLeft,
  Cloud,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { ClassItem, ClassSeatingPlan, PinJoinRequest, StudentProfile, UserProfile, UserRole, QUESTION_LEVELS } from '../../../services/storageTypes';
import {
  getClasses,
  getSeatingPlan,
  saveSeatingPlan,
  getPinRequests,
  reviewPinRequest,
  saveClass,
  getStudentsByClassId,
  removeStudentFromClass,
  getUsers,
  updateStudentLevel,
} from '../../ConnectData/ConnectFirestore';
import {
  deleteDriveFolderHierarchy,
  connectGoogleDrive,
} from '../../ConnectData/ConnectDrive/googleDriveService';
import { ModalThemHocSinhExcel, themMotHocSinh } from '../NhapHocSinh';
import { GpsPickerModal } from '../../../components/GpsPickerModal';
import { IconNam, IconNu } from '../../ModuleHocSinh/SoDoLop/SoDoLopView';
export { inferAxesLabels, convertMathExprToTikz } from '../TaiLieuCaNhan/TaiLieuCaNhanView';
export { convertMathExprToJs } from '../TaiLieuCaNhan/TikZVisualRenderer';

// Helper component hiển thị Khung Thẻ Bàn Học Sinh hình vuông bo góc với 4 nhãn chức danh nằm ngoài vòng tròn icon nhưng nằm trong hình vuông
export interface StudentCardBoxProps {
  gender?: 'Nam' | 'Nữ' | string;
  isFemale?: boolean;
  dieuHanh?: string; // Trái: Trên - Chức danh điều hành (LT, LP, PHT...)
  to?: string;       // Trái: Dưới - Chức danh tổ (TT1, TP2, Tổ 1...)
  doan?: string;     // Phải: Trên - Chức danh đoàn (BT, PBT, UV...)
  mon?: string;      // Phải: Dưới - Chức danh BCS Bộ môn (CS Toán, CS Văn...)
  nickname: string;
  fullName?: string;
  studentCode?: string;
  seatLabel?: string;
  isMe?: boolean;
  className?: string;
}

export const StudentCardBox: React.FC<StudentCardBoxProps> = ({
  gender,
  isFemale,
  dieuHanh,
  to,
  doan,
  mon,
  nickname,
  fullName,
  studentCode,
  seatLabel,
  isMe,
  className = '',
}) => {
  const checkFemale = isFemale ?? (gender === 'Nữ' || gender === 'Nu' || gender === 'nu');

  return (
    <div
      className={`relative bg-white border-2 rounded-2xl p-2.5 shadow-2xs hover:shadow-md transition-all flex flex-col items-center justify-between text-center overflow-hidden min-h-[110px] ${
        isMe
          ? 'border-indigo-500 ring-2 ring-indigo-300 bg-indigo-50/80'
          : 'border-slate-300 hover:border-indigo-400'
      } ${className}`}
    >
      {seatLabel && (
        <span className="text-[9px] text-slate-400 font-bold mb-0.5">{seatLabel}</span>
      )}

      {/* 4 Nhãn chức danh CHỈ GHI CHỮ, KHÔNG ĐÓNG KHUNG */}
      {/* TRÁI - TRÊN: Điều hành */}
      {dieuHanh && (
        <span
          className="absolute top-1 left-1.5 z-10 font-extrabold text-[10px] leading-none text-amber-700 pointer-events-none"
          title={`Trái - Trên (Điều hành): ${dieuHanh}`}
        >
          {dieuHanh}
        </span>
      )}

      {/* PHẢI - TRÊN: Đoàn */}
      {doan && (
        <span
          className="absolute top-1 right-1.5 z-10 font-extrabold text-[10px] leading-none text-blue-700 pointer-events-none"
          title={`Phải - Trên (Đoàn): ${doan}`}
        >
          {doan}
        </span>
      )}

      {/* Vòng Tròn Icon Nam / Nữ ở Trung Tâm (Sạch sẽ không bị nhãn che) */}
      <div className="w-11 h-11 mx-auto rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0 my-1 shadow-2xs">
        {checkFemale ? (
          <IconNu className="w-10 h-10 text-rose-600" />
        ) : (
          <IconNam className="w-10 h-10 text-indigo-700" />
        )}
      </div>

      {/* TRÁI - DƯỚI: Tổ */}
      {to && (
        <span
          className="absolute bottom-5 left-1.5 z-10 font-extrabold text-[10px] leading-none text-indigo-700 pointer-events-none"
          title={`Trái - Dưới (Tổ): ${to}`}
        >
          {to}
        </span>
      )}

      {/* PHẢI - DƯỚI: BCS Bộ môn */}
      {mon && (
        <span
          className="absolute bottom-5 right-1.5 z-10 font-extrabold text-[10px] leading-none text-emerald-700 pointer-events-none"
          title={`Phải - Dưới (BCS Môn): ${mon}`}
        >
          {mon}
        </span>
      )}

      {/* HIỂN THỊ DUY NHẤT BIỆT DANH HỌC SINH */}
      <div className="w-full">
        <div className="font-black text-xs text-slate-900 truncate px-0.5" title={fullName ? `Họ tên: ${fullName}` : nickname}>
          {nickname}
        </div>
        {studentCode && (
          <div className="text-[9px] text-indigo-600 font-mono font-semibold truncate">{studentCode}</div>
        )}
      </div>
    </div>
  );
};

export interface QuanLyLopDayViewProps {
  currentRole?: UserRole;
}

export const QuanLyLopDayView: React.FC<QuanLyLopDayViewProps> = ({ currentRole }) => {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('class_10a1');
  const [seatingPlan, setSeatingPlan] = useState<ClassSeatingPlan | null>(null);
  const [classStudents, setClassStudents] = useState<StudentProfile[]>([]);
  const [activeTab, setActiveTab] = useState<'students' | 'seating' | 'pin'>('students');
  const [pinRequests, setPinRequests] = useState<PinJoinRequest[]>([]);
  const [notification, setNotification] = useState<string | null>(null);
  const [showExcelModal, setShowExcelModal] = useState<boolean>(false);
  const [showGpsModal, setShowGpsModal] = useState<boolean>(false);
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);

  // Modal Mở lớp dạy mới
  const [showCreateClassModal, setShowCreateClassModal] = useState<boolean>(false);
  const [newClassName, setNewClassName] = useState<string>('');
  const [newClassCode, setNewClassCode] = useState<string>('');
  const [newClassGrade, setNewClassGrade] = useState<string>('Khối 10');
  const [newClassSubject, setNewClassSubject] = useState<string>('Toán Học');
  const [newClassPin, setNewClassPin] = useState<string>('123456');

  // Modal Thêm học sinh đơn lẻ
  const [showAddSingleStudentModal, setShowAddSingleStudentModal] = useState<boolean>(false);
  const [studentName, setStudentName] = useState<string>('');
  const [studentEmail, setStudentEmail] = useState<string>('');
  const [studentCode, setStudentCode] = useState<string>('');
  const [studentPhone, setStudentPhone] = useState<string>('');

  // Sửa tên lớp & Đổi vị trí Cửa ⇄ Bàn GV
  const [doorOnLeft, setDoorOnLeft] = useState<boolean>(true);
  const [editingClassName, setEditingClassName] = useState<string>('');
  const [teacherNameState, setTeacherNameState] = useState<string>(currentRole === 'student' ? '' : 'Thầy Nguyễn Văn An');

  useEffect(() => {
    if (currentRole === 'student') {
      setTeacherNameState('');
    }
  }, [currentRole]);
  const [teacherPhoneState, setTeacherPhoneState] = useState<string>('0912.345.678');

  const loadAllData = async () => {
    const list = await getClasses();
    setClasses(list);
    const clsId = selectedClassId || (list[0] ? list[0].id : 'class_10a1');
    if (list.length > 0) {
      const plan = await getSeatingPlan(clsId);
      setSeatingPlan(plan);
      const stds = await getStudentsByClassId(clsId);
      setClassStudents(stds);
    }
    const reqs = await getPinRequests();
    setPinRequests(reqs);
    const users = await getUsers();
    setUserProfiles(users);
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleClassChange = async (classId: string) => {
    setSelectedClassId(classId);
    const plan = await getSeatingPlan(classId);
    setSeatingPlan(plan);
    const stds = await getStudentsByClassId(classId);
    setClassStudents(stds);
    const users = await getUsers();
    setUserProfiles(users);
  };

  // Mở lớp dạy mới
  const handleCreateNewClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim() || !newClassCode.trim()) return;

    const newCls: ClassItem = {
      id: `class_${Date.now()}`,
      code: newClassCode.trim().toUpperCase(),
      name: newClassName.trim(),
      subject: 'Toán Học',
      grade: newClassGrade,
      teacherId: 'u_gv01',
      teacherName: 'Thầy Nguyễn Văn An (GV)',
      room: 'Phòng 201',
      pinCode: newClassPin.trim() || '123456',
      requirePin: true,
      description: `Lớp dạy môn Toán năm học 2025 - 2026`,
      studentCount: 0,
      studentIds: [],
      academicYear: '2025 - 2026',
      semester: 'Học kỳ I',
      lessons: [],
      color: 'blue',
    };

    await saveClass(newCls);
    setClasses([newCls, ...classes]);
    setSelectedClassId(newCls.id);
    setShowCreateClassModal(false);
    setNewClassName('');
    setNewClassCode('');
    setNotification(`Giáo viên đã mở lớp dạy mới thành công: [${newCls.code}] ${newCls.name}!`);
    setTimeout(() => setNotification(null), 4000);
  };

  // Thêm học sinh đơn lẻ vào lớp
  const handleAddSingleStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim() || !studentEmail.trim()) return;

    const res = await themMotHocSinh(selectedClassId, {
      name: studentName.trim(),
      email: studentEmail.trim(),
      studentCode: studentCode.trim() || undefined,
      phone: studentPhone.trim() || undefined,
    });

    if (res.success) {
      const updatedStudents = await getStudentsByClassId(selectedClassId);
      setClassStudents(updatedStudents);
      setShowAddSingleStudentModal(false);
      setStudentName('');
      setStudentEmail('');
      setStudentCode('');
      setStudentPhone('');
      setNotification(res.message);
    } else {
      alert(res.message);
    }
    setTimeout(() => setNotification(null), 4000);
  };

  // Xóa học sinh khỏi lớp dạy
  const handleRemoveStudent = async (studentId: string, name: string) => {
    if (confirm(`Giáo viên có chắc chắn muốn xóa học sinh [${name}] khỏi lớp dạy này không?`)) {
      await removeStudentFromClass(selectedClassId, studentId);
      setClassStudents(prev => prev.filter(s => s.id !== studentId));
      setNotification(`Đã xóa học sinh [${name}] khỏi danh sách lớp.`);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  // Cập nhật mức độ năng lực học sinh (1-6)
  const handleUpdateStudentLevelChange = async (studentId: string, level: number) => {
    await updateStudentLevel(studentId, level);
    setClassStudents(prev =>
      prev.map(s => (s.id === studentId ? { ...s, level } : s))
    );
    setNotification(`Đã cập nhật mức độ học sinh thành Mức ${level}`);
    setTimeout(() => setNotification(null), 2500);
  };

  const handleSaveSeating = async () => {
    if (!seatingPlan) return;
    const updatedPlan: ClassSeatingPlan = {
      ...seatingPlan,
      updatedAt: new Date().toLocaleDateString('vi-VN'),
    };
    await saveSeatingPlan(updatedPlan);
    setNotification('Đã cập nhật sơ đồ chỗ ngồi lớp học thành công!');
    setTimeout(() => setNotification(null), 3000);
  };

  const handleReviewPin = async (requestId: string, status: 'approved' | 'rejected') => {
    await reviewPinRequest(requestId, status);
    const updated = await getPinRequests();
    setPinRequests(updated);
    setNotification(`Đã ${status === 'approved' ? 'duyệt' : 'từ chối'} yêu cầu tham gia lớp.`);
    setTimeout(() => setNotification(null), 4000);
  };

  const currentClass = classes.find(c => c.id === selectedClassId) || classes[0];

  useEffect(() => {
    if (currentClass) {
      setEditingClassName(currentClass.name);
      setTeacherNameState(currentClass.teacherName || 'Thầy Nguyễn Văn An');
    }
  }, [selectedClassId, classes]);

  const handleUpdateClassName = (newName: string) => {
    setEditingClassName(newName);
    if (currentClass) {
      currentClass.name = newName;
      setClasses([...classes]);
      saveClass(currentClass);
    }
  };

  const handleUpdateTeacherName = (newName: string) => {
    setTeacherNameState(newName);
    if (currentClass) {
      currentClass.teacherName = newName;
      setClasses([...classes]);
      saveClass(currentClass);
    }
  };

  // Phân quyền bảo vệ: Phần sau thì Giáo viên trở lên mới thấy: Nghiệp vụ giảng dạy
  const teacherClassOptions = useMemo(() => {
    const teacherProfile = userProfiles.find(u => u.role === 'teacher' || u.role === 'superadmin' || u.roles?.includes('teacher'));
    if (teacherProfile && Array.isArray(teacherProfile.classIds) && teacherProfile.classIds.length > 0) {
      const classSet = new Set(teacherProfile.classIds.map(c => c.trim().toLowerCase()));
      const filtered = classes.filter(c => classSet.has(c.code.toLowerCase()) || classSet.has(c.name.toLowerCase()) || classSet.has(c.id.toLowerCase()));
      return filtered;
    }
    return classes;
  }, [classes, userProfiles]);

  const [driveNotification, setDriveNotification] = useState<{ message: string; isError?: boolean } | null>(null);

  // Helper xóa tài liệu/phân cấp chuẩn hóa: Kiểm tra xóa bên Google Drive của giáo viên trước, báo thành công mới xóa bên App
  const handleDeleteTeachingMaterialWithDriveCheck = async (pathSegments: string[], itemName: string, onAppDelete: () => void) => {
    setDriveNotification({ message: `Đang kiểm tra và xóa "${itemName}" trên Google Drive của giáo viên. Vui lòng đợi...` });
    const deleteDriveRes = await deleteDriveFolderHierarchy(pathSegments);
    if (!deleteDriveRes.success) {
      const errMsg = deleteDriveRes.error || 'Phiên kết nối Google Drive đã hết hạn (401). Vui lòng bấm Kết nối Drive để xác thực lại.';
      setDriveNotification({ message: errMsg, isError: true });
      return;
    }
    // Khi Drive báo đã xóa xong (hoặc thư mục không tồn tại trên Drive), mới xóa bên App
    onAppDelete();
    setDriveNotification({ message: `Đã xóa "${itemName}" khỏi Google Drive và hệ thống thành công!` });
    setTimeout(() => setDriveNotification(null), 4000);
  };

  if (currentRole && !['superadmin', 'admin', 'manager', 'teacher'].includes(currentRole)) {
    return (
      <div id="teaching-management-restricted" className="p-8 text-center max-w-lg mx-auto my-12 bg-white rounded-2xl border border-emerald-200 shadow-sm space-y-4">
        <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto">
          <Users className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-slate-900">Giới Hạn Quyền Nghiệp Vụ Giảng Dạy</h3>
        <p className="text-xs text-slate-600 leading-relaxed">
          Chỉ <strong>Giáo viên trở lên</strong> (Giáo viên, Quản lý môn, Quản trị viên, Superadmin) mới có quyền truy cập <strong>Nghiệp vụ giảng dạy & Quản lý lớp dạy</strong>.
        </p>
      </div>
    );
  }

  return (
    <div id="teaching-management-view" className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Thông báo tiến trình hoặc lỗi xóa Drive với nút Kết nối Drive trực tiếp */}
      {driveNotification && (
        <div
          className={`p-3.5 rounded-xl text-xs font-bold flex flex-wrap items-center justify-between gap-3 shadow-xs animate-fade-in ${
            driveNotification.isError
              ? 'bg-rose-50 border border-rose-300 text-rose-800'
              : 'bg-amber-50 border border-amber-300 text-amber-900'
          }`}
        >
          <div className="flex items-center gap-2 flex-1 min-w-[220px]">
            {driveNotification.isError ? (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            ) : (
              <Loader2 className="w-4 h-4 text-amber-600 animate-spin shrink-0" />
            )}
            <span>{driveNotification.message}</span>
          </div>
          {driveNotification.isError &&
            (driveNotification.message.includes('401') ||
              driveNotification.message.includes('hết hạn') ||
              driveNotification.message.includes('Kết nối Drive')) && (
              <button
                type="button"
                onClick={async () => {
                  await connectGoogleDrive();
                  setDriveNotification(null);
                }}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-xs inline-flex items-center gap-1.5 shrink-0"
              >
                <Cloud className="w-3.5 h-3.5" />
                <span>Kết nối Drive</span>
              </button>
            )}
        </div>
      )}

      {/* Top Header & Actions */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">Quản Lý Lớp Dạy & Học Sinh</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
              Quyền Giáo Viên
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Giáo viên mở lớp dạy, thêm/xóa học sinh bằng Google Account định danh và sắp xếp sơ đồ lớp
          </p>
          <div className="mt-2 text-[10px] text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1.5 font-medium">
            <span>🛡️ <strong>Bảo mật Drive giáo viên:</strong> Toàn bộ dữ liệu điểm số, sơ đồ lớp và giáo án lưu tại Google Drive của giáo viên. Hệ thống đảm bảo chỉ chính giáo viên và ứng dụng có quyền truy cập; học sinh không thể lấy tài liệu gốc từ Drive.</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Nút Mở lớp dạy mới */}
          <button
            id="btn-open-new-class"
            onClick={() => setShowCreateClassModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Mở lớp dạy mới</span>
          </button>

          {/* Class Selector */}
          <select
            id="select-teaching-class"
            value={selectedClassId}
            onChange={e => handleClassChange(e.target.value)}
            className="text-xs font-bold bg-slate-50 text-slate-800 py-2 px-3 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            {teacherClassOptions.length === 0 ? (
              <option value="">-- (Danh sách rỗng) --</option>
            ) : (
              teacherClassOptions.map((c: ClassItem) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.name}
                </option>
              ))
            )}
          </select>

          {/* Nút Xem GPS Bản đồ Lớp Học (THPT Ba Gia) */}
          <button
            id="btn-open-gps-bagia"
            type="button"
            onClick={() => setShowGpsModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-indigo-700 border border-slate-200 transition-colors cursor-pointer"
            title="Mở bản đồ vị trí GPS (Trường THPT Ba Gia: 15.172233, 108.667440)"
          >
            <MapPin className="w-3.5 h-3.5 text-indigo-600" />
            <span>📍 Bản đồ GPS THPT Ba Gia</span>
          </button>

          {/* Tab buttons */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              id="tab-btn-students"
              onClick={() => setActiveTab('students')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'students'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Học sinh ({classStudents.length})</span>
            </button>
            <button
              id="tab-btn-seating"
              onClick={() => setActiveTab('seating')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'seating'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Sơ đồ chỗ ngồi</span>
            </button>
            <button
              id="tab-btn-pin"
              onClick={() => setActiveTab('pin')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all relative cursor-pointer ${
                activeTab === 'pin'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Duyệt PIN</span>
              {pinRequests.filter(r => r.status === 'pending').length > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: DANH SÁCH HỌC SINH TRONG LỚP (THÊM / XÓA) */}
      {activeTab === 'students' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-100 gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Danh Sách Học Sinh Lớp {currentClass?.name} ({classStudents.length} học sinh)
              </h3>
              <p className="text-xs text-slate-500">
                Định danh bằng tài khoản Google (Email làm khóa chính Firestore)
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                id="btn-open-single-add"
                onClick={() => setShowAddSingleStudentModal(true)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm 1 học sinh</span>
              </button>

              <button
                id="btn-open-excel-import"
                onClick={() => setShowExcelModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Nhập danh sách Excel</span>
              </button>
            </div>
          </div>

          {/* Students Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
               <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3">Họ và Tên</th>
                  <th className="py-2.5 px-3">Biệt Danh</th>
                  <th className="py-2.5 px-3">Google Email</th>
                  <th className="py-2.5 px-3">Mức Độ (1-6)</th>
                  <th className="py-2.5 px-3">Ví Kim Cương</th>
                  <th className="py-2.5 px-3">Mã Học Sinh</th>
                  <th className="py-2.5 px-3">Tọa Độ GPS</th>
                  <th className="py-2.5 px-3">Số Điện Thoại</th>
                  <th className="py-2.5 px-3 text-center">Xóa khỏi lớp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {classStudents.map(std => {
                  const matchedUser = userProfiles.find(u => u.email.toLowerCase() === std.email.toLowerCase());
                  const diamondBalance = matchedUser ? (matchedUser.diamonds !== undefined ? matchedUser.diamonds : 0) : 0;
                  const currentLevel = std.level || 3;
                  const currentLevelDef = QUESTION_LEVELS.find(l => l.level === currentLevel) || QUESTION_LEVELS[2];

                  return (
                    <tr key={std.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-slate-900">{std.name}</td>
                      <td className="py-2.5 px-3">
                        {std.nickname ? (
                          <span className="text-emerald-700 font-medium bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 text-[11px]">
                            {std.nickname}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">{std.email}</td>
                      <td className="py-2.5 px-3">
                        <div className="flex flex-col gap-1">
                          <select
                            value={currentLevel}
                            onChange={(e) => handleUpdateStudentLevelChange(std.id, parseInt(e.target.value, 10))}
                            className={`text-[11px] font-bold py-1 px-2 rounded-lg border cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-indigo-500 ${currentLevelDef.badgeColor}`}
                            title={`Điểm số tương ứng: ${currentLevelDef.scoreRange}`}
                          >
                            {QUESTION_LEVELS.map(ql => (
                              <option key={ql.level} value={ql.level}>
                                {ql.label} ({ql.scoreRange})
                              </option>
                            ))}
                          </select>
                          {std.suggestedLevel && std.suggestedLevel !== currentLevel && (
                            <button
                              type="button"
                              onClick={() => handleUpdateStudentLevelChange(std.id, std.suggestedLevel!)}
                              className="text-[10px] text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200/80 font-medium text-left truncate cursor-pointer hover:bg-indigo-100 transition-colors"
                              title="Áp dụng mức độ gợi ý theo dữ liệu cải thiện kết quả"
                            >
                              💡 Gợi ý: Mức {std.suggestedLevel} (áp dụng)
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-mono font-black text-amber-800 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200/50 flex items-center gap-1 w-fit">
                          💎 {diamondBalance}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-semibold text-indigo-700">{std.studentCode || '—'}</td>
                    <td className="py-2.5 px-3">
                      {std.gps ? (
                        <span className="font-mono text-[11px] text-slate-700 font-semibold bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                          {std.gps}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Chưa lưu</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">{std.phone || '—'}</td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => handleRemoveStudent(std.id, std.name)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Xóa học sinh khỏi lớp dạy"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                  );
                })}
                {classStudents.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-xs text-slate-400 italic">
                      Lớp này chưa có học sinh nào. Giáo viên có thể bấm "Thêm 1 học sinh" hoặc "Nhập danh sách Excel".
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: SEATING PLAN CUSTOMIZATION */}
      {activeTab === 'seating' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Sơ Đồ Vị Trí Chỗ Ngồi Lớp {editingClassName || currentClass?.name}
              </h3>
              <p className="text-xs text-slate-500">
                Phân bổ vị trí chỗ ngồi trực quan cho học sinh trong phòng học
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDoorOnLeft(prev => !prev)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 transition-colors cursor-pointer shadow-2xs"
                title="Bấm để đổi vị trí Cửa ra vào với Bàn giáo viên"
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-amber-700" />
                <span>Đổi Cửa ⇄ Bàn GV</span>
              </button>
              <button
                id="btn-save-seating-plan"
                onClick={handleSaveSeating}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Lưu Sơ Đồ Lớp</span>
              </button>
            </div>
          </div>

          {seatingPlan && (
            <div className="space-y-4">
              {/* Thanh Chú Thích 4 Vị Trí Chức Danh */}
              <div className="p-3.5 bg-slate-900 text-white rounded-2xl border border-slate-800 text-xs space-y-2.5 shadow-md">
                <div className="font-bold text-amber-300 flex items-center gap-1.5">
                  <span>📍 Vòng Tròn Icon Nam / Icon Nữ & 4 Vị Trí Chức Danh Học Sinh:</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-medium">
                  <div className="bg-slate-800/90 p-2 rounded-xl border border-slate-700/80 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-2xs bg-amber-500 shrink-0"></span>
                    <span><strong>Trái - Trên:</strong> Điều hành (LT, LP, PHT...)</span>
                  </div>
                  <div className="bg-slate-800/90 p-2 rounded-xl border border-slate-700/80 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-2xs bg-indigo-600 shrink-0"></span>
                    <span><strong>Trái - Dưới:</strong> Tổ (TT1, TP2, Tổ 1-4...)</span>
                  </div>
                  <div className="bg-slate-800/90 p-2 rounded-xl border border-slate-700/80 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-2xs bg-rose-600 shrink-0"></span>
                    <span><strong>Phải - Trên:</strong> Đoàn (BT, PBT, UV...)</span>
                  </div>
                  <div className="bg-slate-800/90 p-2 rounded-xl border border-slate-700/80 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-2xs bg-emerald-600 shrink-0"></span>
                    <span><strong>Phải - Dưới:</strong> BCS Bộ môn (CS Toán, CS Văn...)</span>
                  </div>
                </div>
              </div>

              {/* KHUNG TIÊU ĐỀ: CỬA RA VÀO - BẢNG - BÀN GIÁO VIÊN */}
              <div className="flex items-center justify-between gap-2 max-w-2xl mx-auto my-2">
                {(() => {
                  const DoorBlock = (
                    <div key="door" className="py-2 px-3 rounded-xl bg-slate-100 border border-slate-300 text-slate-800 text-center font-black text-xs uppercase shadow-2xs shrink-0">
                      🚪 CỬA RA VÀO
                    </div>
                  );

                  const TeacherBlock = (
                    <div key="teacher" className="py-2 px-3.5 rounded-xl bg-amber-50 border-2 border-amber-300 text-amber-950 text-center font-black text-xs uppercase shadow-2xs shrink-0">
                      <div>💼 BÀN GIÁO VIÊN</div>
                      <div className="flex flex-col items-center justify-center gap-0.5 text-[10px] text-amber-900 font-bold normal-case mt-0.5">
                        <div className="flex items-center gap-0.5">
                          <span>GVCN:</span>
                          <input
                            type="text"
                            value={teacherNameState}
                            onChange={e => handleUpdateTeacherName(e.target.value)}
                            className="w-22 bg-white/90 border border-amber-300 rounded px-1 py-0.5 text-[10px] font-black text-amber-950 focus:outline-hidden"
                            title="Bấm để sửa tên GVCN"
                          />
                        </div>
                        <div className="flex items-center gap-0.5">
                          <span>SĐT:</span>
                          <input
                            type="text"
                            value={teacherPhoneState}
                            onChange={e => setTeacherPhoneState(e.target.value)}
                            className="w-22 bg-white/90 border border-amber-300 rounded px-1 py-0.5 text-[10px] font-black text-amber-950 focus:outline-hidden"
                            title="Bấm để sửa SĐT GVCN"
                          />
                        </div>
                      </div>
                    </div>
                  );

                  const BoardBlock = (
                    <div key="board" className="flex-1 text-center py-2 px-3 rounded-xl bg-slate-50 border-2 border-dashed border-slate-300 text-slate-800 font-black text-xs uppercase shadow-2xs">
                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        <span>LỚP</span>
                        <input
                          type="text"
                          value={editingClassName}
                          onChange={e => handleUpdateClassName(e.target.value)}
                          className="w-20 bg-white border border-indigo-300 rounded px-1 py-0.5 text-xs font-black text-indigo-950 text-center uppercase focus:outline-hidden"
                          title="Bấm để chỉnh sửa tên lớp"
                        />
                      </div>
                      <div className="text-[10px] text-slate-500 font-bold normal-case mt-0.5 space-y-0.5">
                        <div>GVCN: {teacherNameState}</div>
                        <div>SĐT: {teacherPhoneState}</div>
                      </div>
                    </div>
                  );

                  return doorOnLeft ? [DoorBlock, BoardBlock, TeacherBlock] : [TeacherBlock, BoardBlock, DoorBlock];
                })()}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 max-w-4xl mx-auto pt-2">
                {seatingPlan.seats.map((seat, idx) => {
                  const isFemale = idx % 2 === 1;
                  const dieuHanh = seat.studentName ? (idx === 0 ? 'LT' : idx === 1 ? 'LP' : idx === 2 ? 'PHT' : '') : '';
                  const to = seat.studentName ? (idx === 0 || idx === 1 ? 'TT1' : idx === 3 ? 'TP2' : `Tổ ${(idx % 4) + 1}`) : '';
                  const doan = seat.studentName ? (idx === 1 ? 'BT' : idx === 4 ? 'PBT' : idx === 5 ? 'UV' : '') : '';
                  const mon = seat.studentName ? (idx === 2 ? 'CS Toán' : idx === 3 ? 'CS Văn' : idx === 6 ? 'CS Anh' : '') : '';

                  // Tìm học sinh tương ứng để lấy duy nhất Biệt danh (nickname)
                  const matchedStudent = classStudents.find(
                    s => s.id === seat.studentId || s.name === seat.studentName || (seat.studentCode && s.studentCode === seat.studentCode)
                  );

                  let nicknameDisplay = '';
                  if (matchedStudent?.nickname?.trim()) {
                    nicknameDisplay = matchedStudent.nickname.trim();
                  } else if (seat.studentName) {
                    const parenMatch = seat.studentName.match(/\(([^)]+)\)/);
                    if (parenMatch && parenMatch[1].trim()) {
                      nicknameDisplay = parenMatch[1].trim();
                    } else {
                      const parts = seat.studentName.trim().split(/\s+/);
                      nicknameDisplay = parts[parts.length - 1];
                    }
                  }

                  return seat.studentName ? (
                    <StudentCardBox
                      key={seat.id}
                      isFemale={isFemale}
                      dieuHanh={dieuHanh}
                      to={to}
                      doan={doan}
                      mon={mon}
                      nickname={nicknameDisplay}
                      fullName={seat.studentName}
                      studentCode={seat.studentCode || `HS-${idx + 1}`}
                      seatLabel={`H${seat.row}-C${seat.col}`}
                    />
                  ) : (
                    <div
                      key={seat.id}
                      className="p-2.5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center text-xs flex flex-col justify-between items-center py-4 text-slate-400 min-h-[110px]"
                    >
                      <div className="text-[10px] text-slate-400 font-bold">
                        H{seat.row}-C{seat.col}
                      </div>
                      <div className="w-10 h-10 mx-auto rounded-full border border-dashed border-slate-300 flex items-center justify-center text-slate-300 text-lg font-light">+</div>
                      <div className="text-[10px] text-slate-400 mt-1">Chỗ trống</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: REVIEW PIN REQUESTS */}
      {activeTab === 'pin' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Duyệt Yêu Cầu Mã PIN Vào Lớp</h3>
              <p className="text-xs text-slate-500">
                Xét duyệt học sinh nhập đúng mã PIN lớp học để chấp nhận vào danh sách lớp
              </p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60">
              Mã PIN lớp hiện tại: <span className="font-mono font-extrabold">{currentClass?.pinCode}</span>
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {pinRequests.length > 0 ? (
              pinRequests.map(req => (
                <div
                  key={req.id}
                  className="py-4 flex flex-wrap items-center justify-between gap-4 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">{req.studentName}</span>
                      <span className="text-slate-400">({req.studentEmail})</span>
                    </div>
                    <div className="text-slate-500 text-[11px]">
                      Lớp: <span className="font-semibold text-slate-700">{req.className}</span> •
                      Mã PIN học sinh đã nhập: <span className="font-mono font-bold text-indigo-600">{req.submittedPin}</span> •
                      Thời gian: {req.requestDate}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {req.status === 'pending' ? (
                      <>
                        <button
                          onClick={() => handleReviewPin(req.id, 'approved')}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Duyệt
                        </button>
                        <button
                          onClick={() => handleReviewPin(req.id, 'rejected')}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Từ chối
                        </button>
                      </>
                    ) : (
                      <span
                        className={`px-3 py-1 rounded-full font-bold text-xs ${
                          req.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {req.status === 'approved' ? '✓ Đã duyệt' : '✗ Đã từ chối'}
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-slate-400 italic">
                Chưa có yêu cầu mã PIN nào từ học sinh.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Mở lớp dạy mới */}
      {showCreateClassModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">Giáo Viên Mở Lớp Dạy Mới</h3>
              <button
                onClick={() => setShowCreateClassModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNewClass} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase">Tên lớp học</label>
                <input
                  type="text"
                  required
                  placeholder="VD: 10A1 - Chuyên Toán / Luyện Thi Đại Học..."
                  value={newClassName}
                  onChange={e => setNewClassName(e.target.value)}
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 uppercase">Mã lớp</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: 10A1 / 11B2..."
                    value={newClassCode}
                    onChange={e => setNewClassCode(e.target.value)}
                    className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl uppercase font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1 uppercase">Mã PIN vào lớp</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: 888999..."
                    value={newClassPin}
                    onChange={e => setNewClassPin(e.target.value)}
                    className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 uppercase">Khối lớp</label>
                  <select
                    value={newClassGrade}
                    onChange={e => setNewClassGrade(e.target.value)}
                    className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  >
                    <option value="">-- (Để trống) --</option>
                    <option value="Khối 10">Khối 10</option>
                    <option value="Khối 11">Khối 11</option>
                    <option value="Khối 12">Khối 12</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1 uppercase">Môn giảng dạy</label>
                  <select
                    value={newClassSubject}
                    onChange={e => setNewClassSubject(e.target.value)}
                    className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  >
                    <option value="">-- (Để trống) --</option>
                    <option value="Toán Học">Toán Học</option>
                    <option value="Vật Lý">Vật Lý</option>
                    <option value="Hóa Học">Hóa Học</option>
                    <option value="Ngữ Văn">Ngữ Văn</option>
                    <option value="Tiếng Anh">Tiếng Anh</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateClassModal(false)}
                  className="px-4 py-2 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer"
                >
                  Mở lớp ngay
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Thêm 1 học sinh đơn lẻ */}
      {showAddSingleStudentModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">Thêm Học Sinh Vào Lớp {currentClass?.name}</h3>
              <button
                onClick={() => setShowAddSingleStudentModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSingleStudent} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase">Họ và tên học sinh</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Nguyễn Văn Cường..."
                  value={studentName}
                  onChange={e => setStudentName(e.target.value)}
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase">Google Email (Khóa chính định danh)</label>
                <input
                  type="email"
                  required
                  placeholder="VD: cuong.nguyen@student.lopu.edu.vn"
                  value={studentEmail}
                  onChange={e => setStudentEmail(e.target.value)}
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 uppercase">Mã Học Sinh</label>
                  <input
                    type="text"
                    placeholder="VD: HS-1099..."
                    value={studentCode}
                    onChange={e => setStudentCode(e.target.value)}
                    className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl uppercase font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1 uppercase">Số điện thoại</label>
                  <input
                    type="text"
                    placeholder="VD: 0912345678..."
                    value={studentPhone}
                    onChange={e => setStudentPhone(e.target.value)}
                    className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddSingleStudentModal(false)}
                  className="px-4 py-2 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer"
                >
                  Thêm vào lớp
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Import Excel with Anti-Duplicate Engine */}
      {showExcelModal && currentClass && (
        <ModalThemHocSinhExcel
          isOpen={true}
          classId={currentClass.id}
          className={currentClass.name}
          onClose={() => setShowExcelModal(false)}
          onSuccess={report => {
            loadAllData();
            setNotification(
              `Đã thêm ${report.addedToClass} học sinh vào lớp (${report.newUsersCreated} tài khoản mới, ${report.linkedExistingUsers} đã liên kết sẵn). Tự động tránh trùng lặp: bỏ qua ${report.skippedDuplicates} học sinh!`
            );
            setTimeout(() => setNotification(null), 6000);
          }}
        />
      )}

      {/* Modal Bản Đồ Vị Trí GPS - Trường THPT Ba Gia */}
      {showGpsModal && (
        <GpsPickerModal
          title="Google Maps — Bản Đồ GPS Trường THPT Ba Gia"
          userNameOrContext={`Lớp ${currentClass?.name || 'THPT Ba Gia'}`}
          initialLat={15.172233}
          initialLng={108.667440}
          onClose={() => setShowGpsModal(false)}
          onConfirm={(coordsStr, lat, lng) => {
            setShowGpsModal(false);
            setNotification(`Đã xác nhận vị trí GPS lớp học: ${coordsStr} (Trường THPT Ba Gia)`);
            setTimeout(() => setNotification(null), 4000);
          }}
        />
      )}
    </div>
  );
};

