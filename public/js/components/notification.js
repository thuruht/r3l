/**
 * R3L:F Notification Component
 * Handles fetching, displaying, and managing user notifications
 */

// Define a simple debug log function
const debugLog = (component, message, data) => {
  console.log(`[${component}] ${message}`, data || '');
};

export class NotificationManager {
  constructor() {
    this.notifications = [];
    this.unreadCount = 0;
    this.initialized = false;
    this.container = null;
    this.badge = null;
    this.bellIcon = null;
    this.isOpen = false;
    this.onNotificationClick = null;
  }

  /**
   * Initialize the notification system
   * @param {Object} options - Configuration options
   * @param {HTMLElement} options.container - Container element for notifications
   * @param {HTMLElement} options.badge - Badge element to show unread count
   * @param {HTMLElement} options.bellIcon - Bell icon element to toggle notifications
   * @param {Function} options.onNotificationClick - Callback when notification is clicked
   */
  init(options = {}) {
    debugLog('NotificationManager', 'Initializing notification manager', options);
    
    this.container = options.container;
    this.badge = options.badge;
    this.bellIcon = options.bellIcon;
    this.onNotificationClick = options.onNotificationClick;
    
    if (this.bellIcon) {
      this.bellIcon.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.toggleNotifications();
      });
    }
    
    // Close notifications when clicking outside
    document.addEventListener('click', (e) => {
      if (this.isOpen && this.container && !this.container.contains(e.target) && 
          this.bellIcon && !this.bellIcon.contains(e.target)) {
        this.closeNotifications();
      }
    });
    
    this.initialized = true;
    this.fetchUnreadCount();
    this.fetchNotifications();
  }

  /**
   * Create notification HTML elements
   */
  createNotificationElements() {
    if (!document.querySelector('.notification-container')) {
      const nav = document.querySelector('nav');
      if (!nav) return;
      
      // Create notification bell icon with badge
      const bellWrapper = document.createElement('div');
      bellWrapper.className = 'notification-bell-wrapper';
      bellWrapper.innerHTML = `
        <button class="notification-bell" aria-label="Notifications">
          <span class="material-icons">notifications</span>
          <span class="notification-badge" style="display: none;">0</span>
        </button>
      `;
      
      // Create notification container
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
        <div class="notification-empty" style="display: none;">
          <p>No notifications</p>
        </div>
      `;
      
      // Insert before the last item (user profile/login)
      const navUl = nav.querySelector('ul.nav-menu');
      if (navUl) {
        const li = document.createElement('li');
        li.className = 'notification-item';
        li.appendChild(bellWrapper);
        li.appendChild(notificationContainer);
        
        // Insert before the last item
        const items = navUl.querySelectorAll('li');
        if (items.length > 0) {
          navUl.insertBefore(li, items[items.length - 1]);
        } else {
          navUl.appendChild(li);
        }
      }
      
      // Initialize the notification manager
      this.init({
        container: notificationContainer,
        badge: bellWrapper.querySelector('.notification-badge'),
        bellIcon: bellWrapper.querySelector('.notification-bell'),
        onNotificationClick: (notification) => {
          if (notification.actionUrl) {
            window.location.href = notification.actionUrl;
          }
        }
      });
      
      // Add event listener for mark all as read button
      const markAllReadBtn = notificationContainer.querySelector('.mark-all-read-btn');
      if (markAllReadBtn) {
        markAllReadBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.markAllAsRead();
        });
      }
    }
  }

  /**
   * Fetch unread notification count
   */
  async fetchUnreadCount() {
    if (!this.initialized) return;
    
    try {
      const response = await fetch('/api/notifications/unread-count', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Error fetching unread count: ${response.status}`);
      }
      
      const data = await response.json();
      this.unreadCount = data.count || 0;
      this.updateBadge();
      
      return this.unreadCount;
    } catch (error) {
      debugLog('NotificationManager', 'Error fetching unread count', error);
      return 0;
    }
  }

  /**
   * Fetch notifications
   */
  async fetchNotifications() {
    if (!this.initialized) return;
    
    try {
      const response = await fetch('/api/notifications', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Error fetching notifications: ${response.status}`);
      }
      
      const notifications = await response.json();
      this.notifications = notifications;
      this.renderNotifications();
      
      return notifications;
    } catch (error) {
      debugLog('NotificationManager', 'Error fetching notifications', error);
      return [];
    }
  }

  /**
   * Update the notification badge
   */
  updateBadge() {
    if (!this.badge) return;
    
    if (this.unreadCount > 0) {
      this.badge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
      this.badge.style.display = 'flex';
      
      // Add pulse animation to bell icon
      if (this.bellIcon) {
        this.bellIcon.classList.add('pulse');
      }
    } else {
      this.badge.style.display = 'none';
      
      // Remove pulse animation
      if (this.bellIcon) {
        this.bellIcon.classList.remove('pulse');
      }
    }
  }

  /**
   * Render notifications in the container
   */
  renderNotifications() {
    if (!this.container) return;
    
    const listContainer = this.container.querySelector('.notification-list');
    const emptyContainer = this.container.querySelector('.notification-empty');
    
    if (!listContainer || !emptyContainer) return;
    
    // Clear existing notifications
    listContainer.innerHTML = '';
    
    if (this.notifications.length === 0) {
      listContainer.style.display = 'none';
      emptyContainer.style.display = 'block';
      return;
    }
    
    listContainer.style.display = 'block';
    emptyContainer.style.display = 'none';
    
    // Render each notification
    this.notifications.forEach(notification => {
      const notificationEl = document.createElement('div');
      notificationEl.className = `notification-item ${notification.isRead ? 'read' : 'unread'}`;
      notificationEl.dataset.id = notification.id;
      
      // Get icon based on notification type
      let icon = 'notifications';
      switch (notification.type) {
        case 'system':
          icon = 'info';
          break;
        case 'connection':
          icon = 'people';
          break;
        case 'content':
          icon = 'description';
          break;
        case 'message':
          icon = 'mail';
          break;
      }
      
      // Format date
      const date = new Date(notification.createdAt);
      const formattedDate = date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      notificationEl.innerHTML = `
        <div class="notification-icon">
          <span class="material-icons">${icon}</span>
        </div>
        <div class="notification-content">
          <div class="notification-header">
            <h4>${notification.title}</h4>
            <span class="notification-time">${formattedDate}</span>
          </div>
          <p>${notification.content}</p>
        </div>
        <div class="notification-actions">
          <button class="mark-read-btn" aria-label="Mark as read">
            <span class="material-icons">done</span>
          </button>
          <button class="delete-btn" aria-label="Delete notification">
            <span class="material-icons">delete</span>
          </button>
        </div>
      `;
      
      // Add event listeners
      notificationEl.addEventListener('click', (e) => {
        // Don't trigger click if clicking on action buttons
        if (e.target.closest('.notification-actions')) return;
        
        // Mark as read and call click handler
        if (!notification.isRead) {
          this.markAsRead([notification.id]);
        }
        
        if (this.onNotificationClick) {
          this.onNotificationClick(notification);
        }
      });
      
      // Mark as read button
      const markReadBtn = notificationEl.querySelector('.mark-read-btn');
      if (markReadBtn) {
        markReadBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.markAsRead([notification.id]);
        });
      }
      
      // Delete button
      const deleteBtn = notificationEl.querySelector('.delete-btn');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.deleteNotification(notification.id);
        });
      }
      
      listContainer.appendChild(notificationEl);
    });
  }

  /**
   * Toggle notifications panel
   */
  toggleNotifications() {
    if (!this.container) return;
    
    if (this.isOpen) {
      this.closeNotifications();
    } else {
      this.openNotifications();
    }
  }

  /**
   * Open notifications panel
   */
  openNotifications() {
    if (!this.container) return;
    
    this.container.classList.add('open');
    this.isOpen = true;
    
    // Fetch latest notifications when opening
    this.fetchNotifications();
  }

  /**
   * Close notifications panel
   */
  closeNotifications() {
    if (!this.container) return;
    
    this.container.classList.remove('open');
    this.isOpen = false;
  }

  /**
   * Mark notifications as read
   * @param {string[]} ids - Array of notification IDs
   */
  async markAsRead(ids) {
    if (!ids || ids.length === 0) return;
    
    try {
      const response = await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ids }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Error marking notifications as read: ${response.status}`);
      }
      
      // Update local notifications
      this.notifications = this.notifications.map(notification => {
        if (ids.includes(notification.id)) {
          return { ...notification, isRead: true };
        }
        return notification;
      });
      
      // Update UI
      this.renderNotifications();
      this.fetchUnreadCount();
      
      return true;
    } catch (error) {
      debugLog('NotificationManager', 'Error marking notifications as read', error);
      return false;
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead() {
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Error marking all notifications as read: ${response.status}`);
      }
      
      // Update local notifications
      this.notifications = this.notifications.map(notification => {
        return { ...notification, isRead: true };
      });
      
      // Update UI
      this.renderNotifications();
      this.unreadCount = 0;
      this.updateBadge();
      
      return true;
    } catch (error) {
      debugLog('NotificationManager', 'Error marking all notifications as read', error);
      return false;
    }
  }

  /**
   * Delete a notification
   * @param {string} id - Notification ID
   */
  async deleteNotification(id) {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Error deleting notification: ${response.status}`);
      }
      
      // Remove from local notifications
      const wasUnread = this.notifications.find(n => n.id === id && !n.isRead);
      this.notifications = this.notifications.filter(n => n.id !== id);
      
      // Update UI
      this.renderNotifications();
      
      // Update unread count if needed
      if (wasUnread) {
        this.fetchUnreadCount();
      }
      
      return true;
    } catch (error) {
      debugLog('NotificationManager', 'Error deleting notification', error);
      return false;
    }
  }
  
  /**
   * Poll for new notifications
   * @param {number} interval - Polling interval in milliseconds
   */
  startPolling(interval = 30000) {
    this.stopPolling(); // Stop any existing interval
    
    this.pollingInterval = setInterval(() => {
      this.fetchUnreadCount();
      
      // Also fetch notifications if panel is open
      if (this.isOpen) {
        this.fetchNotifications();
      }
    }, interval);
  }
  
  /**
   * Stop polling for notifications
   */
  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }
}

// Create a singleton instance
export const notificationManager = new NotificationManager();
