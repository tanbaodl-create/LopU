import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  FileText,
  Save,
  Cloud,
  Send,
  BookOpen,
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
  Heading1,
  Heading2,
  FileDown,
  Printer,
  ChevronRight,
  ChevronDown,
  Layers,
  Lock,
  Unlock,
  Coins,
  Check,
  Sparkles,
  Maximize2,
  Minimize2,
  FolderTree,
  FolderLock,
  CornerDownLeft,
  Edit3,
  Trash2,
  Loader2,
  RefreshCw,
  Undo,
  Redo,
  Baseline,
  Highlighter,
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { TeacherDocument, ClassItem, UserRole } from '../../../services/storageTypes';
import { getClasses, getTeacherDocuments } from '../../ConnectData/ConnectFirestore';
import { HierarchySelector } from '../TaiLieuCaNhan/HierarchySelector';
import { MenuHamSo } from './MenuHamSo';
import { MenuChen } from './MenuChen';
import { DongBoDriveButton, useDongBoDrive, loadChuyenDeContentFromDrive, removeVietnameseTones, ensureValidDriveToken, deduplicateItemsBySlug } from './DongBoDrive';
import { WordTextColorPicker, WordHighlightColorPicker } from './WordColorPicker';
import { WordStyleMenu } from './WordStyleMenu';
import { renderLatexInHtml, autoRenderLatexInDom } from './latexUtils';

export interface SoanThaoViewProps {
  currentRole?: UserRole;
}

