/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import katex from 'katex';
import { BbtSolverResult, BbtColData, BbtInterval } from './types';

/**
 * Tự động nhận diện tên hàm (y, f(x), s(t)...) và tên biến (x, t, u...) từ công thức
 */
export const detectFuncAndVar = (formulaRaw: string): {
  funcName: string;
  varName: string;
  funcRow: string;
  derivRow: string;
  expr: string;
} => {
  const str = (formulaRaw || '').trim();
  let funcName = 'y';
  let varName = 'x';
  let funcRow = 'y';
  let derivRow = "y'";
  let expr = str;

  if (!str) {
    return { funcName, varName, funcRow, derivRow, expr };
  }

  // 1. Dạng f(x) = ... hoặc y(t) = ... hoặc s(t) = ...
  const funcParenMatch = str.match(/^([a-zA-Z_]\w*)\s*\(\s*([a-zA-Z_]\w*)\s*\)\s*=\s*(.+)$/);
  if (funcParenMatch) {
    funcName = funcParenMatch[1];
    varName = funcParenMatch[2];
    funcRow = `${funcName}(${varName})`;
    derivRow = `${funcName}'(${varName})`;
    expr = funcParenMatch[3];
  } else {
    // 2. Dạng y = ... hoặc s = ... hoặc v = ...
    const eqMatch = str.match(/^([a-zA-Z_]\w*)\s*=\s*(.+)$/);
    if (eqMatch) {
      funcName = eqMatch[1];
      expr = eqMatch[2];
      funcRow = funcName;
      derivRow = `${funcName}'`;
    }
    // Dò tìm tên biến xuất hiện trong vế phải expr (loại trừ các từ khóa hàm toán: sqrt, dfrac, frac, sin, cos, tan, cot, log, ln, exp, pi...)
    const cleanExpr = expr.replace(/\\?(?:dfrac|frac|sqrt|sin|cos|tan|cot|ln|log|exp|pi|theta)\b/gi, '');
    const letters = cleanExpr.match(/[a-zA-Z]/g);
    if (letters) {
      const candidates = letters.filter(v => v.toLowerCase() !== funcName.toLowerCase());
      if (candidates.length > 0) {
        varName = candidates[0];
      }
    }
  }

  return { funcName, varName, funcRow, derivRow, expr };
};

/**
 * Hàm tự động giải và bóc tách bảng biến thiên từ công thức hàm số (Nhập hàm số tự động)
 * Hỗ trợ đa thức bậc 1, 2, 3, 4 trùng phương, phân thức bậc 1/1, 2/1, 2/2, ưu tiên phân số và căn.
 */
