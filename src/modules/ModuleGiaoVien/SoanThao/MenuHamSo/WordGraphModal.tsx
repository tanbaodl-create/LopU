/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { TrendingUp, Check, X } from 'lucide-react';
import { generateWordGraphSvg, generateWordGraphWrapperHtml } from './graphUtils';

export interface WordGraphModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertGraph: (graphHtml: string) => void;
  editingGraphId?: string | null;
  initialFormula?: string;
  initialXMin?: string;
  initialXMax?: string;
  initialYMin?: string;
  initialYMax?: string;
  initialUnitX?: string;
  initialUnitY?: string;
  initialShowAxis?: boolean;
  initialShowOrigin?: boolean;
  initialShowExtrema?: boolean;
  userFontSize?: string;
  isTeacher?: boolean;
}

// Tự động phân tích tên hàm và tên biến từ chuỗi công thức
export const extractAxesFromFormula = (formulaStr: string): { funcName: string; varName: string } => {
  const clean = (formulaStr || '').trim();
  let funcName = 'y';
  let varName = 'x';

  if (!clean) return { funcName, varName };

  if (clean.includes('=')) {
    const parts = clean.split('=');
    const lhs = parts[0].trim();
    const rhs = parts.slice(1).join('=').trim();

    // 1. Tên hàm (trước dấu =)
    const parenMatch = lhs.match(/^([a-zA-Z_]\w*)\s*\(\s*([a-zA-Z_]\w*)\s*\)$/);
    if (parenMatch) {
      funcName = parenMatch[1];
      varName = parenMatch[2] || 'x';
    } else if (/^[a-zA-Z_]\w*$/.test(lhs)) {
      funcName = lhs;
    }

    // 2. Tên biến (sau dấu =)
    if (!parenMatch) {
      const mathKeywords = new Set([
        'sin', 'cos', 'tan', 'cot', 'ln', 'log', 'exp', 'sqrt', 'pi', 'abs', 'frac', 'cdot', 'times'
      ]);
      const tokens = rhs.match(/[a-zA-Z]+/g) || [];
      const nonKeywordVars: string[] = [];
      tokens.forEach(tok => {
        if (!mathKeywords.has(tok.toLowerCase())) {
          for (const char of tok) {
            if (!nonKeywordVars.includes(char)) {
              nonKeywordVars.push(char);
            }
          }
        }
      });

      if (nonKeywordVars.length === 1) {
        varName = nonKeywordVars[0];
      } else if (nonKeywordVars.length > 1) {
        if (nonKeywordVars.includes('x')) varName = 'x';
        else if (nonKeywordVars.includes('t')) varName = 't';
        else if (nonKeywordVars.includes('u')) varName = 'u';
        else if (funcName !== 'y' && nonKeywordVars.includes('y')) varName = 'y';
        else varName = nonKeywordVars[0];
      } else {
        varName = 'x';
      }
    }
  } else {
    const mathKeywords = new Set(['sin', 'cos', 'tan', 'cot', 'ln', 'log', 'exp', 'sqrt', 'pi', 'abs', 'frac']);
    const tokens = clean.match(/[a-zA-Z]+/g) || [];
    const nonKeywordVars: string[] = [];
    tokens.forEach(tok => {
      if (!mathKeywords.has(tok.toLowerCase())) {
        for (const char of tok) {
          if (!nonKeywordVars.includes(char)) {
            nonKeywordVars.push(char);
          }
        }
      }
    });
    if (nonKeywordVars.length === 1) varName = nonKeywordVars[0];
    else if (nonKeywordVars.includes('x')) varName = 'x';
    else if (nonKeywordVars.includes('t')) varName = 't';
    else if (nonKeywordVars.length > 0) varName = nonKeywordVars[0];
    funcName = 'y';
  }

  return { funcName, varName };
};

