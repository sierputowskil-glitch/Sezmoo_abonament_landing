/**
 * cloudflare-smtp@0.1.2 emits bare LF in the message body after sanitizeBody.
 * Mail/Outlook then show the contact email as one line. Force CRLF (RFC 5322).
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const target = join(process.cwd(), 'node_modules/cloudflare-smtp/dist/index.js');
if (!existsSync(target)) {
  console.warn('patch-cloudflare-smtp: package not installed, skip');
  process.exit(0);
}

const src = readFileSync(target, 'utf8');
const broken =
  'function sanitizeBody(value) {\n    return value.replace(/\\r\\n/g, \'\\n\').replace(/\\r/g, \'\\n\').replace(/\\n\\./g, \'\\n..\');\n}';
const fixed =
  'function sanitizeBody(value) {\n    // Normalize then emit CRLF — bare LF breaks line breaks in Mail/Outlook (RFC 5322).\n    return value.replace(/\\r\\n/g, \'\\n\').replace(/\\r/g, \'\\n\').replace(/\\n\\./g, \'\\n..\').replace(/\\n/g, \'\\r\\n\');\n}';

if (src.includes(".replace(/\\n/g, '\\r\\n')")) {
  console.log('patch-cloudflare-smtp: already applied');
  process.exit(0);
}
if (!src.includes(broken)) {
  console.warn('patch-cloudflare-smtp: unexpected sanitizeBody — skip');
  process.exit(0);
}
writeFileSync(target, src.replace(broken, fixed));
console.log('patch-cloudflare-smtp: applied CRLF body fix');
