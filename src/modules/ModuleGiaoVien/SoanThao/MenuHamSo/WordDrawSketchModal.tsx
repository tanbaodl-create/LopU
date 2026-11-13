/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { PenTool, Eraser, Check, X, Sparkles, RotateCcw, Undo2, Redo2 } from 'lucide-react';
import { generateWordBbtHtml } from './bbtSolver';

export interface WordDrawSketchModalProps {
  isOpen: boolean;
  onClose: () => void;
  sketchType: 'graph' | 'bbt';
  onInsertSketchHtml: (html: string) => void;
  userFontSize?: string;
  isTeacher?: boolean;
}

export interface Point {
  x: number;
  y: number;
}

// 1. Lọc bỏ các điểm rung tay micro-jitter và quantization
export const filterClosePoints = (points: Point[], minDistance: number = 3.5): Point[] => {
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

// 2. Tái lấy mẫu đều theo chiều dài cung (Arc-length Resampling) triệt tiêu hoàn toàn sự gián đoạn do tốc độ kéo chuột/tay
export const resampleCurveEvenly = (points: Point[], stepSize: number = 6): Point[] => {
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
export const smoothPointsGaussian = (points: Point[], iterations: number = 4): Point[] => {
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
      const smoothX = 0.05 * pPrev2.x + 0.25 * pPrev1.x + 0.40 * pCur.x + 0.25 * pNext1.x + 0.05 * pNext2.x;
      const smoothY = 0.05 * pPrev2.y + 0.25 * pPrev1.y + 0.40 * pCur.y + 0.25 * pNext1.y + 0.05 * pNext2.y;

      smoothed.push({ x: smoothX, y: smoothY });
    }
    smoothed.push({ ...pts[pts.length - 1] });
    pts = smoothed;
  }

  return pts;
};

// 4. Chuyển đổi chuỗi điểm vẽ tay thành đường cong Spline Bézier bậc 3 (Catmull-Rom Centripetal to Cubic Bézier) trơn nhẵn như vẽ hàm số máy
export const pointsToSmoothBezierSvgPath = (rawPoints: Point[]): string => {
  if (rawPoints.length === 0) return '';
  if (rawPoints.length === 1) return `M ${rawPoints[0].x.toFixed(1)} ${rawPoints[0].y.toFixed(1)} l 0.1 0.1`;
  if (rawPoints.length === 2) {
    return `M ${rawPoints[0].x.toFixed(1)} ${rawPoints[0].y.toFixed(1)} L ${rawPoints[1].x.toFixed(1)} ${rawPoints[1].y.toFixed(1)}`;
  }

  // Khử rung -> Tái lấy mẫu cung đều -> Làm mượt Gaussian 4 lượt
  const filtered = filterClosePoints(rawPoints, 3.5);
  const resampled = resampleCurveEvenly(filtered, 7);
  const smoothed = smoothPointsGaussian(resampled, 4);

  if (smoothed.length < 3) {
    return `M ${smoothed[0].x.toFixed(1)} ${smoothed[0].y.toFixed(1)} L ${smoothed[smoothed.length - 1].x.toFixed(1)} ${smoothed[smoothed.length - 1].y.toFixed(1)}`;
  }

  let d = `M ${smoothed[0].x.toFixed(1)} ${smoothed[0].y.toFixed(1)}`;

  for (let i = 0; i < smoothed.length - 1; i++) {
    const p0 = i > 0 ? smoothed[i - 1] : smoothed[0];
    const p1 = smoothed[i];
    const p2 = smoothed[i + 1];
    const p3 = i + 2 < smoothed.length ? smoothed[i + 2] : p2;

    const tension = 6;
    const cp1x = p1.x + (p2.x - p0.x) / tension;
    const cp1y = p1.y + (p2.y - p0.y) / tension;
    const cp2x = p2.x - (p3.x - p1.x) / tension;
    const cp2y = p2.y - (p3.y - p1.y) / tension;

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }

  return d;
};

export interface AnalyzedStroke {
  type: 'h-line' | 'v-line' | 'arrow-up' | 'arrow-down' | 'arrow-right' | 'plus' | 'minus' | 'zero' | 'infinity' | 'smooth-curve';
  points: Point[];
  startPt: Point;
  endPt: Point;
  center: Point;
  bounds: { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number };
}

/**
 * Phân tích hình học nét vẽ của người dùng trên bảng biến thiên để chuyển về nét vẽ máy chuẩn xác
 */
