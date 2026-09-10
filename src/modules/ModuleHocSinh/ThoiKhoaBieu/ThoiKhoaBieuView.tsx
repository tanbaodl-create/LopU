import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  Cloud,
  Filter,
  Users,
  GraduationCap,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { ScheduleItem } from '../../../services/storageTypes';
import { savePersonalScheduleToDrive } from '../../ConnectData/ConnectDrive';

// Mở rộng kiểu dữ liệu cho ô Thời khóa biểu đáp ứng đầy đủ yêu cầu
export interface ExtendedScheduleItem extends ScheduleItem {
  type: 'CK' | 'HT'; // CK: Chính khóa, HT: Học thêm / Dạy thêm
  startTime: string; // Giờ bắt đầu (e.g. "07:30")
  endTime: string;   // Giờ kết thúc (e.g. "08:15")
  teacherNickname: string; // Nickname giáo viên (e.g. "Thầy An", "Cô Mai")
  startMinutes: number; // Phút tính từ 00:00 để so sánh thời gian
  endMinutes: number;
}

// Chuyển chuỗi "HH:mm" thành số phút trong ngày
const parseTimeToMinutes = (timeStr: string): number => {
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

// Dữ liệu mẫu chuẩn hóa với 7 ngày và các ca sáng, chiều, tối, nhãn CK/HT
const INITIAL_EXTENDED_SCHEDULE: ExtendedScheduleItem[] = [
  // Thứ Hai (dayOfWeek: 1)
  {
    id: 'tkb_t2_1',
    dayOfWeek: 1,
    dayName: 'Thứ Hai',
    period: 1,
    time: '07:30 - 08:15',
    startTime: '07:30',
    endTime: '08:15',
    startMinutes: parseTimeToMinutes('07:30'),
    endMinutes: parseTimeToMinutes('08:15'),
    subject: 'Toán',
    className: '10A1',
    classCode: '10A1-TOAN',
    room: 'P.204',
    teacher: 'Nguyễn Văn An',
    teacherNickname: 'Thầy An',
    type: 'CK',
    status: 'completed',
    notes: 'Đại số: Mệnh đề & Tập hợp',
  },
  {
    id: 'tkb_t2_2',
    dayOfWeek: 1,
    dayName: 'Thứ Hai',
    period: 2,
    time: '08:20 - 09:05', // Cách tiết 1 chỉ 5 phút (<=20p => kề nhau)
    startTime: '08:20',
    endTime: '09:05',
    startMinutes: parseTimeToMinutes('08:20'),
    endMinutes: parseTimeToMinutes('09:05'),
    subject: 'Toán',
    className: '10A1',
    classCode: '10A1-TOAN',
    room: 'P.204',
    teacher: 'Nguyễn Văn An',
    teacherNickname: 'Thầy An',
    type: 'CK',
    status: 'completed',
    notes: 'Luyện tập bài tập sách giáo khoa',
  },
  {
    id: 'tkb_t2_3',
    dayOfWeek: 1,
    dayName: 'Thứ Hai',
    period: 3,
    time: '09:30 - 10:15', // Cách tiết 2 là 25 phút (>20p => ra chơi)
    startTime: '09:30',
    endTime: '10:15',
    startMinutes: parseTimeToMinutes('09:30'),
    endMinutes: parseTimeToMinutes('10:15'),
    subject: 'Vật Lý',
    className: '10A1',
    classCode: '10A1-LY',
    room: 'P.301',
    teacher: 'Trần Minh Đức',
    teacherNickname: 'Thầy Đức',
    type: 'CK',
    status: 'ongoing',
    notes: 'Động học chất điểm - Đo vận tốc',
  },
  {
    id: 'tkb_t2_4',
    dayOfWeek: 1,
    dayName: 'Thứ Hai',
    period: 4,
    time: '10:20 - 11:05', // Cách tiết 3 chỉ 5 phút
    startTime: '10:20',
    endTime: '11:05',
    startMinutes: parseTimeToMinutes('10:20'),
    endMinutes: parseTimeToMinutes('11:05'),
    subject: 'Hóa Học',
    className: '10A1',
    classCode: '10A1-HOA',
    room: 'P.Lab Hóa',
    teacher: 'Trần Thị Mai',
    teacherNickname: 'Cô Mai',
    type: 'CK',
    status: 'upcoming',
    notes: 'Cấu tạo nguyên tử & Bảng tuần hoàn',
  },
  {
    id: 'tkb_t2_5',
    dayOfWeek: 1,
    dayName: 'Thứ Hai',
    period: 5,
    time: '14:00 - 14:45', // Buổi chiều
    startTime: '14:00',
    endTime: '14:45',
    startMinutes: parseTimeToMinutes('14:00'),
    endMinutes: parseTimeToMinutes('14:45'),
    subject: 'Toán NC',
    className: '10A1',
    classCode: '10A1-TOAN',
    room: 'P.204',
    teacher: 'Nguyễn Văn An',
    teacherNickname: 'Thầy An',
    type: 'HT',
    status: 'upcoming',
    notes: 'Bồi dưỡng học sinh giỏi - Bất đẳng thức',
  },

  // Thứ Ba (dayOfWeek: 2)
  {
    id: 'tkb_t3_1',
    dayOfWeek: 2,
    dayName: 'Thứ Ba',
    period: 1,
    time: '07:30 - 08:15',
    startTime: '07:30',
    endTime: '08:15',
    startMinutes: parseTimeToMinutes('07:30'),
    endMinutes: parseTimeToMinutes('08:15'),
    subject: 'Ngữ Văn',
    className: '10A1',
    classCode: '10A1-VAN',
    room: 'P.204',
    teacher: 'Lê Thu Hà',
    teacherNickname: 'Cô Hà',
    type: 'CK',
    status: 'upcoming',
    notes: 'Văn học dân gian & Sử thi Đăm Săn',
  },
  {
    id: 'tkb_t3_2',
    dayOfWeek: 2,
    dayName: 'Thứ Ba',
    period: 2,
    time: '08:20 - 09:05',
    startTime: '08:20',
    endTime: '09:05',
    startMinutes: parseTimeToMinutes('08:20'),
    endMinutes: parseTimeToMinutes('09:05'),
    subject: 'Ngữ Văn',
    className: '10A1',
    classCode: '10A1-VAN',
    room: 'P.204',
    teacher: 'Lê Thu Hà',
    teacherNickname: 'Cô Hà',
    type: 'CK',
    status: 'upcoming',
    notes: 'Thực hành Tiếng Việt: Biện pháp tu từ',
  },
  {
    id: 'tkb_t3_3',
    dayOfWeek: 2,
    dayName: 'Thứ Ba',
    period: 3,
    time: '09:30 - 10:15',
    startTime: '09:30',
    endTime: '10:15',
    startMinutes: parseTimeToMinutes('09:30'),
    endMinutes: parseTimeToMinutes('10:15'),
    subject: 'Tiếng Anh',
    className: '10A1',
    classCode: '10A1-ANH',
    room: 'P.Lab Ngoại ngữ',
    teacher: 'Phạm Hồng Nhung',
    teacherNickname: 'Cô Nhung',
    type: 'CK',
    status: 'upcoming',
    notes: 'Unit 1: Family Life - Grammar Focus',
  },
  {
    id: 'tkb_t3_4',
    dayOfWeek: 2,
    dayName: 'Thứ Ba',
    period: 4,
    time: '10:20 - 11:05',
    startTime: '10:20',
    endTime: '11:05',
    startMinutes: parseTimeToMinutes('10:20'),
    endMinutes: parseTimeToMinutes('11:05'),
    subject: 'Lịch Sử',
    className: '10A1',
    classCode: '10A1-SU',
    room: 'P.204',
    teacher: 'Hoàng Quốc Tuấn',
    teacherNickname: 'Thầy Tuấn',
    type: 'CK',
    status: 'upcoming',
    notes: 'Hiện thực lịch sử và nhận thức lịch sử',
  },
  {
    id: 'tkb_t3_5',
    dayOfWeek: 2,
    dayName: 'Thứ Ba',
    period: 5,
    time: '14:00 - 14:45',
    startTime: '14:00',
    endTime: '14:45',
    startMinutes: parseTimeToMinutes('14:00'),
    endMinutes: parseTimeToMinutes('14:45'),
    subject: 'Anh Văn GT',
    className: '10A1',
    classCode: '10A1-ANH',
    room: 'P.Ngoại ngữ',
    teacher: 'Phạm Hồng Nhung',
    teacherNickname: 'Cô Nhung',
    type: 'HT',
    status: 'upcoming',
    notes: 'Luyện giao tiếp phản xạ theo chủ đề',
  },

  // Thứ Tư (dayOfWeek: 3)
  {
    id: 'tkb_t4_1',
    dayOfWeek: 3,
    dayName: 'Thứ Tư',
    period: 1,
    time: '07:30 - 08:15',
    startTime: '07:30',
    endTime: '08:15',
    startMinutes: parseTimeToMinutes('07:30'),
    endMinutes: parseTimeToMinutes('08:15'),
    subject: 'Toán',
    className: '10A1',
    classCode: '10A1-TOAN',
    room: 'P.204',
    teacher: 'Nguyễn Văn An',
    teacherNickname: 'Thầy An',
    type: 'CK',
    status: 'upcoming',
    notes: 'Hình học: Vectơ và các phép toán',
  },
  {
    id: 'tkb_t4_2',
    dayOfWeek: 3,
    dayName: 'Thứ Tư',
    period: 2,
    time: '08:20 - 09:05',
    startTime: '08:20',
    endTime: '09:05',
    startMinutes: parseTimeToMinutes('08:20'),
    endMinutes: parseTimeToMinutes('09:05'),
    subject: 'Tin Học',
    className: '10A1',
    classCode: '10A1-TIN',
    room: 'P.Máy 1',
    teacher: 'Vũ Hải Long',
    teacherNickname: 'Thầy Long',
    type: 'CK',
    status: 'upcoming',
    notes: 'Lập trình Python: Biến & Kiểu dữ liệu',
  },
  {
    id: 'tkb_t4_3',
    dayOfWeek: 3,
    dayName: 'Thứ Tư',
    period: 3,
    time: '09:30 - 10:15',
    startTime: '09:30',
    endTime: '10:15',
    startMinutes: parseTimeToMinutes('09:30'),
    endMinutes: parseTimeToMinutes('10:15'),
    subject: 'Tin Học',
    className: '10A1',
    classCode: '10A1-TIN',
    room: 'P.Máy 1',
    teacher: 'Vũ Hải Long',
    teacherNickname: 'Thầy Long',
    type: 'CK',
    status: 'upcoming',
    notes: 'Thực hành thuật toán điều kiện if-else',
  },
  {
    id: 'tkb_t4_4',
    dayOfWeek: 3,
    dayName: 'Thứ Tư',
    period: 4,
    time: '10:20 - 11:05',
    startTime: '10:20',
    endTime: '11:05',
    startMinutes: parseTimeToMinutes('10:20'),
    endMinutes: parseTimeToMinutes('11:05'),
    subject: 'Sinh Học',
    className: '10A1',
    classCode: '10A1-SINH',
    room: 'P.204',
    teacher: 'Đỗ Thùy Trang',
    teacherNickname: 'Cô Trang',
    type: 'CK',
    status: 'upcoming',
    notes: 'Tế bào nhân sơ & Tế bào nhân thực',
  },

  // Thứ Năm (dayOfWeek: 4)
  {
    id: 'tkb_t5_1',
    dayOfWeek: 4,
    dayName: 'Thứ Năm',
    period: 1,
    time: '07:30 - 08:15',
    startTime: '07:30',
    endTime: '08:15',
    startMinutes: parseTimeToMinutes('07:30'),
    endMinutes: parseTimeToMinutes('08:15'),
    subject: 'Vật Lý',
    className: '10A1',
    classCode: '10A1-LY',
    room: 'P.301',
    teacher: 'Trần Minh Đức',
    teacherNickname: 'Thầy Đức',
    type: 'CK',
    status: 'upcoming',
    notes: 'Chuyển động thẳng biến đổi đều',
  },
  {
    id: 'tkb_t5_2',
    dayOfWeek: 4,
    dayName: 'Thứ Năm',
    period: 2,
    time: '08:20 - 09:05',
    startTime: '08:20',
    endTime: '09:05',
    startMinutes: parseTimeToMinutes('08:20'),
    endMinutes: parseTimeToMinutes('09:05'),
    subject: 'Địa Lý',
    className: '10A1',
    classCode: '10A1-DIA',
    room: 'P.204',
    teacher: 'Lâm Văn Khoa',
    teacherNickname: 'Thầy Khoa',
    type: 'CK',
    status: 'upcoming',
    notes: 'Bản đồ và các phương pháp biểu hiện',
  },
  {
    id: 'tkb_t5_3',
    dayOfWeek: 4,
    dayName: 'Thứ Năm',
    period: 3,
    time: '09:30 - 10:15',
    startTime: '09:30',
    endTime: '10:15',
    startMinutes: parseTimeToMinutes('09:30'),
    endMinutes: parseTimeToMinutes('10:15'),
    subject: 'Toán',
    className: '10A1',
    classCode: '10A1-TOAN',
    room: 'P.204',
    teacher: 'Nguyễn Văn An',
    teacherNickname: 'Thầy An',
    type: 'CK',
    status: 'upcoming',
    notes: 'Hàm số bậc hai và đồ thị parabol',
  },
  {
    id: 'tkb_t5_4',
    dayOfWeek: 4,
    dayName: 'Thứ Năm',
    period: 4,
    time: '15:00 - 15:45', // Tiết học thêm buổi chiều
    startTime: '15:00',
    endTime: '15:45',
    startMinutes: parseTimeToMinutes('15:00'),
    endMinutes: parseTimeToMinutes('15:45'),
    subject: 'Lý Nâng Cao',
    className: '10A1',
    classCode: '10A1-LY',
    room: 'P.301',
    teacher: 'Trần Minh Đức',
    teacherNickname: 'Thầy Đức',
    type: 'HT',
    status: 'upcoming',
    notes: 'Giải toán chuyển động tròn đều & Gia tốc',
  },

  // Thứ Sáu (dayOfWeek: 5)
  {
    id: 'tkb_t6_1',
    dayOfWeek: 5,
    dayName: 'Thứ Sáu',
    period: 1,
    time: '07:30 - 08:15',
    startTime: '07:30',
    endTime: '08:15',
    startMinutes: parseTimeToMinutes('07:30'),
    endMinutes: parseTimeToMinutes('08:15'),
    subject: 'Hóa Học',
    className: '10A1',
    classCode: '10A1-HOA',
    room: 'P.Lab Hóa',
    teacher: 'Trần Thị Mai',
    teacherNickname: 'Cô Mai',
    type: 'CK',
    status: 'upcoming',
    notes: 'Liên kết ion & Liên kết cộng hóa trị',
  },
  {
    id: 'tkb_t6_2',
    dayOfWeek: 5,
    dayName: 'Thứ Sáu',
    period: 2,
    time: '08:20 - 09:05',
    startTime: '08:20',
    endTime: '09:05',
    startMinutes: parseTimeToMinutes('08:20'),
    endMinutes: parseTimeToMinutes('09:05'),
    subject: 'Giáo Dục QP',
    className: '10A1',
    classCode: '10A1-QP',
    room: 'Sân trường',
    teacher: 'Phan Văn Hùng',
    teacherNickname: 'Thầy Hùng',
    type: 'CK',
    status: 'upcoming',
    notes: 'Điều lệnh đội ngũ từng người',
  },
  {
    id: 'tkb_t6_3',
    dayOfWeek: 5,
    dayName: 'Thứ Sáu',
    period: 3,
    time: '09:30 - 10:15',
    startTime: '09:30',
    endTime: '10:15',
    startMinutes: parseTimeToMinutes('09:30'),
    endMinutes: parseTimeToMinutes('10:15'),
    subject: 'Toán',
    className: '10A1',
    classCode: '10A1-TOAN',
    room: 'P.204',
    teacher: 'Nguyễn Văn An',
    teacherNickname: 'Thầy An',
    type: 'CK',
    status: 'upcoming',
    notes: 'Kiểm tra 1 tiết định kỳ Đại số',
  },
  {
    id: 'tkb_t6_4',
    dayOfWeek: 5,
    dayName: 'Thứ Sáu',
    period: 4,
    time: '10:20 - 11:05',
    startTime: '10:20',
    endTime: '11:05',
    startMinutes: parseTimeToMinutes('10:20'),
    endMinutes: parseTimeToMinutes('11:05'),
    subject: 'Sinh Hoạt',
    className: '10A1',
    classCode: '10A1-SHL',
    room: 'P.204',
    teacher: 'Nguyễn Văn An',
    teacherNickname: 'Thầy An',
    type: 'CK',
    status: 'upcoming',
    notes: 'Tổng kết thi đua tuần & Phổ biến kế hoạch',
  },

  // Thứ Bảy (dayOfWeek: 6)
  {
    id: 'tkb_t7_1',
    dayOfWeek: 6,
    dayName: 'Thứ Bảy',
    period: 1,
    time: '08:00 - 08:45',
    startTime: '08:00',
    endTime: '08:45',
    startMinutes: parseTimeToMinutes('08:00'),
    endMinutes: parseTimeToMinutes('08:45'),
    subject: 'Toán Ôn Thi',
    className: '10A1',
    classCode: '10A1-TOAN',
    room: 'P.204',
    teacher: 'Nguyễn Văn An',
    teacherNickname: 'Thầy An',
    type: 'HT',
    status: 'upcoming',
    notes: 'Chuyên đề giải toán trắc nghiệm nhanh',
  },
  {
    id: 'tkb_t7_2',
    dayOfWeek: 6,
    dayName: 'Thứ Bảy',
    period: 2,
    time: '08:50 - 09:35', // <= 20 phút => kề nhau
    startTime: '08:50',
    endTime: '09:35',
    startMinutes: parseTimeToMinutes('08:50'),
    endMinutes: parseTimeToMinutes('09:35'),
    subject: 'Hóa Chuyên',
    className: '10A1',
    classCode: '10A1-HOA',
    room: 'P.Lab Hóa',
    teacher: 'Trần Thị Mai',
    teacherNickname: 'Cô Mai',
    type: 'HT',
    status: 'upcoming',
    notes: 'Phản ứng Oxi hóa - Khử nâng cao',
  },
  {
    id: 'tkb_t7_3',
    dayOfWeek: 6,
    dayName: 'Thứ Bảy',
    period: 3,
    time: '14:30 - 15:15',
    startTime: '14:30',
    endTime: '15:15',
    startMinutes: parseTimeToMinutes('14:30'),
    endMinutes: parseTimeToMinutes('15:15'),
    subject: 'CLB Tin Học',
    className: '10A1',
    classCode: 'CLB-TIN',
    room: 'P.Máy 1',
    teacher: 'Vũ Hải Long',
    teacherNickname: 'Thầy Long',
    type: 'HT',
    status: 'upcoming',
    notes: 'Sinh hoạt CLB lập trình thi Tin học trẻ',
  },

  // Chủ Nhật (dayOfWeek: 7)
  {
    id: 'tkb_cn_1',
    dayOfWeek: 7,
    dayName: 'Chủ Nhật',
    period: 1,
    time: '08:30 - 09:15',
    startTime: '08:30',
    endTime: '09:15',
    startMinutes: parseTimeToMinutes('08:30'),
    endMinutes: parseTimeToMinutes('09:15'),
    subject: 'IELTS Cơ Bản',
    className: '10A1',
    classCode: '10A1-IELTS',
    room: 'P.Ngoại ngữ',
    teacher: 'Phạm Hồng Nhung',
    teacherNickname: 'Cô Nhung',
    type: 'HT',
    status: 'upcoming',
    notes: 'Kỹ năng Listening & Reading Cam 18',
  },

  // Một số tiết của các lớp khác để kiểm tra tính năng lọc / nhập tay tên lớp
  {
    id: 'tkb_11b2_1',
    dayOfWeek: 1,
    dayName: 'Thứ Hai',
    period: 4,
    time: '10:20 - 11:05',
    startTime: '10:20',
    endTime: '11:05',
    startMinutes: parseTimeToMinutes('10:20'),
    endMinutes: parseTimeToMinutes('11:05'),
    subject: 'Vật Lý 11',
    className: '11B2',
    classCode: '11B2-LY',
    room: 'P.302',
    teacher: 'Trần Minh Đức',
    teacherNickname: 'Thầy Đức',
    type: 'CK',
    status: 'upcoming',
    notes: 'Điện trường & Điện thế',
  },
  {
    id: 'tkb_12a3_1',
    dayOfWeek: 2,
    dayName: 'Thứ Ba',
    period: 1,
    time: '07:30 - 08:15',
    startTime: '07:30',
    endTime: '08:15',
    startMinutes: parseTimeToMinutes('07:30'),
    endMinutes: parseTimeToMinutes('08:15'),
    subject: 'Hóa Học 12',
    className: '12A3',
    classCode: '12A3-HOA',
    room: 'P.105',
    teacher: 'Trần Thị Mai',
    teacherNickname: 'Cô Mai',
    type: 'CK',
    status: 'upcoming',
    notes: 'Este - Lipit ôn thi tốt nghiệp',
  },
];

// Danh sách 7 thứ trong tuần
const ALL_WEEK_DAYS = [
  { num: 1, code: 'T2', label: 'Thứ Hai', fullDateText: 'Thứ 2' },
  { num: 2, code: 'T3', label: 'Thứ Ba', fullDateText: 'Thứ 3' },
  { num: 3, code: 'T4', label: 'Thứ Tư', fullDateText: 'Thứ 4' },
  { num: 4, code: 'T5', label: 'Thứ Năm', fullDateText: 'Thứ 5' },
  { num: 5, code: 'T6', label: 'Thứ Sáu', fullDateText: 'Thứ 6' },
  { num: 6, code: 'T7', label: 'Thứ Bảy', fullDateText: 'Thứ 7' },
  { num: 7, code: 'CN', label: 'Chủ Nhật', fullDateText: 'Chủ Nhật' },
];

// Danh sách gợi ý lớp học
const CLASS_SUGGESTIONS = ['10A1', '10A2', '11B2', '12A3', '12A1'];

export const ThoiKhoaBieuView: React.FC = () => {
  const [schedule] = useState<ExtendedScheduleItem[]>(INITIAL_EXTENDED_SCHEDULE);
  
  // Chế độ xem: 7 cột (full) hoặc 3 cột thu gọn (compact: Hôm nay, Ngày mai, Ngày kia)
  const [columnMode, setColumnMode] = useState<'full' | 'compact'>('full');
  
  // Vai trò xem: Học sinh (Tiết học) hoặc Giáo viên (Tiết dạy)
  const [roleMode, setRoleMode] = useState<'student' | 'teacher'>('student');
  
  // Tên lớp có thể chọn hoặc nhập tay
  const [classNameInput, setClassNameInput] = useState<string>('10A1');
  
  // Bộ lọc hình thức: Tất cả / Chính khóa (CK) / Học thêm (HT)
  const [typeFilter, setTypeFilter] = useState<'all' | 'CK' | 'HT'>('all');
  
  // Ngày neo cho chế độ 3 ngày thu gọn (1 = Thứ 2, 2 = Thứ 3, ...)
  const [compactStartDay, setCompactStartDay] = useState<number>(1);
  
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Xác định các cột thứ được hiển thị theo columnMode
  const activeDays = useMemo(() => {
    if (columnMode === 'full') {
      return ALL_WEEK_DAYS;
    }
    // Chế độ 3 ngày: Hôm nay, Ngày mai, Ngày kia
    const res = [];
    const dayLabels = ['Hôm nay', 'Ngày mai', 'Ngày kia'];
    for (let i = 0; i < 3; i++) {
      let targetDayNum = ((compactStartDay - 1 + i) % 7) + 1;
      const found = ALL_WEEK_DAYS.find(d => d.num === targetDayNum);
      if (found) {
        res.push({
          ...found,
          compactLabel: dayLabels[i],
        });
      }
    }
    return res;
  }, [columnMode, compactStartDay]);

  // Lọc dữ liệu theo tên lớp (gõ tay hoặc chọn) và bộ lọc CK / HT
  const filteredSchedule = useMemo(() => {
    return schedule.filter(item => {
      // Lọc theo lớp (nếu rỗng thì hiển thị tất cả)
      if (classNameInput.trim()) {
        const matchesClass = item.className.toLowerCase().includes(classNameInput.trim().toLowerCase());
        if (!matchesClass) return false;
      }
      // Lọc theo loại CK / HT
      if (typeFilter !== 'all' && item.type !== typeFilter) {
        return false;
      }
      return true;
    });
  }, [schedule, classNameInput, typeFilter]);

  // Xác định danh sách các tiết / ca duy nhất có trong hệ thống, sắp xếp theo giờ bắt đầu
  const distinctPeriods = useMemo(() => {
    // Thu thập tất cả các tiết và giờ bắt đầu để tạo các hàng chuẩn
    const periodMap = new Map<number, { period: number; defaultTime: string; startMinutes: number }>();
    
    filteredSchedule.forEach(item => {
      if (!periodMap.has(item.period)) {
        periodMap.set(item.period, {
          period: item.period,
          defaultTime: item.time,
          startMinutes: item.startMinutes,
        });
      } else {
        // Cập nhật phút nhỏ nhất nếu có
        const current = periodMap.get(item.period)!;
        if (item.startMinutes < current.startMinutes) {
          periodMap.set(item.period, {
            period: item.period,
            defaultTime: item.time,
            startMinutes: item.startMinutes,
          });
        }
      }
    });

    // Nếu không có tiết nào, tạo mặc định tiết 1 đến tiết 5
    if (periodMap.size === 0) {
      return [
        { period: 1, defaultTime: '07:30 - 08:15', startMinutes: 450 },
        { period: 2, defaultTime: '08:20 - 09:05', startMinutes: 500 },
        { period: 3, defaultTime: '09:30 - 10:15', startMinutes: 570 },
        { period: 4, defaultTime: '10:20 - 11:05', startMinutes: 620 },
        { period: 5, defaultTime: '14:00 - 14:45', startMinutes: 840 },
      ];
    }

    return Array.from(periodMap.values()).sort((a, b) => a.period - b.period);
  }, [filteredSchedule]);

  // Hàm kiểm tra khoảng cách thời gian giữa 2 hàng/tiết liên tiếp
  // (nếu khoảng cách tiết/ca <= 20 phút thì được xem là kề nhau, nếu > 20 phút thì có khoảng nghỉ giải lao/chuyển ca)
  const getGapInfo = (prevIndex: number, currIndex: number) => {
    if (prevIndex < 0 || currIndex < 0) return null;
    const prevPeriod = distinctPeriods[prevIndex];
    const currPeriod = distinctPeriods[currIndex];
    if (!prevPeriod || !currPeriod) return null;

    // Giả định mỗi tiết kéo dài 45 phút
    const prevEstimatedEnd = prevPeriod.startMinutes + 45;
    const gap = currPeriod.startMinutes - prevEstimatedEnd;
    
    if (gap > 20) {
      return {
        isAdjacent: false,
        gapMinutes: gap,
        label: gap >= 120 ? 'Nghỉ trưa / Chuyển ca chiều' : `Giải lao ${gap} phút (Khoảng cách > 20p)`,
      };
    }
    return {
      isAdjacent: true,
      gapMinutes: Math.max(0, gap),
      label: 'Kề nhau (≤ 20 phút)',
    };
  };

  const handleSyncToDrive = async () => {
    const res = await savePersonalScheduleToDrive('u_hs01', schedule);
    setSyncMessage(`Đã lưu Thời khóa biểu "${res.fileName}" vào Google Drive cá nhân!`);
    setTimeout(() => setSyncMessage(null), 4000);
  };

  return (
    <div id="learning-schedule-view" className="space-y-5">
      {/* Toast Notification */}
      {syncMessage && (
        <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs">
          <Cloud className="w-4 h-4 text-blue-600 shrink-0" />
          <span>{syncMessage}</span>
        </div>
      )}

      {/* Header & Controls Panel */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  Thời Khóa Biểu {roleMode === 'teacher' ? 'Lịch Giảng Dạy' : 'Lịch Học Tập'}
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700">
                  {columnMode === 'full' ? 'Bảng 7 Cột (Thứ 2 - CN)' : 'Bảng 3 Cột Thu Gọn'}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {roleMode === 'teacher'
                  ? 'Mỗi hàng tương ứng 1 tiết / ca dạy của giáo viên'
                  : 'Mỗi hàng tương ứng 1 tiết / ca học của học sinh'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Chuyển đổi đối tượng xem: Học sinh / Giáo viên */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                id="btn-role-student"
                onClick={() => setRoleMode('student')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  roleMode === 'student'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Xem dưới góc nhìn học sinh (ca học)"
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Ca học (Học sinh)</span>
              </button>
              <button
                id="btn-role-teacher"
                onClick={() => setRoleMode('teacher')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  roleMode === 'teacher'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Xem dưới góc nhìn giáo viên (ca dạy)"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Ca dạy (Giáo viên)</span>
              </button>
            </div>

            {/* Chuyển đổi Chế độ cột: 7 cột đầy đủ vs 3 cột thu gọn */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                id="btn-mode-full-7col"
                onClick={() => setColumnMode('full')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  columnMode === 'full'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Đầy đủ (7 cột)
              </button>
              <button
                id="btn-mode-compact-3col"
                onClick={() => setColumnMode('compact')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  columnMode === 'compact'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Thu gọn (3 cột)
              </button>
            </div>

            {/* Lưu vào Drive */}
            <button
              id="btn-sync-schedule-drive"
              onClick={handleSyncToDrive}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors cursor-pointer"
            >
              <Cloud className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Lưu TKB vào Drive</span>
            </button>
          </div>
        </div>

        {/* Thanh công cụ lọc: Nhập tay / Chọn tên lớp & Phân loại CK/HT & Điều hướng 3 ngày */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            {/* Tên lớp: Chọn hoặc nhập tay */}
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-700 flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                <span>Tên lớp:</span>
              </span>
              <div className="relative">
                <input
                  id="input-class-name"
                  type="text"
                  list="class-suggestions-list"
                  value={classNameInput}
                  onChange={e => setClassNameInput(e.target.value)}
                  placeholder="Gõ hoặc chọn lớp..."
                  className="w-36 px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800"
                />
                <datalist id="class-suggestions-list">
                  {CLASS_SUGGESTIONS.map(cls => (
                    <option key={cls} value={cls} />
                  ))}
                </datalist>
              </div>
              {classNameInput && (
                <button
                  onClick={() => setClassNameInput('')}
                  className="text-[11px] text-slate-400 hover:text-slate-600 cursor-pointer underline"
                >
                  Xóa lọc
                </button>
              )}
            </div>

            {/* Lọc Chính khóa (CK) & Học thêm (HT) */}
            <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
              <span className="font-semibold text-slate-700 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <span>Phân loại:</span>
              </span>
              <div className="flex items-center gap-1">
                <button
                  id="btn-filter-all"
                  onClick={() => setTypeFilter('all')}
                  className={`px-2 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-colors ${
                    typeFilter === 'all'
                      ? 'bg-slate-800 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Tất cả
                </button>
                <button
                  id="btn-filter-ck"
                  onClick={() => setTypeFilter('CK')}
                  className={`px-2 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-colors flex items-center gap-1 ${
                    typeFilter === 'CK'
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  Chính khóa (CK)
                </button>
                <button
                  id="btn-filter-ht"
                  onClick={() => setTypeFilter('HT')}
                  className={`px-2 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-colors flex items-center gap-1 ${
                    typeFilter === 'HT'
                      ? 'bg-amber-600 text-white'
                      : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  Học/Dạy thêm (HT)
                </button>
              </div>
            </div>
          </div>

          {/* Điều hướng mốc ngày khi ở chế độ 3 ngày thu gọn */}
          {columnMode === 'compact' && (
            <div className="flex items-center gap-2 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
              <span className="text-[11px] font-medium text-slate-500">Mốc bắt đầu:</span>
              <button
                onClick={() => setCompactStartDay(prev => (prev === 1 ? 7 : prev - 1))}
                className="p-1 hover:bg-slate-200 rounded cursor-pointer text-slate-600"
                title="Lùi 1 ngày"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="font-bold text-slate-800 text-xs">
                {ALL_WEEK_DAYS.find(d => d.num === compactStartDay)?.label}
              </span>
              <button
                onClick={() => setCompactStartDay(prev => (prev === 7 ? 1 : prev + 1))}
                className="p-1 hover:bg-slate-200 rounded cursor-pointer text-slate-600"
                title="Tiến 1 ngày"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Chú giải quy chuẩn hiển thị ô thời khóa biểu */}
      <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-3 text-xs text-indigo-900 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-indigo-600 shrink-0" />
          <span className="font-medium">
            <strong>Cấu trúc mỗi ô TKB:</strong> Hàng 1: Tên môn (45%) & Tên lớp | Hàng 2: Nickname giáo viên (45%) & Giờ bắt đầu | Hàng 3: Ghi chú tiết học.
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1 font-semibold text-blue-700">
            <span className="px-1.5 py-0.2 rounded bg-blue-100 border border-blue-200 text-[10px]">CK</span> Chính khóa
          </span>
          <span className="flex items-center gap-1 font-semibold text-amber-700">
            <span className="px-1.5 py-0.2 rounded bg-amber-100 border border-amber-200 text-[10px]">HT</span> Học/Dạy thêm
          </span>
          <span className="text-slate-500 italic">Khoảng cách ≤ 20 phút được xem là kề nhau</span>
        </div>
      </div>

      {/* BẢNG THỜI KHÓA BIỂU DẠNG 7 CỘT HOẶC 3 CỘT THU GỌN */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-700">
                {/* Cột tiêu đề hàng (Tiết / Ca) */}
                <th className="p-3 text-xs font-bold text-slate-600 w-28 min-w-[100px] border-r border-slate-200 sticky left-0 bg-slate-50 z-10">
                  {roleMode === 'teacher' ? 'Tiết / Ca Dạy' : 'Tiết / Ca Học'}
                </th>

                {/* Các cột Thứ (Độ rộng cột tối thiểu 110px theo yêu cầu) */}
                {activeDays.map(day => (
                  <th
                    key={day.num}
                    className="p-3 text-xs font-bold border-r border-slate-200 min-w-[110px] w-auto"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-slate-900 font-extrabold">{day.label}</span>
                      {columnMode === 'compact' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 font-semibold">
                          {(day as any).compactLabel}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                      {filteredSchedule.filter(s => s.dayOfWeek === day.num).length} tiết
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {distinctPeriods.map((periodRow, index) => {
                // Kiểm tra xem tiết này có cách tiết trước > 20 phút không
                const gapInfo = index > 0 ? getGapInfo(index - 1, index) : null;
                const isBreakTime = gapInfo && !gapInfo.isAdjacent;

                return (
                  <React.Fragment key={`row-period-${periodRow.period}`}>
                    {/* Dải phân cách thời gian nếu khoảng cách > 20 phút (ví dụ giờ giải lao hoặc nghỉ trưa) */}
                    {isBreakTime && (
                      <tr className="bg-amber-50/40 border-y border-amber-200/60">
                        <td
                          colSpan={activeDays.length + 1}
                          className="px-4 py-1.5 text-[11px] font-semibold text-amber-800 flex-1"
                        >
                          <div className="flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            <span>{gapInfo.label}</span>
                            <span className="text-amber-600 text-[10px] font-normal">
                              (Khoảng cách giữa các ca &gt; 20 phút)
                            </span>
                          </div>
                        </td>
                      </tr>
                    )}

                    <tr className="border-b border-slate-100 hover:bg-slate-50/40 transition-colors">
                      {/* Cột 1: Thông tin Tiết / Ca */}
                      <td className="p-3 border-r border-slate-200 sticky left-0 bg-white z-10">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-800 font-bold flex items-center justify-center text-xs">
                            {periodRow.period}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-800">
                              {roleMode === 'teacher' ? `Ca ${periodRow.period}` : `Tiết ${periodRow.period}`}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {periodRow.defaultTime.split(' - ')[0]}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Các ô Thời khóa biểu của từng thứ */}
                      {activeDays.map(day => {
                        // Tìm tiết học tương ứng của thứ và tiết này
                        const lesson = filteredSchedule.find(
                          s => s.dayOfWeek === day.num && s.period === periodRow.period
                        );

                        return (
                          <td
                            key={`cell-${day.num}-${periodRow.period}`}
                            className="p-2 border-r border-slate-200 align-top min-w-[110px]"
                          >
                            {lesson ? (
                              <div
                                id={`tkb-cell-${lesson.id}`}
                                className={`rounded-xl p-2.5 transition-all space-y-1.5 border relative ${
                                  lesson.type === 'CK'
                                    ? 'bg-blue-50/40 border-blue-200/80 hover:border-blue-400 hover:bg-blue-50/70'
                                    : 'bg-amber-50/40 border-amber-200/80 hover:border-amber-400 hover:bg-amber-50/70'
                                }`}
                              >
                                {/* Nhãn phân chia Tiết chính khóa (CK) và Tiết dạy/học thêm (HT) */}
                                <div className="absolute top-1.5 right-1.5">
                                  <span
                                    className={`px-1 py-0.2 rounded text-[9px] font-extrabold tracking-tight ${
                                      lesson.type === 'CK'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-amber-600 text-white'
                                    }`}
                                    title={lesson.type === 'CK' ? 'Chính khóa (CK)' : 'Học thêm / Dạy thêm (HT)'}
                                  >
                                    {lesson.type}
                                  </span>
                                </div>

                                {/* HÀNG 1: Tên môn 45% và Tên lớp */}
                                <div className="flex items-center justify-between gap-1 pr-6">
                                  <span
                                    className="w-[45%] truncate font-bold text-slate-900 text-xs"
                                    title={lesson.subject}
                                  >
                                    {lesson.subject}
                                  </span>
                                  <span
                                    className="flex-1 text-right truncate font-semibold text-indigo-700 bg-white/80 px-1.5 py-0.5 rounded text-[10px] border border-slate-200/60 shadow-2xs"
                                    title={`Lớp ${lesson.className}`}
                                  >
                                    {lesson.className}
                                  </span>
                                </div>

                                {/* HÀNG 2: Nickname giáo viên 45% và Tiết/ca (giờ bắt đầu tiết/ca) */}
                                <div className="flex items-center justify-between gap-1 text-[11px] text-slate-600 pt-0.5">
                                  <span
                                    className="w-[45%] truncate font-medium text-slate-700"
                                    title={lesson.teacherNickname || lesson.teacher}
                                  >
                                    {lesson.teacherNickname || lesson.teacher}
                                  </span>
                                  <span
                                    className="flex-1 text-right truncate font-mono text-[10px] text-slate-500 font-semibold"
                                    title={`Bắt đầu lúc ${lesson.startTime}`}
                                  >
                                    T{lesson.period} • {lesson.startTime}
                                  </span>
                                </div>

                                {/* HÀNG 3: Ghi chú tiết học */}
                                <div className="pt-0.5 border-t border-slate-200/60">
                                  <p
                                    className="text-[10px] text-slate-500 italic truncate"
                                    title={lesson.notes || 'Không có ghi chú'}
                                  >
                                    {lesson.notes ? lesson.notes : '—'}
                                  </p>
                                </div>
                              </div>
                            ) : (
                              // Ô trống (không có tiết)
                              <div className="h-16 rounded-xl border border-dashed border-slate-200/70 flex items-center justify-center text-slate-300 text-[10px] italic">
                                Trống
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tóm tắt thống kê nhanh theo lớp đang chọn */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span className="text-slate-600">
            Đang lọc lớp: <strong className="text-slate-900">{classNameInput || 'Tất cả các lớp'}</strong>
          </span>
          <span className="text-slate-400">•</span>
          <span className="text-slate-600">
            Tổng cộng <strong className="text-indigo-600">{filteredSchedule.length}</strong> tiết / ca
            ({filteredSchedule.filter(s => s.type === 'CK').length} CK, {filteredSchedule.filter(s => s.type === 'HT').length} HT)
          </span>
        </div>

        <div className="flex items-center gap-2 text-slate-500 text-[11px]">
          <span>Phòng ban: THPT & Khối Chuyên</span>
          <span>•</span>
          <span>Học kỳ II (2025 - 2026)</span>
        </div>
      </div>
    </div>
  );
};

