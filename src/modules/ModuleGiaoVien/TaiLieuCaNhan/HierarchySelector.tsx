import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Layers, Folder, FolderLock, FolderTree, Plus, Check, ChevronDown, ChevronUp, X, AlertTriangle, Loader2, Cloud, CheckCircle2, AlertCircle, RotateCcw } from 'lucide-react';
import {
  HierarchyStore,
  getStoredHierarchy,
  saveStoredHierarchy,
  buildHierarchyFromDocuments,
  formatDocumentTitle,
  matchesSubjectAndGrade,
  getGradeNumber,
  getDeletedFoldersBlacklist,
} from './hierarchyData';
import { TeacherDocument } from '../../../services/storageTypes';
import { getTeacherDocuments } from '../../ConnectData/ConnectFirestore';
import { getNestedDriveTree } from '../QuanLyDrive/driveManagerService';
import {
  isDanhGia,
  formatDanhGiaFileName,
  formatLuyenTapFileName,
  formatKiemTraFileName,
  formatCaiThienFileName,
  formatKienThucFileName,
} from './TaiLieuCaNhanView';
import {
  createDriveFolderIfNotExists,
  subscribeDriveStatus,
  getDriveConnectionState,
  connectGoogleDrive,
  scanAndSyncDriveHierarchy,
  isRealGoogleOAuthToken,
  ensureValidDriveToken,
} from '../../ConnectData/ConnectDrive/googleDriveService';

export interface HierarchySelectorProps {
  title: string;
  onChangeTitle: (val: string) => void;
  chuong: string;
  onChangeChuong: (val: string) => void;
  bai: string;
  onChangeBai: (val: string) => void;
  vanDe: string;
  onChangeVanDe: (val: string) => void;
  chuyenDe: string;
  onChangeChuyenDe: (val: string) => void;
  subject?: string;
  onChangeSubject?: (val: string) => void;
  grade?: string;
  onChangeGrade?: (val: string) => void;
  compact?: boolean;
  readOnly?: boolean;
  mode?: 'teacher' | 'student';
}

type HierarchyLevel = 'title' | 'chuong' | 'bai' | 'vanDe' | 'chuyenDe';

const LEVEL_LABELS: Record<HierarchyLevel, string> = {
  title: 'Tên tài liệu',
  chuong: 'Chương',
  bai: 'Bài',
  vanDe: 'Vấn đề',
  chuyenDe: 'Chuyên đề',
};

const SUBJECT_OPTIONS = ['Toán', 'Toán Học', 'Lý', 'Vật Lý', 'Hóa', 'Hóa Học', 'Sinh', 'Sinh Học', 'Tin', 'Tin Học', 'Anh', 'Tiếng Anh', 'Văn', 'Ngữ Văn'];
const GRADE_OPTIONS = ['Khối 10', 'Khối 11', 'Khối 12'];

