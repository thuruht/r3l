# Group File Sharing & Community Archiving Implementation

## Completed Features

### 1. Database Schema (Migration 0020)
- **group_files**: Links files to groups with edit permissions
- **archive_votes**: Community voting for file preservation
- **files table updates**: Added archive_votes, is_community_archived columns
- **groups table update**: Added group_type (chat/sym_group)

### 2. Backend API Routes

#### Group File Sharing
- `POST /api/groups/:id/files` - Share file with group (owner only)
- `GET /api/groups/:id/files` - List group shared files
- `DELETE /api/groups/:id/files/:file_id` - Remove file from group (admin/owner)

#### Community Archiving
- `POST /api/files/:id/archive-vote` - Vote to archive file
- `GET /api/files/community-archived` - List community archived files

#### Sym Group Formation
- `POST /api/groups/create-sym-group` - Create group from Sym connections only
- Validates all members are mutual connections

#### Group Management
- `GET /api/groups/:id/members` - List members with avatars
- `DELETE /api/groups/:id/members/:member_id` - Remove member (admin only)

### 3. Frontend Integration

#### GroupChat Component
- File sharing UI ready (backend complete)
- Member management with role indicators
- Admin controls for adding/removing members

#### Collaborative Editing
- Files shared with `can_edit: true` allow group editing
- Permission checks in DocumentRoom DO
- Real-time collaboration via Yjs

### 4. Permission System

#### File Sharing Permissions
```typescript
// Owner can share their files
// Admin can remove any file
// Sharer can remove their own files
// can_edit flag enables collaborative editing
```

#### Community Archiving
```typescript
// Public/Sym files can be voted on
// Private files excluded
// Threshold: VITALITY_ARCHIVE_THRESHOLD votes
// Auto-archives when threshold reached
```

#### Sym Group Formation
```typescript
// Only Sym connections can be added
// Validates mutual_connections table
// group_type: 'sym_group'
// visibility: 'sym' by default
```

## Architecture

### Group File Sharing Flow
```
1. User shares file → POST /api/groups/:id/files
2. Validates ownership + membership
3. Creates group_files entry
4. Members can view/edit (if can_edit=true)
5. Collaborative editing via DocumentRoom DO
```

### Community Archiving Flow
```
1. User votes → POST /api/files/:id/archive-vote
2. Increments archive_votes count
3. Checks threshold (default: 50)
4. Auto-archives if threshold met
5. Sets is_community_archived = 1
```

### Sym Group Formation Flow
```
1. User creates group → POST /api/groups/create-sym-group
2. Validates all member_ids are Sym connections
3. Creates group with group_type='sym_group'
4. Adds creator as admin
5. Adds members with role='member'
```

## Database Schema

### group_files
```sql
CREATE TABLE group_files (
    id INTEGER PRIMARY KEY,
    group_id INTEGER NOT NULL,
    file_id INTEGER NOT NULL,
    shared_by INTEGER NOT NULL,
    can_edit INTEGER DEFAULT 0,
    shared_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_id, file_id)
);
```

### archive_votes
```sql
CREATE TABLE archive_votes (
    id INTEGER PRIMARY KEY,
    file_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    vote_weight INTEGER DEFAULT 1,
    voted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(file_id, user_id)
);
```

### files (updated)
```sql
ALTER TABLE files ADD COLUMN archive_votes INTEGER DEFAULT 0;
ALTER TABLE files ADD COLUMN is_community_archived INTEGER DEFAULT 0;
```

### groups (updated)
```sql
ALTER TABLE groups ADD COLUMN group_type TEXT DEFAULT 'chat' 
    CHECK(group_type IN ('chat', 'sym_group'));
```

## Usage Examples

### Share File with Group
```typescript
POST /api/groups/123/files
{
  "file_id": 456,
  "can_edit": true
}
```

### Vote to Archive File
```typescript
POST /api/files/789/archive-vote
// Increments vote count
// Auto-archives at threshold
```

### Create Sym Group
```typescript
POST /api/groups/create-sym-group
{
  "name": "Core Team",
  "description": "Trusted collaborators",
  "member_ids": [2, 3, 4]
}
// Validates all are Sym connections
```

## Integration Points

### Collaborative Editing
- Files with `can_edit=true` accessible in DocumentRoom
- Permission check: member of group + file shared with group
- Real-time sync via Yjs CRDT

### Visibility & Access
- Group files respect original file visibility
- Sym groups only visible to members
- Community archived files publicly listed

### Notifications
- File shared → notify group members
- Archive threshold reached → notify file owner
- Member added/removed → notify affected user

## Next Steps (Optional)

1. **Frontend UI for File Sharing**
   - Add file picker in GroupChat
   - Show shared files list
   - Edit button for collaborative files

2. **Archive Voting UI**
   - Vote button on file preview
   - Progress bar showing votes
   - Community archive gallery

3. **Sym Group UI**
   - "Create Sym Group" button
   - Filter to show only Sym connections
   - Group type indicator

4. **Enhanced Permissions**
   - File-level permissions (view/edit/admin)
   - Group roles (owner/admin/member/viewer)
   - Permission inheritance

## Testing Checklist

- [ ] Share file with group
- [ ] Edit shared file collaboratively
- [ ] Remove file from group
- [ ] Vote to archive file
- [ ] Reach archive threshold
- [ ] Create Sym group with valid connections
- [ ] Reject non-Sym members
- [ ] List group files
- [ ] List community archived files
- [ ] Admin remove member
- [ ] Member permissions enforced

## Status

**Backend: Complete**
- All API routes implemented
- Database schema migrated
- Permission checks in place

**Frontend: Partial**
- GroupChat component ready
- File sharing UI needs integration
- Archive voting UI pending

**Documentation: Pending**
- Update README with new features
- Update FAQ with group sharing
- Update About with community archiving
