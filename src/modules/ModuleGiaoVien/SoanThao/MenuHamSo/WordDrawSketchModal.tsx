/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { PenTool, Check, X, Sparkles, RotateCcw } from 'lucide-react';
import { generateWordBbtHtml } from './bbtSolver';

export interface WordDrawSketchModalProps {
  isOpen: boolean;
  onClose: () => void;
  sketchType: 'graph' | 'bbt';
  onInsertSketchHtml: (html: string) => void;
  userFontSize?: string;
  isTeacher?: boolean;
}

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

  // Lưu trữ các nét vẽ thực tế của người dùng
  const strokesRef = useRef<Array<Array<{ x: number; y: number }>>>([]);
  const currentStrokeRef = useRef<Array<{ x: number; y: number }>>([]);

  const initCanvas = (type: 'graph' | 'bbt') => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    strokesRef.current = [];
    currentStrokeRef.current = [];
    setStrokeCount(0);

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

    if (type === 'graph') {
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
      ctx.font = 'italic bold 14px "Times New Roman", serif';
      ctx.fillText('x', canvas.width - 22, oy - 7);
      ctx.fillText('y', ox + 7, 22);
      ctx.font = '14px "Times New Roman", serif';
      ctx.fillText('O', ox - 14, oy + 16);
    } else {
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(30, 25, canvas.width - 60, canvas.height - 50);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => initCanvas(sketchType), 60);
    }
  }, [isOpen, sketchType]);

  if (!isOpen) return null;

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
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
    currentStrokeRef.current.push(pt);

    if (isErasing) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 14;
    } else {
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (!isErasing && currentStrokeRef.current.length > 1) {
      strokesRef.current.push([...currentStrokeRef.current]);
      setStrokeCount(strokesRef.current.length);
    }
    currentStrokeRef.current = [];
  };

  // Hàm chuyển đổi chuỗi điểm vẽ tay thành đường cong vector mượt mà
  const pointsToSvgPath = (points: Array<{ x: number; y: number }>): string => {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)} l 0.1 0.1`;
    let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
    for (let i = 1; i < points.length; i++) {
      const p0 = points[i - 1];
      const p1 = points[i];
      const mx = (p0.x + p1.x) / 2;
      const my = (p0.y + p1.y) / 2;
      d += ` Q ${p0.x.toFixed(1)} ${p0.y.toFixed(1)}, ${mx.toFixed(1)} ${my.toFixed(1)}`;
    }
    const last = points[points.length - 1];
    d += ` L ${last.x.toFixed(1)} ${last.y.toFixed(1)}`;
    return d;
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

      // Nét vẽ máy: Vẽ lại ĐÚNG đường người dùng vẽ tay bằng vector mượt
      let pathsXml = '';
      if (strokesRef.current.length > 0) {
        pathsXml = strokesRef.current
          .map(stroke => {
            const d = pointsToSvgPath(stroke);
            return `<path class="graph-curve" data-element-type="curve" data-label="Đồ thị vẽ tay" d="${d}" fill="none" stroke="#2563eb" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="cursor: pointer;" />`;
          })
          .join('\n');
      } else if (canvas) {
        // Dự phòng: xuất canvas data URL nếu có vẽ nhưng chưa lưu stroke
        const dataUrl = canvas.toDataURL('image/png');
        pathsXml = `<image href="${dataUrl}" x="0" y="0" width="${svgW}" height="${svgH}" />`;
      }

      // Sinh mã TikZ toạ độ tương ứng từ các điểm người dùng đã vẽ (scale: 40px = 1 đơn vị)
      const tikzPlots = strokesRef.current
        .map((stroke, sIdx) => {
          // Lấy mẫu các điểm để mã TikZ gọn gàng
          const sampleStep = Math.max(1, Math.floor(stroke.length / 25));
          const sampled = stroke.filter((_, idx) => idx % sampleStep === 0 || idx === stroke.length - 1);
          const coords = sampled
            .map(p => {
              const tx = ((p.x - ox) / 40).toFixed(2);
              const ty = ((oy - p.y) / 40).toFixed(2);
              return `(${tx},${ty})`;
            })
            .join(' ');
          return `  % Đường cong nét vẽ ${sIdx + 1}:\n  \\draw[blue, ultra thick, smooth] plot coordinates { ${coords} };`;
        })
        .join('\n');

      const customTikz = `% Đồ thị nét vẽ máy (vẽ lại đúng đường người dùng vẽ tay):
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
  <!-- Nét vẽ máy vẽ lại đúng nét vẽ tay của người dùng -->
  ${pathsXml}
</svg>
`.trim();

      const graphHtml = `
        <div class="word-graph-wrapper relative my-3 group" contenteditable="false" draggable="${isTeacher ? 'true' : 'false'}" data-graph-id="${graphId}" data-width="420" data-align="center" style="margin: 16px auto; max-width: 420px; width: 100%; display: block; text-align: center; border: 1.5px dashed transparent; user-select: none; position: relative;">
          ${
            isTeacher
              ? `
            <div class="word-graph-controls flex items-center justify-between gap-1.5 px-2.5 py-1 mb-1 rounded-lg bg-white/95 backdrop-blur-xs border border-slate-200 shadow-sm text-xs transition-opacity" style="user-select: none;">
              <span class="graph-drag-handle cursor-move font-bold text-slate-600 flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-slate-100 text-[11px]" title="Bấm giữ và kéo để di chuyển">✥ Di chuyển</span>
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
      // BBT
      const bbtHtml = generateWordBbtHtml(
        '-\\infty, -1, 1, +\\infty',
        ', +, 0, -, 0, +, ',
        '-/ -\\infty, +/ 2, -/ -2, +/ +\\infty',
        `sketch-bbt-${Date.now()}`,
        'y = x^3 - 3x',
        'function',
        undefined,
        'center',
        'x',
        'y',
        "y'",
        isTeacher
      );
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
                Dùng nét vẽ máy vẽ lại đúng đường người dùng vẽ tay (không đoán công thức)
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
          {/* Toolbar công cụ vẽ */}
          <div className="flex items-center justify-between p-2 bg-slate-100 rounded-xl text-xs">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsErasing(false)}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 cursor-pointer transition-all ${
                  !isErasing ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-700 hover:bg-white'
                }`}
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
              >
                <span>Tẩy xóa</span>
              </button>
              <button
                type="button"
                onClick={() => initCanvas(sketchType)}
                className="px-2.5 py-1.5 rounded-lg text-slate-600 hover:bg-white font-semibold flex items-center gap-1 cursor-pointer"
                title="Xóa trắng vẽ lại"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Vẽ lại</span>
              </button>
            </div>
            <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Máy vẽ lại vector trung thực {strokeCount > 0 ? `(${strokeCount} nét)` : ''}</span>
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
              Hệ thống dùng <b>nét vẽ máy</b> vẽ lại đúng đường người dùng vẽ tay trên hệ trục Ox, Oy với độ phân giải cao và sắc nét.
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
