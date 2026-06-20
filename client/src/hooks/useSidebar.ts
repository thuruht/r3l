import { useState, useCallback } from 'react';

export type SidebarTab = 'inbox' | 'planets' | 'galaxy' | 'history' | 'bookmarks';

interface UseSidebarReturn {
  isOpen: boolean;
  activeTab: SidebarTab | null;
  openTab: (tab: SidebarTab) => void;
  close: () => void;
}

/**
 * Manages sidebar state with exclusive-open logic.
 * Only one tab can be active at a time; clicking the active tab toggles the sidebar closed.
 */
export function useSidebar(): UseSidebarReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<SidebarTab | null>(null);

  const openTab = useCallback((tab: SidebarTab) => {
    if (isOpen && activeTab === tab) {
      // Toggle off if clicking the already-active tab
      setIsOpen(false);
      setActiveTab(null);
    } else {
      setIsOpen(true);
      setActiveTab(tab);
    }
  }, [isOpen, activeTab]);

  const close = useCallback(() => {
    setIsOpen(false);
    setActiveTab(null);
  }, []);

  return { isOpen, activeTab, openTab, close };
}
