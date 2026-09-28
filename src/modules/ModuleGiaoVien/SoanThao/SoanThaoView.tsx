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
} from 'lucide-react';
import { TeacherDocument, ClassItem, UserRole } from '../../../services/storageTypes';
import { getClasses, getTeacherDocuments, saveTeacherDocument } from '../../ConnectData/ConnectFirestore';
import { saveTeachingMaterialHierarchyToDrive, getDriveConnectionState } from '../../ConnectData/ConnectDrive/googleDriveService';
import { HierarchySelector } from '../TaiLieuCaNhan/HierarchySelector';

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
  const [insertPositionMode, setInsertPositionMode] = useState<'cursor' | 'bottom'>('bottom');
  const [isHierarchyExpanded, setIsHierarchyExpanded] = useState<boolean>(false);
  const [openSoanBaiMenu, setOpenSoanBaiMenu] = useState<boolean>(false);
  
  const [isForSale, setIsForSale] = useState<boolean>(false);
  const [priceDiamonds, setPriceDiamonds] = useState<number>(50);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Editor styling states: bổ sung thêm cỡ chữ 12px và 22px (mặc định 22px)
  const editorRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState<string>('22px');
  const [textColor, setTextColor] = useState<string>('#0f172a');
  const [highlightColor, setHighlightColor] = useState<string>('transparent');

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
        editorRef.current.innerHTML = htmlContent;
      } else if (matchedDoc.contentSnippet) {
        editorRef.current.innerHTML = `<p>${matchedDoc.contentSnippet}</p>`;
      } else {
        editorRef.current.innerHTML = '';
      }
    } else {
      editorRef.current.innerHTML = '';
    }
  }, [title, chuyenDe, documents]);

  // Các nút công cụ định dạng Word
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

  const handleInsertMath = () => {
    const formula = prompt('Nhập công thức Toán (dạng LaTeX):', '\\lambda = \\frac{v}{f}');
    if (!formula) return;
    const mathHtml = `<span style="color: #4f46e5; font-weight: bold; background-color: #f5f3ff; padding: 2px 6px; border-radius: 4px; font-family: monospace;">\\(${formula}\\)</span>&nbsp;`;
    execCommand('insertHTML', mathHtml);
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

  // Xử lý lưu tài liệu và chuyển sang Drive + Phát hành lớp học
  const handleSaveDocument = async (startLiveTeaching: boolean = false) => {
    if (!title.trim()) {
      setNotification({ text: 'Vui lòng nhập tiêu đề bài giảng!', type: 'error' });
      return;
    }

    setIsSaving(true);
    setNotification({ text: 'Đang xử lý biên dịch & đồng bộ tài liệu...', type: 'info' });

    const contentHtml = editorRef.current ? editorRef.current.innerHTML : '<p>Chưa có nội dung</p>';
    const textContent = editorRef.current ? editorRef.current.innerText : '';
    const plainSnippet = textContent.slice(0, 200).replace(/\n/g, ' ') + '...';

    const driveFolder = `myApp / LopU / TaiLieu / ${title.trim() || 'TaiLieu'} / ${chuong} / ${bai} / ${vanDe} / ${chuyenDe}`;

    const newDoc: TeacherDocument = {
      id: `doc_${Date.now()}`,
      title: title.trim(),
      subject,
      grade,
      category: 'lesson_plan',
      fileType: 'gdoc',
      chuong: chuong.trim(),
      bai: bai.trim(),
      vanDe: vanDe.trim(),
      chuyenDe: chuyenDe.trim(),
      driveFolderPath: driveFolder,
      createdAt: new Date().toLocaleString('vi-VN'),
      updatedAt: new Date().toLocaleString('vi-VN'),
      isPublished: selectedClasses.length > 0,
      publishedToClasses: selectedClasses,
      driveSynced: true,
      fileSize: `${Math.ceil(contentHtml.length / 1024)} KB`,
      authorId: 'u_gv01',
      contentSnippet: plainSnippet,
      isForSale,
      priceDiamonds: isForSale ? priceDiamonds : 0,
      purchasedUserIds: [],
    };

    try {
      // 1. Sao lưu lên Google Drive cá nhân theo cấu trúc thư mục 4 cấp độ
      await saveTeachingMaterialHierarchyToDrive(
        newDoc,
        chuong,
        bai,
        vanDe,
        chuyenDe
      );

      // 2. Lưu thông tin vào Firestore/Database
      await saveTeacherDocument(newDoc);
      
      const conn = getDriveConnectionState();
      const cleanFileName = `[${chuyenDe}]_${title.trim().replace(/[\s:/\\?*]+/g, '_')}`;
      
      let successMsg = '';
      if (conn.isConnected) {
        successMsg = `Đã đồng bộ Drive & Lưu hệ thống thành công: ${cleanFileName} tại thư mục ${driveFolder}`;
      } else {
        successMsg = `Đã lưu tài liệu vào hệ thống thành công: ${cleanFileName}`;
      }

      if (selectedClasses.length > 0) {
        successMsg += ` và đã phát hành tới ${selectedClasses.length} lớp học.`;
      }

      setNotification({ text: successMsg, type: 'success' });
      
      if (startLiveTeaching) {
        setTimeout(() => {
          setNotification({ text: '🚀 Đang chuẩn bị chuyển hướng bạn đến bảng dạy lớp chuyên đề...', type: 'success' });
          // Giả lập chuyển tab
          const btnMgmt = document.getElementById('menu-item-teaching-management');
          if (btnMgmt) {
            btnMgmt.click();
          }
        }, 2000);
      }

    } catch (err) {
      setNotification({ text: 'Có lỗi xảy ra trong quá trình đồng bộ Drive.', type: 'error' });
    } finally {
      setIsSaving(false);
      setTimeout(() => setNotification(null), 6000);
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
              <div className="flex items-center gap-2 flex-1 min-w-[280px]">
                <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                  <FolderLock className="w-4 h-4" />
                </span>
                <div className="text-xs truncate">
                  <span className="font-bold text-slate-500 uppercase text-[10px]">Đang soạn cho Chuyên đề: </span>
                  <span className="font-extrabold text-indigo-950">
                    {subject} ({grade}) ➔ {title || 'Tài liệu'} ➔ {chuong || 'Chương'} ➔ {bai || 'Bài'} ➔ {vanDe || 'Vấn đề'} ➔ <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-black">{chuyenDe}</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsHierarchyExpanded(!isHierarchyExpanded)}
                  className="px-3 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 text-indigo-800 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                  title="Mở rộng / Thu gọn chi tiết Cây phân cấp bài dạy"
                >
                  {isHierarchyExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                  <span>{isHierarchyExpanded ? 'Đóng phân cấp' : 'Đổi phân cấp / Chuyên đề'}</span>
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
                {/* Tiến trình chuyên đề */}
                <div className="flex items-center gap-1">
                  <select
                    value={tienTrinh}
                    onChange={(e) => setTienTrinh(e.target.value)}
                    className="text-xs font-black bg-white border border-indigo-300 rounded-lg px-2.5 py-1 text-indigo-900 shadow-2xs cursor-pointer focus:ring-2 focus:ring-indigo-500"
                    title="Tiến trình chuyên đề (Kiến thức có Lý thuyết & Bài tập; Luyện tập và Kiểm tra chỉ có Bài tập)"
                  >
                    <option value="Kiến thức">📚 1. Kiến thức</option>
                    <option value="Luyện tập">✍️ 2. Luyện tập</option>
                    <option value="Kiểm tra">📝 3. Kiểm tra</option>
                    <option value="Cải thiện">🚀 4. Cải thiện</option>
                  </select>
                </div>

                <div className="h-5 w-[1px] bg-slate-300 mx-0.5"></div>

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

                {/* Custom Interactive Elements */}
                <button onClick={handleInsertTable} className="p-1.5 rounded hover:bg-indigo-100 text-indigo-700 bg-indigo-50/50 transition-colors flex items-center gap-1 text-[11px] font-bold" title="Chèn Bảng">
                  <Table className="w-3.5 h-3.5" /> Chèn Bảng
                </button>
                <button onClick={handleInsertMath} className="p-1.5 rounded hover:bg-purple-100 text-purple-700 bg-purple-50/50 transition-colors flex items-center gap-1 text-[11px] font-bold" title="Chèn công thức toán LaTeX">
                  <span className="font-mono text-[10px] font-black">f(x)</span> Toán LaTeX
                </button>

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
      </div>
    </div>
  );
};
