# Quy Tắc Điều Khiển & Phản Hồi Siêu Tốc (AI Assistant Directives)

## 1. Cơ Chế Định Vị Theo Sơ Đồ Cây (Tree-Based Fast Routing)
Dự án được cấu trúc dạng module phẳng 2 cấp tại `src/modules/`:
- **ModuleHocSinh**: `LopHoc/`, `SoDoLop/`, `ThoiKhoaBieu/`, `DangKyLop/`
- **ModuleGiaoVien**: `QuanLyLopDay/`, `NhapHocSinh/`, `TheoDoiHocSinh/`, `TaiLieuCaNhan/`
- **ModuleQuanTri**: `QuanLyNguoiDung/`, `BaoCaoGiamSat/`, `PhanQuyenLopHoc/`
- **ModuleGiaoDien**: `GiaoDienMacDinh/`, `GiaoDienHocSinh/`, `GiaoDienGiaoVien/`, `GiaoDienQuanTri/`, `Navigation/`, `HuongDanWeb/`, `TroLyLenh/`
- **ConnectData**: `ConnectDrive/`, `ConnectFirestore/`

## 2. Quy Tắc Sửa Nhanh (Fast-Track Execution)
Khi người dùng gửi câu lệnh có tiền tố:
`[Sửa nhanh: <Tên Module hoặc Thư mục>] <Yêu cầu cụ thể>, chỉ sửa trúng đích file đó, không duyệt lại toàn bộ dự án.`

Trợ lý AI **BẮT BUỘC**:
1. **Không quét/duyệt lại toàn bộ dự án**: Mở thẳng file đích cần chỉnh sửa theo tên module được chỉ định trong sơ đồ cây.
2. **Hành động trực tiếp ngay lập tức**: Thực hiện `view_file` đúng file đích -> `edit_file` -> `compile_applet` -> `lint_applet`.
3. **Phản hồi siêu ngắn gọn, súc tích**: Trả lời tối đa 1-2 câu kết quả, không giải thích lý thuyết rườm rà.
4. **Tôn trọng phạm vi cô lập**: Chỉ chỉnh sửa module được yêu cầu, không tự ý sửa đổi các module khác.

## 3. Quy Tắc Sửa Nhanh Đa Module Liên Quan (Multi-Module Execution)
Khi yêu cầu liên quan đến nhiều module cùng phối hợp:
`[Sửa nhanh: <Module 1>, <Module 2>, ...] <Mục tiêu tổng quát>:`
`- Module <Tên Module 1>: <Thay đổi cụ thể gì>, chỉ sửa trúng đích file trong <Đường dẫn 1>`
`- Module <Tên Module 2>: <Thay đổi cụ thể gì>, chỉ sửa trúng đích file trong <Đường dẫn 2>`
`Không duyệt lại toàn bộ dự án.`

Trợ lý AI **BẮT BUỘC**:
1. **Chỉ mở đúng các file đích được chỉ định**: Lần lượt `view_file` -> `edit_file` đúng các file trong danh sách đường dẫn, tuyệt đối không duyệt lại toàn bộ dự án.
2. **Khớp đúng nội dung thay đổi của từng module**: Thực hiện chính xác yêu cầu cụ thể đã được phân công cho module đó.
3. **Biên dịch và kiểm tra nhanh**: Chạy `compile_applet` -> `lint_applet` và báo cáo kết quả súc tích.

## 4. Quy Tắc Luôn Đồng Bộ Sơ Đồ Cây Module (Tree-View Auto-Sync)
Mỗi khi người dùng yêu cầu sửa đổi module (dù đơn lẻ hay đa module):
1. **Cập nhật đồng bộ vào Sơ đồ cây**: Trợ lý AI **BẮT BUỘC** cập nhật tóm tắt mô tả, tính năng hoặc giao diện mới vào trang **Sơ đồ cây Module** trong Hướng dẫn Web (`src/modules/ModuleGiaoDien/HuongDanWeb/HuongDanWebView.tsx`).
2. **Chỉ sửa trúng đích file**: Chỉ mở và sửa trực tiếp file `HuongDanWebView.tsx`, không duyệt lại toàn bộ dự án.
