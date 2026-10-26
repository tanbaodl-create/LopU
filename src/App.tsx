/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppLayout } from './modules/ModuleGiaoDien';
import { ViewId } from './modules/ModuleGiaoDien/Navigation';

export default function App() {
  const savedView = typeof window !== 'undefined' ? (localStorage.getItem('lopu_active_view') as ViewId) : null;
  // Ưu tiên mở ngay trang tài liệu chạy trước theo yêu cầu người dùng
  return <AppLayout initialView={savedView || 'teaching-soanthao'} />;
}
