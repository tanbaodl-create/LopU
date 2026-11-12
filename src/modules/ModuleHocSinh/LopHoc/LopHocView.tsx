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
  generateDefaultClassCode,
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
  const [isCustomClassCode, setIsCustomClassCode] = useState<boolean>(false);

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

  // Quyền xem sĩ số học sinh của lớp: Chỉ hiện với giáo viên phụ trách, quản lý và quản trị; ẩn với các tài khoản khác
  const canViewStudentCount = useMemo(() => {
    if (isKhoTaiLieu) return false;
    if (effectiveRole === 'superadmin' || effectiveRole === 'admin') {
      return true;
    }
    return isOwnerTeacher;
  }, [effectiveRole, isOwnerTeacher, isKhoTaiLieu]);

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
      // Bỏ qua tài liệu chưa được xuất bản hoặc ở trạng thái nháp
      if (doc.isPublished === false && (!doc.publishedToClasses || doc.publishedToClasses.length === 0)) {
        return false;
      }

      // Kiểm tra có thu phí kim cương hay không:
      // Khi có thu phí kim cương (ở cấp tài liệu hoặc mục con chuyên đề/bài/vấn đề/KTĐG) thì mặc nhiên phát hành vào Kho Tài Liệu
      // Không thu phí kim cương thì sẽ không phát hành vào lớp Kho Tài Liệu
      const hasDiamondFee = Boolean(
        (Boolean(doc.isForSale) && (doc.priceDiamonds ?? 0) >= 0) ||
        (doc.nodeConfigs &&
          Object.values(doc.nodeConfigs).some(
            nc => nc && Boolean(nc.isForSale) && (nc.priceDiamonds ?? 0) >= 0
          ))
      );

      if (isKhoTaiLieu) {
        // Chỉ khi có thu phí kim cương thì mặc nhiên thuộc Kho tài liệu; không thu phí kim cương thì không vào Kho tài liệu
        if (!hasDiamondFee) return false;
      } else {
        // Khi phát hành tài liệu vào lớp nào thì nó mới hiện trong danh sách tài liệu của lớp đó
        const targetClasses = doc.publishedToClasses || [];
        const isTargetedToThisClass =
          targetClasses.includes(selectedClassId) ||
          (currentClass?.id && targetClasses.includes(currentClass.id)) ||
          (currentClass?.code &&
            targetClasses.some(
              tc => tc && tc.toLowerCase().trim() === currentClass.code.toLowerCase().trim()
            )) ||
          (currentClass?.name &&
            targetClasses.some(
              tc => tc && tc.toLowerCase().trim() === currentClass.name.toLowerCase().trim()
            )) ||
          // Kiểm tra nếu giáo viên cấu hình phát hành từng nút chuyên đề / bài học vào lớp này
          (doc.nodeConfigs &&
            Object.values(doc.nodeConfigs).some(
              nc =>
                nc &&
                (nc.publishedToClasses?.includes(selectedClassId) ||
                  (currentClass?.id && nc.publishedToClasses?.includes(currentClass.id)) ||
                  (currentClass?.code &&
                    nc.publishedToClasses?.some(
                      tc => tc && tc.toLowerCase().trim() === currentClass.code.toLowerCase().trim()
                    )))
            ));

        if (!isTargetedToThisClass) return false;
      }

      // Kiểm tra thời hạn phát hành độc lập của từng lớp (hoặc Kho tài liệu)
      const sched =
        doc.classSchedules?.[selectedClassId] ||
        (currentClass?.id && doc.classSchedules?.[currentClass.id]) ||
        (currentClass?.code && doc.classSchedules?.[currentClass.code]) ||
        (isKhoTaiLieu
          ? (doc.classSchedules?.['open-library'] || doc.classSchedules?.['cls_open_library'])
          : undefined);

      if (sched) {
        if (sched.startDate) {
          const startMs = new Date(sched.startDate).getTime();
          if (nowMs < startMs) return false;
        }
        if (sched.endDate) {
          const endMs = new Date(sched.endDate).getTime();
          // Tự thu hồi phát hành với lớp đó khi đã tới thời điểm kết thúc
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
      const isPurchased = Boolean(
        doc.purchasedUserIds && doc.purchasedUserIds.includes(activeStudentId)
      );
      // Quyền truy cập: học sinh trong lớp phát hành còn hạn hoặc mua bằng kim cương hoặc miễn phí
      const hasClassAccess = !isKhoTaiLieu;
      const isAccessible = isFree || isPurchased || hasClassAccess;

      let badgeText = '';
      if (!isKhoTaiLieu) {
        badgeText = '🟢 [Lớp học]';
      } else if (isFree) {
        badgeText = '🆓 [Miễn phí]';
      } else if (isPurchased) {
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
        isUnlocked: isAccessible,
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
          label: isKTL ? 'Kho Tài Liệu' : `${c.name}${c.teacherName ? ` (${c.teacherName})` : ''}`,
          badge: isKTL ? undefined : (c.subject ? `Môn ${c.subject}` : c.code),
          badgeColor: isKTL ? undefined : 'indigo',
          subText: isKTL
            ? undefined
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
          actionType: 'select',
          classItem: c,
        });
        return;
      }

      const classDisplayLabel = `${c.name}${c.teacherName ? ` (${c.teacherName})` : ''}`;

      if (effectiveRole === 'teacher') {
        const { isPrimary, isAssistant } = isTeacherInClass(c);
        if (isPrimary) {
          results.push({
            id: c.id,
            label: classDisplayLabel,
            badge: 'Lớp bạn dạy',
            badgeColor: 'indigo',
            subText: `Địa điểm: ${c.room || 'Chưa cập nhật'}${canViewStudentCount ? ` • Sĩ số: ${c.studentCount || 0} HS` : ''}`,
            actionType: 'select',
            classItem: c,
          });
        } else if (isAssistant) {
          results.push({
            id: c.id,
            label: classDisplayLabel,
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
            label: classDisplayLabel,
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
          label: classDisplayLabel,
          badge: c.code,
          badgeColor: 'indigo',
          subText: `GV: ${c.teacherName || 'Chưa rõ'} • Địa điểm: ${c.room || 'Chưa cập nhật'}${canViewStudentCount ? ` • Sĩ số: ${c.studentCount || 0} HS` : ''}`,
          actionType: 'select',
          classItem: c,
        });
      } else {
        // Học sinh
        const isEnrolled = isStudentEnrolledInClass(c);
        if (isEnrolled) {
          results.push({
            id: c.id,
            label: classDisplayLabel,
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
            label: classDisplayLabel,
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
      const initialSubj = selectedSubjectFilter !== 'all' ? selectedSubjectFilter : APP_SUBJECTS[0];
      const initialCode = generateDefaultClassCode(
        initialSubj,
        studentProfile?.name || activeEmail,
        suggested
      );
      setNewClassName(suggested);
      setNewClassCode(initialCode);
      setIsCustomClassCode(false);
      setNewClassSubject(initialSubj);
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

    const defaultGeneratedCode = generateDefaultClassCode(
      newClassSubject,
      studentProfile?.name || activeEmail,
      newClassName
    );
    const classCode = (newClassCode.trim() || defaultGeneratedCode).toUpperCase();

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
  const isCurrentDocPurchased = Boolean(
    selectedDoc?.purchasedUserIds && selectedDoc.purchasedUserIds.includes(activeStudentId)
  );
  // Quyền truy cập tài liệu của học sinh:
  // 1. Học sinh trong lớp phát hành tài liệu còn thời gian phát hành (!isKhoTaiLieu)
  // 2. Học sinh mua tài liệu bằng điểm kim cương (isCurrentDocPurchased)
  // 3. Tài liệu miễn phí (isCurrentDocFree)
  const hasCurrentDocClassAccess = !isKhoTaiLieu;
  const isCurrentDocAccessible =
    isCurrentDocFree || isCurrentDocPurchased || hasCurrentDocClassAccess;

  // Mở trực tiếp giao diện chuẩn của tài liệu (WordSoanThaoView)
  const handleOpenDocumentView = (doc: TeacherDocument) => {
    if (!doc) return;

    const docData = {
      id: doc.id,
      docId: doc.id,
      title: doc.title,
      subject: doc.subject,
      grade: doc.grade,
      chuong: doc.chuong || 'Chương 1',
      bai: doc.bai || 'Bài 1',
      vanDe: doc.vanDe || 'Vấn đề 1',
      chuyenDe: doc.chuyenDe || doc.title,
      driveFileId: doc.driveFileId,
      driveFolderPath: doc.driveFolderPath,
      fileType: doc.fileType,
      contentHtml: doc.contentHtml || doc.content || (doc.contentSnippet ? `<p>${doc.contentSnippet}</p>` : ''),
      content: doc.content,
    };

    try {
      sessionStorage.setItem('lopu_pending_open_document', JSON.stringify(docData));
    } catch (e) {
      console.warn('Lỗi lưu pending document vào sessionStorage:', e);
    }

    // Chuyển sang giao diện Soạn thảo / Học tập tài liệu WordSoanThaoView
    window.dispatchEvent(new CustomEvent('app-open-word-document', { detail: docData }));
  };

  const handleOpenMaterial = (mat: {
    id: string;
    type: 'document' | 'lesson';
    title: string;
    doc?: TeacherDocument;
    lesson?: ClassLesson;
    isUnlocked?: boolean;
  }) => {
    if (mat.type === 'document' && mat.doc) {
      handleOpenDocumentView(mat.doc);
      return;
    }
    if (mat.type === 'lesson' && mat.lesson) {
      const les = mat.lesson;
      const lessonDoc: TeacherDocument = {
        id: les.id,
        title: les.title,
        subject: currentClass?.subject || 'Toán',
        grade: currentClass?.grade || 'Khối 10',
        chuong: les.unit || 'Chương 1',
        bai: les.title,
        vanDe: 'Vấn đề 1',
        chuyenDe: les.title,
        driveFileId: les.driveFileId,
        driveSynced: Boolean(les.driveSync),
        category: 'lesson_plan',
        fileType: 'html',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isPublished: true,
        publishedToClasses: currentClass ? [currentClass.id] : [],
        fileSize: '15 KB',
        authorId: currentClass?.teacherId || '',
        contentHtml: `<div class="p-6"><h1>${les.title}</h1><p class="text-slate-600">${les.description || ''}</p></div>`,
        content: les.description || '',
      };
      handleOpenDocumentView(lessonDoc);
    }
  };

  const handlePurchaseDoc = async (docId: string, title: string) => {
    const res = await purchaseDocumentWithDiamonds(activeStudentId, docId);
    if (res.success) {
      setNotification(res.message);
      await loadStudentAndDocs();
      // Ngay sau khi mua thành công bằng điểm kim cương, tự động chuyển vào đúng giao diện tài liệu đó
      const boughtDoc = publishedDocuments.find(d => d.id === docId);
      if (boughtDoc) {
        handleOpenDocumentView(boughtDoc);
      }
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

      {/* Khung Chọn Lớp Học & Danh Sách Tài Liệu / Bài Học Phát Hành */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* 1. Dropdown Chọn Môn Học (phía trước dropdown Lớp học để lọc lớp theo môn) */}
          <div className="md:col-span-4">
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
            {selectedSubjectFilter !== 'all' && (
              <p className="mt-2 text-xs text-slate-500 truncate">
                Đang lọc các lớp thuộc môn {selectedSubjectFilter}
              </p>
            )}
          </div>

          {/* 2. Combobox Chọn Lớp Học (Nhập trực tiếp hoặc chọn từ danh sách) */}
          <div className="md:col-span-8">
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
          </div>
        </div>

        {/* Thông tin lớp học, tên giáo viên & nút thao tác */}
        {currentClass && (
          <div className="pt-3 border-t border-slate-100 space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap text-xs">
              {!isKhoTaiLieu && (
                <p className="text-slate-500">
                  Địa điểm: <span className="font-semibold text-slate-700">{currentClass.room || 'Chưa cập nhật'}</span>
                  {currentClass.teacherName && (
                    <>
                      {' '}• Giáo viên: <span className="font-bold text-slate-800">{currentClass.teacherName}</span>
                    </>
                  )}
                  {canViewStudentCount && (
                    <>
                      {' '}• Sĩ số: <span className="font-semibold text-indigo-700">{currentClass.studentCount || 0} HS</span>
                    </>
                  )}
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

            {/* BÊN DƯỚI TÊN GIÁO VIÊN: Mỗi tài liệu / bài được phát hành vào lớp hiển thị gồm tên tài liệu/bài và nút Vào học */}
            <div className="pt-3 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-600" />
                  <span>
                    Tài liệu &amp; Bài học phát hành vào {isKhoTaiLieu ? 'Kho Tài Liệu' : currentClass.name} ({classMaterials.length}):
                  </span>
                </h3>
                {isKhoTaiLieu && (
                  <span className="text-xs font-semibold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                    Số dư Kim Cương của bạn: <strong className="font-mono">{studentProfile?.diamonds ?? 0} 💎</strong>
                  </span>
                )}
              </div>

              {classMaterials.length === 0 ? (
                <div className="p-10 text-center bg-slate-50 rounded-2xl border border-slate-200">
                  <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-slate-700">Lớp học này hiện chưa có tài liệu nào</h4>
                  <p className="mt-1 text-xs text-slate-500">
                    {isKhoTaiLieu
                      ? 'Kho Tài Liệu đang được cập nhật thêm tài liệu mới.'
                      : 'Giáo viên phụ trách chưa phát hành tài liệu vào lớp này.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {classMaterials.map(mat => {
                    const doc = mat.doc;
                    const isFree = doc ? (!doc.isForSale || (doc.priceDiamonds ?? 0) === 0) : true;
                    const isPurchased = doc ? Boolean(doc.purchasedUserIds && doc.purchasedUserIds.includes(activeStudentId)) : true;
                    const hasClassAccess = !isKhoTaiLieu;
                    const isAccessible = mat.type === 'lesson' ? Boolean(mat.isUnlocked) : (isFree || isPurchased || hasClassAccess);

                    const sched = doc ? (
                      doc.classSchedules?.[selectedClassId] ||
                      (currentClass?.id && doc.classSchedules?.[currentClass.id]) ||
                      (isKhoTaiLieu ? (doc.classSchedules?.['open-library'] || doc.classSchedules?.['cls_open_library']) : undefined)
                    ) : undefined;

                    return (
                      <div
                        key={mat.id}
                        onClick={() => {
                          if (isAccessible) {
                            handleOpenMaterial(mat);
                          }
                        }}
                        className="p-3.5 bg-slate-50 hover:bg-slate-100/70 rounded-xl border border-slate-200 hover:border-indigo-300 transition-all flex flex-col justify-between gap-3 shadow-2xs group cursor-pointer"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[10px] gap-2">
                            <span className="font-mono bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded text-[9px] font-bold">
                              {mat.type === 'lesson' ? 'Bài học' : (doc?.chuyenDe || doc?.subject || 'Tài liệu')}
                            </span>
                            {!isKhoTaiLieu ? (
                              <span className="bg-emerald-50 text-emerald-700 font-extrabold px-1.5 py-0.5 rounded text-[9px]">
                                🟢 Lớp học
                              </span>
                            ) : isFree ? (
                              <span className="bg-emerald-50 text-emerald-700 font-extrabold px-1.5 py-0.5 rounded text-[9px]">
                                🆓 Miễn phí (0 💎)
                              </span>
                            ) : isPurchased ? (
                              <span className="bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded text-[9px]">
                                🟢 Đã mua
                              </span>
                            ) : (
                              <span className="bg-amber-50 text-amber-800 font-black px-1.5 py-0.5 rounded text-[9px] font-mono">
                                💎 {doc?.priceDiamonds} Kim Cương
                              </span>
                            )}
                          </div>

                          <h4 className="text-sm font-bold text-slate-800 group-hover:text-indigo-600 transition-colors line-clamp-2">
                            {mat.title}
                          </h4>

                          <div className="text-[11px] text-slate-500 flex items-center gap-2 flex-wrap">
                            <span>{mat.subText}</span>
                            {doc?.fileType && (
                              <>
                                <span>•</span>
                                <span className="font-mono uppercase font-semibold">{doc.fileType}</span>
                              </>
                            )}
                            {doc?.fileSize && (
                              <>
                                <span>•</span>
                                <span>{doc.fileSize}</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between gap-2">
                          <div>
                            {sched?.endDate ? (
                              <span className="text-[10px] text-rose-600 font-semibold flex items-center gap-1" title={`Hạn thu hồi: ${new Date(sched.endDate).toLocaleString('vi-VN')}`}>
                                <Clock className="w-3 h-3 text-rose-500" /> Hạn: {new Date(sched.endDate).toLocaleDateString('vi-VN')}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-400" /> Vô thời hạn
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            {isAccessible ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenMaterial(mat);
                                }}
                                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors cursor-pointer"
                                title="Vào học / Xem tài liệu"
                              >
                                <BookOpen className="w-3.5 h-3.5" />
                                <span>Vào học</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (doc) handlePurchaseDoc(doc.id, mat.title);
                                }}
                                className="flex items-center gap-1 px-3 py-1.5 text-xs font-black text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-xl transition-all cursor-pointer shadow-3xs"
                              >
                                <span>Mua {doc?.priceDiamonds} 💎</span>
                              </button>
                            )}

                            {doc?.driveFileId && isAccessible && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(`https://drive.google.com/file/d/${doc.driveFileId}/view`, '_blank');
                                }}
                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                title="Tải tệp từ Google Drive"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
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
                  onChange={e => {
                    const val = e.target.value;
                    setNewClassName(val);
                    if (!isCustomClassCode) {
                      setNewClassCode(
                        generateDefaultClassCode(
                          newClassSubject,
                          studentProfile?.name || activeEmail,
                          val
                        )
                      );
                    }
                  }}
                  placeholder="Ví dụ: N01, Lớp 10A1, Ôn thi tốt nghiệp..."
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-semibold text-slate-900"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-slate-700">Mã lớp <span className="text-rose-500">*</span></label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomClassCode(false);
                      setNewClassCode(
                        generateDefaultClassCode(
                          newClassSubject,
                          studentProfile?.name || activeEmail,
                          newClassName
                        )
                      );
                    }}
                    className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer"
                    title="Đặt lại mã lớp theo định dạng mặc định {Môn}-{Tên GV}-{Tên lớp}"
                  >
                    Tạo lại mặc định
                  </button>
                </div>
                <input
                  type="text"
                  value={newClassCode}
                  onChange={e => {
                    setNewClassCode(e.target.value);
                    setIsCustomClassCode(true);
                  }}
                  placeholder="Ví dụ: Toan-Bao-N01"
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-mono font-bold text-indigo-700"
                />
                <p className="text-[10px] text-slate-400">
                  Mặc định: <span className="font-mono text-slate-600">{`{Môn}-{Tên GV}-{Tên lớp}`}</span> (Ví dụ: Toan-Bao-N01)
                </p>
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-700">Môn học <span className="text-rose-500">*</span></label>
                <select
                  value={newClassSubject}
                  onChange={e => {
                    const val = e.target.value;
                    setNewClassSubject(val);
                    if (!isCustomClassCode) {
                      setNewClassCode(
                        generateDefaultClassCode(
                          val,
                          studentProfile?.name || activeEmail,
                          newClassName
                        )
                      );
                    }
                  }}
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
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-slate-700">Mã lớp <span className="text-rose-500">*</span></label>
                  <button
                    type="button"
                    onClick={() => {
                      setEditClassCode(
                        generateDefaultClassCode(
                          editClassSubject,
                          currentClass?.teacherName || studentProfile?.name || activeEmail,
                          editClassName
                        )
                      );
                    }}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer"
                    title="Tạo mã lớp theo chuẩn {Môn}-{Tên GV}-{Tên lớp}"
                  >
                    Tạo mã chuẩn
                  </button>
                </div>
                <input
                  type="text"
                  value={editClassCode}
                  onChange={e => setEditClassCode(e.target.value)}
                  placeholder="Ví dụ: Toan-Bao-N01"
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-mono font-bold text-indigo-700"
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
