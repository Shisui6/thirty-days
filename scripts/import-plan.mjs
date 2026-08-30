#!/usr/bin/env node
/**
 * Convert a backup from the single-file setup app into the view's dataset.
 *
 *   node scripts/import-plan.mjs ~/Downloads/thirty-days-2026-09-01.json
 *
 * Plan data is overwritten from the backup. Ticks and syncedThrough are kept
 * from whatever is already in state.json, so re-importing an edited plan
 * mid-challenge doesn't wipe the history the sync has collected.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA = join(HERE, '..', 'public', 'data', 'state.json');

const src = process.argv[2];
if (!src) {
  console.error('Usage: node scripts/import-plan.mjs <backup.json>');
  process.exit(1);
}

const backup = JSON.parse(await readFile(src, 'utf8'));

let existing = {};
try {
  existing = JSON.parse(await readFile(DATA, 'utf8'));
} catch {
  // First import — nothing to preserve.
}

const next = {
  version: 1,
  start: backup.start || existing.start,
  // Preserved, not imported: the setup app knows nothing about Todoist.
  syncedThrough: existing.syncedThrough || null,
  ticks: existing.ticks || {},

  people: {
    a: { ...(existing.people?.a || {}), name: backup.names?.a || existing.people?.a?.name || '' },
    b: { ...(existing.people?.b || {}), name: backup.names?.b || existing.people?.b?.name || '' },
  },
  reality: backup.real || {},
  goals: { a: backup.goals?.a || {}, b: backup.goals?.b || {} },
  pact: backup.pact || {},
  items: (backup.items || []).map((it) => {
    // Keep any todoistId already mapped for this item.
    const prior = (existing.items || []).find((p) => p.id === it.id);
    return {
      id: it.id,
      text: it.text,
      area: it.area,
      owner: it.owner,
      cadence: it.cadence,
      flex: it.flex !== false,
      time: it.time || '',
      dur: it.dur || '',
      wday: it.wday ?? '',
      mday: it.mday ?? '',
      todoistId: prior?.todoistId || it.todoistId || null,
    };
  }),
  days: backup.days || existing.days || {},
  flex: backup.flex || {},
  resets: backup.reset || existing.resets || {},
};

await writeFile(DATA, `${JSON.stringify(next, null, 2)}\n`, 'utf8');

const daily = (o) => next.items.filter((i) => i.cadence === 'daily' && (i.owner === o || i.owner === 'both')).length;
const noSlot = next.items.filter((i) => i.cadence !== 'later' && !i.time).length;

console.log(`Wrote ${DATA}`);
console.log(`  start:  ${next.start}`);
console.log(`  items:  ${next.items.length} (${next.items.filter((i) => i.cadence !== 'later').length} live)`);
console.log(`  daily:  a=${daily('a')} b=${daily('b')}`);
console.log(`  ticks:  ${Object.keys(next.ticks).length} preserved`);
if (noSlot) console.warn(`  warning: ${noSlot} live item(s) have no time — Todoist won't remind you about those`);
if (daily('a') > 5 || daily('b') > 5) console.warn('  warning: over the daily ceiling of 5');
