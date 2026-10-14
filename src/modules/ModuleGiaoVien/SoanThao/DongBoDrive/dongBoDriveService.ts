/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TeacherDocument } from '../../../../services/storageTypes';
import { saveTeacherDocument } from '../../../ConnectData/ConnectFirestore';
import {
  ensureValidDriveToken,
  getOrCreateFolderPathOnDrive,
  saveOrUpdateDriveFile,
  findFileInDriveFolder,
  getDriveConnectionState,
  formatDocumentTitle,
  loadChuyenDeContentFromDrive,
  LoadChuyenDeResult,
  connectGoogleDrive,
} from '../../../ConnectData/ConnectDrive/googleDriveService';
export { loadChuyenDeContentFromDrive, ensureValidDriveToken, connectGoogleDrive };
export type { LoadChuyenDeResult };
import {
  DongBoDriveDocData,
  DongBoDriveResult,
  SyncedFileInfo,
  CaiThienData,
  ExerciseItemData,
  KtdgItemData,
} from './types';

export function removeVietnameseTones(str: string): string {
  let s = str || '';
  s = s.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, 'a');
  s = s.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, 'e');
  s = s.replace(/ì|í|ị|ỉ|ĩ/g, 'i');
  s = s.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, 'o');
  s = s.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, 'u');
  s = s.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, 'y');
  s = s.replace(/đ/g, 'd');
  s = s.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, 'a');
  s = s.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, 'e');
  s = s.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, 'i');
  s = s.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, 'o');
  s = s.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, 'u');
  s = s.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, 'y');
  s = s.replace(/Đ/g, 'd');
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function formatSafeSlug(name: string): string {
  if (!name) return 'Bai1';
  const clean = removeVietnameseTones(name).trim();
  const words = clean.split(/[^a-zA-Z0-9]+/g).filter(Boolean);
  if (words.length === 0) return 'Bai1';
  return words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
}

/**
 * Mẫu bài luyện tập mặc định cho chuyên đề (mục 2. Luyện tập)
 */
function createDefaultExerciseItem(chuyenDe: string, title: string, index: number = 1): ExerciseItemData {
  const name = index === 1 ? 'co_ban' : `nang_cao_${index}`;
  return {
    name,
    title: index === 1 ? 'Bài luyện tập cơ bản' : `Bài luyện tập nâng cao ${index}`,
    data: {
      chuyenDe: chuyenDe || 'Chuyên đề',
      tieuDe: `Bài luyện tập ${index}: ${title || chuyenDe}`,
      ngayTao: new Date().toISOString(),
      mucDo: index === 1 ? 'Nhận biết & Thông hiểu' : 'Vận dụng & Vận dụng cao',
      questions: [
        {
          id: `lt_${index}_q1`,
          questionNumber: 1,
          type: 'multiple_choice',
          content: `Câu 1: Luyện tập trọng tâm chuyên đề ${chuyenDe || title}. Chọn khẳng định đúng:`,
          options: [
            { key: 'A', text: 'Phương án đúng A' },
            { key: 'B', text: 'Phương án B' },
            { key: 'C', text: 'Phương án C' },
            { key: 'D', text: 'Phương án D' },
          ],
          correctAnswer: 'A',
          solution: 'Áp dụng định lý và tính chất của chuyên đề để suy ra đáp án đúng A.',
          points: 0.25,
        },
      ],
    },
  };
}

/**
 * Mẫu bài kiểm tra đánh giá mặc định (mục 3. KTDG - đổi tên từ 3. Rèn luyện)
 */
