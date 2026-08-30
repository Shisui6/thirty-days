#!/usr/bin/env node
/**
 * Daily sync: Todoist completions -> public/data/state.json
 *
 * This is the only writer of `ticks` and `syncedThrough`. It is append-only in
 * spirit: it adds ticks it finds and never removes one, because a missing
 * completion is far more likely to be an API hiccup than a genuine un-tick.
 *
 * Run:  TODOIST_TOKEN_A=... TODOIST_TOKEN_B=... node scripts/sync.mjs
 * Flags: --dry   print what would change, write nothing
 *        --since=YYYY-MM-DD  override the start of the window
 *
 * Exits non-zero on failure so a scheduler surfaces the problem instead of
 * silently leaving the page stale.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA = join(HERE, '..', 'public', 'data', 'state.json');

// Completed items live on the Sync API rather than the REST API. If Todoist
// moves the version, this constant is the only thing that needs changing.
const COMPLETED_URL = 'https://api.todoist.com/sync/v9/completed/get_all';

const args = process.argv.slice(2);
const DRY = args.includes('--dry');
const sinceArg = args.find((a) => a.startsWith('--since='))?.split('=')[1];

function pad(n) {
  return n < 10 ? `0${n}` : `${n}`;
}
function iso(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function dayNumber(startIso, dateIso) {
  const [ys, ms, ds] = startIso.split('-').map(Number);
  const [y, m, d] = dateIso.split('-').map(Number);
  const start = new Date(ys, ms - 1, ds);
  const then = new Date(y, m - 1, d);
  return Math.floor((then - start) / 86400000) + 1;
}

/** Normalise for matching: Todoist strips nothing, but people retype things. */
function key(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\p{L}\p{N} ]/gu, '')
    .trim();
}

async function fetchCompleted(token, sinceIso, untilIso) {
  const all = [];
  const limit = 200;
  let offset = 0;

  // The endpoint pages. A 30-day window for two people is small, but loop anyway.
  for (;;) {
    const body = new URLSearchParams({
      since: `${sinceIso}T00:00:00`,
      until: `${untilIso}T23:59:59`,
      limit: String(limit),
      offset: String(offset),
    });
    const res = await fetch(COMPLETED_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });
    if (!res.ok) {
      throw new Error(`Todoist ${res.status} ${res.statusText} — ${await res.text()}`);
    }
    const json = await res.json();
    const items = json.items || [];
    all.push(...items);
    if (items.length < limit) break;
    offset += limit;
  }
  return all;
}

function buildIndex(items, owner) {
  // Prefer an explicit Todoist id; fall back to normalised text.
  const byId = new Map();
  const byText = new Map();
  for (const it of items) {
    if (it.cadence === 'later') continue;
    if (it.owner !== owner && it.owner !== 'both') continue;
    if (it.todoistId) byId.set(String(it.todoistId), it);
    const k = key(it.text);
    if (k) {
      if (!byText.has(k)) byText.set(k, []);
      byText.get(k).push(it);
    }
  }
  return { byId, byText };
}

function resolve(index, completed) {
  const byId = index.byId.get(String(completed.task_id));
  if (byId) return { item: byId, how: 'id' };

  const matches = index.byText.get(key(completed.content)) || [];
  if (matches.length === 1) return { item: matches[0], how: 'text' };
  if (matches.length > 1) return { item: null, how: 'ambiguous' };
  return { item: null, how: 'unmatched' };
}

async function main() {
  const state = JSON.parse(await readFile(DATA, 'utf8'));
  if (!state.start) throw new Error('state.json has no start date');

  const tokens = { a: process.env.TODOIST_TOKEN_A, b: process.env.TODOIST_TOKEN_B };
  if (!tokens.a && !tokens.b) {
    throw new Error('Set TODOIST_TOKEN_A and/or TODOIST_TOKEN_B');
  }

  const today = new Date();
  const since = sinceArg || state.start;
  const until = iso(today);

  const ticks = { ...(state.ticks || {}) };
  let added = 0;
  const report = { unmatched: new Set(), ambiguous: new Set(), outside: 0 };

  for (const owner of ['a', 'b']) {
    const token = tokens[owner];
    if (!token) {
      console.warn(`No token for "${owner}" — skipping.`);
      continue;
    }
    const completed = await fetchCompleted(token, since, until);
    const index = buildIndex(state.items || [], owner);

    for (const c of completed) {
      const dateIso = String(c.completed_at || '').slice(0, 10);
      if (!dateIso) continue;
      const n = dayNumber(state.start, dateIso);
      if (n < 1 || n > 30) {
        report.outside += 1;
        continue;
      }
      const { item, how } = resolve(index, c);
      if (!item) {
        report[how === 'ambiguous' ? 'ambiguous' : 'unmatched'].add(c.content);
        continue;
      }
      // Only daily items live in the grid; weekly and monthly ones are
      // read off the plan rather than the matrix.
      if (item.cadence !== 'daily') continue;

      const k = `d${n}|${item.id}|${owner}`;
      if (!ticks[k]) {
        ticks[k] = 1;
        added += 1;
      }
    }
    console.log(`${owner}: ${completed.length} completions in window`);
  }

  // Yesterday is the honest high-water mark: today is still in progress.
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const next = { ...state, ticks, syncedThrough: iso(yesterday) };

  console.log(`+${added} new ticks, syncedThrough=${next.syncedThrough}`);
  if (report.unmatched.size) {
    console.warn(`Unmatched completions (not in the plan): ${[...report.unmatched].join(' | ')}`);
  }
  if (report.ambiguous.size) {
    console.warn(
      `Ambiguous titles — two items share a name, add todoistId to disambiguate: ${[
        ...report.ambiguous,
      ].join(' | ')}`,
    );
  }
  if (report.outside) console.log(`${report.outside} completions outside the 30-day window`);

  if (DRY) {
    console.log('Dry run — nothing written.');
    return;
  }
  await writeFile(DATA, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${DATA}`);
}

main().catch((err) => {
  console.error(`Sync failed: ${err.message}`);
  process.exit(1);
});
