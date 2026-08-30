/**
 * The dataset is the single source of truth for the view. Nothing here mutates it.
 *
 * Writes happen in exactly two places, on two very different schedules:
 *   - ticks / syncedThrough : written daily by scripts/sync.mjs from Todoist
 *   - everything else       : written by a human at setup or a weekly reset
 *
 * That asymmetry is why the browser never needs write access.
 */

export const AREAS = {
  body: 'Body',
  mind: 'Mind',
  work: 'Work & study',
  money: 'Money',
  home: 'Home',
  people: 'People',
  attention: 'Attention & rest',
  play: 'Creativity & play',
  admin: 'Admin & paperwork',
  us: 'Us',
  usadmin: 'Shared admin',
  ustime: 'Time together',
};

export const CADENCES = [
  ['daily', 'Every day'],
  ['weekly', 'Every week'],
  ['monthly', 'Once this month'],
  ['later', 'Parked'],
];

export const DAILY_CEILING = 5;
export const TOTAL_DAYS = 30;

/** Fill in anything a hand-edited dataset might be missing, without inventing content. */
export function normalise(raw) {
  const d = raw && typeof raw === 'object' ? raw : {};
  return {
    version: d.version ?? 1,
    start: d.start || isoToday(),
    syncedThrough: d.syncedThrough || null,
    people: {
      a: { name: '', ...(d.people?.a || {}) },
      b: { name: '', ...(d.people?.b || {}) },
    },
    reality: d.reality || {},
    goals: { a: d.goals?.a || {}, b: d.goals?.b || {} },
    pact: d.pact || {},
    items: (Array.isArray(d.items) ? d.items : []).map((it, i) => ({
      id: it.id ?? i + 1,
      text: it.text || '',
      area: it.area || '',
      owner: it.owner === 'a' || it.owner === 'b' ? it.owner : 'both',
      cadence: ['daily', 'weekly', 'monthly', 'later'].includes(it.cadence) ? it.cadence : 'later',
      flex: it.flex !== false,
      time: it.time || '',
      dur: it.dur || '',
      wday: it.wday ?? '',
      mday: it.mday ?? '',
      todoistId: it.todoistId || null,
    })),
    ticks: d.ticks || {},
    days: d.days || {},
    flex: d.flex || {},
    resets: d.resets || {},
  };
}

/* ---------- names ---------- */

export function nameOf(s, who) {
  return s.people[who]?.name || (who === 'a' ? 'Him' : 'Her');
}

/* ---------- dates ---------- */

function pad(n) {
  return n < 10 ? `0${n}` : `${n}`;
}

export function isoToday() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function dateOfDay(s, n) {
  const [y, m, day] = s.start.split('-').map(Number);
  const d = new Date(y, m - 1, day);
  d.setDate(d.getDate() + (n - 1));
  return d;
}

export function isoOfDay(s, n) {
  const d = dateOfDay(s, n);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Which challenge day is today? Can be < 1 (not started) or > 30 (finished). */
export function currentDay(s) {
  const [y, m, day] = s.start.split('-').map(Number);
  const start = new Date(y, m - 1, day);
  start.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.floor((now - start) / 86400000) + 1;
}

export function fmtDay(d) {
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

/* ---------- weeks ---------- */

export function weekOf(n) {
  return n > 28 ? 5 : Math.ceil(n / 7);
}

export function weekRange(w) {
  return w === 5 ? [29, 30] : [(w - 1) * 7 + 1, w * 7];
}

export function isFlexDay(s, n) {
  return Number(s.flex[weekOf(n)]) === n;
}

/* ---------- items ---------- */

export function itemsFor(s, who, cadence) {
  return s.items.filter((it) => it.cadence === cadence && (it.owner === who || it.owner === 'both'));
}

export function tickKey(day, itemId, who) {
  return `d${day}|${itemId}|${who}`;
}

export function isTicked(s, day, itemId, who) {
  return Boolean(s.ticks[tickKey(day, itemId, who)]);
}

/**
 * An item counts as satisfied if it was ticked, or if it's the week's flex day
 * and the item is flexible. Items marked flex:false never get that pass.
 */
export function itemSatisfied(s, day, it, who) {
  if (isTicked(s, day, it.id, who)) return true;
  return isFlexDay(s, day) && it.flex !== false;
}

export function dayComplete(s, day, who) {
  const list = itemsFor(s, who, 'daily');
  if (!list.length) return false;
  return list.every((it) => itemSatisfied(s, day, it, who));
}

export function dayRatio(s, day, who) {
  const list = itemsFor(s, who, 'daily');
  if (!list.length) return 0;
  const hit = list.filter((it) => itemSatisfied(s, day, it, who)).length;
  return hit / list.length;
}

export function fullDays(s) {
  let n = 0;
  for (let d = 1; d <= TOTAL_DAYS; d += 1) {
    if (dayComplete(s, d, 'a') && dayComplete(s, d, 'b')) n += 1;
  }
  return n;
}

/** Average completion across the days that have actually happened. */
export function completionPct(s, who) {
  const upto = Math.max(0, Math.min(currentDay(s), TOTAL_DAYS));
  if (upto < 1) return 0;
  let sum = 0;
  for (let d = 1; d <= upto; d += 1) sum += dayRatio(s, d, who);
  return Math.round((100 * sum) / upto);
}

/**
 * The never-miss-twice rule. Returns items missed on two or more consecutive
 * days ending yesterday or today — the only window where it's still actionable.
 */
export function missedTwice(s, who) {
  const today = currentDay(s);
  if (today < 3) return [];
  const out = [];
  for (const it of itemsFor(s, who, 'daily')) {
    let streak = 0;
    for (let d = Math.min(today, TOTAL_DAYS); d >= 1; d -= 1) {
      if (itemSatisfied(s, d, it, who)) break;
      streak += 1;
      if (streak >= 2) break;
    }
    if (streak >= 2) out.push(it);
  }
  return out;
}

/** How many times an item was missed in a given week. Drives the reset. */
export function missesInWeek(s, week, it, who) {
  const [from, to] = weekRange(week);
  const today = Math.min(currentDay(s), TOTAL_DAYS);
  let n = 0;
  for (let d = from; d <= Math.min(to, today); d += 1) {
    if (!itemSatisfied(s, d, it, who)) n += 1;
  }
  return n;
}

/* ---------- freshness ---------- */

/**
 * The page is only as current as the last sync commit. Say so explicitly
 * rather than letting the grid imply it knows about today.
 */
export function freshness(s) {
  if (!s.syncedThrough) {
    return { state: 'never', label: 'Never synced — the grid shows only hand-entered data' };
  }
  const synced = new Date(`${s.syncedThrough}T12:00:00`);
  const now = new Date();
  const days = Math.floor((now - synced) / 86400000);
  const label = `Synced through ${synced.toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  })}`;
  if (days <= 1) return { state: 'ok', label };
  if (days <= 2) return { state: 'aging', label: `${label} — a day behind` };
  return { state: 'stale', label: `${label} — ${days} days behind, the sync has probably stopped` };
}
