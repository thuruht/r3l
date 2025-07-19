// Import Cloudflare Workers types
import type { D1Database as CloudflareD1Database } from '@cloudflare/workers-types';
import { OAuthHelpers } from '@cloudflare/workers-oauth-provider';

export interface Env {
  R3L_DB: ExtendedD1Database;
  R3L_USER_EMBEDDINGS: KVNamespace;
  R3L_AI: AI;
  R3L_KV: KVNamespace;
  R3L_SESSIONS: KVNamespace;
  R3L_COLLABORATION: DurableObjectNamespace;
  R3L_CONNECTIONS: DurableObjectNamespace;
  R3L_VISUALIZATION: DurableObjectNamespace;
  R3L_CONTENT_BUCKET: R2Bucket;
  OAUTH_PROVIDER: OAuthHelpers;
  R3L_ADMIN_ORCID_ID: string;
  ORCID_CLIENT_ID: string;
  ORCID_CLIENT_SECRET: string;
  ORCID_REDIRECT_URI: string;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  GITHUB_REDIRECT_URI: string;
  REALTIME_API_TOKEN: string;
  CLOUDFLARE_ACCOUNT_ID: string;
  ASSETS: {
    fetch(request: Request): Promise<Response>;
  };
}

// R2 bucket interface
export interface R2Bucket {
  put(key: string, value: ReadableStream | ArrayBuffer | string, options?: R2PutOptions): Promise<R2Object>;
  get(key: string, options?: R2GetOptions): Promise<R2Object | null>;
  delete(key: string): Promise<void>;
}

interface R2PutOptions {
  httpMetadata?: {
    contentType?: string;
    cacheControl?: string;
    contentDisposition?: string;
    contentEncoding?: string;
    contentLanguage?: string;
  };
  customMetadata?: Record<string, string>;
}

interface R2GetOptions {
  range?: {
    offset: number;
    length?: number;
  };
  onlyIf?: {
    etagMatches?: string;
    etagDoesNotMatch?: string;
    uploadedBefore?: Date;
    uploadedAfter?: Date;
  };
}

interface R2Object {
  key: string;
  version: string;
  size: number;
  etag: string;
  httpEtag: string;
  uploaded: Date;
  httpMetadata?: {
    contentType: string;
    contentLanguage?: string;
    contentDisposition?: string;
    contentEncoding?: string;
    cacheControl?: string;
  };
  customMetadata?: Record<string, string>;
  range?: {
    offset: number;
    length: number;
  };
  body: ReadableStream;
  bodyUsed: boolean;
  arrayBuffer(): Promise<ArrayBuffer>;
  text(): Promise<string>;
  json<T>(): Promise<T>;
  blob(): Promise<Blob>;
}

// DurableObject namespace types
export interface DurableObjectNamespace {
  idFromName(name: string): DurableObjectId;
  idFromString(id: string): DurableObjectId;
  get(id: DurableObjectId): DurableObjectStub;
}

export interface DurableObjectId {
  toString(): string;
}

export interface DurableObjectStub {
  fetch(request: Request | string, init?: RequestInit): Promise<Response>;
}

export type D1SessionMode = 'first-primary' | 'first-unconstrained';

type D1Response<T = unknown> = {
  results?: T[];
  success: true;
  meta: {
    changes?: number;
    duration: number;
    last_row_id?: number;
    rows_read?: number;
    rows_written?: number;
  };
};

export interface ExtendedD1Database extends Omit<CloudflareD1Database, 'prepare' | 'batch' | 'withSession'> {
  prepare(query: string): ExtendedD1PreparedStatement;
  batch(statements: ExtendedD1PreparedStatement[]): Promise<D1Response[]>;
  withSession(mode: D1SessionMode): ExtendedD1DatabaseSession;
}

export interface ExtendedD1DatabaseSession {
  prepare(query: string): ExtendedD1PreparedStatement;
  batch(statements: ExtendedD1PreparedStatement[]): Promise<D1Response[]>;
  getBookmark(): string | null;
}

export interface ExtendedD1PreparedStatement {
  bind(...values: any[]): this;
  first<T = unknown>(): Promise<T | null>;
  run<T = unknown>(): Promise<D1Response<T>>;
  all<T = unknown>(): Promise<D1Response<T>>;
  raw<T = unknown>(): Promise<T[]>;
}

// AI types
export interface AI {
  run<T = any>(model: string, input: { text: string[] }): Promise<T>;
}

// KV types
export interface KVNamespace {
  get(key: string, options?: Partial<KVNamespaceGetOptions>): Promise<string | null>;
  put(key: string, value: string, options?: KVNamespacePutOptions): Promise<void>;
  delete(key: string): Promise<void>;
}

interface KVNamespaceGetOptions {
  type: string;
  cacheTtl?: number;
}

interface KVNamespacePutOptions {
  expiration?: number;
  expirationTtl?: number;
  metadata?: Record<string, unknown>;
}
