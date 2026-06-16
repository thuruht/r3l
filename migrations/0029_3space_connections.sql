-- Migration 0029: Add 3SPACE connection types

-- Recreate relationships with 3space types in CHECK constraint
ALTER TABLE relationships RENAME TO relationships_old;

CREATE TABLE relationships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_user_id INTEGER NOT NULL,
  target_user_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK(type IN (
    'asym_follow',
    'sym_request',
    'sym_accepted',
    '3space_request',
    '3space_accepted'
  )),
  status TEXT NOT NULL DEFAULT 'accepted' CHECK(status IN ('pending', 'accepted', 'rejected', 'blocked')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (source_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(source_user_id, target_user_id)
);

INSERT INTO relationships (id, source_user_id, target_user_id, type, status, created_at, updated_at)
  SELECT id, source_user_id, target_user_id, type, status, created_at, updated_at
  FROM relationships_old;

DROP TABLE relationships_old;

CREATE INDEX IF NOT EXISTS idx_relationships_source ON relationships(source_user_id);
CREATE INDEX IF NOT EXISTS idx_relationships_target ON relationships(target_user_id);

-- Recreate notifications with 3space types in CHECK constraint
ALTER TABLE notifications RENAME TO notifications_old;

CREATE TABLE notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  actor_id INTEGER,
  type TEXT NOT NULL CHECK(type IN (
    'sym_request',
    'sym_accepted',
    'file_shared',
    'system_alert',
    '3space_request',
    '3space_accepted'
  )),
  payload TEXT DEFAULT '{}',
  is_read BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL
);

INSERT INTO notifications (id, user_id, actor_id, type, payload, is_read, created_at)
  SELECT id, user_id, actor_id, type, payload, is_read, created_at
  FROM notifications_old;

DROP TABLE notifications_old;

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read);
