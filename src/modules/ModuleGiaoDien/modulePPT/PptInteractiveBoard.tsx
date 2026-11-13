import React, { useRef, useState, useEffect, useCallback } from 'react';
import katex from 'katex';
import {
  Pen,
  Paintbrush,
  Highlighter,
  Pencil,
  Sparkles,
  Eraser,
  GripHorizontal,
  Sigma,
  X,
  Table,
  Image as ImageIcon,
  TrendingUp,
  BarChart3,
  MousePointer,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  ZoomIn,
  ZoomOut,
  Move,
  Plus,
} from 'lucide-react';

export type BoardTheme = 'white' | 'green' | 'black';

export type PenType = 'ballpoint' | 'fountain' | 'brush' | 'highlighter' | 'pencil' | 'laser';

export type BoardTool =
  | 'select'
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
  penType?: PenType;
  opacity?: number;
  isEraser?: boolean;
  shapeType?: 'stroke' | 'line' | 'arrow' | 'circle' | 'rect';
}

export interface BoardMathItem {
  id: string;
  latex: string;
  x: number;
  y: number;
}

export interface BoardHtmlItem {
  id: string;
  type: 'table' | 'image' | 'math' | 'graph' | 'bbt' | 'html';
  html: string;
  title?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  scale?: number;
  rotate?: number;
  flipH?: boolean;
  flipV?: boolean;
  createdAt?: number;
}

export interface PptWhiteboardData {
  id: string;
  slideIndex: number;
  afterStepIndex: number;
  afterBlockIndex?: number;
  theme: BoardTheme;
  height: number;
  textNote: string;
  showTextEditor: boolean;
  showMathEditor?: boolean;
  strokes: BoardStroke[];
  mathItems?: BoardMathItem[];
  htmlItems?: BoardHtmlItem[];
}

interface PptInteractiveBoardProps {
  board: PptWhiteboardData;
  onUpdate: (updated: PptWhiteboardData) => void;
  onDelete: (id: string) => void;
  isActive?: boolean;
  onSelect?: (id: string) => void;
  onOpenTableModal?: () => void;
  onOpenGraphModal?: () => void;
  onOpenBbtModal?: () => void;
  onOpenMathModal?: () => void;
  onOpenImagePicker?: () => void;
  activeTool?: BoardTool;
  onToolChange?: (tool: BoardTool) => void;
  selectedPenType?: PenType;
  onPenTypeChange?: (pen: PenType) => void;
  selectedColor?: string;
  onColorChange?: (color: string) => void;
  strokeWidth?: number;
  onStrokeWidthChange?: (width: number) => void;
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
  isActive = false,
  onSelect,
  onOpenTableModal,
  onOpenGraphModal,
  onOpenBbtModal,
  onOpenMathModal,
  onOpenImagePicker,
  activeTool: controlledActiveTool,
  onToolChange,
  selectedPenType: controlledPenType,
  onPenTypeChange,
  selectedColor: controlledColor,
  onColorChange,
  strokeWidth: controlledStrokeWidth,
  onStrokeWidthChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const localImageInputRef = useRef<HTMLInputElement | null>(null);

  const [internalActiveTool, setInternalActiveTool] = useState<BoardTool>('pen');
  const [internalPenType, setInternalPenType] = useState<PenType>('ballpoint');
  const [internalStrokeWidth, setInternalStrokeWidth] = useState<number>(2.2);
  const [internalColor, setInternalColor] = useState<string>(
    board.theme === 'white' ? '#1d4ed8' : '#ffffff'
  );

  const activeTool = controlledActiveTool !== undefined ? controlledActiveTool : internalActiveTool;
  const setActiveTool = (t: BoardTool | ((prev: BoardTool) => BoardTool)) => {
    const nextVal = typeof t === 'function' ? t(activeTool) : t;
    setInternalActiveTool(nextVal);
    onToolChange?.(nextVal);
  };

  const selectedPenType = controlledPenType !== undefined ? controlledPenType : internalPenType;
  const setSelectedPenType = (p: PenType | ((prev: PenType) => PenType)) => {
    const nextVal = typeof p === 'function' ? p(selectedPenType) : p;
    setInternalPenType(nextVal);
    onPenTypeChange?.(nextVal);
  };

  const strokeWidth = controlledStrokeWidth !== undefined ? controlledStrokeWidth : internalStrokeWidth;
  const setStrokeWidth = (w: number | ((prev: number) => number)) => {
    const nextVal = typeof w === 'function' ? w(strokeWidth) : w;
    setInternalStrokeWidth(nextVal);
    onStrokeWidthChange?.(nextVal);
  };

  const selectedColor = controlledColor !== undefined ? controlledColor : internalColor;
  const setSelectedColor = (c: string | ((prev: string) => string)) => {
    const nextVal = typeof c === 'function' ? c(selectedColor) : c;
    setInternalColor(nextVal);
    onColorChange?.(nextVal);
  };

  // Chọn 1 trong 5 đầu bút: Bút bi, Bút lông, Highlight, Bút chì, Bút laser
  const handleSelectPen = (pen: PenType) => {
    setActiveTool('pen');
    setSelectedPenType(pen);
    if (pen === 'ballpoint') {
      setStrokeWidth(2.2);
      setSelectedColor(board.theme === 'white' ? '#1d4ed8' : '#ffffff');
    } else if (pen === 'fountain') {
      setStrokeWidth(2.8);
      setSelectedColor(board.theme === 'white' ? '#1d4ed8' : '#60a5fa');
    } else if (pen === 'brush') {
      setStrokeWidth(6.0);
      setSelectedColor(board.theme === 'white' ? '#7c3aed' : '#f472b6');
    } else if (pen === 'highlighter') {
      setStrokeWidth(20.0);
      setSelectedColor('#facc15');
    } else if (pen === 'pencil') {
      setStrokeWidth(1.4);
      setSelectedColor(board.theme === 'white' ? '#475569' : '#cbd5e1');
    } else if (pen === 'laser') {
      setStrokeWidth(5.0);
      setSelectedColor('#ef4444');
    }
  };

