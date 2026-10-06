import React from 'react';
import { Plus } from 'lucide-react';
import { RailMarker, PptRailClickMenuData } from './types';

interface PptMarkerRailProps {
  markers: RailMarker[];
  totalScrollHeight?: number;
  onRailClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMarkerClick: (marker: RailMarker, e: React.MouseEvent) => void;
  clickMenu: PptRailClickMenuData | null;
  onApplyBreak: (type: 'slide' | 'effect', elementIndex: number) => void;
  onRemoveBreak: (elementIndex: number) => void;
  onCloseClickMenu: () => void;
}

export const PptMarkerRail: React.FC<PptMarkerRailProps> = ({
  markers,
  totalScrollHeight = 1000,
  onRailClick,
  onMarkerClick,
  clickMenu,
  onApplyBreak,
  onRemoveBreak,
  onCloseClickMenu,
}) => {
  return (
    <>
      {/* THANH MỐC PPT DỌC BÊN LỀ TRÁI (TỪ ĐẦU ĐẾN CUỐI TÀI LIỆU) */}
      <div
        onClick={onRailClick}
        className="w-11 shrink-0 self-stretch min-h-[580px] bg-gradient-to-b from-purple-100/90 via-slate-100 to-amber-100/90 rounded-2xl border-2 border-purple-300/80 shadow-md relative cursor-pointer select-none group transition-all hover:border-purple-500 hover:shadow-lg flex flex-col items-center py-3"
        title="Thanh Mốc PPT: Kích chuột vào vị trí bất kỳ trên thanh này để chèn +Mốc Slide hoặc +Hiệu ứng"
      >
        <div className="flex flex-col items-center gap-1 mb-2">
          <span className="p-1 rounded-lg bg-purple-600 text-white shadow-xs text-xs font-black">🎬</span>
          <span className="text-[9px] font-black tracking-tighter text-purple-900 uppercase [writing-mode:vertical-lr] rotate-180 select-none">
            Thanh Mốc PPT
          </span>
        </div>

        <div className="w-full flex-1 relative min-h-[400px]">
          <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-[2px] bg-purple-300/50 border-r border-dashed border-purple-400/80"></div>

          {markers.map((marker, mIdx) => (
            <div
              key={marker.id || mIdx}
              onClick={(e) => onMarkerClick(marker, e)}
              className={`absolute left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 px-1 py-0.5 rounded-full text-[9px] font-black shadow-md flex items-center gap-0.5 transition-transform hover:scale-125 cursor-pointer border ${
                marker.type === 'slide'
                  ? 'bg-purple-600 text-white border-purple-400 ring-2 ring-purple-200'
                  : 'bg-amber-500 text-slate-950 border-amber-300 ring-2 ring-amber-200'
              }`}
              style={{
                top: `${Math.max(4, Math.min(96, (marker.topOffset / (totalScrollHeight || 1000)) * 100))}%`,
              }}
              title={`${marker.type === 'slide' ? `Slide ${marker.slideNumber}` : `Hiệu ứng ${marker.stepNumber}`}: ${marker.snippet} (Kích để sửa/gỡ mốc)`}
            >
              <span>{marker.type === 'slide' ? '🎬' : '⚡'}</span>
              <span>{marker.type === 'slide' ? `S${marker.slideNumber}` : `B${marker.stepNumber}`}</span>
            </div>
          ))}
        </div>

        <div className="mt-auto pt-2 flex flex-col items-center gap-0.5 text-purple-700 opacity-60 group-hover:opacity-100 transition-opacity">
          <Plus className="w-3.5 h-3.5" />
          <span className="text-[8px] font-bold">Kích chèn</span>
        </div>
      </div>

      {/* POPUP CHÈN / SỬA / GỠ MỐC KHI KÍCH CHUỘT VÀO THANH MỐC PPT */}
      {clickMenu && (
        <div
          className="fixed z-50 bg-white rounded-2xl shadow-2xl border-2 border-purple-500 p-3 w-64 animate-scale-up text-slate-800"
          style={{
            left: Math.min(window.innerWidth - 275, Math.max(12, clickMenu.x + 8)),
            top: Math.min(window.innerHeight - 220, Math.max(12, clickMenu.y - 40)),
          }}
        >
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
            <div className="flex items-center gap-1.5 font-black text-xs text-purple-950">
              <span className="p-1 rounded-lg bg-purple-100 text-purple-700 text-xs">📌</span>
              <span>Thanh Mốc PPT</span>
            </div>
            <button
              type="button"
              onClick={onCloseClickMenu}
              className="text-slate-400 hover:text-slate-700 p-1 rounded-md text-xs cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="text-[11px] text-slate-500 font-medium italic truncate mb-2.5 px-1 bg-slate-50 py-1 rounded-lg border border-slate-100">
            Vị trí: "{clickMenu.snippet || `Đoạn ${clickMenu.elementIndex + 1}`}"
          </div>

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => onApplyBreak('slide', clickMenu.elementIndex)}
              className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer shadow-2xs active:scale-95 ${
                clickMenu.isSlide
                  ? 'bg-purple-600 text-white border border-purple-700 ring-2 ring-purple-200'
                  : 'bg-purple-50 text-purple-900 hover:bg-purple-100 border border-purple-200'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <span>🎬</span>
                <span>+ Mốc Slide</span>
              </span>
              {clickMenu.isSlide && <span className="text-[9px] bg-purple-700 px-1.5 py-0.5 rounded text-white">Đang chọn</span>}
            </button>

            <button
              type="button"
              onClick={() => onApplyBreak('effect', clickMenu.elementIndex)}
              className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer shadow-2xs active:scale-95 ${
                clickMenu.isEffect
                  ? 'bg-amber-500 text-slate-950 border border-amber-600 ring-2 ring-amber-200'
                  : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <span>⚡</span>
                <span>+ Hiệu ứng</span>
              </span>
              {clickMenu.isEffect && <span className="text-[9px] bg-amber-600 px-1.5 py-0.5 rounded text-white">Đang chọn</span>}
            </button>

            {(clickMenu.isSlide || clickMenu.isEffect) && (
              <button
                type="button"
                onClick={() => onRemoveBreak(clickMenu.elementIndex)}
                className="w-full px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer mt-1"
              >
                <span>🗑️</span>
                <span>Gỡ mốc này</span>
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
};
