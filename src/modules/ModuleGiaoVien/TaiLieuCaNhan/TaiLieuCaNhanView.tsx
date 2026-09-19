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
  Trash2,
  FileUp,
  FileCode,
} from 'lucide-react';
import { TeacherDocument, ClassItem, UserRole, UserProfile, SUPERADMIN_EMAILS } from '../../../services/storageTypes';
import { getClasses, getTeacherDocuments, saveTeacherDocument, getUsers } from '../../ConnectData/ConnectFirestore';
import { saveTeachingMaterialHierarchyToDrive, getDriveConnectionState } from '../../ConnectData/ConnectDrive/googleDriveService';
import { HierarchySelector } from './HierarchySelector';
import { IconNam, IconNu } from '../../ModuleHocSinh/SoDoLop/SoDoLopView';
import { MathTypeEditorModal } from './MathTypeEditorModal';
import { MathFormulaRenderer } from './MathFormulaRenderer';
import { auth } from '../../../config/firebase';
import { signOut } from 'firebase/auth';

/**
 * Quy cách đặt tên mới theo yêu cầu:
 * - Luyện tập: LuyenTap <tên bài luyện tập>.json (không có cặp dấu [])
 * - Đánh giá: DanhGia <tên bài đánh giá>.json (không có cặp dấu [])
 */
export function formatDanhGiaFileName(rawName: string): string {
  let clean = rawName.trim();
  clean = clean.replace(/^DanhGia\s*/i, '').replace(/[\[\]]/g, '').replace(/\.json$/i, '').trim();
  return `DanhGia ${clean || 'Bài đánh giá'}.json`;
}

export function formatLuyenTapFileName(rawName: string): string {
  let clean = rawName.trim();
  clean = clean.replace(/^LuyenTap\s*/i, '').replace(/[\[\]]/g, '').replace(/\.json$/i, '').trim();
  return `LuyenTap ${clean || 'Bài luyện tập'}.json`;
}