export const SoanThaoView: React.FC<SoanThaoViewProps> = ({ currentRole = 'teacher' }) => {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [documents, setDocuments] = useState<TeacherDocument[]>([]);
  
  // Editor & Metadata States: gợi ý cho tên tài liệu, nội dung bài dạy mặc định là rỗng
  const [title, setTitle] = useState<string>('');
  const [subject, setSubject] = useState<string>('Toán Học');
  const [grade, setGrade] = useState<string>('Khối 10');
  const [chuong, setChuong] = useState<string>('');
  const [bai, setBai] = useState<string>('');
  const [vanDe, setVanDe] = useState<string>('');
  const [chuyenDe, setChuyenDe] = useState<string>('');
  const [tienTrinh, setTienTrinh] = useState<string>('Kiến thức');
  const [selectedKienThucName, setSelectedKienThucName] = useState<string>('Lý thuyết trọng tâm');
  const [selectedExerciseName, setSelectedExerciseName] = useState<string>('');

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

  // Modal sửa tên / xóa bài cho Kiến thức, Luyện tập, KTĐG
  const [itemActionModal, setItemActionModal] = useState<{
    type: 'rename' | 'delete';
    category: 'kienThuc' | 'luyenTap' | 'ktdg';
    item: string;
    newName: string;
  } | null>(null);

  const handleConfirmItemAction = async () => {
    if (!itemActionModal) return;
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
      const cleanSlug = removeVietnameseTones(cleanName).toLowerCase().replace(/[^a-z0-9]/g, '');
      const isExistInList = targetList.some(x => x.toLowerCase().trim() === cleanName.toLowerCase() || removeVietnameseTones(x).toLowerCase().replace(/[^a-z0-9]/g, '') === cleanSlug);

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
            const loadedSlug = removeVietnameseTones(driveCheck.loadedFile.name).toLowerCase().replace(/[^a-z0-9]/g, '');
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
        updated = Array.from(new Set([...customKienThucList, cleanName]));
      }
      setCustomKienThucList(updated);
      localStorage.setItem('lopu_custom_kienthuc_list', JSON.stringify(updated));
      setSelectedKienThucName(cleanName);

      if (!item) {
        if (editorRef.current) editorRef.current.innerHTML = '<p><br></p>';
        lastLoadedKeyRef.current = `${title}__${chuong}__${bai}__${vanDe}__${chuyenDe}__${tienTrinh}__${cleanName}__${selectedExerciseName}`;
      }

      const fileSlug = removeVietnameseTones(cleanName).toLowerCase().replace(/[^a-z0-9]/g, '_');
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
        if (editorRef.current) editorRef.current.innerHTML = '<p><br></p>';
        lastLoadedKeyRef.current = `${title}__${chuong}__${bai}__${vanDe}__${chuyenDe}__${tienTrinh}__${selectedKienThucName}__${cleanName}`;
      }

      const fileSlug = removeVietnameseTones(cleanName).toLowerCase().replace(/[^a-z0-9]/g, '_');
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
        if (editorRef.current) editorRef.current.innerHTML = '<p><br></p>';
        lastLoadedKeyRef.current = `${title}__${chuong}__${bai}__${vanDe}__${chuyenDe}__${tienTrinh}__${selectedKienThucName}__${cleanName}`;
      }

      const fileSlug = removeVietnameseTones(cleanName).toLowerCase().replace(/[^a-z0-9]/g, '_');
      setNotification({
        text: `Đã ${item ? 'đổi tên thành' : 'mở trang Word mới với nội dung rỗng cho đề'} "${cleanName}" (Tệp Drive: KTDG_${fileSlug}.json)`,
        type: 'success',
      });
    }

    setItemActionModal(null);
    setTimeout(() => setNotification(null), 3500);
  };
  const [insertPositionMode, setInsertPositionMode] = useState<'cursor' | 'bottom'>('bottom');
  const [isHierarchyExpanded, setIsHierarchyExpanded] = useState<boolean>(false);
  const [openSoanBaiMenu, setOpenSoanBaiMenu] = useState<boolean>(false);
  
  const [isForSale, setIsForSale] = useState<boolean>(false);
  const [priceDiamonds, setPriceDiamonds] = useState<number>(50);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Editor styling states: mặc định nội dung 14px; H1 22px; H2 20px; H3 18px; H4 16px
  const editorRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState<string>('14px');
  const [textColor, setTextColor] = useState<string>('#0f172a');
  const [highlightColor, setHighlightColor] = useState<string>('transparent');
  const [selectedStyle, setSelectedStyle] = useState<string>('p');
  const [isBold, setIsBold] = useState<boolean>(false);
  const [isItalic, setIsItalic] = useState<boolean>(false);
  const [isUnderline, setIsUnderline] = useState<boolean>(false);
  const [currentAlignment, setCurrentAlignment] = useState<'left' | 'center' | 'right' | 'justify'>('left');
  const [openAlignMenu, setOpenAlignMenu] = useState<boolean>(false);
  const [openTextColorMenu, setOpenTextColorMenu] = useState<boolean>(false);
  const [openHighlightColorMenu, setOpenHighlightColorMenu] = useState<boolean>(false);
  const [openStyleMenu, setOpenStyleMenu] = useState<boolean>(false);

  // Module con DongBoDrive: Quản lý tự động đồng bộ & lưu đơn lẻ lên Drive theo phân cấp chuẩn
  const {
    isSaving,
    syncStatus,
    lastSavedTime,
    saveDocument: saveDriveDoc,
    markDirty,
  } = useDongBoDrive({
    enableAutoSave: true,
    autoSaveDelayMs: 40000,
    onNotification: (notif) => {
      setNotification(notif);
      setTimeout(() => setNotification(null), 5000);
    },
    getDocData: () => ({
      title,
      subject,
      grade,
      chuong,
      bai,
      vanDe,
      chuyenDe,
      tienTrinh,
      selectedKienThucName,
      selectedExerciseName,
      contentHtml: editorRef.current ? editorRef.current.innerHTML : '<p>Chưa có nội dung</p>',
      textContent: editorRef.current ? editorRef.current.innerText : '',
      selectedClasses,
      isForSale,
      priceDiamonds,
    }),
  });

  const isTeacherOrHigher = !currentRole || ['teacher', 'manager', 'admin', 'superadmin'].includes(currentRole);
  const isChuyenDeSelected = Boolean(chuyenDe && chuyenDe.trim());

  // Load classes and documents on mount
  useEffect(() => {
    async function load() {
      const cls = await getClasses();
      setClasses(cls);
      const docs = await getTeacherDocuments();
      setDocuments(docs);
    }
    load();
  }, []);

  // Trạng thái tự động nạp dữ liệu từ Google Drive vào cửa sổ soạn thảo Word
  const [isLoadingFromDrive, setIsLoadingFromDrive] = useState<boolean>(false);
  const [isReauthenticating, setIsReauthenticating] = useState<boolean>(false);
  const [isBackgroundSyncing, setIsBackgroundSyncing] = useState<boolean>(false);
  const [driveLoadStatus, setDriveLoadStatus] = useState<string>('');
  const activeLoadIdRef = useRef<number>(0);
  const lastLoadedKeyRef = useRef<string>('');

  // Lắng nghe sự kiện xác thực lại nền Google Drive để đồng bộ giao diện khóa/mở khóa
  useEffect(() => {
    const handleAuthChange = (e: any) => {
      setIsReauthenticating(Boolean(e.detail?.isAuthenticating));
    };
    const handleTokenExpired = () => {
      if (isTeacherOrHigher) {
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
  }, [isTeacherOrHigher]);

  // Hàm tự động nạp dữ liệu từ Google Drive cho chuyên đề đang chọn
  const handleLoadFromDrive = useCallback(async (force: boolean = false) => {
    if (!chuyenDe || !chuyenDe.trim()) return;
    const currentKey = `${title}__${chuong}__${bai}__${vanDe}__${chuyenDe}__${tienTrinh}__${selectedKienThucName}__${selectedExerciseName}`;
    if (!force && lastLoadedKeyRef.current === currentKey) return;

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
    if (!isTeacherOrHigher && cachedContent && cachedContent.trim()) {
      if (editorRef.current) {
        editorRef.current.innerHTML = renderLatexInHtml(cachedContent);
      }
      setIsLoadingFromDrive(false);
      lastLoadedKeyRef.current = currentKey;

      setIsBackgroundSyncing(true);
      (async () => {
        try {
          const res = await loadChuyenDeContentFromDrive({
            title,
            subject,
            grade,
            chuong,
            bai,
            vanDe,
            chuyenDe,
            tienTrinh,
            selectedKienThucName: selectedKienThucName || customKienThucList[0] || 'Lý thuyết trọng tâm',
            selectedExerciseName: selectedExerciseName || (tienTrinh === 'Luyện tập' ? (customLuyenTapList[0] || 'Bài luyện tập 1') : (customKtdgList[0] || 'Đề kiểm tra 15 phút')),
            isStudent: true,
            allowInteractivePopup: false,
          });
          if (res.loadedFile && res.contentHtml && res.contentHtml.trim() && res.contentHtml !== cachedContent) {
            if (editorRef.current) {
              editorRef.current.innerHTML = renderLatexInHtml(res.contentHtml);
            }
          }
        } catch (bgErr) {
          console.warn('Lỗi cập nhật nền cho học sinh:', bgErr);
        } finally {
          setIsBackgroundSyncing(false);
        }
      })();
      return;
    }

    // 2. VỚI GIÁO VIÊN: BẮT BUỘC ĐẢM BẢO CẬP NHẬT MỚI NHẤT MỚI ĐƯỢC SOẠN BÀI
    // Khi Xác thực lại nền chưa xong thì vẫn báo "Đang đồng bộ" và KHÓA cửa sổ Word!
    const loadId = ++activeLoadIdRef.current;
    setIsLoadingFromDrive(true);
    setDriveLoadStatus(`Đang kết nối Google Drive và tải nội dung cho "${chuyenDe}"...`);

    // PHA 1: Khóa chặt cửa sổ Word và làm sạch nội dung văn bản cũ ngay lập tức
    if (editorRef.current) {
      editorRef.current.innerHTML = '';
    }

    try {
      const firstDropdownItem = 
        tienTrinh === 'Kiến thức' ? (selectedKienThucName || customKienThucList[0] || 'Lý thuyết trọng tâm') :
        tienTrinh === 'Luyện tập' ? (selectedExerciseName || customLuyenTapList[0] || 'Bài luyện tập 1') :
        tienTrinh === 'KTDG' ? (selectedExerciseName || customKtdgList[0] || 'Đề kiểm tra 15 phút') : '';

      const res = await loadChuyenDeContentFromDrive({
        title,
        subject,
        grade,
        chuong,
        bai,
        vanDe,
        chuyenDe,
        tienTrinh,
        selectedKienThucName: selectedKienThucName || customKienThucList[0] || 'Lý thuyết trọng tâm',
        selectedExerciseName: selectedExerciseName || (tienTrinh === 'Luyện tập' ? (customLuyenTapList[0] || 'Bài luyện tập 1') : (customKtdgList[0] || 'Đề kiểm tra 15 phút')),
        firstDropdownItemName: firstDropdownItem,
        isStudent: !isTeacherOrHigher,
        allowInteractivePopup: isTeacherOrHigher,
      });

      // Nếu đã có thao tác chọn mới hơn thì dừng
      if (loadId !== activeLoadIdRef.current) return;
      lastLoadedKeyRef.current = currentKey;

      // Cập nhật danh sách các bài kiến thức từ Drive nếu có
      if (res.kienThucFiles && res.kienThucFiles.length > 0) {
        setCustomKienThucList(prev => {
          const merged = Array.from(new Set([...res.kienThucFiles, ...prev]));
          localStorage.setItem('lopu_custom_kienthuc_list', JSON.stringify(merged));
          return merged;
        });
      }

      // Cập nhật danh sách bài luyện tập từ Drive nếu có
      if (res.luyenTapFiles && res.luyenTapFiles.length > 0) {
        setCustomLuyenTapList(prev => {
          const merged = Array.from(new Set([...res.luyenTapFiles, ...prev]));
          localStorage.setItem('lopu_custom_luyentap_list', JSON.stringify(merged));
          return merged;
        });
      }

      // Cập nhật danh sách đề KTDG từ Drive nếu có
      if (res.ktdgFiles && res.ktdgFiles.length > 0) {
        setCustomKtdgList(prev => {
          const merged = Array.from(new Set([...res.ktdgFiles, ...prev]));
          localStorage.setItem('lopu_custom_ktdg_list', JSON.stringify(merged));
          return merged;
        });
      }

      // PHA 2: Nếu có file trên Drive -> nạp file đầu tiên; Nếu không có file -> giữ trang trắng
      if (res.loadedFile && res.contentHtml !== undefined) {
        // Nạp nội dung tệp vào cửa sổ Word và render ngay công thức toán
        if (editorRef.current) {
          editorRef.current.innerHTML = renderLatexInHtml(res.contentHtml);
        }

        // Tự động đồng bộ mục đang chọn trên dropdown theo file Drive được nạp
        const loadedFileName = res.loadedFile.name;
        if (loadedFileName.toLowerCase().startsWith('kienthuc_') && loadedFileName.toLowerCase().endsWith('.html')) {
          const rawSlug = removeVietnameseTones(loadedFileName.replace(/^kienthuc_/i, '').replace(/\.html$/i, ''))
            .toLowerCase().replace(/[^a-z0-9]/g, '');
          const matchedItem = customKienThucList.find(item => {
            const itemSlug = removeVietnameseTones(item).toLowerCase().replace(/[^a-z0-9]/g, '');
            return rawSlug === itemSlug || rawSlug.includes(itemSlug) || itemSlug.includes(rawSlug);
          });
          if (matchedItem) {
            setSelectedKienThucName(matchedItem);
          } else {
            const rawName = loadedFileName.slice('KienThuc_'.length, -'.html'.length);
            let friendlyName = rawName;
            if (rawName.toLowerCase() === 'lythuyettrongtam') friendlyName = 'Lý thuyết trọng tâm';
            else if (rawName.toLowerCase() === 'tomtatcongthuc') friendlyName = 'Tóm tắt công thức';
            setSelectedKienThucName(friendlyName);
            setCustomKienThucList(prev => deduplicateItemsBySlug([friendlyName, ...prev]));
          }
        } else if (loadedFileName.toLowerCase().startsWith('luyentap_') && loadedFileName.toLowerCase().endsWith('.json')) {
          const rawSlug = removeVietnameseTones(loadedFileName.replace(/^luyentap_/i, '').replace(/\.json$/i, ''))
            .toLowerCase().replace(/[^a-z0-9]/g, '');
          const matchedItem = customLuyenTapList.find(item => {
            const itemSlug = removeVietnameseTones(item).toLowerCase().replace(/[^a-z0-9]/g, '');
            return rawSlug === itemSlug || rawSlug.includes(itemSlug) || itemSlug.includes(rawSlug);
          });
          if (matchedItem) {
            setSelectedExerciseName(matchedItem);
          } else {
            const rawName = loadedFileName.slice('luyentap_'.length, -'.json'.length);
            let friendlyName = rawName;
            if (rawName.toLowerCase() === 'co_ban' || rawName.toLowerCase() === 'coban') friendlyName = 'Bài luyện tập cơ bản';
            setSelectedExerciseName(friendlyName);
            setCustomLuyenTapList(prev => deduplicateItemsBySlug([friendlyName, ...prev]));
          }
        } else if (loadedFileName.toLowerCase().startsWith('ktdg_') && loadedFileName.toLowerCase().endsWith('.json')) {
          const rawSlug = removeVietnameseTones(loadedFileName.replace(/^ktdg_/i, '').replace(/\.json$/i, ''))
            .toLowerCase().replace(/[^a-z0-9]/g, '');
          const matchedItem = customKtdgList.find(item => {
            const itemSlug = removeVietnameseTones(item).toLowerCase().replace(/[^a-z0-9]/g, '');
            return rawSlug === itemSlug || rawSlug.includes(itemSlug) || itemSlug.includes(rawSlug);
          });
          if (matchedItem) {
            setSelectedExerciseName(matchedItem);
          } else {
            const rawName = loadedFileName.slice('ktdg_'.length, -'.json'.length);
            let friendlyName = rawName;
            if (rawName.toLowerCase() === 'danh_gia_nang_luc' || rawName.toLowerCase() === 'danhgianangluc') friendlyName = 'Kiểm tra đánh giá năng lực';
            setSelectedExerciseName(friendlyName);
            setCustomKtdgList(prev => deduplicateItemsBySlug([friendlyName, ...prev]));
          }
        }

        setNotification({
          text: `Đã nạp thành công nội dung tệp "${res.loadedFile.name}" từ Google Drive!`,
          type: 'success',
        });
        setTimeout(() => setNotification(null), 3000);
      } else {
        // Khi không có file nào trong chuyên đề trên Drive -> làm sạch trang, sẵn sàng soạn bài mới
        if (editorRef.current) {
          editorRef.current.innerHTML = '';
        }
        setNotification({
          text: `Chuyên đề "${chuyenDe}" chưa có file trên Drive. Cửa sổ đã mở khóa sẵn sàng soạn bài mới!`,
          type: 'info',
        });
        setTimeout(() => setNotification(null), 3000);
      }
    } catch (err: any) {
      console.warn('Lỗi khi tự động nạp từ Drive:', err);
      if (editorRef.current) {
        editorRef.current.innerHTML = '';
      }
    } finally {
      // Dù có file hay không có file nào: Luôn luôn tắt chữ "Đang đồng bộ" màu đỏ và mở khóa Word
      if (loadId === activeLoadIdRef.current) {
        setIsLoadingFromDrive(false);
        setDriveLoadStatus('');
      }
    }
  }, [title, subject, grade, chuong, bai, vanDe, chuyenDe, tienTrinh, selectedKienThucName, selectedExerciseName]);

  // Tự động tải từ Drive ngay khi giáo viên vào chuyên đề đó
  useEffect(() => {
    if (chuyenDe && chuyenDe.trim()) {
      handleLoadFromDrive();
    } else {
      lastLoadedKeyRef.current = '';
      if (editorRef.current) editorRef.current.innerHTML = '';
    }
  }, [title, chuyenDe, chuong, bai, vanDe, tienTrinh, selectedKienThucName, selectedExerciseName, handleLoadFromDrive]);

  // Các nút công cụ định dạng Word
  const savedRangeRef = useRef<Range | null>(null);
  const saveCurrentSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    }
  };

  const insertHtmlToEditor = (html: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    const sel = window.getSelection();
    if (savedRangeRef.current && sel) {
      sel.removeAllRanges();
      sel.addRange(savedRangeRef.current);
    }
    document.execCommand('insertHTML', false, html);
    saveCurrentSelection();
  };

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

  const execCommand = (command: string, value: string = '') => {
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

  // Hàm điều khiển cỡ chữ từ Dropdown cỡ chữ
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

  const handleInsertTable = () => {
    const rows = prompt('Nhập số hàng:', '3');
    const cols = prompt('Nhập số cột:', '3');
    if (!rows || !cols) return;
    
    let tableHtml = `<table border="1" style="width:100%; border-collapse: collapse; margin-top: 10px; border-color: #cbd5e1;">`;
    for (let i = 0; i < parseInt(rows); i++) {
      tableHtml += '<tr>';
      for (let j = 0; j < parseInt(cols); j++) {
        if (i === 0) {
          tableHtml += `<th style="padding: 8px; background-color: #f1f5f9; font-weight: bold; text-align: left;">Tiêu đề ${j+1}</th>`;
        } else {
          tableHtml += `<td style="padding: 8px; text-align: left;">Dữ liệu</td>`;
        }
      }
      tableHtml += '</tr>';
    }
    tableHtml += '</table><p></p>';
    execCommand('insertHTML', tableHtml);
  };

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
  const handleInsertLessonTemplate = (templateType: string) => {
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

    switch (templateType) {
      case 'khaiNiem':
        blockTitle = '📌 KHÁI NIỆM / ĐỊNH NGHĨA:';
        blockBg = '#f8fafc';
        blockBorder = '#4f46e5';
        tplContent = hasSelection
          ? `
            <strong style="color: #4f46e5; font-size: 15px;">${blockTitle}</strong>
            <div style="margin-top: 6px; color: #1e293b; line-height: 1.6;">${selectedHtml || selectedText}</div>
          `
          : `
            <strong style="color: #4f46e5; font-size: 15px;">${blockTitle}</strong>
            <p style="margin-top: 6px; color: #1e293b;">Nêu rõ định nghĩa, bản chất và các điều kiện xác định...</p>
          `;
        break;
      case 'dinhLy':
        blockTitle = '⚖️ ĐỊNH LÝ / TÍNH CHẤT:';
        blockBg = '#f0fdf4';
        blockBorder = '#16a34a';
        tplContent = hasSelection
          ? `
            <strong style="color: #16a34a; font-size: 15px;">${blockTitle}</strong>
            <div style="margin-top: 6px; color: #1e293b; line-height: 1.6;">${selectedHtml || selectedText}</div>
          `
          : `
            <strong style="color: #16a34a; font-size: 15px;">${blockTitle}</strong>
            <p style="margin-top: 6px; color: #1e293b;">Cho điều kiện ..., khi đó ta có kết luận ...</p>
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

  // Xử lý lưu tài liệu và chuyển sang Drive + Phát hành lớp học (thông qua Module con DongBoDrive)
  const handleSaveDocument = async (startLiveTeaching: boolean = false) => {
    const res = await saveDriveDoc(false);
    if (res.success && startLiveTeaching) {
      setTimeout(() => {
        setNotification({ text: '🚀 Đang chuẩn bị chuyển hướng bạn đến bảng dạy lớp chuyên đề...', type: 'success' });
        // Giả lập chuyển tab
        const btnMgmt = document.getElementById('menu-item-teaching-management');
        if (btnMgmt) {
          btnMgmt.click();
        }
      }, 1500);
    }
  };

  const toggleClassSelection = (classId: string) => {
    setSelectedClasses(prev => 
      prev.includes(classId) ? prev.filter(c => c !== classId) : [...prev, classId]
    );
  };

  return (
    <div id="soanthao-view" className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div className={`p-4 border rounded-xl text-xs font-bold flex items-center gap-2.5 shadow-md transition-all ${
          notification.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
          notification.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' :
          'bg-indigo-50 border-indigo-200 text-indigo-800'
        }`}>
          <Cloud className="w-5 h-5 shrink-0" />
          <span className="leading-relaxed">{notification.text}</span>
        </div>
      )}

      {/* Main Grid: Cấu hình Tài liệu và Soạn thảo */}
      <div className="space-y-4">
        {/* NẾU CHUYÊN ĐỀ RỖNG: Ẩn cửa sổ Word, Mở rộng Tài liệu & NỘI DUNG BÀI DẠY */}
        {!isChuyenDeSelected ? (
          <div className="max-w-4xl mx-auto space-y-4 animate-fade-in">
            <div className="p-4 bg-indigo-50 border border-indigo-200 text-indigo-950 rounded-2xl flex items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2.5">
                <FolderTree className="w-5 h-5 text-indigo-600 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wide">
                    Cấu hình Tài Liệu & Nội Dung Bài Dạy
                  </h4>
                  <p className="text-[11px] text-indigo-700 mt-0.5">
                    Vui lòng chọn hoặc thêm <strong>Chuyên đề</strong> để mở giao diện Soạn thảo Word toàn màn hình. Khi tên tài liệu = rỗng, nội dung bài dạy được ẩn.
                  </p>
                </div>
              </div>
            </div>

            <HierarchySelector
              title={title}
              onChangeTitle={setTitle}
              chuong={chuong}
              onChangeChuong={setChuong}
              bai={bai}
              onChangeBai={setBai}
              vanDe={vanDe}
              onChangeVanDe={setVanDe}
              chuyenDe={chuyenDe}
              onChangeChuyenDe={(cd) => {
                setChuyenDe(cd);
                if (cd && cd.trim()) {
                  setIsLoadingFromDrive(true);
                  setDriveLoadStatus(`Đang kết nối Google Drive và nạp nội dung cho "${cd}"...`);
                  if (editorRef.current) {
                    editorRef.current.innerHTML = '';
                  }
                }
              }}
              subject={subject}
              onChangeSubject={setSubject}
              grade={grade}
              onChangeGrade={setGrade}
            />
          </div>
        ) : (
          /* NẾU CHUYÊN ĐỀ KHÁC RỖNG: Thu gọn Tài liệu & NỘI DUNG BÀI DẠY, Hiện cửa sổ Word toàn màn hình */
          <div className="space-y-4 animate-fade-in">
            {/* Thanh Phân cấp Thu Gọn Dành trọn vẹn màn hình cho Word */}
            <div className="bg-white p-3.5 rounded-2xl border border-indigo-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 flex-1 min-w-[280px] flex-wrap">
                <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 shrink-0">
                  <FolderLock className="w-4 h-4" />
                </span>

                {/* Bỏ chữ 'Chuyên đề' ở đầu dòng, đưa luôn dropdown Tiến trình lên thay thế */}
                <div className="flex items-center gap-1 shrink-0">
                  <select
                    value={tienTrinh}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTienTrinh(val);
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
                <div className="text-xs truncate flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">{subject} ({grade}) ➔</span>
                  <span className="font-extrabold text-indigo-950 bg-indigo-50/90 px-3 py-1 rounded-lg border border-indigo-200 text-xs shadow-2xs shrink-0 max-w-xs truncate" title={chuyenDe}>
                    {chuyenDe}
                  </span>
                </div>

                {/* DÒNG CHỮ 'ĐANG ĐỒNG BỘ' MÀU ĐỎ KHI CHỌN CHUYÊN ĐỀ */}
                {isLoadingFromDrive && (
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-50 border border-red-300 text-red-600 font-black text-xs shadow-2xs animate-pulse shrink-0">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
                    </span>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-red-600 shrink-0" />
                    <span>Đang đồng bộ</span>
                  </div>
                )}

                {/* Dropdown chọn tên bài luyện tập / đề KTDG tương ứng với tiến trình */}
                {tienTrinh === 'Kiến thức' ? (() => {
                  const list = customKienThucList.length > 0 ? customKienThucList : ['Lý thuyết trọng tâm'];
                  const curVal = selectedKienThucName && list.includes(selectedKienThucName) ? selectedKienThucName : list[0];
                  return (
                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                      <span className="text-[11px] font-bold text-slate-500">Bài:</span>
                      <select
                        value={curVal}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSelectedKienThucName(val);
                          setNotification({
                            text: `Đã chọn: ${val} (Lưu thành KienThuc_${val.toLowerCase().replace(/[^a-zA-Z0-9_-]+/g, '_')}.html)`,
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
                    </div>
                  );
                })() : tienTrinh === 'Luyện tập' ? (() => {
                  const list = customLuyenTapList;
                  const curVal = selectedExerciseName && list.includes(selectedExerciseName) ? selectedExerciseName : (list[0] || '');
                  return (
                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                      <span className="text-[11px] font-bold text-slate-500">Bài:</span>
                      <select
                        value={curVal}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (!val) return;
                          setSelectedExerciseName(val);
                          setNotification({
                            text: `Đã chọn: ${val} (Lưu thành luyentap_${val.toLowerCase().replace(/[^a-zA-Z0-9_-]+/g, '_')}.json)`,
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
                    </div>
                  );
                })() : tienTrinh === 'KTDG' ? (() => {
                  const list = customKtdgList;
                  const curVal = selectedExerciseName && list.includes(selectedExerciseName) ? selectedExerciseName : (list[0] || '');
                  return (
                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                      <span className="text-[11px] font-bold text-slate-500">Đề:</span>
                      <select
                        value={curVal}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (!val) return;
                          setSelectedExerciseName(val);
                          setNotification({
                            text: `Đã chọn bài KTDG: ${val} (Lưu thành KTDG_${val.toLowerCase().replace(/[^a-zA-Z0-9_-]+/g, '_')}.json)`,
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
                    </div>
                  );
                })() : tienTrinh === 'Cải thiện' ? (
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 shrink-0 shadow-2xs">
                    <span>🚀 Hồ sơ cải thiện học sinh (CaiThien.json)</span>
                  </div>
                ) : null}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={isLoadingFromDrive}
                  onClick={() => handleLoadFromDrive(true)}
                  className="px-2.5 py-1.5 rounded-xl border border-indigo-200 bg-white hover:bg-indigo-50 text-indigo-700 text-xs font-semibold cursor-pointer flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  title="Tải lại nội dung mới nhất của chuyên đề từ Google Drive"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingFromDrive ? 'animate-spin text-indigo-600' : ''}`} />
                  <span className="hidden sm:inline">Tải lại Drive</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsHierarchyExpanded(!isHierarchyExpanded)}
                  className="px-3 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 text-indigo-800 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                  title="Mở rộng / Thu gọn chi tiết Cây phân cấp bài dạy"
                >
                  {isHierarchyExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                  <span>{isHierarchyExpanded ? 'Đóng lại' : 'Đổi chuyên đề'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setChuyenDe('')}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-semibold cursor-pointer"
                  title="Xóa chuyên đề để quay về mở rộng khung tài liệu"
                >
                  ✕ Hủy chọn
                </button>
              </div>
            </div>

            {/* Chi tiết Phân cấp mở rộng khi nhấn nút */}
            {isHierarchyExpanded && (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 shadow-sm animate-scale-up">
                <HierarchySelector
                  title={title}
                  onChangeTitle={setTitle}
                  chuong={chuong}
                  onChangeChuong={setChuong}
                  bai={bai}
                  onChangeBai={setBai}
                  vanDe={vanDe}
                  onChangeVanDe={setVanDe}
                  chuyenDe={chuyenDe}
                  onChangeChuyenDe={(cd) => {
                    setChuyenDe(cd);
                    if (cd && cd.trim()) {
                      setIsLoadingFromDrive(true);
                      setDriveLoadStatus(`Đang kết nối Google Drive và nạp nội dung cho "${cd}"...`);
                      if (editorRef.current) {
                        editorRef.current.innerHTML = '';
                      }
                    }
                  }}
                  subject={subject}
                  onChangeSubject={setSubject}
                  grade={grade}
                  onChangeGrade={setGrade}
                />
              </div>
            )}

            {/* Cửa sổ Soạn thảo Word chiếm toàn bộ giao diện */}
            <div className="space-y-5">
              {/* Interactive Word Toolbar */}
              <div className={`bg-slate-100/95 backdrop-blur-xs p-2.5 rounded-t-2xl border border-slate-300 border-b-0 flex flex-wrap items-center gap-1.5 shadow-sm sticky top-0 z-30 transition-opacity ${isLoadingFromDrive ? 'opacity-60 pointer-events-none' : ''}`}>
                {/* Undo / Redo */}
                <button onClick={() => execCommand('undo')} className="p-1.5 rounded hover:bg-slate-200 text-slate-700 transition-colors" title="Hoàn tác (Undo - Ctrl+Z)">
                  <Undo className="w-4 h-4" />
                </button>
                <button onClick={() => execCommand('redo')} className="p-1.5 rounded hover:bg-slate-200 text-slate-700 transition-colors" title="Làm lại (Redo - Ctrl+Y)">
                  <Redo className="w-4 h-4" />
                </button>

                <div className="h-5 w-[1px] bg-slate-300 mx-0.5"></div>

                {/* Cỡ chữ (Mặc định 14px - điều khiển trực tiếp) */}
                <select
                  value={fontSize}
                  onChange={(e) => handleFontSizeChange(e.target.value)}
                  className="text-[11px] font-bold bg-white border border-slate-300 rounded px-1.5 py-0.5 text-slate-800 shadow-2xs cursor-pointer focus:ring-1 focus:ring-indigo-500"
                  title="Chọn cỡ chữ (Mặc định 14px)"
                >
                  <option value="12px">12px</option>
                  <option value="14px">14px (Mặc định)</option>
                  <option value="16px">16px</option>
                  <option value="18px">18px</option>
                  <option value="20px">20px</option>
                  <option value="22px">22px</option>
                  <option value="24px">24px</option>
                  <option value="28px">28px</option>
                </select>

                {/* 1. Đậm, Nghiêng, Gạch chân (kích hoạt biểu tượng chữ B, I, U tương ứng khi bật) */}
                <button
                  type="button"
                  onClick={() => {
                    execCommand('bold');
                    setIsBold((prev) => !prev);
                  }}
                  className={`p-1.5 rounded transition-all ${
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
                  className={`p-1.5 rounded transition-all ${
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
                  className={`p-1.5 rounded transition-all ${
                    isUnderline
                      ? 'bg-indigo-600 text-white shadow-xs font-bold ring-2 ring-indigo-300'
                      : 'hover:bg-slate-200 text-slate-700 bg-transparent'
                  }`}
                  title="Gạch Chân (Ctrl+U)"
                >
                  <Underline className="w-4 h-4" />
                </button>

                {/* Chọn màu chữ chuẩn mực Microsoft Word */}
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
                    setOpenStyleMenu(false);
                  }}
                  onClose={() => setOpenTextColorMenu(false)}
                />

                {/* Chọn màu nền chữ / Highlight chuẩn mực Microsoft Word */}
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
                    setOpenStyleMenu(false);
                  }}
                  onClose={() => setOpenHighlightColorMenu(false)}
                />
                
                <div className="h-5 w-[1px] bg-slate-300 mx-0.5"></div>

                {/* 3. MENU CANH LỀ (XỔ XUỐNG): Chọn canh lề tương ứng trong nút canh lề */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setOpenAlignMenu(!openAlignMenu);
                      setOpenTextColorMenu(false);
                      setOpenHighlightColorMenu(false);
                      setOpenStyleMenu(false);
                    }}
                    className={`px-2 py-1 rounded text-xs font-bold flex items-center gap-1 border transition-colors cursor-pointer ${
                      openAlignMenu ? 'bg-indigo-100 text-indigo-800 border-indigo-300' : 'bg-white hover:bg-slate-200 text-slate-700 border-slate-200'
                    }`}
                    title="Canh lề văn bản (Căn trái, Căn giữa, Căn phải, Căn đều)"
                  >
                    {currentAlignment === 'left' && <AlignLeft className="w-3.5 h-3.5 text-indigo-600" />}
                    {currentAlignment === 'center' && <AlignCenter className="w-3.5 h-3.5 text-indigo-600" />}
                    {currentAlignment === 'right' && <AlignRight className="w-3.5 h-3.5 text-indigo-600" />}
                    {currentAlignment === 'justify' && <AlignJustify className="w-3.5 h-3.5 text-indigo-600" />}
                    <span className="hidden sm:inline font-semibold">
                      {currentAlignment === 'left' && 'Căn trái'}
                      {currentAlignment === 'center' && 'Căn giữa'}
                      {currentAlignment === 'right' && 'Căn phải'}
                      {currentAlignment === 'justify' && 'Căn đều'}
                    </span>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </button>

                  {openAlignMenu && (
                    <div className="absolute z-50 left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl w-36 py-1 divide-y divide-slate-100 animate-fade-in">
                      <button
                        type="button"
                        onClick={() => handleAlign('left')}
                        className={`w-full px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-indigo-50 text-slate-700 text-left font-semibold ${
                          currentAlignment === 'left' ? 'bg-indigo-50 text-indigo-700 font-bold' : ''
                        }`}
                      >
                        <AlignLeft className="w-3.5 h-3.5" />
                        <span>Canh trái</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAlign('center')}
                        className={`w-full px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-indigo-50 text-slate-700 text-left font-semibold ${
                          currentAlignment === 'center' ? 'bg-indigo-50 text-indigo-700 font-bold' : ''
                        }`}
                      >
                        <AlignCenter className="w-3.5 h-3.5" />
                        <span>Canh giữa</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAlign('right')}
                        className={`w-full px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-indigo-50 text-slate-700 text-left font-semibold ${
                          currentAlignment === 'right' ? 'bg-indigo-50 text-indigo-700 font-bold' : ''
                        }`}
                      >
                        <AlignRight className="w-3.5 h-3.5" />
                        <span>Canh phải</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAlign('justify')}
                        className={`w-full px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-indigo-50 text-slate-700 text-left font-semibold ${
                          currentAlignment === 'justify' ? 'bg-indigo-50 text-indigo-700 font-bold' : ''
                        }`}
                      >
                        <AlignJustify className="w-3.5 h-3.5" />
                        <span>Canh đều 2 bên</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="h-5 w-[1px] bg-slate-300 mx-0.5"></div>

                <button onClick={() => execCommand('insertUnorderedList')} className="p-1.5 rounded hover:bg-slate-200 text-slate-700 transition-colors" title="Danh sách không thứ tự">
                  <List className="w-4 h-4" />
                </button>
                <button onClick={() => execCommand('insertOrderedList')} className="p-1.5 rounded hover:bg-slate-200 text-slate-700 transition-colors" title="Danh sách thứ tự">
                  <ListOrdered className="w-4 h-4" />
                </button>

                {/* STYLE & SOẠN BÀI HỢP NHẤT: Bố trí khoa học, các style chuẩn mực không giải thích dài dòng */}
                <WordStyleMenu
                  selectedStyle={selectedStyle}
                  onSelectStyle={handleSelectStyle}
                  isOpen={openStyleMenu}
                  onToggle={() => {
                    setOpenStyleMenu(!openStyleMenu);
                    setOpenAlignMenu(false);
                    setOpenTextColorMenu(false);
                    setOpenHighlightColorMenu(false);
                  }}
                  onClose={() => setOpenStyleMenu(false)}
                  canAuthor={isTeacherOrHigher}
                  tienTrinh={tienTrinh}
                  insertPositionMode={insertPositionMode}
                  onSetInsertPositionMode={setInsertPositionMode}
                  onInsertLessonTemplate={handleInsertLessonTemplate}
                />

                <div className="h-5 w-[1px] bg-slate-300 mx-0.5"></div>

                {/* Module Con Độc Lập: MENU CHÈN (Chèn bảng, Chèn hình ảnh, Chèn File, Chèn Thư mục E-Learning) */}
                <MenuChen
                  editorRef={editorRef}
                  saveCurrentSelection={saveCurrentSelection}
                  insertHtmlToEditor={insertHtmlToEditor}
                  chuyenDe={chuyenDe}
                  setNotification={(n) => {
                    if (n) setNotification({ text: n.text, type: n.type });
                    else setNotification(null);
                  }}
                />

                {/* Module Con Độc Lập: MENU HÀM SỐ (Chèn công thức, Chèn đồ thị TikZ, Chèn bảng biến thiên) */}
                <MenuHamSo
                  editorRef={editorRef}
                  saveCurrentSelection={saveCurrentSelection}
                  insertHtmlToEditor={insertHtmlToEditor}
                  currentRole={currentRole}
                  userFontSize={fontSize}
                  setNotification={(n) => {
                    if (n) setNotification({ text: n.text, type: n.type });
                    else setNotification(null);
                  }}
                />



                {/* NÚT LƯU DRIVE CÓ SẴN (ĐÓNG GÓI HOÀN CHỈNH BỞI MODULE CON DONGBODRIVE) */}
                {isBackgroundSyncing && !isTeacherOrHigher && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 border border-red-200 text-red-600 text-xs font-bold animate-pulse ml-auto mr-2" title="Học sinh đang xem bài giảng ngay từ cache, hệ thống đang tự động đồng bộ bản mới nhất từ Google Drive ở nền">
                    <RefreshCw className="w-3 h-3 animate-spin text-red-600" />
                    <span>Đang đồng bộ</span>
                  </div>
                )}
                <DongBoDriveButton
                  isSaving={isSaving}
                  syncStatus={syncStatus}
                  lastSavedTime={lastSavedTime}
                  onClick={() => handleSaveDocument(false)}
                  className={!isBackgroundSyncing ? "ml-auto" : ""}
                />
              </div>

              {/* Simulated A4 Editable Canvas - 1 trang trắng sẵn sàng để soạn thảo trực tiếp */}
              <div
                onDoubleClick={handleDoubleClickToInsertRow}
                className="bg-slate-50 p-6 border border-slate-300 border-t-0 rounded-b-2xl shadow-inner min-h-[550px] cursor-text relative"
                title="Kích đôi chuột vào vị trí bên dưới hoặc ngoài khối để chèn thêm 1 hàng mới toanh"
              >
                {/* Lớp khóa và hiển thị trạng thái khi đang nạp tự động từ Google Drive hoặc xác thực lại nền đối với Giáo viên */}
                {(isLoadingFromDrive || (isTeacherOrHigher && isReauthenticating)) && (
                  <div className="absolute inset-0 z-30 bg-white/95 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center select-none rounded-b-2xl animate-fade-in pointer-events-auto">
                    <div className="p-4 bg-red-50 text-red-600 rounded-2xl mb-3 shadow-xs border border-red-200">
                      <Loader2 className="w-10 h-10 animate-spin text-red-600" />
                    </div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
                      </span>
                      <h4 className="text-base font-black text-red-600 uppercase tracking-wider">
                        Đang đồng bộ
                      </h4>
                    </div>
                    <p className="text-xs text-red-500 mt-1 max-w-md font-semibold">
                      {isReauthenticating
                        ? 'Đang tự động xác thực lại tài khoản Google trong nền... Với tài khoản Giáo viên, cửa sổ Word đang khóa để đảm bảo bạn luôn cập nhật bản mới nhất trước khi soạn bài, cập nhật, chỉnh sửa.'
                        : (driveLoadStatus || 'Đang kết nối thư mục chuyên đề trên Google Drive và nạp nội dung tệp vào cửa sổ soạn thảo...')}
                    </p>
                    <div className="mt-3.5 flex items-center gap-2 text-xs font-bold text-red-700 bg-red-50/90 px-4 py-1.5 rounded-full border border-red-200 shadow-2xs">
                      <Cloud className="w-4 h-4 text-red-600" />
                      <span>{chuyenDe} ➔ {tienTrinh} ({selectedKienThucName || customKienThucList[0] || 'Tài liệu'})</span>
                    </div>
                  </div>
                )}

                <div style={{ display: (isLoadingFromDrive || (isTeacherOrHigher && isReauthenticating)) ? 'none' : 'block' }}>
                  <div
                    ref={editorRef}
                    contentEditable={!(isLoadingFromDrive || isReauthenticating) && isTeacherOrHigher}
                    suppressContentEditableWarning
                    onInput={(e) => {
                      markDirty();
                      if (editorRef.current) {
                        autoRenderLatexInDom(editorRef.current);
                      }
                    }}
                    onKeyUp={(e) => {
                      updateToolbarFormattingStates();
                      if (e.key === '$' || e.key === ' ' || e.key === 'Enter') {
                        if (editorRef.current) {
                          autoRenderLatexInDom(editorRef.current);
                        }
                      }
                    }}
                    onMouseUp={updateToolbarFormattingStates}
                    onPaste={(e) => {
                      setTimeout(() => {
                        if (editorRef.current) {
                          autoRenderLatexInDom(editorRef.current);
                          markDirty();
                        }
                        updateToolbarFormattingStates();
                      }, 50);
                    }}
                    onDoubleClick={handleDoubleClickToInsertRow}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.shiftKey) {
                        e.preventDefault();
                        handleBreakoutOfBlock();
                      }
                    }}
                    className="bg-white p-10 rounded-xl shadow-md border border-slate-200 min-h-[480px] focus:outline-none focus:ring-1 focus:ring-indigo-500 overflow-y-auto prose max-w-none text-slate-800 word-editor-canvas"
                    style={{ fontSize: fontSize, lineHeight: '1.6' }}
                  />
                  <style>{`
                    .word-editor-canvas h1 { font-size: 22px; font-weight: 700; margin-top: 14px; margin-bottom: 6px; line-height: 1.3; color: #0f172a; }
                    .word-editor-canvas h2 { font-size: 20px; font-weight: 700; margin-top: 12px; margin-bottom: 5px; line-height: 1.35; color: #1e293b; }
                    .word-editor-canvas h3 { font-size: 18px; font-weight: 700; margin-top: 10px; margin-bottom: 4px; line-height: 1.4; color: #334155; }
                    .word-editor-canvas h4 { font-size: 16px; font-weight: 700; margin-top: 8px; margin-bottom: 4px; line-height: 1.4; color: #475569; }
                    .word-editor-canvas p { font-size: 14px; margin-top: 4px; margin-bottom: 4px; line-height: 1.6; }
                  `}</style>
                </div>
              </div>

              {/* Publishing & Commercial Setup Panel */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <span className="text-[11px] font-black uppercase text-amber-800 tracking-wider flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-amber-600" /> Phát hành Lớp Học & Cấu hình Thương mại bằng Kim Cương
                </span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Select target classrooms to publish */}
                  <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-2">
                    <span className="text-[10px] font-bold text-slate-500 block">PHÁT HÀNH TỚI LỚP HỌC</span>
                    <p className="text-[11px] text-slate-400">Tài liệu soạn thảo xong sẽ đính kèm tự động vào không gian của học sinh thuộc các lớp được chọn.</p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {classes.map(c => {
                        const isSelected = selectedClasses.includes(c.id);
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => toggleClassSelection(c.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                              isSelected
                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                                : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-300'
                            }`}
                          >
                            {isSelected ? '✓ ' : '+ '} {c.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Monetization / Diamond Sales */}
                  <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-2">
                    <span className="text-[10px] font-bold text-slate-500 block">THƯƠNG MẠI HÓA (KIM CƯƠNG)</span>
                    <label className="flex items-center gap-2 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={isForSale}
                        onChange={(e) => setIsForSale(e.target.checked)}
                        className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-slate-800">Bán thu phí bằng Kim Cương</span>
                    </label>

                    {isForSale && (
                      <div className="flex items-center gap-2 pt-2 animate-fade-in">
                        <span className="text-xs font-bold text-amber-800">💎 Giá bán:</span>
                        <input
                          type="number"
                          value={priceDiamonds}
                          onChange={(e) => setPriceDiamonds(parseInt(e.target.value) || 0)}
                          className="w-20 px-2 py-1 border border-amber-300 rounded text-xs font-bold bg-white text-slate-800 focus:outline-amber-600"
                        />
                        <span className="text-[11px] text-slate-500">Kim Cương</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                  <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                    <Cloud className="w-4 h-4 text-indigo-500" />
                    <span>Dữ liệu đồng bộ vào Google Drive theo phân cấp chuẩn của giáo viên.</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => handleSaveDocument(false)}
                      className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50 ${
                        syncStatus === 'saved' || (lastSavedTime && syncStatus === 'idle')
                          ? 'bg-emerald-600 hover:bg-emerald-700'
                          : 'bg-indigo-600 hover:bg-indigo-700'
                      }`}
                    >
                      <Save className="w-4 h-4" />
                      <span>
                        {isSaving
                          ? 'Đang lưu...'
                          : syncStatus === 'saved' || (lastSavedTime && syncStatus === 'idle')
                          ? `Đã lưu Drive (${lastSavedTime || 'vừa xong'})`
                          : 'Lưu tài liệu & Đồng bộ Drive'}
                      </span>
                    </button>

                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => handleSaveDocument(true)}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                      <span>Lưu & Bắt đầu dạy học</span>
                    </button>
                  </div>
                </div>
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
    </div>
  );
};
