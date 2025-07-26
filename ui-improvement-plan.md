# R3L:F UI Improvement Plan

## Overview

This document outlines recommendations for improving the R3L:F user interface for accessibility, usability, and content display. The focus is on making the UI more intuitive, ensuring demo/placeholder content is appealing and representative, and improving real-time updates and notifications.

## 1. Accessibility Improvements

### Navigation and Wayfinding

1. **Keyboard Navigation**
   - Add focus styles to all interactive elements
   - Ensure tab order is logical and all functions are keyboard accessible
   - Add keyboard shortcuts for common actions (documented with tooltips)

2. **Screen Reader Support**
   - Add proper ARIA labels to interactive elements
   - Add descriptive alt text to all icons and images
   - Ensure forms have proper label associations

3. **Contrast and Readability**
   - Review color contrast for text vs background (especially green text on dark backgrounds)
   - Increase font size for better readability (minimum 16px)
   - Ensure sufficient spacing between interactive elements

### Implementation Tasks:

```css
/* Add to rel-f-global.css */
:focus {
  outline: 3px solid var(--accent-lavender);
  outline-offset: 2px;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

## 2. Notification System Implementation

The current notification system is incomplete. We need to implement:

### Real-time Notifications

1. **Notification Types**
   - System notifications (expiring content, system updates)
   - Connection requests and updates
   - Content interactions (votes, comments, archiving)
   - Direct messages

2. **Notification UI**
   - Add notification bell to navigation bar with counter
   - Create notification dropdown with categorized notifications
   - Implement notification settings in user profile

3. **Backend Implementation**
   - Complete the `NotificationHandler` class
   - Implement WebSocket-based real-time notifications using the existing Durable Objects

### Implementation Tasks:

```typescript
// src/handlers/notification.ts
import { Env } from '../types/env';

export interface Notification {
  id: string;
  userId: string;
  type: 'system' | 'connection' | 'content' | 'message';
  title: string;
  content: string;
  actionUrl?: string;
  isRead: boolean;
  createdAt: number;
}

export class NotificationHandler {
  constructor() {}
  
  /**
   * Create a new notification for a user
   */
  async createNotification(
    userId: string,
    type: 'system' | 'connection' | 'content' | 'message',
    title: string,
    content: string,
    actionUrl: string | null,
    env: Env
  ): Promise<string> {
    const notificationId = crypto.randomUUID();
    const now = Date.now();
    
    await env.R3L_DB.prepare(`
      INSERT INTO notifications (id, user_id, type, title, content, action_url, is_read, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      notificationId,
      userId,
      type,
      title,
      content,
      actionUrl || null,
      0, // not read
      now
    ).run();
    
    // Trigger real-time notification if user is online
    try {
      const connectionsObj = env.R3L_CONNECTIONS.get(
        env.R3L_CONNECTIONS.idFromName(userId)
      );
      
      await connectionsObj.fetch(new Request('https://internal/notify', {
        method: 'POST',
        body: JSON.stringify({
          userId,
          notification: {
            id: notificationId,
            type,
            title,
            content,
            actionUrl,
            createdAt: now
          }
        })
      }));
    } catch (error) {
      console.error('Error sending real-time notification:', error);
      // Continue anyway, they'll see it next time they load the page
    }
    
    return notificationId;
  }
  
  /**
   * Get notifications for a user
   */
  async getUserNotifications(
    userId: string,
    limit: number = 20,
    offset: number = 0,
    env: Env
  ): Promise<Notification[]> {
    const result = await env.R3L_DB.prepare(`
      SELECT id, user_id, type, title, content, action_url, is_read, created_at
      FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).bind(userId, limit, offset).all<Notification>();
    
    return result.results || [];
  }
  
  /**
   * Get unread notification count for a user
   */
  async getUnreadCount(userId: string, env: Env): Promise<number> {
    const result = await env.R3L_DB.prepare(`
      SELECT COUNT(*) as count
      FROM notifications
      WHERE user_id = ? AND is_read = 0
    `).bind(userId).first<{ count: number }>();
    
    return result?.count || 0;
  }
  
