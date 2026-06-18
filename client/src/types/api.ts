export interface ApiError {
  error: string;
}

export interface NotificationsResponse {
  notifications: {
    id: number;
    user_id: number;
    actor_id: number | null;
    type: string;
    payload: any;
    read: number;
    created_at: string;
    actor_username?: string;
    actor_avatar_url?: string;
  }[];
}

export interface ConversationsResponse {
  conversations: {
    partner_id: number;
    partner_username: string;
    partner_avatar_url?: string;
    last_message: string;
    last_message_at: string;
    unread_count: number;
  }[];
}

export interface RelationshipsResponse {
  mutual: { user_id: number; username: string; avatar_url?: string; strength?: number }[];
  outgoing: { user_id: number; username: string; type: string; status: string }[];
  incoming: { user_id: number; username: string; type: string; status: string }[];
  threespace: { user_id: number; username: string; avatar_url?: string }[];
}

export interface FilesResponse {
  files: {
    id: number;
    filename: string;
    mime_type: string;
    size: number;
    user_id: number;
    visibility: string;
    vitality: number;
    is_boosted: number;
    is_archived: number;
    created_at: string;
    expires_at: string;
  }[];
  total: number;
}

export interface AuthResponse {
  user: {
    id: number;
    username: string;
    avatar_url?: string;
    email?: string;
  };
  token?: string;
  error?: string;
  needs_verification?: boolean;
  message?: string;
}
