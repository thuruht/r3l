import type { SidebarTab } from '@/hooks/useSidebar';
import { IconMailbox, IconUsersGroup, IconBroadcast, IconHistory, IconBookmark, IconTrash } from '@tabler/icons-react';
import type React from 'react';

export interface TabDefinition {
  label: string;
  Icon: React.ComponentType<any>;
  // Whether this tab appears in the condensed header nav bar.
  // Tabs with showInHeader: false are only reachable via the sidebar.
  showInHeader: boolean;
}

export const TAB_CONFIG: Record<SidebarTab, TabDefinition> = {
  inbox:     { label: 'Mail',      Icon: IconMailbox,    showInHeader: true },
  planets:   { label: 'Groups',    Icon: IconUsersGroup, showInHeader: true },
  galaxy:    { label: 'Galaxy',    Icon: IconBroadcast,  showInHeader: true },
  bookmarks: { label: 'Bookmarks', Icon: IconBookmark,   showInHeader: true },
  history:   { label: 'History',   Icon: IconHistory,    showInHeader: false },
  trash:     { label: 'Trash',     Icon: IconTrash,      showInHeader: false },
};
