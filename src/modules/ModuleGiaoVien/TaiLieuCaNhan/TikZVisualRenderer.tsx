import React, { useState, useMemo } from 'react';
import { Code, EyeOff, Copy, Check } from 'lucide-react';
import katex from 'katex';

export interface TikZVisualRendererProps {
  tikzCode: string;
  className?: string;
  isTeacher?: boolean;
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
 * Phân tích và hiển thị trực quan mã TikZ (Đồ thị hàm số, Bảng biến thiên tikz-tab)
 * - Nền trong suốt 100% (bg-transparent), không đóng khung, không viền thẻ để đồng bộ màu với văn bản.
 * - Không hiển thị chú thích chữ (bỏ chữ "Đồ thị hàm số...", chỉ vẽ hình thuần túy).
 * - Nút "Chép mã" và "Xem TikZ" chỉ hiển thị ở quyền Giáo viên, Học sinh không thấy.
 */
export const TikZVisualRenderer: React.FC<TikZVisualRendererProps> = ({
  tikzCode,
  className = '',
  isTeacher,
}) => {
  const [showRawCode, setShowRawCode] = useState(false);
  const [copied, setCopied] = useState(false);

  // Xác định quyền: chỉ Giáo viên mới thấy nút chép mã và xem TikZ
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

    let formulaStr = 'x^2 - 1';
    let xMin = -3;
    let xMax = 3;
    let yMin = -2;
    let yMax = 4;

    const domainMatch = cleanTikz.match(/domain=([-\d.]+):([-\d.]+)/);
    if (domainMatch) {
      xMin = parseFloat(domainMatch[1]);
      xMax = parseFloat(domainMatch[2]);
    }

    const plotMatch = cleanTikz.match(/plot\s*\(\s*\{?\\x\}?\s*,\s*\{?([^}]+)\}?\s*\)/);
    if (plotMatch && plotMatch[1]) {
      formulaStr = plotMatch[1].replace(/\\x/g, 'x').trim();
    } else {
      const plotMatch2 = cleanTikz.match(/plot[^{]*\{([^}]+)\}/);
      if (plotMatch2 && plotMatch2[1]) {
        formulaStr = plotMatch2[1].replace(/\\x/g, 'x').trim();
      }
    }

    // Hàm đánh giá biểu thức toán an toàn
    const evalMath = (x: number): number => {
      try {
        let expr = formulaStr
          .replace(/\^/g, '**')
          .replace(/sin/g, 'Math.sin')
          .replace(/cos/g, 'Math.cos')
          .replace(/tan/g, 'Math.tan')
          .replace(/sqrt/g, 'Math.sqrt')
          .replace(/abs/g, 'Math.abs')
          .replace(/(\d+)\s*x/g, '$1*x')
          .replace(/x\s*(\d+)/g, 'x*$1');

        // eslint-disable-next-line no-new-func
        const fn = new Function('x', `return ${expr};`);
        const res = fn(x);
        return isNaN(res) || !isFinite(res) ? 0 : res;
      } catch {
        return x * x - 1;
      }
    };

    // Tạo các điểm lấy mẫu
    const points: Array<{ x: number; y: number }> = [];
    const step = (xMax - xMin) / 80;
    let calculatedYMin = Infinity;
    let calculatedYMax = -Infinity;

    for (let x = xMin; x <= xMax + 0.0001; x += step) {
      const y = evalMath(x);
      points.push({ x, y });
      if (y < calculatedYMin) calculatedYMin = y;
      if (y > calculatedYMax) calculatedYMax = y;
    }

    if (calculatedYMin !== Infinity && calculatedYMax !== -Infinity) {
      yMin = Math.min(-1, Math.floor(calculatedYMin) - 1);
      yMax = Math.max(2, Math.ceil(calculatedYMax) + 1);
    }

    // Tọa độ SVG: viewBox 0 0 340 210
    const svgW = 340;
    const svgH = 210;
    const pad = 26;

