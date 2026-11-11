import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  FileText,
  Sparkles,
  Navigation,
  Edit3,
  Check,
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
  getPinRequests,
  saveClass,
} from '../../ConnectData/ConnectFirestore';
import { auth } from '../../../config/firebase';
import { GpsPickerModal } from '../../../components/GpsPickerModal';

// Đường dẫn mặc định của app và module Lớp học
export const DEFAULT_APP_PATH = 'myApp/LopU';
export const DEFAULT_LOPHOC_PATH = `${DEFAULT_APP_PATH}/LopHoc`;

// Tọa độ mặc định của lớp "Kho Tài Liệu"
export const DEFAULT_KTL_COORDS = '15.173411, 108.667254';

// Hàm chuẩn hóa chuỗi tiếng Việt phục vụ tìm kiếm không dấu
function normalizeVietnamese(str: string): string {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

export interface ComboboxOption {
  id: string;
  label: string;
  badge?: string;
  badgeColor?: 'emerald' | 'indigo' | 'amber' | 'slate';
  subText?: string;
  disabled?: boolean;
}

interface SearchableComboboxProps {
  id: string;
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  emptyText?: string;
}

export const SearchableCombobox: React.FC<SearchableComboboxProps> = ({
  id,
  options,
  value,
  onChange,
  placeholder = 'Nhập để tìm kiếm hoặc chọn từ danh sách...',
  emptyText = 'Không tìm thấy kết quả phù hợp',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOption = useMemo(() => {
    return options.find(o => o.id === value) || null;
  }, [options, value]);

  useEffect(() => {
    if (!isTyping) {
      setSearchTerm(selectedOption ? selectedOption.label : '');
    }
  }, [selectedOption, isTyping]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsTyping(false);
        setSearchTerm(selectedOption ? selectedOption.label : '');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedOption]);

  const filteredOptions = useMemo(() => {
    if (!isTyping || !searchTerm.trim()) {
      return options;
    }
    const cleanSearch = normalizeVietnamese(searchTerm);
    return options.filter(opt => {
      const matchLabel = normalizeVietnamese(opt.label).includes(cleanSearch);
      const matchSub = opt.subText ? normalizeVietnamese(opt.subText).includes(cleanSearch) : false;
      const matchBadge = opt.badge ? normalizeVietnamese(opt.badge).includes(cleanSearch) : false;
      return matchLabel || matchSub || matchBadge;
    });
  }, [options, searchTerm, isTyping]);

  const handleSelect = (opt: ComboboxOption) => {
    if (opt.disabled) return;
    onChange(opt.id);
    setIsTyping(false);
    setSearchTerm(opt.label);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredOptions.length > 0) {
        const firstActive = filteredOptions.find(o => !o.disabled) || filteredOptions[0];
        handleSelect(firstActive);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setIsTyping(false);
      setSearchTerm(selectedOption ? selectedOption.label : '');
    } else if (e.key === 'ArrowDown') {
      if (!isOpen) setIsOpen(true);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <input
          id={id}
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={e => {
            setSearchTerm(e.target.value);
            setIsTyping(true);
            setIsOpen(true);
          }}
          onFocus={() => {
            setIsOpen(true);
            inputRef.current?.select();
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-slate-900 text-sm font-semibold py-2.5 px-3.5 pr-10 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden transition-colors shadow-2xs"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => {
            setIsOpen(prev => !prev);
            inputRef.current?.focus();
          }}
          className="absolute right-2 top-2.5 p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer transition-colors"
        >
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-40 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl max-h-64 overflow-y-auto divide-y divide-slate-100 py-1 animate-fade-in">
          {filteredOptions.length === 0 ? (
            <div className="p-3 text-center text-xs text-slate-400 italic">
              {emptyText}
            </div>
          ) : (
            filteredOptions.map(opt => {
              const isSelected = opt.id === value;
              return (
                <div
                  key={opt.id}
                  onClick={() => handleSelect(opt)}
                  className={`p-2.5 text-xs flex items-center justify-between cursor-pointer transition-colors ${
                    opt.disabled
                      ? 'opacity-50 cursor-not-allowed bg-slate-50'
                      : isSelected
                      ? 'bg-indigo-50/80 font-bold text-indigo-900 border-l-4 border-indigo-600'
                      : 'hover:bg-slate-100/70 text-slate-800'
                  }`}
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {opt.badge && (
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            opt.badgeColor === 'emerald'
                              ? 'bg-emerald-50 text-emerald-700'
                              : opt.badgeColor === 'amber'
                              ? 'bg-amber-50 text-amber-800'
                              : opt.badgeColor === 'slate'
                              ? 'bg-slate-100 text-slate-600'
                              : 'bg-indigo-50 text-indigo-700'
                          }`}
                        >
                          {opt.badge}
                        </span>
                      )}
                      <span className="truncate">{opt.label}</span>
                    </div>
                    {opt.subText && (
                      <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                        {opt.subText}
                      </div>
                    )}
                  </div>
                  {isSelected && (
                    <Check className="w-4 h-4 text-indigo-600 shrink-0 ml-1" />
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

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

  // GPS State
  const [showGpsModal, setShowGpsModal] = useState<boolean>(false);
  const [selectedLat, setSelectedLat] = useState<number>(15.173411);
  const [selectedLng, setSelectedLng] = useState<number>(108.667254);

  const activeStudentId = studentProfile?.id || currentStudentId;
  const activeEmail = (
    firebaseUser?.email ||
    studentProfile?.email ||
    auth?.currentUser?.email ||
    localStorage.getItem('lopu_auth_email') ||
    ''
  ).toLowerCase().trim();
  const effectiveRole: UserRole = currentRole || studentProfile?.role || 'student';

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
        gpsCoords: DEFAULT_KTL_COORDS,
      };
    } else {
      openClass = {
        ...openClass,
        id: 'cls_open_library',
        name: 'Kho Tài Liệu',
        teacherName: '',
        studentCount: 0,
        gpsCoords: openClass.gpsCoords || DEFAULT_KTL_COORDS,
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

      if (
        (idLower && approvedClassIds.has(idLower)) ||
        (codeLower && approvedClassCodes.has(codeLower)) ||
        (nameLower && approvedClassNames.has(nameLower))
      ) {
        return true;
      }

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

  // Quyền chỉnh sửa tọa độ: Chỉ quản trị, quản lý và chính giáo viên mở lớp mới có quyền
  const canEditCoordinates = useMemo(() => {
    if (effectiveRole === 'superadmin' || effectiveRole === 'admin') {
      return true;
    }
    if (effectiveRole === 'teacher' && currentClass) {
      const isOwnerTeacher =
        (currentClass.teacherId &&
          (currentClass.teacherId === activeStudentId ||
            currentClass.teacherId === studentProfile?.id)) ||
        (studentProfile?.name &&
          currentClass.teacherName?.toLowerCase().trim() ===
            studentProfile.name.toLowerCase().trim());
      if (isOwnerTeacher) return true;
    }
    return false;
  }, [effectiveRole, currentClass, activeStudentId, studentProfile]);

  // Tọa độ điểm đến của lớp học (Kho Tài Liệu mặc định là 15.173411, 108.667254)
  const currentGpsCoords = useMemo(() => {
    if (currentClass?.gpsCoords && currentClass.gpsCoords.trim()) {
      return currentClass.gpsCoords.trim();
    }
    return DEFAULT_KTL_COORDS;
  }, [currentClass]);

  // Đồng bộ tọa độ khi đổi lớp
  useEffect(() => {
    const coords = currentGpsCoords;
    const parts = coords.split(',').map(s => parseFloat(s.trim()));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      setSelectedLat(parts[0]);
      setSelectedLng(parts[1]);
    }
  }, [currentGpsCoords]);

  const handleOpenGpsModal = () => {
    if (!canEditCoordinates) {
      alert('Chỉ quản trị, quản lý và chính giáo viên mở lớp mới có quyền chỉnh sửa tọa độ.');
      return;
    }
    const parts = currentGpsCoords.split(',').map(s => parseFloat(s.trim()));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      setSelectedLat(parts[0]);
      setSelectedLng(parts[1]);
    }
    setShowGpsModal(true);
  };

  const handleConfirmGps = async (coordsStr: string) => {
    setShowGpsModal(false);
    if (!canEditCoordinates) {
      alert('Chỉ quản trị, quản lý và chính giáo viên mở lớp mới có quyền chỉnh sửa tọa độ.');
      return;
    }
    if (currentClass) {
      const updatedClass: ClassItem = {
        ...currentClass,
        gpsCoords: coordsStr,
      };
      await saveClass(updatedClass);
      setClasses(prev => prev.map(c => (c.id === updatedClass.id ? updatedClass : c)));
      setNotification(`Đã cập nhật tọa độ thành công cho ${currentClass.name}: [${coordsStr}]`);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  // Dẫn đường Google Maps: Đích đến là tọa độ lớp học, điểm bắt đầu là vị trí hiện tại của người dùng
  const handleNavigateGoogleMaps = () => {
    const coords = currentGpsCoords;
    const parts = coords.split(',').map(s => s.trim());
    const destLat = parts[0] || '15.173411';
    const destLng = parts[1] || '108.667254';

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          const originLat = pos.coords.latitude;
          const originLng = pos.coords.longitude;
          const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${destLat},${destLng}&travelmode=driving`;
          window.open(mapsUrl, '_blank');
        },
        () => {
          const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}&travelmode=driving`;
          window.open(mapsUrl, '_blank');
        },
        { timeout: 4000, enableHighAccuracy: true }
      );
    } else {
      const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}&travelmode=driving`;
      window.open(mapsUrl, '_blank');
    }
  };

  // Lọc tài liệu phát hành theo lớp học đang chọn
  const currentClassDocuments = useMemo(() => {
    if (!selectedClassId) return [];
    const nowMs = new Date().getTime();

    return publishedDocuments.filter(doc => {
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
        const targetClasses = doc.publishedToClasses || [];
        const isTargetedToThisClass =
          targetClasses.includes(selectedClassId) ||
          (currentClass?.code && targetClasses.includes(currentClass.code)) ||
          (currentClass?.name && targetClasses.includes(currentClass.name));
        if (!isTargetedToThisClass) return false;
      }

      const sched =
        doc.classSchedules?.[selectedClassId] ||
        (isKhoTaiLieu ? doc.classSchedules?.['open-library'] : undefined);
      if (sched) {
        if (sched.startDate) {
          const startMs = new Date(sched.startDate).getTime();
          if (nowMs < startMs) return false;
        }
        if (sched.endDate) {
          const endMs = new Date(sched.endDate).getTime();
          if (nowMs > endMs) return false;
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

  // Danh sách options dạng Combobox để người dùng vừa có thể nhập trực tiếp vừa có thể chọn danh sách
  const classComboboxOptions: ComboboxOption[] = useMemo(() => {
    return userClassOptions.map(c => {
      const isKTL =
        c.id === 'cls_open_library' ||
        c.code === 'KTL-OPEN' ||
        c.code === 'KTL' ||
        c.name?.toLowerCase().includes('kho tài liệu');

      return {
        id: c.id,
        label: isKTL ? 'Kho Tài Liệu' : `${c.code} — ${c.name}${c.teacherName ? ` (${c.teacherName})` : ''}`,
        badge: isKTL ? 'Toàn trường' : c.code,
        badgeColor: isKTL ? 'emerald' : 'indigo',
        subText: isKTL
          ? 'Kho tài liệu công khai toàn trường (Tọa độ: 15.173411, 108.667254)'
          : c.teacherName
          ? `Giáo viên: ${c.teacherName} • Phòng: ${c.room || 'Phòng học'}`
          : undefined,
      };
    });
  }, [userClassOptions]);

  const materialComboboxOptions: ComboboxOption[] = useMemo(() => {
    return classMaterials.map(mat => {
      let badgeColor: 'emerald' | 'amber' | 'indigo' | 'slate' = 'indigo';
      if (mat.badgeText.includes('Miễn phí') || mat.badgeText.includes('Đã mua')) {
        badgeColor = 'emerald';
      } else if (mat.badgeText.includes('💎')) {
        badgeColor = 'amber';
      } else if (mat.badgeText.includes('Khóa')) {
        badgeColor = 'slate';
      }

      return {
        id: mat.id,
        label: mat.title,
        badge: mat.badgeText,
        badgeColor,
        subText: mat.subText,
        disabled: mat.type === 'lesson' && !mat.isUnlocked,
      };
    });
  }, [classMaterials]);

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
        `hủy hoàn thành bài học "${lesson.title}"`
      );
      if (res.success && res.diamonds !== undefined) {
        setStudentProfile(prev => (prev ? { ...prev, diamonds: res.diamonds } : null));
      }
      setNotification(`Đã hủy đánh dấu hoàn thành bài học "${lesson.title}".`);
    } else {
      nextSet.add(lesson.id);
      const res = await rewardStudentDiamonds(
        activeStudentId,
        10,
        `hoàn thành xuất sắc bài học "${lesson.title}"`
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

      {/* Top Filter Bar: Combobox Chọn Lớp & Combobox Chọn Tài Liệu/Bài Học */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 1. Combobox Chọn Lớp Học (Nhập trực tiếp hoặc chọn từ danh sách) */}
          <div>
            <label
              htmlFor="select-class-dropdown"
              className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2"
            >
              1. Chọn Lớp Học (Nhập trực tiếp hoặc chọn danh sách)
            </label>
            <SearchableCombobox
              id="select-class-dropdown"
              value={selectedClassId}
              options={classComboboxOptions}
              onChange={handleClassChange}
              placeholder="Nhập tên lớp, mã lớp hoặc chọn từ danh sách..."
              emptyText="Không tìm thấy lớp học phù hợp"
            />

            {currentClass && (
              <div className="mt-2.5 flex items-center justify-between gap-2 flex-wrap text-xs">
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

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleNavigateGoogleMaps}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-2xs cursor-pointer transition-colors"
                    title="Mở Google Maps chỉ đường từ vị trí hiện tại của bạn đến lớp học"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Dẫn đường</span>
                  </button>

                  <span
                    className="font-mono text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200"
                    title="Tọa độ điểm đến của lớp học"
                  >
                    {currentGpsCoords}
                  </span>

                  {canEditCoordinates && (
                    <button
                      type="button"
                      onClick={handleOpenGpsModal}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-[11px] border border-amber-200 transition-colors cursor-pointer"
                      title="Chỉnh sửa tọa độ lớp học (Dành riêng cho Quản trị viên, Quản lý & Giáo viên mở lớp)"
                    >
                      <Edit3 className="w-3 h-3 text-amber-600" />
                      <span>Sửa tọa độ</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 2. Combobox Chọn Tài Liệu / Bài Học của Lớp (Nhập trực tiếp hoặc chọn từ danh sách) */}
          <div>
            <label
              htmlFor="select-material-dropdown"
              className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2"
            >
              2. Chọn Tài Liệu / Bài Học Của Lớp ({classMaterials.length} tài liệu)
            </label>
            <SearchableCombobox
              id="select-material-dropdown"
              value={selectedMaterialId}
              options={materialComboboxOptions}
              onChange={val => setSelectedMaterialId(val)}
              placeholder="Nhập tên tài liệu, bài học hoặc chọn từ danh sách..."
              emptyText={
                classMaterials.length === 0
                  ? 'Lớp học này chưa có tài liệu nào'
                  : 'Không tìm thấy tài liệu phù hợp'
              }
            />
            <p className="mt-2 text-xs text-slate-500">
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

      {/* MODAL GOOGLE MAPS CHỈNH SỬA TỌA ĐỘ LỚP HỌC (Dành riêng cho Quản trị, Quản lý, GV mở lớp) */}
      {showGpsModal && canEditCoordinates && (
        <GpsPickerModal
          title={`Google Maps — Chỉnh Sửa Tọa Độ Lớp: ${currentClass ? currentClass.name : 'Kho Tài Liệu'}`}
          userNameOrContext={currentClass ? `${currentClass.name} (${currentClass.code})` : undefined}
          initialLat={selectedLat}
          initialLng={selectedLng}
          onClose={() => setShowGpsModal(false)}
          onConfirm={handleConfirmGps}
        />
      )}
    </div>
  );
};
