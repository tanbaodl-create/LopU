import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  FileSpreadsheet,
  Download,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Search,
  Users,
  ShieldCheck,
  Lock,
  Crown,
  BookOpen,
  GraduationCap,
  HeartHandshake,
  User,
  Sparkles,
  MapPin,
  Edit3,
  Check,
  X,
  Navigation,
  ExternalLink,
  Eye,
  ChevronDown,
  ChevronUp,
  Info,
  Building,
  Phone,
  Home,
  Briefcase,
  Tag,
  Award,
  Filter,
} from 'lucide-react';
import { UserProfile, UserRole, SUPERADMIN_EMAILS } from '../../../services/storageTypes';
import {
  getUsers,
  saveUser,
  deleteUser,
  importUsersWithDeduplication,
} from '../../ConnectData/ConnectFirestore';
import { UserProfileModal } from './components/UserProfileModal';

export interface ExtendedUserProfile extends UserProfile {
  nickname?: string;
  gps?: string;
  gpsAddress?: string;
  isApproved?: boolean;
}

interface AdminImportReport {
  totalProcessed: number;
  added: number;
  skipped: number;
  updated: number;
}

export const QuanLyNguoiDungView: React.FC = () => {
  const [users, setUsers] = useState<ExtendedUserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Bộ lọc đa tiêu chí
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [classTitleFilter, setClassTitleFilter] = useState<string>('all');
  const [gpsFilter, setGpsFilter] = useState<string>('all'); // all | has_gps | no_gps

  const [notification, setNotification] = useState<string | null>(null);
  const [report, setReport] = useState<AdminImportReport | null>(null);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manual Add Modal - Standardized 14 Fields
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>(''); // 1. Họ và Tên
  const [newNickname, setNewNickname] = useState<string>(''); // 2. Biệt Danh
  const [newGender, setNewGender] = useState<string>('Nam'); // 3. Giới tính
  const [newWorkplace, setNewWorkplace] = useState<string>(''); // 4. Nơi công tác/học tập
  const [newEmail, setNewEmail] = useState<string>(''); // 5. Google Email
  const [newRole, setNewRole] = useState<UserRole>('student'); // 6. Vai trò chính
  const [newStudentCode, setNewStudentCode] = useState<string>(''); // Mã HS/NV
  const [newAssignedSubject, setNewAssignedSubject] = useState<string>(''); // Môn phụ trách nếu là QL
  const [newPhone, setNewPhone] = useState<string>(''); // 8. SĐT
  const [newHomeAddress, setNewHomeAddress] = useState<string>(''); // 9. Địa chỉ nhà
  const [newClassIds, setNewClassIds] = useState<string>('10A1, 10A2'); // 10. Các Lớp dạy/học
  const [newSubjects, setNewSubjects] = useState<string>('Toán Học, Vật Lý'); // 11. Các môn dạy/học
  const [newManagedSubjects, setNewManagedSubjects] = useState<string>('Toán Học'); // 12. Môn quản lý
  const [newGroupOrTeam, setNewGroupOrTeam] = useState<string>('Tổ 1'); // 13. Phân nhóm/tổ
  const [newClassTitle, setNewClassTitle] = useState<string>('LT'); // 14. Chức danh trong lớp (LT, PHT, VTM, PLĐ, CĐ, BT, PBT, UV, TT, TP)

  // Chỉnh sửa Tên (Chỉ Quản lý / Quản trị mới sửa được)
  const [editingNameUserId, setEditingNameUserId] = useState<string | null>(null);
  const [editingNameValue, setEditingNameValue] = useState<string>('');

  // Chỉnh sửa Biệt danh (Cá nhân tự sửa được)
  const [editingNicknameUserId, setEditingNicknameUserId] = useState<string | null>(null);
  const [editingNicknameValue, setEditingNicknameValue] = useState<string>('');

  // Modal Google Maps chọn tọa độ GPS
  const [gpsModalUser, setGpsModalUser] = useState<ExtendedUserProfile | null>(null);
  const [selectedLat, setSelectedLat] = useState<number>(21.028511);
  const [selectedLng, setSelectedLng] = useState<number>(105.854444);
  const [selectedAddress, setSelectedAddress] = useState<string>('Hà Nội, Việt Nam');
  const [mapType, setMapType] = useState<'roadmap' | 'satellite'>('roadmap');

  // Mở rộng hiển thị trực tiếp dòng & Modal Xem/Sửa trọn bộ 14 trường thông tin
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [detailModalUser, setDetailModalUser] = useState<ExtendedUserProfile | null>(null);

  const loadData = async () => {
    const data = (await getUsers()) as ExtendedUserProfile[];
    const superUsers = data.filter(u => isSuperadminProtected(u));
    const nonSuperUsers = data.filter(u => !isSuperadminProtected(u));

    if (nonSuperUsers.length > 0) {
      for (const u of nonSuperUsers) {
        try {
          await deleteUser(u.id);
        } catch (e) {
          // bỏ qua lỗi
        }
      }
    }

    const standardizedSuperUsers = superUsers.map(u => ({
      ...u,
      nickname: u.nickname || (u.email.includes('bg') ? 'Bảo Bắc Giang' : 'Bảo Đà Lạt'),
      isApproved: true,
      gps: u.gps || (u.email.includes('bg') ? '21.273099, 106.194602' : '11.940419, 108.458313'),
    }));

    localStorage.setItem('lopu_demo_cleaned', 'true');
    setUsers(standardizedSuperUsers);
  };

  useEffect(() => {
    loadData();
  }, []);

  const isSuperadminProtected = (user: UserProfile) => {
    return user.isProtected || SUPERADMIN_EMAILS.some(e => e.toLowerCase() === user.email.toLowerCase());
  };

  const handleClearDemoUsers = async () => {
    if (
      !confirm(
        'Bạn có chắc chắn muốn xóa toàn bộ dữ liệu người dùng demo? Toàn bộ tài khoản thử nghiệm sẽ bị xóa sạch, chỉ giữ lại 2 tài khoản Superadmin vĩnh viễn.'
      )
    ) {
      return;
    }

    try {
      localStorage.setItem('lopu_demo_cleaned', 'true');
      const nonSuperUsers = users.filter(u => !isSuperadminProtected(u));
      for (const u of nonSuperUsers) {
        try {
          await deleteUser(u.id);
        } catch (e) {
          // Bỏ qua lỗi từng item
        }
      }
      const kept = users.filter(u => isSuperadminProtected(u));
      setUsers(kept);
      setNotification('Đã làm sạch toàn bộ tài khoản demo! Hệ thống chỉ còn 2 Superadmin.');
      setTimeout(() => setNotification(null), 5000);
    } catch (err: any) {
      alert(err?.message || 'Có lỗi khi xóa dữ liệu demo');
    }
  };

  const handleDeleteUser = async (user: UserProfile) => {
    if (isSuperadminProtected(user)) {
      alert(`Tài khoản Superadmin [${user.email}] được bảo vệ vĩnh viễn, không thể xóa khỏi app!`);
      return;
    }

    if (confirm(`Bạn có chắc chắn muốn xóa tài khoản người dùng [${user.name} - ${user.email}]?`)) {
      try {
        await deleteUser(user.id);
        setUsers(prev => prev.filter(u => u.id !== user.id));
        setNotification('Đã xóa người dùng khỏi hệ thống Firestore.');
        setTimeout(() => setNotification(null), 3000);
      } catch (err: any) {
        alert(err?.message || 'Không thể xóa tài khoản người dùng này.');
      }
    }
  };

  const handleSaveName = async (user: ExtendedUserProfile) => {
    if (!editingNameValue.trim()) return;
    const updated: ExtendedUserProfile = {
      ...user,
      name: editingNameValue.trim(),
    };
    await saveUser(updated);
    setUsers(users.map(u => (u.id === user.id ? updated : u)));
    setEditingNameUserId(null);
    setNotification(`Quản trị đã cập nhật Họ và Tên thành: "${updated.name}"`);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSaveNickname = async (user: ExtendedUserProfile) => {
    const updated: ExtendedUserProfile = {
      ...user,
      nickname: editingNicknameValue.trim() || undefined,
    };
    await saveUser(updated);
    setUsers(users.map(u => (u.id === user.id ? updated : u)));
    setEditingNicknameUserId(null);
    setNotification(`Cá nhân đã cập nhật Biệt danh thành công: "${updated.nickname || 'Chưa đặt'}"`);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleApproveRole = async (user: ExtendedUserProfile, targetRole: UserRole) => {
    const updated: ExtendedUserProfile = {
      ...user,
      role: targetRole,
      roles: user.roles && user.roles.length > 0 ? user.roles : [targetRole],
      isApproved: true,
    };
    await saveUser(updated);
    setUsers(users.map(u => (u.id === user.id ? updated : u)));
    setNotification(`Đã duyệt vai trò [${targetRole}] cho "${user.name}".`);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleOpenGpsModal = (user: ExtendedUserProfile) => {
    setGpsModalUser(user);
    if (user.gps) {
      const parts = user.gps.split(',').map(p => parseFloat(p.trim()));
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        setSelectedLat(parts[0]);
        setSelectedLng(parts[1]);
        setSelectedAddress(user.gpsAddress || `Tọa độ: ${parts[0].toFixed(5)}, ${parts[1].toFixed(5)}`);
        return;
      }
    }
    setSelectedLat(21.028511);
    setSelectedLng(105.854444);
    setSelectedAddress('Trường học / Điểm chỉ định');
  };

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const width = rect.width;
    const height = rect.height;

    const latSpan = 14.8;
    const lngSpan = 7.4;
    const newLat = 23.3 - (y / height) * latSpan;
    const newLng = 102.1 + (x / width) * lngSpan;

    setSelectedLat(parseFloat(newLat.toFixed(6)));
    setSelectedLng(parseFloat(newLng.toFixed(6)));
    setSelectedAddress(`Điểm đã chọn (${newLat.toFixed(4)}°B, ${newLng.toFixed(4)}°Đ)`);
  };

  const handleGetDeviceLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          setSelectedLat(parseFloat(pos.coords.latitude.toFixed(6)));
          setSelectedLng(parseFloat(pos.coords.longitude.toFixed(6)));
          setSelectedAddress('Vị trí GPS thiết bị thực tế');
        },
        () => {
          alert('Không thể truy cập GPS thiết bị. Vui lòng click chọn trực tiếp trên bản đồ.');
        }
      );
    } else {
      alert('Trình duyệt không hỗ trợ Geolocation.');
    }
  };

  const handleSearchQuickPlace = (placeName: string, lat: number, lng: number) => {
    setSelectedLat(lat);
    setSelectedLng(lng);
    setSelectedAddress(placeName);
  };

  const handleConfirmGps = async () => {
    if (!gpsModalUser) return;
    const coordsStr = `${selectedLat.toFixed(6)}, ${selectedLng.toFixed(6)}`;
    const updated: ExtendedUserProfile = {
      ...gpsModalUser,
      gps: coordsStr,
      gpsAddress: selectedAddress,
    };
    await saveUser(updated);
    setUsers(users.map(u => (u.id === gpsModalUser.id ? updated : u)));
    if (detailModalUser && detailModalUser.id === gpsModalUser.id) {
      setDetailModalUser(updated);
    }
    setGpsModalUser(null);
    setNotification(`Hệ thống đã lấy thành công tọa độ GPS tại vị trí chọn trên bản đồ: [${coordsStr}] cho "${updated.name}"!`);
    setTimeout(() => setNotification(null), 4000);
  };

  // Thêm mới thủ công + Kiểm tra Regex
  const handleAddManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) return;

    // Regex Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail.trim())) {
      alert('Email Google không đúng định dạng chuẩn (ví dụ: user@gmail.com).');
      return;
    }

    // Regex Phone (nếu có)
    if (newPhone.trim()) {
      const phoneRegex = /^(\+84|0)[0-9]{9,10}$/;
      if (!phoneRegex.test(newPhone.trim().replace(/[\s-]/g, ''))) {
        alert('Số điện thoại không đúng định dạng (cần bắt đầu bằng 0 hoặc +84 và gồm 10-11 chữ số).');
        return;
      }
    }

    const existingEmail = users.find(u => u.email.toLowerCase() === newEmail.trim().toLowerCase());
    if (existingEmail) {
      alert(`Email "${newEmail.trim()}" đã tồn tại trong hệ thống! Không thể tạo trùng lặp.`);
      return;
    }

    const isSuperadmin = SUPERADMIN_EMAILS.some(e => e.toLowerCase() === newEmail.trim().toLowerCase());
    const finalRole: UserRole = isSuperadmin ? 'superadmin' : newRole;

    const parsedSubjects = newSubjects.split(',').map(s => s.trim()).filter(Boolean);
    const parsedManagedSubjects = newManagedSubjects
      .split(',')
      .map(s => s.trim())
      .filter(s => parsedSubjects.includes(s) || parsedSubjects.length === 0);

    const newUser: ExtendedUserProfile = {
      id: `u_${Date.now()}`,
      name: newName.trim(),
      nickname: newNickname.trim() || undefined,
      gender: newGender,
      workplace: newWorkplace.trim() || undefined,
      email: newEmail.trim(),
      role: finalRole,
      roles: [finalRole],
      gps: isSuperadmin ? '21.028511, 105.854444' : '',
      phone: newPhone.trim() || '0901234567',
      homeAddress: newHomeAddress.trim() || undefined,
      classIds: newClassIds.split(',').map(c => c.trim()).filter(Boolean),
      subjects: parsedSubjects,
      managedSubjects: parsedManagedSubjects,
      groupOrTeam: newGroupOrTeam.trim() || undefined,
      classTitle: newClassTitle.trim() || 'Thành viên',
      classTitles: [newClassTitle.trim() || 'Thành viên'],
      isProtected: isSuperadmin,
      isApproved: finalRole !== 'guest',
    };

    await saveUser(newUser);
    setUsers([newUser, ...users]);
    setShowAddModal(false);
    setNewName('');
    setNewNickname('');
    setNewEmail('');
    setNewWorkplace('');
    setNewHomeAddress('');
    setNotification(`Đã tạo tài khoản "${newUser.name}" [${finalRole}] chuẩn hóa 14 trường thành công.`);
    setTimeout(() => setNotification(null), 4000);
  };

  // Xuất file Excel (.xlsx) 14 trường thông tin
  const handleExportExcel14Fields = () => {
    const exportData = filteredUsers.map(u => ({
      '1. Họ và Tên': u.name,
      '2. Biệt Danh': u.nickname || '',
      '3. Giới Tính': u.gender || 'Nam',
      '4. Nơi Công Tác/Học Tập': u.workplace || '',
      '5. Google Email': u.email,
      '6. Vai Trò': u.roles && u.roles.length > 0 ? u.roles.join(', ') : u.role || 'guest',
      '7. GPS': u.gps || '',
      '8. Số Điện Thoại': u.phone || '',
      '9. Địa Chỉ Nhà': u.homeAddress || '',
      '10. Các Lớp Dạy/Học': u.classIds?.join(', ') || '',
      '11. Các Môn Dạy/Học': u.subjects?.join(', ') || '',
      '12. Môn Quản Lý': u.managedSubjects?.join(', ') || '',
      '13. Phân Nhóm/Tổ': u.groupOrTeam || '',
      '14. Chức Danh Trong Lớp': u.classTitles && u.classTitles.length > 0 ? u.classTitles.join(', ') : u.classTitle || 'Thành viên',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'NguoiDung14Truong');
    XLSX.writeFile(workbook, `LopU_DanhSach_NguoiDung_14Truong_${Date.now()}.xlsx`);
  };

  // Tải file Excel mẫu (.xlsx) 14 trường
  const handleDownloadSampleTemplate = () => {
    const sampleData = [
      {
        '1. Họ và Tên': 'Nguyễn Văn An',
        '2. Biệt Danh': 'AnGV',
        '3. Giới Tính': 'Nam',
        '4. Nơi Công Tác/Học Tập': 'THPT Chuyên',
        '5. Google Email': 'nguyenvanan@lopu.edu.vn',
        '6. Vai Trò': 'teacher, manager',
        '7. GPS': '21.028511, 105.854444',
        '8. Số Điện Thoại': '0901111222',
        '9. Địa Chỉ Nhà': '123 Đường Lê Lợi, Hà Nội',
        '10. Các Lớp Dạy/Học': '10A1, 10A2',
        '11. Các Môn Dạy/Học': 'Toán Học, Vật Lý',
        '12. Môn Quản Lý': 'Toán Học',
        '13. Phân Nhóm/Tổ': 'Tổ Tự Nhiên',
        '14. Chức Danh Trong Lớp': 'LT, Ban Cán Sự Môn',
      },
      {
        '1. Họ và Tên': 'Lê Minh Khang',
        '2. Biệt Danh': 'KhangKhang',
        '3. Giới Tính': 'Nam',
        '4. Nơi Công Tác/Học Tập': 'Lớp 10A1',
        '5. Google Email': 'khang.le@student.lopu.edu.vn',
        '6. Vai Trò': 'student',
        '7. GPS': '21.030000, 105.850000',
        '8. Số Điện Thoại': '0903333444',
        '9. Địa Chỉ Nhà': '45 Phố Huế, Hà Nội',
        '10. Các Lớp Dạy/Học': '10A1',
        '11. Các Môn Dạy/Học': 'Toán Học, Vật Lý, Hóa Học',
        '12. Môn Quản Lý': '',
        '13. Phân Nhóm/Tổ': 'Tổ 1',
        '14. Chức Danh Trong Lớp': 'LT, PHT',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Mau14Truong');
    XLSX.writeFile(workbook, 'LopU_Mau_Excel_14Truong_NguoiDung.xlsx');
  };

  // Import Excel (.xlsx / .xls / .csv) 14 trường
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheet = workbook.SheetNames[0];
      const sheet = workbook.Sheets[firstSheet];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      const imported: ExtendedUserProfile[] = [];
      for (const row of rows) {
        const email = String(
          row['5. Google Email'] || row['Google Email'] || row['Email'] || row['email'] || ''
        ).trim();
        if (!email || !email.includes('@')) continue;

        const name = String(
          row['1. Họ và Tên'] || row['Họ và Tên'] || row['Tên'] || row['Name'] || email.split('@')[0]
        ).trim();
        const nickname = String(row['2. Biệt Danh'] || row['Biệt Danh'] || '').trim();
        const gender = String(row['3. Giới Tính'] || row['Giới Tính'] || 'Nam').trim();
        const workplace = String(row['4. Nơi Công Tác/Học Tập'] || row['Nơi Công Tác/Học Tập'] || '').trim();

        const roleStr = String(row['6. Vai Trò'] || row['Vai Trò'] || 'student').trim().toLowerCase();
        const rolesArr = roleStr.split(',').map(r => r.trim() as UserRole).filter(Boolean);
        const primaryRole = rolesArr[0] || 'student';

        const gps = String(row['7. GPS'] || row['7. Tọa Độ GPS'] || row['Tọa Độ GPS'] || row['GPS'] || '').trim();
        const phone = String(row['8. Số Điện Thoại'] || row['Số Điện Thoại'] || row['SĐT'] || '').trim();
        const homeAddress = String(row['9. Địa Chỉ Nhà'] || row['Địa Chỉ Nhà'] || '').trim();

        const classIdsStr = String(row['10. Các Lớp Dạy/Học'] || row['Các Lớp Dạy/Học'] || '').trim();
        const classIds = classIdsStr ? classIdsStr.split(',').map(s => s.trim()).filter(Boolean) : [];

        const subjectsStr = String(row['11. Các Môn Dạy/Học'] || row['Các Môn Dạy/Học'] || '').trim();
        const subjects = subjectsStr ? subjectsStr.split(',').map(s => s.trim()).filter(Boolean) : [];

        const managedSubjectsStr = String(row['12. Môn Quản Lý'] || row['Môn Quản Lý'] || '').trim();
        const managedSubjects = managedSubjectsStr ? managedSubjectsStr.split(',').map(s => s.trim()).filter(Boolean) : [];

        const groupOrTeam = String(row['13. Phân Nhóm/Tổ'] || row['Phân Nhóm/Tổ'] || '').trim();

        const classTitlesStr = String(row['14. Chức Danh Trong Lớp'] || row['Chức Danh Trong Lớp'] || 'Thành viên').trim();
        const classTitles = classTitlesStr ? classTitlesStr.split(',').map(s => s.trim()).filter(Boolean) : ['Thành viên'];

        imported.push({
          id: `u_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name,
          nickname: nickname || undefined,
          gender: gender || 'Nam',
          workplace: workplace || undefined,
          email,
          role: primaryRole,
          roles: rolesArr.length > 0 ? rolesArr : [primaryRole],
          gps: gps || undefined,
          phone: phone || undefined,
          homeAddress: homeAddress || undefined,
          classIds,
          subjects,
          managedSubjects,
          groupOrTeam: groupOrTeam || undefined,
          classTitle: classTitles.join(', '),
          classTitles,
          isApproved: true,
        });
      }

      if (imported.length > 0) {
        let addedCount = 0;
        let updatedCount = 0;
        let skippedCount = 0;

        for (const item of imported) {
          const existing = users.find(u => u.email.toLowerCase() === item.email.toLowerCase());
          if (existing) {
            if (isSuperadminProtected(existing)) {
              skippedCount++;
              continue;
            }
            const updated = { ...existing, ...item, id: existing.id };
            await saveUser(updated);
            updatedCount++;
          } else {
            await saveUser(item);
            addedCount++;
          }
        }

        setReport({
          totalProcessed: imported.length,
          added: addedCount,
          skipped: skippedCount,
          updated: updatedCount,
        });
        await loadData();
        setNotification(`Đã import ${imported.length} tài khoản từ file Excel (Thêm mới: ${addedCount}, Cập nhật: ${updatedCount}, Bỏ qua: ${skippedCount}).`);
      } else {
        setNotification('Không tìm thấy dòng dữ liệu tài khoản hợp lệ trong file Excel.');
      }
    } catch (err) {
      console.error(err);
      setNotification('Lỗi khi đọc file Excel. Vui lòng kiểm tra định dạng file.');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setTimeout(() => setNotification(null), 6000);
    }
  };

  // Các danh sách tùy chọn động cho bộ lọc
  const availableClassOptions = Array.from(
    new Set(users.flatMap(u => u.classIds || []).filter(Boolean))
  );

  const availableSubjectOptions = Array.from(
    new Set(users.flatMap(u => [...(u.subjects || []), ...(u.managedSubjects || [])]).filter(Boolean))
  );

  const availableTitleOptions = [
    'Thành viên',
    'LT',
    'PHT',
    'VTM',
    'PLĐ',
    'CĐ',
    'BT',
    'PBT',
    'UV',
    'TT',
    'TP',
    'Ban Cán Sự Môn',
  ];

  // Lọc đa tiêu chí
  const filteredUsers = users.filter(u => {
    // 1. Tìm kiếm chuỗi
    const matchSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.nickname && u.nickname.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (u.studentCode && u.studentCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (u.phone && u.phone.includes(searchTerm));

    // 2. Lọc Vai trò
    const userRoles = u.roles && u.roles.length > 0 ? u.roles : [u.role];
    const matchRole = roleFilter === 'all' || userRoles.includes(roleFilter as UserRole);

    // 3. Lọc Lớp
    const matchClass =
      classFilter === 'all' ||
      (u.classIds && u.classIds.some(c => c.toLowerCase() === classFilter.toLowerCase()));

    // 4. Lọc Môn học
    const matchSubject =
      subjectFilter === 'all' ||
      (u.subjects && u.subjects.some(s => s.toLowerCase() === subjectFilter.toLowerCase())) ||
      (u.managedSubjects && u.managedSubjects.some(s => s.toLowerCase() === subjectFilter.toLowerCase()));

    // 5. Lọc Chức danh trong lớp
    const userTitles =
      u.classTitles && u.classTitles.length > 0
        ? u.classTitles
        : u.classTitle
        ? u.classTitle.split(',').map(s => s.trim())
        : [];
    const matchTitle = classTitleFilter === 'all' || userTitles.includes(classTitleFilter);

    // 6. Lọc Trạng thái GPS
    const hasGps = Boolean(u.gps && u.gps.trim().length > 0);
    const matchGps =
      gpsFilter === 'all' || (gpsFilter === 'has_gps' ? hasGps : !hasGps);

    return matchSearch && matchRole && matchClass && matchSubject && matchTitle && matchGps;
  });

  return (
    <div id="settings-users-view" className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Deduplication Report Banner */}
      {report && (
        <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-indigo-900 text-sm">
              Báo Cáo Kiểm Tra & Tránh Trùng Lặp Tài Khoản Excel
            </span>
            <button
              onClick={() => setReport(null)}
              className="text-slate-400 hover:text-slate-700 font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-slate-700">
            <div className="bg-white p-2.5 rounded-xl border border-indigo-100">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Tổng số dòng</span>
              <span className="text-base font-extrabold text-slate-800">{report.totalProcessed}</span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
              <span className="text-[10px] text-emerald-600 uppercase font-bold block">Tài khoản mới</span>
              <span className="text-base font-extrabold text-emerald-600">+{report.added}</span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-blue-100">
              <span className="text-[10px] text-blue-600 uppercase font-bold block">Cập nhật (Đã có)</span>
              <span className="text-base font-extrabold text-blue-600">{report.updated}</span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-amber-100">
              <span className="text-[10px] text-amber-600 uppercase font-bold block">Bỏ qua (Lỗi/Trống)</span>
              <span className="text-base font-extrabold text-amber-600">{report.skipped}</span>
            </div>
          </div>
        </div>
      )}

      {/* Top Action Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                Quản Lý Người Dùng & Phân Quyền Vai Trò
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                <Crown className="w-3 h-3 text-amber-600" />
                <span>Google Auth Firestore</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Khóa chính định danh là tài khoản Google (Email/UID). Hai tài khoản Superadmin{' '}
              <strong className="text-amber-700 font-mono font-semibold">tanbaobg@gmail.com</strong> và{' '}
              <strong className="text-amber-700 font-mono font-semibold">tanbaodl@gmail.com</strong> được bảo vệ vĩnh viễn.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Export Excel (14 Fields) */}
            <button
              id="btn-export-excel-14fields"
              onClick={handleExportExcel14Fields}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs transition-colors cursor-pointer"
              title="Xuất file Excel (.xlsx) đầy đủ 14 trường thông tin người dùng"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Xuất Excel 14 Trường</span>
            </button>

            {/* Download Sample File */}
            <button
              id="btn-download-sample-excel"
              onClick={handleDownloadSampleTemplate}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Mẫu Excel Import</span>
            </button>

            {/* Hidden File Input for Import */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".xlsx, .xls, .csv, text/csv"
              className="hidden"
            />

            {/* Import Excel Trigger Button */}
            <button
              id="btn-import-excel"
              disabled={isImporting}
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>{isImporting ? 'Đang đọc...' : 'Nhập Excel'}</span>
            </button>

            {/* Manual Add Button */}
            <button
              id="btn-add-user-manual"
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm tài khoản</span>
            </button>

            {/* Clear Demo Users Button */}
            <button
              id="btn-clear-demo-users"
              onClick={handleClearDemoUsers}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors cursor-pointer"
              title="Xóa toàn bộ người dùng thử nghiệm"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Xóa demo</span>
            </button>
          </div>
        </div>

        {/* Roles overview pill banner */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] grid grid-cols-1 md:grid-cols-4 gap-2 text-slate-600">
          <div className="flex items-center gap-1.5">
            <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span><strong>Superadmin</strong>: Không thể xóa, toàn quyền</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-600 shrink-0" />
            <span><strong>Quản trị</strong>: Toàn quyền trong app</span>
          </div>
          <div className="flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span><strong>Quản lý</strong>: Quyền như quản trị môn đó</span>
          </div>
          <div className="flex items-center gap-1.5">
            <GraduationCap className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span><strong>Giáo viên</strong>: Mở lớp, thêm/xóa HS, Drive giáo án</span>
          </div>
        </div>
      </div>

      {/* BỘ LỌC ĐA TIÊU CHÍ (MULTI-CRITERIA FILTER BAR) */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
            <Filter className="w-4 h-4 text-indigo-600" />
            Bộ Lọc Đa Tiêu Chí Người Dùng
          </span>
          <span className="text-[11px] font-semibold text-slate-500">
            Hiển thị <strong className="text-indigo-600">{filteredUsers.length}</strong> / {users.length} tài khoản
          </span>
        </div>

        {/* Bảng chọn lọc đa tiêu chí */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2 text-xs">
          {/* Lọc Vai trò */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
              Vai Trò System
            </label>
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              className="w-full py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-700"
            >
              <option value="all">Tất cả vai trò</option>
              <option value="superadmin">Superadmin</option>
              <option value="admin">Quản trị viên</option>
              <option value="manager">Quản lý môn</option>
              <option value="teacher">Giáo viên</option>
              <option value="assistant">Trợ giảng</option>
              <option value="student">Học sinh</option>
              <option value="parent">Phụ huynh</option>
              <option value="guest">Khách</option>
            </select>
          </div>

          {/* Lọc Lớp */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
              Lớp Dạy / Học
            </label>
            <select
              value={classFilter}
              onChange={e => setClassFilter(e.target.value)}
              className="w-full py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-700"
            >
              <option value="all">Tất cả các Lớp</option>
              {availableClassOptions.map(c => (
                <option key={c} value={c}>
                  Lớp: {c}
                </option>
              ))}
            </select>
          </div>

          {/* Lọc Môn học */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
              Môn Dạy / Học / QL
            </label>
            <select
              value={subjectFilter}
              onChange={e => setSubjectFilter(e.target.value)}
              className="w-full py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-700"
            >
              <option value="all">Tất cả các Môn</option>
              {availableSubjectOptions.map(s => (
                <option key={s} value={s}>
                  Môn: {s}
                </option>
              ))}
            </select>
          </div>

          {/* Lọc Chức danh */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
              Chức Danh Trong Lớp
            </label>
            <select
              value={classTitleFilter}
              onChange={e => setClassTitleFilter(e.target.value)}
              className="w-full py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-700"
            >
              <option value="all">Tất cả chức danh</option>
              {availableTitleOptions.map(t => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Lọc Trạng thái GPS */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
              Trạng Thái GPS
            </label>
            <select
              value={gpsFilter}
              onChange={e => setGpsFilter(e.target.value)}
              className="w-full py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-700"
            >
              <option value="all">Tất cả GPS</option>
              <option value="has_gps">Đã có tọa độ GPS</option>
              <option value="no_gps">Chưa có GPS</option>
            </select>
          </div>
        </div>

        {/* Thanh Tìm kiếm nhanh */}
        <div className="relative w-full pt-1">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3.5" />
          <input
            type="text"
            placeholder="Tìm theo Tên, Biệt danh, Email Google, Số điện thoại, Mã số..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50/60 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Danh Sách Tài Khoản Người Dùng ({filteredUsers.length} kết quả)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Tên & Biệt Danh</th>
                <th className="py-3 px-4">Google Email</th>
                <th className="py-3 px-4">Các Vai Trò System</th>
                <th className="py-3 px-4">GPS</th>
                <th className="py-3 px-4">Chức Danh Trong Lớp</th>
                <th className="py-3 px-4 text-center">Chi tiết 14 Trường & Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredUsers.map(u => {
                const isSuper = isSuperadminProtected(u);
                const hasApprovedRole = u.role !== 'guest' || u.isApproved;
                const isExpanded = expandedUserId === u.id;
                const rolesList = u.roles && u.roles.length > 0 ? u.roles : [u.role];
                const titlesList = u.classTitles && u.classTitles.length > 0 ? u.classTitles : (u.classTitle ? u.classTitle.split(',').map(s => s.trim()) : ['Thành viên']);

                return (
                  <React.Fragment key={u.id}>
                    <tr className={`hover:bg-slate-50/70 transition-colors ${isExpanded ? 'bg-indigo-50/40' : ''}`}>
                      {/* TÊN & BIỆT DANH */}
                      <td className="py-3 px-4">
                        <div className="flex items-start gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold shrink-0 text-xs mt-0.5">
                            {u.name.charAt(0)}
                          </div>
                          <div className="space-y-1">
                            {editingNameUserId === u.id ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  value={editingNameValue}
                                  onChange={e => setEditingNameValue(e.target.value)}
                                  className="px-2 py-0.5 text-xs font-bold border border-indigo-400 rounded bg-white"
                                  autoFocus
                                />
                                <button
                                  onClick={() => handleSaveName(u)}
                                  className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 cursor-pointer"
                                  title="Lưu tên"
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => setEditingNameUserId(null)}
                                  className="p-1 bg-slate-200 text-slate-600 rounded hover:bg-slate-300 cursor-pointer"
                                  title="Hủy"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-900 text-xs">{u.name}</span>
                                {isSuper && (
                                  <span title="Superadmin">
                                    <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                  </span>
                                )}
                                <button
                                  onClick={() => {
                                    setEditingNameUserId(u.id);
                                    setEditingNameValue(u.name);
                                  }}
                                  className="text-slate-400 hover:text-indigo-600 p-0.5 rounded cursor-pointer"
                                  title="Sửa Họ và Tên"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </button>
                              </div>
                            )}

                            {editingNicknameUserId === u.id ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  placeholder="Nhập biệt danh..."
                                  value={editingNicknameValue}
                                  onChange={e => setEditingNicknameValue(e.target.value)}
                                  className="px-1.5 py-0.5 text-[11px] border border-emerald-400 rounded bg-white w-32"
                                  autoFocus
                                />
                                <button
                                  onClick={() => handleSaveNickname(u)}
                                  className="p-0.5 bg-emerald-600 text-white rounded cursor-pointer"
                                  title="Lưu biệt danh"
                                >
                                  <Check className="w-2.5 h-2.5" />
                                </button>
                                <button
                                  onClick={() => setEditingNicknameUserId(null)}
                                  className="p-0.5 bg-slate-200 text-slate-600 rounded cursor-pointer"
                                  title="Hủy"
                                >
                                  <X className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1">
                                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-100">
                                  {u.nickname || 'Chưa đặt biệt danh'}
                                </span>
                                <button
                                  onClick={() => {
                                    setEditingNicknameUserId(u.id);
                                    setEditingNicknameValue(u.nickname || '');
                                  }}
                                  className="text-slate-300 hover:text-emerald-600 p-0.5 rounded cursor-pointer"
                                  title="Sửa Biệt Danh"
                                >
                                  <Edit3 className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* GOOGLE EMAIL */}
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                        {u.email}
                      </td>

                      {/* VAI TRÒ (MULTI-ROLES BADGES) */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 flex-wrap">
                          {rolesList.map(r => (
                            <span
                              key={r}
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                r === 'superadmin'
                                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                                  : r === 'admin'
                                  ? 'bg-purple-100 text-purple-900 border-purple-300'
                                  : r === 'manager'
                                  ? 'bg-blue-100 text-blue-900 border-blue-300'
                                  : r === 'teacher'
                                  ? 'bg-sky-100 text-sky-900 border-sky-300'
                                  : r === 'student'
                                  ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                  : 'bg-slate-100 text-slate-700 border-slate-300'
                              }`}
                            >
                              {r === 'superadmin'
                                ? 'Superadmin'
                                : r === 'admin'
                                ? 'Quản trị'
                                : r === 'manager'
                                ? 'Quản lý'
                                : r === 'teacher'
                                ? 'Giáo viên'
                                : r === 'student'
                                ? 'Học sinh'
                                : r === 'assistant'
                                ? 'Trợ giảng'
                                : r === 'parent'
                                ? 'Phụ huynh'
                                : 'Khách'}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* TỌA ĐỘ GPS */}
                      <td className="py-3 px-4">
                        {hasApprovedRole ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              type="button"
                              onClick={() => handleOpenGpsModal(u)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-black bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs cursor-pointer"
                              title="Kích chọn lấy tọa độ GPS"
                            >
                              <MapPin className="w-3 h-3" />
                              <span>GPS</span>
                            </button>

                            {u.gps ? (
                              <span className="font-mono text-[11px] text-slate-700 font-semibold bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                {u.gps}
                              </span>
                            ) : (
                              <span className="text-[11px] text-amber-600 italic">Chưa có GPS</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">(Cần duyệt vai trò)</span>
                        )}
                      </td>

                      {/* CHỨC DANH TRONG LỚP (MULTI-TITLES BADGES) */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 flex-wrap">
                          {titlesList.map(t => (
                            <span
                              key={t}
                              className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* THAO TÁC & XEM 14 TRƯỜNG */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setDetailModalUser(u)}
                            className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg text-[11px] border border-indigo-200 flex items-center gap-1 cursor-pointer transition-colors"
                            title="Xem và chỉnh sửa trọn bộ 14 trường thông tin"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>14 Trường</span>
                          </button>

                          <button
                            onClick={() => setExpandedUserId(isExpanded ? null : u.id)}
                            className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg cursor-pointer"
                            title={isExpanded ? 'Thu gọn' : 'Xem nhanh'}
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-indigo-600" /> : <ChevronDown className="w-4 h-4" />}
                          </button>

                          {isSuper ? (
                            <div
                              className="inline-flex items-center gap-1 px-1.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-[10px] font-bold cursor-not-allowed ml-1"
                              title="Tài khoản Superadmin vĩnh viễn"
                            >
                              <Lock className="w-3 h-3 text-amber-600" />
                            </div>
                          ) : (
                            <button
                              onClick={() => handleDeleteUser(u)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer ml-1"
                              title="Xóa người dùng"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* DÒNG MỞ RỘNG HIỂN THỊ TRỰC TIẾP TRỌN BỘ 14 TRƯỜNG */}
                    {isExpanded && (
                      <tr className="bg-indigo-50/30 border-b border-indigo-100 animate-fade-in">
                        <td colSpan={6} className="p-3">
                          <div className="bg-white p-3.5 rounded-xl border border-indigo-100 shadow-xs space-y-2.5">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                              <span className="font-bold text-xs text-indigo-900 flex items-center gap-1.5 uppercase tracking-wide">
                                <Info className="w-4 h-4 text-indigo-600" />
                                Chi Tiết Trọn Bộ 14 Trường Thông Tin Firestore
                              </span>
                              <button
                                onClick={() => setDetailModalUser(u)}
                                className="px-2.5 py-1 text-[11px] bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                              >
                                <Edit3 className="w-3 h-3" /> Chỉnh sửa 14 trường
                              </button>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
                              <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                                <span className="text-slate-400 block text-[10px] font-bold uppercase">1. Họ và Tên</span>
                                <strong className="text-slate-900">{u.name}</strong>
                              </div>
                              <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                                <span className="text-slate-400 block text-[10px] font-bold uppercase">2. Biệt Danh</span>
                                <strong className="text-emerald-700">{u.nickname || 'Chưa đặt'}</strong>
                              </div>
                              <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                                <span className="text-slate-400 block text-[10px] font-bold uppercase">3. Giới Tính</span>
                                <span className="text-slate-700 font-medium">{u.gender || 'Nam'}</span>
                              </div>
                              <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                                <span className="text-slate-400 block text-[10px] font-bold uppercase">4. Nơi Công Tác/Học Tập</span>
                                <span className="text-slate-700 font-medium">{u.workplace || 'Chưa điền'}</span>
                              </div>
                              <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                                <span className="text-slate-400 block text-[10px] font-bold uppercase">5. Google Email</span>
                                <span className="font-mono text-slate-700">{u.email}</span>
                              </div>
                              <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                                <span className="text-slate-400 block text-[10px] font-bold uppercase">6. Các Vai Trò</span>
                                <span className="font-bold text-indigo-700 uppercase">{rolesList.join(', ')}</span>
                              </div>
                              <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                                <span className="text-slate-400 block text-[10px] font-bold uppercase">7. GPS</span>
                                <span className="font-mono text-slate-700">{u.gps || 'Chưa có GPS'}</span>
                              </div>
                              <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                                <span className="text-slate-400 block text-[10px] font-bold uppercase">8. Số Điện Thoại</span>
                                <span className="font-mono text-slate-700">{u.phone || '—'}</span>
                              </div>
                              <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                                <span className="text-slate-400 block text-[10px] font-bold uppercase">9. Địa Chỉ Nhà</span>
                                <span className="text-slate-700">{u.homeAddress || '—'}</span>
                              </div>
                              <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                                <span className="text-slate-400 block text-[10px] font-bold uppercase">10. Các Lớp Dạy/Học</span>
                                <span className="text-slate-700 font-semibold text-indigo-700">{u.classIds?.join(', ') || 'Chưa xếp lớp'}</span>
                              </div>
                              <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                                <span className="text-slate-400 block text-[10px] font-bold uppercase">11. Các Môn Dạy/Học</span>
                                <span className="text-slate-700">{u.subjects?.join(', ') || 'Chưa phân môn'}</span>
                              </div>
                              <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                                <span className="text-slate-400 block text-[10px] font-bold uppercase">12. Môn Quản Lý</span>
                                <span className="text-slate-700">{u.managedSubjects?.join(', ') || 'Không có'}</span>
                              </div>
                              <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                                <span className="text-slate-400 block text-[10px] font-bold uppercase">13. Phân Nhóm/Tổ</span>
                                <span className="text-slate-700">{u.groupOrTeam || 'Không có'}</span>
                              </div>
                              <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                                <span className="text-slate-400 block text-[10px] font-bold uppercase">14. Chức Danh Trong Lớp</span>
                                <span className="font-bold text-amber-700">{titlesList.join(', ')}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}

              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-700 text-xs">
                      Không tìm thấy tài khoản người dùng nào khớp với bộ lọc.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL GOOGLE MAPS CHỌN TỌA ĐỘ GPS */}
      {gpsModalUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    Google Maps — Chọn Tọa Độ GPS Cho Tài Khoản
                  </h3>
                  <p className="text-xs text-slate-500">
                    Người dùng: <strong className="text-slate-800">{gpsModalUser.name}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setGpsModalUser(null)}
                className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl text-xs text-indigo-900 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Navigation className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>
                  <strong>Hướng dẫn:</strong> Kích vào bất kỳ chỗ nào trên bản đồ để ghim vị trí và lấy tọa độ GPS.
                </span>
              </div>
              <button
                type="button"
                onClick={handleGetDeviceLocation}
                className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] shrink-0 cursor-pointer shadow-xs"
              >
                Lấy GPS máy
              </button>
            </div>

            {/* Tùy chọn lớp bản đồ: Mặc định vs Vệ tinh */}
            <div className="flex items-center justify-between gap-2 flex-wrap text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700">Tùy chọn lớp bản đồ:</span>
                <button
                  type="button"
                  onClick={() => setMapType('roadmap')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    mapType === 'roadmap'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  🗺️ Mặc định (Roadmap)
                </button>
                <button
                  type="button"
                  onClick={() => setMapType('satellite')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    mapType === 'satellite'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  🛰️ Vệ tinh (Satellite)
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-medium">Chọn nhanh:</span>
                <button
                  type="button"
                  onClick={() => handleSearchQuickPlace('Hà Nội (Thủ đô)', 21.028511, 105.854444)}
                  className="px-2 py-0.5 rounded bg-white hover:bg-slate-100 text-slate-700 font-semibold cursor-pointer border border-slate-200"
                >
                  Hà Nội
                </button>
                <button
                  type="button"
                  onClick={() => handleSearchQuickPlace('TP. Hồ Chí Minh', 10.776889, 106.700806)}
                  className="px-2 py-0.5 rounded bg-white hover:bg-slate-100 text-slate-700 font-semibold cursor-pointer border border-slate-200"
                >
                  TP.HCM
                </button>
                <button
                  type="button"
                  onClick={() => handleSearchQuickPlace('Đà Nẵng', 16.047079, 108.20623)}
                  className="px-2 py-0.5 rounded bg-white hover:bg-slate-100 text-slate-700 font-semibold cursor-pointer border border-slate-200"
                >
                  Đà Nẵng
                </button>
              </div>
            </div>

            <div
              onClick={handleMapClick}
              className={`relative w-full h-72 rounded-xl overflow-hidden border-2 border-indigo-200 shadow-inner cursor-crosshair select-none ${
                mapType === 'satellite' ? 'bg-slate-900' : 'bg-slate-100'
              }`}
            >
              {/* Embedded Interactive Google Map with Map Type */}
              <iframe
                title="Google Maps Location Picker"
                width="100%"
                height="100%"
                frameBorder="0"
                scrolling="no"
                marginHeight={0}
                marginWidth={0}
                src={`https://maps.google.com/maps?q=${selectedLat},${selectedLng}&t=${
                  mapType === 'satellite' ? 'k' : 'm'
                }&z=14&ie=UTF8&iwloc=&output=embed`}
                className="w-full h-full pointer-events-none opacity-85"
              />

              <div
                className="absolute transform -translate-x-1/2 -translate-y-full transition-all duration-200 pointer-events-none"
                style={{
                  left: '50%',
                  top: '50%',
                }}
              >
                <div className="flex flex-col items-center animate-bounce">
                  <div className="px-2.5 py-1 rounded-md bg-slate-900/90 text-white text-[11px] font-mono font-bold whitespace-nowrap shadow-lg border border-slate-700">
                    {selectedLat.toFixed(6)}, {selectedLng.toFixed(6)}
                  </div>
                  <MapPin className="w-9 h-9 text-rose-500 fill-rose-600 drop-shadow-lg" />
                </div>
              </div>

              <a
                href={`https://www.google.com/maps?q=${selectedLat},${selectedLng}&t=${mapType === 'satellite' ? 'k' : 'm'}`}
                target="_blank"
                rel="noreferrer"
                onClick={e => e.stopPropagation()}
                className="absolute top-2 right-2 bg-white/95 hover:bg-white px-3 py-1.5 rounded-lg text-[11px] font-bold text-indigo-700 border border-indigo-200 flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Mở Google Maps ({mapType === 'satellite' ? 'Vệ tinh' : 'Mặc định'})</span>
              </a>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1 text-xs">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="font-bold text-slate-700">Tọa độ GPS đã chọn:</span>
                <span className="font-mono font-black text-indigo-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                  {selectedLat.toFixed(6)}, {selectedLng.toFixed(6)}
                </span>
              </div>
              <div className="text-[11px] text-slate-500">
                Vị trí: <strong>{selectedAddress}</strong>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setGpsModalUser(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                id="btn-confirm-gps-coords"
                onClick={handleConfirmGps}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Xác nhận lấy tọa độ GPS</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">Thêm Tài Khoản Người Dùng Mới</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddManual} className="space-y-3 text-xs max-h-[75vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-0.5 uppercase">1. Họ và Tên</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Nguyễn Văn A..."
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    className="w-full py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-0.5 uppercase">2. Biệt Danh</label>
                  <input
                    type="text"
                    placeholder="VD: An Toán..."
                    value={newNickname}
                    onChange={e => setNewNickname(e.target.value)}
                    className="w-full py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-0.5 uppercase">3. Giới Tính</label>
                  <select
                    value={newGender}
                    onChange={e => setNewGender(e.target.value)}
                    className="w-full py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg font-medium"
                  >
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-0.5 uppercase">4. Nơi Công Tác/Học Tập</label>
                  <input
                    type="text"
                    placeholder="VD: THPT Chuyên / ĐH Sư Phạm..."
                    value={newWorkplace}
                    onChange={e => setNewWorkplace(e.target.value)}
                    className="w-full py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-0.5 uppercase">5. Google Email (Bắt buộc)</label>
                <input
                  type="email"
                  required
                  placeholder="user@gmail.com"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  className="w-full py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-0.5 uppercase">6. Vai Trò</label>
                  <select
                    value={newRole}
                    onChange={e => setNewRole(e.target.value as UserRole)}
                    className="w-full py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg font-semibold"
                  >
                    <option value="student">Học sinh</option>
                    <option value="teacher">Giáo viên</option>
                    <option value="manager">Quản lý môn</option>
                    <option value="assistant">Trợ giảng</option>
                    <option value="admin">Quản trị viên</option>
                    <option value="parent">Phụ huynh</option>
                    <option value="guest">Khách</option>
                    <option value="superadmin">Superadmin</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-0.5 uppercase">8. SĐT</label>
                  <input
                    type="text"
                    placeholder="0901234567"
                    value={newPhone}
                    onChange={e => setNewPhone(e.target.value)}
                    className="w-full py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-0.5 uppercase">9. Địa Chỉ Nhà</label>
                <input
                  type="text"
                  placeholder="VD: Số 123 Đường Lê Lợi, Phường 1..."
                  value={newHomeAddress}
                  onChange={e => setNewHomeAddress(e.target.value)}
                  className="w-full py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-0.5 uppercase">10. Các Lớp Dạy/Học</label>
                  <input
                    type="text"
                    placeholder="10A1, 10A2"
                    value={newClassIds}
                    onChange={e => setNewClassIds(e.target.value)}
                    className="w-full py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-0.5 uppercase">11. Các Môn Dạy/Học</label>
                  <input
                    type="text"
                    placeholder="Toán Học, Vật Lý"
                    value={newSubjects}
                    onChange={e => setNewSubjects(e.target.value)}
                    className="w-full py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-0.5 uppercase">12. Môn Quản Lý</label>
                  <input
                    type="text"
                    placeholder="Toán Học"
                    value={newManagedSubjects}
                    onChange={e => setNewManagedSubjects(e.target.value)}
                    className="w-full py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-0.5 uppercase">13. Phân Nhóm/Tổ</label>
                  <input
                    type="text"
                    placeholder="Tổ 1 / Nhóm A"
                    value={newGroupOrTeam}
                    onChange={e => setNewGroupOrTeam(e.target.value)}
                    className="w-full py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-0.5 uppercase">
                  14. Chức Danh Trong Lớp
                </label>
                <select
                  value={newClassTitle}
                  onChange={e => setNewClassTitle(e.target.value)}
                  className="w-full py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg font-semibold"
                >
                  <option value="Thành viên">Thành viên</option>
                  <option value="LT">LT (Lớp Trưởng)</option>
                  <option value="PHT">PHT (Phó Học Tập)</option>
                  <option value="VTM">VTM (Văn Thể Mỹ)</option>
                  <option value="PLĐ">PLĐ (Phó Lao Động)</option>
                  <option value="CĐ">CĐ (Cờ Đỏ)</option>
                  <option value="BT">BT (Bí Thư)</option>
                  <option value="PBT">PBT (Phó Bí Thư)</option>
                  <option value="UV">UV (Ủy Viên)</option>
                  <option value="TT">TT (Tổ Trưởng)</option>
                  <option value="TP">TP (Tổ Phó)</option>
                  <option value="Ban Cán Sự Môn">Ban Cán Sự Môn</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer"
                >
                  Lưu tài khoản (14 Trường)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL XEM & CHỈNH SỬA TRỌN BỘ 14 TRƯỜNG THÔNG TIN NGƯỜI DÙNG */}
      <UserProfileModal
        user={detailModalUser}
        onClose={() => setDetailModalUser(null)}
        onSave={async updatedUser => {
          await saveUser(updatedUser);
          await loadData();
          setNotification(`Đã cập nhật chuẩn hóa 14 trường thông tin cho "${updatedUser.name}".`);
          setTimeout(() => setNotification(null), 4000);
        }}
        onOpenGpsModal={() => {
          if (detailModalUser) {
            handleOpenGpsModal(detailModalUser);
          }
        }}
      />
    </div>
  );
};
