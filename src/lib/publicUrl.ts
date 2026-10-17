/** Join a site-root path with Astro `BASE_URL` (always has a trailing slash). */
export function publicUrl(path: string): string {
  const base = import.meta.env.BASE_URL || '/';
  const trimmed = path.replace(/^\//, '');
  return `${base}${trimmed}`;
}
