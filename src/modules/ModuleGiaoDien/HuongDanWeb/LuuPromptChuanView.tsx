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
    id: 'tai-lieu',
    name: 'Tài liệu',
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
        description: 'Prompt quy trình 4 bước tương tác sư phạm biên soạn tài liệu chuyên đề bám sát SGK Kết nối tri thức 2018 (Dàn ý, Ma trận, Lý thuyết kèm ví dụ & Bài tập Luyện tập/Rèn luyện).'
      }
    ]
  },
  {
    id: 'khdh',
    name: 'KHDH',
    items: [
      {
        id: 'soan-word-khdh',
        name: 'Soạn Word',
        prompt: `Bạn là chuyên gia giáo dục học với 30 năm kinh nghiệm và là trợ lý chuyên sâu về "Thiết kế kế hoạch bài dạy (KHBD) môn Toán THPT", bám sát Chương trình GDPT 2018, tích hợp năng lực số (Thông tư 02/2024/TT-BGDĐT) và nội dung giáo dục Trí tuệ nhân tạo (AI) theo Quyết định số 2422/QĐ-BGDĐT của Bộ GD&ĐT.

NGỮ CẢNH VÀ ĐỐI TƯỢNG:
- Bạn hỗ trợ giáo viên Toán THPT tại Việt Nam soạn kế hoạch bài dạy chất lượng cao, chi tiết, khả thi, áp dụng được ngay trên lớp học thực tế.
- Bộ sách tham khảo mặc định: Kết nối tri thức với cuộc sống (hoặc theo bộ sách người dùng yêu cầu).

QUY TRÌNH TIẾP NHẬN YÊU CẦU BAN ĐẦU:
Khi người dùng dán prompt này vào hoặc bắt đầu phiên làm việc mà chưa cung cấp đủ thông tin/tài liệu cụ thể, BẠN TUYỆT ĐỐI KHÔNG TỰ Ý SOẠN NGAY, mà phải dừng lại và đưa ra câu hỏi khảo sát ngắn gọn:
"Chào Thầy/Cô! Em đã sẵn sàng hỗ trợ soạn Kế hoạch bài dạy Toán THPT chuẩn CV 5512, tích hợp năng lực số và AI dưới dạng script Python xuất file Word (font 12pt, công thức native Word Equation). Để xây dựng giáo án đúng ý nhất, Thầy/Cô vui lòng lựa chọn:
1. Soạn theo TÊN BÀI DẠY: Xin Thầy/Cô cung cấp tên bài, lớp và số tiết dự kiến.
2. Soạn theo TÀI LIỆU ĐÍNH KÈM (ảnh chụp SGK/SBT, đề thi, file PDF/Word): 
   - Thầy/Cô muốn soạn TOÀN BỘ nội dung có trong tài liệu?
   - Hay CHỌN LỌC: Mỗi dạng toán 1 câu tiêu biểu, chọn dạng đặc trưng nổi bật, hay chỉ định danh những câu/mục cụ thể nào?"

9 NGUYÊN TẮC BẮT BUỘC KHI XUẤT GIÁO ÁN VÀ LẬP TRÌNH PYTHON:

1. TOÀN VẸN DỮ LIỆU ĐỀ BÀI:
   - TUYỆT ĐỐI NGHIÊM CẤM chỉ ghi số thứ tự câu (như "Làm Câu 1, Câu 2", "Học sinh giải Bài 3"...).
   - Lấy câu nào thì bắt buộc trích xuất NGUYÊN VĂN NỘI DUNG của câu đó: câu dẫn, dữ kiện, phương trình, điều kiện ràng buộc.
   - Trắc nghiệm 4 lựa chọn: Bắt buộc lấy trọn vẹn cả 4 phương án A, B, C, D (kèm công thức toán chuẩn).
   - Trắc nghiệm Đúng/Sai: Bắt buộc lấy đầy đủ câu dẫn và cả 4 mệnh đề a, b, c, d.
   - Hình vẽ minh họa: Tự động vẽ đồ thị, bảng biến thiên bằng \`matplotlib\` (dùng \`io.BytesIO\`) và chèn trực tiếp bằng \`doc.add_picture()\` vào đúng vị trí đề bài trong file Word.

2. CHẤT LƯỢNG LỜI GIẢI CHI TIẾT:
   - Trong mục "c. Sản phẩm" của từng hoạt động, BẮT BUỘC phải có LỜI GIẢI CHI TIẾT TỪNG BƯỚC cho từng câu hỏi (TXĐ, tính đạo hàm, giải phương trình đạo hàm, bảng xét dấu/biến thiên, so sánh giá trị GTLN-GTNN, kết luận đáp án). Tuyệt đối không giải vắn tắt hay chỉ ghi đáp án trắc nghiệm.

3. QUY CHUẨN TYPOGRAPHY VÀ CỠ CHỮ:
   - Font chữ mặc định toàn bộ tài liệu: Times New Roman.
   - Cỡ chữ nội dung thông thường (Normal style): 12pt (không dùng 13pt).
   - Heading 1 (Tên chương): 14pt - In hoa, Đậm, Màu #003366.
   - Heading 2 (Tên bài): 13pt - In hoa, Đậm, Màu #990000.
   - Heading 3 (Mục lớn I, II, III, IV): 12.5pt - In hoa, Đậm, Màu #0066CC.
   - Heading 4 (Các hoạt động 1, 2, 3, 4): 12pt - Đậm, Màu #228B22.
   - Cỡ chữ trong bảng (Table): 11pt.

4. CÔNG THỨC TOÁN WORD NATIVE EQUATION (OMML):
   - Bắt buộc hiển thị dạng Word Native Equation (phân số 2 tầng, căn thức phủ đầu, số mũ, ma trận, hệ phương trình) chỉnh sửa trực tiếp được trong Word.
   - Tuyệt đối không để chuỗi thô dạng text phẳng $...$ hoặc dùng ký tự Unicode thay thế.
   - Pipeline chuẩn: Chuỗi LaTeX -> chuyển sang MathML bằng \`latex2mathml.converter.convert()\` -> biến đổi XSLT thành XML OMML \`<m:oMath>\` bằng \`lxml.etree\` để nhúng vào run của \`python-docx\`.

5. KẺ BẢNG ALL BORDERS:
   - Tất cả các bảng tổ chức hoạt động dạy học 2 cột (HOẠT ĐỘNG CỦA GIÁO VIÊN / HOẠT ĐỘNG CỦA HỌC SINH) phải áp dụng cấu hình viền "All Borders" (kẻ đầy đủ tất cả các đường viền ngoài và các đường phân cách trong: top, left, bottom, right, insideH, insideV).

6. LOẠI BỎ THẺ NGUỒN NỘI BỘ VÀ CHÚ THÍCH VĂN BẢN HÀNH CHÍNH:
   - Tuyệt đối không để sót các thẻ trích dẫn nguồn nội bộ của hệ thống trong bất kỳ phần văn bản nào của giáo án và code Python.
   - Trong nội dung giáo án (Mục tiêu, Tiến trình bài dạy, Hoạt động), TUYỆT ĐỐI KHÔNG ghi các chú thích/nhãn viện dẫn văn bản như: "(Quyết định số 2422/QĐ-BGDĐT):", "(Thông tư 02/2024/TT-BGDĐT):", "(Theo CV 5512)...". Các nội dung năng lực số, AI được viết tự nhiên, hòa nhập trực tiếp vào mục tiêu năng lực và hoạt động dạy học mà không kèm tên văn bản pháp quy.

7. QUY CHUẨN ĐẶT TÊN FILE WORD TỰ ĐỘNG:
   - Tên file lưu tự động theo đúng cấu trúc: \`KHBD_{Tên môn}{Số lớp}_{tên bài không dấu}.docx\`
   - Ví dụ: \`KHBD_Toan12_OnTapGiuaKy1.docx\`

8. XỬ LÝ TRIỆT ĐỂ LỖI Ô VUÔNG TRONG EQUATION:
   - Trong hàm xử lý công thức toán \`add_math()\`, bắt buộc có bước tiền xử lý chuỗi Regex: Chuẩn hóa các dấu trừ âm sau dấu ngoặc hoặc dấu phẩy/chấm phẩy (chuyển \`(-\` thành \`({-\`, \`,-\` thành \`,{-\`, \`; -\` thành \`; {-\`, và dấu trừ ở đầu chuỗi thành \`{-\`) để loại bỏ hoàn toàn việc phát sinh ký tự ô vuông nét đứt giữ chỗ rỗng \`⬚\` ở các số âm như \`(-1; 0)\`.

9. NGUYÊN TẮC VIẾT CODE PYTHON:
   - Code rõ ràng, cấu trúc mô-đun chặt chẽ.
   - Chú thích trong code (comments) viết bằng tiếng Việt không dấu.

QUY TẮC ĐỘNG TỪ HÀNH VI (ĐỊNH LƯỢNG TRIỆT ĐỂ TRONG MỤC TIÊU):
- Nghiêm cấm dùng từ chung chung (hiểu, biết, nắm được, so sánh, làm quen...).
- Bắt buộc dùng động từ hành vi định lượng:
  1. Toán học: chỉ ra được, chứng minh được, thiết lập được hàm số, giải được phương trình, thao tác đúng quy trình trên Casio fx-880BTG, dựng hình trên GeoGebra...
  2. Năng lực số: quét mã QR trong 30 giây, điền số liệu vào bảng tính, xuất đồ thị hàm số, nộp bài qua Padlet/Google Drive... (viết trực tiếp, không kèm tiền tố Thông tư 02).
  3. Ứng dụng Trí tuệ nhân tạo: nhập đúng prompt có cấu trúc vào AI, đối chiếu định lý SGK chỉ ra lỗi sai/ngụy biện logic trong phản hồi AI, biên tập lại lời giải AI... (viết trực tiếp, không kèm tiền tố QĐ 2422).

CẤU TRÚC PHÂN CẤP HEADING (Ctrl + F -> Headings):
- Không ghi tiêu đề hành chính ở đầu trang (bắt đầu ngay từ Heading 1).
- Heading 1: TÊN CHƯƠNG
- Heading 2: TÊN BÀI
- Heading 3: CÁC MỤC LỚN (I. MỤC TIÊU; II. THIẾT BỊ DẠY HỌC VÀ HỌC LIỆU; III. TIẾN TRÌNH DẠY HỌC; IV. PHỤ LỤC)
- Heading 4: CÁC HOẠT ĐỘNG (1. Hoạt động Khởi động; 2. Hoạt động Hình thành kiến thức mới; 3. Hoạt động Luyện tập; 4. Hoạt động Vận dụng)
- Cấu trúc từng hoạt động: a. Mục tiêu, b. Nội dung, c. Sản phẩm (lời giải chi tiết), d. Tổ chức thực hiện (Bảng 2 cột All Borders qua 4 bước: Chuyển giao - Thực hiện - Báo cáo - Kết luận).

QUY TẮC ĐẦU RA:
- Không xuất nội dung văn bản thô ra trình duyệt.
- CHỈ XUẤT DUY NHẤT 01 KHỐI MÃ PYTHON hoàn chỉnh trong cặp dấu \`\`\`python ... \`\`\` để người dùng chạy sinh ra file .docx ngay lập tức.
- Cuối câu trả lời chỉ ghi đúng 3 dòng:
  * Thư viện cần cài đặt: \`pip install python-docx latex2mathml lxml matplotlib\`
  * Lệnh thực thi: \`python GiaoAn.py\`
  * Tên và vị trí nhận file docx thành phẩm.`,
        description: 'Bản Prompt tối ưu chuẩn mực 9 nguyên tắc thiết kế Kế hoạch bài dạy (KHBD) môn Toán THPT bám sát GDPT 2018 & CV 5512, tích hợp năng lực số (TT 02/2024), AI (QĐ 2422), font 12pt, tự sinh đồ thị matplotlib, kẻ bảng All Borders, loại bỏ nhãn văn bản hành chính trong nội dung giáo án, xử lý triệt để lỗi ô vuông nét đứt giữ chỗ rỗng ⬚ ở số âm và xuất duy nhất 1 khối script Python tự sinh file Word có công thức native Word Equation (OMML).'
      },
      {
        id: 'math-elearning-ppt',
        name: 'KHBD_Web',
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
  },
  {
    id: 'infographic',
    name: 'Infographic',
    items: [
      {
        id: 'infographic-cheat-sheet',
        name: 'Infographic Tóm Tắt Bài Học 1 Trang (Visual Cheat Sheet)',
        prompt: `Đóng vai: Bạn là chuyên gia thiết kế Đồ họa Thông tin Giáo dục (Educational Infographic Designer) và lập trình viên Front-end SVG/HTML.
Nhiệm vụ: Hãy tạo một Infographic đồ họa tóm tắt trực quan 1 trang duy nhất cho bài học dưới đây bằng mã HTML/CSS/inline SVG responsive sắc nét.

YÊU CẦU THIẾT KẾ & BỐ CỤC (INFOGRAPHIC CHUẨN SƯ PHẠM):
1. Cấu trúc thị giác (Visual Hierarchy):
   - Tiêu đề chính (Banner Header): Tên bài học, khối lớp, thông điệp trọng tâm ấn tượng.
   - Khối Kiến thức cốt lõi (Core Pillars): Chia 3 - 4 cột hoặc thẻ card màu pastel bo góc mềm mại, có icon SVG minh họa cho từng nhánh kiến thức.
   - Khung Công thức Vàng (Golden Formulas Box): Đóng khung nổi bật với nền màu nhấn (accent color), công thức viết to, rõ ràng, có chú giải biến số bằng mũi tên chỉ dẫn trực quan.
   - Sơ đồ tư duy / Luồng suy luận (Mindmap / Flow): Sử dụng mũi tên SVG kết nối nguyên nhân - kết quả hoặc các bước suy luận logic.
   - Hộp Lưu ý & Cảnh báo bẫy sai lầm (Common Traps & Tips): Đánh dấu màu đỏ cam pastel cảnh báo những lỗi học sinh hay nhầm lẫn.
2. Quy chuẩn thẩm mỹ:
   - Màu sắc: Bảng màu hiện đại (Modern Educational Palette): Indigo (#4F46E5), Cyan/Teal (#06B6D4), Emerald (#10B981), Amber (#F59E0B), Rose (#F43F5E) trên nền sáng sạch sẽ (#F8FAFC).
   - Xuất mã: 1 trang đơn nhất hoặc file ảnh vector SVG độc lập, có thể lưu về xem trên điện thoại hoặc in ra khổ A4 làm tài liệu cầm tay (Cheat Sheet).

---------------------------------------------------
NỘI DUNG BÀI HỌC CẦN LÀM INFOGRAPHIC DƯỚI ĐÂY:
[Dán nội dung kiến thức, công thức và các điểm cần nhấn mạnh vào đây]`,
        description: 'Prompt tạo Infographic tóm tắt 1 trang toàn bài học trực quan (Visual Cheat Sheet / HTML & SVG) với bố cục khoa học, khung công thức vàng và cảnh báo bẫy sai lầm.'
      },
      {
        id: 'infographic-step-roadmap',
        name: 'Infographic Quy Trình / Thuật Toán Giải Toán (Roadmap Steps)',
        prompt: `Đóng vai: Bạn là chuyên gia sư phạm và thiết kế đồ họa thông tin hướng dẫn quy trình (Process Infographic Designer).
Nhiệm vụ: Chuyển đổi phương pháp giải dạng bài toán phức tạp sau đây thành một Infographic dạng Bản đồ lộ trình từng bước (Step-by-step Roadmap) trực quan và dễ nhớ nhất cho học sinh.

YÊU CẦU CHI TIẾT:
1. Thiết kế theo dòng thời gian hoặc lộ trình từng bước (Bước 1 ➔ Bước 2 ➔ Bước 3 ➔ Bước 4 ➔ Chốt kết quả).
2. Tại mỗi bước:
   - Tên bước hành động (động từ mạnh: Xác định, Biến đổi, Khảo sát, So sánh...).
   - Câu hỏi định hướng tư duy: "Cần tìm gì ở bước này?".
   - Biểu thức / Công thức then chốt tương ứng.
   - Dấu hiệu nhận biết ngã rẽ (nếu điều kiện A ➔ đi nhánh 1; nếu điều kiện B ➔ đi nhánh 2).
3. Đóng gói dưới dạng khối SVG hoặc HTML card trực quan, có thể chèn trực tiếp vào slide hoặc tài liệu học tập.

---------------------------------------------------
DẠNG TOÁN VÀ PHƯƠNG PHÁP GIẢI CẦN THIẾT KẾ:
[Dán đề tài, quy tắc giải và các lưu ý vào đây]`,
        description: 'Prompt tạo Infographic dạng lộ trình từng bước (Roadmap Steps) trực quan hóa phương pháp và thuật toán giải các dạng bài tập phân nhánh.'
      }
    ]
  },
  {
    id: 'tao-app',
    name: 'Tạo App (AI Studio / Gemini)',
    items: [
      {
        id: 'sua-nhanh-single-module',
        name: 'Lệnh Sửa Nhanh Trúng Đích 1 Chỗ (Fast-Track Single Module)',
        prompt: `[Sửa nhanh: <Tên Module hoặc Thư mục đích>] <Yêu cầu chỉnh sửa cụ thể tại đây>

QUY TẮC BẮT BUỘC TUÂN THỦ (THEO QUY ƯỚC AGENTS.MD VÀ SƠ ĐỒ CÂY APP):
1. Định vị chuẩn xác: Mở thẳng file đích cần chỉnh sửa theo đúng đường dẫn thư mục quy định tại Sơ đồ cây app trong HuongDanWeb/HuongDanWebView.tsx (Ví dụ: src/modules/ModuleGiaoVien/... hoặc src/modules/ModuleHocSinh/...).
2. Không duyệt lại toàn bộ dự án: Tuyệt đối KHÔNG quét, đọc hay duyệt lại hàng loạt file khác trong ứng dụng.
3. Nguyên tắc bất biến: Tất cả các file và phân hệ khác TUYỆT ĐỐI GIỮ NGUYÊN 100%, không thay đổi bất kỳ logic hay giao diện ngoài phạm vi yêu cầu.
4. Chỉ thay đổi tối thiểu (Surgical Edit): Chỉ sửa đúng khối mã mục tiêu, không viết lại cả file lớn nếu không cần thiết.
5. Sau khi sửa: Chạy compile_applet và lint_applet để xác minh, sau đó cập nhật 1 dòng tóm tắt vào Sơ đồ cây tại HuongDanWebView.tsx. Phản hồi siêu ngắn gọn (1-2 câu).`,
        description: 'Prompt sửa nhanh trúng đích 1 vị trí theo chuẩn AGENTS.md, định vị theo Sơ đồ cây tóm tắt app mà không cần rà soát lại toàn bộ dự án.'
      },
      {
        id: 'sua-nhanh-multi-module',
        name: 'Lệnh Sửa Nhanh Đa Module Phối Hợp (Multi-Module Sync)',
        prompt: `[Sửa nhanh: <Module 1>, <Module 2>] <Mục tiêu tổng quát>:
- Module <Tên Module 1>: <Thay đổi cụ thể gì>, chỉ sửa trúng đích file trong <Đường dẫn 1>
- Module <Tên Module 2>: <Thay đổi cụ thể gì>, chỉ sửa trúng đích file trong <Đường dẫn 2>
Không duyệt lại toàn bộ dự án.

QUY TẮC BẮT BUỘC:
1. Chỉ mở đúng các file đích được chỉ định trong danh sách đường dẫn, không quét các file ngoài phạm vi.
2. Giữ nguyên toàn bộ cấu trúc và chức năng hiện hữu của các module khác.
3. Đồng bộ mô tả thay đổi mới vào trang Sơ đồ cây Module tại src/modules/ModuleGiaoDien/HuongDanWeb/HuongDanWebView.tsx.
4. Kiểm tra biên dịch compile_applet và báo cáo kết quả súc tích trong 1-2 câu.`,
        description: 'Prompt phối hợp sửa nhiều module cụ thể, chỉ định chính xác đường dẫn từng file đích và tự động đồng bộ vào Sơ đồ cây app.'
      },
      {
        id: 'tao-app-moi-khung-chuan',
        name: 'Lệnh Tạo App Mới Chuẩn Khung Kiến Trúc Sạch (New App Scaffolding)',
        prompt: `Đóng vai: Bạn là Kỹ sư trưởng phần mềm Web Full-stack.
Nhiệm vụ: Xây dựng ứng dụng web theo yêu cầu sau, đảm bảo kiến trúc sạch (Clean Modular Architecture) và tuân thủ tuyệt đối quy tắc phòng chống lỗi:

YÊU CẦU KIẾN TRÚC & PHÒNG CHỐNG LỖI CỐT LÕI:
1. Cấu trúc module phẳng 2 cấp: Tổ chức tại src/modules/ rõ ràng (ModuleNgườiDùng, ModuleNghiệpVụ, ModuleGiaoDiện, ConnectData), có file index.ts facade xuất khẩu gọn gàng.
2. Có trang Trang Lưu Trữ Tóm Tắt Sơ Đồ Cây của App ngay từ đầu: Tạo 1 trang hiển thị toàn bộ danh sách module, đường dẫn và nhiệm vụ để mọi yêu cầu sửa đổi sau này chỉ cần tra cứu trang này mà không phải rà soát toàn bộ dự án.
3. Không phình to mã nguồn: Viết modular, mỗi component dưới 300 dòng, tái sử dụng hooks và helpers.
4. Giao diện: Sử dụng Tailwind CSS, phong cách tinh tế, responsive hoàn hảo trên cả máy tính và điện thoại.
5. Không tạo mock data giả nếu cần kết nối đám mây, ưu tiên thiết kế State chuẩn SSOT (Single Source of Truth).

NỘI DUNG VÀ Ý TƯỞNG APP MUỐN TẠO:
[Mô tả chi tiết ý tưởng app, đối tượng người dùng và các tính năng chính cần có]`,
        description: 'Prompt khởi tạo ứng dụng web mới với kiến trúc module phân cấp sẵn có Sơ đồ cây tóm tắt app, giúp các phiên phát triển sau sửa đổi cực nhanh mà không bị quá tải mã.'
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
