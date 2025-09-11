import { NavigationBar } from './components/navigation.js';
import { generateRefCode, displayEmptyState } from './utils/ui-helpers.js';

document.addEventListener('DOMContentLoaded', () => {
  // Initialize the navigation bar
  NavigationBar.init('drawer');

  // UI Elements
  const userName = document.getElementById('user-name');
  const userJoined = document.getElementById('user-joined');
  const filesCount = document.getElementById('files-count');
  const archivedCount = document.getElementById('archived-count');
  const connectionsCount = document.getElementById('connections-count');
  const lurkerMode = document.getElementById('lurker-mode');
  const lurkerStatus = document.getElementById('lurker-status');
  const communique = document.getElementById('communique');
  const fileGrid = document.getElementById('file-grid');
  const loadingPlaceholder = document.getElementById('loading-placeholder');
  const emptyState = document.getElementById('empty-state');
  const pagination = document.getElementById('pagination');
  const prevPage = document.getElementById('prev-page');
  const nextPage = document.getElementById('next-page');
  const pageIndicator = document.getElementById('page-indicator');
  const tabButtons = document.querySelectorAll('[id^="tab-"]');
  const fileSearch = document.getElementById('file-search');
  const btnRefresh = document.getElementById('btn-refresh');
  const connectionRequestsContainer = document.getElementById('connection-requests');
  const rpcItemsContainer = document.getElementById('rpc-items');

  // File icon mapping
  const fileIcons = {
    'image/': 'image',
    'audio/': 'audiotrack',
    'video/': 'videocam',
    'application/pdf': 'picture_as_pdf',
    'application/zip': 'folder_zip',
    'text/plain': 'text_snippet',
    'application/json': 'data_object',
    'text/csv': 'table_chart',
    'application/x-ipynb+json': 'code',
    'text/markdown': 'article',
    'text/html': 'html',
    'application/msword': 'description',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'description',
    'default': 'insert_drive_file'
  };

  // State variables
  let userData = null;
  let currentPage = 1;
  let currentFilter = 'all';
  let userFiles = [];

  // Format date for display
  function formatDate(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  // Format time remaining until expiry
  function formatTimeRemaining(expiryTimestamp) {
    if (!expiryTimestamp) return 'Archived';

    const now = Date.now();
    const diff = expiryTimestamp - now;

    if (diff <= 0) return 'Expired';

    const days = Math.floor(diff / (24 * 60 * 60 * 1000));

    if (days === 0) return '<1d';
    return days + 'd';
  }

  // Get icon for file type
  function getFileIcon(fileType) {
    for (const type in fileIcons) {
      if (fileType && fileType.startsWith(type)) {
        return fileIcons[type];
      }
    }
    return fileIcons.default;
  }

  // Check if the user is authenticated
  async function checkAuthentication() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const requestedDrawerId = urlParams.get('id');

      const response = await fetch('/api/auth/jwt/profile', { credentials: 'include' });

      if (!response.ok) {
        showLoginPrompt();
        return false;
      }

      const data = await response.json();
      userData = data;
      return true;
    } catch (error) {
      console.error('Authentication check failed:', error);
      showLoginPrompt();
      return false;
    }
  }

  function showLoginPrompt() {
    // ... (implementation remains the same)
  }

  function showNotFoundMessage() {
    // ... (implementation remains the same)
  }

  function initUserData() {
    if (!userData) return;

    userName.textContent = userData.displayName || userData.username;
    userJoined.textContent = formatDate(userData.createdAt);

    const userAvatar = document.getElementById('user-avatar');
    if (userData.avatarUrl) {
      userAvatar.src = userData.avatarUrl;
    } else if (userData.avatar_key) {
      userAvatar.src = `/api/files/${userData.avatar_key}`;
    } else {
      const initial = (userData.displayName || userData.username || '?').charAt(0).toUpperCase();
      userAvatar.src = '';
      userAvatar.style.display = 'flex';
      userAvatar.style.alignItems = 'center';
      userAvatar.style.justifyContent = 'center';
      userAvatar.style.fontSize = '2rem';
      userAvatar.style.color = 'white';
      userAvatar.style.backgroundColor = '#6d28d9';
      userAvatar.innerHTML = initial;
    }

    if (userData.preferences && userData.preferences.communique) {
      communique.innerHTML = userData.preferences.communique;
    }

    if (userData.preferences && userData.preferences.lurker_mode !== undefined) {
      lurkerMode.checked = userData.preferences.lurker_mode;
      updateLurkerStatus();
    }

    fetchUserStats();
    fetchConnectionRequests();
    fetchRpcItems();
  }

  async function fetchUserStats() {
    if (!userData) return;

    try {
      const response = await fetch(`/api/users/${userData.id}/stats`, { credentials: 'include' });
      if (!response.ok) throw new Error(`Failed to fetch stats: ${response.status}`);
      const stats = await response.json();
      filesCount.textContent = stats.total_files || 0;
      archivedCount.textContent = stats.archived_files || 0;
      connectionsCount.textContent = stats.connections || 0;
    } catch (error) {
      const refCode = generateRefCode('STATS-LOAD-ERR');
      console.error(`Error fetching user stats: ${error}. Ref: ${refCode}`);
      filesCount.textContent = '-';
      archivedCount.textContent = '-';
      connectionsCount.textContent = '-';
    }
  }

  async function fetchConnectionRequests() {
      if (!userData) return;
      try {
          const response = await fetch('/api/connections/requests?direction=incoming', { credentials: 'include' });
          if (!response.ok) throw new Error(`Failed to fetch connection requests: ${response.status}`);
          const { requests } = await response.json();
          if (requests && requests.length > 0) {
              // Render requests
          } else {
              const refCode = generateRefCode('CONN-REQ-EMPTY');
              displayEmptyState(connectionRequestsContainer, "No pending connection requests.", refCode);
          }
      } catch (error) {
          const refCode = generateRefCode('CONN-REQ-ERR');
          displayEmptyState(connectionRequestsContainer, "Could not load connection requests.", refCode);
          console.error(`Error fetching connection requests: ${error}. Ref: ${refCode}`);
      }
  }

  async function fetchRpcItems() {
      if (!userData) return;
      // This is a placeholder as there is no direct API endpoint for "Recent Private Cache"
      const refCode = generateRefCode('RPC-EMPTY');
      displayEmptyState(rpcItemsContainer, "Your private cache is empty.", refCode);
  }

  function updateLurkerStatus() {
    // ... (implementation remains the same)
  }

  async function saveLurkerMode() {
    // ... (implementation remains the same)
  }

  async function saveCommunique() {
    // ... (implementation remains the same)
  }

  async function loadFiles(filter = 'all') {
    if (!userData) return;

    loadingPlaceholder.classList.remove('hidden');
    fileGrid.classList.add('hidden');
    emptyState.classList.add('hidden');
    pagination.classList.add('hidden');

    try {
      const response = await fetch(`/api/users/${userData.id}/files?filter=${filter}`, { credentials: 'include' });
      if (!response.ok) throw new Error(`Failed to fetch files: ${response.status}`);

      const result = await response.json();
      userFiles = result.files || [];

      const searchQuery = fileSearch.value.toLowerCase().trim();
      if (searchQuery) {
        userFiles = userFiles.filter(file => file.name.toLowerCase().includes(searchQuery));
      }

      loadingPlaceholder.classList.add('hidden');

      if (userFiles.length === 0) {
        const refCode = generateRefCode('FILES-EMPTY');
        displayEmptyState(emptyState, "No files found for this filter.", refCode);
        emptyState.classList.remove('hidden');
      } else {
        displayFiles();
      }
    } catch (error) {
      const refCode = generateRefCode('FILES-LOAD-ERR');
      displayEmptyState(loadingPlaceholder, "Could not load files.", refCode);
      console.error(`Error loading files: ${error}. Ref: ${refCode}`);
    }
  }

  function displayFiles() {
    // ... (implementation remains the same)
  }

  function updatePagination() {
    // ... (implementation remains the same)
  }

  function initEventListeners() {
    // ... (implementation remains the same)
  }

  async function init() {
    const urlParams = new URLSearchParams(window.location.search);
    const isPreviewMode = urlParams.get('preview') === 'true';

    const isAuthenticated = await checkAuthentication();
    if (isAuthenticated) {
      initUserData();
      initEventListeners();
      loadFiles('all');

      if (isPreviewMode) {
        document.getElementById('communique-toolbar').style.display = 'none';
        document.querySelector('.lurker-mode-toggle').style.display = 'none';
        document.getElementById('file-management-section').style.display = 'none';
        communique.setAttribute('contenteditable', 'false');
      }
    }
  }

  init();
});
