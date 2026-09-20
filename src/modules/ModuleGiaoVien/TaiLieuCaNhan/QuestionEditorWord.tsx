import React, { useState, useEffect } from 'react';
import {
  Layers,
  FileText,
  Tv,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Copy,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  Users,
  Maximize2,
  Minimize2,
  Check,
  ChevronDown,
  Edit3,
  HelpCircle,
  Calculator,
  CheckSquare,
  MessageSquare,
  X
} from 'lucide-react';
import { StudentProfile, QUESTION_LEVELS, QuestionLevelDef, UserRole } from '../../../services/storageTypes';
import { getStudentsByClassId } from '../../ConnectData/ConnectFirestore';
import { saveAssessmentJsonToChuyenDeDrive } from '../../ConnectData/ConnectDrive/googleDriveService';
import { MathTypeEditorModal } from './MathTypeEditorModal';
import { MathFormulaRenderer } from './MathFormulaRenderer';

export type QuestionViewMode = 'split' | 'full' | 'ppt';

export type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer';

export interface TrueFalseStatement {
  key: 'a' | 'b' | 'c' | 'd';
  text: string;
  isCorrect: boolean; // true = Đúng, false = Sai
}

export interface QuestionItem {
  id: string;
  questionNumber: number;
  content: string;
  level: number; // 1 to 6
  type: QuestionType;
  // Cho trắc nghiệm 4 lựa chọn A, B, C, D
  options: { key: 'A' | 'B' | 'C' | 'D'; text: string }[];
  correctAnswer: string;
  // Cho trắc nghiệm đúng/sai 4 ý (a, b, c, d)
  tfStatements?: TrueFalseStatement[];
  // Cho trả lời ngắn
  shortAnswerText?: string;
  solution: string; // Lời giải luôn nằm liền sau câu hỏi
  points: number; // Điểm mặc định: Lựa chọn 0.25đ, Đúng sai tối đa 1.0đ, Trả lời ngắn 0.5đ
}

// Bảng tính điểm chuẩn của Bộ GD&ĐT cho câu đúng sai
export const TRUE_FALSE_SCORE_MAP: Record<number, number> = {
  1: 0.1,  // Đúng 1 ý: 0.1 điểm
  2: 0.25, // Đúng 2 ý: 0.25 điểm
  3: 0.5,  // Đúng 3 ý: 0.5 điểm
  4: 1.0,  // Đúng 4 ý: 1.0 điểm
};

const DEFAULT_QUESTIONS: QuestionItem[] = [
  {
    id: 'q_1',
    questionNumber: 1,
    content: 'Tập xác định của hàm số $y = \\sqrt{x - 2}$ là:',
    level: 1, // Mức 1: 0 -> <=2 điểm
    type: 'multiple_choice',
    options: [
      { key: 'A', text: '$D = [2; +\\infty)$' },
      { key: 'B', text: '$D = (2; +\\infty)$' },
      { key: 'C', text: '$D = (-\\infty; 2]$' },
      { key: 'D', text: '$D = \\mathbb{R} \\setminus \\{2\\}$' },
    ],
    correctAnswer: 'A',
    solution: 'Hàm số xác định khi và chỉ khi biểu thức dưới dấu căn không âm: $x - 2 \\ge 0 \\Leftrightarrow x \\ge 2$. Vậy tập xác định là $D = [2; +\\infty)$.',
    points: 0.25, // Điểm mặc định trắc nghiệm lựa chọn
  },
  {
    id: 'q_2',
    questionNumber: 2,
    content: 'Cho hàm số bậc hai $y = f(x) = ax^2 + bx + c$ có đồ thị như hình vẽ. Xét tính đúng sai của các mệnh đề sau:',
    level: 3, // Mức 3: 4 -> <6 điểm
    type: 'true_false',
    options: [],
    correctAnswer: 'a: Đúng; b: Sai; c: Đúng; d: Đúng',
    tfStatements: [
      { key: 'a', text: 'Hệ số $a > 0$ do bề lõm của parabol quay lên trên.', isCorrect: true },
      { key: 'b', text: 'Tọa độ đỉnh của parabol có hoành độ $x_I = -\\frac{b}{2a} < 0$.', isCorrect: false },
      { key: 'c', text: 'Đồ thị cắt trục tung tại điểm có tung độ dương $c > 0$.', isCorrect: true },
      { key: 'd', text: 'Phương trình $f(x) = 0$ có hai nghiệm phân biệt $x_1, x_2$.', isCorrect: true },
    ],
    solution: 'a) Đúng vì parabol hướng lên trên nên $a > 0$.\nb) Sai vì đỉnh $I$ nằm ở góc phần tư thứ nhất nên hoành độ $x_I > 0$.\nc) Đúng vì giao điểm với trục tung có tung độ nằm trên trục hoành.\nd) Đúng vì parabol cắt trục hoành tại hai điểm phân biệt.',
    points: 1.0, // Điểm tối đa 4 ý
  },
  {
    id: 'q_3',
    questionNumber: 3,
    content: 'Tìm giá trị nhỏ nhất của hàm số $f(x) = x + \\frac{4}{x}$ trên khoảng $(0; +\\infty)$.',
    level: 4, // Mức 4: 6 -> <8 điểm
    type: 'short_answer',
    options: [],
    correctAnswer: '4',
    shortAnswerText: '4',
    solution: 'Áp dụng bất đẳng thức Cô-si cho hai số dương $x$ và $\\frac{4}{x}$:\n$f(x) = x + \\frac{4}{x} \\ge 2\\sqrt{x \\cdot \\frac{4}{x}} = 2 \\cdot 2 = 4$.\nDấu "=" xảy ra khi và chỉ khi $x = \\frac{4}{x} \\Leftrightarrow x^2 = 4 \\Leftrightarrow x = 2$ (do $x > 0$).\nVậy giá trị nhỏ nhất bằng 4.',
    points: 0.5, // Điểm mặc định câu trả lời ngắn
  },
  {
    id: 'q_4',
    questionNumber: 4,
    content: 'Tìm tất cả các giá trị thực của tham số $m$ để phương trình $x^2 - 2(m-1)x + m^2 - 3m = 0$ có hai nghiệm phân biệt $x_1, x_2$ thỏa mãn $x_1^2 + x_2^2 = 14$.',
    level: 5, // Mức 5: 8 -> 9 điểm
    type: 'multiple_choice',
    options: [
      { key: 'A', text: '$m = 3$' },
      { key: 'B', text: '$m = -1$' },
      { key: 'C', text: '$m = 3$ hoặc $m = -1$' },
      { key: 'D', text: '$m = 2$' },
    ],
    correctAnswer: 'A',
    solution: '1. Điều kiện để phương trình có 2 nghiệm phân biệt: $\\Delta\' = (m-1)^2 - (m^2 - 3m) = m + 1 > 0 \\Leftrightarrow m > -1$.\n2. Theo định lý Vi-ét: $x_1 + x_2 = 2(m-1)$ và $x_1 x_2 = m^2 - 3m$.\n3. Ta có $x_1^2 + x_2^2 = (x_1+x_2)^2 - 2x_1 x_2 = 4(m-1)^2 - 2(m^2 - 3m) = 2m^2 - 2m + 4$.\nTheo bài ra: $2m^2 - 2m + 4 = 14 \\Leftrightarrow 2m^2 - 2m - 10 = 0 \\Leftrightarrow m^2 - m - 6 = 0 \\Leftrightarrow m = 3$ (nhận) hoặc $m = -2$ (loại do $m > -1$).\nVậy $m = 3$.',
    points: 0.25,
  },
];

