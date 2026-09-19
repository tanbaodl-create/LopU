import React from 'react';
import { ViewId } from './menuConfig';
import { UserRole, UserProfile } from '../../../services/storageTypes';
import { NavigationContainer } from './NavigationContainer';

export interface DynamicViewContainerProps {
  activeView: ViewId;
  currentRole: UserRole;
  onOpenDriveConnect: () => void;
  onNavigateToView?: (viewId: ViewId) => void;
  driveEmail?: string;
  onChangeRole?: (role: UserRole) => void;
  currentUserProfile?: UserProfile | null;
  firebaseUser?: any;
}

export const DynamicViewContainer: React.FC<DynamicViewContainerProps> = (props) => {
  return <NavigationContainer {...props} />;
};
