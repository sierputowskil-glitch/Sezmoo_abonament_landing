#!/usr/bin/env node
/**
 * Build + deploy Cloudflare Pages staging (abonament.websky.pro).
 * Requires in .env (gitignored): CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN
 */
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const PROJECT = 'sezmoo-abonament-staging';
// Custom domains serve the project's production deployment → use main.
const BRANCH = 'main';
const DOMAIN = 'abonament.websky.pro';

function loadDotEnv(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 1) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

loadDotEnv(resolve('.env'));

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
const apiToken = process.env.CLOUDFLARE_API_TOKEN?.trim();
if (!accountId || !apiToken) {
  console.error(
    'deploy-staging: set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN in .env',
  );
  process.exit(1);
}

function run(cmd, args, opts = {}) {
  console.log(`\n> ${cmd} ${args.join(' ')}`);
  const r = spawnSync(cmd, args, {
    stdio: 'inherit',
    env: process.env,
    shell: false,
    ...opts,
  });
  if (r.status !== 0) {
    process.exit(r.status ?? 1);
  }
}

run('npm', ['run', 'build:staging']);

// Create project only when missing (quiet check via list).
const listed = spawnSync('npx', ['wrangler', 'pages', 'project', 'list'], {
  encoding: 'utf8',
  env: process.env,
});
const alreadyExists =
  listed.status === 0 &&
  typeof listed.stdout === 'string' &&
  listed.stdout.includes(PROJECT);

if (alreadyExists) {
  console.log(`(project ${PROJECT} already exists — skip create)`);
} else {
  const created = spawnSync(
    'npx',
    ['wrangler', 'pages', 'project', 'create', PROJECT, '--production-branch=main'],
    { encoding: 'utf8', env: process.env },
  );
  if (created.status !== 0) {
    console.log(`(project create skipped — ${PROJECT} may already exist)`);
  } else {
    console.log(`Created Pages project ${PROJECT}`);
  }
}

run('npx', [
  'wrangler',
  'pages',
  'deploy',
  'dist',
  `--project-name=${PROJECT}`,
  `--branch=${BRANCH}`,
  '--commit-dirty=true',
]);

console.log(`
Staging deploy done.
Next (once):
  1. CF Pages → ${PROJECT} → Custom domains → add ${DOMAIN}
  2. Turnstile: allow hostname ${DOMAIN}
  3. Secrets: wrangler pages secret put TURNSTILE_SECRET_KEY --project-name=${PROJECT}
     (and SMTP_PASS if you want real mail on staging)
  4. KV: bind CONTACT_RATE_LIMIT (see wrangler.toml / README)
`);
