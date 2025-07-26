/**
 * R3L:F Messaging Component
 * Handles direct messaging between users
 */

// Define a simple debug log function
const debugLog = (component, message, data) => {
  console.log(`[${component}] ${message}`, data || '');
};

export class MessagingManager {
  constructor() {
    this.conversations = [];
    this.currentConversation = null;
    this.messages = [];
    this.unreadCounts = {};
    this.websocket = null;
    this.initialized = false;
    this.isLoading = false;
    this.hasPendingMessages = false;
    this.userId = null;
    this.onNewMessage = null;
    this.onConversationUpdate = null;
    this.lastMessageTime = 0;
    this.messagesContainer = null;
    this.messageInput = null;
    this.sendButton = null;
    this.conversationsContainer = null;
    this.isWebsocketActive = false;
  }

  /**
   * Initialize the messaging manager
   * @param {Object} options - Configuration options
   * @param {string} options.userId - Current user ID
   * @param {HTMLElement} options.messagesContainer - Container for messages
   * @param {HTMLElement} options.messageInput - Message input element
   * @param {HTMLElement} options.sendButton - Send button element
   * @param {HTMLElement} options.conversationsContainer - Container for conversation list
   * @param {Function} options.onNewMessage - Callback when new message arrives
   * @param {Function} options.onConversationUpdate - Callback when conversation list updates
   */
  init(options = {}) {
    debugLog('MessagingManager', 'Initializing messaging manager', options);
    
    this.userId = options.userId;
    this.messagesContainer = options.messagesContainer;
    this.messageInput = options.messageInput;
    this.sendButton = options.sendButton;
    this.conversationsContainer = options.conversationsContainer;
    this.onNewMessage = options.onNewMessage;
    this.onConversationUpdate = options.onConversationUpdate;
    
    if (!this.userId) {
      debugLog('MessagingManager', 'No user ID provided, aborting initialization');
      return;
    }
    
    this.setupEventListeners();
    this.setupWebsocket();
    
    this.fetchConversations();
    
    this.initialized = true;
    
    // Start polling as a fallback in case websocket connection fails
    this.startPolling(30000); // Poll every 30 seconds
  }
  
