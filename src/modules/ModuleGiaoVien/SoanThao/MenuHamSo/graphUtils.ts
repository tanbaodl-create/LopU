/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { convertMathExprToJs } from '../../TaiLieuCaNhan/TikZVisualRenderer';

export const findExtremaPoints = (
  formula: string,
  varName: string = 'x',
  xMin: number = -3,
  xMax: number = 3
): Array<{ x: number; y: number }> => {
  try {
    const evalMath = convertMathExprToJs(formula, varName);
    const extremaList: Array<{ x: number; y: number }> = [];
    const samples = 150;
    const step = (xMax - xMin) / samples;
    const pts: Array<{ x: number; y: number }> = [];

    for (let x = xMin; x <= xMax + 0.0001; x += step) {
      const yVal = evalMath(x);
      if (!isNaN(yVal) && isFinite(yVal)) {
        pts.push({ x, y: yVal });
      }
    }

    for (let i = 2; i < pts.length - 2; i++) {
      const cur = pts[i];
      const prev = pts[i - 1];
      const next = pts[i + 1];
      if (cur.x <= xMin + 0.08 || cur.x >= xMax - 0.08) continue;

      if ((cur.y > prev.y && cur.y > next.y) || (cur.y < prev.y && cur.y < next.y)) {
        if (!extremaList.some(e => Math.abs(e.x - cur.x) < 0.35)) {
          let cleanX = Number(cur.x.toFixed(2));
          if (Math.abs(cleanX - Math.round(cleanX)) < 0.05) {
            cleanX = Math.round(cleanX);
          }
          let cleanY = Number(cur.y.toFixed(2));
          if (Math.abs(cleanY - Math.round(cleanY)) < 0.05) {
            cleanY = Math.round(cleanY);
          }
          extremaList.push({
            x: cleanX,
            y: cleanY,
          });
        }
      }
    }

    return extremaList;
  } catch {
    return [];
  }
};

