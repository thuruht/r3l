declare interface DurableObjectState {
  // Minimal shim for Cloudflare Durable Object API differences in types
  setAlarm?: (when: number) => Promise<void>;
}

declare function setTimeout(handler: (...args: unknown[]) => void, timeout?: number): number;

declare namespace NodeJS {
  interface Global {
    crypto: Crypto;
  }
}