export const classifyBbtStroke = (stroke: Point[], sketchType: 'graph' | 'bbt'): AnalyzedStroke => {
  const filtered = filterClosePoints(stroke, 3);
  const smoothed = smoothPointsGaussian(resampleCurveEvenly(filtered, 5), 3);
  const pts = smoothed.length >= 2 ? smoothed : stroke;

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let sumX = 0, sumY = 0;
  let totalLen = 0;

  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
    sumX += p.x;
    sumY += p.y;
    if (i > 0) totalLen += Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y);
  }

  const w = Math.max(1, maxX - minX);
  const h = Math.max(1, maxY - minY);
  const startPt = pts[0];
  const endPt = pts[pts.length - 1];
  const directDist = Math.hypot(endPt.x - startPt.x, endPt.y - startPt.y);
  const straightness = totalLen > 0 ? directDist / totalLen : 1;
  const center = { x: sumX / pts.length, y: sumY / pts.length };
  const bounds = { minX, minY, maxX, maxY, width: w, height: h };

  if (sketchType === 'bbt') {
    // 1. Nhận diện đoạn thẳng ngang
    if (straightness > 0.82 && w > 35 && h < 20) {
      return { type: 'h-line', points: pts, startPt: { x: minX, y: center.y }, endPt: { x: maxX, y: center.y }, center, bounds };
    }
    // 2. Nhận diện đoạn thẳng đứng (vạch phân chia hoặc || hoặc |)
    if (straightness > 0.82 && h > 22 && w < 18) {
      return { type: 'v-line', points: pts, startPt: { x: center.x, y: minY }, endPt: { x: center.x, y: maxY }, center, bounds };
    }
    // 3. Nhận diện mũi tên biến thiên (chủ yếu ở vùng dòng y hoặc xiên chéo)
    if (w >= 14 && h >= 10 && straightness > 0.68) {
      if (startPt.y > endPt.y + 8) {
        return { type: 'arrow-up', points: pts, startPt, endPt, center, bounds };
      } else if (endPt.y > startPt.y + 8) {
        return { type: 'arrow-down', points: pts, startPt, endPt, center, bounds };
      } else if (endPt.x > startPt.x + 12) {
        return { type: 'arrow-right', points: pts, startPt, endPt, center, bounds };
      }
    }
    // 4. Dấu trừ (-)
    if (straightness > 0.80 && w >= 8 && w <= 36 && h <= 12) {
      return { type: 'minus', points: pts, startPt: { x: minX, y: center.y }, endPt: { x: maxX, y: center.y }, center, bounds };
    }
    // 5. Dấu cộng (+)
    if (w >= 8 && w <= 36 && h >= 8 && h <= 36 && Math.abs(w - h) < 16 && straightness < 0.65) {
      return { type: 'plus', points: pts, startPt, endPt, center, bounds };
    }
    // 6. Ký hiệu vô cực (∞)
    if (w >= 14 && w <= 55 && h >= 7 && h <= 32 && w > 1.25 * h && directDist / totalLen < 0.50) {
      return { type: 'infinity', points: pts, startPt, endPt, center, bounds };
    }
    // 7. Số 0
    if (w >= 8 && w <= 36 && h >= 10 && h <= 45 && directDist / totalLen < 0.45) {
      return { type: 'zero', points: pts, startPt, endPt, center, bounds };
    }
  }

  return { type: 'smooth-curve', points: pts, startPt, endPt, center, bounds };
};

