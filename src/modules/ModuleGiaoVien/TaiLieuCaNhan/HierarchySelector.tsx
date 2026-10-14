import React, { useState, useEffect, useRef } from 'react';
import { Layers, FolderTree, Plus, Check, ChevronDown, X, AlertTriangle, Loader2, Cloud, CheckCircle2, AlertCircle, RotateCcw } from 'lucide-react';
import {
  HierarchyStore,
  getStoredHierarchy,
  saveStoredHierarchy,
  formatDocumentTitle,
  matchesSubjectAndGrade,
  getGradeNumber,
} from './hierarchyData';
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
}

type HierarchyLevel = 'title' | 'chuong' | 'bai' | 'vanDe' | 'chuyenDe';

const LEVEL_LABELS: Record<HierarchyLevel, string> = {
  title: 'TÀI LIỆU',
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
}) => {
  const [store, setStore] = useState<HierarchyStore>(() => getStoredHierarchy());

  // Modal xác nhận nhập ngoài danh sách
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [activeLevel, setActiveLevel] = useState<HierarchyLevel>('title');
  const [customInputValue, setCustomInputValue] = useState<string>('');
  const [confirmNotice, setConfirmNotice] = useState<string | null>(null);

  // Quản lý trạng thái mở dropdown cho từng cấp độ
  const [openDropdown, setOpenDropdown] = useState<HierarchyLevel | null>(null);
  const [syncingLevel, setSyncingLevel] = useState<HierarchyLevel | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Tự động đồng bộ cây thư mục thực tế từ Google Drive khi nạp module
  useEffect(() => {
    async function syncFromDrive() {
      const driveStore = await scanAndSyncDriveHierarchy();
      if (driveStore) {
        setStore(driveStore);
      }
    }
    syncFromDrive();

    const unsubscribe = subscribeDriveStatus(async (connected) => {
      if (connected) {
        const driveStore = await scanAndSyncDriveHierarchy();
        if (driveStore) {
          setStore(driveStore);
        }
      }
    });

    return () => unsubscribe();
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

  let deletedList: string[] = [];
  try {
    deletedList = JSON.parse(localStorage.getItem('lopu_deleted_drive_folders_v1') || '[]');
  } catch {}

  // 1. Danh sách TÀI LIỆU (thư mục trực tiếp trong thư mục gốc) - Chỉ đồng bộ khi cả Môn học và Khối lớp đều khác rỗng
  const allDocTitles = Object.keys(store).filter(t => !deletedList.includes(t));
  const docTitles = (subject && subject.trim() !== '' && grade && grade.trim() !== '')
    ? (() => {
        const matched = allDocTitles.filter(t => matchesSubjectAndGrade(t, subject, grade));
        if (matched.length > 0) {
          return matched;
        }
        // Fallback: nếu chưa có thư mục khớp chính xác cả khối lớp, lấy các thư mục khớp Môn học
        const matchSubj = allDocTitles.filter(t => matchesSubjectAndGrade(t, subject, undefined));
        if (matchSubj.length > 0) {
          return matchSubj;
        }
        return [];
      })()
    : [];

  // 2. Danh sách Cấp 1: Chương (lồng theo TÀI LIỆU) - Chỉ lấy thư mục con của tài liệu đang chọn
  const currentDocObj = (title && title.trim() && store[title]) ? store[title] : {};
  const chuongList = (title && title.trim())
    ? Object.keys(currentDocObj).filter(ch => !deletedList.includes(ch))
    : [];

  // 3. Danh sách Cấp 2: Bài (lồng theo Chương) - Chỉ lấy con của Chương đang chọn trong Tài liệu đang chọn
  const currentChuongObj = (chuong && currentDocObj[chuong]) ? currentDocObj[chuong] : {};
  const baiList = (title && chuong)
    ? Object.keys(currentChuongObj).filter(b => !deletedList.includes(b))
    : [];

  // 4. Danh sách Cấp 3: Vấn đề (lồng theo Bài)
  const currentBaiObj = (bai && currentChuongObj[bai]) ? currentChuongObj[bai] : {};
  const vanDeList = (title && chuong && bai)
    ? Object.keys(currentBaiObj).filter(v => !deletedList.includes(v))
    : [];

  // 5. Danh sách Cấp 4: Chuyên đề (lồng theo Vấn đề)
  const chuyenDeList = (title && chuong && bai && vanDe && Array.isArray(currentBaiObj[vanDe]))
    ? currentBaiObj[vanDe].filter(cd => !deletedList.includes(cd))
    : [];

  // Quy tắc: Nếu có duy nhất 1 tùy chọn thì mặc định chọn nó; nếu nhiều hơn 1 tùy chọn thì mặc định là rỗng
  useEffect(() => {
    // Dropdown Môn học: nếu chỉ có 1 tùy chọn thì chọn, nếu nhiều hơn 1 thì mặc định rỗng
    if (onChangeSubject) {
      if (SUBJECT_OPTIONS.length === 1 && subject !== SUBJECT_OPTIONS[0]) {
        onChangeSubject(SUBJECT_OPTIONS[0]);
      } else if (SUBJECT_OPTIONS.length > 1 && subject && !SUBJECT_OPTIONS.includes(subject)) {
        onChangeSubject('');
      }
    }
    // Dropdown Khối lớp: nếu chỉ có 1 tùy chọn thì chọn, nếu nhiều hơn 1 thì mặc định rỗng
    if (onChangeGrade) {
      if (GRADE_OPTIONS.length === 1 && grade !== GRADE_OPTIONS[0]) {
        onChangeGrade(GRADE_OPTIONS[0]);
      } else if (GRADE_OPTIONS.length > 1 && grade && !GRADE_OPTIONS.includes(grade)) {
        onChangeGrade('');
      }
    }
  }, []);

  // Khi chọn Môn học và Khối lớp: quét thư mục con myApp\LopU\TaiLieu trên Drive để lấy Tên tài liệu
  const prevSubjectRef = useRef(subject);
  const prevGradeRef = useRef(grade);

  useEffect(() => {
    const subjectChanged = prevSubjectRef.current !== subject;
    const gradeChanged = prevGradeRef.current !== grade;
    prevSubjectRef.current = subject;
    prevGradeRef.current = grade;

    if (subjectChanged || gradeChanged) {
      if (subject && subject.trim() !== '' && grade && grade.trim() !== '') {
        setSyncingLevel('title');

        let isMounted = true;
        scanAndSyncDriveHierarchy(
          (quickStore) => {
            if (isMounted && quickStore) {
              setStore(quickStore);
            }
          },
          (deepStore) => {
            if (isMounted && deepStore) {
              setStore(deepStore);
            }
          }
        ).then((finalStore) => {
          if (isMounted) {
            if (finalStore) {
              setStore(finalStore);
            }
            // Chỉ tắt chữ "Đang đồng bộ" màu đỏ sau khi đã quét xong Drive và nạp danh sách Tên tài liệu vào sổ xuống dropdown
            setSyncingLevel(null);
          }
        }).catch((err) => {
          console.warn('Lỗi khi lấy tên tài liệu từ Drive:', err);
          if (isMounted) setSyncingLevel(null);
        });
      } else {
        setSyncingLevel(null);
      }
      if (chuong) onChangeChuong('');
      if (bai) onChangeBai('');
      if (vanDe) onChangeVanDe('');
      if (chuyenDe) onChangeChuyenDe('');
    } else {
      if (docTitles.length === 1) {
        if (title !== docTitles[0]) onChangeTitle(docTitles[0]);
      } else if (docTitles.length > 1) {
        if (title && !docTitles.includes(title)) onChangeTitle('');
      } else {
        if (title) onChangeTitle('');
      }
    }
  }, [subject, grade, docTitles]);

  // Tự động chọn Chương: 1 tùy chọn -> chọn, >1 -> rỗng; đồng bộ Chương khi chọn Tài liệu
  const prevTitleRef = useRef(title);
  useEffect(() => {
    const titleChanged = prevTitleRef.current !== title;
    prevTitleRef.current = title;

    if (titleChanged) {
      if (title && title.trim() !== '') {
        setSyncingLevel('chuong');
        setTimeout(() => setSyncingLevel(null), 600);
      } else {
        setSyncingLevel(null);
      }
      if (chuongList.length === 1) {
        if (chuong !== chuongList[0]) onChangeChuong(chuongList[0]);
      } else {
        if (chuong) onChangeChuong('');
      }
      if (bai) onChangeBai('');
      if (vanDe) onChangeVanDe('');
      if (chuyenDe) onChangeChuyenDe('');
    } else {
      if (!title) {
        if (chuong) onChangeChuong('');
        return;
      }
      if (chuongList.length === 1) {
        if (chuong !== chuongList[0]) onChangeChuong(chuongList[0]);
      } else if (chuongList.length > 1) {
        if (chuong && !chuongList.includes(chuong)) onChangeChuong('');
      } else {
        if (chuong) onChangeChuong('');
      }
    }
  }, [title, chuongList]);

  // Tự động chọn Bài: 1 tùy chọn -> chọn, >1 -> rỗng
  const prevChuongRef = useRef(chuong);
  useEffect(() => {
    const chuongChanged = prevChuongRef.current !== chuong;
    prevChuongRef.current = chuong;

    if (chuongChanged) {
      if (baiList.length === 1) {
        if (bai !== baiList[0]) onChangeBai(baiList[0]);
      } else {
        if (bai) onChangeBai('');
      }
      if (vanDe) onChangeVanDe('');
      if (chuyenDe) onChangeChuyenDe('');
    } else {
      if (!chuong) {
        if (bai) onChangeBai('');
        return;
      }
      if (baiList.length === 1) {
        if (bai !== baiList[0]) onChangeBai(baiList[0]);
      } else if (baiList.length > 1) {
        if (bai && !baiList.includes(bai)) onChangeBai('');
      } else {
        if (bai) onChangeBai('');
      }
    }
  }, [chuong, baiList]);

  // Tự động chọn Vấn đề: 1 tùy chọn -> chọn, >1 -> rỗng
  const prevBaiRef = useRef(bai);
  useEffect(() => {
    const baiChanged = prevBaiRef.current !== bai;
    prevBaiRef.current = bai;

    if (baiChanged) {
      if (vanDeList.length === 1) {
        if (vanDe !== vanDeList[0]) onChangeVanDe(vanDeList[0]);
      } else {
        if (vanDe) onChangeVanDe('');
      }
      if (chuyenDe) onChangeChuyenDe('');
    } else {
      if (!bai) {
        if (vanDe) onChangeVanDe('');
        return;
      }
      if (vanDeList.length === 1) {
        if (vanDe !== vanDeList[0]) onChangeVanDe(vanDeList[0]);
      } else if (vanDeList.length > 1) {
        if (vanDe && !vanDeList.includes(vanDe)) onChangeVanDe('');
      } else {
        if (vanDe) onChangeVanDe('');
      }
    }
  }, [bai, vanDeList]);

  // Tự động chọn Chuyên đề: 1 tùy chọn -> chọn, >1 -> rỗng
  const prevVanDeRef = useRef(vanDe);
  useEffect(() => {
    const vanDeChanged = prevVanDeRef.current !== vanDe;
    prevVanDeRef.current = vanDe;

    if (vanDeChanged) {
      if (chuyenDeList.length === 1) {
        if (chuyenDe !== chuyenDeList[0]) onChangeChuyenDe(chuyenDeList[0]);
      } else {
        if (chuyenDe) onChangeChuyenDe('');
      }
    } else {
      if (!vanDe) {
        if (chuyenDe) onChangeChuyenDe('');
        return;
      }
      if (chuyenDeList.length === 1) {
        if (chuyenDe !== chuyenDeList[0]) onChangeChuyenDe(chuyenDeList[0]);
      } else if (chuyenDeList.length > 1) {
        if (chuyenDe && !chuyenDeList.includes(chuyenDe)) onChangeChuyenDe('');
      } else {
        if (chuyenDe) onChangeChuyenDe('');
      }
    }
  }, [vanDe, chuyenDeList]);

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
    setActiveLevel(level);
    setCustomInputValue('');
    setCustomAddType('standard');
    setModalErrorMessage(null);
    setModalOpen(true);
    setOpenDropdown(null);
  };

  // Xác nhận nhập ngoài danh sách: Thêm vào danh sách và CHỌN LUÔN NÓ (sau khi kiểm tra và tạo trên Drive)
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

    // 1. Xác định đường dẫn phân cấp trên Google Drive:
    // myApp / LopU / TaiLieu / [Tài liệu] / [Chương] / [Bài] / [Vấn đề] / [Chuyên đề]
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

    // Kiểm tra phiên kết nối Google Drive, nếu hết hạn hoặc chưa kết nối thì mở cửa sổ để đăng nhập kết nối lại
    const connState = getDriveConnectionState();
    if (!connState.isConnected) {
      const connRes = await connectGoogleDrive();
      if (!connRes.success) {
        setIsProcessing(false);
        setModalErrorMessage(connRes.message || 'Phiên kết nối Google Drive chưa được xác thực. Vui lòng kết nối lại.');
        return;
      }
    }

    // Kiểm tra xem thư mục tương ứng đã có bên drive chưa, nếu chưa có thì Tạo thư mục tương ứng
    let driveRes = await createDriveFolderIfNotExists(pathSegments);

    // Nếu gặp lỗi hết hạn 401 khi gọi API, tự động kích hoạt popup kết nối lại và thử lại
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

    // Sau khi nhận được thông báo đã có thư mục bên drive (mới tạo/có sẵn): thêm vào tùy chọn dropdown và chọn luôn nó
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

  // Trạng thái kết nối và đồng bộ với Google Drive
  const driveConn = getDriveConnectionState();

  // Helper component hiển thị Chỉ báo trạng thái Google Drive cạnh danh mục
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

  // Render một dropdown có nút xóa ở cuối mỗi tùy chọn và nút nhập ngoài
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
            <label className={`text-[11px] font-bold ${isHighlight ? 'text-indigo-800' : 'text-slate-700'}`}>
              {label}
            </label>
            {((isProcessing && activeLevel === level) || syncingLevel === level) && (
              <span className="text-red-600 font-bold text-[10px] ml-1 animate-pulse flex items-center gap-1">
                <RotateCcw className="w-2.5 h-2.5 text-red-600 animate-spin shrink-0" />
                <span>Đang đồng bộ</span>
              </span>
            )}
            {/* Chỉ báo trạng thái đồng bộ Drive cạnh nhãn danh mục */}
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

        {/* Trigger button */}
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
              {currentValue || <span className="text-slate-400 italic">-- Chọn hoặc nhấn Thêm --</span>}
            </span>
            <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Menu dropdown popover */}
          {isOpen && (
            <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto divide-y divide-slate-100 py-1">
              {/* Tùy chọn rỗng (Để trống) */}
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
                  <div>Chưa tìm thấy thư mục nào.</div>
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

              {/* Nút Thêm ở cuối dropdown (đổi tên từ + Nhập ngoài danh sách) */}
              <div
                onClick={() => openCustomModal(level)}
                className="px-3 py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-50 cursor-pointer flex items-center gap-1.5 border-t border-slate-100 bg-slate-50/50"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm</span>
              </div>
            </div>
          )}
        </div>

        {/* Thông báo tiến trình kiểm tra & thêm vào hệ thống ngay dưới dropdown */}
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

      {/* 1. TÀI LIỆU (BAO GỒM MÔN HỌC, KHỐI LỚP VÀ CHỌN TÀI LIỆU) */}
      <div className="bg-white p-4 rounded-2xl border border-indigo-200 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-100 pb-2">
          <span className="text-[11px] font-black uppercase text-indigo-900 tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-indigo-600" /> TÀI LIỆU
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleManualSyncFromDrive}
              disabled={isProcessing}
              title="Quét và đồng bộ lại danh mục thư mục thực tế từ Google Drive"
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className={`w-3 h-3 text-indigo-600 ${isProcessing ? 'animate-spin' : ''}`} />
              <span>Làm mới Drive</span>
            </button>
            <span className="text-[10px] text-indigo-600 font-semibold hidden sm:inline">Môn học + Khối lớp ➔ Tài liệu</span>
            {renderDriveStatusIndicator(true)}
          </div>
        </div>

        {/* Hàng 1 của nhóm Tài liệu: Môn học + Khối lớp (nếu có callback) */}
        {onChangeSubject && onChangeGrade && (
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-1">Môn học</label>
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
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold focus:outline-indigo-600 bg-white cursor-pointer"
              >
                <option value="">-- Chọn Môn học --</option>
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
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold focus:outline-indigo-600 bg-white cursor-pointer"
              >
                <option value="">-- Chọn Khối lớp --</option>
                <option value="Khối 10">Khối 10</option>
                <option value="Khối 11">Khối 11</option>
                <option value="Khối 12">Khối 12</option>
              </select>
            </div>
          </div>
        )}

        {/* Hàng tiếp theo của nhóm Tài liệu: Dropdown Tài liệu */}
        <div>
          {renderDropdown('title', 'TÀI LIỆU', title, docTitles, true)}
        </div>
      </div>

      {/* 2. NỘI DUNG BÀI DẠY: Chỉ hiện khi có tên tài liệu khác rỗng */}
      {title && title.trim() !== '' ? (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3.5 animate-fade-in">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
            <span className="text-[11px] font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
              <FolderTree className="w-3.5 h-3.5 text-slate-500" /> NỘI DUNG BÀI DẠY
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 italic hidden sm:inline">Chương ➔ Bài ➔ Vấn đề ➔ Chuyên đề</span>
              {renderDriveStatusIndicator(true)}
            </div>
          </div>

          {/* 4 Cấp độ: Khi chọn bài đánh giá thì ẩn các cấp độ con tương ứng */}
          {!isDanhGia(title) ? (
            <>
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
            </>
          ) : (
            <div className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-xl font-medium">
              ℹ️ Tài liệu là bài đánh giá — Đã ẩn toàn bộ các cấp con bên dưới.
            </div>
          )}

          {/* Live Preview Đường dẫn Drive */}
          <div className="pt-2 text-[10px] text-slate-500 font-mono border-t border-slate-100 flex items-center gap-1">
            <span className="font-bold text-indigo-600">Đường dẫn Drive:</span>
            <span className="truncate">
              myApp / LopU / TaiLieu / {title || '[Tên tài liệu]'} / {chuong || '[Tên chương]'} / {bai || '[Tên bài]'} / {vanDe || '[Tên vấn đề]'} / {chuyenDe || '[Tên chuyên đề]'}
            </span>
          </div>
        </div>
      ) : (
        <div className="p-3.5 bg-slate-50 border border-dashed border-slate-300 rounded-2xl text-center text-xs text-slate-500 font-medium">
          ℹ️ Vui lòng chọn hoặc thêm <strong>TÀI LIỆU</strong> ở trên để hiển thị <strong>NỘI DUNG BÀI DẠY</strong> (Chương, Bài, Vấn đề, Chuyên đề). Khi tên tài liệu để trống, các cấp độ con đều rỗng.
        </div>
      )}

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
                      e.preventDefault();
                      handleConfirmCustom();
                    }
                  }}
                  placeholder={`Nhập tên ${LEVEL_LABELS[activeLevel].toLowerCase()} mới...`}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-indigo-600 bg-white disabled:bg-slate-100 disabled:text-slate-400"
                />

                {/* Dòng chữ màu xanh hiển thị ngay bên dưới chỗ nhập tên thư mục mới trong cửa sổ Thêm vào tài liệu */}
                {isProcessing && (
                  <div className="mt-2 text-emerald-600 font-bold text-xs flex items-center gap-1.5 animate-pulse">
                    <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0 text-emerald-600" />
                    <span>⏳ Đang kiểm tra và thêm vào hệ thống. Vui lòng đợi...</span>
                  </div>
                )}

                {/* Thông báo nếu chưa thành công */}
                {modalErrorMessage && (
                  <div className="mt-2 p-2.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs font-bold flex flex-wrap items-center justify-between gap-2 shadow-xs">
                    <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                      <span>Tạo chưa thành công: {modalErrorMessage}</span>
                    </div>
                    {(modalErrorMessage.includes('401') || modalErrorMessage.includes('hết hạn') || modalErrorMessage.includes('Kết nối Drive') || modalErrorMessage.includes('chưa được xác thực')) && (
                      <button
                        type="button"
                        onClick={async () => {
                          const res = await connectGoogleDrive();
                          if (res.success) {
                            setModalErrorMessage(null);
                            handleConfirmCustom();
                          }
                        }}
                        className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-xs inline-flex items-center gap-1 shrink-0"
                      >
                        <Cloud className="w-3.5 h-3.5" />
                        <span>Kết nối Drive</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setModalOpen(false)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isProcessing || !customInputValue.trim()}
                onClick={handleConfirmCustom}
                className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
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
    </div>
  );
};
