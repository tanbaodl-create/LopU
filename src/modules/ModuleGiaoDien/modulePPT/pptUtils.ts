import { PptSlideItem } from './types';

/**
 * Xóa bỏ các class/attribute đánh dấu của editor khi xuất ra nội dung trình chiếu PPT
 */
export const getCleanOuterHtml = (targetEl: HTMLElement): string => {
  const clone = targetEl.cloneNode(true) as HTMLElement;
  clone.classList.remove('slide-break-point', 'effect-break-point');
  clone.removeAttribute('data-slide-break');
  clone.removeAttribute('data-effect-break');
  return clone.outerHTML;
};

/**
 * Hàm bóc tách nội dung tài liệu Word thành các Slide & Bước Hiệu Ứng trình chiếu PPT độc lập
 */
export const parseDocumentToSlides = (html: string, docTitle?: string): PptSlideItem[] => {
  const cleanHtml = (html || '').trim();
  if (!cleanHtml || cleanHtml === '<p><br></p>' || cleanHtml === '<br>') {
    return [
      {
        id: 'slide-empty',
        title: docTitle || 'Tiêu đề Tài liệu',
        steps: [
          `<div class="text-center py-10 space-y-4">
            <div class="w-16 h-16 mx-auto rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-3xl font-bold shadow-inner border border-indigo-500/30">
              📚
            </div>
            <h3 class="text-2xl font-black text-slate-100">${docTitle || 'Tài liệu Chuyên đề'}</h3>
            <p class="text-slate-300 text-sm max-w-lg mx-auto leading-relaxed">
              Văn bản hiện đang để trống. Vui lòng bấm nút <strong>"Thoát PPT"</strong> để nhập nội dung lý thuyết, bài giảng hoặc câu hỏi!
            </p>
          </div>`,
        ],
        contentHtml: `<div class="text-center py-10 text-slate-400">Trống</div>`,
      },
    ];
  }

  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = cleanHtml;
  const children = Array.from(tempDiv.children) as HTMLElement[];

  if (children.length === 0) {
    return [
      {
        id: 'slide-single',
        title: docTitle || 'Nội dung Bài học',
        steps: [cleanHtml],
        contentHtml: cleanHtml,
      },
    ];
  }

  // Kiểm tra có mốc Slide thủ công nào không
  const hasManualSlideBreaks = children.some(el =>
    el.getAttribute('data-slide-break') === 'true' ||
    el.classList.contains('slide-break-point') ||
    el.classList.contains('slide-break')
  );

  const rawSlides: HTMLElement[][] = [];
  let currentSlideElements: HTMLElement[] = [];

  for (let i = 0; i < children.length; i++) {
    const el = children[i];
    let isSlideStart = false;

    if (hasManualSlideBreaks) {
      isSlideStart =
        i > 0 && (
          el.getAttribute('data-slide-break') === 'true' ||
          el.classList.contains('slide-break-point') ||
          el.classList.contains('slide-break') ||
          el.tagName === 'HR'
        );
    } else {
      isSlideStart =
        i > 0 && (
          el.classList.contains('lesson-template-box') ||
          el.tagName === 'H1' ||
          el.tagName === 'H2' ||
          el.classList.contains('word-bbt-wrapper') ||
          (el.tagName === 'P' && /^(?:Câu|Bài|Ví dụ)\s+\d+[:\.]/i.test(el.textContent || ''))
        );
    }

    if (isSlideStart && currentSlideElements.length > 0) {
      rawSlides.push(currentSlideElements);
      currentSlideElements = [];
    }
    currentSlideElements.push(el);
  }
  if (currentSlideElements.length > 0) {
    rawSlides.push(currentSlideElements);
  }

  if (rawSlides.length === 0) {
    rawSlides.push(children);
  }

  // Bóc tách từng Slide thành các Bước Hiệu Ứng (Animation Steps)
  return rawSlides.map((slideEls, sIdx) => {
    let slideTitle = `Slide ${sIdx + 1}`;
    for (const el of slideEls) {
      const text = (el.textContent || '').trim();
      if (text && text.length > 2 && text.length < 80) {
        slideTitle = text.slice(0, 50);
        break;
      }
    }

    const steps: string[] = [];
    let currentStepBuffer: string[] = [];

    for (let k = 0; k < slideEls.length; k++) {
      const el = slideEls[k];
      const isEffectBreak =
        k > 0 && (
          el.getAttribute('data-effect-break') === 'true' ||
          el.classList.contains('effect-break-point')
        );

      if (isEffectBreak && currentStepBuffer.length > 0) {
        steps.push(currentStepBuffer.join(''));
        currentStepBuffer = [];
      }
      currentStepBuffer.push(getCleanOuterHtml(el));
    }
    if (currentStepBuffer.length > 0) {
      steps.push(currentStepBuffer.join(''));
    }

    if (steps.length === 0) {
      steps.push(slideEls.map(e => getCleanOuterHtml(e)).join(''));
    }

    return {
      id: `slide-${sIdx + 1}`,
      title: slideTitle,
      steps,
      contentHtml: slideEls.map(e => getCleanOuterHtml(e)).join(''),
    };
  });
};
