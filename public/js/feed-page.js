import { NavigationBar } from './components/navigation.js';
import { apiGet, apiPost, API_ENDPOINTS } from './utils/api-helper.js';

NavigationBar.init('feed');

let offset = 0;
const limit = 20;
const feedEl = document.getElementById('feed');
const btn = document.getElementById('load-more');

function formatTimeRemaining(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''}`;
  }
  if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  }
  if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  }
  return `${seconds} second${seconds > 1 ? 's' : ''}`;
}

async function archiveContent(contentId, card) {
  try {
    await apiPost(`${API_ENDPOINTS.CONTENT.BASE}/${contentId}/archive`);
    card.classList.remove('expiring');
    const expirationInfo = card.querySelector('.expiration-info');
    if (expirationInfo) {
      expirationInfo.innerHTML = '<span class="material-icons" style="font-size: 1em; vertical-align: middle;">archive</span> Archived';
    }
    const archiveButton = card.querySelector('.archive-btn');
    if (archiveButton) {
      archiveButton.remove();
    }
  } catch (error) {
    console.error('Failed to archive content:', error);
    // You could show an error message to the user here
  }
}

async function render(items) {
  for (const item of items) {
    const card = document.createElement('article');
    card.className = 'card card-accent';
    card.dataset.contentId = item.id;

    let expirationInfo = '';
    let archiveButton = '';
    if (item.content_expires_at) {
      const timeRemaining = item.content_expires_at - Date.now();
      if (timeRemaining > 0) {
        card.classList.add('expiring');
        expirationInfo = `
          <div class="expiration-info" style="padding: 0 1.25rem 0.5rem; font-size: 0.85em; color: var(--accent-color);">
            <span class="material-icons" style="font-size: 1em; vertical-align: middle;">timer</span>
            Expires in ${formatTimeRemaining(timeRemaining)}
          </div>
        `;
        archiveButton = `<button class="btn btn-sm archive-btn" style="margin-left: auto;">Archive</button>`;
      }
    }

    card.innerHTML = `
      <div class="card-header" style="display:flex;align-items:center;gap:.75rem;">
        <img src="${item.avatar_url || '/icons/avatar.svg'}" alt="avatar" width="32" height="32" style="border-radius:50%"/>
        <div>
          <div class="text-accent">${item.display_name || item.username || 'Unknown'}</div>
          <div class="text-muted" style="font-size:.85em;">${new Date(item.created_at).toLocaleString()}</div>
        </div>
        ${archiveButton}
      </div>
      <div class="card-body">
        <h3>${escapeHtml(item.title || '(untitled)')}</h3>
        ${item.description ? `<p>${escapeHtml(item.description)}</p>` : ''}
        <div class="text-muted" style="font-size:.85em;">${item.category || ''} • ${item.tags || ''}</div>
      </div>
      ${expirationInfo}
    `;
    card.addEventListener('click', (e) => {
      if (e.target.classList.contains('archive-btn')) {
        e.stopPropagation();
        archiveContent(item.id, card);
        return;
      }
      if (e.target.tagName.toLowerCase() !== 'button') {
        window.location.href = `/content.html?id=${item.id}`;
      }
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
