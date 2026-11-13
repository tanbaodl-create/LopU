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
  Table,
  Image as ImageIcon,
  TrendingUp,
  BarChart3,
  MousePointer,
  Plus,
} from 'lucide-react';

export type BoardTheme = 'white' | 'green' | 'black';

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
  createdAt?: number;
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
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const localImageInputRef = useRef<HTMLInputElement | null>(null);

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

  // Xóa một khối nội dung đã chèn trên bảng
  const handleDeleteHtmlItem = (itemId: string) => {
    const updatedItems = (board.htmlItems || []).filter((it) => it.id !== itemId);
    onUpdate({
      ...board,
      htmlItems: updatedItems,
    });
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
    const newItem: BoardHtmlItem = {
      id: `table-${Date.now()}`,
      type: 'table',
      title: `Bảng ${rows}x${cols}`,
      html: tableHtml,
      createdAt: Date.now(),
    };
    const newItems = [...(board.htmlItems || []), newItem];
    const newHeight = Math.max(board.height, 320 + newItems.length * 120);
    onUpdate({
      ...board,
      height: newHeight,
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
      const newItem: BoardHtmlItem = {
        id: `img-${Date.now()}`,
        type: 'image',
        title: file.name,
        html: imgHtml,
        createdAt: Date.now(),
      };
      const newItems = [...(board.htmlItems || []), newItem];
      const newHeight = Math.max(board.height, 360 + newItems.length * 150);
      onUpdate({
        ...board,
        height: newHeight,
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
      <div class="word-graph-wrapper my-1 flex flex-col items-center justify-center p-3 bg-white rounded-xl border border-slate-200">
        <div class="font-bold text-xs text-indigo-700 mb-1 font-mono">${formulaStr}</div>
        <svg viewBox="0 0 300 280" class="w-full max-w-[320px] h-auto bg-slate-50/50 rounded-lg border border-slate-100">
          <line x1="20" y1="140" x2="280" y2="140" stroke="#64748b" stroke-width="1.5" />
          <line x1="150" y1="260" x2="150" y2="20" stroke="#64748b" stroke-width="1.5" />
          <text x="275" y="132" font-size="11" font-weight="bold" fill="#334155">x</text>
          <text x="156" y="28" font-size="11" font-weight="bold" fill="#334155">y</text>
          <text x="138" y="154" font-size="11" font-weight="bold" fill="#334155">O</text>
          <path d="${pathD}" fill="none" stroke="#2563eb" stroke-width="2.5" stroke-linecap="round" />
        </svg>
      </div>
    `;
    const newItem: BoardHtmlItem = {
      id: `graph-${Date.now()}`,
      type: 'graph',
      title: `Đồ thị ${formulaStr}`,
      html: svgHtml,
      createdAt: Date.now(),
    };
    const newItems = [...(board.htmlItems || []), newItem];
    const newHeight = Math.max(board.height, 380 + newItems.length * 150);
    onUpdate({
      ...board,
      height: newHeight,
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
      <div class="word-bbt-wrapper my-1 overflow-x-auto p-3 bg-white rounded-xl border border-slate-200">
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
    const newItem: BoardHtmlItem = {
      id: `bbt-${Date.now()}`,
      type: 'bbt',
      title: 'Bảng biến thiên hàm bậc 3',
      html: bbtHtml,
      createdAt: Date.now(),
    };
    const newItems = [...(board.htmlItems || []), newItem];
    const newHeight = Math.max(board.height, 380 + newItems.length * 150);
    onUpdate({
      ...board,
      height: newHeight,
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
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = stroke.width;

      if (stroke.isEraser) {
        ctx.globalCompositeOperation = 'destination-out';
      } else {
        ctx.globalCompositeOperation = 'source-over';
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

  // Đồng bộ kích thước canvas với chiều cao khoảng trống và các khối nội dung chèn vào
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const targetWidth = Math.max(300, Math.floor(rect.width));
    const targetHeight = Math.max(board.height || 280, container.offsetHeight);

    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      redraw();
    }
  }, [board.height, board.htmlItems, redraw]);

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
      ctx.lineWidth = strokeWidth * 3.5;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = selectedColor;
      ctx.lineWidth = strokeWidth;
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

      {/* BẢNG CÔNG CỤ NỔI NHẸ NHÀNG KHI RÊ CHUỘT VÀO KHOẢNG TRỐNG (HOVER MINI-TOOLBAR) */}
      <div className="absolute top-2 right-2 z-35 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center gap-1 bg-white/95 backdrop-blur-md px-2 py-1 rounded-xl shadow-md border border-slate-200 select-none">
        {/* Nút Chuột / Tương tác */}
        <button
          type="button"
          onClick={() => setActiveTool('select')}
          className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
            activeTool === 'select'
              ? 'bg-slate-800 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
          title="Chuột tương tác / Nhập liệu vào bảng"
        >
          <MousePointer className="w-3.5 h-3.5" />
          <span className="text-[11px] hidden sm:inline">Chuột</span>
        </button>

        {/* Nút Bút */}
        <button
          type="button"
          onClick={() => setActiveTool('pen')}
          className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
            activeTool === 'pen'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
          title="Bút viết tay mực kỹ thuật số"
        >
          <Pen className="w-3.5 h-3.5" />
          <span className="text-[11px]">Bút</span>
        </button>

        {/* Nút Tẩy */}
        <button
          type="button"
          onClick={() => setActiveTool('eraser')}
          className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
            activeTool === 'eraser'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
          title="Tẩy xóa nét vẽ"
        >
          <Eraser className="w-3.5 h-3.5" />
          <span className="text-[11px]">Tẩy</span>
        </button>

        {/* Bảng 3 màu cơ bản: Xanh, Đen, Đỏ */}
        <div className="flex items-center gap-1 px-1">
          {[
            { color: '#1d4ed8', label: 'Xanh' },
            { color: '#0f172a', label: 'Đen' },
            { color: '#dc2626', label: 'Đỏ' },
          ].map((c) => (
            <button
              key={c.color}
              type="button"
              onClick={() => {
                setSelectedColor(c.color);
                setActiveTool('pen');
              }}
              className={`w-3.5 h-3.5 rounded-full border transition-transform cursor-pointer ${
                selectedColor === c.color && activeTool === 'pen'
                  ? 'scale-125 border-indigo-700 ring-2 ring-indigo-300 shadow-xs'
                  : 'border-slate-300 opacity-80 hover:opacity-100 hover:scale-110'
              }`}
              style={{ backgroundColor: c.color }}
              title={c.label}
            />
          ))}
        </div>

        <div className="h-3.5 w-[1px] bg-slate-200 mx-0.5"></div>

        {/* CÁC NÚT CHÈN LÊN VÙNG KHOẢNG TRỐNG */}
        {/* 1. Chèn Bảng */}
        <button
          type="button"
          onClick={() => {
            onSelect?.(board.id);
            if (onOpenTableModal) {
              onOpenTableModal();
            } else {
              handleQuickInsertTable(3, 3);
            }
          }}
          className="p-1.5 rounded-lg text-indigo-700 bg-indigo-50 hover:bg-indigo-100 text-xs font-bold transition-all cursor-pointer flex items-center gap-1 border border-indigo-200 shadow-2xs"
          title="Chèn bảng vào khoảng trống này"
        >
          <Table className="w-3.5 h-3.5 text-indigo-600" />
          <span className="text-[11px]">Bảng</span>
        </button>

        {/* 2. Chèn Hình ảnh */}
        <button
          type="button"
          onClick={() => {
            onSelect?.(board.id);
            if (onOpenImagePicker) {
              onOpenImagePicker();
            } else {
              localImageInputRef.current?.click();
            }
          }}
          className="p-1.5 rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 text-xs font-bold transition-all cursor-pointer flex items-center gap-1 border border-emerald-200 shadow-2xs"
          title="Chèn hình ảnh từ máy tính vào khoảng trống này"
        >
          <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
          <span className="text-[11px]">Ảnh</span>
        </button>

        {/* 3. Chèn Công thức */}
        <button
          type="button"
          onClick={() => {
            onSelect?.(board.id);
            if (onOpenMathModal) {
              onOpenMathModal();
            } else {
              setShowMathPanel(true);
            }
          }}
          className="p-1.5 rounded-lg text-purple-700 bg-purple-50 hover:bg-purple-100 text-xs font-bold transition-all cursor-pointer flex items-center gap-1 border border-purple-200 shadow-2xs"
          title="Chèn công thức toán (KaTeX/LaTeX) vào khoảng trống này"
        >
          <Sigma className="w-3.5 h-3.5 text-purple-600" />
          <span className="text-[11px]">Công thức</span>
        </button>

        {/* 4. Chèn Đồ thị */}
        <button
          type="button"
          onClick={() => {
            onSelect?.(board.id);
            if (onOpenGraphModal) {
              onOpenGraphModal();
            } else {
              handleQuickInsertGraph('parabola');
            }
          }}
          className="p-1.5 rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100 text-xs font-bold transition-all cursor-pointer flex items-center gap-1 border border-blue-200 shadow-2xs"
          title="Chèn đồ thị hàm số vào khoảng trống này"
        >
          <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
          <span className="text-[11px]">Đồ thị</span>
        </button>

        {/* 5. Chèn Bảng biến thiên */}
        <button
          type="button"
          onClick={() => {
            onSelect?.(board.id);
            if (onOpenBbtModal) {
              onOpenBbtModal();
            } else {
              handleQuickInsertBbt();
            }
          }}
          className="p-1.5 rounded-lg text-amber-700 bg-amber-50 hover:bg-amber-100 text-xs font-bold transition-all cursor-pointer flex items-center gap-1 border border-amber-200 shadow-2xs"
          title="Chèn bảng biến thiên vào khoảng trống này"
        >
          <BarChart3 className="w-3.5 h-3.5 text-amber-600" />
          <span className="text-[11px]">BBT</span>
        </button>

        <div className="h-3.5 w-[1px] bg-slate-200 mx-0.5"></div>

        {/* Hoàn tác */}
        <button
          type="button"
          disabled={!canUndo}
          onClick={handleUndo}
          className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
          title="Hoàn tác nét vẽ (Undo)"
        >
          <Undo2 className="w-3.5 h-3.5" />
        </button>

        {/* Làm lại */}
        <button
          type="button"
          disabled={!canRedo}
          onClick={handleRedo}
          className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
          title="Làm lại (Redo)"
        >
          <Redo2 className="w-3.5 h-3.5" />
        </button>

        {/* Xóa sạch nét trên bảng */}
        <button
          type="button"
          onClick={handleClear}
          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
          title="Xóa toàn bộ nét vẽ và nội dung trong khoảng trống này"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>

        <div className="h-3.5 w-[1px] bg-slate-200 mx-0.5"></div>

        {/* Xóa / Đóng khoảng trống */}
        <button
          type="button"
          onClick={() => {
            if (
              (board.strokes.length === 0 && (!board.htmlItems || board.htmlItems.length === 0)) ||
              window.confirm('Xóa bỏ khoảng trống này?')
            ) {
              onDelete(board.id);
            }
          }}
          className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-rose-600 hover:text-white text-slate-600 font-bold text-[11px] transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
          title="Xóa bỏ khoảng trống này"
        >
          <X className="w-3 h-3" />
          <span>Xóa</span>
        </button>
      </div>

      {/* VÙNG CHỨA NỘI DUNG VÀ CANVAS CỦA KHOẢNG TRỐNG */}
      <div
        className={`relative w-full overflow-hidden transition-all rounded-xl border border-slate-200/90 shadow-2xs ${
          activeTool === 'pen' || activeTool === 'eraser' ? 'cursor-crosshair' : 'cursor-default'
        }`}
        style={{
          minHeight: `${board.height || 280}px`,
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
        {board.htmlItems && board.htmlItems.length > 0 && (
          <div className="relative z-10 w-full p-3.5 flex flex-col gap-3 pointer-events-auto">
            {board.htmlItems.map((item) => (
              <div
                key={item.id}
                className="relative group/item bg-white/95 rounded-xl border border-slate-200/90 shadow-xs p-3 transition-all"
              >
                {/* Thanh điều khiển nhỏ của từng khối */}
                <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-slate-100 text-xs select-none">
                  <div className="flex items-center gap-1.5 font-bold text-slate-700 text-[11px]">
                    {item.type === 'table' && <Table className="w-3.5 h-3.5 text-indigo-600" />}
                    {item.type === 'image' && <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />}
                    {item.type === 'math' && <Sigma className="w-3.5 h-3.5 text-purple-600" />}
                    {item.type === 'graph' && <TrendingUp className="w-3.5 h-3.5 text-blue-600" />}
                    {item.type === 'bbt' && <BarChart3 className="w-3.5 h-3.5 text-amber-600" />}
                    <span>
                      {item.title ||
                        (item.type === 'table'
                          ? 'Bảng số liệu'
                          : item.type === 'image'
                          ? 'Hình ảnh'
                          : item.type === 'graph'
                          ? 'Đồ thị'
                          : item.type === 'bbt'
                          ? 'Bảng biến thiên'
                          : 'Công thức toán')}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteHtmlItem(item.id);
                      }}
                      className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Gỡ khối này khỏi khoảng trống"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Render nội dung HTML */}
                <div
                  className="w-full overflow-x-auto select-text text-slate-900"
                  dangerouslySetInnerHTML={{ __html: item.html }}
                />
              </div>
            ))}
          </div>
        )}

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
                className="absolute z-25 group/math p-2 rounded-xl bg-white/95 border border-indigo-300 shadow-md backdrop-blur-xs flex items-center gap-1.5"
                style={{ left: `${item.x}px`, top: `${item.y}px` }}
              >
                <div dangerouslySetInnerHTML={{ __html: mathHtml }} />
                <button
                  type="button"
                  onClick={() => handleRemoveMathItem(item.id)}
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
            <span className="text-[10px] bg-indigo-800/90 px-1.5 py-0.2 rounded font-mono font-semibold">
              {board.height}px
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
