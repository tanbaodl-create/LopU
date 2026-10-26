import { HierarchyStore } from '../../ModuleGiaoVien/TaiLieuCaNhan/hierarchyData';

export type TienTrinhType = 'Kiến thức' | 'Luyện tập' | 'KTDG' | 'Cải thiện';

export interface HocLieuCoordinate {
  subject: string;
  grade: string;
  title: string;
  chuong: string;
  bai: string;
  vanDe: string;
  chuyenDe: string;
  tienTrinh: TienTrinhType;
  subItemName: string;
}

export interface HocLieuContent {
  fileName: string;
  fileType: 'html' | 'json';
  content: string;
  parsedData?: any;
  isLoading: boolean;
  drivePath?: string;
  error?: string | null;
  lastLoadedAt?: number;
}

export interface BoChonHocLieuTienTrinhProps {
  value?: Partial<HocLieuCoordinate>;
  onChange?: (coordinate: HocLieuCoordinate, content?: HocLieuContent) => void;
  onContentChange?: (content: string, coordinate: HocLieuCoordinate) => void;
  mode?: 'teacher' | 'student';
  readOnly?: boolean;
  defaultExpanded?: boolean;
  compact?: boolean;
  className?: string;
  showContentStatus?: boolean;
}
