/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Plus,
  ChevronDown,
  Table,
  Image as ImageIcon,
  FileUp,
  FolderArchive,
} from 'lucide-react';
import { MenuChenProps } from './types';
import { TableInsertModal } from './TableInsertModal';
import { renderLatexInHtml } from '../latexUtils';

/**
 * Trợ giúp trích xuất nội dung văn bản từ tệp (Docx, TXT, HTML, MD, JSON, CSV...) đưa trực tiếp vào cửa sổ Word
 * Tự động render tất cả các công thức toán dạng $ mã latex $ hoặc $$ mã latex $$ khi trích xuất.
 */
const extractFileContentToHtml = async (file: File): Promise<string> => {
  const fileName = file.name;
  const ext = fileName.slice(((fileName.lastIndexOf('.') - 1) >>> 0) + 2).toLowerCase();

  let rawHtml = '';

  // 1. Tệp Word Binary (.docx): Dynamic import mammoth chuyển đổi sang HTML chuẩn
  if (ext === 'docx') {
    try {
      const mammothModule = await import('mammoth');
      const mammoth = mammothModule.default || mammothModule;
      const arrayBuffer = await file.arrayBuffer();
      const result = await (mammoth as any).convertToHtml({ arrayBuffer });
      if (result.value && result.value.trim()) {
        rawHtml = result.value;
      }
    } catch (err) {
      console.warn('Mammoth docx conversion error, falling back to text reader:', err);
    }
  }

  // 2. Các tệp văn bản khác (.txt, .html, .htm, .md, .json, .csv, .xml, .js, .ts, v.v.)
  if (!rawHtml) {
    try {
      const text = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string) || '');
        reader.onerror = () => reject(reader.error);
        reader.readAsText(file);
      });

      if (!text || !text.trim()) {
        return `<p><em>(Nội dung tệp "${fileName}" rỗng)</em></p>`;
      }

      // Nếu tệp đã ở định dạng HTML
      if (ext === 'html' || ext === 'htm' || /<[a-z][\s\S]*>/i.test(text)) {
        rawHtml = text;
      } else {
        // Nếu là tệp văn bản thuần / JSON / MD: chuyển đổi các dòng văn bản thành thẻ <p>
        const lines = text.split(/\r?\n/);
        rawHtml = lines
          .map((line) => {
            const trimmed = line.trim();
            if (!trimmed) return '<p><br></p>';
            const safeText = line
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;');
            return `<p style="margin: 4px 0; line-height: 1.6;">${safeText}</p>`;
          })
          .join('');
      }
    } catch (err) {
      console.error('Lỗi khi đọc nội dung file:', err);
      return `<p><em>(Không thể đọc nội dung tệp "${fileName}")</em></p>`;
    }
  }

  // Chuyển đổi toàn bộ các mã công thức toán $ mã $ và $$ mã $$ trong nội dung tệp thành KaTeX rendered HTML
  return renderLatexInHtml(rawHtml);
};

