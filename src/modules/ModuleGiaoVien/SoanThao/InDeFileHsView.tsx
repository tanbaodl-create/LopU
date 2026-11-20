import React, { useState } from 'react';
import { Printer, FileSpreadsheet, Download, ArrowLeft } from 'lucide-react';
import { auth } from '../../../config/firebase';
import { UserProfile } from '../../../services/storageTypes';

export interface AnswerKeyItem {
  num: number;
  label: string;
  answer: string;
  type?: 'mcq' | 'tf' | 'short' | 'other';
}

interface InDeFileHsViewProps {
  mode: 'inde' | 'filehs';
  html: string;
  docTitle: string;
  chuong?: string;
  teacherName?: string;
  onClose: () => void;
}

/**
 * Trích xuất bảng đáp án từ mã nguồn HTML bài giảng trước khi loại bỏ lời giải
 */
export function extractAnswerKey(rawHtml: string): AnswerKeyItem[] {
  if (!rawHtml) return [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHtml, 'text/html');
  const items: AnswerKeyItem[] = [];
  let questionCounter = 1;

  // 1. Quét theo các khối slide (.slide-item, section[data-slide-index])
  const slideBlocks = doc.querySelectorAll('.slide-item, section[data-slide-index]');
  if (slideBlocks.length > 0) {
    slideBlocks.forEach((slide) => {
      const text = slide.textContent || '';
      const qMatch = text.match(/\b(TNLC\s*\d+|TNDS\s*\d+|TLN\s*\d+|Câu\s*\d+|Ví\s*dụ\s*\d+)\b/i);
      if (!qMatch) return;

      const qLabel = qMatch[1].replace(/\s+/g, ' ').trim();
      let ans = '';

      // Ưu tiên 1: Thuộc tính data-correct trên options-grid
      const grid = slide.querySelector('[data-correct]');
      if (grid) {
        ans = grid.getAttribute('data-correct')?.trim() || '';
      }

      // Ưu tiên 2: Option card có class correct hoặc data-correct="true"
      if (!ans) {
        const correctCard = slide.querySelector('.option-card.correct, [data-opt].correct, [data-correct="true"]');
        if (correctCard) {
          ans = correctCard.getAttribute('data-opt')?.trim() || correctCard.textContent?.trim().slice(0, 1) || '';
        }
      }

      // Ưu tiên 3: Tìm trong khối lời giải
      if (!ans) {
        const solEl = slide.querySelector('.loi-giai, .solution-block, [class*="loi-giai"]');
        const solText = solEl?.textContent || text;
        const ansMatch = solText.match(/(?:Chọn|Đáp án(?:\s*đúng)?(?:\s*là)?|Đáp số)\s*[:\s]*([A-D]|\d+[,\.\d]*|[a-d]\s*[\-:]\s*[ĐSđs].*?)(?:[\.\n\)]|$)/i);
        if (ansMatch) {
          ans = ansMatch[1].trim();
        }
      }

      if (ans) {
        items.push({
          num: questionCounter++,
          label: qLabel,
          answer: ans
        });
      }
    });
  }

  // 2. Dự phòng: Quét trực tiếp theo các thẻ .options-grid hoặc [data-correct] trong toàn bộ tài liệu
  if (items.length === 0) {
    doc.querySelectorAll('.options-grid, [data-correct]').forEach((grid) => {
      const parent = grid.closest('div, section') || grid.parentElement;
      const text = parent?.textContent || '';
      const qMatch = text.match(/\b(TNLC\s*\d+|TNDS\s*\d+|TLN\s*\d+|Câu\s*\d+|Ví\s*dụ\s*\d+)\b/i);
      const qLabel = qMatch ? qMatch[1].replace(/\s+/g, ' ').trim() : `Câu ${questionCounter}`;
      const ans = grid.getAttribute('data-correct')?.trim() || '';

      if (ans) {
        items.push({
          num: questionCounter++,
          label: qLabel,
          answer: ans
        });
      }
    });
  }

  return items;
}

/**
 * Tạo mã HTML cho Bảng đáp án ở cuối tài liệu
 */