  /**
   * Mark notifications as read
   */
  async markAsRead(userId: string, notificationIds: string[], env: Env): Promise<void> {
    // Create placeholders for SQL query
    const placeholders = notificationIds.map(() => '?').join(', ');
    
    await env.R3L_DB.prepare(`
      UPDATE notifications
      SET is_read = 1
      WHERE user_id = ? AND id IN (${placeholders})
    `).bind(userId, ...notificationIds).run();
  }
  
  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string, env: Env): Promise<void> {
    await env.R3L_DB.prepare(`
      UPDATE notifications
      SET is_read = 1
      WHERE user_id = ?
    `).bind(userId).run();
  }
  
  /**
   * Delete a notification
   */
  async deleteNotification(userId: string, notificationId: string, env: Env): Promise<void> {
    await env.R3L_DB.prepare(`
      DELETE FROM notifications
      WHERE user_id = ? AND id = ?
    `).bind(userId, notificationId).run();
  }
}
```

## 3. Secure Messaging System

Currently, the system has a collaboration module but lacks a proper direct messaging system. We should:

1. **Create a DM Interface**
   - Implement a new `/messages.html` page
   - Add messaging icon to navigation
   - Show unread message count in navigation

2. **Implement the Backend**
   - Create a `MessageHandler` class using the existing Durable Objects
   - Ensure messages are encrypted end-to-end
   - Support 1:1 and group conversations

3. **Real-time Messaging**
   - Leverage the existing `CollaborationRoom` for real-time updates
   - Add typing indicators and read receipts

## 4. Improved File Explorer Interface

The current file management in drawer.html is limited. Let's create an R2-explorer like interface:

1. **Enhanced File Grid**
   - Add thumbnails for images and media files
   - Add file preview functionality (inline for supported types)
   - Implement drag-and-drop uploads

2. **File Operations**
   - Add multi-select with batch operations (delete, move, share)
   - Add folder creation and navigation
   - Implement file versioning for important documents

3. **Organization and Filtering**
   - Add custom tags and metadata filtering
   - Implement saved searches/filters
   - Add sort options (name, date, size, type)

### Implementation Tasks:

Create a new file-explorer.html page with enhanced functionality:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>File Explorer - R3L:F</title>
  <link rel="stylesheet" href="css/rel-f-global.css">
  <script src="js/font-loader.js" defer></script>
  <style>
    /* File explorer specific styles */
    .explorer-container {
      display: flex;
      height: calc(100vh - 200px);
      min-height: 500px;
      border-radius: var(--radius-md);
      overflow: hidden;
      border: 1px solid var(--border-primary);
    }
    
    .explorer-sidebar {
      width: 250px;
      background-color: var(--bg-container-alt);
      border-right: 1px solid var(--border-primary);
      padding: var(--space-2);
      overflow-y: auto;
    }
    
    .explorer-content {
      flex: 1;
      background-color: var(--bg-container);
      overflow-y: auto;
      display: flex;
      flex-direction: column;
    }
    
    .explorer-toolbar {
      padding: var(--space-2);
      border-bottom: 1px solid var(--border-primary);
      display: flex;
      gap: var(--space-2);
      align-items: center;
    }
    
    .path-breadcrumb {
      flex: 1;
      background-color: var(--bg-deep);
      border-radius: var(--radius-sm);
      padding: var(--space-2);
      font-family: var(--font-mono);
      font-size: var(--fs-sm);
      overflow-x: auto;
      white-space: nowrap;
    }
    
    .file-grid {
      flex: 1;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: var(--space-2);
      padding: var(--space-2);
    }
    
    .file-item {
      position: relative;
      border-radius: var(--radius-sm);
      padding: var(--space-2);
      background-color: var(--bg-deep);
      border: 1px solid transparent;
      cursor: pointer;
      transition: all var(--transition-fast);
      user-select: none;
    }
    
    .file-item:hover {
      border-color: var(--accent-lavender);
      box-shadow: 0 0 0 1px var(--accent-lavender);
    }
    
    .file-item.selected {
      background-color: var(--accent-lavender-muted);
      border-color: var(--accent-lavender);
    }
    
    .file-icon {
      display: flex;
      justify-content: center;
      margin-bottom: var(--space-2);
    }
    
    .file-icon .material-icons {
      font-size: 2.5rem;
    }
    
    .file-thumbnail {
      width: 100%;
      height: 100px;
      object-fit: cover;
      border-radius: var(--radius-sm);
      background-color: var(--bg-container-alt);
    }
    
    .file-name {
      font-size: var(--fs-sm);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      text-align: center;
    }
    
    .file-meta {
      font-size: var(--fs-xs);
      color: var(--text-muted);
      text-align: center;
    }
    
    .tree-item {
      margin: var(--space-1) 0;
      padding: var(--space-1) var(--space-2);
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: all var(--transition-fast);
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }
    
    .tree-item:hover {
      background-color: var(--bg-deep);
    }
    
    .tree-item.active {
      background-color: var(--accent-lavender-muted);
    }
    
    .status-bar {
      padding: var(--space-2);
      border-top: 1px solid var(--border-primary);
      display: flex;
      justify-content: space-between;
      font-size: var(--fs-sm);
      color: var(--text-muted);
    }
    
    .drag-area {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: 2rem;
      border: 2px dashed var(--border-primary);
      border-radius: var(--radius-md);
      margin: 1rem;
      transition: all var(--transition-fast);
    }
    
    .drag-area.active {
      border-color: var(--accent-lavender);
      background-color: rgba(162, 120, 255, 0.1);
    }
    
    .context-menu {
      position: absolute;
      min-width: 200px;
      background-color: var(--bg-container);
      border: 1px solid var(--border-primary);
      border-radius: var(--radius-sm);
      box-shadow: var(--shadow-medium);
      z-index: var(--z-dropdown);
    }
    
    .context-menu-item {
      padding: var(--space-2);
      display: flex;
      align-items: center;
      gap: var(--space-2);
      cursor: pointer;
      transition: all var(--transition-fast);
    }
    
    .context-menu-item:hover {
      background-color: var(--bg-container-alt);
    }
    
    .context-menu-separator {
      height: 1px;
      background-color: var(--border-primary);
      margin: var(--space-1) 0;
    }
  </style>
</head>
<body>
  <header>
    <div class="container">
      <!-- Navigation will be inserted by JavaScript -->
    </div>
  </header>

  <main class="container">
    <h1>
      <span class="material-icons">folder_open</span>
      File Explorer
    </h1>
    
    <div class="explorer-container">
      <!-- Sidebar -->
      <div class="explorer-sidebar">
        <h3>Locations</h3>
        <div class="tree">
          <div class="tree-item active">
            <span class="material-icons">home</span>
            <span>Home</span>
          </div>
          <div class="tree-item">
            <span class="material-icons">folder_shared</span>
            <span>Public Files</span>
          </div>
          <div class="tree-item">
            <span class="material-icons">lock</span>
            <span>Private Files</span>
          </div>
          <div class="tree-item">
            <span class="material-icons">history</span>
            <span>Recently Modified</span>
          </div>
          <div class="tree-item">
            <span class="material-icons">favorite</span>
            <span>Favorites</span>
          </div>
          <div class="tree-item">
            <span class="material-icons">delete</span>
            <span>Trash</span>
          </div>
        </div>
        
        <h3 class="mt-4">Folders</h3>
        <div class="tree">
          <div class="tree-item">
            <span class="material-icons">folder</span>
            <span>Documents</span>
          </div>
          <div class="tree-item">
            <span class="material-icons">folder</span>
            <span>Images</span>
          </div>
          <div class="tree-item">
            <span class="material-icons">folder</span>
            <span>Projects</span>
          </div>
          <div class="tree-item">
            <span class="material-icons">add</span>
            <span>New Folder...</span>
          </div>
        </div>
        
        <h3 class="mt-4">Tags</h3>
        <div class="tree">
          <div class="tree-item">
            <span class="material-icons">label</span>
            <span>Research</span>
          </div>
          <div class="tree-item">
            <span class="material-icons">label</span>
            <span>Work</span>
          </div>
          <div class="tree-item">
            <span class="material-icons">label</span>
            <span>Creative</span>
          </div>
          <div class="tree-item">
            <span class="material-icons">add</span>
            <span>New Tag...</span>
          </div>
        </div>
      </div>
      
      <!-- Main content -->
      <div class="explorer-content">
        <!-- Toolbar -->
        <div class="explorer-toolbar">
          <button class="btn btn-sm">
            <span class="material-icons">arrow_back</span>
          </button>
          <button class="btn btn-sm">
            <span class="material-icons">arrow_forward</span>
          </button>
          <button class="btn btn-sm">
            <span class="material-icons">refresh</span>
          </button>
          
          <div class="path-breadcrumb">
            /home/documents
          </div>
          
          <button class="btn btn-sm">
            <span class="material-icons">view_list</span>
          </button>
          <button class="btn btn-sm">
            <span class="material-icons">view_module</span>
          </button>
          
          <div class="search-input-group">
            <input type="text" placeholder="Search..." class="search-input">
            <button class="search-button">
              <span class="material-icons">search</span>
            </button>
          </div>
        </div>
        
        <!-- File grid -->
        <div class="file-grid" id="file-grid">
          <!-- Will be populated by JavaScript -->
        </div>
        
        <!-- Status bar -->
        <div class="status-bar">
          <div>8 items (3 selected)</div>
          <div>256.4 MB available</div>
        </div>
      </div>
    </div>
    
    <!-- Upload drop area (shown when dragging) -->
    <div id="drop-area" class="drag-area hidden">
      <span class="material-icons" style="font-size: 3rem;">cloud_upload</span>
      <h3>Drop files here to upload</h3>
      <p>Files will be uploaded to the current folder</p>
    </div>
  </main>

  <footer>
    <div class="container">
      <p>R3L:F - Relational Ephemeral Filenet</p>
      <p>Anti-algorithmic, Ephemeral by Default, Community-driven</p>
    </div>
  </footer>
  
  <script type="module">
    import { NavigationBar } from './js/components/navigation.js';
    
    document.addEventListener('DOMContentLoaded', () => {
      // Initialize navigation
      NavigationBar.init('files');
      
      // File grid
      const fileGrid = document.getElementById('file-grid');
      
      // Sample data - would be loaded from API in real implementation
      const files = [
        { id: 'file1', name: 'research-notes.md', type: 'text/markdown', size: 12500, modified: Date.now() - 3600000 },
        { id: 'file2', name: 'data-analysis.ipynb', type: 'application/x-ipynb+json', size: 45200, modified: Date.now() - 86400000 },
        { id: 'file3', name: 'presentation.pdf', type: 'application/pdf', size: 1250000, modified: Date.now() - 172800000 },
        { id: 'file4', name: 'photo.jpg', type: 'image/jpeg', size: 2500000, modified: Date.now() - 259200000, thumbnail: '/images/sample-thumb.jpg' },
        { id: 'file5', name: 'visualization.json', type: 'application/json', size: 34100, modified: Date.now() - 345600000 },
        { id: 'file6', name: 'audio-sample.mp3', type: 'audio/mpeg', size: 4800000, modified: Date.now() - 432000000 },
        { id: 'file7', name: 'config.json', type: 'application/json', size: 1240, modified: Date.now() - 518400000 },
        { id: 'file8', name: 'notes.txt', type: 'text/plain', size: 8400, modified: Date.now() - 604800000 }
      ];
      
      // File icon mapping
      const fileIcons = {
        'image/': 'image',
        'audio/': 'audiotrack',
        'video/': 'videocam',
        'application/pdf': 'picture_as_pdf',
        'application/zip': 'folder_zip',
        'text/plain': 'text_snippet',
        'application/json': 'data_object',
        'text/csv': 'table_chart',
        'application/x-ipynb+json': 'code',
        'text/markdown': 'article',
        'text/html': 'html',
        'application/msword': 'description',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'description',
        'default': 'insert_drive_file'
      };
      
      // Get icon for file type
      function getFileIcon(fileType) {
        for (const type in fileIcons) {
          if (fileType.startsWith(type)) {
            return fileIcons[type];
          }
        }
        return fileIcons.default;
      }
      
      // Format file size
      function formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' bytes';
        else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        else if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
        else return (bytes / 1073741824).toFixed(1) + ' GB';
      }
      
      // Render file grid
      function renderFiles(files) {
        fileGrid.innerHTML = '';
        
        files.forEach(file => {
          const fileItem = document.createElement('div');
          fileItem.className = 'file-item';
          fileItem.dataset.id = file.id;
          
          // Determine if file has thumbnail or uses icon
          let fileDisplay;
          if (file.type.startsWith('image/') && file.thumbnail) {
            fileDisplay = `<img src="${file.thumbnail}" class="file-thumbnail" alt="${file.name}">`;
          } else {
            fileDisplay = `
              <div class="file-icon">
                <span class="material-icons">${getFileIcon(file.type)}</span>
              </div>
            `;
          }
          
          fileItem.innerHTML = `
            ${fileDisplay}
            <div class="file-name">${file.name}</div>
            <div class="file-meta">${formatFileSize(file.size)}</div>
          `;
          
          // Event listeners
          fileItem.addEventListener('click', (e) => {
            const isSelected = fileItem.classList.contains('selected');
            
            // If not holding ctrl/cmd, deselect all others
            if (!e.ctrlKey && !e.metaKey) {
              document.querySelectorAll('.file-item.selected').forEach(item => {
                if (item !== fileItem) {
                  item.classList.remove('selected');
                }
              });
            }
            
            // Toggle selection of this item
            fileItem.classList.toggle('selected');
          });
          
          // Double-click to open
          fileItem.addEventListener('dblclick', () => {
            alert(`Opening ${file.name}`);
            // In real implementation, open file preview or navigate to folder
          });
          
          fileGrid.appendChild(fileItem);
        });
      }
      
      // Render initial files
      renderFiles(files);
    });
  </script>
</body>
</html>
```

