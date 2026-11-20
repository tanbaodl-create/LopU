/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { renderLatexInHtml } from './latexUtils';

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
      str.includes('class="slide-item"') ||
      str.includes('data-slide-index') ||
      str.includes('id="topRightCluster"')) &&
    (str.includes('<style') || str.includes('<script') || str.includes('slide') || str.includes('data-step'))
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
 * Làm sạch tệp HTML bài giảng khi đưa lên LopU:
 * 1. Bỏ các phần tử thừa khi chiếu:
 *    - Thanh điều hướng slide: ◀ Slide 1 / 15 ▶, #btnPrevSlide, #btnNextSlide, #slideIndicator, .bottom-nav-bar, .nav-pill, .slide-nav, .slide-counter...
 *    - Các ô nhập đáp số: input[placeholder*="đáp số"], input[placeholder*="câu trả lời"], input.answer-input...
 *    - Các nút kiểm tra đáp án: ✔ Kiểm tra đáp án, .btn-check-answer, .quiz-actions...
 *    - Đồng hồ đếm ngược: ⏱01:30 ▶ ↻, .timer-box, .timer-display, .timer-btn, .quiz-timer...
 *    - Huy hiệu nhập số thứ tự: .step-order-badge, .step-num-input...
 * 2. Chuẩn hóa tiêu đề lời giải:
 *    - "Lời giải TLN 1 (Đáp số: 10)" -> "Lời giải:" (hoặc "Lời giải")
 *    - "Lời giải (Chọn C)" -> "Lời giải:"
 *    - "Lời giải (Đáp số: ...)" -> "Lời giải:"
 * 3. Dựa vào phân chia slide & thứ tự hiệu ứng để đặt Mốc Slide & Mốc Hiệu ứng:
 *    - Thẻ đầu tiên của mỗi Slide được gán: data-slide-break="true" class="slide-break-point"
 *    - Các thẻ chuyển bước hiệu ứng tiếp theo (data-step="2", data-step="3"...) được gán:
 *      data-effect-break="true" data-effect-type="fade" class="effect-break-point"
 *      (các thẻ có cùng số thứ tự bước thì xuất hiện cùng lúc, chỉ thẻ đầu tiên gắn mốc)
 */