export const solveFunctionForBbt = (formulaRaw: string): BbtSolverResult => {
  const str = (formulaRaw || '').trim();
  if (!str) {
    return {
      success: false,
      xPoints: '',
      yPrimeSigns: '',
      yValues: '',
      description: 'Vui lòng nhập công thức',
      varName: 'x',
      funcRow: 'y',
      derivRow: "y'"
    };
  }

  const { varName, funcRow, derivRow, expr } = detectFuncAndVar(str);

  // Chuẩn hóa biểu thức về biến x để các hàm parsePoly và tính toán đại số xử lý đồng nhất 100%
  let f = expr.replace(/\s+/g, '');
  if (varName !== 'x') {
    const varRegex = new RegExp(`(?<![a-zA-Z])${varName}(?![a-zA-Z])`, 'g');
    f = f.replace(varRegex, 'x');
  }

  const toTex = (val: number): string => {
    if (Math.abs(val - Math.round(val)) < 1e-4) return `${Math.round(val)}`;
    const sign = val < 0 ? '-' : '';
    const absVal = Math.abs(val);

    // 1. Ưu tiên kiểm tra căn thuần: c * \sqrt{k} hoặc \dfrac{c\sqrt{k}}{d} (ví dụ: \sqrt{2}, 2\sqrt{2}, \dfrac{\sqrt{2}}{2}, \sqrt{3}, \sqrt{5}...)
    const rads = [2, 3, 5, 6, 7, 10, 11, 13, 14, 15, 17, 19, 21];
    for (const k of rads) {
      const sqrtK = Math.sqrt(k);
      for (let d = 1; d <= 12; d++) {
        const c = Math.round((absVal * d) / sqrtK);
        if (c >= 1 && c <= 20) {
          if (Math.abs(absVal - (c * sqrtK) / d) < 1e-4) {
            const cPart = c === 1 ? '' : `${c}`;
            if (d === 1) {
              return `${sign}${cPart}\\sqrt{${k}}`;
            } else {
              return `${sign}\\dfrac{${cPart}\\sqrt{${k}}}{${d}}`;
            }
          }
        }
      }
    }

    // 2. Kiểm tra căn dạng (u +- c*sqrt(k)) / d (ví dụ: \dfrac{1 - \sqrt{5}}{2}, 1 + \sqrt{2}, -2 + \sqrt{3}...)
    for (const k of [2, 3, 5, 6, 7]) {
      const sqrtK = Math.sqrt(k);
      for (let d = 1; d <= 6; d++) {
        for (let u = -15; u <= 15; u++) {
          for (let c = 1; c <= 8; c++) {
            const cPart = c === 1 ? '' : `${c}`;
            // u + c*sqrt(k) / d
            const vPlus = (u + c * sqrtK) / d;
            if (Math.abs(val - vPlus) < 1e-4) {
              const top = (u === 0 ? '' : `${u} + `) + `${cPart}\\sqrt{${k}}`;
              return d === 1 ? top : `\\dfrac{${top}}{${d}}`;
            }
            // u - c*sqrt(k) / d
            const vMinus = (u - c * sqrtK) / d;
            if (Math.abs(val - vMinus) < 1e-4) {
              const top = (u === 0 ? '-' : `${u} - `) + `${cPart}\\sqrt{${k}}`;
              return d === 1 ? top : `\\dfrac{${top}}{${d}}`;
            }
          }
        }
      }
    }

    // 3. Ưu tiên phân số hữu tỉ p / q (ví dụ: \dfrac{1}{2}, \dfrac{3}{4}, -\dfrac{5}{3}...)
    for (let q = 2; q <= 80; q++) {
      const p = Math.round(absVal * q);
      if (Math.abs(absVal - p / q) < 1e-4) {
        return `${sign}\\dfrac{${p}}{${q}}`;
      }
    }

    return `${Number(val.toFixed(2))}`;
  };

  // Hàm phân tích đa thức 1 biến x bậc đến 4
  const parsePoly = (exprStr: string) => {
    let s = exprStr.trim().replace(/^y\s*=\s*/i, '').replace(/\s+/g, '');
    s = s.replace(/-/g, '+-');
    if (s.startsWith('+')) s = s.substring(1);
    const terms = s.split('+').filter(Boolean);
    const coeffs: { [key: number]: number } = { 4: 0, 3: 0, 2: 0, 1: 0, 0: 0 };
    for (const t of terms) {
      const m = t.match(/^([+-]?\d*(?:\.\d+)?)?\*?x(?:\^(\d+))?$/i);
      if (m) {
        const cStr = m[1];
        const coef = (cStr === '' || cStr === '+' || !cStr) ? 1 : (cStr === '-' ? -1 : parseFloat(cStr));
        const deg = m[2] ? parseInt(m[2], 10) : 1;
        if (deg in coeffs) coeffs[deg] += coef;
      } else {
        const numMatch = t.match(/^([+-]?\d+(?:\.\d+)?)$/);
        if (numMatch) {
          coeffs[0] += parseFloat(numMatch[1]);
        }
      }
    }
    return coeffs;
  };

  // 1. Phân thức hữu tỉ: Phân thức bậc 1/1, Bậc 2/1, Bậc 2/2
  const fracParts = f.split('/');
  if (fracParts.length === 2) {
    const numClean = fracParts[0].replace(/^\(|\)$/g, '');
    const denClean = fracParts[1].replace(/^\(|\)$/g, '');
    const pNum = parsePoly(numClean);
    const pDen = parsePoly(denClean);

    // 1.1 Phân thức bậc 1 / bậc 1: (ax+b)/(cx+d)
    if (pNum[4] === 0 && pNum[3] === 0 && pNum[2] === 0 && pDen[4] === 0 && pDen[3] === 0 && pDen[2] === 0 && pDen[1] !== 0) {
      const a = pNum[1];
      const b = pNum[0];
      const c = pDen[1];
      const d = pDen[0];

      const x0 = -d / c;
      const det = a * d - b * c;
      const y0 = a / c;
      const x0Tex = toTex(x0);
      const y0Tex = toTex(y0);

      if (det > 0) {
        return {
          success: true,
          xPoints: `-\\infty, ${x0Tex}, +\\infty`,
          yPrimeSigns: `, +, ||, +, `,
          yValues: `-/ ${y0Tex}, +D-/ +\\infty / -\\infty, +/ ${y0Tex}`,
          description: `Hàm phân thức đồng biến trên từng khoảng xác định (Tiệm cận đứng ${varName} = ${x0Tex}, Tiệm cận ngang ${funcRow} = ${y0Tex})`,
          varName,
          funcRow,
          derivRow
        };
      } else if (det < 0) {
        return {
          success: true,
          xPoints: `-\\infty, ${x0Tex}, +\\infty`,
          yPrimeSigns: `, -, ||, -, `,
          yValues: `+/ ${y0Tex}, -D+/ -\\infty / +\\infty, -/ ${y0Tex}`,
          description: `Hàm phân thức nghịch biến trên từng khoảng xác định (Tiệm cận đứng ${varName} = ${x0Tex}, Tiệm cận ngang ${funcRow} = ${y0Tex})`,
          varName,
          funcRow,
          derivRow
        };
      }
    }

    // 1.2 Phân thức bậc 2 / bậc 1: (a2*x^2 + a1*x + a0) / (b1*x + b0)
    if (pNum[2] !== 0 && pDen[2] === 0 && pDen[1] !== 0) {
      const a2 = pNum[2], a1 = pNum[1], a0 = pNum[0];
      const b1 = pDen[1], b0 = pDen[0];

      const x0 = -b0 / b1;
      const x0Tex = toTex(x0);

      const A = a2 * b1;
      const Bprime = a2 * b0;
      const C = a1 * b0 - a0 * b1;
      const deltaPrime = Bprime * Bprime - A * C;

      if (deltaPrime > 1e-6) {
        let r1 = (-Bprime - Math.sqrt(deltaPrime)) / A;
        let r2 = (-Bprime + Math.sqrt(deltaPrime)) / A;
        if (r1 > r2) { const tmp = r1; r1 = r2; r2 = tmp; }

        const fVal = (x: number) => (a2 * x * x + a1 * x + a0) / (b1 * x + b0);
        const y1 = fVal(r1);
        const y2 = fVal(r2);

        const r1Tex = toTex(r1);
        const r2Tex = toTex(r2);
        const y1Tex = toTex(y1);
        const y2Tex = toTex(y2);

        if (A > 0) {
          return {
            success: true,
            xPoints: `-\\infty, ${r1Tex}, ${x0Tex}, ${r2Tex}, +\\infty`,
            yPrimeSigns: `, +, 0, -, ||, -, 0, +, `,
            yValues: `-/ -\\infty, +/ ${y1Tex}, -D+/ -\\infty / +\\infty, -/ ${y2Tex}, +/ +\\infty`,
            description: `Hàm phân thức bậc 2/1 có 2 cực trị: Cực đại tại (${r1Tex}; ${y1Tex}), Cực tiểu tại (${r2Tex}; ${y2Tex}), Tiệm cận đứng ${varName} = ${x0Tex}`,
            varName,
            funcRow,
            derivRow
          };
        } else {
          return {
            success: true,
            xPoints: `-\\infty, ${r1Tex}, ${x0Tex}, ${r2Tex}, +\\infty`,
            yPrimeSigns: `, -, 0, +, ||, +, 0, -, `,
            yValues: `+/ +\\infty, -/ ${y1Tex}, +D-/ +\\infty / -\\infty, +/ ${y2Tex}, -/ -\\infty`,
            description: `Hàm phân thức bậc 2/1 có 2 cực trị: Cực tiểu tại (${r1Tex}; ${y1Tex}), Cực đại tại (${r2Tex}; ${y2Tex}), Tiệm cận đứng ${varName} = ${x0Tex}`,
            varName,
            funcRow,
            derivRow
          };
        }
      } else {
        if (A > 0) {
          return {
            success: true,
            xPoints: `-\\infty, ${x0Tex}, +\\infty`,
            yPrimeSigns: `, +, ||, +, `,
            yValues: `-/ -\\infty, +D-/ +\\infty / -\\infty, +/ +\\infty`,
            description: `Hàm phân thức bậc 2/1 đồng biến trên từng khoảng xác định, Tiệm cận đứng ${varName} = ${x0Tex}`,
            varName,
            funcRow,
            derivRow
          };
        } else {
          return {
            success: true,
            xPoints: `-\\infty, ${x0Tex}, +\\infty`,
            yPrimeSigns: `, -, ||, -, `,
            yValues: `+/ +\\infty, -D+/ -\\infty / +\\infty, -/ -\\infty`,
            description: `Hàm phân thức bậc 2/1 nghịch biến trên từng khoảng xác định, Tiệm cận đứng ${varName} = ${x0Tex}`,
            varName,
            funcRow,
            derivRow
          };
        }
      }
    }

    // 1.3 Phân thức bậc 2 / bậc 2: (a2*x^2 + a1*x + a0) / (b2*x^2 + b1*x + b0)
    if (pDen[2] !== 0) {
      const a2 = pNum[2], a1 = pNum[1], a0 = pNum[0];
      const b2 = pDen[2], b1 = pDen[1], b0 = pDen[0];

      const fVal = (x: number) => (a2 * x * x + a1 * x + a0) / (b2 * x * x + b1 * x + b0);
      const yHoriz = a2 / b2;
      const yHorizTex = toTex(yHoriz);

      const deltaDen = b1 * b1 - 4 * b2 * b0;
      const discPoints: number[] = [];
      if (deltaDen > 1e-6) {
        const d1 = (-b1 - Math.sqrt(deltaDen)) / (2 * b2);
        const d2 = (-b1 + Math.sqrt(deltaDen)) / (2 * b2);
        discPoints.push(Math.min(d1, d2), Math.max(d1, d2));
      } else if (Math.abs(deltaDen) <= 1e-6) {
        discPoints.push(-b1 / (2 * b2));
      }

      const Ag = a2 * b1 - a1 * b2;
      const Bg = 2 * (a2 * b0 - a0 * b2);
      const Cg = a1 * b0 - a0 * b1;

      const critPoints: number[] = [];
      if (Math.abs(Ag) > 1e-6) {
        const deltaGPrime = (Bg / 2) * (Bg / 2) - Ag * Cg;
        if (deltaGPrime > 1e-6) {
          const c1 = (-Bg / 2 - Math.sqrt(deltaGPrime)) / Ag;
          const c2 = (-Bg / 2 + Math.sqrt(deltaGPrime)) / Ag;
          critPoints.push(Math.min(c1, c2), Math.max(c1, c2));
        } else if (Math.abs(deltaGPrime) <= 1e-6) {
          critPoints.push(-Bg / (2 * Ag));
        }
      } else if (Math.abs(Bg) > 1e-6) {
        critPoints.push(-Cg / Bg);
      }

      interface SpecialPoint {
        x: number;
        type: '||' | '0';
      }
      const specList: SpecialPoint[] = [];
      for (const dp of discPoints) specList.push({ x: dp, type: '||' });
      for (const cp of critPoints) {
        if (!discPoints.some(dp => Math.abs(dp - cp) < 1e-4)) {
          specList.push({ x: cp, type: '0' });
        }
      }
      specList.sort((p1, p2) => p1.x - p2.x);

      const xPts = ['-\\infty', ...specList.map(p => toTex(p.x)), '+\\infty'];
      const numIntervals = specList.length + 1;

      const intervalSignsArr: string[] = [];
      for (let i = 0; i < numIntervals; i++) {
        let testX: number;
        if (i === 0) {
          testX = specList.length > 0 ? specList[0].x - 1 : 0;
        } else if (i === numIntervals - 1) {
          testX = specList[specList.length - 1].x + 1;
        } else {
          testX = (specList[i - 1].x + specList[i].x) / 2;
        }
        const gVal = Ag * testX * testX + Bg * testX + Cg;
        intervalSignsArr.push(gVal >= 0 ? '+' : '-');
      }

      let yPrimeStr = '';
      for (let i = 0; i < numIntervals; i++) {
        yPrimeStr += `, ${intervalSignsArr[i]}`;
        if (i < specList.length) {
          yPrimeStr += `, ${specList[i].type}`;
        }
      }
      yPrimeStr += ', ';

      const yValParts: string[] = [];
      const firstSign = intervalSignsArr[0];
      yValParts.push(`${firstSign === '+' ? '-' : '+'}/ ${yHorizTex}`);

      for (let i = 0; i < specList.length; i++) {
        const sp = specList[i];
        if (sp.type === '0') {
          const yC = fVal(sp.x);
          const prevSign = intervalSignsArr[i];
          const nextSign = intervalSignsArr[i + 1];
          const dir = (prevSign === '+' && nextSign === '-') ? '+' : '-';
          yValParts.push(`${dir}/ ${toTex(yC)}`);
        } else {
          const prevSign = intervalSignsArr[i];
          const nextSign = intervalSignsArr[i + 1];
          const leftLimit = prevSign === '+' ? '+\\infty' : '-\\infty';
          const rightLimit = nextSign === '+' ? '-\\infty' : '+\\infty';
          const leftD = prevSign === '+' ? '+' : '-';
          const rightD = nextSign === '+' ? '-' : '+';
          yValParts.push(`${leftD}D${rightD}/ ${leftLimit} / ${rightLimit}`);
        }
      }

      const lastSign = intervalSignsArr[numIntervals - 1];
      yValParts.push(`${lastSign === '+' ? '+' : '-'}/ ${yHorizTex}`);

      return {
        success: true,
        xPoints: xPts.join(', '),
        yPrimeSigns: yPrimeStr,
        yValues: yValParts.join(', '),
        description: `Hàm phân thức bậc 2/2 (Tiệm cận ngang ${funcRow} = ${yHorizTex}${discPoints.length > 0 ? `, Tiệm cận đứng: ${discPoints.map(d => varName + ' = ' + toTex(d)).join(', ')}` : ', TXĐ: ℝ'})`,
        varName,
        funcRow,
        derivRow
      };
    }
  }

  // 2. Trích xuất đa thức bậc 4, bậc 3, bậc 2, bậc 1
  const p = parsePoly(f);
  const a4 = p[4];
  const a3 = p[3];
  const a2 = p[2];
  const a1 = p[1];
  const a0 = p[0];

  // Bậc 4 trùng phương: a4 * x^4 + a2 * x^2 + a0 (a3 = 0, a1 = 0)
  if (a4 !== 0 && a3 === 0 && a1 === 0) {
    const delta = -a2 / (2 * a4);
    if (delta > 0) {
      const x1 = -Math.sqrt(delta);
      const x3 = Math.sqrt(delta);
      const y1 = a4 * Math.pow(x1, 4) + a2 * Math.pow(x1, 2) + a0;
      const y2 = a0;
      const x1T = toTex(x1);
      const x3T = toTex(x3);
      const y1T = toTex(y1);
      const y2T = toTex(y2);

      if (a4 > 0) {
        return {
          success: true,
          xPoints: `-\\infty, ${x1T}, 0, ${x3T}, +\\infty`,
          yPrimeSigns: `, -, 0, +, 0, -, 0, +, `,
          yValues: `+/ +\\infty, -/ ${y1T}, +/ ${y2T}, -/ ${y1T}, +/ +\\infty`,
          description: `Hàm bậc 4 trùng phương có 3 cực trị: 2 Cực tiểu tại ${varName} = ±${x3T}, 1 Cực đại tại ${varName} = 0`,
          varName,
          funcRow,
          derivRow
        };
      } else {
        return {
          success: true,
          xPoints: `-\\infty, ${x1T}, 0, ${x3T}, +\\infty`,
          yPrimeSigns: `, +, 0, -, 0, +, 0, -, `,
          yValues: `-/ -\\infty, +/ ${y1T}, -/ ${y2T}, +/ ${y1T}, -/ -\\infty`,
          description: `Hàm bậc 4 trùng phương có 3 cực trị: 2 Cực đại tại ${varName} = ±${x3T}, 1 Cực tiểu tại ${varName} = 0`,
          varName,
          funcRow,
          derivRow
        };
      }
    } else {
      const y0T = toTex(a0);
      if (a4 > 0) {
        return {
          success: true,
          xPoints: `-\\infty, 0, +\\infty`,
          yPrimeSigns: `, -, 0, +, `,
          yValues: `+/ +\\infty, -/ ${y0T}, +/ +\\infty`,
          description: `Hàm bậc 4 trùng phương có 1 cực tiểu tại (0; ${y0T})`,
          varName,
          funcRow,
          derivRow
        };
      } else {
        return {
          success: true,
          xPoints: `-\\infty, 0, +\\infty`,
          yPrimeSigns: `, +, 0, -, `,
          yValues: `-/ -\\infty, +/ ${y0T}, -/ -\\infty`,
          description: `Hàm bậc 4 trùng phương có 1 cực đại tại (0; ${y0T})`,
          varName,
          funcRow,
          derivRow
        };
      }
    }
  }

  // Bậc 3: a3 * x^3 + a2 * x^2 + a1 * x + a0
  if (a3 !== 0) {
    const deltaPrime = a2 * a2 - 3 * a3 * a1;
    if (deltaPrime > 0) {
      let r1 = (-a2 - Math.sqrt(deltaPrime)) / (3 * a3);
      let r2 = (-a2 + Math.sqrt(deltaPrime)) / (3 * a3);
      if (r1 > r2) { const tmp = r1; r1 = r2; r2 = tmp; }
      const y1 = a3 * Math.pow(r1, 3) + a2 * Math.pow(r1, 2) + a1 * r1 + a0;
      const y2 = a3 * Math.pow(r2, 3) + a2 * Math.pow(r2, 2) + a1 * r2 + a0;
      const x1T = toTex(r1);
      const x2T = toTex(r2);
      const y1T = toTex(y1);
      const y2T = toTex(y2);

      if (a3 > 0) {
        return {
          success: true,
          xPoints: `-\\infty, ${x1T}, ${x2T}, +\\infty`,
          yPrimeSigns: `, +, 0, -, 0, +, `,
          yValues: `-/ -\\infty, +/ ${y1T}, -/ ${y2T}, +/ +\\infty`,
          description: `Hàm bậc 3 có 2 điểm cực trị: Cực đại tại (${x1T}; ${y1T}), Cực tiểu tại (${x2T}; ${y2T})`,
          varName,
          funcRow,
          derivRow
        };
      } else {
        return {
          success: true,
          xPoints: `-\\infty, ${x1T}, ${x2T}, +\\infty`,
          yPrimeSigns: `, -, 0, +, 0, -, `,
          yValues: `+/ +\\infty, -/ ${y1T}, +/ ${y2T}, -/ -\\infty`,
          description: `Hàm bậc 3 có 2 điểm cực trị: Cực tiểu tại (${x1T}; ${y1T}), Cực đại tại (${x2T}; ${y2T})`,
          varName,
          funcRow,
          derivRow
        };
      }
    } else {
      if (a3 > 0) {
        return {
          success: true,
          xPoints: `-\\infty, +\\infty`,
          yPrimeSigns: `, +, `,
          yValues: `-/ -\\infty, +/ +\\infty`,
          description: `Hàm bậc 3 đồng biến trên toàn ℝ (không có cực trị)`,
          varName,
          funcRow,
          derivRow
        };
      } else {
        return {
          success: true,
          xPoints: `-\\infty, +\\infty`,
          yPrimeSigns: `, -, `,
          yValues: `+/ +\\infty, -/ -\\infty`,
          description: `Hàm bậc 3 nghịch biến trên toàn ℝ (không có cực trị)`,
          varName,
          funcRow,
          derivRow
        };
      }
    }
  }

  // Bậc 2 Parabol: a2 * x^2 + a1 * x + a0
  if (a2 !== 0) {
    const x0 = -a1 / (2 * a2);
    const y0 = a2 * x0 * x0 + a1 * x0 + a0;
    const x0T = toTex(x0);
    const y0T = toTex(y0);

    if (a2 > 0) {
      return {
        success: true,
        xPoints: `-\\infty, ${x0T}, +\\infty`,
        yPrimeSigns: `, -, 0, +, `,
        yValues: `+/ +\\infty, -/ ${y0T}, +/ +\\infty`,
        description: `Hàm bậc 2 Parabol bề lõm quay lên, đỉnh (${x0T}; ${y0T})`,
        varName,
        funcRow,
        derivRow
      };
    } else {
      return {
        success: true,
        xPoints: `-\\infty, ${x0T}, +\\infty`,
        yPrimeSigns: `, +, 0, -, `,
        yValues: `-/ -\\infty, +/ ${y0T}, -/ -\\infty`,
        description: `Hàm bậc 2 Parabol bề lõm quay xuống, đỉnh (${x0T}; ${y0T})`,
        varName,
        funcRow,
        derivRow
      };
    }
  }

  // Bậc 1: a1 * x + a0
  if (a1 !== 0) {
    if (a1 > 0) {
      return {
        success: true,
        xPoints: `-\\infty, +\\infty`,
        yPrimeSigns: `, +, `,
        yValues: `-/ -\\infty, +/ +\\infty`,
        description: `Hàm bậc 1 đồng biến trên toàn ℝ`,
        varName,
        funcRow,
        derivRow
      };
    } else {
      return {
        success: true,
        xPoints: `-\\infty, +\\infty`,
        yPrimeSigns: `, -, `,
        yValues: `+/ +\\infty, -/ -\\infty`,
        description: `Hàm bậc 1 nghịch biến trên toàn ℝ`,
        varName,
        funcRow,
        derivRow
      };
    }
  }

  // Mặc định trả về mẫu cơ bản
  return {
    success: false,
    xPoints: `-\\infty, -1, 1, +\\infty`,
    yPrimeSigns: `, +, 0, -, 0, +, `,
    yValues: `-/ -\\infty, +/ 2, -/ -2, +/ +\\infty`,
    description: `Không tự động nhận diện dạng hàm, vui lòng dùng tab Nhập Tikz-tab`,
    varName,
    funcRow,
    derivRow
  };
};

