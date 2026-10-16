#!/usr/bin/env node
/**
 * Copy root `assets/` → `public/assets/` as real files.
 * Symlinks break on some Cloudflare / GitHub Pages deploys; this survives both.
 * Skips macOS junk (.DS_Store, AppleDouble).
 */
import { cpSync, existsSync, lstatSync, rmSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';

const src = resolve('assets');
const dest = resolve('public/assets');

const SKIP_NAMES = new Set(['.DS_Store', '.AppleDouble', '.LSOverride']);

function filter(_, destPath) {
  const base = destPath.split('/').pop() ?? '';
  if (SKIP_NAMES.has(base) || base.startsWith('._')) return false;
  return true;
}

if (!existsSync(src)) {
  console.error('sync-public-assets: missing ./assets');
  process.exit(1);
}

if (existsSync(dest)) {
  const st = lstatSync(dest);
  if (st.isSymbolicLink()) {
    unlinkSync(dest);
  } else {
    rmSync(dest, { recursive: true, force: true });
  }
}

cpSync(src, dest, { recursive: true, dereference: true, filter });
console.log('sync-public-assets: copied assets/ → public/assets/');
