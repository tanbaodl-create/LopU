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
  Layers,
  Lock,
  Unlock,
  Coins,
  Check,
} from 'lucide-react';
import { TeacherDocument, ClassItem } from '../../../services/storageTypes';
import { getClasses, getTeacherDocuments, saveTeacherDocument } from '../../ConnectData/ConnectFirestore';
import { saveTeachingMaterialHierarchyToDrive, getDriveConnectionState } from '../../ConnectData/ConnectDrive/googleDriveService';
import { HierarchySelector } from '../TaiLieuCaNhan/HierarchySelector';

export const SoanThaoView: React.FC = () => {
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
      if (conn.isConnected && conn.isRealConfigured) {
        successMsg = `Đã đồng bộ Drive & Lưu hệ thống thành công: ${cleanFileName} tại thư mục ${driveFolder}`;
      } else {
        successMsg = `Đã đồng bộ Drive (Sandbox) & Lưu hệ thống thành công: ${cleanFileName}`;
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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: TÀI LIỆU & CẤU HÌNH NỘI DUNG BÀI DẠY (Dropdown lồng nhau & nhập ngoài xác nhận) */}
        <div className="lg:col-span-4 space-y-4">
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

        {/* Right Column (Word Editor Page & Publish Controls) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Interactive Word Toolbar */}
          <div className="bg-slate-100 p-2.5 rounded-t-xl border border-slate-300 border-b-0 flex flex-wrap items-center gap-1">
            <button onClick={() => execCommand('bold')} className="p-1.5 rounded hover:bg-slate-200 text-slate-700 transition-colors" title="Chữ Đậm">
              <Bold className="w-4 h-4" />
            </button>
            <button onClick={() => execCommand('italic')} className="p-1.5 rounded hover:bg-slate-200 text-slate-700 transition-colors" title="Chữ Nghiêng">
              <Italic className="w-4 h-4" />
            </button>
            <button onClick={() => execCommand('underline')} className="p-1.5 rounded hover:bg-slate-200 text-slate-700 transition-colors" title="Gạch Chân">
              <Underline className="w-4 h-4" />
            </button>
            
            <div className="h-4 w-[1px] bg-slate-300 mx-1"></div>

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

            <div className="h-4 w-[1px] bg-slate-300 mx-1"></div>

            <button onClick={() => execCommand('insertUnorderedList')} className="p-1.5 rounded hover:bg-slate-200 text-slate-700 transition-colors" title="Danh sách không thứ tự">
              <List className="w-4 h-4" />
            </button>
            <button onClick={() => execCommand('insertOrderedList')} className="p-1.5 rounded hover:bg-slate-200 text-slate-700 transition-colors" title="Danh sách thứ tự">
              <ListOrdered className="w-4 h-4" />
            </button>

            <div className="h-4 w-[1px] bg-slate-300 mx-1"></div>

            {/* Custom Interactive Elements */}
            <button onClick={handleInsertTable} className="p-1.5 rounded hover:bg-indigo-100 text-indigo-700 bg-indigo-50/50 transition-colors flex items-center gap-1 text-[11px] font-bold" title="Chèn Bảng">
              <Table className="w-3.5 h-3.5" /> Chèn Bảng
            </button>
            <button onClick={handleInsertMath} className="p-1.5 rounded hover:bg-purple-100 text-purple-700 bg-purple-50/50 transition-colors flex items-center gap-1 text-[11px] font-bold" title="Chèn công thức toán LaTeX">
              <span className="font-mono text-[10px] font-black">f(x)</span> Toán LaTeX
            </button>

            <div className="h-4 w-[1px] bg-slate-300 mx-1"></div>

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

          {/* Simulated A4 Editable Canvas */}
          <div className="bg-slate-50 p-6 border border-slate-300 border-t-0 shadow-inner min-h-[500px]">
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              className="bg-white p-10 rounded-lg shadow-sm border border-slate-200 min-h-[440px] focus:outline-none focus:ring-1 focus:ring-indigo-500 overflow-y-auto prose max-w-none text-slate-800"
              style={{ fontSize: fontSize, lineHeight: '1.6' }}
            >
              <h1><strong>GIÁO ÁN TOÁN HỌC KHỐI 10</strong></h1>
              <p>Học sinh nhấn chọn <strong>mẫu nhanh ở cột trái</strong> hoặc trực tiếp soạn thảo nội dung giáo án dạng Word tại đây.</p>
            </div>
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
                <div className="flex flex-wrap gap-2 mt-2">
                  {classes.map(cls => {
                    const isSelected = selectedClasses.includes(cls.id);
                    return (
                      <button
                        key={cls.id}
                        onClick={() => toggleClassSelection(cls.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors flex items-center gap-1 ${
                          isSelected 
                            ? 'bg-indigo-600 border-indigo-700 text-white shadow-3xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                        <span>Lớp {cls.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Monetization details */}
              <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-3">
                <span className="text-[10px] font-bold text-slate-500 block">CẤU HÌNH THƯƠNG MẠI</span>
                
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">Mở bán tài liệu thu phí?</span>
                  <button
                    onClick={() => setIsForSale(!isForSale)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      isForSale ? 'bg-amber-600' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                        isForSale ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {isForSale && (
                  <div className="pt-2 animate-fade-in">
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">Mức giá (Kim Cương 💎)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        value={priceDiamonds}
                        onChange={(e) => setPriceDiamonds(Math.max(1, parseInt(e.target.value) || 0))}
                        className="w-24 px-3 py-1 rounded-lg border border-slate-200 text-xs font-bold text-amber-900 focus:outline-amber-600 font-mono"
                      />
                      <span className="text-xs text-slate-500 font-semibold">💎 (Phù hợp: 20 - 100 💎)</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ACTION BUTTONS: LIỀN MẠCH SOẠN - DẠY */}
            <div className="flex flex-wrap items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => handleSaveDocument(false)}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-black bg-slate-800 hover:bg-slate-900 text-white shadow-xs transition-colors cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>💾 CHỈ LƯU DRIVE & HỆ THỐNG</span>
              </button>

              <button
                onClick={() => handleSaveDocument(true)}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-colors cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>🚀 LƯU DRIVE & BẮT ĐẦU DẠY NGAY ➔</span>
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
