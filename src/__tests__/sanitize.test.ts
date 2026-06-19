import { describe, it, expect } from 'vitest';
import { sanitizeHTML } from '../utils/security';

describe('sanitizeHTML', () => {
  it('allows safe tags', async () => {
    const result = await sanitizeHTML('<p>Hello</p>');
    expect(result).toContain('<p>');
    expect(result).toContain('Hello');
  });

  it('removes script tags but keeps content', async () => {
    const result = await sanitizeHTML('<script>alert("xss")</script>');
    expect(result).not.toContain('<script>');
    expect(result).toContain('alert');
  });

  it('removes dangerous attributes', async () => {
    const result = await sanitizeHTML('<a href="javascript:alert(1)">click</a>');
    expect(result).not.toContain('javascript');
    expect(result).toContain('>click<');
  });

  it('removes event handlers', async () => {
    const result = await sanitizeHTML('<img src=x onerror=alert(1)>');
    expect(result).not.toContain('onerror');
  });

  it('adds rel and target to external links', async () => {
    const result = await sanitizeHTML('<a href="https://evil.com">bad</a>');
    expect(result).toContain('rel="noopener noreferrer"');
    expect(result).toContain('target="_blank"');
  });

  it('removes style tags', async () => {
    const result = await sanitizeHTML('<style>body{color:red}</style>');
    expect(result).not.toContain('<style>');
  });

  it('handles empty input', async () => {
    expect(await sanitizeHTML('')).toBe('');
  });

  it('allows allowed attributes', async () => {
    const result = await sanitizeHTML('<a href="/relative">link</a>');
    expect(result).toContain('href="/relative"');
  });
});
