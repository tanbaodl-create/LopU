import React, { useRef, useState, useEffect, useCallback } from 'react';
import katex from 'katex';
import {
  Pen,
  Eraser,
  Undo2,
  Redo2,
  Trash2,
  Type,
  Download,
  GripHorizontal,
  Sigma,
  Shapes,
  Maximize2,
  Check,
  X,
} from 'lucide-react';

export type BoardTheme = 'white' | 'green' | 'black';

export type BoardTool =
  | 'pen'
  | 'eraser'
  | 'line'
  | 'arrow'
  | 'circle'
  | 'rect'
  | 'oxy'
  | 'oxyz'
  | 'parabola';

export interface Point {
  x: number;
  y: number;
}

export interface BoardStroke {
  points: Point[];
  color: string;
  width: number;
  isEraser?: boolean;
  shapeType?: 'stroke' | 'line' | 'arrow' | 'circle' | 'rect';
}

export interface BoardMathItem {
  id: string;
  latex: string;
  x: number;
  y: number;
}

export interface PptWhiteboardData {
  id: string;
  slideIndex: number;
  afterStepIndex: number;
  theme: BoardTheme;
  height: number;
  textNote: string;
  showTextEditor: boolean;
  showMathEditor?: boolean;
  strokes: BoardStroke[];
  mathItems?: BoardMathItem[];
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

// ==================== THUẬT TOÁN DIGITAL INK: GAUSSIAN SMOOTHING & CATMULL-ROM BEZIER ====================

// 1. Lọc bỏ các điểm rung tay micro-jitter và quantization
export const filterClosePoints = (points: Point[], minDistance: number = 3.0): Point[] => {
  if (points.length <= 2) return points;
  const result: Point[] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const prev = result[result.length - 1];
    const cur = points[i];
    const dist = Math.hypot(cur.x - prev.x, cur.y - prev.y);
    if (dist >= minDistance || i === points.length - 1) {
      result.push(cur);
    }
  }
  return result;
};

// 2. Tái lấy mẫu đều theo chiều dài cung (Arc-length Resampling)
export const resampleCurveEvenly = (points: Point[], stepSize: number = 5): Point[] => {
  if (points.length <= 2) return points;
  const resampled: Point[] = [points[0]];
  let accumulatedDist = 0;

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    const segLen = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    if (segLen === 0) continue;

    let d = stepSize - accumulatedDist;
    while (d <= segLen) {
      const t = d / segLen;
      resampled.push({
        x: p1.x + t * (p2.x - p1.x),
        y: p1.y + t * (p2.y - p1.y),
      });
      d += stepSize;
    }
    accumulatedDist = segLen - (d - stepSize);
  }

  const lastRaw = points[points.length - 1];
  const lastRes = resampled[resampled.length - 1];
  if (Math.hypot(lastRaw.x - lastRes.x, lastRaw.y - lastRes.y) > 2) {
    resampled.push(lastRaw);
  }
  return resampled;
};

// 3. Bộ lọc làm mượt Gaussian 5 điểm đa tầng (triệt tiêu hoàn toàn răng cưa và rung lắc)
export const smoothPointsGaussian = (points: Point[], iterations: number = 3): Point[] => {
  if (points.length <= 3) return points;
  let pts = [...points];

  for (let it = 0; it < iterations; it++) {
    const smoothed: Point[] = [{ ...pts[0] }];
    for (let i = 1; i < pts.length - 1; i++) {
      const pPrev2 = pts[Math.max(0, i - 2)];
      const pPrev1 = pts[i - 1];
      const pCur = pts[i];
      const pNext1 = pts[i + 1];
      const pNext2 = pts[Math.min(pts.length - 1, i + 2)];

      // Trọng số phân phối chuẩn Gaussian: [0.05, 0.25, 0.40, 0.25, 0.05]
      const smoothX =
        0.05 * pPrev2.x + 0.25 * pPrev1.x + 0.4 * pCur.x + 0.25 * pNext1.x + 0.05 * pNext2.x;
      const smoothY =
        0.05 * pPrev2.y + 0.25 * pPrev1.y + 0.4 * pCur.y + 0.25 * pNext1.y + 0.05 * pNext2.y;

      smoothed.push({ x: smoothX, y: smoothY });
    }
    smoothed.push({ ...pts[pts.length - 1] });
    pts = smoothed;
  }

  return pts;
};

