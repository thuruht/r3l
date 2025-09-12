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
    const urlParams = new URLSearchParams(window.location.search);
    const requestedDrawerId = urlParams.get('id');
    const apiEndpoint = requestedDrawerId ? `/api/users/${requestedDrawerId}` : '/api/auth/validate';

    try {
      const response = await fetch(apiEndpoint, { credentials: 'include' });

      if (response.status === 401) {
        showLoginPrompt();
        return false;
      }
      if (response.status === 404) {
        showNotFoundMessage();
        return false;
      }
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      userData = requestedDrawerId ? data : data.user;

      if (!userData) {
          throw new Error('Invalid user data received');
      }

      // If viewing someone else's drawer, disable editing
      if (requestedDrawerId) {
        communique.contentEditable = "false";
        lurkerMode.disabled = true;
        document.title = `${userData.display_name || userData.username}'s Drawer - R3L:F`;
        const drawerTitle = document.querySelector('.drawer-title h1');
        if (drawerTitle) {
          drawerTitle.innerHTML = `<span class="material-icons" aria-hidden="true">folder_shared</span> ${userData.display_name || userData.username}'s Drawer`;
        }
      }

      return true;
    } catch (error) {
      displayError(errorContainer, 'Could not load drawer information.', generateRefCode('FE-DRWR-001'));
      return false;
    }
  }

  function showLoginPrompt() {
    drawerContainer.innerHTML = `
      <div class="login-prompt">
        <h2>Authentication Required</h2>
        <p>You need to be logged in to view this drawer.</p>
        <div class="mt-4"><a href="./auth/login.html" class="btn"><span class="material-icons">login</span> Log In</a></div>
      </div>
    `;
    document.querySelectorAll('.card, .rpc-container').forEach(el => el.style.display = 'none');
  }

  function showNotFoundMessage() {
    drawerContainer.innerHTML = `
      <div class="not-found-message">
        <h2>Drawer Not Found</h2>
        <p>The drawer you're looking for doesn't exist or you don't have permission to view it.</p>
        <a href="./index.html" class="btn"><span class="material-icons">home</span> Return to Home</a>
      </div>
    `;
    document.querySelectorAll('.card, .rpc-container').forEach(el => el.style.display = 'none');
  }

  // Initialize UI with user data
  function initUserData() {
    if (!userData) return;

    userName.textContent = userData.display_name || userData.username;

    // Format joined date
    const joinedDate = userData.created_at ?
      formatDate(userData.created_at) :
      'Recently';
    userJoined.textContent = joinedDate;

    // Set avatar if available
    const userAvatar = document.getElementById('user-avatar');
    if (userData.avatar_url) {
      userAvatar.src = userData.avatar_url;
      // Reset any custom styling
      userAvatar.style = '';
      userAvatar.innerHTML = '';
    } else if (userData.avatar_key) {
      userAvatar.src = `/api/files/${userData.avatar_key}`;
      // Reset any custom styling
      userAvatar.style = '';
      userAvatar.innerHTML = '';
    } else {
      // Create an avatar with the first letter of the display name
      const initial = (userData.display_name || userData.username || '?').charAt(0).toUpperCase();

      // Create an initial-based avatar
      userAvatar.src = '';  // Clear the src
      userAvatar.style.display = 'flex';
      userAvatar.style.alignItems = 'center';
      userAvatar.style.justifyContent = 'center';
      userAvatar.style.fontSize = '2rem';
      userAvatar.style.color = 'white';
      userAvatar.style.backgroundColor = '#6d28d9';
      userAvatar.innerHTML = initial;
    }

    // Set communique if available
    if (userData.preferences && userData.preferences.communique) {
      communique.innerHTML = userData.preferences.communique;
    }

    // Set lurker mode if available
    if (userData.preferences && userData.preferences.lurker_mode !== undefined) {
      lurkerMode.checked = userData.preferences.lurker_mode;
      updateLurkerStatus();
    }

    // Fetch user stats
    fetchUserStats();
  }

  // Fetch user stats
  async function fetchUserStats() {
    if (!userData) return;

    try {
      const response = await fetch(`/api/users/${userData.id}/stats`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Stats API Error: ${response.status}`);
      }

      const stats = await response.json();

      filesCount.textContent = stats.total_files || 0;
      archivedCount.textContent = stats.archived_files || 0;
      connectionsCount.textContent = stats.connections || 0;
    } catch (error) {
      const statsContainer = document.querySelector('.flex.gap-4.mb-4');
      displayError(statsContainer, 'Could not load user stats.', generateRefCode('FE-DRWR-002'));
    }
  }

  // Update lurker mode status display
  function updateLurkerStatus() {
    if (lurkerMode.checked) {
      lurkerStatus.textContent = 'Active';
      lurkerStatus.classList.add('active');
    } else {
      lurkerStatus.textContent = 'Inactive';
      lurkerStatus.classList.remove('active');
    }
  }

  // Save lurker mode preference
  async function saveLurkerMode() {
    if (!userData) return;
    try {
      const response = await fetch(`/api/users/${userData.id}/preferences`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ lurker_mode: lurkerMode.checked }),
      });
      if (!response.ok) throw new Error('Failed to save lurker mode preference.');
    } catch (error) {
      displayError(errorContainer, error.message, generateRefCode('FE-DRWR-003'));
    }
  }

  // Save communique content
  async function saveCommunique() {
    if (!userData) return;
    try {
      const sanitizedHtml = DOMPurify.sanitize(communique.innerHTML);
      communique.innerHTML = sanitizedHtml;

      const response = await fetch(`/api/users/${userData.id}/preferences`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ communique: sanitizedHtml }),
      });
      if (!response.ok) throw new Error('Failed to save communique.');
    } catch (error) {
      displayError(errorContainer, error.message, generateRefCode('FE-DRWR-004'));
    }
  }

  // Load user files
  async function loadFiles(filter = 'all') {
    if (!userData) return;

    currentFilter = filter;
    loadingPlaceholder.classList.remove('hidden');
    fileGrid.classList.add('hidden');
    emptyState.classList.add('hidden');
    pagination.classList.add('hidden');

    try {
      const response = await fetch(`/api/users/${userData.id}/files?filter=${filter}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const result = await response.json();
      userFiles = result.files || [];

      const searchQuery = fileSearch.value.toLowerCase().trim();
      if (searchQuery) {
        userFiles = userFiles.filter(file =>
          file.name.toLowerCase().includes(searchQuery)
        );
      }

      loadingPlaceholder.classList.add('hidden');

      if (userFiles.length === 0) {
        displayEmptyState(emptyState, 'You have no files matching this filter.', null);
        emptyState.classList.remove('hidden');
      } else {
        displayFiles();
      }
    } catch (error) {
      loadingPlaceholder.classList.add('hidden');
      displayError(filesContainer, 'Could not load your files.', generateRefCode('FE-DRWR-005'));
    }
  }

  // Display files in the grid
  function displayFiles() {
    // Clear existing files
    fileGrid.innerHTML = '';

    // Calculate pagination
    const filesPerPage = 20;
    const startIndex = (currentPage - 1) * filesPerPage;
    const endIndex = startIndex + filesPerPage;
    const paginatedFiles = userFiles.slice(startIndex, endIndex);

    // Create file items
    paginatedFiles.forEach(file => {
      const template = document.getElementById('file-item-template');
      const fileItem = template.content.cloneNode(true);

      // Set file icon
      const iconElement = fileItem.querySelector('.file-icon .material-icons');
      iconElement.textContent = getFileIcon(file.type);

      // Set file name
      const nameElement = fileItem.querySelector('.file-name');
      nameElement.textContent = file.name;

      // Set file expiry
      const expiryElement = fileItem.querySelector('.file-expiry');
      expiryElement.textContent = formatTimeRemaining(file.expires_at);

      // Add data attributes for filtering
      const itemElement = fileItem.querySelector('.file-item');
      itemElement.dataset.id = file.id;
      itemElement.dataset.public = file.is_public ? 'true' : 'false';
      itemElement.dataset.archived = file.is_archived ? 'true' : 'false';

      // Add click handler
      itemElement.addEventListener('click', () => {
        window.location.href = `./content.html?id=${file.id}`;
      });

      // Add to grid
      fileGrid.appendChild(fileItem);
    });

    fileGrid.classList.remove('hidden');

    // Show pagination if needed
    if (userFiles.length > filesPerPage) {
      pagination.classList.remove('hidden');
      updatePagination();
    }
  }

  // Update pagination controls
  function updatePagination() {
    const filesPerPage = 20;
    const totalPages = Math.ceil(userFiles.length / filesPerPage);

    pageIndicator.textContent = `Page ${currentPage} of ${totalPages}`;

    // Enable/disable prev/next buttons
    prevPage.disabled = currentPage === 1;
    nextPage.disabled = currentPage === totalPages;
  }

  // Initialize event listeners
  function initEventListeners() {
    const previewBtn = document.getElementById('preview-drawer-btn');
    if (previewBtn) {
      previewBtn.addEventListener('click', () => {
        if (userData) {
          window.open(`/drawer.html?id=${userData.id}&preview=true`, '_blank');
        }
      });
    }

    // Lurker mode toggle
    lurkerMode.addEventListener('change', () => {
      updateLurkerStatus();
      saveLurkerMode();
    });

    // Toggle communique preview
    const togglePreviewBtn = document.getElementById('toggle-preview');
    const communiquePreview = document.getElementById('communique-preview');

    togglePreviewBtn.addEventListener('click', () => {
      const isPreviewMode = communique.classList.contains('hidden');

      if (isPreviewMode) {
        // Switch to edit mode
        communique.classList.remove('hidden');
        communiquePreview.classList.add('hidden');
        togglePreviewBtn.innerHTML = '<span class="material-icons">visibility</span> Preview';
      } else {
        // Switch to preview mode - sanitize and render the content
        const sanitizedHtml = DOMPurify.sanitize(communique.innerHTML, {
          ALLOWED_TAGS: [
            // Basic formatting
            'p', 'br', 'hr', 'div', 'span',
            // Typography
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'b', 'strong', 'i', 'em', 'u', 'del', 'strike', 'small', 'mark',
            // Lists
            'ul', 'ol', 'li', 'dl', 'dt', 'dd',
            // Links and media
            'a', 'img', 'figure', 'figcaption',
            // Quotes
            'blockquote', 'cite', 'q',
            // Code
            'pre', 'code', 'samp',
            // Tables (simple ones)
            'table', 'thead', 'tbody', 'tr', 'th', 'td'
          ],
          ALLOWED_ATTR: [
            'href', 'target', 'rel', 'src', 'alt', 'title', 'width', 'height',
            'class', 'style', 'id', 'cite'
          ],
          FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form'],
          FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover']
        });

        communiquePreview.innerHTML = sanitizedHtml || '<p class="text-muted">No content yet. Add your communique in edit mode.</p>';
        communique.classList.add('hidden');
        communiquePreview.classList.remove('hidden');
        togglePreviewBtn.innerHTML = '<span class="material-icons">edit</span> Edit';
      }
    });

    // Tab buttons
    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        // Update active tab
        tabButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        // Reset to page 1
        currentPage = 1;

        // Load files with appropriate filter
        const filter = button.id.replace('tab-', '');
        loadFiles(filter);
      });
    });

    // Refresh button
    btnRefresh.addEventListener('click', () => {
      loadFiles(currentFilter);
    });

    // Search input
    fileSearch.addEventListener('keyup', (e) => {
      if (e.key === 'Enter') {
        // Reset to page 1
        currentPage = 1;
        loadFiles(currentFilter);
      }
    });

    // Pagination
    prevPage.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        displayFiles();
      }
    });

    nextPage.addEventListener('click', () => {
      const filesPerPage = 20;
      const totalPages = Math.ceil(userFiles.length / filesPerPage);

      if (currentPage < totalPages) {
        currentPage++;
        displayFiles();
      }
    });

    // Communique edits
    communique.addEventListener('blur', () => {
      saveCommunique();
    });

    // Communique editor toolbar
    document.getElementById('format-bold').addEventListener('click', () => {
      document.execCommand('bold', false, null);
      communique.focus();
    });

    document.getElementById('format-italic').addEventListener('click', () => {
      document.execCommand('italic', false, null);
      communique.focus();
    });

    document.getElementById('format-underline').addEventListener('click', () => {
      document.execCommand('underline', false, null);
      communique.focus();
    });

    document.getElementById('format-link').addEventListener('click', () => {
      const url = prompt('Enter the URL:', 'https://');
      if (url) {
        // Sanitize the URL
        const sanitizedUrl = DOMPurify.sanitize(url);
        document.execCommand('createLink', false, sanitizedUrl);
      }
      communique.focus();
    });

    document.getElementById('format-image').addEventListener('click', () => {
      const url = prompt('Enter the image URL:', 'https://');
      if (url) {
        // Sanitize the URL
        const sanitizedUrl = DOMPurify.sanitize(url);
        document.execCommand('insertHTML', false, `<img src="${sanitizedUrl}" alt="Image" style="max-width: 100%;">`);
      }
      communique.focus();
    });

    document.getElementById('format-embed').addEventListener('click', async () => {
      try {
        // Get user's files to embed
        const response = await fetch(`/api/users/${userData.id}/files?filter=public`, {
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch files: ${response.status}`);
        }

        const result = await response.json();
        const embedFiles = result.files || [];

        if (embedFiles.length === 0) {
          alert('You have no public files to embed. Upload and make some files public first.');
          return;
        }

        // Create a simple modal to select a file
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
          <div class="modal-content">
            <div class="modal-header">
              <h3>Select a file to embed</h3>
              <button class="close-btn">&times;</button>
            </div>
            <div class="modal-body">
              <div class="embed-file-list">
                ${embedFiles.map(file => `
                  <div class="embed-file-item" data-id="${file.id}">
                    <span class="material-icons">${getFileIcon(file.mime_type)}</span>
                    <span>${file.name}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        `;

        document.body.appendChild(modal);

        // Handle close button
        modal.querySelector('.close-btn').addEventListener('click', () => {
          modal.remove();
        });

        // Handle file selection
        modal.querySelectorAll('.embed-file-item').forEach(item => {
          item.addEventListener('click', () => {
            const fileId = item.getAttribute('data-id');
            const file = embedFiles.find(f => f.id === fileId);

            if (file) {
              const fileUrl = `/api/content/${file.id}`;

              // Create embed HTML based on file type
              let embedHtml = '';

              if (file.mime_type.startsWith('image/')) {
                embedHtml = `<img src="${fileUrl}" alt="${file.name}" style="max-width: 100%;">`;
              } else if (file.mime_type.startsWith('audio/')) {
                embedHtml = `<audio src="${fileUrl}" controls style="width: 100%;">Your browser does not support audio playback.</audio>`;
              } else if (file.mime_type.startsWith('video/')) {
                embedHtml = `<video src="${fileUrl}" controls style="max-width: 100%;">Your browser does not support video playback.</video>`;
              } else if (file.mime_type === 'application/pdf') {
                embedHtml = `<iframe src="${fileUrl}" style="width: 100%; height: 400px; border: 1px solid #ddd;"></iframe>`;
              } else {
                // Generic file link
                embedHtml = `<a href="${fileUrl}" target="_blank" class="file-embed">
                  <span class="material-icons">${getFileIcon(file.mime_type)}</span>
                  ${file.name}
                </a>`;
              }

              document.execCommand('insertHTML', false, embedHtml);
            }

            modal.remove();
            communique.focus();
          });
        });

      } catch (error) {
        console.error('Error embedding file:', error);
        alert('Failed to load files for embedding. Please try again.');
      }
    });

    document.getElementById('save-communique').addEventListener('click', () => {
      saveCommunique();
      alert('Communique saved successfully!');
    });
  }

  // Initialize the page
  async function init() {
    const urlParams = new URLSearchParams(window.location.search);
    const isPreview = urlParams.get('preview') === 'true';

    // Check if user is authenticated
    const isAuthenticated = await checkAuthentication();

    if (isAuthenticated) {
      initUserData();
      initEventListeners();

      if (isPreview) {
        // Enter preview mode
        document.querySelectorAll('#communique-toolbar, #lurker-mode-toggle, small, #preview-drawer-btn').forEach(el => el.classList.add('hidden'));
        communique.contentEditable = "false";
        loadFiles('public'); // Only show public files in preview
        // Disable file filter tabs
        tabButtons.forEach(btn => {
          if (btn.id !== 'tab-public') {
            btn.disabled = true;
          }
        });
      } else {
        loadFiles('all');
      }
    }
  }

  init();
});
