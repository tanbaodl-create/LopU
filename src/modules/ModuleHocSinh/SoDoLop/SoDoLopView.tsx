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
} from 'lucide-react';
import { ClassItem, ClassSeatingPlan } from '../../../services/storageTypes';
import { getClasses } from '../../ConnectData/ConnectFirestore';
import { savePersonalSeatingPlanToDrive, saveSeatingChartToDrive } from '../../ConnectData/ConnectDrive';

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
  team: string; // e.g. "Tổ 1", "Tổ 2", "Tổ 3", "Tổ 4"
  desk: number; // 1, 2, 3
  roles: string[];
  titles: string[];
}

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
    'Phạm Thanh Hà; HàPhạm; Nữ; Tổ 4; student; PBT.TT'
  );

  const [students, setStudents] = useState<StudentCardData[]>([]);
  const [draggedStudentId, setDraggedStudentId] = useState<string | null>(null);

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
  }, []);

  // Parse chuỗi cấu trúc [Họ tên; Biệt danh; Giới tính; Tổ/nhóm; Vai trò; Chức danh]
  const parseRawTextToStudents = (text: string) => {
    if (!text.trim()) return;
    const lines = text.split('\n').filter(l => l.trim().length > 0);
    const parsed: StudentCardData[] = lines.map((line, idx) => {
      const parts = line.split(';').map(p => p.trim());
      const name = parts[0] || `Học sinh ${idx + 1}`;
      const nickname = parts[1] || '';
      const gender = parts[2] || (idx % 2 === 0 ? 'Nam' : 'Nữ');
      const team = parts[3] || `Tổ ${(idx % 4) + 1}`;
      
      // Tách vai trò & chức danh bằng dấu chấm (.) hoặc phẩy (,)
      const rolesRaw = parts[4] || '';
      const titlesRaw = parts[5] || '';

      const roles = rolesRaw.split(/[.,]/).map(r => r.trim()).filter(Boolean);
      const titles = titlesRaw.split(/[.,]/).map(t => t.trim()).filter(Boolean);

      // Phân bổ bàn (desk 1, 2, 3)
      const desk = Math.floor(idx / 4) % 3 + 1;

      return {
        id: `hs_${idx + 1}`,
        code: `HS10A1_${(idx + 1).toString().padStart(2, '0')}`,
        name,
        nickname: nickname || undefined,
        gender,
        team,
        desk,
        roles: roles.length > 0 ? roles : ['student'],
        titles: titles.length > 0 ? titles : ['Thành viên'],
      };
    });

    setStudents(parsed);
  };

  const handleImportText = () => {
    parseRawTextToStudents(rawStudentsText);
    setSyncMessage('Đã nạp và phân bổ dữ liệu học sinh lên Sơ đồ lớp thành công!');
    setTimeout(() => setSyncMessage(null), 3000);
  };

  // Drag and Drop student swapping between seats/desks
  const handleDragStart = (e: React.DragEvent, studentId: string) => {
    setDraggedStudentId(studentId);
    e.dataTransfer.setData('text/plain', studentId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropOnDesk = (e: React.DragEvent, targetTeam: string, targetDesk: number) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain') || draggedStudentId;
    if (!sourceId) return;

    setStudents(prev =>
      prev.map(st => {
        if (st.id === sourceId) {
          return { ...st, team: targetTeam, desk: targetDesk };
        }
        return st;
      })
    );
    setDraggedStudentId(null);
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
        col: idx + 1,
        studentId: s.id,
        studentName: s.name,
        studentCode: `${s.team} • Bàn ${s.desk}`,
        status: 'present',
        notes: `Biệt danh: ${s.nickname || 'Không'} | Chức danh: ${s.titles.join(', ')}`,
      })),
    };

    await saveSeatingChartToDrive(selectedClassId, plan);
    await savePersonalSeatingPlanToDrive(plan);
    setSyncMessage('Đã lưu Sơ đồ lớp & danh sách vị trí ngồi vào Google Drive thành công!');
    setTimeout(() => setSyncMessage(null), 3500);
  };

  // Calculations for statistics
  const totalStudents = students.length;
  const femaleCount = students.filter(s => s.gender.toLowerCase() === 'nữ' || s.gender.toLowerCase() === 'nu').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div id="learning-seating-view" className="space-y-6">
      {/* Toast Notification */}
      {syncMessage && (
        <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs">
          <Cloud className="w-4 h-4 text-blue-600 shrink-0" />
          <span>{syncMessage}</span>
        </div>
      )}

      {/* HEADER CỐ ĐỊNH BAN GIÁM HIỆU & KHUNG TRƯỜNG */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-600">
              {headerInfo.department}
            </span>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              {headerInfo.schoolName} — {headerInfo.className}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Sơ đồ vị trí học sinh • Năm học {headerInfo.academicYear} • {headerInfo.applyWeek}
            </p>
          </div>

          <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="text-right text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Giáo Viên Chủ Nhiệm</span>
              <strong className="text-sm font-extrabold text-slate-900">{headerInfo.teacherName}</strong>
              <div className="flex items-center gap-1 text-[11px] text-slate-500 justify-end mt-0.5">
                <Phone className="w-3 h-3 text-indigo-600" />
                <span>{headerInfo.teacherPhone}</span>
              </div>
            </div>
            <button
              id="btn-save-seating-drive"
              onClick={handleSaveToDrive}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs cursor-pointer transition-colors"
            >
              <Cloud className="w-4 h-4" />
              <span>Lưu Drive</span>
            </button>
          </div>
        </div>

        {/* Dynamic Textarea Parser */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-4 h-4 text-indigo-600" />
              Nhập Danh Sách Học Sinh Dạng Chuỗi Cấu Trúc [Dấu Chấm & Dấu Phẩy]
            </label>
            <span className="text-[11px] text-slate-400 font-mono">
              [Họ tên; Biệt danh; Giới tính; Tổ; Vai trò; Chức danh]
            </span>
          </div>

          <textarea
            rows={3}
            value={rawStudentsText}
            onChange={e => setRawStudentsText(e.target.value)}
            className="w-full text-xs font-mono p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
          />

          <div className="flex justify-end">
            <button
              id="btn-import-students-seating"
              onClick={handleImportText}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Nạp & Đổi Vị Trí Lập Tức</span>
            </button>
          </div>
        </div>
      </div>

      {/* BỤC GIẢNG & BẢNG PHẤN */}
      <div className="max-w-md mx-auto">
        <div className="py-2.5 px-6 rounded-xl bg-slate-800 text-white text-center shadow-xs">
          <span className="text-xs font-black uppercase tracking-widest text-slate-200">
            BỤC GIẢNG & BẢNG PHẤN GIÁO VIÊN
          </span>
          <span className="block text-[11px] text-slate-400 mt-0.5">
            GVCN: {headerInfo.teacherName} • SĐT: {headerInfo.teacherPhone}
          </span>
        </div>
        <div className="w-24 h-1.5 bg-indigo-500 mx-auto rounded-b-md" />
      </div>

      {/* LƯỚI 4 TỔ (GROUP & DESK LOGIC) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {['Tổ 1', 'Tổ 2', 'Tổ 3', 'Tổ 4'].map(teamName => {
          const teamStudents = students.filter(s => s.team.toLowerCase() === teamName.toLowerCase());

          return (
            <div
              key={teamName}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-4 flex flex-col justify-between"
            >
              {/* Auto-Count (Bộ đếm tự động) */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                  {teamName}
                </h3>
                <span className="text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80 px-2.5 py-0.5 rounded-full">
                  [{teamStudents.length}] học sinh
                </span>
              </div>

              {/* Cấu trúc 3 Bàn cố định (Row 1, Row 2, Row 3) */}
              <div className="space-y-3 flex-1">
                {[1, 2, 3].map(deskNum => {
                  const deskStudents = teamStudents.filter(s => s.desk === deskNum);

                  return (
                    <div
                      key={deskNum}
                      onDragOver={handleDragOver}
                      onDrop={e => handleDropOnDesk(e, teamName, deskNum)}
                      className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 transition-all"
                    >
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase">
                        <span>Bàn {deskNum}</span>
                        <span>{deskStudents.length}/4 ghế</span>
                      </div>

                      {/* Bố trí ghế động (Dynamic Seats) */}
                      {deskStudents.length === 0 ? (
                        /* Nếu bàn = 0, hiển thị dải nét đứt mờ giữ form */
                        <div className="border-2 border-dashed border-slate-200 rounded-xl p-3 text-center text-[11px] text-slate-400 min-h-[60px] flex items-center justify-center italic">
                          Bàn trống (Kéo thả học sinh vào đây)
                        </div>
                      ) : (
                        /* Nếu bàn = 1, 2, 3, hoặc 4: Flexbox chia đều khoảng cách */
                        <div className="flex items-center justify-center flex-wrap gap-2 bg-amber-100/50 border-t-2 border-amber-300 rounded-lg p-2">
                          {deskStudents.map(student => {
                            const isMe = student.id === currentStudentId;
                            const isFemale = student.gender.toLowerCase() === 'nữ' || student.gender.toLowerCase() === 'nu';

                            // Tách Badges 4 góc
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
                                className={`flex-1 min-w-[110px] max-w-[140px] bg-white border rounded-xl p-2.5 shadow-2xs hover:shadow-md transition-all relative cursor-grab active:cursor-grabbing text-center ${
                                  isMe
                                    ? 'border-indigo-500 ring-2 ring-indigo-300 bg-indigo-50/80'
                                    : 'border-slate-200 hover:border-indigo-300'
                                }`}
                              >
                                {/* BADGE 4 GÓC (Role & Title Mapping) */}
                                {/* Top-Left: Ban Điều Hành (Red/Yellow) */}
                                {execBadge && (
                                  <span className="absolute -top-2 -left-1.5 bg-rose-600 text-white font-extrabold text-[9px] px-1.5 py-0.2 rounded shadow-2xs border border-white">
                                    {execBadge}
                                  </span>
                                )}

                                {/* Top-Right: Công Tác Đoàn (Dark Blue) */}
                                {doanBadge && (
                                  <span className="absolute -top-2 -right-1.5 bg-blue-800 text-white font-extrabold text-[9px] px-1.5 py-0.2 rounded shadow-2xs border border-white">
                                    {doanBadge}
                                  </span>
                                )}

                                {/* Bottom-Left: Cán Sự Tổ (Green) */}
                                {teamBadge && (
                                  <span className="absolute -bottom-2 -left-1.5 bg-emerald-600 text-white font-extrabold text-[9px] px-1.5 py-0.2 rounded shadow-2xs border border-white">
                                    {teamBadge}
                                  </span>
                                )}

                                {/* Bottom-Right: Cán Sự Bộ Môn (Orange/Purple) */}
                                {subjectBadge && (
                                  <span className="absolute -bottom-2 -right-1.5 bg-amber-600 text-white font-extrabold text-[9px] px-1.5 py-0.2 rounded shadow-2xs border border-white truncate max-w-[50px]">
                                    {subjectBadge}
                                  </span>
                                )}

                                {/* Avatar Theo Giới Tính */}
                                <div className="w-8 h-8 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-700 my-1">
                                  {isFemale ? (
                                    <UserRound className="w-4 h-4 text-pink-600" />
                                  ) : (
                                    <User className="w-4 h-4 text-blue-600" />
                                  )}
                                </div>

                                {/* Biệt Danh Hoặc Họ Tên Rút Gọn */}
                                <div className="font-extrabold text-xs text-slate-900 truncate">
                                  {student.nickname || student.name.split(' ').slice(-2).join(' ')}
                                </div>
                                <div className="text-[10px] text-slate-400 truncate mt-0.5">
                                  {student.name}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* FOOTER CỐ ĐỊNH THỐNG KÊ LỚP HỌC */}
      <div id="seating-footer-stats" className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
          <GraduationCap className="w-4 h-4 text-indigo-600" />
          <span>THỐNG KÊ LỚP HỌC:</span>
          <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100 font-extrabold text-sm">
            Sĩ số: {totalStudents} (Nữ: {femaleCount})
          </span>
        </div>

        <div className="text-xs text-slate-500 font-medium flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Sơ đồ đồng bộ tức thì trên Google Drive & Firestore</span>
        </div>
      </div>
    </div>
  );
};