function createDefaultKtdgItem(chuyenDe: string, title: string, index: number = 1): KtdgItemData {
  const name = index === 1 ? 'danh_gia_nang_luc' : `de_kiem_tra_${index}`;
  return {
    name,
    title: index === 1 ? 'Kiểm tra đánh giá năng lực' : `Đề kiểm tra ${index}`,
    data: {
      chuyenDe: chuyenDe || 'Chuyên đề',
      tieuDe: `Bài kiểm tra đánh giá (KTDG) ${index}: ${title || chuyenDe}`,
      ngayTao: new Date().toISOString(),
      thoiGianLamBai: 15,
      questions: [
        {
          id: `ktdg_${index}_q1`,
          questionNumber: 1,
          type: 'multiple_choice',
          content: `Câu 1 (KTDG): Đánh giá mức độ nắm vững kiến thức ${chuyenDe || title}:`,
          options: [
            { key: 'A', text: 'Kết quả chính xác A' },
            { key: 'B', text: 'Kết quả B' },
            { key: 'C', text: 'Kết quả C' },
            { key: 'D', text: 'Kết quả D' },
          ],
          correctAnswer: 'A',
          solution: 'Lời giải chi tiết theo ma trận kiểm tra đánh giá của Bộ GD&ĐT.',
          points: 1.0,
        },
      ],
    },
  };
}

/**
 * Mẫu dữ liệu phần Cải thiện lưu file CaiThien.json
 * Bao gồm: nội dung làm tốt; chưa tốt của các học sinh; đề xuất cần cải thiện gì; cách học.
 */
function createDefaultCaiThienData(chuyenDe: string, lop?: string): CaiThienData {
  return {
    chuyenDe: chuyenDe || 'Chuyên đề trọng tâm',
    lop: lop || '10A1',
    ngayCapNhat: new Date().toLocaleString('vi-VN'),
    danhSachHocSinh: [
      {
        studentId: 'hs_01',
        studentName: 'Nguyễn Văn An',
        lamTot: [
          'Nắm vững định nghĩa, khái niệm và công thức cơ bản',
          'Giải chính xác các câu hỏi trắc nghiệm mức nhận biết và thông hiểu',
        ],
        chuaTot: [
          'Tốc độ biến đổi phương trình còn chậm',
          'Còn lúng túng khi gặp bài toán vận dụng kết hợp đồ thị',
        ],
        deXuatCaiThien: 'Luyện thêm 5 bài tập dạng bài đồ thị và rèn kỹ năng bấm máy tính cầm tay',
        cachHoc: 'Vẽ sơ đồ tư duy phương pháp giải, làm lại các câu bị sai sau 2 ngày để khắc sâu',
        danhGiaChung: 'Khá (7.5đ)',
      },
      {
        studentId: 'hs_02',
        studentName: 'Trần Thị Bình',
        lamTot: [
          'Chăm chỉ ghi chép lý thuyết đầy đủ, trình bày tự luận cẩn thận',
          'Tích cực trao đổi và hỏi bài thầy cô khi gặp vướng mắc',
        ],
        chuaTot: [
          'Hay nhầm lẫn dấu khi biến đổi biểu thức đại số',
          'Chưa nhớ kỹ các điều kiện ràng buộc của tập xác định',
        ],
        deXuatCaiThien: 'Ôn kỹ bảng xét dấu, giải chậm lại 1 nhịp ở bước tìm điều kiện xác định',
        cachHoc: 'Lập sổ tay lỗi sai cá nhân, học nhóm cùng bạn giỏi để được hỗ trợ kiểm tra chéo',
        danhGiaChung: 'Trung bình khá (6.5đ)',
      },
    ],
    tongKetChung: {
      tiLeDat: '85%',
      uuDiemChung: 'Hầu hết học sinh nắm vững lý thuyết trọng tâm và làm tốt bài trắc nghiệm cơ bản.',
      tonTaiChung: 'Một số học sinh chưa xử lý tốt bài toán phân loại và còn thiếu cẩn thận ở bước kết luận.',
      deXuatGiaoVien: 'Dành 10 phút đầu giờ tiết sau chữa kỹ câu hỏi vận dụng và lưu ý bẫy đề thi.',
      phuongPhapHocChung: 'Tăng cường tự luyện với bài tập tương tác và theo dõi tiến độ cải thiện hàng tuần.',
    },
  };
}

interface MediaExtraction {
  type: 'image' | 'audio' | 'video';
  mimeType: string;
  suggestedFileName: string;
  content: string;
}

