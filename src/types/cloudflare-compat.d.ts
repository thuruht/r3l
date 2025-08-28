// Local compatibility shim for Cloudflare KV types to satisfy third-party library expectations.
// This file augments the KVNamespace interface to include a 'stream' overload used by some libs.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace CloudflareWorkersTypesCompat {
    interface KVNamespaceGetOptions<T> {
      cacheTtl?: number;
    }
  }

  // Augment the existing KVNamespace type from '@cloudflare/workers-types'
  // by declaring a compatible interface if it's missing. This avoids type mismatch
  // errors between different type packages that define slightly different overloads.
  interface KVNamespace {
    get(key: string, options?: Partial<any>): Promise<string | null>;
    get<T = unknown>(key: string, type: 'json'): Promise<T | null>;
    get(key: string, type: 'arrayBuffer'): Promise<ArrayBuffer | null>;
    get(key: string, type: 'text'): Promise<string | null>;
    get(key: string, type: 'stream'): Promise<ReadableStream<Uint8Array> | null>;
  }
}

export {};
