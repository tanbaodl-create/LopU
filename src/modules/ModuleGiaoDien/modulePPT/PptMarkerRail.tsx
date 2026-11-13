import React from 'react';
import { Plus, Wand2 } from 'lucide-react';
import {
  RailMarker,
  RailLineItem,
  PptRailClickMenuData,
  PptEffectType,
  PPT_EFFECT_LIST,
  getPptEffectDef,
} from './types';

export const getEffectIcon = (type?: PptEffectType): string => getPptEffectDef(type).icon;
export const getEffectLabel = (type?: PptEffectType): string => getPptEffectDef(type).nameVi;

interface PptMarkerRailProps {
  markers: RailMarker[];
  lineItems?: RailLineItem[];
  totalScrollHeight?: number;
  onRailClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMarkerClick: (marker: RailMarker, e: React.MouseEvent) => void;
  onLinePlusClick?: (lineItem: RailLineItem, e: React.MouseEvent) => void;
  clickMenu: PptRailClickMenuData | null;
  onApplyBreak: (type: 'slide' | 'effect', elementIndex: number, effectType?: PptEffectType) => void;
  onRemoveBreak: (elementIndex: number) => void;
  onCloseClickMenu: () => void;
  onAutoAnalyze?: () => void;
}

export const PptMarkerRail: React.FC<PptMarkerRailProps> = ({
  markers,
  lineItems = [],
  totalScrollHeight = 1000,
  onRailClick,
  onMarkerClick,
  onLinePlusClick,
  clickMenu,
  onApplyBreak,
  onRemoveBreak,
  onCloseClickMenu,
  onAutoAnalyze,
}) => {
  return (
    <>
      {/* THANH MỐC PPT DỌC BÊN LỀ TRÁI (TỪ ĐẦU ĐẾN CUỐI TÀI LIỆU) */}
      <div
        onClick={onRailClick}
        className="w-11 shrink-0 self-stretch min-h-[580px] bg-gradient-to-b from-purple-100/90 via-slate-100 to-amber-100/90 rounded-2xl border-2 border-purple-300/80 shadow-md relative cursor-pointer select-none group transition-all hover:border-purple-500 hover:shadow-lg flex flex-col items-center py-3"
        title="Thanh Mốc PPT: Kích vào dấu + đầu dòng bất kỳ để chèn +Mốc Slide hoặc +Hiệu ứng"
      >
        <div className="flex flex-col items-center gap-1.5 mb-2">
          {/* Nút Phân tích mốc tự động dùng biểu tượng Wand2 ở đầu thanh mốc PPT */}
          {onAutoAnalyze && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAutoAnalyze();
              }}
              className="p-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md transition-all transform hover:scale-110 active:scale-95 cursor-pointer flex items-center justify-center border border-purple-300 mb-0.5"
              title="Phân tích mốc tự động: Mỗi câu hỏi (đề+lời giải), mục lý thuyết, Ví dụ (đề+lời giải) là 1 slide"
            >
              <Wand2 className="w-4 h-4 text-amber-300" />
            </button>
          )}
          <span className="p-1 rounded-lg bg-purple-600 text-white shadow-xs text-xs font-black">🎬</span>
        </div>

        <div className="w-full flex-1 relative min-h-[400px]">
          <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-[2px] bg-purple-300/50 border-r border-dashed border-purple-400/80"></div>

          {/* Dấu + tại mỗi đầu 1 dòng mới trên thanh mốc PPT */}
          {lineItems.map((line) => {
            const topPercent = Math.max(2, Math.min(98, (line.topOffset / (totalScrollHeight || 1000)) * 100));
            if (line.marker) {
              const marker = line.marker;
              const effectIcon = getEffectIcon(marker.effectType);
              const effectLabel = getEffectLabel(marker.effectType);
              return (
                <div
                  key={marker.id || line.elementIndex}
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkerClick(marker, e);
                  }}
                  className={`absolute left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 px-1 py-0.5 rounded-full text-[9px] font-black shadow-md flex items-center gap-0.5 transition-transform hover:scale-125 cursor-pointer border ${
                    marker.type === 'slide'
                      ? 'bg-purple-600 text-white border-purple-400 ring-2 ring-purple-200'
                      : 'bg-amber-500 text-slate-950 border-amber-300 ring-2 ring-amber-200'
                  }`}
                  style={{ top: `${topPercent}%` }}
                  title={`${marker.type === 'slide' ? `Slide ${marker.slideNumber}` : `Hiệu ứng B${marker.stepNumber} (${effectLabel})`}: ${marker.snippet} (Kích để sửa/gỡ mốc)`}
                >
                  <span>{marker.type === 'slide' ? '🎬' : effectIcon}</span>
                  <span>{marker.type === 'slide' ? `S${marker.slideNumber}` : `B${marker.stepNumber}`}</span>
                </div>
              );
            }

            return (
              <button
                key={`line-plus-${line.elementIndex}`}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onLinePlusClick) {
                    onLinePlusClick(line, e);
                  }
                }}
                className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-4 h-4 rounded-full bg-purple-600 hover:bg-purple-800 text-white flex items-center justify-center font-extrabold text-[10px] shadow-sm transition-all transform hover:scale-125 active:scale-95 cursor-pointer border border-white"
                style={{ top: `${topPercent}%` }}
                title={`Kích vào dấu + ở đầu dòng ${line.elementIndex + 1} ("${line.snippet}") để thêm mốc Slide hoặc Hiệu ứng`}
              >
                +
              </button>
            );
          })}

          {/* Fallback render markers if lineItems is empty */}
          {lineItems.length === 0 &&
            markers.map((marker, mIdx) => {
              const effectIcon = getEffectIcon(marker.effectType);
              const effectLabel = getEffectLabel(marker.effectType);
              return (
                <div
                  key={marker.id || mIdx}
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkerClick(marker, e);
                  }}
                  className={`absolute left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 px-1 py-0.5 rounded-full text-[9px] font-black shadow-md flex items-center gap-0.5 transition-transform hover:scale-125 cursor-pointer border ${
                    marker.type === 'slide'
                      ? 'bg-purple-600 text-white border-purple-400 ring-2 ring-purple-200'
                      : 'bg-amber-500 text-slate-950 border-amber-300 ring-2 ring-amber-200'
                  }`}
                  style={{
                    top: `${Math.max(4, Math.min(96, (marker.topOffset / (totalScrollHeight || 1000)) * 100))}%`,
                  }}
                  title={`${marker.type === 'slide' ? `Slide ${marker.slideNumber}` : `Hiệu ứng B${marker.stepNumber} (${effectLabel})`}: ${marker.snippet} (Kích để sửa/gỡ mốc)`}
                >
                  <span>{marker.type === 'slide' ? '🎬' : effectIcon}</span>
                  <span>{marker.type === 'slide' ? `S${marker.slideNumber}` : `B${marker.stepNumber}`}</span>
                </div>
              );
            })}
        </div>

        <div className="mt-auto pt-2 flex flex-col items-center gap-0.5 text-purple-700 opacity-60 group-hover:opacity-100 transition-opacity">
          <Plus className="w-3.5 h-3.5" />
          <span className="text-[8px] font-bold">Kích chèn</span>
        </div>
      </div>

      {/* POPUP CHÈN / SỬA / GỠ MỐC KHI KÍCH CHUỘT VÀO THANH MỐC PPT */}
      {clickMenu && (
        <div
          className="fixed z-50 bg-white rounded-2xl shadow-2xl border-2 border-purple-500 p-3.5 w-80 animate-scale-up text-slate-800"
          style={{
            left: Math.min(window.innerWidth - 340, Math.max(12, clickMenu.x + 8)),
            top: Math.min(window.innerHeight - 520, Math.max(12, clickMenu.y - 60)),
          }}
        >
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
            <div className="flex items-center gap-1.5 font-black text-xs text-purple-950">
              <span className="p-1 rounded-lg bg-purple-100 text-purple-700 text-xs">📌</span>
              <span>Cài đặt Mốc PPT &amp; Hiệu ứng</span>
            </div>
            <button
              type="button"
              onClick={onCloseClickMenu}
              className="text-slate-400 hover:text-slate-700 p-1 rounded-md text-xs cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="text-[11px] text-slate-500 font-medium italic truncate mb-2.5 px-1.5 bg-slate-50 py-1 rounded-lg border border-slate-100">
            Vị trí: "{clickMenu.snippet || `Đoạn ${clickMenu.elementIndex + 1}`}"
          </div>

          <div className="space-y-2.5">
            {/* 1. Mốc Slide */}
            <button
              type="button"
              onClick={() => onApplyBreak('slide', clickMenu.elementIndex)}
              className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer shadow-2xs active:scale-95 ${
                clickMenu.isSlide
                  ? 'bg-purple-600 text-white border-2 border-purple-700 ring-2 ring-purple-200'
                  : 'bg-purple-50 text-purple-900 hover:bg-purple-100 border border-purple-200'
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="text-base">🎬</span>
                <div className="flex flex-col text-left leading-tight">
                  <span>+ Mốc Slide mới</span>
                  <span className={`text-[10px] font-normal ${clickMenu.isSlide ? 'text-purple-100' : 'text-purple-600'}`}>
                    Ngắt thành trang slide riêng biệt
                  </span>
                </div>
              </span>
              {clickMenu.isSlide && <span className="text-[9px] bg-purple-700 px-2 py-0.5 rounded-full text-white font-extrabold">Đang chọn ✓</span>}
            </button>

            {/* 2. Mốc Hiệu ứng & Lựa chọn 10 hiệu ứng trình chiếu */}
            <div className="p-2.5 rounded-xl border border-amber-200 bg-amber-50/70 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-amber-950">
                <span className="flex items-center gap-1.5">
                  <span>⚡</span>
                  <span>+ Mốc Hiệu ứng từng bước</span>
                </span>
                {clickMenu.isEffect && (
                  <span className="text-[9px] bg-amber-600 text-white font-black px-1.5 py-0.5 rounded">
                    Đang chọn ✓
                  </span>
                )}
              </div>
              <div className="text-[10px] text-amber-900/80 font-medium">
                Chọn 1 trong 10 hiệu ứng trình chiếu PPT:
              </div>

              {/* Lưới 10 hiệu ứng cơ bản */}
              <div className="grid grid-cols-2 gap-1.5 pt-1">
                {PPT_EFFECT_LIST.map((eff) => {
                  const isSelected = clickMenu.isEffect && (clickMenu.effectType || 'fade') === eff.id;
                  return (
                    <button
                      key={eff.id}
                      type="button"
                      onClick={() => onApplyBreak('effect', clickMenu.elementIndex, eff.id)}
                      className={`p-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
                        isSelected
                          ? 'bg-amber-500 text-slate-950 font-bold border-2 border-amber-600 shadow-xs ring-1 ring-amber-400'
                          : 'bg-white hover:bg-amber-100/90 text-slate-700 border border-amber-200 shadow-2xs'
                      }`}
                      title={`${eff.label}: ${eff.desc}`}
                    >
                      <span className="text-base shrink-0">{eff.icon}</span>
                      <div className="flex flex-col text-left leading-tight truncate">
                        <span className="truncate font-bold text-[10px]">{eff.nameVi}</span>
                        <span className="text-[9px] opacity-70 truncate font-normal">{eff.label}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Nút gỡ mốc */}
            {(clickMenu.isSlide || clickMenu.isEffect) && (
              <button
                type="button"
                onClick={() => onRemoveBreak(clickMenu.elementIndex)}
                className="w-full px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer mt-1"
              >
                <span>🗑️</span>
                <span>Gỡ mốc này khỏi tài liệu</span>
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
};
