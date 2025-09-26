import { NavigationBar } from './components/navigation.js';
import { displayError, displayEmptyState } from './utils/ui-helpers.js';

document.addEventListener('DOMContentLoaded', () => {
  NavigationBar.init('drawer');

  // --- UI Element Selectors ---
  const errorContainer = document.getElementById('error-container');
  const drawerContainer = document.querySelector('.drawer-container');
  const authPrompt = document.getElementById('auth-prompt');

  const userNameEl = document.getElementById('user-name');
  const userAvatarEl = document.getElementById('user-avatar');
  const userJoinedEl = document.getElementById('user-joined');
  const editNameBtn = document.getElementById('edit-name-btn');
  const saveNameBtn = document.getElementById('save-name-btn');
  const avatarUploadInput = document.getElementById('avatar-upload');
  const avatarUploadLabel = document.querySelector('label[for="avatar-upload"]');

  const filesCountEl = document.getElementById('files-count');
  const archivedCountEl = document.getElementById('archived-count');
  const connectionsCountEl = document.getElementById('connections-count');

  const communiqueEditor = document.getElementById('communique');
  const saveCommuniqueBtn = document.getElementById('save-communique');

  const themeSelector = document.getElementById('theme-selector');

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
  const formatTimeRemaining = (expiryTimestamp) => {
    if (!expiryTimestamp) return '∞';
    const diff = new Date(expiryTimestamp) - Date.now();
    if (diff <= 0) return 'Expired';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    return days < 1 ? '<1d' : `${days}d`;
  };

  // --- Core Functions ---

  const init = async () => {
    if (!window.r3l || !window.r3l.isAuthenticated()) {
        drawerContainer.classList.add('hidden');
        if (authPrompt) authPrompt.classList.remove('hidden');
        return;
    }

    try {
      currentUser = await window.r3l.apiGet(window.r3l.API_ENDPOINTS.AUTH.PROFILE);
      drawerContainer.classList.remove('hidden');
      if (authPrompt) authPrompt.classList.add('hidden');
      
      populateUserInfo(currentUser);
      fetchAndRenderFiles();
      fetchUserStats();

    } catch (error) {
      console.error('Initialization failed:', error);
      drawerContainer.classList.add('hidden');
      displayError(errorContainer, 'You must be logged in to view your drawer.', 'FE-DRWR-AUTH');
    }
  };

  const applyTheme = (theme) => {
    const root = document.documentElement;
    if (theme === 'system') {
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark-theme', systemPrefersDark);
    } else {
      root.classList.toggle('dark-theme', theme === 'dark');
    }
  };

  const populateUserInfo = (user) => {
    userNameEl.textContent = user.displayName || 'Anonymous';
    userJoinedEl.textContent = formatDate(user.created_at);
    if (user.avatarKey) {
      userAvatarEl.src = `/api/files/${user.avatarKey}`;
    }
    if (user.preferences && user.preferences.communique) {
        communiqueEditor.innerHTML = user.preferences.communique;
    }
    const currentTheme = (user.preferences && user.preferences.theme) || 'system';
    themeSelector.value = currentTheme;
    applyTheme(currentTheme);
  };

  const fetchUserStats = async () => {
    try {
      const stats = await window.r3l.apiGet(window.r3l.API_ENDPOINTS.USER.STATS);
      filesCountEl.textContent = stats.content_count || 0;
      archivedCountEl.textContent = stats.archived_count || 0;
      connectionsCountEl.textContent = stats.connection_count || 0;
    } catch (e) {
      console.error('Failed to load stats', e);
    }
  };

  const fetchAndRenderFiles = async () => {
    loadingPlaceholder.classList.remove('hidden');
    fileGrid.classList.add('hidden');
    emptyState.classList.add('hidden');

    try {
      const params = new URLSearchParams({
        filter: currentFilter,
        page: currentPage,
        query: currentSearchQuery,
      });
      const data = await window.r3l.apiGet(`${window.r3l.API_ENDPOINTS.USER.FILES}?${params}`);
      
      renderFiles(data.files);
      renderPagination(data.page, data.totalPages);

    } catch (error) {
      console.error('Error fetching files:', error);
      displayError(errorContainer, 'Could not load your files.', 'FE-DRWR-FILES');
    } finally {
      loadingPlaceholder.classList.add('hidden');
    }
  };

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
      const statusText = file.archive_status !== 'active' ? 'Archived' : formatTimeRemaining(file.expires_at);
      fileItem.innerHTML = `<div class="file-icon"><span class="material-icons">${icon}</span></div><div class="file-name" title="${file.title}">${file.title}</div><div class="file-expiry" title="Status">${statusText}</div>`;
      fileGrid.appendChild(fileItem);
    });
    fileGrid.classList.remove('hidden');
  };

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
  tabButtons.forEach(button => button.addEventListener('click', () => {
    currentFilter = button.id.replace('tab-', '');
    currentPage = 1;
    currentSearchQuery = '';
    fileSearchInput.value = '';
    fetchAndRenderFiles();
    tabButtons.forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
  }));
  prevPageBtn.addEventListener('click', () => { if (currentPage > 1) { currentPage--; fetchAndRenderFiles(); } });
  nextPageBtn.addEventListener('click', () => { if (currentPage < totalPages) { currentPage++; fetchAndRenderFiles(); } });
  refreshBtn.addEventListener('click', fetchAndRenderFiles);
  fileSearchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { currentSearchQuery = e.target.value; currentPage = 1; fetchAndRenderFiles(); } });
  saveCommuniqueBtn.addEventListener('click', async () => {
    try {
      await window.r3l.apiPost(window.r3l.API_ENDPOINTS.USER.PREFERENCES, { communique: communiqueEditor.innerHTML });
    } catch (error) { displayError(errorContainer, 'Failed to save communique.', 'FE-DRWR-SAVE'); }
  });
  themeSelector.addEventListener('change', async (e) => {
    const newTheme = e.target.value;
    applyTheme(newTheme);
    try {
      await window.r3l.apiPost(window.r3l.API_ENDPOINTS.USER.PREFERENCES, { theme: newTheme });
    } catch (error) { displayError(errorContainer, 'Failed to save theme preference.', 'FE-DRWR-THEME'); }
  });
  editNameBtn.addEventListener('click', () => { userNameEl.contentEditable = true; userNameEl.focus(); editNameBtn.classList.add('hidden'); saveNameBtn.classList.remove('hidden'); });
  saveNameBtn.addEventListener('click', async () => {
    const newName = userNameEl.textContent;
    userNameEl.contentEditable = false;
    editNameBtn.classList.remove('hidden');
    saveNameBtn.classList.add('hidden');
    try {
      await window.r3l.apiPost(window.r3l.API_ENDPOINTS.USER.PROFILE, { displayName: newName });
    } catch (error) { displayError(errorContainer, 'Failed to save display name.', 'FE-DRWR-NAME'); userNameEl.textContent = currentUser.displayName; }
  });
  avatarUploadLabel.addEventListener('click', () => avatarUploadInput.click());
  avatarUploadInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const uploadResult = await window.r3l.authenticatedFetch(window.r3l.API_ENDPOINTS.FILES.AVATAR, { method: 'POST', body: formData, headers: { 'Content-Type': null } });
      const { avatarKey } = await uploadResult.json();
      await window.r3l.apiPost(window.r3l.API_ENDPOINTS.USER.PROFILE, { avatarKey });
      userAvatarEl.src = `/api/files/${avatarKey}`;
      currentUser.avatarKey = avatarKey;
    } catch (error) { displayError(errorContainer, 'Failed to upload avatar.', 'FE-DRWR-AVATAR'); }
  });

  init();
});