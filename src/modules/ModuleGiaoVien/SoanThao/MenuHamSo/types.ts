/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UserRole } from '../../../../services/storageTypes';

export interface BbtSolverResult {
  success: boolean;
  xPoints: string;
  yPrimeSigns: string;
  yValues: string;
  description: string;
  varName: string;
  funcRow: string;
  derivRow: string;
}

export interface BbtColData {
  isDouble: boolean;
  dir?: '+' | '-';
  val?: string;
  leftDir?: '+' | '-';
  leftVal?: string;
  rightDir?: '+' | '-';
  rightVal?: string;
}

export interface BbtInterval {
  startDir: '+' | '-';
  startVal: string;
  endDir: '+' | '-';
  endVal: string;
  isGoingUp: boolean;
  hasLeftLimit: boolean;
  hasRightLimit: boolean;
}

export interface MenuHamSoProps {
  editorRef: React.RefObject<HTMLDivElement | null>;
  saveCurrentSelection: () => void;
  insertHtmlToEditor: (html: string) => void;
  currentRole?: UserRole;
  userFontSize?: string;
  setNotification?: (notif: { text: string; type: 'success' | 'info' | 'error' } | null) => void;
  onCloseOtherMenus?: () => void;
}