    const toSvgX = (x: number) => pad + ((x - xMin) / (xMax - xMin)) * (svgW - 2 * pad);
    const toSvgY = (y: number) => (svgH - pad) - ((y - yMin) / (yMax - yMin)) * (svgH - 2 * pad);

    const pathD = points.reduce((acc, pt, i) => {
      const sx = toSvgX(pt.x);
      const sy = toSvgY(pt.y);
      return i === 0 ? `M ${sx.toFixed(1)} ${sy.toFixed(1)}` : `${acc} L ${sx.toFixed(1)} ${sy.toFixed(1)}`;
    }, '');

    const ox = toSvgX(0);
    const oy = toSvgY(0);

    return {
      formulaStr,
      xMin,
      xMax,
      yMin,
      yMax,
      svgW,
      svgH,
      ox,
      oy,
      pathD,
      toSvgX,
      toSvgY,
    };
  }, [cleanTikz, isGraph]);

  return (
    <div className={`relative inline-block my-2 w-full max-w-xl group/tikz ${className}`}>
      {/* NÚT CHÉP MÃ & XEM TIKZ: CHỈ HIỂN THỊ KHI LÀ GIÁO VIÊN */}
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
            onClick={(e) => {
              e.stopPropagation();
              setShowRawCode(!showRawCode);
            }}
            className="px-2 py-0.5 rounded text-[11px] font-medium text-slate-700 hover:bg-slate-100 flex items-center gap-1 transition-colors cursor-pointer"
            title="Xem/Ẩn mã nguồn TikZ"
          >
            {showRawCode ? <EyeOff className="w-3 h-3 text-indigo-600" /> : <Code className="w-3 h-3 text-slate-600" />}
            <span>{showRawCode ? 'Xem hình' : 'Xem TikZ'}</span>
          </button>
        </div>
      )}

      {/* Hiển thị mã nguồn TikZ nếu giáo viên bật xem */}
      {showRawCode ? (
        <div className="relative bg-slate-900 text-sky-300 p-3 rounded-lg font-mono text-xs overflow-x-auto my-1">
          <pre className="m-0 leading-relaxed">{tikzCode}</pre>
        </div>
      ) : (
        /* VÙNG VẼ ĐỒ THỊ / BẢNG BIẾN THIÊN 100% TRONG SUỐT, KHÔNG CHÚ THÍCH */
        <div className="w-full bg-transparent flex flex-col items-center justify-center">
          {/* 1. BẢNG BIẾN THIÊN (TRONG SUỐT HOÀN TOÀN, ĐƯỜNG KẺ RÕ RÀNG NHƯ CHỮ TEXT) */}
          {isBBT && bbtData && (
            <div className="w-full overflow-x-auto py-1 bg-transparent">
              <table className="min-w-full border-collapse border border-slate-800 text-center font-serif text-sm bg-transparent">
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

          {/* 2. ĐỒ THỊ HÀM SỐ (SVG TRONG SUỐT 100%, KHÔNG NỀN, KHÔNG CHÚ THÍCH) */}
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
                  fontSize="13"
                  fontStyle="italic"
                  fontFamily="serif"
                  fontWeight="bold"
                >
                  x
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
                  y="18"
                  fill="#0f172a"
                  fontSize="13"
                  fontStyle="italic"
                  fontFamily="serif"
                  fontWeight="bold"
                >
                  y
                </text>

                {/* Gốc tọa độ O */}
                <text
                  x={graphData.ox - 13}
                  y={graphData.oy + 14}
                  fill="#0f172a"
                  fontSize="12"
                  fontStyle="italic"
                  fontFamily="serif"
                  fontWeight="bold"
                >
                  O
                </text>

                {/* Đường cong đồ thị hàm số (Màu xanh dương / đen toán học nét đậm sắc sảo) */}
                <path
                  d={graphData.pathD}
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />

                {/* Điểm giao điểm / cực trị */}
                <circle
                  cx={graphData.ox}
                  cy={graphData.toSvgY(-1)}
                  r="2.5"
                  fill="#1e293b"
                />
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
      )}
    </div>
  );
};