export interface QuestionEditorWordProps {
  title: string;
  chuong?: string;
  bai?: string;
  vanDe?: string;
  chuyenDe?: string;
  selectedClassId?: string;
  viewMode?: QuestionViewMode;
  onChangeViewMode?: (mode: QuestionViewMode) => void;
  onSaveDriveSuccess?: (filePath: string) => void;
  currentRole?: UserRole;
}

const InsertQuestionBar: React.FC<{
  onInsert: (type: QuestionType) => void;
  label?: string;
}> = ({ onInsert, label = '+ Thêm câu hỏi' }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative my-2 py-1 flex flex-col items-center justify-center group">
      <div className="absolute inset-0 flex items-center" aria-hidden="true">
        <div className="w-full border-t border-dashed border-indigo-200 group-hover:border-indigo-400 transition-colors" />
      </div>

      <div className="relative z-10">
        {!isOpen ? (
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="px-3.5 py-1 rounded-full bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-200 font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer opacity-85 group-hover:opacity-100"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{label}</span>
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-2 bg-white p-1.5 rounded-xl border border-indigo-300 shadow-md animate-fade-in">
            <span className="text-[11px] font-bold text-indigo-900 px-1">Vị trí này:</span>
            <button
              type="button"
              onClick={() => {
                onInsert('multiple_choice');
                setIsOpen(false);
              }}
              className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>+ Trắc nghiệm</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onInsert('true_false');
                setIsOpen(false);
              }}
              className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>+ Đúng/Sai</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onInsert('short_answer');
                setIsOpen(false);
              }}
              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>+ Trả lời ngắn</span>
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              title="Đóng"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export const QuestionEditorWord: React.FC<QuestionEditorWordProps> = ({
  title,
  chuong = 'Chương 1',
  bai = 'Bài 1',
  vanDe = 'Vấn đề 1',
  chuyenDe = 'Chuyên đề trọng tâm',
  selectedClassId = '10A1',
  viewMode = 'split',
  onChangeViewMode,
  onSaveDriveSuccess,
  currentRole,
}) => {
  const isTeacher = React.useMemo(() => {
    if (currentRole) return currentRole !== 'student';
    if (typeof window !== 'undefined') {
      const r =
        localStorage.getItem('currentUserRole') ||
        localStorage.getItem('userRole') ||
        localStorage.getItem('role');
      if (r === 'student') return false;
    }
    return true;
  }, [currentRole]);
  const [questions, setQuestions] = useState<QuestionItem[]>(DEFAULT_QUESTIONS);
  const [editingQuestionIds, setEditingQuestionIds] = useState<Record<string, boolean>>({});
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);
  const [showSlideSolution, setShowSlideSolution] = useState<boolean>(false);
  const [isFullScreenPpt, setIsFullScreenPpt] = useState<boolean>(false);
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [openStudentListForQ, setOpenStudentListForQ] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Lắng nghe sự kiện chèn TikZ / bảng biến thiên / nội dung từ Toolbar
  useEffect(() => {
    const handleSnippetInsert = (e: Event) => {
      const customEvt = e as CustomEvent<{ code: string; type?: string; title?: string }>;
      if (!customEvt.detail || !customEvt.detail.code) return;
      const snippet = customEvt.detail.code;

      setQuestions(prev => {
        if (prev.length === 0) {
          const newQ: QuestionItem = {
            id: `q_${Date.now()}`,
            questionNumber: 1,
            type: 'multiple_choice',
            level: 3,
            points: 0.25,
            content: `Cho đồ thị / bảng biến thiên sau:\n\n${snippet}`,
            options: [
              { key: 'A', text: 'Hàm số đồng biến trên khoảng $(0; 2)$' },
              { key: 'B', text: 'Hàm số nghịch biến trên khoảng $(-1; 1)$' },
              { key: 'C', text: 'Hàm số đạt cực đại tại $x = 0$' },
              { key: 'D', text: 'Hàm số đạt cực tiểu tại $x = 1$' },
            ],
            tfStatements: [
              { key: 'a', text: 'Hàm số có 2 điểm cực trị', isCorrect: true },
              { key: 'b', text: 'Giá trị cực tiểu là $-2$', isCorrect: false },
              { key: 'c', text: 'Đồ thị cắt trục hoành tại 3 điểm', isCorrect: true },
              { key: 'd', text: 'Hàm số đồng biến trên $(1; +\\infty)$', isCorrect: true },
            ],
            shortAnswerText: '',
            correctAnswer: 'A',
            solution: 'Dựa vào bảng biến thiên / đồ thị TikZ đã cho để suy ra đáp án chính xác.',
          };
          setEditingQuestionIds({ [newQ.id]: true });
          setActiveQuestionId(newQ.id);
          return [newQ];
        }

        const targetId = activeQuestionId || prev[0].id;
        setEditingQuestionIds(old => ({ ...old, [targetId]: true }));
        setActiveQuestionId(targetId);

        return prev.map(q => {
          if (q.id === targetId) {
            const separator = q.content && q.content.trim() ? '\n\n' : '';
            return {
              ...q,
              content: q.content + separator + snippet,
            };
          }
          return q;
        });
      });

      setSaveStatus(`✨ Đã chèn thành công ${customEvt.detail.title || 'mã TikZ/công thức'} vào câu hỏi đang chọn!`);
      setTimeout(() => setSaveStatus(null), 5000);
    };

    window.addEventListener('app-insert-word-snippet', handleSnippetInsert);
    return () => {
      window.removeEventListener('app-insert-word-snippet', handleSnippetInsert);
    };
  }, [activeQuestionId]);

  // Trạng thái cho MathType Editor Modal (khi kích vào sửa công thức)
  const [mathModalState, setMathModalState] = useState<{
    isOpen: boolean;
    initialFormula: string;
    rawMatch?: string;
    questionId: string;
    field: 'content' | 'option' | 'solution' | 'tfStatement';
    optionKey?: string;
  }>({
    isOpen: false,
    initialFormula: '',
    rawMatch: '',
    questionId: '',
    field: 'content',
  });

  // Tải danh sách học sinh của lớp để tính toán phân nhóm bắt buộc / khuyến khích
  useEffect(() => {
    async function loadClassStudents() {
      if (selectedClassId) {
        const list = await getStudentsByClassId(selectedClassId);
        setStudents(list);
      }
    }
    loadClassStudents();
  }, [selectedClassId]);

  // Bật/Tắt chế độ sửa câu hỏi (hiện lại dạng text chưa dịch công thức)
  const toggleEditQuestion = (qId: string) => {
    setEditingQuestionIds(prev => ({
      ...prev,
      [qId]: !prev[qId],
    }));
  };

  // Thêm câu hỏi tại vị trí chỉ định
  const handleInsertQuestionAt = (atIndex: number, type: QuestionType = 'multiple_choice') => {
    let defaultPoints = 0.25;
    if (type === 'true_false') defaultPoints = 1.0;
    if (type === 'short_answer') defaultPoints = 0.5;

    const newQ: QuestionItem = {
      id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      questionNumber: atIndex + 1,
      content: `Nội dung câu hỏi số ${atIndex + 1}...`,
      level: 3,
      type,
      options: [
        { key: 'A', text: 'Phương án A' },
        { key: 'B', text: 'Phương án B' },
        { key: 'C', text: 'Phương án C' },
        { key: 'D', text: 'Phương án D' },
      ],
      tfStatements: [
        { key: 'a', text: 'Ý khẳng định a...', isCorrect: true },
        { key: 'b', text: 'Ý khẳng định b...', isCorrect: false },
        { key: 'c', text: 'Ý khẳng định c...', isCorrect: true },
        { key: 'd', text: 'Ý khẳng định d...', isCorrect: false },
      ],
      shortAnswerText: '',
      correctAnswer: type === 'multiple_choice' ? 'A' : type === 'true_false' ? 'a: Đúng; b: Sai; c: Đúng; d: Sai' : '',
      solution: 'Lời giải chi tiết...',
      points: defaultPoints,
    };

    setQuestions(prev => {
      const next = [...prev];
      next.splice(atIndex, 0, newQ);
      return next.map((q, idx) => ({ ...q, questionNumber: idx + 1 }));
    });

    setEditingQuestionIds(prev => ({ ...prev, [newQ.id]: true }));
  };

  // Cập nhật thuộc tính câu hỏi
  const handleUpdateQuestion = (qId: string, patch: Partial<QuestionItem>) => {
    setQuestions(prev =>
      prev.map(q => (q.id === qId ? { ...q, ...patch } : q))
    );
  };

  // Chuyển đổi loại câu hỏi với điểm mặc định chuẩn xác
  const handleChangeQuestionType = (qId: string, newType: QuestionType) => {
    setQuestions(prev =>
      prev.map(q => {
        if (q.id !== qId) return q;
        let points = 0.25;
        let tfStatements = q.tfStatements;
        let options = q.options;
        let correctAnswer = q.correctAnswer;

        if (newType === 'multiple_choice') {
          points = 0.25; // 0.25đ mặc định
          if (!options || options.length === 0) {
            options = [
              { key: 'A', text: 'Phương án A' },
              { key: 'B', text: 'Phương án B' },
              { key: 'C', text: 'Phương án C' },
              { key: 'D', text: 'Phương án D' },
            ];
          }
          correctAnswer = 'A';
        } else if (newType === 'true_false') {
          points = 1.0; // Tối đa 1 điểm cho 4 ý đúng
          if (!tfStatements || tfStatements.length === 0) {
            tfStatements = [
              { key: 'a', text: 'Mệnh đề a', isCorrect: true },
              { key: 'b', text: 'Mệnh đề b', isCorrect: false },
              { key: 'c', text: 'Mệnh đề c', isCorrect: true },
              { key: 'd', text: 'Mệnh đề d', isCorrect: false },
            ];
          }
          correctAnswer = 'a: Đúng; b: Sai; c: Đúng; d: Sai';
        } else if (newType === 'short_answer') {
          points = 0.5; // 0.5đ mặc định
          correctAnswer = q.shortAnswerText || '';
        }

        return {
          ...q,
          type: newType,
          points,
          options,
          tfStatements,
          correctAnswer,
        };
      })
    );
  };

  // Thêm câu hỏi mới với điểm mặc định
  const handleAddQuestion = (type: QuestionType = 'multiple_choice') => {
    const nextNum = questions.length + 1;
    let defaultPoints = 0.25;
    if (type === 'true_false') defaultPoints = 1.0;
    if (type === 'short_answer') defaultPoints = 0.5;

    const newQ: QuestionItem = {
      id: `q_${Date.now()}`,
      questionNumber: nextNum,
      content: `Nội dung câu hỏi số ${nextNum}...`,
      level: 3, // Mặc định mức 3 (4 - <6 điểm)
      type,
      options: [
        { key: 'A', text: 'Phương án A' },
        { key: 'B', text: 'Phương án B' },
        { key: 'C', text: 'Phương án C' },
        { key: 'D', text: 'Phương án D' },
      ],
      tfStatements: [
        { key: 'a', text: 'Ý khẳng định a...', isCorrect: true },
        { key: 'b', text: 'Ý khẳng định b...', isCorrect: false },
        { key: 'c', text: 'Ý khẳng định c...', isCorrect: true },
        { key: 'd', text: 'Ý khẳng định d...', isCorrect: false },
      ],
      shortAnswerText: '',
      correctAnswer: type === 'multiple_choice' ? 'A' : type === 'true_false' ? 'a: Đúng; b: Sai; c: Đúng; d: Sai' : '',
      solution: 'Lời giải chi tiết từng bước cho câu hỏi này...',
      points: defaultPoints,
    };
    setQuestions(prev => [...prev, newQ]);
    if (viewMode === 'ppt') {
      setActiveSlideIndex(questions.length);
    }
  };

  // Xóa câu hỏi
  const handleDeleteQuestion = (qId: string) => {
    if (questions.length <= 1) {
      alert('Bài luyện tập/đánh giá cần có ít nhất 1 câu hỏi.');
      return;
    }
    setQuestions(prev => {
      const filtered = prev.filter(q => q.id !== qId);
      return filtered.map((q, idx) => ({ ...q, questionNumber: idx + 1 }));
    });
    if (activeSlideIndex >= questions.length - 1) {
      setActiveSlideIndex(Math.max(0, questions.length - 2));
    }
  };

  // Nhân bản câu hỏi
  const handleDuplicateQuestion = (q: QuestionItem) => {
    const newQ: QuestionItem = {
      ...q,
      id: `q_${Date.now()}`,
      questionNumber: questions.length + 1,
      content: `${q.content} (Bản sao)`,
    };
    setQuestions(prev => [...prev, newQ]);
  };

  // Kích hoạt sửa công thức trực tiếp qua MathType Modal
  const handleTriggerFormulaEdit = (
    formula: string,
    rawMatch: string,
    questionId: string,
    field: 'content' | 'option' | 'solution' | 'tfStatement',
    optionKey?: string
  ) => {
    setMathModalState({
      isOpen: true,
      initialFormula: formula,
      rawMatch,
      questionId,
      field,
      optionKey,
    });
  };

  // Cập nhật lại công thức sau khi chỉnh sửa trong MathType Modal
  const handleApplyMathFormula = (newLatex: string) => {
    const { questionId, field, optionKey, initialFormula, rawMatch } = mathModalState;
    if (!questionId) return;

    setQuestions(prev =>
      prev.map(q => {
        if (q.id !== questionId) return q;

        const replaceLatex = (origText: string) => {
          if (!origText || !origText.trim()) return `$ ${newLatex.trim()} $`;

          let updated = origText;
          // 1. Thử thay thế chính xác chuỗi rawMatch ($...$) nếu có
          if (rawMatch && updated.includes(rawMatch)) {
            updated = updated.replace(rawMatch, `$ ${newLatex.trim()} $`);
          } else if (initialFormula) {
            // 2. Tìm các biến thể regex của initialFormula nằm trong cặp $ hoặc nguyên chuỗi
            const escapedFormula = initialFormula.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const mathRegex = new RegExp(`\\$\\s*${escapedFormula}\\s*\\$`, 'g');
            if (mathRegex.test(updated)) {
              updated = updated.replace(mathRegex, `$ ${newLatex.trim()} $`);
            } else if (updated.includes(initialFormula)) {
              updated = updated.replace(initialFormula, `$ ${newLatex.trim()} $`);
            } else {
              updated = `${updated} $ ${newLatex.trim()} $`;
            }
          } else {
            updated = `${updated} $ ${newLatex.trim()} $`;
          }

          // Dọn dẹp các cặp dấu $ bị lặp lại hoặc rỗng để đảm bảo công thức luôn chuẩn
          updated = updated
            .replace(/\$\s*\$\s*\$/g, '$')
            .replace(/\$\s*\$/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

          return updated;
        };

        if (field === 'content') {
          return { ...q, content: replaceLatex(q.content) };
        }
        if (field === 'solution') {
          return { ...q, solution: replaceLatex(q.solution) };
        }
        if (field === 'option' && optionKey) {
          return {
            ...q,
            options: q.options.map(opt =>
              opt.key === optionKey ? { ...opt, text: replaceLatex(opt.text) } : opt
            ),
          };
        }
        if (field === 'tfStatement' && optionKey) {
          return {
            ...q,
            tfStatements: (q.tfStatements || []).map(st =>
              st.key === optionKey ? { ...st, text: replaceLatex(st.text) } : st
            ),
          };
        }
        return q;
      })
    );

    setMathModalState(prev => ({ ...prev, isOpen: false }));
  };

  // Lưu JSON bài luyện tập / đánh giá lên Google Drive với Relative Path
  const handleSaveJsonToDrive = async () => {
    setIsSaving(true);
    try {
      const isPractice = /^LuyenTap/i.test(title);
      const assessmentData = {
        title,
        type: isPractice ? 'practice' : 'assessment',
        chuong,
        bai,
        vanDe,
        chuyenDe,
        totalQuestions: questions.length,
        totalPoints: questions.reduce((sum, q) => sum + (q.points || 0.25), 0),
        questions,
        scoreRules: {
          multiple_choice: 0.25,
          true_false: { 1: 0.1, 2: 0.25, 3: 0.5, 4: 1.0 },
          short_answer: 0.5,
        },
        ruleLogic: 'Học sinh có Mức độ >= Mức độ câu hỏi: BẮT BUỘC LÀM; Mức độ < Mức độ câu hỏi: KHUYẾN KHÍCH LÀM.',
        updatedAt: new Date().toISOString(),
      };

      const fileName = title
        ? title.endsWith('.json')
          ? title
          : `${title}.json`
        : isPractice
        ? 'LuyenTap Bai 1.json'
        : 'DanhGia 15 phut.json';
      const folders = ['myApp', 'LopU', 'TaiLieu', title || 'TaiLieu', chuong, bai, vanDe, chuyenDe].filter(Boolean);

      const result = await saveAssessmentJsonToChuyenDeDrive(
        folders,
        fileName,
        assessmentData
      );

      setSaveStatus(`Đã lưu thành công tệp JSON cấu trúc tương đối lên Drive: ${fileName}`);
      if (onSaveDriveSuccess) {
        onSaveDriveSuccess(result.drivePath);
      }
      setTimeout(() => setSaveStatus(null), 5000);
    } catch (err: any) {
      setSaveStatus(`Lỗi khi lưu Drive: ${err.message || err}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Tính toán nhóm học sinh bắt buộc / khuyến khích cho một câu hỏi
  const getStudentGroupForQuestion = (qLevel: number) => {
    const mandatoryList = students.filter(s => (s.level || 3) >= qLevel);
    const optionalList = students.filter(s => (s.level || 3) < qLevel);
    return { mandatoryList, optionalList };
  };

  const currentSlide = questions[activeSlideIndex] || questions[0];
  const currentSlideLevelDef =
    QUESTION_LEVELS.find(l => l.level === (currentSlide?.level || 3)) || QUESTION_LEVELS[2];
  const slideGroups = currentSlide
    ? getStudentGroupForQuestion(currentSlide.level)
    : { mandatoryList: [], optionalList: [] };

  return (
    <div className="space-y-4">
      {/* Toast Save Notification */}
      {saveStatus && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center justify-between shadow-xs animate-fade-in">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{saveStatus}</span>
          </div>
          <button onClick={() => setSaveStatus(null)} className="text-slate-400 hover:text-slate-600">
            ✕
          </button>
        </div>
      )}

      {/* VIEW MODE 1: PPT SLIDESHOW (XEM PPT - HIỆN LẦN LƯỢT ĐỀ VÀ LỜI GIẢI TỪNG CÂU) */}
      {viewMode === 'ppt' && currentSlide && (
        <div
          className={`space-y-4 ${
            isFullScreenPpt
              ? 'fixed inset-0 z-50 bg-slate-950 p-6 flex flex-col justify-between overflow-y-auto'
              : 'bg-slate-900 text-white p-6 sm:p-8 rounded-2xl shadow-xl border border-slate-800'
          }`}
        >
          {/* PPT Top Navigation bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-lg bg-indigo-600 text-white font-black text-sm tracking-wider flex items-center gap-1.5 shadow-xs">
                <Tv className="w-4 h-4" />
                <span>SLIDE TRÌNH CHIẾU PPT</span>
              </span>
              <span className="text-xs text-slate-400 font-semibold">
                Câu {currentSlide.questionNumber} / {questions.length} ({currentSlide.points}đ)
              </span>
            </div>

            {/* Selector nhanh số câu */}
            <div className="flex items-center gap-1 overflow-x-auto max-w-md py-1">
              {questions.map((q, idx) => (
                <button
                  key={q.id}
                  onClick={() => {
                    setActiveSlideIndex(idx);
                    setShowSlideSolution(false);
                  }}
                  className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeSlideIndex === idx
                      ? 'bg-indigo-500 text-white ring-2 ring-indigo-300 scale-110'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {q.questionNumber}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsFullScreenPpt(!isFullScreenPpt)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                title={isFullScreenPpt ? 'Thu nhỏ' : 'Toàn màn hình PPT'}
              >
                {isFullScreenPpt ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* PPT Main Slide Area */}
          <div className="bg-slate-950/80 rounded-2xl p-6 sm:p-10 border border-slate-800 space-y-6 min-h-[380px] flex flex-col justify-between">
            {/* Header câu hỏi & Badge mức độ */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="px-3 py-1 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-xs font-black uppercase tracking-wider">
                    CÂU {currentSlide.questionNumber}
                  </span>
                  <span className={`px-3 py-1 rounded-xl text-xs font-black border ${currentSlideLevelDef.badgeColor}`}>
                    {currentSlideLevelDef.label} ({currentSlideLevelDef.scoreRange})
                  </span>
                  <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-bold border border-slate-700">
                    {currentSlide.type === 'multiple_choice' ? 'Trắc nghiệm (0.25đ)' : currentSlide.type === 'true_false' ? 'Đúng/Sai 4 ý (1.0đ)' : 'Trả lời ngắn (0.5đ)'}
                  </span>
                </div>

                {/* Yêu cầu đối tượng học sinh */}
                <div className="text-[11px] font-bold text-slate-300 flex items-center gap-2 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-700">
                  <span className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Bắt buộc: Mức ≥ {currentSlide.level} ({slideGroups.mandatoryList.length} HS)
                  </span>
                  <span className="text-slate-600">|</span>
                  <span className="text-amber-400 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" /> Khuyến khích: Mức &lt; {currentSlide.level} ({slideGroups.optionalList.length} HS)
                  </span>
                </div>
              </div>

              {/* Nội dung đề bài lớn với công thức đã được dịch và kích để sửa */}
              <div className="text-lg sm:text-2xl font-semibold text-slate-100 leading-relaxed pt-2 font-serif">
                <MathFormulaRenderer
                  text={currentSlide.content}
                  isTeacher={isTeacher}
                  onEditFormula={(formula, raw) => handleTriggerFormulaEdit(formula, raw, currentSlide.id, 'content')}
                />
              </div>
            </div>

            {/* Các phương án theo từng loại câu */}
            {currentSlide.type === 'multiple_choice' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 my-4">
                {currentSlide.options.map(opt => {
                  const isCorrect = showSlideSolution && opt.key === currentSlide.correctAnswer;
                  return (
                    <div
                      key={opt.key}
                      className={`p-4 rounded-xl border transition-all flex items-start gap-3 ${
                        isCorrect
                          ? 'bg-emerald-950/60 border-emerald-500 text-emerald-200 ring-2 ring-emerald-500/50 scale-[1.01]'
                          : 'bg-slate-900/90 border-slate-700/80 text-slate-200'
                      }`}
                    >
                      <span
                        className={`w-7 h-7 rounded-lg font-black text-sm flex items-center justify-center shrink-0 ${
                          isCorrect ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {opt.key}
                      </span>
                      <span className="text-base sm:text-lg font-medium leading-normal">
                        <MathFormulaRenderer
                          text={opt.text}
                          isTeacher={isTeacher}
                          onEditFormula={(formula, raw) => handleTriggerFormulaEdit(formula, raw, currentSlide.id, 'option', opt.key)}
                        />
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {currentSlide.type === 'true_false' && (
              <div className="space-y-2.5 my-4">
                {(currentSlide.tfStatements || []).map(st => (
                  <div
                    key={st.key}
                    className="p-3.5 rounded-xl border border-slate-700 bg-slate-900/90 flex items-center justify-between gap-3 text-sm"
                  >
                    <div className="flex items-start gap-2.5 flex-1">
                      <span className="font-bold text-indigo-400 uppercase w-5 shrink-0">{st.key})</span>
                      <div className="text-slate-100">
                        <MathFormulaRenderer
                          text={st.text}
                          isTeacher={isTeacher}
                          onEditFormula={(formula, raw) => handleTriggerFormulaEdit(formula, raw, currentSlide.id, 'tfStatement', st.key)}
                        />
                      </div>
                    </div>
                    {showSlideSolution && (
                      <span
                        className={`px-3 py-1 rounded-lg text-xs font-black uppercase shrink-0 ${
                          st.isCorrect ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                        }`}
                      >
                        {st.isCorrect ? 'ĐÚNG' : 'SAI'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {currentSlide.type === 'short_answer' && (
              <div className="p-4 bg-slate-900 rounded-xl border border-slate-700 my-4 space-y-2">
                <span className="text-xs font-bold text-slate-400">Ô điền câu trả lời ngắn của học sinh:</span>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-600 text-base font-mono text-indigo-300">
                  {showSlideSolution ? `Đáp án chính xác: [${currentSlide.correctAnswer}]` : '___ (Học sinh nhập kết quả vào đây) ___'}
                </div>
              </div>
            )}

            {/* Lời giải chi tiết từng bước (NẰM LIỀN SAU CÂU HỎI TRÊN SLIDE) */}
            {showSlideSolution && (
              <div className="bg-emerald-950/50 border border-emerald-500/50 p-5 rounded-2xl space-y-2 animate-fade-in">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    Đáp án: [{currentSlide.correctAnswer}] — Lời giải chi tiết:
                  </span>
                </div>
                <div className="text-sm sm:text-base text-emerald-100/95 leading-relaxed whitespace-pre-line font-sans pl-1">
                  <MathFormulaRenderer
                    text={currentSlide.solution}
                    isTeacher={isTeacher}
                    onEditFormula={(formula, raw) => handleTriggerFormulaEdit(formula, raw, currentSlide.id, 'solution')}
                  />
                </div>
              </div>
            )}
          </div>

          {/* PPT Bottom Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={activeSlideIndex === 0}
                onClick={() => {
                  setActiveSlideIndex(prev => Math.max(0, prev - 1));
                  setShowSlideSolution(false);
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Câu trước</span>
              </button>

              <button
                type="button"
                disabled={activeSlideIndex === questions.length - 1}
                onClick={() => {
                  setActiveSlideIndex(prev => Math.min(questions.length - 1, prev + 1));
                  setShowSlideSolution(false);
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
              >
                <span>Câu tiếp theo</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Nút Trọng tâm PPT: Hiện / Ẩn lời giải lần lượt */}
            <button
              type="button"
              onClick={() => setShowSlideSolution(!showSlideSolution)}
              className={`px-6 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer ${
                showSlideSolution
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white ring-2 ring-emerald-400/40 animate-pulse'
              }`}
            >
              {showSlideSolution ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              <span>{showSlideSolution ? 'Ẩn lời giải' : 'Lời giải'}</span>
            </button>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: TÁCH CÂU (SPLIT VIEW) — SOẠN THẢO TỪNG CÂU & GÁN NHÓM 1-6 & ĐIỂM CHUẨN */}
      {viewMode === 'split' && (
        <div className="space-y-4">
          {/* Thanh tác vụ thêm câu hỏi ở đầu */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-indigo-50/80 border border-indigo-200 p-3 rounded-2xl">
            <span className="text-xs font-black uppercase tracking-wider text-indigo-950 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>Danh sách câu hỏi bài tập &amp; đánh giá</span>
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleAddQuestion('multiple_choice')}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Trắc nghiệm</span>
              </button>
              <button
                type="button"
                onClick={() => handleAddQuestion('true_false')}
                className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Đúng/Sai</span>
              </button>
              <button
                type="button"
                onClick={() => handleAddQuestion('short_answer')}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Trả lời ngắn</span>
              </button>
            </div>
          </div>

          {/* Dấu + Thêm câu hỏi ở vị trí đầu tiên */}
          <InsertQuestionBar
            onInsert={type => handleInsertQuestionAt(0, type)}
            label="+ Thêm câu hỏi ở vị trí đầu tiên"
          />

          {/* Danh sách từng câu hỏi */}
          <div className="space-y-3">
            {questions.map((q, index) => {
              const levelDef = QUESTION_LEVELS.find(l => l.level === q.level) || QUESTION_LEVELS[2];
              const { mandatoryList, optionalList } = getStudentGroupForQuestion(q.level);
              const isListOpen = openStudentListForQ === q.id;
              const isEditing = !!editingQuestionIds[q.id];
              const isActive = (activeQuestionId || questions[0]?.id) === q.id;

              return (
                <React.Fragment key={q.id}>
                  <div
                    onClick={() => setActiveQuestionId(q.id)}
                    className={`bg-white rounded-2xl border transition-all overflow-hidden cursor-pointer ${
                      isActive
                        ? 'border-indigo-500 ring-2 ring-indigo-300 shadow-md'
                        : 'border-slate-200 shadow-xs hover:border-indigo-300'
                    }`}
                  >
                    {/* Card Header với Số câu, Loại câu, Cấp độ 1-6, Nút Sửa & Actions */}
                    <div className="bg-slate-50/90 p-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-2xs">
                          {q.questionNumber}
                        </span>
                        <span className="font-bold text-slate-800 text-xs">Câu {q.questionNumber}</span>
                        {isActive && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                            Đang chọn
                          </span>
                        )}

                        {/* Nút Bật/Tắt chế độ sửa công thức */}
                        <button
                          type="button"
                          onClick={() => toggleEditQuestion(q.id)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                            isEditing
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs'
                              : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
                          }`}
                          title={isEditing ? 'Hoàn tất chỉnh sửa' : 'Chuyển sang dạng mã chưa dịch để chỉnh sửa'}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>{isEditing ? 'Xong (Xem dịch)' : 'Sửa câu hỏi'}</span>
                        </button>

                        {/* Loại câu hỏi */}
                        <select
                          value={q.type}
                          onChange={e => handleChangeQuestionType(q.id, e.target.value as QuestionType)}
                          className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="multiple_choice">Trắc nghiệm lựa chọn (0.25đ)</option>
                          <option value="true_false">Trắc nghiệm đúng sai 4 ý (1.0đ)</option>
                          <option value="short_answer">Câu trả lời ngắn (0.5đ)</option>
                        </select>

                        {/* Chọn Mức độ 1 đến 6 */}
                        <div className="flex items-center gap-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Mức:</label>
                          <select
                            value={q.level}
                            onChange={e => handleUpdateQuestion(q.id, { level: parseInt(e.target.value) || 1 })}
                            className={`px-2 py-1 rounded-lg text-xs font-extrabold border ${levelDef.badgeColor}`}
                          >
                            {QUESTION_LEVELS.map(lvl => (
                              <option key={lvl.level} value={lvl.level}>
                                {lvl.label} ({lvl.scoreRange})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Điểm câu hỏi */}
                        <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-lg border border-slate-200 text-xs">
                          <span className="text-[10px] font-bold text-slate-400">Điểm:</span>
                          <input
                            type="number"
                            step="0.05"
                            min="0.05"
                            max="10"
                            value={q.points}
                            onChange={e => handleUpdateQuestion(q.id, { points: parseFloat(e.target.value) || 0.25 })}
                            className="w-12 font-black text-indigo-700 text-xs focus:outline-none"
                          />
                          <span className="text-[10px] font-bold text-slate-500">đ</span>
                        </div>
                      </div>

                      {/* Phân nhóm học sinh & Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setOpenStudentListForQ(isListOpen ? null : q.id)}
                          className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="Xem danh sách học sinh Bắt buộc & Khuyến khích"
                        >
                          <Users className="w-3.5 h-3.5 text-indigo-600" />
                          <span className="text-emerald-700 font-bold">{mandatoryList.length} Bắt buộc</span>
                          <span className="text-slate-400">/</span>
                          <span className="text-amber-700 font-bold">{optionalList.length} Khuyến khích</span>
                          <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isListOpen ? 'rotate-180' : ''}`} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDuplicateQuestion(q)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          title="Nhân bản câu này"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteQuestion(q.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Xóa câu này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Panel phân nhóm học sinh */}
                    {isListOpen && (
                      <div className="p-3.5 bg-slate-50/80 border-b border-slate-200 text-xs space-y-2 animate-fade-in">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200 space-y-1.5">
                            <div className="font-bold text-emerald-900 flex items-center gap-1.5 text-[11px]">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>BẮT BUỘC LÀM (Mức ≥ {q.level}): {mandatoryList.length} em</span>
                            </div>
                            <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                              {mandatoryList.map(s => (
                                <span key={s.id} className="px-1.5 py-0.5 bg-white border border-emerald-200 text-emerald-800 text-[10px] rounded font-medium">
                                  {s.name} (Mức {s.level || 3})
                                </span>
                              ))}
                              {mandatoryList.length === 0 && (
                                <span className="text-[10px] text-slate-400 italic">Không có học sinh nào</span>
                              )}
                            </div>
                          </div>

                          <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 space-y-1.5">
                            <div className="font-bold text-amber-900 flex items-center gap-1.5 text-[11px]">
                              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                              <span>KHUYẾN KHÍCH LÀM (Mức &lt; {q.level}): {optionalList.length} em</span>
                            </div>
                            <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                              {optionalList.map(s => (
                                <span key={s.id} className="px-1.5 py-0.5 bg-white border border-amber-200 text-amber-800 text-[10px] rounded font-medium">
                                  {s.name} (Mức {s.level || 3})
                                </span>
                              ))}
                              {optionalList.length === 0 && (
                                <span className="text-[10px] text-slate-400 italic">Tất cả đã đủ điều kiện</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Body hiển thị hoặc chỉnh sửa */}
                    {!isEditing ? (
                      /* DẠNG 1: HIỂN THỊ ĐÃ DỊCH CÔNG THỨC BẰNG MATHJAX (1 LẦN DUY NHẤT) */
                      <div className="p-4 sm:p-5 space-y-3 bg-white">
                        {/* Đề bài */}
                        <div className="text-xs sm:text-sm font-semibold text-slate-900 leading-relaxed flex items-start gap-1.5">
                          <span className="font-bold text-indigo-900 shrink-0">Câu {q.questionNumber}.</span>
                          <div className="flex-1">
                            <MathFormulaRenderer
                              text={q.content}
                              isTeacher={isTeacher}
                              onEditFormula={(formula, raw) => handleTriggerFormulaEdit(formula, raw, q.id, 'content')}
                            />
                          </div>
                        </div>

                        {/* Phương án trắc nghiệm lựa chọn - Cho phép đổi nhanh đáp án */}
                        {q.type === 'multiple_choice' && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                            {q.options.map(opt => {
                              const isCorrect = q.correctAnswer === opt.key;
                              return (
                                <div
                                  key={opt.key}
                                  className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs font-medium transition-all ${
                                    isCorrect
                                      ? 'bg-indigo-50/90 border-indigo-300 text-indigo-950 font-bold shadow-2xs'
                                      : 'bg-slate-50/80 border-slate-200 text-slate-800 hover:border-indigo-200'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateQuestion(q.id, { correctAnswer: opt.key })}
                                      title={`Bấm để chọn phương án ${opt.key} làm đáp án đúng`}
                                      className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 cursor-pointer transition-colors ${
                                        isCorrect ? 'bg-indigo-600 text-white shadow-2xs' : 'bg-slate-200 text-slate-700 hover:bg-indigo-600 hover:text-white'
                                      }`}
                                    >
                                      {opt.key}
                                    </button>
                                    <div className="flex-1 min-w-0">
                                      <MathFormulaRenderer
                                        text={opt.text}
                                        isTeacher={isTeacher}
                                        onEditFormula={(formula, raw) => handleTriggerFormulaEdit(formula, raw, q.id, 'option', opt.key)}
                                      />
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateQuestion(q.id, { correctAnswer: opt.key })}
                                    title="Click để chọn phương án này làm đáp án đúng"
                                    className={`text-[10px] font-black px-2 py-0.5 rounded uppercase shrink-0 transition-colors cursor-pointer ${
                                      isCorrect ? 'text-indigo-700 bg-indigo-100' : 'text-slate-400 bg-slate-100 hover:bg-indigo-100 hover:text-indigo-700'
                                    }`}
                                  >
                                    {isCorrect ? 'Đáp án đúng' : 'Chọn đáp án'}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Phương án đúng/sai 4 ý - Cho phép chuyển nhanh ĐÚNG/SAI */}
                        {q.type === 'true_false' && (
                          <div className="space-y-2 pt-1">
                            {(q.tfStatements || []).map(st => (
                              <div
                                key={st.key}
                                className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 text-xs"
                              >
                                <div className="flex items-start gap-2 flex-1 min-w-0">
                                  <span className="font-bold text-indigo-700 uppercase shrink-0">{st.key})</span>
                                  <div className="text-slate-800 font-medium flex-1">
                                    <MathFormulaRenderer
                                      text={st.text}
                                      isTeacher={isTeacher}
                                      onEditFormula={(formula, raw) => handleTriggerFormulaEdit(formula, raw, q.id, 'tfStatement', st.key)}
                                    />
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newSts = (q.tfStatements || []).map(s => (s.key === st.key ? { ...s, isCorrect: true } : s));
                                      const ansStr = newSts.map(s => `${s.key}: ${s.isCorrect ? 'Đúng' : 'Sai'}`).join('; ');
                                      handleUpdateQuestion(q.id, { tfStatements: newSts, correctAnswer: ansStr });
                                    }}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase transition-all cursor-pointer ${
                                      st.isCorrect ? 'bg-emerald-600 text-white shadow-2xs' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                                    }`}
                                    title="Click để đặt là ĐÚNG"
                                  >
                                    ĐÚNG
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newSts = (q.tfStatements || []).map(s => (s.key === st.key ? { ...s, isCorrect: false } : s));
                                      const ansStr = newSts.map(s => `${s.key}: ${s.isCorrect ? 'Đúng' : 'Sai'}`).join('; ');
                                      handleUpdateQuestion(q.id, { tfStatements: newSts, correctAnswer: ansStr });
                                    }}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase transition-all cursor-pointer ${
                                      !st.isCorrect ? 'bg-rose-600 text-white shadow-2xs' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                                    }`}
                                    title="Click để đặt là SAI"
                                  >
                                    SAI
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Ô câu trả lời ngắn - Cho phép đổi nhanh đáp án */}
                        {q.type === 'short_answer' && (
                          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <span className="text-slate-600 font-bold shrink-0">Đáp án chính xác:</span>
                              <input
                                type="text"
                                value={q.correctAnswer}
                                onChange={e => handleUpdateQuestion(q.id, { correctAnswer: e.target.value, shortAnswerText: e.target.value })}
                                className="bg-white border border-slate-300 px-2.5 py-1 rounded-lg text-xs font-mono font-extrabold text-indigo-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 flex-1 min-w-0"
                                placeholder="Nhập đáp án nhanh..."
                              />
                            </div>
                            <span className="text-[10px] text-slate-400 italic shrink-0">(Sửa nhanh)</span>
                          </div>
                        )}

                        {/* Lời giải chi tiết */}
                        <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs sm:text-sm text-emerald-950 font-normal leading-relaxed space-y-1 mt-2">
                          <div className="font-bold text-emerald-800 text-xs flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Lời giải:</span>
                          </div>
                          <div className="pl-1">
                            <MathFormulaRenderer
                              text={q.solution}
                              isTeacher={isTeacher}
                              onEditFormula={(formula, raw) => handleTriggerFormulaEdit(formula, raw, q.id, 'solution')}
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* DẠNG 2: CHẾ ĐỘ SỬA MÃ TEXT CHƯA DỊCH CÔNG THỨC (TEXTAREA & INPUTS) */
                      <div className="p-4 sm:p-5 space-y-4 bg-slate-50/50">
                        {/* Đề bài */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-700 block">
                            Câu {q.questionNumber}. Nội dung đề bài:
                          </label>
                          <textarea
                            rows={2}
                            value={q.content}
                            onChange={e => handleUpdateQuestion(q.id, { content: e.target.value })}
                            className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-mono text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                            placeholder="Nhập nội dung đề bài (đặt công thức trong cặp $...$)..."
                          />
                        </div>

                        {/* Form trắc nghiệm lựa chọn */}
                        {q.type === 'multiple_choice' && (
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-700 block">
                              Đáp án &amp; 4 phương án:
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              {q.options.map(opt => {
                                const isSelected = q.correctAnswer === opt.key;
                                return (
                                  <div
                                    key={opt.key}
                                    className={`flex items-center gap-2 p-2.5 rounded-xl border bg-white ${
                                      isSelected
                                        ? 'border-indigo-400 ring-1 ring-indigo-400 bg-indigo-50/30'
                                        : 'border-slate-200'
                                    }`}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateQuestion(q.id, { correctAnswer: opt.key })}
                                      className={`w-6 h-6 rounded-full font-bold text-xs flex items-center justify-center shrink-0 cursor-pointer ${
                                        isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                                      }`}
                                      title={`Đặt ${opt.key} làm đáp án đúng`}
                                    >
                                      {opt.key}
                                    </button>
                                    <input
                                      type="text"
                                      value={opt.text}
                                      onChange={e => {
                                        const newOpts = q.options.map(o => (o.key === opt.key ? { ...o, text: e.target.value } : o));
                                        handleUpdateQuestion(q.id, { options: newOpts });
                                      }}
                                      className="flex-1 bg-white border border-slate-200 px-2 py-1 rounded text-xs font-mono text-slate-800 focus:outline-none"
                                      placeholder={`Nhập phương án ${opt.key}...`}
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Form đúng / sai */}
                        {q.type === 'true_false' && (
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-700 block">
                              4 ý khẳng định (a, b, c, d):
                            </label>
                            <div className="space-y-2">
                              {(q.tfStatements || []).map(st => (
                                <div
                                  key={st.key}
                                  className="p-2.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-2"
                                >
                                  <div className="flex items-center gap-2 flex-1">
                                    <span className="font-bold text-indigo-700 uppercase w-5 shrink-0">{st.key})</span>
                                    <input
                                      type="text"
                                      value={st.text}
                                      onChange={e => {
                                        const newSts = (q.tfStatements || []).map(s => (s.key === st.key ? { ...s, text: e.target.value } : s));
                                        handleUpdateQuestion(q.id, { tfStatements: newSts });
                                      }}
                                      className="flex-1 bg-white border border-slate-200 px-2.5 py-1 rounded text-xs font-mono text-slate-800 focus:outline-none"
                                      placeholder={`Nhập ý khẳng định ${st.key}...`}
                                    />
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newSts = (q.tfStatements || []).map(s => (s.key === st.key ? { ...s, isCorrect: true } : s));
                                        const ansStr = newSts.map(s => `${s.key}: ${s.isCorrect ? 'Đúng' : 'Sai'}`).join('; ');
                                        handleUpdateQuestion(q.id, { tfStatements: newSts, correctAnswer: ansStr });
                                      }}
                                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                                        st.isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                                      }`}
                                    >
                                      ĐÚNG
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newSts = (q.tfStatements || []).map(s => (s.key === st.key ? { ...s, isCorrect: false } : s));
                                        const ansStr = newSts.map(s => `${s.key}: ${s.isCorrect ? 'Đúng' : 'Sai'}`).join('; ');
                                        handleUpdateQuestion(q.id, { tfStatements: newSts, correctAnswer: ansStr });
                                      }}
                                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                                        !st.isCorrect ? 'bg-rose-600 text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                                      }`}
                                    >
                                      SAI
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Form trả lời ngắn */}
                        {q.type === 'short_answer' && (
                          <div className="space-y-1.5 p-3 rounded-xl border border-slate-200 bg-white">
                            <label className="text-xs font-bold text-slate-700 block">
                              Đáp án câu trả lời ngắn:
                            </label>
                            <input
                              type="text"
                              value={q.correctAnswer}
                              onChange={e => handleUpdateQuestion(q.id, { correctAnswer: e.target.value, shortAnswerText: e.target.value })}
                              className="w-full bg-white border border-slate-300 p-2 rounded-lg text-xs font-mono font-bold text-indigo-900 focus:outline-none"
                              placeholder="Ví dụ: 4 hoặc x = 2..."
                            />
                          </div>
                        )}

                        {/* Lời giải chi tiết */}
                        <div className="space-y-1.5 pt-2 border-t border-slate-200">
                          <label className="text-xs font-bold text-emerald-800 block">
                            Lời giải:
                          </label>
                          <textarea
                            rows={3}
                            value={q.solution}
                            onChange={e => handleUpdateQuestion(q.id, { solution: e.target.value })}
                            className="w-full p-2.5 rounded-xl border border-emerald-300 bg-white font-mono text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            placeholder="Nhập nội dung lời giải chi tiết..."
                          />
                        </div>

                        <div className="flex justify-end pt-1">
                          <button
                            type="button"
                            onClick={() => toggleEditQuestion(q.id)}
                            className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Hoàn tất &amp; Xem bản dịch MathJax</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Thanh chèn câu hỏi tại vị trí liền sau câu này */}
                  <InsertQuestionBar
                    onInsert={type => handleInsertQuestionAt(index + 1, type)}
                    label="+ Thêm câu hỏi ở đây"
                  />
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW MODE 3: TOÀN BỘ (FULL VIEW) — XEM TOÀN BỘ ĐỀ THEO CÚ PHÁP WORD CHUẨN */}
      {viewMode === 'full' && (
        <div className="bg-white rounded-2xl border border-slate-300 p-6 sm:p-10 shadow-sm space-y-6">
          {/* Header đề thi chuẩn */}
          <div className="border-b-2 border-slate-800 pb-4 text-center space-y-1">
            <h3 className="text-base sm:text-lg font-black text-slate-900 uppercase">
              {title || 'BÀI KIỂM TRA ĐÁNH GIÁ / LUYỆN TẬP TOÀN BỘ'}
            </h3>
            <p className="text-xs text-slate-600 font-medium">
              Chuyên đề: <strong>{chuyenDe}</strong> ({chuong} - {bai}) | Lớp áp dụng: <strong>{selectedClassId}</strong>
            </p>
            <div className="flex justify-center items-center gap-4 text-[11px] text-slate-500 pt-1 font-semibold">
              <span>Tổng số câu: <strong>{questions.length}</strong></span>
              <span>•</span>
              <span>Tổng điểm: <strong>{questions.reduce((s, q) => s + (q.points || 0.25), 0).toFixed(2)}đ</strong></span>
              <span>•</span>
              <span>Thời gian làm bài: <strong>{Math.max(15, questions.length * 3)} phút</strong></span>
            </div>
          </div>

          {/* Danh sách đề thi toàn bộ theo đúng cú pháp:
              Câu n. nội dung
              Đáp án:
              Lời giải
              nội dung lời giải (liền sau mỗi câu hỏi)
          */}
          <div className="space-y-6">
            {questions.map(q => {
              const currentLevelDef = QUESTION_LEVELS.find(l => l.level === q.level) || QUESTION_LEVELS[2];
              const isEditing = !!editingQuestionIds[q.id];
              const isActive = (activeQuestionId || questions[0]?.id) === q.id;

              return (
                <div
                  key={q.id}
                  onClick={() => setActiveQuestionId(q.id)}
                  className={`space-y-3 border-b border-slate-200 pb-5 p-3 rounded-xl transition-colors cursor-pointer ${
                    isActive ? 'bg-indigo-50/40 ring-1 ring-indigo-200' : 'hover:bg-slate-50/60'
                  }`}
                >
                  {/* 1. Câu n. Nội dung đề bài + Nút Sửa đề */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-xs sm:text-sm font-bold text-slate-900 leading-relaxed font-serif flex-1">
                      <span className="text-indigo-900 font-black mr-2 font-sans">
                        Câu {q.questionNumber}. ({q.points}đ - {currentLevelDef.label}):
                      </span>
                      {isActive && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 border border-indigo-200 mr-2 font-sans">
                          Đang chọn
                        </span>
                      )}
                      {!isEditing && (
                        <MathFormulaRenderer
                          text={q.content}
                          isTeacher={isTeacher}
                          onEditFormula={(formula, raw) => handleTriggerFormulaEdit(formula, raw, q.id, 'content')}
                        />
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => toggleEditQuestion(q.id)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                          isEditing
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
                        }`}
                        title={isEditing ? 'Hoàn tất & xem công thức' : 'Sửa đề - đưa về dạng text chưa biên dịch công thức toán'}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>{isEditing ? 'Hoàn tất' : 'Sửa đề'}</span>
                      </button>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border shrink-0 ${currentLevelDef.badgeColor}`}>
                        Mức {q.level} ({currentLevelDef.scoreRange})
                      </span>
                    </div>
                  </div>

                  {/* Khi kích nút Sửa đề: Hiển thị các ô dạng text chưa biên dịch công thức toán */}
                  {isEditing ? (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-300 space-y-3 font-sans my-2">
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">
                          Nội dung đề bài (dạng text chưa dịch công thức toán):
                        </label>
                        <textarea
                          rows={2}
                          value={q.content}
                          onChange={e => handleUpdateQuestion(q.id, { content: e.target.value })}
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-800 focus:ring-1 focus:ring-indigo-500"
                          placeholder="Nhập nội dung đề..."
                        />
                      </div>

                      {q.type === 'multiple_choice' && (
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-700 block">Các phương án lựa chọn (dạng text):</label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {q.options.map(opt => (
                              <div key={opt.key} className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200">
                                <span className="font-bold text-xs shrink-0">{opt.key}.</span>
                                <input
                                  type="text"
                                  value={opt.text}
                                  onChange={e => {
                                    const newOpts = q.options.map(o => o.key === opt.key ? { ...o, text: e.target.value } : o);
                                    handleUpdateQuestion(q.id, { options: newOpts });
                                  }}
                                  className="flex-1 p-1 bg-white border border-slate-200 rounded text-xs font-mono"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {q.type === 'true_false' && (
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-700 block">4 ý khẳng định (dạng text):</label>
                          <div className="space-y-1.5">
                            {(q.tfStatements || []).map(st => (
                              <div key={st.key} className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200">
                                <span className="font-bold text-xs uppercase shrink-0">{st.key})</span>
                                <input
                                  type="text"
                                  value={st.text}
                                  onChange={e => {
                                    const newSts = (q.tfStatements || []).map(s => s.key === st.key ? { ...s, text: e.target.value } : s);
                                    handleUpdateQuestion(q.id, { tfStatements: newSts });
                                  }}
                                  className="flex-1 p-1 bg-white border border-slate-200 rounded text-xs font-mono"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="text-xs font-bold text-indigo-900 block mb-1">Đáp án:</label>
                        <input
                          type="text"
                          value={q.correctAnswer}
                          onChange={e => handleUpdateQuestion(q.id, { correctAnswer: e.target.value })}
                          className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-mono text-indigo-900 font-bold"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-emerald-800 block mb-1">
                          Lời giải (dạng text chưa dịch công thức toán):
                        </label>
                        <textarea
                          rows={2}
                          value={q.solution}
                          onChange={e => handleUpdateQuestion(q.id, { solution: e.target.value })}
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-800 focus:ring-1 focus:ring-emerald-500"
                          placeholder="Nhập lời giải..."
                        />
                      </div>

                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => toggleEditQuestion(q.id)}
                          className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Hoàn tất &amp; Xem công thức</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* 2. Phương án trả lời */}
                      {q.type === 'multiple_choice' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-4 text-xs font-medium text-slate-800">
                          {q.options.map(opt => (
                            <div key={opt.key} className="flex items-start gap-1.5 font-serif">
                              <span className="font-bold text-slate-700 font-sans">{opt.key}.</span>
                              <MathFormulaRenderer
                                text={opt.text}
                                isTeacher={isTeacher}
                                onEditFormula={(formula, raw) => handleTriggerFormulaEdit(formula, raw, q.id, 'option', opt.key)}
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {q.type === 'true_false' && (
                        <div className="space-y-1.5 pl-4 text-xs">
                          {(q.tfStatements || []).map(st => (
                            <div key={st.key} className="flex items-start gap-2">
                              <span className="font-bold text-indigo-700 uppercase font-sans">{st.key})</span>
                              <span className="text-slate-800 font-serif">
                                <MathFormulaRenderer
                                  text={st.text}
                                  isTeacher={isTeacher}
                                  onEditFormula={(formula, raw) => handleTriggerFormulaEdit(formula, raw, q.id, 'tfStatement', st.key)}
                                />
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* 3. Cú pháp Đáp án & Lời giải nằm LIỀN SAU CÂU HỎI */}
                      <div className="bg-slate-50/90 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1.5 mt-2">
                        <div className="font-bold text-indigo-900">
                          Đáp án: <span className="font-mono text-indigo-700 font-extrabold">{q.correctAnswer}</span>
                        </div>
                        <div className="font-bold text-emerald-800 pt-1 border-t border-slate-200/60">
                          Lời giải
                        </div>
                        <div className="text-slate-700 whitespace-pre-line leading-relaxed pl-1 font-serif text-[11px] sm:text-xs">
                          <MathFormulaRenderer
                            text={q.solution}
                            isTeacher={isTeacher}
                            onEditFormula={(formula, raw) => handleTriggerFormulaEdit(formula, raw, q.id, 'solution')}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Cửa sổ Modal MathType khi kích vào sửa công thức */}
      <MathTypeEditorModal
        isOpen={mathModalState.isOpen}
        initialValue={mathModalState.initialFormula}
        onClose={() => setMathModalState(prev => ({ ...prev, isOpen: false }))}
        onInsert={(newLatex) => handleApplyMathFormula(newLatex)}
      />
    </div>
  );
};