/**
 * Hàm tính toán độ rộng chuẩn xác cho Bảng biến thiên tránh bị tràn và xuất hiện thanh trượt ngang
 */
export const calcAutoBbtWidth = (
  safeXPoints: string[],
  colData: Array<{ isDouble: boolean; val?: string; leftVal?: string; rightVal?: string }>,
  intervals: Array<{ hasLeftLimit: boolean; hasRightLimit: boolean }>
): number => {
  const N = safeXPoints.length;
  let total = 60; // Cột tiêu đề mốc x, y', y

  for (let i = 0; i < N; i++) {
    const xp = safeXPoints[i] || '';
    const cd = colData[i];
    let ptW = 50;
    if (xp.includes('dfrac') || xp.includes('frac')) ptW = Math.max(ptW, 78);
    else if (xp.includes('sqrt')) ptW = Math.max(ptW, 72);
    else if (xp.length > 5) ptW = Math.max(ptW, 60);

    if (cd) {
      if (cd.isDouble) {
        ptW = Math.max(ptW, 32); // Cột dấu hai gạch mỏng
      } else {
        const yVal = cd.val || '';
        if (yVal.includes('dfrac') || yVal.includes('frac')) ptW = Math.max(ptW, 82);
        else if (yVal.includes('sqrt')) ptW = Math.max(ptW, 76);
        else if (yVal.length > 5) ptW = Math.max(ptW, 64);
      }
    }
    total += ptW;
  }

  for (let i = 0; i < N - 1; i++) {
    const inter = intervals[i];
    let intW = 76;
    if (inter && (inter.hasLeftLimit || inter.hasRightLimit)) {
      intW = (inter.hasLeftLimit && inter.hasRightLimit) ? 116 : 96;
    }
    total += intW;
  }

  total += 32; // Đệm biên chống co tràn
  return Math.max(480, total);
};

