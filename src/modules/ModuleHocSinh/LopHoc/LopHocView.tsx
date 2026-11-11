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
  X,
  UserPlus,
  PlusCircle,
  GraduationCap,
  Trash2,
  Save,
} from 'lucide-react';
import {
  ClassItem,
  ClassLesson,
  UserProfile,
  TeacherDocument,
  PinJoinRequest,
  UserRole,
  APP_SUBJECTS,
  AppSubject,
  isSubjectMatching,
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
  saveUser,
  deleteClass,
} from '../../ConnectData/ConnectFirestore';
import { auth } from '../../../config/firebase';
import { GpsPickerModal } from '../../../components/GpsPickerModal';

// Đường dẫn mặc định của app và module Lớp học
export const DEFAULT_APP_PATH = 'myApp/LopU';
export const DEFAULT_LOPHOC_PATH = `${DEFAULT_APP_PATH}/LopHoc`;

// Tọa độ mặc định của lớp "Kho Tài Liệu"
export const DEFAULT_KTL_COORDS = '15.173411, 108.667254';

// Re-export danh sách môn học dùng chung cho toàn bộ ứng dụng
export { APP_SUBJECTS, isSubjectMatching };
export type { AppSubject };

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
  badgeColor?: 'emerald' | 'indigo' | 'amber' | 'slate' | 'purple' | 'rose';
  subText?: string;
  disabled?: boolean;
  actionType?: 'select' | 'register_student' | 'apply_assistant' | 'create_class';
  classItem?: ClassItem;
  extraData?: any;
}

interface SearchableComboboxProps {
  id: string;
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  onSelectOption?: (option: ComboboxOption) => void;
  getDynamicOptions?: (searchTerm: string) => ComboboxOption[];
  placeholder?: string;
  emptyText?: string;
}

