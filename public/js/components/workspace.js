/**
 * Collaborative Workspace Component
 * Real-time document editing and collaboration using Durable Objects
 */

export class CollaborativeWorkspace {
    constructor(workspaceId, containerId) {
        this.workspaceId = workspaceId;
        this.containerId = containerId;
        this.websocket = null;
        this.editor = null;
        this.participants = new Map();
        this.isConnected = false;
    }

    async init() {
        const container = document.getElementById(this.containerId);
        if (!container) {
            console.error(`Container ${this.containerId} not found`);
            return;
        }

        this.createUI(container);
        await this.connectToWorkspace();
        this.setupEditor();
    }

    createUI(container) {
        container.innerHTML = `
            <div class="workspace-header">
                <div class="workspace-info">
                    <h3 id="workspace-title">Loading workspace...</h3>
                    <div class="workspace-status">
                        <span id="connection-status" class="status-disconnected">Connecting...</span>
                        <span id="participant-count">0 participants</span>
                    </div>
                </div>
                <div class="workspace-actions">
                    <button id="save-btn" class="btn btn-primary" disabled>Save</button>
                    <button id="share-btn" class="btn btn-secondary">Share</button>
                </div>
            </div>
            <div class="workspace-participants" id="participants-list"></div>
            <div class="workspace-editor">
                <textarea id="editor" placeholder="Start typing to collaborate..."></textarea>
            </div>
            <div class="workspace-footer">
                <div class="typing-indicators" id="typing-indicators"></div>
            </div>
        `;
    }

