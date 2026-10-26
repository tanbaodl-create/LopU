import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { HocLieuCoordinate, HocLieuContent, TienTrinhType } from './types';
import { loadChuyenDeContentFromDrive, isRealGoogleOAuthToken, deduplicateItemsBySlug } from '../../ConnectData/ConnectDrive/googleDriveService';

export function removeVietnameseTones(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

export function slugify(str: string): string {
  return removeVietnameseTones(str)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

export interface UseHocLieuTienTrinhOptions {
  initialCoordinate?: Partial<HocLieuCoordinate>;
  defaultExpanded?: boolean;
  autoLoadContent?: boolean;
  onCoordinateChange?: (coord: HocLieuCoordinate, content?: HocLieuContent) => void;
  onContentLoaded?: (content: HocLieuContent, coord: HocLieuCoordinate) => void;
}

export function useHocLieuTienTrinh(options: UseHocLieuTienTrinhOptions = {}) {
  const {
    initialCoordinate,
    defaultExpanded = true,
    autoLoadContent = true,
    onCoordinateChange,
    onContentLoaded,
  } = options;

  const onCoordinateChangeRef = useRef(onCoordinateChange);
  onCoordinateChangeRef.current = onCoordinateChange;

  const onContentLoadedRef = useRef(onContentLoaded);
  onContentLoadedRef.current = onContentLoaded;

  // 1. Tọa độ học liệu: Mặc định là rỗng để người dùng chọn từ đầu
  const [subject, setSubject] = useState<string>(initialCoordinate?.subject ?? '');
  const [grade, setGrade] = useState<string>(initialCoordinate?.grade ?? '');
  const [title, setTitle] = useState<string>(initialCoordinate?.title ?? '');
  const [chuong, setChuong] = useState<string>(initialCoordinate?.chuong ?? '');
  const [bai, setBai] = useState<string>(initialCoordinate?.bai ?? '');
  const [vanDe, setVanDe] = useState<string>(initialCoordinate?.vanDe ?? '');
  const [chuyenDe, setChuyenDe] = useState<string>(initialCoordinate?.chuyenDe ?? '');
  const [tienTrinh, setTienTrinh] = useState<TienTrinhType>(initialCoordinate?.tienTrinh || 'Kiến thức');
  const [subItemName, setSubItemName] = useState<string>(initialCoordinate?.subItemName ?? '');

  // Trạng thái thu gọn / mở rộng chi tiết phân cấp 2 cột (mặc định mở rộng để chọn)
  const [isHierarchyExpanded, setIsHierarchyExpanded] = useState<boolean>(defaultExpanded);

  // 2. Danh sách các bài con thực tế theo từng tiến trình: để rỗng mặc định nếu chưa có file thực tế từ Drive
  const [customKienThucList, setCustomKienThucList] = useState<string[]>([]);
  const [customLuyenTapList, setCustomLuyenTapList] = useState<string[]>([]);
  const [customKtdgList, setCustomKtdgList] = useState<string[]>([]);

  // Danh sách tiến trình khả dụng: Kiểm tra trên Drive có file tiến trình nào thì mới hiện tùy chọn đó (+ Cải thiện)
  const availableTienTrinhList = useMemo<TienTrinhType[]>(() => {
    if (!chuyenDe) {
      return ['Kiến thức', 'Luyện tập', 'KTDG', 'Cải thiện'];
    }
    const list: TienTrinhType[] = [];
    if (customKienThucList.length > 0) list.push('Kiến thức');
    if (customLuyenTapList.length > 0) list.push('Luyện tập');
    if (customKtdgList.length > 0) list.push('KTDG');
    // Nếu cả 3 danh sách đều rỗng (chưa tải xong từ Drive), giữ đủ tiến trình để không bị ép về Cải thiện
    if (list.length === 0) {
      return ['Kiến thức', 'Luyện tập', 'KTDG', 'Cải thiện'];
    }
    // Luôn bao gồm Cải thiện
    list.push('Cải thiện');
    return list;
  }, [chuyenDe, customKienThucList.length, customLuyenTapList.length, customKtdgList.length]);

  // Tự động chuyển tiến trình nếu tiến trình hiện tại không có trong danh sách khả dụng của Chuyên đề
  useEffect(() => {
    if (chuyenDe && availableTienTrinhList.length > 0 && !availableTienTrinhList.includes(tienTrinh)) {
      setTienTrinh(availableTienTrinhList[0]);
    }
  }, [chuyenDe, availableTienTrinhList, tienTrinh]);

  // 3. Trạng thái nội dung thực tế tải từ Google Drive / Local Storage
  const [contentState, setContentState] = useState<HocLieuContent>({
    fileName: '',
    fileType: 'html',
    content: '',
    isLoading: false,
    error: null,
  });

  // Xác định tên file chuẩn theo Drive:
  // - Kiến thức: KienThuc_{slug}.html
  // - Luyện tập: luyentap_{slug}.json
  // - KTDG: KTDG_{slug}.json
  // - Cải thiện: CaiThien.json
  const getExpectedFileName = useCallback(
    (tt: TienTrinhType, subName: string): { fileName: string; fileType: 'html' | 'json' } => {
      const s = slugify(subName || 'default');
      switch (tt) {
        case 'Kiến thức':
          return { fileName: `KienThuc_${s}.html`, fileType: 'html' };
        case 'Luyện tập':
          return { fileName: `luyentap_${s}.json`, fileType: 'json' };
        case 'KTDG':
          return { fileName: `KTDG_${s}.json`, fileType: 'json' };
        case 'Cải thiện':
          return { fileName: `CaiThien.json`, fileType: 'json' };
        default:
          return { fileName: `NoiDung.html`, fileType: 'html' };
      }
    },
    []
  );

  // Hàm tải nội dung thực tế từ Google Drive
  const loadActualContent = useCallback(
    async (_forceReload: boolean = false) => {
      if (!chuyenDe || !title) {
        setContentState((prev) => {
          if (!prev.fileName && !prev.content && !prev.isLoading && !prev.error) return prev;
          return {
            fileName: '',
            fileType: 'html',
            content: '',
            isLoading: false,
            error: null,
          };
        });
        setCustomKienThucList([]);
        setCustomLuyenTapList([]);
        setCustomKtdgList([]);
        return;
      }

      const driveSegments = ['myApp', 'LopU', 'TaiLieu', title, chuong, bai, vanDe, chuyenDe].filter(Boolean);
      const drivePathStr = driveSegments.join(' / ');

      setContentState((prev) => ({
        ...prev,
        isLoading: true,
        drivePath: drivePathStr,
        error: null,
      }));

      try {
        let fetchedContent = '';
        let loadedFileName = '';
        let loadedFileType: 'html' | 'json' = tienTrinh === 'Kiến thức' ? 'html' : 'json';
        let currentSub = subItemName;

        const res = await loadChuyenDeContentFromDrive({
          title,
          subject,
          grade,
          chuong,
          bai,
          vanDe,
          chuyenDe,
          tienTrinh,
          selectedKienThucName: tienTrinh === 'Kiến thức' ? subItemName : '',
          selectedExerciseName: tienTrinh !== 'Kiến thức' ? subItemName : '',
          firstDropdownItemName: subItemName,
          isStudent: false,
          allowInteractivePopup: true,
        });

        // 1. Cập nhật danh sách bài con thực tế tìm thấy trong thư mục trên Drive
        const ktFiles = [...(res.kienThucFiles || [])];
        const ltFiles = [...(res.luyenTapFiles || [])];
        const ktExamFiles = [...(res.ktdgFiles || [])];

        // Đồng bộ dữ liệu tệp Drive đã được nạp/lưu trong hệ thống (khớp 100% với phân hệ Tài liệu):
        if (ktFiles.length === 0 && chuyenDe) {
          const rawCd = chuyenDe.trim();
          const cleanCd = rawCd.replace(/^(?:Chuyên\s*đề|Chuyen\s*de)\s*:?\s*/i, '').trim();
          const cached = localStorage.getItem(`lopu_kienthuc_file_KienThuc_LyThuyetTrongTam.html_${rawCd}`)
            || localStorage.getItem(`lopu_kienthuc_file_KienThuc_LyThuyetTrongTam.html_${cleanCd}`)
            || localStorage.getItem(`lopu_kienthuc_${rawCd}`)
            || localStorage.getItem(`lopu_kienthuc_${cleanCd}`)
            || localStorage.getItem('lopu_drive_file_content_name_KienThuc_LyThuyetTrongTam.html');
          if (cached && cached.trim()) {
            ktFiles.push('Lý thuyết trọng tâm');
            if (!fetchedContent) {
              fetchedContent = cached;
              loadedFileName = 'KienThuc_LyThuyetTrongTam.html';
              loadedFileType = 'html';
            }
          }
        }

        const cleanKt = deduplicateItemsBySlug(ktFiles);
        const cleanLt = deduplicateItemsBySlug(ltFiles);
        const cleanKtdg = deduplicateItemsBySlug(ktExamFiles);

        setCustomKienThucList(cleanKt);
        setCustomLuyenTapList(cleanLt);
        setCustomKtdgList(cleanKtdg);

        // YÊU CẦU SƯ PHẠM: Khi đồng bộ xong 1 chuyên đề (sau khi chọn chuyên đề đồng bộ), không dừng lại ở 4. Cải thiện để hiển thị.
        // Ưu tiên là: Kiến thức --> Luyện tập --> Đánh giá (KTDG) --> Cải thiện (bao giờ phía trước không có mới chọn đến tiếp theo)
        let effectiveTienTrinh: TienTrinhType = tienTrinh;

        if (
          effectiveTienTrinh === 'Cải thiện' ||
          (effectiveTienTrinh === 'Kiến thức' && cleanKt.length === 0) ||
          (effectiveTienTrinh === 'Luyện tập' && cleanLt.length === 0) ||
          (effectiveTienTrinh === 'KTDG' && cleanKtdg.length === 0)
        ) {
          if (cleanKt.length > 0) {
            effectiveTienTrinh = 'Kiến thức';
          } else if (cleanLt.length > 0) {
            effectiveTienTrinh = 'Luyện tập';
          } else if (cleanKtdg.length > 0) {
            effectiveTienTrinh = 'KTDG';
          } else {
            effectiveTienTrinh = 'Cải thiện';
          }

          if (effectiveTienTrinh !== tienTrinh) {
            setTienTrinh(effectiveTienTrinh);
          }
        }

        // 2. Xác định danh sách tùy chọn cho tiến trình hiệu lực
        const activeList =
          effectiveTienTrinh === 'Kiến thức'
            ? cleanKt
            : effectiveTienTrinh === 'Luyện tập'
            ? cleanLt
            : effectiveTienTrinh === 'KTDG'
            ? cleanKtdg
            : [];

        if (!activeList.includes(currentSub)) {
          currentSub = activeList.length > 0 ? activeList[0] : '';
          setSubItemName(currentSub);
        }

        // 3. Nếu tiến trình được chuyển sang mục ưu tiên có bài (ví dụ từ Cải thiện sang Kiến thức),
        // và kết quả res ban đầu không phải của tiến trình này, ta nạp nội dung của bài ưu tiên mới:
        if (effectiveTienTrinh !== tienTrinh && currentSub) {
          try {
            const prioritizedRes = await loadChuyenDeContentFromDrive({
              title,
              subject,
              grade,
              chuong,
              bai,
              vanDe,
              chuyenDe,
              tienTrinh: effectiveTienTrinh,
              selectedKienThucName: effectiveTienTrinh === 'Kiến thức' ? currentSub : '',
              selectedExerciseName: effectiveTienTrinh !== 'Kiến thức' ? currentSub : '',
              firstDropdownItemName: currentSub,
              isStudent: false,
              allowInteractivePopup: false,
            });
            if (prioritizedRes.success && prioritizedRes.contentHtml) {
              fetchedContent = prioritizedRes.contentHtml;
              loadedFileName = prioritizedRes.loadedFile?.name || '';
              loadedFileType = effectiveTienTrinh === 'Kiến thức' ? 'html' : 'json';
            }
          } catch (pErr) {
            console.warn('Lỗi tải bài ưu tiên sau khi chuyển tiến trình:', pErr);
          }
        } else if ((res.success && res.contentHtml && res.contentHtml.trim() && currentSub) || (fetchedContent && currentSub)) {
          if (!fetchedContent) fetchedContent = res.contentHtml || '';
          if (!loadedFileName) loadedFileName = res.loadedFile?.name || '';
          if (loadedFileName.endsWith('.json') || effectiveTienTrinh !== 'Kiến thức') {
            loadedFileType = 'json';
          }
        }

        // TUYỆT ĐỐI KHÔNG TỰ TẠO NỘI DUNG MẪU / MOCK JSON NẾU DRIVE KHÔNG CÓ FILE!
        const loaded: HocLieuContent = {
          fileName: loadedFileName,
          fileType: loadedFileType,
          content: fetchedContent, // Sẽ là '' nếu không có file trên Drive
          isLoading: false,
          drivePath: drivePathStr,
          lastLoadedAt: Date.now(),
        };

        setContentState(loaded);
        if (onContentLoadedRef.current) {
          onContentLoadedRef.current(loaded, {
            subject,
            grade,
            title,
            chuong,
            bai,
            vanDe,
            chuyenDe,
            tienTrinh: effectiveTienTrinh,
            subItemName: currentSub,
          });
        }
      } catch (err: any) {
        setContentState((prev) => ({
          ...prev,
          content: '',
          isLoading: false,
          error: err?.message || 'Không tìm thấy file trên Google Drive',
        }));
      }
    },
    [chuyenDe, title, chuong, bai, vanDe, tienTrinh, subItemName, subject, grade]
  );

  // 4. Helper tạo key nhận diện tọa độ
  const getCoordKey = (c: Partial<HocLieuCoordinate>) =>
    `${c.subject || ''}|${c.grade || ''}|${c.title || ''}|${c.chuong || ''}|${c.bai || ''}|${c.vanDe || ''}|${c.chuyenDe || ''}|${c.tienTrinh || 'Kiến thức'}|${c.subItemName || ''}`;

  const lastEmittedKeyRef = useRef<string>(getCoordKey(initialCoordinate || {}));
  const lastReceivedKeyRef = useRef<string>(getCoordKey(initialCoordinate || {}));

  // Tự động tải nội dung khi thay đổi tọa độ (tránh vòng lặp vô tận)
  const lastLoadedCoordKeyRef = useRef<string>('');
  useEffect(() => {
    if (autoLoadContent && chuyenDe && title) {
      const coordKey = `${subject}|${grade}|${title}|${chuong}|${bai}|${vanDe}|${chuyenDe}|${tienTrinh}|${subItemName}`;
      if (coordKey !== lastLoadedCoordKeyRef.current) {
        lastLoadedCoordKeyRef.current = coordKey;
        loadActualContent(false);
      }
    }
  }, [chuyenDe, title, chuong, bai, vanDe, tienTrinh, subItemName, subject, grade, autoLoadContent, loadActualContent]);

  // Đồng bộ khi prop initialCoordinate từ component cha thay đổi (ngăn vòng lặp phản hồi)
  useEffect(() => {
    if (!initialCoordinate) return;
    const parentKey = getCoordKey(initialCoordinate);

    // Nếu giá trị từ component cha phản hồi lại đúng giá trị vừa emit ra, bỏ qua không setState
    if (parentKey === lastEmittedKeyRef.current) {
      lastReceivedKeyRef.current = parentKey;
      return;
    }

    if (parentKey !== lastReceivedKeyRef.current) {
      lastReceivedKeyRef.current = parentKey;
      lastEmittedKeyRef.current = parentKey;

      if (initialCoordinate.subject !== undefined) setSubject(initialCoordinate.subject);
      if (initialCoordinate.grade !== undefined) setGrade(initialCoordinate.grade);
      if (initialCoordinate.title !== undefined) setTitle(initialCoordinate.title);
      if (initialCoordinate.chuong !== undefined) setChuong(initialCoordinate.chuong);
      if (initialCoordinate.bai !== undefined) setBai(initialCoordinate.bai);
      if (initialCoordinate.vanDe !== undefined) setVanDe(initialCoordinate.vanDe);
      if (initialCoordinate.chuyenDe !== undefined) setChuyenDe(initialCoordinate.chuyenDe);
      if (initialCoordinate.tienTrinh !== undefined) setTienTrinh(initialCoordinate.tienTrinh);
      if (initialCoordinate.subItemName !== undefined) setSubItemName(initialCoordinate.subItemName);
    }
  }, [
    initialCoordinate?.subject,
    initialCoordinate?.grade,
    initialCoordinate?.title,
    initialCoordinate?.chuong,
    initialCoordinate?.bai,
    initialCoordinate?.vanDe,
    initialCoordinate?.chuyenDe,
    initialCoordinate?.tienTrinh,
    initialCoordinate?.subItemName,
  ]);

  // Thông báo khi tọa độ thay đổi (chỉ thông báo khi thực sự có thay đổi giá trị tọa độ)
  useEffect(() => {
    const currentKey = `${subject}|${grade}|${title}|${chuong}|${bai}|${vanDe}|${chuyenDe}|${tienTrinh}|${subItemName}`;
    if (currentKey !== lastEmittedKeyRef.current) {
      lastEmittedKeyRef.current = currentKey;
      lastReceivedKeyRef.current = currentKey;
      if (onCoordinateChangeRef.current) {
        onCoordinateChangeRef.current(
          {
            subject,
            grade,
            title,
            chuong,
            bai,
            vanDe,
            chuyenDe,
            tienTrinh,
            subItemName,
          },
          contentState
        );
      }
    }
  }, [subject, grade, title, chuong, bai, vanDe, chuyenDe, tienTrinh, subItemName]);

  // Thêm / Đổi tên / Xóa mục con theo tiến trình
  const addCustomItem = (cat: 'kienThuc' | 'luyenTap' | 'ktdg', name: string) => {
    const clean = name.trim();
    if (!clean) return;
    if (cat === 'kienThuc') {
      const updated = Array.from(new Set([clean, ...customKienThucList]));
      setCustomKienThucList(updated);
      localStorage.setItem('lopu_custom_kienthuc_list', JSON.stringify(updated));
      setSubItemName(clean);
    } else if (cat === 'luyenTap') {
      const updated = Array.from(new Set([clean, ...customLuyenTapList]));
      setCustomLuyenTapList(updated);
      localStorage.setItem('lopu_custom_luyentap_list', JSON.stringify(updated));
      setSubItemName(clean);
    } else if (cat === 'ktdg') {
      const updated = Array.from(new Set([clean, ...customKtdgList]));
      setCustomKtdgList(updated);
      localStorage.setItem('lopu_custom_ktdg_list', JSON.stringify(updated));
      setSubItemName(clean);
    }
  };

  const renameCustomItem = (cat: 'kienThuc' | 'luyenTap' | 'ktdg', oldName: string, newName: string) => {
    const clean = newName.trim();
    if (!clean) return;
    if (cat === 'kienThuc') {
      const updated = customKienThucList.map((x) => (x === oldName ? clean : x));
      setCustomKienThucList(updated);
      localStorage.setItem('lopu_custom_kienthuc_list', JSON.stringify(updated));
      if (subItemName === oldName) setSubItemName(clean);
    } else if (cat === 'luyenTap') {
      const updated = customLuyenTapList.map((x) => (x === oldName ? clean : x));
      setCustomLuyenTapList(updated);
      localStorage.setItem('lopu_custom_luyentap_list', JSON.stringify(updated));
      if (subItemName === oldName) setSubItemName(clean);
    } else if (cat === 'ktdg') {
      const updated = customKtdgList.map((x) => (x === oldName ? clean : x));
      setCustomKtdgList(updated);
      localStorage.setItem('lopu_custom_ktdg_list', JSON.stringify(updated));
      if (subItemName === oldName) setSubItemName(clean);
    }
  };

  const deleteCustomItem = (cat: 'kienThuc' | 'luyenTap' | 'ktdg', name: string) => {
    if (cat === 'kienThuc') {
      const updated = customKienThucList.filter((x) => x !== name);
      setCustomKienThucList(updated);
      localStorage.setItem('lopu_custom_kienthuc_list', JSON.stringify(updated));
      if (subItemName === name) setSubItemName(updated[0] || '');
    } else if (cat === 'luyenTap') {
      const updated = customLuyenTapList.filter((x) => x !== name);
      setCustomLuyenTapList(updated);
      localStorage.setItem('lopu_custom_luyentap_list', JSON.stringify(updated));
      if (subItemName === name) setSubItemName(updated[0] || '');
    } else if (cat === 'ktdg') {
      const updated = customKtdgList.filter((x) => x !== name);
      setCustomKtdgList(updated);
      localStorage.setItem('lopu_custom_ktdg_list', JSON.stringify(updated));
      if (subItemName === name) setSubItemName(updated[0] || '');
    }
  };

  // Đồng bộ subItemName khi chuyển tiến trình (để rỗng nếu không có file thực tế từ Drive)
  const handleTienTrinhChange = (newTienTrinh: TienTrinhType) => {
    setTienTrinh(newTienTrinh);
    if (newTienTrinh === 'Kiến thức') {
      setSubItemName(customKienThucList[0] || '');
    } else if (newTienTrinh === 'Luyện tập') {
      setSubItemName(customLuyenTapList[0] || '');
    } else if (newTienTrinh === 'KTDG') {
      setSubItemName(customKtdgList[0] || '');
    } else if (newTienTrinh === 'Cải thiện') {
      setSubItemName('Hồ sơ cải thiện học sinh');
    }
  };

  return {
    // State
    coordinate: {
      subject,
      grade,
      title,
      chuong,
      bai,
      vanDe,
      chuyenDe,
      tienTrinh,
      subItemName,
    },
    subject,
    setSubject,
    grade,
    setGrade,
    title,
    setTitle,
    chuong,
    setChuong,
    bai,
    setBai,
    vanDe,
    setVanDe,
    chuyenDe,
    setChuyenDe,
    tienTrinh,
    setTienTrinh: handleTienTrinhChange,
    subItemName,
    setSubItemName,

    // Lists
    availableTienTrinhList,
    customKienThucList,
    customLuyenTapList,
    customKtdgList,

    // Actions
    addCustomItem,
    renameCustomItem,
    deleteCustomItem,
    loadActualContent,

    // Expansion
    isHierarchyExpanded,
    setIsHierarchyExpanded,

    // Content
    contentState,
  };
}