  // Bảng màu thông minh tương thích theo từng đầu bút
  const getPenColors = () => {
    if (selectedPenType === 'highlighter') {
      return [
        { label: 'Vàng dạ quang', color: '#facc15' },
        { label: 'Xanh lá neon', color: '#4ade80' },
        { label: 'Xanh lơ neon', color: '#38bdf8' },
        { label: 'Hồng neon', color: '#f472b6' },
        { label: 'Cam neon', color: '#fb923c' },
      ];
    }
    if (selectedPenType === 'fountain') {
      return [
        { label: 'Xanh mực', color: '#1d4ed8' },
        { label: 'Tím hoa cà', color: '#7e22ce' },
        { label: 'Xanh đen', color: board.theme === 'white' ? '#0f172a' : '#ffffff' },
        { label: 'Đỏ mực', color: '#dc2626' },
        { label: 'Xanh ngọc', color: '#059669' },
      ];
    }
    if (selectedPenType === 'pencil') {
      return [
        { label: 'Chì đen', color: board.theme === 'white' ? '#1e293b' : '#ffffff' },
        { label: 'Chì xám', color: board.theme === 'white' ? '#475569' : '#cbd5e1' },
        { label: 'Chì nhạt', color: '#94a3b8' },
        { label: 'Chì xanh nháp', color: '#3b82f6' },
      ];
    }
    if (selectedPenType === 'laser') {
      return [
        { label: 'Laser đỏ rực', color: '#ef4444' },
        { label: 'Laser xanh lá', color: '#22c55e' },
      ];
    }
    if (selectedPenType === 'brush') {
      return [
        { label: 'Tím', color: '#7c3aed' },
        { label: 'Xanh lá', color: '#16a34a' },
        { label: 'Cam', color: '#ea580c' },
        { label: 'Xanh dương', color: '#1d4ed8' },
        { label: 'Đen', color: board.theme === 'white' ? '#0f172a' : '#ffffff' },
        { label: 'Đỏ', color: '#dc2626' },
      ];
    }
    // Mặc định: Bút bi
    return [
      { label: 'Xanh dương', color: '#1d4ed8' },
      { label: 'Đen', color: board.theme === 'white' ? '#0f172a' : '#ffffff' },
      { label: 'Đỏ', color: '#dc2626' },
      { label: 'Xanh lá', color: '#15803d' },
      { label: 'Tím', color: '#7e22ce' },
    ];
  };

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
  const [selectedHtmlItemId, setSelectedHtmlItemId] = useState<string | null>(null);

  // Cập nhật thuộc tính của một khối hình/công thức/đồ thị/bảng
  const updateHtmlItem = (
    itemId: string,
    updater: (item: BoardHtmlItem) => Partial<BoardHtmlItem>
  ) => {
    const updatedItems = (board.htmlItems || []).map((it) => {
      if (it.id === itemId) {
        return { ...it, ...updater(it) };
      }
      return it;
    });
    onUpdate({
      ...board,
      htmlItems: updatedItems,
    });
  };

  // Di chuyển vị trí khối hình/công thức/đồ thị/bảng (Kéo mượt mà 60-144 FPS trực tiếp trên đối tượng)
  const handleStartDragItem = (e: React.PointerEvent, item: BoardHtmlItem) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedHtmlItemId(item.id);

    const itemEl =
      (e.currentTarget as HTMLElement) ||
      ((e.target as HTMLElement).closest(`[data-board-item-id="${item.id}"]`) as HTMLElement | null);
    if (!itemEl) return;

    try {
      itemEl.setPointerCapture(e.pointerId);
    } catch {}

    const startX = e.clientX;
    const startY = e.clientY;
    const initialItemX = item.x ?? 20;
    const initialItemY = item.y ?? 20;
    let finalX = initialItemX;
    let finalY = initialItemY;

    // Tắt transition hoàn toàn trong khi kéo để chuyển động tức thì theo chuột
    itemEl.style.transition = 'none';

    let rafId: number | null = null;