function extractMediaFromHtml(html: string, prefix: string): MediaExtraction[] {
  const results: MediaExtraction[] = [];
  if (!html) return results;

  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  let imgMatch;
  let imgIdx = 1;
  while ((imgMatch = imgRegex.exec(html)) !== null) {
    const src = imgMatch[1];
    if (src) {
      let ext = 'png';
      let mimeType = 'image/png';
      if (src.includes('data:image/jpeg') || src.endsWith('.jpg')) { ext = 'jpg'; mimeType = 'image/jpeg'; }
      else if (src.includes('data:image/webp') || src.endsWith('.webp')) { ext = 'webp'; mimeType = 'image/webp'; }
      else if (src.includes('data:image/svg') || src.endsWith('.svg')) { ext = 'svg'; mimeType = 'image/svg+xml'; }

      const altMatch = imgMatch[0].match(/alt=["']([^"']+)["']/i);
      const label = altMatch && altMatch[1] ? altMatch[1] : `minh_hoa_${imgIdx}`;
      const slug = formatSafeSlug(label);
      results.push({
        type: 'image',
        mimeType,
        suggestedFileName: `${prefix}_Hinh_${imgIdx}_${slug}.${ext}`,
        content: src,
      });
      imgIdx++;
    }
  }

  const audioRegex = /<audio[^>]+src=["']([^"']+)["'][^>]*>/gi;
  let audMatch;
  let audIdx = 1;
  while ((audMatch = audioRegex.exec(html)) !== null) {
    const src = audMatch[1];
    if (src) {
      results.push({
        type: 'audio',
        mimeType: 'audio/mp3',
        suggestedFileName: `${prefix}_AmThanh_${audIdx}_bai_giang.mp3`,
        content: src,
      });
      audIdx++;
    }
  }

  const videoRegex = /<video[^>]+src=["']([^"']+)["'][^>]*>/gi;
  let vidMatch;
  let vidIdx = 1;
  while ((vidMatch = videoRegex.exec(html)) !== null) {
    const src = vidMatch[1];
    if (src) {
      results.push({
        type: 'video',
        mimeType: 'video/mp4',
        suggestedFileName: `${prefix}_Video_${vidIdx}_mo_phong.mp4`,
        content: src,
      });
      vidIdx++;
    }
  }

  return results;
}

function extractMediaFromQuestions(questions: any[]): MediaExtraction[] {
  const results: MediaExtraction[] = [];
  if (!Array.isArray(questions)) return results;

  questions.forEach((q, qIndex) => {
    const qNum = q.questionNumber || (qIndex + 1);
    const qText = q.content || q.title || q.question || '';
    const qSlug = formatSafeSlug(qText.replace(/<[^>]+>/g, ' ').slice(0, 30)) || `cau_${qNum}`;

    const imgSrc = q.image || q.imageUrl || q.hinhAnh || q.img;
    if (imgSrc && typeof imgSrc === 'string') {
      let ext = 'png';
      let mimeType = 'image/png';
      if (imgSrc.includes('data:image/jpeg') || imgSrc.endsWith('.jpg')) { ext = 'jpg'; mimeType = 'image/jpeg'; }
      results.push({
        type: 'image',
        mimeType,
        suggestedFileName: `Cau${qNum}_HinhMinhHoa_${qSlug}.${ext}`,
        content: imgSrc,
      });
    }

    const audioSrc = q.audio || q.audioUrl || q.amThanh;
    if (audioSrc && typeof audioSrc === 'string') {
      results.push({
        type: 'audio',
        mimeType: 'audio/mp3',
        suggestedFileName: `Cau${qNum}_AmThanh_${qSlug}.mp3`,
        content: audioSrc,
      });
    }

    const videoSrc = q.video || q.videoUrl || q.phim;
    if (videoSrc && typeof videoSrc === 'string') {
      results.push({
        type: 'video',
        mimeType: 'video/mp4',
        suggestedFileName: `Cau${qNum}_Video_${qSlug}.mp4`,
        content: videoSrc,
      });
    }

    const embeddedHtml = `${q.content || ''} ${q.solution || ''}`;
    const embedded = extractMediaFromHtml(embeddedHtml, `Cau${qNum}`);
    results.push(...embedded);
  });

  return results;
}

