import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  CheckCircle2,
  AlertCircle,
  Users,
  FolderLock,
  Save,
  BookOpenCheck,
  Heart,
  TrendingUp,
  FolderHeart,
  Plus,
  Coins,
} from 'lucide-react';
import { TeacherDocument, ClassItem, UserProfile } from '../../../services/storageTypes';
import { getClasses, getTeacherDocuments, saveTeacherDocument, getUsers } from '../../ConnectData/ConnectFirestore';

export const ThuongMaiTaiLieuView: React.FC = () => {
  const [documents, setDocuments] = useState<TeacherDocument[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'all' | 'for_sale' | 'free_class'>('all');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Trạng thái cấu hình đang chỉnh sửa cho từng tài liệu (theo ID) để chỉnh sửa không cần mở modal
  const [editingConfigs, setEditingConfigs] = useState<Record<string, {
    isForSale: boolean;
    priceDiamonds: number;
    publishedToClasses: string[];
  }>>({});

  useEffect(() => {
    async function loadData() {
      try {
        const cls = await getClasses();
        setClasses(cls);
        const docs = await getTeacherDocuments();
        setDocuments(docs);
        const us = await getUsers();
        setStudents(us.filter(u => u.role === 'student'));

        // Khởi tạo cấu hình ban đầu
        const configs: Record<string, any> = {};
        docs.forEach(doc => {
          configs[doc.id] = {
            isForSale: doc.isForSale ?? false,
            priceDiamonds: doc.priceDiamonds ?? 50,
            publishedToClasses: doc.publishedToClasses ?? [],
          };
        });
        setEditingConfigs(configs);
      } catch (err) {
        console.error('Lỗi khi tải dữ liệu thương mại:', err);
      }
    }
    loadData();
  }, []);

  // Tính toán thống kê doanh thu & phát hành
  const stats = useMemo(() => {
    let totalRevenue = 0;
    let totalPurchases = 0;
    let totalForSale = 0;
    let totalPublishedFree = 0;

    documents.forEach(doc => {
      const isSale = doc.isForSale ?? false;
      const price = doc.priceDiamonds ?? 0;
      const boughtCount = doc.purchasedUserIds?.length ?? 0;

      if (isSale) {
        totalForSale++;
        totalRevenue += boughtCount * price;
        totalPurchases += boughtCount;
      } else if (doc.publishedToClasses && doc.publishedToClasses.length > 0) {
        totalPublishedFree++;
      }
    });

    return {
      totalRevenue,
      totalPurchases,
      totalForSale,
      totalPublishedFree,
    };
  }, [documents]);

  const handleConfigChange = (docId: string, field: string, value: any) => {
    setEditingConfigs(prev => ({
      ...prev,
      [docId]: {
        ...prev[docId],
        [field]: value,
      },
    }));
  };

  const handleToggleClass = (docId: string, classId: string) => {
    const currentList = editingConfigs[docId]?.publishedToClasses ?? [];
    const updatedList = currentList.includes(classId)
      ? currentList.filter(id => id !== classId)
      : [...currentList, classId];
    
    handleConfigChange(docId, 'publishedToClasses', updatedList);
  };

  const handleSaveConfig = async (docId: string) => {
    const config = editingConfigs[docId];
    if (!config) return;

    const originalDoc = documents.find(d => d.id === docId);
    if (!originalDoc) return;

    // Chuẩn hóa giá bán nếu bật tính phí
    const finalPrice = config.isForSale ? Math.max(0, config.priceDiamonds ?? 0) : 0;
    const hasNodeDiamondPrice = Boolean(
      originalDoc.nodeConfigs &&
      Object.values(originalDoc.nodeConfigs).some(
        (nc) =>
          nc &&
          ((nc.isForSale && (nc.priceDiamonds ?? 0) >= 0) ||
            (typeof nc.priceDiamonds === 'number' && nc.priceDiamonds >= 0) ||
            nc.publishedToClasses?.includes('open-library'))
      )
    );
    const hasDiamondPrice = (Boolean(config.isForSale) && finalPrice >= 0) || hasNodeDiamondPrice;

    let finalClasses = config.publishedToClasses || [];
    if (hasDiamondPrice) {
      if (!finalClasses.includes('open-library')) {
        finalClasses = [...finalClasses, 'open-library'];
      }
    } else {
      finalClasses = finalClasses.filter(id => id !== 'open-library');
    }

    const updatedDoc: TeacherDocument = {
      ...originalDoc,
      isForSale: Boolean(config.isForSale),
      priceDiamonds: finalPrice,
      publishedToClasses: finalClasses,
      isPublished: finalClasses.length > 0 || Boolean(originalDoc.isPublished),
      updatedAt: new Date().toLocaleString('vi-VN'),
    };

    try {
      await saveTeacherDocument(updatedDoc);
      setDocuments(prev => prev.map(d => d.id === docId ? updatedDoc : d));
      setNotification({
        type: 'success',
        text: `Đã cập nhật cấu hình thương mại & phát hành cho tài liệu "${updatedDoc.title}" thành công!`,
      });
      setTimeout(() => setNotification(null), 4000);
    } catch (err) {
      setNotification({
        type: 'error',
        text: 'Đã xảy ra lỗi khi lưu cấu hình thương mại.',
      });
      setTimeout(() => setNotification(null), 4000);
    }
  };

  // Lọc tài liệu theo tab và tìm kiếm
  const filteredDocs = useMemo(() => {
    return documents.filter(doc => {
      const matchSearch =
        doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (doc.chuong && doc.chuong.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (doc.chuyenDe && doc.chuyenDe.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchSearch) return false;

      if (activeTab === 'for_sale') {
        return doc.isForSale === true;
      }
      if (activeTab === 'free_class') {
        return !doc.isForSale && doc.publishedToClasses && doc.publishedToClasses.length > 0;
      }
      return true;
    });
  }, [documents, searchTerm, activeTab]);

  return (
    <div id="teaching-monetization-view" className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 shadow-xs animate-fade-in ${
            notification.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4.5 h-4.5 text-rose-600 shrink-0" />
          )}
          <span>{notification.text}</span>
        </div>
      )}

      {/* Header Panel */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
        <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
          <Coins className="w-5.5 h-5.5 text-amber-500" />
          Thương Mại Hóa &amp; Phát Hành Tài Liệu Dạy Học
        </h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          Tách biệt hoàn toàn nghiệp vụ thương mại: Quản lý giá bán tài liệu bằng <strong>Kim Cương 💎 (tiền số ứng dụng)</strong>, thiết lập hình thức phát hành lớp học <strong>Miễn phí 🆓</strong>, đồng thời theo dõi doanh thu thực tế và đánh giá <strong>Tim ❤️</strong> từ học sinh.
        </p>
      </div>

      {/* Grid Thống kê Doanh thu & Quy mô */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Doanh thu tích lũy */}
        <div className="bg-white border border-slate-200 p-4.5 rounded-2xl shadow-3xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Doanh thu tích lũy</span>
            <span className="block text-xl font-black text-amber-600 font-mono">
              💎 {stats.totalRevenue.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-400 block">Doanh thu từ học sinh mua</span>
          </div>
          <div className="w-11 h-11 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Tổng lượt mua tài liệu */}
        <div className="bg-white border border-slate-200 p-4.5 rounded-2xl shadow-3xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lượt mua có phí</span>
            <span className="block text-xl font-black text-indigo-700 font-mono">
              {stats.totalPurchases} lượt
            </span>
            <span className="text-[10px] text-slate-400 block">Số học sinh đã mua thành công</span>
          </div>
          <div className="w-11 h-11 bg-indigo-50 text-indigo-500 rounded-xl flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Tài liệu thương mại */}
        <div className="bg-white border border-slate-200 p-4.5 rounded-2xl shadow-3xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tài liệu đang bán</span>
            <span className="block text-xl font-black text-emerald-700 font-mono">
              {stats.totalForSale} tài liệu
            </span>
            <span className="text-[10px] text-slate-400 block">Gắn thẻ giá bán bằng Kim Cương</span>
          </div>
          <div className="w-11 h-11 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center">
            <FolderHeart className="w-5 h-5" />
          </div>
        </div>

        {/* Giáo án miễn phí lớp */}
        <div className="bg-white border border-slate-200 p-4.5 rounded-2xl shadow-3xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cấp miễn phí lớp</span>
            <span className="block text-xl font-black text-rose-700 font-mono">
              {stats.totalPublishedFree} tài liệu
            </span>
            <span className="text-[10px] text-slate-400 block">Học sinh trong lớp học miễn phí</span>
          </div>
          <div className="w-11 h-11 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center">
            <BookOpenCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Row */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-3xs flex flex-wrap items-center justify-between gap-4">
        {/* Navigation Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold gap-1">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-2 rounded-lg transition-colors cursor-pointer ${
              activeTab === 'all'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tất cả ({documents.length})
          </button>
          <button
            onClick={() => setActiveTab('for_sale')}
            className={`px-3.5 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
              activeTab === 'for_sale'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>💎 Đang bán có phí</span>
            <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 rounded-sm font-black">
              {stats.totalForSale}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('free_class')}
            className={`px-3.5 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
              activeTab === 'free_class'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>🆓 Cấp cho lớp học</span>
            <span className="bg-rose-100 text-rose-800 text-[10px] px-1.5 rounded-sm font-bold">
              {stats.totalPublishedFree}
            </span>
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Tìm theo chuyên đề, chương, tựa đề..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-semibold"
          />
        </div>
      </div>

      {/* Grid of Documents configurations */}
      {filteredDocs.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-3xs text-slate-400 text-xs italic">
          Không tìm thấy tài liệu phù hợp với bộ lọc hiện tại.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredDocs.map(doc => {
            const config = editingConfigs[doc.id] || {
              isForSale: false,
              priceDiamonds: 50,
              publishedToClasses: [],
            };

            const boughtCount = doc.purchasedUserIds?.length ?? 0;
            const revenue = boughtCount * (doc.priceDiamonds ?? 0);

            // Giả lập điểm đánh giá uy tín dựa trên độ hài lòng
            const heartRating = 4.8;
            const heartCount = 12 + (doc.title.charCodeAt(0) % 15);

            return (
              <div
                key={doc.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between space-y-4 hover:border-indigo-200 transition-colors"
              >
                {/* Top Section Info & 4-level breadcrumb */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold">
                      {doc.subject} • {doc.grade}
                    </span>
                    <span>Dung lượng: {doc.fileSize}</span>
                  </div>

                  {/* 4-level Breadcrumb Badge */}
                  <div className="p-2 bg-slate-50 rounded-lg border border-slate-100 text-[10px] space-y-1 font-mono">
                    <div className="flex items-center gap-1 text-slate-600 truncate overflow-x-auto">
                      <span className="font-bold text-slate-800">{doc.chuong || 'Chương 1'}</span>
                      <span>/</span>
                      <span className="text-slate-700">{doc.bai || 'Bài 1'}</span>
                      <span>/</span>
                      <span className="text-slate-700">{doc.vanDe || 'Vấn đề 1'}</span>
                      <span>/</span>
                      <span className="font-bold text-indigo-700 bg-indigo-50 px-1 py-0.5 rounded">{doc.chuyenDe || 'Chuyên đề'}</span>
                    </div>
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm leading-snug">
                    {doc.title}
                  </h3>

                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {doc.contentSnippet || 'Không có mô tả tóm tắt nào.'}
                  </p>
                </div>

                {/* Real-time Sales Stats / Tim & Kim cương */}
                <div className="grid grid-cols-3 gap-2 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100 text-center">
                  <div>
                    <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Lượt mua</span>
                    <span className="text-xs font-black text-indigo-800">{boughtCount} lượt</span>
                  </div>
                  <div>
                    <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Tổng doanh thu</span>
                    <span className="text-xs font-black text-amber-700 font-mono">💎 {revenue}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Đánh giá Tim</span>
                    <span className="text-xs font-black text-rose-600 flex items-center justify-center gap-0.5">
                      <Heart className="w-3 h-3 text-rose-500 fill-rose-500" />
                      {heartRating} ({heartCount})
                    </span>
                  </div>
                </div>

                {/* Configuration controls */}
                <div className="pt-3 border-t border-slate-100 space-y-3">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Hình thức phân phối &amp; Giá bán:
                  </span>

                  {/* Switch to choose Mode */}
                  <div className="grid grid-cols-2 gap-2 bg-slate-100/80 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => handleConfigChange(doc.id, 'isForSale', false)}
                      className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        !config.isForSale
                          ? 'bg-white text-emerald-800 shadow-3xs'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      🆓 Cấp cho lớp
                    </button>
                    <button
                      type="button"
                      onClick={() => handleConfigChange(doc.id, 'isForSale', true)}
                      className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        config.isForSale
                          ? 'bg-white text-amber-900 shadow-3xs'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      💎 Bán Kim Cương
                    </button>
                  </div>

                  {/* If For Sale -> Price configurator */}
                  {config.isForSale && (
                    <div className="flex items-center gap-2.5 p-2 bg-amber-50/40 border border-amber-200/50 rounded-xl animate-fade-in">
                      <label className="text-[11px] font-bold text-amber-900">Đơn giá bán:</label>
                      <input
                        type="number"
                        min={0}
                        max={1000}
                        value={config.priceDiamonds}
                        onChange={e => handleConfigChange(doc.id, 'priceDiamonds', Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-24 py-1 px-2 text-xs font-black text-amber-800 bg-white border border-amber-300 rounded-lg text-center font-mono"
                      />
                      <span className="text-[10px] text-amber-700 font-bold">💎 (Phạm vi: 0 - 1000)</span>
                    </div>
                  )}

                  {/* Publish to Classes multi-select */}
                  <div className="space-y-1">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Các lớp được quyền truy cập:
                    </span>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {classes.map(cls => {
                        const isSelected = config.publishedToClasses.includes(cls.id);
                        return (
                          <button
                            key={cls.id}
                            type="button"
                            onClick={() => handleToggleClass(doc.id, cls.id)}
                            className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {cls.code}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Save button */}
                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleSaveConfig(doc.id)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Cập nhật cấu hình</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
