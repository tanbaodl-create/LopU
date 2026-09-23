import React, { useState, useMemo, useEffect } from 'react';
import { Edit3, Copy, Check } from 'lucide-react';
import katex from 'katex';

export interface TikZVisualRendererProps {
  tikzCode: string;
  className?: string;
  isTeacher?: boolean;
  fontSize?: string;
  onEdit?: (detail: {
    tikzCode: string;
    formulaStr: string;
    xMin: string;
    xMax: string;
    yMin: string;
    yMax: string;
    xLabel: string;
    yLabel: string;
    requirement?: string;
  }) => void;
}

/**
 * Hàm render KaTeX inline an toàn
 */
function renderKatex(mathStr: string): string {
  try {
    const clean = mathStr.replace(/^\$+|\$+$/g, '').trim();
    if (!clean) return '';
    return katex.renderToString(clean, {
      displayMode: false,
      throwOnError: false,
      output: 'html',
    });
  } catch {
    return mathStr;
  }
}

/**
 * Chuyển đổi an toàn biểu thức toán học sang hàm JavaScript có hỗ trợ đa biến (x, t, u, z...) và phép nhân ngầm
 */
export function convertMathExprToJs(rawExpr: string, varName: string = 'x'): (val: number) => number {
  try {
    let clean = rawExpr.trim();
    if (clean.includes('=')) {
      clean = clean.split('=').slice(1).join('=').trim();
    }
    // Chuyển \frac{a}{b} sang ((a)/(b))
    clean = clean.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '(($1)/($2))');
    clean = clean.replace(/frac\{([^}]+)\}\{([^}]+)\}/g, '(($1)/($2))');

    // Chuyển hàm lượng giác & toán
    clean = clean.replace(/\\sqrt\{([^}]+)\}/g, 'Math.sqrt($1)');
    clean = clean.replace(/sqrt\(([^)]+)\)/g, 'Math.sqrt($1)');
    clean = clean.replace(/\\pi/g, 'Math.PI');
    clean = clean.replace(/\\sin/g, 'Math.sin').replace(/sin\(/g, 'Math.sin(');
    clean = clean.replace(/\\cos/g, 'Math.cos').replace(/cos\(/g, 'Math.cos(');
    clean = clean.replace(/\\tan/g, 'Math.tan').replace(/tan\(/g, 'Math.tan(');
    clean = clean.replace(/\\ln/g, 'Math.log').replace(/ln\(/g, 'Math.log(');
    clean = clean.replace(/\\abs\{([^}]+)\}/g, 'Math.abs($1)');

    // Chuẩn hóa biến: Bỏ dấu \ trước tên biến nếu có (\t -> t, \x -> x)
    const v = varName.replace(/^\\+/, '') || 'x';
    clean = clean.replace(new RegExp(`\\\\${v}`, 'g'), v);

    // Thay thế biến dạng 3t -> 3*X, 3.5t -> 3.5*X
    clean = clean.replace(new RegExp(`(\\d+(?:\\.\\d+)?)\\s*${v}`, 'g'), '$1*X');
    // Thay thế biến đứng độc lập hoặc còn lại
    clean = clean.replace(new RegExp(`\\b${v}\\b`, 'g'), 'X');
    clean = clean.replace(new RegExp(`${v}`, 'g'), 'X');

    // Nhân ngầm: 3( -> 3*( , )( -> )*( , )X -> )*X , X( -> X*(
    clean = clean.replace(/(\d+)\s*\(/g, '$1*(');
    clean = clean.replace(/\)\s*\(/g, ')*(');
    clean = clean.replace(/\)\s*X/g, ')*X');
    clean = clean.replace(/X\s*\(/g, 'X*(');
    clean = clean.replace(/X\s*(\d+)/g, 'X*$1');
    clean = clean.replace(/(\d+)\s*X/g, '$1*X');

    // Lũy thừa ^ -> **
    clean = clean.replace(/\^/g, '**');

    // eslint-disable-next-line no-new-func
    const fn = new Function('X', `
      try {
        const res = Number(${clean});
        return (!isNaN(res) && isFinite(res)) ? res : 0;
      } catch (e) {
        return 0;
      }
    `);

    // Test tính thử
    fn(1);
    return fn as (val: number) => number;
  } catch {
    return (X: number) => 0;
  }
}

/**
 * Phân tích và hiển thị trực quan mã TikZ (Đồ thị hàm số, Bảng biến thiên tikz-tab)
 * - Nền trong suốt 100% (bg-transparent), không đóng khung, không viền thẻ để đồng bộ màu với văn bản.
 * - Không hiển thị chú thích chữ (bỏ chữ "Đồ thị hàm số...", chỉ vẽ hình thuần túy).
 * - Nút "Chép mã" và "Chỉnh sửa" chỉ hiển thị ở quyền Giáo viên, Học sinh không thấy.
 * - Đồ thị nằm gọn gàng trong hình chữ nhật (x_min; y_min) -- (x_max; y_max).
 * - Mặc định gióng tọa độ cho tất cả các điểm cực trị (ghi giá trị x, y trên 2 trục).
 */
export const TikZVisualRenderer: React.FC<TikZVisualRendererProps> = ({
  tikzCode,
  className = '',
  isTeacher,
  fontSize,
  onEdit,
}) => {
  const [copied, setCopied] = useState(false);
  const graphUniqueId = useMemo(() => `tikz_clip_${Math.random().toString(36).substring(2, 9)}`, []);

  // Lấy cỡ chữ soạn thảo từ props hoặc localStorage hoặc sự kiện đồng bộ
  const [activeFontSize, setActiveFontSize] = useState<string>(() => {
    if (fontSize) return fontSize;
    if (typeof window !== 'undefined') {
      return localStorage.getItem('wordEditorFontSize') || '22px';
    }
    return '22px';
  });

  useEffect(() => {
    if (fontSize) {
      setActiveFontSize(fontSize);
    }
  }, [fontSize]);

  useEffect(() => {
    const handleFontSizeChange = (e: CustomEvent<{ fontSize: string }>) => {
      if (e.detail && e.detail.fontSize) {
        setActiveFontSize(e.detail.fontSize);
      }
    };
    window.addEventListener('app-font-size-changed', handleFontSizeChange as EventListener);
    return () => {
      window.removeEventListener('app-font-size-changed', handleFontSizeChange as EventListener);
    };
  }, []);

  // Tính toán kích thước font số học cho các phần tử trên đồ thị
  const fontMetrics = useMemo(() => {
    const base = parseFloat(activeFontSize) || 22;
    return {
      basePx: base,
      axisLabelSize: Math.max(12, Math.round(base * 0.95)),
      originLabelSize: Math.max(11, Math.round(base * 0.85)),
      coordLabelSize: Math.max(10, Math.round(base * 0.8)),
      pad: Math.max(28, Math.round(base * 1.35)),
    };
  }, [activeFontSize]);

  // Xác định quyền: chỉ Giáo viên mới thấy nút chép mã và chỉnh sửa TikZ
  const resolvedIsTeacher = useMemo(() => {
    if (typeof isTeacher === 'boolean') return isTeacher;
    if (typeof window !== 'undefined') {
      const role =
        localStorage.getItem('currentUserRole') ||
        localStorage.getItem('userRole') ||
        localStorage.getItem('role');
      if (role === 'student') return false;
    }
    return true;
  }, [isTeacher]);

  // Xóa các dòng chú thích thừa
  const cleanTikz = useMemo(() => {
    return tikzCode
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0 && !l.startsWith('%'))
      .join('\n');
  }, [tikzCode]);

  const isBBT = useMemo(() => {
    return /\\tkzTab|tkzTabInit|\\tkzTabLine|\\tkzTabVar/i.test(cleanTikz);
  }, [cleanTikz]);

  const isGraph = useMemo(() => {
    return /plot|tikzpicture|\\draw.*node.*\$[xy]\$/i.test(cleanTikz) && !isBBT;
  }, [cleanTikz, isBBT]);

  // Copy code to clipboard
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(tikzCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 1. Phân tích Bảng biến thiên tikz-tab
  const bbtData = useMemo(() => {
    if (!isBBT) return null;

    // Phân tích các mốc x: \tkzTabInit[...]{...}{-\infty, -1, 1, +\infty}
    let xPoints: string[] = ['-\\infty', '-1', '1', '+\\infty'];
    const initMatch = cleanTikz.match(/\\tkzTabInit(?:\[[^\]]*\])?\{[^}]*\}\{([^}]+)\}/);
    if (initMatch && initMatch[1]) {
      xPoints = initMatch[1].split(',').map(s => s.trim()).filter(Boolean);
    }

    // Phân tích dòng dấu y': \tkzTabLine{, +, 0, -, 0, +, }
    let yPrimeSigns: string[] = [];
    const lineMatch = cleanTikz.match(/\\tkzTabLine\{([^}]+)\}/);
    if (lineMatch && lineMatch[1]) {
      yPrimeSigns = lineMatch[1].split(',').map(s => s.trim());
    } else {
      yPrimeSigns = ['', '+', '0', '-', '0', '+', ''];
    }

    // Phân tích dòng giá trị y: \tkzTabVar{-/ -\infty, +/ 4, -/ 0, +/ +\infty}
    interface VarPoint {
      dir: '+' | '-' | 'd';
      val: string;
    }
    let yVars: VarPoint[] = [];
    const varMatch = cleanTikz.match(/\\tkzTabVar\{([^}]+)\}/);
    if (varMatch && varMatch[1]) {
      const parts = varMatch[1].split(',').map(s => s.trim()).filter(Boolean);
      yVars = parts.map(p => {
        const segs = p.split('/');
        if (segs.length >= 2) {
          const dir = (segs[0].trim() === '+' ? '+' : '-') as '+' | '-';
          const val = segs.slice(1).join('/').trim();
          return { dir, val };
        }
        return { dir: '-', val: p };
      });
    } else {
      yVars = [
        { dir: '-', val: '-\\infty' },
        { dir: '+', val: '4' },
        { dir: '-', val: '0' },
        { dir: '+', val: '+\\infty' },
      ];
    }

    return { xPoints, yPrimeSigns, yVars };
  }, [cleanTikz, isBBT]);

  // 2. Phân tích và tính tọa độ cho Đồ thị hàm số
  const graphData = useMemo(() => {
    if (!isGraph) return null;

    let formulaStr = 'y = x^2 - 1';
    let xMin = -2;
    let xMax = 2;
    let yMin = -2;
    let yMax = 4;
    let xLabel = 'x';
    let yLabel = 'y';
    let requirement = '';

    // 0. Đọc chú thích cấu hình nếu có: % Cấu hình: xMin=-2; xMax=2; yMin=-14; yMax=14; xLabel=t; yLabel=N
    const configMatch = tikzCode.match(/%\s*Cấu hình:\s*([^\n]+)/);
    if (configMatch && configMatch[1]) {
      const cfgStr = configMatch[1];
      const getVal = (key: string) => {
        const m = cfgStr.match(new RegExp(`${key}=([^;\\n]+)`));
        return m ? m[1].trim() : null;
      };
      if (getVal('xMin')) xMin = parseFloat(getVal('xMin')!);
      if (getVal('xMax')) xMax = parseFloat(getVal('xMax')!);
      if (getVal('yMin')) yMin = parseFloat(getVal('yMin')!);
      if (getVal('yMax')) yMax = parseFloat(getVal('yMax')!);
      if (getVal('xLabel')) xLabel = getVal('xLabel')!;
      if (getVal('yLabel')) yLabel = getVal('yLabel')!;
    }

    // Đọc chú thích hàm gốc nếu có: % Đồ thị hàm số: ... hoặc % Đồ thị: ...
    const headerMatch = tikzCode.match(/%\s*(?:Đồ thị(?: hàm số)?|Graph|Hàm số)\s*:\s*([^\n]+)/i);
    if (headerMatch && headerMatch[1]) {
      formulaStr = headerMatch[1].trim();
    }

    const reqMatch = tikzCode.match(/%\s*Yêu cầu:\s*([^\n]+)/);
    if (reqMatch && reqMatch[1]) {
      requirement = reqMatch[1].trim();
    }

    // Phân tích nhãn trục từ mã TikZ nếu có
    const xNodeMatch = tikzCode.match(/node\[right\]\s*\{\$([^$]+)\$\}/);
    if (xNodeMatch && xNodeMatch[1]) {
      xLabel = xNodeMatch[1].trim();
    }

    const yNodeMatch = tikzCode.match(/node\[above\]\s*\{\$([^$]+)\$\}/);
    if (yNodeMatch && yNodeMatch[1]) {
      yLabel = yNodeMatch[1].trim();
    }

    // Tự động suy ra nhãn trục từ công thức hàm (Ví dụ: N=t^3+3t -> xLabel='t', yLabel='N')
    if (formulaStr.includes('=')) {
      const parts = formulaStr.split('=');
      const lhs = parts[0].trim();
      const rhs = parts.slice(1).join('=').trim();
      if (lhs && !xNodeMatch && !configMatch) yLabel = lhs;
      if (!xNodeMatch && !configMatch) {
        if (/(?:^|[^a-zA-Z])t(?:$|[^a-zA-Z0-9])/.test(rhs) || /\bt\b/.test(rhs) || /\d+t/.test(rhs)) xLabel = 't';
        else if (/(?:^|[^a-zA-Z])u(?:$|[^a-zA-Z0-9])/.test(rhs) || /\bu\b/.test(rhs) || /\d+u/.test(rhs)) xLabel = 'u';
        else if (/(?:^|[^a-zA-Z])z(?:$|[^a-zA-Z0-9])/.test(rhs) || /\bz\b/.test(rhs)) xLabel = 'z';
        else if (/(?:^|[^a-zA-Z])x(?:$|[^a-zA-Z0-9])/.test(rhs) || /\bx\b/.test(rhs) || /\d+x/.test(rhs)) xLabel = 'x';
      }
    }

    // 1. Phân tích clip rectangle: \clip (xMin, yMin) rectangle (xMax, yMax)
    const clipMatch = cleanTikz.match(/\\clip\s*\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)\s*rectangle\s*\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)/);
    if (clipMatch) {
      xMin = parseFloat(clipMatch[1]);
      yMin = parseFloat(clipMatch[2]);
      xMax = parseFloat(clipMatch[3]);
      yMax = parseFloat(clipMatch[4]);
    } else {
      // 1b. Phân tích miền xác định từ domain=...
      const domainMatch = cleanTikz.match(/domain=([-\d.]+):([-\d.]+)/);
      if (domainMatch) {
        xMin = parseFloat(domainMatch[1]);
        xMax = parseFloat(domainMatch[2]);
      }
    }

    // 2. Phân tích giới hạn trục Ox và Oy trực tiếp từ các lệnh \draw (0, y1) -- (0, y2) và \draw (x1, 0) -- (x2, 0)
    let parsedYAxis = !!clipMatch || (configMatch && !!configMatch[1]);
    if (!parsedYAxis) {
      const yAxisMatch = cleanTikz.match(/\\draw\[[^\]]*\]\s*\(\s*0\s*,\s*([-\d.]+)\s*\)\s*--\s*\(\s*0\s*,\s*([-\d.]+)\s*\)/);
      if (yAxisMatch) {
        const ya = parseFloat(yAxisMatch[1]);
        const yb = parseFloat(yAxisMatch[2]);
        if (!isNaN(ya) && !isNaN(yb) && Math.abs(yb - ya) > 0.1) {
          yMin = Math.round(Math.min(ya, yb) + 0.6);
          yMax = Math.round(Math.max(ya, yb) - 0.6);
          parsedYAxis = true;
        }
      }
    }

    let pureExpr = formulaStr.includes('=') ? formulaStr.split('=')[1].trim() : formulaStr;
    let plotVar = xLabel;
    const plotMatch = cleanTikz.match(/plot\s*\(\s*\{?\\?([a-zA-Z]+)\}?\s*,\s*\{?([^}]+)\}?\s*\)/);
    if (plotMatch && plotMatch[2]) {
      plotVar = plotMatch[1].replace(/^\\+/, '') || xLabel;
      pureExpr = plotMatch[2].replace(new RegExp(`\\\\${plotVar}`, 'g'), plotVar).trim();

      // Nếu không có header comment thì tái cấu trúc lại formulaStr từ plot expression
      if (!headerMatch) {
        let reconstructed = pureExpr
          .replace(new RegExp(`${plotVar}\\*${plotVar}\\*${plotVar}\\*${plotVar}`, 'g'), `${plotVar}^4`)
          .replace(new RegExp(`${plotVar}\\*${plotVar}\\*${plotVar}`, 'g'), `${plotVar}^3`)
          .replace(new RegExp(`${plotVar}\\*${plotVar}`, 'g'), `${plotVar}^2`)
          .replace(/(\d+)\s*\*\s*([a-zA-Z])/g, '$1$2')
          .replace(/([a-zA-Z])\s*\*\s*(\d+)/g, '$1*$2');
        formulaStr = `${yLabel} = ${reconstructed}`;
      }
    }

    // Hàm đánh giá biểu thức toán an toàn và chính xác
    const evalMath = convertMathExprToJs(pureExpr, plotVar);

    // Tạo các điểm lấy mẫu
    const points: Array<{ x: number; y: number }> = [];
    const step = (xMax - xMin) / 100;
    let calculatedYMin = Infinity;
    let calculatedYMax = -Infinity;

    for (let x = xMin; x <= xMax + 0.0001; x += step) {
      const y = evalMath(x);
      points.push({ x, y });
      if (y < calculatedYMin) calculatedYMin = y;
      if (y > calculatedYMax) calculatedYMax = y;
    }

    // Nếu chưa có lệnh trục y rõ ràng trong TikZ thì mới dùng giá trị tính toán
    if (!parsedYAxis && calculatedYMin !== Infinity && calculatedYMax !== -Infinity) {
      yMin = Math.min(-1, Math.floor(calculatedYMin) - 1);
      yMax = Math.max(2, Math.ceil(calculatedYMax) + 1);
    }

    // Tọa độ SVG: viewBox 0 0 340 210
    const svgW = 340;
    const svgH = 210;
    const pad = 28;

    const toSvgX = (x: number) => pad + ((x - xMin) / (xMax - xMin)) * (svgW - 2 * pad);
    const toSvgY = (y: number) => (svgH - pad) - ((y - yMin) / (yMax - yMin)) * (svgH - 2 * pad);

    const pathD = points.reduce((acc, pt, i) => {
      const sx = toSvgX(pt.x);
      const sy = toSvgY(pt.y);
      return i === 0 ? `M ${sx.toFixed(1)} ${sy.toFixed(1)}` : `${acc} L ${sx.toFixed(1)} ${sy.toFixed(1)}`;
    }, '');

    const ox = toSvgX(0);
    const oy = toSvgY(0);

    // Tìm tất cả các điểm cực trị trong miền xác định
    const extrema: Array<{ x: number; y: number; type: 'max' | 'min' }> = [];
    for (let i = 2; i < points.length - 2; i++) {
      const cur = points[i];
      const prev = points[i - 1];
      const next = points[i + 1];
      if (cur.x <= xMin + 0.1 || cur.x >= xMax - 0.1) continue;

      // Cực đại
      if (cur.y > prev.y && cur.y > next.y) {
        if (!extrema.some(e => Math.abs(e.x - cur.x) < 0.35)) {
          extrema.push({
            x: Number(cur.x.toFixed(2)),
            y: Number(cur.y.toFixed(2)),
            type: 'max',
          });
        }
      }
      // Cực tiểu
      else if (cur.y < prev.y && cur.y < next.y) {
        if (!extrema.some(e => Math.abs(e.x - cur.x) < 0.35)) {
          extrema.push({
            x: Number(cur.x.toFixed(2)),
            y: Number(cur.y.toFixed(2)),
            type: 'min',
          });
        }
      }
    }

    return {
      formulaStr,
      xMin,
      xMax,
      yMin,
      yMax,
      xLabel,
      yLabel,
      requirement,
      svgW,
      svgH,
      ox,
      oy,
      pathD,
      extrema,
      toSvgX,
      toSvgY,
    };
  }, [cleanTikz, isGraph, tikzCode]);

  // Xử lý mở hộp thoại chỉnh sửa đồ thị
  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const detailData = {
      tikzCode,
      formulaStr: graphData?.formulaStr || 'y = x^2 - 1',
      xMin: graphData?.xMin?.toString() || '-2',
      xMax: graphData?.xMax?.toString() || '2',
      yMin: graphData?.yMin?.toString() || '-2',
      yMax: graphData?.yMax?.toString() || '4',
      xLabel: graphData?.xLabel || 'x',
      yLabel: graphData?.yLabel || 'y',
      requirement: graphData?.requirement || '',
    };

    if (onEdit) {
      onEdit(detailData);
    }
    window.dispatchEvent(
      new CustomEvent('app-open-edit-tikz-modal', {
        detail: detailData,
      })
    );
  };

  return (
    <div className={`relative inline-block my-2 w-full max-w-xl group/tikz ${className}`}>
      {/* NÚT CHÉP MÃ & CHỈNH SỬA: CHỈ HIỂN THỊ KHI LÀ GIÁO VIÊN */}
      {resolvedIsTeacher && (
        <div className="absolute top-0 right-0 z-20 opacity-0 group-hover/tikz:opacity-100 focus-within:opacity-100 transition-opacity flex items-center gap-1 bg-white/95 backdrop-blur-xs p-1 rounded-md border border-slate-300 shadow-xs">
          <button
            type="button"
            onClick={handleCopy}
            className="px-2 py-0.5 rounded text-[11px] font-medium text-slate-700 hover:bg-slate-100 flex items-center gap-1 transition-colors cursor-pointer"
            title="Sao chép mã TikZ"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-600" />}
            <span>{copied ? 'Đã chép' : 'Chép mã'}</span>
          </button>
          <button
            type="button"
            onClick={handleEditClick}
            className="px-2 py-0.5 rounded text-[11px] font-medium text-indigo-700 hover:bg-indigo-50 border border-indigo-200 flex items-center gap-1 transition-colors cursor-pointer"
            title="Chỉnh sửa đồ thị / Bảng biến thiên (mở cửa sổ thông số)"
          >
            <Edit3 className="w-3 h-3 text-indigo-600" />
            <span>Chỉnh sửa</span>
          </button>
        </div>
      )}

      {/* VÙNG VẼ ĐỒ THỊ / BẢNG BIẾN THIÊN 100% TRONG SUỐT, KHÔNG CHÚ THÍCH */}
      <div className="w-full bg-transparent flex flex-col items-center justify-center">
        {/* 1. BẢNG BIẾN THIÊN (TRONG SUỐT HOÀN TOÀN, ĐƯỜNG KẺ RÕ RÀNG NHƯ CHỮ TEXT) */}
        {isBBT && bbtData && (
          <div className="w-full overflow-x-auto py-1 bg-transparent" style={{ fontSize: activeFontSize }}>
            <table className="min-w-full border-collapse border border-slate-800 text-center font-serif bg-transparent" style={{ fontSize: activeFontSize }}>
              <thead>
                {/* Hàng 1: x */}
                <tr className="border-b border-slate-800 bg-transparent">
                  <th className="w-14 sm:w-16 p-2 border-r border-slate-800 font-bold text-slate-900 italic">
                    <span dangerouslySetInnerHTML={{ __html: renderKatex('x') }} />
                  </th>
                  {bbtData.xPoints.map((xVal, idx) => (
                    <th key={idx} className="p-2 border-r last:border-r-0 border-slate-800 font-normal text-slate-900">
                      <span dangerouslySetInnerHTML={{ __html: renderKatex(xVal) }} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Hàng 2: y' (Dấu đạo hàm) */}
                <tr className="border-b border-slate-800 bg-transparent">
                  <td className="p-2 border-r border-slate-800 font-bold text-slate-900 italic">
                    <span dangerouslySetInnerHTML={{ __html: renderKatex("y'") }} />
                  </td>
                  <td colSpan={bbtData.xPoints.length} className="p-2 bg-transparent">
                    <div className="flex items-center justify-around w-full font-bold text-slate-900">
                      {bbtData.yPrimeSigns
                        .filter(s => s !== '')
                        .map((sign, sIdx) => (
                          <span
                            key={sIdx}
                            className="text-slate-900 font-bold"
                            dangerouslySetInnerHTML={{ __html: renderKatex(sign) }}
                          />
                        ))}
                    </div>
                  </td>
                </tr>

                {/* Hàng 3: y (Chiều biến thiên mũi tên) */}
                <tr className="bg-transparent">
                  <td className="p-3 border-r border-slate-800 font-bold text-slate-900 italic align-middle">
                    <span dangerouslySetInnerHTML={{ __html: renderKatex('y') }} />
                  </td>
                  <td colSpan={bbtData.xPoints.length} className="p-3 relative bg-transparent">
                    <div className="flex items-center justify-between w-full min-h-[65px] px-2">
                      {bbtData.yVars.map((v, vIdx) => {
                        const isHigh = v.dir === '+';
                        const isLast = vIdx === bbtData.yVars.length - 1;
                        const nextIsHigh = !isLast && bbtData.yVars[vIdx + 1]?.dir === '+';

                        return (
                          <React.Fragment key={vIdx}>
                            {/* Điểm giá trị y */}
                            <div
                              className={`flex flex-col items-center justify-center ${
                                isHigh ? 'self-start pb-3 text-slate-900 font-semibold' : 'self-end pt-3 text-slate-900 font-semibold'
                              }`}
                            >
                              <span dangerouslySetInnerHTML={{ __html: renderKatex(v.val) }} />
                            </div>

                            {/* Mũi tên tăng / giảm */}
                            {!isLast && (
                              <div className="flex-1 flex items-center justify-center px-1">
                                <svg className="w-full h-7 overflow-visible bg-transparent" viewBox="0 0 60 28">
                                  <defs>
                                    <marker
                                      id={`arrowhead-${vIdx}`}
                                      markerWidth="6"
                                      markerHeight="6"
                                      refX="5"
                                      refY="3"
                                      orient="auto"
                                    >
                                      <polygon
                                        points="0 0, 6 3, 0 6"
                                        fill="#0f172a"
                                      />
                                    </marker>
                                  </defs>
                                  {nextIsHigh ? (
                                    <line
                                      x1="4"
                                      y1="24"
                                      x2="52"
                                      y2="4"
                                      stroke="#0f172a"
                                      strokeWidth="1.8"
                                      markerEnd={`url(#arrowhead-${vIdx})`}
                                    />
                                  ) : (
                                    <line
                                      x1="4"
                                      y1="4"
                                      x2="52"
                                      y2="24"
                                      stroke="#0f172a"
                                      strokeWidth="1.8"
                                      markerEnd={`url(#arrowhead-${vIdx})`}
                                    />
                                  )}
                                </svg>
                              </div>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* 2. ĐỒ THỊ HÀM SỐ (SVG TRONG SUỐT 100%, ĐƯỢC GIỚI HẠN CHÍNH XÁC TRONG HÌNH CHỮ NHẬT) */}
        {isGraph && graphData && (
          <div className="w-full flex flex-col items-center py-1 bg-transparent">
            <svg
              viewBox={`0 0 ${graphData.svgW} ${graphData.svgH}`}
              className="w-full max-w-sm h-auto bg-transparent overflow-visible"
              style={{ background: 'transparent' }}
            >
              <defs>
                <marker
                  id="graph-arrow-x"
                  markerWidth="7"
                  markerHeight="7"
                  refX="6"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon points="0 0, 7 3.5, 0 7" fill="#1e293b" />
                </marker>
                <marker
                  id="graph-arrow-y"
                  markerWidth="7"
                  markerHeight="7"
                  refX="6"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon points="0 0, 7 3.5, 0 7" fill="#1e293b" />
                </marker>

                {/* Khung cắt hình chữ nhật: Giới hạn đồ thị chỉ nằm trong (x_min, y_min) -- (x_max, y_max) */}
                <clipPath id={graphUniqueId}>
                  <rect
                    x={Math.min(graphData.toSvgX(graphData.xMin), graphData.toSvgX(graphData.xMax))}
                    y={Math.min(graphData.toSvgY(graphData.yMin), graphData.toSvgY(graphData.yMax))}
                    width={Math.abs(graphData.toSvgX(graphData.xMax) - graphData.toSvgX(graphData.xMin))}
                    height={Math.abs(graphData.toSvgY(graphData.yMin) - graphData.toSvgY(graphData.yMax))}
                  />
                </clipPath>
              </defs>

              {/* Trục Ox */}
              <line
                x1="15"
                y1={graphData.oy}
                x2={graphData.svgW - 15}
                y2={graphData.oy}
                stroke="#1e293b"
                strokeWidth="1.5"
                markerEnd="url(#graph-arrow-x)"
              />
              <text
                x={graphData.svgW - 18}
                y={graphData.oy - 7}
                fill="#0f172a"
                fontSize={fontMetrics.axisLabelSize}
                fontStyle="italic"
                fontFamily="serif"
                fontWeight="bold"
              >
                {graphData.xLabel}
              </text>

              {/* Trục Oy */}
              <line
                x1={graphData.ox}
                y1={graphData.svgH - 15}
                x2={graphData.ox}
                y2="15"
                stroke="#1e293b"
                strokeWidth="1.5"
                markerEnd="url(#graph-arrow-y)"
              />
              <text
                x={graphData.ox + 8}
                y={Math.max(16, fontMetrics.axisLabelSize + 2)}
                fill="#0f172a"
                fontSize={fontMetrics.axisLabelSize}
                fontStyle="italic"
                fontFamily="serif"
                fontWeight="bold"
              >
                {graphData.yLabel}
              </text>

              {/* Gốc tọa độ O */}
              <text
                x={graphData.ox - fontMetrics.originLabelSize}
                y={graphData.oy + fontMetrics.originLabelSize + 2}
                fill="#0f172a"
                fontSize={fontMetrics.originLabelSize}
                fontStyle="italic"
                fontFamily="serif"
                fontWeight="bold"
              >
                O
              </text>

              {/* Gióng tọa độ cho TẤT CẢ các điểm cực trị (Vẽ nét đứt và ghi giá trị x, y trên 2 trục - Tránh đè lên trục, đường gióng và đồ thị) */}
              {graphData.extrema.map((ex, exIdx) => {
                const sx = graphData.toSvgX(ex.x);
                const sy = graphData.toSvgY(ex.y);

                // Ưu tiên số nguyên -> phân số -> số thập phân
                const formatVal = (v: number): string => {
                  if (Math.abs(v - Math.round(v)) < 0.02) {
                    return `${Math.round(v)}`;
                  }
                  for (let d = 2; d <= 16; d++) {
                    const n = Math.round(v * d);
                    if (Math.abs(v - n / d) < 0.02) {
                      const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));
                      const c = gcd(n, d);
                      const num = n / c;
                      const den = d / c;
                      if (den === 1) return `${num}`;
                      return `${num}/${den}`;
                    }
                  }
                  return `${Number(v.toFixed(2))}`;
                };

                const xDisplay = formatVal(ex.x);
                const yDisplay = formatVal(ex.y);

                // Vị trí tránh đè lên trục, đường gióng và đồ thị
                // Với x trên Ox: nếu ex.y >= 0 đường gióng đi lên -> nhãn đặt dưới Ox (oy + 14); nếu ex.y < 0 đường gióng đi xuống -> nhãn đặt trên Ox (oy - 6)
                const xLabelY = ex.y >= 0 ? graphData.oy + fontMetrics.coordLabelSize + 4 : graphData.oy - 6;
                // Với y trên Oy: nếu ex.x >= 0 đường gióng sang phải -> nhãn đặt bên trái Oy (ox - 6, anchor end); nếu ex.x < 0 đường gióng sang trái -> nhãn đặt bên phải Oy (ox + 6, anchor start)
                const yLabelX = ex.x >= 0 ? graphData.ox - 6 : graphData.ox + 6;
                const yLabelAnchor = ex.x >= 0 ? 'end' : 'start';

                return (
                  <g key={`extrema-${exIdx}`}>
                    {/* Đường nét đứt gióng tới trục Ox */}
                    <line
                      x1={sx}
                      y1={graphData.oy}
                      x2={sx}
                      y2={sy}
                      stroke="#475569"
                      strokeWidth="1.2"
                      strokeDasharray="3 3"
                    />
                    {/* Đường nét đứt gióng tới trục Oy */}
                    <line
                      x1={graphData.ox}
                      y1={sy}
                      x2={sx}
                      y2={sy}
                      stroke="#475569"
                      strokeWidth="1.2"
                      strokeDasharray="3 3"
                    />
                    {/* Điểm cực trị chấm tròn đậm */}
                    <circle cx={sx} cy={sy} r="2.8" fill="#1e293b" />
                    {/* Giá trị x trên trục Ox */}
                    {Math.abs(ex.x) > 0.1 && (
                      <text
                        x={sx}
                        y={xLabelY}
                        textAnchor="middle"
                        fill="#0f172a"
                        fontSize={fontMetrics.coordLabelSize}
                        fontFamily="serif"
                        fontWeight="bold"
                      >
                        {xDisplay}
                      </text>
                    )}
                    {/* Giá trị y trên trục Oy */}
                    {Math.abs(ex.y) > 0.1 && (
                      <text
                        x={yLabelX}
                        y={sy + 3.5}
                        textAnchor={yLabelAnchor}
                        fill="#0f172a"
                        fontSize={fontMetrics.coordLabelSize}
                        fontFamily="serif"
                        fontWeight="bold"
                      >
                        {yDisplay}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Đường cong đồ thị hàm số (Bị giới hạn tuyệt đối trong hình chữ nhật qua clipPath) */}
              <g clipPath={`url(#${graphUniqueId})`}>
                <path
                  d={graphData.pathD}
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
              </g>
            </svg>
          </div>
        )}

        {/* 3. Phác thảo dạng chung nếu không phải BBT hay Đồ thị */}
        {!isBBT && !isGraph && (
          <div className="w-full text-center py-2 text-slate-500 text-xs italic">
            <span>(Hình vẽ TikZ)</span>
          </div>
        )}
      </div>
    </div>
  );
};
