import React, { useState, useRef } from 'react';
import {
  FileSpreadsheet,
  Upload,
  Download,
  AlertTriangle,
  CheckCircle2,
  Users,
  X,
  RefreshCw,
  UserPlus,
  UserCheck,
} from 'lucide-react';
import { ImportDeduplicationReport } from '../../../services/storageTypes';
import { addStudentsToClassWithDeduplication } from '../../ConnectData/ConnectFirestore';

interface Props {
  classId: string;
  className: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (report: ImportDeduplicationReport) => void;
}

interface ParsedCandidate {
  name: string;
  email: string;
  phone?: string;
  studentCode?: string;
}

export const ModalThemHocSinhExcel: React.FC<Props> = ({
  classId,
  className,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [candidates, setCandidates] = useState<ParsedCandidate[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Download sample CSV template
  const handleDownloadTemplate = () => {
    const csvContent =
      'Họ và Tên,Email,Số Điện Thoại,Mã Học Sinh\n' +
      'Nguyễn Văn An,an.nguyen@student.lopu.edu.vn,0912345678,HS-1001\n' +
      'Trần Thị Bình,binh.tran@student.lopu.edu.vn,0987654321,HS-1002\n' +
      'Lê Hoàng Cường,cuong.le@student.lopu.edu.vn,0905123456,HS-1003';

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Mau_Danh_Sach_Hoc_Sinh_${className}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const parseLines = (text: string) => {
    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
    const parsed: ParsedCandidate[] = [];

    const startIndex =
      lines[0].toLowerCase().includes('email') || lines[0].toLowerCase().includes('tên') ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const parts = lines[i].split(/[,;\t]/).map(p => p.trim().replace(/^["']|["']$/g, ''));
      if (parts.length >= 2) {
        const name = parts[0];
        const email = parts[1];
        const phone = parts[2] || '';
        const studentCode = parts[3] || '';
        if (email.includes('@')) {
          parsed.push({ name, email, phone, studentCode });
        }
      }
    }
    return parsed;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    const reader = new FileReader();
    reader.onload = event => {
      try {
        const content = event.target?.result as string;
        const list = parseLines(content);
        if (list.length === 0) {
          setErrorMsg('Không tìm thấy dòng học sinh hợp lệ (cần ít nhất cột Họ tên và Email).');
        } else {
          setCandidates(list);
        }
      } catch (err) {
        setErrorMsg('Lỗi khi đọc file. Vui lòng kiểm tra lại định dạng CSV hoặc Excel.');
      }
    };
    reader.readAsText(file);
  };

  const handleParseInputText = () => {
    setErrorMsg(null);
    const list = parseLines(inputText);
    if (list.length === 0) {
      setErrorMsg('Vui lòng nhập hoặc dán danh sách theo định dạng: Họ tên, Email, SĐT, Mã HS.');
    } else {
      setCandidates(list);
    }
  };

  const handleConfirmImport = async () => {
    if (candidates.length === 0) return;
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const report = await addStudentsToClassWithDeduplication(classId, candidates);
      onSuccess(report);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi xử lý thêm học sinh vào lớp.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">Thêm học sinh từ Excel vào lớp</h3>
              <p className="text-xs text-slate-500">
                Lớp: <span className="font-semibold text-blue-600">{className}</span> • Tự động lọc trùng lặp thông minh
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Smart Deduplication Notice */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-xs text-emerald-900 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-sm">Cơ chế bảo vệ chống chồng chéo tài khoản:</p>
              <ul className="list-disc list-inside space-y-0.5 text-emerald-800">
                <li><strong>Học sinh đã có trong lớp:</strong> Tự động bỏ qua (không tạo lặp lần 2).</li>
                <li><strong>Học sinh đã có tài khoản trên trường:</strong> Tự liên kết vào lớp ngay, không sinh tài khoản mới.</li>
                <li><strong>Học sinh mới:</strong> Tự động tạo hồ sơ định danh và thêm vào lớp học.</li>
              </ul>
            </div>
          </div>

          {/* Upload and Paste options */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-sm font-semibold text-slate-700">
                Tải lên file Excel/CSV danh sách học sinh:
              </label>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
              >
                <Download className="w-3.5 h-3.5" />
                Tải file Excel mẫu (.csv)
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl bg-slate-50 hover:bg-blue-50/50 transition-all text-center group cursor-pointer"
              >
                <Upload className="w-7 h-7 text-slate-400 group-hover:text-blue-600 mb-2 transition-colors" />
                <span className="text-xs font-bold text-slate-700 group-hover:text-blue-700">
                  Chọn file từ máy tính
                </span>
                <span className="text-[11px] text-slate-400 mt-1">Hỗ trợ .csv, .txt, .xlsx</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />

              <div className="flex flex-col justify-between p-3.5 border border-slate-200 rounded-xl bg-slate-50/50">
                <div>
                  <span className="text-xs font-semibold text-slate-700 block mb-1">
                    Hoặc dán trực tiếp dòng dữ liệu:
                  </span>
                  <textarea
                    rows={3}
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    placeholder="Nguyễn Văn A, a@lopu.edu.vn, 0901234567, HS-01"
                    className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-mono"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleParseInputText}
                  className="mt-2 w-full py-1.5 px-3 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs transition-colors"
                >
                  Xác nhận danh sách dán
                </button>
              </div>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Preview list */}
          {candidates.length > 0 && (
            <div className="space-y-2 border-t border-slate-200 pt-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  Danh sách chuẩn bị đối soát ({candidates.length} học sinh):
                </span>
                <button
                  type="button"
                  onClick={() => setCandidates([])}
                  className="text-xs text-rose-600 hover:underline"
                >
                  Xóa danh sách này
                </button>
              </div>

              <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-slate-50">
                {candidates.map((c, idx) => (
                  <div key={idx} className="p-2.5 px-3 flex items-center justify-between text-xs hover:bg-white transition-colors">
                    <div>
                      <span className="font-bold text-slate-800">{c.name}</span>
                      <span className="text-slate-400 ml-2 font-mono">{c.email}</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-500">
                      {c.studentCode && <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[11px] font-semibold">{c.studentCode}</span>}
                      <span>{c.phone || 'Chưa có SĐT'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-100 transition-colors"
          >
            Hủy bỏ
          </button>

          <button
            type="button"
            disabled={candidates.length === 0 || isLoading}
            onClick={handleConfirmImport}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs disabled:opacity-50 shadow-sm shadow-blue-500/20 transition-all"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Đang đối soát & thêm...
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                Tiến hành Nhập & Lọc trùng ({candidates.length})
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
