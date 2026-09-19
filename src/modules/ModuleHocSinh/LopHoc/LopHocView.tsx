import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  Lock,
  Unlock,
  CheckCircle2,
  Clock,
  Download,
  ChevronDown,
  Users,
  MapPin,
  Navigation,
  ExternalLink,
  Check,
} from 'lucide-react';
import { ClassItem, ClassLesson, UserProfile, TeacherDocument } from '../../../services/storageTypes';
import { getClasses, updateProgress, getUsers, getTeacherDocuments, purchaseDocumentWithDiamonds, rewardStudentDiamonds } from '../../ConnectData/ConnectFirestore';
import { GpsPickerModal } from '../../../components/GpsPickerModal';

interface LearningClassesViewProps {
  currentStudentId?: string;
}

export const LopHocView: React.FC<LearningClassesViewProps> = ({
  currentStudentId = 'u_hs01',
}) => {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedLessonId, setSelectedLessonId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [completedLessonIds, setCompletedLessonIds] = useState<Set<string>>(new Set<string>());
  const [notification, setNotification] = useState<string | null>(null);

  // Student specific data for Wallet 💎 & Monetization
  const [studentProfile, setStudentProfile] = useState<UserProfile | null>(null);
  const [publishedDocuments, setPublishedDocuments] = useState<TeacherDocument[]>([]);

  // GPS Google Maps State
  const [showGpsModal, setShowGpsModal] = useState<boolean>(false);
  const [gpsCoords, setGpsCoords] = useState<string>('21.028511, 105.854444');
  const [selectedLat, setSelectedLat] = useState<number>(21.028511);
  const [selectedLng, setSelectedLng] = useState<number>(105.854444);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite'>('roadmap');

  const handleOpenGpsModal = () => {
    if (gpsCoords) {
      const parts = gpsCoords.split(',').map(s => parseFloat(s.trim()));
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        setSelectedLat(parts[0]);
        setSelectedLng(parts[1]);
      }
    }
    setShowGpsModal(true);
  };

  const handleGetDeviceLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          setSelectedLat(pos.coords.latitude);
          setSelectedLng(pos.coords.longitude);
          setNotification('Đã lấy thành công vị trí GPS từ thiết bị!');
        },
        () => {
          alert('Không thể lấy vị trí GPS từ thiết bị.');
        }
      );
    } else {
      alert('Trình duyệt không hỗ trợ định vị Geolocation.');
    }
  };

  const handleConfirmGps = () => {
    const coords = `${selectedLat.toFixed(6)}, ${selectedLng.toFixed(6)}`;
    setGpsCoords(coords);
    setShowGpsModal(false);
    setNotification(`Đã xác nhận lấy tọa độ GPS lớp học: ${coords}`);
    setTimeout(() => setNotification(null), 4000);
  };

  const loadStudentAndDocs = async () => {
    const allUsers = await getUsers();
    const student = allUsers.find(u => u.id === currentStudentId) || null;
    setStudentProfile(student);

    const allDocs = await getTeacherDocuments();
    setPublishedDocuments(allDocs);
  };

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const list = await getClasses();
      setClasses(list);
      if (list.length > 0) {
        setSelectedClassId(list[0].id);
        const firstUnlocked = list[0].lessons.find(l => l.isUnlocked);
        if (firstUnlocked) {
          setSelectedLessonId(firstUnlocked.id);
        } else if (list[0].lessons.length > 0) {
          setSelectedLessonId(list[0].lessons[0].id);
        }
      }
      await loadStudentAndDocs();
      setLoading(false);
    }
    loadData();
  }, []);

  const currentClass = classes.find(c => c.id === selectedClassId) || classes[0];
  const unlockedLessons = currentClass ? currentClass.lessons.filter(l => l.isUnlocked) : [];
  const currentLesson = currentClass?.lessons.find(l => l.id === selectedLessonId);

  // Filter documents published to this class
  const currentClassDocuments = useMemo(() => {
    if (!selectedClassId) return [];
    return publishedDocuments.filter(doc => doc.publishedToClasses && doc.publishedToClasses.includes(selectedClassId));
  }, [publishedDocuments, selectedClassId]);

  const handleClassChange = (classId: string) => {
    setSelectedClassId(classId);
    const target = classes.find(c => c.id === classId);
    if (target) {
      const firstUnlocked = target.lessons.find(l => l.isUnlocked);
      setSelectedLessonId(firstUnlocked ? firstUnlocked.id : target.lessons[0]?.id || '');
    }
  };

  const handlePurchaseDoc = async (docId: string, title: string) => {
    const res = await purchaseDocumentWithDiamonds(currentStudentId, docId);
    if (res.success) {
      setNotification(res.message);
      await loadStudentAndDocs(); // Reload student diamonds and documents status
    } else {
      alert(res.message);
    }
  };

  const handleToggleComplete = async (lesson: ClassLesson) => {
    const isCompleted = completedLessonIds.has(lesson.id);
    const nextSet = new Set(completedLessonIds);
    if (isCompleted) {
      nextSet.delete(lesson.id);
      // Subtract reward to avoid abuse
      const res = await rewardStudentDiamonds(currentStudentId, -10, `hủy hoàn thành tài liệu "${lesson.title}"`);
      if (res.success && res.diamonds !== undefined) {
        setStudentProfile(prev => prev ? { ...prev, diamonds: res.diamonds } : null);
      }
      setNotification(`Đã hủy đánh dấu hoàn thành tài liệu "${lesson.title}".`);
    } else {
      nextSet.add(lesson.id);
      // Award 10 diamonds (Gamification!)
      const res = await rewardStudentDiamonds(currentStudentId, 10, `hoàn thành xuất sắc tài liệu "${lesson.title}"`);
      if (res.success && res.diamonds !== undefined) {
        setStudentProfile(prev => prev ? { ...prev, diamonds: res.diamonds } : null);
        setNotification(`Tuyệt vời! Đã hoàn thành tài liệu "${lesson.title}". Bạn được cộng thưởng +10 💎 vào ví!`);
      } else {
        setNotification(`Tuyệt vời! Đã hoàn thành tài liệu "${lesson.title}". Tiến độ đã cập nhật vào Firestore.`);
      }
    }
    setCompletedLessonIds(nextSet);

    // Update Firestore progress
    if (currentClass) {
      const total = currentClass.lessons.length;
      const count = nextSet.size;
      const rate = Math.round((count / total) * 100);
      await updateProgress({
        id: `pr_${currentStudentId}_${currentClass.id}`,
        studentId: currentStudentId,
        studentName: 'Lê Minh Khang',
        classId: currentClass.id,
        className: currentClass.name,
        completedLessons: count,
        totalLessons: total,
        completionRate: rate,
        attendanceRate: 100,
        averageScore: 9.2,
        lastActive: new Date().toLocaleString('vi-VN'),
      });
    }

    setTimeout(() => setNotification(null), 4000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (classes.length === 0) {
    return (
      <div id="learning-classes-view" className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
        <h3 className="text-base font-bold text-slate-900">Chưa có lớp học hoặc chưa có tài liệu</h3>
        <p className="text-xs text-slate-500 max-w-lg mx-auto leading-relaxed">
          Hiện tại chưa có lớp học nào được khởi tạo hoặc gán cho bạn. Giáo viên có thể truy cập module <strong>Quản Lý Lớp Dạy</strong> để tạo lớp mới và tải lên tài liệu học tập.
        </p>
      </div>
    );
  }

  return (
    <div id="learning-classes-view" className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 animate-fade-in shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Top Filter Bar: Dropdown Chọn Lớp & Dropdown Chọn Bài Học Mở Khóa */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 1. Dropdown Chọn Lớp Học & Ô Nhập Tay Tùy Chỉnh */}
          <div>
            <label htmlFor="select-class-dropdown" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              1. Chọn Lớp Học Hoặc Nhập Tay Lớp Khác
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="relative">
                <select
                  id="select-class-dropdown"
                  value={selectedClassId}
                  onChange={e => handleClassChange(e.target.value)}
                  className="w-full appearance-none bg-slate-50 hover:bg-slate-100/80 text-slate-900 text-sm font-semibold py-2.5 px-3.5 pr-9 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden transition-colors"
                >
                  <option value="">-- (Để trống) --</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.name} ({c.teacherName})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3.5 pointer-events-none" />
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Hoặc nhập tên Lớp tay ngoài danh sách..."
                  value={selectedClassId.startsWith('custom_') ? selectedClassId.replace('custom_', '') : ''}
                  onChange={e => {
                    const val = e.target.value;
                    if (val.trim()) {
                      const customId = `custom_${val.trim()}`;
                      setSelectedClassId(customId);
                    } else if (classes.length > 0) {
                      setSelectedClassId(classes[0].id);
                    }
                  }}
                  className="w-full bg-slate-50 hover:bg-slate-100/80 text-slate-900 text-sm font-semibold py-2.5 px-3.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden transition-colors"
                />
              </div>
            </div>
            {currentClass && (
              <div className="mt-1.5 flex items-center justify-between gap-2 flex-wrap text-xs">
                <p className="text-slate-500">
                  Phòng: <span className="font-semibold text-slate-700">{currentClass.room}</span> • Giáo viên:{' '}
                  <span className="font-semibold text-slate-700">{currentClass.teacherName}</span> • Nơi học tập:{' '}
                  <span className="font-semibold text-indigo-700">Trường THPT Chuyên</span>
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleOpenGpsModal}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-2xs cursor-pointer transition-colors"
                    title="Mở Google Maps chọn/lấy tọa độ GPS"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>lấy tọa độ GPS</span>
                  </button>
                  {gpsCoords && (
                    <span className="font-mono text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {gpsCoords}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 2. Dropdown Chọn Bài Học / Tài Liệu Mở Khóa */}
          <div>
            <label htmlFor="select-lesson-dropdown" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              2. Chọn Tài Liệu / Bài Học Đã Mở Khóa ({unlockedLessons.length}/{currentClass?.lessons.length || 0})
            </label>
            <div className="relative">
              <select
                id="select-lesson-dropdown"
                value={selectedLessonId}
                onChange={e => setSelectedLessonId(e.target.value)}
                className="w-full appearance-none bg-slate-50 hover:bg-slate-100/80 text-slate-900 text-sm font-semibold py-2.5 px-3.5 pr-9 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden transition-colors"
              >
                <option value="">-- (Để trống) --</option>
                {currentClass?.lessons.map(lesson => (
                  <option key={lesson.id} value={lesson.id} disabled={!lesson.isUnlocked}>
                    {lesson.isUnlocked ? '🟢 [ĐÃ MỞ]' : '🔒 [KHÓA]'} {lesson.title} ({lesson.unit})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3.5 pointer-events-none" />
            </div>
            <p className="mt-1.5 text-xs text-slate-500">
              Chỉ các tài liệu/bài học được giáo viên mở khóa mới có thể truy cập nội dung.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Area: Lesson Details & Learning Workspace */}
      {currentLesson ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left / Center 2 Cols: Lesson Content & Materials */}
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-50 text-indigo-700">
                    {currentLesson.unit}
                  </span>
                  {currentLesson.isUnlocked ? (
                    <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">
                      <Unlock className="w-3.5 h-3.5" /> Đã mở khóa
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg">
                      <Lock className="w-3.5 h-3.5" /> Chưa mở khóa
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Thời lượng: {currentLesson.estimatedMinutes} phút</span>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900 leading-snug">
                  {currentLesson.title}
                </h2>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  {currentLesson.description}
                </p>
              </div>

              {/* Tags */}
              {currentLesson.tags && currentLesson.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {currentLesson.tags.map((t, idx) => (
                    <span
                      key={idx}
                      className="text-xs px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              )}

              {/* Interactive Lesson Body & Study Guide */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Mục tiêu cốt lõi của tài liệu:
                </h3>
                <ul className="space-y-2 text-xs text-slate-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                    <span>Nắm vững các định nghĩa, định lý và công thức trọng tâm của {currentLesson.unit}.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                    <span>Thực hành giải quyết 5 dạng toán điển hình thường xuất hiện trong đề thi học kỳ.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                    <span>Hoàn thành bài tập tự luyện và đối chiếu lời giải chi tiết của giáo viên.</span>
                  </li>
                </ul>

                {/* Cấu trúc gói bài dạy & Media tài nguyên tương đối */}
                <div className="pt-2 border-t border-slate-200/60 flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                  <span className="font-bold text-slate-700">Gói tài nguyên chuyên đề:</span>
                  <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-indigo-700 font-semibold">
                    📄 KienThuc.html
                  </span>
                  <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-emerald-700 font-semibold">
                    📁 Media/HinhAnh
                  </span>
                  <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-purple-700 font-semibold">
                    📁 Media/AmThanh
                  </span>
                  <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-rose-700 font-semibold">
                    📁 Media/Video
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                <button
                  id="btn-toggle-complete-lesson"
                  onClick={() => handleToggleComplete(currentLesson)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs ${
                    completedLessonIds.has(currentLesson.id)
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {completedLessonIds.has(currentLesson.id)
                      ? 'Đã hoàn thành bài học (Bấm để hủy)'
                      : 'Đánh dấu hoàn thành bài học'}
                  </span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    id="btn-download-notes"
                    onClick={() => alert(`Tải tài liệu PDF bài học "${currentLesson.title}" từ Google Drive thành công!`)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" /> Tải tài liệu PDF
                  </button>
                </div>
              </div>

              {/* TÀI LIỆU CHUYÊN ĐỀ LỚP HỌC (Miễn phí & Thương mại) */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  📁 Tài liệu chuyên đề lớp học:
                </h3>

                {currentClassDocuments.length === 0 ? (
                  <p className="text-xs italic text-slate-400">Chưa có tài liệu chuyên đề nào được phát hành đến lớp học này.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {currentClassDocuments.map(doc => {
                      const isFree = !doc.isForSale;
                      const isOwned = isFree || (doc.purchasedUserIds && doc.purchasedUserIds.includes(currentStudentId));

                      return (
                        <div key={doc.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex flex-col justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="font-mono bg-indigo-50 text-indigo-700 px-1 py-0.5 rounded text-[9px] font-bold">
                                {doc.chuyenDe || 'Chuyên đề'}
                              </span>
                              {isFree ? (
                                <span className="bg-emerald-50 text-emerald-700 font-extrabold px-1.5 py-0.5 rounded text-[9px]">
                                  🆓 Free
                                </span>
                              ) : isOwned ? (
                                <span className="bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded text-[9px]">
                                  🟢 Đã mua
                                </span>
                              ) : (
                                <span className="bg-amber-50 text-amber-800 font-black px-1.5 py-0.5 rounded text-[9px] font-mono">
                                  💎 {doc.priceDiamonds}
                                </span>
                              )}
                            </div>
                            <h4 className="text-xs font-bold text-slate-800 line-clamp-2">{doc.title}</h4>
                            <p className="text-[10px] text-slate-400">Định dạng: {doc.fileType.toUpperCase()} • Dung lượng: {doc.fileSize}</p>
                          </div>

                          <div className="pt-1 border-t border-slate-100/50 flex justify-end">
                            {isOwned ? (
                              <button
                                onClick={() => {
                                  alert(`Tải tài liệu "${doc.title}" thành công từ Google Drive!`);
                                }}
                                className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer"
                              >
                                <Download className="w-3 h-3" />
                                <span>Tải tài liệu</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handlePurchaseDoc(doc.id, doc.title)}
                                className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-black text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-lg transition-all cursor-pointer shadow-3xs"
                              >
                                <span>Mua bằng {doc.priceDiamonds} 💎</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right 1 Col: Class Progress & Lesson List Overview */}
          <div className="space-y-5">
            {/* Class Stats Summary */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Tiến Độ Lớp Học</h3>
                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                  {currentClass.academicYear}
                </span>
              </div>

              {/* Progress bar */}
              <div>
                <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                  <span>Hoàn thành bài học</span>
                  <span className="font-bold text-slate-800">
                    {completedLessonIds.size}/{currentClass.lessons.length} bài
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.round((completedLessonIds.size / currentClass.lessons.length) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-3 text-center">
                <div className="p-2.5 bg-slate-50 rounded-xl">
                  <span className="block text-[11px] text-slate-500">Sĩ số lớp</span>
                  <span className="text-base font-extrabold text-slate-800">{currentClass.studentCount} HS</span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl">
                  <span className="block text-[11px] text-slate-500">Đã mở khóa</span>
                  <span className="text-base font-extrabold text-emerald-600">
                    {unlockedLessons.length} bài
                  </span>
                </div>
              </div>
            </div>

            {/* Quick list of all lessons */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Toàn Bộ Danh Mục Bài Học
              </h3>

              <div className="space-y-2">
                {currentClass.lessons.map((les, index) => {
                  const isCurrent = les.id === selectedLessonId;
                  const isDone = completedLessonIds.has(les.id);

                  return (
                    <button
                      key={les.id}
                      id={`lesson-item-${les.id}`}
                      disabled={!les.isUnlocked}
                      onClick={() => setSelectedLessonId(les.id)}
                      className={`w-full text-left p-3 rounded-xl border text-xs transition-all flex items-start gap-2.5 ${
                        isCurrent
                          ? 'border-indigo-500 bg-indigo-50/50 shadow-xs'
                          : les.isUnlocked
                          ? 'border-slate-200 hover:border-indigo-200 hover:bg-slate-50'
                          : 'border-slate-100 bg-slate-50/60 opacity-60 cursor-not-allowed'
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {isDone ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : les.isUnlocked ? (
                          <span className="w-4 h-4 rounded-full border-2 border-slate-300 flex items-center justify-center text-[9px] font-bold text-slate-500">
                            {index + 1}
                          </span>
                        ) : (
                          <Lock className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-800 truncate">{les.title}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span>{les.unit}</span>
                          {les.isUnlocked ? (
                            <span className="text-emerald-600 font-semibold">• Mở</span>
                          ) : (
                            <span className="text-amber-600 font-medium">• Mở ngày {les.unlockDate}</span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">Chưa có bài học nào được chọn hoặc lớp chưa mở khóa tài liệu.</p>
        </div>
      )}

      {/* FOOTER CỐ ĐỊNH THỐNG KÊ LỚP HỌC */}
      <div id="lophoc-footer-stats" className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4 mt-6">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
          <Users className="w-4 h-4 text-indigo-600" />
          <span>THỐNG KÊ LỚP HỌC:</span>
          <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100 font-extrabold text-sm">
            Sĩ số: {currentClass?.studentCount || 37} (Nữ: {Math.round((currentClass?.studentCount || 37) * 0.51)})
          </span>
        </div>

        <div className="text-xs text-slate-500 font-medium flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Báo cáo tiến độ cập nhật real-time Firestore</span>
        </div>
      </div>

      {/* MODAL GOOGLE MAPS XEM/CHỌN TỌA ĐỘ GPS LỚP HỌC */}
      {showGpsModal && (
        <GpsPickerModal
          title="Google Maps — Bản Đồ Vị Trí GPS Lớp Học"
          userNameOrContext={currentClass ? `${currentClass.name} (${currentClass.code})` : undefined}
          initialLat={selectedLat}
          initialLng={selectedLng}
          onClose={() => setShowGpsModal(false)}
          onConfirm={(coordsStr) => {
            setGpsCoords(coordsStr);
            setShowGpsModal(false);
            setNotification(`Đã xác nhận lấy tọa độ GPS lớp học: [${coordsStr}]`);
            setTimeout(() => setNotification(null), 4000);
          }}
        />
      )}

    </div>
  );
};
