import { describe, it, expect, vi } from 'vitest';
import { getAdminId, getR2PublicUrl } from '../utils/helpers';
import type { Env } from '../types';

describe('getAdminId', () => {
  it('returns the ADMIN_USER_ID env var when set', () => {
    const result = getAdminId({ ADMIN_USER_ID: '42' } as unknown as Env);
    expect(result).toBe(42);
  });

  it('defaults to 1 when ADMIN_USER_ID is not set', () => {
    const result = getAdminId({} as unknown as Env);
    expect(result).toBe(1);
  });

  it('defaults to 1 when ADMIN_USER_ID is empty string', () => {
    const result = getAdminId({ ADMIN_USER_ID: '' } as unknown as Env);
    expect(result).toBe(1);
  });
});

describe('getR2PublicUrl', () => {
  it('returns a URL with R2_PUBLIC_DOMAIN when set', () => {
    const env = { R2_PUBLIC_DOMAIN: 'cdn.example.com' } as unknown as Env;
    expect(getR2PublicUrl(env, 'abc/def.txt')).toBe('https://cdn.example.com/abc/def.txt');
  });

  it('returns a URL with R2_PUBLIC_DOMAIN with subpath', () => {
    const env = { R2_PUBLIC_DOMAIN: 'r3l-r2.distorted.work' } as unknown as Env;
    expect(getR2PublicUrl(env, '1/file.txt')).toBe('https://r3l-r2.distorted.work/1/file.txt');
  });

  it('falls back when R2_PUBLIC_DOMAIN is not set', () => {
    const env = {} as unknown as Env;
    expect(getR2PublicUrl(env, 'key')).toBe('/key');
  });
});