export const WordGraphModal: React.FC<WordGraphModalProps> = ({
  isOpen,
  onClose,
  onInsertGraph,
  editingGraphId = null,
  initialFormula = 'y = x^3 - 3x',
  initialXMin = '-3',
  initialXMax = '3',
  initialYMin = '-4',
  initialYMax = '4',
  initialUnitX = '1',
  initialUnitY = '1',
  initialShowAxis = true,
  initialShowOrigin = true,
  initialShowExtrema = true,
  userFontSize = '16px',
  isTeacher = true,
}) => {
  const [wordGraphFormula, setWordGraphFormula] = useState<string>(initialFormula);
  const [wordGraphXMin, setWordGraphXMin] = useState<string>(initialXMin);
  const [wordGraphXMax, setWordGraphXMax] = useState<string>(initialXMax);
  const [wordGraphUnitX, setWordGraphUnitX] = useState<string>(initialUnitX || '1');
  const [wordGraphXLabel, setWordGraphXLabel] = useState<string>('x');

  const [wordGraphYMin, setWordGraphYMin] = useState<string>(initialYMin);
  const [wordGraphYMax, setWordGraphYMax] = useState<string>(initialYMax);
  const [wordGraphUnitY, setWordGraphUnitY] = useState<string>(initialUnitY || '1');
  const [wordGraphYLabel, setWordGraphYLabel] = useState<string>('y');

  const [wordGraphRequirement, setWordGraphRequirement] = useState<string>('');

  const [wordGraphShowAxisLabels, setWordGraphShowAxisLabels] = useState<boolean>(initialShowAxis);
  const [wordGraphShowOriginLabel, setWordGraphShowOriginLabel] = useState<boolean>(initialShowOrigin);
  const [wordGraphShowExtremaLabels, setWordGraphShowExtremaLabels] = useState<boolean>(initialShowExtrema);

  useEffect(() => {
    if (isOpen) {
      setWordGraphFormula(initialFormula);
      setWordGraphXMin(initialXMin);
      setWordGraphXMax(initialXMax);
      setWordGraphUnitX(initialUnitX || '1');
      setWordGraphYMin(initialYMin);
      setWordGraphYMax(initialYMax);
      setWordGraphUnitY(initialUnitY || '1');
      const { funcName, varName } = extractAxesFromFormula(initialFormula);
      setWordGraphXLabel(varName);
      setWordGraphYLabel(funcName);
      setWordGraphShowAxisLabels(initialShowAxis);
      setWordGraphShowOriginLabel(initialShowOrigin);
      setWordGraphShowExtremaLabels(initialShowExtrema);
    }
  }, [isOpen, initialFormula, initialXMin, initialXMax, initialYMin, initialYMax, initialUnitX, initialUnitY, initialShowAxis, initialShowOrigin, initialShowExtrema]);

  if (!isOpen) return null;

  const onFormulaChange = (newVal: string) => {
    setWordGraphFormula(newVal);
    const { funcName, varName } = extractAxesFromFormula(newVal);
    setWordGraphXLabel(varName);
    setWordGraphYLabel(funcName);
  };

  const xMinNum = parseFloat(wordGraphXMin) || -3;
  const xMaxNum = parseFloat(wordGraphXMax) || 3;
  const yMinNum = parseFloat(wordGraphYMin) || -4;
  const yMaxNum = parseFloat(wordGraphYMax) || 4;
  const unitXNum = parseFloat(wordGraphUnitX) || 1;
  const unitYNum = parseFloat(wordGraphUnitY) || 1;
  const numFontSize = parseInt(userFontSize, 10) || 16;

  const handleConfirm = () => {
    const graphId = editingGraphId || `graph-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const graphHtml = generateWordGraphWrapperHtml(
      wordGraphFormula,
      xMinNum,
      xMaxNum,
      yMinNum,
      yMaxNum,
      wordGraphXLabel.trim() || 'x',
      wordGraphYLabel.trim() || 'y',
      wordGraphFormula,
      wordGraphXLabel.trim() || 'x',
      [],
      graphId,
      wordGraphRequirement,
      numFontSize,
      380,
      unitXNum,
      unitYNum,
      wordGraphShowAxisLabels,
      wordGraphShowOriginLabel,
      wordGraphShowExtremaLabels,
      isTeacher
    );

    onInsertGraph(graphHtml);
  };

  const previewSvg = generateWordGraphSvg(
    wordGraphFormula,
    xMinNum,
    xMaxNum,
    yMinNum,
    yMaxNum,
    wordGraphXLabel.trim() || 'x',
    wordGraphYLabel.trim() || 'y',
    wordGraphFormula,
    wordGraphXLabel.trim() || 'x',
    [],
    'graph-modal-preview',
    numFontSize,
    unitXNum,
    unitYNum,
    wordGraphShowAxisLabels,
    wordGraphShowOriginLabel,
    wordGraphShowExtremaLabels,
    wordGraphRequirement
  );

  return createPortal(
    <div className="fixed inset-0 z-[99999] bg-slate-900/60 backdrop-blur-xs overflow-y-auto p-3 sm:p-4 flex items-center justify-center">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[90vh] animate-scale-up">
        {/* Header Modal - Cố định ở đầu cửa sổ */}
        <div className="shrink-0 px-5 py-3 border-b border-slate-100 bg-white flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-sky-50 text-sky-600 rounded-lg border border-sky-100">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h4 className="font-bold text-sm text-slate-900">
              {editingGraphId ? 'Chỉnh Sửa Đồ Thị' : 'Chèn Đồ Thị Hàm Số'}
            </h4>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nội dung cửa sổ - 10 ô nhập liệu bố trí đúng 2 hàng gọn gàng, khoa học */}
        <div className="p-4 sm:p-5 space-y-3 overflow-y-auto flex-1 min-h-0 text-xs">
          {/* HÀNG 1: [Công thức] [xmin] [xmax] [đơn vị Ox] [tên Ox] */}
          <div className="grid grid-cols-12 gap-2 items-end">
            <div className="col-span-12 sm:col-span-4">
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Công thức:
              </label>
              <input
                autoFocus
                type="text"
                value={wordGraphFormula}
                onChange={e => onFormulaChange(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-sky-500 focus:outline-none bg-white text-slate-900 shadow-2xs"
                placeholder="y = x^3 - 3x"
              />
            </div>
            <div className="col-span-3 sm:col-span-2">
              <label className="text-[10px] font-semibold text-slate-600 block mb-1">xmin</label>
              <input
                type="text"
                value={wordGraphXMin}
                onChange={e => setWordGraphXMin(e.target.value)}
                placeholder="-3"
                className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold focus:outline-sky-600 bg-white text-center"
              />
            </div>
            <div className="col-span-3 sm:col-span-2">
              <label className="text-[10px] font-semibold text-slate-600 block mb-1">xmax</label>
              <input
                type="text"
                value={wordGraphXMax}
                onChange={e => setWordGraphXMax(e.target.value)}
                placeholder="3"
                className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold focus:outline-sky-600 bg-white text-center"
              />
            </div>
            <div className="col-span-3 sm:col-span-2">
              <label className="text-[10px] font-semibold text-slate-600 block mb-1">Đơn vị Ox</label>
              <input
                type="text"
                value={wordGraphUnitX}
                onChange={e => setWordGraphUnitX(e.target.value)}
                placeholder="1"
                className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold focus:outline-sky-600 bg-white text-center"
              />
            </div>
            <div className="col-span-3 sm:col-span-2">
              <label className="text-[10px] font-semibold text-slate-600 block mb-1">Tên Ox</label>
              <input
                type="text"
                value={wordGraphXLabel}
                onChange={e => setWordGraphXLabel(e.target.value)}
                placeholder="x"
                className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold focus:outline-sky-600 bg-white text-center italic font-serif"
              />
            </div>
          </div>

          {/* HÀNG 2: [+yêu cầu] [ymin] [ymax] [đơn vị Oy] [tên Oy] */}
          <div className="grid grid-cols-12 gap-2 items-end">
            <div className="col-span-12 sm:col-span-4">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-slate-700 block">
                  +yêu cầu:
                </label>
                {wordGraphRequirement && (
                  <button
                    type="button"
                    onClick={() => setWordGraphRequirement('')}
                    className="text-[10px] text-slate-400 hover:text-rose-500 cursor-pointer"
                  >
                    Xóa
                  </button>
                )}
              </div>
              <input
                type="text"
                value={wordGraphRequirement}
                onChange={e => setWordGraphRequirement(e.target.value)}
                placeholder="+yêu cầu: gióng cực trị, nét đứt đỏ..."
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white shadow-2xs"
              />
            </div>
            <div className="col-span-3 sm:col-span-2">
              <label className="text-[10px] font-semibold text-slate-600 block mb-1">ymin</label>
              <input
                type="text"
                value={wordGraphYMin}
                onChange={e => setWordGraphYMin(e.target.value)}
                placeholder="-4"
                className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold focus:outline-sky-600 bg-white text-center"
              />
            </div>
            <div className="col-span-3 sm:col-span-2">
              <label className="text-[10px] font-semibold text-slate-600 block mb-1">ymax</label>
              <input
                type="text"
                value={wordGraphYMax}
                onChange={e => setWordGraphYMax(e.target.value)}
                placeholder="4"
                className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold focus:outline-sky-600 bg-white text-center"
              />
            </div>
            <div className="col-span-3 sm:col-span-2">
              <label className="text-[10px] font-semibold text-slate-600 block mb-1">Đơn vị Oy</label>
              <input
                type="text"
                value={wordGraphUnitY}
                onChange={e => setWordGraphUnitY(e.target.value)}
                placeholder="1"
                className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold focus:outline-sky-600 bg-white text-center"
              />
            </div>
            <div className="col-span-3 sm:col-span-2">
              <label className="text-[10px] font-semibold text-slate-600 block mb-1">Tên Oy</label>
              <input
                type="text"
                value={wordGraphYLabel}
                onChange={e => setWordGraphYLabel(e.target.value)}
                placeholder="y"
                className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold focus:outline-sky-600 bg-white text-center italic font-serif"
              />
            </div>
          </div>

          {/* Quick chips gợi ý yêu cầu */}
          <div className="flex flex-wrap items-center gap-1 pt-0.5">
            <span className="text-[10px] font-bold text-indigo-700 mr-1">+yêu cầu:</span>
            {[
              'Gióng tọa độ điểm cực trị',
              'Vẽ đồ thị nét đứt màu đỏ',
              'Vẽ tiệm cận đứng & ngang',
              'Tiếp tuyến tại x=1',
            ].map((req, rIdx) => (
              <button
                key={rIdx}
                type="button"
                onClick={() => {
                  setWordGraphRequirement(prev => (prev ? `${prev}; ${req}` : req));
                }}
                className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 cursor-pointer font-medium transition-colors"
              >
                + {req}
              </button>
            ))}
          </div>

          {/* Khung xem trước trực tiếp */}
          <div className="pt-1">
            <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-center min-h-[160px] shadow-inner">
              <div
                className="w-full flex justify-center"
                dangerouslySetInnerHTML={{ __html: previewSvg }}
              />
            </div>
          </div>
        </div>

        {/* Footer Actions - Cố định ở đáy cửa sổ */}
        <div className="shrink-0 px-5 py-2.5 border-t border-slate-100 bg-slate-50/90 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-5 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>{editingGraphId ? 'Cập nhật đồ thị' : 'Chèn vào trang Word'}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