/**
 * Hàm giải mã giá trị số hoặc vô cực từ chuỗi KaTeX/LaTeX để so sánh độ lớn tại 2 mút
 */
export const parseNumericValue = (str: string): number => {
  if (!str) return NaN;
  const s = str.trim().replace(/^\$|\$$/g, '');
  if (s.includes('+\\infty') || s.includes('+infty') || s === '\\infty' || s === 'infty') return Infinity;
  if (s.includes('-\\infty') || s.includes('-infty')) return -Infinity;

  if (s.startsWith('\\dfrac{') || s.startsWith('\\frac{')) {
    const startIdx = s.indexOf('{');
    let depth = 1;
    let midIdx = -1;
    for (let i = startIdx + 1; i < s.length; i++) {
      if (s[i] === '{') depth++;
      else if (s[i] === '}') {
        depth--;
        if (depth === 0) {
          midIdx = i;
          break;
        }
      }
    }
    if (midIdx !== -1 && s[midIdx + 1] === '{' && s.endsWith('}')) {
      const numStr = s.substring(startIdx + 1, midIdx);
      const denStr = s.substring(midIdx + 2, s.length - 1);
      const num = parseNumericValue(numStr);
      const den = parseNumericValue(denStr);
      if (!isNaN(num) && !isNaN(den) && den !== 0) return num / den;
    }
  }

  const sqrtM = s.match(/^([+-]?\d*(?:\.\d+)?)?\\sqrt\{(\d+)\}$/);
  if (sqrtM) {
    const cStr = sqrtM[1];
    const coef = (cStr === '' || cStr === '+' || !cStr) ? 1 : (cStr === '-' ? -1 : parseFloat(cStr));
    const k = parseFloat(sqrtM[2]);
    return coef * Math.sqrt(k);
  }

  const exprM = s.match(/^([+-]?\d+(?:\.\d+)?)\s*([+-])\s*(\d*)?\\sqrt\{(\d+)\}$/);
  if (exprM) {
    const u = parseFloat(exprM[1]);
    const op = exprM[2] === '-' ? -1 : 1;
    const c = exprM[3] ? parseFloat(exprM[3]) : 1;
    const k = parseFloat(exprM[4]);
    return u + op * c * Math.sqrt(k);
  }

  const p = parseFloat(s);
  return isNaN(p) ? NaN : p;
};

