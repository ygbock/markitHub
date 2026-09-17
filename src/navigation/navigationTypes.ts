import React from 'react';
import { PermissionKey, StaffRole } from '../utils/permissions';

export interface NavigationItem {
  id: string;
  label: string;
  href?: string;
  path?: string;
  icon?: React.ComponentType<{ className?: string }> | React.ReactNode;
  badge?: string | number;
  badgeVariant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  permission?: PermissionKey;
  capability?: string;
  role?: StaffRole | StaffRole[];
  exact?: boolean;
  external?: boolean;
  children?: NavigationItem[];
}

export interface NavigationGroup {
  id: string;
  title: string;
  items: NavigationItem[];
  permission?: PermissionKey;
  capability?: string;
}
