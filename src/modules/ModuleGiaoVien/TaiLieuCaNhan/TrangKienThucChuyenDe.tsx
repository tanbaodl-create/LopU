import React, { useState, useEffect, useRef } from 'react';
import {
  BookOpen,
  Cloud,
  FileCode,
  Image as ImageIcon,
  Music,
  Video as VideoIcon,
  Upload,
  Download,
  RotateCcw,
  Maximize2,
  Minimize2,
  CheckCircle2,
  AlertCircle,
  Folder,
  Layers,
  Sparkles,
  ExternalLink,
  Save,
  Play,
  Pause,
  ZoomIn,
  ZoomOut,
  FolderArchive,
  Eye,
  Edit3,
  FileUp,
  X,
  FileText
} from 'lucide-react';
import {
  saveKienThucHtmlToDrive,
  fetchKienThucHtmlFromDrive,
  saveMediaFilesToChuyenDeDrive,
  getDriveConnectionState,
  connectGoogleDrive,
  MediaFileItem
} from '../../ConnectData/ConnectDrive/googleDriveService';

export interface TrangKienThucChuyenDeProps {
  subject?: string;
  grade?: string;
  title: string;
  chuong: string;
  bai: string;
  vanDe: string;
  chuyenDe: string;
  onOpenWordEditor?: (contentHtml?: string) => void;
  onSelectTienTrinh?: (step: 'kienThuc' | 'luyenTap' | 'kiemTra' | 'caiThien') => void;
}

