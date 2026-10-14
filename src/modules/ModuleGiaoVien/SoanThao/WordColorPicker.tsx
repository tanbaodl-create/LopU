import React, { useRef, useEffect } from 'react';
import { Baseline, Highlighter, ChevronDown, Check, X } from 'lucide-react';
import {
  WORD_STANDARD_TEXT_COLORS,
  WORD_THEME_TEXT_COLORS,
  WORD_STANDARD_HIGHLIGHT_COLORS,
  WORD_PASTEL_HIGHLIGHT_COLORS,
} from './wordColorPresets';

interface WordColorPickerProps {
  color: string;
  onSelectColor: (color: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  title?: string;
}

// Bảng chọn Màu Chữ Chuẩn Mực Word
export const WordTextColorPicker: React.FC<WordColorPickerProps> = ({
  color,
  onSelectColor,
  isOpen,
  onToggle,
  onClose,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const customColorInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  return (
    <div className="relative inline-block" ref={containerRef}>
      {/* Nút bấm hiển thị trên Toolbar: Icon A + thanh màu hiện tại + mũi tên xổ xuống */}
      <div className="flex items-center rounded-lg hover:bg-slate-200 transition-colors p-0.5">
        <button
          type="button"
          onClick={() => {
            // Nhấn thẳng vào nút A để áp dụng lại màu đang chọn hoặc mở menu
            onToggle();
          }}
          className="p-1 rounded flex flex-col items-center justify-center cursor-pointer text-slate-700 hover:text-indigo-600 transition-colors"
          title={`Màu chữ: ${color}`}
        >
          <Baseline className="w-4 h-4" />
          <span
            className="w-3.5 h-1 rounded-full mt-0.5 shadow-2xs border border-black/10"
            style={{ backgroundColor: color || '#000000' }}
          />
        </button>
        <button
          type="button"
          onClick={onToggle}
          className="p-1 text-slate-500 hover:text-slate-800 cursor-pointer rounded"
          title="Chọn màu chữ chuẩn mực"
        >
          <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Popover Bảng màu chuẩn mực Word */}
      {isOpen && (
        <div className="absolute z-50 left-0 mt-1 bg-white border border-slate-300 rounded-xl shadow-2xl p-3 w-64 text-xs animate-fade-in divide-y divide-slate-100 select-none">
          {/* 1. Nút Màu Tự động (Mặc định Đen) */}
          <div className="pb-2">
            <button
              type="button"
              onClick={() => {
                onSelectColor('#000000');
                onClose();
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-100 text-slate-800 font-medium transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-sm bg-black border border-slate-300 shadow-2xs" />
                <span className="font-semibold">Tự động (Đen mặc định)</span>
              </div>
              {color.toLowerCase() === '#000000' && <Check className="w-3.5 h-3.5 text-indigo-600" />}
            </button>
          </div>

          {/* 2. Bảng Màu Chủ Đề (Theme Colors) */}
          <div className="py-2">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 px-1">
              Màu chủ đề (Theme Colors)
            </div>
            <div className="flex flex-col gap-1">
              {WORD_THEME_TEXT_COLORS.map((row, rIdx) => (
                <div key={rIdx} className="flex items-center justify-between gap-1">
                  {row.map((hex, cIdx) => {
                    const isSelected = color.toLowerCase() === hex.toLowerCase();
                    return (
                      <button
                        key={`${rIdx}-${cIdx}`}
                        type="button"
                        onClick={() => {
                          onSelectColor(hex);
                          onClose();
                        }}
                        style={{ backgroundColor: hex }}
                        title={hex}
                        className={`w-4.5 h-4.5 rounded-xs border transition-all cursor-pointer hover:scale-125 hover:z-10 shadow-2xs ${
                          isSelected
                            ? 'ring-2 ring-indigo-500 border-white z-10'
                            : 'border-slate-300/60 hover:border-slate-500'
                        }`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* 3. Màu Chuẩn Mực (Standard Colors) */}
          <div className="py-2">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 px-1">
              Màu chuẩn mực (Standard Colors)
            </div>
            <div className="grid grid-cols-6 gap-1.5">
              {WORD_STANDARD_TEXT_COLORS.map((item) => {
                const isSelected = color.toLowerCase() === item.hex.toLowerCase();
                return (
                  <button
                    key={item.hex}
                    type="button"
                    onClick={() => {
                      onSelectColor(item.hex);
                      onClose();
                    }}
                    style={{ backgroundColor: item.hex }}
                    title={`${item.name} (${item.hex})`}
                    className={`w-6 h-6 rounded-md border flex items-center justify-center transition-all cursor-pointer hover:scale-115 shadow-2xs ${
                      isSelected
                        ? 'ring-2 ring-indigo-500 ring-offset-1 border-white'
                        : 'border-slate-300/80 hover:border-slate-600'
                    }`}
                  >
                    {isSelected && (
                      <Check
                        className={`w-3.5 h-3.5 ${
                          ['#ffffff', '#ffff00', '#92d050', '#ffc000'].includes(item.hex)
                            ? 'text-slate-900'
                            : 'text-white'
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Bộ chọn màu tùy chỉnh (More Colors...) */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                customColorInputRef.current?.click();
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-100 text-slate-700 font-medium transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-4 h-4 rounded-full border border-slate-300 shadow-2xs"
                  style={{
                    background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)',
                  }}
                />
                <span className="font-semibold text-slate-700">Màu khác... (Tùy chỉnh)</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono uppercase">{color}</span>
            </button>
            <input
              ref={customColorInputRef}
              type="color"
              value={color || '#000000'}
              onChange={(e) => {
                onSelectColor(e.target.value);
              }}
              className="sr-only"
            />
          </div>
        </div>
      )}
    </div>
  );
};

// Bảng chọn Màu Nền Chữ / Highlight Chuẩn Mực Word
export const WordHighlightColorPicker: React.FC<WordColorPickerProps> = ({
  color,
  onSelectColor,
  isOpen,
  onToggle,
  onClose,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const customColorInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  const isTransparent = !color || color === 'transparent';

  return (
    <div className="relative inline-block" ref={containerRef}>
      {/* Nút bấm hiển thị trên Toolbar: Icon Bút Dạ Quang + vạch màu nền + mũi tên */}
      <div className="flex items-center rounded-lg hover:bg-slate-200 transition-colors p-0.5">
        <button
          type="button"
          onClick={() => {
            onToggle();
          }}
          className="p-1 rounded flex flex-col items-center justify-center cursor-pointer text-slate-700 hover:text-indigo-600 transition-colors"
          title={`Màu nền (Highlight): ${isTransparent ? 'Không màu' : color}`}
        >
          <Highlighter className="w-4 h-4" />
          <span
            className="w-3.5 h-1 rounded-full mt-0.5 shadow-2xs border border-black/10"
            style={{
              backgroundColor: isTransparent ? '#facc15' : color,
            }}
          />
        </button>
        <button
          type="button"
          onClick={onToggle}
          className="p-1 text-slate-500 hover:text-slate-800 cursor-pointer rounded"
          title="Chọn màu nền / Highlight chuẩn mực"
        >
          <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Popover Bảng màu Highlight chuẩn mực Word */}
      {isOpen && (
        <div className="absolute z-50 left-0 mt-1 bg-white border border-slate-300 rounded-xl shadow-2xl p-3 w-64 text-xs animate-fade-in divide-y divide-slate-100 select-none">
          {/* 1. Nút Không màu (No Color / Trong suốt) */}
          <div className="pb-2">
            <button
              type="button"
              onClick={() => {
                onSelectColor('transparent');
                onClose();
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-100 text-slate-800 font-medium transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-sm border border-dashed border-slate-400 bg-white flex items-center justify-center">
                  <X className="w-3 h-3 text-red-500" />
                </span>
                <span className="font-semibold">Không màu (Xóa highlight)</span>
              </div>
              {isTransparent && <Check className="w-3.5 h-3.5 text-indigo-600" />}
            </button>
          </div>

          {/* 2. 15 Màu Highlight Chuẩn Mực Microsoft Word */}
          <div className="py-2">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 px-1">
              Màu Highlight chuẩn mực (Word)
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {WORD_STANDARD_HIGHLIGHT_COLORS.map((item) => {
                const isSelected = !isTransparent && color.toLowerCase() === item.hex.toLowerCase();
                return (
                  <button
                    key={item.hex}
                    type="button"
                    onClick={() => {
                      onSelectColor(item.hex);
                      onClose();
                    }}
                    style={{ backgroundColor: item.hex }}
                    title={`${item.name} (${item.hex})`}
                    className={`w-7 h-7 rounded-md border flex items-center justify-center transition-all cursor-pointer hover:scale-115 shadow-2xs ${
                      isSelected
                        ? 'ring-2 ring-indigo-500 ring-offset-1 border-white'
                        : 'border-slate-300/80 hover:border-slate-600'
                    }`}
                  >
                    {isSelected && (
                      <Check
                        className={`w-4 h-4 ${
                          ['#ffff00', '#00ff00', '#00ffff', '#ff00ff', '#c0c0c0'].includes(item.hex)
                            ? 'text-slate-900'
                            : 'text-white'
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Màu nền Pastel dịu mắt */}
          <div className="py-2">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 px-1">
              Màu nền Pastel dịu mắt
            </div>
            <div className="grid grid-cols-7 gap-1">
              {WORD_PASTEL_HIGHLIGHT_COLORS.map((item) => {
                const isSelected = !isTransparent && color.toLowerCase() === item.hex.toLowerCase();
                return (
                  <button
                    key={item.hex}
                    type="button"
                    onClick={() => {
                      onSelectColor(item.hex);
                      onClose();
                    }}
                    style={{ backgroundColor: item.hex }}
                    title={`${item.name} (${item.hex})`}
                    className={`w-6 h-6 rounded-md border flex items-center justify-center transition-all cursor-pointer hover:scale-115 shadow-2xs ${
                      isSelected
                        ? 'ring-2 ring-indigo-500 ring-offset-1 border-white'
                        : 'border-slate-300/80 hover:border-slate-600'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 text-slate-800" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Bộ chọn màu nền tùy chỉnh */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                customColorInputRef.current?.click();
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-100 text-slate-700 font-medium transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-4 h-4 rounded-full border border-slate-300 shadow-2xs"
                  style={{
                    background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)',
                  }}
                />
                <span className="font-semibold text-slate-700">Màu nền khác...</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono uppercase">
                {isTransparent ? 'Không màu' : color}
              </span>
            </button>
            <input
              ref={customColorInputRef}
              type="color"
              value={isTransparent ? '#fef9c3' : color}
              onChange={(e) => {
                onSelectColor(e.target.value);
              }}
              className="sr-only"
            />
          </div>
        </div>
      )}
    </div>
  );
};
