import React, { useState, useEffect, useMemo } from 'react';
import {
  Laptop,
  Smartphone,
  Tablet,
  ShieldCheck,
  ShieldAlert,
  RotateCcw,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Lock,
  Clock,
  UserCheck,
  Search,
  SlidersHorizontal,
  Info,
  KeyRound,
  History,
  MonitorCheck,
  Activity,
  HardDrive,
  Globe,
  Trash2,
  Sparkles,
} from 'lucide-react';

export interface DeviceInfo {
  id: string;
  os: 'Windows' | 'macOS' | 'iOS' | 'Android' | 'Linux';
  deviceName: string;
  browser: string;
  ipAddress: string;
  registeredAt: string;
  lastActiveAt: string;
  isCurrentDevice?: boolean;
}

export interface UserDeviceProfile {
  userId: string;
  userName: string;
  userRole: 'Học sinh' | 'Giáo viên' | 'Quản trị viên';
  email: string;
  devices: { [key in DeviceInfo['os']]?: DeviceInfo };
  changesThisMonth: number;
  maxChangesPerMonth: number;
  lastResetMonth: string; // e.g. "2026-10"
  changeHistory: {
    id: string;
    os: DeviceInfo['os'];
    action: string;
    timestamp: string;
    reason: string;
  }[];
}

// Initial mock data for user and system
const INITIAL_MY_PROFILE: UserDeviceProfile = {
  userId: 'USR_2026_089',
  userName: 'Nguyễn Văn Minh',
  userRole: 'Học sinh',
  email: 'nguyenvanminh@hocsinh.edu.vn',
  maxChangesPerMonth: 2,
  changesThisMonth: 1, // Already changed 1 time this month
  lastResetMonth: '2026-10',
  devices: {
    Windows: {
      id: 'DEV_WIN_88A19',
      os: 'Windows',
      deviceName: 'Laptop Lenovo ThinkPad X1',
      browser: 'Google Chrome 129.0',
      ipAddress: '113.161.42.108',
      registeredAt: '2026-10-02 08:30:15',
      lastActiveAt: 'Chừa vài giây trước (Đang truy cập)',
      isCurrentDevice: true,
    },
    iOS: {
      id: 'DEV_IOS_33C40',
      os: 'iOS',
      deviceName: 'iPhone 15 Pro Max',
      browser: 'Mobile Safari 18.0',
      ipAddress: '14.232.190.55',
      registeredAt: '2026-10-05 19:12:00',
      lastActiveAt: '2026-10-14 06:45:10',
      isCurrentDevice: false,
    },
  },
  changeHistory: [
    {
      id: 'LOG_001',
      os: 'Windows',
      action: 'Thay đổi thiết bị',
      timestamp: '2026-10-02 08:30:15',
      reason: 'Đổi từ Máy tính bàn cũ sang Laptop Lenovo ThinkPad mới',
    },
  ],
};

