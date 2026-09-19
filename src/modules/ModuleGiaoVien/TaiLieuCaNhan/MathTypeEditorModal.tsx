import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  RotateCcw,
  Sparkles,
  BookOpen,
  HelpCircle,
  Copy,
  Plus
} from 'lucide-react';
import katex from 'katex';

interface MathTypeEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (latexCode: string, renderedHtml: string) => void;
  initialValue?: string;
}

// Danh mục ký hiệu toán học kiểu MathType
interface MathSymbolGroup {
  name: string;
  items: Array<{ label: string; latex: string; preview: string; tooltip?: string }>;
}

export const MathTypeEditorModal: React.FC<MathTypeEditorModalProps> = ({
  isOpen,
  onClose,
  onInsert,
  initialValue = '',
}) => {
  const [latexCode, setLatexCode] = useState<string>(initialValue || '');
  const [activeTab, setActiveTab] = useState<string>('fractions');

  // Luôn nạp đúng công thức cần chỉnh sửa vào ô soạn thảo khi mở modal
  useEffect(() => {
    if (isOpen) {
      if (initialValue !== undefined && initialValue !== null && initialValue.trim() !== '') {
        setLatexCode(initialValue.trim());
      } else {
        setLatexCode('');
      }
    }
  }, [isOpen, initialValue]);

  if (!isOpen) return null;

  const symbolGroups: Record<string, MathSymbolGroup> = {
    fractions: {
      name: 'Phân số & Căn',
      items: [
        { label: 'a/b', latex: '\\frac{a}{b}', preview: 'a/b', tooltip: 'Phân số đơn' },
        { label: '√(x)', latex: '\\sqrt{x}', preview: '√x', tooltip: 'Căn bậc hai' },
        { label: 'ⁿ√(x)', latex: '\\sqrt[n]{x}', preview: 'ⁿ√x', tooltip: 'Căn bậc n' },
        { label: 'df/dx', latex: '\\frac{df}{dx}', preview: 'df/dx', tooltip: 'Đạo hàm phân số' },
        { label: '∂y/∂x', latex: '\\frac{\\partial y}{\\partial x}', preview: '∂y/∂x', tooltip: 'Đạo hàm riêng' },
        { label: '(a+b)/c', latex: '\\frac{a + b}{c}', preview: '(a+b)/c', tooltip: 'Phân số đa thức' },
      ],
    },
    scripts: {
      name: 'Mũ & Chỉ số',
      items: [
        { label: 'xⁿ', latex: 'x^{n}', preview: 'xⁿ', tooltip: 'Lũy thừa / Số mũ trên' },
        { label: 'xᵢ', latex: 'x_{i}', preview: 'xᵢ', tooltip: 'Chỉ số dưới' },
        { label: 'xᵢⁿ', latex: 'x_{i}^{n}', preview: 'xᵢⁿ', tooltip: 'Vừa mũ vừa chỉ số' },
        { label: 'eˣ', latex: 'e^{x}', preview: 'eˣ', tooltip: 'Hàm mũ tự nhiên' },
        { label: 'x²', latex: 'x^{2}', preview: 'x²', tooltip: 'Bình phương' },
        { label: 'x³', latex: 'x^{3}', preview: 'x³', tooltip: 'Lập phương' },
      ],
    },
    calculus: {
      name: 'Tích phân & Tổng',
      items: [
        { label: '∫', latex: '\\int f(x) dx', preview: '∫f(x)dx', tooltip: 'Tích phân bất định' },
        { label: '∫ₐᵇ', latex: '\\int_{a}^{b} f(x) dx', preview: '∫ₐᵇf(x)dx', tooltip: 'Tích phân xác định' },
        { label: '∬', latex: '\\iint_{D} f(x,y) dA', preview: '∬f dA', tooltip: 'Tích phân kép' },
        { label: '∑', latex: '\\sum_{i=1}^{n} a_i', preview: '∑ aᵢ', tooltip: 'Tổng Sigma' },
        { label: '∏', latex: '\\prod_{i=1}^{n} x_i', preview: '∏ xᵢ', tooltip: 'Tích Pi' },
        { label: 'lim', latex: '\\lim_{x \\to 0} \\frac{\\sin x}{x}', preview: 'lim(x→0)', tooltip: 'Giới hạn' },
      ],
    },
    greek: {
      name: 'Ký tự Hy Lạp',
      items: [
        { label: 'α', latex: '\\alpha', preview: 'α', tooltip: 'Alpha' },
        { label: 'β', latex: '\\beta', preview: 'β', tooltip: 'Beta' },
        { label: 'γ', latex: '\\gamma', preview: 'γ', tooltip: 'Gamma' },
        { label: 'δ', latex: '\\delta', preview: 'δ', tooltip: 'Delta nhỏ' },
        { label: 'Δ', latex: '\\Delta', preview: 'Δ', tooltip: 'Delta hoa' },
        { label: 'θ', latex: '\\theta', preview: 'θ', tooltip: 'Theta' },
        { label: 'λ', latex: '\\lambda', preview: 'λ', tooltip: 'Lambda' },
        { label: 'π', latex: '\\pi', preview: 'π', tooltip: 'Số Pi' },
        { label: 'σ', latex: '\\sigma', preview: 'σ', tooltip: 'Sigma' },
        { label: 'ω', latex: '\\omega', preview: 'ω', tooltip: 'Omega nhỏ' },
        { label: 'Ω', latex: '\\Omega', preview: 'Ω', tooltip: 'Omega hoa' },
        { label: 'φ', latex: '\\phi', preview: 'φ', tooltip: 'Phi' },
      ],
    },
    operators: {
      name: 'Phép toán & Quan hệ',
      items: [
        { label: '±', latex: '\\pm', preview: '±', tooltip: 'Cộng trừ' },
        { label: '×', latex: '\\times', preview: '×', tooltip: 'Nhân' },
        { label: '÷', latex: '\\div', preview: '÷', tooltip: 'Chia' },
        { label: '≤', latex: '\\le', preview: '≤', tooltip: 'Nhỏ hơn hoặc bằng' },
        { label: '≥', latex: '\\ge', preview: '≥', tooltip: 'Lớn hơn hoặc bằng' },
        { label: '≠', latex: '\\neq', preview: '≠', tooltip: 'Khác nhau' },
        { label: '≈', latex: '\\approx', preview: '≈', tooltip: 'Xấp xỉ' },
        { label: '∈', latex: '\\in', preview: '∈', tooltip: 'Thuộc tập hợp' },
        { label: '∉', latex: '\\notin', preview: '∉', tooltip: 'Không thuộc' },
        { label: '⊂', latex: '\\subset', preview: '⊂', tooltip: 'Tập con' },
        { label: '∪', latex: '\\cup', preview: '∪', tooltip: 'Hợp' },
        { label: '∩', latex: '\\cap', preview: '∩', tooltip: 'Giao' },
        { label: '∅', latex: '\\emptyset', preview: '∅', tooltip: 'Tập rỗng' },
        { label: '∞', latex: '\\infty', preview: '∞', tooltip: 'Vô cực' },
        { label: '→', latex: '\\to', preview: '→', tooltip: 'Mũi tên suy ra' },
        { label: '⇔', latex: '\\Leftrightarrow', preview: '⇔', tooltip: 'Tương đương' },
      ],
    },
    templates: {
      name: 'Công thức mẫu phổ biến',
      items: [
        {
          label: 'PT Bậc hai',
          latex: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}',
          preview: 'x = (-b ± √(b²-4ac)) / 2a',
          tooltip: 'Nghiệm phương trình bậc 2',
        },
        {
          label: 'Định lý Pytago',
          latex: 'a^2 + b^2 = c^2',
          preview: 'a² + b² = c²',
          tooltip: 'Định lý tam giác vuông',
        },
        {
          label: 'Lượng giác cơ bản',
          latex: '\\sin^2(x) + \\cos^2(x) = 1',
          preview: 'sin²(x) + cos²(x) = 1',
          tooltip: 'Hằng đẳng thức lượng giác',
        },
        {
          label: 'Đạo hàm hàm số',
          latex: "f'(x) = \\lim_{\\Delta x \\to 0} \\frac{f(x + \\Delta x) - f(x)}{\\Delta x}",
          preview: "f'(x) = lim (Δf / Δx)",
          tooltip: 'Định nghĩa đạo hàm',
        },
        {
          label: 'Hệ phương trình',
          latex: '\\begin{cases} a_1 x + b_1 y = c_1 \\\\ a_2 x + b_2 y = c_2 \\end{cases}',
          preview: '{ a₁x + b₁y = c₁ ... }',
          tooltip: 'Hệ 2 phương trình bậc nhất',
        },
        {
          label: 'Ma trận 2x2',
          latex: 'A = \\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}',
          preview: '[a b; c d]',
          tooltip: 'Ma trận cấp 2',
        },
      ],
    },
  };

  const insertSymbol = (symLatex: string) => {
    setLatexCode(prev => (prev ? `${prev} ${symLatex}` : symLatex));
  };

  const handleApplyInsert = () => {
    if (!latexCode.trim()) return;

    // Định dạng công thức toán học chuẩn xác dưới dạng $ mã công thức $
    const formulaText = `$ ${latexCode.trim()} $`;
    const renderedHtml = `<span class="math-tex font-serif text-indigo-950 font-medium px-1 bg-indigo-50/60 rounded border border-indigo-100">${formulaText}</span>`;

    onInsert(latexCode.trim(), renderedHtml);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-scale-up">
        {/* Header giống cửa sổ MathType */}
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 px-4 py-3 text-white flex items-center justify-between shadow-md select-none">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/30 border border-indigo-400/40 flex items-center justify-center font-serif text-amber-300 font-black text-sm">
              ∑√
            </div>
            <div>
              <h3 className="font-bold text-sm leading-tight flex items-center gap-1.5">
                <span>Khung Soạn Thảo Công Thức Toán</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  MathType Style
                </span>
              </h3>
              <p className="text-[10px] text-indigo-200">
                Soạn thảo công thức khoa học, phân số, căn thức, tích phân và chèn vào tài liệu
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-indigo-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Math Palette / Toolbar kiểu MathType */}
        <div className="bg-slate-100 border-b border-slate-200 p-2 space-y-2 select-none">
          {/* Tabs nhóm ký hiệu */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
            {Object.entries(symbolGroups).map(([key, group]) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] whitespace-nowrap transition-colors cursor-pointer ${
                  activeTab === key
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                {group.name}
              </button>
            ))}
          </div>

          {/* Lưới các nút ký hiệu toán học */}
          <div className="bg-white p-2.5 rounded-xl border border-slate-200 grid grid-cols-4 sm:grid-cols-6 gap-1.5 max-h-36 overflow-y-auto">
            {symbolGroups[activeTab]?.items.map((sym, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => insertSymbol(sym.latex)}
                title={sym.tooltip || sym.latex}
                className="p-1.5 rounded-lg border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/70 text-slate-800 flex flex-col items-center justify-center transition-all cursor-pointer group"
              >
                <span className="font-serif text-sm font-semibold text-indigo-900 group-hover:scale-110 transition-transform">
                  {sym.preview}
                </span>
                <span className="text-[9px] text-slate-400 font-sans truncate w-full text-center">
                  {sym.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Khu vực soạn thảo & Xem trước */}
        <div className="p-4 space-y-3 overflow-y-auto flex-1">
          {/* Ô nhập mã công thức */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1 uppercase">
                <span>Soạn biểu thức toán (LaTeX / MathType code):</span>
              </label>
              <button
                type="button"
                onClick={() => setLatexCode('')}
                className="text-[10px] font-semibold text-slate-400 hover:text-rose-600 flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" /> Làm trống
              </button>
            </div>
            <textarea
              rows={3}
              value={latexCode}
              onChange={e => setLatexCode(e.target.value)}
              placeholder="Gõ hoặc nhấn chọn ký hiệu toán học bên trên..."
              className="w-full p-2.5 font-mono text-xs text-indigo-950 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none leading-relaxed"
            />
          </div>

          {/* Vùng xem trước công thức trực quan (Live Visual Math Preview) */}
          <div className="p-3 bg-gradient-to-br from-indigo-50/60 to-purple-50/40 rounded-xl border border-indigo-200/80 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-indigo-900">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Hiển thị trước công thức:</span>
              </span>
              <span className="text-[10px] font-mono text-indigo-600 font-semibold bg-white px-2 py-0.5 rounded border border-indigo-100">
                Visual Math Preview
              </span>
            </div>

            <div className="bg-white p-4 rounded-lg border border-indigo-100 min-h-[56px] flex items-center justify-center text-center shadow-2xs overflow-x-auto">
              {latexCode.trim() ? (
                (() => {
                  try {
                    const html = katex.renderToString(latexCode.trim(), {
                      displayMode: true,
                      throwOnError: false,
                    });
                    return (
                      <div
                        className="font-serif text-lg text-slate-900 font-medium tracking-wide py-1"
                        dangerouslySetInnerHTML={{ __html: html }}
                      />
                    );
                  } catch {
                    return (
                      <div className="font-serif text-lg text-slate-900 font-medium tracking-wide">
                        {latexCode}
                      </div>
                    );
                  }
                })()
              ) : (
                <span className="text-xs text-slate-400 italic">
                  Chưa có công thức. Hãy nhập hoặc bấm chọn biểu tượng toán ở trên.
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
          <div className="text-[11px] text-slate-500 hidden sm:flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
            <span>Hỗ trợ chèn trực tiếp vào văn bản giáo án & tài liệu</span>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={handleApplyInsert}
              disabled={!latexCode.trim()}
              className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{initialValue ? 'Cập nhật công thức' : 'Chèn công thức vào tài liệu'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
