import React from 'react';
import { Presentation, ShieldCheck, HardDrive, Sparkles } from 'lucide-react';

interface GiaoDienGiaoVienLayoutProps {
  children: React.ReactNode;
  activeViewTitle?: string;
}

export const GiaoDienGiaoVienLayout: React.FC<GiaoDienGiaoVienLayoutProps> = ({
  children,
  activeViewTitle = 'Nghiệp vụ Giảng dạy',
}) => {
  return (
    <div className="w-full space-y-4">
      {/* Sub-header banner chuyên biệt cho Giao diện Giáo viên */}
      <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 border border-emerald-100 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
            <Presentation className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                Phân hệ Sư phạm & Lớp dạy
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Quyền Giáo viên Bộ môn
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-800 mt-0.5">
              {activeViewTitle}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto text-xs text-slate-600">
          <div className="flex items-center gap-1.5 bg-white/90 border border-emerald-200/60 px-3 py-1.5 rounded-xl shadow-2xs">
            <HardDrive className="w-3.5 h-3.5 text-emerald-600" />
            <span className="font-medium text-slate-700">Tủ tài liệu Drive cá nhân sẵn sàng</span>
          </div>
        </div>
      </div>

      {/* Nội dung giao diện chính của module Giáo viên */}
      <div className="w-full">
        {children}
      </div>
    </div>
  );
};
