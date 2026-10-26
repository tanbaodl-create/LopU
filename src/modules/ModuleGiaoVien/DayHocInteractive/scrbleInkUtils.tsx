import React, { useRef, useEffect, useMemo } from 'react';

export type PenType = 'pen' | 'pencil' | 'calligraphy' | 'highlighter_round' | 'highlighter_chisel';

export interface DrawStroke {
  id: string;
  points: Array<{ x: number; y: number }>;
  color: string;
  width: number;
  penType?: PenType;
}

// Bảng 30 màu Scrble Ink chuẩn mực 100% theo ảnh đính kèm
export const SCRBLE_COLORS: string[] = [
  // Hàng 1: Thang xám & trắng đen
  '#000000', '#ffffff', '#cccccc', '#999999', '#666666', '#444444',
  // Hàng 2: Đỏ dâu, đỏ tươi, cam, vàng hổ phách, vàng tươi
  '#a8005b', '#ff0000', '#ff5500', '#ff9900', '#ffbb00', '#ffea00',
  // Hàng 3: Xanh nõn chuối, xanh lá, xanh rừng, xanh ngọc biển, xanh điện, xanh hoàng gia
  '#99e600', '#00e600', '#008855', '#00b4d8', '#0055ff', '#3300cc',
  // Hàng 4: Tím thẫm, tím than, màu da đào, nâu nhạt, nâu đất, nâu đen sô-cô-la
  '#6600cc', '#4a0072', '#fbd7c0', '#b38b5e', '#8a5229', '#4a2d1d',
  // Hàng 5: Hồng phấn, cam pastel, vàng neon, xanh neon, xanh aqua, cầu vồng/tùy chọn
  '#ff80df', '#ffc080', '#ffff00', '#33ff55', '#33e6ff', 'rainbow',
];

/**
 * Thuật toán vẽ nét bút sắc sảo như ứng dụng Scrble Ink
 * - Calligraphy Pen: Đầu ngòi mài dẹt nghiêng 45 độ, nét thanh khi đi chéo, nét đậm khi đi vuông góc
 * - Highlighter Chisel: Ngòi vát phẳng 65 độ trong suốt
 * - Highlighter Round: Đầu tròn trong suốt
 * - Pencil: Nét mảnh nhám chì
 * - Pen: Bút bi trơn mịn
 */
