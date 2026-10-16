#!/usr/bin/env node
/**
 * Copy root `assets/` → `public/assets/` as real files.
 * Symlinks break on some Cloudflare / GitHub Pages deploys; this survives both.
 */
import { cpSync, existsSync, lstatSync, rmSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';

const src = resolve('assets');
const dest = resolve('public/assets');

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

cpSync(src, dest, { recursive: true, dereference: true });
console.log('sync-public-assets: copied assets/ → public/assets/');
