import React, { useState, useEffect } from 'react';
import {
  Cloud,
  CheckCircle2,
  TrendingUp,
  Award,
  Search,
  Clock,
  Trophy,
  BarChart3,
  Calendar,
  Plus,
  Heart,
  Sparkles,
  GraduationCap,
  Users,
  X,
  BookOpen,
} from 'lucide-react';
import { StudentGradeRecord, ClassItem } from '../../../services/storageTypes';
import { INITIAL_STUDENT_GRADES } from '../../../services/mockInitialData';
import { getClasses } from '../../ConnectData/ConnectFirestore';
import { saveTeacherGradesToDrive } from '../../ConnectData/ConnectDrive';

const PROFILES_STORAGE_KEY = 'lopu_user_family_timetables_v2';

export const TheoDoiHocSinhView: React.FC = () => {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('class_10a1');
  const [grades, setGrades] = useState<StudentGradeRecord[]>(INITIAL_STUDENT_GRADES);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [notification, setNotification] = useState<string | null>(null);

  // Quản lý thời khóa biểu theo dõi của con em / học sinh
  const [familyProfiles, setFamilyProfiles] = useState<any[]>(() => {
    const saved = localStorage.getItem(PROFILES_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });

  const [showAddTkbModal, setShowAddTkbModal] = useState<boolean>(false);
  const [newTkbName, setNewTkbName] = useState<string>('');
  const [newTkbRelation, setNewTkbRelation] = useState<'child' | 'sibling' | 'student' | 'other'>('child');
  const [newTkbClassName, setNewTkbClassName] = useState<string>('10A1');
  const [newTkbSchool, setNewTkbSchool] = useState<string>('');

  // Countdown timer for assignment submission deadline
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number }>({
    hours: 23,
    minutes: 45,
    seconds: 12,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
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
    }
    load();
  }, []);

  const handleScoreChange = (
    id: string,
    field: 'regularScore1' | 'regularScore2' | 'midtermScore' | 'finalScore',
    value: number
  ) => {
    setGrades(prev =>
      prev.map(row => {
        if (row.id === id) {
          const updated = { ...row, [field]: value };
          // Calculate weighted average: (TX1 + TX2 + GK*2 + CK*3) / 7
          const avg = Number(
            (
              (updated.regularScore1 +
                updated.regularScore2 +
                updated.midtermScore * 2 +
                updated.finalScore * 3) /
              7
            ).toFixed(1)
          );
          return {
            ...updated,
            average: avg,
            lastUpdated: new Date().toLocaleDateString('vi-VN'),
            driveSynced: false,
          };
        }
        return row;
      })
    );
  };

  const handleEvaluationChange = (id: string, evaluation: string) => {
    setGrades(prev =>
      prev.map(row => (row.id === id ? { ...row, evaluation, driveSynced: false } : row))
    );
  };

  const handleSaveToTeacherDrive = async () => {
    const cur = classes.find(c => c.id === selectedClassId);
    if (!cur) return;
    const res = await saveTeacherGradesToDrive(cur.id, cur.name, grades);
    setGrades(prev => prev.map(row => ({ ...row, driveSynced: true })));
    setNotification(`Đã lưu trữ bảng điểm lớp ${cur.name} trực tiếp vào Google Drive của giáo viên (${cur.teacherName}): "${res.fileName}"`);
    setTimeout(() => setNotification(null), 5000);
  };

  const handleCreateFamilyTkb = () => {
    if (!newTkbName.trim()) {
      alert('Vui lòng nhập tên học sinh hoặc tên hồ sơ Thời khóa biểu.');
      return;
    }

    const relationLabels: Record<string, string> = {
      child: 'Con',
      sibling: 'Em',
      student: 'Học sinh',
      other: 'Người thân',
    };

    const newId = `profile_${Date.now()}`;
    const newProfile = {
      id: newId,
      name: newTkbName.trim(),
      relation: newTkbRelation,
      relationLabel: relationLabels[newTkbRelation] || 'Người thân',
      className: newTkbClassName.trim() || '10A1',
      school: newTkbSchool.trim() || undefined,
      colorScheme: 'indigo',
      createdAt: new Date().toISOString().split('T')[0],
      schedule: [
        {
          id: `sch_${Date.now()}_1`,
          dayOfWeek: 1,
          period: 1,
          subject: 'Toán Học',
          className: newTkbClassName.trim() || '10A1',
          teacher: 'Giáo viên bộ môn',
          teacherNickname: 'GV Toán',
          room: 'Phòng 201',
          time: '07:00 - 07:45',
          type: 'CK',
          startTime: '07:00',
          endTime: '07:45',
          startMinutes: 420,
          endMinutes: 465,
          notes: `Lịch học chính khóa lớp ${newTkbClassName.trim() || '10A1'}`,
        },
        {
          id: `sch_${Date.now()}_2`,
          dayOfWeek: 1,
          period: 2,
          subject: 'Ngữ Văn',
          className: newTkbClassName.trim() || '10A1',
          teacher: 'Giáo viên bộ môn',
          teacherNickname: 'GV Văn',
          room: 'Phòng 201',
          time: '07:50 - 08:35',
          type: 'CK',
          startTime: '07:50',
          endTime: '08:35',
          startMinutes: 470,
          endMinutes: 515,
          notes: 'Soạn bài trước khi đến lớp',
        },
      ],
    };

    const updated = [...familyProfiles, newProfile];
    setFamilyProfiles(updated);
    localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(updated));
    setShowAddTkbModal(false);
    setNewTkbName('');
    setNewTkbSchool('');
    setNotification(`Đã thêm Thời khóa biểu theo dõi "${newProfile.name}" thành công!`);
    setTimeout(() => setNotification(null), 3500);
  };

  const filteredGrades = grades.filter(g =>
    g.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.studentCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Ranking by average score
  const rankedStudents = [...grades].sort((a, b) => b.average - a.average);

  const curClass = classes.find(c => c.id === selectedClassId);

  // Statistics
  const excellentCount = grades.filter(g => g.average >= 9.0).length;
  const goodCount = grades.filter(g => g.average >= 8.0 && g.average < 9.0).length;
  const averageClassScore = (
    grades.reduce((sum, g) => sum + g.average, 0) / (grades.length || 1)
  ).toFixed(1);

  return (
    <div id="teaching-students-view" className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div className="p-3.5 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs">
          <Cloud className="w-4 h-4 text-blue-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Top Header & Save to Drive */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Theo Dõi Tiến Độ, Đếm Ngược Nộp Bài & Thi Đua Học Sinh
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Sổ điểm điện tử, biểu đồ % hoàn thành bài giảng, đồng hồ đếm ngược và bảng xếp hạng thi đua
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            id="select-grade-class"
            value={selectedClassId}
            onChange={e => setSelectedClassId(e.target.value)}
            className="text-xs font-bold bg-slate-50 text-slate-800 py-2 px-3 rounded-xl border border-slate-200"
          >
            {classes.map(c => (
              <option key={c.id} value={c.id}>
                {c.code} — {c.name}
              </option>
            ))}
          </select>

          <button
            id="btn-save-grades-teacher-drive"
            onClick={handleSaveToTeacherDrive}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors cursor-pointer"
          >
            <Cloud className="w-4 h-4" />
            <span>Lưu Drive Giáo viên</span>
          </button>
        </div>
      </div>

      {/* Bảng Tiến Độ Bài Giảng (%) & Đếm Ngược Nộp Bài */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Biểu đồ phần trăm (%) Tiến độ hoàn thành bài giảng */}
        <div className="md:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              Tiến Độ Hoàn Thành Bài Giảng Lớp ({curClass?.name || '10A1'})
            </h3>
            <span className="text-xs font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">
              85% Hoàn thành toàn khóa
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div>
              <div className="flex justify-between text-slate-600 mb-1">
                <span>Chương 1: Mở Đầu Lớp 10</span>
                <span className="font-bold text-slate-900">100% (Completed)</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div className="bg-emerald-500 h-2.5 rounded-full" style={{ width: '100%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-slate-600 mb-1">
                <span>Chương 2: Kiến Thức Trọng Tâm</span>
                <span className="font-bold text-indigo-600">80%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: '80%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-slate-600 mb-1">
                <span>Chương 3: Ôn Tập Cuối Kỳ & Thực Hành</span>
                <span className="font-bold text-amber-600">65%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div className="bg-amber-500 h-2.5 rounded-full" style={{ width: '65%' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Đếm ngược thời gian nộp bài */}
        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-5 rounded-2xl shadow-xs space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
              Đếm Ngược Hạn Nộp Bài
            </span>
            <span className="text-[10px] bg-rose-500/30 text-rose-300 border border-rose-400/40 px-2 py-0.5 rounded-full font-bold">
              Bài tập 02
            </span>
          </div>

          <div className="text-center py-1">
            <div className="text-2xl font-black font-mono tracking-widest text-amber-300">
              {String(timeLeft.hours).padStart(2, '0')}:{String(timeLeft.minutes).padStart(2, '0')}:
              {String(timeLeft.seconds).padStart(2, '0')}
            </div>
            <p className="text-[11px] text-slate-300 mt-1">Hạn chót: 23:59 Hôm nay</p>
          </div>

          <div className="bg-white/10 p-2 rounded-xl text-center text-[11px] text-indigo-200">
            Còn <strong>4 học sinh</strong> chưa nộp bài tập về nhà
          </div>
        </div>
      </div>

      {/* Bảng Xếp Hạng Thi Đua Học Sinh */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
          <Trophy className="w-4 h-4 text-amber-500" />
          Bảng Xếp Hạng Thi Đua Học Sinh Lớp {curClass?.name}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {rankedStudents.slice(0, 3).map((st, idx) => (
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
                <p className="text-[10px] opacity-75">{st.studentCode}</p>
              </div>
              <div className="text-right">
                <span className="font-black text-sm">{st.average}</span>
                <span className="block text-[9px] opacity-75">ĐTB</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Select class & actions */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <select
            id="select-grade-class"
            value={selectedClassId}
            onChange={e => setSelectedClassId(e.target.value)}
            className="text-xs font-bold bg-slate-50 text-slate-800 py-2 px-3 rounded-xl border border-slate-200"
          >
            {classes.map(c => (
              <option key={c.id} value={c.id}>
                {c.code} — {c.name}
              </option>
            ))}
          </select>

          <button
            id="btn-save-grades-teacher-drive"
            onClick={handleSaveToTeacherDrive}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors cursor-pointer"
          >
            <Cloud className="w-4 h-4" />
            <span>Lưu Drive Giáo viên</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase text-slate-400">Điểm TB Cả Lớp</span>
            <div className="text-2xl font-extrabold text-slate-900 mt-0.5">{averageClassScore}/10</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase text-slate-400">Học sinh Xuất sắc (9.0+)</span>
            <div className="text-2xl font-extrabold text-emerald-600 mt-0.5">{excellentCount} học sinh</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Award className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase text-slate-400">Học lực Khá (8.0 - 8.9)</span>
            <div className="text-2xl font-extrabold text-indigo-600 mt-0.5">{goodCount} học sinh</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Grades Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50/60 border-b border-slate-100 flex items-center justify-between gap-4">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Sổ Ghi Điểm: {curClass?.name} ({grades.length} học sinh)
          </span>

          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Tìm theo tên học sinh..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Mã HS</th>
                <th className="py-3 px-4">Họ và Tên</th>
                <th className="py-3 px-3 text-center">TX 1 (x1)</th>
                <th className="py-3 px-3 text-center">TX 2 (x1)</th>
                <th className="py-3 px-3 text-center">Giữa Kỳ (x2)</th>
                <th className="py-3 px-3 text-center">Cuối Kỳ (x3)</th>
                <th className="py-3 px-3 text-center font-extrabold text-indigo-700">ĐTB</th>
                <th className="py-3 px-4">Đánh giá & Nhận xét tiến bộ</th>
                <th className="py-3 px-3 text-center">Drive</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {filteredGrades.map(row => (
                <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-2.5 px-4 font-mono font-bold text-slate-500">{row.studentCode}</td>
                  <td className="py-2.5 px-4 font-bold text-slate-900">{row.studentName}</td>

                  {/* TX1 */}
                  <td className="py-2.5 px-3 text-center">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="10"
                      value={row.regularScore1}
                      onChange={e =>
                        handleScoreChange(row.id, 'regularScore1', parseFloat(e.target.value) || 0)
                      }
                      className="w-14 text-center py-1 px-1 bg-slate-50 border border-slate-200 rounded-md font-bold focus:ring-1 focus:ring-indigo-500"
                    />
                  </td>

                  {/* TX2 */}
                  <td className="py-2.5 px-3 text-center">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="10"
                      value={row.regularScore2}
                      onChange={e =>
                        handleScoreChange(row.id, 'regularScore2', parseFloat(e.target.value) || 0)
                      }
                      className="w-14 text-center py-1 px-1 bg-slate-50 border border-slate-200 rounded-md font-bold focus:ring-1 focus:ring-indigo-500"
                    />
                  </td>

                  {/* Midterm */}
                  <td className="py-2.5 px-3 text-center">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="10"
                      value={row.midtermScore}
                      onChange={e =>
                        handleScoreChange(row.id, 'midtermScore', parseFloat(e.target.value) || 0)
                      }
                      className="w-14 text-center py-1 px-1 bg-slate-50 border border-slate-200 rounded-md font-bold focus:ring-1 focus:ring-indigo-500"
                    />
                  </td>

                  {/* Final */}
                  <td className="py-2.5 px-3 text-center">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="10"
                      value={row.finalScore}
                      onChange={e =>
                        handleScoreChange(row.id, 'finalScore', parseFloat(e.target.value) || 0)
                      }
                      className="w-14 text-center py-1 px-1 bg-slate-50 border border-slate-200 rounded-md font-bold focus:ring-1 focus:ring-indigo-500"
                    />
                  </td>

                  {/* Average */}
                  <td className="py-2.5 px-3 text-center">
                    <span
                      className={`inline-block px-2.5 py-1 rounded-md font-extrabold text-xs ${
                        row.average >= 9.0
                          ? 'bg-emerald-100 text-emerald-800'
                          : row.average >= 8.0
                          ? 'bg-indigo-100 text-indigo-800'
                          : row.average >= 6.5
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {row.average}
                    </span>
                  </td>

                  {/* Teacher Evaluation & Notes */}
                  <td className="py-2.5 px-4 min-w-[220px]">
                    <input
                      type="text"
                      value={row.evaluation}
                      onChange={e => handleEvaluationChange(row.id, e.target.value)}
                      placeholder="Ghi nhận xét và tiến bộ của học sinh..."
                      className="w-full py-1 px-2 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:ring-1 focus:ring-indigo-500"
                    />
                  </td>

                  {/* Drive status */}
                  <td className="py-2.5 px-3 text-center">
                    {row.driveSynced ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto" />
                    ) : (
                      <span className="text-[10px] text-amber-600 font-bold">Chưa lưu</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* KHỐI THEO DÕI & THÊM THỜI KHÓA BIỂU HỌC TẬP (HỌC SINH / CON EM) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Theo Dõi Thời Khóa Biểu & Lịch Học Của Học Sinh / Con Em
              </h3>
              <p className="text-xs text-slate-500">
                Quản lý lịch học tập, ca học và lịch thi của từng con em, học sinh theo dõi
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowAddTkbModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm TKB Học Sinh / Con Em</span>
          </button>
        </div>

        {familyProfiles.length === 0 ? (
          <div className="p-6 rounded-xl border border-dashed border-slate-200 text-center space-y-2">
            <Users className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs text-slate-500 font-medium">
              Chưa có thời khóa biểu con em nào được thêm. Bấm <strong>"Thêm TKB Học Sinh / Con Em"</strong> để bắt đầu theo dõi lịch học.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {familyProfiles.map((p, idx) => (
              <div
                key={p.id || idx}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-indigo-300 transition-all space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    {p.relation === 'child' && <Heart className="w-3.5 h-3.5 text-rose-500" />}
                    {p.relation === 'sibling' && <Sparkles className="w-3.5 h-3.5 text-purple-500" />}
                    {p.relation === 'student' && <GraduationCap className="w-3.5 h-3.5 text-emerald-500" />}
                    {p.name}
                  </span>
                  <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-md border border-indigo-100">
                    Lớp {p.className}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 flex items-center justify-between">
                  <span>{p.school || 'Trường phổ thông'}</span>
                  <span>{p.schedule?.length || 0} tiết/ca đã xếp</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL THÊM THỜI KHÓA BIỂU CON EM / HỌC SINH */}
      {showAddTkbModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Thêm Thời Khóa Biểu Theo Dõi
                  </h3>
                  <p className="text-xs text-slate-500">
                    Thêm lịch học của con, em hoặc học sinh kèm cặp
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddTkbModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  1. Mối quan hệ
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'child', label: 'Con', icon: Heart },
                    { id: 'sibling', label: 'Em', icon: Sparkles },
                    { id: 'student', label: 'Học sinh', icon: GraduationCap },
                    { id: 'other', label: 'Khác', icon: Users },
                  ].map(r => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setNewTkbRelation(r.id as any)}
                      className={`p-2 rounded-xl font-bold flex flex-col items-center gap-1 border transition-all cursor-pointer ${
                        newTkbRelation === r.id
                          ? 'bg-indigo-50 border-indigo-400 text-indigo-900 shadow-2xs'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <r.icon className="w-4 h-4" />
                      <span>{r.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  2. Tên học sinh / Tên hồ sơ
                </label>
                <input
                  type="text"
                  value={newTkbName}
                  onChange={e => setNewTkbName(e.target.value)}
                  placeholder="Ví dụ: Con - Đỗ Bảo Khang..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-xs focus:bg-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    3. Lớp học
                  </label>
                  <input
                    type="text"
                    value={newTkbClassName}
                    onChange={e => setNewTkbClassName(e.target.value)}
                    placeholder="Ví dụ: 10A1, 6A2..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-xs focus:bg-white focus:outline-hidden focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    4. Trường học (tùy chọn)
                  </label>
                  <input
                    type="text"
                    value={newTkbSchool}
                    onChange={e => setNewTkbSchool(e.target.value)}
                    placeholder="Ví dụ: THPT Ba Gia..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 text-xs focus:bg-white focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowAddTkbModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleCreateFamilyTkb}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Lưu Thời Khóa Biểu</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