export function drawSingleStroke(
  ctx: CanvasRenderingContext2D,
  stroke: DrawStroke
) {
  if (!stroke.points || stroke.points.length === 0) return;
  const penType: PenType = stroke.penType || 'calligraphy';
  const color = stroke.color;
  const width = stroke.width || 3;

  ctx.save();

  if (penType === 'calligraphy') {
    // NGÒI BÚT MÀI CALLIGRAPHY: Ngòi vát nghiêng 45 độ, nét liền mạch, sắc nét chuẩn mực kỹ thuật số
    const angleRad = Math.PI / 4;
    const R = Math.max(2.5, width * 1.35);
    const ux = Math.cos(angleRad) * R;
    const uy = Math.sin(angleRad) * R;

    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (stroke.points.length === 1) {
      const p = stroke.points[0];
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, R, Math.max(1, R * 0.3), angleRad, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    // Vẽ các khối đa giác ribbon liền mạch giữa mọi cặp điểm kế tiếp (không bao giờ bị răng cưa hay đứt đoạn)
    for (let i = 0; i < stroke.points.length - 1; i++) {
      const p1 = stroke.points[i];
      const p2 = stroke.points[i + 1];

      const t1x = p1.x - ux;
      const t1y = p1.y - uy;
      const b1x = p1.x + ux;
      const b1y = p1.y + uy;

      const t2x = p2.x - ux;
      const t2y = p2.y - uy;
      const b2x = p2.x + ux;
      const b2y = p2.y + uy;

      ctx.beginPath();
      ctx.moveTo(t1x, t1y);
      ctx.lineTo(t2x, t2y);
      ctx.lineTo(b2x, b2y);
      ctx.lineTo(b1x, b1y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // Bo tròn nắp 2 đầu nét vẽ
    const pStart = stroke.points[0];
    const pEnd = stroke.points[stroke.points.length - 1];
    ctx.beginPath();
    ctx.ellipse(pStart.x, pStart.y, R, Math.max(1, R * 0.3), angleRad, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(pEnd.x, pEnd.y, R, Math.max(1, R * 0.3), angleRad, 0, Math.PI * 2);
    ctx.fill();
  } else if (penType === 'highlighter_chisel') {
    // BÚT DẠ QUANG NGÒI VÁT (CHISEL TIP): Nghiêng 65 độ, dải màu trong suốt đồng nhất
    ctx.globalAlpha = 0.52;
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.lineCap = 'square';
    ctx.lineJoin = 'miter';

    const angleRad = (65 * Math.PI) / 180;
    const R = Math.max(7, width * 2.6);
    const ux = Math.cos(angleRad) * R;
    const uy = Math.sin(angleRad) * R;

    if (stroke.points.length === 1) {
      const p = stroke.points[0];
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, R, Math.max(2, R * 0.3), angleRad, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    for (let i = 0; i < stroke.points.length - 1; i++) {
      const p1 = stroke.points[i];
      const p2 = stroke.points[i + 1];

      ctx.beginPath();
      ctx.moveTo(p1.x - ux, p1.y - uy);
      ctx.lineTo(p2.x - ux, p2.y - uy);
      ctx.lineTo(p2.x + ux, p2.y + uy);
      ctx.lineTo(p1.x + ux, p1.y + uy);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  } else if (penType === 'highlighter_round') {
    // BÚT DẠ QUANG NGÒI TRÒN: Trong suốt, làm mịn đường cong Bézier
    ctx.globalAlpha = 0.52;
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(10, width * 2.8);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (stroke.points.length === 1) {
      const p = stroke.points[0];
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(5, width * 1.4), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
    for (let i = 1; i < stroke.points.length - 1; i++) {
      const midX = (stroke.points[i].x + stroke.points[i + 1].x) / 2;
      const midY = (stroke.points[i].y + stroke.points[i + 1].y) / 2;
      ctx.quadraticCurveTo(stroke.points[i].x, stroke.points[i].y, midX, midY);
    }
    ctx.lineTo(stroke.points[stroke.points.length - 1].x, stroke.points[stroke.points.length - 1].y);
    ctx.stroke();
  } else if (penType === 'pencil') {
    // BÚT CHÌ: Nét mảnh nhạt thanh lịch
    ctx.globalAlpha = 0.88;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = Math.max(1.5, width * 0.85);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (stroke.points.length === 1) {
      const p = stroke.points[0];
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(1, width * 0.4), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
    for (let i = 1; i < stroke.points.length - 1; i++) {
      const midX = (stroke.points[i].x + stroke.points[i + 1].x) / 2;
      const midY = (stroke.points[i].y + stroke.points[i + 1].y) / 2;
      ctx.quadraticCurveTo(stroke.points[i].x, stroke.points[i].y, midX, midY);
    }
    ctx.lineTo(stroke.points[stroke.points.length - 1].x, stroke.points[stroke.points.length - 1].y);
    ctx.stroke();
  } else {
    // BÚT BI KỸ THUẬT SỐ (PEN): Trơn mịn, liền mạch và sắc nét bằng Quadratic Bézier
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = Math.max(2, width);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (stroke.points.length === 1) {
      const p = stroke.points[0];
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(1.5, width / 2), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
    for (let i = 1; i < stroke.points.length - 1; i++) {
      const midX = (stroke.points[i].x + stroke.points[i + 1].x) / 2;
      const midY = (stroke.points[i].y + stroke.points[i + 1].y) / 2;
      ctx.quadraticCurveTo(stroke.points[i].x, stroke.points[i].y, midX, midY);
    }
    ctx.lineTo(stroke.points[stroke.points.length - 1].x, stroke.points[stroke.points.length - 1].y);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * 5 Biểu tượng loại ngòi bút chuẩn xác theo hình chụp Scrble Ink:
 * 1. Ballpoint Pen
 * 2. Pencil
 * 3. Calligraphy Pen (Fountain nib)
 * 4. Highlighter Round
 * 5. Highlighter Chisel
 */
export const PenIcons: Record<PenType, React.FC<{ className?: string; isSelected?: boolean }>> = {
  pen: ({ className = 'w-5 h-5', isSelected = false }) => (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      {/* Ngòi bút bi hình nón */}
      <path d="M7 4 L17 4 L15 13 L12 21 L9 13 Z" strokeLinejoin="round" />
      <circle cx="12" cy="21" r="1.3" fill="currentColor" />
    </svg>
  ),
  pencil: ({ className = 'w-5 h-5', isSelected = false }) => (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      {/* Thân bút chì vát gãy khúc và ngòi nhọn */}
      <path d="M7 4 L17 4 L14.5 13 L12 21 L9.5 13 Z" strokeLinejoin="round" />
      <path d="M10 14 L14 14" strokeWidth="1.2" />
      <polygon points="12,21 11,17 13,17" fill="currentColor" />
    </svg>
  ),
  calligraphy: ({ className = 'w-5 h-5', isSelected = false }) => (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      {/* Ngòi bút máy mài Calligraphy có khe mực chẻ đôi */}
      <path d="M7 4 L17 4 L16 11 L12 21 L8 11 Z" strokeLinejoin="round" />
      <line x1="12" y1="12" x2="12" y2="20" strokeWidth="1.4" />
      <circle cx="12" cy="11.5" r="1.4" fill="currentColor" />
    </svg>
  ),
  highlighter_round: ({ className = 'w-5 h-5', isSelected = false }) => (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      {/* Ngòi dạ quang đầu vòm tròn */}
      <path d="M6 4 L18 4 L16 12 L15 17.5 C15 19.5 13.5 20.5 12 20.5 C10.5 20.5 9 19.5 9 17.5 L8 12 Z" strokeLinejoin="round" />
      <line x1="9" y1="12" x2="15" y2="12" strokeWidth="1.2" />
    </svg>
  ),
  highlighter_chisel: ({ className = 'w-5 h-5', isSelected = false }) => (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      {/* Ngòi dạ quang vát xéo hình thang Chisel */}
      <path d="M6 4 L18 4 L16 12 L16.5 16.5 L9 19.5 L8 12 Z" strokeLinejoin="round" />
      <line x1="8.5" y1="12" x2="15.5" y2="12" strokeWidth="1.2" />
      <line x1="9" y1="19.5" x2="16.5" y2="16.5" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  ),
};

export type BoardStyle = 'green_grid' | 'white_grid' | 'black_grid' | 'notebook' | 'plain';

export interface ScrblePenMenuProps {
  penType: PenType;
  onChangePenType: (type: PenType) => void;
  penColor: string;
  onChangePenColor: (color: string) => void;
  penWidth: number;
  onChangePenWidth: (width: number) => void;
  boardStyle?: BoardStyle;
  onClose?: () => void;
}

/**
 * Menu Chọn Bút & Màu & Cỡ Nét Thiết Kế 100% Theo Mẫu Ảnh Scrble Ink
 */
export const ScrblePenMenu: React.FC<ScrblePenMenuProps> = ({
  penType,
  onChangePenType,
  penColor,
  onChangePenColor,
  penWidth,
  onChangePenWidth,
  boardStyle = 'green_grid',
  onClose,
}) => {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Tự động đóng menu chọn bút khi kích ra ngoài
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose?.();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [onClose]);

  // Bảng 6 màu mẫu mực chuẩn phù hợp nhất với từng loại kiểu bảng đang chọn
  const boardColors = useMemo(() => {
    if (boardStyle === 'green_grid') {
      // 6 màu phấn dịu mắt viết lên bảng xanh
      return [
        '#ffffff', // Phấn trắng
        '#fef08a', // Phấn vàng
        '#ffedd5', // Phấn cam
        '#fce7f3', // Phấn hồng
        '#cff4fc', // Phấn xanh lơ
        '#d1fae5', // Phấn xanh lá
      ];
    }
    if (boardStyle === 'black_grid' || boardStyle === 'plain') {
      // 6 màu dạ quang/phấn rực rỡ trên bảng đen
      return [
        '#ffffff', // Trắng sáng
        '#facc15', // Vàng neon
        '#38bdf8', // Xanh cyan
        '#f43f5e', // Hồng neon
        '#4ade80', // Xanh lá
        '#fb923c', // Cam
      ];
    }
    // Bảng trắng (white_grid) hoặc Giấy tập học sinh (notebook)
    return [
      '#4a0072', // Tím thẫm (màu mặc định mực Scrble Ink)
      '#1e3a8a', // Xanh đen / Xanh dương
      '#dc2626', // Đỏ
      '#0f172a', // Đen
      '#15803d', // Xanh lá
      '#c2410c', // Cam
    ];
  }, [boardStyle]);

  // Vẽ nét sóng xem trước (Preview Wave) bằng chính thuật toán ngòi bút đang chọn
  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Tạo các điểm sóng lượn sine wave mềm mại
    const points: Array<{ x: number; y: number }> = [];
    const w = canvas.width;
    const h = canvas.height;
    const startX = 6;
    const endX = w - 6;

    for (let x = startX; x <= endX; x += 3) {
      const t = (x - startX) / (endX - startX);
      const angle = t * Math.PI * 2;
      const y = h / 2 - Math.sin(angle) * (h * 0.32);
      points.push({ x, y });
    }

    drawSingleStroke(ctx, {
      id: 'preview_wave',
      points,
      color: penColor === '#ffffff' && (boardStyle === 'white_grid' || boardStyle === 'notebook') ? '#1e293b' : penColor,
      width: penWidth,
      penType,
    });
  }, [penType, penColor, penWidth, boardStyle]);

  return (
    <div
      ref={menuRef}
      onClick={(e) => e.stopPropagation()}
      className="w-[290px] sm:w-[310px] bg-[#eeeeee] text-[#111827] rounded-3xl p-4.5 shadow-2xl border border-slate-300 font-sans select-none animate-fade-in"
      style={{
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(0, 0, 0, 0.08)',
      }}
    >
      {/* PHẦN 1: BÚT (CHỌN TRONG CÁC KIỂU BÚT, BỎ BÚT CHÌ) */}
      <div className="mb-3.5">
        <div className="text-[13px] font-bold tracking-wider text-black uppercase mb-2 font-sans flex items-center justify-between">
          <span>NGÒI BÚT</span>
          <span className="text-[11px] text-slate-500 font-normal lowercase">
            {penType === 'calligraphy'
              ? 'Bút mài nét thanh đậm'
              : penType === 'pen'
              ? 'Bút bi kỹ thuật số'
              : penType === 'highlighter_round'
              ? 'Bút nhớ đầu tròn'
              : 'Bút nhớ đầu vát'}
          </span>
        </div>
        <div className="flex items-center justify-around px-1 py-0.5 bg-slate-200/60 rounded-2xl">
          {(['pen', 'calligraphy', 'highlighter_round', 'highlighter_chisel'] as PenType[]).map((type) => {
            const isSelected = penType === type;
            const Icon = PenIcons[type];
            return (
              <button
                key={type}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChangePenType(type);
                }}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer relative ${
                  isSelected
                    ? 'bg-[#0066cc] text-white shadow-md scale-105 ring-2 ring-[#0066cc]/40'
                    : 'text-slate-800 hover:bg-slate-300/80 hover:scale-105'
                }`}
                title={
                  type === 'calligraphy'
                    ? 'Calligraphy Pen (Bút mài nét thanh nét đậm)'
                    : type === 'pen'
                    ? 'Ballpoint Pen (Bút bi kỹ thuật số trơn sắc nét)'
                    : type === 'highlighter_round'
                    ? 'Highlighter 1 (Bút nhớ đầu tròn)'
                    : 'Highlighter 2 (Bút nhớ đầu vát Chisel)'
                }
              >
                <Icon className="w-5 h-5" isSelected={isSelected} />
              </button>
            );
          })}
        </div>
      </div>

      {/* PHẦN 2: BẢNG 6 MÀU MẪU MỰC CHUẨN VỚI KIỂU BẢNG & 1 NÚT CHỌN MÀU TỰ DO */}
      <div className="mb-3.5">
        <div className="text-[13px] font-bold tracking-wider text-black uppercase mb-2 font-sans flex items-center justify-between">
          <span>MÀU MỰC ({boardStyle === 'green_grid' ? 'BẢNG XANH' : boardStyle === 'black_grid' || boardStyle === 'plain' ? 'BẢNG ĐEN' : 'BẢNG TRẮNG'})</span>
        </div>
        <div className="flex items-center justify-between gap-1.5 px-0.5">
          {/* 6 Màu mực mẫu phù hợp kiểu bảng */}
          {boardColors.map((color: string, idx: number) => {
            const isSelected = penColor.toLowerCase() === color.toLowerCase();
            return (
              <button
                key={`${color}_${idx}`}
                type="button"
                onClick={() => onChangePenColor(color)}
                style={{ backgroundColor: color }}
                className={`w-7 sm:w-8 h-7 sm:h-8 rounded-full transition-transform cursor-pointer shadow-xs hover:scale-110 active:scale-95 relative ${
                  color === '#ffffff' ? 'border border-slate-400' : ''
                } ${
                  isSelected
                    ? 'scale-110 ring-2 ring-black ring-offset-2 ring-offset-[#eeeeee]'
                    : ''
                }`}
                title={`Màu mực ${color}`}
              />
            );
          })}

          {/* 1 Nút Chọn Màu Tự Do (Hộp màu tùy chỉnh) */}
          <div className="relative shrink-0">
            <label
              title="Chọn màu tự do (Mở bảng chọn màu tùy thích)"
              className="w-7 sm:w-8 h-7 sm:h-8 rounded-full flex items-center justify-center cursor-pointer shadow-xs hover:scale-110 active:scale-95 transition-transform border border-slate-300 overflow-hidden"
              style={{
                background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)',
              }}
            >
              <input
                type="color"
                value={penColor}
                onChange={(e) => onChangePenColor(e.target.value)}
                className="opacity-0 cursor-pointer w-full h-full"
              />
            </label>
          </div>
        </div>
      </div>

      {/* PHẦN 3: KÍCH THƯỚC NGÒI BÚT (0.5px ĐẾN 24px) */}
      <div>
        <div className="text-[13px] font-bold tracking-wider text-black uppercase mb-1 font-sans flex items-center justify-between">
          <span>ĐỘ DÀY NGÒI BÚT</span>
          <span className="font-extrabold text-[#0066cc] font-mono text-xs">{penWidth}px</span>
        </div>

        {/* Khung vẽ đường sóng xem trước nét bút */}
        <div className="w-full h-12 flex items-center justify-center bg-white/60 rounded-xl my-1.5 border border-slate-300/80">
          <canvas
            ref={previewCanvasRef}
            width={260}
            height={48}
            className="w-full h-full object-contain"
          />
        </div>

        {/* Thanh trượt Range Slider chọn độ dày từ 0.5px đến 24px */}
        <div className="px-1 relative flex items-center pt-2">
          <input
            type="range"
            min="0.5"
            max="24"
            step="0.5"
            value={penWidth}
            onChange={(e) => onChangePenWidth(Number(e.target.value))}
            className="w-full h-1.5 bg-[#9ca3af] rounded-lg appearance-none cursor-pointer accent-[#0066cc]"
          />
        </div>
        <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono mt-1 px-1">
          <span>0.5px (Mảnh)</span>
          <span>24px (Đậm)</span>
        </div>
      </div>
    </div>
  );
};