export const TrangKienThucChuyenDe: React.FC<TrangKienThucChuyenDeProps> = ({
  subject = 'Toán Học',
  grade = 'Khối 10',
  title,
  chuong,
  bai,
  vanDe,
  chuyenDe,
  onOpenWordEditor,
  onSelectTienTrinh
}) => {
  // Danh sách các phân đoạn thư mục trên Drive của Giáo viên:
  // myApp / LopU / TaiLieu / [Tên tài liệu] / [Chương] / [Bài] / [Vấn đề] / [Chuyên đề]
  const physicalFolders = [
    'myApp',
    'LopU',
    'TaiLieu',
    title || 'TaiLieuChung',
    chuong || 'Chuong1',
    bai || 'Bai1',
    vanDe || 'VanDe1',
    chuyenDe || 'ChuyenDe1'
  ];

  const driveFolderPath = physicalFolders.join(' / ');

  // Trạng thái nội dung bài giảng KienThuc.html
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'code' | 'media'>('preview');
  const [mediaSubTab, setMediaSubTab] = useState<'HinhAnh' | 'AmThanh' | 'Video'>('HinhAnh');
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Danh sách tệp đa phương tiện trong thư mục chuyên đề
  const [imagesList, setImagesList] = useState<MediaFileItem[]>([]);
  const [audiosList, setAudiosList] = useState<MediaFileItem[]>([]);
  const [videosList, setVideosList] = useState<MediaFileItem[]>([]);

  // Tùy chỉnh hiển thị iframe
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // File upload input refs
  const htmlFileInputRef = useRef<HTMLInputElement>(null);
  const elearningFolderInputRef = useRef<HTMLInputElement>(null);
  const mediaImageInputRef = useRef<HTMLInputElement>(null);
  const mediaAudioInputRef = useRef<HTMLInputElement>(null);
  const mediaVideoInputRef = useRef<HTMLInputElement>(null);

  // Bản đồ URL bộ nhớ tạm cho đường dẫn tương đối (Relative Path Virtual Resolver)
  const [virtualBlobMap, setVirtualBlobMap] = useState<Record<string, string>>({});

  // Sinh nội dung bài giảng mẫu chuẩn sư phạm (nếu chưa có file KienThuc.html trên Drive)
  const getSampleKienThucHtml = (): string => {
    return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>1. Kiến thức - ${chuyenDe || 'Chuyên đề học tập'}</title>
  <style>
    :root {
      --primary: #4338ca;
      --primary-light: #eef2ff;
      --text: #0f172a;
      --bg: #ffffff;
      --border: #e2e8f0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.7;
      color: var(--text);
      background-color: var(--bg);
      margin: 0;
      padding: 24px;
    }
    .header-box {
      background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%);
      border: 1.5px solid #c7d2fe;
      border-radius: 14px;
      padding: 20px 24px;
      margin-bottom: 24px;
    }
    .header-box h1 {
      color: #312e81;
      margin: 0 0 8px 0;
      font-size: 22px;
      font-weight: 800;
    }
    .breadcrumb {
      font-size: 13px;
      color: #4f46e5;
      font-weight: 600;
    }
    .section-title {
      font-size: 18px;
      font-weight: 700;
      color: #1e1b4b;
      border-left: 4px solid var(--primary);
      padding-left: 10px;
      margin: 28px 0 16px 0;
    }
    .theory-card {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      padding: 16px 20px;
      margin-bottom: 16px;
    }
    .theory-card h3 {
      margin-top: 0;
      color: #3730a3;
      font-size: 15px;
    }
    .formula-box {
      background: #ffffff;
      border: 1px dashed #6366f1;
      padding: 12px 16px;
      border-radius: 8px;
      margin: 12px 0;
      font-family: "Cambria Math", "Times New Roman", serif;
      font-size: 17px;
      color: #1e1b4b;
      display: inline-block;
    }
    .media-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 16px;
      margin: 20px 0;
    }
    .media-card {
      background: #ffffff;
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 14px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .media-card h4 {
      margin: 0 0 10px 0;
      font-size: 13px;
      color: #475569;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .media-card img {
      width: 100%;
      height: auto;
      max-height: 220px;
      object-fit: cover;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      background: #f1f5f9;
    }
    audio, video {
      width: 100%;
      border-radius: 8px;
    }
    .note-box {
      background-color: #fefce8;
      border: 1px solid #fef08a;
      border-radius: 8px;
      padding: 12px 16px;
      font-size: 13px;
      color: #854d0e;
      margin-top: 16px;
    }
  </style>
</head>
<body>
  <div class="header-box">
    <div class="breadcrumb">Tài liệu: ${title || 'Toán 10'} &rsaquo; ${chuong || 'Chương 1'} &rsaquo; ${bai || 'Bài 1'} &rsaquo; ${vanDe || 'Vấn đề 1'}</div>
    <h1>1. Kiến Thức Trọng Tâm: ${chuyenDe || 'Chuyên đề'}</h1>
    <div style="font-size: 12px; color: #64748b;">
      📁 Đường dẫn thư mục Drive: <code>${driveFolderPath}</code>
    </div>
  </div>

  <div class="section-title">I. Lý Thuyết & Khái Niệm Cốt Lõi</div>
  <div class="theory-card">
    <h3>1. Khái niệm và Định nghĩa</h3>
    <p>Nội dung lý thuyết trọng tâm của chuyên đề được đúc kết ngắn gọn, súc tích, làm nền tảng vững chắc cho quá trình tự học và luyện tập của học sinh.</p>
    <div class="formula-box">
      <strong>Công thức tổng quát:</strong> f(x) = a x&sup2; + b x + c &nbsp; (với a &ne; 0)
    </div>
    <p>Học sinh cần nắm vững các bước biến đổi cơ bản và điều kiện xác định của biểu thức toán học trước khi bước vào các dạng toán vận dụng.</p>
  </div>

  <div class="theory-card">
    <h3>2. Định lý và Tính chất then chốt</h3>
    <ul>
      <li><strong>Tính chất 1:</strong> Tính chất đồng biến và nghịch biến trên từng khoảng xác định.</li>
      <li><strong>Tính chất 2:</strong> Giá trị lớn nhất, giá trị nhỏ nhất và các điểm cực trị đặc trưng.</li>
      <li><strong>Hệ quả:</strong> Ứng dụng giải quyết các bài toán tối ưu thực tiễn đời sống.</li>
    </ul>
  </div>

  <div class="section-title">II. Tài Nguyên Đa Phương Tiện Minh Họa</div>
  <p style="font-size: 13px; color: #64748b;">
    Các tệp tài nguyên bên dưới được liên kết theo đường dẫn tương đối trực tiếp từ thư mục chuyên đề:
    <code>HinhAnh/</code>, <code>AmThanh/</code>, <code>Video/</code>.
  </p>

  <div class="media-grid">
    <!-- Thư mục HinhAnh -->
    <div class="media-card">
      <h4>📷 Hình ảnh minh họa (Đường dẫn: <code>HinhAnh/hinh1.png</code>)</h4>
      <img src="HinhAnh/hinh1.png" alt="Hình ảnh minh họa chuyên đề" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=600&q=80';">
      <div style="font-size: 11px; color: #64748b; margin-top: 6px;">Đồ thị và hình vẽ trực quan của chuyên đề</div>
    </div>

    <!-- Thư mục AmThanh -->
    <div class="media-card">
      <h4>🎵 Âm thanh bài giảng (Đường dẫn: <code>AmThanh/audio1.mp3</code>)</h4>
      <audio controls>
        <source src="AmThanh/audio1.mp3" type="audio/mpeg">
        Trình duyệt không hỗ trợ phát âm thanh.
      </audio>
      <div style="font-size: 11px; color: #64748b; margin-top: 6px;">Lời giảng tóm tắt và hướng dẫn giải</div>
    </div>

    <!-- Thư mục Video -->
    <div class="media-card">
      <h4>🎬 Video bài giảng (Đường dẫn: <code>Video/video1.mp4</code>)</h4>
      <video controls poster="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80">
        <source src="Video/video1.mp4" type="video/mp4">
        Trình duyệt không hỗ trợ phát video.
      </video>
      <div style="font-size: 11px; color: #64748b; margin-top: 6px;">Bài giảng ghi hình e-learning tương tác</div>
    </div>
  </div>

  <div class="note-box">
    <strong>💡 Hướng dẫn giáo viên:</strong> Bạn có thể bấm nút <strong>"Tải lên E-Learning"</strong> để đưa toàn bộ bài giảng đóng gói từ phần mềm (iSpring, Storyline...) lên thư mục này. File <code>index.html</code> sẽ tự động được đổi tên thành <code>KienThuc.html</code> và các đường dẫn tương đối được bảo toàn 100%.
  </div>
</body>
</html>`;
  };

  // Nạp dữ liệu file KienThuc.html khi mở chuyên đề
  useEffect(() => {
    async function loadContent() {
      setIsLoading(true);
      try {
        const res = await fetchKienThucHtmlFromDrive(physicalFolders);
        if (res.success && res.content && res.content.trim()) {
          setHtmlContent(res.content);
        } else {
          // Kiểm tra bộ nhớ đệm trước khi dùng mẫu mặc định
          const cached = localStorage.getItem(`lopu_kienthuc_${chuyenDe}`)
            || localStorage.getItem(`lopu_kienthuc_file_KienThuc_LyThuyetTrongTam.html_${chuyenDe}`)
            || localStorage.getItem('lopu_drive_file_content_name_KienThuc_LyThuyetTrongTam.html');
          if (cached && cached.trim()) {
            setHtmlContent(cached);
          } else {
            // Nạp mẫu nếu chưa có trên Drive
            const sample = getSampleKienThucHtml();
            setHtmlContent(sample);
          }
        }
      } catch (err) {
        console.warn('Dùng mẫu kiến thức mặc định do chưa nạp được Drive:', err);
        const cached = localStorage.getItem(`lopu_kienthuc_${chuyenDe}`)
          || localStorage.getItem(`lopu_kienthuc_file_KienThuc_LyThuyetTrongTam.html_${chuyenDe}`)
          || localStorage.getItem('lopu_drive_file_content_name_KienThuc_LyThuyetTrongTam.html');
        if (cached && cached.trim()) {
          setHtmlContent(cached);
        } else {
          setHtmlContent(getSampleKienThucHtml());
        }
      } finally {
        setIsLoading(false);
      }
    }
    loadContent();
  }, [title, chuong, bai, vanDe, chuyenDe]);

  // Cập nhật iframe khi htmlContent hoặc virtualBlobMap thay đổi
  useEffect(() => {
    if (!iframeRef.current || activeTab !== 'preview') return;

    // Phân giải đường dẫn tương đối (Relative Path Virtual Resolver)
    let processedHtml = htmlContent;

    // Thay thế đường dẫn HinhAnh/, AmThanh/, Video/ sang blob URL nếu có file tải lên
    Object.entries(virtualBlobMap).forEach(([relativePath, blobUrl]) => {
      const regex = new RegExp(`(src|href)=["'](\\./)?${relativePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`, 'gi');
      processedHtml = processedHtml.replace(regex, `$1="${blobUrl}"`);
    });

    const doc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(processedHtml);
      doc.close();
    }
  }, [htmlContent, virtualBlobMap, activeTab]);

  // Lưu file KienThuc.html lên Google Drive
  const handleSaveToDrive = async () => {
    setIsSaving(true);
    setNotification({ text: 'Đang lưu file KienThuc.html lên Google Drive của Giáo viên...', type: 'info' });
    try {
      const allMedia = [...imagesList, ...audiosList, ...videosList];
      const res = await saveKienThucHtmlToDrive(physicalFolders, htmlContent, allMedia, 'KienThuc.html');
      if (res.success) {
        setNotification({
          text: `Đã lưu file KienThuc.html và cấu trúc HinhAnh, AmThanh, Video lên Drive thành công!`,
          type: 'success',
        });
      } else {
        setNotification({
          text: `Lưu Drive thất bại: ${res.error}`,
          type: 'error',
        });
      }
    } catch (err: any) {
      setNotification({
        text: `Lỗi: ${err.message || 'Không thể lưu lên Google Drive'}`,
        type: 'error',
      });
    } finally {
      setIsSaving(false);
      setTimeout(() => setNotification(null), 5000);
    }
  };

  // Tải lên file KienThuc.html riêng lẻ
  const handleHtmlFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setHtmlContent(text);
        setNotification({
          text: `Đã nạp file "${file.name}" (Tự động nhận diện KienThuc.html). Bấm "Lưu Drive" để hoàn tất.`,
          type: 'success',
        });
        setTimeout(() => setNotification(null), 4000);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Tải lên gói bài giảng E-Learning (thư mục chứa index.html -> đổi tên thành KienThuc.html)
  const handleElearningPackageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    let foundHtml = false;
    const newBlobMap: Record<string, string> = {};
    const newImages: MediaFileItem[] = [];
    const newAudios: MediaFileItem[] = [];
    const newVideos: MediaFileItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const relativePath = file.webkitRelativePath || file.name;
      const lowerName = file.name.toLowerCase();

      // Tạo Blob URL cho từng tài nguyên để phân giải đường dẫn tương đối tức thì
      const blobUrl = URL.createObjectURL(file);
      newBlobMap[relativePath] = blobUrl;
      newBlobMap[file.name] = blobUrl;

      // Phân loại tệp vào HinhAnh, AmThanh, Video
      if (/\.(jpe?g|png|gif|svg|webp)$/i.test(lowerName)) {
        newImages.push({
          id: `img-${Date.now()}-${i}`,
          name: file.name,
          type: 'image',
          size: `${Math.round(file.size / 1024)} KB`,
          url: blobUrl,
          blob: file,
        });
        newBlobMap[`HinhAnh/${file.name}`] = blobUrl;
      } else if (/\.(mp3|wav|ogg|m4a|aac)$/i.test(lowerName)) {
        newAudios.push({
          id: `aud-${Date.now()}-${i}`,
          name: file.name,
          type: 'audio',
          size: `${Math.round(file.size / 1024)} KB`,
          url: blobUrl,
          blob: file,
        });
        newBlobMap[`AmThanh/${file.name}`] = blobUrl;
      } else if (/\.(mp4|webm|mov|mkv)$/i.test(lowerName)) {
        newVideos.push({
          id: `vid-${Date.now()}-${i}`,
          name: file.name,
          type: 'video',
          size: `${Math.round(file.size / 1024)} KB`,
          url: blobUrl,
          blob: file,
        });
        newBlobMap[`Video/${file.name}`] = blobUrl;
      }

      // Nhận diện file HTML chính (index.html hoặc KienThuc.html)
      if (lowerName === 'index.html' || lowerName === 'index.htm' || lowerName === 'kienthuc.html') {
        foundHtml = true;
        const reader = new FileReader();
        reader.onload = (ev) => {
          const htmlText = ev.target?.result as string;
          if (htmlText) {
            setHtmlContent(htmlText);
            setNotification({
              text: `Đã nạp gói E-learning: Tự động đổi tên "${file.name}" ➔ "KienThuc.html" và giữ nguyên toàn bộ đường dẫn tương đối.`,
              type: 'success',
            });
            setTimeout(() => setNotification(null), 5000);
          }
        };
        reader.readAsText(file);
      }
    }

    setVirtualBlobMap(prev => ({ ...prev, ...newBlobMap }));
    if (newImages.length) setImagesList(prev => [...prev, ...newImages]);
    if (newAudios.length) setAudiosList(prev => [...prev, ...newAudios]);
    if (newVideos.length) setVideosList(prev => [...prev, ...newVideos]);

    if (!foundHtml) {
      setNotification({
        text: 'Đã nhận các tệp trong gói E-learning. Không tìm thấy file index.html để tự động chuyển thành KienThuc.html.',
        type: 'info',
      });
      setTimeout(() => setNotification(null), 4000);
    }

    e.target.value = '';
  };

  // Tải lên tệp Media riêng lẻ vào HinhAnh / AmThanh / Video
  const handleSingleMediaUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'image' | 'audio' | 'video'
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const subFolder = type === 'image' ? 'HinhAnh' : type === 'audio' ? 'AmThanh' : 'Video';
    const newItems: MediaFileItem[] = [];
    const newBlobMap: Record<string, string> = {};

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const blobUrl = URL.createObjectURL(file);
      const item: MediaFileItem = {
        id: `${type}-${Date.now()}-${i}`,
        name: file.name,
        type: type,
        size: `${Math.round(file.size / 1024)} KB`,
        url: blobUrl,
        blob: file,
      };
      newItems.push(item);
      newBlobMap[`${subFolder}/${file.name}`] = blobUrl;
      newBlobMap[file.name] = blobUrl;
    }

    if (type === 'image') setImagesList(prev => [...prev, ...newItems]);
    if (type === 'audio') setAudiosList(prev => [...prev, ...newItems]);
    if (type === 'video') setVideosList(prev => [...prev, ...newItems]);
    setVirtualBlobMap(prev => ({ ...prev, ...newBlobMap }));

    setNotification({
      text: `Đã thêm ${files.length} tệp vào thư mục [${chuyenDe}]/${subFolder}.`,
      type: 'success',
    });
    setTimeout(() => setNotification(null), 3000);
    e.target.value = '';
  };

  // Tải file KienThuc.html về máy
  const handleDownloadHtml = () => {
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'KienThuc.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Bật/tắt Fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden transition-all ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none p-4 bg-slate-900 text-white' : ''
      }`}
    >
      {/* 1. Header: Thanh điều hướng 4 tiến trình của Chuyên đề & Breadcrumb */}
      <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white p-4 sm:p-5 border-b border-indigo-800 space-y-3">
        {/* Breadcrumb phân cấp */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto text-indigo-200">
            <span className="font-bold text-white bg-indigo-800/80 px-2 py-0.5 rounded">
              {subject} • {grade}
            </span>
            <span>&rsaquo;</span>
            <span className="font-semibold text-indigo-100">{title || 'Tài liệu'}</span>
            <span>&rsaquo;</span>
            <span>{chuong || 'Chương 1'}</span>
            <span>&rsaquo;</span>
            <span>{bai || 'Bài 1'}</span>
            <span>&rsaquo;</span>
            <span>{vanDe || 'Vấn đề 1'}</span>
            <span>&rsaquo;</span>
            <span className="font-extrabold text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/40">
              {chuyenDe || 'Chuyên đề'}
            </span>
          </div>

          {/* Nút lưu lên Google Drive */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveToDrive}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              title="Lưu KienThuc.html và tệp đa phương tiện lên Google Drive của giáo viên"
            >
              <Cloud className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Đang lưu Drive...' : 'Lưu vào Drive'}</span>
            </button>
            <button
              onClick={handleDownloadHtml}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer border border-slate-700"
              title="Tải tệp KienThuc.html về máy"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tải file .html</span>
            </button>
          </div>
        </div>

        {/* Thanh 4 tiến trình bài giảng của Chuyên đề */}
        <div className="pt-2 border-t border-indigo-800/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-bold">
            <button
              onClick={() => onSelectTienTrinh?.('kienThuc')}
              className="px-3 py-1.5 rounded-lg bg-indigo-500 text-white flex items-center gap-1.5 shadow-xs cursor-pointer border border-indigo-400"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>1. Kiến thức (KienThuc.html)</span>
            </button>

            <button
              onClick={() => onSelectTienTrinh?.('luyenTap')}
              className="px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white flex items-center gap-1.5 cursor-pointer border border-slate-700"
              title="2. Luyện tập: LuyenTap [tên].json"
            >
              <span>✍️ 2. Luyện tập</span>
            </button>

            <button
              onClick={() => onSelectTienTrinh?.('kiemTra')}
              className="px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white flex items-center gap-1.5 cursor-pointer border border-slate-700"
              title="3. Kiểm tra: KiemTra [tên].json"
            >
              <span>📝 3. Kiểm tra</span>
            </button>

            <button
              onClick={() => onSelectTienTrinh?.('caiThien')}
              className="px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white flex items-center gap-1.5 cursor-pointer border border-slate-700"
              title="4. Cải thiện: CaiThien [tên].json"
            >
              <span>🚀 4. Cải thiện</span>
            </button>
          </div>

          {onOpenWordEditor && (
            <button
              onClick={() => onOpenWordEditor(htmlContent)}
              className="flex items-center gap-1.5 text-xs font-bold text-indigo-300 hover:text-white hover:underline cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Mở trong Soạn thảo Word</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Thẻ hiển thị quy cách đường dẫn Drive & các thư mục con HinhAnh, AmThanh, Video */}
      <div className="bg-slate-50 border-b border-slate-200 p-3 text-xs space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-mono text-[11px] text-slate-700">
            <span className="font-bold text-indigo-800 flex items-center gap-1">
              <Folder className="w-3.5 h-3.5 text-indigo-600" /> Thư mục chuyên đề:
            </span>
            <span className="bg-white px-2 py-0.5 rounded border border-slate-200 text-indigo-700 font-bold select-all truncate max-w-xl">
              {driveFolderPath}
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-slate-600">
            <span className="font-semibold text-slate-500">Tệp chính:</span>
            <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
              📄 KienThuc.html
            </span>
          </div>
        </div>

        {/* 3 thư mục con: HinhAnh, AmThanh, Video */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-200/60 text-[11px]">
          <span className="font-bold text-slate-600">Thư mục con lưu media:</span>

          <span className="inline-flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-slate-200 text-indigo-700 font-mono">
            <ImageIcon className="w-3 h-3 text-indigo-500" />
            <span>[Chuyên đề] / <strong>HinhAnh</strong> ({imagesList.length} ảnh)</span>
          </span>

          <span className="inline-flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-slate-200 text-purple-700 font-mono">
            <Music className="w-3 h-3 text-purple-500" />
            <span>[Chuyên đề] / <strong>AmThanh</strong> ({audiosList.length} audio)</span>
          </span>

          <span className="inline-flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-slate-200 text-rose-700 font-mono">
            <VideoIcon className="w-3 h-3 text-rose-500" />
            <span>[Chuyên đề] / <strong>Video</strong> ({videosList.length} video)</span>
          </span>

          <span className="text-slate-400 italic text-[10px] ml-auto">
            (Hỗ trợ gói E-learning giữ nguyên đường dẫn tương đối, index.html ➔ KienThuc.html)
          </span>
        </div>
      </div>

      {/* Thông báo thông tin */}
      {notification && (
        <div
          className={`p-2.5 px-4 text-xs font-semibold flex items-center justify-between gap-2 border-b ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : notification.type === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : 'bg-blue-50 text-blue-800 border-blue-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : notification.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            ) : (
              <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
            )}
            <span>{notification.text}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 3. Thanh công cụ thao tác: Tải lên, Chuyển tab Preview/Code/Media, Phóng to/Thu nhỏ */}
      <div className="bg-white p-2.5 px-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Nhóm nút Tải lên */}
        <div className="flex items-center gap-2">
          {/* Tải lên file KienThuc.html */}
          <input
            type="file"
            ref={htmlFileInputRef}
            accept=".html,.htm"
            onChange={handleHtmlFileUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => htmlFileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold transition-colors cursor-pointer"
            title="Tải lên tệp KienThuc.html từ máy tính"
          >
            <Upload className="w-3.5 h-3.5 text-indigo-600" />
            <span>Nạp KienThuc.html</span>
          </button>

          {/* Tải lên gói E-learning */}
          <input
            type="file"
            ref={elearningFolderInputRef}
            // @ts-ignore
            webkitdirectory="true"
            directory="true"
            multiple
            onChange={handleElearningPackageUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => elearningFolderInputRef.current?.click()}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 text-indigo-800 font-bold transition-colors cursor-pointer"
            title="Tải lên cả thư mục gói bài giảng E-Learning (iSpring, Storyline...): tự động đổi index.html thành KienThuc.html và giữ nguyên đường dẫn tương đối"
          >
            <FolderArchive className="w-3.5 h-3.5 text-indigo-600" />
            <span>Tải lên gói E-Learning</span>
          </button>
        </div>

        {/* Nhóm Tabs: Xem trước (Preview) | Mã nguồn HTML (Code) | Quản lý Media (HinhAnh/AmThanh/Video) */}
        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200 font-bold">
          <button
            onClick={() => setActiveTab('preview')}
            className={`px-3 py-1 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'preview' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Xem trước bài giảng</span>
          </button>

          <button
            onClick={() => setActiveTab('code')}
            className={`px-3 py-1 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'code' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Mã HTML (KienThuc.html)</span>
          </button>

          <button
            onClick={() => setActiveTab('media')}
            className={`px-3 py-1 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'media' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Folder className="w-3.5 h-3.5" />
            <span>Tài nguyên Media</span>
          </button>
        </div>

        {/* Nhóm Phóng to / Thu nhỏ & Toàn màn hình */}
        <div className="flex items-center gap-1.5 text-slate-600">
          <button
            onClick={() => setZoomLevel(prev => Math.max(70, prev - 10))}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 cursor-pointer"
            title="Thu nhỏ"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-bold text-slate-500 w-10 text-center">{zoomLevel}%</span>
          <button
            onClick={() => setZoomLevel(prev => Math.min(150, prev + 10))}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 cursor-pointer"
            title="Phóng to"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 cursor-pointer text-indigo-600 ml-1"
            title={isFullscreen ? 'Thu nhỏ cửa sổ' : 'Toàn màn hình trình chiếu bài giảng'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 4. Vùng hiển thị Nội dung chính theo Tab */}
      <div className="flex-1 min-h-[560px] bg-slate-100 relative overflow-hidden flex flex-col">
        {isLoading && (
          <div className="absolute inset-0 z-30 bg-white/80 backdrop-blur-xs flex items-center justify-center gap-2 text-indigo-700 font-bold text-xs">
            <RotateCcw className="w-4 h-4 animate-spin" />
            <span>Đang tải bài giảng KienThuc.html từ Google Drive...</span>
          </div>
        )}

        {/* TAB 1: XEM TRƯỚC BÀI GIẢNG (IFRAME SANDBOX RESOLVER) */}
        {activeTab === 'preview' && (
          <div className="w-full h-full flex-1 overflow-auto p-4 flex justify-center items-start">
            <div
              className="w-full max-w-5xl bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden transition-transform origin-top"
              style={{ transform: `scale(${zoomLevel / 100})` }}
            >
              <iframe
                ref={iframeRef}
                title="KienThuc.html Viewer"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                className="w-full min-h-[640px] border-0"
              />
            </div>
          </div>
        )}

        {/* TAB 2: CHỈNH SỬA MÃ NGUỒN HTML */}
        {activeTab === 'code' && (
          <div className="w-full h-full flex-1 p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
              <span>Tệp: KienThuc.html (Được lưu tại: {driveFolderPath})</span>
              <span>Tổng số ký tự: {htmlContent.length}</span>
            </div>
            <textarea
              value={htmlContent}
              onChange={e => setHtmlContent(e.target.value)}
              className="flex-1 w-full p-4 font-mono text-xs bg-slate-900 text-indigo-100 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none min-h-[500px]"
              placeholder="Nhập mã HTML của bài giảng KienThuc.html..."
            />
          </div>
        )}

        {/* TAB 3: QUẢN LÝ TÀI NGUYÊN MEDIA (HinhAnh, AmThanh, Video) */}
        {activeTab === 'media' && (
          <div className="w-full h-full flex-1 p-4 sm:p-6 space-y-4 overflow-y-auto">
            {/* Thanh chọn thư mục con */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMediaSubTab('HinhAnh')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    mediaSubTab === 'HinhAnh'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>📷 [Chuyên đề]/HinhAnh ({imagesList.length})</span>
                </button>

                <button
                  onClick={() => setMediaSubTab('AmThanh')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    mediaSubTab === 'AmThanh'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <Music className="w-3.5 h-3.5" />
                  <span>🎵 [Chuyên đề]/AmThanh ({audiosList.length})</span>
                </button>

                <button
                  onClick={() => setMediaSubTab('Video')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    mediaSubTab === 'Video'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <VideoIcon className="w-3.5 h-3.5" />
                  <span>🎬 [Chuyên đề]/Video ({videosList.length})</span>
                </button>
              </div>

              {/* Nút thêm file tương ứng */}
              <div>
                {mediaSubTab === 'HinhAnh' && (
                  <>
                    <input
                      type="file"
                      ref={mediaImageInputRef}
                      accept="image/*"
                      multiple
                      onChange={e => handleSingleMediaUpload(e, 'image')}
                      className="hidden"
                    />
                    <button
                      onClick={() => mediaImageInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Thêm ảnh vào HinhAnh/</span>
                    </button>
                  </>
                )}

                {mediaSubTab === 'AmThanh' && (
                  <>
                    <input
                      type="file"
                      ref={mediaAudioInputRef}
                      accept="audio/*"
                      multiple
                      onChange={e => handleSingleMediaUpload(e, 'audio')}
                      className="hidden"
                    />
                    <button
                      onClick={() => mediaAudioInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Thêm âm thanh vào AmThanh/</span>
                    </button>
                  </>
                )}

                {mediaSubTab === 'Video' && (
                  <>
                    <input
                      type="file"
                      ref={mediaVideoInputRef}
                      accept="video/*"
                      multiple
                      onChange={e => handleSingleMediaUpload(e, 'video')}
                      className="hidden"
                    />
                    <button
                      onClick={() => mediaVideoInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Thêm video vào Video/</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Hiển thị danh sách các tệp theo thư mục đang chọn */}
            {mediaSubTab === 'HinhAnh' && (
              <div>
                {imagesList.length === 0 ? (
                  <div className="p-8 text-center bg-white rounded-xl border border-dashed border-slate-300 text-slate-500 text-xs space-y-2">
                    <ImageIcon className="w-8 h-8 text-slate-300 mx-auto" />
                    <div>Chưa có tệp ảnh nào trong thư mục <strong>[Chuyên đề]/HinhAnh</strong>.</div>
                    <div className="text-[11px] text-slate-400">
                      Bấm nút "Thêm ảnh vào HinhAnh/" hoặc tải lên gói E-learning để nạp ảnh. Đường dẫn trong file HTML: <code>HinhAnh/[tên_ảnh]</code>.
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {imagesList.map(item => (
                      <div key={item.id} className="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
                        <div className="h-32 bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center">
                          <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="font-mono text-[11px] font-bold text-slate-800 truncate" title={item.name}>
                          {item.name}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center justify-between">
                          <span>{item.size}</span>
                          <code className="text-indigo-600 bg-indigo-50 px-1 rounded">HinhAnh/{item.name}</code>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {mediaSubTab === 'AmThanh' && (
              <div>
                {audiosList.length === 0 ? (
                  <div className="p-8 text-center bg-white rounded-xl border border-dashed border-slate-300 text-slate-500 text-xs space-y-2">
                    <Music className="w-8 h-8 text-slate-300 mx-auto" />
                    <div>Chưa có tệp âm thanh nào trong thư mục <strong>[Chuyên đề]/AmThanh</strong>.</div>
                    <div className="text-[11px] text-slate-400">
                      Đường dẫn trích dẫn trong file HTML: <code>AmThanh/[tên_file.mp3]</code>.
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {audiosList.map(item => (
                      <div key={item.id} className="bg-white p-3 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                            <Music className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-bold text-slate-800 text-xs">{item.name}</div>
                            <div className="text-[11px] text-slate-400 font-mono">AmThanh/{item.name} • {item.size}</div>
                          </div>
                        </div>
                        <audio controls src={item.url} className="h-8 max-w-xs" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {mediaSubTab === 'Video' && (
              <div>
                {videosList.length === 0 ? (
                  <div className="p-8 text-center bg-white rounded-xl border border-dashed border-slate-300 text-slate-500 text-xs space-y-2">
                    <VideoIcon className="w-8 h-8 text-slate-300 mx-auto" />
                    <div>Chưa có tệp video nào trong thư mục <strong>[Chuyên đề]/Video</strong>.</div>
                    <div className="text-[11px] text-slate-400">
                      Đường dẫn trích dẫn trong file HTML: <code>Video/[tên_file.mp4]</code>.
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {videosList.map(item => (
                      <div key={item.id} className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                        <video controls src={item.url} className="w-full h-36 bg-slate-900 rounded-lg object-cover" />
                        <div>
                          <div className="font-bold text-slate-800 text-xs truncate" title={item.name}>{item.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">Video/{item.name} • {item.size}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
