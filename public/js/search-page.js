import { NavigationBar } from './components/navigation.js';
import { generateRefCode, displayEmptyState, displayError } from './utils/ui-helpers.js';

document.addEventListener('DOMContentLoaded', () => {
  // Initialize the navigation bar
  NavigationBar.init('search');

  // UI Elements
  const searchForm = document.getElementById('search-form');
  const searchQuery = document.getElementById('search-query');
  const resultsContainer = document.getElementById('results-container');
  const resultsCount = document.getElementById('results-count');
  const loadingResults = document.getElementById('loading-results');
  const noResults = document.getElementById('no-results');
  const resultsGrid = document.getElementById('results-grid');
  const pagination = document.getElementById('pagination');
  const pageIndicator = document.getElementById('page-indicator');
  const prevPage = document.getElementById('prev-page');
  const nextPage = document.getElementById('next-page');
  const antiTrackingSearch = document.getElementById('anti-tracking-search');
  const antiTrackingStatus = document.getElementById('anti-tracking-status');

  // Current search state
  let currentPage = 1;
  let totalPages = 1;

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

  /**
   * Fetch search results from API with fallback + retry
   */
  async function fetchSearchResults(searchParams) {
    try {
      const endpoint = searchParams.antiTracking ? '/api/search/lurker' : '/api/search';

      // Build query params
      const params = new URLSearchParams();
      if (searchParams.query) params.append('q', searchParams.query);
      if (searchParams.sortBy) params.append('sort', searchParams.sortBy);

      params.append('limit', '20');
      params.append('offset', ((searchParams.page - 1) * 20).toString());

      // File types
      searchParams.fileTypes.forEach(type => params.append('type', type));

      // Time frame
      if (searchParams.timeFrame !== 'all') {
        const now = Date.now();
        let timeLimit;
        switch (searchParams.timeFrame) {
          case 'day': timeLimit = now - (24 * 60 * 60 * 1000); break;
          case 'week': timeLimit = now - (7 * 24 * 60 * 60 * 1000); break;
          case 'month': timeLimit = now - (30 * 24 * 60 * 60 * 1000); break;
        }
        if (timeLimit) params.append('date_start', timeLimit.toString());
      }

      // Anti-tracking randomness
      if (searchParams.antiTracking) params.append('randomness', '75');

      const response = await fetch(`${endpoint}?${params.toString()}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (!response.ok) {
        const isLoggedIn = document.cookie.includes('r3l_auth_state=true');
        if (isLoggedIn) {
          return await retryWithSimplifiedQuery(endpoint, searchParams);
        }
        return mockResults;
      }

      const data = await response.json();

      // Flexible handling of response formats
      if (data.results && Array.isArray(data.results)) return data.results;
      if (Array.isArray(data)) return data;
      if (data && typeof data === 'object') {
        for (const key in data) {
          if (Array.isArray(data[key])) return data[key];
        }
      }

      // Unexpected format → retry
      const isLoggedIn = document.cookie.includes('r3l_auth_state=true');
      if (isLoggedIn) return await retryWithSimplifiedQuery(endpoint, searchParams);

      return mockResults;
    } catch (error) {
      console.error('Error fetching search results:', error);
      const isLoggedIn = document.cookie.includes('r3l_auth_state=true');
      if (isLoggedIn) {
        try {
          return await retryWithSimplifiedQuery('/api/search', searchParams);
        } catch (retryError) {
          console.error('Retry failed:', retryError);
        }
      }
      return mockResults;
    }
  }

  /**
   * Retry search with simplified query (only text + limit)
   */
  async function retryWithSimplifiedQuery(endpoint, searchParams) {
    const simpleParams = new URLSearchParams();
    if (searchParams.query) simpleParams.append('q', searchParams.query);
    simpleParams.append('limit', '20');

    const response = await fetch(`${endpoint}?${simpleParams.toString()}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    });

    if (!response.ok) return mockResults;

    const data = await response.json();
    if (data.results && Array.isArray(data.results)) return data.results;
    if (Array.isArray(data)) return data;

    return mockResults;
  }

  // Mock fallback results
  const mockResults = [
    {
      id: 'mock_1',
      title: 'Community Research Notes',
      type: 'text/markdown',
      size: 25680,
      expires_at: Date.now() + 6 * 24 * 60 * 60 * 1000,
      user_name: 'Researcher42',
    },
    {
      id: 'mock_2',
      title: 'Association Web Visualization',
      type: 'image/png',
      size: 356000,
      expires_at: Date.now() + 5 * 24 * 60 * 60 * 1000,
      user_name: 'VisualArtist',
    }
  ];

  // Helpers
  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' bytes';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
    return (bytes / 1073741824).toFixed(1) + ' GB';
  }

  function formatTimeRemaining(expiryTimestamp) {
    if (!expiryTimestamp) return 'Archived';
    const now = Date.now();
    const diff = expiryTimestamp - now;
    if (diff <= 0) return 'Expired';
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    return days === 0 ? '<1d' : `${days}d`;
  }

  function getFileIcon(fileType) {
    for (const type in fileIcons) {
      if (fileType.startsWith(type)) return fileIcons[type];
    }
    return fileIcons.default;
  }

  // Anti-tracking status indicator
  function updateAntiTrackingStatus() {
    if (antiTrackingSearch.checked) {
      antiTrackingStatus.textContent = 'Active';
      antiTrackingStatus.classList.add('active');
    } else {
      antiTrackingStatus.textContent = 'Inactive';
      antiTrackingStatus.classList.remove('active');
    }
  }

  // Execute search
  async function executeSearch() {
    resultsContainer.classList.remove('hidden');
    loadingResults.classList.remove('hidden');
    noResults.classList.add('hidden');
    resultsGrid.classList.add('hidden');
    pagination.classList.add('hidden');

    const formData = new FormData(searchForm);
    const searchParams = {
      query: searchQuery.value,
      fileTypes: formData.getAll('fileType'),
      timeFrame: formData.get('timeFrame'),
      sortBy: formData.get('sortBy'),
      antiTracking: formData.get('antiTracking') === 'on',
      page: currentPage
    };

    try {
      const results = await fetchSearchResults(searchParams);
      loadingResults.classList.add('hidden');

      if (!results || results.length === 0) {
        resultsCount.textContent = '0 results';
        displayEmptyState(
          noResults,
          'No results found for your query. Try different keywords or filters.'
        );
        noResults.classList.remove('hidden');
        return;
      }

      resultsCount.textContent = `${results.length} results`;
      resultsGrid.innerHTML = '';

      results.forEach(result => {
        const template = document.getElementById('result-item-template');
        const resultItem = template.content.cloneNode(true);

        const item = {
          id: result.id || result.content_id || '',
          name: result.title || result.name || 'Untitled',
          type: result.type || result.content_type || 'application/octet-stream',
          size: result.size || result.file_size || 0,
          expires: result.expires_at || result.expires || null,
          user: result.user_name || result.username || result.display_name || 'Unknown'
        };

        resultItem.querySelector('.file-icon .material-icons').textContent = getFileIcon(item.type);
        resultItem.querySelector('.file-name').textContent = `${item.name} (${item.user})`;
        resultItem.querySelector('.file-expiry').textContent = formatTimeRemaining(item.expires);

        const itemElement = resultItem.querySelector('.file-item');
        itemElement.title = `${item.name}\nSize: ${formatFileSize(item.size)}\nUploaded by: ${item.user}\nType: ${item.type}`;
        itemElement.addEventListener('click', () => {
          const targetPath = item.id.startsWith('drawer_')
            ? `/drawer.html?id=${item.id.replace('drawer_', '')}`
            : `/content/${item.id}`;
          window.location.href = targetPath;
        });

        resultsGrid.appendChild(resultItem);
      });

      resultsGrid.classList.remove('hidden');

      // Pagination
      pagination.classList.remove('hidden');
      totalPages = Math.ceil(results.length / 12);
      pageIndicator.textContent = `Page ${currentPage} of ${totalPages}`;
      prevPage.disabled = currentPage <= 1;
      nextPage.disabled = currentPage >= totalPages;
    } catch (error) {
      loadingResults.classList.add('hidden');
      displayError(
        resultsContainer,
        'The search could not be completed.',
        generateRefCode('FE-SRCH-001')
      );
    }
  }

  // Init event listeners
  function initEventListeners() {
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      currentPage = 1;
      executeSearch();
    });

    antiTrackingSearch.addEventListener('change', updateAntiTrackingStatus);

    prevPage.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        executeSearch();
      }
    });

    nextPage.addEventListener('click', () => {
      if (currentPage < totalPages) {
        currentPage++;
        executeSearch();
      }
    });
  }

  // Init page
  updateAntiTrackingStatus();
  initEventListeners();
});
