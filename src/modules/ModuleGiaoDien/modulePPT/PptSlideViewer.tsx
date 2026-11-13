import React, { useState, useEffect, useRef } from 'react';
import { PptSlideItem } from './types';
import { getEffectLabel } from './PptMarkerRail';
import { splitStepIntoBlocks } from './pptUtils';
import {
  PptInteractiveBoard,
  PptWhiteboardData,
  NoteRendererSpaceIcon,
  BoardTool,
  PenType,
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
  onAddWhiteboardAtStep?: (
    stepIdx: number,
    initialHeight?: number,
    afterBlockIdx?: number
  ) => void;
  isInsertSpaceMode?: boolean;
  onExitInsertSpaceMode?: () => void;
  activeWhiteboardId?: string | null;
  onSelectWhiteboard?: (id: string) => void;
  onOpenTableModal?: () => void;
  onOpenGraphModal?: () => void;
  onOpenBbtModal?: () => void;
  onOpenMathModal?: () => void;
  onOpenImagePicker?: () => void;
  tienTrinhChuyenDe?: string;
  docTitle?: string;
  onExitPpt: () => void;
  isTeacher?: boolean;
  activeTool?: BoardTool;
  onToolChange?: (tool: BoardTool) => void;
  selectedPenType?: PenType;
  onPenTypeChange?: (pen: PenType) => void;
  selectedColor?: string;
  onColorChange?: (color: string) => void;
  strokeWidth?: number;
  onStrokeWidthChange?: (width: number) => void;
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
  isInsertSpaceMode = false,
  onExitInsertSpaceMode,
  activeWhiteboardId,
  onSelectWhiteboard,
  onOpenTableModal,
  onOpenGraphModal,
  onOpenBbtModal,
  onOpenMathModal,
  onOpenImagePicker,
  tienTrinhChuyenDe = 'Kiến thức',
  docTitle = 'Tài liệu Chuyên đề',
  onExitPpt,
  isTeacher = true,
  activeTool,
  onToolChange,
  selectedPenType,
  onPenTypeChange,
  selectedColor,
  onColorChange,
  strokeWidth,
  onStrokeWidthChange,
}) => {
  const [internalStepIndex, setInternalStepIndex] = useState<number>(0);
  const [internalRevealAll, setInternalRevealAll] = useState<boolean>(false);
  const [internalWhiteboards, setInternalWhiteboards] = useState<PptWhiteboardData[]>([]);

  const slideCardRef = useRef<HTMLDivElement>(null);
  const [hoverY, setHoverY] = useState<number | null>(null);
  const [dragSpaceState, setDragSpaceState] = useState<{
    startY: number;
    currentY: number;
    targetStepIdx: number;
    targetBlockIdx: number;
  } | null>(null);

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

  // Thêm một khoảng trống viết bài mới tại vị trí chỉ định (sau khối/bước nào, mặc định 280px)
  const handleAddBoardAtStep = (
    stepIdx: number,
    initialHeight: number = 280,
    afterBlockIdx?: number
  ) => {
    if (onAddWhiteboardAtStep) {
      onAddWhiteboardAtStep(stepIdx, initialHeight, afterBlockIdx);
      return;
    }
    const newBoard: PptWhiteboardData = {
      id: `space-${activeSlideIndex}-s${stepIdx}-b${afterBlockIdx !== undefined ? afterBlockIdx : 'end'}-${Date.now()}`,
      slideIndex: activeSlideIndex,
      afterStepIndex: stepIdx,
      afterBlockIndex: afterBlockIdx,
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

  const currentSlide = slides[Math.min(activeSlideIndex, Math.max(0, slides.length - 1))] || slides[0];
  const totalSteps = currentSlide?.steps?.length || 1;
  const visibleSteps = revealAllSteps
    ? currentSlide?.steps || []
    : (currentSlide?.steps || []).slice(0, activeStepIndex + 1);

  // Khi di chuột trên trang ở chế độ chèn khoảng trống (NoteRenderer hover horizontal line)
  const handleSlidePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isInsertSpaceMode || dragSpaceState) return;
    if (!slideCardRef.current) return;
    const rect = slideCardRef.current.getBoundingClientRect();
    const relY = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
    setHoverY(relY);
  };

  const handleSlidePointerLeave = () => {
    if (!dragSpaceState) {
      setHoverY(null);
    }
  };

  // Xác định vị trí bước (step) và vị trí khối con (block: đoạn, câu...) tương ứng với tọa độ Y để chèn khoảng trống
  const findTargetPositionAtY = (
    clientY: number
  ): { targetStepIdx: number; targetBlockIdx: number } => {
    if (!slideCardRef.current) {
      return { targetStepIdx: Math.max(0, visibleSteps.length - 1), targetBlockIdx: 0 };
    }

    const blockElements = Array.from(
      slideCardRef.current.querySelectorAll<HTMLElement>('[data-slide-block-idx]')
    );

    if (blockElements.length === 0) {
      return { targetStepIdx: Math.max(0, visibleSteps.length - 1), targetBlockIdx: 0 };
    }

    // 1. Nhấp phía trên khối đầu tiên của slide -> chèn ở đầu trang (trước khối 0)
    const firstRect = blockElements[0].getBoundingClientRect();
    if (clientY < firstRect.top + 8) {
      const stepIdx = parseInt(blockElements[0].getAttribute('data-step-idx') || '0', 10);
      return { targetStepIdx: stepIdx, targetBlockIdx: -1 };
    }

    // 2. Nhấp phía dưới khối cuối cùng của slide -> chèn ở cuối trang (sau khối cuối)
    const lastRect = blockElements[blockElements.length - 1].getBoundingClientRect();
    if (clientY >= lastRect.bottom - 8) {
      const lastGlobalIdx = parseInt(
        blockElements[blockElements.length - 1].getAttribute('data-slide-block-idx') || '0',
        10
      );
      const stepIdx = parseInt(
        blockElements[blockElements.length - 1].getAttribute('data-step-idx') || '0',
        10
      );
      return { targetStepIdx: stepIdx, targetBlockIdx: lastGlobalIdx };
    }

    // 3. Duyệt qua từng khối trên slide để tìm đúng vị trí giữa 2 đoạn/câu
    for (let i = 0; i < blockElements.length; i++) {
      const rect = blockElements[i].getBoundingClientRect();
      const globalIdx = parseInt(
        blockElements[i].getAttribute('data-slide-block-idx') || `${i}`,
        10
      );
      const stepIdx = parseInt(
        blockElements[i].getAttribute('data-step-idx') || '0',
        10
      );

      // Nếu con trỏ nằm trúng trong khối i
      if (clientY >= rect.top && clientY <= rect.bottom) {
        const midY = rect.top + rect.height / 2;
        if (clientY <= midY) {
          // Nửa trên của khối -> chèn trước khối này (sau khối i - 1)
          return {
            targetStepIdx: stepIdx,
            targetBlockIdx: i === 0 ? -1 : globalIdx - 1,
          };
        } else {
          // Nửa dưới của khối -> chèn sau khối này
          return { targetStepIdx: stepIdx, targetBlockIdx: globalIdx };
        }
      }

      // Nếu con trỏ nằm trong khoảng cách giữa khối i và khối i + 1
      if (i < blockElements.length - 1) {
        const nextRect = blockElements[i + 1].getBoundingClientRect();
        if (clientY > rect.bottom && clientY < nextRect.top) {
          return { targetStepIdx: stepIdx, targetBlockIdx: globalIdx };
        }
      }
    }

    const lastGlobalIdx = parseInt(
      blockElements[blockElements.length - 1].getAttribute('data-slide-block-idx') || '0',
      10
    );
    const stepIdx = parseInt(
      blockElements[blockElements.length - 1].getAttribute('data-step-idx') || '0',
      10
    );
    return { targetStepIdx: stepIdx, targetBlockIdx: lastGlobalIdx };
  };

  // Nhấp chuột để bắt đầu, giữ chuột kéo đến vị trí kết thúc sẽ thả chuột ra (như NoteRenderer)
  const handleSlidePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isInsertSpaceMode) return;
    const target = e.target as HTMLElement;
    if (target.closest('button, a, input, select, canvas, textarea, .no-space-insert')) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    const startY = e.clientY;
    const { targetStepIdx, targetBlockIdx } = findTargetPositionAtY(startY);

    setDragSpaceState({
      startY,
      currentY: startY,
      targetStepIdx,
      targetBlockIdx,
    });

    const onWindowPointerMove = (moveEvent: PointerEvent) => {
      moveEvent.preventDefault();
      setDragSpaceState((prev) => (prev ? { ...prev, currentY: moveEvent.clientY } : null));
    };

    const onWindowPointerUp = (upEvent: PointerEvent) => {
      upEvent.preventDefault();
      window.removeEventListener('pointermove', onWindowPointerMove);
      window.removeEventListener('pointerup', onWindowPointerUp);
      window.removeEventListener('pointercancel', onWindowPointerUp);

      const deltaY = upEvent.clientY - startY;
      const initialHeight = Math.abs(deltaY) >= 40 ? Math.round(Math.abs(deltaY)) : 280;
      handleAddBoardAtStep(targetStepIdx, initialHeight, targetBlockIdx);

      setDragSpaceState(null);
      setHoverY(null);
      if (onExitInsertSpaceMode) {
        onExitInsertSpaceMode();
      }
    };

    window.addEventListener('pointermove', onWindowPointerMove);
    window.addEventListener('pointerup', onWindowPointerUp);
    window.addEventListener('pointercancel', onWindowPointerUp);
  };

  const handleSlideClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isInsertSpaceMode || dragSpaceState) {
      return;
    }
    const target = e.target as HTMLElement;
    if (!target.closest('button, a, input, select, canvas, textarea, .no-slide-advance')) {
      if (!revealAllSteps && activeStepIndex < totalSteps - 1) {
        setActiveStepIndex((prev) => (typeof prev === 'number' ? prev + 1 : activeStepIndex + 1));
      } else if (activeSlideIndex < slides.length - 1) {
        onSlideChange(activeSlideIndex + 1);
        setActiveStepIndex(0);
      }
    }
  };

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
        if (isInsertSpaceMode) {
          setHoverY(null);
          setDragSpaceState(null);
          if (onExitInsertSpaceMode) {
            onExitInsertSpaceMode();
          }
          return;
        }
        onExitPpt();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [slides, activeSlideIndex, activeStepIndex, revealAllSteps, totalSteps, isInsertSpaceMode, onExitInsertSpaceMode, onSlideChange, onExitPpt]);

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col justify-between overflow-y-auto w-full h-full min-h-screen p-0 m-0">
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

      {/* Khung Chiếu Slide Chính PPT (Phủ hết chiều ngang màn hình, toàn màn hình) */}
      <div
        ref={slideCardRef}
        onPointerMove={handleSlidePointerMove}
        onPointerLeave={handleSlidePointerLeave}
        onPointerDown={handleSlidePointerDown}
        onClick={handleSlideClick}
        className={`bg-white w-full min-h-screen flex-1 flex flex-col justify-between p-6 sm:p-12 pt-24 sm:pt-28 pb-8 select-none transition-all relative border-none rounded-none shadow-none ${
          isInsertSpaceMode ? 'cursor-ns-resize ring-2 ring-indigo-400/40' : 'cursor-pointer'
        }`}
        title={
          isInsertSpaceMode
            ? 'Đang ở chế độ chèn khoảng trống: Nhấp chuột để bắt đầu, giữ & kéo xuống đến vị trí kết thúc sẽ thả chuột ra'
            : 'Nhấp chuột trái vào nền để hiện bước hiệu ứng kế tiếp hoặc chuyển slide'
        }
      >
        {/* 1. THANH NGANG THEO CON TRỎ CHUỘT KHI Ở CHẾ ĐỘ CHÈN KHOẢNG TRỐNG (NOTERENDERER HOVER RULER) */}
        {isInsertSpaceMode && hoverY !== null && !dragSpaceState && (
          <div
            style={{ top: `${hoverY}px` }}
            className="absolute left-0 right-0 z-40 pointer-events-none -translate-y-1/2 flex items-center transition-all"
          >
            <div className="w-full h-1 bg-indigo-500 shadow-md relative flex items-center justify-center">
              <span className="absolute left-4 text-white text-xs font-black drop-shadow animate-pulse">
                ▶
              </span>
              <div className="px-3.5 py-1 rounded-full bg-indigo-600 text-white text-xs font-bold shadow-xl border-2 border-white flex items-center gap-1.5 transform hover:scale-105 transition-transform">
                <NoteRendererSpaceIcon className="w-3.5 h-3.5 text-white" />
                <span>Nhấp chuột để bắt đầu, giữ & kéo xuống để mở khoảng trống</span>
              </div>
              <span className="absolute right-4 text-white text-xs font-black drop-shadow animate-pulse">
                ◀
              </span>
            </div>
          </div>
        )}

        {/* 2. KHU VỰC KHOẢNG TRỐNG ĐANG ĐƯỢC KÉO MỞ RỘNG (NOTERENDERER REAL-TIME DRAGGING PREVIEW) */}
        {isInsertSpaceMode && dragSpaceState && slideCardRef.current && (
          <div
            style={{
              top: `${dragSpaceState.startY - slideCardRef.current.getBoundingClientRect().top}px`,
              height: `${Math.max(16, dragSpaceState.currentY - dragSpaceState.startY)}px`,
            }}
            className="absolute left-0 right-0 z-40 bg-indigo-500/15 border-y-2 border-dashed border-indigo-600 flex flex-col justify-between pointer-events-none transition-all shadow-inner overflow-hidden"
          >
            {/* Vạch ngang trên: Điểm bắt đầu */}
            <div className="w-full h-1.5 bg-indigo-600 flex items-center justify-between px-3">
              <span className="text-[10px] text-white bg-indigo-700 px-2 py-0.5 rounded font-black shadow-xs">
                BẮT ĐẦU CHÈN
              </span>
              <span className="text-[10px] text-indigo-700 font-bold bg-white/95 px-2 py-0.5 rounded shadow-xs">
                Vạch trên
              </span>
            </div>

            {/* Thông số độ cao khoảng trống kéo theo thời gian thực */}
            <div className="flex items-center justify-center py-2">
              <div className="px-4 py-1.5 rounded-full bg-indigo-700 text-white text-xs font-extrabold shadow-2xl border-2 border-white flex items-center gap-2 animate-bounce">
                <NoteRendererSpaceIcon className="w-4 h-4 text-white" />
                <span>
                  ↕️ Khoảng trống: {Math.max(40, Math.round(dragSpaceState.currentY - dragSpaceState.startY))}px — Thả chuột để hoàn tất
                </span>
              </div>
            </div>

            {/* Vạch ngang dưới: Điểm kết thúc theo con trỏ chuột */}
            <div className="w-full h-1.5 bg-indigo-600 flex items-center justify-between px-3">
              <span className="text-[10px] text-white bg-indigo-700 px-2 py-0.5 rounded font-black shadow-xs">
                KẾT THÚC (THẢ CHUỘT RA)
              </span>
              <span className="text-[10px] text-indigo-700 font-bold bg-white/95 px-2 py-0.5 rounded shadow-xs">
                Vạch dưới
              </span>
            </div>
          </div>
        )}

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

          {/* Nội dung Slide hiển thị theo từng khối con (đoạn/câu) cho phép chèn khoảng trống vào giữa bất cứ đâu */}
          <div className="prose prose-indigo max-w-none text-slate-800 text-base sm:text-lg leading-relaxed pt-2 space-y-3">
            {/* Khoảng trống được chèn ở đầu trang (trước khối đầu tiên) */}
            {whiteboards
              .filter(
                (b) => b.slideIndex === activeSlideIndex && b.afterBlockIndex === -1
              )
              .map((b) => (
                <PptInteractiveBoard
                  key={b.id}
                  board={b}
                  onUpdate={handleUpdateBoard}
                  onDelete={handleDeleteBoard}
                  isActive={activeWhiteboardId === b.id}
                  onSelect={onSelectWhiteboard}
                  onOpenTableModal={onOpenTableModal}
                  onOpenGraphModal={onOpenGraphModal}
                  onOpenBbtModal={onOpenBbtModal}
                  onOpenMathModal={onOpenMathModal}
                  onOpenImagePicker={onOpenImagePicker}
                  activeTool={activeTool}
                  onToolChange={onToolChange}
                  selectedPenType={selectedPenType}
                  onPenTypeChange={onPenTypeChange}
                  selectedColor={selectedColor}
                  onColorChange={onColorChange}
                  strokeWidth={strokeWidth}
                  onStrokeWidthChange={onStrokeWidthChange}
                />
              ))}

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

              const blocks = splitStepIntoBlocks(stepHtml);

              // Tính offset khối của các bước trước đó
              let stepBlockOffset = 0;
              for (let prevStep = 0; prevStep < sIdx; prevStep++) {
                stepBlockOffset += splitStepIntoBlocks(visibleSteps[prevStep]).length;
              }

              // Nếu bước không có khối con nào tách biệt
              if (blocks.length === 0) {
                const currentStepBoards = whiteboards.filter(
                  (b) =>
                    b.slideIndex === activeSlideIndex &&
                    (b.afterBlockIndex === stepBlockOffset ||
                      (b.afterBlockIndex === undefined && b.afterStepIndex === sIdx))
                );

                return (
                  <React.Fragment key={`${currentSlide?.id}-step-${sIdx}`}>
                    <div
                      data-step-index={sIdx}
                      data-slide-block-idx={stepBlockOffset}
                      data-step-idx={sIdx}
                      className={animClass}
                      dangerouslySetInnerHTML={{ __html: stepHtml }}
                    />
                    {currentStepBoards.map((b) => (
                      <PptInteractiveBoard
                        key={b.id}
                        board={b}
                        onUpdate={handleUpdateBoard}
                        onDelete={handleDeleteBoard}
                        isActive={activeWhiteboardId === b.id}
                        onSelect={onSelectWhiteboard}
                        onOpenTableModal={onOpenTableModal}
                        onOpenGraphModal={onOpenGraphModal}
                        onOpenBbtModal={onOpenBbtModal}
                        onOpenMathModal={onOpenMathModal}
                        onOpenImagePicker={onOpenImagePicker}
                        activeTool={activeTool}
                        onToolChange={onToolChange}
                        selectedPenType={selectedPenType}
                        onPenTypeChange={onPenTypeChange}
                        selectedColor={selectedColor}
                        onColorChange={onColorChange}
                        strokeWidth={strokeWidth}
                        onStrokeWidthChange={onStrokeWidthChange}
                      />
                    ))}
                  </React.Fragment>
                );
              }

              return (
                <React.Fragment key={`${currentSlide?.id}-step-${sIdx}`}>
                  {blocks.map((blockHtml, bIdx) => {
                    const globalBlockIdx = stepBlockOffset + bIdx;
                    const isLastBlockOfStep = bIdx === blocks.length - 1;

                    // Các bảng viết chèn sau khối này:
                    // Khớp afterBlockIndex === globalBlockIdx,
                    // hoặc nếu là khối cuối của bước và có whiteboard cũ chỉ có afterStepIndex === sIdx
                    const boardsAfterThisBlock = whiteboards.filter(
                      (b) =>
                        b.slideIndex === activeSlideIndex &&
                        (b.afterBlockIndex === globalBlockIdx ||
                          (b.afterBlockIndex === undefined &&
                            b.afterStepIndex === sIdx &&
                            isLastBlockOfStep))
                    );

                    return (
                      <React.Fragment key={`${currentSlide?.id}-step-${sIdx}-b-${bIdx}`}>
                        <div
                          data-slide-block-idx={globalBlockIdx}
                          data-step-idx={sIdx}
                          className={`${animClass} transition-all`}
                          dangerouslySetInnerHTML={{ __html: blockHtml }}
                        />

                        {/* KHỐI BẢNG VIẾT TƯƠNG TÁC XUẤT HIỆN TẠI ĐÂY (NGAY GIỮA CÁC ĐOẠN / CÂU) */}
                        {boardsAfterThisBlock.map((b) => (
                          <PptInteractiveBoard
                            key={b.id}
                            board={b}
                            onUpdate={handleUpdateBoard}
                            onDelete={handleDeleteBoard}
                            isActive={activeWhiteboardId === b.id}
                            onSelect={onSelectWhiteboard}
                            onOpenTableModal={onOpenTableModal}
                            onOpenGraphModal={onOpenGraphModal}
                            onOpenBbtModal={onOpenBbtModal}
                            onOpenMathModal={onOpenMathModal}
                            onOpenImagePicker={onOpenImagePicker}
                            activeTool={activeTool}
                            onToolChange={onToolChange}
                            selectedPenType={selectedPenType}
                            onPenTypeChange={onPenTypeChange}
                            selectedColor={selectedColor}
                            onColorChange={onColorChange}
                            strokeWidth={strokeWidth}
                            onStrokeWidthChange={onStrokeWidthChange}
                          />
                        ))}
                      </React.Fragment>
                    );
                  })}
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
