import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import katex from 'katex';
import { ViewId, getViewMeta } from '../../ModuleGiaoDien/Navigation/menuConfig';
import { UserRole, UserProfile, TeacherDocument, ClassItem } from '../../../services/storageTypes';
import { MathTypeEditorModal } from '../TaiLieuCaNhan/MathTypeEditorModal';
import { QuestionEditorWord, QuestionViewMode } from '../TaiLieuCaNhan/QuestionEditorWord';
import { convertMathExprToJs } from '../TaiLieuCaNhan/TikZVisualRenderer';
import {
  formatDanhGiaFileName,
  formatLuyenTapFileName,
  isDanhGia,
} from '../TaiLieuCaNhan/TaiLieuCaNhanView';
import {
  getStoredHierarchy,
  formatDocumentTitle,
  matchesSubjectAndGrade,
  saveStoredHierarchy,
  HierarchyStore,
} from '../TaiLieuCaNhan/hierarchyData';
import {
  ShieldAlert,
  ShieldCheck,
  ArrowLeft,
  ArrowUpDown,
  Lock,
  Bold,
  Italic,
  Underline,
  Undo,
  Redo,
  Baseline,
  Highlighter,
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
  ChevronLeft,
  ChevronRight,
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
  Maximize2,
  Minimize2,
  CornerDownLeft,
  Edit3,
  Printer,
  FileSpreadsheet,
  Download,
  X,
  MousePointer,
  Pen,
  Pencil,
  Paintbrush,
  Eraser,
  Palette,
} from 'lucide-react';
import { InDeFileHsView } from './InDeFileHsView';
import { WordTextColorPicker, WordHighlightColorPicker } from './WordColorPicker';
import { WordStyleMenu } from './WordStyleMenu';
import { MenuHamSo } from './MenuHamSo';
import { MenuChen } from './MenuChen';
import { DongBoDriveButton } from './DongBoDrive';
import {
  createByPath,
  deleteByPath,
  getNestedDriveTree,
  saveDocumentToDriveAndDatabase,
  formatSafeSlug,
} from '../index';
import { getClasses, getTeacherDocuments, saveTeacherDocument } from '../../ConnectData/ConnectFirestore';
import {
  saveTeachingMaterialHierarchyToDrive,
  getDriveConnectionState,
  createDriveFolderIfNotExists,
  deleteDriveFolderHierarchy,
  connectGoogleDrive,
  ensureValidDriveToken,
  isRealGoogleOAuthToken,
  loadChuyenDeContentFromDrive,
  deduplicateItemsBySlug,
} from '../../ConnectData/ConnectDrive/googleDriveService';
import {
  PptSlideViewer,
  PptMarkerRail,
  parseDocumentToSlides,
  RailMarker,
  RailLineItem,
  PptSlideItem,
  PptRailClickMenuData,
  PptEffectType,
  getPptEffectDef,
  PptWhiteboardData,
  BoardHtmlItem,
  BoardTool,
  PenType,
  NoteRendererSpaceIcon,
} from '../../ModuleGiaoDien/modulePPT';

export type { RailMarker, RailLineItem, PptSlideItem, PptRailClickMenuData, PptEffectType, PptWhiteboardData, BoardHtmlItem, BoardTool, PenType };

export const WordSoanThaoView: React.FC<{ currentRole?: UserRole }> = ({ currentRole }) => {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [documents, setDocuments] = useState<TeacherDocument[]>([]);
  
  // Trạng thái gợi ý mặc định là rỗng
  const [title, setTitle] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [grade, setGrade] = useState<string>('');
  const [chuong, setChuong] = useState<string>('');
  const [bai, setBai] = useState<string>('');
  const [vanDe, setVanDe] = useState<string>('');
  const [chuyenDe, setChuyenDe] = useState<string>('');
  
  const [isForSale, setIsForSale] = useState<boolean>(false);
  const [priceDiamonds, setPriceDiamonds] = useState<number>(50);
  const [targetClasses, setTargetClasses] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'saved' | 'unsaved'>('idle');
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [isLoadingFromDrive, setIsLoadingFromDrive] = useState<boolean>(false);
  const [isReauthenticating, setIsReauthenticating] = useState<boolean>(false);
  const [isBackgroundSyncing, setIsBackgroundSyncing] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'info' | 'error' | 'warning' } | null>(null);

  // Lắng nghe sự kiện xác thực lại nền Google Drive để đồng bộ giao diện khóa/mở khóa
  useEffect(() => {
    const handleAuthChange = (e: any) => {
      setIsReauthenticating(Boolean(e.detail?.isAuthenticating));
    };
    const handleTokenExpired = () => {
      if (isTeacherOrHigher(currentRole)) {
        setIsReauthenticating(true);
        ensureValidDriveToken(undefined, true)
          .catch((err) => console.warn('Lỗi kiểm tra token Drive:', err))
          .finally(() => {
            setIsReauthenticating(false);
          });
      }
    };
    window.addEventListener('lopu_drive_auth_change', handleAuthChange);
    window.addEventListener('lopu_drive_token_expired', handleTokenExpired);
    return () => {
      window.removeEventListener('lopu_drive_auth_change', handleAuthChange);
      window.removeEventListener('lopu_drive_token_expired', handleTokenExpired);
    };
  }, [currentRole]);

  // Editor states: Cỡ chữ mặc định 22px
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const graphInputRef = useRef<HTMLInputElement>(null);
  const bbtInputRef = useRef<HTMLInputElement>(null);
  const [fontSize, setFontSize] = useState<string>('14px');
  const [textColor, setTextColor] = useState<string>('#0f172a');
  const [highlightColor, setHighlightColor] = useState<string>('transparent');
  const [selectedStyle, setSelectedStyle] = useState<string>('p');
  const [isBold, setIsBold] = useState<boolean>(false);
  const [isItalic, setIsItalic] = useState<boolean>(false);
  const [isUnderline, setIsUnderline] = useState<boolean>(false);

  // Trạng thái mở menu xổ xuống của Toolbar
  const [openInsertMenu, setOpenInsertMenu] = useState<boolean>(false);
  const [openFunctionMenu, setOpenFunctionMenu] = useState<boolean>(false);
  const [openGraphSubmenu, setOpenGraphSubmenu] = useState<boolean>(false);
  const [openBbtSubmenu, setOpenBbtSubmenu] = useState<boolean>(false);
  const [openAlignMenu, setOpenAlignMenu] = useState<boolean>(false);
  const [openTextColorMenu, setOpenTextColorMenu] = useState<boolean>(false);
  const [openHighlightColorMenu, setOpenHighlightColorMenu] = useState<boolean>(false);
  const [openStyleMenu, setOpenStyleMenu] = useState<boolean>(false);
  const [openWordViewMenu, setOpenWordViewMenu] = useState<boolean>(false);
  const [wordViewMode, setWordViewMode] = useState<QuestionViewMode>('full');
  const [currentAlignment, setCurrentAlignment] = useState<'left' | 'center' | 'right' | 'justify'>('left');
  const [tienTrinhChuyenDe, setTienTrinhChuyenDe] = useState<string>('Kiến thức');
  const [selectedExerciseName, setSelectedExerciseName] = useState<string>('');
  const [selectedKienThucName, setSelectedKienThucName] = useState<string>('Lý thuyết trọng tâm');
  const [customKienThucList, setCustomKienThucList] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('lopu_custom_kienthuc_list');
      if (saved) return JSON.parse(saved);
    } catch {}
    return ['Lý thuyết trọng tâm', 'Tóm tắt công thức'];
  });
  const [customLuyenTapList, setCustomLuyenTapList] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('lopu_custom_luyentap_list');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });
  const [customKtdgList, setCustomKtdgList] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('lopu_custom_ktdg_list');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  // Modal sửa tên / xóa bài cho Kiến thức (KienThuc_*.html), Luyện tập (luyentap_*.json), KTĐG (KTDG_*.json)
  const [itemActionModal, setItemActionModal] = useState<{
    type: 'rename' | 'delete';
    category: 'kienThuc' | 'luyenTap' | 'ktdg';
    item: string;
    newName: string;
  } | null>(null);

  const handleConfirmItemAction = async () => {
    if (!itemActionModal) return;
    if (!hasAuthoringPermission) {
      setNotification({
        text: '⚠️ Bạn không có Quyền biên soạn tài liệu! Thao tác sửa hoặc xóa bài chỉ cấp cho Giáo viên.',
        type: 'warning',
      });
      setItemActionModal(null);
      return;
    }
    const { type, category, item, newName } = itemActionModal;
    const cleanName = newName.trim();

    if (type === 'delete') {
      if (category === 'kienThuc') {
        const updated = customKienThucList.filter(x => x !== item);
        const finalUpdated = updated.length > 0 ? updated : ['Lý thuyết trọng tâm'];
        setCustomKienThucList(finalUpdated);
        localStorage.setItem('lopu_custom_kienthuc_list', JSON.stringify(finalUpdated));
        setSelectedKienThucName(finalUpdated[0]);
        setNotification({ text: `Đã xóa bài kiến thức "${item}" thành công!`, type: 'info' });
      } else if (category === 'luyenTap') {
        const updated = customLuyenTapList.filter(x => x !== item);
        setCustomLuyenTapList(updated);
        localStorage.setItem('lopu_custom_luyentap_list', JSON.stringify(updated));
        setSelectedExerciseName(updated[0] || '');
        setNotification({ text: `Đã xóa bài luyện tập "${item}" thành công!`, type: 'info' });
      } else if (category === 'ktdg') {
        const updated = customKtdgList.filter(x => x !== item);
        setCustomKtdgList(updated);
        localStorage.setItem('lopu_custom_ktdg_list', JSON.stringify(updated));
        setSelectedExerciseName(updated[0] || '');
        setNotification({ text: `Đã xóa đề kiểm tra "${item}" thành công!`, type: 'info' });
      }
      setItemActionModal(null);
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    if (!cleanName) {
      setNotification({ text: 'Vui lòng nhập tên hợp lệ!', type: 'error' });
      return;
    }

    // Khi thêm mới (!item): Kiểm tra tệp đã có trong danh sách hoặc trên Google Drive hay chưa
    if (!item) {
      const targetList = category === 'kienThuc' ? customKienThucList : category === 'luyenTap' ? customLuyenTapList : customKtdgList;
      const cleanSlug = formatSafeSlug(cleanName).toLowerCase();
      const isExistInList = targetList.some(x => x.toLowerCase().trim() === cleanName.toLowerCase() || formatSafeSlug(x).toLowerCase() === cleanSlug);

      if (isExistInList) {
        setNotification({
          text: `Bài/Tệp "${cleanName}" đã tồn tại trong danh sách. Không thể thêm trùng tên!`,
          type: 'error',
        });
        setTimeout(() => setNotification(null), 4000);
        return;
      }

      // Kiểm tra thực tế trên Google Drive
      const token = localStorage.getItem('lopu_google_drive_token_v1') || localStorage.getItem('lopu_gdrive_token');
      if (token && chuyenDe) {
        try {
          const driveCheck = await loadChuyenDeContentFromDrive({
            title, subject, grade, chuong, bai, vanDe, chuyenDe,
            tienTrinh: category === 'kienThuc' ? 'Kiến thức' : category === 'luyenTap' ? 'Luyện tập' : 'KTDG',
            selectedKienThucName: cleanName,
            selectedExerciseName: cleanName,
          });

          if (driveCheck.loadedFile && driveCheck.loadedFile.name) {
            const loadedSlug = formatSafeSlug(driveCheck.loadedFile.name).toLowerCase();
            if (loadedSlug.includes(cleanSlug) || cleanSlug.includes(loadedSlug)) {
              setNotification({
                text: `Tệp "${driveCheck.loadedFile.name}" đã tồn tại trên Google Drive. Không thể thêm trùng tên!`,
                type: 'error',
              });
              setTimeout(() => setNotification(null), 4500);
              return;
            }
          }
        } catch (err) {
          console.warn('Lỗi kiểm tra trùng lặp tệp trên Drive:', err);
        }
      }
    }

    if (category === 'kienThuc') {
      let updated: string[];
      if (item) {
        updated = customKienThucList.map(x => (x === item ? cleanName : x));
      } else {
        updated = [cleanName, ...customKienThucList];
      }
      updated = deduplicateItemsBySlug(updated);
      setCustomKienThucList(updated);
      localStorage.setItem('lopu_custom_kienthuc_list', JSON.stringify(updated));
      setSelectedKienThucName(cleanName);

      if (!item) {
        // Mở cửa sổ Word mới với nội dung rỗng
        if (editorRef.current) editorRef.current.innerHTML = '<p><br></p>';
        setWordDocumentHtml('<p><br></p>');
        lastLoadedDocKeyRef.current = `${title || ''}_${chuyenDe || ''}_${bai || ''}_${tienTrinhChuyenDe}_${cleanName}_${selectedExerciseName || ''}`;
      }

      const fileSlug = formatSafeSlug(cleanName);
      setNotification({
        text: `Đã ${item ? 'đổi tên thành' : 'mở trang Word mới với nội dung rỗng cho bài'} "${cleanName}" (Tệp Drive: KienThuc_${fileSlug}.html)`,
        type: 'success',
      });
    } else if (category === 'luyenTap') {
      let updated: string[];
      if (item) {
        updated = customLuyenTapList.map(x => (x === item ? cleanName : x));
      } else {
        updated = Array.from(new Set([...customLuyenTapList, cleanName]));
      }
      setCustomLuyenTapList(updated);
      localStorage.setItem('lopu_custom_luyentap_list', JSON.stringify(updated));
      setSelectedExerciseName(cleanName);

      if (!item) {
        // Mở cửa sổ Word mới với nội dung rỗng
        if (editorRef.current) editorRef.current.innerHTML = '<p><br></p>';
        setWordDocumentHtml('<p><br></p>');
        lastLoadedDocKeyRef.current = `${title || ''}_${chuyenDe || ''}_${bai || ''}_${tienTrinhChuyenDe}_${selectedKienThucName || ''}_${cleanName}`;
      }

      const fileSlug = formatSafeSlug(cleanName);
      setNotification({
        text: `Đã ${item ? 'đổi tên thành' : 'mở trang Word mới với nội dung rỗng cho bài'} "${cleanName}" (Tệp Drive: luyentap_${fileSlug}.json)`,
        type: 'success',
      });
    } else if (category === 'ktdg') {
      let updated: string[];
      if (item) {
        updated = customKtdgList.map(x => (x === item ? cleanName : x));
      } else {
        updated = Array.from(new Set([...customKtdgList, cleanName]));
      }
      setCustomKtdgList(updated);
      localStorage.setItem('lopu_custom_ktdg_list', JSON.stringify(updated));
      setSelectedExerciseName(cleanName);

      if (!item) {
        // Mở cửa sổ Word mới với nội dung rỗng
        if (editorRef.current) editorRef.current.innerHTML = '<p><br></p>';
        setWordDocumentHtml('<p><br></p>');
        lastLoadedDocKeyRef.current = `${title || ''}_${chuyenDe || ''}_${bai || ''}_${tienTrinhChuyenDe}_${selectedKienThucName || ''}_${cleanName}`;
      }

      const fileSlug = formatSafeSlug(cleanName);
      setNotification({
        text: `Đã ${item ? 'đổi tên thành' : 'mở trang Word mới với nội dung rỗng cho đề'} "${cleanName}" (Tệp Drive: KTDG_${fileSlug}.json)`,
        type: 'success',
      });
    }

    setItemActionModal(null);
    setTimeout(() => setNotification(null), 3500);
  };
  const [insertPositionMode, setInsertPositionMode] = useState<'cursor' | 'bottom'>('bottom');
  const [openSoanBaiMenu, setOpenSoanBaiMenu] = useState<boolean>(false);
  const [isHierarchyExpanded, setIsHierarchyExpanded] = useState<boolean>(false);

  // Bộ đệm lưu trữ nội dung Word và trình chiếu Slide PPT (Đề xuất 2)
  const [wordDocumentHtml, setWordDocumentHtml] = useState<string>('');
  const [activePptSlideIndex, setActivePptSlideIndex] = useState<number>(0);
  const [activePptStepIndex, setActivePptStepIndex] = useState<number>(0);
  const [revealAllSteps, setRevealAllSteps] = useState<boolean>(false);
  const [isPptFullScreen, setIsPptFullScreen] = useState<boolean>(false);
  const [railMarkers, setRailMarkers] = useState<RailMarker[]>([]);
  const [railLineItems, setRailLineItems] = useState<RailLineItem[]>([]);
  const [selectedPinMenu, setSelectedPinMenu] = useState<{ marker: RailMarker; x: number; y: number } | null>(null);
  const [pptRailClickMenu, setPptRailClickMenu] = useState<PptRailClickMenuData | null>(null);
  const draggedMarkerRef = useRef<RailMarker | null>(null);

  // Danh sách khoảng trống viết bảng tương tác chèn vào các bước slide PPT (NoteRenderer style)
  const [pptWhiteboards, setPptWhiteboards] = useState<PptWhiteboardData[]>([]);
  const [activePptWhiteboardId, setActivePptWhiteboardId] = useState<string | null>(null);
  const [isInsertSpaceMode, setIsInsertSpaceMode] = useState<boolean>(false);

  // Cấu hình độc lập (loại bút, màu sắc, nét vẽ) cho 5 ngòi bút tùy chỉnh (Bút 1 -> Bút 5)
  const [pptActiveTool, setPptActiveTool] = useState<BoardTool>('pen');

  interface PptPenSlot {
    id: number;
    name: string;
    penType: PenType;
    color: string;
    strokeWidth: number;
  }

  const DEFAULT_PPT_5_PENS: PptPenSlot[] = [
    { id: 0, name: 'Bút 1', penType: 'ballpoint', color: '#1d4ed8', strokeWidth: 2.2 },
    { id: 1, name: 'Bút 2', penType: 'fountain', color: '#7e22ce', strokeWidth: 2.8 },
    { id: 2, name: 'Bút 3', penType: 'brush', color: '#059669', strokeWidth: 6.0 },
    { id: 3, name: 'Bút 4', penType: 'highlighter', color: '#facc15', strokeWidth: 20.0 },
    { id: 4, name: 'Bút 5', penType: 'laser', color: '#ef4444', strokeWidth: 5.0 },
  ];

  const [pptPenSlots, setPptPenSlots] = useState<PptPenSlot[]>(() => {
    try {
      const saved = localStorage.getItem('lopu_ppt_5_pen_slots');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 5) {
          return parsed;
        }
      }
    } catch {
      // fallback
    }
    return DEFAULT_PPT_5_PENS;
  });

  const [activePenSlotIndex, setActivePenSlotIndex] = useState<number>(0);
  const [pptPenPopupSlotIndex, setPptPenPopupSlotIndex] = useState<number | null>(null);

  // Tự động lưu cấu hình 5 ngòi bút của giáo viên vào localStorage
  useEffect(() => {
    try {
      localStorage.setItem('lopu_ppt_5_pen_slots', JSON.stringify(pptPenSlots));
    } catch {
      // ignore
    }
  }, [pptPenSlots]);

  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef<boolean>(false);

  const startPenSlotLongPress = (idx: number) => {
    isLongPressRef.current = false;
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
    longPressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      handleSelectPenSlot(idx);
      setPptPenPopupSlotIndex(idx);
    }, 600);
  };

  const cancelPenSlotLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handlePenSlotClick = (idx: number) => {
    if (isLongPressRef.current) {
      isLongPressRef.current = false;
      return;
    }
    if (pptActiveTool === 'pen' && activePenSlotIndex === idx) {
      setPptPenPopupSlotIndex((prev) => (prev === idx ? null : idx));
    } else {
      handleSelectPenSlot(idx);
    }
  };

  const handleSelectPenSlot = (idx: number) => {
    setPptActiveTool('pen');
    setActivePenSlotIndex(idx);
  };

  const handleSlotChangePenType = (slotIdx: number, newType: PenType) => {
    setPptPenSlots((prev) =>
      prev.map((slot, i) => {
        if (i !== slotIdx) return slot;
        let newWidth = slot.strokeWidth;
        if (newType === 'highlighter' && newWidth < 10) newWidth = 20;
        else if (newType === 'brush' && (newWidth < 3 || newWidth > 14)) newWidth = 6.0;
        else if (newType === 'fountain' && (newWidth < 1.5 || newWidth > 8)) newWidth = 2.8;
        else if (newType === 'ballpoint' && newWidth > 5) newWidth = 2.2;
        else if (newType === 'pencil' && newWidth > 4) newWidth = 1.5;
        else if (newType === 'laser' && (newWidth < 2 || newWidth > 8)) newWidth = 5.0;

        return {
          ...slot,
          penType: newType,
          strokeWidth: newWidth,
        };
      })
    );
  };

  const handleSlotChangeColor = (slotIdx: number, newColor: string) => {
    setPptPenSlots((prev) =>
      prev.map((slot, i) => (i === slotIdx ? { ...slot, color: newColor } : slot))
    );
    setPptActiveTool('pen');
  };

  const handleSlotChangeStrokeWidth = (slotIdx: number, newWidth: number) => {
    setPptPenSlots((prev) =>
      prev.map((slot, i) => (i === slotIdx ? { ...slot, strokeWidth: newWidth } : slot))
    );
  };

  // Các giá trị hiện tại của ngòi bút đang kích hoạt
  const currentActiveSlot = pptPenSlots[activePenSlotIndex] || pptPenSlots[0];
  const pptPenType = currentActiveSlot.penType;
  const currentPptColor = currentActiveSlot.color;
  const currentPptStrokeWidth = currentActiveSlot.strokeWidth;

  // Tương thích ngược với các hàm gọi PptSlideViewer props
  const handlePptChangeColor = (newColor: string) => {
    handleSlotChangeColor(activePenSlotIndex, newColor);
  };

  const handlePptChangeStrokeWidth = (newWidth: number) => {
    handleSlotChangeStrokeWidth(activePenSlotIndex, newWidth);
  };

  const setPptPenType = (newType: PenType) => {
    handleSlotChangePenType(activePenSlotIndex, newType);
  };

  const getPenTypeMeta = (type: PenType) => {
    switch (type) {
      case 'fountain':
        return { label: 'Bút máy', icon: PenTool };
      case 'brush':
        return { label: 'Bút lông', icon: Paintbrush };
      case 'highlighter':
        return { label: 'Highlight', icon: Highlighter };
      case 'pencil':
        return { label: 'Bút chì', icon: Pencil };
      case 'laser':
        return { label: 'Laser', icon: Sparkles };
      case 'ballpoint':
      default:
        return { label: 'Bút bi', icon: Pen };
    }
  };

  // Bảng màu mẫu tương thích theo từng loại bút (Bút bi, Bút máy, Bút lông, Highlight, Bút chì, Laser)
  const getPptPenSampleColors = (penType: PenType) => {
    if (penType === 'highlighter') {
      return [
        { label: 'Vàng dạ quang', color: '#facc15' },
        { label: 'Xanh lá neon', color: '#4ade80' },
        { label: 'Xanh lơ neon', color: '#38bdf8' },
        { label: 'Hồng neon', color: '#f472b6' },
        { label: 'Cam neon', color: '#fb923c' },
        { label: 'Tím neon', color: '#c084fc' },
      ];
    }
    if (penType === 'fountain') {
      return [
        { label: 'Xanh mực', color: '#1d4ed8' },
        { label: 'Tím hoa cà', color: '#7e22ce' },
        { label: 'Xanh đen', color: '#0f172a' },
        { label: 'Đỏ mực', color: '#dc2626' },
        { label: 'Xanh ngọc', color: '#059669' },
        { label: 'Nâu sẫm', color: '#78350f' },
      ];
    }
    if (penType === 'brush') {
      return [
        { label: 'Tím', color: '#7c3aed' },
        { label: 'Xanh lá', color: '#16a34a' },
        { label: 'Cam', color: '#ea580c' },
        { label: 'Xanh dương', color: '#1d4ed8' },
        { label: 'Đen', color: '#0f172a' },
        { label: 'Đỏ', color: '#dc2626' },
      ];
    }
    if (penType === 'pencil') {
      return [
        { label: 'Chì đậm', color: '#475569' },
        { label: 'Chì xám', color: '#64748b' },
        { label: 'Đen', color: '#1e293b' },
        { label: 'Xanh chì', color: '#3b82f6' },
        { label: 'Đỏ chì', color: '#ef4444' },
        { label: 'Nâu gỗ', color: '#78350f' },
      ];
    }
    if (penType === 'laser') {
      return [
        { label: 'Đỏ rực', color: '#ef4444' },
        { label: 'Cam neon', color: '#f97316' },
        { label: 'Vàng neon', color: '#eab308' },
        { label: 'Xanh neon', color: '#22c55e' },
        { label: 'Hồng neon', color: '#ec4899' },
        { label: 'Xanh lơ neon', color: '#06b6d4' },
      ];
    }
    // Mặc định: Bút bi
    return [
      { label: 'Xanh dương', color: '#1d4ed8' },
      { label: 'Đen', color: '#0f172a' },
      { label: 'Đỏ', color: '#dc2626' },
      { label: 'Xanh lá', color: '#15803d' },
      { label: 'Tím', color: '#7e22ce' },
      { label: 'Cam', color: '#ea580c' },
    ];
  };

  // Các nấc nét vẽ nhanh tích hợp cho từng loại bút
  const getPptPenStrokePresets = (penType: PenType) => {
    if (penType === 'highlighter') {
      return [
        { label: 'Mảnh', size: 14, dot: 'w-1.5 h-1.5' },
        { label: 'Vừa', size: 20, dot: 'w-2.5 h-2.5' },
        { label: 'Đậm', size: 28, dot: 'w-3.5 h-3.5' },
      ];
    }
    if (penType === 'fountain') {
      return [
        { label: 'Mảnh', size: 1.8, dot: 'w-1 h-1' },
        { label: 'Vừa', size: 2.8, dot: 'w-2 h-2' },
        { label: 'Đậm', size: 4.5, dot: 'w-2.5 h-2.5' },
      ];
    }
    if (penType === 'brush') {
      return [
        { label: 'Mảnh', size: 4, dot: 'w-1 h-1' },
        { label: 'Vừa', size: 6.5, dot: 'w-2 h-2' },
        { label: 'Đậm', size: 10, dot: 'w-3 h-3' },
      ];
    }
    if (penType === 'pencil') {
      return [
        { label: 'Mảnh', size: 1.0, dot: 'w-1 h-1' },
        { label: 'Vừa', size: 1.5, dot: 'w-1.5 h-1.5' },
        { label: 'Đậm', size: 2.5, dot: 'w-2 h-2' },
      ];
    }
    if (penType === 'laser') {
      return [
        { label: 'Mảnh', size: 3.5, dot: 'w-1 h-1' },
        { label: 'Vừa', size: 5.5, dot: 'w-2 h-2' },
        { label: 'Đậm', size: 8, dot: 'w-3 h-3' },
      ];
    }
    // Mặc định: Bút bi
    return [
      { label: 'Mảnh', size: 1.5, dot: 'w-1 h-1' },
      { label: 'Vừa', size: 2.2, dot: 'w-1.5 h-1.5' },
      { label: 'Đậm', size: 3.5, dot: 'w-2.5 h-2.5' },
    ];
  };

  const handleAddPptWhiteboardAtStep = (
    stepIdx: number,
    initialHeight: number = 280,
    afterBlockIdx?: number
  ) => {
    const newBoardId = `space-${activePptSlideIndex}-s${stepIdx}-b${afterBlockIdx !== undefined ? afterBlockIdx : 'end'}-${Date.now()}`;
    const newBoard: PptWhiteboardData = {
      id: newBoardId,
      slideIndex: activePptSlideIndex,
      afterStepIndex: stepIdx,
      afterBlockIndex: afterBlockIdx,
      theme: 'white',
      height: initialHeight,
      textNote: '',
      showTextEditor: false,
      strokes: [],
      htmlItems: [],
    };
    setPptWhiteboards((prev) => [...prev, newBoard]);
    setActivePptWhiteboardId(newBoardId);
  };

  const handleUpdatePptWhiteboard = (updated: PptWhiteboardData) => {
    setPptWhiteboards((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
  };

  const handleDeletePptWhiteboard = (id: string) => {
    setPptWhiteboards((prev) => prev.filter((b) => b.id !== id));
    if (activePptWhiteboardId === id) {
      setActivePptWhiteboardId(null);
    }
  };

  // Modal Chèn Bảng tùy chỉnh số dòng, số cột, có tiêu đề
  const [showTableModal, setShowTableModal] = useState<boolean>(false);
  const [tableRows, setTableRows] = useState<number>(3);
  const [tableCols, setTableCols] = useState<number>(3);
  const [tableHasHeader, setTableHasHeader] = useState<boolean>(true);

  // Bộ nhớ tạm lưu vị trí con trỏ (Range) trong trang soạn thảo Word
  const savedSelectionRangeRef = useRef<Range | null>(null);
  const isInsertingHtmlRef = useRef<boolean>(false);

  const saveCurrentSelection = () => {
    if (isInsertingHtmlRef.current) return;
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current) {
      try {
        const range = sel.getRangeAt(0);
        if (
          editorRef.current.contains(range.commonAncestorContainer) ||
          editorRef.current === range.commonAncestorContainer
        ) {
          savedSelectionRangeRef.current = range.cloneRange();
        }
      } catch {}
    }
  };

  const insertHtmlToEditor = (html: string) => {
    isInsertingHtmlRef.current = true;

    // 1. Luôn đồng bộ phát sự kiện cho QuestionEditorWord (nếu đang ở chế độ Tách câu hoặc PPT)
    window.dispatchEvent(new CustomEvent('app-insert-word-snippet', {
      detail: {
        code: html,
        type: 'html',
        title: 'Nội dung chèn từ Menu Word'
      }
    }));

    // KHI ĐANG Ở CHẾ ĐỘ XEM PPT: Chèn Bảng, Hình ảnh, Công thức, Đồ thị, Bảng biến thiên trực tiếp lên khoảng trống bài giảng
    if (wordViewMode === 'ppt') {
      let targetBoard = pptWhiteboards.find(
        (b) => b.id === activePptWhiteboardId && b.slideIndex === activePptSlideIndex
      );
      if (!targetBoard) {
        const slideBoards = pptWhiteboards.filter((b) => b.slideIndex === activePptSlideIndex);
        if (slideBoards.length > 0) {
          targetBoard = slideBoards[slideBoards.length - 1];
        }
      }

      // Tự động phân loại nội dung chèn
      let itemType: 'table' | 'image' | 'math' | 'graph' | 'bbt' | 'html' = 'html';
      let itemTitle = 'Khối nội dung';
      if (html.includes('word-bbt-wrapper') || html.includes('bbt-table') || html.includes('tikz-tab')) {
        itemType = 'bbt';
        itemTitle = 'Bảng biến thiên';
      } else if (html.includes('word-graph-wrapper') || html.includes('<svg') || html.includes('tikz')) {
        itemType = 'graph';
        itemTitle = 'Đồ thị';
      } else if (html.includes('<table')) {
        itemType = 'table';
        itemTitle = 'Bảng số liệu';
      } else if (html.includes('<img')) {
        itemType = 'image';
        itemTitle = 'Hình ảnh';
      } else if (html.includes('katex') || html.includes('math')) {
        itemType = 'math';
        itemTitle = 'Công thức toán';
      }

      const existingItems = targetBoard?.htmlItems || [];
      let nextY = 20;
      if (existingItems.length > 0) {
        // Tìm vị trí đáy thấp nhất của các đối tượng đã chèn trước đó để chèn đối tượng tiếp theo ở ngay bên dưới
        let maxBottom = 0;
        for (const it of existingItems) {
          const itemH =
            it.type === 'graph' ? 300 :
            it.type === 'bbt' ? 200 :
            it.type === 'table' ? 200 :
            it.type === 'image' ? 280 :
            it.type === 'math' ? 90 : 240;
          const bottom = (it.y ?? 20) + itemH;
          if (bottom > maxBottom) {
            maxBottom = bottom;
          }
        }
        nextY = maxBottom + 24;
      }

      const newItem: BoardHtmlItem = {
        id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        type: itemType,
        title: itemTitle,
        html: html,
        x: 24,
        y: nextY,
        width: itemType === 'image' || itemType === 'graph' ? 420 : itemType === 'bbt' ? 480 : itemType === 'table' ? 440 : 360,
        scale: 1,
        rotate: 0,
        flipH: false,
        flipV: false,
        createdAt: Date.now(),
      };

      if (targetBoard) {
        const targetId = targetBoard.id;
        setPptWhiteboards((prev) =>
          prev.map((b) => {
            if (b.id === targetId) {
              const existing = b.htmlItems || [];
              return {
                ...b,
                htmlItems: [...existing, newItem],
              };
            }
            return b;
          })
        );
        setActivePptWhiteboardId(targetId);
        setNotification({
          text: `Đã chèn ${itemTitle.toLowerCase()} vào khoảng trống trên slide PPT!`,
          type: 'success',
        });
      } else {
        // Chưa có khoảng trống trên slide hiện tại: Tự động tạo khoảng trống mới tại bước hiện tại và chèn nội dung vào
        const newBoardId = `space-${activePptSlideIndex}-${activePptStepIndex}-${Date.now()}`;
        const newBoard: PptWhiteboardData = {
          id: newBoardId,
          slideIndex: activePptSlideIndex,
          afterStepIndex: activePptStepIndex,
          theme: 'white',
          height: 380,
          textNote: '',
          showTextEditor: false,
          strokes: [],
          htmlItems: [newItem],
        };
        setPptWhiteboards((prev) => [...prev, newBoard]);
        setActivePptWhiteboardId(newBoardId);
        setNotification({
          text: `Đã tạo khoảng trống và chèn ${itemTitle.toLowerCase()} lên slide PPT!`,
          type: 'success',
        });
      }

      setTimeout(() => setNotification(null), 3000);
      isInsertingHtmlRef.current = false;
      return;
    }

    if (!editorRef.current) {
      isInsertingHtmlRef.current = false;
      return;
    }

    try {
      const sel = window.getSelection();
      let targetRange: Range | null = null;

      // 2. Ưu tiên khôi phục vị trí con trỏ đã lưu trước đó nếu hợp lệ trong editor
      if (savedSelectionRangeRef.current) {
        try {
          if (
            editorRef.current.contains(savedSelectionRangeRef.current.commonAncestorContainer) ||
            editorRef.current === savedSelectionRangeRef.current.commonAncestorContainer
          ) {
            targetRange = savedSelectionRangeRef.current.cloneRange();
          }
        } catch {
          targetRange = null;
        }
      }

      // Nếu chưa có savedRange nhưng selection hiện tại đang nằm trong editor
      if (!targetRange && sel && sel.rangeCount > 0) {
        try {
          const curRange = sel.getRangeAt(0);
          if (
            editorRef.current.contains(curRange.commonAncestorContainer) ||
            editorRef.current === curRange.commonAncestorContainer
          ) {
            targetRange = curRange.cloneRange();
          }
        } catch {}
      }

      // Tạo fragment từ HTML cần chèn
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      const frag = document.createDocumentFragment();
      let lastNode: Node | null = null;
      while (tempDiv.firstChild) {
        lastNode = tempDiv.firstChild;
        frag.appendChild(tempDiv.firstChild);
      }

      // Đệm 1 ký tự khoảng trắng hoặc dòng mới sau nội dung chèn để tiếp tục gõ mượt mà
      const spacer = document.createTextNode('\u00A0');
      frag.appendChild(spacer);

      if (targetRange) {
        // Chèn CHÍNH XÁC ngay tại vị trí con trỏ đang đứng
        targetRange.deleteContents();
        targetRange.insertNode(frag);

        const newRange = document.createRange();
        newRange.setStartAfter(spacer);
        newRange.collapse(true);

        sel?.removeAllRanges();
        sel?.addRange(newRange);
        savedSelectionRangeRef.current = newRange.cloneRange();
      } else {
        // Nếu chưa từng đặt con trỏ: chèn vào CUỐI văn bản (không chèn vào đầu)
        editorRef.current.appendChild(frag);
        const newRange = document.createRange();
        newRange.setStartAfter(spacer);
        newRange.collapse(true);
        sel?.removeAllRanges();
        sel?.addRange(newRange);
        savedSelectionRangeRef.current = newRange.cloneRange();
      }

      editorRef.current.focus();
    } catch (err) {
      console.error('Lỗi khi chèn nội dung vào trang soạn thảo:', err);
    } finally {
      setTimeout(() => {
        isInsertingHtmlRef.current = false;
      }, 150);
    }
  };

  const handleOpenTableModal = () => {
    saveCurrentSelection();
    setOpenInsertMenu(false);
    setShowTableModal(true);
  };

  const handleConfirmInsertTable = () => {
    const r = Math.max(1, Math.min(tableRows || 3, 50));
    const c = Math.max(1, Math.min(tableCols || 3, 20));

    let tableHtml = `<table style="width: 100%; border-collapse: collapse; border: 2px solid #64748b; margin: 16px 0; font-size: 14px; background: #ffffff;">`;
    
    if (tableHasHeader) {
      tableHtml += `<thead style="background-color: #e2e8f0;"><tr style="background-color: #e2e8f0;">`;
      for (let j = 0; j < c; j++) {
        tableHtml += `<th style="border: 1px solid #64748b; padding: 10px 14px; font-weight: bold; text-align: center; color: #0f172a; min-width: 80px;">Tiêu đề ${j + 1}</th>`;
      }
      tableHtml += `</tr></thead>`;
    }

    tableHtml += `<tbody>`;
    for (let i = 0; i < r; i++) {
      const bg = i % 2 === 1 ? 'background-color: #f8fafc;' : 'background-color: #ffffff;';
      tableHtml += `<tr style="${bg}">`;
      for (let j = 0; j < c; j++) {
        tableHtml += `<td style="border: 1px solid #cbd5e1; padding: 10px 14px; min-width: 80px; color: #334155; vertical-align: top;">&nbsp;</td>`;
      }
      tableHtml += `</tr>`;
    }
    tableHtml += `</tbody></table><p><br></p>`;

    insertHtmlToEditor(tableHtml);
    setShowTableModal(false);
    setNotification({ text: `Đã chèn bảng (${r} dòng x ${c} cột${tableHasHeader ? ', có tiêu đề' : ''}) thành công!`, type: 'success' });
    setTimeout(() => setNotification(null), 3000);
  };

  const isTeacherOrHigher = (role?: UserRole): boolean => {
    const r = role || currentRole;
    return r === 'teacher' || r === 'manager' || r === 'admin' || r === 'superadmin' || r === 'assistant';
  };

  // Quyền biên soạn tài liệu: Quyền chỉnh sửa, thêm, đổi tên hoặc xóa chỉ cấp cho Giáo viên (Học sinh tuyệt đối không có quyền này)
  const hasAuthoringPermission = isTeacherOrHigher(currentRole);
  const isChuyenDeSelected = Boolean(chuyenDe && chuyenDe.trim());

  // Thoát con trỏ ra một dòng mới bên ngoài khối bài giảng
  const handleBreakoutOfBlock = () => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    const selection = window.getSelection();
    let insideBox: HTMLElement | null = null;
    if (selection && selection.rangeCount > 0) {
      let node: Node | null = selection.anchorNode;
      while (node && node !== editorRef.current) {
        if (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).classList.contains('lesson-template-box')) {
          insideBox = node as HTMLElement;
          break;
        }
        node = node.parentNode;
      }
    }

    const newPara = document.createElement('p');
    newPara.className = 'lesson-break-line';
    newPara.innerHTML = '<br>';

    if (insideBox && insideBox.parentNode) {
      if (insideBox.nextSibling) {
        insideBox.parentNode.insertBefore(newPara, insideBox.nextSibling);
      } else {
        insideBox.parentNode.appendChild(newPara);
      }
    } else {
      editorRef.current.appendChild(newPara);
    }

    try {
      const range = document.createRange();
      range.setStart(newPara, 0);
      range.collapse(true);
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }
    } catch {}

    setNotification({
      text: 'Đã nhảy ra một dòng mới toanh bên ngoài khối! (Bạn có thể gõ hoặc chèn tiếp)',
      type: 'info',
    });
    setTimeout(() => setNotification(null), 2500);
  };

  // Giải pháp 3 + Kích đôi chuột vào 1 vị trí trên cửa sổ soạn thảo bên dưới khối sẽ chèn thêm 1 hàng ngoài khối hiện tại
  const handleDoubleClickToInsertRow = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!editorRef.current) return;
    editorRef.current.focus();

    const clickY = e.clientY;
    const target = e.target as HTMLElement;
    let box: HTMLElement | null = null;
    let curr: HTMLElement | null = target;
    while (curr && curr !== editorRef.current) {
      if (curr.classList && curr.classList.contains('lesson-template-box')) {
        box = curr;
        break;
      }
      curr = curr.parentElement;
    }

    // Nếu kích đôi ở vị trí bên ngoài hoặc bên dưới khối trong cửa sổ soạn thảo:
    if (!box) {
      const allBoxes = Array.from(editorRef.current.querySelectorAll('.lesson-template-box')) as HTMLElement[];
      for (let i = allBoxes.length - 1; i >= 0; i--) {
        const rect = allBoxes[i].getBoundingClientRect();
        if (rect.bottom <= clickY + 30) {
          box = allBoxes[i];
          break;
        }
      }
      if (!box && allBoxes.length > 0) {
        box = allBoxes[allBoxes.length - 1];
      }
    }

    const newPara = document.createElement('p');
    newPara.className = 'lesson-break-line';
    newPara.innerHTML = '<br>';

    if (box && box.parentNode) {
      // Kích đôi vào khối hoặc bên dưới khối -> chèn ngay 1 hàng mới toanh bên ngoài dưới khối đó
      if (box.nextSibling) {
        box.parentNode.insertBefore(newPara, box.nextSibling);
      } else {
        box.parentNode.appendChild(newPara);
      }
    } else {
      // Kích đôi vào vùng soạn thảo bên ngoài/bên dưới các khối
      editorRef.current.appendChild(newPara);
    }

    try {
      const selection = window.getSelection();
      const range = document.createRange();
      range.setStart(newPara, 0);
      range.collapse(true);
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }
    } catch {}

    setNotification({
      text: '✨ Kích đôi chuột: Đã chèn thêm 1 hàng mới bên ngoài khối và sẵn sàng gõ!',
      type: 'info',
    });
    setTimeout(() => setNotification(null), 2500);
  };

  // Xử lý kéo co giãn đồ thị (thu nhỏ / phóng to bằng cách kéo rê) và kéo thả vị trí các số/chữ trong đồ thị
  const handleEditorMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    try {
      // Chỉ tài khoản Giáo viên trở lên mới được phép kéo co giãn hoặc chỉnh sửa đồ thị
      if (!isTeacherOrHigher(currentRole)) return;

      const el = (e.target instanceof Element ? e.target : (e.target as Node)?.parentElement) as HTMLElement | null;
      if (!el || typeof el.closest !== 'function') return;

      // 1. KÉO CO GIÃN ĐỒ THỊ: Thu nhỏ / Phóng to bằng cách bấm giữ và kéo rê các nút góc hoặc cạnh
      const resizeHandle = el.closest('.graph-resize-handle, .graph-resize-handle-left, .graph-resize-handle-e, .graph-resize-handle-se, .graph-resize-handle-sw') as HTMLElement | null;
      if (resizeHandle) {
        const wrapper = resizeHandle.closest('.word-graph-wrapper') as HTMLElement | null;
        if (wrapper) {
          e.preventDefault();
          e.stopPropagation();

          const isLeft = resizeHandle.classList.contains('graph-resize-handle-left') || resizeHandle.classList.contains('graph-resize-handle-sw');
          const startX = e.clientX;
          const rect = wrapper.getBoundingClientRect();
          const startWidth = parseFloat(wrapper.getAttribute('data-width') || '') || rect.width || 380;

          // Tạm thời tắt kéo khối draggable trong lúc co giãn kích thước
          wrapper.setAttribute('draggable', 'false');
          document.body.style.userSelect = 'none';
          document.body.style.cursor = isLeft ? 'sw-resize' : (resizeHandle.classList.contains('graph-resize-handle-e') ? 'ew-resize' : 'se-resize');

          // Tạo badge hiển thị kích thước trực quan khi kéo rê
          let badge = document.getElementById('word-graph-resize-badge');
          if (!badge) {
            badge = document.createElement('div');
            badge.id = 'word-graph-resize-badge';
            badge.className = 'fixed z-[9999] bg-slate-900/90 text-white text-xs font-mono font-bold px-2.5 py-1 rounded shadow-xl pointer-events-none transform -translate-x-1/2 -translate-y-full border border-slate-700 backdrop-blur-xs flex items-center gap-1.5';
            document.body.appendChild(badge);
          }
          badge.style.display = 'flex';
          badge.style.left = `${e.clientX}px`;
          badge.style.top = `${e.clientY - 12}px`;
          badge.innerHTML = `<span>↔</span> <span>${Math.round(startWidth)}px</span> <span class="text-indigo-300">(${Math.round((startWidth / 380) * 100)}%)</span>`;

          const onPointerMove = (moveEv: MouseEvent) => {
            try {
              const dx = isLeft ? (startX - moveEv.clientX) : (moveEv.clientX - startX);
              const newWidth = Math.max(160, Math.min(850, Math.round(startWidth + dx)));
              wrapper.style.maxWidth = `${newWidth}px`;
              wrapper.setAttribute('data-width', newWidth.toString());

              if (badge) {
                badge.style.left = `${moveEv.clientX}px`;
                badge.style.top = `${moveEv.clientY - 12}px`;
                badge.innerHTML = `<span>↔</span> <span>${newWidth}px</span> <span class="text-indigo-300">(${Math.round((newWidth / 380) * 100)}%)</span>`;
              }
            } catch {}
          };

          const onPointerUp = () => {
            window.removeEventListener('mousemove', onPointerMove);
            window.removeEventListener('mouseup', onPointerUp);
            if (badge) {
              badge.remove();
            }
            document.body.style.userSelect = '';
            document.body.style.cursor = '';
            wrapper.setAttribute('draggable', 'true');
            saveCurrentSelection();
          };

          window.addEventListener('mousemove', onPointerMove);
          window.addEventListener('mouseup', onPointerUp);
          return;
        }
      }

      // 2. Kéo thả vị trí các số và chữ trong đồ thị
      const draggableText = el.closest('.graph-draggable-text') as SVGTextElement | null;
      if (draggableText) {
        const svg = draggableText.ownerSVGElement;
        if (svg && typeof svg.createSVGPoint === 'function') {
          e.preventDefault();
          e.stopPropagation();
          const pt = svg.createSVGPoint();
          pt.x = e.clientX;
          pt.y = e.clientY;
          const ctm = svg.getScreenCTM();
          if (!ctm) return;
          const svgP = pt.matrixTransform(ctm.inverse());
          const initialTextX = parseFloat(draggableText.getAttribute('x') || '0');
          const initialTextY = parseFloat(draggableText.getAttribute('y') || '0');
          const offsetSvgX = svgP.x - initialTextX;
          const offsetSvgY = svgP.y - initialTextY;
          draggableText.style.cursor = 'grabbing';

          const onPointerMove = (moveEv: MouseEvent) => {
            try {
              const mPt = svg.createSVGPoint();
              mPt.x = moveEv.clientX;
              mPt.y = moveEv.clientY;
              const curCtm = svg.getScreenCTM();
              if (!curCtm) return;
              const mSvgP = mPt.matrixTransform(curCtm.inverse());
              const newX = (mSvgP.x - offsetSvgX).toFixed(1);
              const newY = (mSvgP.y - offsetSvgY).toFixed(1);
              draggableText.setAttribute('x', newX);
              draggableText.setAttribute('y', newY);
            } catch {}
          };

          const onPointerUp = () => {
            window.removeEventListener('mousemove', onPointerMove);
            window.removeEventListener('mouseup', onPointerUp);
            draggableText.style.cursor = 'grab';
            saveCurrentSelection();
          };

          window.addEventListener('mousemove', onPointerMove);
          window.addEventListener('mouseup', onPointerUp);
        }
      }

      // 3. Kéo thả vị trí các điểm mốc tọa độ trong đồ thị
      const draggablePoint = el.closest('.graph-point, .graph-extrema-circle') as SVGCircleElement | null;
      if (draggablePoint) {
        const svg = draggablePoint.ownerSVGElement;
        if (svg && typeof svg.createSVGPoint === 'function') {
          e.preventDefault();
          e.stopPropagation();
          const pt = svg.createSVGPoint();
          pt.x = e.clientX;
          pt.y = e.clientY;
          const ctm = svg.getScreenCTM();
          if (!ctm) return;
          const svgP = pt.matrixTransform(ctm.inverse());
          const initialCx = parseFloat(draggablePoint.getAttribute('cx') || '0');
          const initialCy = parseFloat(draggablePoint.getAttribute('cy') || '0');
          const offsetSvgX = svgP.x - initialCx;
          const offsetSvgY = svgP.y - initialCy;
          draggablePoint.style.cursor = 'grabbing';

          const onPointerMove = (moveEv: MouseEvent) => {
            try {
              const mPt = svg.createSVGPoint();
              mPt.x = moveEv.clientX;
              mPt.y = moveEv.clientY;
              const curCtm = svg.getScreenCTM();
              if (!curCtm) return;
              const mSvgP = mPt.matrixTransform(curCtm.inverse());
              const newCx = (mSvgP.x - offsetSvgX).toFixed(1);
              const newCy = (mSvgP.y - offsetSvgY).toFixed(1);
              draggablePoint.setAttribute('cx', newCx);
              draggablePoint.setAttribute('cy', newCy);
            } catch {}
          };

          const onPointerUp = () => {
            window.removeEventListener('mousemove', onPointerMove);
            window.removeEventListener('mouseup', onPointerUp);
            draggablePoint.style.cursor = 'pointer';
            saveCurrentSelection();
          };

          window.addEventListener('mousemove', onPointerMove);
          window.addEventListener('mouseup', onPointerUp);
        }
      }
    } catch {}
  };

  // Hỗ trợ kéo co giãn đồ thị trên màn hình cảm ứng
  const handleEditorTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    try {
      // Chỉ tài khoản Giáo viên trở lên mới được phép kéo co giãn đồ thị
      if (!isTeacherOrHigher(currentRole)) return;

      const el = (e.target instanceof Element ? e.target : (e.target as Node)?.parentElement) as HTMLElement | null;
      if (!el || typeof el.closest !== 'function') return;

      const resizeHandle = el.closest('.graph-resize-handle, .graph-resize-handle-left, .graph-resize-handle-e, .graph-resize-handle-se, .graph-resize-handle-sw') as HTMLElement | null;
      if (resizeHandle && e.touches.length === 1) {
        const wrapper = resizeHandle.closest('.word-graph-wrapper') as HTMLElement | null;
        if (wrapper) {
          const touch = e.touches[0];
          const isLeft = resizeHandle.classList.contains('graph-resize-handle-left') || resizeHandle.classList.contains('graph-resize-handle-sw');
          const startX = touch.clientX;
          const rect = wrapper.getBoundingClientRect();
          const startWidth = parseFloat(wrapper.getAttribute('data-width') || '') || rect.width || 380;

          const onTouchMove = (moveEv: TouchEvent) => {
            try {
              if (moveEv.touches.length === 1) {
                const curTouch = moveEv.touches[0];
                const dx = isLeft ? (startX - curTouch.clientX) : (curTouch.clientX - startX);
                const newWidth = Math.max(160, Math.min(850, Math.round(startWidth + dx)));
                wrapper.style.maxWidth = `${newWidth}px`;
                wrapper.setAttribute('data-width', newWidth.toString());
              }
            } catch {}
          };

          const onTouchEnd = () => {
            window.removeEventListener('touchmove', onTouchMove);
            window.removeEventListener('touchend', onTouchEnd);
            saveCurrentSelection();
          };

          window.addEventListener('touchmove', onTouchMove, { passive: true });
          window.addEventListener('touchend', onTouchEnd);
        }
      }
    } catch {}
  };

  // Kéo di chuyển toàn bộ đồ thị đến vị trí mong muốn trong tài liệu Word
  const handleEditorDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    try {
      // Học sinh không được phép kéo di chuyển đồ thị
      if (!isTeacherOrHigher(currentRole)) {
        e.preventDefault();
        return;
      }

      const el = (e.target instanceof Element ? e.target : (e.target as Node)?.parentElement) as HTMLElement | null;
      if (!el || typeof el.closest !== 'function') return;

      // Không kích hoạt kéo cả khối nếu đang bấm vào nút resize, nút công cụ, chữ đang kéo
      if (el.closest('.graph-resize-handle, .graph-resize-handle-left, .graph-resize-handle-e, .graph-resize-handle-se, .graph-resize-handle-sw, button, input, .graph-draggable-text')) {
        e.preventDefault();
        return;
      }

      const wrapper = el.closest('.word-graph-wrapper') as HTMLElement | null;
      if (wrapper) {
        draggedGraphWrapperRef.current = wrapper;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('application/x-word-graph-id', wrapper.getAttribute('data-graph-id') || 'graph');
      }
    } catch {}
  };

  const handleEditorDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    try {
      if (draggedGraphWrapperRef.current) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      }
    } catch {}
  };

  const handleEditorDrop = (e: React.DragEvent<HTMLDivElement>) => {
    try {
      if (draggedGraphWrapperRef.current && editorRef.current) {
        e.preventDefault();
        const wrapper = draggedGraphWrapperRef.current;
        draggedGraphWrapperRef.current = null;

        let range: Range | null = null;
        if (document.caretRangeFromPoint) {
          range = document.caretRangeFromPoint(e.clientX, e.clientY);
        } else if ((document as any).caretPositionFromPoint) {
          const pos = (document as any).caretPositionFromPoint(e.clientX, e.clientY);
          if (pos) {
            range = document.createRange();
            range.setStart(pos.offsetNode, pos.offset);
            range.collapse(true);
          }
        }

        if (range && editorRef.current.contains(range.startContainer)) {
          range.insertNode(wrapper);
          const spacer = document.createElement('p');
          spacer.innerHTML = '<br>';
          if (wrapper.nextSibling) {
            wrapper.parentNode?.insertBefore(spacer, wrapper.nextSibling);
          } else {
            wrapper.parentNode?.appendChild(spacer);
          }
          saveCurrentSelection();
        }
      }
    } catch {}
  };

// Trợ giúp bóc tách câu hỏi & 4 phương án trắc nghiệm khi bôi đen (Giải pháp 1)
const parseQuestionAndOptions = (rawText: string, rawHtml: string) => {
  const plainText = (rawText || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  const regex = /(?:^|\n)\s*([A-Da-d])[\.\:\)]\s*(.*?)(?=(?:\n\s*[A-Da-d][\.\:\)])|$)/gs;
  const matches = [...plainText.matchAll(regex)];

  if (matches.length >= 2) {
    const firstMatchIdx = plainText.search(/(?:^|\n)\s*[A-Da-d][\.\:\)]\s*/);
    const stem = firstMatchIdx > 0 ? plainText.slice(0, firstMatchIdx).trim() : 'Nội dung câu hỏi trắc nghiệm...';
    const opts: Record<string, string> = { A: 'Đáp án A', B: 'Đáp án B', C: 'Đáp án C', D: 'Đáp án D' };
    for (const m of matches) {
      const optKey = m[1].toUpperCase();
      const optVal = m[2].trim();
      if (optVal) opts[optKey] = optVal;
    }
    return {
      stem: stem.replace(/\n/g, '<br>'),
      opts,
    };
  }

  const inlineRegex = /\b([A-D])[\.\:\)]\s*(.*?)(?=\b[A-D][\.\:\)]|$)/g;
  const inlineMatches = [...plainText.matchAll(inlineRegex)];
  if (inlineMatches.length >= 3) {
    const firstOptIdx = plainText.search(/\b[A-D][\.\:\)]/);
    const stem = firstOptIdx > 0 ? plainText.slice(0, firstOptIdx).trim() : 'Nội dung câu hỏi trắc nghiệm...';
    const opts: Record<string, string> = { A: 'Đáp án A', B: 'Đáp án B', C: 'Đáp án C', D: 'Đáp án D' };
    for (const m of inlineMatches) {
      const optKey = m[1].toUpperCase();
      const optVal = m[2].trim();
      if (optVal) opts[optKey] = optVal;
    }
    return {
      stem: stem.replace(/\n/g, '<br>'),
      opts,
    };
  }

  return {
    stem: rawHtml || plainText.replace(/\n/g, '<br>') || 'Nội dung câu hỏi trắc nghiệm...',
    opts: { A: 'Đáp án A', B: 'Đáp án B', C: 'Đáp án C', D: 'Đáp án D' },
  };
};

// Trợ giúp bóc tách các ý Đúng / Sai khi bôi đen (Giải pháp 1)
const parseTrueFalseItems = (rawText: string, rawHtml: string) => {
  const plainText = (rawText || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  const regex = /(?:^|\n)\s*([a-dA-D1-4])[\.\:\)]\s*(.*?)(?=(?:\n\s*[a-dA-D1-4][\.\:\)])|$)/gs;
  const matches = [...plainText.matchAll(regex)];
  if (matches.length >= 2) {
    const firstMatchIdx = plainText.search(/(?:^|\n)\s*[a-dA-D1-4][\.\:\)]\s*/);
    const stem = firstMatchIdx > 0 ? plainText.slice(0, firstMatchIdx).trim() : 'Cho bài toán / mệnh đề ... Xét tính đúng sai của các khẳng định sau:';
    const items: string[] = [];
    for (const m of matches) {
      items.push(m[2].trim());
    }
    return {
      stem: stem.replace(/\n/g, '<br>'),
      items,
    };
  }
  return {
    stem: rawHtml || plainText.replace(/\n/g, '<br>') || 'Cho bài toán / mệnh đề ... Xét tính đúng sai của các khẳng định sau:',
    items: ['Khẳng định a', 'Khẳng định b', 'Khẳng định c', 'Khẳng định d'],
  };
};

  // GIẢI PHÁP 1: Tự động nhận diện ngữ cảnh (Context-Aware Wrapping)
  // - Nếu có bôi đen: đóng khung định dạng ngay phần văn bản đang bôi đen
  // - Nếu không bôi đen: chèn mới mẫu cấu trúc chuẩn vào bài
  const handleInsertLessonTemplate = (type: string) => {
    let tplContent = '';
    let blockTitle = '';
    let blockBg = '#f8fafc';
    let blockBorder = '#4f46e5';

    // 1. Kiểm tra vùng văn bản đang bôi đen
    const selection = window.getSelection();
    let selectedHtml = '';
    let selectedText = '';
    let hasSelection = false;
    let userRange: Range | null = null;

    if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
      const r = selection.getRangeAt(0);
      if (editorRef.current && editorRef.current.contains(r.commonAncestorContainer)) {
        const container = document.createElement('div');
        container.appendChild(r.cloneContents());
        selectedHtml = container.innerHTML.trim();
        selectedText = selection.toString().trim();
        if (selectedText.length > 0 || selectedHtml.length > 0) {
          hasSelection = true;
          userRange = r;
        }
      }
    }

    switch (type) {
      case 'khaiNiem':
        blockTitle = '📌 KHÁI NIỆM / ĐỊNH NGHĨA:';
        blockBg = '#f0fdf4';
        blockBorder = '#16a34a';
        tplContent = hasSelection
          ? `
            <strong style="color: #16a34a; font-size: 15px;">${blockTitle}</strong>
            <div style="margin-top: 6px; color: #1e293b; line-height: 1.6;">${selectedHtml || selectedText}</div>
          `
          : `
            <strong style="color: #16a34a; font-size: 15px;">${blockTitle}</strong>
            <p style="margin-top: 6px; color: #1e293b;">Nội dung định nghĩa / khái niệm toán học...</p>
          `;
        break;
      case 'dinhLy':
        blockTitle = '📐 ĐỊNH LÝ / TÍNH CHẤT:';
        blockBg = '#eff6ff';
        blockBorder = '#2563eb';
        tplContent = hasSelection
          ? `
            <strong style="color: #2563eb; font-size: 15px;">${blockTitle}</strong>
            <div style="margin-top: 6px; color: #1e293b; line-height: 1.6;">${selectedHtml || selectedText}</div>
          `
          : `
            <strong style="color: #2563eb; font-size: 15px;">${blockTitle}</strong>
            <p style="margin-top: 6px; color: #1e293b;">Cho ... Khi đó ...</p>
          `;
        break;
      case 'heQua':
        blockTitle = '⚠️ HỆ QUẢ / CHÚ Ý:';
        blockBg = '#fffbeb';
        blockBorder = '#d97706';
        tplContent = hasSelection
          ? `
            <strong style="color: #d97706; font-size: 15px;">${blockTitle}</strong>
            <div style="margin-top: 6px; color: #1e293b; line-height: 1.6;">${selectedHtml || selectedText}</div>
          `
          : `
            <strong style="color: #d97706; font-size: 15px;">${blockTitle}</strong>
            <p style="margin-top: 6px; color: #1e293b;">Lưu ý các trường hợp đặc biệt và hệ quả rút ra...</p>
          `;
        break;
      case 'phuongPhap':
        blockTitle = '💡 PHƯƠNG PHÁP GIẢI (DẠNG TOÁN):';
        blockBg = '#f5f3ff';
        blockBorder = '#7c3aed';
        tplContent = hasSelection
          ? `
            <strong style="color: #7c3aed; font-size: 15px;">${blockTitle}</strong>
            <div style="margin-top: 6px; color: #1e293b; line-height: 1.6;">${selectedHtml || selectedText}</div>
          `
          : `
            <strong style="color: #7c3aed; font-size: 15px;">${blockTitle}</strong>
            <ol style="margin-top: 6px; padding-left: 20px; color: #1e293b;">
              <li><strong>Bước 1:</strong> Xác định điều kiện và phân tích giả thiết...</li>
              <li><strong>Bước 2:</strong> Áp dụng công thức và định lý phù hợp...</li>
              <li><strong>Bước 3:</strong> Kết luận và đối chiếu nghiệm...</li>
            </ol>
          `;
        break;
      case 'viDu':
        blockTitle = '📝 VÍ DỤ MINH HỌA:';
        blockBg = '#f8fafc';
        blockBorder = '#cbd5e1';
        tplContent = hasSelection
          ? `
            <strong style="color: #0f172a; font-size: 15px;">${blockTitle}</strong>
            <div style="margin-top: 6px; font-weight: 500; color: #1e293b; line-height: 1.6;">${selectedHtml || selectedText}</div>
            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed #cbd5e1; color: #334155;">
              <strong>Lời giải:</strong>
              <p style="margin-top: 4px;">Ta có: ... Suy ra: ...</p>
            </div>
          `
          : `
            <strong style="color: #0f172a; font-size: 15px;">📝 VÍ DỤ MINH HỌA 1:</strong>
            <p style="margin-top: 6px; font-weight: 500;">Cho hàm số ... Hãy tìm ...</p>
            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed #cbd5e1; color: #334155;">
              <strong>Lời giải:</strong>
              <p style="margin-top: 4px;">Ta có: ... Suy ra: ...</p>
            </div>
          `;
        break;
      case 'tuLuan':
        blockTitle = '✍️ BÀI TẬP TỰ LUẬN:';
        blockBg = '#ffffff';
        blockBorder = '#cbd5e1';
        tplContent = hasSelection
          ? `
            <strong style="color: #0f172a; font-size: 15px;">${blockTitle}</strong>
            <div style="margin-top: 6px; color: #1e293b; line-height: 1.6;">${selectedHtml || selectedText}</div>
            <div style="margin-top: 8px; color: #64748b; font-size: 13px;">
              <em>(Học sinh trình bày các bước giải chi tiết)</em>
            </div>
          `
          : `
            <strong style="color: #0f172a; font-size: 15px;">✍️ BÀI TẬP TỰ LUẬN 1:</strong>
            <p style="margin-top: 6px;">Nội dung đề bài tự luận...</p>
            <div style="margin-top: 8px; color: #64748b; font-size: 13px;">
              <em>(Học sinh trình bày các bước giải chi tiết)</em>
            </div>
          `;
        break;
      case 'tracNghiem4':
        blockTitle = 'Câu [Trắc nghiệm 4 lựa chọn]';
        blockBg = '#ffffff';
        blockBorder = '#cbd5e1';
        if (hasSelection) {
          const parsed = parseQuestionAndOptions(selectedText, selectedHtml);
          tplContent = `
            <strong style="color: #0f172a; font-size: 15px;">${blockTitle}</strong>
            <div style="margin-top: 6px; font-weight: 500; color: #1e293b; line-height: 1.6;">${parsed.stem}</div>
            <div style="margin-top: 8px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; color: #1e293b;">
              <div><strong>A.</strong> ${parsed.opts.A}</div>
              <div><strong>B.</strong> ${parsed.opts.B}</div>
              <div><strong>C.</strong> ${parsed.opts.C}</div>
              <div><strong>D.</strong> ${parsed.opts.D}</div>
            </div>
            <div style="margin-top: 8px; padding-top: 6px; border-top: 1px dashed #cbd5e1; color: #15803d; font-size: 13px;">
              <strong>Đáp án:</strong> A &nbsp;|&nbsp; <strong>Lời giải:</strong> ...
            </div>
          `;
        } else {
          tplContent = `
            <strong style="color: #0f172a; font-size: 15px;">Câu 1: [Trắc nghiệm 4 lựa chọn]</strong>
            <p style="margin-top: 6px; font-weight: 500;">Nội dung câu hỏi trắc nghiệm...</p>
            <div style="margin-top: 8px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; color: #1e293b;">
              <div><strong>A.</strong> Đáp án A</div>
              <div><strong>B.</strong> Đáp án B</div>
              <div><strong>C.</strong> Đáp án C</div>
              <div><strong>D.</strong> Đáp án D</div>
            </div>
            <div style="margin-top: 8px; padding-top: 6px; border-top: 1px dashed #cbd5e1; color: #15803d; font-size: 13px;">
              <strong>Đáp án:</strong> A &nbsp;|&nbsp; <strong>Lời giải:</strong> ...
            </div>
          `;
        }
        break;
      case 'dungSai':
        blockTitle = 'Câu [Trắc nghiệm Đúng / Sai]';
        blockBg = '#ffffff';
        blockBorder = '#cbd5e1';
        if (hasSelection) {
          const parsed = parseTrueFalseItems(selectedText, selectedHtml);
          tplContent = `
            <strong style="color: #0f172a; font-size: 15px;">${blockTitle}</strong>
            <div style="margin-top: 6px; font-weight: 500; color: #1e293b; line-height: 1.6;">${parsed.stem}</div>
            <div style="margin-top: 8px; color: #1e293b; line-height: 1.8;">
              <div><strong>a)</strong> ${parsed.items[0] || 'Khẳng định a'} <em>(Đúng / Sai)</em></div>
              <div><strong>b)</strong> ${parsed.items[1] || 'Khẳng định b'} <em>(Đúng / Sai)</em></div>
              <div><strong>c)</strong> ${parsed.items[2] || 'Khẳng định c'} <em>(Đúng / Sai)</em></div>
              <div><strong>d)</strong> ${parsed.items[3] || 'Khẳng định d'} <em>(Đúng / Sai)</em></div>
            </div>
          `;
        } else {
          tplContent = `
            <strong style="color: #0f172a; font-size: 15px;">Câu 1: [Trắc nghiệm Đúng / Sai]</strong>
            <p style="margin-top: 6px; font-weight: 500;">Cho bài toán / mệnh đề ... Xét tính đúng sai của các khẳng định sau:</p>
            <div style="margin-top: 8px; color: #1e293b; line-height: 1.8;">
              <div><strong>a)</strong> Khẳng định a <em>(Đúng / Sai)</em></div>
              <div><strong>b)</strong> Khẳng định b <em>(Đúng / Sai)</em></div>
              <div><strong>c)</strong> Khẳng định c <em>(Đúng / Sai)</em></div>
              <div><strong>d)</strong> Khẳng định d <em>(Đúng / Sai)</em></div>
            </div>
          `;
        }
        break;
      case 'traLoiNgan':
        blockTitle = 'Câu [Trắc nghiệm Trả lời ngắn]';
        blockBg = '#ffffff';
        blockBorder = '#cbd5e1';
        tplContent = hasSelection
          ? `
            <strong style="color: #0f172a; font-size: 15px;">${blockTitle}</strong>
            <div style="margin-top: 6px; font-weight: 500; color: #1e293b; line-height: 1.6;">${selectedHtml || selectedText}</div>
            <div style="margin-top: 8px; color: #1e293b;">
              <strong>Đáp số:</strong> [ ... ]
            </div>
          `
          : `
            <strong style="color: #0f172a; font-size: 15px;">Câu 1: [Trắc nghiệm Trả lời ngắn]</strong>
            <p style="margin-top: 6px; font-weight: 500;">Nội dung câu hỏi yêu cầu tính toán và điền kết quả số...</p>
            <div style="margin-top: 8px; color: #1e293b;">
              <strong>Đáp số:</strong> [ ... ]
            </div>
          `;
        break;
    }

    if (!tplContent) return;

    if (!editorRef.current) return;
    editorRef.current.focus();

    const blockDiv = document.createElement('div');
    blockDiv.className = 'lesson-template-box';
    blockDiv.setAttribute('style', `background-color: ${blockBg}; border: 1.5px solid #cbd5e1; border-left: 5px solid ${blockBorder}; padding: 14px 16px; margin: 14px 0; border-radius: 8px; position: relative;`);
    blockDiv.innerHTML = tplContent;

    const breakPara = document.createElement('p');
    breakPara.className = 'lesson-break-line';
    breakPara.innerHTML = '<br>';

    let inserted = false;

    // GIẢI PHÁP 1: Nếu người dùng đã bôi đen đoạn văn bản, thay thế chính xác phạm vi bôi đen đó bằng khung khối chuẩn
    if (hasSelection && userRange) {
      userRange.deleteContents();
      userRange.insertNode(breakPara);
      userRange.insertNode(blockDiv);
      inserted = true;
    } else if (insertPositionMode === 'bottom') {
      // Khi không bôi đen và chọn "Xuống cuối bài": chèn khối độc lập ở cuối
      editorRef.current.appendChild(blockDiv);
      editorRef.current.appendChild(breakPara);
      inserted = true;
    } else if (selection && selection.rangeCount > 0) {
      let node: Node | null = selection.anchorNode;
      let insideBox: HTMLElement | null = null;
      while (node && node !== editorRef.current) {
        if (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).classList.contains('lesson-template-box')) {
          insideBox = node as HTMLElement;
          break;
        }
        node = node.parentNode;
      }

      if (insideBox && insideBox.parentNode) {
        // TỰ ĐỘNG THOÁT KHỐI: Nếu con trỏ đang nằm trong khối trước, chèn nối tiếp ở dưới khối, không lồng vào trong!
        if (insideBox.nextSibling) {
          insideBox.parentNode.insertBefore(blockDiv, insideBox.nextSibling);
          insideBox.parentNode.insertBefore(breakPara, blockDiv.nextSibling);
        } else {
          insideBox.parentNode.appendChild(blockDiv);
          insideBox.parentNode.appendChild(breakPara);
        }
        inserted = true;
      } else {
        const range = selection.getRangeAt(0);
        range.collapse(false);
        range.insertNode(breakPara);
        range.insertNode(blockDiv);
        inserted = true;
      }
    }

    if (!inserted) {
      editorRef.current.appendChild(blockDiv);
      editorRef.current.appendChild(breakPara);
    }

    // Đưa con trỏ soạn thảo ra dòng trống bên ngoài để sẵn sàng soạn thảo tiếp hoặc chèn mục tiếp theo
    try {
      const newRange = document.createRange();
      newRange.setStart(breakPara, 0);
      newRange.collapse(true);
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(newRange);
      }
    } catch {}

    setOpenSoanBaiMenu(false);
    setNotification({
      text: hasSelection
        ? `Đã định dạng phần bôi đen thành "${blockTitle}" thành công!`
        : (insertPositionMode === 'bottom'
            ? `Đã chèn "${blockTitle}" xuống cuối bài và sẵn sàng gõ!`
            : `Đã chèn "${blockTitle}" và tự động tạo dòng mới bên ngoài khối!`),
      type: 'success',
    });
    setTimeout(() => setNotification(null), 3000);
  };

  // Modal Nhập hàm Đồ thị trong Word
  const [showWordGraphModal, setShowWordGraphModal] = useState<boolean>(false);
  const [wordGraphFormula, setWordGraphFormula] = useState<string>('y = x^2 - 1');
  const [wordGraphXMin, setWordGraphXMin] = useState<string>('-2');
  const [wordGraphXMax, setWordGraphXMax] = useState<string>('2');
  const [wordGraphYMin, setWordGraphYMin] = useState<string>('-2');
  const [wordGraphYMax, setWordGraphYMax] = useState<string>('4');
  const [wordGraphUnitX, setWordGraphUnitX] = useState<string>('1');
  const [wordGraphUnitY, setWordGraphUnitY] = useState<string>('1');
  const [wordGraphShowAxisLabels, setWordGraphShowAxisLabels] = useState<boolean>(true);
  const [wordGraphShowOriginLabel, setWordGraphShowOriginLabel] = useState<boolean>(true);
  const [wordGraphShowExtremaLabels, setWordGraphShowExtremaLabels] = useState<boolean>(true);
  const [wordGraphRequirement, setWordGraphRequirement] = useState<string>('Gióng trục điểm cực trị');
  const [wordGraphOldTikz, setWordGraphOldTikz] = useState<string>('');
  // ID đồ thị đang được sửa (để cập nhật lại đúng khối đồ thị đó)
  const [editingGraphId, setEditingGraphId] = useState<string | null>(null);

  // Trạng thái phần tử đồ thị đang được chọn để tùy biến màu sắc, độ dày, kiểu nét (Đồ thị / Đường gióng / Trục / Chữ / Số / Điểm)
  const [selectedGraphElement, setSelectedGraphElement] = useState<{
    graphId: string;
    elementType: 'curve' | 'guideline' | 'axis' | 'text' | 'point';
    elementName: string;
    color: string;
    strokeWidth: number;
    strokeDash: 'solid' | 'dashed' | 'dotted';
    fontSize?: number;
    targetEl?: SVGElement;
    textContent?: string;
  } | null>(null);

  // Bộ nhớ tạm phần tử đồ thị đang được kéo thả (Drag & Drop di chuyển toàn bộ đồ thị)
  const draggedGraphWrapperRef = useRef<HTMLElement | null>(null);

  // Cập nhật thuộc tính trực quan cho phần tử đang chọn trong đồ thị
  const handleUpdateSelectedGraphStyle = (updates: {
    color?: string;
    strokeWidth?: number;
    strokeDash?: 'solid' | 'dashed' | 'dotted';
    fontSize?: number;
  }) => {
    try {
      if (!selectedGraphElement || !editorRef.current) return;
      const wrapper = editorRef.current.querySelector(`[data-graph-id="${selectedGraphElement.graphId}"]`);
      if (!wrapper) return;

      const svg = wrapper.querySelector('svg');
      if (!svg) return;

      const newColor = updates.color !== undefined ? updates.color : selectedGraphElement.color;
      const newWidth = updates.strokeWidth !== undefined ? updates.strokeWidth : selectedGraphElement.strokeWidth;
      const newDash = updates.strokeDash !== undefined ? updates.strokeDash : selectedGraphElement.strokeDash;
      const newFontSz = updates.fontSize !== undefined ? updates.fontSize : selectedGraphElement.fontSize;

      const dashVal = newDash === 'dashed' ? '5,4' : newDash === 'dotted' ? '2,2' : 'none';

      if (selectedGraphElement.elementType === 'curve') {
        const curves = svg.querySelectorAll('.graph-curve');
        curves.forEach(c => {
          if (updates.color !== undefined) c.setAttribute('stroke', newColor);
          if (updates.strokeWidth !== undefined) c.setAttribute('stroke-width', newWidth.toString());
          if (updates.strokeDash !== undefined) c.setAttribute('stroke-dasharray', dashVal);
        });
      } else if (selectedGraphElement.elementType === 'guideline') {
        const guidelines = svg.querySelectorAll('.graph-guideline');
        guidelines.forEach(g => {
          if (updates.color !== undefined) g.setAttribute('stroke', newColor);
          if (updates.strokeWidth !== undefined) g.setAttribute('stroke-width', newWidth.toString());
          if (updates.strokeDash !== undefined) g.setAttribute('stroke-dasharray', dashVal);
        });
      } else if (selectedGraphElement.elementType === 'axis') {
        const axes = svg.querySelectorAll('.graph-axis');
        axes.forEach(a => {
          if (updates.color !== undefined) a.setAttribute('stroke', newColor);
          if (updates.strokeWidth !== undefined) a.setAttribute('stroke-width', newWidth.toString());
          if (updates.strokeDash !== undefined) a.setAttribute('stroke-dasharray', dashVal);
        });
        const markers = svg.querySelectorAll('marker polygon');
        markers.forEach(m => {
          if (updates.color !== undefined) m.setAttribute('fill', newColor);
        });
      } else if (selectedGraphElement.elementType === 'text') {
        if (selectedGraphElement.targetEl) {
          if (updates.color !== undefined) selectedGraphElement.targetEl.setAttribute('fill', newColor);
          if (updates.fontSize !== undefined) selectedGraphElement.targetEl.setAttribute('font-size', `${newFontSz}px`);
        }
      } else if (selectedGraphElement.elementType === 'point') {
        if (selectedGraphElement.targetEl) {
          if (updates.color !== undefined) selectedGraphElement.targetEl.setAttribute('fill', newColor);
          if (updates.strokeWidth !== undefined) selectedGraphElement.targetEl.setAttribute('r', newWidth.toString());
        }
      }

      setSelectedGraphElement(prev => prev ? {
        ...prev,
        color: newColor,
        strokeWidth: newWidth,
        strokeDash: newDash,
        fontSize: newFontSz,
      } : null);

      saveCurrentSelection();
    } catch (err) {
      console.warn('Error updating selected graph style:', err);
    }
  };

  // Cập nhật nội dung chữ/số/nhãn trực tiếp trên đồ thị
  const handleUpdateSelectedGraphText = (newText: string) => {
    try {
      if (!selectedGraphElement?.targetEl) return;
      const target = selectedGraphElement.targetEl;
      const tspan = target.querySelector('tspan');
      if (tspan) {
        tspan.textContent = newText;
      } else {
        target.textContent = newText;
      }
      target.setAttribute('data-label', newText ? `Nhãn: ${newText}` : 'Nhãn chữ');

      setSelectedGraphElement(prev => prev ? {
        ...prev,
        elementName: newText ? `Nhãn: ${newText}` : 'Nhãn chữ',
        textContent: newText,
      } : null);

      saveCurrentSelection();
    } catch (err) {
      console.warn('Error updating graph text content:', err);
    }
  };

  // Xóa phần tử đang chọn (chữ/số nhãn trục, số cực trị, điểm mốc, đường gióng, trục, v.v.) khỏi đồ thị
  const handleDeleteSelectedGraphElement = () => {
    try {
      if (!selectedGraphElement?.targetEl) return;
      const elName = selectedGraphElement.elementName;
      const target = selectedGraphElement.targetEl;
      
      target.classList?.remove('graph-element-selected');
      target.remove();
      setSelectedGraphElement(null);
      saveCurrentSelection();
      setNotification({
        text: `Đã xóa "${elName}" khỏi đồ thị thành công!`,
        type: 'success',
      });
      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      console.warn('Error deleting selected graph element:', err);
    }
  };

  // Thêm chữ / nhãn / ký hiệu mới trực tiếp vào đồ thị
  const handleAddGraphText = (targetWrapper?: HTMLElement | null, atX?: number, atY?: number, defaultText: string = 'M') => {
    try {
      let wrapper = targetWrapper;
      if (!wrapper && selectedGraphElement?.graphId && editorRef.current) {
        wrapper = editorRef.current.querySelector<HTMLElement>(`[data-graph-id="${selectedGraphElement.graphId}"]`);
      }
      if (!wrapper && editorRef.current) {
        wrapper = editorRef.current.querySelector<HTMLElement>('.word-graph-wrapper');
      }
      if (!wrapper) {
        setNotification({ text: 'Vui lòng chọn hoặc chèn một đồ thị trước khi thêm nhãn!', type: 'info' });
        setTimeout(() => setNotification(null), 2500);
        return;
      }

      const svg = wrapper.querySelector('svg.word-graph-svg') as SVGSVGElement | null;
      if (!svg) return;

      const inputVal = window.prompt('Nhập nội dung chữ/số/nhãn muốn thêm vào đồ thị (ví dụ: A, M(1;2), d, y=2x, x₀, y₀, 3, v.v.):', defaultText);
      if (inputVal === null || !inputVal.trim()) return;
      const textVal = inputVal.trim();

      // Xác định tọa độ SVG đặt nhãn
      let posX = atX;
      let posY = atY;
      if (posX === undefined || posY === undefined) {
        const viewBox = svg.getAttribute('viewBox')?.split(' ').map(Number) || [0, 0, 380, 260];
        const svgW = viewBox[2] || 380;
        const svgH = viewBox[3] || 260;
        posX = Math.round(svgW / 2 + 25);
        posY = Math.round(svgH / 2 - 25);
      }

      const newTextEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      newTextEl.setAttribute('class', 'graph-label graph-draggable-text');
      newTextEl.setAttribute('data-element-type', 'text');
      newTextEl.setAttribute('data-label', `Nhãn: ${textVal}`);
      newTextEl.setAttribute('x', posX.toString());
      newTextEl.setAttribute('y', posY.toString());
      newTextEl.setAttribute('fill', '#2563eb');
      newTextEl.setAttribute('font-size', '16px');
      newTextEl.setAttribute('font-family', "'Times New Roman', serif");
      newTextEl.setAttribute('font-weight', 'bold');
      newTextEl.setAttribute('style', 'cursor: grab; user-select: none;');
      newTextEl.setAttribute('title', `Nhãn: ${textVal} (Bấm chọn để sửa/đổi màu/xóa, giữ chuột để kéo vị trí)`);
      newTextEl.innerHTML = `<tspan>${textVal}</tspan>`;

      svg.appendChild(newTextEl);

      // Tự động chọn nhãn mới tạo để người dùng chỉnh sửa/đổi màu ngay
      const graphId = wrapper.getAttribute('data-graph-id') || '';
      if (selectedGraphElement?.targetEl) {
        selectedGraphElement.targetEl.classList?.remove('graph-element-selected');
      }
      newTextEl.classList.add('graph-element-selected');
      setSelectedGraphElement({
        graphId,
        elementType: 'text',
        elementName: `Nhãn: ${textVal}`,
        color: '#2563eb',
        strokeWidth: 2,
        strokeDash: 'solid',
        fontSize: 16,
        targetEl: newTextEl,
        textContent: textVal,
      });

      saveCurrentSelection();
      setNotification({
        text: `Đã thêm nhãn "${textVal}" vào đồ thị! Bấm giữ chuột để kéo đến vị trí mong muốn hoặc sửa trên thanh công cụ.`,
        type: 'success',
      });
      setTimeout(() => setNotification(null), 3500);
    } catch (err) {
      console.warn('Error adding graph text:', err);
    }
  };

  // Thêm điểm tọa độ (chấm tròn & gióng trục Ox, Oy) trực tiếp vào đồ thị
  const handleAddGraphPoint = (targetWrapper?: HTMLElement | null) => {
    try {
      let wrapper = targetWrapper;
      if (!wrapper && selectedGraphElement?.graphId && editorRef.current) {
        wrapper = editorRef.current.querySelector<HTMLElement>(`[data-graph-id="${selectedGraphElement.graphId}"]`);
      }
      if (!wrapper && editorRef.current) {
        wrapper = editorRef.current.querySelector<HTMLElement>('.word-graph-wrapper');
      }
      if (!wrapper) {
        setNotification({ text: 'Vui lòng chọn hoặc chèn một đồ thị trước khi thêm điểm!', type: 'info' });
        setTimeout(() => setNotification(null), 2500);
        return;
      }

      const svg = wrapper.querySelector('svg.word-graph-svg') as SVGSVGElement | null;
      if (!svg) return;

      const inputVal = window.prompt(
        'Nhập tọa độ điểm muốn thêm (hoặc tên và tọa độ, ví dụ: "1, 2" hoặc "1; 2" hoặc "A(1; 2)" hoặc "M(-1; 3)"):',
        'A(1; 1)'
      );
      if (inputVal === null || !inputVal.trim()) return;

      // Phân tích tên và tọa độ
      const match = inputVal.trim().match(/^(?:([A-Za-z0-9_]+)\s*[\(:=]\s*)?(-?\d+(?:\.\d+)?)[;,\s]+(-?\d+(?:\.\d+)?)\)?$/);
      if (!match) {
        setNotification({
          text: 'Định dạng tọa độ không hợp lệ! Vui lòng nhập dạng "1, 2" hoặc "A(1; 2)".',
          type: 'error',
        });
        setTimeout(() => setNotification(null), 3000);
        return;
      }

      const ptName = match[1] || '';
      const ptX = parseFloat(match[2]);
      const ptY = parseFloat(match[3]);

      const xmin = parseFloat(wrapper.getAttribute('data-xmin') || '-2');
      const xmax = parseFloat(wrapper.getAttribute('data-xmax') || '2');
      const ymin = parseFloat(wrapper.getAttribute('data-ymin') || '-2');
      const ymax = parseFloat(wrapper.getAttribute('data-ymax') || '4');

      const spanX = Math.max(0.2, Math.abs(xmax - xmin));
      const spanY = Math.max(0.2, Math.abs(ymax - ymin));

      const viewBox = svg.getAttribute('viewBox')?.split(' ').map(Number) || [0, 0, 380, 260];
      const svgW = viewBox[2] || 380;
      const svgH = viewBox[3] || 260;
      const pad = 34;
      const plotW = svgW - 2 * pad;
      const plotH = svgH - 2 * pad;

      const toSvgX = (x: number) => pad + ((x - xmin) / spanX) * plotW;
      const toSvgY = (y: number) => (svgH - pad) - ((y - ymin) / spanY) * plotH;

      const sx = toSvgX(ptX);
      const sy = toSvgY(ptY);
      const ox = toSvgX(0);
      const oy = toSvgY(0);

      // 1. Tạo đường gióng trục x
      const lineX = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      lineX.setAttribute('class', 'graph-guideline');
      lineX.setAttribute('data-element-type', 'guideline');
      lineX.setAttribute('data-label', `Đường gióng x=${ptX}`);
      lineX.setAttribute('x1', sx.toFixed(1));
      lineX.setAttribute('y1', oy.toFixed(1));
      lineX.setAttribute('x2', sx.toFixed(1));
      lineX.setAttribute('y2', sy.toFixed(1));
      lineX.setAttribute('stroke', '#64748b');
      lineX.setAttribute('stroke-width', '1.2');
      lineX.setAttribute('stroke-dasharray', '3,3');
      lineX.setAttribute('style', 'cursor: pointer;');
      lineX.setAttribute('title', `Đường gióng x=${ptX} (Bấm chọn để sửa/xóa)`);
      svg.appendChild(lineX);

      // 2. Tạo đường gióng trục y
      const lineY = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      lineY.setAttribute('class', 'graph-guideline');
      lineY.setAttribute('data-element-type', 'guideline');
      lineY.setAttribute('data-label', `Đường gióng y=${ptY}`);
      lineY.setAttribute('x1', ox.toFixed(1));
      lineY.setAttribute('y1', sy.toFixed(1));
      lineY.setAttribute('x2', sx.toFixed(1));
      lineY.setAttribute('y2', sy.toFixed(1));
      lineY.setAttribute('stroke', '#64748b');
      lineY.setAttribute('stroke-width', '1.2');
      lineY.setAttribute('stroke-dasharray', '3,3');
      lineY.setAttribute('style', 'cursor: pointer;');
      lineY.setAttribute('title', `Đường gióng y=${ptY} (Bấm chọn để sửa/xóa)`);
      svg.appendChild(lineY);

      // 3. Tạo điểm tròn tọa độ
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('class', 'graph-point graph-extrema-circle');
      circle.setAttribute('data-element-type', 'point');
      circle.setAttribute('data-label', `Điểm ${ptName ? `${ptName}(${ptX}; ${ptY})` : `(${ptX}; ${ptY})`}`);
      circle.setAttribute('cx', sx.toFixed(1));
      circle.setAttribute('cy', sy.toFixed(1));
      circle.setAttribute('r', '3.5');
      circle.setAttribute('fill', '#2563eb');
      circle.setAttribute('style', 'cursor: pointer;');
      circle.setAttribute('title', `Điểm ${ptName ? `${ptName}(${ptX}; ${ptY})` : `(${ptX}; ${ptY})`} (Bấm chọn để sửa/xóa, giữ chuột để kéo)`);
      svg.appendChild(circle);

      // 4. Nếu có tên điểm (ví dụ A, M), thêm nhãn tên điểm
      if (ptName) {
        const textName = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        textName.setAttribute('class', 'graph-label graph-draggable-text');
        textName.setAttribute('data-element-type', 'text');
        textName.setAttribute('data-label', `Tên điểm ${ptName}`);
        textName.setAttribute('x', (sx + 6).toFixed(1));
        textName.setAttribute('y', (sy - 6).toFixed(1));
        textName.setAttribute('fill', '#2563eb');
        textName.setAttribute('font-size', '16px');
        textName.setAttribute('font-family', "'Times New Roman', serif");
        textName.setAttribute('font-weight', 'bold');
        textName.setAttribute('style', 'cursor: grab; user-select: none;');
        textName.setAttribute('title', `Tên điểm ${ptName} (Kéo vị trí hoặc bấm sửa)`);
        textName.innerHTML = `<tspan>${ptName}</tspan>`;
        svg.appendChild(textName);
      }

      // 5. Thêm số trên trục Ox nếu không trùng gốc O
      if (Math.abs(ptX) > 0.1) {
        const textX = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        textX.setAttribute('class', 'graph-label graph-draggable-text');
        textX.setAttribute('data-element-type', 'text');
        textX.setAttribute('data-label', `Số hoành độ ${ptX}`);
        textX.setAttribute('x', sx.toFixed(1));
        textX.setAttribute('y', (oy + 16).toFixed(1));
        textX.setAttribute('font-size', '16px');
        textX.setAttribute('font-family', "'Times New Roman', serif");
        textX.setAttribute('text-anchor', 'middle');
        textX.setAttribute('fill', '#0f172a');
        textX.setAttribute('style', 'cursor: grab; user-select: none;');
        textX.setAttribute('title', `Số hoành độ ${ptX} (Kéo vị trí hoặc bấm sửa)`);
        textX.innerHTML = `<tspan>${ptX}</tspan>`;
        svg.appendChild(textX);
      }

      // 6. Thêm số trên trục Oy nếu không trùng gốc O
      if (Math.abs(ptY) > 0.1) {
        const textY = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        textY.setAttribute('class', 'graph-label graph-draggable-text');
        textY.setAttribute('data-element-type', 'text');
        textY.setAttribute('data-label', `Số tung độ ${ptY}`);
        textY.setAttribute('x', (ox - 6).toFixed(1));
        textY.setAttribute('y', (sy + 4).toFixed(1));
        textY.setAttribute('font-size', '16px');
        textY.setAttribute('font-family', "'Times New Roman', serif");
        textY.setAttribute('text-anchor', 'end');
        textY.setAttribute('fill', '#0f172a');
        textY.setAttribute('style', 'cursor: grab; user-select: none;');
        textY.setAttribute('title', `Số tung độ ${ptY} (Kéo vị trí hoặc bấm sửa)`);
        textY.innerHTML = `<tspan>${ptY}</tspan>`;
        svg.appendChild(textY);
      }

      // Tự động chọn điểm vừa tạo
      const graphId = wrapper.getAttribute('data-graph-id') || '';
      if (selectedGraphElement?.targetEl) {
        selectedGraphElement.targetEl.classList?.remove('graph-element-selected');
      }
      circle.classList.add('graph-element-selected');
      setSelectedGraphElement({
        graphId,
        elementType: 'point',
        elementName: `Điểm ${ptName ? `${ptName}(${ptX}; ${ptY})` : `(${ptX}; ${ptY})`}`,
        color: '#2563eb',
        strokeWidth: 3.5,
        strokeDash: 'solid',
        fontSize: 16,
        targetEl: circle,
      });

      saveCurrentSelection();
      setNotification({
        text: `Đã thêm điểm ${ptName ? `${ptName}(${ptX}; ${ptY})` : `(${ptX}; ${ptY})`} và đường gióng trục trực tiếp vào đồ thị!`,
        type: 'success',
      });
      setTimeout(() => setNotification(null), 3500);
    } catch (err) {
      console.warn('Error adding graph point:', err);
    }
  };

  // Lắng nghe phím tắt Delete / Backspace để xóa nhanh chữ/số hoặc phần tử đồ thị đang chọn
  useEffect(() => {
    const handleGlobalGraphKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedGraphElement?.targetEl) {
        const activeTag = document.activeElement?.tagName?.toLowerCase();
        if (activeTag === 'input' || activeTag === 'textarea') return;
        e.preventDefault();
        handleDeleteSelectedGraphElement();
      } else if (e.key === 'Escape' && selectedGraphElement) {
        if (selectedGraphElement.targetEl) {
          selectedGraphElement.targetEl.classList?.remove('graph-element-selected');
        }
        setSelectedGraphElement(null);
      }
    };
    window.addEventListener('keydown', handleGlobalGraphKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalGraphKeyDown);
  }, [selectedGraphElement]);

  // Lắng nghe sự kiện click nút "Chỉnh sửa" từ đồ thị TikZ & các khối trên slide PPT để mở cửa sổ chỉnh sửa thông số
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

    const handleEditPptGraph = (e: CustomEvent<any>) => {
      const d = e.detail;
      if (!d) return;
      setWordGraphFormula(d.formula || 'y = x^2 - 1');
      setWordGraphXMin(d.xmin || '-2');
      setWordGraphXMax(d.xmax || '2');
      setWordGraphYMin(d.ymin || '-2');
      setWordGraphYMax(d.ymax || '4');
      setWordGraphUnitX(d.unitx || '1');
      setWordGraphUnitY(d.unity || '1');
      setWordGraphShowAxisLabels(d.showAxis !== false);
      setWordGraphShowOriginLabel(d.showOrigin !== false);
      setWordGraphShowExtremaLabels(d.showExtrema !== false);
      setWordGraphRequirement(d.req || '');
      setEditingGraphId(d.graphId);
      setWordGraphOldTikz(d.graphId);
      setShowWordGraphModal(true);
    };

    const handleEditPptBbt = (e: CustomEvent<any>) => {
      const d = e.detail;
      if (!d) return;
      setWordBbtMode(d.mode === 'function' ? 'function' : 'manual');
      setWordBbtFormula(d.formula || '');
      setWordBbtXPoints(d.xpoints || '-\\infty, -1, 1, +\\infty');
      setWordBbtYPrimeSigns(d.yprimes || '+, 0, -, 0, +');
      setWordBbtYValues(d.yvalues || '-/-\\infty, +/2, -/-2, +/+\\infty');
      setWordBbtVarName(d.varname || 'x');
      setWordBbtFuncRow(d.funcrow || 'y');
      setWordBbtDerivRow(d.derivrow || "y'");
      setEditingBbtId(d.bbtId);
      setShowWordBBTModal(true);
    };

    window.addEventListener('app-open-edit-tikz-modal', handleOpenEditTikz as EventListener);
    window.addEventListener('app-edit-ppt-graph', handleEditPptGraph as EventListener);
    window.addEventListener('app-edit-ppt-bbt', handleEditPptBbt as EventListener);
    return () => {
      window.removeEventListener('app-open-edit-tikz-modal', handleOpenEditTikz as EventListener);
      window.removeEventListener('app-edit-ppt-graph', handleEditPptGraph as EventListener);
      window.removeEventListener('app-edit-ppt-bbt', handleEditPptBbt as EventListener);
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
  const [editingBbtId, setEditingBbtId] = useState<string | null>(null);
  const [wordBbtMode, setWordBbtMode] = useState<'function' | 'manual'>('function');
  const [wordBbtFormula, setWordBbtFormula] = useState<string>('y = x^3 - 3x');
  const [wordBbtXPoints, setWordBbtXPoints] = useState<string>('-\\infty, -1, 1, +\\infty');
  const [wordBbtYPrimeSigns, setWordBbtYPrimeSigns] = useState<string>(', +, 0, -, 0, +, ');
  const [wordBbtYValues, setWordBbtYValues] = useState<string>('-/ -\\infty, +/ 2, -/ -2, +/ +\\infty');
  const [wordBbtFormulaDesc, setWordBbtFormulaDesc] = useState<string>('Hàm bậc 3 có 2 điểm cực trị: Cực đại tại (-1; 2), Cực tiểu tại (1; -2)');
  const [wordBbtVarName, setWordBbtVarName] = useState<string>('x');
  const [wordBbtFuncRow, setWordBbtFuncRow] = useState<string>('y');
  const [wordBbtDerivRow, setWordBbtDerivRow] = useState<string>("y'");

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

  // Hàm sinh SVG vector trực quan cho đồ thị hàm số (chứa các phần tử DOM có thể chọn, kéo thả và tùy chỉnh)
  const generateWordGraphSvg = (
    formula: string,
    xMinNum: number,
    xMaxNum: number,
    yMinNum: number,
    yMaxNum: number,
    xLabel: string = 'x',
    yLabel: string = 'y',
    _cleanFormulaForTikz?: string,
    varName: string = 'x',
    extremaList: Array<{ x: number; y: number }> = [],
    graphId: string = `graph-${Date.now()}`,
    userFontSize: number = 16,
    unitX: number = 1,
    unitY: number = 1,
    showAxisLabels: boolean = true,
    showOriginLabel: boolean = true,
    showExtremaLabels: boolean = true,
    requirement: string = ''
  ): string => {
    const reqLower = (requirement || '').toLowerCase();
    const hasGiong = reqLower.includes('gióng') || reqLower.includes('giong') || reqLower.includes('tọa độ') || reqLower.includes('đường gióng');
    const isReqRed = reqLower.includes('đỏ') || reqLower.includes('red');
    const isReqDashed = reqLower.includes('nét đứt') || reqLower.includes('đứt') || reqLower.includes('dashed');

    const isCurveExplicitRed = /đồ thị.*(?:màu\s+)?đỏ|đường cong.*(?:màu\s+)?đỏ|hàm số.*(?:màu\s+)?đỏ/i.test(reqLower) || (isReqRed && !hasGiong);
    const isCurveExplicitDashed = /đồ thị.*(?:nét\s+)?đứt|đường cong.*(?:nét\s+)?đứt|hàm số.*(?:nét\s+)?đứt/i.test(reqLower) || (isReqDashed && !hasGiong);
    const curveColor = isCurveExplicitRed ? '#dc2626' : '#2563eb';
    const curveDashed = isCurveExplicitDashed;

    const isGuidelineRed = hasGiong && isReqRed;
    const guidelineColor = isGuidelineRed ? '#dc2626' : '#64748b';
    const pointColor = isGuidelineRed ? '#dc2626' : '#1e293b';

    let finalExtrema = [...extremaList];
    if (finalExtrema.length === 0) {
      try {
        const evalMathTemp = convertMathExprToJs(formula, varName);
        const ptsTemp: Array<{ x: number; y: number }> = [];
        const stepTemp = (xMaxNum - xMinNum) / 150;
        for (let x = xMinNum; x <= xMaxNum + 0.0001; x += stepTemp) {
          const yVal = evalMathTemp(x);
          if (!isNaN(yVal) && isFinite(yVal)) ptsTemp.push({ x, y: yVal });
        }
        for (let i = 2; i < ptsTemp.length - 2; i++) {
          const cur = ptsTemp[i];
          const prev = ptsTemp[i - 1];
          const next = ptsTemp[i + 1];
          if (cur.x <= xMinNum + 0.08 || cur.x >= xMaxNum - 0.08) continue;
          if ((cur.y > prev.y && cur.y > next.y) || (cur.y < prev.y && cur.y < next.y)) {
            if (!finalExtrema.some(e => Math.abs(e.x - cur.x) < 0.35)) {
              let cleanX = Number(cur.x.toFixed(2));
              if (Math.abs(cleanX - Math.round(cleanX)) < 0.05) cleanX = Math.round(cleanX);
              let cleanY = Number(cur.y.toFixed(2));
              if (Math.abs(cleanY - Math.round(cleanY)) < 0.05) cleanY = Math.round(cleanY);
              finalExtrema.push({ x: cleanX, y: cleanY });
            }
          }
        }
      } catch {
        // ignore
      }
    }

    const pointMatches = requirement.matchAll(/(?:điểm\s+)?(?:[A-Z]\s*)?\(\s*(-?\d+(?:\.\d+)?)\s*[,;]\s*(-?\d+(?:\.\d+)?)\s*\)/gi);
    for (const match of pointMatches) {
      const px = parseFloat(match[1]);
      const py = parseFloat(match[2]);
      if (!isNaN(px) && !isNaN(py)) {
        if (!finalExtrema.some(e => Math.abs(e.x - px) < 0.1 && Math.abs(e.y - py) < 0.1)) {
          finalExtrema.push({ x: px, y: py });
        }
      }
    }

    const spanX = Math.max(0.2, Math.abs(xMaxNum - xMinNum));
    const spanY = Math.max(0.2, Math.abs(yMaxNum - yMinNum));
    const uX = unitX > 0 ? unitX : 1;
    const uY = unitY > 0 ? unitY : 1;

    // Tự động tính kích thước vùng vẽ đồ thị plotW và plotH theo spanX, spanY và tỉ lệ đơn vị trên 2 trục
    const baseUnitPx = 48;
    const rawPlotW = spanX * uX * baseUnitPx;
    const rawPlotH = spanY * uY * baseUnitPx;

    // Chuẩn hóa scaleFactor để đồ thị nằm gọn gàng, đẹp mắt trong trang Word (không quá to hoặc quá bé)
    let scaleFactor = 1;
    if (rawPlotW > 520) scaleFactor = Math.min(scaleFactor, 520 / rawPlotW);
    if (rawPlotH > 420) scaleFactor = Math.min(scaleFactor, 420 / rawPlotH);
    if (rawPlotW < 220 && rawPlotH < 180) scaleFactor = Math.max(scaleFactor, 220 / Math.max(rawPlotW, 1));

    const finalBase = baseUnitPx * scaleFactor;
    const pad = 34;
    const plotW = spanX * uX * finalBase;
    const plotH = spanY * uY * finalBase;
    const svgW = Math.max(200, Math.round(plotW + 2 * pad));
    const svgH = Math.max(160, Math.round(plotH + 2 * pad));

    const toSvgX = (x: number) => pad + ((x - xMinNum) / spanX) * plotW;
    const toSvgY = (y: number) => (svgH - pad) - ((y - yMinNum) / spanY) * plotH;

    const ox = toSvgX(0);
    const oy = toSvgY(0);

    // Tính toán các điểm trên đường cong hàm số bằng hàm JavaScript an toàn
    const evalMath = convertMathExprToJs(formula, varName);
    const pts: Array<{ x: number; y: number }> = [];
    const samples = 120;
    const step = (xMaxNum - xMinNum) / samples;
    for (let x = xMinNum; x <= xMaxNum + 0.0001; x += step) {
      const yVal = evalMath(x);
      if (!isNaN(yVal) && isFinite(yVal)) {
        pts.push({ x, y: yVal });
      }
    }

    let pathD = '';
    for (let i = 0; i < pts.length; i++) {
      const sx = toSvgX(pts[i].x);
      const sy = toSvgY(pts[i].y);
      if (i === 0) {
        pathD += `M ${sx.toFixed(1)} ${sy.toFixed(1)}`;
      } else {
        pathD += ` L ${sx.toFixed(1)} ${sy.toFixed(1)}`;
      }
    }

    const clipId = `graph-clip-${graphId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
    const clipX = Math.min(toSvgX(xMinNum), toSvgX(xMaxNum));
    const clipY = Math.min(toSvgY(yMinNum), toSvgY(yMaxNum));
    const clipW = Math.abs(toSvgX(xMaxNum) - toSvgX(xMinNum));
    const clipH = Math.abs(toSvgY(yMaxNum) - toSvgY(yMinNum));

    // Điểm cực trị và đường gióng tọa độ (Cho phép click chọn đổi màu, nét đứt/liền, kéo vị trí số hoặc bấm phím Delete/nút Xóa)
    const extremaElements = finalExtrema.map(e => {
      const sx = toSvgX(e.x);
      const sy = toSvgY(e.y);
      return `
        <line class="graph-guideline" data-element-type="guideline" data-label="Đường gióng trục (${e.x}, ${e.y})" x1="${sx.toFixed(1)}" y1="${oy.toFixed(1)}" x2="${sx.toFixed(1)}" y2="${sy.toFixed(1)}" stroke="${guidelineColor}" stroke-width="1.3" stroke-dasharray="3,3" style="cursor: pointer;" title="Đường gióng trục (Bấm chọn để sửa/xóa)" />
        <line class="graph-guideline" data-element-type="guideline" data-label="Đường gióng trục (${e.x}, ${e.y})" x1="${ox.toFixed(1)}" y1="${sy.toFixed(1)}" x2="${sx.toFixed(1)}" y2="${sy.toFixed(1)}" stroke="${guidelineColor}" stroke-width="1.3" stroke-dasharray="3,3" style="cursor: pointer;" title="Đường gióng trục (Bấm chọn để sửa/xóa)" />
        <circle class="graph-point graph-extrema-circle" data-element-type="point" data-label="Điểm cực trị (${e.x}, ${e.y})" cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="3.5" fill="${pointColor}" style="cursor: pointer;" title="Điểm cực trị (${e.x}, ${e.y}) (Bấm chọn để sửa/đổi màu/xóa, giữ chuột để kéo)" />
        ${showExtremaLabels && Math.abs(e.x) > 0.1 ? `<text class="graph-label graph-draggable-text" data-element-type="text" data-label="Số ${e.x}" x="${sx.toFixed(1)}" y="${(oy + 16).toFixed(1)}" font-size="${userFontSize}px" font-family="'Times New Roman', serif" text-anchor="middle" fill="${isGuidelineRed ? '#dc2626' : '#0f172a'}" style="cursor: grab; user-select: none;" title="Số hoành độ ${e.x} (Bấm chọn để sửa/xóa, giữ chuột để kéo)"><tspan>${e.x}</tspan></text>` : ''}
        ${showExtremaLabels && Math.abs(e.y) > 0.1 ? `<text class="graph-label graph-draggable-text" data-element-type="text" data-label="Số ${e.y}" x="${(ox - 6).toFixed(1)}" y="${(sy + 4).toFixed(1)}" font-size="${userFontSize}px" font-family="'Times New Roman', serif" text-anchor="end" fill="${isGuidelineRed ? '#dc2626' : '#0f172a'}" style="cursor: grab; user-select: none;" title="Số tung độ ${e.y} (Bấm chọn để sửa/xóa, giữ chuột để kéo)"><tspan>${e.y}</tspan></text>` : ''}
      `;
    }).join('');

    return `
<svg class="word-graph-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgW} ${svgH}" width="100%" height="auto" style="background: transparent; max-width: 100%; height: auto; display: inline-block; overflow: visible; font-family: 'Times New Roman', serif;">
  <defs>
    <marker id="arrow-x-${clipId}" markerWidth="8" markerHeight="8" refX="7" refY="3.5" orient="auto">
      <polygon points="0 0, 8 3.5, 0 7" fill="#0f172a" />
    </marker>
    <marker id="arrow-y-${clipId}" markerWidth="8" markerHeight="8" refX="7" refY="3.5" orient="auto">
      <polygon points="0 0, 8 3.5, 0 7" fill="#0f172a" />
    </marker>
    <clipPath id="${clipId}">
      <rect x="${clipX.toFixed(1)}" y="${clipY.toFixed(1)}" width="${clipW.toFixed(1)}" height="${clipH.toFixed(1)}" />
    </clipPath>
  </defs>
  <!-- Trục Ox -->
  <line class="graph-axis" data-element-type="axis" data-label="Trục Ox" x1="12" y1="${oy.toFixed(1)}" x2="${(svgW - 12).toFixed(1)}" y2="${oy.toFixed(1)}" stroke="#0f172a" stroke-width="1.6" marker-end="url(#arrow-x-${clipId})" style="cursor: pointer;" />
  ${showAxisLabels ? `<text class="graph-label graph-draggable-text" data-element-type="text" data-label="Tên trục ${xLabel}" x="${(svgW - 14).toFixed(1)}" y="${(oy - 7).toFixed(1)}" fill="#0f172a" font-size="${userFontSize}px" font-style="italic" font-family="'Times New Roman', serif" font-weight="bold" style="cursor: grab; user-select: none;" title="Tên nhãn trục ${xLabel} (Bấm chọn để sửa/xóa)"><tspan>${xLabel}</tspan></text>` : ''}
  <!-- Trục Oy -->
  <line class="graph-axis" data-element-type="axis" data-label="Trục Oy" x1="${ox.toFixed(1)}" y1="${(svgH - 12).toFixed(1)}" x2="${ox.toFixed(1)}" y2="12" stroke="#0f172a" stroke-width="1.6" marker-end="url(#arrow-y-${clipId})" style="cursor: pointer;" />
  ${showAxisLabels ? `<text class="graph-label graph-draggable-text" data-element-type="text" data-label="Tên trục ${yLabel}" x="${(ox + 8).toFixed(1)}" y="18" fill="#0f172a" font-size="${userFontSize}px" font-style="italic" font-family="'Times New Roman', serif" font-weight="bold" style="cursor: grab; user-select: none;" title="Tên nhãn trục ${yLabel} (Bấm chọn để sửa/xóa)"><tspan>${yLabel}</tspan></text>` : ''}
  <!-- Gốc tọa độ O -->
  ${showOriginLabel ? `<text class="graph-label graph-draggable-text" data-element-type="text" data-label="Gốc O" x="${(ox - 14).toFixed(1)}" y="${(oy + 16).toFixed(1)}" fill="#0f172a" font-size="${userFontSize}px" font-family="'Times New Roman', serif" style="cursor: grab; user-select: none;" title="Gốc tọa độ O (Bấm chọn để sửa/xóa)"><tspan>O</tspan></text>` : ''}
  <!-- Các điểm cực trị gióng tọa độ -->
  ${extremaElements}
  <!-- Đường cong đồ thị hàm số liên tục -->
  ${pathD ? `<path class="graph-curve" data-element-type="curve" data-label="Đồ thị hàm số" d="${pathD}" fill="none" stroke="${curveColor}" stroke-width="2.5" ${curveDashed ? 'stroke-dasharray="6,4"' : ''} stroke-linecap="round" stroke-linejoin="round" clip-path="url(#${clipId})" style="cursor: pointer;" />` : ''}
</svg>`.trim();
  };

  // Hàm sinh HTML bao quanh khối đồ thị hoàn chỉnh (có thanh công cụ sửa, di chuyển, xóa, căn lề và hỗ trợ kéo co giãn)
  const generateWordGraphWrapperHtml = (
    formula: string,
    xMinNum: number,
    xMaxNum: number,
    yMinNum: number,
    yMaxNum: number,
    xLabel: string = 'x',
    yLabel: string = 'y',
    cleanFormulaForTikz?: string,
    varName: string = 'x',
    extremaList: Array<{ x: number; y: number }> = [],
    graphId: string = `graph-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    requirement: string = '',
    userFontSize: number = 16,
    initialWidth: number = 380,
    unitX: number = 1,
    unitY: number = 1,
    showAxisLabels: boolean = true,
    showOriginLabel: boolean = true,
    showExtremaLabels: boolean = true
  ): string => {
    const svgXml = generateWordGraphSvg(
      formula,
      xMinNum,
      xMaxNum,
      yMinNum,
      yMaxNum,
      xLabel,
      yLabel,
      cleanFormulaForTikz,
      varName,
      extremaList,
      graphId,
      userFontSize,
      unitX,
      unitY,
      showAxisLabels,
      showOriginLabel,
      showExtremaLabels
    );

    const isTeacher = isTeacherOrHigher(currentRole);

    return `
      <div class="word-graph-wrapper relative my-3 group" contenteditable="false" draggable="${isTeacher ? 'true' : 'false'}" data-graph-id="${graphId}" data-formula="${encodeURIComponent(formula)}" data-xmin="${xMinNum}" data-xmax="${xMaxNum}" data-ymin="${yMinNum}" data-ymax="${yMaxNum}" data-unitx="${unitX}" data-unity="${unitY}" data-show-axis-labels="${showAxisLabels}" data-show-origin-label="${showOriginLabel}" data-show-extrema-labels="${showExtremaLabels}" data-xlabel="${encodeURIComponent(xLabel)}" data-ylabel="${encodeURIComponent(yLabel)}" data-varname="${varName}" data-req="${encodeURIComponent(requirement)}" data-width="${initialWidth}" style="text-align: center; margin: 16px auto; background: transparent; border: 1.5px dashed transparent; position: relative; max-width: ${initialWidth}px; width: 100%; display: block; user-select: none;" ${isTeacher ? `onmouseover="this.style.borderColor='#94a3b8'" onmouseout="this.style.borderColor='transparent'"` : ''}>
        ${isTeacher ? `
        <div class="word-graph-controls opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none group-hover:pointer-events-auto flex items-center justify-between gap-1.5 px-2.5 py-1 mb-1 rounded-lg bg-white/95 backdrop-blur-xs border border-slate-200 shadow-sm text-xs" style="user-select: none;">
          <div class="flex items-center gap-1.5">
            <button type="button" class="edit-graph-btn text-indigo-600 hover:text-indigo-800 font-bold px-1.5 py-0.5 rounded hover:bg-indigo-50 flex items-center gap-1 text-[11px] cursor-pointer" title="Mở lại cửa sổ nhập hàm để chỉnh sửa đồ thị này">
              ✏️ Sửa hàm
            </button>
            <span class="text-slate-300">|</span>
            <button type="button" class="add-graph-label-btn text-emerald-700 hover:text-emerald-900 font-bold px-1.5 py-0.5 rounded hover:bg-emerald-50 flex items-center gap-1 text-[11px] cursor-pointer" title="Thêm chữ, nhãn, hoặc ký hiệu trực tiếp vào đồ thị này">
              ➕ Thêm nhãn
            </button>
            <button type="button" class="add-graph-point-btn text-blue-700 hover:text-blue-900 font-bold px-1.5 py-0.5 rounded hover:bg-blue-50 flex items-center gap-1 text-[11px] cursor-pointer" title="Thêm điểm mốc tọa độ & đường gióng trực tiếp vào đồ thị này">
              ➕ Thêm điểm
            </button>
          </div>
          <div class="flex items-center gap-1">
            <span class="text-[10px] text-slate-400 font-medium hidden sm:inline" title="Kéo các chấm tròn ở góc/cạnh để thu nhỏ hoặc phóng to đồ thị">↔ Kéo co giãn:</span>
            <button type="button" class="graph-size-btn px-1.5 py-0.5 rounded text-slate-600 hover:bg-slate-100 text-[10px] font-bold cursor-pointer" data-size-action="decrease" title="Thu nhỏ đồ thị">-10%</button>
            <button type="button" class="graph-size-btn px-1.5 py-0.5 rounded text-slate-600 hover:bg-slate-100 text-[10px] font-bold cursor-pointer" data-size-action="increase" title="Phóng to đồ thị">+10%</button>
            <span class="text-slate-300">|</span>
            <button type="button" class="graph-align-btn px-1.5 py-0.5 rounded text-slate-500 hover:bg-slate-100 text-[10px] cursor-pointer" data-align="left" title="Căn trái">⫷ Trái</button>
            <button type="button" class="graph-align-btn px-1.5 py-0.5 rounded text-slate-700 bg-slate-100 font-bold text-[10px] cursor-pointer" data-align="center" title="Căn giữa">═ Giữa</button>
            <button type="button" class="graph-align-btn px-1.5 py-0.5 rounded text-slate-500 hover:bg-slate-100 text-[10px] cursor-pointer" data-align="right" title="Căn phải">⫸ Phải</button>
            <span class="text-slate-300">|</span>
            <button type="button" class="delete-graph-btn text-red-500 hover:text-red-700 font-bold px-1.5 py-0.5 rounded hover:bg-red-50 text-[12px] cursor-pointer" title="Xóa đồ thị này">✕</button>
          </div>
        </div>
        ` : ''}
        <div class="graph-svg-container relative inline-block w-full" style="line-height: 0;">
          ${svgXml}
          ${isTeacher ? `
          <!-- Nút kéo co giãn đồ thị góc dưới phải -->
          <div class="graph-resize-handle graph-resize-handle-se absolute -bottom-2 -right-2 w-6 h-6 bg-white border-2 border-indigo-600 rounded-full shadow-md cursor-se-resize flex items-center justify-center hover:scale-125 transition-transform" style="z-index: 25; touch-action: none;" title="Bấm giữ và kéo rê góc này để thu nhỏ hoặc phóng to đồ thị">
            <div class="w-2 h-2 bg-indigo-600 rounded-full pointer-events-none"></div>
          </div>
          <!-- Nút kéo co giãn đồ thị góc dưới trái -->
          <div class="graph-resize-handle-left graph-resize-handle-sw absolute -bottom-2 -left-2 w-6 h-6 bg-white border-2 border-indigo-600 rounded-full shadow-md cursor-sw-resize flex items-center justify-center hover:scale-125 transition-transform" style="z-index: 25; touch-action: none;" title="Bấm giữ và kéo rê góc này để thu nhỏ hoặc phóng to đồ thị">
            <div class="w-2 h-2 bg-indigo-600 rounded-full pointer-events-none"></div>
          </div>
          <!-- Nút kéo co giãn đồ thị cạnh phải -->
          <div class="graph-resize-handle-e absolute top-1/2 -right-2 -translate-y-1/2 w-4 h-7 bg-white border-2 border-indigo-600 rounded shadow-md cursor-ew-resize flex items-center justify-center hover:scale-110 transition-transform" style="z-index: 25; touch-action: none;" title="Bấm giữ và kéo rê cạnh này để co giãn đồ thị">
            <div class="w-1 h-3.5 bg-indigo-600 rounded-full pointer-events-none"></div>
          </div>
          ` : ''}
        </div>
      </div>
      <p><br></p>
    `;
  };

  // Hàm sinh ảnh vector SVG nền trong suốt cho đồ thị hàm số (dự phòng)
  const generateWordGraphSvgDataUrl = (
    formula: string,
    xMinNum: number,
    xMaxNum: number,
    yMinNum: number,
    yMaxNum: number,
    xLabel: string = 'x',
    yLabel: string = 'y',
    cleanFormulaForTikz?: string,
    varName: string = 'x',
    extremaList: Array<{ x: number; y: number }> = [],
    unitX: number = 1,
    unitY: number = 1,
    showAxisLabels: boolean = true,
    showOriginLabel: boolean = true,
    showExtremaLabels: boolean = true
  ): string => {
    const userFontSize = parseInt(fontSize, 10) || 16;
    const svgXml = generateWordGraphSvg(formula, xMinNum, xMaxNum, yMinNum, yMaxNum, xLabel, yLabel, cleanFormulaForTikz, varName, extremaList, 'data-url-graph', userFontSize, unitX, unitY, showAxisLabels, showOriginLabel, showExtremaLabels);
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgXml);
  };

  // Hàm tự động giải và bóc tách bảng biến thiên từ công thức hàm số (Nhập hàm số tự động)
  const solveFunctionForBbt = (formulaRaw: string): {
    success: boolean;
    xPoints: string;
    yPrimeSigns: string;
    yValues: string;
    description: string;
    varName: string;
    funcRow: string;
    derivRow: string;
  } => {
    const str = (formulaRaw || '').trim();
    if (!str) return {
      success: false,
      xPoints: '',
      yPrimeSigns: '',
      yValues: '',
      description: 'Vui lòng nhập công thức',
      varName: 'x',
      funcRow: 'y',
      derivRow: "y'"
    };

    let funcName = 'y';
    let varName = 'x';
    let funcRow = 'y';
    let derivRow = "y'";
    let expr = str;

    // 1. Dạng f(x) = ... hoặc y(t) = ... hoặc s(t) = ...
    const funcParenMatch = str.match(/^([a-zA-Z_]\w*)\s*\(\s*([a-zA-Z_]\w*)\s*\)\s*=\s*(.+)$/);
    if (funcParenMatch) {
      funcName = funcParenMatch[1];
      varName = funcParenMatch[2];
      funcRow = `${funcName}(${varName})`;
      derivRow = `${funcName}'(${varName})`;
      expr = funcParenMatch[3];
    } else {
      // 2. Dạng y = ... hoặc s = ... hoặc v = ...
      const eqMatch = str.match(/^([a-zA-Z_]\w*)\s*=\s*(.+)$/);
      if (eqMatch) {
        funcName = eqMatch[1];
        expr = eqMatch[2];
        funcRow = funcName;
        derivRow = `${funcName}'`;
      }
      // Dò tìm tên biến xuất hiện trong vế phải expr (loại trừ các từ khóa hàm toán: sqrt, dfrac, frac, sin, cos, tan, cot, log, ln, exp, pi...)
      const cleanExpr = expr.replace(/\\?(?:dfrac|frac|sqrt|sin|cos|tan|cot|ln|log|exp|pi|theta)\b/gi, '');
      const letters = cleanExpr.match(/[a-zA-Z]/g);
      if (letters) {
        const candidates = letters.filter(v => v.toLowerCase() !== funcName.toLowerCase());
        if (candidates.length > 0) {
          varName = candidates[0];
        }
      }
    }

    // Chuẩn hóa biểu thức về biến x để các hàm parsePoly và tính toán đại số xử lý đồng nhất 100%
    let f = expr.replace(/\s+/g, '');
    if (varName !== 'x') {
      const varRegex = new RegExp(`(?<![a-zA-Z])${varName}(?![a-zA-Z])`, 'g');
      f = f.replace(varRegex, 'x');
    }

    const toTex = (val: number): string => {
      if (Math.abs(val - Math.round(val)) < 1e-4) return `${Math.round(val)}`;
      const sign = val < 0 ? '-' : '';
      const absVal = Math.abs(val);

      // 1. Ưu tiên kiểm tra căn thuần: c * \sqrt{k} hoặc \dfrac{c\sqrt{k}}{d} (ví dụ: \sqrt{2}, 2\sqrt{2}, \dfrac{\sqrt{2}}{2}, \sqrt{3}, \sqrt{5}...)
      const rads = [2, 3, 5, 6, 7, 10, 11, 13, 14, 15, 17, 19, 21];
      for (const k of rads) {
        const sqrtK = Math.sqrt(k);
        for (let d = 1; d <= 12; d++) {
          const c = Math.round((absVal * d) / sqrtK);
          if (c >= 1 && c <= 20) {
            if (Math.abs(absVal - (c * sqrtK) / d) < 1e-4) {
              const cPart = c === 1 ? '' : `${c}`;
              if (d === 1) {
                return `${sign}${cPart}\\sqrt{${k}}`;
              } else {
                return `${sign}\\dfrac{${cPart}\\sqrt{${k}}}{${d}}`;
              }
            }
          }
        }
      }

      // 2. Kiểm tra căn dạng (u +- c*sqrt(k)) / d (ví dụ: \dfrac{1 - \sqrt{5}}{2}, 1 + \sqrt{2}, -2 + \sqrt{3}...)
      for (const k of [2, 3, 5, 6, 7]) {
        const sqrtK = Math.sqrt(k);
        for (let d = 1; d <= 6; d++) {
          for (let u = -15; u <= 15; u++) {
            for (let c = 1; c <= 8; c++) {
              const cPart = c === 1 ? '' : `${c}`;
              // u + c*sqrt(k) / d
              const vPlus = (u + c * sqrtK) / d;
              if (Math.abs(val - vPlus) < 1e-4) {
                const top = (u === 0 ? '' : `${u} + `) + `${cPart}\\sqrt{${k}}`;
                return d === 1 ? top : `\\dfrac{${top}}{${d}}`;
              }
              // u - c*sqrt(k) / d
              const vMinus = (u - c * sqrtK) / d;
              if (Math.abs(val - vMinus) < 1e-4) {
                const top = (u === 0 ? '-' : `${u} - `) + `${cPart}\\sqrt{${k}}`;
                return d === 1 ? top : `\\dfrac{${top}}{${d}}`;
              }
            }
          }
        }
      }

      // 3. Ưu tiên phân số hữu tỉ p / q (ví dụ: \dfrac{1}{2}, \dfrac{3}{4}, -\dfrac{5}{3}...)
      for (let q = 2; q <= 80; q++) {
        const p = Math.round(absVal * q);
        if (Math.abs(absVal - p / q) < 1e-4) {
          return `${sign}\\dfrac{${p}}{${q}}`;
        }
      }

      return `${Number(val.toFixed(2))}`;
    };

    // Hàm phân tích đa thức 1 biến x bậc đến 4
    const parsePoly = (exprStr: string) => {
      let s = exprStr.trim().replace(/^y\s*=\s*/i, '').replace(/\s+/g, '');
      s = s.replace(/-/g, '+-');
      if (s.startsWith('+')) s = s.substring(1);
      const terms = s.split('+').filter(Boolean);
      const coeffs: { [key: number]: number } = { 4: 0, 3: 0, 2: 0, 1: 0, 0: 0 };
      for (const t of terms) {
        const m = t.match(/^([+-]?\d*(?:\.\d+)?)?\*?x(?:\^(\d+))?$/i);
        if (m) {
          const cStr = m[1];
          const coef = (cStr === '' || cStr === '+' || !cStr) ? 1 : (cStr === '-' ? -1 : parseFloat(cStr));
          const deg = m[2] ? parseInt(m[2], 10) : 1;
          if (deg in coeffs) coeffs[deg] += coef;
        } else {
          const numMatch = t.match(/^([+-]?\d+(?:\.\d+)?)$/);
          if (numMatch) {
            coeffs[0] += parseFloat(numMatch[1]);
          }
        }
      }
      return coeffs;
    };

    // 1. Phân thức hữu tỉ: Phân thức bậc 1/1, Bậc 2/1, Bậc 2/2
    const fracParts = f.split('/');
    if (fracParts.length === 2) {
      const numClean = fracParts[0].replace(/^\(|\)$/g, '');
      const denClean = fracParts[1].replace(/^\(|\)$/g, '');
      const pNum = parsePoly(numClean);
      const pDen = parsePoly(denClean);

      // 1.1 Phân thức bậc 1 / bậc 1: (ax+b)/(cx+d)
      if (pNum[4] === 0 && pNum[3] === 0 && pNum[2] === 0 && pDen[4] === 0 && pDen[3] === 0 && pDen[2] === 0 && pDen[1] !== 0) {
        const a = pNum[1];
        const b = pNum[0];
        const c = pDen[1];
        const d = pDen[0];

        const x0 = -d / c;
        const det = a * d - b * c;
        const y0 = a / c;
        const x0Tex = toTex(x0);
        const y0Tex = toTex(y0);

        if (det > 0) {
          return {
            success: true,
            xPoints: `-\\infty, ${x0Tex}, +\\infty`,
            yPrimeSigns: `, +, ||, +, `,
            yValues: `-/ ${y0Tex}, +D-/ +\\infty / -\\infty, +/ ${y0Tex}`,
            description: `Hàm phân thức đồng biến trên từng khoảng xác định (Tiệm cận đứng ${varName} = ${x0Tex}, Tiệm cận ngang ${funcRow} = ${y0Tex})`,
            varName,
            funcRow,
            derivRow
          };
        } else if (det < 0) {
          return {
            success: true,
            xPoints: `-\\infty, ${x0Tex}, +\\infty`,
            yPrimeSigns: `, -, ||, -, `,
            yValues: `+/ ${y0Tex}, -D+/ -\\infty / +\\infty, -/ ${y0Tex}`,
            description: `Hàm phân thức nghịch biến trên từng khoảng xác định (Tiệm cận đứng ${varName} = ${x0Tex}, Tiệm cận ngang ${funcRow} = ${y0Tex})`,
            varName,
            funcRow,
            derivRow
          };
        }
      }

      // 1.2 Phân thức bậc 2 / bậc 1: (a2*x^2 + a1*x + a0) / (b1*x + b0)
      if (pNum[2] !== 0 && pDen[2] === 0 && pDen[1] !== 0) {
        const a2 = pNum[2], a1 = pNum[1], a0 = pNum[0];
        const b1 = pDen[1], b0 = pDen[0];

        const x0 = -b0 / b1;
        const x0Tex = toTex(x0);

        // Tử số đạo hàm g(x) = (2a2*x + a1)*(b1*x + b0) - b1*(a2*x^2 + a1*x + a0) = a2*b1*x^2 + 2*a2*b0*x + (a1*b0 - a0*b1)
        const A = a2 * b1;
        const Bprime = a2 * b0;
        const C = a1 * b0 - a0 * b1;
        const deltaPrime = Bprime * Bprime - A * C;

        if (deltaPrime > 1e-6) {
          let r1 = (-Bprime - Math.sqrt(deltaPrime)) / A;
          let r2 = (-Bprime + Math.sqrt(deltaPrime)) / A;
          if (r1 > r2) { const tmp = r1; r1 = r2; r2 = tmp; }

          const fVal = (x: number) => (a2 * x * x + a1 * x + a0) / (b1 * x + b0);
          const y1 = fVal(r1);
          const y2 = fVal(r2);

          const r1Tex = toTex(r1);
          const r2Tex = toTex(r2);
          const y1Tex = toTex(y1);
          const y2Tex = toTex(y2);

          if (A > 0) {
            // A > 0: Đồng biến ngoài, nghịch biến trong (r1 cực đại, r2 cực tiểu)
            return {
              success: true,
              xPoints: `-\\infty, ${r1Tex}, ${x0Tex}, ${r2Tex}, +\\infty`,
              yPrimeSigns: `, +, 0, -, ||, -, 0, +, `,
              yValues: `-/ -\\infty, +/ ${y1Tex}, -D+/ -\\infty / +\\infty, -/ ${y2Tex}, +/ +\\infty`,
              description: `Hàm phân thức bậc 2/1 có 2 cực trị: Cực đại tại (${r1Tex}; ${y1Tex}), Cực tiểu tại (${r2Tex}; ${y2Tex}), Tiệm cận đứng ${varName} = ${x0Tex}`,
              varName,
              funcRow,
              derivRow
            };
          } else {
            // A < 0: Nghịch biến ngoài, đồng biến trong (r1 cực tiểu, r2 cực đại)
            return {
              success: true,
              xPoints: `-\\infty, ${r1Tex}, ${x0Tex}, ${r2Tex}, +\\infty`,
              yPrimeSigns: `, -, 0, +, ||, +, 0, -, `,
              yValues: `+/ +\\infty, -/ ${y1Tex}, +D-/ +\\infty / -\\infty, +/ ${y2Tex}, -/ -\\infty`,
              description: `Hàm phân thức bậc 2/1 có 2 cực trị: Cực tiểu tại (${r1Tex}; ${y1Tex}), Cực đại tại (${r2Tex}; ${y2Tex}), Tiệm cận đứng ${varName} = ${x0Tex}`,
              varName,
              funcRow,
              derivRow
            };
          }
        } else {
          // deltaPrime <= 0: Không có cực trị
          if (A > 0) {
            return {
              success: true,
              xPoints: `-\\infty, ${x0Tex}, +\\infty`,
              yPrimeSigns: `, +, ||, +, `,
              yValues: `-/ -\\infty, +D-/ +\\infty / -\\infty, +/ +\\infty`,
              description: `Hàm phân thức bậc 2/1 đồng biến trên từng khoảng xác định, Tiệm cận đứng ${varName} = ${x0Tex}`,
              varName,
              funcRow,
              derivRow
            };
          } else {
            return {
              success: true,
              xPoints: `-\\infty, ${x0Tex}, +\\infty`,
              yPrimeSigns: `, -, ||, -, `,
              yValues: `+/ +\\infty, -D+/ -\\infty / +\\infty, -/ -\\infty`,
              description: `Hàm phân thức bậc 2/1 nghịch biến trên từng khoảng xác định, Tiệm cận đứng ${varName} = ${x0Tex}`,
              varName,
              funcRow,
              derivRow
            };
          }
        }
      }

      // 1.3 Phân thức bậc 2 / bậc 2: (a2*x^2 + a1*x + a0) / (b2*x^2 + b1*x + b0)
      if (pDen[2] !== 0) {
        const a2 = pNum[2], a1 = pNum[1], a0 = pNum[0];
        const b2 = pDen[2], b1 = pDen[1], b0 = pDen[0];

        const fVal = (x: number) => (a2 * x * x + a1 * x + a0) / (b2 * x * x + b1 * x + b0);
        const yHoriz = a2 / b2;
        const yHorizTex = toTex(yHoriz);

        // Mẫu số: tìm điểm gián đoạn
        const deltaDen = b1 * b1 - 4 * b2 * b0;
        const discPoints: number[] = [];
        if (deltaDen > 1e-6) {
          const d1 = (-b1 - Math.sqrt(deltaDen)) / (2 * b2);
          const d2 = (-b1 + Math.sqrt(deltaDen)) / (2 * b2);
          discPoints.push(Math.min(d1, d2), Math.max(d1, d2));
        } else if (Math.abs(deltaDen) <= 1e-6) {
          discPoints.push(-b1 / (2 * b2));
        }

        // Tử số đạo hàm g(x) = (a2*b1 - a1*b2)*x^2 + 2*(a2*b0 - a0*b2)*x + (a1*b0 - a0*b1)
        const Ag = a2 * b1 - a1 * b2;
        const Bg = 2 * (a2 * b0 - a0 * b2);
        const Cg = a1 * b0 - a0 * b1;

        const critPoints: number[] = [];
        if (Math.abs(Ag) > 1e-6) {
          const deltaGPrime = (Bg / 2) * (Bg / 2) - Ag * Cg;
          if (deltaGPrime > 1e-6) {
            const c1 = (-Bg / 2 - Math.sqrt(deltaGPrime)) / Ag;
            const c2 = (-Bg / 2 + Math.sqrt(deltaGPrime)) / Ag;
            critPoints.push(Math.min(c1, c2), Math.max(c1, c2));
          } else if (Math.abs(deltaGPrime) <= 1e-6) {
            critPoints.push(-Bg / (2 * Ag));
          }
        } else if (Math.abs(Bg) > 1e-6) {
          critPoints.push(-Cg / Bg);
        }

        // Gom các mốc đặc biệt
        interface SpecialPoint {
          x: number;
          type: '||' | '0';
        }
        const specList: SpecialPoint[] = [];
        for (const dp of discPoints) specList.push({ x: dp, type: '||' });
        for (const cp of critPoints) {
          if (!discPoints.some(dp => Math.abs(dp - cp) < 1e-4)) {
            specList.push({ x: cp, type: '0' });
          }
        }
        specList.sort((p1, p2) => p1.x - p2.x);

        const xPts = ['-\\infty', ...specList.map(p => toTex(p.x)), '+\\infty'];
        const numIntervals = specList.length + 1;

        // Tính dấu đạo hàm trên từng khoảng
        const intervalSignsArr: string[] = [];
        for (let i = 0; i < numIntervals; i++) {
          let testX: number;
          if (i === 0) {
            testX = specList.length > 0 ? specList[0].x - 1 : 0;
          } else if (i === numIntervals - 1) {
            testX = specList[specList.length - 1].x + 1;
          } else {
            testX = (specList[i - 1].x + specList[i].x) / 2;
          }
          const gVal = Ag * testX * testX + Bg * testX + Cg;
          intervalSignsArr.push(gVal >= 0 ? '+' : '-');
        }

        let yPrimeStr = '';
        for (let i = 0; i < numIntervals; i++) {
          yPrimeStr += `, ${intervalSignsArr[i]}`;
          if (i < specList.length) {
            yPrimeStr += `, ${specList[i].type}`;
          }
        }
        yPrimeStr += ', ';

        // Tính giá trị y trên các mốc
        const yValParts: string[] = [];
        const firstSign = intervalSignsArr[0];
        yValParts.push(`${firstSign === '+' ? '-' : '+'}/ ${yHorizTex}`);

        for (let i = 0; i < specList.length; i++) {
          const sp = specList[i];
          if (sp.type === '0') {
            const yC = fVal(sp.x);
            const prevSign = intervalSignsArr[i];
            const nextSign = intervalSignsArr[i + 1];
            const dir = (prevSign === '+' && nextSign === '-') ? '+' : '-';
            yValParts.push(`${dir}/ ${toTex(yC)}`);
          } else {
            const prevSign = intervalSignsArr[i];
            const nextSign = intervalSignsArr[i + 1];
            const leftLimit = prevSign === '+' ? '+\\infty' : '-\\infty';
            const rightLimit = nextSign === '+' ? '-\\infty' : '+\\infty';
            const leftD = prevSign === '+' ? '+' : '-';
            const rightD = nextSign === '+' ? '-' : '+';
            yValParts.push(`${leftD}D${rightD}/ ${leftLimit} / ${rightLimit}`);
          }
        }

        const lastSign = intervalSignsArr[numIntervals - 1];
        yValParts.push(`${lastSign === '+' ? '+' : '-'}/ ${yHorizTex}`);

        return {
          success: true,
          xPoints: xPts.join(', '),
          yPrimeSigns: yPrimeStr,
          yValues: yValParts.join(', '),
          description: `Hàm phân thức bậc 2/2 (Tiệm cận ngang ${funcRow} = ${yHorizTex}${discPoints.length > 0 ? `, Tiệm cận đứng: ${discPoints.map(d => varName + ' = ' + toTex(d)).join(', ')}` : ', TXĐ: ℝ'})`,
          varName,
          funcRow,
          derivRow
        };
      }
    }

    // 2. Trích xuất đa thức bậc 4, bậc 3, bậc 2, bậc 1
    const p = parsePoly(f);
    const a4 = p[4];
    const a3 = p[3];
    const a2 = p[2];
    const a1 = p[1];
    const a0 = p[0];

    // Bậc 4 trùng phương: a4 * x^4 + a2 * x^2 + a0 (a3 = 0, a1 = 0)
    if (a4 !== 0 && a3 === 0 && a1 === 0) {
      const delta = -a2 / (2 * a4);
      if (delta > 0) {
        const x1 = -Math.sqrt(delta);
        const x3 = Math.sqrt(delta);
        const y1 = a4 * Math.pow(x1, 4) + a2 * Math.pow(x1, 2) + a0;
        const y2 = a0;
        const x1T = toTex(x1);
        const x3T = toTex(x3);
        const y1T = toTex(y1);
        const y2T = toTex(y2);

        if (a4 > 0) {
          return {
            success: true,
            xPoints: `-\\infty, ${x1T}, 0, ${x3T}, +\\infty`,
            yPrimeSigns: `, -, 0, +, 0, -, 0, +, `,
            yValues: `+/ +\\infty, -/ ${y1T}, +/ ${y2T}, -/ ${y1T}, +/ +\\infty`,
            description: `Hàm bậc 4 trùng phương có 3 cực trị: 2 Cực tiểu tại ${varName} = ±${x3T}, 1 Cực đại tại ${varName} = 0`,
            varName,
            funcRow,
            derivRow
          };
        } else {
          return {
            success: true,
            xPoints: `-\\infty, ${x1T}, 0, ${x3T}, +\\infty`,
            yPrimeSigns: `, +, 0, -, 0, +, 0, -, `,
            yValues: `-/ -\\infty, +/ ${y1T}, -/ ${y2T}, +/ ${y1T}, -/ -\\infty`,
            description: `Hàm bậc 4 trùng phương có 3 cực trị: 2 Cực đại tại ${varName} = ±${x3T}, 1 Cực tiểu tại ${varName} = 0`,
            varName,
            funcRow,
            derivRow
          };
        }
      } else {
        const y0T = toTex(a0);
        if (a4 > 0) {
          return {
            success: true,
            xPoints: `-\\infty, 0, +\\infty`,
            yPrimeSigns: `, -, 0, +, `,
            yValues: `+/ +\\infty, -/ ${y0T}, +/ +\\infty`,
            description: `Hàm bậc 4 trùng phương có 1 cực tiểu tại (0; ${y0T})`,
            varName,
            funcRow,
            derivRow
          };
        } else {
          return {
            success: true,
            xPoints: `-\\infty, 0, +\\infty`,
            yPrimeSigns: `, +, 0, -, `,
            yValues: `-/ -\\infty, +/ ${y0T}, -/ -\\infty`,
            description: `Hàm bậc 4 trùng phương có 1 cực đại tại (0; ${y0T})`,
            varName,
            funcRow,
            derivRow
          };
        }
      }
    }

    // Bậc 3: a3 * x^3 + a2 * x^2 + a1 * x + a0
    if (a3 !== 0) {
      const deltaPrime = a2 * a2 - 3 * a3 * a1;
      if (deltaPrime > 0) {
        let r1 = (-a2 - Math.sqrt(deltaPrime)) / (3 * a3);
        let r2 = (-a2 + Math.sqrt(deltaPrime)) / (3 * a3);
        if (r1 > r2) { const tmp = r1; r1 = r2; r2 = tmp; }
        const y1 = a3 * Math.pow(r1, 3) + a2 * Math.pow(r1, 2) + a1 * r1 + a0;
        const y2 = a3 * Math.pow(r2, 3) + a2 * Math.pow(r2, 2) + a1 * r2 + a0;
        const x1T = toTex(r1);
        const x2T = toTex(r2);
        const y1T = toTex(y1);
        const y2T = toTex(y2);

        if (a3 > 0) {
          return {
            success: true,
            xPoints: `-\\infty, ${x1T}, ${x2T}, +\\infty`,
            yPrimeSigns: `, +, 0, -, 0, +, `,
            yValues: `-/ -\\infty, +/ ${y1T}, -/ ${y2T}, +/ +\\infty`,
            description: `Hàm bậc 3 có 2 điểm cực trị: Cực đại tại (${x1T}; ${y1T}), Cực tiểu tại (${x2T}; ${y2T})`,
            varName,
            funcRow,
            derivRow
          };
        } else {
          return {
            success: true,
            xPoints: `-\\infty, ${x1T}, ${x2T}, +\\infty`,
            yPrimeSigns: `, -, 0, +, 0, -, `,
            yValues: `+/ +\\infty, -/ ${y1T}, +/ ${y2T}, -/ -\\infty`,
            description: `Hàm bậc 3 có 2 điểm cực trị: Cực tiểu tại (${x1T}; ${y1T}), Cực đại tại (${x2T}; ${y2T})`,
            varName,
            funcRow,
            derivRow
          };
        }
      } else {
        if (a3 > 0) {
          return {
            success: true,
            xPoints: `-\\infty, +\\infty`,
            yPrimeSigns: `, +, `,
            yValues: `-/ -\\infty, +/ +\\infty`,
            description: `Hàm bậc 3 đồng biến trên toàn ℝ (không có cực trị)`,
            varName,
            funcRow,
            derivRow
          };
        } else {
          return {
            success: true,
            xPoints: `-\\infty, +\\infty`,
            yPrimeSigns: `, -, `,
            yValues: `+/ +\\infty, -/ -\\infty`,
            description: `Hàm bậc 3 nghịch biến trên toàn ℝ (không có cực trị)`,
            varName,
            funcRow,
            derivRow
          };
        }
      }
    }

    // Bậc 2 Parabol: a2 * x^2 + a1 * x + a0
    if (a2 !== 0) {
      const x0 = -a1 / (2 * a2);
      const y0 = a2 * x0 * x0 + a1 * x0 + a0;
      const x0T = toTex(x0);
      const y0T = toTex(y0);

      if (a2 > 0) {
        return {
          success: true,
          xPoints: `-\\infty, ${x0T}, +\\infty`,
          yPrimeSigns: `, -, 0, +, `,
          yValues: `+/ +\\infty, -/ ${y0T}, +/ +\\infty`,
          description: `Hàm bậc 2 Parabol bề lõm quay lên, đỉnh (${x0T}; ${y0T})`,
          varName,
          funcRow,
          derivRow
        };
      } else {
        return {
          success: true,
          xPoints: `-\\infty, ${x0T}, +\\infty`,
          yPrimeSigns: `, +, 0, -, `,
          yValues: `-/ -\\infty, +/ ${y0T}, -/ -\\infty`,
          description: `Hàm bậc 2 Parabol bề lõm quay xuống, đỉnh (${x0T}; ${y0T})`,
          varName,
          funcRow,
          derivRow
        };
      }
    }

    // Bậc 1: a1 * x + a0
    if (a1 !== 0) {
      if (a1 > 0) {
        return {
          success: true,
          xPoints: `-\\infty, +\\infty`,
          yPrimeSigns: `, +, `,
          yValues: `-/ -\\infty, +/ +\\infty`,
          description: `Hàm bậc 1 đồng biến trên toàn ℝ`,
          varName,
          funcRow,
          derivRow
        };
      } else {
        return {
          success: true,
          xPoints: `-\\infty, +\\infty`,
          yPrimeSigns: `, -, `,
          yValues: `+/ +\\infty, -/ -\\infty`,
          description: `Hàm bậc 1 nghịch biến trên toàn ℝ`,
          varName,
          funcRow,
          derivRow
        };
      }
    }

    // Mặc định trả về mẫu cơ bản
    return {
      success: false,
      xPoints: `-\\infty, -1, 1, +\\infty`,
      yPrimeSigns: `, +, 0, -, 0, +, `,
      yValues: `-/ -\\infty, +/ 2, -/ -2, +/ +\\infty`,
      description: `Không tự động nhận diện dạng hàm, vui lòng dùng tab Nhập Tikz-tab`,
      varName,
      funcRow,
      derivRow
    };
  };

  // Hàm tính toán độ rộng chuẩn xác cho Bảng biến thiên tránh bị tràn và xuất hiện thanh trượt ngang
  const calcAutoBbtWidth = (
    safeXPoints: string[],
    colData: Array<{ isDouble: boolean; val?: string; leftVal?: string; rightVal?: string }>,
    intervals: Array<{ hasLeftLimit: boolean; hasRightLimit: boolean }>
  ): number => {
    const N = safeXPoints.length;
    let total = 60; // Cột tiêu đề mốc x, y', y

    for (let i = 0; i < N; i++) {
      const xp = safeXPoints[i] || '';
      const cd = colData[i];
      let ptW = 50;
      if (xp.includes('dfrac') || xp.includes('frac')) ptW = Math.max(ptW, 78);
      else if (xp.includes('sqrt')) ptW = Math.max(ptW, 72);
      else if (xp.length > 5) ptW = Math.max(ptW, 60);

      if (cd) {
        if (cd.isDouble) {
          ptW = Math.max(ptW, 32); // Cột dấu hai gạch mỏng
        } else {
          const yVal = cd.val || '';
          if (yVal.includes('dfrac') || yVal.includes('frac')) ptW = Math.max(ptW, 82);
          else if (yVal.includes('sqrt')) ptW = Math.max(ptW, 76);
          else if (yVal.length > 5) ptW = Math.max(ptW, 64);
        }
      }
      total += ptW;
    }

    for (let i = 0; i < N - 1; i++) {
      const inter = intervals[i];
      let intW = 76;
      if (inter && (inter.hasLeftLimit || inter.hasRightLimit)) {
        intW = (inter.hasLeftLimit && inter.hasRightLimit) ? 116 : 96;
      }
      total += intW;
    }

    total += 32; // Đệm biên chống co tràn
    return Math.max(480, total);
  };

  // Hàm sinh HTML Bảng biến thiên TikZ-Tab với KaTeX và cột thẳng hàng 100% (nền trong suốt, chuẩn sách giáo khoa)
  const generateWordBbtHtml = (
    xPointsStr: string,
    yPrimeSignsStr: string,
    yValuesStr: string,
    bbtIdParam?: string,
    formulaParam?: string,
    modeParam?: 'function' | 'manual',
    widthParam?: number,
    alignParam?: 'left' | 'center' | 'right',
    varNameParam?: string,
    funcRowParam?: string,
    derivRowParam?: string
  ): string => {
    const isTeacher = isTeacherOrHigher(currentRole);
    const bbtId = bbtIdParam || `bbt-${Math.random().toString(36).substring(2, 8)}`;
    const align = alignParam || 'center';

    // Tự động xác định tên biến và tên hàm nếu chưa truyền
    let varName = varNameParam;
    let funcRow = funcRowParam;
    let derivRow = derivRowParam;
    if (!varName || !funcRow || !derivRow) {
      if (formulaParam) {
        const solved = solveFunctionForBbt(formulaParam);
        varName = varName || solved.varName || 'x';
        funcRow = funcRow || solved.funcRow || 'y';
        derivRow = derivRow || solved.derivRow || "y'";
      } else {
        varName = varName || 'x';
        funcRow = funcRow || 'y';
        derivRow = derivRow || "y'";
      }
    }

    const renderKatex = (str: string) => {
      const clean = (str || '').replace(/^\$|\$$/g, '').trim();
      if (!clean) return '';
      try {
        return katex.renderToString(clean, { displayMode: false, throwOnError: false });
      } catch {
        return clean;
      }
    };

    // 1. Phân tích các mốc x: -\infty, -1, 1, +\infty
    const xPoints = xPointsStr.split(',').map(s => s.trim()).filter(Boolean);
    const safeXPoints = xPoints.length > 0 ? xPoints : ['-\\infty', '-1', '1', '+\\infty'];
    const N = safeXPoints.length;

    // 2. Phân tích yPrimeSigns
    const rawSigns = yPrimeSignsStr.split(',').map(s => s.trim());
    const intervalSigns: string[] = [];
    const pointSigns: string[] = [];
    const nonEmpties = rawSigns.filter(s => s !== '');

    if (nonEmpties.length === 2 * N - 3) {
      for (let i = 0; i < N; i++) {
        if (i === 0 || i === N - 1) {
          pointSigns.push('');
        } else {
          pointSigns.push(nonEmpties[2 * i - 1] || '0');
        }
      }
      for (let i = 0; i < N - 1; i++) {
        intervalSigns.push(nonEmpties[2 * i] || '+');
      }
    } else if (nonEmpties.length === N - 1) {
      for (let i = 0; i < N; i++) {
        pointSigns.push(i === 0 || i === N - 1 ? '' : '0');
      }
      for (let i = 0; i < N - 1; i++) {
        intervalSigns.push(nonEmpties[i] || '+');
      }
    } else if (rawSigns.length >= 2 * N - 1) {
      for (let i = 0; i < N; i++) {
        if (i === 0 || i === N - 1) {
          pointSigns.push('');
        } else {
          pointSigns.push(rawSigns[2 * i] || '0');
        }
      }
      for (let i = 0; i < N - 1; i++) {
        intervalSigns.push(rawSigns[2 * i + 1] || '+');
      }
    } else {
      for (let i = 0; i < N; i++) {
        pointSigns.push(i === 0 || i === N - 1 ? '' : '0');
      }
      for (let i = 0; i < N - 1; i++) {
        intervalSigns.push(i % 2 === 0 ? '+' : '-');
      }
    }

    // 3. Phân tích yValues: hỗ trợ cả đa thức và phân thức chứa || hoặc +D-/
    const rawYParts = yValuesStr.split(',').map(s => s.trim()).filter(Boolean);
    const colData: Array<{ isDouble: boolean; dir?: '+' | '-'; val?: string; leftDir?: '+' | '-'; leftVal?: string; rightDir?: '+' | '-'; rightVal?: string }> = [];

    for (let i = 0; i < N; i++) {
      const raw = rawYParts[i] || '';
      const isDbl = (pointSigns[i] === '||') || raw.includes('||') || raw.includes('D');
      if (isDbl) {
        let leftDir: '+' | '-' = '+', leftVal = '+\\infty', rightDir: '+' | '-' = '-', rightVal = '-\\infty';
        if (raw.includes('||')) {
          const sides = raw.split('||');
          const sL = sides[0].trim().split('/');
          const sR = sides[1].trim().split('/');
          leftDir = (sL[0].trim() === '-' ? '-' : '+');
          leftVal = sL.slice(1).join('/').trim() || '+\\infty';
          rightDir = (sR[0].trim() === '+' ? '+' : '-');
          rightVal = sR.slice(1).join('/').trim() || '-\\infty';
        } else if (raw.includes('D')) {
          const m = raw.match(/^([+-])D([+-])\s*\/\s*([^/]+)\s*\/\s*(.+)$/);
          if (m) {
            leftDir = m[1] as '+' | '-';
            rightDir = m[2] as '+' | '-';
            leftVal = m[3].trim();
            rightVal = m[4].trim();
          }
        }
        colData.push({ isDouble: true, leftDir, leftVal, rightDir, rightVal });
      } else {
        const segs = raw.split('/');
        let dir: '+' | '-' = (segs[0].trim() === '+' ? '+' : '-');
        let val = segs.length >= 2 ? segs.slice(1).join('/').trim() : raw;
        if (!val) {
          const isHigh = i % 2 === 1;
          dir = isHigh ? '+' : '-';
          val = safeXPoints[i] === '-\\infty' ? '-\\infty' : safeXPoints[i] === '+\\infty' ? '+\\infty' : '0';
        }
        colData.push({ isDouble: false, dir, val });
      }
    }

    // Hàm giải mã giá trị số hoặc vô cực từ chuỗi KaTeX/LaTeX để so sánh độ lớn tại 2 mút
    const parseNumericValue = (str: string): number => {
      if (!str) return NaN;
      const s = str.trim().replace(/^\$|\$$/g, '');
      if (s.includes('+\\infty') || s.includes('+infty') || s === '\\infty' || s === 'infty') return Infinity;
      if (s.includes('-\\infty') || s.includes('-infty')) return -Infinity;

      if (s.startsWith('\\dfrac{') || s.startsWith('\\frac{')) {
        const startIdx = s.indexOf('{');
        let depth = 1;
        let midIdx = -1;
        for (let i = startIdx + 1; i < s.length; i++) {
          if (s[i] === '{') depth++;
          else if (s[i] === '}') {
            depth--;
            if (depth === 0) {
              midIdx = i;
              break;
            }
          }
        }
        if (midIdx !== -1 && s[midIdx + 1] === '{' && s.endsWith('}')) {
          const numStr = s.substring(startIdx + 1, midIdx);
          const denStr = s.substring(midIdx + 2, s.length - 1);
          const num = parseNumericValue(numStr);
          const den = parseNumericValue(denStr);
          if (!isNaN(num) && !isNaN(den) && den !== 0) return num / den;
        }
      }

      const sqrtM = s.match(/^([+-]?\d*(?:\.\d+)?)?\\sqrt\{(\d+)\}$/);
      if (sqrtM) {
        const cStr = sqrtM[1];
        const coef = (cStr === '' || cStr === '+' || !cStr) ? 1 : (cStr === '-' ? -1 : parseFloat(cStr));
        const k = parseFloat(sqrtM[2]);
        return coef * Math.sqrt(k);
      }

      const exprM = s.match(/^([+-]?\d+(?:\.\d+)?)\s*([+-])\s*(\d*)?\\sqrt\{(\d+)\}$/);
      if (exprM) {
        const u = parseFloat(exprM[1]);
        const op = exprM[2] === '-' ? -1 : 1;
        const c = exprM[3] ? parseFloat(exprM[3]) : 1;
        const k = parseFloat(exprM[4]);
        return u + op * c * Math.sqrt(k);
      }

      const p = parseFloat(s);
      return isNaN(p) ? NaN : p;
    };

    const intervals: Array<{ startDir: '+' | '-'; startVal: string; endDir: '+' | '-'; endVal: string; isGoingUp: boolean; hasLeftLimit: boolean; hasRightLimit: boolean }> = [];
    for (let i = 0; i < N - 1; i++) {
      const leftCol = colData[i] || { isDouble: false, dir: '-', val: '0' };
      const rightCol = colData[i + 1] || { isDouble: false, dir: '+', val: '0' };

      const startDir = (leftCol.isDouble ? leftCol.rightDir : leftCol.dir) || '-';
      const startVal = (leftCol.isDouble ? leftCol.rightVal : leftCol.val) || '0';

      const endDir = (rightCol.isDouble ? rightCol.leftDir : rightCol.dir) || '+';
      const endVal = (rightCol.isDouble ? rightCol.leftVal : rightCol.val) || '0';

      // QUY TẮC XÁC ĐỊNH MŨI TÊN ĐI LÊN HAY ĐI XUỐNG:
      // 1. Dựa vào dấu của đạo hàm trên mỗi khoảng (intervalSigns[i])
      // 2. Hoặc dựa vào giá trị tại 2 mút (startVal vs endVal)
      const sign = (intervalSigns[i] || '').trim();
      const numStart = parseNumericValue(startVal);
      const numEnd = parseNumericValue(endVal);
      const hasNumericCompare = !isNaN(numStart) && !isNaN(numEnd) && numStart !== numEnd;

      let isGoingUp: boolean;
      if (sign === '+' || sign === '+/') {
        // Dấu đạo hàm dương -> Đồng biến -> Mũi tên đi lên
        isGoingUp = true;
      } else if (sign === '-' || sign === '-/') {
        // Dấu đạo hàm âm -> Nghịch biến -> Mũi tên đi xuống
        isGoingUp = false;
      } else if (hasNumericCompare) {
        // So sánh 2 mút: mút trái < mút phải -> đi lên; mút trái > mút phải -> đi xuống
        isGoingUp = numStart < numEnd;
      } else if (startDir === '-' && endDir === '+') {
        isGoingUp = true;
      } else if (startDir === '+' && endDir === '-') {
        isGoingUp = false;
      } else {
        isGoingUp = (i % 2 === 0);
      }

      intervals.push({
        startDir: isGoingUp ? '-' : '+',
        startVal,
        endDir: isGoingUp ? '+' : '-',
        endVal,
        isGoingUp,
        hasLeftLimit: !!leftCol.isDouble,
        hasRightLimit: !!rightCol.isDouble
      });
    }

    // Tính toán độ rộng đủ cho bảng biến thiên để không bao giờ bị tràn và không xuất hiện thanh trượt ngang
    const autoWidth = calcAutoBbtWidth(safeXPoints, colData, intervals);
    const initialWidth = widthParam ? Math.max(widthParam, autoWidth) : autoWidth;

    const marginStyle = align === 'left' ? 'margin-left: 0; margin-right: auto;' : align === 'right' ? 'margin-left: auto; margin-right: 0;' : 'margin-left: auto; margin-right: auto;';

    // Xây dựng Table HTML theo cấu trúc cột lưới chuẩn: Mỗi mốc (x, y', y) chung 1 cột dọc tuyệt đối!
    let xCellsHtml = '';
    let yPrimeCellsHtml = '';
    let yCellsHtml = '';

    for (let i = 0; i < N; i++) {
      const xp = safeXPoints[i];
      const isLast = i === N - 1;
      const cData = colData[i] || { isDouble: false, dir: '-', val: '' };

      // Row 1: x point cell
      xCellsHtml += `<td style="padding: 6px 12px; text-align: center; font-weight: 500; color: #0f172a; border-bottom: 1.5px solid #1e293b; white-space: nowrap; min-width: 44px;">${renderKatex(xp)}</td>`;

      // Row 2: y' point cell
      const pSign = pointSigns[i] || '';
      const pSignHtml = (pSign === '||' || cData.isDouble)
        ? `<span style="display: inline-block; border-left: 1.5px solid #1e293b; border-right: 1.5px solid #1e293b; width: 4px; height: 18px; vertical-align: middle;"></span>`
        : pSign === '0'
        ? `<span style="font-weight: bold; color: #0f172a; font-size: 14px;">0</span>`
        : pSign ? `<span style="font-weight: bold; color: #0f172a;">${renderKatex(pSign)}</span>` : '';

      yPrimeCellsHtml += `<td style="padding: 6px 8px; text-align: center; border-bottom: 1.5px solid #1e293b; color: #0f172a; font-weight: bold; min-width: 44px; white-space: nowrap;">${pSignHtml}</td>`;

      // Row 3: y point cell
      if (cData.isDouble) {
        yCellsHtml += `<td style="padding: 0 4px; text-align: center; vertical-align: middle; color: #0f172a; font-weight: 600; min-width: 24px; height: 75px; box-sizing: border-box; white-space: nowrap;"><div style="display: inline-block; border-left: 1.5px solid #1e293b; border-right: 1.5px solid #1e293b; width: 4px; height: 75px; vertical-align: middle;"></div></td>`;
      } else {
        // Vị trí trên/dưới của giá trị y tại mốc x_i:
        // Tự động suy ra từ chiều mũi tên của các khoảng lân cận để luôn khớp tuyệt đối với đầu/đuôi mũi tên
        let isTop = cData.dir === '+';
        if (i === 0 && intervals[0]) {
          isTop = !intervals[0].isGoingUp;
        } else if (i === N - 1 && intervals[N - 2]) {
          isTop = intervals[N - 2].isGoingUp;
        } else if (intervals[i - 1] && intervals[i]) {
          if (intervals[i - 1].isGoingUp && !intervals[i].isGoingUp) {
            isTop = true; // Cực đại: lên rồi xuống -> đỉnh trên
          } else if (!intervals[i - 1].isGoingUp && intervals[i].isGoingUp) {
            isTop = false; // Cực tiểu: xuống rồi lên -> đáy dưới
          } else {
            isTop = intervals[i - 1].isGoingUp;
          }
        }

        yCellsHtml += `<td style="padding: 4px 8px; text-align: center; ${isTop ? 'vertical-align: top; padding-top: 8px;' : 'vertical-align: bottom; padding-bottom: 8px;'}; color: #0f172a; font-weight: 600; min-width: 44px; height: 75px; box-sizing: border-box; white-space: nowrap;">${renderKatex(cData.val || '')}</td>`;
      }

      // Khoảng giữa 2 mốc
      if (!isLast) {
        xCellsHtml += `<td style="padding: 6px 4px; min-width: 60px; border-bottom: 1.5px solid #1e293b;"></td>`;

        const iSign = intervalSigns[i] || '+';
        const col = iSign === '+' ? '#15803d' : iSign === '-' ? '#dc2626' : '#0f172a';
        const sym = iSign === '-' ? '&minus;' : iSign;
        yPrimeCellsHtml += `<td style="padding: 6px 8px; text-align: center; border-bottom: 1.5px solid #1e293b; font-weight: bold; min-width: 60px;"><span style="color: ${col}; font-size: 16px; font-weight: bold;">${sym}</span></td>`;

        const inter = intervals[i] || { isGoingUp: true, hasLeftLimit: false, hasRightLimit: false, startDir: '-', startVal: '', endDir: '+', endVal: '' };

        yCellsHtml += `
          <td style="padding: 0 4px; text-align: center; vertical-align: middle; min-width: 75px; height: 75px; box-sizing: border-box; position: relative;">
            ${inter.hasLeftLimit ? `
              <div style="position: absolute; left: 2px; ${inter.startDir === '+' ? 'top: 6px;' : 'bottom: 6px;'}; font-weight: 600; color: #0f172a; font-size: 13px; z-index: 2; white-space: nowrap;">
                ${renderKatex(inter.startVal)}
              </div>
            ` : ''}
            ${inter.hasRightLimit ? `
              <div style="position: absolute; right: 2px; ${inter.endDir === '+' ? 'top: 6px;' : 'bottom: 6px;'}; font-weight: 600; color: #0f172a; font-size: 13px; z-index: 2; white-space: nowrap;">
                ${renderKatex(inter.endVal)}
              </div>
            ` : ''}
            <svg style="width: 100%; height: 68px; display: block; overflow: visible;" viewBox="0 0 100 68" preserveAspectRatio="none">
              <defs>
                <marker id="${bbtId}-arr-${i}" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                  <polygon points="0 0, 6 3, 0 6" fill="#0f172a" />
                </marker>
              </defs>
              ${inter.isGoingUp ? `
                <line x1="${inter.hasLeftLimit ? 28 : 4}" y1="56" x2="${inter.hasRightLimit ? 72 : 94}" y2="12" stroke="#0f172a" stroke-width="1.8" marker-end="url(#${bbtId}-arr-${i})" />
              ` : `
                <line x1="${inter.hasLeftLimit ? 28 : 4}" y1="12" x2="${inter.hasRightLimit ? 72 : 94}" y2="56" stroke="#0f172a" stroke-width="1.8" marker-end="url(#${bbtId}-arr-${i})" />
              `}
            </svg>
          </td>
        `;
      }
    }

    return `
      <div class="word-bbt-wrapper relative my-3 group" contenteditable="false" draggable="${isTeacher ? 'true' : 'false'}" data-bbt-id="${bbtId}" data-formula="${encodeURIComponent(formulaParam || '')}" data-xpoints="${encodeURIComponent(xPointsStr)}" data-yprimesigns="${encodeURIComponent(yPrimeSignsStr)}" data-yvalues="${encodeURIComponent(yValuesStr)}" data-mode="${modeParam || 'manual'}" data-width="${initialWidth}" data-align="${align}" data-varname="${encodeURIComponent(varName)}" data-funcrow="${encodeURIComponent(funcRow)}" data-derivrow="${encodeURIComponent(derivRow)}" style="text-align: ${align}; margin: 16px auto; background: transparent; border: 1.5px dashed transparent; position: relative; max-width: ${initialWidth}px; width: 100%; display: block; user-select: none; ${marginStyle}" ${isTeacher ? `onmouseover="this.style.borderColor='#94a3b8'" onmouseout="this.style.borderColor='transparent'"` : ''}>
        ${isTeacher ? `
          <div class="word-bbt-controls opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none group-hover:pointer-events-auto flex items-center justify-between gap-1.5 px-2.5 py-1 mb-1 rounded-lg bg-white/95 backdrop-blur-xs border border-slate-200 shadow-sm text-xs" style="user-select: none;">
            <div class="flex items-center gap-1.5">
              <button type="button" class="edit-bbt-btn text-emerald-600 hover:text-emerald-800 font-bold px-2 py-0.5 rounded hover:bg-emerald-50 flex items-center gap-1 text-[11px] cursor-pointer" title="Mở lại cửa sổ để chỉnh sửa hoặc đổi hàm số cho bảng biến thiên này">
                ✏️ Sửa BBT
              </button>
            </div>
            <div class="flex items-center gap-1">
              <span class="text-[10px] text-slate-400 font-medium hidden sm:inline">↔ Co giãn:</span>
              <button type="button" class="bbt-size-btn px-1.5 py-0.5 rounded text-slate-600 hover:bg-slate-100 text-[10px] font-bold cursor-pointer" data-size-action="decrease" title="Thu nhỏ BBT">-10%</button>
              <button type="button" class="bbt-size-btn px-1.5 py-0.5 rounded text-slate-600 hover:bg-slate-100 text-[10px] font-bold cursor-pointer" data-size-action="increase" title="Phóng to BBT">+10%</button>
              <span class="text-slate-300">|</span>
              <button type="button" class="bbt-align-btn px-1.5 py-0.5 rounded ${align === 'left' ? 'text-slate-700 bg-slate-100 font-bold' : 'text-slate-500'} hover:bg-slate-100 text-[10px] cursor-pointer" data-align="left" title="Căn trái">⫷ Trái</button>
              <button type="button" class="bbt-align-btn px-1.5 py-0.5 rounded ${align === 'center' ? 'text-slate-700 bg-slate-100 font-bold' : 'text-slate-500'} text-[10px] cursor-pointer" data-align="center" title="Căn giữa">═ Giữa</button>
              <button type="button" class="bbt-align-btn px-1.5 py-0.5 rounded ${align === 'right' ? 'text-slate-700 bg-slate-100 font-bold' : 'text-slate-500'} text-[10px] cursor-pointer" data-align="right" title="Căn phải">⫸ Phải</button>
              <span class="text-slate-300">|</span>
              <button type="button" class="delete-graph-btn text-rose-500 hover:text-rose-700 font-bold px-1.5 py-0.5 rounded hover:bg-rose-50 text-[11px] cursor-pointer" title="Xóa bảng biến thiên này">✕</button>
            </div>
          </div>
        ` : ''}

        <div style="display: block; background: transparent; padding: 2px; width: 100%; overflow-x: auto;">
          <table style="border-collapse: collapse; border: 1.5px solid #1e293b; background: transparent; font-family: serif; font-size: 14px; margin: 0 auto; width: 100%; min-width: 320px; table-layout: auto;">
            <thead>
              <tr style="background: transparent;">
                <th style="padding: 6px 12px; border-right: 1.5px solid #1e293b; border-bottom: 1.5px solid #1e293b; font-style: italic; width: 50px; text-align: center; color: #0f172a; font-weight: bold;">
                  ${renderKatex(varName)}
                </th>
                ${xCellsHtml}
              </tr>
            </thead>
            <tbody>
              <tr style="background: transparent;">
                <td style="padding: 6px 12px; border-right: 1.5px solid #1e293b; border-bottom: 1.5px solid #1e293b; font-style: italic; width: 50px; text-align: center; color: #0f172a; font-weight: bold;">
                  ${renderKatex(derivRow)}
                </td>
                ${yPrimeCellsHtml}
              </tr>
              <tr style="background: transparent;">
                <td style="padding: 10px 12px; border-right: 1.5px solid #1e293b; font-style: italic; width: 50px; text-align: center; vertical-align: middle; color: #0f172a; font-weight: bold;">
                  ${renderKatex(funcRow)}
                </td>
                ${yCellsHtml}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <p><br></p>
    `.trim();
  };

  const handleAutoAlignWordSketch = () => {
    if (wordDrawSketchType === 'graph') {
      setWordSketchRecognizedShape('Đồ thị hàm số liên tục & Trục tọa độ chuẩn');
      setWordSketchGeneratedTikZ(`% Đồ thị TikZ phác thảo tự vẽ:
\\begin{tikzpicture}[scale=0.85, >=stealth]
  \\draw[->,thick] (-3.5,0) -- (3.5,0) node[right] {$x$};
  \\draw[->,thick] (0,-2.5) -- (0,4.5) node[above] {$y$};
  \\draw[domain=-2.2:2.2,smooth,variable=\\x,blue,ultra thick] plot ({\\x},{0.5*\\x*\\x*\\x - \\x});
  \\node at (0,0) [below left] {$O$};
\\end{tikzpicture}`);
    } else {
      setWordSketchRecognizedShape('Bảng biến thiên 3 hàng 4 cột với mũi tên tăng/giảm');
      setWordSketchGeneratedTikZ(`% Bảng biến thiên tikz-tab phác thảo tự vẽ:
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
          title: wordDrawSketchType === 'graph' ? 'Đồ thị TikZ' : 'Bảng biến thiên tikz-tab'
        }
      }));

      // Chèn trực tiếp vào trang soạn thảo Word: Hiển thị đồ thị dạng ảnh SVG nền trong suốt, bỏ chữ chú thích và bỏ hoàn toàn khung viền không xóa được
      if (wordDrawSketchType === 'graph') {
        const sketchSvg = generateWordGraphSvgDataUrl(
          'y = 0.5x^3 - x',
          -3.5,
          3.5,
          -2.5,
          4.5,
          'x',
          'y',
          '0.5*\\x*\\x*\\x - \\x',
          'x',
          [{ x: -1, y: 0.5 }, { x: 1, y: -0.5 }]
        );

        const sketchHtml = `
          <div class="word-graph-wrapper relative my-3 flex justify-center items-center" contenteditable="false" style="text-align: center; margin: 16px 0; background: transparent; border: none; outline: none; position: relative;">
            <img src="${sketchSvg}" alt="Đồ thị hàm số tự vẽ" style="max-width: 380px; width: 100%; height: auto; background: transparent; display: inline-block; vertical-align: middle; cursor: pointer; border: none;" />
            <button type="button" onclick="this.closest('.word-graph-wrapper').remove()" title="Xóa đồ thị này" class="delete-graph-btn" style="position: absolute; top: 2px; right: calc(50% - 190px); background: #ef4444; color: white; border: none; border-radius: 9999px; width: 22px; height: 22px; font-size: 12px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 3px rgba(0,0,0,0.2); opacity: 0.85; transition: opacity 0.2s;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.85'">✕</button>
          </div>
          <p><br></p>
        `;
        insertHtmlToEditor(sketchHtml);
      } else {
        const bbtHtml = generateWordBbtHtml('-\\infty, -1, 1, +\\infty', ', +, 0, -, 0, +, ', '-/ -\\infty, +/ 4, -/ 0, +/ +\\infty');
        insertHtmlToEditor(bbtHtml);
      }

      setNotification({ text: `Đã chèn ${wordDrawSketchType === 'graph' ? 'đồ thị' : 'bảng biến thiên'} trực quan nền trong suốt vào văn bản!`, type: 'success' });
      setTimeout(() => setNotification(null), 4000);
    }
    setShowWordDrawSketchModal(false);
  };

  const handleGenerateWordGraphTikZ = () => {
    const xMinNum = parseFloat(wordGraphXMin) || -2;
    const xMaxNum = parseFloat(wordGraphXMax) || 2;
    const yMinNum = parseFloat(wordGraphYMin) || -2;
    const yMaxNum = parseFloat(wordGraphYMax) || 4;
    const unitXNum = parseFloat(wordGraphUnitX) || 1;
    const unitYNum = parseFloat(wordGraphUnitY) || 1;

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

    // Nếu người dùng nhập tọa độ điểm cụ thể trong yêu cầu
    const pointMatches = wordGraphRequirement.matchAll(/(?:điểm\s+)?(?:[A-Z]\s*)?\(\s*(-?\d+(?:\.\d+)?)\s*[,;]\s*(-?\d+(?:\.\d+)?)\s*\)/gi);
    for (const match of pointMatches) {
      const px = parseFloat(match[1]);
      const py = parseFloat(match[2]);
      if (!isNaN(px) && !isNaN(py)) {
        if (!extremaList.some(e => Math.abs(e.x - px) < 0.1 && Math.abs(e.y - py) < 0.1)) {
          extremaList.push({ x: px, y: py });
        }
      }
    }

    const reqLower = (wordGraphRequirement || '').toLowerCase();
    const hasGiong = reqLower.includes('gióng') || reqLower.includes('giong') || reqLower.includes('tọa độ') || reqLower.includes('đường gióng');
    const isReqRed = reqLower.includes('đỏ') || reqLower.includes('red');
    const isReqDashed = reqLower.includes('nét đứt') || reqLower.includes('đứt') || reqLower.includes('dashed');

    // Phân biệt kiểu dáng đường gióng vs đồ thị:
    const isGuidelineRed = hasGiong && isReqRed;
    const guidelineColorTikz = isGuidelineRed ? 'red' : 'gray';

    const isCurveExplicitRed = /đồ thị.*(?:màu\s+)?đỏ|đường cong.*(?:màu\s+)?đỏ|hàm số.*(?:màu\s+)?đỏ/i.test(reqLower) || (isReqRed && !hasGiong);
    const isCurveExplicitDashed = /đồ thị.*(?:nét\s+)?đứt|đường cong.*(?:nét\s+)?đứt|hàm số.*(?:nét\s+)?đứt/i.test(reqLower) || (isReqDashed && !hasGiong);
    const curveColorTikz = isCurveExplicitRed ? 'red' : 'blue';
    const curveDashTikz = isCurveExplicitDashed ? ',dashed' : '';

    // Sinh mã gióng cực trị: vị trí nhãn tránh đè lên trục, đường gióng và đồ thị
    const extremaTikzLines = extremaList.map(e => {
      const xFmt = formatWordCoordinateMath(e.x);
      const yFmt = formatWordCoordinateMath(e.y);
      const xStr = e.x.toString();
      const yStr = e.y.toString();
      const xPos = e.y >= 0 ? 'below' : 'above';
      const yPos = e.x >= 0 ? 'left' : 'right';

      return `  % Gióng tọa độ điểm (${xFmt.raw}, ${yFmt.raw})
  \\draw[dashed, thin, ${guidelineColorTikz}] (${xStr},0) -- (${xStr},${yStr}) -- (0,${yStr});
  \\fill[${guidelineColorTikz === 'red' ? 'red' : 'black'}] (${xStr},${yStr}) circle (1.8pt);
  ${Math.abs(e.x) > 0.1 ? `\\node at (${xStr},0) [${xPos}, font=\\footnotesize${isGuidelineRed ? ', text=red' : ''}] {$${xFmt.tex}$};` : ''}
  ${Math.abs(e.y) > 0.1 ? `\\node at (0,${yStr}) [${yPos}, font=\\footnotesize${isGuidelineRed ? ', text=red' : ''}] {$${yFmt.tex}$};` : ''}`;
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
    \\draw[domain=${xMinNum}:${xMaxNum},smooth,variable=\\${varName},${curveColorTikz}${curveDashTikz},ultra thick] plot ({\\${varName}},{${cleanFormulaForTikz || `\\${varName}*\\${varName} - 1`}});
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

    const wordNumFontSize = parseInt(fontSize, 10) || 16;
    const targetGraphId = editingGraphId || `graph-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    // Tự động tính chiều rộng tỷ lệ phù hợp theo miền x, miền y và đơn vị 2 trục
    const spanX = Math.max(0.2, Math.abs(xMaxNum - xMinNum));
    const spanY = Math.max(0.2, Math.abs(yMaxNum - yMinNum));
    const uX = unitXNum > 0 ? unitXNum : 1;
    const uY = unitYNum > 0 ? unitYNum : 1;
    const baseUnitPx = 48;
    const rawPlotW = spanX * uX * baseUnitPx;
    const rawPlotH = spanY * uY * baseUnitPx;
    let scaleFactor = 1;
    if (rawPlotW > 520) scaleFactor = Math.min(scaleFactor, 520 / rawPlotW);
    if (rawPlotH > 420) scaleFactor = Math.min(scaleFactor, 420 / rawPlotH);
    if (rawPlotW < 220 && rawPlotH < 180) scaleFactor = Math.max(scaleFactor, 220 / Math.max(rawPlotW, 1));
    const autoCalculatedWidth = Math.max(220, Math.min(560, Math.round(spanX * uX * baseUnitPx * scaleFactor + 68)));

    // Bảo tồn kích thước co giãn (width) người dùng đã kéo rê nếu đang sửa đồ thị cũ
    let preservedWidth = autoCalculatedWidth;
    if (editingGraphId && editorRef.current) {
      const existingWrapper = editorRef.current.querySelector(`[data-graph-id="${editingGraphId}"]`) as HTMLElement;
      if (existingWrapper) {
        preservedWidth = parseFloat(existingWrapper.getAttribute('data-width') || '') || autoCalculatedWidth;
      }
    }

    // Chèn hoặc cập nhật đồ thị trực quan (vector SVG nền trong suốt, hỗ trợ co giãn, sửa, di chuyển và kéo số/chữ)
    const customTikzGraphHtml = generateWordGraphWrapperHtml(
      wordGraphFormula,
      xMinNum,
      xMaxNum,
      yMinNum,
      yMaxNum,
      xLabel,
      yLabel,
      cleanFormulaForTikz,
      varName,
      extremaList,
      targetGraphId,
      wordGraphRequirement,
      wordNumFontSize,
      preservedWidth,
      unitXNum,
      unitYNum,
      wordGraphShowAxisLabels,
      wordGraphShowOriginLabel,
      wordGraphShowExtremaLabels
    );

    if (editingGraphId && editorRef.current) {
      const existingWrapper = editorRef.current.querySelector(`[data-graph-id="${editingGraphId}"]`) as HTMLElement;
      if (existingWrapper) {
        const temp = document.createElement('div');
        temp.innerHTML = customTikzGraphHtml.trim();
        const newWrapper = temp.querySelector('.word-graph-wrapper');
        if (newWrapper) {
          existingWrapper.replaceWith(newWrapper);
        } else {
          existingWrapper.outerHTML = customTikzGraphHtml;
        }
        setNotification({ text: `Đã cập nhật lại đồ thị ${wordGraphFormula} thành công!`, type: 'success' });
        setTimeout(() => setNotification(null), 4000);
        setWordGraphOldTikz('');
        setEditingGraphId(null);
        setShowWordGraphModal(false);
        saveCurrentSelection();
        return;
      }
    }

    if (editingGraphId && wordViewMode === 'ppt') {
      let foundInPpt = false;
      setPptWhiteboards((prev) =>
        prev.map((b) => {
          if (!b.htmlItems) return b;
          const hasItem = b.htmlItems.some((it) => it.html.includes(editingGraphId) || it.id === editingGraphId);
          if (hasItem) {
            foundInPpt = true;
            return {
              ...b,
              htmlItems: b.htmlItems.map((it) =>
                it.html.includes(editingGraphId) || it.id === editingGraphId
                  ? { ...it, html: customTikzGraphHtml, title: `Đồ thị ${wordGraphFormula}` }
                  : it
              ),
            };
          }
          return b;
        })
      );
      if (foundInPpt) {
        setNotification({ text: `Đã cập nhật lại đồ thị ${wordGraphFormula} trên slide PPT!`, type: 'success' });
        setTimeout(() => setNotification(null), 4000);
        setWordGraphOldTikz('');
        setEditingGraphId(null);
        setShowWordGraphModal(false);
        return;
      }
    }

    insertHtmlToEditor(customTikzGraphHtml);

    setNotification({ text: `Đã ${wordGraphOldTikz ? 'cập nhật' : 'chèn'} đồ thị ${wordGraphFormula} dạng trực quan nền trong suốt vào tài liệu!`, type: 'success' });
    setTimeout(() => setNotification(null), 4000);
    setWordGraphOldTikz('');
    setEditingGraphId(null);
    setShowWordGraphModal(false);
  };

  const handleGenerateWordBBTTikZ = () => {
    const rawTikzTab = `% Bảng biến thiên tikz-tab (${wordBbtMode === 'function' ? `Hàm số ${wordBbtFormula}` : 'Nhập trực tiếp'}):
\\begin{tikzpicture}
  \\tkzTabInit[lgt=1.5, espcl=2.5]{$${wordBbtVarName}$ /1, $${wordBbtDerivRow}$ /1, $${wordBbtFuncRow}$ /2}{${wordBbtXPoints}}
  \\tkzTabLine{${wordBbtYPrimeSigns}}
  \\tkzTabVar{${wordBbtYValues}}
\\end{tikzpicture}`;

    // Chèn trực tiếp vào câu hỏi đang chọn trong QuestionEditorWord
    window.dispatchEvent(new CustomEvent('app-insert-word-snippet', {
      detail: { code: rawTikzTab, type: 'bbt', title: wordBbtMode === 'function' ? `Bảng biến thiên ${wordBbtFormula}` : 'Bảng biến thiên tikz-tab' }
    }));

    // Lấy kích thước và căn lề hiện tại nếu đang chỉnh sửa BBT cũ
    let preservedWidth: number | undefined = undefined;
    let preservedAlign: 'left' | 'center' | 'right' = 'center';
    const targetBbtId = editingBbtId || `bbt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    if (editingBbtId && editorRef.current) {
      const existingWrapper = editorRef.current.querySelector(`[data-bbt-id="${editingBbtId}"]`) as HTMLElement;
      if (existingWrapper) {
        preservedWidth = parseFloat(existingWrapper.getAttribute('data-width') || '') || undefined;
        preservedAlign = (existingWrapper.getAttribute('data-align') || 'center') as 'left' | 'center' | 'right';
      }
    }

    // Chèn bảng biến thiên trực quan nền trong suốt với KaTeX và mũi tên vector SVG chuẩn
    const bbtHtml = generateWordBbtHtml(
      wordBbtXPoints,
      wordBbtYPrimeSigns,
      wordBbtYValues,
      targetBbtId,
      wordBbtFormula,
      wordBbtMode,
      preservedWidth,
      preservedAlign,
      wordBbtVarName,
      wordBbtFuncRow,
      wordBbtDerivRow
    );

    if (editingBbtId && editorRef.current) {
      const existingWrapper = editorRef.current.querySelector(`[data-bbt-id="${editingBbtId}"]`) as HTMLElement;
      if (existingWrapper) {
        const temp = document.createElement('div');
        temp.innerHTML = bbtHtml.trim();
        const newWrapper = temp.querySelector('.word-bbt-wrapper');
        if (newWrapper) {
          existingWrapper.replaceWith(newWrapper);
        } else {
          existingWrapper.outerHTML = bbtHtml;
        }
        setWordDocumentHtml(editorRef.current.innerHTML);
        setNotification({ text: 'Đã cập nhật lại bảng biến thiên thành công!', type: 'success' });
        setTimeout(() => setNotification(null), 4000);
        setEditingBbtId(null);
        setShowWordBBTModal(false);
        saveCurrentSelection();
        return;
      }
    }

    if (editingBbtId && wordViewMode === 'ppt') {
      let foundInPpt = false;
      setPptWhiteboards((prev) =>
        prev.map((b) => {
          if (!b.htmlItems) return b;
          const hasItem = b.htmlItems.some((it) => it.html.includes(editingBbtId) || it.id === editingBbtId);
          if (hasItem) {
            foundInPpt = true;
            return {
              ...b,
              htmlItems: b.htmlItems.map((it) =>
                it.html.includes(editingBbtId) || it.id === editingBbtId
                  ? { ...it, html: bbtHtml, title: 'Bảng biến thiên' }
                  : it
              ),
            };
          }
          return b;
        })
      );
      if (foundInPpt) {
        setNotification({ text: 'Đã cập nhật lại Bảng biến thiên trên slide PPT!', type: 'success' });
        setTimeout(() => setNotification(null), 4000);
        setEditingBbtId(null);
        setShowWordBBTModal(false);
        return;
      }
    }

    insertHtmlToEditor(bbtHtml);

    setNotification({ text: 'Đã chèn bảng biến thiên trực quan nền trong suốt vào văn bản!', type: 'success' });
    setTimeout(() => setNotification(null), 4000);
    setEditingBbtId(null);
    setShowWordBBTModal(false);
  };

  // Danh mục phân cấp & dropdown quản lý
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [isSidePanelCollapsed, setIsSidePanelCollapsed] = useState<boolean>(false);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [addingLevel, setAddingLevel] = useState<string>('');
  const [newItemText, setNewItemText] = useState<string>('');
  const [addModalType, setAddModalType] = useState<'standard' | 'luyenTap' | 'danhGia'>('standard');
  const [isAddingFolder, setIsAddingFolder] = useState<boolean>(false);
  const [modalAddError, setModalAddError] = useState<string | null>(null);
  const [showMathTypeModal, setShowMathTypeModal] = useState<boolean>(false);
  const [mathModalFormula, setMathModalFormula] = useState<string>('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ level: string; item: string } | null>(null);
  const [isDeletingItem, setIsDeletingItem] = useState<boolean>(false);

  // Danh sách các tùy chọn có thể tự thêm / xóa
  const [titleList, setTitleList] = useState<string[]>([]);
  const [chuongList, setChuongList] = useState<string[]>([]);
  const [baiList, setBaiList] = useState<string[]>([]);
  const [vanDeList, setVanDeList] = useState<string[]>([]);
  const [chuyenDeList, setChuyenDeList] = useState<string[]>([]);
  const [syncingLevel, setSyncingLevel] = useState<'title' | 'chuong' | 'bai' | 'vanDe' | 'chuyenDe' | null>(null);

  useEffect(() => {
    async function load() {
      const cls = await getClasses();
      setClasses(cls);
      const docs = await getTeacherDocuments();
      setDocuments(docs);
      
      const docTitlesFromStore = docs.map(d => d.title).filter(Boolean);
      setTitleList(prev => Array.from(new Set([...prev, ...docTitlesFromStore])));

      // Tự động quét và đồng bộ trực tiếp danh mục từ Google Drive nếu đã kết nối
      try {
        const { isConnected } = getDriveConnectionState();
        if (isConnected) {
          const res = await getNestedDriveTree(['myApp', 'LopU', 'TaiLieu']);
          if (res.success && res.tree && res.tree.children) {
          const titles: string[] = [];
          const chuongs: string[] = [];
          const bais: string[] = [];
          const vanDes: string[] = [];
          const chuyenDes: string[] = [];

          for (const docNode of res.tree.children) {
            if (docNode.type === 'folder') {
              titles.push(docNode.name);
              if (docNode.children) {
                for (const chNode of docNode.children) {
                  if (chNode.type === 'folder') {
                    chuongs.push(chNode.name);
                    if (chNode.children) {
                      for (const bNode of chNode.children) {
                        if (bNode.type === 'folder') {
                          bais.push(bNode.name);
                          if (bNode.children) {
                            for (const vNode of bNode.children) {
                              if (vNode.type === 'folder') {
                                vanDes.push(vNode.name);
                                if (vNode.children) {
                                  for (const cdNode of vNode.children) {
                                    chuyenDes.push(cdNode.name);
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
          setTitleList(prev => Array.from(new Set([...prev, ...titles])));
          setChuongList(prev => Array.from(new Set([...prev, ...chuongs])));
          setBaiList(prev => Array.from(new Set([...prev, ...bais])));
          setVanDeList(prev => Array.from(new Set([...prev, ...vanDes])));
          setChuyenDeList(prev => Array.from(new Set([...prev, ...chuyenDes])));
        }
      }
    } catch (err) {
        console.warn('NavigationContainer auto drive sync error:', err);
      }
    }
    load();
  }, []);

  const lastLoadedDocKeyRef = useRef<string>('');

  // Khi mở cửa sổ soạn thảo Word hoặc khi chọn Chuyên đề: Tự động nạp nội dung từ Google Drive của Giáo viên
  useEffect(() => {
    if (!editorRef.current) return;
    const currentDocKey = `${title || ''}_${chuyenDe || ''}_${bai || ''}_${tienTrinhChuyenDe}_${selectedKienThucName || ''}_${selectedExerciseName || ''}`;

    // Chỉ nạp lại khi chuyển sang chuyên đề, tài liệu hoặc bài khác
    if (lastLoadedDocKeyRef.current !== currentDocKey) {
      lastLoadedDocKeyRef.current = currentDocKey;

      if (!chuyenDe || !chuyenDe.trim()) {
        if (!editorRef.current.innerHTML.trim()) {
          editorRef.current.innerHTML = '<p><br></p>';
        }
        return;
      }

      let isCancelled = false;
      const isTeacher = isTeacherOrHigher(currentRole);

      // Tìm cache nội dung bài giảng có sẵn trong bộ nhớ trình duyệt
      const rawCd = chuyenDe.trim();
      const cleanCd = rawCd.replace(/^(?:Chuyên\s*đề|Chuyen\s*de)\s*:?\s*/i, '').trim();
      const cachedContent = (selectedKienThucName && localStorage.getItem(`lopu_kienthuc_file_KienThuc_${selectedKienThucName}.html_${rawCd}`))
        || (selectedKienThucName && localStorage.getItem(`lopu_kienthuc_file_KienThuc_${selectedKienThucName}.html_${cleanCd}`))
        || localStorage.getItem(`lopu_kienthuc_${rawCd}`)
        || localStorage.getItem(`lopu_kienthuc_${cleanCd}`)
        || localStorage.getItem(`lopu_kienthuc_file_KienThuc_LyThuyetTrongTam.html_${rawCd}`)
        || localStorage.getItem(`lopu_kienthuc_file_KienThuc_LyThuyetTrongTam.html_${cleanCd}`)
        || localStorage.getItem('lopu_drive_file_content_name_KienThuc_LyThuyetTrongTam.html');

      // 1. VỚI HỌC SINH: Không có soạn bài nên xem ngay từ cache (0ms delay) để học ngay,
      // không khóa cửa sổ Word và cập nhật nền vào sau!
      if (!isTeacher && cachedContent && cachedContent.trim()) {
        if (editorRef.current) {
          editorRef.current.innerHTML = cachedContent;
        }
        setWordDocumentHtml(cachedContent);
        setIsLoadingFromDrive(false);
        setTimeout(() => refreshRailMarkers(), 50);

        // Chạy cập nhật nền ngầm từ Drive không khóa cửa sổ học sinh
        setIsBackgroundSyncing(true);
        (async () => {
          try {
            const driveRes = await loadChuyenDeContentFromDrive({
              title,
              subject,
              grade,
              chuong,
              bai,
              vanDe,
              chuyenDe,
              tienTrinh: tienTrinhChuyenDe as any,
              selectedKienThucName,
              selectedExerciseName,
              isStudent: true,
              allowInteractivePopup: false,
            });
            if (isCancelled) return;
            if (driveRes.success && driveRes.contentHtml && driveRes.contentHtml.trim()) {
              if (driveRes.contentHtml !== cachedContent) {
                if (editorRef.current) {
                  editorRef.current.innerHTML = driveRes.contentHtml;
                }
                setWordDocumentHtml(driveRes.contentHtml);
                setTimeout(() => refreshRailMarkers(), 50);
              }
            }
          } catch (bgErr) {
            console.warn('Lỗi cập nhật nền cho học sinh:', bgErr);
          } finally {
            if (!isCancelled) setIsBackgroundSyncing(false);
          }
        })();
        return;
      }

      // 2. VỚI GIÁO VIÊN (hoặc Học sinh chưa có cache):
      // Giáo viên BẮT BUỘC phải đảm bảo cập nhật mới nhất từ Drive mới được soạn bài, cập nhật, chỉnh sửa.
      // Khi Xác thực lại nền chưa xong thì vẫn báo "Đang đồng bộ" và KHÓA cửa sổ Word!
      setIsLoadingFromDrive(true);

      (async () => {
        try {
          // Ưu tiên nạp bản mới nhất từ Google Drive của Giáo viên
          const driveRes = await loadChuyenDeContentFromDrive({
            title,
            subject,
            grade,
            chuong,
            bai,
            vanDe,
            chuyenDe,
            tienTrinh: tienTrinhChuyenDe as any,
            selectedKienThucName,
            selectedExerciseName,
            isStudent: !isTeacher,
            allowInteractivePopup: isTeacher,
          });

          if (isCancelled) return;

          if (driveRes.success && driveRes.contentHtml && driveRes.contentHtml.trim()) {
            if (editorRef.current) {
              editorRef.current.innerHTML = driveRes.contentHtml;
            }
            setWordDocumentHtml(driveRes.contentHtml);

            // Đảm bảo tên bài có trong danh sách nếu vừa tải từ tệp mới
            if (driveRes.loadedFile?.name) {
              const fileName = driveRes.loadedFile.name;
              if (fileName.toLowerCase().startsWith('kienthuc_') && fileName.toLowerCase().endsWith('.html')) {
                const raw = fileName.slice('KienThuc_'.length, -'.html'.length);
                if (raw && raw.toLowerCase() !== 'lythuyettrongtam') {
                  let friendlyName = raw;
                  if (raw.toLowerCase() === 'tomtatcongthuc') friendlyName = 'Tóm tắt công thức';
                  setCustomKienThucList(prev => deduplicateItemsBySlug([friendlyName, ...prev]));
                }
              }
            }

            setNotification({
              text: `Đã nạp thành công nội dung tệp "${driveRes.loadedFile?.name || 'KienThuc_LyThuyetTrongTam.html'}" từ Google Drive của giáo viên!`,
              type: 'success',
            });
            setTimeout(() => setNotification(null), 3500);
            setTimeout(() => refreshRailMarkers(), 50);
            return;
          }

          // Nếu không có file tương ứng trên Drive Giáo viên: Mở trang trắng để giáo viên bắt đầu soạn mới
          if (editorRef.current) {
            editorRef.current.innerHTML = '<p><br></p>';
          }
          setWordDocumentHtml('<p><br></p>');
          setTimeout(() => refreshRailMarkers(), 50);
        } catch (loadErr) {
          console.warn('Lỗi khi tự động tải nội dung từ Drive trong Word:', loadErr);
          if (editorRef.current) {
            editorRef.current.innerHTML = '<p><br></p>';
          }
          setWordDocumentHtml('<p><br></p>');
        } finally {
          if (!isCancelled) {
            setIsLoadingFromDrive(false);
          }
        }
      })();

      return () => {
        isCancelled = true;
      };
    }
  }, [title, subject, grade, chuong, bai, vanDe, chuyenDe, tienTrinhChuyenDe, selectedKienThucName, selectedExerciseName, documents, currentRole]);

  // Luôn đồng bộ wordDocumentHtml vào editorRef khi editorRef được gắn vào DOM
  useEffect(() => {
    if (editorRef.current && wordDocumentHtml) {
      if (editorRef.current.innerHTML !== wordDocumentHtml) {
        editorRef.current.innerHTML = wordDocumentHtml;
        setTimeout(() => refreshRailMarkers(), 50);
      }
    }
  }, [wordDocumentHtml, chuyenDe]);

  // Lắng nghe sự kiện mở tài liệu từ module TÀI LIỆU hoặc LỚP HỌC
  useEffect(() => {
    const applyDocData = (doc: any) => {
      if (!doc) return;
      if (doc.title) setTitle(doc.title);
      if (doc.subject) setSubject(doc.subject);
      if (doc.grade) setGrade(doc.grade);
      if (doc.chuong) setChuong(doc.chuong);
      if (doc.bai) setBai(doc.bai);
      if (doc.vanDe) setVanDe(doc.vanDe);
      if (doc.chuyenDe) setChuyenDe(doc.chuyenDe);
      if (doc.tienTrinh) setTienTrinhChuyenDe(doc.tienTrinh);
      if (doc.selectedKienThucName) setSelectedKienThucName(doc.selectedKienThucName);

      const html = doc.contentHtml || doc.content || (doc.contentSnippet ? `<p>${doc.contentSnippet}</p>` : '');

      if (html) {
        lastLoadedDocKeyRef.current = `${doc.title || ''}_${doc.chuyenDe || ''}_${doc.bai || ''}_${tienTrinhChuyenDe}_${selectedKienThucName || ''}_${selectedExerciseName || ''}`;
        if (editorRef.current) {
          editorRef.current.innerHTML = html;
        }
        setWordDocumentHtml(html);
        setNotification({
          text: `Đã mở tài liệu bài giảng "${doc.chuyenDe || doc.title || ''}"!`,
          type: 'success',
        });
        setTimeout(() => setNotification(null), 3500);
        setTimeout(() => refreshRailMarkers(), 50);
      } else {
        // Chưa có html -> kích hoạt nạp từ Google Drive
        lastLoadedDocKeyRef.current = '';
      }
    };

    // Kiểm tra và áp dụng tài liệu chờ mở từ sessionStorage khi mount
    try {
      const pendingDocStr = sessionStorage.getItem('lopu_pending_open_document');
      if (pendingDocStr) {
        sessionStorage.removeItem('lopu_pending_open_document');
        const pendingDoc = JSON.parse(pendingDocStr);
        if (pendingDoc) {
          applyDocData(pendingDoc);
        }
      }
    } catch (err) {
      console.warn('Lỗi nạp pending doc từ sessionStorage:', err);
    }

    const handleOpenDocFromTaiLieu = (e: CustomEvent<any>) => {
      if (e.detail) {
        applyDocData(e.detail);
      }
    };
    window.addEventListener('app-open-word-document', handleOpenDocFromTaiLieu as EventListener);
    return () => {
      window.removeEventListener('app-open-word-document', handleOpenDocFromTaiLieu as EventListener);
    };
  }, [tienTrinhChuyenDe, selectedKienThucName, selectedExerciseName]);

  // Cập nhật danh sách mốc trên Thước lề trái (Left-Margin Pin Rail - Đề xuất 2)
  const refreshRailMarkers = () => {
    if (!editorRef.current) return;
    const children = Array.from(editorRef.current.children) as HTMLElement[];
    const markers: RailMarker[] = [];
    const lineItems: RailLineItem[] = [];
    let slideCounter = 1;
    let stepCounter = 1;

    children.forEach((child, idx) => {
      const isSlide =
        child.getAttribute('data-slide-break') === 'true' ||
        child.classList.contains('slide-break-point') ||
        child.classList.contains('slide-break') ||
        (idx === 0 && children.length > 0);

      const isEffect =
        !isSlide &&
        (child.getAttribute('data-effect-break') === 'true' ||
          child.classList.contains('effect-break-point'));

      const effectType = (child.getAttribute('data-effect-type') as PptEffectType) || 'fade';

      let currentMarker: RailMarker | undefined = undefined;

      if (isSlide) {
        currentMarker = {
          id: `pin-slide-${idx}-${Date.now()}`,
          type: 'slide',
          elementIndex: idx,
          topOffset: child.offsetTop || 0,
          slideNumber: slideCounter,
          snippet: child.textContent?.trim().slice(0, 30) || `Slide ${slideCounter}`,
        };
        markers.push(currentMarker);
        slideCounter++;
        stepCounter = 1;
      } else if (isEffect) {
        currentMarker = {
          id: `pin-effect-${idx}-${Date.now()}`,
          type: 'effect',
          effectType,
          elementIndex: idx,
          topOffset: child.offsetTop || 0,
          slideNumber: Math.max(1, slideCounter - 1),
          stepNumber: stepCounter,
          snippet: child.textContent?.trim().slice(0, 30) || `Bước ${stepCounter}`,
        };
        markers.push(currentMarker);
        stepCounter++;
      }

      lineItems.push({
        elementIndex: idx,
        topOffset: child.offsetTop || 0,
        snippet: child.textContent?.trim().slice(0, 30) || `Dòng ${idx + 1}`,
        hasSlideMarker: isSlide,
        hasEffectMarker: isEffect,
        effectType: isEffect ? effectType : undefined,
        marker: currentMarker,
      });
    });

    setRailMarkers(markers);
    setRailLineItems(lineItems);
  };

  // Tự động làm mới thước lề trái khi nội dung thay đổi hoặc mở tài liệu
  useEffect(() => {
    const timer = setTimeout(() => {
      refreshRailMarkers();
    }, 150);
    return () => clearTimeout(timer);
  }, [wordDocumentHtml, wordViewMode]);

  // Đặt mốc Slide mới tại vị trí con trỏ / đoạn văn đang chọn
  const handleAddSlideBreakAtCurrentSelection = () => {
    if (!hasAuthoringPermission) {
      setNotification({ text: '⚠️ Bạn không có Quyền biên soạn tài liệu!', type: 'warning' });
      return;
    }
    if (!editorRef.current) return;
    const sel = window.getSelection();
    let targetEl: HTMLElement | null = null;
    if (sel && sel.anchorNode) {
      const node = sel.anchorNode instanceof Element ? sel.anchorNode : sel.anchorNode.parentElement;
      targetEl = (node?.closest('p, div, h1, h2, h3, blockquote, table, ul, ol') as HTMLElement) || null;
    }

    if (targetEl && editorRef.current.contains(targetEl) && targetEl !== editorRef.current) {
      targetEl.setAttribute('data-slide-break', 'true');
      targetEl.removeAttribute('data-effect-break');
      targetEl.removeAttribute('data-effect-type');
      targetEl.classList.add('slide-break-point');
      targetEl.classList.remove('effect-break-point');
    } else {
      const p = document.createElement('p');
      p.setAttribute('data-slide-break', 'true');
      p.classList.add('slide-break-point');
      p.innerHTML = '<br>';
      editorRef.current.appendChild(p);
      targetEl = p;
    }

    setWordDocumentHtml(editorRef.current.innerHTML);
    setTimeout(refreshRailMarkers, 50);
    setNotification({ text: '🎬 Đã gắn mốc Slide mới trên Thước lề trái!', type: 'success' });
    setTimeout(() => setNotification(null), 3000);
  };

  // Đặt mốc Hiệu ứng hiện dần tại vị trí con trỏ / đoạn văn đang chọn
  const handleAddEffectBreakAtCurrentSelection = () => {
    if (!hasAuthoringPermission) {
      setNotification({ text: '⚠️ Bạn không có Quyền biên soạn tài liệu!', type: 'warning' });
      return;
    }
    if (!editorRef.current) return;
    const sel = window.getSelection();
    let targetEl: HTMLElement | null = null;
    if (sel && sel.anchorNode) {
      const node = sel.anchorNode instanceof Element ? sel.anchorNode : sel.anchorNode.parentElement;
      targetEl = (node?.closest('p, div, h1, h2, h3, blockquote, table, ul, ol') as HTMLElement) || null;
    }

    if (targetEl && editorRef.current.contains(targetEl) && targetEl !== editorRef.current) {
      targetEl.setAttribute('data-effect-break', 'true');
      targetEl.setAttribute('data-effect-type', 'fade');
      targetEl.removeAttribute('data-slide-break');
      targetEl.classList.add('effect-break-point');
      targetEl.classList.remove('slide-break-point');
    } else {
      const p = document.createElement('p');
      p.setAttribute('data-effect-break', 'true');
      p.setAttribute('data-effect-type', 'fade');
      p.classList.add('effect-break-point');
      p.innerHTML = '<br>';
      editorRef.current.appendChild(p);
      targetEl = p;
    }

    setWordDocumentHtml(editorRef.current.innerHTML);
    setTimeout(refreshRailMarkers, 50);
    setNotification({ text: '✨ Đã gắn mốc Hiệu ứng hiện dần trên Thước lề trái!', type: 'success' });
    setTimeout(() => setNotification(null), 3000);
  };

  // Kích chuột vào vị trí bất kỳ trên Thanh Mốc PPT dọc để mở popup đặt +Mốc Slide / +Hiệu ứng (chỉ dành cho giáo viên)
  const handlePptRailClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!hasAuthoringPermission) return;
    if (!editorRef.current) return;
    const clickY = e.clientY;
    const children = Array.from(editorRef.current.children) as HTMLElement[];
    if (children.length === 0) {
      const p = document.createElement('p');
      p.innerHTML = '<br>';
      editorRef.current.appendChild(p);
      setWordDocumentHtml(editorRef.current.innerHTML);
      setTimeout(refreshRailMarkers, 50);
    }
    const updatedChildren = Array.from(editorRef.current.children) as HTMLElement[];
    let closestIdx = 0;
    let minDistance = Infinity;
    updatedChildren.forEach((child, idx) => {
      const rect = child.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      const dist = Math.abs(midY - clickY);
      if (dist < minDistance) {
        minDistance = dist;
        closestIdx = idx;
      }
    });

    const targetEl = updatedChildren[closestIdx];
    const isSlide = targetEl?.getAttribute('data-slide-break') === 'true' || targetEl?.classList.contains('slide-break-point') || false;
    const isEffect = targetEl?.getAttribute('data-effect-break') === 'true' || targetEl?.classList.contains('effect-break-point') || false;
    const effectType = (targetEl?.getAttribute('data-effect-type') as PptEffectType) || 'fade';
    const snippet = targetEl?.textContent?.trim().slice(0, 40) || `Đoạn ${closestIdx + 1}`;

    setPptRailClickMenu({
      elementIndex: closestIdx,
      x: e.clientX,
      y: e.clientY,
      isSlide,
      isEffect,
      effectType,
      snippet,
    });
  };

  // Áp dụng đặt mốc Slide hoặc mốc Hiệu ứng từ Thanh Mốc PPT (kèm cấu hình hiệu ứng cơ bản)
  const handleApplyBreakFromRail = (
    type: 'slide' | 'effect',
    elementIndex: number,
    effectType: PptEffectType = 'fade'
  ) => {
    if (!hasAuthoringPermission) {
      setNotification({
        text: '⚠️ Bạn không có Quyền biên soạn tài liệu để đặt mốc PPT!',
        type: 'warning',
      });
      return;
    }
    if (!editorRef.current) return;
    const children = Array.from(editorRef.current.children) as HTMLElement[];
    const el = children[elementIndex];
    if (el) {
      if (type === 'slide') {
        el.setAttribute('data-slide-break', 'true');
        el.removeAttribute('data-effect-break');
        el.removeAttribute('data-effect-type');
        el.classList.add('slide-break-point');
        el.classList.remove('effect-break-point');
      } else {
        el.setAttribute('data-effect-break', 'true');
        el.setAttribute('data-effect-type', effectType);
        el.removeAttribute('data-slide-break');
        el.classList.add('effect-break-point');
        el.classList.remove('slide-break-point');
      }
      setWordDocumentHtml(editorRef.current.innerHTML);
      setTimeout(refreshRailMarkers, 50);

      const effDef = getPptEffectDef(effectType);

      setNotification({
        text: type === 'slide'
          ? '🎬 Đã đặt Mốc Slide tại vị trí chọn trên Thanh Mốc PPT!'
          : `✨ Đã đặt Mốc Hiệu ứng [${effDef.nameVi}] tại vị trí chọn trên Thanh Mốc PPT!`,
        type: 'success',
      });
      setTimeout(() => setNotification(null), 3000);
    }
    setPptRailClickMenu(null);
  };

  // Gỡ bỏ mốc khỏi phần tử
  const handleRemoveBreakFromRail = (elementIndex: number) => {
    if (!hasAuthoringPermission) {
      setNotification({
        text: '⚠️ Bạn không có Quyền biên soạn tài liệu để gỡ mốc PPT!',
        type: 'warning',
      });
      return;
    }
    if (!editorRef.current) return;
    const children = Array.from(editorRef.current.children) as HTMLElement[];
    const el = children[elementIndex];
    if (el) {
      el.removeAttribute('data-slide-break');
      el.removeAttribute('data-effect-break');
      el.removeAttribute('data-effect-type');
      el.classList.remove('slide-break-point', 'effect-break-point');
      setWordDocumentHtml(editorRef.current.innerHTML);
      setTimeout(refreshRailMarkers, 50);
      setNotification({
        text: '🗑️ Đã gỡ mốc khỏi tài liệu!',
        type: 'info',
      });
      setTimeout(() => setNotification(null), 2500);
    }
    setPptRailClickMenu(null);
  };

  // Tự động phân tích toàn bộ văn bản và gắn mốc Slide & Hiệu ứng thông minh
  const handleAutoAnalyzeBreaks = () => {
    if (!editorRef.current) return;
    const children = Array.from(editorRef.current.children) as HTMLElement[];
    if (children.length === 0) {
      setNotification({ text: 'Văn bản đang trống, chưa có nội dung để phân tích!', type: 'error' });
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    let slideCount = 0;
    let effectCount = 0;

    children.forEach((child, idx) => {
      const text = (child.textContent || '').trim();
      const tag = child.tagName.toUpperCase();

      const isSlide =
        idx === 0 ||
        tag === 'H1' ||
        tag === 'H2' ||
        tag === 'H3' ||
        child.classList.contains('lesson-template-box') ||
        /^(?:Chương|Bài|Vấn đề|Chuyên đề|Câu|Ví dụ|VD|Dạng|Dạng toán|Khái niệm|Định lý|Định nghĩa|Tính chất|Hệ quả|Phương pháp|I\.|II\.|III\.|IV\.|V\.)\s*[\d\.\:\[]/i.test(text);

      const isEffect =
        !isSlide &&
        (/^(?:Lời giải|Hướng dẫn|Hướng dẫn giải|Giải|Đáp án|Nhận xét|Bước \d|Chú ý|Kết luận|Ta có|Suy ra|•|-)\s*[:\.]?/i.test(text) ||
          child.classList.contains('word-graph-wrapper') ||
          tag === 'TABLE');

      if (isSlide) {
        child.setAttribute('data-slide-break', 'true');
        child.removeAttribute('data-effect-break');
        child.classList.add('slide-break-point');
        child.classList.remove('effect-break-point');
        slideCount++;
      } else if (isEffect) {
        child.setAttribute('data-effect-break', 'true');
        child.removeAttribute('data-slide-break');
        child.classList.add('effect-break-point');
        child.classList.remove('slide-break-point');
        effectCount++;
      }
    });

    setWordDocumentHtml(editorRef.current.innerHTML);
    setTimeout(refreshRailMarkers, 50);
    setNotification({
      text: `🤖 Đã phân tích tự động: Tạo thành công ${slideCount} Slide và ${effectCount} mốc Hiệu ứng!`,
      type: 'success',
    });
    setTimeout(() => setNotification(null), 4000);
  };

  // Đổi loại mốc (Slide <-> Hiệu ứng)
  const handleToggleMarkerType = (marker: RailMarker) => {
    if (!editorRef.current) return;
    const children = Array.from(editorRef.current.children) as HTMLElement[];
    const el = children[marker.elementIndex];
    if (el) {
      if (marker.type === 'slide') {
        el.removeAttribute('data-slide-break');
        el.setAttribute('data-effect-break', 'true');
        el.classList.remove('slide-break-point');
        el.classList.add('effect-break-point');
      } else {
        el.removeAttribute('data-effect-break');
        el.setAttribute('data-slide-break', 'true');
        el.classList.remove('effect-break-point');
        el.classList.add('slide-break-point');
      }
      setWordDocumentHtml(editorRef.current.innerHTML);
      setTimeout(refreshRailMarkers, 50);
      setSelectedPinMenu(null);
    }
  };

  // Xóa mốc khỏi phần tử
  const handleDeleteMarker = (marker: RailMarker) => {
    if (!editorRef.current) return;
    const children = Array.from(editorRef.current.children) as HTMLElement[];
    const el = children[marker.elementIndex];
    if (el) {
      el.removeAttribute('data-slide-break');
      el.removeAttribute('data-effect-break');
      el.classList.remove('slide-break-point', 'effect-break-point');
      setWordDocumentHtml(editorRef.current.innerHTML);
      setTimeout(refreshRailMarkers, 50);
      setSelectedPinMenu(null);
    }
  };

  // Cuộn màn hình tới mốc được chọn
  const handleScrollToMarker = (marker: RailMarker) => {
    if (!editorRef.current) return;
    const children = Array.from(editorRef.current.children) as HTMLElement[];
    const el = children[marker.elementIndex];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-purple-500', 'ring-offset-2');
      setTimeout(() => el.classList.remove('ring-2', 'ring-purple-500', 'ring-offset-2'), 1800);
      setSelectedPinMenu(null);
    }
  };

  // Bắt đầu kéo rê mốc trên thước lề
  const handleMarkerDragStart = (e: React.DragEvent, marker: RailMarker) => {
    draggedMarkerRef.current = marker;
    e.dataTransfer.setData('text/plain', marker.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  // Thả mốc vào phần tử đích
  const handleMarkerDropOnElement = (targetIdx: number) => {
    if (!editorRef.current || !draggedMarkerRef.current) return;
    const children = Array.from(editorRef.current.children) as HTMLElement[];
    const oldEl = children[draggedMarkerRef.current.elementIndex];
    const newEl = children[targetIdx];
    if (oldEl && newEl && oldEl !== newEl) {
      const oldType = draggedMarkerRef.current.type;
      oldEl.removeAttribute('data-slide-break');
      oldEl.removeAttribute('data-effect-break');
      oldEl.classList.remove('slide-break-point', 'effect-break-point');

      if (oldType === 'slide') {
        newEl.setAttribute('data-slide-break', 'true');
        newEl.classList.add('slide-break-point');
      } else {
        newEl.setAttribute('data-effect-break', 'true');
        newEl.classList.add('effect-break-point');
      }

      setWordDocumentHtml(editorRef.current.innerHTML);
      setTimeout(refreshRailMarkers, 50);
      setNotification({
        text: `📌 Đã dời mốc ${oldType === 'slide' ? 'Slide' : 'Hiệu ứng'} sang vị trí mới!`,
        type: 'info',
      });
      setTimeout(() => setNotification(null), 2500);
    }
    draggedMarkerRef.current = null;
  };

  const pptSlides = parseDocumentToSlides(
    editorRef.current?.innerHTML || wordDocumentHtml || '',
    title || chuyenDe || 'Tài liệu Chuyên đề'
  );

  const currentPptSlide = pptSlides[Math.min(activePptSlideIndex, Math.max(0, pptSlides.length - 1))] || pptSlides[0];
  const currentPptTotalSteps = currentPptSlide?.steps?.length || 1;

  const handlePptPrev = () => {
    if (!revealAllSteps && activePptStepIndex > 0) {
      setActivePptStepIndex((prev) => prev - 1);
    } else if (activePptSlideIndex > 0) {
      const prevIdx = activePptSlideIndex - 1;
      setActivePptSlideIndex(prevIdx);
      const prevSlide = pptSlides[prevIdx];
      setActivePptStepIndex(prevSlide ? Math.max(0, prevSlide.steps.length - 1) : 0);
    }
  };

  const handlePptNext = () => {
    if (!revealAllSteps && activePptStepIndex < currentPptTotalSteps - 1) {
      setActivePptStepIndex((prev) => prev + 1);
    } else if (activePptSlideIndex < pptSlides.length - 1) {
      setActivePptSlideIndex(activePptSlideIndex + 1);
      setActivePptStepIndex(0);
    }
  };

  // Ở 1. Kiến thức: Nút View chỉ có 2 tùy chọn là Xem PPT và Toàn bộ (tự động chuyển về Toàn bộ nếu đang ở Tách câu)
  useEffect(() => {
    if (tienTrinhChuyenDe === 'Kiến thức' && wordViewMode === 'split') {
      setWordViewMode('full');
    }
  }, [tienTrinhChuyenDe, wordViewMode]);

  // Khôi phục nội dung văn bản khi quay lại chế độ xem Toàn bộ
  useEffect(() => {
    if (wordViewMode === 'full' && editorRef.current && wordDocumentHtml) {
      if (!editorRef.current.innerHTML || editorRef.current.innerHTML === '<p><br></p>') {
        editorRef.current.innerHTML = wordDocumentHtml;
      }
    }
  }, [wordViewMode, wordDocumentHtml]);

  // Định nghĩa chuẩn các Style văn bản theo yêu cầu Word
  const WORD_STYLE_PRESETS: Record<string, {
    tag: string;
    fontSize: string;
    bold: boolean;
    italic: boolean;
    underline: boolean;
    textColor?: string;
    highlightColor?: string;
    alignment?: 'left' | 'center' | 'right' | 'justify';
  }> = {
    p: {
      tag: 'P',
      fontSize: '14px',
      bold: false,
      italic: false,
      underline: false,
      textColor: '#0f172a',
      highlightColor: 'transparent',
      alignment: 'left',
    },
    h1: {
      tag: 'H1',
      fontSize: '22px',
      bold: true,
      italic: false,
      underline: false,
      textColor: '#1e40af',
      highlightColor: 'transparent',
      alignment: 'left',
    },
    h2: {
      tag: 'H2',
      fontSize: '20px',
      bold: true,
      italic: false,
      underline: false,
      textColor: '#1d4ed8',
      highlightColor: 'transparent',
      alignment: 'left',
    },
    h3: {
      tag: 'H3',
      fontSize: '18px',
      bold: true,
      italic: true,
      underline: false,
      textColor: '#047857',
      highlightColor: 'transparent',
      alignment: 'left',
    },
    h4: {
      tag: 'H4',
      fontSize: '16px',
      bold: true,
      italic: true,
      underline: true,
      textColor: '#b45309',
      highlightColor: 'transparent',
      alignment: 'left',
    },
    title: {
      tag: 'H1',
      fontSize: '24px',
      bold: true,
      italic: false,
      underline: false,
      textColor: '#1e1b4b',
      highlightColor: 'transparent',
      alignment: 'center',
    },
    subtitle: {
      tag: 'P',
      fontSize: '16px',
      bold: false,
      italic: true,
      underline: false,
      textColor: '#475569',
      highlightColor: 'transparent',
      alignment: 'center',
    },
    highlight: {
      tag: 'P',
      fontSize: '14px',
      bold: true,
      italic: false,
      underline: true,
      textColor: '#9a3412',
      highlightColor: '#fef08a',
      alignment: 'left',
    },
    quote: {
      tag: 'P',
      fontSize: '14px',
      bold: false,
      italic: true,
      underline: false,
      textColor: '#0369a1',
      highlightColor: '#e0f2fe',
      alignment: 'justify',
    },
  };

  const updateToolbarFormattingStates = () => {
    try {
      setIsBold(document.queryCommandState('bold'));
      setIsItalic(document.queryCommandState('italic'));
      setIsUnderline(document.queryCommandState('underline'));
      if (document.queryCommandState('justifyCenter')) setCurrentAlignment('center');
      else if (document.queryCommandState('justifyRight')) setCurrentAlignment('right');
      else if (document.queryCommandState('justifyFull')) setCurrentAlignment('justify');
      else if (document.queryCommandState('justifyLeft')) setCurrentAlignment('left');
    } catch {}
  };

  const execCommand = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      editorRef.current.focus();
    }
    updateToolbarFormattingStates();
  };

  // Áp dụng cỡ chữ trực tiếp vào vùng bôi đen hoặc thẻ khối hiện tại
  const applyFontSizeToSelectionOrBlock = (size: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    if (!sel.isCollapsed) {
      document.execCommand('styleWithCSS', false, 'true');
      const range = sel.getRangeAt(0);
      const span = document.createElement('span');
      span.style.fontSize = size;
      try {
        span.appendChild(range.extractContents());
        range.insertNode(span);
        sel.removeAllRanges();
        const newRange = document.createRange();
        newRange.selectNodeContents(span);
        sel.addRange(newRange);
      } catch {
        document.execCommand('fontSize', false, '4');
      }
    } else {
      let node: Node | null = sel.anchorNode;
      while (node && node !== editorRef.current) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as HTMLElement;
          if (['P', 'H1', 'H2', 'H3', 'H4', 'DIV', 'LI', 'SPAN'].includes(el.tagName)) {
            el.style.fontSize = size;
            break;
          }
        }
        node = node.parentNode;
      }
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

  const handleFontSizeChange = (newSize: string) => {
    setFontSize(newSize);
    applyFontSizeToSelectionOrBlock(newSize);
  };

  // Hàm chọn Style: tác động lên các chức năng tương ứng (cỡ chữ, in đậm B, in nghiêng I, gạch chân U, màu chữ, màu nền, canh lề)
  const handleSelectStyle = (styleKey: string) => {
    setSelectedStyle(styleKey);
    if (!editorRef.current) return;
    editorRef.current.focus();

    const preset = WORD_STYLE_PRESETS[styleKey] || WORD_STYLE_PRESETS.p;

    // 1. Cỡ chữ: tác động lên chức năng cỡ chữ để điều khiển
    setFontSize(preset.fontSize);
    applyFontSizeToSelectionOrBlock(preset.fontSize);

    // 2. Chuyển khối formatBlock (H1, H2, H3, H4, P)
    document.execCommand('formatBlock', false, preset.tag);

    // 3. Quy định In đậm (B): kích hoạt hoặc hủy kích hoạt biểu tượng chữ B
    setIsBold(preset.bold);
    const curBold = document.queryCommandState('bold');
    if (preset.bold && !curBold) {
      document.execCommand('bold', false);
    } else if (!preset.bold && curBold) {
      document.execCommand('bold', false);
    }

    // 4. Quy định In nghiêng (I): kích hoạt hoặc hủy kích hoạt biểu tượng chữ I
    setIsItalic(preset.italic);
    const curItalic = document.queryCommandState('italic');
    if (preset.italic && !curItalic) {
      document.execCommand('italic', false);
    } else if (!preset.italic && curItalic) {
      document.execCommand('italic', false);
    }

    // 5. Quy định Gạch chân (U): kích hoạt hoặc hủy kích hoạt biểu tượng chữ U
    setIsUnderline(preset.underline);
    const curUnderline = document.queryCommandState('underline');
    if (preset.underline && !curUnderline) {
      document.execCommand('underline', false);
    } else if (!preset.underline && curUnderline) {
      document.execCommand('underline', false);
    }

    // 6. Quy định Màu văn bản: chọn vào màu văn bản tương ứng
    if (preset.textColor) {
      setTextColor(preset.textColor);
      document.execCommand('foreColor', false, preset.textColor);
    }

    // 7. Quy định Màu nền: chọn vào màu nền tương ứng
    if (preset.highlightColor) {
      setHighlightColor(preset.highlightColor);
      if (preset.highlightColor === 'transparent') {
        document.execCommand('hiliteColor', false, 'transparent');
      } else {
        document.execCommand('hiliteColor', false, preset.highlightColor);
      }
    }

    // 8. Quy định Canh lề: chọn canh lề tương ứng trong nút canh lề
    if (preset.alignment) {
      handleAlign(preset.alignment);
    }

    setTimeout(updateToolbarFormattingStates, 50);
  };

  // Chèn Bảng vào Word
  const handleInsertTable = () => {
    handleOpenTableModal();
  };

  // Chèn công thức Toán học (MathType)
  const handleInsertMath = () => {
    saveCurrentSelection();
    setMathModalFormula('');
    setShowMathTypeModal(true);
    setOpenInsertMenu(false);
  };

  // Chèn đồ thị (Dùng tikz vẽ lại đồ thị từ hình ảnh tải lên)
  const handleInsertGraph = () => {
    saveCurrentSelection();
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
      const cleanGraphHtml = `
        <div class="word-graph-wrapper relative my-3 flex justify-center items-center" contenteditable="false" style="text-align: center; margin: 16px 0; background: transparent; border: none; position: relative;">
          <img src="${src}" alt="Đồ thị ${file.name}" style="max-width: 380px; width: 100%; height: auto; background: transparent; display: inline-block; vertical-align: middle; cursor: pointer; border: none;" />
          <button type="button" onclick="this.closest('.word-graph-wrapper').remove()" title="Xóa đồ thị này" class="delete-graph-btn" style="position: absolute; top: 2px; right: calc(50% - 190px); background: #ef4444; color: white; border: none; border-radius: 9999px; width: 22px; height: 22px; font-size: 12px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 3px rgba(0,0,0,0.2); opacity: 0.85; transition: opacity 0.2s;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.85'">✕</button>
        </div>
        <p><br></p>
      `;
      insertHtmlToEditor(cleanGraphHtml);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Chèn bảng biến thiên (dùng tikz-tab vẽ lại bảng biến thiên từ hình ảnh bảng biến thiên vẽ lên)
  const handleInsertTableOfVariation = () => {
    saveCurrentSelection();
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
    setNotification({ text: `Đã chèn bảng biến thiên từ hình ảnh "${file.name}" vào câu hỏi!`, type: 'success' });
    setTimeout(() => setNotification(null), 4000);

    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      const src = loadEvt.target?.result as string;
      const cleanBbtHtml = `
        <div class="word-bbt-wrapper relative my-3 flex justify-center items-center" contenteditable="false" style="text-align: center; margin: 16px 0; background: transparent; border: none; position: relative;">
          <img src="${src}" alt="Bảng biến thiên ${file.name}" style="max-width: 480px; width: 100%; height: auto; background: transparent; display: inline-block; vertical-align: middle; cursor: pointer; border: none;" />
          <button type="button" onclick="this.closest('.word-bbt-wrapper').remove()" title="Xóa bảng biến thiên này" class="delete-graph-btn" style="position: absolute; top: 2px; right: calc(50% - 240px); background: #ef4444; color: white; border: none; border-radius: 9999px; width: 22px; height: 22px; font-size: 12px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 3px rgba(0,0,0,0.2); opacity: 0.85;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.85'">✕</button>
        </div>
        <p><br></p>
      `;
      insertHtmlToEditor(cleanBbtHtml);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Chèn Hình ảnh
  const handleInsertImage = () => {
    saveCurrentSelection();
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
      insertHtmlToEditor(imgHtml);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Chèn File tài liệu
  const handleInsertFile = () => {
    saveCurrentSelection();
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
    insertHtmlToEditor(fileHtml);
    e.target.value = '';
  };

  // Chèn Thư mục (Giáo án E-Learning KienThuc.html)
  const handleInsertFolderElearning = () => {
    saveCurrentSelection();
    const folderHtml = `
      <div style="background-color: #ecfdf5; border: 1.5px solid #a7f3d0; padding: 14px; border-radius: 10px; margin: 12px 0;">
        <div style="display: flex; align-items: center; gap: 8px; color: #065f46; font-weight: bold; font-size: 15px;">
          📁 <span>Gói Bài Giảng E-Learning (KienThuc.html): <em>${chuyenDe || 'Chuyên đề trọng tâm'}</em></span>
        </div>
        <p style="margin: 6px 0 0 0; color: #047857; font-size: 13px;">
          Gói bài giảng KienThuc.html với các tệp ảnh tại [Chuyên đề]/HinhAnh, âm thanh tại [Chuyên đề]/AmThanh, video tại [Chuyên đề]/Video. Giữ nguyên đường dẫn tương đối để phát lại mượt mà, độc lập.
        </p>
      </div>
    `;
    insertHtmlToEditor(folderHtml);
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

  const [isWordResyncing, setIsWordResyncing] = useState<boolean>(false);

  const handleWordResyncFromDrive = async (targetLvl: 'title' | 'chuong' | 'bai' | 'vanDe' | 'chuyenDe' = 'title') => {
    setIsWordResyncing(true);
    setSyncingLevel(targetLvl);
    setNotification({ text: 'Đang quét và đồng bộ cấu trúc từ Google Drive (QuanLyDrive)...', type: 'info' });
    try {
      // 1. Kiểm tra / Tự động kết nối Drive nếu chưa có token OAuth thực
      let token = localStorage.getItem('lopu_google_drive_token_v1') || localStorage.getItem('lopu_gdrive_token');
      if (!isRealGoogleOAuthToken(token)) {
        const connRes = await connectGoogleDrive();
        if (!connRes.success) {
          setNotification({ text: `Vui lòng đăng nhập Google Drive: ${connRes.message}`, type: 'error' });
          setIsWordResyncing(false);
          setSyncingLevel(null);
          return;
        }
        token = localStorage.getItem('lopu_google_drive_token_v1') || localStorage.getItem('lopu_gdrive_token');
      }

      // 2. Tự động tạo thư mục chuẩn myApp/LopU/TaiLieu trên Google Drive nếu chưa có
      await createByPath(['myApp', 'LopU', 'TaiLieu']);

      // 3. Quét cây phân cấp trực tiếp từ Google Drive
      const res = await getNestedDriveTree(['myApp', 'LopU', 'TaiLieu']);

      // 4. Lấy dữ liệu chuẩn từ Firestore getTeacherDocuments()
      const firestoreDocs = await getTeacherDocuments();
      setDocuments(firestoreDocs);
      const fsTitles = firestoreDocs.map(d => d.title).filter((x): x is string => Boolean(x));
      const fsChuongs = firestoreDocs.map(d => d.chuong).filter((x): x is string => Boolean(x));
      const fsBais = firestoreDocs.map(d => d.bai).filter((x): x is string => Boolean(x));
      const fsVanDes = firestoreDocs.map(d => d.vanDe).filter((x): x is string => Boolean(x));
      const fsChuyenDes = firestoreDocs.map(d => d.chuyenDe).filter((x): x is string => Boolean(x));

      const titles: string[] = [...fsTitles];
      const chuongs: string[] = [...fsChuongs];
      const bais: string[] = [...fsBais];
      const vanDes: string[] = [...fsVanDes];
      const chuyenDes: string[] = [...fsChuyenDes];

      const currentStore = getStoredHierarchy();
      if (res.success && res.tree && res.tree.children) {
        for (const docNode of res.tree.children) {
          if (docNode.type === 'folder') {
            titles.push(docNode.name);
            if (!currentStore[docNode.name]) {
              currentStore[docNode.name] = {};
            }
            if (docNode.children) {
              for (const chNode of docNode.children) {
                if (chNode.type === 'folder') {
                  chuongs.push(chNode.name);
                  if (!currentStore[docNode.name][chNode.name]) {
                    currentStore[docNode.name][chNode.name] = {};
                  }
                  if (chNode.children) {
                    for (const bNode of chNode.children) {
                      if (bNode.type === 'folder') {
                        bais.push(bNode.name);
                        if (!currentStore[docNode.name][chNode.name][bNode.name]) {
                          currentStore[docNode.name][chNode.name][bNode.name] = {};
                        }
                        if (bNode.children) {
                          for (const vNode of bNode.children) {
                            if (vNode.type === 'folder') {
                              vanDes.push(vNode.name);
                              if (!currentStore[docNode.name][chNode.name][bNode.name][vNode.name]) {
                                currentStore[docNode.name][chNode.name][bNode.name][vNode.name] = [];
                              }
                              if (vNode.children) {
                                for (const cdNode of vNode.children) {
                                  if (cdNode.type === 'folder') {
                                    chuyenDes.push(cdNode.name);
                                    if (!currentStore[docNode.name][chNode.name][bNode.name][vNode.name].includes(cdNode.name)) {
                                      currentStore[docNode.name][chNode.name][bNode.name][vNode.name].push(cdNode.name);
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
        saveStoredHierarchy(currentStore);
      }

      const finalTitles = Array.from(new Set(titles));
      const finalChuongs = Array.from(new Set(chuongs));
      const finalBais = Array.from(new Set(bais));
      const finalVanDes = Array.from(new Set(vanDes));
      const finalChuyenDes = Array.from(new Set(chuyenDes));

      setTitleList(finalTitles);
      setChuongList(finalChuongs);
      setBaiList(finalBais);
      setVanDeList(finalVanDes);
      setChuyenDeList(finalChuyenDes);

      setNotification({
        text: `Đã đồng bộ thành công! Tìm thấy ${finalTitles.length} tài liệu, ${finalChuongs.length} chương, ${finalBais.length} bài, ${finalVanDes.length} vấn đề, ${finalChuyenDes.length} chuyên đề.`,
        type: 'success',
      });
    } catch (err: any) {
      setNotification({ text: `Lỗi đồng bộ Drive: ${err?.message || 'Có lỗi xảy ra'}`, type: 'error' });
    } finally {
      setIsWordResyncing(false);
      setSyncingLevel(null);
      setTimeout(() => setNotification(null), 6000);
    }
  };

  // Quản lý đồng bộ và lọc tài liệu theo Môn học và Khối lớp
  const prevSubjectGradeRef = useRef<{ s: string; g: string }>({ s: subject, g: grade });

  // Danh sách tài liệu được lọc tự động theo Môn học và Khối lớp
  // Yêu cầu: Khi môn học và lớp đều khác rỗng mới tiến hành đồng bộ và hiển thị, nếu môn học hoặc khối lớp bằng rỗng thì không cần đồng bộ
  const filteredTitleList = React.useMemo(() => {
    if (!subject || subject.trim() === '' || !grade || grade.trim() === '') {
      return [];
    }
    let delList: string[] = [];
    try {
      delList = JSON.parse(localStorage.getItem('lopu_deleted_drive_folders_v1') || '[]');
    } catch {}
    const hierarchyStore = getStoredHierarchy();
    const allTitles = Array.from(new Set([
      ...titleList,
      ...Object.keys(hierarchyStore),
      ...documents.map(d => d.title).filter((x): x is string => Boolean(x))
    ])).filter(t => !delList.includes(t));

    return allTitles.filter(t => matchesSubjectAndGrade(t, subject, grade));
  }, [titleList, documents, subject, grade]);

  // Khi chọn Môn học và Khối lớp: Chỉ khi CẢ HAI đều khác rỗng mới tiến hành đồng bộ
  // Khi đồng bộ chỉ hiển thị dòng chữ màu đỏ "Đang đồng bộ" sau chữ "Tên tài liệu", không hiện trên thanh tiêu đề TÀI LIỆU
  useEffect(() => {
    const sChanged = prevSubjectGradeRef.current.s !== subject;
    const gChanged = prevSubjectGradeRef.current.g !== grade;
    prevSubjectGradeRef.current = { s: subject, g: grade };

    if (!sChanged && !gChanged) return;

    // Reset các cấp con khi đổi Môn học hoặc Khối lớp
    setChuong('');
    setBai('');
    setVanDe('');
    setChuyenDe('');

    const hasBoth = Boolean(subject && subject.trim() !== '' && grade && grade.trim() !== '');

    if (hasBoth) {
      // Chỉ khi môn học và lớp đều khác rỗng mới tiến hành đồng bộ
      setSyncingLevel('title');

      (async () => {
        try {
          // 1. Kiểm tra / Tự động kết nối Google Drive nếu token chưa có hoặc hết hạn
          let token = localStorage.getItem('lopu_google_drive_token_v1') || localStorage.getItem('lopu_gdrive_token');
          if (!isRealGoogleOAuthToken(token)) {
            const connRes = await connectGoogleDrive();
            if (connRes.success) {
              token = localStorage.getItem('lopu_google_drive_token_v1') || localStorage.getItem('lopu_gdrive_token');
            }
          }

          // 2. Quét cây thư mục từ Google Drive
          const res = await getNestedDriveTree(['myApp', 'LopU', 'TaiLieu'], { overrideToken: token || undefined });
          if (res.success && res.tree && res.tree.children) {
            const driveTitles: string[] = [];
            for (const docNode of res.tree.children) {
              if (docNode.type === 'folder') {
                driveTitles.push(docNode.name);
              }
            }
            if (driveTitles.length > 0) {
              setTitleList(prev => Array.from(new Set([...prev, ...driveTitles])));
            }
          }
        } catch (err) {
          console.warn('NavigationContainer auto sync drive error:', err);
        } finally {
          setTimeout(() => {
            setSyncingLevel(null);
          }, 600);
        }
      })();
    } else {
      // Nếu môn học hoặc khối lớp bằng rỗng thì không cần đồng bộ
      setSyncingLevel(null);
      setTitle('');
    }
  }, [subject, grade]);

  // Quy tắc tự động chọn Tên tài liệu: Nếu có duy nhất 1 tùy chọn thì tự động chọn; nếu > 1 tùy chọn thì rỗng
  useEffect(() => {
    if (filteredTitleList.length === 1) {
      if (title !== filteredTitleList[0]) {
        setTitle(filteredTitleList[0]);
      }
    } else if (filteredTitleList.length > 1) {
      if (title && !filteredTitleList.includes(title)) {
        setTitle('');
      }
    } else {
      if (title) setTitle('');
    }
  }, [filteredTitleList]);

  // Khi chọn Tên tài liệu: 
  // - Nếu đã có dữ liệu lưu tại máy (localStorage/Firestore): LẬP TỨC đưa vào dropdown Chương
  // - Nếu là tùy chọn chưa chọn trước đó: Đồng bộ từ Google Drive, lưu FolderID và thêm dữ liệu vào lưu tại máy
  const prevTitleRef = useRef<string>(title);
  useEffect(() => {
    const titleChanged = prevTitleRef.current !== title;
    prevTitleRef.current = title;

    if (!titleChanged) return;

    // Reset cấp con khi đổi Tài liệu
    setChuong('');
    setBai('');
    setVanDe('');
    setChuyenDe('');
    setChuongList([]);

    if (title && title.trim() !== '') {
      // 1. KIỂM TRA DỮ LIỆU ĐÃ CÓ TẠI MÁY CHƯA
      const currentStore = getStoredHierarchy();
      const localChuongs = currentStore[title] ? Object.keys(currentStore[title]).filter(Boolean) : [];
      const docChuongs = documents.filter(d => d.title === title).map(d => d.chuong).filter((x): x is string => Boolean(x));
      const combinedLocal = Array.from(new Set([...localChuongs, ...docChuongs]));

      if (combinedLocal.length > 0) {
        // NẾU CHỌN TÙY CHỌN ĐÃ CÓ: LẬP TỨC DÙNG DỮ LIỆU LƯU TẠI MÁY ĐƯA VÀO
        setChuongList(combinedLocal);
        setSyncingLevel(null);
      } else {
        // NẾU CHỌN TÙY CHỌN CHƯA CÓ TRƯỚC ĐÓ: ĐỒNG BỘ VÀ THÊM DỮ LIỆU VÀO LƯU TẠI MÁY
        setSyncingLevel('chuong');

        (async () => {
          try {
            const res = await getNestedDriveTree(['myApp', 'LopU', 'TaiLieu', title]);
            if (res.success && res.tree && res.tree.children) {
              const driveChuongs: string[] = [];
              const updatedStore = getStoredHierarchy();
              if (!updatedStore[title]) {
                updatedStore[title] = {};
              }

              for (const chNode of res.tree.children) {
                if (chNode.type === 'folder') {
                  driveChuongs.push(chNode.name);
                  if (!updatedStore[title][chNode.name]) {
                    updatedStore[title][chNode.name] = {};
                  }
                  if (chNode.children) {
                    for (const bNode of chNode.children) {
                      if (bNode.type === 'folder') {
                        if (!updatedStore[title][chNode.name][bNode.name]) {
                          updatedStore[title][chNode.name][bNode.name] = {};
                        }
                        if (bNode.children) {
                          for (const vNode of bNode.children) {
                            if (vNode.type === 'folder') {
                              if (!updatedStore[title][chNode.name][bNode.name][vNode.name]) {
                                updatedStore[title][chNode.name][bNode.name][vNode.name] = [];
                              }
                              if (vNode.children) {
                                for (const cdNode of vNode.children) {
                                  if (cdNode.type === 'folder' && !updatedStore[title][chNode.name][bNode.name][vNode.name].includes(cdNode.name)) {
                                    updatedStore[title][chNode.name][bNode.name][vNode.name].push(cdNode.name);
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
              // Thêm dữ liệu vào lưu tại máy (localStorage)
              saveStoredHierarchy(updatedStore);
              if (driveChuongs.length > 0) {
                setChuongList(Array.from(new Set(driveChuongs)));
              }
            }
          } catch (err) {
            console.warn('NavigationContainer auto sync chuong error:', err);
          } finally {
            setTimeout(() => {
              setSyncingLevel(null);
            }, 600);
          }
        })();
      }
    } else {
      setSyncingLevel(null);
    }
  }, [title]);

  // Khi chọn Chương:
  // - Nếu đã có tại máy: LẬP TỨC dùng dữ liệu lưu tại máy đưa vào Bài
  // - Nếu chưa có: Đồng bộ từ Google Drive và thêm dữ liệu vào lưu tại máy
  const prevChuongRef = useRef<string>(chuong);
  useEffect(() => {
    const chuongChanged = prevChuongRef.current !== chuong;
    prevChuongRef.current = chuong;

    if (!chuongChanged) return;

    setBai('');
    setVanDe('');
    setChuyenDe('');
    setBaiList([]);

    if (title && chuong && chuong.trim() !== '') {
      const currentStore = getStoredHierarchy();
      const localBais = currentStore[title]?.[chuong] ? Object.keys(currentStore[title][chuong]).filter(Boolean) : [];
      const docBais = documents.filter(d => d.title === title && d.chuong === chuong).map(d => d.bai).filter((x): x is string => Boolean(x));
      const combinedLocalBais = Array.from(new Set([...localBais, ...docBais]));

      if (combinedLocalBais.length > 0) {
        // Tùy chọn đã có -> Lập tức dùng dữ liệu lưu tại máy đưa vào
        setBaiList(combinedLocalBais);
        setSyncingLevel(null);
      } else {
        // Tùy chọn chưa có trước đó -> Đồng bộ từ Drive và thêm dữ liệu vào lưu tại máy
        setSyncingLevel('bai');
        (async () => {
          try {
            const res = await getNestedDriveTree(['myApp', 'LopU', 'TaiLieu', title, chuong]);
            if (res.success && res.tree && res.tree.children) {
              const driveBais: string[] = [];
              const updatedStore = getStoredHierarchy();
              if (!updatedStore[title]) updatedStore[title] = {};
              if (!updatedStore[title][chuong]) updatedStore[title][chuong] = {};

              for (const bNode of res.tree.children) {
                if (bNode.type === 'folder') {
                  driveBais.push(bNode.name);
                  if (!updatedStore[title][chuong][bNode.name]) {
                    updatedStore[title][chuong][bNode.name] = {};
                  }
                  if (bNode.children) {
                    for (const vNode of bNode.children) {
                      if (vNode.type === 'folder') {
                        if (!updatedStore[title][chuong][bNode.name][vNode.name]) {
                          updatedStore[title][chuong][bNode.name][vNode.name] = [];
                        }
                        if (vNode.children) {
                          for (const cdNode of vNode.children) {
                            if (cdNode.type === 'folder' && !updatedStore[title][chuong][bNode.name][vNode.name].includes(cdNode.name)) {
                              updatedStore[title][chuong][bNode.name][vNode.name].push(cdNode.name);
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
              saveStoredHierarchy(updatedStore);
              if (driveBais.length > 0) {
                setBaiList(Array.from(new Set(driveBais)));
              }
            }
          } catch (err) {
            console.warn('NavigationContainer auto sync bai error:', err);
          } finally {
            setTimeout(() => {
              setSyncingLevel(null);
            }, 600);
          }
        })();
      }
    } else {
      if (syncingLevel === 'bai') setSyncingLevel(null);
    }
  }, [chuong, title]);

  // Khi chọn Bài:
  // - Nếu đã có tại máy: LẬP TỨC dùng dữ liệu lưu tại máy đưa vào Vấn đề
  // - Nếu chưa có: Đồng bộ từ Google Drive và thêm dữ liệu vào lưu tại máy
  const prevBaiRef = useRef<string>(bai);
  useEffect(() => {
    const baiChanged = prevBaiRef.current !== bai;
    prevBaiRef.current = bai;

    if (!baiChanged) return;

    setVanDe('');
    setChuyenDe('');
    setVanDeList([]);

    if (title && chuong && bai && bai.trim() !== '') {
      const currentStore = getStoredHierarchy();
      const localVanDes = currentStore[title]?.[chuong]?.[bai] ? Object.keys(currentStore[title][chuong][bai]).filter(Boolean) : [];
      const docVanDes = documents.filter(d => d.title === title && d.chuong === chuong && d.bai === bai).map(d => d.vanDe).filter((x): x is string => Boolean(x));
      const combinedLocalVanDes = Array.from(new Set([...localVanDes, ...docVanDes]));

      if (combinedLocalVanDes.length > 0) {
        // Tùy chọn đã có -> Lập tức dùng dữ liệu lưu tại máy
        setVanDeList(combinedLocalVanDes);
        setSyncingLevel(null);
      } else {
        // Tùy chọn chưa có -> Đồng bộ từ Drive và thêm vào lưu tại máy
        setSyncingLevel('vanDe');
        (async () => {
          try {
            const res = await getNestedDriveTree(['myApp', 'LopU', 'TaiLieu', title, chuong, bai]);
            if (res.success && res.tree && res.tree.children) {
              const driveVanDes: string[] = [];
              const updatedStore = getStoredHierarchy();
              if (!updatedStore[title]) updatedStore[title] = {};
              if (!updatedStore[title][chuong]) updatedStore[title][chuong] = {};
              if (!updatedStore[title][chuong][bai]) updatedStore[title][chuong][bai] = {};

              for (const vNode of res.tree.children) {
                if (vNode.type === 'folder') {
                  driveVanDes.push(vNode.name);
                  if (!updatedStore[title][chuong][bai][vNode.name]) {
                    updatedStore[title][chuong][bai][vNode.name] = [];
                  }
                  if (vNode.children) {
                    for (const cdNode of vNode.children) {
                      if (cdNode.type === 'folder' && !updatedStore[title][chuong][bai][vNode.name].includes(cdNode.name)) {
                        updatedStore[title][chuong][bai][vNode.name].push(cdNode.name);
                      }
                    }
                  }
                }
              }
              saveStoredHierarchy(updatedStore);
              if (driveVanDes.length > 0) {
                setVanDeList(Array.from(new Set(driveVanDes)));
              }
            }
          } catch (err) {
            console.warn('NavigationContainer auto sync vanDe error:', err);
          } finally {
            setTimeout(() => {
              setSyncingLevel(null);
            }, 600);
          }
        })();
      }
    } else {
      if (syncingLevel === 'vanDe') setSyncingLevel(null);
    }
  }, [bai, chuong, title]);

  // Khi chọn Vấn đề:
  // - Nếu đã có tại máy: LẬP TỨC dùng dữ liệu lưu tại máy đưa vào Chuyên đề
  // - Nếu chưa có: Đồng bộ từ Google Drive và thêm dữ liệu vào lưu tại máy
  const prevVanDeRef = useRef<string>(vanDe);
  useEffect(() => {
    const vanDeChanged = prevVanDeRef.current !== vanDe;
    prevVanDeRef.current = vanDe;

    if (!vanDeChanged) return;

    setChuyenDe('');
    setChuyenDeList([]);

    if (title && chuong && bai && vanDe && vanDe.trim() !== '') {
      const currentStore = getStoredHierarchy();
      const localChuyenDes = currentStore[title]?.[chuong]?.[bai]?.[vanDe] || [];
      const docChuyenDes = documents.filter(d => d.title === title && d.chuong === chuong && d.bai === bai && d.vanDe === vanDe).map(d => d.chuyenDe).filter((x): x is string => Boolean(x));
      const combinedLocalChuyenDes = Array.from(new Set([...localChuyenDes, ...docChuyenDes]));

      if (combinedLocalChuyenDes.length > 0) {
        // Tùy chọn đã có -> Lập tức dùng dữ liệu lưu tại máy
        setChuyenDeList(combinedLocalChuyenDes);
        setSyncingLevel(null);
      } else {
        // Tùy chọn chưa có -> Đồng bộ từ Drive và thêm vào lưu tại máy
        setSyncingLevel('chuyenDe');
        (async () => {
          try {
            const res = await getNestedDriveTree(['myApp', 'LopU', 'TaiLieu', title, chuong, bai, vanDe]);
            if (res.success && res.tree && res.tree.children) {
              const driveChuyenDes: string[] = [];
              const updatedStore = getStoredHierarchy();
              if (!updatedStore[title]) updatedStore[title] = {};
              if (!updatedStore[title][chuong]) updatedStore[title][chuong] = {};
              if (!updatedStore[title][chuong][bai]) updatedStore[title][chuong][bai] = {};
              if (!updatedStore[title][chuong][bai][vanDe]) updatedStore[title][chuong][bai][vanDe] = [];

              for (const cdNode of res.tree.children) {
                if (cdNode.type === 'folder') {
                  driveChuyenDes.push(cdNode.name);
                  if (!updatedStore[title][chuong][bai][vanDe].includes(cdNode.name)) {
                    updatedStore[title][chuong][bai][vanDe].push(cdNode.name);
                  }
                }
              }
              saveStoredHierarchy(updatedStore);
              if (driveChuyenDes.length > 0) {
                setChuyenDeList(Array.from(new Set(driveChuyenDes)));
              }
            }
          } catch (err) {
            console.warn('NavigationContainer auto sync chuyenDe error:', err);
          } finally {
            setTimeout(() => {
              setSyncingLevel(null);
            }, 600);
          }
        })();
      }
    } else {
      if (syncingLevel === 'chuyenDe') setSyncingLevel(null);
    }
  }, [vanDe, bai, chuong, title]);

  const handleConfirmAddItem = async () => {
    if (!newItemText.trim() || isAddingFolder) return;
    const raw = newItemText.trim();
    let val = raw;
    if (addingLevel === 'title') {
      val = formatDocumentTitle(subject, grade, raw);
    } else if (addModalType === 'danhGia') {
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
    setSyncingLevel(addingLevel as any);
    setModalAddError(null);

    let driveRes = await createByPath(pathSegments);

    // Tự động kích hoạt đăng nhập lại nếu Token Google Drive hết hạn (401)
    if (!driveRes.success && (driveRes.message.includes('401') || driveRes.message.includes('hết hạn') || driveRes.message.includes('authentication credential'))) {
      const reConn = await connectGoogleDrive();
      if (reConn.success) {
        driveRes = await createByPath(pathSegments);
      }
    }

    if (!driveRes.success) {
      setIsAddingFolder(false);
      setSyncingLevel(null);
      const errMsg = driveRes.message || 'Tạo chưa thành công trên Google Drive';
      setModalAddError(errMsg);
      return;
    }

    const currentStore = getStoredHierarchy();

    if (addingLevel === 'title') {
      setTitleList(prev => Array.from(new Set([...prev, val])));
      if (!currentStore[val]) currentStore[val] = {};
      saveStoredHierarchy(currentStore);
      setTitle(val);
      if (addModalType === 'danhGia') {
        setChuong('');
        setBai('');
        setVanDe('');
        setChuyenDe('');
      }
    } else if (addingLevel === 'chuong') {
      setChuongList(prev => Array.from(new Set([...prev, val])));
      if (title) {
        if (!currentStore[title]) currentStore[title] = {};
        if (!currentStore[title][val]) currentStore[title][val] = {};
        saveStoredHierarchy(currentStore);
      }
      setChuong(val);
      if (addModalType === 'danhGia') {
        setBai('');
        setVanDe('');
        setChuyenDe('');
      }
    } else if (addingLevel === 'bai') {
      setBaiList(prev => Array.from(new Set([...prev, val])));
      if (title && chuong) {
        if (!currentStore[title]) currentStore[title] = {};
        if (!currentStore[title][chuong]) currentStore[title][chuong] = {};
        if (!currentStore[title][chuong][val]) currentStore[title][chuong][val] = {};
        saveStoredHierarchy(currentStore);
      }
      setBai(val);
      if (addModalType === 'danhGia') {
        setVanDe('');
        setChuyenDe('');
      }
    } else if (addingLevel === 'vanDe') {
      setVanDeList(prev => Array.from(new Set([...prev, val])));
      if (title && chuong && bai) {
        if (!currentStore[title]) currentStore[title] = {};
        if (!currentStore[title][chuong]) currentStore[title][chuong] = {};
        if (!currentStore[title][chuong][bai]) currentStore[title][chuong][bai] = {};
        if (!currentStore[title][chuong][bai][val]) currentStore[title][chuong][bai][val] = [];
        saveStoredHierarchy(currentStore);
      }
      setVanDe(val);
      if (addModalType === 'danhGia') {
        setChuyenDe('');
      }
    } else if (addingLevel === 'chuyenDe') {
      setChuyenDeList(prev => Array.from(new Set([...prev, val])));
      if (title && chuong && bai && vanDe) {
        if (!currentStore[title]) currentStore[title] = {};
        if (!currentStore[title][chuong]) currentStore[title][chuong] = {};
        if (!currentStore[title][chuong][bai]) currentStore[title][chuong][bai] = {};
        if (!currentStore[title][chuong][bai][vanDe]) currentStore[title][chuong][bai][vanDe] = [];
        if (!currentStore[title][chuong][bai][vanDe].includes(val)) {
          currentStore[title][chuong][bai][vanDe].push(val);
        }
        saveStoredHierarchy(currentStore);
      }
      setChuyenDe(val);
    }

    setIsAddingFolder(false);
    setModalAddError(null);
    setShowAddModal(false);

    // Giữ chữ Đang đồng bộ màu đỏ đến khi danh sách xổ xuống cập nhật hoàn tất
    setTimeout(() => {
      setSyncingLevel(null);
    }, 400);

    const isExisted = driveRes.status === 'existed';
    setNotification({
      text: isExisted
        ? `[QuanLyDrive] Thư mục "${val}" đã tồn tại và được liên kết thành công!`
        : `[QuanLyDrive] Đã tạo mới thành công thư mục "${val}" trên Google Drive (ID: ${driveRes.id || 'N/A'})!`,
      type: 'success',
    });
    setTimeout(() => setNotification(null), 6000);
  };

  const handleDeleteItem = (lvl: string, itm: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeletingItem(false);
    setDeleteConfirm({ level: lvl, item: itm });
  };

  const executeDeleteItem = async () => {
    if (!deleteConfirm || isDeletingItem) return;
    setIsDeletingItem(true);
    const { level: lvl, item: itm } = deleteConfirm;

    const pathSegments: string[] = ['myApp', 'LopU', 'TaiLieu'];
    if (lvl === 'title') pathSegments.push(itm);
    else if (lvl === 'chuong') pathSegments.push(title || 'TaiLieuChung', itm);
    else if (lvl === 'bai') pathSegments.push(title || 'TaiLieuChung', chuong || 'Chuong1', itm);
    else if (lvl === 'vanDe') pathSegments.push(title || 'TaiLieuChung', chuong || 'Chuong1', bai || 'Bai1', itm);
    else if (lvl === 'chuyenDe') pathSegments.push(title || 'TaiLieuChung', chuong || 'Chuong1', bai || 'Bai1', vanDe || 'VanDe1', itm);

    try {
      const deleteRes = await deleteByPath(pathSegments);

      if (deleteRes.success) {
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
        setNotification({ text: `[QuanLyDrive] Đã xóa vĩnh viễn mục "${itm}" trên Google Drive (Thùng rác) và ứng dụng!`, type: 'success' });
      } else {
        setNotification({ text: `Xóa không thành công: ${deleteRes.message}`, type: 'error' });
      }
    } finally {
      setIsDeletingItem(false);
      setDeleteConfirm(null);
    }
    setTimeout(() => setNotification(null), 5000);
  };

  // Render dropdown gọn gàng: BỎ nút "+ Nhập ngoài" bên ngoài, Nút trong đổi thành "Thêm"
  // Sau tên nhãn (ví dụ: Tên tài liệu) hiển thị dòng chữ màu đỏ "Đang đồng bộ" khi đang đồng bộ
  const renderCleanDropdown = (
    lvl: string,
    label: string,
    currentVal: string,
    options: string[],
    isPrimary: boolean = false
  ) => {
    const isOpen = openDropdown === lvl;
    const isLevelSyncing = isWordResyncing || syncingLevel === lvl;

    return (
      <div className="space-y-1 relative">
        <div className="flex items-center justify-between pb-0.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <label className={`text-[11px] font-bold block ${isPrimary ? 'text-indigo-900' : 'text-slate-700'}`}>
              {label}
            </label>
            {isLevelSyncing && (
              <span className="text-red-600 font-bold text-[11px] ml-1 animate-pulse flex items-center gap-1">
                <RotateCcw className="w-3 h-3 text-red-600 animate-spin shrink-0" />
                <span>Đang đồng bộ</span>
              </span>
            )}
          </div>
        </div>
        
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
                        if (!opt || isDanhGia(opt)) {
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
                        lastLoadedDocKeyRef.current = '';
                        const cleanOpt = opt.replace(/^(?:Chuyên\s*đề|Chuyen\s*de)\s*:?\s*/i, '').trim();
                        const cached = localStorage.getItem(`lopu_kienthuc_${opt}`)
                          || localStorage.getItem(`lopu_kienthuc_${cleanOpt}`)
                          || localStorage.getItem(`lopu_kienthuc_file_KienThuc_LyThuyetTrongTam.html_${opt}`)
                          || localStorage.getItem(`lopu_kienthuc_file_KienThuc_LyThuyetTrongTam.html_${cleanOpt}`)
                          || localStorage.getItem('lopu_drive_file_content_name_KienThuc_LyThuyetTrongTam.html');
                        if (cached && cached.trim()) {
                          if (editorRef.current) {
                            editorRef.current.innerHTML = cached;
                          }
                          setWordDocumentHtml(cached);
                        }
                        if (opt) {
                          setIsSidePanelCollapsed(true);
                        }
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
    if (!hasAuthoringPermission) {
      setNotification({ text: '⚠️ Bạn không có Quyền biên soạn tài liệu!', type: 'warning' });
      return;
    }
    if (!title.trim()) {
      setNotification({ text: 'Vui lòng nhập hoặc chọn Tên tài liệu trước khi lưu!', type: 'error' });
      return;
    }
    try {
      setIsSaving(true);
      setSyncStatus('saving');
      const contentHtml = editorRef.current?.innerHTML || '';
      const res = await saveDocumentToDriveAndDatabase({
        title: title.trim(),
        subject,
        grade,
        chuong: chuong.trim(),
        bai: bai.trim(),
        vanDe: vanDe.trim(),
        chuyenDe: chuyenDe.trim(),
        tienTrinh: tienTrinhChuyenDe,
        kienThucName: selectedKienThucName,
        selectedKienThucName,
        selectedExerciseName,
        contentHtml,
        textContent: contentHtml.replace(/<[^>]*>/g, ''),
        selectedClasses: targetClasses,
        isForSale,
        priceDiamonds,
      });

      if (res.success) {
        const timeStr = res.savedAt || new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        setSyncStatus('saved');
        setLastSavedTime(timeStr);
        setNotification({
          text: res.message || `Đã lưu Drive thành công! (${timeStr})`,
          type: 'success',
        });
        setTimeout(() => {
          setSyncStatus('idle');
        }, 1500);
      } else {
        setSyncStatus('idle');
        setNotification({
          text: res.error || 'Có lỗi xảy ra khi lưu tài liệu. Vui lòng thử lại!',
          type: 'error',
        });
      }
    } catch (err: any) {
      setSyncStatus('idle');
      setNotification({
        text: err?.message || 'Có lỗi xảy ra khi lưu tài liệu. Vui lòng thử lại!',
        type: 'error',
      });
    } finally {
      setIsSaving(false);
      setTimeout(() => setNotification(null), 5000);
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

      {/* NẾU CHUYÊN ĐỀ RỖNG: Ẩn cửa sổ Word, Mở rộng Tài liệu & NỘI DUNG DẠY HỌC */}
      {!isChuyenDeSelected ? (
        <div className="max-w-5xl mx-auto space-y-4 animate-fade-in">
          {/* Bố cục 2 cột: Cột TÀI LIỆU 40% độ rộng, Cột NỘI DUNG DẠY HỌC 60% độ rộng */}
          <div className="flex flex-col md:flex-row gap-4 items-start w-full">
            {/* 1. CỘT TÀI LIỆU (40% ĐỘ RỘNG) */}
            <div className="w-full md:w-[40%] bg-white p-4 rounded-2xl border border-indigo-200 shadow-xs space-y-3 shrink-0">
              <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
                <span className="text-[11px] font-black uppercase text-indigo-900 tracking-wider flex items-center gap-1.5">
                  <span
                    title="module BoChonHocLieuTienTrinh (Module dùng chung)"
                    className="inline-flex items-center cursor-help"
                  >
                    <FolderLock className="w-3.5 h-3.5 text-indigo-600 hover:text-indigo-800 transition-colors shrink-0" />
                  </span>
                  TÀI LIỆU
                </span>
                <span className="text-[10px] text-indigo-600 font-semibold">Môn học + Khối lớp ➔ Tên tài liệu</span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1">Môn học</label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold focus:outline-indigo-600 bg-white cursor-pointer"
                  >
                    <option value="">-- (Để trống) --</option>
                    <option value="Toán">Toán</option>
                    <option value="Lý">Lý</option>
                    <option value="Hóa">Hóa</option>
                    <option value="Sinh">Sinh</option>
                    <option value="Tin">Tin</option>
                    <option value="Anh">Anh</option>
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

              <div className="pt-1">
                {renderCleanDropdown('title', 'Tên tài liệu', title, filteredTitleList, true)}
              </div>
            </div>

            {/* 2. CỘT NỘI DUNG DẠY HỌC (60% ĐỘ RỘNG) */}
            <div className="w-full md:w-[60%] bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3.5 flex-1">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-[11px] font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                  <FolderTree className="w-3.5 h-3.5 text-slate-500" /> NỘI DUNG DẠY HỌC
                </span>
                <span className="text-[10px] text-slate-400 italic">Chương ➔ Bài ➔ Vấn đề ➔ Chuyên đề</span>
              </div>

              {title && title.trim() !== '' ? (() => {
                const hierarchyStore = getStoredHierarchy();
                const currentDocObj = (title && hierarchyStore[title]) ? hierarchyStore[title] : {};
                const activeChuongList = Array.from(new Set([
                  ...Object.keys(currentDocObj),
                  ...chuongList,
                  ...documents.filter(d => d.title === title).map(d => d.chuong).filter((x): x is string => Boolean(x))
                ]));

                const currentChuongObj = (chuong && currentDocObj[chuong]) ? currentDocObj[chuong] : {};
                const activeBaiList = (chuong)
                  ? Array.from(new Set([
                      ...Object.keys(currentChuongObj),
                      ...baiList,
                      ...documents.filter(d => d.title === title && d.chuong === chuong).map(d => d.bai).filter((x): x is string => Boolean(x))
                    ]))
                  : [];

                const currentBaiObj = (bai && currentChuongObj[bai]) ? currentChuongObj[bai] : {};
                const activeVanDeList = (chuong && bai)
                  ? Array.from(new Set([
                      ...Object.keys(currentBaiObj),
                      ...vanDeList,
                      ...documents.filter(d => d.title === title && d.chuong === chuong && d.bai === bai).map(d => d.vanDe).filter((x): x is string => Boolean(x))
                    ]))
                  : [];

                const currentVanDeList = (vanDe && currentBaiObj[vanDe]) ? currentBaiObj[vanDe] : [];
                const activeChuyenDeList = (chuong && bai && vanDe)
                  ? Array.from(new Set([
                      ...(Array.isArray(currentVanDeList) ? currentVanDeList : []),
                      ...chuyenDeList,
                      ...documents.filter(d => d.title === title && d.chuong === chuong && d.bai === bai && d.vanDe === vanDe).map(d => d.chuyenDe).filter((x): x is string => Boolean(x))
                    ]))
                  : [];

                return (
                  <div className="space-y-3.5">
                    {!isDanhGia(title) ? (
                      <>
                        {renderCleanDropdown('chuong', 'Chương', chuong, activeChuongList)}
                        {!isDanhGia(chuong) ? (
                          <>
                            {renderCleanDropdown('bai', 'Bài', bai, activeBaiList)}
                            {!isDanhGia(bai) ? (
                              <>
                                {renderCleanDropdown('vanDe', 'Vấn đề', vanDe, activeVanDeList)}
                                {!isDanhGia(vanDe) ? (
                                  renderCleanDropdown('chuyenDe', 'Chuyên đề', chuyenDe, activeChuyenDeList)
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
                  </div>
                );
              })() : (
                <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center text-xs text-slate-500 font-medium">
                  ℹ️ Vui lòng chọn hoặc thêm <strong>TÊN TÀI LIỆU</strong> bên trái để hiển thị <strong>NỘI DUNG DẠY HỌC</strong> (Chương, Bài, Vấn đề, Chuyên đề).
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* NẾU CHUYÊN ĐỀ KHÁC RỖNG: Thu gọn Tài liệu & NỘI DUNG BÀI DẠY, Hiện cửa sổ Soạn thảo Word toàn màn hình */
        <div className="space-y-4 animate-fade-in">
          {/* Thanh Phân cấp Thu Gọn Dành trọn vẹn màn hình cho Word */}
          <div className="bg-white p-3.5 rounded-2xl border border-indigo-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 flex-1 min-w-[280px] flex-wrap">
              <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 shrink-0">
                <FolderLock className="w-4 h-4" />
              </span>

              {/* Bỏ chữ 'Chuyên đề:' ở đầu dòng, đưa luôn dropdown Tiến trình lên thay thế */}
              <div className="flex items-center gap-1 shrink-0">
                <select
                  id="select-tien-trinh-chuyen-de-word"
                  value={tienTrinhChuyenDe}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTienTrinhChuyenDe(val);
                    if (val) {
                      setNotification({
                        text: `Tiến trình: ${val}`,
                        type: 'info',
                      });
                      setTimeout(() => setNotification(null), 3000);
                    }
                  }}
                  className="text-xs font-black bg-white border border-indigo-300 rounded-lg px-2.5 py-1 text-indigo-900 shadow-2xs cursor-pointer focus:ring-2 focus:ring-indigo-500 hover:bg-indigo-50/70 transition-colors"
                  title="Chọn tiến trình (1. Kiến thức, 2. Luyện tập, 3. KTDG, 4. Cải thiện)"
                >
                  <option value="Kiến thức">📚 1. Kiến thức</option>
                  <option value="Luyện tập">✍️ 2. Luyện tập</option>
                  <option value="KTDG">🎯 3. KTDG</option>
                  <option value="Cải thiện">🚀 4. Cải thiện</option>
                </select>
              </div>

              {/* Tên Chuyên đề */}
              <span className="font-extrabold text-indigo-950 bg-indigo-50/90 px-3 py-1 rounded-lg border border-indigo-200 text-xs shadow-2xs shrink-0 max-w-xs truncate flex items-center gap-1.5" title={chuyenDe}>
                <span>{chuyenDe}</span>
                {isLoadingFromDrive && (
                  <span className="text-[10px] text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded flex items-center gap-1 font-semibold animate-pulse">
                    <Loader2 className="w-3 h-3 animate-spin text-amber-600" />
                    <span>Đang nạp Drive...</span>
                  </span>
                )}
              </span>

              {/* Dropdown chọn tên bài luyện tập / KTDG tương ứng với tùy chọn bên dropdown tiến trình */}
              {(() => {
                const hierarchyStore = getStoredHierarchy();
                const currentDocObj = (title && hierarchyStore[title]) ? hierarchyStore[title] : {};
                const currentChuongObj = (chuong && currentDocObj[chuong]) ? currentDocObj[chuong] : {};
                const currentBaiObj = (bai && currentChuongObj[bai]) ? currentChuongObj[bai] : {};
                const currentVanDeList = (vanDe && currentBaiObj[vanDe]) ? currentBaiObj[vanDe] : [];
                const activeChuyenDeList: string[] = (chuong && bai && vanDe)
                  ? Array.from(new Set([
                      ...(Array.isArray(currentVanDeList) ? currentVanDeList : []),
                      ...chuyenDeList,
                      ...documents.filter(d => d.title === title && d.chuong === chuong && d.bai === bai && d.vanDe === vanDe).map(d => d.chuyenDe).filter((x): x is string => Boolean(x))
                    ]))
                  : [];

                // Lọc danh sách bài tương ứng theo tiến trình
                const luyenTapExercises = activeChuyenDeList.filter(item => isDanhGia(item) || /luyentap|luyện tập/i.test(item));
                const ktdgExercises = activeChuyenDeList.filter(item => /ktdg|kiểm tra|danhgia|đánh giá/i.test(item));

                if (tienTrinhChuyenDe === 'Kiến thức') {
                  const list = customKienThucList.length > 0 ? customKienThucList : ['Lý thuyết trọng tâm'];
                  const curVal = selectedKienThucName && list.includes(selectedKienThucName) ? selectedKienThucName : list[0];
                  return (
                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                      <span className="text-[11px] font-bold text-slate-500">Bài:</span>
                      <select
                        id="select-exercise-kienthuc"
                        value={curVal}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSelectedKienThucName(val);
                          setNotification({
                            text: `Đã chọn: ${val} (Lưu thành KienThuc_${formatSafeSlug(val)}.html)`,
                            type: 'info',
                          });
                          setTimeout(() => setNotification(null), 2500);
                        }}
                        className="text-xs font-bold bg-white border border-indigo-200 rounded-lg px-2.5 py-1 text-indigo-950 shadow-2xs cursor-pointer focus:ring-2 focus:ring-indigo-500 hover:bg-indigo-50/60 transition-colors max-w-xs truncate"
                        title="Chọn bài kiến thức"
                      >
                        {list.map((kt, idx) => (
                          <option key={`${kt}-${idx}`} value={kt}>
                            📚 {kt}
                          </option>
                        ))}
                      </select>

                      {/* Nút thao tác dành riêng cho giáo viên */}
                      {isTeacherOrHigher(currentRole) && (
                        <>
                          {/* Nút Thêm mới */}
                          <button
                            type="button"
                            onClick={() => {
                              const defaultNew = `Kiến thức ${list.length + 1}`;
                              setItemActionModal({
                                type: 'rename',
                                category: 'kienThuc',
                                item: '',
                                newName: defaultNew,
                              });
                            }}
                            className="px-2 py-1 rounded-lg text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 cursor-pointer shadow-2xs"
                            title="Thêm file kiến thức mới"
                          >
                            + Thêm bài
                          </button>

                          {/* Nút Sửa tên */}
                          <button
                            type="button"
                            onClick={() => {
                              setItemActionModal({
                                type: 'rename',
                                category: 'kienThuc',
                                item: curVal,
                                newName: curVal,
                              });
                            }}
                            className="p-1 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 cursor-pointer shadow-2xs"
                            title="Đổi tên bài kiến thức đang chọn"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Nút Xóa */}
                          {list.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                setItemActionModal({
                                  type: 'delete',
                                  category: 'kienThuc',
                                  item: curVal,
                                  newName: '',
                                });
                              }}
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 cursor-pointer shadow-2xs"
                              title="Xóa bài kiến thức này"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  );
                }

                if (tienTrinhChuyenDe === 'Luyện tập') {
                  const combined = Array.from(new Set([...customLuyenTapList, ...luyenTapExercises])).filter(Boolean);
                  const list = combined;
                  const curVal = selectedExerciseName && list.includes(selectedExerciseName) ? selectedExerciseName : (list[0] || '');
                  return (
                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                      <span className="text-[11px] font-bold text-slate-500">Bài:</span>
                      <select
                        id="select-exercise-luyentap"
                        value={curVal}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (!val) return;
                          setSelectedExerciseName(val);
                          setNotification({
                            text: `Đã chọn: ${val} (Lưu thành luyentap_${formatSafeSlug(val)}.json)`,
                            type: 'info',
                          });
                          setTimeout(() => setNotification(null), 2500);
                        }}
                        className="text-xs font-bold bg-white border border-indigo-200 rounded-lg px-2.5 py-1 text-indigo-950 shadow-2xs cursor-pointer focus:ring-2 focus:ring-indigo-500 hover:bg-indigo-50/60 transition-colors max-w-xs truncate"
                        title="Chọn bài luyện tập"
                      >
                        {list.length === 0 ? (
                          <option value="">-- (Chưa có bài - Bấm "+ Thêm bài") --</option>
                        ) : (
                          list.map((ex, idx) => (
                            <option key={`${ex}-${idx}`} value={ex}>
                              ✍️ {ex}
                            </option>
                          ))
                        )}
                      </select>

                      {/* Nút thao tác dành riêng cho giáo viên */}
                      {isTeacherOrHigher(currentRole) && (
                        <>
                          {/* Nút Thêm mới */}
                          <button
                            type="button"
                            onClick={() => {
                              setItemActionModal({
                                type: 'rename',
                                category: 'luyenTap',
                                item: '',
                                newName: '',
                              });
                            }}
                            className="px-2 py-1 rounded-lg text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 cursor-pointer shadow-2xs"
                            title="Thêm bài luyện tập mới"
                          >
                            + Thêm bài
                          </button>

                          {/* Nút Sửa tên */}
                          {curVal && (
                            <button
                              type="button"
                              onClick={() => {
                                setItemActionModal({
                                  type: 'rename',
                                  category: 'luyenTap',
                                  item: curVal,
                                  newName: curVal,
                                });
                              }}
                              className="p-1 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 cursor-pointer shadow-2xs"
                              title="Đổi tên bài luyện tập này"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Nút Xóa */}
                          {curVal && list.length > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setItemActionModal({
                                  type: 'delete',
                                  category: 'luyenTap',
                                  item: curVal,
                                  newName: '',
                                });
                              }}
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 cursor-pointer shadow-2xs"
                              title="Xóa bài luyện tập này"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  );
                }

                if (tienTrinhChuyenDe === 'KTDG') {
                  const combined = Array.from(new Set([...customKtdgList, ...ktdgExercises])).filter(Boolean);
                  const list = combined;
                  const curVal = selectedExerciseName && list.includes(selectedExerciseName) ? selectedExerciseName : (list[0] || '');
                  return (
                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                      <span className="text-[11px] font-bold text-slate-500">Đề:</span>
                      <select
                        id="select-exercise-ktdg"
                        value={curVal}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (!val) return;
                          setSelectedExerciseName(val);
                          setNotification({
                            text: `Đã chọn bài KTDG: ${val} (Lưu thành KTDG_${formatSafeSlug(val)}.json)`,
                            type: 'info',
                          });
                          setTimeout(() => setNotification(null), 2500);
                        }}
                        className="text-xs font-bold bg-white border border-rose-200 rounded-lg px-2.5 py-1 text-rose-950 shadow-2xs cursor-pointer focus:ring-2 focus:ring-rose-500 hover:bg-rose-50/60 transition-colors max-w-xs truncate"
                        title="Chọn bài kiểm tra đánh giá"
                      >
                        {list.length === 0 ? (
                          <option value="">-- (Chưa có đề - Bấm "+ Thêm đề") --</option>
                        ) : (
                          list.map((ex, idx) => (
                            <option key={`${ex}-${idx}`} value={ex}>
                              🎯 {ex}
                            </option>
                          ))
                        )}
                      </select>

                      {/* Nút thao tác dành riêng cho giáo viên */}
                      {isTeacherOrHigher(currentRole) && (
                        <>
                          {/* Nút Thêm mới */}
                          <button
                            type="button"
                            onClick={() => {
                              setItemActionModal({
                                type: 'rename',
                                category: 'ktdg',
                                item: '',
                                newName: '',
                              });
                            }}
                            className="px-2 py-1 rounded-lg text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 cursor-pointer shadow-2xs"
                            title="Thêm bài kiểm tra đánh giá mới"
                          >
                            + Thêm đề
                          </button>

                          {/* Nút Sửa tên */}
                          {curVal && (
                            <button
                              type="button"
                              onClick={() => {
                                setItemActionModal({
                                  type: 'rename',
                                  category: 'ktdg',
                                  item: curVal,
                                  newName: curVal,
                                });
                              }}
                              className="p-1 rounded-lg text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 cursor-pointer shadow-2xs"
                              title="Đổi tên bài KTDG này"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Nút Xóa */}
                          {curVal && list.length > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setItemActionModal({
                                  type: 'delete',
                                  category: 'ktdg',
                                  item: curVal,
                                  newName: '',
                                });
                              }}
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 cursor-pointer shadow-2xs"
                              title="Xóa bài KTDG này"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  );
                }

                if (tienTrinhChuyenDe === 'Cải thiện') {
                  return (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 shrink-0 shadow-2xs">
                      <span>🚀 Hồ sơ cải thiện học sinh (CaiThien.json)</span>
                    </div>
                  );
                }

                return null;
              })()}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(
                    new CustomEvent('app-navigate-view', { detail: { viewId: 'learning-lophoc' } })
                  );
                }}
                className="px-3 py-1.5 rounded-xl border border-teal-200 bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                title="Quay lại danh sách tài liệu lớp học"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-teal-700" />
                <span>Quay lại Lớp Học</span>
              </button>

              {isTeacherOrHigher(currentRole) && (
                <button
                  type="button"
                  onClick={() => setIsHierarchyExpanded(!isHierarchyExpanded)}
                  className="px-3 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 text-indigo-800 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                  title="Mở rộng / Thu gọn chi tiết Cây phân cấp bài dạy"
                >
                  {isHierarchyExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                  <span>{isHierarchyExpanded ? 'Đóng lại' : 'Đổi chuyên đề'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Chi tiết Phân cấp mở rộng khi nhấn nút (chỉ dành cho giáo viên) */}
          {isTeacherOrHigher(currentRole) && isHierarchyExpanded && (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 shadow-sm animate-scale-up flex flex-col md:flex-row gap-4 items-start w-full">
              {/* Cột 1: TÀI LIỆU (40% độ rộng) */}
              <div className="w-full md:w-[40%] bg-white p-4 rounded-xl border border-slate-200 space-y-3 shrink-0">
                <span className="text-xs font-bold text-indigo-900 block border-b border-indigo-100 pb-1.5 uppercase">TÀI LIỆU</span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-1">Môn học</label>
                    <select
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full px-2 py-1.5 rounded border border-slate-200 text-xs font-semibold bg-white cursor-pointer"
                    >
                      <option value="">-- (Để trống) --</option>
                      <option value="Toán">Toán</option>
                      <option value="Lý">Lý</option>
                      <option value="Hóa">Hóa</option>
                      <option value="Sinh">Sinh</option>
                      <option value="Tin">Tin</option>
                      <option value="Anh">Anh</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-1">Khối lớp</label>
                    <select
                      value={grade}
                      onChange={(e) => setGrade(e.target.value)}
                      className="w-full px-2 py-1.5 rounded border border-slate-200 text-xs font-semibold bg-white cursor-pointer"
                    >
                      <option value="">-- (Để trống) --</option>
                      <option value="Khối 10">Khối 10</option>
                      <option value="Khối 11">Khối 11</option>
                      <option value="Khối 12">Khối 12</option>
                    </select>
                  </div>
                </div>
                {renderCleanDropdown('title', 'Tên tài liệu', title, filteredTitleList, true)}
              </div>

              {/* Cột 2: NỘI DUNG DẠY HỌC (60% độ rộng) */}
              <div className="w-full md:w-[60%] bg-white p-4 rounded-xl border border-slate-200 space-y-2 flex-1">
                <span className="text-xs font-bold text-slate-700 block border-b border-slate-100 pb-1.5 uppercase">NỘI DUNG DẠY HỌC</span>
                {renderCleanDropdown('chuong', 'Chương', chuong, chuongList)}
                {renderCleanDropdown('bai', 'Bài', bai, baiList)}
                {renderCleanDropdown('vanDe', 'Vấn đề', vanDe, vanDeList)}
                {renderCleanDropdown('chuyenDe', 'Chuyên đề', chuyenDe, chuyenDeList)}
              </div>
            </div>
          )}

          {/* Cửa sổ Soạn thảo Word chiếm toàn bộ giao diện ưu tiên */}
          <div className="space-y-4">
            {/* Menu Thanh công cụ Word - Khi ở chế độ PPT sẽ NỔI Ở TRÊN CÙNG toàn màn hình, tích hợp đầy đủ nút Trước, Chọn slide, Slide tiếp, Chèn khoảng trống & Thoát PPT */}
            <div
              className={`bg-white/95 backdrop-blur-md border shadow-2xl flex flex-wrap items-center gap-1.5 transition-all ${
                wordViewMode === 'ppt'
                  ? 'fixed top-2 left-2 right-2 sm:left-4 sm:right-4 z-[60] p-2 rounded-2xl border-purple-300 ring-2 ring-purple-500/20 shadow-purple-900/25 max-h-[88vh] overflow-visible'
                  : 'sticky top-16 z-40 p-2.5 rounded-t-2xl border-slate-300 border-b shadow-lg'
              }`}
              style={wordViewMode === 'ppt' ? { position: 'fixed', top: '8px' } : { top: '64px', position: 'sticky' }}
            >
              {isTeacherOrHigher(currentRole) ? (
                <>
                  {/* CỤM NÚT ĐIỀU KHIỂN TRÌNH CHIẾU PPT TÍCH HỢP TRONG MENU WORD (KHI VIEW === 'ppt') */}
                  {wordViewMode === 'ppt' && (
                    <>
                      <div className="flex items-center gap-1.5 flex-wrap bg-purple-50/90 p-1 rounded-xl border border-purple-200 shadow-2xs">
                        {/* Nút Trước (Lùi bước / Slide trước - Biểu tượng) */}
                        <button
                          type="button"
                          disabled={activePptSlideIndex <= 0 && activePptStepIndex <= 0}
                          onClick={handlePptPrev}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold transition-colors cursor-pointer flex items-center justify-center text-slate-100 shadow-xs"
                          title="Lùi bước / Slide trước (Phím ← hoặc PageUp)"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>

                        {/* Dropdown Chọn slide */}
                        <select
                          value={activePptSlideIndex}
                          onChange={(e) => {
                            const newIdx = Number(e.target.value);
                            setActivePptSlideIndex(newIdx);
                            setActivePptStepIndex(0);
                          }}
                          className="bg-slate-800 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg border border-slate-700 cursor-pointer focus:outline-none max-w-[140px] sm:max-w-[180px] truncate shadow-xs"
                          title="Chọn slide trình chiếu"
                        >
                          {pptSlides.map((s, idx) => (
                            <option key={s.id || idx} value={idx}>
                              {s.title || `Slide ${idx + 1}`}
                            </option>
                          ))}
                        </select>

                        {/* Nút Slide tiếp / Hiện tiếp (Biểu tượng) */}
                        <button
                          type="button"
                          disabled={
                            activePptSlideIndex >= pptSlides.length - 1 &&
                            (revealAllSteps || activePptStepIndex >= currentPptTotalSteps - 1)
                          }
                          onClick={handlePptNext}
                          className="p-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold transition-colors cursor-pointer flex items-center justify-center text-white shadow-xs"
                          title={
                            !revealAllSteps && activePptStepIndex < currentPptTotalSteps - 1
                              ? 'Hiện tiếp hiệu ứng ⚡ (Phím → hoặc Phím Cách)'
                              : 'Slide tiếp theo (Phím → hoặc Phím Cách)'
                          }
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>

                        {/* Nút Từng bước ⚡ / Hiện tất cả nếu slide có nhiều hiệu ứng */}
                        {currentPptTotalSteps > 1 && (
                          <button
                            type="button"
                            onClick={() => setRevealAllSteps(!revealAllSteps)}
                            className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer border ${
                              revealAllSteps
                                ? 'bg-amber-600 text-white border-amber-500'
                                : 'bg-slate-800 text-amber-300 border-amber-700/60 hover:bg-slate-700'
                            }`}
                            title={revealAllSteps ? 'Bật chế độ hiển thị lần lượt từng hiệu ứng' : 'Hiện ngay toàn bộ nội dung trong slide'}
                          >
                            {revealAllSteps ? 'Tất cả' : 'Từng bước ⚡'}
                          </button>
                        )}
                      </div>

                      {/* THANH CÔNG CỤ VIẾT VẼ TAY KỸ THUẬT SỐ KHI XEM PPT (HÌNH 1 - TÍCH HỢP TRỰC TIẾP TRÊN MENU WORD) */}
                      <div className="flex items-center gap-1.5 bg-slate-50/95 p-1 rounded-xl border border-slate-200/90 shadow-2xs flex-wrap">
                        {/* Nút Chuột */}
                        <button
                          type="button"
                          onClick={() => setPptActiveTool('select')}
                          className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                            pptActiveTool === 'select'
                              ? 'bg-slate-800 text-white shadow-xs'
                              : 'text-slate-600 hover:bg-slate-200/70'
                          }`}
                          title="Chuột tương tác / Nhập liệu vào bảng"
                        >
                          <MousePointer className="w-3.5 h-3.5" />
                          <span className="text-[11px] hidden sm:inline">Chuột</span>
                        </button>

                        {/* CỤM 5 NGÒI BÚT TÙY CHỈNH: 5 biểu tượng thể hiện loại bút và màu sắc (Bấm chọn / Giữ ~0.6s hoặc nhấp lại để mở Bảng Cài đặt) */}
                        <div className="relative flex items-center gap-1 bg-slate-200/70 p-0.5 rounded-lg border border-slate-200">
                          {pptPenSlots.map((slot, idx) => {
                            const isPenActive = pptActiveTool === 'pen' && activePenSlotIndex === idx;
                            const typeMeta = getPenTypeMeta(slot.penType);
                            const SlotIcon = typeMeta.icon;

                            return (
                              <button
                                key={slot.id ?? idx}
                                type="button"
                                onPointerDown={() => startPenSlotLongPress(idx)}
                                onPointerUp={cancelPenSlotLongPress}
                                onPointerLeave={cancelPenSlotLongPress}
                                onClick={() => handlePenSlotClick(idx)}
                                className={`px-2 py-1 rounded-md text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center gap-1 relative ${
                                  isPenActive
                                    ? 'bg-white shadow-xs ring-1 ring-slate-300 scale-105'
                                    : 'text-slate-700 hover:bg-slate-200/80'
                                }`}
                                title={`${typeMeta.label} - Nét ${slot.strokeWidth}px - Màu ${slot.color}. Nhấp để chọn. Nhấp lại hoặc giữ để mở bảng cài đặt.`}
                              >
                                <div className="flex items-center gap-0.5">
                                  <SlotIcon
                                    className="w-4 h-4 transition-transform"
                                    style={{
                                      color: slot.color,
                                      filter: slot.color.toLowerCase() === '#ffffff' ? 'drop-shadow(0 0 1px #000)' : undefined,
                                    }}
                                  />
                                  {isPenActive && (
                                    <span
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setPptPenPopupSlotIndex((prev) => (prev === idx ? null : idx));
                                      }}
                                      className="text-[9px] text-slate-400 hover:text-indigo-600 transition-colors ml-0.5 cursor-pointer"
                                      title="Cài đặt ngòi bút này"
                                    >
                                      ▾
                                    </span>
                                  )}
                                </div>
                                {/* Vạch màu sắc thể hiện màu bút */}
                                <span
                                  className="h-1 w-full min-w-[18px] rounded-full shadow-2xs transition-colors"
                                  style={{ backgroundColor: slot.color }}
                                />
                              </button>
                            );
                          })}

                          {/* BẢNG CHỌN CÀI ĐẶT BÚT (HIỆN KHI BẤM GIỮ ~0.6S HOẶC NHẤP CHỌN CÀI ĐẶT CỦA NGÒI BÚT) */}
                          {pptPenPopupSlotIndex !== null && pptPenSlots[pptPenPopupSlotIndex] && (
                            <>
                              <div
                                className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[0.5px]"
                                onClick={() => setPptPenPopupSlotIndex(null)}
                              />
                              <div
                                className="absolute top-full left-0 mt-2 z-50 w-88 sm:w-96 max-w-[95vw] bg-white rounded-2xl border border-slate-200 shadow-2xl p-3.5 space-y-3.5 select-none animate-fadeIn"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {/* Tiêu đề popup */}
                                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                  <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
                                    <Palette className="w-4 h-4 text-indigo-600" />
                                    <span>
                                      Cài đặt ngòi bút {pptPenPopupSlotIndex + 1} ({getPenTypeMeta(pptPenSlots[pptPenPopupSlotIndex].penType).label})
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setPptPenPopupSlotIndex(null)}
                                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                                    title="Đóng bảng cài đặt"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>

                                {/* 1. CHỌN LOẠI BÚT (6 LOẠI: Bút bi, Bút máy, Bút lông, Highlight, Bút chì, Laser) */}
                                <div>
                                  <div className="text-[11px] font-bold text-slate-500 mb-1.5 flex items-center justify-between">
                                    <span>1. Chọn loại bút:</span>
                                  </div>
                                  <div className="grid grid-cols-6 gap-1 p-0.5 bg-slate-100 rounded-xl border border-slate-200/80">
                                    {[
                                      { type: 'ballpoint', label: 'Bút bi', icon: Pen },
                                      { type: 'fountain', label: 'Bút máy', icon: PenTool },
                                      { type: 'brush', label: 'Bút lông', icon: Paintbrush },
                                      { type: 'highlighter', label: 'Highlight', icon: Highlighter },
                                      { type: 'pencil', label: 'Bút chì', icon: Pencil },
                                      { type: 'laser', label: 'Laser', icon: Sparkles },
                                    ].map((p) => {
                                      const Icon = p.icon;
                                      const isCurrentType = pptPenSlots[pptPenPopupSlotIndex].penType === p.type;
                                      return (
                                        <button
                                          key={p.type}
                                          type="button"
                                          onClick={() => handleSlotChangePenType(pptPenPopupSlotIndex, p.type as PenType)}
                                          className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                            isCurrentType
                                              ? 'bg-white text-indigo-700 shadow-xs ring-1 ring-slate-300'
                                              : 'text-slate-600 hover:bg-slate-200/70'
                                          }`}
                                          title={p.label}
                                        >
                                          <Icon className="w-3.5 h-3.5 mb-0.5" />
                                          <span className="truncate max-w-full text-[9px]">{p.label}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>

                                {/* 2. CHỌN ĐỘ ĐẬM NHẠT (NÉT VẼ) */}
                                <div>
                                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-1.5">
                                    <span>2. Độ đậm nhạt (Nét vẽ):</span>
                                    <span className="text-indigo-600 text-[10px] font-bold">
                                      {pptPenSlots[pptPenPopupSlotIndex].strokeWidth}px
                                    </span>
                                  </div>

                                  {/* 3 Nấc nét nhanh */}
                                  <div className="grid grid-cols-3 gap-1 mb-2">
                                    {getPptPenStrokePresets(pptPenSlots[pptPenPopupSlotIndex].penType).map((sz) => (
                                      <button
                                        key={sz.label}
                                        type="button"
                                        onClick={() => handleSlotChangeStrokeWidth(pptPenPopupSlotIndex, sz.size)}
                                        className={`py-1 px-1.5 rounded-lg border text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                          pptPenSlots[pptPenPopupSlotIndex].strokeWidth === sz.size
                                            ? 'bg-indigo-50 border-indigo-400 text-indigo-700 ring-1 ring-indigo-300 shadow-2xs'
                                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                                        }`}
                                      >
                                        <span
                                          className="rounded-full shrink-0"
                                          style={{
                                            width: `${Math.min(10, Math.max(3, sz.size / 2.5))}px`,
                                            height: `${Math.min(10, Math.max(3, sz.size / 2.5))}px`,
                                            backgroundColor: pptPenSlots[pptPenPopupSlotIndex].color,
                                          }}
                                        />
                                        <span>{sz.label}</span>
                                      </button>
                                    ))}
                                  </div>

                                  {/* Thanh trượt điều chỉnh nét */}
                                  <div className="flex items-center gap-2 px-1">
                                    <span className="text-[10px] text-slate-400 font-semibold">Mảnh</span>
                                    <input
                                      type="range"
                                      min={
                                        pptPenSlots[pptPenPopupSlotIndex].penType === 'highlighter' ? 8 :
                                        pptPenSlots[pptPenPopupSlotIndex].penType === 'brush' ? 2 :
                                        pptPenSlots[pptPenPopupSlotIndex].penType === 'fountain' ? 1.2 :
                                        pptPenSlots[pptPenPopupSlotIndex].penType === 'pencil' ? 0.8 :
                                        pptPenSlots[pptPenPopupSlotIndex].penType === 'laser' ? 2 : 1
                                      }
                                      max={
                                        pptPenSlots[pptPenPopupSlotIndex].penType === 'highlighter' ? 36 :
                                        pptPenSlots[pptPenPopupSlotIndex].penType === 'brush' ? 14 :
                                        pptPenSlots[pptPenPopupSlotIndex].penType === 'fountain' ? 8 :
                                        pptPenSlots[pptPenPopupSlotIndex].penType === 'pencil' ? 4 :
                                        pptPenSlots[pptPenPopupSlotIndex].penType === 'laser' ? 10 : 6
                                      }
                                      step={
                                        pptPenSlots[pptPenPopupSlotIndex].penType === 'highlighter' ? 2 :
                                        pptPenSlots[pptPenPopupSlotIndex].penType === 'fountain' ? 0.2 :
                                        pptPenSlots[pptPenPopupSlotIndex].penType === 'pencil' ? 0.2 : 0.5
                                      }
                                      value={pptPenSlots[pptPenPopupSlotIndex].strokeWidth}
                                      onChange={(e) => handleSlotChangeStrokeWidth(pptPenPopupSlotIndex, parseFloat(e.target.value))}
                                      className="w-full accent-indigo-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                                    />
                                    <span className="text-[10px] text-slate-400 font-semibold">Đậm</span>
                                  </div>
                                </div>

                                {/* 3. CHỌN MÀU TỪ MẪU HOẶC TỪ BẢNG MÀU */}
                                <div>
                                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-1.5">
                                    <span>3. Chọn màu từ mẫu hoặc tự chọn:</span>
                                    <span className="text-[10px] font-mono text-slate-400">
                                      {pptPenSlots[pptPenPopupSlotIndex].color.toUpperCase()}
                                    </span>
                                  </div>

                                  <div className="flex items-center flex-wrap gap-1.5">
                                    {getPptPenSampleColors(pptPenSlots[pptPenPopupSlotIndex].penType).map((c) => {
                                      const activeColor = pptPenSlots[pptPenPopupSlotIndex].color;
                                      const isMatch = activeColor.toLowerCase() === c.color.toLowerCase();
                                      return (
                                        <button
                                          key={c.color}
                                          type="button"
                                          onClick={() => handleSlotChangeColor(pptPenPopupSlotIndex, c.color)}
                                          className={`w-6 h-6 rounded-full border transition-all cursor-pointer flex items-center justify-center ${
                                            isMatch
                                              ? 'scale-110 border-slate-900 ring-2 ring-indigo-400 shadow-xs'
                                              : 'border-slate-300 opacity-85 hover:opacity-100 hover:scale-105'
                                          }`}
                                          style={{ backgroundColor: c.color }}
                                          title={`${c.label} (${c.color})`}
                                        >
                                          {isMatch && <Check className="w-3.5 h-3.5 text-white drop-shadow-xs" />}
                                        </button>
                                      );
                                    })}

                                    {/* Bảng màu tự chọn (HTML5 Color Picker) */}
                                    <label
                                      className="relative w-6 h-6 rounded-full border border-slate-300 bg-white shadow-2xs hover:scale-110 transition-transform cursor-pointer flex items-center justify-center"
                                      title="Bảng màu tự do: Nhấp để chọn màu bất kỳ từ quang phổ"
                                    >
                                      <Palette className="w-3.5 h-3.5 text-indigo-600" />
                                      <input
                                        type="color"
                                        value={
                                          pptPenSlots[pptPenPopupSlotIndex].color.startsWith('#') &&
                                          pptPenSlots[pptPenPopupSlotIndex].color.length === 7
                                            ? pptPenSlots[pptPenPopupSlotIndex].color
                                            : '#1d4ed8'
                                        }
                                        onChange={(e) => handleSlotChangeColor(pptPenPopupSlotIndex, e.target.value)}
                                        className="sr-only"
                                      />
                                      <span
                                        className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-white shadow-xs"
                                        style={{ backgroundColor: pptPenSlots[pptPenPopupSlotIndex].color }}
                                      />
                                    </label>
                                  </div>
                                </div>

                                {/* 4. MÔ PHỎNG NÉT VẼ */}
                                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                                  <span className="text-[10px] text-slate-400 font-medium">Mô phỏng nét vẽ:</span>
                                  <div className="flex-1 max-w-[150px] h-6 flex items-center justify-center bg-slate-50 rounded-lg px-2 border border-slate-200/60 overflow-hidden">
                                    <div
                                      style={{
                                        height: `${Math.min(18, Math.max(2, pptPenSlots[pptPenPopupSlotIndex].strokeWidth))}px`,
                                        backgroundColor: pptPenSlots[pptPenPopupSlotIndex].color,
                                        opacity: pptPenSlots[pptPenPopupSlotIndex].penType === 'highlighter' ? 0.45 : pptPenSlots[pptPenPopupSlotIndex].penType === 'pencil' ? 0.65 : 1,
                                        borderRadius: pptPenSlots[pptPenPopupSlotIndex].penType === 'highlighter' ? '2px' : '9999px',
                                        boxShadow: pptPenSlots[pptPenPopupSlotIndex].penType === 'laser' ? `0 0 8px ${pptPenSlots[pptPenPopupSlotIndex].color}` : 'none',
                                      }}
                                      className="w-full"
                                    />
                                  </div>
                                </div>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Nút Tẩy */}
                        <button
                          type="button"
                          onClick={() => setPptActiveTool('eraser')}
                          className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                            pptActiveTool === 'eraser'
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'text-slate-600 hover:bg-slate-200/70'
                          }`}
                          title="Tẩy xóa nét vẽ"
                        >
                          <Eraser className="w-3.5 h-3.5" />
                          <span className="text-[11px] hidden sm:inline">Tẩy</span>
                        </button>
                      </div>
                    </>
                  )}

                  {/* CÁC CÔNG CỤ SOẠN THẢO VĂN BẢN (ẨN KHI Ở CHẾ ĐỘ XEM PPT, BỐ TRÍ THÀNH CÁC CỤM GỌN GÀNG KHI SOẠN THẢO) */}
                  {wordViewMode !== 'ppt' && (
                    <>
                      {/* Nhóm 1: Hoàn tác (Undo / Redo) */}
                      <div className="flex items-center gap-0.5 bg-slate-100/90 p-0.5 rounded-xl border border-slate-200/80 shadow-2xs">
                        <button onClick={() => execCommand('undo')} className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-700 transition-colors" title="Hoàn tác (Undo - Ctrl+Z)">
                          <Undo className="w-4 h-4" />
                        </button>
                        <button onClick={() => execCommand('redo')} className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-700 transition-colors" title="Làm lại (Redo - Ctrl+Y)">
                          <Redo className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Nhóm 2: Định dạng kiểu chữ, màu sắc & cỡ chữ gọn gàng */}
                      <div className="flex items-center gap-0.5 bg-slate-100/90 p-0.5 rounded-xl border border-slate-200/80 shadow-2xs">
                        {/* Đậm, Nghiêng, Gạch chân */}
                        <button
                          type="button"
                          onClick={() => {
                            execCommand('bold');
                            setIsBold((prev) => !prev);
                          }}
                          className={`p-1.5 rounded-lg transition-all ${
                            isBold
                              ? 'bg-indigo-600 text-white shadow-xs font-bold ring-2 ring-indigo-300'
                              : 'hover:bg-slate-200 text-slate-700 bg-transparent'
                          }`}
                          title="Chữ Đậm (Ctrl+B)"
                        >
                          <Bold className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            execCommand('italic');
                            setIsItalic((prev) => !prev);
                          }}
                          className={`p-1.5 rounded-lg transition-all ${
                            isItalic
                              ? 'bg-indigo-600 text-white shadow-xs font-bold ring-2 ring-indigo-300'
                              : 'hover:bg-slate-200 text-slate-700 bg-transparent'
                          }`}
                          title="Chữ Nghiêng (Ctrl+I)"
                        >
                          <Italic className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            execCommand('underline');
                            setIsUnderline((prev) => !prev);
                          }}
                          className={`p-1.5 rounded-lg transition-all ${
                            isUnderline
                              ? 'bg-indigo-600 text-white shadow-xs font-bold ring-2 ring-indigo-300'
                              : 'hover:bg-slate-200 text-slate-700 bg-transparent'
                          }`}
                          title="Gạch Chân (Ctrl+U)"
                        >
                          <Underline className="w-4 h-4" />
                        </button>

                        <div className="h-4 w-[1px] bg-slate-300 mx-0.5"></div>

                        {/* Chọn màu chữ A▾ */}
                        <WordTextColorPicker
                          color={textColor}
                          onSelectColor={(val) => {
                            setTextColor(val);
                            execCommand('foreColor', val);
                          }}
                          isOpen={openTextColorMenu}
                          onToggle={() => {
                            setOpenTextColorMenu(!openTextColorMenu);
                            setOpenHighlightColorMenu(false);
                            setOpenAlignMenu(false);
                            setOpenInsertMenu(false);
                            setOpenFunctionMenu(false);
                          }}
                          onClose={() => setOpenTextColorMenu(false)}
                        />

                        {/* Chọn màu highlight 🖍️▾ */}
                        <WordHighlightColorPicker
                          color={highlightColor}
                          onSelectColor={(val) => {
                            setHighlightColor(val);
                            execCommand('hiliteColor', val);
                          }}
                          isOpen={openHighlightColorMenu}
                          onToggle={() => {
                            setOpenHighlightColorMenu(!openHighlightColorMenu);
                            setOpenTextColorMenu(false);
                            setOpenAlignMenu(false);
                            setOpenInsertMenu(false);
                            setOpenFunctionMenu(false);
                          }}
                          onClose={() => setOpenHighlightColorMenu(false)}
                        />

                        <div className="h-4 w-[1px] bg-slate-300 mx-0.5"></div>

                        {/* Dropdown cỡ chữ: Rút gọn chỉ hiển thị '14px' thay vì '14px (Mặc định)' rất dài */}
                        <select
                          value={fontSize}
                          onChange={(e) => handleFontSizeChange(e.target.value)}
                          className="text-xs font-bold bg-white border border-slate-300 rounded-lg px-2 py-1 text-slate-800 shadow-2xs cursor-pointer focus:ring-1 focus:ring-indigo-500"
                          title="Cỡ chữ (Mặc định 14px)"
                        >
                          <option value="12px">12px</option>
                          <option value="14px">14px</option>
                          <option value="16px">16px</option>
                          <option value="18px">18px</option>
                          <option value="20px">20px</option>
                          <option value="22px">22px</option>
                          <option value="24px">24px</option>
                          <option value="28px">28px</option>
                        </select>
                      </div>

                      {/* Nhóm 3: Canh lề & Danh sách */}
                      <div className="flex items-center gap-0.5 bg-slate-100/90 p-0.5 rounded-xl border border-slate-200/80 shadow-2xs">
                        {/* Menu Canh lề */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => {
                              setOpenAlignMenu(!openAlignMenu);
                              setOpenTextColorMenu(false);
                              setOpenHighlightColorMenu(false);
                              setOpenStyleMenu(false);
                              setOpenInsertMenu(false);
                              setOpenFunctionMenu(false);
                            }}
                            className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 border transition-colors cursor-pointer ${
                              openAlignMenu ? 'bg-indigo-100 text-indigo-800 border-indigo-300' : 'bg-white hover:bg-slate-200 text-slate-700 border-slate-200'
                            }`}
                            title="Canh lề văn bản (Căn trái, Căn giữa, Căn phải, Căn đều)"
                          >
                            {currentAlignment === 'left' && <AlignLeft className="w-3.5 h-3.5 text-indigo-600" />}
                            {currentAlignment === 'center' && <AlignCenter className="w-3.5 h-3.5 text-indigo-600" />}
                            {currentAlignment === 'right' && <AlignRight className="w-3.5 h-3.5 text-indigo-600" />}
                            {currentAlignment === 'justify' && <AlignJustify className="w-3.5 h-3.5 text-indigo-600" />}
                            <span className="font-semibold text-xs">
                              {currentAlignment === 'left' && 'Căn trái'}
                              {currentAlignment === 'center' && 'Căn giữa'}
                              {currentAlignment === 'right' && 'Căn phải'}
                              {currentAlignment === 'justify' && 'Căn đều'}
                            </span>
                            <ChevronDown className="w-3 h-3 text-slate-400" />
                          </button>

                          {openAlignMenu && (
                            <div className="absolute z-50 left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl w-40 py-1 divide-y divide-slate-100 animate-fade-in">
                              <button
                                type="button"
                                onClick={() => handleAlign('left')}
                                className={`w-full px-3 py-2 text-xs flex items-center gap-2 hover:bg-indigo-50 text-slate-700 text-left font-semibold ${
                                  currentAlignment === 'left' ? 'bg-indigo-50 text-indigo-700 font-bold' : ''
                                }`}
                              >
                                <AlignLeft className="w-4 h-4 text-slate-500" />
                                <span>Canh trái</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAlign('center')}
                                className={`w-full px-3 py-2 text-xs flex items-center gap-2 hover:bg-indigo-50 text-slate-700 text-left font-semibold ${
                                  currentAlignment === 'center' ? 'bg-indigo-50 text-indigo-700 font-bold' : ''
                                }`}
                              >
                                <AlignCenter className="w-4 h-4 text-slate-500" />
                                <span>Canh giữa</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAlign('right')}
                                className={`w-full px-3 py-2 text-xs flex items-center gap-2 hover:bg-indigo-50 text-slate-700 text-left font-semibold ${
                                  currentAlignment === 'right' ? 'bg-indigo-50 text-indigo-700 font-bold' : ''
                                }`}
                              >
                                <AlignRight className="w-4 h-4 text-slate-500" />
                                <span>Canh phải</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAlign('justify')}
                                className={`w-full px-3 py-2 text-xs flex items-center gap-2 hover:bg-indigo-50 text-slate-700 text-left font-semibold ${
                                  currentAlignment === 'justify' ? 'bg-indigo-50 text-indigo-700 font-bold' : ''
                                }`}
                              >
                                <AlignJustify className="w-4 h-4 text-slate-500" />
                                <span>Canh đều 2 bên</span>
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="h-4 w-[1px] bg-slate-300 mx-0.5"></div>

                        {/* Danh sách chấm & số */}
                        <button onClick={() => execCommand('insertUnorderedList')} className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-700 transition-colors" title="Danh sách chấm (:≡)">
                          <List className="w-4 h-4" />
                        </button>
                        <button onClick={() => execCommand('insertOrderedList')} className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-700 transition-colors" title="Danh sách số (1.≡)">
                          <ListOrdered className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Nhóm 4: Nút Style & Soạn bài */}
                      <div className="flex items-center bg-slate-100/90 p-0.5 rounded-xl border border-slate-200/80 shadow-2xs">
                        <WordStyleMenu
                          selectedStyle={selectedStyle}
                          onSelectStyle={handleSelectStyle}
                          isOpen={openStyleMenu}
                          onToggle={() => {
                            setOpenStyleMenu(!openStyleMenu);
                            setOpenAlignMenu(false);
                            setOpenTextColorMenu(false);
                            setOpenHighlightColorMenu(false);
                            setOpenInsertMenu(false);
                            setOpenFunctionMenu(false);
                            setOpenWordViewMenu(false);
                          }}
                          onClose={() => setOpenStyleMenu(false)}
                          canAuthor={isTeacherOrHigher(currentRole)}
                          tienTrinh={tienTrinhChuyenDe}
                          insertPositionMode={insertPositionMode}
                          onSetInsertPositionMode={setInsertPositionMode}
                          onInsertLessonTemplate={handleInsertLessonTemplate}
                        />
                      </div>
                    </>
                  )}

            {/* 4. MENU CHÈN: Độc lập trong module con SoanThao/MenuChen (Chèn bảng, Chèn hình ảnh, Chèn File, Chèn Thư mục E-Learning) */}
            <MenuChen
              editorRef={editorRef}
              saveCurrentSelection={saveCurrentSelection}
              insertHtmlToEditor={insertHtmlToEditor}
              chuyenDe={chuyenDe}
              setNotification={setNotification}
              onCloseOtherMenus={() => {
                setOpenFunctionMenu(false);
                setOpenAlignMenu(false);
                setOpenWordViewMenu(false);
              }}
            />

            {/* 4.1. MENU HÀM SỐ: Độc lập trong module con SoanThao/MenuHamSo (Chèn công thức MathType/LaTeX, Chèn đồ thị TikZ & Chèn bảng biến thiên tikz-tab) */}
            <MenuHamSo
              editorRef={editorRef}
              saveCurrentSelection={saveCurrentSelection}
              insertHtmlToEditor={insertHtmlToEditor}
              currentRole={currentRole}
              userFontSize={fontSize}
              setNotification={setNotification}
              onCloseOtherMenus={() => {
                setOpenInsertMenu(false);
                setOpenAlignMenu(false);
                setOpenWordViewMenu(false);
              }}
            />

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
                  setOpenFunctionMenu(false);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition-colors cursor-pointer ${
                  openWordViewMenu
                    ? 'bg-purple-700 text-white border-purple-700'
                    : 'bg-purple-50 text-purple-800 hover:bg-purple-100 border-purple-200'
                }`}
                title={
                  tienTrinhChuyenDe === 'Kiến thức'
                    ? 'Chế độ xem: Toàn bộ / Xem PPT (Ở 1. Kiến thức chỉ có 2 chế độ này)'
                    : 'Chế độ xem & soạn thảo: Tách câu / Toàn bộ / Xem PPT'
                }
              >
                {wordViewMode === 'split' && tienTrinhChuyenDe !== 'Kiến thức' && <Layers className="w-3.5 h-3.5 text-purple-600" />}
                {wordViewMode === 'full' && <FileText className="w-3.5 h-3.5 text-purple-600" />}
                {wordViewMode === 'ppt' && <Tv className="w-3.5 h-3.5 text-purple-600" />}
                {wordViewMode === 'inde' && <Printer className="w-3.5 h-3.5 text-amber-600" />}
                {wordViewMode === 'filehs' && <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />}
                <span>
                  View:{' '}
                  {wordViewMode === 'inde'
                    ? 'In đề'
                    : wordViewMode === 'filehs'
                    ? 'File HS'
                    : tienTrinhChuyenDe === 'Kiến thức'
                    ? wordViewMode === 'ppt'
                      ? 'Xem PPT'
                      : 'Toàn bộ'
                    : wordViewMode === 'split'
                    ? 'Tách câu'
                    : wordViewMode === 'full'
                    ? 'Toàn bộ'
                    : 'Xem PPT'}
                </span>
                <ChevronDown className="w-3 h-3 text-purple-400" />
              </button>

              {openWordViewMenu && (
                <div className="absolute z-40 left-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl w-72 py-1.5 divide-y divide-slate-100 animate-fade-in">
                  {/* Tùy chọn 1: Tách câu (CHỈ HIỂN THỊ KHI KHÔNG PHẢI "1. Kiến thức") */}
                  {tienTrinhChuyenDe !== 'Kiến thức' && (
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
                  )}

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
                      <div className="text-[10px] text-slate-400 font-normal">Xem toàn bộ bài giảng / lý thuyết liên tục khổ giấy A4</div>
                    </div>
                  </button>

                  {/* Tùy chọn 3: Xem PPT */}
                  <button
                    type="button"
                    onClick={() => {
                      if (editorRef.current) {
                        setWordDocumentHtml(editorRef.current.innerHTML);
                      }
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
                        <span>Xem PPT</span>
                        {wordViewMode === 'ppt' && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-200 text-purple-800 font-semibold">Đang xem</span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-normal">Trình chiếu PowerPoint lý thuyết, bài giảng hoặc câu hỏi</div>
                    </div>
                  </button>

                  {/* Tùy chọn 4: In đề */}
                  <button
                    type="button"
                    onClick={() => {
                      if (editorRef.current) {
                        setWordDocumentHtml(editorRef.current.innerHTML);
                      }
                      setWordViewMode('inde');
                      setOpenWordViewMenu(false);
                    }}
                    className={`w-full px-3.5 py-2.5 text-xs flex items-start gap-2.5 text-left transition-colors ${
                      wordViewMode === 'inde' ? 'bg-amber-50/80 text-amber-950 font-bold' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <Printer className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold flex items-center gap-1.5">
                        <span>In đề</span>
                        {wordViewMode === 'inde' && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-200 text-amber-800 font-semibold">Đang xem</span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-normal">Bỏ hết lời giải và đáp án của ví dụ, câu hỏi</div>
                    </div>
                  </button>

                  {/* Tùy chọn 5: File HS */}
                  <button
                    type="button"
                    onClick={() => {
                      if (editorRef.current) {
                        setWordDocumentHtml(editorRef.current.innerHTML);
                      }
                      setWordViewMode('filehs');
                      setOpenWordViewMenu(false);
                    }}
                    className={`w-full px-3.5 py-2.5 text-xs flex items-start gap-2.5 text-left transition-colors ${
                      wordViewMode === 'filehs' ? 'bg-emerald-50/80 text-emerald-950 font-bold' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold flex items-center gap-1.5">
                        <span>File HS</span>
                        {wordViewMode === 'filehs' && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-200 text-emerald-800 font-semibold">Đang xem</span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-normal">Đổi phần lời giải bằng dòng chấm chấm cho học sinh làm bài</div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* NÚT CHÈN KHOẢNG TRỐNG (BIỂU TƯỢNG HÌNH ▭↓▭) NGAY SAU NÚT VIEW: XEM PPT */}
            {wordViewMode === 'ppt' && (
              <button
                type="button"
                onClick={() => setIsInsertSpaceMode((prev) => !prev)}
                className={`p-1.5 px-2.5 rounded-lg text-xs font-bold transition-all transform cursor-pointer flex items-center justify-center gap-1.5 shadow-xs border ${
                  isInsertSpaceMode
                    ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-300 ring-2 ring-amber-300 animate-pulse'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-400 active:scale-95'
                }`}
                title={
                  isInsertSpaceMode
                    ? 'Đang bật thước chèn khoảng trống: Đưa chuột vào trang slide, nhấp giữ và kéo xuống để mở khoảng trống (nhấp lại nút này để tắt)'
                    : 'Chèn khoảng trống: Nhấp để bật thước kẻ ngang, sau đó nhấp chuột giữ và kéo xuống trên trang để mở khoảng trống viết bài'
                }
              >
                <NoteRendererSpaceIcon className="w-4 h-4 text-white" />
                {isInsertSpaceMode && (
                  <span className="text-[10px] bg-amber-700/90 text-white px-1 py-0.2 rounded-full font-bold">
                    ✕
                  </span>
                )}
              </button>
            )}

                  {/* Nút Lưu Drive góc phải Toolbar (Đóng gói bởi module con DongBoDrive) */}
                  <div className="ml-auto flex items-center gap-2">
                    {wordViewMode !== 'ppt' && (
                      <DongBoDriveButton
                        isSaving={isSaving}
                        syncStatus={syncStatus}
                        lastSavedTime={lastSavedTime}
                        onClick={handleSaveToDrive}
                      />
                    )}
                  </div>
                </>
              ) : (
                /* TOOLBAR DÀNH CHO HỌC SINH: CHỈ XEM HOẶC TRÌNH CHIẾU */
                <div className="flex items-center justify-between w-full gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    {wordViewMode === 'ppt' ? (
                      /* Khi học sinh xem PPT: Nút điều hướng PPT + Cỡ chữ + Thoát PPT */
                      <>
                        <button
                          type="button"
                          disabled={activePptSlideIndex <= 0 && activePptStepIndex <= 0}
                          onClick={handlePptPrev}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold transition-colors cursor-pointer flex items-center justify-center text-slate-100 shadow-xs"
                          title="Lùi bước / Slide trước"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>

                        <select
                          value={activePptSlideIndex}
                          onChange={(e) => {
                            const newIdx = Number(e.target.value);
                            setActivePptSlideIndex(newIdx);
                            setActivePptStepIndex(0);
                          }}
                          className="bg-slate-800 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg border border-slate-700 cursor-pointer focus:outline-none max-w-[150px] truncate shadow-xs"
                          title="Chọn slide trình chiếu"
                        >
                          {pptSlides.map((s, idx) => (
                            <option key={s.id || idx} value={idx}>
                              {s.title || `Slide ${idx + 1}`}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          disabled={
                            activePptSlideIndex >= pptSlides.length - 1 &&
                            (revealAllSteps || activePptStepIndex >= currentPptTotalSteps - 1)
                          }
                          onClick={handlePptNext}
                          className="p-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold transition-colors cursor-pointer flex items-center justify-center text-white shadow-xs"
                          title={
                            !revealAllSteps && activePptStepIndex < currentPptTotalSteps - 1
                              ? 'Hiện tiếp hiệu ứng ⚡'
                              : 'Slide tiếp theo'
                          }
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        {/* 1. Nút Xem tài liệu (toàn bộ) */}
                        <button
                          type="button"
                          onClick={() => setWordViewMode('full')}
                          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            wordViewMode === 'full'
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                          title="Chế độ đọc bài & xem tài liệu"
                        >
                          <FileText className="w-4 h-4" />
                          <span>Xem tài liệu</span>
                        </button>

                        {/* 2. Nút Trình chiếu Slide (PPT) */}
                        <button
                          type="button"
                          onClick={() => setWordViewMode('ppt')}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200"
                          title="Chuyển sang chế độ Trình chiếu Slide PPT"
                        >
                          <Tv className="w-4 h-4" />
                          <span>Trình chiếu Slide (PPT)</span>
                        </button>
                      </>
                    )}

                    <div className="h-5 w-[1px] bg-slate-300 mx-1"></div>

                    {/* 3. Tùy chọn cỡ chữ xem tài liệu cho học sinh */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-600">
                      <span className="font-semibold text-slate-500">Cỡ chữ:</span>
                      <select
                        value={fontSize}
                        onChange={(e) => handleFontSizeChange(e.target.value)}
                        className="text-xs font-bold bg-white border border-slate-300 rounded-lg px-2 py-1 text-slate-800 shadow-2xs cursor-pointer focus:ring-1 focus:ring-indigo-500"
                        title="Điều chỉnh cỡ chữ hiển thị bài học"
                      >
                        <option value="12px">12px (Nhỏ)</option>
                        <option value="14px">14px (Mặc định)</option>
                        <option value="16px">16px (Vừa)</option>
                        <option value="18px">18px (Lớn)</option>
                        <option value="20px">20px (Rất lớn)</option>
                        <option value="22px">22px (Khổng lồ)</option>
                      </select>
                    </div>
                  </div>

                  {/* Góc phải: Huy hiệu chế độ xem & nút Quay lại lớp */}
                  <div className="flex items-center gap-2">
                    {isBackgroundSyncing && (
                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-semibold animate-pulse" title="Đang đồng bộ phiên bản mới nhất từ giáo viên">
                        <RotateCcw className="w-3 h-3 animate-spin text-emerald-600" />
                        <span>Đang đồng bộ</span>
                      </div>
                    )}

                    <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 flex items-center gap-1.5" title="Học sinh không có Quyền biên soạn tài liệu (Chỉ xem và Trình chiếu slide)">
                      <Eye className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Chế độ: Xem tài liệu (Không có quyền biên soạn)</span>
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        window.dispatchEvent(
                          new CustomEvent('app-navigate-view', { detail: { viewId: 'learning-lophoc' } })
                        );
                      }}
                      className="px-3 py-1.5 rounded-xl border border-teal-200 bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                      title="Quay lại danh sách lớp học"
                    >
                      <ArrowLeft className="w-3.5 h-3.5 text-teal-700" />
                      <span>Quay lại Lớp Học</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

          {/* Cửa sổ thông báo Đang đồng bộ màu đỏ khi chưa nạp xong nội dung từ Drive hoặc đang xác thực lại nền đối với Giáo viên */}
          {(isLoadingFromDrive || (isTeacherOrHigher(currentRole) && isReauthenticating)) && (
            <div className="w-full max-w-4xl min-h-[520px] bg-white rounded-2xl border-2 border-red-300 shadow-2xl flex flex-col items-center justify-center p-8 text-center space-y-4 my-4 mx-auto z-30 animate-pulse">
              <div className="w-14 h-14 rounded-full bg-red-50 border-2 border-red-200 flex items-center justify-center shadow-xs">
                <RotateCcw className="w-7 h-7 text-red-600 animate-spin" />
              </div>
              <div className="text-red-600 font-black text-xl tracking-wide flex items-center gap-2">
                <span>Đang đồng bộ</span>
              </div>
              <p className="text-slate-600 text-xs sm:text-sm font-medium italic max-w-md">
                {isReauthenticating
                  ? 'Đang tự động xác thực lại tài khoản Google trong nền... Với tài khoản Giáo viên, cửa sổ Word đang khóa để đảm bảo bạn luôn cập nhật bản mới nhất trước khi soạn bài, cập nhật, chỉnh sửa.'
                  : 'Đang nạp dữ liệu bài giảng từ Google Drive lên cửa sổ Word. Với tài khoản Giáo viên, cửa sổ soạn thảo đang ẩn và khóa tạm thời cho đến khi nạp hoàn tất...'}
              </p>
            </div>
          )}

          {/* Vùng hiển thị theo chế độ View được chọn (Chỉ hiển thị khi đã hoàn tất đồng bộ từ Drive hoặc học sinh xem ngay từ cache) */}
          {!(isLoadingFromDrive || (isTeacherOrHigher(currentRole) && isReauthenticating)) && (
            wordViewMode === 'ppt' ? (
              <div className="fixed inset-0 z-40 bg-slate-200/95 overflow-y-auto w-screen h-screen pt-24 sm:pt-28 pb-16 px-1 sm:px-3">
                <div className="w-full max-w-none">
                  <PptSlideViewer
                    slides={pptSlides}
                    activeSlideIndex={activePptSlideIndex}
                    onSlideChange={(newIdx) => {
                      setActivePptSlideIndex(newIdx);
                      setActivePptStepIndex(0);
                      setIsInsertSpaceMode(false);
                    }}
                    activeStepIndex={activePptStepIndex}
                    onStepChange={setActivePptStepIndex}
                    revealAllSteps={revealAllSteps}
                    onToggleRevealAll={() => setRevealAllSteps((prev) => !prev)}
                    whiteboards={pptWhiteboards}
                    onUpdateWhiteboard={handleUpdatePptWhiteboard}
                    onDeleteWhiteboard={handleDeletePptWhiteboard}
                    onAddWhiteboardAtStep={handleAddPptWhiteboardAtStep}
                    isInsertSpaceMode={isInsertSpaceMode}
                    onExitInsertSpaceMode={() => setIsInsertSpaceMode(false)}
                    activeWhiteboardId={activePptWhiteboardId}
                    onSelectWhiteboard={setActivePptWhiteboardId}
                    activeTool={pptActiveTool}
                    onToolChange={setPptActiveTool}
                    selectedPenType={pptPenType}
                    onPenTypeChange={setPptPenType}
                    selectedColor={currentPptColor}
                    onColorChange={handlePptChangeColor}
                    strokeWidth={currentPptStrokeWidth}
                    onStrokeWidthChange={handlePptChangeStrokeWidth}
                    onOpenTableModal={() => {
                      saveCurrentSelection();
                      setShowTableModal(true);
                    }}
                    onOpenImagePicker={() => {
                      imageInputRef.current?.click();
                    }}
                    onOpenMathModal={() => {
                      setShowMathTypeModal(true);
                    }}
                    onOpenGraphModal={() => {
                      setShowWordGraphModal(true);
                    }}
                    onOpenBbtModal={() => {
                      setShowWordBBTModal(true);
                    }}
                    tienTrinhChuyenDe={tienTrinhChuyenDe}
                    docTitle={title || chuyenDe || 'Tài liệu Chuyên đề'}
                    isTeacher={isTeacherOrHigher(currentRole)}
                    onExitPpt={() => {
                      setIsInsertSpaceMode(false);
                      setIsPptFullScreen(false);
                      setWordViewMode('full');
                    }}
                  />
                </div>
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
            ) : wordViewMode === 'inde' || wordViewMode === 'filehs' ? (
              <InDeFileHsView
                mode={wordViewMode}
                html={wordDocumentHtml || editorRef.current?.innerHTML || ''}
                docTitle={title || chuyenDe || 'Tài liệu Chuyên đề'}
                onClose={() => setWordViewMode('full')}
              />
            ) : null
          )}

          {/* Vùng giấy Word Toàn bộ (luôn giữ trong DOM để bảo toàn con trỏ, lịch sử undo và nội dung khi chuyển đổi View) */}
          <div
            style={{ display: !(isLoadingFromDrive || (isTeacherOrHigher(currentRole) && isReauthenticating)) && wordViewMode === 'full' ? 'flex' : 'none' }}
            onDoubleClick={isTeacherOrHigher(currentRole) ? handleDoubleClickToInsertRow : undefined}
            className={`bg-slate-200 p-4 sm:p-8 rounded-b-2xl border border-slate-300 border-t-0 shadow-inner min-h-[620px] justify-center ${
              !isTeacherOrHigher(currentRole) ? 'word-doc-student-mode cursor-default' : 'cursor-text'
            }`}
            title={isTeacherOrHigher(currentRole) ? "Kích đôi chuột vào vị trí bất kỳ bên dưới hoặc ngoài khối để chèn thêm 1 hàng mới toanh" : undefined}
          >
              {/* CSS ẩn hoàn toàn tất cả nút điều chỉnh đồ thị đối với học sinh + Tùy biến dấu ngắt Slide và Hiệu ứng trực quan */}
              <style>{`
                .word-doc-student-mode .word-graph-controls,
                .word-doc-student-mode .word-bbt-controls,
                .word-doc-student-mode .graph-resize-handle,
                .word-doc-student-mode .graph-resize-handle-left,
                .word-doc-student-mode .graph-resize-handle-e,
                .word-doc-student-mode .graph-drag-handle,
                .word-doc-student-mode .bbt-drag-handle,
                .word-doc-student-mode .delete-graph-btn,
                .word-doc-student-mode .edit-graph-btn,
                .word-doc-student-mode .add-graph-label-btn,
                .word-doc-student-mode .add-graph-point-btn,
                .word-doc-student-mode .edit-bbt-btn,
                .word-doc-student-mode .graph-size-btn,
                .word-doc-student-mode .bbt-size-btn,
                .word-doc-student-mode .graph-align-btn,
                .word-doc-student-mode .bbt-align-btn {
                  display: none !important;
                }
                .word-doc-student-mode .word-graph-wrapper,
                .word-doc-student-mode .word-bbt-wrapper {
                  border: 1.5px dashed transparent !important;
                  outline: none !important;
                  cursor: default !important;
                }
                /* Thanh điều khiển trên đồ thị / BBT chỉ hiện khi rê chuột vào */
                .word-graph-controls,
                .word-bbt-controls {
                  opacity: 0;
                  pointer-events: none;
                  transition: opacity 0.2s ease-in-out;
                }
                .word-graph-wrapper:hover .word-graph-controls,
                .word-bbt-wrapper:hover .word-bbt-controls,
                .group:hover .word-graph-controls,
                .group:hover .word-bbt-controls {
                  opacity: 1 !important;
                  pointer-events: auto !important;
                }
                .word-doc-student-mode .graph-draggable-text {
                  cursor: default !important;
                  pointer-events: none !important;
                }
                .word-doc-student-mode .graph-curve,
                .word-doc-student-mode .graph-guideline,
                .word-doc-student-mode .graph-axis,
                .word-doc-student-mode .graph-point,
                .word-doc-student-mode .graph-extrema-circle {
                  cursor: default !important;
                  pointer-events: none !important;
                }
                .graph-draggable-text:hover {
                  filter: drop-shadow(0 0 3px rgba(37, 99, 235, 0.7));
                  cursor: grab;
                }
                .graph-point:hover,
                .graph-extrema-circle:hover {
                  filter: drop-shadow(0 0 4px rgba(37, 99, 235, 0.9));
                  cursor: pointer;
                }
                .graph-element-selected {
                  outline: 2px dashed #4f46e5 !important;
                  outline-offset: 3px !important;
                  filter: drop-shadow(0 0 4px rgba(79, 70, 229, 0.8)) !important;
                }

                /* Kiểu dáng hiển thị Thẻ mốc Slide & Điểm dừng Hiệu ứng trong khung soạn thảo Word */
                .slide-break-point {
                  position: relative;
                  border-top: 2px dashed #9333ea !important;
                  padding-top: 10px !important;
                  margin-top: 16px !important;
                  background-color: rgba(243, 232, 255, 0.25);
                  border-radius: 6px;
                }
                .slide-break-point::before {
                  content: "🎬 [MỐC SLIDE MỚI]";
                  display: inline-block;
                  font-size: 10px;
                  font-weight: 800;
                  color: #6b21a8;
                  background-color: #f3e8ff;
                  border: 1px solid #d8b4fe;
                  padding: 1px 7px;
                  border-radius: 9999px;
                  margin-bottom: 6px;
                  letter-spacing: 0.05em;
                  user-select: none;
                }

                .effect-break-point {
                  position: relative;
                  border-top: 2px dashed #d97706 !important;
                  padding-top: 8px !important;
                  margin-top: 12px !important;
                  background-color: rgba(254, 243, 199, 0.25);
                  border-radius: 6px;
                }
                .effect-break-point::before {
                  content: "⚡ [MỐC HIỆU ỨNG: HIỆN DẦN]";
                  display: inline-block;
                  font-size: 10px;
                  font-weight: 800;
                  color: #92400e;
                  background-color: #fef3c7;
                  border: 1px solid #fde68a;
                  padding: 1px 7px;
                  border-radius: 9999px;
                  margin-bottom: 6px;
                  letter-spacing: 0.05em;
                  user-select: none;
                }
                .effect-break-point[data-effect-type="slide-up"]::before {
                  content: "⬆️ [MỐC HIỆU ỨNG: TRƯỢT LÊN]";
                }
                .effect-break-point[data-effect-type="slide-left"]::before {
                  content: "➡️ [MỐC HIỆU ỨNG: TRƯỢT VÀO]";
                }
                .effect-break-point[data-effect-type="zoom"]::before {
                  content: "🔍 [MỐC HIỆU ỨNG: PHÓNG TO]";
                }
                .effect-break-point[data-effect-type="highlight"]::before {
                  content: "💡 [MỐC HIỆU ỨNG: NỔI BẬT]";
                }
                .effect-break-point[data-effect-type="fade"]::before {
                  content: "💫 [MỐC HIỆU ỨNG: HIỆN DẦN]";
                }
              `}</style>
              {/* Khung bao tài liệu kèm Thanh Mốc PPT dọc bên lề trái */}
              <div className="relative w-full max-w-5xl flex items-stretch gap-2.5 justify-center">
                {/* THANH MỐC PPT DỌC BÊN LỀ TRÁI (TỪ ĐẦU ĐẾN CUỐI TÀI LIỆU) DÀNH CHO GIÁO VIÊN */}
                {/* THANH MỐC PPT DỌC BÊN LỀ TRÁI (TỪ ĐẦU ĐẾN CUỐI TÀI LIỆU) */}
                <PptMarkerRail
                  markers={railMarkers}
                  lineItems={railLineItems}
                  totalScrollHeight={editorRef.current?.scrollHeight || 1000}
                  onRailClick={isTeacherOrHigher(currentRole) ? handlePptRailClick : () => {}}
                  onMarkerClick={(marker, e) => {
                    e.stopPropagation();
                    if (!isTeacherOrHigher(currentRole)) {
                      // Với học sinh: Kích chuột vào mốc slide cuộn mượt đến vị trí slide đó
                      const targetEl = editorRef.current?.children[marker.elementIndex] as HTMLElement | undefined;
                      if (targetEl) {
                        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }
                      return;
                    }
                    setPptRailClickMenu({
                      elementIndex: marker.elementIndex,
                      x: e.clientX,
                      y: e.clientY,
                      isSlide: marker.type === 'slide',
                      isEffect: marker.type === 'effect',
                      effectType: marker.effectType || 'fade',
                      snippet: marker.snippet,
                    });
                  }}
                  onLinePlusClick={isTeacherOrHigher(currentRole) ? (lineItem, e) => {
                    e.stopPropagation();
                    setPptRailClickMenu({
                      elementIndex: lineItem.elementIndex,
                      x: e.clientX,
                      y: e.clientY,
                      isSlide: lineItem.hasSlideMarker,
                      isEffect: lineItem.hasEffectMarker,
                      effectType: lineItem.effectType || 'fade',
                      snippet: lineItem.snippet,
                    });
                  } : undefined}
                  clickMenu={isTeacherOrHigher(currentRole) ? pptRailClickMenu : null}
                  onApplyBreak={handleApplyBreakFromRail}
                  onRemoveBreak={handleRemoveBreakFromRail}
                  onCloseClickMenu={() => setPptRailClickMenu(null)}
                  onAutoAnalyze={isTeacherOrHigher(currentRole) ? handleAutoAnalyzeBreaks : undefined}
                />

                <div
                  ref={editorRef}
                contentEditable={!(isLoadingFromDrive || isReauthenticating) && isTeacherOrHigher(currentRole)}
                suppressContentEditableWarning
                onKeyUp={() => {
                  saveCurrentSelection();
                  updateToolbarFormattingStates();
                }}
                onMouseUp={() => {
                  saveCurrentSelection();
                  updateToolbarFormattingStates();
                }}
                onSelect={() => {
                  saveCurrentSelection();
                  updateToolbarFormattingStates();
                }}
                onBlur={saveCurrentSelection}
                onDoubleClick={(e) => {
                  if (!isTeacherOrHigher(currentRole)) return;
                  const target = (e.target instanceof Element ? e.target : (e.target as Node)?.parentElement) as HTMLElement | null;
                  if (!target) return;

                  // 1. Kích đôi trực tiếp vào chữ/số/nhãn trong đồ thị -> Mở hộp thoại sửa trực tiếp nội dung!
                  const textEl = target.closest?.('.graph-draggable-text, .graph-label') as SVGTextElement | null;
                  if (textEl) {
                    e.preventDefault();
                    e.stopPropagation();
                    const curVal = textEl.textContent || '';
                    const newVal = window.prompt('Sửa trực tiếp nội dung chữ/số/nhãn này:', curVal);
                    if (newVal !== null) {
                      const tspan = textEl.querySelector('tspan');
                      if (tspan) {
                        tspan.textContent = newVal;
                      } else {
                        textEl.textContent = newVal;
                      }
                      textEl.setAttribute('data-label', newVal ? `Nhãn: ${newVal}` : 'Nhãn');
                      saveCurrentSelection();
                      if (selectedGraphElement && selectedGraphElement.targetEl === textEl) {
                        setSelectedGraphElement(prev => prev ? { ...prev, elementName: newVal ? `Nhãn: ${newVal}` : 'Nhãn', textContent: newVal } : null);
                      }
                      setNotification({ text: `Đã cập nhật nội dung thành "${newVal}"!`, type: 'success' });
                      setTimeout(() => setNotification(null), 2500);
                    }
                    return;
                  }

                  // 2. Kích đôi vào điểm mốc tọa độ trong đồ thị -> Mở hộp thoại sửa tên/nhãn điểm!
                  const pointEl = target.closest?.('.graph-point, .graph-extrema-circle') as SVGCircleElement | null;
                  if (pointEl) {
                    e.preventDefault();
                    e.stopPropagation();
                    const curLabel = pointEl.getAttribute('data-label') || '';
                    const newLabel = window.prompt('Sửa tên/nhãn của điểm tọa độ này:', curLabel);
                    if (newLabel !== null) {
                      pointEl.setAttribute('data-label', newLabel);
                      pointEl.setAttribute('title', newLabel);
                      saveCurrentSelection();
                      if (selectedGraphElement && selectedGraphElement.targetEl === pointEl) {
                        setSelectedGraphElement(prev => prev ? { ...prev, elementName: newLabel } : null);
                      }
                    }
                    return;
                  }

                  // 3. Kích đôi vào vùng đồ thị SVG -> Đề xuất thêm nhãn/chữ tại ngay vị trí vừa kích đôi!
                  const graphSvg = target.closest?.('.word-graph-svg') as SVGSVGElement | null;
                  if (graphSvg) {
                    e.preventDefault();
                    e.stopPropagation();
                    const wrapper = graphSvg.closest('.word-graph-wrapper') as HTMLElement | null;
                    if (wrapper && typeof graphSvg.createSVGPoint === 'function') {
                      const pt = graphSvg.createSVGPoint();
                      pt.x = e.clientX;
                      pt.y = e.clientY;
                      const ctm = graphSvg.getScreenCTM();
                      if (ctm) {
                        const svgP = pt.matrixTransform(ctm.inverse());
                        handleAddGraphText(wrapper, Math.round(svgP.x), Math.round(svgP.y), 'M');
                      }
                    }
                    return;
                  }

                  // 4. Nếu kích đôi vào bất kỳ phần nào khác của đồ thị hoặc bảng biến thiên thì không chèn hàng mới
                  if (target.closest?.('.word-graph-wrapper, .word-bbt-wrapper')) {
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                  }

                  handleDoubleClickToInsertRow(e);
                }}
                onMouseDown={handleEditorMouseDown}
                onTouchStart={handleEditorTouchStart}
                onDragStart={handleEditorDragStart}
                onDragOver={handleEditorDragOver}
                onDrop={handleEditorDrop}
                onClick={(e) => {
                  try {
                    // Nếu là học sinh, không kích hoạt bất kỳ nút điều chỉnh đồ thị nào
                    if (!isTeacherOrHigher(currentRole)) {
                      saveCurrentSelection();
                      return;
                    }

                    const el = (e.target instanceof Element ? e.target : (e.target as Node)?.parentElement) as HTMLElement | null;
                    if (!el) {
                      saveCurrentSelection();
                      return;
                    }

                    // 1. Nút xóa ✕ đồ thị / bảng biến thiên
                    if (el.classList?.contains('delete-graph-btn') || (typeof el.closest === 'function' && el.closest('.delete-graph-btn'))) {
                      e.preventDefault();
                      e.stopPropagation();
                      const wrapper = el.closest('.word-graph-wrapper, .word-bbt-wrapper');
                      if (wrapper) {
                        wrapper.remove();
                        setSelectedGraphElement(null);
                        saveCurrentSelection();
                        return;
                      }
                    }

                    // 2. Nút "Sửa hàm" trên thanh điều khiển của đồ thị
                    if (el.classList?.contains('edit-graph-btn') || (typeof el.closest === 'function' && el.closest('.edit-graph-btn'))) {
                      e.preventDefault();
                      e.stopPropagation();
                      const wrapper = el.closest('.word-graph-wrapper');
                      if (wrapper) {
                        const formula = decodeURIComponent(wrapper.getAttribute('data-formula') || 'y = x^2 - 1');
                        const xmin = wrapper.getAttribute('data-xmin') || '-2';
                        const xmax = wrapper.getAttribute('data-xmax') || '2';
                        const ymin = wrapper.getAttribute('data-ymin') || '-2';
                        const ymax = wrapper.getAttribute('data-ymax') || '4';
                        const unitx = wrapper.getAttribute('data-unitx') || '1';
                        const unity = wrapper.getAttribute('data-unity') || '1';
                        const showAxis = wrapper.getAttribute('data-show-axis-labels');
                        const showOrigin = wrapper.getAttribute('data-show-origin-label');
                        const showExtrema = wrapper.getAttribute('data-show-extrema-labels');
                        const req = decodeURIComponent(wrapper.getAttribute('data-req') || '');
                        const graphId = wrapper.getAttribute('data-graph-id') || '';

                        setWordGraphFormula(formula);
                        setWordGraphXMin(xmin);
                        setWordGraphXMax(xmax);
                        setWordGraphYMin(ymin);
                        setWordGraphYMax(ymax);
                        setWordGraphUnitX(unitx);
                        setWordGraphUnitY(unity);
                        setWordGraphShowAxisLabels(showAxis !== 'false');
                        setWordGraphShowOriginLabel(showOrigin !== 'false');
                        setWordGraphShowExtremaLabels(showExtrema !== 'false');
                        setWordGraphRequirement(req);
                        setEditingGraphId(graphId);
                        setWordGraphOldTikz(graphId);
                        setShowWordGraphModal(true);
                        return;
                      }
                    }

                    // 2b. Nút "Thêm nhãn" trên thanh điều khiển của đồ thị
                    if (el.classList?.contains('add-graph-label-btn') || (typeof el.closest === 'function' && el.closest('.add-graph-label-btn'))) {
                      e.preventDefault();
                      e.stopPropagation();
                      const wrapper = el.closest('.word-graph-wrapper') as HTMLElement | null;
                      if (wrapper) {
                        handleAddGraphText(wrapper);
                        return;
                      }
                    }

                    // 2c. Nút "Thêm điểm" trên thanh điều khiển của đồ thị
                    if (el.classList?.contains('add-graph-point-btn') || (typeof el.closest === 'function' && el.closest('.add-graph-point-btn'))) {
                      e.preventDefault();
                      e.stopPropagation();
                      const wrapper = el.closest('.word-graph-wrapper') as HTMLElement | null;
                      if (wrapper) {
                        handleAddGraphPoint(wrapper);
                        return;
                      }
                    }

                    // 3. Nút co giãn nhanh đồ thị (-10% / +10%)
                    const sizeBtn = typeof el.closest === 'function' ? (el.closest('.graph-size-btn') as HTMLElement | null) : null;
                    if (sizeBtn) {
                      e.preventDefault();
                      e.stopPropagation();
                      const wrapper = sizeBtn.closest('.word-graph-wrapper') as HTMLElement | null;
                      if (wrapper) {
                        const action = sizeBtn.getAttribute('data-size-action');
                        const curWidth = parseFloat(wrapper.getAttribute('data-width') || '') || wrapper.getBoundingClientRect().width || 380;
                        const delta = action === 'increase' ? 40 : -40;
                        const newWidth = Math.max(160, Math.min(850, Math.round(curWidth + delta)));
                        wrapper.style.maxWidth = `${newWidth}px`;
                        wrapper.setAttribute('data-width', newWidth.toString());
                        saveCurrentSelection();
                        return;
                      }
                    }

                    // 4. Nút căn lề đồ thị (Trái / Giữa / Phải)
                    const alignBtn = typeof el.closest === 'function' ? (el.closest('.graph-align-btn') as HTMLElement | null) : null;
                    if (alignBtn) {
                      e.preventDefault();
                      e.stopPropagation();
                      const wrapper = alignBtn.closest('.word-graph-wrapper') as HTMLElement | null;
                      if (wrapper) {
                        const align = alignBtn.getAttribute('data-align') || 'center';
                        if (align === 'left') {
                          wrapper.style.marginLeft = '0';
                          wrapper.style.marginRight = 'auto';
                          wrapper.style.textAlign = 'left';
                        } else if (align === 'right') {
                          wrapper.style.marginLeft = 'auto';
                          wrapper.style.marginRight = '0';
                          wrapper.style.textAlign = 'right';
                        } else {
                          wrapper.style.marginLeft = 'auto';
                          wrapper.style.marginRight = 'auto';
                          wrapper.style.textAlign = 'center';
                        }
                        const allAlignBtns = wrapper.querySelectorAll('.graph-align-btn');
                        allAlignBtns.forEach(btn => {
                          if (btn.getAttribute('data-align') === align) {
                            btn.classList.add('bg-slate-100', 'font-bold', 'text-slate-700');
                            btn.classList.remove('text-slate-500');
                          } else {
                            btn.classList.remove('bg-slate-100', 'font-bold', 'text-slate-700');
                            btn.classList.add('text-slate-500');
                          }
                        });
                        saveCurrentSelection();
                        return;
                      }
                    }

                    // 4c. Nút co giãn nhanh Bảng biến thiên (-10% / +10%)
                    const bbtSizeBtn = typeof el.closest === 'function' ? (el.closest('.bbt-size-btn') as HTMLElement | null) : null;
                    if (bbtSizeBtn) {
                      e.preventDefault();
                      e.stopPropagation();
                      const wrapper = bbtSizeBtn.closest('.word-bbt-wrapper') as HTMLElement | null;
                      if (wrapper) {
                        const action = bbtSizeBtn.getAttribute('data-size-action');
                        const curWidth = parseFloat(wrapper.getAttribute('data-width') || '') || wrapper.getBoundingClientRect().width || 520;
                        const delta = action === 'increase' ? 50 : -50;
                        const newWidth = Math.max(300, Math.min(950, Math.round(curWidth + delta)));
                        wrapper.style.maxWidth = `${newWidth}px`;
                        wrapper.setAttribute('data-width', newWidth.toString());
                        saveCurrentSelection();
                        return;
                      }
                    }

                    // 4d. Nút căn lề Bảng biến thiên (Trái / Giữa / Phải)
                    const bbtAlignBtn = typeof el.closest === 'function' ? (el.closest('.bbt-align-btn') as HTMLElement | null) : null;
                    if (bbtAlignBtn) {
                      e.preventDefault();
                      e.stopPropagation();
                      const wrapper = bbtAlignBtn.closest('.word-bbt-wrapper') as HTMLElement | null;
                      if (wrapper) {
                        const align = (bbtAlignBtn.getAttribute('data-align') || 'center') as 'left' | 'center' | 'right';
                        if (align === 'left') {
                          wrapper.style.marginLeft = '0';
                          wrapper.style.marginRight = 'auto';
                          wrapper.style.textAlign = 'left';
                        } else if (align === 'right') {
                          wrapper.style.marginLeft = 'auto';
                          wrapper.style.marginRight = '0';
                          wrapper.style.textAlign = 'right';
                        } else {
                          wrapper.style.marginLeft = 'auto';
                          wrapper.style.marginRight = 'auto';
                          wrapper.style.textAlign = 'center';
                        }
                        wrapper.setAttribute('data-align', align);
                        const allAlignBtns = wrapper.querySelectorAll('.bbt-align-btn');
                        allAlignBtns.forEach(btn => {
                          if (btn.getAttribute('data-align') === align) {
                            btn.classList.add('bg-slate-100', 'font-bold', 'text-slate-700');
                            btn.classList.remove('text-slate-500');
                          } else {
                            btn.classList.remove('bg-slate-100', 'font-bold', 'text-slate-700');
                            btn.classList.add('text-slate-500');
                          }
                        });
                        saveCurrentSelection();
                        return;
                      }
                    }

                    // 5. Chọn vào Đồ thị / Đường gióng trục / Trục tọa độ / Chữ / Số / Điểm mốc để mở thanh tùy biến màu sắc, độ dày, kiểu nét hoặc xóa
                    const svgTarget = typeof el.closest === 'function' ? (el.closest('.graph-curve, .graph-guideline, .graph-axis, .graph-draggable-text, .graph-point, .graph-extrema-circle') as SVGElement | null) : null;
                    if (svgTarget) {
                      if (selectedGraphElement?.targetEl && selectedGraphElement.targetEl !== svgTarget) {
                        selectedGraphElement.targetEl.classList?.remove('graph-element-selected');
                      }
                      svgTarget.classList?.add('graph-element-selected');

                      const wrapper = svgTarget.closest('.word-graph-wrapper');
                      if (wrapper) {
                        const graphId = wrapper.getAttribute('data-graph-id') || '';
                        const elType = (svgTarget.getAttribute('data-element-type') || (svgTarget.tagName === 'circle' ? 'point' : svgTarget.tagName === 'text' ? 'text' : 'curve')) as 'curve' | 'guideline' | 'axis' | 'text' | 'point';
                        const elName = svgTarget.getAttribute('data-label') || (elType === 'curve' ? 'Đồ thị hàm số' : elType === 'guideline' ? 'Đường gióng trục' : elType === 'axis' ? 'Trục tọa độ' : elType === 'point' ? 'Điểm mốc tọa độ' : 'Ký hiệu/Số');
                        const color = svgTarget.getAttribute('stroke') || svgTarget.getAttribute('fill') || '#2563eb';
                        const width = elType === 'point' ? parseFloat(svgTarget.getAttribute('r') || '3.5') : parseFloat(svgTarget.getAttribute('stroke-width') || '2');
                        const dash = svgTarget.getAttribute('stroke-dasharray');
                        const strokeDash = dash === '5,4' || dash === '4,4' || dash === '3,3' ? 'dashed' : dash === '2,2' ? 'dotted' : 'solid';
                        const fontSz = parseFloat(svgTarget.getAttribute('font-size') || '16');
                        const textContent = elType === 'text' ? (svgTarget.textContent || '') : '';

                        setSelectedGraphElement({
                          graphId,
                          elementType: elType,
                          elementName: elName,
                          color,
                          strokeWidth: width,
                          strokeDash,
                          fontSize: fontSz,
                          targetEl: svgTarget,
                          textContent,
                        });
                        return;
                      }
                    }

                    // 5. Nếu click vào công thức toán học đã render để sửa
                    const mathEl = typeof el.closest === 'function' ? (el.closest('.math-rendered') as HTMLElement | null) : null;
                    if (mathEl) {
                      const ltx = mathEl.getAttribute('data-latex');
                      if (ltx) {
                        setMathModalFormula(decodeURIComponent(ltx));
                        setShowMathTypeModal(true);
                        return;
                      }
                    }

                    // Nếu click ra ngoài các phần tử đồ thị thì đóng thanh tùy biến
                    if (typeof el.closest === 'function' && !el.closest('.word-graph-wrapper')) {
                      if (selectedGraphElement?.targetEl) {
                        selectedGraphElement.targetEl.classList?.remove('graph-element-selected');
                      }
                      setSelectedGraphElement(null);
                    }

                    saveCurrentSelection();
                  } catch (err) {
                    console.warn('Error in editor click:', err);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.shiftKey) {
                    e.preventDefault();
                    handleBreakoutOfBlock();
                  } else if (e.key === 'Backspace' || e.key === 'Delete') {
                    // Nếu đang chọn một chữ/số hoặc phần tử đồ thị, xóa ngay lập tức
                    if (selectedGraphElement?.targetEl) {
                      e.preventDefault();
                      handleDeleteSelectedGraphElement();
                      return;
                    }

                    // Xóa triệt để các khối đồ thị / bảng biến thiên / khung nếu chọn hoặc đặt con trỏ sát khối
                    const sel = window.getSelection();
                    if (sel && sel.anchorNode) {
                      const el = sel.anchorNode instanceof Element ? sel.anchorNode : sel.anchorNode.parentElement;
                      const block = el?.closest('.word-graph-wrapper, .word-bbt-wrapper, div[style*="border: 1.5px solid"], pre');
                      if (block && block !== editorRef.current) {
                        e.preventDefault();
                        block.remove();
                        setSelectedGraphElement(null);
                        saveCurrentSelection();
                        return;
                      }

                      // Kiểm tra nếu con trỏ ở cấp editorRef và liền kề phần tử đồ thị/bảng
                      if (sel.anchorNode === editorRef.current) {
                        const offset = sel.anchorOffset;
                        const childNode = e.key === 'Backspace'
                          ? editorRef.current.childNodes[offset - 1]
                          : editorRef.current.childNodes[offset];
                        if (
                          childNode instanceof HTMLElement &&
                          (childNode.classList.contains('word-graph-wrapper') ||
                            childNode.classList.contains('word-bbt-wrapper') ||
                            childNode.classList.contains('lesson-template-box'))
                        ) {
                          e.preventDefault();
                          childNode.remove();
                          setSelectedGraphElement(null);
                          saveCurrentSelection();
                          return;
                        }
                      }
                    }
                  }
                }}
                className={`w-full max-w-4xl bg-white p-8 sm:p-14 rounded-2xl shadow-xl border border-slate-300 min-h-[580px] focus:outline-none focus:ring-2 focus:ring-indigo-400 overflow-y-auto prose max-w-none text-slate-800 word-editor-canvas transition-all ${
                  !isTeacherOrHigher(currentRole) ? 'word-doc-student-mode select-text' : ''
                }`}
                style={{ fontSize: fontSize, lineHeight: '1.6' }}
              />
              <style>{`
                .word-editor-canvas h1 { font-size: 22px; font-weight: 700; margin-top: 14px; margin-bottom: 6px; line-height: 1.3; color: #0f172a; }
                .word-editor-canvas h2 { font-size: 20px; font-weight: 700; margin-top: 12px; margin-bottom: 5px; line-height: 1.35; color: #1e293b; }
                .word-editor-canvas h3 { font-size: 18px; font-weight: 700; margin-top: 10px; margin-bottom: 4px; line-height: 1.4; color: #334155; }
                .word-editor-canvas h4 { font-size: 16px; font-weight: 700; margin-top: 8px; margin-bottom: 4px; line-height: 1.4; color: #475569; }
                .word-editor-canvas p { font-size: 14px; margin-top: 4px; margin-bottom: 4px; line-height: 1.6; }
              `}</style>

              {/* Thanh công cụ tùy chỉnh trực quan khi chọn Đồ thị / Đường gióng / Trục tọa độ / Chữ / Số (Chỉ giáo viên mới thấy) */}
              {selectedGraphElement && isTeacherOrHigher(currentRole) && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white/95 backdrop-blur-md rounded-2xl p-3 shadow-2xl border border-indigo-200 flex flex-wrap items-center gap-3 animate-slide-up text-xs max-w-[96vw]">
                  <div className="flex items-center gap-2 font-bold text-indigo-900 border-r border-slate-200 pr-3">
                    <span className="p-1.5 rounded-xl bg-indigo-100 text-indigo-700 text-sm">🎨</span>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Đang tùy chỉnh</div>
                      <div className="text-xs text-indigo-950 font-bold">{selectedGraphElement.elementName}</div>
                    </div>
                  </div>

                  {/* Bảng màu sắc */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-slate-600">Màu sắc:</span>
                    <div className="flex items-center gap-1">
                      {[
                        { label: 'Xanh dương', color: '#2563eb' },
                        { label: 'Đỏ', color: '#dc2626' },
                        { label: 'Đen', color: '#0f172a' },
                        { label: 'Xanh lá', color: '#16a34a' },
                        { label: 'Tím', color: '#9333ea' },
                        { label: 'Cam', color: '#ea580c' },
                        { label: 'Xám', color: '#64748b' },
                      ].map((c, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleUpdateSelectedGraphStyle({ color: c.color })}
                          className={`w-5 h-5 rounded-full border transition-transform cursor-pointer hover:scale-110 ${
                            selectedGraphElement.color.toLowerCase() === c.color.toLowerCase() ? 'ring-2 ring-indigo-500 scale-110 border-white shadow-xs' : 'border-slate-300'
                          }`}
                          style={{ backgroundColor: c.color }}
                          title={c.label}
                        />
                      ))}
                      <input
                        type="color"
                        value={selectedGraphElement.color.startsWith('#') ? selectedGraphElement.color : '#2563eb'}
                        onChange={(e) => handleUpdateSelectedGraphStyle({ color: e.target.value })}
                        className="w-6 h-6 rounded-md cursor-pointer border border-slate-300 p-0 ml-1"
                        title="Chọn màu tự do"
                      />
                    </div>
                  </div>

                  {/* Độ dày đường nét (nếu là đường: đồ thị, đường gióng, trục) */}
                  {selectedGraphElement.elementType !== 'text' && (
                    <div className="flex items-center gap-1 border-l border-slate-200 pl-3">
                      <span className="text-[11px] font-bold text-slate-600">Độ dày:</span>
                      <div className="flex items-center gap-1">
                        {[1, 1.5, 2, 2.5, 3.5, 5].map((w) => (
                          <button
                            key={w}
                            type="button"
                            onClick={() => handleUpdateSelectedGraphStyle({ strokeWidth: w })}
                            className={`px-1.5 py-0.5 rounded text-[11px] font-bold transition-colors cursor-pointer ${
                              selectedGraphElement.strokeWidth === w
                                ? 'bg-indigo-600 text-white shadow-2xs'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            {w}px
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Kiểu nét (liền / đứt / chấm) */}
                  {selectedGraphElement.elementType !== 'text' && (
                    <div className="flex items-center gap-1 border-l border-slate-200 pl-3">
                      <span className="text-[11px] font-bold text-slate-600">Kiểu nét:</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleUpdateSelectedGraphStyle({ strokeDash: 'solid' })}
                          className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors cursor-pointer ${
                            selectedGraphElement.strokeDash === 'solid'
                              ? 'bg-indigo-600 text-white shadow-2xs'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                          title="Đường nét liền"
                        >
                          ── Liền
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateSelectedGraphStyle({ strokeDash: 'dashed' })}
                          className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors cursor-pointer ${
                            selectedGraphElement.strokeDash === 'dashed'
                              ? 'bg-indigo-600 text-white shadow-2xs'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                          title="Đường nét đứt"
                        >
                          ╌╌ Đứt
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateSelectedGraphStyle({ strokeDash: 'dotted' })}
                          className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors cursor-pointer ${
                            selectedGraphElement.strokeDash === 'dotted'
                              ? 'bg-indigo-600 text-white shadow-2xs'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                          title="Đường nét chấm"
                        >
                          ·· Chấm
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Tùy chọn Sửa trực tiếp nội dung & Cỡ chữ nếu là Chữ / Số */}
                  {selectedGraphElement.elementType === 'text' && (
                    <>
                      <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
                        <span className="text-[11px] font-bold text-slate-600">Sửa nội dung:</span>
                        <input
                          type="text"
                          value={selectedGraphElement.textContent ?? ''}
                          onChange={(e) => handleUpdateSelectedGraphText(e.target.value)}
                          className="px-2 py-1 rounded-lg border border-indigo-300 font-bold text-xs text-indigo-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 w-28 sm:w-36 shadow-inner"
                          placeholder="Nhập chữ/số..."
                          title="Gõ nội dung mới tại đây để đổi trực tiếp chữ/số trên đồ thị"
                        />
                      </div>
                      <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
                        <span className="text-[11px] font-bold text-slate-600">Cỡ chữ:</span>
                        <div className="flex items-center gap-1">
                          {[12, 14, 16, 18, 20, 22].map((sz) => (
                            <button
                              key={sz}
                              type="button"
                              onClick={() => handleUpdateSelectedGraphStyle({ fontSize: sz })}
                              className={`px-1.5 py-0.5 rounded text-[11px] font-bold transition-colors cursor-pointer ${
                                selectedGraphElement.fontSize === sz
                                  ? 'bg-indigo-600 text-white shadow-2xs'
                                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                              }`}
                            >
                              {sz}px
                            </button>
                          ))}
                        </div>
                        <span className="text-[10px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded font-medium border border-amber-200 ml-1">
                          💡 Giữ chuột &amp; kéo để dời vị trí
                        </span>
                      </div>
                    </>
                  )}

                  {/* Độ lớn điểm mốc tọa độ (nếu là Điểm) */}
                  {selectedGraphElement.elementType === 'point' && (
                    <div className="flex items-center gap-1 border-l border-slate-200 pl-3">
                      <span className="text-[11px] font-bold text-slate-600">Độ lớn điểm:</span>
                      <div className="flex items-center gap-1">
                        {[2.5, 3.5, 5, 7].map((r) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => handleUpdateSelectedGraphStyle({ strokeWidth: r })}
                            className={`px-1.5 py-0.5 rounded text-[11px] font-bold transition-colors cursor-pointer ${
                              selectedGraphElement.strokeWidth === r
                                ? 'bg-indigo-600 text-white shadow-2xs'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            {r}px
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Nút Thêm nhãn & Thêm điểm trực tiếp vào đồ thị */}
                  <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
                    <button
                      type="button"
                      onClick={() => handleAddGraphText()}
                      className="px-2.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 border border-emerald-200 font-bold text-xs cursor-pointer flex items-center gap-1 transition-colors shadow-2xs"
                      title="Thêm một nhãn, chữ, hoặc ký hiệu mới trực tiếp vào đồ thị này"
                    >
                      <span>➕ Thêm nhãn</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddGraphPoint()}
                      className="px-2.5 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 border border-blue-200 font-bold text-xs cursor-pointer flex items-center gap-1 transition-colors shadow-2xs"
                      title="Thêm điểm mốc tọa độ & đường gióng trực tiếp vào đồ thị này"
                    >
                      <span>➕ Thêm điểm</span>
                    </button>
                  </div>

                  {/* Nút Xóa chữ/số hoặc phần tử đang chọn (hỗ trợ cả phím Del/Backspace) */}
                  <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
                    <button
                      type="button"
                      onClick={handleDeleteSelectedGraphElement}
                      className="px-3 py-1.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 border border-red-200 font-bold text-xs cursor-pointer flex items-center gap-1.5 transition-colors shadow-2xs"
                      title={`Xóa ${selectedGraphElement.elementName} khỏi đồ thị (Phím Delete hoặc Backspace)`}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      <span>Xóa {selectedGraphElement.elementType === 'text' ? 'chữ/số này' : selectedGraphElement.elementType === 'point' ? 'điểm này' : 'phần tử này'}</span>
                      <kbd className="text-[9px] bg-red-100 text-red-700 px-1 py-0.5 rounded font-mono font-bold">Del</kbd>
                    </button>
                  </div>

                  {/* Nút đóng thanh công cụ */}
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedGraphElement?.targetEl) {
                        selectedGraphElement.targetEl.classList?.remove('graph-element-selected');
                      }
                      setSelectedGraphElement(null);
                    }}
                    className="ml-auto px-2.5 py-1 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 font-bold text-xs cursor-pointer flex items-center gap-1"
                    title="Đóng thanh tùy chỉnh"
                  >
                    ✕ Xong
                  </button>
                </div>
              )}
              </div>
            </div>
          </div>
        </div>
      )}

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
        initialValue={mathModalFormula}
        onClose={() => {
          setShowMathTypeModal(false);
          setMathModalFormula('');
        }}
        onInsert={(_latexCode, renderedHtml) => {
          insertHtmlToEditor(renderedHtml);
        }}
      />

      {/* Modal Chèn Bảng tùy chỉnh số dòng, số cột, có tiêu đề hay không */}
      {showTableModal && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
                  <Table className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">Chèn Bảng Vào Trang Soạn Thảo</h4>
                  <p className="text-[11px] text-slate-500">Cấu hình số dòng, số cột và hàng tiêu đề cho bảng</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTableModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 py-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Số dòng (Hàng):
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={tableRows}
                    onChange={e => setTableRows(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50 text-slate-900"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Tối thiểu: 1, tối đa: 50</span>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Số cột:
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={tableCols}
                    onChange={e => setTableCols(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50 text-slate-900"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Tối thiểu: 1, tối đa: 20</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tableHasHeader}
                    onChange={e => setTableHasHeader(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Có hàng tiêu đề (Header row)</span>
                    <span className="text-[10px] text-slate-500 block">Hàng đầu tiên được in đậm và phân cách rõ ràng để giáo viên nhập</span>
                  </div>
                </label>
              </div>

              {/* Tóm tắt cấu hình bảng */}
              <div className="p-2.5 bg-indigo-50/50 rounded-xl border border-indigo-100 text-center">
                <span className="text-xs font-semibold text-indigo-900">
                  Bảng chuẩn bị chèn: <strong>{tableRows}</strong> dòng × <strong>{tableCols}</strong> cột {tableHasHeader ? '(kèm dòng tiêu đề)' : '(không có tiêu đề)'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowTableModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmInsertTable}
                className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Chèn bảng vào trang</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nhập công thức Đồ thị TikZ */}
      {showWordGraphModal && createPortal(
        <div className="fixed inset-0 z-[99999] bg-slate-900/60 backdrop-blur-xs overflow-y-auto p-3 sm:p-6 flex justify-center items-start">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 space-y-4 animate-scale-up my-4 sm:my-8 max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-sky-100 text-sky-700">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">
                    {editingGraphId ? `Chỉnh sửa Đồ thị: ${wordGraphFormula}` : wordGraphOldTikz ? 'Chỉnh sửa Đồ thị TikZ' : 'Nhập hàm số vẽ Đồ thị TikZ'}
                  </h4>
                  <p className="text-[11px] text-slate-500 font-normal">Tùy chỉnh thông số hàm số, miền x/y và các yêu cầu đồ thị</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setWordGraphOldTikz('');
                  setEditingGraphId(null);
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

                  {/* Ô nhập 1 đơn vị độ dài cho mỗi trục (mặc định là 1 trên Ox và 1 trên Oy, app tự tính độ rộng & cao phù hợp) */}
                  <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-amber-950 flex items-center gap-1">
                        <span>📏 Đơn vị độ dài mỗi trục (Mặc định: Ox = 1, Oy = 1):</span>
                      </label>
                      <span className="text-[9px] text-amber-700 font-semibold bg-amber-100/80 px-1.5 py-0.5 rounded">
                        Tự tính độ rộng & cao
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[9px] font-medium text-slate-600 block mb-0.5">1 đơn vị trên Ox:</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0.1"
                          value={wordGraphUnitX}
                          onChange={e => setWordGraphUnitX(e.target.value)}
                          className="w-full px-2 py-1 rounded-lg border border-amber-200 text-xs font-semibold focus:outline-amber-600 bg-white shadow-2xs"
                          placeholder="1"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-medium text-slate-600 block mb-0.5">1 đơn vị trên Oy:</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0.1"
                          value={wordGraphUnitY}
                          onChange={e => setWordGraphUnitY(e.target.value)}
                          className="w-full px-2 py-1 rounded-lg border border-amber-200 text-xs font-semibold focus:outline-amber-600 bg-white shadow-2xs"
                          placeholder="1"
                        />
                      </div>
                    </div>

                    {/* Hiển thị tính toán độ rộng và độ cao đồ thị tự động phù hợp */}
                    <div className="text-[10px] text-amber-900 bg-white/95 px-2.5 py-1.5 rounded-lg border border-amber-200/80 leading-relaxed">
                      ⚡ Kích thước đồ thị ước tính: <b className="text-amber-700">{(() => {
                        const sx = Math.max(0.2, Math.abs((parseFloat(wordGraphXMax) || 2) - (parseFloat(wordGraphXMin) || -2)));
                        const sy = Math.max(0.2, Math.abs((parseFloat(wordGraphYMax) || 4) - (parseFloat(wordGraphYMin) || -2)));
                        const ux = Math.max(0.1, parseFloat(wordGraphUnitX) || 1);
                        const uy = Math.max(0.1, parseFloat(wordGraphUnitY) || 1);
                        const rawW = sx * ux * 48;
                        const rawH = sy * uy * 48;
                        let sf = 1;
                        if (rawW > 520) sf = Math.min(sf, 520 / rawW);
                        if (rawH > 420) sf = Math.min(sf, 420 / rawH);
                        if (rawW < 220 && rawH < 180) sf = Math.max(sf, 220 / Math.max(rawW, 1));
                        const w = Math.max(200, Math.round(rawW * sf + 68));
                        const h = Math.max(160, Math.round(rawH * sf + 68));
                        return `Rộng ${w}px × Cao ${h}px`;
                      })()}</b> (Tỉ lệ chuẩn {wordGraphUnitX}:{wordGraphUnitY} theo miền x=[{wordGraphXMin}, {wordGraphXMax}], y=[{wordGraphYMin}, {wordGraphYMax}])
                    </div>

                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {[
                        { label: 'Ox = Oy = 1 (Chuẩn 1:1)', ux: '1', uy: '1' },
                        { label: 'Ox = 1, Oy = 0.5 (Nén Oy)', ux: '1', uy: '0.5' },
                        { label: 'Ox = 0.5, Oy = 1 (Nén Ox)', ux: '0.5', uy: '1' },
                        { label: 'Ox = 1, Oy = 2 (Giãn Oy)', ux: '1', uy: '2' },
                      ].map((preset, pIdx) => (
                        <button
                          key={pIdx}
                          type="button"
                          onClick={() => {
                            setWordGraphUnitX(preset.ux);
                            setWordGraphUnitY(preset.uy);
                          }}
                          className={`text-[9px] px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                            wordGraphUnitX === preset.ux && wordGraphUnitY === preset.uy
                              ? 'bg-amber-600 text-white border-amber-600 font-bold'
                              : 'bg-white hover:bg-amber-100 text-amber-900 border-amber-200'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tùy chọn hiển thị hoặc ẩn/xóa chữ và số trên đồ thị */}
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-slate-800 flex items-center gap-1">
                        <span>🏷️ Tùy chọn hiển thị chữ &amp; số trên đồ thị:</span>
                      </label>
                      <span className="text-[9px] text-slate-500 font-medium">
                        (Có thể nhấp trực tiếp vào chữ/số trên trang để xóa)
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <label className="flex items-center gap-1.5 p-1.5 rounded-lg bg-white border border-slate-200 text-[11px] font-semibold text-slate-700 cursor-pointer hover:bg-slate-100/70 transition-colors">
                        <input
                          type="checkbox"
                          checked={wordGraphShowAxisLabels}
                          onChange={e => setWordGraphShowAxisLabels(e.target.checked)}
                          className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                        />
                        <span>Tên trục Ox, Oy</span>
                      </label>

                      <label className="flex items-center gap-1.5 p-1.5 rounded-lg bg-white border border-slate-200 text-[11px] font-semibold text-slate-700 cursor-pointer hover:bg-slate-100/70 transition-colors">
                        <input
                          type="checkbox"
                          checked={wordGraphShowOriginLabel}
                          onChange={e => setWordGraphShowOriginLabel(e.target.checked)}
                          className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                        />
                        <span>Gốc tọa độ O</span>
                      </label>

                      <label className="flex items-center gap-1.5 p-1.5 rounded-lg bg-white border border-slate-200 text-[11px] font-semibold text-slate-700 cursor-pointer hover:bg-slate-100/70 transition-colors">
                        <input
                          type="checkbox"
                          checked={wordGraphShowExtremaLabels}
                          onChange={e => setWordGraphShowExtremaLabels(e.target.checked)}
                          className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                        />
                        <span>Số tọa độ gióng</span>
                      </label>
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
                        setEditingGraphId(null);
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
                      <span>{editingGraphId || wordGraphOldTikz ? 'Xác nhận & Cập nhật đồ thị' : 'Xác nhận & Chèn đồ thị'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal Nhập & Chỉnh Sửa Bảng biến thiên tikz-tab */}
      {showWordBBTModal && createPortal(
        <div className="fixed inset-0 z-[99999] bg-slate-900/60 backdrop-blur-xs overflow-y-auto p-3 sm:p-6 flex justify-center items-start">
          <div className="bg-white rounded-2xl max-w-xl w-full p-5 shadow-2xl border border-slate-200 space-y-4 animate-scale-up my-4 sm:my-8 max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">
                    {editingBbtId ? 'Chỉnh Sửa Bảng Biến Thiên' : 'Chèn Bảng Biến Thiên Chuẩn SGK'}
                  </h4>
                  <p className="text-[11px] text-slate-500 font-normal">
                    Hỗ trợ nhập công thức hàm số tự động hoặc tùy chỉnh từng mốc biến thiên
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowWordBBTModal(false);
                  setEditingBbtId(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Tab chuyển đổi chế độ: Nhập hàm / Nhập Tikz-tab */}
            <div className="flex items-center p-1 bg-slate-100 rounded-xl gap-1">
              <button
                type="button"
                onClick={() => {
                  setWordBbtMode('function');
                  const res = solveFunctionForBbt(wordBbtFormula);
                  if (res.success) {
                    setWordBbtXPoints(res.xPoints);
                    setWordBbtYPrimeSigns(res.yPrimeSigns);
                    setWordBbtYValues(res.yValues);
                    setWordBbtFormulaDesc(res.description);
                    setWordBbtVarName(res.varName);
                    setWordBbtFuncRow(res.funcRow);
                    setWordBbtDerivRow(res.derivRow);
                  }
                }}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  wordBbtMode === 'function'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>🎯</span>
                <span>Nhập hàm</span>
              </button>
              <button
                type="button"
                onClick={() => setWordBbtMode('manual')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  wordBbtMode === 'manual'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>🛠️</span>
                <span>Nhập Tikz-tab</span>
              </button>
            </div>

            {wordBbtMode === 'function' ? (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Công thức hàm số:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={wordBbtFormula}
                      onChange={e => {
                        const val = e.target.value;
                        setWordBbtFormula(val);
                        const res = solveFunctionForBbt(val);
                        if (res.success) {
                          setWordBbtXPoints(res.xPoints);
                          setWordBbtYPrimeSigns(res.yPrimeSigns);
                          setWordBbtYValues(res.yValues);
                          setWordBbtFormulaDesc(res.description);
                          setWordBbtVarName(res.varName);
                          setWordBbtFuncRow(res.funcRow);
                          setWordBbtDerivRow(res.derivRow);
                        } else {
                          setWordBbtFormulaDesc(res.description);
                        }
                      }}
                      placeholder="Ví dụ: y = x^3 - 3x, s = t^3 - 3t, y = (2x+1)/(x-1) hoặc f(x) = (x^2 - x + 1)/(x - 1)"
                      className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold focus:outline-emerald-600 bg-slate-50 text-slate-900"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const res = solveFunctionForBbt(wordBbtFormula);
                        if (res.success) {
                          setWordBbtXPoints(res.xPoints);
                          setWordBbtYPrimeSigns(res.yPrimeSigns);
                          setWordBbtYValues(res.yValues);
                          setWordBbtFormulaDesc(res.description);
                          setWordBbtVarName(res.varName);
                          setWordBbtFuncRow(res.funcRow);
                          setWordBbtDerivRow(res.derivRow);
                          setNotification({ text: 'Đã giải hàm số và cập nhật mốc biến thiên!', type: 'success' });
                          setTimeout(() => setNotification(null), 2500);
                        }
                      }}
                      className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer shadow-xs"
                    >
                      ⚡ Giải tự động
                    </button>
                  </div>
                </div>

                {/* Mô tả nhận diện dạng hàm, biến số & cực trị */}
                {wordBbtFormulaDesc && (
                  <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 text-[11px] flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span>💡</span>
                      <span className="font-medium">{wordBbtFormulaDesc}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold">
                        Biến: {wordBbtVarName}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold">
                        Hàm: {wordBbtFuncRow}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Chế độ 2: Nhập Tikz-tab 3 hàng gọn gàng không text dư thừa */
              <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                {/* Hàng 1: [Tên biến (mặc định x)] [Các mốc] */}
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-12 sm:col-span-4">
                    <input
                      type="text"
                      value={wordBbtVarName}
                      onChange={e => setWordBbtVarName(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white text-slate-900 shadow-2xs"
                      placeholder="Tên biến (mặc định x)"
                    />
                  </div>
                  <div className="col-span-12 sm:col-span-8">
                    <input
                      type="text"
                      value={wordBbtXPoints}
                      onChange={e => setWordBbtXPoints(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white text-slate-900 shadow-2xs"
                      placeholder="Các mốc: -\infty, -1, 1, +\infty"
                    />
                  </div>
                </div>

                {/* Hàng 2: [Tên đạo hàm (mặc định {tên hàm}')] [Dấu đạo hàm (+; -; 0; |; ||)] */}
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-12 sm:col-span-4">
                    <input
                      type="text"
                      value={wordBbtDerivRow}
                      onChange={e => setWordBbtDerivRow(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white text-slate-900 shadow-2xs"
                      placeholder={`Tên đạo hàm (mặc định ${wordBbtFuncRow || 'y'}')`}
                    />
                  </div>
                  <div className="col-span-12 sm:col-span-8">
                    <input
                      type="text"
                      value={wordBbtYPrimeSigns}
                      onChange={e => setWordBbtYPrimeSigns(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white text-slate-900 shadow-2xs font-mono"
                      placeholder="Dấu đạo hàm (+; -; 0; |; ||): , +, 0, -, 0, +, "
                    />
                  </div>
                </div>

                {/* Hàng 3: [Tên hàm (mặc định y)] [Các giá trị biến thiên (tự nhận diện trên/giữa/dưới)] */}
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-12 sm:col-span-4">
                    <input
                      type="text"
                      value={wordBbtFuncRow}
                      onChange={e => {
                        const val = e.target.value;
                        const oldFunc = wordBbtFuncRow;
                        setWordBbtFuncRow(val);
                        if (wordBbtDerivRow === "y'" || wordBbtDerivRow === `${oldFunc}'`) {
                          setWordBbtDerivRow(val ? `${val}'` : "y'");
                        }
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white text-slate-900 shadow-2xs"
                      placeholder="Tên hàm (mặc định y)"
                    />
                  </div>
                  <div className="col-span-12 sm:col-span-8">
                    <input
                      type="text"
                      value={wordBbtYValues}
                      onChange={e => setWordBbtYValues(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white text-slate-900 shadow-2xs font-mono"
                      placeholder="Các giá trị (tự nhận diện trên/giữa/dưới): -\infty, 2, -2, +\infty"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* KHUNG XEM TRƯỚC TRỰC QUAN (LIVE PREVIEW) */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Xem trước Bảng biến thiên (Căn thẳng hàng 100%):</span>
                </span>
                <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Chuẩn SGK & KaTeX
                </span>
              </div>
              <div
                className="p-3 bg-slate-50 rounded-xl border border-slate-200 overflow-x-auto min-h-[140px] flex items-center justify-center shadow-inner"
                dangerouslySetInnerHTML={{
                  __html: generateWordBbtHtml(
                    wordBbtXPoints,
                    wordBbtYPrimeSigns,
                    wordBbtYValues,
                    'preview-bbt',
                    wordBbtFormula,
                    wordBbtMode,
                    undefined,
                    'center',
                    wordBbtVarName,
                    wordBbtFuncRow,
                    wordBbtDerivRow
                  )
                }}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setShowWordBBTModal(false);
                  setEditingBbtId(null);
                }}
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
                <span>{editingBbtId ? 'Xác nhận & Cập nhật' : 'Xác nhận & Chèn bảng'}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal Tự vẽ tay Canvas & Nắn chuẩn TikZ / tikz-tab */}
      {showWordDrawSketchModal && createPortal(
        <div className="fixed inset-0 z-[99999] bg-slate-900/60 backdrop-blur-xs overflow-y-auto p-3 sm:p-6 flex justify-center items-start">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-5 shadow-2xl border border-slate-200 space-y-4 animate-scale-up my-4 sm:my-8 max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] overflow-y-auto">
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
        </div>,
        document.body
      )}

      {/* Modal xác nhận xóa */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-3">
            <h4 className="font-bold text-sm text-rose-700">Xác nhận xóa tùy chọn</h4>
            <p className="text-xs text-slate-600">
              Bạn có chắc chắn muốn xóa mục <strong>"{deleteConfirm.item}"</strong> không?
            </p>
            {isDeletingItem && (
              <p className="text-xs font-bold text-rose-600 animate-pulse flex items-center gap-1.5 pt-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-600" />
                Hệ thống đang xóa, vui lòng đợi....
              </p>
            )}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isDeletingItem}
                onClick={() => setDeleteConfirm(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={isDeletingItem}
                onClick={executeDeleteItem}
                className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs disabled:opacity-50 flex items-center gap-1.5"
              >
                {isDeletingItem && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Xác nhận xóa</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Thêm mới / Sửa tên / Xóa bài cho Kiến thức (KienThuc_*.html), Luyện tập (luyentap_*.json), KTĐG (KTDG_*.json) */}
      {itemActionModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-indigo-100 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className={`p-2 rounded-xl text-white ${itemActionModal.type === 'delete' ? 'bg-rose-600' : 'bg-indigo-600'}`}>
                  {itemActionModal.type === 'delete' ? <Trash2 className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                </span>
                <div>
                  <h4 className="font-extrabold text-slate-800 text-sm">
                    {itemActionModal.type === 'delete'
                      ? 'Xác nhận xóa'
                      : itemActionModal.item
                      ? 'Đổi tên bài'
                      : 'Thêm bài mới'}
                  </h4>
                  <p className="text-xs text-slate-500">
                    {itemActionModal.category === 'kienThuc'
                      ? 'Mục 1. Kiến thức (Tệp KienThuc_{tên}.html)'
                      : itemActionModal.category === 'luyenTap'
                      ? 'Mục 2. Luyện tập (Tệp luyentap_{tên}.json)'
                      : 'Mục 3. KTĐG (Tệp KTDG_{tên}.json)'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setItemActionModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {itemActionModal.type === 'delete' ? (
              <p className="text-xs text-slate-700 font-medium leading-relaxed">
                Bạn có chắc chắn muốn xóa bài <strong>"{itemActionModal.item}"</strong> không? Hành động này sẽ loại bỏ tệp tương ứng khỏi danh sách bài dạy.
              </p>
            ) : (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">Tên bài mới:</label>
                <input
                  type="text"
                  value={itemActionModal.newName}
                  onChange={(e) => setItemActionModal({ ...itemActionModal, newName: e.target.value })}
                  placeholder="Nhập tên bài..."
                  className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleConfirmItemAction();
                    if (e.key === 'Escape') setItemActionModal(null);
                  }}
                />
                <div className="text-[11px] text-indigo-600 font-mono bg-indigo-50/80 p-2 rounded-lg border border-indigo-100">
                  📄 Tệp trên Drive sẽ là:{' '}
                  <strong>
                    {itemActionModal.category === 'kienThuc'
                      ? `KienThuc_${(itemActionModal.newName || 'ten_kien_thuc').toLowerCase().replace(/[^a-zA-Z0-9_-]+/g, '_')}.html`
                      : itemActionModal.category === 'luyenTap'
                      ? `luyentap_${(itemActionModal.newName || 'ten_bai').toLowerCase().replace(/[^a-zA-Z0-9_-]+/g, '_')}.json`
                      : `KTDG_${(itemActionModal.newName || 'ten_de').toLowerCase().replace(/[^a-zA-Z0-9_-]+/g, '_')}.json`}
                  </strong>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setItemActionModal(null)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 border border-slate-200 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmItemAction}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold text-white shadow-xs cursor-pointer ${
                  itemActionModal.type === 'delete' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {itemActionModal.type === 'delete' ? 'Xác nhận xóa' : 'Lưu tên bài'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};