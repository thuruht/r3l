#!/usr/bin/env node
/**
 * Seed sample files into R3L:F for testing preview/edit/collab features.
 *
 * Usage:
 *   node scripts/seed-samples.mjs <cookie> [base-url]
 *
 * The cookie is your auth_token from the browser devtools (Application → Cookies → auth_token).
 * Base URL defaults to http://localhost:8787.
 *
 * Each file is uploaded via POST /api/files as multipart/form-data.
 * Visibility is set to 'public' so they appear in DRIFT.
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SAMPLES_DIR = resolve(__dirname, '../client/public/samples');

const SAMPLES = [
  { filename: 'welcome.md',       mime: 'text/markdown' },
  { filename: 'sketch.js',        mime: 'text/javascript' },
  { filename: 'analyzer.py',      mime: 'text/x-python' },
  { filename: 'field_notes.txt',  mime: 'text/plain' },
  { filename: 'drift_data.csv',   mime: 'text/csv' },
  { filename: 'network_data.json', mime: 'application/json' },
  { filename: 'collab_demo.notes', mime: 'application/vnd.tiptap+json' },
  { filename: 'landing.html',     mime: 'text/html' },
  { filename: 'demo_app.qml',     mime: 'text/x-qml' },
  { filename: 'analysis.qmd',     mime: 'text/x-quarto' },
  { filename: 'sample_cube.stl',  mime: 'model/stl' },
  { filename: 'sample_cube.obj',  mime: 'model/obj' },
  { filename: 'notebook_demo.ipynb', mime: 'application/x-ipynb+json' },
  { filename: 'network_diagram.mmd', mime: 'text/x-mermaid' },
  { filename: 'wireframe.excalidraw', mime: 'application/vnd.excalidraw+json' },
];

async function main() {
  const cookie = process.argv[2];
  if (!cookie) {
    console.error('Usage: node scripts/seed-samples.mjs <auth_token> [base-url]');
    process.exit(1);
  }

  const baseUrl = process.argv[3] || 'http://localhost:8787';

  for (const sample of SAMPLES) {
    const filePath = resolve(SAMPLES_DIR, sample.filename);
    let content;
    try {
      content = readFileSync(filePath);
    } catch {
      console.warn(`  ⚠  Skipping ${sample.filename} (not found)`);
      continue;
    }

    const boundary = '----FormBoundary' + Math.random().toString(36).slice(2);
    let body = '';
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="file"; filename="${sample.filename}"\r\n`;
    body += `Content-Type: ${sample.mime}\r\n\r\n`;
    body += content.toString('utf-8');
    body += `\r\n`;
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="visibility"\r\n\r\n`;
    body += `public\r\n`;
    body += `--${boundary}--\r\n`;

    try {
      const res = await fetch(`${baseUrl}/api/files`, {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Cookie': `auth_token=${cookie}`,
        },
        body,
      });

      const data = await res.json();
      if (res.ok) {
        console.log(`  ✓ ${sample.filename} → file #${data.id} (${data.filename})`);
      } else {
        console.error(`  ✗ ${sample.filename} → ${data.error || res.status}`);
      }
    } catch (err) {
      console.error(`  ✗ ${sample.filename} → ${err.message}`);
    }
  }
}

main();
