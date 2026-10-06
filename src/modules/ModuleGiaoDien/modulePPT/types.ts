export interface PptSlideItem {
  id: string;
  title: string;
  steps: string[];
  contentHtml: string;
}

export interface RailMarker {
  id: string;
  type: 'slide' | 'effect';
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
  snippet: string;
}
