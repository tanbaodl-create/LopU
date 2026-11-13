import React, { useState, useEffect } from 'react';
import { PptSlideItem } from './types';
import { getEffectLabel } from './PptMarkerRail';
import {
  PptInteractiveBoard,
  PptWhiteboardData,
  NoteRendererSpaceIcon,
} from './PptInteractiveBoard';

interface PptSlideViewerProps {
  slides: PptSlideItem[];
  activeSlideIndex: number;
  onSlideChange: (index: number) => void;
  activeStepIndex?: number;
  onStepChange?: (stepIdx: number) => void;
  revealAllSteps?: boolean;
  onToggleRevealAll?: () => void;
  whiteboards?: PptWhiteboardData[];
  onUpdateWhiteboard?: (updated: PptWhiteboardData) => void;
  onDeleteWhiteboard?: (id: string) => void;
  onAddWhiteboardAtStep?: (stepIdx: number, initialHeight?: number) => void;
  tienTrinhChuyenDe?: string;
  docTitle?: string;
  onExitPpt: () => void;
  isTeacher?: boolean;
}

export const PptSlideViewer: React.FC<PptSlideViewerProps> = ({
  slides,
  activeSlideIndex,
  onSlideChange,
  activeStepIndex: controlledStepIndex,
  onStepChange: controlledOnStepChange,
  revealAllSteps: controlledRevealAllSteps,
  onToggleRevealAll,
  whiteboards: controlledWhiteboards,
  onUpdateWhiteboard,
  onDeleteWhiteboard,
  onAddWhiteboardAtStep,
  tienTrinhChuyenDe = 'Kiến thức',
  docTitle = 'Tài liệu Chuyên đề',
  onExitPpt,
  isTeacher = true,
}) => {
  const [internalStepIndex, setInternalStepIndex] = useState<number>(0);
  const [internalRevealAll, setInternalRevealAll] = useState<boolean>(false);
  const [internalWhiteboards, setInternalWhiteboards] = useState<PptWhiteboardData[]>([]);

  const activeStepIndex = controlledStepIndex !== undefined ? controlledStepIndex : internalStepIndex;
  const setActiveStepIndex = (val: number | ((prev: number) => number)) => {
    if (controlledOnStepChange) {
      if (typeof val === 'function') {
        controlledOnStepChange(val(activeStepIndex));
      } else {
        controlledOnStepChange(val);
      }
    } else {
      setInternalStepIndex(val);
    }
  };

  const revealAllSteps = controlledRevealAllSteps !== undefined ? controlledRevealAllSteps : internalRevealAll;

  const whiteboards = controlledWhiteboards !== undefined ? controlledWhiteboards : internalWhiteboards;

  // Thêm một khoảng trống viết bài mới sau bước chỉ định (mặc định NoteRenderer 280px)
  const handleAddBoardAtStep = (stepIdx: number, initialHeight: number = 280) => {
    if (onAddWhiteboardAtStep) {
      onAddWhiteboardAtStep(stepIdx, initialHeight);
      return;
    }
    const newBoard: PptWhiteboardData = {
      id: `space-${activeSlideIndex}-${stepIdx}-${Date.now()}`,
      slideIndex: activeSlideIndex,
      afterStepIndex: stepIdx,
      theme: 'white',
      height: initialHeight,
      textNote: '',
      showTextEditor: false,
      strokes: [],
    };
    setInternalWhiteboards((prev) => [...prev, newBoard]);
  };

  const handleUpdateBoard = (updated: PptWhiteboardData) => {
    if (onUpdateWhiteboard) {
      onUpdateWhiteboard(updated);
    } else {
      setInternalWhiteboards((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
    }
  };

  const handleDeleteBoard = (id: string) => {
    if (onDeleteWhiteboard) {
      onDeleteWhiteboard(id);
    } else {
      setInternalWhiteboards((prev) => prev.filter((b) => b.id !== id));
    }
  };

  // Kéo chuột/bút xuống để chèn khoảng trống trực tiếp (NoteRenderer drag-to-insert mechanism)
  const handleStartCreateSpaceDrag = (stepIdx: number, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startY = e.clientY;
    let createdId: string | null = null;

    const onPointerMove = (moveEvent: PointerEvent) => {
      moveEvent.preventDefault();
      const deltaY = moveEvent.clientY - startY;
      if (deltaY > 20) {
        if (!createdId) {
          createdId = `space-${activeSlideIndex}-${stepIdx}-${Date.now()}`;
          const newSpace: PptWhiteboardData = {
            id: createdId,
            slideIndex: activeSlideIndex,
            afterStepIndex: stepIdx,
            theme: 'white',
            height: Math.max(120, Math.min(1200, deltaY)),
            textNote: '',
            showTextEditor: false,
            strokes: [],
          };
          if (onUpdateWhiteboard) {
            onUpdateWhiteboard(newSpace);
          } else {
            setInternalWhiteboards((prev) => [...prev, newSpace]);
          }
        } else {
          const h = Math.max(80, Math.min(1400, deltaY));
          if (onUpdateWhiteboard) {
            const currentItem = whiteboards.find((b) => b.id === createdId);
            if (currentItem) {
              onUpdateWhiteboard({ ...currentItem, height: h });
            }
          } else {
            setInternalWhiteboards((prev) =>
              prev.map((b) => (b.id === createdId ? { ...b, height: h } : b))
            );
          }
        }
      }
    };

    const onPointerUp = (upEvent: PointerEvent) => {
      upEvent.preventDefault();
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      // Nếu chỉ nhấp chuột mà không kéo thì mở khoảng trống chuẩn 280px
      if (!createdId && Math.abs(upEvent.clientY - startY) < 15) {
        handleAddBoardAtStep(stepIdx, 280);
      }
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  };

  const currentSlide = slides[Math.min(activeSlideIndex, Math.max(0, slides.length - 1))] || slides[0];
  const totalSteps = currentSlide?.steps?.length || 1;
  const visibleSteps = revealAllSteps
    ? currentSlide?.steps || []
    : (currentSlide?.steps || []).slice(0, activeStepIndex + 1);

  // Reset bước hiệu ứng khi đổi slide nếu đang dùng internal state
  useEffect(() => {
    if (controlledStepIndex === undefined) {
      setInternalStepIndex(0);
    }
  }, [activeSlideIndex, controlledStepIndex]);

  // Điều khiển phím chuyển slide & bước hiệu ứng
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        if (!revealAllSteps && activeStepIndex < totalSteps - 1) {
          setActiveStepIndex((prev) => (typeof prev === 'number' ? prev + 1 : activeStepIndex + 1));
        } else if (activeSlideIndex < slides.length - 1) {
          onSlideChange(activeSlideIndex + 1);
          setActiveStepIndex(0);
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        if (!revealAllSteps && activeStepIndex > 0) {
          setActiveStepIndex((prev) => (typeof prev === 'number' ? prev - 1 : activeStepIndex - 1));
        } else if (activeSlideIndex > 0) {
          const prevIdx = activeSlideIndex - 1;
          onSlideChange(prevIdx);
          const prevSlide = slides[prevIdx];
          setActiveStepIndex(prevSlide ? Math.max(0, prevSlide.steps.length - 1) : 0);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onExitPpt();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [slides, activeSlideIndex, activeStepIndex, revealAllSteps, totalSteps, onSlideChange, onExitPpt]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 p-4 sm:p-6 flex flex-col justify-between overflow-y-auto pt-24 pb-8 space-y-4">
      {/* Định nghĩa các chuyển động CSS của 10 hiệu ứng trình chiếu PPT cơ bản */}
      <style>{`
        @keyframes pptFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes pptSlideUp {
          from { opacity: 0; transform: translateY(28px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pptSlideDown {
          from { opacity: 0; transform: translateY(-28px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pptSlideLeft {
          from { opacity: 0; transform: translateX(-32px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes pptSlideRight {
          from { opacity: 0; transform: translateX(32px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes pptZoomIn {
          from { opacity: 0; transform: scale(0.85); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes pptBounce {
          0% { opacity: 0; transform: scale(0.4); }
          60% { opacity: 1; transform: scale(1.08); }
          85% { transform: scale(0.96); }
          100% { transform: scale(1); }
        }
        @keyframes pptWipe {
          from { clip-path: inset(0 100% 0 0); opacity: 0.2; }
          to { clip-path: inset(0 0 0 0); opacity: 1; }
        }
        @keyframes pptFlip {
          from { opacity: 0; transform: perspective(800px) rotateX(-45deg) translateY(-20px); }
          to { opacity: 1; transform: perspective(800px) rotateX(0deg) translateY(0); }
        }
        @keyframes pptGlow {
          0% { box-shadow: 0 0 0 0 rgba(168, 85, 247, 0.8); background-color: rgba(243, 232, 255, 0.9); }
          50% { box-shadow: 0 0 0 10px rgba(168, 85, 247, 0.35); background-color: rgba(243, 232, 255, 0.5); }
          100% { box-shadow: 0 0 0 0 rgba(168, 85, 247, 0); background-color: transparent; }
        }

        .animate-ppt-fade {
          animation: pptFadeIn 0.35s ease-out forwards;
        }
        .animate-ppt-slide-up {
          animation: pptSlideUp 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-ppt-slide-down {
          animation: pptSlideDown 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-ppt-slide-left {
          animation: pptSlideLeft 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-ppt-slide-right {
          animation: pptSlideRight 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-ppt-zoom {
          animation: pptZoomIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-ppt-bounce {
          animation: pptBounce 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .animate-ppt-wipe {
          animation: pptWipe 0.55s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }
        .animate-ppt-flip {
          animation: pptFlip 0.55s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          transform-origin: top center;
        }
        .animate-ppt-glow {
          animation: pptGlow 1.2s ease-out forwards;
        }
      `}</style>

      {/* Khung Chiếu Slide Chính PPT (Toàn màn hình, không còn thanh đen PPT riêng lẻ) */}
      <div
        onClick={(e) => {
          const target = e.target as HTMLElement;
          if (!target.closest('button, a, input, select, canvas, textarea, .no-slide-advance')) {
            if (!revealAllSteps && activeStepIndex < totalSteps - 1) {
              setActiveStepIndex((prev) => (typeof prev === 'number' ? prev + 1 : activeStepIndex + 1));
            } else if (activeSlideIndex < slides.length - 1) {
              onSlideChange(activeSlideIndex + 1);
              setActiveStepIndex(0);
            }
          }
        }}
        className="bg-white rounded-2xl shadow-2xl p-6 sm:p-10 min-h-[520px] max-w-5xl mx-auto flex flex-col justify-between border border-slate-200 cursor-pointer select-none transition-all relative w-full"
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
                <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span>⚡ Bước {revealAllSteps ? totalSteps : activeStepIndex + 1} / {totalSteps}</span>
                  {!revealAllSteps && currentSlide?.stepItems?.[activeStepIndex]?.effectType && (
                    <span className="font-extrabold text-amber-800">
                      ({getEffectLabel(currentSlide.stepItems[activeStepIndex].effectType)})
                    </span>
                  )}
                </span>
              )}
              <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                {docTitle}
              </span>
            </div>
          </div>

          {/* Nội dung Slide hiển thị theo hiệu ứng chuyển động đã cấu hình khi biên soạn */}
          <div className="prose prose-indigo max-w-none text-slate-800 text-base sm:text-lg leading-relaxed pt-2 space-y-3">
            {visibleSteps.map((stepHtml, sIdx) => {
              const stepItem = currentSlide?.stepItems?.[sIdx];
              const effectType = stepItem?.effectType || 'fade';

              // Áp dụng animation cho bước mới nhất vừa xuất hiện theo đúng 1 trong 10 hiệu ứng đã chọn
              const isNewlyRevealed = !revealAllSteps && sIdx === activeStepIndex;
              let animClass = '';
              if (isNewlyRevealed) {
                switch (effectType) {
                  case 'slide-up':
                    animClass = 'animate-ppt-slide-up';
                    break;
                  case 'slide-down':
                    animClass = 'animate-ppt-slide-down';
                    break;
                  case 'slide-left':
                    animClass = 'animate-ppt-slide-left';
                    break;
                  case 'slide-right':
                    animClass = 'animate-ppt-slide-right';
                    break;
                  case 'zoom':
                    animClass = 'animate-ppt-zoom';
                    break;
                  case 'bounce':
                    animClass = 'animate-ppt-bounce';
                    break;
                  case 'wipe':
                    animClass = 'animate-ppt-wipe';
                    break;
                  case 'flip':
                    animClass = 'animate-ppt-flip';
                    break;
                  case 'glow':
                  case 'highlight':
                    animClass = 'animate-ppt-glow rounded-xl p-1';
                    break;
                  case 'fade':
                  default:
                    animClass = 'animate-ppt-fade';
                    break;
                }
              }

              // Các khối bảng viết tương tác được chèn sau bước sIdx này
              const currentStepBoards = whiteboards.filter(
                (b) => b.slideIndex === activeSlideIndex && b.afterStepIndex === sIdx
              );

              return (
                <React.Fragment key={`${currentSlide?.id}-step-${sIdx}`}>
                  <div
                    className={animClass}
                    dangerouslySetInnerHTML={{ __html: stepHtml }}
                  />

                  {/* KHỐI BẢNG VIẾT TƯƠNG TÁC XUẤT HIỆN TẠI ĐÂY */}
                  {currentStepBoards.map((b) => (
                    <PptInteractiveBoard
                      key={b.id}
                      board={b}
                      onUpdate={handleUpdateBoard}
                      onDelete={handleDeleteBoard}
                    />
                  ))}

                  {/* THANH CHÈN KHOẢNG TRỐNG TRỰC TIẾP (NOTERENDERER DRAG & CLICK TO INSERT SPACE) */}
                  {isTeacher && isNewlyRevealed && currentStepBoards.length === 0 && (
                    <div className="py-2.5">
                      <div
                        onPointerDown={(e) => handleStartCreateSpaceDrag(sIdx, e)}
                        className="w-full py-2 px-3.5 rounded-xl border-2 border-dashed border-indigo-400/80 bg-indigo-50/60 hover:bg-indigo-100/80 text-indigo-900 font-bold text-xs flex items-center justify-between shadow-2xs transition-all cursor-ns-resize select-none group"
                        title="Chèn khoảng trống: Đặt bút hoặc chuột ở đây rồi kéo xuống để tạo một khoảng trống viết bài chèn vào giữa; kéo lên để thu hẹp (như NoteRenderer)"
                      >
                        <div className="flex items-center gap-2">
                          <span className="p-1 rounded-lg bg-indigo-600 text-white shadow-xs group-hover:scale-110 transition-transform">
                            <NoteRendererSpaceIcon className="w-3.5 h-3.5 text-white" />
                          </span>
                          <span className="text-[11px] sm:text-xs text-indigo-950 font-black">
                            ↕️ ĐẶT BÚT KÉO XUỐNG ĐỂ CHÈN KHOẢNG TRỐNG VIẾT BÀI (HOẶC NHẤP ĐỂ MỞ)
                          </span>
                        </div>
                        <span className="text-[10px] text-indigo-700 font-semibold bg-white/90 px-2 py-0.5 rounded-full border border-indigo-200">
                          NoteRenderer Style
                        </span>
                      </div>
                    </div>
                  )}
                </React.Fragment>
              );
            })}

            {/* Dấu nhắc bước tiếp theo nếu còn hiệu ứng ẩn */}
            {!revealAllSteps && activeStepIndex < totalSteps - 1 && (
              <div className="pt-2 flex items-center gap-2 text-xs font-bold text-amber-600 animate-pulse">
                <span>⚡ Nhấp chuột hoặc phím Space để xem tiếp bước {activeStepIndex + 2}
                  {currentSlide?.stepItems?.[activeStepIndex + 1]?.effectType && (
                    <span className="italic font-normal">
                      {' '}(Hiệu ứng {getEffectLabel(currentSlide.stepItems[activeStepIndex + 1].effectType)})
                    </span>
                  )}...
                </span>
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
