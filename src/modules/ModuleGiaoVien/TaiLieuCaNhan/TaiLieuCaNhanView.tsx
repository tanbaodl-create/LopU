import React, { useState, useEffect } from 'react';
import {
  Plus,
  Cloud,
  Lock,
  Unlock,
  Search,
  FolderTree,
  ChevronRight,
  Layers,
  Folder,
  FileText,
} from 'lucide-react';
import { TeacherDocument, ClassItem } from '../../../services/storageTypes';
import { getClasses } from '../../ConnectData/ConnectFirestore';
import { saveTeachingMaterialHierarchyToDrive, getDriveConnectionState } from '../../ConnectData/ConnectDrive/googleDriveService';
import { IconNam, IconNu } from '../../ModuleHocSinh/SoDoLop/SoDoLopView';

export const TaiLieuCaNhanView: React.FC = () => {
  const [documents, setDocuments] = useState<TeacherDocument[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [notification, setNotification] = useState<string | null>(null);

  // New Doc Form modal state with 4-level hierarchy: Chương -> Bài -> Vấn đề -> Chuyên đề
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newSubject, setNewSubject] = useState<string>('Toán Học');
  const [newGrade, setNewGrade] = useState<string>('Khối 10');
  const [newChuong, setNewChuong] = useState<string>('Chương 1: Mệnh đề & Tập hợp');
  const [newBai, setNewBai] = useState<string>('Bài 1: Các phép toán trên tập hợp');
  const [newVanDe, setNewVanDe] = useState<string>('Vấn đề 1: Xác định giao, hợp, hiệu');
  const [newChuyenDe, setNewChuyenDe] = useState<string>('Chuyên đề: Bài toán chứa tham số m');
  const [newCategory] = useState<TeacherDocument['category']>('lesson_plan');
  const [newSnippet, setNewSnippet] = useState<string>('');

  useEffect(() => {
    async function load() {
      const cls = await getClasses();
      setClasses(cls);
    }
    load();
  }, []);

  const handleSaveToDrive = async (docItem: TeacherDocument) => {
    const res = await saveTeachingMaterialHierarchyToDrive(
      docItem,
      docItem.chuong || 'Chương 1',
      docItem.bai || 'Bài 1',
      docItem.vanDe || 'Vấn đề 1',
      docItem.chuyenDe || 'Chuyên đề trọng tâm'
    );

    setDocuments(prev =>
      prev.map(d =>
        d.id === docItem.id
          ? {
              ...d,
              driveSynced: true,
              driveFileId: res.fileId,
              driveFolderPath: res.drivePath,
              chuong: docItem.chuong || 'Chương 1',
              bai: docItem.bai || 'Bài 1',
              vanDe: docItem.vanDe || 'Vấn đề 1',
              chuyenDe: docItem.chuyenDe || 'Chuyên đề trọng tâm',
            }
          : d
      )
    );
    const conn = getDriveConnectionState();
    const cleanFileName = `[${docItem.chuyenDe || 'Chuyên đề trọng tâm'}]_${(docItem.title || 'TaiLieu').replace(/[\s:/\\?*]+/g, '_')}`;
    if (conn.isConnected && conn.isRealConfigured) {
      setNotification(`Đã tải lên Drive thành công: ${cleanFileName} tại thư mục ${res.drivePath}`);
    } else {
      setNotification(`Đã tải lên Drive thành công (Sandbox): ${cleanFileName} tại thư mục ${res.drivePath}`);
    }
    setTimeout(() => setNotification(null), 5000);
  };

  const handleTogglePublish = (docId: string, classId: string) => {
    setDocuments(prev =>
      prev.map(d => {
        if (d.id === docId) {
          const isPublished = d.publishedToClasses.includes(classId);
          const nextPublished = isPublished
            ? d.publishedToClasses.filter(c => c !== classId)
            : [...d.publishedToClasses, classId];
          return {
            ...d,
            isPublished: nextPublished.length > 0,
            publishedToClasses: nextPublished,
          };
        }
        return d;
      })
    );
    setNotification('Đã cập nhật trạng thái phát hành bài giảng đến lớp học thành công!');
    setTimeout(() => setNotification(null), 4000);
  };

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    // Kiểm tra trùng tên tài liệu
    const isExisting = documents.find(
      d => d.title.toLowerCase() === newTitle.trim().toLowerCase()
    );

    if (isExisting) {
      const confirmOverwrite = window.confirm(
        `Bộ tài liệu với tiêu đề "${newTitle.trim()}" đã tồn tại. Bạn có muốn ghi đè lên tài liệu cũ không?`
      );
      if (!confirmOverwrite) return;

      const driveFolder = `myApp\\LopU / ${newSubject} / ${newChuong} / ${newBai} / ${newVanDe} / ${newChuyenDe}`;
      const updatedDoc: TeacherDocument = {
        ...isExisting,
        subject: newSubject,
        grade: newGrade,
        chuong: newChuong.trim(),
        bai: newBai.trim(),
        vanDe: newVanDe.trim(),
        chuyenDe: newChuyenDe.trim(),
        driveFolderPath: driveFolder,
        updatedAt: new Date().toISOString().slice(0, 10),
        contentSnippet: newSnippet.trim() || 'Nội dung giáo án, bài tập tự luận và trắc nghiệm trọng tâm.',
        driveSynced: true,
      };

      await saveTeachingMaterialHierarchyToDrive(
        updatedDoc,
        newChuong,
        newBai,
        newVanDe,
        newChuyenDe
      );

      setDocuments(prev => prev.map(d => d.id === isExisting.id ? updatedDoc : d));
      setShowCreateModal(false);
      setNewTitle('');
      setNewSnippet('');
      
      const conn = getDriveConnectionState();
      const cleanFileName = `[${newChuyenDe}]_${newTitle.trim().replace(/[\s:/\\?*]+/g, '_')}`;
      if (conn.isConnected && conn.isRealConfigured) {
        setNotification(`Đã ghi đè & cập nhật lên Drive thành công: ${cleanFileName} tại thư mục ${driveFolder}`);
      } else {
        setNotification(`Đã ghi đè & cập nhật lên Drive thành công (Sandbox): ${cleanFileName} tại thư mục ${driveFolder}`);
      }
      setTimeout(() => setNotification(null), 5000);
      return;
    }

    const driveFolder = `myApp\\LopU / ${newSubject} / ${newChuong} / ${newBai} / ${newVanDe} / ${newChuyenDe}`;

    const newDoc: TeacherDocument = {
      id: `doc_${Date.now()}`,
      title: newTitle.trim(),
      subject: newSubject,
      grade: newGrade,
      category: newCategory,
      fileType: 'gdoc',
      chuong: newChuong.trim(),
      bai: newBai.trim(),
      vanDe: newVanDe.trim(),
      chuyenDe: newChuyenDe.trim(),
      driveFolderPath: driveFolder,
      createdAt: new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toISOString().slice(0, 10),
      isPublished: false,
      publishedToClasses: [],
      driveSynced: true,
      fileSize: '1.5 MB',
      authorId: 'u_gv01',
      contentSnippet: newSnippet.trim() || 'Nội dung giáo án, bài tập tự luận và trắc nghiệm trọng tâm.',
    };

    // Tự động sao lưu lên Google Drive theo cấu trúc phân cấp
    await saveTeachingMaterialHierarchyToDrive(
      newDoc,
      newChuong,
      newBai,
      newVanDe,
      newChuyenDe
    );

    setDocuments([newDoc, ...documents]);
    setShowCreateModal(false);
    setNewTitle('');
    setNewSnippet('');
    const conn = getDriveConnectionState();
    const cleanFileName = `[${newChuyenDe}]_${newTitle.trim().replace(/[\s:/\\?*]+/g, '_')}`;
    if (conn.isConnected && conn.isRealConfigured) {
      setNotification(`Đã tải lên Drive thành công: ${cleanFileName} tại thư mục ${driveFolder}`);
    } else {
      setNotification(`Đã tải lên Drive thành công (Sandbox): ${cleanFileName} tại thư mục ${driveFolder}`);
    }
    setTimeout(() => setNotification(null), 5000);
  };

  const filteredDocs = documents.filter(d => {
    const matchSearch = d.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = categoryFilter === 'all' || d.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  return (
    <div id="teaching-documents-view" className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div className="p-3.5 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs">
          <Cloud className="w-4 h-4 text-blue-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Top Header & Search */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                Tủ Sách Tài Liệu Dạy Học Của Giáo Viên
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                <FolderTree className="w-3 h-3 text-indigo-600" />
                <span>Cấu trúc 4 cấp độ</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Giáo viên tạo các bộ tài liệu dạy học lưu trên Google Drive cá nhân theo cấu trúc chuẩn:{' '}
              <strong className="text-indigo-700 font-semibold">Chương ➔ Bài ➔ Vấn đề ➔ Chuyên đề</strong>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              id="btn-create-document"
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo bộ tài liệu mới</span>
            </button>
          </div>
        </div>

        {/* Hierarchy path legend */}
        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-600 flex flex-wrap items-center gap-2">
          <span className="font-bold text-slate-700 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-indigo-600" /> Cấu trúc lưu trữ Drive:
          </span>
          <span className="px-2 py-0.5 bg-white rounded border border-slate-200 font-medium">Chương</span>
          <ChevronRight className="w-3 h-3 text-slate-400" />
          <span className="px-2 py-0.5 bg-white rounded border border-slate-200 font-medium">Bài</span>
          <ChevronRight className="w-3 h-3 text-slate-400" />
          <span className="px-2 py-0.5 bg-white rounded border border-slate-200 font-medium">Vấn đề</span>
          <ChevronRight className="w-3 h-3 text-slate-400" />
          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">Chuyên đề</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto text-xs font-semibold">
          {[
            { id: 'all', label: 'Tất cả tài liệu' },
            { id: 'lesson_plan', label: 'Giáo án điện tử' },
            { id: 'exam', label: 'Đề thi & kiểm tra' },
            { id: 'exercise', label: 'Bài tập bồi dưỡng' },
            { id: 'seating_chart', label: 'Sơ đồ lớp Drag & Drop' },
            { id: 'reference', label: 'Sổ tay tham khảo' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setCategoryFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                categoryFilter === tab.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Tìm theo tiêu đề, chương, bài..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Card Mẫu Sơ Đồ Lớp Tích Hợp IconNam & IconNu */}
      {(categoryFilter === 'all' || categoryFilter === 'seating_chart') && (
        <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white p-5 rounded-2xl border border-indigo-700/60 shadow-md space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-indigo-800/80">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-indigo-600 text-white text-[10px] font-extrabold uppercase">
                Mẫu Sơ Đồ Chuẩn
              </span>
              <h3 className="text-sm font-bold text-white">
                Sơ Đồ Lớp Học Drag & Drop Sử Dụng IconNam & IconNu
              </h3>
            </div>
            <span className="text-[11px] text-indigo-200 font-mono">
              Chương 1 / Bài 1 / Vấn đề 1 / Chuyên đề: Bố trí chỗ ngồi
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Hệ thống hỗ trợ tự động phân biệt icon học sinh nam (<strong>IconNam</strong> - tóc ngắn cổ áo) và học sinh nữ (<strong>IconNu</strong> - tóc dài nơ cổ) trên toàn bộ sơ đồ lớp học:
          </p>

          <div className="flex flex-wrap items-center gap-4 p-3 bg-slate-950/80 rounded-xl border border-indigo-800/50 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center">
                <IconNam className="w-7 h-7 text-indigo-400" />
              </div>
              <div>
                <strong className="block text-white text-[11px]">IconNam</strong>
                <span className="text-[10px] text-slate-400">Học sinh Nam</span>
              </div>
            </div>

            <div className="flex items-center gap-2 border-l border-slate-800 pl-4">
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center">
                <IconNu className="w-7 h-7 text-pink-400" />
              </div>
              <div>
                <strong className="block text-white text-[11px]">IconNu</strong>
                <span className="text-[10px] text-slate-400">Học sinh Nữ</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Documents Grid */}
      {filteredDocs.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <Folder className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">
            {searchTerm || categoryFilter !== 'all' ? 'Không Tìm Thấy Tài Liệu Phù Hợp' : 'Toàn Bộ Tài Liệu Demo Đã Được Làm Sạch'}
          </h3>
          <p className="text-xs text-slate-500 max-w-lg mx-auto leading-relaxed">
            Hệ thống tủ sách giáo viên đang ở trạng thái sạch 100%. Bấm nút <strong>"Tạo bộ tài liệu mới"</strong> ở góc phải phía trên để bắt đầu tạo giáo án, tài liệu và đồng bộ lên Google Drive cá nhân theo cấu trúc 4 cấp độ.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredDocs.map(docItem => (
            <div
              key={docItem.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between space-y-4 hover:border-indigo-200 transition-all"
            >
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700">
                    {docItem.subject} • {docItem.grade}
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {docItem.fileSize}
                  </span>
                </div>

                {docItem.driveSynced ? (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                    <Cloud className="w-3 h-3" /> Drive đã lưu
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-400">Chưa lưu Drive</span>
                )}
              </div>

              {/* 4-level hierarchy breadcrumb badge */}
              <div className="p-2 bg-slate-50/80 rounded-lg border border-slate-100 text-[10px] space-y-1">
                <div className="flex items-center gap-1 font-mono text-slate-600 overflow-x-auto">
                  <span className="font-bold text-slate-800">{docItem.chuong || 'Chương 1'}</span>
                  <span>/</span>
                  <span className="text-slate-700">{docItem.bai || 'Bài 1'}</span>
                  <span>/</span>
                  <span className="text-slate-700">{docItem.vanDe || 'Vấn đề 1'}</span>
                  <span>/</span>
                  <span className="font-bold text-indigo-700 bg-indigo-50 px-1 py-0.5 rounded">{docItem.chuyenDe || 'Chuyên đề'}</span>
                </div>
                {docItem.driveFolderPath && (
                  <div className="text-[9px] text-slate-400 font-mono truncate" title={docItem.driveFolderPath}>
                    📁 Drive: {docItem.driveFolderPath}
                  </div>
                )}
              </div>

              <h3 className="font-bold text-slate-900 text-sm leading-snug">
                {docItem.title}
              </h3>

              <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                {docItem.contentSnippet}
              </p>
            </div>

            {/* Publishing to Classes Control */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Phát hành bài giảng đến lớp:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {classes.map(cls => {
                  const isPub = docItem.publishedToClasses.includes(cls.id);

                  return (
                    <button
                      key={cls.id}
                      onClick={() => handleTogglePublish(docItem.id, cls.id)}
                      className={`text-xs px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                        isPub
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {isPub ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                      <span>{cls.code}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Actions: Save to Drive & Preview */}
            <div className="pt-2 flex items-center justify-between text-xs">
              <span className="text-slate-400 text-[11px]">
                Cập nhật: {docItem.updatedAt}
              </span>

              <div className="flex items-center gap-2">
                <button
                  id={`btn-sync-doc-${docItem.id}`}
                  onClick={() => handleSaveToDrive(docItem)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer"
                  title="Lưu vào Drive theo cấu trúc: Chương -> Bài -> Vấn đề -> Chuyên đề"
                >
                  <Cloud className="w-3.5 h-3.5" />
                  <span>{docItem.driveSynced ? 'Cập nhật Drive' : 'Lưu Drive cá nhân'}</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      )}

      {/* Modal Soạn bài mới với cấu trúc Chương -> Bài -> Vấn đề -> Chuyên đề */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-sm text-slate-900">Tạo Bộ Tài Liệu Dạy Học & Lưu Drive</h3>
                <span className="text-[11px] text-slate-500">Cấu trúc: Chương ➔ Bài ➔ Vấn đề ➔ Chuyên đề</span>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateDocument} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase">
                  Tiêu đề bộ tài liệu / Tên giáo án
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Giáo án & Hệ thống bài tập Chuyên đề Hình học Oxy..."
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-semibold text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 uppercase">Môn học</label>
                  <select
                    value={newSubject}
                    onChange={e => setNewSubject(e.target.value)}
                    className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  >
                    <option value="Toán Học">Toán Học</option>
                    <option value="Vật Lý">Vật Lý</option>
                    <option value="Hóa Học">Hóa Học</option>
                    <option value="Ngữ Văn">Ngữ Văn</option>
                    <option value="Tiếng Anh">Tiếng Anh</option>
                    <option value="Sinh Học">Sinh Học</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1 uppercase">Khối lớp</label>
                  <select
                    value={newGrade}
                    onChange={e => setNewGrade(e.target.value)}
                    className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  >
                    <option value="Khối 10">Khối 10</option>
                    <option value="Khối 11">Khối 11</option>
                    <option value="Khối 12">Khối 12</option>
                  </select>
                </div>
              </div>

              {/* 4-level hierarchy inputs */}
              <div className="p-3.5 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-2.5">
                <span className="block font-bold text-indigo-950 uppercase text-[10px] tracking-wider">
                  Cấu Trúc Phân Cấp Lưu Trữ Drive (Bắt Buộc)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">1. Chương</label>
                    <input
                      type="text"
                      required
                      placeholder="VD: Chương 1: Mệnh đề & Tập hợp"
                      value={newChuong}
                      onChange={e => setNewChuong(e.target.value)}
                      className="w-full py-1.5 px-2.5 bg-white border border-indigo-200 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">2. Bài</label>
                    <input
                      type="text"
                      required
                      placeholder="VD: Bài 2: Tập hợp và phép toán"
                      value={newBai}
                      onChange={e => setNewBai(e.target.value)}
                      className="w-full py-1.5 px-2.5 bg-white border border-indigo-200 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">3. Vấn đề</label>
                    <input
                      type="text"
                      required
                      placeholder="VD: Vấn đề 1: Giao và hợp của tập con"
                      value={newVanDe}
                      onChange={e => setNewVanDe(e.target.value)}
                      className="w-full py-1.5 px-2.5 bg-white border border-indigo-200 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">4. Chuyên đề</label>
                    <input
                      type="text"
                      required
                      placeholder="VD: Chuyên đề: Tìm m để A giao B khác rỗng"
                      value={newChuyenDe}
                      onChange={e => setNewChuyenDe(e.target.value)}
                      className="w-full py-1.5 px-2.5 bg-white border border-indigo-200 rounded-lg text-xs"
                    />
                  </div>
                </div>

                {/* Live Drive Path Preview */}
                <div className="pt-1 text-[10px] text-indigo-700 flex items-center gap-1 font-mono">
                  <Cloud className="w-3 h-3 text-indigo-600 shrink-0" />
                  <span className="truncate">
                    Drive của tôi / LopU_TaiLieuDayHoc / {newSubject} / {newChuong} / {newBai} / {newVanDe} / {newChuyenDe}
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase">Tóm tắt nội dung bài soạn</label>
                <textarea
                  rows={2}
                  placeholder="Mô tả các dạng toán trọng tâm, bài tập mẫu và hướng dẫn học sinh..."
                  value={newSnippet}
                  onChange={e => setNewSnippet(e.target.value)}
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl font-normal"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Cloud className="w-3.5 h-3.5" />
                  <span>Tạo & Lưu Drive</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
