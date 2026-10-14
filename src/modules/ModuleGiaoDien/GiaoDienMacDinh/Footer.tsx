import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeftRight, Pause, Play, Shuffle } from 'lucide-react';

const TODAY_KEY = 'lopu_daily_quotes_date';
const QUOTES_KEY = 'lopu_daily_quotes';

const INITIAL_FALLBACK_QUOTES = [
  '<span>«<b>Học và suy ngẫm</b>: Học mà không suy nghĩ thì mờ tối, suy nghĩ mà không học thì nguy hại.» — <cite class="font-bold text-indigo-700 not-italic">Khổng Tử</cite></span>',
  '<span>«<b>Hành trình vạn dặm</b>: Cây cổ thụ bắt đầu từ mầm non bé nhỏ, hành trình vạn dặm khởi từ bước chân đầu tiên.» — <cite class="font-bold text-indigo-700 not-italic">Lão Tử</cite></span>',
  '<span>«<b>Kiên trì mài sắt</b>: Có công mài sắt, có ngày nên kim; kiên tâm bền chí, đá sỏi hóa vàng.» — <cite class="font-bold text-indigo-700 not-italic">Tục ngữ Việt Nam</cite></span>',
  '<span>«<b>Biển học vô bờ</b>, lấy sự chuyên cần làm bến đỗ; mây trời cao rộng, lấy chí tiến thủ làm cánh bay.» — <cite class="font-bold text-indigo-700 not-italic">Ngạn ngữ phương Đông</cite></span>',
  '<span>«<b>Tự thắng chính mình</b>: Thắng được người khác chỉ là người có sức, thắng được chính mình mới là kẻ thực sự mạnh mẽ.» — <cite class="font-bold text-indigo-700 not-italic">Lão Tử</cite></span>',
];

export const FOOTER_QUOTES: string[] = INITIAL_FALLBACK_QUOTES;

function getTodayDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function getCachedDailyQuotes(): string[] | null {
  try {
    const today = getTodayDateString();
    const savedDate = localStorage.getItem(TODAY_KEY);
    const savedQuotes = localStorage.getItem(QUOTES_KEY);
    if (savedDate === today && savedQuotes) {
      const parsed = JSON.parse(savedQuotes);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}
  return null;
}

export async function loadAndCacheDailyQuotes(count = 35): Promise<string[]> {
  const today = getTodayDateString();
  try {
    const module = await import('./footerQuotesData');
    const allQuotes = module.FOOTER_QUOTES_1000;
    if (allQuotes && allQuotes.length > 0) {
      const dateNum = parseInt(today.replace(/-/g, ''), 10) || Date.now();
      const startIdx = (dateNum * 13 + Math.floor(Math.random() * 50)) % allQuotes.length;

      const selected: string[] = [];
      for (let i = 0; i < Math.min(count, allQuotes.length); i++) {
        selected.push(allQuotes[(startIdx + i * 7) % allQuotes.length]);
      }

      localStorage.setItem(TODAY_KEY, today);
      localStorage.setItem(QUOTES_KEY, JSON.stringify(selected));
      return selected;
    }
  } catch (err) {
    console.warn('Lazy loading quotes chunk failed:', err);
  }
  return INITIAL_FALLBACK_QUOTES;
}

interface FooterProps {
  quotes?: string[];
  className?: string;
  defaultDirection?: 'ltr' | 'rtl';
}

export const Footer: React.FC<FooterProps> = ({
  quotes: customQuotes,
  className = '',
  defaultDirection = 'rtl',
}) => {
  const [direction, setDirection] = useState<'ltr' | 'rtl'>(defaultDirection);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [quotesList, setQuotesList] = useState<string[]>(() => {
    if (customQuotes && customQuotes.length > 0) return customQuotes;
    const cached = getCachedDailyQuotes();
    return cached && cached.length > 0 ? cached : INITIAL_FALLBACK_QUOTES;
  });

  useEffect(() => {
    if (customQuotes && customQuotes.length > 0) return;
    const cached = getCachedDailyQuotes();
    if (!cached || cached.length === 0) {
      loadAndCacheDailyQuotes(35).then(loaded => {
        if (loaded && loaded.length > 0) setQuotesList(loaded);
      });
    }
  }, [customQuotes]);

  const duration = Math.max(120, quotesList.length * 16);

  const handleShuffle = async () => {
    const loaded = await loadAndCacheDailyQuotes(35);
    setQuotesList(loaded);
  };

  const renderQuotesGroup = (groupId: string) => (
    <div key={groupId} className="flex items-center shrink-0">
      {quotesList.map((quoteHtml, idx) => (
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

      <div className="shrink-0 flex items-center gap-1">
        <button
          type="button"
          onClick={handleShuffle}
          className="p-1.5 rounded-lg border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 text-indigo-700 transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-semibold"
          title="Bấm để nạp 35 câu danh ngôn ngẫu nhiên mới"
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



