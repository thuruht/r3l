import { NavigationBar } from './components/navigation.js';
import { apiGet, API_ENDPOINTS } from './utils/api-helper.js';
import { displayError, displayEmptyState, generateRefCode } from './utils/ui-helpers.js';

document.addEventListener('DOMContentLoaded', () => {
  // NOTE: NavigationBar is initialized in drawer.html, so we don't call it here.

  // --- UI Element Selectors ---
  const errorContainer = document.getElementById('error-container');
  const drawerContainer = document.querySelector('.drawer-container');
  const authPrompt = document.getElementById('auth-prompt'); // Assuming this exists for unauth users

  // User info
  const userNameEl = document.getElementById('user-name');
  const userAvatarEl = document.getElementById('user-avatar');
  const userJoinedEl = document.getElementById('user-joined');

  // Stats
  const filesCountEl = document.getElementById('files-count');
  const archivedCountEl = document.getElementById('archived-count');
  const connectionsCountEl = document.getElementById('connections-count');

  // Communique
  const communiqueEditor = document.getElementById('communique');
  const saveCommuniqueBtn = document.getElementById('save-communique');

  // File Management
  const fileGrid = document.getElementById('file-grid');
  const loadingPlaceholder = document.getElementById('loading-placeholder');
  const emptyState = document.getElementById('empty-state');
  const pagination = document.getElementById('pagination');
  const prevPageBtn = document.getElementById('prev-page');
  const nextPageBtn = document.getElementById('next-page');
  const pageIndicator = document.getElementById('page-indicator');
  const tabButtons = document.querySelectorAll('[id^="tab-"]');
  const fileSearchInput = document.getElementById('file-search');
  const refreshBtn = document.getElementById('btn-refresh');

  // --- State Variables ---
  let currentUser = null;
  let currentPage = 1;
  let totalPages = 1;
  let currentFilter = 'all';
  let currentSearchQuery = '';

  // --- Helper Functions ---
  const formatDate = (timestamp) => new Date(timestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} bytes`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };
   const formatTimeRemaining = (expiryTimestamp) => {
    if (!expiryTimestamp) return '∞';
    const diff = new Date(expiryTimestamp) - Date.now();
    if (diff <= 0) return 'Expired';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    return days < 1 ? '<1d' : `${days}d`;
  };

  // --- Core Functions ---

  /**
   * Checks authentication and fetches initial user data.
   * This is the entry point for the page's dynamic content.
   */
  const init = async () => {
    try {
      const data = await apiGet(API_ENDPOINTS.AUTH.PROFILE);
      if (data.error) {
        throw new Error('Not authenticated');
      }
      currentUser = data;
      drawerContainer.classList.remove('hidden');
      if (authPrompt) authPrompt.classList.add('hidden');
      
      populateUserInfo(currentUser);
      fetchAndRenderFiles();
      fetchUserStats();

    } catch (error) {
      console.error('Initialization failed:', error);
      drawerContainer.classList.add('hidden');
      if (authPrompt) {
        authPrompt.classList.remove('hidden');
      } else {
        displayError(errorContainer, 'You must be logged in to view your drawer.', 'FE-DRWR-AUTH');
      }
    }
  };

  /**
   * Populates the user information section.
   */
  const populateUserInfo = (user) => {
    userNameEl.textContent = user.display_name || user.username;
    userJoinedEl.textContent = formatDate(user.created_at);
    if (user.avatar_key) {
      userAvatarEl.src = `/api/files/${user.avatar_key}`;
    }
    communiqueEditor.innerHTML = user.communique || '';
  };

  /**
   * Fetches user statistics.
   */
  const fetchUserStats = async () => {
    try {
      const stats = await apiGet(API_ENDPOINTS.USERS.STATS(currentUser.id));
      if (stats.error) return;
      filesCountEl.textContent = stats.content_count || 0;
      archivedCountEl.textContent = stats.archived_count || 0;
      connectionsCountEl.textContent = stats.connection_count || 0;
    } catch (e) {
      console.error('Failed to load stats', e);
    }
  };

  /**
   * Fetches and renders files based on current state (filter, page, search).
   */
  const fetchAndRenderFiles = async () => {
    loadingPlaceholder.classList.remove('hidden');
    fileGrid.classList.add('hidden');
    emptyState.classList.add('hidden');

    try {
      const params = {
        filter: currentFilter,
        page: currentPage,
        query: currentSearchQuery,
      };
      const data = await apiGet(API_ENDPOINTS.USERS.FILES(currentUser.id), params);
      
      if (data.error) throw new Error(data.error);

      renderFiles(data.files);
      renderPagination(data.page, data.totalPages);

    } catch (error) {
      console.error('Error fetching files:', error);
      displayError(errorContainer, 'Could not load your files.', 'FE-DRWR-FILES');
    } finally {
      loadingPlaceholder.classList.add('hidden');
    }
  };

  /**
   * Renders the file grid.
   */
  const renderFiles = (files) => {
    fileGrid.innerHTML = '';
    if (!files || files.length === 0) {
      emptyState.classList.remove('hidden');
      return;
    }

    const fileIcons = { 'image/': 'image', 'audio/': 'audiotrack', 'video/': 'videocam', 'application/pdf': 'picture_as_pdf', 'default': 'insert_drive_file' };
    
    files.forEach(file => {
      const iconName = Object.keys(fileIcons).find(key => file.type.startsWith(key)) || 'default';
      const icon = fileIcons[iconName];
      const fileItem = document.createElement('div');
      fileItem.className = 'file-item';
      fileItem.innerHTML = `
        <div class="file-icon"><span class="material-icons">${icon}</span></div>
        <div class="file-name" title="${file.title}">${file.title}</div>
        <div class="file-expiry" title="Expires">${formatTimeRemaining(file.expires_at)}</div>
      `;
      fileGrid.appendChild(fileItem);
    });
    fileGrid.classList.remove('hidden');
  };

  /**
   * Renders pagination controls.
   */
  const renderPagination = (page, total) => {
    currentPage = page;
    totalPages = total;
    if (totalPages <= 1) {
      pagination.classList.add('hidden');
      return;
    }
    pageIndicator.textContent = `Page ${currentPage} of ${totalPages}`;
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage >= totalPages;
    pagination.classList.remove('hidden');
  };

  // --- Event Listeners ---
  
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      currentFilter = button.id.replace('tab-', '');
      currentPage = 1;
      currentSearchQuery = '';
      fileSearchInput.value = '';
      fetchAndRenderFiles();
      tabButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
    });
  });

  prevPageBtn.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      fetchAndRenderFiles();
    }
  });

  nextPageBtn.addEventListener('click', () => {
    if (currentPage < totalPages) {
      currentPage++;
      fetchAndRenderFiles();
    }
  });

  refreshBtn.addEventListener('click', fetchAndRenderFiles);

  fileSearchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      currentSearchQuery = e.target.value;
      currentPage = 1;
      fetchAndRenderFiles();
    }
  });

  saveCommuniqueBtn.addEventListener('click', async () => {
    const content = communiqueEditor.innerHTML;
    try {
      const result = await apiPost(API_ENDPOINTS.USERS.UPDATE(currentUser.id), { communique: content });
      if (result.error) throw new Error(result.error);
      // You could add a success message here
    } catch (error) {
      displayError(errorContainer, 'Failed to save communique.', 'FE-DRWR-SAVE');
    }
  });

  // --- Initial Load ---
  init();
});
