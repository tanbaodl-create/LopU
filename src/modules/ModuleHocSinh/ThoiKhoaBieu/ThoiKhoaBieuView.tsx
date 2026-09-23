import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Cloud,
  Users,
  GraduationCap,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Info,
  CheckCircle2,
  Settings,
  X,
  RotateCcw,
  Check,
  Plus,
  Heart,
  User,
  Trash2,
  Coffee,
  Sun,
  Moon,
  Sunset,
  Edit3,
  Copy,
  Eye,
  EyeOff,
  Move,
  MapPin,
  Pencil,
  Filter,
} from 'lucide-react';
import { ScheduleItem, UserRole } from '../../../services/storageTypes';
import { savePersonalScheduleToDrive } from '../../ConnectData/ConnectDrive';
import { getUsers } from '../../ConnectData/ConnectFirestore';

// Đường dẫn mặc định của app và module Thời khóa biểu
export const DEFAULT_APP_PATH = 'myApp/LopU';
export const DEFAULT_THOIKHOABIEU_PATH = `${DEFAULT_APP_PATH}/ThoiKhoaBieu`;

// ==========================================
// 1. CẤU TRÚC DỮ LIỆU CỐT LÕI (DATA MODEL)
// ==========================================

export interface TimetableSlot {
  id: string;
  timetableType: 'CK' | 'HT'; // CK: Chính khóa, HT: Học thêm / Dạy thêm
  dayOfWeek: number; // 2: Thứ 2 -> 8: Chủ Nhật
  periodNumber?: number; // 1 -> 9 cho Chính khóa hoặc Ca 1 -> 9 cho Học thêm
  startTime: string; // VD: "07:00", "19:00"
  endTime: string; // VD: "07:45", "20:30"
  subjectName: string; // Toán, Văn, Anh, Lý, Hóa, Sinh, Sử, Địa, Tin...
  className: string; // Tối đa 8 ký tự, VD: "12A1", "10T-NC"
  teacherName?: string; // Áp dụng cho HT / CK
  teacherNickname?: string; // Biệt danh GV (e.g. "Th Bảo", "Cô Mai")
  room?: string; // VD: "P.201", áp dụng cho HT
  notes?: string; // Ghi chú ngắn, tối đa 12 ký tự, VD: "Kiểm tra 15p"
  startMinutes?: number; // Phút từ 00:00
  endMinutes?: number;
}

// Alias tương thích ngược
export type ExtendedScheduleItem = TimetableSlot;

// Hồ sơ Thời khóa biểu (Cá nhân, Con, Em, Học sinh theo dõi)
export interface TimetableProfile {
  id: string;
  name: string;
  relation: 'self' | 'child' | 'sibling' | 'student' | 'other';
  relationLabel: string;
  className: string;
  school?: string;
  colorScheme: string;
  schedule: TimetableSlot[];
  createdAt: string;
}

export interface DayColumnInfo {
  num: number; // 2: Thứ 2, 3: Thứ 3, ..., 8: Chủ Nhật
  code: string;
  label: string;
  fullDateText: string;
  compactLabel?: string;
}

export interface TimeSlotConfig {
  id: string;
  type: 'CK' | 'HT';
  num: number;
  label: string; // "Tiết 1", "Ca 1"
  startTime: string;
  endTime: string;
  session: 'morning' | 'afternoon' | 'evening';
  categoryName?: string;
}

// Chuyển chuỗi "HH:mm" thành số phút trong ngày
export const parseTimeToMinutes = (timeStr: string): number => {
  if (!timeStr) return 0;
  const parts = timeStr.trim().split(':');
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
};

// Chuyển số phút thành chuỗi "HH:mm"
export const formatMinutesToTime = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