  /**
   * Set up event listeners
   */
  setupEventListeners() {
    if (this.sendButton && this.messageInput) {
      this.sendButton.addEventListener('click', (e) => {
        e.preventDefault();
        this.sendMessage();
      });
      
      this.messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      });
    }
  }
  
  /**
   * Set up websocket connection for real-time messaging
   */
  setupWebsocket() {
    // Check if WebSocket is supported
    if (!window.WebSocket) {
      debugLog('MessagingManager', 'WebSocket not supported by this browser');
      return;
    }
    
    try {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${wsProtocol}//${window.location.host}/api/connections/connect`;
      
      debugLog('MessagingManager', 'Setting up WebSocket connection', { wsUrl });
      
      this.websocket = new WebSocket(wsUrl);
      
      this.websocket.onopen = () => {
        debugLog('MessagingManager', 'WebSocket connection opened');
        this.isWebsocketActive = true;
        
        // Send authentication message
        this.websocket.send(JSON.stringify({
          type: 'auth',
          userId: this.userId
        }));
        
        // Set up ping interval to keep connection alive
        this.pingInterval = setInterval(() => {
          if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            this.websocket.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000);
      };
      
      this.websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
            case 'connected':
              debugLog('MessagingManager', 'WebSocket auth successful', data);
              break;
              
            case 'pong':
              // Just a keepalive response
              break;
              
            case 'new_message':
              debugLog('MessagingManager', 'New message received via WebSocket', data);
              
              // Handle the new message
              if (data.message) {
                this.handleNewMessage(data.message);
              }
              break;
              
            default:
              debugLog('MessagingManager', 'Unknown WebSocket message type', data);
          }
        } catch (error) {
          debugLog('MessagingManager', 'Error handling WebSocket message', error);
        }
      };
      
      this.websocket.onclose = () => {
        debugLog('MessagingManager', 'WebSocket connection closed');
        this.isWebsocketActive = false;
        
        if (this.pingInterval) {
          clearInterval(this.pingInterval);
        }
        
        // Try to reconnect after a delay
        setTimeout(() => {
          if (!this.isWebsocketActive) {
            this.setupWebsocket();
          }
        }, 5000);
      };
      
      this.websocket.onerror = (error) => {
        debugLog('MessagingManager', 'WebSocket error', error);
        this.isWebsocketActive = false;
      };
    } catch (error) {
      debugLog('MessagingManager', 'Error setting up WebSocket', error);
    }
  }
  
  /**
   * Handle a new message received via WebSocket
   * @param {Object} messageData - Message data
   */
  handleNewMessage(messageData) {
    // Check if this message is for the current conversation
    if (this.currentConversation && 
        (messageData.fromUserId === this.currentConversation.otherUserId || 
         messageData.toUserId === this.currentConversation.otherUserId)) {
      
      // Add message to the current conversation
      this.messages.push({
        id: messageData.messageId,
        content: messageData.content,
        fromUserId: messageData.fromUserId,
        toUserId: messageData.toUserId || this.userId, // Assume it's for current user if not specified
        createdAt: messageData.createdAt,
        isRead: false
      });
      
      // Render the new message
      this.renderMessages();
      
      // Mark as read if we're currently viewing this conversation
      this.markCurrentConversationAsRead();
    } else {
      // Update unread count for this conversation
      const otherUserId = messageData.fromUserId;
      this.unreadCounts[otherUserId] = (this.unreadCounts[otherUserId] || 0) + 1;
      
      // Update conversation list if needed
      this.updateConversationList(otherUserId);
    }
    
    // Call onNewMessage callback if provided
    if (this.onNewMessage) {
      this.onNewMessage(messageData);
    }
  }
  
  /**
   * Update the conversation list after receiving a new message
   */
  updateConversationList(otherUserId) {
    // Find the conversation in our list
    const conversationIndex = this.conversations.findIndex(c => c.otherUserId === otherUserId);
    
    if (conversationIndex >= 0) {
      // Update the existing conversation
      this.conversations[conversationIndex].unreadCount = this.unreadCounts[otherUserId] || 0;
      
      // Move it to the top of the list
      const conversation = this.conversations.splice(conversationIndex, 1)[0];
      this.conversations.unshift(conversation);
    } else {
      // We don't have this conversation yet, fetch the updated list
      this.fetchConversations();
    }
    
    // Update the UI
    this.renderConversations();
    
    // Call onConversationUpdate callback if provided
    if (this.onConversationUpdate) {
      this.onConversationUpdate(this.conversations);
    }
  }
  
  /**
   * Fetch user conversations
   */
  async fetchConversations() {
    if (!this.initialized || this.isLoading) return;
    
    this.isLoading = true;
    
    try {
      const response = await fetch('/api/messages/conversations', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Error fetching conversations: ${response.status}`);
      }
      
      const conversations = await response.json();
      this.conversations = conversations;
      
      // Update unread counts
      this.unreadCounts = {};
      this.conversations.forEach(conv => {
        this.unreadCounts[conv.otherUserId] = conv.unreadCount || 0;
      });
      
      this.renderConversations();
      
      if (this.onConversationUpdate) {
        this.onConversationUpdate(this.conversations);
      }
      
      return conversations;
    } catch (error) {
      debugLog('MessagingManager', 'Error fetching conversations', error);
      return [];
    } finally {
      this.isLoading = false;
    }
  }
  
  /**
   * Render the conversation list
   */
  renderConversations() {
    if (!this.conversationsContainer) return;
    
    // Clear container
    this.conversationsContainer.innerHTML = '';
    
    if (this.conversations.length === 0) {
      this.conversationsContainer.innerHTML = `
        <div class="empty-conversations">
          <p>No conversations yet</p>
        </div>
      `;
      return;
    }
    
    // Create conversation items
    this.conversations.forEach(conversation => {
      const conversationEl = document.createElement('div');
      conversationEl.className = `conversation-item ${this.currentConversation && this.currentConversation.id === conversation.id ? 'active' : ''}`;
      conversationEl.dataset.id = conversation.id;
      conversationEl.dataset.userId = conversation.otherUserId;
      
      // Format date
      const date = new Date(conversation.lastMessageAt);
      const formattedDate = date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
      
      // Create HTML
      conversationEl.innerHTML = `
        <div class="conversation-avatar">
          <span class="avatar-placeholder">${conversation.otherUserId.charAt(0).toUpperCase()}</span>
        </div>
        <div class="conversation-content">
          <div class="conversation-header">
            <h4>${conversation.otherUserId}</h4>
            <span class="conversation-time">${formattedDate}</span>
          </div>
          <p class="conversation-preview">
            ${conversation.isLastMessageFromMe ? 'You: ' : ''}
            ${conversation.lastMessagePreview || 'No messages yet'}
          </p>
        </div>
        ${conversation.unreadCount > 0 ? `
          <div class="unread-badge">${conversation.unreadCount}</div>
        ` : ''}
      `;
      
      // Add click event
      conversationEl.addEventListener('click', () => {
        this.selectConversation(conversation);
      });
      
      this.conversationsContainer.appendChild(conversationEl);
    });
  }
  
  /**
   * Select a conversation
   * @param {Object} conversation - Conversation to select
   */
  selectConversation(conversation) {
    this.currentConversation = conversation;
    
    // Update UI
    if (this.conversationsContainer) {
      const items = this.conversationsContainer.querySelectorAll('.conversation-item');
      items.forEach(item => {
        if (item.dataset.id === conversation.id) {
          item.classList.add('active');
        } else {
          item.classList.remove('active');
        }
      });
    }
    
    // Fetch messages for this conversation
    this.fetchMessages(conversation.otherUserId);
    
    // Mark as read
    this.markCurrentConversationAsRead();
  }
  
  /**
   * Mark current conversation as read
   */
  async markCurrentConversationAsRead() {
    if (!this.currentConversation) return;
    
    try {
      // Mark conversation as read in the API
      const response = await fetch(`/api/messages/conversations/${this.currentConversation.id}/read`, {
        method: 'POST',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Error marking conversation as read: ${response.status}`);
      }
      
      // Update local state
      this.currentConversation.unreadCount = 0;
      this.unreadCounts[this.currentConversation.otherUserId] = 0;
      
      // Update UI
      this.renderConversations();
      
      return true;
    } catch (error) {
      debugLog('MessagingManager', 'Error marking conversation as read', error);
      return false;
    }
  }
  
  /**
   * Fetch messages for a conversation
   * @param {string} otherUserId - The other user's ID
   * @param {string} [beforeId] - Fetch messages before this ID (for pagination)
   */
  async fetchMessages(otherUserId, beforeId) {
    if (!this.initialized || this.isLoading) return;
    
    this.isLoading = true;
    
    try {
      // Build URL with optional beforeId parameter
      let url = `/api/messages/user/${otherUserId}`;
      if (beforeId) {
        url += `?before=${beforeId}`;
      }
      
      const response = await fetch(url, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Error fetching messages: ${response.status}`);
      }
      
      const messages = await response.json();
      
      if (beforeId) {
        // Append to existing messages for pagination
        this.messages = [...this.messages, ...messages];
      } else {
        // New conversation, replace messages
        this.messages = messages;
      }
      
      this.renderMessages();
      
      return messages;
    } catch (error) {
      debugLog('MessagingManager', 'Error fetching messages', error);
      return [];
    } finally {
      this.isLoading = false;
    }
  }
  
  /**
   * Render messages in the container
   */
  renderMessages() {
    if (!this.messagesContainer) return;
    
    // Sort messages by creation time
    const sortedMessages = [...this.messages].sort((a, b) => a.createdAt - b.createdAt);
    
    // Clear container if this is the first batch
    if (!this.hasPendingMessages) {
      this.messagesContainer.innerHTML = '';
    }
    
    if (sortedMessages.length === 0) {
      this.messagesContainer.innerHTML = `
        <div class="empty-messages">
          <p>No messages yet. Start the conversation!</p>
        </div>
      `;
      return;
    }
    
    // Group messages by date
    let currentDate = null;
    
    sortedMessages.forEach(message => {
      // Check if we already rendered this message
      if (this.messagesContainer.querySelector(`[data-message-id="${message.id}"]`)) {
        return;
      }
      
      // Check if we need to add a date separator
      const messageDate = new Date(message.createdAt);
      const messageDay = messageDate.toDateString();
      
      if (messageDay !== currentDate) {
        currentDate = messageDay;
        
        const dateEl = document.createElement('div');
        dateEl.className = 'message-date-separator';
        dateEl.innerHTML = `<span>${messageDate.toLocaleDateString()}</span>`;
        this.messagesContainer.appendChild(dateEl);
      }
      
      // Create message element
      const messageEl = document.createElement('div');
      messageEl.className = `message-item ${message.fromUserId === this.userId ? 'sent' : 'received'}`;
      messageEl.dataset.messageId = message.id;
      
      // Format time
      const formattedTime = messageDate.toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit'
      });
      
      // Create message content
      messageEl.innerHTML = `
        <div class="message-content">
          <div class="message-bubble">
            <p>${message.isEncrypted ? '[Encrypted Message]' : message.content}</p>
          </div>
          <div class="message-meta">
            <span class="message-time">${formattedTime}</span>
            ${message.fromUserId === this.userId ? `
              <span class="message-status">
                <span class="material-icons">${message.isRead ? 'done_all' : 'done'}</span>
              </span>
            ` : ''}
          </div>
        </div>
      `;
      
      // Add message to container
      this.messagesContainer.appendChild(messageEl);
    });
    
    // Scroll to bottom if we're not paginating
    if (!this.hasPendingMessages) {
      this.scrollToBottom();
    }
    
    this.hasPendingMessages = false;
  }
  
  /**
   * Scroll message container to bottom
   */
  scrollToBottom() {
    if (this.messagesContainer) {
      this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }
  }
  
  /**
   * Send a message
   */
  async sendMessage() {
    if (!this.initialized || !this.currentConversation || !this.messageInput) return;
    
    const content = this.messageInput.value.trim();
    
    if (!content) return;
    
    try {
      const otherUserId = this.currentConversation.otherUserId;
      
      // Optimistically add message to UI
      const tempId = `temp-${Date.now()}`;
      const tempMessage = {
        id: tempId,
        fromUserId: this.userId,
        toUserId: otherUserId,
        content: content,
        createdAt: Date.now(),
        isRead: false,
        isTemp: true
      };
      
      this.messages.push(tempMessage);
      this.renderMessages();
      this.scrollToBottom();
      
      // Clear input
      this.messageInput.value = '';
      
      // Send to server
      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recipientId: otherUserId,
          content: content
        }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Error sending message: ${response.status}`);
      }
      
      const result = await response.json();
      
      // Replace temp message with real one
      const messageIndex = this.messages.findIndex(m => m.id === tempId);
      if (messageIndex >= 0) {
        this.messages[messageIndex] = {
          ...tempMessage,
          id: result.messageId,
          isTemp: false
        };
      }
      
      // Update UI to show the real message
      this.renderMessages();
      
      // Update conversation in the list
      this.fetchConversations();
      
      return result;
    } catch (error) {
      debugLog('MessagingManager', 'Error sending message', error);
      
      // Show error in UI
      // TODO: Implement error handling in UI
      
      return null;
    }
  }
  
  /**
   * Create a new conversation with a user
   * @param {string} userId - User ID to start conversation with
   */
  startConversation(userId) {
    // Check if we already have this conversation
    const existingConversation = this.conversations.find(c => c.otherUserId === userId);
    
    if (existingConversation) {
      this.selectConversation(existingConversation);
      return;
    }
    
    // Create a new conversation object
    const newConversation = {
      id: `temp-${Date.now()}`,
      otherUserId: userId,
      lastMessageAt: Date.now(),
      lastMessagePreview: '',
      unreadCount: 0
    };
    
    // Add to conversations list
    this.conversations.unshift(newConversation);
    this.renderConversations();
    
    // Select it
    this.selectConversation(newConversation);
  }
  
  /**
   * Delete a message
   * @param {string} messageId - Message ID to delete
   */
  async deleteMessage(messageId) {
    try {
      const response = await fetch(`/api/messages/${messageId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Error deleting message: ${response.status}`);
      }
      
      // Remove from local messages
      this.messages = this.messages.filter(m => m.id !== messageId);
      
      // Update UI
      this.renderMessages();
      
      return true;
    } catch (error) {
      debugLog('MessagingManager', 'Error deleting message', error);
      return false;
    }
  }
  
  /**
   * Get total unread message count
   * @returns {number} Total unread message count
   */
  getTotalUnreadCount() {
    return Object.values(this.unreadCounts).reduce((total, count) => total + count, 0);
  }
  
  /**
   * Poll for new messages and conversations
   * @param {number} interval - Polling interval in milliseconds
   */
  startPolling(interval = 30000) {
    this.stopPolling(); // Stop any existing interval
    
    this.pollingInterval = setInterval(() => {
      // Only poll if we're not using WebSocket or it's not active
      if (!this.isWebsocketActive) {
        this.fetchConversations();
        
        // Also fetch messages for current conversation
        if (this.currentConversation) {
          this.fetchMessages(this.currentConversation.otherUserId);
        }
      }
    }, interval);
  }
  
  /**
   * Stop polling for messages
   */
  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }
}

// Create a singleton instance
export const messagingManager = new MessagingManager();