## 5. Work Group and Collaboration Enhancement

The existing `CollaborationRoom` provides real-time collaboration, but we need to:

1. **Create a User Interface**
   - Add a new `/collaborate.html` page for real-time collaboration
   - Implement collaborative document editing
   - Add video/audio conferencing option

2. **Enhance the Backend**
   - Complete collaboration permissions management
   - Add versioning and change history
   - Implement presence awareness (who's viewing/editing)

## 6. Demo Content Enhancement

The current demo content could be more representative of the system's capabilities:

1. **Create Compelling Demo Content**
   - Design realistic user profiles with research-focused content
   - Create sample drawers that showcase organization capabilities
   - Develop demo visualizations that highlight the association web

2. **Demo/Real Content Switching**
   - Ensure all pages properly check authentication
   - Provide seamless transitions between demo and real content
   - Add clear indicators when viewing demo content

### Implementation Tasks:

Create a dedicated demo content manager:

```javascript
// public/js/demo-content-manager.js
export class DemoContentManager {
  /**
   * Get demo user data
   */
  static getDemoUsers() {
    return [
      {
        id: 'demo-user-1',
        username: 'ResearchPioneer',
        displayName: 'Dr. Alex Rivera',
        subtitle: 'Climate Science & Urban Planning',
        communique: `
          <p>Investigating climate adaptation strategies for urban environments with a focus on community resilience.</p>
          <p>Current research topics:</p>
          <ul>
            <li>Urban heat island mitigation through green infrastructure</li>
            <li>Community-driven adaptation planning</li>
            <li>Sustainable building materials for extreme weather</li>
          </ul>
          <p>Looking to connect with researchers in related fields!</p>
        `,
        connectionCount: 42,
        files: [
          { id: 'demo-file-1', title: 'Urban Heat Patterns Analysis', type: 'application/pdf', expiresIn: 5 },
          { id: 'demo-file-2', title: 'Community Survey Results', type: 'text/csv', expiresIn: 3 },
          { id: 'demo-file-3', title: 'Green Roof Implementation Guide', type: 'application/pdf', expiresIn: 6 }
        ]
      },
      {
        id: 'demo-user-2',
        username: 'DataVisArtist',
        displayName: 'Morgan Chen',
        subtitle: 'Data Visualization & Digital Humanities',
        communique: `
          <p>Creating interactive visualizations that bridge data science and humanities research.</p>
          <p>Interested in:</p>
          <ul>
            <li>Historical text analysis and visualization</li>
            <li>Interactive network mapping</li>
            <li>Accessible data storytelling</li>
          </ul>
          <p>Open to collaboration on digital humanities projects!</p>
        `,
        connectionCount: 37,
        files: [
          { id: 'demo-file-4', title: 'Literary Network Visualization', type: 'application/json', expiresIn: 4 },
          { id: 'demo-file-5', title: 'Historical Migration Patterns', type: 'image/png', expiresIn: 2 },
          { id: 'demo-file-6', title: 'Interactive Timeline Project', type: 'text/html', expiresIn: 7 }
        ]
      }
    ];
  }
  
  /**
   * Get demo content for association web
   */
  static getAssociationWebDemo() {
    return {
      nodes: [
        // Users
        { id: 'user1', label: 'ResearchPioneer', type: 'user' },
        { id: 'user2', label: 'DataVisArtist', type: 'user' },
        { id: 'user3', label: 'EcoTechLab', type: 'user' },
        { id: 'user4', label: 'UrbanPlanner', type: 'user' },
        
        // Content
        { id: 'content1', label: 'Urban Heat Analysis', type: 'content' },
        { id: 'content2', label: 'Climate Visualization', type: 'content' },
        { id: 'content3', label: 'Green Infrastructure Guide', type: 'content' },
        { id: 'content4', label: 'Community Survey Results', type: 'content' },
        { id: 'content5', label: 'Sustainable Building Methods', type: 'content' },
        
        // Tags
        { id: 'tag1', label: 'climate', type: 'tag' },
        { id: 'tag2', label: 'urban', type: 'tag' },
        { id: 'tag3', label: 'visualization', type: 'tag' },
        { id: 'tag4', label: 'sustainability', type: 'tag' }
      ],
      links: [
        // User connections
        { source: 'user1', target: 'user2', type: 'connection' },
        { source: 'user1', target: 'user3', type: 'connection' },
        { source: 'user2', target: 'user4', type: 'connection' },
        { source: 'user3', target: 'user4', type: 'connection' },
        
        // Content creation
        { source: 'user1', target: 'content1', type: 'created' },
        { source: 'user2', target: 'content2', type: 'created' },
        { source: 'user3', target: 'content3', type: 'created' },
        { source: 'user1', target: 'content4', type: 'created' },
        { source: 'user4', target: 'content5', type: 'created' },
        
        // Content tagging
        { source: 'content1', target: 'tag1', type: 'tagged' },
        { source: 'content1', target: 'tag2', type: 'tagged' },
        { source: 'content2', target: 'tag1', type: 'tagged' },
        { source: 'content2', target: 'tag3', type: 'tagged' },
        { source: 'content3', target: 'tag2', type: 'tagged' },
        { source: 'content3', target: 'tag4', type: 'tagged' },
        { source: 'content4', target: 'tag2', type: 'tagged' },
        { source: 'content5', target: 'tag4', type: 'tagged' }
      ]
    };
  }
  
  /**
   * Get demo map data
   */
  static getMapDemo() {
    return {
      points: [
        {
          coordinates: [-74.0060, 40.7128],
          properties: {
            name: 'New York Climate Study',
            description: 'Urban heat island research in NYC',
            icon: 'document',
            color: 'var(--accent-lavender)'
          }
        },
        {
          coordinates: [-122.4194, 37.7749],
          properties: {
            name: 'San Francisco Green Roofs',
            description: 'Implementation of green roofs in urban settings',
            icon: 'document',
            color: 'var(--accent-lavender)'
          }
        },
        {
          coordinates: [-0.1278, 51.5074],
          properties: {
            name: 'London Resilience Project',
            description: 'Community climate adaptation strategies',
            icon: 'document',
            color: 'var(--accent-lavender)'
          }
        },
        {
          coordinates: [139.6503, 35.6762],
          properties: {
            name: 'Tokyo Urban Planning',
            description: 'Sustainable urban development models',
            icon: 'document',
            color: 'var(--accent-lavender)'
          }
        },
        {
          coordinates: [-79.3832, 43.6532],
          properties: {
            name: 'Toronto Green Infrastructure',
            description: 'Implementation of city-wide green infrastructure',
            icon: 'document',
            color: 'var(--accent-lavender)'
          }
        }
      ],
      connections: [
        {
          source: [-74.0060, 40.7128],
          target: [-122.4194, 37.7749],
          properties: {
            name: 'Comparative Analysis',
            description: 'Comparing East vs West Coast approaches',
            color: 'var(--accent-lavender)'
          }
        },
        {
          source: [-0.1278, 51.5074],
          target: [139.6503, 35.6762],
          properties: {
            name: 'International Collaboration',
            description: 'Sharing best practices across continents',
            color: 'var(--accent-lavender)'
          }
        },
        {
          source: [-79.3832, 43.6532],
          target: [-74.0060, 40.7128],
          properties: {
            name: 'Regional Partnership',
            description: 'Great Lakes - Northeast urban planning initiative',
            color: 'var(--accent-lavender)'
          }
        }
      ]
    };
  }
}
```

## 7. Implementation Plan and Prioritization

### Phase 1: Accessibility and UI Improvements
- Implement accessibility enhancements in global CSS
- Update navigation component for keyboard accessibility
- Add ARIA attributes to all interactive elements
- Review and improve color contrast

### Phase 2: Notification System
- Create notification database migration
- Implement NotificationHandler backend
- Add notification UI to navigation
- Connect to real-time updates via Durable Objects

### Phase 3: Demo Content Enhancement
- Create DemoContentManager
- Update all pages to use consistent demo content
- Ensure proper switching between demo and real content
- Add clear indicators for demo mode

### Phase 4: File Explorer
- Create file-explorer.html page
- Implement enhanced file grid with thumbnails
- Add drag-and-drop uploads
- Connect to existing file APIs

### Phase 5: Secure Messaging
- Create messages.html interface
- Implement MessageHandler backend
- Connect to CollaborationRoom for real-time updates
- Add encryption for secure communications

### Phase 6: Work Group/Collaboration Enhancement
- Create collaborate.html page for real-time document editing
- Enhance CollaborationRoom with additional features
- Implement presence awareness and permissions