const MOCK_ALL_USERS_DEVICES: UserDeviceProfile[] = [
  INITIAL_MY_PROFILE,
  {
    userId: 'USR_2026_012',
    userName: 'Trần Thị Mỹ Linh',
    userRole: 'Học sinh',
    email: 'mylinh.tran@hocsinh.edu.vn',
    maxChangesPerMonth: 2,
    changesThisMonth: 2, // Reached limit!
    lastResetMonth: '2026-10',
    devices: {
      Windows: {
        id: 'DEV_WIN_11029',
        os: 'Windows',
        deviceName: 'PC Asus ROG Gaming',
        browser: 'Microsoft Edge 128.0',
        ipAddress: '118.69.182.12',
        registeredAt: '2026-10-01 14:00:00',
        lastActiveAt: '2026-10-14 05:10:00',
      },
      Android: {
        id: 'DEV_AND_99410',
        os: 'Android',
        deviceName: 'Samsung Galaxy S24 Ultra',
        browser: 'Chrome Mobile 129.0',
        ipAddress: '27.72.104.88',
        registeredAt: '2026-10-08 21:10:00',
        lastActiveAt: '2026-10-13 22:15:00',
      },
    },
    changeHistory: [
      {
        id: 'LOG_010',
        os: 'Windows',
        action: 'Hủy thiết bị cũ',
        timestamp: '2026-10-01 14:00:00',
        reason: 'Thay đổi máy tính học tập',
      },
      {
        id: 'LOG_011',
        os: 'Android',
        action: 'Thay đổi thiết bị',
        timestamp: '2026-10-08 21:10:00',
        reason: 'Đổi máy điện thoại Samsung mới',
      },
    ],
  },
  {
    userId: 'USR_2026_044',
    userName: 'Thầy Lê Hoàng Nam',
    userRole: 'Giáo viên',
    email: 'hoangnam.le@giao-vien.edu.vn',
    maxChangesPerMonth: 2,
    changesThisMonth: 0,
    lastResetMonth: '2026-10',
    devices: {
      macOS: {
        id: 'DEV_MAC_77102',
        os: 'macOS',
        deviceName: 'MacBook Pro M3 Max 16-inch',
        browser: 'Safari 17.5',
        ipAddress: '42.113.120.90',
        registeredAt: '2026-09-15 09:00:00',
        lastActiveAt: '2026-10-14 06:58:00',
      },
      iOS: {
        id: 'DEV_IOS_55210',
        os: 'iOS',
        deviceName: 'iPad Pro 12.9 M2',
        browser: 'Mobile Safari 18.0',
        ipAddress: '42.113.120.90',
        registeredAt: '2026-09-20 10:30:00',
        lastActiveAt: '2026-10-13 18:20:00',
      },
    },
    changeHistory: [],
  },
  {
    userId: 'USR_2026_105',
    userName: 'Phạm Đức Anh',
    userRole: 'Học sinh',
    email: 'ducanh.pham@hocsinh.edu.vn',
    maxChangesPerMonth: 2,
    changesThisMonth: 0,
    lastResetMonth: '2026-10',
    devices: {
      Android: {
        id: 'DEV_AND_11200',
        os: 'Android',
        deviceName: 'Xiaomi 14 Ultra',
        browser: 'Chrome Mobile 129.0',
        ipAddress: '171.244.30.12',
        registeredAt: '2026-10-10 11:20:00',
        lastActiveAt: '2026-10-14 04:00:00',
      },
    },
    changeHistory: [],
  },
];

