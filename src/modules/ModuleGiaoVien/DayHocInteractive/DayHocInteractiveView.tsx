import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Tv,
  Download,
  Presentation,
  PenTool,
  Eraser,
  Palette,
  Layers,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Maximize2,
  Minimize2,
  Users,
  Camera,
  Upload,
  Send,
  Sparkles,
  CheckCircle2,
  RotateCcw,
  BookOpen,
  FileText,
  Video,
  Radio,
  Share2,
  Plus,
  Trash2,
  Eye,
  Sliders,
  Maximize,
  ArrowDown,
  ArrowUp,
  ArrowLeft,
  AlertCircle,
  HelpCircle,
  Check,
  X,
  Play,
  MousePointer,
  Lock,
  Unlock,
  Image as ImageIcon,
  MessageSquare,
  ChevronRight as ArrowRight,
  Settings,
  RotateCw,
  FolderTree,
  Activity,
  Award,
  Move,
  Crop,
  GripVertical,
  Minus,
  ChevronsUpDown,
} from 'lucide-react';
import { TeacherDocument, ClassItem } from '../../../services/storageTypes';
import { getTeacherDocuments, getClasses } from '../../ConnectData/ConnectFirestore';
import { HierarchySelector } from '../TaiLieuCaNhan/HierarchySelector';
import {
  getStoredHierarchy,
  saveStoredHierarchy,
  buildHierarchyFromDocuments,
} from '../TaiLieuCaNhan/hierarchyData';
import { BoChonHocLieuTienTrinh } from '../../ModuleShared/BoChonHocLieuTienTrinh';
import { renderLatexInHtml, renderLatexInText } from '../SoanThao/latexUtils';
import { MenuLenLop, GraphConfig, GraphPoint } from './MenuLenLop';
import { getPresentationWindowHtml } from './presentationWindowTemplate';
import { PenType, drawSingleStroke } from './scrbleInkUtils';

export function isHtmlContent(str: string): boolean {
  if (!str) return false;
  return /<\/?[a-z][\s\S]*>/i.test(str);
}

export function decodeHtmlEntities(raw: string): string {
  if (!raw) return '';
  let str = raw;
  if (/&lt;[a-z\/!]/i.test(str)) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(str, 'text/html');
    str = doc.body.textContent || str;
  }
  return str;
}

export function formatBlockContentToHtml(content: string): string {
  if (!content) return '';
  let cleaned = content.trim();

  // 1. Gỡ bỏ ngoặc kép nếu bị JSON stringify
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    try {
      const parsed = JSON.parse(cleaned);
      if (typeof parsed === 'string') cleaned = parsed;
    } catch {}
  }

  // 2. Decode các thực thể HTML escape nếu có (&lt;p&gt; -> <p>)
  cleaned = decodeHtmlEntities(cleaned);

  // 3. Tách nội dung body nếu là tài liệu HTML nguyên văn xuất từ Docs/Word
  const bodyMatch = cleaned.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch && bodyMatch[1]) {
    cleaned = bodyMatch[1].trim();
  }

  // 4. Render HTML chuẩn trực quan thay vì đọc mã thẻ nội dung file
  if (isHtmlContent(cleaned)) {
    return renderLatexInHtml(cleaned);
  }
  const textWithMath = renderLatexInText(cleaned);
  return textWithMath.replace(/\n/g, '<br/>');
}

export interface TeachingBlock {
  id: string;
  type: 'kienThuc' | 'luyenTap' | 'kiemTra' | 'caiThien' | 'viDu' | 'loiGiai' | 'baiTap' | 'anhHocSinh' | 'ghiChuGiaoVien' | 'slideChunk' | 'doThi' | 'vungVietTay';
  title: string;
  content: string;
  subContent?: string;
  studentName?: string;
  imageUrl?: string;
  slideIndex?: number;
  effectIndex?: number;
  topOffset?: number; // Khoảng cách đẩy xuống (px) để hiển thị bên dưới hàng cuối cùng có nét vẽ vẽ đến
  // Các thuộc tính riêng cho Vùng Viết Tay Tương Tác (Giải Pháp 2)
  zoneWidth?: number;
  zoneHeight?: number;
  zoneOffsetX?: number;
  zoneOffsetY?: number;
  zoneStrokes?: DrawStroke[];
  isLocked?: boolean;
}

export interface DrawStroke {
  id: string;
  points: Array<{ x: number; y: number }>;
  color: string;
  width: number;
  penType?: PenType;
}

export type BoardStyle = 'green_grid' | 'white_grid' | 'black_grid' | 'notebook' | 'plain';

const getBoardContainerClasses = (style: BoardStyle) => {
  switch (style) {
    case 'green_grid':
      return 'bg-[#0a3d2e] border-[10px] border-[#3a2012] rounded-3xl shadow-2xl ring-2 ring-emerald-950/80';
    case 'white_grid':
      return 'bg-slate-50 border-[10px] border-slate-300 rounded-3xl shadow-xl ring-2 ring-slate-400/50';
    case 'black_grid':
      return 'bg-[#111827] border-[10px] border-slate-800 rounded-3xl shadow-2xl ring-2 ring-slate-900';
    case 'notebook':
      return 'bg-[#fffdf5] border-[6px] border-amber-200/90 rounded-3xl shadow-xl ring-1 ring-amber-300/40';
    case 'plain':
    default:
      return 'bg-slate-900 border-2 border-slate-800 rounded-3xl shadow-2xl';
  }
};

const getBoardBackgroundStyle = (style: BoardStyle): React.CSSProperties => {
  switch (style) {
    case 'green_grid':
      return {
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.13) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.13) 1px, transparent 1px)',
        backgroundSize: '1cm 1cm',
      };
    case 'white_grid':
      return {
        backgroundImage: 'linear-gradient(rgba(59,130,246,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.15) 1px, transparent 1px)',
        backgroundSize: '1cm 1cm',
      };
    case 'black_grid':
      return {
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px)',
        backgroundSize: '1cm 1cm',
      };
    case 'notebook':
      return {
        backgroundImage: 'linear-gradient(rgba(148,163,184,0.25) 1px, transparent 1px)',
        backgroundSize: '100% 1cm',
      };
    case 'plain':
    default:
      return {};
  }
};

const getBlockCardClasses = (style: BoardStyle, blockType: string) => {
  switch (style) {
    case 'green_grid':
      if (blockType === 'ghiChuGiaoVien') return 'bg-[#0f4d3a]/95 border border-[#1f6d54] text-yellow-100 shadow-md';
      if (blockType === 'anhHocSinh') return 'bg-[#0a4837]/95 border border-[#1a624b] text-emerald-100 shadow-md';
      return 'bg-[#0a3d2e] text-white';
    case 'white_grid':
      if (blockType === 'ghiChuGiaoVien') return 'bg-indigo-50/95 border border-indigo-200 text-indigo-950 shadow-xs';
      if (blockType === 'anhHocSinh') return 'bg-emerald-50/95 border border-emerald-200 text-emerald-950 shadow-xs';
      return 'bg-[#f8fafc] text-slate-900';
    case 'black_grid':
      if (blockType === 'ghiChuGiaoVien') return 'bg-indigo-950/90 border border-indigo-700/80 text-indigo-100 shadow-md';
      if (blockType === 'anhHocSinh') return 'bg-emerald-950/90 border border-emerald-700/80 text-emerald-100 shadow-md';
      return 'bg-[#111827] text-slate-100';
    case 'notebook':
      if (blockType === 'ghiChuGiaoVien') return 'bg-indigo-50/90 border border-indigo-200 text-indigo-950 shadow-xs';
      if (blockType === 'anhHocSinh') return 'bg-emerald-50/90 border border-emerald-200 text-emerald-950 shadow-xs';
      return 'bg-[#fffdf5] text-slate-900';
    case 'plain':
    default:
      if (blockType === 'ghiChuGiaoVien') return 'bg-indigo-950/80 border border-indigo-700/80 text-indigo-100';
      if (blockType === 'anhHocSinh') return 'bg-emerald-950/80 border border-emerald-700/80 text-emerald-100';
      return 'bg-[#0f172a] text-slate-100';
  }
};

const getBlockTextClasses = (style: BoardStyle) => {
  if (style === 'white_grid' || style === 'notebook') {
    return "text-sm sm:text-base text-slate-800 leading-relaxed font-sans html-teaching-content [&_p]:mb-2.5 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-indigo-950 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-indigo-950 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-indigo-950 [&_table]:border-collapse [&_table]:w-full [&_td]:border [&_td]:border-slate-300 [&_td]:p-2 [&_th]:border [&_th]:border-slate-300 [&_th]:p-2 [&_strong]:text-indigo-950 [&_b]:text-indigo-950 [&_em]:text-indigo-800 [&_img]:max-h-96 [&_img]:rounded-xl [&_img]:object-contain";
  }
  if (style === 'green_grid') {
    return "text-sm sm:text-base text-emerald-50 leading-relaxed font-sans html-teaching-content [&_p]:mb-2.5 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-yellow-200 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-yellow-200 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-yellow-200 [&_table]:border-collapse [&_table]:w-full [&_td]:border [&_td]:border-emerald-700/60 [&_td]:p-2 [&_th]:border [&_th]:border-emerald-700/60 [&_th]:p-2 [&_strong]:text-yellow-200 [&_b]:text-yellow-200 [&_em]:text-yellow-100 [&_img]:max-h-96 [&_img]:rounded-xl [&_img]:object-contain";
  }
  return "text-sm sm:text-base text-slate-200 leading-relaxed font-sans html-teaching-content [&_p]:mb-2.5 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-teal-300 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-teal-300 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-teal-300 [&_table]:border-collapse [&_table]:w-full [&_td]:border [&_td]:border-slate-600 [&_td]:p-2 [&_th]:border [&_th]:border-slate-600 [&_th]:p-2 [&_strong]:text-white [&_b]:text-white [&_em]:text-teal-200 [&_img]:max-h-96 [&_img]:rounded-xl [&_img]:object-contain";
};

interface BlockGroup {
  isPpt: boolean;
  blocks: TeachingBlock[];
}

const groupTeachingBlocks = (blocks: TeachingBlock[]): BlockGroup[] => {
  const groups: BlockGroup[] = [];
  let currentGroup: BlockGroup | null = null;

  for (const block of blocks) {
    if (block.type === 'doThi' || block.type === 'vungVietTay') {
      groups.push({ isPpt: false, blocks: [block] });
      currentGroup = null;
      continue;
    }
    const isPpt = block.type !== 'ghiChuGiaoVien' && block.type !== 'anhHocSinh';
    if (!currentGroup || currentGroup.isPpt !== isPpt) {
      currentGroup = { isPpt, blocks: [block] };
      groups.push(currentGroup);
    } else {
      currentGroup.blocks.push(block);
    }
  }

  return groups;
};

