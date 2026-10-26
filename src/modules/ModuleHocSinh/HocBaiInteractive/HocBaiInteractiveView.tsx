import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Presentation,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  RotateCcw,
  Camera,
  Upload,
  Send,
  Award,
  Sparkles,
  FileCheck,
  ChevronRight,
  ChevronLeft,
  Eye,
  Check,
  X,
  AlertCircle,
  BarChart3,
  Layers,
  FileText,
  Video,
  Download,
  Share2,
  RefreshCw,
  ListOrdered,
  ListFilter,
  CheckSquare,
} from 'lucide-react';

export interface OptionItem {
  id: string;
  text: string;
}

export interface QuizQuestion {
  id: string;
  originalIndex: number; // Thứ tự câu gốc ban đầu của Giáo viên
  content: string;
  originalOptions: OptionItem[]; // Thứ tự phương án gốc
  correctOptionId: string;
  explanation: string;
}

export const HocBaiInteractiveView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'ppt' | 'luyenTap' | 'ktdg'>('luyenTap');

  // Mẫu dữ liệu bộ câu hỏi chuẩn từ Giáo viên
  const initialQuestions: QuizQuestion[] = useMemo(
    () => [
      {
        id: 'q1',
        originalIndex: 1,
        content: 'Cho hàm số y = f(x) có đạo hàm f\'(x) = x^2 - 4. Khẳng định nào sau đây đúng?',
        originalOptions: [
          { id: 'opt_a', text: 'Hàm số đồng biến trên khoảng (-2; 2)' },
          { id: 'opt_b', text: 'Hàm số nghịch biến trên khoảng (-2; 2)' },
          { id: 'opt_c', text: 'Hàm số nghịch biến trên khoảng (2; +inf)' },
          { id: 'opt_d', text: 'Hàm số đồng biến trên R' },
        ],
        correctOptionId: 'opt_b',
        explanation: 'Cho f\'(x) = 0 <=> x = ±2. Bảng xét dấu: Trong khoảng (-2; 2), f\'(x) < 0 nên hàm số nghịch biến.',
      },
      {
        id: 'q2',
        originalIndex: 2,
        content: 'Tìm tất cả giá trị thực của m để hàm số y = x^3 - 3mx^2 + 3x đơn điệu trên R.',
        originalOptions: [
          { id: 'opt_a', text: 'm ∈ [-1; 1]' },
          { id: 'opt_b', text: 'm ∈ (-inf; -1) ∪ (1; +inf)' },
          { id: 'opt_c', text: 'm ∈ (-1; 1)' },
          { id: 'opt_d', text: 'm ∈ [-2; 2]' },
        ],
        correctOptionId: 'opt_a',
        explanation: 'Hàm số đơn điệu trên R <=> y\' = 3x^2 - 6mx + 3 >= 0 với mọi x thuộc R <=> Δ\' = 9m^2 - 9 <= 0 <=> m ∈ [-1; 1].',
      },
      {
        id: 'q3',
        originalIndex: 3,
        content: 'Số điểm cực trị của hàm số y = x^4 - 2x^2 + 3 là bao nhiêu?',
        originalOptions: [
          { id: 'opt_a', text: '1 điểm cực trị' },
          { id: 'opt_b', text: '2 điểm cực trị' },
          { id: 'opt_c', text: '3 điểm cực trị' },
          { id: 'opt_d', text: '0 điểm cực trị' },
        ],
        correctOptionId: 'opt_c',
        explanation: 'Hàm trùng phương có a = 1, b = -2 => a.b = -2 < 0. Do đó hàm số có 3 điểm cực trị phân biệt.',
      },
    ],
    []
  );

  // -------------------------------------------------------------
  // TRẠNG THÁI CHO CHẾ ĐỘ PPT / KIẾN THỨC
  // -------------------------------------------------------------
  const [pptFileType, setPptFileType] = useState<'elearning' | 'pdf'>('elearning');
  const [currentPptSlide, setCurrentPptSlide] = useState<number>(1);
  const totalPptSlides = 6;

  // -------------------------------------------------------------
  // TRẠNG THÁI CHO CHẾ ĐỘ LUYỆN TẬP (PRACTICE MODE)
  // -------------------------------------------------------------
  // Luyện tập: Giữ nguyên thứ tự câu, xáo trộn phương án TNLC, làm xong câu nào HIỆN LỜI GIẢI NGAY câu đó
  const [practiceViewType, setPracticeViewType] = useState<'tungCau' | 'toanBo'>('tungCau');
  const [practiceCurrentQuestionIdx, setPracticeCurrentQuestionIdx] = useState<number>(0);
  const [practiceAnswers, setPracticeAnswers] = useState<Record<string, string>>({});

  // Cố định danh sách phương án đã xáo trộn cho từng câu trong Luyện tập
  const practiceShuffledOptions = useMemo(() => {
    const map: Record<string, OptionItem[]> = {};
    initialQuestions.forEach((q) => {
      // Xáo trộn ngẫu nhiên thứ tự phương án
      map[q.id] = [...q.originalOptions].sort(() => Math.random() - 0.5);
    });
    return map;
  }, [initialQuestions]);

  // -------------------------------------------------------------
  // TRẠNG THÁI CHO CHẾ ĐỘ KIỂM TRA ĐÁNH GIÁ (KTDG MODE)
  // -------------------------------------------------------------
  // KTDG: Mỗi lần vào lượt mới -> Xáo trộn cả thứ tự CÂU và thứ tự PHƯƠNG ÁN
  const [ktdgSessionId, setKtdgSessionId] = useState<number>(1);
  const [ktdgViewType, setKtdgViewType] = useState<'tungCau' | 'toanBo'>('tungCau');
  const [ktdgCurrentIdx, setKtdgCurrentIdx] = useState<number>(0);
  const [ktdgSubmitted, setKtdgSubmitted] = useState<boolean>(false);
  const [ktdgUserAnswers, setKtdgUserAnswers] = useState<Record<string, string>>({});
  const [ktdgReviewMode, setKtdgReviewMode] = useState<'thuTuLam' | 'thuTuGoc'>('thuTuLam');

  // Cấu trúc danh sách KTDG đã được xáo trộn câu & xáo trộn phương án lúc học sinh làm bài
  const ktdgSessionData = useMemo(() => {
    // 1. Xáo trộn thứ tự câu hỏi
    const shuffledQuestions = [...initialQuestions].sort(() => Math.random() - 0.5);

    // 2. Với mỗi câu hỏi, xáo trộn thứ tự phương án
    const items = shuffledQuestions.map((q) => {
      const shuffledOpts = [...q.originalOptions].sort(() => Math.random() - 0.5);
      return {
        question: q,
        shuffledOptionsDuringTest: shuffledOpts,
      };
    });

    return items;
  }, [initialQuestions, ktdgSessionId]);

  // Bắt đầu lượt làm bài KTDG mới
  const handleResetKtdgSession = () => {
    setKtdgSessionId((prev) => prev + 1);
    setKtdgSubmitted(false);
    setKtdgUserAnswers({});
    setKtdgCurrentIdx(0);
  };

  // Tính điểm bài KTDG
  const ktdgScore = useMemo(() => {
    if (!ktdgSubmitted) return 0;
    let correctCount = 0;
    initialQuestions.forEach((q) => {
      if (ktdgUserAnswers[q.id] === q.correctOptionId) {
        correctCount++;
      }
    });
    return Math.round((correctCount / initialQuestions.length) * 10 * 10) / 10;
  }, [ktdgSubmitted, ktdgUserAnswers, initialQuestions]);

  // Trạng thái Gửi Bài Chụp Live sang Bảng Giảng của Giáo viên
  const [photoSent, setPhotoSent] = useState<boolean>(false);
  const [photoFileUrl, setPhotoFileUrl] = useState<string>('');

  const handleSendLivePhoto = () => {
    setPhotoSent(true);
    setTimeout(() => {
      alert('Đã gửi thành công bài làm chụp live sang Cửa sổ Dạy học của Giáo viên!');
    }, 300);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-800 via-purple-700 to-teal-800 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[11px] font-extrabold uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" /> Phân Hệ Học Bài &amp; Luyện Tập Dành Cho Học Sinh
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black">Không Gian Học Tập &amp; Luyện Tập Tương Tác</h1>
          <p className="text-xs sm:text-sm text-indigo-100 max-w-2xl leading-relaxed">
            Học tập đa phương thức PPT / E-learning / PDF, Luyện tập hiển thị lời giải tức thì, Kiểm tra đánh giá xáo câu/phương án ngẫu nhiên kèm chế độ Xem lại Thứ tự làm &amp; Thứ tự gốc.
          </p>
        </div>

        {/* Nút Chụp & Nộp Bài Live */}
        <div className="flex items-center gap-2 bg-white/10 p-2 rounded-2xl border border-white/20 shrink-0">
          <button
            onClick={handleSendLivePhoto}
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-black rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            <span>Chụp &amp; Nộp Bài Live Cho Giáo Viên</span>
          </button>
        </div>
      </div>

      {/* Thanh Tabs Chuyển Chế Độ Học Bài */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('ppt')}
          className={`px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'ppt'
              ? 'bg-teal-600 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Presentation className="w-4 h-4" />
          <span>1. Kiến Thức Trọng Tâm (PPT / E-learning / PDF)</span>
        </button>

        <button
          onClick={() => setActiveTab('luyenTap')}
          className={`px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'luyenTap'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>2. Luyện Tập (Hiện Lời Giải Tức Thì)</span>
        </button>

        <button
          onClick={() => setActiveTab('ktdg')}
          className={`px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'ktdg'
              ? 'bg-purple-600 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>3. Kiểm Tra Đánh Giá (Xáo Trộn &amp; Chế Độ Xem Lại)</span>
        </button>
      </div>

      {/* TAB 1: CHẾ ĐỘ HỌC KIẾN THỨC (PPT / E-LEARNING / PDF) */}
      {activeTab === 'ppt' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="space-y-1">
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Presentation className="w-5 h-5 text-teal-600" />
                <span>Nội Dung Bài Học Kiến Thức Chuyên Đề</span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Chuyển đổi giữa định dạng E-learning bài giảng tương tác hoặc Đọc File PDF In đề/HS
              </p>
            </div>

            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setPptFileType('elearning')}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                  pptFileType === 'elearning' ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-600'
                }`}
              >
                Bài Giảng E-Learning (PPT)
              </button>
              <button
                onClick={() => setPptFileType('pdf')}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                  pptFileType === 'pdf' ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-600'
                }`}
              >
                File PDF Học Sinh / In Đề
              </button>
            </div>
          </div>

          {/* Màn chiếu PPT / PDF Previewer */}
          <div className="bg-slate-950 rounded-2xl p-8 text-white min-h-[420px] flex flex-col justify-between relative shadow-xl border border-slate-800">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="px-3 py-1 bg-teal-500/20 text-teal-300 rounded-lg text-xs font-bold border border-teal-500/30">
                  {pptFileType === 'elearning' ? '🎬 E-learning Slide Mode' : '📄 PDF Reader Mode'}
                </span>
                <span className="text-xs text-slate-400 font-bold">
                  Trang {currentPptSlide} / {totalPptSlides}
                </span>
              </div>

              <div className="py-6 space-y-4">
                <h3 className="text-xl font-black text-teal-300">
                  Slide {currentPptSlide}: Tính Đơn Điệu &amp; Cực Trị Của Hàm Số
                </h3>
                <p className="text-sm text-slate-200 leading-relaxed font-medium">
                  {currentPptSlide === 1 &&
                    '1. Định nghĩa tính đơn điệu: Cho hàm số y = f(x) xác định trên khoảng K. Hàm số f(x) gọi là đồng biến trên K nếu với mọi x1 < x2 thuộc K thì f(x1) < f(x2).'}
                  {currentPptSlide === 2 &&
                    '2. Điều kiện cần và đủ để hàm số đơn điệu: Cho hàm số f(x) có đạo hàm trên K. Nếu f\'(x) >= 0 với mọi x thuộc K và f\'(x) = 0 tại hữu hạn điểm thì f(x) đồng biến trên K.'}
                  {currentPptSlide === 3 &&
                    '3. Quy tắc tìm khoảng đơn điệu: Bước 1: Tìm tập xác định. Bước 2: Tính đạo hàm f\'(x), tìm nghiệm. Bước 3: Lập bảng biến thiên và kết luận.'}
                  {currentPptSlide > 3 &&
                    `Nội dung slide bài giảng tương tác nâng cao trang ${currentPptSlide}. Bao gồm ví dụ minh họa và sơ đồ tư duy tóm tắt kiến thức.`}
                </p>
              </div>
            </div>

            {/* Thanh điều hướng Slide */}
            <div className="flex items-center justify-between border-t border-slate-800 pt-4">
              <button
                disabled={currentPptSlide <= 1}
                onClick={() => setCurrentPptSlide((p) => Math.max(1, p - 1))}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Slide Trước</span>
              </button>

              <span className="text-xs text-slate-400 font-extrabold">
                Click chuyển Slide tiếp theo
              </span>

              <button
                disabled={currentPptSlide >= totalPptSlides}
                onClick={() => setCurrentPptSlide((p) => Math.min(totalPptSlides, p + 1))}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <span>Slide Tiếp Theo</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CHẾ ĐỘ LUYỆN TẬP (GIỮ THỨ TỰ CÂU - XÁO PHƯƠNG ÁN - HIỆN LỜI GIẢI TỨC THÌ) */}
      {activeTab === 'luyenTap' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="space-y-1">
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <span>Luyện Tập Theo Cấp Độ (Hiện Lời Giải Tức Thì)</span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Thứ tự câu giữ nguyên ban đầu, xáo trộn phương án TNLC. Chọn đáp án câu nào hiện lời giải câu đó ngay lập tức!
              </p>
            </div>

            {/* Toggle Xem Từng Câu / Xem Toàn Bộ */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setPracticeViewType('tungCau')}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                  practiceViewType === 'tungCau' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                Hiện Từng Câu
              </button>
              <button
                onClick={() => setPracticeViewType('toanBo')}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                  practiceViewType === 'toanBo' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                Hiện Toàn Bộ Đề
              </button>
            </div>
          </div>

          {/* DANH SÁCH CÂU HỎI LUYỆN TẬP */}
          <div className="space-y-6">
            {initialQuestions
              .filter((_, idx) => practiceViewType === 'toanBo' || idx === practiceCurrentQuestionIdx)
              .map((q) => {
                const selectedOptId = practiceAnswers[q.id];
                const isAnswered = !!selectedOptId;
                const shuffledOpts = practiceShuffledOptions[q.id] || q.originalOptions;

                return (
                  <div
                    key={q.id}
                    className="p-5 bg-slate-50 rounded-2xl border border-slate-200 shadow-xs space-y-4"
                  >
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <span className="text-xs font-black text-indigo-900 bg-indigo-100 px-3 py-1 rounded-lg">
                        Câu {q.originalIndex} (Thứ tự gốc Giáo viên)
                      </span>
                      {isAnswered && (
                        <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          Đã trả lời - Lời giải công khai
                        </span>
                      )}
                    </div>

                    <p className="text-sm font-bold text-slate-800 leading-relaxed">{q.content}</p>

                    {/* Danh sách phương án đã xáo trộn */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {shuffledOpts.map((opt, oIdx) => {
                        const optLabel = String.fromCharCode(65 + oIdx); // A, B, C, D
                        const isSelected = selectedOptId === opt.id;
                        const isCorrect = opt.id === q.correctOptionId;

                        let btnStyle = 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300';
                        if (isAnswered) {
                          if (isCorrect) {
                            btnStyle = 'bg-emerald-50 text-emerald-900 border-emerald-500 font-black ring-2 ring-emerald-400';
                          } else if (isSelected) {
                            btnStyle = 'bg-rose-50 text-rose-900 border-rose-400 font-bold';
                          }
                        } else if (isSelected) {
                          btnStyle = 'bg-indigo-50 text-indigo-900 border-indigo-500 font-black';
                        }

                        return (
                          <button
                            key={opt.id}
                            onClick={() =>
                              setPracticeAnswers((prev) => ({ ...prev, [q.id]: opt.id }))
                            }
                            className={`p-3 rounded-xl border text-left text-xs transition-all flex items-start gap-2.5 cursor-pointer ${btnStyle}`}
                          >
                            <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-800 font-black text-[11px] flex items-center justify-center shrink-0 border border-slate-200">
                              {optLabel}
                            </span>
                            <span className="leading-snug">{opt.text}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* HIỆN LỜI GIẢI NGAY LẬP TỨC KHI HỌC SINH ĐÃ CHỌN CÂU NÀY */}
                    {isAnswered && (
                      <div className="mt-4 p-4 bg-emerald-50/80 rounded-xl border border-emerald-200 text-xs text-emerald-950 space-y-2 animate-fadeIn">
                        <div className="flex items-center gap-1.5 font-black text-emerald-800">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Lời Giải Chi Tiết (Tự động hiển thị sau khi chọn):</span>
                        </div>
                        <p className="leading-relaxed font-medium pl-5 whitespace-pre-line">{q.explanation}</p>
                      </div>
                    )}
                  </div>
                );
              })}

            {/* Thanh điều hướng câu khi ở chế độ Hiện Từng Câu */}
            {practiceViewType === 'tungCau' && (
              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <button
                  disabled={practiceCurrentQuestionIdx <= 0}
                  onClick={() => setPracticeCurrentQuestionIdx((p) => Math.max(0, p - 1))}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-800 rounded-xl text-xs font-black transition-all cursor-pointer"
                >
                  ← Câu Trước
                </button>

                <span className="text-xs font-bold text-slate-500">
                  Câu {practiceCurrentQuestionIdx + 1} / {initialQuestions.length}
                </span>

                <button
                  disabled={practiceCurrentQuestionIdx >= initialQuestions.length - 1}
                  onClick={() =>
                    setPracticeCurrentQuestionIdx((p) => Math.min(initialQuestions.length - 1, p + 1))
                  }
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-md"
                >
                  Câu Tiếp Theo →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: CHẾ ĐỘ KIỂM TRA ĐÁNH GIÁ (KTDG - XÁO TRỘN CÂU/PHƯƠNG ÁN & CHẾ ĐỘ XEM LẠI 2 TÙY CHỌN) */}
      {activeTab === 'ktdg' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="space-y-1">
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Award className="w-5 h-5 text-purple-600" />
                <span>Bài Kiểm Tra Đánh Giá (KTDG)</span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Mỗi lần làm bài thứ tự câu và phương án đều được xáo trộn ngẫu nhiên. Nộp bài mới hiện điểm số!
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleResetKtdgSession}
                className="px-3.5 py-2 bg-purple-100 hover:bg-purple-200 text-purple-900 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Bắt Đầu Lượt Làm Bài Mới (Xáo Trộn Ngẫu Nhiên)</span>
              </button>
            </div>
          </div>

          {/* ĐIỂM SỐ VÀ CHẾ ĐỘ XEM LẠI KHI ĐÃ NỘP BÀI */}
          {ktdgSubmitted ? (
            <div className="space-y-6">
              {/* Card Điểm Số */}
              <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 p-6 rounded-3xl text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-2 text-center sm:text-left">
                  <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-[11px] font-extrabold uppercase border border-emerald-500/30">
                    🎉 Hoàn thành bài Kiểm tra Đánh giá
                  </span>
                  <h3 className="text-xl font-black">Kết Quả Bài Làm Lượt #{ktdgSessionId}</h3>
                  <p className="text-xs text-purple-200 font-medium">
                    Bạn có thể chuyển đổi giữa 2 chế độ xem lại bên dưới để đối chiếu kết quả.
                  </p>
                </div>

                <div className="text-center bg-white/10 p-4 rounded-2xl border border-white/20 shrink-0 min-w-[140px]">
                  <span className="text-3xl font-black text-amber-300">{ktdgScore}</span>
                  <span className="text-xs font-bold text-slate-300 block">/ 10.0 Điểm</span>
                </div>
              </div>

              {/* CHỌN 2 CHẾ ĐỘ XEM LẠI KTDG: THỨ TỰ LÀM VÀ THỨ TỰ GỐC */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 font-extrabold text-xs text-slate-800">
                  <Eye className="w-4 h-4 text-purple-600" />
                  <span>Chọn Tùy Chọn Chế Độ Xem Lại:</span>
                </div>

                <div className="flex items-center bg-white p-1 rounded-xl border border-slate-300 shadow-xs">
                  <button
                    onClick={() => setKtdgReviewMode('thuTuLam')}
                    className={`px-4 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                      ktdgReviewMode === 'thuTuLam'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    1. Thứ Tự Làm (Theo lúc Học sinh làm bài)
                  </button>

                  <button
                    onClick={() => setKtdgReviewMode('thuTuGoc')}
                    className={`px-4 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                      ktdgReviewMode === 'thuTuGoc'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    2. Thứ Tự Gốc (Theo Đề gốc Giáo viên đưa lên)
                  </button>
                </div>
              </div>

              {/* DANH SÁCH CÂU HỎI KHI XEM LẠI */}
              <div className="space-y-6">
                {(ktdgReviewMode === 'thuTuLam'
                  ? ktdgSessionData
                  : initialQuestions.map((q) => ({ question: q, shuffledOptionsDuringTest: q.originalOptions }))
                ).map((item, idx) => {
                  const q = item.question;
                  const opts = item.shuffledOptionsDuringTest;
                  const userAns = ktdgUserAnswers[q.id];
                  const isCorrect = userAns === q.correctOptionId;

                  return (
                    <div
                      key={q.id}
                      className={`p-5 rounded-2xl border shadow-xs space-y-4 ${
                        isCorrect ? 'bg-emerald-50/50 border-emerald-200' : 'bg-rose-50/50 border-rose-200'
                      }`}
                    >
                      <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black bg-slate-900 text-white px-3 py-1 rounded-lg">
                            {ktdgReviewMode === 'thuTuLam'
                              ? `Câu ${idx + 1} (Lúc học sinh làm bài)`
                              : `Câu Gốc ${q.originalIndex} (Giáo viên)`}
                          </span>
                          <span
                            className={`text-xs font-black px-2.5 py-0.5 rounded-full ${
                              isCorrect
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {isCorrect ? '✓ Đúng' : '✗ Sai'}
                          </span>
                        </div>

                        <span className="text-xs text-slate-500 font-bold">
                          Đáp án đúng: Ý {q.correctOptionId.replace('opt_', '').toUpperCase()}
                        </span>
                      </div>

                      <p className="text-sm font-bold text-slate-800 leading-relaxed">{q.content}</p>

                      {/* Hiển thị các phương án với badge phân biệt */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {opts.map((opt, oIdx) => {
                          const optLabel = String.fromCharCode(65 + oIdx);
                          const isUserChoice = userAns === opt.id;
                          const isCorrectOpt = opt.id === q.correctOptionId;

                          let style = 'bg-white text-slate-700 border-slate-200';
                          if (isCorrectOpt) {
                            style = 'bg-emerald-100 text-emerald-900 border-emerald-500 font-black ring-2 ring-emerald-400';
                          } else if (isUserChoice && !isCorrectOpt) {
                            style = 'bg-rose-100 text-rose-900 border-rose-400 font-black';
                          }

                          return (
                            <div
                              key={opt.id}
                              className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-2 ${style}`}
                            >
                              <div className="flex items-start gap-2">
                                <span className="w-5 h-5 rounded-md bg-slate-200 text-slate-900 font-black text-[11px] flex items-center justify-center shrink-0">
                                  {optLabel}
                                </span>
                                <span>{opt.text}</span>
                              </div>

                              <div className="shrink-0 flex items-center gap-1">
                                {isUserChoice && (
                                  <span className="px-2 py-0.5 bg-indigo-600 text-white text-[10px] font-black rounded-md">
                                    HS chọn
                                  </span>
                                )}
                                {isCorrectOpt && (
                                  <span className="px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-black rounded-md">
                                    Đáp án đúng
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed">
                        <strong className="text-purple-900">Giải thích chi tiết: </strong>
                        {q.explanation}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* MÀN HÌNH ĐANG LÀM BÀI KTDG (CHƯA NỘP) */
            <div className="space-y-6">
              <div className="space-y-6">
                {ktdgSessionData.map((item, idx) => {
                  const q = item.question;
                  const opts = item.shuffledOptionsDuringTest;
                  const selectedOptId = ktdgUserAnswers[q.id];

                  return (
                    <div
                      key={q.id}
                      className="p-5 bg-slate-50 rounded-2xl border border-slate-200 shadow-xs space-y-4"
                    >
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <span className="text-xs font-black text-purple-900 bg-purple-100 px-3 py-1 rounded-lg">
                          Câu {idx + 1} / {ktdgSessionData.length} (Xáo trộn ngẫu nhiên)
                        </span>
                        {selectedOptId && (
                          <span className="text-xs font-bold text-indigo-600">✓ Đã chọn đáp án</span>
                        )}
                      </div>

                      <p className="text-sm font-bold text-slate-800 leading-relaxed">{q.content}</p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {opts.map((opt, oIdx) => {
                          const optLabel = String.fromCharCode(65 + oIdx);
                          const isSelected = selectedOptId === opt.id;

                          return (
                            <button
                              key={opt.id}
                              onClick={() =>
                                setKtdgUserAnswers((prev) => ({ ...prev, [q.id]: opt.id }))
                              }
                              className={`p-3 rounded-xl border text-left text-xs transition-all flex items-start gap-2.5 cursor-pointer ${
                                isSelected
                                  ? 'bg-purple-600 text-white border-purple-700 font-black shadow-sm'
                                  : 'bg-white text-slate-700 border-slate-200 hover:border-purple-300'
                              }`}
                            >
                              <span
                                className={`w-5 h-5 rounded-md font-black text-[11px] flex items-center justify-center shrink-0 border ${
                                  isSelected
                                    ? 'bg-white text-purple-900 border-white'
                                    : 'bg-slate-100 text-slate-800 border-slate-200'
                                }`}
                              >
                                {optLabel}
                              </span>
                              <span className="leading-snug">{opt.text}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Nút Nộp Bài KTDG */}
              <div className="pt-4 border-t border-slate-200 flex justify-end">
                <button
                  onClick={() => setKtdgSubmitted(true)}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-2xl text-sm font-black shadow-lg transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Nộp Bài Kiểm Tra &amp; Xem Điểm Số</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
