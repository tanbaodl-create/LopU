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
    id: 'toanhoc',
    name: 'Toán và E-learning',
    items: [
      {
        id: 'lam-chuyen-de',
        name: 'Làm chuyên đề',
        prompt: `Đóng vai là một chuyên gia sư phạm môn Toán THPT. Hãy giúp tôi soạn tài liệu chuyên đề bám sát chương trình giáo dục phổ thông 2018 (sách Kết nối tri thức).

QUY TRÌNH LÀM VIỆC TƯƠNG TÁC (BẮT BUỘC TUÂN THỦ TỪNG BƯỚC):
Bạn tuyệt đối không được tự ý soạn toàn bộ tài liệu ngay lập tức. Hãy thực hiện tuần tự theo 4 bước sau, ở mỗi bước PHẢI DỪNG LẠI VÀ CHỜ TÔI PHẢN HỒI rồi mới được chuyển sang bước tiếp theo.

BƯỚC 1: Hỏi Tên chuyên đề

Bạn hãy hỏi tôi: "Chào thầy, thầy muốn soạn chuyên đề hoặc dạng bài toán nào hôm nay?"

[DỪNG LẠI VÀ CHỜ TÔI NHẬP TÊN CHUYÊN ĐỀ]

BƯỚC 2: Đề xuất Dàn ý và Mô tả mức độ
Dựa vào tên chuyên đề tôi vừa cung cấp, bạn hãy đề xuất:

Dàn ý các mục lý thuyết trọng tâm (Mục 1, Mục 2,...).

Mô tả chi tiết 4 mức độ nhận thức áp dụng riêng cho chuyên đề này:

M1: Biết

M2: Hiểu

M3: Vận dụng

M4: Vận dụng cao

Hãy mời tôi nhận xét, thay đổi hoặc chốt phương án.

[DỪNG LẠI VÀ CHỜ TÔI CHỐT DÀN Ý & MỨC ĐỘ]

BƯỚC 3: Đề xuất Ma trận câu hỏi
Sau khi tôi chốt Bước 2, bạn hãy đề xuất Ma trận số lượng câu hỏi cho 2 phần (Lưu ý: Bỏ hoàn toàn phần "Ví dụ rèn luyện" ở phần Luyện tập, chỉ còn bài tập):

PHẦN B. LUYỆN TẬP TẠI LỚP: Số lượng câu Trắc nghiệm 4 lựa chọn, Trắc nghiệm Đúng/Sai, Trả lời ngắn.

PHẦN C. RÈN LUYỆN TẠI NHÀ: Số lượng câu Trắc nghiệm 4 lựa chọn, Trắc nghiệm Đúng/Sai, Trả lời ngắn (Đề xuất lồng ghép câu hỏi mô hình hóa thực tế nếu có).

Hãy mời tôi nhận xét, thay đổi số lượng hoặc chốt ma trận.

[DỪNG LẠI VÀ CHỜ TÔI CHỐT MA TRẬN]

BƯỚC 4: Xuất toàn bộ tài liệu
CHỈ SAU KHI tôi chốt Ma trận ở Bước 3, bạn mới tiến hành soạn thảo 100% nội dung tài liệu chi tiết và xuất ra ĐÚNG ĐỊNH DẠNG DƯỚI ĐÂY:

YÊU CẦU TUYỆT ĐỐI VỀ ĐỊNH DẠNG VÀ CẤU TRÚC Ở BƯỚC 4:
1. Định dạng văn bản (Bắt buộc):

KHÔNG sử dụng các ký tự định dạng Markdown (như dấu thăng #, dấu sao *, gạch ngang -). Chỉ xuất văn bản thuần túy (plain text) để không bị lỗi khi dán vào Word.

Toàn bộ công thức, biểu thức, ký hiệu toán học và biến số (kể cả đứng độc lập trong câu chữ) BẮT BUỘC phải được bọc trong cặp dấu $ đơn. Tuyệt đối không dùng dấu đô la kép $$.

Cấu trúc trình bày bài tập:
Câu [Số thứ tự]. (M1/M2/M3/M4) [Nội dung câu hỏi]
Lời giải
[Nội dung lập luận, phân tích và giải chi tiết]
Đáp án: [Kết quả cuối cùng].

2. Cấu trúc nội dung:
PHẦN A. LÝ THUYẾT TRỌNG TÂM:

Triển khai theo đúng dàn ý đã chốt ở Bước 2.

QUAN TRỌNG: Ngay sau phần trình bày lý thuyết của mỗi Mục, BẮT BUỘC phải có các Ví dụ (Ví dụ 1, Ví dụ 2...) minh họa trực tiếp cho lý thuyết đó kèm lời giải chi tiết.

PHẦN B. LUYỆN TẬP TẠI LỚP:

Soạn đúng số lượng và thể loại câu hỏi theo Ma trận đã chốt ở Bước 3. (Gồm: I. Trắc nghiệm lựa chọn; II. Trắc nghiệm Đúng/Sai; III. Trả lời ngắn).

PHẦN C. RÈN LUYỆN TẠI NHÀ:

Soạn đúng số lượng và thể loại câu hỏi theo Ma trận đã chốt ở Bước 3. (Gồm: I. Trắc nghiệm lựa chọn; II. Trắc nghiệm Đúng/Sai; III. Trả lời ngắn).

Bây giờ, hãy thực hiện BƯỚC 1!`,
        description: 'Prompt quy trình 4 bước tương tác sư phạm Toán THPT biên soạn tài liệu chuyên đề bám sát SGK Kết nối tri thức 2018 (Dàn ý, Ma trận, Lý thuyết kèm ví dụ & Bài tập Luyện tập/Rèn luyện).'
      },
      {
        id: 'math-elearning-ppt',
        name: 'Tạo Web Slide',
        prompt: `Dưới đây là nguyên lý kỹ thuật giải quyết triệt để lỗi bị đè mực và toàn bộ bản **Prompt hoàn chỉnh mới nhất** đã được tích hợp bộ chọn màu phong phú cùng thuật toán vẽ chuẩn cho Highlight:

### Giải pháp kỹ thuật xử lý triệt để lỗi mực Highlight:

1. **Thiết lập chế độ hòa trộn (\`mix-blend-mode\` & \`globalCompositeOperation\`):**
* **CSS trên thẻ canvas:** Gán thuộc tính \`mix-blend-mode: multiply;\` trực tiếp lên \`<canvas>\` để mọi nét vẽ hòa trộn thấu kính vào nền văn bản và công thức Toán bên dưới.
* **Canvas 2D Context:** Khi kích hoạt Highlight, thiết lập \`ctx.globalCompositeOperation = 'multiply'\` (hoặc sử dụng kỹ thuật đệm canvas phụ *Offscreen Canvas* khi kéo nét chuột) để các điểm trùng lặp trong một nét vẽ **không bị cộng dồn chỉ số Alpha**, giữ cho nét highlight luôn luôn trong suốt và thấy rõ 100% từng nét chữ/công thức Toán phía dưới.


2. **Bộ bảng màu (Color Palette):**
* **Bút viết (Pen):** Đỏ, Xanh dương, Xanh lá, Đen, Vàng cam, Tím (kèm ô chọn màu tự do \`input[type="color"]\`).
* **Highlight:** Vàng dạ quang, Xanh lá neon, Cam pastel, Hồng neon, Xanh ngọc dạ quang (kèm ô chọn màu tự do).



---

### BẢN PROMPT TẠO GIÁO ÁN E-LEARNING HOÀN CHỈNH

\`\`\`markdown
Đóng vai: Bạn là một chuyên gia lập trình Web Front-end và một giáo viên Toán THPT tại Việt Nam.
Nhiệm vụ: Hãy tạo một trang web E-learning bài giảng (chỉ dùng một file HTML duy nhất chứa cả CSS và JS) dựa trên nội dung lý thuyết và hệ thống bài tập tôi cung cấp ở cuối.

YÊU CẦU VỀ NỘI DUNG VÀ CẤU TRÚC SƯ PHẠM (TUYỆT ĐỐI TUÂN THỦ):
1. Giữ nguyên 100% nội dung gốc: Chỉ lấy đúng nội dung trong mục "NỘI DUNG BÀI HỌC CẦN SOẠN DƯỚI ĐÂY", không tự ý thêm các phần lý thuyết hay bài tập không có trong văn bản được cung cấp.
2. Tuân thủ trật tự sư phạm "Lý thuyết gắn liền Ví dụ minh họa":
   - Tuyệt đối giữ đúng trình tự xuất hiện của tài liệu gốc: Sau mỗi đơn vị kiến thức/định lí/công thức sẽ là các Ví dụ áp dụng trực tiếp cho phần kiến thức đó (không gom dồn toàn bộ ví dụ về cuối bài).
   - Chỉ các bài tập thuộc phần Luyện tập/Rèn luyện/Củng cố ở cuối tài liệu mới được xếp vào phần bài tập tổng hợp sau cùng.
3. Ưu tiên trực quan hóa bằng hình vẽ ở mọi phần lý thuyết:
   - Tất cả các định nghĩa, định lý, tính chất, hình mẫu hoặc quy tắc trong phần lý thuyết BẮT BUỘC phải ưu tiên dựng hình minh họa đi kèm (chia bố cục 2 cột: 1 bên chữ/công thức, 1 bên hình vẽ trực quan).
   - Hình vẽ hình học & Sơ đồ minh họa: Sử dụng thuần CSS kết hợp SVG vector nội tuyến (inline SVG) sắc nét, responsive và màu sắc hài hòa.
   - Đồ thị hàm số & Bảng biến thiên (BBT): Sử dụng TikZ hoặc tikz-tab (nhúng qua TikZJax: https://tikzjax.com/v1/tikzjax.js hoặc render khối SVG tương đương từ mã TikZ chuẩn) để vẽ bảng biến thiên và hệ trục tọa độ, đồ thị hàm số chuẩn xác 100% theo quy chuẩn Toán học THPT Việt Nam (đầy đủ mũi tên biến thiên, các điểm cực trị, tiệm cận, nhãn trục Oxy).

QUY TẮC BẮT BUỘC ĐỂ TRÁNH LỖI "Math input error" (CỰC KỲ QUAN TRỌNG):
1. Cú pháp bọc công thức đồng nhất:
   - Tuyệt đối KHÔNG sử dụng \\( và \\) để bọc công thức. Toàn bộ công thức toán nội dòng PHẢI đồng nhất sử dụng cặp dấu đô la $công thức$, công thức riêng dòng dùng $$công thức$$.
2. Xử lý triệt để bẫy ký tự \\t (Tab character):
   - Tuyệt đối KHÔNG lạm dụng lệnh \\text{...} bên trong công thức để ghi đơn vị đo hay chữ tiếng Việt (ví dụ: \\text{ cm}, \\text{ m/s}, \\text{ N}). Trình duyệt sẽ hiểu nhầm \\t thành phím Tab (\\text) làm hỏng cú pháp MathJax.
   - Mọi đơn vị đo lường và từ ngữ tiếng Việt PHẢI đưa ra ngoài dấu $, đặt ở dạng chữ thường HTML (Ví dụ viết: $\\vert\\vec{AB} + \\vec{AD}\\vert = 5$ cm; thay vì viết $\\vert{}\\vec{AB} + \\vec{AD}\\vert{} = 5\\text{ cm}$).
3. Quy tắc Escape chuỗi 2 tầng trong JavaScript:
   - Mọi lệnh LaTeX bắt đầu bằng \\ nằm trong chuỗi slideData hoặc template string \`\${...}\` đều phải escape tối thiểu 2 đến 4 dấu gạch chéo ngược (ví dụ: \\\\\\\\vec, \\\\\\\\Delta, \\\\\\\\cos, \\\\\\\\sqrt, \\\\\\\\frac, \\\\\\\\iff, \\\\\\\\Rightarrow, \\\\\\\\mathbb{R}, \\\\\\\\begin{cases}, \\\\\\\\end{cases}, dấu xuống dòng \\\\\\\\\\\\\\\\) để khi trình duyệt gán qua innerHTML không bị nuốt mất ký tự gạch chéo, đảm bảo MathJax nhận đúng mã LaTeX chuẩn.

YÊU CẦU VỀ CẤU TRÚC VÀ GIAO DIỆN (UI/UX):
1. Chế độ trình chiếu (PPT Mode): 
   - Giao diện khung bài giảng màu trắng đổ bóng nhẹ, bo góc mềm mại, đặt trên nền xám nhạt hiện đại.
   - Tuyệt đối không đặt thanh tiêu đề/hướng dẫn rác ở phía trên khung slide (giữ slide sạch sẽ, thoáng đãng).
   - Xử lý triệt để tràn màn hình và chống cắt lề trái khi zoom: Sử dụng display: flex, vùng chứa (container) áp dụng overflow-x: auto kết hợp min-width: fit-content; slide card có min-width hợp lý (khoảng 800px - 820px). Đảm bảo khi người dùng phóng to (zoom > 200%) trình duyệt hoặc khi công thức dài, thanh cuộn ngang xuất hiện và có thể cuộn trọn vẹn từ mép trái sang mép phải, TUYỆT ĐỐI KHÔNG để mép lề trái bị che khuất hay cắt xén.
   - Bài giảng chia thành nhiều trang (Slide). Chuyển slide bằng nút điều hướng hoặc phím Space / Mũi tên trái (←) / Mũi tên phải (→).
   - Các nội dung trong trang (tiêu đề, định lí, gạch đầu dòng, ví dụ) xuất hiện lần lượt từng bước (fade-in) khi bấm phím Space.
   - Đối với các phần bài tập dài ở cuối bài (Luyện tập, Rèn luyện): Dùng 1 slide chuyển mục riêng để ghi tiêu đề phần (VD: "PHẦN LUYỆN TẬP VÀ RÈN LUYỆN") duy nhất 1 lần, các slide câu hỏi kế tiếp không lặp lại tiêu đề phần này.

2. Chân trang và Tác quyền giáo viên:
   - Dưới chân các slide chỉ hiển thị duy nhất 01 dòng tác quyền in nghiêng căn sát lề phải: "Được tạo bởi Đỗ Tấn Bảo". 
   - Không chèn thêm dòng tên trường hay tên giáo viên ở góc trái chân slide để giao diện tinh giản.
   - Thông tin giáo viên ("Giáo viên: Đỗ Tấn Bảo – Tổ Toán – Trường THPT Ba Gia") được đặt gọn gàng ở Slide 1 (Slide bìa).

3. BỘ CÔNG CỤ VẼ TRỰC TIẾP TRÊN MÀN HÌNH (CANVAS DRAWING & HIGHLIGHTER):
   - Tạo một lớp Canvas trong suốt bao phủ toàn màn hình (\`position: fixed; inset: 0; z-index: 9000; pointer-events: none; mix-blend-mode: multiply;\`).
   - Kỹ thuật xử lý mực Highlight chống đè đậm: Khi vẽ Highlight, thiết lập \`ctx.globalCompositeOperation = 'multiply'\` (hoặc dùng kỹ thuật đệm canvas phụ Offscreen Canvas khi kéo nét chuột) để các điểm trùng lặp trong một nét vẽ KHÔNG BỊ CỘNG DỒN CHỈ SỐ ALPHA, giữ cho nét highlight luôn luôn trong suốt và thấy rõ 100% từng nét chữ/công thức Toán phía dưới.
   - Bộ bảng màu phong phú (Color Palette):
     + Nút Bút viết (icon ✏️): Đỏ, Xanh dương, Xanh lá, Đen, Vàng cam, Tím (kèm ô chọn màu tự do \`input[type="color"]\`).
     + Nút Bút dạ quang Highlight (icon 🖍️): Vàng dạ quang, Xanh lá neon, Cam pastel, Hồng neon, Xanh ngọc dạ quang (kèm ô chọn màu tự do \`input[type="color"]\`).
   - Bộ điều chỉnh độ dày nét bút: Slider hoặc 3 nấc kích thước nhanh (Mảnh: 2px đối với Pen / 12px đối với Highlight; Vừa: 5px đối với Pen / 20px đối với Highlight; Dày: 9px đối với Pen / 30px đối với Highlight). Tự động áp dụng ngay cho loại bút đang kích hoạt.
   - Nút Xóa bảng (icon 🗑️ hoặc 🧹): Xóa toàn bộ nét vẽ của slide hiện tại.
   - Nút Đóng chế độ vẽ (icon ❌): Trả chuột về chế độ thao tác thông thường.
   - Tự động xóa nét vẽ khi chuyển sang Slide khác.

4. Cụm công cụ Gọi học sinh nổi neo GÓC TRÊN BÊN PHẢI (Top-Right Tools):
   - ĐỘ ĐỘC LẬP TỈ LỆ (100% SCALE): Toàn bộ cụm nút nổi và thẻ hiển thị cố định ở góc trên bên phải màn hình (position: fixed; top: 20px; right: 20px; z-index: 99999). Thiết lập CSS theo đơn vị pixel cố định để dù màn hình bài giảng bị phóng to hay thu nhỏ (zoom trình duyệt 25% - 500%), toàn bộ cụm nút và ô hiện tên vẫn giữ nguyên tỉ lệ 100% sắc nét.
   - NÚT BẤM VÀ CÀI ĐẶT:
     + Nút quay chính mang biểu tượng Vòng quay/Xúc xắc (🎲 hoặc 🔄).
     + Bộ chọn số lượng học sinh: Mặc định là 1, có nút [-] [+] để điều chỉnh. 
     + GIỚI HẠN SỐ LƯỢNG QUAY: Số lượng quay tối đa cho phép chọn bằng đúng 4/5 (tức 80%) tổng số học sinh hiện có trong danh sách (tính bằng công thức Math.floor(danhSach.length * 0.8)). Nếu số lượng vượt quá mức này, nút [+] tự động khóa hoặc thông báo cảnh báo.
     + Nút Bút vẽ (icon ✏️) nằm cạnh cụm công cụ để mở nhanh thanh vẽ/highlight bất kỳ lúc nào.
     + Kế bên dưới nút quay là nút Cài đặt (icon ⚙ hoặc ⋮). Khi bấm vào, xổ ra 2 nút con phía dưới:
       * Nút "Sửa danh sách" (icon 📝): Mở popup thêm/sửa danh sách học sinh (lưu LocalStorage). Tự động cập nhật lại giới hạn 4/5 số lượng quay ngay sau khi lưu.
       * Nút "Xuất file HS" (icon 📄): Mở popup xuất/in PDF gồm Tóm tắt lý thuyết và toàn bộ Đề bài (tuyệt đối không kèm lời giải, có checkbox tùy chọn bảng đáp án ngắn ở cuối).
   - Ô HIỂN THỊ TÊN VÀ CHU TRÌNH QUAY TUẦN TỰ TỪNG HỌC SINH (SEQUENTIAL ASYNC MULTI-PICK):
     + KHÔNG MỞ CỬA SỔ/POPUP MỚI: Thẻ danh sách trượt dài ra ngay BÊN TRÁI cụm biểu tượng góc trên bên phải, hiển thị N hàng danh sách tương ứng số lượng cần gọi.
     + YÊU CẦU KỸ THUẬT BẮT BUỘC ĐỂ TRÁNH ĐỨNG HÌNH:
       * TUYỆT ĐỐI KHÔNG dùng vòng lặp for/forEach thông thường lồng setInterval để chạy đồng thời.
       * BẮT BUỘC dùng cơ chế async/await kết hợp Promise để quay tuần tự: Học sinh thứ nhất quay xong, Promise resolve() thì hàm await mới kích hoạt quay học sinh thứ 2, thứ 3...
       * Mỗi học sinh quay trong đúng 4 GIÂY: Chạy lướt cực nhanh trong 2.5s đầu và giảm tốc rõ rệt trong 1.5s cuối.
       * Khi chốt tên học sinh thứ i: Hàng thứ i sáng rực ánh neon, phát âm thanh Tada và nổ pháo hoa Confetti hoặc trái tim ĐÚNG VỊ TRÍ hàng i (sử dụng tọa độ getBoundingClientRect()). Đồng thời loại học sinh này khỏi danh sách tạm để không bị chọn trùng.
       * Sau đó tự động chuyển sang quay hàng thứ i + 1.
     + Luân phiên ngẫu nhiên 5 mẫu hiệu ứng (3 kiểu pháo hoa rực rỡ và 2 kiểu bung nổ hình trái tim bằng shapes: ['heart']) tại từng hàng tương ứng.
     + Sau khi chốt đủ toàn bộ danh sách, cả bảng tên hiển thị đầy đủ trong 10 giây (kèm nút x đóng nhanh) trước khi tự động thu gọn.

YÊU CẦU VỀ HỆ THỐNG CÂU HỎI (QUIZ):
1. Mỗi câu hỏi nằm trên 1 Slide riêng biệt, gồm đủ 3 dạng chuẩn:
   - Trắc nghiệm 4 lựa chọn (MCQ).
   - Trắc nghiệm Đúng / Sai (chọn 4 ý a, b, c, d).
   - Trả lời ngắn (ô input nhập số nguyên hoặc số thập phân).
   - Giữ nguyên tuyệt đối tiền tố và cách đánh số từ dữ liệu gốc (VD: "TNLC 1.", "TNDS 1.", "TLN 1.", "Ví dụ 1"...).
2. Bộ đếm thời gian & Tự kích hoạt gọi học sinh:
   - Mỗi câu có nút bắt đầu đếm ngược (45s, 60s, 90s...). Khi hết giờ, tự động đổi màu hiển thị "HẾT GIỜ!" và tự động kích hoạt tính năng quay gọi học sinh tuần tự theo số lượng đang thiết lập hiện tại.
3. Nút "Kiểm tra đáp án":
   - ĐÚNG: Nháy viền xanh, nổ Confetti, phát âm thanh Success.
   - SAI: Nháy viền đỏ, rung lắc (shake animation), phát âm thanh Error.
   - Tự động hiển thị khung Lời giải chi tiết bên dưới ngay sau khi kiểm tra.

DỮ LIỆU CDN CẦN DÙNG:
- Success Audio: https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3
- Error Audio: https://assets.mixkit.co/active_storage/sfx/2997/2997-preview.mp3
- Tada Audio: https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3
- Confetti: https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js
- MathJax 3: https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js
- TikZJax (hỗ trợ tikz & tikz-tab): https://tikzjax.com/v1/tikzjax.js

QUY TRÌNH THỰC HIỆN 2 BƯỚC BẮT BUỘC:
- BƯỚC 1: TIẾP NHẬN, ĐỀ XUẤT VÀ CHỜ DUYỆT (TUYỆT ĐỐI CHƯA ĐƯỢC XUẤT CODE HTML Ở BƯỚC NÀY):
   + Tóm tắt chi tiết cấu trúc tiến trình bài giảng theo đúng trật tự: Mục lý thuyết nào -> Hình vẽ/đồ thị/BBT dự kiến đi kèm -> Các ví dụ minh họa đi kèm mục đó -> Phần bài tập rèn luyện cuối bài.
   + Thống kê rõ số lượng slide và danh sách câu hỏi từng phần để tôi xem xét.
   + DỪNG LẠI và hỏi ý kiến tôi xem cần chỉnh sửa, thêm bớt hay điều chỉnh gì về tiến trình này không.
- BƯỚC 2: XUẤT MÃ NGUỒN HOÀN CHỈNH:
   + CHỈ KHI tôi phản hồi đã đồng ý/xác nhận với tiến trình dạy học ở Bước 1, bạn mới bắt đầu tạo và XUẤT TRỰC TIẾP TOÀN BỘ MÃ NGUỒN VÀO TRÌNH BIÊN DỊCH MÃ (code block markdown) trong một file duy nhất để tôi chỉ cần bấm nút Copy (tuyệt đối không xuất dưới dạng file đính kèm).

---------------------------------------------------
NỘI DUNG BÀI HỌC CẦN SOẠN DƯỚI ĐÂY:
[Dán nội dung lý thuyết, ví dụ và bài tập của bài học mới vào đây]
\`\`\``,
        description: 'Bản Prompt tối ưu hoàn chỉnh mới nhất tạo Web Slide E-learning Toán THPT (1 file HTML): Giải pháp hòa trộn mix-blend-mode & multiply chống đè mực highlight, bộ chọn màu đa dạng (Pen & Highlight), trực quan TikZ/tikz-tab, chuẩn MathJax chống lỗi, quay gọi học sinh tuần tự async/await và câu hỏi tương tác Quiz.'
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
            <label className="text-xs font-bold text-slate-700 block">Chọn nhóm yêu cầu:</label>
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
