import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Pen,
  Eraser,
  Undo2,
  Redo2,
  Trash2,
  Type,
  Download,
  Plus,
  Minus,
  Maximize2,
} from 'lucide-react';

export type BoardTheme = 'green' | 'white' | 'black';

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
    board.theme === 'white' ? '#1e3a8a' : '#ffffff'
  );

  const [canUndo, setCanUndo] = useState<boolean>(board.strokes.length > 0);
  const [canRedo, setCanRedo] = useState<boolean>(false);
  const redoStackRef = useRef<BoardStroke[]>([]);
  const isDrawingRef = useRef<boolean>(false);
  const currentPointsRef = useRef<{ x: number; y: number }[]>([]);

  // Bảng màu cho Bảng xanh / Bảng đen (phấn sáng màu)
  const darkThemeColors = [
    { label: 'Phấn trắng', color: '#ffffff' },
    { label: 'Phấn vàng', color: '#fef08a' },
    { label: 'Phấn xanh lơ', color: '#7dd3fc' },
    { label: 'Phấn cam đỏ', color: '#f87171' },
    { label: 'Phấn hồng', color: '#f472b6' },
    { label: 'Phấn xanh lá', color: '#86efac' },
  ];

  // Bảng màu cho Bảng trắng (bút dạ sẫm màu)
  const lightThemeColors = [
    { label: 'Bút xanh đậm', color: '#1d4ed8' },
    { label: 'Bút đen', color: '#0f172a' },
    { label: 'Bút đỏ', color: '#dc2626' },
    { label: 'Bút xanh lá', color: '#15803d' },
    { label: 'Bút tím', color: '#7e22ce' },
    { label: 'Bút cam', color: '#ea580c' },
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

    // Nền bảng
    ctx.clearRect(0, 0, w, h);
    if (board.theme === 'green') {
      ctx.fillStyle = '#0f382c';
    } else if (board.theme === 'black') {
      ctx.fillStyle = '#18181b';
    } else {
      ctx.fillStyle = '#ffffff';
    }
    ctx.fillRect(0, 0, w, h);

    // Kẻ lưới ô ly giống bảng trường học / vở ô ly
    const gridSize = 30;
    ctx.lineWidth = 1;
    if (board.theme === 'green') {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.09)';
    } else if (board.theme === 'black') {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    } else {
      ctx.strokeStyle = 'rgba(226, 232, 240, 0.8)';
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
        // Tẩy: dùng màu nền để xóa
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

  // Đồng bộ kích thước canvas với thẻ cha
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const targetWidth = Math.max(300, Math.floor(rect.width));
    const targetHeight = board.height || 320;

    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      redraw();
    }
  }, [board.height, redraw]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  // Tọa độ con trỏ hoặc điểm chạm cảm ứng
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
    ctx.arc(pt.x, pt.y, (activeTool === 'eraser' ? strokeWidth * 3.5 : strokeWidth) / 2, 0, Math.PI * 2);
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

  // Hoàn tác
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

  // Làm lại
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

  // Xóa trắng bảng
  const handleClear = () => {
    if (board.strokes.length === 0 && !board.textNote) return;
    if (window.confirm('Xóa sạch bảng viết này để viết lại từ đầu?')) {
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

  // Tải ảnh bảng về máy
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `bang-giang-slide-${board.slideIndex + 1}-${Date.now()}.png`;
    a.click();
  };

  // Tăng giảm chiều cao bảng
  const handleAdjustHeight = (delta: number) => {
    const newHeight = Math.max(200, Math.min(900, (board.height || 320) + delta));
    onUpdate({
      ...board,
      height: newHeight,
    });
  };

  return (
    <div
      ref={containerRef}
      className="my-4 rounded-2xl border-2 border-indigo-400/80 shadow-2xl overflow-hidden bg-slate-900 transition-all no-slide-advance select-none"
      onClick={(e) => e.stopPropagation()}
    >
      {/* THANH CÔNG CỤ VIẾT BẢNG SỐ */}
      <div className="bg-slate-900/95 text-slate-100 p-2 sm:px-3 sm:py-2 border-b border-slate-700/80 flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Nhãn bảng & Lựa chọn Theme bảng */}
        <div className="flex items-center gap-2">
          <span className="font-black text-amber-300 flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-amber-950/60 border border-amber-600/50">
            <span>✍️ BẢNG VIẾT BÀI GIẢNG</span>
          </span>

          {/* Chọn loại bảng */}
          <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700">
            <button
              type="button"
              onClick={() => handleThemeChange('green')}
              className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                board.theme === 'green'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Bảng xanh trường học kẻ ô ly"
            >
              <span>🟢</span>
              <span className="hidden sm:inline">Bảng xanh</span>
            </button>
            <button
              type="button"
              onClick={() => handleThemeChange('white')}
              className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                board.theme === 'white'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Bảng trắng bút dạ"
            >
              <span>⚪</span>
              <span className="hidden sm:inline">Bảng trắng</span>
            </button>
            <button
              type="button"
              onClick={() => handleThemeChange('black')}
              className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                board.theme === 'black'
                  ? 'bg-zinc-800 text-white shadow-xs border border-zinc-600'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Bảng đen kẻ ô"
            >
              <span>⚫</span>
              <span className="hidden sm:inline">Bảng đen</span>
            </button>
          </div>
        </div>

        {/* Công cụ vẽ: Bút, Tẩy, Nét, Màu, Hoàn tác */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Nút Bút viết */}
          <button
            type="button"
            onClick={() => setActiveTool('pen')}
            className={`p-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
              activeTool === 'pen'
                ? 'bg-indigo-600 text-white shadow-xs ring-1 ring-indigo-400'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
            title="Bút vẽ / Viết tay"
          >
            <Pen className="w-3.5 h-3.5" />
            <span className="text-[11px]">Bút</span>
          </button>

          {/* Nút Tẩy */}
          <button
            type="button"
            onClick={() => setActiveTool('eraser')}
            className={`p-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
              activeTool === 'eraser'
                ? 'bg-rose-600 text-white shadow-xs ring-1 ring-rose-400'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
            title="Tẩy xóa nét"
          >
            <Eraser className="w-3.5 h-3.5" />
            <span className="text-[11px]">Tẩy</span>
          </button>

          {/* Chọn kích cỡ nét */}
          <div className="flex items-center gap-1 bg-slate-800 px-1.5 py-1 rounded-lg border border-slate-700">
            {[
              { label: 'Mảnh', size: 2 },
              { label: 'Vừa', size: 4 },
              { label: 'Đậm', size: 7 },
            ].map((s) => (
              <button
                key={s.size}
                type="button"
                onClick={() => setStrokeWidth(s.size)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-all ${
                  strokeWidth === s.size
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Bảng màu */}
          <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg border border-slate-700">
            {currentColors.map((c) => (
              <button
                key={c.color}
                type="button"
                onClick={() => {
                  setSelectedColor(c.color);
                  setActiveTool('pen');
                }}
                className={`w-5 h-5 rounded-full border transition-transform cursor-pointer ${
                  selectedColor === c.color && activeTool === 'pen'
                    ? 'scale-125 border-white ring-2 ring-indigo-400 shadow-sm'
                    : 'border-slate-500 hover:scale-110 opacity-80 hover:opacity-100'
                }`}
                style={{ backgroundColor: c.color }}
                title={c.label}
              />
            ))}
          </div>

          <div className="h-4 w-[1px] bg-slate-700 mx-0.5"></div>

          {/* Hoàn tác / Làm lại */}
          <button
            type="button"
            disabled={!canUndo}
            onClick={handleUndo}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-200 transition-colors cursor-pointer"
            title="Hoàn tác nét vẽ (Undo)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            disabled={!canRedo}
            onClick={handleRedo}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-200 transition-colors cursor-pointer"
            title="Làm lại nét vẽ (Redo)"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>

          {/* Nút Xóa sạch */}
          <button
            type="button"
            onClick={handleClear}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-rose-200 border border-slate-700 transition-colors cursor-pointer"
            title="Xóa sạch bảng"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          {/* Nút bật/tắt ô gõ văn bản */}
          <button
            type="button"
            onClick={() => onUpdate({ ...board, showTextEditor: !board.showTextEditor })}
            className={`p-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
              board.showTextEditor
                ? 'bg-amber-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
            title="Bật/Tắt khung gõ lời giải / ghi chú bằng bàn phím"
          >
            <Type className="w-3.5 h-3.5" />
            <span className="text-[11px] hidden sm:inline">Gõ chữ</span>
          </button>

          {/* Tăng / giảm chiều cao bảng */}
          <div className="flex items-center gap-1 bg-slate-800 px-1 py-0.5 rounded-lg border border-slate-700">
            <button
              type="button"
              onClick={() => handleAdjustHeight(120)}
              className="p-1 hover:text-amber-300 cursor-pointer text-slate-300"
              title="Kéo dài bảng (+120px) để có thêm diện tích viết bài"
            >
              <Plus className="w-3 h-3" />
            </button>
            <span className="text-[10px] text-slate-400 font-mono px-0.5">{board.height}px</span>
            <button
              type="button"
              onClick={() => handleAdjustHeight(-120)}
              className="p-1 hover:text-amber-300 cursor-pointer text-slate-300"
              title="Thu ngắn bảng (-120px)"
            >
              <Minus className="w-3 h-3" />
            </button>
          </div>

          {/* Tải ảnh bảng */}
          <button
            type="button"
            onClick={handleDownload}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Tải ảnh nét vẽ về máy"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          {/* Xóa khối bảng */}
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Bạn có chắc muốn đóng và gỡ bỏ khối bảng viết này?')) {
                onDelete(board.id);
              }
            }}
            className="px-2 py-1 rounded-lg bg-rose-600/80 hover:bg-rose-700 text-white font-bold text-[11px] transition-colors cursor-pointer"
            title="Đóng khối bảng này"
          >
            ✕ Gỡ bảng
          </button>
        </div>
      </div>

      {/* VÙNG VẼ CHÍNH CỦA BẢNG (CANVAS) */}
      <div
        className="relative w-full cursor-crosshair overflow-hidden touch-none"
        style={{ height: `${board.height || 320}px` }}
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

        {/* Hướng dẫn mờ khi bảng chưa có nét vẽ */}
        {board.strokes.length === 0 && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <span
              className={`text-xs sm:text-sm font-bold opacity-30 select-none ${
                board.theme === 'white' ? 'text-slate-600' : 'text-slate-200'
              }`}
            >
              ✍️ Dùng bút cảm ứng, chuột hoặc tay để viết trực tiếp lời giải / vẽ hình tại đây...
            </span>
          </div>
        )}
      </div>

      {/* VÙNG GÕ VĂN BẢN / CÔNG THỨC TOÁN (TÙY CHỌN BẬT/TẮT) */}
      {board.showTextEditor && (
        <div className="p-3 bg-slate-950/90 border-t border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-amber-300 font-bold">
            <span>📝 Ghi chú / Lời giải gõ phím:</span>
            <span className="text-slate-400 text-[10px]">Tự động lưu cùng bảng</span>
          </div>
          <textarea
            value={board.textNote}
            onChange={(e) => onUpdate({ ...board, textNote: e.target.value })}
            placeholder="Thầy/cô có thể gõ thêm tóm tắt, công thức hoặc lời giải bổ sung bằng bàn phím tại đây..."
            rows={3}
            className="w-full bg-slate-900 text-slate-100 p-2.5 rounded-xl border border-slate-700 text-xs sm:text-sm focus:outline-none focus:border-indigo-500 transition-colors leading-relaxed"
          />
        </div>
      )}
    </div>
  );
};
