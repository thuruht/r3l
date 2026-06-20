import React from 'react';
import { IconX } from '@tabler/icons-react';
import { ICON_SIZES } from '@/constants/iconSizes';
import { TAB_CONFIG } from '@/constants/navigationTabs';
import type { SidebarTab } from '@/hooks/useSidebar';
import '@/styles/Sidebar.css';

interface SidebarProps {
  isOpen: boolean;
  activeTab: SidebarTab | null;
  onTabChange: (tab: SidebarTab) => void;
  onClose: () => void;
  children: React.ReactNode;
  unreadCounts: { inbox: number; planets: number; history?: number };
  tabLocation?: 'header' | 'sidebar';
}

const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  activeTab,
  onTabChange,
  onClose,
  children,
  unreadCounts,
  tabLocation,
}) => {
  return (
    <aside
      className={`sidebar${isOpen ? ' open' : ''}`}
      role="complementary"
      aria-label="Communication sidebar"
      aria-hidden={!isOpen}
    >
      {/* Tab bar */}
      {tabLocation !== 'header' && (
        <div className="sidebarTabBar">
          {(Object.keys(TAB_CONFIG) as SidebarTab[]).map((tab) => {
            const { label, Icon } = TAB_CONFIG[tab];
            const count = tab === 'inbox' ? unreadCounts.inbox : tab === 'planets' ? unreadCounts.planets : 0;
            return (
              <button
                key={tab}
                className={`sidebarTab${activeTab === tab ? ' active' : ''}`}
                onClick={() => onTabChange(tab)}
                aria-selected={activeTab === tab}
                aria-label={count > 0 ? `${label}, ${count} unread` : label}
                role="tab"
                title={label}
              >
                <Icon size={ICON_SIZES.lg} aria-hidden={true} />
                <span className="sidebarTabLabel">{label}</span>
                {count > 0 && <span className="sidebarBadge" aria-hidden="true">{count}</span>}
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
      )}

      {/* Content */}
      <div className={`sidebarBody${activeTab ? ` ${activeTab}` : ''}`}>
        {children}
      </div>
    </aside>
  );
};

export default Sidebar;