export const isDanhGia = (str?: string): boolean => {
  if (!str) return false;
  return /^DanhGia/i.test(str.trim()) || /^\[?DanhGia/i.test(str.trim());
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
  const [deleteOptionConfirm, setDeleteOptionConfirm] = useState<{ level: string; item: string } | null>(null);
  
  // Trạng thái kiểu mục khi bấm "Thêm":
  // - Tài liệu, chương, bài, vấn đề: 2 tùy chọn: 'standard' (Thêm mới) hoặc 'danhGia' (Đánh giá)
  // - Chuyên đề: 3 tùy chọn: 'standard' (Thêm chuyên đề mới), 'luyenTap' (Luyện tập), 'danhGia' (Đánh giá)
  const [modalAddType, setModalAddType] = useState<'standard' | 'luyenTap' | 'danhGia'>('standard');
  const [showMathTypeModal, setShowMathTypeModal] = useState<boolean>(false);
  const [mathModalInitialFormula, setMathModalInitialFormula] = useState<string>('');

  // Đính kèm / Chèn file (bổ sung chèn được file .html)
  const [attachedFiles, setAttachedFiles] = useState<Array<{ name: string; size: string; ext: string; isHtml: boolean }>>([]);
  const fileUploadRef = useRef<HTMLInputElement>(null);

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
  
  const [customTitles, setCustomTitles] = useState<string[]>([]);
  const [customChuongs, setCustomChuongs] = useState<string[]>([]);
  const [customBais, setCustomBais] = useState<string[]>([]);
  const [customVanDes, setCustomVanDes] = useState<string[]>([]);
  const [customChuyenDes, setCustomChuyenDes] = useState<string[]>([]);

  const handleOpenAdd = (level: string) => {
    setModalAddLevel(level);
    setModalAddItemText('');
    // Mặc định chọn tùy chọn đầu tiên (Thêm mới)
    setModalAddType('standard');
    setShowModalAddDialog(true);
    setOpenModalDropdown(null);
  };

  const handleConfirmAdd = () => {
    if (!modalAddItemText.trim()) return;
    const raw = modalAddItemText.trim();
    let val = raw;

    // Áp dụng quy cách đặt tên chuẩn
    if (modalAddType === 'danhGia') {
      val = formatDanhGiaFileName(raw);
    } else if (modalAddType === 'luyenTap') {
      val = formatLuyenTapFileName(raw);
    } else {
      val = raw;
    }

    if (modalAddLevel === 'title') {
      setCustomTitles(prev => [...prev, val]);
      setNewTitle(val);
      if (modalAddType === 'danhGia') {
        setNewChuong('');
        setNewBai('');
        setNewVanDe('');
        setNewChuyenDe('');
      }
    } else if (modalAddLevel === 'chuong') {
      setCustomChuongs(prev => [...prev, val]);
      setNewChuong(val);
      if (modalAddType === 'danhGia') {
        setNewBai('');
        setNewVanDe('');
        setNewChuyenDe('');
      }
    } else if (modalAddLevel === 'bai') {
      setCustomBais(prev => [...prev, val]);
      setNewBai(val);
      if (modalAddType === 'danhGia') {
        setNewVanDe('');
        setNewChuyenDe('');
      }
    } else if (modalAddLevel === 'vanDe') {
      setCustomVanDes(prev => [...prev, val]);
      setNewVanDe(val);
      if (modalAddType === 'danhGia') {
        setNewChuyenDe('');
      }
    } else if (modalAddLevel === 'chuyenDe') {
      setCustomChuyenDes(prev => [...prev, val]);
      setNewChuyenDe(val);
    }
    setShowModalAddDialog(false);
  };

  const handleExecuteDeleteOption = () => {
    if (!deleteOptionConfirm) return;
    const { level, item } = deleteOptionConfirm;
    if (level === 'title') {
      setCustomTitles(prev => prev.filter(x => x !== item));
      if (newTitle === item) setNewTitle('');
    } else if (level === 'chuong') {
      setCustomChuongs(prev => prev.filter(x => x !== item));
      if (newChuong === item) setNewChuong('');
    } else if (level === 'bai') {
      setCustomBais(prev => prev.filter(x => x !== item));
      if (newBai === item) setNewBai('');
    } else if (level === 'vanDe') {
      setCustomVanDes(prev => prev.filter(x => x !== item));
      if (newVanDe === item) setNewVanDe('');
    } else if (level === 'chuyenDe') {
      setCustomChuyenDes(prev => prev.filter(x => x !== item));
      if (newChuyenDe === item) setNewChuyenDe('');
    }
    setDeleteOptionConfirm(null);
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
        <label className={`text-[11px] font-bold block ${isHighlight ? 'text-indigo-900' : 'text-slate-700'}`}>
          {label}
        </label>
        
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
                      title={`Xóa "${opt}"`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteOptionConfirm({ level: lvl, item: opt });
                      }}
                      className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
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
      </div>
    );
  };

  useEffect(() => {
    async function load() {
      const cls = await getClasses();
      setClasses(cls);
      const docs = await getTeacherDocuments();
      setDocuments(docs);
      const uList = await getUsers();
      setUsers(uList);
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
    if (conn.isConnected && conn.isRealConfigured) {
      setNotification(`Đã tải lên Drive & Hệ thống thành công: ${cleanFileName} tại thư mục ${res.drivePath}`);
    } else {
      setNotification(`Đã tải lên Drive & Hệ thống thành công (Sandbox): ${cleanFileName} tại thư mục ${res.drivePath}`);
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
      if (conn.isConnected && conn.isRealConfigured) {
        setNotification(`Đã ghi đè & cập nhật lên Drive & Hệ thống thành công: ${cleanFileName} tại thư mục ${driveFolder}`);
      } else {
        setNotification(`Đã ghi đè & cập nhật lên Drive & Hệ thống thành công (Sandbox): ${cleanFileName} tại thư mục ${driveFolder}`);
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
    if (conn.isConnected && conn.isRealConfigured) {
      setNotification(`Đã tải lên Drive & Hệ thống thành công: ${cleanFileName} tại thư mục ${driveFolder}`);
    } else {
      setNotification(`Đã tải lên Drive & Hệ thống thành công (Sandbox): ${cleanFileName} tại thư mục ${driveFolder}`);
    }
    setTimeout(() => setNotification(null), 5000);
  };

  const filteredDocs = documents.filter(d => {
    const matchSearch = d.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = categoryFilter === 'all' || d.category === categoryFilter;
    return matchSearch && matchCategory;
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
                <span className="text-[11px] text-slate-500">Cấu trúc: Tài liệu ➔ Chương ➔ Bài ➔ Vấn đề ➔ Chuyên đề</span>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateDocument} className="space-y-3.5 text-xs">
              {/* 1. TÀI LIỆU (ĐƯỢC ĐẶT LÊN TRÊN NỘI DUNG BÀI DẠY) */}
              <div className="bg-white p-3.5 rounded-2xl border border-indigo-200 shadow-xs space-y-2">
                {renderCleanModalDropdown(
                  'title',
                  'TÀI LIỆU',
                  newTitle,
                  Array.from(new Set([...documents.map(d => d.title).filter(Boolean), ...customTitles])),
                  true
                )}
              </div>

              {/* 2. NỘI DUNG BÀI DẠY: Đã bỏ nút Nhập ngoài bên ngoài, nút trong là Thêm */}
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
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

                {/* 4 Cấp độ: Khi chọn thêm bài đánh giá thì ẩn các cấp độ con của nó */}
                {!isDanhGia(newTitle) ? (
                  <>
                    {renderCleanModalDropdown('chuong', 'Cấp 1: Chương', newChuong, customChuongs)}
                    {!isDanhGia(newChuong) ? (
                      <>
                        {renderCleanModalDropdown('bai', 'Cấp 2: Bài', newBai, customBais)}
                        {!isDanhGia(newBai) ? (
                          <>
                            {renderCleanModalDropdown('vanDe', 'Cấp 3: Vấn đề', newVanDe, customVanDes)}
                            {!isDanhGia(newVanDe) ? (
                              renderCleanModalDropdown('chuyenDe', 'Cấp 4: Chuyên đề', newChuyenDe, customChuyenDes)
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
                          title="Xóa tệp đính kèm"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700 uppercase text-xs">Tóm tắt nội dung bài soạn</label>
                  <button
                    type="button"
                    onClick={() => {
                      setMathModalInitialFormula('');
                      setShowMathTypeModal(true);
                    }}
                    className="text-[11px] font-bold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    <span className="font-serif font-black text-xs text-purple-800">∑√</span>
                    <span>Chèn công thức (MathType)...</span>
                  </button>
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
                  {modalAddLevel === 'title' ? 'Tài liệu' : modalAddLevel === 'chuong' ? 'Cấp 1: Chương' : modalAddLevel === 'bai' ? 'Cấp 2: Bài' : modalAddLevel === 'vanDe' ? 'Cấp 3: Vấn đề' : 'Cấp 4: Chuyên đề'}
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
                  /* Nút Thêm ở chuyên đề: dropdown 3 tùy chọn: Thêm chuyên đề mới / Luyện tập / Đánh giá */
                  <select
                    id="dropdown-add-chuyende-options"
                    value={modalAddType}
                    onChange={e => setModalAddType(e.target.value as any)}
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
                  placeholder={
                    modalAddType === 'danhGia'
                      ? 'Ví dụ: 15 phút hoặc Giữa kỳ 1...'
                      : modalAddType === 'luyenTap'
                      ? 'Ví dụ: Tự luyện dạng 1...'
                      : 'Nhập tên mục mới...'
                  }
                  value={modalAddItemText}
                  onChange={e => setModalAddItemText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleConfirmAdd()}
                  className="flex-1 px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none min-w-0"
                />
              </div>
            </div>

            {/* Live Preview quy cách đặt tên chuẩn */}
            {(modalAddType === 'danhGia' || modalAddType === 'luyenTap') && (
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] space-y-1">
                <span className="text-slate-500 block">Quy cách đặt tên tệp chuẩn:</span>
                <div className="font-mono font-bold text-xs text-indigo-700 bg-white px-2 py-1 rounded border border-indigo-100 flex items-center gap-1.5 truncate">
                  <span>📄</span>
                  <span className="truncate">
                    {modalAddType === 'danhGia'
                      ? formatDanhGiaFileName(modalAddItemText)
                      : formatLuyenTapFileName(modalAddItemText)}
                  </span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowModalAddDialog(false)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmAdd}
                className={`px-4 py-1.5 text-xs font-bold text-white rounded-lg shadow-xs cursor-pointer transition-colors ${
                  modalAddType === 'danhGia'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : modalAddType === 'luyenTap'
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {modalAddType === 'danhGia'
                  ? 'Thêm Đánh giá'
                  : modalAddType === 'luyenTap'
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

      {/* Modal xác nhận xóa */}
      {deleteOptionConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-3">
            <h4 className="font-bold text-sm text-rose-700">Xác nhận xóa tùy chọn</h4>
            <p className="text-xs text-slate-600">
              Bạn có chắc chắn muốn xóa mục <strong>"{deleteOptionConfirm.item}"</strong> không?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteOptionConfirm(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleExecuteDeleteOption}
                className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs cursor-pointer"
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
