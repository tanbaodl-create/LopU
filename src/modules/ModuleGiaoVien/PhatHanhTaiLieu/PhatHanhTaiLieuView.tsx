import React, { useState, useEffect, useMemo } from 'react';
import {
  Send,
  BookOpen,
  Users,
  Coins,
  CheckCircle2,
  AlertCircle,
  Search,
  Save,
  Globe,
  Lock,
  Eye,
  Download,
  Check,
  RefreshCw,
  Sparkles,
  Layers,
  FileText,
  ToggleLeft,
  ToggleRight,
  Filter,
  Share2,
  Clock,
  Calendar,
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  PlusCircle,
  MinusCircle,
  RotateCcw,
  CheckSquare,
  XSquare,
  FileCheck,
  Award,
  HelpCircle,
  GitBranch,
  Settings,
  X,
  Sliders,
  XCircle,
  Info,
} from 'lucide-react';
import {
  TeacherDocument,
  ClassItem,
  UserProfile,
  ClassPublishSchedule,
  GranularNodePublishStatus,
  NodePublishConfig,
} from '../../../services/storageTypes';
import { getClasses, getTeacherDocuments, saveTeacherDocument } from '../../ConnectData/ConnectFirestore';
import { auth } from '../../../config/firebase';

// Cấu trúc Nút trong Cây Cấu Trúc Phân Cấp Tài Liệu
interface DocTreeNode {
  id: string;
  type: 'doc' | 'chuong' | 'bai' | 'vanDe' | 'chuyenDe' | 'baiDanhGia' | 'luyenTap' | 'ktdg';
  label: string;
  subTypeLabel: string;
  children?: DocTreeNode[];
}

