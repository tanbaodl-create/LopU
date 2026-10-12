import React from 'react';
import { Printer, FileSpreadsheet, Download, ArrowLeft } from 'lucide-react';
import { auth } from '../../../config/firebase';
import { UserProfile } from '../../../services/storageTypes';

interface InDeFileHsViewProps {
  mode: 'inde' | 'filehs';
  html: string;
  docTitle: string;
  onClose: () => void;
}

export function transformHtmlForInDe(rawHtml: string): string {
  if (!rawHtml) return '<p style="color: #64748b; font-style: italic;">Chưa có nội dung văn bản.</p>';
  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHtml, 'text/html');

  // Lọc và xóa tất cả phần Lời giải, Đáp án, Ghi chú hướng dẫn giải
  const allElements = doc.querySelectorAll('p, div, span, strong, em, section');
  allElements.forEach((el) => {
    const text = (el.textContent || '').trim();
    if (
      text.startsWith('Lời giải:') ||
      text.startsWith('Đáp án:') ||
      text.includes('Lời giải chi tiết:') ||
      text.includes('(Học sinh trình bày các bước giải chi tiết)') ||
      text.startsWith('Đáp án: A') || text.startsWith('Đáp án: B') || text.startsWith('Đáp án: C') || text.startsWith('Đáp án: D')
    ) {
      if (el.children.length === 0 || el.tagName === 'P' || el.tagName === 'DIV' || el.tagName === 'SPAN') {
        el.remove();
      }
    }
  });

  // Xóa các div khung lời giải
  const selectors = [
    'div[style*="border-top"]',
    'div[style*="border-dashed"]',
    '.solution-block',
    '.loi-giai-block',
    '.dap-an-block'
  ];
  selectors.forEach((sel) => {
    doc.querySelectorAll(sel).forEach((el) => {
      const text = el.textContent || '';
      if (text.includes('Lời giải') || text.includes('Đáp án')) {
        el.remove();
      }
    });
  });

  return doc.body.innerHTML;
}

export function transformHtmlForFileHS(rawHtml: string): string {
  if (!rawHtml) return '<p style="color: #64748b; font-style: italic;">Chưa có nội dung văn bản.</p>';
  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHtml, 'text/html');

  const allBlocks = doc.querySelectorAll('p, div, section');
  allBlocks.forEach((el) => {
    const text = (el.textContent || '').trim();
    if (text.includes('Lời giải') || text.includes('Lời giải:') || text.includes('Lời giải chi tiết:')) {
      const lines = text.split('\n').filter(l => l.trim()).length || 1;
      const estimatedLines = Math.max(lines, Math.ceil(text.length / 65));
      const dotCount = Math.max(3, estimatedLines + 2);

      const dottedContainer = doc.createElement('div');
      dottedContainer.style.marginTop = '10px';
      dottedContainer.style.marginBottom = '16px';

      const label = doc.createElement('div');
      label.style.fontWeight = 'bold';
      label.style.color = '#334155';
      label.style.marginBottom = '6px';
      label.innerHTML = '<strong>Lời giải:</strong>';
      dottedContainer.appendChild(label);

      for (let i = 0; i < dotCount; i++) {
        const dotLine = doc.createElement('div');
        dotLine.style.borderBottom = '1.5px dotted #64748b';
        dotLine.style.height = '20px';
        dotLine.style.marginBottom = '8px';
        dotLine.style.width = '100%';
        dottedContainer.appendChild(dotLine);
      }

      el.replaceWith(dottedContainer);
    } else if (text.includes('Đáp án:') || text.includes('(Học sinh trình bày các bước giải chi tiết)')) {
      const dottedContainer = doc.createElement('div');
      dottedContainer.style.marginTop = '10px';
      dottedContainer.style.marginBottom = '16px';

      const label = doc.createElement('div');
      label.style.fontWeight = 'bold';
      label.style.color = '#334155';
      label.style.marginBottom = '6px';
      label.innerHTML = '<strong>Bài làm:</strong>';
      dottedContainer.appendChild(label);

      for (let i = 0; i < 3; i++) {
        const dotLine = doc.createElement('div');
        dotLine.style.borderBottom = '1.5px dotted #64748b';
        dotLine.style.height = '20px';
        dotLine.style.marginBottom = '8px';
        dotLine.style.width = '100%';
        dottedContainer.appendChild(dotLine);
      }

      el.replaceWith(dottedContainer);
    }
  });

  return doc.body.innerHTML;
}

function getTeacherName(): string {
  // 1. Ưu tiên cao nhất: Tên trong app (từ localStorage 'currentUserProfile' hoặc danh sách users trong app)
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

  // 2. Dự phòng: Tên tài khoản Google / Firebase Auth
  try {
    if (auth?.currentUser?.displayName && auth.currentUser.displayName.trim()) {
      return auth.currentUser.displayName.trim();
    }
    if (auth?.currentUser?.email) {
      return auth.currentUser.email.split('@')[0];
    }
  } catch {}

  try {
    const localEmail = localStorage.getItem('lopu_auth_email') || localStorage.getItem('currentUserEmail');
    if (localEmail) {
      return localEmail.split('@')[0];
    }
  } catch {}

  return 'Giáo viên';
}

