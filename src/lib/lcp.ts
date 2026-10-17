import { getImage } from 'astro:assets';
import showreelPoster from '../assets/abonament/showreel-poster-landscape.webp';

export const HERO_LCP_SIZES = '(min-width: 981px) 55vw, 100vw';
export const HERO_LCP_WIDTHS = [800, 1280, 1920] as const;
export { showreelPoster };

export async function getHeroLcpImage() {
  return getImage({
    src: showreelPoster,
    widths: [...HERO_LCP_WIDTHS],
    formats: ['webp'],
  });
}

export async function getHeroVideoPoster() {
  return getImage({
    src: showreelPoster,
    width: 1280,
    format: 'webp',
  });
}
