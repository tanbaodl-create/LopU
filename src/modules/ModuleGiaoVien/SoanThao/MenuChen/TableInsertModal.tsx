/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Table, Check, X } from 'lucide-react';
import { TableInsertModalProps } from './types';

export const TableInsertModal: React.FC<TableInsertModalProps> = ({
  isOpen,
  onClose,
  onInsertTable,
  initialRows = 3,
  initialCols = 3,
  initialHasHeader = true,
}) => {
  const [rows, setRows] = useState<number>(initialRows);
  const [cols, setCols] = useState<number>(initialCols);
  const [hasHeader, setHasHeader] = useState<boolean>(initialHasHeader);
  const [theme, setTheme] = useState<'slate' | 'indigo' | 'emerald'>('slate');

  if (!isOpen) return null;

  const handleConfirm = () => {
    const r = Math.max(1, Math.min(rows || 3, 50));
    const c = Math.max(1, Math.min(cols || 3, 20));

    let headerBg = '#f1f5f9';
    let headerColor = '#0f172a';
    let borderColor = '#94a3b8';
    let stripeBg = '#f8fafc';

    if (theme === 'indigo') {
      headerBg = '#e0e7ff';
      headerColor = '#312e81';
      borderColor = '#818cf8';
      stripeBg = '#f5f7ff';
    } else if (theme === 'emerald') {
      headerBg = '#d1fae5';
      headerColor = '#064e3b';
      borderColor = '#34d399';
      stripeBg = '#f0fdf4';
    }

    let tableHtml = `<table style="width: 100%; border-collapse: collapse; border: 2px solid ${borderColor}; margin: 16px 0; font-size: 14px; background: #ffffff;">`;

    if (hasHeader) {
      tableHtml += `<thead style="background-color: ${headerBg};"><tr style="background-color: ${headerBg};">`;
      for (let j = 0; j < c; j++) {
        tableHtml += `<th style="border: 1px solid ${borderColor}; padding: 10px 14px; font-weight: bold; text-align: center; color: ${headerColor}; min-width: 80px;">Tiêu đề ${j + 1}</th>`;
      }
      tableHtml += `</tr></thead>`;
    }

    tableHtml += `<tbody>`;
    for (let i = 0; i < r; i++) {
      const bg = i % 2 === 1 ? `background-color: ${stripeBg};` : 'background-color: #ffffff;';
      tableHtml += `<tr style="${bg}">`;
      for (let j = 0; j < c; j++) {
        tableHtml += `<td style="border: 1px solid #cbd5e1; padding: 10px 14px; min-width: 80px; color: #334155; vertical-align: top;">&nbsp;</td>`;
      }
      tableHtml += `</tr>`;
    }
    tableHtml += `</tbody></table><p><br></p>`;

    onInsertTable(tableHtml);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
              <Table className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-900">Chèn Bảng Vào Trang Soạn Thảo</h4>
              <p className="text-[11px] text-slate-500">Cấu hình số dòng, số cột và định dạng hàng tiêu đề</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Đóng cửa sổ"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-3.5 py-1">
          {/* Quick grid choices */}
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1.5">
              Kích thước nhanh phổ biến:
            </label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { r: 2, c: 2, label: '2 x 2' },
                { r: 3, c: 3, label: '3 x 3' },
                { r: 4, c: 3, label: '4 x 3' },
                { r: 5, c: 4, label: '5 x 4' },
                { r: 6, c: 5, label: '6 x 5' },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
                    setRows(item.r);
                    setCols(item.c);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                    rows === item.r && cols === item.c
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-bold shadow-2xs'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Row & Col Inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Số dòng (Hàng):
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={rows}
                onChange={(e) => setRows(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50 text-slate-900"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Tối thiểu: 1, tối đa: 50</span>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Số cột:
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={cols}
                onChange={(e) => setCols(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50 text-slate-900"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Tối thiểu: 1, tối đa: 20</span>
            </div>
          </div>

          {/* Header row toggle */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={hasHeader}
                onChange={(e) => setHasHeader(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
              />
              <div>
                <span className="text-xs font-bold text-slate-800 block">Có hàng tiêu đề (Header row)</span>
                <span className="text-[10px] text-slate-500 block">Hàng đầu tiên được in đậm nổi bật và có nền phân cách</span>
              </div>
            </label>
          </div>

          {/* Theme selector */}
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1.5">
              Kiểu bảng:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTheme('slate')}
                className={`p-2 rounded-xl border text-center text-xs font-bold transition-all cursor-pointer ${
                  theme === 'slate'
                    ? 'border-slate-500 bg-slate-100 text-slate-800 ring-2 ring-slate-400/30'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Tiêu chuẩn (Xám)
              </button>
              <button
                type="button"
                onClick={() => setTheme('indigo')}
                className={`p-2 rounded-xl border text-center text-xs font-bold transition-all cursor-pointer ${
                  theme === 'indigo'
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-800 ring-2 ring-indigo-400/30'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Hiện đại (Indigo)
              </button>
              <button
                type="button"
                onClick={() => setTheme('emerald')}
                className={`p-2 rounded-xl border text-center text-xs font-bold transition-all cursor-pointer ${
                  theme === 'emerald'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-400/30'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Sư phạm (Xanh lá)
              </button>
            </div>
          </div>

          {/* Mini preview */}
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/70 text-[11px]">
            <div className="text-slate-500 font-bold mb-1.5">Xem trước cấu trúc:</div>
            <div className="border border-slate-300 rounded overflow-hidden max-h-24 overflow-y-auto">
              <table className="w-full text-[10px] text-center border-collapse">
                {hasHeader && (
                  <thead>
                    <tr className={theme === 'indigo' ? 'bg-indigo-100 text-indigo-900' : theme === 'emerald' ? 'bg-emerald-100 text-emerald-900' : 'bg-slate-200 text-slate-800'}>
                      {Array.from({ length: Math.min(cols, 6) }).map((_, idx) => (
                        <th key={idx} className="border border-slate-300 p-1 font-bold">
                          Cột {idx + 1}
                        </th>
                      ))}
                      {cols > 6 && <th className="border border-slate-300 p-1">...</th>}
                    </tr>
                  </thead>
                )}
                <tbody>
                  {Array.from({ length: Math.min(rows, 4) }).map((_, rIdx) => (
                    <tr key={rIdx} className={rIdx % 2 === 1 ? 'bg-slate-50' : 'bg-white'}>
                      {Array.from({ length: Math.min(cols, 6) }).map((_, cIdx) => (
                        <td key={cIdx} className="border border-slate-200 p-1 text-slate-400">
                          {rIdx + 1},{cIdx + 1}
                        </td>
                      ))}
                      {cols > 6 && <td className="border border-slate-200 p-1 text-slate-400">...</td>}
                    </tr>
                  ))}
                  {rows > 4 && (
                    <tr>
                      <td colSpan={Math.min(cols, 6) + (cols > 6 ? 1 : 0)} className="p-1 text-slate-400 text-center italic">
                        ... và {rows - 4} dòng khác
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Chèn Bảng ({rows}x{cols})</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
