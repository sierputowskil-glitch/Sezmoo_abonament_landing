#!/usr/bin/env node
/**
 * Generate landscape WebP LCP variants for the abonament hero poster.
 *
 * Prefers a 16:9 source (YouTube maxres / showreel-poster-landscape.webp).
 * Falls back to center-cropping the portrait showreel-poster.webp to 16:9.
 *
 * Output: assets/optimized/lcp/showreel-poster-{800,1280,1920}.webp
 * Also refreshes assets/abonament/showreel-poster.webp as landscape master.
 *
 * Usage: npm run optimize:lcp
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const abonamentDir = path.join(root, 'assets', 'abonament');
const outDir = path.join(root, 'assets', 'optimized', 'lcp');
const landscapeMaster = path.join(abonamentDir, 'showreel-poster-landscape.webp');
const portraitFallback = path.join(abonamentDir, 'showreel-poster.webp');
const publicPoster = path.join(abonamentDir, 'showreel-poster.webp');
const widths = [800, 1280, 1920];
const quality = 82;

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function toLandscapePipeline(inputPath) {
  const img = sharp(inputPath);
  const meta = await img.metadata();
  const w = meta.width || 0;
  const h = meta.height || 0;
  if (!w || !h) throw new Error(`Bad image: ${inputPath}`);

  // Already ~16:9 (or wider) — just use as-is
  if (w / h >= 1.5) {
    return sharp(inputPath);
  }

  // Portrait / square → center crop to 16:9
  const targetH = Math.round(w * (9 / 16));
  if (targetH <= h) {
    const top = Math.max(0, Math.round((h - targetH) / 2));
    return sharp(inputPath).extract({ left: 0, top, width: w, height: targetH });
  }

  const targetW = Math.round(h * (16 / 9));
  const left = Math.max(0, Math.round((w - targetW) / 2));
  return sharp(inputPath).extract({
    left,
    top: 0,
    width: Math.min(targetW, w),
    height: h,
  });
}

async function main() {
  let source = landscapeMaster;
  if (!(await exists(source))) {
    // Optional: JPEG dropped next to script input by operator
    const jpg = path.join(abonamentDir, 'showreel-poster-landscape.jpg');
    if (await exists(jpg)) {
      source = jpg;
    } else if (await exists(portraitFallback)) {
      console.warn(
        'No landscape master — center-cropping portrait showreel-poster.webp to 16:9',
      );
      source = portraitFallback;
    } else {
      throw new Error('Missing showreel poster source');
    }
  }

  await fs.mkdir(outDir, { recursive: true });
  const pipeline = await toLandscapePipeline(source);
  const baseBuf = await pipeline.webp({ quality: 90 }).toBuffer();
  const baseMeta = await sharp(baseBuf).metadata();
  console.log(`Landscape master: ${baseMeta.width}×${baseMeta.height} from ${path.basename(source)}`);

  // Keep public poster as landscape (hero + data-yt-poster)
  await fs.writeFile(publicPoster, baseBuf);
  await fs.writeFile(landscapeMaster, baseBuf);

  for (const w of widths) {
    const name = `showreel-poster-${w}.webp`;
    const dest = path.join(outDir, name);
    await sharp(baseBuf)
      .resize({ width: w, withoutEnlargement: false })
      .webp({ quality })
      .toFile(dest);
    const outMeta = await sharp(dest).metadata();
    const size = (await fs.stat(dest)).size;
    console.log(`  ${name}: ${outMeta.width}×${outMeta.height}, ${(size / 1024).toFixed(1)} KB`);
  }

  console.log(`Done → ${outDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