// Vẽ một đường cong mượt Bézier spline chuẩn Catmull-Rom Centripetal
const renderCatmullRomBezierPath = (ctx: CanvasRenderingContext2D, points: Point[]) => {
  if (points.length <= 1) return;
  if (points.length === 2) {
    ctx.moveTo(points[0].x, points[0].y);
    ctx.lineTo(points[1].x, points[1].y);
    return;
  }

  ctx.moveTo(points[0].x, points[0].y);
  const tension = 6;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = i > 0 ? points[i - 1] : points[0];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = i + 2 < points.length ? points[i + 2] : p2;

    const cp1x = p1.x + (p2.x - p0.x) / tension;
    const cp1y = p1.y + (p2.y - p0.y) / tension;
    const cp2x = p2.x - (p3.x - p1.x) / tension;
    const cp2y = p2.y - (p3.y - p1.y) / tension;

    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
  }
};

// ==================== COMPONENT CHÍNH ====================

export const PptInteractiveBoard: React.FC<PptInteractiveBoardProps> = ({
  board,
  onUpdate,
  onDelete,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [activeTool, setActiveTool] = useState<BoardTool>('pen');
  const [strokeWidth, setStrokeWidth] = useState<number>(3.5);
  const [selectedColor, setSelectedColor] = useState<string>(
    board.theme === 'white' ? '#1d4ed8' : '#ffffff'
  );

  const [canUndo, setCanUndo] = useState<boolean>(board.strokes.length > 0);
  const [canRedo, setCanRedo] = useState<boolean>(false);
  const redoStackRef = useRef<BoardStroke[]>([]);
  const isDrawingRef = useRef<boolean>(false);
  const currentPointsRef = useRef<Point[]>([]);
  const [isResizing, setIsResizing] = useState<boolean>(false);

  // Modal / Menu công thức toán & hình học
  const [showMathPanel, setShowMathPanel] = useState<boolean>(false);
  const [showShapeMenu, setShowShapeMenu] = useState<boolean>(false);
  const [latexInput, setLatexInput] = useState<string>('y = \\frac{1}{2}x^2 - 3x + 4');
  const [renderedLatexPreview, setRenderedLatexPreview] = useState<string>('');

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

  // Cập nhật xem trước KaTeX thời gian thực
  useEffect(() => {
    try {
      const html = katex.renderToString(latexInput || '', {
        throwOnError: false,
        displayMode: true,
      });
      setRenderedLatexPreview(html);
    } catch {
      setRenderedLatexPreview(`<span class="text-rose-500">Lỗi cú pháp LaTeX</span>`);
    }
  }, [latexInput]);

  // Đổi theme bảng
  const handleThemeChange = (newTheme: BoardTheme) => {
    const newColor = newTheme === 'white' ? '#1d4ed8' : '#ffffff';
    setSelectedColor(newColor);
    onUpdate({
      ...board,
      theme: newTheme,
    });
  };

  // Vẽ lại toàn bộ canvas với thuật toán Digital Ink và các nét vẽ
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

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

    // Vẽ lại tất cả các nét đã lưu bằng Digital Ink
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
      if (stroke.shapeType === 'line' && stroke.points.length >= 2) {
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        ctx.lineTo(stroke.points[1].x, stroke.points[1].y);
        ctx.stroke();
      } else if (stroke.shapeType === 'arrow' && stroke.points.length >= 2) {
        const p1 = stroke.points[0];
        const p2 = stroke.points[1];
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
        // Mũi tên
        const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
        const headLen = stroke.width * 3.5;
        ctx.beginPath();
        ctx.moveTo(p2.x, p2.y);
        ctx.lineTo(p2.x - headLen * Math.cos(angle - Math.PI / 6), p2.y - headLen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(p2.x - headLen * Math.cos(angle + Math.PI / 6), p2.y - headLen * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fillStyle = stroke.color;
        ctx.fill();
      } else if (stroke.shapeType === 'circle' && stroke.points.length >= 2) {
        const p1 = stroke.points[0];
        const p2 = stroke.points[1];
        const r = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        ctx.arc(p1.x, p1.y, r, 0, Math.PI * 2);
        ctx.stroke();
      } else if (stroke.shapeType === 'rect' && stroke.points.length >= 2) {
        const p1 = stroke.points[0];
        const p2 = stroke.points[1];
        ctx.strokeRect(
          Math.min(p1.x, p2.x),
          Math.min(p1.y, p2.y),
          Math.abs(p2.x - p1.x),
          Math.abs(p2.y - p1.y)
        );
      } else {
        // Nét vẽ tự do được làm mượt bằng Catmull-Rom Cubic Bézier
        if (stroke.points.length === 1) {
          ctx.arc(stroke.points[0].x, stroke.points[0].y, stroke.width / 2, 0, Math.PI * 2);
          ctx.fillStyle = ctx.strokeStyle;
          ctx.fill();
        } else {
          renderCatmullRomBezierPath(ctx, stroke.points);
          ctx.stroke();
        }
      }
      ctx.restore();
    });
  }, [board.theme, board.strokes]);

  // Đồng bộ kích thước canvas với chiều cao khoảng trống
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
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const pt = getCanvasCoords(e);
    const pts = currentPointsRef.current;

    // Đối với các công cụ hình học (thước kẻ, hình tròn, chữ nhật)
    if (['line', 'arrow', 'circle', 'rect'].includes(activeTool)) {
      pts[1] = pt;
      redraw();
      // Vẽ nét xem trước tạm thời
      const ctx = canvas.getContext('2d');
      if (ctx && pts.length >= 2) {
        ctx.save();
        ctx.lineWidth = strokeWidth;
        ctx.strokeStyle = selectedColor;
        ctx.beginPath();
        if (activeTool === 'line') {
          ctx.moveTo(pts[0].x, pts[0].y);
          ctx.lineTo(pts[1].x, pts[1].y);
          ctx.stroke();
        } else if (activeTool === 'arrow') {
          ctx.moveTo(pts[0].x, pts[0].y);
          ctx.lineTo(pts[1].x, pts[1].y);
          ctx.stroke();
        } else if (activeTool === 'circle') {
          const r = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
          ctx.arc(pts[0].x, pts[0].y, r, 0, Math.PI * 2);
          ctx.stroke();
        } else if (activeTool === 'rect') {
          ctx.strokeRect(
            Math.min(pts[0].x, pts[1].x),
            Math.min(pts[0].y, pts[1].y),
            Math.abs(pts[1].x - pts[0].x),
            Math.abs(pts[1].y - pts[0].y)
          );
        }
        ctx.restore();
      }
      return;
    }

    // Vẽ nét tự do thời gian thực
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

    const rawPoints = currentPointsRef.current;
    if (rawPoints.length === 0) return;

    // Nếu là công cụ hình học
    if (['line', 'arrow', 'circle', 'rect'].includes(activeTool) && rawPoints.length >= 2) {
      const newStroke: BoardStroke = {
        points: [rawPoints[0], rawPoints[1]],
        color: selectedColor,
        width: strokeWidth,
        shapeType: activeTool as any,
      };
      const newStrokes = [...board.strokes, newStroke];
      redoStackRef.current = [];
      setCanUndo(true);
      setCanRedo(false);
      onUpdate({ ...board, strokes: newStrokes });
      currentPointsRef.current = [];
      return;
    }

    // Nét vẽ tự do: Lọc rung tay -> Tái lấy mẫu -> Làm mượt Gaussian đa tầng
    let finalPoints = rawPoints;
    if (activeTool !== 'eraser' && rawPoints.length > 3) {
      const filtered = filterClosePoints(rawPoints, 3.0);
      const resampled = resampleCurveEvenly(filtered, 5.5);
      finalPoints = smoothPointsGaussian(resampled, 3);
    }

    const newStroke: BoardStroke = {
      points: finalPoints,
      color: selectedColor,
      width: activeTool === 'eraser' ? strokeWidth * 3.5 : strokeWidth,
      isEraser: activeTool === 'eraser',
      shapeType: 'stroke',
    };

    const newStrokes = [...board.strokes, newStroke];
    redoStackRef.current = [];
    setCanUndo(true);
    setCanRedo(false);
    onUpdate({
      ...board,
      strokes: newStrokes,
    });

    currentPointsRef.current = [];
  };

  // CHÈN HỆ TRỤC TỌA ĐỘ OXY HOẶC OXYZ 3D TỰ ĐỘNG
  const handleInsertCoordinateSystem = (type: 'oxy' | 'oxyz') => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = canvas.width;
    const h = canvas.height;
    const cx = Math.floor(w / 2);
    const cy = Math.floor(h / 2);

    const newStrokes: BoardStroke[] = [...board.strokes];

    if (type === 'oxy') {
      // Trục hoành Ox
      newStrokes.push({
        points: [{ x: 40, y: cy }, { x: w - 40, y: cy }],
        color: selectedColor,
        width: 2.2,
        shapeType: 'arrow',
      });
      // Trục tung Oy
      newStrokes.push({
        points: [{ x: cx, y: h - 30 }, { x: cx, y: 30 }],
        color: selectedColor,
        width: 2.2,
        shapeType: 'arrow',
      });
    } else if (type === 'oxyz') {
      // Trục Oz đứng thẳng
      newStrokes.push({
        points: [{ x: cx, y: cy }, { x: cx, y: 30 }],
        color: selectedColor,
        width: 2.2,
        shapeType: 'arrow',
      });
      // Trục Oy ngang sang phải
      newStrokes.push({
        points: [{ x: cx, y: cy }, { x: w - 40, y: cy }],
        color: selectedColor,
        width: 2.2,
        shapeType: 'arrow',
      });
      // Trục Ox chéo góc 45 độ xuống trái
      newStrokes.push({
        points: [{ x: cx, y: cy }, { x: cx - Math.min(cx - 40, 160), y: cy + Math.min(h - cy - 30, 120) }],
        color: selectedColor,
        width: 2.2,
        shapeType: 'arrow',
      });
    }

    onUpdate({ ...board, strokes: newStrokes });
    setShowShapeMenu(false);
    setActiveTool('pen');
  };

  // CHÈN CÔNG THỨC TOÁN KATEX VÀO BẢNG
  const handleInsertMathToBoard = () => {
    if (!latexInput.trim()) return;
    const newMathItem: BoardMathItem = {
      id: `math-${Date.now()}`,
      latex: latexInput.trim(),
      x: 30,
      y: 30,
    };
    const mathItems = [...(board.mathItems || []), newMathItem];
    onUpdate({ ...board, mathItems });
    setShowMathPanel(false);
  };

  const handleRemoveMathItem = (id: string) => {
    const mathItems = (board.mathItems || []).filter((m) => m.id !== id);
    onUpdate({ ...board, mathItems });
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
    if (board.strokes.length === 0 && (!board.mathItems || board.mathItems.length === 0)) return;
    if (window.confirm('Xóa sạch nét vẽ và công thức trong khoảng trống này?')) {
      redoStackRef.current = [];
      setCanUndo(false);
      setCanRedo(false);
      onUpdate({
        ...board,
        strokes: [],
        mathItems: [],
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
      const newHeight = Math.max(80, Math.min(1600, startHeight + deltaY));
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
      {/* VẠCH PHÂN CÁCH TRÊN CỦA KHOẢNG TRỐNG */}
      <div className="bg-slate-100 text-slate-800 px-3 py-1.5 border-b border-indigo-200 flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Tiêu đề & Chọn nền bảng */}
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-indigo-700 flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-indigo-50 border border-indigo-200 shadow-2xs">
            <NoteRendererSpaceIcon className="w-4 h-4 text-indigo-600" />
            <span>KHOẢNG TRỐNG BÀI GIẢNG / LỜI GIẢI</span>
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

        {/* Thanh công cụ: Bút, Tẩy, Thước, Công thức Toán KaTeX, Hình học SVG */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Bút vẽ mực mượt mà */}
          <button
            type="button"
            onClick={() => setActiveTool('pen')}
            className={`p-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
              activeTool === 'pen'
                ? 'bg-indigo-600 text-white shadow-xs ring-1 ring-indigo-400'
                : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'
            }`}
            title="Bút vẽ mực kỹ thuật số (làm mượt Gaussian + Bézier Spline)"
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
            title="Tẩy xóa nét vẽ"
          >
            <Eraser className="w-3.5 h-3.5" />
            <span className="text-[11px]">Tẩy</span>
          </button>

          {/* Công cụ hình học & đồ thị */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowShapeMenu(!showShapeMenu)}
              className={`p-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                ['line', 'arrow', 'circle', 'rect'].includes(activeTool) || showShapeMenu
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'
              }`}
              title="Công cụ vẽ hình học & hệ trục tọa độ Oxy, Oxyz"
            >
              <Shapes className="w-3.5 h-3.5" />
              <span className="text-[11px]">Hình học ▾</span>
            </button>

            {/* Menu thả xuống chọn hình học */}
            {showShapeMenu && (
              <div className="absolute right-0 top-full mt-1.5 z-30 bg-white rounded-xl shadow-2xl border border-purple-200 p-2 w-48 text-slate-800 space-y-1 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTool('line');
                    setShowShapeMenu(false);
                  }}
                  className="w-full px-2.5 py-1.5 text-left rounded-lg hover:bg-purple-50 flex items-center gap-2 cursor-pointer"
                >
                  <span>📏</span>
                  <span>Đoạn thẳng</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTool('arrow');
                    setShowShapeMenu(false);
                  }}
                  className="w-full px-2.5 py-1.5 text-left rounded-lg hover:bg-purple-50 flex items-center gap-2 cursor-pointer"
                >
                  <span>↗️</span>
                  <span>Vectơ (Mũi tên)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTool('circle');
                    setShowShapeMenu(false);
                  }}
                  className="w-full px-2.5 py-1.5 text-left rounded-lg hover:bg-purple-50 flex items-center gap-2 cursor-pointer"
                >
                  <span>⭕</span>
                  <span>Đường tròn</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTool('rect');
                    setShowShapeMenu(false);
                  }}
                  className="w-full px-2.5 py-1.5 text-left rounded-lg hover:bg-purple-50 flex items-center gap-2 cursor-pointer"
                >
                  <span>▭</span>
                  <span>Hình chữ nhật</span>
                </button>
                <div className="border-t border-slate-200 my-1"></div>
                <button
                  type="button"
                  onClick={() => handleInsertCoordinateSystem('oxy')}
                  className="w-full px-2.5 py-1.5 text-left rounded-lg hover:bg-purple-50 font-bold text-purple-900 flex items-center gap-2 cursor-pointer"
                >
                  <span>📐</span>
                  <span>Trục tọa độ Oxy</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertCoordinateSystem('oxyz')}
                  className="w-full px-2.5 py-1.5 text-left rounded-lg hover:bg-purple-50 font-bold text-indigo-900 flex items-center gap-2 cursor-pointer"
                >
                  <span>🧊</span>
                  <span>Trục không gian Oxyz 3D</span>
                </button>
              </div>
            )}
          </div>

          {/* Công thức Toán KaTeX */}
          <button
            type="button"
            onClick={() => setShowMathPanel(!showMathPanel)}
            className={`p-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
              showMathPanel
                ? 'bg-amber-600 text-white'
                : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'
            }`}
            title="Gõ và chèn công thức Toán học chuẩn LaTeX / KaTeX"
          >
            <Sigma className="w-3.5 h-3.5" />
            <span className="text-[11px]">Toán KaTeX</span>
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
                  if (activeTool === 'eraser') setActiveTool('pen');
                }}
                className={`w-4.5 h-4.5 rounded-full border transition-transform cursor-pointer ${
                  selectedColor === c.color && activeTool !== 'eraser'
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
            title="Hoàn tác nét vẽ (Undo)"
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
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'
            }`}
            title="Gõ ghi chú bằng bàn phím"
          >
            <Type className="w-3.5 h-3.5" />
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
            title="Đóng khoảng trống"
          >
            ✕ Đóng
          </button>
        </div>
      </div>

      {/* THANH GÕ CÔNG THỨC TOÁN HỌC KATEX CHUẨN LATEX */}
      {showMathPanel && (
        <div className="p-3 bg-amber-50/90 border-b border-amber-200 text-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-amber-950 flex items-center gap-1.5">
              <span>📐 Gõ Công thức Toán học (KaTeX / LaTeX):</span>
            </span>
            <button
              type="button"
              onClick={() => setShowMathPanel(false)}
              className="text-slate-400 hover:text-slate-700 text-xs p-1 cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Gợi ý ký hiệu toán học phổ biến */}
          <div className="flex flex-wrap items-center gap-1">
            {[
              { label: 'Phân số', code: '\\frac{a}{b}' },
              { label: 'Căn', code: '\\sqrt{x}' },
              { label: 'Số mũ', code: 'x^2' },
              { label: 'Chỉ số', code: 'x_1' },
              { label: 'Tích phân', code: '\\int_{a}^{b} f(x)dx' },
              { label: 'Đạo hàm', code: 'f\'(x)' },
              { label: 'Giới hạn', code: '\\lim_{x \\to 0}' },
              { label: 'Vectơ', code: '\\vec{v}' },
              { label: 'Hệ PT', code: '\\begin{cases} x + y = 1 \\\\ x - y = 0 \\end{cases}' },
              { label: 'Cộng trừ', code: '\\pm' },
              { label: 'Vô cực', code: '\\infty' },
              { label: 'Góc', code: '\\widehat{ABC}' },
            ].map((sym) => (
              <button
                key={sym.label}
                type="button"
                onClick={() => setLatexInput((prev) => `${prev} ${sym.code}`)}
                className="px-2 py-0.5 rounded-md bg-white border border-amber-300 hover:bg-amber-100 text-[11px] font-semibold text-amber-900 transition-colors cursor-pointer shadow-2xs"
              >
                {sym.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={latexInput}
              onChange={(e) => setLatexInput(e.target.value)}
              placeholder="Nhập mã LaTeX (Ví dụ: y = \frac{ax+b}{cx+d} hoặc \int_0^\pi \sin(x)dx)..."
              className="flex-1 bg-white text-slate-900 px-3 py-1.5 rounded-xl border border-amber-300 text-xs sm:text-sm font-mono focus:outline-none focus:border-amber-600"
            />
            <button
              type="button"
              onClick={handleInsertMathToBoard}
              className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer whitespace-nowrap"
            >
              + Chèn vào bảng
            </button>
          </div>

          {/* Xem trước KaTeX */}
          <div className="p-2.5 bg-white rounded-xl border border-amber-200 overflow-x-auto text-center min-h-[44px] flex items-center justify-center">
            <div dangerouslySetInnerHTML={{ __html: renderedLatexPreview }} />
          </div>
        </div>
      )}

      {/* VÙNG VẼ CHÍNH CỦA KHOẢNG TRỐNG (CANVAS CÓ LƯỚI Ô LY & CÁC THẺ KATEX) */}
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

        {/* Các thẻ công thức Toán học KaTeX được chèn trên bảng */}
        {board.mathItems &&
          board.mathItems.map((item) => {
            let mathHtml = '';
            try {
              mathHtml = katex.renderToString(item.latex, { throwOnError: false, displayMode: true });
            } catch {
              mathHtml = item.latex;
            }
            return (
              <div
                key={item.id}
                className="absolute z-20 group p-2 rounded-xl bg-white/95 border border-indigo-300 shadow-md backdrop-blur-xs flex items-center gap-1.5"
                style={{ left: `${item.x}px`, top: `${item.y}px` }}
              >
                <div dangerouslySetInnerHTML={{ __html: mathHtml }} />
                <button
                  type="button"
                  onClick={() => handleRemoveMathItem(item.id)}
                  className="opacity-0 group-hover:opacity-100 text-rose-500 hover:text-rose-700 p-0.5 rounded cursor-pointer transition-opacity"
                  title="Gỡ công thức này"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}

        {/* Hướng dẫn khi bảng còn trống */}
        {board.strokes.length === 0 && (!board.mathItems || board.mathItems.length === 0) && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center gap-1.5">
            <span
              className={`text-xs sm:text-sm font-bold opacity-40 select-none ${
                board.theme === 'white' ? 'text-slate-600' : 'text-slate-200'
              }`}
            >
              ✍️ Đặt bút viết tay lời giải, vẽ hình học $Oxy/Oxyz$ hoặc chèn công thức Toán KaTeX
            </span>
            <span className="text-[11px] opacity-35 select-none text-slate-500">
              (Nét vẽ mực được làm mượt Gaussian 5 điểm &amp; Bézier Spline tự nhiên như bút thật)
            </span>
          </div>
        )}
      </div>

      {/* VÙNG GÕ VĂN BẢN (NẾU BẬT) */}
      {board.showTextEditor && (
        <div className="p-3 bg-slate-50 border-t border-slate-200 space-y-1">
          <div className="flex items-center justify-between text-[11px] text-indigo-900 font-bold">
            <span>📝 Ghi chú bài giảng / tóm tắt:</span>
            <span className="text-slate-500 text-[10px]">Tự động lưu cùng bảng</span>
          </div>
          <textarea
            value={board.textNote}
            onChange={(e) => onUpdate({ ...board, textNote: e.target.value })}
            placeholder="Thầy/cô có thể gõ thêm tóm tắt hoặc dán nội dung văn bản tại đây..."
            rows={3}
            className="w-full bg-white text-slate-800 p-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:border-indigo-500 transition-colors leading-relaxed"
          />
        </div>
      )}

      {/* THANH TAY CẦM KÉO GIÃN KHOẢNG TRỐNG CHUẨN NOTERENDERER */}
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
