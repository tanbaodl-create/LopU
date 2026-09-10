import React, { useState, useEffect } from 'react';
import {
  Search,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  MapPin,
} from 'lucide-react';
import { ClassItem, PinJoinRequest } from '../../../services/storageTypes';
import { getClasses, getPinRequests, submitPinRequest } from '../../ConnectData/ConnectFirestore';

export const DangKyLopView: React.FC = () => {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [pinRequests, setPinRequests] = useState<PinJoinRequest[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedClassToJoin, setSelectedClassToJoin] = useState<ClassItem | null>(null);
  const [inputPin, setInputPin] = useState<string>('');
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    async function load() {
      const clsList = await getClasses();
      setClasses(clsList);
      const reqs = await getPinRequests();
      setPinRequests(reqs);
    }
    load();
  }, []);

  const filteredClasses = classes.filter(
    c =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.teacherName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmitPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassToJoin) return;
    if (!inputPin.trim()) {
      setActionMessage({ type: 'error', text: 'Vui lòng nhập mã PIN bảo mật của lớp học.' });
      return;
    }

    setSubmitting(true);
    const res = await submitPinRequest({
      classId: selectedClassToJoin.id,
      className: selectedClassToJoin.name,
      studentId: 'u_hs01',
      studentName: 'Lê Minh Khang',
      studentEmail: 'khang.le@student.lopu.edu.vn',
      submittedPin: inputPin.trim(),
    });

    setSubmitting(false);

    if (res.success) {
      setActionMessage({ type: 'success', text: res.message });
      setSelectedClassToJoin(null);
      setInputPin('');
      const updatedReqs = await getPinRequests();
      setPinRequests(updatedReqs);
    } else {
      setActionMessage({ type: 'error', text: res.message });
    }
  };

  return (
    <div id="learning-join-view" className="space-y-6">
      {/* Toast Alert */}
      {actionMessage && (
        <div
          className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 shadow-xs ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          {actionMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* Header & Search Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Tìm Lớp & Đăng Ký Học Với Mã PIN</h2>
            <p className="text-xs text-slate-500 mt-1">
              Nhập mã định danh lớp hoặc tìm kiếm tên giáo viên để đăng ký tham gia lớp mới.
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              id="input-search-class"
              type="text"
              placeholder="Tìm theo tên môn, mã lớp, giáo viên..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Classes List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClasses.map(c => {
          const hasRequested = pinRequests.find(r => r.classId === c.id);

          return (
            <div
              key={c.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between hover:border-indigo-300 transition-all group"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700">
                    {c.code}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">
                    <KeyRound className="w-3 h-3" /> Cần PIN
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {c.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {c.description}
                  </p>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs text-slate-600">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-slate-500">
                      <User className="w-3.5 h-3.5" /> Giáo viên:
                    </span>
                    <span className="font-semibold text-slate-800">{c.teacherName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-slate-500">
                      <MapPin className="w-3.5 h-3.5" /> Phòng học:
                    </span>
                    <span className="font-semibold text-slate-800">{c.room}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-3 border-t border-slate-100">
                {hasRequested ? (
                  <div
                    className={`w-full py-2 px-3 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-1.5 ${
                      hasRequested.status === 'approved'
                        ? 'bg-emerald-100 text-emerald-800'
                        : hasRequested.status === 'rejected'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      {hasRequested.status === 'approved'
                        ? 'Đã duyệt (Thành viên chính thức)'
                        : hasRequested.status === 'rejected'
                        ? 'Yêu cầu bị từ chối'
                        : 'Đang chờ giáo viên duyệt'}
                    </span>
                  </div>
                ) : (
                  <button
                    id={`btn-join-class-${c.id}`}
                    onClick={() => {
                      setSelectedClassToJoin(c);
                      setInputPin('');
                      setActionMessage(null);
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors cursor-pointer"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Nhập mã PIN tham gia</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal / Dialog for entering PIN */}
      {selectedClassToJoin && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Xác thực mã PIN lớp học</h3>
                  <p className="text-[11px] text-slate-500">{selectedClassToJoin.name}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedClassToJoin(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Lớp học này yêu cầu mã PIN bảo mật do giáo viên ({selectedClassToJoin.teacherName}) cung cấp.
              Vui lòng nhập chính xác mã để hoàn tất thủ tục đăng ký.
            </p>

            <form onSubmit={handleSubmitPin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">
                  MÃ PIN BẢO MẬT (VD: {selectedClassToJoin.pinCode})
                </label>
                <input
                  id="input-pin-code"
                  type="text"
                  placeholder="Nhập mã PIN (VD: TOAN10)..."
                  value={inputPin}
                  onChange={e => setInputPin(e.target.value.toUpperCase())}
                  className="w-full text-center tracking-widest text-lg font-extrabold uppercase py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedClassToJoin(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  id="btn-confirm-pin"
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer"
                >
                  {submitting ? 'Đang gửi...' : 'Gửi yêu cầu vào lớp'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History of PIN Join Requests */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Lịch Sử Yêu Cầu Tham Gia Lớp Học
        </h3>

        {pinRequests.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {pinRequests.map(req => (
              <div key={req.id} className="py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <span className="font-bold text-slate-800">{req.className}</span>
                  <span className="text-slate-400 text-[11px] block mt-0.5">
                    Gửi lúc: {req.requestDate} • Học sinh: {req.studentName} ({req.submittedPin})
                  </span>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full font-bold ${
                    req.status === 'approved'
                      ? 'bg-emerald-100 text-emerald-800'
                      : req.status === 'rejected'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {req.status === 'approved'
                    ? 'Đã duyệt'
                    : req.status === 'rejected'
                    ? 'Bị từ chối'
                    : 'Chờ duyệt'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">Chưa có yêu cầu tham gia nào được gửi.</p>
        )}
      </div>
    </div>
  );
};
