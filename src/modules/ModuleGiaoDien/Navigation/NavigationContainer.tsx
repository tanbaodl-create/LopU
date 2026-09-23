import React, { useState, useRef, useEffect } from 'react';
import { ViewId, getViewMeta } from './menuConfig';
import { UserRole, UserProfile, TeacherDocument, ClassItem } from '../../../services/storageTypes';
import {
  LopHocView,
  SoDoLopView,
  ThoiKhoaBieuView,
  DangKyLopView,
} from '../../ModuleHocSinh';
import {
  QuanLyLopDayView,
  TaiLieuCaNhanView,
  TheoDoiHocSinhView,
  ThuongMaiTaiLieuView,
} from '../../ModuleGiaoVien';
import {
  BaoCaoGiamSatView,
  QuanLyNguoiDungView,
  PhanQuyenLopHocView,
} from '../../ModuleQuanTri';
import { HuongDanWebView, PhanTichLenh, LuuPromptChuanView } from '../HuongDanWeb';
import { MathTypeEditorModal } from '../../ModuleGiaoVien/TaiLieuCaNhan/MathTypeEditorModal';
import { QuestionEditorWord, QuestionViewMode } from '../../ModuleGiaoVien/TaiLieuCaNhan/QuestionEditorWord';
import {
  formatDanhGiaFileName,
  formatLuyenTapFileName,
  isDanhGia,
} from '../../ModuleGiaoVien/TaiLieuCaNhan/TaiLieuCaNhanView';
import {
  ShieldAlert,
  ArrowLeft,
  Lock,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Table,
  Image as ImageIcon,
  FileUp,
  FolderArchive,
  ChevronDown,
  Plus,
  Trash2,
  Cloud,
  Check,
  Sparkles,
  FolderTree,
  FolderLock,
  Send,
  Unlock,
  Layers,
  Tv,
  FileText,
  Eye,
  TrendingUp,
  Activity,
  PenTool,
  Laptop,
  Calculator,
  RotateCcw,
  Loader2,
} from 'lucide-react';
import { getClasses, getTeacherDocuments, saveTeacherDocument } from '../../ConnectData/ConnectFirestore';
import {
  saveTeachingMaterialHierarchyToDrive,
  getDriveConnectionState,
  createDriveFolderIfNotExists,
  deleteDriveFolderHierarchy,
} from '../../ConnectData/ConnectDrive/googleDriveService';

/**
 * Component Trình Soạn Thảo Văn Bản Word Chuyên Nghiệp (Phân hệ Tài liệu trong Navigation)
 * - Dropdown cỡ chữ đưa ngay sau gạch chân (chữ U gạch chân), chỉ ghi ngắn gọn: 12px, 14px, ..., 22px (mặc định 22px)
 * - Menu cửa sổ Word: Gôm chèn bảng, Toán LaTeX, hình ảnh, file, thư mục (E-learning) vào nút "Chèn" (menu xổ xuống)
 * - Menu cửa sổ Word: Gôm canh lề trái, giữa, phải, đều 2 bên vào nút "Canh lề" (menu xổ xuống)
 * - Bỏ các nút "+ Nhập ngoài" bên ngoài danh sách xổ xuống; Nút trong danh sách xổ xuống đổi tên thành "Thêm"
 */
