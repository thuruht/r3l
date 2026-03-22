// src/types.ts

export interface Env {
  ASSETS: Fetcher;
  KV: KVNamespace;
  DB: D1Database;
  BUCKET: R2Bucket;
  DO_NAMESPACE: DurableObjectNamespace;
  DOCUMENT_ROOM: DurableObjectNamespace;
  CHAT_ROOM: DurableObjectNamespace;
  JWT_SECRET: string;
  RESEND_API_KEY: string;
  ENCRYPTION_SECRET: string;
  R2_ACCOUNT_ID: string;
  R2_BUCKET_NAME: string;
  R2_PUBLIC_DOMAIN?: string;
  ADMIN_USER_ID?: string;
}

export type Variables = {
  user_id: number;
};
