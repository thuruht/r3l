/**
 * Types for the Search feature
 */

/**
 * Search request parameters
 */
export interface SearchRequest {
  query?: string;
  contentType?: FileType | 'all';
  tags?: string[];
  sortBy?: SortOption;
  visibility?: VisibilityFilter;
  lurkerMode?: boolean;
  page?: number;
  limit?: number;
}

/**
 * Supported file types for search
 */
export type FileType = 'image' | 'audio' | 'video' | 'document' | 'text' | 'other';

/**
 * Supported sort options
 */
export type SortOption = 'newest' | 'oldest' | 'archive-votes' | 'expiring-soon';

/**
 * Visibility filters
 */
export type VisibilityFilter = 'all' | 'connections' | 'mine';

/**
 * Basic file record returned from search
 */
export interface FileRecord {
  id: string;
  title: string;
  description: string;
  type: string;
  created_at: string;
  expires_at: string;
  user_id: string;
  username: string;
  drawer_id: string;
  drawer_name: string;
  archive_votes: number;
  is_public: number;
  tags: string; // Comma-separated tag string from GROUP_CONCAT
}

/**
 * File record with metadata
 */
export interface FileRecordWithMeta extends Omit<FileRecord, 'tags'> {
  tags: string[]; // Converted to array from comma-separated string
}

/**
 * Search result
 */
export interface SearchResult {
  results: FileRecord[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/**
 * Search result with metadata
 */
export interface SearchResultWithMeta {
  results: FileRecordWithMeta[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/**
 * Tag with usage count
 */
export interface TagWithCount {
  id: string;
  name: string;
  usage_count: number;
}

/**
 * Response for popular tags API
 */
export interface PopularTagsResponse {
  tags: TagWithCount[];
}
