/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  X,
  Mail,
  Send,
  Camera,
  Upload,
  FileText,
  CheckCircle,
  Download,
  RotateCw,
  Trash2,
  ExternalLink,
  BookOpen,
} from 'lucide-react';
import { PptSlideItem, PptWhiteboardData } from '../../ModuleGiaoDien/modulePPT';
import { auth } from '../../../config/firebase';
import { UserProfile } from '../../../services/storageTypes';

interface ModalGuiBaiChoGiaoVienProps {
  isOpen: boolean;
  onClose: () => void;
  docTitle: string;
  chuong?: string;
  defaultTeacherName?: string;
  defaultTeacherEmail?: string;
  activeSlideIndex: number;
  activeStepIndex: number;
  totalSlides: number;
  slides: PptSlideItem[];
  whiteboards: PptWhiteboardData[];
}

interface CapturedItem {
  id: string;
  name: string;
  file?: File;
  previewUrl: string;
  rotation: number;
}

export const ModalGuiBaiChoGiaoVien: React.FC<ModalGuiBaiChoGiaoVienProps> = ({
  isOpen,
  onClose,
  docTitle,
  chuong,
  defaultTeacherName,
  defaultTeacherEmail,
  activeSlideIndex,
  activeStepIndex,
  totalSlides,
  slides,
  whiteboards,
}) => {
  if (!isOpen) return null;

  // Lấy tên học sinh hiện tại
  const getStudentInfo = (): { name: string; email: string } => {
    try {
      const profileStr = localStorage.getItem('currentUserProfile');
      if (profileStr) {
        const p = JSON.parse(profileStr);
        if (p?.name || p?.email) {
          return { name: p.name || p.nickname || 'Học sinh', email: p.email || '' };
        }
      }
    } catch {}

    const email = auth?.currentUser?.email || localStorage.getItem('lopu_auth_email') || '';
    const name = auth?.currentUser?.displayName || email.split('@')[0] || 'Học sinh';
    return { name, email };
  };

  const studentInfo = getStudentInfo();
  const [teacherEmail, setTeacherEmail] = useState<string>(
    defaultTeacherEmail || 'tanbaodl@gmail.com'
  );
  const [teacherName] = useState<string>(
    defaultTeacherName || 'Giáo viên phụ trách'
  );

  const [activeTab, setActiveTab] = useState<'baihoc' | 'bailam'>('baihoc');
  const [capturedItems, setCapturedItems] = useState<CapturedItem[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const cleanDocTitle = (docTitle || 'Bai_hoc').trim();
  const currentSlideNum = activeSlideIndex + 1;

  // ==========================================
  // 1. TÙY CHỌN 1: TẠO FILE PDF BÀI HỌC VÀ GỬI
  // ==========================================
  const handleTaoPdfVaGuiBaiHoc = () => {
    setIsProcessing(true);
    setSuccessMessage(null);

    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Trình duyệt đã chặn cửa sổ bật lên. Vui lòng cho phép popup để tạo PDF bài học!');
        setIsProcessing(false);
        return;
      }

      // Lọc các slide từ đầu (Slide 0) đến slide hiện tại (activeSlideIndex)
      const targetSlides = (slides || []).slice(0, activeSlideIndex + 1);

      let slidesHtml = '';
      targetSlides.forEach((slide, sIdx) => {
        const isCurrentSlide = sIdx === activeSlideIndex;
        // Slide hiện tại chỉ lấy đến step hiện tại
        const stepsToRender = isCurrentSlide
          ? (slide.steps || []).slice(0, activeStepIndex + 1)
          : (slide.steps || []);

        // Whiteboards của slide này
        const slideBoards = (whiteboards || []).filter(
          (b) => b.slideIndex === sIdx && (!isCurrentSlide || (b.afterStepIndex !== undefined && b.afterStepIndex <= activeStepIndex))
        );

        slidesHtml += `
          <div class="slide-page-box" style="page-break-after: always; padding: 24px; border: 1.5px solid #e2e8f0; border-radius: 12px; margin-bottom: 28px; background: #fff;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #4f46e5; padding-bottom: 8px; margin-bottom: 16px;">
              <span style="font-weight: 800; color: #312e81; font-size: 14pt;">Slide ${sIdx + 1}: ${slide.title || 'Nội dung bài học'}</span>
              <span style="font-size: 10pt; color: #64748b; font-style: italic;">${chuong || cleanDocTitle}</span>
            </div>
            
            <div class="slide-content-body" style="font-size: 13pt; line-height: 1.6; color: #1e293b;">
              ${stepsToRender.join('<hr style="border: none; border-top: 1px dashed #cbd5e1; margin: 14px 0;" />')}
            </div>

            ${
              slideBoards.length > 0
                ? `
              <div style="margin-top: 20px; padding: 12px; background: #f8fafc; border: 1.5px dashed #6366f1; border-radius: 8px;">
                <div style="font-weight: bold; font-size: 11pt; color: #4338ca; margin-bottom: 8px;">
                  ✏️ Phần ghi chép / khoảng trống tương tác (${slideBoards.length} phần):
                </div>
                ${slideBoards
                  .map((b, bIdx) => `
                    <div style="margin-bottom: 8px; font-size: 10.5pt; color: #334155;">
                      <strong>#${bIdx + 1}</strong> (Độ cao: ${b.height || 280}px): ${b.textNote || 'Đã ghi chép / vẽ trực tiếp trên bảng'}
                    </div>
                  `)
                  .join('')}
              </div>
            `
                : ''
            }

            <div style="margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 8px; font-size: 9pt; color: #94a3b8; display: flex; justify-content: space-between;">
              <span>Tài liệu: ${cleanDocTitle}</span>
              <span>Trang ${sIdx + 1} / ${targetSlides.length}</span>
            </div>
          </div>
        `;
      });

      const fileName = `BaiHoc_${cleanDocTitle}_Slide1_den_${currentSlideNum}.pdf`;

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${fileName}</title>
            <meta charset="utf-8" />
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
            <style>
              @page {
                size: A4 portrait;
                margin: 1.8cm 1.8cm 1.8cm 1.8cm;
                @bottom-right {
                  content: "Trang " counter(page);
                  font-size: 9pt;
                  color: #64748b;
                }
              }
              body {
                font-family: 'Times New Roman', Times, serif;
                color: #0f172a;
                background: #fff;
                margin: 0;
                padding: 10px;
              }
              .doc-header-banner {
                text-align: center;
                border-bottom: 2.5px solid #1e1b4b;
                padding-bottom: 14px;
                margin-bottom: 24px;
              }
              .doc-title {
                font-size: 18pt;
                font-weight: bold;
                text-transform: uppercase;
                color: #1e1b4b;
                margin: 0 0 6px 0;
              }
              .doc-meta {
                font-size: 11pt;
                color: #475569;
                font-style: italic;
              }
              @media print {
                body { padding: 0; }
                .slide-page-box { border: none !important; box-shadow: none !important; }
              }
            </style>
          </head>
          <body>
            <div class="doc-header-banner">
              <h1 class="doc-title">${cleanDocTitle}</h1>
              <div class="doc-meta">
                <span>Chương: <strong>${chuong || 'Toán học'}</strong></span> &nbsp;•&nbsp;
                <span>Phạm vi: <strong>Slide 1 đến Slide ${currentSlideNum} (Tổng ${targetSlides.length} slide)</strong></span> &nbsp;•&nbsp;
                <span>Học sinh: <strong>${studentInfo.name}</strong></span>
              </div>
            </div>

            ${slidesHtml}

            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.print();
                }, 300);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();

      // Mở Gmail gửi tới giáo viên
      const emailSubject = encodeURIComponent(
        `[LopU] Bài học: ${cleanDocTitle} (Slide 1 - ${currentSlideNum}) - Học sinh: ${studentInfo.name}`
      );
      const emailBody = encodeURIComponent(
        `Kính gửi thầy/cô ${teacherName},\n\n` +
          `Em gửi file PDF nội dung bài học "${cleanDocTitle}" đã học từ đầu đến Slide ${currentSlideNum}.\n\n` +
          `• Học sinh: ${studentInfo.name} (${studentInfo.email || 'Học sinh LopU'})\n` +
          `• Thời gian: ${new Date().toLocaleString('vi-VN')}\n` +
          `• File đính kèm: ${fileName} (vừa được tạo và tải về máy)\n\n` +
          `Em cảm ơn thầy/cô!`
      );

      const gmailComposeUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
        teacherEmail
      )}&su=${emailSubject}&body=${emailBody}`;

      setTimeout(() => {
        window.open(gmailComposeUrl, '_blank');
      }, 500);

      setSuccessMessage(
        `✅ Đã mở cửa sổ in PDF bài học (${fileName}) và chuyển hướng tới Gmail gửi thầy/cô (${teacherEmail})!`
      );
    } catch (err: any) {
      alert('Có lỗi khi tạo PDF bài học: ' + err?.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // ==========================================
  // 2. TÙY CHỌN 2: CHỤP ẢNH / CHỌN FILE BÀI LÀM
  // ==========================================
  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newItems: CapturedItem[] = files.map((file, idx) => ({
      id: `item-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
      name: file.name,
      file,
      previewUrl: URL.createObjectURL(file),
      rotation: 0,
    }));

    setCapturedItems((prev) => [...prev, ...newItems]);
    e.target.value = '';
  };

  const handleRotateItem = (id: string) => {
    setCapturedItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, rotation: (it.rotation + 90) % 360 } : it))
    );
  };

  const handleDeleteItem = (id: string) => {
    setCapturedItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleGuiBaiLamQuaGmail = () => {
    if (capturedItems.length === 0) {
      alert('Vui lòng chụp ảnh hoặc chọn ít nhất 1 trang bài làm trước khi gửi!');
      return;
    }

    setIsProcessing(true);
    try {
      // Mở cửa sổ in ghép các ảnh bài làm thành file PDF hoàn chỉnh
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        const pagesHtml = capturedItems
          .map(
            (item, idx) => `
          <div style="page-break-after: always; text-align: center; margin-bottom: 20px; padding: 10px;">
            <div style="font-weight: bold; font-size: 13pt; margin-bottom: 10px; color: #334155;">
              Trang ${idx + 1} / ${capturedItems.length} - ${item.name}
            </div>
            <img 
              src="${item.previewUrl}" 
              style="max-width: 95%; max-height: 85vh; object-fit: contain; transform: rotate(${item.rotation}deg); border: 1px solid #cbd5e1; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);" 
            />
          </div>
        `
          )
          .join('');

        const fileName = `BaiLam_${cleanDocTitle}_${studentInfo.name}_${Date.now()}.pdf`;

        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>${fileName}</title>
              <meta charset="utf-8" />
              <style>
                @page { size: A4 portrait; margin: 1.5cm; }
                body { font-family: 'Times New Roman', serif; margin: 0; padding: 10px; }
                .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
              </style>
            </head>
            <body>
              <div class="header">
                <h2 style="margin: 0 0 5px 0; text-transform: uppercase;">Bài Làm Của Học Sinh</h2>
                <div style="font-size: 11pt; color: #444;">
                  Học sinh: <strong>${studentInfo.name}</strong> • Bài học: <strong>${cleanDocTitle}</strong> • Ngày nộp: ${new Date().toLocaleDateString('vi-VN')}
                </div>
              </div>
              ${pagesHtml}
              <script>
                window.onload = function() {
                  setTimeout(function() { window.print(); }, 300);
                };
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
      }

      // Mở Gmail compose
      const emailSubject = encodeURIComponent(
        `[LopU] Nộp bài làm: ${cleanDocTitle} - Học sinh: ${studentInfo.name}`
      );
      const emailBody = encodeURIComponent(
        `Kính gửi thầy/cô ${teacherName},\n\n` +
          `Em nộp bài làm môn ${chuong || 'Toán học'} - bài "${cleanDocTitle}".\n` +
          `Số lượng trang bài làm đã chụp: ${capturedItems.length} trang.\n\n` +
          `• Học sinh: ${studentInfo.name} (${studentInfo.email || 'LopU'})\n` +
          `• Thời gian nộp: ${new Date().toLocaleString('vi-VN')}\n\n` +
          `Em đã tải file bài làm về máy và đính kèm vào thư này.\n` +
          `Em cảm ơn thầy/cô!`
      );

      const gmailComposeUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
        teacherEmail
      )}&su=${emailSubject}&body=${emailBody}`;

      setTimeout(() => {
        window.open(gmailComposeUrl, '_blank');
      }, 500);

      setSuccessMessage(
        `✅ Đã ghép ${capturedItems.length} trang bài làm và mở Gmail gửi tới ${teacherEmail}!`
      );
    } catch (err: any) {
      alert('Có lỗi khi gửi bài làm: ' + err?.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      {/* Ẩn inputs chọn file và camera */}
      <input
        type="file"
        ref={cameraInputRef}
        accept="image/*"
        capture="environment"
        onChange={handleFilesSelected}
        className="hidden"
      />
      <input
        type="file"
        ref={fileInputRef}
        multiple
        accept="image/*,.pdf,.doc,.docx"
        onChange={handleFilesSelected}
        className="hidden"
      />

      <div
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-950 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-xs border border-white/20">
              <Send className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <h3 className="font-extrabold text-base leading-tight">Gửi bài cho giáo viên</h3>
              <p className="text-[11px] text-indigo-200 mt-0.5">
                Bài học: <span className="font-semibold text-white">{cleanDocTitle}</span> • Slide {currentSlideNum}/{totalSlides}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Thông tin giáo viên nhận bài */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-slate-700">
            <span className="text-slate-400">Giáo viên phụ trách:</span>
            <strong className="text-slate-900">{teacherName}</strong>
          </div>
          <div className="flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-indigo-600" />
            <span className="text-slate-400">Email nhận:</span>
            <input
              type="email"
              value={teacherEmail}
              onChange={(e) => setTeacherEmail(e.target.value)}
              className="px-2 py-0.5 bg-white border border-slate-300 rounded-md font-mono text-indigo-700 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 max-w-[200px]"
              title="Email giáo viên nhận bài (tự động điền theo thông tin lớp học)"
            />
          </div>
        </div>

        {/* Thanh chọn 2 tùy chọn: Gửi bài học / Gửi bài làm */}
        <div className="flex border-b border-slate-200 bg-slate-100/80 p-1.5 gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('baihoc')}
            className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'baihoc'
                ? 'bg-white text-indigo-900 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:bg-white/50'
            }`}
          >
            <BookOpen className="w-4 h-4 text-indigo-600" />
            <span>1. Gửi bài học (Slide 1 → {currentSlideNum})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('bailam')}
            className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'bailam'
                ? 'bg-white text-indigo-900 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:bg-white/50'
            }`}
          >
            <FileText className="w-4 h-4 text-emerald-600" />
            <span>2. Gửi bài làm (Chụp ảnh / Chọn file)</span>
            {capturedItems.length > 0 && (
              <span className="px-1.5 py-0.2 bg-emerald-600 text-white rounded-full text-[10px] font-extrabold">
                {capturedItems.length}
              </span>
            )}
          </button>
        </div>

        {/* Nội dung tương ứng của từng tùy chọn */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {successMessage && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-900 text-xs font-semibold flex items-start gap-2.5 shadow-2xs animate-fadeIn">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{successMessage}</div>
            </div>
          )}

          {activeTab === 'baihoc' ? (
            /* TAB 1: GỬI BÀI HỌC */
            <div className="space-y-4">
              <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-2">
                <h4 className="font-extrabold text-sm text-indigo-950 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-indigo-600" />
                  <span>Nội dung bài học sẽ được xuất thành file PDF:</span>
                </h4>
                <ul className="text-xs text-indigo-900/90 space-y-1 list-disc list-inside">
                  <li>
                    Phạm vi: <strong>Slide 1 đến Slide {currentSlideNum}</strong> (Hiện tại).
                  </li>
                  <li>Bao gồm: Toàn bộ chữ, công thức Toán học KaTeX, hình vẽ, bảng biến thiên và đồ thị.</li>
                  <li>
                    Các ghi chép tương tác: <strong>{whiteboards.length} khoảng trống/ghi chú</strong> đã chèn.
                  </li>
                  <li>Học sinh nộp bài: <strong>{studentInfo.name}</strong>.</li>
                </ul>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-600 space-y-1.5">
                <div className="font-bold text-slate-800">Quy trình tự động khi bấm nút:</div>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-[10px]">
                    1
                  </span>
                  <span>Tự động kết xuất file PDF bài học định dạng chuẩn A4 sạch đẹp.</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-[10px]">
                    2
                  </span>
                  <span>
                    Mở sẵn cửa sổ thư Gmail điền sẵn địa chỉ giáo viên (<strong>{teacherEmail}</strong>) và tiêu đề.
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleTaoPdfVaGuiBaiHoc}
                disabled={isProcessing}
                className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm shadow-lg hover:shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>{isProcessing ? 'Đang tạo PDF bài học...' : 'Tạo PDF bài học & Mở Gmail gửi thầy/cô'}</span>
                <ExternalLink className="w-4 h-4 ml-1 opacity-70" />
              </button>
            </div>
          ) : (
            /* TAB 2: GỬI BÀI LÀM (CHỤP ẢNH HOẶC CHỌN FILE) */
            <div className="space-y-4">
              {/* Hai nút nạp bài: Camera & Chọn file */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="p-4 bg-emerald-50 hover:bg-emerald-100/80 border-2 border-dashed border-emerald-300 hover:border-emerald-500 rounded-2xl transition-all cursor-pointer flex flex-col items-center justify-center gap-2 text-emerald-950 group"
                >
                  <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                    <Camera className="w-5 h-5" />
                  </div>
                  <span className="font-extrabold text-xs">📷 Chụp ảnh bằng máy ảnh</span>
                  <span className="text-[10px] text-emerald-700/80">Chụp trực tiếp các trang vở bài làm</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-4 bg-indigo-50 hover:bg-indigo-100/80 border-2 border-dashed border-indigo-300 hover:border-indigo-500 rounded-2xl transition-all cursor-pointer flex flex-col items-center justify-center gap-2 text-indigo-950 group"
                >
                  <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                    <Upload className="w-5 h-5" />
                  </div>
                  <span className="font-extrabold text-xs">📁 Chọn file từ thiết bị</span>
                  <span className="text-[10px] text-indigo-700/80">Chọn ảnh hoặc file PDF có sẵn trên máy</span>
                </button>
              </div>

              {/* Danh sách trang bài làm đã chụp */}
              {capturedItems.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>
                      Các trang bài làm đã chụp/chọn ({capturedItems.length} trang):
                    </span>
                    <button
                      type="button"
                      onClick={() => setCapturedItems([])}
                      className="text-rose-600 hover:underline text-[11px] font-semibold cursor-pointer"
                    >
                      Xóa tất cả
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-56 overflow-y-auto p-1">
                    {capturedItems.map((item, idx) => (
                      <div
                        key={item.id}
                        className="relative bg-slate-100 border border-slate-300 rounded-xl p-2 flex flex-col items-center gap-1.5 shadow-2xs group"
                      >
                        <div className="w-full h-28 bg-white rounded-lg overflow-hidden flex items-center justify-center border border-slate-200 relative">
                          <img
                            src={item.previewUrl}
                            alt={item.name}
                            className="max-w-full max-h-full object-contain transition-transform"
                            style={{ transform: `rotate(${item.rotation}deg)` }}
                          />
                        </div>
                        <div className="w-full flex items-center justify-between text-[11px]">
                          <span className="font-bold text-slate-800 truncate">Trang {idx + 1}</span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleRotateItem(item.id)}
                              className="p-1 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors cursor-pointer"
                              title="Xoay ảnh 90 độ"
                            >
                              <RotateCw className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-1 rounded bg-rose-100 hover:bg-rose-200 text-rose-700 transition-colors cursor-pointer"
                              title="Xóa trang này"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleGuiBaiLamQuaGmail}
                    disabled={isProcessing}
                    className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-sm shadow-lg hover:shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 mt-3"
                  >
                    <Send className="w-4 h-4" />
                    <span>
                      {isProcessing
                        ? 'Đang xử lý bài làm...'
                        : `Gửi ${capturedItems.length} trang bài làm qua Gmail cho giáo viên`}
                    </span>
                    <ExternalLink className="w-4 h-4 ml-1 opacity-70" />
                  </button>
                </div>
              ) : (
                <div className="text-center py-6 border border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs">
                  Chưa có trang bài làm nào được chụp hoặc chọn. Hãy bấm nút máy ảnh ở trên để chụp!
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Modal */}
        <div className="px-6 py-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            Học sinh: <strong className="text-slate-800">{studentInfo.name}</strong>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
