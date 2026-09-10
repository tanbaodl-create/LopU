import React from 'react';
import { ShieldAlert, Database, CheckCircle2 } from 'lucide-react';

interface GiaoDienQuanTriLayoutProps {
  children: React.ReactNode;
  activeViewTitle?: string;
}

export const GiaoDienQuanTriLayout: React.FC<GiaoDienQuanTriLayoutProps> = ({
  children,
  activeViewTitle = 'Quản trị Hệ thống',
}) => {
  return (
    <div className="w-full space-y-4">
      {/* Sub-header banner chuyên biệt cho Giao diện Quản trị */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-white shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-500 text-white flex items-center justify-center shadow-xs">
            <ShieldAlert className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300 bg-indigo-900/60 px-2 py-0.5 rounded-full border border-indigo-700/50">
                Phân hệ Quản trị Viên Toàn Trường
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Deduplication Engine Active
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white mt-0.5">
              {activeViewTitle}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto text-xs text-slate-300">
          <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700 px-3 py-1.5 rounded-xl shadow-2xs">
            <Database className="w-3.5 h-3.5 text-indigo-400" />
            <span className="font-medium text-slate-200">Firestore Multi-Tenant Security</span>
          </div>
        </div>
      </div>

      {/* Nội dung giao diện chính của module Quản trị */}
      <div className="w-full">
        {children}
      </div>
    </div>
  );
};
