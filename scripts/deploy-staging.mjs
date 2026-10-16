#!/usr/bin/env node
/**
 * Build + deploy a Cloudflare Pages *preview* on project sezmoo-abonament
 * (sezmoo.com account). Does not touch production / abonament.sezmoo.com.
 *
 * Requires in .env: PROD_CLOUDFLARE_ACCOUNT_ID, PROD_CLOUDFLARE_API_TOKEN
 */
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const PROJECT = 'sezmoo-abonament';

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

const accountId = process.env.PROD_CLOUDFLARE_ACCOUNT_ID?.trim();
const apiToken = process.env.PROD_CLOUDFLARE_API_TOKEN?.trim();
if (!accountId || !apiToken) {
  console.error(
    'deploy-staging: set PROD_CLOUDFLARE_ACCOUNT_ID and PROD_CLOUDFLARE_API_TOKEN in .env',
  );
  process.exit(1);
}

process.env.CLOUDFLARE_ACCOUNT_ID = accountId;
process.env.CLOUDFLARE_API_TOKEN = apiToken;

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

const branch =
  process.env.CF_PAGES_BRANCH?.trim() ||
  spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
    encoding: 'utf8',
  }).stdout?.trim() ||
  'preview';

if (branch === 'main' || branch === 'HEAD') {
  console.error(
    'deploy-staging: refusing to deploy as preview from main/detached HEAD — use production workflow or set CF_PAGES_BRANCH',
  );
  process.exit(1);
}

run('npm', ['run', 'build:staging']);

run('npx', [
  'wrangler',
  'pages',
  'deploy',
  'dist',
  `--project-name=${PROJECT}`,
  `--branch=${branch}`,
  '--commit-dirty=true',
]);

console.log(`
Preview deploy done (branch=${branch}).
URL: https://<hash>.${PROJECT}.pages.dev
     (alias often https://${branch.replace(/\//g, '-')}.${PROJECT}.pages.dev)
Production stays on https://abonament.sezmoo.com
`);