// Tự động sinh mã SVG trực quan cho Đồ thị Hàm số
// YÊU CẦU:
// - Đồ thị nằm hoàn toàn bên trong hình chữ nhật khung xung quanh từ đầu trục đến cuối trục (clipPath, không vẽ thừa ra ngoài)
// - Hỗ trợ zoom (thu phóng), đổi tên trục Ox/Oy, thêm/xóa giá trị các điểm và gióng trục vuông góc (nét đứt)
function generateMathGraphSvg(
  configOrExpr: GraphConfig | string,
  boardStyle: BoardStyle = 'green_grid'
): string {
  const config: GraphConfig = typeof configOrExpr === 'string'
    ? {
        funcExpr: configOrExpr,
        showGrid: false,
        axisNameX: 'x',
        axisNameY: 'y',
        zoomLevel: 1.0,
        points: [],
      }
    : configOrExpr;

  const cleanExpr = (config.funcExpr || 'x^3 - 3*x + 1').trim();
  let evalFn: (x: number) => number;
  try {
    const jsExpr = cleanExpr
      .replace(/\^/g, '**')
      .replace(/(\d)([a-zA-Z])/g, '$1*$2')
      .replace(/(\))([a-zA-Z0-9])/g, '$1*$2')
      .replace(/sin/g, 'Math.sin')
      .replace(/cos/g, 'Math.cos')
      .replace(/tan/g, 'Math.tan')
      .replace(/sqrt/g, 'Math.sqrt')
      .replace(/abs/g, 'Math.abs');
    // eslint-disable-next-line no-new-func
    evalFn = new Function('x', `try { return (${jsExpr}); } catch(e) { return NaN; }`) as any;
  } catch (e) {
    evalFn = (x) => x * x - 2;
  }

  const width = 600;
  const height = 350;
  const originX = 300;
  const originY = 175;

  // Khung hình chữ nhật bao quanh từ đầu trục đến cuối trục (không vẽ thừa ra ngoài)
  const boxLeft = 35;
  const boxTop = 25;
  const boxWidth = width - 70; // 530
  const boxHeight = height - 50; // 300
  const boxRight = boxLeft + boxWidth; // 565
  const boxBottom = boxTop + boxHeight; // 325

  const zoom = Math.max(0.5, Math.min(2.5, config.zoomLevel || 1.0));
  const unitPx = 36 * zoom;

  const isLight = boardStyle === 'white_grid' || boardStyle === 'notebook';
  const isGreen = boardStyle === 'green_grid';

  // Màu sắc phấn / bút vẽ thích ứng với bảng, tự nhiên như viết trên bảng thật
  const axisColor = isLight ? '#334155' : isGreen ? '#f8fafc' : '#f1f5f9';
  const textColor = isLight ? '#0f172a' : isGreen ? '#fef08a' : '#f8fafc';
  const curveColor = isLight ? '#2563eb' : isGreen ? '#facc15' : '#38bdf8';
  const gridStroke = isLight ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.15)';
  const frameColor = isLight ? 'rgba(51, 65, 85, 0.25)' : 'rgba(255, 255, 255, 0.2)';
  const gióngColor = isLight ? '#e11d48' : '#fb923c'; // Màu nổi bật cho nét đứt gióng trục
  const pointDotColor = isLight ? '#e11d48' : '#f43f5e';

  const clipId = `graph_box_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // Tạo lưới trục nét đứt nếu bật showGrid
  let gridLines = '';
  if (config.showGrid) {
    const minStepX = Math.floor((boxLeft - originX) / unitPx);
    const maxStepX = Math.ceil((boxRight - originX) / unitPx);
    for (let x = minStepX; x <= maxStepX; x++) {
      const px = originX + x * unitPx;
      if (px >= boxLeft && px <= boxRight) {
        gridLines += `<line x1="${px.toFixed(1)}" y1="${boxTop}" x2="${px.toFixed(1)}" y2="${boxBottom}" stroke="${gridStroke}" stroke-width="1" stroke-dasharray="2,3"/>`;
      }
    }

    const minStepY = Math.floor((originY - boxBottom) / unitPx);
    const maxStepY = Math.ceil((originY - boxTop) / unitPx);
    for (let y = minStepY; y <= maxStepY; y++) {
      const py = originY - y * unitPx;
      if (py >= boxTop && py <= boxBottom) {
        gridLines += `<line x1="${boxLeft}" y1="${py.toFixed(1)}" x2="${boxRight}" y2="${py.toFixed(1)}" stroke="${gridStroke}" stroke-width="1" stroke-dasharray="2,3"/>`;
      }
    }
  }

  // Tính toán đường cong hàm số (ngắt nét mượt mà khi vượt ngoài khung hoặc phân thức không xác định)
  let pathD = '';
  let inPath = false;
  const xMin = (boxLeft - originX - 10) / unitPx;
  const xMax = (boxRight - originX + 10) / unitPx;
  const step = (xMax - xMin) / 360;

  for (let x = xMin; x <= xMax; x += step) {
    const y = evalFn(x);
    if (typeof y !== 'number' || isNaN(y) || !isFinite(y)) {
      inPath = false;
      continue;
    }
    const px = originX + x * unitPx;
    const py = originY - y * unitPx;

    // Ngắt đường vẽ nếu giá trị y bay quá xa ngoài khung
    if (py < boxTop - 150 || py > boxBottom + 150) {
      inPath = false;
      continue;
    }

    if (!inPath) {
      pathD += ` M ${px.toFixed(1)} ${py.toFixed(1)}`;
      inPath = true;
    } else {
      pathD += ` L ${px.toFixed(1)} ${py.toFixed(1)}`;
    }
  }

  // Tạo các đường gióng trục nét đứt và các điểm đặc biệt
  let gióngSvg = '';
  let pointsSvg = '';
  const points = config.points || [];

  points.forEach((p) => {
    let yVal = p.y;
    if (yVal === undefined) {
      const computed = evalFn(p.x);
      yVal = isNaN(computed) ? 0 : computed;
    }
    const px = originX + p.x * unitPx;
    const py = originY - yVal * unitPx;

    // Vẽ gióng trục nếu bật isGiongTruc (mặc định bật)
    if (p.isGiongTruc !== false) {
      // Gióng vuông góc xuống trục hoành Ox (từ (px, py) tới (px, originY))
      gióngSvg += `<line x1="${px.toFixed(1)}" y1="${py.toFixed(1)}" x2="${px.toFixed(1)}" y2="${originY}" stroke="${gióngColor}" stroke-width="1.3" stroke-dasharray="3,3"/>`;
      // Gióng vuông góc sang trục tung Oy (từ (px, py) tới (originX, py))
      gióngSvg += `<line x1="${px.toFixed(1)}" y1="${py.toFixed(1)}" x2="${originX}" y2="${py.toFixed(1)}" stroke="${gióngColor}" stroke-width="1.3" stroke-dasharray="3,3"/>`;

      // Giá trị chân đường gióng trên trục Ox
      const lblX = p.labelX || String(p.x);
      gióngSvg += `<text x="${px.toFixed(1)}" y="${originY + (yVal >= 0 ? 15 : -6)}" text-anchor="middle" font-size="11" font-weight="bold" fill="${textColor}">${lblX}</text>`;

      // Giá trị chân đường gióng trên trục Oy
      const lblY = p.labelY || String(Math.round(yVal * 100) / 100);
      gióngSvg += `<text x="${originX - (p.x >= 0 ? 6 : -6)}" y="${(py + 4).toFixed(1)}" text-anchor="${p.x >= 0 ? 'end' : 'start'}" font-size="11" font-weight="bold" fill="${textColor}">${lblY}</text>`;
    }

    // Chấm tròn điểm trên đồ thị
    pointsSvg += `
      <g>
        <circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="4.5" fill="${pointDotColor}" stroke="#ffffff" stroke-width="1.5"/>
        <text x="${(px + 7).toFixed(1)}" y="${(py - 7).toFixed(1)}" font-size="11" font-weight="bold" fill="${textColor}">(${p.x}; ${Math.round(yVal * 100) / 100})</text>
      </g>
    `;
  });

  const axisXName = config.axisNameX || 'x';
  const axisYName = config.axisNameY || 'y';

  return `
    <div class="w-full flex justify-center my-2 bg-transparent p-0 border-0 outline-none select-none">
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" class="max-w-full bg-transparent overflow-visible">
        <defs>
          <!-- CLIPPATH: Giới hạn đồ thị nằm gọn ghẽ bên trong khung hình chữ nhật từ đầu trục đến cuối trục (không vẽ thừa ra ngoài) -->
          <clipPath id="${clipId}">
            <rect x="${boxLeft}" y="${boxTop}" width="${boxWidth}" height="${boxHeight}" rx="4"/>
          </clipPath>
        </defs>

        <!-- Khung hình chữ nhật bao quanh từ đầu trục đến cuối trục -->
        <rect x="${boxLeft}" y="${boxTop}" width="${boxWidth}" height="${boxHeight}" fill="none" stroke="${frameColor}" stroke-width="1.2" stroke-dasharray="3,3" rx="4"/>

        <!-- Lưới trục (nằm trong khung chữ nhật) -->
        <g clip-path="url(#${clipId})">
          ${gridLines}
        </g>

        <!-- Trục hoành Ox -->
        <line x1="${boxLeft}" y1="${originY}" x2="${boxRight + 14}" y2="${originY}" stroke="${axisColor}" stroke-width="1.8"/>
        <polygon points="${boxRight + 18},${originY} ${boxRight + 8},${originY - 4.5} ${boxRight + 8},${originY + 4.5}" fill="${axisColor}"/>
        <text x="${boxRight + 10}" y="${originY - 8}" font-size="14" font-style="italic" font-weight="bold" fill="${textColor}">${axisXName}</text>

        <!-- Trục tung Oy -->
        <line x1="${originX}" y1="${boxBottom}" x2="${originX}" y2="${boxTop - 14}" stroke="${axisColor}" stroke-width="1.8"/>
        <polygon points="${originX},${boxTop - 18} ${originX - 4.5},${boxTop - 8} ${originX + 4.5},${boxTop - 8}" fill="${axisColor}"/>
        <text x="${originX + 10}" y="${boxTop - 10}" font-size="14" font-style="italic" font-weight="bold" fill="${textColor}">${axisYName}</text>

        <!-- Gốc tọa độ O -->
        <text x="${originX - 14}" y="${originY + 16}" font-size="13" font-style="italic" font-weight="bold" fill="${textColor}">O</text>

        <!-- Đường Đồ thị (Được clipPath đóng gói hoàn toàn bên trong khung chữ nhật, không vẽ thừa ra ngoài) -->
        <g clip-path="url(#${clipId})">
          <path d="${pathD}" fill="none" stroke="${curveColor}" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>
          ${gióngSvg}
          ${pointsSvg}
        </g>
      </svg>
    </div>
  `;
}

function generateMathBbtHtml(funcExpr: string, title?: string): string {
  const cleanExpr = funcExpr.trim();
  return `
    <div class="my-2 p-4 bg-slate-950/90 rounded-2xl border border-teal-500/30 text-white">
      <div class="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
        <h5 class="text-sm font-extrabold text-teal-300">📊 ${title || `Bảng biến thiên: y = ${cleanExpr}`}</h5>
        <span class="text-[11px] font-mono px-2 py-0.5 rounded bg-teal-950 text-teal-200 border border-teal-800">Khảo sát y = ${cleanExpr}</span>
      </div>
      <div class="overflow-x-auto py-2">
        <table class="w-full text-center border-collapse border border-slate-700 text-sm font-mono bg-slate-900 rounded-xl overflow-hidden">
          <tbody>
            <tr class="border-b border-slate-700 bg-slate-800/80">
              <td class="w-16 p-2 font-bold text-slate-300 border-r border-slate-700 italic">x</td>
              <td class="p-2 text-slate-300">-&infin;</td>
              <td class="p-2 text-teal-300 font-bold">x_1</td>
              <td class="p-2 text-slate-300">...</td>
              <td class="p-2 text-teal-300 font-bold">x_2</td>
              <td class="p-2 text-slate-300">+&infin;</td>
            </tr>
            <tr class="border-b border-slate-700 bg-slate-900">
              <td class="w-16 p-2 font-bold text-slate-300 border-r border-slate-700 italic">y'</td>
              <td class="p-2 text-emerald-400 font-extrabold">+</td>
              <td class="p-2 text-slate-400 font-bold">0</td>
              <td class="p-2 text-rose-400 font-extrabold">-</td>
              <td class="p-2 text-slate-400 font-bold">0</td>
              <td class="p-2 text-emerald-400 font-extrabold">+</td>
            </tr>
            <tr class="bg-slate-950/60">
              <td class="w-16 p-3 font-bold text-slate-300 border-r border-slate-700 italic align-middle">y</td>
              <td class="p-3 text-slate-400 align-bottom">-&infin;</td>
              <td class="p-3 text-yellow-300 font-bold align-top">
                <div class="flex flex-col items-center">
                  <span class="text-xs text-emerald-400">&nearr; (CĐ)</span>
                  <span>y_1</span>
                </div>
              </td>
              <td class="p-3 text-slate-400 align-middle">&searr;</td>
              <td class="p-3 text-cyan-300 font-bold align-bottom">
                <div class="flex flex-col items-center">
                  <span>y_2</span>
                  <span class="text-xs text-rose-400">&searr; (CT)</span>
                </div>
              </td>
              <td class="p-3 text-slate-400 align-top">
                <div class="flex flex-col items-center">
                  <span class="text-xs text-emerald-400">&nearr;</span>
                  <span>+&infin;</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="text-[11px] text-slate-400 italic mt-2">💡 Gợi ý: Giáo viên dùng bút vẽ phấn trực tiếp lên bảng để điền giá trị cực trị và nghiệm cụ thể vào các vị trí x₁, x₂, y₁, y₂.</p>
    </div>
  `;
}

export const A4_WIDTH_PX = 1122.52;

interface WritingZoneProps {
  block: TeachingBlock;
  isActive: boolean;
  activeTool: 'none' | 'pen' | 'highlighter' | 'eraser' | 'laser';
  penColor: string;
  penWidth: number;
  penType: PenType;
  boardStyle: BoardStyle;
  boardScale: number;
  onSelect: () => void;
  onUpdateBlock: (id: string, updates: Partial<TeachingBlock>) => void;
  onDeleteBlock: (id: string) => void;
  onClearStrokes: (id: string) => void;
  onCaptureImage: (id: string) => void;
}

const WritingZoneComponent: React.FC<WritingZoneProps> = ({
  block,
  isActive,
  activeTool,
  penColor,
  penWidth,
  penType,
  boardStyle,
  boardScale,
  onSelect,
  onUpdateBlock,
  onDeleteBlock,
  onClearStrokes,
  onCaptureImage,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [currentPoints, setCurrentPoints] = useState<Array<{ x: number; y: number }>>([]);

  const zoneWidth = block.zoneWidth || A4_WIDTH_PX;
  const zoneHeight = block.zoneHeight || 280;
  const strokes = block.zoneStrokes || [];
  const isLocked = block.isLocked || false;

  // Vẽ lại canvas khi nét thay đổi hoặc đang vẽ dở bằng thuật toán nét bút sắc sảo Scrble Ink
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Vẽ toàn bộ các nét đã lưu bằng thuật toán nét bút sắc sảo
    strokes.forEach((stroke) => {
      drawSingleStroke(ctx, stroke);
    });

    // Vẽ nét đang vẽ dở bằng thuật toán nét bút sắc sảo
    if (currentPoints.length >= 2) {
      const activeStrokeType: PenType =
        activeTool === 'highlighter'
          ? penType.startsWith('highlighter')
            ? penType
            : 'highlighter_chisel'
          : penType;

      drawSingleStroke(ctx, {
        id: 'drawing_temp',
        points: currentPoints,
        color: activeTool === 'highlighter' ? 'rgba(254, 240, 138, 0.45)' : penColor,
        width: activeTool === 'highlighter' ? Math.max(penWidth * 3, 14) : penWidth,
        penType: activeStrokeType,
      });
    }
  }, [strokes, currentPoints, activeTool, penColor, penWidth, penType]);

  // Tọa độ chuột chuẩn hóa theo scale
  const getPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scale = boardScale || 1;
    return {
      x: (e.clientX - rect.left) / scale,
      y: (e.clientY - rect.top) / scale,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    onSelect();
    if (isLocked) return;

    const pos = getPos(e);
    if (activeTool === 'pen' || activeTool === 'highlighter') {
      setIsDrawing(true);
      setCurrentPoints([pos]);
    } else if (activeTool === 'eraser') {
      // Tẩy nét trong bán kính 18px
      const remainingStrokes = strokes.filter(
        (st) => !st.points.some((p) => Math.hypot(p.x - pos.x, p.y - pos.y) < 18)
      );
      if (remainingStrokes.length !== strokes.length) {
        onUpdateBlock(block.id, { zoneStrokes: remainingStrokes });
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isLocked) return;
    const pos = getPos(e);

    if (activeTool === 'eraser') {
      const remainingStrokes = strokes.filter(
        (st) => !st.points.some((p) => Math.hypot(p.x - pos.x, p.y - pos.y) < 18)
      );
      if (remainingStrokes.length !== strokes.length) {
        onUpdateBlock(block.id, { zoneStrokes: remainingStrokes });
      }
      return;
    }

    if (!isDrawing) return;

    if (activeTool === 'pen' || activeTool === 'highlighter') {
      setCurrentPoints((prev) => [...prev, pos]);

      // TỰ ĐỘNG THÊM KHOẢNG TRỐNG KHI THIẾU ĐỂ KHÔNG BỊ TRÀN RA NGOÀI (Yêu cầu người dùng)
      // Khi nét bút chạm gần đáy (< 35px), tự động nới thêm 120px và khối chiếu tiếp theo tự động trôi xuống liền kề!
      if (pos.y > zoneHeight - 35) {
        onUpdateBlock(block.id, { zoneHeight: zoneHeight + 120 });
      }
    }
  };

  const handleMouseUp = () => {
    if (isDrawing && (activeTool === 'pen' || activeTool === 'highlighter') && currentPoints.length >= 2) {
      const activeStrokeType: PenType =
        activeTool === 'highlighter'
          ? penType.startsWith('highlighter')
            ? penType
            : 'highlighter_chisel'
          : penType;

      const newStroke: DrawStroke = {
        id: `zst_${Date.now()}`,
        points: currentPoints,
        color: activeTool === 'highlighter' ? 'rgba(254, 240, 138, 0.45)' : penColor,
        width: activeTool === 'highlighter' ? Math.max(penWidth * 3, 14) : penWidth,
        penType: activeStrokeType,
      };
      onUpdateBlock(block.id, { zoneStrokes: [...strokes, newStroke] });
    }
    setIsDrawing(false);
    setCurrentPoints([]);
  };

  // LỀ TRÊN: Kéo mở rộng / thu hẹp chiều dọc từ lề trên
  const handleDragTopStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onSelect();
    const startY = e.clientY;
    const initialH = zoneHeight;
    const scale = boardScale || 1;

    const handleMouseMoveDoc = (moveEvent: MouseEvent) => {
      const dy = (startY - moveEvent.clientY) / scale;
      const newH = Math.max(80, Math.round(initialH + dy));
      onUpdateBlock(block.id, { zoneHeight: newH });
    };

    const handleMouseUpDoc = () => {
      window.removeEventListener('mousemove', handleMouseMoveDoc);
      window.removeEventListener('mouseup', handleMouseUpDoc);
    };

    window.addEventListener('mousemove', handleMouseMoveDoc);
    window.addEventListener('mouseup', handleMouseUpDoc);
  };

  // LỀ DƯỚI: Kéo mở rộng / thu hẹp chiều dọc từ lề dưới
  const handleDragBottomStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onSelect();
    const startY = e.clientY;
    const initialH = zoneHeight;
    const scale = boardScale || 1;

    const handleMouseMoveDoc = (moveEvent: MouseEvent) => {
      const dy = (moveEvent.clientY - startY) / scale;
      const newH = Math.max(80, Math.round(initialH + dy));
      onUpdateBlock(block.id, { zoneHeight: newH });
    };

    const handleMouseUpDoc = () => {
      window.removeEventListener('mousemove', handleMouseMoveDoc);
      window.removeEventListener('mouseup', handleMouseUpDoc);
    };

    window.addEventListener('mousemove', handleMouseMoveDoc);
    window.addEventListener('mouseup', handleMouseUpDoc);
  };

  return (
    <div
      data-teaching-block={block.id}
      data-block-type="vungVietTay"
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      style={{
        width: '100%',
        minHeight: `${zoneHeight}px`,
      }}
      className={`relative w-full transition-all select-none group/zone my-3 border-y-2 border-dashed rounded-xl ${
        isActive
          ? 'border-indigo-400 bg-indigo-500/10 shadow-lg'
          : 'border-indigo-400/60 bg-indigo-500/5 hover:border-indigo-400 hover:bg-indigo-500/10'
      }`}
    >
      {/* 1. LỀ TRÊN: Kéo mở rộng/thu hẹp theo chiều dọc */}
      {!isLocked && (
        <div
          onMouseDown={handleDragTopStart}
          className="absolute -top-3 left-0 right-0 h-6 flex items-center justify-center cursor-ns-resize group/edge-top z-30 select-none pointer-events-auto"
          title="Kéo lề trên để mở rộng hoặc thu hẹp chiều dọc (^V)"
        >
          <div className="w-full h-0.5 bg-indigo-500/60 group-hover/edge-top:bg-indigo-400 group-hover/edge-top:h-1 transition-all" />
          <div className="absolute p-1 bg-slate-950/95 text-indigo-300 hover:text-white rounded-full border border-indigo-400 shadow-xl flex items-center justify-center transition-all backdrop-blur-md">
            <ChevronsUpDown className="w-3.5 h-3.5" />
          </div>
        </div>
      )}

      {/* 2. LỀ DƯỚI: Kéo mở rộng/thu hẹp theo chiều dọc */}
      {!isLocked && (
        <div
          onMouseDown={handleDragBottomStart}
          className="absolute -bottom-3 left-0 right-0 h-6 flex items-center justify-center cursor-ns-resize group/edge-bot z-30 select-none pointer-events-auto"
          title="Kéo lề dưới để mở rộng hoặc thu hẹp chiều dọc (^V)"
        >
          <div className="w-full h-0.5 bg-indigo-500/60 group-hover/edge-bot:bg-indigo-400 group-hover/edge-bot:h-1 transition-all" />
          <div className="absolute p-1 bg-slate-950/95 text-indigo-300 hover:text-white rounded-full border border-indigo-400 shadow-xl flex items-center justify-center transition-all backdrop-blur-md">
            <ChevronsUpDown className="w-3.5 h-3.5" />
          </div>
        </div>
      )}

      {/* NÚT NẰM TRÊN LỀ TRÁI CỦA CỬA SỔ TRÌNH CHIẾU GIÁO VIÊN */}
      {!isLocked && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute -left-12 sm:-left-16 top-0 bottom-0 flex flex-col items-center justify-between py-1 z-30 select-none pointer-events-auto"
        >
          {/* Cụm Nút Thay Đổi Vùng Viết Tay Nằm Ở Lề Trái */}
          <div className="flex flex-col items-center gap-1.5 p-1.5 bg-slate-950/95 border border-indigo-500/70 rounded-2xl shadow-2xl backdrop-blur-md text-white opacity-0 group-hover/zone:opacity-100 hover:opacity-100 transition-opacity">
            {/* 1. Tay Nắm Kéo Thay Đổi Chiều Cao Vùng Viết (Drag Height Handle) */}
            <div
              onMouseDown={handleDragTopStart}
              className="p-1.5 text-indigo-300 hover:text-white hover:bg-indigo-500/30 rounded-xl cursor-ns-resize transition-all active:scale-95 group/handle relative"
              title="Kéo lên/xuống để thay đổi độ cao vùng viết"
            >
              <GripVertical className="w-4 h-4" />
            </div>

            <div className="w-5 h-px bg-slate-800" />

            {/* 2. Nút Bấm Nhanh Tăng Độ Cao (+120px) */}
            <button
              type="button"
              onClick={() => onUpdateBlock(block.id, { zoneHeight: zoneHeight + 120 })}
              className="p-1 hover:bg-indigo-600/30 text-indigo-300 hover:text-white rounded-lg transition-colors cursor-pointer"
              title="Mở rộng thêm chiều cao"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>

            {/* 3. Nút Bấm Nhanh Thu Bớt Độ Cao (-80px) */}
            <button
              type="button"
              onClick={() => onUpdateBlock(block.id, { zoneHeight: Math.max(120, zoneHeight - 80) })}
              className="p-1 hover:bg-indigo-600/30 text-indigo-300 hover:text-white rounded-lg transition-colors cursor-pointer"
              title="Thu bớt chiều cao"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>

            <div className="w-5 h-px bg-slate-800" />

            {/* 4. Chụp Ảnh */}
            <button
              type="button"
              onClick={() => onCaptureImage(block.id)}
              className="p-1 text-sky-400 hover:text-white hover:bg-sky-500/20 rounded-lg transition-colors cursor-pointer"
              title="Chụp ảnh vùng viết"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>

            {/* 5. Xóa Nét */}
            <button
              type="button"
              onClick={() => onClearStrokes(block.id)}
              className="p-1 text-amber-400 hover:text-white hover:bg-amber-500/20 rounded-lg transition-colors cursor-pointer"
              title="Xóa nét vẽ"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* 6. Khóa Vùng */}
            <button
              type="button"
              onClick={() => onUpdateBlock(block.id, { isLocked: true })}
              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Khóa vùng"
            >
              <Lock className="w-3.5 h-3.5" />
            </button>

            {/* 7. Xóa Vùng */}
            <button
              type="button"
              onClick={() => onDeleteBlock(block.id)}
              className="p-1 text-rose-400 hover:text-white hover:bg-rose-500/20 rounded-lg transition-colors cursor-pointer"
              title="Xóa vùng"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Lớp Canvas Của Riêng Vùng Viết Tay */}
      <div className="relative w-full" style={{ height: `${zoneHeight}px` }}>
        <canvas
          ref={canvasRef}
          width={zoneWidth}
          height={zoneHeight}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ width: `${zoneWidth}px`, height: `${zoneHeight}px` }}
          className={`absolute top-0 left-0 w-full h-full ${
            isLocked
              ? 'pointer-events-none'
              : activeTool === 'none'
              ? 'cursor-pointer'
              : activeTool === 'eraser'
              ? 'cursor-cell'
              : 'cursor-crosshair'
          }`}
        />
      </div>
    </div>
  );
};

export const DayHocInteractiveView: React.FC = () => {
  const [mode, setMode] = useState<'trucTiep' | 'trucTuyen'>('trucTiep');
  const [boardStyle, setBoardStyle] = useState<BoardStyle>('green_grid');
  const [documents, setDocuments] = useState<TeacherDocument[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');

  // Quản lý Phân cấp Cấu trúc Tài liệu & Nội dung dạy học (Đồng bộ Bố trí & Logic với trang Tài liệu)
  const [title, setTitle] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [grade, setGrade] = useState<string>('');
  const [chuong, setChuong] = useState<string>('');
  const [bai, setBai] = useState<string>('');
  const [vanDe, setVanDe] = useState<string>('');
  const [chuyenDe, setChuyenDe] = useState<string>('');

  // Trạng thái Thu nhỏ / Mở rộng khung chọn Cấu trúc Tài liệu & Bài dạy
  const [isCollapsedSelector, setIsCollapsedSelector] = useState<boolean>(false);

  // Nút Tiến Trình Dạy Học (Kiến thức -> Luyện tập -> Kiểm tra đánh giá -> Cải thiện)
  const [activeTienTrinh, setActiveTienTrinh] = useState<'kienThuc' | 'luyenTap' | 'kiemTra' | 'caiThien'>('kienThuc');
  const [selectedSubItemName, setSelectedSubItemName] = useState<string>('');

  // Lớp & Học sinh được phép tham gia Live
  const [studentCanDraw, setStudentCanDraw] = useState<boolean>(false);

  // Danh sách các Khối Nội Dung đã được chiếu/đẩy lên Bảng Giảng Cuộn Vô Hạn
  const [canvasBlocks, setCanvasBlocks] = useState<TeachingBlock[]>([]);

  // Chỉ số Slide và Hiệu ứng hiện tại
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(1);
  const [currentEffectIndex, setCurrentEffectIndex] = useState<number>(1);
  const totalSlides = 5;
  const totalEffectsPerSlide = 3;

  // CÔNG CỤ LIVE DRAWING TRÊN BẢNG GIẢNG (SCRBLE INK CHUẨN)
  const [penColor, setPenColor] = useState<string>('#4a0072'); // Mặc định màu tím thẫm như hình mẫu Scrble Ink
  const [penWidth, setPenWidth] = useState<number>(4);
  const [penType, setPenType] = useState<PenType>('calligraphy'); // Bút Calligraphy mặc định theo yêu cầu người dùng
  const [activeTool, setActiveTool] = useState<'none' | 'pen' | 'highlighter' | 'eraser' | 'laser'>('none');
  const [activeZoneId, setActiveZoneId] = useState<string | null>(null);

  // Danh sách nét vẽ lưu trữ trên Bảng
  const [boardStrokes, setBoardStrokes] = useState<DrawStroke[]>([]);
  const [redoStrokes, setRedoStrokes] = useState<DrawStroke[]>([]);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [currentStrokePoints, setCurrentStrokePoints] = useState<Array<{ x: number; y: number }>>([]);
  const [laserPos, setLaserPos] = useState<{ x: number; y: number } | null>(null);

  // Chiều cao không gian mở rộng kéo dài phía dưới để viết bài
  const [extraBoardHeight, setExtraBoardHeight] = useState<number>(600);

  // Trạng thái ô chạy theo cây bút để đặt lề trên vùng viết bài dạy
  const [isPlacingZone, setIsPlacingZone] = useState<boolean>(false);
  const [ghostZoneY, setGhostZoneY] = useState<number | null>(null);

  // Tạo hoặc kích hoạt Vùng Viết Tay (Giải pháp 2) ngay khi kích hoạt bút viết
  const ensureWritingZone = useCallback((forceNew = false) => {
    setCanvasBlocks((prev) => {
      if (!forceNew) {
        const lastZone = [...prev].reverse().find((b) => b.type === 'vungVietTay');
        if (lastZone && !lastZone.isLocked) {
          setActiveZoneId(lastZone.id);
          return prev;
        }
      }

      const newId = `zone_${Date.now()}`;
      const newZoneBlock: TeachingBlock = {
        id: newId,
        type: 'vungVietTay',
        title: '✍️ Vùng Viết Tay Giảng Dạy',
        content: '',
        subContent: 'Vùng viết tay tương tác tự do',
        zoneWidth: A4_WIDTH_PX,
        zoneHeight: 280,
        zoneOffsetX: 0,
        zoneOffsetY: 0,
        zoneStrokes: [],
        isLocked: false,
      };

      setTimeout(() => {
        setActiveZoneId(newId);
        if (boardContainerRef.current) {
          boardContainerRef.current.scrollTo({
            top: boardContainerRef.current.scrollHeight,
            behavior: 'smooth',
          });
        }
      }, 50);

      return [...prev, newZoneBlock];
    });
  }, []);

  const handleSelectTool = (tool: 'none' | 'pen' | 'highlighter' | 'eraser' | 'laser') => {
    setActiveTool(tool);
    if (tool === 'pen' || tool === 'highlighter') {
      // Khi chọn/kích ngòi bút: Luôn hiện vùng ô chạy theo cây bút để giáo viên đặt góc trên vùng viết bài
      setIsPlacingZone(true);
    } else {
      setIsPlacingZone(false);
      setGhostZoneY(null);
    }
  };

  const handleUpdateZoneBlock = (id: string, updates: Partial<TeachingBlock>) => {
    setCanvasBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...updates } : b))
    );
  };

  const handleDeleteZoneBlock = (id: string) => {
    setCanvasBlocks((prev) => prev.filter((b) => b.id !== id));
    if (activeZoneId === id) setActiveZoneId(null);
  };

  const handleClearZoneStrokes = (id: string) => {
    setCanvasBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, zoneStrokes: [] } : b))
    );
  };



  const handleCaptureZoneImage = (id: string) => {
    const targetBlock = canvasBlocks.find((b) => b.id === id);
    if (!targetBlock || !targetBlock.zoneStrokes || targetBlock.zoneStrokes.length === 0) return;
    const w = targetBlock.zoneWidth || 1040;
    const h = targetBlock.zoneHeight || 280;
    const offCanvas = document.createElement('canvas');
    offCanvas.width = w;
    offCanvas.height = h;
    const offCtx = offCanvas.getContext('2d');
    if (!offCtx) return;
    targetBlock.zoneStrokes.forEach((st) => drawSingleStroke(offCtx, st));
    const dataUrl = offCanvas.toDataURL('image/png');
    handleUpdateZoneBlock(id, { imageUrl: dataUrl });
  };

  // Refs cho Canvas HTML5 Overlay
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const boardContainerRef = useRef<HTMLDivElement | null>(null);

  // Danh sách học sinh gửi ảnh bài làm Live
  const [incomingStudentPhotos, setIncomingStudentPhotos] = useState<
    Array<{
      id: string;
      studentName: string;
      studentCode: string;
      imageUrl: string;
      time: string;
      exerciseName: string;
    }>
  >([
    {
      id: 'sub_01',
      studentName: 'Nguyễn Văn An',
      studentCode: 'HS-1201',
      imageUrl: 'https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?w=600&auto=format&fit=crop&q=80',
      time: '10:15',
      exerciseName: 'Ví dụ 1: Tìm m để hàm số đơn điệu trên khoảng (-2; 2)',
    },
    {
      id: 'sub_02',
      studentName: 'Trần Thị Bình',
      studentCode: 'HS-1202',
      imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80',
      time: '10:18',
      exerciseName: 'Ví dụ 2: Tìm cực trị của hàm chứa dấu giá trị tuyệt đối',
    },
  ]);

  const tvWindowRef = useRef<Window | null>(null);
  const streamCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cursorPosRef = useRef<{ x: number; y: number; isVisible: boolean }>({ x: 0, y: 0, isVisible: false });

  // Khóa cứng chiều ngang A4 (297mm tương đương 1122.52px tại 96 DPI)
  const A4_WIDTH_PX = 1122.52;
  const outerBoardWrapperRef = useRef<HTMLDivElement>(null);
  const [boardScale, setBoardScale] = useState<number>(1);

  // Tự động thu nhỏ / phóng to để khung A4 luôn vừa khít 100% chiều ngang cửa sổ trình chiếu
  useEffect(() => {
    const updateScale = () => {
      if (outerBoardWrapperRef.current) {
        const availableW = outerBoardWrapperRef.current.clientWidth;
        if (availableW > 0) {
          setBoardScale(availableW / A4_WIDTH_PX);
        }
      }
    };

    updateScale();
    const ro = new ResizeObserver(updateScale);
    if (outerBoardWrapperRef.current) {
      ro.observe(outerBoardWrapperRef.current);
    }
    window.addEventListener('resize', updateScale);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateScale);
    };
  }, []);

  // Render Luồng Live Stream Canvas 100% Pixel-Perfect
  const renderLiveStreamBoardCanvas = useCallback(() => {
    const streamCanvas = streamCanvasRef.current;
    const container = boardContainerRef.current;
    const sourceCanvas = canvasRef.current;
    if (!streamCanvas || !container || !sourceCanvas) return;

    const w = sourceCanvas.width || container.clientWidth || 1000;
    const h = sourceCanvas.height || container.scrollHeight || 800;

    if (streamCanvas.width !== w || streamCanvas.height !== h) {
      streamCanvas.width = w;
      streamCanvas.height = h;
    }

    const ctx = streamCanvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, w, h);

    // 1. Phủ màu & Lưới ô Bảng lớp học 1cm x 1cm
    if (boardStyle === 'green_grid') {
      ctx.fillStyle = '#0a3d2e';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1;
      const step = 38;
      for (let x = 0; x < w; x += step) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y < h; y += step) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
    } else if (boardStyle === 'white_grid') {
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.15)';
      ctx.lineWidth = 1;
      const step = 38;
      for (let x = 0; x < w; x += step) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y < h; y += step) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
    } else if (boardStyle === 'black_grid') {
      ctx.fillStyle = '#111827';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1;
      const step = 38;
      for (let x = 0; x < w; x += step) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y < h; y += step) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
    } else if (boardStyle === 'notebook') {
      ctx.fillStyle = '#fffdf5';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
      ctx.lineWidth = 1;
      const step = 38;
      for (let y = 0; y < h; y += step) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
    } else {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, w, h);
    }

    // 2. Phủ nét vẽ Canvas Bảng gốc chuẩn xác 100%
    ctx.drawImage(sourceCanvas, 0, 0);

    // 3. Vẽ Con trỏ Cây bút Giáo viên thời gian thực
    if (cursorPosRef.current && cursorPosRef.current.isVisible) {
      const { x, y } = cursorPosRef.current;
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.font = 'bold 16px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('✏️', x - 12, y - 10);
      ctx.restore();
    }
  }, [boardStyle]);

  // Đồng bộ nét vẽ Canvas sang Màn hình chiếu TV thứ 2
  const redrawTvCanvas = useCallback(() => {
    renderLiveStreamBoardCanvas();
    if (!tvWindowRef.current || tvWindowRef.current.closed) return;
    const tvDoc = tvWindowRef.current.document;
    const tvCanvas = tvDoc.getElementById('tv-canvas') as HTMLCanvasElement | null;
    const tvContainer = tvDoc.getElementById('tv-container');
    const sourceCanvas = canvasRef.current;
    if (!tvCanvas || !tvContainer || !sourceCanvas) return;

    const tvWidth = Math.max(tvContainer.scrollWidth || tvContainer.clientWidth || 1000, 800);
    const tvHeight = Math.max(tvContainer.scrollHeight || tvContainer.clientHeight || 1000, 600);

    if (Math.abs(tvCanvas.width - tvWidth) > 2 || Math.abs(tvCanvas.height - tvHeight) > 2) {
      tvCanvas.width = tvWidth;
      tvCanvas.height = tvHeight;
    }

    const ctx = tvCanvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, tvCanvas.width, tvCanvas.height);

    const srcWidth = sourceCanvas && sourceCanvas.width > 0 ? sourceCanvas.width : (boardContainerRef.current?.clientWidth || tvWidth);
    const srcHeight = sourceCanvas && sourceCanvas.height > 0 ? sourceCanvas.height : (boardContainerRef.current?.scrollHeight || tvHeight);

    const scaleX = tvWidth / srcWidth;
    const scaleY = tvHeight / srcHeight;

    boardStrokes.forEach((stroke) => {
      if (stroke.points.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = Math.max(1.5, stroke.width * scaleX);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.moveTo(stroke.points[0].x * scaleX, stroke.points[0].y * scaleY);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x * scaleX, stroke.points[i].y * scaleY);
      }
      ctx.stroke();
    });

    if (currentStrokePoints.length >= 2) {
      ctx.beginPath();
      ctx.strokeStyle = penColor;
      ctx.lineWidth = Math.max(1.5, penWidth * scaleX);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.moveTo(currentStrokePoints[0].x * scaleX, currentStrokePoints[0].y * scaleY);
      for (let i = 1; i < currentStrokePoints.length; i++) {
        ctx.lineTo(currentStrokePoints[i].x * scaleX, currentStrokePoints[i].y * scaleY);
      }
      ctx.stroke();
    }
  }, [boardStrokes, currentStrokePoints, penColor, penWidth, renderLiveStreamBoardCanvas]);

  // Cập nhật vị trí Con Trỏ Cây Bút Giáo Viên chiếu trực tiếp lên Màn hình TV
  const updateTvCursorPos = useCallback((clientX: number, clientY: number, isVisible: boolean) => {
    const container = boardContainerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const isInside = isVisible && clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;

    const scaleX = (container.scrollWidth || A4_WIDTH_PX) / (rect.width || 1);
    const scaleY = (container.clientHeight || 700) / (rect.height || 1);

    const relativeX = (clientX - rect.left) * scaleX;
    const relativeY = (clientY - rect.top) * scaleY;

    const relativeYScroll = relativeY + container.scrollTop;
    cursorPosRef.current = { x: relativeX, y: relativeYScroll, isVisible: isInside };
    renderLiveStreamBoardCanvas();

    if (tvWindowRef.current && !tvWindowRef.current.closed) {
      const tvDoc = tvWindowRef.current.document;
      const tvCursor = tvDoc.getElementById('tv-cursor-pointer');
      const tvContainer = tvDoc.getElementById('tv-container');
      if (tvCursor && tvContainer) {
        if (!isInside) {
          tvCursor.style.display = 'none';
          return;
        }

        const tvRect = tvContainer.getBoundingClientRect();
        const tvScaleX = (tvContainer.scrollWidth || A4_WIDTH_PX) / A4_WIDTH_PX;
        const tvX = tvRect.left + relativeX * tvScaleX;
        const tvY = tvRect.top + relativeY * tvScaleX;

        tvCursor.style.display = 'flex';
        tvCursor.style.transform = `translate3d(${tvX}px, ${tvY}px, 0)`;
      }
    }
  }, [renderLiveStreamBoardCanvas]);

  useEffect(() => {
    const loadData = async () => {
      const docs = await getTeacherDocuments();
      setDocuments(docs);
      if (docs.length > 0) {
        setSelectedDocId(docs[0].id);
        const stored = getStoredHierarchy();
        const fresh = buildHierarchyFromDocuments(docs);
        const merged = { ...stored, ...fresh };
        saveStoredHierarchy(merged);
      }

      const cls = await getClasses();
      setClasses(cls);
      if (cls.length > 0) setSelectedClassId(cls[0].id);
    };
    loadData();
  }, []);



  // Cập nhật kích thước Canvas HTML5 theo Bảng Giảng
  const updateCanvasSize = useCallback(() => {
    const canvas = canvasRef.current;
    const container = boardContainerRef.current;
    if (canvas && container) {
      canvas.width = A4_WIDTH_PX;
      const fullHeight = Math.max(container.scrollHeight, 680 + extraBoardHeight);
      canvas.height = fullHeight;
      redrawCanvas();
    }
  }, [extraBoardHeight]);

  useEffect(() => {
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, [canvasBlocks, extraBoardHeight, updateCanvasSize]);

  // Vẽ lại toàn bộ các nét vẽ lên Canvas
  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Vẽ tất cả nét đã lưu bằng thuật toán nét bút sắc sảo Scrble Ink
    boardStrokes.forEach((stroke) => {
      drawSingleStroke(ctx, stroke);
    });

    // Vẽ nét đang kéo chuột vẽ dở bằng thuật toán nét bút sắc sảo
    if (currentStrokePoints.length >= 2) {
      const activeStrokeType: PenType =
        activeTool === 'highlighter'
          ? penType.startsWith('highlighter')
            ? penType
            : 'highlighter_chisel'
          : penType;

      drawSingleStroke(ctx, {
        id: 'drawing_temp_main',
        points: currentStrokePoints,
        color: penColor,
        width: penWidth,
        penType: activeStrokeType,
      });
    }

    // Vẽ chấm đỏ laser nếu đang dùng con trỏ laser
    if (activeTool === 'laser' && laserPos) {
      ctx.beginPath();
      ctx.arc(laserPos.x, laserPos.y, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#f43f5e';
      ctx.shadowColor = '#f43f5e';
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.shadowBlur = 0; // Reset blur
    }
  };



  // Đồng bộ vị trí Cuộn Trang từ Bảng Giảng sang Màn hình TV theo tỷ lệ chuẩn
  const handleBoardScroll = useCallback(() => {
    const container = boardContainerRef.current;
    if (!container || !tvWindowRef.current || tvWindowRef.current.closed) return;
    const sourceCanvas = canvasRef.current;
    const tvDoc = tvWindowRef.current.document;
    const tvContainer = tvDoc.getElementById('tv-container');
    if (!tvContainer) return;

    const tvWidth = tvContainer.scrollWidth || tvContainer.clientWidth || 1;
    const srcWidth = (sourceCanvas && sourceCanvas.width > 0) ? sourceCanvas.width : (container.clientWidth || 1);
    const scaleY = tvWidth / srcWidth;

    const targetScrollTop = container.scrollTop * scaleY;
    tvWindowRef.current.scrollTo({
      top: targetScrollTop,
      behavior: 'auto',
    });
  }, []);

  useEffect(() => {
    redrawCanvas();
    redrawTvCanvas();
  }, [boardStrokes, currentStrokePoints, laserPos, activeTool, penColor, penWidth, redrawTvCanvas]);

  // Sự kiện Chuột / Bút cảm ứng vẽ trên Bảng Giảng (tự động chuẩn hóa theo tỷ lệ zoom fit)
  const getCanvasPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const container = boardContainerRef.current;
    if (!container) return { x: 0, y: 0 };
    const rect = container.getBoundingClientRect();
    const scale = boardScale || 1;
    return {
      x: (e.clientX - rect.left) / scale,
      y: (e.clientY - rect.top) / scale + container.scrollTop,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool === 'none') return;
    const pos = getCanvasPos(e);

    // Khi giáo viên bấm chuột để đặt vị trí lề trên vùng viết bài dạy chạy theo cây bút
    if (isPlacingZone && ghostZoneY !== null) {
      const newZoneBlock: TeachingBlock = {
        id: `zone_${Date.now()}`,
        type: 'vungVietTay',
        title: 'Vùng viết bài dạy',
        content: '',
        subContent: 'Vùng viết bài dạy',
        zoneWidth: A4_WIDTH_PX,
        zoneHeight: 280,
        zoneStrokes: [],
        topOffset: 0,
      };
      setCanvasBlocks((prev) => [...prev, newZoneBlock]);
      setActiveZoneId(newZoneBlock.id);
      setIsPlacingZone(false);
      setGhostZoneY(null);
      return;
    }

    if (activeTool === 'pen' || activeTool === 'highlighter') {
      setIsDrawing(true);
      setCurrentStrokePoints([pos]);
    } else if (activeTool === 'eraser') {
      // Tẩy nét vẽ gần vị trí con trỏ chuột
      setBoardStrokes((prev) =>
        prev.filter((stroke) => {
          return !stroke.points.some((p) => Math.hypot(p.x - pos.x, p.y - pos.y) < 18);
        })
      );
    } else if (activeTool === 'laser') {
      setLaserPos(pos);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getCanvasPos(e);

    // Cập nhật vị trí vùng ô chạy theo cây bút
    if (isPlacingZone) {
      setGhostZoneY(Math.max(10, Math.round(pos.y)));
      return;
    }

    if (activeTool === 'laser') {
      setLaserPos(pos);
      return;
    }

    if (!isDrawing) return;

    if (activeTool === 'pen' || activeTool === 'highlighter') {
      setCurrentStrokePoints((prev) => [...prev, pos]);
    } else if (activeTool === 'eraser') {
      setBoardStrokes((prev) =>
        prev.filter((stroke) => {
          return !stroke.points.some((p) => Math.hypot(p.x - pos.x, p.y - pos.y) < 18);
        })
      );
    }
  };

  const handleMouseUp = () => {
    if (isDrawing && (activeTool === 'pen' || activeTool === 'highlighter') && currentStrokePoints.length >= 2) {
      setBoardStrokes((prev) => [
        ...prev,
        {
          id: `stroke_${Date.now()}`,
          points: currentStrokePoints,
          color: activeTool === 'highlighter' ? (penColor && penColor !== '#000000' ? penColor : '#facc15') : penColor,
          width: activeTool === 'highlighter' ? Math.max(penWidth * 2.5, 12) : penWidth,
          penType: activeTool === 'highlighter' ? (penType.startsWith('highlighter') ? penType : 'highlighter_chisel') : penType,
        },
      ]);
      setRedoStrokes([]); // Xóa ngăn xếp làm lại khi vẽ nét mới
    }
    setIsDrawing(false);
    setCurrentStrokePoints([]);
  };

  // Hoàn tác (Undo) nét vẽ
  const handleUndo = useCallback(() => {
    if (boardStrokes.length === 0) return;
    const last = boardStrokes[boardStrokes.length - 1];
    setRedoStrokes((prev) => [...prev, last]);
    setBoardStrokes((prev) => prev.slice(0, -1));
  }, [boardStrokes]);

  // Làm lại (Redo) nét vẽ
  const handleRedo = useCallback(() => {
    if (redoStrokes.length === 0) return;
    const next = redoStrokes[redoStrokes.length - 1];
    setRedoStrokes((prev) => prev.slice(0, -1));
    setBoardStrokes((prev) => [...prev, next]);
  }, [redoStrokes]);

  // Lắng nghe phím tắt Ctrl+Z (Undo) và Ctrl+Y / Ctrl+Shift+Z (Redo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (['INPUT', 'TEXTAREA'].includes(tag)) return;
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  const handleClearAllStrokes = () => {
    if (boardStrokes.length > 0) {
      setRedoStrokes((prev) => [...prev, ...boardStrokes]);
    }
    setBoardStrokes([]);
    setLaserPos(null);
  };

  // Cấu hình tải bài giảng khi đổi Tiến trình
  const handleSelectTienTrinh = (step: 'kienThuc' | 'luyenTap' | 'kiemTra' | 'caiThien') => {
    setActiveTienTrinh(step);
    const stepNames: Record<string, string> = {
      kienThuc: '1. Kiến thức Trọng tâm (PPT Slide / E-learning)',
      luyenTap: '2. Luyện tập Cố định thứ tự (Phản hồi giải ngay)',
      kiemTra: '3. Kiểm tra Đánh giá (Xáo trộn ngẫu nhiên)',
      caiThien: '4. Cải thiện Khắc phục lỗ hổng kiến thức',
    };

    setCanvasBlocks([
      {
        id: `block_${Date.now()}`,
        type: 'kienThuc',
        title: `📌 Tiến trình: ${stepNames[step]}`,
        content: `• Môn: ${subject || 'Toán'} | Khối: ${grade || 'Khối 10'} | Tài liệu: ${title || 'Chưa chọn'}\n• Cấu trúc: ${chuong || '-'} ➔ ${bai || '-'} ➔ ${vanDe || '-'} ➔ ${chuyenDe || '-'}\n• Đã nạp dữ liệu giảng dạy thuộc tiến trình: ${stepNames[step]}`,
        subContent: `Nội dung sẵn sàng trình chiếu TV & Live App`,
        slideIndex: 1,
        effectIndex: 1,
      },
    ]);
  };

  // Theo dõi vị trí cuối cùng của các khối màn hình và nét vẽ để hiển thị nội dung chiếu tiếp theo bên dưới hàng cuối cùng có nét vẽ vẽ đến
  const calculateNextBlockTopOffset = (): number => {
    const container = boardContainerRef.current;
    if (!container) return 0;

    // 1. Xác định vị trí Y đáy (bottom) của khối nội dung cuối cùng đang hiển thị trên bảng
    const blockElements = container.querySelectorAll<HTMLElement>('[data-teaching-block]');
    if (blockElements.length === 0) return 0;

    const lastEl = blockElements[blockElements.length - 1];
    if (lastEl.getAttribute('data-block-type') === 'vungVietTay') {
      // Vùng viết tay đã xác định độ cao chuẩn mực, khối chiếu tiếp theo bám liền kề ngay bên dưới!
      return 0;
    }
    const containerRect = container.getBoundingClientRect();
    const lastElRect = lastEl.getBoundingClientRect();
    const scale = boardScale || 1;
    const lastBlockBottom = (lastElRect.bottom - containerRect.top) / scale + container.scrollTop;

    // 2. Tìm điểm Y thấp nhất của các nét vẽ liên quan nằm bên dưới (hoặc sát) khối cuối cùng
    let maxStrokeY = 0;
    for (const stroke of boardStrokes) {
      if (!stroke.points || stroke.points.length === 0) continue;
      for (const pt of stroke.points) {
        if (pt.y > lastBlockBottom - 25 && pt.y < lastBlockBottom + 600) {
          if (pt.y > maxStrokeY) {
            maxStrokeY = pt.y;
          }
        }
      }
    }

    // 3. Nếu nét vẽ tràn xuống dưới khối cuối cùng:
    if (maxStrokeY > lastBlockBottom) {
      // Đẩy khối mới xuống sát ngay dưới hàng cuối cùng có nét vẽ vẽ đến (+ 10px đệm tinh tế, chuẩn xác)
      const neededSpacing = Math.ceil(maxStrokeY - lastBlockBottom) + 10;
      return neededSpacing;
    }

    return 0;
  };

  // Tiến trình Chiếu Tuần Tự tiếp theo (tự động theo dõi vị trí nét vẽ để hiển thị dưới nét vẽ)
  const handleAdvanceNextEffectOrSlide = () => {
    let nextEffect = currentEffectIndex + 1;
    let nextSlide = currentSlideIndex;

    if (nextEffect > totalEffectsPerSlide) {
      nextEffect = 1;
      nextSlide = currentSlideIndex + 1;
      if (nextSlide > totalSlides) {
        nextSlide = 1;
      }
    }

    setCurrentEffectIndex(nextEffect);
    setCurrentSlideIndex(nextSlide);

    const topOffset = calculateNextBlockTopOffset();

    // Dồn khối chiếu mới vào sau hàng cuối cùng trên Bảng Giảng (bên dưới hàng cuối cùng có nét vẽ vẽ đến)
    const newBlock: TeachingBlock = {
      id: `block_${Date.now()}`,
      type: nextEffect === 1 ? 'kienThuc' : nextEffect === 2 ? 'viDu' : 'loiGiai',
      title: `📌 Slide ${nextSlide} - Hiệu ứng ${nextEffect}: ${
        nextEffect === 1
          ? 'Kiến thức tiếp theo'
          : nextEffect === 2
          ? `Ví dụ minh họa ${nextSlide}`
          : `Lời giải chi tiết Ví dụ ${nextSlide}`
      }`,
      content:
        nextEffect === 1
          ? '• Công thức tổng quát & Định lý trọng tâm được tự động dồn tiếp lên Bảng Giảng.'
          : nextEffect === 2
          ? `• Cho hàm số y = f(x). Khảo sát sự biến thiên và vẽ đồ thị hàm số trên khoảng xét.`
          : `• Lời giải chi tiết: Ta có f\'(x) = 0 <=> x = x1 hoặc x = x2. Bảng biến thiên kết luận hàm số đạt cực đại tại x1.`,
      subContent: `Chuyên đề: ${chuyenDe || 'Đơn điệu & Cực trị'} | Mốc Slide ${nextSlide} | Hiệu ứng ${nextEffect}/3`,
      slideIndex: nextSlide,
      effectIndex: nextEffect,
      topOffset: topOffset > 0 ? topOffset : undefined,
    };

    setCanvasBlocks((prev) => [...prev, newBlock]);
    syncToTvWindow([...canvasBlocks, newBlock]);

    setTimeout(() => {
      if (boardContainerRef.current) {
        boardContainerRef.current.scrollTo({
          top: boardContainerRef.current.scrollHeight,
          behavior: 'smooth',
        });
      }
    }, 80);
  };

  // Thêm Lời giảng trực tiếp của Giáo viên
  const handleAddTeacherSpeechNote = () => {
    const topOffset = calculateNextBlockTopOffset();
    const speechNote: TeachingBlock = {
      id: `block_speech_${Date.now()}`,
      type: 'ghiChuGiaoVien',
      title: '💬 Ghi chú Lời Giảng của Giáo viên',
      content: '• "Chú ý các em: Lỗi sai phổ biến là quên điều kiện f\'(x) = 0 chỉ xảy ra tại hữu hạn điểm!"',
      subContent: 'Thêm thủ công vào luồng giảng dạy',
      topOffset: topOffset > 0 ? topOffset : undefined,
    };
    setCanvasBlocks((prev) => [...prev, speechNote]);
    syncToTvWindow([...canvasBlocks, speechNote]);
    setTimeout(() => {
      if (boardContainerRef.current) {
        boardContainerRef.current.scrollTo({
          top: boardContainerRef.current.scrollHeight,
          behavior: 'smooth',
        });
      }
    }, 80);
  };

  // Chèn Đồ thị Hàm số trực tiếp từ Menu Lên Lớp (Không viền, đóng gói trong khung chữ nhật, hỗ trợ zoom, sửa tên trục, gióng trục)
  const handleInsertGraph = (config: GraphConfig) => {
    const graphSvg = generateMathGraphSvg(config, boardStyle);
    const topOffset = calculateNextBlockTopOffset();
    const newBlock: TeachingBlock = {
      id: `graph_${Date.now()}`,
      type: 'doThi',
      title: '',
      content: graphSvg,
      subContent: '',
      topOffset: topOffset > 0 ? topOffset : undefined,
    };
    setCanvasBlocks((prev) => {
      const updated = [...prev, newBlock];
      syncToTvWindow(updated);
      return updated;
    });
    setTimeout(() => {
      if (boardContainerRef.current) {
        boardContainerRef.current.scrollTo({
          top: boardContainerRef.current.scrollHeight,
          behavior: 'smooth',
        });
      }
    }, 80);
  };

  // Chèn Bảng biến thiên trực tiếp từ Menu Lên Lớp
  const handleInsertBbt = (funcExpr: string, title?: string) => {
    const bbtHtml = generateMathBbtHtml(funcExpr, title);
    const topOffset = calculateNextBlockTopOffset();
    const newBlock: TeachingBlock = {
      id: `bbt_${Date.now()}`,
      type: 'kienThuc',
      title: title || `📊 Bảng biến thiên y = ${funcExpr}`,
      content: bbtHtml,
      subContent: 'Chèn trực tiếp từ Menu Lên Lớp',
      topOffset: topOffset > 0 ? topOffset : undefined,
    };
    setCanvasBlocks((prev) => {
      const updated = [...prev, newBlock];
      syncToTvWindow(updated);
      return updated;
    });
    setTimeout(() => {
      if (boardContainerRef.current) {
        boardContainerRef.current.scrollTo({
          top: boardContainerRef.current.scrollHeight,
          behavior: 'smooth',
        });
      }
    }, 80);
  };

  // Mở tệp trình chiếu (HTML, PPT, ảnh bài giảng) từ thiết bị
  const handleOpenFileFromDevice = (file: File) => {
    const isImg = file.type.startsWith('image/');
    const topOffset = calculateNextBlockTopOffset();
    if (isImg) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const url = e.target?.result as string;
        const newBlock: TeachingBlock = {
          id: `local_file_${Date.now()}`,
          type: 'kienThuc',
          title: `🖼️ Tệp trình chiếu: ${file.name}`,
          content: `<div class="text-center"><img src="${url}" class="max-h-[500px] mx-auto rounded-xl shadow-lg"/></div>`,
          imageUrl: url,
          subContent: 'Tải lên từ thiết bị giáo viên',
          topOffset: topOffset > 0 ? topOffset : undefined,
        };
        setCanvasBlocks((prev) => {
          const updated = [...prev, newBlock];
          syncToTvWindow(updated);
          return updated;
        });
        setTimeout(() => {
          if (boardContainerRef.current) {
            boardContainerRef.current.scrollTo({
              top: boardContainerRef.current.scrollHeight,
              behavior: 'smooth',
            });
          }
        }, 80);
      };
      reader.readAsDataURL(file);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const newBlock: TeachingBlock = {
          id: `local_file_${Date.now()}`,
          type: 'kienThuc',
          title: `📄 Tệp trình chiếu: ${file.name}`,
          content: text || '',
          subContent: 'Tải lên từ thiết bị giáo viên',
          topOffset: topOffset > 0 ? topOffset : undefined,
        };
        setCanvasBlocks((prev) => {
          const updated = [...prev, newBlock];
          syncToTvWindow(updated);
          return updated;
        });
        setTimeout(() => {
          if (boardContainerRef.current) {
            boardContainerRef.current.scrollTo({
              top: boardContainerRef.current.scrollHeight,
              behavior: 'smooth',
            });
          }
        }, 80);
      };
      reader.readAsText(file);
    }
  };

  // Chữa Bài Chụp Học Sinh gửi sang
  const handleApproveStudentPhoto = (photo: (typeof incomingStudentPhotos)[0]) => {
    const topOffset = calculateNextBlockTopOffset();
    const studentBlock: TeachingBlock = {
      id: `block_student_${Date.now()}`,
      type: 'anhHocSinh',
      title: `📸 Bài làm của học sinh: ${photo.studentName} (${photo.studentCode})`,
      content: `• Bài tập: ${photo.exerciseName}`,
      studentName: photo.studentName,
      imageUrl: photo.imageUrl,
      subContent: `Gửi lúc ${photo.time} - Được Giáo viên đưa lên Bảng để chữa bài`,
      topOffset: topOffset > 0 ? topOffset : undefined,
    };

    setCanvasBlocks((prev) => [...prev, studentBlock]);
    setIncomingStudentPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    syncToTvWindow([...canvasBlocks, studentBlock]);
    setTimeout(() => {
      if (boardContainerRef.current) {
        boardContainerRef.current.scrollTo({
          top: boardContainerRef.current.scrollHeight,
          behavior: 'smooth',
        });
      }
    }, 80);
  };

  // Tự động đồng bộ sang màn hình TV khi thay đổi kiểu bảng hoặc khối bài giảng
  useEffect(() => {
    if (tvWindowRef.current && !tvWindowRef.current.closed) {
      syncToTvWindow(canvasBlocks);
    }
  }, [boardStyle, canvasBlocks]);

  // Mở Cửa Sổ Trình Chiếu Bài Giảng Mới - Full-screen, Floating Toolbar, MathJax, 2 Layers, Nhãn TLN/TNLC/TNDS
  const handleOpenTvDisplay = () => {
    const tvWin = window.open('', 'TvDisplayWindow', 'width=1280,height=720,menubar=no,toolbar=no,location=no');
    if (!tvWin) {
      alert('Vui lòng cho phép Pop-up trên trình duyệt để mở Cửa Sổ Trình Chiếu!');
      return;
    }

    tvWindowRef.current = tvWin;
    tvWin.document.open();
    tvWin.document.write(getPresentationWindowHtml());
    tvWin.document.close();
  };

  // Hàm Tải PDF Bài Dạy (Khổ A4 Ngang) cho học sinh in/xem lại
  const handleExportPdf = () => {
    if (canvasBlocks.length === 0) {
      alert('Chưa có nội dung bài giảng trên Bảng để xuất PDF!');
      return;
    }

    const printWin = window.open('', 'PdfPrintWindow', 'width=1200,height=800');
    if (!printWin) {
      alert('Vui lòng cho phép Pop-up trên trình duyệt để tải PDF!');
      return;
    }

    const pagesHtml = canvasBlocks
      .map((b, idx) => {
        return `
          <div class="a4-landscape-page">
            <div class="page-content">
              <div class="html-teaching-content">
                ${formatBlockContentToHtml(b.content)}
              </div>
              ${
                b.imageUrl
                  ? `<div class="image-wrapper"><img src="${b.imageUrl}" /></div>`
                  : ''
              }
            </div>
            <div class="page-footer">
              <span>LopU • Học Liệu Tương Tác Giảng Dạy</span>
              <span>Trang ${idx + 1} / ${canvasBlocks.length} (Khổ A4 Ngang)</span>
            </div>
          </div>
        `;
      })
      .join('');

    printWin.document.write(`
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="UTF-8">
        <title>Bài Giảng Lớp - Khổ A4 Ngang</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
        <style>
          @page {
            size: A4 landscape;
            margin: 0;
          }
          @media print {
            body { background: white !important; color: black !important; padding: 0 !important; margin: 0 !important; }
            .a4-landscape-page {
              width: 297mm !important;
              min-width: 297mm !important;
              max-width: 297mm !important;
              height: 210mm !important;
              min-height: 210mm !important;
              max-height: 210mm !important;
              page-break-after: always !important;
              break-after: page !important;
              border: none !important;
              margin: 0 !important;
              padding: 15mm !important;
              box-shadow: none !important;
              border-radius: 0 !important;
            }
            .no-print { display: none !important; }
          }
          body {
            font-family: system-ui, -apple-system, sans-serif;
            background-color: #0f172a;
            color: #1e293b;
            padding: 20px;
            margin: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .a4-landscape-page {
            width: 100%;
            max-width: 297mm;
            min-height: 210mm;
            background: #ffffff;
            color: #0f172a;
            padding: 20mm;
            margin-bottom: 20px;
            box-sizing: border-box;
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.3);
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .page-content {
            font-size: 16px;
            line-height: 1.6;
            flex-grow: 1;
          }
          .page-footer {
            border-top: 1px solid #e2e8f0;
            padding-top: 12px;
            margin-top: 20px;
            display: flex;
            justify-content: space-between;
            font-size: 12px;
            color: #64748b;
            font-family: monospace;
          }
          .image-wrapper {
            margin-top: 15px;
            text-align: center;
          }
          .image-wrapper img {
            max-height: 120mm;
            max-width: 100%;
            border-radius: 8px;
            object-contain: contain;
          }
          .html-teaching-content table { border-collapse: collapse; width: 100%; margin: 10px 0; }
          .html-teaching-content td, .html-teaching-content th { border: 1px solid #cbd5e1; padding: 8px; }
          .html-teaching-content p { margin-bottom: 10px; }
        </style>
      </head>
      <body>
        <div class="no-print flex items-center justify-between w-[297mm] mb-4 bg-slate-800 p-4 rounded-xl text-white">
          <div>
            <h2 class="font-bold text-lg text-teal-300">📄 File PDF Bài Dạy Khổ A4 Ngang</h2>
            <p class="text-xs text-slate-300">Bấm "In / Tải PDF" bên phải để lưu tệp PDF hoặc in cho học sinh xem lại.</p>
          </div>
          <button onclick="window.print()" class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-xl shadow-lg cursor-pointer transition-all">
            🖨️ In / Tải PDF ngay
          </button>
        </div>
        ${pagesHtml}
      </body>
      </html>
    `);
    printWin.document.close();
  };

  // Đồng bộ Khối Chiếu sang Màn Hình TV Thứ 2 (Bỏ tiêu đề & mốc chia, chỉ giữ thuần túy nội dung file)
  const syncToTvWindow = (blocks: TeachingBlock[]) => {
    if (tvWindowRef.current && !tvWindowRef.current.closed) {
      const tvBody = tvWindowRef.current.document.getElementById('tv-body');
      if (tvBody) {
        tvBody.className = 
          boardStyle === 'green_grid' ? 'bg-green-grid' :
          boardStyle === 'white_grid' ? 'bg-white-grid' :
          boardStyle === 'black_grid' ? 'bg-black-grid' :
          boardStyle === 'notebook' ? 'bg-notebook' : 'bg-plain';
      }

      const cardBgClass =
        boardStyle === 'green_grid'
          ? 'bg-[#0a3d2e] text-white'
          : boardStyle === 'white_grid'
          ? 'bg-[#f8fafc] text-slate-900'
          : boardStyle === 'black_grid'
          ? 'bg-[#111827] text-slate-100'
          : boardStyle === 'notebook'
          ? 'bg-[#fffdf5] text-slate-900'
          : 'bg-[#0f172a] text-slate-100';

      const contentTextClass =
        boardStyle === 'white_grid' || boardStyle === 'notebook'
          ? "text-lg text-slate-900 leading-relaxed font-sans html-teaching-content [&_p]:mb-3 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_table]:border-collapse [&_table]:w-full [&_td]:border [&_td]:border-slate-300 [&_td]:p-2 [&_th]:border [&_th]:border-slate-300 [&_th]:p-2 [&_strong]:text-indigo-950 [&_b]:text-indigo-950 [&_em]:text-indigo-800"
          : boardStyle === 'green_grid'
          ? "text-lg text-emerald-50 leading-relaxed font-sans html-teaching-content [&_p]:mb-3 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_table]:border-collapse [&_table]:w-full [&_td]:border [&_td]:border-emerald-700/60 [&_td]:p-2 [&_th]:border [&_th]:border-emerald-700/60 [&_th]:p-2 [&_strong]:text-yellow-200 [&_b]:text-yellow-200 [&_em]:text-yellow-100"
          : "text-lg text-slate-100 leading-relaxed font-sans html-teaching-content [&_p]:mb-3 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_table]:border-collapse [&_table]:w-full [&_td]:border [&_td]:border-slate-600 [&_td]:p-2 [&_th]:border [&_th]:border-slate-600 [&_th]:p-2 [&_strong]:text-white [&_b]:text-white [&_em]:text-teal-200";

      const groups = groupTeachingBlocks(blocks);
      const htmlContent = groups
        .map((g) => {
          if (g.isPpt) {
            const innerHtml = g.blocks
              .map(
                (b) => `
                <div class="space-y-3" ${b.topOffset ? `style="margin-top: ${b.topOffset}px;"` : ''} data-teaching-block="${b.id}">
                  <div class="${contentTextClass}">${formatBlockContentToHtml(b.content)}</div>
                  ${
                    b.imageUrl
                      ? `<div class="mt-3"><img src="${b.imageUrl}" class="max-h-96 rounded-xl border object-contain shadow-lg ${
                          boardStyle === 'white_grid' || boardStyle === 'notebook' ? 'border-slate-300' : 'border-slate-600'
                        }" /></div>`
                      : ''
                  }
                </div>
              `
              )
              .join('<div class="my-4"></div>');

            return `
              <div class="p-5 sm:p-6 rounded-3xl w-full box-border ${cardBgClass} space-y-4">
                ${innerHtml}
              </div>
            `;
          }

          return g.blocks
            .map((b) => {
              if (b.type === 'vungVietTay') {
                const zH = b.zoneHeight || 280;
                return `
                  <div class="w-full box-border rounded-2xl relative my-3 border border-dashed border-indigo-400/40 flex items-center justify-center overflow-hidden" style="min-height: ${zH}px;" data-teaching-block="${b.id}" ${b.topOffset ? `style="margin-top: ${b.topOffset}px;"` : ''}>
                    ${b.imageUrl ? `<img src="${b.imageUrl}" class="w-full h-auto max-h-full object-contain rounded-xl" />` : `<div class="text-xs text-indigo-300/60 font-mono italic">✍️ Vùng Viết Tay / Sửa Bài (${zH}px)</div>`}
                  </div>
                `;
              }
              if (b.type === 'doThi') {
                return `<div class="w-full flex justify-center py-2 bg-transparent" ${b.topOffset ? `style="margin-top: ${b.topOffset}px;"` : ''} data-teaching-block="${b.id}">${b.content}</div>`;
              }
              return `
              <div class="p-4 sm:p-5 rounded-2xl w-full box-border ${cardBgClass}" ${b.topOffset ? `style="margin-top: ${b.topOffset}px;"` : ''} data-teaching-block="${b.id}">
                <div class="${contentTextClass}">${formatBlockContentToHtml(b.content)}</div>
                ${
                  b.imageUrl
                    ? `<div class="mt-4"><img src="${b.imageUrl}" class="max-h-96 rounded-xl border object-contain shadow-lg ${
                        boardStyle === 'white_grid' || boardStyle === 'notebook' ? 'border-slate-300' : 'border-slate-600'
                      }" /></div>`
                    : ''
                }
              </div>
            `;
            })
            .join('');
        })
        .join('');

      const tvList = tvWindowRef.current.document.getElementById('tv-blocks-list');
      if (tvList) {
        tvList.innerHTML = htmlContent;
        tvWindowRef.current.scrollTo({
          top: tvWindowRef.current.document.body.scrollHeight,
          behavior: 'smooth',
        });
        setTimeout(() => redrawTvCanvas(), 50);
      }
    }
  };

  const currentCoordinateValue = useMemo(() => ({
    subject,
    grade,
    title,
    chuong,
    bai,
    vanDe,
    chuyenDe,
    tienTrinh: (activeTienTrinh === 'kienThuc' ? 'Kiến thức' : activeTienTrinh === 'luyenTap' ? 'Luyện tập' : activeTienTrinh === 'kiemTra' ? 'KTDG' : 'Cải thiện') as any,
    subItemName: selectedSubItemName,
  }), [subject, grade, title, chuong, bai, vanDe, chuyenDe, activeTienTrinh, selectedSubItemName]);

  const handleCoordinateChange = useCallback((coord: any, _content?: any) => {
    setSubject(coord.subject);
    setGrade(coord.grade);
    setTitle(coord.title);
    setChuong(coord.chuong);
    setBai(coord.bai);
    setVanDe(coord.vanDe);
    setChuyenDe(coord.chuyenDe);
    const step = coord.tienTrinh === 'Kiến thức' ? 'kienThuc' : coord.tienTrinh === 'Luyện tập' ? 'luyenTap' : coord.tienTrinh === 'KTDG' ? 'kiemTra' : 'caiThien';
    setActiveTienTrinh(step);
    setSelectedSubItemName(coord.subItemName || '');

    // Tự động xóa sạch nét vẽ khi thay đổi chuyên đề / tiến trình / tên kiến thức
    setBoardStrokes([]);
    setCurrentStrokePoints([]);

    if (!coord.subItemName || !coord.chuyenDe) {
      setCanvasBlocks([]);
    }
  }, []);

  const handleContentChange = useCallback((contentHtml: string, coord: any) => {
    if (!coord.chuyenDe || !contentHtml || !contentHtml.trim() || !coord.subItemName) {
      // Trường hợp không có file trên Drive hoặc file rỗng: ẩn cửa sổ dạy học
      setCanvasBlocks([]);
      setBoardStrokes([]);
      setCurrentStrokePoints([]);
      return;
    }

    // Tự động xóa sạch nét vẽ cũ khi chuyển sang nội dung bài mới
    setBoardStrokes([]);
    setCurrentStrokePoints([]);

    const step = coord.tienTrinh === 'Kiến thức' ? 'kienThuc' : coord.tienTrinh === 'Luyện tập' ? 'luyenTap' : coord.tienTrinh === 'KTDG' ? 'kiemTra' : 'caiThien';
    setCanvasBlocks([
      {
        id: `block_${Date.now()}`,
        type: step,
        title: `📌 ${coord.chuyenDe} - ${coord.subItemName} (${coord.tienTrinh})`,
        content: contentHtml,
        subContent: `Mốc Slide 1 | ${coord.tienTrinh}`,
        slideIndex: 1,
        effectIndex: 1,
      },
    ]);
  }, []);

  return (
    <div className="w-full space-y-3 pb-8">
      {/* KHUNG CHỌN HỌC LIỆU & TIẾN TRÌNH: Canh giữa max-w-7xl với lề đẹp */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 pt-3 space-y-3">
        {/* SỬ DỤNG MODULE DÙNG CHUNG BoChonHocLieuTienTrinh THAY THẾ TOÀN BỘ CẤU TRÚC ĐÃ CHỌN CŨ */}
        <BoChonHocLieuTienTrinh
          mode="student"
          readOnly={true}
          defaultExpanded={true}
          value={currentCoordinateValue}
          onChange={handleCoordinateChange}
          onContentChange={handleContentChange}
        />

        {/* Thanh Chọn Lớp Học Online khi kích hoạt Chế độ Live */}
        {mode === 'trucTuyen' && (
          <div className="bg-indigo-50/90 p-3 rounded-2xl border border-indigo-200 flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs animate-fade-in">
            <div className="flex items-center gap-2 text-indigo-900 font-extrabold">
              <Users className="w-4 h-4 text-indigo-600" />
              <span>Chọn Lớp Học Online Tham Gia Live:</span>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="px-3 py-1.5 bg-white border border-indigo-300 rounded-xl text-xs font-extrabold text-indigo-950 focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-2xs"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.studentCount} Học sinh)
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setStudentCanDraw(!studentCanDraw)}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                studentCanDraw
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
              }`}
            >
              {studentCanDraw ? <Unlock className="w-3.5 h-3.5 text-white" /> : <Lock className="w-3.5 h-3.5" />}
              <span>{studentCanDraw ? 'Đã cấp quyền HS viết vẽ' : 'Cho phép HS viết lên màn hình'}</span>
            </button>
          </div>
        )}
      </div>

      {/* KHU VỰC CỬA SỔ DẠY HỌC CHÍNH - CHIẾU ĐẦY 100% ĐỘ RỘNG MÀN HÌNH THIẾT BỊ */}
      {canvasBlocks.length > 0 && canvasBlocks.some((b) => b.content && b.content.trim()) && (
        <div className="w-full space-y-2 animate-fade-in">
          {/* MENU LÊN LỚP 2 TẦNG (THANH CHÍNH & THANH PHỤ NGỮ CẢNH) - NỔI STICKY TRÊN CÙNG HOẶC THU GỌN VÀO GÓC PHẢI */}
          <div className="w-full px-2 sm:px-4">
            <MenuLenLop
              mode={mode}
              onToggleMode={() => setMode(mode === 'trucTiep' ? 'trucTuyen' : 'trucTiep')}
              boardStyle={boardStyle}
              onChangeBoardStyle={setBoardStyle}
              onAdvanceNext={handleAdvanceNextEffectOrSlide}
              onAddSpeechNote={handleAddTeacherSpeechNote}
              onClearAllStrokes={handleClearAllStrokes}
              onUndo={handleUndo}
              onRedo={handleRedo}
              canUndo={boardStrokes.length > 0}
              canRedo={redoStrokes.length > 0}
              onOpenTvDisplay={handleOpenTvDisplay}
              onExportPdf={handleExportPdf}
              activeTool={activeTool}
              onChangeTool={handleSelectTool}
              penColor={penColor}
              onChangePenColor={setPenColor}
              penWidth={penWidth}
              onChangePenWidth={setPenWidth}
              penType={penType}
              onChangePenType={setPenType}
              onInsertGraph={handleInsertGraph}
              onInsertBbt={handleInsertBbt}
              onOpenFileFromDevice={handleOpenFileFromDevice}
              classList={classes.map((c) => ({ id: c.id, name: c.name }))}
              incomingStudentPhotos={incomingStudentPhotos}
              onApproveStudentPhoto={handleApproveStudentPhoto}
            />
          </div>

          {/* BẢNG GIẢNG CHUẨN A4 NGANG (1122.52px / 297mm) BỌC LẠI VÀ TỰ ĐỘNG THU NHỎ/PHÓNG TO VỪA KHÍT 100% CHIỀU NGANG MÀN HÌNH MÁY TÍNH/THIẾT BỊ */}
          <div
            ref={outerBoardWrapperRef}
            className={`w-full overflow-hidden relative rounded-none border-y border-slate-700/60 shadow-2xl ${
              boardStyle === 'green_grid'
                ? 'bg-[#0a3d2e]'
                : boardStyle === 'white_grid'
                ? 'bg-slate-50'
                : boardStyle === 'notebook'
                ? 'bg-[#fffdf5]'
                : boardStyle === 'black_grid'
                ? 'bg-[#111827]'
                : 'bg-slate-900'
            }`}
            style={{
              height: `${680 * boardScale}px`,
              width: '100%',
              ...getBoardBackgroundStyle(boardStyle),
            }}
          >
            <div
              style={{
                width: `${A4_WIDTH_PX}px`,
                minWidth: `${A4_WIDTH_PX}px`,
                maxWidth: `${A4_WIDTH_PX}px`,
                transform: `scale(${boardScale})`,
                transformOrigin: 'top left',
              }}
            >
              <div
                ref={boardContainerRef}
                onScroll={handleBoardScroll}
                onMouseMove={(e) => {
                  updateTvCursorPos(e.clientX, e.clientY, true);
                }}
                onMouseEnter={(e) => {
                  updateTvCursorPos(e.clientX, e.clientY, true);
                }}
                onMouseLeave={() => {
                  updateTvCursorPos(0, 0, false);
                }}
                onClick={() => {
                  // Tự động chuyển slide / hiệu ứng nếu đang dùng chế độ PPT Click
                  if (activeTool === 'none') {
                    handleAdvanceNextEffectOrSlide();
                  }
                }}
                style={{
                  ...getBoardBackgroundStyle(boardStyle),
                  width: `${A4_WIDTH_PX}px`,
                  minWidth: `${A4_WIDTH_PX}px`,
                  maxWidth: `${A4_WIDTH_PX}px`,
                  height: '680px',
                }}
                className={`relative mx-auto overflow-y-auto p-4 sm:p-5 space-y-5 transition-all box-border ${getBoardContainerClasses(boardStyle)} ${
                  activeTool !== 'none' ? 'cursor-crosshair' : 'cursor-pointer'
                }`}
              >
            {/* Lề đỏ lề trái trang tập học sinh khi ở chế độ Bảng giấy kẻ ngang */}
            {boardStyle === 'notebook' && (
              <div className="absolute top-0 bottom-0 left-6 w-0.5 bg-rose-400/80 z-10 pointer-events-none" />
            )}

            {/* Lớp Canvas Overlay HTML5 hứng nét vẽ Bút Live */}
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={(e) => {
                handleMouseMove(e);
                updateTvCursorPos(e.clientX, e.clientY, true);
              }}
              onMouseEnter={(e) => {
                updateTvCursorPos(e.clientX, e.clientY, true);
              }}
              onMouseUp={handleMouseUp}
              onMouseLeave={() => {
                handleMouseUp();
                updateTvCursorPos(0, 0, false);
              }}
              onWheel={(e) => {
                // Cho phép cuộn chuột mượt mà ngay cả khi đang cầm bút vẽ
                if (boardContainerRef.current) {
                  boardContainerRef.current.scrollTop += e.deltaY;
                }
              }}
              style={{
                width: `${A4_WIDTH_PX}px`,
                height: `${Math.max(680 + extraBoardHeight, 1800)}px`,
              }}
              className={`absolute top-0 left-0 z-20 pointer-events-${activeTool === 'none' ? 'none' : 'auto'}`}
            />
            {/* Thẻ Offscreen Stream Canvas dùng cho API Live Stream Capture (captureStream 60fps Pixel-Perfect) */}
            <canvas ref={streamCanvasRef} className="hidden" />

            {/* VÙNG Ô CHẠY THEO CÂY BÚT (PREVIEW VÙNG VIẾT BÀI DẠY GÓC TRÊN TẠI VỊ TRÍ CON TRỎ) */}
            {isPlacingZone && ghostZoneY !== null && (
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: `${ghostZoneY}px`,
                  width: `${A4_WIDTH_PX}px`,
                  height: '280px',
                  pointerEvents: 'none',
                  zIndex: 35,
                }}
                className="border-y-2 border-dashed border-indigo-400 bg-indigo-500/15 backdrop-blur-xs flex flex-col justify-between py-1 select-none animate-fade-in"
              >
                {/* Lề trên tại vị trí con trỏ chuột */}
                <div className="w-full flex items-center justify-center">
                  <div className="p-1 bg-slate-950/95 text-indigo-300 rounded-full border border-indigo-400 shadow-xl flex items-center justify-center">
                    <ChevronsUpDown className="w-3.5 h-3.5 animate-bounce" />
                  </div>
                </div>

                {/* Lề dưới */}
                <div className="w-full flex items-center justify-center">
                  <div className="p-1 bg-slate-950/95 text-indigo-300 rounded-full border border-indigo-400 shadow-xl flex items-center justify-center">
                    <ChevronsUpDown className="w-3.5 h-3.5 animate-bounce" />
                  </div>
                </div>
              </div>
            )}

            {/* Các Khối Nội Dung Giảng Dạy Dồn Theo Hàng Cuối Cùng (Lấp đầy 100% chiều ngang) */}
            {/* Các Khối Nội Dung Giảng Dạy Dồn Theo Hàng Cuối Cùng */}
            <div className="relative z-10 space-y-4 w-full box-border">
              {groupTeachingBlocks(canvasBlocks).map((group, gIdx) => {
                if (group.isPpt) {
                  return (
                    <div
                      key={`ppt_group_${gIdx}`}
                      className={`w-full box-border p-5 sm:p-6 rounded-3xl transition-all animate-fade-in space-y-5 ${getBlockCardClasses(boardStyle, 'kienThuc')}`}
                    >
                      {group.blocks.map((block) => (
                        <div
                          key={block.id}
                          data-teaching-block={block.id}
                          style={block.topOffset ? { marginTop: `${block.topOffset}px` } : undefined}
                          className="space-y-3 transition-all"
                        >
                          <div
                            className={getBlockTextClasses(boardStyle)}
                            dangerouslySetInnerHTML={{ __html: formatBlockContentToHtml(block.content) }}
                          />
                          {block.imageUrl && (
                            <div className="mt-3">
                              <img
                                src={block.imageUrl}
                                alt="Minh họa"
                                className="max-h-96 rounded-xl object-contain shadow-md"
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                }

                return group.blocks.map((block) => {
                  // VÙNG SỬA BÀI / VIẾT TAY
                  if (block.type === 'vungVietTay') {
                    return (
                      <WritingZoneComponent
                        key={block.id}
                        block={block}
                        isActive={activeZoneId === block.id}
                        activeTool={activeTool}
                        penColor={penColor}
                        penWidth={penWidth}
                        penType={penType}
                        boardStyle={boardStyle}
                        boardScale={boardScale}
                        onSelect={() => setActiveZoneId(block.id)}
                        onUpdateBlock={handleUpdateZoneBlock}
                        onDeleteBlock={handleDeleteZoneBlock}
                        onClearStrokes={handleClearZoneStrokes}
                        onCaptureImage={handleCaptureZoneImage}
                      />
                    );
                  }

                  // KHỐI ĐỒ THỊ: Hoàn toàn không viền, không chú thích, không thanh tiêu đề
                  if (block.type === 'doThi') {
                    return (
                      <div
                        key={block.id}
                        data-teaching-block={block.id}
                        style={block.topOffset ? { marginTop: `${block.topOffset}px` } : undefined}
                        className="w-full flex justify-center py-2 animate-fade-in bg-transparent border-0 select-none transition-all"
                      >
                        <div dangerouslySetInnerHTML={{ __html: block.content }} />
                      </div>
                    );
                  }

                  return (
                    <div
                      key={block.id}
                      data-teaching-block={block.id}
                      style={block.topOffset ? { marginTop: `${block.topOffset}px` } : undefined}
                      className={`w-full box-border p-4 sm:p-5 rounded-2xl transition-all animate-fade-in ${getBlockCardClasses(boardStyle, block.type)}`}
                    >
                    <div className={`flex items-center justify-between pb-3 mb-3 border-b ${
                      boardStyle === 'white_grid' || boardStyle === 'notebook' ? 'border-slate-200' : 'border-slate-700/60'
                    }`}>
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full animate-ping ${
                          boardStyle === 'green_grid' ? 'bg-yellow-300' : boardStyle === 'white_grid' || boardStyle === 'notebook' ? 'bg-indigo-600' : 'bg-teal-400'
                        }`} />
                        <h4 className={`font-bold text-sm sm:text-base ${
                          boardStyle === 'green_grid' ? 'text-yellow-200' : boardStyle === 'white_grid' || boardStyle === 'notebook' ? 'text-indigo-950 font-sans' : 'text-teal-300'
                        }`}>{block.title}</h4>
                      </div>
                      <span className={`text-xs font-mono px-2.5 py-1 rounded-lg border ${
                        boardStyle === 'green_grid' ? 'bg-[#0a3d2e] text-yellow-100 border-[#1f6d54]' : boardStyle === 'white_grid' || boardStyle === 'notebook' ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-slate-900/60 text-slate-400 border-slate-700/50'
                      }`}>
                        {block.subContent || 'Ghi chú'}
                      </span>
                    </div>

                    <div
                      className={getBlockTextClasses(boardStyle)}
                      dangerouslySetInnerHTML={{ __html: formatBlockContentToHtml(block.content) }}
                    />

                    {block.imageUrl && (
                      <div className={`mt-4 p-2 rounded-2xl border inline-block ${
                        boardStyle === 'white_grid' || boardStyle === 'notebook' ? 'bg-slate-100 border-slate-200' : 'bg-slate-900/80 border-slate-700/80'
                      }`}>
                        <img
                          src={block.imageUrl}
                          alt="Bài làm học sinh"
                          className="max-h-96 rounded-xl object-contain shadow-md"
                        />
                      </div>
                    )}
                    </div>
                  );
                });
              })}
            </div>

            {/* Khoảng đệm chân bảng nhẹ nhàng */}
            <div className="h-12" />
          </div>
        </div>

        {/* Thanh tiện ích nhanh Cuộn Bảng nổi góc dưới bên phải */}
        <div className="absolute bottom-4 right-4 z-30 flex items-center gap-1.5 bg-slate-950/90 border border-slate-700/80 p-1.5 rounded-2xl shadow-2xl backdrop-blur-md">
          <button
            type="button"
            onClick={() => {
              boardContainerRef.current?.scrollBy({ top: -350, behavior: 'smooth' });
            }}
            title="Cuộn bảng lên trên"
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              boardContainerRef.current?.scrollBy({ top: 350, behavior: 'smooth' });
            }}
            title="Cuộn bảng xuống dưới"
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )}
</div>
);
};