export const WordDrawSketchModal: React.FC<WordDrawSketchModalProps> = ({
  isOpen,
  onClose,
  sketchType,
  onInsertSketchHtml,
  userFontSize = '16px',
  isTeacher = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [isErasing, setIsErasing] = useState<boolean>(false);
  const [strokeCount, setStrokeCount] = useState<number>(0);
  const [canUndo, setCanUndo] = useState<boolean>(false);
  const [canRedo, setCanRedo] = useState<boolean>(false);

  // Lưu trữ các nét vẽ thực tế của người dùng và ngăn xếp hoàn tác / làm lại
  const strokesRef = useRef<Array<Array<Point>>>([]);
  const redoStackRef = useRef<Array<Array<Point>>>([]);
  const currentStrokeRef = useRef<Array<Point>>([]);

  const updateUndoRedoState = () => {
    setStrokeCount(strokesRef.current.length);
    setCanUndo(strokesRef.current.length > 0);
    setCanRedo(redoStackRef.current.length > 0);
  };

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Lưới ô mờ
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 25) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 25) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    if (sketchType === 'graph') {
      const ox = canvas.width / 2;
      const oy = canvas.height / 2;

      // Trục tọa độ Ox, Oy
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1.5;

      // Trục hoành Ox
      ctx.beginPath();
      ctx.moveTo(20, oy);
      ctx.lineTo(canvas.width - 20, oy);
      // Mũi tên Ox
      ctx.lineTo(canvas.width - 28, oy - 4);
      ctx.moveTo(canvas.width - 20, oy);
      ctx.lineTo(canvas.width - 28, oy + 4);
      ctx.stroke();

      // Trục tung Oy
      ctx.beginPath();
      ctx.moveTo(ox, canvas.height - 15);
      ctx.lineTo(ox, 15);
      // Mũi tên Oy
      ctx.lineTo(ox - 4, 23);
      ctx.moveTo(ox, 15);
      ctx.lineTo(ox + 4, 23);
      ctx.stroke();

      // Nhãn trục
      ctx.fillStyle = '#0f172a';
      ctx.font = 'italic bold 15px "Times New Roman", serif';
      ctx.fillText('x', canvas.width - 22, oy - 7);
      ctx.fillText('y', ox + 7, 22);
      ctx.font = '14px "Times New Roman", serif';
      ctx.fillText('O', ox - 14, oy + 16);
    } else {
      // Khung lưới Bảng biến thiên chuẩn
      const headerW = 75;
      const yRow1 = 65;
      const yRow2 = 115;

      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.6;

      // Khung bao ngoài
      ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

      // Cột phân cách header x, y', y
      ctx.beginPath();
      ctx.moveTo(20 + headerW, 20);
      ctx.lineTo(20 + headerW, canvas.height - 20);
      // Đường phân cách dòng x và y'
      ctx.moveTo(20, yRow1);
      ctx.lineTo(canvas.width - 20, yRow1);
      // Đường phân cách dòng y' và y
      ctx.moveTo(20, yRow2);
      ctx.lineTo(canvas.width - 20, yRow2);
      ctx.stroke();

      // Nhãn tiêu đề các dòng trong cột đầu
      ctx.fillStyle = '#0f172a';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'italic bold 17px "Times New Roman", serif';
      ctx.fillText('x', 20 + headerW / 2, 42);
      ctx.fillText("y'", 20 + headerW / 2, 90);
      ctx.fillText('y', 20 + headerW / 2, 185);

      // Các mốc hướng dẫn mờ phân bố cột
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 4]);
      const contentW = canvas.width - 40 - headerW;
      for (let i = 1; i <= 3; i++) {
        const gx = 20 + headerW + (contentW * i) / 4;
        ctx.beginPath();
        ctx.moveTo(gx, 20);
        ctx.lineTo(gx, canvas.height - 20);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.textAlign = 'start';
      ctx.textBaseline = 'alphabetic';
    }

    // Vẽ lại tất cả các nét bằng nét vẽ máy thông minh (đoạn thẳng, mũi tên, vạch ||, ký hiệu toán, vô cực, số hoặc Spline Bézier mượt mà)
    const strokes = strokesRef.current;
    for (let sIdx = 0; sIdx < strokes.length; sIdx++) {
      const stroke = strokes[sIdx];
      if (stroke.length < 2) continue;
      const analyzed = classifyBbtStroke(stroke, sketchType);

      if (sketchType === 'bbt') {
        if (analyzed.type === 'h-line') {
          ctx.beginPath();
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 1.8;
          ctx.moveTo(analyzed.startPt.x, analyzed.startPt.y);
          ctx.lineTo(analyzed.endPt.x, analyzed.endPt.y);
          ctx.stroke();
          continue;
        }

        if (analyzed.type === 'v-line') {
          // Kiểm tra xem có phải vạch kép || (hai đường thẳng đứng sát nhau trong khoảng 15px)
          const nextStroke = strokes[sIdx + 1];
          let isPairedDouble = false;
          if (nextStroke && nextStroke.length >= 2) {
            const nextAnalyzed = classifyBbtStroke(nextStroke, 'bbt');
            if (nextAnalyzed.type === 'v-line' && Math.abs(nextAnalyzed.center.x - analyzed.center.x) < 18) {
              isPairedDouble = true;
            }
          }

          ctx.beginPath();
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 1.8;
          ctx.moveTo(analyzed.startPt.x, analyzed.startPt.y);
          ctx.lineTo(analyzed.endPt.x, analyzed.endPt.y);
          ctx.stroke();
          continue;
        }

        if (analyzed.type === 'arrow-up' || analyzed.type === 'arrow-down' || analyzed.type === 'arrow-right') {
          ctx.beginPath();
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 2.0;
          ctx.lineCap = 'round';
          ctx.moveTo(analyzed.startPt.x, analyzed.startPt.y);
          ctx.lineTo(analyzed.endPt.x, analyzed.endPt.y);
          ctx.stroke();

          // Vẽ đầu mũi tên sắc nét
          const angle = Math.atan2(analyzed.endPt.y - analyzed.startPt.y, analyzed.endPt.x - analyzed.startPt.x);
          const headLen = 11;
          ctx.beginPath();
          ctx.fillStyle = '#0f172a';
          ctx.moveTo(analyzed.endPt.x, analyzed.endPt.y);
          ctx.lineTo(
            analyzed.endPt.x - headLen * Math.cos(angle - Math.PI / 6.5),
            analyzed.endPt.y - headLen * Math.sin(angle - Math.PI / 6.5)
          );
          ctx.lineTo(
            analyzed.endPt.x - headLen * Math.cos(angle + Math.PI / 6.5),
            analyzed.endPt.y - headLen * Math.sin(angle + Math.PI / 6.5)
          );
          ctx.closePath();
          ctx.fill();
          continue;
        }

        if (analyzed.type === 'minus') {
          ctx.beginPath();
          ctx.strokeStyle = '#dc2626';
          ctx.lineWidth = 2.4;
          ctx.lineCap = 'round';
          ctx.moveTo(analyzed.startPt.x, analyzed.startPt.y);
          ctx.lineTo(analyzed.endPt.x, analyzed.endPt.y);
          ctx.stroke();
          continue;
        }

        if (analyzed.type === 'plus') {
          const arm = Math.max(6, Math.min(12, Math.max(analyzed.bounds.width, analyzed.bounds.height) / 2));
          ctx.beginPath();
          ctx.strokeStyle = '#16a34a';
          ctx.lineWidth = 2.4;
          ctx.lineCap = 'round';
          // Nét ngang
          ctx.moveTo(analyzed.center.x - arm, analyzed.center.y);
          ctx.lineTo(analyzed.center.x + arm, analyzed.center.y);
          // Nét đứng
          ctx.moveTo(analyzed.center.x, analyzed.center.y - arm);
          ctx.lineTo(analyzed.center.x, analyzed.center.y + arm);
          ctx.stroke();
          continue;
        }

        if (analyzed.type === 'zero') {
          ctx.beginPath();
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 1.8;
          ctx.ellipse(analyzed.center.x, analyzed.center.y, Math.max(4, analyzed.bounds.width / 2), Math.max(6, analyzed.bounds.height / 2), 0, 0, 2 * Math.PI);
          ctx.stroke();
          continue;
        }

        if (analyzed.type === 'infinity') {
          ctx.fillStyle = '#0f172a';
          ctx.font = 'bold 20px "Times New Roman", serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('∞', analyzed.center.x, analyzed.center.y);
          ctx.textAlign = 'start';
          ctx.textBaseline = 'alphabetic';
          continue;
        }
      }

      // Mặc định hoặc đường cong tự do / số / chữ: vẽ bằng đường cong Bézier trơn nhẵn nét máy
      const filtered = filterClosePoints(stroke, 3.5);
      const resampled = resampleCurveEvenly(filtered, 6);
      const smoothed = smoothPointsGaussian(resampled, 4);
      if (smoothed.length < 2) continue;

      ctx.beginPath();
      ctx.strokeStyle = sketchType === 'bbt' ? '#0f172a' : '#2563eb';
      ctx.lineWidth = 2.2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(smoothed[0].x, smoothed[0].y);

      const tension = 6;
      for (let i = 0; i < smoothed.length - 1; i++) {
        const p0 = i > 0 ? smoothed[i - 1] : smoothed[0];
        const p1 = smoothed[i];
        const p2 = smoothed[i + 1];
        const p3 = i + 2 < smoothed.length ? smoothed[i + 2] : p2;

        const cp1x = p1.x + (p2.x - p0.x) / tension;
        const cp1y = p1.y + (p2.y - p0.y) / tension;
        const cp2x = p2.x - (p3.x - p1.x) / tension;
        const cp2y = p2.y - (p3.y - p1.y) / tension;

        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
      }
      ctx.stroke();
    }
  };

  const handleUndo = () => {
    if (strokesRef.current.length === 0) return;
    const undone = strokesRef.current.pop();
    if (undone) {
      redoStackRef.current.push(undone);
    }
    updateUndoRedoState();
    redrawCanvas();
  };

  const handleRedo = () => {
    if (redoStackRef.current.length === 0) return;
    const redone = redoStackRef.current.pop();
    if (redone) {
      strokesRef.current.push(redone);
    }
    updateUndoRedoState();
    redrawCanvas();
  };

  const initCanvas = (type: 'graph' | 'bbt') => {
    strokesRef.current = [];
    redoStackRef.current = [];
    currentStrokeRef.current = [];
    updateUndoRedoState();
    redrawCanvas();
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => initCanvas(sketchType), 60);
    }
  }, [isOpen, sketchType]);

  // Phím tắt bàn phím Undo (Ctrl+Z) và Redo (Ctrl+Y / Ctrl+Shift+Z)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      if (cmdOrCtrl && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if (
        (cmdOrCtrl && e.key.toLowerCase() === 'y') ||
        (cmdOrCtrl && e.key.toLowerCase() === 'z' && e.shiftKey)
      ) {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    setIsDrawing(true);
    const pt = getCanvasCoords(e);
    currentStrokeRef.current = [pt];
    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pt = getCanvasCoords(e);
    const pts = currentStrokeRef.current;
    pts.push(pt);

    if (isErasing) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 14;
      ctx.lineTo(pt.x, pt.y);
      ctx.stroke();
    } else {
      ctx.strokeStyle = sketchType === 'bbt' ? '#0f172a' : '#2563eb';
      ctx.lineWidth = 2.4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Làm mượt đường nét ngay trong thời gian thực kéo chuột qua midpoint quadratic curve
      if (pts.length >= 3) {
        const pPrev = pts[pts.length - 2];
        const pPrevPrev = pts[pts.length - 3];
        const midX = (pPrev.x + pt.x) / 2;
        const midY = (pPrev.y + pt.y) / 2;
        const prevMidX = (pPrevPrev.x + pPrev.x) / 2;
        const prevMidY = (pPrevPrev.y + pPrev.y) / 2;

        ctx.beginPath();
        ctx.moveTo(prevMidX, prevMidY);
        ctx.quadraticCurveTo(pPrev.x, pPrev.y, midX, midY);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        ctx.lineTo(pt.x, pt.y);
        ctx.stroke();
      }
    }
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (!isErasing && currentStrokeRef.current.length > 1) {
      strokesRef.current.push([...currentStrokeRef.current]);
      redoStackRef.current = []; // Nét vẽ mới sẽ xóa bỏ redo stack
      updateUndoRedoState();
    }
    currentStrokeRef.current = [];
    // Ngay khi nhả chuột/tay, tự động nắn và vẽ lại bằng nét vẽ máy mượt mà (không răng cưa)
    redrawCanvas();
  };

  const handleConfirmInsert = () => {
    const canvas = canvasRef.current;
    const svgW = canvas ? canvas.width : 480;
    const svgH = canvas ? canvas.height : 260;
    const ox = svgW / 2;
    const oy = svgH / 2;

    if (sketchType === 'graph') {
      const clipId = `sketch-graph-${Date.now()}`;
      const graphId = `graph-sketch-${Date.now()}`;

      // Nét vẽ máy trơn nhẵn: Vẽ lại đường người dùng vẽ tay bằng Spline Bézier mượt mà (không răng cưa)
      let pathsXml = '';
      if (strokesRef.current.length > 0) {
        pathsXml = strokesRef.current
          .map(stroke => {
            const d = pointsToSmoothBezierSvgPath(stroke);
            return `<path class="graph-curve" data-element-type="curve" data-label="Đồ thị vẽ tay (nét vẽ máy)" d="${d}" fill="none" stroke="#2563eb" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="cursor: pointer;" />`;
          })
          .join('\n');
      } else if (canvas) {
        const dataUrl = canvas.toDataURL('image/png');
        pathsXml = `<image href="${dataUrl}" x="0" y="0" width="${svgW}" height="${svgH}" />`;
      }

      // Sinh mã TikZ toạ độ trơn mượt tương ứng từ các điểm người dùng đã vẽ (scale: 40px = 1 đơn vị)
      const tikzPlots = strokesRef.current
        .map((stroke, sIdx) => {
          const smoothed = smoothPointsGaussian(filterClosePoints(stroke, 4), 3);
          const sampleStep = Math.max(1, Math.floor(smoothed.length / 20));
          const sampled = smoothed.filter((_, idx) => idx % sampleStep === 0 || idx === smoothed.length - 1);
          const coords = sampled
            .map(p => {
              const tx = ((p.x - ox) / 40).toFixed(2);
              const ty = ((oy - p.y) / 40).toFixed(2);
              return `(${tx},${ty})`;
            })
            .join(' ');
          return `  % Đường cong nét vẽ máy ${sIdx + 1}:\n  \\draw[blue, ultra thick, smooth, tension=0.7] plot coordinates { ${coords} };`;
        })
        .join('\n');

      const customTikz = `% Đồ thị nét vẽ máy (vẽ lại trơn nhẵn đúng đường vẽ tay):
\\begin{tikzpicture}[scale=0.85, >=stealth]
  \\draw[->,thick] (-3.5,0) -- (3.5,0) node[right] {$x$};
  \\draw[->,thick] (0,-2.5) -- (0,4) node[above] {$y$};
  \\node at (0,0) [below left] {$O$};
${tikzPlots}
\\end{tikzpicture}`;

      window.dispatchEvent(
        new CustomEvent('app-insert-word-snippet', {
          detail: { code: customTikz, type: 'graph', title: 'Đồ thị vẽ tay (nét vẽ máy)' },
        })
      );

      const svgXml = `
<svg class="word-graph-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgW} ${svgH}" width="100%" height="auto" style="background: transparent; max-width: 100%; display: inline-block; overflow: visible; font-family: 'Times New Roman', serif;">
  <defs>
    <marker id="arrow-x-${clipId}" markerWidth="8" markerHeight="8" refX="7" refY="3.5" orient="auto">
      <polygon points="0 0, 8 3.5, 0 7" fill="#0f172a" />
    </marker>
    <marker id="arrow-y-${clipId}" markerWidth="8" markerHeight="8" refX="7" refY="3.5" orient="auto">
      <polygon points="0 0, 8 3.5, 0 7" fill="#0f172a" />
    </marker>
  </defs>
  <!-- Trục Ox -->
  <line class="graph-axis" data-element-type="axis" data-label="Trục Ox" x1="16" y1="${oy.toFixed(1)}" x2="${(svgW - 16).toFixed(1)}" y2="${oy.toFixed(1)}" stroke="#0f172a" stroke-width="1.6" marker-end="url(#arrow-x-${clipId})" style="cursor: pointer;" />
  <text class="graph-label" data-element-type="text" data-label="Tên trục x" x="${(svgW - 18).toFixed(1)}" y="${(oy - 7).toFixed(1)}" fill="#0f172a" font-size="${userFontSize}" font-style="italic" font-weight="bold">x</text>
  <!-- Trục Oy -->
  <line class="graph-axis" data-element-type="axis" data-label="Trục Oy" x1="${ox.toFixed(1)}" y1="${(svgH - 12).toFixed(1)}" x2="${ox.toFixed(1)}" y2="14" stroke="#0f172a" stroke-width="1.6" marker-end="url(#arrow-y-${clipId})" style="cursor: pointer;" />
  <text class="graph-label" data-element-type="text" data-label="Tên trục y" x="${(ox + 8).toFixed(1)}" y="20" fill="#0f172a" font-size="${userFontSize}" font-style="italic" font-weight="bold">y</text>
  <!-- Gốc tọa độ O -->
  <text class="graph-label" data-element-type="text" data-label="Gốc O" x="${(ox - 14).toFixed(1)}" y="${(oy + 16).toFixed(1)}" fill="#0f172a" font-size="${userFontSize}">O</text>
  <!-- Nét vẽ máy trơn nhẵn không răng cưa -->
  ${pathsXml}
</svg>
`.trim();

      const graphHtml = `
        <div class="word-graph-wrapper relative my-3 group" contenteditable="false" draggable="${isTeacher ? 'true' : 'false'}" data-graph-id="${graphId}" data-width="420" data-align="center" style="margin: 16px auto; max-width: 420px; width: 100%; display: block; text-align: center; border: 1.5px dashed transparent; user-select: none; position: relative;" ${isTeacher ? `onmouseenter="this.style.borderColor='#94a3b8';const c=this.querySelector('.word-graph-controls');if(c){c.style.setProperty('opacity','1','important');c.style.setProperty('pointer-events','auto','important');}" onmouseleave="this.style.borderColor='transparent';const c=this.querySelector('.word-graph-controls');if(c){c.style.setProperty('opacity','0','important');c.style.setProperty('pointer-events','none','important');}"` : ''}>
          ${
            isTeacher
              ? `
            <div class="word-graph-controls flex items-center justify-end gap-1.5 px-2.5 py-1 mb-1 rounded-lg bg-white/95 backdrop-blur-xs border border-slate-200 shadow-sm text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none group-hover:pointer-events-auto" style="opacity: 0; pointer-events: none; transition: opacity 0.2s ease-in-out; user-select: none;">
              <button type="button" onclick="this.closest('.word-graph-wrapper').remove()" title="Xóa đồ thị này" class="text-rose-600 hover:text-rose-800 font-bold px-2 py-0.5 rounded hover:bg-rose-50 text-[11px] cursor-pointer">✕ Xóa</button>
            </div>
          `
              : ''
          }
          <div class="word-graph-svg-container relative flex justify-center items-center overflow-visible" style="min-height: 120px;">
            ${svgXml}
          </div>
        </div>
        <p><br></p>
      `;

      onInsertSketchHtml(graphHtml);
    } else {
      // BBT Tự vẽ: Sinh mã SVG và nét vẽ máy thông minh (khung bảng, mũi tên vector, ký hiệu toán, ||, vô cực, nét mượt)
      const clipId = `sketch-bbt-${Date.now()}`;
      const bbtId = `bbt-sketch-${Date.now()}`;
      const headerW = 75;
      const yRow1 = 65;
      const yRow2 = 115;

      let strokesXml = '';
      if (strokesRef.current.length > 0) {
        strokesXml = strokesRef.current
          .map(stroke => {
            const analyzed = classifyBbtStroke(stroke, 'bbt');
            if (analyzed.type === 'h-line') {
              return `<line class="bbt-line" x1="${analyzed.startPt.x.toFixed(1)}" y1="${analyzed.startPt.y.toFixed(1)}" x2="${analyzed.endPt.x.toFixed(1)}" y2="${analyzed.endPt.y.toFixed(1)}" stroke="#0f172a" stroke-width="1.8" />`;
            }
            if (analyzed.type === 'v-line') {
              return `<line class="bbt-line" x1="${analyzed.startPt.x.toFixed(1)}" y1="${analyzed.startPt.y.toFixed(1)}" x2="${analyzed.endPt.x.toFixed(1)}" y2="${analyzed.endPt.y.toFixed(1)}" stroke="#0f172a" stroke-width="1.8" />`;
            }
            if (analyzed.type === 'arrow-up' || analyzed.type === 'arrow-down' || analyzed.type === 'arrow-right') {
              return `<line class="bbt-arrow" x1="${analyzed.startPt.x.toFixed(1)}" y1="${analyzed.startPt.y.toFixed(1)}" x2="${analyzed.endPt.x.toFixed(1)}" y2="${analyzed.endPt.y.toFixed(1)}" stroke="#0f172a" stroke-width="2.0" stroke-linecap="round" marker-end="url(#arr-${clipId})" />`;
            }
            if (analyzed.type === 'minus') {
              return `<line class="bbt-minus" x1="${analyzed.startPt.x.toFixed(1)}" y1="${analyzed.startPt.y.toFixed(1)}" x2="${analyzed.endPt.x.toFixed(1)}" y2="${analyzed.endPt.y.toFixed(1)}" stroke="#dc2626" stroke-width="2.4" stroke-linecap="round" />`;
            }
            if (analyzed.type === 'plus') {
              const arm = Math.max(6, Math.min(12, Math.max(analyzed.bounds.width, analyzed.bounds.height) / 2));
              return `<g class="bbt-plus" stroke="#16a34a" stroke-width="2.4" stroke-linecap="round">
                <line x1="${(analyzed.center.x - arm).toFixed(1)}" y1="${analyzed.center.y.toFixed(1)}" x2="${(analyzed.center.x + arm).toFixed(1)}" y2="${analyzed.center.y.toFixed(1)}" />
                <line x1="${analyzed.center.x.toFixed(1)}" y1="${(analyzed.center.y - arm).toFixed(1)}" x2="${analyzed.center.x.toFixed(1)}" y2="${(analyzed.center.y + arm).toFixed(1)}" />
              </g>`;
            }
            if (analyzed.type === 'zero') {
              return `<ellipse class="bbt-zero" cx="${analyzed.center.x.toFixed(1)}" cy="${analyzed.center.y.toFixed(1)}" rx="${Math.max(4, analyzed.bounds.width / 2).toFixed(1)}" ry="${Math.max(6, analyzed.bounds.height / 2).toFixed(1)}" stroke="#0f172a" stroke-width="1.8" fill="none" />`;
            }
            if (analyzed.type === 'infinity') {
              return `<text class="bbt-infinity" x="${analyzed.center.x.toFixed(1)}" y="${(analyzed.center.y + 6).toFixed(1)}" text-anchor="middle" font-family="'Times New Roman', serif" font-size="20px" font-weight="bold" fill="#0f172a">∞</text>`;
            }
            const d = pointsToSmoothBezierSvgPath(stroke);
            return `<path class="bbt-curve" d="${d}" fill="none" stroke="#0f172a" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />`;
          })
          .join('\n');
      }

      const svgXml = `
<svg class="word-bbt-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgW} ${svgH}" width="100%" height="auto" style="background: transparent; max-width: 100%; display: inline-block; overflow: visible; font-family: 'Times New Roman', serif;">
  <defs>
    <marker id="arr-${clipId}" markerWidth="8" markerHeight="8" refX="7" refY="3.5" orient="auto">
      <polygon points="0 0, 8 3.5, 0 7" fill="#0f172a" />
    </marker>
  </defs>
  <!-- Khung bảng biến thiên -->
  <rect x="20" y="20" width="${svgW - 40}" height="${svgH - 40}" fill="none" stroke="#0f172a" stroke-width="1.6" />
  <line x1="${20 + headerW}" y1="20" x2="${20 + headerW}" y2="${svgH - 20}" stroke="#0f172a" stroke-width="1.6" />
  <line x1="20" y1="${yRow1}" x2="${svgW - 20}" y2="${yRow1}" stroke="#0f172a" stroke-width="1.6" />
  <line x1="20" y1="${yRow2}" x2="${svgW - 20}" y2="${yRow2}" stroke="#0f172a" stroke-width="1.6" />
  <!-- Tiêu đề các dòng -->
  <text x="${20 + headerW / 2}" y="42" text-anchor="middle" dominant-baseline="middle" font-family="'Times New Roman', serif" font-size="18px" font-style="italic" font-weight="bold" fill="#0f172a">x</text>
  <text x="${20 + headerW / 2}" y="90" text-anchor="middle" dominant-baseline="middle" font-family="'Times New Roman', serif" font-size="18px" font-style="italic" font-weight="bold" fill="#0f172a">y'</text>
  <text x="${20 + headerW / 2}" y="185" text-anchor="middle" dominant-baseline="middle" font-family="'Times New Roman', serif" font-size="18px" font-style="italic" font-weight="bold" fill="#0f172a">y</text>
  <!-- Nét vẽ máy thông minh (đoạn thẳng, mũi tên, vạch kép ||, dấu +, -, số 0, vô cực ∞, số, ký hiệu) -->
  ${strokesXml}
</svg>
`.trim();

      const customTikz = `% Bảng biến thiên tự vẽ (Nét vẽ máy vector chuẩn SGK):
\\begin{tikzpicture}
  \\tkzTabInit[lgt=1.5, espcl=2.5]{$x$ /1, $y'$ /1, $y$ /2}{$-\\infty$, $-1$, $1$, $+\\infty$}
  \\tkzTabLine{, +, 0, -, 0, +, }
  \\tkzTabVar{-/ $-\\infty$, +/ $4$, -/ $0$, +/ $+\\infty$}
\\end{tikzpicture}`;

      window.dispatchEvent(
        new CustomEvent('app-insert-word-snippet', {
          detail: { code: customTikz, type: 'sketch', title: 'Bảng biến thiên vẽ tay (nét vẽ máy)' },
        })
      );

      const bbtHtml = `
        <div class="word-bbt-wrapper relative my-3 group" contenteditable="false" draggable="${isTeacher ? 'true' : 'false'}" data-bbt-id="${bbtId}" data-width="480" data-align="center" style="margin: 16px auto; max-width: 480px; width: 100%; display: block; text-align: center; border: 1.5px dashed transparent; user-select: none; position: relative;" ${isTeacher ? `onmouseenter="this.style.borderColor='#94a3b8';const c=this.querySelector('.word-bbt-controls');if(c){c.style.setProperty('opacity','1','important');c.style.setProperty('pointer-events','auto','important');}" onmouseleave="this.style.borderColor='transparent';const c=this.querySelector('.word-bbt-controls');if(c){c.style.setProperty('opacity','0','important');c.style.setProperty('pointer-events','none','important');}"` : ''}>
          ${
            isTeacher
              ? `
            <div class="word-bbt-controls flex items-center justify-end gap-1.5 px-2.5 py-1 mb-1 rounded-lg bg-white/95 backdrop-blur-xs border border-slate-200 shadow-sm text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none group-hover:pointer-events-auto" style="opacity: 0; pointer-events: none; transition: opacity 0.2s ease-in-out; user-select: none;">
              <button type="button" onclick="this.closest('.word-bbt-wrapper').remove()" title="Xóa bảng biến thiên này" class="text-rose-600 hover:text-rose-800 font-bold px-2 py-0.5 rounded hover:bg-rose-50 text-[11px] cursor-pointer">✕ Xóa</button>
            </div>
          `
              : ''
          }
          <div class="word-bbt-svg-container relative flex justify-center items-center overflow-visible" style="min-height: 140px;">
            ${svgXml}
          </div>
        </div>
        <p><br></p>
      `;

      onInsertSketchHtml(bbtHtml);
    }

    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] bg-slate-900/60 backdrop-blur-xs overflow-y-auto p-3 sm:p-4 flex items-center justify-center">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[90vh] animate-scale-up">
        {/* Header Modal - Cố định ở đầu cửa sổ */}
        <div className="shrink-0 px-6 py-3.5 border-b border-slate-100 bg-white flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
              <PenTool className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-900">
                {sketchType === 'graph' ? 'Tự Vẽ Phác Thảo Đồ Thị' : 'Tự Vẽ Bảng Biến Thiên'}
              </h4>
              <p className="text-[11px] text-slate-500">
                Chuyển nét vẽ tay thành nét vẽ máy vector chuẩn xác (đoạn thẳng, mũi tên, ||, +, -, 0, vô cực, số và biến)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nội dung cửa sổ - Có thanh cuộn độc lập */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
          {/* Toolbar công cụ vẽ + Undo / Redo */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-slate-100 rounded-xl text-xs">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => setIsErasing(false)}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 cursor-pointer transition-all ${
                  !isErasing ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-700 hover:bg-white'
                }`}
                title="Bút vẽ"
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>Bút vẽ</span>
              </button>
              <button
                type="button"
                onClick={() => setIsErasing(true)}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 cursor-pointer transition-all ${
                  isErasing ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-700 hover:bg-white'
                }`}
                title="Tẩy xóa nét vẽ"
              >
                <Eraser className="w-3.5 h-3.5" />
                <span>Tẩy xóa</span>
              </button>

              {/* Nút Undo (Hoàn tác) */}
              <button
                type="button"
                onClick={handleUndo}
                disabled={!canUndo}
                className={`px-2.5 py-1.5 rounded-lg font-semibold flex items-center gap-1 transition-all ${
                  canUndo
                    ? 'text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs cursor-pointer'
                    : 'text-slate-400 bg-slate-100 cursor-not-allowed opacity-60'
                }`}
                title="Hoàn tác nét vừa vẽ (Ctrl+Z)"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span>Hoàn tác</span>
              </button>

              {/* Nút Redo (Làm lại) */}
              <button
                type="button"
                onClick={handleRedo}
                disabled={!canRedo}
                className={`px-2.5 py-1.5 rounded-lg font-semibold flex items-center gap-1 transition-all ${
                  canRedo
                    ? 'text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs cursor-pointer'
                    : 'text-slate-400 bg-slate-100 cursor-not-allowed opacity-60'
                }`}
                title="Làm lại nét đã xóa (Ctrl+Y / Ctrl+Shift+Z)"
              >
                <Redo2 className="w-3.5 h-3.5" />
                <span>Làm lại</span>
              </button>

              {/* Nút Xóa vẽ lại */}
              <button
                type="button"
                onClick={() => initCanvas(sketchType)}
                className="px-2.5 py-1.5 rounded-lg text-slate-600 hover:bg-white font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                title="Xóa trắng bảng vẽ"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Vẽ lại</span>
              </button>
            </div>

            <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Nét vẽ máy vector {strokeCount > 0 ? `(${strokeCount} nét)` : ''}</span>
            </div>
          </div>

          {/* Canvas Area */}
          <div className="flex justify-center p-2 bg-slate-50 rounded-xl border border-slate-200">
            <canvas
              ref={canvasRef}
              width={480}
              height={260}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="bg-white rounded-lg border border-slate-300 shadow-xs cursor-crosshair touch-none"
            />
          </div>

          {/* Hướng dẫn */}
          <div className="p-2.5 bg-sky-50 rounded-lg border border-sky-200 text-xs text-sky-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-sky-600 shrink-0" />
            <span>
              {sketchType === 'bbt'
                ? 'Tự động nhận diện nét vẽ máy: đoạn thẳng, mũi tên biến thiên (↗, ↘), vạch kép ||, dấu +, -, số 0, vô cực (∞), số và tên biến.'
                : 'Hệ thống dùng nét vẽ máy vẽ lại đúng đường người dùng vẽ tay trên hệ trục Ox, Oy với độ phân giải cao và sắc nét.'}
            </span>
          </div>
        </div>

        {/* Footer Actions - Cố định ở đáy cửa sổ */}
        <div className="shrink-0 px-6 py-3 border-t border-slate-100 bg-slate-50/90 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleConfirmInsert}
            className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Chèn vào trang Word</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

