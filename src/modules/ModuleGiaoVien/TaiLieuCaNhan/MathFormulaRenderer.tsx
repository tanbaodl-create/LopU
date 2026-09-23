import React, { useMemo } from 'react';
import { Edit3 } from 'lucide-react';
import katex from 'katex';
import { TikZVisualRenderer } from './TikZVisualRenderer';

export interface MathFormulaRendererProps {
  text: string;
  className?: string;
  fontSize?: string;
  onEditFormula?: (formula: string, fullMatch: string, index: number) => void;
  onEditTikZ?: (detail: any) => void;
  clickable?: boolean;
  isTeacher?: boolean;
}

/**
 * Hiển thị văn bản kèm công thức toán MathType ($...$ hoặc $$...$$) đã được dịch trực quan bằng KaTeX / MathJax,
 * và hiển thị trực quan mã TikZ (Đồ thị hàm số, Bảng biến thiên tikz-tab).
 * Cho phép giáo viên nhấp vào công thức để mở hộp thoại MathType chỉnh sửa và cập nhật lại công thức.
 */
export const MathFormulaRenderer: React.FC<MathFormulaRendererProps> = ({
  text,
  className = '',
  fontSize,
  onEditFormula,
  onEditTikZ,
  clickable = true,
  isTeacher,
}) => {
  if (!text) return null;

  // Phân tích văn bản thành các đoạn text, math và tikz
  const parts = useMemo(() => {
    // Regex tìm TikZ block và các dòng comment cấu hình/metadata đứng liền trước nó (% Đồ thị hàm số, % Cấu hình, % Yêu cầu...)
    const tikzRegex = /((?:(?:^|[ \t]*)%[^\n]*\r?\n)*[ \t]*\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\})/gm;
    const result: Array<{ type: 'text' | 'math' | 'tikz'; content: string; raw: string; index: number }> = [];

    // Tách các khối TikZ trước từ văn bản gốc để không làm mất metadata comments
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = tikzRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        const preChunk = text.slice(lastIndex, match.index);
        parseMathAndText(preChunk, lastIndex, result);
      }

      result.push({
        type: 'tikz',
        content: match[0].trim(),
        raw: match[0],
        index: match.index,
      });

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      const postChunk = text.slice(lastIndex);
      parseMathAndText(postChunk, lastIndex, result);
    }

    return result;
  }, [text]);

  // Hàm phụ trợ phân tách Math & Text cho các đoạn không phải TikZ
  function parseMathAndText(
    chunk: string,
    baseOffset: number,
    outArray: Array<{ type: 'text' | 'math' | 'tikz'; content: string; raw: string; index: number }>
  ) {
    // Chuẩn hóa chunk: xóa các dòng comment % bên ngoài TikZ và xóa $ rỗng
    let cleanedChunk = chunk
      .split('\n')
      .filter(line => {
        const tr = line.trim();
        if (tr.startsWith('📈 Đồ thị TikZ') || tr.startsWith('📊 Bảng biến thiên')) {
          return false;
        }
        return true;
      })
      .join('\n')
      .replace(/\$\s*\$/g, ' ');

    const mathRegex = /(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g;
    let localLast = 0;
    let mathMatch: RegExpExecArray | null;

    while ((mathMatch = mathRegex.exec(cleanedChunk)) !== null) {
      if (mathMatch.index > localLast) {
        const textChunk = cleanedChunk.slice(localLast, mathMatch.index);
        if (textChunk) {
          outArray.push({
            type: 'text',
            content: textChunk,
            raw: textChunk,
            index: baseOffset + localLast,
          });
        }
      }

      const raw = mathMatch[0];
      const isDouble = raw.startsWith('$$') && raw.endsWith('$$');
      const formula = isDouble ? raw.slice(2, -2).trim() : raw.slice(1, -1).trim();

      if (formula.length > 0) {
        outArray.push({
          type: 'math',
          content: formula,
          raw,
          index: baseOffset + mathMatch.index,
        });
      }

      localLast = mathMatch.index + raw.length;
    }

    if (localLast < cleanedChunk.length) {
      const rem = cleanedChunk.slice(localLast);
      if (rem) {
        outArray.push({
          type: 'text',
          content: rem,
          raw: rem,
          index: baseOffset + localLast,
        });
      }
    }
  }

  // Nếu không có phần tử nào
  if (parts.length === 0) {
    return <span className={className}>{text}</span>;
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
        if (p.type === 'tikz') {
          return <TikZVisualRenderer key={idx} tikzCode={p.content} isTeacher={isTeacher} fontSize={fontSize} onEdit={onEditTikZ} />;
        }

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

        // Math formula span - không bao viền, không nền để đồng nhất nền với nền câu hỏi
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
            title={isClickable ? 'Nhấn để chỉnh sửa công thức trong MathType' : undefined}
            className={`inline-inline-flex items-center align-middle mx-0.5 select-none ${
              isClickable
                ? 'cursor-pointer hover:text-indigo-600 transition-colors'
                : ''
            }`}
          >
            <span
              className="katex-rendered-content text-[1.05em] leading-normal font-serif"
              dangerouslySetInnerHTML={{ __html: renderedHtml }}
            />
          </span>
        );
      })}
    </span>
  );
};
