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
  Plus,
  KeyRound,
  Search,
  AlertCircle,
  FileText,
  Sparkles,
} from 'lucide-react';
import {
  ClassItem,
  ClassLesson,
  UserProfile,
  TeacherDocument,
  PinJoinRequest,
  UserRole,
} from '../../../services/storageTypes';
import {
  getClasses,
  updateProgress,
  getUsers,
  getTeacherDocuments,
  purchaseDocumentWithDiamonds,
  rewardStudentDiamonds,
  submitPinRequest,
  getPinRequests,
} from '../../ConnectData/ConnectFirestore';
import { auth } from '../../../config/firebase';
import { GpsPickerModal } from '../../../components/GpsPickerModal';

// Đường dẫn mặc định của app và module Lớp học
export const DEFAULT_APP_PATH = 'myApp/LopU';
export const DEFAULT_LOPHOC_PATH = `${DEFAULT_APP_PATH}/LopHoc`;

export interface LearningClassesViewProps {
  currentStudentId?: string;
  currentRole?: UserRole;
  currentUserProfile?: UserProfile | null;
  firebaseUser?: any;
}

export const LopHocView: React.FC<LearningClassesViewProps> = ({
  currentStudentId = 'u_hs01',
  currentRole,
  currentUserProfile,
  firebaseUser,
}) => {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('cls_open_library');
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [completedLessonIds, setCompletedLessonIds] = useState<Set<string>>(new Set<string>());
  const [completedDocIds, setCompletedDocIds] = useState<Set<string>>(new Set<string>());
  const [notification, setNotification] = useState<string | null>(null);

  // Student specific data for Wallet 💎 & Monetization
  const [studentProfile, setStudentProfile] = useState<UserProfile | null>(currentUserProfile || null);
  const [publishedDocuments, setPublishedDocuments] = useState<TeacherDocument[]>([]);
  const [pinRequests, setPinRequests] = useState<PinJoinRequest[]>([]);

  // Join Class Modal State
  const [showJoinModal, setShowJoinModal] = useState<boolean>(false);
  const [searchJoinTerm, setSearchJoinTerm] = useState<string>('');
  const [selectedClassToJoin, setSelectedClassToJoin] = useState<ClassItem | null>(null);
  const [inputPin, setInputPin] = useState<string>('');
  const [pinSubmitting, setPinSubmitting] = useState<boolean>(false);
  const [joinActionMsg, setJoinActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // GPS Google Maps State
  const [showGpsModal, setShowGpsModal] = useState<boolean>(false);
  const [gpsCoords, setGpsCoords] = useState<string>('21.028511, 105.854444');
  const [selectedLat, setSelectedLat] = useState<number>(21.028511);
  const [selectedLng, setSelectedLng] = useState<number>(105.854444);

  const activeStudentId = studentProfile?.id || currentStudentId;
  const activeEmail = (
    firebaseUser?.email ||
    studentProfile?.email ||
    auth?.currentUser?.email ||
    localStorage.getItem('lopu_auth_email') ||
    ''
  ).toLowerCase().trim();
  const effectiveRole: UserRole = currentRole || studentProfile?.role || 'student';

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

  const loadStudentAndDocs = async () => {
    const allUsers = await getUsers();

    let resolvedUser: UserProfile | null = currentUserProfile || null;

    if (!resolvedUser && (activeEmail || activeStudentId)) {
      resolvedUser =
        allUsers.find(
          u =>
            (activeEmail && u.email?.toLowerCase().trim() === activeEmail) ||
            (activeStudentId && u.id === activeStudentId)
        ) || null;
    }

    if (!resolvedUser && auth?.currentUser?.email) {
      const fbEmail = auth.currentUser.email.toLowerCase().trim();
      resolvedUser = allUsers.find(u => u.email?.toLowerCase().trim() === fbEmail) || null;
    }

    if (!resolvedUser && currentStudentId) {
      resolvedUser = allUsers.find(u => u.id === currentStudentId) || null;
    }

    if (!resolvedUser) {
      resolvedUser = allUsers.find(u => u.role === 'student') || allUsers[0] || null;
    }

    setStudentProfile(resolvedUser);

    const allPinReqs = await getPinRequests();
    setPinRequests(allPinReqs);

    const allDocs = await getTeacherDocuments();
    setPublishedDocuments(allDocs);
  };

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const list = await getClasses();
      setClasses(list);
      setSelectedClassId('cls_open_library');
      await loadStudentAndDocs();
      setLoading(false);
    }
    loadData();
  }, [currentUserProfile, currentRole]);

  // Luôn luôn hiển thị "Kho Tài Liệu" cho tất cả người dùng (học sinh, giáo viên, quản trị viên, khách)
  // Riêng lớp Kho tài liệu không có thành viên nào (tất cả đều thấy nên không cần yêu cầu thành viên của lớp này)
  const userClassOptions = useMemo(() => {
    let openClass = classes.find(
      c =>
        c.id === 'cls_open_library' ||
        c.code === 'KTL-OPEN' ||
        c.code === 'KTL' ||
        c.name?.toLowerCase().includes('kho tài liệu')
    );
    if (!openClass) {
      openClass = {
        id: 'cls_open_library',
        name: 'Kho Tài Liệu',
        code: 'KTL',
        subject: 'Chung (Tất cả môn)',
        grade: 'Toàn trường',
        teacherId: 'u_superadmin_1',
        teacherName: '',
        room: 'Kho Tài Liệu',
        pinCode: '000000',
        requirePin: false,
        studentCount: 0,
        academicYear: '2025-2026',
        semester: 'Học kỳ I',
        color: 'emerald',
        description:
          'Kho tài liệu công khai dành cho tất cả thành viên truy cập (chứa các tài liệu bán và tài liệu miễn phí 0 kim cương)',
        lessons: [],
      };
    } else {
      openClass = {
        ...openClass,
        id: 'cls_open_library',
        name: 'Kho Tài Liệu',
        teacherName: '',
        studentCount: 0,
      };
    }

    const openClasses = [openClass];

    // 1. Quản trị viên (superadmin / admin) -> Nhìn thấy tất cả các lớp + Kho Tài Liệu
    if (effectiveRole === 'superadmin' || effectiveRole === 'admin') {
      const otherClasses = classes.filter(
        c =>
          c.id !== openClass!.id &&
          c.code !== 'KTL' &&
          c.code !== 'KTL-OPEN' &&
          !c.name?.toLowerCase().includes('kho tài liệu')
      );
      return [...openClasses, ...otherClasses];
    }

    // 2. Giáo viên (teacher) -> Nhìn thấy các lớp mình phụ trách + Kho Tài Liệu
    if (effectiveRole === 'teacher') {
      const teacherClasses = classes.filter(c => {
        if (c.id === openClass!.id || c.name?.toLowerCase().includes('kho tài liệu')) return false;
        const isMatchId = c.teacherId && (c.teacherId === activeStudentId || c.teacherId === studentProfile?.id);
        const isMatchName =
          studentProfile?.name &&
          c.teacherName?.toLowerCase().trim() === studentProfile.name.toLowerCase().trim();
        return isMatchId || isMatchName;
      });
      return [...openClasses, ...teacherClasses];
    }

    // 3. Học sinh (student) hoặc người dùng khác:
    // Dropdown Lớp học sẽ hiện các lớp mà học sinh đã duyệt yêu cầu tham gia (hoặc được chính quản lý thêm vào lớp).
    // Nếu chưa được duyệt lớp nào, học sinh CHỈ thấy duy nhất lớp "Kho Tài Liệu".
    const approvedClassIds = new Set<string>();
    const approvedClassCodes = new Set<string>();
    const approvedClassNames = new Set<string>();

    // a. Từ classIds trong hồ sơ học sinh (đã được quản lý thêm hoặc hệ thống duyệt)
    if (studentProfile?.classIds && Array.isArray(studentProfile.classIds)) {
      studentProfile.classIds.forEach(cid => {
        if (cid) {
          const clean = cid.toLowerCase().trim();
          approvedClassIds.add(clean);
          approvedClassCodes.add(clean);
          approvedClassNames.add(clean);
        }
      });
    }

    // b. Từ yêu cầu mã PIN đã được duyệt (status === 'approved')
    pinRequests.forEach(req => {
      if (req.status === 'approved') {
        const isMatchStudent =
          (activeStudentId && req.studentId === activeStudentId) ||
          (studentProfile?.id && req.studentId === studentProfile.id) ||
          (activeEmail && req.studentEmail?.toLowerCase().trim() === activeEmail);

        if (isMatchStudent) {
          if (req.classId) approvedClassIds.add(req.classId.toLowerCase().trim());
          if (req.className) approvedClassNames.add(req.className.toLowerCase().trim());
        }
      }
    });

    // Lọc các lớp mà học sinh thực sự là thành viên đã được duyệt
    const studentApprovedClasses = classes.filter(c => {
      if (
        c.id === openClass!.id ||
        c.code === 'KTL' ||
        c.code === 'KTL-OPEN' ||
        c.name?.toLowerCase().includes('kho tài liệu')
      ) {
        return false;
      }

      const idLower = (c.id || '').toLowerCase().trim();
      const codeLower = (c.code || '').toLowerCase().trim();
      const nameLower = (c.name || '').toLowerCase().trim();

      // Kiểm tra trong danh sách duyệt từ classIds hoặc pinRequests
      if (
        (idLower && approvedClassIds.has(idLower)) ||
        (codeLower && approvedClassCodes.has(codeLower)) ||
        (nameLower && approvedClassNames.has(nameLower))
      ) {
        return true;
      }

      // Kiểm tra giáo viên / quản lý đã thêm trực tiếp vào danh sách học sinh của lớp
      if (activeStudentId && c.studentIds?.includes(activeStudentId)) return true;
      if (studentProfile?.id && c.studentIds?.includes(studentProfile.id)) return true;
      if (activeEmail && c.studentIds?.includes(activeEmail)) return true;

      return false;
    });

    return [...openClasses, ...studentApprovedClasses];
  }, [classes, studentProfile, pinRequests, effectiveRole, activeStudentId, activeEmail]);

  const currentClass = useMemo(() => {
    return userClassOptions.find(c => c.id === selectedClassId) || userClassOptions[0];
  }, [userClassOptions, selectedClassId]);

  const isKhoTaiLieu = useMemo(() => {
    return (
      selectedClassId === 'cls_open_library' ||
      selectedClassId === 'open-library' ||
      currentClass?.id === 'cls_open_library' ||
      currentClass?.code === 'KTL-OPEN' ||
      currentClass?.code === 'KTL' ||
      currentClass?.name?.toLowerCase().includes('kho tài liệu')
    );
  }, [selectedClassId, currentClass]);

  // Lọc tài liệu phát hành theo lớp học đang chọn
  const currentClassDocuments = useMemo(() => {
    if (!selectedClassId) return [];
    const nowMs = new Date().getTime();

    return publishedDocuments.filter(doc => {
      // 1. Nếu đang chọn lớp "Kho Tài Liệu":
      // Tất cả mọi người đều thấy tài liệu phát hành vào Kho Tài Liệu
      // (chứa cả tài liệu bán kim cương và tài liệu miễn phí giá 0 kim cương)
      if (isKhoTaiLieu) {
        const isTargetedToKhoTaiLieu =
          doc.publishedToClasses?.includes('cls_open_library') ||
          doc.publishedToClasses?.includes('open-library') ||
          doc.publishedToClasses?.includes('KTL') ||
          doc.publishedToClasses?.includes('KTL-OPEN') ||
          doc.isForSale ||
          (doc.priceDiamonds !== undefined && doc.priceDiamonds >= 0) ||
          doc.isPublished;
        if (!isTargetedToKhoTaiLieu) return false;
      } else {
        // 2. Nếu đang chọn một lớp học cụ thể (ví dụ 12A1):
        // CHỈ hiện tài liệu được phát hành vào lớp học đó.
        // Tài liệu không phát hành vào đây thì sẽ chỉ thấy với thành viên trong lớp được phát hành.
        const targetClasses = doc.publishedToClasses || [];
        const isTargetedToThisClass =
          targetClasses.includes(selectedClassId) ||
          (currentClass?.code && targetClasses.includes(currentClass.code)) ||
          (currentClass?.name && targetClasses.includes(currentClass.name));
        if (!isTargetedToThisClass) return false;
      }

      // Kiểm tra lịch mở phát hành riêng cho lớp
      const sched =
        doc.classSchedules?.[selectedClassId] ||
        (isKhoTaiLieu ? doc.classSchedules?.['open-library'] : undefined);
      if (sched) {
        if (sched.startDate) {
          const startMs = new Date(sched.startDate).getTime();
          if (nowMs < startMs) return false; // Chưa đến giờ phát hành
        }
        if (sched.endDate) {
          const endMs = new Date(sched.endDate).getTime();
          if (nowMs > endMs) return false; // Đã hết hạn phát hành
        }
      }

      return true;
    });
  }, [publishedDocuments, selectedClassId, currentClass, isKhoTaiLieu]);

  // Danh sách tài liệu & bài học tương ứng của lớp học đang chọn
  const classMaterials = useMemo(() => {
    const list: Array<{
      id: string;
      type: 'document' | 'lesson';
      title: string;
      badgeText: string;
      subText: string;
      doc?: TeacherDocument;
      lesson?: ClassLesson;
      isUnlocked?: boolean;
    }> = [];

    // 1. Tài liệu chuyên đề phát hành của lớp
    currentClassDocuments.forEach(doc => {
      const isFree = !doc.isForSale || (doc.priceDiamonds ?? 0) === 0;
      const isOwned =
        isFree || (doc.purchasedUserIds && doc.purchasedUserIds.includes(activeStudentId));

      let badgeText = '';
      if (isFree) {
        badgeText = '🆓 [Miễn phí]';
      } else if (isOwned) {
        badgeText = '🟢 [Đã mua]';
      } else {
        badgeText = `💎 [${doc.priceDiamonds} 💎]`;
      }

      list.push({
        id: `doc_${doc.id}`,
        type: 'document',
        title: doc.title,
        badgeText,
        subText:
          doc.chuyenDe || doc.subject || (doc.fileType ? doc.fileType.toUpperCase() : 'Tài liệu'),
        doc,
        isUnlocked: true,
      });
    });

    // 2. Bài học trong lớp (nếu có)
    if (currentClass?.lessons && currentClass.lessons.length > 0) {
      currentClass.lessons.forEach(les => {
        list.push({
          id: `les_${les.id}`,
          type: 'lesson',
          title: les.title,
          badgeText: les.isUnlocked ? '🟢 [Bài học]' : '🔒 [Khóa]',
          subText: les.unit || 'Bài học',
          lesson: les,
          isUnlocked: les.isUnlocked,
        });
      });
    }

    return list;
  }, [currentClassDocuments, currentClass, activeStudentId]);

  // Tự động chọn tài liệu đầu tiên khi đổi lớp hoặc danh sách tài liệu thay đổi
  useEffect(() => {
    if (classMaterials.length > 0) {
      const exists = classMaterials.some(m => m.id === selectedMaterialId);
      if (!exists) {
        const firstUnlocked = classMaterials.find(m => m.isUnlocked) || classMaterials[0];
        setSelectedMaterialId(firstUnlocked.id);
      }
    } else {
      setSelectedMaterialId('');
    }
  }, [classMaterials, selectedMaterialId]);

  const handleClassChange = (classId: string) => {
    setSelectedClassId(classId);
    setSelectedMaterialId('');
  };

  const currentMaterial = useMemo(() => {
    return classMaterials.find(m => m.id === selectedMaterialId) || classMaterials[0] || null;
  }, [classMaterials, selectedMaterialId]);

  const selectedDoc = currentMaterial?.type === 'document' ? currentMaterial.doc : null;
  const selectedLesson = currentMaterial?.type === 'lesson' ? currentMaterial.lesson : null;

  const isCurrentDocFree = !selectedDoc?.isForSale || (selectedDoc?.priceDiamonds ?? 0) === 0;
  const isCurrentDocOwned =
    isCurrentDocFree ||
    (selectedDoc?.purchasedUserIds && selectedDoc.purchasedUserIds.includes(activeStudentId));

  const handlePurchaseDoc = async (docId: string, title: string) => {
    const res = await purchaseDocumentWithDiamonds(activeStudentId, docId);
    if (res.success) {
      setNotification(res.message);
      await loadStudentAndDocs();
    } else {
      alert(res.message);
    }
  };

  const handleToggleCompleteDoc = async (docId: string, title: string) => {
    const isCompleted = completedDocIds.has(docId);
    const nextSet = new Set(completedDocIds);
    if (isCompleted) {
      nextSet.delete(docId);
      const res = await rewardStudentDiamonds(
        activeStudentId,
        -10,
        `hủy hoàn thành ôn tập tài liệu "${title}"`
      );
      if (res.success && res.diamonds !== undefined) {
        setStudentProfile(prev => (prev ? { ...prev, diamonds: res.diamonds } : null));
      }
      setNotification(`Đã hủy hoàn thành ôn tập "${title}".`);
    } else {
      nextSet.add(docId);
      const res = await rewardStudentDiamonds(
        activeStudentId,
        10,
        `hoàn thành xuất sắc ôn tập tài liệu "${title}"`
      );
      if (res.success && res.diamonds !== undefined) {
        setStudentProfile(prev => (prev ? { ...prev, diamonds: res.diamonds } : null));
        setNotification(`Xuất sắc! Đã hoàn thành ôn tập "${title}". Bạn được thưởng +10 💎 vào ví!`);
      } else {
        setNotification(`Đã ghi nhận hoàn thành ôn tập "${title}".`);
      }
    }
    setCompletedDocIds(nextSet);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleToggleCompleteLesson = async (lesson: ClassLesson) => {
    const isCompleted = completedLessonIds.has(lesson.id);
    const nextSet = new Set(completedLessonIds);
    if (isCompleted) {
      nextSet.delete(lesson.id);
      const res = await rewardStudentDiamonds(
        activeStudentId,
        -10,
        `hủy hoàn thành tài liệu "${lesson.title}"`
      );
      if (res.success && res.diamonds !== undefined) {
        setStudentProfile(prev => (prev ? { ...prev, diamonds: res.diamonds } : null));
      }
      setNotification(`Đã hủy đánh dấu hoàn thành tài liệu "${lesson.title}".`);
    } else {
      nextSet.add(lesson.id);
      const res = await rewardStudentDiamonds(
        activeStudentId,
        10,
        `hoàn thành xuất sắc tài liệu "${lesson.title}"`
      );
      if (res.success && res.diamonds !== undefined) {
        setStudentProfile(prev => (prev ? { ...prev, diamonds: res.diamonds } : null));
        setNotification(
          `Tuyệt vời! Đã hoàn thành bài học "${lesson.title}". Bạn được cộng thưởng +10 💎 vào ví!`
        );
      } else {
        setNotification(`Tuyệt vời! Đã hoàn thành bài học "${lesson.title}".`);
      }
    }
    setCompletedLessonIds(nextSet);

    if (currentClass) {
      const total = currentClass.lessons.length;
      const count = nextSet.size;
      const rate = total > 0 ? Math.round((count / total) * 100) : 0;
      await updateProgress({
        id: `pr_${activeStudentId}_${currentClass.id}`,
        studentId: activeStudentId,
        studentName: studentProfile?.name || 'Học sinh',
        classId: currentClass.id,
        className: currentClass.name,
        completedLessons: count,
        totalLessons: total,
        completionRate: rate,
        attendanceRate: 100,
        averageScore: 9.0,
        lastActive: new Date().toLocaleString('vi-VN'),
      });
    }

    setTimeout(() => setNotification(null), 4000);
  };

  const handleOpenJoinModal = async () => {
    setShowJoinModal(true);
    setJoinActionMsg(null);
    try {
      const reqs = await getPinRequests();
      setPinRequests(
        reqs.filter(
          r =>
            r.studentId === activeStudentId ||
            (activeEmail && r.studentEmail?.toLowerCase() === activeEmail)
        )
      );
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmitPin = async () => {
    if (!selectedClassToJoin) {
      setJoinActionMsg({ type: 'error', text: 'Vui lòng chọn lớp học cần đăng ký!' });
      return;
    }
    if (!inputPin.trim()) {
      setJoinActionMsg({ type: 'error', text: 'Vui lòng nhập mã PIN của lớp!' });
      return;
    }
    setPinSubmitting(true);
    setJoinActionMsg(null);
    try {
      const res = await submitPinRequest({
        classId: selectedClassToJoin.id,
        className: selectedClassToJoin.name,
        studentId: activeStudentId,
        studentName: studentProfile?.name || 'Học sinh',
        studentEmail: activeEmail || 'student@lopu.edu.vn',
        submittedPin: inputPin.trim(),
      });
      if (res.success) {
        setJoinActionMsg({ type: 'success', text: res.message });
        setInputPin('');
        const reqs = await getPinRequests();
        setPinRequests(
          reqs.filter(
            r =>
              r.studentId === activeStudentId ||
              (activeEmail && r.studentEmail?.toLowerCase() === activeEmail)
          )
        );
      } else {
        setJoinActionMsg({ type: 'error', text: res.message });
      }
    } catch (err: any) {
      setJoinActionMsg({ type: 'error', text: err.message || 'Có lỗi xảy ra khi gửi yêu cầu.' });
    } finally {
      setPinSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (userClassOptions.length === 0) {
    return (
      <div
        id="learning-classes-view"
        className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3"
      >
        <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
        <h3 className="text-base font-bold text-slate-900">Chưa có lớp học hoặc chưa có tài liệu</h3>
        <p className="text-xs text-slate-500 max-w-lg mx-auto leading-relaxed">
          Hiện tại chưa có lớp học nào được khởi tạo hoặc gán cho bạn.
        </p>
      </div>
    );
  }

  const completedCount =
    classMaterials.filter(m =>
      m.type === 'document'
        ? completedDocIds.has(m.doc?.id || '')
        : completedLessonIds.has(m.lesson?.id || '')
    ).length;

  return (
    <div id="learning-classes-view" className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 animate-fade-in shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Top Filter Bar: Dropdown Chọn Lớp & Dropdown Chọn Tài Liệu/Bài Học */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 1. Dropdown Chọn Lớp Học */}
          <div>
            <div className="flex items-center justify-between mb-2 gap-2">
              <label
                htmlFor="select-class-dropdown"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
              >
                1. Chọn Lớp Học
              </label>
              <button
                type="button"
                onClick={handleOpenJoinModal}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-colors shadow-2xs cursor-pointer shrink-0"
                title="Đăng ký tham gia lớp học mới bằng mã PIN"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tham gia lớp mới</span>
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="relative">
                <select
                  id="select-class-dropdown"
                  value={selectedClassId}
                  onChange={e => handleClassChange(e.target.value)}
                  className="w-full appearance-none bg-slate-50 hover:bg-slate-100/80 text-slate-900 text-sm font-semibold py-2.5 px-3.5 pr-9 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden transition-colors"
                >
                  {userClassOptions.length === 0 ? (
                    <option value="">-- (Danh sách rỗng) --</option>
                  ) : (
                    userClassOptions.map(c => {
                      const isKTL =
                        c.id === 'cls_open_library' ||
                        c.code === 'KTL-OPEN' ||
                        c.code === 'KTL' ||
                        c.name?.toLowerCase().includes('kho tài liệu');

                      return (
                        <option key={c.id} value={c.id}>
                          {isKTL ? 'Kho Tài Liệu' : `${c.code} — ${c.name}${c.teacherName ? ` (${c.teacherName})` : ''}`}
                        </option>
                      );
                    })
                  )}
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
                {isKhoTaiLieu ? (
                  <p className="text-slate-500">
                    <span className="font-semibold text-indigo-700">Kho Tài Liệu</span> • Công khai cho tất cả giáo viên và học sinh (Tài liệu bán 💎 &amp; miễn phí 0 💎)
                  </p>
                ) : (
                  <p className="text-slate-500">
                    Phòng: <span className="font-semibold text-slate-700">{currentClass.room || 'Phòng học bộ môn'}</span>
                    {currentClass.teacherName && (
                      <>
                        {' '}• Giáo viên: <span className="font-semibold text-slate-700">{currentClass.teacherName}</span>
                      </>
                    )}
                    {' '}• Sĩ số: <span className="font-semibold text-indigo-700">{currentClass.studentCount || 0} HS</span>
                  </p>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleOpenGpsModal}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-2xs cursor-pointer transition-colors"
                    title="Mở Google Maps dẫn đường"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Dẫn đường</span>
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

          {/* 2. Dropdown Chọn Tài Liệu / Bài Học của Lớp */}
          <div>
            <label
              htmlFor="select-material-dropdown"
              className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2"
            >
              2. Chọn Tài Liệu / Bài Học Của Lớp ({classMaterials.length} tài liệu)
            </label>
            <div className="relative">
              <select
                id="select-material-dropdown"
                value={selectedMaterialId}
                onChange={e => setSelectedMaterialId(e.target.value)}
                className="w-full appearance-none bg-slate-50 hover:bg-slate-100/80 text-slate-900 text-sm font-semibold py-2.5 px-3.5 pr-9 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden transition-colors"
              >
                {classMaterials.length === 0 ? (
                  <option value="">-- (Lớp học này chưa có tài liệu nào) --</option>
                ) : (
                  classMaterials.map(mat => (
                    <option
                      key={mat.id}
                      value={mat.id}
                      disabled={mat.type === 'lesson' && !mat.isUnlocked}
                    >
                      {mat.badgeText} {mat.title} {mat.subText ? `(${mat.subText})` : ''}
                    </option>
                  ))
                )}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3.5 pointer-events-none" />
            </div>
            <p className="mt-1.5 text-xs text-slate-500">
              {isKhoTaiLieu
                ? 'Kho Tài Liệu chung: Tất cả thành viên đều có thể xem và tải tài liệu miễn phí hoặc mua tài liệu thu phí.'
                : 'Chỉ học sinh trong lớp mới thấy và truy cập tài liệu phát hành cho lớp này.'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Area: Document View OR Lesson Details Workspace */}
      {selectedDoc ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left / Center 2 Cols: Document Details & Content */}
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
              {/* Header Badges */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-50 text-indigo-700">
                    {selectedDoc.chuyenDe || selectedDoc.subject || 'Chuyên đề học tập'}
                  </span>
                  <span className="px-2 py-0.5 text-[11px] font-mono font-bold rounded bg-slate-100 text-slate-700 uppercase">
                    {selectedDoc.fileType} • {selectedDoc.fileSize}
                  </span>
                  {isCurrentDocFree ? (
                    <span className="px-2.5 py-1 text-xs font-extrabold rounded-lg bg-emerald-50 text-emerald-700">
                      🆓 Miễn phí (0 💎)
                    </span>
                  ) : isCurrentDocOwned ? (
                    <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-100 text-emerald-800">
                      🟢 Đã sở hữu
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 text-xs font-black rounded-lg bg-amber-100 text-amber-900 font-mono">
                      💎 {selectedDoc.priceDiamonds} Kim Cương
                    </span>
                  )}
                </div>

                <div className="text-xs text-slate-500">
                  Tác giả: <span className="font-semibold text-slate-700">{selectedDoc.authorEmail ? selectedDoc.authorEmail.split('@')[0] : 'Giáo viên phụ trách'}</span>
                </div>
              </div>

              {/* Title & Description */}
              <div>
                <h2 className="text-xl font-bold text-slate-900 leading-snug">
                  {selectedDoc.title}
                </h2>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  {selectedDoc.contentSnippet ||
                    'Tài liệu học tập chuyên đề chất lượng cao, phục vụ giảng dạy và ôn thi học kỳ.'}
                </p>
              </div>

              {/* Objectives & Info */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Thông tin chuyên đề &amp; mục tiêu học tập:
                </h3>
                <ul className="space-y-2 text-xs text-slate-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                    <span>
                      Phạm vi học tập: {selectedDoc.subject} - Lớp {selectedDoc.grade} • Chuyên đề: {selectedDoc.chuyenDe || selectedDoc.title}.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                    <span>
                      Phát hành tại: <span className="font-semibold text-indigo-700">{isKhoTaiLieu ? 'Kho Tài Liệu' : currentClass?.name}</span>.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                    <span>Học sinh tải về hoặc xem trực tuyến để ôn tập trọng tâm và luyện đề thi.</span>
                  </li>
                </ul>

                <div className="pt-2 border-t border-slate-200/60 flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                  <span className="font-bold text-slate-700">Định dạng file:</span>
                  <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-indigo-700 font-semibold">
                    📄 {selectedDoc.fileType.toUpperCase()}
                  </span>
                  <span className="font-bold text-slate-700 ml-2">Dung lượng:</span>
                  <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-700 font-semibold">
                    {selectedDoc.fileSize}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                {isCurrentDocOwned ? (
                  <button
                    onClick={() => {
                      if (selectedDoc.driveFileId) {
                        window.open(`https://drive.google.com/file/d/${selectedDoc.driveFileId}/view`, '_blank');
                      } else {
                        alert(
                          `Đang tải tài liệu "${selectedDoc.title}" (${selectedDoc.fileType.toUpperCase()}) về máy...`
                        );
                      }
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-xs cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Tải tài liệu ({selectedDoc.fileType.toUpperCase()})</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handlePurchaseDoc(selectedDoc.id, selectedDoc.title)}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-600 text-white transition-all shadow-xs cursor-pointer"
                    >
                      <span>💎 Mua tài liệu bằng {selectedDoc.priceDiamonds} Kim Cương</span>
                    </button>
                    <span className="text-xs text-slate-500 font-semibold">
                      Ví của bạn: <span className="font-bold text-amber-700">{studentProfile?.diamonds ?? 0} 💎</span>
                    </span>
                  </div>
                )}

                <button
                  onClick={() => handleToggleCompleteDoc(selectedDoc.id, selectedDoc.title)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
                    completedDocIds.has(selectedDoc.id)
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {completedDocIds.has(selectedDoc.id)
                      ? 'Đã hoàn thành ôn tập (Bấm để hủy)'
                      : 'Đánh dấu đã ôn tập'}
                  </span>
                </button>
              </div>

              {/* TẤT CẢ TÀI LIỆU PHÁT HÀNH CỦA LỚP */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  📁 Tất cả tài liệu phát hành của {isKhoTaiLieu ? 'Kho Tài Liệu' : currentClass.name}:
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {currentClassDocuments.map(doc => {
                    const isFree = !doc.isForSale || (doc.priceDiamonds ?? 0) === 0;
                    const isOwned =
                      isFree ||
                      (doc.purchasedUserIds && doc.purchasedUserIds.includes(activeStudentId));
                    const isSelected = selectedDoc.id === doc.id;

                    return (
                      <div
                        key={doc.id}
                        className={`p-3 rounded-xl border flex flex-col justify-between gap-2 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-50/50 border-indigo-500 ring-2 ring-indigo-200'
                            : 'bg-slate-50 hover:bg-slate-100/70 border-slate-200'
                        }`}
                        onClick={() => setSelectedMaterialId(`doc_${doc.id}`)}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-mono bg-indigo-50 text-indigo-700 px-1 py-0.5 rounded text-[9px] font-bold">
                              {doc.chuyenDe || doc.subject || 'Chuyên đề'}
                            </span>
                            {isFree ? (
                              <span className="bg-emerald-50 text-emerald-700 font-extrabold px-1.5 py-0.5 rounded text-[9px]">
                                🆓 Miễn phí (0 💎)
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
                          <p className="text-[10px] text-slate-400">
                            Định dạng: {doc.fileType.toUpperCase()} • Dung lượng: {doc.fileSize}
                          </p>
                        </div>

                        <div className="pt-1 border-t border-slate-200/50 flex justify-end">
                          {isOwned ? (
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                if (doc.driveFileId) {
                                  window.open(`https://drive.google.com/file/d/${doc.driveFileId}/view`, '_blank');
                                } else {
                                  alert(`Tải tài liệu "${doc.title}" thành công!`);
                                }
                              }}
                              className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-indigo-600 bg-white hover:bg-indigo-50 rounded-lg border border-indigo-200 transition-colors cursor-pointer"
                            >
                              <Download className="w-3 h-3" />
                              <span>Tải về</span>
                            </button>
                          ) : (
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                handlePurchaseDoc(doc.id, doc.title);
                              }}
                              className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-black text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-lg transition-all cursor-pointer"
                            >
                              <span>Mua {doc.priceDiamonds} 💎</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Right 1 Col: Class Progress & Materials List */}
          <div className="space-y-5">
            {/* Progress summary */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Tiến Độ Lớp Học</h3>
                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                  {currentClass.academicYear || '2025-2026'}
                </span>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                  <span>Hoàn thành tài liệu / bài học</span>
                  <span className="font-bold text-slate-800">
                    {completedCount}/{classMaterials.length}
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                    style={{
                      width: `${classMaterials.length > 0 ? Math.round((completedCount / classMaterials.length) * 100) : 0}%`,
                    }}
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-3 text-center">
                <div className="p-2.5 bg-slate-50 rounded-xl">
                  <span className="block text-[11px] text-slate-500">Sĩ số lớp</span>
                  <span className="text-base font-extrabold text-slate-800">
                    {isKhoTaiLieu ? 'Công khai' : `${currentClass?.studentCount || 0} HS`}
                  </span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl">
                  <span className="block text-[11px] text-slate-500">Số tài liệu</span>
                  <span className="text-base font-extrabold text-emerald-600">
                    {classMaterials.length} tài liệu
                  </span>
                </div>
              </div>
            </div>

            {/* Quick list of all materials */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Toàn Bộ Danh Mục Tài Liệu Của Lớp
              </h3>

              <div className="space-y-2">
                {classMaterials.map((mat, index) => {
                  const isCurrent = mat.id === selectedMaterialId;
                  const isDone =
                    mat.type === 'document'
                      ? completedDocIds.has(mat.doc?.id || '')
                      : completedLessonIds.has(mat.lesson?.id || '');

                  return (
                    <button
                      key={mat.id}
                      disabled={mat.type === 'lesson' && !mat.isUnlocked}
                      onClick={() => setSelectedMaterialId(mat.id)}
                      className={`w-full text-left p-3 rounded-xl border text-xs transition-all flex items-start gap-2.5 cursor-pointer ${
                        isCurrent
                          ? 'border-indigo-500 bg-indigo-50/50 shadow-xs font-semibold'
                          : mat.isUnlocked
                          ? 'border-slate-200 hover:border-indigo-200 hover:bg-slate-50'
                          : 'border-slate-100 bg-slate-50/60 opacity-60 cursor-not-allowed'
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {isDone ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <span className="w-4 h-4 rounded-full border-2 border-slate-300 flex items-center justify-center text-[9px] font-bold text-slate-500">
                            {index + 1}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-800 truncate">{mat.title}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span className="font-medium text-indigo-600">{mat.badgeText}</span>
                          <span>•</span>
                          <span className="truncate">{mat.subText}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : selectedLesson ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left / Center 2 Cols: Lesson Content & Materials */}
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-50 text-indigo-700">
                    {selectedLesson.unit}
                  </span>
                  {selectedLesson.isUnlocked ? (
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
                  <span>Thời lượng: {selectedLesson.estimatedMinutes} phút</span>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900 leading-snug">
                  {selectedLesson.title}
                </h2>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  {selectedLesson.description}
                </p>
              </div>

              {/* Tags */}
              {selectedLesson.tags && selectedLesson.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {selectedLesson.tags.map((t, idx) => (
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
                    <span>Nắm vững các định nghĩa, định lý và công thức trọng tâm của {selectedLesson.unit}.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                    <span>Thực hành giải quyết các dạng toán điển hình thường xuất hiện trong đề thi học kỳ.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                    <span>Hoàn thành bài tập tự luyện và đối chiếu lời giải chi tiết của giáo viên.</span>
                  </li>
                </ul>

                {/* Gói tài nguyên chuyên đề */}
                <div className="pt-2 border-t border-slate-200/60 flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                  <span className="font-bold text-slate-700">Gói tài nguyên chuyên đề:</span>
                  <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-indigo-700 font-semibold">
                    📄 KienThuc.html
                  </span>
                  <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-emerald-700 font-semibold">
                    📁 HinhAnh
                  </span>
                  <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-purple-700 font-semibold">
                    📁 AmThanh
                  </span>
                  <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-rose-700 font-semibold">
                    📁 Video
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                <button
                  id="btn-toggle-complete-lesson"
                  onClick={() => handleToggleCompleteLesson(selectedLesson)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
                    completedLessonIds.has(selectedLesson.id)
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {completedLessonIds.has(selectedLesson.id)
                      ? 'Đã hoàn thành bài học (Bấm để hủy)'
                      : 'Đánh dấu hoàn thành bài học'}
                  </span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    id="btn-download-notes"
                    onClick={() =>
                      alert(`Tải tài liệu PDF bài học "${selectedLesson.title}" từ Google Drive thành công!`)
                    }
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" /> Tải tài liệu PDF
                  </button>
                </div>
              </div>

              {/* TÀI LIỆU CHUYÊN ĐỀ LỚP HỌC */}
              {currentClassDocuments.length > 0 && (
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    📁 Tài liệu chuyên đề lớp học:
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {currentClassDocuments.map(doc => {
                      const isFree = !doc.isForSale || (doc.priceDiamonds ?? 0) === 0;
                      const isOwned =
                        isFree ||
                        (doc.purchasedUserIds && doc.purchasedUserIds.includes(activeStudentId));

                      return (
                        <div
                          key={doc.id}
                          className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex flex-col justify-between gap-2"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="font-mono bg-indigo-50 text-indigo-700 px-1 py-0.5 rounded text-[9px] font-bold">
                                {doc.chuyenDe || 'Chuyên đề'}
                              </span>
                              {isFree ? (
                                <span className="bg-emerald-50 text-emerald-700 font-extrabold px-1.5 py-0.5 rounded text-[9px]">
                                  🆓 Miễn phí (0 💎)
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
                            <p className="text-[10px] text-slate-400">
                              Định dạng: {doc.fileType.toUpperCase()} • Dung lượng: {doc.fileSize}
                            </p>
                          </div>

                          <div className="pt-1 border-t border-slate-100/50 flex justify-end">
                            {isOwned ? (
                              <button
                                onClick={() => {
                                  if (doc.driveFileId) {
                                    window.open(`https://drive.google.com/file/d/${doc.driveFileId}/view`, '_blank');
                                  } else {
                                    alert(`Tải tài liệu "${doc.title}" thành công!`);
                                  }
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
                </div>
              )}
            </div>
          </div>

          {/* Right 1 Col: Class Progress & Lesson List Overview */}
          <div className="space-y-5">
            {/* Class Stats Summary */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Tiến Độ Lớp Học</h3>
                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                  {currentClass.academicYear || '2025-2026'}
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
                      width: `${currentClass.lessons.length > 0 ? Math.round((completedLessonIds.size / currentClass.lessons.length) * 100) : 0}%`,
                    }}
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-3 text-center">
                <div className="p-2.5 bg-slate-50 rounded-xl">
                  <span className="block text-[11px] text-slate-500">Sĩ số lớp</span>
                  <span className="text-base font-extrabold text-slate-800">
                    {isKhoTaiLieu ? 'Công khai' : `${currentClass.studentCount || 0} HS`}
                  </span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl">
                  <span className="block text-[11px] text-slate-500">Số tài liệu</span>
                  <span className="text-base font-extrabold text-emerald-600">
                    {classMaterials.length} tài liệu
                  </span>
                </div>
              </div>
            </div>

            {/* Quick list of all materials */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Toàn Bộ Danh Mục Tài Liệu Của Lớp
              </h3>

              <div className="space-y-2">
                {classMaterials.map((mat, index) => {
                  const isCurrent = mat.id === selectedMaterialId;
                  const isDone =
                    mat.type === 'document'
                      ? completedDocIds.has(mat.doc?.id || '')
                      : completedLessonIds.has(mat.lesson?.id || '');

                  return (
                    <button
                      key={mat.id}
                      disabled={mat.type === 'lesson' && !mat.isUnlocked}
                      onClick={() => setSelectedMaterialId(mat.id)}
                      className={`w-full text-left p-3 rounded-xl border text-xs transition-all flex items-start gap-2.5 cursor-pointer ${
                        isCurrent
                          ? 'border-indigo-500 bg-indigo-50/50 shadow-xs font-semibold'
                          : mat.isUnlocked
                          ? 'border-slate-200 hover:border-indigo-200 hover:bg-slate-50'
                          : 'border-slate-100 bg-slate-50/60 opacity-60 cursor-not-allowed'
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {isDone ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <span className="w-4 h-4 rounded-full border-2 border-slate-300 flex items-center justify-center text-[9px] font-bold text-slate-500">
                            {index + 1}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-800 truncate">{mat.title}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span className="font-medium text-indigo-600">{mat.badgeText}</span>
                          <span>•</span>
                          <span className="truncate">{mat.subText}</span>
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
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-xs">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700">Lớp học này hiện chưa có tài liệu nào</h3>
          <p className="mt-1 text-xs text-slate-500">
            {isKhoTaiLieu
              ? 'Kho Tài Liệu đang được cập nhật tài liệu mới.'
              : 'Giáo viên phụ trách chưa phát hành tài liệu vào lớp này. Vui lòng chọn Kho Tài Liệu hoặc lớp khác.'}
          </p>
        </div>
      )}

      {/* FOOTER CỐ ĐỊNH THỐNG KÊ LỚP HỌC */}
      <div
        id="lophoc-footer-stats"
        className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4 mt-6"
      >
        <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
          <Users className="w-4 h-4 text-indigo-600" />
          <span>THỐNG KÊ LỚP HỌC:</span>
          <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100 font-extrabold text-sm">
            {isKhoTaiLieu
              ? 'Kho Tài Liệu: Công khai toàn trường (Không giới hạn thành viên)'
              : `Sĩ số: ${currentClass?.studentCount || 0} học sinh`}
          </span>
        </div>

        <div className="text-xs text-slate-500 font-medium flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Báo cáo tiến độ cập nhật real-time Firestore</span>
        </div>
      </div>

      {/* MODAL GOOGLE MAPS DẪN ĐƯỜNG LỚP HỌC */}
      {showGpsModal && (
        <GpsPickerModal
          title="Google Maps — Bản Đồ Dẫn Đường Lớp Học"
          userNameOrContext={currentClass ? `${currentClass.name} (${currentClass.code})` : undefined}
          initialLat={selectedLat}
          initialLng={selectedLng}
          onClose={() => setShowGpsModal(false)}
          onConfirm={coordsStr => {
            setGpsCoords(coordsStr);
            setShowGpsModal(false);
            setNotification(`Đã xác nhận vị trí dẫn đường lớp học: [${coordsStr}]`);
            setTimeout(() => setNotification(null), 4000);
          }}
        />
      )}

      {/* MODAL ĐĂNG KÝ THAM GIA LỚP HỌC MỚI (MÃ PIN) */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 sm:p-5 bg-gradient-to-r from-indigo-900 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-500/20 rounded-xl border border-indigo-400/30">
                  <KeyRound className="w-5 h-5 text-indigo-300" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Tham Gia Lớp Học Mới</h3>
                  <p className="text-[11px] text-slate-300">Nhập mã PIN hoặc tìm danh sách lớp toàn trường</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowJoinModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
              {joinActionMsg && (
                <div
                  className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                    joinActionMsg.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {joinActionMsg.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  )}
                  <span>{joinActionMsg.text}</span>
                </div>
              )}

              {/* Tìm kiếm & Chọn Lớp */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  1. Chọn Lớp Cần Đăng Ký Tham Gia
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Tìm theo tên lớp, mã lớp hoặc tên giáo viên..."
                    value={searchJoinTerm}
                    onChange={e => setSearchJoinTerm(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-slate-50/50">
                  {classes
                    .filter(c => {
                      if (
                        c.id === 'cls_open_library' ||
                        c.code === 'KTL' ||
                        c.code === 'KTL-OPEN' ||
                        c.name?.toLowerCase().includes('kho tài liệu')
                      ) {
                        return false;
                      }
                      const term = searchJoinTerm.toLowerCase();
                      return (
                        c.name.toLowerCase().includes(term) ||
                        c.code.toLowerCase().includes(term) ||
                        (c.teacherName || '').toLowerCase().includes(term)
                      );
                    })
                    .map(c => {
                      const isSelected = selectedClassToJoin?.id === c.id;
                      return (
                        <div
                          key={c.id}
                          onClick={() => setSelectedClassToJoin(c)}
                          className={`p-2.5 text-xs flex items-center justify-between cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-indigo-50 border-l-4 border-indigo-600 font-bold text-indigo-900'
                              : 'hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          <div>
                            <div className="font-bold">
                              {c.name} ({c.code})
                            </div>
                            <div className="text-[11px] text-slate-500">
                              GV: {c.teacherName || 'Chưa phân công'} • Phòng: {c.room || 'Chưa xếp'}
                            </div>
                          </div>
                          {c.requirePin && (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-200 rounded text-[10px] font-bold flex items-center gap-1">
                              <KeyRound className="w-3 h-3" /> Yêu cầu PIN
                            </span>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Ô nhập mã PIN */}
              {selectedClassToJoin && (
                <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-2">
                  <div className="text-xs font-bold text-indigo-900">
                    Lớp đã chọn:{' '}
                    <span className="text-indigo-700">{selectedClassToJoin.name}</span> ({selectedClassToJoin.code})
                  </div>
                  {selectedClassToJoin.requirePin && (
                    <p className="text-[11px] text-slate-500">
                      Lớp học này yêu cầu Mã PIN bảo mật do giáo viên bộ môn (
                      <span className="font-semibold text-slate-700">
                        {selectedClassToJoin.teacherName || 'Phụ trách'}
                      </span>
                      ) cung cấp.
                    </p>
                  )}

                  <div className="space-y-1 pt-1">
                    <label className="block text-xs font-bold text-slate-700">Mã PIN Lớp Học:</label>
                    <input
                      type="text"
                      placeholder="Nhập mã PIN của lớp..."
                      value={inputPin}
                      onChange={e => setInputPin(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-bold tracking-widest text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              )}

              {/* Danh sách các yêu cầu đã gửi */}
              {pinRequests.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Lịch Sử Đăng Ký Tham Gia Lớp
                  </div>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {pinRequests.map(req => (
                      <div
                        key={req.id}
                        className="p-2 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold text-slate-800">{req.className}</span>
                          <span className="text-[10px] text-slate-400 ml-2">({req.requestDate})</span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
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
                            ? 'Từ chối'
                            : 'Chờ duyệt'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowJoinModal(false)}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 transition-colors"
              >
                Đóng
              </button>
              <button
                type="button"
                disabled={pinSubmitting || !selectedClassToJoin}
                onClick={handleSubmitPin}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-colors disabled:opacity-50 inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                {pinSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Đang xử lý...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Xác Nhận Đăng Ký</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
