import React, { useState } from 'react';
import { Copy, Check, BookMarked, Terminal, ExternalLink } from 'lucide-react';

interface PromptItem {
  id: string;
  name: string;
  prompt: string;
  description: string;
}

interface PromptGroup {
  id: string;
  name: string;
  items: PromptItem[];
}

const DEFAULT_PROMPT_GROUPS: PromptGroup[] = [
  {
    id: 'sodolop',
    name: 'Module Sơ đồ lớp (SoDoLop)',
    items: [
      {
        id: 'sodo-a4',
        name: 'Xuất ảnh PNG chuẩn A4 lề 2cm',
        prompt: `[Sửa nhanh: ModuleHocSinh/SoDoLop] Cấu hình chức năng tải ảnh sơ đồ lớp khớp khít khổ ngang giấy A4 trừ đi lề 2cm mỗi bên khi chèn vào Word.
Yêu cầu:
1. Đảm bảo tỷ lệ khung ảnh khớp khổ giấy A4 ngang tiêu chuẩn (tỷ lệ xấp xỉ 1.414).
2. Khi chèn vào Word căn lề 2cm mỗi bên, sơ đồ hiển thị trọn vẹn nét căng, viền đen sắc sảo, không bị mờ hay vỡ hạt.
3. Không quét lại toàn bộ dự án, chỉ sửa trúng đích file SoDoLopView.tsx.`,
        description: 'Prompt tối ưu hóa kích thước xuất ảnh PNG khớp chuẩn A4 lề 2cm phục vụ in ấn báo cáo.'
      },
      {
        id: 'sodo-grid',
        name: 'Bố cục lưới tọa độ 4x3 tinh gọn',
        prompt: `[Sửa nhanh: ModuleHocSinh/SoDoLop] Thiết lập bố cục của từng ô học sinh trên sơ đồ lớp theo lưới tọa độ ảo 4 hàng x 3 cột (CSS Grid 4x3) tối ưu diện tích:
- Hàng 1 Cột 1: Chức danh Điều hành (11pt in đậm, canh trái & giữa dọc).
- Hàng 1 Cột 3: Chức danh Đoàn (11pt in đậm, canh phải & giữa dọc).
- Hàng 2 Cột 2: Icon Giới tính (w-10 h-10, canh giữa dọc & ngang, đặt ở lớp nền z-0 để các chức danh đè lên nếu tràn).
- Hàng 3 Cột 1: Chức danh Tổ (11pt in đậm, canh trái & sát lề trên).
- Hàng 3 Cột 3: Chức danh Bộ môn (11pt in đậm, canh phải & sát lề trên).
- Hàng 4 (chiếm trọn cột 1-3): Biệt danh học sinh (14pt in thường, canh giữa, col-span-3 rộng rãi không bị gãy dòng).
Chỉ sửa trúng đích file SoDoLopView.tsx, không duyệt lại dự án.`,
        description: 'Prompt cấu hình lưới 4x3 định vị chi tiết từng nhãn chức danh và kéo dài biệt danh hàng 4.'
      },
      {
        id: 'sodo-2seats',
        name: 'Giãn hai đầu bàn cho bàn 2 người',
        prompt: `[Sửa nhanh: ModuleHocSinh/SoDoLop] Cập nhật sơ đồ lớp cho bàn 2 học sinh (bàn đôi):
Yêu cầu:
1. Khi bàn có cấu hình 2 ghế, tự động hiển thị lưới 3 cột (grid-cols-3) với một khoảng trống (spacer) ở giữa (Cột 2 trống).
2. Ghế 1 nằm ở Cột 1 (đầu bàn trái), Ghế 2 nằm ở Cột 3 (đầu bàn phải).
3. Đảm bảo giữ nguyên tính năng kéo thả xếp chỗ, bấm chọn chỗ ngồi và đồng bộ Drive không bị xô lệch dữ liệu.
Chỉ chỉnh sửa file SoDoLopView.tsx.`,
        description: 'Prompt thiết lập bàn đôi giãn ra hai đầu bàn có khoảng trống ở giữa chân thực.'
      }
    ]
  },
  {
    id: 'thoikhoabieu',
    name: 'Module Thời khóa biểu (ThoiKhoaBieu)',
    items: [
      {
        id: 'tkb-7col',
        name: 'Chế độ lịch tuần 7 cột & 3 cột rút gọn',
        prompt: `[Sửa nhanh: ModuleHocSinh/ThoiKhoaBieu] Tối ưu hóa giao diện Thời khóa biểu:
Yêu cầu:
1. Hỗ trợ 2 chế độ hiển thị linh hoạt: Lịch tuần đầy đủ 7 ngày (Thứ 2 đến Chủ nhật) và Lịch rút gọn 3 ngày (Hôm nay, Ngày mai, Ngày kia) siêu tiện lợi trên điện thoại di động.
2. Mỗi tiết học hiển thị đầy đủ 3 dòng thông tin: Tên môn, lớp học + phòng học, giáo viên + thời gian chi tiết.
3. Thêm nhãn phân loại CK (Chính khóa) / HT (Học thêm) trực quan ở góc ô.
Chỉ sửa trúng đích file ThoiKhoaBieuView.tsx.`,
        description: 'Prompt thiết kế lịch thời khóa biểu thích ứng linh hoạt theo ngày học.'
      },
      {
        id: 'tkb-merge',
        name: 'Tự động gộp các tiết kề nhau <=20 phút',
        prompt: `[Sửa nhanh: ModuleHocSinh/ThoiKhoaBieu] Viết thuật toán gộp tiết học trong thời khóa biểu:
Yêu cầu:
1. Nếu hai tiết học kề nhau có thời gian nghỉ giữa giờ dưới hoặc bằng 20 phút (khoảng cách giữa giờ kết thúc tiết trước và bắt đầu tiết sau <= 20 phút), tự động gộp thành một khối hiển thị liền mạch.
2. Hiển thị gộp thông tin môn học và cộng dồn khoảng thời gian giúp bảng lịch tuần gọn gàng, trực quan.
Chỉ sửa trúng đích file ThoiKhoaBieuView.tsx.`,
        description: 'Prompt tạo thuật toán gộp tiết học tự động tối ưu hóa diện tích hiển thị thời gian biểu.'
      }
    ]
  },
  {
    id: 'giaovien',
    name: 'Module Giáo viên (ModuleGiaoVien)',
    items: [
      {
        id: 'gv-excel',
        name: 'Nhập học sinh bằng Excel chống trùng',
        prompt: `[Sửa nhanh: ModuleGiaoVien/NhapHocSinh] Nâng cấp tính năng Nhập danh sách học sinh từ file Excel (.xlsx, .csv):
Yêu cầu:
1. Cho phép kéo thả hoặc chọn file Excel danh sách học sinh.
2. Thiết lập bộ lọc kiểm tra dữ liệu nghiêm ngặt chống trùng lặp theo Email hoặc Mã học sinh (MHS) so với cơ sở dữ liệu hiện tại.
3. Nếu phát hiện trùng lặp, hiển thị danh sách dòng bị trùng cảnh báo cho giáo viên chọn Ghi đè hoặc Bỏ qua.
Chỉ chỉnh sửa file NhapHocSinhView.tsx hoặc file xử lý danh sách học sinh liên quan.`,
        description: 'Prompt xây dựng bộ nhập liệu danh sách học sinh thông minh chống trùng lặp dữ liệu.'
      },
      {
        id: 'gv-sync-drive',
        name: 'Đồng bộ tự động Sổ điểm lên Google Drive',
        prompt: `[Sửa nhanh: ModuleGiaoVien/TheoDoiHocSinh] Thiết lập tính năng tự động lưu trữ và đồng bộ Sổ điểm lớp học:
Yêu cầu:
1. Mỗi khi giáo viên cập nhật điểm số hoặc nhận xét của học sinh, tự động ghi nhận và đồng bộ trực tiếp lên tệp cấu hình JSON tương ứng trên Google Drive của giáo viên sở tại.
2. Hiển thị trạng thái đồng bộ Realtime (Cloud icon chuyển xanh khi thành công) và thông tin Email Drive đang liên kết rõ ràng ở chân bảng sổ điểm.
Chỉ sửa trúng đích file TheoDoiHocSinhView.tsx.`,
        description: 'Prompt tích hợp đồng bộ dữ liệu điểm số tự động thời gian thực lên Google Drive cá nhân.'
      }
    ]
  },
  {
    id: 'system-auth',
    name: 'Module Hệ thống & Bảo mật (ModuleQuanTri)',
    items: [
      {
        id: 'sys-pin',
        name: 'Cấu hình mã bảo mật PIN lớp học',
        prompt: `[Sửa nhanh: ModuleQuanTri/PhanQuyenLopHoc] Thiết lập mã khóa PIN bảo mật cho lớp học:
Yêu cầu:
1. Khi giáo viên tạo lớp học mới, bắt buộc cấu hình mã bảo mật PIN gồm 4 hoặc 6 chữ số.
2. Học sinh muốn tham gia lớp bắt buộc phải nhập đúng mã PIN này.
3. Hỗ trợ cấu hình thời hạn hiệu lực của mã PIN (ví dụ: hiệu lực trong 24 giờ, 1 tuần, hoặc vô thời hạn).
Chỉ sửa trúng đích file PhanQuyenLopHocView.tsx.`,
        description: 'Prompt thiết lập bảo mật lớp học bằng hệ thống xác thực mã PIN động.'
      }
    ]
  },
  {
    id: 'toanhoc',
    name: 'Chuyên biệt Toán học & E-Learning',
    items: [
      {
        id: 'math-elearning-ppt',
        name: 'Tạo Web Side',
        prompt: `Đóng vai: Bạn là một chuyên gia lập trình Web front-end và một giáo viên Toán THPT tại Việt Nam.
Nhiệm vụ: Hãy tạo một trang web E-learning bài giảng (chỉ dùng một file HTML duy nhất chứa cả CSS và JS) dựa trên nội dung lý thuyết và hệ thống bài tập tôi cung cấp ở cuối.

YÊU CẦU VỀ CẤU TRÚC VÀ GIAO DIỆN (UI/UX):
1. Chế độ trình chiếu (PPT Mode): 
   - Giao diện căn giữa, khung trắng đổ bóng, bo góc mềm mại, responsive. Tổng thể giao diện trình chiếu phải đảm bảo sự gọn gàng, tinh tế và phân bổ cục rõ ràng giống như mẫu thiết kế tiêu chuẩn.
   - Thêm thanh cuộn ngang (horizontal scroll) cho vùng nội dung trong trường hợp nội dung (như bảng biến thiên, công thức dài) bị tràn màn hình ngang.
   - Bài giảng chia thành nhiều trang (Slide). Chuyển slide bằng nút điều hướng hoặc phím Space / Mũi tên trái / Mũi tên phải.
   - Các nội dung trong trang (tiêu đề, định lí, gạch đầu dòng, ví dụ) phải xuất hiện lần lượt từng bước (hiệu ứng fade-in) khi nhấn phím Space.
   - Đối với các phần bài tập dài (như Luyện tập, Rèn luyện), chỉ ghi tiêu đề phần (VD: "PHẦN LUYỆN TẬP" hoặc "PHẦN RÈN LUYỆN") 1 lần duy nhất ở slide đầu tiên của phần đó để giữ giao diện sạch sẽ, không lặp lại tiêu đề này ở các slide câu hỏi tiếp theo.
2. Thanh điều khiển lề phải (Sidebar):
   - Cố định bên phải màn hình, có nút tròn nổi (Floating Button) chứa biểu tượng 3 gạch (☰) để thu gọn thanh trượt vào lề hoặc mở ra (✕). Khi thu gọn, vùng trình chiếu tự động mở rộng ra toàn màn hình.
   - Cụm điều hướng: Số trang hiện tại (VD: 1/28), nút Trang trước, nút Tiếp theo.
   - Nút "Sửa danh sách": Mở Popup nhập/chỉnh sửa danh sách học sinh (lưu bằng LocalStorage).
   - Nút "Gọi ngẫu nhiên": Quay tên học sinh trực tiếp trên thanh điều khiển (Inline Roulette). Có hiệu ứng chạy chậm dần, khi dừng trúng tên sẽ nổ pháo giấy Confetti và phát âm thanh "Tada".
   - Nút "File HS (PDF)": Mở Popup cho phép in hoặc lưu file PDF gửi học sinh làm bài tập. Nội dung gồm Tóm tắt lý thuyết và toàn bộ đề bài các câu hỏi (tuyệt đối không xuất lời giải chi tiết), có checkbox tùy chọn kèm Bảng đáp án ngắn (A/B/C/D, Đ/S, số) ở cuối trang.
3. Hình ảnh trực quan bằng CSS thuần & Inline SVG (TUYỆT ĐỐI KHÔNG dùng ảnh chèn ngoài):
   - Không dùng thẻ <img> tải ảnh ngoài để tránh lỗi mất link khi chuyển máy.
   - Bảng biến thiên (BBT): Vẽ chuẩn phong cách gói TikZ (tkz-tab) của LaTeX bằng SVG vector nội tuyến. Mũi tên chiều biến thiên là đường thẳng dài liên tục nối từ điểm đầu mút đến điểm kết thúc, có chấm tròn đen tại gốc và mũi tên nhọn ở đầu; các giá trị cực trị/vô cực nằm sát cạnh mút mũi tên; đường gián đoạn thể hiện bằng vạch đôi (||) chuẩn xác.
   - Đồ thị hàm số và đồ thị đạo hàm: Dựng bằng thẻ <svg> nội tuyến với hệ trục tọa độ Oxy, vạch chia tỉ lệ, đường cong mềm mại và điểm nhấn toạ độ rõ ràng.
4. Định dạng Toán học:
   - Tích hợp thư viện MathJax 3 (hỗ trợ cả $inline$ và $$display$$).
   - Tuyệt đối không để lẫn các ký hiệu rác như trích dẫn nguồn.
   - Xử lý triệt để lỗi mất dấu gạch chéo ngược (\) khi render công thức Toán học (đặc biệt là các ký hiệu như dấu tương đương \Leftrightarrow, dấu suy ra \Rightarrow, v.v.). Đảm bảo escape các ký tự \ cẩn thận (ví dụ dùng \\ nếu nằm trong chuỗi JS) để MathJax có thể dịch đúng 100% công thức.
5. Tác quyền giáo viên:
   - Dưới góc phải mỗi slide luôn in nghiêng dòng chữ: "Được tạo bởi Đỗ Tấn Bảo".
   - Tiêu đề thông tin: "Giáo viên: Đỗ Tấn Bảo – Tổ Toán – Trường THPT Ba Gia".

YÊU CẦU VỀ HỆ THỐNG CÂU HỎI (QUIZ) VÀ TƯƠNG TÁC:
1. Mỗi câu hỏi nằm trên 1 trang (Slide) riêng biệt, gồm đủ 3 dạng chuẩn:
   - Trắc nghiệm 4 lựa chọn (MCQ).
   - Trắc nghiệm Đúng / Sai (chọn 4 ý a, b, c, d).
   - Trả lời ngắn (ô input nhập số nguyên hoặc số thập phân).
   - Giữ nguyên tuyệt đối tiền tố và cách đánh số từ dữ liệu gốc. Ví dụ: Nếu gốc ghi là "TNLC 1.", "TNDS 1.", "TLN 1.", "Ví dụ 1", "Bài 1", "Câu 1"... thì phải giữ nguyên chính xác từng chữ, tuyệt đối không tự động đổi tất cả thành "Câu...".
2. Bộ đếm thời gian: Mỗi câu có nút bắt đầu đếm ngược (45s, 60s, 90s...). Khi hết giờ tự động hiển thị chữ "HẾT GIỜ!" và tự kích hoạt tính năng "Gọi ngẫu nhiên" học sinh. Đặc biệt lưu ý: Nếu thanh bên (Sidebar) đang ở trạng thái ẩn, khi thời gian đếm ngược kết thúc, hệ thống phải tự động mở thanh bên ra để học sinh nhìn thấy vòng quay tên.
3. Nút "Kiểm tra đáp án":
   - Trả lời ĐÚNG: Khung viền nháy màu xanh lá, phát âm thanh "Success" và nổ pháo giấy Confetti ngay tại câu hỏi.
   - Trả lời SAI: Khung viền nháy màu đỏ, hiệu ứng rung lắc (shake animation) và phát âm thanh "Error".
   - Sau khi kiểm tra, tự động hiển thị khung Lời giải chi tiết bên dưới.

DỮ LIỆU TÀI NGUYÊN (CDN):
- Success Audio: https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3
- Error Audio: https://assets.mixkit.co/active_storage/sfx/2997/2997-preview.mp3
- Tada Audio: https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3
- Thư viện Confetti: https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js
- Thư viện MathJax: https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js

QUY TRÌNH LÀM VIỆC:
Bước 1: Khi tôi gửi nội dung bài học, bạn hãy tóm tắt lý thuyết trọng tâm và đề xuất danh sách câu hỏi theo đúng cấu trúc (số lượng câu MCQ, Đúng/Sai, Trả lời ngắn) để tôi duyệt.
Bước 2: Sau khi tôi duyệt nội dung, bạn sẽ xuất trọn vẹn toàn bộ mã nguồn file HTML duy nhất theo đúng các tiêu chuẩn trên. Đảm bảo giao diện CSS sạch sẽ, hiện đại.

---------------------------------------------------
NỘI DUNG BÀI HỌC CẦN SOẠN DƯỚI ĐÂY:
[Dán nội dung bài học hoặc tài liệu SGK mới vào đây]`,
        description: 'Prompt tối ưu hóa thiết lập giáo án trình chiếu PPT Toán cho thầy Đỗ Tấn Bảo, tích hợp MathJax 3, vẽ SVG TikZ và Roulette quay vòng.'
      }
    ]
  }
];

