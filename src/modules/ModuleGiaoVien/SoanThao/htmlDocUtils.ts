/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Kiểm tra xem một chuỗi nội dung có phải là tệp tài liệu HTML hoàn chỉnh hoặc tệp bài giảng E-Learning hay không
 */
export function isFullHtmlDocument(content: string | null | undefined): boolean {
  if (!content || typeof content !== 'string') return false;
  const str = content.trim();
  if (!str) return false;

  // 1. Dấu hiệu tiêu chuẩn của tài liệu HTML hoàn chỉnh
  if (/<!doctype\s+html/i.test(str)) return true;
  if (/<html[\s>]/i.test(str) && /<\/html>/i.test(str)) return true;
  if (/<head[\s>]/i.test(str) && /<body[\s>]/i.test(str)) return true;

  // 2. Tệp bài giảng trình chiếu HTML hoặc E-learning chuyên dụng
  if (
    (str.includes('class="viewport-wrapper"') ||
      str.includes('id="slideCard"') ||
      str.includes('class="slide-card"') ||
      str.includes('class="nav-pill"') ||
      str.includes('id="topRightCluster"')) &&
    (str.includes('<style') || str.includes('<script') || str.includes('slide'))
  ) {
    return true;
  }

  // 3. Tệp chứa cả thẻ <style> và <script> cấu trúc bài giảng
  if (str.includes('<style') && str.includes('<script') && str.length > 500) {
    return true;
  }

  return false;
}

/**
 * Chuẩn bị mã nguồn HTML để hiển thị trọn vẹn và hoàn mỹ trong iframe cửa sổ Word (chuẩn trình duyệt)
 */
export function prepareHtmlForWordViewer(html: string): string {
  if (!html || typeof html !== 'string') return '';

  const responsiveStyle = `
  <style id="lopu-word-viewport-fit">
    /* Tự động tối ưu bố cục và co dãn vừa khít khung cửa sổ Word */
    @media (max-width: 1100px) {
      .viewport-wrapper {
        padding: 16px 12px 76px 12px !important;
        min-width: 100% !important;
        justify-content: center !important;
      }
      .slide-card {
        width: 100% !important;
        max-width: calc(100vw - 24px) !important;
        min-width: unset !important;
        padding: 24px 20px 20px 20px !important;
      }
    }
  </style>
  `;

  let prepared = html;

  // Nếu chưa có thẻ meta viewport, thêm vào
  if (!prepared.includes('name="viewport"')) {
    const metaViewport = `<meta name="viewport" content="width=device-width, initial-scale=1.0" />\n`;
    if (prepared.includes('<head>')) {
      prepared = prepared.replace('<head>', `<head>\n  ${metaViewport}`);
    } else if (prepared.includes('<head ')) {
      prepared = prepared.replace(/(<head[^>]*>)/i, `$1\n  ${metaViewport}`);
    }
  }

  // Chèn CSS responsive tự động fit vào trước thẻ đóng </head>
  if (prepared.includes('</head>')) {
    prepared = prepared.replace('</head>', `${responsiveStyle}\n</head>`);
  } else if (prepared.includes('<body')) {
    prepared = prepared.replace(/(<body[^>]*>)/i, `${responsiveStyle}\n$1`);
  } else {
    prepared = responsiveStyle + prepared;
  }

  return prepared;
}
