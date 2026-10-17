/** Keep in sync with `functions/lib/form-options.ts` (Pages Functions cannot import `src/`). */

export const PACKAGE_OPTIONS = [
  { value: 'Nie wiem – doradźcie', label: 'Nie wiem – doradźcie' },
  { value: '30h', label: '30h' },
  { value: '60h', label: '60h', selected: true },
  { value: '120h', label: '120h' },
  { value: 'Custom', label: 'Custom' },
] as const;

export const NEED_OPTIONS = [
  { value: '', label: 'Wybierz obszar' },
  { value: 'Wideo / motion', label: 'Wideo / motion' },
  { value: 'Foto', label: 'Foto' },
  { value: 'Grafika', label: 'Grafika' },
  { value: 'Social media', label: 'Social media' },
  { value: 'Wszystko po trochu', label: 'Wszystko po trochu' },
] as const;
