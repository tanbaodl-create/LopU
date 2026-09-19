import React, { useState, useEffect } from 'react';
import {
  Clock,
  Award,
  TrendingUp,
  Cloud,
  Trophy,
  BarChart3,
  Timer,
  Users,
} from 'lucide-react';
import { StudentProgress, ClassItem, TeacherDocument } from '../../../services/storageTypes';
import { getClasses, getStudentProgressList, getTeacherDocuments } from '../../ConnectData/ConnectFirestore';

export const BaoCaoGiamSatView: React.FC = () => {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('class_10a1');
  const [progressList, setProgressList] = useState<StudentProgress[]>([]);
  const [documents, setDocuments] = useState<TeacherDocument[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Đếm ngược thời gian nộp bài
  const [countdown, setCountdown] = useState({ hours: 14, minutes: 22, seconds: 40 });

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    async function load() {
      const cls = await getClasses();
      setClasses(cls);
      if (cls.length > 0) {
        setSelectedClassId(cls[0].id);
        const data = await getStudentProgressList(cls[0].id);
        setProgressList(data);
      }
      const docs = await getTeacherDocuments();
      setDocuments(docs);
      setLoading(false);
    }
    load();
  }, []);

  const handleClassChange = async (classId: string) => {
    setSelectedClassId(classId);
    const data = await getStudentProgressList(classId);
    setProgressList(data);
    const docs = await getTeacherDocuments();
    setDocuments(docs);
  };

  const curClass = classes.find(c => c.id === selectedClassId);

  // Aggregated metrics & Rankings
  const avgCompletionRate = progressList.length
    ? Math.round(progressList.reduce((sum, p) => sum + p.completionRate, 0) / progressList.length)
    : 0;
  const avgScore = progressList.length
    ? (progressList.reduce((sum, p) => sum + p.averageScore, 0) / progressList.length).toFixed(1)
    : '0';

  const rankedProgress = [...progressList].sort((a, b) => b.averageScore - a.averageScore);

  // Thống kê doanh số bán tài liệu bằng Kim Cương
  const monetizedDocs = documents.filter(d => d.isForSale);
  const totalPurchasesCount = monetizedDocs.reduce((sum, d) => sum + (d.purchasedUserIds?.length ?? 0), 0);
  const totalDiamondsEarned = monetizedDocs.reduce((sum, d) => sum + ((d.priceDiamonds ?? 0) * (d.purchasedUserIds?.length ?? 0)), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div id="reports-progress-view" className="space-y-6">
      {/* Top Header & Filter */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Báo Cáo Giám Sát, Tiến Độ % & Đếm Ngược Nộp Bài
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Thống kê tiến độ hoàn thành bài giảng dạng biểu đồ phần trăm (%), thời gian đếm ngược nộp bài & bảng xếp hạng thi đua
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            id="select-report-class"
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
        </div>
      </div>

      {/* Biểu đồ phần trăm % Tiến độ & Đếm ngược nộp bài */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              Biểu Đồ Tiến Độ Bài Giảng Của Lớp {curClass?.name}
            </h3>
            <span className="text-xs font-extrabold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-lg border border-indigo-100">
              TB {avgCompletionRate}% Hoàn Thành
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            {progressList.slice(0, 4).map(item => (
              <div key={item.id} className="space-y-1">
                <div className="flex justify-between text-slate-700 font-semibold">
                  <span>{item.studentName} ({item.completedLessons}/{item.totalLessons} bài)</span>
                  <span className="font-extrabold text-indigo-600">{item.completionRate}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${item.completionRate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Đếm ngược thời gian nộp bài */}
        <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-xs space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Timer className="w-4 h-4 text-amber-400 animate-pulse" />
              Đếm Ngược Nộp Bài
            </span>
            <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">
              Bài 03
            </span>
          </div>

          <div className="text-center py-1">
            <div className="text-2xl font-black font-mono tracking-widest text-amber-300">
              {String(countdown.hours).padStart(2, '0')}:{String(countdown.minutes).padStart(2, '0')}:
              {String(countdown.seconds).padStart(2, '0')}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Nộp bài tập chuyên đề Toán</p>
          </div>

          <div className="bg-white/10 p-2 rounded-xl text-center text-[11px] text-slate-300">
            Trạng thái: <strong>92% sinh viên đã nộp</strong>
          </div>
        </div>
      </div>

      {/* Bảng Xếp Hạng Thi Đua Trong Lớp */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
          <Trophy className="w-4 h-4 text-amber-500" />
          Xem Xếp Hạng Thi Đua Lớp {curClass?.name}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {rankedProgress.slice(0, 3).map((st, idx) => (
            <div
              key={st.id}
              className={`p-3.5 rounded-xl border flex items-center gap-3 ${
                idx === 0
                  ? 'bg-amber-50/80 border-amber-300 text-amber-900'
                  : idx === 1
                  ? 'bg-slate-50 border-slate-300 text-slate-800'
                  : 'bg-orange-50/60 border-orange-200 text-orange-900'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-extrabold text-sm shrink-0 ${
                  idx === 0
                    ? 'bg-amber-400 text-slate-900 shadow-xs'
                    : idx === 1
                    ? 'bg-slate-300 text-slate-900'
                    : 'bg-orange-300 text-slate-900'
                }`}
              >
                #{idx + 1}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-xs truncate">{st.studentName}</p>
                <p className="text-[10px] opacity-75">Mã: {st.studentId}</p>
              </div>
              <div className="text-right">
                <span className="font-black text-sm">{st.averageScore}</span>
                <span className="block text-[9px] opacity-75">ĐTB</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Tỷ lệ hoàn thành bài
            </span>
            <div className="text-2xl font-extrabold text-indigo-600 mt-1">
              {avgCompletionRate}%
            </div>
            <span className="text-[11px] text-slate-500">Trung bình cả lớp</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Điểm trung bình
            </span>
            <div className="text-2xl font-extrabold text-amber-600 mt-1">
              {avgScore}/10
            </div>
            <span className="text-[11px] text-slate-500">Môn {curClass?.subject}</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Award className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Doanh Số Bán Tài Liệu
            </span>
            <div className="text-xl font-black text-amber-800 flex items-center gap-1 mt-1 font-mono">
              💎 {totalDiamondsEarned}
            </div>
            <span className="text-[10px] text-slate-500 block mt-0.5 font-bold">
              Đã bán {totalPurchasesCount} lượt tài liệu
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center font-black text-base shadow-3xs border border-amber-200">
            💎
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Lưu trữ Google Drive
            </span>
            <div className="text-xs font-bold text-blue-700 mt-1 truncate max-w-[170px]">
              {curClass?.teacherName || 'Giáo viên mở lớp'}
            </div>
            <span className="text-[11px] text-slate-500">Bảng điểm đồng bộ cá nhân</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Cloud className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Progress Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50/60 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Danh Sách Chi Tiết Học Sinh Lớp {curClass?.name} ({progressList.length} học sinh)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Học Sinh</th>
                <th className="py-3 px-4">Bài Hoàn Thành</th>
                <th className="py-3 px-4">Tiến Độ (%)</th>
                <th className="py-3 px-4 text-center">Điểm TB</th>
                <th className="py-3 px-4 text-center">Lưu Trữ Drive</th>
                <th className="py-3 px-4">Hoạt Động Cuối</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {progressList.map(item => (
                <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4">
                    <span className="font-bold text-slate-900 block">{item.studentName}</span>
                    <span className="text-[11px] text-slate-400">Mã: {item.studentId}</span>
                  </td>

                  <td className="py-3 px-4 font-semibold text-slate-800">
                    {item.completedLessons} / {item.totalLessons} bài
                  </td>

                  <td className="py-3 px-4 min-w-[140px]">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-600 rounded-full"
                          style={{ width: `${item.completionRate}%` }}
                        />
                      </div>
                      <span className="font-bold text-slate-800 w-9 text-right">
                        {item.completionRate}%
                      </span>
                    </div>
                  </td>

                  <td className="py-3 px-4 text-center font-extrabold text-slate-900">
                    {item.averageScore}
                  </td>

                  <td className="py-3 px-4 text-center">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold text-[11px] bg-blue-50 text-blue-700 border border-blue-200/60">
                      <Cloud className="w-3 h-3 text-blue-600" /> Drive GV
                    </span>
                  </td>

                  <td className="py-3 px-4 text-slate-500 text-[11px]">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {item.lastActive}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* BÁO CÁO THƯƠNG MẠI & DOANH THU TÀI LIỆU */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-amber-50/50 border-b border-amber-100/50 flex items-center justify-between">
          <span className="text-xs font-black text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
            💎 BÁO CÁO THƯƠNG MẠI & DOANH THU TÀI LIỆU ({monetizedDocs.length} tài liệu thu phí)
          </span>
          <span className="text-[11px] font-bold text-amber-850 bg-white px-2 py-0.5 rounded-md border border-amber-200">
            Tổng Doanh Thu: 💎 {totalDiamondsEarned} (Đã bán {totalPurchasesCount} lượt)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Tài Liệu Chuyên Đề</th>
                <th className="py-3 px-4">Độ Tuổi/Khối Lớp</th>
                <th className="py-3 px-4">Đơn Giá</th>
                <th className="py-3 px-4 text-center">Số Lượt Đã Mua</th>
                <th className="py-3 px-4 text-right">Tổng Doanh Số</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {monetizedDocs.map(docItem => {
                const salesCount = docItem.purchasedUserIds?.length ?? 0;
                const docRevenue = (docItem.priceDiamonds ?? 0) * salesCount;

                return (
                  <tr key={docItem.id} className="hover:bg-amber-50/20 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 block">{docItem.title}</span>
                      <span className="text-[10px] font-mono text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded w-fit block mt-0.5">
                        {docItem.chuyenDe || 'Chuyên đề'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {docItem.subject} • {docItem.grade}
                    </td>
                    <td className="py-3 px-4 font-bold font-mono text-amber-800">
                      💎 {docItem.priceDiamonds ?? 0}
                    </td>
                    <td className="py-3 px-4 text-center font-extrabold text-slate-900">
                      {salesCount} lượt
                    </td>
                    <td className="py-3 px-4 text-right font-black font-mono text-amber-900">
                      💎 {docRevenue}
                    </td>
                  </tr>
                );
              })}
              {monetizedDocs.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs text-slate-400 italic">
                    Chưa có tài liệu thu phí nào được khởi tạo trong hệ thống.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* FOOTER CỐ ĐỊNH THỐNG KÊ LỚP HỌC */}
      <div id="baocao-footer-stats" className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4 mt-6">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
          <Users className="w-4 h-4 text-indigo-600" />
          <span>THỐNG KÊ LỚP HỌC:</span>
          <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100 font-extrabold text-sm">
            Sĩ số: {progressList.length || 37} (Nữ: {progressList.filter(p => p.studentName.includes('Thị') || p.studentName.includes('Mai') || p.studentName.includes('Hà') || p.studentName.includes('Trang')).length || 19})
          </span>
        </div>

        <div className="text-xs text-slate-500 font-medium flex items-center gap-2">
          <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
          <span>Thống kê theo dõi thi đua đếm ngược tự động</span>
        </div>
      </div>
    </div>
  );
};

