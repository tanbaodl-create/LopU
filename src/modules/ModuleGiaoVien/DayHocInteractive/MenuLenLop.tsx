import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Presentation,
  PenTool,
  Eraser,
  Sparkles,
  RotateCw,
  Plus,
  Play,
  Tv,
  Radio,
  FileDown,
  Calculator,
  Timer,
  Users,
  LineChart,
  TableProperties,
  Maximize2,
  Minimize2,
  ChevronDown,
  X,
  PlayCircle,
  PauseCircle,
  RotateCcw,
  Sparkle,
  MousePointer,
  HelpCircle,
  Highlighter,
  SlidersHorizontal,
  Upload,
  FolderOpen,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Trash2,
  Camera,
  QrCode,
  FileImage,
  CheckCircle2,
  GraduationCap,
  Wrench,
  ChevronsDown,
} from 'lucide-react';
import { BoardStyle } from './DayHocInteractiveView';
import { PenType, ScrblePenMenu, PenIcons } from './scrbleInkUtils';

export interface GraphPoint {
  id: string;
  x: number;
  y?: number;
  labelX?: string;
  labelY?: string;
  isGiongTruc?: boolean;
}

export interface GraphConfig {
  funcExpr: string;
  showGrid: boolean;
  axisNameX: string;
  axisNameY: string;
  zoomLevel: number;
  points: GraphPoint[];
}

export interface PresetPen {
  id: string;
  type: PenType;
  color: string;
  width: number;
  name?: string;
}

export const DEFAULT_PRESET_PENS: PresetPen[] = [
  { id: 'pen_1', type: 'calligraphy', color: '#4a0072', width: 4, name: 'Bút mực tím' },
  { id: 'pen_2', type: 'calligraphy', color: '#ff0000', width: 3, name: 'Bút chấm đỏ' },
  { id: 'pen_3', type: 'highlighter_chisel', color: '#ffff00', width: 16, name: 'Dạ quang vàng' },
];

export interface MenuLenLopProps {
  mode: 'trucTiep' | 'trucTuyen';
  onToggleMode: () => void;
  boardStyle: BoardStyle;
  onChangeBoardStyle: (style: BoardStyle) => void;
  onAdvanceNext: () => void;
  onAddSpeechNote: () => void;
  onClearAllStrokes: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onOpenTvDisplay: () => void;
  onExportPdf: () => void;

  activeTool: 'none' | 'pen' | 'highlighter' | 'eraser' | 'laser';
  onChangeTool: (tool: 'none' | 'pen' | 'highlighter' | 'eraser' | 'laser') => void;
  penColor: string;
  onChangePenColor: (color: string) => void;
  penWidth: number;
  onChangePenWidth: (width: number) => void;
  penType?: PenType;
  onChangePenType?: (type: PenType) => void;

  onInsertGraph: (config: GraphConfig) => void;
  onInsertBbt: (funcExpr: string, title?: string) => void;
  onOpenFileFromDevice?: (file: File) => void;
  classList?: { id: string; name: string }[];

  // Tích hợp bài nộp học sinh trực tiếp lên Menu Lên Lớp
  incomingStudentPhotos?: Array<{
    id: string;
    studentName: string;
    studentCode?: string;
    imageUrl: string;
    time: string;
    exerciseName: string;
  }>;
  onApproveStudentPhoto?: (photo: any) => void;
}

type MainCategory = 'slide' | 'ink' | 'math' | 'tools' | 'display' | 'submission';

