import { vi } from 'vitest';

vi.mock('cloudflare:workers', () => {
  return {
    DurableObject: class {}
  };
});
