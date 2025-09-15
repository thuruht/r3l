import { NavigationBar } from './components/navigation.js';
import { generateRefCode, displayEmptyState, displayError } from './utils/ui-helpers.js';

document.addEventListener('DOMContentLoaded', () => {
  // Initialize the navigation bar
  NavigationBar.init('drawer');

  // UI Elements
  const errorContainer = document.getElementById('error-container');
  const drawerContainer = document.querySelector('.drawer-container');
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

  // Format file size for display
  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
    else return (bytes / 1073741824).toFixed(1) + ' GB';
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