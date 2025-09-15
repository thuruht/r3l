import { NavigationBar } from './components/navigation.js';
import { apiGet, API_ENDPOINTS } from './utils/api-helper.js';

NavigationBar.init('feed');

let offset = 0;
const limit = 20;
const feedEl = document.getElementById('feed');
const btn = document.getElementById('load-more');

async function render(items) {
  for (const item of items) {
    const card = document.createElement('article');
    card.className = 'card card-accent';
    card.innerHTML = `
      <div class="card-header" style="display:flex;align-items:center;gap:.75rem;">
        <img src="${item.avatar_url || '/icons/avatar.svg'}" alt="avatar" width="32" height="32" style="border-radius:50%"/>
        <div>
          <div class="text-accent">${item.display_name || item.username || 'Unknown'}</div>
          <div class="text-muted" style="font-size:.85em;">${new Date(item.created_at).toLocaleString()}</div>
        </div>
      </div>
      <div class="card-body">
        <h3>${escapeHtml(item.title || '(untitled)')}</h3>
        ${item.description ? `<p>${escapeHtml(item.description)}</p>` : ''}
        <div class="text-muted" style="font-size:.85em;">${item.category || ''} • ${item.tags || ''}</div>
      </div>
    `;
    card.addEventListener('click', () => {
      window.location.href = `/content.html?id=${item.id}`;
    });
    feedEl.appendChild(card);
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function showEmptyState() {
  feedEl.innerHTML = `
    <div class="card card-accent text-center">
      <div class="card-body">
        <span class="material-icons" style="font-size: 48px; color: var(--text-muted);">explore</span>
        <h3 class="mt-2">Your Feed is Quiet</h3>
        <p class="text-muted">It looks like there's no new content from your connections right now.</p>
        <a href="/search.html" class="btn mt-4">
          <span class="material-icons">search</span>
          Discover New Content
        </a>
      </div>
    </div>
  `;
  btn.style.display = 'none';
}

function showErrorState(message, code) {
  console.error(`Error ${code}: ${message}`);
  feedEl.innerHTML = `
    <div class="alert alert-error">
      <span class="material-icons">error_outline</span>
      <div>
        <strong>Could not load feed</strong>
        <p>There was an issue retrieving content. Please try refreshing the page.</p>
        <small>Error code: ${code}</small>
      </div>
    </div>
  `;
  btn.style.display = 'none';
}

async function load() {
  btn.disabled = true;
  btn.innerHTML = '<span class="material-icons">hourglass_top</span> Loading...';

  try {
    const data = await apiGet(API_ENDPOINTS.CONTENT.FEED, { limit, offset });

    if (data && data.items) {
      if (offset === 0 && data.items.length === 0) {
        showEmptyState();
        return;
      }

      await render(data.items);
      offset += data.items.length;

      if (!data.pagination || !data.pagination.hasMore) {
        btn.style.display = 'none';
      } else {
        btn.disabled = false;
        btn.innerHTML = 'Load more';
      }
    } else {
      // This case handles a successful response with unexpected data format
      if (offset === 0) {
        showErrorState('Received unexpected data from the server.', 'FE-FEED-002');
      }
      btn.style.display = 'none';
    }
  } catch (error) {
    showErrorState(error.message, 'FE-FEED-001');
  }
}

btn.addEventListener('click', load);
load();
