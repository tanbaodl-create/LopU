import React, { useState, useMemo } from 'react';
import { ArrowLeftRight, Pause, Play, Shuffle } from 'lucide-react';
import { FOOTER_QUOTES_1000 } from './footerQuotesData';

/**
 * DANH SÁCH 1000 CÂU DANH NGÔN ĐỘNG VIÊN HỌC TẬP & Ý CHÍ KIÊN TRÌ
 * - Toàn bộ 1000 câu được định nghĩa tại file footerQuotesData.ts (mỗi câu 1 dòng duy nhất).
 * - Hỗ trợ đầy đủ mã HTML (<b>, <i>, <span class="...">, <cite>, v.v.) để định dạng chữ.
 * - Đã bỏ hoàn toàn các chữ "Buổi sáng/buổi trưa/..." đầu dòng.
 * - Đầy đủ trích dẫn tác giả / nguồn gốc của câu nói ở cuối câu.
 */
export { FOOTER_QUOTES_1000 };
export const FOOTER_QUOTES: string[] = FOOTER_QUOTES_1000;

interface FooterProps {
  quotes?: string[];
  className?: string;
  defaultDirection?: 'ltr' | 'rtl';
}

export const Footer: React.FC<FooterProps> = ({
  quotes = FOOTER_QUOTES_1000,
  className = '',
  defaultDirection = 'rtl',
}) => {
  // Hướng chạy: mặc định 'rtl' (từ phải qua trái) theo yêu cầu người dùng
  const [direction, setDirection] = useState<'ltr' | 'rtl'>(defaultDirection);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [batchIndex, setBatchIndex] = useState<number>(0);

  // Lấy nhóm 50 câu danh ngôn từ kho 1000 câu để trình duyệt render siêu mượt mà 60fps
  const displayQuotes = useMemo(() => {
    const batchSize = 50;
    const start = (batchIndex * batchSize) % quotes.length;
    const slice = quotes.slice(start, start + batchSize);
    return slice.length > 0 ? slice : quotes.slice(0, 50);
  }, [quotes, batchIndex]);

  // Thời gian chạy được kéo dài (~16 giây mỗi câu) để chữ di chuyển chậm rãi, êm ái, dễ đọc
  const duration = Math.max(120, displayQuotes.length * 16);

  const handleShuffle = () => {
    setBatchIndex(prev => prev + 1);
  };

  const renderQuotesGroup = (groupId: string) => (
    <div key={groupId} className="flex items-center shrink-0">
      {displayQuotes.map((quoteHtml, idx) => (
        <span key={`${groupId}-${idx}`} className="inline-flex items-center">
          <span
            dangerouslySetInnerHTML={{ __html: quoteHtml }}
            className="inline-block text-xs font-medium text-slate-800 tracking-wide"
          />
          <span className="mx-6 text-indigo-400 select-none font-bold text-sm">✦</span>
        </span>
      ))}
    </div>
  );

  return (
    <footer
      id="app-footer"
      className={`sticky bottom-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 py-2 px-3 sm:px-4 select-none shadow-xs flex items-center gap-3 transition-colors ${className}`}
    >
      {/* Dải chữ chạy liên tục tuần hoàn không độ trễ, hiện ngay lập tức */}
      <div className="flex-1 overflow-hidden relative">
        <div
          className={`flex w-max ${
            direction === 'ltr' ? 'animate-marquee-ltr' : 'animate-marquee-rtl'
          }`}
          style={{
            animationDuration: `${duration}s`,
            animationPlayState: isPaused ? 'paused' : 'running',
          }}
        >
          {renderQuotesGroup('set-1')}
          {renderQuotesGroup('set-2')}
        </div>
      </div>

      {/* Các nút điều khiển tiện ích: Đổi câu khác trong 1000 câu, Đổi hướng chạy & Tạm dừng/Tiếp tục */}
      <div className="shrink-0 flex items-center gap-1">
        <button
          type="button"
          onClick={handleShuffle}
          className="p-1.5 rounded-lg border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 text-indigo-700 transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-semibold"
          title="Bấm để đổi 50 câu ngẫu nhiên mới từ kho 1000 câu danh ngôn"
        >
          <Shuffle className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Đổi câu khác</span>
        </button>
        <button
          type="button"
          onClick={() => setDirection(prev => (prev === 'ltr' ? 'rtl' : 'ltr'))}
          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer"
          title={direction === 'ltr' ? 'Đang chạy từ Trái qua Phải — Bấm để đổi hướng' : 'Đang chạy từ Phải qua Trái — Bấm để đổi hướng'}
        >
          <ArrowLeftRight className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setIsPaused(prev => !prev)}
          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer"
          title={isPaused ? 'Tiếp tục chạy' : 'Tạm dừng chạy'}
        >
          {isPaused ? <Play className="w-3.5 h-3.5 text-emerald-600" /> : <Pause className="w-3.5 h-3.5" />}
        </button>
      </div>
    </footer>
  );
};