async function syncMediaToDriveSubfolders(
  token: string,
  physicalFolders: string[],
  folderType: 'Kienthuc' | 'LuyenTap' | 'KTDG',
  sectionName: string,
  mediaItems: MediaExtraction[]
): Promise<SyncedFileInfo[]> {
  const syncedMedia: SyncedFileInfo[] = [];
  if (!mediaItems || mediaItems.length === 0) return syncedMedia;

  const cleanSectionName = formatSafeSlug(sectionName);
  const sectionFolderName = `${folderType}_${cleanSectionName}`;

  const images = mediaItems.filter(m => m.type === 'image');
  const audios = mediaItems.filter(m => m.type === 'audio');
  const videos = mediaItems.filter(m => m.type === 'video');

  if (images.length > 0) {
    const imgFolderId = await getOrCreateFolderPathOnDrive(token, [...physicalFolders, sectionFolderName, 'HinhAnh']);
    for (const img of images) {
      const res = await saveOrUpdateDriveFile(token, imgFolderId, img.suggestedFileName, img.content, img.mimeType);
      syncedMedia.push({
        name: `${sectionFolderName}/HinhAnh/${img.suggestedFileName}`,
        fileId: res.fileId,
        isCreated: res.isCreated,
        status: res.isCreated ? 'created' : 'updated',
      });
    }
  }

  if (audios.length > 0) {
    const audioFolderId = await getOrCreateFolderPathOnDrive(token, [...physicalFolders, sectionFolderName, 'AmThanh']);
    for (const aud of audios) {
      const res = await saveOrUpdateDriveFile(token, audioFolderId, aud.suggestedFileName, aud.content, aud.mimeType);
      syncedMedia.push({
        name: `${sectionFolderName}/AmThanh/${aud.suggestedFileName}`,
        fileId: res.fileId,
        isCreated: res.isCreated,
        status: res.isCreated ? 'created' : 'updated',
      });
    }
  }

  if (videos.length > 0) {
    const videoFolderId = await getOrCreateFolderPathOnDrive(token, [...physicalFolders, sectionFolderName, 'Video']);
    for (const vid of videos) {
      const res = await saveOrUpdateDriveFile(token, videoFolderId, vid.suggestedFileName, vid.content, vid.mimeType);
      syncedMedia.push({
        name: `${sectionFolderName}/Video/${vid.suggestedFileName}`,
        fileId: res.fileId,
        isCreated: res.isCreated,
        status: res.isCreated ? 'created' : 'updated',
      });
    }
  }

  return syncedMedia;
}

/**
 * Service đồng bộ Chuyên đề lên Google Drive tuân thủ nghiêm ngặt 3 bước:
 * 1. Kiểm tra các thư mục tương ứng đã có chưa (lấy folderID về bộ nhớ trình duyệt để truy cứu siêu tốc). Nếu chưa thì tạo.
 * 2. Kiểm tra tên file (kienthuc.html; luyentap_{tên bài}.json; KTDG_{tên bài}.json; CaiThien.json). Nếu chưa có thì tạo.
 * 3. Lưu nội dung vào file tương ứng.
 */
