declare module '@cloudflare/workers-types' {
  interface KVNamespace {
    get(key: string, options?: Partial<any>): Promise<string | null>;
    get<T = unknown>(key: string, type: 'json'): Promise<T | null>;
    get(key: string, type: 'arrayBuffer'): Promise<ArrayBuffer | null>;
    get(key: string, type: 'text'): Promise<string | null>;
    get(key: string, type: 'stream'): Promise<ReadableStream<Uint8Array> | null>;
  }
}

export {};
