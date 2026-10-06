/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Activity, Calculator, TrendingUp, Sparkles, Check, X } from 'lucide-react';
import { solveFunctionForBbt, generateWordBbtHtml, detectFuncAndVar } from './bbtSolver';

export interface WordBBTModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertBbt: (bbtHtml: string, rawTikzTab: string) => void;
  editingBbtId?: string | null;
  initialMode?: 'function' | 'manual';
  initialFormula?: string;
  initialXPoints?: string;
  initialYPrimeSigns?: string;
  initialYValues?: string;
  initialVarName?: string;
  initialFuncRow?: string;
  initialDerivRow?: string;
  preservedWidth?: number;
  preservedAlign?: 'left' | 'center' | 'right';
  isTeacher?: boolean;
}

export const WordBBTModal: React.FC<WordBBTModalProps> = ({
  isOpen,
  onClose,
  onInsertBbt,
  editingBbtId = null,
  initialMode = 'function',
  initialFormula = 'y = x^3 - 3x',
  initialXPoints = '-\\infty, -1, 1, +\\infty',
  initialYPrimeSigns = ', +, 0, -, 0, +, ',
  initialYValues = '-/ -\\infty, +/ 2, -/ -2, +/ +\\infty',
  initialVarName = 'x',
  initialFuncRow = 'y',
  initialDerivRow = "y'",
  preservedWidth,
  preservedAlign = 'center',
  isTeacher = true,
}) => {
  const [wordBbtMode, setWordBbtMode] = useState<'function' | 'manual'>(initialMode);
  const [wordBbtFormula, setWordBbtFormula] = useState<string>(initialFormula);
  const [wordBbtXPoints, setWordBbtXPoints] = useState<string>(initialXPoints);
  const [wordBbtYPrimeSigns, setWordBbtYPrimeSigns] = useState<string>(initialYPrimeSigns);
  const [wordBbtYValues, setWordBbtYValues] = useState<string>(initialYValues);
  const [wordBbtFormulaDesc, setWordBbtFormulaDesc] = useState<string>('');
  const [wordBbtVarName, setWordBbtVarName] = useState<string>(initialVarName);
  const [wordBbtFuncRow, setWordBbtFuncRow] = useState<string>(initialFuncRow);
  const [wordBbtDerivRow, setWordBbtDerivRow] = useState<string>(initialDerivRow);

  // Sync state on open / edit
  useEffect(() => {
    if (isOpen) {
      setWordBbtMode(initialMode);
      setWordBbtFormula(initialFormula);
      setWordBbtXPoints(initialXPoints);
      setWordBbtYPrimeSigns(initialYPrimeSigns);
      setWordBbtYValues(initialYValues);
      setWordBbtVarName(initialVarName);
      setWordBbtFuncRow(initialFuncRow);
      setWordBbtDerivRow(initialDerivRow);

      if (initialMode === 'function' && initialFormula) {
        const res = solveFunctionForBbt(initialFormula);
        if (res.success) {
          setWordBbtXPoints(res.xPoints);
          setWordBbtYPrimeSigns(res.yPrimeSigns);
          setWordBbtYValues(res.yValues);
          setWordBbtFormulaDesc(res.description);
          setWordBbtVarName(res.varName);
          setWordBbtFuncRow(res.funcRow);
          setWordBbtDerivRow(res.derivRow);
        }
      }
    }
  }, [isOpen, initialMode, initialFormula, initialXPoints, initialYPrimeSigns, initialYValues, initialVarName, initialFuncRow, initialDerivRow]);

  if (!isOpen) return null;

  const handleAutoSolve = () => {
    const res = solveFunctionForBbt(wordBbtFormula);
    if (res.success) {
      setWordBbtXPoints(res.xPoints);
      setWordBbtYPrimeSigns(res.yPrimeSigns);
      setWordBbtYValues(res.yValues);
      setWordBbtFormulaDesc(res.description);
      setWordBbtVarName(res.varName);
      setWordBbtFuncRow(res.funcRow);
      setWordBbtDerivRow(res.derivRow);
    } else {
      setWordBbtFormulaDesc(res.description);
    }
  };

  const handleConfirm = () => {
    const targetBbtId = editingBbtId || `bbt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const bbtHtml = generateWordBbtHtml(
      wordBbtXPoints,
      wordBbtYPrimeSigns,
      wordBbtYValues,
      targetBbtId,
      wordBbtFormula,
      wordBbtMode,
      preservedWidth,
      preservedAlign,
      wordBbtVarName,
      wordBbtFuncRow,
      wordBbtDerivRow,
      isTeacher
    );

    const rawTikzTab = `% Bảng biến thiên tikz-tab (${wordBbtMode === 'function' ? `Hàm số ${wordBbtFormula}` : 'Nhập trực tiếp'}):
\\begin{tikzpicture}
  \\tkzTabInit[lgt=1.5, espcl=2.5]{$${wordBbtVarName}$ /1, $${wordBbtDerivRow}$ /1, $${wordBbtFuncRow}$ /2}{${wordBbtXPoints}}
  \\tkzTabLine{${wordBbtYPrimeSigns}}
  \\tkzTabVar{${wordBbtYValues}}
\\end{tikzpicture}`;

    onInsertBbt(bbtHtml, rawTikzTab);
  };

  const handleExportTikZ = () => {
    const rawTikzTab = `% Bảng biến thiên tikz-tab (${wordBbtMode === 'function' ? `Hàm số ${wordBbtFormula}` : 'Nhập trực tiếp'}):
\\begin{tikzpicture}
  \\tkzTabInit[lgt=1.5, espcl=2.5]{$${wordBbtVarName}$ /1, $${wordBbtDerivRow}$ /1, $${wordBbtFuncRow}$ /2}{${wordBbtXPoints}}
  \\tkzTabLine{${wordBbtYPrimeSigns}}
  \\tkzTabVar{${wordBbtYValues}}
\\end{tikzpicture}`;

    window.dispatchEvent(new CustomEvent('app-insert-word-snippet', {
      detail: { code: rawTikzTab, type: 'bbt', title: wordBbtMode === 'function' ? `Bảng biến thiên ${wordBbtFormula}` : 'Bảng biến thiên tikz-tab' }
    }));

    if (navigator.clipboard) {
      navigator.clipboard.writeText(rawTikzTab);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] bg-slate-900/60 backdrop-blur-xs overflow-y-auto p-3 sm:p-4 flex items-center justify-center">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[90vh] animate-scale-up">
        {/* Header Modal - Cố định ở đầu cửa sổ */}
        <div className="shrink-0 px-6 py-3.5 border-b border-slate-100 bg-white flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-900">
                {editingBbtId ? 'Chỉnh Sửa Bảng Biến Thiên' : 'Chèn Bảng Biến Thiên (tikz-tab)'}
              </h4>
              <p className="text-[11px] text-slate-500">Tự động dựng bảng biến thiên chuẩn sách giáo khoa từ công thức hàm số</p>
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
        {/* Tab chuyển đổi chế độ: Nhập hàm / Nhập Tikz-tab */}
        <div className="flex items-center p-1 bg-slate-100 rounded-xl gap-1">
          <button
            type="button"
            onClick={() => {
              setWordBbtMode('function');
              const res = solveFunctionForBbt(wordBbtFormula);
              if (res.success) {
                setWordBbtXPoints(res.xPoints);
                setWordBbtYPrimeSigns(res.yPrimeSigns);
                setWordBbtYValues(res.yValues);
                setWordBbtFormulaDesc(res.description);
                setWordBbtVarName(res.varName);
                setWordBbtFuncRow(res.funcRow);
                setWordBbtDerivRow(res.derivRow);
              }
            }}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              wordBbtMode === 'function' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calculator className="w-3.5 h-3.5 text-emerald-600" />
            <span>Nhập hàm (Giải tự động SGK)</span>
          </button>
          <button
            type="button"
            onClick={() => setWordBbtMode('manual')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              wordBbtMode === 'manual' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            <span>Nhập Tikz-tab</span>
          </button>
        </div>

        {/* Chế độ 1: Nhập hàm số tự động */}
        {wordBbtMode === 'function' ? (
          <div className="space-y-3 p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-100">
            <div>
              <label className="text-xs font-bold text-emerald-950 block mb-1">
                Công thức hàm số:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={wordBbtFormula}
                  onChange={(e) => {
                    const val = e.target.value;
                    setWordBbtFormula(val);
                    const det = detectFuncAndVar(val);
                    setWordBbtVarName(det.varName);
                    setWordBbtFuncRow(det.funcRow);
                    setWordBbtDerivRow(det.derivRow);
                    const res = solveFunctionForBbt(val);
                    if (res.success) {
                      setWordBbtXPoints(res.xPoints);
                      setWordBbtYPrimeSigns(res.yPrimeSigns);
                      setWordBbtYValues(res.yValues);
                      setWordBbtFormulaDesc(res.description);
                      setWordBbtVarName(res.varName);
                      setWordBbtFuncRow(res.funcRow);
                      setWordBbtDerivRow(res.derivRow);
                    }
                  }}
                  className="flex-1 px-3 py-2 rounded-xl border border-emerald-200 text-xs font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white text-slate-900 shadow-2xs"
                  placeholder="Ví dụ: y = x^3 - 3x, f(x) = (2x+1)/(x-1), s(t) = t^2 - 4t..."
                />
                <button
                  type="button"
                  onClick={handleAutoSolve}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Giải tự động</span>
                </button>
              </div>
            </div>

            {/* Thông tin nhận diện hàm số */}
            {wordBbtFormulaDesc && (
              <div className="p-2.5 bg-white/90 rounded-lg border border-emerald-200 text-[11px] text-emerald-900 leading-relaxed">
                <div className="flex items-center justify-between mb-1">
                  <b>⚡ Kết quả giải & nhận diện:</b>
                  <span className="text-[10px] bg-emerald-100 px-1.5 py-0.5 rounded text-emerald-800 font-semibold">
                    Biến: <i>{wordBbtVarName}</i>, Hàm: <i>{wordBbtFuncRow}</i>
                  </span>
                </div>
                <span>{wordBbtFormulaDesc}</span>
              </div>
            )}
          </div>
        ) : (
          /* Chế độ 2: Nhập Tikz-tab tùy chỉnh */
          <div className="space-y-3">
            {/* Tùy chỉnh tên biến và tên hàng hàm */}
            <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Tên biến:
                </label>
                <input
                  type="text"
                  value={wordBbtVarName}
                  onChange={e => setWordBbtVarName(e.target.value.trim() || 'x')}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold focus:ring-1 focus:ring-emerald-500 bg-white"
                  placeholder="x, t, u..."
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Hàng đạo hàm:
                </label>
                <input
                  type="text"
                  value={wordBbtDerivRow}
                  onChange={e => setWordBbtDerivRow(e.target.value.trim() || "y'")}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold focus:ring-1 focus:ring-emerald-500 bg-white"
                  placeholder="y', f'(x)..."
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Hàng hàm số:
                </label>
                <input
                  type="text"
                  value={wordBbtFuncRow}
                  onChange={e => setWordBbtFuncRow(e.target.value.trim() || 'y')}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold focus:ring-1 focus:ring-emerald-500 bg-white"
                  placeholder="y, f(x), s(t)..."
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Các điểm mốc của biến ({wordBbtVarName}):
              </label>
              <input
                type="text"
                value={wordBbtXPoints}
                onChange={e => setWordBbtXPoints(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-slate-50 text-slate-900"
                placeholder="-\infty, -1, 1, +\infty"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Dấu của đạo hàm ({wordBbtDerivRow}):
              </label>
              <input
                type="text"
                value={wordBbtYPrimeSigns}
                onChange={e => setWordBbtYPrimeSigns(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-slate-50 text-slate-900 font-mono"
                placeholder=", +, 0, -, 0, +, "
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Giá trị và hướng mũi tên biến thiên ({wordBbtFuncRow}):
              </label>
              <input
                type="text"
                value={wordBbtYValues}
                onChange={e => setWordBbtYValues(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-slate-50 text-slate-900 font-mono"
                placeholder="-/ -\infty, +/ 2, -/ -2, +/ +\infty"
              />
            </div>
          </div>
        )}

        {/* Khung xem trước trực tiếp (Live Preview) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-slate-700">👁️ Bảng xem trước trực quan:</span>
            <span className="text-[10px] text-slate-400 font-medium">Khung độ rộng tự động co giãn vừa vặn</span>
          </div>
          <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200 flex items-center justify-center min-h-[140px] overflow-x-auto shadow-inner">
            <div
              className="w-full flex justify-center"
              dangerouslySetInnerHTML={{
                __html: generateWordBbtHtml(
                  wordBbtXPoints,
                  wordBbtYPrimeSigns,
                  wordBbtYValues,
                  'bbt-preview',
                  wordBbtFormula,
                  wordBbtMode,
                  undefined,
                  'center',
                  wordBbtVarName,
                  wordBbtFuncRow,
                  wordBbtDerivRow,
                  false
                )
              }}
            />
          </div>
        </div>
        </div>

        {/* Footer Actions - Cố định ở đáy cửa sổ */}
        <div className="shrink-0 px-6 py-3 border-t border-slate-100 bg-slate-50/90 flex items-center justify-between">
          <button
            type="button"
            onClick={handleExportTikZ}
            className="px-3 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 border border-indigo-200"
            title="Xuất mã LaTeX tikz-tab"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Xuất mã Tikz-tab</span>
          </button>
          <div className="flex items-center gap-2">
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
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{editingBbtId ? 'Cập nhật BBT' : 'Chèn vào trang Word'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
