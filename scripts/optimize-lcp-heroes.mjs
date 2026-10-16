#!/usr/bin/env node
/**
 * Refresh landscape WebP master for the hero poster (Astro Image handles widths).
 *
 * Prefers showreel-poster-landscape.webp; falls back to center-cropping portrait.
 * Output: src/assets/abonament/showreel-poster-landscape.webp (+ synced showreel-poster.webp)
 *
 * Usage: npm run optimize:lcp
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const abonamentDir = path.join(root, 'src', 'assets', 'abonament');
const landscapeMaster = path.join(abonamentDir, 'showreel-poster-landscape.webp');
const portraitFallback = path.join(abonamentDir, 'showreel-poster.webp');
const quality = 90;

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

  if (w / h >= 1.5) {
    return sharp(inputPath);
  }

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
    const jpg = path.join(abonamentDir, 'showreel-poster-landscape.jpg');
    if (await exists(jpg)) {
      source = jpg;
    } else if (await exists(portraitFallback)) {
      console.warn(
        'No landscape master — center-cropping portrait showreel-poster.webp to 16:9',
      );
      source = portraitFallback;
    } else {
      throw new Error('Missing showreel poster source in src/assets/abonament/');
    }
  }

  const pipeline = await toLandscapePipeline(source);
  const baseBuf = await pipeline.webp({ quality }).toBuffer();
  const baseMeta = await sharp(baseBuf).metadata();
  console.log(
    `Landscape master: ${baseMeta.width}×${baseMeta.height} from ${path.basename(source)}`,
  );

  await fs.writeFile(landscapeMaster, baseBuf);
  await fs.writeFile(portraitFallback, baseBuf);
  console.log(`Done → ${landscapeMaster}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
