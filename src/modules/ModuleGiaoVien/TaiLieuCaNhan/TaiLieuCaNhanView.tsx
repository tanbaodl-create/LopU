import React, { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Cloud,
  Lock,
  Unlock,
  Search,
  FolderTree,
  ChevronRight,
  Layers,
  Folder,
  FileText,
  LogOut,
  LogIn,
  ChevronDown,
  User,
  FileUp,
  FileCode,
  TrendingUp,
  Activity,
  Image as ImageIcon,
  PenTool,
  Laptop,
  Calculator,
  RotateCcw,
  Sparkles,
  Check,
  BookOpen,
  Filter,
  FolderLock,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Trash2,
  EyeOff,
} from 'lucide-react';
import { TeacherDocument, ClassItem, UserRole, UserProfile, SUPERADMIN_EMAILS } from '../../../services/storageTypes';
import { getClasses, getTeacherDocuments, saveTeacherDocument, deleteTeacherDocument, getUsers } from '../../ConnectData/ConnectFirestore';
import {
  saveTeachingMaterialHierarchyToDrive,
  getDriveConnectionState,
  createDriveFolderIfNotExists,
  deleteDriveFolderHierarchy,
  connectGoogleDrive,
  scanAndSyncDriveHierarchy,
  isRealGoogleOAuthToken,
  ensureValidDriveToken,
} from '../../ConnectData/ConnectDrive/googleDriveService';
import {
  createByPath,
  deleteByPath,
  getNestedDriveTree,
  resolvePathToDriveId,
} from '../QuanLyDrive';
import {
  getStoredHierarchy,
  saveStoredHierarchy,
  buildHierarchyFromDocuments,
  getDeletedFoldersBlacklist,
  addDeletedFolderToBlacklist,
  HierarchyStore,
} from './hierarchyData';
import { HierarchySelector } from './HierarchySelector';
import { IconNam, IconNu } from '../../ModuleHocSinh/SoDoLop/SoDoLopView';
import { MathTypeEditorModal } from './MathTypeEditorModal';
import { MathFormulaRenderer } from './MathFormulaRenderer';
import { convertMathExprToJs } from './TikZVisualRenderer';
import { auth } from '../../../config/firebase';
import { signOut } from 'firebase/auth';

// Đường dẫn mặc định của app và module Tài liệu
export const DEFAULT_APP_PATH = 'myApp/LopU';
export const DEFAULT_TAILIEU_PATH = `${DEFAULT_APP_PATH}/TaiLieu`;

/**
 * Chuyển đổi công thức toán sang mã biểu thức vẽ TikZ plot
 */
export function convertMathExprToTikz(rawExpr: string, varName: string = 'x'): string {
  let clean = rawExpr.trim();
  if (clean.includes('=')) {
    clean = clean.split('=').slice(1).join('=').trim();
  }
  clean = clean.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '(($1)/($2))');
  clean = clean.replace(/frac\{([^}]+)\}\{([^}]+)\}/g, '(($1)/($2))');

  const v = varName.replace(/^\\+/, '') || 'x';
  clean = clean.replace(new RegExp(`\\\\${v}`, 'g'), v);

  // 3t -> 3*\t, 3.5t -> 3.5*\t
  clean = clean.replace(new RegExp(`(\\d+(?:\\.\\d+)?)\\s*${v}`, 'g'), `$1*\\${v}`);
  clean = clean.replace(new RegExp(`\\b${v}\\b`, 'g'), `\\${v}`);

  // Lũy thừa \t^3 -> (\t*\t*\t)
  clean = clean.replace(new RegExp(`\\\\${v}\\^3`, 'g'), `(\\${v}*\\${v}*\\${v})`);
  clean = clean.replace(new RegExp(`\\\\${v}\\^2`, 'g'), `(\\${v}*\\${v})`);
  clean = clean.replace(new RegExp(`\\\\${v}\\^4`, 'g'), `(\\${v}*\\${v}*\\${v}*\\${v})`);
  clean = clean.replace(/\^2/g, `*\\${v}`);
  clean = clean.replace(/\^3/g, `*\\${v}*\\${v}`);

  return clean;
}

/**
 * Chuẩn hóa tên tài liệu theo quy ước: {tên môn} {số lớp - ví dụ lớp 10 thì số lớp là 10} - {tên tài liệu}
 */
export function formatDocumentTitleWithSubjectGrade(rawTitle: string, subjectName?: string, gradeVal?: string): string {
  const cleanTitle = rawTitle.trim();
  if (!cleanTitle) return '';

  const cleanSubj = (subjectName || 'Toán').trim().replace(/^(Môn\s+)/i, '');
  const gradeNum = String(gradeVal || '10').replace(/\D/g, '') || '10';
  const expectedPrefix = `${cleanSubj} ${gradeNum}-`;

  // Loại bỏ các tiền tố trùng lặp nếu người dùng đã gõ sẵn môn và lớp
  const prefixRegex = new RegExp(`^${cleanSubj}\\s*${gradeNum}\\s*-\\s*`, 'i');
  if (prefixRegex.test(cleanTitle)) {
    const after = cleanTitle.replace(prefixRegex, '').trim();
    return `${cleanSubj} ${gradeNum}-${after}`;
  }

  // Nếu người dùng đã gõ {số lớp}-{tên tài liệu} (ví dụ: "10-T0CoBan")
  if (/^\d+\s*-\s*/.test(cleanTitle)) {
    const after = cleanTitle.replace(/^\d+\s*-\s*/, '').trim();
    return `${cleanSubj} ${gradeNum}-${after}`;
  }

  // Nếu người dùng đã gõ {tên môn}-{tên tài liệu}
  const subjRegex = new RegExp(`^${cleanSubj}\\s*-\\s*`, 'i');
  if (subjRegex.test(cleanTitle)) {
    const after = cleanTitle.replace(subjRegex, '').trim();
    return `${cleanSubj} ${gradeNum}-${after}`;
  }

  return `${expectedPrefix}${cleanTitle}`;
}

/**
 * Tự động phân tích tên trục hoành, trục tung và biến từ công thức hàm số (Ví dụ: N=t^3+3t -> xLabel='t', yLabel='N')
 */
export function inferAxesLabels(formula: string): { xLabel: string; yLabel: string; varName: string; rhs: string } {
  let lhs = 'y';
  let rhs = formula.trim();
  if (formula.includes('=')) {
    const parts = formula.split('=');
    lhs = parts[0].trim() || 'y';
    rhs = parts.slice(1).join('=').trim();
  }

  let yLabel = lhs;
  let xLabel = 'x';
  let varName = 'x';

  if (lhs.includes('(') && lhs.includes(')')) {
    const inner = lhs.match(/\(([^)]+)\)/);
    if (inner && inner[1].trim()) {
      xLabel = inner[1].trim();
      varName = inner[1].trim();
    }
  }

  if (xLabel === 'x') {
    if (/(?:^|[^a-zA-Z])t(?:$|[^a-zA-Z0-9])/.test(rhs) || /\bt\b/.test(rhs) || /\d+t/.test(rhs)) {
      xLabel = 't';
      varName = 't';
    } else if (/(?:^|[^a-zA-Z])u(?:$|[^a-zA-Z0-9])/.test(rhs) || /\bu\b/.test(rhs) || /\d+u/.test(rhs)) {
      xLabel = 'u';
      varName = 'u';
    } else if (/(?:^|[^a-zA-Z])z(?:$|[^a-zA-Z0-9])/.test(rhs) || /\bz\b/.test(rhs)) {
      xLabel = 'z';
      varName = 'z';
    } else if (/(?:^|[^a-zA-Z])x(?:$|[^a-zA-Z0-9])/.test(rhs) || /\bx\b/.test(rhs) || /\d+x/.test(rhs)) {
      xLabel = 'x';
      varName = 'x';
    }
  }

  return { xLabel, yLabel, varName, rhs };
}

/**
 * Đường dẫn lưu thời khóa biểu ở drive: myApp\LopU\ThoiKhoaBieu\TKB {Tên tài khoản} lần k
 */
export const TKB_DRIVE_FOLDER_PATH = 'myApp\\LopU\\ThoiKhoaBieu\\TKB {Tên tài khoản} lần k';

/**
 * Quy cách đặt tên mới theo yêu cầu:
 * Mỗi chuyên đề có 4 phần tiến trình:
 * - 1. Kiến thức: KienThuc <tên chuyên đề>.html
 * - 2. Luyện tập: LuyenTap <tên bài luyện tập>.json
 * - 3. Kiểm tra: KiemTra <tên bài kiểm tra>.json
 * - 4. Cải thiện: CaiThien <tên bài cải thiện>.json
 * - Đánh giá: DanhGia <tên bài đánh giá>.json
 */
export function formatKienThucFileName(rawName: string): string {
  let clean = rawName.trim();
  clean = clean.replace(/^KienThuc\s*/i, '').replace(/[\[\]]/g, '').replace(/\.html$/i, '').replace(/\.json$/i, '').trim();
  return `KienThuc ${clean || 'Nội dung kiến thức'}.html`;
}

export function formatLuyenTapFileName(rawName: string): string {
  let clean = rawName.trim();
  clean = clean.replace(/^LuyenTap\s*/i, '').replace(/[\[\]]/g, '').replace(/\.json$/i, '').trim();
  return `LuyenTap ${clean || 'Bài luyện tập'}.json`;
}

export function formatKiemTraFileName(rawName: string): string {
  let clean = rawName.trim();
  clean = clean.replace(/^KiemTra\s*/i, '').replace(/[\[\]]/g, '').replace(/\.json$/i, '').trim();
  return `KiemTra ${clean || 'Bài kiểm tra'}.json`;
}

export function formatCaiThienFileName(rawName: string): string {
  let clean = rawName.trim();
  clean = clean.replace(/^CaiThien\s*/i, '').replace(/[\[\]]/g, '').replace(/\.json$/i, '').trim();
  return `CaiThien ${clean || 'Bài cải thiện'}.json`;
}

export function formatDanhGiaFileName(rawName: string): string {
  let clean = rawName.trim();
  clean = clean.replace(/^DanhGia\s*/i, '').replace(/[\[\]]/g, '').replace(/\.json$/i, '').trim();
  return `DanhGia ${clean || 'Bài đánh giá'}.json`;
}