export const QuanLyThietBiView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'my-devices' | 'admin-all-devices' | 'policy-guide'>('my-devices');
  const [myProfile, setMyProfile] = useState<UserDeviceProfile>(INITIAL_MY_PROFILE);
  const [allUsers, setAllUsers] = useState<UserDeviceProfile[]>(MOCK_ALL_USERS_DEVICES);
  
  // Detection state
  const [detectedOS, setDetectedOS] = useState<DeviceInfo['os']>('Windows');
  const [isSimulatingLoginAttempt, setIsSimulatingLoginAttempt] = useState<boolean>(false);
  const [simulatedConflictOS, setSimulatedConflictOS] = useState<DeviceInfo['os'] | null>(null);

  // Filter and search state for admin tab
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOS, setFilterOS] = useState<string>('all');
  const [filterQuotaStatus, setFilterQuotaStatus] = useState<string>('all');

  // Modal / Toast message
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    // Detect OS automatically
    const userAgent = navigator.userAgent;
    if (userAgent.indexOf('Win') !== -1) setDetectedOS('Windows');
    else if (userAgent.indexOf('Mac') !== -1 && userAgent.indexOf('iPhone') === -1 && userAgent.indexOf('iPad') === -1) setDetectedOS('macOS');
    else if (userAgent.indexOf('Android') !== -1) setDetectedOS('Android');
    else if (userAgent.indexOf('iPhone') !== -1 || userAgent.indexOf('iPad') !== -1) setDetectedOS('iOS');
    else if (userAgent.indexOf('Linux') !== -1) setDetectedOS('Linux');
  }, []);

  // Calculate stats
  const remainingChanges = myProfile.maxChangesPerMonth - myProfile.changesThisMonth;
  const isQuotaExhausted = remainingChanges <= 0;

  // Handle Unlink / Change Device for current user
  const handleUnlinkDevice = (os: DeviceInfo['os']) => {
    if (isQuotaExhausted) {
      alert(`Bạn đã dùng hết ${myProfile.maxChangesPerMonth}/${myProfile.maxChangesPerMonth} lượt thay đổi thiết bị trong tháng này! Lượt đổi sẽ được làm mới tự động vào ngày 01 của tháng tiếp theo.`);
      return;
    }

    const confirmText = `Xác nhận hủy liên kết thiết bị ${os}?\n\n- Thao tác này sẽ dùng 1 lượt thay đổi (Bạn sẽ còn ${remainingChanges - 1} lượt trong tháng này).\n- Sau khi hủy, bạn có thể đăng nhập trên thiết bị ${os} mới.`;
    if (!window.confirm(confirmText)) return;

    const newDevices = { ...myProfile.devices };
    delete newDevices[os];

    const newLog = {
      id: `LOG_${Date.now()}`,
      os,
      action: 'Hủy liên kết thiết bị',
      timestamp: new Date().toLocaleString('vi-VN'),
      reason: `Người dùng tự hủy liên kết thiết bị ${os} để chuẩn bị đổi máy mới`,
    };

    const updatedProfile: UserDeviceProfile = {
      ...myProfile,
      devices: newDevices,
      changesThisMonth: myProfile.changesThisMonth + 1,
      changeHistory: [newLog, ...myProfile.changeHistory],
    };

    setMyProfile(updatedProfile);
    setAllUsers(prev => prev.map(u => (u.userId === updatedProfile.userId ? updatedProfile : u)));

    setActionSuccessMessage(`Đã hủy liên kết thiết bị ${os} thành công! Số lượt thay đổi còn lại trong tháng: ${updatedProfile.maxChangesPerMonth - updatedProfile.changesThisMonth}/${updatedProfile.maxChangesPerMonth}`);
    setTimeout(() => setActionSuccessMessage(null), 5000);
  };

  // Admin Reset Quota for a user
  const handleAdminResetUserQuota = (userId: string) => {
    setAllUsers(prev =>
      prev.map(u => {
        if (u.userId === userId) {
          const resetLog = {
            id: `LOG_ADM_${Date.now()}`,
            os: 'Windows' as DeviceInfo['os'],
            action: 'Reset hạn mức bởi Admin',
            timestamp: new Date().toLocaleString('vi-VN'),
            reason: 'Quản trị viên hỗ trợ reset hạn mức thay đổi thiết bị trong tháng',
          };
          const updated = {
            ...u,
            changesThisMonth: 0,
            changeHistory: [resetLog, ...u.changeHistory],
          };
          if (u.userId === myProfile.userId) {
            setMyProfile(updated);
          }
          return updated;
        }
        return u;
      })
    );
    setActionSuccessMessage(`Đã reset lại 2/2 lượt thay đổi thiết bị trong tháng cho tài khoản ${userId}!`);
    setTimeout(() => setActionSuccessMessage(null), 4000);
  };

  // Simulate Conflict
  const handleSimulateLoginConflict = (targetOS: DeviceInfo['os']) => {
    setSimulatedConflictOS(targetOS);
    setIsSimulatingLoginAttempt(true);
  };

  // Filtered Users for Admin View
  const filteredUsers = useMemo(() => {
    return allUsers.filter(u => {
      const matchSearch =
        u.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.userId.toLowerCase().includes(searchTerm.toLowerCase());

      const matchOS = filterOS === 'all' || Boolean(u.devices[filterOS as DeviceInfo['os']]);

      const matchQuota =
        filterQuotaStatus === 'all' ||
        (filterQuotaStatus === 'exhausted' && u.changesThisMonth >= u.maxChangesPerMonth) ||
        (filterQuotaStatus === 'available' && u.changesThisMonth < u.maxChangesPerMonth);

      return matchSearch && matchOS && matchQuota;
    });
  }, [allUsers, searchTerm, filterOS, filterQuotaStatus]);

  const getOSIcon = (os: DeviceInfo['os']) => {
    switch (os) {
      case 'Windows':
        return <Laptop className="w-5 h-5 text-blue-600" />;
      case 'macOS':
        return <HardDrive className="w-5 h-5 text-slate-700 dark:text-slate-300" />;
      case 'iOS':
        return <Tablet className="w-5 h-5 text-gray-800 dark:text-gray-200" />;
      case 'Android':
        return <Smartphone className="w-5 h-5 text-emerald-600" />;
      case 'Linux':
        return <Globe className="w-5 h-5 text-orange-600" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-4 md:p-6 space-y-6">
      {/* Top Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold border border-blue-400/30">
              <ShieldCheck className="w-4 h-4" />
              Chính sách Bảo mật & Giới hạn 1 Thiết bị / 1 HĐH
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              <HardDrive className="w-8 h-8 text-blue-400" />
              Quản Lý Thiết Bị Đăng Nhập
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl">
              Mỗi tài khoản được phép duy trì đăng nhập trên <strong>tối đa 1 thiết bị cho mỗi Hệ điều hành</strong> (Windows, macOS, iOS, Android). Tối đa <strong>2 lượt thay đổi thiết bị / tháng</strong> nhằm đảm bảo an toàn tuyệt đối và chống chia sẻ tài khoản.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-xl flex items-center gap-4 text-white min-w-[240px]">
            <div className="p-3 bg-blue-500/20 rounded-lg">
              <RefreshCw className="w-6 h-6 text-blue-300" />
            </div>
            <div>
              <div className="text-xs text-slate-300 font-medium">Hạn mức đổi máy tháng 10/2026</div>
              <div className="text-xl font-extrabold flex items-center gap-2">
                <span className={remainingChanges > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                  {remainingChanges} / {myProfile.maxChangesPerMonth} lượt còn
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Tự động làm mới ngày 01 hàng tháng</div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Toast Message */}
      {actionSuccessMessage && (
        <div className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 p-4 rounded-xl shadow-md flex items-center gap-3 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          <span className="text-sm font-medium">{actionSuccessMessage}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('my-devices')}
          className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'my-devices'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-800/80 rounded-t-xl shadow-sm'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded-t-xl'
          }`}
        >
          <MonitorCheck className="w-4 h-4" />
          Thiết Bị Cá Nhân Của Tôi
          <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
            {Object.keys(myProfile.devices).length} HĐH
          </span>
        </button>

        <button
          onClick={() => setActiveTab('admin-all-devices')}
          className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'admin-all-devices'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-800/80 rounded-t-xl shadow-sm'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded-t-xl'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          Bảng Quản Trị Hệ Thống (Admin / Giáo Viên)
          <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300">
            {allUsers.length} tài khoản
          </span>
        </button>

        <button
          onClick={() => setActiveTab('policy-guide')}
          className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'policy-guide'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-800/80 rounded-t-xl shadow-sm'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded-t-xl'
          }`}
        >
          <Info className="w-4 h-4" />
          Quy Định & Hướng Dẫn Kỹ Thuật
        </button>
      </div>

      {/* TAB 1: MY DEVICES */}
      {activeTab === 'my-devices' && (
        <div className="space-y-6">
          {/* Detected Device Status Banner */}
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-xl">
                <Activity className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Thiết bị & Hệ điều hành hiện tại của bạn:</div>
                <div className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  {getOSIcon(detectedOS)}
                  Hệ điều hành {detectedOS}
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Đã được xác thực an toàn
                  </span>
                </div>
              </div>
            </div>

            {/* Test Conflict Simulator Button */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleSimulateLoginConflict('Windows')}
                className="px-3.5 py-2 text-xs font-semibold bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                Giả lập Đăng nhập Máy Windows thứ 2
              </button>
            </div>
          </div>

          {/* Device Change Quota Status Card */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                Hạn Mức Đổi Thiết Bị Tháng 10/2026
              </h3>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Lượt quy định: <strong>{myProfile.maxChangesPerMonth} lượt / tháng</strong>
              </span>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-600 dark:text-slate-400">
                  Đã sử dụng: {myProfile.changesThisMonth} / {myProfile.maxChangesPerMonth} lượt
                </span>
                <span className={remainingChanges > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                  {remainingChanges > 0 ? `Còn lại ${remainingChanges} lượt` : 'Đã hết lượt thay đổi trong tháng'}
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-700 h-3 rounded-full overflow-hidden p-0.5">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    remainingChanges === 2
                      ? 'bg-emerald-500'
                      : remainingChanges === 1
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                  }`}
                  style={{ width: `${(myProfile.changesThisMonth / myProfile.maxChangesPerMonth) * 100}%` }}
                />
              </div>
            </div>

            {isQuotaExhausted && (
              <div className="p-3.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 rounded-xl text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 mt-0.5 flex-shrink-0" />
                <div>
                  <strong>Cảnh báo hạn mức:</strong> Bạn đã sử dụng hết 2/2 lượt thay đổi thiết bị trong tháng 10/2026. Lượt thay đổi tiếp theo sẽ tự động có hiệu lực vào ngày <strong>01/11/2026</strong>. Nếu có sự cố khẩn cấp (mất máy/hỏng máy), vui lòng liên hệ Ban Quản Trị để được cấp lại lượt hỗ trợ.
                </div>
              </div>
            )}
          </div>

          {/* List of Registered Devices across Operating Systems */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center justify-between">
              <span>Danh Sách Thiết Bị Đã Liên Kết Theo Hệ Điều Hành</span>
              <span className="text-xs font-normal text-slate-500">Tối đa 1 thiết bị / 1 HĐH</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(['Windows', 'macOS', 'iOS', 'Android', 'Linux'] as DeviceInfo['os'][]).map(osName => {
                const device = myProfile.devices[osName];

                return (
                  <div
                    key={osName}
                    className={`rounded-2xl border p-5 transition-all relative ${
                      device
                        ? device.isCurrentDevice
                          ? 'bg-gradient-to-br from-blue-50/80 to-indigo-50/50 dark:from-slate-800 dark:to-blue-950/30 border-blue-300 dark:border-blue-700 shadow-md'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm'
                        : 'bg-slate-50/70 dark:bg-slate-800/40 border-dashed border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-xl ${device ? 'bg-blue-100 dark:bg-blue-900/60' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}>
                          {getOSIcon(osName)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-900 dark:text-white text-base">Hệ điều hành {osName}</h4>
                            {device?.isCurrentDevice && (
                              <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-600 text-white rounded-full">
                                Đang hoạt động
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {device ? device.deviceName : 'Chưa có thiết bị đăng ký'}
                          </p>
                        </div>
                      </div>

                      {device && (
                        <button
                          onClick={() => handleUnlinkDevice(osName)}
                          disabled={isQuotaExhausted}
                          className={`p-2 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold ${
                            isQuotaExhausted
                              ? 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed'
                              : 'bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:hover:bg-rose-900/80 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                          }`}
                          title={isQuotaExhausted ? 'Đã hết lượt thay đổi trong tháng' : 'Hủy liên kết thiết bị này để đổi máy mới'}
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="hidden sm:inline">Hủy liên kết</span>
                        </button>
                      )}
                    </div>

                    {device ? (
                      <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-slate-700/80 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-slate-400 block text-[11px]">Trình duyệt:</span>
                          <span className="font-medium text-slate-700 dark:text-slate-300">{device.browser}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Địa chỉ IP:</span>
                          <span className="font-mono text-slate-700 dark:text-slate-300">{device.ipAddress}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Ngày liên kết:</span>
                          <span className="text-slate-700 dark:text-slate-300">{device.registeredAt}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Hoạt động gần nhất:</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">{device.lastActiveAt}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-400 italic flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5" />
                        Trống slot {osName}. Khi bạn đăng nhập lần đầu bằng thiết bị {osName}, hệ thống sẽ tự động liên kết.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Change History Log */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Lịch Sử Thay Đổi & Gỡ Liên Kết Thiết Bị
            </h3>

            {myProfile.changeHistory.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 uppercase font-semibold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-3">Hệ Điều Hành</th>
                      <th className="p-3">Hành Động</th>
                      <th className="p-3">Thời Gian</th>
                      <th className="p-3">Lý Do / Ghi Chú</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                    {myProfile.changeHistory.map(log => (
                      <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                        <td className="p-3 font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                          {getOSIcon(log.os)}
                          {log.os}
                        </td>
                        <td className="p-3 font-medium text-blue-600 dark:text-blue-400">{log.action}</td>
                        <td className="p-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">{log.timestamp}</td>
                        <td className="p-3 text-slate-600 dark:text-slate-300">{log.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">Chưa có lịch sử thay đổi thiết bị nào.</p>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ADMIN ALL DEVICES TABLE */}
      {activeTab === 'admin-all-devices' && (
        <div className="space-y-6">
          {/* Admin Filters */}
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm theo Tên, Email, Mã học sinh / giáo viên..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
                  <SlidersHorizontal className="w-4 h-4" />
                  Hệ điều hành:
                  <select
                    value={filterOS}
                    onChange={e => setFilterOS(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                  >
                    <option value="all">Tất cả HĐH</option>
                    <option value="Windows">Windows</option>
                    <option value="macOS">macOS</option>
                    <option value="iOS">iOS</option>
                    <option value="Android">Android</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
                  Trạng thái lượt đổi:
                  <select
                    value={filterQuotaStatus}
                    onChange={e => setFilterQuotaStatus(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                  >
                    <option value="all">Tất cả</option>
                    <option value="exhausted">Đã hết lượt (2/2 lần)</option>
                    <option value="available">Còn lượt đổi</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* User Devices Master List */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Danh Sách Tài Khoản & Thiết Bị Liên Kết ({filteredUsers.length} kết quả)
              </h3>
              <span className="text-xs text-slate-500">Quyền Admin: Reset lượt hỗ trợ khẩn cấp</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 uppercase font-semibold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-3.5">Người Dùng</th>
                    <th className="p-3.5">Vai Trò</th>
                    <th className="p-3.5">Thiết Bị Đã Liên Kết</th>
                    <th className="p-3.5">Lượt Đổi Tháng 10/2026</th>
                    <th className="p-3.5 text-right">Thao Tác Admin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {filteredUsers.map(u => {
                    const isUserExhausted = u.changesThisMonth >= u.maxChangesPerMonth;
                    return (
                      <tr key={u.userId} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/60">
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900 dark:text-white">{u.userName}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{u.email} ({u.userId})</div>
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            u.userRole === 'Giáo viên'
                              ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300'
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300'
                          }`}>
                            {u.userRole}
                          </span>
                        </td>
                        <td className="p-3.5 space-y-1">
                          {Object.keys(u.devices).length > 0 ? (
                            Object.entries(u.devices).map(([osKey, dev]) => (
                              <div key={osKey} className="flex items-center gap-1.5 text-[11px] text-slate-700 dark:text-slate-300">
                                {getOSIcon(osKey as DeviceInfo['os'])}
                                <strong>{osKey}:</strong> {dev?.deviceName}
                              </div>
                            ))
                          ) : (
                            <span className="text-slate-400 italic">Chưa liên kết thiết bị nào</span>
                          )}
                        </td>
                        <td className="p-3.5">
                          <div className="flex items-center gap-2">
                            <span className={`font-bold ${isUserExhausted ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                              {u.changesThisMonth} / {u.maxChangesPerMonth} lần
                            </span>
                            {isUserExhausted && (
                              <span className="px-1.5 py-0.5 bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-[10px] font-bold rounded">
                                Đã khóa
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3.5 text-right">
                          <button
                            onClick={() => handleAdminResetUserQuota(u.userId)}
                            className="px-3 py-1.5 text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/80 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-lg transition-colors inline-flex items-center gap-1"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Reset 2/2 lượt
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: POLICY & TECHNICAL GUIDE */}
      {activeTab === 'policy-guide' && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-6 text-sm text-slate-700 dark:text-slate-300">
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
              Quy Định & Cơ Chế Kiểm Soát 1 Thiết Bị / 1 HĐH
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              Nhằm bảo vệ quyền lợi tài liệu bản quyền, chống hành vi chia sẻ tài khoản cho nhiều người cùng học, hệ thống áp dụng quy chuẩn kiểm soát thiết bị nghiêm ngặt như sau:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
              <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Laptop className="w-4 h-4 text-blue-500" />
                1. Nguyên Tắc Tối Đa 1 Thiết Bị / 1 HĐH
              </h4>
              <ul className="list-disc pl-5 space-y-1 text-xs text-slate-600 dark:text-slate-400">
                <li>1 tài khoản được dùng đồng thời 1 máy Windows, 1 Mac, 1 iPhone và 1 điện thoại Android.</li>
                <li>Không được phép đăng nhập đồng thời 2 máy tính Windows hoặc 2 điện thoại Android cùng lúc.</li>
                <li>Khi phát hiện máy Windows thứ 2 đăng nhập, hệ thống sẽ cảnh báo yêu cầu hủy liên kết máy cũ.</li>
              </ul>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
              <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-emerald-500" />
                2. Hạn Mức Tối Đa 2 Lượt Thay Đổi / Tháng
              </h4>
              <ul className="list-disc pl-5 space-y-1 text-xs text-slate-600 dark:text-slate-400">
                <li>Mỗi tháng học sinh / giáo viên được tự do đổi máy / hủy liên kết tối đa <strong>2 lần</strong>.</li>
                <li>Hạn mức sẽ tự động được làm mới (Reset về 0/2) vào đúng 00:00 ngày 01 của tháng kế tiếp.</li>
                <li>Trường hợp học sinh hỏng máy/mất máy quá 2 lần/tháng có thể báo Admin để được hỗ trợ Reset thủ công.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* CONFLICT SIMULATOR MODAL */}
      {isSimulatingLoginAttempt && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 max-w-md w-full p-6 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 space-y-5">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-3 bg-rose-100 dark:bg-rose-950 rounded-xl">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">Cảnh Báo Xung Đột Thiết Bị!</h3>
                <p className="text-xs text-slate-500">Phát hiện đăng nhập trên thiết bị {simulatedConflictOS} mới</p>
              </div>
            </div>

            <div className="p-4 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl text-xs space-y-2 text-rose-900 dark:text-rose-200">
              <p>
                Tài khoản của bạn đã có 1 thiết bị <strong>Windows</strong> khác đang đăng ký:
              </p>
              <div className="p-2.5 bg-white dark:bg-slate-900 rounded border border-rose-200 dark:border-rose-800 font-mono text-[11px]">
                📌 {myProfile.devices.Windows?.deviceName} (IP: {myProfile.devices.Windows?.ipAddress})
              </div>
              <p>
                Mỗi tài khoản chỉ được phép dùng <strong>1 thiết bị Windows</strong>. Vui lòng chọn hành động bên dưới:
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => {
                  if (isQuotaExhausted) {
                    alert('Bạn đã dùng hết 2/2 lượt đổi thiết bị trong tháng 10/2026!');
                    return;
                  }
                  handleUnlinkDevice('Windows');
                  setIsSimulatingLoginAttempt(false);
                }}
                disabled={isQuotaExhausted}
                className={`w-full py-2.5 text-xs font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 ${
                  isQuotaExhausted
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed dark:bg-slate-700'
                    : 'bg-rose-600 hover:bg-rose-700 text-white'
                }`}
              >
                <RotateCcw className="w-4 h-4" />
                Hủy liên kết máy cũ & Chuyển sang máy này (Tốn 1 lượt)
              </button>

              <button
                onClick={() => setIsSimulatingLoginAttempt(false)}
                className="w-full py-2.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl transition-colors"
              >
                Hủy bỏ & Thoát phiên đăng nhập
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
