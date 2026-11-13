import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Pen,
  Eraser,
  Undo2,
  Redo2,
  Trash2,
  Type,
  Download,
  GripHorizontal,
} from 'lucide-react';

export type BoardTheme = 'white' | 'green' | 'black';

export interface BoardStroke {
  points: { x: number; y: number }[];
  color: string;
  width: number;
  isEraser?: boolean;
}

export interface PptWhiteboardData {
  id: string;
  slideIndex: number;
  afterStepIndex: number;
  theme: BoardTheme;
  height: number;
  textNote: string;
  showTextEditor: boolean;
  strokes: BoardStroke[];
}

interface PptInteractiveBoardProps {
  board: PptWhiteboardData;
  onUpdate: (updated: PptWhiteboardData) => void;
  onDelete: (id: string) => void;
}

/**
 * Biểu tượng Chèn Khoảng Trống (Insert Space Icon) chuẩn NoteRenderer:
 * Hai thanh ngang ở trên & dưới với mũi tên kéo xuống ở giữa
 */
export const NoteRendererSpaceIcon: React.FC<{ className?: string }> = ({
  className = 'w-4 h-4',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect x="3.5" y="2.5" width="17" height="4" rx="1" />
    <rect x="3.5" y="17.5" width="17" height="4" rx="1" />
    <path d="M12 9.5v5M9.5 12 12 14.5l2.5-2.5" />
  </svg>
);

export const PptInteractiveBoard: React.FC<PptInteractiveBoardProps> = ({
  board,
  onUpdate,
  onDelete,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [activeTool, setActiveTool] = useState<'pen' | 'eraser'>('pen');
  const [strokeWidth, setStrokeWidth] = useState<number>(3.5);
  const [selectedColor, setSelectedColor] = useState<string>(
    board.theme === 'white' ? '#1d4ed8' : '#ffffff'
  );

  const [canUndo, setCanUndo] = useState<boolean>(board.strokes.length > 0);
  const [canRedo, setCanRedo] = useState<boolean>(false);
  const redoStackRef = useRef<BoardStroke[]>([]);
  const isDrawingRef = useRef<boolean>(false);
  const currentPointsRef = useRef<{ x: number; y: number }[]>([]);
  const [isResizing, setIsResizing] = useState<boolean>(false);

  // Bảng màu cho Bảng trắng (bút dạ NoteRenderer sẫm màu)
  const lightThemeColors = [
    { label: 'Bút xanh dương', color: '#1d4ed8' },
    { label: 'Bút đen', color: '#0f172a' },
    { label: 'Bút đỏ', color: '#dc2626' },
    { label: 'Bút xanh lá', color: '#15803d' },
    { label: 'Bút tím', color: '#7e22ce' },
    { label: 'Bút cam', color: '#ea580c' },
  ];

  // Bảng màu cho Bảng xanh / Bảng đen (phấn màu sáng)
  const darkThemeColors = [
    { label: 'Phấn trắng', color: '#ffffff' },
    { label: 'Phấn vàng', color: '#fef08a' },
    { label: 'Phấn xanh lơ', color: '#7dd3fc' },
    { label: 'Phấn cam đỏ', color: '#f87171' },
    { label: 'Phấn hồng', color: '#f472b6' },
    { label: 'Phấn xanh lá', color: '#86efac' },
  ];

  const currentColors = board.theme === 'white' ? lightThemeColors : darkThemeColors;

  // Cập nhật màu mặc định khi đổi theme
  const handleThemeChange = (newTheme: BoardTheme) => {
    const newColor = newTheme === 'white' ? '#1d4ed8' : '#ffffff';
    setSelectedColor(newColor);
    onUpdate({
      ...board,
      theme: newTheme,
    });
  };

  // Vẽ lưới ô ly và các nét vẽ
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Nền khoảng trống
    ctx.clearRect(0, 0, w, h);
    if (board.theme === 'green') {
      ctx.fillStyle = '#0f382c';
    } else if (board.theme === 'black') {
      ctx.fillStyle = '#18181b';
    } else {
      ctx.fillStyle = '#ffffff';
    }
    ctx.fillRect(0, 0, w, h);

    // Kẻ lưới ô ly mờ chuẩn NoteRenderer / vở ô ly toán học
    const gridSize = 28;
    ctx.lineWidth = 1;
    if (board.theme === 'green') {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.09)';
    } else if (board.theme === 'black') {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    } else {
      ctx.strokeStyle = 'rgba(226, 232, 240, 0.85)';
    }

    ctx.beginPath();
    for (let x = gridSize; x < w; x += gridSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    for (let y = gridSize; y < h; y += gridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();

    // Vẽ lại tất cả các nét đã lưu
    board.strokes.forEach((stroke) => {
      if (!stroke.points || stroke.points.length < 1) return;
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = stroke.width;

      if (stroke.isEraser) {
        ctx.strokeStyle =
          board.theme === 'green' ? '#0f382c' : board.theme === 'black' ? '#18181b' : '#ffffff';
      } else {
        ctx.strokeStyle = stroke.color;
      }

      ctx.beginPath();
      if (stroke.points.length === 1) {
        ctx.arc(stroke.points[0].x, stroke.points[0].y, stroke.width / 2, 0, Math.PI * 2);
        ctx.fillStyle = stroke.isEraser
          ? board.theme === 'green'
            ? '#0f382c'
            : board.theme === 'black'
            ? '#18181b'
            : '#ffffff'
          : stroke.color;
        ctx.fill();
      } else {
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i++) {
          const xc = (stroke.points[i - 1].x + stroke.points[i].x) / 2;
          const yc = (stroke.points[i - 1].y + stroke.points[i].y) / 2;
          ctx.quadraticCurveTo(stroke.points[i - 1].x, stroke.points[i - 1].y, xc, yc);
        }
        ctx.lineTo(
          stroke.points[stroke.points.length - 1].x,
          stroke.points[stroke.points.length - 1].y
        );
        ctx.stroke();
      }
      ctx.restore();
    });
  }, [board.theme, board.strokes]);

  // Đồng bộ kích thước canvas với thẻ cha và chiều cao khoảng trống
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const targetWidth = Math.max(300, Math.floor(rect.width));
    const targetHeight = board.height || 280;

    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      redraw();
    }
  }, [board.height, redraw]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  // Tọa độ con trỏ / chạm cảm ứng
  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.setPointerCapture(e.pointerId);
    isDrawingRef.current = true;
    const pt = getCanvasCoords(e);
    currentPointsRef.current = [pt];

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = activeTool === 'eraser' ? strokeWidth * 3.5 : strokeWidth;
    ctx.strokeStyle =
      activeTool === 'eraser'
        ? board.theme === 'green'
          ? '#0f382c'
          : board.theme === 'black'
          ? '#18181b'
          : '#ffffff'
        : selectedColor;
    ctx.beginPath();
    ctx.arc(
      pt.x,
      pt.y,
      (activeTool === 'eraser' ? strokeWidth * 3.5 : strokeWidth) / 2,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fill();
    ctx.restore();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const pt = getCanvasCoords(e);
    const pts = currentPointsRef.current;
    pts.push(pt);

    const ctx = canvas.getContext('2d');
    if (!ctx || pts.length < 2) return;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = activeTool === 'eraser' ? strokeWidth * 3.5 : strokeWidth;
    ctx.strokeStyle =
      activeTool === 'eraser'
        ? board.theme === 'green'
          ? '#0f382c'
          : board.theme === 'black'
          ? '#18181b'
          : '#ffffff'
        : selectedColor;

    ctx.beginPath();
    const prevPt = pts[pts.length - 2];
    ctx.moveTo(prevPt.x, prevPt.y);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
    ctx.restore();
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    isDrawingRef.current = false;

    if (currentPointsRef.current.length > 0) {
      const newStroke: BoardStroke = {
        points: [...currentPointsRef.current],
        color: selectedColor,
        width: activeTool === 'eraser' ? strokeWidth * 3.5 : strokeWidth,
        isEraser: activeTool === 'eraser',
      };
      const newStrokes = [...board.strokes, newStroke];
      redoStackRef.current = [];
      setCanUndo(true);
      setCanRedo(false);
      onUpdate({
        ...board,
        strokes: newStrokes,
      });
    }
    currentPointsRef.current = [];
  };

  const handleUndo = () => {
    if (board.strokes.length === 0) return;
    const last = board.strokes[board.strokes.length - 1];
    const newStrokes = board.strokes.slice(0, -1);
    redoStackRef.current.push(last);
    setCanUndo(newStrokes.length > 0);
    setCanRedo(true);
    onUpdate({
      ...board,
      strokes: newStrokes,
    });
  };

  const handleRedo = () => {
    if (redoStackRef.current.length === 0) return;
    const next = redoStackRef.current.pop()!;
    const newStrokes = [...board.strokes, next];
    setCanUndo(true);
    setCanRedo(redoStackRef.current.length > 0);
    onUpdate({
      ...board,
      strokes: newStrokes,
    });
  };

  const handleClear = () => {
    if (board.strokes.length === 0 && !board.textNote) return;
    if (window.confirm('Xóa sạch nét vẽ trong khoảng trống này?')) {
      redoStackRef.current = [];
      setCanUndo(false);
      setCanRedo(false);
      onUpdate({
        ...board,
        strokes: [],
        textNote: '',
      });
    }
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `khoang-trong-slide-${board.slideIndex + 1}-${Date.now()}.png`;
    a.click();
  };

  // KÉO CHUỘT / BÚT ĐỂ KÉO GIÃN HOẶC THU HẸP KHOẢNG TRỐNG (CƠ CHẾ NOTERENDERER)
  const handleStartResizeDrag = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    const startY = e.clientY;
    const startHeight = board.height || 280;

    const onPointerMove = (moveEvent: PointerEvent) => {
      moveEvent.preventDefault();
      const deltaY = moveEvent.clientY - startY;
      // Kéo xuống -> mở rộng khoảng trống; Kéo lên -> thu hẹp khoảng trống
      const newHeight = Math.max(80, Math.min(1400, startHeight + deltaY));
      onUpdate({
        ...board,
        height: newHeight,
      });
    };

    const onPointerUp = (upEvent: PointerEvent) => {
      upEvent.preventDefault();
      setIsResizing(false);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  };

  return (
    <div
      ref={containerRef}
      className="my-3 rounded-2xl border-2 border-dashed border-indigo-400 bg-white shadow-xl overflow-hidden transition-all no-slide-advance select-none relative"
      onClick={(e) => e.stopPropagation()}
    >
      {/* VẠCH CHỈ THỊ ĐẦU KHOẢNG TRỐNG (ĐƯỜNG PHÂN CÁCH TRÊN CỦA NOTERENDERER) */}
      <div className="bg-slate-100 text-slate-800 px-3 py-1.5 border-b border-indigo-200 flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Tiêu đề & Biểu tượng Chèn Khoảng Trống NoteRenderer */}
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-indigo-700 flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-indigo-50 border border-indigo-200 shadow-2xs">
            <NoteRendererSpaceIcon className="w-4 h-4 text-indigo-600" />
            <span>KHOẢNG TRỐNG VIẾT BÀI GIẢNG / LỜI GIẢI</span>
          </span>

          {/* Chọn phong cách bảng / trang giấy */}
          <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg border border-slate-300">
            <button
              type="button"
              onClick={() => handleThemeChange('white')}
              className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                board.theme === 'white'
                  ? 'bg-white text-indigo-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Trang trắng ô ly NoteRenderer"
            >
              <span>⚪</span>
              <span className="hidden sm:inline">Trang trắng</span>
            </button>
            <button
              type="button"
              onClick={() => handleThemeChange('green')}
              className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                board.theme === 'green'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Bảng xanh trường học kẻ ô ly"
            >
              <span>🟢</span>
              <span className="hidden sm:inline">Bảng xanh</span>
            </button>
            <button
              type="button"
              onClick={() => handleThemeChange('black')}
              className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                board.theme === 'black'
                  ? 'bg-zinc-800 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Bảng đen kẻ ô"
            >
              <span>⚫</span>
              <span className="hidden sm:inline">Bảng đen</span>
            </button>
          </div>
        </div>

        {/* Thanh công cụ vẽ: Bút, Tẩy, Nét, Màu, Hoàn tác, Gõ chữ */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Bút viết */}
          <button
            type="button"
            onClick={() => setActiveTool('pen')}
            className={`p-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
              activeTool === 'pen'
                ? 'bg-indigo-600 text-white shadow-xs ring-1 ring-indigo-400'
                : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'
            }`}
            title="Bút viết tay"
          >
            <Pen className="w-3.5 h-3.5" />
            <span className="text-[11px]">Bút</span>
          </button>

          {/* Tẩy xóa */}
          <button
            type="button"
            onClick={() => setActiveTool('eraser')}
            className={`p-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
              activeTool === 'eraser'
                ? 'bg-rose-600 text-white shadow-xs ring-1 ring-rose-400'
                : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'
            }`}
            title="Tẩy xóa nét"
          >
            <Eraser className="w-3.5 h-3.5" />
            <span className="text-[11px]">Tẩy</span>
          </button>

          {/* Cỡ nét */}
          <div className="flex items-center gap-1 bg-white px-1.5 py-1 rounded-lg border border-slate-300">
            {[
              { label: 'Mảnh', size: 2 },
              { label: 'Vừa', size: 3.5 },
              { label: 'Đậm', size: 6.5 },
            ].map((s) => (
              <button
                key={s.size}
                type="button"
                onClick={() => setStrokeWidth(s.size)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-all ${
                  strokeWidth === s.size
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Bảng màu */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-300">
            {currentColors.map((c) => (
              <button
                key={c.color}
                type="button"
                onClick={() => {
                  setSelectedColor(c.color);
                  setActiveTool('pen');
                }}
                className={`w-4.5 h-4.5 rounded-full border transition-transform cursor-pointer ${
                  selectedColor === c.color && activeTool === 'pen'
                    ? 'scale-125 border-indigo-700 ring-2 ring-indigo-300 shadow-xs'
                    : 'border-slate-400 hover:scale-110 opacity-80 hover:opacity-100'
                }`}
                style={{ backgroundColor: c.color }}
                title={c.label}
              />
            ))}
          </div>

          <div className="h-4 w-[1px] bg-slate-300 mx-0.5"></div>

          {/* Hoàn tác / Làm lại */}
          <button
            type="button"
            disabled={!canUndo}
            onClick={handleUndo}
            className="p-1.5 rounded-lg bg-white hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed text-slate-700 border border-slate-300 transition-colors cursor-pointer"
            title="Hoàn tác (Undo)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            disabled={!canRedo}
            onClick={handleRedo}
            className="p-1.5 rounded-lg bg-white hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed text-slate-700 border border-slate-300 transition-colors cursor-pointer"
            title="Làm lại (Redo)"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>

          {/* Xóa sạch */}
          <button
            type="button"
            onClick={handleClear}
            className="p-1.5 rounded-lg bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-300 transition-colors cursor-pointer"
            title="Xóa sạch khoảng trống"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          {/* Gõ chữ */}
          <button
            type="button"
            onClick={() => onUpdate({ ...board, showTextEditor: !board.showTextEditor })}
            className={`p-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
              board.showTextEditor
                ? 'bg-amber-600 text-white'
                : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'
            }`}
            title="Gõ công thức / lời giải bằng bàn phím"
          >
            <Type className="w-3.5 h-3.5" />
            <span className="text-[11px] hidden sm:inline">Gõ chữ</span>
          </button>

          {/* Tải ảnh */}
          <button
            type="button"
            onClick={handleDownload}
            className="p-1.5 rounded-lg bg-white hover:bg-slate-200 text-slate-700 border border-slate-300 transition-colors cursor-pointer"
            title="Tải ảnh khoảng trống này"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          {/* Đóng khoảng trống */}
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Thu hẹp và đóng khoảng trống này lại?')) {
                onDelete(board.id);
              }
            }}
            className="px-2 py-1 rounded-lg bg-slate-200 hover:bg-rose-600 hover:text-white text-slate-700 font-bold text-[11px] transition-colors cursor-pointer"
            title="Thu hẹp và đóng khoảng trống này"
          >
            ✕ Đóng
          </button>
        </div>
      </div>

      {/* VÙNG VẼ CHÍNH CỦA KHOẢNG TRỐNG (CANVAS CÓ LƯỚI Ô LY) */}
      <div
        className="relative w-full cursor-crosshair overflow-hidden touch-none"
        style={{ height: `${board.height || 280}px` }}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="w-full h-full block"
          style={{ touchAction: 'none' }}
        />

        {board.strokes.length === 0 && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center gap-1">
            <span
              className={`text-xs sm:text-sm font-semibold opacity-40 select-none ${
                board.theme === 'white' ? 'text-slate-600' : 'text-slate-200'
              }`}
            >
              ✍️ Đặt bút viết trực tiếp lời giải / vẽ hình vào khoảng trống này
            </span>
            <span className="text-[11px] opacity-30 select-none text-slate-500">
              (Kéo thanh tay cầm bên dưới để mở rộng thêm hoặc thu hẹp khoảng trống)
            </span>
          </div>
        )}
      </div>

      {/* VÙNG GÕ VĂN BẢN (NẾU BẬT) */}
      {board.showTextEditor && (
        <div className="p-3 bg-slate-50 border-t border-slate-200 space-y-1">
          <div className="flex items-center justify-between text-[11px] text-indigo-900 font-bold">
            <span>📝 Lời giải / tóm tắt gõ phím:</span>
            <span className="text-slate-500 text-[10px]">Lưu tự động trong khoảng trống</span>
          </div>
          <textarea
            value={board.textNote}
            onChange={(e) => onUpdate({ ...board, textNote: e.target.value })}
            placeholder="Thầy/cô có thể gõ thêm lời giải, công thức hoặc dán nội dung văn bản tại đây..."
            rows={3}
            className="w-full bg-white text-slate-800 p-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:border-indigo-500 transition-colors leading-relaxed"
          />
        </div>
      )}

      {/* THANH TAY CẦM KÉO GIÃN KHOẢNG TRỐNG CHUẨN NOTERENDERER (DRAG HANDLE TO EXPAND/REDUCE SPACE) */}
      <div
        onPointerDown={handleStartResizeDrag}
        className={`w-full py-1.5 px-3 bg-gradient-to-r from-indigo-50 via-purple-50 to-indigo-50 border-t-2 border-dashed border-indigo-400 flex items-center justify-between cursor-ns-resize select-none transition-all hover:bg-indigo-100 ${
          isResizing ? 'bg-indigo-200 ring-2 ring-indigo-500' : ''
        }`}
        title="Kéo xuống để mở rộng khoảng trống • Kéo lên để thu hẹp (như NoteRenderer)"
      >
        <div className="flex items-center gap-2 text-indigo-700 font-black text-[11px]">
          <GripHorizontal className="w-4 h-4 text-indigo-500" />
          <span>↕️ KÉO XUỐNG ĐỂ MỞ RỘNG KHOẢNG TRỐNG • KÉO LÊN ĐỂ THU HẸP</span>
        </div>

        <div className="flex items-center gap-2 text-[10px] text-slate-500">
          <span className="bg-white px-2 py-0.5 rounded-full border border-indigo-200 font-mono font-bold text-indigo-800">
            {board.height}px
          </span>
          <span className="hidden sm:inline italic text-slate-400">
            (Nội dung tiếp theo sẽ xuất hiện bên dưới khoảng trống này)
          </span>
        </div>
      </div>
    </div>
  );
};
