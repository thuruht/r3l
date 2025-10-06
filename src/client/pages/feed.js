import feedHtml from './feed.html?raw';
import { getFeed, isAuthenticated } from '../api.js';

let offset = 0;
const limit = 20;
let isLoading = false;

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

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

function createFeedCard(item) {
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

    const avatarUrl = item.avatar_key ? `/api/files/avatar/${item.avatar_key}` : '/icons/avatar.svg';

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
        // Use router to navigate instead of full page load
        window.history.pushState({}, '', `/content.html?id=${item.id}`);
        // This assumes a router is listening to popstate events or a custom event is fired.
        // For this simple case, we might need to enhance the router or just reload.
        // For now, we'll rely on the linkInterceptor in the main router.js
    });
    return card;
}

async function loadMoreFeedItems(container, button) {
    if (isLoading) return;
    isLoading = true;

    button.disabled = true;
    button.innerHTML = '<span class="material-icons">hourglass_top</span> Loading...';

    try {
        const data = await getFeed({ limit, offset });

        if (offset === 0 && data.items.length === 0) {
            container.innerHTML = `
              <div class="card card-accent text-center">
                <div class="card-body">
                  <span class="material-icons" style="font-size: 48px; color: var(--text-muted);">explore</span>
                  <h3 class="mt-2">Your Feed is Quiet</h3>
                  <p class="text-muted">Content from people you follow will appear here. Find people to connect with!</p>
                  <a href="/search.html" class="btn mt-4"><span class="material-icons">search</span> Discover</a>
                </div>
              </div>`;
            button.style.display = 'none';
            return;
        }

        data.items.forEach(item => {
            const card = createFeedCard(item);
            container.appendChild(card);
        });

        offset += data.items.length;

        if (!data.pagination || !data.pagination.hasMore) {
            button.style.display = 'none';
        } else {
            button.disabled = false;
            button.innerHTML = 'Load more';
        }
    } catch (error) {
        container.innerHTML = `<div class="alert alert-error"><strong>Could not load feed.</strong> <p>${error.message}</p></div>`;
        button.style.display = 'none';
    } finally {
        isLoading = false;
    }
}

export async function FeedPage() {
    // Reset state for when navigating back to the page
    offset = 0;
    isLoading = false;

    const element = document.createElement('div');
    element.innerHTML = feedHtml;

    const feedContainer = element.querySelector('#feed-container');
    const loadMoreBtn = element.querySelector('#load-more-btn');

    if (!isAuthenticated()) {
        feedContainer.innerHTML = `<div class="alert alert-error"><strong>Access Denied.</strong> <p>You must be logged in to view your feed. <a href="/auth/login.html">Click here to log in.</a></p></div>`;
        loadMoreBtn.style.display = 'none';
        return element;
    }

    loadMoreBtn.addEventListener('click', () => loadMoreFeedItems(feedContainer, loadMoreBtn));

    // Initial load
    loadMoreFeedItems(feedContainer, loadMoreBtn);

    return element;
}