/**
 * Hàm sinh HTML Bảng biến thiên TikZ-Tab với KaTeX và cột thẳng hàng 100% (nền trong suốt, chuẩn SGK)
 */
export const generateWordBbtHtml = (
  xPointsStr: string,
  yPrimeSignsStr: string,
  yValuesStr: string,
  bbtIdParam?: string,
  formulaParam?: string,
  modeParam?: 'function' | 'manual',
  widthParam?: number,
  alignParam?: 'left' | 'center' | 'right',
  varNameParam?: string,
  funcRowParam?: string,
  derivRowParam?: string,
  isTeacher: boolean = true
): string => {
  const bbtId = bbtIdParam || `bbt-${Math.random().toString(36).substring(2, 8)}`;
  const align = alignParam || 'center';

  // Tự động xác định tên biến và tên hàm nếu chưa truyền
  let varName = varNameParam;
  let funcRow = funcRowParam;
  let derivRow = derivRowParam;
  if (!varName || !funcRow || !derivRow) {
    if (formulaParam) {
      const solved = solveFunctionForBbt(formulaParam);
      varName = varName || solved.varName || 'x';
      funcRow = funcRow || solved.funcRow || 'y';
      derivRow = derivRow || solved.derivRow || "y'";
    } else {
      varName = varName || 'x';
      funcRow = funcRow || 'y';
      derivRow = derivRow || "y'";
    }
  }

  const renderKatex = (str: string) => {
    const clean = (str || '').replace(/^\$|\$$/g, '').trim();
    if (!clean) return '';
    try {
      return katex.renderToString(clean, { displayMode: false, throwOnError: false });
    } catch {
      return clean;
    }
  };

  // 1. Phân tích các mốc x: -\infty, -1, 1, +\infty
  const xPoints = xPointsStr.split(',').map(s => s.trim()).filter(Boolean);
  const safeXPoints = xPoints.length > 0 ? xPoints : ['-\\infty', '-1', '1', '+\\infty'];
  const N = safeXPoints.length;

  // 2. Phân tích yPrimeSigns
  const rawSigns = yPrimeSignsStr.split(',').map(s => s.trim());
  const intervalSigns: string[] = [];
  const pointSigns: string[] = [];
  const nonEmpties = rawSigns.filter(s => s !== '');

  if (nonEmpties.length === 2 * N - 3) {
    for (let i = 0; i < N; i++) {
      if (i === 0 || i === N - 1) {
        pointSigns.push('');
      } else {
        pointSigns.push(nonEmpties[2 * i - 1] || '0');
      }
    }
    for (let i = 0; i < N - 1; i++) {
      intervalSigns.push(nonEmpties[2 * i] || '+');
    }
  } else if (nonEmpties.length === N - 1) {
    for (let i = 0; i < N; i++) {
      pointSigns.push(i === 0 || i === N - 1 ? '' : '0');
    }
    for (let i = 0; i < N - 1; i++) {
      intervalSigns.push(nonEmpties[i] || '+');
    }
  } else if (rawSigns.length >= 2 * N - 1) {
    for (let i = 0; i < N; i++) {
      if (i === 0 || i === N - 1) {
        pointSigns.push('');
      } else {
        pointSigns.push(rawSigns[2 * i] || '0');
      }
    }
    for (let i = 0; i < N - 1; i++) {
      intervalSigns.push(rawSigns[2 * i + 1] || '+');
    }
  } else {
    for (let i = 0; i < N; i++) {
      pointSigns.push(i === 0 || i === N - 1 ? '' : '0');
    }
    for (let i = 0; i < N - 1; i++) {
      intervalSigns.push(i % 2 === 0 ? '+' : '-');
    }
  }

  // 3. Phân tích yValues: hỗ trợ cả đa thức và phân thức chứa || hoặc +D-/
  const rawYParts = yValuesStr.split(',').map(s => s.trim()).filter(Boolean);
  const colData: BbtColData[] = [];

  for (let i = 0; i < N; i++) {
    const raw = rawYParts[i] || '';
    const isDbl = (pointSigns[i] === '||') || raw.includes('||') || raw.includes('D');
    if (isDbl) {
      let leftDir: '+' | '-' = '+', leftVal = '+\\infty', rightDir: '+' | '-' = '-', rightVal = '-\\infty';
      if (raw.includes('||')) {
        const sides = raw.split('||');
        const sL = sides[0].trim().split('/');
        const sR = sides[1].trim().split('/');
        leftDir = (sL[0].trim() === '-' ? '-' : '+');
        leftVal = sL.slice(1).join('/').trim() || '+\\infty';
        rightDir = (sR[0].trim() === '+' ? '+' : '-');
        rightVal = sR.slice(1).join('/').trim() || '-\\infty';
      } else if (raw.includes('D')) {
        const m = raw.match(/^([+-])D([+-])\s*\/\s*([^/]+)\s*\/\s*(.+)$/);
        if (m) {
          leftDir = m[1] as '+' | '-';
          rightDir = m[2] as '+' | '-';
          leftVal = m[3].trim();
          rightVal = m[4].trim();
        }
      }
      colData.push({ isDouble: true, leftDir, leftVal, rightDir, rightVal });
    } else {
      const segs = raw.split('/');
      let dir: '+' | '-' = (segs[0].trim() === '+' ? '+' : '-');
      let val = segs.length >= 2 ? segs.slice(1).join('/').trim() : raw;
      if (!val) {
        const isHigh = i % 2 === 1;
        dir = isHigh ? '+' : '-';
        val = safeXPoints[i] === '-\\infty' ? '-\\infty' : safeXPoints[i] === '+\\infty' ? '+\\infty' : '0';
      }
      colData.push({ isDouble: false, dir, val });
    }
  }

  const intervals: BbtInterval[] = [];
  for (let i = 0; i < N - 1; i++) {
    const leftCol = colData[i] || { isDouble: false, dir: '-', val: '0' };
    const rightCol = colData[i + 1] || { isDouble: false, dir: '+', val: '0' };

    const startVal = (leftCol.isDouble ? leftCol.rightVal : leftCol.val) || '0';
    const endVal = (rightCol.isDouble ? rightCol.leftVal : rightCol.val) || '0';

    const sign = (intervalSigns[i] || '').trim();
    const numStart = parseNumericValue(startVal);
    const numEnd = parseNumericValue(endVal);
    const hasNumericCompare = !isNaN(numStart) && !isNaN(numEnd) && numStart !== numEnd;

    let isGoingUp: boolean;
    if (sign === '+' || sign === '+/') {
      isGoingUp = true;
    } else if (sign === '-' || sign === '-/') {
      isGoingUp = false;
    } else if (hasNumericCompare) {
      isGoingUp = numStart < numEnd;
    } else if ((leftCol.isDouble ? leftCol.rightDir : leftCol.dir) === '-' && (rightCol.isDouble ? rightCol.leftDir : rightCol.dir) === '+') {
      isGoingUp = true;
    } else if ((leftCol.isDouble ? leftCol.rightDir : leftCol.dir) === '+' && (rightCol.isDouble ? rightCol.leftDir : rightCol.dir) === '-') {
      isGoingUp = false;
    } else {
      isGoingUp = (i % 2 === 0);
    }

    intervals.push({
      startDir: isGoingUp ? '-' : '+',
      startVal,
      endDir: isGoingUp ? '+' : '-',
      endVal,
      isGoingUp,
      hasLeftLimit: !!leftCol.isDouble,
      hasRightLimit: !!rightCol.isDouble
    });
  }

  // Tính toán độ rộng đủ cho bảng biến thiên để không bao giờ bị tràn và không xuất hiện thanh trượt ngang
  const autoWidth = calcAutoBbtWidth(safeXPoints, colData, intervals);
  const initialWidth = widthParam ? Math.max(widthParam, autoWidth) : autoWidth;

  const marginStyle = align === 'left' ? 'margin-left: 0; margin-right: auto;' : align === 'right' ? 'margin-left: auto; margin-right: 0;' : 'margin-left: auto; margin-right: auto;';

  // Xây dựng Table HTML theo cấu trúc cột lưới chuẩn
  let xCellsHtml = '';
  let yPrimeCellsHtml = '';
  let yCellsHtml = '';

  for (let i = 0; i < N; i++) {
    const xp = safeXPoints[i];
    const isLast = i === N - 1;
    const cData = colData[i] || { isDouble: false, dir: '-', val: '' };

    // Row 1: x point cell
    xCellsHtml += `<td style="padding: 6px 12px; text-align: center; font-weight: 500; color: #0f172a; border-bottom: 1.5px solid #1e293b; white-space: nowrap; min-width: 44px;">${renderKatex(xp)}</td>`;

    // Row 2: y' point cell
    const pSign = pointSigns[i] || '';
    const pSignHtml = (pSign === '||' || cData.isDouble)
      ? `<span style="display: inline-block; border-left: 1.5px solid #1e293b; border-right: 1.5px solid #1e293b; width: 4px; height: 18px; vertical-align: middle;"></span>`
      : pSign === '0'
      ? `<span style="font-weight: bold; color: #0f172a; font-size: 14px;">0</span>`
      : pSign ? `<span style="font-weight: bold; color: #0f172a;">${renderKatex(pSign)}</span>` : '';

    yPrimeCellsHtml += `<td style="padding: 6px 8px; text-align: center; border-bottom: 1.5px solid #1e293b; color: #0f172a; font-weight: bold; min-width: 44px; white-space: nowrap;">${pSignHtml}</td>`;

    // Row 3: y point cell
    if (cData.isDouble) {
      yCellsHtml += `<td style="padding: 0 4px; text-align: center; vertical-align: middle; color: #0f172a; font-weight: 600; min-width: 24px; height: 75px; box-sizing: border-box; white-space: nowrap;"><div style="display: inline-block; border-left: 1.5px solid #1e293b; border-right: 1.5px solid #1e293b; width: 4px; height: 75px; vertical-align: middle;"></div></td>`;
    } else {
      let isTop = cData.dir === '+';
      if (i === 0 && intervals[0]) {
        isTop = !intervals[0].isGoingUp;
      } else if (i === N - 1 && intervals[N - 2]) {
        isTop = intervals[N - 2].isGoingUp;
      } else if (intervals[i - 1] && intervals[i]) {
        if (intervals[i - 1].isGoingUp && !intervals[i].isGoingUp) {
          isTop = true;
        } else if (!intervals[i - 1].isGoingUp && intervals[i].isGoingUp) {
          isTop = false;
        } else {
          isTop = intervals[i - 1].isGoingUp;
        }
      }

      yCellsHtml += `<td style="padding: 4px 8px; text-align: center; ${isTop ? 'vertical-align: top; padding-top: 8px;' : 'vertical-align: bottom; padding-bottom: 8px;'}; color: #0f172a; font-weight: 600; min-width: 44px; height: 75px; box-sizing: border-box; white-space: nowrap;">${renderKatex(cData.val || '')}</td>`;
    }

    // Khoảng giữa 2 mốc
    if (!isLast) {
      xCellsHtml += `<td style="padding: 6px 4px; min-width: 60px; border-bottom: 1.5px solid #1e293b;"></td>`;

      const iSign = intervalSigns[i] || '+';
      const col = iSign === '+' ? '#15803d' : iSign === '-' ? '#dc2626' : '#0f172a';
      const sym = iSign === '-' ? '&minus;' : iSign;
      yPrimeCellsHtml += `<td style="padding: 6px 8px; text-align: center; border-bottom: 1.5px solid #1e293b; font-weight: bold; min-width: 60px;"><span style="color: ${col}; font-size: 16px; font-weight: bold;">${sym}</span></td>`;

      const inter = intervals[i] || { isGoingUp: true, hasLeftLimit: false, hasRightLimit: false, startDir: '-', startVal: '', endDir: '+', endVal: '' };

      yCellsHtml += `
        <td style="padding: 0 4px; text-align: center; vertical-align: middle; min-width: 75px; height: 75px; box-sizing: border-box; position: relative;">
          ${inter.hasLeftLimit ? `
            <div style="position: absolute; left: 2px; ${inter.startDir === '+' ? 'top: 6px;' : 'bottom: 6px;'}; font-weight: 600; color: #0f172a; font-size: 13px; z-index: 2; white-space: nowrap;">
              ${renderKatex(inter.startVal)}
            </div>
          ` : ''}
          ${inter.hasRightLimit ? `
            <div style="position: absolute; right: 2px; ${inter.endDir === '+' ? 'top: 6px;' : 'bottom: 6px;'}; font-weight: 600; color: #0f172a; font-size: 13px; z-index: 2; white-space: nowrap;">
              ${renderKatex(inter.endVal)}
            </div>
          ` : ''}
          <svg style="width: 100%; height: 68px; display: block; overflow: visible;" viewBox="0 0 100 68" preserveAspectRatio="none">
            <defs>
              <marker id="${bbtId}-arr-${i}" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <polygon points="0 0, 6 3, 0 6" fill="#0f172a" />
              </marker>
            </defs>
            ${inter.isGoingUp ? `
              <line x1="${inter.hasLeftLimit ? 28 : 4}" y1="56" x2="${inter.hasRightLimit ? 72 : 94}" y2="12" stroke="#0f172a" stroke-width="1.8" marker-end="url(#${bbtId}-arr-${i})" />
            ` : `
              <line x1="${inter.hasLeftLimit ? 28 : 4}" y1="12" x2="${inter.hasRightLimit ? 72 : 94}" y2="56" stroke="#0f172a" stroke-width="1.8" marker-end="url(#${bbtId}-arr-${i})" />
            `}
          </svg>
        </td>
      `;
    }
  }

  return `
    <div class="word-bbt-wrapper relative my-3 group" contenteditable="false" draggable="${isTeacher ? 'true' : 'false'}" data-bbt-id="${bbtId}" data-formula="${encodeURIComponent(formulaParam || '')}" data-xpoints="${encodeURIComponent(xPointsStr)}" data-yprimesigns="${encodeURIComponent(yPrimeSignsStr)}" data-yvalues="${encodeURIComponent(yValuesStr)}" data-mode="${modeParam || 'manual'}" data-width="${initialWidth}" data-align="${align}" data-varname="${encodeURIComponent(varName)}" data-funcrow="${encodeURIComponent(funcRow)}" data-derivrow="${encodeURIComponent(derivRow)}" style="text-align: ${align}; margin: 16px auto; background: transparent; border: 1.5px dashed transparent; position: relative; max-width: ${initialWidth}px; width: 100%; display: block; user-select: none; ${marginStyle}" ${isTeacher ? `onmouseover="this.style.borderColor='#94a3b8'" onmouseout="this.style.borderColor='transparent'"` : ''}>
      ${isTeacher ? `
        <div class="word-bbt-controls flex items-center justify-between gap-1.5 px-2.5 py-1 mb-1 rounded-lg bg-white/95 backdrop-blur-xs border border-slate-200 shadow-sm text-xs transition-opacity" style="user-select: none;">
          <div class="flex items-center gap-1.5">
            <span class="bbt-drag-handle cursor-move font-bold text-slate-600 flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-slate-100 text-[11px]" title="Bấm giữ và kéo để di chuyển toàn bộ bảng biến thiên">
              ✥ Di chuyển
            </span>
            <span class="text-slate-300">|</span>
            <button type="button" class="edit-bbt-btn text-emerald-600 hover:text-emerald-800 font-bold px-2 py-0.5 rounded hover:bg-emerald-50 flex items-center gap-1 text-[11px] cursor-pointer" title="Mở lại cửa sổ để chỉnh sửa hoặc đổi hàm số cho bảng biến thiên này">
              ✏️ Sửa BBT
            </button>
          </div>
          <div class="flex items-center gap-1">
            <span class="text-[10px] text-slate-400 font-medium hidden sm:inline">↔ Co giãn:</span>
            <button type="button" class="bbt-size-btn px-1.5 py-0.5 rounded text-slate-600 hover:bg-slate-100 text-[10px] font-bold cursor-pointer" data-size-action="decrease" title="Thu nhỏ BBT">-10%</button>
            <button type="button" class="bbt-size-btn px-1.5 py-0.5 rounded text-slate-600 hover:bg-slate-100 text-[10px] font-bold cursor-pointer" data-size-action="increase" title="Phóng to BBT">+10%</button>
            <span class="text-slate-300">|</span>
            <button type="button" class="bbt-align-btn px-1.5 py-0.5 rounded ${align === 'left' ? 'text-slate-700 bg-slate-100 font-bold' : 'text-slate-500'} hover:bg-slate-100 text-[10px] cursor-pointer" data-align="left" title="Căn trái">⫷ Trái</button>
            <button type="button" class="bbt-align-btn px-1.5 py-0.5 rounded ${align === 'center' ? 'text-slate-700 bg-slate-100 font-bold' : 'text-slate-500'} text-[10px] cursor-pointer" data-align="center" title="Căn giữa">═ Giữa</button>
            <button type="button" class="bbt-align-btn px-1.5 py-0.5 rounded ${align === 'right' ? 'text-slate-700 bg-slate-100 font-bold' : 'text-slate-500'} text-[10px] cursor-pointer" data-align="right" title="Căn phải">⫸ Phải</button>
            <span class="text-slate-300">|</span>
            <button type="button" class="delete-graph-btn text-rose-500 hover:text-rose-700 font-bold px-1.5 py-0.5 rounded hover:bg-rose-50 text-[11px] cursor-pointer" title="Xóa bảng biến thiên này">✕</button>
          </div>
        </div>
      ` : ''}

      <div style="display: block; background: transparent; padding: 2px; width: 100%; overflow-x: auto;">
        <table style="border-collapse: collapse; border: 1.5px solid #1e293b; background: transparent; font-family: serif; font-size: 14px; margin: 0 auto; width: 100%; min-width: 320px; table-layout: auto;">
          <thead>
            <tr style="background: transparent;">
              <th style="padding: 6px 12px; border-right: 1.5px solid #1e293b; border-bottom: 1.5px solid #1e293b; font-style: italic; width: 50px; text-align: center; color: #0f172a; font-weight: bold;">
                ${renderKatex(varName)}
              </th>
              ${xCellsHtml}
            </tr>
          </thead>
          <tbody>
            <tr style="background: transparent;">
              <td style="padding: 6px 12px; border-right: 1.5px solid #1e293b; border-bottom: 1.5px solid #1e293b; font-style: italic; width: 50px; text-align: center; color: #0f172a; font-weight: bold;">
                ${renderKatex(derivRow)}
              </td>
              ${yPrimeCellsHtml}
            </tr>
            <tr style="background: transparent;">
              <td style="padding: 10px 12px; border-right: 1.5px solid #1e293b; font-style: italic; width: 50px; text-align: center; vertical-align: middle; color: #0f172a; font-weight: bold;">
                ${renderKatex(funcRow)}
              </td>
              ${yCellsHtml}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <p><br></p>
  `.trim();
};
