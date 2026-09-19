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
  Send,
  Unlock,
  Layers,
  Tv,
  FileText,
  Eye,
} from 'lucide-react';
import { getClasses, getTeacherDocuments, saveTeacherDocument } from '../../ConnectData/ConnectFirestore';
import {
  saveTeachingMaterialHierarchyToDrive,
  getDriveConnectionState,
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
  const [fontSize, setFontSize] = useState<string>('22px');

  // Trạng thái mở menu xổ xuống của Toolbar
  const [openInsertMenu, setOpenInsertMenu] = useState<boolean>(false);
  const [openAlignMenu, setOpenAlignMenu] = useState<boolean>(false);
  const [openWordViewMenu, setOpenWordViewMenu] = useState<boolean>(false);
  const [wordViewMode, setWordViewMode] = useState<QuestionViewMode>('split');
  const [currentAlignment, setCurrentAlignment] = useState<'left' | 'center' | 'right' | 'justify'>('left');

  // Danh mục phân cấp & dropdown quản lý
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [addingLevel, setAddingLevel] = useState<string>('');
  const [newItemText, setNewItemText] = useState<string>('');
  const [addModalType, setAddModalType] = useState<'standard' | 'luyenTap' | 'danhGia'>('standard');
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
    setShowAddModal(true);
    setOpenDropdown(null);
  };

  const handleConfirmAddItem = () => {
    if (!newItemText.trim()) return;
    const raw = newItemText.trim();
    let val = raw;
    if (addModalType === 'danhGia') {
      val = formatDanhGiaFileName(raw);
    } else if (addModalType === 'luyenTap') {
      val = formatLuyenTapFileName(raw);
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
    setShowAddModal(false);
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
      const statusMsg = conn.isConnected && conn.isRealConfigured ? 'Google Drive thực' : 'Sandbox bộ nhớ';
      setNotification({
        text: `Đã lưu thành công lên ${statusMsg}! Đường dẫn: ${res.drivePath}`,
        type: 'success',
      });
      setTimeout(() => setNotification(null), 5000);
    } catch {
      setNotification({ text: 'Có lỗi xảy ra khi lưu tài liệu. Vui lòng thử lại!', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in max-w-7xl mx-auto pb-12">
      {/* Ẩn file input để chèn ảnh / file */}
      <input type="file" ref={imageInputRef} onChange={onImageSelected} accept="image/*" className="hidden" />
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
          <div className="bg-white p-4 rounded-2xl border border-indigo-200 shadow-xs space-y-2">
            {renderCleanDropdown('title', 'TÀI LIỆU', title, titleList, true)}
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-[11px] font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                <FolderTree className="w-3.5 h-3.5 text-slate-500" /> NỘI DUNG BÀI DẠY
              </span>
              <span className="text-[10px] text-slate-400 italic">4 cấp độ lồng nhau</span>
            </div>

            {/* Môn học & Khối lớp */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1">Môn học</label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold focus:outline-indigo-600 bg-white"
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
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold focus:outline-indigo-600 bg-white"
                >
                  <option value="">-- (Để trống) --</option>
                  <option value="Khối 10">Khối 10</option>
                  <option value="Khối 11">Khối 11</option>
                  <option value="Khối 12">Khối 12</option>
                </select>
              </div>
            </div>

            {/* 4 Cấp độ: Đã bỏ nút Nhập ngoài bên ngoài, Nút trong là "Thêm". Khi chọn bài đánh giá thì ẩn các cấp độ con */}
            {!isDanhGia(title) ? (
              <>
                {renderCleanDropdown('chuong', 'Cấp 1: Chương', chuong, chuongList)}
                {!isDanhGia(chuong) ? (
                  <>
                    {renderCleanDropdown('bai', 'Cấp 2: Bài', bai, baiList)}
                    {!isDanhGia(bai) ? (
                      <>
                        {renderCleanDropdown('vanDe', 'Cấp 3: Vấn đề', vanDe, vanDeList)}
                        {!isDanhGia(vanDe) ? (
                          renderCleanDropdown('chuyenDe', 'Cấp 4: Chuyên đề', chuyenDe, chuyenDeList)
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

        {/* Cột phải (8 cột): THANH CÔNG CỤ WORD & TRANG SOẠN THẢO A4 */}
        <div className="lg:col-span-8 space-y-4">
          {/* Menu Thanh công cụ Word */}
          <div className="bg-slate-100 p-2.5 rounded-t-2xl border border-slate-300 border-b-0 flex flex-wrap items-center gap-1.5 shadow-xs">
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
            /* Vùng giấy A4 Word Toàn bộ */
            <div className="bg-slate-200 p-4 sm:p-8 rounded-b-2xl border border-slate-300 border-t-0 shadow-inner min-h-[540px] space-y-4">
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
              <div className="bg-white p-4 rounded-xl border border-slate-300 shadow-xs">
                <div className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  <span>Trang soạn thảo tự do A4:</span>
                </div>
                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  className="bg-slate-50/50 p-6 rounded-lg shadow-inner border border-slate-200 min-h-[280px] focus:outline-none focus:ring-2 focus:ring-indigo-400 text-slate-900 overflow-y-auto"
                  style={{ fontSize, lineHeight: '1.65' }}
                ></div>
              </div>
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
                  placeholder={
                    addModalType === 'danhGia'
                      ? 'Nhập tên bài đánh giá (ví dụ: 15 phút, Giữa kỳ)...'
                      : addModalType === 'luyenTap'
                      ? 'Nhập tên bài luyện tập (ví dụ: Tự luyện dạng 1)...'
                      : 'Nhập tên mục mới...'
                  }
                  value={newItemText}
                  onChange={e => setNewItemText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleConfirmAddItem()}
                  className="flex-1 px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none min-w-0"
                />
              </div>
            </div>

            {/* Live Preview quy cách đặt tên chuẩn */}
            {(addModalType === 'danhGia' || addModalType === 'luyenTap') && (
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
                onClick={() => setShowAddModal(false)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmAddItem}
                className={`px-4 py-1.5 text-xs font-bold text-white rounded-lg shadow-xs cursor-pointer transition-colors ${
                  addModalType === 'danhGia'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : addModalType === 'luyenTap'
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {addModalType === 'danhGia'
                  ? 'Thêm Đánh giá'
                  : addModalType === 'luyenTap'
                  ? 'Thêm Luyện tập'
                  : 'Thêm mục'}
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
      return <SoDoLopView onOpenDriveConnect={onOpenDriveConnect} />;
    case 'learning-schedule':
      return <ThoiKhoaBieuView />;
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
