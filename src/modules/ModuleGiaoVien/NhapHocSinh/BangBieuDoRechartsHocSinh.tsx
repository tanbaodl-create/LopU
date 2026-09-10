import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from 'recharts';
import { Download, FileSpreadsheet, FileText, BarChart3 } from 'lucide-react';
import * as XLSX from 'xlsx';

const subjectScoreData = [
  { subject: 'Toán Học', dtb: 8.4, pass: 95, fail: 5 },
  { subject: 'Vật Lý', dtb: 7.9, pass: 90, fail: 10 },
  { subject: 'Hóa Học', dtb: 8.1, pass: 92, fail: 8 },
  { subject: 'Ngữ Văn', dtb: 7.6, pass: 88, fail: 12 },
  { subject: 'Tiếng Anh', dtb: 8.8, pass: 98, fail: 2 },
  { subject: 'Sinh Học', dtb: 8.2, pass: 94, fail: 6 },
];

const passFailPieData = [
  { name: 'Đạt (>= 5.0)', value: 92, color: '#10b981' },
  { name: 'Chưa Đạt (< 5.0)', value: 8, color: '#f43f5e' },
];

const scoreDistributionData = [
  { range: 'Xuất sắc (9.0 - 10)', count: 12 },
  { range: 'Giỏi (8.0 - 8.9)', count: 18 },
  { range: 'Khá (6.5 - 7.9)', count: 8 },
  { range: 'Trung bình (5.0 - 6.4)', count: 3 },
  { range: 'Yếu (< 5.0)', count: 1 },
];

export const BangBieuDoRechartsHocSinh: React.FC = () => {
  // Export Excel (.xlsx)
  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(subjectScoreData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'DiemTB_CacMon');
    XLSX.writeFile(wb, 'Bao_Cao_Phan_Tich_Diem_So_Hoc_Sinh.xlsx');
  };

  // Export PDF simulation report
  const handleExportPDF = () => {
    const reportText =
      'BÁO CÁO PHÂN TÍCH ĐIỂM SỐ & TỶ LỆ ĐẠT HỌC SINH\n\n' +
      subjectScoreData.map(s => `${s.subject}: ĐTB ${s.dtb} - Tỷ lệ đạt: ${s.pass}%`).join('\n') +
      '\n\nTổng quan tỷ lệ Đạt: 92% | Chưa đạt: 8%';

    const blob = new Blob([reportText], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Bao_Cao_Phan_Tich_Diem_So_Hoc_Sinh.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-6">
      {/* Header & Export Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-600" />
            Bảng Biểu Đồ Phân Tích Điểm Số & Tỷ Lệ Đạt Học Sinh
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Trực quan hóa Điểm trung bình các môn, tỷ lệ Đạt/Chưa đạt và phổ điểm thi đua
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Xuất Excel (.xlsx)</span>
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Xuất Báo Cáo (.pdf)</span>
          </button>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Bar Chart 1: Điểm trung bình môn */}
        <div className="p-4 bg-slate-50/60 border border-slate-200 rounded-xl space-y-2">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            1. Điểm Trung Bình Các Môn Học (Thang 10)
          </h4>
          <div className="h-60 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={subjectScoreData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="subject" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 10]} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="dtb" name="Điểm trung bình" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart: Tỷ lệ đạt/chưa đạt */}
        <div className="p-4 bg-slate-50/60 border border-slate-200 rounded-xl space-y-2">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            2. Tỷ Lệ Đạt / Chưa Đạt Toàn Khóa
          </h4>
          <div className="h-60 w-full text-xs flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={passFailPieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  dataKey="value"
                  label={({ name, percent }: { name?: string; percent?: number }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                >
                  {passFailPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
