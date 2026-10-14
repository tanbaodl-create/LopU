// Bảng màu chuẩn mực theo Microsoft Word dành cho soạn thảo Word
export interface ColorOption {
  name: string;
  hex: string;
}

// 12 Màu chuẩn mực của Word (Standard Colors)
export const WORD_STANDARD_TEXT_COLORS: ColorOption[] = [
  { name: 'Đen (Tự động)', hex: '#000000' },
  { name: 'Đỏ sẫm', hex: '#c00000' },
  { name: 'Đỏ', hex: '#ff0000' },
  { name: 'Cam', hex: '#ed7d31' },
  { name: 'Vàng cam', hex: '#ffc000' },
  { name: 'Vàng', hex: '#ffff00' },
  { name: 'Xanh lá mạ', hex: '#92d050' },
  { name: 'Xanh lục', hex: '#00b050' },
  { name: 'Xanh lam nhạt', hex: '#00b0f0' },
  { name: 'Xanh dương', hex: '#0070c0' },
  { name: 'Xanh lam đậm', hex: '#002060' },
  { name: 'Tím', hex: '#7030a0' },
];

// Bảng màu chủ đề Office đầy đủ (Theme Colors - 10 cột x 6 hàng)
export const WORD_THEME_TEXT_COLORS: string[][] = [
  ['#ffffff', '#000000', '#eeece1', '#1f497d', '#4f81bd', '#c0504d', '#9bbb59', '#8064a2', '#4bacc6', '#f79646'],
  ['#f2f2f2', '#7f7f7f', '#ddd9c3', '#c6d9f0', '#dbe5f1', '#f2dcdb', '#ebf1dd', '#e5e0ec', '#dbeef3', '#fdeada'],
  ['#d8d8d8', '#595959', '#c4bd97', '#8db3e2', '#b8cce4', '#e5b9b7', '#d7e3bc', '#ccc1da', '#b7dde8', '#fbd5b5'],
  ['#bfbfbf', '#3f3f3f', '#938953', '#548dd4', '#95b3d7', '#d99694', '#c3d69b', '#b2a2c7', '#92cddc', '#fac08f'],
  ['#a5a5a5', '#262626', '#494429', '#17365d', '#366092', '#953734', '#76923c', '#5f497a', '#31859b', '#e36c09'],
  ['#7f7f7f', '#0c0c0c', '#1d1b10', '#0f243e', '#244061', '#632423', '#4f6128', '#3f3151', '#205867', '#974806'],
];

// 15 Màu highlight chuẩn mực của Microsoft Word
export const WORD_STANDARD_HIGHLIGHT_COLORS: ColorOption[] = [
  { name: 'Vàng dạ quang', hex: '#ffff00' },
  { name: 'Xanh lục dạ quang', hex: '#00ff00' },
  { name: 'Xanh lơ (Cyan)', hex: '#00ffff' },
  { name: 'Hồng dạ quang', hex: '#ff00ff' },
  { name: 'Xanh dương', hex: '#0000ff' },
  { name: 'Đỏ', hex: '#ff0000' },
  { name: 'Xanh đậm (Navy)', hex: '#000080' },
  { name: 'Xanh mòng két (Teal)', hex: '#008080' },
  { name: 'Xanh lục', hex: '#008000' },
  { name: 'Tím', hex: '#800080' },
  { name: 'Đỏ mận (Maroon)', hex: '#800000' },
  { name: 'Vàng ô liu (Olive)', hex: '#808000' },
  { name: 'Xám 50%', hex: '#808080' },
  { name: 'Xám 25%', hex: '#c0c0c0' },
  { name: 'Đen', hex: '#000000' },
];

// Nhóm màu nền dịu mắt / Pastel văn phòng
export const WORD_PASTEL_HIGHLIGHT_COLORS: ColorOption[] = [
  { name: 'Vàng kem nhạt', hex: '#fef9c3' },
  { name: 'Xanh lá nhạt', hex: '#dcfce7' },
  { name: 'Xanh lam nhạt', hex: '#dbeafe' },
  { name: 'Tím nhạt', hex: '#f3e8ff' },
  { name: 'Hồng nhạt', hex: '#ffe4e6' },
  { name: 'Cam đào nhạt', hex: '#ffedd5' },
  { name: 'Xám nhạt', hex: '#f1f5f9' },
];
