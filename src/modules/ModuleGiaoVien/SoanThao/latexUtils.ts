/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import katex from 'katex';

/**
 * Trợ giúp chuyển đổi các chuỗi công thức Toán dạng $ mã latex $ hoặc $$ mã latex $$ trong văn bản thuần thành KaTeX rendered HTML.
 * Chú ý: Dấu $ được nhập dạng \$ sẽ được xử lý thành dấu $ thuần túy và KHÔNG kích hoạt render công thức.
 */
export function renderLatexInText(text: string): string {
  if (!text || !text.includes('$')) return text;

  // 1. Tạm thời bảo vệ các dấu $ được escape dạng \$ hoặc &#36;
  const ESCAPED_TOKEN = '___ESCAPED_DOLLAR_TOKEN___';
  let processed = text.replace(/\\\$|\&#36;/g, ESCAPED_TOKEN);

  // 2. Chuyển đổi $$ ... $$ (Display Math - Khối công thức căn giữa)
  processed = processed.replace(/\$\$([\s\S]+?)\$\$/g, (fullMatch, mathCode) => {
    const code = mathCode.trim();
    if (!code) return fullMatch;
    try {
      const renderedHtml = katex.renderToString(code, {
        displayMode: true,
        throwOnError: false,
      });
      return `<span class="math-rendered my-1 block text-center bg-transparent hover:bg-indigo-50/70 border border-transparent hover:border-indigo-200 transition-all cursor-pointer" data-latex="$$ ${code} $$" contenteditable="false" title="Công thức toán: $$ ${code} $$ (Kích để sửa)">${renderedHtml}</span>`;
    } catch {
      return fullMatch;
    }
  });

  // 3. Chuyển đổi $ ... $ (Inline Math - Công thức nằm trên dòng)
  processed = processed.replace(/\$([^\$\n]+?)\$/g, (fullMatch, mathCode) => {
    const code = mathCode.trim();
    if (!code) return fullMatch;
    try {
      const renderedHtml = katex.renderToString(code, {
        displayMode: false,
        throwOnError: false,
      });
      return `<span class="math-rendered inline-block align-middle my-0.5 px-1.5 py-0.5 rounded bg-transparent hover:bg-indigo-50/70 border border-transparent hover:border-indigo-200 transition-all select-all cursor-pointer" data-latex="$ ${code} $" contenteditable="false" title="Công thức toán: $ ${code} $ (Kích để sửa)">${renderedHtml}</span>`;
    } catch {
      return fullMatch;
    }
  });

  // 4. Khôi phục các dấu $ được escape (\$ -> $)
  processed = processed.replace(new RegExp(ESCAPED_TOKEN, 'g'), '$');

  return processed;
}

/**
 * Render công thức Toán trong chuỗi HTML bằng cách phân tách các thẻ HTML và nội dung văn bản.
 * Đảm bảo các thuộc tính trong thẻ HTML (như title, data-latex, src...) không bị ảnh hưởng.
 */
export function renderLatexInHtml(html: string): string {
  if (!html || !html.includes('$')) return html;

  // Tách HTML thành các phần: thẻ HTML và văn bản thuần
  const parts = html.split(/(<[^>]+>)/g);
  let inMathRenderedSpan = false;

  const processedParts = parts.map((part) => {
    if (part.startsWith('<') && part.endsWith('>')) {
      if (part.includes('class="math-rendered') || part.includes('class=\'math-rendered')) {
        inMathRenderedSpan = true;
      } else if (inMathRenderedSpan && (part.startsWith('</span') || part.startsWith('</SPAN'))) {
        inMathRenderedSpan = false;
      }
      return part;
    }

    if (inMathRenderedSpan) {
      return part;
    }

    return renderLatexInText(part);
  });

  return processedParts.join('');
}

/**
 * Tự động quét và render các công thức $ ... $ hoặc $$ ... $$ trực tiếp trong thẻ DOM Soạn thảo Word
 */
export function autoRenderLatexInDom(container: HTMLElement): boolean {
  if (!container) return false;

  const textNodes: Text[] = [];
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        let parent = node.parentElement;
        while (parent && parent !== container) {
          if (
            parent.classList.contains('math-rendered') ||
            parent.tagName === 'SCRIPT' ||
            parent.tagName === 'STYLE' ||
            parent.tagName === 'CODE'
          ) {
            return NodeFilter.FILTER_REJECT;
          }
          parent = parent.parentElement;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    }
  );

  let currentNode = walker.nextNode();
  while (currentNode) {
    if (currentNode.nodeValue && currentNode.nodeValue.includes('$')) {
      textNodes.push(currentNode as Text);
    }
    currentNode = walker.nextNode();
  }

  let renderedAny = false;

  for (const textNode of textNodes) {
    const val = textNode.nodeValue;
    if (!val || !val.includes('$')) continue;

    const renderedText = renderLatexInText(val);
    if (renderedText !== val) {
      const span = document.createElement('span');
      span.innerHTML = renderedText;

      const parent = textNode.parentNode;
      if (parent) {
        const sel = window.getSelection();
        let lastInsertedNode: Node | null = null;

        while (span.firstChild) {
          lastInsertedNode = parent.insertBefore(span.firstChild, textNode);
        }
        parent.removeChild(textNode);
        renderedAny = true;

        if (sel && lastInsertedNode) {
          try {
            const range = document.createRange();
            range.setStartAfter(lastInsertedNode);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
          } catch {}
        }
      }
    }
  }

  return renderedAny;
}
