import React, { useRef, useEffect } from 'react';
import { Sparkles, ChevronDown, Check, FileText } from 'lucide-react';

export interface WordStyleOption {
  key: string;
  label: string;
}

// Danh sách các tùy chọn Style chuẩn mực - Không có giải thích dài dòng theo yêu cầu người dùng
export const WORD_STYLE_OPTIONS: WordStyleOption[] = [
  { key: 'p', label: 'Normal' },
  { key: 'h1', label: 'Heading 1' },
  { key: 'h2', label: 'Heading 2' },
  { key: 'h3', label: 'Heading 3' },
  { key: 'h4', label: 'Heading 4' },
  { key: 'title', label: 'Tiêu đề lớn' },
  { key: 'subtitle', label: 'Tiêu đề phụ' },
  { key: 'highlight', label: 'Điểm nhấn' },
  { key: 'quote', label: 'Trích dẫn' },
];

export interface WordStyleMenuProps {
  selectedStyle: string;
  onSelectStyle: (styleKey: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  canAuthor?: boolean;
  tienTrinh?: string;
  insertPositionMode?: 'cursor' | 'bottom';
  onSetInsertPositionMode?: (mode: 'cursor' | 'bottom') => void;
  onInsertLessonTemplate?: (templateType: string) => void;
}

export const WordStyleMenu: React.FC<WordStyleMenuProps> = ({
  selectedStyle,
  onSelectStyle,
  isOpen,
  onToggle,
  onClose,
  canAuthor = false,
  tienTrinh = '',
  insertPositionMode = 'cursor',
  onSetInsertPositionMode,
  onInsertLessonTemplate,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const currentOption = WORD_STYLE_OPTIONS.find((opt) => opt.key === selectedStyle);
  const currentLabel = currentOption ? currentOption.label : 'Normal';

  return (
    <div className="relative inline-block" ref={containerRef}>
      {/* Nút Style hợp nhất trên thanh Toolbar */}
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={onToggle}
        className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer shadow-2xs ${
          isOpen
            ? 'bg-indigo-700 text-white border-indigo-700 ring-2 ring-indigo-200'
            : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300'
        }`}
        title="Chọn kiểu Style văn bản và Mẫu khung soạn bài"
      >
        <Sparkles className={`w-3.5 h-3.5 ${isOpen ? 'text-white' : 'text-indigo-600'}`} />
        <span>Style: {currentLabel}</span>
        <ChevronDown className={`w-3 h-3 ${isOpen ? 'text-white' : 'text-slate-400'}`} />
      </button>

      {/* Menu xổ xuống rộng bố trí 3 cột: Chứa Style (không giải thích) & Mẫu khung soạn bài ghi tắt */}
      {isOpen && (
        <div className="absolute z-50 left-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-2xl w-[480px] max-w-[95vw] max-h-[82vh] overflow-y-auto py-2.5 px-3 text-xs divide-y divide-slate-100 animate-scale-up">
          {/* PHẦN 1: CÁC TÙY CHỌN STYLE - BỐ TRÍ 3 CỘT (CHUẨN WORD, KHÔNG GIẢI THÍCH) */}
          <div className="pb-2.5">
            <div className="px-1 py-1 text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center justify-between select-none">
              <span>── KIỂU ĐỊNH DẠNG (STYLE) ──</span>
              <FileText className="w-3 h-3 text-slate-400" />
            </div>
            <div className="grid grid-cols-3 gap-1.5 mt-1.5">
              {WORD_STYLE_OPTIONS.map((item) => {
                const isSelected = selectedStyle === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onSelectStyle(item.key);
                      onClose();
                    }}
                    className={`px-2.5 py-2 rounded-xl text-left text-xs transition-colors flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200 shadow-2xs'
                        : 'text-slate-700 hover:bg-slate-100 font-semibold border border-transparent'
                    }`}
                  >
                    <span className="truncate">{item.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0 ml-1" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* PHẦN 2: MẪU KHUNG SOẠN BÀI - BỐ TRÍ 3 CỘT & GHI TẮT CHUẨN */}
          {canAuthor && onInsertLessonTemplate && (
            <div className="pt-2.5 space-y-2">
              {/* Gợi ý thông minh */}
              <div className="px-3 py-1.5 bg-indigo-50/80 rounded-xl text-[10px] text-indigo-800 font-semibold flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-indigo-600 shrink-0" />
                  <span>Bôi đen chữ để đóng khung hoặc chèn mẫu mới</span>
                </div>
                {/* Tùy chọn vị trí chèn nếu có */}
                {onSetInsertPositionMode && (
                  <div className="flex items-center gap-1 bg-white px-1.5 py-0.5 rounded-lg border border-indigo-200 shadow-2xs">
                    <span className="text-slate-500 font-bold text-[9px]">Vị trí:</span>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => onSetInsertPositionMode('cursor')}
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer transition-all ${
                        insertPositionMode === 'cursor'
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                      title="Chèn tại con trỏ"
                    >
                      📍 Con trỏ
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => onSetInsertPositionMode('bottom')}
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer transition-all ${
                        insertPositionMode === 'bottom'
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                      title="Chèn xuống cuối bài"
                    >
                      ⬇️ Cuối bài
                    </button>
                  </div>
                )}
              </div>

              {/* 1. NHÓM LÝ THUYẾT (Hiển thị khi tiến trình là Kiến thức) - BỐ TRÍ 3 CỘT */}
              {(tienTrinh.includes('Kiến thức') || tienTrinh === 'Kiến thức' || !tienTrinh) && (
                <div>
                  <div className="px-1 py-1 text-[10px] font-black uppercase text-indigo-800 tracking-wider select-none">
                    ── SOẠN LÝ THUYẾT ──
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 mt-1">
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        onInsertLessonTemplate('khaiNiem');
                        onClose();
                      }}
                      className="px-2.5 py-2 rounded-xl text-left bg-indigo-50/70 hover:bg-indigo-100 text-indigo-950 font-bold border border-indigo-200 transition-colors flex items-center justify-between cursor-pointer shadow-2xs"
                      title="Khái niệm / Định nghĩa"
                    >
                      <span className="truncate">Khái niệm</span>
                      <span className="text-indigo-600 font-black text-sm leading-none">+</span>
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        onInsertLessonTemplate('dinhLy');
                        onClose();
                      }}
                      className="px-2.5 py-2 rounded-xl text-left bg-indigo-50/70 hover:bg-indigo-100 text-indigo-950 font-bold border border-indigo-200 transition-colors flex items-center justify-between cursor-pointer shadow-2xs"
                      title="Định lý / Tính chất"
                    >
                      <span className="truncate">Định lý</span>
                      <span className="text-indigo-600 font-black text-sm leading-none">+</span>
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        onInsertLessonTemplate('heQua');
                        onClose();
                      }}
                      className="px-2.5 py-2 rounded-xl text-left bg-indigo-50/70 hover:bg-indigo-100 text-indigo-950 font-bold border border-indigo-200 transition-colors flex items-center justify-between cursor-pointer shadow-2xs"
                      title="Hệ quả / Chú ý"
                    >
                      <span className="truncate">Hệ quả</span>
                      <span className="text-indigo-600 font-black text-sm leading-none">+</span>
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        onInsertLessonTemplate('phuongPhap');
                        onClose();
                      }}
                      className="px-2.5 py-2 rounded-xl text-left bg-indigo-50/70 hover:bg-indigo-100 text-indigo-950 font-bold border border-indigo-200 transition-colors flex items-center justify-between cursor-pointer shadow-2xs"
                      title="Phương pháp giải (Dạng toán)"
                    >
                      <span className="truncate">PPG</span>
                      <span className="text-indigo-600 font-black text-sm leading-none">+</span>
                    </button>
                  </div>
                </div>
              )}

              {/* 2. NHÓM VÍ DỤ & BÀI TẬP (Có trong tất cả tiến trình) - BỐ TRÍ 3 CỘT VỚI TÊN GHI TẮT CHUẨN */}
              <div>
                <div className="px-1 py-1 text-[10px] font-black uppercase text-amber-800 tracking-wider select-none">
                  ── SOẠN VÍ DỤ & BÀI TẬP ──
                </div>
                <div className="grid grid-cols-3 gap-1.5 mt-1">
                  {/* Ví dụ (thay cho Ví dụ minh họa) */}
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onInsertLessonTemplate('viDu');
                      onClose();
                    }}
                    className="px-2.5 py-2 rounded-xl text-left bg-amber-50/70 hover:bg-amber-100 text-amber-950 font-bold border border-amber-200 transition-colors flex items-center justify-between cursor-pointer shadow-2xs"
                    title="Ví dụ minh họa"
                  >
                    <span className="truncate">Ví dụ</span>
                    <span className="text-amber-600 font-black text-sm leading-none">+</span>
                  </button>

                  {/* Bài (thay cho Bài tập Tự luận) */}
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onInsertLessonTemplate('tuLuan');
                      onClose();
                    }}
                    className="px-2.5 py-2 rounded-xl text-left bg-amber-50/70 hover:bg-amber-100 text-amber-950 font-bold border border-amber-200 transition-colors flex items-center justify-between cursor-pointer shadow-2xs"
                    title="Bài tập Tự luận"
                  >
                    <span className="truncate">Bài</span>
                    <span className="text-amber-600 font-black text-sm leading-none">+</span>
                  </button>

                  {/* TNLC (thay cho Trắc nghiệm 4 lựa chọn A, B, C, D) */}
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onInsertLessonTemplate('tracNghiem4');
                      onClose();
                    }}
                    className="px-2.5 py-2 rounded-xl text-left bg-amber-50/70 hover:bg-amber-100 text-amber-950 font-bold border border-amber-200 transition-colors flex items-center justify-between cursor-pointer shadow-2xs"
                    title="Trắc nghiệm 4 lựa chọn (A, B, C, D)"
                  >
                    <span className="truncate">TNLC</span>
                    <span className="text-amber-600 font-black text-sm leading-none">+</span>
                  </button>

                  {/* TNDS (thay cho Trắc nghiệm Đúng / Sai) */}
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onInsertLessonTemplate('dungSai');
                      onClose();
                    }}
                    className="px-2.5 py-2 rounded-xl text-left bg-amber-50/70 hover:bg-amber-100 text-amber-950 font-bold border border-amber-200 transition-colors flex items-center justify-between cursor-pointer shadow-2xs"
                    title="Trắc nghiệm Đúng / Sai"
                  >
                    <span className="truncate">TNDS</span>
                    <span className="text-amber-600 font-black text-sm leading-none">+</span>
                  </button>

                  {/* TLN (thay cho Trắc nghiệm Trả lời ngắn) */}
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onInsertLessonTemplate('traLoiNgan');
                      onClose();
                    }}
                    className="px-2.5 py-2 rounded-xl text-left bg-amber-50/70 hover:bg-amber-100 text-amber-950 font-bold border border-amber-200 transition-colors flex items-center justify-between cursor-pointer shadow-2xs"
                    title="Trắc nghiệm Trả lời ngắn"
                  >
                    <span className="truncate">TLN</span>
                    <span className="text-amber-600 font-black text-sm leading-none">+</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