export const SearchableCombobox: React.FC<SearchableComboboxProps> = ({
  id,
  options,
  value,
  onChange,
  onSelectOption,
  getDynamicOptions,
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
    if (getDynamicOptions) {
      return getDynamicOptions(searchTerm.trim());
    }
    const cleanSearch = normalizeVietnamese(searchTerm);
    return options.filter(opt => {
      const matchLabel = normalizeVietnamese(opt.label).includes(cleanSearch);
      const matchSub = opt.subText ? normalizeVietnamese(opt.subText).includes(cleanSearch) : false;
      const matchBadge = opt.badge ? normalizeVietnamese(opt.badge).includes(cleanSearch) : false;
      return matchLabel || matchSub || matchBadge;
    });
  }, [options, searchTerm, isTyping, getDynamicOptions]);

  const handleSelect = (opt: ComboboxOption) => {
    if (opt.disabled) return;
    if (onSelectOption) {
      onSelectOption(opt);
    } else {
      onChange(opt.id);
    }
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
                              : opt.badgeColor === 'purple'
                              ? 'bg-purple-50 text-purple-700'
                              : opt.badgeColor === 'rose'
                              ? 'bg-rose-50 text-rose-700'
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
                  {opt.actionType === 'register_student' ? (
                    <span className="shrink-0 ml-1 px-2.5 py-1 text-[11px] font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-lg shadow-2xs">
                      Đăng ký học
                    </span>
                  ) : opt.actionType === 'apply_assistant' ? (
                    <span className="shrink-0 ml-1 px-2.5 py-1 text-[11px] font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-2xs">
                      Làm trợ giảng
                    </span>
                  ) : opt.actionType === 'create_class' ? (
                    <span className="shrink-0 ml-1 px-2.5 py-1 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-2xs">
                      Mở lớp mới
                    </span>
                  ) : (
                    isSelected && (
                      <Check className="w-4 h-4 text-indigo-600 shrink-0 ml-1" />
                    )
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
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all');
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

  // Modal State: Học sinh đăng ký học lớp ngoài danh sách
  const [registeringClass, setRegisteringClass] = useState<ClassItem | null>(null);
  const [registerPinInput, setRegisterPinInput] = useState<string>('');
  const [registerNote, setRegisterNote] = useState<string>('');

  // Modal State: Giáo viên đăng ký làm trợ giảng cho lớp đã có (Khả năng 1)
  const [assistantApplyingClass, setAssistantApplyingClass] = useState<ClassItem | null>(null);
  const [assistantNote, setAssistantNote] = useState<string>('');

  // Modal State: Giáo viên đăng ký mở lớp mới (Khả năng 2)
  const [showCreateClassModal, setShowCreateClassModal] = useState<boolean>(false);
  const [newClassName, setNewClassName] = useState<string>('');
  const [newClassCode, setNewClassCode] = useState<string>('');
  const [newClassSubject, setNewClassSubject] = useState<string>(APP_SUBJECTS[0]);
  const [newClassGrade, setNewClassGrade] = useState<string>('Khối 10');
  const [newClassRoom, setNewClassRoom] = useState<string>('');
  const [newClassPin, setNewClassPin] = useState<string>('');
  const [newClassRequirePin, setNewClassRequirePin] = useState<boolean>(false);
  const [newClassCoords, setNewClassCoords] = useState<string>(DEFAULT_KTL_COORDS);
  const [showNewClassGpsModal, setShowNewClassGpsModal] = useState<boolean>(false);

  // Modal State: Giáo viên sửa thông tin & cập nhật lớp học do mình mở
  const [showEditClassModal, setShowEditClassModal] = useState<boolean>(false);
  const [editClassName, setEditClassName] = useState<string>('');
  const [editClassCode, setEditClassCode] = useState<string>('');
  const [editClassSubject, setEditClassSubject] = useState<string>(APP_SUBJECTS[0]);
  const [editClassGrade, setEditClassGrade] = useState<string>('Khối 10');
  const [editClassRoom, setEditClassRoom] = useState<string>('');
  const [editClassPin, setEditClassPin] = useState<string>('');
  const [editClassRequirePin, setEditClassRequirePin] = useState<boolean>(false);
  const [editClassCoords, setEditClassCoords] = useState<string>(DEFAULT_KTL_COORDS);
  const [editClassDescription, setEditClassDescription] = useState<string>('');
  const [editClassAcademicYear, setEditClassAcademicYear] = useState<string>('2025-2026');
  const [editClassSemester, setEditClassSemester] = useState<string>('Học kỳ I');
  const [showEditClassGpsModal, setShowEditClassGpsModal] = useState<boolean>(false);

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

    // 2. Giáo viên (teacher) -> Nhìn thấy các lớp mình phụ trách + các lớp mình làm trợ giảng + Kho Tài Liệu
    if (effectiveRole === 'teacher') {
      const teacherClasses = classes.filter(c => {
        if (c.id === openClass!.id || c.name?.toLowerCase().includes('kho tài liệu')) return false;
        const isMatchId = c.teacherId && (c.teacherId === activeStudentId || c.teacherId === studentProfile?.id);
        const isMatchName =
          studentProfile?.name &&
          c.teacherName?.toLowerCase().trim() === studentProfile.name.toLowerCase().trim();
        const isAssistant =
          c.assistantIds?.includes(activeStudentId) ||
          (studentProfile?.id && c.assistantIds?.includes(studentProfile.id)) ||
          (studentProfile?.name &&
            c.assistantNames?.some(
              n => n.toLowerCase().trim() === studentProfile.name.toLowerCase().trim()
            )) ||
          (studentProfile?.classIds && studentProfile.classIds.includes(c.id));
        return isMatchId || isMatchName || isAssistant;
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

  // Quyền quản trị lớp học: Chỉ giáo viên chính mở lớp (hoặc Quản trị/Quản lý) mới có quyền sửa thông tin, cập nhật tọa độ và xóa lớp
  const isOwnerTeacher = useMemo(() => {
    if (isKhoTaiLieu) return false;
    if (effectiveRole === 'superadmin' || effectiveRole === 'admin') {
      return true;
    }
    if (effectiveRole === 'teacher' && currentClass) {
      const isMatchId =
        (currentClass.teacherId &&
          (currentClass.teacherId === activeStudentId ||
            currentClass.teacherId === studentProfile?.id)) ||
        false;
      const isMatchName =
        (studentProfile?.name &&
          currentClass.teacherName?.toLowerCase().trim() ===
            studentProfile.name.toLowerCase().trim()) ||
        false;
      return Boolean(isMatchId || isMatchName);
    }
    return false;
  }, [effectiveRole, currentClass, activeStudentId, studentProfile, isKhoTaiLieu]);

  const canEditCoordinates = useMemo(() => {
    if (effectiveRole === 'superadmin' || effectiveRole === 'admin') {
      return true;
    }
    return isOwnerTeacher;
  }, [effectiveRole, isOwnerTeacher]);

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

  // Thay đổi bộ lọc môn học từ dropdown Môn Học
  const handleSubjectFilterChange = (subj: string) => {
    setSelectedSubjectFilter(subj);
    // Nếu lớp hiện tại không thuộc môn học vừa chọn (và không phải Kho Tài Liệu), tự động chuyển sang Kho Tài Liệu hoặc lớp đầu tiên thuộc môn đó
    if (subj !== 'all' && !isKhoTaiLieu && !isSubjectMatching(currentClass?.subject, subj)) {
      const firstMatching = userClassOptions.find(
        c =>
          c.id !== 'cls_open_library' &&
          !c.name?.toLowerCase().includes('kho tài liệu') &&
          isSubjectMatching(c.subject, subj)
      );
      if (firstMatching) {
        setSelectedClassId(firstMatching.id);
      } else {
        setSelectedClassId('cls_open_library');
      }
      setSelectedMaterialId('');
    }
  };

  // Danh sách options dạng Combobox để người dùng vừa có thể nhập trực tiếp vừa có thể chọn danh sách
  // Tự động lọc theo môn học đã chọn từ dropdown Môn Học (Toán, Lý, Hóa, Sinh, Tin, Anh, Văn)
  const classComboboxOptions: ComboboxOption[] = useMemo(() => {
    return userClassOptions
      .filter(c => {
        const isKTL =
          c.id === 'cls_open_library' ||
          c.code === 'KTL-OPEN' ||
          c.code === 'KTL' ||
          c.name?.toLowerCase().includes('kho tài liệu');
        if (isKTL) return true; // Kho Tài Liệu luôn hiển thị cho tất cả môn
        return isSubjectMatching(c.subject, selectedSubjectFilter);
      })
      .map(c => {
        const isKTL =
          c.id === 'cls_open_library' ||
          c.code === 'KTL-OPEN' ||
          c.code === 'KTL' ||
          c.name?.toLowerCase().includes('kho tài liệu');

        return {
          id: c.id,
          label: isKTL ? 'Kho Tài Liệu' : `${c.code} — ${c.name}${c.teacherName ? ` (${c.teacherName})` : ''}`,
          badge: isKTL ? 'Toàn trường' : (c.subject ? `Môn ${c.subject}` : c.code),
          badgeColor: isKTL ? 'emerald' : 'indigo',
          subText: isKTL
            ? 'Kho tài liệu công khai toàn trường (Tọa độ: 15.173411, 108.667254)'
            : c.teacherName
            ? `Môn: ${c.subject || 'Chung'} • Giáo viên: ${c.teacherName} • Địa điểm: ${c.room || 'Chưa cập nhật'}`
            : `Môn: ${c.subject || 'Chung'} • Địa điểm: ${c.room || 'Chưa cập nhật'}`,
        };
      });
  }, [userClassOptions, selectedSubjectFilter]);

  // Tìm kiếm thông minh theo ký tự gõ vào (incremental search): gõ thêm từ -> lọc bớt, xóa từ -> bổ sung lại
  const getClassSearchOptions = (query: string): ComboboxOption[] => {
    const cleanSearch = normalizeVietnamese(query);
    if (!cleanSearch) return classComboboxOptions;

    const words = cleanSearch.split(/\s+/).filter(Boolean);

    // 1. Tìm trong toàn bộ danh sách lớp của trường (kết hợp lọc môn học nếu có)
    const matchedClasses = classes.filter(c => {
      const isKTL =
        c.id === 'cls_open_library' ||
        c.code === 'KTL-OPEN' ||
        c.code === 'KTL' ||
        c.name?.toLowerCase().includes('kho tài liệu');

      if (!isKTL && !isSubjectMatching(c.subject, selectedSubjectFilter)) {
        return false;
      }

      const nameNorm = normalizeVietnamese(isKTL ? 'Kho Tài Liệu' : c.name || '');
      const codeNorm = normalizeVietnamese(isKTL ? 'KTL' : c.code || '');
      const teacherNorm = normalizeVietnamese(c.teacherName || '');
      const subjectNorm = normalizeVietnamese(c.subject || '');
      const roomNorm = normalizeVietnamese(c.room || '');

      return words.every(
        w =>
          nameNorm.includes(w) ||
          codeNorm.includes(w) ||
          teacherNorm.includes(w) ||
          subjectNorm.includes(w) ||
          roomNorm.includes(w)
      );
    });

    const results: ComboboxOption[] = [];

    // Helper kiểm tra học sinh đã tham gia lớp chưa
    const isStudentEnrolledInClass = (c: ClassItem) => {
      if (
        c.id === 'cls_open_library' ||
        c.code === 'KTL-OPEN' ||
        c.code === 'KTL' ||
        c.name?.toLowerCase().includes('kho tài liệu')
      ) {
        return true;
      }
      if (
        studentProfile?.classIds &&
        (studentProfile.classIds.includes(c.id) || studentProfile.classIds.includes(c.code))
      ) {
        return true;
      }
      if (
        c.studentIds &&
        (c.studentIds.includes(activeStudentId) ||
          (studentProfile?.id && c.studentIds.includes(studentProfile.id)))
      ) {
        return true;
      }
      return pinRequests.some(
        r =>
          r.status === 'approved' &&
          (r.classId === c.id || r.className === c.name) &&
          (r.studentId === activeStudentId || r.studentEmail === activeEmail)
      );
    };

    // Helper kiểm tra giáo viên có phải là GV chính hay trợ giảng của lớp chưa
    const isTeacherInClass = (c: ClassItem) => {
      if (
        c.id === 'cls_open_library' ||
        c.code === 'KTL-OPEN' ||
        c.code === 'KTL' ||
        c.name?.toLowerCase().includes('kho tài liệu')
      ) {
        return { isPrimary: false, isAssistant: false, isMember: true };
      }
      const isPrimary =
        (c.teacherId && (c.teacherId === activeStudentId || c.teacherId === studentProfile?.id)) ||
        (studentProfile?.name &&
          c.teacherName?.toLowerCase().trim() === studentProfile.name.toLowerCase().trim());
      const isAssistant =
        c.assistantIds?.includes(activeStudentId) ||
        (studentProfile?.id && c.assistantIds?.includes(studentProfile.id)) ||
        (studentProfile?.name &&
          c.assistantNames?.some(
            n => n.toLowerCase().trim() === studentProfile.name.toLowerCase().trim()
          )) ||
        (studentProfile?.classIds && studentProfile.classIds.includes(c.id));
      return { isPrimary, isAssistant, isMember: isPrimary || isAssistant };
    };

    matchedClasses.forEach(c => {
      const isKTL =
        c.id === 'cls_open_library' ||
        c.code === 'KTL-OPEN' ||
        c.code === 'KTL' ||
        c.name?.toLowerCase().includes('kho tài liệu');

      if (isKTL) {
        results.push({
          id: 'cls_open_library',
          label: 'Kho Tài Liệu',
          badge: 'Toàn trường',
          badgeColor: 'emerald',
          subText: 'Kho tài liệu công khai toàn trường (Tọa độ: 15.173411, 108.667254)',
          actionType: 'select',
          classItem: c,
        });
        return;
      }

      if (effectiveRole === 'teacher') {
        const { isPrimary, isAssistant } = isTeacherInClass(c);
        if (isPrimary) {
          results.push({
            id: c.id,
            label: `${c.code} — ${c.name}`,
            badge: 'Lớp bạn dạy',
            badgeColor: 'indigo',
            subText: `Địa điểm: ${c.room || 'Chưa cập nhật'} • Sĩ số: ${c.studentCount || 0} HS`,
            actionType: 'select',
            classItem: c,
          });
        } else if (isAssistant) {
          results.push({
            id: c.id,
            label: `${c.code} — ${c.name}`,
            badge: 'Trợ giảng',
            badgeColor: 'emerald',
            subText: `GV chính: ${c.teacherName || 'Chưa rõ'} • Địa điểm: ${c.room || 'Chưa cập nhật'}`,
            actionType: 'select',
            classItem: c,
          });
        } else {
          // Khả năng 1 của GV: Tên lớp đã có trong hệ thống -> có thể đăng ký làm trợ giảng
          results.push({
            id: c.id,
            label: `${c.code} — ${c.name}`,
            badge: 'Đăng ký làm trợ giảng',
            badgeColor: 'purple',
            subText: `GV phụ trách: ${c.teacherName || 'Chưa rõ'} • Khối: ${c.grade} • Nhấn để đăng ký trợ giảng`,
            actionType: 'apply_assistant',
            classItem: c,
          });
        }
      } else if (effectiveRole === 'superadmin' || effectiveRole === 'admin') {
        results.push({
          id: c.id,
          label: `${c.code} — ${c.name}${c.teacherName ? ` (${c.teacherName})` : ''}`,
          badge: c.code,
          badgeColor: 'indigo',
          subText: `GV: ${c.teacherName || 'Chưa rõ'} • Địa điểm: ${c.room || 'Chưa cập nhật'}`,
          actionType: 'select',
          classItem: c,
        });
      } else {
        // Học sinh
        const isEnrolled = isStudentEnrolledInClass(c);
        if (isEnrolled) {
          results.push({
            id: c.id,
            label: `${c.code} — ${c.name}`,
            badge: 'Đã tham gia',
            badgeColor: 'indigo',
            subText: `GV: ${c.teacherName || 'Chưa rõ'} • Địa điểm: ${c.room || 'Chưa cập nhật'}`,
            actionType: 'select',
            classItem: c,
          });
        } else {
          // Học sinh nhập tên lớp bên ngoài danh sách -> tìm thấy trong hệ thống -> cho phép đăng ký học
          results.push({
            id: c.id,
            label: `${c.code} — ${c.name}`,
            badge: 'Đăng ký học',
            badgeColor: 'amber',
            subText: `GV: ${c.teacherName || 'Chưa rõ'} • Khối: ${c.grade} • Nhấn để đăng ký tham gia lớp`,
            actionType: 'register_student',
            classItem: c,
          });
        }
      }
    });

    // Đối với Giáo viên hoặc Quản trị:
    // Khả năng 2: Nếu chưa có (hoặc muốn mở lớp mới với tên vừa nhập) -> đăng ký mở lớp mới
    if (effectiveRole === 'teacher' || effectiveRole === 'superadmin' || effectiveRole === 'admin') {
      const hasExactClass = classes.some(
        c =>
          normalizeVietnamese(c.name) === cleanSearch ||
          normalizeVietnamese(c.code) === cleanSearch
      );
      if (!hasExactClass && query.trim().length > 0) {
        results.push({
          id: `create_new_class_action`,
          label: `➕ Đăng ký mở lớp mới: "${query.trim()}"`,
          badge: 'Mở lớp mới',
          badgeColor: 'emerald',
          subText: `Chưa có lớp "${query.trim()}". Nhấn để khởi tạo và mở lớp học mới ngay.`,
          actionType: 'create_class',
          extraData: { suggestedName: query.trim() },
        });
      }
    }

    return results;
  };

  const handleSelectClassOption = (opt: ComboboxOption) => {
    if (opt.actionType === 'register_student') {
      if (opt.classItem) {
        setRegisteringClass(opt.classItem);
        setRegisterPinInput('');
        setRegisterNote('');
      }
      return;
    }

    if (opt.actionType === 'apply_assistant') {
      if (opt.classItem) {
        setAssistantApplyingClass(opt.classItem);
        setAssistantNote('');
      }
      return;
    }

    if (opt.actionType === 'create_class') {
      const suggested = opt.extraData?.suggestedName || '';
      setNewClassName(suggested);
      setNewClassCode(
        suggested
          ? `LOP-${suggested.replace(/\s+/g, '').toUpperCase().slice(0, 8)}`
          : `LOP-${Date.now().toString().slice(-4)}`
      );
      setNewClassSubject(selectedSubjectFilter !== 'all' ? selectedSubjectFilter : APP_SUBJECTS[0]);
      setNewClassGrade('Khối 10');
      setNewClassRoom('');
      setNewClassPin('');
      setNewClassRequirePin(false);
      setNewClassCoords(DEFAULT_KTL_COORDS);
      setShowCreateClassModal(true);
      return;
    }

    // Mặc định chọn lớp
    handleClassChange(opt.id);
  };

  // Xác nhận học sinh đăng ký học lớp ngoài danh sách
  const handleConfirmStudentRegister = async () => {
    if (!registeringClass) return;

    if (registeringClass.requirePin) {
      if (!registerPinInput.trim()) {
        alert('Vui lòng nhập mã PIN của lớp học để tiếp tục.');
        return;
      }
      if (
        registerPinInput.trim().toUpperCase() !==
        registeringClass.pinCode?.trim().toUpperCase()
      ) {
        alert('Mã PIN không chính xác! Vui lòng liên hệ giáo viên phụ trách để nhận mã PIN.');
        return;
      }
    }

    // 1. Cập nhật danh sách học sinh của lớp
    const currentStudentIds = registeringClass.studentIds || [];
    const updatedStudentIds = Array.from(new Set([...currentStudentIds, activeStudentId]));
    const updatedClass: ClassItem = {
      ...registeringClass,
      studentIds: updatedStudentIds,
      studentCount: updatedStudentIds.length,
      updatedAt: new Date().toISOString(),
    };
    await saveClass(updatedClass);

    // 2. Cập nhật hồ sơ học sinh
    if (studentProfile) {
      const currentClassIds = studentProfile.classIds || [];
      const updatedClassIds = Array.from(new Set([...currentClassIds, registeringClass.id]));
      const updatedProfile: UserProfile = {
        ...studentProfile,
        classIds: updatedClassIds,
      };
      await saveUser(updatedProfile);
      setStudentProfile(updatedProfile);
    }

    // 3. Ghi nhận yêu cầu tham gia đã duyệt
    const newReq: PinJoinRequest = {
      id: `req_${Date.now()}`,
      studentId: activeStudentId,
      studentName: studentProfile?.name || 'Học sinh',
      studentEmail: activeEmail,
      classId: registeringClass.id,
      className: registeringClass.name,
      submittedPin: registerPinInput.trim().toUpperCase(),
      status: 'approved',
      requestDate: new Date().toLocaleString('vi-VN'),
    };
    setPinRequests(prev => [newReq, ...prev]);

    // 4. Cập nhật state lớp và tự động chọn lớp vừa đăng ký
    setClasses(prev => prev.map(c => (c.id === updatedClass.id ? updatedClass : c)));
    setSelectedClassId(registeringClass.id);
    setSelectedMaterialId('');
    setRegisteringClass(null);
    setRegisterPinInput('');
    setRegisterNote('');

    setNotification(`Chúc mừng bạn đã đăng ký tham gia lớp "${registeringClass.name}" thành công!`);
    setTimeout(() => setNotification(null), 5000);
  };

  // Xác nhận giáo viên đăng ký làm trợ giảng (Khả năng 1)
  const handleConfirmAssistantRegister = async () => {
    if (!assistantApplyingClass) return;

    const currentAssistantIds = assistantApplyingClass.assistantIds || [];
    const currentAssistantNames = assistantApplyingClass.assistantNames || [];

    const teacherName = studentProfile?.name || activeEmail || 'Giáo viên trợ giảng';
    const updatedAssistantIds = Array.from(new Set([...currentAssistantIds, activeStudentId]));
    const updatedAssistantNames = Array.from(new Set([...currentAssistantNames, teacherName]));

    const updatedClass: ClassItem = {
      ...assistantApplyingClass,
      assistantIds: updatedAssistantIds,
      assistantNames: updatedAssistantNames,
      updatedAt: new Date().toISOString(),
    };
    await saveClass(updatedClass);

    // Cập nhật profile của giáo viên
    if (studentProfile) {
      const currentClassIds = studentProfile.classIds || [];
      const updatedClassIds = Array.from(
        new Set([...currentClassIds, assistantApplyingClass.id])
      );
      const updatedProfile: UserProfile = {
        ...studentProfile,
        classIds: updatedClassIds,
      };
      await saveUser(updatedProfile);
      setStudentProfile(updatedProfile);
    }

    // Cập nhật state lớp và tự động chọn lớp
    setClasses(prev => prev.map(c => (c.id === updatedClass.id ? updatedClass : c)));
    setSelectedClassId(assistantApplyingClass.id);
    setSelectedMaterialId('');
    setAssistantApplyingClass(null);
    setAssistantNote('');

    setNotification(
      `Chúc mừng thầy/cô đã đăng ký làm trợ giảng cho lớp "${assistantApplyingClass.name}" thành công!`
    );
    setTimeout(() => setNotification(null), 5000);
  };

  // Xác nhận giáo viên đăng ký mở lớp mới (Khả năng 2)
  const handleConfirmCreateClass = async () => {
    if (!newClassName.trim()) {
      alert('Vui lòng nhập tên lớp học!');
      return;
    }

    const classCode = (
      newClassCode.trim() ||
      `LOP-${newClassName.replace(/\s+/g, '').toUpperCase().slice(0, 8)}`
    ).toUpperCase();

    const newClassItem: ClassItem = {
      id: `cls_${Date.now()}`,
      name: newClassName.trim(),
      code: classCode,
      subject: newClassSubject.trim() || 'Chung',
      grade: newClassGrade.trim() || 'Khối 10',
      room: newClassRoom.trim() || 'Chưa cập nhật',
      pinCode: newClassPin.trim().toUpperCase() || '000000',
      requirePin: newClassRequirePin,
      studentCount: 0,
      academicYear: '2025-2026',
      semester: 'Học kỳ I',
      color: 'indigo',
      description: `Lớp học ${newClassName.trim()} do thầy/cô ${studentProfile?.name || 'Giáo viên'} phụ trách`,
      teacherId: activeStudentId,
      teacherName: studentProfile?.name || activeEmail || 'Giáo viên bộ môn',
      studentIds: [],
      assistantIds: [],
      assistantNames: [],
      lessons: [],
      gpsCoords: newClassCoords.trim() || DEFAULT_KTL_COORDS,
      updatedAt: new Date().toISOString(),
    };

    await saveClass(newClassItem);

    // Cập nhật profile giáo viên
    if (studentProfile) {
      const currentClassIds = studentProfile.classIds || [];
      const updatedClassIds = Array.from(new Set([...currentClassIds, newClassItem.id]));
      const updatedProfile: UserProfile = {
        ...studentProfile,
        classIds: updatedClassIds,
      };
      await saveUser(updatedProfile);
      setStudentProfile(updatedProfile);
    }

    // Thêm vào danh sách lớp và tự động chọn lớp mới
    setClasses(prev => [newClassItem, ...prev]);
    setSelectedClassId(newClassItem.id);
    setSelectedMaterialId('');
    setShowCreateClassModal(false);

    setNotification(
      `Đã khởi tạo và mở lớp học "${newClassItem.name}" (Mã: ${newClassItem.code}) thành công!`
    );
    setTimeout(() => setNotification(null), 5000);
  };

  // Mở modal sửa thông tin lớp học do chính giáo viên mở
  const handleOpenEditClassModal = () => {
    if (!currentClass || isKhoTaiLieu) return;
    setEditClassName(currentClass.name || '');
    setEditClassCode(currentClass.code || '');
    setEditClassSubject(currentClass.subject || APP_SUBJECTS[0]);
    setEditClassGrade(currentClass.grade || 'Khối 10');
    setEditClassRoom(currentClass.room || '');
    setEditClassPin(currentClass.pinCode || '');
    setEditClassRequirePin(Boolean(currentClass.requirePin));
    setEditClassCoords(currentClass.gpsCoords || DEFAULT_KTL_COORDS);
    setEditClassDescription(currentClass.description || '');
    setEditClassAcademicYear(currentClass.academicYear || '2025-2026');
    setEditClassSemester(currentClass.semester || 'Học kỳ I');
    setShowEditClassModal(true);
  };

  // Xác nhận lưu cập nhật thông tin lớp học
  const handleConfirmUpdateClass = async () => {
    if (!currentClass || isKhoTaiLieu) return;
    if (!editClassName.trim()) {
      alert('Vui lòng nhập tên lớp học!');
      return;
    }

    const updatedClass: ClassItem = {
      ...currentClass,
      name: editClassName.trim(),
      code: (editClassCode.trim() || currentClass.code).toUpperCase(),
      subject: editClassSubject.trim() || currentClass.subject,
      grade: editClassGrade.trim() || currentClass.grade,
      room: editClassRoom.trim() || 'Chưa cập nhật',
      pinCode: editClassPin.trim().toUpperCase() || '000000',
      requirePin: editClassRequirePin,
      gpsCoords: editClassCoords.trim() || DEFAULT_KTL_COORDS,
      description: editClassDescription.trim() || currentClass.description,
      academicYear: editClassAcademicYear.trim() || currentClass.academicYear || '2025-2026',
      semester: editClassSemester.trim() || currentClass.semester || 'Học kỳ I',
      updatedAt: new Date().toISOString(),
    };

    await saveClass(updatedClass);

    setClasses(prev => prev.map(c => (c.id === updatedClass.id ? updatedClass : c)));
    setShowEditClassModal(false);

    setNotification(`Đã cập nhật thông tin lớp "${updatedClass.name}" thành công!`);
    setTimeout(() => setNotification(null), 5000);
  };

  // Xác nhận xóa vĩnh viễn lớp học do chính giáo viên mở
  const handleDeleteClass = async () => {
    if (!currentClass || isKhoTaiLieu) return;

    const confirmed = window.confirm(
      `⚠️ CẢNH BÁO XÓA LỚP HỌC:\n\nThầy/cô có chắc chắn muốn xóa vĩnh viễn lớp "${currentClass.name}" (${currentClass.code}) không?\n\nToàn bộ dữ liệu lớp học sẽ bị xóa khỏi hệ thống và không thể hoàn tác.`
    );
    if (!confirmed) return;

    try {
      const classIdToDelete = currentClass.id;
      const classNameToDelete = currentClass.name;

      // 1. Xóa khỏi Firestore & localStorage
      await deleteClass(classIdToDelete);

      // 2. Cập nhật hồ sơ giáo viên nếu có lưu classIds
      if (studentProfile?.classIds && studentProfile.classIds.includes(classIdToDelete)) {
        const updatedProfile: UserProfile = {
          ...studentProfile,
          classIds: studentProfile.classIds.filter(cid => cid !== classIdToDelete),
        };
        await saveUser(updatedProfile);
        setStudentProfile(updatedProfile);
      }

      // 3. Cập nhật state lớp và tự động chuyển về Kho Tài Liệu
      setClasses(prev => prev.filter(c => c.id !== classIdToDelete));
      setSelectedClassId('cls_open_library');
      setSelectedMaterialId('');
      setShowEditClassModal(false);

      setNotification(`Đã xóa vĩnh viễn lớp học "${classNameToDelete}" thành công.`);
      setTimeout(() => setNotification(null), 5000);
    } catch (err: any) {
      alert(`Lỗi khi xóa lớp học: ${err?.message || 'Vui lòng thử lại.'}`);
    }
  };

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

      {/* Top Filter Bar: Dropdown Môn Học, Combobox Chọn Lớp & Combobox Chọn Tài Liệu/Bài Học */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* 1. Dropdown Chọn Môn Học (phía trước dropdown Lớp học để lọc lớp theo môn) */}
          <div className="md:col-span-3">
            <label
              htmlFor="select-subject-filter"
              className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2"
            >
              1. Môn Học
            </label>
            <div className="relative">
              <select
                id="select-subject-filter"
                value={selectedSubjectFilter}
                onChange={e => handleSubjectFilterChange(e.target.value)}
                className="w-full bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-slate-900 text-sm font-bold py-2.5 px-3.5 pr-8 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden transition-colors shadow-2xs cursor-pointer appearance-none"
              >
                <option value="all">📚 Tất cả môn</option>
                {APP_SUBJECTS.map(subj => (
                  <option key={subj} value={subj}>
                    Môn {subj}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-3 pointer-events-none text-slate-400">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-500 truncate">
              {selectedSubjectFilter === 'all'
                ? 'Đang xem tất cả các môn'
                : `Đang lọc các lớp thuộc môn ${selectedSubjectFilter}`}
            </p>
          </div>

          {/* 2. Combobox Chọn Lớp Học (Nhập trực tiếp hoặc chọn từ danh sách) */}
          <div className="md:col-span-4 lg:col-span-5">
            <label
              htmlFor="select-class-dropdown"
              className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2"
            >
              2. Chọn Lớp Học (Nhập trực tiếp hoặc chọn danh sách)
            </label>
            <SearchableCombobox
              id="select-class-dropdown"
              value={selectedClassId}
              options={classComboboxOptions}
              onChange={handleClassChange}
              onSelectOption={handleSelectClassOption}
              getDynamicOptions={getClassSearchOptions}
              placeholder="Nhập tên lớp, mã lớp hoặc chọn từ danh sách..."
              emptyText="Không tìm thấy lớp học phù hợp trong hệ thống"
            />

            {currentClass && (
              <div className="mt-2.5 flex items-center justify-between gap-2 flex-wrap text-xs">
                {isKhoTaiLieu ? (
                  <p className="text-slate-500">
                    <span className="font-semibold text-indigo-700">Kho Tài Liệu</span> • Công khai cho tất cả giáo viên và học sinh (Tài liệu bán 💎 &amp; miễn phí 0 💎)
                  </p>
                ) : (
                  <p className="text-slate-500">
                    Địa điểm: <span className="font-semibold text-slate-700">{currentClass.room || 'Chưa cập nhật'}</span>
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
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs border border-amber-200 transition-colors cursor-pointer shadow-2xs"
                      title="Lấy và chỉnh sửa tọa độ lớp học qua Google Maps hoặc GPS (Dành riêng cho Quản trị viên, Quản lý & Giáo viên mở lớp)"
                    >
                      <MapPin className="w-3.5 h-3.5 text-amber-600" />
                      <span>Lấy tọa độ</span>
                    </button>
                  )}

                  {isOwnerTeacher && !isKhoTaiLieu && (
                    <>
                      <button
                        type="button"
                        onClick={handleOpenEditClassModal}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-200 transition-colors cursor-pointer shadow-2xs"
                        title="Chỉnh sửa và cập nhật thông tin lớp học do chính thầy/cô mở"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Sửa lớp</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleDeleteClass}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition-colors cursor-pointer shadow-2xs"
                        title="Xóa vĩnh viễn lớp học do chính thầy/cô mở"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        <span>Xóa lớp</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 3. Combobox Chọn Tài Liệu / Bài Học của Lớp (Nhập trực tiếp hoặc chọn từ danh sách) */}
          <div className="md:col-span-5 lg:col-span-4">
            <label
              htmlFor="select-material-dropdown"
              className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2"
            >
              3. Chọn Tài Liệu / Bài Học Của Lớp ({classMaterials.length} tài liệu)
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

      {/* MODAL GOOGLE MAPS LẤY TỌA ĐỘ LỚP HỌC (Dành riêng cho Quản trị, Quản lý, GV mở lớp) */}
      {showGpsModal && canEditCoordinates && (
        <GpsPickerModal
          title={`Google Maps — Lấy Tọa Độ Lớp: ${currentClass ? currentClass.name : 'Kho Tài Liệu'}`}
          userNameOrContext={currentClass ? `${currentClass.name} (${currentClass.code})` : undefined}
          initialLat={selectedLat}
          initialLng={selectedLng}
          onClose={() => setShowGpsModal(false)}
          onConfirm={handleConfirmGps}
        />
      )}

      {/* 1. MODAL HỌC SINH ĐĂNG KÝ HỌC (Khi tìm lớp ngoài danh sách) */}
      {registeringClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Đăng Ký Tham Gia Lớp Học</h3>
                  <p className="text-xs text-slate-500">Ghi danh vào lớp học trong hệ thống</p>
                </div>
              </div>
              <button
                onClick={() => setRegisteringClass(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Tên lớp:</span>
                <span className="font-bold text-slate-900">{registeringClass.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Mã lớp:</span>
                <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                  {registeringClass.code}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Giáo viên phụ trách:</span>
                <span className="font-semibold text-slate-800">{registeringClass.teacherName || 'Chưa phân công'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Môn &amp; Khối:</span>
                <span className="text-slate-700">{registeringClass.subject} • {registeringClass.grade}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Địa điểm:</span>
                <span className="text-slate-700">{registeringClass.room || 'Chưa cập nhật'}</span>
              </div>
              <div className="flex justify-between items-center border-t border-slate-200/60 pt-2">
                <span className="text-slate-600 font-medium">Học sinh đăng ký:</span>
                <span className="font-bold text-indigo-900">{studentProfile?.name || 'Học sinh'} ({activeEmail || activeStudentId})</span>
              </div>
            </div>

            {registeringClass.requirePin ? (
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Mã PIN lớp học <span className="text-rose-500">* (Bắt buộc)</span>
                </label>
                <input
                  type="text"
                  value={registerPinInput}
                  onChange={e => setRegisterPinInput(e.target.value.toUpperCase())}
                  placeholder="Nhập mã PIN lớp học..."
                  maxLength={10}
                  className="w-full text-center font-mono tracking-widest text-lg font-bold py-2.5 px-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500 focus:outline-hidden bg-slate-50 focus:bg-white"
                />
                <p className="text-[11px] text-amber-700">
                  * Lớp học này cài đặt bảo vệ bằng mã PIN. Vui lòng hỏi giáo viên phụ trách để nhận mã.
                </p>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Lớp học mở tự do, không yêu cầu mã PIN. Bạn có thể xác nhận tham gia ngay!</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Ghi chú / Lời nhắn (Tùy chọn)
              </label>
              <textarea
                rows={2}
                value={registerNote}
                onChange={e => setRegisterNote(e.target.value)}
                placeholder="Nhập lời nhắn gửi đến giáo viên phụ trách..."
                className="w-full text-xs py-2 px-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden bg-slate-50 focus:bg-white resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRegisteringClass(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmStudentRegister}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <UserPlus className="w-4 h-4" />
                <span>Xác nhận đăng ký học</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. MODAL GIÁO VIÊN ĐĂNG KÝ TRỢ GIẢNG (Khả năng 1: Tên lớp đã có) */}
      {assistantApplyingClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Đăng Ký Làm Trợ Giảng</h3>
                  <p className="text-xs text-slate-500">Hỗ trợ giảng dạy và quản lý lớp học</p>
                </div>
              </div>
              <button
                onClick={() => setAssistantApplyingClass(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-100 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Tên lớp:</span>
                <span className="font-bold text-slate-900">{assistantApplyingClass.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Mã lớp:</span>
                <span className="font-mono font-bold text-purple-700 bg-purple-100/70 px-2 py-0.5 rounded border border-purple-200">
                  {assistantApplyingClass.code}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Giáo viên phụ trách chính:</span>
                <span className="font-bold text-slate-800">{assistantApplyingClass.teacherName || 'Chưa phân công'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Môn &amp; Khối:</span>
                <span className="text-slate-700">{assistantApplyingClass.subject} • {assistantApplyingClass.grade}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Địa điểm:</span>
                <span className="text-slate-700">{assistantApplyingClass.room || 'Chưa cập nhật'}</span>
              </div>
              <div className="flex justify-between items-center border-t border-purple-200/60 pt-2">
                <span className="text-slate-600 font-medium">Giáo viên đăng ký trợ giảng:</span>
                <span className="font-bold text-purple-900">{studentProfile?.name || activeEmail}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Ghi chú phân công / Chuyên môn hỗ trợ (Tùy chọn)
              </label>
              <textarea
                rows={2}
                value={assistantNote}
                onChange={e => setAssistantNote(e.target.value)}
                placeholder="Ví dụ: Phụ trách chấm bài luyện tập, quản lý điểm danh và bài kiểm tra..."
                className="w-full text-xs py-2 px-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500 focus:outline-hidden bg-slate-50 focus:bg-white resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setAssistantApplyingClass(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmAssistantRegister}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <GraduationCap className="w-4 h-4" />
                <span>Xác nhận làm trợ giảng</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. MODAL GIÁO VIÊN ĐĂNG KÝ MỞ LỚP MỚI (Khả năng 2: Tên lớp chưa có) */}
      {showCreateClassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Đăng Ký Mở Lớp Học Mới</h3>
                  <p className="text-xs text-slate-500">Khởi tạo lớp học mới và đưa vào hệ thống</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateClassModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="sm:col-span-2 space-y-1">
                <label className="block font-bold text-slate-700">Tên lớp học <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={newClassName}
                  onChange={e => setNewClassName(e.target.value)}
                  placeholder="Ví dụ: 10A1 - Toán Chuyên..."
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-semibold text-slate-900"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-700">Mã lớp <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={newClassCode}
                  onChange={e => setNewClassCode(e.target.value.toUpperCase())}
                  placeholder="Ví dụ: 10A1, TOAN-10..."
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-mono uppercase font-bold text-indigo-700"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-700">Môn học <span className="text-rose-500">*</span></label>
                <select
                  value={newClassSubject}
                  onChange={e => setNewClassSubject(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden bg-white cursor-pointer font-semibold text-slate-900"
                >
                  {APP_SUBJECTS.map(subj => (
                    <option key={subj} value={subj}>
                      Môn {subj}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-700">Khối lớp</label>
                <select
                  value={newClassGrade}
                  onChange={e => setNewClassGrade(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden bg-white cursor-pointer"
                >
                  <option value="Khối 6">Khối 6</option>
                  <option value="Khối 7">Khối 7</option>
                  <option value="Khối 8">Khối 8</option>
                  <option value="Khối 9">Khối 9</option>
                  <option value="Khối 10">Khối 10</option>
                  <option value="Khối 11">Khối 11</option>
                  <option value="Khối 12">Khối 12</option>
                  <option value="Toàn trường">Toàn trường</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-700">Địa điểm</label>
                <input
                  type="text"
                  value={newClassRoom}
                  onChange={e => setNewClassRoom(e.target.value)}
                  placeholder="Ví dụ: Phòng 101, Nhà A, Cơ sở 1..."
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="block font-bold text-slate-700">Tọa độ lớp học (Dẫn đường Google Maps)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newClassCoords}
                    onChange={e => setNewClassCoords(e.target.value)}
                    placeholder="15.173411, 108.667254"
                    className="flex-1 py-2 px-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewClassGpsModal(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-bold transition-colors shrink-0 cursor-pointer text-xs border border-indigo-200"
                    title="Mở bản đồ Google Maps ghim vị trí hoặc lấy tọa độ lớp học"
                  >
                    <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Lấy tọa độ</span>
                  </button>
                </div>
              </div>

              <div className="sm:col-span-2 p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newClassRequirePin}
                    onChange={e => setNewClassRequirePin(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span>Yêu cầu mã PIN khi học sinh tham gia lớp</span>
                </label>
                {newClassRequirePin && (
                  <div className="pt-2">
                    <input
                      type="text"
                      value={newClassPin}
                      onChange={e => setNewClassPin(e.target.value.toUpperCase())}
                      placeholder="Nhập mã PIN (ví dụ: 123456)..."
                      maxLength={10}
                      className="w-full py-2 px-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-mono uppercase font-bold text-center bg-white"
                    />
                  </div>
                )}
              </div>

              <div className="sm:col-span-2 p-2.5 bg-indigo-50/70 border border-indigo-100 rounded-xl text-indigo-900 font-medium">
                Giáo viên mở lớp &amp; phụ trách: <span className="font-bold">{studentProfile?.name || activeEmail || 'Giáo viên phụ trách'}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateClassModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmCreateClass}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Tạo và mở lớp học</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL GOOGLE MAPS LẤY TỌA ĐỘ CHO LỚP MỚI */}
      {showNewClassGpsModal && (
        <GpsPickerModal
          title={`Google Maps — Lấy Tọa Độ Lớp: ${newClassName || 'Lớp mới'}`}
          userNameOrContext={newClassName ? `${newClassName} (${newClassCode || 'Mã lớp'})` : 'Lớp học mới'}
          initialLat={(() => {
            const parts = newClassCoords.split(',').map(s => parseFloat(s.trim()));
            return parts.length === 2 && !isNaN(parts[0]) ? parts[0] : 15.173411;
          })()}
          initialLng={(() => {
            const parts = newClassCoords.split(',').map(s => parseFloat(s.trim()));
            return parts.length === 2 && !isNaN(parts[1]) ? parts[1] : 108.667254;
          })()}
          onClose={() => setShowNewClassGpsModal(false)}
          onConfirm={coordsStr => {
            setNewClassCoords(coordsStr);
            setShowNewClassGpsModal(false);
          }}
        />
      )}

      {/* 4. MODAL GIÁO VIÊN SỬA THÔNG TIN & CẬP NHẬT LỚP HỌC DO MÌNH MỞ */}
      {showEditClassModal && currentClass && !isKhoTaiLieu && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Sửa Thông Tin Lớp Học</h3>
                  <p className="text-xs text-slate-500">Cập nhật thông tin lớp: {currentClass.name}</p>
                </div>
              </div>
              <button
                onClick={() => setShowEditClassModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="sm:col-span-2 space-y-1">
                <label className="block font-bold text-slate-700">Tên lớp học <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={editClassName}
                  onChange={e => setEditClassName(e.target.value)}
                  placeholder="Ví dụ: 10A1 - Toán Chuyên..."
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-semibold text-slate-900"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-700">Mã lớp <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={editClassCode}
                  onChange={e => setEditClassCode(e.target.value.toUpperCase())}
                  placeholder="Ví dụ: 10A1, TOAN-10..."
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-mono uppercase font-bold text-indigo-700"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-700">Môn học <span className="text-rose-500">*</span></label>
                <select
                  value={editClassSubject}
                  onChange={e => setEditClassSubject(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden bg-white cursor-pointer font-semibold text-slate-900"
                >
                  {APP_SUBJECTS.map(subj => (
                    <option key={subj} value={subj}>
                      Môn {subj}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-700">Khối lớp</label>
                <select
                  value={editClassGrade}
                  onChange={e => setEditClassGrade(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden bg-white cursor-pointer"
                >
                  <option value="Khối 6">Khối 6</option>
                  <option value="Khối 7">Khối 7</option>
                  <option value="Khối 8">Khối 8</option>
                  <option value="Khối 9">Khối 9</option>
                  <option value="Khối 10">Khối 10</option>
                  <option value="Khối 11">Khối 11</option>
                  <option value="Khối 12">Khối 12</option>
                  <option value="Toàn trường">Toàn trường</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-700">Địa điểm</label>
                <input
                  type="text"
                  value={editClassRoom}
                  onChange={e => setEditClassRoom(e.target.value)}
                  placeholder="Ví dụ: Phòng 101, Nhà A, Cơ sở 1..."
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="block font-bold text-slate-700">Tọa độ lớp học (Dẫn đường Google Maps)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editClassCoords}
                    onChange={e => setEditClassCoords(e.target.value)}
                    placeholder="15.173411, 108.667254"
                    className="flex-1 py-2 px-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditClassGpsModal(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-bold transition-colors shrink-0 cursor-pointer text-xs border border-indigo-200"
                    title="Mở bản đồ Google Maps ghim vị trí hoặc lấy tọa độ lớp học"
                  >
                    <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Lấy tọa độ</span>
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-700">Niên khóa</label>
                <input
                  type="text"
                  value={editClassAcademicYear}
                  onChange={e => setEditClassAcademicYear(e.target.value)}
                  placeholder="2025-2026"
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-700">Học kỳ</label>
                <input
                  type="text"
                  value={editClassSemester}
                  onChange={e => setEditClassSemester(e.target.value)}
                  placeholder="Học kỳ I"
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="block font-bold text-slate-700">Mô tả lớp học</label>
                <textarea
                  rows={2}
                  value={editClassDescription}
                  onChange={e => setEditClassDescription(e.target.value)}
                  placeholder="Mô tả nội dung chương trình hoặc ghi chú của lớp..."
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden resize-none"
                />
              </div>

              <div className="sm:col-span-2 p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editClassRequirePin}
                    onChange={e => setEditClassRequirePin(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span>Yêu cầu mã PIN khi học sinh tham gia lớp</span>
                </label>
                {editClassRequirePin && (
                  <div className="pt-2">
                    <input
                      type="text"
                      value={editClassPin}
                      onChange={e => setEditClassPin(e.target.value.toUpperCase())}
                      placeholder="Nhập mã PIN (ví dụ: 123456)..."
                      maxLength={10}
                      className="w-full py-2 px-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-mono uppercase font-bold text-center bg-white"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleDeleteClass}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer flex items-center gap-1.5"
                title="Xóa vĩnh viễn lớp học này"
              >
                <Trash2 className="w-4 h-4 text-rose-500" />
                <span>Xóa lớp này</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditClassModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleConfirmUpdateClass}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Lưu cập nhật</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL GOOGLE MAPS LẤY TỌA ĐỘ KHI SỬA LỚP */}
      {showEditClassGpsModal && (
        <GpsPickerModal
          title={`Google Maps — Lấy Tọa Độ Lớp: ${editClassName || currentClass?.name}`}
          userNameOrContext={editClassName ? `${editClassName} (${editClassCode || currentClass?.code})` : undefined}
          initialLat={(() => {
            const parts = editClassCoords.split(',').map(s => parseFloat(s.trim()));
            return parts.length === 2 && !isNaN(parts[0]) ? parts[0] : 15.173411;
          })()}
          initialLng={(() => {
            const parts = editClassCoords.split(',').map(s => parseFloat(s.trim()));
            return parts.length === 2 && !isNaN(parts[1]) ? parts[1] : 108.667254;
          })()}
          onClose={() => setShowEditClassGpsModal(false)}
          onConfirm={coordsStr => {
            setEditClassCoords(coordsStr);
            setShowEditClassGpsModal(false);
          }}
        />
      )}
    </div>
  );
};
