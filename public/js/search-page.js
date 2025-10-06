import { NavigationBar } from './components/navigation.js';

document.addEventListener('DOMContentLoaded', () => {
  NavigationBar.init('search');

  let currentFilter = 'all';
  let offset = 0;
  const limit = 20;

  // Filter functionality
  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentFilter = chip.dataset.filter;
      offset = 0;
      document.getElementById('results').innerHTML = '';
      loadResults();
    });
  });

  async function loadResults() {
    if (!window.r3l?.isAuthenticated()) {
      document.getElementById('results').innerHTML = '<p>Please log in to discover content</p>';
      return;
    }

    try {
      const params = new URLSearchParams({ limit, offset });
      if (currentFilter !== 'all') {
        params.append('type', currentFilter);
      }
      const data = await window.r3l.apiGet(`/api/auth/search?${params}`);
      
      const results = document.getElementById('results');
      if (offset === 0 && (!data.items || data.items.length === 0)) {
        results.innerHTML = '<p class="text-muted">No content found</p>';
        return;
      }

      const items = data.items || [];
      items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'result-card';
        card.innerHTML = `
          <h3>${item.title || 'Untitled'}</h3>
          <p class="text-muted">${item.description || ''}</p>
          <small class="text-muted">by ${item.display_name || item.username || 'Unknown'}</small>
        `;
        card.addEventListener('click', () => {
          window.location.href = `/content.html?id=${item.id}`;
        });
        results.appendChild(card);
      });

      offset += items.length;
      const loadMoreBtn = document.getElementById('loadMore');
      if (loadMoreBtn) {
        loadMoreBtn.style.display = (data.pagination?.hasMore || items.length === limit) ? 'block' : 'none';
      }
    } catch (error) {
      console.error('Failed to load results:', error);
      document.getElementById('results').innerHTML = '<p class="text-muted">Error loading content</p>';
    }
  }

  const loadMoreBtn = document.getElementById('loadMore');
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', loadResults);
  }
  loadResults();
});