export function cleanAndStructureHtmlForWord(html: string): string {
  if (!html || typeof html !== 'string') return '<p><br></p>';

  let clean = html;
  const bodyMatch = clean.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) clean = bodyMatch[1];

  // 1. Loại bỏ các thẻ script, style, audio, canvas, meta, link
  clean = clean
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<audio\b[^<]*(?:(?!<\/audio>)<[^<]*)*<\/audio>/gi, '')
    .replace(/<canvas\b[^<]*(?:(?!<\/canvas>)<[^<]*)*<\/canvas>/gi, '')
    .replace(/<meta\b[^>]*>/gi, '')
    .replace(/<link\b[^>]*>/gi, '');

  // 2. Chuẩn hóa chuỗi văn bản lời giải trước khi xử lý DOM
  // "Lời giải TLN 1 (Đáp số: 10)" -> "Lời giải:"
  clean = clean.replace(/(?:Lời giải|Hướng dẫn(?:\s*giải)?)\s*(?:TLN|TNLC|TN|TNDS|tự luận|trắc nghiệm|câu)?\s*\d*\s*\((?:Chọn\s+[^)]+|Đáp số[^)]*|Đáp án[^)]*|Phương án[^)]*)\)\s*[:\-➔→]?/gi, 'Lời giải: ');
  clean = clean.replace(/(?:Lời giải|Hướng dẫn(?:\s*giải)?)\s+(?:TLN|TNLC|TN|TNDS)\s*\d*\s*[:\-➔→]?/gi, 'Lời giải: ');
  clean = clean.replace(/(?:Lời giải|Hướng dẫn(?:\s*giải)?)\s*\([^)]*(?:Đáp số|Đáp án)[^)]*\)\s*[:\-➔→]?/gi, 'Lời giải: ');
  clean = clean.replace(/Lời giải:\s*[:\-➔→]/gi, 'Lời giải:');

  if (typeof document !== 'undefined') {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = clean;

    // 3. Xóa các phần tử thừa khi chiếu
    // - Thanh điều hướng slide: ◀ Slide 1 / 15 ▶
    const navSelectors = [
      '.bottom-nav-bar',
      '.nav-pill',
      '.slide-nav',
      '.slide-counter',
      '.slide-controls',
      '#btnPrevSlide',
      '#btnNextSlide',
      '#slideIndicator',
      '.nav-arrow-btn'
    ];
    navSelectors.forEach(sel => {
      tempDiv.querySelectorAll(sel).forEach(el => el.remove());
    });

    // - Ô nhập đáp số
    const inputSelectors = [
      'input.answer-input',
      'input.quiz-input',
      'input[placeholder*="đáp số"]',
      'input[placeholder*="câu trả lời"]',
      'input[placeholder*="kết quả"]',
      '.fill-in-box input'
    ];
    inputSelectors.forEach(sel => {
      tempDiv.querySelectorAll(sel).forEach(el => {
        const parent = el.parentElement;
        el.remove();
        if (parent && parent.classList.contains('fill-in-box') && parent.children.length === 0) {
          parent.remove();
        }
      });
    });

    // - Nút Kiểm tra đáp án
    tempDiv.querySelectorAll('.quiz-actions, .btn-check-answer, button.check-btn').forEach(el => el.remove());
    tempDiv.querySelectorAll('button').forEach(btn => {
      const text = btn.textContent?.trim() || '';
      if (/^(?:✔\s*)?(?:Kiểm tra(?:\s*đáp án)?|Bắt đầu|Reset|Làm lại)$/i.test(text)) {
        btn.remove();
      }
    });

    // - Đồng hồ đếm ngược: ⏱01:30 ▶ ↻
    tempDiv.querySelectorAll('.timer-box, .timer-display, .timer-btn, .quiz-timer, [data-seconds]').forEach(el => el.remove());

    // - Huy hiệu nhập số thứ tự
    tempDiv.querySelectorAll('.step-order-badge, .step-num-input').forEach(el => el.remove());

    // - Bất kỳ phần tử nào còn sót chứa text kiểu "◀ Slide" hoặc "Slide 1 / 15" đơn độc
    tempDiv.querySelectorAll('div, p, span').forEach(el => {
      const t = el.textContent?.trim() || '';
      if (/^[◀❮<]\s*(?:Slide|Trang|Trước)?\s*\d*\s*[\/|\-]?\s*\d*\s*[▶❯>]?$/i.test(t) ||
          /^(?:Slide|Trang)\s*\d+\s*\/\s*\d+$/i.test(t)) {
        el.remove();
      }
    });

    // 4. Dựa vào phân chia slide, thứ tự Hiệu ứng để đặt Mốc Slide, Mốc hiệu ứng
    // Tìm các slide item: section.slide-item, .slide-item, section[data-slide-index]
    const slideElements = Array.from(tempDiv.querySelectorAll<HTMLElement>('.slide-item, section[data-slide-index], .cover-slide'));

    if (slideElements.length > 0) {
      const outputFragments: HTMLElement[] = [];

      slideElements.forEach((slideEl) => {
        // Lấy tất cả các khối con trong slide, bóc tách các container như .theory-grid để mỗi thẻ trở thành 1 khối phẳng
        const childNodes: HTMLElement[] = [];
        Array.from(slideEl.children).forEach((ch) => {
          const child = ch as HTMLElement;
          if (child.classList.contains('theory-grid') || (child.querySelectorAll('.step-node').length > 1 && !child.hasAttribute('data-step'))) {
            Array.from(child.children).forEach((subCh) => childNodes.push(subCh as HTMLElement));
          } else {
            childNodes.push(child);
          }
        });
        if (childNodes.length === 0) return;

        let hasSetSlideBreak = false;
        let lastStepVal: number | null = null;

        childNodes.forEach((child) => {
          // Bỏ qua các phần tử ẩn hoặc rỗng hoàn toàn
          if (!child.textContent?.trim() && !child.querySelector('svg, img, table, iframe')) {
            return;
          }

          // Xóa các class animation / trạng thái ẩn của chế độ web đơn lẻ
          child.classList.remove('is-visible', 'active');
          child.style.opacity = '';
          child.style.transform = '';
          child.style.pointerEvents = '';

          // 1. Khối đầu tiên của mỗi Slide -> ĐẶT MỐC SLIDE
          if (!hasSetSlideBreak) {
            child.setAttribute('data-slide-break', 'true');
            child.classList.add('slide-break-point');
            child.removeAttribute('data-effect-break');
            child.removeAttribute('data-effect-type');
            child.classList.remove('effect-break-point');
            hasSetSlideBreak = true;

            const stepAttr = child.getAttribute('data-step');
            if (stepAttr) {
              lastStepVal = parseInt(stepAttr, 10) || 1;
            }
          } else {
            // 2. Các khối tiếp theo trong Slide -> Kiểm tra để ĐẶT MỐC HIỆU ỨNG (FadeIn-Mờ dần)
            const stepAttr = child.getAttribute('data-step');
            if (stepAttr) {
              const currentStep = parseInt(stepAttr, 10) || 1;
              // Nếu bước số lớn hơn bước trước đó hoặc là bước mới (currentStep > 1 và khác lastStepVal)
              // Quy tắc: Số thứ tự bằng nhau hiện cùng 1 lúc -> chỉ gán mốc hiệu ứng cho phần tử đầu tiên của bước đó!
              if (currentStep > 1 && currentStep !== lastStepVal) {
                child.setAttribute('data-effect-break', 'true');
                child.setAttribute('data-effect-type', 'fade');
                child.classList.add('effect-break-point');
                child.removeAttribute('data-slide-break');
                child.classList.remove('slide-break-point');
                lastStepVal = currentStep;
              } else {
                // Cùng bước với phần tử trước -> Không đặt thêm mốc hiệu ứng
                child.removeAttribute('data-slide-break');
                child.removeAttribute('data-effect-break');
                child.removeAttribute('data-effect-type');
                child.classList.remove('slide-break-point', 'effect-break-point');
              }
            } else {
              // Khối không có data-step nhưng là Lời giải, Ví dụ, hoặc bài tập xuất hiện sau khối đầu
              const isSolutionOrExample = child.classList.contains('loi-giai') ||
                child.classList.contains('vi-du') ||
                child.classList.contains('cau-hoi') ||
                /^(?:Lời giải|Hướng dẫn|Ví dụ|VD)\s*[:\.]?/i.test(child.textContent?.trim() || '');

              if (isSolutionOrExample) {
                child.setAttribute('data-effect-break', 'true');
                child.setAttribute('data-effect-type', 'fade');
                child.classList.add('effect-break-point');
                child.removeAttribute('data-slide-break');
                child.classList.remove('slide-break-point');
              } else {
                child.removeAttribute('data-slide-break');
                child.removeAttribute('data-effect-break');
                child.removeAttribute('data-effect-type');
                child.classList.remove('slide-break-point', 'effect-break-point');
              }
            }
          }

          outputFragments.push(child);
        });
      });

      if (outputFragments.length > 0) {
        // Tạo container mới chứa các khối phẳng (flattened direct children) cho cửa sổ Word
        const resultContainer = document.createElement('div');
        outputFragments.forEach(node => resultContainer.appendChild(node));
        return renderLatexInHtml(resultContainer.innerHTML.trim() || '<p><br></p>');
      }
    }

    // Nếu không có cấu trúc .slide-item, thực hiện bóc tách thông minh dựa trên H1, H2, H3, v.v.
    const topChildren = Array.from(tempDiv.children) as HTMLElement[];
    topChildren.forEach((child, idx) => {
      const text = (child.textContent || '').trim();
      const tag = child.tagName.toUpperCase();

      const isSlide =
        idx === 0 ||
        tag === 'H1' ||
        tag === 'H2' ||
        tag === 'H3' ||
        child.classList.contains('lesson-template-box') ||
        /^(?:Chương|Bài|Vấn đề|Chuyên đề|Câu|Ví dụ|VD|Dạng|Dạng toán|Khái niệm|Định lý|Định nghĩa|Tính chất|Hệ quả|Phương pháp|I\.|II\.|III\.|IV\.|V\.)\s*[\d\.\:\[]/i.test(text);

      const isEffect =
        !isSlide &&
        (/^(?:Lời giải|Hướng dẫn|Hướng dẫn giải|Giải|Đáp án|Nhận xét|Bước \d|Chú ý|Kết luận|Ta có|Suy ra|•|-)\s*[:\.]?/i.test(text) ||
          child.classList.contains('word-graph-wrapper') ||
          child.classList.contains('loi-giai') ||
          child.hasAttribute('data-step') ||
          tag === 'TABLE');

      if (isSlide) {
        child.setAttribute('data-slide-break', 'true');
        child.removeAttribute('data-effect-break');
        child.removeAttribute('data-effect-type');
        child.classList.add('slide-break-point');
        child.classList.remove('effect-break-point');
      } else if (isEffect) {
        child.setAttribute('data-effect-break', 'true');
        child.setAttribute('data-effect-type', 'fade');
        child.removeAttribute('data-slide-break');
        child.classList.add('effect-break-point');
        child.classList.remove('slide-break-point');
      }
    });

    return renderLatexInHtml(tempDiv.innerHTML.trim() || '<p><br></p>');
  }

  return renderLatexInHtml(clean.trim() || '<p><br></p>');
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
    /* Khi xem trên App LopU: Tự động ẩn thanh công cụ riêng và chữ kiểu ◀ Slide 1 / 15 ▶ để tiết kiệm tối đa không gian trình chiếu */
    #topRightCluster, #drawToolbar, .draw-toolbar, #activeStrokeCanvas, #drawCanvas, .bottom-nav-bar, #btnPrevSlide, #btnNextSlide, #slideIndicator, .slide-counter, .nav-arrow-btn, .slide-nav {
      display: none !important;
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
