#!/usr/bin/env node
/**
 * Generate resized WebP variants for the abonament hero LCP poster.
 *
 * Output: assets/optimized/lcp/showreel-poster-{800,1280,1920}.webp
 *
 * Usage: npm run optimize:lcp
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'assets', 'abonament', 'showreel-poster.webp');
const outDir = path.join(root, 'assets', 'optimized', 'lcp');
const widths = [800, 1280, 1920];
const quality = 78;

async function main() {
  await fs.access(source);
  await fs.mkdir(outDir, { recursive: true });
  const meta = await sharp(source).metadata();
  console.log(`Source: ${source} (${meta.width}×${meta.height})`);

  for (const w of widths) {
    const name = `showreel-poster-${w}.webp`;
    const dest = path.join(outDir, name);
    await sharp(source)
      .resize({ width: w, withoutEnlargement: true })
      .webp({ quality })
      .toFile(dest);
    const outMeta = await sharp(dest).metadata();
    const size = (await fs.stat(dest)).size;
    console.log(`  ${name}: ${outMeta.width}×${outMeta.height}, ${size} bytes`);
  }

  console.log(`Done → ${outDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
