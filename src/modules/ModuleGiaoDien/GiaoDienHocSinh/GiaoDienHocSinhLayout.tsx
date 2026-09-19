import React from 'react';
import { GraduationCap, Sparkles } from 'lucide-react';
import { UserProfile } from '../../../services/storageTypes';

interface GiaoDienHocSinhLayoutProps {
  children: React.ReactNode;
  activeViewTitle?: string;
  currentUserProfile?: UserProfile | null;
  firebaseUser?: any;
}

export const GiaoDienHocSinhLayout: React.FC<GiaoDienHocSinhLayoutProps> = ({
  children,
  activeViewTitle = 'Không gian học tập',
  currentUserProfile,
  firebaseUser,
}) => {
  return (
    <div className="w-full space-y-4">
      {/* Sub-header banner chuyên biệt cho Giao diện Học sinh */}
      <div className="bg-gradient-to-r from-sky-50 via-blue-50 to-indigo-50 border border-sky-100 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-xs">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-sky-700 bg-sky-100/80 px-2 py-0.5 rounded-full">
                Phân hệ Học sinh
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Đang trực tuyến
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-800 mt-0.5">
              {activeViewTitle}
            </h2>
          </div>
        </div>

      </div>

      {/* Nội dung giao diện chính của module Học sinh */}
      <div className="w-full">
        {children}
      </div>
    </div>
  );
};
