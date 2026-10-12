/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Cloud, Loader2, Check } from 'lucide-react';
import { DongBoDriveButtonProps } from './types';

/**
 * Nút "Lưu Drive" có sẵn trong cửa sổ soạn thảo Word (có biểu tượng đám mây liền trước).
 * Đóng gói hoàn chỉnh thành module con DongBoDrive, không làm phát sinh thêm nút mới.
 */
export const DongBoDriveButton: React.FC<DongBoDriveButtonProps> = ({
  isSaving = false,
  syncStatus = 'idle',
  lastSavedTime = null,
  onClick,
  className = '',
  disabled = false,
  title = 'Lưu tài liệu hiện tại lên Google Drive (Tự động đồng bộ hoặc bấm để lưu ngay)',
}) => {
  const isSavedState = syncStatus === 'saved' || (Boolean(lastSavedTime) && syncStatus === 'idle');

  const getButtonText = () => {
    if (isSaving || syncStatus === 'saving') return 'Đang lưu...';
    if (isSavedState) {
      return lastSavedTime ? `Đã lưu Drive (${lastSavedTime})` : 'Đã lưu Drive';
    }
    return 'Lưu Drive';
  };

  const renderIcon = () => {
    if (isSaving || syncStatus === 'saving') {
      return <Loader2 className="w-3.5 h-3.5 animate-spin" />;
    }
    if (isSavedState) {
      return <Check className="w-3.5 h-3.5 text-emerald-300" />;
    }
    return <Cloud className="w-3.5 h-3.5" />;
  };

  return (
    <button
      type="button"
      disabled={disabled || isSaving || syncStatus === 'saving'}
      onClick={onClick}
      className={
        className ||
        `px-3.5 py-1.5 rounded-xl font-bold text-white text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50 ${
          isSavedState
            ? 'bg-emerald-600 hover:bg-emerald-700'
            : 'bg-indigo-600 hover:bg-indigo-700'
        }`
      }
      title={title}
    >
      {renderIcon()}
      <span>{getButtonText()}</span>
      {syncStatus === 'unsaved' && !isSaving && (
        <span
          className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-pulse ml-0.5"
          title="Có thay đổi mới chưa lưu"
        />
      )}
    </button>
  );
};
