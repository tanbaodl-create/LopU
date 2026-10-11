import React, { useState, useEffect, useRef } from 'react';
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
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { TeacherDocument, ClassItem, UserRole } from '../../../services/storageTypes';
import { getClasses, getTeacherDocuments } from '../../ConnectData/ConnectFirestore';
import { HierarchySelector } from '../TaiLieuCaNhan/HierarchySelector';
import { MenuHamSo } from './MenuHamSo';
import { MenuChen } from './MenuChen';
import { DongBoDriveButton, useDongBoDrive } from './DongBoDrive';
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
    return ['Bài luyện tập 1', 'Bài luyện tập 2', 'Bài luyện tập nâng cao'];
  });
  const [customKtdgList, setCustomKtdgList] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('lopu_custom_ktdg_list');
      if (saved) return JSON.parse(saved);
    } catch {}
    return ['Đề kiểm tra 15 phút', 'Đề kiểm tra 1 tiết', 'Đề đánh giá năng lực'];
  });

  // Modal sửa tên / xóa bài cho Kiến thức, Luyện tập, KTĐG
  const [itemActionModal, setItemActionModal] = useState<{
    type: 'rename' | 'delete';
    category: 'kienThuc' | 'luyenTap' | 'ktdg';
    item: string;
    newName: string;
  } | null>(null);

  const handleConfirmItemAction = () => {
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
        const finalUpdated = updated.length > 0 ? updated : ['Bài luyện tập 1'];
        setCustomLuyenTapList(finalUpdated);
        localStorage.setItem('lopu_custom_luyentap_list', JSON.stringify(finalUpdated));
        setSelectedExerciseName(finalUpdated[0]);
        setNotification({ text: `Đã xóa bài luyện tập "${item}" thành công!`, type: 'info' });
      } else if (category === 'ktdg') {
        const updated = customKtdgList.filter(x => x !== item);
        const finalUpdated = updated.length > 0 ? updated : ['Đề kiểm tra 15 phút'];
        setCustomKtdgList(finalUpdated);
        localStorage.setItem('lopu_custom_ktdg_list', JSON.stringify(finalUpdated));
        setSelectedExerciseName(finalUpdated[0]);
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
      const fileSlug = cleanName.toLowerCase().replace(/[^a-zA-Z0-9_-]+/g, '_');
      setNotification({
        text: `Đã ${item ? 'đổi tên thành' : 'thêm bài kiến thức'} "${cleanName}" (Tệp Drive: KienThuc_${fileSlug}.html)`,
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
      const fileSlug = cleanName.toLowerCase().replace(/[^a-zA-Z0-9_-]+/g, '_');
      setNotification({
        text: `Đã ${item ? 'đổi tên thành' : 'thêm bài luyện tập'} "${cleanName}" (Tệp Drive: luyentap_${fileSlug}.json)`,
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
      const fileSlug = cleanName.toLowerCase().replace(/[^a-zA-Z0-9_-]+/g, '_');
      setNotification({
        text: `Đã ${item ? 'đổi tên thành' : 'thêm đề KTĐG'} "${cleanName}" (Tệp Drive: KTDG_${fileSlug}.json)`,
        type: 'success',
      });
    }

    setItemActionModal(null);
    setTimeout(() => setNotification(null), 3000);
  };
  const [insertPositionMode, setInsertPositionMode] = useState<'cursor' | 'bottom'>('bottom');
  const [isHierarchyExpanded, setIsHierarchyExpanded] = useState<boolean>(false);
  const [openSoanBaiMenu, setOpenSoanBaiMenu] = useState<boolean>(false);
  
  const [isForSale, setIsForSale] = useState<boolean>(false);
  const [priceDiamonds, setPriceDiamonds] = useState<number>(50);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Editor styling states: bổ sung thêm cỡ chữ 12px và 22px (mặc định 22px)
  const editorRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState<string>('22px');
  const [textColor, setTextColor] = useState<string>('#0f172a');
  const [highlightColor, setHighlightColor] = useState<string>('transparent');

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

  // Khi mở cửa sổ soạn thảo Word: nạp dữ liệu nếu có, nếu chưa có thì là 1 trang trắng sẵn sàng để soạn thảo trực tiếp
  useEffect(() => {
    if (!editorRef.current) return;
    const matchedDoc = documents.find(d => 
      d.title === title && 
      (!chuyenDe || d.chuyenDe === chuyenDe) &&
      (!bai || d.bai === bai)
    );
    if (matchedDoc) {
      const htmlContent = (matchedDoc as any).contentHtml || (matchedDoc as any).content;
      if (htmlContent) {
        editorRef.current.innerHTML = renderLatexInHtml(htmlContent);
      } else if (matchedDoc.contentSnippet) {
        editorRef.current.innerHTML = renderLatexInHtml(`<p>${matchedDoc.contentSnippet}</p>`);
      } else {
        editorRef.current.innerHTML = '';
      }
    } else {
      editorRef.current.innerHTML = '';
    }
  }, [title, chuyenDe, documents]);

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

  const execCommand = (command: string, value: string = '') => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      editorRef.current.focus();
    }
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
              onChangeChuyenDe={setChuyenDe}
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
                  const list = customLuyenTapList.length > 0 ? customLuyenTapList : ['Bài luyện tập 1'];
                  const curVal = selectedExerciseName && list.includes(selectedExerciseName) ? selectedExerciseName : list[0];
                  return (
                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                      <span className="text-[11px] font-bold text-slate-500">Bài:</span>
                      <select
                        value={curVal}
                        onChange={(e) => {
                          const val = e.target.value;
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
                        {list.map((ex, idx) => (
                          <option key={`${ex}-${idx}`} value={ex}>
                            ✍️ {ex}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => {
                          const newName = `Luyện tập ${list.length + 1}`;
                          setItemActionModal({
                            type: 'rename',
                            category: 'luyenTap',
                            item: '',
                            newName,
                          });
                        }}
                        className="px-2 py-1 rounded-lg text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 cursor-pointer shadow-2xs"
                        title="Thêm bài luyện tập mới"
                      >
                        + Thêm bài
                      </button>

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

                      {list.length > 1 && (
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
                  const list = customKtdgList.length > 0 ? customKtdgList : ['Đề kiểm tra 15 phút'];
                  const curVal = selectedExerciseName && list.includes(selectedExerciseName) ? selectedExerciseName : list[0];
                  return (
                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                      <span className="text-[11px] font-bold text-slate-500">Đề:</span>
                      <select
                        value={curVal}
                        onChange={(e) => {
                          const val = e.target.value;
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
                        {list.map((ex, idx) => (
                          <option key={`${ex}-${idx}`} value={ex}>
                            🎯 {ex}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => {
                          const newName = `KTDG ${list.length + 1}`;
                          setItemActionModal({
                            type: 'rename',
                            category: 'ktdg',
                            item: '',
                            newName,
                          });
                        }}
                        className="px-2 py-1 rounded-lg text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 cursor-pointer shadow-2xs"
                        title="Thêm bài kiểm tra đánh giá mới"
                      >
                        + Thêm đề
                      </button>

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

                      {list.length > 1 && (
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
                  onChangeChuyenDe={setChuyenDe}
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
              <div className="bg-slate-100/95 backdrop-blur-xs p-2.5 rounded-t-2xl border border-slate-300 border-b-0 flex flex-wrap items-center gap-1.5 shadow-sm sticky top-0 z-30">
                {/* NÚT SOẠN BÀI ▾ (Chỉ dành cho tài khoản Giáo viên trở lên - Giải pháp 1: Tự động đóng khung khi bôi đen hoặc chèn mới) */}
                {isTeacherOrHigher && (
                  <div className="relative">
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => setOpenSoanBaiMenu(!openSoanBaiMenu)}
                      className={`px-3 py-1 rounded-lg text-xs font-black flex items-center gap-1.5 border transition-colors cursor-pointer shadow-2xs ${
                        openSoanBaiMenu
                          ? 'bg-indigo-700 text-white border-indigo-800'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600'
                      }`}
                      title="Giải pháp 1: Định dạng vùng bôi đen thành Khái niệm/Định lý/Trắc nghiệm hoặc chèn mới mẫu cấu trúc"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Soạn bài</span>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>

                    {openSoanBaiMenu && (
                      <div className="absolute z-50 left-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-2xl w-68 py-2 text-xs divide-y divide-slate-100 animate-scale-up">
                        {/* Gợi ý Giải pháp 1 thông minh */}
                        <div className="px-3.5 py-1.5 bg-indigo-50/80 text-[10px] text-indigo-800 font-semibold flex items-center gap-1">
                          <span>✨</span>
                          <span>Bôi đen chữ để đóng khung hoặc chèn mẫu mới</span>
                        </div>

                        {/* Giải pháp 3: Tùy chọn vị trí chèn (Tại con trỏ / Xuống cuối bài) */}
                        <div className="px-3 py-1.5 bg-slate-50 flex items-center justify-between text-[11px] gap-2">
                          <span className="text-slate-600 font-bold shrink-0">Vị trí chèn:</span>
                          <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200 shadow-2xs">
                            <button
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => setInsertPositionMode('cursor')}
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                                insertPositionMode === 'cursor'
                                  ? 'bg-indigo-600 text-white shadow-xs'
                                  : 'text-slate-600 hover:bg-slate-100'
                              }`}
                              title="Chèn tại vị trí con trỏ (tự động thoát ra nếu đang trong khối)"
                            >
                              📍 Con trỏ
                            </button>
                            <button
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => setInsertPositionMode('bottom')}
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                                insertPositionMode === 'bottom'
                                  ? 'bg-indigo-600 text-white shadow-xs'
                                  : 'text-slate-600 hover:bg-slate-100'
                              }`}
                              title="Giải pháp 3: Luôn chèn khối mới xuống cuối văn bản độc lập"
                            >
                              ⬇️ Cuối bài
                            </button>
                          </div>
                        </div>

                        {/* 1. NHÓM LÝ THUYẾT (Chỉ có khi tiến trình là Kiến thức) */}
                        {tienTrinh === 'Kiến thức' && (
                          <div className="py-1">
                            <div className="px-3.5 py-1 text-[10px] font-black uppercase text-indigo-800 tracking-wider bg-indigo-50/60 select-none">
                              ── LÝ THUYẾT ──
                            </div>
                            <button
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => handleInsertLessonTemplate('khaiNiem')}
                              className="w-full px-3.5 py-1.5 text-left text-slate-700 hover:bg-indigo-50 hover:text-indigo-900 font-semibold flex items-center gap-1.5 cursor-pointer"
                            >
                              <span>+</span> <span>Khái niệm / Định nghĩa</span>
                            </button>
                            <button
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => handleInsertLessonTemplate('dinhLy')}
                              className="w-full px-3.5 py-1.5 text-left text-slate-700 hover:bg-indigo-50 hover:text-indigo-900 font-semibold flex items-center gap-1.5 cursor-pointer"
                            >
                              <span>+</span> <span>Định lý / Tính chất</span>
                            </button>
                            <button
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => handleInsertLessonTemplate('heQua')}
                              className="w-full px-3.5 py-1.5 text-left text-slate-700 hover:bg-indigo-50 hover:text-indigo-900 font-semibold flex items-center gap-1.5 cursor-pointer"
                            >
                              <span>+</span> <span>Hệ quả / Chú ý</span>
                            </button>
                            <button
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => handleInsertLessonTemplate('phuongPhap')}
                              className="w-full px-3.5 py-1.5 text-left text-slate-700 hover:bg-indigo-50 hover:text-indigo-900 font-semibold flex items-center gap-1.5 cursor-pointer"
                            >
                              <span>+</span> <span>Phương pháp giải (Dạng toán)</span>
                            </button>
                          </div>
                        )}

                        {/* 2. NHÓM VÍ DỤ & BÀI TẬP (Có trong tất cả tiến trình: Kiến thức, Luyện tập, Kiểm tra) */}
                        <div className="py-1">
                          <div className="px-3.5 py-1 text-[10px] font-black uppercase text-amber-800 tracking-wider bg-amber-50/60 select-none">
                            ── VÍ DỤ & BÀI TẬP ──
                          </div>
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleInsertLessonTemplate('viDu')}
                            className="w-full px-3.5 py-1.5 text-left text-slate-700 hover:bg-amber-50 hover:text-amber-900 font-semibold flex items-center gap-1.5 cursor-pointer"
                          >
                            <span>+</span> <span>Ví dụ minh họa</span>
                          </button>
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleInsertLessonTemplate('tuLuan')}
                            className="w-full px-3.5 py-1.5 text-left text-slate-700 hover:bg-amber-50 hover:text-amber-900 font-semibold flex items-center gap-1.5 cursor-pointer"
                          >
                            <span>+</span> <span>Bài tập Tự luận</span>
                          </button>
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleInsertLessonTemplate('tracNghiem4')}
                            className="w-full px-3.5 py-1.5 text-left text-slate-700 hover:bg-amber-50 hover:text-amber-900 font-semibold flex items-center gap-1.5 cursor-pointer"
                          >
                            <span>+</span> <span>Trắc nghiệm 4 lựa chọn (A, B, C, D)</span>
                          </button>
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleInsertLessonTemplate('dungSai')}
                            className="w-full px-3.5 py-1.5 text-left text-slate-700 hover:bg-amber-50 hover:text-amber-900 font-semibold flex items-center gap-1.5 cursor-pointer"
                          >
                            <span>+</span> <span>Trắc nghiệm Đúng / Sai</span>
                          </button>
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleInsertLessonTemplate('traLoiNgan')}
                            className="w-full px-3.5 py-1.5 text-left text-slate-700 hover:bg-amber-50 hover:text-amber-900 font-semibold flex items-center gap-1.5 cursor-pointer"
                          >
                            <span>+</span> <span>Trắc nghiệm Trả lời ngắn</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="h-5 w-[1px] bg-slate-300 mx-0.5"></div>

                <button onClick={() => execCommand('bold')} className="p-1.5 rounded hover:bg-slate-200 text-slate-700 transition-colors" title="Chữ Đậm">
                  <Bold className="w-4 h-4" />
                </button>
                <button onClick={() => execCommand('italic')} className="p-1.5 rounded hover:bg-slate-200 text-slate-700 transition-colors" title="Chữ Nghiêng">
                  <Italic className="w-4 h-4" />
                </button>
                <button onClick={() => execCommand('underline')} className="p-1.5 rounded hover:bg-slate-200 text-slate-700 transition-colors" title="Gạch Chân">
                  <Underline className="w-4 h-4" />
                </button>
                
                <div className="h-5 w-[1px] bg-slate-300 mx-0.5"></div>

                <button onClick={() => execCommand('justifyLeft')} className="p-1.5 rounded hover:bg-slate-200 text-slate-700 transition-colors" title="Căn Trái">
                  <AlignLeft className="w-4 h-4" />
                </button>
                <button onClick={() => execCommand('justifyCenter')} className="p-1.5 rounded hover:bg-slate-200 text-slate-700 transition-colors" title="Căn Giữa">
                  <AlignCenter className="w-4 h-4" />
                </button>
                <button onClick={() => execCommand('justifyRight')} className="p-1.5 rounded hover:bg-slate-200 text-slate-700 transition-colors" title="Căn Phải">
                  <AlignRight className="w-4 h-4" />
                </button>
                <button onClick={() => execCommand('justifyFull')} className="p-1.5 rounded hover:bg-slate-200 text-slate-700 transition-colors" title="Căn Đều">
                  <AlignJustify className="w-4 h-4" />
                </button>

                <div className="h-5 w-[1px] bg-slate-300 mx-0.5"></div>

                <button onClick={() => execCommand('insertUnorderedList')} className="p-1.5 rounded hover:bg-slate-200 text-slate-700 transition-colors" title="Danh sách không thứ tự">
                  <List className="w-4 h-4" />
                </button>
                <button onClick={() => execCommand('insertOrderedList')} className="p-1.5 rounded hover:bg-slate-200 text-slate-700 transition-colors" title="Danh sách thứ tự">
                  <ListOrdered className="w-4 h-4" />
                </button>

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

                <div className="h-5 w-[1px] bg-slate-300 mx-0.5"></div>

                {/* Font settings: bổ sung thêm 12px và 22px (mặc định 22px) */}
                <select
                  value={fontSize}
                  onChange={(e) => {
                    setFontSize(e.target.value);
                    execCommand('fontSize', '4');
                  }}
                  className="text-[11px] font-bold bg-white border border-slate-200 rounded px-1.5 py-0.5 text-slate-700"
                >
                  <option value="12px">Cỡ chữ 12px</option>
                  <option value="14px">Cỡ chữ 14px</option>
                  <option value="16px">Cỡ chữ 16px</option>
                  <option value="18px">Cỡ chữ 18px</option>
                  <option value="20px">Cỡ chữ 20px</option>
                  <option value="22px">Cỡ chữ 22px (Mặc định)</option>
                </select>

                {/* NÚT LƯU DRIVE CÓ SẴN (ĐÓNG GÓI HOÀN CHỈNH BỞI MODULE CON DONGBODRIVE) */}
                <DongBoDriveButton
                  isSaving={isSaving}
                  syncStatus={syncStatus}
                  lastSavedTime={lastSavedTime}
                  onClick={() => handleSaveDocument(false)}
                  className="ml-auto"
                />
              </div>

              {/* Simulated A4 Editable Canvas - 1 trang trắng sẵn sàng để soạn thảo trực tiếp */}
              <div
                onDoubleClick={handleDoubleClickToInsertRow}
                className="bg-slate-50 p-6 border border-slate-300 border-t-0 rounded-b-2xl shadow-inner min-h-[550px] cursor-text"
                title="Kích đôi chuột vào vị trí bên dưới hoặc ngoài khối để chèn thêm 1 hàng mới toanh"
              >
                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={(e) => {
                    markDirty();
                    if (editorRef.current) {
                      autoRenderLatexInDom(editorRef.current);
                    }
                  }}
                  onKeyUp={(e) => {
                    if (e.key === '$' || e.key === ' ' || e.key === 'Enter') {
                      if (editorRef.current) {
                        autoRenderLatexInDom(editorRef.current);
                      }
                    }
                  }}
                  onPaste={(e) => {
                    setTimeout(() => {
                      if (editorRef.current) {
                        autoRenderLatexInDom(editorRef.current);
                        markDirty();
                      }
                    }, 50);
                  }}
                  onDoubleClick={handleDoubleClickToInsertRow}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.shiftKey) {
                      e.preventDefault();
                      handleBreakoutOfBlock();
                    }
                  }}
                  className="bg-white p-10 rounded-xl shadow-md border border-slate-200 min-h-[480px] focus:outline-none focus:ring-1 focus:ring-indigo-500 overflow-y-auto prose max-w-none text-slate-800"
                  style={{ fontSize: fontSize, lineHeight: '1.6' }}
                />
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
                      className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      <span>{isSaving ? 'Đang lưu...' : 'Lưu tài liệu & Đồng bộ Drive'}</span>
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
