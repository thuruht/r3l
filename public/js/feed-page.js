import { NavigationBar } from './components/navigation.js';

NavigationBar.init('feed');

let offset = 0;
const limit = 20;
const feedEl = document.getElementById('feed');
const btn = document.getElementById('load-more');

function formatTimeRemaining(isoString) {
  if (!isoString) return '∞';
  const ms = new Date(isoString) - Date.now();
  if (ms <= 0) return 'Expired';
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  return `${seconds} second${seconds > 1 ? 's' : ''}`;
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function render(items) {
  for (const item of items) {
    const card = document.createElement('article');
    card.className = 'card card-accent';
    card.dataset.contentId = item.id;

    const timeRemaining = formatTimeRemaining(item.content_expires_at);
    const isExpiring = timeRemaining !== 'Expired' && timeRemaining !== '∞';

    const expirationInfo = isExpiring ? `
      <div class="expiration-info" style="padding: 0 1.25rem 0.5rem; font-size: 0.85em; color: var(--accent-color);">
        <span class="material-icons" style="font-size: 1em; vertical-align: middle;">timer</span>
        Expires in ${timeRemaining}
      </div>` : '';

    const avatarUrl = item.avatar_key ? `/api/files/${item.avatar_key}` : '/icons/avatar.svg';

    card.innerHTML = `
      <div class="card-header" style="display:flex;align-items:center;gap:.75rem;">
        <img src="${avatarUrl}" alt="avatar" width="32" height="32" style="border-radius:50%"/>
        <div>
          <div class="text-accent">${escapeHtml(item.display_name || item.username)}</div>
          <div class="text-muted" style="font-size:.85em;">${new Date(item.created_at).toLocaleString()}</div>
        </div>
      </div>
      <div class="card-body">
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.description)}</p>
      </div>
      ${expirationInfo}
    `;
    card.addEventListener('click', () => {
        window.location.href = `/content.html?id=${item.id}`;
    });
    feedEl.appendChild(card);
  }
}

function showEmptyState() {
  feedEl.innerHTML = `
    <div class="card card-accent text-center">
      <div class="card-body">
        <span class="material-icons" style="font-size: 48px; color: var(--text-muted);">explore</span>
        <h3 class="mt-2">Your Feed is Quiet</h3>
        <p class="text-muted">Content from people you follow will appear here. Find people to connect with!</p>
        <a href="/search.html" class="btn mt-4"><span class="material-icons">search</span> Discover</a>
      </div>
    </div>`;
  btn.style.display = 'none';
}

function showErrorState(message) {
  feedEl.innerHTML = `<div class="alert alert-error"><strong>Could not load feed.</strong> <p>${message}</p></div>`;
  btn.style.display = 'none';
}

async function load() {
  if (!window.r3l || !window.r3l.isAuthenticated()) {
    showErrorState("You must be logged in to view your feed.");
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="material-icons">hourglass_top</span> Loading...';

  try {
    const params = new URLSearchParams({ limit, offset });
    const data = await window.r3l.apiGet(`${window.r3l.API_ENDPOINTS.FEED}?${params}`);

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
  } catch (error) {
    showErrorState(error.message);
  }
}

btn.addEventListener('click', load);
load();