export const generateWordGraphSvg = (
  formula: string,
  xMinNum: number,
  xMaxNum: number,
  yMinNum: number,
  yMaxNum: number,
  xLabel: string = 'x',
  yLabel: string = 'y',
  _cleanFormulaForTikz?: string,
  varName: string = 'x',
  extremaList: Array<{ x: number; y: number }> = [],
  graphId: string = `graph-${Date.now()}`,
  userFontSize: number = 16,
  unitX: number = 1,
  unitY: number = 1,
  showAxisLabels: boolean = true,
  showOriginLabel: boolean = true,
  showExtremaLabels: boolean = true,
  requirement: string = ''
): string => {
  const reqLower = (requirement || '').toLowerCase();

  // Phân biệt rõ yêu cầu cho đường gióng vs yêu cầu cho đồ thị hàm số:
  const hasGiong = reqLower.includes('gióng') || reqLower.includes('giong') || reqLower.includes('tọa độ') || reqLower.includes('đường gióng');
  const isReqRed = reqLower.includes('đỏ') || reqLower.includes('red');
  const isReqDashed = reqLower.includes('nét đứt') || reqLower.includes('đứt') || reqLower.includes('dashed');

  // Đồ thị (Curve): Mặc định xanh dương (#2563eb) nét liền
  const isCurveExplicitRed = /đồ thị.*(?:màu\s+)?đỏ|đường cong.*(?:màu\s+)?đỏ|hàm số.*(?:màu\s+)?đỏ/i.test(reqLower) || (isReqRed && !hasGiong);
  const isCurveExplicitDashed = /đồ thị.*(?:nét\s+)?đứt|đường cong.*(?:nét\s+)?đứt|hàm số.*(?:nét\s+)?đứt/i.test(reqLower) || (isReqDashed && !hasGiong);
  const curveColor = isCurveExplicitRed ? '#dc2626' : '#2563eb';
  const curveDashed = isCurveExplicitDashed;

  // Đường gióng (Guidelines):
  const isGuidelineRed = hasGiong && isReqRed;
  const guidelineColor = isGuidelineRed ? '#dc2626' : '#64748b';
  const pointColor = isGuidelineRed ? '#dc2626' : '#1e293b';

  // Tự động tìm điểm cực trị nếu danh sách truyền vào rỗng
  let finalExtrema = [...extremaList];
  if (finalExtrema.length === 0) {
    finalExtrema = findExtremaPoints(formula, varName, xMinNum, xMaxNum);
  }

  // Nếu người dùng nhập điểm cụ thể trong yêu cầu (ví dụ: (1, 2) hoặc (0, -1)):
  const pointMatches = requirement.matchAll(/(?:điểm\s+)?(?:[A-Z]\s*)?\(\s*(-?\d+(?:\.\d+)?)\s*[,;]\s*(-?\d+(?:\.\d+)?)\s*\)/gi);
  for (const match of pointMatches) {
    const px = parseFloat(match[1]);
    const py = parseFloat(match[2]);
    if (!isNaN(px) && !isNaN(py)) {
      if (!finalExtrema.some(e => Math.abs(e.x - px) < 0.1 && Math.abs(e.y - py) < 0.1)) {
        finalExtrema.push({ x: px, y: py });
      }
    }
  }

  const spanX = Math.max(0.2, Math.abs(xMaxNum - xMinNum));
  const spanY = Math.max(0.2, Math.abs(yMaxNum - yMinNum));
  const uX = unitX > 0 ? unitX : 1;
  const uY = unitY > 0 ? unitY : 1;

  // Tự động tính kích thước vùng vẽ đồ thị plotW và plotH theo spanX, spanY và tỉ lệ đơn vị trên 2 trục
  const baseUnitPx = 48;
  const rawPlotW = spanX * uX * baseUnitPx;
  const rawPlotH = spanY * uY * baseUnitPx;

  let scaleFactor = 1;
  if (rawPlotW > 520) scaleFactor = Math.min(scaleFactor, 520 / rawPlotW);
  if (rawPlotH > 420) scaleFactor = Math.min(scaleFactor, 420 / rawPlotH);
  if (rawPlotW < 220 && rawPlotH < 180) scaleFactor = Math.max(scaleFactor, 220 / Math.max(rawPlotW, 1));

  const finalBase = baseUnitPx * scaleFactor;
  const pad = 34;
  const plotW = spanX * uX * finalBase;
  const plotH = spanY * uY * finalBase;
  const svgW = Math.max(200, Math.round(plotW + 2 * pad));
  const svgH = Math.max(160, Math.round(plotH + 2 * pad));

  const toSvgX = (x: number) => pad + ((x - xMinNum) / spanX) * plotW;
  const toSvgY = (y: number) => (svgH - pad) - ((y - yMinNum) / spanY) * plotH;

  const ox = toSvgX(0);
  const oy = toSvgY(0);

  // Tính toán các điểm trên đường cong hàm số bằng hàm JavaScript an toàn
  const evalMath = convertMathExprToJs(formula, varName);
  const pts: Array<{ x: number; y: number }> = [];
  const samples = 120;
  const step = (xMaxNum - xMinNum) / samples;
  for (let x = xMinNum; x <= xMaxNum + 0.0001; x += step) {
    const yVal = evalMath(x);
    if (!isNaN(yVal) && isFinite(yVal)) {
      pts.push({ x, y: yVal });
    }
  }

  let pathD = '';
  for (let i = 0; i < pts.length; i++) {
    const sx = toSvgX(pts[i].x);
    const sy = toSvgY(pts[i].y);
    if (i === 0) {
      pathD += `M ${sx.toFixed(1)} ${sy.toFixed(1)}`;
    } else {
      pathD += ` L ${sx.toFixed(1)} ${sy.toFixed(1)}`;
    }
  }

  const clipId = `graph-clip-${graphId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const clipX = Math.min(toSvgX(xMinNum), toSvgX(xMaxNum));
  const clipY = Math.min(toSvgY(yMinNum), toSvgY(yMaxNum));
  const clipW = Math.abs(toSvgX(xMaxNum) - toSvgX(xMinNum));
  const clipH = Math.abs(toSvgY(yMaxNum) - toSvgY(yMinNum));

  // Điểm cực trị và đường gióng tọa độ
  const extremaElements = finalExtrema.map(e => {
    const sx = toSvgX(e.x);
    const sy = toSvgY(e.y);
    return `
      <line class="graph-guideline" data-element-type="guideline" data-label="Đường gióng trục (${e.x}, ${e.y})" x1="${sx.toFixed(1)}" y1="${oy.toFixed(1)}" x2="${sx.toFixed(1)}" y2="${sy.toFixed(1)}" stroke="${guidelineColor}" stroke-width="1.3" stroke-dasharray="3,3" style="cursor: pointer;" title="Đường gióng trục (${e.x}, ${e.y})" />
      <line class="graph-guideline" data-element-type="guideline" data-label="Đường gióng trục (${e.x}, ${e.y})" x1="${ox.toFixed(1)}" y1="${sy.toFixed(1)}" x2="${sx.toFixed(1)}" y2="${sy.toFixed(1)}" stroke="${guidelineColor}" stroke-width="1.3" stroke-dasharray="3,3" style="cursor: pointer;" title="Đường gióng trục (${e.x}, ${e.y})" />
      <circle class="graph-point graph-extrema-circle" data-element-type="point" data-label="Điểm cực trị (${e.x}, ${e.y})" cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="3.5" fill="${pointColor}" style="cursor: pointer;" title="Điểm cực trị (${e.x}, ${e.y})" />
      ${showExtremaLabels && Math.abs(e.x) > 0.1 ? `<text class="graph-label graph-draggable-text" data-element-type="text" data-label="Số ${e.x}" x="${sx.toFixed(1)}" y="${(oy + 16).toFixed(1)}" font-size="${userFontSize}px" font-family="'Times New Roman', serif" text-anchor="middle" fill="${isGuidelineRed ? '#dc2626' : '#0f172a'}" style="cursor: grab; user-select: none;" title="Số hoành độ ${e.x}"><tspan>${e.x}</tspan></text>` : ''}
      ${showExtremaLabels && Math.abs(e.y) > 0.1 ? `<text class="graph-label graph-draggable-text" data-element-type="text" data-label="Số ${e.y}" x="${(ox - 6).toFixed(1)}" y="${(sy + 4).toFixed(1)}" font-size="${userFontSize}px" font-family="'Times New Roman', serif" text-anchor="end" fill="${isGuidelineRed ? '#dc2626' : '#0f172a'}" style="cursor: grab; user-select: none;" title="Số tung độ ${e.y}"><tspan>${e.y}</tspan></text>` : ''}
    `;
  }).join('');

  return `
<svg class="word-graph-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgW} ${svgH}" width="100%" height="auto" style="background: transparent; max-width: 100%; height: auto; display: inline-block; overflow: visible; font-family: 'Times New Roman', serif;">
  <defs>
    <marker id="arrow-x-${clipId}" markerWidth="8" markerHeight="8" refX="7" refY="3.5" orient="auto">
      <polygon points="0 0, 8 3.5, 0 7" fill="#0f172a" />
    </marker>
    <marker id="arrow-y-${clipId}" markerWidth="8" markerHeight="8" refX="7" refY="3.5" orient="auto">
      <polygon points="0 0, 8 3.5, 0 7" fill="#0f172a" />
    </marker>
    <clipPath id="${clipId}">
      <rect x="${clipX.toFixed(1)}" y="${clipY.toFixed(1)}" width="${clipW.toFixed(1)}" height="${clipH.toFixed(1)}" />
    </clipPath>
  </defs>
  <!-- Trục Ox -->
  <line class="graph-axis" data-element-type="axis" data-label="Trục Ox" x1="12" y1="${oy.toFixed(1)}" x2="${(svgW - 12).toFixed(1)}" y2="${oy.toFixed(1)}" stroke="#0f172a" stroke-width="1.6" marker-end="url(#arrow-x-${clipId})" style="cursor: pointer;" />
  ${showAxisLabels ? `<text class="graph-label graph-draggable-text" data-element-type="text" data-label="Tên trục ${xLabel}" x="${(svgW - 14).toFixed(1)}" y="${(oy - 7).toFixed(1)}" fill="#0f172a" font-size="${userFontSize}px" font-style="italic" font-family="'Times New Roman', serif" font-weight="bold" style="cursor: grab; user-select: none;" title="Tên nhãn trục ${xLabel}"><tspan>${xLabel}</tspan></text>` : ''}
  <!-- Trục Oy -->
  <line class="graph-axis" data-element-type="axis" data-label="Trục Oy" x1="${ox.toFixed(1)}" y1="${(svgH - 12).toFixed(1)}" x2="${ox.toFixed(1)}" y2="12" stroke="#0f172a" stroke-width="1.6" marker-end="url(#arrow-y-${clipId})" style="cursor: pointer;" />
  ${showAxisLabels ? `<text class="graph-label graph-draggable-text" data-element-type="text" data-label="Tên trục ${yLabel}" x="${(ox + 8).toFixed(1)}" y="18" fill="#0f172a" font-size="${userFontSize}px" font-style="italic" font-family="'Times New Roman', serif" font-weight="bold" style="cursor: grab; user-select: none;" title="Tên nhãn trục ${yLabel}"><tspan>${yLabel}</tspan></text>` : ''}
  <!-- Gốc tọa độ O -->
  ${showOriginLabel ? `<text class="graph-label graph-draggable-text" data-element-type="text" data-label="Gốc O" x="${(ox - 14).toFixed(1)}" y="${(oy + 16).toFixed(1)}" fill="#0f172a" font-size="${userFontSize}px" font-family="'Times New Roman', serif" style="cursor: grab; user-select: none;" title="Gốc tọa độ O"><tspan>O</tspan></text>` : ''}
  <!-- Các điểm cực trị gióng tọa độ -->
  ${extremaElements}
  <!-- Đường cong đồ thị hàm số liên tục -->
  ${pathD ? `<path class="graph-curve" data-element-type="curve" data-label="Đồ thị hàm số" d="${pathD}" fill="none" stroke="${curveColor}" stroke-width="2.5" ${curveDashed ? 'stroke-dasharray="6,4"' : ''} stroke-linecap="round" stroke-linejoin="round" clip-path="url(#${clipId})" style="cursor: pointer;" />` : ''}
</svg>`.trim();
};

export const generateWordGraphWrapperHtml = (
  formula: string,
  xMinNum: number,
  xMaxNum: number,
  yMinNum: number,
  yMaxNum: number,
  xLabel: string = 'x',
  yLabel: string = 'y',
  cleanFormulaForTikz?: string,
  varName: string = 'x',
  extremaList: Array<{ x: number; y: number }> = [],
  graphId: string = `graph-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
  requirement: string = '',
  userFontSize: number = 16,
  initialWidth: number = 380,
  unitX: number = 1,
  unitY: number = 1,
  showAxisLabels: boolean = true,
  showOriginLabel: boolean = true,
  showExtremaLabels: boolean = true,
  isTeacher: boolean = true
): string => {
  const svgXml = generateWordGraphSvg(
    formula,
    xMinNum,
    xMaxNum,
    yMinNum,
    yMaxNum,
    xLabel,
    yLabel,
    cleanFormulaForTikz,
    varName,
    extremaList,
    graphId,
    userFontSize,
    unitX,
    unitY,
    showAxisLabels,
    showOriginLabel,
    showExtremaLabels,
    requirement
  );

  return `
    <div class="word-graph-wrapper relative my-3 group" contenteditable="false" draggable="${isTeacher ? 'true' : 'false'}" data-graph-id="${graphId}" data-formula="${encodeURIComponent(formula)}" data-xmin="${xMinNum}" data-xmax="${xMaxNum}" data-ymin="${yMinNum}" data-ymax="${yMaxNum}" data-unitx="${unitX}" data-unity="${unitY}" data-show-axis="${showAxisLabels ? '1' : '0'}" data-show-origin="${showOriginLabel ? '1' : '0'}" data-show-extrema="${showExtremaLabels ? '1' : '0'}" data-width="${initialWidth}" data-align="center" style="margin: 16px auto; max-width: ${initialWidth}px; width: 100%; display: block; text-align: center; border: 1.5px dashed transparent; user-select: none; position: relative;">
      ${isTeacher ? `
        <div class="word-graph-controls opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none group-hover:pointer-events-auto flex items-center justify-between gap-1.5 px-2.5 py-1 mb-1 rounded-lg bg-white/95 backdrop-blur-xs border border-slate-200 shadow-sm text-xs" style="opacity: 0; pointer-events: none; transition: opacity 0.2s ease-in-out; user-select: none;">
          <div class="flex items-center gap-1.5">
            <button type="button" class="edit-graph-btn text-indigo-600 hover:text-indigo-800 font-bold px-2 py-0.5 rounded hover:bg-indigo-50 flex items-center gap-1 text-[11px] cursor-pointer" title="Chỉnh sửa thông số hoặc công thức đồ thị">
              ✏️ Sửa đồ thị
            </button>
          </div>
          <div class="flex items-center gap-1">
            <span class="text-[10px] text-slate-400 font-medium hidden sm:inline">↔ Co giãn:</span>
            <button type="button" class="graph-size-btn px-1.5 py-0.5 rounded text-slate-600 hover:bg-slate-100 text-[10px] font-bold cursor-pointer" data-size-action="decrease" title="Thu nhỏ đồ thị">-10%</button>
            <button type="button" class="graph-size-btn px-1.5 py-0.5 rounded text-slate-600 hover:bg-slate-100 text-[10px] font-bold cursor-pointer" data-size-action="increase" title="Phóng to đồ thị">+10%</button>
            <span class="text-slate-300">|</span>
            <button type="button" class="graph-align-btn px-1.5 py-0.5 rounded text-slate-500 hover:bg-slate-100 text-[10px] cursor-pointer" data-align="left" title="Căn trái">⫷ Trái</button>
            <button type="button" class="graph-align-btn px-1.5 py-0.5 rounded text-slate-700 bg-slate-100 font-bold text-[10px] cursor-pointer" data-align="center" title="Căn giữa">═ Giữa</button>
            <button type="button" class="graph-align-btn px-1.5 py-0.5 rounded text-slate-500 hover:bg-slate-100 text-[10px] cursor-pointer" data-align="right" title="Căn phải">⫸ Phải</button>
            <span class="text-slate-300">|</span>
            <button type="button" class="delete-graph-btn text-rose-500 hover:text-rose-700 font-bold px-1.5 py-0.5 rounded hover:bg-rose-50 text-[11px] cursor-pointer" title="Xóa đồ thị này">✕</button>
          </div>
        </div>
      ` : ''}

      <div class="graph-svg-container relative inline-block p-1" style="background: transparent;">
        ${svgXml}
      </div>
    </div>
    <p><br></p>
  `.trim();
};

export const generateWordGraphSvgDataUrl = (
  formula: string,
  xMinNum: number,
  xMaxNum: number,
  yMinNum: number,
  yMaxNum: number,
  xLabel: string = 'x',
  yLabel: string = 'y',
  cleanFormulaForTikz?: string,
  varName: string = 'x',
  extremaList: Array<{ x: number; y: number }> = [],
  fontSize: string = '16px',
  unitX: number = 1,
  unitY: number = 1,
  showAxisLabels: boolean = true,
  showOriginLabel: boolean = true,
  showExtremaLabels: boolean = true,
  requirement: string = ''
): string => {
  const userFontSize = parseInt(fontSize, 10) || 16;
  const svgXml = generateWordGraphSvg(formula, xMinNum, xMaxNum, yMinNum, yMaxNum, xLabel, yLabel, cleanFormulaForTikz, varName, extremaList, 'data-url-graph', userFontSize, unitX, unitY, showAxisLabels, showOriginLabel, showExtremaLabels, requirement);
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgXml);
};