export function generateAnswerKeyTableHtml(keys: AnswerKeyItem[]): string {
  if (!keys || keys.length === 0) return '';

  const chunkSize = 10;
  const chunks: AnswerKeyItem[][] = [];
  for (let i = 0; i < keys.length; i += chunkSize) {
    chunks.push(keys.slice(i, i + chunkSize));
  }

  let tableRowsHtml = '';
  chunks.forEach((chunk) => {
    tableRowsHtml += `
      <table style="width: 100%; border-collapse: collapse; text-align: center; margin-bottom: 12px; font-size: 11pt; border: 1.5px solid #0f172a; font-family: 'Times New Roman', Times, serif;">
        <thead>
          <tr style="background: #f1f5f9;">
            <th style="border: 1px solid #0f172a; padding: 6px 8px; font-weight: bold; width: 65px; color: #0f172a;">Câu</th>
            ${chunk.map(k => `<th style="border: 1px solid #0f172a; padding: 6px 8px; font-weight: bold; color: #0f172a;">${k.num}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border: 1px solid #0f172a; padding: 6px 8px; font-weight: bold; background: #f8fafc; color: #0f172a;">Đ/A</td>
            ${chunk.map(k => `<td style="border: 1px solid #0f172a; padding: 6px 8px; font-weight: bold; color: #1e3a8a;">${k.answer}</td>`).join('')}
          </tr>
        </tbody>
      </table>
    `;
  });

  return `
    <div class="answer-key-section" style="margin-top: 36px; padding-top: 18px; border-top: 2px dashed #334155; page-break-inside: avoid; font-family: 'Times New Roman', Times, serif;">
      <div style="text-align: center; font-weight: bold; font-size: 13pt; margin-bottom: 12px; text-transform: uppercase; color: #0f172a; letter-spacing: 0.5px;">
        BẢNG ĐÁP ÁN CÁC CÂU HỎI
      </div>
      <div style="max-width: 680px; margin: 0 auto;">
        ${tableRowsHtml}
      </div>
    </div>
  `;
}

/**
 * Xử lý tài liệu phục vụ In đề (Bỏ toàn bộ lời giải)
 */
export function transformHtmlForInDe(rawHtml: string): string {
  return transformHtmlForStudent(rawHtml, { includeAnswerKey: false });
}

/**
 * Xử lý tài liệu xuất File Học Sinh:
 * 1. Bỏ hết lời giải các câu
 * 2. Xuất đủ nội dung: Lý thuyết, đề bài ví dụ, TNKQ, TNDS, TLN, Câu hỏi...
 * 3. Tùy chọn gắn bảng đáp án ở cuối tài liệu
 */
export function transformHtmlForStudent(
  rawHtml: string,
  options: { includeAnswerKey?: boolean } = {}
): string {
  if (!rawHtml) return '<p style="color: #64748b; font-style: italic;">Chưa có nội dung văn bản.</p>';

  // 1. Trích xuất danh sách đáp án trước khi xóa các khối lời giải
  const answerKeys = options.includeAnswerKey ? extractAnswerKey(rawHtml) : [];

  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHtml, 'text/html');

  // 2. Loại bỏ các phần tử điều hướng và tiện ích trình chiếu
  const removeSelectors = [
    '.bottom-nav-bar',
    '#btnPrevSlide',
    '#btnNextSlide',
    '#slideIndicator',
    '.nav-arrow-btn',
    '.slide-nav',
    '.slide-counter',
    '.slide-controls',
    '.timer-box',
    '.timer-display',
    '.timer-btn',
    '.quiz-timer',
    '[data-seconds]',
    '.step-order-badge',
    '.step-num-input',
    '.quiz-actions',
    '.btn-check-answer',
    'button.check-btn',
  ];
  removeSelectors.forEach(sel => {
    doc.querySelectorAll(sel).forEach(el => el.remove());
  });

  // Loại bỏ các chữ kiểu ◀ Slide 1 / 15 ▶, Slide 1 / 8, Trang 1 / 8
  doc.querySelectorAll('div, p, span, h1, h2, h3, h4').forEach(el => {
    const t = el.textContent?.trim() || '';
    if (/^[◀❮<]?\s*(?:Slide|Trang|Trước)?\s*\d+\s*(?:[\/|\-]\s*\d+)?\s*[▶❯>]?$/i.test(t) ||
        /^(?:Slide|Trang)\s*\d+\s*(?:[\/|\-]\s*\d+)?$/i.test(t) ||
        /^[◀❮<]\s*Slide\s*\d+\s*[\/|\-]\s*\d+\s*[▶❯>]$/i.test(t)) {
      el.remove();
    }
  });

  // 3. BỎ TOÀN BỘ LỜI GIẢI CÁC CÂU
  const solutionSelectors = [
    '.loi-giai',
    '.loi-giai-block',
    '.solution-block',
    '.dap-an-block',
    'div[data-step="2"].loi-giai',
    '[data-effect-break="true"].loi-giai',
    'div[style*="border-top"]',
    'div[style*="border-dashed"]'
  ];
  solutionSelectors.forEach(sel => {
    doc.querySelectorAll(sel).forEach(el => el.remove());
  });

  doc.querySelectorAll('p, div, span, strong, em, section').forEach(el => {
    const text = (el.textContent || '').trim();
    if (
      text.startsWith('Lời giải:') ||
      text.startsWith('Lời giải chi tiết:') ||
      text.startsWith('Hướng dẫn giải:') ||
      text.startsWith('Đáp án:') ||
      text.startsWith('Đáp án: A') || text.startsWith('Đáp án: B') || text.startsWith('Đáp án: C') || text.startsWith('Đáp án: D')
    ) {
      if (el.children.length === 0 || el.tagName === 'P' || el.tagName === 'DIV' || el.tagName === 'SPAN') {
        el.remove();
      }
    }
  });

  // 4. Chuẩn hóa hiển thị phương án trắc nghiệm A, B, C, D cho trang in A4
  doc.querySelectorAll('.options-grid').forEach((grid) => {
    const options = Array.from(grid.querySelectorAll('.option-card, [data-opt]'));
    if (options.length > 0) {
      const optContainer = doc.createElement('div');
      optContainer.style.display = 'grid';
      optContainer.style.gridTemplateColumns = 'repeat(4, 1fr)';
      optContainer.style.gap = '12px';
      optContainer.style.margin = '10px 0 16px 0';
      optContainer.style.fontFamily = "'Times New Roman', Times, serif";

      options.forEach(opt => {
        const optDiv = doc.createElement('div');
        optDiv.style.padding = '4px 6px';
        optDiv.style.fontSize = '12.5pt';
        optDiv.innerHTML = opt.innerHTML;
        optContainer.appendChild(optDiv);
      });

      grid.replaceWith(optContainer);
    }
  });

  // 5. Chuẩn hóa thẻ bài tập / câu hỏi
  doc.querySelectorAll('.cau-hoi').forEach(el => {
    const htmlEl = el as HTMLElement;
    htmlEl.style.background = 'transparent';
    htmlEl.style.border = 'none';
    htmlEl.style.padding = '6px 0';
    htmlEl.style.margin = '12px 0 6px 0';
    htmlEl.style.fontSize = '13pt';
    htmlEl.style.lineHeight = '1.6';
    htmlEl.style.color = '#000000';
    htmlEl.style.fontFamily = "'Times New Roman', Times, serif";
  });

  // Chuẩn hóa thẻ lý thuyết .theory-card
  doc.querySelectorAll('.theory-card').forEach(el => {
    const htmlEl = el as HTMLElement;
    htmlEl.style.background = '#ffffff';
    htmlEl.style.border = '1px solid #cbd5e1';
    htmlEl.style.borderRadius = '8px';
    htmlEl.style.padding = '12px 16px';
    htmlEl.style.margin = '10px 0';
  });

  // Chuẩn hóa thẻ section-banner / tiêu đề
  doc.querySelectorAll('.section-banner').forEach(el => {
    const htmlEl = el as HTMLElement;
    htmlEl.style.color = '#0f172a';
    htmlEl.style.borderBottom = '1.5px solid #0f172a';
    htmlEl.style.paddingBottom = '4px';
    htmlEl.style.marginTop = '18px';
    htmlEl.style.marginBottom = '12px';
    htmlEl.style.fontSize = '14pt';
    htmlEl.style.fontWeight = 'bold';
  });

  let outputHtml = doc.body.innerHTML;

  // 6. Gắn Bảng đáp án ở cuối tài liệu nếu tùy chọn được bật
  if (options.includeAnswerKey && answerKeys.length > 0) {
    outputHtml += generateAnswerKeyTableHtml(answerKeys);
  }

  return outputHtml;
}

/**
 * Tương thích ngược: transformHtmlForFileHS delegating to transformHtmlForStudent
 */
export function transformHtmlForFileHS(rawHtml: string): string {
  return transformHtmlForStudent(rawHtml, { includeAnswerKey: true });
}

function getTeacherName(): string {
  try {
    const saved = localStorage.getItem('lopu_settings_teacher_name');
    if (saved && saved.trim()) return saved.trim();
  } catch {}

  try {
    const profileStr = localStorage.getItem('currentUserProfile');
    if (profileStr) {
      const profile = JSON.parse(profileStr);
      if (profile?.name && profile.name.trim()) return profile.name.trim();
      if (profile?.nickname && profile.nickname.trim()) return profile.nickname.trim();
    }
  } catch {}

  try {
    const activeEmail = (auth?.currentUser?.email || localStorage.getItem('lopu_auth_email') || localStorage.getItem('lopu_active_user_email') || 'tanbaodl@gmail.com').toLowerCase().trim();
    const usersRaw = localStorage.getItem('lopu_firestore_users_v1');
    if (usersRaw) {
      const users: UserProfile[] = JSON.parse(usersRaw);
      const matched = users.find(u => (u.email || '').toLowerCase().trim() === activeEmail);
      if (matched) {
        if (matched.name && matched.name.trim()) return matched.name.trim();
        if (matched.nickname && matched.nickname.trim()) return matched.nickname.trim();
      }
    }
  } catch {}

  try {
    if (auth?.currentUser?.displayName && auth.currentUser.displayName.trim()) {
      return auth.currentUser.displayName.trim();
    }
  } catch {}

  return 'Đỗ Tấn Bảo';
}

function getSchoolName(): string {
  try {
    const saved = localStorage.getItem('lopu_settings_school_name');
    if (saved && saved.trim()) return saved.trim();
  } catch {}
  return 'TRƯỜNG THPT BA GIA';
}

export const InDeFileHsView: React.FC<InDeFileHsViewProps> = ({
  mode,
  html,
  docTitle,
  chuong,
  teacherName: propTeacherName,
  onClose,
}) => {
  const [includeAnswerKey, setIncludeAnswerKey] = useState<boolean>(true);
  const transformedHtml = transformHtmlForStudent(html, { includeAnswerKey });
  const teacherName = propTeacherName || getTeacherName();
  const schoolName = getSchoolName();
  const docTitleText = (docTitle || 'Tài liệu học tập').trim();
  const chuongText = (chuong || 'Chương học tập').trim();
  const footerRightText = `Tài liệu được Giáo viên ${teacherName} biên soạn`;
  const [previewPageType, setPreviewPageType] = useState<'odd' | 'even'>('odd');

  const escapeForCss = (str: string) => {
    if (!str) return '';
    return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, ' ');
  };

  const handleDownloadPdf = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const titleText = docTitleText || 'Tai_lieu_hoc_sinh';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${titleText}_File_Hoc_Sinh</title>
          <meta charset="utf-8" />
          <style>
            @page {
              size: A4 portrait;
              margin-top: 2.2cm;
              margin-bottom: 2.2cm;
              margin-left: 2.5cm;
              margin-right: 2cm;
              @bottom-left {
                content: "${escapeForCss(docTitleText)}";
                font-family: 'Times New Roman', Times, serif;
                font-size: 10pt;
                font-style: italic;
                color: #333;
              }
              @bottom-right {
                content: "${escapeForCss(footerRightText)}";
                font-family: 'Times New Roman', Times, serif;
                font-size: 10pt;
                font-style: italic;
                color: #333;
              }
            }
            @page :right {
              @top-left {
                content: "${escapeForCss(chuongText)}";
                font-family: 'Times New Roman', Times, serif;
                font-size: 10pt;
                font-style: italic;
                color: #333;
              }
              @top-right {
                content: "Trang " counter(page);
                font-family: 'Times New Roman', Times, serif;
                font-size: 10pt;
                color: #333;
              }
            }
            @page :left {
              @top-left {
                content: "Trang " counter(page);
                font-family: 'Times New Roman', Times, serif;
                font-size: 10pt;
                color: #333;
              }
              @top-right {
                content: "${escapeForCss(chuongText)}";
                font-family: 'Times New Roman', Times, serif;
                font-size: 10pt;
                font-style: italic;
                color: #333;
              }
            }
            @media print {
              body {
                margin: 0;
                padding: 0;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .no-print {
                display: none !important;
              }
            }
            body {
              font-family: 'Times New Roman', Times, serif;
              font-size: 13pt;
              line-height: 1.6;
              color: #000;
              background: #fff;
              padding: 0;
              margin: 0;
            }
            .school-header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 2px solid #000;
              padding-bottom: 12px;
              margin-bottom: 18px;
            }
            .paper-title {
              font-size: 16pt;
              font-weight: bold;
              text-transform: uppercase;
              margin: 0;
            }
            .paper-subtitle {
              font-size: 11.5pt;
              font-style: italic;
              margin-top: 6px;
            }
            .paper-footer-screen {
              margin-top: 40px;
              font-size: 10pt;
              font-style: italic;
              color: #555;
              border-top: 1px dashed #cbd5e1;
              padding-top: 12px;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
          </style>
          <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
          <script>
            window.MathJax = {
              tex: {
                inlineMath: [['$', '$']],
                displayMath: [['$$', '$$']],
                macros: { vec: ['\\\\overrightarrow{#1}', 1] }
              },
              startup: {
                ready: () => {
                  MathJax.startup.defaultReady();
                  MathJax.startup.promise.then(() => {
                    setTimeout(() => { window.print(); }, 400);
                  });
                }
              }
            };
          </script>
          <script async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
        </head>
        <body>
          <div class="school-header">
            <div style="text-align: center; font-size: 11pt; font-weight: bold; line-height: 1.4;">
              <div>${schoolName}</div>
              <div style="font-style: italic; font-weight: normal;">TỔ TOÁN</div>
              <div style="border-top: 1px solid #000; width: 60px; margin: 4px auto 0;"></div>
            </div>
            <div style="text-align: center; font-size: 11pt; font-weight: bold; line-height: 1.4;">
              <div>TÀI LIỆU HỌC TẬP &amp; PHIẾU BÀI TẬP</div>
              <div style="font-style: italic; font-weight: normal;">HÌNH HỌC 10 • GDPT 2018</div>
              <div style="border-top: 1px solid #000; width: 60px; margin: 4px auto 0;"></div>
            </div>
          </div>

          <div style="text-align: center; margin-bottom: 20px;">
            <h1 class="paper-title">${docTitleText}</h1>
            <p class="paper-subtitle">
              Họ và tên học sinh: ................................................................................ Lớp: 10..........
            </p>
          </div>

          <div class="content-body">
            ${transformedHtml}
          </div>

          <div class="paper-footer-screen no-print">
            <span>${docTitleText}</span>
            <span>${footerRightText}</span>
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 1200);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="bg-slate-100 p-4 sm:p-6 rounded-b-2xl border border-slate-300 border-t-0 shadow-inner space-y-4">
      {/* Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại</span>
          </button>

          <span className="px-3.5 py-1.5 rounded-xl bg-emerald-100 text-emerald-950 border border-emerald-300 font-black text-xs flex items-center gap-1.5 shadow-2xs">
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span>XUẤT FILE HỌC SINH (BỎ TOÀN BỘ LỜI GIẢI CÁC CÂU)</span>
          </span>

          {/* Tùy chọn: Kèm bảng đáp án cuối file */}
          <label className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold text-slate-800 cursor-pointer hover:bg-slate-100 transition-colors shadow-2xs">
            <input
              type="checkbox"
              checked={includeAnswerKey}
              onChange={(e) => setIncludeAnswerKey(e.target.checked)}
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
            />
            <span>Kèm bảng đáp án cuối file</span>
          </label>

          {/* Toggle xem trước Header trang chẵn / trang lẻ */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <span className="text-[11px] text-slate-500 px-1.5">Header A4:</span>
            <button
              type="button"
              onClick={() => setPreviewPageType('odd')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                previewPageType === 'odd'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
              title="Trang lẻ: Tên chương lề trái • Số trang lề phải"
            >
              Trang lẻ
            </button>
            <button
              type="button"
              onClick={() => setPreviewPageType('even')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                previewPageType === 'even'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
              title="Trang chẵn: Số trang lề trái • Tên chương lề phải"
            >
              Trang chẵn
            </button>
          </div>
        </div>

        {/* Nút Tạo file PDF toàn bộ nội dung */}
        <button
          type="button"
          onClick={handleDownloadPdf}
          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer hover:scale-102"
          title="Tạo file PDF A4 toàn bộ nội dung (lý thuyết, đề bài ví dụ, TNKQ, TNDS, TLN, và bảng đáp án cuối file nếu bật)"
        >
          <Download className="w-4 h-4" />
          <span>Tạo file PDF (Khổ A4)</span>
        </button>
      </div>

      {/* A4 Paper Sheet Preview Container */}
      <div className="flex justify-center py-4 overflow-x-auto">
        <div className="bg-white p-10 sm:p-14 rounded-2xl shadow-2xl border border-slate-300 min-h-[700px] w-full max-w-4xl text-slate-900 font-serif leading-relaxed text-base relative">
          {/* Header trang in mô phỏng theo chuẩn trang chẵn / trang lẻ */}
          <div className="border-b border-slate-300 pb-2.5 mb-6 flex items-center justify-between text-xs font-serif text-slate-700">
            {previewPageType === 'odd' ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="font-semibold italic text-slate-900">{chuongText}</span>
                  <span className="text-[10px] not-italic bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded font-sans font-bold">
                    Trang lẻ (Chương lề trái)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] not-italic bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded font-sans font-bold">
                    Số trang lề phải
                  </span>
                  <span className="font-bold text-slate-900 font-sans">Trang 1</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 font-sans">Trang 2</span>
                  <span className="text-[10px] not-italic bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded font-sans font-bold">
                    Trang chẵn (Số trang lề trái)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] not-italic bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded font-sans font-bold">
                    Chương lề phải
                  </span>
                  <span className="font-semibold italic text-slate-900">{chuongText}</span>
                </div>
              </>
            )}
          </div>

          <div className="school-header flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-6">
            <div className="text-center font-serif leading-tight">
              <div className="font-bold text-sm tracking-wide">{schoolName}</div>
              <div className="italic text-xs text-slate-700">TỔ TOÁN</div>
            </div>
            <div className="text-center font-serif leading-tight">
              <div className="font-bold text-sm tracking-wide">TÀI LIỆU HỌC TẬP &amp; BÀI TẬP</div>
              <div className="italic text-xs text-slate-700">HÌNH HỌC 10 • GDPT 2018</div>
            </div>
          </div>

          <div className="text-center pb-4 mb-6">
            <h2 className="text-xl font-bold uppercase tracking-wider text-slate-950">{docTitleText}</h2>
            <p className="text-xs font-semibold text-slate-700 mt-2 italic">
              Họ và tên học sinh: ................................................................................ Lớp: 10..........
            </p>
          </div>

          <div
            className="prose max-w-none text-slate-900 font-serif leading-relaxed"
            dangerouslySetInnerHTML={{ __html: transformedHtml }}
          />

          {/* Footer trang in */}
          <div className="mt-12 border-t border-slate-300 pt-3 flex items-center justify-between text-xs italic text-slate-600 font-serif">
            <span className="font-semibold not-italic text-slate-800">{docTitleText}</span>
            <span className="text-slate-700">{footerRightText}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