    const onPointerMove = (moveEvent: PointerEvent) => {
      moveEvent.preventDefault();
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      finalX = Math.max(0, initialItemX + dx);
      finalY = Math.max(0, initialItemY + dy);

      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        itemEl.style.left = `${finalX}px`;
        itemEl.style.top = `${finalY}px`;
      });
    };

    const onPointerUp = (upEvent: PointerEvent) => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);

      try {
        itemEl.releasePointerCapture(upEvent.pointerId);
      } catch {}

      itemEl.style.transition = '';

      // Cập nhật vị trí cuối cùng vào state React 1 lần duy nhất khi thả chuột
      updateHtmlItem(item.id, () => ({ x: finalX, y: finalY }));
    };

    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  };

  // Kéo góc dưới phải để phóng to/thu nhỏ khối hình mượt mà
  const handleStartResizeItem = (e: React.PointerEvent, item: BoardHtmlItem) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedHtmlItemId(item.id);

    const itemEl = (e.target as HTMLElement).closest(
      `[data-board-item-id="${item.id}"]`
    ) as HTMLElement | null;
    const startX = e.clientX;
    const startY = e.clientY;
    const initialScale = item.scale ?? 1;
    const rotate = item.rotate ?? 0;
    const flipH = item.flipH ?? false;
    const flipV = item.flipV ?? false;
    let finalScale = initialScale;

    if (itemEl) {
      itemEl.style.transition = 'none';
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {}
    }

    let rafId: number | null = null;

    const onPointerMove = (moveEvent: PointerEvent) => {
      moveEvent.preventDefault();
      const delta = (moveEvent.clientX - startX + (moveEvent.clientY - startY)) / 250;
      finalScale = Math.max(0.3, Math.min(3.0, Number((initialScale + delta).toFixed(2))));

      if (itemEl) {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          itemEl.style.transform = `rotate(${rotate}deg) scale(${finalScale}) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`;
        });
      }
    };

    const onPointerUp = (upEvent: PointerEvent) => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);

      if (itemEl) {
        try {
          (e.currentTarget as HTMLElement).releasePointerCapture(upEvent.pointerId);
        } catch {}
        itemEl.style.transition = '';
      }

      updateHtmlItem(item.id, () => ({ scale: finalScale }));
    };

    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  };

  // Phóng to / thu nhỏ nhanh bằng nút bấm
  const handleZoomItem = (itemId: string, delta: number) => {
    updateHtmlItem(itemId, (it) => {
      const current = it.scale ?? 1;
      const nextScale = Math.max(0.3, Math.min(3.0, Number((current + delta).toFixed(2))));
      return { scale: nextScale };
    });
  };

  // Đặt lại tỉ lệ 100%
  const handleResetScaleItem = (itemId: string) => {
    updateHtmlItem(itemId, () => ({ scale: 1 }));
  };

  // Xoay 90° theo chiều kim đồng hồ
  const handleRotateItem = (itemId: string) => {
    updateHtmlItem(itemId, (it) => ({
      rotate: ((it.rotate ?? 0) + 90) % 360,
    }));
  };

  // Lật đối xứng theo chiều ngang (Trái ↔ Phải)
  const handleFlipHItem = (itemId: string) => {
    updateHtmlItem(itemId, (it) => ({
      flipH: !it.flipH,
    }));
  };

  // Lật đối xứng theo chiều dọc (Trên ↕ Dưới)
  const handleFlipVItem = (itemId: string) => {
    updateHtmlItem(itemId, (it) => ({
      flipV: !it.flipV,
    }));
  };

  // Xóa một khối nội dung đã chèn trên bảng
  const handleDeleteHtmlItem = (itemId: string) => {
    const updatedItems = (board.htmlItems || []).filter((it) => it.id !== itemId);
    if (selectedHtmlItemId === itemId) {
      setSelectedHtmlItemId(null);
    }
    onUpdate({
      ...board,
      htmlItems: updatedItems,
    });
  };

  // Tính vị trí mặc định cho đối tượng chèn tiếp theo nằm bên dưới đối tượng trước đó
  const calculateNextItemPosition = (itemType: string): { x: number; y: number } => {
    const existing = board.htmlItems || [];
    const mathExisting = board.mathItems || [];
    if (existing.length === 0 && mathExisting.length === 0) {
      return { x: 24, y: 20 };
    }
    let maxBottom = 0;
    for (const it of existing) {
      const itemH =
        it.type === 'graph' ? 300 :
        it.type === 'bbt' ? 200 :
        it.type === 'table' ? 200 :
        it.type === 'image' ? 280 :
        it.type === 'math' ? 90 : 240;
      const bottom = (it.y ?? 20) + itemH;
      if (bottom > maxBottom) {
        maxBottom = bottom;
      }
    }
    for (const m of mathExisting) {
      const bottom = (m.y ?? 30) + 90;
      if (bottom > maxBottom) {
        maxBottom = bottom;
      }
    }
    return { x: 24, y: maxBottom + 24 };
  };

  // Chèn nhanh bảng số liệu vào khoảng trống
  const handleQuickInsertTable = (rows: number = 3, cols: number = 3) => {
    let headers = '';
    for (let c = 1; c <= cols; c++) {
      headers += `<th style="border: 1px solid #cbd5e1; padding: 6px 12px; font-weight: bold; background: #f8fafc; text-align: center;">Cột ${c}</th>`;
    }
    let bodyRows = '';
    for (let r = 1; r <= rows; r++) {
      let cells = '';
      for (let c = 1; c <= cols; c++) {
        cells += `<td style="border: 1px solid #cbd5e1; padding: 6px 12px; text-align: center;" contenteditable="true">...</td>`;
      }
      bodyRows += `<tr>${cells}</tr>`;
    }
    const tableHtml = `
      <div class="word-table-wrapper my-1 overflow-x-auto">
        <table style="width: 100%; border-collapse: collapse; border: 1.5px solid #94a3b8; font-size: 13px; text-align: center; margin: 0 auto; background: white;">
          <thead>
            <tr>${headers}</tr>
          </thead>
          <tbody>
            ${bodyRows}
          </tbody>
        </table>
      </div>
    `;
    const { x: itemX, y: itemY } = calculateNextItemPosition('table');
    const newItem: BoardHtmlItem = {
      id: `table-${Date.now()}`,
      type: 'table',
      title: `Bảng ${rows}x${cols}`,
      html: tableHtml,
      x: itemX,
      y: itemY,
      width: 440,
      scale: 1,
      rotate: 0,
      flipH: false,
      flipV: false,
      createdAt: Date.now(),
    };
    const newItems = [...(board.htmlItems || []), newItem];
    onUpdate({
      ...board,
      htmlItems: newItems,
    });
  };

  // Xử lý chọn ảnh máy tính nhanh
  const handleLocalImageSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      const src = loadEvt.target?.result as string;
      const imgHtml = `
        <div style="text-align: center; margin: 8px 0;">
          <img src="${src}" alt="${file.name}" style="max-width: 100%; max-height: 480px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); margin: 0 auto; display: inline-block;" />
        </div>
      `;
      const { x: itemX, y: itemY } = calculateNextItemPosition('image');
      const newItem: BoardHtmlItem = {
        id: `img-${Date.now()}`,
        type: 'image',
        title: file.name,
        html: imgHtml,
        x: itemX,
        y: itemY,
        width: 400,
        scale: 1,
        rotate: 0,
        flipH: false,
        flipV: false,
        createdAt: Date.now(),
      };
      const newItems = [...(board.htmlItems || []), newItem];
      onUpdate({
        ...board,
        htmlItems: newItems,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Chèn nhanh đồ thị trực quan (SVG Oxy)
  const handleQuickInsertGraph = (type: 'parabola' | 'cubic' = 'parabola') => {
    const isParabola = type === 'parabola';
    const formulaStr = isParabola ? 'y = x^2 - 2x' : 'y = x^3 - 3x';
    const pathD = isParabola
      ? 'M 20 40 Q 150 260 280 40'
      : 'M 30 240 C 90 20, 120 20, 150 140 C 180 260, 210 260, 270 40';
    const svgHtml = `
      <div class="word-graph-wrapper my-1 flex flex-col items-center justify-center p-1 bg-transparent">
        <div class="font-bold text-xs text-indigo-700 mb-1 font-mono">${formulaStr}</div>
        <svg viewBox="0 0 300 280" class="w-full max-w-[320px] h-auto bg-transparent">
          <line x1="20" y1="140" x2="280" y2="140" stroke="#64748b" stroke-width="1.5" />
          <line x1="150" y1="260" x2="150" y2="20" stroke="#64748b" stroke-width="1.5" />
          <text x="275" y="132" font-size="11" font-weight="bold" fill="#334155">x</text>
          <text x="156" y="28" font-size="11" font-weight="bold" fill="#334155">y</text>
          <text x="138" y="154" font-size="11" font-weight="bold" fill="#334155">O</text>
          <path d="${pathD}" fill="none" stroke="#2563eb" stroke-width="2.5" stroke-linecap="round" />
        </svg>
      </div>
    `;
    const { x: itemX, y: itemY } = calculateNextItemPosition('graph');
    const newItem: BoardHtmlItem = {
      id: `graph-${Date.now()}`,
      type: 'graph',
      title: `Đồ thị ${formulaStr}`,
      html: svgHtml,
      x: itemX,
      y: itemY,
      width: 380,
      scale: 1,
      rotate: 0,
      flipH: false,
      flipV: false,
      createdAt: Date.now(),
    };
    const newItems = [...(board.htmlItems || []), newItem];
    onUpdate({
      ...board,
      htmlItems: newItems,
    });
  };

  // Chèn nhanh Bảng biến thiên trực quan
  const handleQuickInsertBbt = () => {
    let katexMinusInf = '-\\infty';
    let katexPlusInf = '+\\infty';
    try {
      katexMinusInf = katex.renderToString('-\\infty', { throwOnError: false });
      katexPlusInf = katex.renderToString('+\\infty', { throwOnError: false });
    } catch {}
    const bbtHtml = `
      <div class="word-bbt-wrapper my-1 overflow-x-auto p-1 bg-transparent">
        <div class="font-bold text-xs text-amber-700 mb-1.5 font-mono text-center">Bảng biến thiên y = x^3 - 3x</div>
        <table style="border-collapse: collapse; border: 1.5px solid #1e293b; font-family: serif; font-size: 13px; margin: 0 auto; width: 100%; min-width: 320px;">
          <thead>
            <tr style="background: #f8fafc;">
              <th style="padding: 6px 12px; border-right: 1.5px solid #1e293b; border-bottom: 1.5px solid #1e293b; font-style: italic; width: 45px; text-align: center;">x</th>
              <th style="padding: 6px 12px; border-bottom: 1.5px solid #1e293b; text-align: center;">${katexMinusInf}</th>
              <th style="padding: 6px 12px; border-bottom: 1.5px solid #1e293b; text-align: center;">-1</th>
              <th style="padding: 6px 12px; border-bottom: 1.5px solid #1e293b; text-align: center;">1</th>
              <th style="padding: 6px 12px; border-bottom: 1.5px solid #1e293b; text-align: center;">${katexPlusInf}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding: 6px 12px; border-right: 1.5px solid #1e293b; border-bottom: 1.5px solid #1e293b; font-style: italic; text-align: center; font-weight: bold;">y'</td>
              <td style="padding: 6px 8px; text-align: center; border-bottom: 1.5px solid #1e293b; font-weight: bold;">+</td>
              <td style="padding: 6px 8px; text-align: center; border-bottom: 1.5px solid #1e293b; font-weight: bold;">0</td>
              <td style="padding: 6px 8px; text-align: center; border-bottom: 1.5px solid #1e293b; font-weight: bold;">-</td>
              <td style="padding: 6px 8px; text-align: center; border-bottom: 1.5px solid #1e293b; font-weight: bold;">+</td>
            </tr>
            <tr>
              <td style="padding: 6px 12px; border-right: 1.5px solid #1e293b; font-style: italic; text-align: center; font-weight: bold;">y</td>
              <td colspan="4" style="padding: 8px 12px; text-align: center;">
                <svg viewBox="0 0 320 80" class="w-full max-w-[340px] h-16 mx-auto">
                  <path d="M 20 65 L 100 18 L 220 65 L 300 18" fill="none" stroke="#0f172a" stroke-width="1.8" />
                  <polygon points="100,18 92,23 96,28" fill="#0f172a" />
                  <polygon points="220,65 212,60 216,55" fill="#0f172a" />
                  <polygon points="300,18 292,23 296,28" fill="#0f172a" />
                  <text x="100" y="14" font-size="11" font-weight="bold" text-anchor="middle" fill="#0f172a">2</text>
                  <text x="220" y="78" font-size="11" font-weight="bold" text-anchor="middle" fill="#0f172a">-2</text>
                </svg>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
    const { x: itemX, y: itemY } = calculateNextItemPosition('bbt');
    const newItem: BoardHtmlItem = {
      id: `bbt-${Date.now()}`,
      type: 'bbt',
      title: 'Bảng biến thiên hàm bậc 3',
      html: bbtHtml,
      x: itemX,
      y: itemY,
      width: 460,
      scale: 1,
      rotate: 0,
      flipH: false,
      flipV: false,
      createdAt: Date.now(),
    };
    const newItems = [...(board.htmlItems || []), newItem];
    onUpdate({
      ...board,
      htmlItems: newItems,
    });
  };

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

    // Canvas hoàn toàn trong suốt để các khối HTML (Bảng, Đồ thị, BBT, Hình ảnh) hiển thị rõ nét bên dưới
    ctx.clearRect(0, 0, w, h);

    // Kẻ lưới ô ly mờ chuẩn NoteRenderer / vở ô ly toán học
    const gridSize = 28;
    ctx.lineWidth = 1;
    ctx.strokeStyle =
      board.theme === 'green'
        ? 'rgba(255, 255, 255, 0.08)'
        : board.theme === 'black'
        ? 'rgba(255, 255, 255, 0.07)'
        : 'rgba(226, 232, 240, 0.7)';

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

      if (stroke.isEraser) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = stroke.width;
      } else {
        const pType = stroke.penType || 'ballpoint';
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = stroke.color;

        if (pType === 'highlighter') {
          ctx.globalAlpha = stroke.opacity ?? 0.38;
          ctx.lineCap = 'square';
          ctx.lineJoin = 'bevel';
          ctx.lineWidth = stroke.width || 20;
        } else if (pType === 'brush') {
          ctx.globalAlpha = stroke.opacity ?? 0.95;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.lineWidth = stroke.width || 6;
        } else if (pType === 'fountain') {
          // Bút máy: Ngòi mài mực đậm đà, sắc sảo nét thanh nét đậm chuẩn xác
          ctx.globalAlpha = stroke.opacity ?? 1.0;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.lineWidth = stroke.width || 2.8;
        } else if (pType === 'pencil') {
          ctx.globalAlpha = stroke.opacity ?? 0.65;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.lineWidth = stroke.width || 1.4;
        } else {
          // Bút bi
          ctx.globalAlpha = stroke.opacity ?? 1.0;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.lineWidth = stroke.width || 2.2;
        }
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
          ctx.fillStyle = stroke.isEraser ? '#000000' : stroke.color;
          ctx.fill();
        } else {
          renderCatmullRomBezierPath(ctx, stroke.points);
          ctx.stroke();
        }
      }
      ctx.restore();
    });
  }, [board.theme, board.strokes]);

  // Đồng bộ kích thước canvas với chiều cao khoảng trống do giáo viên thiết lập
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    const targetWidth = Math.max(300, Math.floor(parent?.clientWidth || 800));
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
    if (activeTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = strokeWidth * 3.5;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = selectedColor;

      if (selectedPenType === 'highlighter') {
        ctx.globalAlpha = 0.38;
        ctx.lineCap = 'square';
        ctx.lineJoin = 'bevel';
        ctx.lineWidth = strokeWidth || 20;
      } else if (selectedPenType === 'brush') {
        ctx.globalAlpha = 0.95;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = strokeWidth || 6;
      } else if (selectedPenType === 'fountain') {
        ctx.globalAlpha = 1.0;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = strokeWidth || 2.8;
      } else if (selectedPenType === 'pencil') {
        ctx.globalAlpha = 0.65;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = strokeWidth || 1.4;
      } else if (selectedPenType === 'laser') {
        ctx.globalAlpha = 0.95;
        ctx.shadowColor = selectedColor;
        ctx.shadowBlur = 12;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = strokeWidth || 5;
      } else {
        // Bút bi
        ctx.globalAlpha = 1.0;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = strokeWidth || 2.2;
      }
    }

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

    // Nếu là Bút laser: vệt sáng tự tan biến sau 900ms, không lưu vào strokes
    if (selectedPenType === 'laser' && activeTool !== 'eraser') {
      setTimeout(() => {
        currentPointsRef.current = [];
        redraw();
      }, 900);
      return;
    }

    // Nét vẽ tự do: Lọc rung tay -> Tái lấy mẫu -> Làm mượt Gaussian đa tầng
    let finalPoints = rawPoints;
    if (activeTool !== 'eraser' && rawPoints.length > 3) {
      const filtered = filterClosePoints(rawPoints, selectedPenType === 'highlighter' ? 5.0 : 3.0);
      const resampled = resampleCurveEvenly(filtered, selectedPenType === 'highlighter' ? 8.0 : 5.5);
      finalPoints = smoothPointsGaussian(resampled, 3);
    }

    const newStroke: BoardStroke = {
      points: finalPoints,
      color: selectedColor,
      width: activeTool === 'eraser' ? strokeWidth * 3.5 : strokeWidth,
      penType: selectedPenType,
      opacity:
        selectedPenType === 'highlighter'
          ? 0.38
          : selectedPenType === 'pencil'
          ? 0.65
          : selectedPenType === 'brush'
          ? 0.95
          : 1.0,
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
    const { x: itemX, y: itemY } = calculateNextItemPosition('math');
    const newMathItem: BoardMathItem = {
      id: `math-${Date.now()}`,
      latex: latexInput.trim(),
      x: itemX,
      y: itemY,
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
    let finalHeight = startHeight;

    const resizerEl = e.currentTarget as HTMLElement;
    try {
      resizerEl.setPointerCapture(e.pointerId);
    } catch {}

    const boardInner = containerRef.current?.querySelector('.ppt-board-inner') as HTMLElement | null;
    const badgeEl = containerRef.current?.querySelector('.ppt-board-height-badge') as HTMLElement | null;

    let rafId: number | null = null;

    const onPointerMove = (moveEvent: PointerEvent) => {
      moveEvent.preventDefault();
      const deltaY = moveEvent.clientY - startY;
      finalHeight = Math.max(40, Math.min(1600, startHeight + deltaY));

      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        if (boardInner) {
          boardInner.style.height = `${finalHeight}px`;
        }
        if (badgeEl) {
          badgeEl.textContent = `${finalHeight}px`;
        }
      });
    };

    const onPointerUp = (upEvent: PointerEvent) => {
      if (rafId) cancelAnimationFrame(rafId);
      upEvent.preventDefault();
      setIsResizing(false);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);

      try {
        resizerEl.releasePointerCapture(upEvent.pointerId);
      } catch {}

      const deltaY = upEvent.clientY - startY;
      if (startHeight + deltaY < 50) {
        onDelete(board.id);
      } else {
        onUpdate({
          ...board,
          height: finalHeight,
        });
      }
    };

    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  };

  return (
    <div
      ref={containerRef}
      className={`group relative my-2 bg-transparent select-none transition-all no-slide-advance rounded-2xl ${
        isActive ? 'ring-2 ring-indigo-500 shadow-md' : ''
      }`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.(board.id);
      }}
    >
      {/* ẨN INPUT CHỌN ẢNH TỪ MÁY TÍNH */}
      <input
        type="file"
        ref={localImageInputRef}
        onChange={handleLocalImageSelected}
        accept="image/*"
        className="hidden"
      />





      {/* VÙNG CHỨA NỘI DUNG VÀ CANVAS CỦA KHOẢNG TRỐNG */}
      <div
        className={`ppt-board-inner relative w-full overflow-hidden rounded-xl border border-slate-200/90 shadow-2xs ${
          activeTool === 'pen' || activeTool === 'eraser' ? 'cursor-crosshair' : 'cursor-default'
        }`}
        style={{
          height: `${board.height || 280}px`,
          backgroundColor:
            board.theme === 'green' ? '#0f382c' : board.theme === 'black' ? '#18181b' : '#ffffff',
          backgroundImage:
            board.theme === 'green'
              ? 'radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)'
              : board.theme === 'black'
              ? 'radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)'
              : 'radial-gradient(circle, #cbd5e1 0.75px, transparent 0.75px)',
          backgroundSize: '24px 24px',
        }}
      >
        {/* LỚP 1: CÁC KHỐI NỘI DUNG CHÈN VÀO (BẢNG, HÌNH ẢNH, CÔNG THỨC, ĐỒ THỊ, BẢNG BIẾN THIÊN) */}
        {/* Hỗ trợ đầy đủ: Thay đổi vị trí, phóng to/thu nhỏ, xoay hình, lật hình, viết tay trực tiếp lên trên */}
        {board.htmlItems &&
          board.htmlItems.map((item, idx) => {
            const isSelected = selectedHtmlItemId === item.id;
            const itemX = item.x ?? (24 + ((idx * 30) % 200));
            const itemY = item.y ?? (20 + ((idx * 25) % 150));
            const scale = item.scale ?? 1;
            const rotate = item.rotate ?? 0;
            const flipH = item.flipH ?? false;
            const flipV = item.flipV ?? false;

            return (
              <div
                key={item.id}
                data-board-item-id={item.id}
                style={{
                  position: 'absolute',
                  left: `${itemX}px`,
                  top: `${itemY}px`,
                  width: item.width
                    ? `${item.width}px`
                    : item.type === 'image' || item.type === 'graph'
                    ? '400px'
                    : item.type === 'bbt'
                    ? '460px'
                    : item.type === 'table'
                    ? '440px'
                    : '360px',
                  maxWidth: '96%',
                  transform: `rotate(${rotate}deg) scale(${scale}) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`,
                  transformOrigin: 'center center',
                  zIndex: isSelected ? 28 : 12,
                }}
                className="group/item select-none bg-transparent p-0 pointer-events-auto border-none shadow-none cursor-move"
                onPointerDown={(e) => {
                  const target = e.target as HTMLElement;
                  // Nếu bấm vào các nút thao tác tương tác (button, input, select, textarea, a) thì để nút xử lý
                  if (target.closest('button, input, select, textarea, a')) {
                    return;
                  }
                  // Nếu bấm vào góc kéo co giãn đồ thị
                  if (target.closest('.graph-resize-handle, .bbt-resize-handle')) {
                    handleStartResizeItem(e, item);
                    return;
                  }
                  // Mặc định chọn đối tượng là kéo đi được ngay
                  handleStartDragItem(e, item);
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedHtmlItemId(item.id);

                  const target = e.target as HTMLElement;

                  // 1. Nút Xóa đồ thị / BBT / mục (✕)
                  if (target.closest('.delete-graph-btn, .delete-bbt-btn')) {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDeleteHtmlItem(item.id);
                    return;
                  }

                  // 2. Nút co giãn nhanh (-10% / +10%)
                  const sizeBtn = target.closest('.graph-size-btn, .bbt-size-btn') as HTMLElement | null;
                  if (sizeBtn) {
                    e.preventDefault();
                    e.stopPropagation();
                    const action = sizeBtn.getAttribute('data-size-action');
                    const deltaScale = action === 'increase' ? 0.1 : -0.1;
                    handleZoomItem(item.id, deltaScale);
                    return;
                  }

                  // 3. Nút Sửa đồ thị (✏️ Sửa đồ thị / ✏️ Sửa hàm)
                  if (target.closest('.edit-graph-btn')) {
                    e.preventDefault();
                    e.stopPropagation();
                    const wrapper = target.closest('.word-graph-wrapper');
                    if (wrapper) {
                      const formula = decodeURIComponent(wrapper.getAttribute('data-formula') || 'y = x^2 - 1');
                      const xmin = wrapper.getAttribute('data-xmin') || '-2';
                      const xmax = wrapper.getAttribute('data-xmax') || '2';
                      const ymin = wrapper.getAttribute('data-ymin') || '-2';
                      const ymax = wrapper.getAttribute('data-ymax') || '4';
                      const unitx = wrapper.getAttribute('data-unitx') || '1';
                      const unity = wrapper.getAttribute('data-unity') || '1';
                      const showAxis = wrapper.getAttribute('data-show-axis-labels');
                      const showOrigin = wrapper.getAttribute('data-show-origin-label');
                      const showExtrema = wrapper.getAttribute('data-show-extrema-labels');
                      const req = decodeURIComponent(wrapper.getAttribute('data-req') || '');
                      const graphId = wrapper.getAttribute('data-graph-id') || item.id;

                      window.dispatchEvent(
                        new CustomEvent('app-edit-ppt-graph', {
                          detail: {
                            graphId,
                            formula,
                            xmin,
                            xmax,
                            ymin,
                            ymax,
                            unitx,
                            unity,
                            showAxis: showAxis !== 'false',
                            showOrigin: showOrigin !== 'false',
                            showExtrema: showExtrema !== 'false',
                            req,
                          },
                        })
                      );
                    }
                    return;
                  }

                  // 4. Nút Sửa BBT (✏️ Sửa BBT)
                  if (target.closest('.edit-bbt-btn')) {
                    e.preventDefault();
                    e.stopPropagation();
                    const wrapper = target.closest('.word-bbt-wrapper');
                    if (wrapper) {
                      const formula = decodeURIComponent(wrapper.getAttribute('data-formula') || '');
                      const xpoints = decodeURIComponent(wrapper.getAttribute('data-xpoints') || '');
                      const yprimes = decodeURIComponent(wrapper.getAttribute('data-yprimesigns') || '');
                      const yvalues = decodeURIComponent(wrapper.getAttribute('data-yvalues') || '');
                      const mode = wrapper.getAttribute('data-mode') || 'manual';
                      const bbtId = wrapper.getAttribute('data-bbt-id') || item.id;
                      const varname = decodeURIComponent(wrapper.getAttribute('data-varname') || 'x');
                      const funcrow = decodeURIComponent(wrapper.getAttribute('data-funcrow') || 'y');
                      const derivrow = decodeURIComponent(wrapper.getAttribute('data-derivrow') || "y'");

                      window.dispatchEvent(
                        new CustomEvent('app-edit-ppt-bbt', {
                          detail: {
                            bbtId,
                            formula,
                            xpoints,
                            yprimes,
                            yvalues,
                            mode,
                            varname,
                            funcrow,
                            derivrow,
                          },
                        })
                      );
                    }
                    return;
                  }
                }}
              >
                {/* THANH ĐIỀU KHIỂN TÁC VỤ CHO HÌNH ẢNH / BẢNG / CÔNG THỨC: CHỈ HIỆN KHI RÊ CHUỘT VÀO KHU VỰC, BỎ NÚT DI CHUYỂN */}
                {(item.type === 'image' || item.type === 'table' || item.type === 'math') && (
                  <div
                    className="absolute -top-8 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-white/95 backdrop-blur-xs rounded-full shadow-md border border-slate-200 px-2.5 py-1 text-xs z-30 select-none opacity-0 group-hover/item:opacity-100 transition-opacity duration-200 pointer-events-none group-hover/item:pointer-events-auto"
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => handleZoomItem(item.id, -0.15)}
                      className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-full cursor-pointer transition-colors"
                      title="Thu nhỏ (-15%)"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleZoomItem(item.id, 0.15)}
                      className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-full cursor-pointer transition-colors"
                      title="Phóng to (+15%)"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                    {item.type !== 'math' && (
                      <>
                        <div className="w-[1px] h-3 bg-slate-200 mx-0.5"></div>
                        <button
                          type="button"
                          onClick={() => handleRotateItem(item.id)}
                          className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-full cursor-pointer transition-colors"
                          title="Xoay 90°"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleFlipHItem(item.id)}
                          className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-full cursor-pointer transition-colors"
                          title="Lật ngang"
                        >
                          <FlipHorizontal className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleFlipVItem(item.id)}
                          className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-full cursor-pointer transition-colors"
                          title="Lật dọc"
                        >
                          <FlipVertical className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                    <div className="w-[1px] h-3 bg-slate-200 mx-0.5"></div>
                    <button
                      type="button"
                      onClick={() => handleDeleteHtmlItem(item.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full cursor-pointer transition-colors"
                      title="Xóa mục này"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* 2. NỘI DUNG HTML CỦA KHỐI (NỀN TRONG SUỐT, KHÔNG KHUNG BAO NGOÀI, CHO PHÉP VIẾT TAY TRỰC TIẾP LÊN ĐÓ) */}
                <div
                  className="w-full overflow-hidden select-none text-slate-900 pointer-events-auto bg-transparent"
                  dangerouslySetInnerHTML={{ __html: item.html }}
                />
              </div>
            );
          })}

        {/* LỚP 2: CANVAS VẼ TAY MỰC KỸ THUẬT SỐ NẰM TRÊN CÙNG ĐỂ VIẾT LÊN BẢNG / GHI CHÚ */}
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className={`absolute inset-0 w-full h-full block z-20 ${
            activeTool === 'pen' || activeTool === 'eraser'
              ? 'pointer-events-auto cursor-crosshair'
              : 'pointer-events-none'
          }`}
          style={{ touchAction: 'none' }}
        />

        {/* Các thẻ công thức Toán học KaTeX được chèn trên bảng (nếu có) */}
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
                data-math-item-id={item.id}
                onPointerDown={(e) => {
                  const target = e.target as HTMLElement;
                  if (target.closest('button')) return;
                  e.preventDefault();
                  e.stopPropagation();

                  const mathEl = e.currentTarget as HTMLElement;
                  mathEl.style.transition = 'none';
                  try {
                    mathEl.setPointerCapture(e.pointerId);
                  } catch {}

                  const startX = e.clientX;
                  const startY = e.clientY;
                  const initialX = item.x ?? 30;
                  const initialY = item.y ?? 30;
                  let finalX = initialX;
                  let finalY = initialY;
                  let rafId: number | null = null;

                  const onPointerMove = (mv: PointerEvent) => {
                    mv.preventDefault();
                    finalX = Math.max(0, initialX + (mv.clientX - startX));
                    finalY = Math.max(0, initialY + (mv.clientY - startY));

                    if (rafId) cancelAnimationFrame(rafId);
                    rafId = requestAnimationFrame(() => {
                      mathEl.style.left = `${finalX}px`;
                      mathEl.style.top = `${finalY}px`;
                    });
                  };

                  const onPointerUp = (upEvt: PointerEvent) => {
                    if (rafId) cancelAnimationFrame(rafId);
                    window.removeEventListener('pointermove', onPointerMove);
                    window.removeEventListener('pointerup', onPointerUp);
                    window.removeEventListener('pointercancel', onPointerUp);

                    try {
                      mathEl.releasePointerCapture(upEvt.pointerId);
                    } catch {}
                    mathEl.style.transition = '';

                    onUpdate({
                      ...board,
                      mathItems: (board.mathItems || []).map((m) =>
                        m.id === item.id ? { ...m, x: finalX, y: finalY } : m
                      ),
                    });
                  };

                  window.addEventListener('pointermove', onPointerMove, { passive: false });
                  window.addEventListener('pointerup', onPointerUp);
                  window.addEventListener('pointercancel', onPointerUp);
                }}
                className="absolute z-25 group/math p-1 rounded-md bg-transparent border border-transparent hover:border-indigo-400/30 cursor-move flex items-center gap-1.5 select-none"
                style={{ left: `${item.x}px`, top: `${item.y}px` }}
              >
                <div dangerouslySetInnerHTML={{ __html: mathHtml }} />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveMathItem(item.id);
                  }}
                  className="opacity-0 group-hover/math:opacity-100 text-rose-500 hover:text-rose-700 p-0.5 rounded cursor-pointer transition-opacity"
                  title="Gỡ công thức này"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
      </div>

      {/* VIỀN CO GIÃN KHI RÊ CHUỘT GẦN VIỀN DƯỚI (NOTERENDERER HOVER RESIZE BORDER) */}
      <div
        onPointerDown={handleStartResizeDrag}
        className="w-full h-5 -mt-2.5 relative z-30 cursor-ns-resize group/resizer flex items-center justify-center select-none"
        title="Đưa chuột vào đây và kéo xuống để mở rộng • kéo lên để thu hẹp (NoteRenderer)"
      >
        {/* Đường viền ngang: bình thường vô hình, chỉ hiện khi đưa chuột vào gần viền dưới hoặc đang kéo */}
        <div
          className={`w-full transition-all duration-150 flex items-center justify-center ${
            isResizing
              ? 'h-1 bg-indigo-600 shadow-md'
              : 'h-[2px] bg-transparent group-hover/resizer:bg-indigo-400 group-hover/resizer:h-1'
          }`}
        >
          {/* Nút tay cầm nhỏ ở chính giữa xuất hiện khi hover gần viền dưới hoặc đang kéo */}
          <div
            className={`transition-all duration-150 -translate-y-1/2 flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-indigo-600 text-white text-[11px] font-bold shadow-lg border border-white ${
              isResizing ? 'opacity-100 scale-105' : 'opacity-0 group-hover/resizer:opacity-100'
            }`}
          >
            <GripHorizontal className="w-3.5 h-3.5 text-white" />
            <span>Kéo co giãn</span>
            <span className="ppt-board-height-badge text-[10px] bg-indigo-800/90 px-1.5 py-0.2 rounded font-mono font-semibold">
              {board.height}px
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (
                  (board.strokes.length === 0 && (!board.htmlItems || board.htmlItems.length === 0)) ||
                  window.confirm('Xóa bỏ khoảng trống này?')
                ) {
                  onDelete(board.id);
                }
              }}
              className="ml-1 hover:bg-rose-600 p-0.5 rounded-full transition-colors cursor-pointer text-white/80 hover:text-white"
              title="Xóa bỏ khoảng trống này"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