export async function saveDocumentToDriveAndDatabase(
  data: DongBoDriveDocData,
  onProgress?: (step: string) => void
): Promise<DongBoDriveResult> {
  const {
    id,
    title,
    subject = 'Toán Học',
    grade = 'Khối 10',
    chuong = '',
    bai = '',
    vanDe = '',
    chuyenDe = '',
    contentHtml = '<p>Chưa có nội dung</p>',
    textContent = '',
    selectedClasses = [],
    isForSale = false,
    priceDiamonds = 0,
    luyenTapList,
    ktdgList,
    caiThienData,
  } = data;

  if (!title.trim()) {
    return {
      success: false,
      error: 'Vui lòng nhập tiêu đề bài giảng trước khi lưu Drive!',
    };
  }

  // Chuẩn hóa tên đường dẫn thư mục phân cấp
  const formattedTitle = formatDocumentTitle(subject, grade, title);
  const cleanTitle = (formattedTitle || title || 'TaiLieu').trim().replace(/[\\/:*?"<>|]+/g, ' ').trim();
  const safeChuong = (chuong || 'Chương 1').trim();
  const safeBai = (bai || 'Bài 1').trim();
  const safeVanDe = (vanDe || 'Vấn đề 1').trim();
  const safeChuyenDe = (chuyenDe || 'Chuyên đề 1').trim();

  // Danh sách các cấp thư mục phân cấp trên Drive
  const physicalFolders = [
    'myApp',
    'LopU',
    'TaiLieu',
    cleanTitle,
    safeChuong,
    safeBai,
    safeVanDe,
    safeChuyenDe,
  ];
  const driveFolderPath = physicalFolders.join(' / ');

  const plainSnippet = textContent
    ? textContent.slice(0, 200).replace(/\n/g, ' ') + '...'
    : contentHtml.replace(/<[^>]+>/g, ' ').slice(0, 200) + '...';

  const docItem: TeacherDocument = {
    id: id || `doc_${Date.now()}`,
    title: title.trim(),
    subject,
    grade,
    category: 'lesson_plan',
    fileType: 'gdoc',
    chuong: safeChuong,
    bai: safeBai,
    vanDe: safeVanDe,
    chuyenDe: safeChuyenDe,
    driveFolderPath,
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
    ...({ contentHtml, content: contentHtml }),
  };

  // Luôn lưu cache cục bộ cho tệp soạn thảo
  try {
    localStorage.setItem(`lopu_kienthuc_${safeChuyenDe}`, contentHtml);
    localStorage.setItem(`lopu_kienthuc_${physicalFolders.join('_')}`, contentHtml);
    localStorage.setItem(`lopu_drive_file_content_name_KienThuc_LyThuyetTrongTam.html`, contentHtml);
  } catch {}

  const syncedFiles: SyncedFileInfo[] = [];

  try {
    if (onProgress) onProgress('1/4. Đang kiểm tra phiên kết nối Google Drive...');
    const token = await ensureValidDriveToken(onProgress);

    let targetFolderId = 'local_virtual_folder';
    if (token) {
      // ─────────────────────────────────────────────────────────────
      // BƯỚC 1: KIỂM TRA CÁC THƯ MỤC TƯƠNG ỨNG ĐÃ CÓ CHƯA
      // Đã lấy folderID về bộ nhớ trình duyệt (localStorage cache)
      // Nếu chưa có thì tạo thư mục với tên tương ứng trên Drive.
      // ─────────────────────────────────────────────────────────────
      if (onProgress) onProgress(`2/4. Đang xác định thư mục chuyên đề trên Drive...`);
      targetFolderId = await getOrCreateFolderPathOnDrive(token, physicalFolders);

      // ─────────────────────────────────────────────────────────────
      // BƯỚC 2 & 3: CHỈ LƯU DUY NHẤT FILE HIỆN TẠI ĐANG MỞ VÀ SOẠN THẢO TRÊN CỬA SỔ WORD
      // ─────────────────────────────────────────────────────────────
      const currentTienTrinh = data.tienTrinh || 'Kiến thức';

      if (currentTienTrinh === 'Kiến thức') {
        // Chỉ lưu 1 file bài học Kiến thức đang mở: KienThuc_{tên kiến thức đang chọn}.html
        const rawName = data.selectedKienThucName || data.kienThucName || 'ly_thuyet_trong_tam';
        const cleanName = formatSafeSlug(rawName);
        const kienThucFileName = `KienThuc_${cleanName}.html`;
        if (onProgress) onProgress(`3/4. Đang lưu file hiện tại: ${kienThucFileName}...`);

        const kienThucRes = await saveOrUpdateDriveFile(
          token,
          targetFolderId,
          kienThucFileName,
          contentHtml,
          'text/html'
        );
        syncedFiles.push({
          name: kienThucFileName,
          fileId: kienThucRes.fileId,
          isCreated: kienThucRes.isCreated,
          status: kienThucRes.isCreated ? 'created' : 'updated',
        });

        try {
          localStorage.setItem(`lopu_kienthuc_file_${kienThucFileName}_${safeChuyenDe}`, contentHtml);
          localStorage.setItem(`lopu_drive_file_content_name_${kienThucFileName}`, contentHtml);
        } catch {}

        // Đa phương tiện đính kèm trong Kiến thức
        const ktMedia = extractMediaFromHtml(contentHtml, `Kienthuc_${cleanName}`);
        if (ktMedia.length > 0) {
          try {
            const syncedMedia = await syncMediaToDriveSubfolders(token, physicalFolders, 'Kienthuc', cleanName, ktMedia);
            syncedFiles.push(...syncedMedia);
          } catch (mErr) {
            console.warn('Lưu media đính kèm không thành công nhưng tệp chính đã lưu tốt:', mErr);
          }
        }
      } else if (currentTienTrinh === 'Luyện tập') {
        // Chỉ lưu 1 file bài tập Luyện tập đang mở: luyentap_{tên bài luyện tập đang chọn}.json
        const rawName = data.selectedExerciseName || 'co_ban';
        const slug = formatSafeSlug(rawName);
        const exFileName = `luyentap_${slug}.json`;
        if (onProgress) onProgress(`3/4. Đang lưu file hiện tại: ${exFileName}...`);

        // Tìm data có sẵn trong luyenTapList hoặc tạo cấu trúc lưu trữ dựa trên nội dung soạn thảo
        const matchedItem = (luyenTapList || []).find(x => x.name === rawName || formatSafeSlug(x.name) === slug);
        let exDataObj = matchedItem?.data;
        if (!exDataObj) {
          const defaultObj = createDefaultExerciseItem(safeChuyenDe, title.trim());
          defaultObj.data.tieuDe = rawName;
          exDataObj = defaultObj.data;
        }
        if (contentHtml && contentHtml !== '<p>Chưa có nội dung</p>') {
          exDataObj.htmlSnippet = contentHtml;
        }

        const exContent = JSON.stringify(exDataObj, null, 2);
        const exRes = await saveOrUpdateDriveFile(
          token,
          targetFolderId,
          exFileName,
          exContent,
          'application/json'
        );
        syncedFiles.push({
          name: exFileName,
          fileId: exRes.fileId,
          isCreated: exRes.isCreated,
          status: exRes.isCreated ? 'created' : 'updated',
        });

        // Đa phương tiện đính kèm trong các câu hỏi Luyện tập
        if (exDataObj && Array.isArray(exDataObj.questions)) {
          const ltMedia = extractMediaFromQuestions(exDataObj.questions);
          if (ltMedia.length > 0) {
            try {
              const syncedMedia = await syncMediaToDriveSubfolders(token, physicalFolders, 'LuyenTap', slug, ltMedia);
              syncedFiles.push(...syncedMedia);
            } catch (mErr) {
              console.warn('Lưu media Luyện tập không thành công nhưng tệp chính đã lưu tốt:', mErr);
            }
          }
        }
      } else if (currentTienTrinh === 'KTDG') {
        // Chỉ lưu 1 file đề Kiểm tra đánh giá đang mở: KTDG_{tên đề KTĐG đang chọn}.json
        const rawName = data.selectedExerciseName || 'danh_gia_nang_luc';
        const slug = formatSafeSlug(rawName);
        const ktdgFileName = `KTDG_${slug}.json`;
        if (onProgress) onProgress(`3/4. Đang lưu file hiện tại: ${ktdgFileName}...`);

        const matchedItem = (ktdgList || []).find(x => x.name === rawName || formatSafeSlug(x.name) === slug);
        let ktdgDataObj = matchedItem?.data;
        if (!ktdgDataObj) {
          const defaultObj = createDefaultKtdgItem(safeChuyenDe, title.trim());
          defaultObj.data.tieuDe = rawName;
          ktdgDataObj = defaultObj.data;
        }
        if (contentHtml && contentHtml !== '<p>Chưa có nội dung</p>') {
          ktdgDataObj.htmlSnippet = contentHtml;
        }

        const ktdgContent = JSON.stringify(ktdgDataObj, null, 2);
        const ktRes = await saveOrUpdateDriveFile(
          token,
          targetFolderId,
          ktdgFileName,
          ktdgContent,
          'application/json'
        );
        syncedFiles.push({
          name: ktdgFileName,
          fileId: ktRes.fileId,
          isCreated: ktRes.isCreated,
          status: ktRes.isCreated ? 'created' : 'updated',
        });

        // Đa phương tiện đính kèm trong các câu hỏi KTDG
        if (ktdgDataObj && Array.isArray(ktdgDataObj.questions)) {
          const ktdgMedia = extractMediaFromQuestions(ktdgDataObj.questions);
          if (ktdgMedia.length > 0) {
            try {
              const syncedMedia = await syncMediaToDriveSubfolders(token, physicalFolders, 'KTDG', slug, ktdgMedia);
              syncedFiles.push(...syncedMedia);
            } catch (mErr) {
              console.warn('Lưu media KTDG không thành công nhưng tệp chính đã lưu tốt:', mErr);
            }
          }
        }
      } else if (currentTienTrinh === 'Cải thiện') {
        // Chỉ lưu file Cải thiện: CaiThien.json
        const caiThienFileName = 'CaiThien.json';
        if (onProgress) onProgress(`3/4. Đang lưu file hiện tại: ${caiThienFileName}...`);
        const effectiveCaiThienData: CaiThienData = caiThienData || createDefaultCaiThienData(safeChuyenDe, selectedClasses[0] || '10A1');
        const caiThienContent = JSON.stringify(effectiveCaiThienData, null, 2);
        const ctRes = await saveOrUpdateDriveFile(
          token,
          targetFolderId,
          caiThienFileName,
          caiThienContent,
          'application/json'
        );
        syncedFiles.push({
          name: caiThienFileName,
          fileId: ctRes.fileId,
          isCreated: ctRes.isCreated,
          status: ctRes.isCreated ? 'created' : 'updated',
        });
      }

      // Lưu vào Firestore cơ sở dữ liệu hệ thống (phụ trợ, không để lỗi làm fail kết quả Drive)
      if (onProgress) onProgress('4/4. Đang cập nhật cơ sở dữ liệu hệ thống...');
      try {
        await saveTeacherDocument(docItem);
      } catch (dbErr) {
        console.warn('Lưu Firestore không thành công nhưng Drive đã lưu tốt:', dbErr);
      }

      const conn = getDriveConnectionState();
      const savedFileName = syncedFiles[0]?.name || title.trim();

      let successMsg = '';
      if (conn.isConnected && token) {
        successMsg = `Đã lưu thành công file hiện tại "${savedFileName}" lên Google Drive! (${driveFolderPath})`;
      } else {
        successMsg = `Đã lưu tài liệu vào hệ thống: ${savedFileName}`;
      }

      if (selectedClasses.length > 0) {
        successMsg += ` và phát hành tới ${selectedClasses.length} lớp học.`;
      }

      const savedAt = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

      return {
        success: true,
        drivePath: driveFolderPath,
        folderId: targetFolderId,
        cleanFileName: savedFileName,
        message: successMsg,
        savedAt,
        syncedFiles,
      };
    } else {
      // Khi không có kết nối Drive, chỉ lưu vào Firestore
      if (onProgress) onProgress('Đang lưu vào bộ nhớ hệ thống...');
      await saveTeacherDocument(docItem);
      return {
        success: true,
        cleanFileName: title.trim(),
        message: `Đã lưu tài liệu vào cơ sở dữ liệu hệ thống: ${title.trim()}`,
        savedAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        syncedFiles: [],
      };
    }
  } catch (err: any) {
    if (err?.message?.includes('401') || err?.message?.includes('hết hạn') || err?.message?.includes('authentication credential')) {
      localStorage.removeItem('lopu_google_drive_token_v1');
      localStorage.removeItem('lopu_gdrive_token');
      try {
        if (onProgress) onProgress('Phiên kết nối đã hết hạn (401). Đang mở xác thực lại tài khoản Google...');
        const reConn = await connectGoogleDrive();
        if (reConn.success) {
          return await saveDocumentToDriveAndDatabase(data, onProgress);
        }
      } catch {}
    }
    return {
      success: false,
      error: err?.message || 'Có lỗi xảy ra trong quá trình đồng bộ Drive.',
    };
  }
}
