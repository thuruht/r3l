import { NavigationBar } from './components/navigation.js';

document.addEventListener('DOMContentLoaded', () => {
  // Initialize the navigation bar
  NavigationBar.init('messages');

  // DOM elements
  const conversationsList = document.getElementById('conversations-list');
  const chatContent = document.getElementById('chat-content');
  const emptyState = document.getElementById('empty-state');
  const chatInterface = document.getElementById('chat-interface');
  const chatHeader = document.getElementById('chat-header');
  const chatMessages = document.getElementById('chat-messages');
  const messageInput = document.getElementById('message-input');
  const sendMessageBtn = document.getElementById('send-message-btn');
  const newMessageBtn = document.getElementById('new-message-btn');
  const startConversationBtn = document.getElementById('start-conversation-btn');
  const searchModal = document.getElementById('search-modal');
  const closeSearchModalBtn = document.getElementById('close-search-modal');
  const userSearchInput = document.getElementById('user-search-input');
  const searchResults = document.getElementById('search-results');

  // Current state
  let currentConversation = null;
  let currentUser = null;
  let conversations = [];

  // Initialize
  initMessaging();

  // Set up event listeners
  messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }

    // Auto-resize textarea
    setTimeout(() => {
      messageInput.style.height = 'auto';
      messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';
    }, 0);
  });

  sendMessageBtn.addEventListener('click', sendMessage);
  newMessageBtn.addEventListener('click', showUserSearchModal);
  startConversationBtn.addEventListener('click', showUserSearchModal);
  closeSearchModalBtn.addEventListener('click', hideUserSearchModal);

  userSearchInput.addEventListener('input', debounce(searchUsers, 300));

  // Close modal when clicking outside
  searchModal.addEventListener('click', (e) => {
    if (e.target === searchModal) {
      hideUserSearchModal();
    }
  });

  // Initialize messaging functionality
  async function initMessaging() {
    try {
      // First, get the current user
      currentUser = await fetchCurrentUser();

      if (!currentUser) {
        showAuthError();
        return;
      }

      // Load conversations
      await loadConversations();

      // Check for conversation in URL params
      const urlParams = new URLSearchParams(window.location.search);
      const userParam = urlParams.get('user');

      if (userParam) {
        // Find existing conversation or create new one
        const existingConv = conversations.find(c => c.otherUserId === userParam);

        if (existingConv) {
          openConversation(existingConv.id);
        } else {
          // Get user details first
          const user = await fetchUserById(userParam);
          if (user) {
            startNewConversation(user);
          }
        }
      }

      // Set up polling for new messages
      setInterval(async () => {
        await loadConversations();

        if (currentConversation) {
          loadMessages(currentConversation);
        }
      }, 10000); // Poll every 10 seconds
    } catch (error) {
      console.error('Error initializing messaging:', error);
      showError('Could not initialize messaging. Please try refreshing the page.');
    }
  }

  // Fetch current user details
  async function fetchCurrentUser() {
    try {
      const response = await fetch('/api/auth/jwt/profile', {
          credentials: 'include'
        });

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching current user:', error);
      return null;
    }
  }

  // Load conversations
  async function loadConversations() {
    try {
      const response = await fetch('/api/messages/conversations', {
          credentials: 'include'
        });

      if (!response.ok) {
        throw new Error('Failed to load conversations');
      }

      conversations = await response.json();
      renderConversations(conversations);
    } catch (error) {
      console.error('Error loading conversations:', error);
      showError('Could not load conversations. Please try refreshing the page.');
    }
  }

  // Render conversations in the sidebar
  function renderConversations(conversations) {
    conversationsList.innerHTML = '';

    if (conversations.length === 0) {
      conversationsList.innerHTML = `
        <div class="empty-state" style="padding: var(--space-4);">
          <p>No conversations yet</p>
        </div>
      `;
      return;
    }

    conversations.forEach(conversation => {
      const isActive = currentConversation && currentConversation === conversation.id;

      const conversationEl = document.createElement('div');
      conversationEl.className = `conversation-item${isActive ? ' active' : ''}`;
      conversationEl.dataset.id = conversation.id;

      // Format time relative to now
      const timeStr = formatRelativeTime(conversation.lastMessageAt);

      conversationEl.innerHTML = `
        <div class="conversation-avatar">
          ${conversation.otherUserAvatar ? `<img src="${conversation.otherUserAvatar}" alt="${conversation.otherUserName || 'User'}" class="avatar-small">` :
          conversation.otherUserAvatarKey ? `<img src="/api/files/${conversation.otherUserAvatarKey}" alt="${conversation.otherUserName || 'User'}" class="avatar-small">` :
          `<span>${(conversation.otherUserName || 'U').charAt(0).toUpperCase()}</span>`}
        </div>
        <div class="conversation-info">
          <div class="conversation-name">${conversation.otherUserName || conversation.otherUserId}</div>
          <div class="conversation-preview">
            ${conversation.isLastMessageFromMe ? 'You: ' : ''}
            ${conversation.isLastMessageEncrypted ? '[Encrypted]' : conversation.lastMessagePreview || 'No messages yet'}
            ${conversation.hasAttachments ? ' 📎' : ''}
          </div>
        </div>
        <div class="conversation-meta">
          <div class="conversation-time">${timeStr}</div>
          ${conversation.unreadCount > 0 ? `<div class="unread-badge">${conversation.unreadCount}</div>` : ''}
        </div>
      `;

      conversationEl.addEventListener('click', () => {
        openConversation(conversation.id);
      });

      conversationsList.appendChild(conversationEl);
    });
  }

  // Open a conversation
  function openConversation(conversationId) {
    // Update UI state
    currentConversation = conversationId;

    // Update active state in sidebar
    const items = conversationsList.querySelectorAll('.conversation-item');
    items.forEach(item => {
      item.classList.toggle('active', item.dataset.id === conversationId);
    });

    // Show chat interface, hide empty state
    emptyState.classList.add('hidden');
    chatInterface.classList.remove('hidden');

    // Load messages
    loadMessages(conversationId);
  }

  // Load messages for a conversation
  async function loadMessages(conversationId) {
    try {
      const response = await fetch(`/api/messages/conversations/${conversationId}`, {
          credentials: 'include'
        });

      if (!response.ok) {
        throw new Error('Failed to load messages');
      }

      const data = await response.json();
      renderConversation(data);
    } catch (error) {
      console.error('Error loading messages:', error);
      showError('Could not load messages. Please try refreshing the page.');
    }
  }

  // Render conversation in the chat area
  function renderConversation(data) {
    // Update header
    chatHeader.innerHTML = `
      <div class="conversation-avatar">
        ${data.otherUser?.avatarUrl ? `<img src="${data.otherUser.avatarUrl}" alt="${data.otherUser?.username || 'Unknown User'}" class="avatar-small">` :
         data.otherUser?.avatarKey ? `<img src="/api/files/${data.otherUser.avatarKey}" alt="${data.otherUser?.username || 'Unknown User'}" class="avatar-small">` :
         `<span>${(data.otherUser?.username || 'U').charAt(0).toUpperCase()}</span>`}
      </div>
      <div class="chat-name">${data.otherUser?.displayName || data.otherUser?.username || 'Unknown User'}</div>
    `;

    // Render messages
    chatMessages.innerHTML = '';

    if (data.messages.length === 0) {
      chatMessages.innerHTML = `
        <div class="empty-state" style="padding: var(--space-4);">
          <p>No messages yet. Start the conversation!</p>
        </div>
      `;
      return;
    }

    // Group messages by day
    const messagesByDay = groupMessagesByDay(data.messages);

    // Render each day's messages
    Object.entries(messagesByDay).forEach(([day, messages]) => {
      // Add day separator
      const daySeparator = document.createElement('div');
      daySeparator.className = 'day-separator';
      daySeparator.innerHTML = `
        <div class="day-label">${day}</div>
      `;
      chatMessages.appendChild(daySeparator);

      // Render messages for this day
      renderMessageGroup(messages);
    });

    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  // Group messages by day
  function groupMessagesByDay(messages) {
    const groups = {};

    messages.forEach(message => {
      const date = new Date(message.createdAt);
      const day = formatDate(date);

      if (!groups[day]) {
        groups[day] = [];
      }

      groups[day].push(message);
    });

    return groups;
  }

  // Render a group of messages
  function renderMessageGroup(messages) {
    messages.forEach(message => {
      const isOutgoing = message.fromUserId === currentUser.id;

      const messageEl = document.createElement('div');
      messageEl.className = `message-bubble ${isOutgoing ? 'outgoing' : 'incoming'}`;

      // Message content
      messageEl.innerHTML = `
        <div class="message-content">${message.content}</div>
        <div class="message-time">${formatTime(new Date(message.createdAt))}</div>
      `;

      // Attachments (if any)
      if (message.attachments && message.attachments.length > 0) {
        const attachmentsEl = document.createElement('div');
        attachmentsEl.className = 'message-attachments';

        message.attachments.forEach(attachment => {
          const attachmentEl = document.createElement('div');
          attachmentEl.className = 'attachment-preview';
          attachmentEl.innerHTML = `
            <span class="material-icons">attachment</span>
          `;
          attachmentsEl.appendChild(attachmentEl);
        });

        messageEl.appendChild(attachmentsEl);
      }

      chatMessages.appendChild(messageEl);
    });
  }

  // Send a message
  async function sendMessage() {
    const content = messageInput.value.trim();
    if (!content || !currentConversation) return;

    try {
      // Find recipient ID from current conversation
      const conversation = conversations.find(c => c.id === currentConversation);
      if (!conversation) return;

      const recipientId = conversation.otherUserId;

      // Clear input
      messageInput.value = '';
      messageInput.style.height = 'auto';

      // Optimistically add message to UI
      const tempId = 'temp-' + Date.now();
      const tempMessage = {
        id: tempId,
        fromUserId: currentUser.id,
        toUserId: recipientId,
        content,
        createdAt: Date.now(),
        isRead: false,
        isEncrypted: false
      };

      const messageEl = document.createElement('div');
      messageEl.className = 'message-bubble outgoing';
      messageEl.dataset.id = tempId;
      messageEl.innerHTML = `
        <div class="message-content">${content}</div>
        <div class="message-time">Sending...</div>
      `;

      chatMessages.appendChild(messageEl);
      chatMessages.scrollTop = chatMessages.scrollHeight;

      // Send message to server
      const response = await fetch('/api/messages/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({
            recipientId,
            content
          })
        });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      // Refresh messages
      await loadMessages(currentConversation);

    } catch (error) {
      console.error('Error sending message:', error);
      showError('Could not send message. Please try again.');
    }
  }

  // Show user search modal
  function showUserSearchModal() {
    searchModal.classList.remove('hidden');
    userSearchInput.focus();
  }

  // Hide user search modal
  function hideUserSearchModal() {
    searchModal.classList.add('hidden');
    userSearchInput.value = '';
    searchResults.innerHTML = `
      <div class="search-empty-state">
        <span class="material-icons">person_search</span>
        <p>Type a username or display name to search</p>
      </div>
    `;
  }

  // Search users
  async function searchUsers() {
    const query = userSearchInput.value.trim();

    if (!query || query.length < 2) {
      searchResults.innerHTML = `
        <div class="search-empty-state">
          <span class="material-icons">person_search</span>
          <p>Type at least 2 characters to search</p>
        </div>
      `;
      return;
    }

    try {
      searchResults.innerHTML = `
        <div class="search-empty-state">
          <span class="material-icons">hourglass_empty</span>
          <p>Searching...</p>
        </div>
      `;

      const response = await fetch(`/api/users/search?query=${encodeURIComponent(query)}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to search users');
      }

      const data = await response.json();
      const users = data.users || [];

      if (users.length === 0) {
        searchResults.innerHTML = `
          <div class="search-empty-state">
            <span class="material-icons">person_off</span>
            <p>No users found matching "${query}"</p>
          </div>
        `;
        return;
      }

      // Render search results
      searchResults.innerHTML = '';

      users.forEach(user => {
        if (user.id === currentUser.id) return; // Skip current user

        const userEl = document.createElement('div');
        userEl.className = 'search-result-item';
        userEl.dataset.id = user.id;
        userEl.dataset.username = user.username;

        userEl.innerHTML = `
          <div class="search-result-avatar">
            ${user.avatar_url ? `<img src="${user.avatar_url}" alt="${user.username}" class="avatar-small">` :
             user.avatar_key ? `<img src="/api/files/${user.avatar_key}" alt="${user.username}" class="avatar-small">` :
             `<span>${user.username.charAt(0).toUpperCase()}</span>`}
          </div>
          <div class="search-result-info">
            <div class="search-result-name">${user.display_name || user.username}</div>
            <div class="search-result-username">@${user.username}</div>
          </div>
        `;

        userEl.addEventListener('click', () => {
          hideUserSearchModal();
          startNewConversation(user);
        });

        searchResults.appendChild(userEl);
      });

    } catch (error) {
      console.error('Error searching users:', error);
      searchResults.innerHTML = `
        <div class="search-empty-state">
          <span class="material-icons">error_outline</span>
          <p>Error searching users. Please try again.</p>
        </div>
      `;
    }
  }

  // Start a new conversation with a user
  async function startNewConversation(user) {
    // Check if conversation already exists
    const existingConv = conversations.find(c => c.otherUserId === user.id);

    if (existingConv) {
      openConversation(existingConv.id);
      return;
    }

    // Show chat interface with empty messages
    emptyState.classList.add('hidden');
    chatInterface.classList.remove('hidden');

    // Set up chat header
    chatHeader.innerHTML = `
      <div class="conversation-avatar">
        ${user.avatar_url ? `<img src="${user.avatar_url}" alt="${user.username}" class="avatar-small">` :
         user.avatar_key ? `<img src="/api/files/${user.avatar_key}" alt="${user.username}" class="avatar-small">` :
         `<span>${user.username.charAt(0).toUpperCase()}</span>`}
      </div>
      <div class="chat-name">${user.display_name || user.username}</div>
    `;

    // Clear messages
    chatMessages.innerHTML = `
      <div class="empty-state" style="padding: var(--space-4);">
        <p>Start a conversation with ${user.display_name || user.username}</p>
      </div>
    `;

    // Focus input
    messageInput.focus();

    // Store recipient info for sending first message
    messageInput.dataset.recipientId = user.id;

    // When user sends first message, a conversation will be created on the server
  }

  // Fetch a user by ID
  async function fetchUserById(userId) {
    try {
      const response = await fetch(`/api/users/${userId}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching user:', error);
      return null;
    }
  }

  // Show auth error
  function showAuthError() {
    const container = document.querySelector('main.container');
    container.innerHTML = `
      <div class="alert alert-error">
        <span class="material-icons">error_outline</span>
        <div>
          <h3>Authentication Required</h3>
          <p>Please <a href="/auth/login.html">log in</a> to access messages.</p>
        </div>
      </div>
    `;
  }

  // Show error message
  function showError(message) {
    const errorEl = document.createElement('div');
    errorEl.className = 'alert alert-error';
    errorEl.innerHTML = `
      <span class="material-icons">error_outline</span>
      <div>${message}</div>
    `;

    document.querySelector('main.container').prepend(errorEl);

    // Remove after 5 seconds
    setTimeout(() => {
      errorEl.remove();
    }, 5000);
  }

  // Helper: Format relative time
  function formatRelativeTime(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;

    // Less than a minute
    if (diff < 60 * 1000) {
      return 'just now';
    }

    // Less than an hour
    if (diff < 60 * 60 * 1000) {
      const minutes = Math.floor(diff / (60 * 1000));
      return `${minutes}m`;
    }

    // Less than a day
    if (diff < 24 * 60 * 60 * 1000) {
      const hours = Math.floor(diff / (60 * 60 * 1000));
      return `${hours}h`;
    }

    // Less than a week
    if (diff < 7 * 24 * 60 * 60 * 1000) {
      const days = Math.floor(diff / (24 * 60 * 60 * 1000));
      return `${days}d`;
    }

    // Format as date
    return formatDate(new Date(timestamp));
  }

  // Helper: Format date
  function formatDate(date) {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (isSameDay(date, today)) {
      return 'Today';
    }

    if (isSameDay(date, yesterday)) {
      return 'Yesterday';
    }

    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric'
    });
  }

  // Helper: Format time
  function formatTime(date) {
    return date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Helper: Check if two dates are on the same day
  function isSameDay(date1, date2) {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
  }

  // Helper: Debounce function
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
});
