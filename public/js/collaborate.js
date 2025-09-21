/* eslint-env es6, browser */
import { NavigationBar } from './components/navigation.js';

document.addEventListener('DOMContentLoaded', () => {
    NavigationBar.init('collaborate');

    const documentList = document.getElementById('document-list');
    const newDocBtn = document.getElementById('new-doc-btn');
    const participantList = document.getElementById('participant-list');
    const documentEditor = document.getElementById('document-editor');
    const chatMessages = document.getElementById('chat-messages');
    const chatInputField = document.getElementById('chat-input-field');

    let socket = null;
    let workspaceId = null;

    async function init() {
        const urlParams = new URLSearchParams(window.location.search);
        workspaceId = urlParams.get('id');

        if (!workspaceId) {
            const response = await fetch('/api/workspaces', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: 'My New Workspace' })
            });
            const workspace = await response.json();
            window.location.href = `/collaborate.html?id=${workspace.id}`;
        } else {
            connectWebSocket();
        }
    }

    function connectWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/api/workspaces/${workspaceId}/ws`;

        socket = new WebSocket(wsUrl);

        socket.addEventListener('open', () => {
            console.log('WebSocket connection established');
        });

        socket.addEventListener('message', (event) => {
            const message = JSON.parse(event.data);
            handleWebSocketMessage(message);
        });

        socket.addEventListener('close', () => {
            console.log('WebSocket connection closed. Reconnecting...');
            setTimeout(connectWebSocket, 1000);
        });

        socket.addEventListener('error', (error) => {
            console.error('WebSocket error:', error);
        });
    }

    function handleWebSocketMessage(message) {
        switch (message.type) {
            case 'workspace_state':
                updateUI(message.state);
                break;
            case 'document_created':
                addDocumentToList(message.document);
                break;
            case 'document_updated':
                if (documentEditor.dataset.docId === message.documentId) {
                    documentEditor.value = message.content;
                }
                break;
            case 'user_joined':
                addParticipantToList(message);
                break;
            case 'user_left':
                removeParticipantFromList(message.userId);
                break;
            case 'chat_message':
                addChatMessage(message);
                break;
        }
    }

    function updateUI(state) {
        documentList.innerHTML = '';
        state.documents.forEach(addDocumentToList);

        participantList.innerHTML = '';
        state.participants.forEach(addParticipantToList);
    }

    function addDocumentToList(doc) {
        const li = document.createElement('li');
        li.textContent = doc.name;
        li.dataset.docId = doc.id;
        li.addEventListener('click', () => {
            documentEditor.dataset.docId = doc.id;
            documentEditor.value = doc.content;
        });
        documentList.appendChild(li);
    }

    function addParticipantToList(participant) {
        const li = document.createElement('li');
        li.textContent = participant.userName;
        li.dataset.userId = participant.userId;
        participantList.appendChild(li);
    }

    function removeParticipantFromList(userId) {
        const li = participantList.querySelector(`[data-user-id="${userId}"]`);
        if (li) {
            li.remove();
        }
    }

    function addChatMessage(message) {
        const div = document.createElement('div');
        const userSpan = document.createElement('b');
        userSpan.textContent = message.userName + ':';
        div.appendChild(userSpan);
        div.appendChild(document.createTextNode(' ' + message.message));
        chatMessages.appendChild(div);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    newDocBtn.addEventListener('click', async () => {
        const docName = prompt('Enter document name:');
        if (docName) {
            const response = await fetch(`/api/workspaces/${workspaceId}/documents`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: docName })
            });
            const newDoc = await response.json();
            addDocumentToList(newDoc);
        }
    });

    documentEditor.addEventListener('input', () => {
        const docId = documentEditor.dataset.docId;
        if (docId && socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
                type: 'document_update',
                documentId: docId,
                content: documentEditor.value
            }));
        }
    });

    chatInputField.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const text = chatInputField.value;
            if (text && socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                    type: 'chat_message',
                    text: text
                }));
                chatInputField.value = '';
            }
        }
    });

    init();
});