export const MenuLenLop: React.FC<MenuLenLopProps> = ({
  mode,
  onToggleMode,
  boardStyle,
  onChangeBoardStyle,
  onAdvanceNext,
  onAddSpeechNote,
  onClearAllStrokes,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  onOpenTvDisplay,
  onExportPdf,
  activeTool,
  onChangeTool,
  penColor,
  onChangePenColor,
  penWidth,
  onChangePenWidth,
  penType = 'calligraphy',
  onChangePenType,
  onInsertGraph,
  onInsertBbt,
  onOpenFileFromDevice,
  classList = [],
  incomingStudentPhotos = [],
  onApproveStudentPhoto,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Trạng thái thu gọn menu mặc định theo yêu cầu người dùng
  const [isMinimized, setIsMinimized] = useState<boolean>(true);
  // Danh mục chính đang được chọn: 'file' | 'vaolop' | 'congcu' | null (mặc định null: menu phụ bình thường ẩn)
  const [activeCategory, setActiveCategory] = useState<'file' | 'vaolop' | 'congcu' | null>(null);
  // Modal hiển thị danh sách bài đã nộp của học sinh
  const [showSubmissionsModal, setShowSubmissionsModal] = useState<boolean>(false);
  // Modal Bảng chọn Bút, Màu & Cỡ nét Scrble Ink
  const [showScrblePenMenu, setShowScrblePenMenu] = useState<boolean>(false);

  // Danh sách các cây bút ghim sẵn (Tối đa 5 bút)
  const [presetPens, setPresetPens] = useState<PresetPen[]>(() => {
    try {
      const saved = localStorage.getItem('lopu_preset_pens');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed.slice(0, 5);
      }
    } catch {}
    return DEFAULT_PRESET_PENS;
  });

  const [activePresetPenId, setActivePresetPenId] = useState<string>(() => {
    return presetPens[0]?.id || 'pen_1';
  });

  useEffect(() => {
    try {
      localStorage.setItem('lopu_preset_pens', JSON.stringify(presetPens));
    } catch {}
  }, [presetPens]);

  // Chọn 1 cây bút trong danh sách bút sẵn
  const handleSelectPresetPen = (pen: PresetPen) => {
    const isAlreadyActive = activePresetPenId === pen.id && (activeTool === 'pen' || activeTool === 'highlighter');
    setActivePresetPenId(pen.id);
    if (onChangePenType) onChangePenType(pen.type);
    onChangePenColor(pen.color);
    onChangePenWidth(pen.width);
    const targetTool = pen.type.startsWith('highlighter') ? 'highlighter' : 'pen';
    onChangeTool(targetTool);

    // Nếu bấm lại vào cây bút đang active thì bật/tắt bảng chọn ScrblePenMenu
    if (isAlreadyActive) {
      setShowScrblePenMenu((prev) => !prev);
    }
  };

  // Thêm 1 cây bút mới vào danh sách bút sẵn (Tối đa 5 bút)
  const handleAddPresetPen = () => {
    if (presetPens.length >= 5) return;
    const colors = ['#0055ff', '#008855', '#ff9900', '#000000', '#a8005b', '#00b4d8'];
    const nextColor = colors.find((c) => !presetPens.some((p) => p.color.toLowerCase() === c.toLowerCase())) || colors[presetPens.length % colors.length];
    const newId = `pen_${Date.now()}`;
    const newPen: PresetPen = {
      id: newId,
      type: 'calligraphy',
      color: nextColor,
      width: 4,
      name: `Bút ${presetPens.length + 1}`,
    };
    const updated = [...presetPens, newPen];
    setPresetPens(updated);
    setActivePresetPenId(newId);
    if (onChangePenType) onChangePenType('calligraphy');
    onChangePenColor(nextColor);
    onChangePenWidth(4);
    onChangeTool('pen');
    setShowScrblePenMenu(true);
  };

  // Xóa 1 cây bút khỏi danh sách bút sẵn
  const handleRemovePresetPen = (penId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (presetPens.length <= 1) return;
    const updated = presetPens.filter((p) => p.id !== penId);
    setPresetPens(updated);
    if (activePresetPenId === penId) {
      handleSelectPresetPen(updated[0]);
    }
  };

  // Đồng bộ loại bút khi chọn từ bảng ScrblePenMenu
  const handleChangePenTypeFromMenu = (type: PenType) => {
    if (onChangePenType) onChangePenType(type);
    setPresetPens((prev) =>
      prev.map((p) => (p.id === activePresetPenId ? { ...p, type } : p))
    );
    if (type.startsWith('highlighter')) {
      onChangeTool('highlighter');
    } else {
      onChangeTool('pen');
    }
  };

  // Đồng bộ màu bút khi chọn từ bảng ScrblePenMenu
  const handleChangePenColorFromMenu = (color: string) => {
    onChangePenColor(color);
    setPresetPens((prev) =>
      prev.map((p) => (p.id === activePresetPenId ? { ...p, color } : p))
    );
  };

  // Đồng bộ cỡ nét khi chỉnh từ bảng ScrblePenMenu
  const handleChangePenWidthFromMenu = (width: number) => {
    onChangePenWidth(width);
    setPresetPens((prev) =>
      prev.map((p) => (p.id === activePresetPenId ? { ...p, width } : p))
    );
  };

  // Modal Đồ thị & Bảng Biến Thiên
  const [showMathModal, setShowMathModal] = useState<'graph' | 'bbt' | null>(null);
  const [funcInput, setFuncInput] = useState<string>('x^3 - 3*x + 1');
  const [funcTitle, setFuncTitle] = useState<string>('');
  const [showGraphGrid, setShowGraphGrid] = useState<boolean>(false); // Mặc định không hiện lưới trục
  const [axisNameX, setAxisNameX] = useState<string>('x');
  const [axisNameY, setAxisNameY] = useState<string>('y');
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [graphPoints, setGraphPoints] = useState<GraphPoint[]>([
    { id: 'p1', x: 0, y: 1, labelX: '0', labelY: '1', isGiongTruc: true },
    { id: 'p2', x: 1, y: -1, labelX: '1', labelY: '-1', isGiongTruc: true },
    { id: 'p3', x: -1, y: 3, labelX: '-1', labelY: '3', isGiongTruc: true },
  ]);
  const [newPointX, setNewPointX] = useState<string>('');

  const computeFx = (expr: string, xVal: number): number | null => {
    try {
      const jsExpr = expr
        .replace(/\^/g, '**')
        .replace(/(\d)([a-zA-Z])/g, '$1*$2')
        .replace(/(\))([a-zA-Z0-9])/g, '$1*$2')
        .replace(/sin/g, 'Math.sin')
        .replace(/cos/g, 'Math.cos')
        .replace(/tan/g, 'Math.tan')
        .replace(/sqrt/g, 'Math.sqrt')
        .replace(/abs/g, 'Math.abs');
      // eslint-disable-next-line no-new-func
      const fn = new Function('x', `return (${jsExpr});`);
      const val = fn(xVal);
      if (typeof val === 'number' && !isNaN(val) && isFinite(val)) {
        return Math.round(val * 100) / 100;
      }
    } catch {}
    return null;
  };

  const handleAddGraphPoint = (xVal: number) => {
    const yVal = computeFx(funcInput, xVal) ?? 0;
    setGraphPoints((prev) => [
      ...prev.filter((p) => Math.abs(p.x - xVal) > 0.001),
      {
        id: String(Date.now() + Math.random()),
        x: xVal,
        y: yVal,
        labelX: String(xVal),
        labelY: String(yVal),
        isGiongTruc: true,
      },
    ]);
    setNewPointX('');
  };

  const handleToggleGiongTruc = (id: string) => {
    setGraphPoints((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isGiongTruc: !p.isGiongTruc } : p))
    );
  };

  const handleRemoveGraphPoint = (id: string) => {
    setGraphPoints((prev) => prev.filter((p) => p.id !== id));
  };

  // Modal Máy tính cầm tay
  const [showCalculator, setShowCalculator] = useState<boolean>(false);
  const [calcInput, setCalcInput] = useState<string>('');
  const [calcResult, setCalcResult] = useState<string>('');

  // Modal Đồng hồ đếm ngược
  const [showTimer, setShowTimer] = useState<boolean>(false);
  const [timerSeconds, setTimerSeconds] = useState<number>(120);
  const [timerActive, setTimerActive] = useState<boolean>(false);

  // Modal Gọi học sinh ngẫu nhiên
  const [showStudentPicker, setShowStudentPicker] = useState<boolean>(false);
  const [pickedStudent, setPickedStudent] = useState<string | null>(null);
  const [isPicking, setIsPicking] = useState<boolean>(false);

  // Modal Mã QR / Cổng nộp bài học sinh
  const [showQrSubmitModal, setShowQrSubmitModal] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Countdown timer interval
  useEffect(() => {
    let interval: any = null;
    if (timerActive && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev - 1);
      }, 1000);
    } else if (timerSeconds === 0 && timerActive) {
      setTimerActive(false);
      try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.play().catch(() => {});
      } catch (e) {}
    }
    return () => clearInterval(interval);
  }, [timerActive, timerSeconds]);

  // Bộ danh sách học sinh mẫu nếu chưa có
  const sampleStudents = [
    'Nguyễn Văn An',
    'Trần Thị Bình',
    'Lê Hoàng Cường',
    'Phạm Thị Dung',
    'Hoàng Minh Đức',
    'Đỗ Thu Hà',
    'Vũ Tuấn Kiệt',
    'Đặng Ngọc Lan',
    'Bùi Quốc Nam',
    'Ngô Phương Thảo',
  ];

  const handlePickRandomStudent = () => {
    setIsPicking(true);
    let counter = 0;
    const interval = setInterval(() => {
      const idx = Math.floor(Math.random() * sampleStudents.length);
      setPickedStudent(sampleStudents[idx]);
      counter++;
      if (counter > 15) {
        clearInterval(interval);
        setIsPicking(false);
      }
    }, 80);
  };

  // Tính toán máy tính
  const handleCalcButton = (val: string) => {
    if (val === 'C') {
      setCalcInput('');
      setCalcResult('');
    } else if (val === 'DEL') {
      setCalcInput((prev) => prev.slice(0, -1));
    } else if (val === '=') {
      try {
        const sanitized = calcInput.replace(/×/g, '*').replace(/÷/g, '/').trim();
        if (!/^[\d\s+\-*/%.()]+$/.test(sanitized)) {
          setCalcResult('Lỗi biểu thức');
          return;
        }
        const computeSafe = new Function(`"use strict"; return (${sanitized});`);
        const res = computeSafe();
        if (typeof res === 'number' && !isNaN(res) && isFinite(res)) {
          setCalcResult(String(Math.round(res * 100000000) / 100000000));
        } else {
          setCalcResult('Lỗi biểu thức');
        }
      } catch (err) {
        setCalcResult('Lỗi biểu thức');
      }
    } else {
      setCalcInput((prev) => prev + val);
    }
  };

  const handleInsertMathConfirm = () => {
    if (!funcInput.trim()) return;
    if (showMathModal === 'graph') {
      onInsertGraph({
        funcExpr: funcInput.trim(),
        showGrid: showGraphGrid,
        axisNameX: axisNameX.trim() || 'x',
        axisNameY: axisNameY.trim() || 'y',
        zoomLevel: zoomLevel,
        points: graphPoints,
      });
    } else if (showMathModal === 'bbt') {
      onInsertBbt(funcInput.trim(), funcTitle.trim() || `Bảng biến thiên y = ${funcInput}`);
    }
    setShowMathModal(null);
  };

  // Quản lý Popover Flyout theo triết lý Scrble Ink
  const [activePopover, setActivePopover] = useState<'pen' | 'eraser' | 'math' | 'tools' | 'display' | 'submission' | null>(null);

  const togglePopover = (name: 'pen' | 'eraser' | 'math' | 'tools' | 'display' | 'submission') => {
    setActivePopover((prev) => (prev === name ? null : name));
  };

  const [minimizedSlotEl, setMinimizedSlotEl] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      const el = document.getElementById('header-minimized-menulenlop-slot');
      if (el) setMinimizedSlotEl(el);
    }
  }, [isMinimized]);

  const currentActivePresetPen = presetPens.find((p) => p.id === activePresetPenId) || presetPens[0];

  // HÀM RENDER THANH PHỤ GỒM CÁC MENU CON THEO DANH MỤC ĐANG CHỌN (TÁI SỬ DỤNG CHO CẢ KHI MỞ RỘNG VÀ KHI THU GỌN VÀO HEADER)
  const renderSubMenuItems = (cat: 'file' | 'vaolop' | 'congcu', isCompact = false) => {
    if (cat === 'file') {
      return (
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Chọn file */}
          <div className="relative group shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Chọn file bài giảng"
              className={`${
                isCompact ? 'p-1.5 rounded-lg' : 'p-2 rounded-xl'
              } bg-slate-800 hover:bg-slate-700 text-teal-300 hover:text-white border border-slate-700 transition-all cursor-pointer flex items-center justify-center shadow-xs`}
            >
              <Upload className={isCompact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
            </button>
            <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 hidden group-hover:flex flex-col items-center pointer-events-none z-50 whitespace-nowrap animate-fade-in">
              <div className="w-1.5 h-1.5 bg-slate-900 rotate-45 -mb-1 border-t border-l border-slate-700" />
              <span className="px-2.5 py-1 bg-slate-900/95 text-teal-300 text-[11px] font-bold rounded-lg shadow-2xl border border-slate-700/80 backdrop-blur-sm">
                Chọn file
              </span>
            </div>
          </div>

          {/* Dropdown chọn kiểu bảng */}
          <div className="relative group shrink-0">
            <div className={`relative flex items-center bg-slate-800 hover:bg-slate-700 border border-slate-700 ${isCompact ? 'rounded-lg px-2 py-1' : 'rounded-xl px-2.5 py-1.5'} transition-all cursor-pointer`}>
              <select
                value={boardStyle}
                onChange={(e) => onChangeBoardStyle(e.target.value as BoardStyle)}
                title="Chọn kiểu bảng"
                className={`bg-transparent text-teal-300 ${isCompact ? 'text-[11px]' : 'text-xs'} font-bold cursor-pointer outline-none appearance-none pr-5`}
              >
                <option value="green_grid" className="bg-slate-900 text-slate-100">🟢 Bảng xanh ô kẻ (1cm)</option>
                <option value="white_grid" className="bg-slate-900 text-slate-100">⚪ Bảng trắng ô kẻ (1cm)</option>
                <option value="black_grid" className="bg-slate-900 text-slate-100">🌑 Bảng đen ô kẻ (1cm)</option>
                <option value="notebook" className="bg-slate-900 text-slate-100">📝 Bảng vở kẻ ngang</option>
                <option value="plain" className="bg-slate-900 text-slate-100">📄 Trắng trơn tự nhiên</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-teal-300 absolute right-1.5 pointer-events-none" />
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 hidden group-hover:flex flex-col items-center pointer-events-none z-50 whitespace-nowrap animate-fade-in">
              <div className="w-1.5 h-1.5 bg-slate-900 rotate-45 -mb-1 border-t border-l border-slate-700" />
              <span className="px-2.5 py-1 bg-slate-900/95 text-teal-300 text-[11px] font-bold rounded-lg shadow-2xl border border-slate-700/80 backdrop-blur-sm">
                Kiểu bảng
              </span>
            </div>
          </div>

          {/* Xuất PDF */}
          <div className="relative group shrink-0">
            <button
              type="button"
              onClick={onExportPdf}
              title="Xuất PDF bài giảng"
              className={`${
                isCompact ? 'p-1.5 rounded-lg' : 'p-2 rounded-xl'
              } bg-slate-800 hover:bg-slate-700 text-teal-300 hover:text-white border border-slate-700 transition-all cursor-pointer flex items-center justify-center shadow-xs`}
            >
              <FileDown className={isCompact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
            </button>
            <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 hidden group-hover:flex flex-col items-center pointer-events-none z-50 whitespace-nowrap animate-fade-in">
              <div className="w-1.5 h-1.5 bg-slate-900 rotate-45 -mb-1 border-t border-l border-slate-700" />
              <span className="px-2.5 py-1 bg-slate-900/95 text-teal-300 text-[11px] font-bold rounded-lg shadow-2xl border border-slate-700/80 backdrop-blur-sm">
                Xuất PDF
              </span>
            </div>
          </div>
        </div>
      );
    }

    if (cat === 'vaolop') {
      return (
        <div className="flex items-center gap-1.5 shrink-0">
          {/* CỤM CÁC BÚT SẴN (PRESET PENS) - TỐI ĐA 5 BÚT */}
          <div className={`flex items-center ${isCompact ? 'gap-1 p-0.5 rounded-xl' : 'gap-1.5 p-1 rounded-2xl'} shrink-0 bg-slate-950/70 border border-slate-800`}>
            {presetPens.map((pen, index) => {
              const isSelected = (activeTool === 'pen' || activeTool === 'highlighter') && activePresetPenId === pen.id;
              const IconComponent = PenIcons[pen.type] || PenIcons['calligraphy'];
              return (
                <div key={pen.id} className="relative group shrink-0">
                  <button
                    type="button"
                    onClick={() => handleSelectPresetPen(pen)}
                    className={`${
                      isCompact ? 'px-2 py-1 rounded-lg gap-1 text-[10px]' : 'px-2.5 py-1.5 rounded-xl gap-1.5 text-xs'
                    } transition-all flex items-center cursor-pointer border relative ${
                      isSelected
                        ? 'bg-indigo-600/35 border-indigo-400 ring-2 ring-indigo-400/50 shadow-md scale-105'
                        : 'bg-slate-800/80 hover:bg-slate-700/80 border-slate-700/80'
                    }`}
                    title={`Bút ${index + 1}: ${
                      pen.type === 'calligraphy'
                        ? 'Calligraphy'
                        : pen.type.startsWith('highlighter')
                        ? 'Dạ quang'
                        : 'Bút bi'
                    } (${pen.width}px). Bấm để dùng hoặc bấm lại để mở bảng chọn bút.`}
                  >
                    <span style={{ color: pen.color }} className="flex items-center justify-center shrink-0">
                      <IconComponent className={isCompact ? 'w-4 h-4' : 'w-4.5 h-4.5'} isSelected={isSelected} />
                    </span>
                    <span className="text-[10px] sm:text-[11px] font-mono font-bold text-slate-200">
                      {pen.width}
                    </span>
                  </button>

                  {/* Nút xóa bút nếu có từ 2 cây bút trở lên */}
                  {presetPens.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => handleRemovePresetPen(pen.id, e)}
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-slate-900 border border-slate-600 hover:bg-rose-600 text-slate-400 hover:text-white rounded-full hidden group-hover:flex items-center justify-center text-[10px] cursor-pointer shadow-md z-10 transition-colors"
                      title="Xóa cây bút này khỏi danh sách"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
              );
            })}



            {/* Nút "+ Thêm bút" (khi có ít hơn 5 bút) */}
            {presetPens.length < 5 && (
              <div className="relative group shrink-0">
                <button
                  type="button"
                  onClick={handleAddPresetPen}
                  className={`${
                    isCompact ? 'px-2 py-1 rounded-lg' : 'px-2.5 py-1.5 rounded-xl'
                  } border border-dashed border-slate-600 hover:border-teal-400 text-slate-400 hover:text-teal-300 hover:bg-teal-500/10 flex items-center gap-1 transition-all text-xs font-bold cursor-pointer`}
                  title="Thêm bút mới (Tối đa 5 cây bút)"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {!isCompact && <span className="text-[11px] font-semibold hidden md:inline">Thêm bút</span>}
                </button>
                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 hidden group-hover:flex flex-col items-center pointer-events-none z-50 whitespace-nowrap animate-fade-in">
                  <div className="w-1.5 h-1.5 bg-slate-900 rotate-45 -mb-1 border-t border-l border-slate-700" />
                  <span className="px-2.5 py-1 bg-slate-900/95 text-teal-300 text-[10px] font-bold rounded-lg shadow-2xl border border-slate-700/80 backdrop-blur-sm">
                    Thêm bút ({presetPens.length}/5)
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Tẩy nét */}
          <div className="relative group shrink-0">
            <button
              type="button"
              onClick={() => onChangeTool(activeTool === 'eraser' ? 'none' : 'eraser')}
              title="Tẩy nét"
              className={`${
                isCompact ? 'p-1.5 rounded-lg' : 'p-2 rounded-xl'
              } transition-all flex items-center justify-center cursor-pointer border ${
                activeTool === 'eraser'
                  ? 'bg-amber-600 text-white border-amber-400 shadow-md ring-1 ring-amber-400'
                  : 'bg-slate-800 text-slate-300 hover:text-white border-slate-700'
              }`}
            >
              <Eraser className={isCompact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
            </button>
            <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 hidden group-hover:flex flex-col items-center pointer-events-none z-50 whitespace-nowrap animate-fade-in">
              <div className="w-1.5 h-1.5 bg-slate-900 rotate-45 -mb-1 border-t border-l border-slate-700" />
              <span className="px-2.5 py-1 bg-slate-900/95 text-amber-300 text-[11px] font-bold rounded-lg shadow-2xl border border-slate-700/80 backdrop-blur-sm">
                Tẩy nét
              </span>
            </div>
          </div>

          {/* Con trỏ Laser */}
          <div className="relative group shrink-0">
            <button
              type="button"
              onClick={() => onChangeTool(activeTool === 'laser' ? 'none' : 'laser')}
              title="Con trỏ laser"
              className={`${
                isCompact ? 'p-1.5 rounded-lg' : 'p-2 rounded-xl'
              } transition-all flex items-center justify-center cursor-pointer border ${
                activeTool === 'laser'
                  ? 'bg-rose-500 text-white border-rose-300 shadow-md ring-1 ring-rose-300'
                  : 'bg-slate-800 text-slate-300 hover:text-white border-slate-700'
              }`}
            >
              <Sparkles className={isCompact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
            </button>
            <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 hidden group-hover:flex flex-col items-center pointer-events-none z-50 whitespace-nowrap animate-fade-in">
              <div className="w-1.5 h-1.5 bg-slate-900 rotate-45 -mb-1 border-t border-l border-slate-700" />
              <span className="px-2.5 py-1 bg-slate-900/95 text-rose-300 text-[11px] font-bold rounded-lg shadow-2xl border border-slate-700/80 backdrop-blur-sm">
                Con trỏ laser
              </span>
            </div>
          </div>

          {/* Chuột chỉ bài */}
          <div className="relative group shrink-0">
            <button
              type="button"
              onClick={() => onChangeTool('none')}
              title="Con trỏ chuột (Tắt vẽ)"
              className={`${
                isCompact ? 'p-1.5 rounded-lg' : 'p-2 rounded-xl'
              } transition-all flex items-center justify-center cursor-pointer border ${
                activeTool === 'none'
                  ? 'bg-teal-600 text-white border-teal-400 shadow-md ring-1 ring-teal-400'
                  : 'bg-slate-800 text-slate-300 hover:text-white border-slate-700'
              }`}
            >
              <MousePointer className={isCompact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
            </button>
            <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 hidden group-hover:flex flex-col items-center pointer-events-none z-50 whitespace-nowrap animate-fade-in">
              <div className="w-1.5 h-1.5 bg-slate-900 rotate-45 -mb-1 border-t border-l border-slate-700" />
              <span className="px-2.5 py-1 bg-slate-900/95 text-teal-300 text-[11px] font-bold rounded-lg shadow-2xl border border-slate-700/80 backdrop-blur-sm">
                Con trỏ chuột
              </span>
            </div>
          </div>

          {/* Hoàn tác, Làm lại, Xóa bảng */}
          <div className="flex items-center gap-1 shrink-0 border-l border-slate-700 pl-1.5">
            <div className="relative group shrink-0">
              <button
                type="button"
                onClick={onUndo}
                disabled={!canUndo}
                title="Hoàn tác (Ctrl+Z)"
                className={`${
                  isCompact ? 'p-1.5 rounded-lg' : 'p-2 rounded-xl'
                } transition-all flex items-center justify-center border border-slate-700 ${
                  canUndo
                    ? 'bg-slate-800 hover:bg-slate-700 text-teal-300 hover:text-white cursor-pointer'
                    : 'bg-slate-900/60 text-slate-600 cursor-not-allowed opacity-40'
                }`}
              >
                <Undo2 className={isCompact ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
              </button>
            </div>

            <div className="relative group shrink-0">
              <button
                type="button"
                onClick={onRedo}
                disabled={!canRedo}
                title="Làm lại (Ctrl+Y)"
                className={`${
                  isCompact ? 'p-1.5 rounded-lg' : 'p-2 rounded-xl'
                } transition-all flex items-center justify-center border border-slate-700 ${
                  canRedo
                    ? 'bg-slate-800 hover:bg-slate-700 text-teal-300 hover:text-white cursor-pointer'
                    : 'bg-slate-900/60 text-slate-600 cursor-not-allowed opacity-40'
                }`}
              >
                <Redo2 className={isCompact ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
              </button>
            </div>

            <div className="relative group shrink-0">
              <button
                type="button"
                onClick={onClearAllStrokes}
                title="Xóa toàn bộ nét vẽ"
                className={`${
                  isCompact ? 'p-1.5 rounded-lg' : 'p-2 rounded-xl'
                } bg-slate-800 hover:bg-rose-950 text-rose-300 hover:text-white border border-slate-700 transition-all cursor-pointer flex items-center justify-center`}
              >
                <RotateCw className={isCompact ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
              </button>
            </div>
          </div>

          <div className="w-px h-4 bg-slate-700 mx-0.5 shrink-0" />

          {/* ĐỒ THỊ */}
          <div className="relative group shrink-0">
            <button
              type="button"
              onClick={() => {
                setShowMathModal('graph');
                setFuncTitle('Khảo sát đồ thị hàm số');
              }}
              title="Đồ thị hàm số"
              className={`${
                isCompact ? 'p-1.5 rounded-lg' : 'p-2 rounded-xl'
              } bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400/50 shadow-md cursor-pointer flex items-center justify-center`}
            >
              <LineChart className={isCompact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
            </button>
          </div>

          {/* BẢNG BIẾN THIÊN */}
          <div className="relative group shrink-0">
            <button
              type="button"
              onClick={() => {
                setShowMathModal('bbt');
                setFuncTitle('Bảng biến thiên hàm số');
              }}
              title="Bảng biến thiên"
              className={`${
                isCompact ? 'p-1.5 rounded-lg' : 'p-2 rounded-xl'
              } bg-teal-600 hover:bg-teal-500 text-white border border-teal-400/50 shadow-md cursor-pointer flex items-center justify-center`}
            >
              <TableProperties className={isCompact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
            </button>
          </div>

          {/* BÀI ĐÃ NỘP */}
          <div className="relative group shrink-0">
            <button
              type="button"
              onClick={() => setShowSubmissionsModal(true)}
              title="Bài đã nộp của học sinh"
              className={`${
                isCompact ? 'p-1.5 rounded-lg' : 'p-2 rounded-xl'
              } bg-purple-600 hover:bg-purple-500 text-white border border-purple-400/50 shadow-md cursor-pointer flex items-center justify-center relative`}
            >
              <Camera className={isCompact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
              {incomingStudentPhotos && incomingStudentPhotos.length > 0 && (
                <span className="absolute -top-1 -right-1 px-1 bg-rose-500 text-white text-[9px] font-black rounded-full animate-pulse shadow-sm">
                  {incomingStudentPhotos.length}
                </span>
              )}
            </button>
          </div>
        </div>
      );
    }

    if (cat === 'congcu') {
      return (
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Casio 580 */}
          <div className="relative group shrink-0">
            <button
              type="button"
              onClick={() => setShowCalculator((prev) => !prev)}
              title="Casio 580"
              className={`${
                isCompact ? 'p-1.5 rounded-lg' : 'p-2 rounded-xl'
              } transition-all flex items-center justify-center cursor-pointer border shadow-md ${
                showCalculator
                  ? 'bg-amber-500 text-slate-950 border-amber-300 ring-1 ring-amber-300 font-bold'
                  : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-700'
              }`}
            >
              <Calculator className={isCompact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
            </button>
          </div>

          {/* Đồng hồ đếm ngược */}
          <div className="relative group shrink-0">
            <button
              type="button"
              onClick={() => setShowTimer((prev) => !prev)}
              title="Đồng hồ đếm ngược"
              className={`${
                isCompact ? 'p-1.5 rounded-lg' : 'p-2 rounded-xl'
              } transition-all flex items-center justify-center cursor-pointer border shadow-md ${
                showTimer
                  ? 'bg-amber-500 text-slate-950 border-amber-300 ring-1 ring-amber-300 font-bold'
                  : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-700'
              }`}
            >
              <Timer className={isCompact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
            </button>
          </div>

          {/* Chiếu tivi */}
          <div className="relative group shrink-0">
            <button
              type="button"
              onClick={onOpenTvDisplay}
              title="Chiếu tivi"
              className={`${
                isCompact ? 'p-1.5 rounded-lg' : 'p-2 rounded-xl'
              } bg-teal-600 hover:bg-teal-500 text-white border border-teal-400 shadow-md cursor-pointer flex items-center justify-center`}
            >
              <Tv className={isCompact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
            </button>
          </div>

          {/* Kích hoạt live */}
          <div className="relative group shrink-0">
            <button
              type="button"
              onClick={onToggleMode}
              title={mode === 'trucTuyen' ? 'Đang Live - Bấm tắt Live' : 'Kích hoạt live'}
              className={`${
                isCompact ? 'p-1.5 rounded-lg' : 'p-2 rounded-xl'
              } transition-all flex items-center justify-center cursor-pointer border shadow-md ${
                mode === 'trucTuyen'
                  ? 'bg-rose-600 text-white border-rose-400 animate-pulse'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700'
              }`}
            >
              <Radio className={isCompact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
            </button>
          </div>
        </div>
      );
    }

    return null;
  };

  // NỘI DUNG THANH MENU LÊN LỚP KHI THU GỌN - HIỂN THỊ SAU CHỮ GIẢNG DẠY VÀ TRƯỚC HỘP THOẠI TÀI KHOẢN
  const effectiveCategory: 'file' | 'vaolop' | 'congcu' = activeCategory || 'vaolop';

  const renderMinimizedHeaderBar = () => (
    <div className="pointer-events-auto flex items-center gap-1 sm:gap-1.5 bg-slate-950/95 backdrop-blur-md px-2 py-1 rounded-2xl border border-slate-700/80 shadow-lg text-white select-none max-w-full overflow-x-auto no-scrollbar animate-fade-in shrink-0">


      {/* 1. Nhóm nút chọn nhanh danh mục chính */}
      <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
        <button
          type="button"
          onClick={() => setActiveCategory('file')}
          title="File bài giảng & Kiểu bảng"
          className={`p-1.5 rounded-lg transition-all cursor-pointer ${
            effectiveCategory === 'file'
              ? 'bg-teal-500/30 text-teal-300 ring-1 ring-teal-400 font-bold'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <FolderOpen className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => setActiveCategory('vaolop')}
          title="Vào lớp (Bút viết, Dạ quang, Tẩy, Laser)"
          className={`p-1.5 rounded-lg transition-all cursor-pointer relative ${
            effectiveCategory === 'vaolop'
              ? 'bg-rose-500/30 text-rose-300 ring-1 ring-rose-400 font-bold'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <GraduationCap className="w-3.5 h-3.5" />
          {incomingStudentPhotos && incomingStudentPhotos.length > 0 && (
            <span className="absolute -top-1 -right-1 px-1 bg-rose-500 text-white text-[9px] font-black rounded-full animate-pulse">
              {incomingStudentPhotos.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveCategory('congcu')}
          title="Công cụ dạy học (Casio, Timer, Tivi, Live)"
          className={`p-1.5 rounded-lg transition-all cursor-pointer ${
            effectiveCategory === 'congcu'
              ? 'bg-indigo-500/30 text-indigo-300 ring-1 ring-indigo-400 font-bold'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Wrench className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={onAdvanceNext}
          title="Chiếu tiếp theo"
          className="p-1.5 rounded-lg text-amber-300 hover:text-amber-200 hover:bg-amber-500/20 transition-all cursor-pointer"
        >
          <PlayCircle className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Vạch ngăn cách */}
      <div className="w-px h-4 bg-slate-700/80 mx-0.5 shrink-0" />

      {/* 2. Thanh phụ của công cụ đang chọn (Vào lớp -> Bút sẵn, Tẩy, Laser, Chuột, Scrble palette, Undo/Redo) */}
      <div className="flex items-center gap-1 shrink-0 overflow-x-auto no-scrollbar">
        {renderSubMenuItems(effectiveCategory, true)}
      </div>

      {/* Vạch ngăn cách */}
      <div className="w-px h-4 bg-slate-700/80 mx-0.5 shrink-0" />

      {/* 3. Nút Biểu Tượng Mở Rộng lại toàn bộ Menu Lên Lớp (ở đuôi thanh) */}
      <button
        type="button"
        id="btn-expand-menulenlop-tail"
        onClick={() => setIsMinimized(false)}
        title="Mở rộng lại Menu Lên Lớp đầy đủ"
        className="p-1.5 bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white rounded-lg transition-all cursor-pointer shrink-0 flex items-center justify-center border border-slate-700 hover:border-indigo-400"
      >
        <Maximize2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );

  // NẾU MENU ĐANG ĐƯỢC THU GỌN:
  // Theo yêu cầu người dùng: Đang chọn công cụ nào của menu chính thì hiển thị thanh phụ lên sau chữ Giảng dạy và trước hộp thoại tên tài khoản
  // Đồng thời luôn có biểu tượng để mở rộng Menu Lên Lớp
  if (isMinimized) {
    const targetEl = minimizedSlotEl || (typeof document !== 'undefined' ? document.getElementById('header-minimized-menulenlop-slot') : null);

    return (
      <>
        {/* Input file ẩn cho chức năng Chọn file */}
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept=".html,.htm,.txt,.ppt,.pptx,.pdf,.png,.jpg,.jpeg,.doc,.docx"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f && onOpenFileFromDevice) {
              onOpenFileFromDevice(f);
            }
            e.target.value = '';
          }}
        />

        {/* Thanh thu gọn portaled lên Header (sau chữ Giảng dạy và trước hộp thoại tài khoản) */}
        {targetEl ? (
          createPortal(renderMinimizedHeaderBar(), targetEl)
        ) : (
          <div className="sticky top-16 z-40 flex justify-start px-3 pointer-events-none">
            <div className="pointer-events-auto">
              {renderMinimizedHeaderBar()}
            </div>
          </div>
        )}



        {/* MODAL / POPOVER BẢNG CHỌN BÚT SCRBLE INK */}
        {showScrblePenMenu && (
          <div className="fixed left-4 sm:left-48 top-[68px] z-50 animate-fade-in shadow-2xl">
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowScrblePenMenu(false)}
                className="absolute top-3.5 right-3.5 w-7 h-7 flex items-center justify-center text-slate-500 hover:text-black rounded-full hover:bg-slate-300 z-10 cursor-pointer transition-colors"
                title="Đóng bảng chọn bút"
              >
                <X className="w-4 h-4" />
              </button>
              <ScrblePenMenu
                penType={currentActivePresetPen?.type || penType || 'calligraphy'}
                onChangePenType={handleChangePenTypeFromMenu}
                penColor={penColor}
                onChangePenColor={handleChangePenColorFromMenu}
                penWidth={penWidth}
                onChangePenWidth={handleChangePenWidthFromMenu}
                boardStyle={boardStyle}
                onClose={() => setShowScrblePenMenu(false)}
              />
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      {/* KHUNG MENU 2 TẦNG CHÍNH THỨC NỔI TRÊN CÙNG (DÙNG top-[72px] ĐỂ NẰM DƯỚI HEADER 64px CỦA TRANG WEB KHI CUỘN) */}
      <div
        onClick={(e) => {
          const target = e.target as HTMLElement;
          // Khi kích vào khoảng trống trên menulenlop (không phải nút bấm, ô nhập, dropdown)
          if (!target.closest('button, select, input, option, textarea, a, [role="button"]')) {
            onChangeTool('none');
          }
        }}
        className="sticky top-[72px] sm:top-[74px] z-40 bg-slate-950/95 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-slate-800 shadow-2xl text-white transition-all duration-200"
      >
        
        {/* TẦNG 1: THANH CHÍNH (PRIMARY ICON BAR) - 1 DÒNG DUY NHẤT, BIỂU TƯỢNG VỚI TOOLTIP, KHÔNG THANH CUỘN */}
        <div className="px-3 py-1.5 flex flex-nowrap items-center justify-between gap-2 bg-slate-950/95 rounded-t-2xl sm:rounded-t-3xl select-none">
          {/* Nhóm Biểu Tượng Danh Mục Chính */}
          <div className="flex flex-nowrap items-center gap-1 sm:gap-1.5 py-0.5 shrink-0">
            {/* Input file ẩn cho chức năng Chọn file */}
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".html,.htm,.txt,.ppt,.pptx,.pdf,.png,.jpg,.jpeg,.doc,.docx"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f && onOpenFileFromDevice) {
                  onOpenFileFromDevice(f);
                }
                e.target.value = '';
              }}
            />

            {/* 1. FILE */}
            <div className="relative group shrink-0">
              <button
                type="button"
                onClick={() => setActiveCategory((prev) => (prev === 'file' ? null : 'file'))}
                title="File"
                className={`p-2 rounded-xl transition-all flex items-center justify-center cursor-pointer border ${
                  activeCategory === 'file'
                    ? 'bg-teal-500/25 text-teal-300 border-teal-500/70 shadow-lg ring-1 ring-teal-500/40'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/90 border-transparent hover:border-slate-700/60'
                }`}
              >
                <FolderOpen className="w-4 h-4" />
              </button>
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 hidden group-hover:flex flex-col items-center pointer-events-none z-50 whitespace-nowrap animate-fade-in">
                <div className="w-1.5 h-1.5 bg-slate-900 rotate-45 -mb-1 border-t border-l border-slate-700" />
                <span className="px-2.5 py-1 bg-slate-900/95 text-teal-300 text-[11px] font-bold rounded-lg shadow-2xl border border-slate-700/80 backdrop-blur-sm">
                  File
                </span>
              </div>
            </div>

            {/* 2. VÀO LỚP */}
            <div className="relative group shrink-0">
              <button
                type="button"
                onClick={() => setActiveCategory((prev) => (prev === 'vaolop' ? null : 'vaolop'))}
                title="Vào lớp"
                className={`p-2 rounded-xl transition-all flex items-center justify-center cursor-pointer border relative ${
                  activeCategory === 'vaolop'
                    ? 'bg-rose-500/25 text-rose-300 border-rose-500/70 shadow-lg ring-1 ring-rose-500/40'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/90 border-transparent hover:border-slate-700/60'
                }`}
              >
                <GraduationCap className="w-4 h-4" />
                {incomingStudentPhotos && incomingStudentPhotos.length > 0 && (
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.2 bg-rose-500 text-white text-[10px] font-black rounded-full animate-pulse shadow-sm">
                    {incomingStudentPhotos.length}
                  </span>
                )}
              </button>
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 hidden group-hover:flex flex-col items-center pointer-events-none z-50 whitespace-nowrap animate-fade-in">
                <div className="w-1.5 h-1.5 bg-slate-900 rotate-45 -mb-1 border-t border-l border-slate-700" />
                <span className="px-2.5 py-1 bg-slate-900/95 text-rose-300 text-[11px] font-bold rounded-lg shadow-2xl border border-slate-700/80 backdrop-blur-sm">
                  Vào lớp
                </span>
              </div>
            </div>

            {/* 3. CÔNG CỤ */}
            <div className="relative group shrink-0">
              <button
                type="button"
                onClick={() => setActiveCategory((prev) => (prev === 'congcu' ? null : 'congcu'))}
                title="Công cụ"
                className={`p-2 rounded-xl transition-all flex items-center justify-center cursor-pointer border ${
                  activeCategory === 'congcu'
                    ? 'bg-indigo-500/25 text-indigo-300 border-indigo-500/70 shadow-lg ring-1 ring-indigo-500/40'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/90 border-transparent hover:border-slate-700/60'
                }`}
              >
                <Wrench className="w-4 h-4" />
              </button>
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 hidden group-hover:flex flex-col items-center pointer-events-none z-50 whitespace-nowrap animate-fade-in">
                <div className="w-1.5 h-1.5 bg-slate-900 rotate-45 -mb-1 border-t border-l border-slate-700" />
                <span className="px-2.5 py-1 bg-slate-900/95 text-indigo-300 text-[11px] font-bold rounded-lg shadow-2xl border border-slate-700/80 backdrop-blur-sm">
                  Công cụ
                </span>
              </div>
            </div>

            <div className="w-px h-5 bg-slate-800 mx-1 shrink-0" />

            {/* Chiếu tiếp theo */}
            <div className="relative group shrink-0">
              <button
                type="button"
                onClick={onAdvanceNext}
                title="Chiếu tiếp theo"
                className="p-2 rounded-xl transition-all flex items-center justify-center cursor-pointer text-amber-300 hover:text-amber-200 hover:bg-amber-500/20 border border-transparent hover:border-amber-500/50"
              >
                <PlayCircle className="w-4 h-4" />
              </button>
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 hidden group-hover:flex flex-col items-center pointer-events-none z-50 whitespace-nowrap animate-fade-in">
                <div className="w-1.5 h-1.5 bg-slate-900 rotate-45 -mb-1 border-t border-l border-slate-700" />
                <span className="px-2.5 py-1 bg-slate-900/95 text-amber-300 text-[11px] font-bold rounded-lg shadow-2xl border border-slate-700/80 backdrop-blur-sm">
                  Chiếu tiếp theo
                </span>
              </div>
            </div>
          </div>

          {/* Phía phải: Chỉ báo Timer / Trạng thái thu gọn */}
          <div className="flex flex-nowrap items-center gap-1.5 shrink-0 ml-auto">
            {timerActive && (
              <div
                onClick={() => setShowTimer(true)}
                className="flex items-center gap-1.5 bg-amber-950/80 border border-amber-600/80 px-2.5 py-1 rounded-xl text-amber-300 animate-pulse font-mono font-bold text-xs cursor-pointer"
                title="Bấm để xem Đồng hồ đếm ngược"
              >
                <Timer className="w-3.5 h-3.5" />
                <span>
                  {Math.floor(timerSeconds / 60)}:
                  {timerSeconds % 60 < 10 ? `0${timerSeconds % 60}` : timerSeconds % 60}
                </span>
              </div>
            )}

            <div className="relative group shrink-0">
              <button
                type="button"
                onClick={() => setIsMinimized(true)}
                title="Thu gọn menu"
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
              <div className="absolute right-0 top-full mt-2 hidden group-hover:flex flex-col items-center pointer-events-none z-50 whitespace-nowrap animate-fade-in">
                <div className="w-1.5 h-1.5 bg-slate-900 rotate-45 -mb-1 border-t border-l border-slate-700" />
                <span className="px-2.5 py-1 bg-slate-900/95 text-slate-200 text-[11px] font-bold rounded-lg shadow-2xl border border-slate-700/80 backdrop-blur-sm">
                  Thu gọn menu
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* TẦNG 2: THANH PHỤ THEO NGỮ CẢNH (CHỈ XUẤT HIỆN KHI CHỌN TRÊN MENU CHÍNH, BÌNH THƯỜNG ẨN, KHÔNG DÙNG THANH CUỘN) */}
        {activeCategory !== null && (
          <div className="px-3 py-2 bg-slate-900/90 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2.5 text-xs rounded-b-2xl sm:rounded-b-3xl animate-fade-in select-none">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 py-0.5 shrink-0">
              {renderSubMenuItems(activeCategory, false)}
            </div>

            {/* Nút đóng thanh menu phụ */}
            <div className="relative group shrink-0 ml-auto">
              <button
                type="button"
                onClick={() => setActiveCategory(null)}
                title="Đóng menu phụ"
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="absolute right-0 top-full mt-2 hidden group-hover:flex flex-col items-center pointer-events-none z-50 whitespace-nowrap animate-fade-in">
                <div className="w-1.5 h-1.5 bg-slate-900 rotate-45 -mb-1 border-t border-l border-slate-700" />
                <span className="px-2 py-0.5 bg-slate-900/95 text-slate-300 text-[10px] font-bold rounded-md shadow-lg border border-slate-700">
                  Đóng
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL / POPOVER BẢNG CHỌN BÚT SCRBLE INK (PEN, 30 MÀU, SIZE) */}
      {showScrblePenMenu && (
        <div className="fixed sm:absolute left-4 sm:left-16 top-[130px] z-50 animate-fade-in shadow-2xl">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowScrblePenMenu(false)}
              className="absolute top-3.5 right-3.5 w-7 h-7 flex items-center justify-center text-slate-500 hover:text-black rounded-full hover:bg-slate-300 z-10 cursor-pointer transition-colors"
              title="Đóng bảng chọn bút"
            >
              <X className="w-4 h-4" />
            </button>
            <ScrblePenMenu
              penType={penType}
              onChangePenType={handleChangePenTypeFromMenu}
              penColor={penColor}
              onChangePenColor={handleChangePenColorFromMenu}
              penWidth={penWidth}
              onChangePenWidth={handleChangePenWidthFromMenu}
              boardStyle={boardStyle}
              onClose={() => setShowScrblePenMenu(false)}
            />
          </div>
        </div>
      )}

      {/* MODAL 1: CHÈN ĐỒ THỊ HOẶC BẢNG BIẾN THIÊN */}
      {showMathModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-xl w-full p-5 sm:p-6 text-white space-y-4 shadow-2xl animate-fade-in my-auto max-h-[92vh] overflow-y-auto no-scrollbar">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                {showMathModal === 'graph' ? (
                  <LineChart className="w-5 h-5 text-indigo-400" />
                ) : (
                  <TableProperties className="w-5 h-5 text-teal-400" />
                )}
                <h3 className="font-bold text-base">
                  {showMathModal === 'graph' ? '📈 Tùy Chỉnh & Chèn Đồ Thị Hàm Số' : '📊 Chèn Bảng Biến Thiên'}
                </h3>
              </div>
              <button
                onClick={() => setShowMathModal(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {showMathModal === 'bbt' && (
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Tiêu đề (Tùy chọn):</label>
                  <input
                    type="text"
                    value={funcTitle}
                    onChange={(e) => setFuncTitle(e.target.value)}
                    placeholder="Ví dụ: Bảng biến thiên hàm số y = f(x)"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}

              {/* 1. Biểu thức hàm số */}
              <div>
                <label className="block text-slate-300 font-bold mb-1">Biểu thức hàm số y = f(x):</label>
                <input
                  type="text"
                  value={funcInput}
                  onChange={(e) => setFuncInput(e.target.value)}
                  placeholder="Ví dụ: x^3 - 3*x + 1 hoặc -x^2 + 4*x - 3"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-teal-300 font-mono text-sm outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Gợi ý hàm số mẫu */}
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <span className="font-bold text-slate-300">Gợi ý một số hàm số mẫu:</span>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {['x^3 - 3*x + 1', '-x^4 + 2*x^2 + 1', '(2*x + 1)/(x - 1)', '-x^2 + 4*x - 3'].map((fn) => (
                    <button
                      key={fn}
                      type="button"
                      onClick={() => setFuncInput(fn)}
                      className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-teal-300 rounded font-mono cursor-pointer"
                    >
                      {fn}
                    </button>
                  ))}
                </div>
              </div>

              {/* TÙY CHỌN RIÊNG CHO ĐỒ THỊ */}
              {showMathModal === 'graph' && (
                <div className="space-y-3.5 border-t border-slate-800 pt-3">
                  
                  {/* Nhóm 1: Sửa tên trục & Zoom */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Sửa tên trục */}
                    <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/80 space-y-2">
                      <span className="font-bold text-slate-200 block text-[11px] uppercase tracking-wide">
                        🏷️ Tên trục tọa độ
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <label className="text-[10px] text-slate-400 block mb-0.5">Trục hoành:</label>
                          <input
                            type="text"
                            value={axisNameX}
                            onChange={(e) => setAxisNameX(e.target.value)}
                            placeholder="x"
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-center font-bold font-mono text-amber-300 outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-[10px] text-slate-400 block mb-0.5">Trục tung:</label>
                          <input
                            type="text"
                            value={axisNameY}
                            onChange={(e) => setAxisNameY(e.target.value)}
                            placeholder="y"
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-center font-bold font-mono text-amber-300 outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Tùy chọn Zoom (Thu phóng) */}
                    <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-200 text-[11px] uppercase tracking-wide flex items-center gap-1">
                          <ZoomIn className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Thu phóng (Zoom)</span>
                        </span>
                        <span className="font-mono text-indigo-300 font-bold bg-slate-900 px-2 py-0.5 rounded text-[11px]">
                          {zoomLevel.toFixed(2)}x
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setZoomLevel((prev) => Math.max(0.5, Math.round((prev - 0.25) * 100) / 100))}
                          className="p-1.5 bg-slate-900 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white cursor-pointer"
                          title="Thu nhỏ"
                        >
                          <ZoomOut className="w-3.5 h-3.5" />
                        </button>
                        <div className="flex-1 flex gap-1 justify-center">
                          {[0.75, 1.0, 1.25, 1.5, 2.0].map((z) => (
                            <button
                              key={z}
                              type="button"
                              onClick={() => setZoomLevel(z)}
                              className={`px-1.5 py-1 rounded-md font-mono text-[10px] font-bold cursor-pointer transition-all ${
                                Math.abs(zoomLevel - z) < 0.05
                                  ? 'bg-indigo-600 text-white shadow-xs'
                                  : 'bg-slate-900 text-slate-400 hover:text-white'
                              }`}
                            >
                              {z}x
                            </button>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => setZoomLevel((prev) => Math.min(2.5, Math.round((prev + 0.25) * 100) / 100))}
                          className="p-1.5 bg-slate-900 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white cursor-pointer"
                          title="Phóng to"
                        >
                          <ZoomIn className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Nhóm 2: Tùy chọn Lưới Trục */}
                  <div
                    onClick={() => setShowGraphGrid(!showGraphGrid)}
                    className="flex items-center gap-2.5 p-2.5 bg-slate-800/80 hover:bg-slate-800 rounded-xl border border-slate-700 cursor-pointer select-none transition-colors"
                  >
                    <input
                      type="checkbox"
                      id="showGraphGridCheckbox"
                      checked={showGraphGrid}
                      onChange={(e) => setShowGraphGrid(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-500"
                    />
                    <label htmlFor="showGraphGridCheckbox" className="text-xs text-slate-200 font-bold cursor-pointer">
                      Hiện lưới trục tọa độ <span className="text-[11px] text-slate-400 font-normal">(Mặc định: Không có lưới)</span>
                    </label>
                  </div>

                  {/* Nhóm 3: Thêm / Xóa Giá Trị Các Điểm & Gióng Trục */}
                  <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/80 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200 text-[11px] uppercase tracking-wide">
                        📍 Điểm đặc biệt & Gióng trục tọa độ
                      </span>
                      <span className="text-[10px] text-slate-400">
                        ({graphPoints.length} điểm)
                      </span>
                    </div>

                    {/* Thêm điểm mới */}
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.5"
                        value={newPointX}
                        onChange={(e) => setNewPointX(e.target.value)}
                        placeholder="Nhập hoành độ x (vd: 2, -1)..."
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:ring-2 focus:ring-indigo-500"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newPointX.trim() !== '') {
                            e.preventDefault();
                            handleAddGraphPoint(Number(newPointX));
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newPointX.trim() !== '') {
                            handleAddGraphPoint(Number(newPointX));
                          }
                        }}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex items-center gap-1 cursor-pointer shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Thêm điểm</span>
                      </button>
                    </div>

                    {/* Gợi ý thêm nhanh điểm đặc biệt */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[11px]">
                      <span className="text-slate-400 text-[10px]">Thêm nhanh:</span>
                      {[0, 1, -1, 2, -2].map((xVal) => (
                        <button
                          key={xVal}
                          type="button"
                          onClick={() => handleAddGraphPoint(xVal)}
                          className="px-2 py-0.5 bg-slate-900 hover:bg-slate-700 text-teal-300 rounded-md font-mono text-[10px] cursor-pointer"
                        >
                          x = {xVal}
                        </button>
                      ))}
                    </div>

                    {/* Danh sách các điểm & Tùy chọn Gióng trục */}
                    {graphPoints.length > 0 ? (
                      <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 no-scrollbar pt-1">
                        {graphPoints.map((p) => (
                          <div
                            key={p.id}
                            className="flex items-center justify-between p-2 bg-slate-900/90 rounded-xl border border-slate-800 text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-teal-400 shrink-0" />
                              <span className="font-mono font-bold text-white">
                                ({p.x}; {p.y ?? computeFx(funcInput, p.x) ?? '?'})
                              </span>
                            </div>

                            <div className="flex items-center gap-3">
                              {/* Toggle gióng trục */}
                              <label className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={p.isGiongTruc !== false}
                                  onChange={() => handleToggleGiongTruc(p.id)}
                                  className="w-3.5 h-3.5 rounded text-teal-500 accent-teal-500 cursor-pointer"
                                />
                                <span>Gióng trục (Ox, Oy)</span>
                              </label>

                              {/* Nút xóa điểm */}
                              <button
                                type="button"
                                onClick={() => handleRemoveGraphPoint(p.id)}
                                className="p-1 text-slate-400 hover:text-rose-400 rounded cursor-pointer"
                                title="Xóa điểm này"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-500 italic py-1 text-center">
                        Chưa có điểm đặc biệt nào được đánh dấu.
                      </p>
                    )}

                    {/* Ghi chú khung chữ nhật bao quanh */}
                    <div className="p-2 bg-slate-950/80 rounded-xl border border-slate-800/80 text-[11px] text-emerald-400 flex items-center gap-1.5">
                      <span className="shrink-0">📐</span>
                      <span>Đồ thị và các nét dóng được giới hạn bên trong hình chữ nhật từ đầu trục đến cuối trục (không vẽ thừa ra ngoài).</span>
                    </div>
                  </div>

                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowMathModal(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleInsertMathConfirm}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-xl text-xs cursor-pointer shadow-lg"
              >
                Chèn Lên Bảng Giảng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: MÁY TÍNH CẦM TAY NỔI (FLOATING SCIENTIFIC CALCULATOR) */}
      {showCalculator && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-3xl p-4 shadow-2xl text-white w-72 animate-fade-in">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
            <span className="text-xs font-bold text-teal-300 flex items-center gap-1.5">
              <Calculator className="w-4 h-4" />
              <span>Máy Tính Bỏ Túi FX</span>
            </span>
            <button
              onClick={() => setShowCalculator(false)}
              className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Màn hình máy tính */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-right mb-3 min-h-[58px] flex flex-col justify-end">
            <div className="text-xs text-slate-400 font-mono overflow-x-auto">{calcInput || '0'}</div>
            <div className="text-lg font-bold text-teal-300 font-mono overflow-x-auto">{calcResult}</div>
          </div>

          {/* Bàn phím số */}
          <div className="grid grid-cols-4 gap-1.5 text-xs font-bold">
            {['C', 'DEL', '(', ')'].map((btn) => (
              <button
                key={btn}
                onClick={() => handleCalcButton(btn)}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-xl cursor-pointer"
              >
                {btn}
              </button>
            ))}
            {['7', '8', '9', '÷'].map((btn) => (
              <button
                key={btn}
                onClick={() => handleCalcButton(btn)}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl cursor-pointer"
              >
                {btn}
              </button>
            ))}
            {['4', '5', '6', '×'].map((btn) => (
              <button
                key={btn}
                onClick={() => handleCalcButton(btn)}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl cursor-pointer"
              >
                {btn}
              </button>
            ))}
            {['1', '2', '3', '-'].map((btn) => (
              <button
                key={btn}
                onClick={() => handleCalcButton(btn)}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl cursor-pointer"
              >
                {btn}
              </button>
            ))}
            {['0', '.', '=', '+'].map((btn) => (
              <button
                key={btn}
                onClick={() => handleCalcButton(btn)}
                className={`p-2 rounded-xl cursor-pointer ${
                  btn === '=' ? 'bg-teal-600 hover:bg-teal-500 text-white' : 'bg-slate-800 hover:bg-slate-700 text-white'
                }`}
              >
                {btn}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* MODAL 3: ĐỒNG HỒ ĐẾM NGƯỢC NỔI */}
      {showTimer && (
        <div className="fixed bottom-6 left-6 z-50 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-3xl p-4 shadow-2xl text-white w-64 animate-fade-in space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
              <Timer className="w-4 h-4" />
              <span>Đồng Hồ Đếm Ngược</span>
            </span>
            <button
              onClick={() => setShowTimer(false)}
              className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="text-center py-2 bg-slate-950 rounded-2xl border border-slate-800">
            <span className="text-3xl font-black font-mono text-amber-400">
              {Math.floor(timerSeconds / 60)}:
              {timerSeconds % 60 < 10 ? `0${timerSeconds % 60}` : timerSeconds % 60}
            </span>
          </div>

          {/* Nút bấm nhanh thời gian */}
          <div className="flex items-center justify-center gap-1.5 text-xs">
            {[60, 120, 180, 300].map((sec) => (
              <button
                key={sec}
                onClick={() => {
                  setTimerSeconds(sec);
                  setTimerActive(false);
                }}
                className={`px-2 py-1 rounded-lg font-bold cursor-pointer ${
                  timerSeconds === sec ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {sec / 60}p
              </button>
            ))}
          </div>

          {/* Điều khiển Play/Pause/Reset */}
          <div className="flex items-center justify-center gap-2 pt-1">
            <button
              onClick={() => setTimerActive(!timerActive)}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-md ${
                timerActive ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
              }`}
            >
              {timerActive ? <PauseCircle className="w-4 h-4" /> : <PlayCircle className="w-4 h-4" />}
              <span>{timerActive ? 'Tạm Dừng' : 'Bắt Đầu'}</span>
            </button>
            <button
              onClick={() => {
                setTimerActive(false);
                setTimerSeconds(120);
              }}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl cursor-pointer"
              title="Đặt lại 2 phút"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* MODAL 4: VÒNG QUAY GỌI HỌC SINH NGẪU NHIÊN */}
      {showStudentPicker && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-sm w-full p-6 text-white text-center space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="font-bold text-sm text-indigo-300 flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>Gọi Học Sinh Trả Lời</span>
              </span>
              <button
                onClick={() => setShowStudentPicker(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 bg-slate-950 rounded-2xl border border-slate-800 min-h-[100px] flex items-center justify-center">
              {pickedStudent ? (
                <div className="space-y-1">
                  <span className="text-xs text-indigo-400 font-bold uppercase tracking-wider">Học sinh được chọn:</span>
                  <h2 className="text-xl font-black text-yellow-300 animate-bounce">{pickedStudent}</h2>
                </div>
              ) : (
                <span className="text-xs text-slate-400">Nhấp "Quay Ngẫu Nhiên" để chọn 1 học sinh</span>
              )}
            </div>

            <button
              onClick={handlePickRandomStudent}
              disabled={isPicking}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-extrabold rounded-xl text-sm cursor-pointer shadow-lg flex items-center justify-center gap-2"
            >
              <Sparkle className={`w-4 h-4 ${isPicking ? 'animate-spin' : ''}`} />
              <span>{isPicking ? 'Đang quay số...' : '🎲 Quay Ngẫu Nhiên'}</span>
            </button>
          </div>
        </div>
      )}

      {/* MODAL 5: MÃ QR & CỔNG NỘP BÀI HỌC SINH TẠI LỚP */}
      {showQrSubmitModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 text-white space-y-5 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-teal-400" />
                <h3 className="font-extrabold text-base">Cổng Thu Bài Học Sinh Trực Tiếp</h3>
              </div>
              <button
                onClick={() => setShowQrSubmitModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-center space-y-4">
              <p className="text-xs text-slate-300">
                Học sinh dùng điện thoại hoặc máy tính bảng quét mã QR bên dưới để chụp và nộp ảnh bài làm trực tiếp lên Bảng Giảng của Thầy/Cô.
              </p>

              <div className="p-4 bg-white rounded-2xl inline-block shadow-xl mx-auto border-4 border-teal-500/30">
                {/* SVG QR Code minh họa chuẩn mực */}
                <svg className="w-44 h-44" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="100" height="100" fill="#ffffff"/>
                  {/* Position detection patterns */}
                  <rect x="10" y="10" width="24" height="24" fill="#0f172a" rx="3"/>
                  <rect x="14" y="14" width="16" height="16" fill="#ffffff" rx="1"/>
                  <rect x="18" y="18" width="8" height="8" fill="#0f172a" rx="1"/>

                  <rect x="66" y="10" width="24" height="24" fill="#0f172a" rx="3"/>
                  <rect x="70" y="14" width="16" height="16" fill="#ffffff" rx="1"/>
                  <rect x="74" y="18" width="8" height="8" fill="#0f172a" rx="1"/>

                  <rect x="10" y="66" width="24" height="24" fill="#0f172a" rx="3"/>
                  <rect x="14" y="70" width="16" height="16" fill="#ffffff" rx="1"/>
                  <rect x="18" y="74" width="8" height="8" fill="#0f172a" rx="1"/>

                  {/* QR Data modules pattern */}
                  <rect x="38" y="12" width="6" height="6" fill="#0f172a"/>
                  <rect x="48" y="12" width="6" height="6" fill="#0f172a"/>
                  <rect x="38" y="22" width="6" height="6" fill="#0f172a"/>
                  <rect x="52" y="24" width="6" height="6" fill="#0f172a"/>

                  <rect x="12" y="38" width="6" height="6" fill="#0f172a"/>
                  <rect x="22" y="42" width="6" height="6" fill="#0f172a"/>
                  <rect x="38" y="38" width="8" height="8" fill="#0d9488" rx="2"/>
                  <rect x="50" y="38" width="6" height="6" fill="#0f172a"/>
                  <rect x="62" y="42" width="6" height="6" fill="#0f172a"/>
                  <rect x="76" y="38" width="6" height="6" fill="#0f172a"/>
                  <rect x="84" y="44" width="6" height="6" fill="#0f172a"/>

                  <rect x="38" y="52" width="6" height="6" fill="#0f172a"/>
                  <rect x="48" y="56" width="6" height="6" fill="#0f172a"/>
                  <rect x="62" y="54" width="6" height="6" fill="#0f172a"/>
                  <rect x="74" y="52" width="6" height="6" fill="#0f172a"/>

                  <rect x="38" y="66" width="6" height="6" fill="#0f172a"/>
                  <rect x="48" y="72" width="6" height="6" fill="#0f172a"/>
                  <rect x="60" y="68" width="6" height="6" fill="#0f172a"/>
                  <rect x="76" y="68" width="6" height="6" fill="#0f172a"/>
                  <rect x="84" y="76" width="6" height="6" fill="#0f172a"/>
                  <rect x="42" y="82" width="6" height="6" fill="#0f172a"/>
                  <rect x="56" y="84" width="6" height="6" fill="#0f172a"/>
                  <rect x="70" y="82" width="6" height="6" fill="#0f172a"/>
                </svg>
              </div>

              <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 text-left space-y-1.5">
                <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Đường link nộp bài nhanh:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value="https://app.aistudio.build/nop-bai/lop-12a1"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-teal-300 font-mono select-all"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText('https://app.aistudio.build/nop-bai/lop-12a1');
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2000);
                    }}
                    className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold shrink-0 cursor-pointer transition-colors"
                  >
                    {copiedLink ? 'Đã sao chép!' : 'Sao chép'}
                  </button>
                </div>
              </div>

              <div className="text-xs text-slate-400 flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Hệ thống tự động đồng bộ ảnh bài nộp sau mỗi 2 giây.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: DANH SÁCH BÀI ĐÃ NỘP CỦA HỌC SINH */}
      {showSubmissionsModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-xl w-full p-5 sm:p-6 text-white space-y-4 shadow-2xl animate-fade-in my-auto max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-purple-400" />
                <h3 className="font-extrabold text-base">
                  📸 Bài Đã Nộp Của Học Sinh ({incomingStudentPhotos.length})
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowQrSubmitModal(true)}
                  className="px-3 py-1 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                  title="Mở mã QR để học sinh quét gửi bài từ điện thoại"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Mã QR Thu Bài</span>
                </button>
                <button
                  onClick={() => setShowSubmissionsModal(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 no-scrollbar pr-1">
              {incomingStudentPhotos.length === 0 ? (
                <div className="py-12 text-center space-y-3 bg-slate-950/60 rounded-2xl border border-slate-800">
                  <Camera className="w-10 h-10 text-slate-600 mx-auto" />
                  <p className="text-sm text-slate-400 font-semibold">
                    Hiện chưa có học sinh nào nộp bài.
                  </p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Bấm "Mã QR Thu Bài" phía trên để học sinh dùng điện thoại chụp và gửi bài làm trực tiếp lên Bảng Giảng.
                  </p>
                  <button
                    onClick={() => setShowQrSubmitModal(true)}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Mở Mã QR Thu Bài Ngay</span>
                  </button>
                </div>
              ) : (
                incomingStudentPhotos.map((photo) => (
                  <div
                    key={photo.id}
                    className="p-3 bg-slate-800/80 hover:bg-slate-800 rounded-2xl border border-slate-700/80 flex items-center justify-between gap-3 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={photo.imageUrl}
                        alt="Bài làm học sinh"
                        className="w-14 h-14 rounded-xl object-cover border border-slate-600 shrink-0 bg-black"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-white truncate">
                            {photo.studentName}
                          </span>
                          {photo.studentCode && (
                            <span className="text-[10px] font-mono bg-slate-900 text-purple-300 px-2 py-0.5 rounded-md border border-slate-700">
                              {photo.studentCode}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-300 truncate mt-0.5">
                          {photo.exerciseName}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                          Gửi lúc: {photo.time}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        if (onApproveStudentPhoto) {
                          onApproveStudentPhoto(photo);
                          setShowSubmissionsModal(false);
                        }
                      }}
                      className="px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shrink-0 cursor-pointer shadow-md transition-all hover:scale-105"
                      title="Đưa bài làm này lên Bảng Giảng để sửa bài"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Đưa Lên Bảng</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