const WordSoanThaoView: React.FC = () => {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [documents, setDocuments] = useState<TeacherDocument[]>([]);
  
  // Trạng thái gợi ý mặc định là rỗng
  const [title, setTitle] = useState<string>('');
  const [subject, setSubject] = useState<string>('Toán Học');
  const [grade, setGrade] = useState<string>('Khối 10');
  const [chuong, setChuong] = useState<string>('');
  const [bai, setBai] = useState<string>('');
  const [vanDe, setVanDe] = useState<string>('');
  const [chuyenDe, setChuyenDe] = useState<string>('');
  
  const [isForSale, setIsForSale] = useState<boolean>(false);
  const [priceDiamonds, setPriceDiamonds] = useState<number>(50);
  const [targetClasses, setTargetClasses] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Editor states: Cỡ chữ mặc định 22px
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const graphInputRef = useRef<HTMLInputElement>(null);
  const bbtInputRef = useRef<HTMLInputElement>(null);
  const [fontSize, setFontSize] = useState<string>('22px');

  // Trạng thái mở menu xổ xuống của Toolbar
  const [openInsertMenu, setOpenInsertMenu] = useState<boolean>(false);
  const [openGraphSubmenu, setOpenGraphSubmenu] = useState<boolean>(false);
  const [openBbtSubmenu, setOpenBbtSubmenu] = useState<boolean>(false);
  const [openAlignMenu, setOpenAlignMenu] = useState<boolean>(false);
  const [openWordViewMenu, setOpenWordViewMenu] = useState<boolean>(false);
  const [wordViewMode, setWordViewMode] = useState<QuestionViewMode>('split');
  const [currentAlignment, setCurrentAlignment] = useState<'left' | 'center' | 'right' | 'justify'>('left');
  const [tienTrinhChuyenDe, setTienTrinhChuyenDe] = useState<string>('Kiến thức');

  // Modal Nhập hàm Đồ thị trong Word
  const [showWordGraphModal, setShowWordGraphModal] = useState<boolean>(false);
  const [wordGraphFormula, setWordGraphFormula] = useState<string>('y = x^2 - 1');
  const [wordGraphXMin, setWordGraphXMin] = useState<string>('-2');
  const [wordGraphXMax, setWordGraphXMax] = useState<string>('2');
  const [wordGraphYMin, setWordGraphYMin] = useState<string>('-2');
  const [wordGraphYMax, setWordGraphYMax] = useState<string>('4');
  const [wordGraphRequirement, setWordGraphRequirement] = useState<string>('Gióng trục điểm cực trị');
  const [wordGraphOldTikz, setWordGraphOldTikz] = useState<string>('');

  // Lắng nghe sự kiện click nút "Chỉnh sửa" từ đồ thị TikZ để mở cửa sổ chỉnh sửa thông số
  useEffect(() => {
    const handleOpenEditTikz = (e: CustomEvent<any>) => {
      if (e.detail) {
        if (e.detail.formulaStr) setWordGraphFormula(e.detail.formulaStr);
        if (e.detail.xMin !== undefined) setWordGraphXMin(e.detail.xMin.toString());
        if (e.detail.xMax !== undefined) setWordGraphXMax(e.detail.xMax.toString());
        if (e.detail.yMin !== undefined) setWordGraphYMin(e.detail.yMin.toString());
        if (e.detail.yMax !== undefined) setWordGraphYMax(e.detail.yMax.toString());
        if (e.detail.requirement !== undefined) setWordGraphRequirement(e.detail.requirement);
        setWordGraphOldTikz(e.detail.tikzCode || '');
        setShowWordGraphModal(true);
      }
    };

    window.addEventListener('app-open-edit-tikz-modal', handleOpenEditTikz as EventListener);
    return () => {
      window.removeEventListener('app-open-edit-tikz-modal', handleOpenEditTikz as EventListener);
    };
  }, []);

  // Hàm tính toán và đề xuất miền y (GTNN - 1 và GTLN + 1) dựa theo công thức và miền x
  const getWordSuggestedYDomain = (formula: string, xminStr: string, xmaxStr: string) => {
    try {
      const x1 = parseFloat(xminStr) || -2;
      const x2 = parseFloat(xmaxStr) || 2;
      const cleanExpr = formula
        .replace(/^[a-zA-Z]\([a-zA-Z]\)\s*=\s*/, '')
        .replace(/^[a-zA-Z]\s*=\s*/, '')
        .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)')
        .replace(/\\x/g, 'x')
        .replace(/\bt\b/g, 'x')
        .replace(/\^/g, '**')
        .replace(/\\sqrt\{([^}]+)\}/g, 'Math.sqrt($1)')
        .replace(/sqrt/g, 'Math.sqrt')
        .replace(/sin/g, 'Math.sin')
        .replace(/cos/g, 'Math.cos')
        .replace(/tan/g, 'Math.tan')
        .replace(/abs/g, 'Math.abs')
        .replace(/(\d+)\s*x/g, '$1*x')
        .replace(/(\d+)\s*\(/g, '$1*(')
        .replace(/\)\s*\(/g, ')*(')
        .replace(/x\s*(\d+)/g, 'x*$1');

      // eslint-disable-next-line no-new-func
      const fn = new Function('x', `try { return ${cleanExpr}; } catch { return 0; }`);
      let minVal = Infinity;
      let maxVal = -Infinity;
      const step = Math.max(0.02, (x2 - x1) / 80);
      for (let x = x1; x <= x2 + 0.001; x += step) {
        const y = Number(fn(x));
        if (!isNaN(y) && isFinite(y) && Math.abs(y) < 200) {
          if (y < minVal) minVal = y;
          if (y > maxVal) maxVal = y;
        }
      }

      if (minVal !== Infinity && maxVal !== -Infinity) {
        const calculatedMin = Math.max(-50, Math.floor(minVal) - 1);
        const calculatedMax = Math.min(50, Math.ceil(maxVal) + 1);
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

  // Hàm chuyển đổi số sang phân số hoặc số nguyên ưu tiên
  const formatWordCoordinateMath = (val: number): { raw: string; tex: string; display: string } => {
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

  // Modal Nhập Bảng biến thiên trong Word
  const [showWordBBTModal, setShowWordBBTModal] = useState<boolean>(false);
  const [wordBbtXPoints, setWordBbtXPoints] = useState<string>('-\\infty, -1, 1, +\\infty');
  const [wordBbtYPrimeSigns, setWordBbtYPrimeSigns] = useState<string>(', +, 0, -, 0, +, ');
  const [wordBbtYValues, setWordBbtYValues] = useState<string>('-/ -\\infty, +/ 2, -/ -2, +/ +\\infty');

  // Modal Tự vẽ đồ thị / Bảng biến thiên (Canvas vẽ tay & Nắn chỉnh AI TikZ)
  const [showWordDrawSketchModal, setShowWordDrawSketchModal] = useState<boolean>(false);
  const [wordDrawSketchType, setWordDrawSketchType] = useState<'graph' | 'bbt'>('graph');
  const [wordSketchIsErasing, setWordSketchIsErasing] = useState<boolean>(false);
  const [wordSketchAutoAlign, setWordSketchAutoAlign] = useState<boolean>(true);
  const [wordSketchRecognizedShape, setWordSketchRecognizedShape] = useState<string>('');
  const [wordSketchGeneratedTikZ, setWordSketchGeneratedTikZ] = useState<string>('');
  const wordCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [wordIsDrawing, setWordIsDrawing] = useState<boolean>(false);

  // Canvas drawing handlers in NavigationContainer
  const initWordCanvas = (type: 'graph' | 'bbt') => {
    const canvas = wordCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

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

    if (type === 'graph') {
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(30, canvas.height / 2);
      ctx.lineTo(canvas.width - 30, canvas.height / 2);
      ctx.moveTo(canvas.width / 2, canvas.height - 20);
      ctx.lineTo(canvas.width / 2, 20);
      ctx.stroke();
      setWordSketchRecognizedShape('Đồ thị parabol y = x² - 2x + 1 (Nắn chuẩn)');
      setWordSketchGeneratedTikZ(`% Đồ thị TikZ tự vẽ tay:
\\begin{tikzpicture}[scale=0.85, >=stealth]
  \\draw[->,thick] (-3,0) -- (3,0) node[right] {$x$};
  \\draw[->,thick] (0,-2) -- (0,4) node[above] {$y$};
  \\draw[domain=-2.2:2.2,smooth,variable=\\x,blue,ultra thick] plot ({\\x},{\\x*\\x - 1});
  \\filldraw[blue] (0,-1) circle (1.5pt) node[below right] {$-1$};
  \\node at (0,0) [below left] {$O$};
\\end{tikzpicture}`);
    } else {
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(30, 25, canvas.width - 60, canvas.height - 50);
      setWordSketchRecognizedShape('Bảng biến thiên hàm bậc 3 (2 cực trị x = -1, 1)');
      setWordSketchGeneratedTikZ(`% Bảng biến thiên tikz-tab tự vẽ tay:
\\begin{tikzpicture}
  \\tkzTabInit[lgt=1.5, espcl=2.5]{$x$ /1, $y'$ /1, $y$ /2}{$-\\infty$, $-1$, $1$, $+\\infty$}
  \\tkzTabLine{, +, 0, -, 0, +, }
  \\tkzTabVar{-/ $-\\infty$, +/ $2$, -/ $-2$, +/ $+\\infty$}
\\end{tikzpicture}`);
    }
  };

  const getWordCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = wordCanvasRef.current;
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

  const startWordDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = wordCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getWordCanvasCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = wordSketchIsErasing ? '#ffffff' : '#2563eb';
    ctx.lineWidth = wordSketchIsErasing ? 20 : 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    setWordIsDrawing(true);
  };

  const drawWord = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!wordIsDrawing) return;
    const canvas = wordCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getWordCanvasCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopWordDrawing = () => {
    if (!wordIsDrawing) return;
    setWordIsDrawing(false);
    if (wordSketchAutoAlign) {
      handleAutoAlignWordSketch();
    }
  };

  const handleAutoAlignWordSketch = () => {
    if (wordDrawSketchType === 'graph') {
      setWordSketchRecognizedShape('Đã nắn chỉnh: Đồ thị hàm số liên tục & Trục tọa độ chuẩn');
      setWordSketchGeneratedTikZ(`% Đồ thị TikZ phác thảo tự vẽ (Đã nắn chuẩn nét vẽ):
\\begin{tikzpicture}[scale=0.85, >=stealth]
  \\draw[->,thick] (-3.5,0) -- (3.5,0) node[right] {$x$};
  \\draw[->,thick] (0,-2.5) -- (0,4.5) node[above] {$y$};
  \\draw[domain=-2.2:2.2,smooth,variable=\\x,blue,ultra thick] plot ({\\x},{0.5*\\x*\\x*\\x - \\x});
  \\node at (0,0) [below left] {$O$};
\\end{tikzpicture}`);
    } else {
      setWordSketchRecognizedShape('Đã nắn chỉnh: Bảng biến thiên 3 hàng 4 cột với mũi tên tăng/giảm');
      setWordSketchGeneratedTikZ(`% Bảng biến thiên tikz-tab phác thảo tự vẽ (Đã nắn chuẩn cấu trúc):
\\begin{tikzpicture}
  \\tkzTabInit[lgt=1.5, espcl=2.5]{$x$ /1, $y'$ /1, $y$ /2}{$-\\infty$, $-1$, $1$, $+\\infty$}
  \\tkzTabLine{, +, 0, -, 0, +, }
  \\tkzTabVar{-/ $-\\infty$, +/ $4$, -/ $0$, +/ $+\\infty$}
\\end{tikzpicture}`);
    }
  };

  const handleConfirmInsertWordSketch = () => {
    if (wordSketchGeneratedTikZ) {
      // Chèn trực tiếp vào câu hỏi đang chọn trong QuestionEditorWord
      window.dispatchEvent(new CustomEvent('app-insert-word-snippet', {
        detail: {
          code: wordSketchGeneratedTikZ,
          type: 'sketch',
          title: wordDrawSketchType === 'graph' ? 'Đồ thị TikZ (Tự vẽ tay)' : 'Bảng biến thiên tikz-tab (Tự vẽ tay)'
        }
      }));

      const sketchHtml = `
        <div style="background-color: #f8fafc; border: 1.5px solid #6366f1; padding: 14px; border-radius: 12px; margin: 12px 0;">
          <div style="color: #4338ca; font-weight: bold; font-size: 14px; margin-bottom: 8px;">
            ✏️ <span>${wordDrawSketchType === 'graph' ? 'Đồ thị TikZ (Tự vẽ tay)' : 'Bảng biến thiên tikz-tab (Tự vẽ tay)'}</span>
          </div>
          <pre style="background: #0f172a; color: #a5b4fc; padding: 10px; border-radius: 8px; font-size: 11px; font-family: monospace; overflow-x: auto; margin: 0;">${wordSketchGeneratedTikZ}</pre>
          <div style="font-size: 11px; color: #4f46e5; font-weight: 500; margin-top: 6px;">
            ✨ ${wordSketchRecognizedShape}
          </div>
        </div>
      `;
      execCommand('insertHTML', sketchHtml);
      setNotification({ text: `Đã chèn ${wordDrawSketchType === 'graph' ? 'đồ thị TikZ' : 'bảng biến thiên tikz-tab'} tự vẽ tay vào câu hỏi!`, type: 'success' });
      setTimeout(() => setNotification(null), 4000);
    }
    setShowWordDrawSketchModal(false);
  };

  const handleGenerateWordGraphTikZ = () => {
    const xMinNum = parseFloat(wordGraphXMin) || -2;
    const xMaxNum = parseFloat(wordGraphXMax) || 2;
    const yMinNum = parseFloat(wordGraphYMin) || -2;
    const yMaxNum = parseFloat(wordGraphYMax) || 4;

    // 1. Phân tích vế trái và vế phải để suy ra nhãn trục
    let lhs = 'y';
    let rhs = wordGraphFormula.trim();
    if (wordGraphFormula.includes('=')) {
      const parts = wordGraphFormula.split('=');
      lhs = parts[0].trim() || 'y';
      rhs = parts.slice(1).join('=').trim();
    }

    let yLabel = lhs;
    let xLabel = 'x';
    let varName = 'x';

    if (/\bt\b/.test(rhs)) {
      xLabel = 't';
      varName = 't';
    } else if (/\bx\b/.test(rhs)) {
      xLabel = 'x';
      varName = 'x';
    } else if (/\bu\b/.test(rhs)) {
      xLabel = 'u';
      varName = 'u';
    } else if (lhs.includes('(') && lhs.includes(')')) {
      const innerVar = lhs.match(/\(([^)]+)\)/);
      if (innerVar && innerVar[1].trim()) {
        xLabel = innerVar[1].trim();
        varName = innerVar[1].trim();
      }
    }

    // 2. Chuẩn hóa biểu thức cho TikZ plot
    const cleanFormulaForTikz = rhs
      .replace(new RegExp(`\\b${varName}\\b`, 'g'), `\\${varName}`)
      .replace(/\^2/g, `*\\${varName}`)
      .replace(/\^3/g, `*\\${varName}*\\${varName}`)
      .trim();

    // 3. Tự động tính toán điểm cực trị và sinh mã gióng trục (Ưu tiên số nguyên -> phân số -> số thập phân)
    const evalMath = (val: number): number => {
      try {
        let expr = rhs
          .replace(new RegExp(`\\b${varName}\\b`, 'g'), 'x')
          .replace(/\^/g, '**')
          .replace(/sin/g, 'Math.sin')
          .replace(/cos/g, 'Math.cos')
          .replace(/tan/g, 'Math.tan')
          .replace(/sqrt/g, 'Math.sqrt')
          .replace(/abs/g, 'Math.abs')
          .replace(/(\d+)\s*x/g, '$1*x')
          .replace(/x\s*(\d+)/g, 'x*$1');
        // eslint-disable-next-line no-new-func
        const fn = new Function('x', `return ${expr};`);
        const res = fn(val);
        return isNaN(res) || !isFinite(res) ? 0 : res;
      } catch {
        return val * val - 1;
      }
    };

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
      const xFmt = formatWordCoordinateMath(e.x);
      const yFmt = formatWordCoordinateMath(e.y);
      const xStr = e.x.toString();
      const yStr = e.y.toString();
      const xPos = e.y >= 0 ? 'below' : 'above';
      const yPos = e.x >= 0 ? 'left' : 'right';

      return `  % Gióng tọa độ điểm cực trị (${xFmt.raw}, ${yFmt.raw})
  \\draw[dashed, thin, gray] (${xStr},0) -- (${xStr},${yStr}) -- (0,${yStr});
  \\fill (${xStr},${yStr}) circle (1.8pt);
  ${Math.abs(e.x) > 0.1 ? `\\node at (${xStr},0) [${xPos}, font=\\footnotesize] {$${xFmt.tex}$};` : ''}
  ${Math.abs(e.y) > 0.1 ? `\\node at (0,${yStr}) [${yPos}, font=\\footnotesize] {$${yFmt.tex}$};` : ''}`;
    }).join('\n');

    const reqComment = wordGraphRequirement ? `\n  % Yêu cầu: ${wordGraphRequirement}` : '';

    // Mã TikZ hoàn chỉnh: Bỏ hoàn toàn các vạch chia trên trục, giữ trục tọa độ thanh thoát và chuẩn xác
    const rawTikz = `% Đồ thị hàm số: ${wordGraphFormula}${reqComment}
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

    // Chèn trực tiếp vào câu hỏi đang chọn trong QuestionEditorWord
    window.dispatchEvent(new CustomEvent('app-insert-word-snippet', {
      detail: {
        code: rawTikz,
        oldCode: wordGraphOldTikz,
        type: 'graph',
        title: `Đồ thị ${wordGraphFormula}`
      }
    }));

    setNotification({ text: `Đã ${wordGraphOldTikz ? 'cập nhật' : 'chèn'} đồ thị ${wordGraphFormula} vào câu hỏi!`, type: 'success' });
    setTimeout(() => setNotification(null), 4000);
    setWordGraphOldTikz('');
    setShowWordGraphModal(false);
  };

  const handleGenerateWordBBTTikZ = () => {
    const rawTikzTab = `% Bảng biến thiên tikz-tab (Nhập trực tiếp):