export const InDeFileHsView: React.FC<InDeFileHsViewProps> = ({ mode, html, docTitle, onClose }) => {
  const transformedHtml = mode === 'inde' ? transformHtmlForInDe(html) : transformHtmlForFileHS(html);
  const subTitle = 'Tài liệu..........................của ..........................................lớp.....';
  const teacherName = getTeacherName();
  const footerText = `tài liệu được biên soạn bởi ${teacherName}`;

  const handleDownloadPdf = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const titleText = docTitle || 'Tai_lieu_hoc_sinh';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${titleText}_${mode === 'inde' ? 'InDe' : 'FileHS'}</title>
          <meta charset="utf-8" />
          <style>
            @page {
              size: A4 portrait;
              margin-top: 2.2cm;
              margin-bottom: 2.2cm;
              margin-left: 2.5cm;
              margin-right: 2cm;
              @bottom-center {
                content: "${footerText}";
                font-family: 'Times New Roman', serif;
                font-size: 10pt;
                font-style: italic;
                color: #333;
              }
            }
            @page :left {
              @top-left {
                content: "Trang " counter(page);
                font-family: 'Times New Roman', serif;
                font-size: 10pt;
                color: #333;
              }
            }
            @page :right {
              @top-right {
                content: "Trang " counter(page);
                font-family: 'Times New Roman', serif;
                font-size: 10pt;
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
            .paper-header {
              text-align: center;
              border-bottom: 2px solid #000;
              padding-bottom: 12px;
              margin-bottom: 20px;
            }
            .paper-title {
              font-size: 16pt;
              font-weight: bold;
              text-transform: uppercase;
              margin: 0;
            }
            .paper-subtitle {
              font-size: 11pt;
              font-style: italic;
              margin-top: 4px;
            }
            .paper-footer-screen {
              margin-top: 40px;
              text-align: center;
              font-size: 10pt;
              font-style: italic;
              color: #555;
              border-top: 1px dashed #cbd5e1;
              padding-top: 12px;
            }
            .dotted-line {
              border-bottom: 1.5px dotted #444;
              height: 22px;
              margin-bottom: 8px;
              width: 100%;
            }
          </style>
          <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
        </head>
        <body>
          <div class="paper-header">
            <h1 class="paper-title">${docTitle}</h1>
            <p class="paper-subtitle">${subTitle}</p>
          </div>
          <div class="content-body">
            ${transformedHtml}
          </div>
          <div class="paper-footer-screen">
            ${footerText}
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 300);
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
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại</span>
          </button>
          <div className="flex items-center gap-2">
            {mode === 'inde' ? (
              <span className="px-3 py-1 rounded-xl bg-amber-100 text-amber-900 border border-amber-300 font-black text-xs flex items-center gap-1.5 shadow-2xs">
                <Printer className="w-4 h-4 text-amber-700" />
                <span>CHẾ ĐỘ IN ĐỀ (ĐÃ BỎ LỜI GIẢI &amp; ĐÁP ÁN)</span>
              </span>
            ) : (
              <span className="px-3 py-1 rounded-xl bg-emerald-100 text-emerald-900 border border-emerald-300 font-black text-xs flex items-center gap-1.5 shadow-2xs">
                <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                <span>CHẾ ĐỘ FILE HỌC SINH (THAY LỜI GIẢI BẰNG DÒNG CHẤM CHẤM)</span>
              </span>
            )}
          </div>
        </div>

        {/* Nút Tải về PDF A4 */}
        <button
          type="button"
          onClick={handleDownloadPdf}
          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer hover:scale-102"
          title="Tải về file PDF định dạng A4 với Lề trái 2.5cm, Lề phải/trên/dưới 2.0cm"
        >
          <Download className="w-4 h-4" />
          <span>Tải về PDF (Khổ A4)</span>
        </button>
      </div>

      {/* A4 Paper Sheet Preview Container */}
      <div className="flex justify-center py-4 overflow-x-auto">
        <div className="bg-white p-10 sm:p-14 rounded-2xl shadow-2xl border border-slate-300 min-h-[700px] w-full max-w-4xl text-slate-900 font-serif leading-relaxed text-base relative">
          <div className="text-center border-b-2 border-slate-900 pb-4 mb-6">
            <h2 className="text-xl font-bold uppercase tracking-wider text-slate-950">{docTitle}</h2>
            <p className="text-xs font-semibold text-slate-700 mt-1.5">
              {subTitle}
            </p>
          </div>

          <div
            className="prose max-w-none text-slate-900 font-serif leading-relaxed"
            dangerouslySetInnerHTML={{ __html: transformedHtml }}
          />

          <div className="mt-12 text-center text-xs italic text-slate-600 border-t border-dashed border-slate-300 pt-3">
            {footerText}
          </div>
        </div>
      </div>
    </div>
  );
};
