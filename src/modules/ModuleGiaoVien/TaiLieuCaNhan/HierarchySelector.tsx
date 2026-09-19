import React, { useState, useEffect, useRef } from 'react';
import { Layers, FolderTree, Plus, Check, ChevronDown, Trash2, X, AlertTriangle } from 'lucide-react';
import {
  HierarchyStore,
  getStoredHierarchy,
  saveStoredHierarchy,
} from './hierarchyData';
import { isDanhGia } from './TaiLieuCaNhanView';

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
  chuong: 'Cấp 1: Chương',
  bai: 'Cấp 2: Bài',
  vanDe: 'Cấp 3: Vấn đề',
  chuyenDe: 'Cấp 4: Chuyên đề',
};

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

  // Modal xác nhận xóa tùy chọn (thay thế window.confirm để chạy mượt trong iframe)
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<{
    level: HierarchyLevel;
    optVal: string;
  } | null>(null);

  // Quản lý trạng thái mở dropdown cho từng cấp độ
  const [openDropdown, setOpenDropdown] = useState<HierarchyLevel | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

  // 1. Danh sách TÀI LIỆU
  const docTitles = Object.keys(store);

  // 2. Danh sách Cấp 1: Chương (lồng theo TÀI LIỆU)
  const currentDocObj = store[title] || {};
  const chuongList = Object.keys(currentDocObj);

  // 3. Danh sách Cấp 2: Bài (lồng theo Chương)
  const currentChuongObj = currentDocObj[chuong] || {};
  const baiList = Object.keys(currentChuongObj);

  // 4. Danh sách Cấp 3: Vấn đề (lồng theo Bài)
  const currentBaiObj = currentChuongObj[bai] || {};
  const vanDeList = Object.keys(currentBaiObj);

  // 5. Danh sách Cấp 4: Chuyên đề (lồng theo Vấn đề)
  const chuyenDeList = currentBaiObj[vanDe] || [];

  const handleSelectLevel = (level: HierarchyLevel, value: string) => {
    setOpenDropdown(null);

    switch (level) {
      case 'title': {
        onChangeTitle(value);
        if (isDanhGia(value)) {
          onChangeChuong('');
          onChangeBai('');
          onChangeVanDe('');
          onChangeChuyenDe('');
          break;
        }
        const nextDoc = store[value] || {};
        const chList = Object.keys(nextDoc);
        if (chList.length > 0) {
          const firstCh = chList[0];
          onChangeChuong(firstCh);
          const nextCh = nextDoc[firstCh] || {};
          const bList = Object.keys(nextCh);
          if (bList.length > 0) {
            const firstB = bList[0];
            onChangeBai(firstB);
            const nextB = nextCh[firstB] || {};
            const vList = Object.keys(nextB);
            if (vList.length > 0) {
              const firstV = vList[0];
              onChangeVanDe(firstV);
              const cList = nextB[firstV] || [];
              onChangeChuyenDe(cList.length > 0 ? cList[0] : '');
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
        if (bList.length > 0) {
          const firstB = bList[0];
          onChangeBai(firstB);
          const nextB = nextCh[firstB] || {};
          const vList = Object.keys(nextB);
          if (vList.length > 0) {
            const firstV = vList[0];
            onChangeVanDe(firstV);
            const cList = nextB[firstV] || [];
            onChangeChuyenDe(cList.length > 0 ? cList[0] : '');
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
        if (vList.length > 0) {
          const firstV = vList[0];
          onChangeVanDe(firstV);
          const cList = nextB[firstV] || [];
          onChangeChuyenDe(cList.length > 0 ? cList[0] : '');
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
        if (cList.length > 0) {
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

  const openCustomModal = (level: HierarchyLevel) => {
    setActiveLevel(level);
    setCustomInputValue('');
    setModalOpen(true);
    setOpenDropdown(null);
  };

  // Xác nhận nhập ngoài danh sách: Thêm vào danh sách và CHỌN LUÔN NÓ
  const handleConfirmCustom = () => {
    const trimmed = customInputValue.trim();
    if (!trimmed) {
      alert('Vui lòng nhập nội dung hợp lệ!');
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
    setModalOpen(false);
    setConfirmNotice(`Đã thêm "${trimmed}" và chọn làm ${LEVEL_LABELS[activeLevel]}!`);
    setTimeout(() => setConfirmNotice(null), 3500);
  };

  // Mở modal xác nhận xóa tùy chọn khỏi dropdown (xóa cấp cha thì các cấp con phụ thuộc cũng bị xóa sạch)
  const handleDeleteOption = (level: HierarchyLevel, optVal: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setDeleteConfirmItem({ level, optVal });
    setOpenDropdown(null);
  };

  // Thực thi xóa tùy chọn sau khi người dùng xác nhận
  const executeDeleteOption = () => {
    if (!deleteConfirmItem) return;
    const { level, optVal } = deleteConfirmItem;

    const newStore = { ...store };

    if (level === 'title') {
      delete newStore[optVal];
      if (title === optVal) {
        onChangeTitle('');
        onChangeChuong('');
        onChangeBai('');
        onChangeVanDe('');
        onChangeChuyenDe('');
      }
    } else if (level === 'chuong') {
      if (newStore[title]) {
        delete newStore[title][optVal];
      }
      if (chuong === optVal) {
        onChangeChuong('');
        onChangeBai('');
        onChangeVanDe('');
        onChangeChuyenDe('');
      }
    } else if (level === 'bai') {
      if (newStore[title] && newStore[title][chuong]) {
        delete newStore[title][chuong][optVal];
      }
      if (bai === optVal) {
        onChangeBai('');
        onChangeVanDe('');
        onChangeChuyenDe('');
      }
    } else if (level === 'vanDe') {
      if (newStore[title] && newStore[title][chuong] && newStore[title][chuong][bai]) {
        delete newStore[title][chuong][bai][optVal];
      }
      if (vanDe === optVal) {
        onChangeVanDe('');
        onChangeChuyenDe('');
      }
    } else if (level === 'chuyenDe') {
      if (
        newStore[title] &&
        newStore[title][chuong] &&
        newStore[title][chuong][bai] &&
        newStore[title][chuong][bai][vanDe]
      ) {
        newStore[title][chuong][bai][vanDe] = newStore[title][chuong][bai][vanDe].filter(
          c => c !== optVal
        );
      }
      if (chuyenDe === optVal) {
        onChangeChuyenDe('');
      }
    }

    setStore(newStore);
    saveStoredHierarchy(newStore);
    setDeleteConfirmItem(null);
    setConfirmNotice(`Đã xóa "${optVal}" và các cấp con phụ thuộc thành công!`);
    setTimeout(() => setConfirmNotice(null), 3000);
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
          <label className={`text-[11px] font-bold ${isHighlight ? 'text-indigo-800' : 'text-slate-700'}`}>
            {label}
          </label>
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
                <div className="px-3 py-2 text-[11px] text-slate-400 italic text-center">
                  Chưa có tùy chọn nào. Hãy bấm "Thêm" bên dưới!
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
                    {/* Nút xóa ở cuối mỗi tùy chọn */}
                    <button
                      type="button"
                      title={`Xóa "${opt}" (và toàn bộ cấp con thuộc nó)`}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                      }}
                      onClick={(e) => handleDeleteOption(level, opt, e)}
                      className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
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

      {/* 1. TÀI LIỆU (ĐƯỢC ĐẶT LÊN TRÊN NỘI DUNG BÀI DẠY) */}
      <div className="bg-white p-4 rounded-2xl border border-indigo-200 shadow-xs space-y-2">
        {renderDropdown('title', 'TÀI LIỆU', title, docTitles, true)}
      </div>

      {/* 2. NỘI DUNG BÀI DẠY */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <span className="text-[11px] font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
            <FolderTree className="w-3.5 h-3.5 text-slate-500" /> NỘI DUNG BÀI DẠY
          </span>
          <span className="text-[10px] text-slate-400 italic">Dropdown lồng nhau & nút xóa</span>
        </div>

        {/* Tùy chọn Môn học & Khối lớp nếu có */}
        {onChangeSubject && onChangeGrade && (
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-1">Môn học</label>
              <select
                value={subject || 'Toán Học'}
                onChange={(e) => onChangeSubject(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold focus:outline-indigo-600 bg-white cursor-pointer"
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
                value={grade || 'Khối 10'}
                onChange={(e) => onChangeGrade(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold focus:outline-indigo-600 bg-white cursor-pointer"
              >
                <option value="Khối 10">Khối 10</option>
                <option value="Khối 11">Khối 11</option>
                <option value="Khối 12">Khối 12</option>
              </select>
            </div>
          </div>
        )}

        {/* 4 Cấp độ: Khi chọn bài đánh giá thì ẩn các cấp độ con tương ứng */}
        {!isDanhGia(title) ? (
          <>
            {renderDropdown('chuong', 'Cấp 1: Chương', chuong, chuongList)}
            {!isDanhGia(chuong) ? (
              <>
                {renderDropdown('bai', 'Cấp 2: Bài', bai, baiList)}
                {!isDanhGia(bai) ? (
                  <>
                    {renderDropdown('vanDe', 'Cấp 3: Vấn đề', vanDe, vanDeList)}
                    {!isDanhGia(vanDe) ? (
                      renderDropdown('chuyenDe', 'Cấp 4: Chuyên đề', chuyenDe, chuyenDeList)
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

      {/* POPUP / MODAL XÁC NHẬN NHẬP NGOÀI DANH SÁCH */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-800">
                Nhập Ngoài Danh Sách: {LEVEL_LABELS[activeLevel]}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-xs p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Nhập giá trị mới cho <strong>{LEVEL_LABELS[activeLevel]}</strong>. Sau khi xác nhận, hệ thống sẽ đưa vào danh sách tùy chọn và <strong>chọn luôn nó</strong>.
            </p>

            <div>
              <input
                type="text"
                autoFocus
                value={customInputValue}
                onChange={(e) => setCustomInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleConfirmCustom();
                  }
                }}
                placeholder={`Nhập tên ${LEVEL_LABELS[activeLevel]} mới...`}
                className="w-full px-3 py-2 rounded-xl border border-indigo-200 text-xs font-semibold focus:outline-indigo-600 bg-slate-50/50"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmCustom}
                className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" /> Xác nhận & Chọn luôn
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP / MODAL XÁC NHẬN XÓA TÙY CHỌN (KHÔNG DÙNG WINDOW.CONFIRM ĐỂ TRÁNH BỊ CHẶN TRÊN IFRAME) */}
      {deleteConfirmItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-rose-100 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 text-rose-600">
                <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    Xác nhận xóa tùy chọn
                  </h3>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {LEVEL_LABELS[deleteConfirmItem.level]}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeleteConfirmItem(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-xs p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-slate-600">
              <p>
                Bạn có chắc chắn muốn xóa tùy chọn <strong className="text-slate-900 font-bold">"{deleteConfirmItem.optVal}"</strong> khỏi danh sách không?
              </p>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px] leading-relaxed">
                ⚠️ <strong>Lưu ý:</strong> Khi bạn xác nhận xóa tùy chọn này, <strong>toàn bộ các tùy chọn ở các dropdown con phụ thuộc bên dưới cũng sẽ được xóa bỏ hoàn toàn</strong>.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteConfirmItem(null)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={executeDeleteOption}
                className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xác nhận xóa</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