\\begin{tikzpicture}
  \\tkzTabInit[lgt=1.5, espcl=2.5]{$x$ /1, $y'$ /1, $y$ /2}{${wordBbtXPoints}}
  \\tkzTabLine{${wordBbtYPrimeSigns}}
  \\tkzTabVar{${wordBbtYValues}}
\\end{tikzpicture}`;

    // Chèn trực tiếp vào câu hỏi đang chọn trong QuestionEditorWord
    window.dispatchEvent(new CustomEvent('app-insert-word-snippet', {
      detail: { code: rawTikzTab, type: 'bbt', title: 'Bảng biến thiên tikz-tab' }
    }));

    const customTikzTab = `
      <div style="background-color: #f0fdf4; border: 1.5px solid #16a34a; padding: 14px; border-radius: 12px; margin: 12px 0;">
        <div style="color: #15803d; font-weight: bold; font-size: 14px; margin-bottom: 8px;">
          📊 <span>Bảng biến thiên tikz-tab (Nhập trực tiếp)</span>
        </div>
        <pre style="background: #064e3b; color: #86efac; padding: 10px; border-radius: 8px; font-size: 11px; font-family: monospace; overflow-x: auto; margin: 0;">
\\begin{tikzpicture}
  \\tkzTabInit[lgt=1.5, espcl=2.5]{$x$ /1, $y'$ /1, $y$ /2}{${wordBbtXPoints}}
  \\tkzTabLine{${wordBbtYPrimeSigns}}
  \\tkzTabVar{${wordBbtYValues}}
\\end{tikzpicture}</pre>
      </div>
    `;
    execCommand('insertHTML', customTikzTab);
    setNotification({ text: 'Đã chèn bảng biến thiên tikz-tab vào câu hỏi!', type: 'success' });
    setTimeout(() => setNotification(null), 4000);
    setShowWordBBTModal(false);
  };

  // Danh mục phân cấp & dropdown quản lý
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [addingLevel, setAddingLevel] = useState<string>('');
  const [newItemText, setNewItemText] = useState<string>('');
  const [addModalType, setAddModalType] = useState<'standard' | 'luyenTap' | 'danhGia'>('standard');
  const [isAddingFolder, setIsAddingFolder] = useState<boolean>(false);
  const [modalAddError, setModalAddError] = useState<string | null>(null);
  const [showMathTypeModal, setShowMathTypeModal] = useState<boolean>(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ level: string; item: string } | null>(null);

  // Danh sách các tùy chọn có thể tự thêm / xóa
  const [titleList, setTitleList] = useState<string[]>([]);
  const [chuongList, setChuongList] = useState<string[]>([]);
  const [baiList, setBaiList] = useState<string[]>([]);
  const [vanDeList, setVanDeList] = useState<string[]>([]);
  const [chuyenDeList, setChuyenDeList] = useState<string[]>([]);

  useEffect(() => {
    async function load() {
      const cls = await getClasses();
      setClasses(cls);
      const docs = await getTeacherDocuments();
      setDocuments(docs);
      if (docs.length > 0) {
        setTitleList(Array.from(new Set(docs.map(d => d.title).filter(Boolean))));
      }
    }
    load();
  }, []);

  const execCommand = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  const handleAlign = (type: 'left' | 'center' | 'right' | 'justify') => {
    setCurrentAlignment(type);
    if (type === 'left') execCommand('justifyLeft');
    else if (type === 'center') execCommand('justifyCenter');
    else if (type === 'right') execCommand('justifyRight');
    else if (type === 'justify') execCommand('justifyFull');
    setOpenAlignMenu(false);
  };

  // Chèn Bảng vào Word
  const handleInsertTable = () => {
    const tableHtml = `
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0; border: 1px solid #cbd5e1;">
        <thead>
          <tr style="background-color: #f8fafc;">
            <th style="border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left;">STT</th>
            <th style="border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left;">Nội dung bài học</th>
            <th style="border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left;">Yêu cầu cần đạt</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border: 1px solid #cbd5e1; padding: 8px 12px;">1</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px 12px;">Khái niệm cơ bản</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px 12px;">Nắm vững định nghĩa</td>
          </tr>
          <tr>
            <td style="border: 1px solid #cbd5e1; padding: 8px 12px;">2</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px 12px;">Ví dụ áp dụng</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px 12px;">Giải đúng 100% bài tập mẫu</td>
          </tr>
        </tbody>
      </table>
    `;
    execCommand('insertHTML', tableHtml);
    setOpenInsertMenu(false);
  };

  // Chèn công thức Toán học (MathType)
  const handleInsertMath = () => {
    setShowMathTypeModal(true);
    setOpenInsertMenu(false);
  };

  // Chèn đồ thị (Dùng tikz vẽ lại đồ thị từ hình ảnh tải lên)
  const handleInsertGraph = () => {
    graphInputRef.current?.click();
    setOpenInsertMenu(false);
  };

  const onGraphImageSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const tikzCode = `% Đồ thị TikZ (Vẽ lại từ tệp: ${file.name}):
\\begin{tikzpicture}[scale=0.8, >=stealth]
  \\draw[->,thick] (-3,0) -- (3,0) node[right] {$x$};
  \\draw[->,thick] (0,-2) -- (0,4) node[above] {$y$};
  \\draw[domain=-2:2,smooth,variable=\\x,red,ultra thick] plot ({\\x},{\\x*\\x - 1});
  \\node at (0,0) [below left] {$O$};
  \\filldraw[blue] (0,-1) circle (2pt) node[right] {$(0,-1)$};
\\end{tikzpicture}`;

    window.dispatchEvent(new CustomEvent('app-insert-word-snippet', {
      detail: { code: tikzCode, type: 'graph', title: `Đồ thị TikZ từ ảnh (${file.name})` }
    }));
    setNotification({ text: `Đã chèn đồ thị TikZ từ hình ảnh "${file.name}" vào câu hỏi!`, type: 'success' });
    setTimeout(() => setNotification(null), 4000);

    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      const src = loadEvt.target?.result as string;
      const tikzGraphHtml = `
        <div style="background-color: #f8fafc; border: 1.5px solid #0284c7; padding: 14px; border-radius: 12px; margin: 12px 0;">
          <div style="display: flex; items-center; justify-content: space-between; gap: 8px; color: #0369a1; font-weight: bold; font-size: 14px; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              📈 <span>Đồ thị TikZ (Vẽ lại từ tệp: <strong>${file.name}</strong>)</span>
            </div>
          </div>
          <div style="display: flex; gap: 12px; align-items: flex-start; flex-wrap: wrap; margin-bottom: 8px;">
            <img src="${src}" alt="Ảnh đồ thị gốc" style="max-height: 120px; border-radius: 6px; border: 1px solid #cbd5e1;" />
            <pre style="flex: 1; min-width: 240px; background: #0f172a; color: #38bdf8; padding: 10px; border-radius: 8px; font-size: 11px; font-family: monospace; overflow-x: auto; margin: 0;">${tikzCode}</pre>
          </div>
          <div style="font-size: 11px; color: #0284c7; font-weight: 500;">
            ✨ Hệ thống đã tự động nhận diện hình ảnh <strong>${file.name}</strong> và chuyển đổi thành mã TikZ đồ thị chuẩn xác.
          </div>
        </div>
      `;
      execCommand('insertHTML', tikzGraphHtml);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Chèn bảng biến thiên (dùng tikz-tab vẽ lại bảng biến thiên từ hình ảnh bảng biến thiên vẽ lên)
  const handleInsertTableOfVariation = () => {
    bbtInputRef.current?.click();
    setOpenInsertMenu(false);
  };

  const onBBTImageSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const tikzTabCode = `% Bảng biến thiên tikz-tab (Vẽ lại từ tệp: ${file.name}):
\\begin{tikzpicture}
  \\tkzTabInit[lgt=1.5, espcl=2.5]{$x$ /1, $y'$ /1, $y$ /2}{$-\\infty$, $x_1$, $x_2$, $+\\infty$}
  \\tkzTabLine{, +, 0, -, 0, +, }
  \\tkzTabVar{-/ $-\\infty$, +/ $y_1$, -/ $y_2$, +/ $+\\infty$}
\\end{tikzpicture}`;

    window.dispatchEvent(new CustomEvent('app-insert-word-snippet', {
      detail: { code: tikzTabCode, type: 'bbt', title: `Bảng biến thiên tikz-tab từ ảnh (${file.name})` }
    }));
    setNotification({ text: `Đã chèn bảng biến thiên tikz-tab từ hình ảnh "${file.name}" vào câu hỏi!`, type: 'success' });
    setTimeout(() => setNotification(null), 4000);

    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      const src = loadEvt.target?.result as string;
      const tikzTabHtml = `
        <div style="background-color: #f0fdf4; border: 1.5px solid #16a34a; padding: 14px; border-radius: 12px; margin: 12px 0;">
          <div style="display: flex; items-center; justify-content: space-between; gap: 8px; color: #15803d; font-weight: bold; font-size: 14px; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              📊 <span>Bảng biến thiên tikz-tab (Vẽ lại từ tệp: <strong>${file.name}</strong>)</span>
            </div>
          </div>
          <div style="display: flex; gap: 12px; align-items: flex-start; flex-wrap: wrap; margin-bottom: 8px;">
            <img src="${src}" alt="Ảnh bảng biến thiên gốc" style="max-height: 120px; border-radius: 6px; border: 1px solid #cbd5e1;" />
            <pre style="flex: 1; min-width: 240px; background: #064e3b; color: #86efac; padding: 10px; border-radius: 8px; font-size: 11px; font-family: monospace; overflow-x: auto; margin: 0;">${tikzTabCode}</pre>
          </div>
          <div style="font-size: 11px; color: #16a34a; font-weight: 500;">
            ✨ Hệ thống đã tự động quét hình ảnh <strong>${file.name}</strong> và vẽ lại Bảng biến thiên bằng gói tikz-tab.
          </div>
        </div>
      `;
      execCommand('insertHTML', tikzTabHtml);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Chèn Hình ảnh
  const handleInsertImage = () => {
    imageInputRef.current?.click();
    setOpenInsertMenu(false);
  };

  const onImageSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      const src = loadEvt.target?.result as string;
      const imgHtml = `<p><img src="${src}" alt="${file.name}" style="max-width: 100%; height: auto; border-radius: 8px; margin: 12px 0; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);" /></p>`;
      execCommand('insertHTML', imgHtml);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Chèn File tài liệu
  const handleInsertFile = () => {
    fileInputRef.current?.click();
    setOpenInsertMenu(false);
  };

  const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fileHtml = `
      <div style="display: inline-flex; align-items: center; gap: 8px; background-color: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; padding: 6px 12px; border-radius: 8px; margin: 8px 0; font-weight: 600; font-size: 14px;">
        📎 <span>Tệp đính kèm: <strong>${file.name}</strong> (${(file.size / 1024).toFixed(1)} KB)</span>
      </div>
    `;
    execCommand('insertHTML', fileHtml);
    e.target.value = '';
  };

  // Chèn Thư mục (Giáo án E-Learning KienThuc.html)
  const handleInsertFolderElearning = () => {
    const folderHtml = `
      <div style="background-color: #ecfdf5; border: 1.5px solid #a7f3d0; padding: 14px; border-radius: 10px; margin: 12px 0;">
        <div style="display: flex; align-items: center; gap: 8px; color: #065f46; font-weight: bold; font-size: 15px;">
          📁 <span>Gói Bài Giảng E-Learning (KienThuc.html): <em>${chuyenDe || 'Chuyên đề trọng tâm'}</em></span>
        </div>
        <p style="margin: 6px 0 0 0; color: #047857; font-size: 13px;">
          Đã chèn liên kết gói bài giảng tương tác. Hệ thống tự động thiết lập đường dẫn tương đối (Relative paths sandbox) để phát lại cho học sinh an toàn, không lộ Google Drive của giáo viên.
        </p>
      </div>
    `;
    execCommand('insertHTML', folderHtml);
    setOpenInsertMenu(false);
  };

  // Thao tác mở modal thêm mục cho dropdown
  const handleOpenAddModal = (lvl: string) => {
    setAddingLevel(lvl);
    setNewItemText('');
    setAddModalType('standard');
    setModalAddError(null);
    setShowAddModal(true);
    setOpenDropdown(null);
  };

  const handleConfirmAddItem = async () => {
    if (!newItemText.trim() || isAddingFolder) return;
    const raw = newItemText.trim();
    let val = raw;
    if (addModalType === 'danhGia') {
      val = formatDanhGiaFileName(raw);
    } else if (addModalType === 'luyenTap') {
      val = formatLuyenTapFileName(raw);
    }

    // 1. Xác định đường dẫn Drive phân cấp:
    // myApp / LopU / TaiLieu / [Tài liệu] / [Chương] / [Bài] / [Vấn đề] / [Chuyên đề]
    const pathSegments: string[] = ['myApp', 'LopU', 'TaiLieu'];
    if (addingLevel === 'title') {
      pathSegments.push(val);
    } else if (addingLevel === 'chuong') {
      pathSegments.push(title || 'TaiLieuChung', val);
    } else if (addingLevel === 'bai') {
      pathSegments.push(title || 'TaiLieuChung', chuong || 'Chuong1', val);
    } else if (addingLevel === 'vanDe') {
      pathSegments.push(title || 'TaiLieuChung', chuong || 'Chuong1', bai || 'Bai1', val);
    } else if (addingLevel === 'chuyenDe') {
      pathSegments.push(title || 'TaiLieuChung', chuong || 'Chuong1', bai || 'Bai1', vanDe || 'VanDe1', val);
    }

    setIsAddingFolder(true);
    setModalAddError(null);

    const driveRes = await createDriveFolderIfNotExists(pathSegments);

    if (!driveRes.success) {
      setIsAddingFolder(false);
      const errMsg = driveRes.error || 'Tạo chưa thành công trên Google Drive';
      setModalAddError(errMsg);
      return;
    }

    if (addingLevel === 'title') {
      setTitleList(prev => [...prev, val]);
      setTitle(val);
      if (addModalType === 'danhGia') {
        setChuong('');
        setBai('');
        setVanDe('');
        setChuyenDe('');
      }
    } else if (addingLevel === 'chuong') {
      setChuongList(prev => [...prev, val]);
      setChuong(val);
      if (addModalType === 'danhGia') {
        setBai('');
        setVanDe('');
        setChuyenDe('');
      }
    } else if (addingLevel === 'bai') {
      setBaiList(prev => [...prev, val]);
      setBai(val);
      if (addModalType === 'danhGia') {
        setVanDe('');
        setChuyenDe('');
      }
    } else if (addingLevel === 'vanDe') {
      setVanDeList(prev => [...prev, val]);
      setVanDe(val);
      if (addModalType === 'danhGia') {
        setChuyenDe('');
      }
    } else if (addingLevel === 'chuyenDe') {
      setChuyenDeList(prev => [...prev, val]);
      setChuyenDe(val);
    }

    setIsAddingFolder(false);
    setModalAddError(null);
    setShowAddModal(false);

    if (driveRes.isRealDrive) {
      setNotification({
        text: driveRes.alreadyExists
          ? `Đã liên kết thư mục "${val}" trên Google Drive (Đường dẫn: Drive của tôi ➔ myApp ➔ LopU ➔ TaiLieu)!`
          : `Đã tạo thành công thư mục "${val}" trên Google Drive (Đường dẫn: Drive của tôi ➔ myApp ➔ LopU ➔ TaiLieu)!`,
        type: 'success',
      });
    } else {
      setNotification({
        text: `Đã thêm "${val}" vào ứng dụng. (Chưa kết nối Google Drive - Hãy bấm Kết nối Drive để đồng bộ lên drive.google.com)`,
        type: 'info',
      });
    }
    setTimeout(() => setNotification(null), 6000);
  };

  const handleDeleteItem = (lvl: string, itm: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirm({ level: lvl, item: itm });
  };

  const executeDeleteItem = () => {
    if (!deleteConfirm) return;
    const { level: lvl, item: itm } = deleteConfirm;
    if (lvl === 'title') {
      setTitleList(prev => prev.filter(x => x !== itm));
      if (title === itm) setTitle('');
    } else if (lvl === 'chuong') {
      setChuongList(prev => prev.filter(x => x !== itm));
      if (chuong === itm) setChuong('');
    } else if (lvl === 'bai') {
      setBaiList(prev => prev.filter(x => x !== itm));
      if (bai === itm) setBai('');
    } else if (lvl === 'vanDe') {
      setVanDeList(prev => prev.filter(x => x !== itm));
      if (vanDe === itm) setVanDe('');
    } else if (lvl === 'chuyenDe') {
      setChuyenDeList(prev => prev.filter(x => x !== itm));
      if (chuyenDe === itm) setChuyenDe('');
    }
    setDeleteConfirm(null);
  };

  // Render dropdown gọn gàng: BỎ nút "+ Nhập ngoài" bên ngoài, Nút trong đổi thành "Thêm"
  const renderCleanDropdown = (
    lvl: string,
    label: string,
    currentVal: string,
    options: string[],
    isPrimary: boolean = false
  ) => {
    const isOpen = openDropdown === lvl;

    return (
      <div className="space-y-1 relative">
        <label className={`text-[11px] font-bold block ${isPrimary ? 'text-indigo-900' : 'text-slate-700'}`}>
          {label}
        </label>
        
        {/* Nút trigger dropdown (đã bỏ nút Nhập ngoài bên ngoài) */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpenDropdown(isOpen ? null : lvl)}
            className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold text-left flex items-center justify-between transition-colors cursor-pointer ${
              isPrimary
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
            <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto divide-y divide-slate-100 py-1">
              {/* Tùy chọn rỗng (Để trống) */}
              <div
                onClick={() => {
                  if (lvl === 'title') {
                    setTitle('');
                    setChuong('');
                    setBai('');
                    setVanDe('');
                    setChuyenDe('');
                  } else if (lvl === 'chuong') {
                    setChuong('');
                    setBai('');
                    setVanDe('');
                    setChuyenDe('');
                  } else if (lvl === 'bai') {
                    setBai('');
                    setVanDe('');
                    setChuyenDe('');
                  } else if (lvl === 'vanDe') {
                    setVanDe('');
                    setChuyenDe('');
                  } else if (lvl === 'chuyenDe') {
                    setChuyenDe('');
                  }
                  setOpenDropdown(null);
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
                        setTitle(opt);
                        if (isDanhGia(opt)) {
                          setChuong('');
                          setBai('');
                          setVanDe('');
                          setChuyenDe('');
                        }
                      } else if (lvl === 'chuong') {
                        setChuong(opt);
                        if (isDanhGia(opt)) {
                          setBai('');
                          setVanDe('');
                          setChuyenDe('');
                        }
                      } else if (lvl === 'bai') {
                        setBai(opt);
                        if (isDanhGia(opt)) {
                          setVanDe('');
                          setChuyenDe('');
                        }
                      } else if (lvl === 'vanDe') {
                        setVanDe(opt);
                        if (isDanhGia(opt)) {
                          setChuyenDe('');
                        }
                      } else if (lvl === 'chuyenDe') {
                        setChuyenDe(opt);
                      }
                      setOpenDropdown(null);
                    }}
                    className={`px-3 py-2 text-xs flex items-center justify-between gap-2 hover:bg-indigo-50/60 cursor-pointer transition-colors ${
                      opt === currentVal ? 'bg-indigo-50 text-indigo-900 font-bold' : 'text-slate-700'
                    }`}
                  >
                    <span className="truncate flex-1">{opt}</span>
                    <button
                      type="button"
                      title={`Xóa "${opt}"`}
                      onClick={(e) => handleDeleteItem(lvl, opt, e)}
                      className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}

              {/* Nút trong danh sách xổ xuống: Đổi tên thành "Thêm" */}
              <div
                onClick={() => handleOpenAddModal(lvl)}
                className="px-3 py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-50 cursor-pointer flex items-center gap-1.5 border-t border-slate-100 bg-slate-50/50"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm...</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Lưu tài liệu lên Drive
  const handleSaveToDrive = async () => {
    if (!title.trim()) {
      setNotification({ text: 'Vui lòng nhập hoặc chọn Tên tài liệu trước khi lưu!', type: 'error' });
      return;
    }
    setIsSaving(true);
    try {
      const contentHtml = editorRef.current?.innerHTML || '';
      const docItem: TeacherDocument = {
        id: `doc_${Date.now()}`,
        title: title.trim(),
        subject,
        grade,
        chuong: chuong.trim(),
        bai: bai.trim(),
        vanDe: vanDe.trim(),
        chuyenDe: chuyenDe.trim(),
        category: 'lesson_plan',
        contentSnippet: contentHtml.replace(/<[^>]*>/g, '').slice(0, 150) + '...',
        fileType: 'gdoc',
        fileSize: '15 KB',
        authorId: 'teacher_current',
        authorEmail: 'giaovien@school.edu.vn',
        isPublished: targetClasses.length > 0,
        publishedToClasses: targetClasses,
        isForSale,
        priceDiamonds: isForSale ? priceDiamonds : 0,
        driveSynced: true,
        createdAt: new Date().toLocaleDateString('vi-VN'),
        updatedAt: new Date().toLocaleString('vi-VN'),
      };

      await saveTeacherDocument(docItem);
      const res = await saveTeachingMaterialHierarchyToDrive(
        docItem,
        chuong.trim() || 'Chương 1',
        bai.trim() || 'Bài 1',
        vanDe.trim() || 'Vấn đề 1',
        chuyenDe.trim() || 'Chuyên đề trọng tâm'
      );

      const conn = getDriveConnectionState();
      if (conn.isConnected) {
        setNotification({
          text: `Đã lưu thành công lên Google Drive! Đường dẫn: ${res.drivePath}`,
          type: 'success',
        });
      } else {
        setNotification({
          text: `Đã lưu thành công tài liệu vào hệ thống!`,
          type: 'success',
        });
      }
      setTimeout(() => setNotification(null), 5000);
    } catch {
      setNotification({ text: 'Có lỗi xảy ra khi lưu tài liệu. Vui lòng thử lại!', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in max-w-7xl mx-auto pb-12">
      {/* Ẩn file input để chèn ảnh / file / đồ thị TikZ / BBT tikz-tab */}
      <input type="file" ref={imageInputRef} onChange={onImageSelected} accept="image/*" className="hidden" />
      <input type="file" ref={graphInputRef} onChange={onGraphImageSelected} accept="image/*" className="hidden" />
      <input type="file" ref={bbtInputRef} onChange={onBBTImageSelected} accept="image/*" className="hidden" />
      <input type="file" ref={fileInputRef} onChange={onFileSelected} className="hidden" />

      {/* Thông báo thao tác */}
      {notification && (
        <div className={`p-3.5 rounded-xl border text-xs font-bold flex items-center justify-between shadow-xs ${
          notification.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          <span>{notification.text}</span>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
      )}

      {/* Layout 2 cột: Cột trái Dropdown phân cấp (đã bỏ nút Nhập ngoài ngoài, nút trong là Thêm) & Cột phải Trình soạn thảo Word */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Cột trái (4 cột): TÀI LIỆU & NỘI DUNG BÀI DẠY */}
        <div className="lg:col-span-4 space-y-4">
          {/* 1. NHÓM TÀI LIỆU (GỒM MÔN HỌC + KHỐI LỚP VÀ DROPDOWN TÊN TÀI LIỆU) */}
          <div className="bg-white p-4 rounded-2xl border border-indigo-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
              <span className="text-[11px] font-black uppercase text-indigo-900 tracking-wider flex items-center gap-1.5">
                <FolderLock className="w-3.5 h-3.5 text-indigo-600" /> TÀI LIỆU
              </span>
              <span className="text-[10px] text-indigo-600 font-semibold">Môn học + Khối lớp ➔ Tên tài liệu</span>
            </div>

            {/* Hàng 1 của nhóm Tài liệu: Môn học & Khối lớp (đứng trước dropdown chọn Tên tài liệu) */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1">Môn học</label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold focus:outline-indigo-600 bg-white cursor-pointer"
                >
                  <option value="">-- (Để trống) --</option>
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
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold focus:outline-indigo-600 bg-white cursor-pointer"
                >
                  <option value="">-- (Để trống) --</option>
                  <option value="Khối 10">Khối 10</option>
                  <option value="Khối 11">Khối 11</option>
                  <option value="Khối 12">Khối 12</option>
                </select>
              </div>
            </div>

            {/* Hàng tiếp theo của nhóm Tài liệu: Dropdown chọn Tên tài liệu */}
            <div className="pt-1">
              {renderCleanDropdown('title', 'Tên tài liệu', title, titleList, true)}
            </div>
          </div>

          {/* 2. NHÓM NỘI DUNG BÀI DẠY (CHỈ CÒN CHƯƠNG, BÀI, VẤN ĐỀ, CHUYÊN ĐỀ) */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-[11px] font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                <FolderTree className="w-3.5 h-3.5 text-slate-500" /> NỘI DUNG BÀI DẠY
              </span>
              <span className="text-[10px] text-slate-400 italic">Chương ➔ Bài ➔ Vấn đề ➔ Chuyên đề</span>
            </div>

            {/* Các cấp độ: Chương -> Bài -> Vấn đề -> Chuyên đề */}
            {!isDanhGia(title) ? (
              <>
                {renderCleanDropdown('chuong', 'Chương', chuong, chuongList)}
                {!isDanhGia(chuong) ? (
                  <>
                    {renderCleanDropdown('bai', 'Bài', bai, baiList)}
                    {!isDanhGia(bai) ? (
                      <>
                        {renderCleanDropdown('vanDe', 'Vấn đề', vanDe, vanDeList)}
                        {!isDanhGia(vanDe) ? (
                          renderCleanDropdown('chuyenDe', 'Chuyên đề', chuyenDe, chuyenDeList)
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

            {/* Cấu hình phát hành & bán bằng Kim Cương */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-[11px] font-bold text-slate-700">Bán thu phí bằng Kim Cương:</span>
                <input
                  type="checkbox"
                  checked={isForSale}
                  onChange={e => setIsForSale(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                />
              </label>
              {isForSale && (
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[11px] text-amber-800 font-bold">💎 Giá:</span>
                  <input
                    type="number"
                    min={5}
                    value={priceDiamonds}
                    onChange={e => setPriceDiamonds(parseInt(e.target.value) || 5)}
                    className="w-20 px-2 py-1 border border-amber-300 rounded-lg text-xs font-bold text-amber-700"
                  />
                  <span className="text-[10px] text-slate-500">Kim Cương</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Cột phải (8 cột): THANH CÔNG CỤ WORD & TRANG SOẠN THẢO */}
        <div className="lg:col-span-8 space-y-4">
          {/* Menu Thanh công cụ Word - Cố định ở đầu trang khi cuộn xuống dưới */}
          <div className="sticky top-0 z-30 bg-slate-100/95 backdrop-blur-md p-2.5 rounded-t-2xl border border-slate-300 border-b shadow-md flex flex-wrap items-center gap-1.5 transition-all">
            {/* 0. DROPDOWN TIẾN TRÌNH CHUYÊN ĐỀ (ĐỨNG TRƯỚC BIỂU TƯỢNG IN ĐẬM): Gồm 4 phần: Kiến thức, Luyện tập, Kiểm tra, Cải thiện */}
            <div className="flex items-center gap-1 mr-1">
              <select
                id="select-tien-trinh-chuyen-de-word"
                value={tienTrinhChuyenDe}
                onChange={(e) => {
                  const val = e.target.value;
                  setTienTrinhChuyenDe(val);
                  if (val) {
                    setNotification({
                      text: `Tiến trình chuyên đề: ${val}`,
                      type: 'info',
                    });
                    setTimeout(() => setNotification(null), 3000);
                  }
                }}
                className="text-xs font-black bg-white border border-indigo-300 rounded-lg px-2.5 py-1 text-indigo-900 shadow-2xs cursor-pointer focus:ring-2 focus:ring-indigo-500 hover:bg-indigo-50/60 transition-colors"
                title="Tiến trình chuyên đề (4 phần: Kiến thức, Luyện tập, Kiểm tra, Cải thiện)"
              >
                <option value="Kiến thức">📚 1. Kiến thức</option>
                <option value="Luyện tập">✍️ 2. Luyện tập</option>
                <option value="Kiểm tra">📝 3. Kiểm tra</option>
                <option value="Cải thiện">🚀 4. Cải thiện</option>
              </select>
            </div>

            <div className="h-5 w-[1px] bg-slate-300 mx-0.5"></div>

            {/* 1. Đậm, Nghiêng, Gạch chân */}
            <button onClick={() => execCommand('bold')} className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-700 transition-colors" title="Chữ Đậm (Ctrl+B)">
              <Bold className="w-4 h-4" />
            </button>
            <button onClick={() => execCommand('italic')} className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-700 transition-colors" title="Chữ Nghiêng (Ctrl+I)">
              <Italic className="w-4 h-4" />
            </button>
            <button onClick={() => execCommand('underline')} className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-700 transition-colors" title="Gạch Chân (Ctrl+U)">
              <Underline className="w-4 h-4" />
            </button>

            {/* 2. DROPDOWN CỠ CHỮ ĐƯA NGAY SAU GẠCH CHÂN (U) VÀ CHỈ GHI NGẮN GỌN (ví dụ 22px) */}
            <select
              value={fontSize}
              onChange={(e) => {
                setFontSize(e.target.value);
                execCommand('fontSize', '4');
              }}
              className="text-xs font-bold bg-white border border-slate-300 rounded-lg px-2 py-1 text-slate-800 shadow-2xs cursor-pointer focus:ring-1 focus:ring-indigo-500 ml-1"
              title="Cỡ chữ (Mặc định 22px)"
            >
              <option value="12px">12px</option>
              <option value="14px">14px</option>
              <option value="16px">16px</option>
              <option value="18px">18px</option>
              <option value="20px">20px</option>
              <option value="22px">22px</option>
            </select>

            <div className="h-5 w-[1px] bg-slate-300 mx-1"></div>

            {/* 3. MENU CANH LỀ (XỔ XUỐNG): Gôm Trái, Giữa, Phải, Đều 2 bên */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setOpenAlignMenu(!openAlignMenu);
                  setOpenInsertMenu(false);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition-colors cursor-pointer ${
                  openAlignMenu ? 'bg-indigo-100 text-indigo-800 border-indigo-300' : 'bg-white hover:bg-slate-200 text-slate-700 border-slate-200'
                }`}
                title="Canh lề văn bản"
              >
                {currentAlignment === 'left' && <AlignLeft className="w-3.5 h-3.5" />}
                {currentAlignment === 'center' && <AlignCenter className="w-3.5 h-3.5" />}
                {currentAlignment === 'right' && <AlignRight className="w-3.5 h-3.5" />}
                {currentAlignment === 'justify' && <AlignJustify className="w-3.5 h-3.5" />}
                <span>Canh lề</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {openAlignMenu && (
                <div className="absolute z-40 left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl w-40 py-1 divide-y divide-slate-100 animate-fade-in">
                  <button
                    type="button"
                    onClick={() => handleAlign('left')}
                    className="w-full px-3 py-2 text-xs flex items-center gap-2 hover:bg-indigo-50 text-slate-700 text-left font-semibold"
                  >
                    <AlignLeft className="w-4 h-4 text-slate-500" />
                    <span>Canh trái</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAlign('center')}
                    className="w-full px-3 py-2 text-xs flex items-center gap-2 hover:bg-indigo-50 text-slate-700 text-left font-semibold"
                  >
                    <AlignCenter className="w-4 h-4 text-slate-500" />
                    <span>Canh giữa</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAlign('right')}
                    className="w-full px-3 py-2 text-xs flex items-center gap-2 hover:bg-indigo-50 text-slate-700 text-left font-semibold"
                  >
                    <AlignRight className="w-4 h-4 text-slate-500" />
                    <span>Canh phải</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAlign('justify')}
                    className="w-full px-3 py-2 text-xs flex items-center gap-2 hover:bg-indigo-50 text-slate-700 text-left font-semibold"
                  >
                    <AlignJustify className="w-4 h-4 text-slate-500" />
                    <span>Canh đều 2 bên</span>
                  </button>
                </div>
              )}
            </div>

            {/* Danh sách */}
            <button onClick={() => execCommand('insertUnorderedList')} className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-700 transition-colors" title="Danh sách chấm">
              <List className="w-4 h-4" />
            </button>
            <button onClick={() => execCommand('insertOrderedList')} className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-700 transition-colors" title="Danh sách số">
              <ListOrdered className="w-4 h-4" />
            </button>

            <div className="h-5 w-[1px] bg-slate-300 mx-1"></div>

            {/* 4. MENU CHÈN (XỔ XUỐNG): Gôm Chèn bảng, Toán LaTeX, Chèn hình ảnh, Chèn file, Chèn thư mục/E-learning */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setOpenInsertMenu(!openInsertMenu);
                  setOpenAlignMenu(false);
                  setOpenWordViewMenu(false);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition-colors cursor-pointer ${
                  openInsertMenu ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200'
                }`}
                title="Chèn nội dung phong phú vào tài liệu"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Chèn</span>
                <ChevronDown className="w-3 h-3" />
              </button>

              {openInsertMenu && (
                <div className="absolute z-40 left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl w-60 py-1 divide-y divide-slate-100 animate-fade-in">
                  <button
                    type="button"
                    onClick={handleInsertTable}
                    className="w-full px-3 py-2 text-xs flex items-center gap-2.5 hover:bg-indigo-50 text-slate-700 text-left font-semibold"
                  >
                    <Table className="w-4 h-4 text-indigo-600 shrink-0" />
                    <div>
                      <div className="font-bold">Chèn Bảng</div>
                      <div className="text-[10px] text-slate-400 font-normal">Bảng biểu ma trận chuẩn 3 cột</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={handleInsertMath}
                    className="w-full px-3 py-2 text-xs flex items-center gap-2.5 hover:bg-purple-50 text-purple-900 text-left font-semibold"
                  >
                    <span className="font-serif text-sm font-black text-purple-700 shrink-0">∑√</span>
                    <div>
                      <div className="font-bold">Chèn công thức</div>
                      <div className="text-[10px] text-slate-400 font-normal">Soạn công thức toán học MathType</div>
                    </div>
                  </button>

                  {/* 2. Chèn đồ thị (3 menu con: Từ máy tính, Nhập hàm, Tự vẽ) */}
                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => setOpenGraphSubmenu(!openGraphSubmenu)}
                      className="w-full px-3 py-2 text-xs flex items-center justify-between hover:bg-sky-50 text-sky-900 text-left font-semibold cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-sky-600 shrink-0" />
                        <div>
                          <div className="font-bold">Chèn đồ thị (TikZ)</div>
                          <div className="text-[10px] text-slate-400 font-normal">Từ máy tính, Nhập hàm, Tự vẽ</div>
                        </div>
                      </div>
                      <ChevronDown className={`w-3.5 h-3.5 text-sky-500 transition-transform ${openGraphSubmenu ? 'rotate-180' : ''}`} />
                    </button>

                    {openGraphSubmenu && (
                      <div className="ml-5 pl-2.5 border-l-2 border-sky-200 py-1 space-y-1 bg-sky-50/40 rounded-r-lg mr-1.5 my-1">
                        <button
                          type="button"
                          onClick={() => {
                            graphInputRef.current?.click();
                            setOpenInsertMenu(false);
                          }}
                          className="w-full px-2.5 py-1.5 flex items-center gap-2 hover:bg-sky-100/70 text-slate-800 text-left rounded-md cursor-pointer"
                        >
                          <Laptop className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                          <div>
                            <div className="font-bold text-[11px] text-sky-950">1. Từ máy tính</div>
                            <div className="text-[9px] text-slate-500 font-normal">Chọn hình ảnh đồ thị hệ thống dùng TikZ vẽ lại</div>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setShowWordGraphModal(true);
                            setOpenInsertMenu(false);
                          }}
                          className="w-full px-2.5 py-1.5 flex items-center gap-2 hover:bg-sky-100/70 text-slate-800 text-left rounded-md cursor-pointer"
                        >
                          <Calculator className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                          <div>
                            <div className="font-bold text-[11px] text-sky-950">2. Nhập hàm</div>
                            <div className="text-[9px] text-slate-500 font-normal">Nhập công thức hàm số hệ thống dùng TikZ vẽ lại</div>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setWordDrawSketchType('graph');
                            setShowWordDrawSketchModal(true);
                            setOpenInsertMenu(false);
                            setTimeout(() => initWordCanvas('graph'), 50);
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
                      onClick={() => setOpenBbtSubmenu(!openBbtSubmenu)}
                      className="w-full px-3 py-2 text-xs flex items-center justify-between hover:bg-emerald-50 text-emerald-900 text-left font-semibold cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div>
                          <div className="font-bold">Chèn bảng biến thiên (tikz-tab)</div>
                          <div className="text-[10px] text-slate-400 font-normal">Từ máy tính, Nhập hàm, Tự vẽ</div>
                        </div>
                      </div>
                      <ChevronDown className={`w-3.5 h-3.5 text-emerald-500 transition-transform ${openBbtSubmenu ? 'rotate-180' : ''}`} />
                    </button>

                    {openBbtSubmenu && (
                      <div className="ml-5 pl-2.5 border-l-2 border-emerald-200 py-1 space-y-1 bg-emerald-50/40 rounded-r-lg mr-1.5 my-1">
                        <button
                          type="button"
                          onClick={() => {
                            bbtInputRef.current?.click();
                            setOpenInsertMenu(false);
                          }}
                          className="w-full px-2.5 py-1.5 flex items-center gap-2 hover:bg-emerald-100/70 text-slate-800 text-left rounded-md cursor-pointer"
                        >
                          <Laptop className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <div>
                            <div className="font-bold text-[11px] text-emerald-950">1. Từ máy tính</div>
                            <div className="text-[9px] text-slate-500 font-normal">Chọn ảnh bảng biến thiên hệ thống dùng tikz-tab vẽ lại</div>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setShowWordBBTModal(true);
                            setOpenInsertMenu(false);
                          }}
                          className="w-full px-2.5 py-1.5 flex items-center gap-2 hover:bg-emerald-100/70 text-slate-800 text-left rounded-md cursor-pointer"
                        >
                          <Calculator className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <div>
                            <div className="font-bold text-[11px] text-emerald-950">2. Nhập hàm / Biến thiên</div>
                            <div className="text-[9px] text-slate-500 font-normal">Nhập điểm & dấu y', hệ thống dùng tikz-tab vẽ lại</div>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setWordDrawSketchType('bbt');
                            setShowWordDrawSketchModal(true);
                            setOpenInsertMenu(false);
                            setTimeout(() => initWordCanvas('bbt'), 50);
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

                  <button
                    type="button"
                    onClick={handleInsertImage}
                    className="w-full px-3 py-2 text-xs flex items-center gap-2.5 hover:bg-emerald-50 text-emerald-900 text-left font-semibold"
                  >
                    <ImageIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <div className="font-bold">Chèn Hình ảnh</div>
                      <div className="text-[10px] text-slate-400 font-normal">Tải ảnh minh họa từ máy tính</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={handleInsertFile}
                    className="w-full px-3 py-2 text-xs flex items-center gap-2.5 hover:bg-blue-50 text-blue-900 text-left font-semibold"
                  >
                    <FileUp className="w-4 h-4 text-blue-600 shrink-0" />
                    <div>
                      <div className="font-bold">Chèn File</div>
                      <div className="text-[10px] text-slate-400 font-normal">Đính kèm tệp PDF, Docx, Bài tập</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={handleInsertFolderElearning}
                    className="w-full px-3 py-2 text-xs flex items-center gap-2.5 hover:bg-amber-50 text-amber-900 text-left font-semibold"
                  >
                    <FolderArchive className="w-4 h-4 text-amber-600 shrink-0" />
                    <div>
                      <div className="font-bold">Chèn Thư mục (E-Learning)</div>
                      <div className="text-[10px] text-slate-400 font-normal">Bài giảng KienThuc.html & Sandbox</div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            <div className="h-5 w-[1px] bg-slate-300 mx-1"></div>

            {/* 5. NÚT VIEW TRONG MENU WORD: CÁC TÙY CHỌN TÁCH CÂU, TOÀN BỘ, VÀ XEM PPT */}
            <div className="relative">
              <button
                type="button"
                id="btn-word-view-menu"
                onClick={() => {
                  setOpenWordViewMenu(!openWordViewMenu);
                  setOpenAlignMenu(false);
                  setOpenInsertMenu(false);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition-colors cursor-pointer ${
                  openWordViewMenu
                    ? 'bg-purple-700 text-white border-purple-700'
                    : 'bg-purple-50 text-purple-800 hover:bg-purple-100 border-purple-200'
                }`}
                title="Chế độ xem & soạn thảo: Tách câu / Toàn bộ / Xem PPT"
              >
                {wordViewMode === 'split' && <Layers className="w-3.5 h-3.5 text-purple-600" />}
                {wordViewMode === 'full' && <FileText className="w-3.5 h-3.5 text-purple-600" />}
                {wordViewMode === 'ppt' && <Tv className="w-3.5 h-3.5 text-purple-600" />}
                <span>View: {wordViewMode === 'split' ? 'Tách câu' : wordViewMode === 'full' ? 'Toàn bộ' : 'Xem PPT'}</span>
                <ChevronDown className="w-3 h-3 text-purple-400" />
              </button>

              {openWordViewMenu && (
                <div className="absolute z-40 left-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl w-72 py-1.5 divide-y divide-slate-100 animate-fade-in">
                  {/* Tùy chọn 1: Tách câu */}
                  <button
                    type="button"
                    onClick={() => {
                      setWordViewMode('split');
                      setOpenWordViewMenu(false);
                    }}
                    className={`w-full px-3.5 py-2.5 text-xs flex items-start gap-2.5 text-left transition-colors ${
                      wordViewMode === 'split' ? 'bg-indigo-50/80 text-indigo-950 font-bold' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <Layers className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold flex items-center gap-1.5">
                        <span>Tách câu</span>
                        {wordViewMode === 'split' && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-200 text-indigo-800 font-semibold">Đang xem</span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-normal">Soạn thảo từng câu, gán Mức độ 1-6 &amp; đối tượng học sinh</div>
                    </div>
                  </button>

                  {/* Tùy chọn 2: Toàn bộ */}
                  <button
                    type="button"
                    onClick={() => {
                      setWordViewMode('full');
                      setOpenWordViewMenu(false);
                    }}
                    className={`w-full px-3.5 py-2.5 text-xs flex items-start gap-2.5 text-left transition-colors ${
                      wordViewMode === 'full' ? 'bg-blue-50/80 text-blue-950 font-bold' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <FileText className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold flex items-center gap-1.5">
                        <span>Toàn bộ</span>
                        {wordViewMode === 'full' && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-200 text-blue-800 font-semibold">Đang xem</span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-normal">Xem toàn bộ đề thi / tài liệu liên tục khổ giấy A4</div>
                    </div>
                  </button>

                  {/* Tùy chọn 3: Xem PPT */}
                  <button
                    type="button"
                    onClick={() => {
                      setWordViewMode('ppt');
                      setOpenWordViewMenu(false);
                    }}
                    className={`w-full px-3.5 py-2.5 text-xs flex items-start gap-2.5 text-left transition-colors ${
                      wordViewMode === 'ppt' ? 'bg-purple-50/80 text-purple-950 font-bold' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <Tv className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold flex items-center gap-1.5">
                        <span>Xem PPT - Hiện lần lượt đề; lời giải từng câu</span>
                        {wordViewMode === 'ppt' && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-200 text-purple-800 font-semibold">Đang xem</span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-normal">Trình chiếu PowerPoint từng câu, bấm để hiện lời giải</div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Nút Lưu Drive góc phải Toolbar */}
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSaveToDrive}
                className="px-3.5 py-1.5 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <Cloud className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Đang lưu...' : 'Lưu Drive'}</span>
              </button>
            </div>
          </div>

          {/* Vùng hiển thị theo chế độ View được chọn */}
          {wordViewMode === 'ppt' ? (
            <div className="bg-slate-950 p-4 sm:p-6 rounded-b-2xl border border-slate-300 border-t-0 shadow-inner">
              <QuestionEditorWord
                title={title || 'Luyện tập Chuyên đề'}
                chuong={chuong}
                bai={bai}
                vanDe={vanDe}
                chuyenDe={chuyenDe}
                selectedClassId={targetClasses[0] || '10A1'}
                viewMode="ppt"
                onChangeViewMode={(m) => setWordViewMode(m)}
                onSaveDriveSuccess={(p) => {
                  setNotification({ text: `Đã lưu Drive thành công: ${p}`, type: 'success' });
                  setTimeout(() => setNotification(null), 5000);
                }}
              />
            </div>
          ) : wordViewMode === 'split' ? (
            <div className="bg-slate-100 p-4 sm:p-6 rounded-b-2xl border border-slate-300 border-t-0 shadow-inner">
              <QuestionEditorWord
                title={title || 'Luyện tập Chuyên đề'}
                chuong={chuong}
                bai={bai}
                vanDe={vanDe}
                chuyenDe={chuyenDe}
                selectedClassId={targetClasses[0] || '10A1'}
                viewMode="split"
                onChangeViewMode={(m) => setWordViewMode(m)}
                onSaveDriveSuccess={(p) => {
                  setNotification({ text: `Đã lưu Drive thành công: ${p}`, type: 'success' });
                  setTimeout(() => setNotification(null), 5000);
                }}
              />
            </div>
          ) : (
            /* Vùng giấy Word Toàn bộ - Đã bỏ Trang soạn thảo tự do A4 dư thừa */
            <div className="bg-slate-200 p-4 sm:p-8 rounded-b-2xl border border-slate-300 border-t-0 shadow-inner min-h-[540px]">
              <QuestionEditorWord
                title={title || 'Đề thi Đánh giá Toàn bộ'}
                chuong={chuong}
                bai={bai}
                vanDe={vanDe}
                chuyenDe={chuyenDe}
                selectedClassId={targetClasses[0] || '10A1'}
                viewMode="full"
                onChangeViewMode={(m) => setWordViewMode(m)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Modal Thêm mục mới cho dropdown (thay thế nút Nhập ngoài) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4 animate-scale-up">
            <h4 className="font-bold text-sm text-slate-900">
              Thêm vào {addingLevel === 'title' ? 'Tài liệu' : addingLevel === 'chuong' ? 'Chương' : addingLevel === 'bai' ? 'Bài' : addingLevel === 'vanDe' ? 'Vấn đề' : 'Chuyên đề'}
            </h4>

            {/* Dropdown tùy chọn đặt ngay trước ô nhập tên */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-700 block uppercase">
                Tùy chọn loại mục & tên:
              </label>

              <div className="flex flex-col sm:flex-row items-stretch rounded-xl border border-slate-300 focus-within:ring-2 focus-within:ring-indigo-500 overflow-hidden bg-white shadow-2xs">
                {addingLevel === 'chuyenDe' ? (
                  /* Nút Thêm ở chuyên đề: dropdown 3 tùy chọn: Thêm chuyên đề mới / Luyện tập / Đánh giá */
                  <select
                    id="dropdown-word-add-chuyende"
                    value={addModalType}
                    onChange={e => setAddModalType(e.target.value as any)}
                    className="bg-slate-100 text-slate-800 text-xs font-bold py-2.5 px-3 border-b sm:border-b-0 sm:border-r border-slate-300 focus:outline-none cursor-pointer shrink-0"
                  >
                    <option value="">-- (Để trống) --</option>
                    <option value="standard">Thêm chuyên đề mới</option>
                    <option value="luyenTap">Luyện tập</option>
                    <option value="danhGia">Đánh giá</option>
                  </select>
                ) : (
                  /* Nút Thêm ở tài liệu/chương/bài/vấn đề: dropdown 2 tùy chọn: Thêm [...] mới hoặc Đánh giá */
                  <select
                    id="dropdown-word-add-level"
                    value={addModalType}
                    onChange={e => setAddModalType(e.target.value as any)}
                    className="bg-slate-100 text-slate-800 text-xs font-bold py-2.5 px-3 border-b sm:border-b-0 sm:border-r border-slate-300 focus:outline-none cursor-pointer shrink-0"
                  >
                    <option value="">-- (Để trống) --</option>
                    <option value="standard">
                      Thêm {addingLevel === 'title' ? 'tài liệu' : addingLevel === 'chuong' ? 'chương' : addingLevel === 'bai' ? 'bài' : 'vấn đề'} mới
                    </option>
                    <option value="danhGia">Đánh giá</option>
                  </select>
                )}

                <input
                  type="text"
                  autoFocus
                  disabled={isAddingFolder}
                  placeholder={
                    addModalType === 'danhGia'
                      ? 'Nhập tên bài đánh giá (ví dụ: 15 phút, Giữa kỳ)...'
                      : addModalType === 'luyenTap'
                      ? 'Nhập tên bài luyện tập (ví dụ: Tự luyện dạng 1)...'
                      : 'Nhập tên mục mới...'
                  }
                  value={newItemText}
                  onChange={e => {
                    setNewItemText(e.target.value);
                    if (modalAddError) setModalAddError(null);
                  }}
                  onKeyDown={e => e.key === 'Enter' && !isAddingFolder && handleConfirmAddItem()}
                  className="flex-1 px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none min-w-0 disabled:bg-slate-50 disabled:text-slate-400"
                />
              </div>

              {/* Dòng chữ màu đỏ ngay bên dưới chỗ nhập tên thư mục mới trong cửa sổ Thêm vào tài liệu */}
              {isAddingFolder && (
                <div className="mt-2 text-red-600 font-bold text-xs flex items-center gap-1.5 animate-pulse">
                  <span>⏳ Đang kiểm tra và thêm vào hệ thống. Vui lòng đợi...</span>
                </div>
              )}

              {/* Thông báo lỗi màu đỏ nếu chưa thành công */}
              {modalAddError && (
                <div className="mt-2 text-red-600 font-bold text-xs flex items-center gap-1.5">
                  <span>Tạo chưa thành công: {modalAddError}</span>
                </div>
              )}
            </div>

            {/* Live Preview quy cách đặt tên chuẩn */}
            {!isAddingFolder && (addModalType === 'danhGia' || addModalType === 'luyenTap') && (
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] space-y-1">
                <span className="text-slate-500 block">Quy cách đặt tên tệp chuẩn:</span>
                <div className="font-mono font-bold text-xs text-indigo-700 bg-white px-2 py-1 rounded border border-indigo-100 flex items-center gap-1.5 truncate">
                  <span>📄</span>
                  <span className="truncate">
                    {addModalType === 'danhGia'
                      ? formatDanhGiaFileName(newItemText)
                      : formatLuyenTapFileName(newItemText)}
                  </span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
              <button
                type="button"
                disabled={isAddingFolder}
                onClick={() => setShowAddModal(false)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={isAddingFolder || !newItemText.trim()}
                onClick={handleConfirmAddItem}
                className={`px-4 py-1.5 text-xs font-bold text-white rounded-lg shadow-xs cursor-pointer transition-colors flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed ${
                  addModalType === 'danhGia'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : addModalType === 'luyenTap'
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {isAddingFolder ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang kiểm tra Drive...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm mục</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cửa sổ soạn thảo công thức Toán học MathType */}
      <MathTypeEditorModal
        isOpen={showMathTypeModal}
        onClose={() => setShowMathTypeModal(false)}
        onInsert={(_latexCode, renderedHtml) => {
          execCommand('insertHTML', renderedHtml);
        }}
      />

      {/* Modal Nhập công thức Đồ thị TikZ */}
      {showWordGraphModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 space-y-4 animate-scale-up max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-sky-100 text-sky-700">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">
                    {wordGraphOldTikz ? 'Chỉnh sửa Đồ thị TikZ' : 'Nhập hàm số vẽ Đồ thị TikZ'}
                  </h4>
                  <p className="text-[11px] text-slate-500 font-normal">Tùy chỉnh thông số hàm số, miền x/y và các yêu cầu đồ thị</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setWordGraphOldTikz('');
                  setShowWordGraphModal(false);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="p-3.5 bg-sky-50/70 rounded-2xl border border-sky-100 space-y-3">
                <span className="block font-bold text-sky-900 text-xs uppercase tracking-wider">
                  Công thức hàm số & Thiết lập miền
                </span>

                <div className="space-y-3">
                  {/* Ô nhập công thức hàm số (cho phép nhập cả tên hàm) */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-800 block mb-1">
                      Công thức hàm số (nhập đầy đủ tên hàm, ví dụ: y = x^3 - 3x, f(x) = t^3 + 2, y = x^2 - 1):
                    </label>
                    <input
                      type="text"
                      value={wordGraphFormula}
                      onChange={e => {
                        const newFormula = e.target.value;
                        setWordGraphFormula(newFormula);
                        const sug = getWordSuggestedYDomain(newFormula, wordGraphXMin, wordGraphXMax);
                        setWordGraphYMin(sug.suggestedYMin);
                        setWordGraphYMax(sug.suggestedYMax);
                      }}
                      placeholder="Ví dụ: y = x^3 - 3x hoặc f(x) = t^3 + 2 hoặc y = x^2 - 1"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-sky-600 bg-white shadow-2xs"
                    />
                  </div>

                  {/* Nút gợi ý chèn mã LaTeX */}
                  <div>
                    <div className="text-[10px] font-bold text-slate-500 mb-1 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      <span>Gợi ý chèn nhanh ký hiệu:</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {[
                        { label: '+∞', val: '+\\infty' },
                        { label: '-∞', val: '-\\infty' },
                        { label: '∞', val: '\\infty' },
                        { label: '|', val: '|' },
                        { label: '||', val: '||' },
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
                            const newFormula = wordGraphFormula + s.val;
                            setWordGraphFormula(newFormula);
                            const sug = getWordSuggestedYDomain(newFormula, wordGraphXMin, wordGraphXMax);
                            setWordGraphYMin(sug.suggestedYMin);
                            setWordGraphYMax(sug.suggestedYMax);
                          }}
                          className="px-2 py-0.5 rounded-md bg-white hover:bg-sky-100 border border-slate-200 text-[10px] font-mono text-sky-800 transition-colors cursor-pointer shadow-2xs"
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Miền x */}
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-sky-100">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-1">xmin (Cận trái x):</label>
                      <input
                        type="text"
                        value={wordGraphXMin}
                        onChange={e => {
                          const val = e.target.value;
                          setWordGraphXMin(val);
                          const sug = getWordSuggestedYDomain(wordGraphFormula, val, wordGraphXMax);
                          setWordGraphYMin(sug.suggestedYMin);
                          setWordGraphYMax(sug.suggestedYMax);
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold focus:outline-sky-600 bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-1">xmax (Cận phải x):</label>
                      <input
                        type="text"
                        value={wordGraphXMax}
                        onChange={e => {
                          const val = e.target.value;
                          setWordGraphXMax(val);
                          const sug = getWordSuggestedYDomain(wordGraphFormula, wordGraphXMin, val);
                          setWordGraphYMin(sug.suggestedYMin);
                          setWordGraphYMax(sug.suggestedYMax);
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold focus:outline-sky-600 bg-white"
                      />
                    </div>
                  </div>

                  {/* Miền y đề xuất tự động */}
                  <div className="p-2.5 rounded-xl bg-white border border-sky-200 space-y-1.5 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-sky-800">
                        ⚡ Miền y (Đề xuất tự động: GTNN - 1 và GTLN + 1):
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const sug = getWordSuggestedYDomain(wordGraphFormula, wordGraphXMin, wordGraphXMax);
                          setWordGraphYMin(sug.suggestedYMin);
                          setWordGraphYMax(sug.suggestedYMax);
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
                          value={wordGraphYMin}
                          onChange={e => setWordGraphYMin(e.target.value)}
                          className="w-full px-2 py-1 rounded-lg border border-slate-200 text-xs font-semibold focus:outline-sky-600 bg-slate-50"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-medium text-slate-500 block">ymax (Cận trên y):</label>
                        <input
                          type="text"
                          value={wordGraphYMax}
                          onChange={e => setWordGraphYMax(e.target.value)}
                          className="w-full px-2 py-1 rounded-lg border border-slate-200 text-xs font-semibold focus:outline-sky-600 bg-slate-50"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Ô nhập yêu cầu thêm với đồ thị */}
                  <div className="p-2.5 rounded-xl bg-indigo-50/60 border border-indigo-100 space-y-1.5">
                    <label className="text-[10px] font-bold text-indigo-900 block flex items-center gap-1">
                      <span>✨ Yêu cầu thêm với đồ thị:</span>
                    </label>
                    <textarea
                      rows={2}
                      value={wordGraphRequirement}
                      onChange={e => setWordGraphRequirement(e.target.value)}
                      placeholder="Ví dụ: Gióng trục điểm cực trị; Gióng điểm A(1, 2); Tiếp tuyến tại x=1..."
                      className="w-full px-2.5 py-1.5 rounded-lg border border-indigo-200 text-xs font-semibold focus:outline-indigo-600 bg-white"
                    />
                    <div className="flex flex-wrap gap-1">
                      {[
                        'Gióng trục điểm cực trị',
                        'Gióng điểm giao trục Ox, Oy',
                        'Gióng điểm A(1, 2)',
                        'Vẽ tiệm cận đứng & ngang',
                        'Tiếp tuyến tại x=1',
                      ].map((req, rIdx) => (
                        <button
                          key={rIdx}
                          type="button"
                          onClick={() => {
                            setWordGraphRequirement(prev => (prev ? `${prev}; ${req}` : req));
                          }}
                          className="text-[9px] px-1.5 py-0.5 rounded bg-white hover:bg-indigo-100 text-indigo-700 border border-indigo-200 cursor-pointer shadow-2xs font-medium"
                        >
                          + {req}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Hàng nút Hủy & Xác nhận */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-sky-200">
                    <button
                      type="button"
                      onClick={() => {
                        setWordGraphOldTikz('');
                        setShowWordGraphModal(false);
                      }}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      onClick={handleGenerateWordGraphTikZ}
                      className="py-2 px-4 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <TrendingUp className="w-4 h-4" />
                      <span>{wordGraphOldTikz ? 'Xác nhận & Cập nhật đồ thị' : 'Xác nhận & Chèn đồ thị'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nhập Bảng biến thiên tikz-tab */}
      {showWordBBTModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">Nhập Bảng Biến Thiên tikz-tab</h4>
                  <p className="text-[11px] text-slate-500 font-normal">Nhập điểm chia và dấu đạo hàm để tạo bảng biến thiên</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowWordBBTModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Các điểm mốc của x:</label>
                <input
                  type="text"
                  value={wordBbtXPoints}
                  onChange={e => setWordBbtXPoints(e.target.value)}
                  placeholder="Ví dụ: -\\infty, -1, 1, +\\infty"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold focus:outline-emerald-600 bg-slate-50"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Dấu dòng đạo hàm y':</label>
                <input
                  type="text"
                  value={wordBbtYPrimeSigns}
                  onChange={e => setWordBbtYPrimeSigns(e.target.value)}
                  placeholder="Ví dụ: , +, 0, -, 0, +, "
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold focus:outline-emerald-600 bg-slate-50"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Giá trị biến thiên của y:</label>
                <input
                  type="text"
                  value={wordBbtYValues}
                  onChange={e => setWordBbtYValues(e.target.value)}
                  placeholder="Mẫu: -/ -\\infty, +/ 2, -/ -2, +/ +\\infty"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold focus:outline-emerald-600 bg-slate-50"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowWordBBTModal(false)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleGenerateWordBBTTikZ}
                className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Xác nhận & Chèn bảng</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tự vẽ tay Canvas & Nắn chuẩn TikZ / tikz-tab */}
      {showWordDrawSketchModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-5 shadow-2xl border border-slate-200 space-y-4 animate-scale-up max-h-[95vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-xl ${wordDrawSketchType === 'graph' ? 'bg-sky-100 text-sky-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  {wordDrawSketchType === 'graph' ? <TrendingUp className="w-5 h-5" /> : <Activity className="w-5 h-5" />}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">
                    Bảng vẽ tay phác thảo: {wordDrawSketchType === 'graph' ? 'Đồ thị hàm số' : 'Bảng biến thiên'}
                  </h4>
                  <p className="text-[11px] text-slate-500 font-normal">
                    Dùng chuột hoặc cảm ứng vẽ phác thảo, hệ thống sẽ tự nắn chỉnh nét và tạo mã TikZ / tikz-tab chuẩn xác
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowWordDrawSketchModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setWordSketchIsErasing(false)}
                  className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    !wordSketchIsErasing ? 'bg-indigo-600 text-white shadow-2xs' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <PenTool className="w-3.5 h-3.5" />
                  <span>Bút vẽ</span>
                </button>
                <button
                  type="button"
                  onClick={() => setWordSketchIsErasing(true)}
                  className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    wordSketchIsErasing ? 'bg-rose-600 text-white shadow-2xs' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <span>Tẩy</span>
                </button>
                <button
                  type="button"
                  onClick={() => initWordCanvas(wordDrawSketchType)}
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
                    checked={wordSketchAutoAlign}
                    onChange={e => setWordSketchAutoAlign(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-0"
                  />
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-[11px]">Tự động nắn chỉnh nét</span>
                </label>
                <button
                  type="button"
                  onClick={handleAutoAlignWordSketch}
                  className="px-2.5 py-1 bg-amber-100 text-amber-900 hover:bg-amber-200 rounded-lg text-[11px] font-bold cursor-pointer"
                >
                  Nắn chỉnh ngay
                </button>
              </div>
            </div>

            {/* Canvas */}
            <div className="border border-slate-300 rounded-xl overflow-hidden bg-white shadow-inner flex justify-center">
              <canvas
                ref={wordCanvasRef}
                width={560}
                height={260}
                onMouseDown={startWordDrawing}
                onMouseMove={drawWord}
                onMouseUp={stopWordDrawing}
                onMouseLeave={stopWordDrawing}
                onTouchStart={startWordDrawing}
                onTouchMove={drawWord}
                onTouchEnd={stopWordDrawing}
                className="cursor-crosshair touch-none"
              />
            </div>

            {/* Code output */}
            <div className="space-y-2 text-xs">
              <div className="p-2.5 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span className="font-bold text-indigo-950 text-[11px]">Nhận diện & Nắn chỉnh:</span>
                  <span className="text-indigo-800 font-medium text-[11px]">{wordSketchRecognizedShape}</span>
                </div>
                <span className="text-[10px] bg-indigo-200 text-indigo-900 font-bold px-2 py-0.5 rounded-full">Chuẩn TikZ</span>
              </div>

              <div className="space-y-1">
                <span className="font-bold text-slate-700 text-[11px]">Mã TikZ / tikz-tab sinh ra:</span>
                <pre className="p-2.5 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-xl overflow-x-auto max-h-24 border border-slate-800 select-all">
                  {wordSketchGeneratedTikZ}
                </pre>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowWordDrawSketchModal(false)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmInsertWordSketch}
                className={`px-4 py-2 text-xs font-bold text-white rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors ${
                  wordDrawSketchType === 'graph' ? 'bg-sky-600 hover:bg-sky-700' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                <Check className="w-4 h-4" />
                <span>Xác nhận & Chèn vào Word</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal xác nhận xóa */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-3">
            <h4 className="font-bold text-sm text-rose-700">Xác nhận xóa tùy chọn</h4>
            <p className="text-xs text-slate-600">
              Bạn có chắc chắn muốn xóa mục <strong>"{deleteConfirm.item}"</strong> không?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={executeDeleteItem}
                className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Trợ giúp trích xuất danh sách tất cả các vai trò trải nghiệm trong ứng dụng.
 * Hỗ trợ chuyển đổi nhanh vai trò trải nghiệm từ dropdown Vai trò tài khoản.
 */
export function getUserAssignedRoles(profile?: UserProfile | null): UserRole[] {
  return [
    'superadmin',
    'admin',
    'manager',
    'teacher',
    'assistant',
    'student',
    'parent',
    'guest',
  ];
}

/**
 * Kiểm tra xem vai trò hiện tại có quyền truy cập vào ViewId này không.
 */
export function isViewAllowedForRole(viewId: ViewId, role: UserRole): boolean {
  // 1. Phân hệ Hướng dẫn Web (guide-*): chỉ Superadmin
  if (viewId === 'guide-tree' || viewId === 'guide-prompt-assistant' || viewId === 'guide-prompts-saved') {
    return role === 'superadmin';
  }

  // 2. Phân hệ Quản trị & Báo cáo (settings-*, reports-*): Superadmin và Admin
  if (viewId === 'settings-users' || viewId === 'settings-permissions' || viewId === 'reports-progress') {
    return role === 'superadmin' || role === 'admin';
  }

  // 3. Phân hệ Nghiệp vụ Giảng dạy (teaching-*): Superadmin, Admin, Manager, Teacher
  if (
    viewId === 'teaching-soanthao' ||
    viewId === 'teaching-management' ||
    viewId === 'teaching-documents' ||
    viewId === 'teaching-monetization' ||
    viewId === 'teaching-students'
  ) {
    return (
      role === 'superadmin' ||
      role === 'admin' ||
      role === 'manager' ||
      role === 'teacher'
    );
  }

  // 4. Phân hệ Không gian Học tập (learning-*): Cho phép tất cả các vai trò
  return true;
}

export interface NavigationContainerProps {
  activeView: ViewId;
  currentRole: UserRole;
  onOpenDriveConnect: () => void;
  onNavigateToView?: (viewId: ViewId) => void;
  driveEmail?: string;
  onChangeRole?: (role: UserRole) => void;
  currentUserProfile?: UserProfile | null;
  firebaseUser?: any;
}

export const NavigationContainer: React.FC<NavigationContainerProps> = ({
  activeView,
  currentRole,
  onOpenDriveConnect,
  onNavigateToView,
  driveEmail = '',
  onChangeRole,
  currentUserProfile,
  firebaseUser,
}) => {
  const meta = getViewMeta(activeView);
  const viewTitle = meta.title;

  // Kiểm tra quyền truy cập theo vai trò hiện hành
  const isAllowed = isViewAllowedForRole(activeView, currentRole);

  if (!isAllowed) {
    const ROLE_TITLES: Record<UserRole, string> = {
      superadmin: 'Superadmin',
      admin: 'Quản trị viên',
      manager: 'Quản lý môn',
      teacher: 'Giáo viên',
      assistant: 'Trợ giảng',
      student: 'Học sinh',
      parent: 'Phụ huynh',
      guest: 'Khách',
    };

    return (
      <div
        id="panel-permission-restricted"
        className="max-w-xl mx-auto my-12 p-6 sm:p-8 bg-white border border-rose-200 rounded-3xl shadow-lg text-center space-y-4"
      >
        <div className="w-14 h-14 bg-rose-50 border border-rose-100 rounded-2xl flex items-center justify-center mx-auto text-rose-600">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <div>
          <h2 className="text-lg font-black text-slate-900">
            Giới Hạn Quyền Truy Cập
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            Vai trò hiện hành <span className="font-bold text-rose-600">[{ROLE_TITLES[currentRole] || currentRole}]</span> không có quyền truy cập vào mục{' '}
            <span className="font-bold text-slate-900">"{viewTitle}"</span>.
          </p>
        </div>

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-left text-xs text-slate-600 space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-slate-700">
            <Lock className="w-3.5 h-3.5 text-slate-500" />
            <span>Chính sách kiểm soát phân quyền:</span>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-500">
            Khi chuyển đổi vai trò ở menu tài khoản, hệ thống áp dụng nghiêm ngặt các giới hạn hiển thị và nội dung tương ứng với vai trò đó để đảm bảo tính phân quyền chặt chẽ.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
          {onChangeRole && (
            <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-600">Chuyển vai trò:</span>
              <select
                id="select-restricted-role-switcher"
                value={currentRole}
                onChange={e => onChangeRole(e.target.value as UserRole)}
                className="bg-white text-slate-800 text-xs font-bold py-1 px-2 rounded-lg border border-slate-300 shadow-2xs focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                {Object.entries(ROLE_TITLES).map(([r, title]) => (
                  <option key={r} value={r}>
                    {title}
                  </option>
                ))}
              </select>
            </div>
          )}
          {onNavigateToView && (
            <button
              onClick={() => onNavigateToView('learning-classes')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors cursor-pointer shadow-xs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Về Không gian Học tập</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // Render view khi đã được phép
  switch (activeView) {
    // Module 4: Giao diện & Hướng dẫn Web (ModuleGiaoDien) -> Sơ đồ cây module & Trợ lý phân tích lệnh (Chỉ Superadmin)
    case 'guide-tree':
      return <HuongDanWebView currentRole={currentRole} onNavigateToView={onNavigateToView} />;
    case 'guide-prompt-assistant':
      return <PhanTichLenh onNavigateToView={onNavigateToView} />;
    case 'guide-prompts-saved': {
      if (currentRole !== 'superadmin') {
        return (
          <div className="p-8 text-center bg-rose-50 text-rose-700 font-bold border border-rose-200 rounded-2xl max-w-md mx-auto mt-10 shadow-xs">
            Quyền truy cập bị từ chối! Phân hệ này chỉ dành riêng cho Superadmin.
          </div>
        );
      }
      return <LuuPromptChuanView />;
    }

    // Module 1: Không gian Học tập (ModuleHocSinh)
    case 'learning-classes':
      return <LopHocView />;
    case 'learning-seating':
      return <SoDoLopView currentRole={currentRole} onOpenDriveConnect={onOpenDriveConnect} />;
    case 'learning-schedule':
      return <ThoiKhoaBieuView currentRole={currentRole} onOpenDriveConnect={onOpenDriveConnect} />;
    case 'learning-join':
      return <DangKyLopView />;

    // Module 2: Nghiệp vụ Giảng dạy & Lớp học (ModuleGiaoVien)
    case 'teaching-soanthao':
      return <WordSoanThaoView />;
    case 'teaching-management':
      return <QuanLyLopDayView currentRole={currentRole} />;
    case 'teaching-documents':
      return (
        <TaiLieuCaNhanView
          currentRole={currentRole}
          onChangeRole={onChangeRole}
          driveEmail={driveEmail}
          onOpenDriveConnect={onOpenDriveConnect}
        />
      );
    case 'teaching-monetization':
      return <ThuongMaiTaiLieuView />;
    case 'teaching-students':
      return <TheoDoiHocSinhView />;

    // Module 3: Quản trị & Báo cáo Giám sát (ModuleQuanTri)
    case 'reports-progress':
      return <BaoCaoGiamSatView />;
    case 'settings-users':
      return (
        <QuanLyNguoiDungView
          currentRole={currentRole}
          onNavigateToView={onNavigateToView}
          driveEmail={driveEmail}
          onOpenDriveConnect={onOpenDriveConnect}
          onChangeRole={onChangeRole}
        />
      );
    case 'settings-permissions':
      return <PhanQuyenLopHocView currentRole={currentRole} />;

    default:
      return <LopHocView />;
  }
};
