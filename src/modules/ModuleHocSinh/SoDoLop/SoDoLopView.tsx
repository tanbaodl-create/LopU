import React, { useState, useEffect } from 'react';
import {
  LayoutGrid,
  Cloud,
  Save,
  Users,
  User,
  UserRound,
  Phone,
  GraduationCap,
  Sparkles,
  Printer,
  RotateCcw,
  Trash2,
  RefreshCw,
  UserCheck,
  Plus,
  ArrowRightLeft,
  XCircle,
  HelpCircle,
  Search,
  X,
  CheckCircle2,
  Edit3,
  Filter,
  Download,
  SlidersHorizontal,
  Settings,
  AlertTriangle,
  MapPin,
  Zap,
} from 'lucide-react';
import { toPng } from 'html-to-image';
import { ClassItem, ClassSeatingPlan, UserRole } from '../../../services/storageTypes';
import { getClasses } from '../../ConnectData/ConnectFirestore';
import {
  connectGoogleDrive,
  savePersonalSeatingPlanToDrive,
  saveSeatingChartToDrive,
  fetchSeatingChartsFromDrive,
  fetchDriveFileJsonContent,
  deleteDriveFileEverywhere,
  listAppFilesFromDrive,
  downloadFileJson,
  getDriveConnectionState,
  DriveStoredFile,
} from '../../ConnectData/ConnectDrive';
import {
  SeatingRulesConfig,
  FixedSeatPosition,
  StudentFixedSeatRule,
  getClassSeatingRules,
  saveClassSeatingRules,
  parseMultiplePositions,
  formatFixedPosition,
  validateAndSyncFixedSeatPositions,
  parseAvoidNearGroups,
  formatAvoidNearGroups,
  isAvoidNearViolation,
} from '../../ModuleGiaoVien/NhapHocSinh/nhapHocSinhService';

// Đường dẫn mặc định của app và module Sơ đồ lớp
export const DEFAULT_APP_PATH = 'myApp/LopU';
export const DEFAULT_SODOLOP_PATH = `${DEFAULT_APP_PATH}/SoDoLop`;

// Icon Học Sinh Nữ (IconNu) - Chú thích Nơ cổ áo & Tóc dài chuẩn sơ đồ lớp
export const IconNu: React.FC<{ className?: string }> = ({ className = 'w-7 h-7' }) => (
  <svg viewBox="0 0 100 100" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="5.5" fill="#ffffff" />
    <path d="M22 46C20 62 26 78 32 85H68C74 78 80 62 78 46C76 26 68 15 50 15C32 15 24 26 22 46Z" fill="currentColor" />
    <path d="M31 44C31 35 38 28 50 28C62 28 69 35 69 44C69 56 60 65 50 65C40 65 31 56 31 44Z" fill="#ffffff" stroke="currentColor" strokeWidth="4" />
    <path d="M30 42C28 32 36 22 50 22C64 22 72 32 70 42C66 30 58 28 50 35C42 28 34 30 30 42Z" fill="currentColor" />
    <path d="M14 88C16 75 30 68 36 66L45 76H55L64 66C70 68 84 75 86 88" fill="currentColor" />
    <path d="M36 66L47 77L50 72L53 77L64 66" stroke="currentColor" strokeWidth="3" fill="#ffffff" />
    <path d="M44 79C41 77 41 83 47 85L50 81L53 85C59 83 59 77 56 79L50 76L44 79Z" fill="currentColor" stroke="currentColor" strokeWidth="1" />
  </svg>
);

// Icon Học Sinh Nam (IconNam) - Chú thích Tóc ngắn & Cổ áo chuẩn sơ đồ lớp
export const IconNam: React.FC<{ className?: string }> = ({ className = 'w-7 h-7' }) => (
  <svg viewBox="0 0 100 100" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="5.5" fill="#ffffff" />
    <path d="M28 38C26 26 36 15 50 15C64 15 74 26 72 38C74 30 66 19 50 19C34 19 26 30 28 38Z" fill="currentColor" />
    <path d="M30 36C28 26 36 17 50 17C64 17 72 26 70 36C67 25 59 20 50 20C41 20 33 25 30 36Z" fill="currentColor" />
    <ellipse cx="50" cy="44" rx="20" ry="22" stroke="currentColor" strokeWidth="4" fill="#ffffff" />
    <path d="M30 36C30 25 38 18 50 18C62 18 70 25 70 36C68 28 60 22 50 22C40 22 32 28 30 36Z" fill="currentColor" />
    <path d="M42 62V70H58V62" stroke="currentColor" strokeWidth="4" fill="#ffffff" />
    <path d="M14 86C16 73 30 67 38 65L43 73H57L62 65C70 67 84 73 86 86" fill="currentColor" stroke="currentColor" strokeWidth="3" />
  </svg>
);

// Component hiển thị Khung Bàn Học Sinh hình vuông bo góc: Nhãn chức danh nằm ngoài vòng tròn avatar nhưng nằm trong khung hình vuông bo góc
export interface StudentCardBoxProps {
  gender?: 'Nam' | 'Nữ' | string;
  isFemale?: boolean;
  dieuHanh?: string; // Trái - Trên: Điều hành (LT, LP, PHT...)
  to?: string;       // Trái - Dưới: Tổ (TT, TP...)
  doan?: string;     // Phải - Trên: Đoàn (BT, PBT, UV...)
  mon?: string;      // Phải - Dưới: BCS Bộ môn (CS Toán, CS Văn...)
  nickname: string;
  fullName?: string;
  isMe?: boolean;
  className?: string;
  rotate180?: boolean; // Quay 180 độ tại chỗ cho Góc nhìn xuống
}

export const StudentCardBox: React.FC<StudentCardBoxProps> = ({
  gender,
  isFemale,
  dieuHanh,
  to,
  doan,
  mon,
  nickname,
  fullName,
  isMe,
  className = '',
  rotate180 = false,
}) => {
  const checkFemale = isFemale ?? (gender === 'Nữ' || gender === 'Nu' || gender === 'nu');

  return (
    <div
      className={`relative bg-white border-2 rounded-2xl p-1.5 grid grid-cols-3 grid-rows-4 items-stretch text-center overflow-hidden min-h-[120px] h-[120px] min-w-[115px] max-w-[145px] flex-1 border-slate-950 hover:border-black print:border-2 print:border-black print:bg-white print:shadow-none print:p-2 ${
        rotate180 ? 'rotate-180' : ''
      } ${
        isMe
          ? 'ring-2 ring-indigo-300 bg-indigo-50/80'
          : ''
      } ${className}`}
    >
      {/* 1. CHỨC DANH ĐIỀU HÀNH: hàng 1 cột 1, canh lề trái và lề giữa theo chiều dọc */}
      <div className="row-start-1 col-start-1 flex items-center justify-start z-10">
        {dieuHanh && (
          <span
            className="font-black text-black pointer-events-none print:text-black truncate max-w-[45px] text-left"
            style={{ fontSize: '11pt' }}
            title={`Điều hành: ${dieuHanh}`}
          >
            {dieuHanh}
          </span>
        )}
      </div>

      {/* Hàng 1 Cột 2 (Trống) */}
      <div className="row-start-1 col-start-2" />

      {/* 2. CHỨC DANH ĐOÀN: hàng 1 cột 3, canh lề phải và lề giữa theo chiều dọc */}
      <div className="row-start-1 col-start-3 flex items-center justify-end z-10">
        {doan && (
          <span
            className="font-black text-black pointer-events-none print:text-black truncate max-w-[45px] text-right"
            style={{ fontSize: '11pt' }}
            title={`Đoàn: ${doan}`}
          >
            {doan}
          </span>
        )}
      </div>

      {/* 3. ICON GIỚI TÍNH: hàng 2 cột 2, canh lề giữa theo chiều dọc & ngang, đặt nền sau các chức danh */}
      <div className="row-start-2 col-start-2 flex items-center justify-center z-0">
        <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-300 flex items-center justify-center shrink-0 shadow-2xs print:bg-white print:border-black">
          {checkFemale ? (
            <IconNu className="w-9 h-9 text-rose-600 print:text-black" />
          ) : (
            <IconNam className="w-9 h-9 text-indigo-700 print:text-black" />
          )}
        </div>
      </div>

      {/* 4. CHỨC DANH TỔ: hàng 3 cột 1, canh lề trái và lề trên */}
      <div className="row-start-3 col-start-1 flex items-start justify-start z-10">
        {to && (
          <span
            className="font-black text-black print:text-black truncate max-w-[45px] text-left"
            style={{ fontSize: '11pt' }}
            title={`Tổ: ${to}`}
          >
            {to}
          </span>
        )}
      </div>

      {/* Hàng 3 Cột 2 (Trống) */}
      <div className="row-start-3 col-start-2" />

      {/* 5. CHỨC DANH BỘ MÔN: hàng 3 cột 3, canh lề phải và lề trên */}
      <div className="row-start-3 col-start-3 flex items-start justify-end z-10">
        {mon && (
          <span
            className="font-black text-black print:text-black truncate max-w-[45px] text-right"
            style={{ fontSize: '11pt' }}
            title={`BCS Môn: ${mon}`}
          >
            {mon}
          </span>
        )}
      </div>

      {/* 6. BIỆT DANH: hàng 4 cột 1 đến cột 3 (toàn bộ hàng 4) */}
      <div className="row-start-4 col-start-1 col-span-3 flex items-center justify-center z-10">
        <div 
          className="font-normal normal-case text-black print:text-black truncate px-1 text-center w-full" 
          style={{ fontSize: '14pt', lineHeight: '1.2' }}
          title={fullName ? `Họ tên: ${fullName}` : nickname}
        >
          {nickname}
        </div>
      </div>
    </div>
  );
};

interface LearningSeatingViewProps {
  currentStudentId?: string;
  onOpenDriveConnect?: () => void;
  currentRole?: UserRole | string;
}

export interface StudentCardData {
  id: string;
  code: string;
  name: string;
  nickname?: string;
  gender: 'Nam' | 'Nữ' | string;
  team: string; // "Tổ 1", "Tổ 2", "Tổ 3", "Tổ 4" or "" (chưa xếp)
  desk: number; // 1..6 or 0 (chưa xếp)
  seatCol: number; // 1..4 (vị trí ghế trong bàn)
  roles: string[];
  titles: string[];
}

export interface SeatingViolation {
  type: 'avoid_near' | 'fixed_seat' | 'study_pair';
  message: string;
  studentNames: string[];
}

export interface SoDoLopSaveData {
  headerInfo: {
    department: string;
    schoolName: string;
    className: string;
    academicYear: string;
    applyWeek: string;
    teacherName: string;
    teacherPhone: string;
  };
  seatsPerDesk: number;
  customDeskSeats: Record<string, number>;
  applyWeekNum: number;
  viewPerspective: 'up' | 'down';
  paperOrientation: 'landscape' | 'portrait';
  doorOnLeft: boolean;
  teamsConfig: { id: string; name: string; desks: number[]; rowLabel: string }[];
  students: StudentCardData[];
  rawStudentsText: string;
  seatingRules?: SeatingRulesConfig;
}

// Cấu hình 4 Tổ & Số Bàn liên tiếp (Đổi vị trí Tổ 2 và Tổ 3: Dãy 2 bàn 1-3 là Tổ 3)
export const DEFAULT_TEAMS_CONFIG = [
  { id: 'team_1', name: 'Tổ 1', desks: [1, 2, 3], rowLabel: 'Dãy 1 - Bàn 1 đến 3' },
  { id: 'team_3', name: 'Tổ 3', desks: [1, 2, 3], rowLabel: 'Dãy 2 - Bàn 1 đến 3' },
  { id: 'team_2', name: 'Tổ 2', desks: [4, 5, 6], rowLabel: 'Dãy 1 - Bàn 4 đến 6' },
  { id: 'team_4', name: 'Tổ 4', desks: [4, 5, 6], rowLabel: 'Dãy 2 - Bàn 4 đến 6' },
];

// Key badge mappings
const EXEC_TITLES = ['LT', 'PHT', 'TQ', 'CĐ', 'CD', 'PLĐ', 'VTM']; // Ban Điều Hành (Red/Yellow)
const DOAN_TITLES = ['BT', 'PBT', 'UV'];            // Công tác Đoàn (Dark Blue)
const TEAM_TITLES = ['TT', 'TP'];                   // Cán sự Tổ (Green)
const SUBJECT_TITLES = ['TOÁN', 'LÝ', 'HÓA', 'SINH', 'TIN', 'ANH', 'VĂN', 'SỬ', 'ĐỊA', 'KTPL', 'TOAN', 'LY', 'HOA']; // Cán sự Bộ Môn (Orange/Purple)

// Helper lấy tọa độ ma trận lớp học (Row, Col) để tính 8 hướng kề cận
export const getSeatGridCoords = (row: number, desk: number, seatCol: number) => {
  const r = desk; // Hàng 1..6
  const c = row === 1 ? seatCol : 10 + seatCol; // Dãy 1 (1..4), Dãy 2 (11..14)
  return { r, c };
};

// Kiểm tra xem 2 ghế có thuộc 1 trong 8 hướng kề cận (Đông, Tây, Nam, Bắc, ĐB, ĐN, TB, TN)
export const is8DirectionNeighbor = (
  p1: { row: number; desk: number; seatCol: number },
  p2: { row: number; desk: number; seatCol: number }
): boolean => {
  const g1 = getSeatGridCoords(p1.row, p1.desk, p1.seatCol);
  const g2 = getSeatGridCoords(p2.row, p2.desk, p2.seatCol);
  return Math.abs(g1.r - g2.r) <= 1 && Math.abs(g1.c - g2.c) <= 1 && !(g1.r === g2.r && g1.c === g2.c);
};

