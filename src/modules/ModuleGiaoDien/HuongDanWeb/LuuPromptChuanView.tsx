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
    id: 'lam-de',
    name: 'Làm Đề',
    items: [
      {
        id: 'lam-de-kt-theo-ma-tran',
        name: 'Làm đề KT theo Ma trận',
        prompt: `Bạn là một chuyên gia giáo dục môn Toán, am hiểu sâu sắc về ma trận, đặc tả và các năng lực toán học (TD - Tư duy lập luận toán học; GQ - Giải quyết vấn đề toán học; MH - Mô hình hóa toán học) theo chương trình GDPT 2018. Hãy giúp tôi tạo một đề kiểm tra Toán dựa trên các tài liệu đính kèm (nếu có) thông qua 3 bước bắt buộc sau:

Bước 1: Xác định và chốt Ma trận (Dạng thức câu hỏi -> Đơn vị kiến thức)
- Dựa vào file đính kèm (nếu có) hoặc tự xây dựng một ma trận chuẩn gồm 4 phần (10 điểm):
  + Phần I. Trắc nghiệm nhiều phương án lựa chọn (12 câu - 3,0đ): 100% mức độ Nhận biết.
  + Phần II. Trắc nghiệm Đúng/Sai (4 câu lớn, 16 ý - 4,0đ): Phân bổ các ý Nhận biết, Thông hiểu và Vận dụng vào các chủ đề (Đơn điệu/Cực trị, Max/Min, Tiệm cận/Đồ thị, Ứng dụng thực tiễn).
  + Phần III. Trắc nghiệm Trả lời ngắn (4 câu - 1,0đ): 100% mức độ Vận dụng. Chú ý: Câu Vận dụng về Tính đơn điệu KHÔNG dùng tham số $m$, KHÔNG dùng hàm hợp, bắt buộc ra dạng: Xét tính đơn điệu của hàm căn thức.
  + Phần IV. Tự luận (2 câu - 2,0đ): 100% mức độ Thông hiểu (nội dung: Tìm khoảng đơn điệu, cực trị của hàm đa thức và hàm phân thức).
- Hành động: In ra cấu trúc ma trận chi tiết và DỪNG LẠI để tôi xác nhận.

Bước 2: Xác định và chốt Đặc tả chi tiết
- Trích xuất 100% các "Yêu cầu cần đạt" gốc từ file ma trận (nếu có), tuyệt đối không bỏ sót.
- Phân rã thành các hành vi đo lường cụ thể theo 3 mức độ (Biết, Hiểu, VD) và 3 năng lực. Nguyên tắc phân định:
  + TD (Tư duy toán học): Nhận diện hình thức, đọc đồ thị/bảng biến thiên, so sánh, phân loại, tìm quy luật, chọn mệnh đề đúng/sai (Không yêu cầu tính toán).
  + GQ (Giải quyết vấn đề): Thực thi tính toán, giải phương trình/bất phương trình, đạo hàm, lập bảng biến thiên 3 dòng, tìm đáp số.
  + MH (Mô hình hóa): Dịch ngôn ngữ thực tiễn (tối ưu hóa kinh tế, hình học) thành hàm mục tiêu toán học.
- Hành động: In ra bản đặc tả chi tiết và DỪNG LẠI để tôi xác nhận.

Bước 3: Xuất toàn bộ Đề kiểm tra và Lời giải (Vào một khối mã - Code block)
- Tỷ lệ lấy nguồn câu hỏi: 4,0 điểm lấy y nguyên từ đề cương; 2,0 điểm lấy từ đề cương và thay số; 4,0 điểm xây dựng mới hoàn toàn (bên ngoài).
- Chú ý hình ảnh/đồ thị: Mô tả bằng văn bản thật chi tiết (tọa độ đỉnh, điểm đi qua, tiệm cận, hướng biến thiên) để tôi tự vẽ lại. Đưa ra hàm số gốc của đồ thị.
- Yêu cầu định dạng BẮT BUỘC trong khối mã (Code block) xuất ra:
  + Tuyệt đối KHÔNG dùng các định dạng Markdown (như in đậm **, in nghiêng *, thẻ tiêu đề #).
  + Mọi công thức toán học chỉ dùng 1 dấu $ (ví dụ: $x^2+1=0$), tuyệt đối KHÔNG dùng $$.
  + KHÔNG để bất kỳ dòng trống (dòng trắng) nào giữa các dòng chữ. Các dòng phải nối tiếp nhau liên tục từ trên xuống dưới.
  + Viết bằng Tiếng Việt chuẩn, có dấu đầy đủ.
- Cấu trúc bắt buộc cho MỖI câu hỏi:
Câu k. Nội dung câu hỏi
Lời giải
Mức độ: 1/2/3 - {TD/GQ/MH}. Yêu cầu: {Hành vi chi tiết từ bản đặc tả}
-Đáp án: {A/B/C/D hoặc Đúng/Sai hoặc Số cụ thể}
{Nội dung lời giải chi tiết}
Ghi chú: {Lấy y nguyên câu X trong đề cương / Thay số câu Y trong đề cương / Câu hỏi mới hoàn toàn (Bên ngoài)}

Bây giờ, hãy kiểm tra các tài liệu tôi đính kèm và bắt đầu thực hiện Bước 1.`,
        description: 'Prompt quy trình 3 bước tương tác (Ma trận 4 phần, Đặc tả phân rã TD/GQ/MH, Đề kiểm tra 10đ & Lời giải có tỷ lệ đề cương) ra đề kiểm tra Toán GDPT 2018.'
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
        prompt: `Dưới đây là nguyên lý kỹ thuật giải quyết triệt để lỗi đè mực, cơ chế màn hình chào mừng 2 câu tùy chỉnh, giải pháp triệt tiêu lỗi phím Space mở hộp thoại chọn file, quy chuẩn mã hóa UTF-8 chống lỗi font tiếng Việt, nhúng MathJax công thức Toán sắc nét, kiến trúc bài giảng PPT với **HIỆU ỨNG HIỆN RA LẦN LƯỢT TỪNG BƯỚC (STEP-BY-STEP BUILD)** chuẩn trình chiếu PowerPoint, cấu trúc tùy chọn linh hoạt giữa **Xuất đủ 02 file riêng biệt** (\`index.html\` Master Player + \`{TenBaiHocVietLienKhongDau}.html\`) hoặc **Chỉ xuất duy nhất 01 file bài giảng PPT** (\`{TenBaiHocVietLienKhongDau}.html\` nạp lên App LopU) và toàn bộ bản **Prompt hoàn chỉnh mới nhất** dành cho KHBD_Web:

### 1. NGUYÊN TẮC TÙY CHỌN XUẤT FILE (THEO NHU CẦU DẠY HỌC):
* **TÙY CHỌN 1: CÓ TẠO \`index.html\` (XUẤT ĐỦ 02 FILE RIÊNG BIỆT — DÙNG DẠY HỌC ĐỘC LẬP TRÊN WEB/MÁY CHIẾU):**
  - **File 1: \`index.html\` (DÙNG CHUNG MỌI BÀI — MỌI BÀI ĐỀU XUẤT GIỐNG HỆT NHAU):**
    + Đóng vai trò là Master Player quy định toàn bộ giao diện & công cụ dạy học dùng chung cho mọi bài học khi trình chiếu ngoài trình duyệt độc lập.
    + **Màn hình chào mừng mở đầu:** Khi file \`index.html\` vừa mở lên, hiển thị Lời chào mừng + hiệu ứng chào mừng rực rỡ (Confetti, chuyển động fade-up). Cho phép giáo viên cài đặt 02 câu chào mừng tùy ý (lưu LocalStorage, chỉnh sửa dễ dàng trong Modal Cài đặt \`[⚙️]\`). Có nút lớn \`[▶ Bắt đầu tiết học]\` để vào bài giảng.
    + Thanh công cụ siêu tinh gọn ([🏫 Lớp ▾] [⚙️] [📂] | [🎲 - 1 +] [✏️]) ưu tiên 98% diện tích màn hình.
    + Quản lý **ĐA LỚP**: Thêm / Xóa / Đổi tên Lớp (10A1, 10A2, 11B1...); với mỗi lớp cho phép Thêm / Xóa / Sửa danh sách học sinh (dán từ Excel, lưu LocalStorage). Chọn lớp để quay ngẫu nhiên (tối đa 80% sĩ số, quay 4s async/await, nổ Confetti/Heart, âm thanh Tada).
    + Tích hợp Canvas vẽ & Highlight chống đè mực (\`mix-blend-mode: multiply\` & \`ctx.globalCompositeOperation = 'multiply'\`, 6 màu Pen + 5 màu Highlight + ô chọn màu tự do, 3 nấc độ dày).
    + **Cơ chế chọn bài học linh hoạt mỗi khi chạy:** Có nút [📂 Mở bài học] tích hợp hộp thoại chọn file HTML từ máy tính (qua \`<input type="file" accept=".html,.htm">\` và gán \`iframe.src = URL.createObjectURL(file)\`), cho phép mở bất kỳ bài dạy nào. Khởi chạy mặc định nạp file \`{TenBaiHocVietLienKhongDau}.html\` nếu ở cùng thư mục, kèm ghi nhớ bài học gần nhất vào LocalStorage.
    + **XỬ LÝ TRIỆT ĐỂ LỖI PHÍM SPACE MỞ HỘP THOẠI CHỌN FILE:** Sau khi chọn file hoặc bấm [📂], bắt buộc gỡ tiêu điểm (\`blur()\`). Trong sự kiện \`keydown\`, khi nhấn phím Space (\`e.code === 'Space'\`), gọi \`e.preventDefault()\` và \`document.activeElement?.blur()\` nếu không ở trong ô nhập liệu. Đảm bảo phím Space CHỈ chuyển hiệu ứng/slide sang iframe qua \`postMessage({ type: 'NEXT_STEP' })\`, TUYỆT ĐỐI KHÔNG mở lại hộp thoại chọn tệp!
    + **LƯU Ý:** File này KHÔNG CHỨA bất kỳ nội dung bài học cụ thể nào.
  - **File 2: \`{TenBaiHocVietLienKhongDau}.html\` (BÀI GIẢNG E-LEARNING PPT CÓ HIỆU ỨNG HIỆN RA LẦN LƯỢT TỪNG BƯỚC):**
    + **Quy tắc đặt tên:** Tên file là Tên bài học viết liền không dấu, viết hoa các chữ cái đầu (PascalCase, ví dụ: Bài 8 "Tổng và hiệu của hai vectơ" $\\rightarrow$ tên file là \`TongVaHieuCuaHaiVecto.html\`; bài "Hàm số bậc hai" $\\rightarrow$ \`HamSoBacHai.html\`). Tuyệt đối KHÔNG dùng tên chung chung \`NoiDungBaiHoc.html\`.
    + **CHUẨN TRÌNH CHIẾU PPT & HIỆU ỨNG HIỆN RA LẦN LƯỢT (STEP-BY-STEP BUILD):**
      * Có thẻ \`<meta charset="UTF-8" />\` chống triệt để lỗi font tiếng Việt.
      * Nhúng MathJax 3 hiển thị công thức Toán sắc nét.
      * Tổ chức thành từng Slide riêng biệt (\`<section class="slide-item">\`), mỗi thời điểm chỉ hiển thị duy nhất 1 slide.
      * Các phần tử trên slide được gán class \`.step\` (định nghĩa, hình vẽ SVG 2 cột, công thức, ví dụ, lời giải).
      * Bấm phím **Space**, **Mũi tên phải (→)**, hoặc **Click chuột** $\\rightarrow$ Hiện lần lượt từng bước của slide hiện tại; khi hết bước trên slide hiện tại sẽ chuyển sang slide kế tiếp! Bấm **Mũi tên trái (←)** $\\rightarrow$ Lùi bước/lùi slide.
    + **Tương thích hoàn hảo với App LopU:** Cấu trúc Semantic HTML rõ ràng trong \`<body>\`, khi nạp lên App LopU hệ thống tự động đưa nội dung vào khung soạn thảo Word chuẩn và hiển thị thanh mốc PPT bên trái (như trang 'Lý thuyết trọng tâm').
* **TÙY CHỌN 2: KHÔNG TẠO \`index.html\` (CHỈ XUẤT DUY NHẤT 01 FILE BÀI GIẢNG PPT \`{TenBaiHocVietLienKhongDau}.html\`):**
  - Áp dụng khi bạn đã có sẵn file \`index.html\` dùng chung từ trước, hoặc muốn mở bài giảng trực tiếp trên trình duyệt hay nạp vào App LopU.
  - Gemini chỉ tạo và xuất duy nhất 01 file **\`{TenBaiHocVietLienKhongDau}.html\`** có đầy đủ UTF-8, MathJax, hình vẽ SVG, câu hỏi trắc nghiệm và hiệu ứng hiện ra lần lượt từng bước (Step-by-step Build).

---

### 2. BẢN PROMPT TÍCH HỢP TÙY CHỌN TẠO FILE CHO GEMINI:

\`\`\`markdown
Đóng vai: Bạn là một chuyên gia lập trình Web Front-end và một giáo viên Toán THPT tại Việt Nam.
Nhiệm vụ: Dựa trên nội dung bài học tôi cung cấp ở cuối, bạn sẽ thiết kế bài giảng E-learning HTML theo TÙY CHỌN XUẤT FILE của tôi:
- TÙY CHỌN 1 — CÓ TẠO "index.html" (Mặc định khi cần công cụ dạy học độc lập trên Web/Máy chiếu): XUẤT ĐỦ 02 FILE HTML RIÊNG BIỆT (TUYỆT ĐỐI CẤM GỘP CHUNG VÀO 1 FILE):
  + File 1: "index.html" (File master quy định giao diện & công cụ dạy học đa lớp dùng chung cho mọi bài học; có màn hình chào mừng 2 câu cài đặt tùy ý, thanh công cụ pill siêu tinh gọn [🏫 10A1 ▾] [⚙️] [📂] | [🎲] [- 1 +] [✏️], canvas highlight chống đè mực, chọn file bài học cụ thể để chạy và chặn triệt để lỗi phím Space mở hộp thoại chọn file).
  + File 2: "{TenBaiHocVietLienKhongDau}.html" (File bài giảng PPT với HIỆU ỨNG HIỆN RA LẦN LƯỢT TỪNG BƯỚC, tên file BẮT BUỘC là Tên bài học viết liền không dấu viết hoa chữ cái đầu, ví dụ: TongVaHieuCuaHaiVecto.html; dùng để chọn chạy trong index.html hoặc nạp trực tiếp lên App LopU).
- TÙY CHỌN 2 — KHÔNG TẠO "index.html" (Khi chỉ cần nạp trực tiếp lên App LopU hoặc đã có sẵn index.html): CHỈ XUẤT DUY NHẤT 01 FILE NỘI DUNG:
  + File duy nhất: "{TenBaiHocVietLienKhongDau}.html" (Chứa toàn bộ bài giảng PPT với hiệu ứng hiện từng bước, vừa chạy độc lập ngoài trình duyệt vừa nạp trực tiếp lên App LopU giữ nguyên giao diện cửa sổ Word và thanh mốc PPT bên trái như trang "Lý thuyết trọng tâm").

=========================================================================
YÊU CẦU CHI TIẾT FILE 1: "index.html" (MASTER PLAYER — DÙNG CHUNG MỌI BÀI)
=========================================================================
1. MÀN HÌNH CHÀO MỪNG MỞ ĐẦU (WELCOME SCREEN & HIỆU ỨNG RỰC RỠ):
   - Khi vừa mở file "index.html", hiển thị ngay một màn hình chào mừng (Welcome Overlay) sang trọng với hoạt ảnh mềm mại và hiệu ứng pháo hoa Confetti/bung nở rực rỡ đón chào tiết học.
   - Cho phép giáo viên cài đặt 02 câu chào mừng tùy chỉnh:
     + Câu 1 (mặc định): "Chào mừng quý thầy cô và các em học sinh đến với tiết học!"
     + Câu 2 (mặc định): "Chúc các em có một tiết học tràn đầy năng lượng, tích cực và sáng tạo!"
     + Trong Modal Cài đặt [⚙️], bổ sung 2 ô nhập liệu để giáo viên sửa 2 câu chào mừng này (lưu vĩnh viễn vào LocalStorage: lopu_welcome_line1, lopu_welcome_line2).
   - Nút lớn nổi bật [▶ Bắt đầu tiết học]: Nhấp vào sẽ ẩn màn hình chào mừng (hiệu ứng fade out) để chuyển vào khung bài giảng.
2. THANH ĐIỀU KHIỂN SIÊU TINH GỌN (ULTRA-COMPACT FLOATING PILL):
   - Ưu tiên tuyệt đối 98% diện tích màn hình để hiển thị nội dung bài học. Toàn bộ thanh điều khiển chỉ là một thanh nổi thanh mảnh ở góc trên (Pill bar), dùng biểu tượng trực quan, nền kính mờ hiện đại (backdrop-blur):
     [🏫 10A1 ▾] [⚙️] [📂] | [🎲] [- 1 +] [✏️]
   - Nút chọn Lớp [🏫 Tên Lớp ▾]: Dropdown bấm nhanh chuyển lớp dạy (10A1, 10A2, 11B1...). Tự động cập nhật sĩ số và nạp danh sách lớp đó ngay lập tức.
   - Nút Cài đặt [⚙️]: Mở Modal Quản Lý Đa Lớp & Học Sinh & Lời Chào Mừng toàn diện:
     + Quản lý Lớp: Thêm lớp mới, Xóa lớp, Đổi tên lớp (Lưu LocalStorage).
     + Quản lý Học sinh theo từng lớp: Với mỗi lớp đang chọn, cho phép Thêm / Xóa / Sửa danh sách học sinh (có khung Textarea dán danh sách nhiều dòng từ Excel hoặc gõ trực tiếp). Tự động cập nhật giới hạn quay 80% sĩ số ngay khi lưu.
     + Cài đặt 2 câu chào mừng: 2 ô input để sửa Lời chào dòng 1 & dòng 2.
     + Nút "Xuất file HS" (📄): In PDF phiếu học tập gồm Tóm tắt lý thuyết và Đề bài (không kèm lời giải).
   - Nút Mở bài học [📂]: Kèm thẻ input ẩn (<input type="file" id="lessonFileInput" accept=".html,.htm" style="display:none;" />). Khi bấm [📂], kích hoạt chọn tệp HTML từ máy tính; sau khi chọn file sẽ tự động nạp vào iframe qua URL.createObjectURL(file) và lưu tên file gần nhất vào LocalStorage.
   - BẮT BUỘC GỠ FOCUS: Ngay khi bấm [📂] hoặc sau khi chọn xong file trong sự kiện change, BẮT BUỘC gọi ngay:
     btnOpenFile.blur(); lessonFileInput.blur(); if (document.activeElement) document.activeElement.blur();
3. KHUNG NHÚNG BÀI HỌC VÀ CƠ CHẾ CHỌN BÀI MỖI KHI CHẠY:
   - Thẻ iframe chiếm trọn màn hình:
     <iframe id="lessonFrame" src="{TenBaiHocVietLienKhongDau}.html" style="width:100%; height:100vh; border:none; display:block;"></iframe>
   - Cơ chế chọn bài: Mỗi khi chạy, nếu đã có bài học lưu trong LocalStorage hoặc có file cùng thư mục thì nạp trực tiếp; nếu file chưa tìm thấy hoặc người dùng muốn đổi bài chỉ cần nhấp nút [📂] để chọn file bài học cụ thể dạng "{TenBaiHoc}.html" từ máy tính để chạy ngay lập tức mà không cần tải lại trang.
4. CỤM GỌI HỌC SINH NỔI (TOP-RIGHT QUICK CALL):
   - Nút quay xúc xắc [🎲], bộ chọn số lượng học sinh [-] [+] (giới hạn tối đa 4/5 tức 80% sĩ số lớp đang chọn).
   - Chu trình quay tuần tự từng học sinh bằng async/await Promise: Mỗi em quay trong đúng 4 giây (2.5s đầu chạy cực nhanh, 1.5s cuối giảm tốc), khi dừng phát âm thanh Tada, nổ pháo hoa Confetti hoặc bung nở hình trái tim đúng vị trí hàng tên.
5. BỘ CÔNG CỤ VẼ & DẠ QUANG HIGHLIGHT CHỐNG ĐÈ MỰC (CANVAS):
   - Thẻ Canvas phủ toàn màn hình (position: fixed; inset: 0; z-index: 9000; pointer-events: none; mix-blend-mode: multiply;).
   - Kỹ thuật chống đè đậm mực Highlight: Khi vẽ bút dạ quang, thiết lập ctx.globalCompositeOperation = 'multiply' (hoặc dùng Offscreen Canvas đệm) để các điểm trùng lặp trong 1 nét vẽ KHÔNG BỊ CỘNG DỒN ALPHA, luôn trong suốt 100% thấy rõ chữ và công thức Toán bên dưới.
   - Bảng màu: Bút viết (✏️: Đỏ, Xanh dương, Xanh lá, Đen, Vàng cam, Tím + ô chọn màu); Highlight (🖍️: Vàng dạ quang, Xanh lá neon, Cam pastel, Hồng neon, Xanh ngọc dạ quang + ô chọn màu). 3 nấc nét (Mảnh / Vừa / Dày). Nút Xóa nét vẽ (🗑️) và Đóng vẽ (❌).
6. ĐIỀU HƯỚNG SLIDE & XỬ LÝ TRIỆT ĐỂ LỖI PHÍM SPACE MỞ HỘP THOẠI CHỌN FILE (SPACEBAR FOCUS GUARD):
   - Lắng nghe sự kiện keydown toàn cục trên window:
     \`\`\`javascript
     window.addEventListener('keydown', function(e) {
       const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
       if (isInput) return;
       if (e.code === 'Space' || e.key === ' ' || e.key === 'ArrowRight' || e.key === 'PageDown') {
         e.preventDefault(); // CHẶN TRIỆT ĐỂ hành vi mặc định của trình duyệt tự kích hoạt click vào button đang focus!
         if (document.activeElement instanceof HTMLElement) {
           document.activeElement.blur(); // Hủy focus khỏi nút [📂] hoặc bất kỳ nút nào
         }
         // Gửi tín hiệu chuyển bước hiệu ứng / slide sang iframe nội dung bài học:
         const iframe = document.getElementById('lessonFrame');
         iframe?.contentWindow?.postMessage({ type: 'NEXT_STEP' }, '*');
       } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
         e.preventDefault();
         const iframe = document.getElementById('lessonFrame');
         iframe?.contentWindow?.postMessage({ type: 'PREV_STEP' }, '*');
       }
     });
     \`\`\`
   - Tuyệt đối không để phím Space kích hoạt mở hộp thoại chọn file.

=========================================================================
YÊU CẦU CHI TIẾT FILE 2: "{TenBaiHocVietLienKhongDau}.html"
(BÀI GIẢNG PPT — HIỆU ỨNG HIỆN RA LẦN LƯỢT TỪNG BƯỚC)
=========================================================================
1. ĐỊNH DẠNG & THƯ VIỆN BẮT BUỘC (CHỐNG LỖI FONT & CÔNG THỨC TOÁN):
   - QUY TẮC ĐẶT TÊN FILE: BẮT BUỘC đặt tên file là Tên bài học viết liền không dấu, viết hoa các chữ cái đầu (PascalCase), ví dụ:
     + Bài 8 "Tổng và hiệu của hai vectơ" -> "TongVaHieuCuaHaiVecto.html"
     + Bài "Hàm số bậc hai và đồ thị" -> "HamSoBacHaiVaDoThi.html"
     + TUYỆT ĐỐI KHÔNG đặt tên là "NoiDungBaiHoc.html".
   - BẮT BUỘC có thẻ <meta charset="UTF-8" /> trong <head> để tiếng Việt hiển thị chuẩn 100%, tuyệt đối không bị lỗi font/mojibake (như TRÆ¯á»œNG, PHIÁº¾U).
   - BẮT BUỘC nhúng MathJax 3 để mọi công thức Toán $...$ và $$...$$ hiển thị sắc nét:
     \`\`\`html
     <script>
       window.MathJax = {
         tex: { inlineMath: [['$', '$'], ['\\\\(', '\\\\)']], displayMath: [['$$', '$$'], ['\\\\[', '\\\\]']] },
         svg: { fontCache: 'global' }
       };
     </script>
     <script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
     <script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js"></script>
     \`\`\`
   - Âm thanh:
     + Success Audio: https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3
     + Error Audio: https://assets.mixkit.co/active_storage/sfx/2997/2997-preview.mp3
     + Tada Audio: https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3

2. KIẾN TRÚC TRÌNH CHIẾU PPT & HIỆU ỨNG HIỆN RA LẦN LƯỢT TỪNG BƯỚC (STEP-BY-STEP BUILD):
   - Toàn bộ bài học được tổ chức thành các SLIDE riêng biệt (<section class="slide-item">), mỗi thời điểm CHỈ HIỂN THỊ DUY NHẤT 1 SLIDE (display: none; slide đang chiếu có class="active" display: block;). Tuyệt đối không hiển thị dồn tất cả các mục thành 1 trang cuộn dài như phiếu bài tập.
   - Slide 1 (Bìa): Tiêu đề bài học nổi bật, ghi đầy đủ thông tin: "Giáo viên: Đỗ Tấn Bảo – Tổ Toán – Trường THPT Ba Gia".
   - Các Slide Kiến thức & Bài tập:
     + Trong mỗi slide, các khối kiến thức được gắn class="step" (CSS: opacity: 0; transform: translateY(14px); transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1); pointer-events: none;). Khi kích hoạt có thêm class="visible" (opacity: 1; transform: translateY(0); pointer-events: auto;).
       * Bước 1: Tiêu đề mục & Định nghĩa kiến thức
       * Bước 2: Hình vẽ minh họa SVG trực quan (chia bố cục 2 cột)
       * Bước 3: Công thức đóng khung nổi bật (Quy tắc ba điểm, Quy tắc hình bình hành...)
       * Bước 4: Đề bài ví dụ minh họa áp dụng
       * Bước 5: Lời giải chi tiết của ví dụ
     + CƠ CHẾ ĐIỀU KHIỂN BƯỚC (NEXT / PREV):
       \`\`\`javascript
       let currentSlide = 0;
       let currentStep = 0;
       const slides = document.querySelectorAll('.slide-item');

       function showSlide(index) {
         if (index < 0 || index >= slides.length) return;
         currentSlide = index;
         slides.forEach((s, idx) => s.classList.toggle('active', idx === currentSlide));
         const steps = slides[currentSlide].querySelectorAll('.step');
         currentStep = 0;
         steps.forEach(st => st.classList.remove('visible'));
         updateFooter();
       }

       function next() {
         const steps = slides[currentSlide].querySelectorAll('.step');
         if (currentStep < steps.length) {
           // Hiện bước tiếp theo trên slide hiện tại
           steps[currentStep].classList.add('visible');
           currentStep++;
         } else {
           // Đã hiện hết bước trên slide hiện tại -> Sang slide tiếp theo
           if (currentSlide < slides.length - 1) {
             showSlide(currentSlide + 1);
           }
         }
       }

       function prev() {
         const steps = slides[currentSlide].querySelectorAll('.step');
         if (currentStep > 0) {
           currentStep--;
           steps[currentStep].classList.remove('visible');
         } else {
           if (currentSlide > 0) {
             showSlide(currentSlide - 1);
             const prevSteps = slides[currentSlide].querySelectorAll('.step');
             prevSteps.forEach(st => st.classList.add('visible'));
             currentStep = prevSteps.length;
           }
         }
       }

       // Lắng nghe phím Space, Mũi tên phải/trái trên window
       window.addEventListener('keydown', (e) => {
         const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
         if (isInput) return;
         if (e.code === 'Space' || e.key === ' ' || e.key === 'ArrowRight' || e.key === 'PageDown') {
           e.preventDefault();
           next();
         } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
           e.preventDefault();
           prev();
         }
       });

       // Click chuột vào slide để hiện bước tiếp theo
       document.addEventListener('click', (e) => {
         if (e.target.closest('button, input, select, textarea, a, .quiz-opt')) return;
         next();
       });

       // Nhận tín hiệu postMessage từ index.html (Master Player)
       window.addEventListener('message', (e) => {
         if (e.data?.type === 'NEXT_STEP' || e.data?.type === 'NEXT_STEP_OR_SLIDE' || e.data?.type === 'NEXT_SLIDE') {
           next();
         } else if (e.data?.type === 'PREV_STEP' || e.data?.type === 'PREV_SLIDE') {
           prev();
         }
       });
       \`\`\`

3. HÌNH VẼ MINH HỌA VECTOR SVG & BỐ CỤC 2 CỘT:
   - Mọi định nghĩa, định lý, tính chất hình học BẮT BUỘC có hình vẽ minh họa SVG vector sắc nét (rõ mũi tên marker-end, màu sắc phân biệt các vectơ, tọa độ đỉnh rõ ràng).
   - Chia bố cục 2 cột linh hoạt: 1 bên là định nghĩa/công thức toán, 1 bên là khung hình vẽ SVG.

4. HỆ THỐNG CÂU HỎI TRẮC NGHIỆM (QUIZ) & ĐẾM GIỜ:
   - Gồm đủ 3 dạng: Trắc nghiệm 4 lựa chọn (MCQ), Trắc nghiệm Đúng/Sai (TNDS), Trả lời ngắn (TLN). Giữ nguyên tiền tố đánh số ("TNLC 1.", "TNDS 1.", "TLN 1."...).
   - Có bộ đếm ngược thời gian (45s, 60s, 90s).
   - Nút "Kiểm tra đáp án": Đúng (viền xanh, Confetti, âm thanh Success), Sai (viền đỏ, rung lắc, âm thanh Error).
   - Bấm tiếp (phím Space / Click) thì Lời giải chi tiết của câu hỏi sẽ hiện ra (class="step").

5. TƯƠNG THÍCH KÉP HOÀN HẢO VỚI CẢ INDEX.HTML VÀ APP LOPU:
   - Khi chạy với "index.html" hoặc chạy trực tiếp: Hoạt động như một bài thuyết trình PowerPoint mượt mà, đầy đủ hiệu ứng hiện từng bước, âm thanh, nổ pháo hoa, công thức Toán đẹp và không lỗi font tiếng Việt.
   - Khi nạp vào App LopU: Các thẻ tiêu đề (h1, h2, h3), hình vẽ SVG, ví dụ (.vi-du), câu hỏi (.cau-hoi), lời giải (.loi-giai) được cấu trúc rõ ràng trong <body>, giúp App LopU tự động nạp thẳng vào cửa sổ Word chuẩn kèm thanh mốc PPT màu tím bên lề trái (như trang "Lý thuyết trọng tâm").

6. QUY TẮC TOÁN HỌC TRÁNH LỖI "Math input error":
   - Đồng nhất sử dụng dấu $công thức$ cho nội dòng và $$công thức$$ cho riêng dòng. Tuyệt đối KHÔNG dùng \\( \\).
   - Tránh bẫy ký tự \\t: Tuyệt đối KHÔNG viết \\text{ cm}, \\text{ m/s}, \\text{ N}. Mọi đơn vị và chữ tiếng Việt PHẢI đưa ra ngoài dấu $.
   - Giữ nguyên 100% nội dung gốc của bài học được cung cấp, không tự ý sáng tác kiến thức ngoài tài liệu.

QUY TRÌNH THỰC HIỆN 2 BƯỚC BẮT BUỘC:
- BƯỚC 1: TIẾP NHẬN, ĐỀ XUẤT VÀ CHỜ DUYỆT (TUYỆT ĐỐI CHƯA ĐƯỢC XUẤT CODE Ở BƯỚC NÀY):
   + Tóm tắt chi tiết cấu trúc tiến trình bài giảng theo đúng trật tự: Mục lý thuyết nào -> Hình vẽ SVG dự kiến đi kèm -> Các ví dụ minh họa -> Phần bài tập rèn luyện cuối bài.
   + Thống kê rõ số lượng slide và danh sách câu hỏi từng phần để tôi xem xét.
   + Xác định tên file nội dung bài học theo tên bài học viết liền không dấu (Ví dụ: "TongVaHieuCuaHaiVecto.html").
   + Hỏi rõ lựa chọn của tôi: "Thầy/Cô có cần tạo file giao diện 'index.html' (Master Player đa lớp, quay số, bút vẽ, chọn file bài học, màn hình chào mừng 2 câu) để dạy học độc lập trên Web không, hay chỉ cần tạo duy nhất 1 file bài giảng PPT '{TenBaiHocVietLienKhongDau}.html' để nạp vào App LopU?"
   + DỪNG LẠI và chờ tôi phản hồi duyệt tiến trình cũng như xác nhận tùy chọn xuất file.
- BƯỚC 2: XUẤT FILE HOÀN CHỈNH THEO TÙY CHỌN ĐÃ DUYỆT:
   + CHỈ KHI tôi phản hồi đã đồng ý/xác nhận ở Bước 1, bạn mới bắt đầu tạo và xuất file:
     * Nếu tôi chọn CÓ tạo index.html: Xuất đủ 02 file riêng biệt ("index.html" và "{TenBaiHocVietLienKhongDau}.html").
     * Nếu tôi chọn KHÔNG tạo index.html: Chỉ xuất DUY NHẤT 01 file bài giảng PPT ("{TenBaiHocVietLienKhongDau}.html").
   + Tuyệt đối không gộp 2 file thành 1 file duy nhất nếu chọn Tùy chọn 1.

---------------------------------------------------
NỘI DUNG BÀI HỌC CẦN SOẠN DƯỚI ĐÂY:
[Nội dung lấy từ file đính kèm]
\`\`\``,
        description: 'Bản Prompt tối ưu hoàn chỉnh mới nhất tạo KHBD_Web E-learning Toán THPT: Chuẩn hóa UTF-8 chống lỗi font, MathJax công thức toán sắc nét, Slide trình chiếu PPT với hiệu ứng hiện ra lần lượt từng bước (Step-by-step Build) khi bấm Space/Click, Master Player index.html linh hoạt đa lớp, màn hình chào mừng 2 câu và chặn lỗi phím Space mở hộp thoại chọn file.'
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
