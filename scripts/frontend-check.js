#!/usr/bin/env node
/*
  Lightweight frontend checker: 
  - Lints public/js with ESLint (should be run separately via npm run lint:fe)
  - Scans HTML files for module scripts importing local modules that don't exist
*/
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';

const root = process.cwd();
const publicDir = join(root, 'public');

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) yield* walk(full);
    else yield full;
  }
}

function findModuleImports(html) {
  const imports = [];
  const regex = /<script\s+type="module"[^>]*>([\s\S]*?)<\/script>/g;
  let m;
  while ((m = regex.exec(html))) {
    const code = m[1];
    const im = [...code.matchAll(/import\s+[^'"\n]+from\s+['"]([^'"]+)['"]/g)];
    for (const i of im) imports.push(i[1]);
  }
  return imports;
}

let missing = 0;
for (const file of walk(publicDir)) {
  if (!file.endsWith('.html')) continue;
  const html = readFileSync(file, 'utf8');
  const imports = findModuleImports(html);
  const base = dirname(file);
  for (const spec of imports) {
    if (spec.startsWith('http') || spec.startsWith('https')) continue;
    if (spec.startsWith('vendor/') || spec.startsWith('/vendor/')) continue;
    const full = spec.startsWith('/') ? join(publicDir, spec) : join(base, spec);
    try {
      statSync(full);
    } catch {
      console.error(`[frontend-check] Missing import in ${file}: ${spec}`);
      missing++;
    }
  }
}

if (missing > 0) {
  console.error(`[frontend-check] FAILED: ${missing} missing module imports.`);
  process.exit(1);
} else {
  console.log('[frontend-check] PASS: All module imports exist.');
}