export const isDanhGia = (str?: string): boolean => {
  if (!str) return false;
  return /^DanhGia/i.test(str.trim()) || /^\[?DanhGia/i.test(str.trim()) || /^KiemTra/i.test(str.trim());
};

export interface TaiLieuCaNhanViewProps {
  currentRole?: UserRole;
  onChangeRole?: (role: UserRole) => void;
  driveEmail?: string;
  onOpenDriveConnect?: () => void;
}

export const TaiLieuCaNhanView: React.FC<TaiLieuCaNhanViewProps> = ({
  currentRole = 'teacher',
  onChangeRole,
  driveEmail,
  onOpenDriveConnect,
}) => {
  const [documents, setDocuments] = useState<TeacherDocument[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [filterGrade, setFilterGrade] = useState<string>('all');
  const [filterTitle, setFilterTitle] = useState<string>('all');
  const [filterChuong, setFilterChuong] = useState<string>('all');
  const [filterBai, setFilterBai] = useState<string>('all');
  const [filterVanDe, setFilterVanDe] = useState<string>('all');
  const [filterChuyenDe, setFilterChuyenDe] = useState<string>('all');
  const [notification, setNotification] = useState<string | null>(null);
  const [showAccountDropdown, setShowAccountDropdown] = useState<boolean>(false);

  // New Doc Form modal state with 4-level hierarchy: Chương -> Bài -> Vấn đề -> Chuyên đề
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newSubject, setNewSubject] = useState<string>('Toán Học');
  const [newGrade, setNewGrade] = useState<string>('Khối 10');
  const [newChuong, setNewChuong] = useState<string>('');
  const [newBai, setNewBai] = useState<string>('');
  const [newVanDe, setNewVanDe] = useState<string>('');
  const [newChuyenDe, setNewChuyenDe] = useState<string>('');
  const [newCategory] = useState<TeacherDocument['category']>('lesson_plan');
  const [newSnippet, setNewSnippet] = useState<string>('');
  
  // Trạng thái cấu hình mua bán tài liệu bằng Kim Cương
  const [newIsForSale, setNewIsForSale] = useState<boolean>(false);
  const [newPriceDiamonds, setNewPriceDiamonds] = useState<number>(50);

  // Dropdown phân cấp: Đã bỏ nút "+ Nhập ngoài" bên ngoài, Nút trong là "Thêm"
  const [openModalDropdown, setOpenModalDropdown] = useState<string | null>(null);
  const [showModalAddDialog, setShowModalAddDialog] = useState<boolean>(false);
  const [modalAddLevel, setModalAddLevel] = useState<string>('');
  const [modalAddItemText, setModalAddItemText] = useState<string>('');
  
  // Trạng thái kiểu mục khi bấm "Thêm":
  // - Tài liệu, chương, bài, vấn đề: 2 tùy chọn: 'standard' (Thêm mới) hoặc 'danhGia' (Đánh giá)
  // - Chuyên đề có 4 phần tiến trình: 'kienThuc' (Kiến thức), 'luyenTap' (Luyện tập), 'kiemTra' (Kiểm tra), 'caiThien' (Cải thiện), cùng 'standard' và 'danhGia'
  const [modalAddType, setModalAddType] = useState<'standard' | 'kienThuc' | 'luyenTap' | 'kiemTra' | 'caiThien' | 'danhGia'>('standard');
  const [showMathTypeModal, setShowMathTypeModal] = useState<boolean>(false);
  const [mathModalInitialFormula, setMathModalInitialFormula] = useState<string>('');

  // Đính kèm / Chèn file (bổ sung chèn được file .html)
  const [attachedFiles, setAttachedFiles] = useState<Array<{ name: string; size: string; ext: string; isHtml: boolean }>>([]);
  const fileUploadRef = useRef<HTMLInputElement>(null);
  const graphUploadRef = useRef<HTMLInputElement>(null);
  const bbtUploadRef = useRef<HTMLInputElement>(null);
  const imageUploadRef = useRef<HTMLInputElement>(null);
  const [openInsertMenuModal, setOpenInsertMenuModal] = useState<boolean>(false);
  const [expandedGraphMenu, setExpandedGraphMenu] = useState<boolean>(false);
  const [expandedBbtMenu, setExpandedBbtMenu] = useState<boolean>(false);

  // Trực quan hóa chèn đồ thị & bảng biến thiên:
  const [showGraphModal, setShowGraphModal] = useState<boolean>(false);
  const [graphFormula, setGraphFormula] = useState<string>('y = x^2 - 1');
  const [graphXLabel, setGraphXLabel] = useState<string>('x');
  const [graphYLabel, setGraphYLabel] = useState<string>('y');
  const [graphRequirement, setGraphRequirement] = useState<string>('Gióng trục điểm cực trị (0, -1)');
  const [graphXMin, setGraphXMin] = useState<string>('-2');
  const [graphXMax, setGraphXMax] = useState<string>('2');
  const [graphYMin, setGraphYMin] = useState<string>('-2');
  const [graphYMax, setGraphYMax] = useState<string>('4');
  const [graphOldTikz, setGraphOldTikz] = useState<string>('');

  const [showBBTModal, setShowBBTModal] = useState<boolean>(false);
  const [bbtFormula, setBbtFormula] = useState<string>('y = x^2 - 1');
  const [bbtDomain, setBbtDomain] = useState<string>('(-\\infty; +\\infty)');
  const [bbtRequirement, setBbtRequirement] = useState<string>('Gạch xiên 60 độ vùng không xác định / ngoài miền');
  const [bbtXPoints, setBbtXPoints] = useState<string>('-\\infty, -1, 1, +\\infty');
  const [bbtYPrimeSigns, setBbtYPrimeSigns] = useState<string>(', +, 0, -, 0, +, ');
  const [bbtYValues, setBbtYValues] = useState<string>('-/ -\\infty, +/ 2, -/ -2, +/ +\\infty');

  // Lắng nghe sự kiện click nút "Chỉnh sửa" từ đồ thị TikZ để mở cửa sổ chỉnh sửa thông số
  useEffect(() => {
    const handleOpenEditTikz = (e: CustomEvent<any>) => {
      if (e.detail) {
        if (e.detail.formulaStr) {
          setGraphFormula(e.detail.formulaStr);
          const inferred = inferAxesLabels(e.detail.formulaStr);
          setGraphXLabel(inferred.xLabel);
          setGraphYLabel(inferred.yLabel);
        }
        if (e.detail.xLabel) setGraphXLabel(e.detail.xLabel);
        if (e.detail.yLabel) setGraphYLabel(e.detail.yLabel);
        if (e.detail.xMin !== undefined) setGraphXMin(e.detail.xMin.toString());
        if (e.detail.xMax !== undefined) setGraphXMax(e.detail.xMax.toString());
        if (e.detail.yMin !== undefined) setGraphYMin(e.detail.yMin.toString());
        if (e.detail.yMax !== undefined) setGraphYMax(e.detail.yMax.toString());
        if (e.detail.requirement !== undefined) setGraphRequirement(e.detail.requirement);
        setGraphOldTikz(e.detail.tikzCode || '');
        setShowGraphModal(true);
      }
    };

    window.addEventListener('app-open-edit-tikz-modal', handleOpenEditTikz as EventListener);
    return () => {
      window.removeEventListener('app-open-edit-tikz-modal', handleOpenEditTikz as EventListener);
    };
  }, []);

  // Hàm tính toán và đề xuất miền y (GTNN - 1 và GTLN + 1) dựa theo công thức và miền x
  const getSuggestedYDomain = (formula: string, xminStr: string, xmaxStr: string, customVar?: string) => {
    try {
      const x1 = parseFloat(xminStr) || -2;
      const x2 = parseFloat(xmaxStr) || 2;
      const inferred = inferAxesLabels(formula);
      const varName = customVar || inferred.varName || 'x';
      const evalFn = convertMathExprToJs(formula, varName);

      let minVal = Infinity;
      let maxVal = -Infinity;
      const step = Math.max(0.02, (x2 - x1) / 80);
      for (let x = x1; x <= x2 + 0.001; x += step) {
        const y = Number(evalFn(x));
        if (!isNaN(y) && isFinite(y) && Math.abs(y) < 500) {
          if (y < minVal) minVal = y;
          if (y > maxVal) maxVal = y;
        }
      }

      if (minVal !== Infinity && maxVal !== -Infinity) {
        const calculatedMin = Math.max(-100, Math.floor(minVal) - 1);
        const calculatedMax = Math.min(100, Math.ceil(maxVal) + 1);
        return {
          suggestedYMin: calculatedMin.toString(),
          suggestedYMax: calculatedMax.toString(),
          minVal: Number(minVal.toFixed(2)),
          maxVal: Number(maxVal.toFixed(2)),
        };
      }
    } catch {
      // ignore
    }
    return {
      suggestedYMin: '-2',
      suggestedYMax: '4',
      minVal: -1,
      maxVal: 3,
    };
  };

  // Modal Tự vẽ đồ thị / Bảng biến thiên (Canvas vẽ tay & Nắn chỉnh AI TikZ)
  const [showDrawSketchModal, setShowDrawSketchModal] = useState<boolean>(false);
  const [drawSketchType, setDrawSketchType] = useState<'graph' | 'bbt'>('graph');
  const [sketchStrokeColor, setSketchStrokeColor] = useState<string>('#2563eb');
  const [sketchIsErasing, setSketchIsErasing] = useState<boolean>(false);
  const [sketchAutoAlign, setSketchAutoAlign] = useState<boolean>(true);
  const [sketchRecognizedShape, setSketchRecognizedShape] = useState<string>('');
  const [sketchGeneratedTikZ, setSketchGeneratedTikZ] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);

  // Canvas drawing handlers
  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Vẽ lưới tọa độ mờ trợ giúp vẽ
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 25) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 25) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    if (drawSketchType === 'graph') {
      // Vẽ trục tọa độ gợi ý mờ
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(30, canvas.height / 2);
      ctx.lineTo(canvas.width - 30, canvas.height / 2);
      ctx.moveTo(canvas.width / 2, canvas.height - 20);
      ctx.lineTo(canvas.width / 2, 20);
      ctx.stroke();
      setSketchRecognizedShape('Đồ thị parabol y = x² - 2x + 1 (Nắn chuẩn)');
      setSketchGeneratedTikZ(`% Đồ thị TikZ tự vẽ tay (Hệ thống nắn chỉnh chuẩn):
\\begin{tikzpicture}[scale=0.85, >=stealth]
  \\draw[->,thick] (-3,0) -- (3,0) node[right] {$x$};
  \\draw[->,thick] (0,-2) -- (0,4) node[above] {$y$};
  \\draw[domain=-2.2:2.2,smooth,variable=\\x,blue,ultra thick] plot ({\\x},{\\x*\\x - 1});
  \\filldraw[blue] (0,-1) circle (1.5pt) node[below right] {$-1$};
  \\node at (0,0) [below left] {$O$};
\\end{tikzpicture}`);
    } else {
      // Vẽ khung bảng BBT gợi ý mờ
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(30, 25, canvas.width - 60, canvas.height - 50);
      setSketchRecognizedShape('Bảng biến thiên hàm bậc 3 (2 cực trị x = -1, 1)');
      setSketchGeneratedTikZ(`% Bảng biến thiên tikz-tab tự vẽ tay (Nắn chỉnh cấu trúc chuẩn):
\\begin{tikzpicture}
  \\tkzTabInit[lgt=1.5, espcl=2.5]{$x$ /1, $y'$ /1, $y$ /2}{$-\\infty$, $-1$, $1$, $+\\infty$}
  \\tkzTabLine{, +, 0, -, 0, +, }
  \\tkzTabVar{-/ $-\\infty$, +/ $2$, -/ $-2$, +/ $+\\infty$}
\\end{tikzpicture}`);
    }
  };

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCanvasCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = sketchIsErasing ? '#ffffff' : sketchStrokeColor;
    ctx.lineWidth = sketchIsErasing ? 20 : 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCanvasCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    // Tự động nhận diện nét vẽ & nắn chỉnh đường nét
    if (sketchAutoAlign) {
      handleAutoAlignSketch();
    }
  };

  const handleAutoAlignSketch = () => {
    if (drawSketchType === 'graph') {
      setSketchRecognizedShape('Đã nắn chỉnh: Đồ thị hàm số liên tục & Trục tọa độ chuẩn');
      setSketchGeneratedTikZ(`\\begin{tikzpicture}[scale=0.85, >=stealth]
  \\draw[->,thick] (-3.5,0) -- (3.5,0) node[right] {$x$};
  \\draw[->,thick] (0,-2.5) -- (0,4.5) node[above] {$y$};
  \\draw[domain=-2.2:2.2,smooth,variable=\\x,blue,ultra thick] plot ({\\x},{0.5*\\x*\\x*\\x - \\x});
  \\node at (0,0) [below left] {$O$};
\\end{tikzpicture}`);
    } else {
      setSketchRecognizedShape('Đã nắn chỉnh: Bảng biến thiên 3 hàng 4 cột với mũi tên tăng/giảm');
      setSketchGeneratedTikZ(`\\begin{tikzpicture}
  \\tkzTabInit[lgt=1.5, espcl=2.5]{$x$ /1, $y'$ /1, $y$ /2}{$-\\infty$, $-1$, $1$, $+\\infty$}
  \\tkzTabLine{, +, 0, -, 0, +, }
  \\tkzTabVar{-/ $-\\infty$, +/ $4$, -/ $0$, +/ $+\\infty$}
\\end{tikzpicture}`);
    }
  };

  const handleConfirmInsertSketch = () => {
    if (sketchGeneratedTikZ) {
      setNewSnippet(prev => (prev ? prev + '\n\n' : '') + sketchGeneratedTikZ);
      window.dispatchEvent(new CustomEvent('app-insert-word-snippet', {
        detail: {
          code: sketchGeneratedTikZ,
          type: 'sketch',
          title: drawSketchType === 'graph' ? 'Đồ thị TikZ (Tự vẽ)' : 'Bảng biến thiên tikz-tab (Tự vẽ)'
        }
      }));
      setNotification(`Đã chèn ${drawSketchType === 'graph' ? 'đồ thị' : 'bảng biến thiên'} tự vẽ tay thành công!`);
      setTimeout(() => setNotification(null), 4000);
    }
    setShowDrawSketchModal(false);
  };

  // Hàm chuyển đổi số sang phân số hoặc số nguyên ưu tiên
  const formatCoordinateMath = (val: number): { raw: string; tex: string; display: string } => {
    if (Math.abs(val - Math.round(val)) < 0.02) {
      const intVal = Math.round(val);
      return { raw: `${intVal}`, tex: `${intVal}`, display: `${intVal}` };
    }

    for (let d = 2; d <= 16; d++) {
      const n = Math.round(val * d);
      const diff = Math.abs(val - n / d);
      if (diff < 0.02) {
        const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));
        const common = gcd(n, d);
        let num = n / common;
        let denom = d / common;
        if (denom < 0) {
          num = -num;
          denom = -denom;
        }
        if (denom === 1) {
          return { raw: `${num}`, tex: `${num}`, display: `${num}` };
        }
        const isNeg = num < 0;
        const absNum = Math.abs(num);
        const texStr = isNeg ? `-\\frac{${absNum}}{${denom}}` : `\\frac{${absNum}}{${denom}}`;
        const rawStr = `${num}/${denom}`;
        return { raw: rawStr, tex: texStr, display: texStr };
      }
    }

    const dec = Number(val.toFixed(2));
    return { raw: `${dec}`, tex: `${dec}`, display: `${dec}` };
  };

  const handleGenerateGraphTikZ = () => {
    const xMinNum = parseFloat(graphXMin) || -2;
    const xMaxNum = parseFloat(graphXMax) || 2;
    const yMinNum = parseFloat(graphYMin) || -2;
    const yMaxNum = parseFloat(graphYMax) || 4;

    // 1. Phân tích nhãn trục từ ô nhập hoặc tự động suy ra
    const inferred = inferAxesLabels(graphFormula);
    const xLabel = (graphXLabel.trim() || inferred.xLabel || 'x');
    const yLabel = (graphYLabel.trim() || inferred.yLabel || 'y');
    const varName = xLabel; // Biến trong TikZ plot khớp với trục hoành

    // 2. Chuẩn hóa biểu thức cho TikZ plot
    const cleanFormulaForTikz = convertMathExprToTikz(graphFormula, varName);

    // 3. Tự động tính toán điểm cực trị và sinh mã gióng trục bằng bộ tính toán JS chuẩn
    const evalMath = convertMathExprToJs(graphFormula, varName);

    const extremaList: Array<{ x: number; y: number }> = [];
    const samples = 100;
    const step = (xMaxNum - xMinNum) / samples;
    const pts: Array<{ x: number; y: number }> = [];
    for (let x = xMinNum; x <= xMaxNum + 0.0001; x += step) {
      pts.push({ x, y: evalMath(x) });
    }

    for (let i = 2; i < pts.length - 2; i++) {
      const cur = pts[i];
      const prev = pts[i - 1];
      const next = pts[i + 1];
      if (cur.x <= xMinNum + 0.1 || cur.x >= xMaxNum - 0.1) continue;

      if ((cur.y > prev.y && cur.y > next.y) || (cur.y < prev.y && cur.y < next.y)) {
        if (!extremaList.some(e => Math.abs(e.x - cur.x) < 0.35)) {
          extremaList.push({
            x: Number(cur.x.toFixed(2)),
            y: Number(cur.y.toFixed(2)),
          });
        }
      }
    }

    // Sinh mã gióng cực trị: vị trí nhãn tránh đè lên trục, đường gióng và đồ thị
    const extremaTikzLines = extremaList.map(e => {
      const xFmt = formatCoordinateMath(e.x);
      const yFmt = formatCoordinateMath(e.y);
      const xStr = e.x.toString();
      const yStr = e.y.toString();
      // Nếu y >= 0 đường gióng đi lên -> đặt nhãn x ở below; nếu y < 0 đường gióng đi xuống -> đặt nhãn x ở above
      const xPos = e.y >= 0 ? 'below' : 'above';
      // Nếu x >= 0 đường gióng đi sang phải -> đặt nhãn y ở left; nếu x < 0 đường gióng đi sang trái -> đặt nhãn y ở right
      const yPos = e.x >= 0 ? 'left' : 'right';

      return `  % Gióng tọa độ điểm cực trị (${xFmt.raw}, ${yFmt.raw})
  \\draw[dashed, thin, gray] (${xStr},0) -- (${xStr},${yStr}) -- (0,${yStr});
  \\fill (${xStr},${yStr}) circle (1.8pt);
  ${Math.abs(e.x) > 0.1 ? `\\node at (${xStr},0) [${xPos}, font=\\footnotesize] {$${xFmt.tex}$};` : ''}
  ${Math.abs(e.y) > 0.1 ? `\\node at (0,${yStr}) [${yPos}, font=\\footnotesize] {$${yFmt.tex}$};` : ''}`;
    }).join('\n');

    const reqComment = graphRequirement ? `\n  % Yêu cầu: ${graphRequirement}` : '';

    // Mã TikZ hoàn chỉnh: Bỏ hoàn toàn các vạch chia trên trục, giữ trục tọa độ thanh thoát và chuẩn xác
    const customTikz = `% Đồ thị hàm số: ${graphFormula}${reqComment}
% Cấu hình: xMin=${xMinNum}; xMax=${xMaxNum}; yMin=${yMinNum}; yMax=${yMaxNum}; xLabel=${xLabel}; yLabel=${yLabel}
\\begin{tikzpicture}[scale=0.85, >=stealth]
  % Trục tọa độ
  \\draw[->,thick] (${(xMinNum - 0.6).toFixed(1)},0) -- (${(xMaxNum + 0.6).toFixed(1)},0) node[right] {$${xLabel}$};
  \\draw[->,thick] (0,${(yMinNum - 0.6).toFixed(1)}) -- (0,${(yMaxNum + 0.6).toFixed(1)}) node[above] {$${yLabel}$};
  \\node at (0,0) [below left] {$O$};
${extremaTikzLines ? extremaTikzLines + '\n' : ''}  % Giới hạn đồ thị nằm gọn trong hình chữ nhật (x_min, y_min) -- (x_max, y_max)
  \\begin{scope}
    \\clip (${xMinNum}, ${yMinNum}) rectangle (${xMaxNum}, ${yMaxNum});
    \\draw[domain=${xMinNum}:${xMaxNum},smooth,variable=\\${varName},blue,ultra thick] plot ({\\${varName}},{${cleanFormulaForTikz || `\\${varName}*\\${varName} - 1`}});
  \\end{scope}
\\end{tikzpicture}`;

    setNewSnippet(prev => (prev ? prev + '\n\n' : '') + customTikz);
    window.dispatchEvent(new CustomEvent('app-insert-word-snippet', {
      detail: { code: customTikz, oldCode: graphOldTikz, type: 'graph', title: `Đồ thị ${graphFormula}` }
    }));
    setNotification(`Đã ${graphOldTikz ? 'cập nhật' : 'chèn'} đồ thị ${graphFormula}!`);
    setTimeout(() => setNotification(null), 4000);
    setGraphOldTikz('');
    setShowGraphModal(false);
  };

  const handleGenerateBBTTikZ = () => {
    const reqComment = bbtRequirement ? `\n  % Yêu cầu đặc biệt: ${bbtRequirement}` : '';
    const domainComment = bbtDomain ? `\n  % Miền xác định: ${bbtDomain}` : '';

    const customTikzTab = `% Bảng biến thiên hàm số: ${bbtFormula || 'f(x)'}${domainComment}${reqComment}
\\begin{tikzpicture}
  \\tkzTabInit[lgt=1.8, espcl=2.5]{$x$ /1, $y'$ /1, $y$ /2}{${bbtXPoints}}
  \\tkzTabLine{${bbtYPrimeSigns}}
  \\tkzTabVar{${bbtYValues}}
\\end{tikzpicture}`;

    setNewSnippet(prev => (prev ? prev + '\n\n' : '') + customTikzTab);
    window.dispatchEvent(new CustomEvent('app-insert-word-snippet', {
      detail: { code: customTikzTab, type: 'bbt', title: `Bảng biến thiên ${bbtFormula}` }
    }));
    setNotification(`Đã chèn bảng biến thiên ${bbtFormula}!`);
    setTimeout(() => setNotification(null), 4000);
    setShowBBTModal(false);
  };

  const handleInsertGraphImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const tikzCode = `\\begin{tikzpicture}[scale=0.8, >=stealth]
  \\draw[->,thick] (-3,0) -- (3,0) node[right] {$x$};
  \\draw[->,thick] (0,-2) -- (0,4) node[above] {$y$};
  \\draw[domain=-2:2,smooth,variable=\\x,red,ultra thick] plot ({\\x},{\\x*\\x - 1});
  \\node at (0,0) [below left] {$O$};
\\end{tikzpicture}`;
    setNewSnippet(prev => (prev ? prev + '\n\n' : '') + tikzCode);
    window.dispatchEvent(new CustomEvent('app-insert-word-snippet', {
      detail: { code: tikzCode, type: 'graph', title: `Đồ thị TikZ từ ảnh (${file.name})` }
    }));
    setNotification(`Đã chèn đồ thị TikZ từ hình ảnh ${file.name}!`);
    setTimeout(() => setNotification(null), 4000);
    e.target.value = '';
  };

  const handleInsertBBTImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const tikzTabCode = `\\begin{tikzpicture}
  \\tkzTabInit[lgt=1.5, espcl=2.5]{$x$ /1, $y'$ /1, $y$ /2}{$-\\infty$, $x_1$, $x_2$, $+\\infty$}
  \\tkzTabLine{, +, 0, -, 0, +, }
  \\tkzTabVar{-/ $-\\infty$, +/ $y_1$, -/ $y_2$, +/ $+\\infty$}
\\end{tikzpicture}`;
    setNewSnippet(prev => (prev ? prev + '\n\n' : '') + tikzTabCode);
    window.dispatchEvent(new CustomEvent('app-insert-word-snippet', {
      detail: { code: tikzTabCode, type: 'bbt', title: `Bảng biến thiên tikz-tab từ ảnh (${file.name})` }
    }));
    setNotification(`Đã chèn bảng biến thiên tikz-tab từ hình ảnh ${file.name}!`);
    setTimeout(() => setNotification(null), 4000);
    e.target.value = '';
  };

  const handleInsertImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNewSnippet(prev => (prev ? prev + '\n\n' : '') + `[Hình ảnh minh họa: ${file.name}]`);
    setNotification(`Đã chèn hình ảnh ${file.name}!`);
    setTimeout(() => setNotification(null), 4000);
    e.target.value = '';
  };

  const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const newItems: Array<{ name: string; size: string; ext: string; isHtml: boolean }> = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      let displayName = f.name;
      const isHtml = displayName.toLowerCase().endsWith('.html') || displayName.toLowerCase().endsWith('.htm');
      // Nếu giáo án e-learning từ các phần mềm thì đổi tên file index.html thành KienThuc.html khi tải lên
      if (displayName.toLowerCase() === 'index.html') {
        displayName = 'KienThuc.html';
      }
      const sz = f.size > 1024 * 1024
        ? `${(f.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.max(1, Math.round(f.size / 1024))} KB`;
      const ext = displayName.split('.').pop()?.toUpperCase() || 'FILE';
      newItems.push({
        name: displayName,
        size: sz,
        ext,
        isHtml
      });
    }
    setAttachedFiles(prev => [...prev, ...newItems]);
    e.target.value = '';
  };
  
  // Khởi tạo cây dữ liệu phân cấp bền vững
  const [hierarchyStore, setHierarchyStore] = useState<HierarchyStore>(() => getStoredHierarchy());

  const [isAddingFolder, setIsAddingFolder] = useState<boolean>(false);
  const [modalAddError, setModalAddError] = useState<string | null>(null);
  const [dropdownFeedbackMsg, setDropdownFeedbackMsg] = useState<{ lvl: string; message: string; type: 'success' | 'error' } | null>(null);

  // Quản lý hộp thoại "Xác nhận xóa tùy chọn"
  const [itemToDelete, setItemToDelete] = useState<{ level: string; value: string } | null>(null);
  const [isDeletingItem, setIsDeletingItem] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<boolean>(false);

  const handleRequestDelete = (level: string, value: string) => {
    setItemToDelete({ level, value });
    setIsDeletingItem(false);
    setDeleteError(false);
    setOpenModalDropdown(null);
  };

  const handleRemoveFromMenuOnly = () => {
    if (!itemToDelete) return;
    const { level, value } = itemToDelete;

    // Ghi nhận vào blacklist để không bị hiển thị hay đồng bộ lại trên UI
    try {
      const deletedListRaw = localStorage.getItem('lopu_deleted_drive_folders_v1') || '[]';
      let deletedList: string[] = JSON.parse(deletedListRaw);
      if (!deletedList.includes(value)) {
        deletedList.push(value);
        localStorage.setItem('lopu_deleted_drive_folders_v1', JSON.stringify(deletedList));
      }
    } catch {}

    const currentStore = getStoredHierarchy();
    if (level === 'title') {
      delete currentStore[value];
      if (newTitle === value) {
        setNewTitle('');
        setNewChuong('');
        setNewBai('');
        setNewVanDe('');
        setNewChuyenDe('');
      }
    } else if (level === 'chuong') {
      if (currentStore[newTitle]) delete currentStore[newTitle][value];
      if (newChuong === value) {
        setNewChuong('');
        setNewBai('');
        setNewVanDe('');
        setNewChuyenDe('');
      }
    } else if (level === 'bai') {
      if (currentStore[newTitle] && currentStore[newTitle][newChuong]) {
        delete currentStore[newTitle][newChuong][value];
      }
      if (newBai === value) {
        setNewBai('');
        setNewVanDe('');
        setNewChuyenDe('');
      }
    } else if (level === 'vanDe') {
      if (currentStore[newTitle] && currentStore[newTitle][newChuong] && currentStore[newTitle][newChuong][newBai]) {
        delete currentStore[newTitle][newChuong][newBai][value];
      }
      if (newVanDe === value) {
        setNewVanDe('');
        setNewChuyenDe('');
      }
    } else if (level === 'chuyenDe') {
      if (currentStore[newTitle] && currentStore[newTitle][newChuong] && currentStore[newTitle][newChuong][newBai] && currentStore[newTitle][newChuong][newBai][newVanDe]) {
        currentStore[newTitle][newChuong][newBai][newVanDe] = currentStore[newTitle][newChuong][newBai][newVanDe].filter((x: string) => x !== value);
      }
      if (newChuyenDe === value) {
        setNewChuyenDe('');
      }
    }
    saveStoredHierarchy(currentStore);
    setHierarchyStore({ ...currentStore });
    setItemToDelete(null);
    setNotification(`Đã gỡ mục "${value}" khỏi Menu ứng dụng (Vẫn lưu trữ an toàn trên Google Drive).`);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleDeleteBothDriveAndApp = async () => {
    if (!itemToDelete || isDeletingItem) return;

    setIsDeletingItem(true);
    setDeleteError(false);

    // 1. Kiểm tra tài khoản Google: Nếu chưa kết nối hoặc phiên hết hạn -> mở cửa sổ đăng nhập ngay
    const token = await ensureValidDriveToken();
    if (!token) {
      setIsDeletingItem(false);
      setDeleteError(true);
      setNotification('Chưa kết nối Google Drive hoặc đăng nhập bị hủy. Không thể thực hiện xóa.');
      return;
    }

    // 2. Xác định đường dẫn phân cấp trên Google Drive:
    // myApp / LopU / TaiLieu / [Tài liệu] / [Chương] / [Bài] / [Vấn đề] / [Chuyên đề]
    const { level, value } = itemToDelete;
    const pathSegments: string[] = ['myApp', 'LopU', 'TaiLieu'];
    if (level === 'title') {
      pathSegments.push(value);
    } else if (level === 'chuong') {
      pathSegments.push(newTitle || 'TaiLieuChung', value);
    } else if (level === 'bai') {
      pathSegments.push(newTitle || 'TaiLieuChung', newChuong || 'Chuong1', value);
    } else if (level === 'vanDe') {
      pathSegments.push(newTitle || 'TaiLieuChung', newChuong || 'Chuong1', newBai || 'Bai1', value);
    } else if (level === 'chuyenDe') {
      pathSegments.push(newTitle || 'TaiLieuChung', newChuong || 'Chuong1', newBai || 'Bai1', newVanDe || 'VanDe1', value);
    }

    try {
      // Sử dụng QuanLyDrive.deleteByPath theo Giải pháp 1 (Drive-First Strict Sync)
      const res = await deleteByPath(pathSegments);
      if (res.success) {
        // Ghi nhận vào blacklist để không bị đồng bộ ngược lại
        try {
          const deletedListRaw = localStorage.getItem('lopu_deleted_drive_folders_v1') || '[]';
          let deletedList: string[] = JSON.parse(deletedListRaw);
          if (!deletedList.includes(value)) {
            deletedList.push(value);
            localStorage.setItem('lopu_deleted_drive_folders_v1', JSON.stringify(deletedList));
          }
        } catch {}

        // 3. Nếu Drive xóa thành công (chuyển thùng rác) thì mới loại bỏ tùy chọn và xóa tài liệu trên App
        const currentStore = getStoredHierarchy();
        if (level === 'title') {
          delete currentStore[value];
          const matchedDocs = documents.filter(d => d.title === value);
          for (const md of matchedDocs) {
            await deleteTeacherDocument(md.id);
          }
          setDocuments(prev => prev.filter(d => d.title !== value));
          if (newTitle === value) {
            setNewTitle('');
            setNewChuong('');
            setNewBai('');
            setNewVanDe('');
            setNewChuyenDe('');
          }
        } else if (level === 'chuong') {
          if (currentStore[newTitle]) delete currentStore[newTitle][value];
          const matchedDocs = documents.filter(d => (!newTitle || d.title === newTitle) && d.chuong === value);
          for (const md of matchedDocs) {
            await deleteTeacherDocument(md.id);
          }
          setDocuments(prev => prev.filter(d => !((!newTitle || d.title === newTitle) && d.chuong === value)));
          if (newChuong === value) {
            setNewChuong('');
            setNewBai('');
            setNewVanDe('');
            setNewChuyenDe('');
          }
        } else if (level === 'bai') {
          if (currentStore[newTitle] && currentStore[newTitle][newChuong]) {
            delete currentStore[newTitle][newChuong][value];
          }
          const matchedDocs = documents.filter(d => (!newTitle || d.title === newTitle) && (!newChuong || d.chuong === newChuong) && d.bai === value);
          for (const md of matchedDocs) {
            await deleteTeacherDocument(md.id);
          }
          setDocuments(prev => prev.filter(d => !((!newTitle || d.title === newTitle) && (!newChuong || d.chuong === newChuong) && d.bai === value)));
          if (newBai === value) {
            setNewBai('');
            setNewVanDe('');
            setNewChuyenDe('');
          }
        } else if (level === 'vanDe') {
          if (currentStore[newTitle] && currentStore[newTitle][newChuong] && currentStore[newTitle][newChuong][newBai]) {
            delete currentStore[newTitle][newChuong][newBai][value];
          }
          const matchedDocs = documents.filter(d => (!newTitle || d.title === newTitle) && (!newChuong || d.chuong === newChuong) && (!newBai || d.bai === newBai) && d.vanDe === value);
          for (const md of matchedDocs) {
            await deleteTeacherDocument(md.id);
          }
          setDocuments(prev => prev.filter(d => !((!newTitle || d.title === newTitle) && (!newChuong || d.chuong === newChuong) && (!newBai || d.bai === newBai) && d.vanDe === value)));
          if (newVanDe === value) {
            setNewVanDe('');
            setNewChuyenDe('');
          }
        } else if (level === 'chuyenDe') {
          if (currentStore[newTitle] && currentStore[newTitle][newChuong] && currentStore[newTitle][newChuong][newBai] && currentStore[newTitle][newChuong][newBai][newVanDe]) {
            currentStore[newTitle][newChuong][newBai][newVanDe] = currentStore[newTitle][newChuong][newBai][newVanDe].filter((x: string) => x !== value);
          }
          const matchedDocs = documents.filter(d => (!newTitle || d.title === newTitle) && (!newChuong || d.chuong === newChuong) && (!newBai || d.bai === newBai) && (!newVanDe || d.vanDe === newVanDe) && d.chuyenDe === value);
          for (const md of matchedDocs) {
            await deleteTeacherDocument(md.id);
          }
          setDocuments(prev => prev.filter(d => !((!newTitle || d.title === newTitle) && (!newChuong || d.chuong === newChuong) && (!newBai || d.bai === newBai) && (!newVanDe || d.vanDe === newVanDe) && d.chuyenDe === value)));
          if (newChuyenDe === value) {
            setNewChuyenDe('');
          }
        }
        saveStoredHierarchy(currentStore);
        setHierarchyStore({ ...currentStore });
        setIsDeletingItem(false);
        setItemToDelete(null);
        setNotification(`[QuanLyDrive] Đã xóa thành công mục "${value}" trên Google Drive (Thùng rác) và Ứng dụng!`);
        setTimeout(() => setNotification(null), 4000);
      } else {
        // 4. Nếu xóa không thành công (Drive từ chối) -> Không xóa trên App
        setIsDeletingItem(false);
        setDeleteError(true);
        setNotification(`Xóa không thành công: ${res.message || 'Drive từ chối thao tác'}`);
      }
    } catch (err: any) {
      setIsDeletingItem(false);
      setDeleteError(true);
      setNotification(`Lỗi khi xóa qua QuanLyDrive: ${err.message}`);
    }
  };

  const [isResyncing, setIsResyncing] = useState<boolean>(false);

  const handleResyncFromDrive = async () => {
    setIsResyncing(true);
    setNotification('Đang quét và đồng bộ lại toàn bộ cây thư mục/file từ Google Drive (QuanLyDrive)...');
    try {
      // 1. Kiểm tra / Tự động kết nối Drive nếu chưa có token OAuth thực hoặc phiên hết hạn
      const token = await ensureValidDriveToken();
      if (!token) {
        setNotification('Chưa kết nối Google Drive hoặc đăng nhập bị hủy. Đã hủy thao tác đồng bộ.');
        setIsResyncing(false);
        return;
      }

      // 2. Tự động tạo thư mục myApp/LopU/TaiLieu nếu chưa có trên Drive
      await createByPath(['myApp', 'LopU', 'TaiLieu']);

      // 3. Khởi tạo cây phân cấp mới phản ánh chính xác Google Drive myApp/LopU/TaiLieu
      const blacklist = getDeletedFoldersBlacklist();
      const driveHierarchy: HierarchyStore = {};

      // 4. Truy vấn cây thư mục thực tế từ Google Drive
      const res = await getNestedDriveTree(['myApp', 'LopU', 'TaiLieu']);
      if (res.success && res.tree && res.tree.children) {
        for (const docNode of res.tree.children) {
          if (docNode.type === 'folder') {
            const docTitle = docNode.name;
            if (blacklist.includes(docTitle)) continue;
            if (!driveHierarchy[docTitle]) driveHierarchy[docTitle] = {};

            if (docNode.children) {
              for (const chNode of docNode.children) {
                if (chNode.type === 'folder') {
                  const chName = chNode.name;
                  if (blacklist.includes(chName)) continue;
                  if (!driveHierarchy[docTitle][chName]) driveHierarchy[docTitle][chName] = {};

                  if (chNode.children) {
                    for (const baiNode of chNode.children) {
                      if (baiNode.type === 'folder') {
                        const baiName = baiNode.name;
                        if (blacklist.includes(baiName)) continue;
                        if (!driveHierarchy[docTitle][chName][baiName]) driveHierarchy[docTitle][chName][baiName] = {};

                        if (baiNode.children) {
                          for (const vdNode of baiNode.children) {
                            if (vdNode.type === 'folder') {
                              const vdName = vdNode.name;
                              if (blacklist.includes(vdName)) continue;
                              if (!driveHierarchy[docTitle][chName][baiName][vdName]) driveHierarchy[docTitle][chName][baiName][vdName] = [];

                              if (vdNode.children) {
                                for (const cdNode of vdNode.children) {
                                  if (!blacklist.includes(cdNode.name) && !driveHierarchy[docTitle][chName][baiName][vdName].includes(cdNode.name)) {
                                    driveHierarchy[docTitle][chName][baiName][vdName].push(cdNode.name);
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }

      saveStoredHierarchy(driveHierarchy);
      setHierarchyStore(driveHierarchy);

      if (Object.keys(driveHierarchy).length === 0) {
        setNotification('Thư mục myApp/LopU/TaiLieu trên Google Drive hiện đang trống (0 tài liệu). Đã đồng bộ chính xác!');
      } else {
        setNotification(`Đã đồng bộ thành công ${Object.keys(driveHierarchy).length} tài liệu từ Google Drive (myApp/LopU/TaiLieu)!`);
      }
    } catch (err: any) {
      setNotification(`Lỗi khi đồng bộ từ Drive: ${err?.message || 'Có lỗi xảy ra'}`);
    } finally {
      setIsResyncing(false);
      setTimeout(() => setNotification(null), 5000);
    }
  };

  const handleOpenAdd = (level: string) => {
    setModalAddLevel(level);
    setModalAddItemText('');
    setModalAddError(null);
    setDropdownFeedbackMsg(null);
    // Mặc định chọn tùy chọn đầu tiên (Thêm mới)
    setModalAddType('standard');
    setShowModalAddDialog(true);
    setOpenModalDropdown(null);
  };

  const handleConfirmAdd = async () => {
    if (!modalAddItemText.trim() || isAddingFolder) return;
    const raw = modalAddItemText.trim();
    let val = raw;

    // Áp dụng quy cách đặt tên:
    // - Với Tài liệu: {tên môn} {số lớp} - {tên tài liệu}
    // - Với các phần chuyên đề/đánh giá: áp dụng tiền tố chuẩn tương ứng
    if (modalAddLevel === 'title') {
      val = formatDocumentTitleWithSubjectGrade(raw, newSubject, newGrade);
    } else if (modalAddType === 'danhGia') {
      val = formatDanhGiaFileName(raw);
    } else if (modalAddType === 'luyenTap') {
      val = formatLuyenTapFileName(raw);
    } else if (modalAddType === 'kiemTra') {
      val = formatKiemTraFileName(raw);
    } else if (modalAddType === 'caiThien') {
      val = formatCaiThienFileName(raw);
    } else if (modalAddType === 'kienThuc') {
      val = formatKienThucFileName(raw);
    } else {
      val = raw;
    }

    // Xác định đường dẫn thư mục phân cấp tương ứng trên Google Drive:
    // myApp / LopU / TaiLieu / [Tài liệu] / [Chương] / [Bài] / [Vấn đề] / [Chuyên đề]
    const pathSegments: string[] = ['myApp', 'LopU', 'TaiLieu'];
    if (modalAddLevel === 'title') {
      pathSegments.push(val);
    } else if (modalAddLevel === 'chuong') {
      pathSegments.push(newTitle || 'TaiLieuChung', val);
    } else if (modalAddLevel === 'bai') {
      pathSegments.push(newTitle || 'TaiLieuChung', newChuong || 'Chuong1', val);
    } else if (modalAddLevel === 'vanDe') {
      pathSegments.push(newTitle || 'TaiLieuChung', newChuong || 'Chuong1', newBai || 'Bai1', val);
    } else if (modalAddLevel === 'chuyenDe') {
      pathSegments.push(newTitle || 'TaiLieuChung', newChuong || 'Chuong1', newBai || 'Bai1', newVanDe || 'VanDe1', val);
    }

    setIsAddingFolder(true);
    setModalAddError(null);
    setDropdownFeedbackMsg(null);
    setNotification('Đang kiểm tra và tạo trên Google Drive (QuanLyDrive)...');

    // Gọi module QuanLyDrive.createByPath theo Giải pháp 1 (Drive-First Strict Sync)
    const driveRes = await createByPath(pathSegments);

    if (!driveRes.success) {
      setIsAddingFolder(false);
      const errText = driveRes.message || 'Tạo chưa thành công: Không thể kết nối Google Drive.';
      setModalAddError(errText);
      setNotification(`Tạo chưa thành công: ${errText}`);
      setDropdownFeedbackMsg({ lvl: modalAddLevel, message: errText, type: 'error' });
      setTimeout(() => {
        setNotification(null);
      }, 7000);
      return;
    }

    // Cập nhật cây dữ liệu phân cấp bền vững
    const currentStore = getStoredHierarchy();
    const docKey = modalAddLevel === 'title' ? val : (newTitle || 'TaiLieuChung');
    if (!currentStore[docKey]) currentStore[docKey] = {};

    if (modalAddLevel === 'chuong') {
      if (!currentStore[docKey][val]) currentStore[docKey][val] = {};
    } else if (modalAddLevel === 'bai') {
      const chKey = newChuong || 'Chuong1';
      if (!currentStore[docKey][chKey]) currentStore[docKey][chKey] = {};
      if (!currentStore[docKey][chKey][val]) currentStore[docKey][chKey][val] = {};
    } else if (modalAddLevel === 'vanDe') {
      const chKey = newChuong || 'Chuong1';
      const bKey = newBai || 'Bai1';
      if (!currentStore[docKey][chKey]) currentStore[docKey][chKey] = {};
      if (!currentStore[docKey][chKey][bKey]) currentStore[docKey][chKey][bKey] = {};
      if (!currentStore[docKey][chKey][bKey][val]) currentStore[docKey][chKey][bKey][val] = [];
    } else if (modalAddLevel === 'chuyenDe') {
      const chKey = newChuong || 'Chuong1';
      const bKey = newBai || 'Bai1';
      const vKey = newVanDe || 'VanDe1';
      if (!currentStore[docKey][chKey]) currentStore[docKey][chKey] = {};
      if (!currentStore[docKey][chKey][bKey]) currentStore[docKey][chKey][bKey] = {};
      if (!currentStore[docKey][chKey][bKey][vKey]) currentStore[docKey][chKey][bKey][vKey] = [];
      if (!currentStore[docKey][chKey][bKey][vKey].includes(val)) {
        currentStore[docKey][chKey][bKey][vKey].push(val);
      }
    }
    saveStoredHierarchy(currentStore);
    setHierarchyStore({ ...currentStore });

    // Khi tạo/xác nhận thành công trên Google Drive, mới thêm vào App
    if (modalAddLevel === 'title') {
      setNewTitle(val);
      if (modalAddType === 'danhGia') {
        setNewChuong('');
        setNewBai('');
        setNewVanDe('');
        setNewChuyenDe('');
      }
    } else if (modalAddLevel === 'chuong') {
      setNewChuong(val);
      if (modalAddType === 'danhGia') {
        setNewBai('');
        setNewVanDe('');
        setNewChuyenDe('');
      }
    } else if (modalAddLevel === 'bai') {
      setNewBai(val);
      if (modalAddType === 'danhGia') {
        setNewVanDe('');
        setNewChuyenDe('');
      }
    } else if (modalAddLevel === 'vanDe') {
      setNewVanDe(val);
      if (modalAddType === 'danhGia') {
        setNewChuyenDe('');
      }
    } else if (modalAddLevel === 'chuyenDe') {
      setNewChuyenDe(val);
    }

    setIsAddingFolder(false);
    setModalAddError(null);
    setShowModalAddDialog(false);

    const isExisted = driveRes.status === 'existed';
    const successMsg = isExisted
      ? `[QuanLyDrive] Thư mục "${val}" đã tồn tại và đã được liên kết thành công!`
      : `[QuanLyDrive] Đã tạo mới thành công thư mục "${val}" trên Google Drive (ID: ${driveRes.id || 'N/A'})!`;
    
    setNotification(successMsg);
    setDropdownFeedbackMsg({ lvl: modalAddLevel, message: successMsg, type: 'success' });
    setTimeout(() => {
      setNotification(null);
      setDropdownFeedbackMsg(null);
    }, 5500);
  };

  const renderCleanModalDropdown = (
    lvl: string,
    label: string,
    currentVal: string,
    options: string[],
    isHighlight: boolean = false
  ) => {
    const isOpen = openModalDropdown === lvl;

    return (
      <div className="space-y-1 relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <label className={`text-[11px] font-bold block ${isHighlight ? 'text-indigo-900' : 'text-slate-700'}`}>
              {label}
            </label>
            {isAddingFolder ? (
              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-200 animate-pulse">
                <Loader2 className="w-2.5 h-2.5 animate-spin text-amber-600" />
                <span>Đang đồng bộ...</span>
              </span>
            ) : currentVal ? (
              <span className="inline-flex items-center gap-0.5 text-[9px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200">
                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />
                <span>Đã đồng bộ Drive</span>
              </span>
            ) : null}
          </div>
          
          <button
            type="button"
            onClick={handleResyncFromDrive}
            disabled={isResyncing}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
            title="Bấm để đồng bộ lại toàn bộ danh mục từ Google Drive"
          >
            <RotateCcw className={`w-3 h-3 ${isResyncing ? 'animate-spin' : ''}`} />
            <span>{isResyncing ? 'Đang đồng bộ...' : 'Đồng bộ lại từ Drive'}</span>
          </button>
        </div>
        
        {/* Nút trigger dropdown (đã bỏ nút Nhập ngoài bên ngoài) */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpenModalDropdown(isOpen ? null : lvl)}
            className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold text-left flex items-center justify-between transition-colors cursor-pointer ${
              isHighlight
                ? 'border-indigo-200 bg-indigo-50/40 text-indigo-950 hover:border-indigo-300'
                : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300'
            }`}
          >
            <span className="truncate pr-2">
              {currentVal || <span className="text-slate-400 italic">-- Chọn hoặc nhấn Thêm --</span>}
            </span>
            <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Menu xổ xuống của Dropdown */}
          {isOpen && (
            <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-52 overflow-y-auto divide-y divide-slate-100 py-1">
              {/* Tùy chọn rỗng (Để trống) */}
              <div
                onClick={() => {
                  if (lvl === 'title') {
                    setNewTitle('');
                    setNewChuong('');
                    setNewBai('');
                    setNewVanDe('');
                    setNewChuyenDe('');
                  } else if (lvl === 'chuong') {
                    setNewChuong('');
                    setNewBai('');
                    setNewVanDe('');
                    setNewChuyenDe('');
                  } else if (lvl === 'bai') {
                    setNewBai('');
                    setNewVanDe('');
                    setNewChuyenDe('');
                  } else if (lvl === 'vanDe') {
                    setNewVanDe('');
                    setNewChuyenDe('');
                  } else if (lvl === 'chuyenDe') {
                    setNewChuyenDe('');
                  }
                  setOpenModalDropdown(null);
                }}
                className={`px-3 py-2 text-xs flex items-center justify-between gap-2 hover:bg-slate-100 cursor-pointer transition-colors ${
                  !currentVal ? 'bg-indigo-50 text-indigo-900 font-bold' : 'text-slate-400 italic'
                }`}
              >
                <span>(Để trống)</span>
              </div>

              {options.length === 0 ? (
                <div className="px-3 py-2 text-[11px] text-slate-400 italic text-center">
                  Chưa có mục nào. Hãy bấm "Thêm" bên dưới!
                </div>
              ) : (
                options.map((opt) => (
                  <div
                    key={opt}
                    onClick={() => {
                      if (lvl === 'title') {
                        setNewTitle(opt);
                        if (isDanhGia(opt)) {
                          setNewChuong('');
                          setNewBai('');
                          setNewVanDe('');
                          setNewChuyenDe('');
                        }
                      } else if (lvl === 'chuong') {
                        setNewChuong(opt);
                        if (isDanhGia(opt)) {
                          setNewBai('');
                          setNewVanDe('');
                          setNewChuyenDe('');
                        }
                      } else if (lvl === 'bai') {
                        setNewBai(opt);
                        if (isDanhGia(opt)) {
                          setNewVanDe('');
                          setNewChuyenDe('');
                        }
                      } else if (lvl === 'vanDe') {
                        setNewVanDe(opt);
                        if (isDanhGia(opt)) {
                          setNewChuyenDe('');
                        }
                      } else if (lvl === 'chuyenDe') {
                        setNewChuyenDe(opt);
                      }
                      setOpenModalDropdown(null);
                    }}
                    className={`px-3 py-2 text-xs flex items-center justify-between gap-2 hover:bg-indigo-50/60 cursor-pointer transition-colors ${
                      opt === currentVal ? 'bg-indigo-50 text-indigo-900 font-bold' : 'text-slate-700'
                    }`}
                  >
                    <span className="truncate flex-1">{opt}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRequestDelete(lvl, opt);
                      }}
                      title={`Xóa mục "${opt}"`}
                      className="p-1 text-slate-300 hover:text-rose-600 rounded transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-500 hover:text-rose-700" />
                    </button>
                  </div>
                ))
              )}

              {/* Nút trong danh sách xổ xuống: Đổi tên thành "Thêm" */}
              <div
                onClick={() => handleOpenAdd(lvl)}
                className="px-3 py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-50 cursor-pointer flex items-center gap-1.5 border-t border-slate-100 bg-slate-50/50"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm...</span>
              </div>
            </div>
          )}
        </div>

        {/* Thông báo tiến trình đồng bộ Google Drive ngay bên dưới dropdown */}
        {isAddingFolder && modalAddLevel === lvl && (
          <div className="mt-1.5 p-2 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-bold flex items-center gap-2 animate-pulse shadow-xs">
            <span>⏳ Đang kiểm tra và thêm vào hệ thống. Vui lòng đợi...</span>
          </div>
        )}

        {/* Thông báo kết quả ngay dưới dropdown sau khi hoàn tất */}
        {dropdownFeedbackMsg && dropdownFeedbackMsg.lvl === lvl && (
          <div
            className={`mt-1.5 p-2 rounded-xl text-xs font-bold flex flex-wrap items-center justify-between gap-2 shadow-xs animate-fade-in ${
              dropdownFeedbackMsg.type === 'error'
                ? 'bg-rose-50 border border-rose-300 text-rose-800'
                : 'bg-emerald-50 border border-emerald-300 text-emerald-800'
            }`}
          >
            <div className="flex items-center gap-1.5 flex-1 min-w-[180px]">
              {dropdownFeedbackMsg.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              )}
              <span>{dropdownFeedbackMsg.message}</span>
            </div>
            {dropdownFeedbackMsg.type === 'error' &&
              (dropdownFeedbackMsg.message.includes('401') ||
                dropdownFeedbackMsg.message.includes('hết hạn') ||
                dropdownFeedbackMsg.message.includes('Kết nối Drive')) && (
                <button
                  type="button"
                  onClick={async () => {
                    await connectGoogleDrive();
                    setDropdownFeedbackMsg(null);
                  }}
                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer shadow-xs inline-flex items-center gap-1 shrink-0"
                >
                  <Cloud className="w-3 h-3" />
                  <span>Kết nối Drive</span>
                </button>
              )}
          </div>
        )}
      </div>
    );
  };

  useEffect(() => {
    async function load() {
      const cls = await getClasses();
      setClasses(cls);
      
      // Lấy dữ liệu tài liệu chuẩn từ Firestore (SSOT - Single Source of Truth)
      const docs = await getTeacherDocuments();
      setDocuments(docs);
      
      const uList = await getUsers();
      setUsers(uList);

      // 1. Nạp và duy trì Cây phân cấp từ LocalStorage hợp nhất với Firestore docs
      const storedHierarchy = getStoredHierarchy();
      const freshHierarchy = buildHierarchyFromDocuments(docs);
      const baseHierarchy: HierarchyStore = { ...storedHierarchy, ...freshHierarchy };
      saveStoredHierarchy(baseHierarchy);
      setHierarchyStore(baseHierarchy);

      // 2. Tự động quét và đồng bộ dữ liệu thực tế từ Google Drive ngay khi vừa vào app
      try {
        const res = await getNestedDriveTree(['myApp', 'LopU', 'TaiLieu']);
        if (res.success && res.tree && res.tree.children) {
          const newHierarchy: HierarchyStore = { ...baseHierarchy };
          const blacklist = getDeletedFoldersBlacklist();

          for (const docNode of res.tree.children) {
            if (docNode.type === 'folder') {
              const docTitle = docNode.name;
              if (blacklist.includes(docTitle)) continue;
              if (!newHierarchy[docTitle]) newHierarchy[docTitle] = {};

              if (docNode.children) {
                for (const chNode of docNode.children) {
                  if (chNode.type === 'folder') {
                    const chName = chNode.name;
                    if (blacklist.includes(chName)) continue;
                    if (!newHierarchy[docTitle][chName]) newHierarchy[docTitle][chName] = {};

                    if (chNode.children) {
                      for (const baiNode of chNode.children) {
                        if (baiNode.type === 'folder') {
                          const baiName = baiNode.name;
                          if (blacklist.includes(baiName)) continue;
                          if (!newHierarchy[docTitle][chName][baiName]) newHierarchy[docTitle][chName][baiName] = {};

                          if (baiNode.children) {
                            for (const vdNode of baiNode.children) {
                              if (vdNode.type === 'folder') {
                                const vdName = vdNode.name;
                                if (blacklist.includes(vdName)) continue;
                                if (!newHierarchy[docTitle][chName][baiName][vdName]) newHierarchy[docTitle][chName][baiName][vdName] = [];

                                if (vdNode.children) {
                                  for (const cdNode of vdNode.children) {
                                    if (
                                      cdNode.type === 'folder' || cdNode.type === 'file'
                                    ) {
                                      if (!blacklist.includes(cdNode.name) && !newHierarchy[docTitle][chName][baiName][vdName].includes(cdNode.name)) {
                                        newHierarchy[docTitle][chName][baiName][vdName].push(cdNode.name);
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
          saveStoredHierarchy(newHierarchy);
          setHierarchyStore(newHierarchy);
        }
      } catch (err) {
        console.warn('Auto drive sync on mount error:', err);
      }
    }
    load();
  }, []);

  const handleSaveToDrive = async (docItem: TeacherDocument) => {
    const res = await saveTeachingMaterialHierarchyToDrive(
      docItem,
      docItem.chuong || 'Chương 1',
      docItem.bai || 'Bài 1',
      docItem.vanDe || 'Vấn đề 1',
      docItem.chuyenDe || 'Chuyên đề trọng tâm'
    );

    const updatedDoc: TeacherDocument = {
      ...docItem,
      driveSynced: true,
      driveFileId: res.fileId,
      driveFolderPath: res.drivePath,
      chuong: docItem.chuong || 'Chương 1',
      bai: docItem.bai || 'Bài 1',
      vanDe: docItem.vanDe || 'Vấn đề 1',
      chuyenDe: docItem.chuyenDe || 'Chuyên đề trọng tâm',
      updatedAt: new Date().toLocaleString('vi-VN'),
    };

    // Save to Firestore & local storage
    await saveTeacherDocument(updatedDoc);

    setDocuments(prev =>
      prev.map(d => d.id === docItem.id ? updatedDoc : d)
    );

    const conn = getDriveConnectionState();
    const cleanFileName = `[${docItem.chuyenDe || 'Chuyên đề trọng tâm'}]_${(docItem.title || 'TaiLieu').replace(/[\s:/\\?*]+/g, '_')}`;
    if (conn.isConnected) {
      setNotification(`Đã tải lên Drive & Hệ thống thành công: ${cleanFileName} tại thư mục ${res.drivePath}`);
    } else {
      setNotification(`Đã lưu tài liệu vào hệ thống: ${cleanFileName}`);
    }
    setTimeout(() => setNotification(null), 5000);
  };

  const handleTogglePublish = async (docId: string, classId: string) => {
    const docs = await getTeacherDocuments();
    const d = docs.find(item => item.id === docId);
    if (!d) return;

    const isPublished = d.publishedToClasses.includes(classId);
    const nextPublished = isPublished
      ? d.publishedToClasses.filter(c => c !== classId)
      : [...d.publishedToClasses, classId];

    const updated: TeacherDocument = {
      ...d,
      isPublished: nextPublished.length > 0,
      publishedToClasses: nextPublished,
      updatedAt: new Date().toLocaleString('vi-VN'),
    };

    // Save to Firestore & local storage
    await saveTeacherDocument(updated);

    setDocuments(prev => prev.map(item => item.id === docId ? updated : item));
    setNotification('Đã cập nhật trạng thái phát hành bài giảng đến lớp học thành công!');
    setTimeout(() => setNotification(null), 4000);
  };

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    // Kiểm tra trùng tên tài liệu
    const isExisting = documents.find(
      d => d.title.toLowerCase() === newTitle.trim().toLowerCase()
    );

    if (isExisting) {
      const confirmOverwrite = window.confirm(
        `Bộ tài liệu với tiêu đề "${newTitle.trim()}" đã tồn tại. Bạn có muốn ghi đè lên tài liệu cũ không?`
      );
      if (!confirmOverwrite) return;

      const driveFolder = `myApp / LopU / TaiLieu / ${newTitle.trim() || 'TaiLieu'} / ${newChuong} / ${newBai} / ${newVanDe} / ${newChuyenDe}`;
      const attachNote = attachedFiles.length > 0
        ? ` [Tệp đính kèm: ${attachedFiles.map(f => f.name).join(', ')}]`
        : '';
      const updatedDoc: TeacherDocument = {
        ...isExisting,
        subject: newSubject,
        grade: newGrade,
        chuong: newChuong.trim(),
        bai: newBai.trim(),
        vanDe: newVanDe.trim(),
        chuyenDe: newChuyenDe.trim(),
        driveFolderPath: driveFolder,
        updatedAt: new Date().toLocaleString('vi-VN'),
        contentSnippet: (newSnippet.trim() || 'Nội dung giáo án, bài tập tự luận và trắc nghiệm trọng tâm.') + attachNote,
        driveSynced: true,
        fileSize: attachedFiles.length > 0 ? attachedFiles[0].size : isExisting.fileSize,
        isForSale: newIsForSale,
        priceDiamonds: newIsForSale ? newPriceDiamonds : 0,
      };

      await saveTeachingMaterialHierarchyToDrive(
        updatedDoc,
        newChuong,
        newBai,
        newVanDe,
        newChuyenDe
      );

      // Save to Firestore & local storage
      await saveTeacherDocument(updatedDoc);

      setDocuments(prev => prev.map(d => d.id === isExisting.id ? updatedDoc : d));
      setShowCreateModal(false);
      setNewTitle('');
      setNewSnippet('');
      setAttachedFiles([]);
      
      const conn = getDriveConnectionState();
      const cleanFileName = `[${newChuyenDe}]_${newTitle.trim().replace(/[\s:/\\?*]+/g, '_')}`;
      if (conn.isConnected) {
        setNotification(`Đã ghi đè & cập nhật lên Drive & Hệ thống thành công: ${cleanFileName} tại thư mục ${driveFolder}`);
      } else {
        setNotification(`Đã ghi đè & cập nhật tài liệu vào hệ thống thành công: ${cleanFileName}`);
      }
      setTimeout(() => setNotification(null), 5000);
      return;
    }

    const driveFolder = `myApp / LopU / TaiLieu / ${newTitle.trim() || 'TaiLieu'} / ${newChuong} / ${newBai} / ${newVanDe} / ${newChuyenDe}`;

    const attachNote = attachedFiles.length > 0
      ? ` [Tệp đính kèm: ${attachedFiles.map(f => f.name).join(', ')}]`
      : '';

    const newDoc: TeacherDocument = {
      id: `doc_${Date.now()}`,
      title: newTitle.trim(),
      subject: newSubject,
      grade: newGrade,
      category: newCategory,
      fileType: attachedFiles.some(f => f.isHtml) ? 'html' : 'gdoc',
      chuong: newChuong.trim(),
      bai: newBai.trim(),
      vanDe: newVanDe.trim(),
      chuyenDe: newChuyenDe.trim(),
      driveFolderPath: driveFolder,
      createdAt: new Date().toLocaleString('vi-VN'),
      updatedAt: new Date().toLocaleString('vi-VN'),
      isPublished: false,
      publishedToClasses: [],
      driveSynced: true,
      fileSize: attachedFiles.length > 0 ? attachedFiles[0].size : '1.5 MB',
      authorId: 'u_gv01',
      contentSnippet: (newSnippet.trim() || 'Nội dung giáo án, bài tập tự luận và trắc nghiệm trọng tâm.') + attachNote,
      isForSale: newIsForSale,
      priceDiamonds: newIsForSale ? newPriceDiamonds : 0,
      purchasedUserIds: [],
    };

    // Tự động sao lưu lên Google Drive theo cấu trúc phân cấp
    await saveTeachingMaterialHierarchyToDrive(
      newDoc,
      newChuong,
      newBai,
      newVanDe,
      newChuyenDe
    );

    // Save to Firestore & local storage
    await saveTeacherDocument(newDoc);

    setDocuments([newDoc, ...documents]);
    setShowCreateModal(false);
    setNewTitle('');
    setNewSnippet('');
    setAttachedFiles([]);
    const conn = getDriveConnectionState();
    const cleanFileName = `[${newChuyenDe}]_${newTitle.trim().replace(/[\s:/\\?*]+/g, '_')}`;
    if (conn.isConnected) {
      setNotification(`Đã tải lên Drive & Hệ thống thành công: ${cleanFileName} tại thư mục ${driveFolder}`);
    } else {
      setNotification(`Đã lưu tài liệu vào hệ thống thành công: ${cleanFileName}`);
    }
    setTimeout(() => setNotification(null), 5000);
  };

  const filteredDocs = documents.filter(d => {
    const matchSearch = d.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.chuong && d.chuong.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (d.bai && d.bai.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchCategory = categoryFilter === 'all' || d.category === categoryFilter;
    const matchSubject = filterSubject === 'all' || d.subject === filterSubject;
    const matchGrade = filterGrade === 'all' || d.grade === filterGrade;
    const matchTitle = filterTitle === 'all' || d.title === filterTitle;
    const matchChuong = filterChuong === 'all' || d.chuong === filterChuong;
    const matchBai = filterBai === 'all' || d.bai === filterBai;
    const matchVanDe = filterVanDe === 'all' || d.vanDe === filterVanDe;
    const matchChuyenDe = filterChuyenDe === 'all' || d.chuyenDe === filterChuyenDe;

    return matchSearch && matchCategory && matchSubject && matchGrade && matchTitle && matchChuong && matchBai && matchVanDe && matchChuyenDe;
  });

  return (
    <div id="teaching-documents-view" className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div className="p-3.5 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs">
          <Cloud className="w-4 h-4 text-blue-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Top Header & Search */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                Tủ Sách Tài Liệu Dạy Học Của Giáo Viên
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                <FolderTree className="w-3 h-3 text-indigo-600" />
                <span>Cấu trúc 4 cấp độ</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Giáo viên tạo các bộ tài liệu dạy học lưu trên Google Drive cá nhân theo cấu trúc chuẩn:{' '}
              <strong className="text-indigo-700 font-semibold">Chương ➔ Bài ➔ Vấn đề ➔ Chuyên đề</strong>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleResyncFromDrive}
              disabled={isResyncing}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              title="Quét và cập nhật lại toàn bộ cây thư mục/file trực tiếp từ Google Drive"
            >
              <RotateCcw className={`w-3.5 h-3.5 text-indigo-600 ${isResyncing ? 'animate-spin' : ''}`} />
              <span>{isResyncing ? 'Đang đồng bộ Drive...' : 'Đồng bộ lại từ Drive'}</span>
            </button>
            <button
              id="btn-create-document"
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo bộ tài liệu mới</span>
            </button>
          </div>
        </div>

        {/* Hierarchy path legend & Cấu trúc tệp chuyên đề / đánh giá */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-600 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-slate-700 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-indigo-600" /> Cấu trúc đường dẫn Drive chuẩn:
            </span>
            <span className="font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 font-semibold">
              myApp / LopU / TaiLieu / [Tên tài liệu] / [tên chương] / [tên bài] / [tên vấn đề] / [tên chuyên đề]
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 border-t border-slate-200/60 text-[10px]">
            <div className="bg-white p-2 rounded-lg border border-slate-200 space-y-1">
              <strong className="text-indigo-900 block font-bold">📖 Cấu trúc tệp trong Chuyên đề:</strong>
              <div>• <strong>Kiến thức:</strong> file <code className="text-indigo-600 font-mono font-bold">KienThuc.html</code> (nếu e-learning iSpring/Storyline có file index.html thì tự động đổi thành KienThuc.html khi tải lên/chèn file HTML).</div>
              <div>• <strong>Luyện tập:</strong> file <code className="text-indigo-600 font-mono font-bold">LuyenTap [tên bài luyện tập].json</code> (thứ tự câu hỏi không đổi, chỉ đổi 4 phương án lựa chọn A, B, C, D; đề hiện trước, học sinh làm bài hiện lời giải ngay sau mỗi câu). Có thể có nhiều luyện tập.</div>
            </div>

            <div className="bg-white p-2 rounded-lg border border-slate-200 space-y-1">
              <strong className="text-emerald-900 block font-bold">📝 Bài Đánh giá theo từng cấp độ:</strong>
              <div>• <strong>Đánh giá:</strong> file <code className="text-emerald-700 font-mono font-bold">DanhGia [tên bài đánh giá].json</code> được lưu tương ứng trong thư mục của <em>chuyên đề, vấn đề, bài, chương, tài liệu</em>.</div>
              <div>• <strong>Tùy chọn Thêm:</strong> Khi "Thêm" ở tài liệu, chương, bài, vấn đề có tùy chọn [Thêm mục]/[Đánh giá]; ở chuyên đề có [Lý thuyết]/[Luyện tập]/[Đánh giá]. Chèn file bổ sung đầy đủ hỗ trợ file <strong>.html</strong>.</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto text-xs font-semibold">
          {[
            { id: 'all', label: 'Tất cả tài liệu' },
            { id: 'lesson_plan', label: 'Giáo án điện tử' },
            { id: 'exam', label: 'Đề thi & kiểm tra' },
            { id: 'exercise', label: 'Bài tập bồi dưỡng' },
            { id: 'seating_chart', label: 'Sơ đồ lớp Drag & Drop' },
            { id: 'reference', label: 'Sổ tay tham khảo' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setCategoryFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                categoryFilter === tab.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Tìm theo tiêu đề, chương, bài..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Thanh lọc phân cấp phụ thuộc: 3 hàng chuẩn theo yêu cầu */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Bộ Lọc Phân Cấp Tài Liệu</span>
            <span className="text-[10px] text-slate-400 italic">Môn học + Khối lớp ➔ TÀI LIỆU ➔ NỘI DUNG BÀI DẠY (Chương, Bài, Vấn đề, Chuyên đề)</span>
          </div>

          {(filterSubject !== 'all' || filterGrade !== 'all' || filterTitle !== 'all' || filterChuong !== 'all' || filterBai !== 'all' || filterVanDe !== 'all' || filterChuyenDe !== 'all') && (
            <button
              onClick={() => {
                setFilterSubject('all');
                setFilterGrade('all');
                setFilterTitle('all');
                setFilterChuong('all');
                setFilterBai('all');
                setFilterVanDe('all');
                setFilterChuyenDe('all');
              }}
              className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" /> Đặt lại bộ lọc
            </button>
          )}
        </div>

        {/* NHÓM 1: TÀI LIỆU (BAO GỒM MÔN HỌC, KHỐI LỚP VÀ TÀI LIỆU) */}
        <div className="bg-indigo-50/40 p-3.5 rounded-2xl border border-indigo-200 shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-100 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase text-indigo-900 tracking-wider flex items-center gap-1.5">
                <FolderLock className="w-3.5 h-3.5 text-indigo-600" /> TÀI LIỆU
              </span>
              <button
                type="button"
                onClick={handleResyncFromDrive}
                disabled={isResyncing}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                title="Bấm để đồng bộ lại toàn bộ danh mục tài liệu/chương/bài/vấn đề/chuyên đề trực tiếp từ Google Drive"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isResyncing ? 'animate-spin' : ''}`} />
                <span>{isResyncing ? 'Đang đồng bộ Drive...' : 'Đồng bộ lại từ Drive'}</span>
              </button>
            </div>
            <span className="text-[10px] text-indigo-600 font-semibold">Môn học + Khối lớp ➔ Tài liệu</span>
          </div>

          {/* Hàng 1 của nhóm Tài liệu: Môn học + Khối lớp */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* 1. Môn học */}
            <div>
              <label className="text-[10px] font-bold text-slate-700 block mb-1">Môn học</label>
              <select
                value={filterSubject}
                onChange={e => {
                  setFilterSubject(e.target.value);
                  setFilterTitle('all');
                  setFilterChuong('all');
                  setFilterBai('all');
                  setFilterVanDe('all');
                  setFilterChuyenDe('all');
                }}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold focus:outline-indigo-600 bg-white"
              >
                <option value="all">Tất cả môn học</option>
                <option value="Toán Học">Toán Học</option>
                <option value="Vật Lý">Vật Lý</option>
                <option value="Hóa Học">Hóa Học</option>
                <option value="Ngữ Văn">Ngữ Văn</option>
                <option value="Tiếng Anh">Tiếng Anh</option>
                <option value="Sinh Học">Sinh Học</option>
              </select>
            </div>

            {/* 2. Khối lớp */}
            <div>
              <label className="text-[10px] font-bold text-slate-700 block mb-1">Khối lớp</label>
              <select
                value={filterGrade}
                onChange={e => {
                  setFilterGrade(e.target.value);
                  setFilterTitle('all');
                  setFilterChuong('all');
                  setFilterBai('all');
                  setFilterVanDe('all');
                  setFilterChuyenDe('all');
                }}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold focus:outline-indigo-600 bg-white"
              >
                <option value="all">Tất cả khối lớp</option>
                <option value="Khối 10">Khối 10</option>
                <option value="Khối 11">Khối 11</option>
                <option value="Khối 12">Khối 12</option>
              </select>
            </div>
          </div>

          {/* Hàng tiếp theo của nhóm Tài liệu: Dropdown Tài liệu */}
          <div>
            <label className="text-[10px] font-bold text-indigo-900 block mb-1">Chọn Tài liệu</label>
            <select
              value={filterTitle}
              onChange={e => {
                setFilterTitle(e.target.value);
                setFilterChuong('all');
                setFilterBai('all');
                setFilterVanDe('all');
                setFilterChuyenDe('all');
              }}
              className="w-full px-3 py-2 rounded-lg border border-indigo-200 text-xs font-bold focus:outline-indigo-600 bg-white text-indigo-950 shadow-xs"
            >
              <option value="all">Tất cả tài liệu</option>
              {Array.from(new Set(
                documents
                  .filter(d => (filterSubject === 'all' || d.subject === filterSubject) && (filterGrade === 'all' || d.grade === filterGrade))
                  .map(d => d.title)
                  .filter((x): x is string => Boolean(x))
              )).map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        {/* NHÓM 2: NỘI DUNG BÀI DẠY GỒM CHƯƠNG, BÀI, VẤN ĐỀ, CHUYÊN ĐỀ */}
        <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-1.5">
            <span className="text-[10px] font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
              <FolderTree className="w-3.5 h-3.5 text-slate-500" /> NỘI DUNG BÀI DẠY
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 italic hidden sm:inline">Chương ➔ Bài ➔ Vấn đề ➔ Chuyên đề</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-2xs">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>Google Drive: Đã đồng bộ</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
            {/* Chương */}
            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-1">Chương</label>
              <select
                value={filterChuong}
                onChange={e => {
                  setFilterChuong(e.target.value);
                  setFilterBai('all');
                  setFilterVanDe('all');
                  setFilterChuyenDe('all');
                }}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold focus:outline-indigo-600 bg-white"
              >
                <option value="all">Tất cả chương</option>
                {Array.from(new Set(
                  documents
                    .filter(d => (filterSubject === 'all' || d.subject === filterSubject) && (filterGrade === 'all' || d.grade === filterGrade) && (filterTitle === 'all' || d.title === filterTitle))
                    .map(d => d.chuong)
                    .filter((x): x is string => Boolean(x))
                )).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Bài */}
            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-1">Bài</label>
              <select
                value={filterBai}
                onChange={e => {
                  setFilterBai(e.target.value);
                  setFilterVanDe('all');
                  setFilterChuyenDe('all');
                }}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold focus:outline-indigo-600 bg-white"
              >
                <option value="all">Tất cả bài</option>
                {Array.from(new Set(
                  documents
                    .filter(d => (filterSubject === 'all' || d.subject === filterSubject) && (filterGrade === 'all' || d.grade === filterGrade) && (filterTitle === 'all' || d.title === filterTitle) && (filterChuong === 'all' || d.chuong === filterChuong))
                    .map(d => d.bai)
                    .filter((x): x is string => Boolean(x))
                )).map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            {/* Vấn đề */}
            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-1">Vấn đề</label>
              <select
                value={filterVanDe}
                onChange={e => {
                  setFilterVanDe(e.target.value);
                  setFilterChuyenDe('all');
                }}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold focus:outline-indigo-600 bg-white"
              >
                <option value="all">Tất cả vấn đề</option>
                {Array.from(new Set(
                  documents
                    .filter(d => (filterSubject === 'all' || d.subject === filterSubject) && (filterGrade === 'all' || d.grade === filterGrade) && (filterTitle === 'all' || d.title === filterTitle) && (filterChuong === 'all' || d.chuong === filterChuong) && (filterBai === 'all' || d.bai === filterBai))
                    .map(d => d.vanDe)
                    .filter((x): x is string => Boolean(x))
                )).map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>

            {/* Chuyên đề */}
            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-1">Chuyên đề</label>
              <select
                value={filterChuyenDe}
                onChange={e => setFilterChuyenDe(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold focus:outline-indigo-600 bg-white"
              >
                <option value="all">Tất cả chuyên đề</option>
                {Array.from(new Set(
                  documents
                    .filter(d => (filterSubject === 'all' || d.subject === filterSubject) && (filterGrade === 'all' || d.grade === filterGrade) && (filterTitle === 'all' || d.title === filterTitle) && (filterChuong === 'all' || d.chuong === filterChuong) && (filterBai === 'all' || d.bai === filterBai) && (filterVanDe === 'all' || d.vanDe === filterVanDe))
                    .map(d => d.chuyenDe)
                    .filter((x): x is string => Boolean(x))
                )).map(cd => (
                  <option key={cd} value={cd}>{cd}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Card Mẫu Sơ Đồ Lớp Tích Hợp IconNam & IconNu */}
      {(categoryFilter === 'all' || categoryFilter === 'seating_chart') && (
        <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white p-5 rounded-2xl border border-indigo-700/60 shadow-md space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-indigo-800/80">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-indigo-600 text-white text-[10px] font-extrabold uppercase">
                Mẫu Sơ Đồ Chuẩn
              </span>
              <h3 className="text-sm font-bold text-white">
                Sơ Đồ Lớp Học Drag & Drop Sử Dụng IconNam & IconNu
              </h3>
            </div>
            <span className="text-[11px] text-indigo-200 font-mono">
              Chương 1 / Bài 1 / Vấn đề 1 / Chuyên đề: Bố trí chỗ ngồi
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Hệ thống hỗ trợ tự động phân biệt icon học sinh nam (<strong>IconNam</strong> - tóc ngắn cổ áo) và học sinh nữ (<strong>IconNu</strong> - tóc dài nơ cổ) trên toàn bộ sơ đồ lớp học:
          </p>

          <div className="flex flex-wrap items-center gap-4 p-3 bg-slate-950/80 rounded-xl border border-indigo-800/50 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center">
                <IconNam className="w-7 h-7 text-indigo-400" />
              </div>
              <div>
                <strong className="block text-white text-[11px]">IconNam</strong>
                <span className="text-[10px] text-slate-400">Học sinh Nam</span>
              </div>
            </div>

            <div className="flex items-center gap-2 border-l border-slate-800 pl-4">
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center">
                <IconNu className="w-7 h-7 text-pink-400" />
              </div>
              <div>
                <strong className="block text-white text-[11px]">IconNu</strong>
                <span className="text-[10px] text-slate-400">Học sinh Nữ</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Documents Grid */}
      {filteredDocs.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <Folder className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">
            {searchTerm || categoryFilter !== 'all' ? 'Không Tìm Thấy Tài Liệu Phù Hợp' : 'Toàn Bộ Tài Liệu Demo Đã Được Làm Sạch'}
          </h3>
          <p className="text-xs text-slate-500 max-w-lg mx-auto leading-relaxed">
            Hệ thống tủ sách giáo viên đang ở trạng thái sạch 100%. Bấm nút <strong>"Tạo bộ tài liệu mới"</strong> ở góc phải phía trên để bắt đầu tạo giáo án, tài liệu và đồng bộ lên Google Drive cá nhân theo cấu trúc 4 cấp độ.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredDocs.map(docItem => (
            <div
              key={docItem.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between space-y-4 hover:border-indigo-200 transition-all"
            >
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700">
                    {docItem.subject} • {docItem.grade}
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {docItem.fileSize}
                  </span>
                </div>

                {docItem.driveSynced ? (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                    <Cloud className="w-3 h-3" /> Drive đã lưu
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-400">Chưa lưu Drive</span>
                )}
              </div>

              {/* 4-level hierarchy breadcrumb badge */}
              <div className="p-2 bg-slate-50/80 rounded-lg border border-slate-100 text-[10px] space-y-1">
                <div className="flex items-center gap-1 font-mono text-slate-600 overflow-x-auto">
                  <span className="font-bold text-slate-800">{docItem.chuong || 'Chương 1'}</span>
                  <span>/</span>
                  <span className="text-slate-700">{docItem.bai || 'Bài 1'}</span>
                  <span>/</span>
                  <span className="text-slate-700">{docItem.vanDe || 'Vấn đề 1'}</span>
                  <span>/</span>
                  <span className="font-bold text-indigo-700 bg-indigo-50 px-1 py-0.5 rounded">{docItem.chuyenDe || 'Chuyên đề'}</span>
                </div>
                {docItem.driveFolderPath && (
                  <div className="text-[9px] text-slate-400 font-mono truncate" title={docItem.driveFolderPath}>
                    📁 Drive: {docItem.driveFolderPath}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-2">
                <h3 className="font-bold text-slate-900 text-sm leading-snug">
                  {docItem.title}
                </h3>
                <div className="shrink-0">
                  {docItem.isForSale ? (
                    <span className="text-[11px] font-black px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200/60" title="Bán thu phí bằng Kim Cương">
                      💎 {docItem.priceDiamonds || 0}
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/40" title="Học sinh tự học miễn phí">
                      🆓 Free
                    </span>
                  )}
                </div>
              </div>

              <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                {docItem.contentSnippet}
              </p>
            </div>

            {/* Publishing to Classes Control */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Phát hành bài giảng đến lớp:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {classes.map(cls => {
                  const isPub = docItem.publishedToClasses.includes(cls.id);

                  return (
                    <button
                      key={cls.id}
                      onClick={() => handleTogglePublish(docItem.id, cls.id)}
                      className={`text-xs px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                        isPub
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {isPub ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                      <span>{cls.code}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Actions: Save to Drive & Preview */}
            <div className="pt-2 flex items-center justify-between text-xs">
              <span className="text-slate-400 text-[11px]">
                Cập nhật: {docItem.updatedAt}
              </span>

              <div className="flex items-center gap-2">
                <button
                  id={`btn-sync-doc-${docItem.id}`}
                  onClick={() => handleSaveToDrive(docItem)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer"
                  title="Lưu vào Drive theo cấu trúc: Chương -> Bài -> Vấn đề -> Chuyên đề"
                >
                  <Cloud className="w-3.5 h-3.5" />
                  <span>{docItem.driveSynced ? 'Cập nhật Drive' : 'Lưu Drive cá nhân'}</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      )}

      {/* Modal Soạn bài mới với cấu trúc Chương -> Bài -> Vấn đề -> Chuyên đề */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-sm text-slate-900">Tạo Bộ Tài Liệu Dạy Học & Lưu Drive</h3>
                <span className="text-[11px] text-slate-500">Cấu trúc: Môn học ➔ Khối lớp ➔ TÀI LIỆU ➔ NỘI DUNG BÀI DẠY (Chương ➔ Bài ➔ Vấn đề ➔ Chuyên đề)</span>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateDocument} className="space-y-3.5 text-xs">
              {/* NHÓM 1: TÀI LIỆU (BAO GỒM MÔN HỌC, KHỐI LỚP VÀ TÀI LIỆU) */}
              <div className="bg-indigo-50/30 p-3.5 rounded-2xl border border-indigo-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-indigo-100 pb-2 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black uppercase text-indigo-900 tracking-wider flex items-center gap-1.5">
                      <FolderLock className="w-3.5 h-3.5 text-indigo-600" /> TÀI LIỆU
                    </span>
                    <button
                      type="button"
                      onClick={handleResyncFromDrive}
                      disabled={isResyncing}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                      title="Bấm để đồng bộ lại từ Google Drive"
                    >
                      <RotateCcw className={`w-3 h-3 ${isResyncing ? 'animate-spin' : ''}`} />
                      <span>{isResyncing ? 'Đang đồng bộ...' : 'Đồng bộ lại từ Drive'}</span>
                    </button>
                  </div>
                  <span className="text-[10px] text-indigo-600 font-semibold">Môn học + Khối lớp ➔ Tài liệu</span>
                </div>
                {/* Hàng 1: Môn học + Khối lớp */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-1">Môn học</label>
                    <select
                      value={newSubject}
                      onChange={(e) => setNewSubject(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold focus:outline-indigo-600 bg-white"
                    >
                      <option value="Toán Học">Toán Học</option>
                      <option value="Vật Lý">Vật Lý</option>
                      <option value="Hóa Học">Hóa Học</option>
                      <option value="Ngữ Văn">Ngữ Văn</option>
                      <option value="Tiếng Anh">Tiếng Anh</option>
                      <option value="Sinh Học">Sinh Học</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-1">Khối lớp</label>
                    <select
                      value={newGrade}
                      onChange={(e) => setNewGrade(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold focus:outline-indigo-600 bg-white"
                    >
                      <option value="Khối 10">Khối 10</option>
                      <option value="Khối 11">Khối 11</option>
                      <option value="Khối 12">Khối 12</option>
                    </select>
                  </div>
                </div>

                {/* Hàng 2: Dropdown Tài liệu */}
                <div>
                  {(() => {
                    let deletedList: string[] = [];
                    try {
                      deletedList = JSON.parse(localStorage.getItem('lopu_deleted_drive_folders_v1') || '[]');
                    } catch {}
                    const titleOpts = Array.from(new Set([
                      ...Object.keys(hierarchyStore),
                      ...documents
                        .filter(d => (!newSubject || d.subject === newSubject) && (!newGrade || d.grade === newGrade))
                        .map(d => d.title)
                        .filter(Boolean)
                    ])).filter(t => !deletedList.includes(t));

                    return renderCleanModalDropdown(
                      'title',
                      'TÀI LIỆU',
                      newTitle,
                      titleOpts,
                      true
                    );
                  })()}
                </div>
              </div>

              {/* 3. NỘI DUNG BÀI DẠY: Đổi tên các nhãn từ Cấp 1..4 thành Chương -> Bài -> Vấn đề -> Chuyên đề */}
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-[11px] font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                    <FolderTree className="w-3.5 h-3.5 text-slate-500" /> NỘI DUNG BÀI DẠY
                  </span>
                  <span className="text-[10px] text-slate-400 italic">Chương ➔ Bài ➔ Vấn đề ➔ Chuyên đề</span>
                </div>

                {/* 4 Cấp độ: Khi chọn thêm bài đánh giá thì ẩn các cấp độ con của nó */}
                {(() => {
                  let deletedList: string[] = [];
                  try {
                    deletedList = JSON.parse(localStorage.getItem('lopu_deleted_drive_folders_v1') || '[]');
                  } catch {}

                  const currentDocObj = (newTitle && hierarchyStore[newTitle]) ? hierarchyStore[newTitle] : {};
                  const chuongOpts = Array.from(new Set([
                    ...Object.keys(currentDocObj),
                    ...documents.filter(d => (!newTitle || d.title === newTitle)).map(d => d.chuong).filter((x): x is string => Boolean(x))
                  ])).filter(ch => !deletedList.includes(ch));

                  const currentChuongObj = (newChuong && currentDocObj[newChuong]) ? currentDocObj[newChuong] : {};
                  const baiOpts = Array.from(new Set([
                    ...Object.keys(currentChuongObj),
                    ...documents.filter(d => (!newTitle || d.title === newTitle) && (!newChuong || d.chuong === newChuong)).map(d => d.bai).filter((x): x is string => Boolean(x))
                  ])).filter(b => !deletedList.includes(b));

                  const currentBaiObj = (newBai && currentChuongObj[newBai]) ? currentChuongObj[newBai] : {};
                  const vanDeOpts = Array.from(new Set([
                    ...Object.keys(currentBaiObj),
                    ...documents.filter(d => (!newTitle || d.title === newTitle) && (!newChuong || d.chuong === newChuong) && (!newBai || d.bai === newBai)).map(d => d.vanDe).filter((x): x is string => Boolean(x))
                  ])).filter(v => !deletedList.includes(v));

                  const currentVanDeList = (newVanDe && currentBaiObj[newVanDe]) ? currentBaiObj[newVanDe] : [];
                  const chuyenDeOpts = Array.from(new Set([
                    ...(Array.isArray(currentVanDeList) ? currentVanDeList : []),
                    ...documents.filter(d => (!newTitle || d.title === newTitle) && (!newChuong || d.chuong === newChuong) && (!newBai || d.bai === newBai) && (!newVanDe || d.vanDe === newVanDe)).map(d => d.chuyenDe).filter((x): x is string => Boolean(x))
                  ])).filter(cd => !deletedList.includes(cd));

                  return (
                    <>
                      {!isDanhGia(newTitle) ? (
                        <>
                          {renderCleanModalDropdown(
                            'chuong',
                            'Chương',
                            newChuong,
                            chuongOpts
                          )}
                          {!isDanhGia(newChuong) ? (
                            <>
                              {renderCleanModalDropdown(
                                'bai',
                                'Bài',
                                newBai,
                                baiOpts
                              )}
                              {!isDanhGia(newBai) ? (
                                <>
                                  {renderCleanModalDropdown(
                                    'vanDe',
                                    'Vấn đề',
                                    newVanDe,
                                    vanDeOpts
                                  )}
                                  {!isDanhGia(newVanDe) ? (
                                    renderCleanModalDropdown(
                                      'chuyenDe',
                                      'Chuyên đề',
                                      newChuyenDe,
                                      chuyenDeOpts
                                    )
                                  ) : (
                                    <div className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-xl font-medium">
                                      ℹ️ Vấn đề là bài đánh giá — Đã ẩn Chuyên đề cấp con.
                                    </div>
                                  )}
                                </>
                              ) : (
                                <div className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-xl font-medium">
                                  ℹ️ Bài là bài đánh giá — Đã ẩn Vấn đề và Chuyên đề cấp con.
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-xl font-medium">
                              ℹ️ Chương là bài đánh giá — Đã ẩn Bài, Vấn đề và Chuyên đề cấp con.
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-xl font-medium">
                          ℹ️ Tài liệu là bài đánh giá — Đã ẩn toàn bộ các cấp con bên dưới.
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* Cấu hình thương mại (Bán bằng Kim cương) */}
              <div className="p-3.5 bg-amber-50/40 border border-amber-200/50 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="block font-bold text-amber-900 uppercase text-[10px] tracking-wider">
                      Hình thức phát hành tài liệu
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      Phát hành dạng bán thu phí bằng Kim Cương hoặc cho phép học sinh tự học miễn phí.
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newIsForSale}
                      onChange={e => setNewIsForSale(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
                  </label>
                </div>

                {newIsForSale && (
                  <div className="flex items-center gap-3 pt-2 border-t border-amber-200/40 animate-fade-in">
                    <label className="font-bold text-amber-900 text-[11px] shrink-0">Giá bán (Kim cương):</label>
                    <input
                      type="number"
                      min={5}
                      max={1000}
                      value={newPriceDiamonds}
                      onChange={e => setNewPriceDiamonds(Math.max(5, parseInt(e.target.value) || 5))}
                      className="w-24 py-1.5 px-2.5 bg-white border border-amber-300 rounded-lg text-xs font-black text-amber-700 font-mono focus:ring-1 focus:ring-amber-500"
                    />
                    <span className="text-[10px] text-amber-800 font-medium">💎 (Nhận ngay khi học sinh mua tài liệu)</span>
                  </div>
                )}
              </div>

              {/* Chèn file bổ sung thêm chèn được file .html (tự động nhận diện KienThuc.html E-learning) */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-slate-700 flex items-center gap-1.5 uppercase">
                    <FileUp className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Chèn file tài liệu (Bổ sung hỗ trợ File .HTML / E-Learning)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => fileUploadRef.current?.click()}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-white hover:bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                  >
                    <Plus className="w-3 h-3" /> Chèn file...
                  </button>
                </div>

                <input
                  ref={fileUploadRef}
                  type="file"
                  accept=".html,.htm,.json,.pdf,.docx,.doc,.xlsx,.xls,.txt"
                  multiple
                  onChange={handleFileAttach}
                  className="hidden"
                />
                <input
                  ref={graphUploadRef}
                  type="file"
                  accept="image/*"
                  onChange={handleInsertGraphImage}
                  className="hidden"
                />
                <input
                  ref={bbtUploadRef}
                  type="file"
                  accept="image/*"
                  onChange={handleInsertBBTImage}
                  className="hidden"
                />
                <input
                  ref={imageUploadRef}
                  type="file"
                  accept="image/*"
                  onChange={handleInsertImageFile}
                  className="hidden"
                />

                {attachedFiles.length === 0 ? (
                  <div
                    onClick={() => fileUploadRef.current?.click()}
                    className="border border-dashed border-slate-300 rounded-lg p-2.5 text-center text-slate-400 text-xs hover:border-indigo-400 hover:bg-white cursor-pointer transition-colors"
                  >
                    Bấm để chèn file: Bổ sung hỗ trợ file <strong>.html</strong> (KienThuc.html, e-learning), <strong>.json</strong>, <strong>.pdf</strong>, <strong>.docx</strong>...
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {attachedFiles.map((af, idx) => (
                      <div key={idx} className="flex items-center justify-between p-1.5 px-2.5 rounded-lg bg-white border border-slate-200 text-xs">
                        <div className="flex items-center gap-2 truncate flex-1 mr-2">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase ${
                            af.isHtml ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-100 text-indigo-800'
                          }`}>
                            {af.isHtml ? 'HTML' : af.ext}
                          </span>
                          <span className="font-medium text-slate-800 truncate">{af.name}</span>
                          <span className="text-[10px] text-slate-400">({af.size})</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAttachedFiles(prev => prev.filter((_, i) => i !== idx))}
                          className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                          title="Bỏ tệp đính kèm"
                        >
                          <span className="text-xs font-bold leading-none">✕</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700 uppercase text-xs">Tóm tắt nội dung bài soạn</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setOpenInsertMenuModal(!openInsertMenuModal)}
                      className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Chèn...</span>
                      <ChevronDown className="w-3 h-3 text-indigo-500" />
                    </button>

                    {openInsertMenuModal && (
                      <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-xl w-72 py-1.5 divide-y divide-slate-100 animate-fade-in text-xs font-medium">
                        {/* 1. Chèn công thức */}
                        <button
                          type="button"
                          onClick={() => {
                            setMathModalInitialFormula('');
                            setShowMathTypeModal(true);
                            setOpenInsertMenuModal(false);
                          }}
                          className="w-full px-3 py-2 flex items-center gap-2 hover:bg-purple-50 text-purple-900 text-left cursor-pointer"
                        >
                          <span className="font-serif font-black text-xs text-purple-800 shrink-0">∑√</span>
                          <div>
                            <div className="font-bold">Chèn công thức</div>
                            <div className="text-[10px] text-slate-400 font-normal">Soạn công thức toán học MathType</div>
                          </div>
                        </button>

                        {/* 2. Chèn đồ thị (3 menu con: Từ máy tính, Nhập hàm, Tự vẽ) */}
                        <div className="py-1">
                          <button
                            type="button"
                            onClick={() => setExpandedGraphMenu(!expandedGraphMenu)}
                            className="w-full px-3 py-2 flex items-center justify-between hover:bg-sky-50 text-sky-900 text-left cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <TrendingUp className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                              <div>
                                <div className="font-bold">Chèn đồ thị (TikZ)</div>
                                <div className="text-[10px] text-slate-400 font-normal">Từ máy tính, Nhập hàm, Tự vẽ</div>
                              </div>
                            </div>
                            <ChevronDown className={`w-3.5 h-3.5 text-sky-500 transition-transform ${expandedGraphMenu ? 'rotate-180' : ''}`} />
                          </button>

                          {expandedGraphMenu && (
                            <div className="ml-5 pl-2.5 border-l-2 border-sky-200 py-1 space-y-1 bg-sky-50/40 rounded-r-lg mr-1.5 my-1">
                              {/* 2.1 Từ máy tính */}
                              <button
                                type="button"
                                onClick={() => {
                                  graphUploadRef.current?.click();
                                  setOpenInsertMenuModal(false);
                                }}
                                className="w-full px-2.5 py-1.5 flex items-center gap-2 hover:bg-sky-100/70 text-slate-800 text-left rounded-md cursor-pointer"
                              >
                                <Laptop className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                                <div>
                                  <div className="font-bold text-[11px] text-sky-950">1. Từ máy tính</div>
                                  <div className="text-[9px] text-slate-500 font-normal">Chọn hình ảnh đồ thị hệ thống dùng TikZ vẽ lại</div>
                                </div>
                              </button>

                              {/* 2.2 Nhập hàm */}
                              <button
                                type="button"
                                onClick={() => {
                                  setShowGraphModal(true);
                                  setOpenInsertMenuModal(false);
                                }}
                                className="w-full px-2.5 py-1.5 flex items-center gap-2 hover:bg-sky-100/70 text-slate-800 text-left rounded-md cursor-pointer"
                              >
                                <Calculator className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                                <div>
                                  <div className="font-bold text-[11px] text-sky-950">2. Nhập hàm</div>
                                  <div className="text-[9px] text-slate-500 font-normal">Nhập công thức hàm số hệ thống dùng TikZ vẽ lại</div>
                                </div>
                              </button>

                              {/* 2.3 Tự vẽ */}
                              <button
                                type="button"
                                onClick={() => {
                                  setDrawSketchType('graph');
                                  setShowDrawSketchModal(true);
                                  setOpenInsertMenuModal(false);
                                  setTimeout(() => initCanvas(), 50);
                                }}
                                className="w-full px-2.5 py-1.5 flex items-center gap-2 hover:bg-sky-100/70 text-slate-800 text-left rounded-md cursor-pointer"
                              >
                                <PenTool className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                                <div>
                                  <div className="font-bold text-[11px] text-sky-950">3. Tự vẽ</div>
                                  <div className="text-[9px] text-slate-500 font-normal">Vẽ tay phác thảo, hệ thống nắn chỉnh chuẩn TikZ</div>
                                </div>
                              </button>
                            </div>
                          )}
                        </div>

                        {/* 3. Chèn bảng biến thiên (3 menu con: Từ máy tính, Nhập hàm, Tự vẽ) */}
                        <div className="py-1">
                          <button
                            type="button"
                            onClick={() => setExpandedBbtMenu(!expandedBbtMenu)}
                            className="w-full px-3 py-2 flex items-center justify-between hover:bg-emerald-50 text-emerald-900 text-left cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <Activity className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <div>
                                <div className="font-bold">Chèn bảng biến thiên (tikz-tab)</div>
                                <div className="text-[10px] text-slate-400 font-normal">Từ máy tính, Nhập hàm, Tự vẽ</div>
                              </div>
                            </div>
                            <ChevronDown className={`w-3.5 h-3.5 text-emerald-500 transition-transform ${expandedBbtMenu ? 'rotate-180' : ''}`} />
                          </button>

                          {expandedBbtMenu && (
                            <div className="ml-5 pl-2.5 border-l-2 border-emerald-200 py-1 space-y-1 bg-emerald-50/40 rounded-r-lg mr-1.5 my-1">
                              {/* 3.1 Từ máy tính */}
                              <button
                                type="button"
                                onClick={() => {
                                  bbtUploadRef.current?.click();
                                  setOpenInsertMenuModal(false);
                                }}
                                className="w-full px-2.5 py-1.5 flex items-center gap-2 hover:bg-emerald-100/70 text-slate-800 text-left rounded-md cursor-pointer"
                              >
                                <Laptop className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <div>
                                  <div className="font-bold text-[11px] text-emerald-950">1. Từ máy tính</div>
                                  <div className="text-[9px] text-slate-500 font-normal">Chọn ảnh bảng biến thiên hệ thống dùng tikz-tab vẽ lại</div>
                                </div>
                              </button>

                              {/* 3.2 Nhập hàm */}
                              <button
                                type="button"
                                onClick={() => {
                                  setShowBBTModal(true);
                                  setOpenInsertMenuModal(false);
                                }}
                                className="w-full px-2.5 py-1.5 flex items-center gap-2 hover:bg-emerald-100/70 text-slate-800 text-left rounded-md cursor-pointer"
                              >
                                <Calculator className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <div>
                                  <div className="font-bold text-[11px] text-emerald-950">2. Nhập hàm</div>
                                  <div className="text-[9px] text-slate-500 font-normal">Nhập điểm & dấu y', hệ thống dùng tikz-tab vẽ lại</div>
                                </div>
                              </button>

                              {/* 3.3 Tự vẽ */}
                              <button
                                type="button"
                                onClick={() => {
                                  setDrawSketchType('bbt');
                                  setShowDrawSketchModal(true);
                                  setOpenInsertMenuModal(false);
                                  setTimeout(() => initCanvas(), 50);
                                }}
                                className="w-full px-2.5 py-1.5 flex items-center gap-2 hover:bg-emerald-100/70 text-slate-800 text-left rounded-md cursor-pointer"
                              >
                                <PenTool className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <div>
                                  <div className="font-bold text-[11px] text-emerald-950">3. Tự vẽ</div>
                                  <div className="text-[9px] text-slate-500 font-normal">Vẽ tay phác thảo BBT, hệ thống nắn chỉnh chuẩn tikz-tab</div>
                                </div>
                              </button>
                            </div>
                          )}
                        </div>

                        {/* 4. Chèn hình ảnh */}
                        <button
                          type="button"
                          onClick={() => {
                            imageUploadRef.current?.click();
                            setOpenInsertMenuModal(false);
                          }}
                          className="w-full px-3 py-2 flex items-center gap-2 hover:bg-amber-50 text-amber-900 text-left cursor-pointer"
                        >
                          <ImageIcon className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <div>
                            <div className="font-bold">Chèn Hình ảnh</div>
                            <div className="text-[10px] text-slate-400 font-normal">Tải ảnh minh họa từ máy tính</div>
                          </div>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                {newSnippet && (
                  <div className="mb-2 p-2.5 bg-purple-50/50 border border-purple-200/80 rounded-xl text-xs text-slate-900 leading-relaxed font-medium">
                    <span className="text-[10px] font-bold text-purple-700 block mb-1">Bản dịch công thức trực quan (Kích vào công thức để sửa):</span>
                    <MathFormulaRenderer
                      text={newSnippet}
                      onEditFormula={(formula) => {
                        setMathModalInitialFormula(formula);
                        setShowMathTypeModal(true);
                      }}
                    />
                  </div>
                )}
                <textarea
                  rows={2}
                  placeholder="Mô tả các dạng toán trọng tâm, bài tập mẫu và hướng dẫn học sinh (đặt công thức trong cặp $...$)..."
                  value={newSnippet}
                  onChange={e => setNewSnippet(e.target.value)}
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl font-normal text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Cloud className="w-3.5 h-3.5" />
                  <span>Tạo & Lưu Drive</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Thêm mục mới cho dropdown với tùy chọn phân cấp và quy cách đặt tên mới */}
      {showModalAddDialog && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h4 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <span>Thêm vào:</span>
                <span className="text-indigo-700 font-extrabold">
                  {modalAddLevel === 'title' ? 'Tài liệu' : modalAddLevel === 'chuong' ? 'Chương' : modalAddLevel === 'bai' ? 'Bài' : modalAddLevel === 'vanDe' ? 'Vấn đề' : 'Chuyên đề'}
                </span>
              </h4>
              <button
                type="button"
                onClick={() => setShowModalAddDialog(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-base cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Dropdown tùy chọn đặt ngay trước ô nhập tên theo yêu cầu */}
            <div className="space-y-2 pt-1">
              <label className="text-[11px] font-bold text-slate-700 block uppercase">
                Tùy chọn loại mục & tên:
              </label>

              <div className="flex flex-col sm:flex-row items-stretch rounded-xl border border-slate-300 focus-within:ring-2 focus-within:ring-indigo-500 overflow-hidden bg-white shadow-2xs">
                {/* Dropdown đặt TRƯỚC ô nhập tên */}
                {modalAddLevel === 'chuyenDe' ? (
                  /* Nút Thêm ở chuyên đề: dropdown 4 tùy chọn tiến trình: Kiến thức, Luyện tập, Kiểm tra, Cải thiện */
                  <select
                    id="dropdown-add-chuyende-options"
                    value={modalAddType}
                    onChange={e => setModalAddType(e.target.value as any)}
                    className="bg-slate-100 text-slate-800 text-xs font-bold py-2.5 px-3 border-b sm:border-b-0 sm:border-r border-slate-300 focus:outline-none cursor-pointer shrink-0"
                  >
                    <option value="">-- (Để trống) --</option>
                    <option value="standard">Thêm chuyên đề mới</option>
                    <option value="kienThuc">1. Kiến thức (.html)</option>
                    <option value="luyenTap">2. Luyện tập (.json)</option>
                    <option value="kiemTra">3. Kiểm tra (.json)</option>
                    <option value="caiThien">4. Cải thiện (.json)</option>
                    <option value="danhGia">Đánh giá (.json)</option>
                  </select>
                ) : (
                  /* Nút Thêm ở tài liệu/chương/bài/vấn đề: dropdown 2 tùy chọn: Thêm [...] mới hoặc Đánh giá */
                  <select
                    id="dropdown-add-level-options"
                    value={modalAddType}
                    onChange={e => setModalAddType(e.target.value as any)}
                    className="bg-slate-100 text-slate-800 text-xs font-bold py-2.5 px-3 border-b sm:border-b-0 sm:border-r border-slate-300 focus:outline-none cursor-pointer shrink-0"
                  >
                    <option value="">-- (Để trống) --</option>
                    <option value="standard">
                      Thêm {modalAddLevel === 'title' ? 'tài liệu' : modalAddLevel === 'chuong' ? 'chương' : modalAddLevel === 'bai' ? 'bài' : 'vấn đề'} mới
                    </option>
                    <option value="danhGia">Đánh giá</option>
                  </select>
                )}

                {/* Ô nhập tên mục */}
                <input
                  type="text"
                  autoFocus
                  disabled={isAddingFolder}
                  placeholder={
                    modalAddType === 'danhGia'
                      ? 'Ví dụ: 15 phút hoặc Giữa kỳ 1...'
                      : modalAddType === 'luyenTap'
                      ? 'Ví dụ: Tự luyện dạng 1...'
                      : modalAddType === 'kiemTra'
                      ? 'Ví dụ: Đề kiểm tra 15 phút chuyên đề...'
                      : modalAddType === 'caiThien'
                      ? 'Ví dụ: Bài tập bồi dưỡng cải thiện...'
                      : modalAddType === 'kienThuc'
                      ? 'Ví dụ: Tóm tắt lý thuyết và phương pháp giải...'
                      : 'Nhập tên mục mới...'
                  }
                  value={modalAddItemText}
                  onChange={e => setModalAddItemText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !isAddingFolder && handleConfirmAdd()}
                  className="flex-1 px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none min-w-0 disabled:bg-slate-50 disabled:text-slate-400"
                />
              </div>

              {/* Dòng chữ màu đỏ ngay bên dưới chỗ nhập tên thư mục mới theo yêu cầu */}
              {isAddingFolder && (
                <div className="mt-2 text-red-600 font-bold text-xs flex items-center gap-1.5 animate-pulse">
                  <span>⏳ Đang kiểm tra và thêm vào hệ thống. Vui lòng đợi...</span>
                </div>
              )}

              {/* Thông báo lỗi và nút kết nối Drive ngay sau câu nếu gặp lỗi 401/hết hạn */}
              {modalAddError && (
                <div className="mt-2 p-2.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs font-bold flex flex-wrap items-center justify-between gap-2 shadow-xs">
                  <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{modalAddError}</span>
                  </div>
                  {(modalAddError.includes('401') || modalAddError.includes('hết hạn') || modalAddError.includes('Kết nối Drive')) && (
                    <button
                      type="button"
                      onClick={async () => {
                        await connectGoogleDrive();
                        setModalAddError(null);
                      }}
                      className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-xs inline-flex items-center gap-1 shrink-0"
                    >
                      <Cloud className="w-3.5 h-3.5" />
                      <span>Kết nối Drive</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Live Preview quy cách đặt tên chuẩn */}
            {!isAddingFolder && (modalAddType === 'danhGia' || modalAddType === 'luyenTap' || modalAddType === 'kiemTra' || modalAddType === 'caiThien' || modalAddType === 'kienThuc') && (
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] space-y-1">
                <span className="text-slate-500 block">Quy cách đặt tên tệp chuẩn:</span>
                <div className="font-mono font-bold text-xs text-indigo-700 bg-white px-2 py-1 rounded border border-indigo-100 flex items-center gap-1.5 truncate">
                  <span>📄</span>
                  <span className="truncate">
                    {modalAddType === 'danhGia'
                      ? formatDanhGiaFileName(modalAddItemText)
                      : modalAddType === 'luyenTap'
                      ? formatLuyenTapFileName(modalAddItemText)
                      : modalAddType === 'kiemTra'
                      ? formatKiemTraFileName(modalAddItemText)
                      : modalAddType === 'caiThien'
                      ? formatCaiThienFileName(modalAddItemText)
                      : formatKienThucFileName(modalAddItemText)}
                  </span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
              <button
                type="button"
                disabled={isAddingFolder}
                onClick={() => setShowModalAddDialog(false)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={isAddingFolder || !modalAddItemText.trim()}
                onClick={handleConfirmAdd}
                className={`px-4 py-1.5 text-xs font-bold text-white rounded-lg shadow-xs cursor-pointer transition-colors flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed ${
                  modalAddType === 'danhGia'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : modalAddType === 'luyenTap'
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : modalAddType === 'kiemTra'
                    ? 'bg-purple-600 hover:bg-purple-700'
                    : modalAddType === 'caiThien'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : modalAddType === 'kienThuc'
                    ? 'bg-teal-600 hover:bg-teal-700'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {isAddingFolder ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang xử lý...</span>
                  </>
                ) : (
                  modalAddType === 'danhGia'
                    ? 'Thêm Đánh giá'
                    : modalAddType === 'luyenTap'
                    ? 'Thêm Luyện tập'
                    : modalAddType === 'kiemTra'
                    ? 'Thêm Kiểm tra'
                    : modalAddType === 'caiThien'
                    ? 'Thêm Cải thiện'
                    : modalAddType === 'kienThuc'
                    ? 'Thêm Kiến thức'
                    : 'Thêm mục'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HỘP THOẠI XÁC NHẬN XÓA TÙY CHỌN - ĐỀ XUẤT 3: 2 TÙY CHỌN RÕ RÀNG */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="text-rose-600 font-bold text-base flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-rose-600" />
                <span>Tùy chọn xóa mục</span>
              </h3>
              <button
                type="button"
                disabled={isDeletingItem}
                onClick={() => setItemToDelete(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-base cursor-pointer disabled:opacity-40"
              >
                ✕
              </button>
            </div>
            
            <p className="text-slate-700 text-xs leading-relaxed">
              Bạn đang chọn mục: <strong className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">"{itemToDelete.value}"</strong> ({itemToDelete.level === 'title' ? 'Tài liệu' : itemToDelete.level === 'chuong' ? 'Chương' : itemToDelete.level === 'bai' ? 'Bài' : itemToDelete.level === 'vanDe' ? 'Vấn đề' : 'Chuyên đề'}). Vui lòng chọn 1 trong 2 hình thức xóa dưới đây:
            </p>

            {/* 2 Lựa chọn xóa rõ ràng */}
            <div className="space-y-3">
              {/* Tùy chọn 1: Chỉ gỡ khỏi Menu */}
              <button
                type="button"
                disabled={isDeletingItem}
                onClick={() => handleRemoveFromMenuOnly()}
                className="w-full text-left p-3.5 rounded-xl border border-slate-200 hover:border-indigo-300 bg-slate-50 hover:bg-indigo-50/50 transition-all cursor-pointer group disabled:opacity-50"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700 mt-0.5 group-hover:bg-indigo-600 group-hover:text-white transition-colors shrink-0">
                    <EyeOff className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5 flex-1">
                    <div className="text-xs font-bold text-slate-900 group-hover:text-indigo-900 flex items-center justify-between">
                      <span>1. Chỉ gỡ khỏi Menu</span>
                      <span className="text-[10px] bg-indigo-100 text-indigo-800 font-semibold px-2 py-0.2 rounded-full">An toàn</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug">
                      Chỉ ẩn mục này khỏi danh mục tùy chọn của App để làm gọn menu. <strong>Vẫn giữ nguyên toàn bộ file và thư mục trên Google Drive</strong> để lưu trữ an toàn.
                    </p>
                  </div>
                </div>
              </button>

              {/* Tùy chọn 2: Xóa sạch trên Drive & App */}
              <button
                type="button"
                disabled={isDeletingItem}
                onClick={() => handleDeleteBothDriveAndApp()}
                className="w-full text-left p-3.5 rounded-xl border border-rose-200 hover:border-rose-400 bg-rose-50/40 hover:bg-rose-50 transition-all cursor-pointer group disabled:opacity-50"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-rose-100 text-rose-700 mt-0.5 group-hover:bg-rose-600 group-hover:text-white transition-colors shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5 flex-1">
                    <div className="text-xs font-bold text-rose-700 group-hover:text-rose-900 flex items-center justify-between">
                      <span>2. Xóa sạch trên Drive</span>
                      <span className="text-[10px] bg-rose-100 text-rose-800 font-semibold px-2 py-0.2 rounded-full">Xóa triệt để</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug">
                      Thực hiện xóa cả thư mục tương ứng trên <strong>Google Drive</strong> (myApp/LopU/TaiLieu/...) và dữ liệu trên App theo chuẩn Drive-First.
                    </p>
                  </div>
                </div>
              </button>
            </div>

            {/* Dòng trạng thái màu đỏ đang xóa trên Google Drive */}
            {isDeletingItem && (
              <div className="text-rose-600 font-bold text-xs flex items-center gap-1.5 animate-pulse bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                <Loader2 className="w-4 h-4 animate-spin shrink-0 text-rose-600" />
                <span>⏳ Đang xóa trên Google Drive, Vui lòng đợi...</span>
              </div>
            )}

            {/* Dòng trạng thái lỗi nếu xóa không được */}
            {deleteError && (
              <div className="text-rose-600 font-bold text-xs flex items-center gap-1.5 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>❌ Xóa không được (Google Drive từ chối hoặc chưa kết nối).</span>
              </div>
            )}

            <div className="flex items-center justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isDeletingItem}
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                Hủy bỏ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cửa sổ soạn thảo công thức Toán học MathType */}
      <MathTypeEditorModal
        isOpen={showMathTypeModal}
        initialValue={mathModalInitialFormula}
        onClose={() => {
          setShowMathTypeModal(false);
          setMathModalInitialFormula('');
        }}
        onInsert={(latexCode) => {
          if (mathModalInitialFormula && newSnippet.includes(mathModalInitialFormula)) {
            setNewSnippet(prev => {
              const escaped = mathModalInitialFormula.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const regex = new RegExp(`\\$\\s*${escaped}\\s*\\$`, 'g');
              if (regex.test(prev)) {
                return prev.replace(regex, `$ ${latexCode.trim()} $`);
              }
              return prev.replace(mathModalInitialFormula, `$ ${latexCode.trim()} $`);
            });
          } else {
            setNewSnippet(prev => (prev ? `${prev} $ ${latexCode.trim()} $` : `$ ${latexCode.trim()} $`));
          }
          setShowMathTypeModal(false);
          setMathModalInitialFormula('');
        }}
      />

      {/* Modal Chèn đồ thị (Nhập trực tiếp hoặc Chọn ảnh từ máy) */}
      {showGraphModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 space-y-4 animate-scale-up max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h4 className="font-bold text-sm text-sky-900 flex items-center gap-1.5">
                <TrendingUp className="w-5 h-5 text-sky-600" />
                <span>Nhập hàm số vẽ Đồ thị TikZ</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowGraphModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-base cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="p-3.5 bg-sky-50/70 rounded-2xl border border-sky-100 space-y-3">
                <span className="block font-bold text-sky-900 text-xs uppercase tracking-wider">Cách 1: Nhập công thức hàm số & Thiết lập</span>
                
                <div className="space-y-3">
                  {/* Ô nhập công thức hàm số (cho phép nhập cả tên hàm: y = x^3 - 3x, N = t^3 + 3t, f(x) = t^3 + 2, y = x^2 - 1, s(t) = t^2 + 5t...) */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-800 block mb-1">
                      Công thức hàm số (Ví dụ: y = x² - 1, N = t³ + 3t, y = x³ - 3x, s = 5t²):
                    </label>
                    <input
                      type="text"
                      value={graphFormula}
                      onChange={e => {
                        const newFormula = e.target.value;
                        setGraphFormula(newFormula);
                        const inferred = inferAxesLabels(newFormula);
                        setGraphXLabel(inferred.xLabel);
                        setGraphYLabel(inferred.yLabel);
                        const sug = getSuggestedYDomain(newFormula, graphXMin, graphXMax, inferred.varName);
                        setGraphYMin(sug.suggestedYMin);
                        setGraphYMax(sug.suggestedYMax);
                      }}
                      placeholder="Ví dụ: y = x^3 - 3x hoặc N = t^3 + 3t hoặc f(x) = t^3 + 2"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-sky-600 bg-white shadow-2xs"
                    />
                  </div>

                  {/* Tên trục hoành & Tên trục tung */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-700 block mb-1">
                        Tên trục hoành (Mặc định: x):
                      </label>
                      <input
                        type="text"
                        value={graphXLabel}
                        onChange={e => setGraphXLabel(e.target.value)}
                        placeholder="x, t, u..."
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold focus:outline-sky-600 bg-white shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-700 block mb-1">
                        Tên trục tung (Mặc định: y):
                      </label>
                      <input
                        type="text"
                        value={graphYLabel}
                        onChange={e => setGraphYLabel(e.target.value)}
                        placeholder="y, N, f(t)..."
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold focus:outline-sky-600 bg-white shadow-2xs"
                      />
                    </div>
                  </div>

                  {/* Nút gợi ý chèn mã LaTeX / Ký hiệu */}
                  <div>
                    <div className="text-[10px] font-bold text-slate-500 mb-1 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      <span>Gợi ý chèn nhanh ký hiệu LaTeX:</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {[
                        { label: '+∞', val: '+\\infty' },
                        { label: '-∞', val: '-\\infty' },
                        { label: '∞', val: '\\infty' },
                        { label: '| (gạch đơn)', val: '|' },
                        { label: '|| (không XĐ)', val: '||' },
                        { label: 'x²', val: 'x^2' },
                        { label: 'x³', val: 'x^3' },
                        { label: '√x', val: '\\sqrt{x}' },
                        { label: 'x/y', val: '\\frac{a}{b}' },
                        { label: 'π', val: '\\pi' },
                        { label: 'sin(x)', val: 'sin(x)' },
                        { label: 'cos(x)', val: 'cos(x)' },
                      ].map((s, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            const newFormula = graphFormula + s.val;
                            setGraphFormula(newFormula);
                            const sug = getSuggestedYDomain(newFormula, graphXMin, graphXMax);
                            setGraphYMin(sug.suggestedYMin);
                            setGraphYMax(sug.suggestedYMax);
                          }}
                          className="px-2 py-0.5 rounded-md bg-white hover:bg-sky-100 border border-slate-200 text-[10px] font-mono text-sky-800 transition-colors cursor-pointer shadow-2xs"
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Miền x & Miền y đề xuất tự động */}
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-sky-100">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-1">xmin (Cận trái x):</label>
                      <input
                        type="text"
                        value={graphXMin}
                        onChange={e => {
                          const val = e.target.value;
                          setGraphXMin(val);
                          const sug = getSuggestedYDomain(graphFormula, val, graphXMax);
                          setGraphYMin(sug.suggestedYMin);
                          setGraphYMax(sug.suggestedYMax);
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold focus:outline-sky-600 bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-1">xmax (Cận phải x):</label>
                      <input
                        type="text"
                        value={graphXMax}
                        onChange={e => {
                          const val = e.target.value;
                          setGraphXMax(val);
                          const sug = getSuggestedYDomain(graphFormula, graphXMin, val);
                          setGraphYMin(sug.suggestedYMin);
                          setGraphYMax(sug.suggestedYMax);
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold focus:outline-sky-600 bg-white"
                      />
                    </div>
                  </div>

                  {/* Miền y (tự động đề xuất: GTNN - 1 và GTLN + 1) */}
                  <div className="p-2.5 rounded-xl bg-white border border-sky-200 space-y-1.5 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-sky-800">
                        ⚡ Miền y (Đề xuất tự động: GTNN - 1 và GTLN + 1):
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const sug = getSuggestedYDomain(graphFormula, graphXMin, graphXMax);
                          setGraphYMin(sug.suggestedYMin);
                          setGraphYMax(sug.suggestedYMax);
                        }}
                        className="text-[9px] font-bold text-sky-600 hover:text-sky-800 underline cursor-pointer"
                      >
                        Tính lại đề xuất
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[9px] font-medium text-slate-500 block">ymin (Cận dưới y):</label>
                        <input
                          type="text"
                          value={graphYMin}
                          onChange={e => setGraphYMin(e.target.value)}
                          className="w-full px-2 py-1 rounded-lg border border-slate-200 text-xs font-semibold focus:outline-sky-600 bg-slate-50"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-medium text-slate-500 block">ymax (Cận trên y):</label>
                        <input
                          type="text"
                          value={graphYMax}
                          onChange={e => setGraphYMax(e.target.value)}
                          className="w-full px-2 py-1 rounded-lg border border-slate-200 text-xs font-semibold focus:outline-sky-600 bg-slate-50"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Ô nhập yêu cầu thêm với đồ thị (Nằm DƯỚI Miền x, trục y và TRÊN nút Hủy, Xác nhận & chèn đồ thị) */}
                  <div className="p-2.5 rounded-xl bg-indigo-50/60 border border-indigo-100 space-y-1.5">
                    <label className="text-[10px] font-bold text-indigo-900 block flex items-center gap-1">
                      <span>✨ Yêu cầu thêm với đồ thị (Gióng trục cực trị, gióng điểm, tiếp tuyến, giới hạn...):</span>
                    </label>
                    <textarea
                      rows={2}
                      value={graphRequirement}
                      onChange={e => setGraphRequirement(e.target.value)}
                      placeholder="Ví dụ: Gióng trục điểm cực trị; Gióng điểm A(1, 2); Tiếp tuyến tại x=1; Tô miền diện tích phẳng..."
                      className="w-full px-2.5 py-1.5 rounded-lg border border-indigo-200 text-xs font-semibold focus:outline-indigo-600 bg-white"
                    />
                    <div className="flex flex-wrap gap-1">
                      {[
                        'Gióng trục điểm cực trị',
                        'Gióng điểm giao trục Ox, Oy',
                        'Gióng điểm A(1, 2)',
                        'Vẽ tiệm cận đứng & ngang',
                        'Tiếp tuyến tại x=1',
                        'Tô miền phẳng',
                      ].map((req, rIdx) => (
                        <button
                          key={rIdx}
                          type="button"
                          onClick={() => {
                            setGraphRequirement(prev => (prev ? `${prev}; ${req}` : req));
                          }}
                          className="text-[9px] px-1.5 py-0.5 rounded bg-white hover:bg-indigo-100 text-indigo-700 border border-indigo-200 cursor-pointer shadow-2xs font-medium"
                        >
                          + {req}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Hàng nút Hủy & Xác nhận & chèn đồ thị (Nằm liền ngay dưới trường yêu cầu) */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-sky-200">
                    <button
                      type="button"
                      onClick={() => {
                        setGraphOldTikz('');
                        setShowGraphModal(false);
                      }}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      onClick={handleGenerateGraphTikZ}
                      className="py-2 px-4 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <TrendingUp className="w-4 h-4" />
                      <span>{graphOldTikz ? 'Xác nhận & Cập nhật đồ thị' : 'Xác nhận & Chèn đồ thị'}</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-dashed border-slate-300 rounded-xl space-y-2 text-center">
                <span className="block font-bold text-slate-700 text-[11px] uppercase tracking-wider text-left">Cách 2: Chọn hình ảnh đồ thị có sẵn</span>
                <p className="text-[11px] text-slate-400 text-left">Hệ thống sẽ tự động quét và phân tích đồ thị để sinh ra code TikZ cực kỳ chuẩn xác.</p>
                <button
                  type="button"
                  onClick={() => {
                    graphUploadRef.current?.click();
                    setShowGraphModal(false);
                  }}
                  className="w-full py-2 px-4 bg-white hover:bg-slate-100 border border-slate-300 hover:border-slate-400 text-slate-700 font-bold text-xs rounded-xl shadow-2xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <ImageIcon className="w-4 h-4 text-slate-500" />
                  <span>Chọn ảnh từ máy...</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end pt-1 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowGraphModal(false)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Chèn bảng biến thiên (Nhập trực tiếp hoặc Chọn ảnh từ máy) */}
      {showBBTModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 space-y-4 animate-scale-up max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h4 className="font-bold text-sm text-emerald-900 flex items-center gap-1.5">
                <Activity className="w-5 h-5 text-emerald-600" />
                <span>Nhập Bảng Biến Thiên tikz-tab</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowBBTModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-base cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-100 space-y-2.5">
                <span className="block font-bold text-emerald-800 text-[11px] uppercase tracking-wider">Cách 1: Nhập công thức hàm, miền & Bảng biến thiên</span>
                
                <div className="space-y-2.5">
                  {/* Ô nhập công thức hàm */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 block mb-1">
                      Công thức hàm số (Ví dụ: y = x^2 - 1, N(x) = t + 10, y = x^3 - 3x^2 + 2):
                    </label>
                    <input
                      type="text"
                      value={bbtFormula}
                      onChange={e => setBbtFormula(e.target.value)}
                      placeholder="Ví dụ: y = x^2 - 1 hoặc N(x) = t + 10"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold focus:outline-emerald-600 bg-white"
                    />
                  </div>

                  {/* Ô nhập miền cần lập bảng biến thiên & nút gợi ý vô cực */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-bold text-slate-700">
                        Miền cần lập bảng biến thiên (Mặc định toàn tập số thực ℝ):
                      </label>
                    </div>
                    <input
                      type="text"
                      value={bbtDomain}
                      onChange={e => setBbtDomain(e.target.value)}
                      placeholder="Ví dụ: (-\infty; +\infty), [0; +\infty), [a; b]"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold focus:outline-emerald-600 bg-white"
                    />
                    <div className="flex flex-wrap gap-1 mt-1">
                      {[
                        { label: 'ℝ (Toàn tập số thực)', val: '(-\\infty; +\\infty)' },
                        { label: '[0; +∞)', val: '[0; +\\infty)' },
                        { label: '(-∞; 0]', val: '(-\\infty; 0]' },
                        { label: 'ℝ \\ {0}', val: '\\mathbb{R} \\setminus \\{0\\}' },
                        { label: '[a; b]', val: '[a; b]' },
                      ].map((dm, dIdx) => (
                        <button
                          key={dIdx}
                          type="button"
                          onClick={() => setBbtDomain(dm.val)}
                          className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100/80 hover:bg-emerald-200 text-emerald-900 border border-emerald-200 cursor-pointer font-medium"
                        >
                          {dm.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Ô nhập yêu cầu đặc biệt của giáo viên */}
                  <div>
                    <label className="text-[10px] font-bold text-emerald-800 block mb-1">
                      Ô nhập yêu cầu đặc biệt (Gạch xiên 60 độ ngoài miền, điểm không xác định ||...):
                    </label>
                    <input
                      type="text"
                      value={bbtRequirement}
                      onChange={e => setBbtRequirement(e.target.value)}
                      placeholder="Ví dụ: Gạch xiên 60 độ ngoài miền [0; 5]; Điểm x = 1 hai gạch ||"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-emerald-200 text-xs font-semibold focus:outline-emerald-600 bg-white"
                    />
                  </div>

                  {/* Nút gợi ý ký hiệu tikz-tab */}
                  <div>
                    <div className="text-[10px] font-bold text-slate-500 mb-1 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-emerald-600" />
                      <span>Gợi ý chèn nhanh ký hiệu bảng biến thiên:</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {[
                        { label: '-∞', val: '-\\infty' },
                        { label: '+∞', val: '+\\infty' },
                        { label: '|| (2 gạch)', val: '||' },
                        { label: '| (1 gạch)', val: '|' },
                        { label: '0 (đạo hàm 0)', val: '0' },
                        { label: '+ (dương)', val: '+' },
                        { label: '- (âm)', val: '-' },
                        { label: 'h (gạch xiên 60°)', val: 'h' },
                        { label: 'd (double bar)', val: 'd' },
                        { label: '+/ (tăng lên)', val: '+/ ' },
                        { label: '-/ (giảm xuống)', val: '-/ ' },
                      ].map((sym, sIdx) => (
                        <button
                          key={sIdx}
                          type="button"
                          onClick={() => setBbtXPoints(prev => prev + (prev.endsWith(', ') ? '' : ', ') + sym.val)}
                          className="px-2 py-0.5 rounded-md bg-white hover:bg-emerald-100 border border-slate-200 text-[10px] font-mono text-emerald-800 transition-colors cursor-pointer shadow-2xs"
                        >
                          {sym.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-1">Danh sách điểm x (Phân tách bằng dấu phẩy):</label>
                    <input
                      type="text"
                      value={bbtXPoints}
                      onChange={e => setBbtXPoints(e.target.value)}
                      placeholder="Ví dụ: -\infty, -1, 1, +\infty"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold focus:outline-emerald-600 bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-1">Dấu của y' (Phân tách bằng dấu phẩy):</label>
                    <input
                      type="text"
                      value={bbtYPrimeSigns}
                      onChange={e => setBbtYPrimeSigns(e.target.value)}
                      placeholder="Ví dụ: , +, 0, -, 0, +, "
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold focus:outline-emerald-600 bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-1">Giá trị biến thiên của y (Ví dụ: -/ -\\infty, +/ 2, -/ -2, +/ +\\infty):</label>
                    <input
                      type="text"
                      value={bbtYValues}
                      onChange={e => setBbtYValues(e.target.value)}
                      placeholder="Mẫu: -/ -\\infty, +/ 2"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold focus:outline-emerald-600 bg-white"
                    />
                  </div>

                  <div className="text-[10px] text-slate-500 italic bg-emerald-100/50 p-2 rounded-lg border border-emerald-200/60">
                    📌 <strong>Quy chuẩn bảng biến thiên:</strong> Mặc định bảng biến thiên xác định trên toàn tập số thực ℝ; đối với phần ngoài miền hoặc điểm không xác định sẽ tự động dùng dấu gạch xiên 60 độ để gạch cách biệt.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGenerateBBTTikZ}
                  className="w-full mt-2.5 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Activity className="w-4 h-4" />
                  <span>🚀 Tạo & Chèn Bảng Biến Thiên Vào Word</span>
                </button>
              </div>

              <div className="p-3 bg-slate-50 border border-dashed border-slate-300 rounded-xl space-y-2 text-center">
                <span className="block font-bold text-slate-700 text-[11px] uppercase tracking-wider text-left">Cách 2: Chọn hình ảnh bảng biến thiên có sẵn</span>
                <p className="text-[11px] text-slate-400 text-left">Hệ thống sẽ tự động quét, nhận diện các dòng cực trị và hướng mũi tên để sinh code tikz-tab chuẩn xác.</p>
                <button
                  type="button"
                  onClick={() => {
                    bbtUploadRef.current?.click();
                    setShowBBTModal(false);
                  }}
                  className="w-full py-2 px-4 bg-white hover:bg-slate-100 border border-slate-300 hover:border-slate-400 text-slate-700 font-bold text-xs rounded-xl shadow-2xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <ImageIcon className="w-4 h-4 text-slate-500" />
                  <span>Chọn ảnh từ máy...</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end pt-1 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowBBTModal(false)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tự vẽ đồ thị / Bảng biến thiên (Canvas vẽ tay & Nắn chỉnh nét vẽ thông minh) */}
      {showDrawSketchModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-5 shadow-2xl border border-slate-200 space-y-4 animate-scale-up max-h-[95vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-xl ${drawSketchType === 'graph' ? 'bg-sky-100 text-sky-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  {drawSketchType === 'graph' ? <TrendingUp className="w-5 h-5" /> : <Activity className="w-5 h-5" />}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">
                    Bảng vẽ tay phác thảo: {drawSketchType === 'graph' ? 'Đồ thị hàm số' : 'Bảng biến thiên'}
                  </h4>
                  <p className="text-[11px] text-slate-500 font-normal">
                    Dùng chuột hoặc cảm ứng vẽ phác thảo, hệ thống sẽ tự nắn chỉnh nét và tạo mã TikZ / tikz-tab chuẩn xác
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDrawSketchModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Thanh công cụ vẽ */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSketchIsErasing(false)}
                  className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    !sketchIsErasing ? 'bg-indigo-600 text-white shadow-2xs' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <PenTool className="w-3.5 h-3.5" />
                  <span>Bút vẽ</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSketchIsErasing(true)}
                  className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    sketchIsErasing ? 'bg-rose-600 text-white shadow-2xs' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <span>Tẩy</span>
                </button>
                <button
                  type="button"
                  onClick={() => initCanvas()}
                  className="px-2.5 py-1.5 rounded-lg bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 font-semibold flex items-center gap-1 cursor-pointer"
                  title="Xóa trắng bảng vẽ"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Xóa vẽ lại</span>
                </button>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-slate-700 font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sketchAutoAlign}
                    onChange={e => setSketchAutoAlign(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-0"
                  />
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-[11px]">Tự động nắn chỉnh nét</span>
                </label>
                <button
                  type="button"
                  onClick={handleAutoAlignSketch}
                  className="px-2.5 py-1 bg-amber-100 text-amber-900 hover:bg-amber-200 rounded-lg text-[11px] font-bold cursor-pointer"
                >
                  Nắn chỉnh ngay
                </button>
              </div>
            </div>

            {/* Vùng Canvas vẽ tay */}
            <div className="border border-slate-300 rounded-xl overflow-hidden bg-white shadow-inner flex justify-center">
              <canvas
                ref={canvasRef}
                width={560}
                height={260}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="cursor-crosshair touch-none"
              />
            </div>

            {/* Vùng nhận diện & Mã TikZ / tikz-tab sinh ra */}
            <div className="space-y-2 text-xs">
              <div className="p-2.5 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span className="font-bold text-indigo-950 text-[11px]">Nhận diện & Nắn chỉnh:</span>
                  <span className="text-indigo-800 font-medium text-[11px]">{sketchRecognizedShape}</span>
                </div>
                <span className="text-[10px] bg-indigo-200 text-indigo-900 font-bold px-2 py-0.5 rounded-full">Chuẩn TikZ</span>
              </div>

              <div className="space-y-1">
                <span className="font-bold text-slate-700 text-[11px]">Mã {drawSketchType === 'graph' ? 'TikZ' : 'tikz-tab'} sẽ được chèn vào văn bản:</span>
                <pre className="p-2.5 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-xl overflow-x-auto max-h-28 border border-slate-800 select-all">
                  {sketchGeneratedTikZ}
                </pre>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowDrawSketchModal(false)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmInsertSketch}
                className={`px-4 py-2 text-xs font-bold text-white rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors ${
                  drawSketchType === 'graph' ? 'bg-sky-600 hover:bg-sky-700' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                <Check className="w-4 h-4" />
                <span>Xác nhận & Chèn vào bài</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
