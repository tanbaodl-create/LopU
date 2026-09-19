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
} from 'lucide-react';
import { toPng } from 'html-to-image';
import { ClassItem, ClassSeatingPlan } from '../../../services/storageTypes';
import { getClasses } from '../../ConnectData/ConnectFirestore';
import {
  savePersonalSeatingPlanToDrive,
  saveSeatingChartToDrive,
  fetchSeatingChartsFromDrive,
  fetchDriveFileJsonContent,
  listAppFilesFromDrive,
  downloadFileJson,
  getDriveConnectionState,
  DriveStoredFile,
} from '../../ConnectData/ConnectDrive';
import { read, utils, write } from 'xlsx';
import ExcelJS from 'exceljs';

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

export const SoDoLopView: React.FC<LearningSeatingViewProps> = ({
  currentStudentId = 'hs_2',
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

  // Chọn ghế để mở Thanh Bàn Chọn Học Sinh Nổi
  const handleSelectSeat = (team: string, desk: number, seatCol: number) => {
    setSelectedSeat({ team, desk, seatCol });
    setIsPickerOpen(true);
  };

  // Chọn học sinh từ Thanh Nổi để gán vào vị trí selectedSeat
  const handleAssignStudentToSelectedSeat = (studentId: string) => {
    if (!selectedSeat) return;
    const { team, desk, seatCol } = selectedSeat;

    setStudents(prev => {
      const existingAtTarget = prev.find(
        s => s.team.toLowerCase() === team.toLowerCase() && s.desk === desk && s.seatCol === seatCol
      );
      const targetStudent = prev.find(s => s.id === studentId);
      if (!targetStudent) return prev;

      return prev.map(st => {
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
    });

    const stObj = students.find(s => s.id === studentId);
    setSyncMessage(`Đã xếp ${stObj?.nickname || stObj?.name} vào ${team} • Bàn ${desk} • Ghế ${seatCol}!`);
    setTimeout(() => setSyncMessage(null), 2500);
    setIsPickerOpen(false);
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

    setStudents(prev => {
      // Học sinh hiện tại đang ngồi ở ghế đích (nếu có)
      const existingAtTarget = prev.find(
        s => s.team === targetTeam && s.desk === targetDesk && s.seatCol === targetCol
      );

      // Học sinh chuyển đi
      const sourceStudent = prev.find(s => s.id === sourceId);
      if (!sourceStudent) return prev;

      return prev.map(st => {
        if (st.id === sourceId) {
          return { ...st, team: targetTeam, desk: targetDesk, seatCol: targetCol };
        }
        // Nếu có học sinh ngồi sẵn ở ghế đích -> đổi chỗ với học sinh kéo tới
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
    });
    setDraggedStudentId(null);
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
  };

  const handleDownloadTemplate = async () => {
    try {
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
    reader.onload = (event) => {
      try {
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
      };

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

        const conn = getDriveConnectionState();
        const cleanFileName = fileName.replace('.json', '');
        if (conn.isConnected && conn.isRealConfigured) {
          try {
            // Upload to real Drive using existing driveService API with full custom file name and data structure
            await saveSeatingChartToDrive(selectedClassId, saveData, fileName);
            setSyncMessage(`Đã tải lên Drive thành công: ${cleanFileName} tại thư mục myApp\\LopU\\SoDoLop!`);
          } catch (realErr) {
            console.warn('Real Drive upload failed, saved to sandbox:', realErr);
            setSyncMessage(`Đã lưu file ${cleanFileName} vào bộ nhớ tạm Drive (Sandbox Mode)!`);
          }
        } else {
          setSyncMessage(`Đã tải lên Drive thành công (Sandbox): ${cleanFileName} tại thư mục myApp\\LopU\\SoDoLop!`);
        }

        setIsUploadingDrive(false);
        setTimeout(() => setSyncMessage(null), 3500);
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
    } catch (err) {
      console.error(err);
      setIsUploadingDrive(false);
      alert('Đã xảy ra lỗi khi tải lên Drive.');
    }
  };

  const handleOpenDriveFiles = async () => {
    setIsLoadingDriveFiles(true);
    setDriveFilesModalOpen(true);
    try {
      const seatingFiles = await fetchSeatingChartsFromDrive();
      setDriveFiles(seatingFiles);
    } catch (err) {
      console.error('Lỗi khi tải danh sách file từ Drive:', err);
    } finally {
      setIsLoadingDriveFiles(false);
    }
  };

  const handleApplyDriveFile = async (file: DriveStoredFile) => {
    try {
      setSyncMessage(`Đang đọc nội dung file ${file.name} từ Google Drive...`);
      const content = await fetchDriveFileJsonContent(file.id, file.content);
      if (!content) {
        alert(`Không thể đọc được nội dung của file ${file.name}. Vui lòng kiểm tra lại kết nối Drive.`);
        return;
      }
      const data = content as SoDoLopSaveData;
      loadDataIntoState(data);

      // Tải file JSON về máy tính của người dùng
      downloadFileJson({ ...file, content: data });

      setSyncMessage(`Đã nạp sơ đồ & Tải file ${file.name} về máy thành công!`);
      setDriveFilesModalOpen(false);
      setTimeout(() => setSyncMessage(null), 3500);
    } catch (err) {
      console.error(err);
      alert('Đã xảy ra lỗi khi nạp dữ liệu từ file Drive.');
    }
  };

  const handleDeleteDriveFile = (fileId: string) => {
    showConfirm(
      'Xóa File Trên Drive',
      'Bạn có chắc chắn muốn xóa file này khỏi Drive không?',
      () => {
        const storedRaw = localStorage.getItem('lopu_google_drive_files_v1') || '[]';
        let files: DriveStoredFile[] = [];
        try {
          files = JSON.parse(storedRaw);
        } catch (e) {
          files = [];
        }

        const filtered = files.filter(f => f.id !== fileId);
        localStorage.setItem('lopu_google_drive_files_v1', JSON.stringify(filtered));

        setDriveFiles(prev => prev.filter(f => f.id !== fileId));
        setSyncMessage('Đã xóa file trên Drive thành công!');
        setTimeout(() => setSyncMessage(null), 2500);
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

            <button
              id="btn-sync-all-teams"
              onClick={() => handleSyncAllTeamsWithClassData()}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer transition-colors"
              title="Đồng bộ vị trí tất cả học sinh theo phân tổ trên dữ liệu"
            >
              <RefreshCw className="w-4 h-4 text-emerald-300" />
              <span>Đồng Bộ Phân Tổ</span>
            </button>

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

            <button
              id="btn-reset-all-seating"
              onClick={handleResetAllSeating}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs cursor-pointer transition-colors"
              title="Xóa chỗ ngồi cả lớp để xếp lại từ đầu"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Xếp Lại Cả Lớp</span>
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

              <button
                onClick={handleAutoAssignSeating}
                className="text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-3xs"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Auto Xếp Nhanh ({unassignedStudents.length})</span>
              </button>
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
              {/* Chuyển Góc Nhìn (Lên / Xuống) */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-2xs">
                <button
                  onClick={() => setViewPerspective('up')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                    viewPerspective === 'up'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Góc nhìn lên: Từ phía học sinh nhìn lên Bảng / Bàn GV"
                >
                  👁️ Nhìn lên
                </button>
                <button
                  onClick={() => setViewPerspective('down')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                    viewPerspective === 'down'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Góc nhìn xuống: Từ Bàn Giáo Viên nhìn xuống lớp (Chữ xoay 180°)"
                >
                  👨‍🏫 Nhìn xuống
                </button>
              </div>

              {/* Chuyển Khổ Giấy A4 (Ngang / Dọc) */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-2xs">
                <button
                  onClick={() => setPaperOrientation('landscape')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                    paperOrientation === 'landscape'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Sơ đồ lớp khổ A4 Ngang (Rộng rãi, tối ưu)"
                >
                  📄 A4 Ngang
                </button>
                <button
                  onClick={() => setPaperOrientation('portrait')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                    paperOrientation === 'portrait'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Sơ đồ lớp khổ A4 Dọc"
                >
                  📄 A4 Dọc
                </button>
              </div>

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
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white shadow-xs cursor-pointer transition-colors"
                title="Tải Sơ đồ lớp thành file ảnh PNG"
              >
                <Download className="w-4 h-4 text-amber-400" />
                <span>Tải PNG</span>
              </button>

              <button
                id="btn-print-seating"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer transition-colors print:hidden"
                title="In trực tiếp Sơ đồ lớp học khổ A4 Ngang/Dọc chuẩn tỷ lệ 16:9 sắc nét"
              >
                <Printer className="w-4 h-4 text-white" />
                <span>In Sơ Đồ</span>
              </button>
            </div>

            <button
              id="btn-import-students-seating"
              onClick={handleImportText}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Nạp Lại Danh Sách</span>
            </button>
          </div>
        </div>
      </div>

      {/* CHÍNH: BỐ CỤC KHỔ A4 & THANH CHƯA XẾP CHỖ BÊN PHẢI */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        
        {/* VÙNG SƠ ĐỒ LỚP HỌC (CHỈ DUY NHẤT KHUNG NÀY ĐƯỢC XUẤT THÀNH FILE PNG) */}
        <div
          id="seating-diagram-only"
          className={`bg-white p-6 rounded-none border-4 border-slate-950 shadow-2xs space-y-4 ${
            isExportingPNG ? 'lg:col-span-4 w-full' : 'lg:col-span-3'
          }`}
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

        {/* LỀ PHẢI: DANH SÁCH HỌC SINH CHƯA XẾP CHỖ (STICKY SIDEBAR) */}
        {!isExportingPNG && (
          <div className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-4 sticky top-4 print:hidden">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
              <UserRound className="w-4 h-4 text-amber-600" />
              <span>Chưa Xếp Chỗ</span>
            </h3>
            <span className="text-xs font-black bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full">
              [{unassignedStudents.length}]
            </span>
          </div>

          {/* VÙNG CHỈ DẪN KHI ĐANG CHỌN GHẾ TRÊN SƠ ĐỒ */}
          {selectedSeat ? (
            <div className="p-3 bg-indigo-600 text-white rounded-xl text-xs space-y-2 shadow-sm animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <span className="font-black uppercase tracking-wider text-[11px] text-amber-300">
                  🎯 Đang chọn vị trí:
                </span>
                <button
                  onClick={() => setSelectedSeat(null)}
                  className="text-white hover:text-rose-200 text-xs font-bold underline cursor-pointer"
                >
                  Bỏ chọn
                </button>
              </div>
              <div className="text-sm font-extrabold bg-indigo-700 p-2 rounded-lg border border-indigo-500 text-center">
                {selectedSeat.team} • Bàn {selectedSeat.desk} • Ghế {selectedSeat.seatCol}
              </div>
              <p className="text-[10px] text-indigo-100 text-center">
                Bấm vào học sinh bên dưới để xếp ngay vào vị trí này!
              </p>
            </div>
          ) : (
            <div
              onDragOver={handleDragOver}
              onDrop={handleDropToUnassigned}
              className="p-3 border-2 border-dashed border-amber-300 bg-amber-50/50 rounded-xl text-center text-xs text-amber-800 space-y-1 hover:bg-amber-100/60 transition-colors cursor-pointer"
            >
              <XCircle className="w-5 h-5 text-amber-600 mx-auto" />
              <p className="font-bold text-[11px]">Kéo thả học sinh vào đây để HỦY chỗ ngồi</p>
            </div>
          )}

          {/* DANH SÁCH THẺ HỌC SINH CHƯA XẾP CHỖ */}
          <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
            {unassignedStudents.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400 italic bg-slate-50 rounded-xl border border-dashed border-slate-200">
                Tất cả học sinh đã có chỗ ngồi trên sơ đồ!
              </div>
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
                    className={`p-2.5 rounded-xl border flex items-center justify-between shadow-2xs transition-all cursor-pointer group ${
                      selectedSeat
                        ? 'bg-indigo-50 hover:bg-indigo-100 border-indigo-300 ring-2 ring-indigo-400/50'
                        : 'bg-slate-50 hover:bg-indigo-50/70 border-slate-200 hover:border-indigo-300 cursor-grab active:cursor-grabbing'
                    }`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center shrink-0">
                        {isFemale ? (
                          <IconNu className="w-7 h-7 text-rose-600" />
                        ) : (
                          <IconNam className="w-7 h-7 text-indigo-700" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-slate-900 truncate">
                          {st.nickname || st.name}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {st.name}
                        </div>
                      </div>
                    </div>

                    <span className="text-[10px] text-indigo-700 font-extrabold shrink-0 bg-white px-2 py-1 rounded-md border border-indigo-200 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      {selectedSeat ? 'Xếp vào ô' : 'Kéo vào bàn'}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* NÚT TỰ ĐỘNG XẾP CHỖ CHO CÁC HS CHƯA CÓ BÀN */}
          {unassignedStudents.length > 0 && (
            <button
              onClick={handleAutoAssignSeating}
              className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center justify-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Xếp Tự Động {unassignedStudents.length} Học Sinh</span>
            </button>
          )}
        </div>
      )}

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
                Thư mục mặc định: <span className="font-bold text-slate-700">myApp\LopU\SoDoLop</span>. Chọn file JSON để nạp dữ liệu và tải về máy:
              </p>

              {isLoadingDriveFiles ? (
                <div className="p-8 text-center text-xs text-indigo-600 bg-indigo-50/50 border border-dashed border-indigo-200 rounded-2xl flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-indigo-600" />
                  <span className="font-bold">Đang quét tìm các file sơ đồ lớp từ Google Drive...</span>
                </div>
              ) : driveFiles.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-2xl italic">
                  Chưa có file sơ đồ lớp nào được lưu trên Drive.
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
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[11px] font-black cursor-pointer shadow-3xs transition-colors flex items-center gap-1"
                        >
                          <Download className="w-3 h-3" />
                          <span>Tải về & Nạp</span>
                        </button>
                        <button
                          onClick={() => handleDeleteDriveFile(file.id)}
                          className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl cursor-pointer transition-colors border border-transparent hover:border-rose-200"
                          title="Xóa file này trên Drive"
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
