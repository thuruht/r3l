import React from 'react';
import { IconX } from '@tabler/icons-react';
import { ICON_SIZES } from '@/constants/iconSizes';
import type { SidebarTab } from '@/hooks/useSidebar';
import '@/styles/Sidebar.css';

interface SidebarProps {
  isOpen: boolean;
  activeTab: SidebarTab | null;
  onTabChange: (tab: SidebarTab) => void;
  onClose: () => void;
  children: React.ReactNode;
  unreadCounts: { inbox: number; planets: number; history?: number };
}

const TAB_LABELS: Record<SidebarTab, string> = {
  inbox: '< mail >',
  planets: '< planets >',
  galaxy: '< galaxy >',
  history: '< drift history >',
};

/**
 * Persistent right sidebar with tabbed navigation.
 * Replaces the three independent slide-out drawer panels (Inbox, Planets, Galaxy).
 */
const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  activeTab,
  onTabChange,
  onClose,
  children,
  unreadCounts,
}) => {
  return (
    <aside
      className={`sidebar${isOpen ? ' open' : ''}`}
      role="complementary"
      aria-label="Communication sidebar"
      aria-hidden={!isOpen}
    >
      {/* Tab bar */}
      <div className="sidebarTabBar">
        {(Object.keys(TAB_LABELS) as SidebarTab[]).map((tab) => {
          const count = tab === 'inbox' ? unreadCounts.inbox : tab === 'planets' ? unreadCounts.planets : 0;
          return (
            <button
              key={tab}
              className={`sidebarTab${activeTab === tab ? ' active' : ''}`}
              onClick={() => onTabChange(tab)}
              aria-selected={activeTab === tab}
              role="tab"
            >
              {TAB_LABELS[tab]}
              {count > 0 && <span className="sidebarBadge">{count}</span>}
            </button>
          );
        })}
        <button
          className="sidebarCloseBtn"
          onClick={onClose}
          aria-label="Close sidebar"
          title="Close"
        >
          <IconX size={ICON_SIZES.lg} />
        </button>
      </div>

      {/* Content */}
      <div className={`sidebarBody${activeTab ? ` ${activeTab}` : ''}`}>
        {children}
      </div>
    </aside>
  );
};

export default Sidebar;
