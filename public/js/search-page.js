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

  // Function to fetch search results from API
  async function fetchSearchResults(searchParams) {
    const endpoint = searchParams.antiTracking ? '/api/search/lurker' : '/api/search';
    const params = new URLSearchParams({
      q: searchParams.query,
      limit: 20,
      offset: (searchParams.page - 1) * 20,
      sort: searchParams.sortBy,
    });

    searchParams.fileTypes.forEach(type => params.append('type', type));

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

    if (searchParams.antiTracking) {
      params.append('randomness', '75');
    }

    const response = await fetch(`${endpoint}?${params.toString()}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Search API request failed with status ${response.status}`);
    }

    const data = await response.json();
    return data.results || data || [];
  }

  // Format file size
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
      if (fileType.startsWith(type)) {
        return fileIcons[type];
      }
    }
    return fileIcons.default;
  }

  // Update anti-tracking status display
  function updateAntiTrackingStatus() {
    if (antiTrackingSearch.checked) {
      antiTrackingStatus.textContent = 'Active';
      antiTrackingStatus.classList.add('active');
    } else {
      antiTrackingStatus.textContent = 'Inactive';
      antiTrackingStatus.classList.remove('active');
    }
  }

  // Execute search based on form inputs
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
      page: currentPage,
    };

    try {
      const results = await fetchSearchResults(searchParams);
      loadingResults.classList.add('hidden');

      if (results.length === 0) {
        resultsCount.textContent = '0 results';
        displayEmptyState(noResults, 'No results found for your query. Try different keywords or filters.', null);
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
          expires: result.expires_at || result.expires || null,
        };
        resultItem.querySelector('.file-icon .material-icons').textContent = getFileIcon(item.type);
        resultItem.querySelector('.file-name').textContent = item.name;
        resultItem.querySelector('.file-expiry').textContent = formatTimeRemaining(item.expires);
        resultItem.querySelector('.file-item').addEventListener('click', () => {
          window.location.href = `/content.html?id=${item.id}`;
        });
        resultsGrid.appendChild(resultItem);
      });

      resultsGrid.classList.remove('hidden');
      // Basic pagination (can be improved)
      if (results.length > 0) {
        pagination.classList.remove('hidden');
        pageIndicator.textContent = `Page ${currentPage}`;
        prevPage.disabled = currentPage <= 1;
      }

    } catch (error) {
      loadingResults.classList.add('hidden');
      displayError(resultsContainer, 'The search could not be completed.', generateRefCode('FE-SRCH-001'));
    }
  }

  // Initialize event listeners
  function initEventListeners() {
    // Search form submission
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      currentPage = 1; // Reset to first page on new search
      executeSearch();
    });

    // Anti-tracking toggle
    antiTrackingSearch.addEventListener('change', updateAntiTrackingStatus);

    // Pagination
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

  // Initialize the page
  updateAntiTrackingStatus();
  initEventListeners();
});
