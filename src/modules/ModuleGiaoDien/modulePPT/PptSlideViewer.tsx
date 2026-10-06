import React, { useState, useEffect } from 'react';
import {
  Tv,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { PptSlideItem } from './types';

interface PptSlideViewerProps {
  slides: PptSlideItem[];
  activeSlideIndex: number;
  onSlideChange: (index: number) => void;
  tienTrinhChuyenDe?: string;
  docTitle?: string;
  onExitPpt: () => void;
}

export const PptSlideViewer: React.FC<PptSlideViewerProps> = ({
  slides,
  activeSlideIndex,
  onSlideChange,
  tienTrinhChuyenDe = 'Kiến thức',
  docTitle = 'Tài liệu Chuyên đề',
  onExitPpt,
}) => {
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const [revealAllSteps, setRevealAllSteps] = useState<boolean>(false);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);

  const currentSlide = slides[Math.min(activeSlideIndex, Math.max(0, slides.length - 1))] || slides[0];
  const totalSteps = currentSlide?.steps?.length || 1;
  const visibleSteps = revealAllSteps
    ? currentSlide?.steps || []
    : (currentSlide?.steps || []).slice(0, activeStepIndex + 1);

  // Reset bước hiệu ứng khi đổi slide
  useEffect(() => {
    setActiveStepIndex(0);
  }, [activeSlideIndex]);

  // Điều khiển phím chuyển slide & bước hiệu ứng
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        if (!revealAllSteps && activeStepIndex < totalSteps - 1) {
          setActiveStepIndex(prev => prev + 1);
        } else if (activeSlideIndex < slides.length - 1) {
          onSlideChange(activeSlideIndex + 1);
          setActiveStepIndex(0);
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        if (!revealAllSteps && activeStepIndex > 0) {
          setActiveStepIndex(prev => prev - 1);
        } else if (activeSlideIndex > 0) {
          const prevIdx = activeSlideIndex - 1;
          onSlideChange(prevIdx);
          const prevSlide = slides[prevIdx];
          setActiveStepIndex(prevSlide ? Math.max(0, prevSlide.steps.length - 1) : 0);
        }
      } else if (e.key === 'Escape') {
        if (isFullScreen) {
          setIsFullScreen(false);
        } else {
          onExitPpt();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [slides, activeSlideIndex, activeStepIndex, revealAllSteps, isFullScreen, totalSteps, onSlideChange, onExitPpt]);

  return (
    <div
      className={`space-y-4 ${
        isFullScreen
          ? 'fixed inset-0 z-50 bg-slate-950 p-4 sm:p-6 flex flex-col justify-between overflow-y-auto'
          : 'bg-slate-950 p-4 sm:p-6 rounded-b-2xl border border-slate-300 border-t-0 shadow-inner'
      }`}
    >
      {/* Thanh điều khiển trên cùng của PPT */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 text-white p-3 rounded-xl border border-slate-800 shadow-md">
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-3 py-1 rounded-lg bg-purple-600 text-white font-black text-xs tracking-wider flex items-center gap-1.5 shadow-xs">
            <Tv className="w-3.5 h-3.5" />
            <span>TRÌNH CHIẾU PPT {tienTrinhChuyenDe === 'Kiến thức' ? 'KIẾN THỨC' : 'TÀI LIỆU'}</span>
          </span>
          <span className="text-xs text-slate-300 font-bold bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
            Slide {Math.min(activeSlideIndex + 1, slides.length)} / {slides.length}
          </span>
          {totalSteps > 1 && (
            <span className="text-xs text-amber-300 font-bold bg-amber-950/70 border border-amber-600/40 px-2.5 py-1 rounded-lg flex items-center gap-1">
              <span>⚡ Hiệu ứng:</span>
              <span>{revealAllSteps ? 'Tất cả' : `${activeStepIndex + 1}/${totalSteps}`}</span>
            </span>
          )}
        </div>

        {/* Điều hướng chuyển slide, bước hiệu ứng & Nút Thoát PPT */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Nút lùi bước hiệu ứng / lùi slide */}
          <button
            type="button"
            disabled={activeSlideIndex <= 0 && activeStepIndex <= 0}
            onClick={() => {
              if (!revealAllSteps && activeStepIndex > 0) {
                setActiveStepIndex(prev => prev - 1);
              } else if (activeSlideIndex > 0) {
                const prevIdx = activeSlideIndex - 1;
                onSlideChange(prevIdx);
                const prevSlide = slides[prevIdx];
                setActiveStepIndex(prevSlide ? Math.max(0, prevSlide.steps.length - 1) : 0);
              }
            }}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 text-slate-200"
            title="Lùi bước / Slide trước (Phím ← hoặc PageUp)"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Trước</span>
          </button>

          {/* Danh sách chọn nhanh Slide */}
          <select
            value={activeSlideIndex}
            onChange={(e) => onSlideChange(Number(e.target.value))}
            className="bg-slate-800 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg border border-slate-700 cursor-pointer focus:outline-none max-w-[150px] truncate"
          >
            {slides.map((s, idx) => (
              <option key={s.id || idx} value={idx}>
                {s.title || `Slide ${idx + 1}`}
              </option>
            ))}
          </select>

          {/* Nút tiến bước hiệu ứng / sang slide kế tiếp */}
          <button
            type="button"
            disabled={activeSlideIndex >= slides.length - 1 && (revealAllSteps || activeStepIndex >= totalSteps - 1)}
            onClick={() => {
              if (!revealAllSteps && activeStepIndex < totalSteps - 1) {
                setActiveStepIndex(prev => prev + 1);
              } else if (activeSlideIndex < slides.length - 1) {
                onSlideChange(activeSlideIndex + 1);
                setActiveStepIndex(0);
              }
            }}
            className="px-2.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 text-white shadow-xs"
            title="Tiến bước / Slide tiếp theo (Phím → hoặc Phím Cách)"
          >
            <span>{(!revealAllSteps && activeStepIndex < totalSteps - 1) ? 'Hiện tiếp ⚡' : 'Slide tiếp'}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          {/* Nút Bật / Tắt Hiện toàn bộ bước hiệu ứng */}
          {totalSteps > 1 && (
            <button
              type="button"
              onClick={() => setRevealAllSteps(!revealAllSteps)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer border ${
                revealAllSteps
                  ? 'bg-amber-600 text-white border-amber-500'
                  : 'bg-slate-800 text-amber-300 border-amber-800/60 hover:bg-slate-700'
              }`}
              title={revealAllSteps ? 'Bật chế độ hiển thị lần lượt từng hiệu ứng' : 'Hiện ngay toàn bộ nội dung trong slide'}
            >
              {revealAllSteps ? 'Hiện tất cả' : 'Từng bước ⚡'}
            </button>
          )}

          <div className="h-4 w-[1px] bg-slate-700 mx-1"></div>

          <button
            type="button"
            onClick={() => setIsFullScreen(!isFullScreen)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title={isFullScreen ? 'Thu nhỏ (Esc)' : 'Toàn màn hình'}
          >
            {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={onExitPpt}
            className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-rose-600 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
          >
            Thoát PPT
          </button>
        </div>
      </div>

      {/* Khung Chiếu Slide Chính PPT (Chiếu đúng nội dung của mỗi Slide, chuẩn PowerPoint) */}
      <div
        onClick={(e) => {
          const target = e.target as HTMLElement;
          if (!target.closest('button, a, input, select')) {
            if (!revealAllSteps && activeStepIndex < totalSteps - 1) {
              setActiveStepIndex(prev => prev + 1);
            } else if (activeSlideIndex < slides.length - 1) {
              onSlideChange(activeSlideIndex + 1);
              setActiveStepIndex(0);
            }
          }
        }}
        className="bg-white rounded-2xl shadow-2xl p-6 sm:p-10 min-h-[520px] max-w-5xl mx-auto flex flex-col justify-between border border-slate-200 cursor-pointer select-none transition-all animate-fade-in relative"
        title="Nhấp chuột trái vào nền để hiện bước hiệu ứng kế tiếp hoặc chuyển slide"
      >
        <div className="space-y-4">
          {/* Tiêu đề Slide */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-xl sm:text-2xl font-black text-indigo-950 flex items-center gap-2.5">
              <span className="w-2.5 h-7 bg-purple-600 rounded-full inline-block"></span>
              <span>{currentSlide?.title || `Slide ${activeSlideIndex + 1}`}</span>
            </h2>
            <div className="flex items-center gap-2">
              {totalSteps > 1 && (
                <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                  ⚡ Bước {revealAllSteps ? totalSteps : activeStepIndex + 1} / {totalSteps}
                </span>
              )}
              <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                {docTitle}
              </span>
            </div>
          </div>

          {/* Nội dung Slide hiển thị đúng và chỉ riêng của slide này */}
          <div className="prose prose-indigo max-w-none text-slate-800 text-base sm:text-lg leading-relaxed pt-2 space-y-3">
            {visibleSteps.map((stepHtml, sIdx) => (
              <div
                key={`${currentSlide?.id}-step-${sIdx}`}
                className="animate-fade-in transition-all duration-300"
                dangerouslySetInnerHTML={{ __html: stepHtml }}
              />
            ))}

            {/* Dấu nhắc bước tiếp theo nếu còn hiệu ứng ẩn */}
            {!revealAllSteps && activeStepIndex < totalSteps - 1 && (
              <div className="pt-2 flex items-center gap-2 text-xs font-bold text-amber-600 animate-pulse">
                <span>⚡ Nhấp chuột hoặc phím Space để xem tiếp bước {activeStepIndex + 2}...</span>
              </div>
            )}
          </div>
        </div>

        {/* Chân Slide */}
        <div className="pt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5 italic text-slate-500">
            <span>💡 Nhấp chuột trái, phím Space hoặc mũi tên → để chuyển hiệu ứng / slide</span>
          </div>
          <div className="flex items-center gap-2 font-bold text-slate-600">
            <span className="bg-slate-100 px-3 py-1 rounded-lg">
              Trang {activeSlideIndex + 1} / {slides.length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
