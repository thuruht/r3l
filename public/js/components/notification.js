/**
 * R3L:F Notification Component
 * Handles fetching, displaying, and managing user notifications via polling.
 */

const debugLog = (component, message, data) => {
  console.log(`[${component}] ${message}`, data || '');
};

export class NotificationManager {
  constructor() {
    this.notifications = [];
    this.unreadCount = 0;
    this.container = null;
    this.badge = null;
    this.bellIcon = null;
    this.isOpen = false;
    this.pollingInterval = null;
  }

  /**
   * Initialize the notification system
   */
  init(options = {}) {
    debugLog('NotificationManager', 'Initializing...');

    this.container = options.container;
    this.badge = options.badge;
    this.bellIcon = options.bellIcon;

    if (this.bellIcon) {
      this.bellIcon.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        this.toggleNotifications();
      });
    }

    document.addEventListener('click', e => {
      if (this.isOpen && this.container && !this.container.contains(e.target) && this.bellIcon && !this.bellIcon.contains(e.target)) {
        this.closeNotifications();
      }
    });

    this.fetchUnreadCount();
    this.startPolling(30000); // Poll every 30 seconds
  }

  createNotificationElements(options = {}) {
    if (document.querySelector('.notification-container')) {
        debugLog('NotificationManager', 'Notification elements already exist');
        return;
    }

    const nav = document.querySelector('nav');
    if (!nav) {
        debugLog('NotificationManager', 'Navigation element not found');
        return;
    }

    const bellWrapper = document.createElement('div');
    bellWrapper.className = 'notification-bell-wrapper';
    bellWrapper.innerHTML = `
        <button class="notification-bell" aria-label="Notifications">
          <span class="material-icons">notifications</span>
          <span class="notification-badge" style="display: none;">0</span>
        </button>`;

    const notificationContainer = document.createElement('div');
    notificationContainer.className = 'notification-container';
    notificationContainer.innerHTML = `
        <div class="notification-header">
          <h3>Notifications</h3>
          <button class="mark-all-read-btn" aria-label="Mark all as read">
            <span class="material-icons">done_all</span>
          </button>
        </div>
        <div class="notification-list"></div>
        <div class="notification-empty" style="display: none;"><p>No notifications</p></div>`;

    const navUl = nav.querySelector('ul.nav-menu');
    if (navUl) {
        const li = document.createElement('li');
        li.className = 'notification-item';
        li.appendChild(bellWrapper);
        li.appendChild(notificationContainer);
        const items = navUl.querySelectorAll('li');
        if (items.length > 0) {
            navUl.insertBefore(li, items[items.length - 1]);
        } else {
            navUl.appendChild(li);
        }
    }

    this.init({
        container: notificationContainer,
        badge: bellWrapper.querySelector('.notification-badge'),
        bellIcon: bellWrapper.querySelector('.notification-bell'),
    });

    const markAllReadBtn = notificationContainer.querySelector('.mark-all-read-btn');
    if (markAllReadBtn) {
        markAllReadBtn.addEventListener('click', e => {
            e.preventDefault();
            e.stopPropagation();
            this.markAllAsRead();
        });
    }
  }

  async fetchUnreadCount() {
    if (!window.r3l || !window.r3l.isAuthenticated()) return 0;
    try {
      const data = await window.r3l.apiGet(window.r3l.API_ENDPOINTS.NOTIFICATIONS.UNREAD_COUNT);
      this.unreadCount = data.count || 0;
      this.updateBadge();
      return this.unreadCount;
    } catch (error) {
      debugLog('NotificationManager', 'Error fetching unread count', error);
      return 0;
    }
  }

  async fetchNotifications() {
    if (!window.r3l || !window.r3l.isAuthenticated()) return [];
    try {
      const notifications = await window.r3l.apiGet(window.r3l.API_ENDPOINTS.NOTIFICATIONS.LIST);
      this.notifications = notifications;
      this.renderNotifications();
      return notifications;
    } catch (error) {
      debugLog('NotificationManager', 'Error fetching notifications', error);
      return [];
    }
  }

  updateBadge() {
    if (!this.badge) return;
    if (this.unreadCount > 0) {
      this.badge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
      this.badge.style.display = 'flex';
    } else {
      this.badge.style.display = 'none';
    }
  }

  renderNotifications() {
    if (!this.container) return;
    const listContainer = this.container.querySelector('.notification-list');
    const emptyContainer = this.container.querySelector('.notification-empty');
    if (!listContainer || !emptyContainer) return;

    listContainer.innerHTML = '';
    if (this.notifications.length === 0) {
      listContainer.style.display = 'none';
      emptyContainer.style.display = 'block';
      return;
    }

    listContainer.style.display = 'block';
    emptyContainer.style.display = 'none';

    this.notifications.forEach(notification => {
      const notificationEl = document.createElement('div');
      notificationEl.className = `notification-item ${notification.isRead ? 'read' : 'unread'}`;
      notificationEl.dataset.id = notification.id;
      const formattedDate = new Date(notification.createdAt).toLocaleString();

      notificationEl.innerHTML = `
        <div class="notification-content">
          <div class="notification-header"><h4>${notification.title}</h4><span class="notification-time">${formattedDate}</span></div>
          <p>${notification.content || ''}</p>
        </div>
        <div class="notification-actions">
          <button class="mark-read-btn" aria-label="Mark as read"><span class="material-icons">done</span></button>
          <button class="delete-btn" aria-label="Delete notification"><span class="material-icons">delete</span></button>
        </div>`;

      notificationEl.addEventListener('click', e => {
        if (e.target.closest('.notification-actions')) return;
        if (!notification.isRead) this.markAsRead([notification.id]);
        if (notification.actionUrl) window.location.href = notification.actionUrl;
      });
      notificationEl.querySelector('.mark-read-btn').addEventListener('click', e => { e.stopPropagation(); this.markAsRead([notification.id]); });
      notificationEl.querySelector('.delete-btn').addEventListener('click', e => { e.stopPropagation(); this.deleteNotification(notification.id); });
      listContainer.appendChild(notificationEl);
    });
  }

  toggleNotifications() {
    if (!this.container) return;
    this.isOpen = !this.isOpen;
    this.container.style.display = this.isOpen ? 'flex' : 'none';
    if (this.isOpen) this.fetchNotifications();
  }

  closeNotifications() {
      if (!this.container) return;
      this.isOpen = false;
      this.container.style.display = 'none';
  }

  async markAsRead(ids) {
    if (!ids || ids.length === 0) return false;
    try {
      await window.r3l.apiPost(window.r3l.API_ENDPOINTS.NOTIFICATIONS.MARK_READ, { ids });
      this.fetchNotifications();
      this.fetchUnreadCount();
      return true;
    } catch (error) {
      debugLog('NotificationManager', 'Error marking notifications as read', error);
      return false;
    }
  }

  async markAllAsRead() {
    try {
      await window.r3l.apiPost(window.r3l.API_ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ);
      this.fetchNotifications();
      this.fetchUnreadCount();
      return true;
    } catch (error) {
      debugLog('NotificationManager', 'Error marking all as read', error);
      return false;
    }
  }

  async deleteNotification(id) {
    try {
      await window.r3l.apiDelete(window.r3l.API_ENDPOINTS.NOTIFICATIONS.DELETE(id));
      this.fetchNotifications();
      this.fetchUnreadCount();
      return true;
    } catch (error) {
      debugLog('NotificationManager', 'Error deleting notification', error);
      return false;
    }
  }

  startPolling(interval) {
    this.stopPolling();
    this.pollingInterval = setInterval(() => this.fetchUnreadCount(), interval);
  }

  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }
}

export const notificationManager = new NotificationManager();