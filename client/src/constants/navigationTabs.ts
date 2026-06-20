import type { SidebarTab } from '@/hooks/useSidebar';
import { IconMailbox, IconUsersGroup, IconBroadcast, IconHistory, IconBookmark, IconTrash } from '@tabler/icons-react';
import type React from 'react';

export interface TabDefinition {
  label: string;
  Icon: React.ComponentType<any>;
}

export const TAB_CONFIG: Record<SidebarTab, TabDefinition> = {
  inbox: { label: 'Mail', Icon: IconMailbox },
  planets: { label: 'Groups', Icon: IconUsersGroup },
  galaxy: { label: 'Galaxy', Icon: IconBroadcast },
  history: { label: 'History', Icon: IconHistory },
  bookmarks: { label: 'Bookmarks', Icon: IconBookmark },
  trash: { label: 'Trash', Icon: IconTrash },
};