export const HierarchySelector: React.FC<HierarchySelectorProps> = ({
  title,
  onChangeTitle,
  chuong,
  onChangeChuong,
  bai,
  onChangeBai,
  vanDe,
  onChangeVanDe,
  chuyenDe,
  onChangeChuyenDe,
  subject,
  onChangeSubject,
  grade,
  onChangeGrade,
  compact = false,
  readOnly = false,
  mode = 'teacher',
}) => {
  const isReadOnly = readOnly || mode === 'student';
  const [store, setStore] = useState<HierarchyStore>(() => getStoredHierarchy());
  const [documents, setDocuments] = useState<TeacherDocument[]>([]);

  // Modal xác nhận nhập ngoài danh sách
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [activeLevel, setActiveLevel] = useState<HierarchyLevel>('title');
  const [customInputValue, setCustomInputValue] = useState<string>('');
  const [confirmNotice, setConfirmNotice] = useState<string | null>(null);

  // Quản lý trạng thái mở dropdown cho từng cấp độ & Thu nhỏ / Mở rộng
  const [openDropdown, setOpenDropdown] = useState<HierarchyLevel | null>(null);
  const [syncingLevel, setSyncingLevel] = useState<HierarchyLevel | null>(null);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(compact);
  const containerRef = useRef<HTMLDivElement>(null);

  // Khởi tạo và nạp dữ liệu siêu tốc: LocalStorage ➔ Firestore ➔ Drive Fast Sync
  useEffect(() => {
    let isMounted = true;

    async function initData() {
      // 1. Tải nhanh từ Firestore để đảm bảo có sẵn danh mục ngay lập tức
      try {
        const docs = await getTeacherDocuments();
        if (isMounted && docs && docs.length > 0) {
          docs.sort((a, b) => {
            const tA = a.updatedAt ? new Date(a.updatedAt).getTime() : a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const tB = b.updatedAt ? new Date(b.updatedAt).getTime() : b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return tB - tA;
          });
          setDocuments(docs);
          const fresh = buildHierarchyFromDocuments(docs);
          const currentCached = getStoredHierarchy();
          const merged = { ...currentCached, ...fresh };
          saveStoredHierarchy(merged);
          setStore(merged);
        }
      } catch (err) {
        console.warn('Lỗi tải tài liệu Firestore trong HierarchySelector:', err);
      }

      // 2. Quét nhanh Google Drive nếu đã kết nối
      const token = localStorage.getItem('lopu_google_drive_token_v1') || localStorage.getItem('lopu_gdrive_token');
      if (token && isRealGoogleOAuthToken(token)) {
        try {
          const res = await getNestedDriveTree(['myApp', 'LopU', 'TaiLieu']);
          if (isMounted && res.success && res.tree && res.tree.children) {
            const blacklist = getDeletedFoldersBlacklist();
            const driveHierarchy: HierarchyStore = { ...getStoredHierarchy() };

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
                        for (const bNode of chNode.children) {
                          if (bNode.type === 'folder') {
                            const bName = bNode.name;
                            if (blacklist.includes(bName)) continue;
                            if (!driveHierarchy[docTitle][chName][bName]) driveHierarchy[docTitle][chName][bName] = {};

                            if (bNode.children) {
                              for (const vNode of bNode.children) {
                                if (vNode.type === 'folder') {
                                  const vName = vNode.name;
                                  if (blacklist.includes(vName)) continue;
                                  if (!driveHierarchy[docTitle][chName][bName][vName]) driveHierarchy[docTitle][chName][bName][vName] = [];

                                  if (vNode.children) {
                                    for (const cdNode of vNode.children) {
                                      if ((cdNode.type === 'folder' || cdNode.type === 'file') && !blacklist.includes(cdNode.name)) {
                                        if (!driveHierarchy[docTitle][chName][bName][vName].includes(cdNode.name)) {
                                          driveHierarchy[docTitle][chName][bName][vName].push(cdNode.name);
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
            setStore(driveHierarchy);
          }
        } catch (dErr) {
          console.warn('Lỗi quét nhanh Drive trong HierarchySelector:', dErr);
        }
      }
    }

    initData();

    // Lắng nghe sự kiện cập nhật cấu trúc phân cấp từ bất kỳ module nào trong app
    const handleHierarchySync = (e?: any) => {
      if (e?.detail) {
        setStore(e.detail);
      } else {
        setStore(getStoredHierarchy());
      }
    };
    window.addEventListener('lopu_hierarchy_updated', handleHierarchySync);
    window.addEventListener('storage', handleHierarchySync);

    const unsubscribe = subscribeDriveStatus(async (connected) => {
      if (connected) {
        initData();
      }
    });

    return () => {
      isMounted = false;
      window.removeEventListener('lopu_hierarchy_updated', handleHierarchySync);
      window.removeEventListener('storage', handleHierarchySync);
      unsubscribe();
    };
  }, []);

  const handleManualSyncFromDrive = async () => {
    setIsProcessing(true);
    setConfirmNotice('Đang quét và đồng bộ thư mục thực tế từ Google Drive...');
    const conn = getDriveConnectionState();
    if (!conn.isConnected) {
      await connectGoogleDrive();
    }
    const driveStore = await scanAndSyncDriveHierarchy();
    if (driveStore) {
      setStore(driveStore);
      setConfirmNotice('Đã đồng bộ chính xác toàn bộ thư mục từ Google Drive!');
    } else {
      setConfirmNotice('Đã hoàn tất kiểm tra Google Drive.');
    }
    setIsProcessing(false);
    setTimeout(() => setConfirmNotice(null), 4000);
  };

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const deletedList = useMemo<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('lopu_deleted_drive_folders_v1') || '[]');
    } catch {
      return [];
    }
  }, [store]);

  // 1. Danh sách TÀI LIỆU (kết hợp cả Store Local, Firestore và Google Drive)
  const allDocTitles = useMemo(() => {
    return Array.from(new Set([
      ...Object.keys(store),
      ...documents.map(d => d.title).filter((x): x is string => Boolean(x))
    ])).filter(t => !deletedList.includes(t));
  }, [store, documents, deletedList]);

  const docTitles = useMemo(() => {
    if (!subject || !subject.trim() || !grade || !grade.trim()) return [];
    const matched = allDocTitles.filter(t => matchesSubjectAndGrade(t, subject, grade));
    if (matched.length > 0) return matched;
    const matchSubj = allDocTitles.filter(t => matchesSubjectAndGrade(t, subject, undefined));
    return matchSubj;
  }, [allDocTitles, subject, grade]);

  // 2. Danh sách Cấp 1: Chương
  const currentDocObj = useMemo(() => {
    return (title && title.trim() && store[title]) ? store[title] : {};
  }, [store, title]);

  const chuongList = useMemo(() => {
    if (!title || !title.trim()) return [];
    return Object.keys(currentDocObj).filter(ch => !deletedList.includes(ch));
  }, [currentDocObj, title, deletedList]);

  // 3. Danh sách Cấp 2: Bài
  const currentChuongObj = useMemo(() => {
    return (chuong && currentDocObj[chuong]) ? currentDocObj[chuong] : {};
  }, [currentDocObj, chuong]);

  const baiList = useMemo(() => {
    if (!title || !chuong) return [];
    return Object.keys(currentChuongObj).filter(b => !deletedList.includes(b));
  }, [currentChuongObj, title, chuong, deletedList]);

  const currentBaiObj: Record<string, any> = useMemo(() => {
    return (bai && currentChuongObj[bai]) ? currentChuongObj[bai] : {};
  }, [currentChuongObj, bai]);

  // 4. Danh sách Cấp 3: Vấn đề
  const vanDeList = useMemo(() => {
    if (!title || !chuong || !bai) return [];
    return Object.keys(currentBaiObj).filter(v => !deletedList.includes(v));
  }, [currentBaiObj, title, chuong, bai, deletedList]);

  // 5. Danh sách Cấp 4: Chuyên đề
  const chuyenDeList = useMemo(() => {
    if (!title || !chuong || !bai || !vanDe || !Array.isArray(currentBaiObj[vanDe])) return [];
    return currentBaiObj[vanDe].filter((cd: string) => !deletedList.includes(cd));
  }, [currentBaiObj, title, chuong, bai, vanDe, deletedList]);

  // Tự động chọn tài liệu nếu chỉ có duy nhất 1 tài liệu phù hợp với Môn & Khối
  const lastAutoTitleRef = useRef<string>('');
  useEffect(() => {
    lastAutoTitleRef.current = '';
  }, [subject, grade]);

  useEffect(() => {
    if (subject && grade && docTitles.length === 1) {
      const singleTitle = docTitles[0];
      if (title !== singleTitle && lastAutoTitleRef.current !== singleTitle) {
        lastAutoTitleRef.current = singleTitle;
        handleSelectLevel('title', singleTitle);
      }
    }
  }, [subject, grade, docTitles.length, title]);

  // TỰ ĐỘNG CHỌN NỐI TIẾP NẾU BẤT KỲ CẤP NÀO CHỈ CÓ DUY NHẤT 1 TÙY CHỌN (Tài liệu, Chương, Bài, Vấn đề, Chuyên đề)
  // 1. Tự động chọn Chương nếu chỉ có 1 Chương
  useEffect(() => {
    if (title && chuongList.length === 1) {
      const singleChuong = chuongList[0];
      if (chuong !== singleChuong) {
        onChangeChuong(singleChuong);
      }
    }
  }, [title, chuongList, chuong, onChangeChuong]);

  // 2. Tự động chọn Bài nếu chỉ có 1 Bài
  useEffect(() => {
    if (title && chuong && baiList.length === 1) {
      const singleBai = baiList[0];
      if (bai !== singleBai) {
        onChangeBai(singleBai);
      }
    }
  }, [title, chuong, baiList, bai, onChangeBai]);

  // 3. Tự động chọn Vấn đề nếu chỉ có 1 Vấn đề
  useEffect(() => {
    if (title && chuong && bai && vanDeList.length === 1) {
      const singleVanDe = vanDeList[0];
      if (vanDe !== singleVanDe) {
        onChangeVanDe(singleVanDe);
      }
    }
  }, [title, chuong, bai, vanDeList, vanDe, onChangeVanDe]);

  // 4. Tự động chọn Chuyên đề nếu chỉ có 1 Chuyên đề
  useEffect(() => {
    if (title && chuong && bai && vanDe && chuyenDeList.length === 1) {
      const singleChuyenDe = chuyenDeList[0];
      if (chuyenDe !== singleChuyenDe) {
        onChangeChuyenDe(singleChuyenDe);
      }
    }
  }, [title, chuong, bai, vanDe, chuyenDeList, chuyenDe, onChangeChuyenDe]);

  // Quét Drive nền khi Môn và Lớp được chọn (tự động kiểm tra Token hết hạn để đồng bộ phiên làm việc)
  useEffect(() => {
    if (subject && grade) {
      ensureValidDriveToken(undefined, true).then((token) => {
        if (token && isRealGoogleOAuthToken(token)) {
          getNestedDriveTree(['myApp', 'LopU', 'TaiLieu']).then((res) => {
            if (res.success && res.tree && res.tree.children) {
              const driveHierarchy: HierarchyStore = { ...getStoredHierarchy() };
              const blacklist = getDeletedFoldersBlacklist();
              let changed = false;
              for (const docNode of res.tree.children) {
                if (docNode.type === 'folder' && !blacklist.includes(docNode.name)) {
                  if (!driveHierarchy[docNode.name]) {
                    driveHierarchy[docNode.name] = {};
                    changed = true;
                  }
                }
              }
              if (changed) {
                saveStoredHierarchy(driveHierarchy);
                setStore(driveHierarchy);
              }
            }
          }).catch(() => {});
        }
      }).catch(() => {});
    }
  }, [subject, grade]);

  const handleSelectLevel = (level: HierarchyLevel, value: string) => {
    setOpenDropdown(null);

    switch (level) {
      case 'title': {
        onChangeTitle(value);
        if (!value || isDanhGia(value)) {
          onChangeChuong('');
          onChangeBai('');
          onChangeVanDe('');
          onChangeChuyenDe('');
          break;
        }
        const nextDoc = store[value] || {};
        const chList = Object.keys(nextDoc);
        if (chList.length === 1) {
          const firstCh = chList[0];
          onChangeChuong(firstCh);
          const nextCh = nextDoc[firstCh] || {};
          const bList = Object.keys(nextCh);
          if (bList.length === 1) {
            const firstB = bList[0];
            onChangeBai(firstB);
            const nextB = nextCh[firstB] || {};
            const vList = Object.keys(nextB);
            if (vList.length === 1) {
              const firstV = vList[0];
              onChangeVanDe(firstV);
              const cList = nextB[firstV] || [];
              onChangeChuyenDe(cList.length === 1 ? cList[0] : '');
            } else {
              onChangeVanDe('');
              onChangeChuyenDe('');
            }
          } else {
            onChangeBai('');
            onChangeVanDe('');
            onChangeChuyenDe('');
          }
        } else {
          onChangeChuong('');
          onChangeBai('');
          onChangeVanDe('');
          onChangeChuyenDe('');
        }
        break;
      }
      case 'chuong': {
        onChangeChuong(value);
        if (isDanhGia(value)) {
          onChangeBai('');
          onChangeVanDe('');
          onChangeChuyenDe('');
          break;
        }
        const nextCh = currentDocObj[value] || {};
        const bList = Object.keys(nextCh);
        if (bList.length === 1) {
          const firstB = bList[0];
          onChangeBai(firstB);
          const nextB = nextCh[firstB] || {};
          const vList = Object.keys(nextB);
          if (vList.length === 1) {
            const firstV = vList[0];
            onChangeVanDe(firstV);
            const cList = nextB[firstV] || [];
            onChangeChuyenDe(cList.length === 1 ? cList[0] : '');
          } else {
            onChangeVanDe('');
            onChangeChuyenDe('');
          }
        } else {
          onChangeBai('');
          onChangeVanDe('');
          onChangeChuyenDe('');
        }
        break;
      }
      case 'bai': {
        onChangeBai(value);
        if (isDanhGia(value)) {
          onChangeVanDe('');
          onChangeChuyenDe('');
          break;
        }
        const nextB = currentChuongObj[value] || {};
        const vList = Object.keys(nextB);
        if (vList.length === 1) {
          const firstV = vList[0];
          onChangeVanDe(firstV);
          const cList = nextB[firstV] || [];
          onChangeChuyenDe(cList.length === 1 ? cList[0] : '');
        } else {
          onChangeVanDe('');
          onChangeChuyenDe('');
        }
        break;
      }
      case 'vanDe': {
        onChangeVanDe(value);
        if (isDanhGia(value)) {
          onChangeChuyenDe('');
          break;
        }
        const cList = currentBaiObj[value] || [];
        if (cList.length === 1) {
          onChangeChuyenDe(cList[0]);
        } else {
          onChangeChuyenDe('');
        }
        break;
      }
      case 'chuyenDe': {
        onChangeChuyenDe(value);
        break;
      }
    }
  };

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [customAddType, setCustomAddType] = useState<string>('standard');
  const [modalErrorMessage, setModalErrorMessage] = useState<string | null>(null);

  const openCustomModal = (level: HierarchyLevel) => {
    if (isReadOnly) return;
    setActiveLevel(level);
    setCustomInputValue('');
    setCustomAddType('standard');
    setModalErrorMessage(null);
    setModalOpen(true);
    setOpenDropdown(null);
  };

  const handleConfirmCustom = async () => {
    const raw = customInputValue.trim();
    if (!raw || isProcessing) {
      return;
    }

    let trimmed = raw;
    if (activeLevel === 'title') {
      trimmed = formatDocumentTitle(subject || 'Toán', grade || '10', raw);
    } else if (customAddType === 'danhGia') {
      trimmed = formatDanhGiaFileName(raw);
    } else if (customAddType === 'luyenTap') {
      trimmed = formatLuyenTapFileName(raw);
    } else if (customAddType === 'kiemTra') {
      trimmed = formatKiemTraFileName(raw);
    } else if (customAddType === 'caiThien') {
      trimmed = formatCaiThienFileName(raw);
    } else if (customAddType === 'kienThuc') {
      trimmed = formatKienThucFileName(raw);
    }

    const pathSegments: string[] = ['myApp', 'LopU', 'TaiLieu'];
    if (activeLevel === 'title') {
      pathSegments.push(trimmed);
    } else if (activeLevel === 'chuong') {
      pathSegments.push(title || 'TaiLieuChung', trimmed);
    } else if (activeLevel === 'bai') {
      pathSegments.push(title || 'TaiLieuChung', chuong || 'Chuong1', trimmed);
    } else if (activeLevel === 'vanDe') {
      pathSegments.push(title || 'TaiLieuChung', chuong || 'Chuong1', bai || 'Bai1', trimmed);
    } else if (activeLevel === 'chuyenDe') {
      pathSegments.push(title || 'TaiLieuChung', chuong || 'Chuong1', bai || 'Bai1', vanDe || 'VanDe1', trimmed);
    }

    setIsProcessing(true);
    setModalErrorMessage(null);
    setConfirmNotice('Đang kiểm tra và thêm vào hệ thống. Vui lòng đợi...');

    const connState = getDriveConnectionState();
    if (!connState.isConnected) {
      const connRes = await connectGoogleDrive();
      if (!connRes.success) {
        setIsProcessing(false);
        setModalErrorMessage(connRes.message || 'Phiên kết nối Google Drive chưa được xác thực. Vui lòng kết nối lại.');
        return;
      }
    }

    let driveRes = await createDriveFolderIfNotExists(pathSegments);

    if (!driveRes.success && driveRes.error && (driveRes.error.includes('401') || driveRes.error.includes('hết hạn'))) {
      const reConn = await connectGoogleDrive();
      if (reConn.success) {
        driveRes = await createDriveFolderIfNotExists(pathSegments);
      }
    }

    if (!driveRes.success) {
      setIsProcessing(false);
      const errMsg = driveRes.error || 'Tạo chưa thành công trên Google Drive. Vui lòng thử lại.';
      setModalErrorMessage(errMsg);
      setConfirmNotice(`Tạo chưa thành công: ${errMsg}`);
      setTimeout(() => setConfirmNotice(null), 5000);
      return;
    }

    const newStore = { ...store };

    if (activeLevel === 'title') {
      if (!newStore[trimmed]) {
        newStore[trimmed] = {};
      }
      onChangeTitle(trimmed);
      onChangeChuong('');
      onChangeBai('');
      onChangeVanDe('');
      onChangeChuyenDe('');
    } else if (activeLevel === 'chuong') {
      const curDocTitle = title || 'Tài liệu mới';
      if (!newStore[curDocTitle]) newStore[curDocTitle] = {};
      if (!newStore[curDocTitle][trimmed]) {
        newStore[curDocTitle][trimmed] = {};
      }
      onChangeTitle(curDocTitle);
      onChangeChuong(trimmed);
      onChangeBai('');
      onChangeVanDe('');
      onChangeChuyenDe('');
    } else if (activeLevel === 'bai') {
      const curDocTitle = title || 'Tài liệu mới';
      const curChuong = chuong || 'Chương 1';
      if (!newStore[curDocTitle]) newStore[curDocTitle] = {};
      if (!newStore[curDocTitle][curChuong]) newStore[curDocTitle][curChuong] = {};
      if (!newStore[curDocTitle][curChuong][trimmed]) {
        newStore[curDocTitle][curChuong][trimmed] = {};
      }
      onChangeTitle(curDocTitle);
      onChangeChuong(curChuong);
      onChangeBai(trimmed);
      onChangeVanDe('');
      onChangeChuyenDe('');
    } else if (activeLevel === 'vanDe') {
      const curDocTitle = title || 'Tài liệu mới';
      const curChuong = chuong || 'Chương 1';
      const curBai = bai || 'Bài 1';
      if (!newStore[curDocTitle]) newStore[curDocTitle] = {};
      if (!newStore[curDocTitle][curChuong]) newStore[curDocTitle][curChuong] = {};
      if (!newStore[curDocTitle][curChuong][curBai]) newStore[curDocTitle][curChuong][curBai] = {};
      if (!newStore[curDocTitle][curChuong][curBai][trimmed]) {
        newStore[curDocTitle][curChuong][curBai][trimmed] = [];
      }
      onChangeTitle(curDocTitle);
      onChangeChuong(curChuong);
      onChangeBai(curBai);
      onChangeVanDe(trimmed);
      onChangeChuyenDe('');
    } else if (activeLevel === 'chuyenDe') {
      const curDocTitle = title || 'Tài liệu mới';
      const curChuong = chuong || 'Chương 1';
      const curBai = bai || 'Bài 1';
      const curVanDe = vanDe || 'Vấn đề 1';
      if (!newStore[curDocTitle]) newStore[curDocTitle] = {};
      if (!newStore[curDocTitle][curChuong]) newStore[curDocTitle][curChuong] = {};
      if (!newStore[curDocTitle][curChuong][curBai]) newStore[curDocTitle][curChuong][curBai] = {};
      if (!newStore[curDocTitle][curChuong][curBai][curVanDe]) {
        newStore[curDocTitle][curChuong][curBai][curVanDe] = [];
      }
      if (!newStore[curDocTitle][curChuong][curBai][curVanDe].includes(trimmed)) {
        newStore[curDocTitle][curChuong][curBai][curVanDe].push(trimmed);
      }
      onChangeTitle(curDocTitle);
      onChangeChuong(curChuong);
      onChangeBai(curBai);
      onChangeVanDe(curVanDe);
      onChangeChuyenDe(trimmed);
    }

    setStore(newStore);
    saveStoredHierarchy(newStore);
    setIsProcessing(false);
    setModalErrorMessage(null);
    setModalOpen(false);

    setConfirmNotice(
      driveRes.alreadyExists
        ? `Đã liên kết thư mục "${trimmed}" trên Google Drive (Đường dẫn: Drive của tôi ➔ myApp ➔ LopU ➔ TaiLieu)!`
        : `Đã tạo thành công thư mục "${trimmed}" trên Google Drive (Đường dẫn: Drive của tôi ➔ myApp ➔ LopU ➔ TaiLieu)!`
    );
    setTimeout(() => setConfirmNotice(null), 5500);
  };

  const driveConn = getDriveConnectionState();

  const renderDriveStatusIndicator = (compactView = false) => {
    if (isProcessing) {
      return (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-300 animate-pulse shadow-2xs"
          title="Đang kiểm tra và đồng bộ thư mục với Google Drive..."
        >
          <Loader2 className="w-3 h-3 animate-spin text-amber-600 shrink-0" />
          <span>{compactView ? 'Đang đồng bộ...' : 'Đang đồng bộ Drive...'}</span>
        </span>
      );
    }

    if (!driveConn.isConnected) {
      return (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200 shadow-2xs"
          title="Chưa kết nối Google Drive"
        >
          <Cloud className="w-3 h-3 text-slate-400 shrink-0" />
          <span>{compactView ? 'Chưa kết nối' : 'Google Drive: Chưa kết nối'}</span>
        </span>
      );
    }

    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-2xs"
        title="Đã kết nối và đồng bộ chuẩn xác với Google Drive"
      >
        <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
        <span>{compactView ? 'Đã đồng bộ' : 'Google Drive: Đã đồng bộ'}</span>
      </span>
    );
  };

  const renderDropdown = (
    level: HierarchyLevel,
    label: string,
    currentValue: string,
    options: string[],
    isHighlight = false
  ) => {
    const isOpen = openDropdown === level;

    return (
      <div className="space-y-1 relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 flex-wrap">
            <label className={`text-[11px] font-bold ${isHighlight ? 'text-indigo-900 font-extrabold' : 'text-slate-700'}`}>
              {label}
            </label>
            {((isProcessing && activeLevel === level) || syncingLevel === level) && (
              <span className="text-red-600 font-bold text-[10px] ml-1 animate-pulse flex items-center gap-1">
                <RotateCcw className="w-2.5 h-2.5 text-red-600 animate-spin shrink-0" />
                <span>Đang đồng bộ</span>
              </span>
            )}
            {currentValue && !((isProcessing && activeLevel === level) || syncingLevel === level) && (
              <span
                className="inline-flex items-center gap-0.5 text-[9px] font-medium text-emerald-600 bg-emerald-50/80 px-1.5 py-0.2 rounded border border-emerald-200"
                title={`Mục "${currentValue}" đã được đồng bộ với Google Drive`}
              >
                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />
                <span>Đồng bộ</span>
              </span>
            )}
          </div>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setOpenDropdown(isOpen ? null : level)}
            className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold text-left flex items-center justify-between transition-colors cursor-pointer ${
              isHighlight
                ? 'border-indigo-200 bg-indigo-50/30 text-indigo-950 hover:border-indigo-300'
                : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300'
            }`}
          >
            <span className="truncate pr-2">
              {currentValue || (
                <span className="text-slate-400 italic">
                  {isReadOnly ? '-- Chọn --' : '-- Chọn hoặc nhấn Thêm --'}
                </span>
              )}
            </span>
            <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>

          {isOpen && (
            <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto divide-y divide-slate-100 py-1">
              <div
                onClick={() => {
                  if (level === 'title') {
                    onChangeTitle('');
                    onChangeChuong('');
                    onChangeBai('');
                    onChangeVanDe('');
                    onChangeChuyenDe('');
                  } else if (level === 'chuong') {
                    onChangeChuong('');
                    onChangeBai('');
                    onChangeVanDe('');
                    onChangeChuyenDe('');
                  } else if (level === 'bai') {
                    onChangeBai('');
                    onChangeVanDe('');
                    onChangeChuyenDe('');
                  } else if (level === 'vanDe') {
                    onChangeVanDe('');
                    onChangeChuyenDe('');
                  } else if (level === 'chuyenDe') {
                    onChangeChuyenDe('');
                  }
                  setOpenDropdown(null);
                }}
                className={`px-3 py-2 text-xs flex items-center justify-between gap-2 hover:bg-slate-100 cursor-pointer transition-colors ${
                  !currentValue ? 'bg-indigo-50 text-indigo-900 font-bold' : 'text-slate-400 italic'
                }`}
              >
                <span>(Để trống)</span>
              </div>

              {options.length === 0 ? (
                <div className="px-3 py-2 text-[11px] text-slate-400 italic text-center space-y-1.5">
                  <div>Chưa tìm thấy mục nào.</div>
                  {!isReadOnly && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleManualSyncFromDrive();
                      }}
                      className="px-2.5 py-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                      title="Bấm để quét lại các thư mục thực tế từ Google Drive"
                    >
                      <RotateCcw className="w-3 h-3 text-indigo-600" />
                      <span>Quét lại Drive</span>
                    </button>
                  )}
                </div>
              ) : (
                options.map((opt) => (
                  <div
                    key={opt}
                    onClick={() => handleSelectLevel(level, opt)}
                    className={`px-3 py-2 text-xs flex items-center justify-between gap-2 hover:bg-indigo-50/60 cursor-pointer transition-colors ${
                      opt === currentValue ? 'bg-indigo-50 text-indigo-900 font-bold' : 'text-slate-700'
                    }`}
                  >
                    <span className="truncate flex-1">{opt}</span>
                  </div>
                ))
              )}

              {!isReadOnly && (
                <div
                  onClick={() => openCustomModal(level)}
                  className="px-3 py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-50 cursor-pointer flex items-center gap-1.5 border-t border-slate-100 bg-slate-50/50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm</span>
                </div>
              )}
            </div>
          )}
        </div>

        {isProcessing && activeLevel === level && (
          <div className="mt-1.5 p-2 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-bold flex items-center gap-2 animate-pulse shadow-xs">
            <Loader2 className="w-4 h-4 animate-spin text-amber-600 shrink-0" />
            <span>Đang kiểm tra và thêm vào hệ thống. Vui lòng đợi...</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div ref={containerRef} className="space-y-4">
      {confirmNotice && (
        <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 shadow-xs">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{confirmNotice}</span>
        </div>
      )}

      {/* BỐ TRÍ 2 CỘT TÍNH NĂNG CHUẨN THEO ẢNH MINH HỌA: CỘT TRÁI = TÀI LIỆU, CỘT PHẢI = NỘI DUNG DẠY HỌC */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 items-stretch">
        {/* CỘT TRÁI: 1. TÀI LIỆU (MÔN HỌC, KHỐI LỚP & TÊN TÀI LIỆU) */}
        <div className="bg-white p-4.5 rounded-2xl border border-indigo-200/90 shadow-xs space-y-3.5 h-full flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-100/80 pb-2.5 mb-3">
              <span className="text-[12px] font-black uppercase text-indigo-900 tracking-wider flex items-center gap-1.5">
                <span
                  title="module BoChonHocLieuTienTrinh (Module dùng chung)"
                  className="inline-flex items-center cursor-help"
                >
                  <Folder className="w-4 h-4 text-indigo-600 hover:text-indigo-800 transition-colors shrink-0" />
                </span>
                TÀI LIỆU
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-indigo-600 font-semibold hidden sm:inline">
                  Môn học + Khối lớp ➔ Tên tài liệu
                </span>
                {renderDriveStatusIndicator(true)}
              </div>
            </div>

            {onChangeSubject && onChangeGrade && (
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Môn học</label>
                  <select
                    value={subject || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      onChangeSubject(val);
                      onChangeTitle('');
                      onChangeChuong('');
                      onChangeBai('');
                      onChangeVanDe('');
                      onChangeChuyenDe('');
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-indigo-600 bg-white cursor-pointer"
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
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Khối lớp</label>
                  <select
                    value={grade || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      onChangeGrade(val);
                      onChangeTitle('');
                      onChangeChuong('');
                      onChangeBai('');
                      onChangeVanDe('');
                      onChangeChuyenDe('');
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-indigo-600 bg-white cursor-pointer"
                  >
                    <option value="">-- (Để trống) --</option>
                    <option value="Khối 10">Khối 10</option>
                    <option value="Khối 11">Khối 11</option>
                    <option value="Khối 12">Khối 12</option>
                  </select>
                </div>
              </div>
            )}

            <div>
              {renderDropdown('title', 'Tên tài liệu', title, docTitles, true)}
            </div>
          </div>

          <div className="pt-2 text-[10px] text-slate-400 italic border-t border-slate-100 flex items-center justify-between">
            <span>Tên tài liệu gốc lưu trên Drive cá nhân</span>
            <button
              type="button"
              onClick={handleManualSyncFromDrive}
              disabled={isProcessing}
              title="Quét và đồng bộ lại danh mục thư mục thực tế từ Google Drive"
              className="inline-flex items-center gap-1 text-indigo-700 font-bold hover:underline cursor-pointer"
            >
              <RotateCcw className={`w-3 h-3 text-indigo-600 ${isProcessing ? 'animate-spin' : ''}`} />
              <span>Đồng bộ Drive</span>
            </button>
          </div>
        </div>

        {/* CỘT PHẢI: 2. NỘI DUNG DẠY HỌC (CHƯƠNG, BÀI, VẤN ĐỀ, CHUYÊN ĐỀ) */}
        {title && title.trim() !== '' ? (
          <div className="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-xs space-y-3.5 animate-fade-in h-full flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100/80 pb-2.5 mb-3">
                <span className="text-[12px] font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                  <FolderTree className="w-4 h-4 text-slate-500" /> NỘI DUNG DẠY HỌC
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 italic hidden sm:inline">Chương ➔ Bài ➔ Vấn đề ➔ Chuyên đề</span>
                  {renderDriveStatusIndicator(true)}
                </div>
              </div>

              {!isDanhGia(title) ? (
                <div className="space-y-3">
                  {renderDropdown('chuong', 'Chương', chuong, chuongList)}
                  {!isDanhGia(chuong) ? (
                    <>
                      {renderDropdown('bai', 'Bài', bai, baiList)}
                      {!isDanhGia(bai) ? (
                        <>
                          {renderDropdown('vanDe', 'Vấn đề', vanDe, vanDeList)}
                          {!isDanhGia(vanDe) ? (
                            renderDropdown('chuyenDe', 'Chuyên đề', chuyenDe, chuyenDeList)
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
                </div>
              ) : (
                <div className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-xl font-medium">
                  ℹ️ Tài liệu là bài đánh giá — Đã ẩn toàn bộ các cấp con bên dưới.
                </div>
              )}
            </div>

            <div className="pt-2 text-[10px] text-slate-500 font-mono border-t border-slate-100 flex items-center gap-1">
              <span className="font-bold text-indigo-600">Drive:</span>
              <span className="truncate">
                {title || '[Tên tài liệu]'} / {chuong || '[Chương]'} / {bai || '[Bài]'} / {vanDe || '[Vấn đề]'} / {chuyenDe || '[Chuyên đề]'}
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-xs h-full flex flex-col justify-between">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100/80 pb-2.5 mb-3">
              <span className="text-[12px] font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                <FolderTree className="w-4 h-4 text-slate-500" /> NỘI DUNG DẠY HỌC
              </span>
              <span className="text-[10px] text-slate-400 italic hidden sm:inline">Chương ➔ Bài ➔ Vấn đề ➔ Chuyên đề</span>
            </div>

            <div className="p-6 bg-slate-50/60 border border-dashed border-slate-200 rounded-2xl text-center text-xs text-slate-600 font-medium my-auto flex flex-col items-center justify-center gap-2">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-indigo-600 text-white font-extrabold text-xs shadow-2xs">
                i
              </span>
              <p className="max-w-xs leading-relaxed text-slate-700">
                {isReadOnly ? (
                  <>Vui lòng chọn <strong>TÊN TÀI LIỆU</strong> bên trái để hiển thị <strong>NỘI DUNG DẠY HỌC</strong> (Chương, Bài, Vấn đề, Chuyên đề).</>
                ) : (
                  <>Vui lòng chọn hoặc thêm <strong>TÊN TÀI LIỆU</strong> bên trái để hiển thị <strong>NỘI DUNG DẠY HỌC</strong> (Chương, Bài, Vấn đề, Chuyên đề).</>
                )}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* POPUP / MODAL XÁC NHẬN THÊM VÀO TÀI LIỆU / PHÂN CẤP */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                <span>Thêm vào:</span>
                <span className="text-indigo-700 font-extrabold">{LEVEL_LABELS[activeLevel]}</span>
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-xs p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1 uppercase">
                  Tùy chọn:
                </label>
                <select
                  value={customAddType}
                  onChange={(e) => setCustomAddType(e.target.value)}
                  disabled={isProcessing}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-indigo-600 bg-slate-50 cursor-pointer disabled:bg-slate-100 disabled:text-slate-400"
                >
                  <option value="standard">Thêm {LEVEL_LABELS[activeLevel].toLowerCase()} mới</option>
                  <option value="danhGia">Đánh giá</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1 uppercase">
                  Tên {LEVEL_LABELS[activeLevel].toLowerCase()} mới:
                </label>
                <input
                  type="text"
                  autoFocus
                  disabled={isProcessing}
                  value={customInputValue}
                  onChange={(e) => {
                    setCustomInputValue(e.target.value);
                    if (modalErrorMessage) setModalErrorMessage(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isProcessing) {
                      handleConfirmCustom();
                    }
                  }}
                  placeholder={`Nhập tên ${LEVEL_LABELS[activeLevel].toLowerCase()}...`}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {modalErrorMessage && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{modalErrorMessage}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                disabled={isProcessing}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmCustom}
                disabled={isProcessing || !customInputValue.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
              >
                {isProcessing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{isProcessing ? 'Đang tạo...' : 'Xác nhận tạo'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
