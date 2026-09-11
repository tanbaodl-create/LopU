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
} from 'lucide-react';
import { ClassItem, ClassSeatingPlan } from '../../../services/storageTypes';
import { getClasses } from '../../ConnectData/ConnectFirestore';
import { savePersonalSeatingPlanToDrive, saveSeatingChartToDrive } from '../../ConnectData/ConnectDrive';

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
  to?: string;       // Trái - Dưới: Tổ (TT1, TP2, Tổ 1...)
  doan?: string;     // Phải - Trên: Đoàn (BT, PBT, UV...)
  mon?: string;      // Phải - Dưới: BCS Bộ môn (CS Toán, CS Văn...)
  nickname: string;
  fullName?: string;
  isMe?: boolean;
  className?: string;
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
}) => {
  const checkFemale = isFemale ?? (gender === 'Nữ' || gender === 'Nu' || gender === 'nu');

  return (
    <div
      className={`relative bg-white border-2 rounded-2xl p-2.5 shadow-2xs hover:shadow-md transition-all flex flex-col items-center justify-between text-center overflow-hidden min-h-[105px] min-w-[100px] max-w-[130px] flex-1 ${
        isMe
          ? 'border-indigo-500 ring-2 ring-indigo-300 bg-indigo-50/80'
          : 'border-slate-300 hover:border-indigo-400'
      } ${className}`}
    >
      {/* 4 Nhãn chức danh NẰM NGOÀI VÒNG TRÒN, NHƯNG NẰM TRONG HÌNH VUÔNG BO GÓC */}
      {/* TRÁI - TRÊN: Điều hành */}
      {dieuHanh && (
        <span
          className="absolute top-1.5 left-1.5 z-10 bg-amber-500 text-white font-black text-[9px] leading-tight px-1.5 py-0.5 rounded-md border border-amber-200 shadow-2xs max-w-[34px] truncate"
          title={`Điều hành: ${dieuHanh}`}
        >
          {dieuHanh}
        </span>
      )}

      {/* PHẢI - TRÊN: Đoàn */}
      {doan && (
        <span
          className="absolute top-1.5 right-1.5 z-10 bg-blue-700 text-white font-black text-[9px] leading-tight px-1.5 py-0.5 rounded-md border border-blue-200 shadow-2xs max-w-[34px] truncate"
          title={`Đoàn: ${doan}`}
        >
          {doan}
        </span>
      )}

      {/* Vòng Tròn Icon Nam / Nữ ở Trung Tâm (Sạch sẽ không bị nhãn che) */}
      <div className="w-11 h-11 mx-auto rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0 my-1 shadow-2xs">
        {checkFemale ? (
          <IconNu className="w-10 h-10 text-rose-600" />
        ) : (
          <IconNam className="w-10 h-10 text-indigo-700" />
        )}
      </div>

      {/* TRÁI - DƯỚI: Tổ */}
      {to && (
        <span
          className="absolute bottom-6 left-1.5 z-10 bg-indigo-600 text-white font-black text-[9px] leading-tight px-1.5 py-0.5 rounded-md border border-indigo-200 shadow-2xs max-w-[34px] truncate"
          title={`Tổ: ${to}`}
        >
          {to}
        </span>
      )}

      {/* PHẢI - DƯỚI: BCS Bộ môn */}
      {mon && (
        <span
          className="absolute bottom-6 right-1.5 z-10 bg-emerald-600 text-white font-black text-[9px] leading-tight px-1.5 py-0.5 rounded-md border border-emerald-200 shadow-2xs max-w-[34px] truncate"
          title={`BCS Môn: ${mon}`}
        >
          {mon}
        </span>
      )}

      {/* HIỂN THỊ DUY NHẤT BIỆT DANH HỌC SINH */}
      <div className="w-full">
        <div className="font-black text-xs text-slate-900 truncate px-0.5" title={fullName ? `Họ tên: ${fullName}` : nickname}>
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

// Cấu hình 4 Tổ & Số Bàn liên tiếp (Mặc định)
export const DEFAULT_TEAMS_CONFIG = [
  { id: 'team_1', name: 'Tổ 1', desks: [1, 2, 3], rowLabel: 'Dãy 1 - Phía Trên' },
  { id: 'team_2', name: 'Tổ 2', desks: [1, 2, 3], rowLabel: 'Dãy 2 - Phía Trên' },
  { id: 'team_3', name: 'Tổ 3', desks: [4, 5, 6], rowLabel: 'Dãy 1 - Phía Dưới' },
  { id: 'team_4', name: 'Tổ 4', desks: [4, 5, 6], rowLabel: 'Dãy 2 - Phía Dưới' },
];

// Key badge mappings
const EXEC_TITLES = ['LT', 'PHT', 'TQ', 'CD', 'PLĐ']; // Ban Điều Hành (Red/Yellow)
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

  // Raw input string parser
  const [rawStudentsText, setRawStudentsText] = useState<string>(
    'Nguyễn Văn An; AnGV; Nam; Tổ 1; LT.PLĐ; BT.TT.Toán\n' +
    'Lê Minh Khang; KhangKhang; Nam; Tổ 1; student; PHT.UV.Lý\n' +
    'Trần Thị Mai; MaiMai; Nữ; Tổ 1; student; TP.Hóa\n' +
    'Phạm Hoàng Nam; NamNam; Nam; Tổ 1; student; TQ.Sinh\n' +
    'Đỗ Thu Hà; HàHà; Nữ; Tổ 2; student; CD.Tin\n' +
    'Vũ Quốc Tuấn; TuấnT; Nam; Tổ 2; student; Anh\n' +
    'Nguyễn Thị Yến; YếnNhi; Nữ; Tổ 2; student; Văn\n' +
    'Bùi Văn Hùng; HùngB; Nam; Tổ 3; student; Sử\n' +
    'Lâm Thu Trang; TrangT; Nữ; Tổ 3; student; Địa\n' +
    'Hoàng Minh Trí; TríM; Nam; Tổ 4; student; KTPL\n' +
    'Phạm Thanh Hà; HàPhạm; Nữ; Tổ 4; student; PBT.TT\n' +
    'Nguyễn Văn Bình; BìnhB; Nam; ; student; Thành viên\n' +
    'Trần Thu Cúc; CúcT; Nữ; ; student; Thành viên'
  );

  const [students, setStudents] = useState<StudentCardData[]>([]);
  const [draggedStudentId, setDraggedStudentId] = useState<string | null>(null);

  // Cấu hình số ghế trên mỗi bàn (Mặc định 3 ghế 1 bàn)
  const [seatsPerDesk, setSeatsPerDesk] = useState<number>(3);

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

  // Config Header
  const [headerInfo] = useState({
    department: 'Sở GD&ĐT TP. Hồ Chí Minh',
    schoolName: 'THPT Chuyên Nguyễn Trãi',
    className: 'Lớp 10A1',
    academicYear: '2026 - 2027',
    applyWeek: 'Tuần 12 (Áp dụng từ 15/11)',
    teacherName: 'Đỗ Tấn Bảo',
    teacherPhone: '0988.123.456',
  });

  useEffect(() => {
    async function load() {
      setLoading(false);
      const clsList = await getClasses();
      setClasses(clsList);
      if (clsList.length > 0) {
        setSelectedClassId(clsList[0].id);
      }
      parseRawTextToStudents(rawStudentsText);
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
      case 2: return 'grid-cols-2';
      case 3: return 'grid-cols-3';
      case 5: return 'grid-cols-5';
      case 6: return 'grid-cols-6';
      case 4:
      default: return 'grid-cols-4';
    }
  };

  // Parse chuỗi cấu trúc [Họ tên; Biệt danh; Giới tính; Tổ/nhóm; Vai trò; Chức danh]
  const parseRawTextToStudents = (text: string) => {
    if (!text.trim()) return;
    const lines = text.split('\n').filter(l => l.trim().length > 0);
    const parsed: StudentCardData[] = [];

    lines.forEach((line, idx) => {
      const parts = line.split(';').map(p => p.trim());
      const name = parts[0] || `Học sinh ${idx + 1}`;
      const nickname = parts[1] || '';
      const gender = parts[2] || (idx % 2 === 0 ? 'Nam' : 'Nữ');
      const teamRaw = parts[3] || '';
      
      const rolesRaw = parts[4] || '';
      const titlesRaw = parts[5] || '';

      const roles = rolesRaw.split(/[.,]/).map(r => r.trim()).filter(Boolean);
      const titles = titlesRaw.split(/[.,]/).map(t => t.trim()).filter(Boolean);

      let team = teamRaw;
      let desk = 0;
      let seatCol = 0;

      if (team) {
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
        id: `hs_${idx + 1}`,
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
    if (window.confirm('Bạn có chắc chắn muốn XÓA TOÀN BỘ chỗ ngồi của cả lớp để xếp lại từ đầu không?')) {
      setStudents(prev => prev.map(s => ({ ...s, team: '', desk: 0, seatCol: 0 })));
      setSelectedSeat(null);
      setSyncMessage('Đã hủy tất cả vị trí chỗ ngồi! Hãy bấm vào các ô ghế để chọn học sinh nhanh.');
      setTimeout(() => setSyncMessage(null), 3000);
    }
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

  // In Sơ Đồ Khổ Giấy A4 Dọc
  const handlePrintA4 = () => {
    window.print();
  };

  const handleSaveToDrive = async () => {
    const plan: ClassSeatingPlan = {
      classId: selectedClassId,
      className: headerInfo.className,
      room: 'Phòng 204',
      teacherName: headerInfo.teacherName,
      academicYear: headerInfo.academicYear,
      seats: students.map((s, idx) => ({
        id: `seat_${s.id}`,
        row: s.desk,
        col: s.seatCol || (idx % seatsPerDesk) + 1,
        studentId: s.id,
        studentName: s.name,
        studentCode: `${s.team || 'Chưa xếp'} • Bàn ${s.desk || 0}`,
        status: 'present',
        notes: `Biệt danh: ${s.nickname || 'Không'} | Chức danh: ${s.titles.join(', ')}`,
      })),
    };

    await saveSeatingChartToDrive(selectedClassId, plan);
    await savePersonalSeatingPlanToDrive(plan);
    setSyncMessage('Đã lưu Sơ đồ lớp & vị trí ngồi lên Google Drive!');
    setTimeout(() => setSyncMessage(null), 3500);
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
    <div id="learning-seating-view" className="space-y-6">
      {/* CSS In Ấn Khổ A4 Dọc */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm;
          }
          body {
            background: white !important;
            color: black !important;
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
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 print:p-2 print:border-b print:rounded-none">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100 print:pb-2">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-600 print:text-black">
              {headerInfo.department}
            </span>
            <h1 className="text-xl font-black text-slate-900 tracking-tight print:text-lg">
              {headerInfo.schoolName} — {headerInfo.className}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5 print:text-slate-700">
              Sơ đồ vị trí học sinh • Năm học {headerInfo.academicYear} • {headerInfo.applyWeek}
            </p>
          </div>

          <div className="flex items-center gap-3 print:hidden">
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

            <div className="text-right text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">GVCN</span>
              <strong className="text-xs font-extrabold text-slate-900">{headerInfo.teacherName}</strong>
              <div className="flex items-center gap-1 text-[11px] text-slate-500 justify-end mt-0.5">
                <Phone className="w-3 h-3 text-indigo-600" />
                <span>{headerInfo.teacherPhone}</span>
              </div>
            </div>

            <button
              id="btn-print-seating-a4"
              onClick={handlePrintA4}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white shadow-xs cursor-pointer transition-colors"
              title="In Sơ đồ lớp khổ A4 Dọc"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>In A4 Dọc</span>
            </button>

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
              id="btn-save-seating-drive"
              onClick={handleSaveToDrive}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs cursor-pointer transition-colors"
            >
              <Cloud className="w-4 h-4" />
              <span>Lưu Drive</span>
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
              Nhập Cấu Trúc Học Sinh [Họ tên; Biệt danh; Giới tính; Tổ; Vai trò; Chức danh]
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={handleAutoAssignSeating}
                className="text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Auto Xếp Nhanh ({unassignedStudents.length})</span>
              </button>
            </div>
          </div>

          <textarea
            rows={2}
            value={rawStudentsText}
            onChange={e => setRawStudentsText(e.target.value)}
            className="w-full text-xs font-mono p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            placeholder="Mỗi dòng 1 học sinh..."
          />

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-3 text-xs font-bold text-slate-700 bg-slate-100/80 px-3 py-1.5 rounded-xl border border-slate-200">
              <span className="text-[11px] text-slate-500 uppercase tracking-wider font-extrabold">Ký Hiệu Sơ Đồ:</span>
              <div className="flex items-center gap-1.5">
                <IconNam className="w-4 h-4 text-indigo-700" />
                <span className="text-[11px]">IconNam</span>
              </div>
              <div className="flex items-center gap-1.5 border-l border-slate-300 pl-3">
                <IconNu className="w-4 h-4 text-rose-600" />
                <span className="text-[11px]">IconNu</span>
              </div>
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

      {/* BỤC GIẢNG & BẢNG PHẤN */}
      <div className="max-w-md mx-auto">
        <div className="py-2 px-6 rounded-xl bg-slate-800 text-white text-center shadow-xs print:bg-slate-900 print:text-white">
          <span className="text-xs font-black uppercase tracking-widest text-slate-200">
            BỤC GIẢNG & BẢNG PHẤN GIÁO VIÊN
          </span>
          <span className="block text-[10px] text-slate-400 mt-0.5 print:text-slate-300">
            GVCN: {headerInfo.teacherName} • SĐT: {headerInfo.teacherPhone}
          </span>
        </div>
        <div className="w-24 h-1 bg-indigo-500 mx-auto rounded-b-md" />
      </div>

      {/* CHÍNH: BỐ CỤC KHỔ A4 DỌC & THANH CHƯA XẾP CHỖ BÊN PHẢI */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        
        {/* LỀ TRÁI: KHUNG SƠ ĐỒ LỚP HỌC (3 CỘT LG) */}
        <div className="lg:col-span-3 space-y-4">
          
          {/* BỐ CỤC CÁC TỔ & SỐ BÀN DỌC */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {teamsConfig.map(teamConf => {
              const teamName = teamConf.name;
              const teamStudents = students.filter(s => s.team.toLowerCase() === teamName.toLowerCase());

              return (
                <div
                  key={teamConf.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-xs p-3.5 space-y-3 flex flex-col justify-between print:border-slate-300 print:shadow-none"
                >
                  {/* Tiêu đề Tổ (Có thể bấm đổi tên) + Nút Xếp Lại Tổ */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
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
                          <Edit3 className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 opacity-80 transition-opacity" />
                        </h3>
                      )}
                      <span className="text-[10px] font-medium text-slate-400 block">{teamConf.rowLabel}</span>
                    </div>

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
                  </div>

                  {/* CÁC BÀN CỦA TỔ */}
                  <div className="space-y-2.5 flex-1">
                    {teamConf.desks.map(deskNum => {
                      const deskStudents = teamStudents.filter(s => s.desk === deskNum);

                      return (
                        <div
                          key={`desk_${teamName}_${deskNum}`}
                          className="p-2 rounded-xl bg-amber-50/70 border-t-2 border-amber-300 space-y-1.5 shadow-2xs print:bg-white print:border-amber-400"
                        >
                          <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase px-1">
                            <span className="text-amber-900 font-extrabold">Bàn {deskNum}</span>
                            <span className="text-slate-500 font-mono font-bold">{deskStudents.length}/{seatsPerDesk} ghế</span>
                          </div>

                          {/* MỖI BÀN LÀ 1 HÀNG NGANG VỚI SỐ GHẾ ĐỘNG (2, 3, 4, 5, 6 GHẾ) */}
                          <div className={`grid ${getDeskGridColsClass(seatsPerDesk)} gap-1.5 items-center`}>
                            {Array.from({ length: seatsPerDesk }, (_, i) => i + 1).map(colNum => {
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
                                    draggable
                                    onDragStart={e => handleDragStart(e, student.id)}
                                    onClick={() => handleSelectSeat(teamName, deskNum, colNum)}
                                    className={`cursor-pointer transition-all w-full rounded-2xl p-0.5 ${
                                      isSelected
                                        ? 'ring-4 ring-indigo-600 shadow-md scale-105 bg-indigo-100/80 z-10'
                                        : 'hover:ring-2 hover:ring-indigo-400'
                                    }`}
                                    title="Bấm để đổi học sinh hoặc hủy xếp chỗ"
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
                                    />
                                  </div>
                                );
                              }

                              // Nếu ghế trống: Bấm vào để mở Thanh Nổi hoặc Kéo thả vào
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
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* LỀ PHẢI: DANH SÁCH HỌC SINH CHƯA XẾP CHỖ (STICKY SIDEBAR) */}
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
    </div>
  );
};