export const PhatHanhTaiLieuView: React.FC = () => {
  const [documents, setDocuments] = useState<TeacherDocument[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [filterGrade, setFilterGrade] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'all' | 'published' | 'unpublished' | 'open_library'>('all');
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Lớp đang chọn để tùy chỉnh cây phát hành riêng cho từng tài liệu (docId -> classId | 'global')
  const [selectedTreeClasses, setSelectedTreeClasses] = useState<Record<string, string>>({});

  // Các nút đang thu gọn trong cây phân cấp
  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>({});

  // Trạng thái Modal Cài Đặt Vị Trí Cụ Thể (khi bấm ⚙️ Cài đặt)
  const [editingNodeModal, setEditingNodeModal] = useState<{
    docId: string;
    docTitle: string;
    node: DocTreeNode;
  } | null>(null);

  // Trạng thái cấu hình phát hành cho từng tài liệu (theo document ID)
  const [publishConfigs, setPublishConfigs] = useState<
    Record<
      string,
      {
        isPublished: boolean;
        isForSale: boolean;
        priceDiamonds: number;
        publishedToClasses: string[];
        classSchedules: Record<string, ClassPublishSchedule>;
        globalNodeOverrides: Record<string, GranularNodePublishStatus>;
        nodeConfigs: Record<string, NodePublishConfig>;
        allowPreview: boolean;
        allowDownload: boolean;
        allowPractice: boolean;
      }
    >
  >({});

  const loadData = async () => {
    setIsLoading(true);
    try {
      const cls = await getClasses();
      setClasses(cls);
      const docs = await getTeacherDocuments();
      setDocuments(docs);

      // Khởi tạo cấu hình phát hành từ dữ liệu Firestore
      const configs: Record<string, any> = {};
      docs.forEach((doc) => {
        const hasDiamondPrice = (doc.isForSale ?? false) && (doc.priceDiamonds ?? 0) > 0;
        let publishedClasses = doc.publishedToClasses ?? [];
        if (hasDiamondPrice) {
          if (!publishedClasses.includes('open-library')) {
            publishedClasses = [...publishedClasses, 'open-library'];
          }
        }

        configs[doc.id] = {
          isPublished: doc.isPublished ?? publishedClasses.length > 0,
          isForSale: doc.isForSale ?? false,
          priceDiamonds: doc.priceDiamonds ?? 0,
          publishedToClasses: publishedClasses,
          classSchedules: doc.classSchedules ?? {},
          globalNodeOverrides: doc.globalNodeOverrides ?? {},
          nodeConfigs: doc.nodeConfigs ?? {},
          allowPreview: true,
          allowDownload: true,
          allowPractice: true,
        };
      });
      setPublishConfigs(configs);
    } catch (err) {
      console.error('Lỗi khi nạp dữ liệu phát hành tài liệu:', err);
      setNotification({ type: 'error', text: 'Không thể nạp danh sách tài liệu. Vui lòng thử lại!' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Danh sách Lớp học do chính Giáo viên này đứng tên mở lớp (không lấy lớp do người khác mở)
  const teacherClasses = useMemo(() => {
    const currentUserId = auth?.currentUser?.uid;
    const currentUserEmail = auth?.currentUser?.email?.toLowerCase();

    return classes.filter((cls) => {
      // Bỏ qua Kho tài liệu trong danh sách lớp riêng (Kho tài liệu là kênh toàn trường riêng biệt)
      if (cls.id === 'cls_open_library') return false;

      // Nếu có ID người dùng hiện tại, kiểm tra teacherId
      if (currentUserId && cls.teacherId) {
        if (cls.teacherId === currentUserId) return true;
      }

      // Nếu có email người dùng hiện tại, kiểm tra teacherId hoặc teacherName
      if (currentUserEmail) {
        if (
          cls.teacherId?.toLowerCase() === currentUserEmail ||
          cls.teacherName?.toLowerCase().includes(currentUserEmail)
        ) {
          return true;
        }
      }

      // Mặc định hiển thị danh sách các lớp do giáo viên tạo trong ứng dụng
      return true;
    });
  }, [classes]);

  // Cập nhật cấu hình chung (Dành cho 1 tài liệu ở cấp gốc)
  const handleConfigChange = (docId: string, field: string, value: any) => {
    setPublishConfigs((prev) => {
      const current = prev[docId];
      if (!current) return prev;

      const updated = { ...current, [field]: value };

      // Quản lý Kho tài liệu 💎
      if (field === 'isForSale' || field === 'priceDiamonds') {
        const nextIsForSale = field === 'isForSale' ? Boolean(value) : updated.isForSale;
        const nextPrice = field === 'priceDiamonds' ? Number(value) : updated.priceDiamonds;
        const hasDiamondPrice = nextIsForSale && nextPrice > 0;

        let updatedClasses = updated.publishedToClasses || [];
        if (hasDiamondPrice) {
          if (!updatedClasses.includes('open-library')) {
            updatedClasses = [...updatedClasses, 'open-library'];
          }
        }
        updated.publishedToClasses = updatedClasses;
      }

      return { ...prev, [docId]: updated };
    });
  };

  // Bật/Tắt Lớp nhận tài liệu ở cấp Bộ Tài Liệu (Gốc)
  const handleToggleClassPublish = (docId: string, classId: string) => {
    setPublishConfigs((prev) => {
      const current = prev[docId];
      if (!current) return prev;

      const currentClasses = current.publishedToClasses || [];
      const updatedClasses = currentClasses.includes(classId)
        ? currentClasses.filter((id) => id !== classId)
        : [...currentClasses, classId];

      return {
        ...prev,
        [docId]: {
          ...current,
          publishedToClasses: updatedClasses,
        },
      };
    });
  };

  // Cài đặt thời hạn phát hành cho từng lớp
  const handleScheduleChange = (
    docId: string,
    classId: string,
    field: 'startDate' | 'endDate',
    value: string
  ) => {
    setPublishConfigs((prev) => {
      const current = prev[docId];
      if (!current) return prev;

      const currentSchedules = { ...(current.classSchedules || {}) };
      const classSched = currentSchedules[classId] || {};

      currentSchedules[classId] = {
        ...classSched,
        [field]: value,
      };

      return {
        ...prev,
        [docId]: {
          ...current,
          classSchedules: currentSchedules,
        },
      };
    });
  };

  // Áp dụng thời hạn nhanh (Ví dụ: Từ bây giờ, trong 7 ngày...)
  const handleApplyQuickSchedule = (docId: string, classId: string, type: 'now' | '7days' | 'clear') => {
    const now = new Date();
    const formatLocal = (d: Date) => {
      const pad = (n: number) => (n < 10 ? '0' + n : n);
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    if (type === 'clear') {
      handleScheduleChange(docId, classId, 'startDate', '');
      handleScheduleChange(docId, classId, 'endDate', '');
      return;
    }

    const startStr = formatLocal(now);
    handleScheduleChange(docId, classId, 'startDate', startStr);

    if (type === '7days') {
      const end7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      handleScheduleChange(docId, classId, 'endDate', formatLocal(end7));
    }
  };

  // Cập nhật trạng thái ghi đè (Override) cho Vị Trí Node
  const handleNodeOverrideChange = (
    docId: string,
    targetClassId: string,
    nodeId: string,
    status: GranularNodePublishStatus
  ) => {
    setPublishConfigs((prev) => {
      const current = prev[docId];
      if (!current) return prev;

      if (targetClassId === 'global') {
        const globalOverrides = { ...(current.globalNodeOverrides || {}) };
        if (status === 'inherit') {
          delete globalOverrides[nodeId];
        } else {
          globalOverrides[nodeId] = status;
        }
        return {
          ...prev,
          [docId]: {
            ...current,
            globalNodeOverrides: globalOverrides,
          },
        };
      } else {
        const currentSchedules = { ...(current.classSchedules || {}) };
        const classSched = currentSchedules[targetClassId] || {};
        const nodeOverrides = { ...(classSched.nodeOverrides || {}) };

        if (status === 'inherit') {
          delete nodeOverrides[nodeId];
        } else {
          nodeOverrides[nodeId] = status;
        }

        return {
          ...prev,
          [docId]: {
            ...current,
            classSchedules: {
              ...currentSchedules,
              [targetClassId]: {
                ...classSched,
                nodeOverrides,
              },
            },
          },
        };
      }
    });
  };

  // Mở Modal Cài Đặt Chi Tiết Cho Vị Trí Node (1. Chọn Lớp Học Nhận & 2. Cấu Hình Giá Bán Kim Cương)
  const handleOpenNodeConfigModal = (docId: string, docTitle: string, node: DocTreeNode) => {
    setEditingNodeModal({ docId, docTitle, node });
  };

  // Cập nhật cấu hình riêng (Giá Kim Cương & Bán) cho từng Vị Trí (Node)
  const handleNodeConfigFieldChange = (docId: string, nodeId: string, field: string, value: any) => {
    setPublishConfigs((prev) => {
      const current = prev[docId];
      if (!current) return prev;

      const currentNodeConfigs = { ...(current.nodeConfigs || {}) };
      const currentNC = currentNodeConfigs[nodeId] || {
        isPublished: true,
        isForSale: false,
        priceDiamonds: 0,
        publishedToClasses: [...current.publishedToClasses],
        classSchedules: {},
      };

      const updatedNC = { ...currentNC, [field]: value };

      if (field === 'isForSale' || field === 'priceDiamonds') {
        const nextIsForSale = field === 'isForSale' ? Boolean(value) : (updatedNC.isForSale ?? false);
        const nextPrice = field === 'priceDiamonds' ? Number(value) : (updatedNC.priceDiamonds ?? 0);
        const hasDiamondPrice = Boolean(nextIsForSale) && (nextPrice ?? 0) > 0;

        let updatedClasses = updatedNC.publishedToClasses || [];
        if (hasDiamondPrice) {
          if (!updatedClasses.includes('open-library')) {
            updatedClasses = [...updatedClasses, 'open-library'];
          }
        } else {
          updatedClasses = updatedClasses.filter((id) => id !== 'open-library');
        }
        updatedNC.publishedToClasses = updatedClasses;
      }

      currentNodeConfigs[nodeId] = updatedNC;

      return {
        ...prev,
        [docId]: {
          ...current,
          nodeConfigs: currentNodeConfigs,
        },
      };
    });
  };

  // Bật/tắt Lớp nhận cho Vị Trí Node Cụ Thể trực tiếp trong Modal
  const handleNodeClassToggleInModal = (docId: string, nodeId: string, classId: string) => {
    setPublishConfigs((prev) => {
      const current = prev[docId];
      if (!current) return prev;

      const docClasses = current.publishedToClasses || [];
      const isParentPublished = docClasses.includes(classId);

      const currentSchedules = { ...(current.classSchedules || {}) };
      const classSched = currentSchedules[classId] || {};
      const currentOverrides = { ...(classSched.nodeOverrides || {}) };
      const currentStatus = currentOverrides[nodeId] || 'inherit';

      let nextStatus: GranularNodePublishStatus = 'inherit';

      if (currentStatus === 'inherit') {
        if (isParentPublished) {
          // Đang thừa hưởng từ cha (Đang phát hành) -> Bấm vào để Ẩn/Bớt riêng khỏi lớp này
          nextStatus = 'unpublished';
        } else {
          // Đang không phát hành -> Bấm vào để Phát hành riêng cho lớp này
          nextStatus = 'published';
        }
      } else if (currentStatus === 'published') {
        // Đang phát hành riêng -> Bấm vào để Ẩn riêng
        nextStatus = 'unpublished';
      } else if (currentStatus === 'unpublished') {
        // Đang ẩn riêng -> Bấm vào để quay lại Thừa hưởng từ cha (nếu cha có phát hành) hoặc Bật phát hành riêng
        nextStatus = isParentPublished ? 'inherit' : 'published';
      }

      currentOverrides[nodeId] = nextStatus;

      // Cập nhật nodeConfigs.publishedToClasses tương ứng
      const currentNodeConfigs = { ...(current.nodeConfigs || {}) };
      const currentNC = currentNodeConfigs[nodeId] || {
        isPublished: true,
        isForSale: false,
        priceDiamonds: 0,
        publishedToClasses: [],
        classSchedules: {},
      };

      let nodeClasses = currentNC.publishedToClasses || [];
      if (nextStatus === 'published' || (nextStatus === 'inherit' && isParentPublished)) {
        if (!nodeClasses.includes(classId)) nodeClasses = [...nodeClasses, classId];
      } else {
        nodeClasses = nodeClasses.filter((c) => c !== classId);
      }

      currentNodeConfigs[nodeId] = {
        ...currentNC,
        publishedToClasses: nodeClasses,
      };

      return {
        ...prev,
        [docId]: {
          ...current,
          classSchedules: {
            ...currentSchedules,
            [classId]: {
              ...classSched,
              nodeOverrides: currentOverrides,
            },
          },
          nodeConfigs: currentNodeConfigs,
        },
      };
    });
  };

  // Khôi phục Lớp về trạng thái Thừa hưởng từ cha trong Modal
  const handleResetNodeClassToInherit = (docId: string, nodeId: string, classId: string) => {
    setPublishConfigs((prev) => {
      const current = prev[docId];
      if (!current) return prev;

      const currentSchedules = { ...(current.classSchedules || {}) };
      const classSched = currentSchedules[classId] || {};
      const currentOverrides = { ...(classSched.nodeOverrides || {}) };

      delete currentOverrides[nodeId];

      return {
        ...prev,
        [docId]: {
          ...current,
          classSchedules: {
            ...currentSchedules,
            [classId]: {
              ...classSched,
              nodeOverrides: currentOverrides,
            },
          },
        },
      };
    });
  };

  // Áp dụng hàng loạt cho tất cả các nút con trong cây
  const handleBatchNodeOverride = (
    docId: string,
    targetClassId: string,
    treeRoot: DocTreeNode,
    status: GranularNodePublishStatus
  ) => {
    const allNodeIds: string[] = [];
    const collectIds = (node: DocTreeNode) => {
      allNodeIds.push(node.id);
      node.children?.forEach(collectIds);
    };
    collectIds(treeRoot);

    setPublishConfigs((prev) => {
      const current = prev[docId];
      if (!current) return prev;

      if (targetClassId === 'global') {
        const nextGlobal: Record<string, GranularNodePublishStatus> = {};
        if (status !== 'inherit') {
          allNodeIds.forEach((id) => {
            nextGlobal[id] = status;
          });
        }
        return {
          ...prev,
          [docId]: {
            ...current,
            globalNodeOverrides: nextGlobal,
          },
        };
      } else {
        const currentSchedules = { ...(current.classSchedules || {}) };
        const classSched = currentSchedules[targetClassId] || {};
        const nextOverrides: Record<string, GranularNodePublishStatus> = {};

        if (status !== 'inherit') {
          allNodeIds.forEach((id) => {
            nextOverrides[id] = status;
          });
        }

        return {
          ...prev,
          [docId]: {
            ...current,
            classSchedules: {
              ...currentSchedules,
              [targetClassId]: {
                ...classSched,
                nodeOverrides: nextOverrides,
              },
            },
          },
        };
      }
    });
  };

  // Trạng thái phát hành theo thời gian
  const getScheduleStatus = (startDate?: string, endDate?: string) => {
    if (!startDate && !endDate) {
      return { label: 'Vô thời hạn', badgeClass: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
    const nowMs = new Date().getTime();
    const startMs = startDate ? new Date(startDate).getTime() : 0;
    const endMs = endDate ? new Date(endDate).getTime() : Infinity;

    if (nowMs < startMs) {
      return { label: '⏳ Chưa đến giờ phát hành', badgeClass: 'bg-amber-100 text-amber-800 border-amber-300 font-bold' };
    }
    if (nowMs > endMs) {
      return { label: '🔴 Đã hết hạn phát hành', badgeClass: 'bg-rose-100 text-rose-800 border-rose-300 font-bold' };
    }
    return { label: '🟢 Đang mở phát hành', badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold' };
  };

  // Bật / tắt công tắc phát hành nhanh
  const handleToggleQuickPublish = (docId: string) => {
    const currentIsPublished = publishConfigs[docId]?.isPublished ?? false;
    const newStatus = !currentIsPublished;

    setPublishConfigs((prev) => ({
      ...prev,
      [docId]: {
        ...prev[docId],
        isPublished: newStatus,
      },
    }));
  };

  // Lưu cấu hình phát hành lên Firestore
  const handleSavePublishConfig = async (docId: string) => {
    const config = publishConfigs[docId];
    if (!config) return;

    const originalDoc = documents.find((d) => d.id === docId);
    if (!originalDoc) return;

    const finalPrice = config.isForSale ? Math.max(0, config.priceDiamonds) : 0;
    const hasDiamondPrice = config.isForSale && finalPrice > 0;

    let finalClasses = config.publishedToClasses || [];
    if (hasDiamondPrice) {
      if (!finalClasses.includes('open-library')) {
        finalClasses = [...finalClasses, 'open-library'];
      }
    } else {
      finalClasses = finalClasses.filter((id) => id !== 'open-library');
    }

    const isPub = config.isPublished || finalClasses.length > 0;

    const updatedDoc: TeacherDocument = {
      ...originalDoc,
      isPublished: isPub,
      isForSale: config.isForSale && finalPrice > 0,
      priceDiamonds: finalPrice,
      publishedToClasses: finalClasses,
      classSchedules: config.classSchedules,
      globalNodeOverrides: config.globalNodeOverrides,
      nodeConfigs: config.nodeConfigs,
      updatedAt: new Date().toLocaleString('vi-VN'),
    };

    try {
      await saveTeacherDocument(updatedDoc);
      setDocuments((prev) => prev.map((d) => (d.id === docId ? updatedDoc : d)));
      setNotification({
        type: 'success',
        text: `Đã lưu cấu hình phát hành cho tài liệu "${updatedDoc.title}" thành công!`,
      });
      setTimeout(() => setNotification(null), 3500);
    } catch (err) {
      console.error('Lỗi khi lưu cấu hình phát hành:', err);
      setNotification({
        type: 'error',
        text: 'Có lỗi xảy ra khi lưu phát hành tài liệu!',
      });
      setTimeout(() => setNotification(null), 3500);
    }
  };

  // Lọc danh sách tài liệu
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const matchSearch =
        doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (doc.subject && doc.subject.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (doc.grade && doc.grade.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (doc.chuong && doc.chuong.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (doc.chuyenDe && doc.chuyenDe.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchSearch) return false;

      if (filterSubject !== 'all' && doc.subject !== filterSubject) return false;
      if (filterGrade !== 'all' && doc.grade !== filterGrade) return false;

      const config = publishConfigs[doc.id];
      const isPub = config?.isPublished ?? doc.isPublished;
      const pubClasses = config?.publishedToClasses ?? doc.publishedToClasses ?? [];
      const isSale = config?.isForSale ?? doc.isForSale;
      const price = config?.priceDiamonds ?? doc.priceDiamonds ?? 0;

      if (activeTab === 'published') {
        return isPub === true;
      }
      if (activeTab === 'unpublished') {
        return !isPub;
      }
      if (activeTab === 'open_library') {
        return (isSale && price > 0) || pubClasses.includes('open-library');
      }

      return true;
    });
  }, [documents, searchTerm, filterSubject, filterGrade, activeTab, publishConfigs]);

  // Trích xuất danh sách môn học và khối lớp có sẵn
  const subjectsList = useMemo(() => {
    const set = new Set<string>();
    documents.forEach((d) => d.subject && set.add(d.subject));
    return Array.from(set);
  }, [documents]);

  const gradesList = useMemo(() => {
    const set = new Set<string>();
    documents.forEach((d) => d.grade && set.add(d.grade));
    return Array.from(set);
  }, [documents]);

  // Tạo Cây Phân Cấp Cấu Trúc Tài Liệu cho từng Document
  const buildTreeForDoc = (doc: TeacherDocument): DocTreeNode => {
    const chuongName = doc.chuong || 'Chương 1: Tổng quan & Nội dung bài học';
    const baiName = doc.bai || 'Bài 1: Khái niệm & Lý thuyết cơ bản';
    const vanDeName = doc.vanDe || 'Vấn đề 1: Các dạng bài tập cốt lõi';
    const chuyenDeName = doc.chuyenDe || 'Chuyên đề 1: Phương pháp giải nhanh & Nâng cao';

    return {
      id: `doc_${doc.id}`,
      type: 'doc',
      label: `[Tài liệu] ${doc.title}`,
      subTypeLabel: 'Cấp Bộ Tài Liệu (Gốc)',
      children: [
        {
          id: `chuong_${doc.id}`,
          type: 'chuong',
          label: chuongName,
          subTypeLabel: 'Cấp Chương',
          children: [
            {
              id: `bai_${doc.id}`,
              type: 'bai',
              label: baiName,
              subTypeLabel: 'Cấp Bài',
              children: [
                {
                  id: `vande_${doc.id}`,
                  type: 'vanDe',
                  label: vanDeName,
                  subTypeLabel: 'Cấp Vấn Đề',
                  children: [
                    {
                      id: `chuyende_${doc.id}`,
                      type: 'chuyenDe',
                      label: chuyenDeName,
                      subTypeLabel: 'Cấp Chuyên Đề',
                      children: [
                        {
                          id: `luyentap_${doc.id}`,
                          type: 'luyenTap',
                          label: '📝 Luyện tập bài học (Bài tập tự luyện & củng cố)',
                          subTypeLabel: 'Thành phần Luyện Tập',
                        },
                        {
                          id: `danhgia_${doc.id}`,
                          type: 'baiDanhGia',
                          label: '📊 Bài đánh giá năng lực & Ma trận điểm số',
                          subTypeLabel: 'Thành phần Đánh Giá',
                        },
                        {
                          id: `ktdg_${doc.id}`,
                          type: 'ktdg',
                          label: '📑 Kiểm tra đánh giá (KTDG) định kỳ 15p & 1 tiết',
                          subTypeLabel: 'Thành phần Kiểm Tra Đánh Giá',
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
  };

  // Render từng Node trong Cây Phân Cấp Cấu Trúc
  const renderTreeNode = (
    node: DocTreeNode,
    docId: string,
    docTitle: string,
    targetClassId: string,
    isParentClassPublished: boolean,
    depth: number = 0
  ) => {
    const isCollapsed = collapsedNodes[node.id] ?? false;
    const config = publishConfigs[docId];

    // Xác định trạng thái ghi đè (Override)
    let overrideStatus: GranularNodePublishStatus = 'inherit';
    if (targetClassId === 'global') {
      overrideStatus = config?.globalNodeOverrides?.[node.id] || 'inherit';
    } else {
      const classSched = config?.classSchedules?.[targetClassId];
      overrideStatus = classSched?.nodeOverrides?.[node.id] || config?.globalNodeOverrides?.[node.id] || 'inherit';
    }

    // Lấy cấu hình riêng cho vị trí này (Node configuration)
    const nodeConfig = config?.nodeConfigs?.[node.id];
    const nodeIsSale = nodeConfig?.isForSale ?? false;
    const nodePrice = nodeConfig?.priceDiamonds ?? 0;
    const nodeClassCount = nodeConfig?.publishedToClasses?.filter((c) => c !== 'open-library').length ?? 0;

    // Xác định trạng thái thực tế
    let isEffectivePublished = false;
    if (overrideStatus === 'published') {
      isEffectivePublished = true;
    } else if (overrideStatus === 'unpublished') {
      isEffectivePublished = false;
    } else {
      // Thừa hưởng
      isEffectivePublished = isParentClassPublished;
    }

    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node.id} className="space-y-1.5 my-1">
        <div
          className={`p-2 sm:p-2.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-all ${
            isEffectivePublished
              ? 'bg-emerald-50/80 border-emerald-200 shadow-2xs'
              : 'bg-slate-50 border-slate-200 opacity-80'
          }`}
          style={{ marginLeft: `${Math.min(depth * 14, 56)}px` }}
        >
          {/* Nhãn và Nút Thu gọn/Mở rộng */}
          <div className="flex items-center gap-2 overflow-hidden">
            {hasChildren ? (
              <button
                type="button"
                onClick={() => setCollapsedNodes((prev) => ({ ...prev, [node.id]: !prev[node.id] }))}
                className="p-1 hover:bg-slate-200/60 rounded text-slate-600 transition-colors cursor-pointer shrink-0"
              >
                {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            ) : (
              <span className="w-6 h-4 shrink-0 inline-block" />
            )}

            <span className="shrink-0">
              {node.type === 'doc' && <BookOpen className="w-4 h-4 text-teal-600" />}
              {node.type === 'chuong' && <Folder className="w-4 h-4 text-indigo-600" />}
              {node.type === 'bai' && <FileText className="w-4 h-4 text-sky-600" />}
              {node.type === 'vanDe' && <GitBranch className="w-4 h-4 text-amber-600" />}
              {node.type === 'chuyenDe' && <Sparkles className="w-4 h-4 text-purple-600" />}
              {node.type === 'luyenTap' && <FileCheck className="w-4 h-4 text-emerald-600" />}
              {node.type === 'baiDanhGia' && <Award className="w-4 h-4 text-rose-600" />}
              {node.type === 'ktdg' && <CheckSquare className="w-4 h-4 text-indigo-600" />}
            </span>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-800 truncate block">
                  {node.label}
                </span>

                {/* Badge Giá Kim Cương riêng ở vị trí này */}
                {nodeIsSale && nodePrice > 0 && (
                  <span className="px-2 py-0.5 text-[10px] font-black bg-amber-100 text-amber-900 rounded-md border border-amber-300 flex items-center gap-1">
                    <Coins className="w-3 h-3 text-amber-600" />
                    <span>{nodePrice} 💎</span>
                  </span>
                )}

                {/* Badge Số Lớp nhận riêng */}
                {nodeClassCount > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold bg-teal-100 text-teal-800 rounded border border-teal-200">
                    {nodeClassCount} lớp nhận riêng
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-500 font-semibold">
                {node.subTypeLabel}
              </span>
            </div>
          </div>

          {/* Trạng thái & Nút CÀI ĐẶT DUY NHẤT (Biểu tượng bánh răng ⚙️) */}
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto flex-wrap">
            {/* Badge Trạng thái trực quan */}
            {overrideStatus === 'published' && (
              <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-emerald-600 text-white flex items-center gap-1 shadow-2xs">
                <CheckCircle2 className="w-3 h-3" /> Phát hành riêng
              </span>
            )}
            {overrideStatus === 'unpublished' && (
              <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-rose-600 text-white flex items-center gap-1 shadow-2xs">
                <XCircle className="w-3 h-3" /> Đã ẩn vị trí này
              </span>
            )}
            {overrideStatus === 'inherit' && (
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border flex items-center gap-1 ${
                  isEffectivePublished
                    ? 'bg-indigo-100 text-indigo-900 border-indigo-300'
                    : 'bg-slate-200 text-slate-700 border-slate-300'
                }`}
              >
                <RotateCcw className="w-3 h-3 text-indigo-600" />
                Thừa hưởng ({isEffectivePublished ? 'Đang mở' : 'Chưa mở'})
              </span>
            )}

            {/* ⚙️ NÚT CÀI ĐẶT DUY NHẤT MỞ BANG CẤU HÌNH VỊ TRÍ */}
            <button
              type="button"
              onClick={() => handleOpenNodeConfigModal(docId, docTitle, node)}
              className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-[11px] font-bold shadow-xs cursor-pointer transition-all flex items-center gap-1.5 shrink-0"
              title="Cài đặt chọn Lớp nhận & Giá bán Kim Cương riêng cho vị trí này"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>⚙️ Cài đặt</span>
            </button>
          </div>
        </div>

        {/* Render danh sách nút con nếu không bị gập */}
        {hasChildren && !isCollapsed && (
          <div className="space-y-1">
            {node.children!.map((child) =>
              renderTreeNode(child, docId, docTitle, targetClassId, isEffectivePublished, depth + 1)
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Thông báo Toast */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-[9999] p-4 rounded-2xl shadow-xl border flex items-center gap-3 animate-fade-in ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : notification.type === 'info'
              ? 'bg-sky-50 border-sky-200 text-sky-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span className="text-xs font-bold">{notification.text}</span>
        </div>
      )}

      {/* MODAL CẤU HÌNH BÁN KIM CƯƠNG & PHÁT HÀNH CHO TỪNG VỊ TRÍ (NODE) */}
      {editingNodeModal && (() => {
        const docId = editingNodeModal.docId;
        const nodeId = editingNodeModal.node.id;
        const nodeLabel = editingNodeModal.node.label;

        const docConfig = publishConfigs[docId];
        const nodeConfig = docConfig?.nodeConfigs?.[nodeId] || {
          isPublished: true,
          isForSale: false,
          priceDiamonds: 0,
          publishedToClasses: [...(docConfig?.publishedToClasses || [])],
          classSchedules: {},
        };

        const nodeIsSale = nodeConfig.isForSale || false;
        const nodePrice = nodeConfig.priceDiamonds || 0;

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-100">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="p-2 bg-teal-100 rounded-xl text-teal-800">
                      <Settings className="w-5 h-5 text-teal-700" />
                    </span>
                    <span className="text-xs font-black text-teal-800 uppercase tracking-wider bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                      ⚙️ Bảng Cài Đặt Phát Hành Vị Trí
                    </span>
                  </div>
                  <h2 className="text-lg font-black text-slate-800">{nodeLabel}</h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Thuộc tài liệu: <strong>{editingNodeModal.docTitle}</strong>
                  </p>
                </div>

                <button
                  onClick={() => setEditingNodeModal(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Chú thích màu sắc tình trạng thừa hưởng & phát hành */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-slate-700">
                  <Info className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>Hướng dẫn nhận biết trạng thái phát hành:</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold pt-0.5">
                  <span className="px-2 py-1 bg-indigo-100 text-indigo-950 border border-indigo-300 rounded-lg flex items-center gap-1">
                    <RotateCcw className="w-3 h-3 text-indigo-600" />
                    Màu Tím: Chọn sẵn (Thừa hưởng từ cấp cha)
                  </span>
                  <span className="px-2 py-1 bg-teal-600 text-white rounded-lg flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Màu Xanh: Phát hành riêng
                  </span>
                  <span className="px-2 py-1 bg-rose-50 text-rose-800 border border-rose-300 rounded-lg flex items-center gap-1 line-through">
                    <XCircle className="w-3 h-3 text-rose-600" />
                    Màu Đỏ nhạt: Đã ẩn riêng
                  </span>
                  <span className="px-2 py-1 bg-white text-slate-600 border border-slate-200 rounded-lg">
                    Màu Trắng: Chưa phát hành
                  </span>
                </div>
              </div>

              {/* Modal Body */}
              <div className="space-y-5">
                {/* 1. CHỌN LỚP HỌC NHẬN TÀI LIỆU CHO VỊ TRÍ NÀY (CHỈ HIỂN THỊ CÁC LỚP DO GIÁO VIÊN MỞ) */}
                <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-teal-600" />
                      <span>1. Chọn Lớp Học Nhận Tài Liệu Ở Vị Trí Này (Lớp Do Thầy/Cô Mở):</span>
                    </label>
                    <span className="text-[11px] font-bold text-teal-800 bg-teal-100 px-2.5 py-0.5 rounded-full border border-teal-200">
                      {teacherClasses.length} Lớp học khả dụng
                    </span>
                  </div>

                  <div className="space-y-2 pt-1 max-h-52 overflow-y-auto pr-1">
                    {teacherClasses.length === 0 ? (
                      <div className="p-4 text-center bg-white rounded-xl border border-slate-200">
                        <p className="text-xs text-slate-500 font-medium">Chưa có lớp học nào do thầy/cô đứng tên mở lớp.</p>
                      </div>
                    ) : (
                      teacherClasses.map((cls) => {
                        const isParentPublished = docConfig?.publishedToClasses?.includes(cls.id) ?? false;
                        const classSched = docConfig?.classSchedules?.[cls.id];
                        const overrideStatus = classSched?.nodeOverrides?.[nodeId] || 'inherit';

                        const isInheritedSelected = overrideStatus === 'inherit' && isParentPublished;
                        const isExplicitPublished = overrideStatus === 'published';
                        const isExplicitUnpublished = overrideStatus === 'unpublished';

                        return (
                          <div key={cls.id} className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleNodeClassToggleInModal(docId, nodeId, cls.id)}
                              className={`flex-1 px-3.5 py-2.5 rounded-2xl text-xs font-bold border cursor-pointer transition-all flex items-center justify-between gap-2 shadow-2xs ${
                                isInheritedSelected
                                  ? 'bg-indigo-100 text-indigo-950 border-indigo-300 hover:bg-indigo-200'
                                  : isExplicitPublished
                                  ? 'bg-teal-600 text-white border-teal-700 hover:bg-teal-700'
                                  : isExplicitUnpublished
                                  ? 'bg-rose-50 text-rose-800 border-rose-300 line-through opacity-80 hover:bg-rose-100'
                                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span>{cls.name}</span>
                                {cls.grade && (
                                  <span className="text-[10px] font-normal opacity-75">({cls.grade})</span>
                                )}
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                {isInheritedSelected && (
                                  <span className="px-2 py-0.5 text-[10px] font-extrabold bg-indigo-200 text-indigo-950 rounded-md flex items-center gap-1">
                                    <RotateCcw className="w-3 h-3 text-indigo-700" /> Thừa hưởng từ cha (Đã chọn sẵn)
                                  </span>
                                )}

                                {isExplicitPublished && (
                                  <span className="px-2 py-0.5 text-[10px] font-black bg-teal-800 text-white rounded-md flex items-center gap-1">
                                    <Check className="w-3 h-3" /> Phát hành riêng
                                  </span>
                                )}

                                {isExplicitUnpublished && (
                                  <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-200 text-rose-900 rounded-md flex items-center gap-1">
                                    <XCircle className="w-3 h-3 text-rose-700" /> Đã ẩn riêng
                                  </span>
                                )}

                                {!isInheritedSelected && !isExplicitPublished && !isExplicitUnpublished && (
                                  <span className="px-2 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-500 rounded-md">
                                    Chưa phát hành
                                  </span>
                                )}
                              </div>
                            </button>

                            {/* Nút reset về Thừa hưởng từ cha nếu có chỉnh sửa riêng */}
                            {overrideStatus !== 'inherit' && (
                              <button
                                type="button"
                                onClick={() => handleResetNodeClassToInherit(docId, nodeId, cls.id)}
                                title="Khôi phục trạng thái Thừa hưởng mặc định từ cấp cha"
                                className="p-2 bg-slate-100 hover:bg-indigo-100 text-slate-600 hover:text-indigo-800 rounded-xl text-[10px] font-bold transition-colors cursor-pointer shrink-0 flex items-center gap-1"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Khôi phục</span>
                              </button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* 2. CẤU HÌNH GIÁ BÁN KIM CƯƠNG CHO VỊ TRÍ NÀY */}
                <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-extrabold text-amber-900 flex items-center gap-1.5">
                      <Coins className="w-4 h-4 text-amber-600" />
                      <span>2. Cấu Hình Giá Bán Kim Cương (💎) Cho Vị Trí Này:</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-amber-900">
                      <input
                        type="checkbox"
                        checked={nodeIsSale}
                        onChange={(e) => handleNodeConfigFieldChange(docId, nodeId, 'isForSale', e.target.checked)}
                        className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                      />
                      <span>Thu Phí Kim Cương Vị Trí Này</span>
                    </label>
                  </div>

                  {nodeIsSale ? (
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-amber-900">Giá bán vị trí này:</span>
                        <input
                          type="number"
                          min={0}
                          step={5}
                          value={nodePrice}
                          onChange={(e) =>
                            handleNodeConfigFieldChange(docId, nodeId, 'priceDiamonds', parseInt(e.target.value) || 0)
                          }
                          className="w-28 px-3 py-1.5 text-xs font-black bg-white border border-amber-300 rounded-xl text-amber-900 focus:ring-2 focus:ring-amber-500"
                        />
                        <span className="text-xs font-bold text-amber-800">Kim Cương (💎)</span>
                      </div>
                      <p className="text-[11px] text-amber-800 leading-relaxed">
                        Ví dụ: Đặt giá 5 💎 cho riêng Bài kiểm tra KTDG này hoặc Bài tập Luyện tập này. Khi giá bán Kim Cương &gt; 0, vị trí này sẽ <strong>tự động thuộc Kho tài liệu 💎</strong> cho người học tự do mua/mở khóa.
                      </p>
                    </div>
                  ) : (
                    <div className="pt-1 text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Vị trí này Miễn Phí (0 💎) - Chưa cấu hình bán riêng</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingNodeModal(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await handleSavePublishConfig(docId);
                    setEditingNodeModal(null);
                  }}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Lưu Cấu Hình Vị Trí</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Header Module */}
      <div className="bg-gradient-to-r from-teal-700 via-emerald-600 to-indigo-700 rounded-2xl p-4 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="px-3.5 py-1.5 bg-white/20 backdrop-blur-md rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2">
              <Send className="w-4 h-4" /> Phát Hành Tài Liệu
            </span>
          </div>

          <button
            onClick={loadData}
            disabled={isLoading}
            className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border border-white/20 shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Làm Mới</span>
          </button>
        </div>
      </div>

      {/* Thanh Bộ Lọc & Tìm Kiếm */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Tabs Trạng Thái */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl w-full md:w-auto overflow-x-auto">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'all'
                  ? 'bg-white text-teal-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tất Cả ({documents.length})
            </button>
            <button
              onClick={() => setActiveTab('published')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'published'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Đang Phát Hành
            </button>
            <button
              onClick={() => setActiveTab('unpublished')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'unpublished'
                  ? 'bg-slate-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Chưa Phát Hành
            </button>
            <button
              onClick={() => setActiveTab('open_library')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                activeTab === 'open_library'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-indigo-700 hover:bg-indigo-50'
              }`}
            >
              <Globe className="w-3.5 h-3.5" /> Kho Tài Liệu 💎
            </button>
          </div>

          {/* Ô Tìm Kiếm */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo tên bài, môn, lớp, chương..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
            />
          </div>
        </div>

        {/* Bộ lọc Môn học & Khối lớp */}
        <div className="flex items-center gap-3 pt-2 border-t border-slate-100 text-xs flex-wrap">
          <div className="flex items-center gap-1.5 text-slate-500 font-bold shrink-0">
            <Filter className="w-3.5 h-3.5 text-teal-600" />
            <span>Bộ lọc:</span>
          </div>

          <select
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
            className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-teal-500 cursor-pointer"
          >
            <option value="all">Tất cả Môn học</option>
            {subjectsList.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            value={filterGrade}
            onChange={(e) => setFilterGrade(e.target.value)}
            className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-teal-500 cursor-pointer"
          >
            <option value="all">Tất cả Khối lớp</option>
            {gradesList.map((g) => (
              <option key={g} value={g}>
                Khối {g}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Danh Sách Tài Liệu & Cấu Hình Phát Hành */}
      <div className="space-y-4">
        {filteredDocuments.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
            <FileText className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-700">Không tìm thấy tài liệu nào!</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Hãy kiểm tra lại từ khóa tìm kiếm hoặc soạn bài mới trong phân hệ <strong>Soạn thảo Word</strong> để
              phát hành.
            </p>
          </div>
        ) : (
          filteredDocuments.map((doc) => {
            const config = publishConfigs[doc.id] || {
              isPublished: doc.isPublished ?? false,
              isForSale: doc.isForSale ?? false,
              priceDiamonds: doc.priceDiamonds ?? 0,
              publishedToClasses: doc.publishedToClasses ?? [],
              classSchedules: doc.classSchedules ?? {},
              globalNodeOverrides: doc.globalNodeOverrides ?? {},
              nodeConfigs: doc.nodeConfigs ?? {},
              allowPreview: true,
              allowDownload: true,
              allowPractice: true,
            };

            const isPub = config.isPublished;
            const isSale = config.isForSale;
            const pubClasses = config.publishedToClasses;

            const treeRoot = buildTreeForDoc(doc);
            const targetClassForTree = selectedTreeClasses[doc.id] || 'global';
            const isParentClassPublished =
              targetClassForTree === 'global'
                ? isPub
                : pubClasses.includes(targetClassForTree);

            return (
              <div
                key={doc.id}
                className={`bg-white rounded-2xl border transition-all shadow-xs overflow-hidden ${
                  isPub ? 'border-teal-200 hover:border-teal-300' : 'border-slate-200 opacity-90'
                }`}
              >
                {/* Header Thẻ Tài Liệu */}
                <div className="p-4 sm:p-5 bg-slate-50/70 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide bg-teal-100 text-teal-800 rounded-md">
                        {doc.subject || 'Môn học'} - Lớp {doc.grade || 'Chung'}
                      </span>
                      {doc.chuong && (
                        <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-200 text-slate-700 rounded-md">
                          {doc.chuong}
                        </span>
                      )}
                      {doc.chuyenDe && (
                        <span className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-100 text-indigo-800 rounded-md">
                          {doc.chuyenDe}
                        </span>
                      )}

                      {/* Status Badges */}
                      {isPub ? (
                        <span className="px-2.5 py-0.5 text-[10px] font-bold bg-emerald-500 text-white rounded-full flex items-center gap-1 shadow-2xs">
                          <CheckCircle2 className="w-3 h-3" /> Đang phát hành
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 text-[10px] font-bold bg-slate-400 text-white rounded-full">
                          Chưa phát hành
                        </span>
                      )}

                      {pubClasses.includes('open-library') && (
                        <span className="px-2.5 py-0.5 text-[10px] font-bold bg-indigo-600 text-white rounded-full flex items-center gap-1">
                          <Globe className="w-3 h-3" /> Kho tài liệu 💎
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-extrabold text-slate-800">{doc.title}</h3>
                    <p className="text-xs text-slate-500">
                      Cập nhật: {doc.updatedAt || 'Mới khởi tạo'} • Thư mục: {doc.driveFolderPath || 'Google Drive'}
                    </p>
                  </div>

                  {/* Nút Công Tắt Nhanh & Lưu */}
                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      onClick={() => handleToggleQuickPublish(doc.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors ${
                        isPub
                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                          : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                      }`}
                    >
                      {isPub ? (
                        <ToggleRight className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <ToggleLeft className="w-5 h-5 text-slate-500" />
                      )}
                      <span>{isPub ? 'Bật phát hành' : 'Tắt phát hành'}</span>
                    </button>

                    <button
                      onClick={() => handleSavePublishConfig(doc.id)}
                      className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      <span>Lưu Cấu Hình</span>
                    </button>
                  </div>
                </div>

                {/* Nội Dung Cấu Hình Phát Hành */}
                <div className="p-4 sm:p-5 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Kênh 1: Chọn Lớp Học Nhận Tài Liệu */}
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">
                          <Users className="w-4 h-4 text-teal-600" />
                          <span>1. Chọn Lớp Học Nhận Tài Liệu (Lớp do thầy/cô dạy):</span>
                        </label>
                        <span className="text-[11px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-100">
                          {pubClasses.filter((c) => c !== 'open-library').length} Lớp đã chọn
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-1 max-h-32 overflow-y-auto pr-1">
                        {/* Kênh phát hành Kho tài liệu (Toàn trường) - Dành cho cả tài liệu Miễn phí (0 💎) và Có phí */}
                        <label
                          onClick={() => handleToggleClassPublish(doc.id, 'open-library')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer transition-all flex items-center gap-1.5 ${
                            pubClasses.includes('open-library')
                              ? 'bg-indigo-600 text-white border-indigo-700 shadow-2xs'
                              : 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50'
                          }`}
                        >
                          <Globe className="w-3.5 h-3.5" />
                          <span>Kho tài liệu 💎 (Toàn trường)</span>
                          {pubClasses.includes('open-library') && <Check className="w-3.5 h-3.5" />}
                        </label>

                        {/* Danh sách Lớp Học do chính Giáo viên này phụ trách */}
                        {teacherClasses.length === 0 ? (
                          <p className="text-xs text-slate-400 italic">Chưa có lớp học nào do thầy/cô mở lớp.</p>
                        ) : (
                          teacherClasses.map((cls) => {
                            const isSelected = pubClasses.includes(cls.id);
                            return (
                              <label
                                key={cls.id}
                                onClick={() => handleToggleClassPublish(doc.id, cls.id)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer transition-all flex items-center gap-1.5 ${
                                  isSelected
                                    ? 'bg-teal-600 text-white border-teal-700 shadow-2xs'
                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                <span>{cls.name}</span>
                                {isSelected && <Check className="w-3.5 h-3.5" />}
                              </label>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* Kênh 2: Thiết lập Thương Mại / Trả Phí Kim Cương */}
                    <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-extrabold text-amber-900 flex items-center gap-1.5">
                          <Coins className="w-4 h-4 text-amber-600" />
                          <span>2. Cấu Hình Giá Bán Kim Cương (💎):</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-amber-800">
                          <input
                            type="checkbox"
                            checked={isSale}
                            onChange={(e) => handleConfigChange(doc.id, 'isForSale', e.target.checked)}
                            className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                          />
                          <span>Thu Phí Kim Cương</span>
                        </label>
                      </div>

                      {isSale ? (
                        <div className="space-y-2 pt-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-amber-800">Giá bán:</span>
                            <input
                              type="number"
                              min={0}
                              step={5}
                              value={config.priceDiamonds}
                              onChange={(e) =>
                                handleConfigChange(doc.id, 'priceDiamonds', parseInt(e.target.value) || 0)
                              }
                              className="w-24 px-2.5 py-1 text-xs font-black bg-white border border-amber-300 rounded-lg text-amber-900 focus:ring-2 focus:ring-amber-500"
                            />
                            <span className="text-xs font-bold text-amber-700">Kim Cương (💎)</span>
                          </div>
                          <p className="text-[11px] text-amber-800 leading-snug">
                            Tài liệu có giá bán Kim Cương &gt; 0 sẽ <strong>tự động thuộc Kho tài liệu 💎</strong> cho tất cả giáo viên &amp; học sinh mua/mở khóa.
                          </p>
                        </div>
                      ) : (
                        <div className="pt-2 text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Tài liệu Miễn Phí (0 💎) trong Kho tài liệu</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* CÀI ĐẶT THỜI GIAN BẮT ĐẦU / KẾT THÚC PHÁT HÀNH CHO TỪNG LỚP */}
                  {pubClasses.length > 0 && (
                    <div className="p-3.5 bg-sky-50/70 rounded-xl border border-sky-200 space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-sky-700 shrink-0" />
                          <span className="text-xs font-black text-sky-900">
                            3. Cài Đặt Thời Gian Bắt Đầu &amp; Kết Thúc Phát Hành Cho Từng Lớp:
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-sky-700 bg-sky-100 px-2.5 py-0.5 rounded-full border border-sky-200">
                          {pubClasses.length} lớp áp dụng hạn giờ
                        </span>
                      </div>

                      <div className="space-y-2.5">
                        {pubClasses.map((classId) => {
                          const className =
                            classId === 'open-library'
                              ? 'Kho tài liệu 💎'
                              : classes.find((c) => c.id === classId)?.name || classId;

                          const sched = config.classSchedules?.[classId];
                          const status = getScheduleStatus(sched?.startDate, sched?.endDate);

                          return (
                            <div
                              key={classId}
                              className="bg-white p-3 rounded-xl border border-sky-200 space-y-2 shadow-2xs"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                  {classId === 'open-library' ? (
                                    <Globe className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                  ) : (
                                    <Users className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                                  )}
                                  {className}
                                </span>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${status.badgeClass}`}>
                                  {status.label}
                                </span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                <div>
                                  <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">
                                    🟢 Thời gian BẮT ĐẦU mở:
                                  </label>
                                  <input
                                    type="datetime-local"
                                    value={sched?.startDate || ''}
                                    onChange={(e) =>
                                      handleScheduleChange(doc.id, classId, 'startDate', e.target.value)
                                    }
                                    className="w-full px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-teal-500 focus:bg-white"
                                  />
                                </div>

                                <div>
                                  <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">
                                    🔴 Thời gian KẾT THÚC mở:
                                  </label>
                                  <input
                                    type="datetime-local"
                                    value={sched?.endDate || ''}
                                    onChange={(e) =>
                                      handleScheduleChange(doc.id, classId, 'endDate', e.target.value)
                                    }
                                    className="w-full px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-teal-500 focus:bg-white"
                                  />
                                </div>
                              </div>

                              <div className="flex items-center gap-2 pt-1 text-[10px] flex-wrap">
                                <span className="text-slate-400 font-medium">Lựa chọn nhanh:</span>
                                <button
                                  type="button"
                                  onClick={() => handleApplyQuickSchedule(doc.id, classId, 'now')}
                                  className="px-2 py-0.5 bg-teal-50 hover:bg-teal-100 text-teal-700 font-bold rounded border border-teal-200 cursor-pointer transition-colors"
                                >
                                  Mở từ bây giờ
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleApplyQuickSchedule(doc.id, classId, '7days')}
                                  className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded border border-indigo-200 cursor-pointer transition-colors"
                                >
                                  Mở trong 7 ngày
                                </button>
                                {(sched?.startDate || sched?.endDate) && (
                                  <button
                                    type="button"
                                    onClick={() => handleApplyQuickSchedule(doc.id, classId, 'clear')}
                                    className="px-2 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded border border-rose-200 cursor-pointer ml-auto transition-colors"
                                  >
                                    Xóa hạn giờ (Vô thời hạn)
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* QUẢN LÝ PHÁT HÀNH THEO TỪNG CẤP ĐỘ CẤU TRÚC (TÀI LIỆU -> CHƯƠNG -> BÀI -> VẤN ĐỀ -> CHUYÊN ĐỀ -> BÀI ĐÁNH GIÁ -> LUYỆN TẬP -> KTDG) */}
                  <div className="p-3.5 bg-teal-50/50 rounded-2xl border border-teal-200 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-teal-100">
                      <div className="space-y-0.5">
                        <label className="text-xs font-black text-teal-900 flex items-center gap-1.5">
                          <GitBranch className="w-4 h-4 text-teal-700" />
                          <span>4. Quản Lý Phát Hành &amp; Định Giá Kim Cương Cho Từng Vị Trí Cấu Trúc:</span>
                        </label>
                        <p className="text-[11px] text-teal-700 font-medium">
                          Bấm nút <strong>⚙️ Cài đặt</strong> ở bất kỳ vị trí nào để xem tình trạng phát hành, chọn/bỏ chọn lớp học &amp; định giá bán Kim Cương (💎) riêng cho vị trí đó.
                        </p>
                      </div>

                      {/* Chọn Lớp cần cấu hình cây phát hành */}
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-bold text-slate-600">Áp dụng cho:</span>
                        <select
                          value={targetClassForTree}
                          onChange={(e) =>
                            setSelectedTreeClasses((prev) => ({ ...prev, [doc.id]: e.target.value }))
                          }
                          className="px-3 py-1 bg-white border border-teal-300 rounded-xl text-xs font-black text-teal-900 focus:ring-2 focus:ring-teal-500 cursor-pointer shadow-2xs"
                        >
                          <option value="global">Cấu hình Mặc Định (Chung)</option>
                          {pubClasses.map((cId) => {
                            const cName =
                              cId === 'open-library'
                                ? 'Kho tài liệu 💎'
                                : classes.find((c) => c.id === cId)?.name || cId;
                            return (
                              <option key={cId} value={cId}>
                                Lớp: {cName}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    </div>

                    {/* Nút Thao tác Hàng loạt trên Cây */}
                    <div className="flex items-center justify-between gap-2 flex-wrap text-xs pt-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-bold text-slate-500">Thao tác nhanh cây:</span>
                        <button
                          type="button"
                          onClick={() => handleBatchNodeOverride(doc.id, targetClassForTree, treeRoot, 'published')}
                          className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg text-[11px] font-bold cursor-pointer transition-colors flex items-center gap-1"
                        >
                          <PlusCircle className="w-3.5 h-3.5" /> Mở toàn bộ mục con
                        </button>
                        <button
                          type="button"
                          onClick={() => handleBatchNodeOverride(doc.id, targetClassForTree, treeRoot, 'unpublished')}
                          className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-lg text-[11px] font-bold cursor-pointer transition-colors flex items-center gap-1"
                        >
                          <MinusCircle className="w-3.5 h-3.5" /> Ẩn toàn bộ mục con
                        </button>
                        <button
                          type="button"
                          onClick={() => handleBatchNodeOverride(doc.id, targetClassForTree, treeRoot, 'inherit')}
                          className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-[11px] font-bold cursor-pointer transition-colors flex items-center gap-1"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Khôi phục thừa hưởng
                        </button>
                      </div>
                    </div>

                    {/* Hiển thị Cây Cấu Trúc */}
                    <div className="bg-white p-3 rounded-xl border border-teal-100 shadow-2xs overflow-x-auto">
                      {renderTreeNode(treeRoot, doc.id, doc.title, targetClassForTree, isParentClassPublished)}
                    </div>
                  </div>

                  {/* Tùy chọn Quyền Tương Tác cho Học Sinh */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
                    <div className="flex items-center gap-4 text-slate-700 font-bold">
                      <span className="text-slate-500">Quyền xem &amp; Tương tác:</span>

                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.allowPreview}
                          onChange={(e) => handleConfigChange(doc.id, 'allowPreview', e.target.checked)}
                          className="rounded text-teal-600 focus:ring-teal-500 w-3.5 h-3.5"
                        />
                        <Eye className="w-3.5 h-3.5 text-slate-500" />
                        <span>Xem Trực Tiếp</span>
                      </label>

                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.allowDownload}
                          onChange={(e) => handleConfigChange(doc.id, 'allowDownload', e.target.checked)}
                          className="rounded text-teal-600 focus:ring-teal-500 w-3.5 h-3.5"
                        />
                        <Download className="w-3.5 h-3.5 text-slate-500" />
                        <span>Tải Tài Liệu</span>
                      </label>
                    </div>

                    <div className="text-[11px] text-slate-500 font-medium">
                      Đã bán / mở khóa:{' '}
                      <strong className="text-teal-700 font-bold">{doc.purchasedUserIds?.length ?? 0} lượt</strong>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