// Hiển thị thời lượng ngắn gọn: "45 phút", "1h30p", "2 giờ"
export const formatDurationText = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h${m}p`;
  if (h > 0) return `${h} giờ`;
  return `${m} phút`;
};

// ==========================================
// BỘ PRESET MỐC GIỜ 1-CHẠM THEO YÊU CẦU
// ==========================================

// 1. Chính khóa (CK - 9 Tiết):
// Sáng: Tiết 1-5 (07:00-11:15)
// Chiều: Tiết 6-9 (13:30-16:45)
export const DEFAULT_CK_PRESETS: TimeSlotConfig[] = [
  { id: 'ck_1', type: 'CK', num: 1, label: 'Tiết 1', startTime: '07:00', endTime: '07:45', session: 'morning', categoryName: 'Sáng' },
  { id: 'ck_2', type: 'CK', num: 2, label: 'Tiết 2', startTime: '07:50', endTime: '08:35', session: 'morning', categoryName: 'Sáng' },
  { id: 'ck_3', type: 'CK', num: 3, label: 'Tiết 3', startTime: '08:50', endTime: '09:35', session: 'morning', categoryName: 'Sáng' },
  { id: 'ck_4', type: 'CK', num: 4, label: 'Tiết 4', startTime: '09:40', endTime: '10:25', session: 'morning', categoryName: 'Sáng' },
  { id: 'ck_5', type: 'CK', num: 5, label: 'Tiết 5', startTime: '10:30', endTime: '11:15', session: 'morning', categoryName: 'Sáng' },
  { id: 'ck_6', type: 'CK', num: 6, label: 'Tiết 6', startTime: '13:30', endTime: '14:15', session: 'afternoon', categoryName: 'Chiều' },
  { id: 'ck_7', type: 'CK', num: 7, label: 'Tiết 7', startTime: '14:20', endTime: '15:05', session: 'afternoon', categoryName: 'Chiều' },
  { id: 'ck_8', type: 'CK', num: 8, label: 'Tiết 8', startTime: '15:15', endTime: '16:00', session: 'afternoon', categoryName: 'Chiều' },
  { id: 'ck_9', type: 'CK', num: 9, label: 'Tiết 9', startTime: '16:05', endTime: '16:45', session: 'afternoon', categoryName: 'Chiều' },
];

// 2. Học thêm / Dạy thêm (HT - 9 Ca):
// Ca 1 (05:00-06:30), Ca 2 (07:00-08:30), Ca 3 (08:30-10:00), Ca 4 (10:00-11:30),
// Ca 5 (14:00-15:30), Ca 6 (15:30-17:00), Ca 7 (17:00-18:30), Ca 8 (19:00-20:30), Ca 9 (20:30-22:00)
export const DEFAULT_HT_PRESETS: TimeSlotConfig[] = [
  { id: 'ht_1', type: 'HT', num: 1, label: 'Ca 1', startTime: '05:00', endTime: '06:30', session: 'morning', categoryName: 'Sáng sớm' },
  { id: 'ht_2', type: 'HT', num: 2, label: 'Ca 2', startTime: '07:00', endTime: '08:30', session: 'morning', categoryName: 'Sáng' },
  { id: 'ht_3', type: 'HT', num: 3, label: 'Ca 3', startTime: '08:30', endTime: '10:00', session: 'morning', categoryName: 'Sáng' },
  { id: 'ht_4', type: 'HT', num: 4, label: 'Ca 4', startTime: '10:00', endTime: '11:30', session: 'morning', categoryName: 'Trưa' },
  { id: 'ht_5', type: 'HT', num: 5, label: 'Ca 5', startTime: '14:00', endTime: '15:30', session: 'afternoon', categoryName: 'Chiều' },
  { id: 'ht_6', type: 'HT', num: 6, label: 'Ca 6', startTime: '15:30', endTime: '17:00', session: 'afternoon', categoryName: 'Chiều' },
  { id: 'ht_7', type: 'HT', num: 7, label: 'Ca 7', startTime: '17:00', endTime: '18:30', session: 'afternoon', categoryName: 'Chiều tối' },
  { id: 'ht_8', type: 'HT', num: 8, label: 'Ca 8', startTime: '19:00', endTime: '20:30', session: 'evening', categoryName: 'Tối' },
  { id: 'ht_9', type: 'HT', num: 9, label: 'Ca 9', startTime: '20:30', endTime: '22:00', session: 'evening', categoryName: 'Đêm' },
];

export const ALL_WEEK_DAYS: DayColumnInfo[] = [
  { num: 2, code: 'T2', label: 'Thứ Hai', fullDateText: 'Thứ 2' },
  { num: 3, code: 'T3', label: 'Thứ Ba', fullDateText: 'Thứ 3' },
  { num: 4, code: 'T4', label: 'Thứ Tư', fullDateText: 'Thứ 4' },
  { num: 5, code: 'T5', label: 'Thứ Năm', fullDateText: 'Thứ 5' },
  { num: 6, code: 'T6', label: 'Thứ Sáu', fullDateText: 'Thứ 6' },
  { num: 7, code: 'T7', label: 'Thứ Bảy', fullDateText: 'Thứ 7' },
  { num: 8, code: 'CN', label: 'Chủ Nhật', fullDateText: 'Chủ Nhật' },
];

export const SUBJECT_CATALOG = [
  'Toán',
  'Ngữ Văn',
  'Tiếng Anh',
  'Vật Lý',
  'Hóa Học',
  'Sinh Học',
  'Lịch Sử',
  'Địa Lý',
  'Tin Học',
  'GDCD',
  'Công Nghệ',
  'Thể Dục',
  'GDQP-AN',
  'HĐTN-HN',
  'Bồi Dưỡng Toán',
  'Luyện Đề Lý',
];

export const CLASS_CATALOG: string[] = [];

// Dữ liệu ban đầu (rỗng theo yêu cầu)
const INITIAL_SLOTS: TimetableSlot[] = [];

const INITIAL_PROFILES: TimetableProfile[] = [
  {
    id: 'profile_self',
    name: 'Thời khóa biểu cá nhân',
    relation: 'self',
    relationLabel: 'Cá nhân',
    className: '',
    school: '',
    colorScheme: 'indigo',
    schedule: [],
    createdAt: new Date().toISOString().split('T')[0],
  },
];

const STORAGE_KEY_PROFILES = 'lopu_user_family_timetables_v2';
const STORAGE_KEY_CK = 'lopu_tkb_presets_ck_v3';
const STORAGE_KEY_HT = 'lopu_tkb_presets_ht_v3';

export interface ThoiKhoaBieuViewProps {
  currentRole?: UserRole;
  onOpenDriveConnect?: () => void;
}

export const ThoiKhoaBieuView: React.FC<ThoiKhoaBieuViewProps> = ({
  currentRole,
  onOpenDriveConnect,
}) => {
  // ==========================================
  // STATE MANAGEMENT
  // ==========================================

  // 1. Quản lý Profiles TKB
  const [profiles, setProfiles] = useState<TimetableProfile[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PROFILES);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_PROFILES;
  });

  const [activeProfileId, setActiveProfileId] = useState<string>(() => {
    return profiles[0]?.id || 'profile_self';
  });

  const activeProfile = useMemo(() => {
    return profiles.find(p => p.id === activeProfileId) || profiles[0];
  }, [profiles, activeProfileId]);

  const schedule = useMemo(() => {
    return activeProfile?.schedule || INITIAL_SLOTS;
  }, [activeProfile]);

  // 2. Chế độ xem: Thu gọn vs Đầy đủ (Mặc định: 'expanded')
  const [viewMode, setViewMode] = useState<'compact' | 'expanded'>('expanded');
  const [compactStartDay, setCompactStartDay] = useState<number>(2); // 2: Thứ 2

  // 3. Nút Sửa TKB (Mặc định: false - khóa toàn bộ)
  const [isEditMode, setIsEditMode] = useState<boolean>(false);

  // 4. Bộ chọn đối tượng xem TKB: 'self' | 'child' | 'teacher_other' | 'student_other'
  const [targetAudience, setTargetAudience] = useState<string>('all');

  // 5. Nút "Ẩn dòng trống"
  const [hideEmptyRows, setHideEmptyRows] = useState<boolean>(false);

  // 6. Chế độ bố cục hiển thị: 'timeline' (Mặc định: Căn chuẩn theo trục thời gian thực, <=15p liền kề, >15p khoảng rảnh) vs 'presetGrid' (Lưới cố định theo ca/tiết)
  const [matrixLayoutMode, setMatrixLayoutMode] = useState<'timeline' | 'presetGrid'>('timeline');

  // 7. Bộ lọc hình thức (Tất cả / Chính khóa CK / Học thêm HT)
  const [typeFilter, setTypeFilter] = useState<'all' | 'CK' | 'HT'>('all');

  // 8. Áp dụng từ tuần k & Ngày đầu tuần
  const [applyWeek, setApplyWeek] = useState<number>(1);
  const [weekStartDate, setWeekStartDate] = useState<string>(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    return monday.toISOString().split('T')[0];
  });

  // 9. Cấu hình Preset mốc giờ
  const [ckPresets, setCkPresets] = useState<TimeSlotConfig[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_CK);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return DEFAULT_CK_PRESETS;
  });

  const [htPresets, setHtPresets] = useState<TimeSlotConfig[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_HT);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return DEFAULT_HT_PRESETS;
  });

  // 10. Modals State
  const [showAddEditSlotModal, setShowAddEditSlotModal] = useState<boolean>(false);
  const [editingSlot, setEditingSlot] = useState<TimetableSlot | null>(null);

  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [newProfileName, setNewProfileName] = useState<string>('');
  const [newProfileRelation, setNewProfileRelation] = useState<'child' | 'sibling' | 'student' | 'other'>('child');
  const [newProfileClass, setNewProfileClass] = useState<string>('12A1');
  const [newProfileSchool, setNewProfileSchool] = useState<string>('');

  const [showTimeSettingsModal, setShowTimeSettingsModal] = useState<boolean>(false);
  const [editingCkPresets, setEditingCkPresets] = useState<TimeSlotConfig[]>(ckPresets);
  const [editingHtPresets, setEditingHtPresets] = useState<TimeSlotConfig[]>(htPresets);

  const [notification, setNotification] = useState<string | null>(null);

  // ==========================================
  // FORM STATE FOR ADD/EDIT SLOT MODAL
  // ==========================================
  const [formType, setFormType] = useState<'CK' | 'HT'>('CK');
  const [formDayOfWeek, setFormDayOfWeek] = useState<number>(2);
  const [formPeriodNumber, setFormPeriodNumber] = useState<number>(1);
  const [formStartTime, setFormStartTime] = useState<string>('07:00');
  const [formEndTime, setFormEndTime] = useState<string>('07:45');
  const [formSubjectMode, setFormSubjectMode] = useState<'select' | 'custom'>('select');
  const [formSubjectName, setFormSubjectName] = useState<string>('Toán');
  const [formClassMode, setFormClassMode] = useState<'select' | 'custom'>('select');
  const [formClassName, setFormClassName] = useState<string>('12A1');
  const [formTeacherName, setFormTeacherName] = useState<string>('Đỗ Tấn Bảo');
  const [formRoom, setFormRoom] = useState<string>('P.201');
  const [formNotes, setFormNotes] = useState<string>('');

  // Rà soát danh sách "Các Lớp Dạy/Học" từ Hồ Sơ Chi Tiết (14 Trường Thông Tin Người Dùng)
  const [userClassOptions, setUserClassOptions] = useState<string[]>([]);

  useEffect(() => {
    const fetchUserClasses = async () => {
      try {
        const usersList = await getUsers();
        const user = usersList.find((u: any) =>
          (u.email && (u.email === 'tanbaodl@gmail.com' || u.email === 'tanbaobg@gmail.com')) ||
          (currentRole && (u.role === currentRole || u.roles?.includes(currentRole)))
        );
        if (user && Array.isArray(user.classIds) && user.classIds.length > 0) {
          const validClasses = user.classIds.filter((c: string) => Boolean(c && c.trim()));
          setUserClassOptions(validClasses);
          if (validClasses.length > 0) {
            setFormClassName(validClasses[0]);
          } else {
            setFormClassName('');
          }
        } else {
          // Không có thì danh sách tùy chọn là rỗng chứ không được tự ý thêm vào
          setUserClassOptions([]);
          setFormClassName('');
        }
      } catch (e) {
        setUserClassOptions([]);
        setFormClassName('');
      }
    };
    fetchUserClasses();
  }, [currentRole]);

  // Lưu danh sách Profiles vào LocalStorage
  const saveAllProfiles = (updated: TimetableProfile[]) => {
    setProfiles(updated);
    localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(updated));
  };

  // Cập nhật schedule cho Profile đang chọn
  const updateActiveProfileSchedule = (newSchedule: TimetableSlot[]) => {
    const updated = profiles.map(p => {
      if (p.id === activeProfileId) {
        return { ...p, schedule: newSchedule };
      }
      return p;
    });
    saveAllProfiles(updated);
  };

  // ==========================================
  // TÍNH TOÁN CÁC NGÀY HIỂN THỊ
  // ==========================================
  const activeDays = useMemo(() => {
    if (viewMode === 'expanded') {
      return ALL_WEEK_DAYS;
    }
    // Thu gọn: 3 ngày liên tiếp từ compactStartDay
    const res: DayColumnInfo[] = [];
    const labels = ['Hôm nay', 'Ngày mai', 'Ngày kia'];
    for (let i = 0; i < 3; i++) {
      // compactStartDay: 2..8
      let targetNum = ((compactStartDay - 2 + i) % 7) + 2;
      const found = ALL_WEEK_DAYS.find(d => d.num === targetNum);
      if (found) {
        res.push({
          ...found,
          compactLabel: labels[i],
        });
      }
    }
    return res;
  }, [viewMode, compactStartDay]);

  // ==========================================
  // DANH SÁCH KHUNG GIỜ HIỂN THỊ (THEO SESSION)
  // ==========================================
  const allTimeRows = useMemo(() => {
    const rows: Array<{
      id: string;
      type: 'CK' | 'HT';
      periodNumber: number;
      label: string;
      startTime: string;
      endTime: string;
      startMinutes: number;
      endMinutes: number;
      session: 'morning' | 'afternoon' | 'evening';
    }> = [];

    if (typeFilter === 'all' || typeFilter === 'CK') {
      ckPresets.forEach(p => {
        rows.push({
          id: p.id,
          type: 'CK',
          periodNumber: p.num,
          label: p.label,
          startTime: p.startTime,
          endTime: p.endTime,
          startMinutes: parseTimeToMinutes(p.startTime),
          endMinutes: parseTimeToMinutes(p.endTime),
          session: p.session,
        });
      });
    }

    if (typeFilter === 'all' || typeFilter === 'HT') {
      htPresets.forEach(p => {
        rows.push({
          id: p.id,
          type: 'HT',
          periodNumber: p.num,
          label: p.label,
          startTime: p.startTime,
          endTime: p.endTime,
          startMinutes: parseTimeToMinutes(p.startTime),
          endMinutes: parseTimeToMinutes(p.endTime),
          session: p.session,
        });
      });
    }

    // Sắp xếp theo thứ tự startMinutes
    rows.sort((a, b) => a.startMinutes - b.startMinutes);

    // Lọc theo "Ẩn dòng trống" nếu được bật
    if (hideEmptyRows) {
      return rows.filter(row => {
        // Kiểm tra xem có bất kỳ ngày nào có tiết học ở khung giờ này không
        return activeDays.some(day => {
          return schedule.some(
            slot =>
              slot.dayOfWeek === day.num &&
              slot.timetableType === row.type &&
              (slot.periodNumber === row.periodNumber ||
                (slot.startTime === row.startTime && slot.endTime === row.endTime))
          );
        });
      });
    }

    return rows;
  }, [typeFilter, ckPresets, htPresets, hideEmptyRows, activeDays, schedule]);

  // Phân nhóm theo 3 buổi: Sáng (trước 13:00), Chiều (13:00-18:30), Tối (sau 18:30)
  const sessionGroups = useMemo(() => {
    const morning = allTimeRows.filter(r => r.startMinutes < 780); // < 13:00
    const afternoon = allTimeRows.filter(r => r.startMinutes >= 780 && r.startMinutes <= 1110); // 13:00 - 18:30
    const evening = allTimeRows.filter(r => r.startMinutes > 1110); // > 18:30

    return [
      {
        id: 'morning',
        title: 'Buổi Sáng',
        subTitle: 'Trước 13:00',
        icon: Sun,
        themeClass: 'bg-sky-50/70 border-sky-200 text-sky-900',
        rowBg: 'bg-sky-50/30',
        dividerBg: 'bg-gradient-to-r from-sky-500/10 via-sky-500/5 to-transparent border-l-4 border-sky-500 text-sky-900',
        badgeBg: 'bg-sky-100 text-sky-800 border-sky-300',
        rows: morning,
      },
      {
        id: 'afternoon',
        title: 'Buổi Chiều',
        subTitle: '13:00 — 18:30',
        icon: Sunset,
        themeClass: 'bg-teal-50/70 border-teal-200 text-teal-900',
        rowBg: 'bg-teal-50/30',
        dividerBg: 'bg-gradient-to-r from-teal-500/10 via-teal-500/5 to-transparent border-l-4 border-teal-500 text-teal-900',
        badgeBg: 'bg-teal-100 text-teal-800 border-teal-300',
        rows: afternoon,
      },
      {
        id: 'evening',
        title: 'Buổi Tối',
        subTitle: 'Sau 18:30',
        icon: Moon,
        themeClass: 'bg-indigo-50/70 border-indigo-200 text-indigo-900',
        rowBg: 'bg-indigo-50/30',
        dividerBg: 'bg-gradient-to-r from-indigo-500/10 via-indigo-500/5 to-transparent border-l-4 border-indigo-500 text-indigo-900',
        badgeBg: 'bg-indigo-100 text-indigo-800 border-indigo-300',
        rows: evening,
      },
    ].filter(g => g.rows.length > 0);
  }, [allTimeRows]);

  // ==========================================
  // TÍNH TOÁN TIMELINE ĐỒNG BỘ MỐC THỜI GIAN
  // ==========================================
  const sessionTimelineData = useMemo(() => {
    const sessionTemplates = [
      {
        id: 'morning',
        title: 'Buổi Sáng',
        subTitle: '07:00 — 11:30',
        icon: Sun,
        themeClass: 'bg-sky-50/70 border-sky-200 text-sky-900',
        rowBg: 'bg-sky-50/30',
        dividerBg: 'bg-gradient-to-r from-sky-500/10 via-sky-500/5 to-transparent border-l-4 border-sky-500 text-sky-900',
        badgeBg: 'bg-sky-100 text-sky-800 border-sky-300',
        defaultStartM: 420, // 07:00
        defaultEndM: 675,   // 11:15
        milestones: [
          { time: '07:00', label: 'Tiết 1 / Ca 2' },
          { time: '07:45', label: 'Hết T1' },
          { time: '07:50', label: 'Tiết 2' },
          { time: '08:30', label: 'Hết Ca 2 / T2' },
          { time: '08:50', label: 'Tiết 3 / Ca 3' },
          { time: '09:40', label: 'Tiết 4' },
          { time: '10:00', label: 'Ca 4' },
          { time: '10:30', label: 'Tiết 5' },
          { time: '11:15', label: 'Hết T5' },
        ],
      },
      {
        id: 'afternoon',
        title: 'Buổi Chiều',
        subTitle: '13:30 — 18:30',
        icon: Sunset,
        themeClass: 'bg-teal-50/70 border-teal-200 text-teal-900',
        rowBg: 'bg-teal-50/30',
        dividerBg: 'bg-gradient-to-r from-teal-500/10 via-teal-500/5 to-transparent border-l-4 border-teal-500 text-teal-900',
        badgeBg: 'bg-teal-100 text-teal-800 border-teal-300',
        defaultStartM: 810,  // 13:30
        defaultEndM: 1110,  // 18:30
        milestones: [
          { time: '13:30', label: 'Tiết 6' },
          { time: '14:00', label: 'Ca 5' },
          { time: '14:20', label: 'Tiết 7' },
          { time: '15:15', label: 'Tiết 8' },
          { time: '15:30', label: 'Ca 6' },
          { time: '16:05', label: 'Tiết 9' },
          { time: '17:00', label: 'Ca 7' },
          { time: '18:30', label: 'Hết Ca 7' },
        ],
      },
      {
        id: 'evening',
        title: 'Buổi Tối',
        subTitle: '19:00 — 22:00',
        icon: Moon,
        themeClass: 'bg-indigo-50/70 border-indigo-200 text-indigo-900',
        rowBg: 'bg-indigo-50/30',
        dividerBg: 'bg-gradient-to-r from-indigo-500/10 via-indigo-500/5 to-transparent border-l-4 border-indigo-500 text-indigo-900',
        badgeBg: 'bg-indigo-100 text-indigo-800 border-indigo-300',
        defaultStartM: 1140, // 19:00
        defaultEndM: 1320, // 22:00
        milestones: [
          { time: '19:00', label: 'Ca 8' },
          { time: '20:30', label: 'Ca 9' },
          { time: '22:00', label: 'Kết thúc' },
        ],
      },
    ];

    return sessionTemplates.map(sess => {
      // Tìm các tiết học thuộc buổi này
      const sessionSlots = schedule
        .filter(s => {
          const start = s.startMinutes ?? parseTimeToMinutes(s.startTime);
          if (sess.id === 'morning') return start < 780;
          if (sess.id === 'afternoon') return start >= 780 && start <= 1110;
          return start > 1110;
        })
        .filter(s => {
          if (typeFilter !== 'all' && s.timetableType !== typeFilter) return false;
          return true;
        });

      let minStart = sess.defaultStartM;
      let maxEnd = sess.defaultEndM;

      sessionSlots.forEach(s => {
        const sm = s.startMinutes ?? parseTimeToMinutes(s.startTime);
        const em = s.endMinutes ?? parseTimeToMinutes(s.endTime);
        if (sm < minStart) minStart = sm;
        if (em > maxEnd) maxEnd = em;
      });

      // Xây dựng Timeline Blocks cho từng ngày trong activeDays
      const dayColumns = activeDays.map(day => {
        const daySlots = sessionSlots
          .filter(s => s.dayOfWeek === day.num)
          .sort(
            (a, b) =>
              (a.startMinutes ?? parseTimeToMinutes(a.startTime)) -
              (b.startMinutes ?? parseTimeToMinutes(b.startTime))
          );

        type TimelineBlock =
          | {
              type: 'slot';
              id: string;
              slot: TimetableSlot;
              startMinutes: number;
              endMinutes: number;
              duration: number;
            }
          | {
              type: 'gap';
              id: string;
              dayNum: number;
              startTime: string;
              endTime: string;
              startMinutes: number;
              endMinutes: number;
              duration: number;
            };

        const blocks: TimelineBlock[] = [];
        let cur = minStart;

        daySlots.forEach(slot => {
          const sStart = slot.startMinutes ?? parseTimeToMinutes(slot.startTime);
          const sEnd = slot.endMinutes ?? parseTimeToMinutes(slot.endTime);

          if (sStart > cur) {
            const gap = sStart - cur;
            if (gap > 15) {
              blocks.push({
                type: 'gap',
                id: `gap_${day.num}_${cur}_${sStart}`,
                dayNum: day.num,
                startTime: formatMinutesToTime(cur),
                endTime: formatMinutesToTime(sStart),
                startMinutes: cur,
                endMinutes: sStart,
                duration: gap,
              });
            }
          }

          blocks.push({
            type: 'slot',
            id: slot.id,
            slot,
            startMinutes: sStart,
            endMinutes: sEnd,
            duration: Math.max(30, sEnd - sStart),
          });

          cur = Math.max(cur, sEnd);
        });

        // Đoạn rảnh cuối buổi (nếu > 15 phút)
        if (maxEnd > cur && maxEnd - cur > 15) {
          blocks.push({
            type: 'gap',
            id: `gap_${day.num}_${cur}_${maxEnd}`,
            dayNum: day.num,
            startTime: formatMinutesToTime(cur),
            endTime: formatMinutesToTime(maxEnd),
            startMinutes: cur,
            endMinutes: maxEnd,
            duration: maxEnd - cur,
          });
        }

        return {
          day,
          slotsCount: daySlots.length,
          blocks,
        };
      });

      const totalSlotsInSession = sessionSlots.length;

      return {
        ...sess,
        minStart,
        maxEnd,
        sessionSlots,
        totalSlotsInSession,
        dayColumns,
      };
    });
  }, [schedule, activeDays, typeFilter]);

  // ==========================================
  // THAO TÁC PROFILE TKB
  // ==========================================

  // 1. Thêm TKB mới
  const handleCreateProfile = () => {
    if (!newProfileName.trim()) {
      alert('Vui lòng nhập tên Thời khóa biểu.');
      return;
    }
    const newId = `profile_${Date.now()}`;
    const newProf: TimetableProfile = {
      id: newId,
      name: newProfileName.trim(),
      relation: 'self',
      relationLabel: 'Cá nhân',
      className: '',
      colorScheme: 'indigo',
      schedule: [],
      createdAt: new Date().toISOString().split('T')[0],
    };

    const next = [...profiles, newProf];
    saveAllProfiles(next);
    setActiveProfileId(newId);
    setShowProfileModal(false);
    setNewProfileName('');
    showNotice(`Đã thêm Thời khóa biểu "${newProf.name}" thành công!`);
  };

  // 2. Nhân bản TKB (Copy)
  const handleDuplicateProfile = () => {
    if (!activeProfile) return;
    const newId = `profile_${Date.now()}`;
    const cloned: TimetableProfile = {
      ...activeProfile,
      id: newId,
      name: `Bản sao - ${activeProfile.name}`,
      createdAt: new Date().toISOString().split('T')[0],
      schedule: activeProfile.schedule.map(s => ({
        ...s,
        id: `clone_${Date.now()}_${s.id}`,
      })),
    };
    const next = [...profiles, cloned];
    saveAllProfiles(next);
    setActiveProfileId(newId);
    showNotice(`Đã nhân bản Thời khóa biểu "${cloned.name}" thành công!`);
  };

  // 3. Xóa TKB hiện tại trong dropdown
  const handleDeleteProfile = (id?: string, name?: string) => {
    const targetId = id || activeProfileId;
    const targetProf = profiles.find(p => p.id === targetId) || activeProfile;
    const targetName = name || targetProf?.name || 'hiện tại';

    if (!targetId) return;

    const filtered = profiles.filter(p => p.id !== targetId);
    if (filtered.length === 0) {
      const freshDefault: TimetableProfile = {
        id: `profile_${Date.now()}`,
        name: 'Thời khóa biểu cá nhân',
        relation: 'self',
        relationLabel: 'Cá nhân',
        className: '',
        colorScheme: 'indigo',
        schedule: [],
        createdAt: new Date().toISOString().split('T')[0],
      };
      saveAllProfiles([freshDefault]);
      setActiveProfileId(freshDefault.id);
    } else {
      saveAllProfiles(filtered);
      setActiveProfileId(filtered[0].id);
    }
    showNotice(`Đã xóa Thời khóa biểu "${targetName}" thành công.`);
  };

  const showNotice = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  // ==========================================
  // THAO TÁC THÊM / SỬA TIẾT HỌC
  // ==========================================

  const handleOpenAddSlot = (dayNum?: number, timeRow?: any) => {
    setEditingSlot(null);
    const slotType = timeRow?.type || 'CK';
    setFormType(slotType);
    setFormDayOfWeek(dayNum || 2);
    setFormPeriodNumber(timeRow?.periodNumber || 1);
    setFormStartTime(timeRow?.startTime || '07:00');
    setFormEndTime(timeRow?.endTime || '07:45');

    const isStudent = currentRole === 'student';

    if (slotType === 'HT') {
      // Học thêm
      setFormSubjectMode(isStudent ? 'custom' : 'select');
      setFormSubjectName(isStudent ? '' : 'Toán');
      setFormClassMode('select');
      setFormClassName(isStudent ? 'HT-Toán12' : 'Lớp Thêm Toán 12');
    } else {
      // Chính khóa
      setFormSubjectMode('select');
      setFormSubjectName('Toán');
      setFormClassMode('select');
      setFormClassName(activeProfile?.className || '12A1');
    }

    // Nếu học sinh thì Giáo viên trống; nếu giáo viên thì dùng Biệt danh làm mặc định
    setFormTeacherName(isStudent ? '' : 'Th Bảo');
    
    // Mặc định các trường Phòng học và Ghi chú trống
    setFormRoom('');
    setFormNotes('');
    setShowAddEditSlotModal(true);
  };

  const handleOpenEditSlot = (slot: TimetableSlot) => {
    setEditingSlot(slot);
    setFormType(slot.timetableType);
    setFormDayOfWeek(slot.dayOfWeek);
    setFormPeriodNumber(slot.periodNumber || 1);
    setFormStartTime(slot.startTime);
    setFormEndTime(slot.endTime);

    if (SUBJECT_CATALOG.includes(slot.subjectName)) {
      setFormSubjectMode('select');
      setFormSubjectName(slot.subjectName);
    } else {
      setFormSubjectMode('custom');
      setFormSubjectName(slot.subjectName);
    }

    if (CLASS_CATALOG.includes(slot.className)) {
      setFormClassMode('select');
      setFormClassName(slot.className);
    } else {
      setFormClassMode('custom');
      setFormClassName(slot.className);
    }

    setFormTeacherName(slot.teacherName || 'Đỗ Tấn Bảo');
    setFormRoom(slot.room || 'P.201');
    setFormNotes(slot.notes || '');
    setShowAddEditSlotModal(true);
  };

  const handleDeleteSlot = (slotId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (window.confirm('Bạn có chắc muốn xóa tiết học này khỏi Thời khóa biểu?')) {
      const next = schedule.filter(s => s.id !== slotId);
      updateActiveProfileSchedule(next);
      showNotice('Đã xóa tiết học.');
    }
  };

  // Chọn Preset 1-chạm
  const handleSelectPreset = (preset: TimeSlotConfig) => {
    setFormType(preset.type);
    setFormPeriodNumber(preset.num);
    setFormStartTime(preset.startTime);
    setFormEndTime(preset.endTime);
  };

  const handleSaveSlotForm = () => {
    if (!formSubjectName.trim()) {
      alert('Vui lòng nhập tên môn học.');
      return;
    }
    if (!formClassName.trim()) {
      alert('Vui lòng nhập tên lớp (tối đa 8 ký tự).');
      return;
    }

    const cleanClass = formClassName.trim().slice(0, 8);
    const cleanNotes = formNotes.trim().slice(0, 12);
    const startM = parseTimeToMinutes(formStartTime);
    const endM = parseTimeToMinutes(formEndTime);

    if (editingSlot) {
      // Sửa tiết cũ
      const updated: TimetableSlot = {
        ...editingSlot,
        timetableType: formType,
        dayOfWeek: formDayOfWeek,
        periodNumber: formPeriodNumber,
        startTime: formStartTime,
        endTime: formEndTime,
        subjectName: formSubjectName.trim(),
        className: cleanClass,
        teacherName: formTeacherName.trim(),
        room: formType === 'HT' ? formRoom.trim() : undefined,
        notes: cleanNotes || undefined,
        startMinutes: startM,
        endMinutes: endM,
      };
      const next = schedule.map(s => (s.id === editingSlot.id ? updated : s));
      updateActiveProfileSchedule(next);
      showNotice('Đã cập nhật tiết học thành công!');
    } else {
      // Thêm tiết mới
      const newSlot: TimetableSlot = {
        id: `slot_${Date.now()}`,
        timetableType: formType,
        dayOfWeek: formDayOfWeek,
        periodNumber: formPeriodNumber,
        startTime: formStartTime,
        endTime: formEndTime,
        subjectName: formSubjectName.trim(),
        className: cleanClass,
        teacherName: formTeacherName.trim(),
        room: formType === 'HT' ? formRoom.trim() : undefined,
        notes: cleanNotes || undefined,
        startMinutes: startM,
        endMinutes: endM,
      };
      const next = [...schedule, newSlot];
      updateActiveProfileSchedule(next);
      showNotice('Đã thêm tiết học mới vào Thời khóa biểu!');
    }

    setShowAddEditSlotModal(false);
  };

  // Đồng bộ lưu Drive
  const handleSyncToDrive = async () => {
    const standardItems: ScheduleItem[] = schedule.map(s => ({
      id: s.id,
      dayOfWeek: s.dayOfWeek - 1, // 1..7 cho Drive
      dayName: s.dayOfWeek === 8 ? 'Chủ Nhật' : `Thứ ${s.dayOfWeek}`,
      period: s.periodNumber || 1,
      time: `${s.startTime} - ${s.endTime}`,
      subject: s.subjectName,
      className: s.className,
      classCode: s.className,
      room: s.room || 'P.201',
      teacher: s.teacherName || 'Đỗ Tấn Bảo',
      status: 'upcoming',
      notes: s.notes,
    }));
    await savePersonalScheduleToDrive('u_hs01', standardItems);
    const accountName = activeProfile?.name || 'Cá nhân';
    const filePath = `myApp\\LopU\\ThoiKhoaBieu\\TKB ${accountName} lần ${applyWeek}.json`;
    showNotice(`Đã lưu Thời khóa biểu thành công tại: ${filePath}`);
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-16 animate-fade-in">
      {/* THÔNG BÁO TÁC VỤ */}
      {notification && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center justify-between shadow-xs animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-bold">{notification}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-emerald-500 hover:text-emerald-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ==========================================
          2. THANH CÔNG CỤ ĐIỀU KHIỂN (ACTION BAR)
      ========================================== */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        {/* HÀNG 1: QUẢN LÝ PROFILE & CÁC NÚT TÁC VỤ CHÍNH */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Calendar className="w-5 h-5" />
            </div>
          </div>

          {/* CÁC NÚT ACTION CHÍNH */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Nút Thu gọn duy nhất */}
            <button
              type="button"
              id="btn-toggle-compact-view"
              onClick={() => setViewMode(prev => (prev === 'compact' ? 'expanded' : 'compact'))}
              className={`py-1.5 px-3 rounded-xl font-bold text-xs inline-flex items-center gap-1 border transition-all cursor-pointer ${
                viewMode === 'compact'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
              title={viewMode === 'compact' ? 'Đang Thu gọn 3 ngày (Bấm để xem Đầy đủ)' : 'Bấm để Thu gọn 3 ngày'}
            >
              <span>{viewMode === 'compact' ? 'Thu gọn (Đang bật)' : 'Thu gọn'}</span>
            </button>

            {/* Nút Ẩn hàng trống */}
            <button
              type="button"
              id="btn-toggle-hide-empty-rows"
              onClick={() => setHideEmptyRows(prev => !prev)}
              className={`py-1.5 px-2.5 rounded-xl font-bold text-xs inline-flex items-center gap-1 border transition-all cursor-pointer shrink-0 ${
                hideEmptyRows
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-800 shadow-2xs'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
              title={hideEmptyRows ? 'Đang ẩn các hàng trống' : 'Ẩn các hàng không có tiết học'}
            >
              {hideEmptyRows ? <EyeOff className="w-3.5 h-3.5 text-indigo-600" /> : <Eye className="w-3.5 h-3.5 text-slate-400" />}
              <span>{hideEmptyRows ? 'Ẩn hàng trống' : 'Ẩn hàng trống'}</span>
            </button>

            {/* Nút Cài đặt khung giờ (Bánh răng) */}
            <button
              type="button"
              id="btn-time-presets-settings"
              onClick={() => {
                setEditingCkPresets(ckPresets);
                setEditingHtPresets(htPresets);
                setShowTimeSettingsModal(true);
              }}
              className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs transition-colors cursor-pointer"
              title="Cấu hình khung giờ Preset"
            >
              <Settings className="w-4 h-4 text-slate-600" />
            </button>

            {/* Nút Đồng bộ Google Drive */}
            <button
              type="button"
              id="btn-sync-tkb-drive"
              onClick={handleSyncToDrive}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 shadow-2xs transition-colors cursor-pointer"
            >
              <Cloud className="w-3.5 h-3.5 text-emerald-600" />
              <span>Lưu Drive</span>
            </button>
          </div>
        </div>

        {/* HÀNG 2: THANH QUẢN LÝ PROFILE TKB & BỘ CHỌN TUẦN */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-3 pt-3 border-t border-slate-100 text-xs">
          {/* 1. Profile TKB Dropdown + Thao tác Sửa / Add / Delete */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Thời khóa biểu ({profiles.length})
            </label>
            <div className="flex items-center gap-1.5">
              <select
                aria-label="Chọn thời khóa biểu"
                value={activeProfileId}
                onChange={e => setActiveProfileId(e.target.value)}
                className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 text-xs focus:bg-white focus:outline-hidden focus:border-indigo-500 cursor-pointer truncate"
              >
                {profiles.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>

              {/* Nút Copy Nhân bản TKB */}
              <button
                type="button"
                onClick={handleDuplicateProfile}
                className="p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 cursor-pointer shrink-0"
                title="Nhân bản (Copy) TKB này"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>

              {/* Nút Sửa TKB (Chỉ cây bút) - Đưa xuống trước Thêm mới */}
              <button
                type="button"
                id="btn-toggle-edit-mode-pen"
                onClick={() => setIsEditMode(prev => !prev)}
                className={`p-2 rounded-xl border cursor-pointer shrink-0 transition-all ${
                  isEditMode
                    ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-xs ring-2 ring-amber-300'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
                title={isEditMode ? 'Tắt chế độ Sửa TKB' : 'Bật chế độ Sửa TKB'}
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>

              {/* Nút Thêm TKB mới (+) */}
              <button
                type="button"
                onClick={() => setShowProfileModal(true)}
                className="p-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold cursor-pointer shrink-0 shadow-2xs"
                title="Thêm Thời khóa biểu mới"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>

              {/* Nút Xóa TKB hiện tại (Thùng rác màu đỏ) */}
              <button
                type="button"
                onClick={() => handleDeleteProfile(activeProfile?.id, activeProfile?.name)}
                className="p-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 cursor-pointer shrink-0"
                title={`Xóa thời khóa biểu "${activeProfile?.name || ''}"`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 2. Áp dụng từ tuần k + Ngày đầu tuần */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Áp dụng từ tuần & Ngày đầu tuần
            </label>
            <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-600">Tuần</span>
                <input
                  type="number"
                  min={1}
                  max={52}
                  value={applyWeek}
                  onChange={e => setApplyWeek(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-12 p-1 bg-white border border-slate-200 rounded-lg text-center font-bold text-xs text-indigo-700"
                />
              </div>
              <span className="text-slate-300">|</span>
              <div className="flex items-center gap-1.5 flex-1">
                <span className="text-[11px] font-medium text-slate-500 shrink-0">Từ ngày</span>
                <input
                  type="date"
                  value={weekStartDate}
                  onChange={e => setWeekStartDate(e.target.value)}
                  className="w-full p-1 bg-white border border-slate-200 rounded-lg text-[11px] font-mono text-slate-800"
                />
              </div>
            </div>
          </div>
        </div>

        {/* BẬT LỜI NHẮC CHẾ ĐỘ SỬA TKB */}
        {isEditMode && (
          <div className="p-2.5 bg-amber-50 border border-amber-300 text-amber-900 rounded-xl text-xs flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                <strong>Chế độ Sửa TKB đang bật:</strong> Nhấp vào ô trống / khoảng rảnh để thêm tiết mới, hover vào thẻ để Sửa hoặc Xóa nhanh.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsEditMode(false)}
              className="text-amber-800 font-bold hover:underline cursor-pointer"
            >
              Hoàn tất sửa
            </button>
          </div>
        )}


      </div>

      {/* ==========================================
          3. BẢNG THỜI KHÓA BIỂU (TIMETABLE MATRIX)
      ========================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            {/* TIÊU ĐỀ CỘT CÁC THỨ TRONG TUẦN */}
            <thead className="sticky top-0 z-30 shadow-xs bg-slate-900">
              <tr className="text-white text-xs border-b border-slate-800">
                {activeDays.map(day => (
                  <th
                    key={day.code}
                    className={`p-3 font-bold text-center border-r border-slate-800 min-w-[120px] ${
                      viewMode === 'compact' ? 'w-1/3' : 'w-[14.28%]'
                    }`}
                  >
                    <div className="text-sm font-extrabold">{day.label}</div>
                    {day.compactLabel && (
                      <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-semibold border border-indigo-400/30">
                        {day.compactLabel}
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>

            {/* THÂN BẢNG THEO 3 BUỔI */}
            <tbody className="divide-y divide-slate-200 text-xs">
              {matrixLayoutMode === 'timeline' ? (
                /* ==========================================
                   A. MA TRẬN ĐỒNG BỘ THEO TRỤC THỜI GIAN THỰC
                ========================================== */
                sessionTimelineData
                  .filter(sess => !hideEmptyRows || sess.dayColumns.some(col => col.slotsCount > 0))
                  .map(session => (
                    <React.Fragment key={`timeline-session-${session.id}`}>
                      {/* DẢI TIÊU ĐỀ NGANG PHÂN TÁCH BUỔI */}
                      <tr className={session.dividerBg}>
                        <td
                          colSpan={activeDays.length}
                          className="p-2.5 px-4 font-black text-xs uppercase tracking-wider shadow-2xs"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <session.icon className="w-4 h-4 shrink-0" />
                              <span>{session.title}</span>
                              <span className="text-[11px] font-medium opacity-80 lowercase font-mono">
                                ({formatMinutesToTime(session.minStart)} — {formatMinutesToTime(session.maxEnd)})
                              </span>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${session.badgeBg}`}>
                              {session.totalSlotsInSession} tiết học
                            </span>
                          </div>
                        </td>
                      </tr>

                      {/* HÀNG NỘI DUNG BUỔI CHỨA CÁC CỘT NGÀY */}
                      <tr className={session.rowBg}>
                        {/* CÁC CỘT NGÀY CỦA BUỔI ĐƯỢC CĂN THEO TIMELINE */}
                        {session.dayColumns.map(col => (
                          <td
                            key={`day-col-${session.id}-${col.day.num}`}
                            className="p-1.5 border-r border-slate-200 align-top min-w-[120px]"
                          >
                            <div className="flex flex-col gap-1.5">
                              {col.blocks.map(block => {
                                if (block.type === 'slot') {
                                  const slot = block.slot;
                                  const cardHeight = Math.max(68, Math.round(block.duration * 1.55));

                                  return (
                                    <div
                                      key={slot.id}
                                      id={`slot-card-${slot.id}`}
                                      style={{ minHeight: `${cardHeight}px` }}
                                      className={`rounded-xl p-2 transition-all border relative group flex flex-col justify-between ${
                                        slot.timetableType === 'CK'
                                          ? 'bg-teal-50/50 border-teal-300 hover:border-teal-500 hover:bg-teal-50/80 shadow-2xs'
                                          : 'bg-amber-50/50 border-amber-300 hover:border-amber-500 hover:bg-amber-50/80 shadow-2xs'
                                      }`}
                                    >
                                      {/* Nút Sửa / Xóa khi bật chế độ Edit Mode hoặc hover */}
                                      <div
                                        className={`absolute top-1 right-1 flex items-center gap-1 transition-opacity z-10 ${
                                          isEditMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                                        }`}
                                      >
                                        <button
                                          type="button"
                                          onClick={() => handleOpenEditSlot(slot)}
                                          className="p-1 rounded-md bg-white/90 text-indigo-700 hover:bg-indigo-100 shadow-2xs border border-slate-200 cursor-pointer"
                                          title="Chỉnh sửa tiết học"
                                        >
                                          <Pencil className="w-2.5 h-2.5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={e => handleDeleteSlot(slot.id, e)}
                                          className="p-1 rounded-md bg-white/90 text-rose-600 hover:bg-rose-100 shadow-2xs border border-slate-200 cursor-pointer"
                                          title="Xóa tiết học"
                                        >
                                          <Trash2 className="w-2.5 h-2.5" />
                                        </button>
                                      </div>

                                      {/* NỘI DUNG THẺ TIẾT HỌC */}
                                      {slot.timetableType === 'CK' ? (
                                        <>
                                          {/* Hàng 1: Trái (50%) Tên môn bold; Phải (50%) Tên lớp badge gọn */}
                                          <div className="flex items-center justify-between gap-1 pr-6">
                                            <span
                                              className="w-1/2 truncate font-black text-slate-900 text-xs"
                                              title={slot.subjectName}
                                            >
                                              {slot.subjectName}
                                            </span>
                                            <span
                                              className="w-1/2 text-right truncate font-bold text-teal-800 bg-teal-100/80 px-1.5 py-0.2 rounded-md text-[10px] border border-teal-200"
                                              title={`Lớp ${slot.className}`}
                                            >
                                              {slot.className}
                                            </span>
                                          </div>

                                          {/* Hàng 2: Trái (50%) Icon đồng hồ + Tiết; Phải (50%) Giờ monospace */}
                                          <div className="flex items-center justify-between gap-1 text-[10px] text-slate-600 pt-0.5">
                                            <span className="w-1/2 truncate flex items-center gap-1 font-semibold text-slate-700">
                                              <Clock className="w-2.5 h-2.5 text-teal-600 shrink-0" />
                                              <span>Tiết {slot.periodNumber || 1}</span>
                                            </span>
                                            <span className="w-1/2 text-right truncate font-mono text-[10px] text-slate-500 font-bold">
                                              {slot.startTime}-{slot.endTime}
                                            </span>
                                          </div>

                                          {/* Hàng 3: Ghi chú nếu có */}
                                          {slot.notes && (
                                            <div className="pt-0.5 border-t border-teal-100 flex items-center gap-1 text-[9px] text-slate-500 font-medium">
                                              <span>📌</span>
                                              <span className="truncate" title={slot.notes}>
                                                {slot.notes.slice(0, 12)}
                                              </span>
                                            </div>
                                          )}
                                        </>
                                      ) : (
                                        <>
                                          {/* Hàng 1: Tên môn + Tên lớp + Phòng học */}
                                          <div className="flex items-center justify-between gap-1 pr-6">
                                            <span
                                              className="w-3/5 truncate font-black text-slate-900 text-xs"
                                              title={`${slot.subjectName} - ${slot.className}`}
                                            >
                                              {slot.subjectName} - {slot.className}
                                            </span>
                                            <span
                                              className="w-2/5 text-right truncate font-bold text-amber-800 bg-amber-100/80 px-1 py-0.2 rounded text-[9px] border border-amber-200"
                                              title={slot.room || 'P.201'}
                                            >
                                              {slot.room || 'P.201'}
                                            </span>
                                          </div>

                                          {/* Hàng 2: Icon người dùng + Tên giáo viên + Tên ca */}
                                          <div className="flex items-center justify-between gap-1 text-[10px] text-slate-600 pt-0.5">
                                            <span
                                              className="w-3/5 truncate flex items-center gap-1 font-medium text-slate-700"
                                              title={slot.teacherNickname || slot.teacherName}
                                            >
                                              <User className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                                              <span>{slot.teacherNickname || slot.teacherName || 'GV'}</span>
                                            </span>
                                            <span className="w-2/5 text-right truncate font-mono text-[9px] text-slate-500 font-bold">
                                              Ca {slot.periodNumber || 1}: {slot.startTime}
                                            </span>
                                          </div>

                                          {/* Hàng 3: Ghi chú nếu có + Badge HT */}
                                          <div className="pt-0.5 border-t border-amber-100 flex items-center justify-between gap-1">
                                            <span
                                              className="text-[9px] text-slate-500 font-medium truncate flex-1"
                                              title={slot.notes || 'Học thêm'}
                                            >
                                              {slot.notes ? `📌 ${slot.notes.slice(0, 12)}` : ''}
                                            </span>
                                            <span className="px-1 py-0.2 rounded bg-amber-500 text-slate-950 text-[8px] font-black tracking-tight shrink-0 shadow-2xs">
                                              HT
                                            </span>
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  );
                                }

                                // BLOCK LÀ KHOẢNG RẢNH (> 15 PHÚT)
                                const gapHeight = Math.max(44, Math.round(block.duration * 1.45));
                                return (
                                  <div
                                    key={block.id}
                                    style={{ minHeight: `${gapHeight}px` }}
                                    onClick={() => {
                                      if (isEditMode) {
                                        handleOpenAddSlot(block.dayNum, {
                                          startTime: block.startTime,
                                          endTime: block.endTime,
                                        });
                                      } else {
                                        showNotice('Mặc định khóa TKB. Nhấp icon cây bút "Sửa TKB" để kích hoạt chế độ chỉnh sửa.');
                                      }
                                    }}
                                    className={`rounded-xl border border-dashed border-slate-200 bg-slate-50/40 hover:bg-indigo-50/40 hover:border-indigo-300 p-2 flex flex-col items-center justify-center text-center transition-all cursor-pointer group ${
                                      isEditMode ? 'ring-1 ring-indigo-200 bg-indigo-50/20' : ''
                                    }`}
                                    title={`Khoảng rảnh: ${block.startTime} - ${block.endTime} (${formatDurationText(block.duration)}) - Nhấp để thêm tiết học`}
                                  >
                                    <div className="flex items-center gap-1 text-[10px] text-slate-400 group-hover:text-indigo-600 font-medium">
                                      <Clock className="w-3 h-3 text-slate-400 group-hover:text-indigo-500 shrink-0" />
                                      <span className="font-mono font-semibold">
                                        {block.startTime} - {block.endTime}
                                      </span>
                                    </div>
                                    <div className="text-[9px] text-slate-400 group-hover:text-indigo-700 font-medium mt-0.5 flex items-center gap-1">
                                      <span className="italic">Rảnh {formatDurationText(block.duration)}</span>
                                      <span className="hidden group-hover:inline font-bold text-indigo-600">
                                        + Thêm
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                        ))}
                      </tr>
                    </React.Fragment>
                  ))
              ) : (
                /* ==========================================
                   B. LƯỚI PHÂN THEO CA/TIẾT CỐ ĐỊNH (PRESET GRID)
                ========================================== */
                sessionGroups.map(session => (
                  <React.Fragment key={`session-${session.id}`}>
                    {/* SESSION DIVIDER */}
                    <tr className={session.dividerBg}>
                      <td
                        colSpan={activeDays.length + 1}
                        className="p-2.5 px-4 font-black text-xs uppercase tracking-wider shadow-2xs"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <session.icon className="w-4 h-4 shrink-0" />
                            <span>{session.title}</span>
                            <span className="text-[11px] font-medium opacity-80 lowercase font-mono">
                              ({session.subTitle})
                            </span>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${session.badgeBg}`}>
                            {session.rows.length} khung giờ
                          </span>
                        </div>
                      </td>
                    </tr>

                    {/* CÁC HÀNG KHUNG GIỜ CỦA BUỔI */}
                    {session.rows.map(row => (
                      <tr key={`row-${row.id}`} className={`hover:bg-slate-50/70 transition-colors ${session.rowBg}`}>
                        {/* Cột thông tin khung giờ bên trái */}
                        <td className="p-2.5 bg-slate-50/90 font-medium text-slate-800 border-r border-slate-200 text-center align-middle">
                          <div className="space-y-0.5">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-md font-black text-xs ${
                                row.type === 'CK'
                                  ? 'bg-teal-100 text-teal-900 border border-teal-200'
                                  : 'bg-amber-100 text-amber-900 border border-amber-200'
                              }`}
                            >
                              {row.label}
                            </span>
                            <div className="text-[11px] font-mono font-semibold text-slate-600">
                              {row.startTime} - {row.endTime}
                            </div>
                          </div>
                        </td>

                        {/* Các ô của từng thứ */}
                        {activeDays.map(day => {
                          const slotsInCell = schedule.filter(
                            s =>
                              s.dayOfWeek === day.num &&
                              s.timetableType === row.type &&
                              (s.periodNumber === row.periodNumber ||
                                (s.startTime === row.startTime && s.endTime === row.endTime))
                          );

                          return (
                            <td
                              key={`cell-${day.num}-${row.id}`}
                              className="p-1.5 border-r border-slate-200 align-top min-w-[110px]"
                            >
                              {slotsInCell.length > 0 ? (
                                <div className="space-y-1.5">
                                  {slotsInCell.map(slot => (
                                    <div
                                      key={slot.id}
                                      id={`slot-card-${slot.id}`}
                                      className={`min-h-[64px] rounded-xl p-2 transition-all space-y-1 border relative group ${
                                        slot.timetableType === 'CK'
                                          ? 'bg-teal-50/40 border-teal-300 hover:border-teal-500 hover:bg-teal-50/70'
                                          : 'bg-amber-50/40 border-amber-300 hover:border-amber-500 hover:bg-amber-50/70'
                                      }`}
                                    >
                                      {/* Nút Sửa / Xóa khi bật chế độ Edit Mode hoặc hover */}
                                      <div
                                        className={`absolute top-1 right-1 flex items-center gap-1 transition-opacity ${
                                          isEditMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                                        }`}
                                      >
                                        <button
                                          type="button"
                                          onClick={() => handleOpenEditSlot(slot)}
                                          className="p-1 rounded-md bg-white/90 text-indigo-700 hover:bg-indigo-100 shadow-2xs border border-slate-200 cursor-pointer"
                                          title="Chỉnh sửa tiết học"
                                        >
                                          <Pencil className="w-2.5 h-2.5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={e => handleDeleteSlot(slot.id, e)}
                                          className="p-1 rounded-md bg-white/90 text-rose-600 hover:bg-rose-100 shadow-2xs border border-slate-200 cursor-pointer"
                                          title="Xóa tiết học"
                                        >
                                          <Trash2 className="w-2.5 h-2.5" />
                                        </button>
                                      </div>

                                      {/* TIẾT CHÍNH KHÓA */}
                                      {slot.timetableType === 'CK' ? (
                                        <>
                                          <div className="flex items-center justify-between gap-1 pr-6">
                                            <span
                                              className="w-1/2 truncate font-black text-slate-900 text-xs"
                                              title={slot.subjectName}
                                            >
                                              {slot.subjectName}
                                            </span>
                                            <span
                                              className="w-1/2 text-right truncate font-bold text-teal-800 bg-teal-100/80 px-1.5 py-0.2 rounded-md text-[10px] border border-teal-200"
                                              title={`Lớp ${slot.className}`}
                                            >
                                              {slot.className}
                                            </span>
                                          </div>

                                          <div className="flex items-center justify-between gap-1 text-[10px] text-slate-600 pt-0.5">
                                            <span className="w-1/2 truncate flex items-center gap-1 font-semibold text-slate-700">
                                              <Clock className="w-2.5 h-2.5 text-teal-600 shrink-0" />
                                              <span>Tiết {slot.periodNumber || row.periodNumber}</span>
                                            </span>
                                            <span className="w-1/2 text-right truncate font-mono text-[10px] text-slate-500 font-bold">
                                              {slot.startTime}-{slot.endTime}
                                            </span>
                                          </div>

                                          {slot.notes && (
                                            <div className="pt-0.5 border-t border-teal-100 flex items-center gap-1 text-[9px] text-slate-500 font-medium">
                                              <span>📌</span>
                                              <span className="truncate" title={slot.notes}>
                                                {slot.notes.slice(0, 12)}
                                              </span>
                                            </div>
                                          )}
                                        </>
                                      ) : (
                                        /* TIẾT HỌC THÊM */
                                        <>
                                          <div className="flex items-center justify-between gap-1 pr-6">
                                            <span
                                              className="w-3/5 truncate font-black text-slate-900 text-xs"
                                              title={`${slot.subjectName} - ${slot.className}`}
                                            >
                                              {slot.subjectName} - {slot.className}
                                            </span>
                                            <span
                                              className="w-2/5 text-right truncate font-bold text-amber-800 bg-amber-100/80 px-1 py-0.2 rounded text-[9px] border border-amber-200"
                                              title={slot.room || 'P.201'}
                                            >
                                              {slot.room || 'P.201'}
                                            </span>
                                          </div>

                                          <div className="flex items-center justify-between gap-1 text-[10px] text-slate-600 pt-0.5">
                                            <span
                                              className="w-3/5 truncate flex items-center gap-1 font-medium text-slate-700"
                                              title={slot.teacherNickname || slot.teacherName}
                                            >
                                              <User className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                                              <span>{slot.teacherNickname || slot.teacherName || 'GV'}</span>
                                            </span>
                                            <span className="w-2/5 text-right truncate font-mono text-[9px] text-slate-500 font-bold">
                                              Ca {slot.periodNumber || row.periodNumber}: {slot.startTime}
                                            </span>
                                          </div>

                                          <div className="pt-0.5 border-t border-amber-100 flex items-center justify-between gap-1">
                                            <span
                                              className="text-[9px] text-slate-500 font-medium truncate flex-1"
                                              title={slot.notes || 'Học thêm'}
                                            >
                                              {slot.notes ? `📌 ${slot.notes.slice(0, 12)}` : ''}
                                            </span>
                                            <span className="px-1 py-0.2 rounded bg-amber-500 text-slate-950 text-[8px] font-black tracking-tight shrink-0 shadow-2xs">
                                              HT
                                            </span>
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                /* Ô TRỐNG (CLICK ĐỂ THÊM KHI BẬT SỬA TKB) */
                                <div
                                  onClick={() => isEditMode && handleOpenAddSlot(day.num, row)}
                                  className={`h-[64px] rounded-xl border border-dashed flex flex-col items-center justify-center transition-all ${
                                    isEditMode
                                      ? 'border-indigo-300 bg-indigo-50/20 hover:bg-indigo-50/60 text-indigo-600 cursor-pointer'
                                      : 'border-slate-200/60 text-slate-300 text-[10px]'
                                  }`}
                                >
                                  {isEditMode ? (
                                    <div className="flex items-center gap-1 text-[11px] font-bold">
                                      <Plus className="w-3.5 h-3.5" />
                                      <span>Thêm</span>
                                    </div>
                                  ) : (
                                    <span className="italic">Trống</span>
                                  )}
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* TÓM TẮT THỐNG KÊ TKB */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span className="text-slate-600">
            Hồ sơ: <strong className="text-slate-900">{activeProfile?.name}</strong> • Lớp:{' '}
            <strong className="text-slate-900">{activeProfile?.className}</strong>
          </span>
          <span className="text-slate-400">•</span>
          <span className="text-slate-600">
            Tổng cộng <strong className="text-indigo-600">{schedule.length}</strong> tiết học (
            {schedule.filter(s => s.timetableType === 'CK').length} Chính khóa CK,{' '}
            {schedule.filter(s => s.timetableType === 'HT').length} Học thêm HT)
          </span>
        </div>

        <div className="text-[11px] text-slate-500 font-medium">
          Mốc giờ: ☀️ Sáng (7:00-11:15) • ⛅ Chiều (13:30-16:45) • 🌙 Tối (17:00-22:00)
        </div>
      </div>

      {/* =========================================================================
          4. MODAL "THÊM / CHỈNH SỬA TIẾT HỌC" (ĐÁP ỨNG TOÀN DIỆN MỤC 4 USER REQUEST)
      ========================================================================= */}
      {showAddEditSlotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4">
            {/* Header Modal */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingSlot ? 'Chỉnh Sửa Tiết Học' : 'Thêm Tiết Học Mới'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Cập nhật chi tiết môn, lớp, giáo viên và khung giờ học
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddEditSlotModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* CHỌN LOẠI HÌNH TKB: 2 CARD LỚN DẠNG RADIO */}
              <div>
                <label className="font-bold text-slate-700 block mb-1.5">
                  1. Chọn loại hình Thời khóa biểu
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    onClick={() => setFormType('CK')}
                    className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex items-center gap-3 ${
                      formType === 'CK'
                        ? 'border-teal-500 bg-teal-50/60 shadow-xs ring-2 ring-teal-200'
                        : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold text-sm">
                      🏛️
                    </div>
                    <div>
                      <div className="font-extrabold text-slate-900 text-xs">
                        Chính Khóa (CK)
                      </div>
                      <div className="text-[10px] text-teal-700 font-semibold">
                        9 Tiết • Viền xanh ngọc
                      </div>
                    </div>
                  </div>

                  <div
                    onClick={() => setFormType('HT')}
                    className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex items-center gap-3 ${
                      formType === 'HT'
                        ? 'border-amber-500 bg-amber-50/60 shadow-xs ring-2 ring-amber-200'
                        : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-sm">
                      ⭐
                    </div>
                    <div>
                      <div className="font-extrabold text-slate-900 text-xs">
                        Học Thêm (HT)
                      </div>
                      <div className="text-[10px] text-amber-800 font-semibold">
                        9 Ca • Viền hổ phách
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* BỘ CHỌN GIỜ 1-CHẠM (THAY ĐỔI ĐỘNG THEO LOẠI TKB) */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <label className="font-bold text-slate-700 block">
                  2. Chọn mốc giờ 1-chạm ({formType === 'CK' ? '9 Tiết Chính Khóa' : '9 Ca Học Thêm'})
                </label>

                {formType === 'CK' ? (
                  /* LƯỚI 9 NÚT TIẾT 1 -> TIẾT 9 CHO CHÍNH KHÓA */
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                    {ckPresets.map(preset => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleSelectPreset(preset)}
                        className={`p-2 rounded-lg font-bold text-center border transition-all cursor-pointer ${
                          formPeriodNumber === preset.num && formStartTime === preset.startTime
                            ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-teal-50 hover:border-teal-300'
                        }`}
                      >
                        <div className="text-[11px]">{preset.label}</div>
                        <div className="text-[9px] font-mono opacity-80">{preset.startTime}</div>
                      </button>
                    ))}
                  </div>
                ) : (
                  /* LƯỚI 9 NÚT CA 1 -> CA 9 CHO HỌC THÊM */
                  <div className="grid grid-cols-3 gap-1.5">
                    {htPresets.map(preset => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleSelectPreset(preset)}
                        className={`p-2 rounded-lg font-bold text-left border transition-all cursor-pointer ${
                          formPeriodNumber === preset.num && formStartTime === preset.startTime
                            ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-amber-50 hover:border-amber-300'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <span>{preset.label}</span>
                          <span className="text-[9px] font-medium opacity-70">
                            {preset.categoryName}
                          </span>
                        </div>
                        <div className="text-[10px] font-mono font-bold mt-0.5">
                          {preset.startTime}-{preset.endTime}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* 2 Ô INPUT TINH CHỈNH THỦ CÔNG GIỜ BẮT ĐẦU & KẾT THÚC */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                      Giờ bắt đầu (HH:mm)
                    </label>
                    <input
                      type="text"
                      value={formStartTime}
                      onChange={e => setFormStartTime(e.target.value)}
                      placeholder="07:00"
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono font-bold text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                      Giờ kết thúc (HH:mm)
                    </label>
                    <input
                      type="text"
                      value={formEndTime}
                      onChange={e => setFormEndTime(e.target.value)}
                      placeholder="07:45"
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono font-bold text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* THỨ TRONG TUẦN (DAY OF WEEK: 2 -> 8) */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  3. Ngày trong tuần
                </label>
                <div className="grid grid-cols-7 gap-1">
                  {ALL_WEEK_DAYS.map(d => (
                    <button
                      key={d.num}
                      type="button"
                      onClick={() => setFormDayOfWeek(d.num)}
                      className={`py-2 rounded-lg font-bold text-xs border transition-all cursor-pointer ${
                        formDayOfWeek === d.num
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {d.code}
                    </button>
                  ))}
                </div>
              </div>

              {/* MÔN HỌC (TOGGLE DROPDOWN & TỰ NHẬP) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">4. Môn học</label>
                  <div className="flex items-center gap-1 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setFormSubjectMode('select')}
                      className={`px-2 py-0.5 rounded cursor-pointer ${
                        formSubjectMode === 'select'
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      Từ danh mục
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormSubjectMode('custom')}
                      className={`px-2 py-0.5 rounded cursor-pointer ${
                        formSubjectMode === 'custom'
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      Tự nhập ngoài
                    </button>
                  </div>
                </div>

                {formSubjectMode === 'select' ? (
                  <select
                    aria-label="Chọn môn học"
                    value={formSubjectName}
                    onChange={e => setFormSubjectName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-xs focus:bg-white focus:outline-hidden focus:border-indigo-500 cursor-pointer"
                  >
                    {SUBJECT_CATALOG.map(s => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={formSubjectName}
                    onChange={e => setFormSubjectName(e.target.value)}
                    placeholder="Nhập tên môn học..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-xs focus:bg-white focus:outline-hidden focus:border-indigo-500"
                  />
                )}
              </div>

              {/* TÊN LỚP (GIỚI HẠN MAXLENGTH=8) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">
                    5. Tên lớp (Tối đa 8 ký tự)
                  </label>
                  <div className="flex items-center gap-1 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setFormClassMode('select')}
                      className={`px-2 py-0.5 rounded cursor-pointer ${
                        formClassMode === 'select'
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      Danh sách
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormClassMode('custom')}
                      className={`px-2 py-0.5 rounded cursor-pointer ${
                        formClassMode === 'custom'
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      Tự nhập
                    </button>
                  </div>
                </div>

                {formClassMode === 'select' ? (
                  <select
                    aria-label="Chọn tên lớp"
                    value={formClassName}
                    onChange={e => setFormClassName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-xs focus:bg-white focus:outline-hidden focus:border-indigo-500 cursor-pointer"
                  >
                    {userClassOptions.length === 0 ? (
                      <option value="">-- (Danh sách rỗng) --</option>
                    ) : (
                      userClassOptions.map(c => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))
                    )}
                  </select>
                ) : (
                  <input
                    type="text"
                    maxLength={8}
                    value={formClassName}
                    onChange={e => setFormClassName(e.target.value)}
                    placeholder="VD: 12A1, 10T-NC..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-xs focus:bg-white focus:outline-hidden focus:border-indigo-500"
                  />
                )}
              </div>

              {/* GIÁO VIÊN & PHÒNG HỌC (HIỂN THỊ ĐẦY ĐỦ CHO HT / CK) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    6. Giáo viên
                  </label>
                  <input
                    type="text"
                    value={formTeacherName}
                    onChange={e => setFormTeacherName(e.target.value)}
                    placeholder="Đỗ Tấn Bảo..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 text-xs focus:bg-white focus:outline-hidden focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    7. Phòng học {formType === 'HT' ? '(Học thêm)' : ''}
                  </label>
                  <input
                    type="text"
                    value={formRoom}
                    onChange={e => setFormRoom(e.target.value)}
                    placeholder="P.201..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 text-xs focus:bg-white focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* GHI CHÚ NGẮN: GIỚI HẠN MAXLENGTH=12 CÓ BỘ ĐẾM KÝ TỰ */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">
                    8. Ghi chú ngắn (Tối đa 12 ký tự)
                  </label>
                  <span
                    className={`font-mono text-[10px] font-bold ${
                      formNotes.length >= 12 ? 'text-rose-600' : 'text-slate-400'
                    }`}
                  >
                    {formNotes.length}/12
                  </span>
                </div>
                <input
                  type="text"
                  maxLength={12}
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  placeholder="VD: Kiểm tra 15p"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 text-xs focus:bg-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Footer Modal */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowAddEditSlotModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveSlotForm}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{editingSlot ? 'Cập Nhật Tiết Học' : 'Lưu Tiết Học'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL THÊM PROFILE TKB MỚI */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Thêm Thời Khóa Biểu
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Tên TKB
                </label>
                <input
                  type="text"
                  value={newProfileName}
                  onChange={e => setNewProfileName(e.target.value)}
                  placeholder="Nhập tên Thời khóa biểu..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-xs focus:bg-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleCreateProfile}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-600 shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm TKB</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CÀI ĐẶT PRESET KHUNG GIỜ (TIẾT 1-9 & CA 1-9) */}
      {showTimeSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <Settings className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Cài Đặt Preset Khung Giờ (9 Tiết & 9 Ca)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Tùy chỉnh thời gian cho các Tiết chính khóa và Ca học thêm
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTimeSettingsModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 1. CHÍNH KHÓA (9 TIẾT) */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-teal-800 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-teal-600"></span>
                Chính Khóa (9 Tiết: 5 Sáng + 4 Chiều)
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {editingCkPresets.map((preset, idx) => (
                  <div
                    key={preset.id}
                    className="p-2 rounded-xl border border-slate-200 bg-teal-50/30 flex items-center justify-between gap-1 text-xs"
                  >
                    <span className="font-bold text-slate-800 w-14">{preset.label}:</span>
                    <input
                      type="text"
                      value={preset.startTime}
                      onChange={e => {
                        const updated = [...editingCkPresets];
                        updated[idx].startTime = e.target.value;
                        setEditingCkPresets(updated);
                      }}
                      className="w-14 p-1 text-xs text-center font-mono font-bold bg-white border border-slate-300 rounded"
                    />
                    <span>-</span>
                    <input
                      type="text"
                      value={preset.endTime}
                      onChange={e => {
                        const updated = [...editingCkPresets];
                        updated[idx].endTime = e.target.value;
                        setEditingCkPresets(updated);
                      }}
                      className="w-14 p-1 text-xs text-center font-mono font-bold bg-white border border-slate-300 rounded"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* 2. HỌC THÊM (9 CA) */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <h4 className="text-xs font-black uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-600"></span>
                Học Thêm / Dạy Thêm (9 Ca)
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {editingHtPresets.map((preset, idx) => (
                  <div
                    key={preset.id}
                    className="p-2 rounded-xl border border-slate-200 bg-amber-50/30 space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between font-bold text-slate-800">
                      <span>{preset.label}</span>
                      <span className="text-[10px] text-slate-500 font-normal">
                        {preset.categoryName}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={preset.startTime}
                        onChange={e => {
                          const updated = [...editingHtPresets];
                          updated[idx].startTime = e.target.value;
                          setEditingHtPresets(updated);
                        }}
                        className="w-full p-1 text-xs text-center font-mono font-bold bg-white border border-slate-300 rounded"
                      />
                      <span>-</span>
                      <input
                        type="text"
                        value={preset.endTime}
                        onChange={e => {
                          const updated = [...editingHtPresets];
                          updated[idx].endTime = e.target.value;
                          setEditingHtPresets(updated);
                        }}
                        className="w-full p-1 text-xs text-center font-mono font-bold bg-white border border-slate-300 rounded"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* FOOTER */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setEditingCkPresets(DEFAULT_CK_PRESETS);
                  setEditingHtPresets(DEFAULT_HT_PRESETS);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Mặc định</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowTimeSettingsModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCkPresets(editingCkPresets);
                    setHtPresets(editingHtPresets);
                    localStorage.setItem(STORAGE_KEY_CK, JSON.stringify(editingCkPresets));
                    localStorage.setItem(STORAGE_KEY_HT, JSON.stringify(editingHtPresets));
                    setShowTimeSettingsModal(false);
                    showNotice('Đã lưu cấu hình khung giờ thành công!');
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Lưu Khung Giờ</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
