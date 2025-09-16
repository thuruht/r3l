/**
 * Type definitions for Cloudflare Workers, D1, KV, and other Cloudflare features
 */

// Declare D1Database type
declare interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = any>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec<T = any>(query: string): Promise<D1Result<T>>;
}

declare interface D1PreparedStatement {
  bind(...values: any[]): D1PreparedStatement;
  first<T = any>(colName?: string): Promise<T | null>;
  run<T = any>(): Promise<D1Result<T>>;
  all<T = any>(): Promise<D1Result<T>>;
}

declare interface D1Result<T = any> {
  results?: T[];
  success: boolean;
  error?: string;
  meta?: any;
}

// Extend Request with Cloudflare-specific properties
interface CfProperties {
  colo: string;
  country: string;
  city?: string;
  continent?: string;
  latitude?: string;
  longitude?: string;
  timezone?: string;
  region?: string;
  regionCode?: string;
  asn?: number;
  asOrganization?: string;
  [key: string]: any;
}

declare global {
  interface Request {
    cf?: CfProperties;
  }
}

export {};
