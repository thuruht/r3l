import { NavigationBar } from './components/navigation.js';
import { generateRefCode, displayEmptyState, displayError } from './utils/ui-helpers.js';

document.addEventListener('DOMContentLoaded', () => {
  // Initialize the navigation bar
  NavigationBar.init('messages');

  // DOM elements
  const errorContainer = document.getElementById('error-container');
  const conversationsList = document.getElementById('conversations-list');
  const _chatContent = document.getElementById('chat-content');
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

  // Open a conversation
  function openConversation(conversationId) {
    currentConversation = conversationId;
    emptyState.classList.add('hidden');
    chatInterface.classList.remove('hidden');
    
    // Update active conversation in list
    document.querySelectorAll('.conversation-item').forEach(item => {
      item.classList.toggle('active', item.dataset.id === conversationId);
    });
    
    loadMessages(conversationId);
  }

  // Initialize messaging functionality
  async function initMessaging() {
    try {
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
        const existingConv = conversations.find(c => c.otherUserId === userParam);
        if (existingConv) {
          openConversation(existingConv.id);
        } else {
          const user = await fetchUserById(userParam);
          if (user) startNewConversation(user);
        }
      }

      // Poll for new messages
      setInterval(async () => {
        await loadConversations();
        if (currentConversation) {
          loadMessages(currentConversation);
        }
      }, 10000);
    } catch (error) {
      displayError(errorContainer, 'Could not initialize the messaging system.', generateRefCode('FE-MSG-001'));
    }
  }

  // Fetch current user details
  async function fetchCurrentUser() {
    try {
      const response = await fetch('/api/auth/jwt/profile', { credentials: 'include' });
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  }

  // Load conversations
  async function loadConversations() {
    try {
      const response = await fetch('/api/messages/conversations', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to load conversations');
      conversations = await response.json();
      renderConversations(conversations);
    } catch {
      displayError(conversationsList, 'Could not load conversations.', generateRefCode('FE-MSG-002'));
    }
  }

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

      conversationEl.addEventListener('click', () => openConversation(conversation.id));
      conversationsList.appendChild(conversationEl);
    });
  }

  async function loadMessages(conversationId) {
    try {
      const response = await fetch(`/api/messages/conversations/${conversationId}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to load messages');
      const data = await response.json();
      renderConversation(data);
    } catch {
      displayError(chatMessages, 'Could not load messages for this conversation.', generateRefCode('FE-MSG-003'));
    }
  }

  function renderConversation(data) {
    chatHeader.innerHTML = `
      <div class="conversation-avatar">
        ${data.otherUser?.avatarUrl ? `<img src="${data.otherUser.avatarUrl}" alt="${data.otherUser?.username || 'Unknown User'}" class="avatar-small">` :
         data.otherUser?.avatarKey ? `<img src="/api/files/${data.otherUser.avatarKey}" alt="${data.otherUser?.username || 'Unknown User'}" class="avatar-small">` :
         `<span>${(data.otherUser?.username || 'U').charAt(0).toUpperCase()}</span>`}
      </div>
      <div class="chat-name">${data.otherUser?.displayName || data.otherUser?.username || 'Unknown User'}</div>
    `;

    chatMessages.innerHTML = '';
    if (data.messages.length === 0) {
      chatMessages.innerHTML = `
        <div class="empty-state" style="padding: var(--space-4);">
          <p>No messages yet. Start the conversation!</p>
        </div>
      `;
      return;
    }

    const messagesByDay = groupMessagesByDay(data.messages);
    Object.entries(messagesByDay).forEach(([day, messages]) => {
      const daySeparator = document.createElement('div');
      daySeparator.className = 'day-separator';
      daySeparator.innerHTML = `<div class="day-label">${day}</div>`;
      chatMessages.appendChild(daySeparator);
      renderMessageGroup(messages);
    });

    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function groupMessagesByDay(messages) {
    const groups = {};
    messages.forEach(message => {
      const day = formatDate(new Date(message.createdAt));
      if (!groups[day]) groups[day] = [];
      groups[day].push(message);
    });
    return groups;
  }

  function renderMessageGroup(messages) {
    messages.forEach(message => {
      const isOutgoing = message.fromUserId === currentUser.id;
      const messageEl = document.createElement('div');
      messageEl.className = `message-bubble ${isOutgoing ? 'outgoing' : 'incoming'}`;
      messageEl.innerHTML = `
        <div class="message-content">${message.content}</div>
        <div class="message-time">${formatTime(new Date(message.createdAt))}</div>
      `;

      if (message.attachments?.length > 0) {
        const attachmentsEl = document.createElement('div');
        attachmentsEl.className = 'message-attachments';
        message.attachments.forEach(() => {
          const attachmentEl = document.createElement('div');
          attachmentEl.className = 'attachment-preview';
          attachmentEl.innerHTML = `<span class="material-icons">attachment</span>`;
          attachmentsEl.appendChild(attachmentEl);
        });
        messageEl.appendChild(attachmentsEl);
      }

      chatMessages.appendChild(messageEl);
    });
  }

  async function sendMessage() {
    const content = messageInput.value.trim();
    if (!content || !currentConversation) return;

    const conversation = conversations.find(c => c.id === currentConversation);
    if (!conversation) return;

    const recipientId = conversation.otherUserId;
    const tempId = `temp-${Date.now()}`;

    const messageEl = document.createElement('div');
    messageEl.className = 'message-bubble outgoing';
    messageEl.dataset.tempId = tempId;
    messageEl.innerHTML = `<div class="message-content">${content}</div><div class="message-time">Sending...</div>`;
    chatMessages.appendChild(messageEl);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    messageInput.value = '';
    messageInput.style.height = 'auto';

    try {
      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ recipientId, content }),
      });
      if (!response.ok) throw new Error('Failed to send message');
      await loadMessages(currentConversation);
    } catch {
      const failedMessage = chatMessages.querySelector(`[data-temp-id="${tempId}"]`);
      if (failedMessage) {
        failedMessage.classList.add('failed');
        failedMessage.querySelector('.message-time').textContent = 'Failed to send';
      }
      displayError(errorContainer, 'Could not send message.', generateRefCode('FE-MSG-004'));
    }
  }

  function showUserSearchModal() {
    searchModal.classList.remove('hidden');
    userSearchInput.focus();
  }

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

  async function searchUsers() {
    const query = userSearchInput.value.trim();
    if (query.length < 2) {
      displayEmptyState(searchResults, 'Type at least 2 characters to search', null);
      return;
    }

    try {
      searchResults.innerHTML = `<div class="search-empty-state"><p>Searching...</p></div>`;
      const response = await fetch(`/api/users/search?query=${encodeURIComponent(query)}`, { credentials: 'include' });
      if (!response.ok) throw new Error('User search failed');
      const data = await response.json();
      const users = data.users || [];

      if (users.length === 0) {
        displayEmptyState(searchResults, `No users found matching "${query}"`, null);
        return;
      }

      searchResults.innerHTML = '';
      users.forEach(user => {
        if (user.id === currentUser.id) return;
        const userEl = document.createElement('div');
        userEl.className = 'search-result-item';
        userEl.innerHTML = `
          <div class="search-result-avatar"><span>${(user.display_name || user.username).charAt(0).toUpperCase()}</span></div>
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
    } catch {
      displayError(searchResults, 'Could not perform user search.', generateRefCode('FE-MSG-005'));
    }
  }

  async function startNewConversation(user) {
    const existingConv = conversations.find(c => c.otherUserId === user.id);
    if (existingConv) {
      openConversation(existingConv.id);
      return;
    }

    emptyState.classList.add('hidden');
    chatInterface.classList.remove('hidden');

    chatHeader.innerHTML = `
      <div class="conversation-avatar">
        ${user.avatar_url ? `<img src="${user.avatar_url}" alt="${user.username}" class="avatar-small">` :
         user.avatar_key ? `<img src="/api/files/${user.avatar_key}" alt="${user.username}" class="avatar-small">` :
         `<span>${user.username.charAt(0).toUpperCase()}</span>`}
      </div>
      <div class="chat-name">${user.display_name || user.username}</div>
    `;

    chatMessages.innerHTML = `
      <div class="empty-state" style="padding: var(--space-4);">
        <p>Start a conversation with ${user.display_name || user.username}</p>
      </div>
    `;

    messageInput.focus();
    messageInput.dataset.recipientId = user.id;
  }

  async function fetchUserById(userId) {
    try {
      const response = await fetch(`/api/users/${userId}`, { credentials: 'include' });
      if (!response.ok) throw new Error('User not found');
      return await response.json();
    } catch {
      displayError(errorContainer, 'Could not fetch user details.', generateRefCode('FE-MSG-006'));
      return null;
    }
  }

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

  // Helpers
  function formatRelativeTime(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d`;
    return formatDate(new Date(timestamp));
  }

  function formatDate(date) {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (isSameDay(date, today)) return 'Today';
    if (isSameDay(date, yesterday)) return 'Yesterday';
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  function formatTime(date) {
    return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }

  function isSameDay(d1, d2) {
    return d1.getDate() === d2.getDate() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getFullYear() === d2.getFullYear();
  }

  function debounce(func, wait) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }
});
