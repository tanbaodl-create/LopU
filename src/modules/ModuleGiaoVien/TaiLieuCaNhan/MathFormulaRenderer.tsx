import React, { useMemo } from 'react';
import { Edit3 } from 'lucide-react';
import katex from 'katex';

interface MathFormulaRendererProps {
  text: string;
  className?: string;
  onEditFormula?: (formula: string, fullMatch: string, index: number) => void;
  clickable?: boolean;
}

/**
 * Hiển thị văn bản kèm công thức toán MathType ($...$ hoặc $$...$$) đã được dịch trực quan bằng KaTeX / MathJax.
 * Cho phép giáo viên nhấp vào công thức để mở hộp thoại MathType chỉnh sửa và cập nhật lại công thức.
 */
export const MathFormulaRenderer: React.FC<MathFormulaRendererProps> = ({
  text,
  className = '',
  onEditFormula,
  clickable = true,
}) => {
  if (!text) return null;

  // Tiền xử lý để chuẩn hóa văn bản, loại bỏ các cặp dấu $ rỗng do lồng ghép ($ $ hoặc $  $)
  const cleanedText = useMemo(() => {
    let t = text;
    // Xóa các cụm $ rỗng như $ $ hoặc $  $
    t = t.replace(/\$\s*\$/g, ' ');
    return t;
  }, [text]);

  // Phân tích văn bản thành các đoạn text và math
  const parts = useMemo(() => {
    // Regex tìm công thức trong cặp $$...$$ hoặc $...$ hoặc các cú pháp LaTeX thông dụng bắt đầu bằng \ nếu không nằm trong $
    const regex = /(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g;
    const result: Array<{ type: 'text' | 'math'; content: string; raw: string; index: number }> = [];

    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(cleanedText)) !== null) {
      if (match.index > lastIndex) {
        const textChunk = cleanedText.slice(lastIndex, match.index);
        result.push({
          type: 'text',
          content: textChunk,
          raw: textChunk,
          index: lastIndex,
        });
      }

      const raw = match[0];
      const isDouble = raw.startsWith('$$') && raw.endsWith('$$');
      const formula = isDouble ? raw.slice(2, -2).trim() : raw.slice(1, -1).trim();

      // Chỉ thêm nếu formula không rỗng
      if (formula.length > 0) {
        result.push({
          type: 'math',
          content: formula,
          raw,
          index: match.index,
        });
      }

      lastIndex = match.index + raw.length;
    }

    if (lastIndex < cleanedText.length) {
      const remaining = cleanedText.slice(lastIndex);
      result.push({
        type: 'text',
        content: remaining,
        raw: remaining,
        index: lastIndex,
      });
    }

    // Nếu văn bản không có cặp $ nào nhưng chứa lệnh LaTeX như \sqrt, \frac, \mathbb, ... thì tự động nhận diện
    if (result.every(p => p.type === 'text') && /\\(sqrt|frac|mathbb|int|sum|prod|lim|alpha|beta|gamma|Delta|in|notin|subset|approx|neq|pm|times|div|le|ge|infty|setminus)/.test(cleanedText)) {
      return [
        {
          type: 'math' as const,
          content: cleanedText.trim(),
          raw: cleanedText.trim(),
          index: 0,
        },
      ];
    }

    return result;
  }, [cleanedText]);

  // Nếu không có phần tử nào
  if (parts.length === 0) {
    return <span className={className}>{cleanedText}</span>;
  }

  // Hàm render KaTeX an toàn
  const renderKatexHtml = (formula: string, isDisplay: boolean = false): string => {
    try {
      return katex.renderToString(formula, {
        displayMode: isDisplay,
        throwOnError: false,
        output: 'html',
      });
    } catch {
      return formula;
    }
  };

  return (
    <span className={`inline-math-container ${className}`}>
      {parts.map((p, idx) => {
        if (p.type === 'text') {
          // Bảo tồn xuống dòng
          const lines = p.content.split('\n');
          return (
            <React.Fragment key={idx}>
              {lines.map((line, lIdx) => (
                <React.Fragment key={lIdx}>
                  {lIdx > 0 && <br />}
                  <span>{line}</span>
                </React.Fragment>
              ))}
            </React.Fragment>
          );
        }

        // Math formula pill
        const isClickable = clickable && !!onEditFormula;
        const isDouble = p.raw.startsWith('$$');
        const renderedHtml = renderKatexHtml(p.content, isDouble);

        return (
          <span
            key={idx}
            onClick={(e) => {
              if (isClickable) {
                e.stopPropagation();
                onEditFormula(p.content, p.raw, p.index);
              }
            }}
            title={isClickable ? 'Nhấn để mở cửa sổ MathType chỉnh sửa công thức này' : undefined}
            className={`inline-flex items-center align-middle gap-1.5 px-2 py-0.5 mx-1 my-0.5 rounded-lg text-slate-900 border transition-all select-none ${
              isClickable
                ? 'bg-purple-50/90 hover:bg-purple-100 text-purple-950 border-purple-300 hover:border-purple-400 cursor-pointer shadow-2xs hover:shadow-xs group hover:scale-[1.01]'
                : 'bg-indigo-50/60 text-indigo-950 border-indigo-200'
            }`}
          >
            <span
              className="katex-rendered-content text-[1.05em] leading-normal font-serif text-slate-900"
              dangerouslySetInnerHTML={{ __html: renderedHtml }}
            />
            {isClickable && (
              <span className="flex items-center justify-center p-0.5 rounded bg-purple-200/60 text-purple-700 group-hover:bg-purple-600 group-hover:text-white transition-colors ml-1 shrink-0">
                <Edit3 className="w-3 h-3" />
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
};
