export type PptEffectType =
  | 'fade'
  | 'slide-up'
  | 'slide-down'
  | 'slide-left'
  | 'slide-right'
  | 'zoom'
  | 'bounce'
  | 'wipe'
  | 'flip'
  | 'glow'
  | 'highlight';

export interface PptEffectOption {
  id: PptEffectType;
  label: string;
  nameVi: string;
  desc: string;
  icon: string;
  cssClass: string;
}

export const PPT_EFFECT_LIST: PptEffectOption[] = [
  {
    id: 'fade',
    label: 'Mờ dần vào',
    nameVi: 'Mờ dần (Fade In)',
    desc: 'Xuất hiện nhẹ nhàng thanh lịch',
    icon: '🌫️',
    cssClass: 'ppt-anim-fade',
  },
  {
    id: 'slide-up',
    label: 'Trượt từ dưới lên',
    nameVi: 'Bay lên (Fly Up)',
    desc: 'Bay từ phía dưới lên vị trí chuẩn',
    icon: '⬆️',
    cssClass: 'ppt-anim-slide-up',
  },
  {
    id: 'slide-down',
    label: 'Rơi từ trên xuống',
    nameVi: 'Rơi xuống (Fly Down)',
    desc: 'Rơi từ trên xuống vị trí chuẩn',
    icon: '⬇️',
    cssClass: 'ppt-anim-slide-down',
  },
  {
    id: 'slide-left',
    label: 'Trượt từ trái sang',
    nameVi: 'Trượt từ trái (Slide Left)',
    desc: 'Lướt từ bên trái sang phải',
    icon: '➡️',
    cssClass: 'ppt-anim-slide-left',
  },
  {
    id: 'slide-right',
    label: 'Trượt từ phải sang',
    nameVi: 'Trượt từ phải (Slide Right)',
    desc: 'Lướt từ bên phải sang trái',
    icon: '⬅️',
    cssClass: 'ppt-anim-slide-right',
  },
  {
    id: 'zoom',
    label: 'Thu phóng nổi bật',
    nameVi: 'Phóng to (Zoom In)',
    desc: 'Phóng đại từ tâm ra kích thước chuẩn',
    icon: '🔍',
    cssClass: 'ppt-anim-zoom',
  },
  {
    id: 'bounce',
    label: 'Bật nảy sinh động',
    nameVi: 'Bật nảy (Bounce Pop)',
    desc: 'Nảy tạo cảm giác vui mắt, điểm nhấn',
    icon: '🎾',
    cssClass: 'ppt-anim-bounce',
  },
  {
    id: 'wipe',
    label: 'Quét / Lau ngang',
    nameVi: 'Quét ngang (Wipe Reveal)',
    desc: 'Mở màn từ từ từ trái sang phải',
    icon: '🪄',
    cssClass: 'ppt-anim-wipe',
  },
  {
    id: 'flip',
    label: 'Lật thẻ 3D',
    nameVi: 'Lật 3D (Flip Down)',
    desc: 'Xoay lật 3D từ trên lật xuống',
    icon: '🃏',
    cssClass: 'ppt-anim-flip',
  },
  {
    id: 'glow',
    label: 'Phát sáng hào quang',
    nameVi: 'Hào quang (Glow Focus)',
    desc: 'Tỏa sáng chớp hào quang gây chú ý',
    icon: '💡',
    cssClass: 'ppt-anim-glow',
  },
];

export const getPptEffectDef = (type?: string): PptEffectOption => {
  if (!type) return PPT_EFFECT_LIST[0];
  const found = PPT_EFFECT_LIST.find((e) => e.id === type);
  if (found) return found;
  if (type === 'highlight') return PPT_EFFECT_LIST[9]; // Map legacy highlight to glow
  return PPT_EFFECT_LIST[0];
};

export interface PptSlideStepItem {
  html: string;
  effectType: PptEffectType;
}

export interface PptSlideItem {
  id: string;
  title: string;
  steps: string[];
  stepItems?: PptSlideStepItem[];
  contentHtml: string;
}

export interface RailMarker {
  id: string;
  type: 'slide' | 'effect';
  effectType?: PptEffectType;
  elementIndex: number;
  topOffset: number;
  slideNumber: number;
  stepNumber?: number;
  snippet: string;
}

export interface PptRailClickMenuData {
  elementIndex: number;
  x: number;
  y: number;
  isSlide: boolean;
  isEffect: boolean;
  effectType?: PptEffectType;
  snippet: string;
}

export interface RailLineItem {
  elementIndex: number;
  topOffset: number;
  snippet: string;
  hasSlideMarker: boolean;
  hasEffectMarker: boolean;
  effectType?: PptEffectType;
  marker?: RailMarker;
}