export const MenuChen: React.FC<MenuChenProps> = ({
  saveCurrentSelection,
  insertHtmlToEditor,
  chuyenDe = '',
  setNotification,
  onCloseOtherMenus,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [showTableModal, setShowTableModal] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  const toggleDropdown = () => {
    saveCurrentSelection();
    if (!isOpen) {
      onCloseOtherMenus?.();
    }
    setIsOpen(!isOpen);
  };

  // 1. Chèn Bảng
  const handleOpenTable = () => {
    saveCurrentSelection();
    setIsOpen(false);
    setShowTableModal(true);
  };

  const handleTableInserted = (tableHtml: string) => {
    insertHtmlToEditor(tableHtml);
    setNotification?.({
      text: 'Đã chèn bảng vào trang soạn thảo thành công!',
      type: 'success',
    });
    setTimeout(() => setNotification?.(null), 3000);
  };

  // 2. Chèn Hình ảnh
  const handleTriggerImage = () => {
    saveCurrentSelection();
    setIsOpen(false);
    imageInputRef.current?.click();
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      const src = loadEvt.target?.result as string;
      const cleanImgHtml = `
        <div class="word-img-wrapper relative my-3 flex justify-center items-center" contenteditable="false" style="text-align: center; margin: 16px 0; background: transparent; border: none; position: relative;">
          <img src="${src}" alt="${file.name}" style="max-width: 100%; max-height: 480px; width: auto; height: auto; border-radius: 8px; margin: 8px 0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); display: inline-block; vertical-align: middle;" />
          <button type="button" onclick="this.closest('.word-img-wrapper').remove()" title="Xóa hình ảnh này" class="delete-img-btn" style="position: absolute; top: 4px; right: 12px; background: #ef4444; color: white; border: none; border-radius: 9999px; width: 24px; height: 24px; font-size: 13px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 3px rgba(0,0,0,0.3); opacity: 0.85;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.85'">✕</button>
        </div>
        <p><br></p>
      `;
      insertHtmlToEditor(cleanImgHtml);
      setNotification?.({
        text: `Đã chèn hình ảnh "${file.name}" thành công!`,
        type: 'success',
      });
      setTimeout(() => setNotification?.(null), 3000);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // 3. Chèn File - Trích xuất trực tiếp nội dung văn bản vào cửa sổ Word
  const handleTriggerFile = () => {
    saveCurrentSelection();
    setIsOpen(false);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setNotification?.({
      text: `Đang trích xuất nội dung tệp "${file.name}"...`,
      type: 'info',
    });

    try {
      const extractedHtml = await extractFileContentToHtml(file);
      insertHtmlToEditor(extractedHtml);

      setNotification?.({
        text: `Đã trích xuất và đưa nội dung tệp "${file.name}" vào cửa sổ Word thành công!`,
        type: 'success',
      });
      setTimeout(() => setNotification?.(null), 3500);
    } catch (err) {
      console.error('Lỗi khi chèn nội dung file:', err);
      setNotification?.({
        text: `Không thể trích xuất nội dung tệp "${file.name}". Vui lòng thử lại!`,
        type: 'error',
      });
      setTimeout(() => setNotification?.(null), 4000);
    } finally {
      e.target.value = '';
    }
  };

  // 4. Chèn Thư mục (E-Learning)
  const handleInsertFolderElearning = () => {
    saveCurrentSelection();
    setIsOpen(false);

    const folderHtml = `
      <div class="word-folder-elearning" contenteditable="false" style="background-color: #ecfdf5; border: 1.5px solid #a7f3d0; padding: 14px; border-radius: 10px; margin: 14px 0; position: relative;">
        <div style="display: flex; align-items: center; gap: 8px; color: #065f46; font-weight: bold; font-size: 15px;">
          📁 <span>Gói Bài Giảng E-Learning (KienThuc.html): <em>${chuyenDe || 'Chuyên đề trọng tâm'}</em></span>
        </div>
        <p style="margin: 6px 0 0 0; color: #047857; font-size: 13px; line-height: 1.5;">
          Gói bài giảng KienThuc.html với các tệp ảnh tại [Chuyên đề]/HinhAnh, âm thanh tại [Chuyên đề]/AmThanh, video tại [Chuyên đề]/Video. Giữ nguyên đường dẫn tương đối để phát lại mượt mà, độc lập.
        </p>
        <button type="button" onclick="this.closest('.word-folder-elearning').remove()" title="Xóa gói thư mục" style="position: absolute; top: 8px; right: 8px; background: #fee2e2; color: #b91c1c; border: none; border-radius: 6px; width: 22px; height: 22px; font-size: 12px; font-weight: bold; cursor: pointer; display: inline-flex; align-items: center; justify-content: center;">✕</button>
      </div>
      <p><br></p>
    `;
    insertHtmlToEditor(folderHtml);
    setNotification?.({
      text: 'Đã chèn khung Gói Bài Giảng E-Learning & Thư mục tài nguyên!',
      type: 'success',
    });
    setTimeout(() => setNotification?.(null), 3000);
  };

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      {/* Hidden file inputs */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageFileChange}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.txt"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Main trigger button */}
      <button
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          saveCurrentSelection();
        }}
        onClick={toggleDropdown}
        className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer shadow-2xs ${
          isOpen
            ? 'bg-indigo-600 text-white border-indigo-600 ring-2 ring-indigo-200'
            : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-900 border-indigo-200'
        }`}
        title="Chèn Bảng, Hình ảnh, File tệp hoặc Thư mục E-Learning vào tài liệu"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>Chèn</span>
        <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 left-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl w-64 py-1 divide-y divide-slate-100 animate-scale-up">
          {/* 1. Chèn Bảng */}
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              saveCurrentSelection();
            }}
            onClick={handleOpenTable}
            className="w-full px-3.5 py-2.5 text-xs flex items-center gap-3 hover:bg-indigo-50 text-slate-800 text-left font-semibold cursor-pointer transition-colors group"
          >
            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <Table className="w-4 h-4 shrink-0" />
            </div>
            <div>
              <div className="font-bold text-slate-900 group-hover:text-indigo-700">Chèn Bảng</div>
              <div className="text-[10px] text-slate-500 font-normal">Nhập số dòng, số cột, tùy chọn dòng tiêu đề</div>
            </div>
          </button>

          {/* 2. Chèn Hình ảnh */}
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              saveCurrentSelection();
            }}
            onClick={handleTriggerImage}
            className="w-full px-3.5 py-2.5 text-xs flex items-center gap-3 hover:bg-emerald-50 text-slate-800 text-left font-semibold cursor-pointer transition-colors group"
          >
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <ImageIcon className="w-4 h-4 shrink-0" />
            </div>
            <div>
              <div className="font-bold text-slate-900 group-hover:text-emerald-700">Chèn Hình ảnh</div>
              <div className="text-[10px] text-slate-500 font-normal">Tải ảnh minh họa từ máy tính</div>
            </div>
          </button>

          {/* 3. Chèn File */}
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              saveCurrentSelection();
            }}
            onClick={handleTriggerFile}
            className="w-full px-3.5 py-2.5 text-xs flex items-center gap-3 hover:bg-blue-50 text-slate-800 text-left font-semibold cursor-pointer transition-colors group"
          >
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <FileUp className="w-4 h-4 shrink-0" />
            </div>
            <div>
              <div className="font-bold text-slate-900 group-hover:text-blue-700">Chèn File</div>
              <div className="text-[10px] text-slate-500 font-normal">Trích xuất nội dung tệp Docx, TXT, HTML vào cửa sổ Word</div>
            </div>
          </button>

          {/* 4. Chèn Thư mục (E-Learning) */}
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              saveCurrentSelection();
            }}
            onClick={handleInsertFolderElearning}
            className="w-full px-3.5 py-2.5 text-xs flex items-center gap-3 hover:bg-amber-50 text-slate-800 text-left font-semibold cursor-pointer transition-colors group"
          >
            <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <FolderArchive className="w-4 h-4 shrink-0" />
            </div>
            <div>
              <div className="font-bold text-slate-900 group-hover:text-amber-700">Chèn Thư mục (E-Learning)</div>
              <div className="text-[10px] text-slate-500 font-normal">Bài giảng KienThuc.html & Sandbox</div>
            </div>
          </button>
        </div>
      )}

      {/* Table Insertion Modal */}
      <TableInsertModal
        isOpen={showTableModal}
        onClose={() => setShowTableModal(false)}
        onInsertTable={handleTableInserted}
      />
    </div>
  );
};