export const LuuPromptChuanView: React.FC = () => {
  const [selectedGroupId, setSelectedGroupId] = useState<string>(DEFAULT_PROMPT_GROUPS[0].id);
  const [selectedPromptId, setSelectedPromptId] = useState<string>(
    DEFAULT_PROMPT_GROUPS[0].items[0]?.id || ''
  );
  const [copied, setCopied] = useState<boolean>(false);

  const selectedGroup = DEFAULT_PROMPT_GROUPS.find(g => g.id === selectedGroupId);
  const selectedPrompt = selectedGroup?.items.find(item => item.id === selectedPromptId);

  const handleGroupChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const groupId = e.target.value;
    setSelectedGroupId(groupId);
    const group = DEFAULT_PROMPT_GROUPS.find(g => g.id === groupId);
    if (group && group.items.length > 0) {
      setSelectedPromptId(group.items[0].id);
    } else {
      setSelectedPromptId('');
    }
  };

  const handleCopy = async () => {
    if (!selectedPrompt) return;
    try {
      await navigator.clipboard.writeText(selectedPrompt.prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy prompt:', err);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header Panel */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-6 shadow-xl border border-slate-800">
        <div className="flex items-center gap-3.5 mb-2">
          <div className="p-2.5 bg-indigo-500/20 rounded-xl text-indigo-400 border border-indigo-500/30">
            <BookMarked className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              Kho Prompt Lệnh Chuẩn
              <span className="text-[10px] uppercase font-bold tracking-widest bg-indigo-500 text-white px-2 py-0.5 rounded-full">
                Developer Only
              </span>
            </h1>
            <p className="text-sm text-slate-300">
              Tra cứu và sao chép nhanh các câu lệnh sửa đổi ứng dụng tối ưu hóa riêng cho hệ thống cấu trúc LopU.
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid Interface */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Control Column (Dropdowns) */}
        <div className="md:col-span-1 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Terminal className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Cấu hình tra cứu</h2>
          </div>

          {/* Dropdown 1: Nhóm Prompt */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">Chọn nhóm module:</label>
            <select
              value={selectedGroupId}
              onChange={handleGroupChange}
              className="w-full text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all cursor-pointer"
            >
              {DEFAULT_PROMPT_GROUPS.map(group => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>

          {/* Dropdown 2: Prompt cụ thể */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">Chọn yêu cầu cụ thể:</label>
            <select
              value={selectedPromptId}
              onChange={e => setSelectedPromptId(e.target.value)}
              className="w-full text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all cursor-pointer"
            >
              {selectedGroup?.items.map(item => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          {/* Prompt Description block */}
          {selectedPrompt && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-700 space-y-1">
              <span className="font-bold text-indigo-700">Mô tả tác dụng:</span>
              <p className="font-medium leading-relaxed">{selectedPrompt.description}</p>
            </div>
          )}
        </div>

        {/* Right Output Column (Prompt display and Copy) */}
        <div className="md:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col min-h-[350px]">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Nội dung câu lệnh tối ưu</h2>
            </div>

            {selectedPrompt && (
              <button
                onClick={handleCopy}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 animate-bounce" />
                    Đã copy thành công!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Sao chép Prompt
                  </>
                )}
              </button>
            )}
          </div>

          {selectedPrompt ? (
            <div className="flex-1 flex flex-col">
              <textarea
                readOnly
                value={selectedPrompt.prompt}
                className="w-full flex-1 p-4 bg-slate-950 text-slate-100 font-mono text-xs leading-relaxed rounded-xl border border-slate-800 focus:outline-none resize-none shadow-inner"
                onClick={e => (e.target as HTMLTextAreaElement).select()}
              />
              <div className="mt-3 flex items-center justify-between text-[11px] text-slate-700 font-semibold bg-indigo-50 border border-indigo-100 p-2.5 rounded-lg">
                <div className="flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Dán thẳng nội dung trên vào khung chat AI Studio để thực hiện sửa đổi siêu tốc.</span>
                </div>
                <span className="text-[10px] font-bold text-indigo-700">Ctrl + V</span>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center border-2 border-dashed border-slate-200 rounded-xl">
              <Terminal className="w-12 h-12 text-slate-300 mb-2" />
              <p className="font-semibold text-sm">Vui lòng chọn đầy đủ nhóm và yêu cầu cụ thể để hiển thị Prompt.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
