/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { DongBoDriveDocData, DongBoDriveStatus, DongBoDriveResult } from './types';
import { saveDocumentToDriveAndDatabase } from './dongBoDriveService';

export interface UseDongBoDriveOptions {
  autoSaveDelayMs?: number; // Mặc định 45000ms (45 giây) sau khi ngừng gõ
  enableAutoSave?: boolean;
  onNotification?: (notification: { text: string; type: 'success' | 'error' | 'info' }) => void;
  getDocData: () => DongBoDriveDocData;
}

export function useDongBoDrive({
  autoSaveDelayMs = 45000,
  enableAutoSave = true,
  onNotification,
  getDocData,
}: UseDongBoDriveOptions) {
  const [syncStatus, setSyncStatus] = useState<DongBoDriveStatus>('idle');
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const isDirtyRef = useRef<boolean>(false);
  const autoSaveTimerRef = useRef<any>(null);

  // Lưu tài liệu (thủ công hoặc tự động)
  const saveDocument = useCallback(
    async (isAuto: boolean = false): Promise<DongBoDriveResult> => {
      if (isSaving) {
        return { success: false, error: 'Đang trong tiến trình lưu...' };
      }

      const docData = getDocData();
      if (!docData.title || !docData.title.trim()) {
        if (!isAuto && onNotification) {
          onNotification({ text: 'Vui lòng nhập tiêu đề bài giảng!', type: 'error' });
        }
        return { success: false, error: 'Chưa có tiêu đề bài giảng' };
      }

      setIsSaving(true);
      setSyncStatus('saving');

      if (!isAuto && onNotification) {
        onNotification({ text: 'Đang xử lý biên dịch & đồng bộ Drive...', type: 'info' });
      }

      const result = await saveDocumentToDriveAndDatabase(docData);

      setIsSaving(false);
      if (result.success) {
        setSyncStatus('saved');
        const timeStr = result.savedAt || new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        setLastSavedTime(timeStr);
        isDirtyRef.current = false;

        if (onNotification) {
          onNotification({
            text: isAuto
              ? `Tự động đồng bộ Drive thành công lúc ${timeStr}`
              : (result.message || 'Đã lưu Drive thành công!'),
            type: 'success',
          });
        }

        // Sau 4 giây chuyển về trạng thái 'idle' nhưng giữ lastSavedTime
        setTimeout(() => {
          setSyncStatus('idle');
        }, 4000);
      } else {
        setSyncStatus('error');
        if (onNotification) {
          onNotification({
            text: result.error || 'Có lỗi xảy ra trong quá trình đồng bộ Drive.',
            type: 'error',
          });
        }
      }

      return result;
    },
    [isSaving, getDocData, onNotification]
  );

  // Đánh dấu nội dung có thay đổi (dirty) và kích hoạt đếm ngược tự động lưu
  const markDirty = useCallback(() => {
    isDirtyRef.current = true;
    if (syncStatus === 'idle') {
      setSyncStatus('unsaved');
    }

    if (!enableAutoSave) return;

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      if (isDirtyRef.current && !isSaving) {
        saveDocument(true);
      }
    }, autoSaveDelayMs);
  }, [enableAutoSave, autoSaveDelayMs, isSaving, saveDocument, syncStatus]);

  // Dọn dẹp timer khi unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  return {
    isSaving,
    syncStatus,
    lastSavedTime,
    saveDocument,
    markDirty,
  };
}
