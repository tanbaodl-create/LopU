/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

export interface MenuChenProps {
  editorRef?: React.RefObject<HTMLDivElement | null>;
  saveCurrentSelection: () => void;
  insertHtmlToEditor: (html: string) => void;
  chuyenDe?: string;
  currentRole?: string;
  setNotification?: (notification: { text: string; type: 'success' | 'info' | 'error' } | null) => void;
  onCloseOtherMenus?: () => void;
  className?: string;
}

export interface TableConfig {
  rows: number;
  cols: number;
  hasHeader: boolean;
  borderStyle: 'solid' | 'dashed' | 'light';
  theme: 'slate' | 'indigo' | 'emerald' | 'amber';
}

export interface TableInsertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertTable: (tableHtml: string) => void;
  initialRows?: number;
  initialCols?: number;
  initialHasHeader?: boolean;
}
