/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import katex from 'katex';
import {
  TrendingUp,
  ChevronDown,
  Laptop,
  Calculator,
  PenTool,
  Activity,
  Sparkles,
} from 'lucide-react';
import { MenuHamSoProps } from './types';
import { WordBBTModal } from './WordBBTModal';
import { WordGraphModal } from './WordGraphModal';
import { WordDrawSketchModal } from './WordDrawSketchModal';
import { MathTypeEditorModal } from '../../TaiLieuCaNhan/MathTypeEditorModal';
import { solveFunctionForBbt } from './bbtSolver';

export const MenuHamSo: React.FC<MenuHamSoProps> = ({
  editorRef,
  saveCurrentSelection,
  insertHtmlToEditor,
  currentRole = 'teacher',
  userFontSize = '22px',
  setNotification,
  onCloseOtherMenus,
}) => {
  const isTeacher = !currentRole || ['teacher', 'manager', 'admin', 'superadmin'].includes(currentRole);

  // Trạng thái mở menu dropdown
  const [openFunctionMenu, setOpenFunctionMenu] = useState<boolean>(false);
  const [openGraphSubmenu, setOpenGraphSubmenu] = useState<boolean>(false);
  const [openBbtSubmenu, setOpenBbtSubmenu] = useState<boolean>(false);

  // Hidden file inputs
  const graphInputRef = useRef<HTMLInputElement>(null);
  const bbtInputRef = useRef<HTMLInputElement>(null);

  // Modal MathType Formula State
  const [showMathModal, setShowMathModal] = useState<boolean>(false);
  const [mathModalFormula, setMathModalFormula] = useState<string>('');
  const editingMathSpanRef = useRef<HTMLElement | null>(null);

  // Modal Graph States
  const [showGraphModal, setShowGraphModal] = useState<boolean>(false);
  const [editingGraphId, setEditingGraphId] = useState<string | null>(null);
  const [graphFormula, setGraphFormula] = useState<string>('y = x^3 - 3x');
  const [graphXMin, setGraphXMin] = useState<string>('-3');
  const [graphXMax, setGraphXMax] = useState<string>('3');
  const [graphYMin, setGraphYMin] = useState<string>('-4');
  const [graphYMax, setGraphYMax] = useState<string>('4');
  const [graphUnitX, setGraphUnitX] = useState<string>('1');
  const [graphUnitY, setGraphUnitY] = useState<string>('1');
  const [graphShowAxis, setGraphShowAxis] = useState<boolean>(true);
  const [graphShowOrigin, setGraphShowOrigin] = useState<boolean>(true);
  const [graphShowExtrema, setGraphShowExtrema] = useState<boolean>(true);

  // Modal BBT States
  const [showBBTModal, setShowBBTModal] = useState<boolean>(false);
  const [editingBbtId, setEditingBbtId] = useState<string | null>(null);
  const [bbtMode, setBbtMode] = useState<'function' | 'manual'>('function');
  const [bbtFormula, setBbtFormula] = useState<string>('y = x^3 - 3x');
  const [bbtXPoints, setBbtXPoints] = useState<string>('-\\infty, -1, 1, +\\infty');
  const [bbtYPrimeSigns, setBbtYPrimeSigns] = useState<string>(', +, 0, -, 0, +, ');
  const [bbtYValues, setBbtYValues] = useState<string>('-/ -\\infty, +/ 2, -/ -2, +/ +\\infty');
  const [bbtVarName, setBbtVarName] = useState<string>('x');
  const [bbtFuncRow, setBbtFuncRow] = useState<string>('y');
  const [bbtDerivRow, setBbtDerivRow] = useState<string>("y'");
  const [preservedBbtWidth, setPreservedBbtWidth] = useState<number | undefined>(undefined);
  const [preservedBbtAlign, setPreservedBbtAlign] = useState<'left' | 'center' | 'right'>('center');

  // Modal Sketch States
  const [showSketchModal, setShowSketchModal] = useState<boolean>(false);
  const [sketchType, setSketchType] = useState<'graph' | 'bbt'>('graph');

  // Đóng menu khi click bên ngoài
  const menuContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (evt: MouseEvent) => {
      if (menuContainerRef.current && !menuContainerRef.current.contains(evt.target as Node)) {
        setOpenFunctionMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Lắng nghe sự kiện click nút "✏️ Sửa BBT" hoặc "✏️ Sửa đồ thị" trong editorRef
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const handleEditorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // 1. Sửa BBT
      if (target.classList?.contains('edit-bbt-btn') || target.closest?.('.edit-bbt-btn')) {
        e.preventDefault();
        e.stopPropagation();
        const wrapper = target.closest('.word-bbt-wrapper');
        if (wrapper) {
          const id = wrapper.getAttribute('data-bbt-id') || '';
          const formula = decodeURIComponent(wrapper.getAttribute('data-formula') || '');
          const xpoints = decodeURIComponent(wrapper.getAttribute('data-xpoints') || '-\\infty, -1, 1, +\\infty');
          const yprimesigns = decodeURIComponent(wrapper.getAttribute('data-yprimesigns') || ', +, 0, -, 0, +, ');
          const yvalues = decodeURIComponent(wrapper.getAttribute('data-yvalues') || '-/ -\\infty, +/ 2, -/ -2, +/ +\\infty');
          const mode = (wrapper.getAttribute('data-mode') || (formula ? 'function' : 'manual')) as 'function' | 'manual';
          const varname = decodeURIComponent(wrapper.getAttribute('data-varname') || 'x');
          const funcrow = decodeURIComponent(wrapper.getAttribute('data-funcrow') || 'y');
          const derivrow = decodeURIComponent(wrapper.getAttribute('data-derivrow') || "y'");
          const width = parseFloat(wrapper.getAttribute('data-width') || '') || undefined;
          const align = (wrapper.getAttribute('data-align') || 'center') as 'left' | 'center' | 'right';

          setEditingBbtId(id);
          setBbtMode(mode);
          setBbtFormula(formula || 'y = x^3 - 3x');
          setBbtXPoints(xpoints);
          setBbtYPrimeSigns(yprimesigns);
          setBbtYValues(yvalues);
          setBbtVarName(varname);
          setBbtFuncRow(funcrow);
          setBbtDerivRow(derivrow);
          setPreservedBbtWidth(width);
          setPreservedBbtAlign(align);

          if (formula) {
            const res = solveFunctionForBbt(formula);
            if (res.success) {
              setBbtVarName(res.varName);
              setBbtFuncRow(res.funcRow);
              setBbtDerivRow(res.derivRow);
            }
          }
          setShowBBTModal(true);
        }
      }

      // 2. Sửa đồ thị
      if (target.classList?.contains('edit-graph-btn') || target.closest?.('.edit-graph-btn')) {
        e.preventDefault();
        e.stopPropagation();
        const wrapper = target.closest('.word-graph-wrapper');
        if (wrapper) {
          const id = wrapper.getAttribute('data-graph-id') || '';
          const formula = decodeURIComponent(wrapper.getAttribute('data-formula') || 'y = x^3 - 3x');
          const xmin = wrapper.getAttribute('data-xmin') || '-3';
          const xmax = wrapper.getAttribute('data-xmax') || '3';
          const ymin = wrapper.getAttribute('data-ymin') || '-4';
          const ymax = wrapper.getAttribute('data-ymax') || '4';
          const unitx = wrapper.getAttribute('data-unitx') || '1';
          const unity = wrapper.getAttribute('data-unity') || '1';
          const showAxis = wrapper.getAttribute('data-show-axis') !== '0';
          const showOrigin = wrapper.getAttribute('data-show-origin') !== '0';
          const showExtrema = wrapper.getAttribute('data-show-extrema') !== '0';

          setEditingGraphId(id);
          setGraphFormula(formula);
          setGraphXMin(xmin);
          setGraphXMax(xmax);
          setGraphYMin(ymin);
          setGraphYMax(ymax);
          setGraphUnitX(unitx);
          setGraphUnitY(unity);
          setGraphShowAxis(showAxis);
          setGraphShowOrigin(showOrigin);
          setGraphShowExtrema(showExtrema);
          setShowGraphModal(true);
        }
      }

      // 3. Sửa công thức Toán khi bấm trực tiếp vào công thức đã render
      const mathSpan = target.closest?.('.math-rendered, .math-latex-token') as HTMLElement | null;
      if (mathSpan) {
        e.preventDefault();
        e.stopPropagation();
        const raw = mathSpan.getAttribute('data-latex') || mathSpan.textContent || '';
        const cleaned = raw.replace(/^\$\s*|\s*\$$/g, '').replace(/^\\\(\s*|\s*\\\)$/g, '').trim();
        setMathModalFormula(cleaned);
        editingMathSpanRef.current = mathSpan;
        setShowMathModal(true);
      }
    };

    editor.addEventListener('click', handleEditorClick);
    return () => editor.removeEventListener('click', handleEditorClick);
  }, [editorRef]);

  // 1. Chèn công thức Toán MathType / LaTeX (Bắt buộc dùng $ mã latex $ và chèn bản đã render)
  const handleInsertMath = () => {
    saveCurrentSelection();
    editingMathSpanRef.current = null;
    setMathModalFormula('');
    setShowMathModal(true);
    setOpenFunctionMenu(false);
  };

  const handleConfirmMath = (latexCode: string, renderedHtml: string) => {
    const trimmed = (latexCode || '').trim();
    if (!trimmed) {
      setShowMathModal(false);
      editingMathSpanRef.current = null;
      return;
    }
    // Chèn công thức đã được render KaTeX trực quan thay vì mã thô, lưu trữ data-latex="$ ... $"
    const finalHtml = renderedHtml || (() => {
      let renderedKaTeX = '';
      try {
        renderedKaTeX = katex.renderToString(trimmed, { displayMode: false, throwOnError: false });
      } catch {
        renderedKaTeX = trimmed;
      }
      return `<span class="math-rendered inline-block align-middle my-0.5 px-1.5 py-0.5 rounded bg-transparent hover:bg-indigo-50/70 border border-transparent hover:border-indigo-200 transition-all select-all cursor-pointer" data-latex="$ ${trimmed} $" contenteditable="false" title="Công thức toán: $ ${trimmed} $ (Kích để sửa)">${renderedKaTeX}</span>&nbsp;`;
    })();

    if (editingMathSpanRef.current && editingMathSpanRef.current.parentNode) {
      const temp = document.createElement('div');
      temp.innerHTML = finalHtml.trim();
      const newEl = temp.firstElementChild;
      if (newEl) {
        editingMathSpanRef.current.replaceWith(newEl);
      } else {
        editingMathSpanRef.current.outerHTML = finalHtml;
      }
      editingMathSpanRef.current = null;
    } else {
      insertHtmlToEditor(finalHtml);
    }

    setShowMathModal(false);
    if (setNotification) {
      setNotification({ text: `Đã chèn công thức: $ ${trimmed} $`, type: 'success' });
      setTimeout(() => setNotification(null), 3000);
    }
  };

  // 2. Chèn đồ thị từ máy tính
  const onGraphImageSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const tikzCode = `% Đồ thị TikZ (Vẽ lại từ tệp: ${file.name}):
\\begin{tikzpicture}[scale=0.8, >=stealth]
  \\draw[->,thick] (-3,0) -- (3,0) node[right] {$x$};
  \\draw[->,thick] (0,-2) -- (0,4) node[above] {$y$};
  \\draw[domain=-2:2,smooth,variable=\\x,red,ultra thick] plot ({\\x},{\\x*\\x - 1});
  \\node at (0,0) [below left] {$O$};
  \\filldraw[blue] (0,-1) circle (2pt) node[right] {$(0,-1)$};
\\end{tikzpicture}`;

    window.dispatchEvent(new CustomEvent('app-insert-word-snippet', {
      detail: { code: tikzCode, type: 'graph', title: `Đồ thị TikZ từ ảnh (${file.name})` }
    }));

    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      const src = loadEvt.target?.result as string;
      const cleanGraphHtml = `
        <div class="word-graph-wrapper relative my-3 flex justify-center items-center" contenteditable="false" style="text-align: center; margin: 16px 0; background: transparent; border: none; position: relative;">
          <img src="${src}" alt="Đồ thị ${file.name}" style="max-width: 380px; width: 100%; height: auto; background: transparent; display: inline-block; vertical-align: middle; cursor: pointer; border: none;" />
          <button type="button" onclick="this.closest('.word-graph-wrapper').remove()" title="Xóa đồ thị này" class="delete-graph-btn" style="position: absolute; top: 2px; right: calc(50% - 190px); background: #ef4444; color: white; border: none; border-radius: 9999px; width: 22px; height: 22px; font-size: 12px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 3px rgba(0,0,0,0.2); opacity: 0.85; transition: opacity 0.2s;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.85'">✕</button>
        </div>
        <p><br></p>
      `;
      insertHtmlToEditor(cleanGraphHtml);
      if (setNotification) {
        setNotification({ text: `Đã chèn đồ thị từ hình ảnh "${file.name}"!`, type: 'success' });
        setTimeout(() => setNotification(null), 3000);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // 3. Chèn bảng biến thiên từ máy tính
  const onBBTImageSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const tikzTabCode = `% Bảng biến thiên tikz-tab (Vẽ lại từ tệp: ${file.name}):
\\begin{tikzpicture}
  \\tkzTabInit[lgt=1.5, espcl=2.5]{$x$ /1, $y'$ /1, $y$ /2}{$-\\infty$, $x_1$, $x_2$, $+\\infty$}
  \\tkzTabLine{, +, 0, -, 0, +, }
  \\tkzTabVar{-/ $-\\infty$, +/ $y_1$, -/ $y_2$, +/ $+\\infty$}
\\end{tikzpicture}`;

    window.dispatchEvent(new CustomEvent('app-insert-word-snippet', {
      detail: { code: tikzTabCode, type: 'bbt', title: `Bảng biến thiên tikz-tab từ ảnh (${file.name})` }
    }));

    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      const src = loadEvt.target?.result as string;
      const cleanBbtHtml = `
        <div class="word-bbt-wrapper relative my-3 flex justify-center items-center" contenteditable="false" style="text-align: center; margin: 16px 0; background: transparent; border: none; position: relative;">
          <img src="${src}" alt="Bảng biến thiên ${file.name}" style="max-width: 480px; width: 100%; height: auto; background: transparent; display: inline-block; vertical-align: middle; cursor: pointer; border: none;" />
          <button type="button" onclick="this.closest('.word-bbt-wrapper').remove()" title="Xóa bảng biến thiên này" class="delete-graph-btn" style="position: absolute; top: 2px; right: calc(50% - 240px); background: #ef4444; color: white; border: none; border-radius: 9999px; width: 22px; height: 22px; font-size: 12px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 3px rgba(0,0,0,0.2); opacity: 0.85;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.85'">✕</button>
        </div>
        <p><br></p>
      `;
      insertHtmlToEditor(cleanBbtHtml);
      if (setNotification) {
        setNotification({ text: `Đã chèn bảng biến thiên từ ảnh "${file.name}"!`, type: 'success' });
        setTimeout(() => setNotification(null), 3000);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Xác nhận chèn/cập nhật đồ thị
  const handleInsertGraphConfirm = (graphHtml: string) => {
    if (editingGraphId && editorRef.current) {
      const existingWrapper = editorRef.current.querySelector(`[data-graph-id="${editingGraphId}"]`) as HTMLElement;
      if (existingWrapper) {
        const temp = document.createElement('div');
        temp.innerHTML = graphHtml.trim();
        const newWrapper = temp.querySelector('.word-graph-wrapper');
        if (newWrapper) {
          existingWrapper.replaceWith(newWrapper);
        } else {
          existingWrapper.outerHTML = graphHtml;
        }
        if (setNotification) {
          setNotification({ text: `Đã cập nhật lại đồ thị thành công!`, type: 'success' });
          setTimeout(() => setNotification(null), 3000);
        }
        setEditingGraphId(null);
        setShowGraphModal(false);
        saveCurrentSelection();
        return;
      }
    }

    insertHtmlToEditor(graphHtml);
    if (setNotification) {
      setNotification({ text: `Đã chèn đồ thị trực quan vào tài liệu!`, type: 'success' });
      setTimeout(() => setNotification(null), 3000);
    }
    setEditingGraphId(null);
    setShowGraphModal(false);
  };

  // Xác nhận chèn/cập nhật BBT
  const handleInsertBbtConfirm = (bbtHtml: string, rawTikzTab: string) => {
    window.dispatchEvent(new CustomEvent('app-insert-word-snippet', {
      detail: { code: rawTikzTab, type: 'bbt', title: `Bảng biến thiên` }
    }));

    if (editingBbtId && editorRef.current) {
      const existingWrapper = editorRef.current.querySelector(`[data-bbt-id="${editingBbtId}"]`) as HTMLElement;
      if (existingWrapper) {
        const temp = document.createElement('div');
        temp.innerHTML = bbtHtml.trim();
        const newWrapper = temp.querySelector('.word-bbt-wrapper');
        if (newWrapper) {
          existingWrapper.replaceWith(newWrapper);
        } else {
          existingWrapper.outerHTML = bbtHtml;
        }
        if (setNotification) {
          setNotification({ text: 'Đã cập nhật lại bảng biến thiên thành công!', type: 'success' });
          setTimeout(() => setNotification(null), 3000);
        }
        setEditingBbtId(null);
        setShowBBTModal(false);
        saveCurrentSelection();
        return;
      }
    }

    insertHtmlToEditor(bbtHtml);
    if (setNotification) {
      setNotification({ text: 'Đã chèn bảng biến thiên trực quan vào tài liệu!', type: 'success' });
      setTimeout(() => setNotification(null), 3000);
    }
    setEditingBbtId(null);
    setShowBBTModal(false);
  };

  return (
    <div className="relative" ref={menuContainerRef}>
      {/* Ẩn file input để chèn đồ thị TikZ / BBT tikz-tab */}
      <input type="file" ref={graphInputRef} onChange={onGraphImageSelected} accept="image/*" className="hidden" />
      <input type="file" ref={bbtInputRef} onChange={onBBTImageSelected} accept="image/*" className="hidden" />

      {/* Nút bấm Menu Hàm số trên Toolbar Word */}
      <button
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          saveCurrentSelection();
        }}
        onClick={() => {
          setOpenFunctionMenu(!openFunctionMenu);
          onCloseOtherMenus?.();
        }}
        className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition-colors cursor-pointer ${
          openFunctionMenu ? 'bg-purple-700 text-white border-purple-700' : 'bg-purple-50 text-purple-800 hover:bg-purple-100 border-purple-200'
        }`}
        title="Menu Hàm số: Chèn công thức, đồ thị và bảng biến thiên"
      >
        <TrendingUp className="w-3.5 h-3.5 text-purple-600" />
        <span>Hàm số</span>
        <ChevronDown className="w-3 h-3 text-purple-500" />
      </button>

      {/* Menu xổ xuống của Hàm số */}
      {openFunctionMenu && (
        <div className="absolute z-50 left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl w-64 py-1 divide-y divide-slate-100 animate-fade-in">
          {/* 1. Chèn công thức */}
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              saveCurrentSelection();
            }}
            onClick={() => {
              handleInsertMath();
              setOpenFunctionMenu(false);
            }}
            className="w-full px-3 py-2 text-xs flex items-center gap-2.5 hover:bg-purple-50 text-purple-900 text-left font-semibold cursor-pointer"
          >
            <span className="font-serif text-sm font-black text-purple-700 shrink-0">∑√</span>
            <div>
              <div className="font-bold">Chèn công thức</div>
              <div className="text-[10px] text-slate-400 font-normal">Soạn công thức toán học MathType / LaTeX</div>
            </div>
          </button>

          {/* 2. Chèn đồ thị */}
          <div className="py-1">
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                saveCurrentSelection();
              }}
              onClick={() => setOpenGraphSubmenu(!openGraphSubmenu)}
              className="w-full px-3 py-2 text-xs flex items-center justify-between hover:bg-sky-50 text-sky-900 text-left font-semibold cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-sky-600 shrink-0" />
                <div>
                  <div className="font-bold">Chèn đồ thị</div>
                  <div className="text-[10px] text-slate-400 font-normal">Từ máy tính, Nhập hàm, Tự vẽ</div>
                </div>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-sky-500 transition-transform ${openGraphSubmenu ? 'rotate-180' : ''}`} />
            </button>

            {openGraphSubmenu && (
              <div className="ml-5 pl-2.5 border-l-2 border-sky-200 py-1 space-y-1 bg-sky-50/40 rounded-r-lg mr-1.5 my-1">
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    saveCurrentSelection();
                  }}
                  onClick={() => {
                    saveCurrentSelection();
                    graphInputRef.current?.click();
                    setOpenFunctionMenu(false);
                  }}
                  className="w-full px-2.5 py-1.5 flex items-center gap-2 hover:bg-sky-100/70 text-slate-800 text-left rounded-md cursor-pointer"
                >
                  <Laptop className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                  <div>
                    <div className="font-bold text-[11px] text-sky-950">1. Từ máy tính</div>
                    <div className="text-[9px] text-slate-500 font-normal">Chọn hình ảnh đồ thị hệ thống dùng TikZ vẽ lại</div>
                  </div>
                </button>

                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    saveCurrentSelection();
                  }}
                  onClick={() => {
                    saveCurrentSelection();
                    setEditingGraphId(null);
                    setShowGraphModal(true);
                    setOpenFunctionMenu(false);
                  }}
                  className="w-full px-2.5 py-1.5 flex items-center gap-2 hover:bg-sky-100/70 text-slate-800 text-left rounded-md cursor-pointer"
                >
                  <Calculator className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                  <div>
                    <div className="font-bold text-[11px] text-sky-950">2. Nhập hàm</div>
                    <div className="text-[9px] text-slate-500 font-normal">Nhập công thức hàm số hệ thống dùng TikZ vẽ lại</div>
                  </div>
                </button>

                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    saveCurrentSelection();
                  }}
                  onClick={() => {
                    saveCurrentSelection();
                    setSketchType('graph');
                    setShowSketchModal(true);
                    setOpenFunctionMenu(false);
                  }}
                  className="w-full px-2.5 py-1.5 flex items-center gap-2 hover:bg-sky-100/70 text-slate-800 text-left rounded-md cursor-pointer"
                >
                  <PenTool className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                  <div>
                    <div className="font-bold text-[11px] text-sky-950">3. Tự vẽ</div>
                    <div className="text-[9px] text-slate-500 font-normal">Vẽ tay phác thảo, hệ thống nắn chỉnh chuẩn TikZ</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* 3. Chèn bảng biến thiên */}
          <div className="py-1">
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                saveCurrentSelection();
              }}
              onClick={() => setOpenBbtSubmenu(!openBbtSubmenu)}
              className="w-full px-3 py-2 text-xs flex items-center justify-between hover:bg-emerald-50 text-emerald-900 text-left font-semibold cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <div className="font-bold">Chèn bảng biến thiên</div>
                  <div className="text-[10px] text-slate-400 font-normal">Nhập BBT, Vẽ BBT, Tải lên BBT</div>
                </div>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-emerald-500 transition-transform ${openBbtSubmenu ? 'rotate-180' : ''}`} />
            </button>

            {openBbtSubmenu && (
              <div className="ml-5 pl-2.5 border-l-2 border-emerald-200 py-1 space-y-1 bg-emerald-50/40 rounded-r-lg mr-1.5 my-1">
                {/* 3.1 Nhập BBT (Hàm số & TikZ-Tab chung 1 cửa sổ) */}
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    saveCurrentSelection();
                  }}
                  onClick={() => {
                    saveCurrentSelection();
                    setBbtMode('manual');
                    setEditingBbtId(null);
                    setShowBBTModal(true);
                    setOpenFunctionMenu(false);
                  }}
                  className="w-full px-2.5 py-1.5 flex items-center gap-2 hover:bg-emerald-100/70 text-slate-800 text-left rounded-md cursor-pointer"
                >
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <div>
                    <div className="font-bold text-[11px] text-emerald-950">1. Nhập BBT</div>
                    <div className="text-[9px] text-slate-500 font-normal">Nhập mốc TikZ-Tab hoặc nhập hàm số giải tự động</div>
                  </div>
                </button>

                {/* 3.2 Vẽ BBT */}
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    saveCurrentSelection();
                  }}
                  onClick={() => {
                    saveCurrentSelection();
                    setSketchType('bbt');
                    setShowSketchModal(true);
                    setOpenFunctionMenu(false);
                  }}
                  className="w-full px-2.5 py-1.5 flex items-center gap-2 hover:bg-emerald-100/70 text-slate-800 text-left rounded-md cursor-pointer"
                >
                  <PenTool className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <div>
                    <div className="font-bold text-[11px] text-emerald-950">2. Vẽ BBT</div>
                    <div className="text-[9px] text-slate-500 font-normal">Vẽ phác thảo tay, nắn chuẩn nét vẽ máy vector & Undo/Redo</div>
                  </div>
                </button>

                {/* 3.3 Tải lên BBT */}
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    saveCurrentSelection();
                  }}
                  onClick={() => {
                    saveCurrentSelection();
                    bbtInputRef.current?.click();
                    setOpenFunctionMenu(false);
                  }}
                  className="w-full px-2.5 py-1.5 flex items-center gap-2 hover:bg-emerald-100/70 text-slate-800 text-left rounded-md cursor-pointer"
                >
                  <Laptop className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <div>
                    <div className="font-bold text-[11px] text-emerald-950">3. Tải lên BBT</div>
                    <div className="text-[9px] text-slate-500 font-normal">Chọn ảnh bảng biến thiên từ máy tính để dựng lại</div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Bảng biến thiên */}
      <WordBBTModal
        isOpen={showBBTModal}
        onClose={() => setShowBBTModal(false)}
        onInsertBbt={handleInsertBbtConfirm}
        editingBbtId={editingBbtId}
        initialMode={bbtMode}
        initialFormula={bbtFormula}
        initialXPoints={bbtXPoints}
        initialYPrimeSigns={bbtYPrimeSigns}
        initialYValues={bbtYValues}
        initialVarName={bbtVarName}
        initialFuncRow={bbtFuncRow}
        initialDerivRow={bbtDerivRow}
        preservedWidth={preservedBbtWidth}
        preservedAlign={preservedBbtAlign}
        isTeacher={isTeacher}
      />

      {/* Modal Đồ thị TikZ */}
      <WordGraphModal
        isOpen={showGraphModal}
        onClose={() => setShowGraphModal(false)}
        onInsertGraph={handleInsertGraphConfirm}
        editingGraphId={editingGraphId}
        initialFormula={graphFormula}
        initialXMin={graphXMin}
        initialXMax={graphXMax}
        initialYMin={graphYMin}
        initialYMax={graphYMax}
        initialUnitX={graphUnitX}
        initialUnitY={graphUnitY}
        initialShowAxis={graphShowAxis}
        initialShowOrigin={graphShowOrigin}
        initialShowExtrema={graphShowExtrema}
        userFontSize={userFontSize}
        isTeacher={isTeacher}
      />

      {/* Modal Tự vẽ đồ thị / BBT */}
      <WordDrawSketchModal
        isOpen={showSketchModal}
        onClose={() => setShowSketchModal(false)}
        sketchType={sketchType}
        onInsertSketchHtml={(html) => {
          insertHtmlToEditor(html);
          setShowSketchModal(false);
          if (setNotification) {
            setNotification({ text: 'Đã chèn nội dung phác thảo nắn chuẩn vào tài liệu!', type: 'success' });
            setTimeout(() => setNotification(null), 3000);
          }
        }}
        userFontSize={userFontSize}
        isTeacher={isTeacher}
      />

      {/* Modal Khung Soạn Thảo Công Thức Toán */}
      <MathTypeEditorModal
        isOpen={showMathModal}
        initialValue={mathModalFormula}
        onClose={() => {
          setShowMathModal(false);
          setMathModalFormula('');
          editingMathSpanRef.current = null;
        }}
        onInsert={handleConfirmMath}
      />
    </div>
  );
};