// Đọc lịch sử các sơ đồ lớp đã lưu của lớp hiện tại để đếm số lần 2 học sinh đã từng ngồi cạnh nhau (8 hướng)
export const getHistoricalPairNeighborMap = (classId: string): Map<string, number> => {
  const map = new Map<string, number>();
  try {
    const raw = localStorage.getItem(`lopu_seating_history_${classId}`);
    if (!raw) return map;
    const historyList = JSON.parse(raw);
    if (!Array.isArray(historyList)) return map;

    for (const snap of historyList) {
      if (!snap.positions || typeof snap.positions !== 'object') continue;
      const entries = Object.entries(snap.positions) as [string, { row: number; desk: number; seatCol: number }][];
      for (let i = 0; i < entries.length; i++) {
        for (let j = i + 1; j < entries.length; j++) {
          const [idA, posA] = entries[i];
          const [idB, posB] = entries[j];
          if (posA && posB && posA.desk > 0 && posB.desk > 0) {
            if (is8DirectionNeighbor(posA, posB)) {
              const pairKey = idA < idB ? `${idA}_${idB}` : `${idB}_${idA}`;
              map.set(pairKey, (map.get(pairKey) || 0) + 1);
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('Lỗi đọc lịch sử sơ đồ lớp:', err);
  }
  return map;
};

// Lưu snapshot sơ đồ lớp hiện tại vào lịch sử
export const recordCurrentSeatingToHistory = (classId: string, studentsList: StudentCardData[], classNameStr: string) => {
  try {
    const raw = localStorage.getItem(`lopu_seating_history_${classId}`);
    let historyList: any[] = [];
    if (raw) {
      try { historyList = JSON.parse(raw); } catch { historyList = []; }
    }
    const positions: Record<string, { row: number; desk: number; seatCol: number; team: string }> = {};
    studentsList.forEach(s => {
      if (s.desk > 0) {
        const teamLower = (s.team || '').toLowerCase();
        const row = (teamLower.includes('tổ 3') || teamLower.includes('tổ 4') || teamLower.includes('to 3') || teamLower.includes('to 4')) ? 2 : 1;
        positions[s.id] = { row, desk: s.desk, seatCol: s.seatCol, team: s.team };
      }
    });

    const newSnap = {
      id: `snap_${Date.now()}`,
      timestamp: Date.now(),
      dateStr: new Date().toLocaleString('vi-VN'),
      className: classNameStr,
      positions,
    };

    historyList.unshift(newSnap);
    if (historyList.length > 50) historyList = historyList.slice(0, 50);

    localStorage.setItem(`lopu_seating_history_${classId}`, JSON.stringify(historyList));
  } catch (e) {
    console.error('Lỗi ghi lịch sử sơ đồ lớp:', e);
  }
};

export const SoDoLopView: React.FC<LearningSeatingViewProps> = ({
  currentStudentId = 'hs_2',
  currentRole,
}) => {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('class_10a1');
  const [loading, setLoading] = useState<boolean>(true);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Raw input string parser (Đã xóa sạch dữ liệu demo)
  const [rawStudentsText, setRawStudentsText] = useState<string>('');

  const [students, setStudents] = useState<StudentCardData[]>([]);
  const [draggedStudentId, setDraggedStudentId] = useState<string | null>(null);

  // Cấu hình số ghế chung trên mỗi bàn (Mặc định 3 ghế 1 bàn)
  const [seatsPerDesk, setSeatsPerDesk] = useState<number>(3);
  // Cấu hình riêng số ghế cho TỪNG BÀN (Key: "TênTổ_MãBàn" -> số ghế)
  const [customDeskSeats, setCustomDeskSeats] = useState<Record<string, number>>({});

  // Form state cho Thêm vị trí cố định (Đồng bộ số ghế theo bàn và dãy thực tế)
  const [fixedFormDesk, setFixedFormDesk] = useState<number>(1);
  const [fixedFormRow, setFixedFormRow] = useState<number>(1);
  const [fixedFormCol, setFixedFormCol] = useState<number>(1);
  const [fixedFormStudent, setFixedFormStudent] = useState<string>('');
  const [newAvoidGroupMembers, setNewAvoidGroupMembers] = useState<string[]>([]);

  // Cài đặt điều kiện xếp chỗ của Giáo viên
  const [seatingRules, setSeatingRules] = useState<SeatingRulesConfig>(() => getClassSeatingRules('class_10a1'));
  const [showRulesModal, setShowRulesModal] = useState<boolean>(false);
  const [showTeamLockModalBeforeAssign, setShowTeamLockModalBeforeAssign] = useState<boolean>(false);
  const [activeViolations, setActiveViolations] = useState<SeatingViolation[]>([]);
  const [showViolationWarnings, setShowViolationWarnings] = useState<boolean>(
    () => localStorage.getItem('lopu_show_violation_warnings') !== 'false'
  );

  const handleToggleShowViolationWarnings = (checked: boolean) => {
    setShowViolationWarnings(checked);
    localStorage.setItem('lopu_show_violation_warnings', String(checked));
  };

  // Kiểm tra quyền giáo viên
  const resolvedRole = currentRole || localStorage.getItem('lopu_current_role') || (localStorage.getItem('lopu_auth_user') ? JSON.parse(localStorage.getItem('lopu_auth_user') || '{}').role : 'teacher');
  const isTeacher = resolvedRole === 'teacher' || resolvedRole === 'admin' || resolvedRole === 'superadmin' || resolvedRole === 'giao_vien' || resolvedRole === 'gv' || resolvedRole === 'manager';

  // Áp dụng từ tuần k (k thay đổi được)
  const [applyWeekNum, setApplyWeekNum] = useState<number>(1);
  // Trạng thái đang tải lên Drive
  const [isUploadingDrive, setIsUploadingDrive] = useState<boolean>(false);

  // State và hàm hỗ trợ cho Custom Confirm Modal
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel?: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const showConfirm = (title: string, message: string, onConfirm: () => void, onCancel?: () => void) => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      },
      onCancel: () => {
        if (onCancel) onCancel();
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Trạng thái đang xuất file PNG (để ẩn sạch các nút điều khiển, nhãn bàn, empty placeholder)
  const [isExportingPNG, setIsExportingPNG] = useState<boolean>(false);

  // States cho Google Drive files
  const [driveFilesModalOpen, setDriveFilesModalOpen] = useState<boolean>(false);
  const [isLoadingDriveFiles, setIsLoadingDriveFiles] = useState<boolean>(false);
  const [driveFiles, setDriveFiles] = useState<DriveStoredFile[]>([]);

  // Góc nhìn Sơ đồ lớp: 'up' = Góc nhìn lên (Từ phía HS lên bảng), 'down' = Góc nhìn xuống (Từ Bàn Giáo Viên)
  const [viewPerspective, setViewPerspective] = useState<'up' | 'down'>('up');
  // Khổ giấy A4: 'landscape' = A4 Ngang (Đề xuất), 'portrait' = A4 Dọc
  const [paperOrientation, setPaperOrientation] = useState<'landscape' | 'portrait'>('landscape');
  // Vị trí Cửa ra vào: true = bên trái (mặc định), false = bên phải (đổi vị trí với Bàn GV)
  const [doorOnLeft, setDoorOnLeft] = useState<boolean>(true);

  // Tính tên năm học tự động (Bắt đầu từ tháng 8 đến hết tháng 5 năm sau)
  const getDynamicAcademicYear = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // 1 - 12
    if (month >= 8) {
      return `${year} - ${year + 1}`;
    } else {
      return `${year - 1} - ${year}`;
    }
  };

  // Danh sách các Tổ (Cho phép giáo viên đổi tên Tổ hoặc chọn từ phân tổ lớp)
  const [teamsConfig, setTeamsConfig] = useState(DEFAULT_TEAMS_CONFIG);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [editingTeamName, setEditingTeamName] = useState<string>('');

  // Lấy số lượng ghế thực tế cho 1 bàn cụ thể trên Dãy 1 hoặc Dãy 2 (Đồng bộ số ghế tùy chỉnh)
  const getDeskSeatCount = (deskNum: number, rowNum: number): number => {
    const targetTeam = teamsConfig.find(tc => {
      const isRow = rowNum === 1
        ? (tc.rowLabel?.includes('Dãy 1') || tc.id === 'team_1' || tc.id === 'team_2')
        : (tc.rowLabel?.includes('Dãy 2') || tc.id === 'team_3' || tc.id === 'team_4');
      return isRow && tc.desks?.includes(deskNum);
    });

    if (targetTeam) {
      const key = `${targetTeam.name}_${deskNum}`;
      if (customDeskSeats[key] !== undefined) {
        return customDeskSeats[key];
      }
      const altKey = `${targetTeam.id}_${deskNum}`;
      if (customDeskSeats[altKey] !== undefined) {
        return customDeskSeats[altKey];
      }
    }
    const directKey1 = `Dãy ${rowNum}_Bàn ${deskNum}`;
    if (customDeskSeats[directKey1] !== undefined) return customDeskSeats[directKey1];

    return seatsPerDesk;
  };

  // Trạng thái ghế đang được chọn để mở Bàn Chọn Nổi (Floating Picker)
  const [selectedSeat, setSelectedSeat] = useState<{
    team: string;
    desk: number;
    seatCol: number;
  } | null>(null);

  const [isPickerOpen, setIsPickerOpen] = useState<boolean>(false);
  const [pickerSearch, setPickerSearch] = useState<string>('');
  const [pickerStatusFilter, setPickerStatusFilter] = useState<'unassigned' | 'all' | 'assigned'>('unassigned');
  const [pickerTeamFilter, setPickerTeamFilter] = useState<string>('all');
  const [isAssigningSeating, setIsAssigningSeating] = useState<boolean>(false);

  // Config Header (Làm sạch 100% dữ liệu demo)
  const [headerInfo, setHeaderInfo] = useState({
    department: 'Sở GD&ĐT',
    schoolName: '',
    className: '',
    academicYear: getDynamicAcademicYear(),
    applyWeek: '',
    teacherName: 'Đỗ Tấn Bảo',
    teacherPhone: '',
  });

  useEffect(() => {
    async function load() {
      setLoading(false);
      const clsList = await getClasses();
      setClasses(clsList);
      if (clsList.length > 0) {
        setSelectedClassId(clsList[0].id);
      }
      if (rawStudentsText.trim()) {
        parseRawTextToStudents(rawStudentsText);
      } else {
        setStudents([]);
      }
    }
    load();
  }, [seatsPerDesk]);

  // Danh sách các Tổ hiện có từ phân tổ dữ liệu học sinh
  const classDataTeams = Array.from(
    new Set(students.map(s => s.team).filter(t => t && t.trim().length > 0))
  );

  // Đồng bộ toàn bộ vị trí học sinh theo đúng tên Tổ tương ứng trên dữ liệu
  const handleSyncAllTeamsWithClassData = (customTeamsConfig?: typeof teamsConfig) => {
    const activeConfig = customTeamsConfig || teamsConfig;
    setStudents(prev => {
      const copy = [...prev];

      activeConfig.forEach(tc => {
        const teamName = tc.name;
        // Lấy thành viên thuộc Tổ này trong dữ liệu học sinh
        const teamMembers = copy.filter(
          s => s.team && s.team.trim().toLowerCase() === teamName.trim().toLowerCase()
        );

        teamMembers.forEach((st, idx) => {
          const deskIdx = Math.floor(idx / seatsPerDesk) % tc.desks.length;
          st.desk = tc.desks[deskIdx];
          st.seatCol = (idx % seatsPerDesk) + 1;
        });
      });

      return copy;
    });

    setSyncMessage('Đã đồng bộ vị trí thành viên theo phân tổ của lớp!');
    setTimeout(() => setSyncMessage(null), 3000);
  };

  // Đổi tên Tổ & Đồng bộ vị trí các thành viên tổ với dữ liệu
  const handleSaveTeamNameAndSync = (teamId: string, oldName: string, newNameInput: string) => {
    const newName = newNameInput.trim();
    if (!newName) {
      setEditingTeamId(null);
      return;
    }

    const newTeamsConfig = teamsConfig.map(t => (t.id === teamId ? { ...t, name: newName } : t));
    setTeamsConfig(newTeamsConfig);

    setStudents(prev => {
      const copy = [...prev];
      const hasDataMembers = copy.some(
        s => s.team && s.team.trim().toLowerCase() === newName.toLowerCase()
      );

      if (hasDataMembers) {
        // Nếu tên chọn/nhập thuộc phân tổ dữ liệu -> Tự động xếp các thành viên đó vào vị trí bàn của Tổ này
        const tc = newTeamsConfig.find(t => t.id === teamId)!;
        const teamMembers = copy.filter(
          s => s.team && s.team.trim().toLowerCase() === newName.toLowerCase()
        );

        teamMembers.forEach((st, idx) => {
          const deskIdx = Math.floor(idx / seatsPerDesk) % tc.desks.length;
          st.desk = tc.desks[deskIdx];
          st.seatCol = (idx % seatsPerDesk) + 1;
        });
      } else {
        // Tên nhập ngoài -> Đổi tên trường team cho các học sinh ở khu vực cũ
        copy.forEach(s => {
          if (s.team && s.team.trim().toLowerCase() === oldName.toLowerCase()) {
            s.team = newName;
          }
        });
      }

      return copy;
    });

    setEditingTeamId(null);
    setSyncMessage(`Đã cập nhật "${newName}" & đồng bộ danh sách thành viên!`);
    setTimeout(() => setSyncMessage(null), 3000);
  };

  // Helper trả về class Tailwind grid cho số ghế
  const getDeskGridColsClass = (seats: number) => {
    switch (seats) {
      case 2: return 'grid-cols-3'; // Bàn 2 người dùng 3 cột để đẩy ra 2 đầu bàn
      case 3: return 'grid-cols-3';
      case 5: return 'grid-cols-5';
      case 6: return 'grid-cols-6';
      case 4:
      default: return 'grid-cols-4';
    }
  };

  // Parse chuỗi cấu trúc [Họ tên; Biệt danh; Giới tính; Tổ/nhóm; Vai trò; Chức danh]
  const parseRawTextToStudents = (text: string) => {
    if (!text.trim()) {
      setStudents([]);
      return;
    }
    const lines = text.split('\n').filter(l => l.trim().length > 0);
    const parsed: StudentCardData[] = [];

    // Tạo bản đồ lưu trữ chỗ ngồi hiện tại của học sinh theo ID và theo Tên để giữ nguyên vị trí khi gõ chữ realtime
    const currentStudentsMap = new Map<string, { team: string; desk: number; seatCol: number }>();
    students.forEach(s => {
      currentStudentsMap.set(s.id, { team: s.team, desk: s.desk, seatCol: s.seatCol });
      // Thêm ánh xạ phụ theo Tên viết thường để dự phòng nếu dòng chữ có sự dịch chuyển dòng
      currentStudentsMap.set(`name_${s.name.trim().toLowerCase()}`, { team: s.team, desk: s.desk, seatCol: s.seatCol });
    });

    lines.forEach((line, idx) => {
      const parts = line.split(';').map(p => p.trim());
      const name = parts[0] || `Học sinh ${idx + 1}`;
      const nickname = parts[1] || '';
      const gender = parts[2] || (idx % 2 === 0 ? 'Nam' : 'Nữ');
      const teamRaw = parts[3] || '';
      
      let roles: string[] = [];
      let titles: string[] = [];

      // Parse the new 4-field comma-separated roles format: Chức danh điều hành, chức danh đoàn, chức danh tổ, chức danh bộ môn
      if (parts.length >= 5) {
        const subParts = parts[4].split(',').map(s => s.trim());
        const execTitle = subParts[0] || '';
        const unionTitle = subParts[1] || '';
        const teamTitle = subParts[2] || '';
        const subjectTitle = subParts[3] || '';

        if (execTitle) {
          titles.push(execTitle);
          roles.push(execTitle);
        }
        if (unionTitle) {
          titles.push(unionTitle);
          roles.push(unionTitle);
        }
        if (teamTitle) titles.push(teamTitle);
        if (subjectTitle) titles.push(subjectTitle);
      } else {
        // Fallback for older format if parts[5] exists
        const rolesRaw = parts[4] || '';
        const titlesRaw = parts[5] || '';
        roles = rolesRaw.split(/[.,]/).map(r => r.trim()).filter(Boolean);
        titles = titlesRaw.split(/[.,]/).map(t => t.trim()).filter(Boolean);
      }

      let team = teamRaw;
      let desk = 0;
      let seatCol = 0;

      // Tìm vị trí ngồi cũ dựa trên ID dòng chữ hs_${idx+1} hoặc tên học sinh
      const targetId = `hs_${idx + 1}`;
      const oldSeatingById = currentStudentsMap.get(targetId);
      const oldSeatingByName = currentStudentsMap.get(`name_${name.trim().toLowerCase()}`);
      const oldSeating = oldSeatingById || oldSeatingByName;

      if (oldSeating && oldSeating.team.toLowerCase() === team.toLowerCase()) {
        // Nếu tổ giữ nguyên, bảo toàn vị trí bàn, ghế ngồi cũ tuyệt đối
        desk = oldSeating.desk;
        seatCol = oldSeating.seatCol;
      } else if (team) {
        const teamConf = teamsConfig.find(t => t.name.toLowerCase() === team.toLowerCase());
        const existingInTeam = parsed.filter(s => s.team.toLowerCase() === team.toLowerCase()).length;

        if (teamConf) {
          const deskIdx = Math.floor(existingInTeam / seatsPerDesk) % teamConf.desks.length;
          desk = teamConf.desks[deskIdx];
          seatCol = (existingInTeam % seatsPerDesk) + 1;
        } else {
          desk = (Math.floor(existingInTeam / seatsPerDesk) % 3) + 1;
          seatCol = (existingInTeam % seatsPerDesk) + 1;
        }
      }

      parsed.push({
        id: targetId,
        code: `HS10A1_${(idx + 1).toString().padStart(2, '0')}`,
        name,
        nickname: nickname || undefined,
        gender,
        team,
        desk,
        seatCol,
        roles: roles.length > 0 ? roles : ['student'],
        titles: titles.length > 0 ? titles : ['Thành viên'],
      });
    });

    setStudents(parsed);
  };

  const handleImportText = () => {
    parseRawTextToStudents(rawStudentsText);
    setSyncMessage('Đã nạp và phân bổ dữ liệu học sinh thành công!');
    setTimeout(() => setSyncMessage(null), 3000);
  };

  // Effect đồng bộ Seating Rules khi đổi lớp
  useEffect(() => {
    setSeatingRules(getClassSeatingRules(selectedClassId));
  }, [selectedClassId]);

  // Hàm chuyển đổi vị trí học sinh sang tọa độ (x, y, row, desk, seatCol)
  const getStudentCoordinates = (s: StudentCardData) => {
    if (!s.team || s.desk <= 0) return null;
    const teamLower = s.team.toLowerCase();
    let row = 1;
    let x = s.seatCol;
    let y = s.desk;

    if (teamLower.includes('tổ 1') || teamLower.includes('to 1')) {
      row = 1;
      x = s.seatCol;
      y = s.desk;
    } else if (teamLower.includes('tổ 2') || teamLower.includes('to 2')) {
      row = 1;
      x = s.seatCol;
      y = s.desk;
    } else if (teamLower.includes('tổ 3') || teamLower.includes('to 3')) {
      row = 2;
      x = s.seatCol + 4; // Dãy 2 cách Dãy 1
      y = s.desk;
    } else if (teamLower.includes('tổ 4') || teamLower.includes('to 4')) {
      row = 2;
      x = s.seatCol + 4;
      y = s.desk;
    }

    return { row, x, y, desk: s.desk, seatCol: s.seatCol };
  };

  // Helper so sánh khớp tên hoặc biệt danh học sinh (không phân biệt hoa thường)
  const isStudentMatch = (ruleNick: string, targetNick: string, studentList: StudentCardData[]): boolean => {
    if (!ruleNick || !targetNick) return false;
    const rLower = ruleNick.trim().toLowerCase();
    const tLower = targetNick.trim().toLowerCase();
    if (rLower === tLower) return true;

    const stTarget = studentList.find(s => 
      s.id === targetNick ||
      (s.nickname && s.nickname.toLowerCase() === tLower) ||
      s.name.toLowerCase() === tLower
    );
    if (stTarget) {
      if ((stTarget.nickname && stTarget.nickname.toLowerCase() === rLower) || stTarget.name.toLowerCase() === rLower) {
        return true;
      }
    }

    const stRule = studentList.find(s => 
      (s.nickname && s.nickname.toLowerCase() === rLower) ||
      s.name.toLowerCase() === rLower
    );
    if (stRule) {
      if ((stRule.nickname && stRule.nickname.toLowerCase() === tLower) || stRule.name.toLowerCase() === tLower) {
        return true;
      }
    }

    return false;
  };

  // Helper thêm hoặc bỏ chọn 1 vị trí ghế cố định (Desk, Row, SeatCol) cho học sinh được chỉ định (nick)
  const toggleFixedSeatPosition = (nick: string, deskNum: number, rowNum: number, seatColNum: number) => {
    if (!nick) return;

    setSeatingRules(prev => {
      const currentRules = prev.fixedSeatRules || [];
      const ruleIdx = currentRules.findIndex(r => isStudentMatch(r.studentNickname, nick, students));

      let updatedRules: StudentFixedSeatRule[];

      if (ruleIdx >= 0) {
        const targetRule = currentRules[ruleIdx];
        const posIdx = targetRule.positions.findIndex(p => p.desk === deskNum && p.row === rowNum && p.seatCol === seatColNum);

        let newPositions: FixedSeatPosition[];
        if (posIdx >= 0) {
          // Đã có vị trí này -> bỏ chọn ghế
          newPositions = targetRule.positions.filter((_, i) => i !== posIdx);
        } else {
          // Chưa có vị trí này -> thêm ghế bổ sung
          newPositions = [
            ...targetRule.positions,
            {
              desk: deskNum,
              row: rowNum,
              seatCol: seatColNum,
              label: formatFixedPosition(deskNum, rowNum, seatColNum),
            },
          ];
        }

        if (newPositions.length === 0) {
          // Nếu xóa hết ghế -> xóa nguyên quy tắc học sinh này
          updatedRules = currentRules.filter((_, i) => i !== ruleIdx);
        } else {
          updatedRules = currentRules.map((r, i) =>
            i === ruleIdx
              ? {
                  ...r,
                  positions: newPositions,
                  rawText: newPositions.map(p => p.label).join('; '),
                }
              : r
          );
        }
      } else {
        // Chưa có quy tắc cho học sinh này -> tạo quy tắc mới
        const newPos: FixedSeatPosition = {
          desk: deskNum,
          row: rowNum,
          seatCol: seatColNum,
          label: formatFixedPosition(deskNum, rowNum, seatColNum),
        };
        const newRule: StudentFixedSeatRule = {
          studentNickname: nick,
          positions: [newPos],
          rawText: newPos.label,
        };
        updatedRules = [...currentRules, newRule];
      }

      return { ...prev, fixedSeatRules: updatedRules };
    });
  };

  // Hàm chọn/bỏ chọn nhanh các vị trí ghế cho học sinh đang chọn (fixedFormStudent)
  const handleQuickSelectPositions = (
    actionType: 'desk' | 'row' | 'team' | 'clear',
    params?: { desk?: number; row?: number; teamId?: string }
  ) => {
    const nick = fixedFormStudent || (students[0]?.nickname || students[0]?.name || '');
    if (!nick) return;

    if (actionType === 'clear') {
      setSeatingRules(prev => ({
        ...prev,
        fixedSeatRules: (prev.fixedSeatRules || []).filter(
          r => !isStudentMatch(r.studentNickname, nick, students)
        ),
      }));
      return;
    }

    const targetSeats: { desk: number; row: number; seatCol: number }[] = [];

    if (actionType === 'desk' && params?.desk !== undefined && params?.row !== undefined) {
      const cap = getDeskSeatCount(params.desk, params.row);
      for (let g = 1; g <= cap; g++) {
        targetSeats.push({ desk: params.desk, row: params.row, seatCol: g });
      }
    } else if (actionType === 'row' && params?.row !== undefined) {
      for (let d = 1; d <= 6; d++) {
        const cap = getDeskSeatCount(d, params.row);
        for (let g = 1; g <= cap; g++) {
          targetSeats.push({ desk: d, row: params.row, seatCol: g });
        }
      }
    } else if (actionType === 'team' && params?.teamId !== undefined) {
      let r = 1;
      let desks = [1, 2, 3];
      if (params.teamId === 'team_1' || params.teamId === 'Tổ 1') {
        r = 1; desks = [1, 2, 3];
      } else if (params.teamId === 'team_2' || params.teamId === 'Tổ 2') {
        r = 1; desks = [4, 5, 6];
      } else if (params.teamId === 'team_3' || params.teamId === 'Tổ 3') {
        r = 2; desks = [1, 2, 3];
      } else if (params.teamId === 'team_4' || params.teamId === 'Tổ 4') {
        r = 2; desks = [4, 5, 6];
      }
      for (const d of desks) {
        const cap = getDeskSeatCount(d, r);
        for (let g = 1; g <= cap; g++) {
          targetSeats.push({ desk: d, row: r, seatCol: g });
        }
      }
    }

    if (targetSeats.length === 0) return;

    setSeatingRules(prev => {
      const currentRules = prev.fixedSeatRules || [];
      const ruleIdx = currentRules.findIndex(
        r => isStudentMatch(r.studentNickname, nick, students)
      );

      let currentPos: FixedSeatPosition[] = [];
      if (ruleIdx >= 0) {
        currentPos = [...currentRules[ruleIdx].positions];
      }

      // Dù đã chọn hay chưa, luôn cộng dồn các vị trí vào danh sách cố định của học sinh
      for (const ts of targetSeats) {
        if (!currentPos.some(p => p.desk === ts.desk && p.row === ts.row && p.seatCol === ts.seatCol)) {
          currentPos.push({
            ...ts,
            label: formatFixedPosition(ts.desk, ts.row, ts.seatCol),
          });
        }
      }

      let updatedRules: StudentFixedSeatRule[];
      if (ruleIdx >= 0) {
        updatedRules = currentRules.map((r, i) =>
          i === ruleIdx
            ? {
                ...r,
                positions: currentPos,
                rawText: currentPos.map(p => p.label).join('; '),
              }
            : r
        );
      } else {
        updatedRules = [
          ...currentRules,
          {
            studentNickname: nick,
            positions: currentPos,
            rawText: currentPos.map(p => p.label).join('; '),
          },
        ];
      }

      return { ...prev, fixedSeatRules: updatedRules };
    });
  };

  // Hàm kiểm tra vi phạm điều kiện xếp chỗ của giáo viên
  const validateSeatingViolations = (studentList: StudentCardData[], rules: SeatingRulesConfig): SeatingViolation[] => {
    const violations: SeatingViolation[] = [];

    // 1. Ràng buộc: Học sinh trong cùng nhóm không được ngồi gần nhau
    if (rules.avoidNearStudents.trim()) {
      const avoidGroups = parseAvoidNearGroups(rules.avoidNearStudents);

      avoidGroups.forEach((groupNames, groupIdx) => {
        const avoidNames = groupNames.map(n => n.trim().toLowerCase()).filter(Boolean);
        if (avoidNames.length < 2) return;

        const seatedAvoidStudents: { s: StudentCardData; coords: { row: number; desk: number; seatCol: number; x: number; y: number } }[] = [];
        for (const st of studentList) {
          const nick = (st.nickname || '').toLowerCase();
          const fullName = st.name.toLowerCase();
          if (avoidNames.some(name => name === nick || name === fullName || fullName.includes(name))) {
            const coords = getStudentCoordinates(st);
            if (coords) {
              seatedAvoidStudents.push({ s: st, coords });
            }
          }
        }

        for (let i = 0; i < seatedAvoidStudents.length; i++) {
          for (let j = i + 1; j < seatedAvoidStudents.length; j++) {
            const st1 = seatedAvoidStudents[i];
            const st2 = seatedAvoidStudents[j];

            const dx = Math.abs(st1.coords.x - st2.coords.x);
            const dy = Math.abs(st1.coords.y - st2.coords.y);
            const isSameRow = st1.coords.row === st2.coords.row;

            if (isAvoidNearViolation(st1.coords, st2.coords)) {
              const groupLabel = avoidGroups.length > 1 ? ` (Nhóm ${groupIdx + 1})` : '';
              violations.push({
                type: 'avoid_near',
                message: `Học sinh "${st1.s.nickname || st1.s.name}" và "${st2.s.nickname || st2.s.name}"${groupLabel} không được ngồi gần nhau! (Ngồi chung bàn hoặc bàn liền trên/dưới tại Bàn ${st1.s.desk}-Dãy ${st1.coords.row} và Bàn ${st2.s.desk}-Dãy ${st2.coords.row})`,
                studentNames: [st1.s.nickname || st1.s.name, st2.s.nickname || st2.s.name],
              });
            }
          }
        }
      });
    }

    // 2. Ràng buộc: Vị trí bàn cố định
    if (rules.fixedSeatRules && rules.fixedSeatRules.length > 0) {
      for (const rule of rules.fixedSeatRules) {
        const targetNick = rule.studentNickname.trim().toLowerCase();
        const targetStudent = studentList.find(
          s => (s.nickname || '').toLowerCase() === targetNick || s.name.toLowerCase() === targetNick || s.name.toLowerCase().includes(targetNick)
        );

        if (targetStudent && targetStudent.desk > 0) {
          const coords = getStudentCoordinates(targetStudent);
          if (coords) {
            const isMatch = rule.positions.some(
              p => p.desk === coords.desk && p.row === coords.row && p.seatCol === coords.seatCol
            );

            if (!isMatch) {
              const allowedStr = rule.positions.map(p => p.label).join('; ') || rule.rawText;
              violations.push({
                type: 'fixed_seat',
                message: `Học sinh "${rule.studentNickname}" có vị trí cố định (${allowedStr}), hiện đang ngồi sai vị trí tại Bàn ${coords.desk}-Dãy ${coords.row}-G${coords.seatCol}!`,
                studentNames: [rule.studentNickname],
              });
            }
          }
        }
      }
    }

    // 3. Ràng buộc: Cặp đôi cùng tiến
    if (rules.studyPairs.trim()) {
      const pairTokens = rules.studyPairs.split(/[;,]+/).map(p => p.trim()).filter(Boolean);
      for (const pToken of pairTokens) {
        const parts = pToken.split(/[-–—]/).map(x => x.trim().toLowerCase());
        if (parts.length === 2) {
          const [n1, n2] = parts;
          const st1 = studentList.find(s => (s.nickname || '').toLowerCase() === n1 || s.name.toLowerCase() === n1 || s.name.toLowerCase().includes(n1));
          const st2 = studentList.find(s => (s.nickname || '').toLowerCase() === n2 || s.name.toLowerCase() === n2 || s.name.toLowerCase().includes(n2));

          if (st1 && st2 && st1.desk > 0 && st2.desk > 0) {
            const c1 = getStudentCoordinates(st1);
            const c2 = getStudentCoordinates(st2);
            if (c1 && c2 && (c1.row !== c2.row || c1.desk !== c2.desk)) {
              violations.push({
                type: 'study_pair',
                message: `Cặp đôi cùng tiến "${st1.nickname || st1.name} - ${st2.nickname || st2.name}" hiện đang bị tách khác bàn (Bàn ${c1.desk}-Dãy ${c1.row} và Bàn ${c2.desk}-Dãy ${c2.row})!`,
                studentNames: [st1.nickname || st1.name, st2.nickname || st2.name],
              });
            }
          }
        }
      }
    }

    return violations;
  };

  // Tự động kiểm tra vi phạm theo thời gian thực
  useEffect(() => {
    const v = validateSeatingViolations(students, seatingRules);
    setActiveViolations(v);
  }, [students, seatingRules]);

  // Phân tự động thông minh theo 5 điều kiện cài đặt
  // Phân tự động thông minh theo TẤT CẢ các điều kiện cài đặt (CSP Backtracking Solver hỗ trợ vô tận điều kiện)
  const handleAutoAssignWithRules = () => {
    // 1. Lưu sơ đồ hiện tại vào lịch sử trước khi xếp phương án mới
    recordCurrentSeatingToHistory(selectedClassId, students, headerInfo.className);

    // Xóa vị trí bàn cũ của học sinh trong bản sao làm việc
    const studentListCopy = students.map(s => ({ ...s, team: s.team || '', desk: 0, seatCol: 0 }));

    // Helper xáo trộn mảng ngẫu nhiên (Fisher-Yates) giúp mỗi lần kích nút "Xếp chỗ ngồi" tạo 1 phương án mới
    const shuffleArray = <T,>(arr: T[]): T[] => {
      const res = [...arr];
      for (let i = res.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [res[i], res[j]] = [res[j], res[i]];
      }
      return res;
    };

    // Helper kiểm tra học sinh là Tổ trưởng (TT) hoặc Tổ phó (TP)
    const isLeaderOrSub = (s: StudentCardData) => {
      const allRoles = [...(s.roles || []), ...(s.titles || [])].map(r => r.trim().toUpperCase());
      return allRoles.includes('TT') || allRoles.includes('TP');
    };

    // Tất cả slot ghế trống trong phòng học
    interface SeatSlot {
      row: number; // 1 hoặc 2
      desk: number; // 1..6
      seatCol: number; // 1..cap
      teamName: string;
      x: number;
      y: number;
    }

    const allSlots: SeatSlot[] = [];
    for (let r = 1; r <= 2; r++) {
      for (let d = 1; d <= 6; d++) {
        let teamName = 'Tổ 1';
        if (r === 1) {
          teamName = d <= 3 ? 'Tổ 1' : 'Tổ 2';
        } else {
          teamName = d <= 3 ? 'Tổ 3' : 'Tổ 4';
        }
        const cap = getDeskSeatCount(d, r);
        for (let g = 1; g <= cap; g++) {
          allSlots.push({
            row: r,
            desk: d,
            seatCol: g,
            teamName,
            x: r === 1 ? g : g + 4,
            y: d,
          });
        }
      }
    }

    // Kiểm tra tổng số học sinh so với tổng số ghế
    if (studentListCopy.length > allSlots.length) {
      showConfirm(
        '❌ KHÔNG THỂ XẾP CHỖ NGỒI',
        `Số lượng học sinh (${studentListCopy.length}) vượt quá tổng số ghế trống trong phòng học (${allSlots.length})! Vui lòng tăng số ghế/bàn hoặc giảm bớt số lượng học sinh.`,
        () => {},
        () => {}
      );
      return;
    }

    // Parse các quy tắc cài đặt
    const avoidGroups = parseAvoidNearGroups(seatingRules.avoidNearStudents);
    const lockedTeamsList = (seatingRules.lockedTeams || []).map(t => t.toLowerCase());

    // Xử lý Cặp đôi cùng tiến
    const pairTokens = seatingRules.studyPairs.split(/[;,]+/).map(p => p.trim()).filter(Boolean);
    const studyPairMap = new Map<string, string>(); // studentId -> partnerStudentId
    for (const pToken of pairTokens) {
      const parts = pToken.split(/[-–—]/).map(x => x.trim().toLowerCase());
      if (parts.length === 2) {
        const [n1, n2] = parts;
        const st1 = studentListCopy.find(s => isStudentMatch(n1, s.nickname || s.name, studentListCopy) || s.name.toLowerCase().includes(n1));
        const st2 = studentListCopy.find(s => isStudentMatch(n2, s.nickname || s.name, studentListCopy) || s.name.toLowerCase().includes(n2));
        if (st1 && st2 && st1.id !== st2.id) {
          studyPairMap.set(st1.id, st2.id);
          studyPairMap.set(st2.id, st1.id);
        }
      }
    }

    // Map Vị trí bàn cố định cho từng học sinh
    const studentFixedPositionsMap = new Map<string, FixedSeatPosition[]>();
    if (seatingRules.fixedSeatRules && seatingRules.fixedSeatRules.length > 0) {
      for (const rule of seatingRules.fixedSeatRules) {
        const targetNick = rule.studentNickname.trim();
        const st = studentListCopy.find(s => isStudentMatch(targetNick, s.nickname || s.name, studentListCopy) || s.name.toLowerCase().includes(targetNick.toLowerCase()));
        if (st && rule.positions && rule.positions.length > 0) {
          studentFixedPositionsMap.set(st.id, rule.positions);
        }
      }
    }

    // Đọc lịch sử 8 hướng để tối ưu đa dạng bạn ngồi cạnh nhau trong 3 năm học (~30 lần đổi)
    const historicalNeighborMap = getHistoricalPairNeighborMap(selectedClassId);

    // Tính thứ tự ưu tiên xếp học sinh (Most Constrained First)
    const getStudentConstraintPriority = (st: StudentCardData): number => {
      let score = 0;
      const fixedPos = studentFixedPositionsMap.get(st.id);
      if (fixedPos && fixedPos.length > 0) {
        score += 2000 - fixedPos.length * 20; // Càng ít vị trí cố định càng ưu tiên xếp trước
      }
      if (studyPairMap.has(st.id)) score += 1000;
      if (st.team && lockedTeamsList.includes(st.team.toLowerCase())) score += 500;
      if (isLeaderOrSub(st)) score += 300;
      const isInAvoidGroup = avoidGroups.some(g => g.some(n => isStudentMatch(n, st.nickname || st.name, studentListCopy) || st.name.toLowerCase().includes(n.toLowerCase())));
      if (isInAvoidGroup) score += 200;
      return score;
    };

    // Hàm kiểm tra 1 slot có thỏa mãn TẤT CẢ các điều kiện đối với 1 học sinh hay không (Strict Validator)
    const isValidAssignment = (
      st: StudentCardData,
      slot: SeatSlot,
      currentAssignment: Map<string, SeatSlot>,
      slotToStudentMap: Map<string, StudentCardData>
    ): boolean => {
      const slotKey = `${slot.row}_${slot.desk}_${slot.seatCol}`;
      if (slotToStudentMap.has(slotKey)) return false; // Ghế đã có người ngồi

      // 1. Kiểm tra Vị trí cố định (Rule 2)
      const fixedPositions = studentFixedPositionsMap.get(st.id);
      if (fixedPositions && fixedPositions.length > 0) {
        const isMatch = fixedPositions.some(p => p.desk === slot.desk && p.row === slot.row && p.seatCol === slot.seatCol);
        if (!isMatch) return false;
      }

      // 2. Kiểm tra Khóa tổ (Rule 5) hoặc Tổ trưởng/Tổ phó
      if (st.team) {
        const isTeamLocked = lockedTeamsList.includes(st.team.toLowerCase());
        const isLeader = isLeaderOrSub(st);
        if (isTeamLocked || isLeader) {
          if (slot.teamName.toLowerCase() !== st.team.toLowerCase()) {
            return false;
          }
        }
      }

      // 3. Kiểm tra Không gần nhau (Rule 1)
      if (avoidGroups.length > 0) {
        for (const group of avoidGroups) {
          const lowerGroup = group.map(n => n.trim().toLowerCase());
          const isInGroup = lowerGroup.some(n => isStudentMatch(n, st.nickname || st.name, studentListCopy) || st.name.toLowerCase().includes(n));
          if (!isInGroup) continue;

          // Duyệt qua tất cả học sinh đã xếp
          for (const [placedStId, placedSlot] of currentAssignment.entries()) {
            if (placedStId === st.id) continue;
            const placedSt = studentListCopy.find(s => s.id === placedStId);
            if (!placedSt) continue;

            const isOtherInGroup = lowerGroup.some(n => isStudentMatch(n, placedSt.nickname || placedSt.name, studentListCopy) || placedSt.name.toLowerCase().includes(n));
            if (isOtherInGroup) {
              const isNearDesk = isAvoidNearViolation(
                { row: slot.row, desk: slot.desk },
                { row: placedSlot.row, desk: placedSlot.desk }
              );
              const is8Dir = is8DirectionNeighbor(
                { row: slot.row, desk: slot.desk, seatCol: slot.seatCol },
                { row: placedSlot.row, desk: placedSlot.desk, seatCol: placedSlot.seatCol }
              );
              if (isNearDesk || is8Dir) {
                return false;
              }
            }
          }
        }
      }

      // 4. Kiểm tra Cặp đôi cùng tiến (Rule 3)
      const partnerId = studyPairMap.get(st.id);
      if (partnerId) {
        const partnerSlot = currentAssignment.get(partnerId);
        if (partnerSlot) {
          // Đối phương đã xếp -> bắt buộc slot này phải CÙNG BÀN và CẠNH NHAU (seatCol chênh 1)
          if (slot.row !== partnerSlot.row || slot.desk !== partnerSlot.desk || Math.abs(slot.seatCol - partnerSlot.seatCol) !== 1) {
            return false;
          }
        } else {
          // Đối phương chưa xếp -> bắt buộc slot này phải có ít nhất 1 ghế kề bên cùng bàn còn trống
          const hasAdjacentFreeSeat = allSlots.some(
            otherSl =>
              otherSl.row === slot.row &&
              otherSl.desk === slot.desk &&
              Math.abs(otherSl.seatCol - slot.seatCol) === 1 &&
              !slotToStudentMap.has(`${otherSl.row}_${otherSl.desk}_${otherSl.seatCol}`)
          );
          if (!hasAdjacentFreeSeat) {
            return false;
          }
        }
      }

      return true;
    };

    // Sắp xếp danh sách học sinh theo thứ tự ưu tiên ràng buộc
    const sortedStudents = [...studentListCopy].sort((a, b) => getStudentConstraintPriority(b) - getStudentConstraintPriority(a));

    // Thử nghiệm chạy tối đa MAX_RESTARTS vòng lặp CSP Backtracking
    let successfulPlan: { studentId: string; team: string; desk: number; seatCol: number }[] | null = null;
    let bestNeighborScore = Infinity;

    const MAX_RESTARTS = 300;
    const MAX_STEPS_PER_RESTART = 600;

    for (let restart = 0; restart < MAX_RESTARTS; restart++) {
      const currentAssignment = new Map<string, SeatSlot>();
      const slotToStudentMap = new Map<string, StudentCardData>();
      let stepCount = 0;

      // Hàm Backtrack chính
      const backtrack = (studentIdx: number): boolean => {
        if (studentIdx >= sortedStudents.length) {
          return true; // Đã xếp thành công tất cả học sinh!
        }

        stepCount++;
        if (stepCount > MAX_STEPS_PER_RESTART) {
          return false; // Quá giới hạn bước thử
        }

        const st = sortedStudents[studentIdx];

        // Lấy danh sách candidate slots cho học sinh st
        let candidateSlots = [...allSlots];

        // Nếu có vị trí cố định -> lọc các slot khớp
        const fixedPos = studentFixedPositionsMap.get(st.id);
        if (fixedPos && fixedPos.length > 0) {
          candidateSlots = candidateSlots.filter(sl => fixedPos.some(p => p.desk === sl.desk && p.row === sl.row && p.seatCol === sl.seatCol));
        }

        // Xáo trộn ngẫu nhiên các slot thỏa mãn để tạo sự đa dạng giữa mỗi lần bấm nút
        candidateSlots = shuffleArray(candidateSlots);

        for (const slot of candidateSlots) {
          if (isValidAssignment(st, slot, currentAssignment, slotToStudentMap)) {
            const slotKey = `${slot.row}_${slot.desk}_${slot.seatCol}`;
            currentAssignment.set(st.id, slot);
            slotToStudentMap.set(slotKey, st);

            if (backtrack(studentIdx + 1)) {
              return true;
            }

            // Backtrack nếu nhánh phía sau không tìm ra lời giải
            currentAssignment.delete(st.id);
            slotToStudentMap.delete(slotKey);
          }
        }

        return false;
      };

      if (backtrack(0)) {
        // Đã tìm được 1 phương án hợp lệ 100%!
        // Kiểm tra xem phương án này có vi phạm bất kỳ quy tắc nào trong validateSeatingViolations không
        const candidateStudents = studentListCopy.map(s => {
          const sl = currentAssignment.get(s.id)!;
          return {
            ...s,
            team: sl.teamName,
            desk: sl.desk,
            seatCol: sl.seatCol,
          };
        });

        const testViolations = validateSeatingViolations(candidateStudents, seatingRules);
        if (testViolations.length === 0) {
          // Tính điểm số trùng lặp bạn ngồi cạnh 8 hướng từ lịch sử 30 sơ đồ gần nhất
          let overlapScore = 0;
          currentAssignment.forEach((slA, stIdA) => {
            currentAssignment.forEach((slB, stIdB) => {
              if (stIdA < stIdB) {
                if (is8DirectionNeighbor({ row: slA.row, desk: slA.desk, seatCol: slA.seatCol }, { row: slB.row, desk: slB.desk, seatCol: slB.seatCol })) {
                  const pairKey = `${stIdA}_${stIdB}`;
                  overlapScore += (historicalNeighborMap.get(pairKey) || 0) * 10;
                }
              }
            });
          });

          if (overlapScore < bestNeighborScore) {
            bestNeighborScore = overlapScore;
            successfulPlan = candidateStudents.map(s => ({
              studentId: s.id,
              team: s.team,
              desk: s.desk,
              seatCol: s.seatCol,
            }));
          }

          if (bestNeighborScore === 0) break; // Đạt tối ưu tuyệt đối
        }
      }
    }

    // KIỂM TRA KẾT QUẢ CUỐI CÙNG
    if (!successfulPlan) {
      // ❌ KHÔNG THỂ XẾP ĐƯỢC -> TUYỆT ĐỐI KHÔNG SỬA SƠ ĐỒ HỌC SINH HIỆN TẠI!
      let conflictDetail = 'Phát hiện xung đột điều kiện xếp chỗ của Giáo viên!';

      if (studentFixedPositionsMap.size > 0) {
        // Kiểm tra xem có học sinh nào bị trùng hoàn toàn vị trí cố định không
        const fixedCounts = new Map<string, string[]>();
        studentFixedPositionsMap.forEach((positions, stId) => {
          const st = studentListCopy.find(s => s.id === stId);
          const stName = st ? (st.nickname || st.name) : stId;
          positions.forEach(p => {
            const key = `Bàn ${p.desk}-Dãy ${p.row}-G${p.seatCol}`;
            const list = fixedCounts.get(key) || [];
            list.push(stName);
            fixedCounts.set(key, list);
          });
        });

        const overlapConflicts: string[] = [];
        fixedCounts.forEach((studentsWithFixed, seatLabel) => {
          if (studentsWithFixed.length > 1) {
            overlapConflicts.push(`Vị trí "${seatLabel}" đang bị cài đặt cố định trùng cho ${studentsWithFixed.length} học sinh (${studentsWithFixed.join(', ')})!`);
          }
        });

        if (overlapConflicts.length > 0) {
          conflictDetail = `Xung đột vị trí cố định trùng nhau:\n• ${overlapConflicts.join('\n• ')}`;
        } else {
          conflictDetail = `Ràng buộc vị trí cố định hoặc danh sách không ngồi gần nhau quá dày đặc làm cho một số học sinh không còn ghế trống thỏa mãn!`;
        }
      }

      showConfirm(
        '❌ KHÔNG THỂ XẾP CHỖ NGỒI',
        `Hệ thống không thể sắp xếp sơ đồ lớp do phát hiện xung đột điều kiện:\n\n${conflictDetail}\n\n⚠️ Sơ đồ lớp hiện tại được giữ nguyên 100% (không bị xáo trộn). Vui lòng vào ⚙️ Cài đặt điều kiện để điều chỉnh bớt các ràng buộc trùng lặp.`,
        () => {},
        () => {}
      );
      return;
    }

    // ✅ NẾU ĐÁP ỨNG THÀNH CÔNG 100% TẤT CẢ CÁC ĐIỀU KIỆN -> CẬP NHẬT SƠ ĐỒ MỚI!
    const finalStudents = studentListCopy.map(s => {
      const planItem = successfulPlan!.find(p => p.studentId === s.id);
      if (planItem) {
        return {
          ...s,
          team: planItem.team,
          desk: planItem.desk,
          seatCol: planItem.seatCol,
        };
      }
      return s;
    });

    setStudents(finalStudents);

    // Cập nhật lại rawStudentsText
    if (rawStudentsText.trim()) {
      const lines = rawStudentsText.split('\n');
      const updatedLines = lines.map((line, idx) => {
        const parts = line.split(';').map(p => p.trim());
        if (parts.length >= 4) {
          const st = finalStudents.find(s => s.id === `hs_${idx + 1}` || s.name.trim().toLowerCase() === parts[0].trim().toLowerCase());
          if (st && st.team) {
            parts[3] = st.team;
            return parts.join('; ');
          }
        }
        return line;
      });
      setRawStudentsText(updatedLines.join('\n'));
    }

    // Kiểm tra vi phạm xác nhận lại
    const finalViolations = validateSeatingViolations(finalStudents, seatingRules);
    setActiveViolations(finalViolations);

    setSyncMessage('🎉 Đã xếp chỗ ngồi mới đáp ứng TẤT CẢ 100% điều kiện cài đặt của Giáo viên!');
    setTimeout(() => setSyncMessage(null), 3500);
  };

  // Chọn ghế để mở Thanh Bàn Chọn Học Sinh Nổi
  const handleSelectSeat = (team: string, desk: number, seatCol: number) => {
    setSelectedSeat({ team, desk, seatCol });
    setIsPickerOpen(true);
  };

  // Chọn học sinh từ Thanh Nổi để gán vào vị trí selectedSeat
  const handleAssignStudentToSelectedSeat = (studentId: string) => {
    if (!selectedSeat) return;
    const { team, desk, seatCol } = selectedSeat;

    let updatedStudents: StudentCardData[] = [];

    setStudents(prev => {
      const existingAtTarget = prev.find(
        s => s.team.toLowerCase() === team.toLowerCase() && s.desk === desk && s.seatCol === seatCol
      );
      const targetStudent = prev.find(s => s.id === studentId);
      if (!targetStudent) return prev;

      updatedStudents = prev.map(st => {
        if (st.id === studentId) {
          return { ...st, team, desk, seatCol };
        }
        if (existingAtTarget && st.id === existingAtTarget.id) {
          return {
            ...st,
            team: targetStudent.team,
            desk: targetStudent.desk,
            seatCol: targetStudent.seatCol,
          };
        }
        return st;
      });
      return updatedStudents;
    });

    const stObj = students.find(s => s.id === studentId);
    setSyncMessage(`Đã xếp ${stObj?.nickname || stObj?.name} vào ${team} • Bàn ${desk} • Ghế ${seatCol}!`);
    setTimeout(() => setSyncMessage(null), 2500);
    setIsPickerOpen(false);

    // Kiểm tra cảnh báo ngay lập tức
    setTimeout(() => {
      if (updatedStudents.length > 0) {
        const violations = validateSeatingViolations(updatedStudents, seatingRules);
        const related = violations.find(v => v.studentNames.some(n => n.toLowerCase() === (stObj?.nickname || '').toLowerCase() || n.toLowerCase() === (stObj?.name || '').toLowerCase()));
        if (related) {
          setSyncMessage(`⚠️ CẢNH BÁO VI PHẠM: ${related.message}`);
          setTimeout(() => setSyncMessage(null), 6000);
        }
      }
    }, 100);
  };

  // Bỏ xếp chỗ học sinh tại selectedSeat
  const handleRemoveStudentFromSelectedSeat = () => {
    if (!selectedSeat) return;
    const { team, desk, seatCol } = selectedSeat;

    setStudents(prev =>
      prev.map(st => {
        if (st.team.toLowerCase() === team.toLowerCase() && st.desk === desk && st.seatCol === seatCol) {
          return { ...st, team: '', desk: 0, seatCol: 0 };
        }
        return st;
      })
    );

    setSyncMessage(`Đã hủy vị trí tại ${team} • Bàn ${desk} • Ghế ${seatCol}`);
    setTimeout(() => setSyncMessage(null), 2000);
    setIsPickerOpen(false);
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, studentId: string) => {
    setDraggedStudentId(studentId);
    e.dataTransfer.setData('text/plain', studentId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Thả vào một ghế cụ thể (Seat slot: 1, 2, 3, 4 ở Bàn deskNum của targetTeam)
  const handleDropOnSeat = (e: React.DragEvent, targetTeam: string, targetDesk: number, targetCol: number) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain') || draggedStudentId;
    if (!sourceId) return;

    let updatedStudents: StudentCardData[] = [];

    setStudents(prev => {
      const existingAtTarget = prev.find(
        s => s.team === targetTeam && s.desk === targetDesk && s.seatCol === targetCol
      );

      const sourceStudent = prev.find(s => s.id === sourceId);
      if (!sourceStudent) return prev;

      updatedStudents = prev.map(st => {
        if (st.id === sourceId) {
          return { ...st, team: targetTeam, desk: targetDesk, seatCol: targetCol };
        }
        if (existingAtTarget && st.id === existingAtTarget.id) {
          return {
            ...st,
            team: sourceStudent.team,
            desk: sourceStudent.desk,
            seatCol: sourceStudent.seatCol,
          };
        }
        return st;
      });
      return updatedStudents;
    });
    setDraggedStudentId(null);

    // Kiểm tra ngay lập tức xem có vi phạm điều kiện xếp chỗ không
    const srcStudent = students.find(s => s.id === sourceId);
    setTimeout(() => {
      if (updatedStudents.length > 0) {
        const violations = validateSeatingViolations(updatedStudents, seatingRules);
        const related = violations.find(v => v.studentNames.some(n => n.toLowerCase() === (srcStudent?.nickname || '').toLowerCase() || n.toLowerCase() === (srcStudent?.name || '').toLowerCase()));
        if (related) {
          setSyncMessage(`⚠️ CẢNH BÁO VI PHẠM: ${related.message}`);
          setTimeout(() => setSyncMessage(null), 6000);
        }
      }
    }, 100);
  };

  // Thả vào vùng "Chưa xếp chỗ" (Lề phải)
  const handleDropToUnassigned = (e: React.DragEvent) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain') || draggedStudentId;
    if (!sourceId) return;

    setStudents(prev =>
      prev.map(st => {
        if (st.id === sourceId) {
          return { ...st, team: '', desk: 0, seatCol: 0 };
        }
        return st;
      })
    );
    setDraggedStudentId(null);
  };

  // Nút Xếp lại toàn bộ cả lớp -> Chuyển tất cả học sinh thành Chưa xếp chỗ
  const handleResetAllSeating = () => {
    showConfirm(
      'Xếp Lại Cả Lớp',
      'Bạn có chắc chắn muốn XÓA TOÀN BỘ chỗ ngồi của cả lớp để xếp lại từ đầu không?',
      () => {
        setStudents(prev => prev.map(s => ({ ...s, team: '', desk: 0, seatCol: 0 })));
        setSelectedSeat(null);
        setSyncMessage('Đã hủy tất cả vị trí chỗ ngồi! Hãy bấm vào các ô ghế để chọn học sinh nhanh.');
        setTimeout(() => setSyncMessage(null), 3000);
      }
    );
  };

  // Nút Xếp lại chỗ ngồi từng Tổ
  const handleResetTeamSeating = (teamName: string) => {
    setStudents(prev =>
      prev.map(s => {
        if (s.team.toLowerCase() === teamName.toLowerCase()) {
          return { ...s, team: '', desk: 0, seatCol: 0 };
        }
        return s;
      })
    );
    setSyncMessage(`Đã xóa vị trí chỗ ngồi của ${teamName}!`);
    setTimeout(() => setSyncMessage(null), 2500);
  };

  // Nút Tự động xếp chỗ nhanh các học sinh chưa xếp
  const handleAutoAssignSeating = () => {
    setStudents(prev => {
      const copy = [...prev];
      const unassigned = copy.filter(s => !s.team || s.desk === 0);
      if (unassigned.length === 0) return prev;

      let unassignedIdx = 0;

      for (const teamConf of teamsConfig) {
        for (const deskNum of teamConf.desks) {
          for (let colNum = 1; colNum <= seatsPerDesk; colNum++) {
            if (unassignedIdx >= unassigned.length) break;

            const isOccupied = copy.some(
              s => s.team.toLowerCase() === teamConf.name.toLowerCase() && s.desk === deskNum && s.seatCol === colNum
            );

            if (!isOccupied) {
              const targetStudent = unassigned[unassignedIdx];
              const foundInCopy = copy.find(s => s.id === targetStudent.id);
              if (foundInCopy) {
                foundInCopy.team = teamConf.name;
                foundInCopy.desk = deskNum;
                foundInCopy.seatCol = colNum;
              }
              unassignedIdx++;
            }
          }
        }
      }
      return copy;
    });

    setSyncMessage('Đã tự động xếp chỗ cho các học sinh chưa có bàn!');
    setTimeout(() => setSyncMessage(null), 3000);
  };

  // Tải Sơ đồ lớp thành file ảnh PNG sắc nét (CHỈ TẢI KHUNG SƠ ĐỒ LỚP HỌC SẠCH SẼ)
  const handleDownloadPNG = async () => {
    const el = document.getElementById('seating-diagram-only') || document.getElementById('a4-seating-chart-container');
    if (!el) {
      window.print();
      return;
    }

    try {
      setSyncMessage('Đang chuẩn bị dữ liệu sơ đồ lớp sạch sẽ...');
      setIsExportingPNG(true);

      // Chờ React re-render DOM sang trạng thái sơ đồ sạch (không nút bấm, không nhãn rác)
      await new Promise(resolve => setTimeout(resolve, 200));

      setSyncMessage('Đang khởi tạo file PNG sơ đồ lớp sắc nét...');
      const dataUrl = await toPng(el, {
        quality: 1.0,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        skipFonts: true,
        fontEmbedCSS: '',
      });

      const link = document.createElement('a');
      const cleanClassName = headerInfo.className.replace(/\s+/g, '_');
      link.download = `SoDoLop_${cleanClassName}_Tuan${applyWeekNum}.png`;
      link.href = dataUrl;
      link.click();

      setSyncMessage('Đã tải hình ảnh PNG sơ đồ lớp thành công!');
    } catch (err) {
      console.error('Lỗi khi xuất PNG:', err);
      window.print();
    } finally {
      setIsExportingPNG(false);
      setTimeout(() => setSyncMessage(null), 3000);
    }
  };

  const loadDataIntoState = (data: SoDoLopSaveData) => {
    if (data.headerInfo) setHeaderInfo(data.headerInfo);
    if (data.seatsPerDesk !== undefined) setSeatsPerDesk(data.seatsPerDesk);
    if (data.customDeskSeats) setCustomDeskSeats(data.customDeskSeats);
    if (data.applyWeekNum !== undefined) setApplyWeekNum(data.applyWeekNum);
    if (data.viewPerspective) setViewPerspective(data.viewPerspective);
    if (data.paperOrientation) setPaperOrientation(data.paperOrientation);
    if (data.doorOnLeft !== undefined) setDoorOnLeft(data.doorOnLeft);
    if (data.teamsConfig) setTeamsConfig(data.teamsConfig);
    if (data.students) setStudents(data.students);
    if (data.rawStudentsText) setRawStudentsText(data.rawStudentsText);
    if (data.seatingRules) {
      setSeatingRules(data.seatingRules);
      saveClassSeatingRules(selectedClassId, data.seatingRules);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const ExcelJSModule = await import('exceljs');
      const ExcelJS = ExcelJSModule.default || ExcelJSModule;
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('DS_Mau_So_Do_Lop');

      // Define columns with headers and widths
      worksheet.columns = [
        { header: 'STT', key: 'stt', width: 8 },
        { header: 'Họ và tên', key: 'name', width: 25 },
        { header: 'Nickname', key: 'nickname', width: 15 },
        { header: 'Giới tính', key: 'gender', width: 15 },
        { header: 'Phân tổ', key: 'team', width: 15 },
        { header: 'Chức danh điều hành', key: 'exec_role', width: 20 },
        { header: 'Chức danh đoàn', key: 'union_role', width: 18 },
        { header: 'Chức danh tổ', key: 'team_role', width: 15 },
        { header: 'Chức danh bộ môn', key: 'subject_role', width: 22 },
      ];

      // 5 illustrative sample rows with custom data showing valid options
      const sampleRows = [
        [1, 'Nguyễn Văn An', 'AnGV', 'Nam', 'Tổ 1', 'LT', 'BT', 'TT', 'Toán'],
        [2, 'Lê Minh Khang', 'KhangKhang', 'Nam', 'Tổ 1', 'student', '', '', 'Lý'],
        [3, 'Trần Thị Mai', 'MaiMai', 'Nữ', 'Tổ 2', 'student', 'UV', 'TP', 'Hóa'],
        [4, 'Phạm Hoàng Nam', 'NamNam', 'Nam', 'Tổ 3', 'PHT', '', '', 'Sinh'],
        [5, 'Đỗ Thu Hà', 'HàHà', 'Nữ', 'Tổ 4', 'student', 'PBT', '', 'Anh']
      ];

      sampleRows.forEach(row => {
        worksheet.addRow(row);
      });

      // Style Header row
      const headerRow = worksheet.getRow(1);
      headerRow.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4F46E5' } // Indigo color
      };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

      // Apply validations to rows 2 through 100
      for (let i = 2; i <= 100; i++) {
        // Col D: Giới tính
        worksheet.getCell(`D${i}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: ['"Nam,Nữ"'],
          showErrorMessage: true,
          errorTitle: 'Dữ liệu không hợp lệ',
          error: 'Vui lòng chọn Giới tính trong danh sách: Nam, Nữ'
        };

        // Col E: Phân tổ
        worksheet.getCell(`E${i}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: ['"Tổ 1,Tổ 2,Tổ 3,Tổ 4"'],
          showErrorMessage: false,
        };

        // Col F: Chức danh điều hành
        worksheet.getCell(`F${i}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: ['"LT,PHT,TQ,CĐ,PLĐ,VTM"'],
          showErrorMessage: false,
        };

        // Col G: Chức danh đoàn
        worksheet.getCell(`G${i}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: ['"BT,PBT,UV"'],
          showErrorMessage: false,
        };

        // Col H: Chức danh tổ
        worksheet.getCell(`H${i}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: ['"TT,TP"'],
          showErrorMessage: false,
        };

        // Col I: Chức danh bộ môn
        worksheet.getCell(`I${i}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: ['"Toán,Văn,Anh,Lý,Hóa,Sinh,Tin,Sử,Địa,KTPL,HĐHN,GDQP,GDTC,Nhạc,Vẽ,GDĐP"'],
          showErrorMessage: false,
        };
      }

      // Generate and trigger download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'Mau_Danh_Sach_Hoc_Sinh_So_Do_Lop.xlsx';
      link.click();

      setSyncMessage('Đã tải xuống file Excel danh sách mẫu có tích hợp danh sách chọn (Dropdown) thành công!');
      setTimeout(() => setSyncMessage(null), 3500);
    } catch (err) {
      console.error(err);
      alert('Đã xảy ra lỗi khi tạo file mẫu Excel.');
    }
  };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const { read, utils } = await import('xlsx');
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = utils.sheet_to_json<any>(sheet);

        if (jsonData.length === 0) {
          alert('File Excel trống hoặc không hợp lệ.');
          return;
        }

        // Convert rows to text structure: [Họ tên; Biệt danh; Giới tính; Tổ; Vai trò; Chức danh]
        const lines = jsonData.map((row) => {
          const name = (row['Họ và tên'] || row['Họ tên'] || row['Họ Tên'] || '').toString().trim();
          const nickname = (row['Nickname'] || row['Biệt danh'] || '').toString().trim();
          const gender = (row['Giới tính'] || '').toString().trim();
          const team = (row['Phân tổ'] || row['Tổ'] || row['To'] || row['Nhóm'] || '').toString().trim();
          
          let execRole = (row['Chức danh điều hành'] || '').toString().trim();
          let unionRole = (row['Chức danh đoàn'] || '').toString().trim();
          let teamRole = (row['Chức danh tổ'] || '').toString().trim();
          let subjectRole = (row['Chức danh bộ môn'] || '').toString().trim();

          const cleanExec = (execRole.toLowerCase() === 'student' || execRole.toLowerCase() === 'thành viên') ? '' : execRole;
          const cleanUnion = (unionRole.toLowerCase() === 'student' || unionRole.toLowerCase() === 'thành viên') ? '' : unionRole;
          const cleanTeam = (teamRole.toLowerCase() === 'student' || teamRole.toLowerCase() === 'thành viên') ? '' : teamRole;
          const cleanSubject = (subjectRole.toLowerCase() === 'student' || subjectRole.toLowerCase() === 'thành viên') ? '' : subjectRole;

          // Standard comma-separated roles block: Chức danh điều hành, chức danh đoàn, chức danh tổ, chức danh bộ môn
          const roleTitlePart = `${cleanExec}, ${cleanUnion}, ${cleanTeam}, ${cleanSubject}`;

          return `${name}; ${nickname}; ${gender}; ${team}; ${roleTitlePart}`;
        });

        const newText = lines.join('\n');
        setRawStudentsText(newText);
        parseRawTextToStudents(newText);
        setSyncMessage('Đã tải lên file Excel và chuẩn hóa dữ liệu học sinh thành công!');
        setTimeout(() => setSyncMessage(null), 3500);
      } catch (err) {
        console.error(err);
        alert('Đã xảy ra lỗi khi đọc file Excel. Vui lòng kiểm tra lại định dạng.');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const handleUploadToDrive = async () => {
    setIsUploadingDrive(true);
    try {
      let conn = getDriveConnectionState();

      // Nếu chưa kết nối hoặc chưa có token trên tên miền hiện tại (ví dụ vercel.app) -> Tự động bật popup Đăng nhập Google Drive!
      if (!conn.isConnected) {
        setSyncMessage('🔑 Đang mở cửa sổ kết nối Google Drive...');
        const authRes = await connectGoogleDrive();
        if (!authRes.success) {
          setIsUploadingDrive(false);
          setSyncMessage('⚠️ Cần kết nối tài khoản Google Drive để tải sơ đồ lớp lên Cloud.');
          setTimeout(() => setSyncMessage(null), 4000);
          return;
        }
      }

      const cleanClassName = headerInfo.className.replace(/^Lớp\s*/i, '').trim().replace(/\s+/g, '_');
      const fileName = `SoDoLop_${cleanClassName}_Tuan${applyWeekNum}.json`;

      const saveData: SoDoLopSaveData = {
        headerInfo,
        seatsPerDesk,
        customDeskSeats,
        applyWeekNum,
        viewPerspective,
        paperOrientation,
        doorOnLeft,
        teamsConfig,
        students,
        rawStudentsText,
        seatingRules,
      };

      // Đảm bảo lưu luôn cấu hình điều kiện xếp chỗ vào localStorage của lớp hiện tại
      saveClassSeatingRules(selectedClassId, seatingRules);

      // Save into our simulated list of Drive files
      const storedRaw = localStorage.getItem('lopu_google_drive_files_v1') || '[]';
      let files: DriveStoredFile[] = [];
      try {
        files = JSON.parse(storedRaw);
      } catch (e) {
        files = [];
      }

      const fileId = `gdrive_seat_${Date.now()}`;
      const newFileItem: DriveStoredFile = {
        id: fileId,
        name: fileName,
        mimeType: 'application/json',
        category: 'personal_seating',
        size: `${(JSON.stringify(saveData).length / 1024).toFixed(1)} KB`,
        modifiedTime: new Date().toLocaleString('vi-VN'),
        classId: selectedClassId,
        content: saveData,
      };

      const existingIdx = files.findIndex(f => f.name === fileName);

      const proceedUpload = async (idxToReplace: number | null) => {
        if (idxToReplace !== null) {
          newFileItem.id = files[idxToReplace].id;
          files[idxToReplace] = newFileItem;
        } else {
          files.unshift(newFileItem);
        }

        localStorage.setItem('lopu_google_drive_files_v1', JSON.stringify(files));

        // Lưu vào bộ nhớ đệm và đẩy trực tiếp lên thư mục "myApp/LopU/SoDoLop" trên Google Drive
        let driveRes = await saveSeatingChartToDrive(selectedClassId, saveData, fileName);

        // Nếu bị lỗi 401 hoặc chưa có token -> Thử đăng nhập lại tự động 1 lần
        if (!driveRes.success && (driveRes.error?.includes('401') || driveRes.error?.includes('Chưa có Token'))) {
          setSyncMessage('🔑 Phiên kết nối hết hạn. Đang mở cửa sổ đăng nhập lại Google Drive...');
          const reAuth = await connectGoogleDrive();
          if (reAuth.success) {
            driveRes = await saveSeatingChartToDrive(selectedClassId, saveData, fileName);
          }
        }

        const cleanFileName = fileName.replace('.json', '');

        if (driveRes.success) {
          setSyncMessage(`🎉 Đã tải lên Google Drive thực tế thành công: ${cleanFileName} tại thư mục myApp\\LopU\\SoDoLop!`);
        } else {
          setSyncMessage(`⚠️ Không thể tải lên Drive: ${driveRes.error || 'Lỗi kết nối'}`);
        }

        setIsUploadingDrive(false);
        setTimeout(() => setSyncMessage(null), 4000);
      };

      if (existingIdx >= 0) {
        showConfirm(
          'Ghi Đè Sơ Đồ Lớp',
          `Tên sơ đồ lớp "${fileName}" đã tồn tại. Bạn có muốn cập nhật không?`,
          () => {
            proceedUpload(existingIdx);
          },
          () => {
            setIsUploadingDrive(false);
          }
        );
      } else {
        await proceedUpload(null);
      }
    } catch (err: any) {
      console.error(err);
      setIsUploadingDrive(false);
      alert('Đã xảy ra lỗi khi tải lên Drive: ' + (err?.message || err));
    }
  };

  const handleOpenDriveFiles = async () => {
    setIsLoadingDriveFiles(true);
    setDriveFilesModalOpen(true);
    try {
      const seatingFiles = await fetchSeatingChartsFromDrive();
      setDriveFiles(seatingFiles);
    } catch (err: any) {
      console.error('Lỗi khi tải danh sách file từ Drive:', err);
      if (err?.message && (err.message.includes('401') || err.message.includes('Phiên kết nối'))) {
        setSyncMessage('⚠️ Phiên kết nối Google Drive đã hết hạn. Vui lòng bấm Kết Nối Google Drive để xác thực lại!');
        setTimeout(() => setSyncMessage(null), 5000);
      }
    } finally {
      setIsLoadingDriveFiles(false);
    }
  };

  const handleApplyDriveFile = async (file: DriveStoredFile) => {
    try {
      setSyncMessage(`Đang nạp trực tiếp file ${file.name} từ Google Drive vào app...`);
      const content = await fetchDriveFileJsonContent(file.id, file.content);
      if (!content) {
        alert(`Không thể đọc được nội dung của file ${file.name}. Vui lòng kiểm tra lại kết nối Drive.`);
        return;
      }
      const data = content as SoDoLopSaveData;
      loadDataIntoState(data);

      setSyncMessage(`Đã nạp trực tiếp sơ đồ lớp "${file.name}" vào app thành công!`);
      setDriveFilesModalOpen(false);
      setTimeout(() => setSyncMessage(null), 3500);
    } catch (err) {
      console.error(err);
      alert('Đã xảy ra lỗi khi nạp dữ liệu từ file Drive.');
    }
  };

  const handleJsonFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const data = JSON.parse(text) as SoDoLopSaveData;
        loadDataIntoState(data);
        setSyncMessage(`Đã nạp trực tiếp file JSON "${file.name}" vào app thành công!`);
        setTimeout(() => setSyncMessage(null), 3500);
      } catch (err) {
        console.error(err);
        alert('File JSON không hợp lệ hoặc bị lỗi định dạng!');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDeleteDriveFile = (file: DriveStoredFile) => {
    showConfirm(
      'Xóa File Khỏi Toàn Bộ Hệ Thống & Drive',
      `Bạn có chắc chắn muốn xóa vĩnh viễn file "${file.name}" khỏi dữ liệu cục bộ, Google Drive và toàn bộ hệ thống không?`,
      async () => {
        setSyncMessage(`Đang xóa file ${file.name} trên Drive & hệ thống...`);
        // Xóa triệt để khỏi local storage, blacklist và Drive API
        const res = await deleteDriveFileEverywhere(file.id, file.name);

        // Cập nhật giao diện danh sách Drive ngay lập tức
        setDriveFiles(prev => prev.filter(f => f.id !== file.id && f.name !== file.name));
        setSyncMessage(res.message || 'Đã xóa file thành công!');
        setTimeout(() => setSyncMessage(null), 3000);
      }
    );
  };

  // Lọc học sinh chưa xếp chỗ
  const unassignedStudents = students.filter(s => !s.team || s.desk === 0);
  const totalStudents = students.length;
  const assignedCount = totalStudents - unassignedStudents.length;
  const femaleCount = students.filter(s => s.gender.toLowerCase() === 'nữ' || s.gender.toLowerCase() === 'nu').length;

  // Lấy thông tin học sinh hiện đang ngồi ở ghế được chọn (nếu có)
  const currentOccupant = selectedSeat
    ? students.find(
        s =>
          s.team.toLowerCase() === selectedSeat.team.toLowerCase() &&
          s.desk === selectedSeat.desk &&
          s.seatCol === selectedSeat.seatCol
      )
    : null;

  // Danh sách học sinh hiển thị trong Thanh Chọn Nổi với 2 bộ lọc dropdown (Tổ n/Cả lớp & Trạng thái chỗ ngồi)
  const filteredPickerStudents = students.filter(st => {
    // 1. Lọc theo Trạng thái chỗ ngồi (Chưa xếp chỗ / Tất cả cả lớp / Đã có chỗ)
    if (pickerStatusFilter === 'unassigned') {
      if (st.team && st.desk !== 0) return false;
    } else if (pickerStatusFilter === 'assigned') {
      if (!st.team || st.desk === 0) return false;
    }

    // 2. Lọc theo Tổ (Tổ 1, Tổ 2,... hay Cả lớp / Chưa xếp Tổ)
    if (pickerTeamFilter !== 'all') {
      if (pickerTeamFilter === 'none') {
        if (st.team && st.team.trim() !== '') return false;
      } else {
        if (st.team.toLowerCase() !== pickerTeamFilter.toLowerCase()) return false;
      }
    }

    // 3. Tìm kiếm theo Tên hoặc Biệt danh
    if (pickerSearch.trim()) {
      const term = pickerSearch.toLowerCase();
      const matchName = st.name.toLowerCase().includes(term);
      const matchNick = st.nickname ? st.nickname.toLowerCase().includes(term) : false;
      if (!matchName && !matchNick) return false;
    }

    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div id="a4-seating-chart-container" className="space-y-6 bg-white p-2 rounded-2xl">
      {/* CSS In Ấn Khổ A4 (Ngang / Dọc) với tỉ lệ chuẩn 16:9 */}
      <style>{`
        @media print {
          @page {
            size: A4 ${paperOrientation};
            margin: 20mm !important; /* Lề trên dưới trái phải đúng 2cm giống Word */
          }
          body {
            background: white !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:p-0 {
            padding: 0 !important;
          }
          .print\\:m-0 {
            margin: 0 !important;
          }
          .print\\:border-none {
            border: none !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          .print\\:w-full {
            width: 100% !important;
            max-width: 100% !important;
          }

          /* Ẩn mọi phần tử rác ngoại trừ khung sơ đồ duy nhất */
          #root > div > *:not(#a4-seating-chart-container),
          #a4-seating-chart-container > *:not(#seating-diagram-only) {
            display: none !important;
          }

          /* Áp dụng tỷ lệ chuẩn A4 16:9 hoặc 9:16 sắc nét cho khung in */
          #seating-diagram-only {
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            aspect-ratio: ${paperOrientation === 'landscape' ? '16 / 9' : '9 / 16'} !important;
            border: 4px solid #000000 !important; /* Đường viền bao ngoài 4px đen siêu nét */
            border-radius: 0px !important;
            padding: 20px !important;
            box-sizing: border-box !important;
            margin: 0 auto !important;
            background: #ffffff !important;
            box-shadow: none !important;
            page-break-inside: avoid !important;
          }

          /* ĐẬM HÓA TOÀN BỘ ĐƯỜNG VIỀN KHI IN ĐỂ KHÔNG BỊ MỜ TRÊN BẢN IN ĐEN TRẮNG */
          #seating-diagram-only .border,
          #seating-diagram-only .border-2,
          #seating-diagram-only .border-t-2,
          #seating-diagram-only .print\\:border-2,
          #seating-diagram-only .print\\:border-slate-800,
          #seating-diagram-only .print\\:border-black,
          #seating-diagram-only [class*="border-"] {
            border-color: #000000 !important;
            border-width: 3px !important; /* Đường viền 3px sắc nét cho các ô học sinh và bàn */
            border-style: solid !important;
            border-radius: 6px !important;
            opacity: 1 !important;
            box-shadow: none !important;
          }

          /* Giữ nét đứt cho Bảng */
          #seating-diagram-only .border-dashed {
            border-style: dashed !important;
          }

          /* Giữ nền trắng sạch cho toàn bộ sơ đồ */
          #seating-diagram-only,
          #seating-diagram-only * {
            background-color: #ffffff !important;
            background-image: none !important;
          }

          /* Đậm hóa toàn bộ văn bản và nhãn chữ sang màu đen 100% */
          #seating-diagram-only span,
          #seating-diagram-only div,
          #seating-diagram-only h3,
          #seating-diagram-only h1,
          #seating-diagram-only p {
            color: #000000 !important;
            -webkit-text-fill-color: #000000 !important;
            text-shadow: none !important;
            font-weight: 900 !important;
          }

          /* Đậm hóa biểu tượng SVG Nam/Nữ để in đen trắng rõ mồn một */
          #seating-diagram-only svg {
            stroke: #000000 !important;
            stroke-width: 2.5px !important;
            color: #000000 !important;
            fill: none !important;
          }
        }
      `}</style>

      {/* Toast Notification */}
      {syncMessage && (
        <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs print:hidden">
          <Cloud className="w-4 h-4 text-blue-600 shrink-0" />
          <span>{syncMessage}</span>
        </div>
      )}

      {/* HEADER CỐ ĐỊNH BAN GIÁM HIỆU & KHUNG TRƯỜNG */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 print:hidden">
        <div className="flex flex-wrap items-center justify-end gap-4 pb-4 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Cấu hình số ghế trên bàn */}
            <div className="flex items-center gap-2 bg-indigo-50/80 border border-indigo-200/80 px-3 py-1.5 rounded-xl shadow-2xs">
              <span className="text-[11px] font-black text-indigo-900 whitespace-nowrap">Số ghế/bàn:</span>
              <select
                value={seatsPerDesk}
                onChange={e => setSeatsPerDesk(Number(e.target.value))}
                className="bg-white border border-indigo-300 text-indigo-900 font-extrabold text-xs rounded-lg px-2 py-1 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden cursor-pointer"
              >
                <option value={2}>2 ghế / bàn</option>
                <option value={3}>3 ghế / bàn (Mặc định)</option>
                <option value={4}>4 ghế / bàn</option>
                <option value={5}>5 ghế / bàn</option>
                <option value={6}>6 ghế / bàn</option>
              </select>
            </div>

            <div className="text-right text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex flex-col gap-1.5 min-w-[140px]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] uppercase font-bold text-slate-400">GVCN:</span>
                <input
                  type="text"
                  value={headerInfo.teacherName}
                  onChange={e => setHeaderInfo(prev => ({ ...prev, teacherName: e.target.value }))}
                  className="w-24 bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs font-bold text-slate-900 focus:outline-hidden"
                  title="Sửa tên GVCN"
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] uppercase font-bold text-slate-400">SĐT:</span>
                <input
                  type="text"
                  value={headerInfo.teacherPhone}
                  onChange={e => setHeaderInfo(prev => ({ ...prev, teacherPhone: e.target.value }))}
                  className="w-24 bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs font-bold text-slate-900 focus:outline-hidden"
                  title="Sửa SĐT GVCN"
                />
              </div>
            </div>

            {/* Nút Cài Đặt Xếp Chỗ (Dành cho Giáo viên & Quản trị) - Biểu tượng bánh răng */}
            {isTeacher && (
              <button
                id="btn-open-seating-rules"
                onClick={() => setShowRulesModal(true)}
                className="flex items-center justify-center p-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-xs cursor-pointer transition-colors"
                title="Cài đặt điều kiện xếp sơ đồ lớp (Học sinh không gần nhau, Vị trí cố định, Cặp đôi cùng tiến)"
              >
                <Settings className="w-4 h-4 text-white" />
              </button>
            )}

            <button
              id="btn-upload-drive"
              onClick={handleUploadToDrive}
              disabled={isUploadingDrive}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white shadow-xs transition-colors ${
                isUploadingDrive
                  ? 'bg-blue-400 cursor-not-allowed opacity-80'
                  : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
              }`}
              title="Tải cấu trúc sơ đồ lớp lên Google Drive"
            >
              {isUploadingDrive ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Cloud className="w-4 h-4" />
              )}
              <span>{isUploadingDrive ? 'Đang tải lên...' : 'Tải lên Drive'}</span>
            </button>

            <button
              id="btn-download-drive"
              onClick={handleOpenDriveFiles}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs cursor-pointer transition-colors"
              title="Xem danh sách file và tải về từ Drive"
            >
              <Download className="w-4 h-4" />
              <span>Tải Drive về</span>
            </button>
          </div>
        </div>

        {/* Dynamic Textarea Parser */}
        <div className="space-y-2 print:hidden">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-4 h-4 text-indigo-600" />
              Nhập Cấu Trúc Học Sinh [Họ tên; Biệt danh; Giới tính; Tổ; Điều hành, Đoàn, Tổ, Bộ môn]
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadTemplate}
                className="text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-3xs"
                title="Tải xuống file Excel danh sách mẫu chuẩn"
              >
                <Download className="w-3 h-3" />
                <span>Tải DS mẫu</span>
              </button>

              <label
                htmlFor="excel-upload-input"
                className="text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-3xs"
                title="Tải lên file Excel danh sách học sinh"
              >
                <Download className="w-3 h-3 rotate-180" />
                <span>Tải lên Excel</span>
              </label>
              <input
                type="file"
                id="excel-upload-input"
                accept=".xlsx, .xls"
                className="hidden"
                onChange={handleExcelUpload}
              />

              <label
                htmlFor="json-upload-input"
                className="text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-3xs"
                title="Nạp trực tiếp file JSON sơ đồ lớp từ máy tính vào ứng dụng"
              >
                <Zap className="w-3 h-3" />
                <span>Nạp file JSON</span>
              </label>
              <input
                type="file"
                id="json-upload-input"
                accept=".json"
                className="hidden"
                onChange={handleJsonFileUpload}
              />
            </div>
          </div>

          <textarea
            rows={2}
            value={rawStudentsText}
            onChange={e => {
              const val = e.target.value;
              setRawStudentsText(val);
              parseRawTextToStudents(val);
            }}
            className="w-full text-xs font-mono p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            placeholder="Mỗi dòng 1 học sinh..."
          />

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              {/* Nút Nạp vào sơ đồ - Đưa lên trước nút Nhìn lên */}
              <button
                id="btn-import-students-seating"
                onClick={handleImportText}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Nạp vào sơ đồ</span>
              </button>

              {/* Toggle Góc Nhìn (Nhìn lên ⇄ Nhìn xuống) */}
              <button
                onClick={() => setViewPerspective(prev => (prev === 'up' ? 'down' : 'up'))}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all border shadow-2xs ${
                  viewPerspective === 'up'
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-indigo-50 text-indigo-900 border-indigo-300'
                }`}
                title={viewPerspective === 'up' ? 'Đang nhìn lên Bảng (Bấm để đổi nhìn xuống)' : 'Đang nhìn xuống Lớp (Bấm để đổi nhìn lên)'}
              >
                {viewPerspective === 'up' ? '👁️ Nhìn lên' : '👨‍🏫 Nhìn xuống'}
              </button>

              {/* Toggle Khổ Giấy A4 (A4 Ngang ⇄ A4 Dọc) */}
              <button
                onClick={() => setPaperOrientation(prev => (prev === 'landscape' ? 'portrait' : 'landscape'))}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all border shadow-2xs ${
                  paperOrientation === 'landscape'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-emerald-50 text-emerald-900 border-emerald-300'
                }`}
                title={paperOrientation === 'landscape' ? 'Đang A4 Ngang (Bấm để chuyển A4 Dọc)' : 'Đang A4 Dọc (Bấm để chuyển A4 Ngang)'}
              >
                {paperOrientation === 'landscape' ? '📄 A4 Ngang' : '📄 A4 Dọc'}
              </button>

              {/* Nút Xếp chỗ ngồi duy nhất trước nút Đổi Cửa ⇄ Bàn GV */}
              <button
                id="btn-auto-assign-seating-rules"
                disabled={isAssigningSeating}
                onClick={() => setShowTeamLockModalBeforeAssign(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-xs cursor-pointer transition-all hover:scale-105 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                title="Bấm để chọn khóa tổ và tiến hành xếp chỗ ngồi tự động"
              >
                {isAssigningSeating ? (
                  <RefreshCw className="w-3.5 h-3.5 text-purple-200 animate-spin" />
                ) : (
                  <SlidersHorizontal className="w-3.5 h-3.5 text-purple-200" />
                )}
                <span>{isAssigningSeating ? 'Đang tính toán...' : 'Xếp chỗ ngồi'}</span>
              </button>

              {/* Đổi vị trí Cửa ⇄ Bàn GV */}
              <button
                type="button"
                onClick={() => setDoorOnLeft(prev => !prev)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 transition-colors cursor-pointer shadow-2xs"
                title="Bấm để đổi vị trí Cửa ra vào với Bàn giáo viên (Trái ⇄ Phải)"
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-amber-700" />
                <span>Đổi Cửa ⇄ Bàn GV</span>
              </button>

              <button
                id="btn-download-png"
                onClick={handleDownloadPNG}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white shadow-xs cursor-pointer transition-colors"
                title="Tải Sơ đồ lớp thành file ảnh PNG"
              >
                <Download className="w-4 h-4 text-amber-400" />
                <span>Tải PNG</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CẢNH BÁO VI PHẠM ĐIỀU KIỆN XẾP CHỖ (NẾU CÓ & KHI TÙY CHỌN BẬT) */}
      {showViolationWarnings && activeViolations.length > 0 && (
        <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-4 shadow-sm space-y-2 animate-in fade-in print:hidden">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-rose-800 font-black text-xs uppercase tracking-wide">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping" />
              <span>Phát hiện {activeViolations.length} vi phạm điều kiện xếp chỗ của Giáo viên:</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleAutoAssignWithRules}
                className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-all flex items-center gap-1.5"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Tự động sửa vi phạm</span>
              </button>
            </div>
          </div>
          <div className="space-y-1 pl-4">
            {activeViolations.map((v, i) => (
              <div key={i} className="text-xs text-rose-700 font-semibold flex items-start gap-1.5">
                <span className="font-bold text-rose-900">•</span>
                <span>{v.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* THANH BỔ SUNG TRÊN CÙNG: KHU VỰC HỦY CHỖ NGỒI & DANH SÁCH HS CHƯA XẾP CHẾ ĐỘ RỘNG MÀN HÌNH NGHANG */}
      {!isExportingPNG && (
        <div className="bg-white p-3.5 rounded-2xl border-2 border-slate-900 shadow-xs flex flex-wrap items-center justify-between gap-3 print:hidden">
          {/* Vùng Thả Hủy Chỗ */}
          <div
            onDragOver={handleDragOver}
            onDrop={handleDropToUnassigned}
            className="px-4 py-2 border-2 border-dashed border-amber-400 bg-amber-50 hover:bg-amber-100 rounded-xl text-amber-900 font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer shrink-0 shadow-3xs"
            title="Kéo thả học sinh từ bàn học vào đây để HỦY chỗ ngồi"
          >
            <XCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <span>Kéo học sinh vào đây để HỦY chỗ ngồi</span>
          </div>

          {/* Danh sách học sinh chưa xếp (dạng thanh ngang cuộn) */}
          <div className="flex-1 flex items-center gap-2 overflow-x-auto py-1 px-1 min-w-[200px]">
            {unassignedStudents.length === 0 ? (
              <span className="text-xs font-semibold text-slate-500 italic bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                ✨ Tất cả học sinh đã có chỗ ngồi trên sơ đồ!
              </span>
            ) : (
              unassignedStudents.map(st => {
                const isFemale = st.gender.toLowerCase() === 'nữ' || st.gender.toLowerCase() === 'nu';
                return (
                  <div
                    key={st.id}
                    draggable
                    onDragStart={e => handleDragStart(e, st.id)}
                    onClick={() => {
                      if (selectedSeat) {
                        handleAssignStudentToSelectedSeat(st.id);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 shrink-0 shadow-3xs transition-all cursor-pointer ${
                      selectedSeat
                        ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-400'
                        : 'bg-slate-50 hover:bg-indigo-50 border-slate-200 hover:border-indigo-300'
                    }`}
                    title="Kéo vào bàn hoặc bấm chọn để xếp"
                  >
                    <div className="w-6 h-6 rounded-full bg-white border border-slate-200 flex items-center justify-center shrink-0">
                      {isFemale ? (
                        <IconNu className="w-5 h-5 text-rose-600" />
                      ) : (
                        <IconNam className="w-5 h-5 text-indigo-700" />
                      )}
                    </div>
                    <span className="text-xs font-black text-slate-900 truncate max-w-[100px]">
                      {st.nickname || st.name}
                    </span>
                    <span className="text-[10px] font-bold text-indigo-700 bg-white px-1.5 py-0.5 rounded border border-indigo-200">
                      {selectedSeat ? 'Xếp vào ô' : 'Kéo'}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* Nút Xếp Tự Động các HS chưa xếp */}
          {unassignedStudents.length > 0 && (
            <button
              onClick={handleAutoAssignSeating}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-3xs cursor-pointer flex items-center gap-1.5 transition-colors shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Xếp tự động ({unassignedStudents.length})</span>
            </button>
          )}
        </div>
      )}

      {/* VÙNG SƠ ĐỒ LỚP HỌC KHỔ RỘNG TOÀN MÀN HÌNH NGHANG (100% WIDTH) */}
      <div
        id="seating-diagram-only"
        className="w-full bg-white p-6 rounded-none border-4 border-slate-950 shadow-2xs space-y-4"
        style={isExportingPNG ? {
          width: paperOrientation === 'landscape' ? '1285px' : '850px',
          minHeight: paperOrientation === 'landscape' ? '850px' : '1285px',
          padding: '40px',
          boxSizing: 'border-box',
          backgroundColor: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        } : undefined}
      >
        {/* TIÊU ĐỀ SƠ ĐỒ LỚP, CỬA RA VÀO, BẢNG & BÀN GIÁO VIÊN (LUÔN CỐ ĐỊNH Ở TRÊN CÙNG) */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          {/* CỬA RA VÀO BLOCK */}
          {(() => {
            const DoorBlock = (
              <div key="door-block" className="py-2.5 px-3.5 rounded-xl bg-slate-100 border-2 border-slate-300 text-slate-900 text-center font-black text-xs uppercase tracking-wider print:bg-white print:border-black print:text-black shadow-2xs shrink-0">
                <div className={`transition-transform duration-300 ${viewPerspective === 'down' ? 'rotate-180' : ''}`}>
                  🚪 CỬA RA VÀO
                </div>
              </div>
            );

            const TeacherDeskBlock = (
              <div key="teacher-block" className="py-2 px-3.5 rounded-xl bg-amber-50 border-2 border-amber-300 text-amber-950 text-center font-black text-xs uppercase tracking-wider print:bg-white print:border-black print:text-black shadow-2xs shrink-0">
                <div className={`transition-transform duration-300 ${viewPerspective === 'down' ? 'rotate-180' : ''}`}>
                  <div>💼 BÀN GIÁO VIÊN</div>
                  {isExportingPNG ? (
                    <div className="text-[10px] text-amber-900 font-bold normal-case mt-0.5 print:text-black flex flex-col gap-0.5">
                      <div>GVCN: {headerInfo.teacherName}</div>
                      <div>SĐT: {headerInfo.teacherPhone}</div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-1.5 text-[10px] text-amber-900 font-bold normal-case mt-0.5">
                      <div className="flex items-center gap-1">
                        <span>GVCN:</span>
                        <input
                          type="text"
                          value={headerInfo.teacherName}
                          onChange={e => setHeaderInfo(prev => ({ ...prev, teacherName: e.target.value }))}
                          className="w-24 bg-white/90 border border-amber-300 rounded px-1 py-0.5 text-[10px] font-black text-amber-950 focus:outline-hidden"
                          title="Bấm để sửa tên GVCN"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <span>SĐT:</span>
                        <input
                          type="text"
                          value={headerInfo.teacherPhone}
                          onChange={e => setHeaderInfo(prev => ({ ...prev, teacherPhone: e.target.value }))}
                          className="w-24 bg-white/90 border border-amber-300 rounded px-1 py-0.5 text-[10px] font-black text-amber-950 focus:outline-hidden"
                          title="Bấm để sửa SĐT GVCN"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );

            const BoardBlock = (
              <div key="board-block" className="flex-1 max-w-md text-center px-1">
                <div className="py-2 px-3 rounded-xl bg-slate-50/90 border-2 border-dashed border-slate-300 text-slate-800 text-center shadow-2xs print:bg-white print:border-black">
                  <div className={`transition-transform duration-300 ${viewPerspective === 'down' ? 'rotate-180' : ''}`}>
                    <div className="text-[10px] font-black uppercase text-indigo-600 tracking-widest mb-0.5 print:text-black">
                      ━━━ 📌 BẢNG ━━━
                    </div>
                    <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-indigo-900 print:text-black flex items-center justify-center gap-1.5 flex-wrap">
                      {isExportingPNG ? (
                        <span>LỚP {headerInfo.className.replace(/^Lớp\s*/i, '').trim().toUpperCase()} - NĂM HỌC {getDynamicAcademicYear()}</span>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span>LỚP</span>
                          <input
                            type="text"
                            value={headerInfo.className.replace(/^Lớp\s*/i, '')}
                            onChange={e => setHeaderInfo(prev => ({ ...prev, className: `Lớp ${e.target.value}` }))}
                            className="w-20 bg-white border border-indigo-300 rounded px-1.5 py-0.5 text-xs font-black text-indigo-950 uppercase text-center focus:outline-hidden"
                            title="Bấm để sửa tên Lớp"
                          />
                          <span>- NĂM HỌC {getDynamicAcademicYear()}</span>
                        </div>
                      )}
                    </span>

                    {/* Chổ tuần áp dụng */}
                    <div className="mt-1 text-[11px] text-slate-600 font-extrabold flex items-center justify-center gap-1.5 print:text-black">
                      <span>Áp dụng từ tuần</span>
                      {isExportingPNG ? (
                        <span className="font-black text-indigo-950 text-xs px-1">{applyWeekNum}</span>
                      ) : (
                        <input
                          type="number"
                          min={1}
                          max={52}
                          value={applyWeekNum}
                          onChange={e => setApplyWeekNum(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-11 bg-white border border-slate-300 rounded-md px-1 py-0.5 text-center font-black text-indigo-950 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 shadow-2xs print:border-none print:w-auto"
                          title="Thay đổi số tuần áp dụng"
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );

            return doorOnLeft ? [DoorBlock, BoardBlock, TeacherDeskBlock] : [TeacherDeskBlock, BoardBlock, DoorBlock];
          })()}
        </div>

        {/* BỐ CỤC CÁC TỔ & SỐ BÀN (KHỔ A4 NGANG / DỌC) */}
        <div className={`grid ${paperOrientation === 'landscape' ? 'grid-cols-1 md:grid-cols-2 gap-4' : 'grid-cols-1 gap-4'}`}>
          {teamsConfig.map(teamConf => {
            const teamName = teamConf.name;
            const teamStudents = students.filter(s => s.team.toLowerCase() === teamName.toLowerCase());

            // Render Tiêu đề Tổ
            const renderTeamHeaderUI = () => (
              <div className={viewPerspective === 'down' ? 'pt-2 border-t border-slate-100' : 'pb-2 border-b border-slate-100'}>
                <div className={`transition-transform duration-300 ${viewPerspective === 'down' ? 'rotate-180' : ''}`}>
                <div>
                  {editingTeamId === teamConf.id ? (
                    <div className="bg-indigo-50/90 border border-indigo-200 p-2.5 rounded-xl space-y-2 my-1 shadow-sm w-full max-w-xs">
                      <div className="flex items-center justify-between text-[11px] font-black text-indigo-900">
                        <span>ĐỔI TÊN {teamConf.name.toUpperCase()}:</span>
                        <button
                          onClick={() => setEditingTeamId(null)}
                          className="text-slate-400 hover:text-slate-600 text-xs font-bold"
                        >
                          ✕
                        </button>
                      </div>

                      {/* Chọn từ phân tổ dữ liệu học sinh */}
                      {classDataTeams.length > 0 && (
                        <div className="space-y-1">
                          <label className="text-[10px] font-extrabold text-slate-600 block">
                            Chọn từ phân tổ lớp:
                          </label>
                          <select
                            onChange={e => {
                              if (e.target.value) {
                                setEditingTeamName(e.target.value);
                              }
                            }}
                            className="w-full text-xs font-bold p-1.5 border border-indigo-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                          >
                            <option value="">-- Danh sách phân tổ trong dữ liệu --</option>
                            {classDataTeams.map(ct => (
                              <option key={ct} value={ct}>
                                📌 {ct} ({students.filter(s => s.team.toLowerCase() === ct.toLowerCase()).length} thành viên)
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Hoặc nhập tên ngoài */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-extrabold text-slate-600 block">
                          Hoặc nhập tên ngoài:
                        </label>
                        <input
                          type="text"
                          value={editingTeamName}
                          onChange={e => setEditingTeamName(e.target.value)}
                          placeholder="Nhập tên tổ..."
                          className="w-full text-xs font-extrabold p-1.5 border border-indigo-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500"
                          autoFocus
                        />
                      </div>

                      {/* Nút lưu & đồng bộ */}
                      <div className="flex items-center gap-1.5 pt-1">
                        <button
                          onClick={() => handleSaveTeamNameAndSync(teamConf.id, teamConf.name, editingTeamName)}
                          className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-black cursor-pointer shadow-xs transition-colors"
                        >
                          Lưu & Đồng bộ
                        </button>
                        <button
                          onClick={() => setEditingTeamId(null)}
                          className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                        >
                          Hủy
                        </button>
                      </div>
                    </div>
                  ) : (
                    <h3
                      onClick={() => {
                        setEditingTeamId(teamConf.id);
                        setEditingTeamName(teamConf.name);
                      }}
                      className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5 cursor-pointer hover:text-indigo-600 group"
                      title="Bấm để chọn hoặc chỉnh sửa tên Tổ"
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                      <span>{teamName}</span>
                      {!isExportingPNG && <Edit3 className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 opacity-80 transition-opacity" />}
                    </h3>
                  )}
                </div>

                {!isExportingPNG && (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80 px-2 py-0.5 rounded-full">
                      {teamStudents.length} học sinh
                    </span>

                    <button
                      onClick={() => handleResetTeamSeating(teamName)}
                      className="text-[10px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2 py-0.5 rounded-md flex items-center gap-1 cursor-pointer print:hidden"
                      title={`Xóa chỗ ngồi tất cả học sinh trong ${teamName}`}
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Xếp lại</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
            );

            return (
              <div
                key={teamConf.id}
                className="bg-white rounded-2xl border-3 border-slate-950 shadow-xs p-3.5 space-y-3 flex flex-col justify-between print:border-3 print:border-black print:shadow-none"
              >
                {/* Nhãn Tổ: Góc nhìn LÊN -> hiển thị trước các bàn */}
                {viewPerspective === 'up' && renderTeamHeaderUI()}

                {/* CÁC BÀN CỦA TỔ */}
                <div className="space-y-2.5 flex-1">
                  {teamConf.desks.map(deskNum => {
                    const deskStudents = teamStudents.filter(s => s.desk === deskNum);
                    const deskKey = `${teamName}_${deskNum}`;
                    const currentDeskSeats = customDeskSeats[deskKey] || seatsPerDesk;

                    return (
                      <div
                        key={`desk_${teamName}_${deskNum}`}
                        className="p-2 rounded-xl bg-slate-50/20 border-2 border-dashed border-slate-900 space-y-1.5 shadow-2xs print:bg-white print:border-2 print:border-dashed print:border-black"
                      >
                        {!isExportingPNG && (
                          <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase px-1 print:hidden">
                            <div className="flex items-center gap-1.5">
                              <span className="text-amber-900 font-extrabold">Bàn {deskNum}</span>
                              <div className="flex items-center gap-1 bg-white border border-amber-300 rounded-md px-1 py-0.5 shadow-2xs">
                                <span className="text-[9px] font-extrabold text-amber-900">Số ghế:</span>
                                <select
                                  value={currentDeskSeats}
                                  onChange={e => {
                                    const val = parseInt(e.target.value);
                                    setCustomDeskSeats(prev => ({ ...prev, [deskKey]: val }));
                                  }}
                                  className="bg-transparent text-amber-900 text-[10px] font-black focus:outline-hidden cursor-pointer"
                                  title="Đổi số ghế của riêng bàn này"
                                >
                                  <option value={2}>2</option>
                                  <option value={3}>3</option>
                                  <option value={4}>4</option>
                                  <option value={5}>5</option>
                                  <option value={6}>6</option>
                                </select>
                              </div>
                            </div>
                            <span className="text-slate-500 font-mono font-bold">{deskStudents.length}/{currentDeskSeats} ghế</span>
                          </div>
                        )}

                        {/* MỖI BÀN LÀ 1 HÀNG NGANG VỚI SỐ GHẾ ĐỘNG (2, 3, 4, 5, 6 GHẾ) */}
                         <div className={`grid ${getDeskGridColsClass(currentDeskSeats)} gap-1.5 items-center`}>
                          {(() => {
                            const items = currentDeskSeats === 2 ? [1, 'spacer', 2] : Array.from({ length: currentDeskSeats }, (_, i) => i + 1);
                            return items.map((item, idx) => {
                              if (item === 'spacer') {
                                return (
                                  <div
                                    key={`spacer_${teamName}_${deskNum}_${idx}`}
                                    className="h-full pointer-events-none"
                                  />
                                );
                              }

                              const colNum = item as number;
                              const student = deskStudents.find(
                                s => s.seatCol === colNum || (!s.seatCol && deskStudents.indexOf(s) === colNum - 1)
                              );

                              const isSelected =
                                selectedSeat?.team.toLowerCase() === teamName.toLowerCase() &&
                                selectedSeat?.desk === deskNum &&
                                selectedSeat?.seatCol === colNum;

                              if (student) {
                                const isMe = student.id === currentStudentId;
                                const isFemale = student.gender.toLowerCase() === 'nữ' || student.gender.toLowerCase() === 'nu';

                                const execBadge = student.titles.find(t => EXEC_TITLES.includes(t.toUpperCase()));
                                const doanBadge = student.titles.find(t => DOAN_TITLES.includes(t.toUpperCase()));
                                const teamBadge = student.titles.find(t => TEAM_TITLES.includes(t.toUpperCase()));
                                const subjectBadge = student.titles.find(t =>
                                  SUBJECT_TITLES.some(st => t.toUpperCase().includes(st))
                                );

                                return (
                                  <div
                                    key={student.id}
                                    draggable={!isExportingPNG}
                                    onDragStart={e => handleDragStart(e, student.id)}
                                    onClick={() => !isExportingPNG && handleSelectSeat(teamName, deskNum, colNum)}
                                    className={`w-full rounded-2xl p-0.5 ${!isExportingPNG ? 'cursor-pointer transition-all' : ''} ${
                                      isSelected && !isExportingPNG
                                        ? 'ring-4 ring-indigo-600 shadow-md scale-105 bg-indigo-100/80 z-10'
                                        : !isExportingPNG ? 'hover:ring-2 hover:ring-indigo-400' : ''
                                    }`}
                                    title={!isExportingPNG ? "Bấm để đổi học sinh hoặc hủy xếp chỗ" : undefined}
                                  >
                                    <StudentCardBox
                                      isFemale={isFemale}
                                      dieuHanh={execBadge}
                                      to={teamBadge}
                                      doan={doanBadge}
                                      mon={subjectBadge}
                                      nickname={student.nickname || student.name.trim().split(/\s+/).pop() || student.name}
                                      fullName={student.name}
                                      isMe={isMe}
                                      rotate180={viewPerspective === 'down'}
                                    />
                                  </div>
                                );
                              }

                              // Nếu đang xuất PNG: trả về khung ghế trống sạch sẽ không chữ
                              if (isExportingPNG) {
                                return (
                                  <div
                                    key={`empty_${teamName}_${deskNum}_col_${colNum}`}
                                    className="min-h-[92px] border-2 border-dashed border-amber-200/50 rounded-2xl bg-white/50"
                                  />
                                );
                              }

                              // Nếu ghế trống trong chế độ sửa: Bấm vào để mở Thanh Nổi hoặc Kéo thả vào
                              return (
                                <div
                                  key={`empty_${teamName}_${deskNum}_col_${colNum}`}
                                  onDragOver={handleDragOver}
                                  onDrop={e => handleDropOnSeat(e, teamName, deskNum, colNum)}
                                  onClick={() => handleSelectSeat(teamName, deskNum, colNum)}
                                  className={`min-h-[95px] border-2 border-dashed rounded-2xl transition-all flex flex-col items-center justify-center p-1 text-center cursor-pointer group ${
                                    isSelected
                                      ? 'border-indigo-600 bg-indigo-100/90 ring-4 ring-indigo-500 shadow-md animate-pulse'
                                      : 'border-slate-300 bg-white/80 hover:bg-indigo-50/70 hover:border-indigo-400'
                                  }`}
                                  title={`Ghế ${colNum} bàn ${deskNum} trống (Bấm để chọn học sinh)`}
                                >
                                  <span className="text-[9px] font-mono font-bold text-slate-400 group-hover:text-indigo-600">
                                    G{colNum}
                                  </span>
                                  <span className="text-slate-300 group-hover:text-indigo-500 text-xl font-light">
                                    +
                                  </span>
                                  <span className="text-[9px] font-bold text-indigo-600 group-hover:underline">
                                    Chọn HS
                                  </span>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Nhãn Tổ: Góc nhìn XUỐNG -> hiển thị sau bàn cuối */}
                {viewPerspective === 'down' && renderTeamHeaderUI()}
              </div>
            );
          })}
        </div>
      </div>

      {/* FOOTER CỐ ĐỊNH THỐNG KÊ LỚP HỌC */}
      <div id="seating-footer-stats" className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4 print:p-2 print:border-t print:rounded-none">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
          <GraduationCap className="w-4 h-4 text-indigo-600" />
          <span>THỐNG KÊ LỚP HỌC:</span>
          <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100 font-extrabold text-sm">
            Sĩ số: {totalStudents} (Đã xếp: {assignedCount} | Chưa xếp: {unassignedStudents.length} | Nữ: {femaleCount})
          </span>
        </div>

        <div className="text-xs text-slate-500 font-medium flex items-center gap-2 print:hidden">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Bấm ô ghế để chọn nhanh • Kéo thả linh hoạt • Đồng bộ Google Drive</span>
        </div>
      </div>

      {/* THANH BÀN CHỌN HỌC SINH NỔI (FLOATING SLIDE-OVER DRAWER) */}
      {isPickerOpen && selectedSeat && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex justify-end animate-in fade-in duration-200 print:hidden">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col p-5 space-y-4 border-l border-slate-200 animate-in slide-in-from-right duration-250">
            
            {/* Header Thanh Nổi */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 block">
                  🎯 Đang Chọn Ghế Trên Sơ Đồ
                </span>
                <h2 className="text-lg font-black text-slate-900">
                  {selectedSeat.team} • Bàn {selectedSeat.desk} • Ghế {selectedSeat.seatCol}
                </h2>
              </div>
              <button
                onClick={() => setIsPickerOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Thông tin học sinh hiện tại ngồi ở ghế này (nếu có) */}
            {currentOccupant ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 overflow-hidden">
                  <div className="w-8 h-8 rounded-full bg-white border border-amber-300 flex items-center justify-center shrink-0">
                    {currentOccupant.gender.toLowerCase() === 'nữ' ? (
                      <IconNu className="w-7 h-7 text-rose-600" />
                    ) : (
                      <IconNam className="w-7 h-7 text-indigo-700" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-amber-800 uppercase block">Đang ngồi ở ghế này:</span>
                    <span className="text-xs font-black text-slate-900 truncate block">
                      {currentOccupant.name} ({currentOccupant.nickname || 'Không biệt danh'})
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleRemoveStudentFromSelectedSeat}
                  className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shrink-0 flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Hủy ghế</span>
                </button>
              </div>
            ) : (
              <div className="p-2.5 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-800 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>Vị trí ghế này đang trống! Hãy chọn 1 học sinh bên dưới.</span>
              </div>
            )}

            {/* Ô tìm kiếm học sinh */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={pickerSearch}
                onChange={e => setPickerSearch(e.target.value)}
                placeholder="Tìm tên hoặc biệt danh học sinh..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            {/* 2 Dropdown lọc chính trong Thanh Nổi */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 border border-slate-200 p-2.5 rounded-2xl">
              {/* Dropdown 1: Tổ n hay cả lớp */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-1">
                  <Filter className="w-3 h-3 text-indigo-600" />
                  <span>Phạm vi Tổ:</span>
                </label>
                <select
                  value={pickerTeamFilter}
                  onChange={e => setPickerTeamFilter(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-slate-900 text-xs font-extrabold rounded-xl p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden cursor-pointer"
                >
                  <option value="all">🌟 Cả lớp (Tất cả Tổ)</option>
                  <option value="none">⚠️ Chưa xếp Tổ</option>
                  {teamsConfig.map(tc => (
                    <option key={tc.id} value={tc.name}>
                      📌 {tc.name} ({students.filter(s => s.team.toLowerCase() === tc.name.toLowerCase()).length} HS)
                    </option>
                  ))}
                </select>
              </div>

              {/* Dropdown 2: Tất cả hay chưa xếp chỗ */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-1">
                  <Filter className="w-3 h-3 text-indigo-600" />
                  <span>Trạng thái chỗ:</span>
                </label>
                <select
                  value={pickerStatusFilter}
                  onChange={e => setPickerStatusFilter(e.target.value as 'unassigned' | 'all' | 'assigned')}
                  className="w-full bg-white border border-slate-200 text-slate-900 text-xs font-extrabold rounded-xl p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden cursor-pointer"
                >
                  <option value="unassigned">⏳ Chưa xếp chỗ ({unassignedStudents.length})</option>
                  <option value="all">👥 Tất cả cả lớp ({totalStudents})</option>
                  <option value="assigned">✅ Đã xếp chỗ ({assignedCount})</option>
                </select>
              </div>
            </div>

            {/* Danh sách học sinh chọn nhanh */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {filteredPickerStudents.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 italic bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  Không tìm thấy học sinh nào phù hợp!
                </div>
              ) : (
                filteredPickerStudents.map(st => {
                  const isFemale = st.gender.toLowerCase() === 'nữ' || st.gender.toLowerCase() === 'nu';
                  const isCurrentSitting = currentOccupant?.id === st.id;

                  return (
                    <div
                      key={st.id}
                      onClick={() => {
                        if (!isCurrentSitting) {
                          handleAssignStudentToSelectedSeat(st.id);
                        }
                      }}
                      className={`p-3 rounded-2xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                        isCurrentSitting
                          ? 'bg-amber-50 border-amber-300 opacity-60 pointer-events-none'
                          : 'bg-slate-50 hover:bg-indigo-50 border-slate-200 hover:border-indigo-300 hover:shadow-xs'
                      }`}
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center shrink-0">
                          {isFemale ? (
                            <IconNu className="w-8 h-8 text-rose-600" />
                          ) : (
                            <IconNam className="w-8 h-8 text-indigo-700" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-extrabold text-xs text-slate-900 truncate">
                            {st.name} {st.nickname ? `(${st.nickname})` : ''}
                          </div>
                          <div className="text-[10px] text-slate-500 truncate">
                            {st.team && st.desk
                              ? `Đang ngồi: ${st.team} • Bàn ${st.desk} • Ghế ${st.seatCol}`
                              : 'Chưa xếp chỗ ngồi'}
                          </div>
                        </div>
                      </div>

                      <button
                        disabled={isCurrentSitting}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-colors ${
                          isCurrentSitting
                            ? 'bg-slate-200 text-slate-500'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs'
                        }`}
                      >
                        {isCurrentSitting
                          ? 'Đang ngồi'
                          : st.team && st.desk
                          ? 'Đổi chỗ'
                          : 'Xếp vào đây'}
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer đóng */}
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Bấm vào học sinh để chọn nhanh
              </span>
              <button
                onClick={() => setIsPickerOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl cursor-pointer transition-colors"
              >
                Đóng
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Google Drive Files Picker Modal */}
      {driveFilesModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200 print:hidden">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-indigo-50/50">
              <div className="flex items-center gap-2 text-indigo-900">
                <Cloud className="w-5 h-5 text-indigo-600" />
                <h3 className="font-black text-sm uppercase tracking-wide">
                  Google Drive • Sơ đồ lớp
                </h3>
              </div>
              <button
                onClick={() => setDriveFilesModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List */}
            <div className="p-4 overflow-y-auto space-y-2.5 flex-1">
              <p className="text-xs text-slate-500 font-medium">
                Thư mục mặc định: <span className="font-bold text-slate-700">myApp\LopU\SoDoLop</span>. Chọn file sơ đồ lớp trên Drive để nạp trực tiếp vào ứng dụng:
              </p>

              {isLoadingDriveFiles ? (
                <div className="p-8 text-center text-xs text-indigo-600 bg-indigo-50/50 border border-dashed border-indigo-200 rounded-2xl flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-indigo-600" />
                  <span className="font-bold">Đang quét tìm các file sơ đồ lớp từ Google Drive...</span>
                </div>
              ) : driveFiles.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-600 bg-slate-50 border border-dashed border-slate-300 rounded-2xl space-y-3">
                  <div className="font-extrabold text-amber-800 flex items-center justify-center gap-1.5 text-sm">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Chưa tìm thấy file sơ đồ lớp nào!</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed text-left bg-white p-3 rounded-xl border border-slate-200">
                    💡 <strong>Tại sao chưa thấy sơ đồ lớp hoặc báo hết hạn (401)?</strong><br />
                    • <strong>Phiên kết nối hết hạn:</strong> Nếu phiên làm việc Google Drive hết hạn, hãy bấm nút kết nối bên dưới để xác thực lại.<br />
                    • <strong>Cách ly tên miền (LocalStorage):</strong> Dữ liệu sơ đồ lưu ở tên miền preview cũ được trình duyệt bảo mật cách ly.<br />
                    • <strong>Giải pháp 1:</strong> Bấm nút <strong>"Tải lên Drive"</strong> từ sơ đồ hiện tại để lưu lên Google Drive cloud.<br />
                    • <strong>Giải pháp 2:</strong> Bấm nút <strong>"Nạp file JSON"</strong> trên thanh công cụ để nạp file từ máy tính.
                  </p>
                  <button
                    type="button"
                    onClick={async () => {
                      setIsLoadingDriveFiles(true);
                      const res = await connectGoogleDrive();
                      if (res.success) {
                        setSyncMessage(res.message);
                        const seatingFiles = await fetchSeatingChartsFromDrive();
                        setDriveFiles(seatingFiles);
                      } else {
                        alert(res.message || 'Chưa thể kết nối Google Drive.');
                      }
                      setIsLoadingDriveFiles(false);
                    }}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
                  >
                    <Cloud className="w-4 h-4" />
                    <span>🔑 Bấm Kết Nối / Xác Thực Google Drive Trực Tiếp</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {driveFiles.map(file => (
                    <div
                      key={file.id}
                      className="p-3 bg-slate-50 hover:bg-indigo-50/50 border border-slate-100 hover:border-indigo-200 rounded-2xl flex items-center justify-between gap-3 transition-all shadow-2xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-extrabold text-xs text-slate-900 truncate" title={file.name}>
                          {file.name}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5 font-semibold">
                          <span>📅 {file.modifiedTime}</span>
                          <span>•</span>
                          <span>📦 {file.size}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleApplyDriveFile(file)}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-black cursor-pointer shadow-3xs transition-colors flex items-center gap-1"
                          title="Nạp dữ liệu sơ đồ lớp này trực tiếp vào ứng dụng"
                        >
                          <Zap className="w-3.5 h-3.5" />
                          <span>🚀 Nạp vào app ngay</span>
                        </button>
                        <button
                          onClick={() => downloadFileJson({ ...file })}
                          className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-xl cursor-pointer transition-colors border border-transparent hover:border-indigo-200"
                          title="Tải file JSON về máy tính (Tùy chọn)"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteDriveFile(file)}
                          className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl cursor-pointer transition-colors border border-transparent hover:border-rose-200"
                          title="Xóa vĩnh viễn file này khỏi Drive & Hệ thống"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
              <button
                onClick={() => setDriveFilesModalOpen(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cài Đặt Điều Kiện Xếp Chỗ Cho Giáo Viên */}
      {showRulesModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-5 animate-in fade-in duration-200 print:hidden overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full my-auto overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-purple-50 to-indigo-50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-purple-600 text-white rounded-2xl shadow-sm">
                  <SlidersHorizontal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg text-slate-900 tracking-tight flex items-center gap-2">
                    <span>Cài Đặt Điều Kiện Xếp Sơ Đồ Lớp</span>
                    <span className="text-xs font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md">Dành cho Giáo viên</span>
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Thiết lập danh sách không gần nhau, vị trí bàn cố định và cặp đôi cùng tiến cho lớp <span className="font-bold text-purple-700">{headerInfo.className}</span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowRulesModal(false)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              
              {/* TRƯỜNG 1: HỌC SINH KHÔNG ĐƯỢC GẦN NHAU (HỖ TRỢ NHIỀU NHÓM TÁCH RIÊNG) */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-extrabold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    <span>1. Danh sách học sinh không được gần nhau</span>
                  </label>
                  <span className="text-[11px] text-slate-500 italic">Hỗ trợ nhiều nhóm khác nhau</span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  💡 <strong>Quy tắc tách nhiều nhóm:</strong> Có thể thêm <strong>nhiều nhóm bạn không ngồi gần nhau khác nhau</strong>. Các học sinh thuộc cùng một nhóm sẽ được tách xa nhau ít nhất 1 bạn (ví dụ: <em>Nhóm 1: Bạn A - Bạn B; Nhóm 2: Bạn C - Bạn D - Bạn E</em>).
                </p>

                {/* Form ghép thêm nhóm mới hỗ trợ không giới hạn số lượng học sinh (2, 3, 4, 5... bạn) */}
                <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-800 block">
                      + Tạo nhóm không gần nhau mới (Có thể chọn 2, 3, 4, 5... học sinh vào 1 nhóm):
                    </span>
                    {newAvoidGroupMembers.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setNewAvoidGroupMembers([])}
                        className="text-[10px] font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        Xóa chọn
                      </button>
                    )}
                  </div>

                  {/* Dropdown chọn học sinh để thêm vào nhóm mới */}
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-purple-500 focus:outline-hidden cursor-pointer"
                      defaultValue=""
                      onChange={e => {
                        const val = e.target.value;
                        if (!val) return;
                        if (!newAvoidGroupMembers.some(x => x.toLowerCase() === val.toLowerCase())) {
                          setNewAvoidGroupMembers(prev => [...prev, val]);
                        }
                        e.target.value = '';
                      }}
                    >
                      <option value="" disabled>+ Chọn học sinh để thêm vào nhóm mới...</option>
                      {students.map(s => {
                        const display = s.nickname || s.name;
                        if (newAvoidGroupMembers.some(x => x.toLowerCase() === display.toLowerCase())) return null;
                        return (
                          <option key={s.id} value={display}>
                            {display} {s.nickname ? `(${s.name})` : ''}
                          </option>
                        );
                      })}
                    </select>

                    <button
                      type="button"
                      disabled={newAvoidGroupMembers.length < 2}
                      onClick={() => {
                        if (newAvoidGroupMembers.length < 2) return;
                        const currentGroups = parseAvoidNearGroups(seatingRules.avoidNearStudents);
                        currentGroups.push([...newAvoidGroupMembers]);
                        setSeatingRules(prev => ({ ...prev, avoidNearStudents: formatAvoidNearGroups(currentGroups) }));
                        setNewAvoidGroupMembers([]);
                      }}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs ${
                        newAvoidGroupMembers.length >= 2
                          ? 'bg-rose-600 hover:bg-rose-700 text-white cursor-pointer'
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      + Lưu Nhóm Mới ({newAvoidGroupMembers.length} bạn)
                    </button>
                  </div>

                  {/* Danh sách thẻ các bạn đang được chọn cho nhóm mới */}
                  {newAvoidGroupMembers.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1 bg-slate-50 p-2 rounded-lg border border-slate-200">
                      <span className="text-[10px] font-extrabold text-slate-500 uppercase mr-1">Các thành viên nhóm mới:</span>
                      {newAvoidGroupMembers.map((name, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-100 border border-rose-300 text-rose-900 font-extrabold rounded-md text-[11px]"
                        >
                          <span>{name}</span>
                          <button
                            type="button"
                            onClick={() => setNewAvoidGroupMembers(prev => prev.filter((_, i) => i !== idx))}
                            className="text-rose-500 hover:text-rose-800 font-black cursor-pointer ml-0.5"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Danh sách các nhóm hiện có */}
                {(() => {
                  const avoidGroups = parseAvoidNearGroups(seatingRules.avoidNearStudents);
                  if (avoidGroups.length === 0) return null;

                  return (
                    <div className="space-y-2 pt-1">
                      <span className="text-[11px] font-bold text-slate-700 block">Các nhóm học sinh không gần nhau hiện tại:</span>
                      <div className="space-y-2">
                        {avoidGroups.map((groupNames, gIdx) => (
                          <div key={gIdx} className="bg-white border border-rose-200 rounded-xl p-2.5 space-y-2 shadow-2xs">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-extrabold text-rose-900 text-[11px]">
                                🚫 Nhóm {gIdx + 1} ({groupNames.length} bạn không được ngồi gần nhau):
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  const groups = parseAvoidNearGroups(seatingRules.avoidNearStudents);
                                  groups.splice(gIdx, 1);
                                  setSeatingRules(prev => ({ ...prev, avoidNearStudents: formatAvoidNearGroups(groups) }));
                                }}
                                className="text-[10px] text-rose-500 hover:text-rose-700 hover:bg-rose-50 font-bold px-2 py-0.5 rounded-md cursor-pointer transition-colors"
                              >
                                Xóa nhóm {gIdx + 1}
                              </button>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5">
                              {groupNames.map((name, nIdx) => (
                                <span
                                  key={nIdx}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 border border-rose-200 text-rose-800 font-bold rounded-lg text-[11px]"
                                >
                                  <span>{name}</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const groups = parseAvoidNearGroups(seatingRules.avoidNearStudents);
                                      if (groups[gIdx]) {
                                        groups[gIdx] = groups[gIdx].filter(x => x.toLowerCase() !== name.toLowerCase());
                                        if (groups[gIdx].length === 0) {
                                          groups.splice(gIdx, 1);
                                        }
                                      }
                                      setSeatingRules(prev => ({ ...prev, avoidNearStudents: formatAvoidNearGroups(groups) }));
                                    }}
                                    className="text-rose-400 hover:text-rose-700 cursor-pointer font-black"
                                    title={`Xóa ${name} khỏi Nhóm ${gIdx + 1}`}
                                  >
                                    ×
                                  </button>
                                </span>
                              ))}

                              {/* Dropdown thêm bạn vào nhóm này */}
                              <select
                                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-700 cursor-pointer focus:outline-hidden"
                                defaultValue=""
                                onChange={e => {
                                  const val = e.target.value;
                                  if (!val) return;
                                  const groups = parseAvoidNearGroups(seatingRules.avoidNearStudents);
                                  if (groups[gIdx] && !groups[gIdx].some(x => x.toLowerCase() === val.toLowerCase())) {
                                    groups[gIdx].push(val);
                                    setSeatingRules(prev => ({ ...prev, avoidNearStudents: formatAvoidNearGroups(groups) }));
                                  }
                                  e.target.value = '';
                                }}
                              >
                                <option value="" disabled>+ Thêm bạn vào Nhóm {gIdx + 1}...</option>
                                {students.map(s => {
                                  const display = s.nickname || s.name;
                                  if (groupNames.some(x => x.toLowerCase() === display.toLowerCase())) return null;
                                  return <option key={s.id} value={display}>{display}</option>;
                                })}
                              </select>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Nhập / Sửa trực tiếp chuỗi */}
                <div className="space-y-1 pt-1">
                  <span className="text-[10px] font-bold text-slate-400 block">
                    Hoặc chỉnh sửa trực tiếp chuỗi (Các nhóm cách nhau bởi dấu ;, các bạn trong nhóm cách nhau bởi gạch ngang -):
                  </span>
                  <input
                    type="text"
                    value={seatingRules.avoidNearStudents}
                    onChange={e => setSeatingRules(prev => ({ ...prev, avoidNearStudents: e.target.value }))}
                    placeholder="Ví dụ: Bạn A - Bạn B; Bạn C - Bạn D - Bạn E"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* TRƯỜNG 2: VỊ TRÍ BÀN CỐ ĐỊNH */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="font-extrabold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-600" />
                    <span>2. Danh sách học sinh có những vị trí bàn cố định</span>
                  </label>
                  <span className="text-[11px] text-slate-500 italic">bàn x-dãy y-Gz (cách nhau bởi ;)</span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  💡 <strong>Cấu trúc:</strong> Mỗi học sinh có thể chọn <strong>nhiều vị trí cùng lúc</strong> hoặc chọn bằng <strong>nút chọn nhanh cả Bàn, cả Dãy, cả Tổ</strong> bên dưới.
                </p>

                {/* Form chọn học sinh & thanh nút chọn nhanh */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3.5 shadow-2xs">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Chọn Học sinh (Biệt danh):</span>
                      <select
                        id="fixed-seat-student-select"
                        className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-hidden cursor-pointer"
                        value={fixedFormStudent || (students[0]?.nickname || students[0]?.name || '')}
                        onChange={e => setFixedFormStudent(e.target.value)}
                      >
                        {students.map(s => {
                          const display = s.nickname || s.name;
                          return (
                            <option key={s.id} value={display}>
                              {display} {s.nickname ? `(${s.name})` : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Chọn Bàn:</span>
                      <select
                        id="fixed-seat-desk-select"
                        className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-hidden cursor-pointer"
                        value={fixedFormDesk}
                        onChange={e => {
                          const newDesk = Number(e.target.value);
                          setFixedFormDesk(newDesk);
                          const maxSeats = getDeskSeatCount(newDesk, fixedFormRow);
                          if (fixedFormCol > maxSeats) {
                            setFixedFormCol(1);
                          }
                        }}
                      >
                        {[1, 2, 3, 4, 5, 6].map(d => (
                          <option key={d} value={d}>Bàn {d}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Chọn Dãy:</span>
                      <select
                        id="fixed-seat-row-select"
                        className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-hidden cursor-pointer"
                        value={fixedFormRow}
                        onChange={e => {
                          const newRow = Number(e.target.value);
                          setFixedFormRow(newRow);
                          const maxSeats = getDeskSeatCount(fixedFormDesk, newRow);
                          if (fixedFormCol > maxSeats) {
                            setFixedFormCol(1);
                          }
                        }}
                      >
                        <option value={1}>Dãy 1 (Tổ 1 & 2)</option>
                        <option value={2}>Dãy 2 (Tổ 3 & 4)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">
                        Vị trí Ghế ({getDeskSeatCount(fixedFormDesk, fixedFormRow)} ghế):
                      </span>
                      <select
                        id="fixed-seat-col-select"
                        className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-hidden cursor-pointer"
                        value={Math.min(fixedFormCol, getDeskSeatCount(fixedFormDesk, fixedFormRow))}
                        onChange={e => setFixedFormCol(Number(e.target.value))}
                      >
                        {Array.from({ length: getDeskSeatCount(fixedFormDesk, fixedFormRow) }, (_, i) => i + 1).map(g => (
                          <option key={g} value={g}>Ghế G{g}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2 mt-5">
                      <button
                        type="button"
                        onClick={() => {
                          const nick = fixedFormStudent || (students[0]?.nickname || students[0]?.name || '');
                          const desk = fixedFormDesk;
                          const row = fixedFormRow;
                          const currentDeskCap = getDeskSeatCount(desk, row);
                          const seatCol = Math.min(fixedFormCol, currentDeskCap);

                          if (!nick) return;
                          toggleFixedSeatPosition(nick, desk, row, seatCol);
                        }}
                        className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors"
                      >
                        + Thêm 1 Ghế
                      </button>

                      <button
                        type="button"
                        onClick={() => handleQuickSelectPositions('desk', { desk: fixedFormDesk, row: fixedFormRow })}
                        className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors"
                        title={`Thêm / Bỏ chọn toàn bộ ghế Bàn ${fixedFormDesk} - Dãy ${fixedFormRow}`}
                      >
                        + Thêm Cả Bàn {fixedFormDesk}
                      </button>
                    </div>
                  </div>

                  {/* Nút chọn nhanh Cả Tổ, Cả Dãy, Xóa vị trí */}
                  {(() => {
                    const currentNick = fixedFormStudent || (students[0]?.nickname || students[0]?.name || '');
                    const currentRule = seatingRules.fixedSeatRules?.find(r => isStudentMatch(r.studentNickname, currentNick, students));
                    const posCount = currentRule?.positions.length || 0;

                    return (
                      <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-xl p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-extrabold text-indigo-900 flex items-center gap-1.5">
                            <Zap className="w-3.5 h-3.5 text-indigo-600" />
                            <span>NÚT CHỌN NHANH VỊ TRÍ Cho "{currentNick}" ({posCount} vị trí đã chọn):</span>
                          </span>
                          {posCount > 0 && (
                            <button
                              type="button"
                              onClick={() => handleQuickSelectPositions('clear')}
                              className="text-[10px] font-extrabold text-rose-600 hover:text-rose-800 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md cursor-pointer transition-colors"
                            >
                              🗑️ Xóa vị trí HS này
                            </button>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                          <span className="text-[10px] font-extrabold text-slate-500 uppercase mr-1">⚡ Chọn Cả Tổ:</span>
                          {['Tổ 1', 'Tổ 2', 'Tổ 3', 'Tổ 4'].map((tName, tIdx) => (
                            <button
                              key={tName}
                              type="button"
                              onClick={() => handleQuickSelectPositions('team', { teamId: `team_${tIdx + 1}` })}
                              className="px-2.5 py-1 bg-white hover:bg-indigo-100 text-indigo-900 border border-indigo-200 text-[11px] font-black rounded-lg shadow-3xs cursor-pointer transition-colors"
                              title={`Chọn / Bỏ chọn toàn bộ ghế trong ${tName}`}
                            >
                              ⚡ {tName}
                            </button>
                          ))}

                          <span className="text-[10px] font-extrabold text-slate-500 uppercase ml-2 mr-1">| ⚡ Chọn Cả Dãy:</span>
                          <button
                            type="button"
                            onClick={() => handleQuickSelectPositions('row', { row: 1 })}
                            className="px-2.5 py-1 bg-white hover:bg-indigo-100 text-indigo-900 border border-indigo-200 text-[11px] font-black rounded-lg shadow-3xs cursor-pointer transition-colors"
                            title="Chọn / Bỏ chọn toàn bộ ghế Dãy 1 (Bàn 1-6)"
                          >
                            ⚡ Dãy 1
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickSelectPositions('row', { row: 2 })}
                            className="px-2.5 py-1 bg-white hover:bg-indigo-100 text-indigo-900 border border-indigo-200 text-[11px] font-black rounded-lg shadow-3xs cursor-pointer transition-colors"
                            title="Chọn / Bỏ chọn toàn bộ ghế Dãy 2 (Bàn 1-6)"
                          >
                            ⚡ Dãy 2
                          </button>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Banner hiển thị học sinh đang được chọn để gán ghế */}
                  <div className="flex items-center justify-between bg-purple-100/80 border border-purple-300 p-2.5 rounded-xl text-xs font-bold text-purple-950 shadow-2xs">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-purple-700 shrink-0 animate-bounce" />
                      <span>
                        Đang chọn vị trí cố định cho: <strong className="text-purple-800 text-sm font-black underline decoration-purple-400">{fixedFormStudent || (students[0]?.nickname || students[0]?.name || '')}</strong>
                      </span>
                    </div>
                    <span className="text-[10px] text-purple-700 font-semibold italic">
                      (Bấm trỏ chuột vào ô ghế bất kỳ trên sơ đồ để thêm hoặc bỏ chọn)
                    </span>
                  </div>

                  {/* Sơ đồ bàn tương tác KHÔNG CÓ TÊN HỌC SINH để trỏ chuột bấm chọn vị trí */}
                  <div className="space-y-2 border-t border-slate-100 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-purple-600" />
                        <span>Trỏ chuột chọn trực tiếp trên sơ đồ bàn lớp học:</span>
                      </span>
                      <span className="text-[10px] text-slate-400">Bấm ô ghế/nút Cả bàn để chọn/bỏ vị trí cho học sinh</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 bg-slate-50/70 p-3 rounded-xl border border-slate-200">
                      {/* Cột Dãy 1 */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                          <span className="font-extrabold text-[11px] text-indigo-900">
                            DÃY 1 (Tổ 1 & Tổ 2)
                          </span>
                          <button
                            type="button"
                            onClick={() => handleQuickSelectPositions('row', { row: 1 })}
                            className="text-[10px] font-extrabold text-indigo-700 hover:text-indigo-900 bg-white border border-indigo-200 px-2 py-0.5 rounded-md cursor-pointer transition-colors shadow-3xs"
                            title="Chọn / Bỏ chọn tất cả ghế Dãy 1"
                          >
                            ⚡ Cả Dãy 1
                          </button>
                        </div>

                        <div className="space-y-1.5">
                          {[1, 2, 3, 4, 5, 6].map(deskNum => {
                            const currentCap = getDeskSeatCount(deskNum, 1);
                            return (
                              <div key={deskNum} className="flex items-center justify-between gap-1 bg-white p-1.5 rounded-lg border border-slate-200">
                                <div className="flex items-center gap-1 shrink-0">
                                  <span className="text-[10px] font-bold text-slate-500">Bàn {deskNum}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleQuickSelectPositions('desk', { desk: deskNum, row: 1 })}
                                    className="text-[9px] font-extrabold text-indigo-700 hover:bg-indigo-50 border border-indigo-200 px-1 py-0.5 rounded cursor-pointer transition-colors"
                                    title={`Chọn / Bỏ chọn cả Bàn ${deskNum} - Dãy 1`}
                                  >
                                    ⚡ Cả bàn
                                  </button>
                                </div>

                                <div className="flex items-center gap-1 flex-1 justify-end">
                                  {Array.from({ length: currentCap }, (_, i) => i + 1).map(gNum => {
                                    const currentNick = fixedFormStudent || (students[0]?.nickname || students[0]?.name || '');
                                    const studentRule = seatingRules.fixedSeatRules?.find(r => isStudentMatch(r.studentNickname, currentNick, students));
                                    const isSelected = studentRule?.positions.some(p => p.desk === deskNum && p.row === 1 && p.seatCol === gNum);

                                    return (
                                      <button
                                        key={gNum}
                                        type="button"
                                        onClick={() => {
                                          const nick = fixedFormStudent || (students[0]?.nickname || students[0]?.name || '');
                                          if (!nick) return;
                                          toggleFixedSeatPosition(nick, deskNum, 1, gNum);
                                        }}
                                        className={`px-2 py-1 rounded-md text-[10px] font-bold border transition-all cursor-pointer ${
                                          isSelected
                                            ? 'bg-purple-600 text-white border-purple-700 shadow-2xs scale-105'
                                            : 'bg-slate-100 hover:bg-purple-50 text-slate-700 border-slate-200'
                                        }`}
                                        title={`Bàn ${deskNum} - Dãy 1 - Ghế G${gNum}`}
                                      >
                                        G{gNum}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Cột Dãy 2 */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                          <span className="font-extrabold text-[11px] text-indigo-900">
                            DÃY 2 (Tổ 3 & Tổ 4)
                          </span>
                          <button
                            type="button"
                            onClick={() => handleQuickSelectPositions('row', { row: 2 })}
                            className="text-[10px] font-extrabold text-indigo-700 hover:text-indigo-900 bg-white border border-indigo-200 px-2 py-0.5 rounded-md cursor-pointer transition-colors shadow-3xs"
                            title="Chọn / Bỏ chọn tất cả ghế Dãy 2"
                          >
                            ⚡ Cả Dãy 2
                          </button>
                        </div>

                        <div className="space-y-1.5">
                          {[1, 2, 3, 4, 5, 6].map(deskNum => {
                            const currentCap = getDeskSeatCount(deskNum, 2);
                            return (
                              <div key={deskNum} className="flex items-center justify-between gap-1 bg-white p-1.5 rounded-lg border border-slate-200">
                                <div className="flex items-center gap-1 shrink-0">
                                  <span className="text-[10px] font-bold text-slate-500">Bàn {deskNum}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleQuickSelectPositions('desk', { desk: deskNum, row: 2 })}
                                    className="text-[9px] font-extrabold text-indigo-700 hover:bg-indigo-50 border border-indigo-200 px-1 py-0.5 rounded cursor-pointer transition-colors"
                                    title={`Chọn / Bỏ chọn cả Bàn ${deskNum} - Dãy 2`}
                                  >
                                    ⚡ Cả bàn
                                  </button>
                                </div>

                                <div className="flex items-center gap-1 flex-1 justify-end">
                                  {Array.from({ length: currentCap }, (_, i) => i + 1).map(gNum => {
                                    const currentNick = fixedFormStudent || (students[0]?.nickname || students[0]?.name || '');
                                    const studentRule = seatingRules.fixedSeatRules?.find(r => isStudentMatch(r.studentNickname, currentNick, students));
                                    const isSelected = studentRule?.positions.some(p => p.desk === deskNum && p.row === 2 && p.seatCol === gNum);

                                    return (
                                      <button
                                        key={gNum}
                                        type="button"
                                        onClick={() => {
                                          const nick = fixedFormStudent || (students[0]?.nickname || students[0]?.name || '');
                                          if (!nick) return;
                                          toggleFixedSeatPosition(nick, deskNum, 2, gNum);
                                        }}
                                        className={`px-2 py-1 rounded-md text-[10px] font-bold border transition-all cursor-pointer ${
                                          isSelected
                                            ? 'bg-purple-600 text-white border-purple-700 shadow-2xs scale-105'
                                            : 'bg-slate-100 hover:bg-purple-50 text-slate-700 border-slate-200'
                                        }`}
                                        title={`Bàn ${deskNum} - Dãy 2 - Ghế G${gNum}`}
                                      >
                                        G{gNum}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Danh sách các quy tắc cố định hiện tại */}
                {seatingRules.fixedSeatRules && seatingRules.fixedSeatRules.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-bold text-slate-700">Các vị trí cố định đã cấu hình (Bấm vào thẻ học sinh để chọn thêm vị trí):</span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {seatingRules.fixedSeatRules.map((rule, idx) => {
                        const activeNick = fixedFormStudent || (students[0]?.nickname || students[0]?.name || '');
                        const isActive = isStudentMatch(rule.studentNickname, activeNick, students);

                        return (
                          <div
                            key={idx}
                            onClick={() => setFixedFormStudent(rule.studentNickname)}
                            className={`rounded-xl p-2.5 flex flex-col gap-2 transition-all cursor-pointer ${
                              isActive
                                ? 'bg-indigo-50/90 border-2 border-indigo-500 shadow-xs ring-2 ring-indigo-200'
                                : 'bg-white border border-slate-200 hover:border-indigo-300 shadow-2xs'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5">
                                <span className="font-extrabold text-xs text-purple-900">{rule.studentNickname}</span>
                                {isActive ? (
                                  <span className="px-2 py-0.5 bg-indigo-600 text-white text-[9px] font-black rounded-md animate-pulse">
                                    ✨ Đang chọn vị trí cho HS này
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold text-indigo-600 hover:underline">
                                    + Bấm chọn thêm vị trí
                                  </span>
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSeatingRules(prev => ({
                                    ...prev,
                                    fixedSeatRules: prev.fixedSeatRules.filter((_, i) => i !== idx),
                                  }));
                                }}
                                className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer"
                                title="Xóa toàn bộ quy tắc cố định của học sinh này"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Danh sách các vị trí dưới dạng pill có thể xóa lẻ */}
                            <div className="flex flex-wrap items-center gap-1">
                              {rule.positions.map((pos, pIdx) => (
                                <span
                                  key={pIdx}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100/80 border border-purple-200 text-purple-900 font-bold rounded-md text-[10px]"
                                >
                                  <span>{pos.label}</span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSeatingRules(prev => {
                                        const copy = [...(prev.fixedSeatRules || [])];
                                        if (copy[idx]) {
                                          copy[idx].positions = copy[idx].positions.filter((_, pi) => pi !== pIdx);
                                          copy[idx].rawText = copy[idx].positions.map(p => p.label).join('; ');
                                          if (copy[idx].positions.length === 0) {
                                            copy.splice(idx, 1);
                                          }
                                        }
                                        return { ...prev, fixedSeatRules: copy };
                                      });
                                    }}
                                    className="text-purple-500 hover:text-rose-600 font-black cursor-pointer ml-0.5"
                                    title={`Bỏ vị trí ${pos.label}`}
                                  >
                                    ×
                                  </button>
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* TRƯỜNG 3: CẶP ĐÔI CÙNG TIẾN */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-extrabold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>3. Danh sách Cặp đôi cùng tiến</span>
                  </label>
                  <span className="text-[11px] text-slate-500 italic">Cấu trúc: HS1 - HS2 (cách nhau bởi ;)</span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  💡 <strong>Quy tắc cặp đôi:</strong> Khi phân tự động sẽ xếp 2 bạn này ngồi <strong>cùng một bàn và ngồi cạnh nhau</strong> để hỗ trợ học tập tiến bộ.
                </p>

                {/* Chọn từ 2 dropdown để tạo cặp */}
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    id="pair-student-1"
                    className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                    defaultValue={students[0]?.nickname || students[0]?.name || ''}
                  >
                    {students.map(s => {
                      const display = s.nickname || s.name;
                      return <option key={s.id} value={display}>{display}</option>;
                    })}
                  </select>

                  <span className="font-extrabold text-slate-400">—</span>

                  <select
                    id="pair-student-2"
                    className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                    defaultValue={students[1]?.nickname || students[1]?.name || ''}
                  >
                    {students.map(s => {
                      const display = s.nickname || s.name;
                      return <option key={s.id} value={display}>{display}</option>;
                    })}
                  </select>

                  <button
                    type="button"
                    onClick={() => {
                      const s1 = (document.getElementById('pair-student-1') as HTMLSelectElement)?.value;
                      const s2 = (document.getElementById('pair-student-2') as HTMLSelectElement)?.value;
                      if (!s1 || !s2 || s1 === s2) return;

                      const pairStr = `${s1} - ${s2}`;
                      const currentPairs = seatingRules.studyPairs ? seatingRules.studyPairs.split(/[;,]+/).map(p => p.trim()).filter(Boolean) : [];
                      if (!currentPairs.includes(pairStr)) {
                        currentPairs.push(pairStr);
                        setSeatingRules(prev => ({ ...prev, studyPairs: currentPairs.join('; ') }));
                      }
                    }}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors"
                  >
                    + Ghép Cặp Đôi
                  </button>
                </div>

                <input
                  type="text"
                  value={seatingRules.studyPairs}
                  onChange={e => setSeatingRules(prev => ({ ...prev, studyPairs: e.target.value }))}
                  placeholder="Ví dụ: Bảo - Tuấn; Mai - Lan"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                />

                {/* Danh sách Tag cặp đôi */}
                {seatingRules.studyPairs && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {seatingRules.studyPairs.split(/[;,]+/).map(p => p.trim()).filter(Boolean).map((pair, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold rounded-lg text-[11px]"
                      >
                        <span>🤝 {pair}</span>
                        <button
                          onClick={() => {
                            const filtered = seatingRules.studyPairs
                              .split(/[;,]+/)
                              .map(p => p.trim())
                              .filter(p => p.toLowerCase() !== pair.toLowerCase());
                            setSeatingRules(prev => ({ ...prev, studyPairs: filtered.join('; ') }));
                          }}
                          className="text-emerald-400 hover:text-emerald-700 cursor-pointer font-black"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* TRƯỜNG 4: HIỂN THỊ CẢNH BÁO VI PHẠM & NÚT TỰ ĐỘNG SỬA VI PHẠM */}
              <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <label htmlFor="toggle-show-violation-warnings" className="font-extrabold text-slate-900 uppercase tracking-wide flex items-center gap-2 cursor-pointer select-none">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span>4. Cảnh báo vi phạm điều kiện xếp chỗ của Giáo viên</span>
                  </label>
                  
                  <div className="flex items-center gap-2 shrink-0 bg-white px-3 py-1.5 rounded-xl border border-amber-300 shadow-3xs">
                    <input
                      type="checkbox"
                      id="toggle-show-violation-warnings"
                      checked={showViolationWarnings}
                      onChange={e => handleToggleShowViolationWarnings(e.target.checked)}
                      className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500 cursor-pointer"
                    />
                    <label htmlFor="toggle-show-violation-warnings" className="text-xs font-bold text-purple-900 cursor-pointer select-none">
                      {showViolationWarnings ? 'Hiện Cảnh Báo & Nút Tự Động Sửa' : 'Ẩn Cảnh Báo & Nút Tự Động Sửa'}
                    </label>
                  </div>
                </div>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  💡 <strong>Quy tắc hoạt động:</strong> Khi tích chọn, hệ thống sẽ hiển thị ô cảnh báo đỏ (ví dụ: <em>"Phát hiện 3 vi phạm điều kiện xếp chỗ của Giáo viên"</em>) cùng nút <strong>"Tự động sửa vi phạm"</strong>. Khi bỏ chọn checkbox này, khung cảnh báo vi phạm và nút tự động sửa vi phạm sẽ ẩn đi hoàn toàn.
                </p>
              </div>

              {/* TRƯỜNG 5: KHÓA GIỮ NGUYÊN THÀNH VIÊN TỔ */}
              <div className="bg-sky-50/90 border border-sky-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <label className="font-extrabold text-slate-900 uppercase tracking-wide flex items-center gap-2 select-none">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-600" />
                    <span>5. Khóa không thay đổi thành viên của Tổ (Chỉ xáo trộn chỗ trong nội bộ Tổ)</span>
                  </label>
                  <span className="text-[11px] font-bold text-sky-800 bg-white px-2 py-0.5 rounded-md border border-sky-200">
                    {(seatingRules.lockedTeams || []).length > 0 ? `Đã khóa ${(seatingRules.lockedTeams || []).length} tổ` : 'Chưa khóa tổ nào'}
                  </span>
                </div>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  💡 <strong>Hướng dẫn:</strong> Chọn các tổ mà bạn <strong>không muốn thay đổi thành viên</strong> khi đổi sơ đồ lớp. Các học sinh thuộc tổ được chọn sẽ chỉ xáo trộn vị trí trong các bàn thuộc tổ đó, không bị di chuyển sang tổ khác.
                </p>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {['Tổ 1', 'Tổ 2', 'Tổ 3', 'Tổ 4'].map((tName) => {
                    const isLocked = (seatingRules.lockedTeams || []).some(t => t.toLowerCase() === tName.toLowerCase());
                    return (
                      <label
                        key={tName}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold cursor-pointer transition-all shadow-3xs ${
                          isLocked
                            ? 'bg-sky-600 text-white border-sky-700 ring-2 ring-sky-300'
                            : 'bg-white text-slate-800 border-slate-200 hover:bg-sky-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isLocked}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setSeatingRules(prev => {
                              const currentLocked = prev.lockedTeams || [];
                              let nextLocked: string[];
                              if (checked) {
                                nextLocked = Array.from(new Set([...currentLocked, tName]));
                              } else {
                                nextLocked = currentLocked.filter(t => t.toLowerCase() !== tName.toLowerCase());
                              }
                              return { ...prev, lockedTeams: nextLocked };
                            });
                          }}
                          className="w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500 cursor-pointer"
                        />
                        <span>🔒 Khóa {tName}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Footer buttons */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs text-slate-500 font-medium">
                Dữ liệu cài đặt được tự động lưu theo từng lớp học.
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowRulesModal(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                >
                  Đóng
                </button>

                <button
                  onClick={() => {
                    saveClassSeatingRules(selectedClassId, seatingRules);
                    setSyncMessage('Đã lưu cấu hình điều kiện xếp chỗ thành công!');
                    setTimeout(() => setSyncMessage(null), 2500);
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-xs flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Lưu Cài Đặt</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Chọn Khóa Tổ Trực Tiếp Trước Khi Xếp Chỗ Ngồi */}
      {showTeamLockModalBeforeAssign && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200 print:hidden">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-sky-50 to-indigo-50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-sky-600 text-white rounded-2xl shadow-sm">
                  <SlidersHorizontal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900 tracking-tight">
                    Cài Đặt Khóa Tổ Trước Khi Xếp Chỗ Ngồi
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Chọn các tổ không thay đổi thành viên trước khi tiến hành xếp chỗ
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowTeamLockModalBeforeAssign(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4 text-xs">
              <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4 space-y-3">
                <label className="font-black text-slate-900 uppercase tracking-wide flex items-center gap-2 select-none text-xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-600" />
                  <span>5. KHÓA KHÔNG THAY ĐỔI THÀNH VIÊN CỦA TỔ (CHỈ XÁO TRỘN CHỖ TRONG NỘI BỘ TỔ)</span>
                </label>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  💡 Chọn các tổ mà bạn <strong>không muốn thay đổi thành viên</strong> khi đổi sơ đồ lớp. Các học sinh thuộc tổ được chọn sẽ chỉ xáo trộn vị trí trong nội bộ tổ đó.
                </p>

                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  {['Tổ 1', 'Tổ 2', 'Tổ 3', 'Tổ 4'].map((tName) => {
                    const isLocked = (seatingRules.lockedTeams || []).some(t => t.toLowerCase() === tName.toLowerCase());
                    return (
                      <label
                        key={tName}
                        className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                          isLocked
                            ? 'bg-sky-600 text-white border-sky-700 ring-2 ring-sky-300 shadow-3xs'
                            : 'bg-white text-slate-800 border-slate-200 hover:bg-sky-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isLocked}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setSeatingRules(prev => {
                              const currentLocked = prev.lockedTeams || [];
                              let nextLocked: string[];
                              if (checked) {
                                nextLocked = Array.from(new Set([...currentLocked, tName]));
                              } else {
                                nextLocked = currentLocked.filter(t => t.toLowerCase() !== tName.toLowerCase());
                              }
                              return { ...prev, lockedTeams: nextLocked };
                            });
                          }}
                          className="w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500 cursor-pointer"
                        />
                        <span>🔒 Khóa {tName}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-900 font-medium">
                💡 <strong>Tối ưu 3 năm học:</strong> Hệ thống tự động tra cứu lịch sử 30 sơ đồ lớp gần nhất để đặt kề nhau (8 hướng) cho các cặp học sinh CHƯA BAO GIỜ ngồi cạnh nhau trước đó!
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowTeamLockModalBeforeAssign(false)}
                className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Hủy
              </button>
              <button
                disabled={isAssigningSeating}
                onClick={() => {
                  if (isAssigningSeating) return;
                  saveClassSeatingRules(selectedClassId, seatingRules);
                  setIsAssigningSeating(true);
                  setTimeout(() => {
                    try {
                      handleAutoAssignWithRules();
                    } finally {
                      setIsAssigningSeating(false);
                      setShowTeamLockModalBeforeAssign(false);
                    }
                  }, 80);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all ${
                  isAssigningSeating
                    ? 'bg-purple-400 text-white cursor-wait opacity-80'
                    : 'bg-purple-600 hover:bg-purple-700 text-white cursor-pointer'
                }`}
              >
                {isAssigningSeating ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <SlidersHorizontal className="w-4 h-4" />
                )}
                <span>{isAssigningSeating ? '⏳ Đang tính toán xếp chỗ...' : '🚀 Tiến Hành Xếp Chỗ'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirm Dialog Modal */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200 print:hidden">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl max-w-sm w-full overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex items-center gap-2.5 bg-amber-50/50 text-amber-900">
              <HelpCircle className="w-5 h-5 text-amber-600 shrink-0" />
              <h3 className="font-black text-sm uppercase tracking-wide">
                {confirmDialog.title}
              </h3>
            </div>

            {/* Message */}
            <div className="p-5 text-xs text-slate-700 font-medium leading-relaxed">
              {confirmDialog.message}
            </div>

            {/* Footer buttons */}
            <div className="p-3 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
              <button
                onClick={() => {
                  if (confirmDialog.onCancel) confirmDialog.onCancel();
                  setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                }}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-2xs"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
