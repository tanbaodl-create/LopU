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
  Key,
  Plus,
  Users,
  Check,
  X,
  FileSpreadsheet,
  Trash2,
  UserPlus,
  Loader2,
  AlertCircle,
  GraduationCap,
} from 'lucide-react';
import { ClassItem, UserProfile, UserRole, PinJoinRequest, StudentProfile } from '../../../services/storageTypes';
import {
  getClasses,
  saveClass,
  getUsers,
  getPinRequests,
  reviewPinRequest,
  getStudentsByClassId,
  removeStudentFromClass,
} from '../../ConnectData/ConnectFirestore';
import { getDriveConnectionState } from '../../ConnectData/ConnectDrive';
import { ModalThemHocSinhExcel, themMotHocSinh } from '../../ModuleGiaoVien/NhapHocSinh';

export interface PhanQuyenLopHocViewProps {
  currentRole?: UserRole;
}

export const PhanQuyenLopHocView: React.FC<PhanQuyenLopHocViewProps> = ({ currentRole }) => {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [teachers, setTeachers] = useState<UserProfile[]>([]);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('');
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<string>('');
  const [pinInputs, setPinInputs] = useState<Record<string, string>>({});
  const [notification, setNotification] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [driveConn, setDriveConn] = useState(getDriveConnectionState());

  // Active Sub-tab in PhanQuyenLopHoc
  const [activeTab, setActiveTab] = useState<'classes' | 'pin_requests' | 'students'>('classes');

  // PIN Requests State
  const [pinRequests, setPinRequests] = useState<PinJoinRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState<boolean>(false);

  // Student Management State
  const [selectedClassForStudents, setSelectedClassForStudents] = useState<string>('');
  const [classStudents, setClassStudents] = useState<StudentProfile[]>([]);
  const [showExcelModal, setShowExcelModal] = useState<boolean>(false);
  const [showSingleStudentModal, setShowSingleStudentModal] = useState<boolean>(false);
  const [newStudentName, setNewStudentName] = useState<string>('');
  const [newStudentCode, setNewStudentCode] = useState<string>('');
  const [newStudentEmail, setNewStudentEmail] = useState<string>('');

  // Create Class Modal State
  const [showCreateClassModal, setShowCreateClassModal] = useState<boolean>(false);
  const [newClassName, setNewClassName] = useState<string>('');
  const [newClassCode, setNewClassCode] = useState<string>('');
  const [newClassGrade, setNewClassGrade] = useState<string>('Khối 10');
  const [newClassSubject, setNewClassSubject] = useState<string>('Toán Học');
  const [newClassPin, setNewClassPin] = useState<string>('123456');

  const loadData = async () => {
    setDriveConn(getDriveConnectionState());
    const list = await getClasses();
    setClasses(list);
    if (list.length > 0 && !selectedClassForStudents) {
      setSelectedClassForStudents(list[0].id);
    }
    const allUsers = await getUsers();
    setTeachers(allUsers.filter(u => u.role === 'teacher' || u.role === 'admin' || u.role === 'superadmin' || u.role === 'manager'));
    const initialPins: Record<string, string> = {};
    list.forEach(c => {
      initialPins[c.id] = c.pinCode;
    });
    setPinInputs(initialPins);

    // Load PIN requests
    setLoadingRequests(true);
    const reqs = await getPinRequests();
    setPinRequests(reqs);
    setLoadingRequests(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedClassForStudents) {
      getStudentsByClassId(selectedClassForStudents).then(stds => setClassStudents(stds));
    }
  }, [selectedClassForStudents]);

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

  // Mở Lớp Dạy Mới
  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim() || !newClassCode.trim()) return;

    const newCls: ClassItem = {
      id: `class_${Date.now()}`,
      code: newClassCode.trim().toUpperCase(),
      name: newClassName.trim(),
      subject: newClassSubject,
      grade: newClassGrade,
      teacherId: 'u_gv01',
      teacherName: 'Giáo viên phụ trách',
      room: 'Phòng 101',
      pinCode: newClassPin.trim() || '123456',
      requirePin: true,
      description: `Lớp dạy môn ${newClassSubject} năm học 2025 - 2026`,
      studentCount: 0,
      studentIds: [],
      academicYear: '2025 - 2026',
      semester: 'Học kỳ I',
      lessons: [],
      color: 'blue',
    };

    await saveClass(newCls);
    setClasses([newCls, ...classes]);
    setShowCreateClassModal(false);
    setNewClassName('');
    setNewClassCode('');
    setNotification(`Đã mở lớp dạy mới thành công: [${newCls.code}] ${newCls.name}!`);
    setTimeout(() => setNotification(null), 4000);
  };

  // Review PIN Request
  const handleReviewRequest = async (requestId: string, status: 'approved' | 'rejected') => {
    await reviewPinRequest(requestId, status);
    setPinRequests(prev => prev.map(r => (r.id === requestId ? { ...r, status } : r)));
    setNotification(status === 'approved' ? 'Đã duyêt học sinh vào lớp thành công!' : 'Đã từ chối yêu cầu.');
    setTimeout(() => setNotification(null), 3000);
  };

  // Remove Student from class
  const handleRemoveStudent = async (studentId: string) => {
    if (!selectedClassForStudents) return;
    await removeStudentFromClass(selectedClassForStudents, studentId);
    setClassStudents(prev => prev.filter(s => s.id !== studentId));
    setNotification('Đã xóa học sinh khỏi lớp.');
    setTimeout(() => setNotification(null), 3000);
  };

  // Add Single Student
  const handleAddSingleStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim() || !selectedClassForStudents) return;
    await themMotHocSinh(selectedClassForStudents, {
      name: newStudentName.trim(),
      email: newStudentEmail.trim() || `std_${Date.now()}@school.edu.vn`,
      studentCode: newStudentCode.trim() || `HS${Date.now().toString().slice(-4)}`,
    });
    const updated = await getStudentsByClassId(selectedClassForStudents);
    setClassStudents(updated);
    setShowSingleStudentModal(false);
    setNewStudentName('');
    setNewStudentCode('');
    setNewStudentEmail('');
    setNotification('Đã thêm học sinh vào lớp!');
    setTimeout(() => setNotification(null), 3000);
  };

  // Allow Teacher, Manager, Admin, Superadmin
  if (
    currentRole &&
    currentRole !== 'admin' &&
    currentRole !== 'superadmin' &&
    currentRole !== 'teacher' &&
    currentRole !== 'manager'
  ) {
    return (
      <div id="settings-permissions-restricted" className="p-8 text-center max-w-lg mx-auto my-12 bg-white rounded-2xl border border-amber-200 shadow-xs space-y-4">
        <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto">
          <Lock className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-slate-900">Giới Hạn Quyền Phân Quyền & Quản Lý Lớp</h3>
        <p className="text-xs text-slate-600 leading-relaxed">
          Chỉ <strong>Giáo viên, Quản lý và Quản trị viên (Admin)</strong> mới có quyền xem và điều phối tại phân hệ này.
        </p>
      </div>
    );
  }

  const pendingRequests = pinRequests.filter(r => r.status === 'pending');

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-slate-900">
                Quản Lý Lớp Dạy & Mã PIN Truy Cập
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Nghiệp vụ Giảng dạy
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Phân công giáo viên phụ trách môn, thiết lập mã PIN bảo mật lớp học, mở lớp mới và duyệt yêu cầu tham gia
            </p>
          </div>
          <button
            onClick={() => setShowCreateClassModal(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Mở Lớp Dạy Mới</span>
          </button>
        </div>

        {/* Roles Policy Overview */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-600 space-y-1.5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="font-bold text-slate-700 flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-indigo-600" /> Quy chế phân quyền & Mã PIN:
            </span>
            <span>• <strong>Quản trị / Giáo viên</strong>: Mở lớp, duyệt mã PIN, phân công giáo viên phụ trách</span>
            <span>• <strong>Học sinh</strong>: Nhập đúng mã PIN để gửi yêu cầu tham gia lớp</span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('classes')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'classes'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Key className="w-4 h-4" />
          <span>Danh Sách Lớp & Mã PIN ({classes.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('pin_requests')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer relative ${
            activeTab === 'pin_requests'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Duyệt Yêu Cầu Mã PIN</span>
          {pendingRequests.length > 0 && (
            <span className="bg-rose-500 text-white text-[10px] px-2 py-0.2 rounded-full font-bold">
              {pendingRequests.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('students')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'students'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Thành Viên Lớp Học</span>
        </button>
      </div>

      {/* TAB 1: DANH SÁCH LỚP & MÃ PIN */}
      {activeTab === 'classes' && (
        <div className="space-y-4">
          {/* Lọc danh sách theo Môn học & Khối lớp */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-bold text-slate-800">Danh Sách Lớp Dạy & Mã PIN Bảo Mật</span>
              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                {classes.filter(c => (!selectedSubjectFilter || selectedSubjectFilter === 'all' || c.subject === selectedSubjectFilter) && (!selectedGradeFilter || selectedGradeFilter === 'all' || c.grade === selectedGradeFilter)).length} lớp
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-500 font-medium">Môn:</span>
                <select
                  value={selectedSubjectFilter}
                  onChange={e => setSelectedSubjectFilter(e.target.value)}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-semibold focus:outline-indigo-600 bg-white"
                >
                  <option value="">-- Tất cả môn --</option>
                  <option value="Toán Học">Toán Học</option>
                  <option value="Vật Lý">Vật Lý</option>
                  <option value="Hóa Học">Hóa Học</option>
                  <option value="Ngữ Văn">Ngữ Văn</option>
                  <option value="Tiếng Anh">Tiếng Anh</option>
                  <option value="Sinh Học">Sinh Học</option>
                </select>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-500 font-medium">Khối:</span>
                <select
                  value={selectedGradeFilter}
                  onChange={e => setSelectedGradeFilter(e.target.value)}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-semibold focus:outline-indigo-600 bg-white"
                >
                  <option value="">-- Tất cả khối --</option>
                  <option value="Khối 10">Khối 10</option>
                  <option value="Khối 11">Khối 11</option>
                  <option value="Khối 12">Khối 12</option>
                </select>
              </div>
            </div>
          </div>

          {/* Classes Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {classes
              .filter(c => (!selectedSubjectFilter || selectedSubjectFilter === 'all' || c.subject === selectedSubjectFilter) && (!selectedGradeFilter || selectedGradeFilter === 'all' || c.grade === selectedGradeFilter))
              .map(cls => {
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

                    {/* Phân công giáo viên */}
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
                            {t.name} ({t.email})
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
      )}

      {/* TAB 2: DUYỆT YÊU CẦU MÃ PIN */}
      {activeTab === 'pin_requests' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-slate-900">Yêu Cầu Tham Gia Lớp Qua Mã PIN</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Duyệt hoặc từ chối các yêu cầu xin vào lớp bằng mã PIN từ học sinh
              </p>
            </div>
            <button
              onClick={loadData}
              className="text-xs font-semibold px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
            >
              Làm mới
            </button>
          </div>

          {loadingRequests ? (
            <div className="py-8 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
              <span>Đang tải danh sách yêu cầu...</span>
            </div>
          ) : pinRequests.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-100 text-slate-500 text-xs">
              Hiện chưa có yêu cầu nhập mã PIN nào từ học sinh.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {pinRequests.map(req => (
                <div key={req.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900">{req.studentName}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                        Lớp: {req.className}
                      </span>
                      <span className="text-[10px] text-slate-400">{req.requestDate}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{req.studentEmail}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    {req.status === 'pending' ? (
                      <>
                        <button
                          onClick={() => handleReviewRequest(req.id, 'approved')}
                          className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Duyệt</span>
                        </button>
                        <button
                          onClick={() => handleReviewRequest(req.id, 'rejected')}
                          className="flex items-center gap-1 px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-lg text-xs font-bold cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Từ chối</span>
                        </button>
                      </>
                    ) : (
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-md ${
                        req.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {req.status === 'approved' ? 'Đã duyệt' : 'Đã từ chối'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: THÀNH VIÊN LỚP HỌC */}
      {activeTab === 'students' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">Chọn Lớp Học:</span>
              <select
                value={selectedClassForStudents}
                onChange={e => setSelectedClassForStudents(e.target.value)}
                className="py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
              >
                {classes.map(c => (
                  <option key={c.id} value={c.id}>
                    [{c.code}] {c.name} ({c.grade})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowExcelModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold cursor-pointer transition-all"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Nhập Học Sinh Excel</span>
              </button>
              <button
                onClick={() => setShowSingleStudentModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold cursor-pointer transition-all"
              >
                <UserPlus className="w-4 h-4" />
                <span>Thêm 1 Học Sinh</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Mã Học Sinh</th>
                  <th className="py-2.5 px-3">Họ và Tên</th>
                  <th className="py-2.5 px-3">Email</th>
                  <th className="py-2.5 px-3">SĐT</th>
                  <th className="py-2.5 px-3 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {classStudents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      Lớp này chưa có danh sách học sinh. Bấm thêm học sinh để thêm mới.
                    </td>
                  </tr>
                ) : (
                  classStudents.map((std, idx) => (
                    <tr key={std.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 text-slate-400 font-mono">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-indigo-700">{std.studentCode || 'N/A'}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{std.name}</td>
                      <td className="py-2.5 px-3 text-slate-500">{std.email || 'Chưa cập nhật'}</td>
                      <td className="py-2.5 px-3 text-slate-500">{std.phone || 'N/A'}</td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => handleRemoveStudent(std.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                          title="Xóa khỏi lớp"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL MỞ LỚP DẠY MỚI */}
      {showCreateClassModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-indigo-600" />
                <span>Mở Lớp Dạy Mới</span>
              </h3>
              <button
                onClick={() => setShowCreateClassModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateClass} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tên Lớp Học *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Lớp 10A1 chuyên Toán"
                  value={newClassName}
                  onChange={e => setNewClassName(e.target.value)}
                  className="w-full py-2 px-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mã Lớp (Code) *</label>
                  <input
                    type="text"
                    required
                    placeholder="L10A1"
                    value={newClassCode}
                    onChange={e => setNewClassCode(e.target.value.toUpperCase())}
                    className="w-full py-2 px-3 border border-slate-300 rounded-xl uppercase font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Khối Lớp</label>
                  <select
                    value={newClassGrade}
                    onChange={e => setNewClassGrade(e.target.value)}
                    className="w-full py-2 px-3 border border-slate-300 rounded-xl font-medium bg-white"
                  >
                    <option value="Khối 10">Khối 10</option>
                    <option value="Khối 11">Khối 11</option>
                    <option value="Khối 12">Khối 12</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Môn Học</label>
                  <select
                    value={newClassSubject}
                    onChange={e => setNewClassSubject(e.target.value)}
                    className="w-full py-2 px-3 border border-slate-300 rounded-xl font-medium bg-white"
                  >
                    <option value="Toán Học">Toán Học</option>
                    <option value="Vật Lý">Vật Lý</option>
                    <option value="Hóa Học">Hóa Học</option>
                    <option value="Ngữ Văn">Ngữ Văn</option>
                    <option value="Tiếng Anh">Tiếng Anh</option>
                    <option value="Sinh Học">Sinh Học</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mã PIN Mở Lớp</label>
                  <input
                    type="text"
                    placeholder="123456"
                    value={newClassPin}
                    onChange={e => setNewClassPin(e.target.value.toUpperCase())}
                    className="w-full py-2 px-3 border border-slate-300 rounded-xl font-mono uppercase font-bold"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateClassModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer shadow-xs"
                >
                  Tạo Lớp
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL THÊM 1 HỌC SINH */}
      {showSingleStudentModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-indigo-600" />
                <span>Thêm 1 Học Sinh Vào Lớp</span>
              </h3>
              <button
                onClick={() => setShowSingleStudentModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSingleStudent} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Họ và Tên *</label>
                <input
                  type="text"
                  required
                  placeholder="Nguyễn Văn A"
                  value={newStudentName}
                  onChange={e => setNewStudentName(e.target.value)}
                  className="w-full py-2 px-3 border border-slate-300 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Mã Học Sinh</label>
                <input
                  type="text"
                  placeholder="HS001"
                  value={newStudentCode}
                  onChange={e => setNewStudentCode(e.target.value.toUpperCase())}
                  className="w-full py-2 px-3 border border-slate-300 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  placeholder="hocsinh@gmail.com"
                  value={newStudentEmail}
                  onChange={e => setNewStudentEmail(e.target.value)}
                  className="w-full py-2 px-3 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSingleStudentModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold cursor-pointer"
                >
                  Thêm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NHẬP HỌC SINH EXCEL */}
      {showExcelModal && selectedClassForStudents && (
        <ModalThemHocSinhExcel
          isOpen={showExcelModal}
          classId={selectedClassForStudents}
          className={classes.find(c => c.id === selectedClassForStudents)?.name || ''}
          onClose={() => setShowExcelModal(false)}
          onSuccess={async () => {
            const updated = await getStudentsByClassId(selectedClassForStudents);
            setClassStudents(updated);
            setShowExcelModal(false);
            setNotification('Đã nhập danh sách học sinh Excel thành công!');
            setTimeout(() => setNotification(null), 3000);
          }}
        />
      )}
    </div>
  );
};
