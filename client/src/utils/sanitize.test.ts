import { test } from 'node:test';
import assert from 'node:assert';
import { sanitizeHTML } from './sanitize.ts';

test('sanitizeHTML handles empty or null input', () => {
  assert.strictEqual(sanitizeHTML(''), '');
  // @ts-ignore
  assert.strictEqual(sanitizeHTML(null), '');
  // @ts-ignore
  assert.strictEqual(sanitizeHTML(undefined), '');
});

test('sanitizeHTML removes script tags', () => {
  const input = '<div>Hello <script>alert("xss")</script>world</div>';
  const expected = '<div>Hello world</div>';
  assert.strictEqual(sanitizeHTML(input), expected);
});

test('sanitizeHTML is case insensitive for script tags', () => {
  const input = '<div>Hello <SCRIPT>alert("xss")</SCRIPT>world</div>';
  const expected = '<div>Hello world</div>';
  assert.strictEqual(sanitizeHTML(input), expected);
});

test('sanitizeHTML handles multiline script tags', () => {
  const input = `<div>
    <script>
      console.log("malicious");
    </script>
    Safe content
  </div>`;
  const expected = `<div>

    Safe content
  </div>`;
  assert.strictEqual(sanitizeHTML(input), expected);
});

test('sanitizeHTML removes event handlers', () => {
  const input = '<button onclick="alert(\'xss\')" onmouseover="evil()">Click me</button>';
  const expected = '<button>Click me</button>';
  assert.strictEqual(sanitizeHTML(input), expected);
});

test('sanitizeHTML replaces javascript: links with #', () => {
  const input = '<a href="javascript:alert(\'xss\')">Link</a>';
  const expected = '<a href="#">Link</a>';
  assert.strictEqual(sanitizeHTML(input), expected);
});

test('sanitizeHTML handles mixed malicious content', () => {
  const input = '<div onmouseover="hide()"><script>bad()</script><a href="javascript:void(0)">Click</a></div>';
  const expected = '<div><a href="#">Click</a></div>';
  assert.strictEqual(sanitizeHTML(input), expected);
});

test('sanitizeHTML preserves safe HTML', () => {
  const input = '<b>Bold</b> <i>Italic</i> <p>Paragraph</p>';
  assert.strictEqual(sanitizeHTML(input), input);
});
