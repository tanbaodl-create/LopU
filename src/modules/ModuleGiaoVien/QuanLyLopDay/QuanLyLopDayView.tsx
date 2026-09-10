import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { ClassItem, ClassSeatingPlan, PinJoinRequest, StudentProfile } from '../../../services/storageTypes';
import {
  getClasses,
  getSeatingPlan,
  saveSeatingPlan,
  getPinRequests,
  reviewPinRequest,
  saveClass,
  getStudentsByClassId,
  removeStudentFromClass,
} from '../../ConnectData/ConnectFirestore';
import { ModalThemHocSinhExcel, themMotHocSinh } from '../NhapHocSinh';

export const QuanLyLopDayView: React.FC = () => {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('class_10a1');
  const [seatingPlan, setSeatingPlan] = useState<ClassSeatingPlan | null>(null);
  const [classStudents, setClassStudents] = useState<StudentProfile[]>([]);
  const [activeTab, setActiveTab] = useState<'students' | 'seating' | 'pin'>('students');
  const [pinRequests, setPinRequests] = useState<PinJoinRequest[]>([]);
  const [notification, setNotification] = useState<string | null>(null);
  const [showExcelModal, setShowExcelModal] = useState<boolean>(false);

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

  return (
    <div id="teaching-management-view" className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{notification}</span>
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
            {classes.map(c => (
              <option key={c.id} value={c.id}>
                {c.code} — {c.name}
              </option>
            ))}
          </select>

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
                  <th className="py-2.5 px-3">Mã Học Sinh</th>
                  <th className="py-2.5 px-3">Tọa Độ GPS</th>
                  <th className="py-2.5 px-3">Số Điện Thoại</th>
                  <th className="py-2.5 px-3 text-center">Xóa khỏi lớp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {classStudents.map(std => (
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
                ))}
                {classStudents.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-xs text-slate-400 italic">
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
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Sơ Đồ Vị Trí Chỗ Ngồi Lớp {currentClass?.name}
              </h3>
              <p className="text-xs text-slate-500">
                Phân bổ vị trí chỗ ngồi trực quan cho học sinh trong phòng học
              </p>
            </div>
            <button
              id="btn-save-seating-plan"
              onClick={handleSaveSeating}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Lưu Sơ Đồ Lớp</span>
            </button>
          </div>

          {seatingPlan && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-800 text-white text-center rounded-xl text-xs font-bold uppercase tracking-wider max-w-sm mx-auto">
                BỤC GIẢNG GIÁO VIÊN
              </div>

              <div className="grid grid-cols-6 gap-2.5 max-w-3xl mx-auto pt-2">
                {seatingPlan.seats.map(seat => (
                  <div
                    key={seat.id}
                    className={`p-2.5 rounded-xl border text-center text-xs transition-all ${
                      seat.studentName
                        ? 'bg-slate-50 border-slate-300'
                        : 'bg-white border-dashed border-slate-200 text-slate-400'
                    }`}
                  >
                    <div className="text-[10px] text-slate-400 font-bold mb-1">
                      H{seat.row}-C{seat.col}
                    </div>
                    {seat.studentName ? (
                      <>
                        <div className="font-bold text-slate-800 text-xs truncate">
                          {seat.studentName}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{seat.studentCode}</div>
                      </>
                    ) : (
                      <div className="text-[11px] text-slate-400 py-1">Chỗ trống</div>
                    )}
                  </div>
                ))}
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
    </div>
  );
};