    async connectToWorkspace() {
        try {
            // Get workspace info
            const workspace = await window.r3l.apiGet(`/api/workspaces/${this.workspaceId}`);
            document.getElementById('workspace-title').textContent = workspace.name;

            // Connect to collaboration room via Durable Object
            const wsUrl = `wss://${window.location.host}/api/collaboration/${this.workspaceId}/ws`;
            this.websocket = new WebSocket(wsUrl);

            this.websocket.onopen = () => {
                this.isConnected = true;
                this.updateConnectionStatus('connected');
                this.sendMessage({ type: 'join', userId: this.getCurrentUserId() });
            };

            this.websocket.onmessage = (event) => {
                const message = JSON.parse(event.data);
                this.handleMessage(message);
            };

            this.websocket.onclose = () => {
                this.isConnected = false;
                this.updateConnectionStatus('disconnected');
                // Attempt to reconnect after 3 seconds
                setTimeout(() => this.connectToWorkspace(), 3000);
            };

            this.websocket.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.updateConnectionStatus('error');
            };

        } catch (error) {
            console.error('Failed to connect to workspace:', error);
            this.updateConnectionStatus('error');
        }
    }

    setupEditor() {
        const editor = document.getElementById('editor');
        let typingTimer;

        editor.addEventListener('input', (event) => {
            if (!this.isConnected) return;

            // Send typing indicator
            this.sendMessage({
                type: 'typing',
                userId: this.getCurrentUserId()
            });

            // Clear previous timer
            clearTimeout(typingTimer);

            // Send content change after user stops typing for 500ms
            typingTimer = setTimeout(() => {
                this.sendMessage({
                    type: 'content_change',
                    content: editor.value,
                    userId: this.getCurrentUserId(),
                    timestamp: Date.now()
                });
            }, 500);
        });

        // Setup save button
        document.getElementById('save-btn').addEventListener('click', () => {
            this.saveWorkspace();
        });

        // Setup share button
        document.getElementById('share-btn').addEventListener('click', () => {
            this.shareWorkspace();
        });
    }

    handleMessage(message) {
        switch (message.type) {
            case 'content_update':
                this.updateEditorContent(message.content, message.userId);
                break;
            case 'participant_joined':
                this.addParticipant(message.participant);
                break;
            case 'participant_left':
                this.removeParticipant(message.userId);
                break;
            case 'typing_indicator':
                this.showTypingIndicator(message.userId);
                break;
            case 'participants_list':
                this.updateParticipantsList(message.participants);
                break;
            case 'workspace_saved':
                this.showSaveConfirmation();
                break;
        }
    }

    updateEditorContent(content, userId) {
        if (userId === this.getCurrentUserId()) return; // Don't update if it's our own change

        const editor = document.getElementById('editor');
        const cursorPosition = editor.selectionStart;
        
        editor.value = content;
        
        // Try to maintain cursor position
        editor.setSelectionRange(cursorPosition, cursorPosition);
        
        // Enable save button
        document.getElementById('save-btn').disabled = false;
    }

    addParticipant(participant) {
        this.participants.set(participant.userId, participant);
        this.updateParticipantsDisplay();
    }

    removeParticipant(userId) {
        this.participants.delete(userId);
        this.updateParticipantsDisplay();
        this.hideTypingIndicator(userId);
    }

    updateParticipantsList(participants) {
        this.participants.clear();
        participants.forEach(p => this.participants.set(p.userId, p));
        this.updateParticipantsDisplay();
    }

    updateParticipantsDisplay() {
        const container = document.getElementById('participants-list');
        const count = document.getElementById('participant-count');
        
        count.textContent = `${this.participants.size} participant${this.participants.size !== 1 ? 's' : ''}`;
        
        container.innerHTML = '';
        this.participants.forEach(participant => {
            const elem = document.createElement('div');
            elem.className = 'participant';
            elem.innerHTML = `
                <div class="participant-avatar">${participant.displayName.charAt(0)}</div>
                <span class="participant-name">${participant.displayName}</span>
            `;
            container.appendChild(elem);
        });
    }

    showTypingIndicator(userId) {
        const participant = this.participants.get(userId);
        if (!participant || userId === this.getCurrentUserId()) return;

        const container = document.getElementById('typing-indicators');
        const existingIndicator = container.querySelector(`[data-user-id="${userId}"]`);
        
        if (existingIndicator) {
            clearTimeout(existingIndicator.timer);
        } else {
            const indicator = document.createElement('span');
            indicator.className = 'typing-indicator';
            indicator.setAttribute('data-user-id', userId);
            indicator.textContent = `${participant.displayName} is typing...`;
            container.appendChild(indicator);
        }

        // Auto-hide after 3 seconds
        const indicator = container.querySelector(`[data-user-id="${userId}"]`);
        indicator.timer = setTimeout(() => {
            this.hideTypingIndicator(userId);
        }, 3000);
    }

    hideTypingIndicator(userId) {
        const container = document.getElementById('typing-indicators');
        const indicator = container.querySelector(`[data-user-id="${userId}"]`);
        if (indicator) {
            indicator.remove();
        }
    }

    updateConnectionStatus(status) {
        const statusElement = document.getElementById('connection-status');
        statusElement.className = `status-${status}`;
        
        const statusText = {
            connected: 'Connected',
            disconnected: 'Disconnected',
            error: 'Connection Error'
        };
        
        statusElement.textContent = statusText[status] || status;
    }

    async saveWorkspace() {
        if (!this.isConnected) return;

        const content = document.getElementById('editor').value;
        
        try {
            await window.r3l.apiPost(`/api/workspaces/${this.workspaceId}/save`, {
                content: content
            });
            
            this.sendMessage({
                type: 'save_workspace',
                content: content,
                userId: this.getCurrentUserId()
            });
            
        } catch (error) {
            console.error('Failed to save workspace:', error);
            alert('Failed to save workspace. Please try again.');
        }
    }

    shareWorkspace() {
        const shareUrl = `${window.location.origin}/collaborate.html?workspace=${this.workspaceId}`;
        
        if (navigator.share) {
            navigator.share({
                title: 'Collaborative Workspace',
                url: shareUrl
            });
        } else {
            // Fallback: copy to clipboard
            navigator.clipboard.writeText(shareUrl).then(() => {
                alert('Workspace link copied to clipboard!');
            }).catch(() => {
                prompt('Copy this link to share the workspace:', shareUrl);
            });
        }
    }

    showSaveConfirmation() {
        const saveBtn = document.getElementById('save-btn');
        const originalText = saveBtn.textContent;
        
        saveBtn.textContent = 'Saved!';
        saveBtn.disabled = true;
        
        setTimeout(() => {
            saveBtn.textContent = originalText;
        }, 2000);
    }

    sendMessage(message) {
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            this.websocket.send(JSON.stringify(message));
        }
    }

    getCurrentUserId() {
        // This should be implemented based on your auth system
        return window.r3l.getCurrentUser?.()?.id || 'anonymous';
    }

    destroy() {
        if (this.websocket) {
            this.websocket.close();
        }
    }
}

// Auto-initialize if workspace ID is in URL
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const workspaceId = urlParams.get('workspace');
    
    if (workspaceId && document.getElementById('workspace-container')) {
        const workspace = new CollaborativeWorkspace(workspaceId, 'workspace-container');
        workspace.init();
        
        // Make it globally accessible
        window.collaborativeWorkspace = workspace;
    }
});