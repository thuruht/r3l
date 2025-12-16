-- Migration number: 0005 	 2025-12-15T00:00:00.000Z

-- Table for user notifications (Inbox)
CREATE TABLE notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL, -- Recipient
  actor_id INTEGER,         -- Triggering user (nullable for system messages)
  type TEXT NOT NULL CHECK(type IN ('sym_request', 'sym_accepted', 'file_shared', 'system_alert')),
  payload TEXT DEFAULT '{}', -- JSON data associated with the notification
  is_read BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read);
