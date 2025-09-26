/**
 * R3L:F Messaging Component
 * Handles direct messaging between users via polling.
 */

const debugLog = (component, message, data) => {
  console.log(`[${component}] ${message}`, data || '');
};

export class MessagingManager {
  constructor() {
    this.conversations = [];
    this.currentConversation = null;
    this.messages = [];
    this.userId = null;
    this.messagesContainer = null;
    this.messageInput = null;
    this.sendButton = null;
    this.conversationsContainer = null;
    this.pollingInterval = null;
  }

  /**
   * Initialize the messaging manager
   */
  async init(options = {}) {
    debugLog('MessagingManager', 'Initializing...');

    this.messagesContainer = options.messagesContainer;
    this.messageInput = options.messageInput;
    this.sendButton = options.sendButton;
    this.conversationsContainer = options.conversationsContainer;

    if (!window.r3l || !window.r3l.isAuthenticated()) {
        debugLog('MessagingManager', 'User not authenticated. Aborting initialization.');
        return;
    }

    try {
        const profile = await window.r3l.apiGet(window.r3l.API_ENDPOINTS.AUTH.PROFILE);
        this.userId = profile.id;
        this.setupEventListeners();
        this.fetchConversations();
        this.startPolling(15000); // Poll every 15 seconds
    } catch (error) {
        debugLog('MessagingManager', 'Failed to fetch user profile', error);
    }
  }

  setupEventListeners() {
    if (this.sendButton && this.messageInput) {
      this.sendButton.addEventListener('click', e => {
        e.preventDefault();
        this.sendMessage();
      });

      this.messageInput.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      });
    }
  }

  async fetchConversations() {
    try {
      const conversations = await window.r3l.apiGet(window.r3l.API_ENDPOINTS.MESSAGES.CONVERSATIONS);
      this.conversations = conversations;
      this.renderConversations();
      return conversations;
    } catch (error) {
      debugLog('MessagingManager', 'Error fetching conversations', error);
      return [];
    }
  }

  renderConversations() {
    if (!this.conversationsContainer) return;
    this.conversationsContainer.innerHTML = '';

    if (this.conversations.length === 0) {
      this.conversationsContainer.innerHTML = `<div class="empty-conversations"><p>No conversations yet</p></div>`;
      return;
    }

    this.conversations.forEach(conversation => {
      const conversationEl = document.createElement('div');
      conversationEl.className = `conversation-item ${this.currentConversation && this.currentConversation.otherUserId === conversation.otherUserId ? 'active' : ''}`;
      conversationEl.dataset.userId = conversation.otherUserId;

      const date = new Date(conversation.lastMessageAt);
      const formattedDate = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

      conversationEl.innerHTML = `
        <div class="conversation-content">
          <div class="conversation-header">
            <h4>${conversation.displayName || conversation.username}</h4>
            <span class="conversation-time">${formattedDate}</span>
          </div>
          <p class="conversation-preview">${conversation.isLastMessageFromMe ? 'You: ' : ''}${conversation.lastMessagePreview || 'No messages yet'}</p>
        </div>
        ${conversation.unreadCount > 0 ? `<div class="unread-badge">${conversation.unreadCount}</div>` : ''}
      `;
      conversationEl.addEventListener('click', () => this.selectConversation(conversation));
      this.conversationsContainer.appendChild(conversationEl);
    });
  }

  selectConversation(conversation) {
    this.currentConversation = conversation;
    this.renderConversations(); // Re-render to highlight active conversation
    this.fetchMessages(conversation.otherUserId);
  }

  async fetchMessages(otherUserId) {
    try {
      const messages = await window.r3l.apiGet(window.r3l.API_ENDPOINTS.MESSAGES.GET(otherUserId));
      this.messages = messages;
      this.renderMessages();
      return messages;
    } catch (error) {
      debugLog('MessagingManager', 'Error fetching messages', error);
      return [];
    }
  }

  renderMessages() {
    if (!this.messagesContainer) return;
    this.messagesContainer.innerHTML = '';

    if (this.messages.length === 0) {
      this.messagesContainer.innerHTML = `<div class="empty-messages"><p>No messages yet. Start the conversation!</p></div>`;
      return;
    }

    this.messages.forEach(message => {
      const messageEl = document.createElement('div');
      messageEl.className = `message-item ${message.senderId === this.userId ? 'sent' : 'received'}`;
      const formattedTime = new Date(message.createdAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

      messageEl.innerHTML = `
        <div class="message-content">
          <div class="message-bubble"><p>${message.content}</p></div>
          <div class="message-meta"><span class="message-time">${formattedTime}</span></div>
        </div>
      `;
      this.messagesContainer.appendChild(messageEl);
    });

    this.scrollToBottom();
  }

  scrollToBottom() {
    if (this.messagesContainer) {
      this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }
  }

  async sendMessage() {
    if (!this.currentConversation || !this.messageInput) return;
    const content = this.messageInput.value.trim();
    if (!content) return;

    try {
      this.messageInput.value = '';
      await window.r3l.apiPost(window.r3l.API_ENDPOINTS.MESSAGES.SEND, {
        recipientId: this.currentConversation.otherUserId,
        content: content,
      });
      this.fetchMessages(this.currentConversation.otherUserId); // Refresh messages
      this.fetchConversations(); // Refresh conversation list
    } catch (error) {
      debugLog('MessagingManager', 'Error sending message', error);
      // Maybe show an error in the UI
    }
  }

  startPolling(interval) {
    this.stopPolling();
    this.pollingInterval = setInterval(() => {
        this.fetchConversations();
        if (this.currentConversation) {
            this.fetchMessages(this.currentConversation.otherUserId);
        }
    }, interval);
  }

  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }
}

export const messagingManager = new MessagingManager();