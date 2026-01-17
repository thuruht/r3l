-- Feature Gap Fill: Privacy and Roles
ALTER TABLE users ADD COLUMN is_lurking INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user' CHECK(role IN ('user', 'moderator', 'admin'));

-- Set default admin (ID 1) to admin role
UPDATE users SET role = 'admin' WHERE id = 1;
