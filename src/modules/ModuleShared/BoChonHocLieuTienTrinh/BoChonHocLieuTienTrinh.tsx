import React, { useState } from 'react';
import {
  FolderLock,
  Maximize2,
  Minimize2,
  Edit3,
  Trash2,
  ChevronDown,
} from 'lucide-react';
import { BoChonHocLieuTienTrinhProps, TienTrinhType } from './types';
import { useHocLieuTienTrinh } from './useHocLieuTienTrinh';
import { HierarchySelector } from '../../ModuleGiaoVien/TaiLieuCaNhan/HierarchySelector';

export const BoChonHocLieuTienTrinh: React.FC<BoChonHocLieuTienTrinhProps> = ({
  value,
  onChange,
  onContentChange,
  mode = 'teacher',
  readOnly = false,
  defaultExpanded = true,
  className = '',
}) => {
  const isReadOnly = readOnly || mode === 'student';

  const {
    coordinate,
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
    setTienTrinh,
    availableTienTrinhList,
    subItemName,
    setSubItemName,
    customKienThucList,
    customLuyenTapList,
    customKtdgList,
    addCustomItem,
    renameCustomItem,
    deleteCustomItem,
    isHierarchyExpanded,
    setIsHierarchyExpanded,
    contentState,
  } = useHocLieuTienTrinh({
    initialCoordinate: value,
    defaultExpanded,
    autoLoadContent: true,
    onCoordinateChange: onChange,
    onContentLoaded: (content, coord) => {
      if (coord.chuyenDe) {
        setIsHierarchyExpanded(false);
      }
      if (onContentChange) {
        onContentChange(content.content, coord);
      }
    },
  });

  // Modal thao tác bài con (thêm / đổi tên / xóa)
  const [itemActionModal, setItemActionModal] = useState<{
    type: 'rename' | 'delete';
    category: 'kienThuc' | 'luyenTap' | 'ktdg';
    item: string;
    newName: string;
  } | null>(null);

  const handleConfirmItemAction = () => {
    if (!itemActionModal) return;
    const { type, category, item, newName } = itemActionModal;
    if (type === 'rename') {
      if (!item) {
        addCustomItem(category, newName);
      } else {
        renameCustomItem(category, item, newName);
      }
    } else if (type === 'delete') {
      deleteCustomItem(category, item);
    }
    setItemActionModal(null);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 1. THANH HEADER ĐIỀU HƯỚNG TIẾN TRÌNH (BỐ TRÍ CHUẨN XÁC THEO ẢNH MINH HỌA) */}
      <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-indigo-200/90 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-2.5 flex-1 min-w-[280px] flex-wrap">
          {/* Biểu tượng Thư mục */}
          <span
            className="p-1.5 sm:p-2 rounded-xl bg-indigo-50/80 border border-indigo-100 text-indigo-600 shrink-0 cursor-help flex items-center justify-center hover:bg-indigo-100 transition-colors"
            title="module BoChonHocLieuTienTrinh (Module dùng chung)"
          >
            <FolderLock className="w-4 h-4" />
          </span>

          {/* Dropdown Tiến Trình: Chỉ hiện các tiến trình có file trên Drive của giáo viên (+ Cải thiện) */}
          <div className="relative shrink-0">
            <select
              value={tienTrinh}
              onChange={(e) => setTienTrinh(e.target.value as TienTrinhType)}
              className="text-xs font-bold bg-white border border-indigo-200 rounded-xl pl-3 pr-7 py-1.5 text-indigo-950 shadow-2xs cursor-pointer focus:ring-2 focus:ring-indigo-500 hover:bg-indigo-50/50 transition-colors appearance-none"
              title="Chọn tiến trình"
            >
              {availableTienTrinhList.includes('Kiến thức') && (
                <option value="Kiến thức">📚 1. Kiến thức</option>
              )}
              {availableTienTrinhList.includes('Luyện tập') && (
                <option value="Luyện tập">✍️ 2. Luyện tập</option>
              )}
              {availableTienTrinhList.includes('KTDG') && (
                <option value="KTDG">🎯 3. KTDG</option>
              )}
              {availableTienTrinhList.includes('Cải thiện') && (
                <option value="Cải thiện">🚀 4. Cải thiện</option>
              )}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-indigo-900 absolute right-2 top-2.5 pointer-events-none" />
          </div>

          {/* Badge Chuyên đề: Hiển thị tên chuyên đề hoặc "Chưa chọn chuyên đề" màu đỏ */}
          <div className="shrink-0">
            {chuyenDe ? (
              <span
                className="font-black text-indigo-950 bg-indigo-50/80 px-3 py-1.5 rounded-xl border border-indigo-200 text-xs shadow-2xs block"
                title={`Chuyên đề: ${chuyenDe}`}
              >
                {chuyenDe}
              </span>
            ) : (
              <span
                className="font-bold text-rose-600 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200 text-xs shadow-2xs block animate-pulse"
                title="Chưa chọn chuyên đề từ cây phân cấp"
              >
                Chưa chọn chuyên đề
              </span>
            )}
          </div>

          {/* Dropdown và nút tương ứng với từng tiến trình */}
          {tienTrinh === 'Kiến thức' && (
            <>
              <div className="relative shrink-0 max-w-xs">
                <select
                  value={subItemName}
                  onChange={(e) => setSubItemName(e.target.value)}
                  className="text-xs font-bold bg-white border border-indigo-200 rounded-xl pl-3 pr-7 py-1.5 text-indigo-950 shadow-2xs cursor-pointer focus:ring-2 focus:ring-indigo-500 hover:bg-indigo-50/50 transition-colors appearance-none truncate"
                  title="Chọn bài kiến thức"
                >
                  {customKienThucList.length === 0 ? (
                    <option value="">(Trống)</option>
                  ) : (
                    customKienThucList.map((kt, idx) => (
                      <option key={`${kt}-${idx}`} value={kt}>
                        📚 {kt}
                      </option>
                    ))
                  )}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-indigo-900 absolute right-2 top-2.5 pointer-events-none" />
              </div>

              {!isReadOnly && mode === 'teacher' && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const defaultNew = `Kiến thức ${customKienThucList.length + 1}`;
                      setItemActionModal({
                        type: 'rename',
                        category: 'kienThuc',
                        item: '',
                        newName: defaultNew,
                      });
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 cursor-pointer shadow-2xs transition-colors shrink-0"
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
                        item: subItemName,
                        newName: subItemName,
                      });
                    }}
                    className="p-1.5 rounded-xl text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 cursor-pointer shadow-2xs transition-colors shrink-0"
                    title="Đổi tên bài kiến thức đang chọn"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  {customKienThucList.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        setItemActionModal({
                          type: 'delete',
                          category: 'kienThuc',
                          item: subItemName,
                          newName: '',
                        });
                      }}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 cursor-pointer shadow-2xs transition-colors shrink-0"
                      title="Xóa bài kiến thức này"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </>
              )}
            </>
          )}

          {tienTrinh === 'Luyện tập' && (
            <>
              <div className="relative shrink-0 max-w-xs">
                <select
                  value={subItemName}
                  onChange={(e) => setSubItemName(e.target.value)}
                  className="text-xs font-bold bg-white border border-indigo-200 rounded-xl pl-3 pr-7 py-1.5 text-indigo-950 shadow-2xs cursor-pointer focus:ring-2 focus:ring-indigo-500 hover:bg-indigo-50/50 transition-colors appearance-none truncate"
                  title="Chọn bài luyện tập"
                >
                  {customLuyenTapList.length === 0 ? (
                    <option value="">(Trống)</option>
                  ) : (
                    customLuyenTapList.map((ex, idx) => (
                      <option key={`${ex}-${idx}`} value={ex}>
                        ✍️ {ex}
                      </option>
                    ))
                  )}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-indigo-900 absolute right-2 top-2.5 pointer-events-none" />
              </div>

              {!isReadOnly && mode === 'teacher' && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const defaultNew = `Luyện tập ${customLuyenTapList.length + 1}`;
                      setItemActionModal({
                        type: 'rename',
                        category: 'luyenTap',
                        item: '',
                        newName: defaultNew,
                      });
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 cursor-pointer shadow-2xs transition-colors shrink-0"
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
                        item: subItemName,
                        newName: subItemName,
                      });
                    }}
                    className="p-1.5 rounded-xl text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 cursor-pointer shadow-2xs transition-colors shrink-0"
                    title="Đổi tên bài luyện tập này"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  {customLuyenTapList.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        setItemActionModal({
                          type: 'delete',
                          category: 'luyenTap',
                          item: subItemName,
                          newName: '',
                        });
                      }}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 cursor-pointer shadow-2xs transition-colors shrink-0"
                      title="Xóa bài luyện tập này"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </>
              )}
            </>
          )}

          {tienTrinh === 'KTDG' && (
            <>
              <div className="relative shrink-0 max-w-xs">
                <select
                  value={subItemName}
                  onChange={(e) => setSubItemName(e.target.value)}
                  className="text-xs font-bold bg-white border border-rose-200 rounded-xl pl-3 pr-7 py-1.5 text-rose-950 shadow-2xs cursor-pointer focus:ring-2 focus:ring-rose-500 hover:bg-rose-50/50 transition-colors appearance-none truncate"
                  title="Chọn đề kiểm tra đánh giá"
                >
                  {customKtdgList.length === 0 ? (
                    <option value="">(Trống)</option>
                  ) : (
                    customKtdgList.map((ktdg, idx) => (
                      <option key={`${ktdg}-${idx}`} value={ktdg}>
                        🎯 {ktdg}
                      </option>
                    ))
                  )}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-rose-900 absolute right-2 top-2.5 pointer-events-none" />
              </div>

              {!isReadOnly && mode === 'teacher' && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const defaultNew = `Đề kiểm tra ${customKtdgList.length + 1}`;
                      setItemActionModal({
                        type: 'rename',
                        category: 'ktdg',
                        item: '',
                        newName: defaultNew,
                      });
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 cursor-pointer shadow-2xs transition-colors shrink-0"
                    title="Thêm bài KTDG mới"
                  >
                    + Thêm đề
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setItemActionModal({
                        type: 'rename',
                        category: 'ktdg',
                        item: subItemName,
                        newName: subItemName,
                      });
                    }}
                    className="p-1.5 rounded-xl text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 cursor-pointer shadow-2xs transition-colors shrink-0"
                    title="Đổi tên đề KTDG này"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  {customKtdgList.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        setItemActionModal({
                          type: 'delete',
                          category: 'ktdg',
                          item: subItemName,
                          newName: '',
                        });
                      }}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 cursor-pointer shadow-2xs transition-colors shrink-0"
                      title="Xóa đề KTDG này"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </>
              )}
            </>
          )}

          {tienTrinh === 'Cải thiện' && (
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200 shrink-0 shadow-2xs">
              <span>🚀 Hồ sơ cải thiện học sinh (CaiThien.json)</span>
            </div>
          )}
        </div>

        {/* NÚT THU HẸP / MỞ RỘNG DUY NHẤT Ở CUỐI DÒNG (KHỚP HOÀN TOÀN ẢNH MINH HỌA) */}
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          <button
            type="button"
            onClick={() => setIsHierarchyExpanded(!isHierarchyExpanded)}
            className="border-2 border-slate-900 text-slate-900 bg-white hover:bg-slate-900 hover:text-white px-4 py-1.5 rounded-full font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 shadow-2xs"
            title={isHierarchyExpanded ? 'Đóng lại khung chọn cấu trúc' : 'Mở rộng để đổi chuyên đề'}
          >
            {isHierarchyExpanded ? (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                <span>Đóng lại</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Đổi chuyên đề</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. KHUNG CHI TIẾT 2 CỘT TÀI LIỆU & NỘI DUNG DẠY HỌC (CHỈ HIỂN THỊ KHI MỞ RỘNG - ẢNH 2) */}
      {isHierarchyExpanded && (
        <div className="animate-scale-up">
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
              if (cd) {
                setIsHierarchyExpanded(false);
              }
            }}
            subject={subject}
            onChangeSubject={setSubject}
            grade={grade}
            onChangeGrade={setGrade}
            readOnly={isReadOnly}
            mode={isReadOnly ? 'student' : mode}
          />
        </div>
      )}

      {/* Modal thao tác bài con (Thêm / Đổi Tên / Xóa) */}
      {itemActionModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-3.5 animate-scale-up">
            <h4 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
              {itemActionModal.type === 'rename'
                ? itemActionModal.item
                  ? '✏️ Đổi tên mục'
                  : '➕ Thêm mục mới'
                : '🗑️ Xóa mục'}
            </h4>

            {itemActionModal.type === 'rename' ? (
              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-slate-600 block">Tên hiển thị:</label>
                <input
                  type="text"
                  value={itemActionModal.newName}
                  onChange={(e) => setItemActionModal({ ...itemActionModal, newName: e.target.value })}
                  placeholder="Nhập tên..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  autoFocus
                />
              </div>
            ) : (
              <p className="text-xs text-slate-600">
                Bạn có chắc chắn muốn xóa mục <strong>"{itemActionModal.item}"</strong> không?
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setItemActionModal(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmItemAction}
                className={`px-3.5 py-1.5 text-xs font-bold text-white rounded-lg shadow-xs cursor-pointer ${
                  itemActionModal.type === 'delete' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {itemActionModal.type === 'delete' ? 'Xác nhận xóa' : 'Lưu lại'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
